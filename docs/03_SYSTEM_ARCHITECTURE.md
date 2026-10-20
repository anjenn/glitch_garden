# 03 — System Architecture

## Guiding principle
The simplest useful architecture is a **standalone Canvas app**. Build a hosted, authoritative multiplayer service only when the local simulation and art direction are satisfying.

## Phase A — offline-first / no backend
```text
Pointer / keyboard / timer
            │
            ▼
      Input normalizer
            │
            ▼
 Pure mutation reducer ──→ New immutable world state
            │                        │
            │                        ├──→ localStorage persistence
            │                        └──→ UI stats and evolution log
            ▼
     Canvas renderer (480×320)
```
Single static HTML implementation exists at `mockup/index.html`. Production React extraction is optional for this phase. It is okay to ship this as the first public artifact.

## Phase B — shared canonical world
```text
[Visitor's browser]
 React UI + Canvas Renderer + Ephemeral Particles
  ├── GET world snapshot ───────────────────────────────┐
  ├── POST click/palette intent + anonymous JWT ───┐    │
  └── Supabase Realtime (read event stream) ◄───────┼────┤
                                                   ▼    ▼
                                  [Supabase Edge Function]
                                  validate + rate limit intent
                                                   │
                                  apply pure seeded mutation
                                                   │
                                    [Postgres transaction]
                                    compare revision, commit
                                    state and event atomically
                                                   │
                                       [world_state / events]
                                                   │
                                  Realtime changes notification
```

## Component responsibilities
| Component | Owns | Must not own |
| --- | --- | --- |
| Canvas renderer | Rendering, pixel effects, frame loop | Business state mutations, network writes |
| Mutation engine | Legal transitions, counters, seeded randomness | Browser APIs, database APIs |
| Input adapter | Pointer mapping, gestures, keyboard | Arbitrary world editing |
| Local store | Serialization, migration, local persistence | Server-shared truth |
| Remote store | Bootstrap, revision, reconnect, event subscription | Mutation rule decisions |
| Server endpoint | Authorization, validation, rate limits, deterministic transition | Visual animations |
| Postgres | Single canonical state + event audit | Public direct mutations |
| Scheduled growth | Controlled autonomous events | One timer per connected visitor |

## Authoritative state vs ephemeral effects
**Canonical persisted state:** world id, seed, revision, palette id, organisms, chaos, growth, mutation count, server event history.

**Client ephemeral state:** cursor position, particles, hover, animation phase, toast, open popups, reduced-motion setting. Never synchronize fast pointer movements by default.

## Initial loading / reconnect
1. Render loading skeleton or cached non-authoritative snapshot.
2. Read canonical server snapshot and revision.
3. Subscribe to Realtime and buffer incoming revisions.
4. Apply only contiguous revisions. On gap or reconnect, fetch snapshot again.
5. Show a subtle “reconnected” indicator; do not duplicate click effects.

## Concurrency policy
Clients send an **intent**, not a mutated world document. The server computes a candidate next world from the latest persisted snapshot and attempts an atomic compare-and-swap commit of state + event. On conflict, read latest state and retry up to 3 times with a server-owned new PRNG step; otherwise return retryable conflict.

## Versioning
- `schemaVersion`: format of state and event payloads.
- `revision`: strictly increasing committed world transitions.
- `seed`: reproducible starting setup; it is not a substitute for current world state.
- Preserve old event records for replay/debugging after schema upgrades.

## Backend choice rationale
Supabase is a reasonable small-project shortcut for Postgres, anonymous auth, Edge Functions, and Realtime. It is **not required** for the standalone website. See `11_DECISIONS_RISKS.md` for tradeoffs.
