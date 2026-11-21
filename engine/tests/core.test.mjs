import test from 'node:test';
import assert from 'node:assert/strict';
import { go, blend, blink, flat, hasJump, EASE } from '../src/core.js';
import { REST, EMO } from '../src/pose.js';

test('blend keeps keys the target does not name', () => {
  const v = blend({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 4 } }, 1);
  assert.deepEqual(v, { a: 1, b: { c: 4, d: 3 } });
});

test('go holds the base before the first key and reaches the target after it', () => {
  const keys = [[1, { x: 10 }, { dur: 0.5 }]];
  assert.equal(go({ x: 0 }, 0.9, keys).x, 0);
  assert.equal(go({ x: 0 }, 2, keys).x, 10);
});

test('every ease starts at 0 and ends at 1', () => {
  for (const [name, f] of Object.entries(EASE)) {
    assert.ok(Math.abs(f(0)) < 1e-9, name);
    assert.ok(Math.abs(f(1) - 1) < 1e-9, name);
  }
});

test('overlapping moves stay continuous', () => {
  const keys = [[0.5, EMO.shock, { dur: 0.4 }], [0.7, EMO.sad, { dur: 0.6 }], [1.0, EMO.happy, { dur: 0.3, ease: 'spring' }]];
  assert.equal(hasJump(t => go(REST, t, keys), 0, 3), null);
});

test('hasJump catches a real jump', () => {
  const jumpy = t => ({ x: t < 1 ? 0 : 5 });
  assert.equal(hasJump(jumpy, 0, 2).key, 'x');
});

test('blink is smooth, closes fully and is open most of the time', () => {
  let min = 1, open = 0, worst = 0, prev = blink(0, 3);
  for (let n = 1; n < 30 * 30; n++) {
    const v = blink(n / 30, 3);
    worst = Math.max(worst, Math.abs(v - prev)); prev = v;
    min = Math.min(min, v); if (v > 0.99) open++;
  }
  assert.ok(min < 0.15, `never closes: ${min}`);
  assert.ok(open / 900 > 0.9, 'eyes closed too often');
  assert.ok(worst < 0.75, `blink jumps ${worst}`);
});

test('every emotion only uses keys that exist in REST', () => {
  const known = new Set(Object.keys(flat(REST)));
  for (const [name, p] of Object.entries(EMO)) for (const k of Object.keys(flat(p))) assert.ok(known.has(k), `${name}.${k}`);
});
