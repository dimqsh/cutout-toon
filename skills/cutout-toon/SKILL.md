---
name: cutout-toon
description: Draws any video as a real 2D cartoon in one house style, entirely in JS, and renders it to mp4. Big-head heroes of any kind (people of any era or job, animals, talking objects like a coin, a brain or a phone) with a living ink line, coloured shadows and rim light taken from the scene, 3/4 head turns, walks, jumps, lip flap, hair and hats that trail the motion, lit 2D sets with depth and real 3D stages where the camera orbits and heroes walk toward the lens (2D + 3D). Works with any script or shot list on any topic; it is a drawing style, not a story format. Use when the user wants a 2D cartoon or cutout animation, a "drawn" look instead of stick figures or 3D, or says "нарисованный стиль", "мультяшный стиль", "мультик", "как настоящий мультфильм", "2D анимация", "2D + 3D", "2.5D", "перекладка", "не стикмены", "cutout animation", "2D cartoon".
---

# /cutout-toon

A drawing style plus an engine. The story comes from the user, from another skill (/higgsfield-faceless-script, the story shapes in /toon-story) or is written for the topic; this skill draws it. Voice, word timings, sound and publishing are the same as /toon-story sections 2, 3, 5 and 7.

Plugin root (`$PLUG` below): two folders above this skill's base directory (`<base>/../..`). Once per machine, if `$PLUG/engine/node_modules/playwright` is missing, run `npm run setup --prefix $PLUG/engine` (installs playwright and three.js, downloads Chromium); ffmpeg must be on the PATH. Read `references/engine.md` before writing shots, and copy the patterns in `$PLUG/examples/office/shots.js` (2D sets), `$PLUG/examples/street3d/shots.js` (3D stages) and `$PLUG/examples/bridge/shots.js` (explainer: diagram cards, piece-by-piece builds, named camera moves).

## Steps
1. **Script and beats.** Take the user's script. With only a topic, run /higgsfield-faceless-script first and use its scene table: `narration` is the voice text, `visual action` becomes the shot (who, where, what moves), `explanatory graphic/caption` becomes the overlay or a diagram card, `audio purpose` goes to the sound step, and its start/end times are estimates until the voice is recorded. Split everything into beats of 1.5 to 3 s; each beat gets one picture idea and one action (someone enters, jumps, turns, drops something).
2. **Research and references, before drawing.** For every hero, set and key prop, find 2 to 4 reference images with /browse, save them to `<project>/ref/`, look at each with Read. Check facts against two sources if the script states any.
3. **Draw sheet.** Write `<project>/ref/sheet.md`: per hero, the 3 to 5 features that make it recognisable, mapped to spec options (kind, hair, top, hat, pattern, colours as hex); per set, where the light comes from and its colour; the props per beat; anything the engine lacks.
4. **Cast and sets.** One spec per hero in `<project>/cast.js`, started from the nearest ready one (OFFICE, EMPEROR, GIRL, SCIENTIST, WORKER, KING, ASTRONAUT, SLOTH, PANDA, CAT, COIN, BRAIN, PHONE, JAR). Missing set or prop: add it with `registerSet` (with its `light`) / `registerProp` in the project; if it is reusable, move it into `$PLUG/engine/src/` afterwards.
5. **Compare.** Make a cast-only `shots.js` (one shot per hero and set), run `node $PLUG/engine/render.mjs <project> sheet`, put the sheet next to the references and fix until each hero is recognisable without a caption.
6. **Shots.** Write `<project>/shots.js` timed to the voice (`DURATION`, `SHOTS`, `CAPTIONS`). Per shot: heroes fill the frame and are turned 3/4 (`head.turn`), the camera pushes or slides, and one thing moves with `walk`, `jump`, `wave`, `say` or a prop. Mix framings: wide in a set, `closeUp` on every emotional beat, `tr: 'wipe'` between chapters. Put a beat on a 3D stage (`street`, `meadow`, or a new `registerStage`) when the camera should travel or someone walks in depth; at least one 3D shot per video.
   - **Camera:** give every shot a named move from `cam2` / `cam3` (push in, pull out, crane, truck, follow, low angle, dolly zoom, zoom to detail), at least four different ones per video.
   - **Explanations:** every "why" gets its own diagram card straight after the shot it explains, built step by step with `D` (pieces pop in, the load lands, force arrows grow, dots carry the load, labels and numbers appear), one step per caption.
   - **Building:** whatever is built goes up piece by piece with `assemble` while the camera moves with it; the next shot shows it finished with `built: true`.
7. **Check, look, render.** `render.mjs <project> check` must print no PROBLEM lines. Then `sheet` and `stills` at the moments of action; Read them and fix what looks flat, empty or covered by a caption. Then `video`. Mix with the voice as /toon-story 5.

## Do
- Keep a hero's spec in the project and reuse it in later videos of the series.
- Put every number the narrator says on screen.
- Report the reference links, the render command and its frame count and duration.

## Do not
- No AI-generated or downloaded pictures in the frame; references are for looking only, never traced or pasted.
- Never copy another channel's characters, script lines or titles.
- No hero standing front-on in the middle with only its face changing, and no locked-off camera, diagram cards included.
- No finished diagram or finished building appearing at once, and nothing tall between the camera and a hero's face.
- No pose written as a raw function of time with hard switches (`lt < 1 ? a : b`), and no `go()` from a partial pose: start from `REST` or `mix(...)`, or `check` fails.
- Do not switch the light, the ink line or the grain off to "clean up" a frame; they are the style.

## Example
Input: `/cutout-toon why the Roman emperor executed the man who invented unbreakable glass, my script is in story.md`
Output: `glass/ref/` (8 images) and `glass/ref/sheet.md`; cast EMPEROR and an inventor from WORKER with an apron; sets `dusk` and a new torch-lit `palace`; shots where the inventor walks in, the glass drops with a camera shake, close-up on the emperor's 3/4 scowl; `glass/silent.mp4` (1080x1920, 30 fps), `glass/sheet.jpg`; report with reference links and the PROBLEM-free check.
