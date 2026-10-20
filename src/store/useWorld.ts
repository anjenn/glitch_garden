import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanonicalAction, WorldEvent } from '../game/types.ts';
import { RepositoryError, type WorldRepository, type WorldSnapshot } from './repository.ts';

/** Local demo auto-grows after this much inactivity (spec 02: ~16 seconds). */
export const IDLE_GROWTH_MS = 16_000;

export type WorldStatus = 'loading' | 'ready' | 'error';

export interface InteractOutcome {
  snapshot: WorldSnapshot;
  event: WorldEvent | null;
}

export interface UseWorldResult {
  snapshot: WorldSnapshot | null;
  status: WorldStatus;
  pending: boolean;
  error: RepositoryError | null;
  interact(action: CanonicalAction): Promise<InteractOutcome | null>;
  reset(): Promise<void>;
  /** Call on any user input so idle growth waits for real inactivity. */
  markActivity(): void;
}

export function useWorld(repository: WorldRepository): UseWorldResult {
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [status, setStatus] = useState<WorldStatus>('loading');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<RepositoryError | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const lastGrowth = useRef<number>(Date.now());
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    repository
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setSnapshot(loaded);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(toRepositoryError(cause));
        setStatus('error');
      });
    const unsubscribe = repository.subscribe((next) => {
      if (!cancelled) setSnapshot(next);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      repository.dispose?.();
    };
  }, [repository]);

  const interact = useCallback(
    async (action: CanonicalAction): Promise<InteractOutcome | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setPending(true);
      lastActivity.current = Date.now();
      if (action.kind === 'idle_growth') lastGrowth.current = Date.now();
      try {
        const next = await repository.interact(action);
        setSnapshot(next);
        setError(null);
        return { snapshot: next, event: next.events[0] ?? null };
      } catch (cause) {
        const failure = toRepositoryError(cause);
        setError(failure);
        return null;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [repository],
  );

  const reset = useCallback(async () => {
    if (!repository.reset) return;
    const next = await repository.reset();
    setSnapshot(next);
    lastActivity.current = Date.now();
    lastGrowth.current = Date.now();
  }, [repository]);

  const markActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  // Local-only autonomous growth: at most one specimen per idle interval, and
  // only while the tab is visible. Shared mode leaves growth to the server job.
  useEffect(() => {
    if (!repository.ownsIdleGrowth || status !== 'ready') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastActivity.current < IDLE_GROWTH_MS) return;
      if (now - lastGrowth.current < IDLE_GROWTH_MS) return;
      lastGrowth.current = now;
      void interact({ kind: 'idle_growth' });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [repository, status, interact]);

  return { snapshot, status, pending, error, interact, reset, markActivity };
}

function toRepositoryError(cause: unknown): RepositoryError {
  if (cause instanceof RepositoryError) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  return new RepositoryError('WORLD_UNAVAILABLE', message);
}
