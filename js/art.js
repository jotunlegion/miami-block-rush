// Pixel art: palettes, voxel car maps, tiles, money bags, Miami sunset background
(function () {
  const TEAM = [
    { hi: '#ff7cc6', main: '#ff3ea5', dark: '#8c1a5c', body: '#3a1244', body2: '#30103c' }, // vice
    { hi: '#ffe27a', main: '#ffc31f', dark: '#8a5a0a', body: '#3c2418', body2: '#321d14' }, // kings
    { hi: '#8ffff0', main: '#29e0d0', dark: '#0f6f73', body: '#123a48', body2: '#0e3040' }, // havana
  ];
  const STATIC = { hi: '#c9bdff', main: '#9d8cff', dark: '#3d2f7a', body: '#271a4f', body2: '#221645' };
  const POLICE = { hi: '#9cc4ff', main: '#2f6bff', dark: '#16307a', body: '#131a44', body2: '#10163a' };
  const PLATFORM = { hi: '#d8ff9a', main: '#6aff5a', dark: '#1f7a3a', body: '#173a22', body2: '#12301c' };
  const BARRIER = { hi: '#ffd08a', main: '#ff8a3d', dark: '#8a3d0f', body: '#4a2410', body2: '#3d1d0c' };
  const teamPal = (o) => (o < 3 ? TEAM[o] : o === 3 ? POLICE : o === 5 ? PLATFORM : o === 6 ? BARRIER : STATIC);

  // ---------- voxel car maps ----------
  const PAL_COMMON = { K: '#1a0f2a', C: '#6fe8ff', c: '#1e6a9e', Y: '#fff6b0', R: '#ff2a3a', H: '#e6ecf5', G: '#5a4a78' };
  const CAR_DEFS = {
    vice: {
      pal: { W: '#f7f3ff', w: '#cfc6ea', s: '#9384c4', P: '#ff3ea5' },
      wheelX: [-10, 9], wheelY: 4, rim: '#e6ecf5', tyre: '#2a2238',
      rows: [
        '..........KKKKKKKK..............',
        '........KKwWWWWWWKcK............',
        '......KKwWWWWWWWWKcCCK..........',
        '....KKwWWWWWWWWWWKccCCCK........',
        '..KKWWWWWWWWWWWWWWKKKKKKKKKK....',
        '.KRWWWWWWWWWWWWWWWWWWWWWWWWWWKK.',
        '.KRPPPPPPPPPPPPPPPPPPPPPPPPPPPYK',
        '.KWWWWWWWWWWWWWWWWWWWWWWWWWWWWWK',
        '.KwsssswwwwwwwwwwwwwwwwwssswwwwK',
        '.KsssssssssssssssssssssssssssssK',
        '..KKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
      ],
    },
    kings: {
      pal: { u: '#b26cf0', V: '#7b2fbe', v: '#4a1a7a', O: '#ffc31f', r: '#e0302a', y: '#ffd23f', g: '#2fa84f' },
      wheelX: [-11, 11], wheelY: 5, rim: '#ffc31f', tyre: '#2a2238',
      rows: [
        '...........KKKKKKKKKKKK...........',
        '..........KuuuuuuuuuuuuK..........',
        '.........KcCCCKuKcCCCCCcKK........',
        '........KcCCCCKuKcCCCCCCccK.......',
        '..KKKKKKuuuuuuuuuuuuuuuuuuuKKKKK..',
        '.KRuuuuuuuuuuuuuuuuuuuuuuuuuuuuuYK',
        '.KOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOK',
        '.KrygKrygKrygKrygKrygKrygKrygKrygK',
        '.KVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVK',
        '.KvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvK',
        '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
      ],
    },
    havana: {
      pal: { T: '#29c7b8', t: '#177a7f', Q: '#8ff5e6', E: '#fff1c9', e: '#d9c08a', F: '#ff6a1f', f: '#ffd23f' },
      wheelX: [-10, 9], wheelY: 5, rim: '#e6ecf5', tyre: '#fff1c9',
      rows: [
        '.........KKKKKKKKKKK............',
        '........KEEEEEEEEEEEK...........',
        '.......KcCCKEEKcCCCCCK..........',
        '......KcCCCKEEKcCCCCCCK.........',
        '.KK..KTTTTTTTTTTTTTTTTTKKKK.....',
        '.KTKKQQQQQQQQQQQQQQQQQQQQQQQKKK.',
        '.KRTTTTTTTTTTTTTTTTTTTTTTfFFFTYK',
        '.KTTTTTTTTTTTTTTTTTTTfFFFfFFTTTK',
        '.KHEEEEEEEEEEEEEEEEEEEEEEEEEEEHK',
        '.KHeeeeeeeeeeeeeeeeeeeeeeeeeeeHK',
        '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
      ],
    },
    police: {
      pal: { W: '#f4f4ff', w: '#b9b6d6', L: '#ff2a3a', l: '#2f6bff' },
      wheelX: [-10, 9], wheelY: 4, rim: '#9aa3b8', tyre: '#2a2238',
      rows: [
        '............LLKll...............',
        '..........KKKKKKKKK.............',
        '.........KcCCKWKcCCCK...........',
        '........KcCCCKWKcCCCCK..........',
        '..KKKKKKWWWWWWWWWWWWWWKKKKKK....',
        '.KRWWWWWWWWWWWWWWWWWWWWWWWWWWWK.',
        '.KRKKKKKKKWWWWWWWWWWWKKKKKKKKKYK',
        '.KKKKKKKKKWwwwwwwwwWWKKKKKKKKKKK',
        '.KKKKKKKKKWWWWWWWWWWWKKKKKKKKKKK',
        '.KHKKKKKKKKKKKKKKKKKKKKKKKKKKKHK',
        '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
      ],
    },
  };

  const CARS = {};
  for (const key in CAR_DEFS) {
    const d = CAR_DEFS[key];
    const w = Math.max(...d.rows.map((r) => r.length)), h = d.rows.length;
    const pal = Object.assign({}, PAL_COMMON, d.pal);
    const px = new Array(w * h).fill(null);
    d.rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch && ch !== '.' && pal[ch]) px[y * w + x] = pal[ch];
      }
    });
    // carve wheel arches with a dark rim
    const cx = w / 2, cy = h / 2;
    for (const wx of d.wheelX) {
      const ax = cx + wx, ay = cy + d.wheelY;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const dist = Math.hypot(x + 0.5 - ax, y + 0.5 - ay);
          const yy = y + 0.5;
          if (dist < 4.1 && yy >= ay - 3.5) px[y * w + x] = null;
          else if (dist < 5.1 && yy >= ay - 4.5 && px[y * w + x]) px[y * w + x] = PAL_COMMON.K;
        }
    }
    CARS[key] = { key, w, h, px, wheelX: d.wheelX, wheelY: d.wheelY, rim: d.rim, tyre: d.tyre };
  }

  function carCanvas(car, alive, swapLights) {
    const c = document.createElement('canvas');
    c.width = car.w; c.height = car.h;
    const x = c.getContext('2d');
    const img = x.createImageData(car.w, car.h);
    for (let i = 0; i < car.px.length; i++) {
      let col = car.px[i];
      if (!col || (alive && !alive[i])) continue;
      if (swapLights) col = col === '#ff2a3a' && i < car.w ? '#2f6bff' : col === '#2f6bff' ? '#ff2a3a' : col;
      const n = parseInt(col.slice(1), 16);
      img.data[i * 4] = n >> 16; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  const wheelCache = {};
  function wheel(rim, tyre) {
    const k = rim + tyre;
    if (wheelCache[k]) return wheelCache[k];
    const rows = ['..KKK..', '.KXXXK.', 'KXHHHXK', 'KXHhHXK', 'KXHHHXK', '.KXXXK.', '..KKK..'];
    const pal = { K: '#120a1e', X: tyre === '#2a2238' ? '#2a2238' : tyre, H: rim, h: '#3a3350' };
    wheelCache[k] = fromRows(rows, pal);
    return wheelCache[k];
  }

  function fromRows(rows, pal) {
    const c = document.createElement('canvas');
    c.width = Math.max(...rows.map((r) => r.length)); c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } }));
    return c;
  }

  // ---------- money bag ----------
  const BAG_ROWS = [
    '...K..K...',
    '....KK....',
    '...KOOK...',
    '..KGGGGK..',
    '.KGLDDDgK.',
    'KGLDGGGGgK',
    'KGLGDDDGgK',
    'KGGGGGDGgK',
    'KGGDDDGGgK',
    '.KGGGGGggK',
    '..KKKKKKK.',
  ];
  const bag = fromRows(BAG_ROWS, { K: '#12081e', O: '#ffc31f', G: '#3fbf5a', L: '#a8f59a', D: '#0d3d1d', g: '#1f7a3a' });
  const nitro = fromRows([
    '...KK...',
    '..KHHK..',
    '.KBBBBK.',
    'KBLBBBbK',
    'KBLBBBbK',
    'KWWWWWWK',
    'KBLBBBbK',
    'KBLBBBbK',
    'KBLBBBbK',
    '.KBBBBK.',
    '..KKKK..',
  ], { K: '#0c0820', H: '#c9d2e0', B: '#2f9bff', L: '#9fdcff', b: '#1b4f9e', W: '#ffffff' });
  const bagBig = fromRows(BAG_ROWS, { K: '#12081e', O: '#ff3ea5', G: '#ffc31f', L: '#fff3a0', D: '#6a3a00', g: '#b07a10' });

  // ---------- tiles ----------
  const tileCache = {};
  function tile(type, owner) {
    const key = type * 16 + owner;
    if (tileCache[key]) return tileCache[key];
    const p = teamPal(owner);
    const solid = (x, y) => {
      if (x < 0 || y < 0 || x > 15 || y > 15) return false;
      switch (type) {
        case 1: return true;
        case 2: return y + 0.5 >= 16 - (x + 0.5);
        case 3: return y + 0.5 >= x + 0.5;
        case 4: return y + 0.5 >= 16 - (x + 0.5) * 0.5;
        case 5: return y + 0.5 >= 8 - (x + 0.5) * 0.5;
        case 6: return y + 0.5 >= (x + 0.5) * 0.5;
        case 7: return y + 0.5 >= 8 + (x + 0.5) * 0.5;
      }
    };
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!solid(x, y)) continue;
        let col;
        if (!solid(x, y - 1)) col = p.hi;
        else if (!solid(x, y - 2)) col = p.main;
        else if (x === 15 || y === 15) col = p.dark;
        else if (x === 0 || !solid(x - 1, y)) col = p.main;
        else if (x === 14 || y === 14) col = p.body2;
        else col = (x + y) % 4 === 0 && y > 4 ? p.body2 : p.body;
        // neon window dots on static rooftops
        if (owner === 9 && type === 1 && y > 5 && y < 13 && x > 3 && x < 12 && x % 4 === 0 && y % 4 === 2) col = '#ffcf6a';
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    tileCache[key] = c;
    return c;
  }

  // ---------- background ----------
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const SKY = ['#160833', '#240c4a', '#3d1066', '#621676', '#8e2078', '#bb3272', '#e04c68', '#f7715a', '#ff9a52', '#ffc45c'];
  let bgCache = null;
  let skylineFar = null, skylineNear = null, palms = null;

  function buildSky(vw, vh, oy) {
    const c = document.createElement('canvas');
    c.width = vw; c.height = vh;
    const g = c.getContext('2d');
    const horizon = oy + 150;
    const top = oy - 10, bandH = (horizon - top) / SKY.length;
    const img = g.createImageData(vw, vh);
    const rgb = SKY.map((s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]);
    for (let y = 0; y < horizon; y++) {
      const f = Math.max(0, (y - top) / bandH);
      const bi = Math.min(SKY.length - 1, Math.floor(f));
      const frac = f - Math.floor(f);
      for (let x = 0; x < vw; x++) {
        const th = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        const idx = frac > 0.6 && (frac - 0.6) * 2.5 > th ? Math.min(SKY.length - 1, bi + 1) : bi;
        const col = y < top ? rgb[0] : rgb[idx];
        const o = (y * vw + x) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    }
    // ocean
    for (let y = horizon; y < vh; y++)
      for (let x = 0; x < vw; x++) {
        const d = y - horizon;
        const th = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        const col = d < 3 ? [255, 120, 110] : d < 20 && d / 20 < th ? [70, 22, 100] : [34, 12, 70];
        const o = (y * vw + x) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    // stars
    const r = World.rng(7);
    for (let i = 0; i < vw / 6; i++) {
      const y = r() * (oy + 50);
      g.fillStyle = r() < 0.2 ? '#ffd6f5' : '#8a6cc8';
      g.fillRect(Math.floor(r() * vw), Math.floor(y), 1, 1);
    }
    // sun with synthwave cuts
    const sx = Math.floor(vw / 2), sy = horizon - 34, R = 46;
    const SUN = ['#fff07a', '#ffd35a', '#ffb04e', '#ff8a4e', '#ff5f6a', '#ff3e8a'];
    for (let y = -R; y < 12; y++) {
      const yy = sy + y;
      const t = (y + R) / (R + 12);
      if (y > -14) { const gap = Math.floor((y + 14) / 6); if ((y + 14) % 6 < Math.min(4, 1 + gap * 0.7)) continue; }
      const half = Math.floor(Math.sqrt(Math.max(0, R * R - y * y)));
      g.fillStyle = SUN[Math.min(SUN.length - 1, Math.floor(t * SUN.length))];
      g.fillRect(sx - half, yy, half * 2, 1);
    }
    return { canvas: c, horizon, sx };
  }

  function buildSkyline(seed, height, colBody, colWin, colNeon, tall) {
    const W = 640;
    const c = document.createElement('canvas');
    c.width = W; c.height = height;
    const g = c.getContext('2d');
    const r = World.rng(seed);
    let x = 0;
    while (x < W) {
      const bw = 18 + Math.floor(r() * 34), bh = Math.floor(height * (0.25 + r() * (tall ? 0.75 : 0.5)));
      const top = height - bh;
      g.fillStyle = colBody;
      g.fillRect(x, top, bw, bh);
      if (r() < 0.5) { g.fillRect(x + 4, top - 4, bw - 8, 4); g.fillRect(x + bw / 2 - 1, top - 10, 2, 6); }
      if (colNeon && r() < 0.6) { g.fillStyle = r() < 0.5 ? '#ff3ea5' : '#29e0d0'; g.fillRect(x + 2, top + 3, bw - 4, 1); }
      g.fillStyle = colWin;
      for (let wy = top + 7; wy < height - 3; wy += 5)
        for (let wx = x + 3; wx < x + bw - 3; wx += 4) if (r() < 0.35) g.fillRect(wx, wy, 2, 2);
      x += bw + Math.floor(r() * 6);
    }
    return c;
  }

  function buildPalms() {
    const W = 520, H = 90;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#12082a';
    const drawPalm = (bx, h) => {
      let x = bx, y = H;
      for (let i = 0; i < h; i++) { g.fillRect(Math.round(x), y - i, 3, 1); x += Math.sin(i / h * 1.4) * 0.25; }
      const tx = Math.round(x) + 1, ty = H - h;
      const fronds = [[-1, -0.3], [1, -0.3], [-1, 0.35], [1, 0.35], [-0.5, -0.8], [0.6, -0.7], [-0.9, 0.9], [0.9, 0.9]];
      for (const [dx, dy] of fronds)
        for (let i = 0; i < 16; i++) {
          const px = tx + dx * i, py = ty + dy * i + (i * i) / 40;
          g.fillRect(Math.round(px), Math.round(py), 2, 1);
        }
    };
    drawPalm(60, 70); drawPalm(92, 52); drawPalm(300, 78); drawPalm(420, 60);
    return c;
  }

  function drawBackground(ctx, vw, vh, oy, camX, time) {
    if (!bgCache || bgCache.vw !== vw || bgCache.vh !== vh || bgCache.oy !== oy) {
      bgCache = Object.assign(buildSky(vw, vh, oy), { vw, vh, oy });
      skylineFar = buildSkyline(3, 60, '#3a1560', '#b04a9a', null, true);
      skylineNear = buildSkyline(11, 80, '#24103f', '#ffcf6a', true, false);
      palms = buildPalms();
    }
    ctx.drawImage(bgCache.canvas, 0, 0);
    const hz = bgCache.horizon;
    tileX(ctx, skylineFar, -camX * 0.08, hz - 60, vw);
    // sun reflections on water
    const sx = bgCache.sx;
    for (let i = 0; i < 9; i++) {
      const y = hz + 4 + i * 5;
      const w = Math.max(4, 40 - i * 3 + Math.sin(time * 2 + i) * 6);
      ctx.fillStyle = i < 3 ? '#ff9a52' : i < 6 ? '#e04c68' : '#8e2078';
      ctx.fillRect(Math.round(sx - w / 2 + Math.sin(time * 1.3 + i * 2) * 3), y, Math.round(w), 1);
    }
    tileX(ctx, skylineNear, -camX * 0.22, hz - 80 + 18, vw);
    ctx.fillStyle = '#1a0a36';
    ctx.fillRect(0, hz + 18, vw, 2);
    tileX(ctx, palms, -camX * 0.5, vh - 90 - Math.max(0, vh - (oy + 270)), vw);
  }

  function tileX(ctx, img, off, y, vw) {
    let x = ((Math.round(off) % img.width) + img.width) % img.width - img.width;
    for (; x < vw; x += img.width) ctx.drawImage(img, x, Math.round(y));
  }

  // ---------- police helicopter (faces right; rotors are drawn per frame) ----------
  const heli = fromRows([
    '                    KK                  ',
    '               KKKKKhhKKKK              ',
    '             KKbbbbbbbbbbbKK            ',
    'L           KbhhhhhhhhhhbbbbKK          ',
    'KK        KKbbbbbbbbbbbbbbbWWWKK        ',
    'KbK     KKbbbbbbbbbbbbbbbbbWWWWwK       ',
    'KbbKKKKKbbSSSSSSSSSSSSSSSSSbWWWwwK      ',
    'KbbbbbbbbbSSSSSSSSSSSSSSSSSbbbbbbbK     ',
    'KKKKKKKKKBBBBBBBBBBBBBBBBBBBBBBBBBK     ',
    '        KKBBBBBBBBBBBBBBBBBBBBBBBK      ',
    '          KKKKKKKKKKKKKKKKKKKKKKK       ',
    '            K          K                ',
    '         KggggggggggggggggggK           ',
  ], { K: '#0b0718', B: '#1a2350', b: '#2c3d8a', h: '#5f82e0', S: '#e8ecff', W: '#bff4ff', w: '#3aa7d0', g: '#8a90aa', L: '#ff2a3a' });

  window.Art = { TEAM, teamPal, CARS, carCanvas, wheel, tile, bag, bagBig, nitro, heli, drawBackground, fromRows };
})();
