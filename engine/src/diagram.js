// Animated explanations in the house ink style: lines that draw themselves, bars and stones that pop
// in, arrows that grow, dots that carry a force along a path, labels on leader lines, counters.
// Everything takes a progress `u` (0..1) or the time, so a diagram is a pure function of shot time:
//   const u = D.step(lt, 1.2)      // this step starts at 1.2 s
//   D.bar(ctx, [200, 900], [400, 700], D.step(lt, 0.3 + i * 0.07));
// Draw in a shot's `draw()` (world space, so the camera can push into a detail) or in `overlay()`.
import { clamp, lerp, EASE } from './core.js';
import { text } from './ui.js';

export const INK = '#120d0a';
export const RED = '#e2493f', BLUE = '#3c8de0', GOLD = '#ffd94a', ORANGE = '#ffb13b', GREEN = '#49c26b';
// progress of a step that starts at `at`; `pop` overshoots a little (things landing), `step` does not
export const step = (lt, at, dur = 0.35) => (dur > 0 ? clamp((lt - at) / dur) : lt >= at ? 1 : 0);
export const pop = (lt, at, dur = 0.32) => EASE.back(step(lt, at, dur));
// the i-th of many pieces arriving one after another
export const nth = (lt, i, at = 0.2, gap = 0.07, dur = 0.34) => step(lt, at + i * gap, dur);

const seg = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
// The point at distance d along a polyline, and the polyline cut at that distance.
function along(pts, d) {
  for (let i = 1; i < pts.length; i++) { const l = seg(pts[i - 1], pts[i]); if (d <= l || i === pts.length - 1) { const k = l ? clamp(d / l) : 0; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k), i]; } d -= l; }
  return [...pts[0], 1];
}
export const length = pts => pts.slice(1).reduce((n, p, i) => n + seg(pts[i], p), 0);
// points on a quadratic curve, for line(), flow() and anything that follows a bend
export const curve = (a, c, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; });

function stroke(ctx, w, color, ink) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ink) { ctx.lineWidth = w + 14; ctx.strokeStyle = INK; ctx.stroke(); }
  ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
}
// a polyline that draws itself from its first point as u goes 0..1
export function line(ctx, pts, u = 1, { color = '#fff', w = 14, ink = true } = {}) {
  if (u <= 0) return;
  const end = along(pts, length(pts) * clamp(u));
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < end[2]; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineTo(end[0], end[1]); stroke(ctx, w, color, ink);
}
export function joint(ctx, p, u = 1, { r = 17, color = GOLD } = {}) {
  if (u <= 0) return;
  ctx.beginPath(); ctx.arc(p[0], p[1], r * EASE.back(clamp(u)), 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
}
// a strut growing from a to b, with a pin at each end: the unit a frame or a truss is built from
export function bar(ctx, a, b, u = 1, { color = '#d2503f', w = 22, pins = true } = {}) {
  if (u <= 0) return;
  const k = EASE.out(clamp(u)), e = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]); stroke(ctx, w, color, true);
  if (pins) { joint(ctx, a, u * 2); joint(ctx, b, (u - 0.6) * 2.5); }
}
// an arrow growing from a to b: a force, a push, a direction
export function arrow(ctx, a, b, u = 1, { color = RED, w = 22 } = {}) {
  if (u <= 0) return;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.max(w * 2.2, seg(a, b) * EASE.out(clamp(u))), head = w * 1.5;
  ctx.save(); ctx.globalAlpha *= clamp(u * 3); ctx.translate(a[0], a[1]); ctx.rotate(ang); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -w / 2); ctx.lineTo(len - head, -w / 2); ctx.lineTo(len - head, -w * 1.3); ctx.lineTo(len, 0); ctx.lineTo(len - head, w * 1.3); ctx.lineTo(len - head, w / 2); ctx.lineTo(0, w / 2); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
}
// dots travelling along a path: "the load goes this way". `a` fades the whole stream in.
export function flow(ctx, pts, t, { color = ORANGE, gap = 52, r = 10, speed = 190, a = 1 } = {}) {
  if (a <= 0 || !(gap > 0)) return;
  const L = length(pts);
  ctx.save(); ctx.globalAlpha *= clamp(a);
  for (let d = (((t * speed) % gap) + gap) % gap; d < L; d += gap) {
    const p = along(pts, d), edge = clamp(Math.min(d, L - d) / 30);
    ctx.beginPath(); ctx.arc(p[0], p[1], r * (0.4 + 0.6 * edge), 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  }
  ctx.restore();
}
// a note: a leader line from the thing (`at`) to where the text sits (`to`), then the text
export function label(ctx, str, at, to, u = 1, { size = 46, color = '#fff', align } = {}) {
  if (u <= 0) return;
  line(ctx, [at, to], clamp(u * 2), { color: '#fff', w: 6 });
  joint(ctx, at, u * 3, { r: 9, color: '#fff' });
  const k = EASE.back(clamp((u - 0.45) / 0.55));
  if (k <= 0) return;
  const side = align || (to[0] >= at[0] ? 'left' : 'right');
  ctx.save(); ctx.translate(to[0] + (side === 'left' ? 14 : side === 'right' ? -14 : 0), to[1] + (side === 'center' ? (to[1] < at[1] ? -34 : 34) : 0)); ctx.scale(k, k);
  text(ctx, str, 0, 0, size, { color, align: side, sw: size * 0.2 }); ctx.restore();
}
// a rounded ink block that pops in: a weight, a stone, a bank. rot in radians.
export function block(ctx, x, y, w, h, fill, u = 1, { r = 14, rot = 0, label: str, size = 44 } = {}) {
  if (u <= 0) return;
  const k = EASE.back(clamp(u));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  if (str) text(ctx, str, 0, 2, size, { sw: size * 0.18 });
  ctx.restore();
}
function mark(ctx, x, y, u, size, good) {
  if (u <= 0) return;
  const k = EASE.back(clamp(u)) * (size / 60);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.12); ctx.beginPath();
  if (good) { ctx.moveTo(-44, 4); ctx.lineTo(-12, 40); ctx.lineTo(48, -42); } else { ctx.moveTo(-40, -40); ctx.lineTo(40, 40); ctx.moveTo(40, -40); ctx.lineTo(-40, 40); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 40; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 22; ctx.strokeStyle = good ? GREEN : RED; ctx.stroke();
  ctx.restore();
}
export const tick = (ctx, x, y, u = 1, size = 60) => mark(ctx, x, y, u, size, true);
export const cross = (ctx, x, y, u = 1, size = 60) => mark(ctx, x, y, u, size, false);
// a number that counts up to its value while u goes 0..1
export function count(ctx, to, u, x, y, size = 80, { from = 0, unit = '', color = '#fff', digits = 0 } = {}) {
  if (u <= 0) return;
  text(ctx, lerp(from, to, EASE.out(clamp(u))).toFixed(digits) + unit, x, y, size, { color });
}
// a measured length: end ticks, a line between them, the value counting up in the middle (unit: ' м' by default)
export function ruler(ctx, a, b, u, value, { unit = ' м', color = '#fff', size = 64, above = true } = {}) {
  if (u <= 0) return;
  const k = clamp(u * 1.6), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  line(ctx, [mid, [lerp(mid[0], a[0], k), lerp(mid[1], a[1], k)]], 1, { color, w: 8 }); line(ctx, [mid, [lerp(mid[0], b[0], k), lerp(mid[1], b[1], k)]], 1, { color, w: 8 });
  if (k >= 1) for (const p of [a, b]) line(ctx, [[p[0], p[1] - 22], [p[0], p[1] + 22]], 1, { color, w: 8 });
  count(ctx, value, (u - 0.3) / 0.7, mid[0], mid[1] + (above ? -52 : 58), size, { unit, color });
}
// everything but one circle goes dark: look here
export function spot(ctx, x, y, r, u, a = 0.6) {
  if (u <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); ctx.arc(x, y, r, 0, Math.PI * 2, true);
  ctx.fillStyle = `rgba(8,6,20,${a * clamp(u)})`; ctx.fill('evenodd'); ctx.restore();
}
