// Browser entry. render.mjs serves the engine at /engine and the project at /project.
import { renderFrame, checkProject, isStage, initStages } from './index.js';

const ctx = document.getElementById('c').getContext('2d');
window.ready = (async () => {
  await document.fonts.load('800 96px Toon');
  const proj = await import('/project/shots.js');
  if (proj.SHOTS.some(s => isStage(s.set))) await initStages();   // three.js, only when a shot needs it
  window.DURATION = proj.DURATION;
  window.SHOTS = proj.SHOTS.map(s => [s.start, s.end]);
  window.problems = checkProject(proj);
  window.renderAt = t => renderFrame(ctx, proj, t);
  // Opened by hand (no ?render=1): play in a loop, to preview.
  if (!location.search.includes('render=1')) {
    const t0 = performance.now();
    const tick = () => { window.renderAt(((performance.now() - t0) / 1000) % proj.DURATION); requestAnimationFrame(tick); };
    tick();
  }
})();
