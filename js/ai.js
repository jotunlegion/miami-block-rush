// NPC path builders and police pursuit (police are real physics cars that build or reuse paths)
(function () {
  const { CELL, PIECES, cellAt } = World;
  // on a neon level the road is painted ink, not grid cells, so probe the cell for real
  const filled = (w, c, r) => (w.ink
    ? World.isSolid(w, c * CELL + 8, r * CELL + 3) || World.isSolid(w, c * CELL + 8, r * CELL + 9) || World.isSolid(w, c * CELL + 8, r * CELL + 14)
    : cellAt(w, c, r));
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
      return filled(w, col, sr) || filled(w, col, sr - 1) || filled(w, col, sr + 1);
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
      if (c.state === 'drive' && c.grounded && Math.abs(c.vx) < 30 && filled(w, Math.floor((c.x + 22) / CELL), sr - 1)) { c.jump(); return; }
      if (!c.isPolice && !w.draw && c.nitro >= 3 && c.grounded) {
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
        top *= game.level ? game.level.policeSpeed : 1;
        c.g.top = Math.max(top, 1);
      }
      // a cop that just fined someone brakes for a moment so the racer can get away
      if (this.stun > 0) { this.stun -= dt; c.g.top = 1; }
      this.ai.update(dt);
      if (game.state !== 'race' || c.state !== 'drive') return;
      for (const r of racers) {
        if (r.state !== 'drive') continue;
        const dx = r.x - c.x;
        if (dx > -4 && dx < 30 && Math.abs(r.y - c.y) < 14) game.onCaught(r, this);
      }
    }

    draw(ctx, camX, time) { this.car.draw(ctx, camX, time); }
  }

  // police helicopter (level 20+): randomly speeds up and slows down, dips toward the road and knocks cars around
  class Helicopter {
    constructor(game) {
      this.x = game.player.x - 260; this.y = 30; this.vx = 0;
      this.mood = 0; this.speedMul = 1; this.ty = 40; this.t = 0; this.chop = 0;
      this.hitCd = new Map();
    }

    rect() { return { x: this.x - 21, y: this.y - 9, w: 42, h: 20 }; }

    blocked(w, x, y) {
      for (let sx = -20; sx <= 20; sx += 5) for (let sy = -8; sy <= 10; sy += 6) if (World.isSolid(w, x + sx, y + sy)) return true;
      return false;
    }

    update(dt, game) {
      if (game.state !== 'race') return;
      this.t += dt;
      const w = game.world, p = game.player;
      const racers = game.cars.filter((r) => r.active);
      const ref = p.active ? p : racers[0] || p;
      if ((this.mood -= dt) <= 0) {
        this.mood = 1.2 + Math.random() * 2.2;
        this.speedMul = 0.5 + Math.random() * 1.1;
        this.ty = Math.random() < 0.45 ? 96 + Math.random() * 40 : 24 + Math.random() * 44;
      }
      let mul = this.speedMul;
      const dx = this.x - ref.x;
      if (dx < -240) mul = 1.9;
      else if (dx > 260) mul = 0.35;
      this.vx += (Math.max(70, Math.abs(ref.vx)) * mul - this.vx) * Math.min(1, dt * 1.6);
      if (this.x > w.finishX + 80) this.vx = Math.min(this.vx, 0);
      this.x += this.vx * dt;
      // never fly into the road: climb while the body would overlap blocks
      let ty = this.ty;
      while (ty > 20 && this.blocked(w, this.x + Math.sign(this.vx) * 16, ty)) ty -= 8;
      this.y += (ty + Math.sin(this.t * 2.3) * 3 - this.y) * Math.min(1, dt * 1.4);

      for (const [c, cd] of this.hitCd) this.hitCd.set(c, cd - dt);
      for (const c of game.cars) {
        if (!(c.state === 'drive' || c.state === 'hover') || (this.hitCd.get(c) || 0) > 0) continue;
        if (Math.abs(c.x - this.x) < 18 + c.bw / 2 && Math.abs(c.y - this.y) < 8 + c.bh / 2) {
          this.hitCd.set(c, 0.9);
          const below = c.y > this.y;
          c.vy = below ? Math.max(c.vy, 110) : Math.min(c.vy, -90);
          c.vx = c.vx * 0.5 + (c.x < this.x ? -30 : 20);
          c.va += (Math.random() - 0.5) * 5;
          if (c.state === 'drive') c.damage(0, below ? -c.bh / 2 : c.bh / 2, 2, 80);
          Particles.spark(c.x, below ? c.y - 6 : c.y + 6, 14, ['#ffffff', '#9cc4ff', '#ffc31f'], 90);
          if (c.isPlayer) { Audio8.sfx.thud(1); game.shake(3); Particles.text(c.x, c.y - 20, 'ВЕРТОЛІТ!', '#9cc4ff'); }
        }
      }
      // rotor wash when it flies low
      if (this.y > 88 && Math.random() < dt * 18) Particles.smoke(this.x + (Math.random() - 0.5) * 34, this.y + 14 + Math.random() * 10, '#6a5a8a');
      if ((this.chop -= dt) <= 0) { this.chop = 0.085; Audio8.sfx.chop(Math.max(0, 1 - Math.abs(this.x - p.x) / 320)); }
    }

    draw(ctx, camX, time) {
      const X = Math.round(this.x - camX), Y = Math.round(this.y);
      if (X < -120 || X > 720) return;
      // searchlight sweeping the road, drawn in whole pixel rows
      const sweep = Math.sin(time * 1.3) * 0.25;
      ctx.fillStyle = '#fff3a0';
      ctx.globalAlpha = 0.11;
      for (let dy = 0; dy < 76; dy++) {
        const wd = 3 + dy * 0.62, cx = X + 9 + dy * (0.35 + sweep);
        ctx.fillRect(Math.round(cx - wd / 2), Y + 3 + dy, Math.round(wd), 1);
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(Art.heli, X - 20, Y - 7);
      const f = Math.floor(time * 24) % 2;
      ctx.fillStyle = '#c9cfe6';
      if (f) { ctx.fillRect(X - 23, Y - 8, 46, 1); ctx.fillRect(X - 19, Y - 6, 1, 5); }
      else { ctx.fillRect(X - 8, Y - 8, 17, 1); ctx.fillRect(X - 22, Y - 4, 7, 1); }
      ctx.fillStyle = '#0b0718'; ctx.fillRect(X - 1, Y - 8, 3, 1);
      const b = Math.floor(time * 6) % 2;
      ctx.fillStyle = b ? '#ff2a3a' : '#2f6bff'; ctx.fillRect(X - 3, Y - 6, 2, 1);
      ctx.fillStyle = b ? '#2f6bff' : '#ff2a3a'; ctx.fillRect(X + 2, Y - 6, 2, 1);
    }
  }

  window.Helicopter = Helicopter;
  window.AIBuilder = AIBuilder;
  window.Police = Police;
})();
