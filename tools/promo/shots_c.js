// 2.54-4.04: "run it up, run it up, push that limit" - three falls, three different saving blocks
(function () {
  const { road, hero, shot, follow, key, rate, ease, CELL, clamp } = P;
  const D = Director;

  D.hit(2.54, 1.1, { col: [1, 0.5, 0.85] });
  D.hit(2.94, 1.1);
  D.hit(3.36, 1.2, { col: [0.6, 1, 0.95] });
  D.hit(3.70, 1.3);
  D.impact(3.70, 2);

  // a finger flicks a piece from below the frame to just under the car
  function flick(S, id, v, t0, t1, target) {
    return P.hand([
      { t: t0, x: 240, y: 300, drag: true, id, v },
      { t: t1, x: target[0], y: target[1], drag: true, id, v },
      { t: t1, x: target[0], y: target[1], hold: 0.2 },
      { t: t1 + 0.2, x: target[0] + 30, y: 300 },
    ], S.t - S.shot.pre);
  }

  // C1: off the roof edge into the chasm, a long bar slams in under the wheels
  shot({
    name: 'C1', t0: 2.54, pre: 0.5,
    init(at) {
      const S = P.stage(120);
      road(S, 0, 40, 9);
      road(S, 60, 120, 10);
      const c = hero(S, 648 - 190 * 0.5, 137, { top: 190 });
      c.vx = 190; c.smoke = 0.5; c.land = 1.3;
      S.c = c;
      at(0, (S) => { c.vy = 120; c.va = 1.3; });
      at(0.12, (S) => {
        const col = Math.floor((c.x - 20) / CELL), row = Math.floor((c.y + 12) / CELL) + 1;
        S.catch1 = [col, row];
        Stage.place(S, 'I4', 0, col, row, 0, { sparks: 8 });
        Stage.place(S, 'I4', 0, col + 4, row, 0, { sparks: 4 });
      });
      return S;
    },
    update(S, lt, st) {
      const c = S.c, row = Math.floor((c.y + 12) / CELL) + 1;
      S.hand = flick(S, 'I4', 0, -0.05, 0.12, [c.x - S.camX + 4, row * CELL + 8 + 34]);
    },
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.4], [0.4, 1.9]], lt), rot: key([[0, -0.12], [0.4, -0.03]], lt), fy: c.y + 8 }); },
    hud(ctx, S, lt, st) { Stage.drawHand(ctx, S, st); },
  });

  // C2: short of the next roof, a launch ramp catches the car and flings it up
  shot({
    name: 'C2', t0: 2.94, pre: 0.5,
    init(at) {
      const S = P.stage(120);
      road(S, 0, 30, 8);
      road(S, 62, 120, 7);
      const c = hero(S, 490 - 200 * 0.5, 121, { top: 210 });
      c.vx = 205; c.land = 1.2;
      S.c = c;
      at(0, (S) => { c.vy = 90; c.va = 0.7; });
      at(0.1, (S) => {
        const col = Math.floor((c.x - 14) / CELL), row = Math.floor((c.y + 12) / CELL) + 1;
        Stage.place(S, 'LAUNCH', 0, col, row - 1, 0, { sparks: 8 });
      });
      return S;
    },
    update(S, lt, st) {
      const c = S.c, row = Math.floor((c.y + 12) / CELL);
      S.hand = flick(S, 'LAUNCH', 0, -0.06, 0.1, [c.x - S.camX + 16, row * CELL + 16 + 34]);
    },
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 2.0], [0.42, 2.5]], lt), rot: key([[0, 0.12], [0.42, 0.05]], lt), fy: c.y }); },
    hud(ctx, S, lt, st) { Stage.drawHand(ctx, S, st); },
    post: () => ({ tint: [0.7, 1, 1], tintAmt: 0.08 }),
  });

  // C3: nose dive off a tall roof; a down ramp catches it, a steep kicker throws it to the sky on "limit"
  shot({
    name: 'C3', t0: 3.36, pre: 0.5,
    init(at) {
      const S = P.stage(140);
      road(S, 0, 34, 7);
      road(S, 34, 140, 11);
      const c = hero(S, 552 - 200 * 0.5, 105, { top: 215 });
      c.vx = 205; c.land = 1.5; c.smoke = 0.8;
      S.c = c;
      at(0, (S) => { c.vy = 70; c.va = 1.0; });
      at(0.06, (S) => {
        const col = Math.floor((c.x - 10) / CELL), row = Math.floor((c.y + 18) / CELL);
        S.rampAt = [col, row];
        Stage.place(S, 'RAMP', 1, col, row, 0, { sparks: 8 });
      });
      at(0.2, (S) => {
        const [col, row] = S.rampAt;
        Stage.place(S, 'STEEP', 0, col + 3, row - 1, 0, { sparks: 10 });
      });
      return S;
    },
    speed: rate([[0, 1.15], [0.34, 0.34]]),
    update(S, lt, st) {
      const c = S.c;
      const t = S.t - S.shot.pre;
      if (!S.rampAt) S.hand = flick(S, 'RAMP', 1, -0.1, 0.06, [c.x - S.camX + 10, c.y + 26 + 34]);
      else {
        const [col, row] = S.rampAt;
        S.hand = P.hand([
          { t: 0.06, x: col * CELL - S.camX + 30, y: row * CELL + 60 },
          { t: 0.2, x: (col + 4) * CELL - S.camX, y: (row - 1) * CELL + 16 + 34, drag: true, id: 'STEEP' },
          { t: 0.2, x: (col + 4) * CELL - S.camX, y: (row - 1) * CELL + 50, hold: 0.25 },
        ], t);
      }
    },
    cam(S, lt) { const c = S.c; return follow(S, c.x, c.y, { z: key([[0, 1.9], [0.34, 2.5], [0.68, 2.1]], lt), rot: key([[0, -0.05], [0.68, 0.11]], lt), fy: c.y + 2 }); },
    hud(ctx, S, lt, st) { Stage.drawHand(ctx, S, st); },
    post: (S, lt) => ({ rgb: lt > 0.34 ? 7 : 0, bloom: lt > 0.34 ? 0.8 : 0.55 }),
  });
})();
