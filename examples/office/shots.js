// People-only demo of the look and the motion: a walk-in with follow-through, a talking close-up,
// a jump with a camera hit, and a night shot. Render:  node engine/render.mjs examples/office video
import { go, mix, EMO, GROUND, headOf, drawProp, ui, say, walk, jump, wave, shake, closeUp, add,
  OFFICE, GIRL, WORKER, SCIENTIST, KING } from '/engine/src/index.js';

const G = GROUND + 6;
const girl = { hero: GIRL, at: [800, G], size: 620, seed: 5, flip: true };
const worker = { hero: WORKER, at: [330, G], size: 640, seed: 2 };

export const DURATION = 12.5;
export const SHOTS = [
  // 1. He walks in, she greets him.
  { start: 0, end: 3.4, set: 'room', cam: lt => go({ x: 600, zoom: 1.04 }, lt, [[0.3, { x: 540, zoom: 1.12 }, { dur: 3, ease: 'inout' }]]),
    actors: [
      { hero: OFFICE, at: [-260, G], size: 620, seed: 4,
        pose: lt => walk(go(mix(EMO.calm, { head: { turn: 0.55 } }), lt, [[1.75, EMO.happy, { dur: 0.35 }], [2.5, { armL: { a: 0.2, bend: 0.25 }, armR: { a: 0.3, bend: 0.3 } }, { dur: 0.3 }]]), lt, 0.1, 1.7, 540) },
      { ...girl, pose: lt => wave(say(go(mix(EMO.smug, { head: { turn: 0.5 } }), lt, [[0.9, { ...EMO.happy, armL: { a: 0.3, bend: 0.2 }, armR: { a: 0.3, bend: 0.2 }, head: { turn: 0.6, tilt: -0.08 } }, { dur: 0.4, ease: 'antic' }],
        [2.6, { head: { tilt: 0.05 } }, { dur: 0.45 }]]), lt, [[1.9, 3.1]], 5), lt, 0.9, 2.3) },
    ] },
  // 2. Close on her: a thought, then a grin.
  { start: 3.4, end: 6, set: 'room', cam: lt => go(closeUp(headOf(girl), 2.0), lt, [[0.1, closeUp(headOf(girl), 2.25), { dur: 2.4, ease: 'inout' }]]),
    actors: [{ ...girl, pose: lt => say(go(mix(EMO.calm, { head: { turn: 0.5 } }), lt, [[0.5, { ...EMO.smug, head: { turn: -0.5, tilt: 0.1 }, eyes: { lx: -0.6 } }, { dur: 0.45 }],
      [1.5, { ...EMO.happy, armL: { a: 0.2 }, armR: { a: 0.2 }, head: { turn: 0.2, tilt: -0.06 } }, { dur: 0.35, ease: 'antic' }]]), lt, [[1.7, 2.5]], 3) }] },
  // 3. The city: he jumps, the camera feels it.
  { start: 6, end: 9.4, set: 'city', tr: 'wipe', cam: lt => add({ x: 540, y: 930, zoom: 1.1 }, shake(lt, 1.52, 34)),
    actors: [
      { ...worker, pose: lt => jump(go(mix(EMO.calm, { head: { turn: 0.5 } }), lt, [[0.5, EMO.happy, { dur: 0.3 }], [1.6, { ...EMO.shock, head: { turn: 0.3 } }, { dur: 0.25 }], [2.4, { ...EMO.happy, head: { turn: 0.6 } }, { dur: 0.4 }]]), lt, 0.9, 260) },
      { hero: SCIENTIST, at: [790, G], size: 600, seed: 7, flip: true,
        pose: lt => go(mix(EMO.bored, { head: { turn: 0.5 } }), lt, [[1.0, { ...EMO.shock, head: { turn: 0.6, tilt: -0.1 }, eyes: { ly: -0.6 } }, { dur: 0.25 }], [1.55, { squash: 0.12 }, { dur: 0.08 }], [1.63, { squash: 0 }, { dur: 0.5, ease: 'spring' }], [1.9, EMO.angry, { dur: 0.3 }]]) },
    ],
    under(ctx, lt, t) { drawProp(ctx, 'sign', 570, G - 30, 250, { text: 'WORK', ground: true }, t); } },
  // 4. Night: the king runs in, the crown trails behind.
  { start: 9.4, end: 12.5, set: 'night', tr: 'wipe', cam: lt => go({ x: 500, zoom: 1.06 }, lt, [[0.2, { x: 580, zoom: 1.16 }, { dur: 2.8, ease: 'inout' }]]),
    actors: [{ hero: KING, at: [-240, G], size: 680, seed: 6,
      pose: lt => walk(go(mix(EMO.angry, { head: { turn: 0.6 } }), lt, [[1.25, { ...EMO.shock, head: { turn: 0.1 } }, { dur: 0.25 }], [2.1, { ...EMO.sleepy, head: { turn: -0.2 } }, { dur: 0.6 }]]), lt, 0.1, 1.3, 800, 7) }] },
];
export const CAPTIONS = [[0.2, 1.6, 'it walks'], [1.9, 3.1, 'it talks'], [3.6, 5.8, 'it thinks'], [6.3, 7.6, 'it jumps'], [7.6, 9.2, 'it lands'], [9.7, 11, 'any light'], [11, 12.4, 'any hero']];
