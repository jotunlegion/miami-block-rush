// NFS-style front end: 3D voxel turntable, icon carousels, part lists, fly-to camera, car lot
(function () {
  const U = Catalog.UPGRADES, P = Catalog.PARTS, HW = Voxel3D.HW;
  const MENU = [
    { id: 'race', name: 'ГОНКА', icon: 'flag', get hint() { const L = Levels.config(Profile.data ? Profile.data.level : 1); return 'РІВЕНЬ ' + L.n + ': ' + L.name; } },
    { id: 'lot', name: 'АВТОСАЛОН', icon: 'key', hint: '20 ЛЕГЕНД 80-Х - 2000-Х' },
    { id: 'perf', name: 'ТЮНІНГ', icon: 'engine', hint: 'ДВИГУН, ТУРБО, ШИНИ, ПІДВІСКА' },
    { id: 'visual', name: 'ВІЗУАЛ', icon: 'spray', hint: 'ОБВІС, ФАРБА, ВІНІЛИ, НЕОН' },
    { id: 'mycars', name: 'МОЇ АВТО', icon: 'garage', hint: 'ПЕРЕСІСТИ НА ІНШУ ТАЧКУ' },
    { id: 'jukebox', name: 'ПЛЕЄР', icon: 'note', hint: 'РАДІО МАЯМІ: ТРЕКИ МЕНЮ І ГОНОК' },
  ];
  const VISUAL = [
    { id: 'spoiler', name: 'СПОЙЛЕР', icon: 'spoiler', cam: 'spoiler' },
    { id: 'bumper', name: 'БАМПЕР', icon: 'bumper', cam: 'bumper' },
    { id: 'skirt', name: 'ПОРОГИ', icon: 'skirt', cam: 'skirt' },
    { id: 'rims', name: 'ДИСКИ', icon: 'rim', cam: 'rims' },
    { id: 'paint', name: 'ФАРБА', icon: 'spray', cam: 'paint' },
    { id: 'vinyl', name: 'ВІНІЛ', icon: 'bolt', cam: 'vinyl' },
    { id: 'accent', name: 'АКЦЕНТ', icon: 'spray', cam: 'vinyl' },
    { id: 'glow', name: 'НЕОН', icon: 'glow', cam: 'glow' },
  ];
  const PERF_CAM = { engine: 'engine', turbo: 'engine', gearbox: 'gearbox', tires: 'rims', suspension: 'suspension', chassis: 'chassis' };
  const ERAS = [['start', 'СТАРТ'], [80, '80-ТІ'], [90, '90-ТІ'], [2000, '2000-НІ']];
  const STARTER_BUDGET = 5000;
  const STAT_NAMES = ['ШВИДКІСТЬ', 'РОЗГІН', 'ПОЛІТ', 'МІЦНІСТЬ'];
  const PAINT_PRICE = 300, ACCENT_PRICE = 150, ROW_H = 17, ROWS = 7;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const TAU = Math.PI * 2;

  const S = {
    screen: 'hub', t: 0,
    cam: { yaw: 0.6, pitch: 0.3, zoom: 4, fx: 0, fy: -1, fz: 0, cx: 240, cy: 126 },
    auto: true, hold: 0, orbit: null,
    menu: { sel: 0, f: 0 }, cat: { sel: 0, f: 0 }, item: 0, scroll: 0,
    previewCu: null, previewUp: null,
    list: [], idx: 0, era: 'start', slide: { x: 0 }, sliding: false, confirm: false,
    enter: { k: 1 }, flash: { a: 0 }, bump: { v: 0 }, cash: { v: 0 }, dim: { a: 0 }, lights: { v: 0 },
    parts: [], toast: null,
  };
  let E = null, ctx = null;

  const gang = () => Profile.data.gang || 0;
  const accent = () => Art.TEAM[gang()].main;
  const accentHi = () => Art.TEAM[gang()].hi;
  const inLot = () => S.screen === 'lot' || S.screen === 'mycars';
  const curId = () => (inLot() ? S.list[S.idx] : Profile.data.current);
  const entry = () => Profile.entry(Profile.data.current);
  function curCu() {
    const id = curId(), e = Profile.entry(id);
    if (S.screen === 'visual' && S.previewCu) return S.previewCu;
    return e ? e.cu : Custom.defaults(Catalog.byId[id]);
  }
  const curMap = () => Custom.build(Catalog.byId[curId()], curCu());

  // ---------- camera ----------
  function preset(name, map) {
    const bw = map ? map.bw : 34, bh = map ? map.bh : 11, wx = map ? map.wheelX : [-10, 10], wy = map ? map.wheelY : 4;
    switch (name) {
      case 'spoiler': return { yaw: -0.7, pitch: 0.42, zoom: 5, fx: -bw / 2 + 4, fy: -bh / 2 + 1, fz: 0 };
      case 'bumper': return { yaw: 0.8, pitch: 0.22, zoom: 5, fx: bw / 2 - 3, fy: bh / 2 - 3, fz: 0 };
      case 'skirt': return { yaw: 0.14, pitch: 0.14, zoom: 4.6, fx: 0, fy: bh / 2 - 1, fz: -HW };
      case 'rims': return { yaw: 0.32, pitch: 0.14, zoom: 5.2, fx: wx[1], fy: wy, fz: -HW };
      case 'suspension': return { yaw: -0.38, pitch: 0.16, zoom: 5, fx: wx[0], fy: wy - 1, fz: -HW };
      case 'paint': return { yaw: 0.62, pitch: 0.3, zoom: 4.2, fx: 0, fy: -1, fz: 0 };
      case 'vinyl': return { yaw: 0.06, pitch: 0.16, zoom: 4.4, fx: 0, fy: 0, fz: -HW };
      case 'glow': return { yaw: 0.55, pitch: 0.07, zoom: 4.2, fx: 0, fy: bh / 2 + 2, fz: 0 };
      case 'engine': return { yaw: 0.9, pitch: 0.5, zoom: 5, fx: bw / 2 - 8, fy: -2, fz: 0 };
      case 'gearbox': return { yaw: 0.08, pitch: 0.08, zoom: 4.6, fx: -2, fy: bh / 2, fz: -HW };
      case 'chassis': return { yaw: -0.55, pitch: 0.36, zoom: 4, fx: 0, fy: 0, fz: 0 };
      default: return { pitch: 0.3, zoom: 4, fx: 0, fy: -1, fz: 0 };
    }
  }
  function flyTo(name, view) {
    const p = Object.assign(preset(name, curId() ? curMap() : null), view || {});
    p.fx *= 0.55; p.fy *= 0.7; p.fz *= 0.5;
    if (p.yaw != null) {
      let target = p.yaw;
      const cur = S.cam.yaw;
      while (target - cur > Math.PI) target -= TAU;
      while (target - cur < -Math.PI) target += TAU;
      p.yaw = target;
      S.auto = false;
    } else S.auto = true;
    UI.tween(S.cam, p, 0.8, 'inOutCubic');
  }
  const camOpts = (dx = 0) => ({ cx: Math.round(S.cam.cx + E.ox + dx), cy: Math.round(S.cam.cy + E.oy), zoom: S.cam.zoom, yaw: S.cam.yaw, pitch: S.cam.pitch, fx: S.cam.fx, fy: S.cam.fy, fz: S.cam.fz });

  // ---------- navigation ----------
  function setup(screen) {
    S.screen = screen;
    S.enter.k = 0;
    UI.tween(S.enter, { k: 1 }, 0.7, 'outCubic', 0.05);
    S.previewCu = null; S.previewUp = null; S.confirm = false; S.slide.x = 0; S.toast = null; S.item = 0; S.scroll = 0;
    S.cat.sel = 0; S.cat.f = 0;
    UI.tween(S.dim, { a: 0 }, 0.3);
    if (screen === 'hub') { if (!Profile.data.current) S.menu.sel = 1; S.cam.cx = 240; S.cam.cy = 126; S.cam.zoom = 2.6; flyTo('full'); S.menu.f = S.menu.sel; }
    if (screen === 'visual') { UI.tween(S.cam, { cx: 168, cy: 116 }, 0.6, 'inOutCubic'); pickVisualCat(0); }
    if (screen === 'perf') { UI.tween(S.cam, { cx: 232, cy: 124 }, 0.6, 'inOutCubic'); pickPerfCat(0); }
    if (screen === 'lot') { S.cam.cx = 240; S.cam.cy = 112; setEra(S.era, true); flyTo('full', { zoom: 5 }); }
    if (screen === 'jukebox' && window.Music) {
      S.item = Math.max(0, Music.tracks.indexOf(Music.current()));
      S.scroll = Math.max(0, Math.min(S.item - 2, Music.tracks.length - 6));
    }
    if (screen === 'mycars') {
      S.cam.cx = 240; S.cam.cy = 112;
      S.list = Catalog.ALL.filter((c) => Profile.owned(c.id)).map((c) => c.id);
      S.idx = Math.max(0, S.list.indexOf(Profile.data.current));
      flyTo('full', { zoom: 5 });
    }
  }
  const go = (screen) => UI.transition('slash', () => setup(screen));

  function enter(screen, opts = {}) {
    setup(screen);
    S.cash.v = Profile.cash;
    if (screen === 'hub' && !Profile.data.current) S.toast = { text: 'ОБЕРИ ПЕРШУ ТАЧКУ', color: '#ffc31f', t: 3 };
    if (opts.earned != null) {
      S.cash.v = Profile.cash - opts.earned;
      UI.tween(S.cash, { v: Profile.cash }, 1.6, 'outCubic', 0.6);
      S.toast = { text: opts.earned > 0 ? '+' + UI.money(opts.earned) : 'БЕЗ ЗАРОБІТКУ', color: opts.earned > 0 ? '#9bf08a' : '#ff5c7a', t: 2.6 };
    }
  }

  function activateMenu(i) {
    const m = MENU[i];
    if (!Profile.data.current && m.id !== 'lot' && m.id !== 'jukebox') { Audio8.sfx.invalid(); toast('СПЕРШУ КУПИ АВТО', '#ff5c7a'); return; }
    Audio8.sfx.click();
    if (m.id === 'race') UI.transition('shutter', () => S.onRace && S.onRace(), 'ГОНКА!');
    else go(m.id);
  }

  function pickVisualCat(i) {
    S.cat.sel = i; UI.tween(S.cat, { f: i }, 0.35, 'outCubic');
    S.previewCu = null; S.scroll = 0;
    const rows = visualRows(VISUAL[i]);
    S.item = Math.max(0, rows.findIndex((r) => r.installed));
    ensureVisible();
    flyTo(VISUAL[i].cam);
    UI.tween(S.dim, { a: VISUAL[i].id === 'glow' ? 0.6 : 0 }, 0.5);
  }
  function pickPerfCat(i) {
    S.cat.sel = i; UI.tween(S.cat, { f: i }, 0.35, 'outCubic');
    S.previewUp = null; S.scroll = 0;
    S.item = entry().up[U[i].id];
    flyTo(PERF_CAM[U[i].id]);
  }
  function ensureVisible() {
    if (S.item < S.scroll) S.scroll = S.item;
    if (S.item >= S.scroll + ROWS) S.scroll = S.item - ROWS + 1;
  }

  function setEra(era, instant) {
    S.era = era;
    S.list = (era === 'start' ? Catalog.ALL.filter((c) => c.price <= STARTER_BUDGET).sort((a, b) => a.price - b.price) : Catalog.SHOP.filter((c) => c.era === era)).map((c) => c.id);
    S.idx = 0; S.confirm = false;
    if (!instant) driveIn();
  }

  function driveIn() {
    S.sliding = true; S.auto = false;
    S.slide.x = -420;
    UI.tween(S.cam, { yaw: Math.round(S.cam.yaw / TAU) * TAU + 0.35 }, 0.25, 'outCubic');
    UI.tween(S.slide, { x: 0 }, 0.8, 'outQuint', 0.05, () => { S.sliding = false; S.auto = true; dust(); });
  }
  function shift(dir) {
    if (S.sliding || S.list.length < 2) return;
    S.sliding = true; S.confirm = false; S.auto = false;
    Audio8.sfx.whoosh('slash');
    UI.tween(S.cam, { yaw: Math.round(S.cam.yaw / TAU) * TAU + 0.35 }, 0.2, 'outCubic');
    UI.tween(S.slide, { x: 460 }, 0.35, 'inCubic', 0, () => {
      S.idx = (S.idx + dir + S.list.length) % S.list.length;
      driveIn();
    });
  }

  // ---------- effects ----------
  function spark(x, y, n, colors, spd = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = spd * (0.3 + Math.random());
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, c: colors[(Math.random() * colors.length) | 0], life: 0.5 + Math.random() * 0.6, g: 160, s: 1 });
    }
  }
  function confetti() {
    const cols = ['#ff3ea5', '#29e0d0', '#ffc31f', '#ffffff', '#9d8cff'];
    for (let i = 0; i < 110; i++) S.parts.push({ x: E.ox + 240 + (Math.random() - 0.5) * 360, y: E.oy - 10 - Math.random() * 80, vx: (Math.random() - 0.5) * 40, vy: 30 + Math.random() * 60, c: cols[i % 5], life: 2.8, g: 20, sway: Math.random() * 6, s: 2 });
  }
  function dust() {
    const o = camOpts();
    for (let i = 0; i < 26; i++) S.parts.push({ x: o.cx + (Math.random() - 0.5) * 160, y: o.cy + 34 + Math.random() * 6, vx: (Math.random() - 0.5) * 70, vy: -8 - Math.random() * 18, c: '#6a5a88', life: 0.5 + Math.random() * 0.4, g: 10, s: 1 });
  }
  const toast = (text, color = '#ffffff') => (S.toast = { text, color, t: 1.8 });
  function installFx(focusName) {
    const map = curMap(), p = preset(focusName, map), o = camOpts();
    const [sx, sy] = Voxel3D.project(o, p.fx, p.fy, p.fz);
    spark(sx, sy, 46, ['#ffc31f', '#fff3a0', accentHi(), '#ffffff'], 150);
    UI.tween(S.bump, { v: -1.6 }, 0.1, 'outCubic', 0, () => UI.tween(S.bump, { v: 0 }, 0.5, 'outBack'));
    S.flash.a = 0.8; UI.tween(S.flash, { a: 0 }, 0.45);
    S.lights.v = 1; UI.tween(S.lights, { v: 0 }, 0.9);
  }

  // ---------- update ----------
  function update(dt) {
    S.t += dt;
    if (S.orbit) S.hold = 2.5;
    else if (S.hold > 0) { S.hold -= dt; if (S.hold <= 0 && (S.screen === 'hub' || inLot())) S.auto = true; }
    if (S.auto && !S.orbit && !S.sliding) S.cam.yaw += dt * 0.38;
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i];
      p.life -= dt; p.vy += p.g * dt; p.x += (p.vx + (p.sway ? Math.sin(S.t * 4 + p.sway) * 20 : 0)) * dt; p.y += p.vy * dt;
      if (p.life <= 0) S.parts.splice(i, 1);
    }
    if (S.toast && (S.toast.t -= dt) <= 0) S.toast = null;
  }

  // ---------- scene (pixel-art garage / showroom backdrops) ----------
  let bgKey = '', bgCanvas = null;
  function buildBg(showroom) {
    const { vw, vh, ox, oy } = E;
    const c = document.createElement('canvas');
    c.width = vw; c.height = vh;
    const g = c.getContext('2d');
    const floorY = oy + 172;
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    const wallA = showroom ? [46, 20, 84] : [36, 19, 58], wallB = showroom ? [28, 12, 52] : [20, 11, 36];
    const img = g.createImageData(vw, vh);
    for (let y = 0; y < vh; y++) {
      const f = Math.min(1, Math.max(0, (y - oy) / 170));
      for (let x = 0; x < vw; x++) {
        const edge = Math.min(1, Math.abs(x - vw / 2) / (vw / 2));
        const th = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        const col = f * 0.8 + edge * edge * 0.55 > th + 0.25 ? wallB : wallA;
        const o = (y * vw + x) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    if (!showroom) {
      for (let y = 0; y < floorY - 4; y++) {
        const off = Math.floor(y / 6) % 2 ? 7 : 0;
        for (let x = 0; x < vw; x++) {
          if (y % 6 === 0 || (x + off) % 14 === 0) px(x, y, '#140a22');
          else if (y % 6 === 1 && (x + off) % 14 === 1) px(x, y, '#35214f');
        }
      }
      const dx0 = ox + 160, dx1 = ox + 320, dy0 = oy + 40, open = oy + 120;
      g.fillStyle = '#0a0614'; g.fillRect(dx0 - 4, dy0 - 4, dx1 - dx0 + 8, floorY - dy0 + 4);
      const sky = ['#3d1066', '#621676', '#8e2078', '#bb3272', '#e04c68', '#f7715a', '#ff9a52', '#ffc45c'];
      for (let y = open; y < floorY - 4; y++) { g.fillStyle = sky[Math.min(7, Math.floor(((y - open) / (floorY - 4 - open)) * 8))]; g.fillRect(dx0, y, dx1 - dx0, 1); }
      g.fillStyle = '#ffe27a';
      for (let y = 0; y < 10; y++) { const w = Math.floor(Math.sqrt(100 - (10 - y) * (10 - y)) * 1.8); g.fillRect(Math.floor((dx0 + dx1) / 2) - w, floorY - 16 + y, w * 2, 1); }
      g.fillStyle = '#1a0a36';
      for (let x = dx0; x < dx1; x++) { const h = 6 + ((x * 13) % 7) + ((x % 23) < 6 ? 9 : 0); g.fillRect(x, floorY - 4 - h, 1, h); }
      for (let y = dy0; y < open; y++) { const s = (y - dy0) % 7; g.fillStyle = s === 0 ? '#5c5680' : s === 6 ? '#16122a' : s & 1 ? '#34304c' : '#2e2a44'; g.fillRect(dx0, y, dx1 - dx0, 1); }
      g.fillStyle = '#ffc31f'; for (let x = dx0; x < dx1; x += 10) g.fillRect(x, open - 3, 5, 3);
      for (let i = 0; i < 4; i++) {
        const tx = ox + 20, ty = floorY - 12 - i * 11;
        g.fillStyle = '#0e0a18'; g.fillRect(tx, ty, 30, 10); g.fillRect(tx - 1, ty + 1, 32, 8);
        g.fillStyle = '#2a2238'; g.fillRect(tx + 1, ty + 1, 28, 2);
        g.fillStyle = '#4a4260'; g.fillRect(tx + 11, ty + 4, 8, 2);
      }
      const cx0 = ox + 62, cy0 = floorY - 46;
      g.fillStyle = '#5a1420'; g.fillRect(cx0, cy0, 40, 46);
      g.fillStyle = '#a82a3a'; g.fillRect(cx0 + 1, cy0 + 1, 38, 44);
      for (let i = 0; i < 5; i++) { g.fillStyle = '#5a1420'; g.fillRect(cx0 + 1, cy0 + 8 + i * 8, 38, 1); g.fillStyle = '#e6ecf5'; g.fillRect(cx0 + 16, cy0 + 4 + i * 8, 8, 1); }
      const sx0 = ox + 384, canCols = ['#29e0d0', '#ff3ea5', '#ffc31f', '#6aff5a', '#9d8cff'];
      g.fillStyle = '#3a2a4a'; g.fillRect(sx0, oy + 104, 80, 3); g.fillRect(sx0, oy + 134, 80, 3);
      for (let i = 0; i < 7; i++) { g.fillStyle = canCols[i % 5]; g.fillRect(sx0 + 4 + i * 11, oy + 94, 7, 10); g.fillStyle = '#ffffff55'; g.fillRect(sx0 + 5 + i * 11, oy + 95, 1, 8); }
      for (let i = 0; i < 5; i++) { g.fillStyle = '#2a2238'; g.fillRect(sx0 + 6 + i * 15, oy + 122, 11, 12); g.fillStyle = canCols[(i + 2) % 5]; g.fillRect(sx0 + 6 + i * 15, oy + 126, 11, 3); }
    } else {
      for (let i = 0; i < 5; i++) {
        const wx = ox - 60 + i * 130, wy = oy + 14, ww = 110, wh = floorY - wy - 10;
        g.fillStyle = '#120a2e'; g.fillRect(wx, wy, ww, wh);
        for (let x = wx; x < wx + ww; x++) {
          const h = 20 + ((x * 7) % 31) + ((x >> 3) % 3) * 14;
          g.fillStyle = '#1e1446'; g.fillRect(x, wy + wh - h, 1, h);
          if ((x * 13) % 5 === 0) for (let y = wy + wh - h + 3; y < wy + wh - 2; y += 4) if ((x + y) % 3) px(x, y, '#ffcf6a');
        }
        g.fillStyle = '#3d2f7a'; g.fillRect(wx, wy, ww, 2); g.fillRect(wx, wy, 2, wh); g.fillRect(wx + ww - 2, wy, 2, wh);
        g.fillStyle = '#ffffff10'; for (let k = 0; k < 18; k++) g.fillRect(wx + 10 + k * 2, wy + 4 + k * 3, 3, 1);
      }
    }
    g.fillStyle = showroom ? '#3d2f7a' : '#2a1d4a'; g.fillRect(0, floorY - 4, vw, 1);
    g.fillStyle = '#0a0614'; g.fillRect(0, floorY - 3, vw, 3);
    for (let y = floorY; y < vh; y++) { g.fillStyle = showroom ? (y % 2 ? '#1e1238' : '#221440') : '#0e0818'; g.fillRect(0, y, vw, 1); }
    const vpY = floorY - 140;
    g.fillStyle = showroom ? '#34225a' : '#1a1030';
    for (let i = -24; i <= 24; i++) for (let y = floorY; y < vh; y++) { const x = Math.round(vw / 2 + i * 22 * ((y - vpY) / (floorY - vpY))); if (x >= 0 && x < vw) g.fillRect(x, y, 1, 1); }
    let gap = 3;
    for (let y = floorY + 2; y < vh; y += gap, gap += 2) g.fillRect(0, y, vw, 1);
    for (const lx of showroom ? [ox + 90, ox + 240, ox + 390] : [ox + 110, ox + 240, ox + 370]) {
      for (let y = oy + 26; y < floorY; y++) {
        const f = (y - oy - 26) / (floorY - oy - 26), half = 6 + f * 52;
        for (let x = Math.floor(lx - half); x <= lx + half; x++) {
          const dens = (1 - Math.abs(x - lx) / half) * (1 - f * 0.6) * (showroom ? 0.28 : 0.2);
          if (dens > BAYER[(y & 3) * 4 + (x & 3)] / 16 + 0.04) px(x, y, showroom ? '#6a4aa8' : '#4a3a5e');
        }
      }
      g.fillStyle = '#0a0614'; g.fillRect(lx, 0, 1, oy + 20);
      g.fillStyle = '#3a3552'; g.fillRect(lx - 6, oy + 20, 13, 4); g.fillRect(lx - 4, oy + 18, 9, 2);
      g.fillStyle = '#fff3c0'; g.fillRect(lx - 3, oy + 24, 7, 1);
    }
    return c;
  }

  function drawBg(showroom) {
    const key = [E.vw, E.vh, E.oy, showroom].join(',');
    if (key !== bgKey) { bgCanvas = buildBg(showroom); bgKey = key; }
    ctx.drawImage(bgCanvas, 0, 0);
    if (!showroom && S.screen === 'hub') {
      const pal = Art.TEAM[gang()], label = GANGS[gang()].name;
      if (Math.floor(E.time * 12) % 37 !== 0) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) Font.draw(ctx, label, E.ox + 258 + dx, E.oy + 36 + dy, pal.dark, 2, 'center', null);
        Font.draw(ctx, label, E.ox + 258, E.oy + 36, pal.hi, 2, 'center', null);
      }
    }
  }

  function drawStage(map, dx = 0) {
    const o = camOpts(dx);
    if (S.cam.zoom < 5.6) {
      const R = map.bw / 2 + 6, fy = map.wheelY + 3.6;
      for (let a = 0; a < 90; a++) {
        const an = (a / 90) * TAU;
        const [x, y] = Voxel3D.project(o, Math.cos(an) * R, fy, Math.sin(an) * R * 0.7);
        ctx.fillStyle = '#0a0614'; ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
      for (let i = 0; i < 16; i++) {
        const an = (i / 16) * TAU;
        const [x, y] = Voxel3D.project(o, Math.cos(an) * R, fy, Math.sin(an) * R * 0.7);
        ctx.fillStyle = (i + Math.floor(S.t * 6)) % 4 === 0 ? '#ffffff' : accentHi();
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    if (S.dim.a > 0) { ctx.globalAlpha = S.dim.a; ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, E.vw, E.vh); ctx.globalAlpha = 1; }
    Voxel3D.render(ctx, map, Object.assign(o, { spin: S.slide.x / 3, glow: map.glow, glowK: 0.55 + Math.sin(S.t * 5) * 0.2 + S.dim.a * 0.3, bob: S.bump.v, lights: S.lights.v }));
  }

  function speedLines() {
    const v = Math.abs(S.slide.x - (S.prevSlide || 0));
    S.prevSlide = S.slide.x;
    if (v < 2) return;
    for (let i = 0; i < Math.min(30, v); i++) {
      const y = E.oy + 60 + ((i * 37 + Math.floor(S.t * 90) * 13) % 110), x = (i * 71 + Math.floor(S.t * 400)) % E.vw;
      ctx.fillStyle = i % 3 ? '#ffffff38' : accent() + '70';
      ctx.fillRect(x, y, Math.min(90, v * 4), 1);
    }
  }

  // ---------- widgets ----------
  function slant(x, y, w, h, fill, border, skew = 6) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < h; r++) {
      const off = Math.round(((h - 1 - r) * skew) / h);
      ctx.fillStyle = fill; ctx.fillRect(x + off, y + r, w - skew, 1);
      if (border) { ctx.fillStyle = border; ctx.fillRect(x + off, y + r, 1, 1); ctx.fillRect(x + off + w - skew - 1, y + r, 1, 1); }
    }
    if (border) { ctx.fillStyle = border; ctx.fillRect(x + skew, y, w - skew, 1); ctx.fillRect(x, y + h - 1, w - skew, 1); }
    ctx.fillStyle = '#ffffff14'; ctx.fillRect(x + skew + 1, y + 1, w - skew - 2, 1);
  }

  function topBar(title, icon) {
    const k = UI.Ease.outCubic(S.enter.k), y = Math.round(-34 * (1 - k));
    let tx = 4;
    if (S.screen !== 'hub') {
      slant(4, 5 + y, 30, 22, '#12082af0', '#ffffff');
      UI.icon(ctx, 'back', 13, 10 + y, '#ffffff');
      E.button(0, 0, 36, 30, () => { Audio8.sfx.click(); go('hub'); });
      tx = 38;
    }
    slant(tx, 5 + y, 22 + Font.measure(title, 2) + 16, 22, '#12082af0', accent());
    UI.icon(ctx, icon, tx + 9, 10 + y, accentHi());
    Font.draw(ctx, title, tx + 26, 9 + y, '#ffffff', 2);
    slant(292, 5 + y, 184, 22, '#12082af0', '#3d2f7a');
    Font.draw(ctx, 'ГОТІВКА', 306, 13 + y, '#8a7aa8');
    Font.draw(ctx, UI.money(S.cash.v), 468, 9 + y, '#9bf08a', 2, 'right');
    if (window.Music && Music.started()) Music.drawMini(ctx, 226, 5 + y, E.button, accent());
  }

  function carousel(items, st, y, onActivate, onChange) {
    const k = UI.Ease.outCubic(S.enter.k);
    const yy0 = Math.round(y + (1 - k) * 80);
    items.forEach((it, i) => {
      const d = i - st.f, ad = Math.abs(d);
      if (ad > 2.7) return;
      const big = Math.max(0, 1 - ad);
      const w = Math.round(66 + big * 46), h = Math.round(38 + big * 18);
      const x = Math.round(240 + d * 96 - w / 2), yy = Math.round(yy0 + (1 - big) * 10);
      const sel = i === st.sel;
      ctx.globalAlpha = Math.max(0.35, 1 - ad * 0.28);
      slant(x, yy, w, h, sel ? '#2a1450f4' : '#12082ae8', sel ? accent() : '#3d2f7a', 8);
      const is = big > 0.55 ? 3 : 2;
      UI.icon(ctx, it.icon, x + w / 2 - 6 * is + 3, yy + 3, sel ? accentHi() : '#8a7aa8', is);
      Font.draw(ctx, it.name, x + w / 2 + 2, yy + h - 10, sel ? '#ffffff' : '#b9a8e0', 1, 'center', null);
      ctx.globalAlpha = 1;
      if (sel) { ctx.fillStyle = accentHi(); ctx.fillRect(x + 12, yy + h + 2, Math.round((w - 20) * (0.5 + 0.5 * Math.sin(S.t * 4))), 1); }
      E.button(x, yy, w, h, () => {
        if (st.sel === i) onActivate(i);
        else { st.sel = i; UI.tween(st, { f: i }, 0.35, 'outCubic'); Audio8.sfx.select(); if (onChange) onChange(i); }
      });
    });
    const step = (dir) => { const n = Math.max(0, Math.min(items.length - 1, st.sel + dir)); if (n !== st.sel) { st.sel = n; UI.tween(st, { f: n }, 0.35, 'outCubic'); Audio8.sfx.select(); if (onChange) onChange(n); } };
    slant(4, yy0 + 18, 22, 22, '#12082ae8', '#3d2f7a', 4); UI.icon(ctx, 'arrowL', 9, yy0 + 23, '#ffffff');
    E.button(0, yy0 + 12, 30, 34, () => step(-1));
    slant(454, yy0 + 18, 22, 22, '#12082ae8', '#3d2f7a', 4); UI.icon(ctx, 'arrowR', 459, yy0 + 23, '#ffffff');
    E.button(450, yy0 + 12, 30, 34, () => step(1));
  }

  function statPanel(x, y, s, prev) {
    const k = UI.Ease.outCubic(S.enter.k);
    x = Math.round(x - 150 * (1 - k));
    slant(x, y, 132, S.screen === 'perf' ? 84 : 72, '#12082ae8', accent());
    const r0 = Profile.rating(s), r1 = prev ? Profile.rating(prev) : r0;
    Font.draw(ctx, 'РЕЙТИНГ', x + 10, y + 7, '#b9a8e0');
    Font.draw(ctx, String(r0), x + 118, y + 4, '#ffffff', 2, 'right');
    if (r1 !== r0) Font.draw(ctx, (r1 > r0 ? '+' : '') + (r1 - r0), x + 118, y + 20, r1 > r0 ? '#6aff5a' : '#ff5c7a', 1, 'right');
    const b = Profile.bars(s), pb = prev ? Profile.bars(prev) : null;
    STAT_NAMES.forEach((n, i) => {
      Font.draw(ctx, n, x + 8, y + 30 + i * 10, '#8a7aa8');
      UI.bar(ctx, x + 66, y + 31 + i * 10, 56, b[i], pb ? pb[i] : null, accent());
    });
  }

  function listPanel(title, rows, onPick) {
    const k = UI.Ease.outCubic(S.enter.k);
    const x = Math.round(318 + 170 * (1 - k)), y = 32;
    slant(x, y, 160, 14 + ROWS * ROW_H + 4, '#12082aee', accent());
    Font.draw(ctx, title, x + 12, y + 4, accentHi());
    if (rows.length > ROWS) Font.draw(ctx, S.item + 1 + '/' + rows.length, x + 148, y + 4, '#6a5a88', 1, 'right');
    for (let vi = 0; vi < ROWS; vi++) {
      const i = S.scroll + vi, r = rows[i];
      if (!r) break;
      const ry = y + 15 + vi * ROW_H, sel = i === S.item;
      if (sel) { slant(x + 3, ry, 152, ROW_H - 1, '#3a1a66', '#ffffff', 4); ctx.fillStyle = accent(); ctx.fillRect(x + 6, ry + 3, 2, ROW_H - 7); }
      let tx = x + 12;
      if (r.swatch) { const rp = Custom.ramp(r.swatch); ctx.fillStyle = rp.h; ctx.fillRect(tx, ry + 3, 10, 3); ctx.fillStyle = rp.B; ctx.fillRect(tx, ry + 6, 10, 4); ctx.fillStyle = rp.b; ctx.fillRect(tx, ry + 10, 10, 2); tx += 14; }
      Font.draw(ctx, r.label, tx, ry + 5, sel ? '#ffffff' : '#c9bdff', 1, 'left', null);
      if (r.installed) UI.icon(ctx, 'check', x + 140, ry + 3, '#6aff5a');
      else if (r.tag) Font.draw(ctx, r.tag, x + 150, ry + 5, r.tagColor || '#ffc31f', 1, 'right', null);
      E.button(x, ry, 160, ROW_H, () => { if (S.item !== i) { S.item = i; Audio8.sfx.select(); onPick(i); } });
    }
    if (rows.length > ROWS) {
      const up = () => { if (S.scroll > 0) { S.scroll--; Audio8.sfx.select(); } };
      const dn = () => { if (S.scroll + ROWS < rows.length) { S.scroll++; Audio8.sfx.select(); } };
      ctx.fillStyle = S.scroll > 0 ? '#ffffff' : '#3d2f7a';
      for (let q = 0; q < 3; q++) ctx.fillRect(x + 78 - q, y + 13 - (2 - q), q * 2 + 1, 1);
      ctx.fillStyle = S.scroll + ROWS < rows.length ? '#ffffff' : '#3d2f7a';
      const by = y + 15 + ROWS * ROW_H;
      for (let q = 0; q < 3; q++) ctx.fillRect(x + 78 - q, by + q, q * 2 + 1, 1);
      E.button(x + 50, y, 60, 14, up);
      E.button(x + 50, by - 2, 60, 10, dn);
    }
    return { x, y: y + 14 + ROWS * ROW_H + 6 };
  }

  function actionButton(x, y, w, label, color, fn, enabled = true) {
    const pulse = enabled && Math.floor(S.t * 2.5) % 2 === 0;
    slant(x, y, w, 20, enabled ? '#2a1450f4' : '#1a1030e8', enabled ? (pulse ? '#ffffff' : color) : '#3d2f7a', 6);
    Font.draw(ctx, label, x + w / 2 + 3, y + 7, enabled ? color : '#6a5a88', 1, 'center', null);
    E.button(x, y, w, 20, () => { if (enabled) fn(); else Audio8.sfx.invalid(); });
  }

  function particlesAndFx() {
    for (const p of S.parts) {
      if (p.life < 0.3 && Math.floor(p.life * 20) % 2) continue;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    if (S.flash.a > 0) { ctx.globalAlpha = S.flash.a * 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, E.vw, E.vh); ctx.globalAlpha = 1; }
  }

  function toastDraw() {
    if (!S.toast) return;
    const life = S.toast.t;
    if (life < 0.3 && Math.floor(life * 20) % 2) return;
    const pop = UI.Ease.outBack(Math.min(1, (2.6 - Math.min(2.6, life)) * 5));
    Font.draw(ctx, S.toast.text, 240, Math.round(40 - (1 - pop) * 14), S.toast.color, 2, 'center', '#12082a');
  }

  // ---------- screens ----------
  // no car yet: empty turntable and a nudge toward the dealership
  function drawEmptyHub() {
    const o = camOpts();
    const pulse = 0.5 + 0.5 * Math.sin(S.t * 3);
    for (let a = 0; a < 90; a++) {
      const an = (a / 90) * Math.PI * 2;
      const [x, y] = Voxel3D.project(o, Math.cos(an) * 23, 7.6, Math.sin(an) * 16);
      ctx.fillStyle = a % 6 < 3 ? accent() : '#0a0614';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
    ctx.globalAlpha = 0.25 + pulse * 0.25;
    for (let i = 0; i < 12; i++) {
      const [x, y] = Voxel3D.project(o, -16 + i * 3, 7.6, 0);
      ctx.fillStyle = accentHi();
      ctx.fillRect(Math.round(x), Math.round(y) - 22 - (i % 3), 1, 20 + (i % 3));
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(E.ox, E.oy);
    topBar('ГАРАЖ', 'garage');
    const k = UI.Ease.outCubic(S.enter.k), py = Math.round(78 - 40 * (1 - k));
    slant(112, py, 256, 52, '#12082aee', accent(), 8);
    Font.draw(ctx, 'ГАРАЖ ПОРОЖНІЙ', 240, py + 8, '#ffffff', 2, 'center');
    Font.draw(ctx, 'ЗАЇДЬ В АВТОСАЛОН І ОБЕРИ ПЕРШУ ТАЧКУ', 240, py + 28, pulse > 0.5 ? accentHi() : '#b9a8e0', 1, 'center');
    Font.draw(ctx, 'ГОТІВКИ ВИСТАЧИТЬ І НА ПЕРШИЙ ТЮНІНГ', 240, py + 39, '#8a7aa8', 1, 'center');
    const cheapest = Math.min(...Catalog.ALL.map((c) => c.price));
    Font.draw(ctx, MENU[S.menu.sel].id === 'lot' ? 'СТАРТОВІ ТАЧКИ ВІД ' + UI.money(cheapest) : MENU[S.menu.sel].hint, 240, 186, '#d8ccff', 1, 'center');
    carousel(MENU, S.menu, 200, activateMenu);
    toastDraw();
    ctx.restore();
    particlesAndFx();
  }

  function drawHub() {
    drawBg(false);
    if (!Profile.data.current) { drawEmptyHub(); return; }
    const id = Profile.data.current, e = entry(), map = Custom.build(Catalog.byId[id], e.cu);
    drawStage(map);
    ctx.save(); ctx.translate(E.ox, E.oy);
    topBar('ГАРАЖ', 'garage');
    const car = Catalog.byId[id], s = Profile.stats(id, e.up);
    const k = UI.Ease.outCubic(S.enter.k), ix = Math.round(4 - 190 * (1 - k));
    slant(ix, 34, 168, 34, '#12082ae8', accent());
    Font.draw(ctx, car.name, ix + 12, 40, '#ffffff', 1);
    Music.clipText(ctx, car.year + '  ' + (car.desc || 'ТАЧКА ТВОЄЇ БАНДИ'), ix + 12, 52, 150, '#8a7aa8', 1, true, S.t);
    statPanel(344, 34, s, null);
    Font.draw(ctx, MENU[S.menu.sel].hint, 240, 186, '#d8ccff', 1, 'center');
    carousel(MENU, S.menu, 200, activateMenu);
    toastDraw();
    ctx.restore();
    particlesAndFx();
  }

  function visualRows(cat) {
    const e = entry(), cu = e.cu, id = Profile.data.current;
    if (cat.id === 'paint') return Catalog.PAINTS.map((p) => ({ label: p.name, swatch: p.c, installed: cu.paint === p.c, tag: UI.money(PAINT_PRICE), apply: { paint: p.c }, price: PAINT_PRICE }));
    if (cat.id === 'accent') return Catalog.PAINTS.map((p) => ({ label: p.name, swatch: p.c, installed: cu.accent === p.c, tag: UI.money(ACCENT_PRICE), apply: { accent: p.c }, price: ACCENT_PRICE }));
    return P[cat.id].map((o) => {
      const price = Profile.partCost(id, o.price);
      return { label: o.name, swatch: o.c, installed: cu[cat.id] === o.id, tag: price ? UI.money(price) : 'БЕЗКОШТ.', apply: { [cat.id]: o.id }, price };
    });
  }

  function drawVisual() {
    drawBg(false);
    const e = entry(), id = Profile.data.current;
    const cat = VISUAL[S.cat.sel];
    const rows = visualRows(cat);
    drawStage(curMap());
    ctx.save(); ctx.translate(E.ox, E.oy);
    topBar('ВІЗУАЛ', 'spray');
    const lp = listPanel(cat.name, rows, (i) => { S.previewCu = Object.assign({}, e.cu, rows[i].apply); if (rows[i].installed) S.previewCu = null; });
    const r = rows[S.item];
    if (r && !r.installed) {
      const can = Profile.cash >= r.price;
      actionButton(lp.x, lp.y, 160, (r.price ? 'КУПИТИ ' + UI.money(r.price) : 'ВСТАНОВИТИ'), can ? '#ffc31f' : '#ff5c7a', () => {
        if (!Profile.spend(r.price)) { Audio8.sfx.invalid(); toast('НЕ ВИСТАЧАЄ ГРОШЕЙ', '#ff5c7a'); return; }
        e.cu = Object.assign({}, e.cu, r.apply); Profile.save(); S.previewCu = null;
        Audio8.sfx.buy(); installFx(cat.cam); toast('ВСТАНОВЛЕНО!', '#9bf08a');
      }, can);
    } else if (r) actionButton(lp.x, lp.y, 160, 'ВСТАНОВЛЕНО', '#6a5a88', () => {}, false);
    const k = UI.Ease.outCubic(S.enter.k);
    slant(Math.round(4 - 150 * (1 - k)), 172, 132, 26, '#12082ae8', '#3d2f7a');
    Font.draw(ctx, 'ПРИМІРКА', Math.round(14 - 150 * (1 - k)), 176, '#8a7aa8');
    Font.draw(ctx, r ? r.label : '', Math.round(14 - 150 * (1 - k)), 186, S.previewCu ? '#ffc31f' : '#ffffff');
    carousel(VISUAL, S.cat, 206, () => {}, pickVisualCat);
    toastDraw();
    ctx.restore();
    particlesAndFx();
  }

  function drawPerf() {
    drawBg(false);
    const e = entry(), id = Profile.data.current;
    e.own = e.own || Object.assign({}, e.up);
    const u = U[S.cat.sel];
    drawStage(curMap());
    ctx.save(); ctx.translate(E.ox, E.oy);
    topBar('ТЮНІНГ', 'engine');
    const rows = Catalog.LEVEL_NAMES.map((ln, j) => {
      const installed = e.up[u.id] === j, owned = e.own[u.id] >= j;
      return { label: (j ? 'ПАКЕТ ' : '') + ln, installed, tag: owned ? 'КУПЛЕНО' : UI.money(Profile.upgradeCost(id, u.id, j)), tagColor: owned ? '#9bf08a' : '#ffc31f' };
    });
    const lp = listPanel(u.name, rows, (j) => { const up = Object.assign({}, e.up); up[u.id] = j; S.previewUp = j === e.up[u.id] ? null : up; });
    const s = Profile.stats(id, e.up), ps = S.previewUp ? Profile.stats(id, S.previewUp) : null;
    statPanel(4, 34, s, ps);
    Font.draw(ctx, u.desc, Math.round(12 - 150 * (1 - UI.Ease.outCubic(S.enter.k))), 106, accentHi());
    const j = S.item, cost = Profile.upgradeCost(id, u.id, j), owned = e.own[u.id] >= j;
    if (j === e.up[u.id]) actionButton(lp.x, lp.y, 160, 'ВСТАНОВЛЕНО', '#6a5a88', () => {}, false);
    else {
      const can = owned || Profile.cash >= cost;
      actionButton(lp.x, lp.y, 160, owned ? 'ВСТАНОВИТИ' : 'КУПИТИ ' + UI.money(cost), can ? (owned ? '#9bf08a' : '#ffc31f') : '#ff5c7a', () => {
        if (!owned && !Profile.spend(cost)) { Audio8.sfx.invalid(); toast('НЕ ВИСТАЧАЄ ГРОШЕЙ', '#ff5c7a'); return; }
        e.up[u.id] = j; e.own[u.id] = Math.max(e.own[u.id] || 0, j); Profile.save(); S.previewUp = null;
        Audio8.sfx.upgrade(); installFx(PERF_CAM[u.id]); toast('ПАКЕТ ' + Catalog.LEVEL_NAMES[j] + '!', '#9bf08a');
      }, can);
    }
    carousel(U, S.cat, 206, () => {}, pickPerfCat);
    toastDraw();
    ctx.restore();
    particlesAndFx();
  }

  function drawLot() {
    const mine = S.screen === 'mycars';
    drawBg(true);
    const id = S.list[S.idx], car = Catalog.byId[id], owned = Profile.owned(id);
    const map = curMap();
    drawStage(map, S.slide.x);
    speedLines();
    ctx.save(); ctx.translate(E.ox, E.oy);
    topBar(mine ? 'МОЇ АВТО' : 'АВТОСАЛОН', mine ? 'garage' : 'key');
    const k = UI.Ease.outCubic(S.enter.k);
    if (!mine) {
      ERAS.forEach(([era, label], i) => {
        const x = 142 + i * 50, y = 32, sel = S.era === era;
        slant(x, y, 48, 15, sel ? '#3a1a66' : '#12082ad0', sel ? accent() : '#3d2f7a', 4);
        Font.draw(ctx, label, x + 26, y + 4, sel ? '#ffffff' : '#b9a8e0', 1, 'center', null);
        E.button(x, y, 48, 15, () => { if (S.era !== era && !S.sliding) { Audio8.sfx.select(); setEra(era); } });
      });
    } else Font.draw(ctx, S.list.length + ' / ' + Catalog.ALL.length + ' У КОЛЕКЦІЇ', 240, 36, '#b9a8e0', 1, 'center');
    [[-1, 6, 'arrowL'], [1, 448, 'arrowR']].forEach(([dir, x, ic]) => {
      const nudge = Math.round(Math.sin(S.t * 5) * 1.5) * dir;
      slant(x + nudge, 94, 26, 34, '#12082ae8', accent(), 5);
      UI.icon(ctx, ic, x + 8 + nudge, 105, '#ffffff');
      E.button(x - 6, 84, 40, 54, () => shift(dir));
    });
    const py = Math.round(170 + 110 * (1 - k));
    slant(8, py, 470, 94, '#12082aee', accent(), 10);
    Font.draw(ctx, car.name, 24, py + 8, '#ffffff', 2);
    Font.draw(ctx, car.year + '   ' + (car.desc || ''), 22, py + 27, '#b9a8e0');
    const s = owned ? Profile.stats(id, Profile.entry(id).up) : Profile.stats(id);
    const b = Profile.bars(s);
    STAT_NAMES.forEach((n, i) => {
      const x = 22 + (i % 2) * 150, y = py + 44 + Math.floor(i / 2) * 13;
      Font.draw(ctx, n, x, y, '#8a7aa8');
      UI.bar(ctx, x + 62, y + 1, 72, b[i], null, accent());
    });
    Font.draw(ctx, 'РЕЙТИНГ ' + Profile.rating(s), 458, py + 30, '#c9bdff', 1, 'right');
    Font.draw(ctx, S.idx + 1 + ' / ' + S.list.length, 458, py + 44, '#6a5a88', 1, 'right');
    if (owned) Font.draw(ctx, 'У ГАРАЖІ', 458, py + 8, '#9bf08a', 2, 'right');
    else Font.draw(ctx, UI.money(car.price), 458, py + 8, Profile.cash >= car.price ? '#ffc31f' : '#ff5c7a', 2, 'right');
    const bx = 336, by = py + 64;
    if (owned) {
      if (Profile.data.current === id) actionButton(bx, by, 124, 'ТВОЯ ТАЧКА', '#6a5a88', () => {}, false);
      else actionButton(bx, by, 124, 'СІСТИ ЗА КЕРМО', '#9bf08a', () => { Profile.select(id); Audio8.sfx.buy(); toast('ТАЧКУ ОБРАНО!', '#9bf08a'); installFx('full'); });
    } else if (Profile.cash < car.price) actionButton(bx, by, 124, 'НЕ ВИСТАЧАЄ', '#ff5c7a', () => {}, false);
    else actionButton(bx, by, 124, S.confirm ? 'ПІДТВЕРДИТИ?' : 'КУПИТИ', '#ffc31f', () => {
      if (!S.confirm) { S.confirm = true; Audio8.sfx.select(); return; }
      if (Profile.buy(id) === 'ok') {
        S.confirm = false; S.cash.v = Profile.cash + car.price; UI.tween(S.cash, { v: Profile.cash }, 0.9, 'outCubic');
        Audio8.sfx.buy(); confetti(); toast('ПРИДБАНО!', '#ffc31f'); installFx('full');
      }
    });
    toastDraw();
    ctx.restore();
    particlesAndFx();
  }

  // ---------- jukebox (EA Trax style) ----------
  const fmtTime = (s) => (isFinite(s) && s > 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00');
  const CTX_LABEL = { menu: 'МЕНЮ', race: 'ГОНКИ', both: 'ВСЮДИ', off: 'ВИМК' };
  const CTX_COLOR = { menu: '#29e0d0', race: '#ff5c7a', both: '#ffc31f', off: '#6a5a88' };
  const JB_ROWS = 6;

  function drawJukebox() {
    drawBg(false);
    ctx.globalAlpha = 0.62; ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, E.vw, E.vh); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(E.ox, E.oy);
    topBar('ПЛЕЄР', 'note');
    const M = window.Music;
    if (!M) { ctx.restore(); return; }
    const list = M.tracks, cur = M.current(), t = S.t;
    const k = UI.Ease.outCubic(S.enter.k);
    const px = Math.round(8 - 490 * (1 - k));
    slant(px, 32, 464, 152, '#12082aee', accent(), 8);
    Font.draw(ctx, 'ТРЕК / ВИКОНАВЕЦЬ', px + 58, 36, '#8a7aa8');
    Font.draw(ctx, 'ДЕ ГРАЄ', px + 452, 36, '#8a7aa8', 1, 'right');
    for (let vi = 0; vi < JB_ROWS; vi++) {
      const i = S.scroll + vi, tr = list[i];
      if (!tr) break;
      const ry = 47 + vi * 22, sel = i === S.item, playing = cur === tr;
      if (sel) slant(px + 8, ry, 448, 21, '#3a1a66', '#ffffff', 5);
      if (playing) { ctx.fillStyle = accent(); ctx.fillRect(px + 12, ry + 3, 2, 15); }
      if (playing) M.eq(ctx, px + 16, ry + 7, accentHi(), t, 3, 7);
      else UI.icon(ctx, 'play', px + 15, ry + 5, '#6a5a88');
      ctx.drawImage(M.cover(tr, 16), px + 34, ry + 3);
      M.clipText(ctx, tr.title, px + 56, ry + 3, 300, playing ? accentHi() : '#ffffff', 1, sel, t);
      M.clipText(ctx, tr.artist + '  -  ' + tr.album, px + 56, ry + 12, 300, '#8a7aa8', 1, sel, t);
      Font.draw(ctx, fmtTime(tr.dur), px + 386, ry + 3, '#6a5a88', 1, 'right', null);
      const a = M.assign(tr.id);
      slant(px + 392, ry + 4, 60, 13, '#12082a', CTX_COLOR[a], 3);
      Font.draw(ctx, CTX_LABEL[a], px + 423, ry + 7, CTX_COLOR[a], 1, 'center', null);
      E.button(px + 390, ry, 66, 21, () => { M.cycleAssign(tr.id); Audio8.sfx.select(); });
      E.button(px, ry, 388, 21, () => { S.item = i; if (playing) M.toggle(); else M.play(tr.id); Audio8.sfx.click(); });
    }
    if (list.length > JB_ROWS) {
      const canUp = S.scroll > 0, canDn = S.scroll + JB_ROWS < list.length;
      ctx.fillStyle = canUp ? '#ffffff' : '#3d2f7a';
      for (let q = 0; q < 3; q++) ctx.fillRect(px + 240 - q, 38 + q, q * 2 + 1, 1);
      ctx.fillStyle = canDn ? '#ffffff' : '#3d2f7a';
      for (let q = 0; q < 3; q++) ctx.fillRect(px + 240 - q, 181 - q, q * 2 + 1, 1);
      E.button(px + 200, 32, 80, 14, () => { if (canUp) { S.scroll--; Audio8.sfx.select(); } });
      E.button(px + 200, 176, 80, 10, () => { if (canDn) { S.scroll++; Audio8.sfx.select(); } });
    }
    const by = Math.round(188 + 100 * (1 - k));
    slant(8, by, 464, 76, '#12082af4', accent(), 8);
    if (cur) {
      ctx.drawImage(M.cover(cur, 56), 22, by + 10);
      M.clipText(ctx, cur.title, 88, by + 8, 262, '#ffffff', 2, true, t);
      M.clipText(ctx, cur.artist, 88, by + 27, 262, accentHi(), 1, true, t);
      M.clipText(ctx, cur.album + '  /  ' + cur.genre + '  /  ' + cur.year, 88, by + 37, 262, '#8a7aa8', 1, true, t);
      const p = M.progress(), f = p.d ? Math.min(1, p.t / p.d) : 0;
      ctx.fillStyle = '#2a1d4a'; ctx.fillRect(88, by + 51, 262, 3);
      ctx.fillStyle = accent(); ctx.fillRect(88, by + 51, Math.round(262 * f), 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(88 + Math.round(262 * f), by + 49, 1, 7);
      Font.draw(ctx, fmtTime(p.t) + ' / ' + fmtTime(p.d), 88, by + 60, '#b9a8e0');
      Font.draw(ctx, 'ЧЕРГА: ' + (M.context() === 'race' ? 'ГОНКИ' : 'МЕНЮ'), 350, by + 60, '#6a5a88', 1, 'right');
      M.eq(ctx, 440, by + 8, accent(), t, 6, 12);
    } else Font.draw(ctx, 'ТИША В ЕФІРІ', 240, by + 32, '#6a5a88', 2, 'center');
    [['prev', 364, () => M.prev()], [M.isPaused() ? 'play' : 'pause', 396, () => M.toggle()], ['next', 428, () => M.next()]].forEach(([ic, x, fn]) => {
      slant(x - 4, by + 26, 30, 28, '#1f0c3e', ic === 'play' || ic === 'pause' ? accent() : '#3d2f7a', 5);
      UI.icon(ctx, ic, x + 1, by + 34, ic === 'play' || ic === 'pause' ? accentHi() : '#ffffff');
      E.button(x - 4, by + 26, 30, 28, () => { fn(); Audio8.sfx.select(); });
    });
    ctx.restore();
  }

  function draw(c, env) {
    ctx = c; E = env;
    if (S.screen === 'hub') drawHub();
    else if (S.screen === 'visual') drawVisual();
    else if (S.screen === 'perf') drawPerf();
    else if (S.screen === 'jukebox') drawJukebox();
    else drawLot();
  }

  // ---------- input ----------
  function pointerDown(q) {
    if (S.screen === 'jukebox') return;
    if (q.y > 28 && q.y < 196 && !(S.screen === 'visual' || S.screen === 'perf') || (q.y > 28 && q.y < 196 && q.x < 316 && q.x > 140))
      S.orbit = { x: q.x, y: q.y, yaw: S.cam.yaw, pitch: S.cam.pitch, moved: false };
  }
  function pointerMove(q) {
    const o = S.orbit;
    if (!o) return;
    if (!o.moved && Math.hypot(q.x - o.x, q.y - o.y) > 6) { o.moved = true; S.auto = false; }
    if (o.moved) {
      S.cam.yaw = o.yaw + (q.x - o.x) * 0.025;
      S.cam.pitch = Math.max(0.02, Math.min(0.95, o.pitch + (q.y - o.y) * 0.01));
    }
  }
  function pointerUp(q) {
    const o = S.orbit; S.orbit = null;
    if (!o || !o.moved) return false;
    if (inLot() && Math.abs(q.x - o.x) > 90 && Math.abs(q.y - o.y) < 30) { shift(q.x < o.x ? 1 : -1); }
    return true;
  }
  function key(code) {
    if (UI.transitioning) return;
    const st = S.screen === 'hub' ? S.menu : S.cat;
    const len = S.screen === 'hub' ? MENU.length : S.screen === 'visual' ? VISUAL.length : U.length;
    const change = S.screen === 'visual' ? pickVisualCat : S.screen === 'perf' ? pickPerfCat : null;
    if (code === 'Escape' || code === 'Backspace') { if (S.screen !== 'hub') go('hub'); return; }
    if (S.screen === 'jukebox' && window.Music) {
      const n = Music.tracks.length;
      if (code === 'ArrowDown' || code === 'ArrowUp') {
        S.item = Math.max(0, Math.min(n - 1, S.item + (code === 'ArrowDown' ? 1 : -1)));
        if (S.item < S.scroll) S.scroll = S.item;
        if (S.item >= S.scroll + 6) S.scroll = S.item - 5;
        Audio8.sfx.select();
      }
      if (code === 'Enter' || code === 'Space') Music.play(Music.tracks[S.item].id);
      if (code === 'ArrowRight') Music.next();
      if (code === 'ArrowLeft') Music.prev();
      return;
    }
    if (inLot()) { if (code === 'ArrowRight') shift(1); if (code === 'ArrowLeft') shift(-1); return; }
    if (code === 'ArrowRight' || code === 'ArrowLeft') {
      const n = Math.max(0, Math.min(len - 1, st.sel + (code === 'ArrowRight' ? 1 : -1)));
      if (n !== st.sel) { st.sel = n; UI.tween(st, { f: n }, 0.35, 'outCubic'); Audio8.sfx.select(); if (change) change(n); }
    }
    if (S.screen === 'hub' && (code === 'Enter' || code === 'Space')) activateMenu(S.menu.sel);
    if ((S.screen === 'visual' || S.screen === 'perf') && (code === 'ArrowUp' || code === 'ArrowDown')) {
      const count = S.screen === 'visual' ? visualRows(VISUAL[S.cat.sel]).length : Catalog.LEVEL_NAMES.length;
      S.item = Math.max(0, Math.min(count - 1, S.item + (code === 'ArrowDown' ? 1 : -1)));
      ensureVisible();
      Audio8.sfx.select();
      if (S.screen === 'visual') { const rows = visualRows(VISUAL[S.cat.sel]); S.previewCu = rows[S.item].installed ? null : Object.assign({}, entry().cu, rows[S.item].apply); }
      else { const e = entry(), up = Object.assign({}, e.up); up[U[S.cat.sel].id] = S.item; S.previewUp = S.item === e.up[U[S.cat.sel].id] ? null : up; }
    }
  }

  window.Garage = { enter, update, draw, pointerDown, pointerMove, pointerUp, key, get screen() { return S.screen; }, set onRace(fn) { S.onRace = fn; } };
})();
