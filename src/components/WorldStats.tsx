import { COPY } from '../app/copy.ts';
import type { RuntimeMode, WorldState } from '../game/types.ts';

export interface WorldStatsProps {
  world: WorldState;
  visits: number;
  mode: RuntimeMode;
}

export function pad(value: number, length = 3): string {
  return String(Math.max(0, Math.floor(value))).padStart(length, '0');
}

function Meter({ value, label, mint }: { value: number; label: string; mint?: boolean }) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * 12);
  return (
    <div
      className={mint ? 'meter mint' : 'meter'}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} className={i < filled ? 'filled' : undefined} />
      ))}
    </div>
  );
}

export function WorldStats({ world, visits, mode }: WorldStatsProps) {
  const generation = Math.floor(world.mutations / 7) + 1;
  return (
    <div className="glass-panel" id="dnaCard">
      <div className="panel-title">
        <span>
          <span className="title-icon" aria-hidden="true">
            ✿
          </span>{' '}
          {COPY.dnaTitle}
        </span>
        <span id="worldLabel">#{String(world.seed).padStart(3, '0').slice(-3)}</span>
      </div>
      <div className="panel-inner">
        <dl className="stat-list">
          <div className="stat-row">
            <dt>{COPY.stats.generation}</dt>
            <dd id="generation">{pad(generation, 4)}</dd>
          </div>
          <div className="stat-row">
            <dt>{COPY.stats.mutations}</dt>
            <dd id="mutations">{pad(world.mutations)}</dd>
          </div>
          <div className="stat-row">
            <dt>{COPY.stats.specimens}</dt>
            <dd id="living">{pad(world.entities.length)}</dd>
          </div>
          <div className="stat-row">
            <dt>{mode === 'local' ? COPY.stats.visits : COPY.stats.revision}</dt>
            <dd id="visits">{pad(mode === 'local' ? visits : world.revision)}</dd>
          </div>
        </dl>
        <div className="meter-head">
          <span>{COPY.stats.chaos}</span>
          <strong id="wonderText">{Math.round(world.chaos)}%</strong>
        </div>
        <Meter value={world.chaos} label={COPY.stats.chaos} />
        <div className="meter-head mint">
          <span>{COPY.stats.growth}</span>
          <strong id="growthText">{Math.round(world.growth)}%</strong>
        </div>
        <Meter value={world.growth} label={COPY.stats.growth} mint />
      </div>
    </div>
  );
}
