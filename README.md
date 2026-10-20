# GLITCH.GARDEN — a little 8-bit world that blooms

**A tiny pixel garden that changes when someone interacts with it.**

This repository contains the production app (Vite + React + strict TypeScript + Canvas 2D), the
original dependency-free HTML mockup, and the full build specification in `docs/`.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173  (local demo mode)
```

1. Click anywhere in the floating garden, or press **MUTATE THE GARDEN**, to grow a flower, tree,
   crystal, shroom, robot, portal, totem or slime. Click right next to a specimen and it may transform.
   Specimens respect the scene: a click on a wall or in the air drops one onto the plaza floor
   (with landing dust), sky clicks sometimes leave a floating crystal or portal, and the waterfall
   pool only accepts slimes and lotus flowers.
2. Move your pointer fast to leave pixel stardust (visual only — never a mutation).
3. Stop interacting for ~16 seconds and the garden grows on its own.
4. **PALETTE** cycles four color modes (ANGEL / DUSK / MINT / CANDY) without moving anything.
5. **NEW WORLD** asks for confirmation, then starts a fresh seed. **COPY SEED** copies the seed only.
6. Reload: your garden persists in `localStorage` (with an in-memory fallback if storage is blocked).

**Important:** by default the app runs in **LOCAL DEMO** mode, labeled as such in the header and
footer. "Local visits" counts visits in your browser only. Nothing is shared or tracked.

## Verify

```bash
npm run check        # prettier --check, tsc --noEmit, vitest (unit)
npm run test:e2e     # Playwright: builds nothing; run `npm run build` first (preview server on :4173)
```

Unit tests cover the PRNG known-answer vectors, reducer determinism and replay, a 10,000-step
invariant run (bounds, entity cap of 85, finite values, palette 0–3), the 21px hit test, sprite
geometry (integer rectangles only), intent/state validation, storage migration and malformed-storage
recovery. Playwright covers the smoke matrix in `docs/09_TESTING_ACCEPTANCE.md` (persistence across
reload, click/keyboard/pointer-trail behavior, reset confirm/cancel, four viewports down to 360px
with no horizontal overflow, reduced motion, nearest-neighbor canvas).

## How it is built

| Area | Where | Notes |
| --- | --- | --- |
| Pure engine | `src/game/` | No DOM/storage/network. `applyMutation(world, action, entropy, now)` is the only way the world changes. mulberry32 PRNG; ids are `e-<revision>`. `characters/` holds the 8 pixel archetypes, `space/` the terrain model (floor, pool, sky), viewport projection, atmosphere effects and client-only animation. |
| Rendering | `src/game/renderer.ts`, `src/game/sprites.ts` | The 480×320 logical plane is projected onto the garden region of the illustrated scene; every sprite is integer-snapped rectangles (nearest-neighbor, no anti-aliasing). |
| Input | `src/input/pointer.ts` | CSS px → integer logical coordinates; velocity for trails. |
| Stores | `src/store/` | `LocalWorldRepository` (localStorage, schema v1, migration from the mockup's key) and `RemoteWorldRepository` (Supabase) share one `WorldRepository` contract. |
| UI | `src/app/`, `src/components/` | Mockup's pastel art direction; all copy in `src/app/copy.ts`. |
| Backend (Track B) | `supabase/` | SQL migration, `interact` and `growth` Edge Functions. See below. |

## Shared world (Track B) — implemented, **not yet deployed or verified**

The code for one authoritative shared world exists but has not been run against a live Supabase
project in this repository, so the app does **not** claim global sharing anywhere unless you enable
it yourself and it connects.

What is in place:

- `supabase/migrations/0001_world.sql`: `world_state`, `world_events`, `event_idempotency`,
  `interaction_quota`; RLS with public **read** of state and events and **no** browser writes;
  `commit_world_mutation` (atomic revision check + event insert + state update + idempotency) and
  `consume_interaction_quota`, both `SECURITY DEFINER` with fixed `search_path` and `EXECUTE`
  granted only to `service_role`.
- `supabase/functions/interact`: verifies the anonymous JWT, rejects bodies over 1 KB and anything
  outside the strict intent allowlist (no client entities, counters or palette values), applies
  6 mutations/minute per anonymous session, computes the transition with the same reducer the
  browser runs, retries up to 3 times on revision conflict, returns the stable error JSON from
  `docs/04_DATA_CONTRACTS.md`.
- `supabase/functions/growth`: scheduler-only idle growth, protected by `GROWTH_JOB_SECRET`,
  idempotent per `(world, minute)` through a unique index.
- `src/store/remoteWorldStore.ts`: anonymous sign-in, intent POST, snapshot refetch on every
  committed revision, Realtime dedupe by `eventId`, refetch on reconnect; local idle growth is
  disabled in this mode.

To try it:

```bash
cp .env.example .env            # set VITE_APP_MODE=shared, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run sync:functions           # copies src/game into supabase/functions/_shared
supabase db push                 # applies the migration
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... GROWTH_JOB_SECRET=... WORLD_ENTROPY_SECRET=... WORLD_ID=00000000-0000-4000-8000-000000000001 SUPABASE_ANON_KEY=...
supabase functions deploy interact growth
# schedule: POST /functions/v1/growth once per minute with header x-growth-secret
```

If shared mode is requested but the backend cannot be reached, the app falls back to the local
demo and says so. Release gate from `docs/09`: do not call shared mode done until two devices mutate
the same server-owned world while direct browser writes are demonstrably rejected.

## Package contents

| Path | Purpose |
| --- | --- |
| `src/` | Production app (see table above) |
| `e2e/` | Playwright acceptance tests |
| `supabase/` | Track B migration and Edge Functions |
| `mockup/index.html` | Original standalone prototype (kept as the visual reference) |
| [`AGENTS.md`](AGENTS.md) | Ground rules for coding agents |
| [`FILE_TREE.md`](FILE_TREE.md) | Repository layout |
| `docs/01…12` | Product, visual, architecture, contracts, engine, security, frontend, roadmap, testing, operations, decisions, agent workflow |

## Definition of done (status)

- [x] Click/touch/keyboard interaction changes the world.
- [x] Changes survive a refresh.
- [x] Pixel sprites remain crisp at every viewport size.
- [x] "Local demo" is honestly labeled until multiplayer exists.
- [x] Shared mutations are validated server-side, not trusted from the browser (code complete; deployment unverified).

## License / assets

`mockup/assets/angel-forest.png` (also served from `public/assets/`) is the illustrated backdrop.
No external fonts, scripts or trackers. Choose a license before publishing.
