// 2D + 3D demo: drawn heroes in a real 3D world. The camera cranes, orbits and dollies; a hero walks
// toward the lens. Render:  node engine/render.mjs examples/street3d video
import { go, mix, EMO, EASE, lerp, clamp, add, say, walk, jump, wave, shake, orbit, headAt,
  OFFICE, GIRL, WORKER, KING, CAT } from '/engine/src/index.js';

const ease = (lt, from, to) => EASE.inout(clamp((lt - from) / (to - from)));
const boss = { hero: OFFICE, at: [-0.95, 0], h: 1.7, seed: 4 };
const girl = { hero: GIRL, at: [0.95, 0.25], h: 1.6, seed: 5, flip: true };
const worker = { hero: WORKER, at: [0.4, -9], h: 1.8, seed: 2 };
const king = { hero: KING, at: [0, 0], h: 1.75, seed: 6 };
const cat = { hero: CAT, at: [1.5, 1.2], h: 1.05, seed: 3, flip: true };

export const DURATION = 15;
export const SHOTS = [
  // 1. Crane down from the roofs to two people on the crossing, swinging round them.
  { start: 0, end: 4.2, set: 'street',
    cam: lt => { const u = ease(lt, 0, 3.6); return orbit([0, lerp(2.4, 1.05, u), 0], lerp(16, 6.4, u), lerp(-9, 14, u), lerp(34, 4, u), 36); },
    actors: [
      { ...boss, pose: lt => say(go(mix(EMO.calm, { head: { turn: 0.5 } }), lt, [[2.2, EMO.happy, { dur: 0.35 }], [3.2, { armL: { a: 0.2, bend: 0.25 }, armR: { a: 0.2, bend: 0.25 } }, { dur: 0.4 }]]), lt, [[2.4, 3.6]], 4) },
      { ...girl, pose: lt => wave(go(mix(EMO.smug, { head: { turn: 0.5 } }), lt, [[1.6, { ...EMO.happy, armL: { a: 0.3, bend: 0.2 }, armR: { a: 0.3, bend: 0.2 }, head: { turn: 0.55, tilt: -0.08 } }, { dur: 0.4, ease: 'antic' }]]), lt, 1.6, 3.4) },
    ] },
  // 2. He comes up the street straight at the camera; the camera backs off and drops.
  { start: 4.2, end: 8, set: 'street',
    cam: lt => { const u = ease(lt, 0, 3.6); return { pos: [lerp(-1.6, 1.2, u), lerp(1.9, 1.0, u), lerp(4.2, 5.2, u)], look: [0.4, lerp(1.5, 1.35, u), lerp(-6, 0, u)], fov: lerp(30, 38, u) }; },
    actors: [{ ...worker, pose: lt => walk(go(mix(EMO.calm, { head: { turn: -0.2 } }), lt, [[2.6, { ...EMO.happy, head: { turn: 0.15 } }, { dur: 0.35 }]]), lt, 0.1, 2.9, 0, 12, 2800) }],
    props: [{ prop: 'sign', at: [-2.6, -1.5], h: 1.5, opts: { text: 'WORK' } }] },
  // 3. Sunset in the open: a full swing around the king, then he jumps.
  { start: 8, end: 11.8, set: 'meadow', tr: 'wipe',
    cam: lt => { const c = orbit([0, 1.1, 0], lerp(7.5, 5.6, ease(lt, 0, 3.4)), lerp(-70, 55, ease(lt, 0, 3.4)), 7, 34), k = shake(lt, 3.02, 0.12); return { ...c, pos: [c.pos[0] + k.x, c.pos[1] + k.y, c.pos[2]] }; },
    actors: [
      { ...king, pose: lt => jump(go(mix(EMO.bored, { head: { turn: 0.4 } }), lt, [[1.2, { ...EMO.smug, head: { turn: -0.4 } }, { dur: 0.5 }], [2.2, EMO.happy, { dur: 0.3 }], [3.1, EMO.shock, { dur: 0.2 }]]), lt, 2.4, 210) },
      { ...cat, pose: lt => go(mix(EMO.sleepy, { head: { turn: 0.5 } }), lt, [[2.5, { ...EMO.shock, head: { turn: 0.6 }, eyes: { ly: -0.5 } }, { dur: 0.25 }]]) },
    ] },
  // 4. Push in on a face: the same drawn hero holds up at any distance.
  { start: 11.8, end: 15, set: 'meadow',
    cam: lt => { const u = ease(lt, 0, 3); const [hx, hy, hz] = headAt(cat); return orbit([hx, hy - 0.16, hz], lerp(4.8, 2.7, u), lerp(-25, 12, u), lerp(8, 2, u), 30); },
    actors: [
      { ...cat, pose: lt => go(mix(EMO.shock, { head: { turn: 0.5 } }), lt, [[0.7, { ...EMO.smug, head: { turn: -0.3, tilt: 0.1 } }, { dur: 0.5 }], [2.1, { ...EMO.happy, head: { turn: 0.2 } }, { dur: 0.35, ease: 'antic' }]]) },
      { ...king, at: [-1.6, -1.2], pose: lt => go(mix(EMO.angry, { head: { turn: 0.6 } }), lt, [[1.4, EMO.bored, { dur: 0.6 }]]) },
    ] },
];
export const CAPTIONS = [[0.3, 2, 'real 3d world'], [2.2, 4, 'drawn heroes'], [4.5, 6.2, 'walks'], [6.2, 7.8, 'at you'], [8.3, 10.2, 'camera orbits'], [10.4, 11.6, 'it jumps'], [12.1, 13.4, 'push in'], [13.6, 14.8, 'any hero']];
