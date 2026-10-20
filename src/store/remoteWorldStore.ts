// Placeholder until the shared adapter lands (Track B). Throwing here makes
// createRepository() fall back to the clearly-labeled local demo.
import type { WorldRepository } from './repository.ts';

export interface RemoteConfig {
  url: string;
  anonKey: string;
  worldId: string;
}

export async function createRemoteRepository(config: RemoteConfig): Promise<WorldRepository> {
  if (!config.url || !config.anonKey) throw new Error('shared mode is not configured');
  throw new Error('shared mode is not implemented yet');
}
