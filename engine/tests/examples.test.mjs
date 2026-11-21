// Every example must lint clean, and every ready-made hero spec must pass checkSpec.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerHooks({ resolve: (s, c, n) => (s.startsWith('/engine/') ? { url: pathToFileURL(path.join(ENGINE, s.slice(8))).href, shortCircuit: true } : n(s, c)) });
const api = await import(pathToFileURL(path.join(ENGINE, 'src/index.js')).href);

test('every ready-made hero passes checkSpec', () => {
  const heroes = Object.values(api).filter(v => v && typeof v === 'object' && typeof v.name === 'string' && ('fur' in v || 'skin' in v || 'kind' in v));
  assert.ok(heroes.length >= 14, `only ${heroes.length} heroes exported`);
  for (const h of heroes) assert.deepEqual(api.checkSpec(h), [], h.name);
});

test('checkSpec rejects unknown options', () => {
  assert.equal(api.checkSpec({ name: 'x', kind: 'robot' }).length, 1);
  assert.equal(api.checkSpec({ name: 'x', kind: 'human', hair: { style: 'mohawk' } }).length, 1);
});

const examples = path.join(ENGINE, '..', 'examples');
for (const dir of fs.readdirSync(examples)) {
  const file = path.join(examples, dir, 'shots.js');
  if (!fs.existsSync(file)) continue;
  test(`example ${dir} lints clean`, async () => {
    assert.deepEqual(api.checkProject(await import(pathToFileURL(file).href)), []);
  });
}

test('checkProject catches a pose jump, a gap and a long caption', () => {
  const bad = api.checkProject({
    DURATION: 3,
    SHOTS: [
      { start: 0, end: 1, set: 'room', actors: [{ hero: api.OFFICE, at: [540, 1240], pose: lt => ({ x: lt < 0.5 ? 0 : 300 }) }] },
      { start: 1.2, end: 3, set: 'room' },
    ],
    CAPTIONS: [[0, 1, 'one two three four']],
  });
  const text = bad.join('\n');
  assert.match(text, /jumps on "x"/);
  assert.match(text, /gap or overlap/);
  assert.match(text, /more than 3 words/);
});
