import { COPY, describeEvent, ENTITY_ICONS } from '../app/copy.ts';
import {
  MAX_VISIBLE_EVENTS,
  type EntityType,
  type WorldEvent,
  type WorldState,
} from '../game/types.ts';

export interface EvolutionLogProps {
  events: readonly WorldEvent[];
  world: WorldState;
  now: number;
}

export function relativeTime(createdAt: string, now: number): string {
  const seconds = (now - Date.parse(createdAt)) / 1000;
  if (!Number.isFinite(seconds) || seconds < 60) return 'NOW';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}M`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}H`;
  return 'OLD';
}

export function EvolutionLog({ events, world, now }: EvolutionLogProps) {
  const visible = events.slice(0, MAX_VISIBLE_EVENTS);
  const typeOf = (id: string | undefined): EntityType | undefined =>
    world.entities.find((entity) => entity.id === id)?.type;
  return (
    <div className="glass-panel journal">
      <div className="panel-title">
        <span>✧ {COPY.journalTitle}</span>
        <span>{COPY.journalLive}</span>
      </div>
      <ol className="entries" id="journal" aria-live="polite" aria-relevant="additions">
        {visible.length === 0 && <li className="entry entry-empty">{COPY.journalEmpty}</li>}
        {visible.map((event) => {
          const type = typeOf(event.entityId);
          const icon = event.result === 'palette' ? '✿' : type ? ENTITY_ICONS[type] : '✦';
          return (
            <li className="entry" key={event.eventId}>
              <span aria-hidden="true">{icon}</span>
              <span className="entry-text">{describeEvent(event.action, event.result, type)}</span>
              <time className="entry-time" dateTime={event.createdAt}>
                {relativeTime(event.createdAt, now)}
              </time>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
