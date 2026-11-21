// Named camera moves, the diagram timing helpers and the piece-by-piece build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasJump } from '../src/core.js';
import { cam2, cam3, chain, dutch, hit } from '../src/cams.js';
import { assemble, buildEnd, upFor, orbit } from '../src/stage3d.js';
import * as D from '../src/diagram.js';

const LOOK = [0, 1, 0], RAD = Math.PI / 180;
const dist = c => Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]);
const finite = c => Object.values(c).flat().every(Number.isFinite);

test('every 3D move is continuous and gives a usable camera', () => {
  const moves = {
    orbit: cam3.orbit(LOOK), pushIn: cam3.pushIn(LOOK), pullOut: cam3.pullOut(LOOK), crane: cam3.crane(LOOK), craneUp: cam3.craneUp(LOOK),
    truck: cam3.truck([-2, 1, 0], [2, 1, 0]), topDown: cam3.topDown(LOOK), lowAngle: cam3.lowAngle(LOOK), whip: cam3.whip([-2, 1, 0], [2, 1, 0], { at: 1 }),
    follow: cam3.follow(lt => [Math.min(lt, 3), 1, 0]), dollyZoom: cam3.dollyZoom(LOOK), flyTo: cam3.flyTo([-3, 1, 0], [3, 1, -4]),
  };
  for (const [name, cam] of Object.entries(moves)) {
    for (const lt of [0, 0.7, 2, 4]) { const c = cam(lt); assert.ok(finite(c), `${name} at ${lt}`); assert.ok(c.pos && c.look && c.fov > 0, name); }
    assert.equal(hasJump(cam, 0, 4), null, name);
    assert.deepEqual(cam(9), cam(30), `${name} holds its end`);
  }
});

test('a move starts at `at`, lasts `dur`, and takes pairs for its numbers and its target', () => {
  const cam = cam3.orbit([[0, 1, 0], [4, 1, 0]], { dist: [8, 4], yaw: 0, pitch: 0, at: 1, dur: 2, ease: 'linear' });
  assert.deepEqual(cam(0), cam(1));
  assert.ok(Math.abs(dist(cam(1)) - 8) < 1e-9 && Math.abs(dist(cam(2)) - 6) < 1e-9 && Math.abs(dist(cam(3)) - 4) < 1e-9);
  assert.ok(Math.abs(cam(2).look[0] - 2) < 1e-9);
});

test('orbit never goes under its floor', () => {
  assert.ok(cam3.lowAngle([0, 0, 0], { pitch: -30 })(1).pos[1] >= 0.2);
  assert.ok(Math.abs(cam3.lowAngle([0, 0, 0], { pitch: -30, floor: -0.7 })(1).pos[1] + 0.7) < 1e-9);
});

test('dolly zoom keeps the subject the same size while the lens changes', () => {
  const cam = cam3.dollyZoom(LOOK, { dist: [5, 9], fov: 34 }), size = c => dist(c) * Math.tan((c.fov * RAD) / 2);
  assert.ok(Math.abs(size(cam(0)) - size(cam(0.9))) < 1e-9 && Math.abs(size(cam(0)) - size(cam(3))) < 1e-9);
  assert.ok(cam(3).fov < cam(0).fov - 5);
});

test('every 2D move is continuous; zoomTo ends on its detail', () => {
  const moves = { pushIn: cam2.pushIn([300, 700]), pullOut: cam2.pullOut([300, 700]), pan: cam2.pan([300, 900], [800, 900]), zoomTo: cam2.zoomTo([300, 700]), kenBurns: cam2.kenBurns(), follow: cam2.follow(lt => [300 + lt * 100, 900]), flyTo: cam2.flyTo([200, 600], [900, 1200]) };
  for (const [name, cam] of Object.entries(moves)) { assert.equal(hasJump(cam, 0, 4), null, name); assert.ok(finite(cam(1.3)), name); }
  assert.deepEqual(cam2.zoomTo([300, 700])(5), { x: 300, y: 700, zoom: 2.4 });
  assert.deepEqual(cam2.pushIn([300, 700], { from: [512, 942] })(0), { x: 512, y: 942, zoom: 1 });
});

test('chain is the first move before the blend and the second after it', () => {
  const a = cam3.pushIn(LOOK), b = cam3.craneUp(LOOK, { at: 2 }), cam = chain(a, b, 2, 0.6);
  assert.deepEqual(cam(1.9), { ...a(1.9), roll: 0 }); assert.deepEqual(cam(2.7), { ...b(2.7), roll: 0 });   // modifiers spell the tilt out
  assert.equal(hasJump(cam, 0, 5), null);
});

test('chain does not leak a tilt across the blend: it is 0 on the side that has none', () => {
  const tilt3 = chain(cam3.pushIn(LOOK), dutch(cam3.orbit(LOOK), 8), 2, 0.6), back3 = chain(dutch(cam3.orbit(LOOK), 8), cam3.pushIn(LOOK), 2, 0.6);
  assert.equal(tilt3(1).roll, 0); assert.ok(Math.abs(tilt3(3).roll - 8 * RAD) < 1e-9);
  assert.ok(Math.abs(back3(1).roll - 8 * RAD) < 1e-9); assert.equal(back3(3).roll, 0);
  const tilt2 = chain(cam2.kenBurns(), dutch(cam2.kenBurns(), 5), 1, 0.5);
  assert.equal(tilt2(0.5).rot, 0); assert.ok(Math.abs(tilt2(2).rot - 5 * RAD) < 1e-9);
});

test('a roll turns the picture by the same angle from any side', () => {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (const yaw of [0, 30, 60, 90, -120]) {
    const c = orbit(LOOK, 6, yaw, 8), flat = upFor(c.pos, c.look, 0), tilted = upFor(c.pos, c.look, 10 * RAD), f = c.look.map((v, i) => v - c.pos[i]);
    assert.ok(Math.abs(Math.acos(dot(flat, tilted)) - 10 * RAD) < 1e-9, `yaw ${yaw}`);
    assert.ok(Math.abs(dot(tilted, f)) < 1e-9 && Math.abs(Math.hypot(...tilted) - 1) < 1e-9, `yaw ${yaw}: unit, square to the view`);
  }
  assert.deepEqual(upFor([0, 1, 5], [0, 1, 0], 0), [0, 1, 0]);
  assert.ok(upFor([0, 1, 5], [0, 1, 0], 0.3)[0] > 0, 'a positive roll leans the up vector to the right, as before');
  assert.ok(upFor([0, 9, 0], [0, 0, 0], 0).every(Number.isFinite), 'straight down still has an up');
});

test('a zero duration is a cut, and modifiers accept a partial camera', () => {
  assert.deepEqual(cam2.pushIn([300, 700], { dur: 0 })(0), { x: 300, y: 700, zoom: 1.6 });
  assert.ok(Object.values(chain(cam2.kenBurns(), cam2.zoomTo([300, 700]), 1, 0)(1)).every(Number.isFinite));
  assert.equal(D.step(1, 1, 0), 1); assert.equal(D.step(0.9, 1, 0), 0); assert.equal(D.nth(0, 0, 0, 0, 0), 1);
  const h3 = hit(() => ({ pos: [0, 1, 5], fov: 30 }), 1)(1.1), h2 = hit(() => ({ zoom: 1.3 }), 1)(1.1);
  assert.ok(h3.look.every(Number.isFinite) && h3.fov === 30);
  assert.ok(Number.isFinite(h2.x) && Number.isFinite(h2.y) && h2.zoom === 1.3);
  assert.ok('roll' in dutch(() => ({ fov: 20 }), 5)(3) && 'rot' in dutch(() => ({ zoom: 1.2 }), 5)(3));
  const twoPoints = cam3.dollyZoom([[0, 1, 0], [2, 1, 0]], { fov: [34, 20] });
  assert.ok(twoPoints(0.9).fov > 0 && Math.abs(twoPoints(9).look[0] - 2) < 1e-9);
  assert.ok(cam3.flyTo([0, 1, 0], [3, 1, 0], { fov: [34, 28] })(9).fov === 28);
});

test('dutch rolls a 3D camera and rotates a 2D one; hit moves it only around the impact', () => {
  assert.ok(Math.abs(dutch(cam3.orbit(LOOK), [0, 10])(5).roll - 10 * RAD) < 1e-9);
  assert.ok(Math.abs(dutch(cam2.kenBurns(), 6)(1).rot - 6 * RAD) < 1e-9);
  const base = cam3.pushIn(LOOK), shaken = hit(base, 1);
  assert.deepEqual(shaken(0.9), { ...base(0.9), roll: 0 }); assert.deepEqual(shaken(2), { ...base(2), roll: 0 });
  assert.notDeepEqual(shaken(1.1).pos, base(1.1).pos);
  assert.equal(hasJump(shaken, 0, 3), null);
  assert.notEqual(hit(cam2.kenBurns(), 1)(1.1).x, cam2.kenBurns()(1.1).x);
});

// what assemble() needs from a three.js mesh
const piece = (x, y) => ({ visible: true, userData: {}, position: { x, y, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }, scale: { x: 1, y: 1, z: 1, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }, rotation: { z: 0.3 } });

test('assemble puts pieces up one after another and leaves them exactly in place', () => {
  const pieces = [0, 1, 2, 3].map(i => piece(i, 2)), o = { at: 0.5, gap: 0.1, dur: 0.3, drop: 1.5 };
  assemble(pieces, 0.4, o);
  assert.ok(pieces.every(p => !p.visible));
  assemble(pieces, 0.75, o);
  assert.deepEqual(pieces.map(p => p.visible), [true, true, true, false]);
  assert.ok(pieces[0].position.y < pieces[1].position.y && pieces[1].position.y < pieces[2].position.y, 'earlier pieces are further down');
  assert.ok(Math.abs(buildEnd(4, o) - 1.1) < 1e-9);
  assemble(pieces, buildEnd(4, o), o);
  pieces.forEach((p, i) => { assert.ok(p.visible); assert.deepEqual([p.position.x, p.position.y, p.scale.x, p.rotation.z].map(v => +v.toFixed(9)), [i, 2, 1, 0.3]); });
  assemble(pieces, 0.75, o);                                    // any frame can be drawn after any other
  assert.equal(pieces[3].visible, false);
  assemble(pieces, 99, o);
  assert.equal(pieces[3].position.y, 2);
});

test('diagram timing: steps clamp, nth staggers, paths measure', () => {
  assert.equal(D.step(1, 2), 0); assert.equal(D.step(9, 2), 1); assert.ok(Math.abs(D.step(2.175, 2) - 0.5) < 1e-9);
  assert.ok(Math.abs(D.pop(0, 1)) < 1e-9 && Math.abs(D.pop(9, 1) - 1) < 1e-9 && D.pop(1.25, 1) > 1, 'pop starts at 0, overshoots, ends at 1');
  assert.ok(D.nth(0.5, 0) > D.nth(0.5, 3) && D.nth(0.5, 9) === 0 && D.nth(5, 9) === 1);
  assert.equal(D.length([[0, 0], [3, 4], [3, 10]]), 11);
  const c = D.curve([0, 0], [50, 100], [100, 0], 10);
  assert.equal(c.length, 11); assert.deepEqual(c[0], [0, 0]); assert.deepEqual(c[10], [100, 0]); assert.equal(c[5][1], 50);
});

test('a line draws itself by length, and flow dots stay on the path and depend only on the time', () => {
  const rec = () => { const pts = [], arcs = []; return { pts, arcs, ctx: new Proxy({}, { get: (_, k) => (k === 'moveTo' || k === 'lineTo' ? (x, y) => pts.push([x, y]) : k === 'arc' ? (x, y) => arcs.push([x, y]) : k === 'globalAlpha' ? 1 : () => {}), set: () => true }) }; };
  const path = [[0, 0], [100, 0], [100, 100]];
  const half = rec(); D.line(half.ctx, path, 0.5, { ink: false });
  assert.deepEqual(half.pts, [[0, 0], [100, 0]]);
  const most = rec(); D.line(most.ctx, path, 0.75, { ink: false });
  assert.deepEqual(most.pts, [[0, 0], [100, 0], [100, 50]]);
  const a = rec(), b = rec(), later = rec();
  D.flow(a.ctx, path, 1.3); D.flow(b.ctx, path, 1.3); D.flow(later.ctx, path, 1.4);
  assert.ok(a.arcs.length >= 3 && a.arcs.every(([x, y]) => (y === 0 && x >= 0 && x <= 100) || (x === 100 && y >= 0 && y <= 100)), 'dots are on the path');
  assert.deepEqual(a.arcs, b.arcs); assert.notDeepEqual(a.arcs, later.arcs);
  const none = rec(); D.flow(none.ctx, path, 1.3, { gap: -5 }); D.flow(none.ctx, path, 1.3, { gap: 0 });
  assert.equal(none.arcs.length, 0);
});

test('every diagram mark draws at any progress without throwing, and draws nothing at 0', () => {
  let calls = 0;
  const ctx = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 120 }) : k === 'globalAlpha' ? 1 : () => { calls++; }), set: () => true });
  const draw = u => {
    D.line(ctx, [[0, 0], [100, 0], [100, 100]], u); D.joint(ctx, [5, 5], u); D.bar(ctx, [0, 0], [100, 50], u); D.arrow(ctx, [0, 0], [200, 0], u);
    D.flow(ctx, [[0, 0], [300, 0]], 1.3, { a: u }); D.label(ctx, 'note', [0, 0], [100, -80], u); D.block(ctx, 50, 50, 80, 60, '#888', u, { label: 'KG' });
    D.tick(ctx, 0, 0, u); D.cross(ctx, 0, 0, u); D.count(ctx, 40, u, 0, 0); D.ruler(ctx, [0, 0], [400, 0], u, 4); D.spot(ctx, 0, 0, 100, u);
  };
  draw(0);
  assert.equal(calls, 0);
  for (const u of [0.01, 0.3, 0.5, 0.99, 1, 1.7]) draw(u);
  assert.ok(calls > 100);
});
