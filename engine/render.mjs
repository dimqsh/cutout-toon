// Usage (project = a folder with shots.js):
//   node render.mjs <project> check                      lint the shot list, no drawing
//   node render.mjs <project> stills 0.5,3,7.2 [outDir]  PNG stills
//   node render.mjs <project> sheet [out.jpg] [times]    contact sheet, one frame per shot by default
//   node render.mjs <project> video [out.mp4] [fps] [from] [to]   silent mp4, 1080x1920
//       CRF=22 before the command makes a smaller file (default 17, a master; the paper grain is costly)
// Exits with status 1 on lint problems or any error on the page.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const [projArg, mode = 'check', a, b, c, d] = process.argv.slice(2);
if (!projArg || !fs.existsSync(path.join(projArg, 'shots.js'))) { console.error('usage: node render.mjs <project folder with shots.js> check|stills|sheet|video ...'); process.exit(2); }
const PROJECT = path.resolve(projArg);

// Projects import the engine as '/engine/src/index.js' so the same file runs in the browser and here.
registerHooks({
  resolve(spec, ctx, next) {
    return spec.startsWith('/engine/') ? { url: pathToFileURL(path.join(ENGINE, spec.slice(8))).href, shortCircuit: true } : next(spec, ctx);
  },
});
const { checkProject, isStage } = await import(pathToFileURL(path.join(ENGINE, 'src/index.js')).href);
const proj = await import(pathToFileURL(path.join(PROJECT, 'shots.js')).href);
const problems = checkProject(proj);
for (const p of problems) console.log('PROBLEM', p);
if (problems.length) process.exit(1);
console.log(`check ok: ${proj.SHOTS.length} shots, ${proj.DURATION} s, ${(proj.CAPTIONS || []).length} captions`);
if (mode === 'check') process.exit(0);

const { chromium } = await import('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const root = url.startsWith('/project/') ? [PROJECT, url.slice(9)] : url.startsWith('/engine/') ? [ENGINE, url.slice(8)] : [ENGINE, 'index.html'];
  const file = path.join(root[0], path.normalize(root[1]).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (e, data) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// 3D stages need WebGL: a real GPU, or GL=swiftshader for software WebGL on a machine without one.
// A project with only 2D shots launches exactly as before.
const GL = !proj.SHOTS.some(s => isStage(s.set)) ? [] : process.env.GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-gpu', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: GL });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?render=1`);
await page.waitForFunction(() => window.ready, null, { timeout: 15000 });
await page.evaluate(() => window.ready);
const DUR = await page.evaluate(() => window.DURATION);
const frame = async (t, type = 'png') => { await page.evaluate(t => window.renderAt(t), t); return page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1920 }, type, ...(type === 'jpeg' ? { quality: 96 } : {}) }); };

async function stills(times, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const [i, t] of times.entries()) { const f = path.join(dir, `f${String(i).padStart(3, '0')}_${t.toFixed(2)}.png`); fs.writeFileSync(f, await frame(t)); out.push(f); }
  return out;
}

if (mode === 'stills') {
  const files = await stills(a.split(',').map(Number), b || path.join(PROJECT, 'stills'));
  console.log(files.join('\n'));
} else if (mode === 'sheet') {
  const times = b ? b.split(',').map(Number) : (await page.evaluate(() => window.SHOTS)).map(([s, e]) => +((s + e) / 2).toFixed(2));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cutout-'));
  await stills(times, tmp);
  const cols = Math.min(6, times.length), rows = Math.ceil(times.length / cols), out = a || path.join(PROJECT, 'sheet.jpg');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', path.join(tmp, '*.png'), '-vf', `scale=360:-1,tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', '-q:v', '3', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true });
  if (r.status) errors.push('ffmpeg failed to build the sheet');
  console.log(`sheet ${out} (${times.length} frames at ${times.join(', ')} s)`);
} else if (mode === 'video') {
  const out = a || path.join(PROJECT, 'silent.mp4'), fps = Number(b || 30), from = Number(c || 0), to = Math.min(Number(d || DUR), DUR);
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(process.env.CRF || 17), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const T0 = Date.now();
  for (let n = n0; n < n1; n++) {
    const buf = await frame(n / fps, 'jpeg');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code) errors.push('ffmpeg exited with ' + code);
  console.log(`video ${out}: ${n1 - n0} frames at ${fps} fps, ${((Date.now() - T0) / (n1 - n0)).toFixed(0)} ms a frame`);
} else errors.push(`unknown mode "${mode}"`);

await browser.close(); server.close();
for (const e of errors) console.log('PAGE ERROR', e);
process.exit(errors.length ? 1 : 0);
