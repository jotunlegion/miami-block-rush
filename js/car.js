// Car physics (raycast suspension + rigid body), voxel destruction, particles
(function () {
  const GRAV = 420, AIR_UP = 0.3, AIR_DOWN = 0.42, LAUNCH_BOOST = 1.3;
  const { isSolid, normalAt } = World;

  const GANGS = [
    { key: 'vice', name: 'OCEAN DRIVE', title: 'СУПЕРКАР', desc: 'ШВИДКИЙ, АЛЕ КРИХКИЙ',
      top: 138, accel: 280, mass: 0.7, armor: 95, restComp: 2.4, damp: 0.45, stats: [5, 5, 2, 2] },
    { key: 'kings', name: 'KENTE KINGS', title: 'ЛОУРАЙДЕР', desc: 'ВАЖКИЙ, НА ГІДРАВЛІЦІ',
      top: 120, accel: 200, mass: 1.1, armor: 150, restComp: 3.2, damp: 0.22, stats: [3, 2, 5, 5] },
    { key: 'havana', name: 'LOS HAVANEROS', title: 'КЛАСИКА', desc: 'ЗБАЛАНСОВАНА ЛЕГЕНДА',
      top: 128, accel: 240, mass: 0.9, armor: 120, restComp: 2.8, damp: 0.35, stats: [4, 4, 4, 3] },
  ];

  // ---------------- particles ----------------
  const P = [];
  const Particles = {
    list: P,
    add(o) { if (P.length < 2500) P.push(o); },
    voxel(x, y, vx, vy, c, life = 2.5 + Math.random() * 2) { this.add({ k: 0, x, y, vx, vy, c, life, max: life, s: 1 }); },
    spark(x, y, n, colors, spd = 90) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random());
        this.add({ k: 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, c: colors[(Math.random() * colors.length) | 0], life: 0.3 + Math.random() * 0.4, max: 0.7, s: 1 });
      }
    },
    smoke(x, y, c = '#3a2a55') { this.add({ k: 2, x, y, vx: (Math.random() - 0.5) * 10, vy: -12 - Math.random() * 10, c, life: 0.8, max: 0.8, s: 2 }); },
    text(x, y, str, c) { this.add({ k: 3, x, y, vx: 0, vy: -22, c, str, life: 1.1, max: 1.1 }); },
    update(dt, w) {
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.life -= dt;
        if (p.life <= 0 || p.y > 400) { P[i] = P[P.length - 1]; P.pop(); continue; }
        if (p.k === 0) {
          p.vy += GRAV * dt;
          const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
          if (isSolid(w, nx, p.y)) { p.vx *= -0.35; } else p.x = nx;
          if (isSolid(w, p.x, ny)) { p.vy *= -0.3; p.vx *= 0.7; if (Math.abs(p.vy) < 12) p.vy = 0; } else p.y = ny;
        } else if (p.k === 1) {
          p.vy += GRAV * 0.4 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        } else {
          p.x += p.vx * dt; p.y += p.vy * dt;
        }
      }
    },
    draw(ctx, camX) {
      for (const p of P) {
        const x = Math.round(p.x - camX), y = Math.round(p.y);
        if (p.k === 3) { Font.draw(ctx, p.str, x, y, p.c, 1, 'center'); continue; }
        if (p.k === 0 && p.life < 0.6 && ((p.life * 20) | 0) % 2) continue;
        ctx.fillStyle = p.c;
        const s = p.k === 2 ? (p.life > 0.4 ? 2 : 1) : p.s;
        ctx.fillRect(x, y, s, s);
      }
    },
    clear() { P.length = 0; },
  };

  // ---------------- car ----------------
  class Car {
    constructor(world, gang, x, y, isPlayer, gi) {
      this.w = world;
      const byIdx = typeof gang === 'number';
      this.gi = gi != null ? gi : byIdx ? gang : 3;
      this.g = byIdx ? GANGS[gang] : gang;
      this.isPolice = this.g.key === 'police';
      this.map = this.g.map || Art.CARS[this.g.key];
      this.bw = this.map.bw || this.map.w; this.bh = this.map.bh || this.map.h;
      this.ox = this.map.ox != null ? this.map.ox : this.map.w / 2;
      this.oy = this.map.oy != null ? this.map.oy : this.map.h / 2;
      this.isPlayer = isPlayer;
      this.m = this.g.mass;
      this.I = ((this.m * (this.bw * this.bw + this.bh * this.bh)) / 12) * 2.5;
      this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.a = 0; this.va = 0;
      this.money = 0; this.bonus = 0; this.place = 0;
      this.state = 'ready'; this.timer = 0;
      this.wrecks = 0; this.falls = 0; this.deaths = 0;
      this.nitro = 0; this.boost = 0; this.jumpCd = 0;
      const k = (this.m * GRAV) / (2 * this.g.restComp);
      this.k = k;
      this.c = 2 * this.g.damp * Math.sqrt((k * this.m) / 2);
      this.L = 9;
      this.wheels = this.map.wheelX.map((lx) => ({ lx, ly: this.map.wheelY - 3, comp: 0, contact: false, dist: 9, spin: 0 }));
      const hw = this.bw / 2 - 0.5, hh = this.bh / 2;
      this.hull = [
        [hw, -1.5, 'front'], [hw, 2, 'front'], [hw - 7, -hh + 3, 'roof'], [0, -hh + 0.5, 'roof'],
        [-hw + 6, -hh + 4, 'roof'], [-hw, -1.5, 'rear'], [-hw, 2, 'rear'], [-7, hh, 'bottom'], [7, hh, 'bottom'],
      ];
      this.repair();
    }

    repair() {
      this.alive = new Uint8Array(this.map.px.length);
      let n = 0;
      this.map.px.forEach((c, i) => { if (c) { this.alive[i] = 1; n++; } });
      this.total = n; this.count = n;
      this.dirty = true;
    }

    get grounded() { return this.wheels.some((w) => w.contact); }
    get active() { return this.state === 'drive' || this.state === 'hover' || this.state === 'ready'; }

    toWorld(lx, ly) {
      const c = Math.cos(this.a), s = Math.sin(this.a);
      return [this.x + lx * c - ly * s, this.y + lx * s + ly * c];
    }

    update(dt, game) {
      if (this.state === 'busted') return;
      if (this.state === 'wreck' || this.state === 'fell') {
        this.timer -= dt;
        if (this.timer <= 0) this.respawn(game);
        return;
      }
      if (this.state === 'finished' && this.stopped) return;
      if (this.jumpCd > 0) this.jumpCd -= dt;
      if (this.jumpT > 0) this.jumpT -= dt;
      if (this.boost > 0) {
        this.boost = Math.max(0, this.boost - dt);
        const [ex, ey] = this.toWorld(-this.map.w / 2, 2);
        Particles.add({ k: 1, x: ex, y: ey, vx: this.vx * 0.3 - Math.cos(this.a) * 120, vy: this.vy * 0.3 - Math.sin(this.a) * 120 + (Math.random() - 0.5) * 30, c: ['#fff3a0', '#ffc31f', '#ff6a1f', '#29d9ff'][(Math.random() * 4) | 0], life: 0.15 + Math.random() * 0.15, max: 0.3, s: 1 });
      }
      this.step(dt, game);
      if (this.state === 'drive') {
        if (!this.grounded) this.airT = (this.airT || 0) + dt;
        else { if (this.airT > 1.1 && game.onStunt) game.onStunt(this, this.airT); this.airT = 0; }
      }
      if (this.state === 'hover') {
        this.timer -= dt;
        if (this.timer <= 0 || this.grounded) this.state = 'drive';
      }
      if (this.state === 'drive' && !this.hold && Math.hypot(this.vx, this.vy) < 14 && this.g.top > 30) {
        this.stuck = (this.stuck || 0) + dt;
        if (this.stuck > 1.5) { this.stuck = 0; this.falls++; Particles.spark(this.x, this.y, 12, ['#ffffff', '#9d8cff']); this.respawn(game); return; }
      } else this.stuck = 0;
      if (this.y > World.FIELD_H + 70) this.fall(game);
      if (this.active && this.grounded && this.state === 'drive') World.recordTrail(this.w, this.x, this.y);
      // money
      if (this.state !== 'wreck' && !this.isPolice) {
        for (const b of this.w.bags) {
          if (b.taken) continue;
          if (Math.abs(b.x - this.x) < 17 && Math.abs(b.y - this.y) < 12) {
            b.taken = true; this.money += b.value;
            Particles.text(b.x, b.y - 8, '+' + b.value, b.big ? '#ffc31f' : '#9bf08a');
            Particles.spark(b.x, b.y, 10, b.big ? ['#ffc31f', '#fff3a0'] : ['#3fbf5a', '#a8f59a']);
            if (this.isPlayer) Audio8.sfx.coin(b.big);
          }
        }
        for (const n of this.w.nitros) {
          if (n.taken || this.nitro >= 3) continue;
          if (Math.abs(n.x - this.x) < 17 && Math.abs(n.y - this.y) < 13) {
            n.taken = true; this.nitro++;
            Particles.text(n.x, n.y - 8, 'НІТРО ' + this.nitro + '/3', '#9fdcff');
            Particles.spark(n.x, n.y, 10, ['#29d9ff', '#ffffff']);
            if (this.isPlayer) Audio8.sfx.pickup(this.nitro);
          }
        }
      }
      if (!this.isPolice && this.state !== 'finished' && this.active && this.x >= this.w.finishX) game.onFinish(this);
    }

    step(dt, game) {
      const m = this.m, I = this.I, g = this.g;
      const cos = Math.cos(this.a), sin = Math.sin(this.a);
      const ux = sin, uy = -cos; // up axis
      const hovering = this.state === 'hover';
      const wasAir = !this.wheels.some((w) => w.contact);
      let fx = 0, fy = hovering ? 0 : GRAV * m * (wasAir ? (this.vy < 0 ? AIR_UP : AIR_DOWN) * (g.air || 1) : 1), tq = 0;
      const throttle = (this.state === 'drive' || hovering) && !this.hold;
      const top = this.boost > 0 ? Math.min(g.top * 3, 480) : g.top, accel = g.accel * (this.boost > 0 ? 2.5 : 1);
      const braking = this.state === 'finished' || this.state === 'ready' || this.hold;
      let anyContact = false, wt = 0, nc = 0;

      for (const wh of this.wheels) {
        const mx = this.x + wh.lx * cos - wh.ly * sin, my = this.y + wh.lx * sin + wh.ly * cos;
        let t = 0, hit = false;
        for (t = 0; t <= this.L; t += 0.5) if (isSolid(this.w, mx - ux * t, my - uy * t)) { hit = true; break; }
        const rx = mx - this.x, ry = my - this.y;
        const pvx = this.vx - this.va * ry, pvy = this.vy + this.va * rx;
        if (hit) {
          anyContact = true;
          const comp = this.L - t;
          const hx = mx - ux * t, hy = my - uy * t;
          const [nx, ny] = normalAt(this.w, hx, hy, 3);
          if (!wh.contact && this.state !== 'ready') {
            const imp = -(pvx * nx + pvy * ny);
            // landing on wheels never wrecks the car, big drops only chip a few voxels
            if (imp > g.armor * 2.2) { this.damage(wh.lx, this.map.wheelY, Math.min(2.5, 1 + (imp - g.armor * 2.2) / 60), imp * 0.5); if (this.isPlayer) Audio8.sfx.thud(1); }
            else if (imp > 60 && this.isPlayer) Audio8.sfx.thud(0.4);
          }
          let f = this.k * comp + (this.c * (comp - wh.comp)) / dt;
          f = Math.max(0, Math.min(f, m * GRAV * 6));
          fx += ux * f; fy += uy * f;
          wt += rx * (uy * f) - ry * (ux * f); nc++;
          let tx = -ny, ty = nx;
          if (tx < 0) { tx = -tx; ty = -ty; }
          const vt = pvx * tx + pvy * ty;
          let d = 0;
          if (throttle) d = accel * m * 0.5 * Math.max(-0.6, Math.min(1, 1 - vt / top)) + (ty < 0 ? -ty * GRAV * m * (g.hill || 0.55) : 0);
          if (braking) d = -Math.sign(vt) * Math.min(Math.abs(vt) * m * 3, g.accel * m);
          d -= vt * 0.04 * m;
          fx += tx * d; fy += ty * d;
          wh.comp = comp; wh.dist = t; wh.contact = true;
          wh.spin += (vt / 3.5) * dt;
        } else {
          wh.comp = 0; wh.dist = this.L; wh.contact = false;
          wh.spin += (this.vx / 3.5) * dt * 0.5;
        }
      }

      tq += nc === 1 ? wt * 0.45 : wt;
      // GTA-style ramp launch: keep momentum when leaving the ground upwards
      if (!anyContact && this.wasGrounded && this.vy < -25 && this.a < -0.2 && this.state === 'drive') {
        const sp = Math.hypot(this.vx, this.vy), boost = (Math.max(sp, g.top) * (g.launch || LAUNCH_BOOST)) / Math.max(sp, 1);
        this.vx *= boost; this.vy *= boost;
      }
      this.wasGrounded = anyContact;
      // nitro: rocket thrust along the heading, works in the air too
      if (this.boost > 0) {
        const hx = Math.cos(this.a), hy = Math.sin(this.a);
        if (this.vx * hx + this.vy * hy < top) { fx += hx * m * 340; fy += hy * m * 340; }
      }
      if (!anyContact) {
        // after a jump the car pushes forward in the air, so it hops up first and then over the wall edge
        if (this.jumpT > 0) this.vx += (g.top * 0.6 - this.vx) * 3 * dt;
        const target = Math.max(-0.3, Math.min(0.3, Math.atan2(this.vy, Math.max(this.vx, 40)) * 0.25));
        let da = target - this.a;
        tq += (da * 3.0 - this.va * 2.5) * I;
        if (hovering) {
          this.vy *= 1 - 4 * dt;
          this.vx += (g.top * 0.6 - this.vx) * 2 * dt;
          tq += (-this.a * 6 - this.va * 3) * I;
        }
      } else tq -= this.va * (this.wheels[0].contact && this.wheels[1].contact ? 1.2 : 3) * I;

      this.vx += (fx / m) * dt; this.vy += (fy / m) * dt; this.va += (tq / I) * dt;
      this.vx *= 1 - 0.05 * dt;
      this.va = Math.max(-9, Math.min(9, this.va));
      this.x += this.vx * dt; this.y += this.vy * dt; this.a += this.va * dt;
      if (this.a > Math.PI) this.a -= Math.PI * 2;
      if (this.a < -Math.PI) this.a += Math.PI * 2;
      if (this.x < 8) { this.x = 8; this.vx = Math.max(0, this.vx); }

      if (braking && Math.abs(this.vx) < 3 && anyContact) this.stopped = true;
      this.collideHull(game);
    }

    collideHull(game) {
      const g = this.g;
      for (const [lx, ly, kind] of this.hull) {
        const [px, py] = this.toWorld(lx, ly);
        if (!isSolid(this.w, px, py)) continue;
        const [nx, ny] = normalAt(this.w, px, py, 3);
        const rx = px - this.x, ry = py - this.y;
        const pvx = this.vx - this.va * ry, pvy = this.vy + this.va * rx;
        const vn = pvx * nx + pvy * ny;
        const ramp = kind !== 'roof' && ny < -0.55 && this.vy < 60 && Math.abs(this.a - Math.atan2(nx, -ny)) < 0.9;
        if (vn < 0) {
          const imp = -vn;
          if (this.state !== 'ready' && !ramp) {
            // landings only wreck when the car hits steeply nose/tail first; walls and roof hits still do
            const landing = ny < -0.55;
            const lim = kind === 'roof' ? g.armor * 0.9 : kind === 'bottom' ? Infinity : landing ? (Math.abs(this.a) > 0.75 ? g.armor : Infinity) : g.armor * (kind === 'rear' ? 1.6 : 1);
            if (imp > lim) { this.wreck(game, kind); return; }
            if (imp > (kind === 'bottom' || landing ? 130 : 45)) this.damage(lx, ly, Math.min(3, 1.5 + (imp - 45) / 18), imp);
          }
          const rn = rx * ny - ry * nx;
          const j = (-(ramp ? 1 : 1.15) * vn) / (1 / this.m + (rn * rn) / this.I);
          const tx = -ny, ty = nx;
          const vt = pvx * tx + pvy * ty;
          const rt = rx * ty - ry * tx;
          let jt = -vt / (1 / this.m + (rt * rt) / this.I);
          jt = ramp ? 0 : Math.max(-0.35 * j, Math.min(0.35 * j, jt));
          const Jx = j * nx + jt * tx, Jy = j * ny + jt * ty;
          this.vx += Jx / this.m; this.vy += Jy / this.m;
          this.va += (rx * Jy - ry * Jx) / this.I;
        }
        for (let s = 0.5; s <= 8; s += 0.5)
          if (!isSolid(this.w, px + nx * s, py + ny * s)) { this.x += nx * s; this.y += ny * s; break; }
      }
    }

    damage(lx, ly, radius, imp) {
      const W = this.map.w, H = this.map.h;
      const cx = lx + this.ox, cy = ly + this.oy;
      let lost = 0;
      for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(H - 1, Math.ceil(cy + radius)); y++)
        for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(W - 1, Math.ceil(cx + radius)); x++) {
          const i = y * W + x;
          if (!this.alive[i]) continue;
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d > radius || Math.random() > 1.2 - d / radius) continue;
          this.detach(i, imp * 0.35);
          lost++;
        }
      if (!lost) return;
      this.structural(imp);
      this.dirty = true;
      Particles.spark(...this.toWorld(lx, ly), 5, ['#fff3a0', '#ff9a52']);
      if (this.count < this.total * 0.55) this.wreck(null, 'integrity');
    }

    detach(i, spread) {
      const W = this.map.w;
      const lx = (i % W) + 0.5 - this.ox, ly = ((i / W) | 0) + 0.5 - this.oy;
      const [px, py] = this.toWorld(lx, ly);
      const rx = px - this.x, ry = py - this.y;
      const a = Math.random() * Math.PI * 2, v = spread * Math.random();
      Particles.voxel(px, py, this.vx - this.va * ry + Math.cos(a) * v, this.vy + this.va * rx + Math.sin(a) * v - spread * 0.3, this.map.px[i]);
      this.alive[i] = 0;
      this.count--;
    }

    // voxels no longer connected to the chassis fall off
    structural(imp) {
      const W = this.map.w, H = this.map.h;
      const seen = new Uint8Array(W * H), q = [];
      for (let x = 4; x < W - 4; x++)
        for (let y = Math.max(0, Math.floor(this.oy + this.bh / 2) - 3); y < H; y++) { const i = y * W + x; if (this.alive[i]) { seen[i] = 1; q.push(i); } }
      while (q.length) {
        const i = q.pop(), x = i % W, y = (i / W) | 0;
        const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
        for (const n of nb) if (n >= 0 && !seen[n] && this.alive[n]) { seen[n] = 1; q.push(n); }
      }
      for (let i = 0; i < W * H; i++) if (this.alive[i] && !seen[i]) this.detach(i, imp * 0.2);
    }

    wreck(game, why) {
      if (this.state === 'wreck') return;
      for (let i = 0; i < this.alive.length; i++) if (this.alive[i]) this.detach(i, 70 + Math.random() * 60);
      for (const wh of this.wheels) {
        const [px, py] = this.toWorld(wh.lx, wh.ly + wh.dist - 3.5);
        for (let k = 0; k < 6; k++) Particles.voxel(px, py, this.vx + (Math.random() - 0.5) * 120, this.vy - 60 - Math.random() * 80, k % 2 ? this.map.rim : '#120a1e', 4);
      }
      Particles.spark(this.x, this.y, 40, ['#fff3a0', '#ffc31f', '#ff6a1f', '#ff3e8a']);
      for (let k = 0; k < 10; k++) Particles.smoke(this.x + (Math.random() - 0.5) * 20, this.y);
      this.state = 'wreck'; this.timer = 1.5; this.wrecks++; this.deaths++; this.boost = 0;
      if (window.Game && Game.onDeath) Game.onDeath(this);
      this.dirty = true;
      if (this.isPlayer) { Audio8.sfx.crash(); if (window.Game) Game.shake(6); }
    }

    jump() {
      if (this.state !== 'drive' || !this.grounded || this.jumpCd > 0) return false;
      const ux = Math.sin(this.a), uy = -Math.cos(this.a);
      this.vy = Math.min(this.vy, 0) + uy * 125;
      this.vx = Math.max(0, this.vx + ux * 125);
      this.va *= 0.3; this.jumpCd = 0.6; this.jumpT = 0.9; this.wasGrounded = false;
      Particles.spark(this.x, this.y + 8, 8, ['#ffffff', '#b9a8e0'], 60);
      if (this.isPlayer) Audio8.sfx.jump();
      return true;
    }

    useNitro() {
      if (this.nitro < 3 || this.boost > 0 || this.state !== 'drive') return false;
      this.nitro = 0; this.boost = 3;
      Particles.spark(...this.toWorld(-this.map.w / 2, 2), 16, ['#29d9ff', '#ffffff', '#ffc31f'], 120);
      if (this.isPlayer) Audio8.sfx.nitro();
      return true;
    }

    // respawn spot with free air around the car and no wall right in front of it
    findSpawn(x0) {
      const clear = (x, y) => {
        for (let sx = x - 20; sx <= x + 150; sx += 4)
          for (let sy = y - 12; sy <= y + 10; sy += 4) if (isSolid(this.w, sx, sy)) return false;
        return true;
      };
      for (const dx of [0, 16, 32, 48, 72, 96, 128, 160])
        for (const row of [5, 4, 6, 3, 7, 2, 8]) {
          const x = x0 + dx, y = row * 16 + 4;
          if (clear(x, y)) return [x, y];
        }
      return [x0, 20];
    }

    fall(game) {
      if (this.state === 'fell') return;
      this.state = 'fell'; this.timer = 0.7; this.falls++; this.deaths++;
      if (window.Game && Game.onDeath) Game.onDeath(this);
      if (this.isPlayer) Audio8.sfx.fall();
    }

    respawn(game) {
      this.repair();
      if (this.isPolice) {
        const act = game && game.cars ? game.cars.filter((r) => r.state !== 'busted' && r.state !== 'finished') : [];
        if (act.length) this.x = Math.min(this.x, Math.min(...act.map((r) => r.x)) - 140);
      } else if (game && game.police && game.police.length) this.x = Math.max(this.x, Math.max(...game.police.map((q) => q.x)) + 120);
      [this.x, this.y] = this.findSpawn(this.x);
      this.vx = this.g.top * 0.6; this.vy = 0; this.a = 0; this.va = 0; this.boost = 0; this.airT = 0;
      this.wheels.forEach((w) => { w.contact = false; w.comp = 0; w.dist = this.L; });
      this.state = 'hover'; this.timer = 3;
      if (this.isPlayer) Audio8.sfx.respawn();
    }

    bbox() {
      const r = this.map.w / 2 + 2;
      return { x: this.x - r, y: this.y - r * 0.6, w: r * 2, h: r * 1.2 };
    }

    draw(ctx, camX, time) {
      if (this.state === 'wreck' || this.state === 'fell') return;
      if (this.state === 'hover' && Math.floor(time * 12) % 2) return;
      if (this.dirty || !this.canvas) { this.canvas = Art.carCanvas(this.map, this.alive); this.dirty = false; }
      const wheelImg = Art.wheel(this.map.rim, this.map.tyre);
      ctx.save();
      ctx.translate(Math.round(this.x - camX), Math.round(this.y));
      ctx.rotate(this.a);
      if (this.map.glow) {
        const gc = Custom.glowCanvas(this.map.glow, this.bw);
        ctx.globalAlpha = 0.55 + Math.sin(time * 5) * 0.2;
        ctx.drawImage(gc, Math.round(-gc.width / 2), Math.round(this.bh / 2 + 1));
        ctx.globalAlpha = 1;
      }
      for (const wh of this.wheels) {
        const cx = wh.lx, cy = wh.ly + wh.dist - 3.5;
        ctx.drawImage(wheelImg, Math.round(cx - 3.5), Math.round(cy - 3.5));
        ctx.fillStyle = '#120a1e';
        ctx.fillRect(Math.round(cx - 0.5 + Math.cos(wh.spin) * 1.6), Math.round(cy - 0.5 + Math.sin(wh.spin) * 1.6), 1, 1);
      }
      ctx.drawImage(this.canvas, -this.ox, -this.oy);
      if (this.isPolice) {
        const b = Math.floor(time * 7) % 2;
        ctx.fillStyle = b ? '#ff2a3a' : '#2f6bff'; ctx.fillRect(-5, -this.bh / 2 - 2, 2, 1);
        ctx.fillStyle = b ? '#2f6bff' : '#ff2a3a'; ctx.fillRect(1, -this.bh / 2 - 2, 2, 1);
      }
      ctx.restore();
    }
  }

  window.GANGS = GANGS;
  window.Car = Car;
  window.Particles = Particles;
})();
