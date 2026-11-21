// The last pass over the picture, under the captions: glow on the bright areas, a vignette and
// paper grain. This is what stops flat fills from looking like vector clip-art.
import { hash } from './core.js';

let grain;
function grainTile() {
  if (grain) return grain;
  const c = new OffscreenCanvas(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < d.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = 128 + ((s >>> 8) / 16777216 - 0.5) * 150;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return (grain = c);
}

export function post(ctx, t, W, H, look) {
  ctx.save();
  if (look.bloom > 0) {
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.16 * look.bloom; ctx.filter = 'blur(26px) brightness(0.9)';
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (look.vignette > 0) {
    const g = ctx.createRadialGradient(W / 2, H * 0.44, H * 0.27, W / 2, H * 0.5, H * 0.78);
    g.addColorStop(0, 'rgba(24,12,48,0)'); g.addColorStop(1, `rgba(24,12,48,${0.42 * look.vignette})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (look.grain > 0) {
    const tile = grainTile(), k = Math.floor(t * 8);
    ctx.globalCompositeOperation = 'overlay';
    // paper: the same noise stretched into soft blotches, fixed in place
    const paper = ctx.createPattern(tile, 'repeat'); paper.setTransform(new DOMMatrix().scale(5));
    ctx.globalAlpha = 0.1 * look.grain; ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    // grain: fine, re-seeded with the ink line
    const fine = ctx.createPattern(tile, 'repeat'); fine.setTransform(new DOMMatrix().translate(-hash(k, 3) * 256, -hash(k, 8) * 256));
    ctx.globalAlpha = 0.13 * look.grain; ctx.fillStyle = fine; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
