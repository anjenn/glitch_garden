import type { CanonicalAction, RuntimeMode, WorldEvent, WorldState } from '../game/types.ts';

export interface WorldSnapshot {
  world: WorldState;
  /** Most recent events, newest first, at most MAX_VISIBLE_EVENTS. */
  events: WorldEvent[];
  /** Local-only: how many times this browser opened the garden. */
  visits: number;
  /** False when storage is unavailable and the world lives in memory only. */
  persistent: boolean;
}

export type RepositoryErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'REVISION_CONFLICT'
  | 'RATE_LIMITED'
  | 'WORLD_UNAVAILABLE'
  | 'NETWORK';

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Both the local and the shared adapter speak this contract (spec 07) so the
 * UI never knows where the canonical world lives.
 */
export interface WorldRepository {
  readonly mode: RuntimeMode;
  /** True when this client is allowed to drive autonomous growth itself. */
  readonly ownsIdleGrowth: boolean;
  load(): Promise<WorldSnapshot>;
  interact(action: CanonicalAction): Promise<WorldSnapshot>;
  subscribe(listener: (next: WorldSnapshot) => void): () => void;
  /** Local only; shared worlds are reset by their owner, never from the browser. */
  reset?(): Promise<WorldSnapshot>;
  dispose?(): void;
}
