// The character rig. One function draws any hero from a spec (cast/*.js) and a pose (pose.js).
// Three kinds share one skeleton and one face:
//   animal  big head on a small bean body (muzzle, animal nose, ears, tail, fur pattern)
//   human   same body, plus hair, beard, clothes, hats and glasses
//   object  the head IS the body (a coin, a brain, a phone) with a face, thin arms and legs
// Local space: feet at the origin, up is negative y, a hero is 100 units tall. Parts hang on pivots,
// so every pose change is a rotation or a slide, never a redraw.
import { blink, breath, sway, clamp, scatter, blend } from './core.js';
import { REST } from './pose.js';
import { drawLit } from './light.js';

const OUT = 2.3;                       // outline width, hero units
export const KINDS = ['animal', 'human', 'object'];

// ---------- drawing helpers ----------
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); };
function ink(ctx, fill, K, lw = OUT) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (K) { ctx.lineWidth = lw; ctx.strokeStyle = K; ctx.stroke(); }
}
function limb(ctx, x0, y0, cx, cy, x1, y1, w, fill, K) {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.lineWidth = w + OUT * 2; ctx.strokeStyle = K; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = fill; ctx.stroke();
}
// Head and object outlines. Every shape is centred on 0,0 with half-size rx, ry.
function shapePath(ctx, shape, rx, ry, seed = 1) {
  ctx.beginPath();
  if (shape === 'circle') { ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); return; }
  if (shape === 'box') { ctx.roundRect(-rx, -ry, rx * 2, ry * 2, Math.min(rx, ry) * 0.38); return; }
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    let x, y;
    if (shape === 'egg') { x = rx * c * (1 - 0.12 * s); y = ry * s * (s < 0 ? 1.08 : 0.92); }
    else if (shape === 'blob') {             // bumpy: brains, clouds, bushes
      const k = 1 + 0.07 * Math.sin(a * 7 + seed) + 0.04 * Math.sin(a * 13 + seed * 2);
      x = rx * c * k; y = ry * s * k;
    } else {                                 // squircle (default)
      x = rx * Math.sign(c) * Math.abs(c) ** (2 / 2.7); y = ry * Math.sign(s) * Math.abs(s) ** (2 / 2.7);
    }
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// ---------- spec defaults and layout ----------
export function fill(spec) {
  const kind = spec.kind || 'animal';
  const obj = kind === 'object';
  const s = {
    kind, outline: '#1c1410', skin: spec.fur || '#f2c49b', headShape: obj ? 'circle' : 'squircle',
    headW: 1, headH: 1, faceY: obj ? -2 : 0, faceScale: obj ? 0.95 : 1,
    noseType: kind === 'animal' ? 'animal' : kind === 'human' ? 'button' : 'none',
    ears: { type: kind === 'human' ? 'human' : 'none' }, eyePatch: { type: 'none' }, pattern: { type: 'none' }, tail: { type: 'none' },
    hair: { style: 'none' }, beard: { style: 'none' }, top: { type: 'none' }, hat: { type: 'none' }, glasses: false,
    armLen: 1, claws: 0, tuft: false, cheeks: kind !== 'object',
    ...spec,
  };
  s.fur = s.fur || s.skin;
  s.topColor = s.top.type === 'none' ? s.fur : s.top.color || '#5a7bd8';
  s.limb = s.limb || s.top.sleeve || s.top.color || s.fur;
  s.hand = s.hand || (kind === 'human' ? s.skin : s.limb);
  s.legs = s.legs || (kind === 'human' ? '#3d4a63' : s.limb);
  s.feet = s.feet || (kind === 'human' ? '#2a211c' : s.hand);
  s.lid = s.lid || s.skin;
  if (s.iris === undefined && kind === 'human') s.iris = '#6b4426';
  s.nose = s.nose || (kind === 'human' ? shade(s.skin, -0.12) : '#3a2a22');
  return s;
}
// Lighten (+) or darken (-) a #rrggbb colour.
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(clamp(k < 0 ? c * (1 + k) : c + (255 - c) * k, 0, 255));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}
export function layout(s) {
  if (s.kind === 'object') {
    const rx = 34 * s.headW, ry = 34 * s.headH, headY = -27 - ry;
    return { rx, ry, headY, neckY: headY, torso: false, shoulder: [rx * 0.93, headY + ry * 0.12], hip: [rx * 0.36, headY + ry * 0.88], legLen: -(headY + ry * 0.88) - 2 };
  }
  return { rx: 31 * s.headW, ry: 26 * s.headH, headY: -66, neckY: -42, torso: true, shoulder: [11.5, -39], hip: [7.5, -15], legLen: 13 };
}

// ---------- body parts ----------
function marks(ctx, pattern, rx, ry, seed, K) {
  const type = pattern && pattern.type;
  if (!type || type === 'none') return;
  ctx.fillStyle = pattern.color; ctx.strokeStyle = pattern.color; ctx.lineCap = 'round';
  if (type === 'spots') {
    for (const [a, b, c] of scatter(pattern.n || 14, seed)) {
      const ang = a * Math.PI * 2, r = 0.62 + b * 0.36;
      ell(ctx, Math.cos(ang) * rx * r, Math.sin(ang) * ry * r, 1.6 + c * 1.6, 1.3 + c * 1.2, a * 3); ctx.fill();
    }
  } else if (type === 'stripes') {
    ctx.lineWidth = 2.6;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const y = -ry * 0.35 + i * ry * 0.3;
      ctx.beginPath(); ctx.moveTo(side * rx * 1.05, y); ctx.lineTo(side * rx * (0.62 + i * 0.03), y + 1.2); ctx.stroke();
    }
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -ry * 1.02); ctx.lineTo(i * 4, -ry * 0.68); ctx.stroke(); }
  } else if (type === 'rim') {               // coins, plates, buttons
    shapePath(ctx, 'circle', rx * 0.82, ry * 0.82); ctx.lineWidth = 2.4; ctx.stroke();
    for (const [a] of scatter(10, seed)) { const ang = a * Math.PI * 2; ell(ctx, Math.cos(ang) * rx * 0.91, Math.sin(ang) * ry * 0.91, 1.1, 1.1); ctx.fill(); }
  } else if (type === 'folds') {             // brains
    ctx.lineWidth = 2.2;
    for (const [a, b, c] of scatter(9, seed)) {
      const x = (a - 0.5) * rx * 1.5, y = (b - 0.5) * ry * 1.4;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.bezierCurveTo(x - 3, y - 5 - c * 3, x + 3, y + 5, x + 7, y - 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, -ry * 0.95); ctx.bezierCurveTo(-3, -ry * 0.4, 3, -ry * 0.1, 0, ry * 0.15); ctx.stroke();
  } else if (type === 'screen') {           // phones, laptops, TVs: a darker panel with a notch
    ctx.beginPath(); ctx.roundRect(-rx * 0.82, -ry * 0.88, rx * 1.64, ry * 1.76, 5); ctx.fillStyle = pattern.color; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-5, -ry * 0.84, 10, 2.6, 1.3); ctx.fillStyle = K; ctx.fill();
  } else if (type === 'label') {            // jars, cans, bottles: a band with text
    ctx.fillRect(-rx * 1.1, -ry * 0.05, rx * 2.2, ry * 0.62);
    if (pattern.text) { ctx.save(); if (pattern.flip) ctx.scale(-1, 1); ctx.fillStyle = pattern.textColor || '#fff'; ctx.font = `800 ${ry * 0.36}px Toon, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pattern.text, 0, ry * 0.26); ctx.restore(); }
  }
}

function torsoPath(ctx, s) {
  const t = s.top.type, flare = t === 'dress' ? 7 : t === 'robe' || t === 'toga' ? 3 : 0, bottom = t === 'dress' ? -6 : t === 'robe' ? -3 : -12.5;
  ctx.beginPath(); ctx.moveTo(-9.5, -43);
  ctx.bezierCurveTo(-15.5, -35, -16.5 - flare, -19, -11.5 - flare, bottom);
  ctx.quadraticCurveTo(0, bottom + 4.5, 11.5 + flare, bottom);
  ctx.bezierCurveTo(16.5 + flare, -19, 15.5, -35, 9.5, -43); ctx.closePath();
}
function clothes(ctx, s, K) {
  const top = s.top, accent = top.accent || '#c8323c';
  ctx.save(); torsoPath(ctx, s); ctx.clip(); ctx.lineCap = 'round';
  if (top.type === 'none') {
    ell(ctx, 0, -23, 8.6, 10.5); ctx.fillStyle = s.belly || s.fur; ctx.fill();
    if (s.pattern.type === 'spots') { ctx.save(); ctx.translate(0, -27); marks(ctx, s.pattern, 15, 15, 11, K); ctx.restore(); }
  } else if (top.type === 'tshirt') {
    ell(ctx, 0, -44, 6.5, 4.5); ctx.fillStyle = s.skin; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = K; ctx.stroke();
    if (top.print) { ell(ctx, 0, -28, 5, 5); ctx.fillStyle = accent; ctx.fill(); }
  } else if (top.type === 'suit') {
    ctx.beginPath(); ctx.moveTo(-6, -44); ctx.lineTo(0, -27); ctx.lineTo(6, -44); ctx.closePath(); ctx.fillStyle = top.shirt || '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1.8, -41); ctx.lineTo(1.8, -41); ctx.lineTo(2.6, -30); ctx.lineTo(0, -27.5); ctx.lineTo(-2.6, -30); ctx.closePath(); ctx.fillStyle = accent; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 6.5, -44); ctx.lineTo(side * 1.2, -26); ctx.stroke(); }
    ell(ctx, 0, -21, 1.1, 1.1); ctx.fillStyle = K; ctx.fill(); ell(ctx, 0, -16.5, 1.1, 1.1); ctx.fill();
  } else if (top.type === 'toga') {
    ctx.beginPath(); ctx.moveTo(-14, -46); ctx.lineTo(-5, -46); ctx.lineTo(18, -8); ctx.lineTo(9, -8); ctx.closePath(); ctx.fillStyle = accent; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = shade(top.color || '#f4efe4', -0.18);
    for (const x of [-8, -3, 3]) { ctx.beginPath(); ctx.moveTo(x, -30); ctx.quadraticCurveTo(x - 1.5, -20, x + 1, -9); ctx.stroke(); }
  } else if (top.type === 'dress' || top.type === 'robe') {
    ctx.fillStyle = accent; ctx.fillRect(-20, -24, 40, 3.2);
    ell(ctx, 0, -44, 5.5, 4); ctx.fillStyle = s.skin; ctx.fill();
  } else if (top.type === 'apron') {
    ctx.beginPath(); ctx.roundRect(-8, -36, 16, 30, 3); ctx.fillStyle = accent; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = K; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-4.5, -27, 9, 5, 1.5); ctx.stroke();
  } else if (top.type === 'spacesuit') {
    ctx.beginPath(); ctx.roundRect(-7, -36, 14, 10, 2); ctx.fillStyle = '#cfd8e3'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = K; ctx.stroke();
    for (const [x, c] of [[-3.5, '#e2493f'], [0, '#3c8de0'], [3.5, '#ffd24a']]) { ell(ctx, x, -31, 1.4, 1.4); ctx.fillStyle = c; ctx.fill(); }
  }
  ctx.restore();
}

function arm(ctx, side, p, s, L0, C, K, by) {
  const L = 28 * s.armLen, w = 7, sx = side * L0.shoulder[0], sy = L0.shoulder[1] + by;
  const dx = side * Math.sin(p.a), dy = Math.cos(p.a), ex = sx + dx * L, ey = sy + dy * L;
  const px = side * Math.cos(p.a), py = -Math.sin(p.a);
  const cx = (sx + ex) / 2 + px * p.bend * L * 0.4, cy = (sy + ey) / 2 + py * p.bend * L * 0.4;
  limb(ctx, sx, sy, cx, cy, ex, ey, s.kind === 'object' ? 4.6 : w, C('limb'), K);
  if (s.claws) {
    ctx.lineWidth = 1.7; ctx.strokeStyle = K;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(ex + px * i * 2.4, ey + py * i * 2.4);
      ctx.quadraticCurveTo(ex + dx * 5 + px * i * 3.4, ey + dy * 5 + py * i * 3.4, ex + dx * 7.5 + px * (i * 3 - 1.5), ey + dy * 7.5 + py * (i * 3 - 1.5));
      ctx.stroke();
    }
  }
  if (s.gloves) { ell(ctx, ex, ey, 5.6, 5.6); ink(ctx, C('hand') === s.hand ? '#ffffff' : C('hand'), K); }
  else { ell(ctx, ex, ey, w * 0.66, w * 0.66); ink(ctx, C('hand'), K); }
}

// ---------- head parts ----------
function hairBack(ctx, s, rx, ry, K, swing = 0) {
  const h = s.hair;
  if (h.style !== 'long') return;
  ctx.save(); ctx.transform(1, 0, swing * 0.8, 1, 0, 0);
  ctx.beginPath(); ctx.moveTo(-rx * 1.08, -ry * 0.3);
  ctx.bezierCurveTo(-rx * 1.2, ry * 0.8, -rx * 1.05, ry * 1.35, -rx * 0.6, ry * 1.42);
  ctx.lineTo(rx * 0.6, ry * 1.42);
  ctx.bezierCurveTo(rx * 1.05, ry * 1.35, rx * 1.2, ry * 0.8, rx * 1.08, -ry * 0.3); ctx.closePath();
  ink(ctx, h.color, K);
  ctx.restore();
}
// A lighter band across the hair, clipped to the path that was just inked.
function sheen(ctx, color, rx, ry) {
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.ellipse(-rx * 0.2, -ry * 0.98, rx * 0.62, ry * 0.13, -0.12, 0, Math.PI * 2); ctx.fillStyle = shade(color, 0.26); ctx.globalAlpha = 0.75; ctx.fill();
  ctx.restore();
}
function hairFront(ctx, s, rx, ry, K, swing = 0, turn = 0) {
  const h = s.hair, st = h.style;
  if (st === 'none' || !st) return;
  ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(turn * 2.4, 0);
  hairFrontShapes(ctx, s, rx, ry, K, swing, turn);
  ctx.restore();
}
function hairFrontShapes(ctx, s, rx, ry, K, swing, turn) {
  const h = s.hair, st = h.style;
  if (st === 'sides') {
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * rx * 0.93, -ry * 0.25, rx * 0.16, ry * 0.36, side * 0.2, 0, Math.PI * 2); ink(ctx, h.color, K); }
    return;
  }
  if (st === 'curly') {
    const n = 11;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (1.06 + 0.88 * i / n), r = 8.5 + ((i * 7) % 3);
      ell(ctx, Math.cos(a) * rx * 0.97, Math.sin(a) * ry * 0.98 - 2, r, r * 0.92); ink(ctx, h.color, K);
    }
    ell(ctx, 0, -ry * 0.78, rx * 0.7, ry * 0.32); ctx.fillStyle = h.color; ctx.fill();
    return;
  }
  // a cap of hair over the top of the head with a scalloped fringe
  const fringeY = -ry * 0.68, peaks = st === 'spiky' ? 7 : 4;
  const capPath = () => {
    ctx.moveTo(-rx * 1.04, -ry * 0.05);
    if (st === 'spiky') {
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (1 + i / 10), out = i % 2 ? 1.32 : 1.04;
        ctx.lineTo(Math.cos(a) * rx * out + (i % 2 ? swing * 9 : 0), Math.sin(a) * ry * out);
      }
    } else ctx.ellipse(0, 0, rx * 1.05, ry * 1.08, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(rx * 1.04, -ry * 0.05);
    ctx.quadraticCurveTo(rx * 0.95, fringeY + 2, rx * 0.8, fringeY);
    for (let i = 0; i < peaks; i++) {
      const x0 = rx * 0.8 - (rx * 1.6 * i) / peaks, x1 = rx * 0.8 - (rx * 1.6 * (i + 1)) / peaks;
      ctx.quadraticCurveTo((x0 + x1) / 2, fringeY + (h.part === i ? -7 : 4.5), x1, fringeY);
    }
    ctx.quadraticCurveTo(-rx * 0.95, fringeY + 2, -rx * 1.04, -ry * 0.05); ctx.closePath();
  };
  if (st === 'bun') { ell(ctx, swing * 12, -ry * 1.18, 9.5, 8.5); ink(ctx, h.color, K); }
  ctx.beginPath(); capPath(); ink(ctx, h.color, K);
  ctx.beginPath(); capPath(); sheen(ctx, h.color, rx, ry);
  if (st === 'long') for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * rx * 1.04, -ry * 0.1); ctx.quadraticCurveTo(side * rx * 1.12 + swing * 6, ry * 0.5, side * rx * 0.98 + swing * 16, ry * 0.95); ctx.lineTo(side * rx * 0.86, ry * 0.2); ctx.closePath(); ink(ctx, h.color, K); }
}
function hat(ctx, s, rx, ry, K, t) {
  const h = s.hat, c = h.color, top = -ry;
  if (!h.type || h.type === 'none') return;
  ctx.lineJoin = 'round';
  if (h.type === 'cap') {
    ctx.beginPath(); ctx.ellipse(0, top + ry * 0.42, rx * 1.02, ry * 0.62, 0, Math.PI, Math.PI * 2); ctx.closePath(); ink(ctx, c || '#d94141', K);
    ctx.beginPath(); ctx.moveTo(-rx * 0.2, top + ry * 0.4); ctx.quadraticCurveTo(rx * 1.1, top + ry * 0.25, rx * 1.45, top + ry * 0.5); ctx.quadraticCurveTo(rx * 0.9, top + ry * 0.6, -rx * 0.2, top + ry * 0.52); ctx.closePath(); ink(ctx, shade(c || '#d94141', -0.18), K);
  } else if (h.type === 'crown') {
    ctx.beginPath(); ctx.moveTo(-rx * 0.62, top + 4); ctx.lineTo(-rx * 0.66, top - 13);
    [[-0.33, -5], [0, -16], [0.33, -5], [0.66, -13]].forEach(([x, y]) => ctx.lineTo(rx * x, top + y));
    ctx.lineTo(rx * 0.62, top + 4); ctx.closePath(); ink(ctx, c || '#ffcc33', K);
    for (const x of [-0.33, 0, 0.33]) { ell(ctx, rx * x, top - 1.5, 1.8, 1.8); ctx.fillStyle = '#e2493f'; ctx.fill(); }
  } else if (h.type === 'tophat') {
    ctx.beginPath(); ctx.roundRect(-rx * 0.55, top - 30, rx * 1.1, 32, 3); ink(ctx, c || '#26222a', K);
    ctx.fillStyle = h.accent || '#c8323c'; ctx.fillRect(-rx * 0.55 + 1, top - 6, rx * 1.1 - 2, 4.5);
    ctx.beginPath(); ctx.roundRect(-rx * 0.95, top - 1, rx * 1.9, 6, 3); ink(ctx, c || '#26222a', K);
  } else if (h.type === 'wreath') {
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.5 + side * (0.12 + i * 0.07)), x = Math.cos(a) * rx * 1.0, y = Math.sin(a) * ry * 0.98 + 3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + side * 1.9);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -3.2, 9, 0); ctx.quadraticCurveTo(4, 3.2, 0, 0); ink(ctx, c || '#7cb342', K, 1.3); ctx.restore();
    }
  } else if (h.type === 'helmet') {
    ctx.beginPath(); ctx.ellipse(0, top + ry * 0.55, rx * 1.08, ry * 0.75, 0, Math.PI, Math.PI * 2); ctx.closePath(); ink(ctx, c || '#c9a640', K);
    ctx.beginPath(); ctx.moveTo(-rx * 0.5, top - 4); ctx.quadraticCurveTo(0, top - 22, rx * 0.5, top - 4); ctx.lineTo(rx * 0.3, top - 2); ctx.quadraticCurveTo(0, top - 13, -rx * 0.3, top - 2); ctx.closePath(); ink(ctx, h.accent || '#c8323c', K);
  } else if (h.type === 'hardhat') {
    ctx.beginPath(); ctx.ellipse(0, top + ry * 0.4, rx * 0.95, ry * 0.7, 0, Math.PI, Math.PI * 2); ctx.closePath(); ink(ctx, c || '#ffc933', K);
    ctx.beginPath(); ctx.roundRect(-rx * 1.15, top + ry * 0.36, rx * 2.3, 5, 2.5); ink(ctx, c || '#ffc933', K);
  } else if (h.type === 'beanie') {
    ctx.beginPath(); ctx.ellipse(0, top + ry * 0.48, rx * 1.04, ry * 0.8, 0, Math.PI, Math.PI * 2); ctx.closePath(); ink(ctx, c || '#3c8de0', K);
    ctx.beginPath(); ctx.roundRect(-rx * 1.06, top + ry * 0.3, rx * 2.12, 7, 3); ink(ctx, shade(c || '#3c8de0', 0.2), K);
    ell(ctx, 0, top - ry * 0.32, 5, 5); ink(ctx, shade(c || '#3c8de0', 0.35), K);
  } else if (h.type === 'bow') {
    ctx.save(); ctx.translate(-rx * 0.55, top + 2); ctx.rotate(-0.3 + Math.sin(t * 2) * 0.03);
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 8, -9, side * 12, -2); ctx.quadraticCurveTo(side * 12, 7, 0, 0); ink(ctx, c || '#ff6fae', K, 1.6); }
    ell(ctx, 0, 0, 3, 3); ink(ctx, c || '#ff6fae', K, 1.6); ctx.restore();
  } else if (h.type === 'headset') {
    ctx.beginPath(); ctx.ellipse(0, -2, rx * 1.08, ry * 1.08, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 3.4; ctx.strokeStyle = K; ctx.stroke();
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(side * rx * 1.04 - 4, -6, 8, 12, 3); ink(ctx, c || '#2c2c34', K); }
  }
}

// Where an eye sits and how narrow it is once the head turns: the eye on the far side is foreshortened.
const TURN = 8;
const eyeAt = (side, turn) => [side * 12.5 * (1 - 0.1 * Math.abs(turn)) + turn * TURN, 1 - 0.26 * Math.max(0, side * turn)];
function eye(ctx, side, pose, s, open) {
  const [cx, k] = eyeAt(side, pose.head.turn), cy = -1, rx = 8.6 * k, ry = 10 * Math.max(1, open);
  ell(ctx, cx, cy, rx, ry); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.save(); ell(ctx, cx, cy, rx, ry); ctx.clip();
  const pu = pose.eyes.pupil, px = cx + pose.eyes.lx * 3 * k, py = cy + pose.eyes.ly * 3;
  if (s.iris) {
    const g = ctx.createRadialGradient(px, py + 2.2, 0.5, px, py, 6 * pu);
    g.addColorStop(0, shade(s.iris, 0.38)); g.addColorStop(0.7, s.iris); g.addColorStop(1, shade(s.iris, -0.5));
    ell(ctx, px, py, 5.7 * pu * k, 6.1 * pu); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = shade(s.iris, -0.62); ctx.stroke();
    ell(ctx, px, py, 2.9 * pu * k, 3.2 * pu); ctx.fillStyle = '#15100c'; ctx.fill();
  } else { ell(ctx, px, py, 5.2 * pu * k, 5.6 * pu); ctx.fillStyle = '#15100c'; ctx.fill(); }
  ell(ctx, px - 1.9 * k, py - 2.2, 1.9 * k, 1.9); ctx.fillStyle = '#fff'; ctx.fill();
  ell(ctx, px + 2 * k, py + 2.3, 0.85, 0.85); ctx.fill();
  ell(ctx, cx, cy - ry * 1.25, rx * 1.3, ry * 0.62); ctx.fillStyle = 'rgba(52,34,80,0.2)'; ctx.fill();   // shadow under the upper lid
  const lid = clamp(1 - open, 0, 1);
  if (lid > 0.01) {
    const edge = cy - ry + lid * ry * 1.9;
    ctx.fillStyle = s.lid; ctx.fillRect(cx - rx - 1, cy - ry - 1, rx * 2 + 2, edge - (cy - ry - 1));
    ctx.beginPath(); ctx.moveTo(cx - rx, edge); ctx.lineTo(cx + rx, edge); ctx.lineWidth = 2.1; ctx.strokeStyle = s.outline; ctx.stroke();
  }
  ctx.restore();
  ell(ctx, cx, cy, rx, ry); ctx.lineWidth = 1.5; ctx.strokeStyle = s.outline; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = 2.7; ctx.stroke();   // the lash line
}

function face(ctx, s, pose, seed, t, rx, ry) {
  const turn = pose.head.turn, fx = turn * TURN, K = s.outline;
  ctx.save(); shapePath(ctx, s.headShape, rx, ry, seed); ctx.clip();
  if (s.face) { ell(ctx, fx * 0.6, 3, rx * 0.8, ry * 0.76); ctx.fillStyle = s.face; ctx.fill(); }
  marks(ctx, s.pattern, rx, ry, seed + 3, K);
  for (const side of [-1, 1]) {
    if (s.eyePatch.type === 'slant') { ell(ctx, side * 16.5 + fx, 2.5, 11.5, 6.6, side * 0.5); ctx.fillStyle = s.eyePatch.color; ctx.fill(); }
    if (s.eyePatch.type === 'round') { ell(ctx, side * 13.5 + fx, 0, 10.4, 12.4, side * -0.32); ctx.fillStyle = s.eyePatch.color; ctx.fill(); }
  }
  ctx.restore();

  ctx.save(); ctx.translate(0, s.faceY); ctx.scale(s.faceScale, s.faceScale);
  const open = clamp(pose.eyes.open * blink(t, seed), 0, 1.25);
  for (const side of [-1, 1]) {
    if (open < 0.1) {
      const [ex, k] = eyeAt(side, turn);
      ctx.beginPath(); ctx.moveTo(ex - 7.5 * k, 0); ctx.quadraticCurveTo(ex, 4.5, ex + 7.5 * k, 0);
      ctx.lineWidth = 2.4; ctx.strokeStyle = K; ctx.stroke();
    } else eye(ctx, side, pose, s, open);
  }
  if (s.cheeks) for (const side of [-1, 1]) { ell(ctx, side * 19 + fx, 12, 4.6, 2.6); ctx.fillStyle = 'rgba(255,110,120,0.28)'; ctx.fill(); }
  if (s.muzzle) { ell(ctx, fx * 1.3, 12, 10.5, 7.6); ctx.fillStyle = s.muzzle; ctx.fill(); }

  const b = s.beard;
  if (b.style === 'full' || b.style === 'goatee') {
    const w = b.style === 'full' ? rx * 0.98 : 9;
    ctx.beginPath(); ctx.moveTo(-w + fx, b.style === 'full' ? 0 : 14);
    ctx.quadraticCurveTo(-w * 0.95 + fx, ry * 1.12, fx, ry * (b.style === 'full' ? 1.28 : 1.2));
    ctx.quadraticCurveTo(w * 0.95 + fx, ry * 1.12, w + fx, b.style === 'full' ? 0 : 14);
    ctx.quadraticCurveTo(w * 0.55 + fx, 10, fx, 11); ctx.quadraticCurveTo(-w * 0.55 + fx, 10, -w + fx, b.style === 'full' ? 0 : 14);
    ink(ctx, b.color, K);
  } else if (b.style === 'stubble') {
    ctx.fillStyle = b.color || 'rgba(60,40,30,0.5)';
    for (const [a, c] of scatter(26, seed + 5)) { const x = (a - 0.5) * rx * 1.3, y = 12 + c * 10; if (Math.abs(x) < rx * (0.75 - (y - 12) * 0.02)) { ell(ctx, x + fx, y, 0.7, 0.7); ctx.fill(); } }
  }

  const nx = fx * 1.45, ny = 8.2;
  if (s.noseType === 'animal') {
    ctx.beginPath(); ctx.moveTo(nx - 3.4, ny - 1.6); ctx.quadraticCurveTo(nx, ny - 2.8, nx + 3.4, ny - 1.6); ctx.quadraticCurveTo(nx + 2, ny + 2.6, nx, ny + 2.8); ctx.quadraticCurveTo(nx - 2, ny + 2.6, nx - 3.4, ny - 1.6);
    ctx.fillStyle = s.nose; ctx.fill();
  } else if (s.noseType === 'button') {
    ell(ctx, nx, ny, 3.6, 2.8); ctx.fillStyle = s.nose; ctx.fill();
    ctx.beginPath(); ctx.arc(nx, ny - 0.6, 3.2, 0.25 * Math.PI, 0.75 * Math.PI); ctx.lineWidth = 1.4; ctx.strokeStyle = K; ctx.stroke();
  }
  if (b.style === 'mustache' || b.style === 'full') {
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(nx, ny + 3); ctx.quadraticCurveTo(nx + side * 6, ny + 0.5, nx + side * 9.5, ny + 5.5); ctx.quadraticCurveTo(nx + side * 5, ny + 7, nx, ny + 4.6); ink(ctx, b.color, K, 1.4); }
  }

  const m = pose.mouth, mw = 5.6 * m.w, my = 15, bend = m.curve * 4.6;
  if (m.open > 0.06) {
    ctx.beginPath(); ctx.moveTo(nx - mw, my - bend * 0.5); ctx.quadraticCurveTo(nx, my + bend * 0.5, nx + mw, my - bend * 0.5);
    ctx.quadraticCurveTo(nx, my + bend * 0.5 + m.open * 9, nx - mw, my - bend * 0.5); ctx.closePath();
    ctx.save(); ctx.fillStyle = '#3b171b'; ctx.fill(); ctx.clip();
    ell(ctx, nx, my + m.open * 5.4, mw * 0.7, m.open * 3); ctx.fillStyle = '#e06a7c'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(nx - mw * 0.6, my - bend * 0.5 - 1, mw * 1.2, 2);
    ctx.restore(); ctx.lineWidth = 1.6; ctx.strokeStyle = K; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(nx - mw, my - bend * 0.5); ctx.quadraticCurveTo(nx, my + bend, nx + mw, my - bend * 0.5);
    ctx.lineWidth = 1.8; ctx.strokeStyle = K; ctx.stroke();
  }

  if (pose.tear > 0.02) for (const side of [-1, 1]) {
    const x = side * 19 + fx, y = 10 + ((t * 9 + seed * 3) % 6);
    ctx.globalAlpha = clamp(pose.tear); ctx.beginPath(); ctx.moveTo(x, y - 4.5); ctx.quadraticCurveTo(x + 3, y, x, y + 2.4); ctx.quadraticCurveTo(x - 3, y, x, y - 4.5);
    ctx.fillStyle = '#8fd3ff'; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = K; ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (pose.sweat > 0.02) {
    const x = 25, y = -16 + ((t * 7) % 4);
    ctx.globalAlpha = clamp(pose.sweat); ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.quadraticCurveTo(x + 3.4, y, x, y + 2.8); ctx.quadraticCurveTo(x - 3.4, y, x, y - 5);
    ctx.fillStyle = '#bfe6ff'; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = K; ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function brows(ctx, s, pose) {
  if (s.brows === false) return;
  const open = pose.eyes.open;
  ctx.save(); ctx.translate(0, s.faceY); ctx.scale(s.faceScale, s.faceScale);
  for (const side of [-1, 1]) {
    const ang = side < 0 ? pose.brows.l : pose.brows.r, [ex, k] = eyeAt(side, pose.head.turn);
    ctx.save(); ctx.translate(ex, -15.5 - pose.brows.h * 3 - Math.max(0, open - 1) * 8); ctx.rotate(-side * ang * 0.55);
    ctx.beginPath(); ctx.moveTo(-6 * k, 0.8); ctx.quadraticCurveTo(0, -1.4, 6 * k, 0.8);
    if (s.browColor && s.browColor !== s.outline) { ctx.lineWidth = 5; ctx.strokeStyle = s.outline; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = s.browColor; }
    else { ctx.lineWidth = 3; ctx.strokeStyle = s.outline; }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function glasses(ctx, s, pose) {
  if (!s.glasses) return;
  const fx = pose.head.turn * TURN, K = s.outline, round = s.glasses !== 'square';
  ctx.save(); ctx.translate(0, s.faceY); ctx.scale(s.faceScale, s.faceScale); ctx.lineWidth = 2.2; ctx.strokeStyle = K;
  for (const side of [-1, 1]) {
    const [ex, k] = eyeAt(side, pose.head.turn);
    ctx.beginPath(); round ? ctx.ellipse(ex, -1, 10.5 * k, 10.5, 0, 0, Math.PI * 2) : ctx.roundRect(ex - 11 * k, -10, 22 * k, 18, 4);
    ctx.fillStyle = 'rgba(200,230,255,0.18)'; ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-2 + fx, -2); ctx.quadraticCurveTo(fx, -4, 2 + fx, -2); ctx.stroke();
  ctx.restore();
}

// ---------- the whole hero ----------
// o: {x, y, size = 600, flip, seed = 1, flat (one colour: a silhouette for diagram cards), shadow = true,
//     dyn: {swing, lift} follow-through from motion.js, light: overrides for the set's light}
export function drawHero(ctx, rawSpec, rawPose, t, o = {}) {
  const s = fill(rawSpec), L0 = layout(s), pose = blend(REST, rawPose || {}, 1);
  if (o.flip && s.pattern.text) s.pattern = { ...s.pattern, flip: true };   // keep printed text readable
  const size = o.size ?? 600, sc = size / 100, seed = o.seed ?? 1;
  const C = k => o.flat || s[k], K = o.flat ? o.flatOutline || '#15100c' : s.outline;
  const br = breath(t, seed), sw = sway(t, seed), by = -br * 0.6;
  const { rx, ry } = L0;
  const swing = (o.dyn && o.dyn.swing) || 0, lift = (o.dyn && o.dyn.lift) || 0;
  const gx = (o.x ?? 0) + pose.x, gy = o.y ?? 0, air = clamp(-pose.y / 420);
  const ground = ctx.getTransform().transformPoint(new DOMPoint(gx, gy));
  ctx.save();
  ctx.translate(gx, gy + pose.y);
  ctx.scale(o.flip ? -sc : sc, sc);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (o.shadow !== false) { ell(ctx, 0, -pose.y / sc + 0.5, Math.max(21, rx * 0.75) * (1 - 0.45 * air), 3.4 * (1 - 0.45 * air)); ctx.fillStyle = `rgba(10,8,20,${0.22 * (1 - 0.5 * air)})`; ctx.fill(); }
  ctx.rotate(pose.rot);
  ctx.scale(1 + pose.squash * 0.55 + (s.kind === 'object' ? br * 0.008 : 0), 1 - pose.squash - (s.kind === 'object' ? br * 0.008 : 0));

  const back = c => {
    if (s.tail.type === 'long') {
      const a = pose.tail + sw * 0.12 - swing * 1.6;
      limb(c, 4, -16, 26, -10 - a * 10, 31 + a * 4, -34 - a * 16, 5, o.flat || s.tail.color || s.fur, K);
    } else if (s.tail.type === 'stub') { ell(c, 12, -17, 5, 4.4); ink(c, o.flat || s.tail.color || s.fur, K); }
    for (const [side, a] of [[-1, pose.legL], [1, pose.legR]]) {
      const hx = side * L0.hip[0], hy = L0.hip[1], len = L0.legLen, fx = hx + Math.sin(a) * len, fy = hy + Math.cos(a) * len;
      limb(c, hx, hy, (hx + fx) / 2, (hy + fy) / 2, fx, fy, s.kind === 'object' ? 5 : 8.6, C('legs'), K);
      ell(c, fx + side * 1.6, fy + 0.6, s.kind === 'human' ? 6.8 : 6.4, 3.6); ink(c, C('feet'), K);
    }
  };
  const torso = L0.torso && (c => {
    c.save(); c.translate(0, by);
    torsoPath(c, s); ink(c, C('topColor'), K);
    if (!o.flat) clothes(c, s, K);
    c.restore();
  });
  // head (for objects: the whole body), on the neck pivot
  const head = c => {
    c.save();
    c.translate(pose.head.dx, L0.neckY + (L0.torso ? by : 0) + pose.head.dy); c.rotate(pose.head.tilt + sw * 0.014); c.translate(0, L0.headY - L0.neckY);
    const turn = clamp(pose.head.turn, -1, 1);
    if (!o.flat) hairBack(c, s, rx, ry, K, swing);
    const ears = s.ears;
    for (const side of [-1, 1]) {
      const far = Math.max(0, side * turn);                        // this ear is on the side the head turns to
      if (ears.type === 'round' || ears.type === 'pointy') {
        c.save(); c.translate(side * rx * 0.68 - turn * 2.5, -ry * 0.72); c.rotate(swing * 0.9 + side * lift * 0.22); c.translate(-side * rx * 0.68, ry * 0.72);
        if (ears.type === 'round') {
          ell(c, side * rx * 0.76, -ry * 0.78, 9.4, 9.4); ink(c, o.flat || ears.color || s.fur, K);
          if (!o.flat && ears.inner) { ell(c, side * rx * 0.76, -ry * 0.76, 5, 5); c.fillStyle = ears.inner; c.fill(); }
        } else {
          c.beginPath(); c.moveTo(side * rx * 0.36, -ry * 0.86); c.lineTo(side * rx * 0.86, -ry * 1.5); c.lineTo(side * rx * 0.99, -ry * 0.5); c.closePath();
          ink(c, o.flat || ears.color || s.fur, K);
          if (!o.flat && ears.inner) { c.beginPath(); c.moveTo(side * rx * 0.56, -ry * 0.88); c.lineTo(side * rx * 0.83, -ry * 1.27); c.lineTo(side * rx * 0.9, -ry * 0.74); c.closePath(); c.fillStyle = ears.inner; c.fill(); }
        }
        c.restore();
      } else if (ears.type === 'human') {
        const ex = side * rx * (0.97 - far * 0.1) - turn * 2.2, k = 1 - far * 0.45;
        ell(c, ex, 3, 5.4 * k, 7); ink(c, o.flat || s.skin, K);
        if (!o.flat && k > 0.7) { c.beginPath(); c.arc(ex, 3, 2.8, side < 0 ? 0.6 * Math.PI : -0.4 * Math.PI, side < 0 ? 1.4 * Math.PI : 0.4 * Math.PI); c.lineWidth = 1.2; c.strokeStyle = K; c.stroke(); }
      }
    }
    shapePath(c, s.headShape, rx, ry, seed); ink(c, C(s.kind === 'human' ? 'skin' : 'fur'), K);
    if (!o.flat && s.shine !== false) {
      c.save(); shapePath(c, s.headShape, rx, ry, seed); c.clip();
      ell(c, -rx * 0.45, -ry * 0.62, rx * 0.32, ry * 0.14, -0.5); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill();
      c.restore();
    }
    if (!o.flat && s.tuft) {
      c.lineWidth = 2.2; c.strokeStyle = K;
      for (const [x, h, lean] of [[-4, 6, -3], [0, 8, 0.5], [4, 6, 3.5]]) { c.beginPath(); c.moveTo(x, -ry + 0.6); c.quadraticCurveTo(x + lean * 0.4 + swing * 5, -ry - h * 0.6, x + lean + swing * 16, -ry - h); c.stroke(); }
    }
    if (!o.flat) {
      face(c, s, pose, seed, t, rx, ry);
      hairFront(c, s, rx, ry, K, swing, turn);
      brows(c, s, pose);
      glasses(c, s, pose);
    }
    c.save(); c.translate(0, -ry - Math.max(0, lift) * 2.4); c.rotate(swing * 0.4); c.translate(0, ry);
    hat(c, o.flat ? { ...s, hat: { ...s.hat, color: o.flat, accent: o.flat } } : s, rx, ry, K, t);
    c.restore();
    c.restore();
  };
  // The head is always in front of the arms: an arm lies over the body but never over the chin, beard or face.
  const arms = c => {
    arm(c, -1, pose.armL, s, L0, C, K, L0.torso ? by : 0);
    arm(c, 1, pose.armR, s, L0, C, K, L0.torso ? by : 0);
  };

  if (o.flat) { back(ctx); if (torso) torso(ctx); arms(ctx); head(ctx); }
  else {
    const k = Math.max(1, s.headW, s.headH, s.armLen);
    drawLit(ctx, [-88 * k, -158 * k, 88 * k, 14],
      [{ draw: back }, torso && { draw: torso }, { draw: arms }, { draw: head, casts: true }],
      { outline: K, ground: o.shadow === false ? null : [ground.x, ground.y], lift: air, light: o.light, seed });
  }
  ctx.restore();
}

// World point of an actor's face centre, for close-ups.
export function headOf(a) {
  const L0 = layout(fill(a.hero)), sc = (a.size ?? 600) / 100;
  return [a.at[0], a.at[1] + L0.headY * sc];
}

// Spec linter: unknown option values are the usual way a hero silently draws wrong.
const OPTIONS = {
  kind: KINDS, headShape: ['squircle', 'circle', 'box', 'egg', 'blob'], noseType: ['animal', 'button', 'none'],
  'ears.type': ['none', 'round', 'pointy', 'human'], 'eyePatch.type': ['none', 'slant', 'round'],
  'pattern.type': ['none', 'spots', 'stripes', 'rim', 'folds', 'screen', 'label'], 'tail.type': ['none', 'stub', 'long'],
  'hair.style': ['none', 'short', 'curly', 'spiky', 'bun', 'long', 'sides'], 'beard.style': ['none', 'stubble', 'mustache', 'goatee', 'full'],
  'top.type': ['none', 'tshirt', 'suit', 'toga', 'dress', 'robe', 'apron', 'spacesuit'],
  'hat.type': ['none', 'cap', 'crown', 'tophat', 'wreath', 'helmet', 'hardhat', 'beanie', 'bow', 'headset'],
};
export function checkSpec(spec) {
  const bad = [], s = fill(spec);
  for (const [path, allowed] of Object.entries(OPTIONS)) {
    const v = path.split('.').reduce((o, k) => (o ? o[k] : undefined), s);
    if (v !== undefined && !allowed.includes(v)) bad.push(`${spec.name || 'hero'}: ${path} "${v}" is not one of ${allowed.join(', ')}`);
  }
  for (const k of ['outline', 'fur', 'skin', 'limb', 'hand', 'legs', 'feet']) if (s[k] && !/^#[0-9a-f]{6}$/i.test(s[k])) bad.push(`${spec.name || 'hero'}: ${k} must be #rrggbb, got "${s[k]}"`);
  if (!spec.name) bad.push('hero spec needs a name');
  return bad;
}
