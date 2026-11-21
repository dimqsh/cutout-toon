// The automatic motion layers must stay continuous and must actually move things.
import test from 'node:test';
import assert from 'node:assert/strict';
import { go, hasJump, maxStep, blend } from '../src/core.js';
import { REST, EMO, mix } from '../src/pose.js';
import { add, alive, follow, drift, shake, say, walk, jump, wave, closeUp } from '../src/motion.js';

const full = p => blend(REST, p, 1);
const at0 = () => full({});

test('mix gives a full pose, so a later key cannot snap', () => {
  const pose = lt => full(go(mix(EMO.bored, { head: { turn: 0.5 } }), lt, [[0.5, EMO.shock, { dur: 0.25 }]]));
  assert.equal(pose(0).armL.a, REST.armL.a);
  assert.equal(hasJump(pose, 0, 2), null);
});

test('alive never jumps and moves the eyes and the head', () => {
  assert.equal(hasJump(t => alive(t, 3), 0, 12), null);
  const a = alive(1.0, 3), b = alive(4.3, 3);
  assert.notEqual(a.eyes.lx, b.eyes.lx);
  assert.notEqual(a.head.tilt, b.head.tilt);
});

test('follow drags while moving, swings past after the stop, then rests', () => {
  const poseAt = lt => full(walk(REST, lt, 0, 1, 600));
  const sample = t => follow(poseAt, t, 6);
  assert.equal(hasJump(t => ({ ...sample(t).pose, swing: sample(t).swing }), 0, 2.5), null);
  assert.ok(sample(0.5).pose.rot > 0.02, 'leans into the move');
  assert.ok(sample(0.5).swing < -0.05, 'hair trails behind');
  // a hard stop (no ease-out) is what throws the hair forward
  const hard = t => follow(lt => full({ x: 600 * Math.min(1, Math.max(0, lt)) }), t, 6).swing;
  assert.ok(hard(0.6) < -0.05 && Math.max(...[1.02, 1.06, 1.1, 1.14].map(hard)) > 0.05, 'swings past after a hard stop');
  assert.ok(Math.abs(sample(2).swing) < 1e-9 && Math.abs(sample(2).pose.rot) < 1e-9, 'settles');
  assert.equal(Math.sign(follow(poseAt, 0.5, 6, true).swing), 1, 'mirrored for a flipped actor');
  // The lean must point where the hero goes, on screen, whether or not the actor is flipped.
  // drawHero mirrors local rotation for a flipped actor, so world lean = local rot * (flip ? -1 : 1).
  for (const dx of [600, -600]) for (const flip of [false, true]) {
    const at = lt => full(walk(REST, lt, 0, 1, dx)), local = at(0.5).rot + follow(at, 0.5, 6, flip).pose.rot;
    assert.equal(Math.sign(local * (flip ? -1 : 1)), Math.sign(dx), `lean dx ${dx} flip ${flip}`);
    assert.ok(Math.abs(local) > 0.03, `a visible lean, dx ${dx} flip ${flip}`);
  }
  assert.equal(follow(lt => { if (lt < 0) throw new Error('sampled before the shot'); return at0(lt); }, 0.05, 6).swing, 0);
});

test('walk, jump, wave, say and shake are continuous and end at rest', () => {
  for (const [name, f] of Object.entries({
    walk: lt => full(walk(REST, lt, 0.2, 1.4, 500)),
    jump: lt => full(jump(REST, lt, 0.6, 240)),
    wave: lt => full(wave(REST, lt, 0.3, 1.6)),
    say: lt => full(say(REST, lt, [[0.3, 1.2], [1.5, 2]])),
    shake: lt => shake(lt, 0.5),
    drift: lt => drift(lt, 2),
  })) assert.equal(hasJump(f, 0, 3), null, name);
  assert.equal(full(walk(REST, 3, 0.2, 1.4, 500)).x, 500);
  assert.equal(full(jump(REST, 0.6 + 0.31, 0.6, 240)).y, -240);
  for (let lt = 0; lt < 3; lt += 1 / 60) assert.ok(full(jump(mix(EMO.happy), lt, 0.6, 240)).armL.a <= 2.06, 'jump never throws the arms over the head');
  assert.ok(Math.abs(full(jump(REST, 3, 0.6, 240)).squash) < 0.01);
  assert.ok(full(say(REST, 0.8, [[0.3, 1.2]])).mouth.open > 0.1);
  assert.equal(full(say(REST, 2.5, [[0.3, 1.2]])).mouth.open, 0);
  assert.ok(maxStep(lt => shake(lt, 0.5), 0.4, 1, 30).worst > 5);
});

test('add sums nested numbers and closeUp leaves room for the caption', () => {
  assert.deepEqual(add({ a: 1, b: { c: 2 } }, { b: { c: 3, d: 4 } }), { a: 1, b: { c: 5, d: 4 } });
  const cam = closeUp([500, 800], 2);
  assert.equal(cam.x, 500); assert.ok(cam.y > 800); assert.equal(cam.zoom, 2);
});

// ---------- 3D stages (no three.js here: only the parts a lint in node relies on) ----------
import { orbit, headAt, isStage, CAM3, cardRect, sunOnScreen } from '../src/stage3d.js';
import '../src/stages.js';
import { camOf, checkProject } from '../src/index.js';
import { OFFICE } from '../src/cast/people.js';

test('orbit keeps its distance and yaw 0 is straight in front', () => {
  const look = [1, 1.1, -2], d = c => Math.hypot(c.pos[0] - look[0], c.pos[1] - look[1], c.pos[2] - look[2]);
  for (const yaw of [-70, 0, 55]) assert.ok(Math.abs(d(orbit(look, 6, yaw, 7)) - 6) < 1e-9);
  const front = orbit(look, 6, 0, 0);
  assert.deepEqual(front.pos.map(v => +v.toFixed(9)), [1, 1.1, 4]);
  assert.ok(orbit(look, 6, 40, 0).pos[0] > 1, 'positive yaw is to the viewer\'s right');
  assert.deepEqual(headAt({ at: [2, -3], h: 2 }), [2, 1.32, -3]);
});

test('a 3D shot lints like a 2D one: stage sets are known, a camera cut inside a shot is caught', () => {
  assert.ok(isStage('street') && isStage('meadow') && !isStage('room') && !isStage('toString'));
  assert.deepEqual(camOf({ set: 'street' }, 0), CAM3);
  const actor = { hero: OFFICE, at: [0, 0], pose: lt => walk(REST, lt, 0, 1, 0, 6, 900) };
  const shot = cam => ({ DURATION: 2, SHOTS: [{ start: 0, end: 2, set: 'street', cam, actors: [actor] }] });
  assert.deepEqual(checkProject(shot(lt => orbit([0, 1, 0], 6, lt * 20))), []);
  assert.match(checkProject(shot(lt => orbit([0, 1, 0], 6, lt < 1 ? 0 : 60)))[0], /camera jumps/);
  assert.equal(full(walk(REST, 2, 0, 1, 0, 6, 900)).z, 900);
  assert.match(checkProject(shot({ pos: [0, 1.5, 7], look: [0, 1, 0] })).join(), /^$/);
  assert.match(checkProject({ DURATION: 2, SHOTS: [{ start: 0, end: 2, set: 'street', actors: [{ hero: OFFICE, at: [540, 1240] }] }] })[0], /metres/);
  assert.match(checkProject({ DURATION: 2, SHOTS: [{ start: 0, end: 2, set: 'street', draw() {}, props: [{ prop: 'nope', at: [0, 0] }] }] }).join('|'), /do not run in a 3D stage.*known prop name/);
  assert.match(checkProject({ DURATION: 2, SHOTS: [{ start: 0, end: 2, set: 'room', props: [], overlay() {} }] })[0], /props: \[...\] is for 3D stages/);
});

test('a card is as tall as its drawing and stands on the feet line; the screen sun never flips', () => {
  const r = cardRect([72, 144, 12], 1.7);
  assert.ok(Math.abs(r.hgt - 1.56 * 1.7) < 1e-9 && Math.abs(r.w - 1.44 * 1.7) < 1e-9);
  assert.ok(Math.abs(r.cy - r.hgt / 2 + 0.12 * 1.7) < 1e-9, 'the bottom edge is 12 units under the feet');
  assert.deepEqual(sunOnScreen(0.6, 0.8).map(v => +v.toFixed(6)), [0.6, -0.8]);
  assert.deepEqual(sunOnScreen(0, 0), [-0.5, -0.8]);
  for (let a = 0, prev = sunOnScreen(0, 0); a <= 0.4; a += 0.004) { const cur = sunOnScreen(a, a * 0.5); assert.ok(Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) < 0.06, `no jump at ${a}`); prev = cur; }
});
