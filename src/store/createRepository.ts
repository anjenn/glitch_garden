import { COPY } from '../app/copy.ts';
import type { RuntimeMode } from '../game/types.ts';
import { LocalWorldRepository, safeLocalStorage } from './localWorldStore.ts';
import type { WorldRepository } from './repository.ts';

export interface RepositoryBootstrap {
  repository: WorldRepository;
  requestedMode: RuntimeMode;
  fallbackNotice?: string;
}

export function requestedMode(): RuntimeMode {
  return import.meta.env.VITE_APP_MODE === 'shared' ? 'shared' : 'local';
}

export function createLocalRepository(): LocalWorldRepository {
  return new LocalWorldRepository({ storage: safeLocalStorage() });
}

/**
 * Picks the adapter for the configured mode. Shared mode is loaded lazily so
 * the local demo never ships the Supabase client, and it falls back to the
 * local garden (clearly labeled) when the backend cannot be reached.
 */
export async function createRepository(): Promise<RepositoryBootstrap> {
  const mode = requestedMode();
  if (mode === 'local') {
    return { repository: createLocalRepository(), requestedMode: mode };
  }
  try {
    const { createRemoteRepository } = await import('./remoteWorldStore.ts');
    const remote = await createRemoteRepository({
      url: import.meta.env.VITE_SUPABASE_URL ?? '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      worldId: import.meta.env.VITE_WORLD_ID ?? '00000000-0000-4000-8000-000000000001',
    });
    return { repository: remote, requestedMode: mode };
  } catch (cause) {
    console.warn('[glitch.garden] shared mode unavailable, using local demo', cause);
    return {
      repository: createLocalRepository(),
      requestedMode: mode,
      fallbackNotice: COPY.sharedUnavailable,
    };
  }
}
