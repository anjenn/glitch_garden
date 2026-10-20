// Copies the pure engine modules (recursively) into supabase/functions/_shared
// so the Edge Functions bundle the exact same reducer the browser runs.
//   node scripts/sync-shared.mjs
import { cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const from = join(process.cwd(), 'src', 'game');
const to = join(process.cwd(), 'supabase', 'functions', '_shared', 'game');
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith('.test.ts') });
console.log('synced src/game → supabase/functions/_shared/game');
