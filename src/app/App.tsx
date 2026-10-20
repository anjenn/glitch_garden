import { useCallback, useEffect, useMemo, useState } from 'react';
import { EvolutionLog } from '../components/EvolutionLog.tsx';
import { HelpPopover } from '../components/HelpPopover.tsx';
import { PixelWorld, type InteractSource } from '../components/PixelWorld.tsx';
import { StatusToast, type ToastMessage } from '../components/StatusToast.tsx';
import { WorldControls } from '../components/WorldControls.tsx';
import { WorldStats } from '../components/WorldStats.tsx';
import { getPalette } from '../game/palettes.ts';
import type { CanonicalAction, Point, WorldEvent, WorldState } from '../game/types.ts';
import type { WorldRepository } from '../store/repository.ts';
import { useWorld } from '../store/useWorld.ts';
import { COPY } from './copy.ts';
import './App.css';

export interface AppProps {
  repository: WorldRepository;
  /** Set when shared mode was requested but could not be reached. */
  fallbackNotice?: string | undefined;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Where to burst for a committed event: the entity it touched, if any. */
function burstPointFor(event: WorldEvent | null, world: WorldState): Point | null {
  if (!event?.entityId) return null;
  const entity = world.entities.find((e) => e.id === event.entityId);
  return entity ? { x: entity.x, y: entity.y } : null;
}

export function App({ repository, fallbackNotice }: AppProps) {
  const { snapshot, status, pending, error, interact, reset, markActivity } = useWorld(repository);
  const reducedMotion = useReducedMotion();
  const [helper, setHelper] = useState<string>(COPY.controls.helper);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [burst, setBurst] = useState<{ point: Point; key: number } | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const mode = repository.mode;

  const notice = useCallback(
    (text: string) => setToast({ text, key: Date.now() + Math.random() }),
    [],
  );

  useEffect(() => {
    const handle = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    if (fallbackNotice) notice(fallbackNotice);
  }, [fallbackNotice, notice]);

  useEffect(() => {
    if (snapshot && !snapshot.persistent && mode === 'local') notice(COPY.toasts.storageWarning);
    // Only warn once, when the snapshot first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!error) return;
    const text =
      error.code === 'RATE_LIMITED'
        ? COPY.toasts.rateLimited
        : error.code === 'REVISION_CONFLICT'
          ? COPY.toasts.conflict
          : error.code === 'NETWORK'
            ? COPY.toasts.offline
            : COPY.toasts.error;
    notice(text);
    setHelper(COPY.controls.helper);
  }, [error, notice]);

  // Watch for events that arrived without a local click (idle growth, remote visitors).
  const latestEventId = snapshot?.events[0]?.eventId;
  useEffect(() => {
    if (!snapshot || !latestEventId) return;
    const event = snapshot.events[0] ?? null;
    if (event?.action === 'idle_growth') {
      setHelper(COPY.controls.helperIdle);
      const point = burstPointFor(event, snapshot.world);
      if (point) setBurst({ point, key: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEventId]);

  const commit = useCallback(
    async (action: CanonicalAction, source: InteractSource | 'button' | 'palette') => {
      if (mode === 'shared') setHelper(COPY.controls.helperBusy);
      const outcome = await interact(action);
      if (!outcome) return;
      const { event, snapshot: next } = outcome;
      if (!event) return;
      if (event.result === 'palette') {
        setHelper(COPY.controls.helperPalette);
        notice(`${COPY.toasts.palette} · ${getPalette(next.world.palette).name}`);
        return;
      }
      if (source !== 'click' && source !== 'key') {
        const point = burstPointFor(event, next.world);
        if (point) setBurst({ point, key: Date.now() });
      }
      if (event.result === 'transform') {
        setHelper(COPY.controls.helperTransformed);
        notice(COPY.toasts.transform);
      } else {
        setHelper(COPY.controls.helperBorn);
        notice(
          source === 'button'
            ? COPY.toasts.mutate
            : source === 'key'
              ? COPY.toasts.key
              : COPY.toasts.click,
        );
      }
    },
    [interact, mode, notice],
  );

  const onInteract = useCallback(
    (point: Point, source: InteractSource) => {
      void commit({ kind: 'click', point }, source);
    },
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

  const onDna = useCallback(() => {
    setHelpOpen(false);
    const card = document.getElementById('dnaCard');
    if (card && !reducedMotion) {
      card.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-6px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 400 },
      );
    }
    notice(mode === 'local' ? COPY.toasts.dna : COPY.toasts.dnaShared);
  }, [notice, mode, reducedMotion]);

  const modeLabel = useMemo(() => {
    if (status === 'loading') return COPY.modeConnecting;
    return mode === 'local' ? COPY.modeLocal : COPY.modeShared;
  }, [mode, status]);

  const world = snapshot?.world ?? null;
  const seedTiny = world ? `#${String(world.seed).slice(-4).padStart(4, '0')}` : '#····';

  return (
    <main className="app" id="app" data-mode={mode}>
      <div className="scene" aria-hidden="true" />
      {world && (
        <PixelWorld
          world={world}
          reducedMotion={reducedMotion}
          onInteract={onInteract}
          onOutsideClick={onOutsideClick}
          onPointerActivity={markActivity}
          burst={burst}
          ariaLabel={COPY.canvasLabel}
        />
      )}
      <div className="fogbank" aria-hidden="true" />
      <span className="pixelspark s1" aria-hidden="true">
        ✦
      </span>
      <span className="pixelspark s2" aria-hidden="true">
        ✧
      </span>
      <span className="pixelspark s3" aria-hidden="true">
        ✦
      </span>
      <span className="pixelspark s4" aria-hidden="true">
        ✧
      </span>
      <span className="pixelspark s5" aria-hidden="true">
        ✧
      </span>

      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            ♧
          </span>
          GLITCH<span className="brand-dot">.</span>GARDEN
          <span className="mode-chip" data-testid="mode-chip">
            {modeLabel}
          </span>
        </div>
        <nav className="mainnav" aria-label="Sections">
          <button
            className={helpOpen ? undefined : 'active'}
            type="button"
            id="navWorld"
            onClick={() => setHelpOpen(false)}
          >
            {COPY.nav.world}
          </button>
          <button type="button" id="navDNA" onClick={onDna}>
            {COPY.nav.dna}
          </button>
          <button
            className={helpOpen ? 'active' : undefined}
            type="button"
            id="navHelp"
            onClick={() => setHelpOpen((open) => !open)}
          >
            {COPY.nav.help}
          </button>
        </nav>
        <button
          className="seed-btn"
          id="copySeed"
          type="button"
          onClick={onCopySeed}
          disabled={!world}
        >
          <span aria-hidden="true">♧</span> {COPY.copySeed} <span id="seedTiny">{seedTiny}</span>
        </button>
      </header>

      <section className="intro" aria-label="About the experiment">
        <div className="topline">{COPY.heroTop}</div>
        <h1>
          {COPY.heroTitle[0]}
          <br />
          {COPY.heroTitle[1]}
          <br />
          <em>{COPY.heroTitle[2]}</em>
        </h1>
        <p>
          {COPY.heroBody.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
        <div className="introspark" aria-hidden="true">
          ✦ — ♡ — ✧
        </div>
      </section>

      <div className="floating-note">
        <div className="note-mascot" aria-hidden="true">
          👼
        </div>
        <div>
          <strong>{COPY.noteTitle}</strong>
          <small>{mode === 'local' ? COPY.noteBodyLocal : COPY.noteBodyShared}</small>
        </div>
      </div>

      <aside className="right-ui" id="rightUI" aria-label="Live world data">
        {world && snapshot && (
          <>
            <WorldStats world={world} visits={snapshot.visits} mode={mode} />
            <EvolutionLog events={snapshot.events} world={world} now={clock} />
          </>
        )}
      </aside>

      {world && (
        <WorldControls
          helper={helper}
          pending={pending}
          paletteName={getPalette(world.palette).name}
          canReset={Boolean(repository.reset)}
          onMutate={onMutate}
          onPalette={onPalette}
          onReset={onReset}
          onHelp={() => setHelpOpen((open) => !open)}
        />
      )}

      <HelpPopover open={helpOpen} mode={mode} onClose={() => setHelpOpen(false)} />
      <StatusToast message={toast} />
      <div className="leafpix left" aria-hidden="true">
        ❀
      </div>
      <div className="leafpix right" aria-hidden="true">
        ✿
      </div>
      <footer className="bottom-credit" data-testid="footer-mode">
        {status === 'error'
          ? COPY.sharedUnavailable
          : mode === 'local'
            ? COPY.footerLocal
            : COPY.footerShared}
      </footer>
    </main>
  );
}
