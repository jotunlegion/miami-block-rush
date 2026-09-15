// Neon mode (levels 4, 9, 14, ...): the player paints the road instead of placing blocks.
// Paint is a limited tank measured in pixels of line; cans on the track refill it.
(function () {
  const CELL = World.CELL, FIELD_H = World.FIELD_H;
  const STEP = 2.5;        // shortest recorded step of a stroke, px
  const DEF = { max: 144, can: 0.2 };

  const brushes = {}, cansImg = {};

  // round neon brush: team colours with a dark outline, the white core is stamped separately
  function brush(gi) {
    if (brushes[gi]) return brushes[gi];
    const p = Art.teamPal(gi), S = 9, m = 4;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - m, y - m);
        const col = d <= 2.4 ? p.hi : d <= 3.4 ? p.main : d <= 4.3 ? p.dark : null;
        if (!col) continue;
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    return (brushes[gi] = c);
  }

  function canImg(gi) {
    if (cansImg[gi]) return cansImg[gi];
    const p = Art.teamPal(gi);
    return (cansImg[gi] = Art.fromRows([
      '...KK...',
      '..KHHK..',
      '.KMMMMK.',
      'KMLMMMmK',
      'KMLMMMmK',
      'KWWWWWWK',
      'KMLMMMmK',
      'KMLMMMmK',
      'KMLMMMmK',
      '.KMMMMK.',
      '..KKKK..',
    ], { K: '#0c0820', H: '#c9d2e0', M: p.main, L: p.hi, m: p.dark, W: '#ffffff' }));
  }

  const Paint = {
    canImg,

    // ---------------- reserve ----------------
    cfg(game) { return (game.level && game.level.paint) || DEF; },
    reset(game) { game.paintMax = this.cfg(game).max; game.paint = game.paintMax; game.ink = null; game.dryT = 0; },
    frac(game) { return game.paintMax ? game.paint / game.paintMax : 0; },

    // a can tops the tank up by a fifth
    pickCan(game, n) {
      const share = this.cfg(game).can;
      game.paint = Math.min(game.paintMax, game.paint + game.paintMax * share);
      Particles.text(n.x, n.y - 9, '+' + Math.round(share * 100) + '% ФАРБИ', Art.teamPal(game.gi).hi);
      Particles.spark(n.x, n.y, 12, [Art.teamPal(game.gi).hi, '#ffffff'], 80);
      Audio8.sfx.pickup(2);
    },

    // running dry and dying gives half a tank back - the money penalty still applies
    onDeath(game, car) {
      if (!car.isPlayer || game.paint >= game.paintMax * 0.5) return;
      game.paint = game.paintMax * 0.5;
      Particles.text(car.x, car.y - 40, 'ФАРБА +50%', Art.teamPal(game.gi).hi);
    },

    // ---------------- stroke ----------------
    // unlike a dragged block, the line lands exactly under the finger, not above it
    tip(game, q) { return { x: q.x + game.camX, y: q.y }; },

    // no painting through a car, a cop or the helicopter, and not outside the field
    blocked(game, x, y) {
      if (y < 10 || y > FIELD_H - 2 || x < 6) return true;
      const hit = (b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
      for (const c of game.cars) if ((c.active || c.state === 'finished') && hit(c.bbox())) return true;
      for (const q of game.police) if (q.car.active && hit(q.car.bbox())) return true;
      if (game.heli && hit(game.heli.rect())) return true;
      return false;
    },

    down(game, id, q) {
      if (game.paint <= 0.5) { this.dry(game); return; }
      const p = this.tip(game, q);
      game.ink = { id, x: p.x, y: p.y, on: !this.blocked(game, p.x, p.y), spent: 0, beep: 0 };
    },

    move(game, q) {
      const s = game.ink;
      if (!s) return;
      const p = this.tip(game, q);
      let dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
      if (d < STEP) return;
      if (game.paint <= 0) { s.x = p.x; s.y = p.y; s.on = false; return; }
      // the last drop of paint stops the line mid-move
      if (d > game.paint) { const k = game.paint / d; dx *= k; dy *= k; d = game.paint; }
      const nx = s.x + dx, ny = s.y + dy;
      const free = !this.blocked(game, nx, ny);
      if (free && s.on) {
        World.inkAdd(game.world, s.x, s.y, nx, ny, game.gi);
        game.burnPickups(s.x, s.y, nx, ny);   // money and cans under the line are lost
        game.paint = Math.max(0, game.paint - d);
        s.spent += d;
        if ((s.beep -= d) <= 0) { s.beep = 13; Audio8.sfx.spray(this.frac(game)); }
        if (game.paint <= 0) this.dry(game);
      }
      s.x = nx; s.y = ny; s.on = free;
    },

    up(game) { game.ink = null; },

    dry(game) {
      if (game.dryT > 0) return;
      game.dryT = 1.6;
      game.banner = { text: 'ФАРБА СКІНЧИЛАСЬ!', color: '#ff5c7a', t: 1.4 };
      Audio8.sfx.dry();
    },

    update(dt, game) { if (game.dryT > 0) game.dryT -= dt; },

    // ---------------- drawing ----------------
    // world space: called from drawWorld with the camera translate already applied
    drawInk(ctx, w, camX, time, left, right) {
      const ink = w.ink;
      if (!ink || !ink.segs.length) return;
      const c0 = Math.max(0, ((left / CELL) | 0) - 1), c1 = Math.min(w.cols - 1, ((right / CELL) | 0) + 1);
      const mark = ++ink.frame, cores = ink.buf, flow = Math.floor(time * 26);
      cores.length = 0;
      let k = 0;
      for (let c = c0; c <= c1; c++) {
        const list = ink.cols[c];
        if (!list) continue;
        for (let j = 0; j < list.length; j++) {
          const s = list[j];
          if (s.mark === mark) continue;
          s.mark = mark;
          // one stamp every ~3px: the brush is 9px wide, so the line still reads solid.
          // the end point is left to the next segment of the stroke
          const b = brush(s.gi), n = Math.max(1, Math.round(s.len / 3));
          for (let i = 0; i < n; i++) {
            const t = i / n;
            const x = Math.round(s.x0 + s.dx * t - camX), y = Math.round(s.y0 + s.dy * t);
            ctx.drawImage(b, x - 4, y - 4);
            cores.push(x, y, (k++ + flow) % 17 === 0 ? 1 : 0);
          }
        }
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < cores.length; i += 3) {
        if (cores[i + 2]) ctx.fillRect(cores[i] - 1, cores[i + 1] - 1, 3, 3);
        else ctx.fillRect(cores[i], cores[i + 1], 1, 1);
      }
    },

    // the pen: ticks set wide enough to stay visible around a fingertip
    drawTip(ctx, game, camX, time) {
      const s = game.ink;
      if (!s) return;
      const X = Math.round(s.x - camX), Y = Math.round(s.y);
      const out = game.paint <= 0 || !s.on;
      ctx.fillStyle = out ? '#ff5c7a' : Art.teamPal(game.gi).hi;
      const k = 8 + (Math.floor(time * 8) % 2);
      ctx.fillRect(X - k - 5, Y, 5, 1); ctx.fillRect(X + k + 1, Y, 5, 1);
      ctx.fillRect(X, Y - k - 5, 1, 5); ctx.fillRect(X, Y + k + 1, 1, 5);
    },

    // the tank, drawn in the tray where the piece slots sit in block levels
    drawGauge(ctx, game, x, y, w, h, time) {
      const pal = Art.teamPal(game.gi), f = this.frac(game), low = f <= 0.2;
      const blink = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = '#1f0c3e'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = low && blink ? '#ff5c7a' : pal.main;
      ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
      Font.draw(ctx, 'ФАРБА', x + 6, y + 5, low && blink ? '#ff5c7a' : '#ffffff', 1);
      Font.draw(ctx, Math.round(f * 100) + '%', x + w - 6, y + 5, low ? '#ff5c7a' : pal.hi, 1, 'right');
      const hint = game.paint <= 0 ? 'РОЗБИТА ТАЧКА ПОВЕРТАЄ ПІВБАКА' : low ? 'ЗБИРАЙ БАЛОНИ +20%' : 'МАЛЮЙ ПАЛЬЦЕМ - ЛІНІЯ СТАЄ ДОРОГОЮ';
      Font.draw(ctx, hint, x + w / 2, y + 5, low && blink ? '#ffc31f' : '#8a7aa8', 1, 'center');
      // five cells, one per can
      const bx = x + 6, by = y + 16, bw = w - 12, bh = h - 22, cw = (bw - 8) / 5;
      for (let i = 0; i < 5; i++) {
        const cx = Math.round(bx + i * (cw + 2));
        ctx.fillStyle = '#12082a'; ctx.fillRect(cx, by, Math.round(cw), bh);
        const part = Math.max(0, Math.min(1, f * 5 - i));
        if (part <= 0) continue;
        const fw = Math.max(1, Math.round(cw * part));
        ctx.fillStyle = pal.dark; ctx.fillRect(cx, by, fw, bh);
        ctx.fillStyle = pal.main; ctx.fillRect(cx, by + 1, fw, bh - 3);
        ctx.fillStyle = pal.hi; ctx.fillRect(cx, by + 1, fw, 1);
        if (Math.floor(time * 8 + i) % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + fw - 2, by + 1, 2, bh - 3); }
      }
    },
  };

  window.Paint = Paint;
})();
