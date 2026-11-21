// Named camera moves, so a shot says what the camera does instead of hand-writing lerps.
// The vocabulary and the default durations follow the camera family of the "Awesome AI Motion"
// field guide (github.com/gongnyang/awesome-ai-motion, MIT); the code here is our own.
// Every move is `lt => camera`, a pure function of shot time. Options shared by all moves:
//   at (start, s, default 0), dur (s), ease ('inout' by default). After at + dur the move holds its end.
// A number option may be a pair [from, to]; a look target may be a pair of points [[x,y,z], [x,y,z]]
// (follow takes a function instead, flyTo its two points).
import { clamp, lerp, blend, EASE } from './core.js';
import { orbit, CAM3 } from './stage3d.js';
import { shake } from './motion.js';

const span = (lt, at, dur) => (dur > 0 ? clamp((lt - at) / dur) : lt >= at ? 1 : 0);       // dur 0 is a cut, not a NaN
const prog = (lt, o, dur) => EASE[o.ease || 'inout'](span(lt, o.at || 0, o.dur ?? dur));
const num = (v, u) => (Array.isArray(v) ? lerp(v[0], v[1], u) : v);
const pt = (v, u) => (Array.isArray(v[0]) ? v[0].map((a, i) => lerp(a, v[1][i], u)) : v);
const first = v => (Array.isArray(v) ? v[0] : v);
const RAD = Math.PI / 180;
// a move may return a partial camera; the modifiers need all of it, with the tilt spelled out
const CAM2 = { x: 540, y: 960, zoom: 1 };
const is3 = c => 'pos' in c || 'look' in c || 'fov' in c;
const full = c => (is3(c) ? { ...CAM3, roll: 0, ...c } : { ...CAM2, rot: 0, ...c });

// ---------- 3D stages: {pos, look, fov, roll} ----------
export const cam3 = {
  // circle the subject: shows its shape and what is behind it
  orbit: (look, o = {}) => lt => {
    const u = prog(lt, o, 2.4), c = orbit(pt(look, u), num(o.dist ?? 7, u), num(o.yaw ?? [-30, 30], u), num(o.pitch ?? 6, u), num(o.fov ?? 34, u));
    c.pos[1] = Math.max(o.floor ?? 0.2, c.pos[1]);                        // never under the ground (floor: its height)
    return c;
  },
  pushIn: (look, o = {}) => cam3.orbit(look, { dist: [8, 5], yaw: 12, dur: 2, ...o }),            // move closer: "look at this"
  pullOut: (look, o = {}) => cam3.orbit(look, { dist: [5, 9.5], yaw: 12, pitch: [5, 11], dur: 2, ...o }),   // back off: show the whole thing
  crane: (look, o = {}) => cam3.orbit(look, { dist: [13, 7], yaw: 25, pitch: [30, 6], dur: 2.2, ...o }),    // come down from above to eye level
  craneUp: (look, o = {}) => cam3.orbit(look, { dist: [7, 12], yaw: 25, pitch: [6, 26], dur: 2.6, ...o }),
  truck: (from, to, o = {}) => cam3.orbit([from, to], { yaw: 20, dur: 2, ...o }),                  // slide sideways, angle unchanged
  topDown: (look, o = {}) => cam3.orbit(look, { dist: [9, 7.5], yaw: 0, pitch: 80, dur: 2, ...o }),  // a map view
  lowAngle: (look, o = {}) => cam3.orbit(look, { dist: [5.6, 5], yaw: 20, pitch: -7, dur: 2, ...o }), // from the ground up: makes it big
  whip: (from, to, o = {}) => cam3.orbit([from, to], { yaw: 15, dur: 0.28, ...o }),                // a snap from one subject to another
  // stay with a moving subject; the camera trails it a little. pointAt: lt => [x, y, z]
  follow: (pointAt, o = {}) => lt => {
    const a = pointAt(lt), b = pointAt(Math.max(0, lt - (o.lag ?? 0.3)));
    return cam3.orbit(a.map((v, i) => lerp(v, b[i], 0.6)), { yaw: 22, dist: 6.5, ...o })(lt);
  },
  // the subject keeps its size while the background stretches: a moment of realisation
  dollyZoom: (look, o = {}) => lt => {
    const u = prog(lt, o, 1.8), dist = o.dist ?? [6, 7.6], d = num(dist, u), k = first(dist) * Math.tan((first(o.fov ?? 34) * RAD) / 2);   // fov: the lens at the start
    return orbit(pt(look, u), d, num(o.yaw ?? 10, u), num(o.pitch ?? 4, u), (2 * Math.atan(k / d)) / RAD);
  },
  // from one place to another: rise and back off, travel, come down
  flyTo: (from, to, o = {}) => lt => {
    const u = prog(lt, o, 1.8), up = Math.sin(Math.PI * u);
    return orbit(from.map((v, i) => lerp(v, to[i], u)), num(o.dist ?? 6, u) * (1 + (o.rise ?? 0.9) * up), num(o.yaw ?? 15, u), num(o.pitch ?? 6, u) + 16 * up, num(o.fov ?? 34, u));
  },
};

// ---------- 2D sets and diagram cards: {x, y, zoom, rot} ----------
export const cam2 = {
  pushIn: (p, o = {}) => lt => { const u = prog(lt, o, 2), f = o.from || [540, 960]; return { x: lerp(f[0], p[0], u), y: lerp(f[1], p[1], u), zoom: num(o.zoom ?? [1, 1.6], u) }; },
  pullOut: (p, o = {}) => lt => { const u = prog(lt, o, 2), f = o.to || [540, 960]; return { x: lerp(p[0], f[0], u), y: lerp(p[1], f[1], u), zoom: num(o.zoom ?? [1.6, 1], u) }; },
  pan: (from, to, o = {}) => lt => { const u = prog(lt, o, 2); return { x: lerp(from[0], to[0], u), y: lerp(from[1], to[1], u), zoom: num(o.zoom ?? 1.15, u) }; },
  zoomTo: (p, o = {}) => cam2.pushIn(p, { zoom: [1, 2.4], dur: 1.75, ...o }),          // from the overview into one detail
  kenBurns: (p = [512, 942], o = {}) => cam2.pushIn(p, { zoom: [1, 1.12], dur: 2.2, ease: 'linear', ...o }),   // a slow drift over a still picture
  whip: (from, to, o = {}) => cam2.pan(from, to, { dur: 0.28, ...o }),
  follow: (pointAt, o = {}) => lt => { const a = pointAt(lt), b = pointAt(Math.max(0, lt - (o.lag ?? 0.3))); return { x: lerp(a[0], b[0], 0.6), y: lerp(a[1], b[1], 0.6), zoom: num(o.zoom ?? 1.3, prog(lt, o, 2)) }; },
  flyTo: (from, to, o = {}) => lt => { const u = prog(lt, o, 1.8); return { x: lerp(from[0], to[0], u), y: lerp(from[1], to[1], u), zoom: num(o.zoom ?? 1.8, u) * (1 - 0.5 * Math.sin(Math.PI * u)) }; },
};

// ---------- modifiers, for both kinds ----------
// one move, then another: `chain(a, b, 2.2)` blends from a to b starting at 2.2 s.
// (Not named `then`: a module that exports `then` looks like a promise to `import()` and never loads.)
export const chain = (a, b, at, dur = 0.6) => lt => blend(full(a(lt)), full(b(lt)), EASE.inout(span(lt, at, dur)));
// a tilted horizon: unease, speed, a joke. deg in degrees, a number or [from, to]; o: {at, dur, ease}.
// (The camera fields it writes, `roll` in 3D and `rot` in 2D, are radians.)
export const dutch = (cam, deg = [0, 7], o = {}) => lt => { const c = full(cam(lt)), r = num(deg, prog(lt, o, 2)) * RAD; return is3(c) ? { ...c, roll: r } : { ...c, rot: r }; };
// a hit at `at`: amp in metres for a 3D camera (0.08), in pixels for a 2D one (26)
export const hit = (cam, at, amp) => lt => {
  const c = full(cam(lt)), k = shake(lt, at, amp ?? (is3(c) ? 0.08 : 26));
  return is3(c) ? { ...c, pos: [c.pos[0] + k.x, c.pos[1] + k.y, c.pos[2]], look: [c.look[0] + k.x * 0.5, c.look[1] + k.y * 0.5, c.look[2]] } : { ...c, x: c.x + k.x, y: c.y + k.y };
};
