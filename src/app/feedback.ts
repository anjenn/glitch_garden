// Pure helpers that turn engine outcomes into user-facing feedback.
import type { Point, WorldEvent, WorldState } from '../game/types.ts';
import type { RepositoryError } from '../store/repository.ts';
import { COPY } from './copy.ts';

export type InteractionSource = 'click' | 'key' | 'button' | 'palette';

/** Where to burst for a committed event: the entity it touched, if any. */
export function burstPointFor(event: WorldEvent | null, world: WorldState): Point | null {
  if (!event?.entityId) return null;
  const entity = world.entities.find((e) => e.id === event.entityId);
  return entity ? { x: entity.x, y: entity.y } : null;
}

export function toastForError(error: RepositoryError): string {
  switch (error.code) {
    case 'RATE_LIMITED':
      return COPY.toasts.rateLimited;
    case 'REVISION_CONFLICT':
      return COPY.toasts.conflict;
    case 'NETWORK':
      return COPY.toasts.offline;
    default:
      return COPY.toasts.error;
  }
}

export function toastForSpawn(source: InteractionSource): string {
  switch (source) {
    case 'button':
      return COPY.toasts.mutate;
    case 'key':
      return COPY.toasts.key;
    default:
      return COPY.toasts.click;
  }
}

export function modeLabel(mode: 'local' | 'shared', loading: boolean): string {
  if (loading) return COPY.modeConnecting;
  return mode === 'local' ? COPY.modeLocal : COPY.modeShared;
}

export function footerLabel(mode: 'local' | 'shared', failed: boolean): string {
  if (failed) return COPY.sharedUnavailable;
  return mode === 'local' ? COPY.footerLocal : COPY.footerShared;
}

export function seedTag(seed: number | undefined): string {
  return seed === undefined ? '#····' : `#${String(seed).slice(-4).padStart(4, '0')}`;
}
