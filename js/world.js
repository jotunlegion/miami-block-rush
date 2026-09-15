// World grid, pieces, level generation, collision queries
(function () {
  const CELL = 16, ROWS = 13, FIELD_H = CELL * ROWS;
  const SAFE_W = 480, SAFE_H = 270;

  // Cell types: 0 empty, 1 full, 2 steep up (/), 3 steep down (\),
  // 4 gentle up low, 5 gentle up high, 6 gentle down high, 7 gentle down low
  const OWNER_STATIC = 9;

  // Pieces: each has variants (tap to cycle). Shape rows top->bottom.
  const PIECES = [
    { id: 'I4', weight: 5, v: [[[1, 1, 1, 1]]] },
    { id: 'I3', weight: 5, v: [[[1, 1, 1]]] },
    { id: 'I2', weight: 3, v: [[[1, 1]]] },
    { id: 'RAMP', weight: 4, v: [[[0, 0, 4, 5], [1, 1, 1, 1]], [[6, 7, 0, 0], [1, 1, 1, 1]]] },
    { id: 'GLIDE', weight: 3, v: [[[4, 5]], [[6, 7]]] },
    { id: 'STEEP', weight: 2, v: [[[0, 2], [2, 1]], [[3, 0], [1, 3]]] },
    { id: 'LAUNCH', weight: 3, v: [[[0, 0, 2], [4, 5, 1]], [[3, 0, 0], [1, 6, 7]]] },
    { id: 'KICK', weight: 3, v: [[[0, 0, 2], [1, 1, 1]], [[3, 0, 0], [1, 1, 1]]] },
    { id: 'T', weight: 2, v: [[[1, 1, 1], [0, 1, 0]], [[0, 1, 0], [1, 1, 1]]] },
    { id: 'L', weight: 2, v: [[[1, 1, 1], [1, 0, 0]], [[1, 1, 1], [0, 0, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]]] },
  ];
  const TOTAL_W = PIECES.reduce((s, p) => s + p.weight, 0);

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomPiece(r) {
    let x = r() * TOTAL_W;
    for (let i = 0; i < PIECES.length; i++) {
      x -= PIECES[i].weight;
      if (x <= 0) return { p: i, v: 0 };
    }
    return { p: 0, v: 0 };
  }

  // cfg comes from Levels.config: field length, safety islands, trap density, tutorial layout
  function create(seed, cfg) {
    cfg = cfg || { cols: 360, islands: [0, 0], trapGap: 34, nitro: true };
    const r = rng(seed);
    const cols = cfg.cols;
    const w = {
      cols, width: cols * CELL,
      type: new Uint8Array(cols * ROWS),
      owner: new Uint8Array(cols * ROWS),
      flash: new Float32Array(cols * ROWS),
      bags: [], nitros: [], platforms: [], islands: [],
      startCol: 2,
      finishX: (cols - 24) * CELL,
      trail: new Float32Array(Math.ceil((cols * CELL) / 4)).fill(NaN),
      rand: r,
    };
    const set = (c, row, t, o = OWNER_STATIC) => {
      if (c < 0 || c >= cols || row < 0 || row >= ROWS) return;
      w.type[row * cols + c] = t;
      w.owner[row * cols + c] = o;
    };
    const bag = (c, row, value) => w.bags.push({ x: c * CELL + 8, y: row * CELL + 8, value: Math.round((value * (cfg.cash || 1)) / 10) * 10, big: value > 100, taken: false, t: r() * 6 });
    // start rooftop
    for (let c = 0; c < 22; c++) for (let row = 9; row < ROWS; row++) set(c, row, 1);
    // finish rooftop
    for (let c = cols - 30; c < cols; c++) for (let row = 9; row < ROWS; row++) set(c, row, 1);

    if (cfg.tutorial) {
      // one long rooftop split by a small chasm the player has to bridge
      const g = (w.gap = cfg.gap);
      for (let c = 22; c < cols - 30; c++) if (c < g.col || c >= g.col + g.len) for (let row = 9; row < ROWS; row++) set(c, row, 1);
      [5, 7, 9, 11].forEach((d, i) => bag(g.col + g.len + d, 8, i === 2 ? 250 : 100));
      return w;
    }

    // safety islands: long flat decks with ramps at both ends
    const [count, len] = cfg.islands || [0, 0];
    if (count) {
      const a0 = 30, a1 = cols - 40, span = (a1 - a0) / count;
      for (let i = 0; i < count; i++) {
        const c0 = Math.round(a0 + i * span + r() * Math.max(0, span - len - 4));
        const row = 8 + Math.floor(r() * 3);
        set(c0, row, 4); set(c0 + 1, row, 5);
        for (let c = c0 + 2; c < c0 + len - 2; c++) set(c, row, 1);
        set(c0 + len - 2, row, 6); set(c0 + len - 1, row, 7);
        w.islands.push({ c0, c1: c0 + len, row });
      }
    }
    // small floating neon traps, denser on later levels
    let c = 40;
    while (c < cols - 50) {
      const tl = 2 + Math.floor(r() * 3), row = 6 + Math.floor(r() * 5);
      if (!w.islands.some((s) => c + tl > s.c0 - 8 && c < s.c1 + 8)) for (let i = 0; i < tl; i++) set(c + i, row, 1);
      c += (cfg.trapGap || 34) + Math.floor(r() * 30);
    }
    // money bags
    c = 17;
    while (c < cols - 32) {
      const row = Math.max(2, Math.min(10, Math.round(3 + r() * 4 + r() * 4)));
      if (!w.type[row * cols + c]) bag(c, row, row <= 4 ? 250 : 100);
      c += 4 + Math.floor(r() * 6);
    }
    // nitro canisters
    c = 26;
    while (cfg.nitro !== false && c < cols - 36) {
      const row = 3 + Math.floor(r() * 8), x = c * CELL + 8, y = row * CELL + 8;
      if (!w.type[row * cols + c] && !w.bags.some((b) => Math.abs(b.x - x) < 24 && Math.abs(b.y - y) < 24)) w.nitros.push({ x, y, taken: false, t: r() * 6 });
      c += 9 + Math.floor(r() * 9);
    }
    return w;
  }

  function cellAt(w, c, row) {
    if (c < 0 || c >= w.cols || row < 0 || row >= ROWS) return 0;
    return w.type[row * w.cols + c];
  }

  // grid + draggable platforms
  function isSolid(w, x, y) {
    if (gridSolid(w, x, y)) return true;
    const ps = w.platforms;
    if (ps) for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + CELL) return true;
    }
    return false;
  }

  function gridSolid(w, x, y) {
    if (x < 0 || y < 0) return false;
    const c = (x / CELL) | 0, row = (y / CELL) | 0;
    if (c >= w.cols || row >= ROWS) return false;
    const t = w.type[row * w.cols + c];
    if (!t) return false;
    if (t === 1) return true;
    const lx = x - c * CELL, ly = y - row * CELL;
    switch (t) {
      case 2: return ly >= 16 - lx;
      case 3: return ly >= lx;
      case 4: return ly >= 16 - lx * 0.5;
      case 5: return ly >= 8 - lx * 0.5;
      case 6: return ly >= lx * 0.5;
      case 7: return ly >= 8 + lx * 0.5;
    }
    return false;
  }

  const DIRS = [];
  for (let i = 0; i < 16; i++) DIRS.push([Math.cos((i / 16) * Math.PI * 2), Math.sin((i / 16) * Math.PI * 2)]);

  // outward surface normal estimate around a point
  function normalAt(w, x, y, rad = 3) {
    let nx = 0, ny = 0;
    for (const [dx, dy] of DIRS) {
      if (isSolid(w, x + dx * rad, y + dy * rad)) { nx -= dx; ny -= dy; }
    }
    const l = Math.hypot(nx, ny);
    if (l < 0.01) return [0, -1];
    return [nx / l, ny / l];
  }

  // rects: [{x,y,w,h}] that pieces may not overlap; replace: may overwrite any block, map islands included
  function canPlace(w, shape, col, row, rects, replace = false) {
    for (let dy = 0; dy < shape.length; dy++)
      for (let dx = 0; dx < shape[dy].length; dx++) {
        if (!shape[dy][dx]) continue;
        const c = col + dx, rr = row + dy;
        if (c < 0 || c >= w.cols || rr < 1 || rr >= ROWS) return false;
        const i = rr * w.cols + c;
        if (w.type[i] && !replace) return false;
        const x0 = c * CELL, y0 = rr * CELL;
        for (const q of rects)
          if (x0 < q.x + q.w && x0 + CELL > q.x && y0 < q.y + q.h && y0 + CELL > q.y) return false;
      }
    return true;
  }

  function place(w, shape, col, row, owner) {
    for (let dy = 0; dy < shape.length; dy++)
      for (let dx = 0; dx < shape[dy].length; dx++) {
        const t = shape[dy][dx];
        if (!t) continue;
        const i = (row + dy) * w.cols + col + dx;
        w.type[i] = t; w.owner[i] = owner; w.flash[i] = 1;
      }
  }

  function bagRects(w) {
    return w.bags.concat(w.nitros).filter((b) => !b.taken).map((b) => ({ x: b.x - 5, y: b.y - 6, w: 10, h: 12 }));
  }

  function recordTrail(w, x, y) {
    const i = (x / 4) | 0;
    if (i >= 0 && i < w.trail.length && isNaN(w.trail[i])) w.trail[i] = y;
  }

  function trailY(w, x) {
    const i = Math.max(0, Math.min(w.trail.length - 1, (x / 4) | 0));
    let a = i, b = i;
    while (a > 0 && isNaN(w.trail[a])) a--;
    while (b < w.trail.length - 1 && isNaN(w.trail[b])) b++;
    const ya = w.trail[a], yb = w.trail[b];
    if (isNaN(ya) && isNaN(yb)) return 138;
    if (isNaN(ya)) return yb;
    if (isNaN(yb) || a === b) return ya;
    return ya + ((yb - ya) * (i - a)) / (b - a);
  }

  window.World = {
    CELL, ROWS, FIELD_H, SAFE_W, SAFE_H, OWNER_STATIC, PIECES,
    create, cellAt, isSolid, normalAt, canPlace, place, bagRects, randomPiece, rng, recordTrail, trailY,
  };
})();
