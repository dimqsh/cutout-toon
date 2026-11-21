// Screen-space furniture: the comic panel, captions, diagram-card parts and the pattern wipe.
import { clamp, EASE } from './core.js';

export const FONT = 'Toon';
const INK = '#120d0a';

export function panel(ctx, W, H, inside) {
  const m = 26, r = 46;
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.roundRect(m, m, W - m * 2, H - m * 2, r); ctx.clip();
  inside();
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(m, m, W - m * 2, H - m * 2, r); ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.stroke();
}

export function text(ctx, str, x, y, size, { color = '#fff', stroke = INK, sw = size * 0.17, align = 'center', maxW = 0 } = {}) {
  ctx.save();
  ctx.font = `800 ${size}px ${FONT}, 'Arial Black', sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const w = ctx.measureText(str).width;
  ctx.translate(x, y);
  if (maxW && w > maxW) ctx.scale(maxW / w, maxW / w);
  if (sw) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.restore();
}

// age: seconds since the caption appeared. Pops in, then sits still.
export function caption(ctx, str, age, W, H) {
  const k = 0.72 + 0.28 * EASE.back(clamp(age / 0.16));
  ctx.save(); ctx.translate(W / 2, H * 0.715); ctx.scale(k, k);
  text(ctx, str.toUpperCase(), 0, 0, 96, { maxW: W - 190 });
  ctx.restore();
}

// v: 0..1 fill level.
export function thermo(ctx, x, y, h, v, color = '#e2493f') {
  const w = 44;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h + 20, w / 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y + 34, 52, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.stroke();
  const fh = (h - 20) * clamp(v);
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x - 11, y - fh, 22, fh + 30, 11); ctx.fill();
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x + w / 2 + 14, y - (h - 20) * i / 8); ctx.lineTo(x + w / 2 + (i % 2 ? 34 : 50), y - (h - 20) * i / 8); ctx.strokeStyle = '#fff'; ctx.stroke(); }
  ctx.restore();
}

// p: -1 (curtain starts entering) .. 0 (screen covered) .. 1 (curtain gone).
export function wipe(ctx, p, W, H) {
  if (p <= -1 || p >= 1) return;
  const e = EASE.inout(1 - Math.abs(p));
  const x0 = p < 0 ? 0 : W * (1 - e), x1 = p < 0 ? W * e : W;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
  ctx.fillStyle = '#dedae3'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#bcb6c4'; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let y = 60; y < H + 80; y += 170) {
    ctx.beginPath();
    for (let x = -60; x <= W + 60; x += 20) { const yy = y + Math.sin(x * 0.045) * 44; x === -60 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  ctx.restore();
}
