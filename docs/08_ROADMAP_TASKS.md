# 08 — Roadmap & Actionable Tasks

## Delivery strategy
Finish a playable standalone release first. Treat multiplayer as a distinct phase and add it only if the experience is worth returning to. Time ranges are rough estimates for an experienced solo developer, not commitments.

## Phase 0 — concept and runnable mockup (complete)
- [x] Create 8-bit branding, retro UI, palette and pixel canvas.
- [x] Implement clickable mutations, transient pointer trails, local auto-growth.
- [x] Implement local persistence, manual mutations, palette switching, new-world reset.
- [x] Create responsive layout and accessible control labels.
- [x] Package architecture / product / agent docs.
- [ ] Conduct manual cross-browser validation on target devices.

## Phase 1 — solid standalone release (est. 1–3 days)

### P1-01 — Harden local storage
- [x] Add `schemaVersion` to local persisted state and migration routine.
- [x] Validate deserialized entity shape and ensure ids cannot collide.
- [x] On storage disabled/quota exceeded, keep a working in-memory fallback and show a low-noise warning.
- **Done when:** malformed storage does not crash; valid storage persists across reload.

### P1-02 — Refine procedural world generation
- [x] Consolidate 8 species into tested sprite functions.
- [x] Add a visible 2-frame idle animation only if it improves clarity.
- [x] Maintain max entity/particle counts at high mutation levels.
- **Done when:** 10,000 mutations never overflow logical bounds.

### P1-03 — Accessibility and mobile QA
- [x] Test focus order, Enter/Space mutation, button labels, 360px screen, touch interactions.
- [x] Respect reduced motion and pause when tab hidden.
- [ ] Check text contrast, browser zoom at 200%, and landscape.
- **Done when:** acceptance suite in doc 09 passes.

### P1-04 — Publish static preview
- [x] Add metadata, favicon, simple instructions.
- [ ] Deploy `mockup/` to static hosting under a distinct preview path.
- [x] Explicitly retain “LOCAL DEMO” label.
- **Done when:** shareable HTTPS URL works without database credentials.

## Phase 2 — structured app (est. 2–4 days)

### P2-01 — Vite + React/TS migration
- [x] Create typed source layout in `FILE_TREE.md`.
- [x] Extract pure `game` engine and Canvas renderer.
- [x] Preserve visual design; configure Vitest and Playwright.
- **Dependencies:** Phase 1.
- **Done when:** visual baseline is unchanged and type-check succeeds.

### P2-02 — Deterministic engine
- [x] Implement seeded PRNG, stable ids, type guard and replay invariants.
- [x] Add property-based long-run simulation tests.
- **Done when:** same input sequence reproduces same world snapshot.

## Phase 3 — first shared world (est. 3–7 days)

> Status 2026-10-20: code for P3-01…P3-04 is written (`supabase/`, `src/store/remoteWorldStore.ts`) but has **not** been deployed or integration-tested against a live Supabase project. The release gate in doc 09 is still open.

### P3-01 — Database and access control
- [x] Create `world_state`, `world_events`, quota storage and migration.
- [x] Implement RLS: public read; no direct public writes.
- [ ] Configure anonymous auth and separate server secrets.
- **Done when:** direct client write attempts are rejected.

### P3-02 — Mutation endpoint and transaction
- [x] Implement `/api/interact` intent validation and rate limiting.
- [x] Implement atomic revision check + event insert + state update.
- [x] Add idempotency and max 3 conflict retries.
- **Done when:** 100 concurrent requests yield valid strictly ordered revisions with no lost commit.

### P3-03 — Realtime and reconnect
- [x] Subscribe to committed revisions, dedupe events, re-fetch on gaps.
- [x] Add cached-read fallback and connection state.
- **Done when:** two browsers converge after simultaneous interaction and network interruption.

### P3-04 — Server-side autonomous growth
- [x] Authorized scheduled job once/minute; shared idempotency bucket.
- [x] Disable local canonical idle growth when online.
- **Done when:** number of connected users does not multiply growth frequency.

## Phase 4 — release hardening (est. 1–3 days)
- [ ] Cross-browser visual regression tests.
- [ ] Load test mutation endpoint; tune limits/quotas.
- [ ] Test read-only mode, reconnect, owner recovery, backups.
- [ ] Add lightweight opt-in metrics, privacy notice, changelog.
- [ ] Publish with monitoring and rollback instructions.

## Suggested order for coding agents
Start with `P1-01` → `P1-03` → `P2-01` → `P2-02` → `P3-01` → `P3-02` → `P3-03` → `P3-04`. Do not parallelize tasks that modify the same domain contracts.
