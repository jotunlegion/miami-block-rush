// 6.00-8.00: neon mode - the finger paints a ramp across the gap, the car rides it and flies
(function () {
  const { road, hero, shot, follow, key, rate, ease, CELL, clamp, lerp } = P;
  const D = Director;

  D.whip(6.0, 1, 1);
  D.hit(6.0, 1, { col: [1, 0.4, 0.85] });
  D.hit(6.6, 0.5, { flash: 0.3, col: [1, 0.5, 0.9] });
  D.hit(7.05, 0.8);
  D.hit(7.33, 1.25);
  D.impact(7.33, 2);
  D.hit(7.72, 0.6);

  const PRE = 0.3, V = 235, LIP = 46 * CELL;
  const T_LIP = 0.62;                       // shot-local sim time the car reaches the gap
  const STROKE = [0.06, 0.5];             // painting window
  // cubic curve from the lip down a touch, then up into a kicker above the far ledge
  const P0 = [LIP - 20, 147], C1 = [LIP + 50, 158], C2 = [LIP + 120, 146], P3 = [LIP + 176, 98];
  const bez = (u) => {
    const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
    return [a * P0[0] + b * C1[0] + c * C2[0] + d * P3[0], a * P0[1] + b * C1[1] + c * C2[1] + d * P3[1]];
  };
  const N = 70;

  function init() {
    const S = P.stage(170);
    World.initInk(S.w);
    road(S, 0, 46, 9);
    road(S, 60, 170, 7);
    S.game.level = { paint: { max: 144, can: 0.2 } };
    S.game.paintMax = 144; S.game.paint = 144 * 0.92;
    const c = hero(S, LIP - V * (PRE + T_LIP) - 6, 137, { top: V, accel: 500 });
    c.vx = V; c.land = 1.4; c.smoke = 0.5;
    S.c = c;
    S.drawn = 0;
    S.onStep = (S, dt) => {
      const t = S.t - PRE;
      const u = clamp((t - STROKE[0]) / (STROKE[1] - STROKE[0]), 0, 1);
      const target = Math.floor(ease.io(u) * N);
      while (S.drawn < target) {
        const a = bez(S.drawn / N), b = bez((S.drawn + 1) / N);
        World.inkAdd(S.w, a[0], a[1], b[0], b[1], 0);
        S.game.paint = Math.max(0, S.game.paint - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.28);
        S.drawn++;
        if (S.drawn % 3 === 0) Stage.streaks(S, b[0], b[1], 2, { cols: ['#ffffff', '#ff7cc6', '#ff3ea5'], min: 20, max: 90, life: 0.3 });
      }
      S.tip = u > 0 && u < 1 ? bez(ease.io(u)) : null;
      // the painted line burns
      if (S.drawn > 4) {
        const segs = S.w.ink.segs;
        for (let k = 0; k < 3; k++) if (Math.random() < dt * 40) {
          const s = segs[(Math.random() * segs.length) | 0], q = Math.random();
          Stage.fire(S, s.x0 + s.dx * q, s.y0 + s.dy * q - 3);
        }
      }
    };
    return S;
  }

  function hand(S) {
    const t = S.t - PRE;
    if (t < STROKE[0] - 0.12 || t > STROKE[1] + 0.2) { S.hand = null; return; }
    const u = clamp((t - STROKE[0]) / (STROKE[1] - STROKE[0]), 0, 1);
    const p = bez(ease.io(u));
    const trail = [];
    for (let k = 8; k >= 1; k--) { const q = bez(ease.io(clamp(u - k * 0.02, 0, 1))); trail.push([q[0] - S.camX, q[1]]); }
    S.hand = { x: p[0] - S.camX, y: p[1], press: t < STROKE[0] + 0.1 ? 1 - (t - STROKE[0] + 0.1) / 0.2 : 0, trail: u > 0 && u < 1 ? trail : null };
    if (t > STROKE[1]) S.hand.y += (t - STROKE[1]) * 400;
  }

  shot({
    name: 'E1', t0: 6.0, pre: PRE, init,
    update(S) { hand(S); },
    cam(S, lt) { const c = S.c; return { x: Math.min(c.x - 130, LIP - 120 + (c.x - (LIP - 130)) * 0.6), z: key([[0, 1.12], [0.3, 1.0], [0.85, 1.0], [1.05, 1.25]], lt), fx: 240, fy: key([[0, 128], [0.3, 135], [1.05, 120]], lt) }; },
    hud(ctx, S, lt, st) {
      S.tray = { gauge: true };
      Stage.drawTray(ctx, S, st);
      Stage.drawHand(ctx, S, st);
    },
  });

  shot({
    name: 'E2', t0: 7.05, pre: PRE + 1.05, init,
    speed: rate([[0, 1.1], [0.26, 0.38], [0.72, 1.1]]),
    update(S) { S.hand = null; },
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.3], [0.28, 2.8], [0.95, 2.0]], lt), rot: key([[0, 0.06], [0.28, 0.12], [0.95, -0.03]], lt), fy: c.y + 8, fx: 240 }); },
    post: (S, lt) => ({ bloom: 0.85, rgb: lt > 0.26 && lt < 0.72 ? 7 : 0 }),
  });
})();
