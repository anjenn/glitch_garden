# 09 — Test Plan & Acceptance Criteria

## Already checked in the provided mockup
- Browser rendering via headless Chromium from HTML content.
- Button mutation increments the mutation counter.
- Desktop screenshot renders fully.
- Mobile viewport at 390px reports no horizontal page overflow.

These checks are **not** a substitute for production testing. In particular, browser persistence across an actual served-origin refresh and Safari/Firefox are not certified by this package.

## Smoke tests (standalone)
| Case | Action | Expected result |
| --- | --- | --- |
| SM-01 | Open page | Canvas and sidebar render; 8-bit pixels visibly crisp |
| SM-02 | Click canvas | Spawn or transform; counter increments; recent event appears |
| SM-03 | Click MUTATE | A valid new mutation commits |
| SM-04 | Move pointer quickly | Temporary pixel trail, no world mutation count change |
| SM-05 | Leave input idle > 16 sec | One autonomous growth appears; log updates |
| SM-06 | Click PALETTE | Palette changes and appears in event history |
| SM-07 | Reload a normal served page | Same world and mutation count survive; local visits increments |
| SM-08 | Click NEW WORLD and confirm | New seed and clean world generated |
| SM-09 | Click NEW WORLD and cancel | Current world unchanged |
| SM-10 | Focus canvas, press Enter or Space | Mutation commits |
| SM-11 | Tap world on mobile | Mutation responds without accidental page scroll |
| SM-12 | Set reduced motion | Nonessential pulsing minimized |

## Unit tests
- Seed PRNG known-result vectors.
- Mutation reducer immutability and determinism.
- Nearest-specimen hit test around 21-pixel radius.
- All entity coordinates within logical world boundaries.
- Max 85 entities after 10,000 steps.
- Values clamped and finite; palette remains 0–3.
- Storage migration from missing/older schema.
- Empty and malformed localStorage objects cannot crash the app.

## Multiplayer integration tests
- **Authorization:** unauthenticated writes are rejected; anonymous authenticated reads work.
- **Rate limiting:** 7th mutation inside one minute returns 429 under configured test policy.
- **Idempotency:** same `(actor, clientEventId)` submitted twice yields one stored mutation.
- **Concurrency:** 100 parallel valid POST requests either commit unique consecutive revisions or receive a documented retryable response; no duplicate/lost event.
- **Reconnect:** one browser drops network, another mutates, disconnected browser recovers correct latest revision.
- **Scheduled growth:** five simultaneous visitors still result in max one job growth per minute.
- **Schema enforcement:** invalid numeric bounds, unknown action, giant JSON or user-supplied entity arrays rejected.
- **Security:** anon client cannot call privileged commit RPC.

## Performance targets (measure on representative devices)
- Initial display < 2s in typical environment.
- Local visual feedback < 100ms.
- At least 30FPS at 85 entities and <=160 effects particles.
- No unbounded memory growth across 20-minute browsing session.
- Shared commit visible to other visitors at <2s p95 in target region under normal load.

## Visual regression checkpoints
- 1440×900 desktop, 1024×768 tablet, 390×844 phone, 360×800 small phone.
- Pixel-perfect screenshot baselines for each palette where practical.
- Test 200% text zoom and dark-mode browser preference.

## Release gate
Do not mark shared mode done until two independent devices can mutate the **same** server-owned world while direct database writes from a public browser are demonstrably forbidden.
