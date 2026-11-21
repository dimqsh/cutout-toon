// Props in the same ink style as the heroes: flat fill, one highlight, thick dark outline.
// drawProp(ctx, name, x, y, size, opts) draws a prop centred on x, y (its bottom for standing props),
// `size` is its height in pixels. Use ink() and inkPath() to draw your own prop in the same style.
import { clamp } from './core.js';
import { drawLit } from './light.js';

export const INK = '#1c1410';
const OUT = 2.6;          // outline, in prop units (a prop is 100 units tall)

export function ink(ctx, fill, lw = OUT, K = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = K; ctx.stroke();
}
// A soft highlight clipped to the current path: what makes flat shapes read as "drawn".
function shine(ctx, x, y, rx, ry, a = 0.25) {
  ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill(); ctx.restore();
}
const ell = (ctx, x, y, rx, ry, r = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); };
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
function label(ctx, str, x, y, size, color = INK, weight = 800) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px Toon, 'Arial Black', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y);
}

// Each prop draws in a 100-unit box: x -50..50, y -100..0 (standing) unless noted.
const PROPS = {
  coin(ctx, o) {
    const c = o.color || '#ffcc33';
    ell(ctx, 0, -50, 46, 46); ink(ctx, '#d99a1e'); ell(ctx, -2, -52, 44, 44); ink(ctx, c); ell(ctx, -2, -52, 44, 44); shine(ctx, -18, -72, 16, 8);
    ell(ctx, -2, -52, 34, 34); ctx.lineWidth = 2.4; ctx.strokeStyle = '#d99a1e'; ctx.stroke();
    label(ctx, o.text || '$', -2, -50, 44, '#b87a12');
  },
  moneybag(ctx, o) {
    ctx.beginPath(); ctx.moveTo(-14, -76); ctx.bezierCurveTo(-50, -62, -50, -2, 0, -2); ctx.bezierCurveTo(50, -2, 50, -62, 14, -76); ctx.closePath(); ink(ctx, o.color || '#c9a26b');
    ctx.beginPath(); ctx.moveTo(-14, -76); ctx.bezierCurveTo(-50, -62, -50, -2, 0, -2); ctx.bezierCurveTo(50, -2, 50, -62, 14, -76); ctx.closePath(); shine(ctx, -20, -45, 10, 18);
    ctx.beginPath(); ctx.moveTo(-14, -76); ctx.lineTo(-22, -96); ctx.quadraticCurveTo(0, -88, 22, -96); ctx.lineTo(14, -76); ctx.closePath(); ink(ctx, o.color || '#c9a26b');
    rr(ctx, -17, -80, 34, 7, 3.5); ink(ctx, '#7b5a35');
    label(ctx, o.text || '$', 0, -36, 40, '#6b4a26');
  },
  phone(ctx, o) {
    rr(ctx, -27, -100, 54, 100, 10); ink(ctx, o.color || '#2b2d36');
    rr(ctx, -22, -94, 44, 88, 6); ctx.fillStyle = o.screen || '#5ab0ff'; ctx.fill(); rr(ctx, -22, -94, 44, 88, 6); shine(ctx, -10, -80, 14, 30, 0.2);
    rr(ctx, -6, -91, 12, 3, 1.5); ctx.fillStyle = INK; ctx.fill();
    if (o.text) label(ctx, o.text, 0, -50, 18, '#fff');
  },
  book(ctx, o) {
    const c = o.color || '#d9534f';
    rr(ctx, -40, -76, 80, 62, 4); ink(ctx, '#f7f1e3');
    rr(ctx, -44, -80, 80, 62, 5); ink(ctx, c); rr(ctx, -44, -80, 80, 62, 5); shine(ctx, -20, -66, 20, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-44 + 2, -78, 8, 58);
    if (o.text) label(ctx, o.text, 2, -49, 16, '#fff');
  },
  calendar(ctx, o) {
    rr(ctx, -40, -88, 80, 84, 7); ink(ctx, '#ffffff');
    ctx.save(); rr(ctx, -40, -88, 80, 84, 7); ctx.clip(); ctx.fillStyle = o.color || '#e2493f'; ctx.fillRect(-40, -88, 80, 24); ctx.restore();
    rr(ctx, -40, -88, 80, 84, 7); ink(ctx, null);
    for (const x of [-20, 20]) { rr(ctx, x - 3, -96, 6, 14, 3); ink(ctx, '#9aa3ad'); }
    label(ctx, (o.text || 'JUNE').toUpperCase(), 0, -75, 15, '#fff');
    label(ctx, String(o.day ?? 1), 0, -34, 38);
  },
  clock(ctx, o, t) {
    ell(ctx, 0, -50, 45, 45); ink(ctx, o.color || '#ffffff'); ell(ctx, 0, -50, 45, 45); shine(ctx, -16, -72, 14, 7);
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 36, -50 + Math.sin(a) * 36); ctx.lineTo(Math.cos(a) * 40, -50 + Math.sin(a) * 40); ctx.stroke(); }
    const h = o.hours ?? (t * 0.4), m = o.minutes ?? (t * 4.8);
    for (const [a, len, w] of [[h * Math.PI / 6, 22, 5], [m * Math.PI / 30, 32, 3.5]]) { ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(Math.sin(a) * len, -50 - Math.cos(a) * len); ctx.lineWidth = w; ctx.stroke(); }
    ell(ctx, 0, -50, 3.5, 3.5); ctx.fillStyle = INK; ctx.fill();
  },
  bone(ctx, o) {
    ctx.save(); ctx.translate(0, -50); ctx.rotate(o.angle ?? -0.6);
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(30, -8); ctx.arc(36, -12, 11, Math.PI * 0.85, Math.PI * 1.9 + 0.4, false); ctx.arc(36, 12, 11, -0.4, Math.PI * 1.15, false);
    ctx.lineTo(-30, 8); ctx.arc(-36, 12, 11, 0.05 * Math.PI, Math.PI * 1.4); ctx.arc(-36, -12, 11, Math.PI * 0.6, Math.PI * 1.95); ctx.closePath();
    ink(ctx, o.color || '#f5ecd6'); ctx.restore();
  },
  rock(ctx, o) {
    ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(-40, -36); ctx.lineTo(-12, -54); ctx.lineTo(22, -48); ctx.lineTo(46, -22); ctx.lineTo(48, 0); ctx.closePath(); ink(ctx, o.color || '#9a9aa6');
    ctx.beginPath(); ctx.moveTo(-40, -36); ctx.lineTo(-12, -54); ctx.lineTo(-4, -30); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
  },
  tree(ctx, o, t) {
    rr(ctx, -9, -50, 18, 50, 4); ink(ctx, '#7a5534');
    const s = Math.sin(t * 1.3) * 1.5, c = o.color || '#4caf50';
    ctx.beginPath(); ctx.arc(-18 + s, -62, 22, 0, Math.PI * 2); ctx.arc(18 + s, -64, 22, 0, Math.PI * 2); ctx.arc(s, -82, 25, 0, Math.PI * 2); ink(ctx, c);
    ctx.beginPath(); ctx.arc(-18 + s, -62, 21, 0, Math.PI * 2); ctx.arc(18 + s, -64, 21, 0, Math.PI * 2); ctx.arc(s, -82, 24, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    ell(ctx, -10 + s, -90, 9, 5, -0.4); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  },
  house(ctx, o) {
    rr(ctx, -40, -58, 80, 58, 3); ink(ctx, o.color || '#f2d6a2');
    ctx.beginPath(); ctx.moveTo(-50, -54); ctx.lineTo(0, -98); ctx.lineTo(50, -54); ctx.closePath(); ink(ctx, o.roof || '#d9534f');
    rr(ctx, -10, -34, 20, 34, 3); ink(ctx, '#8a5a3a');
    for (const x of [-30, 16]) { rr(ctx, x, -48, 14, 14, 2); ink(ctx, '#bfe6ff'); }
  },
  building(ctx, o) {
    rr(ctx, -34, -100, 68, 100, 3); ink(ctx, o.color || '#8fa3c7');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { rr(ctx, -24 + c * 18, -90 + r * 15, 11, 9, 1.5); ctx.fillStyle = (r * 3 + c) % 4 ? '#ffe9a6' : '#41526e'; ctx.fill(); }
    rr(ctx, -9, -16, 18, 16, 2); ink(ctx, '#41526e');
  },
  laptop(ctx, o) {
    rr(ctx, -40, -76, 80, 52, 6); ink(ctx, o.color || '#3a3f4b'); rr(ctx, -35, -71, 70, 42, 4); ctx.fillStyle = o.screen || '#5ab0ff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-48, -22); ctx.lineTo(48, -22); ctx.lineTo(52, -10); ctx.lineTo(-52, -10); ctx.closePath(); ink(ctx, '#9aa3ad');
    if (o.text) label(ctx, o.text, 0, -50, 15, '#fff');
  },
  sign(ctx, o) {
    rr(ctx, -4, -60, 8, 60, 3); ink(ctx, '#7a5534');
    rr(ctx, -48, -98, 96, 44, 6); ink(ctx, o.color || '#f7e3b5');
    const str = (o.text || 'SIGN').toUpperCase(); ctx.save(); ctx.font = '800 22px Toon, sans-serif'; const w = ctx.measureText(str).width; ctx.restore();
    label(ctx, str, 0, -76, 22 * Math.min(1, 84 / w));
  },
  heart(ctx, o) {
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.bezierCurveTo(-60, -50, -30, -100, 0, -72); ctx.bezierCurveTo(30, -100, 60, -50, 0, -12); ctx.closePath(); ink(ctx, o.color || '#e2493f');
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.bezierCurveTo(-60, -50, -30, -100, 0, -72); ctx.bezierCurveTo(30, -100, 60, -50, 0, -12); ctx.closePath(); shine(ctx, -20, -70, 10, 6);
  },
  bulb(ctx, o, t) {
    const on = clamp(o.on ?? 1);
    if (on > 0) { const g = ctx.createRadialGradient(0, -62, 5, 0, -62, 60); g.addColorStop(0, `rgba(255,236,140,${0.6 * on})`); g.addColorStop(1, 'rgba(255,236,140,0)'); ctx.fillStyle = g; ctx.fillRect(-60, -122, 120, 120); }
    ctx.beginPath(); ctx.moveTo(-12, -24); ctx.bezierCurveTo(-14, -40, -34, -50, -32, -70); ctx.bezierCurveTo(-30, -100, 30, -100, 32, -70); ctx.bezierCurveTo(34, -50, 14, -40, 12, -24); ctx.closePath();
    ink(ctx, on > 0.5 ? '#ffe66b' : '#e8eef3');
    rr(ctx, -13, -26, 26, 22, 4); ink(ctx, '#9aa3ad');
  },
  arrow(ctx, o) {
    ctx.save(); ctx.translate(0, -50); ctx.rotate(o.angle ?? 0);
    ctx.beginPath(); ctx.moveTo(-46, -10); ctx.lineTo(14, -10); ctx.lineTo(14, -26); ctx.lineTo(48, 0); ctx.lineTo(14, 26); ctx.lineTo(14, 10); ctx.lineTo(-46, 10); ctx.closePath();
    ink(ctx, o.color || '#ffd24a'); ctx.restore();
  },
  speech(ctx, o) {
    const str = o.text || '...';
    ctx.save(); ctx.font = '800 30px Toon, sans-serif'; const w = Math.max(60, ctx.measureText(str).width + 36); ctx.restore();
    ctx.beginPath(); ctx.roundRect(-w / 2, -100, w, 62, 26); ctx.moveTo(-10, -39); ctx.lineTo(-22, -12); ctx.lineTo(10, -39); ink(ctx, '#ffffff');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-12, -42, 24, 5);
    label(ctx, str, 0, -69, 30);
  },
};
export const propNames = () => Object.keys(PROPS);
export const registerProp = (name, fn) => { PROPS[name] = fn; };

export function drawProp(ctx, name, x, y, size = 200, o = {}, t = 0) {
  const f = PROPS[name];
  if (!f) throw new Error(`unknown prop "${name}"; known: ${propNames().join(', ')}`);
  const g = o.ground ? ctx.getTransform().transformPoint(new DOMPoint(x, y)) : null;
  ctx.save(); ctx.translate(x, y); const k = size / 100; ctx.scale(o.flip ? -k : k, k); if (o.rot) ctx.rotate(o.rot);
  // Lit by the set like the heroes; o.ground: true also drops a shadow on the floor, o.lit: false draws it flat.
  if (o.lit === false) f(ctx, o, t);
  else drawLit(ctx, [-110, -135, 110, 12], [{ draw: c => f(c, o, t) }], { outline: INK, ground: g && [g.x, g.y], light: { depth: 3.6, rim: null, ...(o.light || {}) }, seed: 2 });
  ctx.restore();
}
