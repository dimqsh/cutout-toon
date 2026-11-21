// Cast sheet: every kind of hero, every set, the props, a close-up and a diagram card.
// Render it after touching the rig:  node engine/render.mjs examples/cast sheet
import { go, mix, EMO, GROUND, headOf, closeUp, drawProp, propNames, ui,
  SLOTH, PANDA, CAT, OFFICE, EMPEROR, GIRL, SCIENTIST, WORKER, KING, ASTRONAUT, COIN, BRAIN, PHONE, JAR } from '/engine/src/index.js';

const G = GROUND + 6;
const emo = (e, turn = 0) => lt => go(mix({ head: { turn } }), lt, [[0.05, EMO[e], { dur: 0.35 }]]);
// pairs turn to each other: a flipped hero mirrors the same turn
const hero = (h, x, e, size = 520, seed = 3, flip = false) => ({ hero: h, at: [x, G], size, seed, flip, pose: emo(e, x === 540 ? 0 : 0.45) });
const office = { hero: OFFICE, at: [540, G], size: 640, seed: 4 };

export const DURATION = 11;
export const SHOTS = [
  { start: 0, end: 1, set: 'room', actors: [hero(OFFICE, 290, 'happy'), hero(GIRL, 790, 'smug', 520, 5, true)] },
  { start: 1, end: 2, set: 'dusk', actors: [hero(EMPEROR, 290, 'angry'), hero(KING, 790, 'bored', 520, 6, true)] },
  { start: 2, end: 3, set: 'city', actors: [hero(WORKER, 290, 'shock'), hero(SCIENTIST, 790, 'calm', 520, 7, true)] },
  { start: 3, end: 4, set: 'space', actors: [hero(ASTRONAUT, 540, 'happy', 660)] },
  { start: 4, end: 5, set: 'jungle', actors: [hero(SLOTH, 290, 'sad'), hero(CAT, 790, 'smug', 520, 2, true)] },
  { start: 5, end: 6, set: 'night', actors: [hero(PANDA, 540, 'sleepy', 660)] },
  { start: 6, end: 7, set: 'card', actors: [hero(COIN, 300, 'happy', 400), hero(BRAIN, 780, 'shock', 400, 8, true)] },
  { start: 7, end: 8, set: 'room', actors: [hero(PHONE, 300, 'angry', 420), hero(JAR, 780, 'happy', 400, 9, true)] },
  { start: 8, end: 9, set: 'room', cam: closeUp(headOf(office), 2.3), actors: [{ ...office, pose: emo('sad') }] },
  { start: 9, end: 10, set: 'card',
    overlay(ctx, lt, t) {
      propNames().forEach((name, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        drawProp(ctx, name, 170 + col * 247, 330 + row * 280, 170, { text: name === 'sign' ? 'SALE' : name === 'speech' ? 'hi!' : undefined, day: 12 }, t);
      });
    } },
  { start: 10, end: 11, set: 'card',
    actors: [{ hero: OFFICE, at: [600, 1150], size: 560, flat: '#d2493e', pose: { armL: { a: 1.2 }, armR: { a: 1.2 } } }],
    overlay(ctx, lt) {
      ui.thermo(ctx, 190, 1060, 440, 0.25 + 0.6 * Math.min(1, lt / 0.6));
      ui.text(ctx, 'STRESS', 540, 420, 118);
    } },
];
export const CAPTIONS = [[0, 1, 'people'], [1, 2, 'any era'], [2, 3, 'any job'], [3, 4, 'space'], [4, 5, 'animals'], [6, 7, 'objects'], [7, 8, 'things'], [8, 9, 'close-up']];
