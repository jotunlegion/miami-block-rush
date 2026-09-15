// 4.04-6.00: "whole crew locked in, every second in it" - two rivals fly off a kicker behind us,
// lay a bridge over our roof and overtake across the top of it
(function () {
  const { road, hero, shot, follow, key, rate, ease, CELL, clamp } = P;
  const D = Director;

  D.hit(4.04, 1.1, { col: [1, 0.85, 0.4] });
  D.hit(4.36, 0.5, { flash: 0.3 });
  D.hit(5.02, 1.1, { col: [0.5, 1, 0.95] });
  D.hit(5.28, 0.6, { flash: 0.3 });

  const SP = 160, HERO_V = 105, KICK = 24, BRIDGE_ROW = 6;
  const RIVALS = [
    { id: 'st_kings', cu: { glow: 'gold' }, gi: 1, back: 0 },
    { id: 'st_havana', cu: { glow: 'cyan' }, gi: 2, back: 64 },
  ];

  function base() {
    const S = P.stage(260);
    road(S, 0, 260, 9);
    Stage.place(S, 'GLIDE', 0, KICK, 8, 1, { sparks: 0 });
    S.w.flash.fill(0);
    S.rivals = RIVALS.map((r) => {
      const c = Stage.car(S, r.id, KICK * CELL - SP * 0.6 - r.back, 137, r.cu, r.gi, { top: SP, accel: 600 });
      c.vx = SP; c.land = 1.2; c.smoke = 0.5;
      return c;
    });
    return S;
  }

  // dry run: where do the rivals come down through bridge height
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN;
    Stage.srand(5);
    const S = base();
    const cross = S.rivals.map(() => null);
    let launched = S.rivals.map(() => false);
    for (let i = 0; i < 120 * 5 && cross.some((q) => !q); i++) {
      Stage.step(S);
      S.rivals.forEach((c, k) => {
        if (!c.grounded && c.x > KICK * CELL) launched[k] = true;
        if (launched[k] && !cross[k] && c.vy > 0 && c.y >= 80) cross[k] = { t: S.t, x: c.x };
      });
    }
    Particles.clear();
    return (PLAN = { cross });
  }

  function init(at) {
    const PL = plan();
    const S = base();
    const k0 = PL.cross[0];
    const col0 = Math.floor((k0.x - 70) / CELL);
    S.bridge = col0;
    // the hero is right under the start of the bridge when the first rival comes down on it
    const c = hero(S, k0.x + 26 - HERO_V * k0.t, 137, { top: HERO_V, accel: 400 });
    c.vx = HERO_V; c.smoke = 0.4;
    S.c = c;
    // the rivals lay the bridge a moment before they need it, one bar after another
    [0, 1, 2, 3].forEach((i) => at(k0.t - 0.75 + i * 0.12 - 0.85, (S) => {
      Stage.place(S, 'I4', 0, col0 + i * 4, BRIDGE_ROW, i % 2 ? 2 : 1, { sparks: 8 });
    }));
    return S;
  }

  shot({
    name: 'D1', t0: 4.04, pre: 0.85, base: 0.85, init,
    cam(S, lt) { const c = S.c; return { x: c.x - 310, z: key([[0, 1.3], [0.98, 1.12]], lt), fx: 250, fy: key([[0, 118], [0.98, 112]], lt), rot: key([[0, 0.03], [0.98, 0]], lt) }; },
  });
  shot({
    name: 'D2', t0: 5.02, pre: 0.85 + 0.98, base: 0.85, init,
    speed: rate([[0, 0.5], [0.5, 1.25]]),
    cam(S, lt) {
      const c = S.c, r = S.rivals[0];
      const wx = (c.x + r.x) / 2, wy = (c.y + r.y) / 2;
      return follow(S, wx, wy, { z: key([[0, 2.5], [0.98, 1.9]], lt), rot: key([[0, -0.09], [0.98, -0.03]], lt), fy: wy + 6 });
    },
    post: (S, lt) => ({ rgb: lt < 0.5 ? 5 : 0 }),
  });
})();
