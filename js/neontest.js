// Neon test scene (neon.html): drops straight into a painted level and shows the paint balance,
// so the "cans always get you to the next safety island" rule can be checked while playing.
(function () {
  const { CELL, ROWS } = World;
  const LEVELS = [4, 9, 14, 19];
  let li = 0;

  function start(i) {
    li = i;
    Particles.clear();
    Game.startRace(LEVELS[li]);
    Audio8.startMusic('race');
  }

  // the title tap and every "to the garage" button restart the test instead
  Game.toGarage = () => start(li);

  // columns with no generated block at all: the distance the player has to paint across
  function gapPx(w, x0, x1) {
    const c0 = Math.max(0, Math.floor(x0 / CELL)), c1 = Math.min(w.cols - 1, Math.ceil(x1 / CELL));
    let n = 0;
    for (let c = c0; c <= c1; c++) {
      let solid = false;
      for (let r = 0; r < ROWS && !solid; r++) if (w.type[r * w.cols + c]) solid = true;
      if (!solid) n++;
    }
    return n * CELL;
  }

  function nextIslandX(w, x) {
    let best = w.finishX;
    for (const s of w.islands) { const sx = s.c0 * CELL; if (sx > x + 8 && sx < best) best = sx; }
    return best;
  }

  window.Debug = {
    draw(ctx, E) {
      ctx.save();
      ctx.translate(E.ox, E.oy);
      const L = Game.level, w = Game.world;
      if (Game.state === 'title') {
        Font.draw(ctx, 'ТЕСТ НЕОНОВОГО РЕЖИМУ', 240, 210, '#29e0d0', 1, 'center');
        ctx.restore();
        return;
      }
      const y0 = 28;
      ctx.fillStyle = '#05030cd0'; ctx.fillRect(2, y0 - 2, 232, L && L.draw ? 50 : 22);
      ctx.fillStyle = '#29e0d0'; ctx.fillRect(2, y0 - 2, 232, 1);
      Font.draw(ctx, 'ТЕСТ: РІВЕНЬ ' + (L ? L.n : '?') + (L && L.draw ? ' - НЕОН' : ' - БЛОКИ'), 6, y0 + 1, '#ffffff', 1);
      if (L && L.draw && w) {
        const P = L.paint, p = Game.player;
        const isl = nextIslandX(w, p.x);
        const need = gapPx(w, p.x, isl);
        const cans = w.nitros.filter((n) => !n.taken && n.x > p.x && n.x < isl).length;
        const have = Game.paint + cans * P.max * P.can;
        const ok = have >= need;
        Font.draw(ctx, 'ФАРБА ' + Math.round(Game.paint) + '/' + P.max, 6, y0 + 13, '#9fdcff', 1);
        Font.draw(ctx, 'ЛІНІЙ ' + w.ink.segs.length, 116, y0 + 13, '#b9a8e0', 1);
        Font.draw(ctx, 'БАЛОНИ ' + cans + '/' + w.nitros.length, 6, y0 + 25, '#b9a8e0', 1);
        Font.draw(ctx, 'ТРЕБА ' + need + ' Є ' + Math.round(have), 116, y0 + 25, ok ? '#9bf08a' : '#ff5c7a', 1);
        Font.draw(ctx, ok ? 'ДО ОСТРОВА ЗАПАС X' + (need > 0 ? (have / need).toFixed(1) : '-') : 'ДО ОСТРОВА НЕ ВИСТАЧАЄ!', 6, y0 + 37, ok ? '#9bf08a' : '#ff5c7a', 1);
      }
      LEVELS.forEach((n, i) => {
        E.button(246 + i * 40, y0 - 2, 38, 14, 'РІВ ' + n, i === li ? '#29e0d0' : '#9d8cff', () => start(i));
      });
      E.button(246, y0 + 14, 78, 14, 'СПОЧАТКУ', '#ffc31f', () => start(li));
      E.button(328, y0 + 14, 78, 14, Game.paint > 0 ? 'ЗЛИТИ ФАРБУ' : 'ПОВНИЙ БАК', '#ff7cc6', () => {
        Game.paint = Game.paint > 0 ? 0 : Game.paintMax;
      });
      ctx.restore();
    },
  };
})();
