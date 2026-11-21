// Ready 3D stages. Copy one to make a new place: a ground, a few solids from the kit, a sky, a sun.
import { registerStage } from './stage3d.js';
import { scatter } from './core.js';

export const sky = stops => (ctx, t, W, H) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
export function clouds(ctx, t, W, seed, color) {
  ctx.fillStyle = color;
  scatter(5, seed).forEach(([a, b, c]) => {
    const x = ((a * (W + 600) + t * (9 + c * 8)) % (W + 600)) - 300, y = 150 + b * 420, r = 34 + c * 26;
    ctx.beginPath();
    for (const [dx, k] of [[0, 0.8], [r * 1.1, 1.2], [r * 2.4, 0.95], [r * 3.5, 0.65]]) { ctx.moveTo(x + dx + r * k, y - r * k * 0.45); ctx.arc(x + dx, y - r * k * 0.45, r * k, 0, Math.PI * 2); }
    ctx.roundRect(x - r * 0.8, y - r * 0.3, r * 5, r * 0.9, r * 0.45); ctx.fill();
  });
}
export function tree(kit, x, z, s = 1, crown = 0x4f9d5c) {
  const g = kit.group(kit.cyl(0.17 * s, 1.7 * s, 0x7a4f33, { top: 0.75 }));
  for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.05], [-0.7, 2.0, 0.2, 0.75], [0.75, 2.1, -0.1, 0.8], [0.1, 3.2, 0.1, 0.7]]) g.add(kit.put(kit.ball(r * s, crown), dx * s, dy * s, dz * s));
  return kit.put(g, x, 0, z);
}

// A street running away from the camera: road, pavements, two rows of houses, trees and lamps.
registerStage('street', {
  sky(ctx, t, W, H) {
    sky([[0, '#5fb2f2'], [0.42, '#bfe3fb'], [0.62, '#ffe6bd']])(ctx, t, W, H);
    const g = ctx.createRadialGradient(220, 300, 30, 220, 300, 720); g.addColorStop(0, 'rgba(255,250,215,0.95)'); g.addColorStop(0.12, 'rgba(255,244,190,0.55)'); g.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); clouds(ctx, t, W, 61, 'rgba(255,255,255,0.92)');
  },
  fog: [0xffe9c8, 16, 75], sun: { dir: [-0.22, 1, 0.7], color: 0xfff0cc, power: 2.7 }, air: [0xd6dcff, 0x8c88cf, 1.55],
  light2d: { shadow: '#8b97d6', rim: '#fffbe6', rimAmount: 0.4 },
  build(kit) {
    kit.add(kit.patch(400, 400, 0x7f9a6a, 0));                                   // the land under everything
    kit.add(kit.patch(7.4, 160, 0x555b6b, 0.01));                                // road
    for (const side of [-1, 1]) kit.add(kit.put(kit.box(3.2, 0.16, 160, 0xd2ccc3), side * 5.3, 0, -40));
    for (let z = 8; z > -70; z -= 4.2) kit.add(kit.put(kit.patch(0.22, 2, 0xf2ecd8, 0.02), 0, 0, z));
    for (let i = -3; i <= 3; i++) kit.add(kit.put(kit.patch(0.55, 2.6, 0xf2ecd8, 0.02), i * 0.95, 0, 3.4));   // zebra crossing
    const walls = ['#6f86c4', '#9179c2', '#5fa3b8', '#c98e78', '#d6a95c', '#7fae8a'];
    scatter(18, 23).forEach(([a, b, c], i) => {
      const side = i % 2 ? 1 : -1, w = 5.5 + a * 2.5, h = 6 + b * 11, d = 5.5 + c * 2, z = 9 - Math.floor(i / 2) * 7.4, col = walls[i % walls.length];
      const map = kit.tex(256, 512, (ctx, tw, th) => {
        ctx.fillStyle = col; ctx.fillRect(0, 0, tw, th);
        const rows = Math.max(2, Math.round(h / 1.6)), cols = 3;
        for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
          const x = 28 + k * 72, y = 26 + (r * (th - 60)) / rows, ww = 46, wh = Math.min(58, (th - 60) / rows - 18);
          ctx.fillStyle = (r * 3 + k * 5 + i) % 4 === 0 ? '#ffe9a6' : '#3f4f74'; ctx.fillRect(x, y, ww, wh);
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, ww, wh * 0.22);
          ctx.lineWidth = 5; ctx.strokeStyle = '#1c1410'; ctx.strokeRect(x, y, ww, wh);
        }
        ctx.fillStyle = '#6b4a33'; ctx.fillRect(tw / 2 - 26, th - 64, 52, 64); ctx.strokeRect(tw / 2 - 26, th - 64, 52, 64);
      });
      const house = kit.group(kit.box(w, h, d, 0xffffff, { map, ink: 0.06 }), kit.put(kit.box(w + 0.5, 0.35, d + 0.5, 0x4a4352, { ink: 0.05 }), 0, h, 0));
      if (i % 3 === 0) house.add(kit.put(kit.box(0.9, 1.3, 0.9, 0x8a6a52), w * 0.2, h + 0.35, 0));
      kit.add(kit.put(house, side * (7.2 + w / 2), 0, z));
    });
    const crowns = [];
    for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, tr = tree(kit, side * 4.7, 5 - i * 5.3, 0.85 + (i % 3) * 0.12); crowns.push(tr); kit.add(tr); }
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? -1 : 1, z = 2.5 - i * 8;
      kit.add(kit.put(kit.group(kit.cyl(0.07, 3.6, 0x3b4252), kit.put(kit.box(0.9, 0.1, 0.1, 0x3b4252), -side * 0.4, 3.55, 0), kit.put(kit.box(0.42, 0.2, 0.26, 0xffe9a6, { glow: true }), -side * 0.8, 3.38, 0)), side * 4.25, 0, z));
    }
    return { update(t) { crowns.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i) * 0.018; }); } };
  },
});

// Open country: grass, a path, round hills, trees, far mountains.
registerStage('meadow', {
  sky(ctx, t, W, H) {
    sky([[0, '#4c3f7c'], [0.3, '#c8607c'], [0.5, '#ff9d6b'], [0.64, '#ffd08f']])(ctx, t, W, H);
    const g = ctx.createRadialGradient(540, 1010, 30, 540, 1010, 620); g.addColorStop(0, 'rgba(255,244,190,1)'); g.addColorStop(0.2, 'rgba(255,224,150,0.7)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); clouds(ctx, t, W, 31, 'rgba(255,214,190,0.8)');
  },
  fog: [0xffb98a, 14, 80], sun: { dir: [0.15, 0.55, -1], color: 0xffc98a, power: 2.4 }, air: [0xffc9b0, 0x7b5aa8, 1.7],
  light2d: { shadow: '#9a6cc0', amount: 0.95, rim: '#ffbe6e', rimAmount: 0.85, tint: '#ffd9c4' },
  build(kit) {
    kit.add(kit.patch(600, 600, 0x6f8f4e, 0));
    kit.add(kit.patch(2.6, 200, 0xc9a56e, 0.01));
    scatter(9, 5).forEach(([a, b, c], i) => { const s = 10 + c * 14, hill = kit.ball(s, [0x5f8548, 0x54783f, 0x6b9450][i % 3], { ink: 0 }); hill.scale.y = 0.42; kit.add(kit.put(hill, (a - 0.5) * 90, -s * 0.12, -24 - b * 40)); });
    for (const [x, z, h] of [[-46, -120, 22], [-12, -135, 30], [28, -125, 24], [64, -118, 18]]) kit.add(kit.put(kit.cone(h * 1.1, h, 0x7d5a94, { ink: 0 }), x, 0, z));
    const trees = scatter(14, 9).map(([a, b, c], i) => kit.add(tree(kit, (i % 2 ? 1 : -1) * (3.2 + a * 14), 6 - b * 40, 0.8 + c * 0.6, [0x4a7f45, 0x5c9150, 0x3f6f3f][i % 3])));
    for (const [a, b, c] of scatter(26, 17)) { const r = 0.22 + c * 0.28, rock = kit.ball(r, 0x9a938a, { ink: 0.02 }); rock.scale.y = 0.6; kit.add(kit.put(rock, (a - 0.5) * 22, r * 0.2, 5 - b * 30)); }
    return { update(t) { trees.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.8 + i * 1.3) * 0.02; }); } };
  },
});
