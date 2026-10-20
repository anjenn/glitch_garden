# 11 — Decisions, Alternatives & Risks

## Decisions
| ID | Decision | Reason | Tradeoff |
| --- | --- | --- | --- |
| ADR-01 | Canvas 2D, not WebGL | Low complexity, exact nearest-neighbor pixel art | Fewer sophisticated effects |
| ADR-02 | 480×320 logical world | Crisp and consistent mapping | May look chunky by design |
| ADR-03 | Static standalone first | Fastest way to test whether interaction is fun | Worlds are not shared yet |
| ADR-04 | Pure seeded mutation reducer | Reproducible transitions and easy tests | Must carefully version rules |
| ADR-05 | React optional until multiplayer | Avoid needless complexity | Later migration can take time |
| ADR-06 | Supabase for shared version | Postgres + Edge + Realtime together | Vendor costs and limits |
| ADR-07 | Server-authoritative world | Prevents easy global vandalism/data corruption | Requires backend for every mutation |
| ADR-08 | Only 8 allowlisted sprite archetypes | Art consistency, abuse-resistant | Lower expressive range |
| ADR-09 | Pointer trails local-only | Prevents high-frequency network writes | Other users do not see your cursor |
| ADR-10 | No visitor-generated text | Zero moderation for user text | Less explicit collaboration |

## Risk register
| Risk | Severity | Trigger / mitigation |
| --- | --- | --- |
| World grows cluttered | High | Hard cap 85 objects; design layering; reduce crowding via spawn policy |
| Global interaction abuse | High | JWT, rate limiting, edge throttle, read-only circuit-breaker |
| Concurrent updates lost | High | Atomic revision-checked commits + retries |
| Offline world falsely described as shared | High | Accurate “local demo” runtime labels |
| Realtime messages missed | Medium | Snapshot fetch on reconnect and revision gap |
| Mobile touch feels inaccurate | Medium | Large tap controls, pointer mapping tests |
| Idle growth multiplies with visitors | High | Server-only scheduler, unique minute bucket |
| Visual accessibility limitations | Medium | HTML log/stats + keyboard mutations |
| LocalStorage disabled | Low | In-memory fallback, unobtrusive user notice |
| Emergence becomes repetitive | Medium | Curate more mutation rules only after behavior data |
| Deployment spends beyond budget | Medium | Budget alerts, quotas, read-only protection |

## Open decisions before multiplayer
1. One global universe forever, or seasonal resets? Default: **one universe** with admin snapshots.
2. Should anonymous mutations need CAPTCHA? Default: **not initially**; add on abuse.
3. Do all changes live forever? Default: **world persists**, event history retention configurable.
4. Should palette shifts be global? Default: **yes**, but rate-limited and reversible through future mutations.
5. Should offline demo remain available? Default: **yes**, as `/sandbox` for safe experimentation.

## Explicit non-goals
Machine-learning agents, social networking, personalized avatars, economy, 3D rendering and complex game mechanics. The fun should come from the visible unpredictability of small actions.
