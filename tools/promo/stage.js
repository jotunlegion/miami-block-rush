// Stage: a hand-directed slice of the game world. Real game modules (World, Car, Particles,
// Paint, Tunnel, Art) do the simulation and drawing; this adds directing helpers and the
// extra effects an edit needs (tire smoke, spark streaks, fire, muzzle flashes, rings).
(function () {
  const { CELL, ROWS, PIECES } = World;
  const SBW = 640, SBH = 360, OX = 80, OY = 45;
  const DT = 1 / 120;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // ---------- deterministic randomness: every shot reseeds, so any frame can be re-rendered ----------
  let seed = 1;
  function srand(s) { seed = s >>> 0; }
  Math.random = function () {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rnd = (a, b) => a + Math.random() * (b - a);

  window.Game = { onDeath() {}, shake() {}, onPaintCan() {} };

  // ---------- world ----------
  function world(cols) {
    const w = World.create(1, { cols, islands: [0, 0], trapGap: 1e9, nitro: false });
    w.bags.length = 0; w.nitros.length = 0;
    w.type.fill(0); w.owner.fill(0);
    w.finishX = 1e9;
    return w;
  }
  function fill(w, c0, c1, r0, r1, t = 1, o = 9) {
    for (let c = c0; c < c1; c++) for (let r = r0; r <= r1; r++) { if (c < 0 || c >= w.cols || r < 0 || r >= ROWS) continue; w.type[r * w.cols + c] = t; w.owner[r * w.cols + c] = o; }
  }
  const shapeOf = (id, v = 0) => PIECES.find((p) => p.id === id).v[v];

  // ---------- cars ----------
  const POLICE = { key: 'police', name: 'POLICE', top: 150, accel: 260, mass: 0.9, armor: 130, restComp: 2.6, damp: 0.35, stats: [0, 0, 0, 0] };
  function car(S, id, x, y, cu, gi = 0, over) {
    const def = id === 'police' ? Object.assign({}, POLICE) : Profile.def(id, undefined, cu);
    Object.assign(def, over || {});
    const c = new Car(S.w, def, x, y, false, gi);
    c.state = 'drive';
    c.armorHack = true;
    S.cars.push(c);
    return c;
  }

  // ---------- stage ----------
  function create(cols, o = {}) {
    const S = {
      w: world(cols), cars: [], heli: null, fx: [], t: 0, camX: 0, gi: 0, script: [],
      tray: null, hand: null, hud: null, lines: 0, bgCam: null,
    };
    S.game = {
      get world() { return S.w; }, get cars() { return S.cars; }, police: [], get player() { return S.player; }, get gi() { return S.gi; },
      tray: [], onFinish() {}, onStunt() {}, shake() {}, onCaught() {}, banner: null,
      tryPlace: () => false,
    };
    Particles.clear();
    return S;
  }

  function at(S, t, fn) { S.script.push({ t, fn, done: false }); S.script.sort((a, b) => a.t - b.t); }

  function step(S, dt = DT) {
    for (const s of S.script) if (!s.done && S.t >= s.t) { s.done = true; s.fn(S); }
    if (S.onStep) S.onStep(S, dt);
    for (const c of S.cars) {
      if (c.frozen) continue;
      if (c.armorHack) c.g.armor = 9999;
      const vy0 = c.vy, air0 = !c.grounded;
      c.update(dt, S.game);
      if (c.land && air0 && c.grounded && vy0 > 45) landFx(S, c, Math.min(1.5, vy0 / 120) * c.land);
      if (c.smoke) tireSmoke(S, c, dt);
    }
    Particles.update(dt, S.w);
    const f = S.w.flash;
    for (let i = 0; i < f.length; i++) if (f[i] > 0) f[i] = Math.max(0, f[i] - dt * 7);
    for (let i = S.fx.length - 1; i >= 0; i--) {
      const p = S.fx[i];
      p.life -= dt;
      if (p.life <= 0) { S.fx[i] = S.fx[S.fx.length - 1]; S.fx.pop(); continue; }
      if (p.g) p.vy += p.g * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
      if (p.grow) p.r += p.grow * dt;
    }
    if (S.heli && S.heliUpdate) S.heliUpdate(S, dt);
    if (S.game.banner && (S.game.banner.t -= dt) <= 0) S.game.banner = null;
    S.t += dt;
  }

  // ---------- placing blocks with a flash, like the game does ----------
  function place(S, id, v, col, row, owner = 0, o = {}) {
    const shape = shapeOf(id, v);
    World.place(S.w, shape, col, row, owner);
    const pal = Art.teamPal(owner);
    shape.forEach((line, dy) => line.forEach((t, dx) => {
      if (!t) return;
      const X = (col + dx) * CELL + 8, Y = (row + dy) * CELL + 8;
      Particles.spark(X, Y, o.sparks || 6, [pal.hi, '#ffffff', '#ffc31f'], 90);
      S.w.flash[(row + dy) * S.w.cols + col + dx] = 0.8;
    }));
    const cx = (col + shape[0].length / 2) * CELL, cy = (row + shape.length / 2) * CELL;
    ring(S, cx, cy, pal.hi, 34, 0.22);
    if (S.w.tunnels) Tunnel.onPlace(S.game, shape, col, row);
    return shape;
  }

  // ---------- extra effects ----------
  function puff(S, x, y, o = {}) {
    S.fx.push({ k: 'puff', x, y, vx: o.vx != null ? o.vx : rnd(-12, 12), vy: o.vy != null ? o.vy : rnd(-16, -4), r: o.r || rnd(2, 4), grow: o.grow || rnd(6, 12),
      life: o.life || rnd(0.5, 0.9), max: o.life || 0.9, c: o.c || '#a896d0', a: o.a || 0.55, drag: 1.5 });
  }
  function tireSmoke(S, c, dt) {
    for (const wh of c.wheels) {
      if (!wh.contact) continue;
      const sp = Math.abs(c.vx);
      if (Math.random() > dt * (c.smoke * (20 + sp * 0.2))) continue;
      const [x, y] = c.toWorld(wh.lx - 2, wh.ly + wh.dist - 1);
      puff(S, x, y, { vx: -c.vx * 0.15 + rnd(-10, 10), vy: rnd(-18, -6), r: 2, grow: rnd(10, 18), life: rnd(0.4, 0.8) });
    }
  }
  function streaks(S, x, y, n, o = {}) {
    const cols = o.cols || ['#ffffff', '#fff3a0', '#ffc31f', '#ff9a52'];
    for (let i = 0; i < n; i++) {
      const a = o.dir != null ? o.dir + rnd(-(o.spread || 0.6), o.spread || 0.6) : rnd(0, Math.PI * 2), v = rnd(o.min || 60, o.max || 220);
      S.fx.push({ k: 'streak', x, y, vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v + (o.vy || 0), g: o.g != null ? o.g : 260, life: rnd(0.15, o.life || 0.45), max: 0.45, c: cols[(Math.random() * cols.length) | 0], drag: 2 });
    }
  }
  function landFx(S, c, k = 1) {
    for (const wh of c.wheels) {
      const [x, y] = c.toWorld(wh.lx, wh.ly + wh.dist - 1);
      streaks(S, x, y, Math.round(10 * k), { dir: -Math.PI / 2 + (wh.lx > 0 ? 0.5 : -0.5), spread: 0.9, min: 60, max: 200 * k, vx: c.vx * 0.3 });
      for (let i = 0; i < 5 * k; i++) puff(S, x + rnd(-6, 6), y, { r: 2, grow: 20 * k, life: rnd(0.4, 0.8), vx: rnd(-50, 50) + c.vx * 0.1, vy: rnd(-25, -5) });
    }
    ring(S, c.x, c.y + 8, '#ffffff', 26 * k, 0.2);
  }
  function ring(S, x, y, c, R = 40, life = 0.35) { S.fx.push({ k: 'ring', x, y, r: 2, grow: R / life, life, max: life, c }); }
  function fire(S, x, y, o = {}) {
    S.fx.push({ k: 'fire', x: x + rnd(-2, 2), y, vx: rnd(-6, 6) + (o.vx || 0), vy: rnd(-40, -18), life: rnd(0.25, 0.55), max: 0.55, drag: 1, s: Math.random() < 0.3 ? 2 : 1 });
  }
  function muzzle(S, x, y, tx, ty) {
    S.fx.push({ k: 'muzzle', x, y, life: 0.07, max: 0.07 });
    const a = Math.atan2(ty - y, tx - x), v = 900;
    S.fx.push({ k: 'tracer', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: Math.hypot(tx - x, ty - y) / v, max: 1, onEnd: [tx, ty] });
  }
  function text(S, str, x, y, o = {}) { S.fx.push(Object.assign({ k: 'text', str, x, y, vx: 0, vy: -20, life: 1, max: 1, s: 1, c: '#ffffff' }, o)); }

  function drawFx(ctx, S, camX, layer) {
    for (const p of S.fx) {
      const X = Math.round(p.x - camX), Y = Math.round(p.y), k = p.life / p.max;
      if (p.k === 'puff' && layer === 0) {
        const r = Math.round(p.r), a = p.a * Math.min(1, k * 1.6);
        ctx.fillStyle = p.c;
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const d = (dx * dx + dy * dy) / (r * r + 0.01);
            if (d > 1) continue;
            const px = X + dx, py = Y + dy;
            if (BAYER[((py & 3) << 2) | (px & 3)] / 16 >= a * (1 - d * 0.6)) continue;
            ctx.fillRect(px, py, 1, 1);
          }
      } else if (layer === 1) {
        if (p.k === 'streak') {
          ctx.fillStyle = p.c;
          const n = 4;
          for (let i = 0; i < n; i++) ctx.fillRect(Math.round(p.x - camX - p.vx * 0.006 * i), Math.round(p.y - p.vy * 0.006 * i), 1, 1);
        } else if (p.k === 'ring') {
          ctx.fillStyle = p.c;
          ctx.globalAlpha = Math.min(0.8, k * 1.2);
          const r = p.r, n = Math.max(12, Math.round(r * 2));
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ctx.fillRect(Math.round(X + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r), 2, 2); }
          ctx.globalAlpha = 1;
        } else if (p.k === 'fire') {
          ctx.fillStyle = k > 0.75 ? '#fff3a0' : k > 0.5 ? '#ffc31f' : k > 0.3 ? '#ff6a1f' : k > 0.15 ? '#ff3e8a' : '#5a2a6a';
          ctx.fillRect(X, Y, p.s, p.s + (k > 0.5 ? 1 : 0));
        } else if (p.k === 'muzzle') {
          ctx.fillStyle = '#fff3a0';
          ctx.fillRect(X - 3, Y, 7, 1); ctx.fillRect(X, Y - 3, 1, 7); ctx.fillRect(X - 1, Y - 1, 3, 3);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 1);
        } else if (p.k === 'tracer') {
          ctx.fillStyle = '#ffe27a';
          for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(p.x - camX - p.vx * 0.003 * i), Math.round(p.y - p.vy * 0.003 * i), 1, 1);
        } else if (p.k === 'text') {
          Font.draw(ctx, p.str, X, Y, p.c, p.s, 'center', p.sh || '#12082a');
        }
      }
    }
  }
  // tracers that reach their target leave sparks
  function tracerHits(S) {
    for (const p of S.fx) if (p.k === 'tracer' && p.life <= DT * 1.01 && p.onEnd) { streaks(S, p.onEnd[0], p.onEnd[1], 6, { cols: ['#ffffff', '#ffe27a'], min: 40, max: 140, life: 0.25 }); p.onEnd = null; }
  }

  // ---------- drawing ----------
  const HAND = Art.fromRows([
    '..KK........',
    '.KWWK.......',
    '.KWWK.......',
    '.KWWKKK.....',
    '.KWWKWWKK...',
    'KKWWKWWKWK..',
    'KWWWWWWWWWK.',
    'KWWWWWWWWWK.',
    '.KWWWWWWWK..',
    '..KWWWWWK...',
    '...KKKKK....',
  ], { K: '#12082a', W: '#ffffff' });

  function drawWorld(ctx, S, time) {
    const w = S.w, cx = Math.round(S.camX);
    const bgCam = S.bgCam != null ? S.bgCam : cx;
    Art.drawBackground(ctx, SBW, SBH, OY, bgCam, time);
    if (S.drawBack) S.drawBack(ctx, S, time);
    ctx.save(); ctx.translate(OX, OY);
    const c0 = Math.max(0, Math.floor((cx - OX) / CELL)), c1 = Math.min(w.cols - 1, Math.ceil((cx - OX + SBW) / CELL));
    for (let r = 0; r < ROWS; r++)
      for (let c = c0; c <= c1; c++) {
        const i = r * w.cols + c, ty = w.type[i];
        if (!ty) continue;
        const X = c * CELL - cx, Y = r * CELL;
        ctx.drawImage(Art.tile(ty, w.owner[i]), X, Y);
        if (w.flash[i] > 0) { ctx.globalAlpha = Math.min(1, w.flash[i]); ctx.drawImage(whiteTile(ty), X, Y); ctx.globalAlpha = 1; }
      }
    if (w.ink) Paint.drawInk(ctx, w, cx, time, cx - OX, cx - OX + SBW);
    if (w.tunnels && S.hints) Tunnel.drawHints(ctx, S.game, cx, time);
    drawFx(ctx, S, cx, 0);
    if (S.heli) S.heli.draw(ctx, cx, time);
    for (const c of S.cars) c.draw(ctx, cx, time);
    Particles.draw(ctx, cx);
    drawFx(ctx, S, cx, 1);
    if (S.drawFront) S.drawFront(ctx, S, time);
    ctx.restore();
  }

  const whiteCache = {};
  function whiteTile(t) {
    if (whiteCache[t]) return whiteCache[t];
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    g.drawImage(Art.tile(t, 9), 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16);
    return (whiteCache[t] = c);
  }

  // the game's bottom tray: three piece slots and the jump / nitro buttons
  const TRAY_Y = 222;
  function slotRect(i) { return { x: 240 + (i - 1) * 84 - 38, y: TRAY_Y + 3, w: 76, h: 44 }; }
  function drawTray(ctx, S, time) {
    const T = S.tray, pal = Art.TEAM[S.gi];
    ctx.save(); ctx.translate(OX, OY);
    ctx.fillStyle = '#12082ad8'; ctx.fillRect(-OX, TRAY_Y, SBW, SBH);
    ctx.fillStyle = pal.main; ctx.fillRect(-OX, TRAY_Y, SBW, 1);
    ctx.fillStyle = pal.dark; ctx.fillRect(-OX, TRAY_Y + 1, SBW, 1);
    const box = (r, col, fill) => {
      ctx.fillStyle = fill; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = col; ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1); ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 1);
    };
    const J = { x: 6, y: TRAY_Y + 5, w: 68, h: 40 };
    box(J, pal.main, '#1f0c3e');
    const ax = J.x + J.w / 2, ay = J.y + 7;
    ctx.fillStyle = pal.hi;
    for (let k = 0; k < 5; k++) ctx.fillRect(ax - k, ay + k, k * 2 + 1, 1);
    ctx.fillRect(ax - 1, ay + 5, 3, 6);
    Font.draw(ctx, 'СТРИБОК', ax, J.y + 27, '#ffffff', 1, 'center');
    if (T.gauge) {
      Paint.drawGauge(ctx, S.game, 84, TRAY_Y + 5, 390, 40, time);
    } else {
      const N = { x: 406, y: TRAY_Y + 5, w: 68, h: 40 }, on = T.boost;
      box(N, on ? (Math.floor(time * 8) % 2 ? '#ffffff' : '#29d9ff') : '#29d9ff', '#1f0c3e');
      for (let k = 0; k < 3; k++) { ctx.globalAlpha = k < (T.nitro == null ? 3 : T.nitro) ? 1 : 0.3; ctx.drawImage(Art.nitro, N.x + 11 + k * 17, N.y + 5); ctx.globalAlpha = 1; }
      Font.draw(ctx, on ? 'X3!' : 'НІТРО', N.x + N.w / 2, N.y + 27, '#9fdcff', 1, 'center');
      (T.slots || []).forEach((s, i) => {
        const r = slotRect(i);
        const dragging = S.hand && S.hand.slot === i && S.hand.drag;
        ctx.fillStyle = '#1f0c3e'; ctx.fillRect(r.x, r.y, r.w, r.h);
        const lit = s.flash && s.flash > S.t ? Math.floor(time * 16) % 2 : 0;
        ctx.fillStyle = lit ? '#ffffff' : dragging ? pal.main : s.want ? pal.hi : '#3d2f7a';
        ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1); ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
        if (s.cd && s.cd > S.t) { ctx.fillStyle = pal.dark; ctx.fillRect(r.x + 4, r.y + r.h - 6, Math.round((r.w - 8) * (1 - (s.cd - S.t) / 0.8)), 2); return; }
        const shape = shapeOf(s.id, s.v || 0), sw = shape[0].length * CELL, sh = shape.length * CELL;
        const x0 = Math.round(r.x + r.w / 2 - sw / 2), y0 = Math.round(r.y + r.h / 2 - sh / 2);
        if (dragging) ctx.globalAlpha = 0.25;
        shape.forEach((line, dy) => line.forEach((ty, dx) => { if (ty) ctx.drawImage(Art.tile(ty, S.gi), x0 + dx * CELL, y0 + dy * CELL); }));
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();
  }

  // finger: a hand with a press ripple; while dragging it carries a see-through piece
  function drawHand(ctx, S, time) {
    const h = S.hand;
    if (!h || h.hidden) return;
    ctx.save(); ctx.translate(OX, OY);
    if (h.drag && h.id) {
      const shape = shapeOf(h.id, h.v || 0), sw = shape[0].length * CELL, sh = shape.length * CELL;
      const gx = h.snap ? h.snap[0] * CELL - S.camX : Math.round(h.x - sw / 2), gy = h.snap ? h.snap[1] * CELL : Math.round(h.y - 34 - sh / 2);
      shape.forEach((line, dy) => line.forEach((ty, dx) => {
        if (!ty) return;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(Art.tile(ty, h.owner != null ? h.owner : S.gi), Math.round(gx + dx * CELL), Math.round(gy + dy * CELL));
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 30);
        ctx.drawImage(whiteTile(ty), Math.round(gx + dx * CELL), Math.round(gy + dy * CELL));
        ctx.globalAlpha = 1;
      }));
    }
    if (h.press > 0) {
      ctx.fillStyle = '#ffffff';
      const r = 4 + (1 - h.press) * 10;
      ctx.globalAlpha = h.press;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.fillRect(Math.round(h.x + Math.cos(a) * r), Math.round(h.y + Math.sin(a) * r), 1, 1); }
      ctx.globalAlpha = 1;
    }
    if (h.trail) {
      ctx.fillStyle = '#ffffff';
      h.trail.forEach((p, i) => { ctx.globalAlpha = (i / h.trail.length) * 0.5; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 2, 2); });
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(HAND, Math.round(h.x - 3), Math.round(h.y - 1), 24, 22);
    ctx.restore();
  }

  window.Stage = {
    SBW, SBH, OX, OY, DT, TRAY_Y, srand, rnd, world, fill, shapeOf, car, create, at, step, place,
    puff, streaks, ring, landFx, fire, muzzle, text, tracerHits, drawWorld, drawTray, drawHand, slotRect, whiteTile,
  };
})();
