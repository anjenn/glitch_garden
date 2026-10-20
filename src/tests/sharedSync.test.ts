import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Edge Functions bundle a copy of src/game. This guards against the copy
// drifting from the engine the browser runs (run `npm run sync:functions`).
describe('supabase/functions/_shared/game mirrors src/game', () => {
  const source = join(process.cwd(), 'src', 'game');
  const mirror = join(process.cwd(), 'supabase', 'functions', '_shared', 'game');
  const files = readdirSync(source).filter((f) => f.endsWith('.ts'));

  it.each(files)('%s is identical', (file) => {
    expect(readFileSync(join(mirror, file), 'utf8')).toBe(readFileSync(join(source, file), 'utf8'));
  });
});
