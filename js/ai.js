// NPC path builders and police pursuit (police are real physics cars that build or reuse paths)
(function () {
  const { CELL, PIECES, cellAt } = World;
  const SHAPES = {
    I4: PIECES[0].v[0], I3: PIECES[1].v[0], I2: PIECES[2].v[0],
    RAMP_UP: PIECES[3].v[0], RAMP_DOWN: PIECES[3].v[1], GLIDE: PIECES[4].v[0],
  };

  class AIBuilder {
    constructor(car, game, skill) {
      this.car = car; this.game = game;
      this.skill = Object.assign({ delay: 0.6, look: 1.6, mistake: 0.06 }, skill);
      this.t = 0.3 + Math.random() * 0.5;
    }

    hasSupport(col, sr) {
      const w = this.game.world;
      return cellAt(w, col, sr) || cellAt(w, col, sr - 1) || cellAt(w, col, sr + 1);
    }

    update(dt) {
      const c = this.car, g = this.game, w = g.world;
      if (!(c.state === 'drive' || c.state === 'hover' || c.state === 'ready')) return;
      if (g.state !== 'race' && g.state !== 'countdown') return;
      this.t -= dt;
      if (this.t > 0) return;
      this.t = this.skill.delay * (0.7 + Math.random() * 0.6);
      if (c.x > w.finishX - 60) return;

      let sr = c.grounded ? Math.round((c.y + 8) / CELL) : Math.floor((c.y + 8) / CELL) + 1;
      sr = Math.max(3, Math.min(11, sr));
      // unstick: hop over a wall; use full nitro on a clear stretch
      if (c.state === 'drive' && c.grounded && Math.abs(c.vx) < 30 && cellAt(w, Math.floor((c.x + 22) / CELL), sr - 1)) { c.jump(); return; }
      if (!c.isPolice && c.nitro >= 3 && c.grounded) {
        let clear = true;
        for (let k = 1; k <= 14 && clear; k++) if (!this.hasSupport(Math.floor(c.x / CELL) + k, sr)) clear = false;
        if (clear) c.useNitro();
      }
      const speed = Math.max(c.vx, 45);
      const c0 = Math.floor((c.x + 16) / CELL), c1 = Math.floor((c.x + 16 + speed * this.skill.look) / CELL);

      for (let col = c0; col <= c1; col++) {
        if (cellAt(w, col, sr - 1) === 1 && !cellAt(w, col - 1, sr - 1)) {
          if (g.tryPlace(SHAPES.GLIDE, col - 2, sr - 1, c.gi)) return;
          continue;
        }
        if (this.hasSupport(col, sr)) continue;
        if (Math.random() < this.skill.mistake) { this.t += 0.6; return; }
        const bag = c.isPolice ? null : w.bags.find((b) => !b.taken && b.x > c.x + 30 && b.x < c.x + 300);
        const opts = [];
        if (bag) {
          const br = Math.floor(bag.y / CELL);
          if (br < sr - 1 && sr > 4) opts.push([SHAPES.RAMP_UP, col, sr - 1]);
          if (br > sr + 1 && sr < 10) opts.push([SHAPES.RAMP_DOWN, col, sr]);
        }
        opts.push([SHAPES.I4, col, sr], [SHAPES.I3, col, sr], [SHAPES.I2, col, sr], [SHAPES.I3, col + 1, sr]);
        for (const [shape, cc, rr] of opts) {
          if (g.tryPlace(shape, cc, rr, c.gi)) return;
        }
        return;
      }
    }
  }

  const POLICE_DEF = { key: 'police', name: 'POLICE', top: 110, accel: 230, mass: 0.9, armor: 130, restComp: 2.6, damp: 0.35, stats: [0, 0, 0, 0] };

  class Police {
    constructor(world, x, game, idx) {
      this.idx = idx;
      this.car = new Car(world, Object.assign({}, POLICE_DEF), x, 128, false);
      this.ai = new AIBuilder(this.car, game, { delay: 0.8 + idx * 0.12, look: 1.5, mistake: 0.1 });
    }

    get x() { return this.car.x; }
    get y() { return this.car.y; }

    update(dt, game) {
      const c = this.car;
      const racers = game.cars.filter((r) => r.state !== 'busted' && r.state !== 'finished');
      if (game.state === 'race' && c.state === 'ready' && game.raceTime > 2 + this.idx * 0.7) c.state = 'drive';
      if (racers.length && game.state === 'race') {
        const rear = racers.reduce((m, r) => (r.x < m.x ? r : m), racers[0]);
        const avgTop = game.cars.reduce((s, r) => s + r.g.top, 0) / game.cars.length;
        const gap = rear.x - c.x;
        let top = gap > 360 ? avgTop * 1.15 : gap < 90 ? avgTop * 0.8 : avgTop * 0.9;
        top *= Math.min(1, 0.65 + game.raceTime / 30); // pressure ramps up
        if (gap < -10) top = 8; // never run ahead of the pack, just wait
        if (c.x > c.w.finishX - 90) top = 0;
        c.g.top = Math.max(top, 1);
      }
      this.ai.update(dt);
      if (game.state !== 'race' || c.state !== 'drive') return;
      for (const r of racers) {
        if (r.state !== 'drive') continue;
        const dx = r.x - c.x;
        if (dx > -4 && dx < 30 && Math.abs(r.y - c.y) < 14) game.onBusted(r);
      }
    }

    draw(ctx, camX, time) { this.car.draw(ctx, camX, time); }
  }

  window.AIBuilder = AIBuilder;
  window.Police = Police;
})();
