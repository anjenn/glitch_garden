// POST /functions/v1/interact — the only way a visitor can change the shared world.
// Validates the anonymous JWT, enforces the per-subject quota, computes the
// transition with the shared deterministic reducer and commits it atomically.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { applyMutation } from '../_shared/game/mutations.ts';
import type { CanonicalAction } from '../_shared/game/types.ts';
import { parseClientIntent } from '../_shared/game/validate.ts';
import {
  CORS_HEADERS,
  commit,
  env,
  fail,
  json,
  readWorld,
  serverEntropy,
  serviceClient,
  sha256Hex,
  toPublicEvent,
} from '../_shared/server.ts';

const MAX_BODY_BYTES = 1024;
const RATE_LIMIT_PER_MINUTE = 6;
const MAX_CONFLICT_RETRIES = 3;

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return fail('INVALID_INPUT', 'POST only');
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return fail('INVALID_INPUT', 'expected application/json');
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return fail('INVALID_INPUT', 'body too large');
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail('INVALID_INPUT', 'body too large');

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('INVALID_INPUT', 'malformed JSON');
  }
  const intent = parseClientIntent(body);
  if (!intent) return fail('INVALID_INPUT', 'intent rejected');
  const worldId = (body as { worldId?: unknown }).worldId;
  if (typeof worldId !== 'string' || worldId !== env('WORLD_ID')) {
    return fail('INVALID_INPUT', 'unknown world');
  }

  // Anonymous JWT: identifies a session for quotas and idempotency, nothing more.
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return fail('UNAUTHORIZED', 'missing token');
  const userClient = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return fail('UNAUTHORIZED', 'invalid token');
  const subjectHash = await sha256Hex(`${userData.user.id}:${env('WORLD_ID')}`);

  const admin = serviceClient();
  const { data: used, error: quotaError } = await admin.rpc('consume_interaction_quota', {
    p_subject_hash: subjectHash,
    p_limit: RATE_LIMIT_PER_MINUTE,
  });
  if (quotaError) return fail('WORLD_UNAVAILABLE', 'quota unavailable');
  if (Number(used) > RATE_LIMIT_PER_MINUTE) {
    const retryAfter = 60 - new Date().getSeconds();
    return fail('RATE_LIMITED', 'too many mutations this minute', {
      'Retry-After': String(retryAfter),
    });
  }

  const action: CanonicalAction =
    intent.action === 'click' ? { kind: 'click', point: intent.point! } : { kind: intent.action };

  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    const current = await readWorld(admin, worldId);
    if (!current) return fail('WORLD_UNAVAILABLE', 'world missing or invalid');
    const now = new Date().toISOString();
    const { next, event } = applyMutation(
      current.world,
      action,
      serverEntropy(current.world.seed, current.revision + 1),
      now,
    );
    const result = await commit(admin, {
      worldId,
      expectedRevision: current.revision,
      state: next,
      event,
      subjectHash,
      clientEventId: intent.clientEventId,
    });
    if (result.status === 'committed' && result.eventId) {
      return json({
        accepted: true,
        revision: result.revision,
        event: toPublicEvent(event, result.eventId),
      });
    }
    if (result.status === 'duplicate') {
      return json({
        accepted: true,
        duplicate: true,
        revision: result.revision,
        eventId: result.eventId,
      });
    }
    if (result.status === 'read_only') return fail('WORLD_UNAVAILABLE', 'world is read-only');
    if (result.status === 'missing') return fail('WORLD_UNAVAILABLE', 'world missing');
    // conflict → re-read and retry with a fresh server PRNG step
  }
  return fail('REVISION_CONFLICT', 'world changed under us; retry', { 'Retry-After': '1' });
});
