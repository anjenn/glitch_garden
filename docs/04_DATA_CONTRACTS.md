# 04 — Data, API & Event Contracts

## Coordinates
All persisted coordinates are **integers in the fixed 480×320 world**: `x ∈ [0, 479]`, `y ∈ [0, 319]`. Input layer converts CSS pixels to this plane.

## Domain types (TypeScript blueprint)
```ts
type EntityType =
  | 'flower' | 'robot' | 'crystal' | 'shroom'
  | 'portal' | 'totem' | 'tree' | 'slime';

type ActionKind = 'click' | 'random_mutation' | 'palette_shift' | 'idle_growth';

interface PixelEntity {
  id: string;                 // stable server-generated identifier
  type: EntityType;
  x: number; y: number;       // integer logical coordinates
  variant: 0 | 1 | 2 | 3;
  size: 1 | 2 | 3;
  phase: number;              // finite, 0 ≤ phase < 2π
}
interface WorldState {
  schemaVersion: 1;
  worldId: string;
  seed: number;              // unsigned 32-bit integer
  revision: number;          // monotonic, starts at 0
  mutations: number;
  chaos: number;             // 0..100
  growth: number;            // 0..100
  palette: 0 | 1 | 2 | 3;
  entities: PixelEntity[];    // length <= 85
  updatedAt: string;         // UTC ISO 8601
}
interface WorldEvent {
  eventId: string;           // server generated UUID
  clientEventId?: string;    // idempotency key, UUID
  worldId: string;
  revision: number;
  action: ActionKind;
  result: 'spawn' | 'transform' | 'palette';
  entityId?: string;
  createdAt: string;
}
```

## Persistence tables (conceptual schema)
| Table | Important columns | Notes |
| --- | --- | --- |
| `world_state` | `id uuid PK`, `schema_version int`, `revision bigint`, `state jsonb`, `updated_at` | Exactly one active public world |
| `world_events` | `id uuid PK`, `world_id uuid`, `revision bigint`, `client_event_id uuid NULL`, `action text`, `event jsonb`, `created_at` | `UNIQUE(world_id,revision)` and scoped idempotency key |
| `interaction_quota` | `subject_hash`, `bucket_start`, `count` | Expiring anti-abuse buckets; only if Edge infrastructure lacks a limiter |

Store state as JSONB for cheap prototype evolution, but validate with Zod **and server-side invariants** on every write. If querying individual entities becomes important, normalize later.

## API contract (target production)

### Read current world
`GET /api/world`

**200 response:**
```json
{
  "schemaVersion": 1,
  "world": { "worldId": "00000000-0000-4000-8000-000000000001", "revision": 42, "seed": 123456, "schemaVersion": 1, "mutations": 42, "chaos": 31, "growth": 57, "palette": 0, "entities": [], "updatedAt": "2026-01-01T00:00:00Z" },
  "recentEvents": []
}
```
Response is illustrative; a real world has populated entities.

### Submit a mutation intent
`POST /api/interact` (implemented by an Edge Function or app-server adapter)
```json
{
  "worldId": "00000000-0000-4000-8000-000000000001",
  "clientEventId": "ef594e71-93bd-46d3-a789-2125ad6a68e2",
  "action": "click",
  "point": { "x": 240, "y": 160 }
}
```
The caller presents a valid short-lived anonymous JWT and `Content-Type: application/json`. Request body limit: **1 KB**. No caller-generated entity, palette value, arbitrary event result, or counter is accepted.

**200:** `{ "accepted": true, "revision": 43, "event": { ... } }`

**Error codes:** `400 INVALID_INPUT`, `401 UNAUTHORIZED`, `409 REVISION_CONFLICT`, `429 RATE_LIMITED`, `503 WORLD_UNAVAILABLE`. Return stable JSON `{ "error": { "code": "...", "message": "..." } }`; retry `409/503` carefully, do not retry `400/401`.

### Realtime
Subscribe to change notifications for **committed** `world_events` or a broadcast channel containing `{ worldId, revision, eventId }`. Upon receipt, fetch the latest canonical world snapshot unless a safe, complete event reducer can apply the exact next revision locally. Do not treat broadcast transport as durable event storage.

## Event examples
```json
{
  "schemaVersion": 1,
  "eventId": "6f927779-4a71-4445-9ab1-8aa42a6df6ff",
  "worldId": "00000000-0000-4000-8000-000000000001",
  "revision": 43,
  "action": "click",
  "result": "spawn",
  "entityId": "e-1007",
  "createdAt": "2026-01-01T00:00:12Z"
}
```

## Data retention
Keep 7 most recent events in the visible UI; retain 30 days of event rows initially, or longer if storage cost and moderation requirements permit. Periodically snapshot state. Never store raw visitor IP addresses in public world rows.
