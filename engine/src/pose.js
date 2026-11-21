import { blend } from './core.js';

// The pose vocabulary. A pose is plain data; `go()` from core.js blends between poses.
// Angles are radians. Positions are world pixels, relative to the actor's `at` point (its feet).

export const REST = {
  x: 0, y: 0,           // offset from the actor's `at`
  z: 0,                 // depth offset, 3D stages only (+ toward the camera)
  rot: 0,               // whole-body lean
  squash: 0,            // -0.3 stretched .. 0.3 squashed
  head: { tilt: 0, dx: 0, dy: 0, turn: 0 },   // turn -1..1 slides the face sideways
  armL: { a: 0.12, bend: 0.25 },              // a: 0 hangs down, 1.57 points sideways, 3.1 points up
  armR: { a: 0.12, bend: 0.25 },
  legL: 0, legR: 0,
  tail: 0,
  brows: { l: 0, r: 0, h: 0 },                // + angry (inner end down), - sad; h raises both
  eyes: { open: 1, lx: 0, ly: 0, pupil: 1 },  // look -1..1
  mouth: { curve: 0.25, open: 0, w: 1 },      // curve -1 frown .. 1 smile
  tear: 0, sweat: 0,
};

// Partial poses: only the face and the few limbs each emotion needs.
export const EMO = {
  calm:   { brows: { l: 0, r: 0, h: 0 }, eyes: { open: 1, pupil: 1 }, mouth: { curve: 0.25, open: 0, w: 1 }, tear: 0, sweat: 0 },
  happy:  { brows: { l: -0.15, r: -0.15, h: 0.5 }, eyes: { open: 1, pupil: 1.1 }, mouth: { curve: 1, open: 0.45, w: 1.15 },
            armL: { a: 2.05, bend: -0.25 }, armR: { a: 2.05, bend: -0.25 }, squash: -0.05 },
  sad:    { brows: { l: -0.9, r: -0.9, h: 0.1 }, eyes: { open: 0.8, ly: 0.5, pupil: 1.15 }, mouth: { curve: -0.9, open: 0, w: 0.8 },
            head: { tilt: 0.06, dy: 5 }, tear: 1 },
  angry:  { brows: { l: 1, r: 1, h: -0.5 }, eyes: { open: 0.72, pupil: 0.8 }, mouth: { curve: -0.7, open: 0.15, w: 1 },
            armL: { a: 0.7, bend: 0.9 }, armR: { a: 0.7, bend: 0.9 } },
  shock:  { brows: { l: -0.3, r: -0.3, h: 1 }, eyes: { open: 1.15, pupil: 0.55 }, mouth: { curve: -0.2, open: 1, w: 0.6 },
            armL: { a: 1.9, bend: 0.5 }, armR: { a: 1.9, bend: 0.5 }, squash: -0.12, sweat: 1 },
  bored:  { brows: { l: 0.25, r: 0.25, h: -0.7 }, eyes: { open: 0.45, ly: 0.2, pupil: 0.95 }, mouth: { curve: -0.25, open: 0, w: 0.9 },
            head: { tilt: -0.08 } },
  smug:   { brows: { l: 0.5, r: -0.5, h: 0.2 }, eyes: { open: 0.6, lx: 0.5, pupil: 0.9 }, mouth: { curve: 0.8, open: 0, w: 0.9 },
            head: { tilt: 0.1 } },
  sleepy: { brows: { l: -0.2, r: -0.2, h: -0.6 }, eyes: { open: 0.12, pupil: 1 }, mouth: { curve: 0.1, open: 0.25, w: 0.5 },
            head: { tilt: 0.16, dy: 6 } },
};

// A full pose from partial ones: mix(EMO.sad, { head: { turn: 0.5 } }). Start every go() from a full
// pose (REST or mix(...)); a key that names a field the base lacks would snap instead of move.
export const mix = (...parts) => parts.reduce((p, x) => blend(p, x, 1), REST);
