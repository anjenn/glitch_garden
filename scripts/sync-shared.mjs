// Copies the pure engine modules into supabase/functions/_shared so the Edge
// Functions bundle the exact same reducer the browser runs. Run before deploy:
//   node scripts/sync-shared.mjs
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const from = join(process.cwd(), 'src', 'game');
const to = join(process.cwd(), 'supabase', 'functions', '_shared', 'game');
mkdirSync(to, { recursive: true });
for (const file of readdirSync(from)) {
  if (!file.endsWith('.ts')) continue;
  copyFileSync(join(from, file), join(to, file));
}
console.log(`synced src/game → supabase/functions/_shared/game`);
