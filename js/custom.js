// Builds customized voxel car maps: paint ramps, vinyls, spoilers, bumpers, skirts, rims, underglow
(function () {
  const BASE = { K: '#140c22', G: '#5ab4e6', g: '#24477a', w: '#dff6ff', L: '#fff6b0', R: '#ff2a3a', O: '#ffab2e', T: '#2a2238', t: '#4a4260', C: '#e6ecf5', c: '#8a93a8', V: '#0c0818', I: '#3a2a4a' };
  const PAD_X = 3, PAD_TOP = 3, PAD_BOT = 2;
  const PAINT = { h: 1, B: 1, b: 1, d: 1 };

  // ---------- color helpers (hue-shifted ramps: warm highlights, cool shadows) ----------
  function toHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  const toward = (h, target, amt) => { let d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
  const rampCache = {};
  function ramp(hex) {
    if (rampCache[hex]) return rampCache[hex];
    const [h, s, l] = toHsl(hex);
    return (rampCache[hex] = {
      h: fromHsl(toward(h, 55, 14), s * 0.9, l + (1 - l) * 0.38),
      B: hex,
      b: fromHsl(toward(h, 250, 14), Math.min(1, s * 1.02 + 0.03), l * 0.8 + 0.02),
      d: fromHsl(toward(h, 260, 22), Math.min(1, s * 1.06 + 0.05), l * 0.62 + 0.03),
      o: fromHsl(toward(h, 265, 30), Math.min(1, s * 0.9 + 0.1), Math.max(0.06, l * 0.3)),
    });
  }

  function defaults(car) {
    return { paint: car.paint, accent: car.accent, vinyl: 'none', spoiler: 'stock', bumper: 'stock', skirt: 'stock', rims: car.rims, glow: 'none' };
  }

  // ---------- overlays ----------
  const SPOILERS = {
    duck: ['KKKK...', 'KhhhKKK'],
    gt: ['KKKKKKKK', 'KhhhhhhK', '..K..K..'],
    hoop: ['KKKKKKKKK', 'KhhhhhhhK', '.K.....K.', '.K.....K.'],
    swan: ['KKKKKKKKK', 'KTTTTTTTK', '......K..', '.....K...'],
  };

  const cache = {};

  function build(car, cu) {
    cu = Object.assign(defaults(car), cu || {});
    const key = car.id + '|' + [cu.paint, cu.accent, cu.vinyl, cu.spoiler, cu.bumper, cu.skirt, cu.rims, cu.glow].join('|');
    if (cache[key]) return cache[key];

    const rows = car.rows;
    const w0 = Math.max(...rows.map((r) => r.length)), h0 = rows.length;
    const W = w0 + PAD_X * 2, H = h0 + PAD_TOP + PAD_BOT;
    const ch = new Array(W * H).fill(null);
    const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? ch[y * W + x] : null);
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) ch[y * W + x] = c; };
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') put(x + PAD_X, y + PAD_TOP, r[x]); });
    const cx = PAD_X + w0 / 2, cy = PAD_TOP + h0 / 2;

    // replace stock wing
    if (cu.spoiler !== 'stock' && car.wing) {
      const boxes = typeof car.wing[0] === 'number' ? [car.wing] : car.wing;
      for (const [x0, y0, x1, y1] of boxes)
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x + PAD_X, y + PAD_TOP, null);
    }

    // body analysis
    const colTop = (x) => { for (let y = 0; y < H; y++) if (at(x, y)) return y; return -1; };
    let bottomY = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y)) bottomY = y;
    let frontX = 0, rearX = W;
    for (let y = bottomY - 5; y <= bottomY; y++)
      for (let x = 0; x < W; x++) if (at(x, y)) { frontX = Math.max(frontX, x); rearX = Math.min(rearX, x); }
    // belt line: first row where most middle columns are paint
    let beltY = PAD_TOP + 5;
    for (let y = PAD_TOP + 2; y < bottomY; y++) {
      let n = 0, m = 0;
      for (let x = Math.floor(cx) - 8; x <= Math.floor(cx) + 8; x++) { m++; if (PAINT[at(x, y)]) n++; }
      if (n / m > 0.7) { beltY = y; break; }
    }

    // vinyl -> accent class on paint pixels
    const acc = (x, y) => { const c = at(x, y); if (PAINT[c]) put(x, y, c === 'b' || c === 'd' ? 's' : 'S'); };
    const hot = (x, y) => { if (PAINT[at(x, y)] || at(x, y) === 'S' || at(x, y) === 's') put(x, y, 'Y'); };
    switch (cu.vinyl) {
      case 'stripe': for (let x = rearX; x <= frontX; x++) { acc(x, beltY + 1); acc(x, beltY + 2); } break;
      case 'twin': for (let x = rearX; x <= frontX; x++) { acc(x, beltY + 1); acc(x, beltY + 3); } break;
      case 'sunset': for (let y = beltY + 2; y <= bottomY; y++) for (let x = rearX; x <= frontX; x++) acc(x, y); break;
      case 'checker':
        for (let y = beltY + 1; y < bottomY - 1; y++)
          for (let x = rearX + 2; x < cx; x++) if ((((x >> 1) + (y >> 1)) & 1) === 0) acc(x, y);
        break;
      case 'flames':
        for (let y = beltY; y < bottomY - 1; y++) {
          const len = 7 + ((y * 7) % 5) * 2 + (y % 2 ? 4 : 0);
          for (let x = frontX; x > frontX - len; x--) {
            if (frontX - x > len - 3) hot(x, y); else acc(x, y);
          }
        }
        break;
      case 'bolt': {
        const tri = [0, 1, 2, 1];
        for (let x = rearX + 3; x < frontX - 2; x++) { const yb = beltY + 1 + tri[Math.floor(x / 3) % 4]; acc(x, yb); acc(x, yb + 1); }
        break;
      }
      case 'tribal': {
        const mid = Math.round((beltY + bottomY) / 2);
        for (let y = beltY; y < bottomY; y++) {
          const len = 12 - Math.abs(y - mid) * 3;
          for (let x = rearX; x < rearX + len; x++) acc(x, y);
          if (y === mid) for (let x = rearX + len; x < rearX + len + 5; x++) acc(x, y);
        }
        break;
      }
    }

    // spoiler on the rear deck
    const SP = SPOILERS[cu.spoiler];
    if (SP) {
      const deckY = colTop(PAD_X + 3);
      const sx = PAD_X + 1, sy = deckY - SP.length;
      SP.forEach((r, dy) => { for (let dx = 0; dx < r.length; dx++) if (r[dx] !== '.') put(sx + dx, sy + dy, r[dx]); });
    }

    // front bumper / rear diffuser
    const fbY = bottomY;
    if (cu.bumper === 'lip') {
      for (let x = frontX - 6; x < frontX; x++) put(x, fbY + 1, 'T');
      put(frontX, fbY + 1, 'K');
    } else if (cu.bumper === 'splitter' || cu.bumper === 'aggro') {
      for (let x = frontX - 8; x <= frontX + 1; x++) put(x, fbY + 1, 'T');
      put(frontX + 2, fbY + 1, 'K');
      for (let x = rearX + 1; x <= rearX + 6; x++) put(x, fbY + 1, x % 2 ? 'T' : 'K');
      if (cu.bumper === 'aggro') {
        put(frontX + 1, fbY - 2, 'T'); put(frontX + 2, fbY - 2, 'K');
        put(frontX + 1, fbY - 4, 'T'); put(frontX + 2, fbY - 4, 'K');
        for (let y = fbY - 3; y <= fbY - 1; y++) { put(frontX - 1, y, 'V'); put(frontX - 2, y, 'V'); }
      }
    }

    // side skirts between the arches
    const s0 = Math.ceil(cx + car.wheelX[0] + 5), s1 = Math.floor(cx + car.wheelX[1] - 5);
    if (cu.skirt === 'slim') {
      for (let x = s0; x <= s1; x++) put(x, bottomY + 1, 'T');
      put(s0 - 1, bottomY + 1, 'K'); put(s1 + 1, bottomY + 1, 'K');
    } else if (cu.skirt === 'aero') {
      for (let x = s0 - 1; x <= s1 + 1; x++) { if (PAINT[at(x, bottomY - 1)]) put(x, bottomY - 1, 'S'); put(x, bottomY, 'T'); put(x, bottomY + 1, 'K'); }
    }

    // wheel arches (after overlays so skirts never fill them)
    const ay = cy + car.wheelY;
    for (const wx of car.wheelX) {
      const ax = cx + wx;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const dist = Math.hypot(x + 0.5 - ax, y + 0.5 - ay), yy = y + 0.5;
          if (dist < 4.0 && yy >= ay - 3.5) put(x, y, null);
          else if (dist < 4.8 && yy >= ay - 4.3 && at(x, y)) put(x, y, 'K');
        }
    }

    // resolve colors
    const P = ramp(cu.paint), A = ramp(cu.accent);
    const pal = Object.assign({}, BASE, car.fixed || {}, { h: P.h, B: P.B, b: P.b, d: P.d, S: A.B, s: A.b, Y: A.h });
    const selOut = { h: P.o, B: P.o, b: P.o, d: P.o, S: A.o, s: A.o, Y: A.o, G: '#0f1c33', g: '#0f1c33', w: '#0f1c33' };
    const px = ch.map((c, i) => {
      if (!c) return null;
      if (c !== 'K') return pal[c] || BASE.K;
      const x = i % W, y = (i / W) | 0;
      if (!at(x, y - 1) || y <= PAD_TOP) return BASE.K; // keep the top silhouette crisp
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { const n = at(x + dx, y + dy); if (n && selOut[n]) return selOut[n]; }
      return BASE.K;
    });
    const rim = Catalog.PARTS.rims.find((r) => r.id === cu.rims) || Catalog.PARTS.rims[0];
    const glow = Catalog.PARTS.glow.find((g) => g.id === cu.glow);
    const map = {
      key, id: car.id, w: W, h: H, px, cls: ch, pal, ox: cx, oy: cy, bw: w0, bh: h0,
      wheelX: car.wheelX, wheelY: car.wheelY, rim: rim.c, rimD: rim.d, tyre: car.id === 'st_havana' ? '#fff1c9' : '#2a2238',
      glow: glow && glow.c ? glow.c : null,
    };
    cache[key] = map;
    return map;
  }

  const canvasCache = {};
  function canvas(map) {
    if (!canvasCache[map.key]) canvasCache[map.key] = Art.carCanvas(map);
    return canvasCache[map.key];
  }

  // dithered underglow strip
  const glowCache = {};
  function glowCanvas(color, width) {
    const k = color + width;
    if (glowCache[k]) return glowCache[k];
    const c = document.createElement('canvas');
    c.width = width + 8; c.height = 4;
    const g = c.getContext('2d');
    g.fillStyle = color;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < c.width; x++) {
        const dx = Math.abs(x + 0.5 - c.width / 2) / (c.width / 2), dy = y / 4;
        const dens = (1 - dx * dx * dx * dx) * (1 - dy) * 1.1;
        const th = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16;
        if (dens > th) g.fillRect(x, y, 1, 1);
      }
    return (glowCache[k] = c);
  }

  window.Custom = { build, canvas, defaults, ramp, glowCanvas, PAD_X, PAD_TOP };
})();
