# 12 — Coding-Agent Workflow & Ready-to-Use Prompts

## Division of labor
| Agent | Primary tasks | Deliverables | Guardrails |
| --- | --- | --- | --- |
| Product/UX | Audit scope and design | Approved stories, token changes | Keep it playful and one-screen |
| Frontend | React extraction, responsive UI | Typed components + CSS | Preserve pixel-perfect canvas aesthetic |
| Simulation | Pure mutation reducer, PRNG | Engine + deterministic tests | No DOM, storage, or network APIs |
| Backend | Auth, endpoint, DB transaction | SQL migrations, Edge Function | Reject client state writes |
| QA | Browser, security, performance | Tests + reproducible bug reports | Do not report unrun tests as passing |
| Reviewer | Cross-module contracts | Concise findings with severity | Look for replay and concurrency failures |

## Agent kickoff prompt
Copy into an agent workspace that contains this package:

> You are implementing GLITCH.GARDEN. Read `README.md`, `AGENTS.md`, `FILE_TREE.md`, and relevant `docs/*.md` before coding. Treat `mockup/index.html` as the visual and behavior reference, and do not claim that multiplayer already exists. Select the smallest unfinished task in `docs/08_ROADMAP_TASKS.md`, implement it, test it, and report files changed, verification evidence, and remaining risks. Keep 480×320 nearest-neighbor pixel rendering and resist adding unnecessary dependencies.

## Frontend agent prompt
> Implement P2-01: migrate the working standalone mockup to Vite + React + strict TypeScript. Extract Canvas 2D rendering, UI cards, keyboard/touch input, palettes, and local persistence. Keep the original layout, art style, and behavior. Do not add a backend. Run type-check, unit tests, and responsive browser tests. Include comparison screenshots and explain visual changes.

## Engine agent prompt
> Implement P2-02: create deterministic, pure `game/prng.ts`, `game/initialWorld.ts`, and `game/mutations.ts` from spec 05. No Math.random, Date.now, or DOM access inside reducers. Add 10,000-step invariant tests and deterministic known-vector tests. Keep the entity cap, type allowlist, and legal coordinate bounds. Do not change the UI.

## Backend agent prompt
> Implement P3-01 and P3-02 using the domain types in spec 04 and policies in spec 06. Create protected tables with public read-only RLS, anonymous JWT validation, a strict intent endpoint, idempotent requests, rate limits, and an atomic revision-checked state+event commit. Prove that public browser keys cannot directly alter the world. Keep service credentials out of browser output. Do not deploy until concurrency tests pass.

## QA agent prompt
> Audit this application against `docs/09_TESTING_ACCEPTANCE.md`. Test desktop and mobile, keyboard and touch, persistence, 10,000 simulation steps, rate limits, duplicate requests, and concurrent mutation where applicable. Provide a concise pass/fail matrix and exact reproduction steps for failures. Do not invent tests or results.

## Reviewer agent prompt
> Review the latest implementation for (1) brittle state persistence, (2) non-deterministic canonical transitions, (3) blurry canvas scaling, (4) accessibility regressions, (5) missing concurrency protections, (6) leaked service keys, (7) false shared-world claims. Prioritize actionable severity-tagged issues and identify missing tests.

## Change protocol
1. Scope one ticket, read its acceptance criteria, and identify ownership of files.
2. Write the smallest implementation plan.
3. Implement with focused commits and tests.
4. Run automated checks and manual visual verification where appropriate.
5. Give evidence of the outcome in the handoff format from `AGENTS.md`.
6. Ask for a product decision only when the specification lists an unresolved choice.

## Parallel work policy
After the shared `WorldState` interface is frozen, frontend and backend may work in parallel. Never let two agents independently modify the event schema or mutation rules. A single owner approves domain contract changes.
