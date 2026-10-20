import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { nearestEntity } from '../game/hitTest.ts';
import { renderOverlay } from '../game/renderer.ts';
import {
  emitParticles,
  gardenViewport,
  insideViewport,
  registerChanges,
  stepParticles,
  takeLanding,
  type Birth,
  type Burst,
  type Particle,
  type Viewport,
} from '../game/space/index.ts';
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type PixelEntity,
  type Point,
  type WorldState,
} from '../game/types.ts';
import { toLogicalPoint, VelocityTracker } from '../input/pointer.ts';

export type InteractSource = 'click' | 'key';

export interface PixelWorldProps {
  world: WorldState;
  reducedMotion: boolean;
  /** Called with a logical point; resolve when the mutation is committed. */
  onInteract(point: Point, source: InteractSource): void;
  onOutsideClick(): void;
  onPointerActivity(): void;
  /** A burst requested by the parent (e.g. after the MUTATE button). */
  burst: { point: Point; key: number } | null;
  ariaLabel: string;
}

const FRAME_MS = 34; // ~30 FPS
const REDUCED_FRAME_MS = 250;

export function PixelWorld(props: PixelWorldProps) {
  const { world, reducedMotion, onInteract, onOutsideClick, onPointerActivity, burst, ariaLabel } =
    props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(world);
  const seenEntities = useRef<Map<string, PixelEntity>>(new Map());
  const births = useRef<Map<string, Birth>>(new Map());
  const lastDrop = useRef<{ point: Point; at: number } | null>(null);
  const particles = useRef<Particle[]>([]);
  const cursor = useRef<Point | null>(null);
  const burstRef = useRef<Burst | null>(null);
  const velocity = useRef(new VelocityTracker());
  const lastTrail = useRef(0);
  const size = useRef({ width: 0, height: 0, dpr: 1 });

  worldRef.current = world;

  const viewportForCanvas = useCallback((): Viewport => {
    return gardenViewport(size.current.width, size.current.height);
  }, []);

  /** Logical point for a pointer event, or null when outside the garden region. */
  const logicalFromEvent = useCallback(
    (event: PointerEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cssX = event.clientX - rect.left;
      const cssY = event.clientY - rect.top;
      const viewport = viewportForCanvas();
      if (!insideViewport(cssX, cssY, viewport)) return null;
      return toLogicalPoint(event.clientX, event.clientY, {
        left: rect.left + viewport.left,
        top: rect.top + viewport.top,
        width: viewport.width,
        height: viewport.height,
      });
    },
    [viewportForCanvas],
  );

  // Parent-requested burst (MUTATE button, idle growth, remote events).
  useEffect(() => {
    if (!burst) return;
    burstRef.current = { point: burst.point, startedAt: performance.now() };
    if (!reducedMotion) emitParticles(particles.current, burst.point, 22);
  }, [burst, reducedMotion]);

  // Resize: the overlay covers its parent; the context must be re-flagged after every resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const box = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { width: box.width, height: box.height, dpr };
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      canvas.style.width = `${box.width}px`;
      canvas.style.height = `${box.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Frame loop, throttled to ~30 FPS and paused while the tab is hidden.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let handle = 0;
    let lastFrame = 0;
    let lastEntities: readonly PixelEntity[] | null = null;
    const interval = reducedMotion ? REDUCED_FRAME_MS : FRAME_MS;
    const tick = (now: number) => {
      handle = requestAnimationFrame(tick);
      if (document.visibilityState === 'hidden') return;
      if (now - lastFrame < interval) return;
      lastFrame = now;
      const current = worldRef.current;

      // Diff snapshots so new or transformed specimens animate in (client-only).
      if (current.entities !== lastEntities) {
        registerChanges(
          births.current,
          seenEntities.current,
          current.entities,
          now,
          lastDrop.current,
        );
        seenEntities.current = new Map(current.entities.map((e) => [e.id, e]));
        lastEntities = current.entities;
      }
      if (!reducedMotion) {
        stepParticles(particles.current);
        for (const [id, birth] of births.current) {
          if (takeLanding(birth, now)) {
            const landed = seenEntities.current.get(id);
            if (landed) emitParticles(particles.current, { x: landed.x, y: landed.y }, 14);
          }
        }
      }
      if (burstRef.current && now - burstRef.current.startedAt > 400) burstRef.current = null;
      const hover = cursor.current ? nearestEntity(current.entities, cursor.current) : null;

      renderOverlay(ctx, current, {
        time: now,
        reducedMotion,
        particles: particles.current,
        cursor: cursor.current,
        burst: burstRef.current,
        births: births.current,
        hoverId: hover?.id ?? null,
        viewport: viewportForCanvas(),
        canvasWidth: size.current.width,
        canvasHeight: size.current.height,
        devicePixelRatio: size.current.dpr,
      });
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [reducedMotion, viewportForCanvas]);

  const dropAt = (point: Point, source: InteractSource) => {
    lastDrop.current = { point, at: performance.now() };
    burstRef.current = { point, startedAt: performance.now() };
    if (!reducedMotion) emitParticles(particles.current, point, 26);
    onInteract(point, source);
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    onPointerActivity();
    const point = logicalFromEvent(event);
    if (!point) {
      onOutsideClick();
      return;
    }
    dropAt(point, 'click');
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = logicalFromEvent(event);
    cursor.current = point;
    if (!point) {
      velocity.current.reset();
      return;
    }
    onPointerActivity();
    if (reducedMotion) return;
    const now = performance.now();
    const speed = velocity.current.sample(point, now);
    // Fast moves leave pixel dust (client-only; never a mutation).
    if (speed > 0.25 && now - lastTrail.current > 40) {
      lastTrail.current = now;
      emitParticles(particles.current, point, speed > 0.9 ? 3 : 1);
    }
  };

  const handlePointerLeave = () => {
    cursor.current = null;
    velocity.current.reset();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onPointerActivity();
    dropAt({ x: Math.floor(WORLD_WIDTH / 2), y: Math.floor(WORLD_HEIGHT * 0.6) }, 'key');
  };

  return (
    <canvas
      ref={canvasRef}
      id="effects"
      className="effects"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onKeyDown={handleKeyDown}
    />
  );
}
