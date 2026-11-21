// Sets are lists of layers drawn in code. Each layer has a parallax factor p:
// 0 is glued to the screen (sky), 1 moves with the actors, above 1 is foreground.
// World space equals screen space (1080x1920) when the camera is at rest; the ground line is GROUND.
import { scatter } from './core.js';

export const GROUND = 1240;
const SETS = {}, META = {};
// meta.light: where the light comes from and what colour the shadows are (see LIGHT0 in light.js).
export const registerSet = (name, layers, meta = {}) => { SETS[name] = layers; META[name] = meta; };
export const setNames = () => Object.keys(SETS);
export const setLight = name => (META[name] || {}).light || {};

const grad = (ctx, H, stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
function hills(ctx, W, H, y, amp, seed, color) {
  ctx.beginPath(); ctx.moveTo(-400, H + 400);
  for (let x = -400; x <= W + 400; x += 40) ctx.lineTo(x, y - amp * (Math.sin(x * 0.004 + seed) * 0.6 + Math.sin(x * 0.011 + seed * 2.3) * 0.4));
  ctx.lineTo(W + 400, H + 400); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function ground(ctx, W, H, color, edge, blades, seed) {
  ctx.beginPath(); ctx.moveTo(-600, H + 600); ctx.lineTo(-600, GROUND + 10);
  ctx.quadraticCurveTo(W / 2, GROUND - 60, W + 600, GROUND + 10); ctx.lineTo(W + 600, H + 600); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = edge; ctx.stroke();
  falloff(ctx, W, H);
  ctx.strokeStyle = blades; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const [a, b, c] of scatter(26, seed)) {
    const x = -200 + a * (W + 400), y = GROUND + 40 + b * 640;
    for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(x + d * 10, y); ctx.quadraticCurveTo(x + d * 16, y - 22, x + d * 22, y - 34 - c * 16); ctx.stroke(); }
  }
}
function leaf(ctx, x, y, len, ang, color, vein) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fillStyle = color; ctx.fill();
  if (vein) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.92, 0); ctx.lineWidth = 5; ctx.strokeStyle = vein; ctx.stroke(); }
  ctx.restore();
}

// ---------- atmosphere: what gives a set depth and light ----------
// One cloud as a single path, so see-through clouds do not show their circles.
function cloud(ctx, x, y, r) {
  ctx.beginPath();
  for (const [dx, k] of [[0, 0.8], [r * 1.1, 1.2], [r * 2.4, 0.95], [r * 3.5, 0.65]]) { ctx.moveTo(x + dx + r * k, y - r * k * 0.45); ctx.arc(x + dx, y - r * k * 0.45, r * k, 0, Math.PI * 2); }
  ctx.roundRect(x - r * 0.8, y - r * 0.3, r * 5, r * 0.9, r * 0.45); ctx.fill();
}
// Beams of light fanning out from x, y. rgb: '255,240,190'.
function shafts(ctx, t, x, y, ang, n, len, width, rgb, a = 0.3) {
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(x, y); ctx.rotate(ang);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * width * 1.7, k = a * (0.55 + 0.45 * Math.sin(t * 0.45 + i * 2.1));
    const g = ctx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, `rgba(${rgb},${k})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.beginPath(); ctx.moveTo(off - width / 2, 0); ctx.lineTo(off + width / 2, 0); ctx.lineTo(off * 1.7 + width * 1.3, len); ctx.lineTo(off * 1.7 - width * 1.3, len); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.restore();
}
// Dust in the light: slow specks that drift up and twinkle.
function motes(ctx, t, n, seed, rgb, x0, y0, w, h) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  scatter(n, seed).forEach(([a, b, c], i) => {
    const x = x0 + a * w + Math.sin(t * (0.25 + c * 0.4) + i) * 46, y = y0 + (((b * h - t * (9 + c * 16)) % h) + h) % h;
    ctx.fillStyle = `rgba(${rgb},${0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * (0.9 + c) + i * 3))})`; circle(ctx, x, y, 2.2 + c * 4.2);
  });
  ctx.restore();
}
// A band of air between two depths: far things go pale.
function haze(ctx, W, y, h, rgb, a) {
  const g = ctx.createLinearGradient(0, y - h, 0, y + h); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.5, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(-600, y - h, W + 1200, h * 2);
}
// The ground gets darker toward the camera.
function falloff(ctx, W, H, a = 0.3) {
  const g = ctx.createLinearGradient(0, GROUND, 0, H + 200); g.addColorStop(0, 'rgba(20,10,40,0)'); g.addColorStop(1, `rgba(20,10,40,${a})`);
  ctx.fillStyle = g; ctx.fillRect(-600, GROUND - 80, W + 1200, H);
}
const K = '#1c1410';
const shadeHex = hex => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.78).toString(16).padStart(2, '0')).join('');
const box = (ctx, x, y, w, h, fill, lw = 5, r = 0) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = K; ctx.lineJoin = 'round'; ctx.stroke(); };

registerSet('jungle', [
  { p: 0, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#d9f3d6'], [0.55, '#9ad6b0'], [1, '#5fae8e']]); ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(780, 430, 20, 780, 430, 620); g.addColorStop(0, 'rgba(255,250,205,0.95)'); g.addColorStop(1, 'rgba(255,250,205,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } },
  { p: 0.25, blur: 9, draw(ctx, t, W) {
    ctx.fillStyle = '#58a98a';
    for (const [a, b, c] of scatter(18, 3)) circle(ctx, -150 + a * (W + 300), 60 + b * 520, 150 + c * 150);
    ctx.fillStyle = '#4c9a7d';
    for (const [a, b, c] of scatter(9, 5)) circle(ctx, -150 + a * (W + 300), GROUND - 280 + b * 160, 190 + c * 120);
  } },
  { p: 0.55, blur: 3, draw(ctx, t, W, H) {
    for (const [x, w] of [[90, 120], [930, 150], [640, 70]]) { ctx.fillStyle = '#5b4332'; ctx.fillRect(x, -200, w, H + 400); ctx.fillStyle = '#4c3728'; ctx.fillRect(x + w * 0.62, -200, w * 0.38, H + 400); }
    ctx.fillStyle = '#2f7d60';
    for (const [a, b, c] of scatter(14, 9)) circle(ctx, -100 + a * (W + 200), -40 + b * 330, 110 + c * 100);
    ctx.lineCap = 'round';
    scatter(5, 13).forEach(([a, b, c], i) => {
      const x = 140 + a * 800, len = 420 + b * 420, s = Math.sin(t * 0.9 + i * 1.7) * 26;
      ctx.beginPath(); ctx.moveTo(x, -40); ctx.quadraticCurveTo(x + s * 0.4, len * 0.5, x + s, len);
      ctx.lineWidth = 12; ctx.strokeStyle = '#2a6a4f'; ctx.stroke();
      for (let k = 1; k < 6; k++) leaf(ctx, x + s * (k / 6) ** 2, len * k / 6, 54, k % 2 ? 0.5 : 2.6, '#3b8a66');
    });
  } },
  { p: 0.8, draw(ctx, t, W) { haze(ctx, W, GROUND - 120, 300, '214,245,200', 0.35); } },
  { p: 1, draw(ctx, t, W, H) { ground(ctx, W, H, '#3f7f4b', '#2b5f38', '#56a05e', 21); } },
  { p: 1.02, draw(ctx, t, W, H) { shafts(ctx, t, 820, -120, 0.42, 4, 1750, 120, '255,250,190', 0.26); motes(ctx, t, 26, 5, '255,252,200', 100, 200, 900, 1100); } },
  { p: 1.35, blur: 5, draw(ctx, t, W, H) {
    const s = Math.sin(t * 0.7) * 0.03;
    for (const [x, y, len, ang] of [[-120, 1790, 620, -0.75], [-80, 1930, 560, -0.35], [1200, 1800, 640, -2.4], [1180, 1950, 560, -2.8], [-140, 120, 520, 0.5], [1220, 90, 560, 2.6]]) leaf(ctx, x, y, len, ang + s, '#1f5a41', '#17482f');
  } },
], { light: { dir: [0.5, -0.85], shadow: '#6fa3b5', rim: '#fff7b0', rimAmount: 0.5, tint: '#f1ffe4' } });

registerSet('dusk', [
  { p: 0, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#4c3f7c'], [0.3, '#c8607c'], [0.5, '#ff9d6b'], [0.62, '#ffd08f']]); ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(540, GROUND - 250, 30, 540, GROUND - 250, 560); g.addColorStop(0, 'rgba(255,244,190,1)'); g.addColorStop(0.2, 'rgba(255,224,150,0.75)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff3c4'; circle(ctx, 540, GROUND - 250, 120);
  } },
  { p: 0.08, draw(ctx, t, W) {
    ctx.fillStyle = 'rgba(255,214,190,0.75)';
    scatter(6, 31).forEach(([a, b, c]) => {
      const x = ((a * (W + 600) + t * (8 + c * 10)) % (W + 600)) - 300, y = 180 + b * 560, r = 34 + c * 30;
      cloud(ctx, x, y, r);
    });
  } },
  { p: 0.2, blur: 6, draw(ctx, t, W, H) { hills(ctx, W, H, GROUND - 250, 130, 1.3, '#8d4f7d'); haze(ctx, W, GROUND - 200, 260, '255,190,140', 0.4); } },
  { p: 0.45, blur: 2, draw(ctx, t, W, H) { hills(ctx, W, H, GROUND - 130, 90, 4.1, '#63386a'); } },
  { p: 1, draw(ctx, t, W, H) { ground(ctx, W, H, '#3b2a4d', '#2a1d3a', '#5a3f6e', 44); } },
  { p: 1.02, draw(ctx, t, W, H) { motes(ctx, t, 18, 12, '255,220,170', 0, 500, W, 900); } },
  { p: 1.3, blur: 5, draw(ctx, t, W, H) {
    ctx.strokeStyle = '#1f1530'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    for (const [a, b, c] of scatter(22, 57)) {
      const x = -100 + a * (W + 200), s = Math.sin(t * 1.1 + a * 9) * 14;
      ctx.beginPath(); ctx.moveTo(x, H + 40); ctx.quadraticCurveTo(x + s * 0.3, H - 90, x + s + (b - 0.5) * 60, H - 150 - c * 130); ctx.stroke();
    }
  } },
], { light: { dir: [0.15, -0.5], shadow: '#9a6cc0', amount: 0.95, rim: '#ffbe6e', rimAmount: 0.85, tint: '#ffd9c4', cast: 0.3 } });

registerSet('night', [
  { p: 0, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#0b1030'], [0.6, '#1e2b5c'], [1, '#2c3d74']]); ctx.fillRect(0, 0, W, H);
    for (const [a, b, c] of scatter(70, 71)) { ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.8 + c * 2) + a * 40)); ctx.fillStyle = '#fff'; circle(ctx, a * W, b * 1000, 1.6 + c * 3); }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(790, 380, 40, 790, 380, 420); g.addColorStop(0, 'rgba(210,225,255,0.55)'); g.addColorStop(1, 'rgba(210,225,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2f4ff'; circle(ctx, 790, 380, 110); ctx.fillStyle = '#d5dcf5'; circle(ctx, 760, 350, 22); circle(ctx, 830, 420, 30); circle(ctx, 800, 310, 12);
  } },
  { p: 0.2, blur: 6, draw(ctx, t, W, H) { hills(ctx, W, H, GROUND - 220, 120, 2.2, '#1a2552'); haze(ctx, W, GROUND - 170, 240, '120,150,255', 0.3); } },
  { p: 0.45, blur: 2, draw(ctx, t, W, H) { hills(ctx, W, H, GROUND - 110, 80, 6.4, '#131b40'); } },
  { p: 1, draw(ctx, t, W, H) {
    ground(ctx, W, H, '#16224a', '#0d1533', '#24346b', 88);
    for (const [a, b, c] of scatter(9, 93)) {
      const x = a * W + Math.sin(t * (0.5 + c) + a * 20) * 60, y = 520 + b * 620 + Math.cos(t * (0.7 + c) + b * 20) * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g; circle(ctx, x, y, 26);
    }
  } },
], { light: { dir: [0.6, -0.75], shadow: '#5967bd', amount: 0.95, rim: '#dfe9ff', rimAmount: 0.7, tint: '#c2caf7', cast: 0.3 } });

// Flat backdrop for diagram cards.
registerSet('card', [
  { p: 0, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#3279b8'], [1, '#17406e']]); ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H * 0.45, 1300); g.addColorStop(0, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } },
], { light: { shadow: '#9aa6dc', amount: 0.7, cast: 0 } });

function curtain(ctx, x, y, w, h, color, dark, t, seed) {
  const s = Math.sin(t * 0.8 + seed) * 5;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.bezierCurveTo(x + w + 14, y + h * 0.4, x + w - 10 + s, y + h * 0.75, x + w + 6 + s, y + h);
  for (let i = 3; i >= 0; i--) ctx.quadraticCurveTo(x + (w * (i + 0.5)) / 4 + s, y + h + 22, x + (w * i) / 4 + s * 0.6, y + h);
  ctx.bezierCurveTo(x - 10, y + h * 0.7, x + 8, y + h * 0.35, x, y); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = dark;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + w * (0.22 + i * 0.3), y); ctx.quadraticCurveTo(x + w * (0.1 + i * 0.3) + s, y + h * 0.6, x + w * (0.24 + i * 0.3) + s, y + h + 30); ctx.lineTo(x + w * (0.34 + i * 0.3) + s, y + h + 30); ctx.quadraticCurveTo(x + w * (0.2 + i * 0.3), y + h * 0.5, x + w * (0.3 + i * 0.3), y); ctx.fill(); }
  ctx.restore(); ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.lineJoin = 'round'; ctx.stroke();
}
function plant(ctx, x, y, k, t, pot = '#d9744a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  for (const [a, len, c] of [[-2.2, 150, '#3f8f5f'], [-1.75, 190, '#4ea36c'], [-1.35, 200, '#3f8f5f'], [-0.95, 160, '#4ea36c'], [-1.55, 120, '#5fb87c']]) {
    const sw = Math.sin(t * 0.9 + a * 4) * 0.05;
    ctx.save(); ctx.translate(0, -70); ctx.rotate(a + sw); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.3, 0, 0);
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = K; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(len * 0.85, 0); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,60,40,0.5)'; ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(-52, -78); ctx.lineTo(52, -78); ctx.lineTo(38, 0); ctx.lineTo(-38, 0); ctx.closePath(); ctx.fillStyle = pot; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = K; ctx.stroke();
  box(ctx, -58, -92, 116, 22, pot, 5, 6);
  ctx.fillStyle = 'rgba(40,10,30,0.22)'; ctx.beginPath(); ctx.moveTo(10, -70); ctx.lineTo(50, -70); ctx.lineTo(37, -2); ctx.lineTo(18, -2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

registerSet('room', [
  { p: 0.2, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#f5d5a2'], [0.6, '#ecbc80'], [1, '#d89e66']]); ctx.fillRect(-500, -500, W + 1000, H + 1000);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; for (let x = -480; x < W + 500; x += 120) ctx.fillRect(x, -500, 46, H + 1000);
    // sunlight from the window across the wall
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(26px)'; ctx.fillStyle = 'rgba(255,226,160,0.4)';
    ctx.beginPath(); ctx.moveTo(470, 240); ctx.lineTo(880, 240); ctx.lineTo(520, 1320); ctx.lineTo(-60, 1320); ctx.closePath(); ctx.fill(); ctx.restore();
    const g = ctx.createRadialGradient(620, 620, 300, 540, 760, 1250); g.addColorStop(0, 'rgba(90,40,60,0)'); g.addColorStop(1, 'rgba(90,40,60,0.42)');
    ctx.fillStyle = g; ctx.fillRect(-500, -500, W + 1000, H + 1000);
  } },
  { p: 0.6, blur: 1.2, draw(ctx, t, W) {
    const wx = 610, wy = 300, ww = 340, wh = 430;
    // the view, glowing a little into the room
    const glow = ctx.createRadialGradient(wx + ww / 2, wy + wh / 2, 100, wx + ww / 2, wy + wh / 2, 520); glow.addColorStop(0, 'rgba(255,244,200,0.5)'); glow.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = glow; ctx.fillRect(wx - 400, wy - 400, ww + 800, wh + 800);
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#e4f6ff'); ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ffffff'; cloud(ctx, wx + ((t * 9) % (ww + 260)) - 200, wy + 150, 36); cloud(ctx, wx + ((t * 6 + 300) % (ww + 260)) - 200, wy + 300, 26);
    ctx.fillStyle = '#7fc18a'; ctx.beginPath(); ctx.ellipse(wx + 90, wy + wh + 40, 190, 130, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#69ad78'; ctx.beginPath(); ctx.ellipse(wx + 300, wy + wh + 50, 170, 110, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = K; ctx.strokeRect(wx, wy, ww, wh); ctx.lineWidth = 16; ctx.strokeStyle = '#fff8ea'; ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 16; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.45); ctx.lineTo(wx + ww, wy + wh * 0.45); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff8ea'; ctx.stroke();
    box(ctx, wx - 34, wy + wh + 8, ww + 68, 26, '#fff8ea', 5, 6);
    box(ctx, wx - 110, wy - 66, ww + 220, 22, '#8a5a3a', 5, 11);
    curtain(ctx, wx - 96, wy - 50, 100, wh + 150, '#e0564f', '#c2413f', t, 1); curtain(ctx, wx + ww - 4, wy - 50, 100, wh + 150, '#e0564f', '#c2413f', t, 3);
    // shelf, books, plant, picture
    box(ctx, 80, 690, 360, 24, '#9a6540', 5, 4);
    [['#4f7fd6', 44, 150], ['#e2a53b', 36, 128], ['#d9534f', 50, 166], ['#59a878', 34, 118]].forEach(([c, w, h], i, all) => { const x = 104 + all.slice(0, i).reduce((n, b) => n + b[1] + 4, 0); box(ctx, x, 690 - h, w, h, c, 5, 3); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 8, 690 - h + 22, w - 16, 9); });
    plant(ctx, 370, 690, 0.62, t);
    box(ctx, 130, 300, 240, 190, '#fff8ea', 5, 4); ctx.save(); ctx.beginPath(); ctx.rect(146, 316, 208, 158); ctx.clip();
    ctx.fillStyle = '#ffcf8a'; ctx.fillRect(146, 316, 208, 158); ctx.fillStyle = '#ff9f6b'; circle(ctx, 290, 380, 30);
    ctx.fillStyle = '#7b5ea8'; ctx.beginPath(); ctx.moveTo(130, 480); ctx.lineTo(220, 380); ctx.lineTo(300, 480); ctx.fill(); ctx.fillStyle = '#5c4590'; ctx.beginPath(); ctx.moveTo(230, 480); ctx.lineTo(310, 410); ctx.lineTo(380, 480); ctx.fill(); ctx.restore();
  } },
  { p: 1, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#b98456'], [0.65, '#b07a4f'], [1, '#8a5a3c']]); ctx.fillRect(-600, GROUND - 40, W + 1200, H);
    ctx.strokeStyle = 'rgba(80,45,25,0.5)'; ctx.lineWidth = 5;   // boards run toward one point behind the wall
    for (let i = -9; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 105, GROUND - 40); ctx.lineTo(W / 2 + i * 330, H + 500); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(18px)'; ctx.fillStyle = 'rgba(255,224,160,0.34)';
    ctx.beginPath(); ctx.moveTo(430, GROUND); ctx.lineTo(760, GROUND); ctx.lineTo(560, GROUND + 420); ctx.lineTo(40, GROUND + 420); ctx.closePath(); ctx.fill(); ctx.restore();
    box(ctx, -600, GROUND - 66, W + 1200, 32, '#f1dfc2', 5);
    ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 190, 470, 96, 0, 0, Math.PI * 2); ctx.fillStyle = '#5876d0'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.stroke();
    ctx.lineWidth = 9; ctx.strokeStyle = '#f4e9c8'; ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 190, 410, 70, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = '#3f58a8'; ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 190, 330, 46, 0, 0, Math.PI * 2); ctx.stroke();
    falloff(ctx, W, H, 0.34);
  } },
  { p: 1.02, draw(ctx, t) { shafts(ctx, t, 760, 300, 0.5, 3, 1500, 120, '255,236,180', 0.2); motes(ctx, t, 22, 9, '255,244,210', 120, 300, 760, 1000); } },
  { p: 1.45, blur: 8, draw(ctx, t, W, H) { plant(ctx, -30, H + 60, 2.6, t, '#7a4a35'); } },
], { light: { dir: [0.8, -0.55], shadow: '#c08f9e', rim: '#fff3cf', rimAmount: 0.5 } });

registerSet('city', [
  { p: 0, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#5fb2f2'], [0.45, '#bfe3fb'], [0.68, '#ffe6bd']]); ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(190, 330, 30, 190, 330, 700); g.addColorStop(0, 'rgba(255,250,215,0.95)'); g.addColorStop(0.12, 'rgba(255,244,190,0.6)'); g.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    scatter(5, 61).forEach(([a, b, c]) => cloud(ctx, ((a * (W + 600) + t * (10 + c * 8)) % (W + 600)) - 300, 190 + b * 420, 36 + c * 24));
  } },
  { p: 0.22, blur: 5, draw(ctx, t, W) {
    for (const [a, b, c] of scatter(14, 17)) { const w = 110 + c * 120, h = 360 + b * 520, x = -150 + a * (W + 300); ctx.fillStyle = '#a3bbe2'; ctx.fillRect(x, GROUND - 120 - h, w, h + 200); ctx.fillStyle = '#93addb'; ctx.fillRect(x + w * 0.66, GROUND - 120 - h, w * 0.34, h + 200); }
    haze(ctx, W, GROUND - 160, 420, '255,236,205', 0.75);
  } },
  { p: 0.5, blur: 1.5, draw(ctx, t, W) {
    scatter(8, 23).forEach(([a, b, c], i) => {
      const w = 170 + c * 130, h = 320 + b * 520, x = -120 + a * (W + 240), y = GROUND - 40 - h, col = ['#6f86c4', '#9179c2', '#5fa3b8', '#c98e78'][i % 4];
      ctx.fillStyle = col; ctx.fillRect(x, y, w, h + 200);
      ctx.fillStyle = 'rgba(30,20,70,0.22)'; ctx.fillRect(x + w * 0.7, y, w * 0.3, h + 200);                // the side away from the sun
      ctx.fillStyle = 'rgba(255,240,200,0.22)'; ctx.fillRect(x, y, 12, h + 200);
      for (let r = 0; r < Math.floor(h / 74); r++) for (let k = 0; k < Math.floor((w - 20) / 58); k++) {
        const lit = (r * 3 + k * 5 + i) % 4 === 0;
        ctx.fillStyle = lit ? '#ffe9a6' : '#3f4f74'; ctx.fillRect(x + 22 + k * 58, y + 28 + r * 74, 30, 40);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 22 + k * 58, y + 28 + r * 74, 30, 9);
      }
      ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.strokeRect(x, y, w, h + 200);
      box(ctx, x - 8, y - 14, w + 16, 18, shadeHex(col), 5, 3);
      if (i % 2) { box(ctx, x + w * 0.2, y - 74, 54, 60, '#8a6a52', 5, 5); box(ctx, x + w * 0.2 - 5, y - 86, 64, 16, '#6f5340', 5, 4); }
      else { ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(x + w * 0.7, y - 14); ctx.lineTo(x + w * 0.7, y - 110); ctx.moveTo(x + w * 0.7 - 22, y - 84); ctx.lineTo(x + w * 0.7 + 22, y - 84); ctx.stroke(); }
    });
    haze(ctx, W, GROUND - 60, 260, '255,232,200', 0.4);
  } },
  { p: 0.85, draw(ctx, t, W) {
    // a tree and a street lamp between the houses and the pavement
    for (const [x, k] of [[150, 1], [1010, 0.8]]) {
      ctx.save(); ctx.translate(x, GROUND - 10); ctx.scale(k, k);
      box(ctx, -17, -260, 34, 262, '#7a4f33', 6, 6);
      const s = Math.sin(t * 0.8 + x) * 6;
      ctx.beginPath(); for (const [cx, cy, r] of [[-70 + s, -330, 86], [40 + s, -390, 104], [90 + s, -300, 80], [-10 + s, -290, 92]]) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
      ctx.lineWidth = 12; ctx.strokeStyle = K; ctx.stroke(); ctx.fillStyle = '#4f9d5c'; ctx.fill();
      ctx.fillStyle = '#6fbd72'; ctx.beginPath(); ctx.arc(20 + s, -410, 62, 0, Math.PI * 2); ctx.arc(-80 + s, -350, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(20,50,60,0.25)'; ctx.beginPath(); ctx.arc(70 + s, -280, 70, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    box(ctx, 742, GROUND - 520, 16, 520, '#3b4252', 5, 6); box(ctx, 742, GROUND - 536, 120, 16, '#3b4252', 5, 8);
    box(ctx, 826, GROUND - 524, 54, 34, '#ffe9a6', 5, 8);
  } },
  { p: 1, draw(ctx, t, W, H) {
    box(ctx, -600, GROUND - 26, W + 1200, 70, '#d2ccc3', 6);
    ctx.strokeStyle = 'rgba(60,50,60,0.35)'; ctx.lineWidth = 4; for (let x = -560; x < W + 600; x += 150) { ctx.beginPath(); ctx.moveTo(x, GROUND - 26); ctx.lineTo(x - 26, GROUND + 44); ctx.stroke(); }
    ctx.fillStyle = grad(ctx, H, [[0, '#565c6b'], [0.66, '#4c5160'], [1, '#34384a']]); ctx.fillRect(-600, GROUND + 44, W + 1200, H);
    ctx.fillStyle = '#f2ecd8'; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 250 - 50, GROUND + 300); ctx.lineTo(W / 2 + i * 250 + 50, GROUND + 300); ctx.lineTo(W / 2 + i * 276 + 60, GROUND + 330); ctx.lineTo(W / 2 + i * 276 - 60, GROUND + 330); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,230,180,0.14)'; ctx.beginPath(); ctx.moveTo(-200, GROUND + 44); ctx.lineTo(500, GROUND + 44); ctx.lineTo(900, H); ctx.lineTo(-200, H); ctx.fill(); ctx.restore();
    falloff(ctx, W, H, 0.3);
  } },
  { p: 1.02, draw(ctx, t) { shafts(ctx, t, 60, 60, -0.5, 3, 1700, 150, '255,244,200', 0.13); } },
  { p: 1.45, blur: 8, draw(ctx, t, W, H) {
    const s = Math.sin(t * 0.7) * 0.04;
    for (const [x, y, len, ang] of [[1230, 60, 560, 2.5], [1250, 240, 500, 2.9], [1180, -60, 480, 2.1]]) leaf(ctx, x, y, len, ang + s, '#2f6f4a', '#235538');
  } },
], { light: { dir: [-0.65, -0.75], shadow: '#8b97d6', rim: '#fffbe6', rimAmount: 0.4 } });

registerSet('space', [
  { p: 0, draw(ctx, t, W, H) {
    ctx.fillStyle = grad(ctx, H, [[0, '#120a2e'], [0.5, '#2a1660'], [1, '#3b1f7a']]); ctx.fillRect(0, 0, W, H);
    for (const [cx, cy, r, c] of [[260, 520, 420, 'rgba(255,90,180,0.16)'], [860, 1100, 480, 'rgba(90,170,255,0.16)']]) { const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    for (const [a, b, c] of scatter(110, 37)) { ctx.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * (1 + c * 2) + a * 50)); ctx.fillStyle = '#fff'; circle(ctx, a * W, b * H, 1.4 + c * 2.6); }
    ctx.globalAlpha = 1;
  } },
  { p: 0.3, blur: 1, draw(ctx, t, W) {
    ctx.save(); ctx.translate(800, 470); ctx.rotate(-0.25);
    ctx.lineWidth = 22; ctx.strokeStyle = '#f2c46b'; ctx.beginPath(); ctx.ellipse(0, 0, 270, 62, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e8925a'; circle(ctx, 0, 0, 160); ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#d57a48'; for (const y of [-90, -20, 60]) ctx.fillRect(-170, y, 340, 30); ctx.fillStyle = 'rgba(0,0,0,0.18)'; circle(ctx, 70, 60, 150); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#1c1410'; ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 22; ctx.strokeStyle = '#f2c46b'; ctx.beginPath(); ctx.ellipse(0, 0, 270, 62, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
  } },
  { p: 1, draw(ctx, t, W, H) {
    ctx.beginPath(); ctx.moveTo(-600, H + 600); ctx.lineTo(-600, GROUND + 30); ctx.quadraticCurveTo(W / 2, GROUND - 90, W + 600, GROUND + 30); ctx.lineTo(W + 600, H + 600); ctx.closePath();
    ctx.fillStyle = '#b9b3c9'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#1c1410'; ctx.stroke();
    for (const [a, b, c] of scatter(9, 41)) { ctx.fillStyle = '#9d96b2'; ctx.beginPath(); ctx.ellipse(-100 + a * (W + 200), GROUND + 80 + b * 520, 40 + c * 60, 14 + c * 18, 0, 0, Math.PI * 2); ctx.fill(); }
  } },
], { light: { dir: [0.7, -0.5], shadow: '#7a63cf', amount: 0.95, rim: '#ffc98f', rimAmount: 0.8, tint: '#dcd6ff' } });

export function camTransform(ctx, cam, p, W, H) {
  const z = 1 + (cam.zoom - 1) * p;
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); if (cam.rot) ctx.rotate(-cam.rot * Math.min(1, p));   // a tilted horizon
  ctx.translate(-(W / 2 + (cam.x - W / 2) * p), -(H / 2 + (cam.y - H / 2) * p));
}

// front = false draws the layers behind the actors (p <= 1), front = true the foreground.
export function drawSet(ctx, name, t, cam, W, H, front = false) {
  const layers = SETS[name];
  if (!layers) throw new Error(`unknown set "${name}"; known: ${setNames().join(', ')}`);
  for (const l of layers) {
    if ((l.p > 1) !== front) continue;
    ctx.save();
    if (l.blur) ctx.filter = `blur(${l.blur * (1 + (cam.zoom - 1) * 0.5)}px)`;
    camTransform(ctx, cam, l.p, W, H);
    l.draw(ctx, t, W, H);
    ctx.restore();
  }
}
