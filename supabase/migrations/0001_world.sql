-- GLITCH.GARDEN shared world (Track B). Spec references: 04 data contracts, 06 security.
--
-- Security model: browsers may READ the world and its public events. Only the
-- Edge Function (service role) may write, and it does so through a single
-- atomic, revision-checked commit function.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.world_state (
  id             uuid primary key,
  schema_version integer     not null default 1,
  revision       bigint      not null default 0 check (revision >= 0),
  state          jsonb       not null,
  read_only      boolean     not null default false,
  updated_at     timestamptz not null default now()
);

create table if not exists public.world_events (
  id            uuid primary key default gen_random_uuid(),
  world_id      uuid        not null references public.world_state(id) on delete cascade,
  revision      bigint      not null check (revision > 0),
  action        text        not null check (action in ('click','random_mutation','palette_shift','idle_growth')),
  event         jsonb       not null,
  growth_bucket text,
  created_at    timestamptz not null default now(),
  unique (world_id, revision)
);
-- One autonomous growth per (world, minute bucket), regardless of how many
-- scheduler invocations race.
create unique index if not exists world_events_growth_bucket_idx
  on public.world_events (world_id, growth_bucket) where growth_bucket is not null;
create index if not exists world_events_world_revision_idx
  on public.world_events (world_id, revision desc);

-- Idempotency keys live apart from public events so no per-visitor identifier
-- is ever readable by browsers.
create table if not exists public.event_idempotency (
  world_id        uuid  not null references public.world_state(id) on delete cascade,
  subject_hash    text  not null,
  client_event_id uuid  not null,
  revision        bigint not null,
  event_id        uuid  not null,
  created_at      timestamptz not null default now(),
  primary key (world_id, subject_hash, client_event_id)
);

create table if not exists public.interaction_quota (
  subject_hash text        not null,
  bucket_start timestamptz not null,
  count        integer     not null default 0,
  primary key (subject_hash, bucket_start)
);

-- ---------------------------------------------------------------------------
-- Row level security: public read of world + events, no direct public writes.
-- ---------------------------------------------------------------------------
alter table public.world_state       enable row level security;
alter table public.world_events      enable row level security;
alter table public.event_idempotency enable row level security;
alter table public.interaction_quota enable row level security;

drop policy if exists "public read world_state" on public.world_state;
create policy "public read world_state" on public.world_state
  for select to anon, authenticated using (true);

drop policy if exists "public read world_events" on public.world_events;
create policy "public read world_events" on public.world_events
  for select to anon, authenticated using (true);

-- No policies on event_idempotency / interaction_quota: browser roles get nothing.
revoke all on public.world_state, public.world_events, public.event_idempotency, public.interaction_quota
  from anon, authenticated;
grant select on public.world_state, public.world_events to anon, authenticated;

-- Realtime: browsers subscribe to committed event inserts.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'world_events'
  ) then
    alter publication supabase_realtime add table public.world_events;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Rate limiting: fixed one-minute buckets per anonymous subject.
-- ---------------------------------------------------------------------------
create or replace function public.consume_interaction_quota(p_subject_hash text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  if p_subject_hash is null or length(p_subject_hash) < 16 or length(p_subject_hash) > 128 then
    raise exception 'invalid subject' using errcode = '22023';
  end if;
  insert into public.interaction_quota (subject_hash, bucket_start, count)
    values (p_subject_hash, v_bucket, 1)
    on conflict (subject_hash, bucket_start)
    do update set count = public.interaction_quota.count + 1
    returning count into v_count;
  -- Opportunistic cleanup keeps the table tiny.
  if v_count = 1 then
    delete from public.interaction_quota where bucket_start < now() - interval '10 minutes';
  end if;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic commit: revision check + event insert + state update in one transaction.
-- Returns jsonb {status: 'committed'|'conflict'|'duplicate'|'read_only', ...}.
-- ---------------------------------------------------------------------------
create or replace function public.commit_world_mutation(
  p_world_id          uuid,
  p_expected_revision bigint,
  p_state             jsonb,
  p_event             jsonb,
  p_subject_hash      text default null,
  p_client_event_id   uuid default null,
  p_growth_bucket     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current   bigint;
  v_read_only boolean;
  v_next      bigint := p_expected_revision + 1;
  v_event_id  uuid;
  v_existing  record;
  v_entities  integer;
begin
  -- Idempotency: the same (subject, clientEventId) never writes twice.
  if p_subject_hash is not null and p_client_event_id is not null then
    select revision, event_id into v_existing
      from public.event_idempotency
      where world_id = p_world_id and subject_hash = p_subject_hash and client_event_id = p_client_event_id;
    if found then
      return jsonb_build_object('status', 'duplicate', 'revision', v_existing.revision, 'eventId', v_existing.event_id);
    end if;
  end if;

  -- Scheduler idempotency: one growth per minute bucket.
  if p_growth_bucket is not null then
    select revision, id into v_existing from public.world_events
      where world_id = p_world_id and growth_bucket = p_growth_bucket;
    if found then
      return jsonb_build_object('status', 'duplicate', 'revision', v_existing.revision, 'eventId', v_existing.id);
    end if;
  end if;

  select revision, read_only into v_current, v_read_only
    from public.world_state where id = p_world_id for update;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;
  if v_read_only then
    return jsonb_build_object('status', 'read_only', 'revision', v_current);
  end if;
  if v_current <> p_expected_revision then
    return jsonb_build_object('status', 'conflict', 'revision', v_current);
  end if;

  -- Server-side invariants (defense in depth; the reducer already enforces them).
  if (p_state->>'revision')::bigint <> v_next then
    raise exception 'state revision mismatch' using errcode = '22023';
  end if;
  if jsonb_typeof(p_state->'entities') <> 'array' then
    raise exception 'entities must be an array' using errcode = '22023';
  end if;
  v_entities := jsonb_array_length(p_state->'entities');
  if v_entities > 85 then
    raise exception 'entity cap exceeded' using errcode = '22023';
  end if;
  if (p_state->>'palette')::int not between 0 and 3 then
    raise exception 'invalid palette' using errcode = '22023';
  end if;
  if (p_state->>'chaos')::numeric not between 0 and 100 or (p_state->>'growth')::numeric not between 0 and 100 then
    raise exception 'invalid meters' using errcode = '22023';
  end if;
  if (p_event->>'revision')::bigint <> v_next then
    raise exception 'event revision mismatch' using errcode = '22023';
  end if;

  insert into public.world_events (world_id, revision, action, event, growth_bucket)
    values (p_world_id, v_next, p_event->>'action', p_event, p_growth_bucket)
    returning id into v_event_id;

  update public.world_state
    set revision = v_next, state = p_state, updated_at = now()
    where id = p_world_id;

  if p_subject_hash is not null and p_client_event_id is not null then
    insert into public.event_idempotency (world_id, subject_hash, client_event_id, revision, event_id)
      values (p_world_id, p_subject_hash, p_client_event_id, v_next, v_event_id);
  end if;

  return jsonb_build_object('status', 'committed', 'revision', v_next, 'eventId', v_event_id);
exception
  when unique_violation then
    -- A concurrent growth job or duplicate landed first; report as conflict so the caller re-reads.
    return jsonb_build_object('status', 'conflict', 'revision', v_current);
end;
$$;

-- Only the backend may execute the privileged functions.
revoke all on function public.consume_interaction_quota(text, integer) from public, anon, authenticated;
revoke all on function public.commit_world_mutation(uuid, bigint, jsonb, jsonb, text, uuid, text) from public, anon, authenticated;
grant execute on function public.consume_interaction_quota(text, integer) to service_role;
grant execute on function public.commit_world_mutation(uuid, bigint, jsonb, jsonb, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- The single public world. State generated by createInitialWorld(20261020, id, ...).
-- ---------------------------------------------------------------------------
insert into public.world_state (id, schema_version, revision, state)
values (
  '00000000-0000-4000-8000-000000000001',
  1,
  0,
  '{"schemaVersion":1,"worldId":"00000000-0000-4000-8000-000000000001","seed":20261020,"revision":0,"mutations":0,"chaos":12,"growth":24,"palette":0,"entities":[{"id":"s-0","type":"tree","x":218,"y":275,"variant":0,"size":1,"phase":1.9852525727782728},{"id":"s-1","type":"slime","x":372,"y":289,"variant":2,"size":3,"phase":4.8336926933769515},{"id":"s-2","type":"slime","x":448,"y":265,"variant":3,"size":2,"phase":3.683885473668176},{"id":"s-3","type":"crystal","x":142,"y":287,"variant":3,"size":3,"phase":4.395822329427294},{"id":"s-4","type":"crystal","x":242,"y":271,"variant":2,"size":2,"phase":5.032001820308083},{"id":"s-5","type":"slime","x":258,"y":259,"variant":1,"size":1,"phase":2.999303352955},{"id":"s-6","type":"flower","x":199,"y":264,"variant":1,"size":1,"phase":5.335969560367411},{"id":"s-7","type":"tree","x":421,"y":252,"variant":1,"size":2,"phase":4.666428800541577},{"id":"s-8","type":"tree","x":89,"y":268,"variant":1,"size":2,"phase":2.7034908033349447}],"updatedAt":"2026-10-20T00:00:00.000Z"}'::jsonb
)
on conflict (id) do nothing;
