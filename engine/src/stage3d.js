// "2D + 3D": the drawn heroes stand in a real 3D world. The world is three.js geometry with toon
// shading and an ink hull; every hero and prop is drawn by the 2D rig onto its own card, which turns
// to the camera and drops a real shadow. So the camera can orbit, crane and dolly, and a hero can walk
// toward the lens, not only left and right.
//   registerStage(name, { build(kit) -> {update(t, lt, shot)} | void, ground(x, z, shot, lt) -> floor height, sky(ctx, t, W, H), fog: [color, near, far],
//                         sun: {dir: [x, y, z], color, power}, air: [skyColor, groundColor, power], light2d })
// Units are metres: x right, y up, z toward the viewer. A 3D shot looks like a 2D one, except:
//   set: a stage name,  cam: {pos: [x, y, z], look: [x, y, z], fov}  (or lt => ...),
//   actor: {hero, at: [x, z], h: height in metres (1.7), flip, seed, pose},  props: [{prop, at: [x, z], h, opts}]
// Pose x, y and the new pose.z are still pixels of a 600 px hero (350 px is about 1 m at h 1.7),
// so walk(), jump() and the follow-through work unchanged.
// three.js is loaded only in the browser, by init(); linting a project in node never touches it.
import { registerSet } from './sets.js';
import { drawHero, fill } from './hero.js';
import { drawProp } from './props.js';
import { clamp, EASE } from './core.js';

let T = null, R = null;
const STAGES = {};
export const registerStage = (name, def) => { STAGES[name] = def; registerSet(name, [], { light: def.light2d || {}, stage: true }); };
export const isStage = name => Object.hasOwn(STAGES, name);
export async function init() { if (!T) T = await import('/engine/node_modules/three/build/three.module.js'); }

export const CAM3 = { pos: [0, 1.5, 7.5], look: [0, 1.05, 0], fov: 34, roll: 0 };

// Build-up: the pieces of something arrive one after another, each dropping in with a little spin and
// landing with an overshoot. Call it from a stage's update() with the shot time; pass a big time (99)
// for "already built". o: {at 0.2 (start), gap 0.07 (between pieces), dur 0.34, drop 1.3 m, spin 0.5 rad}.
// Pure: the pose of every piece is computed from lt, nothing is remembered between frames.
// The camera's up vector for a roll (radians) about its own line of sight, whatever the yaw.
export function upFor(pos, look, roll = 0) {
  let f = [look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]]; const fl = Math.hypot(...f) || 1; f = f.map(v => v / fl);
  let u = [-f[1] * f[0], 1 - f[1] * f[1], -f[1] * f[2]]; const ul = Math.hypot(...u);          // world up with the forward part removed
  u = ul > 1e-6 ? u.map(v => v / ul) : [0, 0, -1];                                              // looking straight down: up is away from the viewer
  const r = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]], c = Math.cos(roll), s = Math.sin(roll);
  return [u[0] * c + r[0] * s, u[1] * c + r[1] * s, u[2] * c + r[2] * s];
}

export const buildEnd = (n, o = {}) => (o.at ?? 0.2) + (n - 1) * (o.gap ?? 0.07) + (o.dur ?? 0.34);
export function assemble(pieces, lt, o = {}) {
  const { at = 0.2, gap = 0.07, dur = 0.34, drop = 1.3, spin = 0.5 } = o;
  pieces.forEach((p, i) => {
    const b = p.userData.base || (p.userData.base = { x: p.position.x, y: p.position.y, z: p.position.z, sx: p.scale.x, sy: p.scale.y, sz: p.scale.z, rz: p.rotation.z });
    const u = clamp((lt - at - i * gap) / dur), k = EASE.back(u), fall = 1 - EASE.out(u);
    p.visible = u > 0;
    p.position.set(b.x, b.y + drop * fall, b.z);
    p.scale.set(b.sx * (0.35 + 0.65 * k), b.sy * (0.35 + 0.65 * k), b.sz * (0.35 + 0.65 * k));
    p.rotation.z = b.rz + spin * fall * (i % 2 ? 1 : -1);
  });
}
// A camera on a circle around `look`: yaw 0 is straight in front, positive goes to the viewer's right.
export function orbit(look, dist, yawDeg = 0, pitchDeg = 6, fov = 34) {
  const y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180;
  return { pos: [look[0] + Math.sin(y) * Math.cos(p) * dist, look[1] + Math.sin(p) * dist, look[2] + Math.cos(y) * Math.cos(p) * dist], look, fov };
}
// The face of a 3D actor, as a look target: headAt({at: [x, z], h}).
export const headAt = a => [a.at[0], 0.66 * (a.h ?? 1.7), a.at[1]];
// The card a drawing goes on. box: [halfWidth, top, bottom] in hero units (100 units = the hero's height h).
// Returns its size in metres and how far its centre sits above the feet.
export const cardRect = (box, h) => ({ w: (box[0] * 2 * h) / 100, hgt: ((box[1] + box[2]) * h) / 100, cy: (((box[1] - box[2]) / 2) * h) / 100 });
// The sun as the 2D rig needs it: a direction on screen. v is the sun direction in camera space.
// Near the view axis the screen direction is undefined, so it fades to a default instead of flipping.
export function sunOnScreen(vx, vy) {
  const len = Math.hypot(vx, vy), w = Math.min(1, Math.max(0, (len - 0.08) / 0.22)), n = len || 1;
  return [-0.5 * (1 - w) + (vx / n) * w, -0.8 * (1 - w) + (-vy / n) * w];
}

function gl(W, H) {
  if (R) return R;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  // three steps of light: the same cel look as the 2D shadows
  const ramp = new T.DataTexture(new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
  return (R = { renderer, camera: new T.PerspectiveCamera(34, W / H, 0.1, 500), ramp, scenes: {} });
}

// What a stage's build() gets. Every solid sits on the ground at its position and carries an ink hull.
function makeKit() {
  const INK = new T.MeshBasicMaterial({ color: 0x1c1410, side: T.BackSide });
  const toon = (color, o = {}) => new T.MeshToonMaterial({ color: o.map ? 0xffffff : color, map: o.map || null, gradientMap: R.ramp });
  const solid = (geo, color, dims, lift, o = {}) => {
    const g = new T.Group(), m = new T.Mesh(geo, o.glow ? new T.MeshBasicMaterial({ color }) : toon(color, o));
    m.castShadow = o.cast !== false && !o.glow; m.receiveShadow = !o.glow; m.position.y = lift; g.add(m);
    if (o.ink !== 0) { const th = o.ink ?? 0.035, hull = new T.Mesh(geo, INK); hull.scale.set(...dims.map(d => (d + 2 * th) / d)); hull.position.y = lift; g.add(hull); }
    return g;
  };
  const kit = {
    T, toon,
    box: (w, h, d, color, o) => solid(new T.BoxGeometry(w, h, d), color, [w, h, d], h / 2, o),
    cyl: (r, h, color, o = {}) => solid(new T.CylinderGeometry(r * (o.top ?? 1), r, h, 18), color, [2 * r, h, 2 * r], h / 2, o),
    cone: (r, h, color, o) => solid(new T.ConeGeometry(r, h, 18), color, [2 * r, h, 2 * r], h / 2, o),
    ball: (r, color, o) => solid(new T.IcosahedronGeometry(r, 3), color, [2 * r, 2 * r, 2 * r], 0, o),
    // a flat patch on the ground (road, rug, marking); `y` lifts it a hair so it does not flicker
    patch: (w, d, color, y = 0.01, o = {}) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), toon(color, o)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; const g = new T.Group(); g.add(m); return g; },
    // a texture painted with the 2D canvas API: tex(256, 512, (ctx, w, h) => ...)
    tex: (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; },
    // a straight bar between two points (a rope, a girder, a rail); it is centred on the line, not sat on the ground
    beam: (a, b, th, color, o) => {
      const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), g = solid(new T.BoxGeometry(len, th, th), color, [len, th, th], 0, o);
      g.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); g.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), d.normalize()); return g;
    },
    put: (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; },
    group: (...kids) => { const g = new T.Group(); if (kids.length) g.add(...kids); return g; },
  };
  return kit;
}

function sceneFor(name, W, H) {
  gl(W, H);
  if (R.scenes[name]) return R.scenes[name];
  const def = STAGES[name], scene = new T.Scene(), kit = makeKit();
  const sunDef = { dir: [-0.5, 1, 0.6], color: 0xfff1d0, power: 2.6, ...(def.sun || {}) };
  const sun = new T.DirectionalLight(sunDef.color, sunDef.power);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 });
  const air = def.air || [0xcfd6ff, 0x8f86c9, 1.5];   // coloured fill light: this is what tints the shadows
  scene.add(sun, sun.target, new T.HemisphereLight(air[0], air[1], air[2]));
  if (def.fog) scene.fog = new T.Fog(def.fog[0], def.fog[1], def.fog[2]);
  const world = new T.Group(); scene.add(world);
  kit.add = (...objs) => { world.add(...objs); return objs[0]; };
  const made = (def.build && def.build(kit)) || {};
  return (R.scenes[name] = { def, scene, sun, sunDir: new T.Vector3(...sunDef.dir).normalize(), update: made.update, cards: [] });
}

function card(S, i) {
  if (S.cards[i]) return S.cards[i];
  const canvas = document.createElement('canvas'), tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
  const geo = new T.PlaneGeometry(1, 1);
  const mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: T.DoubleSide }));
  // a second, invisible card turned to the sun: a card that faces the camera would cast a sliver
  const caster = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: T.DoubleSide }));
  caster.castShadow = true; caster.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  // a soft blob under the feet, so a hero is planted even where a house already shades the road
  if (!R.blob) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(14,10,30,0.5)'); g.addColorStop(1, 'rgba(14,10,30,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); R.blob = new T.CanvasTexture(c);
  }
  const blob = new T.Mesh(geo, new T.MeshBasicMaterial({ map: R.blob, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = -1;
  S.scene.add(mesh, caster, blob);
  return (S.cards[i] = { canvas, tex, mesh, caster, blob });
}

const SIZES = [256, 384, 576, 864, 1296, 1800];
// Paint one card and stand it in the world. box: [halfWidth, top, bottom] of the drawing in hero units.
function place(S, i, cam, x, y, z, h, box, light2d, paint, floor = 0) {
  const c = card(S, i), camera = R.camera;
  const dist = Math.hypot(camera.position.x - x, camera.position.y - (y + h * 0.5), camera.position.z - z);
  const onScreen = (h * R.renderer.domElement.height) / (2 * Math.tan((cam.fov * Math.PI) / 360) * Math.max(0.3, dist));
  const size = SIZES.find(s => s >= onScreen * 1.1) || SIZES[SIZES.length - 1], u = size / 100;
  const w = Math.ceil(box[0] * 2 * u), hh = Math.ceil((box[1] + box[2]) * u);
  if (c.canvas.width !== w || c.canvas.height !== hh) { c.canvas.width = w; c.canvas.height = hh; c.tex.dispose(); }
  const ctx = c.canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, hh);
  paint(ctx, w / 2, box[1] * u, size, light2d);
  c.tex.needsUpdate = true;
  const rect = cardRect(box, h), air = Math.min(1, Math.max(0, y - floor) / (h * 1.2));
  c.blob.visible = y >= floor - 0.05; c.blob.position.set(x, floor + 0.03, z); c.blob.scale.set(h * 0.62 * (1 - 0.5 * air), h * 0.3 * (1 - 0.5 * air), 1); c.blob.material.opacity = 1 - 0.6 * air;
  for (const mesh of [c.mesh, c.caster]) { mesh.visible = true; mesh.scale.set(rect.w, rect.hgt, 1); mesh.position.set(x, y + rect.cy, z); }
  c.mesh.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
  // turned to the sun; when the sun is behind the hero the card is seen from its back, so flip it or the shadow is mirrored
  const behind = S.sunDir.x * (camera.position.x - x) + S.sunDir.z * (camera.position.z - z) < 0;
  c.caster.rotation.y = Math.atan2(S.sunDir.x, S.sunDir.z) + (behind ? Math.PI : 0);
}

// Draw one 3D shot into the 2D context. actors: [{a, pose, dyn}] already acted by the composer.
export function draw(ctx, name, shot, cam, actors, lt, t, W, H) {
  if (!T) throw new Error(`set "${name}" is a 3D stage: three.js is not loaded (open the project through render.mjs)`);
  const S = sceneFor(name, W, H), { renderer, camera } = R;
  camera.fov = cam.fov; camera.position.set(...cam.pos); camera.updateProjectionMatrix();
  camera.up.set(...upFor(cam.pos, cam.look, cam.roll || 0)); camera.lookAt(...cam.look); camera.updateMatrixWorld(true);   // roll: a tilted horizon
  S.sun.target.position.set(cam.look[0], 0, cam.look[2]); S.sun.position.copy(S.sun.target.position).addScaledVector(S.sunDir, 40);
  // where the sun is on screen: the 2D rig shades each card from there
  const v = S.sunDir.clone().transformDirection(camera.matrixWorldInverse);
  const light2d = sunOnScreen(v.x, v.y);
  for (const c of S.cards) { c.mesh.visible = false; c.caster.visible = false; c.blob.visible = false; }
  const floorAt = (x, z) => (S.def.ground ? S.def.ground(x, z, shot, lt) : 0);   // where the soft shadow under a hero lies
  let n = 0;
  for (const { a, pose, dyn } of actors) {
    const h = a.h ?? 1.7, px = h / 600, spec = fill(a.hero), k = Math.max(1, spec.headW, spec.headH, spec.armLen);
    place(S, n++, cam, a.at[0] + pose.x * px, -pose.y * px, a.at[1] + (pose.z || 0) * px, h, [72 * k, 144 * k, 12], light2d, (c2, cx, base, size, dir) =>
      drawHero(c2, a.hero, { ...pose, x: 0, y: 0 }, t, { x: cx, y: base, size, flip: a.flip, seed: a.seed ?? 1, flat: a.flat, shadow: false, dyn, light: { ...(a.light || {}), dir } }),
      floorAt(a.at[0] + pose.x * px, a.at[1] + (pose.z || 0) * px));
  }
  for (const p of shot.props || []) {
    const h = p.h ?? 1;
    place(S, n++, cam, p.at[0], p.y ?? 0, p.at[1], h, [115, 138, 14], light2d, (c2, cx, base, size, dir) =>
      drawProp(c2, p.prop, cx, base, size, { ...(typeof p.opts === 'function' ? p.opts(lt) : p.opts || {}), light: { dir } }, t), p.shadow === false ? 1e9 : (p.y ?? 0));
  }
  if (S.update) S.update(t, lt, shot);
  renderer.render(S.scene, camera);
  if (S.def.sky) S.def.sky(ctx, t, W, H);
  ctx.drawImage(renderer.domElement, 0, 0, W, H);
}
