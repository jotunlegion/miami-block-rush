// Tunnel mode (levels 8, 23, 38, ...): three parallel tunnels, one per racer, blocked by
// walls of laid blocks that are missing one or two pieces. Drop the missing pieces in and
// the filled columns clear Tetris style, which opens the way through.
(function () {
  const { CELL, ROWS, PIECES, cellAt } = World;
  const WALL = 6;                     // owner index for wall blocks: its own warning palette

  // A hole is cut with these pieces only: full cells, and each of them covers every column
  // it spans, so filling the hole always completes every column of the wall. A perfectly
  // timed jump can still thread a narrow wall through its hole - that stays in as a skill
  // shortcut: the window is a few pixels wide and missing it wrecks the car.
  const HOLES = [
    { p: 0, v: 0 }, { p: 1, v: 0 }, { p: 2, v: 0 },                   // I4 I3 I2
    { p: 8, v: 0 }, { p: 8, v: 1 },                                   // T
    { p: 9, v: 0 }, { p: 9, v: 1 }, { p: 9, v: 2 }, { p: 9, v: 3 },   // L
  ];
  const shapeOf = (h) => PIECES[h.p].v[h.v];

  const Tunnel = {
    WALL,

    // ---------------- layout ----------------
    // three decks: ceiling row 0, then interior rows i*4+1..i*4+3 over a floor at i*4+4
    layout(w, cfg, r, set, bag) {
      const cols = w.cols, T = cfg.tunnel;
      w.tunnels = [];
      for (let i = 0; i < 3; i++)
        w.tunnels.push({ i, top: i * 4 + 1, bottom: i * 4 + 3, floor: i * 4 + 4, walls: [] });
      for (let c = 0; c < cols; c++) {
        set(c, 0, 1);
        for (const t of w.tunnels) set(c, t.floor, 1);
      }
      w.walls = [];
      const from = 28, to = cols - 36;
      for (const t of w.tunnels) {
        let c = from + Math.floor(r() * 16);
        while (c < to) {
          const wall = this.build(w, t, c, r, T, set);
          w.walls.push(wall);
          t.walls.push(wall);
          c += wall.w + T.gap[0] + Math.floor(r() * (T.gap[1] - T.gap[0] + 1));
        }
        // money along the driving row, some of it one row up so it needs a hop
        let m = 20;
        while (m < cols - 30) {
          const high = r() < 0.3;
          const row = high ? t.bottom - 1 : t.bottom;
          if (!cellAt(w, m, row) && !cellAt(w, m, t.bottom)) bag(m, row, high ? 250 : 100);
          m += 7 + Math.floor(r() * 7);
        }
        // a canister here and there: speed in a tunnel is a gamble
        let nz = 40 + Math.floor(r() * 20);
        while (T.nitro && nz < cols - 40) {
          if (!cellAt(w, nz, t.bottom)) w.nitros.push({ x: nz * CELL + 8, y: t.bottom * CELL + 8, taken: false, t: r() * 6 });
          nz += 26 + Math.floor(r() * 22);
        }
      }
      return w;
    },

    // a slab across the tunnel with one or two piece shaped holes cut side by side,
    // never in the driving row, so it always has to be cleared rather than driven through
    build(w, t, col, r, T, set) {
      const picks = [HOLES[Math.floor(r() * HOLES.length)]];
      if (r() < T.two) picks.push(HOLES[Math.floor(r() * HOLES.length)]);
      const width = picks.reduce((s, h) => s + shapeOf(h)[0].length, 0);
      for (let c = col; c < col + width; c++)
        for (let row = t.top; row <= t.bottom; row++) set(c, row, 1, WALL);
      const holes = [];
      let cx = col;
      for (const h of picks) {
        const shape = shapeOf(h);
        // one row pieces sit in either of the two upper rows, two row pieces fill both
        const row = shape.length === 1 ? t.top + Math.floor(r() * 2) : t.top;
        for (let dy = 0; dy < shape.length; dy++)
          for (let dx = 0; dx < shape[dy].length; dx++)
            if (shape[dy][dx]) set(cx + dx, row + dy, 0, 0);
        holes.push({ p: h.p, v: h.v, col: cx, row });
        cx += shape[0].length;
      }
      return { t: t.i, col, w: width, top: t.top, bottom: t.bottom, holes };
    },

    // ---------------- state ----------------
    // the car drives along the bottom row, so a wall is passed once every column there is gone
    open(w, wall) {
      for (let c = wall.col; c < wall.col + wall.w; c++) if (cellAt(w, c, wall.bottom)) return false;
      return true;
    },

    nextWall(w, ti, x) {
      const t = w.tunnels[ti];
      if (!t) return null;
      for (const wall of t.walls) {
        if ((wall.col + wall.w) * CELL <= x - 8) continue;
        if (!this.open(w, wall)) return wall;
      }
      return null;
    },

    // the holes that still have an empty cell: exactly what the player is missing
    need(w, wall) {
      const out = [];
      for (const h of wall.holes) {
        const shape = shapeOf(h);
        let gap = false;
        for (let dy = 0; dy < shape.length && !gap; dy++)
          for (let dx = 0; dx < shape[dy].length && !gap; dx++)
            if (shape[dy][dx] && !cellAt(w, h.col + dx, h.row + dy)) gap = true;
        if (gap) out.push(h);
      }
      return out;
    },

    // ---------------- the tetris rule ----------------
    // a piece just landed: every tunnel column it filled from top to bottom clears
    onPlace(game, shape, col, row) {
      const w = game.world;
      const c0 = col, c1 = col + shape[0].length - 1;
      let cleared = 0, last = null;
      for (let c = c0; c <= c1; c++)
        for (const t of w.tunnels) {
          let full = true;
          for (let rr = t.top; rr <= t.bottom && full; rr++) if (!cellAt(w, c, rr)) full = false;
          if (!full) continue;
          this.clearColumn(game, c, t);
          cleared++; last = t;
        }
      if (!cleared) return 0;
      const p = game.player;
      Audio8.sfx.clear(cleared);
      if (last && p && last.i === p.tunnel) {
        game.shake(1 + cleared * 0.4);
        const wall = this.nextWall(w, p.tunnel, p.x);
        const here = w.tunnels[p.tunnel].walls.find((q) => q.col <= c1 && q.col + q.w > c0);
        if (here && this.open(w, here)) game.banner = { text: 'ПРОХІД ВІДКРИТО!', color: '#b6ff6a', t: 1.1 };
      }
      return cleared;
    },

    clearColumn(game, c, t) {
      const w = game.world;
      for (let r = t.top; r <= t.bottom; r++) {
        const i = r * w.cols + c;
        if (!w.type[i]) continue;
        const pal = Art.teamPal(w.owner[i]), X = c * CELL, Y = r * CELL;
        const cols = [pal.hi, pal.main, pal.body, pal.dark];
        for (let k = 0; k < 10; k++) {
          const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 120;
          Particles.voxel(X + 2 + Math.random() * 12, Y + 2 + Math.random() * 12, Math.cos(a) * v, Math.sin(a) * v - 50, cols[k % 4], 1 + Math.random());
        }
        w.type[i] = 0; w.owner[i] = 0;
      }
      Particles.spark(c * CELL + 8, (t.top + 1) * CELL + 8, 8, ['#ffffff', '#ffc31f'], 90);
    },

    // ---------------- the tray ----------------
    // the slot that just freed up is dealt a piece the next wall is actually missing
    deal(game) {
      const w = game.world, p = game.player;
      if (p && p.tunnel != null) {
        const wall = this.nextWall(w, p.tunnel, p.x);
        if (wall)
          for (const h of this.need(w, wall))
            if (!game.tray.some((s) => s.cd <= 0 && s.piece.p === h.p && s.piece.v === h.v)) return { p: h.p, v: h.v };
      }
      return World.randomPiece(Math.random);
    },

    // A tray piece is only ever spent on a wall here, so waiting for a slot to cycle would
    // strand the player. The wall the player is driving at swaps an idle slot for what it is
    // missing, one piece at a time, which is the "always dealt the right piece" rule.
    restock(game, dt) {
      const w = game.world, p = game.player;
      game.restockT = Math.max(0, (game.restockT || 0) - dt);
      if (game.restockT > 0 || !p || p.tunnel == null || game.state !== 'race') return;
      const wall = this.nextWall(w, p.tunnel, p.x);
      if (!wall) return;
      const need = this.need(w, wall);
      if (!need.length) return;
      // one slot per missing piece is protected, every other idle slot can be traded in -
      // three copies of the same needed piece must not lock the other one out
      // a turn of a shape is its own piece now, so a slot only counts as covering a hole when
      // it holds that exact turn: the mirrored ramp is no substitute for the one the wall wants
      const key = (q) => q.p + ':' + q.v;
      const keep = new Set(), donors = [];
      for (let i = 0; i < game.tray.length; i++) {
        const s = game.tray[i];
        if (s.cd > 0) continue;
        const hit = need.find((q) => key(q) === key(s.piece) && !keep.has(key(q)));
        if (hit) keep.add(key(hit));
        else if (i !== game.armed) donors.push(s);   // never swap the piece out of the player's hand
      }
      for (const h of need) {
        if (keep.has(key(h))) continue;
        const slot = donors.shift();
        if (!slot) return;
        slot.piece = { p: h.p, v: h.v };
        slot.flash = 0.5;
        game.restockT = 0.4;
        Audio8.sfx.select();
        return;
      }
    },

    wants(game, piece) {
      const w = game.world, pl = game.player;
      if (!pl || pl.tunnel == null) return false;
      const wall = this.nextWall(w, pl.tunnel, pl.x);
      return !!wall && this.need(w, wall).some((h) => h.p === piece.p && h.v === piece.v);
    },

    // ---------------- rivals ----------------
    ai(game, car, skill) {
      const w = game.world;
      if (car.tunnel == null) return;
      const wall = this.nextWall(w, car.tunnel, car.x);
      if (!wall) return;
      const reach = Math.max(150, Math.abs(car.vx) * (skill.look || 1.6));
      if (wall.col * CELL - car.x > reach) return;
      const need = this.need(w, wall);
      if (!need.length || Math.random() < skill.mistake) return;
      const h = need[0];
      game.tryPlace(shapeOf(h), h.col, h.row, car.gi, true);
    },

    // ---------------- hints ----------------
    // the hole the player has to fill next, outlined so it reads at speed
    drawHints(ctx, game, camX, time) {
      const w = game.world, p = game.player;
      if (!p || p.tunnel == null) return;
      const wall = this.nextWall(w, p.tunnel, p.x);
      if (!wall) return;
      const pal = Art.TEAM[game.gi], a = 0.4 + 0.35 * Math.sin(time * 9);
      ctx.globalAlpha = a;
      ctx.fillStyle = pal.hi;
      for (const h of this.need(w, wall)) {
        const shape = shapeOf(h);
        for (let dy = 0; dy < shape.length; dy++)
          for (let dx = 0; dx < shape[dy].length; dx++) {
            if (!shape[dy][dx] || cellAt(w, h.col + dx, h.row + dy)) continue;
            const X = (h.col + dx) * CELL - camX, Y = (h.row + dy) * CELL;
            ctx.fillRect(X, Y, CELL, 1); ctx.fillRect(X, Y + CELL - 1, CELL, 1);
            ctx.fillRect(X, Y, 1, CELL); ctx.fillRect(X + CELL - 1, Y, 1, CELL);
          }
      }
      ctx.globalAlpha = 1;
    },
  };

  window.Tunnel = Tunnel;
})();
