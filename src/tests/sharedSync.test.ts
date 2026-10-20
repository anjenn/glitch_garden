import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Edge Functions bundle a copy of src/game. This guards against the copy
// drifting from the engine the browser runs (run `npm run sync:functions`).
describe('supabase/functions/_shared/game mirrors src/game', () => {
  const source = join(process.cwd(), 'src', 'game');
  const mirror = join(process.cwd(), 'supabase', 'functions', '_shared', 'game');
  const files = readdirSync(source, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => relative(source, join(entry.parentPath, entry.name)));

  it('finds the engine modules', () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it.each(files)('%s is identical', (file) => {
    expect(readFileSync(join(mirror, file), 'utf8')).toBe(readFileSync(join(source, file), 'utf8'));
  });
});
