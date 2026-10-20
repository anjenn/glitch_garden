# 01 — Product Requirements (PRD)

## Product summary
GLITCH.GARDEN is an interactive 8-bit-inspired web experiment. A shared pixel environment can evolve through small contributions from its visitors. There is no scoreboard, mission, or winning state. Users are rewarded with a visible, immediate surprise.

## Main value proposition
**A stranger can change a tiny piece of a persistent digital world in under three seconds.** The world gets stranger over time, with no one designer controlling its final form.

## Intended users
- Curious internet visitors looking for a 30-second experience.
- Creative coders, pixel-art enthusiasts, and fans of participatory internet art.
- Returning users curious whether the world changed since their last visit.

## Core loop
`Arrive → Observe current world → Click/tap → See obvious mutation + log entry → Leave → Revisit to discover change.`

## MVP scope (Track A — standalone)
| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-01 | Render an 8-bit environment at 480×320 logical resolution | Must | Pixels are square and nearest-neighbor scaled |
| FR-02 | Click or tap to create/transform a specimen | Must | World and mutation counter update immediately |
| FR-03 | Button-triggered random mutation | Must | Works without pointer precision |
| FR-04 | Movement creates temporary pixel trails | Must | Visible feedback with bounded particles |
| FR-05 | Idle creates a new specimen after inactivity | Must | At most one per growth interval |
| FR-06 | Persist world locally | Must | Reload does not reset the garden |
| FR-07 | Change palette | Should | Same entity positions, different colors |
| FR-08 | New world/reset with confirmation | Must | Replaces local state; fresh seed |
| FR-09 | Display DNA and recent evolution log | Must | Numbers agree with state |
| FR-10 | Responsive, keyboard, and touch support | Must | World usable at 360px wide |
| FR-11 | Transparent mode label | Must | Explicitly states “local demo” |
| FR-12 | Seed copy | Should | Copies world seed, not full world history |

## Online scope (Track B — shared garden)
| ID | Requirement | Acceptance |
| --- | --- | --- |
| FR-20 | One authoritative public world | Multiple browsers converge on same world revision |
| FR-21 | Mutations processed by server only | Client-supplied arbitrary entities ignored |
| FR-22 | Realtime reconciliation | Other tabs show committed changes within target latency |
| FR-23 | Server-owned idle growth | Not multiplied by count of open tabs |
| FR-24 | Anonymous public participation | No mandatory signup, basic abuse protection |
| FR-25 | Persistent replayable history | Event list can be audited by world revision |
| FR-26 | Recover from dropped connection | Refresh/snapshot reconciles gaps |
| FR-27 | Owner-only world reset | Public users cannot wipe global world |

## Non-functional targets
- First meaningful render **under 2 seconds** on a mid-range mobile device on a normal connection (target; test).
- Typical interaction visual feedback **under 100 ms** locally; server confirmation is separate.
- Canvas draws at least **30 FPS** in normal conditions; throttle to ~30 FPS if necessary.
- Render **no more than 85 live specimens** in V1 and use no more than 160 active particles.
- No personal information collected in local demo.
- Shared version works on touch, mouse and keyboard, and has reduced-motion behavior.
- Default world should remain visually legible even at 100% chaos.

## Out of scope
Accounts, user-generated text, chat, marketplace, NFTs, AI-generated assets, uploadable images, global leaderboards, 3D world, and complex inventory systems.

## Success signals (measure only with consent-respecting analytics)
- Percent of visitors who interact at least once.
- Median time to first interaction.
- Returning visitors within 7 days.
- Mutations/visitor, and how often active worlds remain playable.
- Shared version: successful event acceptance vs. rate-limited events.

## Product constraint
The complete concept must be recognizable in a **single screen**. Do not add onboarding or sign-in walls.
