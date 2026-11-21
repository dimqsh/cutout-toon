// Pure maths: easing, pose blending and idle motion. No DOM, so it runs in node tests too.
// Everything is a pure function of time: the same t always gives the same frame.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;

export const EASE = {
  linear: u => u,
  inout: u => u * u * (3 - 2 * u),
  in: u => u * u * u,
  out: u => 1 - (1 - u) ** 3,
  // overshoots a little, then settles: the default "cartoon" move
  back: u => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2,
  // winds up the other way first, then overshoots: for a jump, a throw, a point
  antic: u => (u < 0.5 ? ((2 * u) ** 2 * (3.6 * 2 * u - 2.6)) / 2 : ((2 * u - 2) ** 2 * (3.6 * (2 * u - 2) + 2.6) + 2) / 2),
  // starts from rest, overshoots, two soft bounces
  spring: u => (u >= 1 ? 1 : 1 - Math.exp(-6 * u) * (Math.cos(8 * u) + 0.75 * Math.sin(8 * u))),
};

// Blend b into a by u. b may be partial: keys it does not name keep a's value.
export function blend(a, b, u) {
  if (typeof b === 'number') return typeof a === 'number' ? lerp(a, b, u) : b;
  if (b === null || typeof b !== 'object') return u < 0.5 && a !== undefined ? a : b;
  const out = Array.isArray(a) ? a.slice() : { ...(a || {}) };
  for (const k of Object.keys(b)) out[k] = blend(a ? a[k] : undefined, b[k], u);
  return out;
}

// go(base, t, keys): the value at time t.
// Each key is [time, target, {dur = 0.4, ease = 'back'}]: "at this time, start moving to the target".
// Targets may be partial. Overlapping moves stay continuous, because each one blends from
// whatever the value is at that moment.
export function go(base, t, keys) {
  let v = base;
  for (const [at, target, opt = {}] of keys) {
    if (t <= at) break;
    const dur = opt.dur ?? 0.4;
    const u = EASE[opt.ease || 'back'](clamp((t - at) / dur));
    v = blend(v, target, u);
  }
  return v;
}

export const hash = (n, seed) => {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Eyelid openness 0..1. One blink per 3 s cell at a seeded offset; smooth close and open.
export function blink(t, seed = 1) {
  const cell = Math.floor(t / 3);
  const at = cell * 3 + 0.4 + hash(cell, seed) * 2.2;
  const u = (t - at) / 0.18;
  return u <= 0 || u >= 1 ? 1 : 1 - Math.sin(Math.PI * u) ** 2;
}

export const breath = (t, seed = 1) => Math.sin((t * 2 * Math.PI) / 3.4 + seed * 1.7);
export const sway = (t, seed = 1) => Math.sin((t * 2 * Math.PI) / 5.3 + seed * 2.9);

// Seeded random list, for sets: the same seed always gives the same scatter.
export function scatter(n, seed) {
  return Array.from({ length: n }, (_, i) => [hash(i + 1, seed), hash(i + 1, seed + 7.3), hash(i + 1, seed + 19.1)]);
}

// Flatten a pose to {path: number}, for the continuity test.
export function flat(o, p = '', out = {}) {
  if (typeof o === 'number') out[p] = o;
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) flat(o[k], p ? `${p}.${k}` : k, out);
  return out;
}

// Largest change between neighbouring samples of fn over [from, to] at the given rate.
// A continuous move shrinks about tenfold when sampled ten times finer; a jump does not.
export function maxStep(fn, from, to, fps) {
  let prev = flat(fn(from)), worst = 0, key = '';
  for (let n = 1; from + n / fps <= to; n++) {
    const cur = flat(fn(from + n / fps));
    for (const k of Object.keys(cur)) {
      const d = Math.abs(cur[k] - (prev[k] ?? cur[k]));
      if (d > worst) { worst = d; key = k; }
    }
    prev = cur;
  }
  return { worst, key };
}
export function hasJump(fn, from, to) {
  const coarse = maxStep(fn, from, to, 30), fine = maxStep(fn, from, to, 300);
  return fine.worst > 1e-6 && fine.worst > coarse.worst * 0.35 ? fine : null;
}
