// 0.00-2.54: "run run run run run it up, run it up, push that limit"
(function () {
  const { road, hero, shot, follow, key, rate, ease, CELL } = P;
  const D = Director;

  // -------- A: one cut per "run", a different car on a ramp every time --------
  const RUNS = [0.0, 0.2, 0.43, 0.64, 0.82];
  RUNS.forEach((t, i) => D.hit(t, i === 0 ? 0.8 : 1, { col: i % 2 ? [1, 0.55, 0.85] : [1, 1, 1] }));
  D.hit(1.02, 0.6, { flash: 0.4 });

  // launch rig: a car at speed coming up a LAUNCH ramp at col 30 on a row 9 roof
  function launchRig(id, cu, gi, pre, vx, over) {
    const S = P.stage(120);
    road(S, 0, 33, 9);
    Stage.place(S, 'LAUNCH', 0, 30, 7, gi, { sparks: 0 });
    S.w.flash.fill(0);
    road(S, 44, 120, 10);
    const c = Stage.car(S, id, 30 * CELL - vx * pre - 10, 137, cu, gi, Object.assign({ top: vx, accel: 600 }, over));
    c.vx = vx; c.smoke = 1.2; c.land = 1;
    S.c = c;
    return S;
  }

  // A1 red F40 leaves the lip
  shot({
    name: 'A1', t0: 0.0, pre: 0.74,
    init() { return launchRig('furia89', { glow: 'gold', vinyl: 'twin', accent: '#ffc31f' }, 1, 0.52, 230); },
    speed: rate([[0, 0.75]]),
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 3.2], [0.2, 2.5]], lt, ease.out), rot: key([[0, -0.16], [0.2, -0.09]], lt), fx: 225, fy: c.y - 6 }); },
    post: () => ({ tint: [1, 0.75, 0.6], tintAmt: 0.12 }),
  });

  // A2 purple lowrider lands hard, sparks and smoke
  shot({
    name: 'A2', t0: 0.2, pre: 0.3,
    init(at) {
      const S = P.stage(120);
      road(S, 0, 120, 9);
      const c = Stage.car(S, 'st_kings', 380, 96, { glow: 'gold' }, 1, { top: 200, accel: 500 });
      c.vx = 210; c.vy = 150; c.a = 0.12; c.smoke = 2; c.land = 1.4;
      S.c = c;
      at(0.36, (S) => {
        const [x, y] = c.toWorld(0, 6);
        Stage.streaks(S, x, y + 2, 26, { dir: -Math.PI / 2, spread: 1.3, min: 80, max: 260 });
        for (let k = 0; k < 14; k++) Stage.puff(S, x + Stage.rnd(-18, 18), y + 3, { r: 3, grow: 22, life: 0.7, vx: Stage.rnd(-60, 60), vy: Stage.rnd(-30, -5) });
        Stage.ring(S, x, y + 4, '#ffc31f', 70, 0.3);
      });
      return S;
    },
    speed: rate([[0, 1.1]]),
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.2], [0.23, 2.7]], lt), rot: key([[0, 0.14], [0.23, 0.08]], lt), flip: true, fy: c.y - 10 }); },
  });
  D.impact(0.23, 2);

  // A3 blue GT-R climbs a steep kicker with nitro
  shot({
    name: 'A3', t0: 0.43, pre: 0.5,
    init() {
      const S = P.stage(120);
      road(S, 0, 60, 9);
      Stage.place(S, 'STEEP', 0, 30, 7, 2, { sparks: 0 });
      S.w.flash.fill(0);
      const c = Stage.car(S, 'gtr99', 30 * CELL - 150, 137, { glow: 'cyan', vinyl: 'bolt', accent: '#29e0d0' }, 2, { top: 240, accel: 700 });
      c.vx = 240; c.boost = 3; c.smoke = 1;
      S.c = c;
      return S;
    },
    speed: rate([[0, 0.9]]),
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.0], [0.21, 2.8]], lt, ease.out), rot: key([[0, -0.05], [0.21, -0.14]], lt), fy: c.y - 4 }); },
    post: () => ({ tint: [0.6, 0.9, 1], tintAmt: 0.12 }),
  });

  // A4 silver DeLorean over a gap, camera rolls
  shot({
    name: 'A4', t0: 0.64, pre: 0.78,
    init() { return launchRig('delta81', { glow: 'violet', vinyl: 'stripe', accent: '#9d5cff' }, 0, 0.62, 250); },
    speed: rate([[0, 1]]),
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.4], [0.18, 2.1]], lt), rot: key([[0, 0.2], [0.18, 0.1]], lt), fy: c.y }); },
  });

  // A5 "run it up": hero in huge air over the sun, speed ramp into slow motion
  shot({
    name: 'A5', t0: 0.82, pre: 0.95,
    init() {
      const S = launchRig('st_vice', P.HERO, 0, 0.62, 250, { top: 250 });
      S.player = S.c;
      return S;
    },
    speed: rate([[0, 1.3], [0.16, 0.32]]),
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.9], [0.4, 2.2]], lt, ease.out), rot: key([[0, -0.12], [0.4, 0.02]], lt), fy: c.y + 4, fx: 246 }); },
    post: (S, lt) => ({ rgb: lt > 0.16 ? 6 : 0 }),
  });

  // -------- B 1.22-2.54: racing, drag a ramp from the tray, launch on "limit" --------
  D.hit(1.22, 0.9, { col: [1, 0.45, 0.8] });
  D.hit(1.62, 0.8);             // push: block lands
  D.hit(1.98, 1.1);             // limit: launch
  D.impact(1.98, 2);
  const B_SPEED = rate([[0, 1], [0.76, 0.33]]);
  shot({
    name: 'B', t0: 1.22, pre: 0.4,
    init(at) {
      const S = P.stage(160);
      road(S, 0, 62, 9);
      road(S, 74, 160, 8);
      const c = hero(S, 62 * CELL - 3 * CELL - 0.76 * 190 - 0.4 * 190 + 40, 137, { top: 190 });
      c.vx = 190; c.smoke = 0.6; c.land = 1;
      S.c = c;
      S.tray = { slots: [{ id: 'I4' }, { id: 'LAUNCH' }, { id: 'T' }], nitro: 2 };
      at(0.4, (S) => { S.tray.slots[1].cd = S.t + 0.8; Stage.place(S, 'LAUNCH', 0, 59, 7, 0, { sparks: 10 }); Stage.ring(S, 60.5 * CELL, 8 * CELL, '#ffffff', 90, 0.4); });
      at(0.4 + 0.8, (S) => { S.tray.slots[1] = { id: 'KICK', flash: S.t + 0.3 }; });
      return S;
    },
    speed: B_SPEED,
    update(S, lt, st) {
      const t = st - 0.4, c = S.c;
      const tx = 59 * CELL + 24 - S.camX, ty = 7 * CELL + 16;
      S.hand = P.hand([
        { t: -0.02, x: 250, y: 262, tap: true },
        { t: 0.06, x: 240, y: 247, drag: true, id: 'LAUNCH', slot: 1, tap: true },
        { t: 0.4, x: tx, y: ty + 34, drag: true, id: 'LAUNCH', slot: 1, snap: [59, 7] },
        { t: 0.4, x: tx, y: ty + 34, hold: 0.3 },
        { t: 0.62, x: tx + 40, y: 262 },
      ], t);
    },
    cam(S, lt, st) {
      const c = S.c;
      const z = key([[0, 1], [0.72, 1], [1.05, 1.85], [1.32, 2.05]], lt);
      const base = { x: c.x - 150, fx: 240, fy: 135 };
      if (z <= 1.001) return Object.assign(base, { z });
      const k = P.clamp((z - 1) / 0.85, 0, 1);
      return { x: c.x - 150, z, fx: P.lerp(240, 150, k), fy: P.lerp(135, c.y + 4, k), rot: key([[0.72, 0], [1.32, -0.07]], lt) };
    },
    hud(ctx, S, lt, st) { Stage.drawTray(ctx, S, st); Stage.drawHand(ctx, S, st); },
    post: (S, lt) => ({ rgb: lt > 0.76 ? 5 : 0, bloom: lt > 0.76 ? 0.75 : 0.55 }),
  });
})();
