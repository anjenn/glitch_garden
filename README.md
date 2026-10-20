# GLITCH.GARDEN — 8-bit Evolving Website

**A tiny pixel world that changes when someone interacts with it.**

This package includes a playable, dependency-free HTML prototype and a complete set of build specifications for an optional globally shared version.

## Try the mockup

1. Open [`mockup/index.html`](mockup/index.html) in a current browser.
2. Click anywhere in the world, or press **MUTATE**, to alter its organisms.
3. Move your pointer fast to produce temporary pixel distortion.
4. Stop interacting for ~16 seconds to let the garden grow autonomously.
5. Click **PALETTE** to cycle color modes. Click **NEW WORLD / RESET** to clear your locally saved world.
6. Refresh the page: your changes persist with `localStorage`.

**Important:** This mockup is **local-only**. Its visit counter counts visits in your browser, not worldwide users. The shared persistent garden described in the architecture docs is a planned production feature, not an implemented feature.

## Package contents

| File | Purpose |
| --- | --- |
| `mockup/index.html` | Working standalone 8-bit interactive demo (HTML/CSS/JS; no build/install) |
| `mockup/preview-desktop.png` | Desktop mockup screenshot |
| `mockup/preview-mobile.png` | Mobile mockup screenshot |
| [`AGENTS.md`](AGENTS.md) | Ground rules for coding agents |
| [`FILE_TREE.md`](FILE_TREE.md) | Target production repository layout |
| [`docs/01_PRODUCT_REQUIREMENTS.md`](docs/01_PRODUCT_REQUIREMENTS.md) | Vision, MVP, personas, requirements |
| [`docs/02_VISUAL_UX_SYSTEM.md`](docs/02_VISUAL_UX_SYSTEM.md) | Pixel art UI, palette, states, responsiveness |
| [`docs/03_SYSTEM_ARCHITECTURE.md`](docs/03_SYSTEM_ARCHITECTURE.md) | Components, data flow, offline-to-online migration |
| [`docs/04_DATA_CONTRACTS.md`](docs/04_DATA_CONTRACTS.md) | Models, event and API contracts |
| [`docs/05_MUTATION_ENGINE.md`](docs/05_MUTATION_ENGINE.md) | Deterministic mutation and rendering rules |
| [`docs/06_REALTIME_SECURITY.md`](docs/06_REALTIME_SECURITY.md) | Multiuser sync, access control, spam prevention |
| [`docs/07_FRONTEND_IMPLEMENTATION.md`](docs/07_FRONTEND_IMPLEMENTATION.md) | React/Canvas engineering guidelines |
| [`docs/08_ROADMAP_TASKS.md`](docs/08_ROADMAP_TASKS.md) | Milestones and actionable implementation tickets |
| [`docs/09_TESTING_ACCEPTANCE.md`](docs/09_TESTING_ACCEPTANCE.md) | Test strategy and release gates |
| [`docs/10_DEPLOYMENT_OPERATIONS.md`](docs/10_DEPLOYMENT_OPERATIONS.md) | Environments, release and monitoring |
| [`docs/11_DECISIONS_RISKS.md`](docs/11_DECISIONS_RISKS.md) | Architecture decisions and risk register |
| [`docs/12_AGENT_WORKFLOWS.md`](docs/12_AGENT_WORKFLOWS.md) | Agent roles, task templates and prompts |

## Two build options

**Track A — simplest playable website:** Publish `mockup/index.html` as a static site. No accounts, no database, no infrastructure work. Visitors get their own evolving local garden.

**Track B — truly shared garden:** Rebuild the prototype in React + TypeScript, keep Canvas 2D pixel rendering, then add Supabase Postgres + Realtime + a server-authoritative mutation endpoint. All visitors see the same canonical world. Build only after Track A is validated.

## Definition of done

- Click/touch/keyboard interaction changes the world.
- Changes survive a refresh.
- Pixel rendering remains crisp at every viewport size.
- “Local only” is honestly labeled until multiplayer exists.
- Future shared mutations are validated server-side, not trusted from the browser.

## License / assets

The demonstration uses procedural art only: no externally hosted images, proprietary fonts, or third-party scripts. Choose your own license before publishing the repository.
