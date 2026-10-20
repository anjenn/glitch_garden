import { COPY, ENTITY_ICONS, ENTITY_LABELS } from '../app/copy.ts';
import { getPalette } from '../game/palettes.ts';
import { ENTITY_TYPES, type EntityType, type WorldState } from '../game/types.ts';

/** Live census of the 8 archetypes, tinted with the current palette. */
export function FieldGuide({ world }: { world: WorldState }) {
  const counts = new Map<EntityType, number>();
  for (const entity of world.entities) counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1);
  const colors = getPalette(world.palette).characters;
  return (
    <div className="glass-panel guide">
      <div className="panel-title">
        <span>✿ {COPY.guide.title}</span>
        <span>{String(world.entities.length).padStart(3, '0')}</span>
      </div>
      <ul className="guide-grid">
        {ENTITY_TYPES.map((type) => {
          const count = counts.get(type) ?? 0;
          return (
            <li key={type} className={count > 0 ? 'guide-cell present' : 'guide-cell'}>
              <span
                className="guide-swatch"
                aria-hidden="true"
                style={{ background: colors[type][0] }}
              >
                {ENTITY_ICONS[type]}
              </span>
              <span className="guide-name">{ENTITY_LABELS[type]}</span>
              <b className="guide-count">{String(count).padStart(2, '0')}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
