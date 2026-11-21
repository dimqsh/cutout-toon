// The place of this video: a river between two banks, and the four bridges Dimash tries.
// A shot picks a bridge with `bridge: 'plank' | 'rope' | 'arch' | 'truss'` and moves it with
// `anim: lt => ({ sag, sway })`.
import { registerStage, registerProp, ink, skyGradient, skyClouds, stageTree, assemble, EASE, clamp } from '/engine/src/index.js';

export const HALF = 1.8;      // the banks end at x = -HALF and x = HALF
export const WATER = -1.1;    // water level; the banks are at 0
// how fast each bridge goes up: one piece every `gap` seconds
export const BUILD = { rope: { at: 0.15, gap: 0.03, drop: 0.9 }, arch: { at: 0.2, gap: 0.11, drop: 1.6, spin: 0.7 }, truss: { at: 0.15, gap: 0.055, drop: 1.2 } };
export const sagY = x => (Math.abs(x) < HALF ? -0.3 * (1 - (x / HALF) ** 2) : 0);   // the rope deck under a walker

registerStage('river', {
  sky(ctx, t, W, H) { skyGradient([[0, '#58aef0'], [0.45, '#bfe4fb'], [0.66, '#eaf7ff']])(ctx, t, W, H); skyClouds(ctx, t, W, 14, 'rgba(255,255,255,0.93)'); },
  fog: [0xdcefff, 20, 85], sun: { dir: [-0.45, 1, 0.55], color: 0xfff3d4, power: 2.7 }, air: [0xd9e2ff, 0x8f8cd0, 1.55],
  light2d: { shadow: '#8b97d6', rim: '#fffbe6', rimAmount: 0.4 },
  // a hero in the gap with nothing under him casts his soft shadow on the water
  ground(x, z, shot, lt) {
    if (Math.abs(x) >= HALF) return 0;
    const a = shot.anim ? shot.anim(lt) : {};
    return !shot.bridge || (shot.bridge === 'plank' && a.sag > 0.5) ? WATER : 0;
  },
  build(kit) {
    for (const side of [-1, 1]) {
      kit.add(kit.put(kit.box(60, 3, 200, 0x8f6a47, { ink: 0 }), side * (HALF + 30), -3, -60));
      kit.add(kit.put(kit.patch(60, 200, 0x86a868, 0.01), side * (HALF + 30), 0, -60));
      kit.add(kit.put(kit.box(0.5, 0.12, 200, 0x6f9156, { ink: 0 }), side * (HALF + 0.2), -0.05, -60));   // the lip of the bank
    }
    kit.add(kit.put(kit.patch(HALF * 2 + 0.6, 200, 0x49a6e0, 0), 0, WATER, -60));
    const ripples = Array.from({ length: 16 }, (_, i) => kit.add(kit.patch(0.35 + (i % 3) * 0.2, 0.06, 0xdff3ff, 0)));
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1, s = 0.8 + (i % 4) * 0.14;
      kit.add(stageTree(kit, side * (3.4 + ((i * 37) % 9)), -4 - i * 2.6, s, [0x4f9d5c, 0x5fae63, 0x3f8a52][i % 3]));
    }
    for (let i = 0; i < 12; i++) { const r = 0.2 + (i % 3) * 0.12, rock = kit.ball(r, 0x9c968d, { ink: 0.02 }); rock.scale.y = 0.6; kit.add(kit.put(rock, (i % 2 ? 1 : -1) * (2.1 + ((i * 5) % 4) * 0.5), r * 0.2, -2.6 - i * 1.9)); }   // kept behind the action
    for (const [x, z, s] of [[-30, -70, 22], [-4, -90, 30], [26, -78, 24], [50, -66, 18]]) { const hill = kit.ball(s, 0x7fa56a, { ink: 0 }); hill.scale.y = 0.45; kit.add(kit.put(hill, x, -s * 0.1, z)); }

    // Every bridge is a list of pieces, so it can be put up block by block (assemble).
    // idea 2: a plank, two halves hinged on the banks so it can sag and snap; they slide out from the banks
    const plank = [-1, 1].map(side => { const g = kit.group(kit.put(kit.box(HALF + 0.06, 0.07, 0.5, 0xc79a5b), -side * (HALF + 0.06) / 2, -0.07, 0)); g.position.set(side * HALF, 0, 0); return kit.add(g); });

    // idea 3: a rope bridge; the deck and ropes swing together, the posts stay
    const rope = kit.add(kit.group()), posts = kit.add(kit.group()), ropeBits = [];
    const bit = (group, obj) => { group.add(obj); ropeBits.push(obj); };
    for (const z of [-0.36, 0.36]) for (const side of [-1, 1]) bit(posts, kit.put(kit.cyl(0.07, 0.85, 0x7a5533), side * (HALF + 0.12), 0, z));
    for (let i = 0; i < 13; i++) { const x = -HALF + 0.14 + (i * (HALF * 2 - 0.28)) / 12; bit(rope, kit.put(kit.box(0.24, 0.05, 0.66, i % 2 ? 0xb98a52 : 0xa87a45, { ink: 0.02 }), x, sagY(x) - 0.05, 0)); }
    for (let i = 0; i < 10; i++) for (const z of [-0.36, 0.36]) {
      const x0 = -HALF - 0.1 + (i * (HALF * 2 + 0.2)) / 10, x1 = x0 + (HALF * 2 + 0.2) / 10;
      bit(rope, kit.beam([x0, sagY(x0) + 0.62, z], [x1, sagY(x1) + 0.62, z], 0.045, 0x6b4a2b, { ink: 0.015 }));
      if (i % 2) bit(rope, kit.beam([x0, sagY(x0), z], [x0, sagY(x0) + 0.62, z], 0.03, 0x6b4a2b, { ink: 0.012 }));
    }

    // idea 4: a stone arch; nine blocks on a circle laid from both banks, the keystone last, then the deck
    const arch = kit.add(kit.group()), R = 3.22, cy = -3.42, span = 0.593, archBits = [];
    for (const i of [0, 8, 1, 7, 2, 6, 3, 5, 4]) {
      const a = -span + (i * span * 2) / 8, block = kit.box(0.47, 0.36, 1.2, i === 4 ? 0xd9c27a : i % 2 ? 0xb9b3a5 : 0xa9a294, { ink: 0.025 });
      block.position.set(Math.sin(a) * (R - 0.36), cy + Math.cos(a) * (R - 0.36), 0); block.rotation.z = -a; arch.add(block); archBits.push(block);
    }
    for (const side of [-1, 1]) archBits.push(arch.add(kit.put(kit.box(0.3, 0.42, 1.2, 0xa9a294, { ink: 0.025 }), side * 1.45, -0.6, 0)).children.at(-1));
    archBits.push(arch.add(kit.put(kit.box(HALF * 2 + 0.5, 0.2, 1.24, 0xc9c3b6, { ink: 0.03 }), 0, -0.2, 0)).children.at(-1));
    for (const z of [-0.57, 0.57]) archBits.push(arch.add(kit.put(kit.box(HALF * 2 + 0.5, 0.16, 0.1, 0xb9b3a5, { ink: 0.02 }), 0, 0, z)).children.at(-1));

    // idea 5: a steel deck truss: the triangles hang under the roadway, so nothing stands between the
    // camera and the people on it. Top chords, then the web panel by panel, bottom chords, then the deck.
    const truss = kit.add(kit.group()), RED = 0xd2503f, TOP = -0.17, LOW = -0.86, upper = [-1.95, -0.975, 0, 0.975, 1.95], lower = [-1.46, -0.49, 0.49, 1.46], trussBits = [];
    const part = obj => { truss.add(obj); trussBits.push(obj); };
    for (const z of [-0.66, 0.66]) part(kit.beam([upper[0], TOP, z], [upper[4], TOP, z], 0.1, RED));
    lower.forEach((x, i) => { for (const z of [-0.66, 0.66]) { part(kit.beam([upper[i], TOP, z], [x, LOW, z], 0.085, RED)); part(kit.beam([x, LOW, z], [upper[i + 1], TOP, z], 0.085, RED)); } });
    for (const z of [-0.66, 0.66]) part(kit.beam([lower[0], LOW, z], [lower[3], LOW, z], 0.1, RED));
    for (let i = 0; i < 8; i++) part(kit.put(kit.box(0.5, 0.1, 1.46, i % 2 ? 0x4a4f5c : 0x555b69, { ink: 0.025 }), -1.8 + i * 0.514, -0.1, 0));

    return {
      update(t, lt, shot) {
        const b = shot.bridge, a = shot.anim ? shot.anim(lt) : {}, bt = shot.built ? 99 : lt;      // built: the bridge is already standing
        plank.forEach((g, i) => { const s = i ? 1 : -1; g.visible = b === 'plank'; g.position.x = s * HALF + s * 2.3 * (1 - EASE.out(clamp((bt - 0.1 - i * 0.12) / 0.4))); g.rotation.z = s * (a.sag || 0); });
        rope.visible = posts.visible = b === 'rope'; rope.rotation.x = a.sway || 0;
        arch.visible = b === 'arch'; truss.visible = b === 'truss';
        if (b === 'rope') assemble(ropeBits, bt, BUILD.rope);
        if (b === 'arch') assemble(archBits, bt, BUILD.arch);
        if (b === 'truss') assemble(trussBits, bt, BUILD.truss);
        ripples.forEach((r, i) => r.position.set(-HALF + 0.3 + ((i * 0.61) % (HALF * 2 - 0.6)), WATER + 0.01, ((i * 3.7 + t * (1.2 + (i % 3) * 0.4)) % 26) - 18));
      },
    };
  },
});

// Water thrown up by a fall. opts.k runs 0..1 over the splash; outside that range nothing is drawn.
registerProp('splash', (ctx, o) => {
  const k = o.k;
  if (!(k > 0 && k < 1)) return;
  ctx.globalAlpha = Math.min(1, (1 - k) * 2.2);
  ctx.beginPath(); ctx.ellipse(0, -6, 18 + k * 34, 4 + k * 7, 0, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#eaf7ff'; ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const dir = (i - 4) / 4, x = dir * (12 + k * 44), y = -8 - Math.sin(Math.PI * Math.min(1, k * 1.15)) * (62 - Math.abs(dir) * 26) * (0.7 + (i % 3) * 0.2), r = 5.5 - k * 2.5 - Math.abs(dir);
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(1.2, r), Math.max(1.6, r * 1.35), dir * 0.5, 0, Math.PI * 2); ink(ctx, i % 2 ? '#bfe6ff' : '#eaf7ff', 1.8);
  }
  ctx.globalAlpha = 1;
});
