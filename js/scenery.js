// Race backdrops. The sunset over the bay (art.js) is the house look and the menus keep it;
// the races take turns through three more places: Miami Beach at noon, downtown at night
// and Little Havana at golden hour. Each one is a static sky baked once per screen
// size, two parallax layers, a foreground strip, and a handful of things that move - so a
// level reads as a different part of town without costing a frame.
(function () {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const TW = 640;                               // every layer tiles at this width
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const th = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

  // banded sky with dithered seams, the same way the sunset is painted
  function sky(img, vw, top, horizon, cols) {
    const rgb = cols.map(hex), band = (horizon - top) / cols.length;
    for (let y = 0; y < horizon; y++) {
      const f = Math.max(0, (y - top) / band), bi = Math.min(cols.length - 1, Math.floor(f)), frac = f - bi;
      for (let x = 0; x < vw; x++) {
        const i = frac > 0.55 && (frac - 0.55) * 2.2 > th(x, y) ? Math.min(cols.length - 1, bi + 1) : bi;
        const c = y < top ? rgb[0] : rgb[i], o = (y * vw + x) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
    }
  }
  // ground bands from the horizon down: [[depth, colour], ...], dithered into the next one
  function ground(img, vw, vh, horizon, bands) {
    const rgb = bands.map((b) => hex(b[1]));
    for (let y = horizon; y < vh; y++) {
      const d = y - horizon;
      let i = 0;
      while (i < bands.length - 1 && d >= bands[i + 1][0]) i++;
      const next = Math.min(bands.length - 1, i + 1), span = (bands[next][0] - bands[i][0]) || 1;
      const k = (d - bands[i][0]) / span;
      for (let x = 0; x < vw; x++) {
        const c = next !== i && k > 0.5 && (k - 0.5) * 2 > th(x, y) ? rgb[next] : rgb[i], o = (y * vw + x) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
    }
  }
  function disc(g, cx, cy, R, col) {
    g.fillStyle = col;
    for (let y = -R; y <= R; y++) { const h = Math.floor(Math.sqrt(R * R - y * y)); g.fillRect(cx - h, cy + y, h * 2 + 1, 1); }
  }
  // a dithered halo: a ring of pixels that thins out with distance
  function halo(g, cx, cy, r0, r1, col) {
    g.fillStyle = col;
    for (let y = -r1; y <= r1; y++)
      for (let x = -r1; x <= r1; x++) {
        const d = Math.hypot(x, y);
        if (d < r0 || d > r1) continue;
        if (1 - (d - r0) / (r1 - r0) > th(cx + x, cy + y) + 0.15) g.fillRect(cx + x, cy + y, 1, 1);
      }
  }
  function tileX(ctx, img, off, y, vw, each) {
    let x = ((Math.round(off) % img.width) + img.width) % img.width - img.width;
    for (; x < vw; x += img.width) { ctx.drawImage(img, x, Math.round(y)); if (each) each(x); }
  }

  // ======================= MIAMI BEACH, NOON =======================
  const BEACH = {
    build(vw, vh, baseY) {
      const hz = baseY + 138;
      const c = canvas(vw, vh), g = c.getContext('2d'), img = g.createImageData(vw, vh);
      sky(img, vw, baseY - 20, hz, ['#2a6fd0', '#3280da', '#3b90e2', '#4ba2ea', '#5eb3ef', '#74c3f1', '#8dd0f1', '#a8dcef', '#c6e7ec', '#e4f1e6']);
      // the bay: a haze line, turquoise shallows, then the sand the roofs stand on
      ground(img, vw, vh, hz, [[0, '#d9f2ee'], [2, '#5fd3d6'], [6, '#34bccb'], [13, '#1c9dba'], [18, '#f5deb0'], [22, '#ecc98e'], [40, '#dcb277']]);
      g.putImageData(img, 0, 0);
      // noon sun, high and white, with a soft ring
      const sx = Math.round(vw * 0.74), sy = Math.max(14, hz - 118);
      halo(g, sx, sy, 12, 26, '#fff8d8');
      disc(g, sx, sy, 11, '#fffbe8'); disc(g, sx - 2, sy - 2, 6, '#ffffff');
      return { canvas: c, hz, sx, sy };
    },
    layers(hz) {
      const r = World.rng(21);
      // puffy clouds, lit from above
      const clouds = canvas(TW, 40), cg = clouds.getContext('2d');
      for (let k = 0; k < 5; k++) {
        const x0 = 20 + k * 124 + Math.floor(r() * 40), y0 = 14 + Math.floor(r() * 14);
        const puffs = [[0, 6, 9], [10, 2, 11], [22, 5, 9], [31, 8, 7], [-8, 9, 6]];
        for (const [dx, dy, R] of puffs) disc(cg, x0 + dx, y0 + dy, R, '#dcecff');
        for (const [dx, dy, R] of puffs) disc(cg, x0 + dx, y0 + dy - 2, R - 1, '#ffffff');
        cg.fillStyle = '#dcecff'; cg.fillRect(x0 - 14, y0 + 13, 58, 2);
      }
      // art deco hotels across the bay, pastel and hazed by distance
      const far = canvas(TW, 56), fg = far.getContext('2d');
      const PAST = [['#f4b8cc', '#e79ab4'], ['#b6ead9', '#8fd4c2'], ['#fbe3a0', '#ecc97a'], ['#f2eefa', '#d6d0e8'], ['#bcd4ff', '#98b6f0']];
      let x = 0;
      while (x < TW - 30) {
        const bw = 16 + Math.floor(r() * 22), bh = 18 + Math.floor(r() * 36), top = 56 - bh, [b, s] = PAST[Math.floor(r() * PAST.length)];
        fg.fillStyle = b; fg.fillRect(x, top, bw, bh);
        fg.fillStyle = s; fg.fillRect(x + bw - 3, top, 3, bh);                   // shaded side
        // stepped deco crown and a centre fin
        fg.fillStyle = b; fg.fillRect(x + 3, top - 3, bw - 6, 3); fg.fillRect(x + bw / 2 - 2, top - 7, 4, 4);
        fg.fillStyle = s; fg.fillRect(x + bw / 2 - 1, top - 12, 2, 5);
        // horizontal "eyebrow" ledges and ribbon windows
        fg.fillStyle = '#6aa8b8';
        for (let wy = top + 5; wy < 52; wy += 5) fg.fillRect(x + 2, wy, bw - 6, 2);
        fg.fillStyle = '#ffffff';
        for (let wy = top + 4; wy < 52; wy += 5) fg.fillRect(x + 2, wy, bw - 6, 1);
        x += bw + 2 + Math.floor(r() * 10);
      }
      // the beach itself: lifeguard stands, umbrellas, palms
      const near = canvas(TW, 60), ng = near.getContext('2d');
      const tower = (x0) => {
        ng.fillStyle = '#7a5a3a'; ng.fillRect(x0 + 2, 36, 1, 20); ng.fillRect(x0 + 15, 36, 1, 20); ng.fillRect(x0 + 2, 46, 14, 1);
        ng.fillStyle = '#ff5c7a'; ng.fillRect(x0, 26, 18, 10);
        ng.fillStyle = '#ffd23f'; ng.fillRect(x0 + 1, 28, 16, 2); ng.fillRect(x0 + 1, 32, 16, 2);
        ng.fillStyle = '#29c7d8'; ng.fillRect(x0 - 2, 22, 22, 4); ng.fillStyle = '#1c8aa0'; ng.fillRect(x0 - 2, 25, 22, 1);
        ng.fillStyle = '#2a2238'; ng.fillRect(x0 + 5, 29, 8, 5);
        ng.fillStyle = '#ff3e5a'; ng.fillRect(x0 + 18, 14, 1, 8); ng.fillRect(x0 + 19, 14, 5, 3);
      };
      const umbrella = (x0, a, b) => {
        ng.fillStyle = '#e8e0d0'; ng.fillRect(x0, 44, 1, 12);
        for (let i = 0; i < 8; i++) { ng.fillStyle = i % 2 ? a : b; ng.fillRect(x0 - 9 + i * 2 + (i > 3 ? 1 : 0), 41 - Math.min(i, 7 - i), 2, 2 + Math.min(i, 7 - i)); }
        ng.fillStyle = '#00000022'; ng.fillRect(x0 - 8, 56, 16, 2);
      };
      const palm = (x0, h) => {
        let px = x0;
        for (let i = 0; i < h; i++) { ng.fillStyle = i % 3 ? '#8a6a44' : '#6e5234'; ng.fillRect(Math.round(px), 58 - i, 2, 1); px += Math.sin((i / h) * 1.5) * 0.3; }
        const tx = Math.round(px) + 1, ty = 58 - h;
        for (const [dx, dy] of [[-1, -0.3], [1, -0.3], [-1, 0.4], [1, 0.4], [-0.5, -0.8], [0.6, -0.7]])
          for (let i = 0; i < 13; i++) { ng.fillStyle = i < 5 ? '#2f8a3a' : '#48b04a'; ng.fillRect(Math.round(tx + dx * i), Math.round(ty + dy * i + (i * i) / 38), 2, 1); }
        ng.fillStyle = '#6e4a24'; ng.fillRect(tx - 1, ty + 1, 2, 2);
      };
      tower(40); umbrella(110, '#ff3ea5', '#ffffff'); umbrella(150, '#29c7d8', '#fff1c9'); palm(190, 46);
      umbrella(262, '#ffd23f', '#ff5c7a'); tower(330); palm(410, 38); umbrella(470, '#7ae83a', '#ffffff'); palm(540, 50); umbrella(600, '#9d6bff', '#fff1c9');
      return { clouds, far, near };
    },
    draw(ctx, S, vw, vh, baseY, camX, t) {
      const L = S.L, hz = S.hz;
      tileX(ctx, L.clouds, -camX * 0.03 - t * 3, hz - 124, vw);
      tileX(ctx, L.far, -camX * 0.08, hz - 56, vw);
      // sails crossing the bay, and the glitter on the water
      for (let k = 0; k < 3; k++) {
        const x = (((k * 211 + t * (6 + k * 3) - camX * 0.1) % (vw + 60)) + vw + 60) % (vw + 60) - 30, y = hz + 4 + k * 3;
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x) + 2, y - 5 + i, i + 1, 1);
        ctx.fillStyle = '#ff5c7a'; ctx.fillRect(Math.round(x), y + 1, 9, 1); ctx.fillStyle = '#2a2238'; ctx.fillRect(Math.round(x) + 1, y + 2, 7, 1);
      }
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 18; k++) {
        if (Math.sin(t * 3 + k * 1.7) < 0.6) continue;
        const x = (((k * 97 - camX * 0.12) % vw) + vw) % vw, y = hz + 3 + ((k * 7) % 13);
        ctx.fillRect(Math.round(x), y, 2, 1);
      }
      // gulls wheeling overhead
      ctx.fillStyle = '#2a3a5a';
      for (let k = 0; k < 3; k++) {
        const x = (((k * 173 + t * 14 - camX * 0.05) % (vw + 40)) + vw + 40) % (vw + 40) - 20, y = Math.round(S.sy + 20 + k * 14 + Math.sin(t * 1.3 + k) * 5);
        const up = Math.floor(t * 5 + k) % 2;
        ctx.fillRect(Math.round(x), y, 1, 1);
        ctx.fillRect(Math.round(x) - 2, y - up, 2, 1); ctx.fillRect(Math.round(x) + 1, y - up, 2, 1);
        ctx.fillRect(Math.round(x) - 3, y - up * 2 + (up ? 0 : 1), 1, 1); ctx.fillRect(Math.round(x) + 3, y - up * 2 + (up ? 0 : 1), 1, 1);
      }
      tileX(ctx, L.near, -camX * 0.3, hz + 2, vw);
    },
  };

  // ======================= DOWNTOWN, MIDNIGHT =======================
  const DOWNTOWN = {
    build(vw, vh, baseY) {
      const hz = baseY + 150;
      const c = canvas(vw, vh), g = c.getContext('2d'), img = g.createImageData(vw, vh);
      sky(img, vw, baseY - 10, hz, ['#04030c', '#070716', '#0a0b20', '#0e102b', '#131636', '#191c42', '#20224e', '#2a2a5a', '#383264', '#4a3a6c']);
      ground(img, vw, vh, hz, [[0, '#2a2450'], [2, '#0c0c22'], [30, '#08081a']]);
      g.putImageData(img, 0, 0);
      const r = World.rng(33);
      for (let i = 0; i < vw / 9; i++) { g.fillStyle = r() < 0.25 ? '#cfd8ff' : '#4a4c80'; g.fillRect(Math.floor(r() * vw), Math.floor(r() * (hz - 70)), 1, 1); }
      // a crescent moon: the disc with a second, sky-coloured one bitten out of it
      const mx = Math.round(vw * 0.18), my = Math.max(14, hz - 128);
      halo(g, mx, my, 10, 20, '#2a3066');
      disc(g, mx, my, 9, '#f2f0ff'); disc(g, mx + 4, my - 2, 8, '#0a0b20');
      g.fillStyle = '#d0cce8'; g.fillRect(mx - 6, my + 1, 1, 1); g.fillRect(mx - 4, my + 4, 1, 1);
      return { canvas: c, hz };
    },
    layers() {
      const r = World.rng(34);
      const tower = (g, H, x, bw, bh, body, side, win, dens, lights) => {
        const top = H - bh;
        g.fillStyle = body; g.fillRect(x, top, bw, bh);
        g.fillStyle = side; g.fillRect(x + bw - 3, top, 3, bh);
        const crown = r();
        if (crown < 0.3) { g.fillStyle = body; for (let i = 0; i < 5; i++) g.fillRect(x + i * 2, top - 5 + i, bw - i * 4, 1); }
        else if (crown < 0.6) { g.fillStyle = side; g.fillRect(x + bw / 2 - 1, top - 14, 1, 14); lights.push([x + bw / 2 - 1, top - 15]); }
        else { g.fillStyle = body; g.fillRect(x + 3, top - 4, bw - 6, 4); lights.push([x + 4, top - 5]); }
        g.fillStyle = win;
        for (let wy = top + 4; wy < H - 2; wy += 4)
          for (let wx = x + 2; wx < x + bw - 4; wx += 3) if (r() < dens) g.fillRect(wx, wy, 2, 2);
      };
      const far = canvas(TW, 120), fg = far.getContext('2d'), farLights = [];
      let x = 0;
      while (x < TW - 24) { const bw = 14 + Math.floor(r() * 20); tower(fg, 120, x, bw, 50 + Math.floor(r() * 66), '#141a3a', '#0f1430', '#4a60c8', 0.26, farLights); x += bw + 1 + Math.floor(r() * 5); }
      const near = canvas(TW, 90), ng = near.getContext('2d'), signs = [];
      x = 0;
      while (x < TW - 30) {
        const bw = 22 + Math.floor(r() * 26), bh = 30 + Math.floor(r() * 56);
        tower(ng, 90, x, bw, bh, '#0c0d22', '#08091a', r() < 0.5 ? '#b8894a' : '#c9a468', 0.3, []);
        if (r() < 0.55) signs.push({ x: x + 3, y: 90 - bh + 6 + Math.floor(r() * 10), w: bw - 8, c: ['#ff3ea5', '#29e0d0', '#ffc31f', '#9d5cff'][Math.floor(r() * 4)], ph: r() * 10 });
        x += bw + 2 + Math.floor(r() * 4);
      }
      // street lamps along the embankment, each with its own pool of light
      const lamps = canvas(TW, 70), lg = lamps.getContext('2d');
      for (let lx = 30; lx < TW; lx += 160) {
        lg.fillStyle = '#1a1830'; lg.fillRect(lx, 12, 2, 58); lg.fillRect(lx, 12, 9, 2);
        halo(lg, lx + 8, 16, 2, 11, '#ffd37a55');
        lg.fillStyle = '#fff3c0'; lg.fillRect(lx + 6, 14, 5, 2);
      }
      return { far, farLights, near, signs, lamps };
    },
    draw(ctx, S, vw, vh, baseY, camX, t) {
      const L = S.L, hz = S.hz;
      // searchlights sweeping the clouds from somewhere behind the towers
      ctx.save();
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#b8c8ff';
      for (let k = 0; k < 2; k++) {
        const bx = ((k ? 0.72 : 0.3) * vw - camX * 0.06 % vw + vw) % vw, a = Math.sin(t * 0.35 + k * 2.1) * 0.5 - Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(bx, hz);
        ctx.lineTo(bx + Math.cos(a - 0.05) * 260, hz + Math.sin(a - 0.05) * 260);
        ctx.lineTo(bx + Math.cos(a + 0.05) * 260, hz + Math.sin(a + 0.05) * 260);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      const blink = Math.floor(t * 1.4) % 2;
      tileX(ctx, L.far, -camX * 0.08, hz - 120, vw, (x0) => {
        if (!blink) return;
        ctx.fillStyle = '#ff2a3a';
        for (const [lx, ly] of L.farLights) ctx.fillRect(x0 + lx, hz - 120 + ly, 1, 1);
      });
      const ny = hz - 90 + 16;
      tileX(ctx, L.near, -camX * 0.22, ny, vw, (x0) => {
        for (const s of L.signs) {
          // neon that buzzes: mostly on, now and then a stutter
          const on = Math.sin(t * 9 + s.ph * 7) > -0.85 || Math.floor(t * 20 + s.ph) % 3;
          ctx.fillStyle = on ? s.c : '#2a2238';
          ctx.fillRect(x0 + s.x, ny + s.y, s.w, 1); ctx.fillRect(x0 + s.x, ny + s.y + 3, s.w, 1);
          ctx.fillRect(x0 + s.x, ny + s.y, 1, 4); ctx.fillRect(x0 + s.x + s.w - 1, ny + s.y, 1, 4);
        }
      });
      // the bay under the towers: windows broken up into shivering streaks
      const cols = ['#ffd37a', '#5f7cff', '#ff3ea5', '#29e0d0'];
      for (let k = 0; k < 40; k++) {
        const x = (((k * 53 - camX * 0.22) % vw) + vw) % vw, y = hz + 18 + ((k * 11) % 26);
        const w = 3 + ((k * 7) % 6) + Math.round(Math.sin(t * 2.5 + k) * 2);
        ctx.fillStyle = cols[k % 4]; ctx.globalAlpha = 0.55;
        ctx.fillRect(Math.round(x + Math.sin(t * 1.7 + k * 0.7) * 2), y, Math.max(1, w), 1);
      }
      ctx.globalAlpha = 1;
      tileX(ctx, L.lamps, -camX * 0.5, Math.min(vh - 80, baseY + 168), vw);
    },
  };

  // ======================= LITTLE HAVANA, CALLE OCHO, GOLDEN HOUR =======================
  const ROOSTER = [
    '...rr.....',
    '..rWWK....',
    '..WWWy....',
    '...WW..gg.',
    '..bBBBBgg.',
    '.bBBBBBBg.',
    '.bBBBBBB..',
    '..bBBBB...',
    '....y.y...',
    '...yy.yy..',
  ];
  const HAVANA = {
    build(vw, vh, baseY) {
      const hz = baseY + 146;
      const c = canvas(vw, vh), g = c.getContext('2d'), img = g.createImageData(vw, vh);
      sky(img, vw, baseY - 10, hz, ['#1d5f86', '#2a7896', '#4a92a0', '#78a8a0', '#b2b894', '#e2c080', '#f6b06a', '#f8955e', '#f07a58', '#e0654e']);
      // Calle Ocho: the sidewalk, the kerb, then warm asphalt
      ground(img, vw, vh, hz, [[0, '#e8c8a4'], [5, '#d4b08c'], [8, '#6a4e5a'], [9, '#4e3a4c'], [30, '#3a2c3e']]);
      g.putImageData(img, 0, 0);
      // a fat low sun and thin pink clouds across it
      const sx = Math.round(vw * 0.62), sy = hz - 44;
      halo(g, sx, sy, 20, 36, '#ffd08a');
      disc(g, sx, sy, 20, '#ffe39a'); disc(g, sx - 3, sy - 3, 14, '#fff0bc');
      g.fillStyle = '#f59a86';
      for (const [dx, dy, w] of [[-60, -30, 70], [-10, -16, 90], [40, -52, 50], [-120, -60, 60], [90, -24, 70]]) { g.fillRect(sx + dx, sy + dy, w, 2); g.fillRect(sx + dx + 8, sy + dy - 1, w - 20, 1); }
      // paving joints, the kerb edge and the yellow centre line
      g.fillStyle = '#c49c7a'; for (let x = 0; x < vw; x += 12) g.fillRect(x, hz + 1, 1, 6);
      g.fillStyle = '#f2dcc0'; g.fillRect(0, hz + 7, vw, 1);
      g.fillStyle = '#e8b830'; for (let x = 0; x < vw; x += 14) g.fillRect(x, hz + 22, 8, 1);
      return { canvas: c, hz };
    },
    layers() {
      const r = World.rng(56);
      // Brickell's towers and the Freedom Tower, softened by the evening haze
      const far = canvas(TW, 96), fg = far.getContext('2d');
      const HZ = ['#b8807a', '#a87276', '#c48c80'];
      let x = 0;
      while (x < TW - 20) {
        if (x > 190 && x < 250) { x = 252; continue; }
        const bw = 12 + Math.floor(r() * 16), bh = 24 + Math.floor(r() * 58);
        fg.fillStyle = HZ[Math.floor(r() * 3)]; fg.fillRect(x, 96 - bh, bw, bh);
        fg.fillStyle = '#cf9a88'; for (let wy = 96 - bh + 3; wy < 94; wy += 4) fg.fillRect(x + 2, wy, bw - 4, 1);
        x += bw + 3 + Math.floor(r() * 12);
      }
      const ft = (x0) => {                            // the Freedom Tower: base, shaft, belfry, cupola
        fg.fillStyle = '#9c6468'; fg.fillRect(x0 - 14, 70, 44, 26); fg.fillRect(x0, 30, 16, 66);
        fg.fillRect(x0 + 2, 22, 12, 8); fg.fillRect(x0 + 4, 16, 8, 6); disc(fg, x0 + 8, 15, 4, '#9c6468');
        fg.fillRect(x0 + 7, 6, 2, 6);
        fg.fillStyle = '#7a4a54'; for (let wy = 34; wy < 68; wy += 6) { fg.fillRect(x0 + 3, wy, 2, 3); fg.fillRect(x0 + 11, wy, 2, 3); }
        fg.fillRect(x0 + 5, 24, 6, 4);
      };
      ft(212);
      // the street: stucco shopfronts, striped awnings, a ventanita, the Tower Theater
      const near = canvas(TW, 80), ng = near.getContext('2d'), posts = [];
      const WALL = [['#ff9ab4', '#e07a96'], ['#ffe07a', '#e8c050'], ['#7ad8c8', '#58b8a8'], ['#ffb07a', '#e8905a'], ['#b8a8ff', '#9888e0'], ['#f2eefa', '#d6cce6'], ['#9ae0ff', '#78c0e8']];
      const AWN = [['#ff3e5a', '#ffffff'], ['#1e8a5a', '#ffffff'], ['#2a4fb8', '#ffffff'], ['#ffc31f', '#d8203a']];
      let signX = 0;
      const theater = (x0) => {                       // art deco block with the vertical blade sign
        ng.fillStyle = '#f2e6c8'; ng.fillRect(x0, 34, 44, 46);
        ng.fillStyle = '#d8c8a0'; ng.fillRect(x0 + 42, 34, 2, 46);
        for (let i = 0; i < 4; i++) ng.fillRect(x0 + 16 + i, 18 - i * 4, 12 - i * 2, 16 + i * 4);
        ng.fillStyle = '#f2e6c8'; ng.fillRect(x0 + 18, 0, 8, 34);
        // marquee with chaser bulbs, and the lit lobby doors
        ng.fillStyle = '#2a2238'; ng.fillRect(x0 - 2, 56, 48, 7);
        ng.fillStyle = '#ffd23f'; for (let k = x0; k < x0 + 44; k += 3) { ng.fillRect(k, 56, 1, 1); ng.fillRect(k + 1, 62, 1, 1); }
        ng.fillStyle = '#3a1a2a'; ng.fillRect(x0 + 14, 66, 16, 14);
        ng.fillStyle = '#ffd99a'; ng.fillRect(x0 + 16, 68, 5, 12); ng.fillRect(x0 + 23, 68, 5, 12);
        // the blade sign's box; its letters are lit per frame
        ng.fillStyle = '#1a1030'; ng.fillRect(x0 + 17, 4, 10, 48);
        signX = x0 + 17;
      };
      const mural = (x0, y0) => {                    // five stripes, the red triangle, the star
        for (let i = 0; i < 5; i++) { ng.fillStyle = i % 2 ? '#ffffff' : '#1e3fa0'; ng.fillRect(x0, y0 + i * 3, 26, 3); }
        ng.fillStyle = '#d8203a';
        for (let i = 0; i < 8; i++) ng.fillRect(x0 + i, y0 + i, 1, 15 - i * 2);
        ng.fillStyle = '#ffffff'; ng.fillRect(x0 + 1, y0 + 7, 3, 1); ng.fillRect(x0 + 2, y0 + 6, 1, 3);
      };
      x = 0;
      let k = 0;
      while (x < TW - 40) {
        if (k === 3) { theater(x); posts.push([x + 2, 34]); x += 50; k++; continue; }
        const bw = 38 + Math.floor(r() * 26), two = r() < 0.45, bh = two ? 44 + Math.floor(r() * 8) : 28 + Math.floor(r() * 6);
        const top = 80 - bh, [w, ws] = WALL[Math.floor(r() * WALL.length)];
        ng.fillStyle = w; ng.fillRect(x, top, bw, bh);
        ng.fillStyle = ws; ng.fillRect(x + bw - 2, top, 2, bh);
        // flat roof with a white cornice
        ng.fillStyle = '#f8f2e8'; ng.fillRect(x - 1, top - 2, bw + 2, 2);
        ng.fillStyle = ws; ng.fillRect(x - 1, top, bw + 2, 1);
        if (two) {
          // upstairs: jalousie windows over a little balcony rail
          for (let wx = x + 5; wx < x + bw - 8; wx += 12) {
            ng.fillStyle = '#4a6a7a'; ng.fillRect(wx, top + 6, 6, 9);
            ng.fillStyle = '#a8c8d0'; for (let j = 0; j < 9; j += 2) ng.fillRect(wx, top + 6 + j, 6, 1);
            ng.fillStyle = '#3a2a3a'; ng.fillRect(wx - 1, top + 16, 8, 1); ng.fillRect(wx - 1, top + 16, 1, 3); ng.fillRect(wx + 6, top + 16, 1, 3);
          }
        }
        // shopfront: warm window, door, striped awning across the lot
        const sy0 = 80 - 22, [a1, a2] = AWN[Math.floor(r() * AWN.length)];
        ng.fillStyle = '#ffd99a'; ng.fillRect(x + 4, sy0 + 6, bw - 20, 12);
        ng.fillStyle = '#e8a860'; ng.fillRect(x + 4, sy0 + 15, bw - 20, 3);
        ng.fillStyle = '#3a2a3a'; ng.fillRect(x + bw - 13, sy0 + 5, 8, 17);
        ng.fillStyle = '#6a4a5a'; ng.fillRect(x + bw - 12, sy0 + 7, 6, 15);
        for (let ax = x + 2; ax < x + bw - 2; ax += 2) { ng.fillStyle = ((ax - x) >> 1) % 2 ? a1 : a2; ng.fillRect(ax, sy0, 2, 4); ng.fillRect(ax, sy0 + 4, 1, 1); }
        ng.fillStyle = '#00000033'; ng.fillRect(x + 2, sy0 + 5, bw - 4, 1);
        if (r() < 0.45) {
          // la ventanita: the coffee window with its counter and two cafecitos
          ng.fillStyle = '#2a2238'; ng.fillRect(x + 8, sy0 + 8, 9, 7);
          ng.fillStyle = '#fff0c0'; ng.fillRect(x + 9, sy0 + 9, 7, 5);
          ng.fillStyle = '#8a5a3a'; ng.fillRect(x + 6, sy0 + 15, 13, 2);
          ng.fillStyle = '#ffffff'; ng.fillRect(x + 10, sy0 + 13, 1, 2); ng.fillRect(x + 13, sy0 + 13, 1, 2);
        }
        if (k % 4 === 1 && bh > 36) mural(x + 6, top + 4);
        posts.push([x + 2, top]);
        x += bw + 2 + Math.floor(r() * 5);
        k++;
      }
      // royal palms, street lamps and the painted roosters of Calle Ocho
      const fore = canvas(TW, 90), cg = fore.getContext('2d');
      const royal = (x0, h) => {
        cg.fillStyle = '#c8bcb0'; cg.fillRect(x0, 90 - h, 4, h);
        cg.fillStyle = '#a89c90'; cg.fillRect(x0 + 3, 90 - h, 1, h);
        cg.fillStyle = '#b4a89c'; for (let y = 90 - h + 4; y < 90; y += 5) cg.fillRect(x0, y, 4, 1);
        cg.fillStyle = '#5a9a4a'; cg.fillRect(x0, 90 - h - 10, 4, 10);
        const tx = x0 + 2, ty = 90 - h - 10;
        for (const [dx, dy] of [[-1, -0.2], [1, -0.2], [-1, 0.45], [1, 0.45], [-0.4, -0.9], [0.5, -0.85], [-0.8, 0.9], [0.8, 0.9]])
          for (let i = 0; i < 15; i++) { cg.fillStyle = i < 6 ? '#2f7a3a' : '#48a04a'; cg.fillRect(Math.round(tx + dx * i), Math.round(ty + dy * i + (i * i) / 34), 2, 1); }
      };
      const lamp = (x0) => {
        cg.fillStyle = '#2a2238'; cg.fillRect(x0, 40, 2, 50); cg.fillRect(x0 - 3, 40, 8, 2);
        cg.fillStyle = '#ffe9a0'; cg.fillRect(x0 - 2, 42, 6, 2);
      };
      const rooster = (x0, body) => {
        const pal = { r: '#d8203a', W: '#ffffff', K: '#12082a', y: '#ffc31f', g: '#1e8a5a', B: body, b: '#12082a' };
        ROOSTER.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c) { cg.fillStyle = c; cg.fillRect(x0 + i, 80 + y, 1, 1); } } });
      };
      royal(60, 58); lamp(150); rooster(200, '#ff3ea5'); royal(300, 66); lamp(420); royal(470, 50); rooster(540, '#29c7d8');
      return { far, near, posts, fore, signX };
    },
    draw(ctx, S, vw, vh, baseY, camX, t) {
      const L = S.L, hz = S.hz;
      tileX(ctx, L.far, -camX * 0.08, hz - 96, vw);
      const ny = hz - 80 + 8;
      tileX(ctx, L.near, -camX * 0.22, ny, vw, (x0) => {
        // the Tower Theater's blade sign: neon that buzzes, and one letter that keeps dropping out
        const on = Math.sin(t * 7) > -0.9 || Math.floor(t * 18) % 2;
        'TOWER'.split('').forEach((ch, i) => {
          const lit = on && !(i === 3 && Math.sin(t * 2.3) > 0.7);
          Font.draw(ctx, ch, x0 + L.signX + 5, ny + 6 + i * 9, lit ? '#ff5c7a' : '#4a2a3a', 1, 'center', null);
        });
        // café strings: warm bulbs slung roof to roof, twinkling out of step
        const P = L.posts;
        for (let i = 0; i < P.length - 1; i++) {
          const ax = x0 + P[i][0], ay = ny + P[i][1] + 1, bx = x0 + P[i + 1][0] + 4, by = ny + P[i + 1][1] + 1;
          if (bx < -10 || ax > vw + 10) continue;
          const n = Math.max(3, Math.floor((bx - ax) / 5));
          for (let k = 0; k <= n; k++) {
            const u = k / n, sag = Math.sin(u * Math.PI) * 7;
            const px = Math.round(ax + (bx - ax) * u), py = Math.round(ay + (by - ay) * u + sag);
            ctx.fillStyle = '#3a2a3a'; ctx.fillRect(px, py, 1, 1);
            if (k === 0 || k === n || k % 2) continue;
            const glow = Math.sin(t * 3 + k * 1.3 + i * 2) > -0.5;
            ctx.fillStyle = glow ? '#fff0a0' : '#c89a50'; ctx.fillRect(px, py + 1, 1, 2);
          }
        }
      });
      // classic '50s cars cruising Calle Ocho, one each way
      const street = hz + 14;
      [[1, 26, '#29c7b8', 0], [-1, 20, '#ff7a9c', 300]].forEach(([dir, sp, col, ph]) => {
        const span = vw + 80;
        const x = Math.round((((ph + t * sp * dir - camX * 0.3) % span) + span) % span - 40);
        const y = street + (dir > 0 ? 0 : -5);
        ctx.fillStyle = col; ctx.fillRect(x, y, 22, 4); ctx.fillRect(x + 5, y - 3, 11, 3);
        ctx.fillStyle = '#f2eefa'; ctx.fillRect(x + 5, y - 4, 11, 1);
        ctx.fillStyle = '#5ab4e6'; ctx.fillRect(x + (dir > 0 ? 12 : 6), y - 3, 4, 2);
        ctx.fillStyle = '#e6ecf5'; ctx.fillRect(x, y + 3, 22, 1);
        ctx.fillStyle = dir > 0 ? '#fff6b0' : '#ff2a3a'; ctx.fillRect(dir > 0 ? x + 21 : x, y, 1, 2);
        ctx.fillStyle = '#12082a'; ctx.fillRect(x + 3, y + 4, 4, 2); ctx.fillRect(x + 15, y + 4, 4, 2);
      });
      tileX(ctx, L.fore, -camX * 0.5, Math.min(vh - 90, baseY + 164), vw);
    },
  };

  const THEMES = { beach: BEACH, downtown: DOWNTOWN, havana: HAVANA };
  // the order a campaign walks through them; the first is the house sunset in art.js
  const ORDER = ['sunset', 'beach', 'downtown', 'havana'];
  const NAMES = { sunset: 'ЗАХІД НАД ЗАТОКОЮ', beach: 'МАЯМІ-БІЧ', downtown: 'НІЧНИЙ ДАУНТАУН', havana: 'МАЛА ГАВАНА' };
  const cache = {};

  window.Scenery = {
    ORDER, NAMES,
    pick: (n) => ORDER[(((n || 1) - 1) % ORDER.length + ORDER.length) % ORDER.length],
    has: (id) => !!THEMES[id],
    draw(ctx, id, vw, vh, baseY, camX, time) {
      const T = THEMES[id];
      let S = cache[id];
      if (!S || S.vw !== vw || S.vh !== vh || S.baseY !== baseY) {
        S = cache[id] = Object.assign(T.build(vw, vh, baseY), { vw, vh, baseY });
        S.L = T.layers(S.hz);
      }
      ctx.drawImage(S.canvas, 0, 0);
      T.draw(ctx, S, vw, vh, baseY, camX, time);
    },
  };
})();
