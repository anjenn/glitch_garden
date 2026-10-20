# 05 — Mutation Engine Specification

## Key rule
**Intent in; deterministic state transition out.** The engine must not depend on time, DOM, network, or ambient `Math.random()` to decide a canonical change.

## Signature
```ts
function applyMutation(
  world: Readonly<WorldState>,
  action: CanonicalAction,
  serverEntropy: number
): { next: WorldState; event: WorldEventDraft };
```
`CanonicalAction` is an allowlisted click, random mutation, palette shift, or server-only idle growth. `serverEntropy` is a persisted step seed computed by the server from the world seed, next revision, and a server-owned stable secret or seed.

## PRNG
Use one small, documented integer algorithm, e.g. an LCG or xorshift32. Test it with known input/output vectors across browser and Edge runtime. Do not use ad hoc `Math.random()` in the canonical engine.

## Baseline transition
1. Validate action, point, entity count, and world version.
2. Determine a PRNG stream for `(seed, nextRevision, entropy)`.
3. For click: find nearest living entity within **21 logical px**.
4. If nearby and deterministic probability < **0.35**, change its `type` and `variant` (transform).
5. Otherwise choose a type from the allowlist and spawn it at integer coordinates clamped to legal region.
6. For automatic growth: spawn `flower` or `tree` only.
7. Maximum **85** entities. When full, replace oldest indexed specimen, unless a future conservation policy exists.
8. Increment `revision` and `mutations` by exactly one; increase chaos by 1–5 on user mutations and growth by 1–3, each clamped to 0–100.
9. Append a canonical event with generated entity id and one result type.
10. Return the new world; persist state and event **atomically**.

## Modes / weights
Initial weighted choice can be uniform across 8 archetypes. Optional later tuning:
- flower 25%, tree 18%, shroom 13%, robot 12%, crystal 11%, slime 10%, totem 7%, portal 4%.
- Do not change probabilities without a `mutationRulesVersion`, as replay behavior depends on rules.

## Other actions
- `palette_shift`: cycles 0→1→2→3→0, increments `revision` and `mutations`, leaves entity positions unchanged.
- `random_mutation`: same as click at server-generated deterministic location.
- `idle_growth`: may be emitted only by authorized scheduler; cannot be submitted by anonymous visitors.
- Pointer velocity creates **client-only transient effects** and does not increment mutation count or persist.

## Rules v2 — terrain-aware placement (implemented 2026-10-21)
`MUTATION_RULES_VERSION = 2`. The space is modelled in `src/game/space/terrain.ts` (pure, shared with the server):
- **Floor**: a plaza band between `floorTop(x)` (~y 232) and `floorBottom(x)` (~y 300), clamped to the island (x 24–456).
- **Pool**: x 196–292, y 248–300. Only `slime` and `flower` may live there.
- **Sky**: more than 48 px above the floor. Only `portal` and `crystal` may float there.
- Click/random drop: the nearest-entity transform check still uses the raw clamped point (so a floating specimen can be clicked in the air). Otherwise: sky point → with probability **0.6** a sky type stays at the point, else the drop falls to `floorTop(x)`; wall/plaza points settle to the floor band; pool points spawn a water type.
- Transform picks the new type from the allowlist of the specimen's current zone.
- `idle_growth` sprouts on the plaza only (a `flower` if it lands in the pool).
- The starter garden stands on the floor; only slimes may start in the pool.
Everything visual that follows from a placement (falling, landing dust, ripples, bobbing, perspective) is client-only (`src/game/space/animation.ts`, `src/game/renderer.ts`) and never persisted.

## Idle growth in multiplayer
A single scheduler issues at most **one world-wide growth event per minute** while enabled; it must be idempotent per `(worldId, minuteBucket)`. Never run canonical growth independently from every viewer's timer.

## Rendering and animation
Pure renderer draws all archetypes from rectangles at integer coordinates. Noncanonical floating motion (small `sin(time)` displacement), cursor crosshair and particle bursts are visual only and must not be stored. Keep 30 FPS typical with `requestAnimationFrame` throttle; pause when document hidden.

## State invariants
- Coordinates integer and within bounds; entities <=85 and ids unique.
- Numeric fields finite, palette one of 0–3.
- `revision >= 0`, `mutations >= 0`, `chaos/growth ∈ [0,100]`.
- One request can commit at most one canonical mutation.
- Duplicate `clientEventId` for the same anonymous identity returns original committed revision without a second write.

## Determinism tests
1. Same world + same canonical action + same entropy gives byte-equivalent domain state.
2. Different browser engines agree on seeded type and coordinates.
3. 10,000 mutations never break bounds, entity cap, or finite-number checks.
4. Palette shift does not alter entity coordinates.
5. Two concurrent requests never commit the same revision.
