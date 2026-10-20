# 02 — 8-Bit Visual & UX System

## Art direction
**Old handheld console meets experimental internet artwork.** Sharp, playful, mysterious, dark background with cheerful alien flora. Use chunky geometry, stepped shadows, and a small fixed palette. “8-bit” describes the **retro aesthetic**, not an actual restriction to old hardware or exactly 256 simultaneous colors.

## Exact reference
Start from `../mockup/index.html`. Desktop and mobile screenshots are in `../mockup/preview-desktop.png` and `../mockup/preview-mobile.png`.

## Display rules
- Logical render target: **480 × 320** units.
- Browser element scales responsively with `canvas { width:100%; aspect-ratio:480/320; image-rendering:pixelated }`.
- Disable bilinear filtering: `context.imageSmoothingEnabled = false`.
- Draw flora/objects using integer-coordinate pixel blocks; avoid anti-aliased paths.
- Favor tiles/blocks of 2–4 logical px. Pixel-art silhouettes must read at 360px viewport width.
- Background stars, terrain, moon, distant skyline, occasional static geometric accents.
- Sprite order: backdrops → stars → ground → entities sorted by y → cursor → transient particles.
- Keep CSS UI borders 2–3px thick with rectangular hard shadows. No rounded pill UI.
- No required external image or font dependency.

## Color tokens (default palette)
| Token | Hex | Usage |
| --- | --- | --- |
| bg | `#090d20` | Outer page |
| panel | `#151b39` | Cards |
| sky | `#10152d` | Canvas sky |
| terrain | `#23284c` | Ground |
| ink | `#f5f4e8` | Main copy |
| muted | `#9fa9c7` | Secondary copy |
| lime | `#dbff79` | Main CTA and growth |
| cyan | `#7ceade` | Digital feedback |
| pink | `#ff8fa7` | Alternative CTA, flowers |
| lavender | `#bb9fff` | Celestial elements |
| border | `#626b95` | Frame strokes |

Ship four curated palettes. Palette switch re-colors existing sprite archetypes; it does not change their geometry.

## Layout hierarchy
1. Tiny experiment/version status strip.
2. Brand, navigation, world-seed copy action.
3. Hero statement and transparent local/shared status.
4. Main grid: prominent interactive world (roughly 70%) and compact genome/control rail (roughly 30%).
5. Three-card instructions explaining CLICK / MOVE / IDLE.
6. Footer with actual runtime mode.

## UX behaviors
| Input | World response | Feedback |
| --- | --- | --- |
| Click/tap canvas | Spawn or transform at coordinates | Burst animation, mutation counter, log |
| Press Enter/Space when canvas focused | Mutate center | Same as click |
| Click MUTATE button | Mutate a random legal location | Toast and log |
| Rapid pointer movement | Temporary particles only | World status text changes |
| Inactive for ~16 seconds (local demo) | Autogrow | Mutation log entry |
| Click PALETTE | Cycle palette index | Whole canvas recolors, mutation log |
| Click NEW WORLD | Confirmation then reset | Fresh seed; previous local state gone |
| Click COPY SEED | Copy numeric seed | Toast; if clipboard unavailable, manual copy fallback |

**Important:** Moving the pointer must never send continuous write requests to the production backend. Temporary visual particles are local effects.

## Responsive
- `≥ 980px`: canvas + two stacked panels in right rail.
- `641–979px`: canvas full width; two info panels side by side below.
- `≤ 640px`: single column, smaller navigation, large tap controls, canvas retains ratio.
- The document must never overflow horizontally at 360px.

## Accessibility & reduced motion
- Proper labels for controls; visible keyboard focus.
- Enter/Space alternative for mutating the canvas.
- Never convey important world status by color alone; expose counts/log as HTML.
- Use `aria-live` sparingly to avoid constant announcement spam.
- Disable optional blink and idle float effects when `prefers-reduced-motion: reduce`.
- Meet WCAG AA contrast for interface text; treat pixel canvas as decorative art with textual state available in adjacent panels.

## Do not introduce
Smooth glassmorphism, pastel gradients, blurry resampling, tiny interactive targets, autoplay audio, custom cursor that removes native focus indicators, or giant decorative slogans covering the world.
