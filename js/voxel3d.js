// Showroom renderer: extrudes the side-profile voxel map into a 3D voxel car and renders it
// with yaw/pitch camera, per-face lighting, z-buffer, spinning wheels and pixel outlines.
(function () {
  const PAINT = { h: 1, B: 1, b: 1, d: 1 }, ACC = { S: 1, s: 1, Y: 1 }, GLASS = { G: 1, g: 1, w: 1 };
  const HW = 7; // half width of the body in voxels
  const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const cache = {};

  function model(map) {
    if (cache[map.key]) return cache[map.key];
    const { w: W, h: H, cls, pal } = map;
    const D = HW * 2 + 1;
    const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? cls[y * W + x] : null);

    // silhouette analysis
    const rowMin = new Array(H).fill(W), rowMax = new Array(H).fill(-1);
    let bottomY = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y)) { rowMin[y] = Math.min(rowMin[y], x); rowMax[y] = Math.max(rowMax[y], x); bottomY = y; }
    let beltY = Math.floor(map.oy);
    for (let y = 0; y < H; y++) {
      let n = 0, m = 0;
      for (let x = Math.floor(map.ox) - 8; x <= Math.floor(map.ox) + 8; x++) { m++; if (PAINT[at(x, y)] || ACC[at(x, y)]) n++; }
      if (n / m > 0.7) { beltY = y; break; }
    }

    const occ = new Uint8Array(W * H * D);
    const col = new Int32Array(W * H * D);
    const kind = new Uint8Array(W * H * D); // 0 body, 1 glass, 2 light, 3 tyre, 4 rim
    const idx = (x, y, z) => ((z + HW) * H + y) * W + x;
    const set = (x, y, z, c, k) => { const i = idx(x, y, z); occ[i] = 1; const v = rgb(c); col[i] = (v[0] << 16) | (v[1] << 8) | v[2]; kind[i] = k; };

    // 2D outline pixels become the material they outline (the renderer draws its own outline)
    const material = (x, y) => {
      let c = at(x, y);
      if (c !== 'K') return c;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1]]) { const n = at(x + dx, y + dy); if (n && n !== 'K') return n === 'G' || n === 'g' || n === 'w' ? 'h' : n; }
      return 'T';
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!at(x, y)) continue;
        const c = material(x, y);
        let hw = y < beltY ? HW - 2 : HW;
        if (y === bottomY) hw -= 1;
        const endDist = Math.min(x - rowMin[y], rowMax[y] - x);
        if (endDist === 0) hw -= 2; else if (endDist === 1) hw -= 1;
        const rearWing = y < beltY && x < map.ox - map.bw * 0.22;
        const strut = rearWing && !at(x - 1, y) && !at(x + 1, y);
        for (let z = -hw; z <= hw; z++) {
          if (strut && Math.abs(z) !== 4) continue;
          const edge = Math.abs(z) === hw;
          let color, k = 0;
          if (PAINT[c]) color = c === 'h' ? pal.B : pal[c];
          else if (ACC[c]) color = c === 'Y' ? pal.Y : pal[c];
          else if (GLASS[c]) { color = edge ? (c === 'w' ? pal.w : pal.G) : pal.g; k = 1; }
          else if (c === 'L') { color = Math.abs(z) >= hw - 2 ? pal.L : '#2a2238'; k = Math.abs(z) >= hw - 2 ? 2 : 0; }
          else if (c === 'R') { color = pal.R; k = 2; }
          else color = pal[c] || map.px[y * W + x];
          set(x, y, z, color, k);
        }
      }

    // wheels: cylinders tucked one voxel inside the body sides
    const wheels = [];
    const wy = map.oy + map.wheelY;
    for (const wxo of map.wheelX) {
      const wx = map.ox + wxo;
      for (let y = Math.floor(wy - 4); y <= Math.ceil(wy + 4); y++)
        for (let x = Math.floor(wx - 4); x <= Math.ceil(wx + 4); x++) {
          const dx = x + 0.5 - wx, dy = y + 0.5 - wy, r = Math.hypot(dx, dy);
          if (r > 3.6) continue;
          for (const side of [-1, 1])
            for (let l = 0; l < 3; l++) {
              const z = side * (HW - 1 - l);
              wheels.push({ x: x + 0.5 - map.ox, y: y + 0.5 - map.oy, z, r, a: Math.atan2(dy, dx), outer: l === 0 });
            }
        }
    }

    // keep only exposed body voxels
    const xs = [], ys = [], zs = [], cs = [], ms = [], ks = [];
    const solid = (x, y, z) => x >= 0 && y >= 0 && x < W && y < H && z >= -HW && z <= HW && occ[idx(x, y, z)];
    for (let z = -HW; z <= HW; z++)
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = idx(x, y, z);
          if (!occ[i]) continue;
          const m = (solid(x + 1, y, z) ? 0 : 1) | (solid(x - 1, y, z) ? 0 : 2) | (solid(x, y + 1, z) ? 0 : 4) | (solid(x, y - 1, z) ? 0 : 8) | (solid(x, y, z + 1) ? 0 : 16) | (solid(x, y, z - 1) ? 0 : 32);
          if (!m) continue;
          xs.push(x + 0.5 - map.ox); ys.push(y + 0.5 - map.oy); zs.push(z); cs.push(col[i]); ms.push(m); ks.push(kind[i]);
        }
    const M = {
      n: xs.length, x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), c: Int32Array.from(cs), m: Uint8Array.from(ms), k: Uint8Array.from(ks),
      wheels, rim: rgb(map.rim), rimD: rgb(map.rimD), tyre: rgb(map.tyre === '#2a2238' ? '#1c1628' : map.tyre),
      halfL: map.bw / 2 + 3, top: -map.oy, floorY: map.wheelY + 3.5,
    };
    cache[map.key] = M;
    return M;
  }

  // normals: +X, -X, +Y(down), -Y(up), +Z, -Z
  const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const TO_LIGHT = (() => { const v = [-0.45, -0.78, -0.45]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  let tmp = null, tmpCtx = null;

  function render(ctx, map, o) {
    const M = model(map);
    const zoom = o.zoom, yaw = o.yaw, pitch = o.pitch == null ? 0.32 : o.pitch;
    const cs = Math.cos(yaw), sn = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const fx = o.fx || 0, fy = o.fy || 0, fz = o.fz || 0;
    const bob = o.bob || 0;
    // world -> view
    const P = (X, Y, Z, out) => { const x1 = X * cs + Z * sn, z1 = -X * sn + Z * cs; out[0] = x1; out[1] = Y * cp - z1 * sp; out[2] = z1 * cp + Y * sp; return out; };
    const f = P(fx, fy, fz, [0, 0, 0]);
    const tmpv = [0, 0, 0];

    // screen bounds from the model box
    const R = Math.hypot(M.halfL + 2, HW + 3) * zoom;
    const W0 = Math.ceil(R * 2 + 8), H0 = Math.ceil((M.floorY - M.top + 10) * zoom + R * sp * 2 + 16);
    const ox = Math.round(o.cx - f[0] * zoom), oyc = Math.round(o.cy - f[1] * zoom);
    let bx = Math.floor(ox - W0 / 2), by = Math.floor(oyc + (M.top - 4) * zoom * cp - R * sp - 6);
    let bw = W0, bh = H0;
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const cx0 = Math.max(0, bx), cy0 = Math.max(0, by), cx1 = Math.min(cw, bx + bw), cy1 = Math.min(ch, by + bh);
    if (cx1 <= cx0 || cy1 <= cy0) return;
    bw = cx1 - cx0; bh = cy1 - cy0; bx = cx0; by = cy0;

    if (!tmp) { tmp = document.createElement('canvas'); tmpCtx = tmp.getContext('2d'); }
    if (tmp.width < bw || tmp.height < bh) { tmp.width = Math.max(tmp.width, bw); tmp.height = Math.max(tmp.height, bh); }
    const img = tmpCtx.createImageData(bw, bh);
    const data = img.data;
    const zb = new Float32Array(bw * bh).fill(1e9);
    const s = Math.max(1, Math.round(zoom));

    // floor shadow + underglow (dithered), drawn straight into the buffer with far depth
    const floorY = M.floorY;
    const glow = o.glow ? rgb(o.glow) : null;
    const step = Math.max(0.2, 0.85 / zoom);
    for (let X = -M.halfL - 3; X <= M.halfL + 3; X += step)
      for (let Z = -HW - 4; Z <= HW + 4; Z += step) {
        const ex = Math.abs(X) / (M.halfL + 3), ez = Math.abs(Z) / (HW + 4);
        const d = 1 - (ex * ex * ex * ex + ez * ez);
        if (d <= 0) continue;
        P(X, floorY, Z, tmpv);
        const px = Math.round(ox + (tmpv[0] - f[0]) * zoom) - bx, py = Math.round(oyc + (tmpv[1] - f[1]) * zoom) - by;
        if (px < 0 || py < 0 || px >= bw || py >= bh) continue;
        const th = BAYER[(py & 3) * 4 + (px & 3)] / 16, j = py * bw + px, q = j * 4;
        if (glow && d * (o.glowK || 0.8) > th) { data[q] = glow[0]; data[q + 1] = glow[1]; data[q + 2] = glow[2]; data[q + 3] = 255; zb[j] = 1e8; }
        else if (d * 0.75 > th + 0.1) { data[q] = 8; data[q + 1] = 4; data[q + 2] = 16; data[q + 3] = 200; zb[j] = 1e8; }
      }

    // lighting table per exposure mask
    const lit = new Float32Array(6), vis = new Uint8Array(6);
    NORMALS.forEach((n, i) => {
      const x1 = n[0] * cs + n[2] * sn, z1 = -n[0] * sn + n[2] * cs;
      const ny = n[1] * cp - z1 * sp, nz = z1 * cp + n[1] * sp;
      vis[i] = nz < -0.05 ? 1 : 0;
      lit[i] = 0.58 + 0.62 * Math.max(0, x1 * TO_LIGHT[0] + ny * TO_LIGHT[1] + nz * TO_LIGHT[2]);
    });
    const table = new Float32Array(64);
    for (let m = 1; m < 64; m++) {
      let best = 0;
      for (let i = 0; i < 6; i++) if (m & (1 << i) && vis[i]) best = Math.max(best, lit[i]);
      table[m] = best ? Math.round(best * 8) / 8 : 0;
    }

    const plot = (X, Y, Z, r, g, b, bright) => {
      P(X, Y + bob, Z, tmpv);
      const px = Math.round(ox + (tmpv[0] - f[0]) * zoom - s / 2) - bx, py = Math.round(oyc + (tmpv[1] - f[1]) * zoom - s / 2) - by;
      const d = tmpv[2];
      let R2 = r * bright, G2 = g * bright, B2 = b * bright;
      if (bright > 1) { const k = (bright - 1) * 0.9; R2 = r + (255 - r) * k; G2 = g + (255 - g) * k; B2 = b + (255 - b) * k; }
      for (let yy = py; yy < py + s; yy++) {
        if (yy < 0 || yy >= bh) continue;
        for (let xx = px; xx < px + s; xx++) {
          if (xx < 0 || xx >= bw) continue;
          const j = yy * bw + xx;
          if (d >= zb[j]) continue;
          zb[j] = d;
          const q = j * 4;
          data[q] = R2; data[q + 1] = G2; data[q + 2] = B2; data[q + 3] = 255;
        }
      }
    };

    for (let i = 0; i < M.n; i++) {
      const b = table[M.m[i]];
      if (!b) continue;
      const c = M.c[i];
      let bright = b;
      if (M.k[i] === 2) bright = 1.15 + (o.lights || 0) * 0.3;
      else if (M.k[i] === 1) bright = M.m[i] & 8 ? Math.max(b, 1.05) : b * 0.95; // lit glass tops
      plot(M.x[i], M.y[i], M.z[i], (c >> 16) & 255, (c >> 8) & 255, c & 255, bright);
    }
    // wheels (spokes rotate)
    const spin = o.spin || 0;
    for (const w of M.wheels) {
      let c = M.tyre, bright = 0.9;
      if (w.outer && w.r < 2.5) {
        const spoke = (((w.a + spin) % (Math.PI * 0.4)) + Math.PI * 0.4) % (Math.PI * 0.4) < 0.42;
        c = w.r < 0.8 ? M.rimD : spoke ? M.rim : M.rimD;
        bright = spoke ? 1.05 : 0.8;
      } else if (w.r > 3.0) bright = 0.7;
      plot(w.x, w.y - bob, w.z, c[0], c[1], c[2], bright);
    }

    // outline pass: silhouette + depth edges
    const OUT = [20, 12, 34];
    const filled = (j) => data[j * 4 + 3] === 255 && zb[j] < 1e8;
    const out = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const j = y * bw + x;
        if (filled(j)) {
          const d = zb[j];
          const n = [x > 0 ? j - 1 : -1, x < bw - 1 ? j + 1 : -1, y > 0 ? j - bw : -1, y < bh - 1 ? j + bw : -1];
          for (const q of n) if (q >= 0 && filled(q) && zb[q] < d - 4.5) { out[j] = 2; break; }
        } else {
          if ((x > 0 && filled(j - 1)) || (x < bw - 1 && filled(j + 1)) || (y > 0 && filled(j - bw)) || (y < bh - 1 && filled(j + bw))) out[j] = 1;
        }
      }
    for (let j = 0; j < bw * bh; j++) {
      const q = j * 4;
      if (out[j] === 1) { data[q] = OUT[0]; data[q + 1] = OUT[1]; data[q + 2] = OUT[2]; data[q + 3] = 255; }
      else if (out[j] === 2) { data[q] *= 0.62; data[q + 1] *= 0.6; data[q + 2] *= 0.7; }
    }

    tmpCtx.clearRect(0, 0, tmp.width, tmp.height);
    tmpCtx.putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0, bw, bh, bx, by, bw, bh);
  }

  // world point -> screen, for anchoring effects to car parts
  function project(o, X, Y, Z) {
    const cs = Math.cos(o.yaw), sn = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch);
    const P = (X, Y, Z) => { const x1 = X * cs + Z * sn, z1 = -X * sn + Z * cs; return [x1, Y * cp - z1 * sp]; };
    const f = P(o.fx || 0, o.fy || 0, o.fz || 0), p = P(X, Y, Z);
    return [o.cx + (p[0] - f[0]) * o.zoom, o.cy + (p[1] - f[1]) * o.zoom];
  }

  window.Voxel3D = { model, render, project, HW };
})();
