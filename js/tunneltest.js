// Tunnel test scene (tunnel.html): drops straight into a tunnel level and shows the wall
// spacing in reaction time, so the "the player can physically answer at top speed" rule
// can be checked while playing.
(function () {
  const { CELL } = World;
  const LEVELS = [8, 23, 68, 308];      // 1st, 2nd, 5th and 21st tunnel level (the difficulty peak)
  let li = 0;

  function start(i) {
    li = i;
    Particles.clear();
    Game.startRace(LEVELS[li]);
    Audio8.startMusic('race');
  }

  Game.toGarage = () => start(li);

  // shortest run-up between two walls in the player's tunnel, in seconds at top speed
  function spacing(w, ti, top) {
    const walls = w.tunnels[ti].walls;
    let min = Infinity;
    for (let i = 1; i < walls.length; i++)
      min = Math.min(min, (walls[i].col - (walls[i - 1].col + walls[i - 1].w)) * CELL);
    return { px: min === Infinity ? 0 : Math.round(min), s: min === Infinity ? 0 : +(min / top).toFixed(1) };
  }

  window.Debug = {
    draw(ctx, E) {
      ctx.save();
      ctx.translate(E.ox, E.oy);
      const L = Game.level, w = Game.world;
      if (Game.state === 'title') {
        Font.draw(ctx, 'ТЕСТ ТУНЕЛЬНОГО РЕЖИМУ', 240, 210, '#ff8a3d', 1, 'center');
        ctx.restore();
        return;
      }
      const y0 = 28, tun = L && L.tunnel && w && w.tunnels;
      ctx.fillStyle = '#05030cd0'; ctx.fillRect(2, y0 - 2, 236, tun ? 50 : 22);
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(2, y0 - 2, 236, 1);
      Font.draw(ctx, 'ТЕСТ: РІВЕНЬ ' + (L ? L.n : '?') + (tun ? ' - ТУНЕЛІ #' + (L.tunnel.d + 1) : ' - ЗВИЧАЙНИЙ'), 6, y0 + 1, '#ffffff', 1);
      if (tun) {
        const p = Game.player, t = w.tunnels[p.tunnel];
        const left = t.walls.filter((q) => !Tunnel.open(w, q)).length;
        const wall = Tunnel.nextWall(w, p.tunnel, p.x);
        const sp = spacing(w, p.tunnel, p.g.top);
        Font.draw(ctx, 'СТІН ' + left + '/' + t.walls.length, 6, y0 + 13, '#ffd08a', 1);
        Font.draw(ctx, 'ДОВЖИНА ' + w.cols + ' КЛ', 116, y0 + 13, '#b9a8e0', 1);
        Font.draw(ctx, 'РОЗБІГ МІН ' + sp.px + 'ПКС = ' + sp.s + 'С', 6, y0 + 25, sp.s >= 2 ? '#9bf08a' : '#ff5c7a', 1);
        if (wall) {
          const d = Math.round(wall.col * CELL - p.x);
          const need = Tunnel.need(w, wall).map((h) => World.PIECES[h.p].id).join(' ');
          Font.draw(ctx, 'СТІНА ' + wall.w + 'КЛ ЧЕРЕЗ ' + d + ' ТРЕБА ' + (need || '-'), 6, y0 + 37, '#ffffff', 1);
        } else Font.draw(ctx, 'ПОПЕРЕДУ ЧИСТО', 6, y0 + 37, '#9bf08a', 1);
      }
      LEVELS.forEach((n, i) => {
        E.button(246 + i * 40, y0 - 2, 38, 14, 'РІВ ' + n, i === li ? '#ff8a3d' : '#9d8cff', () => start(i));
      });
      E.button(246, y0 + 14, 78, 14, 'СПОЧАТКУ', '#ffc31f', () => start(li));
      E.button(328, y0 + 14, 78, 14, 'ЗБИТИ СТІНУ', '#29e0d0', () => {
        const p = Game.player, wall = tun && Tunnel.nextWall(w, p.tunnel, p.x);
        if (!wall) return;
        for (const h of Tunnel.need(w, wall)) Game.tryPlace(World.PIECES[h.p].v[h.v], h.col, h.row, Game.gi, true);
      });
      ctx.restore();
    },
  };
})();
