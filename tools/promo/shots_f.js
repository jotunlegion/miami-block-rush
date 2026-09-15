// 8.00-14.20: tunnel mode - three decks, walls missing pieces, drop them in and the columns clear
(function () {
  const { hero, shot, follow, key, ease, CELL, clamp, lerp } = P;
  const D = Director;
  const { PIECES } = World;
  const shapeOf = Stage.shapeOf;
  const PIDX = (id) => PIECES.findIndex((p) => p.id === id);

  // one sim clock for the whole tunnel sequence, with its slow motion stretches
  const T0 = 8.0, BASE = 0.4;
  const RATES = [[8.0, 1], [10.6, 0.4], [11.12, 1], [12.2, 0.35], [12.48, 1]];
  function sim(t) {
    let s = BASE;
    for (let i = 0; i < RATES.length; i++) {
      const a = RATES[i][0], b = i + 1 < RATES.length ? RATES[i + 1][0] : Infinity;
      if (t <= a) break;
      s += (Math.min(t, b) - a) * RATES[i][1];
    }
    return s;
  }

  // player placements (song time) and when the car should reach that wall
  const WALLS = [
    { holes: [{ id: 'T', v: 0 }], place: [8.48], arrive: 8.86 },
    { holes: [{ id: 'L', v: 2 }, { id: 'I2', v: 0, row: 0 }], place: [10.0, 10.2], arrive: 10.64 },
    { holes: [{ id: 'I3', v: 0, row: 1 }], place: [11.12], arrive: 11.42 },
    { holes: [{ id: 'I4', v: 0, row: 0 }], place: [11.96], arrive: 12.25 },
    { holes: [{ id: 'I2', v: 0, row: 1 }], place: [12.88], arrive: 13.04 },
    { holes: [{ id: 'T', v: 1 }], place: [13.31], arrive: 13.46 },
    { holes: [{ id: 'L', v: 0 }], place: [13.73], arrive: 13.88 },
  ];
  const BOOST_AT = 12.48;
  // rivals clear their own walls a beat before they reach them
  const RIVAL = [
    { deck: 0, gi: 1, id: 'st_kings', cu: { glow: 'gold' }, top: 150, walls: [[[{ id: 'I3', v: 0, row: 0 }], 8.9], [[{ id: 'T', v: 1 }], 10.9], [[{ id: 'L', v: 1 }], 12.9]] },
    { deck: 2, gi: 2, id: 'st_havana', cu: { glow: 'cyan' }, top: 145, walls: [[[{ id: 'L', v: 3 }], 9.3], [[{ id: 'I4', v: 0, row: 1 }], 11.5], [[{ id: 'I2', v: 0, row: 0 }], 13.4]] },
  ];
  WALLS.forEach((W) => W.place.forEach((t) => D.hit(t, 0.55, { flash: 0.35 })));

  function tunnelWorld(S) {
    const w = S.w;
    w.tunnels = [];
    for (let i = 0; i < 3; i++) w.tunnels.push({ i, top: i * 4 + 1, bottom: i * 4 + 3, floor: i * 4 + 4, walls: [] });
    w.walls = [];
    for (let c = 0; c < w.cols; c++) {
      w.type[c] = 1; w.owner[c] = 9;
      for (const t of w.tunnels) { w.type[t.floor * w.cols + c] = 1; w.owner[t.floor * w.cols + c] = 9; }
    }
  }
  function wall(S, deck, col, holes) {
    const t = S.w.tunnels[deck];
    const W = holes.reduce((s, h) => s + shapeOf(h.id, h.v)[0].length, 0);
    Stage.fill(S.w, col, col + W, t.top, t.bottom, 1, Tunnel.WALL);
    let cx = col;
    const hs = holes.map((h) => {
      const shape = shapeOf(h.id, h.v), row = t.top + (h.row || 0);
      for (let dy = 0; dy < shape.length; dy++) for (let dx = 0; dx < shape[dy].length; dx++) if (shape[dy][dx]) { const i = (row + dy) * S.w.cols + cx + dx; S.w.type[i] = 0; S.w.owner[i] = 0; }
      const o = { p: PIDX(h.id), v: h.v, id: h.id, col: cx, row };
      cx += shape[0].length;
      return o;
    });
    const o = { t: deck, col, w: W, top: t.top, bottom: t.bottom, holes: hs };
    S.w.walls.push(o); t.walls.push(o);
    return o;
  }

  const carY = (deck) => (deck * 4 + 4) * CELL - 7;
  function makeCars(S) {
    const c = hero(S, 60, carY(1), { top: 150, accel: 500 });
    c.vx = 150; c.tunnel = 1; c.land = 0.6;
    S.c = c;
    S.rivals = RIVAL.map((r) => { const q = Stage.car(S, r.id, 20, carY(r.deck), r.cu, r.gi, { top: r.top, accel: 500 }); q.vx = r.top; q.tunnel = r.deck; return q; });
  }

  // dry run without walls: where is every car at every sim step
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN;
    Stage.srand(99);
    const S = P.stage(900);
    tunnelWorld(S);
    makeCars(S);
    const end = sim(14.3), xs = S.cars.map(() => []);
    let boosted = false;
    while (S.t < end) {
      if (!boosted && S.t >= sim(BOOST_AT)) { S.c.boost = 1.6; boosted = true; }
      S.cars.forEach((c, i) => xs[i].push(c.x));
      Stage.step(S);
    }
    Particles.clear();
    const at = (i, st) => xs[i][clamp(Math.round(st / Stage.DT), 0, xs[i].length - 1)];
    PLAN = { hero: (st) => at(S.cars.indexOf(S.c), st), car: at, idx: S.cars.map((c) => c) };
    PLAN.rivalIdx = S.rivals.map((q) => S.cars.indexOf(q));
    PLAN.heroIdx = S.cars.indexOf(S.c);
    return PLAN;
  }

  function init(at) {
    const PL = plan();
    const S = P.stage(900);
    tunnelWorld(S);
    makeCars(S);
    S.hints = true;
    S.place = [];
    // player walls, set so the car front meets each wall exactly on its arrival time
    WALLS.forEach((W) => {
      const x = PL.car(PL.heroIdx, sim(W.arrive));
      const o = wall(S, 1, Math.ceil((x + 17) / CELL), W.holes);
      W.place.forEach((t, k) => {
        const h = o.holes[k];
        S.place.push({ t: sim(t) - BASE, h });
        at(sim(t) - BASE, (S) => Stage.place(S, h.id, h.v, h.col, h.row, 0, { sparks: 6 }));
      });
    });
    RIVAL.forEach((r, ri) => r.walls.forEach(([holes, arrive]) => {
      const x = PL.car(PL.rivalIdx[ri], sim(arrive));
      const o = wall(S, r.deck, Math.ceil((x + 17) / CELL), holes);
      at(sim(arrive - 0.32) - BASE, (S) => o.holes.forEach((h) => Stage.place(S, h.id, h.v, h.col, h.row, r.gi, { sparks: 4 })));
    }));
    at(sim(BOOST_AT) - BASE, (S) => { S.c.boost = 1.6; });
    S.w.flash.fill(0);
    return S;
  }

  // the finger drags each piece from the tray to its hole
  function update(S, lt, st, song) {
    const t = S.t - BASE;
    const next = S.place.filter((p) => p.t > t - 0.001);
    S.tray = { slots: next.slice(0, 3).map((p, i) => ({ id: p.h.id, v: p.h.v, want: i === 0 })), nitro: song < BOOST_AT ? 3 : 0, boost: S.c.boost > 0 };
    while (S.tray.slots.length < 3) S.tray.slots.push({ id: 'I2' });
    S.hand = null;
    for (let i = 0; i < S.place.length; i++) {
      const p = S.place[i], prev = S.place[i - 1];
      const dur = Math.min(0.32, prev ? p.t - prev.t - 0.04 : 0.32);
      if (t < p.t - dur - 0.02 || t > p.t + 0.12) continue;
      const shape = shapeOf(p.h.id, p.h.v);
      const tx = (p.h.col + shape[0].length / 2) * CELL - S.camX, ty = (p.h.row + shape.length / 2) * CELL + 34;
      const slot = Stage.slotRect(0);
      S.hand = P.hand([
        { t: p.t - dur, x: slot.x + slot.w / 2, y: slot.y + slot.h / 2, drag: true, id: p.h.id, v: p.h.v, slot: 0, tap: true },
        { t: p.t, x: tx, y: ty, drag: true, id: p.h.id, v: p.h.v, slot: 0, snap: [p.h.col, p.h.row] },
        { t: p.t, x: tx, y: ty, hold: 0.12 },
      ], t);
    }
  }

  function hud(ctx, S, lt, st) {
    Stage.drawTray(ctx, S, st);
    Stage.drawHand(ctx, S, st);
    const b = S.game.banner;
    if (b && b.t > 0.55 && S.shot.banner !== false) { const k = (b.t - 0.55) / 0.55; ctx.save(); ctx.translate(Stage.OX, Stage.OY); Font.draw(ctx, b.text, 240, 72 - Math.round((1 - k) * 6), b.color, k > 0.8 ? 3 : 2, 'center', '#12082a'); ctx.restore(); }
  }

  const sub = (name, t0, t1, cam, extra) => shot(Object.assign({
    name, t0, pre: sim(t0), base: BASE, init, update, hud,
    speed: (lt) => sim(t0 + lt) - sim(t0),
    cam,
  }, extra || {}));

  D.whip(8.0, -1, 1);
  D.hit(8.0, 1.1, { col: [0.6, 1, 0.9] });
  sub('F1', 8.0, 9.34, (S, lt) => ({ x: S.c.x - 130, z: key([[0, 1.15], [0.4, 1.0]], lt), fx: 240, fy: 135 }));
  D.hit(9.34, 0.8);
  sub('F2', 9.34, 10.6, (S, lt) => ({ x: S.c.x - 190, z: 1.75, fx: 240, fy: S.c.y - 10, rot: key([[0, 0.03], [1.26, -0.02]], lt) }), { banner: false });
  D.hit(10.6, 1.1); D.impact(10.6, 2);
  sub('F3', 10.6, 11.12, (S, lt) => ({ x: S.c.x - 240, z: key([[0, 2.9], [0.52, 2.5]], lt), fx: 262, fy: S.c.y - 4, rot: key([[0, -0.1], [0.52, -0.05]], lt) }), { banner: false, post: () => ({ rgb: 6, bloom: 0.8 }) });
  D.hit(11.12, 0.9);
  sub('F4', 11.12, 11.96, (S, lt) => ({ x: S.c.x - 160, z: 1.35, fx: 240, fy: 120 }));
  D.hit(11.96, 1.1, { col: [1, 0.85, 0.4] });
  D.hit(12.25, 1.3); D.impact(12.25, 2);
  sub('F5', 11.96, 12.48, (S, lt) => ({ x: S.c.x - 240, z: key([[0, 2.2], [0.52, 2.8]], lt), fx: 250, fy: S.c.y - 6, rot: key([[0, 0.05], [0.52, 0.1]], lt) }), { banner: false, post: (S, lt) => ({ rgb: lt > 0.24 ? 8 : 0, bloom: 0.8 }) });
  D.hit(12.48, 0.9);
  sub('F6', 12.48, 14.2, (S, lt) => ({ x: S.c.x - 170, z: key([[0, 1.0], [1.72, 1.1]], lt), fx: 240, fy: 135 }), { post: () => ({ rgb: 3 }) });
})();
