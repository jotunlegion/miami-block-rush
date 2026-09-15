// Pixel UI kit: easing, tweens, screen transitions, panels, bars, icons
(function () {
  const Ease = {
    linear: (t) => t,
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
  };

  // ---------- tweens ----------
  const tweens = [];
  function tween(obj, to, dur, ease = 'outCubic', delay = 0, done) {
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].obj === obj && Object.keys(to).some((k) => k in tweens[i].to)) tweens.splice(i, 1);
    const from = {};
    for (const k in to) from[k] = obj[k];
    tweens.push({ obj, from, to, dur, t: -delay, ease: Ease[ease] || Ease.outCubic, done });
  }

  // ---------- transitions ----------
  const tr = { active: false, t: 0, phase: 0 };
  function transition(style, onMid, label) {
    if (tr.active) return false;
    Object.assign(tr, { active: true, style, onMid, label, t: 0, phase: 0, dur: style === 'shutter' ? 0.42 : 0.3, hold: style === 'shutter' ? 0.25 : 0.05 });
    if (window.Audio8 && Audio8.sfx.whoosh) Audio8.sfx.whoosh(style);
    return true;
  }

  function update(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur), e = tw.ease(k);
      for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
    if (tr.active) {
      tr.t += dt;
      if (tr.phase === 0 && tr.t >= tr.dur) { tr.phase = 1; tr.t = 0; if (tr.onMid) tr.onMid(); }
      else if (tr.phase === 1 && tr.t >= tr.hold) { tr.phase = 2; tr.t = 0; }
      else if (tr.phase === 2 && tr.t >= tr.dur) tr.active = false;
    }
  }

  function drawTransition(ctx, vw, vh, time) {
    if (!tr.active) return;
    const k = tr.phase === 0 ? Ease.inOutCubic(Math.min(1, tr.t / tr.dur)) : tr.phase === 1 ? 1 : 1 - Ease.inOutCubic(Math.min(1, tr.t / tr.dur));
    if (tr.style === 'shutter') drawShutter(ctx, vw, vh, k, time);
    else drawSlash(ctx, vw, vh, k);
  }

  // synthwave slash wipe: dark fill led by neon stripes, slanted
  function drawSlash(ctx, vw, vh, k) {
    const slant = 0.5, span = vw + vh * slant + 40;
    const reveal = tr.phase === 2;
    const edge = reveal ? -20 + (1 - k) * span : -20 + k * span; // leading edge
    const stripes = [['#ffc31f', 3], ['#29e0d0', 6], ['#ff3ea5', 10]];
    for (let y = 0; y < vh; y++) {
      const off = Math.round((vh - y) * slant);
      const e = Math.round(edge - off);
      if (!reveal) {
        ctx.fillStyle = '#12082a'; ctx.fillRect(0, y, Math.max(0, e - 19), 1);
        let x = e - 19;
        for (let i = stripes.length - 1; i >= 0; i--) { ctx.fillStyle = stripes[i][0]; ctx.fillRect(x, y, stripes[i][1], 1); x += stripes[i][1]; }
      } else {
        const s = vw - (vw - e);
        let x = s;
        for (const [c, w] of stripes) { ctx.fillStyle = c; ctx.fillRect(x, y, w, 1); x += w; }
        ctx.fillStyle = '#12082a'; ctx.fillRect(x, y, vw - x, 1);
      }
    }
  }

  // roll-up garage door with hazard strip and neon label
  function drawShutter(ctx, vw, vh, k, time) {
    const hgt = Math.round(k * (vh + 8));
    for (let y = 0; y < hgt - 8; y++) {
      const slat = (y + (vh - hgt)) % 8;
      ctx.fillStyle = slat === 0 ? '#6d6690' : slat === 1 ? '#4c4668' : slat === 7 ? '#1c182c' : (slat & 1 ? '#3a3552' : '#35304c');
      ctx.fillRect(0, y, vw, 1);
    }
    if (hgt > 8) {
      for (let x = 0; x < vw; x += 8) { ctx.fillStyle = (x / 8) % 2 ? '#12082a' : '#ffc31f'; ctx.fillRect(x, hgt - 8, 8, 5); }
      ctx.fillStyle = '#0c0818'; ctx.fillRect(0, hgt - 3, vw, 3);
      ctx.fillStyle = '#9a93b8'; ctx.fillRect(Math.floor(vw / 2) - 10, hgt - 14, 20, 3);
    }
    if (tr.label && k > 0.85) {
      const cy = Math.floor(vh / 2) - 8;
      const flick = Math.floor(time * 14) % 9 !== 0;
      if (flick) Font.draw(ctx, tr.label, vw / 2, cy, '#ff3ea5', 2, 'center', '#29e0d0');
    }
  }

  // ---------- panels / bars ----------
  function panel(ctx, x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y);
    const fill = o.fill || '#12082ae6', border = o.border || '#3d2f7a';
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
    if (o.accent) { ctx.fillStyle = o.accent; ctx.fillRect(x + 2, y, Math.min(w - 4, o.accentW || 18), 1); ctx.fillRect(x, y + 2, 1, Math.min(h - 4, 8)); }
    if (o.shine !== false) { ctx.fillStyle = '#ffffff14'; ctx.fillRect(x + 2, y + 1, w - 4, 1); }
  }

  function bar(ctx, x, y, w, v, preview, color) {
    const segs = Math.floor((w + 1) / 4);
    const n = Math.round(v * segs), p = preview == null ? n : Math.round(preview * segs);
    for (let i = 0; i < segs; i++) {
      let c = '#2a1d4a';
      if (i < Math.min(n, p)) c = color;
      else if (i < p) c = Math.floor(performance.now() / 180) % 2 ? '#6aff5a' : '#3fbf5a';
      else if (i < n) c = '#ff2a3a';
      ctx.fillStyle = c;
      ctx.fillRect(x + i * 4, y, 3, 4);
    }
  }

  const money = (n) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ---------- 12x12 icons ----------
  const ICONS = {
    flag: ['#...........', '#########...', '#.##.##.##..', '###.##.##.#.', '#.##.##.##..', '###.##.##.#.', '#########...', '#...........', '#...........', '#...........', '##..........', '###.........'],
    wrench: ['.......##...', '......#..#..', '......#...#.', '.......#..#.', '......#..#..', '.....#..#...', '....#..#....', '...#..#.....', '..#..#......', '.#..#.......', '#..#........', '.##.........'],
    spray: ['...###......', '...#.#..#.#.', '..#####.....', '..#...#.#.#.', '.#######....', '.#.....#..#.', '.#.###.#....', '.#.###.#....', '.#.###.#....', '.#.....#....', '.#######....', '............'],
    key: ['............', '..####......', '.#....#.....', '#..##..#....', '#..##..#....', '.#....######', '..####...#.#', '.........#.#', '............', '............', '............', '............'],
    garage: ['.....##.....', '...##..##...', '.##......##.', '############', '#..........#', '#.########.#', '#..........#', '#.########.#', '#..........#', '#.########.#', '#..........#', '############'],
    engine: ['...####.....', '....##......', '.#########..', '.#.......#.#', '##.#####.###', '#..#...#...#', '#..#####...#', '##.......###', '.#.......#.#', '.#########..', '............', '............'],
    turbo: ['....####....', '..##....##..', '.#..####..#.', '#..#....#..#', '#.#..##..#.#', '#.#.#..#.#.#', '#.#..#.#.#.#', '#..#...#.#..', '.#..###..#..', '..##....#...', '....####....', '............'],
    gear: ['.....##.....', '..#.####.#..', '.##########.', '..###..###..', '.###....###.', '####....####', '####....####', '.###....###.', '..###..###..', '.##########.', '..#.####.#..', '.....##.....'],
    tire: ['...######...', '..#......#..', '.#.######.#.', '#.#......#.#', '#.#.####.#.#', '#.#.#..#.#.#', '#.#.#..#.#.#', '#.#.####.#.#', '#.#......#.#', '.#.######.#.', '..#......#..', '...######...'],
    spring: ['.##########.', '...#........', '..########..', '........#...', '..########..', '...#........', '..########..', '........#...', '..########..', '...#........', '.##########.', '............'],
    shield: ['############', '#..........#', '#.########.#', '#.#......#.#', '#.#.####.#.#', '#.#.#..#.#.#', '.#.#.##.#.#.', '.#..#..#..#.', '..#..##..#..', '...#....#...', '....#..#....', '.....##.....'],
    bolt: ['.......###..', '......###...', '.....###....', '....###.....', '...#######..', '......###...', '.....###....', '....###.....', '...##.......', '..##........', '.#..........', '............'],
    spoiler: ['############', '#..........#', '############', '..#......#..', '..#......#..', '.##......##.', '############', '#..........#', '#..........#', '############', '............', '............'],
    bumper: ['......######', '....##.....#', '...#.......#', '..#........#', '.#...####..#', '#....#..#..#', '#....####..#', '#..........#', '############', '.##########.', '............', '............'],
    skirt: ['............', '.##########.', '#..........#', '#.##....##.#', '############', '.##..##..##.', '#..##..##..#', '############', '............', '............', '............', '............'],
    rim: ['...######...', '..#......#..', '.#...##...#.', '#...#..#...#', '#.##.##.##.#', '#.#.#..#.#.#', '#.#.#..#.#.#', '#.##.##.##.#', '#...#..#...#', '.#...##...#.', '..#......#..', '...######...'],
    glow: ['....####....', '...#....#...', '..#......#..', '..#......#..', '...#....#...', '....####....', '....#..#....', '....####....', '............', '#.#.#..#.#.#', '.#.#.##.#.#.', '#.#.#..#.#.#'],
    back: ['............', '....#.......', '...##.......', '..#########.', '.##########.', '..#########.', '...##.......', '....#.......', '............', '............', '............', '............'],
    check: ['...........#', '..........##', '.........##.', '........##..', '#......##...', '##....##....', '.##..##.....', '..####......', '...##.......', '............', '............', '............'],
    crown: ['............', '#....##....#', '##..####..##', '###.####.###', '############', '############', '#.##.##.##.#', '############', '############', '............', '############', '............'],
    lock: ['....####....', '...#....#...', '...#....#...', '..########..', '..#......#..', '..#..##..#..', '..#..##..#..', '..#......#..', '..########..', '............', '............', '............'],
    car: ['............', '....#####...', '...#.#..##..', '..#..#...##.', '############', '#..........#', '#.##....##.#', '############', '.#..#..#..#.', '..##....##..', '............', '............'],
    arrowL: ['......##....', '.....###....', '....###.....', '...###......', '..###.......', '..###.......', '...###......', '....###.....', '.....###....', '......##....', '............', '............'],
    play: ['............', '..##........', '..####......', '..######....', '..########..', '..#########.', '..#########.', '..########..', '..######....', '..####......', '..##........', '............'],
    pause: ['............', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '............'],
    next: ['............', '#...#....##.', '##..##...##.', '###.###..##.', '#######..##.', '########.##.', '########.##.', '#######..##.', '###.###..##.', '##..##...##.', '#...#....##.', '............'],
    prev: ['............', '.##....#...#', '.##...##..##', '.##..###.###', '.##..#######', '.##.########', '.##.########', '.##..#######', '.##..###.###', '.##...##..##', '.##....#...#', '............'],
    note: ['.....######.', '.....######.', '.....#....#.', '.....#....#.', '.....#....#.', '.....#....#.', '..###...###.', '.####..####.', '.####..####.', '..##....##..', '............', '............'],
    arrowR: ['....##......', '....###.....', '.....###....', '......###...', '.......###..', '.......###..', '......###...', '.....###....', '....###.....', '....##......', '............', '............'],
  };
  const iconCache = {};
  function icon(ctx, name, x, y, color, scale = 1) {
    const k = name + color;
    if (!iconCache[k]) {
      const rows = ICONS[name] || ICONS.car;
      const c = document.createElement('canvas');
      c.width = 12; c.height = 12;
      const g = c.getContext('2d');
      g.fillStyle = color;
      rows.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) if (r[xx] === '#') g.fillRect(xx, yy, 1, 1); });
      iconCache[k] = c;
    }
    ctx.drawImage(iconCache[k], Math.round(x), Math.round(y), 12 * scale, 12 * scale);
  }

  // parallelogram plate (NFS-style slanted panel)
  function slant(ctx, x, y, w, h, fill, border, skew = 6) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < h; r++) {
      const off = Math.round(((h - 1 - r) * skew) / h);
      ctx.fillStyle = fill; ctx.fillRect(x + off, y + r, w - skew, 1);
      if (border) { ctx.fillStyle = border; ctx.fillRect(x + off, y + r, 1, 1); ctx.fillRect(x + off + w - skew - 1, y + r, 1, 1); }
    }
    if (border) { ctx.fillStyle = border; ctx.fillRect(x + skew, y, w - skew, 1); ctx.fillRect(x, y + h - 1, w - skew, 1); }
    ctx.fillStyle = '#ffffff14'; ctx.fillRect(x + skew + 1, y + 1, w - skew - 2, 1);
  }

  window.UI = { Ease, tween, transition, update, drawTransition, panel, bar, money, icon, slant, get transitioning() { return tr.active; } };
})();
