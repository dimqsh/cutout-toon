// The house look. Anything drawn through drawLit() is drawn on its own layers and then lit by the
// current set: a coloured form shadow on the side away from the light, a drop shadow from the layer
// in front (head on body), a rim on the lit edge, a tint that sinks it into the scene, a cast shadow
// on the ground, and an ink line that is heavier on the shadow side and "boils" 8 times a second.
// Browser only (OffscreenCanvas); nothing here is needed to lint a project in node.

export const LIGHT0 = {
  dir: [-0.6, -0.8],      // points from the subject to the light, in screen space
  shadow: '#8f8fd0',      // multiplied over the unlit side, so pick a light, saturated colour
  amount: 0.85,           // 0..1 strength of the form shadow
  depth: 4.6,             // how far the shadow reaches in from the edge, in hero units
  style: 'solid',         // 'solid' | 'hatch' | 'dots': how the shadow is filled
  rim: null,              // colour of the lit edge, or null
  rimAmount: 0.6,
  tint: null,             // multiplied over the whole subject (night blue, sunset orange), or null
  cast: 0.26,             // opacity of the shadow on the ground
  boil: 1,                // 0 switches the living line off
};

let frame = { light: LIGHT0, t: 0 };
// Called by the frame composer before it draws a shot.
export const setFrame = (light, t) => { frame = { light: { ...LIGHT0, ...(light || {}) }, t }; };
export const currentLight = () => frame.light;

const pool = [];
let nest = 0;           // a group may itself call drawLit (a prop drawn inside a prop): each depth gets its own canvases
function scratch(i, w, h) {
  i += nest * 16;
  let c = pool[i];
  if (!c) c = pool[i] = new OffscreenCanvas(w, h);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const x = c.getContext('2d'); x.reset();
  return x;
}

const tiles = {};
function tile(kind, color) {
  const key = kind + color;
  if (tiles[key]) return tiles[key];
  const c = new OffscreenCanvas(20, 20), x = c.getContext('2d');
  x.fillStyle = color; x.globalAlpha = 0.4; x.fillRect(0, 0, 20, 20); x.globalAlpha = 1;   // a wash under the marks, so it still reads as tone
  if (kind === 'hatch') {
    x.strokeStyle = color; x.lineWidth = 4.2; x.lineCap = 'square';
    for (const o of [-20, 0, 20]) { x.beginPath(); x.moveTo(o - 3, 23); x.lineTo(o + 23, -3); x.stroke(); }
  } else {
    x.fillStyle = color;
    for (const [px, py] of [[5, 5], [15, 15]]) { x.beginPath(); x.arc(px, py, 3.7, 0, Math.PI * 2); x.fill(); }
  }
  return (tiles[key] = c);
}

// ctx: the main context, already transformed into the subject's local space.
// box: [x0, y0, x1, y1] local bounds of everything the groups may draw.
// groups: [{draw(ctx), casts}] back to front; a group with `casts` drops a shadow on every group behind it.
// o: {outline, ground: [deviceX, deviceY] | null, lift 0..1 (how far off the ground), light, seed}
export function drawLit(ctx, box, groups, o = {}) {
  const L = { ...frame.light, ...(o.light || {}) };
  const M = ctx.getTransform(), cw = ctx.canvas.width, ch = ctx.canvas.height;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]) {
    const px = M.a * x + M.c * y + M.e, py = M.b * x + M.d * y + M.f;
    x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  const unit = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c));      // pixels per local unit
  // Keep a margin beyond the canvas as wide as the largest shadow offset: otherwise the frame edge
  // would count as the subject's outline and get a shadow band of its own.
  const pad = Math.ceil(L.depth * unit * 2.2 + 16);
  x0 = Math.max(-pad, Math.floor(x0 - 14)); y0 = Math.max(-pad, Math.floor(y0 - 14));
  x1 = Math.min(cw + pad, Math.ceil(x1 + 14)); y1 = Math.min(ch + pad, Math.ceil(y1 + 14));
  const w = x1 - x0, h = y1 - y0;
  if (w < 2 || h < 2 || x1 <= 0 || y1 <= 0 || x0 >= cw || y0 >= ch) return;

  const n = Math.hypot(L.dir[0], L.dir[1]) || 1, ax = -L.dir[0] / n, ay = -L.dir[1] / n;   // away from the light
  const depth = L.depth * unit, K = o.outline || '#1c1410';
  const whole = scratch(0, w, h), tmp = scratch(1, w, h), tmp2 = scratch(2, w, h);
  const all = { x: 0, y: 0, w, h };
  const wash = (x, paint) => { x.globalCompositeOperation = 'source-in'; x.fillStyle = paint; x.fillRect(all.x, all.y, all.w, all.h); };

  const layers = groups.filter(Boolean).map((g, i) => {
    const c = scratch(3 + i, w, h);
    c.setTransform(M.a, M.b, M.c, M.d, M.e - x0, M.f - y0); c.lineJoin = 'round'; c.lineCap = 'round';
    nest++; try { g.draw(c); } finally { nest--; }
    c.setTransform(1, 0, 0, 1, 0, 0);
    return { c, casts: g.casts };
  });

  if (L.amount > 0) layers.forEach(({ c }, i) => {
    // form shadow: the part of this layer's silhouette that a copy shifted toward the light does not cover
    tmp.reset(); tmp.drawImage(c.canvas, 0, 0);
    if (L.style === 'solid') wash(tmp, L.shadow);
    else {
      const k = unit / 6;                                        // pattern is pinned to the subject and scales with it
      tmp.globalCompositeOperation = 'source-in'; tmp.fillStyle = tmp.createPattern(tile(L.style, L.shadow), 'repeat');
      tmp.setTransform(k, 0, 0, k, M.e - x0, M.f - y0); tmp.fillRect((x0 - M.e) / k, (y0 - M.f) / k, w / k, h / k); tmp.setTransform(1, 0, 0, 1, 0, 0);
    }
    tmp.globalCompositeOperation = 'destination-out'; tmp.drawImage(c.canvas, -ax * depth, -ay * depth);
    // drop shadow from the layer in front
    const front = layers.slice(i + 1).find(l => l.casts);
    if (front) {
      tmp2.reset(); tmp2.drawImage(front.c.canvas, ax * depth * 1.5, ay * depth * 1.5 + depth * 0.5); wash(tmp2, L.shadow);
      tmp2.globalCompositeOperation = 'destination-in'; tmp2.drawImage(c.canvas, 0, 0);
      tmp.globalCompositeOperation = 'source-over'; tmp.drawImage(tmp2.canvas, 0, 0);
    }
    c.globalCompositeOperation = 'multiply'; c.globalAlpha = L.amount; c.drawImage(tmp.canvas, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  });

  for (const { c } of layers) whole.drawImage(c.canvas, 0, 0);
  if (L.tint) {
    tmp.reset(); tmp.drawImage(whole.canvas, 0, 0); wash(tmp, L.tint);
    whole.globalCompositeOperation = 'multiply'; whole.drawImage(tmp.canvas, 0, 0);
  }
  if (L.rim) {
    // a band of light just inside the outline on the lit edge
    const o1 = unit * 2.1, o2 = unit * 4.1;
    tmp.reset(); tmp.drawImage(whole.canvas, ax * o1, ay * o1); wash(tmp, L.rim);
    tmp.globalCompositeOperation = 'destination-out'; tmp.drawImage(whole.canvas, ax * o2, ay * o2);
    tmp.globalCompositeOperation = 'destination-in'; tmp.drawImage(whole.canvas, 0, 0);
    whole.globalCompositeOperation = 'overlay'; whole.globalAlpha = L.rimAmount; whole.drawImage(tmp.canvas, 0, 0);   // overlay: the ink line stays black
  }
  whole.globalCompositeOperation = 'source-over'; whole.globalAlpha = 1;

  tmp.reset(); tmp.drawImage(whole.canvas, 0, 0); wash(tmp, K);   // the silhouette, in ink
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.ground && L.cast > 0) {
    const gy = o.ground[1], sk = -ax * 0.55, lift = o.lift || 0;
    ctx.save(); ctx.globalAlpha = L.cast * (1 - 0.6 * lift); ctx.filter = `blur(${(3 + 14 * lift) * Math.max(1, unit / 6)}px)`;
    ctx.setTransform(1, 0, sk, -0.23, -sk * gy, gy * 1.23); ctx.drawImage(tmp.canvas, x0, y0);
    ctx.restore();
  }
  if (L.boil > 0) ctx.filter = `url(#boil${(Math.floor(frame.t * 8) + (o.seed | 0)) & 3})`;
  ctx.drawImage(tmp.canvas, x0 + ax * unit * 0.5, y0 + ay * unit * 0.5);   // heavier line on the shadow side
  ctx.drawImage(whole.canvas, x0, y0);
  ctx.restore();
}
