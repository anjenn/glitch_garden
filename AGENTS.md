# AGENTS.md — Repository Instructions

## Mission
Implement **GLITCH.GARDEN**, an 8-bit-inspired, interactive pixel garden whose organisms evolve in response to visitors. Preserve its playful, low-friction feel: the software should remain simpler than its premise.

## Source of truth
Read in order: `README.md`, `docs/01_PRODUCT_REQUIREMENTS.md`, `docs/02_VISUAL_UX_SYSTEM.md`, `docs/03_SYSTEM_ARCHITECTURE.md`, `docs/05_MUTATION_ENGINE.md`, `docs/09_TESTING_ACCEPTANCE.md`. Consult additional specs as needed. The executable UI reference is `mockup/index.html`.

## Priority
1. Preserve a fun, working **offline mode**.
2. Pixel art must be rendered with **nearest-neighbor** scaling; no blurry images or smooth gradients.
3. Make every control functional and accessible.
4. Keep state updates deterministic and data structures bounded.
5. Do not claim global sharing until a backend actually synchronizes it.
6. Add production multiplayer only after local acceptance criteria pass.

## Engineering guardrails
- Use TypeScript with `strict: true` for the production application.
- Separate pure simulation logic from DOM/Canvas code and network code.
- Store world coordinates in a fixed logical **480 × 320** plane.
- Never use non-deterministic `Math.random()` inside the committed server mutation reducer. Use a reproducible seeded PRNG.
- Do not trust arbitrary entity arrays, counters, identifiers, or versions sent by clients.
- All database writes to global state go through a validated, rate-limited server function.
- Do not expose Supabase service-role keys in client code or commits.
- Bound entities (max 85 in demo), history, event throughput, and payload sizes.
- Support keyboard, touch, reduced-motion, and narrow screens.
- Prefer zero dependencies to solve problems already solved in existing code.
- Write unit tests for mutation rules and integration tests for persistence/concurrency.

## Agent workflow
Before each change: identify relevant user story and acceptance criteria; summarize intended edits; touch the smallest number of files. After each change: run formatting, type-check, unit tests, and the applicable browser checks; report what was verified and what remains unverified. Never describe an unbuilt feature as complete.

## Agent handoff format
`Ticket | Files changed | Why | Verification command/result | Open risks | Suggested next ticket`

## Explicit prohibitions
Do not rewrite the world with WebGL, add AI calls, integrate wallets, add social profiles, introduce user-submitted HTML/text to the public screen, or make network writes for pointer movement unless a new requirement explicitly approves it.
