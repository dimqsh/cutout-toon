// Public API for a project's shots.js, plus the frame composer and the project linter.
// A project exports:
//   DURATION  seconds
//   SHOTS     [{start, end, set, cam, actors, under, draw, overlay, tr}]
//   CAPTIONS  [[start, end, 'text'], ...]   (optional)
import { blend, go, hasJump, maxStep, clamp, lerp, EASE } from './core.js';
import { REST, EMO, mix } from './pose.js';
import { drawHero, headOf, checkSpec, shade, fill as heroDefaults } from './hero.js';
import { drawProp, registerProp, propNames, ink } from './props.js';
import { drawSet, camTransform, registerSet, setNames, setLight, GROUND } from './sets.js';
import { setFrame, LIGHT0 } from './light.js';
import { add, alive, follow, drift, shake, say, closeUp, walk, jump, wave } from './motion.js';
import { post } from './post.js';
import * as stage3d from './stage3d.js';
import { registerStage, isStage, orbit, headAt, CAM3, assemble, buildEnd } from './stage3d.js';
import { cam2, cam3, chain, dutch, hit } from './cams.js';
import * as D from './diagram.js';
export { sky as skyGradient, clouds as skyClouds, tree as stageTree } from './stages.js';
import * as ui from './ui.js';
export { SLOTH } from './cast/sloth.js';
export { PANDA } from './cast/panda.js';
export { CAT } from './cast/cat.js';
export * from './cast/people.js';
export * from './cast/things.js';
export { blend, go, clamp, lerp, EASE, REST, EMO, mix, drawHero, headOf, checkSpec, shade, heroDefaults, drawProp, registerProp, propNames, ink, registerSet, setNames, GROUND, ui, add, alive, shake, say, closeUp, walk, jump, wave, LIGHT0, registerStage, isStage, orbit, headAt, CAM3, assemble, buildEnd, cam2, cam3, chain, dutch, hit, D };
export const initStages = () => stage3d.init();

export const W = 1080, H = 1920;
const CAM0 = { x: W / 2, y: H / 2, zoom: 1 };
const WIPE = 0.24;

export const camOf = (shot, lt) => blend(isStage(shot.set) ? CAM3 : CAM0, (typeof shot.cam === 'function' ? shot.cam(lt) : shot.cam) || {}, 1);
export const poseOf = (actor, lt) => blend(REST, (typeof actor.pose === 'function' ? actor.pose(lt) : actor.pose) || {}, 1);
export function shotAt(shots, t) {
  for (let i = 0; i < shots.length; i++) if (t >= shots[i].start && t < shots[i].end) return i;
  return t < shots[0].start ? 0 : shots.length - 1;
}

// Project-wide look: export const LOOK = { shade: 'hatch', boil: 0, grain: 0.5, ... } from shots.js.
export const LOOK0 = { shade: 'solid', boil: 1, grain: 1, vignette: 1, bloom: 1, alive: 1, follow: 1, drift: 1 };

export function renderFrame(ctx, proj, t) {
  const shots = proj.SHOTS, n = shotAt(shots, t), s = shots[n], lt = t - s.start, look = { ...LOOK0, ...(proj.LOOK || {}) };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ui.panel(ctx, W, H, () => {
    const set = s.set || 'card';
    const three = isStage(set);
    let cam = camOf(s, lt);
    if (look.drift && s.still !== true) {
      const d = blend({ x: 0, y: 0, zoom: 0 }, drift(t, n + 1), look.drift);
      if (!three) cam = add(cam, d);
      else {   // the same few pixels on screen at any distance: slide the camera and its target together
        const k = Math.hypot(cam.pos[0] - cam.look[0], cam.pos[1] - cam.look[1], cam.pos[2] - cam.look[2]) * 0.0006, dx = d.x * k, dy = d.y * k;
        cam = { ...cam, pos: [cam.pos[0] + dx, cam.pos[1] + dy, cam.pos[2]], look: [cam.look[0] + dx, cam.look[1] + dy, cam.look[2]] };
      }
    }
    setFrame({ style: look.shade, ...setLight(set), ...(s.light || {}), ...(look.boil ? {} : { boil: 0 }) }, t);
    // every actor gets its idle acting and follow-through here, the same way in 2D and in 3D
    const acted = (s.actors || []).map(a => {
      const seed = a.seed ?? 1, sc = three ? 6 : (a.size ?? 600) / 100, poseAt = l => poseOf(a, l);
      let pose = poseAt(lt), dyn;
      if (!a.flat && a.alive !== false && look.alive) pose = add(pose, alive(t, seed, look.alive * (a.alive ?? 1)));
      if (!a.flat && a.follow !== false && look.follow) { dyn = follow(poseAt, lt, sc, a.flip); pose = add(pose, dyn.pose); }
      return { a, pose, dyn, seed };
    });
    if (three) stage3d.draw(ctx, set, s, cam, acted, lt, t, W, H);
    else {
      drawSet(ctx, set, t, cam, W, H, false);
      ctx.save(); camTransform(ctx, cam, 1, W, H);
      if (s.under) s.under(ctx, lt, t);
      for (const { a, pose, dyn, seed } of acted) drawHero(ctx, a.hero, pose, t, { x: a.at[0], y: a.at[1], size: a.size, flip: a.flip, seed, flat: a.flat, shadow: a.shadow, dyn, light: a.light });
      if (s.draw) s.draw(ctx, lt, t);
      ctx.restore();
      drawSet(ctx, set, t, cam, W, H, true);
    }
    if (s.overlay) s.overlay(ctx, lt, t);
    post(ctx, t, W, H, look);
    for (const k of shots) if (k.tr === 'wipe' && Math.abs(t - k.end) < WIPE) ui.wipe(ctx, (t - k.end) / WIPE, W, H);
    for (const [a, b, str] of proj.CAPTIONS || []) if (t >= a && t < b) ui.caption(ctx, str, t - a, W, H);
  });
}

// Lint a project without drawing it. Returns a list of problems; empty means clean.
export function checkProject(proj) {
  const bad = [], shots = proj.SHOTS || [];
  if (!(proj.DURATION > 0)) bad.push('DURATION must be a positive number');
  if (!shots.length) return bad.concat('SHOTS is empty');
  shots.forEach((s, i) => {
    const id = `shot ${i} (${s.start}-${s.end})`;
    if (!(s.end > s.start)) bad.push(`${id}: end must be after start`);
    if (i === 0 && s.start !== 0) bad.push(`${id}: the first shot must start at 0`);
    if (i > 0 && Math.abs(s.start - shots[i - 1].end) > 1e-6) bad.push(`${id}: gap or overlap with the shot before it`);
    if (s.set && !setNames().includes(s.set)) bad.push(`${id}: unknown set "${s.set}"`);
    if (s.end - s.start > 4.5) bad.push(`${id}: longer than 4.5 s, cut it or move the camera to a new framing`);
    const span = [0, s.end - s.start - 1e-3];
    const j = hasJump(lt => camOf(s, lt), ...span);
    if (j) bad.push(`${id}: camera jumps on "${j.key}"`);
    const still = maxStep(lt => camOf(s, lt), ...span, 30).worst === 0;
    (s.actors || []).forEach((a, n) => {
      if (!a.hero || !a.at) { bad.push(`${id}: actor ${n} needs hero and at`); return; }
      for (const p of checkSpec(a.hero)) bad.push(`${id}: actor ${n}: ${p}`);
      const pj = hasJump(lt => poseOf(a, lt), ...span);
      if (pj) bad.push(`${id}: actor ${n} (${a.hero.name}) jumps on "${pj.key}"`);
      const fast = maxStep(lt => { const p = poseOf(a, lt); return { x: p.x, y: p.y, z: p.z }; }, ...span, 30);
      if (isStage(s.set) && (Math.abs(a.at[0]) > 80 || Math.abs(a.at[1]) > 200)) bad.push(`${id}: actor ${n} (${a.hero.name}): in a 3D stage \`at\` is [x, z] in metres, got [${a.at}]`);
      if (fast.worst > 90) bad.push(`${id}: actor ${n} moves ${fast.worst.toFixed(0)} px in one frame`);
    });
    if (isStage(s.set)) {
      if (s.under || s.draw) bad.push(`${id}: under() and draw() do not run in a 3D stage; put things in the world with props: [{prop, at: [x, z], h}]`);
      (s.props || []).forEach((p, k) => { if (!propNames().includes(p.prop) || !Array.isArray(p.at)) bad.push(`${id}: prop ${k} needs a known prop name and at: [x, z]`); });
    } else if (s.props) bad.push(`${id}: props: [...] is for 3D stages; in a 2D set call drawProp() in under() or draw()`);
    if (still && !(s.actors || []).length && !s.draw && !s.overlay && !(s.props || []).length) bad.push(`${id}: nothing moves and nothing is drawn`);
  });
  if (Math.abs(shots[shots.length - 1].end - proj.DURATION) > 1e-6) bad.push('the last shot must end at DURATION');
  (proj.CAPTIONS || []).forEach(([a, b, str], i) => {
    if (!(b > a) || b > proj.DURATION + 1e-6) bad.push(`caption ${i} "${str}": bad time range`);
    if (str.trim().split(/\s+/).length > 3) bad.push(`caption ${i} "${str}": more than 3 words`);
    if (i > 0 && a < proj.CAPTIONS[i - 1][1] - 1e-6) bad.push(`caption ${i} "${str}": overlaps the caption before it`);
  });
  return bad;
}
