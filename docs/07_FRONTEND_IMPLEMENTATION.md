# 07 — Frontend Implementation Specification

## Baseline stack
- **Track A:** vanilla HTML + CSS + Canvas 2D + localStorage (already working).
- **Track B:** Vite + React + strict TypeScript; Canvas 2D for game world; CSS for navigation, panels, accessible controls; Supabase JS for auth and Realtime.
- Do not add a physics engine, animation library, or WebGL renderer until a concrete bottleneck appears.

## React component contracts
| Component | Props / data | Responsibility |
| --- | --- | --- |
| `App` | mode (`local` / `shared`) | Layout, service configuration, mode banner |
| `PixelWorld` | world snapshot, `onInteract(x,y)` | Canvas loop and logical input mapping |
| `WorldStats` | mutations, entities, chaos, growth | Human-readable metrics |
| `EvolutionLog` | last 7 events | Accessible list, visible timestamps |
| `WorldControls` | `onMutate`, `onPalette`, `onReset?` | Button actions; reset local/admin only |
| `StatusToast` | message | Short-lived success and error feedback |

## CSS / rendering rules
- Draw at fixed internal 480×320 pixels. Style canvas to fit the container and set `image-rendering: pixelated`.
- Call `ctx.imageSmoothingEnabled = false` after context creation and whenever the context is recreated.
- Cap device pixel ratio work; render only one logical low-res frame per animation tick.
- Separate simulation state from `performance.now()`-based visual oscillation.
- Keep CSS rectangular borders, hard-offset shadows, high-contrast 8-bit controls.
- Map pointer as `x = floor((clientX - rect.left) / rect.width * 480)` and equivalent y.
- Use `PointerEvent` for both desktop and touch. Set `touch-action: none` only on the canvas.

## Runtime
- Use `requestAnimationFrame`; throttle canvas recomputation to ~30 FPS.
- Stop heavy animation when `document.visibilityState === 'hidden'`.
- Track transient particle effects in a bounded mutable ref, separate from React component re-renders.
- Recompute UI metrics on authoritative state changes; no `setState` on every pixel draw.
- Persist only after canonical local mutations, not on every frame or pointer movement.

## Storage adapter
```ts
interface WorldRepository {
  load(): Promise<WorldState>;
  interact(intent: ClientMutationIntent): Promise<WorldState>;
  subscribe(listener: (next: WorldState) => void): () => void;
}
```
`LocalWorldRepository` applies the engine directly and persists to localStorage. `RemoteWorldRepository` sends action intents to the server and reconciles committed snapshots. Both produce the same typed `WorldState`. Explicitly display runtime mode in UI.

## Migration from standalone prototype
1. Copy palette values and sprite algorithms from `mockup/index.html` into the `game/` modules.
2. Freeze and test the initial sprite look before modifying interactions.
3. Extract pure deterministic reducer; replace demo-only randomness with tested seeded PRNG.
4. Implement local repository and storage schema migration.
5. Rebuild UI in React without changing layout language.
6. Add server repository behind an environment switch; keep local mode available for development.

## Localization and content
The demo ships English UI. Keep copy in one constants module to enable future Korean localization without changing the renderer. Avoid putting UI text inside canvas; use HTML DOM for accessibility.

## Browser support
Target current Chromium, Firefox, Safari, and iOS Safari. Test touch, clipboard fallback, private browsing (localStorage may fail), reduced-motion, and zoom at 200%.
