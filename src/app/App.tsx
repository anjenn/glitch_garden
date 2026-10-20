import { useCallback, useEffect, useState } from 'react';
import { EvolutionLog } from '../components/EvolutionLog.tsx';
import { HelpPopover } from '../components/HelpPopover.tsx';
import { PixelWorld } from '../components/PixelWorld.tsx';
import { SceneDecor } from '../components/SceneDecor.tsx';
import { SiteHeader } from '../components/SiteHeader.tsx';
import { StatusToast } from '../components/StatusToast.tsx';
import { WorldControls } from '../components/WorldControls.tsx';
import { WorldStats } from '../components/WorldStats.tsx';
import { getPalette } from '../game/palettes.ts';
import type { WorldRepository } from '../store/repository.ts';
import { useWorld } from '../store/useWorld.ts';
import { COPY } from './copy.ts';
import { footerLabel, modeLabel, seedTag } from './feedback.ts';
import { useClock } from './hooks/useClock.ts';
import { useReducedMotion } from './hooks/useReducedMotion.ts';
import { useToast } from './hooks/useToast.ts';
import { useGardenActions } from './useGardenActions.ts';
import './App.css';

export interface AppProps {
  repository: WorldRepository;
  /** Set when shared mode was requested but could not be reached. */
  fallbackNotice?: string | undefined;
}

export function App({ repository, fallbackNotice }: AppProps) {
  const mode = repository.mode;
  const worldState = useWorld(repository);
  const { snapshot, status, pending, markActivity } = worldState;
  const reducedMotion = useReducedMotion();
  const clock = useClock();
  const { toast, notice } = useToast();
  const actions = useGardenActions(worldState, mode, notice);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (fallbackNotice) notice(fallbackNotice);
  }, [fallbackNotice, notice]);

  const toggleHelp = useCallback(() => setHelpOpen((open) => !open), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

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

  const world = snapshot?.world ?? null;

  return (
    <main className="app" id="app" data-mode={mode}>
      <div className="scene" aria-hidden="true" />
      {world && (
        <PixelWorld
          world={world}
          reducedMotion={reducedMotion}
          onInteract={actions.onInteract}
          onOutsideClick={actions.onOutsideClick}
          onPointerActivity={markActivity}
          burst={actions.burst}
          ariaLabel={COPY.canvasLabel}
        />
      )}
      <SceneDecor />
      <SiteHeader
        modeLabel={modeLabel(mode, status === 'loading')}
        seedTag={seedTag(world?.seed)}
        helpOpen={helpOpen}
        canCopy={world !== null}
        onWorld={closeHelp}
        onDna={onDna}
        onHelp={toggleHelp}
        onCopySeed={() => void actions.onCopySeed()}
        paletteName={world ? getPalette(world.palette).name : null}
        pending={pending}
        onPalette={actions.onPalette}
      />
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
          helper={actions.helper}
          pending={pending}
          paletteName={getPalette(world.palette).name}
          canReset={Boolean(repository.reset)}
          onMutate={actions.onMutate}
          onPalette={actions.onPalette}
          onReset={actions.onReset}
          onHelp={toggleHelp}
        />
      )}
      <HelpPopover open={helpOpen} mode={mode} onClose={closeHelp} />
      <StatusToast message={toast} />
      <footer className="bottom-credit" data-testid="footer-mode">
        {footerLabel(mode, status === 'error')}
      </footer>
    </main>
  );
}
