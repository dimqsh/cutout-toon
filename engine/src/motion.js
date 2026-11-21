// What keeps a shot from ever being frozen, with no keys written for it:
//   alive()   eye darts, weight shifts, a wandering head, loose arms
//   follow()  follow-through: hair, ears, tail and hat trail the head and swing past it when it stops;
//             the body leans into a move, arms drag behind it, the head trails the body
//   drift()   a hand-held camera
// plus helpers for the shot list: say(), shake(), closeUp().
// Everything is still a pure function of time: follow() reads the pose a few moments earlier
// instead of keeping state, so any frame can be rendered alone.
import { clamp, lerp, hash, EASE } from './core.js';

// Add the numbers in `d` to the matching numbers in `p`.
export function add(p, d) {
  if (typeof d === 'number') return (p || 0) + d;
  const out = { ...p };
  for (const k of Object.keys(d)) out[k] = add(p ? p[k] : undefined, d[k]);
  return out;
}

// Smooth wander in -1..1; the two rates never line up, so it does not look like a loop.
const wander = (t, s) => Math.sin(t * 0.83 + s * 5.1) * 0.6 + Math.sin(t * 1.93 + s * 2.3) * 0.4;

export function alive(t, seed = 1, k = 1) {
  // a new point to look at every 1.7 s, reached in 80 ms like a real eye
  const u = t / 1.7 + seed * 0.37, cell = Math.floor(u), e = EASE.inout(clamp(((u - cell) * 1.7) / 0.08));
  const look = (n, s) => hash(n, s) - 0.5;
  const lx = lerp(look(cell - 1, seed), look(cell, seed), e), ly = lerp(look(cell - 1, seed + 9), look(cell, seed + 9), e);
  const w1 = wander(t, seed), w2 = wander(t * 0.7 + 11, seed + 3), w3 = wander(t * 1.3 + 5, seed + 7);
  return {
    rot: w2 * 0.014 * k,
    head: { tilt: w1 * 0.035 * k, dx: w2 * 0.9 * k, turn: w3 * 0.07 * k },
    armL: { a: w3 * 0.05 * k, bend: w1 * 0.06 * k }, armR: { a: -w1 * 0.05 * k, bend: w2 * 0.06 * k },
    eyes: { lx: lx * 0.5 * k, ly: ly * 0.3 * k }, brows: { h: w3 * 0.08 * k },
  };
}

const D = 0.085;      // seconds between the taps
// Drag while moving, one swing past the rest position after the stop, a small swing back.
const taps = P => f => { const [a, b, c, d] = P.map(f); return 1.6 * (b - a) - 0.6 * (c - b) + 0.25 * (d - c); };

// poseAt(localTime) -> full pose; sc: pixels per hero unit; flip: the actor is mirrored.
// Returns {pose: additive pose, swing, lift} in the hero's own (unmirrored) frame.
export function follow(poseAt, lt, sc, flip = false) {
  const lag = taps([0, 1, 2, 3].map(i => poseAt(Math.max(0, lt - i * D)))), dir = flip ? -1 : 1;   // never before the shot starts
  const bx = lag(p => p.x / sc) * dir, byy = lag(p => p.y / sc), rot = lag(p => p.rot);
  const hx = bx + lag(p => p.head.dx), hy = byy + lag(p => p.head.dy), ha = rot + lag(p => p.head.tilt);
  return {
    swing: clamp(ha * 1.5 + hx * 0.04, -0.55, 0.55),
    lift: clamp(hy * 0.1, -1, 1),
    pose: {
      rot: clamp(-bx * 0.006, -0.14, 0.14),
      squash: -clamp(Math.abs(byy) * 0.005, 0, 0.1),
      head: { tilt: clamp(rot * 0.7 + bx * 0.004, -0.16, 0.16), dy: clamp(byy * 0.25, -3, 3) },
      armL: { a: clamp(-bx * 0.014 - byy * 0.03, -0.5, 0.7) }, armR: { a: clamp(bx * 0.014 - byy * 0.03, -0.5, 0.7) },
      legL: clamp(bx * 0.006, -0.3, 0.3), legR: clamp(bx * 0.006, -0.3, 0.3),
    },
  };
}

// Hand-held camera: a few pixels of slow wander and a breath of zoom.
export function drift(t, seed = 1) {
  return { x: wander(t * 0.6, seed) * 7, y: wander(t * 0.5 + 3, seed + 4) * 6, zoom: wander(t * 0.4 + 8, seed + 2) * 0.006 };
}

// A hit: add the result to the camera. `at` is the moment of impact in shot time.
export function shake(lt, at, amp = 26, dur = 0.45) {
  const u = (lt - at) / dur;
  if (u <= 0 || u >= 1) return { x: 0, y: 0 };
  const k = amp * (1 - u) ** 2 * Math.sin((Math.PI / 2) * Math.min(1, u * 10));   // ramps in over the first frames: no pop
  return { x: Math.sin(u * 27) * k, y: Math.sin(u * 23 + 1) * k * 0.8 };
}

// Lip flap and head bob while a character speaks. spans: [[from, to], ...] in shot time.
export function say(pose, lt, spans, seed = 1) {
  let env = 0;
  for (const [a, b] of spans) env = Math.max(env, EASE.inout(clamp((lt - a) / 0.09)) * EASE.inout(clamp((b - lt) / 0.12)));
  if (env <= 0) return pose;
  const syll = 0.5 + 0.5 * Math.sin(lt * 21 + seed), word = 0.5 + 0.5 * Math.sin(lt * 6.3 + seed * 2);
  return add(pose, {
    mouth: { open: env * (0.16 + 0.5 * syll * (0.45 + 0.55 * word)) - (pose.mouth?.open || 0) * env * 0.5, w: env * (word - 0.5) * 0.3 },
    head: { dy: env * (syll - 0.5) * 1.3, tilt: env * (word - 0.5) * 0.05 }, brows: { h: env * word * 0.3 },
  });
}

// A walk from the actor's `at` to `at + dx` pixels between `from` and `to`: eased travel, a step cycle
// that fades in and out, a bob on every step and arms swinging against the legs.
// dz (3D stages only) walks in depth as well: + toward the camera.
export function walk(pose, lt, from, to, dx, steps, dz = 0) {
  steps = steps ?? Math.max(2, Math.round(Math.hypot(dx, dz) / 130));
  const u = clamp((lt - from) / (to - from)), e = EASE.inout(u), env = EASE.inout(clamp(Math.min(u, 1 - u) * 5)), ph = e * steps * Math.PI;
  const s = Math.sin(ph) * env;
  return add(pose, {
    x: dx * e, z: dz * e, y: -Math.abs(Math.sin(ph)) * 9 * env, legL: s * 0.55, legR: -s * 0.55,   // the lean comes from follow(), which knows about flip
    armL: { a: -s * 0.3 + 0.1 * env }, armR: { a: s * 0.3 + 0.1 * env }, head: { dy: Math.abs(Math.cos(ph)) * 1.2 * env },
  });
}

// A jump that takes off at `at`: crouch first, stretch in the air, squash and wobble on landing.
// Pair it with shake(lt, at + dur) on the camera for weight.
export function jump(pose, lt, at, height = 220, dur = 0.62) {
  const u = (lt - at) / dur, tau = lt - at - dur;
  const crouch = 0.2 * Math.sin(Math.PI * clamp((lt - (at - 0.26)) / 0.26)) ** 2;
  const air = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
  const land = tau <= 0 ? 0 : tau < 0.06 ? 0.26 * (tau / 0.06) : 0.26 * Math.exp(-7 * (tau - 0.06)) * Math.cos(16 * (tau - 0.06));
  // arms: back in the crouch, out to the sides in the air (straight up would hide them behind the head)
  const armTo = p => ({ a: lerp((p || {}).a ?? 0.12, 1.62, air) - crouch * 1.2, bend: lerp((p || {}).bend ?? 0.25, -0.3, air) });
  return add({ ...pose, armL: armTo(pose.armL), armR: armTo(pose.armR) }, {
    y: u > 0 && u < 1 ? -height * 4 * u * (1 - u) : 0, squash: crouch - 0.13 * air + land,
    legL: -air * 0.25, legR: air * 0.25,
  });
}

// A wave with one arm ('armL' or 'armR') between `from` and `to`: it lifts beside the head and swings.
export function wave(pose, lt, from, to, side = 'armR') {
  const env = EASE.back(clamp((lt - from) / 0.3)) * EASE.inout(clamp((to - lt) / 0.3));
  if (env <= 0) return pose;
  const cur = pose[side] || { a: 0.12, bend: 0.25 };
  return { ...pose, [side]: { a: lerp(cur.a, 2.2 + Math.sin((lt - from) * 13) * 0.24, env), bend: lerp(cur.bend, -0.55, env) } };
}

// Camera on an actor's face with room for the caption under the chin.
export function closeUp(head, zoom = 2.3) { return { x: head[0], y: head[1] + 250 / zoom, zoom }; }
