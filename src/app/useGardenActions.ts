// Everything that happens after the user does something: commit the action,
// pick the helper line, toast and burst. Keeps App.tsx down to layout.
import { useCallback, useEffect, useState } from 'react';
import { getPalette } from '../game/palettes.ts';
import type { CanonicalAction, Point } from '../game/types.ts';
import type { UseWorldResult } from '../store/useWorld.ts';
import { COPY } from './copy.ts';
import { burstPointFor, toastForError, toastForSpawn, type InteractionSource } from './feedback.ts';

export interface BurstRequest {
  point: Point;
  key: number;
}

export interface GardenActions {
  helper: string;
  burst: BurstRequest | null;
  onInteract(point: Point, source: 'click' | 'key'): void;
  onMutate(): void;
  onPalette(): void;
  onReset(): void;
  onCopySeed(): Promise<void>;
  onOutsideClick(): void;
}

export function useGardenActions(
  world: UseWorldResult,
  mode: 'local' | 'shared',
  notice: (text: string) => void,
): GardenActions {
  const { snapshot, status, error, interact, reset, markActivity } = world;
  const [helper, setHelper] = useState<string>(COPY.controls.helper);
  const [burst, setBurst] = useState<BurstRequest | null>(null);

  // Storage warning: once, when the first snapshot lands.
  useEffect(() => {
    if (status === 'ready' && snapshot && !snapshot.persistent && mode === 'local') {
      notice(COPY.toasts.storageWarning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!error) return;
    notice(toastForError(error));
    setHelper(COPY.controls.helper);
  }, [error, notice]);

  // Events that arrived without a local click (idle growth, remote visitors).
  const latestEventId = snapshot?.events[0]?.eventId;
  useEffect(() => {
    const event = snapshot?.events[0];
    if (!snapshot || !event || event.action !== 'idle_growth') return;
    setHelper(COPY.controls.helperIdle);
    const point = burstPointFor(event, snapshot.world);
    if (point) setBurst({ point, key: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEventId]);

  const commit = useCallback(
    async (action: CanonicalAction, source: InteractionSource) => {
      if (mode === 'shared') setHelper(COPY.controls.helperBusy);
      const outcome = await interact(action);
      if (!outcome?.event) return;
      const { event, snapshot: next } = outcome;
      if (event.result === 'palette') {
        setHelper(COPY.controls.helperPalette);
        notice(`${COPY.toasts.palette} · ${getPalette(next.world.palette).name}`);
        return;
      }
      // Clicks already burst where the pointer was; buttons burst where the engine put things.
      if (source === 'button') {
        const point = burstPointFor(event, next.world);
        if (point) setBurst({ point, key: Date.now() });
      }
      if (event.result === 'transform') {
        setHelper(COPY.controls.helperTransformed);
        notice(COPY.toasts.transform);
      } else {
        setHelper(COPY.controls.helperBorn);
        notice(toastForSpawn(source));
      }
    },
    [interact, mode, notice],
  );

  const onInteract = useCallback(
    (point: Point, source: 'click' | 'key') => void commit({ kind: 'click', point }, source),
    [commit],
  );

  const onMutate = useCallback(() => {
    markActivity();
    void commit({ kind: 'random_mutation' }, 'button');
  }, [commit, markActivity]);

  const onPalette = useCallback(() => {
    markActivity();
    void commit({ kind: 'palette_shift' }, 'palette');
  }, [commit, markActivity]);

  const onReset = useCallback(() => {
    if (!window.confirm(COPY.confirmReset)) return;
    void reset().then(() => {
      setHelper(COPY.controls.helperFresh);
      notice(COPY.toasts.newWorld);
    });
  }, [reset, notice]);

  const onCopySeed = useCallback(async () => {
    if (!snapshot) return;
    const seed = String(snapshot.world.seed);
    try {
      await navigator.clipboard.writeText(seed);
      notice(COPY.toasts.seedCopied + seed);
    } catch {
      window.prompt(COPY.toasts.seedPrompt, seed);
    }
  }, [snapshot, notice]);

  const onOutsideClick = useCallback(() => {
    if (window.innerWidth > 700) notice(`✧ ${COPY.controls.helperOutside}`);
  }, [notice]);

  return { helper, burst, onInteract, onMutate, onPalette, onReset, onCopySeed, onOutsideClick };
}
