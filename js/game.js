// Main game: states, input, tray, HUD, rendering, pixel-perfect scaling
(function () {
  const { CELL, ROWS, FIELD_H, SAFE_W, SAFE_H, PIECES } = World;
  const TRAY_Y = 222, SLOT_CD = 0.8, STEP = 1 / 120;
  const BTN_JUMP = { x: 6, y: TRAY_Y + 5, w: 68, h: 40 }, BTN_NITRO = { x: 406, y: TRAY_Y + 5, w: 68, h: 40 };
  const STAT_LABELS = ['ШВИДКІСТЬ', 'РОЗГІН', 'ПОЛІТ', 'МІЦНІСТЬ'];

  const screen = document.getElementById('screen');
  const sctx = screen.getContext('2d');
  const buf = document.createElement('canvas');
  const ctx = buf.getContext('2d');
  let dpr = 1, scale = 1, vw = SAFE_W, vh = SAFE_H, ox = 0, oy = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    screen.width = W; screen.height = H;
    let s = Math.min(W / SAFE_W, H / SAFE_H);
    scale = s >= 1 ? Math.floor(s) : s;
    vw = Math.ceil(W / scale); vh = Math.ceil(H / scale);
    ox = Math.floor((vw - SAFE_W) / 2); oy = Math.floor((vh - SAFE_H) / 2);
    buf.width = vw; buf.height = vh;
    ctx.imageSmoothingEnabled = false;
    sctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);
  resize();

  const tintCache = {};
  function tintTile(t, color) {
    const k = t + color;
    if (tintCache[k]) return tintCache[k];
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    g.drawImage(Art.tile(t, 9), 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, 16, 16);
    return (tintCache[k] = c);
  }

  // customized voxel car preview (map from Custom.build), centered at the body center
  function drawMapPreview(map, cx, cy, s, t, hop = 0) {
    const img = Custom.canvas(map);
    const wheel = Art.wheel(map.rim, map.tyre);
    if (map.glow) {
      const gc = Custom.glowCanvas(map.glow, map.bw);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(gc, Math.round(cx - (gc.width / 2) * s), Math.round(cy + (map.bh / 2 + 1) * s), gc.width * s, gc.height * s);
      ctx.globalAlpha = 1;
    }
    for (const wx of map.wheelX) ctx.drawImage(wheel, Math.round(cx + (wx - 3.5) * s), Math.round(cy + (map.wheelY - 3.5) * s), 7 * s, 7 * s);
    ctx.drawImage(img, Math.round(cx - map.ox * s), Math.round(cy - map.oy * s - hop), map.w * s, map.h * s);
  }
  const starterMap = (i) => Custom.build(Catalog.STARTERS[i]);
  const HAND = Art.fromRows([
    '.KK......',
    'KWWK.....',
    'KWWK.....',
    'KWWKKK...',
    'KWWWWWKK.',
    'KWWWWWWWK',
    'KWWWWWWWK',
    '.KWWWWWK.',
    '..KKKKK..',
  ], { K: '#12082a', W: '#ffffff' });

  const Game = {
    state: 'title', time: 0, selected: 0, buttons: [], shakeAmt: 0, camX: 0,
    world: null, cars: [], police: [], ais: [], tray: [], drag: null, banner: null, acc: 0,

    shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); },

    // screen metrics, used by the recording bot to issue touches in screen space
    view() { return { dpr, scale, ox, oy, vw, vh }; },

    toGarage(opts) {
      this.state = 'garage';
      Particles.clear();
      Audio8.startMusic('menu');
      Audio8.setEngine(0, false); Audio8.setSiren(0);
      Garage.onRace = () => this.startRace();
      Garage.onCareer = (r) => this.startCareer(r);
      Garage.enter((opts && opts.screen) || 'hub', opts);
    },

    startRace(n) {
      Particles.clear();
      const L = (this.level = Levels.config(n || Profile.data.level || 1));
      const gi = Profile.data.gang;
      this.gi = gi;
      this.world = World.create((Math.random() * 1e9) | 0, L);
      const order = [0, 1, 2].filter((i) => i !== gi).slice(0, L.rivals);
      const rivals = Profile.rivalDefs(order);
      this.cars = rivals.map((d, i) => new Car(this.world, d, 215 - i * 55, 128, false, order[i]));
      this.player = new Car(this.world, Profile.playerDef(), 270, 128, true, gi);
      this.cars.push(this.player);
      this.ais = rivals.map((d, i) => new AIBuilder(this.cars[i], this, { delay: L.ai.delay + i * 0.1, mistake: L.ai.mistake + i * 0.02 }));
      this.police = [95, 40].slice(0, L.police).map((x, i) => new Police(this.world, x, this, i));
      this.heli = L.heli ? new Helicopter(this) : null;
      this.tut = L.tutorial ? { bridged: false } : null;
      this.boss = null;
      this.tray = [0, 1, 2].map(() => ({ piece: L.tutorial ? { p: 0, v: 0 } : this.nextPiece(), cd: 0 }));
      this.resetRace();
    },

    resetRace() {
      this.drag = null; this.grab = null; this.platT = 3; this.banner = null;
      this.count = 3.99; this.lastBeep = 4;
      this.raceTime = 0; this.finished = 0; this.endTimer = Infinity; this.acc = 0;
      this.camX = this.player.x - 130;
      this.state = 'countdown';
      Audio8.startMusic('race');
    },

    // Blacklist duel: one on one with the rival's tuned car; the winner takes the loser's pink slip
    startCareer(r) {
      Particles.clear();
      const L = (this.level = Levels.boss(r));
      const gi = Profile.data.gang;
      this.gi = gi;
      this.world = World.create((Math.random() * 1e9) | 0, L);
      const bg = r.gang === gi ? (gi + 1) % 3 : r.gang;
      const def = Profile.def(r.car.id, r.bossUp, { glow: ['pink', 'gold', 'cyan'][bg] });
      this.cars = [new Car(this.world, def, 215, 128, false, bg)];
      this.player = new Car(this.world, Profile.playerDef(), 270, 128, true, gi);
      this.cars.push(this.player);
      this.ais = [new AIBuilder(this.cars[0], this, L.ai)];
      this.police = []; this.heli = null; this.tut = null;
      this.boss = r;
      this.tray = [0, 1, 2].map(() => ({ piece: this.nextPiece(), cd: 0 }));
      this.resetRace();
    },

    nextPiece() {
      if (this.level && this.level.tutorial) return { p: Math.random() < 0.7 ? 0 : 1, v: 0 };
      return World.randomPiece(Math.random);
    },

    // withPickups: AI builders keep clear of money and nitro; the player's pieces may cover them
    rects(withPickups = true) {
      const out = withPickups ? World.bagRects(this.world) : [];
      for (const c of this.cars.concat(this.police.map((q) => q.car))) if (c.state !== 'wreck' && c.state !== 'fell' && c.state !== 'busted') out.push(c.bbox());
      if (this.heli) out.push(this.heli.rect());
      return out;
    },

    tryPlace(shape, col, row, owner, replace = false) {
      if (!World.canPlace(this.world, shape, col, row, this.rects(!replace), replace)) return false;
      if (replace) { this.shatterUnder(shape, col, row, owner); this.clearPickups(shape, col, row); }
      World.place(this.world, shape, col, row, owner);
      const pal = Art.teamPal(owner);
      shape.forEach((line, dy) => line.forEach((t, dx) => {
        if (t) Particles.spark((col + dx) * CELL + 8, (row + dy) * CELL + 8, 2, [pal.hi, '#ffffff'], 40);
      }));
      return true;
    },

    // money and nitro under a new piece are lost: they pop and vanish
    clearPickups(shape, col, row) {
      const w = this.world;
      const covered = (p) => shape.some((line, dy) => line.some((t, dx) => {
        if (!t) return false;
        const x0 = (col + dx) * CELL, y0 = (row + dy) * CELL;
        return p.x + 5 > x0 && p.x - 5 < x0 + CELL && p.y + 6 > y0 && p.y - 6 < y0 + CELL;
      }));
      let lost = 0;
      for (const p of w.bags.concat(w.nitros)) {
        if (p.taken || !covered(p)) continue;
        p.taken = true; lost++;
        Particles.spark(p.x, p.y, 10, p.value ? ['#3fbf5a', '#a8f59a', '#ffffff'] : ['#29d9ff', '#ffffff'], 70);
        for (let k = 0; k < 4; k++) Particles.smoke(p.x + (Math.random() - 0.5) * 8, p.y);
      }
      if (lost) Audio8.sfx.invalid();
      return lost;
    },

    // blocks overwritten by a new piece burst into voxels of their gang colors
    shatterUnder(shape, col, row, owner) {
      const w = this.world;
      let n = 0;
      shape.forEach((line, dy) => line.forEach((t, dx) => {
        if (!t) return;
        const c = col + dx, r = row + dy, i = r * w.cols + c;
        if (!w.type[i]) return;
        n++;
        const pal = Art.teamPal(w.owner[i]), X = c * CELL, Y = r * CELL;
        const cols = [pal.hi, pal.main, pal.body, pal.dark];
        for (let k = 0; k < 14; k++) {
          const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 110;
          Particles.voxel(X + 2 + Math.random() * 12, Y + 2 + Math.random() * 12, Math.cos(a) * v, Math.sin(a) * v - 60, cols[k % 4], 1.2 + Math.random() * 1.2);
        }
        Particles.spark(X + 8, Y + 8, 4, ['#ffffff', '#ffc31f'], 70);
      }));
      if (n && owner === this.gi) { Audio8.sfx.thud(1); this.shake(1.5); }
      return n;
    },

    onFinish(car) {
      car.place = ++this.finished;
      car.bonus = this.level.bonus[car.place - 1] || 0;
      car.state = 'finished';
      Particles.text(car.x, car.y - 16, '+' + car.bonus, '#ffc31f');
      if (car.isPlayer) {
        Audio8.sfx.finish();
        this.banner = { text: 'ФІНІШ #' + car.place, color: '#ffc31f', t: 2.5 };
        this.endTimer = 14;
      }
      // a duel is over as soon as someone crosses the line
      if (this.boss && car.place === 1) {
        this.endTimer = Math.min(this.endTimer, 3);
        if (!car.isPlayer) this.banner = { text: this.boss.nick + ' ПЕРШИЙ!', color: '#ff5c7a', t: 2.5 };
      }
    },

    onStunt(car, airT) {
      const bonus = Math.round((airT * 120) / 50) * 50;
      car.money += bonus;
      if (!car.isPlayer) return;
      Particles.text(car.x, car.y - 22, 'СТРИБОК! +' + bonus, '#b6ff6a');
      Audio8.sfx.coin(true);
      if (airT > 2) this.banner = { text: 'ШАЛЕНИЙ СТРИБОК!', color: '#b6ff6a', t: 1.2 };
    },

    onBusted(car) {
      if (car.state === 'busted') return;
      car.state = 'busted';
      Particles.text(car.x, car.y - 16, 'ЗАТРИМАНО', '#ff2a3a');
      if (car.isPlayer) {
        Audio8.sfx.bust();
        this.banner = { text: 'ЗАТРИМАНО!', color: '#ff2a3a', t: 3 };
        this.endTimer = Math.min(this.endTimer, 2.8);
        this.shake(4);
      }
    },

    // a cop touch costs $50 while there is money on hand; a broke racer gets arrested
    onCaught(car, cop) {
      if (car.state === 'busted' || car.fineCd > 0) return;
      if (car.money <= 0) { this.onBusted(car); return; }
      const fine = Math.min(50, car.money);
      car.money -= fine; car.fineCd = 0.8; cop.stun = 1;
      Particles.text(car.x, car.y - 18, '-$' + fine, '#ff5c7a');
      Particles.spark(car.x - 10, car.y, 10, ['#ff2a3a', '#2f6bff', '#ffffff'], 80);
      if (car.isPlayer) {
        Audio8.sfx.fine(); this.shake(2);
        this.banner = { text: car.money > 0 ? 'ШТРАФ -$' + fine : 'ГРОШІ СКІНЧИЛИСЬ!', color: '#ff5c7a', t: 1 };
      }
    },

    // the final sum after death penalties, rounded to $10
    keep(car, sum) { return Math.round((sum * Balance.deathMul(car.deaths)) / 10) * 10; },

    onDeath(car) {
      if (!car.isPlayer || this.state !== 'race') return;
      const cut = Math.round((1 - Balance.deathMul(car.deaths)) * 100);
      Particles.text(car.x, car.y - 26, car.deaths <= 9 ? '-10% ГРОШЕЙ' : 'МІНІМУМ 10%', '#ff5c7a');
      this.penaltyFlash = 1.2;
      return cut;
    },

    showResults() {
      this.state = 'results';
      this.drag = null;
      const p = this.player, L = this.level;
      this.results = this.cars
        .map((c) => ({ c, total: c.state === 'busted' ? 0 : this.keep(c, c.money + c.bonus) }))
        .sort((a, b) => b.total - a.total);
      this.win = p.state !== 'busted' && p.place > 0 && (this.boss ? p.place === 1 : this.results[0].c === p);
      this.earned = p.state === 'busted' ? 0 : this.keep(p, p.money + p.bonus + (this.win ? L.winBonus : 0));
      this.unlocked = !this.boss && this.win && Profile.data.level <= L.n;
      this.slip = this.boss && this.win ? Profile.careerWin(this.boss) : false;
      if (this.win && !this.boss) Profile.levelDone(L.n);
      Profile.raceDone(this.earned, this.win);
      Audio8.setEngine(0, false); Audio8.setSiren(0);
      if (this.win) Audio8.sfx.finish();
    },

    slotRect(i) { return { x: 240 + (i - 1) * 84 - 38, y: TRAY_Y + 3, w: 76, h: 44 }; },

    ghost() {
      const d = this.drag, slot = this.tray[d.slot];
      const shape = PIECES[slot.piece.p].v[slot.piece.v];
      const sw = shape[0].length * CELL, sh = shape.length * CELL;
      let col = Math.round((d.sx + this.camX - sw / 2) / CELL);
      let row = Math.round((d.sy - 34 - sh / 2) / CELL);
      // tutorial: a straight block dropped near the chasm snaps into it
      const gap = this.tut && !this.tut.bridged ? this.world.gap : null;
      if (gap && shape.length === 1 && Math.abs(row - gap.row) <= 1 && col + shape[0].length > gap.col - 2 && col < gap.col + gap.len + 2) {
        row = gap.row;
        col = Math.max(gap.col, Math.min(gap.col + gap.len - shape[0].length, col));
      }
      const sxL = col * CELL - this.camX;
      const onScreen = sxL + sw > -ox && sxL < vw - ox && d.sy < TRAY_Y;
      const ok = onScreen && World.canPlace(this.world, shape, col, row, this.rects(false), true);
      const swap = new Set();
      shape.forEach((line, dy) => line.forEach((t, dx) => { if (t && World.cellAt(this.world, col + dx, row + dy)) swap.add(dy * 16 + dx); }));
      return { shape, col, row, ok, swap };
    },

    // ---------------- update ----------------
    update(dt) {
      this.time += dt;
      UI.update(dt);
      if (window.Music) Music.update(dt);
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 20);
      if (this.penaltyFlash > 0) this.penaltyFlash -= dt;
      this.pressJ = Math.max(0, (this.pressJ || 0) - dt); this.pressN = Math.max(0, (this.pressN || 0) - dt);
      if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
      if (this.state === 'countdown' || this.state === 'race') this.updateRace(dt);
      else if (this.state === 'garage') Garage.update(dt);
      if (window.Bot && (this.state === 'countdown' || this.state === 'race')) Bot.update(dt);
      else if (this.state === 'results') Particles.update(dt, this.world);
    },

    updateRace(dt) {
      const w = this.world, p = this.player;
      if (this.state === 'countdown') {
        this.count -= dt;
        const n = Math.ceil(this.count);
        if (n !== this.lastBeep && n > 0) { this.lastBeep = n; Audio8.sfx.beep(false); }
        if (this.count <= 0) {
          this.state = 'race';
          this.cars.forEach((c) => (c.state = 'drive'));
          Audio8.sfx.beep(true);
          this.banner = { text: 'ВПЕРЕД!', color: '#29e0d0', t: 1.2 };
        }
      } else this.raceTime += dt;

      this.acc = Math.min(this.acc + dt, 0.1);
      while (this.acc >= STEP) {
        for (const c of this.cars) c.update(STEP, this);
        for (const q of this.police) q.car.update(STEP, this);
        this.acc -= STEP;
      }
      this.ais.forEach((a) => a.update(dt));
      this.police.forEach((q) => q.update(dt, this));
      if (this.heli) this.heli.update(dt, this);
      for (const c of this.cars) if (c.fineCd > 0) c.fineCd -= dt;
      if (this.tut) this.updateTutorial();
      Particles.update(dt, w);
      for (let i = 0; i < w.flash.length; i++) if (w.flash[i] > 0) w.flash[i] = Math.max(0, w.flash[i] - dt * 3);
      for (const s of this.tray) {
        if (s.cd > 0) { s.cd -= dt; if (s.cd <= 0) { s.cd = 0; s.piece = this.nextPiece(); } }
      }

      this.updatePlatforms(dt);
      const target = p.x - (p.boost > 0 ? 80 : 130 - Math.max(0, Math.min(1, (p.vx - 120) / 120)) * 50);
      this.camX += (target - this.camX) * Math.min(1, dt * 5);
      this.camX = Math.max(-ox, Math.min(w.width - (vw - ox), this.camX));

      const racing = this.cars.filter((c) => c.state !== 'finished' && c.state !== 'busted');
      if (!racing.length) this.endTimer = Math.min(this.endTimer, 1.5);
      if (this.endTimer !== Infinity) { this.endTimer -= dt; if (this.endTimer <= 0) this.showResults(); }

      Audio8.setEngine(Math.abs(p.vx), p.active || p.state === 'finished');
      let d = Infinity;
      for (const q of this.police) d = Math.min(d, Math.abs(p.x - q.x));
      Audio8.setSiren(this.state === 'race' && p.state !== 'busted' && this.police.length ? 1 - d / 380 : 0);
    },

    // level 1: the car waits at the chasm until a block bridges it on roof level
    updateTutorial() {
      const T = this.tut, w = this.world, g = w.gap, p = this.player;
      if (!T.bridged) {
        let ok = true;
        for (let c = g.col; c < g.col + g.len; c++) if (World.cellAt(w, c, g.row) !== 1) ok = false;
        if (ok) { T.bridged = true; this.banner = { text: 'ЧУДОВО!', color: '#b6ff6a', t: 1.4 }; Audio8.sfx.pickup(3); }
      }
      const hold = !T.bridged && p.x > g.col * CELL - 70 && p.x < g.col * CELL;
      if (p.hold && !hold) p.stopped = false;
      p.hold = hold;
    },

    updatePlatforms(dt) {
      const w = this.world, ps = w.platforms;
      if (this.state === 'race' && this.level.platforms) {
        this.platT -= dt;
        if (this.platT <= 0 && ps.filter((p) => !p.anchored).length < 3) {
          this.platT = 2.5 + Math.random() * 2.5;
          const len = 3 + Math.floor(Math.random() * 3), rise = Math.random() < 0.5;
          // never share a vertical column range with another platform, moving or anchored
          for (let tries = 0; tries < 12; tries++) {
            const col = Math.floor((this.camX + 230 + Math.random() * 240) / CELL);
            const x0 = col * CELL, x1 = x0 + len * CELL;
            if (x1 > w.finishX - 60) break;
            if (ps.some((q) => x0 < q.x + q.w + CELL && x1 + CELL > q.x)) continue;
            ps.push({ x: x0, w: len * CELL, y: rise ? FIELD_H : -CELL, vy: rise ? -24 : 24, held: false, anchored: false });
            break;
          }
        }
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        if (p.held && this.grab && this.grab.p === p) {
          const d = Math.max(0, Math.min((ROWS - 1) * CELL, this.grab.ty)) - p.y;
          p.y += Math.sign(d) * Math.min(Math.abs(d), 280 * dt);
        } else if (!p.anchored) p.y += p.vy * dt;
        if (p.y > FIELD_H + 24 || p.y < -40 || p.x + p.w < this.camX - ox - 200) ps.splice(i, 1);
      }
    },

    // ---------------- input ----------------
    releaseGrab() {
      const p = this.grab.p;
      p.held = false; p.anchored = true;
      p.y = Math.max(CELL, Math.min((ROWS - 1) * CELL, Math.round(p.y / CELL) * CELL));
      this.grab = null;
    },

    toSafe(e) {
      const r = screen.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * dpr) / scale - ox, y: ((e.clientY - r.top) * dpr) / scale - oy };
    },

    pointerDown(e) {
      const q = this.toSafe(e);
      if (UI.transitioning) return;
      if (this.state === 'garage') { Garage.pointerDown(q); return; }
      if ((this.state === 'race' || this.state === 'countdown') && this.player.state !== 'busted') {
        const inR = (r) => q.x >= r.x && q.x < r.x + r.w && q.y >= r.y && q.y < r.y + r.h;
        if (inR(BTN_JUMP)) { this.player.jump(); this.pressJ = 0.15; return; }
        if (inR(BTN_NITRO)) { if (this.player.useNitro()) this.shake(2); else Audio8.sfx.invalid(); this.pressN = 0.15; return; }
        if (!this.grab && q.y < TRAY_Y) {
          const wx = q.x + this.camX;
          const pl = this.world.platforms.find((p) => wx >= p.x - 8 && wx < p.x + p.w + 8 && q.y >= p.y - 12 && q.y < p.y + 28);
          if (pl) { this.grab = { id: e.pointerId, p: pl, off: q.y - pl.y, ty: pl.y }; pl.held = true; Audio8.sfx.grab(); return; }
        }
        for (let i = 0; i < 3; i++) {
          const r = this.slotRect(i);
          if (!this.drag && this.tray[i].cd <= 0 && q.x >= r.x && q.x < r.x + r.w && q.y >= r.y && q.y < r.y + r.h) {
            this.drag = { id: e.pointerId, slot: i, sx: q.x, sy: q.y, x0: q.x, y0: q.y, moved: false };
            return;
          }
        }
      }
    },

    pointerMove(e) {
      const q = this.toSafe(e);
      if (this.state === 'garage') { Garage.pointerMove(q); return; }
      if (this.grab && e.pointerId === this.grab.id) this.grab.ty = q.y - this.grab.off;
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag.sx = q.x; this.drag.sy = q.y;
      if (Math.hypot(q.x - this.drag.x0, q.y - this.drag.y0) > 6) this.drag.moved = true;
    },

    pointerUp(e) {
      const q = this.toSafe(e);
      if (this.grab && e.pointerId === this.grab.id) { this.releaseGrab(); Audio8.sfx.place(); return; }
      if (this.drag && e.pointerId !== this.drag.id) return;
      if (this.drag) {
        const d = this.drag, slot = this.tray[d.slot];
        d.sx = q.x; d.sy = q.y;
        if (!d.moved) {
          slot.piece.v = (slot.piece.v + 1) % PIECES[slot.piece.p].v.length;
          Audio8.sfx.rotate();
        } else if (q.y < TRAY_Y) {
          const g = this.ghost();
          if (g.ok && this.tryPlace(g.shape, g.col, g.row, this.gi, true)) {
            Audio8.sfx.place();
            slot.cd = SLOT_CD;
          } else Audio8.sfx.invalid();
        }
        this.drag = null;
        return;
      }
      if (this.state === 'title') {
        Audio8.init();
        Audio8.startMusic('menu');
        Audio8.sfx.click();
        const el = document.documentElement;
        try {
          const fs = el.requestFullscreen || el.webkitRequestFullscreen;
          if (fs && window.matchMedia('(pointer: coarse)').matches) {
            const pr = fs.call(el);
            if (pr && pr.then) pr.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
          }
        } catch (err) { /* ignore */ }
        Profile.load();
        UI.transition('slash', () => this.toGarage());
        return;
      }
      if (UI.transitioning) return;
      if (this.state === 'garage' && Garage.pointerUp(q)) return;
      for (const b of this.buttons) {
        if (q.x >= b.x && q.x < b.x + b.w && q.y >= b.y && q.y < b.y + b.h) { Audio8.sfx.click(); b.fn(); return; }
      }
    },

    // ---------------- drawing ----------------
    button(x, y, w, h, label, color, fn, s = 1) {
      ctx.fillStyle = '#12082a'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = color; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
      Font.draw(ctx, label, x + w / 2, y + Math.floor((h - 7 * s) / 2), color, s, 'center');
      this.buttons.push({ x, y, w, h, fn });
    },

    draw() {
      this.buttons = [];
      if (this.state === 'garage') {
        Garage.draw(ctx, { vw, vh, ox, oy, time: this.time, button: (x, y, w, h, fn) => this.buttons.push({ x, y, w, h, fn }) });
      } else {
      const cam = this.state === 'title' || this.state === 'select' ? this.time * 40 : this.camX;
      Art.drawBackground(ctx, vw, vh, oy, cam, this.time);
      if (this.state === 'title') this.drawTitle();
      else if (this.state === 'select') this.drawSelect();
      else {
        this.drawWorld();
        this.drawTray();
        this.drawHUD();
        if (this.state === 'results') this.drawResults();
      }
      }
      if (window.Bot && (this.state === 'race' || this.state === 'countdown')) { ctx.save(); ctx.translate(ox, oy); Bot.draw(ctx); ctx.restore(); }
      if (window.Music && Music.started() && !(this.state === 'garage' && (Garage.screen === 'jukebox' || Garage.screen === 'career'))) {
        const acc = Profile.data && Profile.data.gang != null ? Art.TEAM[Profile.data.gang].main : '#ff3ea5';
        const inRace = this.state === 'race' || this.state === 'countdown' || this.state === 'results';
        const pos = this.state === 'results' ? [4, 232, 196] : inRace ? [4, 184, 196] : this.state === 'garage' ? [176, 31, 164] : this.state === 'select' ? [4, 2, 168] : [4, 232, 196];
        ctx.save(); ctx.translate(ox, oy);
        Music.drawPopup(ctx, pos[0], pos[1], acc, pos[2]);
        ctx.restore();
      }
      UI.drawTransition(ctx, vw, vh, this.time);
      if (vh > vw) {
        ctx.fillStyle = '#12082ae0'; ctx.fillRect(0, 0, vw, vh);
        Font.draw(ctx, 'ПОВЕРНИ ТЕЛЕФОН', vw / 2, vh / 2 - 12, '#ff3ea5', 2, 'center');
        Font.draw(ctx, 'ГОРИЗОНТАЛЬНО', vw / 2, vh / 2 + 8, '#29e0d0', 2, 'center');
      }
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(buf, 0, 0, vw * scale, vh * scale);
    },

    drawTitle() {
      const t = this.time;
      ctx.save(); ctx.translate(ox, oy);
      Font.draw(ctx, 'MIAMI', 240, 34, '#ff3ea5', 6, 'center', '#29e0d0');
      Font.draw(ctx, 'BLOCK RUSH', 240, 86, '#ffc31f', 3, 'center', '#8c1a5c');
      Font.draw(ctx, 'ГАНГСТЕРСЬКІ ПЕРЕГОНИ 1986', 240, 116, '#fff1c9', 1, 'center');
      for (let x = -16; x < SAFE_W + 16; x += 16) ctx.drawImage(Art.tile(1, 9), x - Math.floor((t * 60) % 16), 196);
      [0, 1, 2].forEach((i) => {
        const x = ((t * 50 + i * 170) % (SAFE_W + 120)) - 60;
        drawMapPreview(starterMap(i), Math.round(x), 188, 1, t + i);
      });
      if (Math.floor(t * 2) % 2 === 0) Font.draw(ctx, 'ТОРКНИСЬ, ЩОБ ПОЧАТИ', 240, 150, '#ffffff', 1, 'center');
      ctx.restore();
    },

    drawSelect() {
      const t = this.time;
      ctx.save(); ctx.translate(ox, oy);
      Font.draw(ctx, 'ОБЕРИ БАНДУ', 240, 10, '#ffffff', 2, 'center', '#8c1a5c');
      GANGS.forEach((g, i) => {
        const x = 13 + i * 154, y = 36, w = 146, h = 172;
        const pal = Art.TEAM[i], sel = this.selected === i;
        const lift = sel ? -2 : 0;
        ctx.fillStyle = sel ? '#1f0c3ee8' : '#12082ac8';
        ctx.fillRect(x, y + lift, w, h);
        ctx.fillStyle = sel ? pal.main : pal.dark;
        ctx.fillRect(x, y + lift, w, sel ? 2 : 1); ctx.fillRect(x, y + h - 1 + lift, w, 1);
        ctx.fillRect(x, y + lift, 1, h); ctx.fillRect(x + w - 1, y + lift, 1, h);
        const Y = y + lift;
        const st = Catalog.STARTERS[i];
        Font.draw(ctx, g.name, x + w / 2, Y + 8, pal.main, 1, 'center');
        Font.draw(ctx, st.name, x + w / 2, Y + 19, '#b9a8e0', 1, 'center');
        // rotating 3D voxel car on a mini turntable, like the garage showroom
        const hop = i === 1 && sel ? Math.max(0, Math.sin(t * 5)) * 1.6 : 0;
        const smap = starterMap(i);
        Voxel3D.render(ctx, smap, { cx: x + w / 2, cy: Y + 47, zoom: sel ? 2.4 : 2, yaw: t * (sel ? 0.9 : 0.35) + i * 2, pitch: 0.34, bob: -hop, glow: sel ? pal.main : null, glowK: 0.5 });
        Font.draw(ctx, g.desc, x + w / 2, Y + 80, '#fff1c9', 1, 'center');
        Profile.bars(Profile.stats(st.id)).forEach((v, si) => {
          const sy = Y + 98 + si * 16;
          Font.draw(ctx, STAT_LABELS[si], x + 8, sy, '#d8ccff', 1, 'left');
          UI.bar(ctx, x + 78, sy, 60, v, null, pal.main);
        });
        this.buttons.push({ x, y, w, h, fn: () => (this.selected = i) });
      });
      const pal = Art.TEAM[this.selected];
      this.button(166, 216, 148, 24, 'ДО ГАРАЖУ', pal.main, () => { Profile.setGang(this.selected); UI.transition('slash', () => this.toGarage()); }, 2);
      Font.draw(ctx, 'ТВОЯ БАНДА - ТВОЯ ПЕРША ТАЧКА. РЕШТУ КУПИШ.', 240, 252, '#b9a8e0', 1, 'center');
      if (window.Music && Music.started()) Music.drawMini(ctx, 408, 4, (x, y, w, h, fn) => this.buttons.push({ x, y, w, h, fn }), pal.main);
      ctx.restore();
    },

    drawWorld() {
      const w = this.world, t = this.time;
      const sh = this.shakeAmt;
      const cx = Math.round(this.camX + (Math.random() - 0.5) * sh * 2);
      const cyOff = Math.round((Math.random() - 0.5) * sh);
      ctx.save(); ctx.translate(ox, oy + cyOff);

      // start sign & finish gate
      const fx = Math.round(w.finishX - cx);
      if (fx > -ox - 30 && fx < vw) {
        for (let y = 0; y < 144; y += 4)
          for (let k = 0; k < 2; k++) { ctx.fillStyle = ((y / 4 + k) & 1) ? '#12082a' : '#ffffff'; ctx.fillRect(fx + k * 4, y, 4, 4); }
        ctx.fillStyle = '#12082a'; ctx.fillRect(fx + 8, 12, 52, 13);
        Font.draw(ctx, 'ФІНІШ', fx + 34, 15, '#ffc31f', 1, 'center');
      }
      const stx = Math.round(12 - cx);
      if (stx > -ox - 60) {
        ctx.fillStyle = '#9d8cff'; ctx.fillRect(stx, 100, 2, 44);
        ctx.fillStyle = '#12082a'; ctx.fillRect(stx - 2, 92, 44, 12);
        Font.draw(ctx, 'СТАРТ', stx + 20, 95, '#29e0d0', 1, 'center');
      }

      const c0 = Math.max(0, Math.floor((cx - ox) / CELL)), c1 = Math.min(w.cols - 1, Math.ceil((cx - ox + vw) / CELL));
      for (let r = 0; r < ROWS; r++)
        for (let c = c0; c <= c1; c++) {
          const i = r * w.cols + c, ty = w.type[i];
          if (!ty) continue;
          const X = c * CELL - cx, Y = r * CELL;
          ctx.drawImage(Art.tile(ty, w.owner[i]), X, Y);
          if (w.flash[i] > 0) { ctx.globalAlpha = w.flash[i]; ctx.drawImage(tintTile(ty, '#ffffff'), X, Y); ctx.globalAlpha = 1; }
        }
      for (const pl of w.platforms) {
        const X = Math.round(pl.x - cx), Y = Math.round(pl.y);
        if (X > vw || X + pl.w < -ox - 16) continue;
        for (let k = 0; k < pl.w; k += CELL) ctx.drawImage(Art.tile(1, 5), X + k, Y);
        const mid = Math.round(X + pl.w / 2);
        ctx.fillStyle = pl.held ? '#ffffff' : '#d8ff9a';
        if (!pl.anchored) {
          const bob = Math.floor(t * 4) % 2;
          ctx.fillRect(mid - 2, Y - 4 - bob, 5, 1); ctx.fillRect(mid - 1, Y - 5 - bob, 3, 1); ctx.fillRect(mid, Y - 6 - bob, 1, 1);
          ctx.fillRect(mid - 2, Y + 19 + bob, 5, 1); ctx.fillRect(mid - 1, Y + 20 + bob, 3, 1); ctx.fillRect(mid, Y + 21 + bob, 1, 1);
        }
        if (pl.held) { ctx.fillRect(X - 1, Y - 1, pl.w + 2, 1); ctx.fillRect(X - 1, Y + 16, pl.w + 2, 1); }
      }
      for (const n of w.nitros) {
        if (n.taken) continue;
        const X = Math.round(n.x - 4 - cx);
        if (X < -ox - 12 || X > vw) continue;
        const bob = Math.round(Math.sin(t * 3.5 + n.t) * 1.5);
        ctx.drawImage(Art.nitro, X, Math.round(n.y - 6 + bob));
        if (Math.floor(t * 6 + n.t) % 4 === 0) { ctx.fillStyle = '#9fdcff'; ctx.fillRect(X - 1, Math.round(n.y - 7 + bob), 1, 1); }
      }
      for (const b of w.bags) {
        if (b.taken) continue;
        const X = Math.round(b.x - 5 - cx);
        if (X < -ox - 12 || X > vw) continue;
        const bob = Math.round(Math.sin(t * 3 + b.t) * 1.5);
        ctx.drawImage(b.big ? Art.bagBig : Art.bag, X, Math.round(b.y - 6 + bob));
        if (Math.floor(t * 3 + b.t) % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 2, Math.round(b.y - 3 + bob), 1, 1); }
      }

      this.police.forEach((q) => q.draw(ctx, cx, t));
      this.cars.forEach((c) => c.draw(ctx, cx, t));
      if (this.heli) this.heli.draw(ctx, cx, t);
      Particles.draw(ctx, cx);

      const p = this.player;
      if (p.active || p.state === 'finished') {
        const mx = Math.round(p.x - cx), my = Math.max(2, Math.round(p.y - 20 + Math.sin(t * 6)));
        ctx.fillStyle = Art.TEAM[this.gi].hi;
        ctx.fillRect(mx - 2, my, 5, 1); ctx.fillRect(mx - 1, my + 1, 3, 1); ctx.fillRect(mx, my + 2, 1, 1);
      }

      if (this.drag && this.drag.moved && this.drag.sy < TRAY_Y) {
        const g = this.ghost();
        g.shape.forEach((line, dy) => line.forEach((ty, dx) => {
          if (!ty) return;
          const X = (g.col + dx) * CELL - cx, Y = (g.row + dy) * CELL;
          ctx.globalAlpha = g.ok ? 0.75 : 0.5;
          ctx.drawImage(g.ok ? Art.tile(ty, this.gi) : tintTile(ty, '#ff2a3a'), X, Y);
          ctx.globalAlpha = 1;
          if (g.ok && g.swap.has(dy * 16 + dx)) {
            // this cell will overwrite an existing block
            ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.time * 12);
            ctx.drawImage(tintTile(ty, '#ffc31f'), X, Y);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffc31f';
            ctx.fillRect(X, Y, 4, 1); ctx.fillRect(X, Y, 1, 4); ctx.fillRect(X + 12, Y, 4, 1); ctx.fillRect(X + 15, Y, 1, 4);
            ctx.fillRect(X, Y + 15, 4, 1); ctx.fillRect(X, Y + 12, 1, 4); ctx.fillRect(X + 12, Y + 15, 4, 1); ctx.fillRect(X + 15, Y + 12, 1, 4);
          }
        }));
      }
      ctx.restore();
    },

    drawTray() {
      const pal = Art.TEAM[this.gi];
      ctx.fillStyle = '#12082ad8';
      ctx.fillRect(0, oy + TRAY_Y, vw, vh - oy - TRAY_Y);
      ctx.fillStyle = pal.main; ctx.fillRect(0, oy + TRAY_Y, vw, 1);
      ctx.fillStyle = pal.dark; ctx.fillRect(0, oy + TRAY_Y + 1, vw, 1);
      ctx.save(); ctx.translate(ox, oy);
      this.drawControls(pal);
      this.tray.forEach((s, i) => {
        const r = this.slotRect(i);
        const dragging = this.drag && this.drag.slot === i && this.drag.moved;
        ctx.fillStyle = '#1f0c3e'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = dragging ? pal.main : '#3d2f7a';
        ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1); ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
        if (s.cd > 0) {
          ctx.fillStyle = pal.dark;
          ctx.fillRect(r.x + 4, r.y + r.h - 6, Math.round((r.w - 8) * (1 - s.cd / SLOT_CD)), 2);
          return;
        }
        const piece = PIECES[s.piece.p], shape = piece.v[s.piece.v];
        const sw = shape[0].length * CELL, sh = shape.length * CELL;
        const x0 = Math.round(r.x + r.w / 2 - sw / 2), y0 = Math.round(r.y + r.h / 2 - sh / 2);
        if (dragging) ctx.globalAlpha = 0.25;
        shape.forEach((line, dy) => line.forEach((ty, dx) => { if (ty) ctx.drawImage(Art.tile(ty, this.gi), x0 + dx * CELL, y0 + dy * CELL); }));
        ctx.globalAlpha = 1;
        if (piece.v.length > 1)
          for (let k = 0; k < piece.v.length; k++) { ctx.fillStyle = k === s.piece.v ? pal.hi : '#3d2f7a'; ctx.fillRect(r.x + r.w - 4 - k * 3, r.y + 3, 2, 2); }
      });
      ctx.restore();
    },

    drawControls(pal) {
      const p = this.player, t = this.time;
      const box = (r, col, fill) => {
        ctx.fillStyle = fill; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = col;
        ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1); ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
        ctx.fillStyle = '#ffffff22'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 1);
      };
      const J = BTN_JUMP, canJ = p.state === 'drive' && p.grounded && !(p.jumpCd > 0);
      box(J, canJ ? pal.main : '#3d2f7a', this.pressJ > 0 ? '#3a1a66' : '#1f0c3e');
      const ax = J.x + J.w / 2, ay = J.y + 7;
      ctx.fillStyle = canJ ? pal.hi : '#5a4a78';
      for (let k = 0; k < 5; k++) ctx.fillRect(ax - k, ay + k, k * 2 + 1, 1);
      ctx.fillRect(ax - 1, ay + 5, 3, 6);
      Font.draw(ctx, 'СТРИБОК', ax, J.y + 27, canJ ? '#ffffff' : '#8a7aa8', 1, 'center');

      const N = BTN_NITRO, full = p.nitro >= 3, on = p.boost > 0;
      const glow = full && Math.floor(t * 4) % 2 === 0;
      box(N, on || full ? (glow ? '#ffffff' : '#29d9ff') : '#3d2f7a', this.pressN > 0 ? '#12305a' : '#1f0c3e');
      for (let k = 0; k < 3; k++) {
        const filled = on ? k < Math.ceil(p.boost) : k < p.nitro;
        ctx.globalAlpha = filled ? 1 : 0.3;
        ctx.drawImage(Art.nitro, N.x + 11 + k * 17, N.y + 5);
        ctx.globalAlpha = 1;
      }
      if (on) { ctx.fillStyle = '#29d9ff'; ctx.fillRect(N.x + 4, N.y + N.h - 5, Math.round((N.w - 8) * (p.boost / 3)), 2); }
      Font.draw(ctx, on ? 'X3!' : 'НІТРО', N.x + N.w / 2, N.y + 27, full || on ? '#9fdcff' : '#8a7aa8', 1, 'center');
    },

    drawHUD() {
      const t = this.time, p = this.player;
      ctx.save(); ctx.translate(ox, oy);
      // money board
      this.cars.slice().sort((a, b) => a.gi - b.gi).forEach((c, row) => {
        const gi = c.gi, pal = Art.TEAM[gi], y = 4 + row * 10;
        ctx.fillStyle = pal.main; ctx.fillRect(4, y, 6, 7);
        if (c.isPlayer) { ctx.fillStyle = '#ffffff'; ctx.fillRect(3, y + 3, 1, 1); }
        if (c.state === 'busted') Font.draw(ctx, 'ЗАТРИМАНО', 14, y, '#8a7aa8');
        else {
          const txt = '$' + (c.money + c.bonus) + (c.place ? ' #' + c.place : '');
          Font.draw(ctx, txt, 14, y, c.isPlayer ? '#ffffff' : pal.hi);
          if (c.deaths) Font.draw(ctx, '-' + Math.round((1 - Balance.deathMul(c.deaths)) * 100) + '%', 18 + Font.measure(txt, 1), y, c.isPlayer && this.penaltyFlash > 0 && Math.floor(t * 8) % 2 ? '#ffffff' : '#ff5c7a');
        }
      });
      // progress track
      const X0 = 150, X1 = 330, fin = this.world.finishX;
      ctx.fillStyle = '#12082a'; ctx.fillRect(X0 - 2, 6, X1 - X0 + 4, 4);
      ctx.fillStyle = '#5a4a78'; ctx.fillRect(X0, 7, X1 - X0, 2);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#12082a' : '#ffffff'; ctx.fillRect(X1 + 1, 4 + k * 3, 3, 3); }
      const px = (x) => Math.round(X0 + Math.max(0, Math.min(1, x / fin)) * (X1 - X0));
      this.police.forEach((q) => { ctx.fillStyle = Math.floor(t * 7) % 2 ? '#ff2a3a' : '#2f6bff'; ctx.fillRect(px(q.x) - 1, 5, 3, 6); });
      if (this.heli) { ctx.fillStyle = '#9cc4ff'; ctx.fillRect(px(this.heli.x) - 2, 2, 5, 2); }
      this.cars.forEach((c) => {
        if (c.state === 'busted') return;
        ctx.fillStyle = c.isPlayer ? '#ffffff' : Art.TEAM[c.gi].main;
        ctx.fillRect(px(c.x) - 2, c.isPlayer ? 3 : 5, c.isPlayer ? 5 : 3, c.isPlayer ? 10 : 6);
        if (c.isPlayer) { ctx.fillStyle = Art.TEAM[c.gi].main; ctx.fillRect(px(c.x) - 1, 4, 3, 8); }
      });
      // position
      const key = (c) => (c.state === 'busted' ? -1e9 : c.place ? 1e6 - c.place : c.x);
      const pos = 1 + this.cars.filter((c) => c !== p && key(c) > key(p)).length;
      Font.draw(ctx, 'ПОЗ ' + pos + '/' + this.cars.length, 420, 4, '#ffffff', 1, 'right');
      Font.draw(ctx, this.boss ? 'СПИСОК #' + this.boss.rank : 'РІВЕНЬ ' + this.level.n, 420, 14, '#b9a8e0', 1, 'right');
      if (p.boost > 0)
        for (let k = 0; k < 14; k++) {
          ctx.fillStyle = k % 3 ? '#ffffff55' : '#29d9ff88';
          const ly = 20 + ((k * 53 + Math.floor(t * 60) * 7) % 190), lx = ((k * 97 + Math.floor(t * 900)) % 520) - 20;
          ctx.fillRect(480 - lx, ly, 18 + (k % 3) * 8, 1);
        }
      this.button(428, 2, 48, 12, Audio8.isMuted() ? 'ТИХО' : 'ЗВУК', '#9d8cff', () => Audio8.toggleMute());
      if (window.Music && Music.started()) this.button(428, 16, 48, 12, 'ТРЕК >', '#29e0d0', () => Music.next());

      if (this.state === 'countdown') {
        const n = Math.ceil(this.count), L = this.level;
        if (this.boss) {
          const r = this.boss, pw = Portraits.W * 2, ph = Portraits.H * 2, px = 24, py = 34;
          ctx.fillStyle = '#05030c'; ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
          ctx.fillStyle = r.portrait.rim; ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2);
          ctx.drawImage(Portraits.build(r.portrait), px, py, pw, ph);
          Font.draw(ctx, r.nick, px + pw / 2, py + ph + 6, '#ffffff', 1, 'center', '#12082a');
        }
        // a duel keeps its text to the right of the rival's portrait
        const tx = this.boss ? 300 : 240;
        Font.draw(ctx, String(n), tx, 44, '#ffc31f', 6, 'center', '#8c1a5c');
        Font.draw(ctx, this.boss ? L.name : 'РІВЕНЬ ' + L.n + ' - ' + L.name, tx, 98, '#ffffff', 2, 'center', '#12082a');
        L.tips.forEach((s, i) => Font.draw(ctx, s, tx, 122 + i * 12, i === 0 ? '#ffc31f' : '#d8ccff', 1, 'center'));
      }
      if (p.state === 'hover') Font.draw(ctx, 'БУДУЙ ПІД СОБОЮ! ' + Math.ceil(p.timer), 240, 30, '#29e0d0', 1, 'center');
      if (this.state === 'race' && p.active) {
        const near = this.police.some((q) => p.x - q.x < 150);
        if (near && Math.floor(t * 4) % 2) Font.draw(ctx, '< ПОЛІЦІЯ!', 8, 40, '#ff2a3a', 1, 'left');
      }
      if (p.state === 'finished' && this.endTimer !== Infinity && this.state === 'race' && this.cars.length > 1) {
        Font.draw(ctx, 'ЧЕКАЄМО СУПЕРНИКІВ ' + Math.ceil(this.endTimer), 240, 30, '#fff1c9', 1, 'center');
        this.button(210, 42, 60, 14, 'ДАЛІ >', '#ffc31f', () => this.showResults());
      }
      if (this.tut && this.state === 'race') this.drawTutorial();
      if (this.banner) Font.draw(ctx, this.banner.text, 240, 70, this.banner.color, 3, 'center', '#12082a');
      ctx.restore();
    },

    drawTutorial() {
      const T = this.tut, g = this.world.gap, t = this.time, p = this.player, w = this.world;
      const plate = (text, y, color) => {
        const tw = Font.measure(text, 1), x = Math.round(240 - tw / 2 - 6);
        ctx.fillStyle = '#12082ae0'; ctx.fillRect(x, y - 3, Math.round(tw + 12), 13);
        ctx.fillStyle = color; ctx.fillRect(x, y + 9, Math.round(tw + 12), 1);
        Font.draw(ctx, text, 240, y, color, 1, 'center');
      };
      if (T.bridged) {
        if (p.state !== 'finished') plate('ЗБИРАЙ ГРОШІ І ЇДЬ ДО ФІНІШУ', 44, '#b6ff6a');
        return;
      }
      // pulsing frame over the chasm
      const W = g.len * CELL, tx = Math.round(g.col * CELL - this.camX), ty = g.row * CELL;
      ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ffc31f' : '#fff3a0';
      for (let x = 0; x < W; x += 4) { ctx.fillRect(tx + x, ty, 2, 1); ctx.fillRect(tx + x + 2, ty + CELL - 1, 2, 1); }
      for (let y = 0; y < CELL; y += 4) { ctx.fillRect(tx, ty + y, 1, 2); ctx.fillRect(tx + W - 1, ty + y + 2, 1, 2); }
      // demo: a see-through block flies from the tray into the chasm with a pointing hand
      if (!this.drag) {
        const k = (t % 2.4) / 1.6;
        if (k <= 1) {
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          const r = this.slotRect(1), sx = r.x + r.w / 2 - W / 2, sy = r.y + r.h / 2 - CELL / 2;
          const x = Math.round(sx + (tx - sx) * e), y = Math.round(sy + (ty - sy) * e - Math.sin(e * Math.PI) * 36);
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < g.len; i++) ctx.drawImage(Art.tile(1, this.gi), x + i * CELL, y);
          ctx.globalAlpha = 1;
          ctx.drawImage(HAND, x + W / 2 - 2, y + 8);
        }
      }
      plate('ПЕРЕТЯГНИ БЛОК З ПАНЕЛІ У ПРІРВУ', 44, '#ffc31f');
      let wrong = false;
      for (let c = g.col; c < g.col + g.len; c++) for (let r = 1; r < ROWS; r++) if (r !== g.row && w.type[r * w.cols + c]) wrong = true;
      if (wrong) plate('СТАВ БЛОК НА РІВНІ ДАХУ', 58, '#ff7cc6');
      else if (p.hold) plate('МАШИНА ЧЕКАЄ, ПОКИ ТИ ЗБУДУЄШ МІСТ', 58, '#d8ccff');
    },

    drawDuelResults() {
      const r = this.boss, win = this.win, t = this.time;
      Font.draw(ctx, win ? 'ТАЧКА ТВОЯ!' : 'ПОРАЗКА', 240, 14, win ? '#ffc31f' : '#ff3ea5', 3, 'center', '#12082a');
      Font.draw(ctx, 'ЧОРНИЙ СПИСОК #' + r.rank + ' - ' + r.nick, 240, 40, '#d8ccff', 1, 'center');
      const pw = Portraits.W * 2, ph = Portraits.H * 2, px = 44, py = 56;
      ctx.fillStyle = '#05030c'; ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      ctx.fillStyle = r.portrait.rim; ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2);
      ctx.drawImage(Portraits.build(r.portrait), px, py, pw, ph);
      if (win) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#05030c'; ctx.fillRect(px, py, pw, ph); ctx.globalAlpha = 1; }
      // speech bubble
      const quote = win ? r.lose : r.taunt, qw = Math.min(300, Font.measure(quote, 1) + 16);
      ctx.fillStyle = '#f2eefa'; ctx.fillRect(136, 62, qw, 17); ctx.fillRect(132, 68, 4, 4);
      ctx.fillStyle = '#12082a'; Font.draw(ctx, quote, 144, 67, '#12082a', 1, 'left', null);
      if (win) {
        const map = Custom.build(r.car);
        Voxel3D.render(ctx, map, { cx: 300, cy: 124, zoom: 3, yaw: t * 0.9, pitch: 0.3, glow: map.glow });
        Font.draw(ctx, r.car.name, 300, 150, '#ffffff', 2, 'center', '#12082a');
        Font.draw(ctx, this.slip ? 'ТЕПЕР У ТВОЄМУ ГАРАЖІ' : 'ПЕРЕМОГА ЗАРАХОВАНА', 300, 168, '#9bf08a', 1, 'center');
      } else {
        const p = this.player, boss = this.cars[0];
        Font.draw(ctx, p.place ? 'ТИ ФІНІШУВАВ ДРУГИМ' : 'ТИ НЕ ДОЇХАВ ДО ФІНІШУ', 300, 104, '#ff7cc6', 1, 'center');
        Font.draw(ctx, 'РЕЙТИНГ ' + Profile.rating(boss.g) + ' ПРОТИ ТВОГО ' + Profile.rating(p.g), 300, 118, '#d8ccff', 1, 'center');
        Font.draw(ctx, 'ПОТРІБНО ПРИБЛИЗНО ' + Math.round((r.need - 90) * 5), 300, 132, '#ffc31f', 1, 'center');
        Font.draw(ctx, 'ПРОКАЧАЙ ТАЧКУ В ТЮНІНГУ', 300, 146, '#b9a8e0', 1, 'center');
      }
      Font.draw(ctx, 'ЗАРОБЛЕНО: ' + UI.money(this.earned) + (this.player.deaths ? '  (СМЕРТІ: ' + this.player.deaths + ', -' + Math.round((1 - Balance.deathMul(this.player.deaths)) * 100) + '%)' : ''), 240, 180, this.earned > 0 ? '#9bf08a' : '#ff5c7a', 1, 'center');
      const main = Art.TEAM[this.gi].main;
      if (win) this.button(120, 194, 110, 22, 'КАР\'ЄРА', main, () => UI.transition('shutter', () => this.toGarage({ earned: this.earned, screen: 'career' }), 'ЧОРНИЙ СПИСОК'));
      else this.button(120, 194, 110, 22, 'ЩЕ РАЗ', main, () => UI.transition('shutter', () => this.startCareer(r), r.nick + ' VS ТИ'));
      this.button(250, 194, 110, 22, 'В ГАРАЖ', '#9d8cff', () => UI.transition('shutter', () => this.toGarage({ earned: this.earned }), 'ГАРАЖ'));
    },

    drawResults() {
      ctx.fillStyle = '#12082ad0'; ctx.fillRect(0, 0, vw, vh);
      ctx.save(); ctx.translate(ox, oy);
      const L = this.level, busted = this.player.state === 'busted';
      if (this.boss) { this.drawDuelResults(); ctx.restore(); return; }
      const title = busted ? 'ТЕБЕ ЗАТРИМАЛИ' : this.win ? 'РІВЕНЬ ' + L.n + ' ПРОЙДЕНО!' : 'ПОРАЗКА';
      Font.draw(ctx, title, 240, 18, this.win ? '#ffc31f' : '#ff3ea5', 3, 'center', '#12082a');
      if (this.win) {
        const nx = Levels.config(L.n + 1);
        Font.draw(ctx, (this.unlocked ? 'ВІДКРИТО ' : 'ДАЛІ ') + 'РІВЕНЬ ' + nx.n + ': ' + nx.name, 240, 46, '#b6ff6a', 1, 'center');
      } else if (this.cars.length > 1) {
        const top = this.results[0].c;
        Font.draw(ctx, top.state === 'busted' ? 'ПЕРЕМОЖЦІВ НЕМАЄ' : 'ПЕРЕМОЖЕЦЬ: ' + top.g.name, 240, 46, '#d8ccff', 1, 'center');
      }
      Font.draw(ctx, 'ГРОШІ', 262, 62, '#8a7aa8', 1, 'right');
      Font.draw(ctx, 'ФІНІШ', 312, 62, '#8a7aa8', 1, 'right');
      Font.draw(ctx, 'СМЕРТІ', 366, 62, '#8a7aa8', 1, 'right');
      Font.draw(ctx, 'РАЗОМ', 430, 62, '#8a7aa8', 1, 'right');
      this.results.forEach((r, i) => {
        const y = 76 + i * 34, c = r.c, pal = Art.TEAM[c.gi];
        ctx.fillStyle = c.isPlayer ? '#2a1450' : '#1a0c34'; ctx.fillRect(40, y, 400, 30);
        ctx.fillStyle = pal.main; ctx.fillRect(40, y, 2, 30);
        Font.draw(ctx, i + 1 + '.', 50, y + 11, '#ffffff', 1);
        drawMapPreview(c.map, 84, y + 14, 1, this.time + i);
        Music.clipText(ctx, c.g.name + (c.isPlayer ? ' (ТИ)' : ''), 110, y + 11, 104, pal.hi, 1, false, this.time);
        if (c.state === 'busted') { Font.draw(ctx, 'ЗАТРИМАНО', 410, y + 11, '#ff2a3a', 1, 'right'); return; }
        Font.draw(ctx, '$' + c.money, 262, y + 11, '#9bf08a', 1, 'right');
        Font.draw(ctx, c.place ? '+' + c.bonus : '-', 312, y + 11, '#ffc31f', 1, 'right');
        Font.draw(ctx, c.deaths ? c.deaths + ' -' + Math.round((1 - Balance.deathMul(c.deaths)) * 100) + '%' : '0', 366, y + 11, c.deaths ? '#ff5c7a' : '#6a5a88', 1, 'right');
        Font.draw(ctx, '$' + r.total, 430, y + 11, '#ffffff', 1, 'right');
      });
      Font.draw(ctx, 'ЗАРОБЛЕНО: ' + UI.money(this.earned) + (this.win && L.winBonus ? ' (+' + L.winBonus + ' ЗА ПЕРЕМОГУ)' : ''), 240, 178, this.earned > 0 ? '#9bf08a' : '#ff5c7a', 1, 'center');
      const main = Art.TEAM[this.gi].main;
      if (this.win) this.button(110, 192, 124, 22, 'ДАЛІ: РІВЕНЬ ' + (L.n + 1), main, () => UI.transition('shutter', () => this.startRace(L.n + 1), 'РІВЕНЬ ' + (L.n + 1)));
      else this.button(130, 192, 100, 22, 'ЩЕ РАЗ', main, () => UI.transition('shutter', () => this.startRace(L.n), 'РІВЕНЬ ' + L.n));
      this.button(250, 192, 100, 22, 'В ГАРАЖ', '#9d8cff', () => UI.transition('shutter', () => this.toGarage({ earned: this.earned }), 'ГАРАЖ'));
      ctx.restore();
    },
  };

  // in bot.html the race is driven by the bot only; real touches still work in menus
  const botOwnsInput = () => window.BOT_MODE && (Game.state === 'race' || Game.state === 'countdown');
  screen.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!botOwnsInput()) Game.pointerDown(e); });
  screen.addEventListener('pointermove', (e) => { e.preventDefault(); if (!botOwnsInput()) Game.pointerMove(e); });
  screen.addEventListener('pointerup', (e) => { e.preventDefault(); if (!botOwnsInput()) Game.pointerUp(e); });
  screen.addEventListener('pointercancel', () => { Game.drag = null; if (Game.grab) Game.releaseGrab(); });
  window.addEventListener('keydown', (e) => {
    if (Game.state === 'garage') { Garage.key(e.code); if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); return; }
    if (Game.state !== 'race' || !Game.player || window.BOT_MODE) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') { Game.player.jump(); e.preventDefault(); }
    if (e.code === 'KeyN' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!Game.player.useNitro()) Audio8.sfx.invalid(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Audio8.setEngine(0, false); Audio8.setSiren(0); } });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (vh <= vw) Game.update(dt);
    Game.draw();
    requestAnimationFrame(loop);
  }
  window.Game = Game;
  requestAnimationFrame(loop);
})();
