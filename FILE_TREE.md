# Proposed Production File Tree

The downloaded demo intentionally has only `mockup/index.html`. **The following is a target structure**, not a claim that these source files already exist.

```text
glitch-garden/
├── README.md
├── AGENTS.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .gitignore
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── app/App.tsx
│   ├── app/App.css
│   ├── components/
│   │   ├── PixelWorld.tsx          # canvas + input / resize only
│   │   ├── WorldStats.tsx          # chaos / growth / mutations
│   │   ├── EvolutionLog.tsx        # recent server events
│   │   ├── WorldControls.tsx       # mutate / palette / reset (dev only)
│   │   └── StatusToast.tsx
│   ├── game/
│   │   ├── types.ts                # pure domain interfaces
│   │   ├── palettes.ts             # 4 restricted color palettes
│   │   ├── initialWorld.ts         # new world from seed
│   │   ├── prng.ts                 # explicit deterministic PRNG
│   │   ├── mutations.ts            # pure world transition reducer
│   │   ├── sprites.ts              # pure canvas pixel primitives
│   │   ├── renderer.ts             # 480x320 draw order
│   │   └── hitTest.ts              # nearest entity selection
│   ├── input/
│   │   └── pointer.ts              # coordinate mapping, velocity
│   ├── store/
│   │   ├── useWorld.ts             # state subscription hook
│   │   ├── localWorldStore.ts      # localStorage adapter
│   │   └── remoteWorldStore.ts     # optional production adapter
│   ├── services/
│   │   ├── worldApi.ts             # HTTP contract
│   │   └── realtime.ts             # Realtime subscription lifecycle
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── pixel-ui.css
│   │   └── responsive.css
│   └── tests/
│       ├── mutation.test.ts
│       ├── serialization.test.ts
│       └── geometry.test.ts
├── e2e/
│   ├── local-persistence.spec.ts
│   ├── input.spec.ts
│   └── responsive.spec.ts
├── supabase/                    # Only needed in Track B
│   ├── config.toml
│   ├── migrations/
│   │   └── 0001_world.sql
│   └── functions/
│       └── interact/index.ts   # canonical server mutation endpoint
└── docs/
    ├── 01_PRODUCT_REQUIREMENTS.md
    ├── 02_VISUAL_UX_SYSTEM.md
    ├── 03_SYSTEM_ARCHITECTURE.md
    ├── 04_DATA_CONTRACTS.md
    ├── 05_MUTATION_ENGINE.md
    ├── 06_REALTIME_SECURITY.md
    ├── 07_FRONTEND_IMPLEMENTATION.md
    ├── 08_ROADMAP_TASKS.md
    ├── 09_TESTING_ACCEPTANCE.md
    ├── 10_DEPLOYMENT_OPERATIONS.md
    ├── 11_DECISIONS_RISKS.md
    └── 12_AGENT_WORKFLOWS.md
```

## Why this separation?

- `game/` knows nothing about React, Supabase, or browser storage. It can be unit-tested and reused server-side.
- `renderer.ts` reads immutable world snapshots and draws sprites, rather than mutating business state.
- `store/` makes **local** and **shared** deployments selectable without redesigning UI components.
- `supabase/` is opt-in, keeping the weekend version truly small.
