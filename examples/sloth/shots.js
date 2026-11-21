// Demo short, 14 s. Shows the whole toolkit: pose keys, a close-up, a diagram card with a
// silhouette, a wipe, two heroes and a last shot that lands on the first one, so it loops.
// The card's numbers are placeholders for the demo, not facts.
import { go, blend, clamp, REST, EMO, SLOTH, PANDA, headOf, GROUND, ui } from '/engine/src/index.js';

const sloth = { hero: SLOTH, at: [540, GROUND + 6], size: 680, seed: 2 };
const BORED = blend(REST, EMO.bored, 1);
const head = headOf(sloth);

export const DURATION = 14;
export const SHOTS = [
  { start: 0, end: 3.2, set: 'jungle',
    cam: lt => ({ zoom: 1 + 0.07 * (lt / 3.2), y: 960 - 30 * (lt / 3.2) }),
    actors: [{ ...sloth, pose: lt => go(BORED, lt, [
      [1.3, { ...EMO.shock, eyes: { open: 1.15, pupil: 0.55, lx: 0, ly: 0 } }, { dur: 0.3 }],
      [2.2, { ...EMO.calm, armL: REST.armL, armR: REST.armR, squash: 0, head: { tilt: 0.08, dy: 0 } }, { dur: 0.5, ease: 'spring' }],
    ]) }] },

  { start: 3.2, end: 5.6, set: 'jungle', tr: 'wipe',
    cam: lt => ({ x: head[0], y: head[1] + 10, zoom: 2.6 + 0.12 * (lt / 2.4) }),
    actors: [{ ...sloth, pose: lt => go(blend(REST, { head: { tilt: 0.08 } }, 1), lt, [
      [0.3, { eyes: { lx: -0.8 } }, { dur: 0.25, ease: 'inout' }],
      [0.8, { eyes: { lx: 0.8 } }, { dur: 0.25, ease: 'inout' }],
      [1.3, { ...EMO.sad, eyes: { open: 0.8, lx: 0, ly: 0.5, pupil: 1.15 } }, { dur: 0.45 }],
    ]) }] },

  { start: 5.6, end: 9, set: 'card',
    actors: [{ hero: SLOTH, at: [600, 1120], size: 520, flat: '#d2493e', seed: 2,
      pose: lt => ({ x: -90 + 50 * lt, legL: Math.sin(lt * 3) * 0.45, legR: -Math.sin(lt * 3) * 0.45,
        armL: { a: 0.3 - Math.sin(lt * 3) * 0.25 }, armR: { a: 0.3 + Math.sin(lt * 3) * 0.25 }, rot: Math.sin(lt * 3) * 0.03 }) }],
    overlay(ctx, lt) {
      const left = clamp(1 - lt / 2.6);
      ui.thermo(ctx, 190, 1040, 440, 0.08 + 0.85 * left);
      ui.text(ctx, 'ENERGY', 540, 400, 118);
      ui.text(ctx, `${Math.round(3 + 97 * left)}%`, 540, 540, 150, { color: '#ffd94a' });
    } },

  { start: 9, end: 12, set: 'night',
    cam: lt => ({ x: 540 + 26 * (lt / 3), zoom: 1.04 }),
    actors: [
      { ...sloth, at: [360, GROUND + 6], size: 600, pose: lt => go(REST, lt, [
        [0.5, { eyes: { lx: 0.9 }, head: { turn: 0.7 } }, { dur: 0.3, ease: 'inout' }],
        [1.5, EMO.smug, { dur: 0.4 }],
        [2.2, { ...EMO.sleepy, eyes: { open: 0.12, lx: 0 }, head: { turn: 0, tilt: 0.16, dy: 6 } }, { dur: 0.7, ease: 'inout' }],
      ]) },
      { hero: PANDA, at: [760, GROUND + 6], size: 560, seed: 5, flip: true, pose: lt => {
        const arrive = clamp(lt / 1.1), wave = go({ v: 0 }, lt, [[1.1, { v: 1 }, { dur: 0.3 }], [2.4, { v: 0 }, { dur: 0.4, ease: 'inout' }]]).v;
        return blend(go(REST, lt, [[0.9, EMO.happy, { dur: 0.35 }], [2.4, { ...EMO.calm, armL: REST.armL, squash: 0 }, { dur: 0.4, ease: 'inout' }]]), {
          x: 520 * (1 - arrive) ** 2, y: -Math.abs(Math.sin(arrive * Math.PI * 3)) * 46 * (1 - arrive),
          armR: { a: 0.12 + wave * (2.3 + Math.sin(lt * 11) * 0.3), bend: 0.25 - wave * 0.4 },
        }, 1);
      } },
    ] },

  { start: 12, end: 14, set: 'jungle',
    cam: () => ({ zoom: 1 }),
    actors: [{ ...sloth, pose: lt => go(blend(REST, EMO.sleepy, 1), lt, [[0.4, BORED, { dur: 0.6, ease: 'inout' }]]) }] },
];

export const CAPTIONS = [
  [0.3, 1.3, 'you are'], [1.3, 3.1, 'a sloth'], [3.5, 5.4, "here's why"],
  [9.4, 10.6, 'a friend'], [10.6, 11.9, 'too tired'], [12.3, 13.9, 'still a sloth'],
];
