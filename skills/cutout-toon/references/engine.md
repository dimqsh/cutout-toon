# cutout-toon engine reference

Everything is canvas 2D in headless Chrome (Playwright), frames piped to ffmpeg. Every frame is a pure function of time, so any frame can be rendered alone and a range can be re-rendered and spliced.

## Commands
```bash
PLUG=~/fleet/plugins/cutout-toon
node $PLUG/engine/render.mjs <project> check                     # lint only, exit 1 on PROBLEM
node $PLUG/engine/render.mjs <project> stills 0.5,3.2 [outDir]    # PNGs
node $PLUG/engine/render.mjs <project> sheet [out.jpg] [times]    # contact sheet, one frame per shot by default
node $PLUG/engine/render.mjs <project> video [out.mp4] [fps] [from] [to]
node --test $PLUG/engine/tests/*.test.mjs                         # after changing the engine
```
Needs `$PLUG/engine/node_modules` (`npm run setup --prefix $PLUG/engine` installs playwright and three.js and downloads Chromium) and ffmpeg. Open `$PLUG/engine/index.html` through the renderer only; it needs the project served at `/project/`. Working example with every feature: `$PLUG/examples/office/shots.js`.

## The look (automatic, do not rebuild it by hand)
- **Light from the set.** Every hero is drawn on layers and lit by the set it stands in: a coloured shadow on the side away from the light, the head's shadow on the body, a rim of light on the lit edge, a tint (blue at night, orange at dusk), a cast shadow on the ground. Props get the shadow and the tint, no rim.
- **Living ink line.** The outline wobbles 8 times a second and is heavier on the shadow side.
- **Post pass.** Glow on bright areas, vignette, paper grain.
- Project-wide switches: `export const LOOK = { shade: 'solid' | 'hatch' | 'dots', boil: 1, grain: 1, vignette: 1, bloom: 1, alive: 1, follow: 1, drift: 1 }` (0 turns a part off).
- One shot or one actor can override the light: `light: { dir: [x, y] toward the light, shadow: '#hex', amount, rim: '#hex' | null, rimAmount, tint: '#hex' | null, cast, style }`.

## Project file: `<project>/shots.js`
```js
import { go, mix, EMO, GROUND, headOf, closeUp, walk, say, shake, add, drawProp, ui, OFFICE } from '/engine/src/index.js';
const G = GROUND + 6;
const boss = { hero: OFFICE, at: [-200, G], size: 640, seed: 4 };
export const DURATION = 6;
export const SHOTS = [
  { start: 0, end: 3, set: 'room', cam: lt => go({ x: 600, zoom: 1.04 }, lt, [[0.2, { x: 540, zoom: 1.12 }, { dur: 2.6, ease: 'inout' }]]),
    actors: [{ ...boss, pose: lt => say(walk(go(mix(EMO.calm, { head: { turn: 0.5 } }), lt, [[1.6, EMO.shock, { dur: 0.3 }]]), lt, 0.1, 1.4, 700), lt, [[1.8, 2.8]]) }],
    under(ctx, lt, t) { drawProp(ctx, 'coin', 860, G, 160, { ground: true }, t); } },      // world space, behind the actors
  { start: 3, end: 6, set: 'card', tr: 'wipe',
    overlay(ctx, lt) { ui.text(ctx, '$900', 540, 500, 150, { color: '#ffd94a' }); } },    // screen space
];
export const CAPTIONS = [[0.2, 1.2, 'you are'], [1.2, 3, 'broke']];
```
- Shot: `{start, end, set, cam, actors, under, draw, overlay, tr, light, still}`. Shots must tile 0..DURATION with no gaps; 4.5 s max each.
- `cam`: object or `lt => ({x, y, zoom, rot})`; rest is `{x: 540, y: 960, zoom: 1}`. Pick a named move from "Camera moves" below instead of hand-writing lerps; always move it a little. Close-up: `cam: closeUp(headOf(actor), 2.3)` keeps the face above the caption. `still: true` switches the hand-held drift off for a diagram.
- `actor`: `{hero, at: [x, y feet], size (px tall, 600 default), flip, seed (blink and idle offset), flat: '#hex' (silhouette), shadow: false, alive: 0..1 (idle acting), follow: false (no follow-through), light, pose}`.
- `under` draws in world space behind actors, `draw` in front of them, `overlay` in screen space above the set's foreground.
- `tr: 'wipe'` covers the cut at this shot's end with a wavy curtain.
- Captions: `[start, end, text]`, 1 to 3 words, no overlaps. Text is upper-cased and pops in.

## 3D stages: drawn heroes in a real 3D world
Use a stage when the camera has to travel (orbit, crane, dolly) or someone walks toward or away from the lens. Heroes and props stay drawn by the 2D rig, on cards that turn to the camera and cast real shadows; the world is three.js geometry with toon shading and an ink hull. Working example: `$PLUG/examples/street3d/shots.js`.
```js
import { go, mix, EMO, EASE, lerp, clamp, walk, orbit, headAt, WORKER } from '/engine/src/index.js';
const worker = { hero: WORKER, at: [0.4, -9], h: 1.8, seed: 2 };                 // at: [x, z] in metres, h: height in metres
{ start: 0, end: 4, set: 'street',
  cam: lt => orbit([0, 1.1, 0], lerp(9, 5.5, EASE.inout(clamp(lt / 3.5))), lerp(-40, 20, EASE.inout(clamp(lt / 3.5))), 6),   // look, distance, yaw deg, pitch deg
  actors: [{ ...worker, pose: lt => walk(go(mix(EMO.calm), lt, []), lt, 0.1, 2.9, 0, 12, 2800) }],   // dz 2800 px: about 8 m toward the camera
  props: [{ prop: 'sign', at: [-2.6, -1.5], h: 1.5, opts: { text: 'WORK' } }] }
```
- Stages: `street` (road, pavements, houses, trees, lamps, day), `meadow` (grass, path, hills, trees, sunset). Axes: x right, y up, z toward the viewer; the ground is y 0.
- `cam`: `{pos: [x, y, z], look: [x, y, z], fov, roll}`, a named move from `cam3` (below) or `orbit(look, dist, yawDeg, pitchDeg, fov)`; rest is `{pos: [0, 1.5, 7.5], look: [0, 1.05, 0], fov: 34}`. Face close-up: `orbit(headAt(actor), 2.7, 10, 2, 30)`. Keep the camera above the ground and out of the houses (street: |x| under 3.5).
- Pose `x y z` stay in pixels of a 600 px hero (350 px is about 1 m at `h` 1.7), so `walk(pose, lt, from, to, dx, steps, dz)`, `jump` and the follow-through work as in 2D. `under()` and `draw()` do not run in a stage (`check` says so); world objects go in `props`, screen graphics in `overlay`.
- New stage: `registerStage(name, { build(kit), ground(x, z, shot, lt), sky(ctx, t, W, H), fog: [color, near, far], sun: {dir, color, power}, air: [skyColor, groundColor, power], light2d })`, in the engine or in the project. `kit` has `box cyl cone ball patch beam tex put group add`; every solid sits on the ground and gets an ink hull; `beam([x,y,z], [x,y,z], thickness, color)` is a bar between two points (rope, girder). Scenery helpers: `stageTree(kit, x, z, scale, color)`, `skyGradient(stops)`, `skyClouds(ctx, t, W, seed, color)`. The sky is a painted backdrop: it does not turn with the camera.
- A stage that changes during the video: `build` returns `{ update(t, lt, shot) }` and reads its state from the shot, for example `bridge: 'plank', anim: lt => ({ sag })`; show, hide and move objects there as a function of `lt`, never with stored state. `ground()` returns the floor height under a hero (0 by default) so the soft shadow lies on water or a pit. Portrait is narrow (about 0.35 m of width per metre of distance at fov 34): aim `look` at the hero, and run long things like a bridge into depth with the yaw. Full example with four bridges built piece by piece, two falls and eight diagram cards: `$PLUG/examples/bridge/` (river.js, shots.js).
- Needs a GPU for WebGL; on a machine without one run with `GL=swiftshader`. three.js comes from `$PLUG/engine/node_modules`.

## Camera moves (`cam2`, `cam3`)
Every shot names its move. Each is `(target, options) => lt => camera`, so it goes straight into `cam:`. Shared options: `at` (start, s), `dur`, `ease`; after `at + dur` the move holds its end. A number option can be a pair `[from, to]`, a look target can be a pair of points. The vocabulary and default timings follow the camera family of the Awesome AI Motion field guide (github.com/gongnyang/awesome-ai-motion, MIT).

| Move | Says | 3D stage | 2D set or card |
|---|---|---|---|
| orbit | here is its shape | `cam3.orbit(look, {dist, yaw: [-30, 30], pitch, fov, floor})` | |
| push in | look at this | `cam3.pushIn(look)` | `cam2.pushIn([x, y], {zoom: [1, 1.6], from})` |
| pull out | the whole thing | `cam3.pullOut(look)` | `cam2.pullOut([x, y], {zoom: [1.6, 1], to})` |
| crane | arrive / leave | `cam3.crane(look)` down, `cam3.craneUp(look)` up | |
| truck, pan | along something long | `cam3.truck(from, to)` | `cam2.pan(from, to, {zoom})` |
| follow | stay with a mover | `cam3.follow(lt => [x, y, z], {lag})` | `cam2.follow(lt => [x, y], {zoom})` |
| low angle | it is big | `cam3.lowAngle(look)` | |
| top down | a map | `cam3.topDown(look)` (no heroes: their cards are edge-on from above) | |
| dolly zoom | a realisation | `cam3.dollyZoom(look, {dist: [6, 7.6]})`: the subject keeps its size, the world stretches | |
| zoom to detail | the part that matters | | `cam2.zoomTo([x, y])` |
| ken burns | life in a still diagram | | `cam2.kenBurns()` |
| fly to | to another place | `cam3.flyTo(from, to, {rise})` | `cam2.flyTo(from, to)` |
| whip | a snap to the next subject | `cam3.whip(from, to)` | `cam2.whip(from, to)` |

Modifiers for both kinds: `chain(a, b, at, dur)` blends from move `a` into move `b`; `dutch(cam, [0, 7], {at, dur, ease})` tilts the horizon (degrees); `hit(cam, at, amp)` shakes at an impact (amp in metres for 3D, pixels for 2D). For a roll tied to the action write `lt => ({ ...move(lt), roll: sway(lt) })`; the raw camera fields `roll` (3D) and `rot` (2D) are radians. `cam3.orbit` keeps the camera above `floor` (0.2 by default; set it lower over water or a pit), but it does not know about walls or banks: check a still.

Use at least four different moves in a video, and never the same move in two shots in a row. Two shots of one diagram can read as one long take: start the second camera where the first one ended (`from:`) and set `still: true` on both.

## Explaining an idea: animated diagrams (`D`)
An explanation is its own shot on the `card` set, right after the 3D shot it explains. Draw it in `draw(ctx, lt, t)` (world space, so `cam2` moves work on it); the heading and the verdict go in `overlay`. Build it in steps, one new thing every 0.3 to 0.6 s, each tied to a caption: the object appears, the load arrives, the forces show, the result. Never put a finished diagram on screen at once.

- Timing: `D.step(lt, at, dur)` 0..1, `D.pop(lt, at)` with overshoot, `D.nth(lt, i, at, gap)` for the i-th of many pieces.
- Things: `D.block(ctx, x, y, w, h, fill, u, {rot, label})` (a stone, a weight, a bank), `D.bar(ctx, a, b, u)` (a strut with pins), `D.line(ctx, pts, u, {color, w})` (draws itself), `D.joint`, `D.curve(a, ctrl, b)` for bent shapes.
- Forces and flow: `D.arrow(ctx, a, b, u, {color})` (red `D.RED` squeeze or push, blue `D.BLUE` pull, green `D.GREEN` support), `D.flow(ctx, pts, t, {a})` (dots carrying the load along a path).
- Notes and numbers: `D.label(ctx, text, at, to, u)` on a leader line, `D.ruler(ctx, a, b, u, value, {unit})` (a measured length that counts up; unit is `' м'` unless you pass one), `D.count`, `D.tick`, `D.cross`, `D.spot(ctx, x, y, r, u)` (dim everything but one circle).
- Keep one meaning per colour through the whole video, keep the same layout from card to card (same banks, same scale), and let things react: a beam sags under the weight, a square folds, a rope swings.
- The camera centre lands on y 960, so lay the diagram out between y 550 and 1250 and keep the camera's y near 950, or the caption covers the bottom of it.

## Building things on a 3D stage: piece by piece
Anything that is built goes up in pieces, fast: one piece every 30 to 110 ms, each dropping in with a small overshoot. Keep the object as a list of meshes in build order and call `assemble(pieces, lt, { at, gap, dur, drop, spin })` from the stage's `update`; `buildEnd(n, opts)` is the moment the last piece lands. `assemble` remembers where each piece stood on its first call and owns its position, scale and z-rotation from then on: to move a built object, move a group that holds the pieces. Give the next shot `built: true` (read it in `update`) so the object stands finished there. Order the pieces the way a builder would (an arch from both banks with the keystone last, a truss chord, web, chord, deck) and move the camera with the build (`cam3.truck` along it, `cam3.lowAngle` under it, then `chain` into a pull-out).

## Motion
Written by you:
- `go(base, lt, [[time, target, {dur = 0.4, ease = 'back'}], ...])`: from `time`, move to `target` (partial poses are fine). Keys in time order. Eases: `linear inout in out back spring antic` (`antic` winds up the other way first).
- **`base` must be a full pose**: `REST` or `mix(EMO.sad, { head: { turn: 0.5 } })`. A partial base makes later keys snap, and `check` reports "jumps on ...".
- `walk(pose, lt, from, to, dx)`: walks `dx` px from `at` with steps, bob and arm swing. `jump(pose, lt, at, height)`: crouch, stretch, squash on landing; add `shake(lt, at + 0.62)` to the camera with `add(cam, shake(...))`. `wave(pose, lt, from, to, 'armR')`. `say(pose, lt, [[from, to], ...])`: lip flap and head bob while the character speaks.
- Pose fields (`REST` in `pose.js`): `x y rot squash`, `head {tilt dx dy turn}`, `armL/armR {a (0 down, 1.57 sideways, 2.0 to 2.2 up beside the head; the head is always drawn in front of the arms, so an arm pointing straight up hides behind it), bend}`, `legL legR`, `tail`, `brows {l r h}`, `eyes {open lx ly pupil}`, `mouth {curve open w}`, `tear sweat`.
- `head.turn` -1..1 turns the head 3/4. Give every hero a turn (0.4 to 0.6 toward whoever they talk to); a front-on hero looks like a sticker. A flipped actor mirrors it.
- Emotions (`EMO`): `calm happy sad angry shock bored smug sleepy`.

Automatic, no code: breathing, blinking, eye darts, a wandering head and loose arms (`alive`); follow-through, where hair, ears, tail, hat and arms trail a move and swing past it on a hard stop, and the body leans into a move; hand-held camera drift.

## Hero spec (`hero.js`, `checkSpec` validates it)
| Key | Values |
|---|---|
| `name` | required |
| `kind` | `animal` (muzzle, animal nose), `human` (skin, clothes, button nose, human ears), `object` (the head is the body) |
| colours | `outline fur skin limb hand legs feet lid nose muzzle face belly iris browColor` as `#rrggbb`; humans get a brown `iris` by default, `iris: null` gives plain black eyes |
| `headShape` | `squircle circle box egg blob`; size `headW headH` |
| `ears.type` | `none round pointy human` (+ `color inner`) |
| `eyePatch.type` | `none slant round` (+ `color`) |
| `pattern.type` | `none spots stripes rim folds screen label` (+ `color`, `text`, `textColor` for label) |
| `tail.type` | `none stub long` |
| `hair.style` | `none short curly spiky bun long sides` (+ `color`, `part`: index of the parted scallop) |
| `beard.style` | `none stubble mustache goatee full` (+ `color`; not black, or the mouth disappears) |
| `top.type` | `none tshirt suit toga dress robe apron spacesuit` (+ `color accent sleeve shirt print`) |
| `hat.type` | `none cap crown tophat wreath helmet hardhat beanie bow headset` (+ `color accent`) |
| other | `glasses` (true or `'square'`), `gloves`, `claws`, `tuft`, `cheeks`, `shine`, `armLen`, `faceY`, `faceScale`, `brows: false` |

Ready specs: people `OFFICE EMPEROR GIRL SCIENTIST WORKER KING ASTRONAUT`, animals `SLOTH PANDA CAT`, objects `COIN BRAIN PHONE JAR`. Make a new one by spreading: `{ ...WORKER, name: 'baker', top: { type: 'apron', color: '#fff', accent: '#e2783b' }, hat: { type: 'none' } }`.

## Sets and props
- 2D sets: `jungle dusk night room city space card` (card is the flat blue diagram backdrop). Ground line: `GROUND` (y 1240). 3D stages: `street meadow`, see above.
- New set: `registerSet(name, [{p, blur, draw(ctx, t, W, H)}, ...], { light: {dir, shadow, rim, tint} })`; `p` is parallax (0 sky, 1 ground, above 1 foreground). A set that reads as a place has: a sky or wall with a gradient, 2 blurred depth layers, haze between them, a ground that darkens toward the camera, one light source with shafts or a glow, and a blurred foreground layer (`p` 1.4). Copy the structure of `room` or `city` in `sets.js`.
- Props: `coin moneybag phone book calendar clock bone rock tree house building laptop sign heart bulb arrow speech`. `drawProp(ctx, name, x, y, size, {color, text, day, angle, on, ground: true (shadow on the floor), lit: false}, t)`; standing props sit on `y`. New prop: `registerProp(name, (ctx, opts, t) => ...)` in a 100-unit box, using `ink(ctx, fill)` after building a path so it matches the outline style.
- UI: `ui.text(ctx, str, x, y, size, {color, stroke, maxW})`, `ui.thermo(ctx, x, y, height, 0..1)`, `ui.caption`, `ui.wipe`.

## Staging rules
- Frame is 1080x1920 inside a rounded panel with a 26 px margin. Captions sit at 71.5% of the height: keep faces and key props above y 1250 on screen.
- Fill the frame: one hero at size 640 to 720, two heroes at x 290 and 790 at size 520 to 620, turned to each other.
- Something enters, leaves or changes in every shot: a walk-in, a jump, a prop, a camera push. A hero that only stands and changes face is a slideshow.
- Nothing stands between the camera and a hero's face. Railings, beams and posts stay below chest height or on the far side; if a structure has to be tall, put it under or behind the hero.
- About 0.4 s a frame on a Mac: a 40 s video renders in about 8 minutes. Do not call `drawProp` from inside a `registerProp` function more than one level deep.
