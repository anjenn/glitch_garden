# Repository File Tree

Actual layout as of 2026-10-20. `mockup/` is the original standalone prototype and the visual reference.

```text
glitch-garden/
├── README.md
├── AGENTS.md
├── FILE_TREE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .gitignore
├── .gitattributes               # LF everywhere
├── .nvmrc                       # Node 22 (Netlify + local)
├── netlify.toml                 # build, SPA redirect, cache + security headers
├── index.html
├── public/
│   ├── favicon.svg
│   └── assets/angel-forest.png      # illustrated backdrop (copied from mockup/assets)
├── scripts/
│   └── sync-shared.mjs              # copies src/game → supabase/functions/_shared/game
├── src/
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── app/
│   │   ├── App.tsx                  # layout only
│   │   ├── App.css                  # pastel art direction ported from the mockup
│   │   ├── copy.ts                  # every UI string
│   │   ├── feedback.ts              # pure outcome → toast/label helpers
│   │   ├── useGardenActions.ts      # commit actions, helper line, bursts
│   │   └── hooks/                   # useReducedMotion, useClock, useToast
│   ├── components/
│   │   ├── PixelWorld.tsx           # overlay canvas: frame loop, input mapping, particles
│   │   ├── useOverlayCanvas.ts      # parent-sized canvas + DPR + nearest-neighbor flag
│   │   ├── SiteHeader.tsx           # brand, mode chip, pixel-tab nav, palette + seed tools
│   │   ├── SceneDecor.tsx           # fog, sparkles, leaves
│   │   ├── WorldStats.tsx           # generation / mutations / specimens / meters
│   │   ├── EvolutionLog.tsx         # last 7 events
│   │   ├── WorldControls.tsx        # mutate / palette (phones) / new world / help
│   │   ├── HelpPopover.tsx
│   │   └── StatusToast.tsx
│   ├── game/                        # pure: no DOM, storage or network
│   │   ├── types.ts                 # domain types + constants (480×320, cap 85, 21px, 0.35)
│   │   ├── prng.ts                  # mulberry32 + mix32/hashString, stream derivation
│   │   ├── palettes.ts              # 4 palettes (sprite/sparkle/particle colors)
│   │   ├── initialWorld.ts          # seeded starter garden
│   │   ├── mutations.ts             # applyMutation reducer
│   │   ├── hitTest.ts               # nearest entity within radius
│   │   ├── validate.ts              # type guards + strict intent parser
│   │   ├── characters/              # maps, colors, draw (PixelSink)
│   │   ├── space/                   # viewport, terrain, atmosphere, particles, animation, colors
│   │   └── renderer.ts              # compositor: space → characters → effects
│   ├── input/
│   │   └── pointer.ts               # CSS px → logical coords, velocity
│   ├── store/
│   │   ├── repository.ts            # WorldRepository contract + RepositoryError
│   │   ├── localWorldStore.ts       # localStorage adapter, migration, memory fallback
│   │   ├── remoteWorldStore.ts      # Supabase adapter (intent POST + Realtime)
│   │   ├── createRepository.ts      # env switch with honest local fallback
│   │   └── useWorld.ts              # React hook, idle growth timer
│   └── tests/
│       ├── prng.test.ts
│       ├── geometry.test.ts
│       ├── mutation.test.ts
│       ├── validate.test.ts
│       ├── serialization.test.ts
│       ├── characters.test.ts
│       ├── space.test.ts
│       ├── terrain.test.ts
│       ├── animation.test.ts
│       └── sharedSync.test.ts       # _shared/game must equal src/game
├── e2e/
│   ├── local-persistence.spec.ts
│   ├── input.spec.ts
│   └── responsive.spec.ts
├── supabase/                        # Track B (code complete, not deployed)
│   ├── config.toml
│   ├── migrations/0001_world.sql
│   └── functions/
│       ├── _shared/server.ts        # Deno helpers: auth, commit RPC, errors
│       ├── _shared/game/            # synced copy of src/game
│       ├── interact/index.ts        # canonical mutation endpoint
│       └── growth/index.ts          # scheduler-only idle growth
├── mockup/
│   ├── index.html
│   ├── assets/angel-forest.png
│   └── preview-*.png
└── docs/01…12
```

## Why this separation?

- `game/` knows nothing about React, Supabase, or browser storage. It is unit-tested and the same
  files run inside the Edge Functions.
- `renderer.ts` reads immutable world snapshots and draws sprites; it never mutates business state.
- `store/` makes **local** and **shared** deployments selectable without touching UI components.
- `supabase/` is opt-in, keeping the standalone version truly small.
