// Dimash builds a bridge: five ideas, from the dumbest to the engineer's one.
// Every idea is tried in the 3D world, then explained on an animated diagram card.
// Render:  CRF=21 node ../../engine/render.mjs . video bridge-demo.mp4
import { go, mix, add, EMO, EASE, lerp, clamp, walk, jump, wave, headAt, ui, D, cam2, cam3, chain, hit, CAT, PANDA } from '/engine/src/index.js';
import { DIMASH, DIMASH_PRO } from './cast.js';
import { HALF, WATER, sagY } from './river.js';

const H = 1.35, PX = 600 / H, m = v => v * PX;           // pose pixels per metre for a hero 1.35 m tall
const ease = (lt, a, b) => EASE.inout(clamp((lt - a) / (b - a)));
const boy = { hero: DIMASH, h: H, seed: 3 }, pro = { hero: DIMASH_PRO, h: H, seed: 3 };

// ---------- screen graphics ----------
// "IDEA n" at the top of a 3D shot, and a verdict stamped on it at `verdictAt`: false a cross, true a tick.
const idea = (n, name, verdictAt, good, from = 0.1) => (ctx, lt) => {
  const k = D.pop(lt, from, 0.25);
  ctx.save(); ctx.translate(540, 190); ctx.scale(k, k);
  ui.text(ctx, `IDEA ${n}`, 0, -52, 66, { color: D.GOLD }); ui.text(ctx, name, 0, 36, 100, { maxW: 600 });
  ctx.restore();
  if (verdictAt != null) (good ? D.tick : D.cross)(ctx, 935, 175, D.step(lt, verdictAt, 0.22), 54);
};
// the heading of a diagram card, with an optional verdict beside it
const title = (str, markAt, good, from = 0.05) => (ctx, lt) => {
  const k = D.pop(lt, from);
  ctx.save(); ctx.translate(540, 330); ctx.scale(k, k); ui.text(ctx, str, 0, 0, 104, { color: D.GOLD, maxW: 700 }); ctx.restore();
  if (markAt != null) (good ? D.tick : D.cross)(ctx, 950, 325, D.step(lt, markAt, 0.25), 60);
};

// ---------- diagram cards: one side view of the river, drawn in world space so the camera can move over it ----------
const BY = 900, BL = 330, BR = 750, WY = 1040;            // bank top, the two bank faces, water level
const WOOD = '#c79a5b', STONE = ['#a9a294', '#b9b3a5'], PALE_RED = '#ff9a8f', PALE_BLUE = '#9ccbff';
function banks(ctx) {
  for (const x of [BL - 135, BR + 135]) { D.block(ctx, x, BY + 110, 270, 220, '#8f6a47'); D.block(ctx, x, BY + 20, 270, 40, '#86a868', 1, { r: 10 }); }
}
function water(ctx, t, level = WY) {
  ctx.beginPath(); ctx.moveTo(BL + 4, BY + 216);
  for (let x = BL + 4; x <= BR - 4; x += 16) ctx.lineTo(x, level + Math.sin(x * 0.045 + t * 2.6) * 5);
  ctx.lineTo(BR - 4, BY + 216); ctx.closePath();
  ctx.fillStyle = 'rgba(73,166,224,0.93)'; ctx.fill(); ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = D.INK; ctx.stroke();
}
const fade = (ctx, a, fn) => { if (a > 0) { ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); } };
// a weight that falls in and lands with its foot on (x, y) at the moment `at`
function weight(ctx, x, y, lt, at) {
  const u = clamp((lt - (at - 0.3)) / 0.3);
  fade(ctx, u * 4, () => D.block(ctx, x, y - 52 - 280 * (1 - u * u), 124, 104, '#5b6274', 1, { label: 'KG', size: 50 }));   // fades in below the heading
}

// Idea 1 on paper: the river is 4 m, a jump is 2 m.
function jumpCard(ctx, lt, t) {
  banks(ctx);
  const arc = D.curve([292, BY - 8], [436, 520], [548, WY + 14]), u = D.step(lt, 1.0, 0.6), head = arc[Math.round(EASE.in(u) * 0.35 * 24 + u * 0.65 * 24)];
  D.line(ctx, arc, u, { color: D.GOLD, w: 10 });
  if (u < 1) D.joint(ctx, head, D.step(lt, 0.55, 0.25), { r: 24, color: '#ff8a3d' });
  water(ctx, t);
  const s = clamp((lt - 1.6) / 0.6);
  if (s > 0 && s < 1) for (const r of [1, 1.7]) { ctx.beginPath(); ctx.ellipse(548, WY, 30 * r + 70 * s * r, 8 + 12 * s, 0, 0, Math.PI * 2); ctx.lineWidth = 7; ctx.strokeStyle = `rgba(234,247,255,${1 - s})`; ctx.stroke(); }
  for (const x of [BL, BR]) D.line(ctx, [[x, 690], [x, BY - 6]], D.step(lt, 0.2, 0.4), { color: 'rgba(255,255,255,0.45)', w: 4, ink: false });
  D.ruler(ctx, [BL, 660], [BR, 660], D.step(lt, 0.2, 0.6), 4, { unit: ' m' });
  D.ruler(ctx, [BL, 1160], [548, 1160], D.step(lt, 1.7, 0.5), 2, { unit: ' m', color: PALE_RED, above: false });
  D.cross(ctx, 548, 950, D.step(lt, 2.1, 0.25), 78);
}

// Idea 2 on paper, one clock for two shots: the load bends the beam, the top is squeezed, the bottom is
// pulled, and it tears open in the middle where the bending is greatest.
const BEAM_Y = 872, BEND_LEN = 3.2, BREAK = 4.5;
function bendCard(ctx, g, t) {
  banks(ctx);
  const sag = 84 * EASE.spring(clamp((g - 1.0) / 0.9)) + 12 * D.step(g, 3.9, 0.6), brk = EASE.in(clamp((g - BREAK) / 0.5)), grow = D.step(g, 0.15, 0.45);
  const yAt = x => BEAM_Y + sag * 4 * ((x - 300) / 480) * (1 - (x - 300) / 480);
  // one half of the beam, hinged on its bank; after the break it swings down
  const half = (side, dy) => {
    const x0 = side < 0 ? 300 : 780, a = -side * 0.95 * brk, c = Math.cos(a), s = Math.sin(a);
    const pts = D.curve([x0, BEAM_Y + dy], [x0 - side * 120, BEAM_Y + dy + sag], [540, BEAM_Y + dy + sag], 12).map(([x, y]) => [x0 + (x - x0) * c - (y - BEAM_Y) * s, BEAM_Y + (x - x0) * s + (y - BEAM_Y) * c]);
    return side < 0 ? pts : pts.reverse();
  };
  const beam = (dy, o, u = 1) => { if (brk > 0) { D.line(ctx, half(-1, dy), 1, o); D.line(ctx, half(1, dy).reverse(), 1, o); } else D.line(ctx, [...half(-1, dy), ...half(1, dy).slice(1)], u, o); };
  beam(0, { color: WOOD, w: 46 }, grow);
  fade(ctx, D.step(g, 1.5, 0.4), () => beam(-14, { color: D.RED, w: 12, ink: false }));
  fade(ctx, D.step(g, 2.2, 0.4), () => beam(14, { color: D.BLUE, w: 12, ink: false }));
  if (brk <= 0) { const b = BEAM_Y + sag + 23; D.line(ctx, [[540, b], [528, b - 13], [551, b - 25], [533, b - 37], [545, b - 46]], D.step(g, 4.0, 0.4), { color: D.INK, w: 9, ink: false }); }
  const fall = 420 * EASE.in(clamp((g - BREAK) / 0.55));
  fade(ctx, 1 - (fall - 170) / 90, () => weight(ctx, 540, BEAM_Y + sag - 23 + fall, g, 1.0));
  water(ctx, t);
  fade(ctx, 1 - D.step(g, BREAK, 0.15), () => {
    const uc = D.step(g, 1.6, 0.4), ut = D.step(g, 2.3, 0.4);
    D.arrow(ctx, [350, yAt(350) - 64], [466, yAt(466) - 64], uc, { w: 18 }); D.arrow(ctx, [730, yAt(730) - 64], [614, yAt(614) - 64], uc, { w: 18 });
    D.arrow(ctx, [478, yAt(478) + 64], [352, yAt(352) + 64], ut, { color: D.BLUE, w: 18 }); D.arrow(ctx, [602, yAt(602) + 64], [728, yAt(728) + 64], ut, { color: D.BLUE, w: 18 });
    fade(ctx, 1 - D.step(g, BEND_LEN, 0.35), () => {
      D.label(ctx, 'COMPRESSION', [400, yAt(400) - 30], [250, 660], D.step(g, 1.8, 0.5), { color: PALE_RED, align: 'center' });
      D.label(ctx, 'TENSION', [540, BEAM_Y + sag + 28], [540, 1180], D.step(g, 2.5, 0.5), { color: PALE_BLUE, align: 'center' });
    });
  });
  D.spot(ctx, 540, BEAM_Y + sag, 270, D.step(g, 3.4, 0.5) * (1 - D.step(g, BREAK + 0.5, 0.4)), 0.42);
}
const crunch = (ctx, lt) => {
  const k = D.pop(lt, BREAK - BEND_LEN + 0.03, 0.2);
  ctx.save(); ctx.translate(540, 560); ctx.rotate(-0.07); ctx.scale(k, k); ui.text(ctx, 'CRACK!', 0, 0, 150, { color: D.RED }); ctx.restore();
};

// Idea 3 on paper: a rope can only pull. It hangs, it holds, and nothing stops it swinging.
function ropeCard(ctx, lt, t) {
  banks(ctx);
  const S = 58 + 46 * EASE.spring(clamp((lt - 1.5) / 0.8)), wob = 26 * ease(lt, 2.5, 2.9);
  const ropeY = x => { const s = (x - 300) / 480; return 765 + S * 4 * s * (1 - s) + wob * Math.sin(2 * Math.PI * s) * Math.sin(lt * 8.5); };
  const pts = Array.from({ length: 25 }, (_, i) => [300 + i * 20, ropeY(300 + i * 20)]);
  [300, 780].forEach((x, i) => D.block(ctx, x, BY - 72, 30, 150, '#7a5533', D.step(lt, 0.1 + i * 0.1, 0.3), { r: 8 }));
  for (let i = 0; i < 9; i++) {
    const x = 340 + i * 50, u = D.nth(lt, i, 0.75, 0.05, 0.28), y = ropeY(x);
    D.line(ctx, [[x, y], [x, y + 62]], u, { color: '#6b4a2b', w: 5, ink: false });
    D.block(ctx, x, y + 68, 44, 16, i % 2 ? '#b98a52' : '#a87a45', u, { r: 4 });
  }
  D.line(ctx, pts, D.step(lt, 0.35, 0.4), { color: '#8a6238', w: 10 });
  weight(ctx, 540, ropeY(540) + 60, lt, 1.5);
  water(ctx, t);
  const ut = D.step(lt, 1.9, 0.35);
  D.flow(ctx, pts.slice(0, 13).reverse(), lt, { color: D.BLUE, a: ut }); D.flow(ctx, pts.slice(12), lt, { color: D.BLUE, a: ut });
  D.arrow(ctx, [440, ropeY(440) - 44], [345, ropeY(345) - 52], ut, { color: D.BLUE, w: 16 }); D.arrow(ctx, [640, ropeY(640) - 44], [735, ropeY(735) - 52], ut, { color: D.BLUE, w: 16 });
  D.label(ctx, 'PULLS', [322, ropeY(322) - 4], [255, 640], D.step(lt, 2.0, 0.45), { color: PALE_BLUE, align: 'center' });
  for (const s of [-1, 1]) D.arrow(ctx, [540 + s * 80, 1150], [540 + s * 200, 1150], ease(lt, 2.6, 2.9) * (0.75 + 0.25 * Math.sin(lt * 8.5 + s)), { color: D.ORANGE, w: 16 });   // the sway
}

// Idea 4 on paper: stones on a curve, locked by the keystone; the load runs down both sides into the banks.
const archPt = a => [540 + Math.sin(a) * 250, 1010 - Math.cos(a) * 250];
function archCard(ctx, lt, t) {
  banks(ctx); water(ctx, t);
  [0, 8, 1, 7, 2, 6, 3, 5, 4].forEach((i, k) => {
    const a = -1 + i * 0.25, u = D.nth(lt, k, 0.25, 0.11, 0.3), [x, y] = archPt(a);
    D.block(ctx, x, y - 170 * (1 - EASE.out(clamp(u))), 60, 76, i === 4 ? '#e3c565' : STONE[i % 2], u, { rot: a, r: 8 });
  });
  fade(ctx, 1 - D.step(lt, 2.0, 0.2), () => D.label(ctx, 'KEYSTONE', [566, 742], [800, 610], D.step(lt, 1.45, 0.45), { size: 42, align: 'center' }));
  weight(ctx, 540, 722, lt, 2.4);
  const uf = D.step(lt, 2.5, 0.3);
  for (const s of [-1, 1]) {
    const path = [...Array.from({ length: 11 }, (_, i) => archPt(s * i * 0.1)), [540 + s * 300, 940]];
    D.flow(ctx, path, lt, { a: uf, r: 11 });
    D.arrow(ctx, [540 + s * 450, 1015], [540 + s * 285, 925], D.step(lt, 3.2, 0.35), { color: D.GREEN, w: 20 });      // the bank pushes back
  }
}

// Why triangles: a square folds under a side push, a triangle cannot change shape, and one diagonal
// turns the square into two triangles.
function triangleCard(ctx, lt) {
  const lean = 120 * EASE.spring(clamp((lt - 1.3) / 0.9)) * (1 - ease(lt, 2.7, 3.15)), push = D.step(lt, 1.1, 0.3) * (1 - D.step(lt, 2.7, 0.3));
  const shiver = Math.sin(lt * 30) * 3 * clamp((lt - 1.2) * 3) * clamp(2.6 - lt);
  const sq = [[130, 1110], [130 + lean, 800], [440 + lean, 800], [440, 1110]], tri = [[640, 1110], [795 + shiver, 800], [950, 1110]];
  D.bar(ctx, sq[0], sq[2], D.step(lt, 2.7, 0.4), { color: D.GOLD, w: 20, pins: false });          // the diagonal that saves it
  sq.forEach((p, i) => D.bar(ctx, p, sq[(i + 1) % 4], D.nth(lt, i, 0.15, 0.09, 0.3)));
  tri.forEach((p, i) => D.bar(ctx, p, tri[(i + 1) % 3], D.nth(lt, i, 0.55, 0.09, 0.3)));
  fade(ctx, push * 3, () => { D.arrow(ctx, [-30, 800], [105 + lean, 800], push); D.arrow(ctx, [530, 800], [765, 800], push); });
  ui.text(ctx, 'SQUARE', 285, 1190, 54); ui.text(ctx, 'TRIANGLE', 795, 1190, 54);
  D.cross(ctx, 285 + lean * 0.5, 960, D.step(lt, 2.0, 0.25) * (1 - D.step(lt, 2.7, 0.2)), 70);
  D.tick(ctx, 795, 1010, D.step(lt, 2.2, 0.25), 60);
  D.tick(ctx, 205, 900, D.step(lt, 3.25, 0.25), 44); D.tick(ctx, 365, 1010, D.step(lt, 3.35, 0.25), 44);
}

// Idea 5 on paper: a truss put up bar by bar, its triangles under the roadway. The top chord is squeezed,
// the bottom chord is pulled (the two forces that broke the plank, now each on its own bar), and the
// load zigzags out to the banks.
const NT = [300, 420, 540, 660, 780], NL = [360, 480, 600, 720], YT = 884, YL = 1010;
function trussCard(ctx, lt, t) {
  banks(ctx); water(ctx, t, 1078);
  const dip = 7 * EASE.spring(clamp((lt - 1.8) / 0.6));
  const T = NT.map((x, i) => [x, YT + dip * Math.sin((Math.PI * i) / 4)]), L = NL.map((x, i) => [x, YL + dip * Math.sin((Math.PI * (i + 0.5)) / 4)]);
  const bars = [];
  for (let i = 0; i < 4; i++) bars.push([T[i], T[i + 1]]);
  for (let i = 0; i < 4; i++) bars.push([T[i], L[i]], [L[i], T[i + 1]]);
  for (let i = 0; i < 3; i++) bars.push([L[i], L[i + 1]]);
  bars.forEach(([a, b], i) => D.bar(ctx, a, b, D.nth(lt, i, 0.15, 0.07, 0.3), { color: '#cfd3dc', w: 18, pins: false }));
  D.line(ctx, T, D.step(lt, 2.0, 0.35), { color: D.RED, w: 18, ink: false });
  D.line(ctx, L, D.step(lt, 2.5, 0.35), { color: D.BLUE, w: 18, ink: false });
  T.forEach((p, i) => D.joint(ctx, p, D.step(lt, 0.2 + i * 0.07, 0.2), { r: 14 }));
  L.forEach((p, i) => D.joint(ctx, p, D.step(lt, 0.55 + i * 0.14, 0.2), { r: 14 }));
  weight(ctx, 540, YT + dip - 12, lt, 1.8);
  const ur = D.step(lt, 2.0, 0.35), ub = D.step(lt, 2.5, 0.35);
  D.arrow(ctx, [346, 832], [462, 832], ur, { w: 16 }); D.arrow(ctx, [734, 832], [618, 832], ur, { w: 16 });
  D.arrow(ctx, [505, 1060], [385, 1060], ub, { color: D.BLUE, w: 16 }); D.arrow(ctx, [575, 1060], [695, 1060], ub, { color: D.BLUE, w: 16 });
  D.label(ctx, 'COMPRESSION', [400, 868], [245, 660], D.step(lt, 2.1, 0.45), { color: PALE_RED, align: 'center' });
  D.label(ctx, 'TENSION', [540, 1026], [540, 1150], D.step(lt, 2.6, 0.45), { color: PALE_BLUE, align: 'center' });
  const uf = D.step(lt, 3.0, 0.3), mid = [540, YT + dip];
  D.flow(ctx, [mid, L[1], T[1], L[0], T[0]], lt, { a: uf, r: 11 }); D.flow(ctx, [mid, L[2], T[3], L[3], T[4]], lt, { a: uf, r: 11 });
  for (const x of [240, 840]) D.arrow(ctx, [x, 1090], [x, 930], D.step(lt, 3.4, 0.3), { color: D.GREEN, w: 20 });   // the banks push up
}

// The whole road in one list: three ideas fail, two hold.
const IDEAS = [['JUMP', false], ['PLANK', false], ['ROPES', false], ['ARCH', true], ['TRUSS', true]];
function recapCard(ctx, lt) {
  IDEAS.forEach(([name, good], i) => {
    const y = 540 + i * 148, at = 0.2 + i * 0.3, best = i === 4, k = D.pop(lt, at, 0.3);
    D.block(ctx, 540, y, best ? 800 : 720, best ? 132 : 116, best ? '#d99a1f' : good ? '#2f8f55' : '#4d5568', D.step(lt, at, 0.3), { r: 26 });
    ctx.save(); ctx.translate(540, y); ctx.scale(k, k);
    ui.text(ctx, `${i + 1}`, -290, 2, 66, { color: D.GOLD }); ui.text(ctx, name, -220, 2, best ? 78 : 64, { align: 'left' });
    ctx.restore();
    (good ? D.tick : D.cross)(ctx, 820, y, D.step(lt, at + 0.22, 0.22), best ? 54 : 44);
  });
}

// ---------- the falls and the crossings ----------
// Idea 1: run up, leap, and come down in the middle of the river, chest deep.
function leap(lt) {
  const face = go(mix(EMO.happy, { head: { turn: 0.7 } }), lt, [[1.55, { ...EMO.shock, head: { turn: 0.4 } }, { dur: 0.2 }], [2.5, { ...EMO.sad, head: { turn: 0.2 }, armL: { a: 0.3, bend: 0.3 }, armR: { a: 0.3, bend: 0.3 } }, { dur: 0.4 }]]);
  const u = clamp((lt - 1.2) / 1.1), crouch = 0.18 * Math.sin(Math.PI * clamp((lt - 0.95) / 0.25)) ** 2, y = 2.4 * u - 4.35 * u * u;   // metres above the bank
  return add(walk(face, lt, 0.15, 1.2, m(1.9), 6), { x: m(1.7) * u, y: -m(y) + Math.sin(lt * 3.2) * 9 * ease(lt, 2.4, 2.8), squash: crouch - 0.1 * Math.sin(Math.PI * Math.min(1, u * 1.5)) });
}
// Idea 2: the plank slides out, he walks on, it sags more the nearer he gets to the middle, creaks, snaps.
const SNAP = 3.1, plankX = lt => -2.9 + 2.8 * ease(lt, 0.7, 2.6);
const sagBefore = lt => 0.2 * clamp((plankX(lt) + HALF) / HALF) ** 1.3 * (1 + 0.1 * Math.sin(lt * 21) * ease(lt, 2.5, 2.9));
const plankSag = lt => sagBefore(Math.min(lt, SNAP)) + 1.1 * EASE.in(clamp((lt - SNAP) / 0.4));
function onPlank(lt) {
  const face = go(mix(EMO.calm, { head: { turn: 0.6 } }), lt, [[1.6, { ...EMO.sad, tear: 0, sweat: 1, head: { turn: 0.5, tilt: 0.05 }, armL: { a: 1.2, bend: 0 }, armR: { a: 1.2, bend: 0 } }, { dur: 0.5 }], [2.75, { ...EMO.shock, head: { turn: 0.3 } }, { dur: 0.2 }], [3.9, { ...EMO.sad, armL: { a: 0.3, bend: 0.3 }, armR: { a: 0.3, bend: 0.3 } }, { dur: 0.35 }]]);
  const d = Math.max(0, plankX(lt) + HALF), v = clamp((lt - SNAP - 0.05) / 0.9);
  return add(walk(face, lt, 0.7, 2.6, m(2.8), 7), { y: m(d * Math.tan(sagBefore(Math.min(lt, SNAP))) + 1.55 * v * v) });
}
// Idea 3: across the rope bridge, which swings harder the nearer he is to the middle.
const ropeX = lt => -2.7 + 5.4 * ease(lt, 0.3, 3.7);
const ropeSway = lt => 0.3 * Math.sin((Math.PI * clamp((ropeX(lt) + HALF) / (HALF * 2)))) * Math.sin(lt * 4.4);
function onRope(lt) {
  const face = go(mix(EMO.calm, { head: { turn: 0.6 } }), lt, [[0.7, { ...EMO.shock, head: { turn: 0.5 }, armL: { a: 1.4, bend: 0 }, armR: { a: 1.4, bend: 0 } }, { dur: 0.3 }], [3.75, { ...EMO.sleepy, head: { turn: 0.2, tilt: 0.14 }, armL: { a: 0.15, bend: 0.3 }, armR: { a: 0.15, bend: 0.3 } }, { dur: 0.4 }]]);
  return add(walk(face, lt, 0.3, 3.7, m(5.4), 14), { y: -m(sagY(ropeX(lt))), rot: ropeSway(lt) * 0.7, head: { tilt: -ropeSway(lt) * 0.5 } });
}
const splash = (x, from) => ({ prop: 'splash', at: [x, 0.1], y: WATER - 0.05, h: 1.5, opts: lt => ({ k: (lt - from) / 0.75 }) });
// he points at the far bank and the pieces come
const direct = lt => go(mix(EMO.calm, { head: { turn: 0.55 } }), lt, [[0.25, { ...EMO.happy, head: { turn: 0.6, tilt: -0.04 }, armL: { a: 0.2, bend: 0.3 }, armR: { a: 1.7, bend: -0.2 } }, { dur: 0.3, ease: 'antic' }]]);
const thinkAt = headAt({ at: [2.8, 0.2], h: H });

// ---------- the shots: each has a length and its own captions in shot time ----------
const LIST = [
  // The problem: a boy, a river, the other bank. Crane down over his shoulder.
  { len: 3.4, set: 'river', cap: [[0.3, 1.6, 'meet Dimash'], [1.8, 3.3, 'cross the river']],
    cam: cam3.crane([[-1.3, 1.1, 0], [-2.0, 0.75, 0]], { dist: [10.5, 6.6], yaw: [-64, -46], pitch: [15, 7], dur: 3 }),
    actors: [{ ...boy, at: [-2.6, 0.1], pose: lt => go(mix(EMO.calm, { head: { turn: 0.6 } }), lt, [[1.3, { ...EMO.bored, head: { turn: 0.7, tilt: 0.08 } }, { dur: 0.5 }], [2.4, { ...EMO.happy, head: { turn: 0.55 }, armL: { a: 0.2, bend: 0.3 }, armR: { a: 1.5, bend: 0 } }, { dur: 0.35, ease: 'antic' }]]) }] },

  // Idea 1: just jump. Truck with the run-up, shake on the splash.
  { len: 3.4, set: 'river', overlay: idea(1, 'JUMP', 2.3, false), cap: [[0.3, 1.4, 'just jump'], [2.4, 3.3, 'too far']],
    cam: hit(cam3.truck([-1.6, 0.2, 0], [-0.8, 0.2, 0], { at: 0.8, dur: 1.4, dist: 7.4, yaw: [26, 20], pitch: 8 }), 2.13, 0.09),
    actors: [{ ...boy, at: [-3.9, 0], pose: leap }], props: [splash(-0.56, 2.11)] },
  { len: 2.8, set: 'card', draw: jumpCard, overlay: title('JUMP'), cap: [[0.2, 1.3, 'river: four metres'], [1.5, 2.7, 'jump: two metres']],
    cam: cam2.pushIn([540, 950], { zoom: [1, 1.08], dur: 2.6 }) },

  // Idea 2: a plank. Orbit in while it bends, shake when it snaps.
  { len: 4.4, set: 'river', bridge: 'plank', anim: lt => ({ sag: plankSag(lt) }), overlay: idea(2, 'PLANK', 3.4, false), cap: [[0.3, 1.4, 'lay a plank'], [1.8, 2.9, 'it bends'], [3.3, 4.3, 'crack']],
    cam: hit(cam3.orbit([-0.4, 0.1, 0], { dist: [7, 6], yaw: [10, 24], pitch: 7, dur: 3.8 }), SNAP, 0.1),
    actors: [{ ...boy, at: [-2.9, 0], pose: onPlank }], props: [splash(-0.1, SNAP + 0.62)] },
  { len: BEND_LEN, set: 'card', still: true, draw: bendCard, overlay: title('BENDING'), cap: [[0.3, 1.4, 'weight pushes down'], [1.6, 2.3, 'top gets squeezed'], [2.35, 3.15, 'bottom gets stretched']],
    cam: cam2.kenBurns() },
  // the same drawing, the camera goes into the middle of the beam
  { len: 2.6, set: 'card', still: true, tr: 'wipe', draw: (ctx, lt, t) => bendCard(ctx, lt + BEND_LEN, t), overlay: (ctx, lt) => { title('BENDING', BREAK - BEND_LEN + 0.2, false, -9)(ctx, lt); crunch(ctx, lt); },
    cap: [[0.15, 1.2, 'middle is weakest'], [1.6, 2.5, 'it snaps there']],
    cam: hit(cam2.pushIn([540, 945], { from: [512, 942], zoom: [1.12, 1.7], dur: 1.0 }), BREAK - BEND_LEN, 30) },

  // Idea 3: a rope bridge goes up piece by piece, then he crosses and the horizon rolls with the sway.
  { len: 2.4, set: 'river', bridge: 'rope', overlay: idea(3, 'ROPES'), cap: [[0.4, 2.2, 'string some ropes']],
    cam: cam3.crane([[-0.2, 0.3, 0], [-0.9, 0.3, 0]], { dist: [9.6, 7.4], yaw: [-74, -60], pitch: [20, 10], dur: 2.1 }),
    actors: [{ ...boy, at: [-2.75, 0.45], pose: direct }] },
  { len: 4.2, set: 'river', bridge: 'rope', built: true, anim: lt => ({ sway: ropeSway(lt) }), overlay: idea(3, 'ROPES', 3.8, false, -9), cap: [[0.8, 2.0, 'it holds'], [2.3, 3.6, 'but it swings']],
    cam: lt => ({ ...cam3.follow(l => [ropeX(l), 0.3, 0], { dist: [6.8, 6], yaw: [-30, -12], pitch: 9, dur: 4 })(lt), roll: ropeSway(lt) * 0.28 }),
    actors: [{ ...boy, at: [-2.7, 0], pose: onRope }] },
  { len: 3.4, set: 'card', tr: 'wipe', draw: ropeCard, overlay: title('ROPE', 3.0, false), cap: [[0.3, 1.4, 'the rope sags'], [1.7, 2.5, 'it only pulls'], [2.6, 3.3, 'and wobbles']],
    cam: cam2.pan([505, 950], [575, 950], { zoom: 1.1, dur: 3.2 }) },

  // The turn: stop guessing, think. Dolly zoom: he stays the same size, the world stretches behind him.
  { len: 2.4, set: 'river', cap: [[0.2, 1.0, 'think'], [1.2, 2.3, 'like an engineer']],
    cam: cam3.dollyZoom([thinkAt[0], thinkAt[1] + 0.34, thinkAt[2]], { dist: [4.4, 6.6], yaw: [-22, -8], pitch: 3, fov: 32, dur: 2.2 }),
    actors: [{ ...boy, at: [2.8, 0.2], flip: true, pose: lt => go(mix(EMO.bored, { head: { turn: 0.5, tilt: 0.1 }, eyes: { ly: -0.5 } }), lt, [[1.15, { ...EMO.happy, head: { turn: 0.2, tilt: -0.05 }, eyes: { ...EMO.happy.eyes, ly: 0 }, armL: { a: 0.2, bend: 0.3 }, armR: { a: 2.1, bend: -0.4 } }, { dur: 0.35, ease: 'antic' }]]) }],
    props: [{ prop: 'bulb', at: [2.8, 0.2], y: 1.5, h: 0.5, shadow: false, opts: lt => ({ on: clamp((lt - 1.1) / 0.12) }) }] },

  // Idea 4: the arch. On paper first, close on the stones, pull out when the keystone lands.
  { len: 4.2, set: 'card', draw: archCard, overlay: title('ARCH', 3.7, true), cap: [[0.3, 1.3, 'stones form arch'], [1.4, 2.2, 'keystone locks it'], [2.5, 3.2, 'weight goes sideways'], [3.3, 4.1, 'banks hold it']],
    cam: hit(cam2.pullOut([540, 840], { zoom: [1.45, 1], at: 1.2, dur: 1.0 }), 1.36, 22) },
  // from the water, looking up: stone after stone, both sides at once, the gold keystone last
  { len: 3.0, set: 'river', bridge: 'arch', overlay: idea(4, 'ARCH'), cap: [[0.4, 1.6, 'stone by stone'], [1.9, 2.9, 'arch is done']],
    cam: hit(cam3.lowAngle([0, -0.75, 0], { dist: [12.5, 10.5], yaw: [-7, 7], pitch: -1, floor: -0.72, dur: 2.8 }), 1.42, 0.05) },
  { len: 4.2, set: 'river', bridge: 'arch', built: true, tr: 'wipe', overlay: idea(4, 'ARCH', 2.9, true, -9), cap: [[1.8, 2.8, 'stone holds'], [3.0, 4.1, 'but so heavy']],
    cam: hit(hit(cam3.orbit([-0.2, 0.5, 0], { dist: [8, 6.6], yaw: [42, 12], pitch: 4, dur: 3.8 }), 2.72, 0.05), 3.72, 0.05),
    actors: [{ ...pro, at: [-2.9, 0], pose: lt => jump(jump(walk(go(mix(EMO.calm, { head: { turn: 0.6 } }), lt, [[1.6, { ...EMO.happy, head: { turn: 0.3 } }, { dur: 0.35 }]]), lt, 0.2, 1.7, m(2.9), 7), lt, 2.1, 150), lt, 3.1, 150) }] },

  // Idea 5: triangles. Why, then the truss on paper, then it goes up bar by bar.
  { len: 4.0, set: 'card', draw: triangleCard, overlay: title('TRIANGLE'), cap: [[0.3, 1.2, 'push the side'], [1.5, 2.5, 'the square folds'], [2.75, 3.9, 'diagonal saves it']],
    cam: chain(cam2.pan([515, 950], [570, 950], { zoom: 1.04, at: 0.9, dur: 1.3 }), cam2.pan([570, 950], [505, 955], { zoom: [1.04, 1.07], at: 2.5, dur: 0.9 }), 2.5, 0.9) },
  { len: 4.4, set: 'card', draw: trussCard, overlay: title('TRUSS', 3.85, true), cap: [[0.2, 1.4, 'truss of triangles'], [2.0, 2.9, 'squeeze and stretch'], [3.0, 4.3, 'force zigzags through']],
    cam: cam2.pullOut([540, 945], { to: [540, 950], zoom: [1.5, 1.2], at: 1.3, dur: 0.9 }) },
  // the camera rides along the bridge as the bars land, then backs off to show all of it
  { len: 3.2, set: 'river', bridge: 'truss', overlay: idea(5, 'TRUSS'), cap: [[0.3, 1.6, 'bar by bar'], [1.9, 3.1, 'light and strong']],
    cam: chain(cam3.truck([-0.9, -0.45, 0], [0.9, -0.45, 0], { at: 0.25, dur: 1.0, dist: 6.4, yaw: [-5, 5], pitch: 3, floor: -0.72 }), cam3.orbit([0, -0.2, 0], { dist: [6.4, 11.4], yaw: [5, 8], pitch: [3, 6], at: 1.45, dur: 1.2, floor: -0.72 }), 1.45, 0.9) },
  { len: 4.0, set: 'river', bridge: 'truss', built: true, overlay: idea(5, 'TRUSS', 3.2, true, -9), cap: [[0.6, 2.0, 'holds everyone'], [2.3, 3.8, 'even a panda']],
    cam: cam3.truck([-0.5, 0.6, 0], [0.9, 0.6, 0], { dist: [9, 6.4], yaw: [58, 40], pitch: [10, 6], dur: 3.7 }),   // travels with the walkers
    actors: [
      { hero: PANDA, at: [-5.4, -0.1], h: 1.2, seed: 8, pose: lt => walk(mix(EMO.happy, { head: { turn: 0.6 } }), lt, 0.7, 3.4, m(5.1) * (H / 1.2), 12) },
      { hero: CAT, at: [-4.3, 0.15], h: 0.8, seed: 2, pose: lt => walk(mix(EMO.smug, { head: { turn: 0.6 } }), lt, 0.4, 3.4, m(5.2) * (H / 0.8), 16) },
      { ...pro, at: [-3, 0], pose: lt => walk(go(mix(EMO.calm, { head: { turn: 0.6 } }), lt, [[2.6, { ...EMO.happy, head: { turn: 0.3 } }, { dur: 0.35 }]]), lt, 0.2, 3.3, m(5.6), 13, m(0.55)) },
    ] },

  // The whole road, then the answer from above.
  { len: 3.0, set: 'card', tr: 'wipe', draw: recapCard, overlay: title('5 IDEAS'), cap: [[0.3, 1.4, 'dumb ideas first'], [1.6, 2.9, 'then the best']],
    cam: cam2.pan([540, 930], [540, 990], { zoom: [1.08, 1.02], dur: 2.8 }) },
  { len: 3.6, set: 'river', bridge: 'truss', built: true, cap: [[0.6, 2.4, 'how engineers think']],
    cam: cam3.craneUp([[2.1, 0.7, 0.5], [1.5, 1.0, 0.5]], { dist: [5.4, 9.5], yaw: [-4, -36], pitch: [5, 17], dur: 3.4 }),
    actors: [
      { hero: PANDA, at: [-0.3, -0.1], h: 1.2, seed: 8, pose: lt => jump(mix(EMO.happy, { head: { turn: 0.5 } }), lt, 1.5, 120) },
      { hero: CAT, at: [0.9, 0.15], h: 0.8, seed: 2, pose: lt => jump(mix(EMO.happy, { head: { turn: 0.5 } }), lt, 1.15, 160) },
      { ...pro, at: [2.6, 0.9], pose: lt => wave(jump(mix(EMO.happy, { head: { turn: -0.2 } }), lt, 0.8, 170), lt, 1.7, 3.3) },
    ] },
];

let clock = 0;
const round = v => Math.round(v * 1000) / 1000;
export const CAPTIONS = [];
export const SHOTS = LIST.map(({ len, cap = [], ...shot }) => {
  const start = clock; clock = round(clock + len);
  for (const [a, b, str] of cap) CAPTIONS.push([round(start + a), round(start + b), str]);
  return { ...shot, start, end: clock };
});
export const DURATION = clock;
