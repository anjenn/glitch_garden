// POST /functions/v1/growth — scheduler-only autonomous growth.
// Invoked once per minute by a cron job carrying GROWTH_JOB_SECRET. Idempotent
// per (world, minute bucket) so overlapping invocations never double-grow.
import { applyMutation } from '../_shared/game/mutations.ts';
import {
  CORS_HEADERS,
  commit,
  env,
  fail,
  json,
  readWorld,
  serverEntropy,
  serviceClient,
  toPublicEvent,
} from '../_shared/server.ts';

const MAX_CONFLICT_RETRIES = 3;

function minuteBucket(date: Date): string {
  return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return fail('INVALID_INPUT', 'POST only');
  const presented = request.headers.get('x-growth-secret') ?? '';
  const expected = env('GROWTH_JOB_SECRET');
  if (presented.length !== expected.length || presented !== expected) {
    return fail('UNAUTHORIZED', 'bad job secret');
  }

  const worldId = env('WORLD_ID');
  const admin = serviceClient();
  const bucket = minuteBucket(new Date());

  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    const current = await readWorld(admin, worldId);
    if (!current) return fail('WORLD_UNAVAILABLE', 'world missing or invalid');
    const now = new Date().toISOString();
    const { next, event } = applyMutation(
      current.world,
      { kind: 'idle_growth' },
      serverEntropy(current.world.seed, current.revision + 1),
      now,
    );
    const result = await commit(admin, {
      worldId,
      expectedRevision: current.revision,
      state: next,
      event,
      growthBucket: bucket,
    });
    if (result.status === 'committed' && result.eventId) {
      return json({
        grown: true,
        bucket,
        revision: result.revision,
        event: toPublicEvent(event, result.eventId),
      });
    }
    if (result.status === 'duplicate')
      return json({ grown: false, bucket, revision: result.revision });
    if (result.status === 'read_only') return json({ grown: false, bucket, readOnly: true });
    if (result.status === 'missing') return fail('WORLD_UNAVAILABLE', 'world missing');
  }
  return fail('REVISION_CONFLICT', 'busy world; growth skipped this minute');
});
