// Main game: states, input, tray, HUD, rendering, pixel-perfect scaling
(function () {
  const { CELL, ROWS, FIELD_H, PIECES } = World;
  const STEP = 1 / 120;
  const DRAG_LIFT = 22;               // the held block rides this far above the fingertip
  const TUNNEL_LEAD = 0.6;            // in a tunnel the car rides this much closer to the left edge
  const STAT_LABELS = ['ШВИДКІСТЬ', 'РОЗГІН', 'ПОЛІТ', 'МІЦНІСТЬ'];
  // On a desk the tray is worked with the left hand while the right one points at the road:
  // A S D take a piece, CTRL is nitro. The letters are written on the slots, but only where
  // there are keys to press - a phone would just be carrying three dead letters around.
  const SLOT_KEYS = ['A', 'S', 'D'];
  const SLOT_KEY_CODE = { KeyA: 0, KeyS: 1, KeyD: 2 };
  const HAS_KEYS = !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  const screen = document.getElementById('screen');
  const sctx = screen.getContext('2d');
  const buf = document.createElement('canvas');
  const ctx = buf.getContext('2d');
  // Every screen metric comes from Layout, which hands back one design box per orientation:
  // the old centred 480x270 in landscape, the whole view in portrait. P, DW, DH, CX, R and
  // TRAY_Y are just that box unpacked, so the drawing code below reads the same either way.
  let dpr = 1, scale = 1, vw = 480, vh = 270, ox = 0, oy = 0;
  let P = false, DW = 480, DH = 270, CX = 240, R = Layout.race, TRAY_Y = R.trayY;

  function resize() {
    const wasPortrait = P;
    const L = Layout.set(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    dpr = L.dpr; scale = L.scale; vw = L.vw; vh = L.vh; ox = L.ox; oy = L.oy;
    P = L.portrait; DW = L.W; DH = L.H; CX = L.cx; R = L.race; TRAY_Y = R.trayY;
    screen.width = L.pxW; screen.height = L.pxH;
    buf.width = vw; buf.height = vh;
    ctx.imageSmoothingEnabled = false;
    sctx.imageSmoothingEnabled = false;
    if (P !== wasPortrait && window.Game && window.Garage && Game.state === 'garage') Garage.relayout();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
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
    helis: [], free: null, seed: 0,
    armed: null,                      // tap control: the tray slot whose piece is in hand
    mouse: null,                      // last mouse position, design space - null on a touchscreen
    paint: 0, paintMax: 0, ink: null, dryT: 0,
    mouse: null, clickFx: null,

    shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); },

    // screen metrics, used by the recording bot to issue touches in screen space
    view() { return { dpr, scale, ox, oy, vw, vh, portrait: P, W: DW, H: DH, cx: CX, race: R, trayY: TRAY_Y, fieldTop: R.fieldTop }; },

    toGarage(opts) {
      this.state = 'garage';
      Particles.clear();
      Audio8.startMusic('menu');
      Audio8.setEngine(0, false); Audio8.setSiren(0);
      Garage.onRace = () => this.startRace();
      Garage.onCareer = (r) => this.startCareer(r);
      Garage.onFree = (m) => this.startFree(m);
      // A wipe drops you back on the title card, which is exactly where a first install
      // starts: the tap there loads the save again, and the save is now blank.
      Garage.onReset = () => {
        this.state = 'title';
        this.selected = Profile.data.gang || 0;
        Particles.clear();
        Audio8.startMusic('menu');
      };
      Garage.enter((opts && opts.screen) || 'hub', opts);
    },

    // A free ride plays one mechanic at its own counter; everything else about the race is
    // the same, so it comes in here as a level config rather than a second race loop.
    startFree(mode, k) {
      const lvl = k || Profile.freeLevel(mode);
      this.startRace(null, null, Levels.freeConfig(mode, lvl));
    },

    // seed: replaying a level must hand back the same track, not roll a new one
    startRace(n, seed, cfg) {
      Particles.clear();
      const L = (this.level = cfg || Levels.config(n || Profile.data.level || 1));
      this.free = L.free || null;
      this.seed = seed == null ? (Math.random() * 1e9) | 0 : seed;
      const gi = Profile.data.gang;
      this.gi = gi;
      this.world = World.create(this.seed, L);
      const order = [0, 1, 2].filter((i) => i !== gi).slice(0, L.rivals);
      const rivals = Profile.rivalDefs(order);
      this.cars = rivals.map((d, i) => new Car(this.world, d, 215 - i * 55, 128, false, order[i]));
      this.player = new Car(this.world, Profile.playerDef(), 270, 128, true, gi);
      this.cars.push(this.player);
      this.ais = rivals.map((d, i) => new AIBuilder(this.cars[i], this, { delay: L.ai.delay + i * 0.1, mistake: L.ai.mistake + i * 0.02 }));
      const px = L.policeX || [95, 40];
      this.police = px.slice(0, L.police).map((x, i) => new Police(this.world, x, this, i));
      this.helis = [];
      for (let i = 0; i < (L.heli || 0); i++) this.helis.push(new Helicopter(this, i));
      this.tut = L.tutorial ? { bridged: false } : null;
      this.boss = null;
      if (L.tunnel) this.toTunnels();
      // dealt one at a time: on a tunnel level the next piece depends on what is already in the tray
      this.tray = [];
      if (!L.draw) for (let i = 0; i < 3; i++) this.tray.push({ piece: L.tutorial ? { p: 0, v: 0 } : this.nextPiece() });
      if (this.tray.length) this.keepRamp(this.tray[2]);
      Paint.reset(this);
      this.resetRace();
    },

    // An endless run never reaches the end of its grid: once the player is deep enough in,
    // the world slides back under everything at once and a fresh chunk is generated ahead.
    // Nothing on screen moves, so the only way to tell is the odometer.
    slideWorld() {
      const w = this.world, keep = 60;
      if (this.player.x < (w.cols - 900) * CELL) return;
      const shift = Math.floor(this.player.x / CELL) - keep;
      if (shift < 200) return;
      const px = World.recycle(w, this.level, shift);
      for (const c of this.cars) c.x -= px;
      for (const q of this.police) q.car.x -= px;
      for (const h of this.helis) h.x -= px;
      for (const pt of Particles.list) pt.x -= px;
      if (this.ink) this.ink.x -= px;
      if (this.grab) this.grab.ty = this.grab.p.y;
      this.camX -= px;
      w.slid = (w.slid || 0) + px;
    },

    // the player takes the middle deck, the rivals the one above and the one below
    toTunnels() {
      const lanes = [0, 2];
      let k = 0;
      for (const c of this.cars) {
        c.tunnel = c.isPlayer ? 1 : lanes[Math.min(lanes.length - 1, k++)];
        const t = this.world.tunnels[c.tunnel];
        c.x = 70; c.y = t.floor * CELL - 12; c.vx = 0; c.vy = 0; c.a = 0; c.va = 0;
      }
    },

    // How far from the left edge the car rides. A wall in a tunnel is not a corner to steer
    // round but a puzzle to read - which piece is missing, and where - so the car sits further
    // left there and every wall arrives that much later, buying the thinking its time back.
    camLead(v) { return this.world.tunnels ? Math.max(40, v * TUNNEL_LEAD) : v; },

    resetRace() {
      this.drag = null; this.grab = null; this.ink = null; this.platT = 3; this.banner = null;
      this.armed = null;
      this.count = 3.99; this.lastBeep = 4;
      this.raceTime = 0; this.finished = 0; this.endTimer = Infinity; this.acc = 0;
      this.camX = this.player.x - this.camLead(R.lead.base);
      this.state = 'countdown';
      Audio8.startMusic('race');
    },

    // Replaying is replaying THIS track: the same seed and the same config, not a fresh roll
    // of the same level number. Losing a run you had read is one thing; losing the road you
    // had learned is another.
    replay() {
      if (this.boss) this.startCareer(this.boss, this.seed);
      else this.startRace(null, this.seed, this.level);
    },

    // Blacklist duel: one on one with the rival's tuned car; the winner takes the loser's pink slip
    startCareer(r, seed) {
      Particles.clear();
      const L = (this.level = Levels.boss(r));
      const gi = Profile.data.gang;
      this.gi = gi;
      this.seed = seed == null ? (Math.random() * 1e9) | 0 : seed;
      this.world = World.create(this.seed, L);
      const bg = r.gang === gi ? (gi + 1) % 3 : r.gang;
      const def = Profile.def(r.car.id, r.bossUp, { glow: ['pink', 'gold', 'cyan'][bg] });
      this.cars = [new Car(this.world, def, 215, 128, false, bg)];
      this.player = new Car(this.world, Profile.playerDef(), 270, 128, true, gi);
      this.cars.push(this.player);
      this.ais = [new AIBuilder(this.cars[0], this, L.ai)];
      this.police = []; this.helis = []; this.tut = null;
      this.free = null; this.boss = r;
      this.tray = [];
      for (let i = 0; i < 3; i++) this.tray.push({ piece: this.nextPiece() });
      this.keepRamp(this.tray[2]);
      Paint.reset(this);
      this.resetRace();
    },

    nextPiece() {
      if (this.level && this.level.tutorial) return { p: Math.random() < 0.7 ? 0 : 1, v: 0 };
      if (this.world && this.world.tunnels) return Tunnel.deal(this);
      return World.randomPiece(Math.random);
    },

    // withPickups: AI builders keep clear of money and nitro; the player's pieces may cover them.
    // noCars: a piece you lay yourself ignores traffic altogether - whatever is standing where
    // it lands rides up onto it. Fencing off every car turned the square around your own
    // bumper, the one place a race is won or lost, into the one square you could not build in.
    // The rivals still plan around traffic, and the helicopter is no car to lift, so it stays.
    rects(withPickups = true, skipGi = null, noCars = false) {
      const out = withPickups ? World.bagRects(this.world) : [];
      if (!noCars)
        for (const c of this.cars.concat(this.police.map((q) => q.car))) {
          if (c.state === 'wreck' || c.state === 'fell' || c.state === 'busted') continue;
          if (skipGi != null && c.gi === skipGi) continue;
          out.push(c.bbox());
        }
      for (const h of this.helis) out.push(h.rect());
      return out;
    },

    tryPlace(shape, col, row, owner, replace = false) {
      if (!World.canPlace(this.world, shape, col, row, this.rects(!replace, null, replace), replace)) return false;
      if (this.world.draw) return this.paintShape(shape, col, row, owner);
      if (replace) { this.shatterUnder(shape, col, row, owner); this.clearPickups(shape, col, row); }
      World.place(this.world, shape, col, row, owner);
      if (replace) this.liftCars(shape, col, row);
      const pal = Art.teamPal(owner);
      shape.forEach((line, dy) => line.forEach((t, dx) => {
        if (t) Particles.spark((col + dx) * CELL + 8, (row + dy) * CELL + 8, 2, [pal.hi, '#ffffff'], 40);
      }));
      if (this.world.tunnels) Tunnel.onPlace(this, shape, col, row);
      return true;
    },

    // Anything the new piece landed on top of is set on the piece rather than buried in it.
    liftCars(shape, col, row) {
      for (const c of this.cars.concat(this.police.map((q) => q.car))) {
        if (!c.active && c.state !== 'finished') continue;
        const b = c.bbox();
        let top = Infinity;
        shape.forEach((line, dy) => line.forEach((t, dx) => {
          if (!t) return;
          const x0 = (col + dx) * CELL, y0 = (row + dy) * CELL;
          if (x0 < b.x + b.w && x0 + CELL > b.x && y0 < b.y + b.h && y0 + CELL > b.y) top = Math.min(top, y0);
        }));
        if (top < Infinity) c.liftOnto(top);
      }
    },

    // on a neon level the rivals paint too: the top surface of their piece becomes a line
    paintShape(shape, col, row, owner) {
      const pts = [];
      for (let dx = 0; dx < shape[0].length; dx++)
        for (let dy = 0; dy < shape.length; dy++)
          if (shape[dy][dx]) { pts.push([(col + dx) * CELL + 8, (row + dy) * CELL + 4]); break; }
      if (pts.length < 2) return false;
      for (let i = 1; i < pts.length; i++) World.inkAdd(this.world, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], owner);
      const pal = Art.teamPal(owner);
      for (const p of pts) Particles.spark(p[0], p[1], 1, [pal.hi, '#ffffff'], 40);
      return true;
    },

    popPickup(p) {
      p.taken = true;
      const cols = p.value ? ['#3fbf5a', '#a8f59a', '#ffffff'] : this.world.draw ? [Art.teamPal(this.gi).hi, '#ffffff'] : ['#29d9ff', '#ffffff'];
      Particles.spark(p.x, p.y, 10, cols, 70);
      for (let k = 0; k < 4; k++) Particles.smoke(p.x + (Math.random() - 0.5) * 8, p.y);
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
        this.popPickup(p); lost++;
      }
      if (lost) Audio8.sfx.invalid();
      return lost;
    },

    // the same rule for a painted line: it goes over anything, and burns the pickups it touches
    burnPickups(x0, y0, x1, y1) {
      const w = this.world, R = World.INK_R + 5;
      const dx = x1 - x0, dy = y1 - y0, inv = 1 / (dx * dx + dy * dy || 1);
      const lo = Math.min(x0, x1) - R - 6, hi = Math.max(x0, x1) + R + 6;
      const hit = (p) => {
        if (p.taken || p.x < lo || p.x > hi) return false;
        let t = ((p.x - x0) * dx + (p.y - y0) * dy) * inv;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = p.x - x0 - dx * t, ey = p.y - y0 - dy * t;
        return ex * ex + ey * ey <= R * R;
      };
      let lost = 0;
      for (const p of w.bags) if (hit(p)) { this.popPickup(p); lost++; }
      for (const p of w.nitros) if (hit(p)) { this.popPickup(p); lost++; }
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

    // a cop touch costs $50 while there is money on hand; a broke racer gets arrested.
    // a bonus run is the chase itself: one touch and the run is over, money and all.
    onCaught(car, cop) {
      if (car.state === 'busted' || car.fineCd > 0) return;
      if (this.level.bonusRun || car.money <= 0) { this.onBusted(car); return; }
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
      // a bonus run does not tax a crash, it only costs you the road you were on
      if (this.level.bonusRun) { if (this.level.draw) Paint.onDeath(this, car); return 0; }
      Particles.text(car.x, car.y - 26, car.deaths <= 9 ? '-10% ГРОШЕЙ' : 'МІНІМУМ 10%', '#ff5c7a');
      this.penaltyFlash = 1.2;
      if (this.level.draw) Paint.onDeath(this, car);
      return cut;
    },

    showResults() {
      this.state = 'results';
      this.drag = null; this.armed = null;
      const p = this.player, L = this.level;
      this.results = this.cars
        .map((c) => ({ c, total: c.state === 'busted' && !L.bonusRun ? 0 : this.keep(c, c.money + c.bonus) }))
        .sort((a, b) => b.total - a.total);
      // Winning and passing are two different things. A Blacklist duel is a gate: there the
      // rival's pink slip is the prize and second place gets nothing. An ordinary level is
      // passed by reaching the finish at all - coming last is punished by the money you did
      // not earn, which is what the next car costs, and not by being sent round again.
      // The one way to fail one is the cell: a cop touch is bought off at $50 a time, so
      // being taken in means there was nothing left to pay with. That run is over.
      this.win = L.bonusRun ? true : p.state !== 'busted' && p.place > 0 && (this.boss ? p.place === 1 : this.results[0].c === p);
      this.passed = this.boss ? this.win : L.bonusRun ? true : p.state !== 'busted';
      // A bonus run pays what you picked up, full stop: the cops ending the run is the whole
      // penalty, and taxing the crashes on top would punish the same mistake twice.
      this.earned = L.bonusRun ? p.money : p.state === 'busted' ? 0 : this.keep(p, p.money + p.bonus + (this.win ? L.winBonus : 0));
      this.record = L.bonusRun ? Profile.bonusScore(this.earned) : false;
      this.distance = L.endless ? Math.round(((this.world.slid || 0) + p.x) / 16) : 0;
      this.unlocked = !this.boss && !this.free && this.passed && Profile.data.level <= L.n;
      this.slip = this.boss && this.win ? Profile.careerWin(this.boss) : false;
      if (this.passed && this.free) Profile.freeDone(this.free);
      else if (this.passed && !this.boss) Profile.levelDone(L.n);
      Profile.raceDone(this.earned, this.win);
      Audio8.setEngine(0, false); Audio8.setSiren(0);
      if (this.win) Audio8.sfx.finish();
    },

    onPaintCan(n) { Paint.pickCan(this, n); },

    // A spent slot is dealt its next piece on the spot. The cycle it used to sit out was dead
    // time the race never handed back: three slots meant laying two blocks and then waiting.
    refill(slot) { slot.piece = this.nextPiece(); this.keepRamp(slot); slot.flash = 0.22; },

    // One of the three is always a ramp. Falling into a pit with nothing but flat blocks in
    // hand is a run lost to the shuffle, not to the driver, so the slot that would have left
    // the tray without a way up is dealt one instead. Tunnels deal to fit a wall and neon
    // levels have no tray at all, so neither is touched.
    keepRamp(slot) {
      if (this.level.draw || this.level.tutorial || this.world.tunnels) return;
      if (this.tray.some((s) => World.climbs(s.piece))) return;
      slot.piece = World.rampPiece(Math.random);
    },

    slotRect(i) { return R.slots[i]; },

    // A S D take a piece into the hand exactly as a thumb on the slot does, and the same key
    // again puts it back - a key that is held down must never turn into a second meaning.
    armSlot(i) {
      if (this.state !== 'race' && this.state !== 'countdown') return;
      if (this.level.draw || this.player.state === 'busted' || !this.tray[i]) return;
      this.drag = null;
      if (this.armed === i) { this.armed = null; Audio8.sfx.click(); }
      else { this.armed = i; Audio8.sfx.select(); }
      this.draw();
    },

    // Where a piece lands for a fingertip at sx,sy. A dragged one hangs clear above the thumb,
    // since the whole point of dragging is watching the ghost; a tapped one lands centred on the
    // tap, because a tap means "here" and there is no ghost to read before the finger lifts.
    aim(piece, sx, sy, lifted) {
      const shape = PIECES[piece.p].v[piece.v];
      const sw = shape[0].length * CELL, sh = shape.length * CELL;
      // sy comes in design space; the field may be parked lower down the screen in portrait
      const fy = sy - R.fieldTop;
      const cy = lifted ? fy - DRAG_LIFT - sh / 2 : fy;
      // the cell is read off the fingertip in screen space every frame, so the scrolling road
      // never carries the piece away from the finger holding it
      let col = Math.round((sx + this.camX - sw / 2) / CELL);
      let row = Math.round((cy - sh / 2) / CELL);
      // The grid ends at row 12 but the tray starts 14 pixels lower, so an aim read straight off
      // the finger fell off the bottom of the field and the last strip above the tray - the very
      // strip you build in, right under the car - answered nothing at all. The aim is pulled back
      // onto the field instead: the edge of the road is a place you can point at, not a dead zone.
      row = Math.max(1, Math.min(ROWS - shape.length, row));
      col = Math.max(0, Math.min(this.world.cols - shape[0].length, col));
      // tutorial: a straight block dropped near the chasm snaps into it
      const gap = this.tut && !this.tut.bridged ? this.world.gap : null;
      if (gap && shape.length === 1 && Math.abs(row - gap.row) <= 1 && col + shape[0].length > gap.col - 2 && col < gap.col + gap.len + 2) {
        row = gap.row;
        col = Math.max(gap.col, Math.min(gap.col + gap.len - shape[0].length, col));
      }
      // tunnels: the right piece aimed anywhere at the wall ahead drops into the hole it fits
      if (this.world.tunnels) {
        const fit = Tunnel.snap(this, piece, col, row, shape);
        if (fit) { col = fit.col; row = fit.row; }
      }
      const sxL = col * CELL - this.camX;
      const onScreen = sxL + sw > -ox && sxL < vw - ox && sy < TRAY_Y;
      // the ghost has to answer exactly what tryPlace will, cars included
      const ok = onScreen && World.canPlace(this.world, shape, col, row, this.rects(false, null, true), true);
      const swap = new Set();
      shape.forEach((line, dy) => line.forEach((t, dx) => { if (t && World.cellAt(this.world, col + dx, row + dy)) swap.add(dy * 16 + dx); }));
      return { shape, col, row, ok, swap };
    },

    ghost() { const d = this.drag; return this.aim(this.tray[d.slot].piece, d.sx, d.sy, true); },

    // A piece taken from the tray replaces the pointer with itself, so the two must never
    // both be on screen: this is the one question both of them ask.
    heldPointer() {
      return !!(this.mouse && this.armed != null && !this.drag && this.tray[this.armed] && !this.level.draw
        && (this.state === 'race' || this.state === 'countdown'));
    },

    // The desktop pointer, drawn last so it sits over everything including a wipe. The system
    // arrow is hidden for as long as a mouse is the thing being used; a touchscreen has no
    // pointer to replace, so it is handed back the moment a finger touches the glass.
    drawCursor() {
      const m = this.mouse;
      const want = m ? 'none' : '';
      if (screen.style.cursor !== want) screen.style.cursor = want;
      if (!m) return;
      const acc = Profile.data && Profile.data.gang != null ? Art.TEAM[Profile.data.gang].main : '#ff3ea5';
      // The buffer is blitted up by a whole number, so at a small window one design pixel is
      // only two on the glass and the pointer came out no bigger than the one it replaced.
      // Doubling it there keeps it the same size on the glass whatever the window is.
      const z = scale <= 2 ? 2 : 1;
      ctx.save(); ctx.translate(ox, oy);
      const fx = this.clickFx;
      if (fx) UI.clickRing(ctx, fx.x, fx.y, Math.min(1, fx.t / 0.3), acc, z);
      // with a piece in hand the piece is the pointer; all it lacks is the spot it aims at
      if (this.heldPointer()) {
        const piece = this.tray[this.armed].piece;
        UI.crosshair(ctx, m.x, m.y, this.aim(piece, m.x, m.y, false).ok ? '#ffffff' : '#ff2a3a', z);
      } else {
        const hot = this.buttons.some((b) => m.x >= b.x && m.x < b.x + b.w && m.y >= b.y && m.y < b.y + b.h);
        UI.cursor(ctx, m.x, m.y, acc, hot, this.time, z);
      }
      ctx.restore();
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
      if (this.clickFx && (this.clickFx.t += dt) > 0.3) this.clickFx = null;
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
      for (const h of this.helis) h.update(dt, this);
      for (const c of this.cars) if (c.fineCd > 0) c.fineCd -= dt;
      if (this.tut) this.updateTutorial();
      if (this.level.draw) Paint.update(dt, this);
      Particles.update(dt, w);
      for (let i = 0; i < w.flash.length; i++) if (w.flash[i] > 0) w.flash[i] = Math.max(0, w.flash[i] - dt * 10);
      for (const s of this.tray) if (s.flash > 0) s.flash -= dt;
      if (w.tunnels) Tunnel.restock(this, dt);

      this.updatePlatforms(dt);
      if (this.level.endless) this.slideWorld();
      // the faster the car goes the further left it sits, so more of the road shows ahead -
      // which matters most in portrait, where there is barely half a landscape view to spend
      const lead = R.lead;
      const raw = p.boost > 0 ? lead.fast : lead.base - Math.max(0, Math.min(1, (p.vx - 120) / 120)) * (lead.base - lead.fast);
      const target = p.x - this.camLead(raw);
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

    // the field is drawn R.fieldTop below the design origin, so world-space work - painting,
    // grabbing a platform, aiming a block - reads the pointer through here
    toField(q) { return { x: q.x, y: q.y - R.fieldTop }; },

    toSafe(e) {
      const r = screen.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * dpr) / scale - ox, y: ((e.clientY - r.top) * dpr) / scale - oy };
    },

    pointerDown(e) {
      const q = this.toSafe(e);
      if (e.pointerType !== 'touch') { this.mouse = q; this.clickFx = { x: q.x, y: q.y, t: 0 }; }
      if (UI.transitioning) return;
      if (this.state === 'garage') { Garage.pointerDown(q); return; }
      if ((this.state === 'race' || this.state === 'countdown') && this.player.state !== 'busted') {
        const inR = (r) => q.x >= r.x && q.x < r.x + r.w && q.y >= r.y && q.y < r.y + r.h;
        const f = this.toField(q);
        if (inR(this.level.draw ? R.jumpWide : R.jump)) { this.player.jump(); this.pressJ = 0.15; return; }
        if (!this.level.draw && inR(R.nitro)) { if (this.player.useNitro()) this.shake(2); else Audio8.sfx.invalid(); this.pressN = 0.15; return; }
        // A piece in hand owns the next tap on the field, platforms included: on a level with
        // drifting platforms the grab used to swallow the tap and the block stayed in hand.
        if (!this.grab && this.armed == null && q.y < TRAY_Y) {
          const wx = f.x + this.camX;
          const pl = this.world.platforms.find((p) => wx >= p.x - 8 && wx < p.x + p.w + 8 && f.y >= p.y - 12 && f.y < p.y + 28);
          if (pl) { this.grab = { id: e.pointerId, p: pl, off: f.y - pl.y, ty: pl.y }; pl.held = true; Audio8.sfx.grab(); return; }
        }
        if (this.level.draw) {
          // a stroke never starts on a HUD button, so the sound and track taps still work
          const onBtn = this.buttons.some((b) => q.x >= b.x && q.x < b.x + b.w && q.y >= b.y && q.y < b.y + b.h);
          if (q.y < TRAY_Y && !onBtn) Paint.down(this, e.pointerId, f);
          return;
        }
        // Tap control: a piece in hand goes down the moment the field is touched. Waiting for
        // the lift would cost the whole press, and this game is played on the reflex.
        if (this.armed != null && !this.drag && q.y < TRAY_Y && !this.buttons.some((b) => q.x >= b.x && q.x < b.x + b.w && q.y >= b.y && q.y < b.y + b.h)) {
          const slot = this.tray[this.armed];
          const g = this.aim(slot.piece, q.x, q.y, false);
          if (g.ok && this.tryPlace(g.shape, g.col, g.row, this.gi, true)) {
            Audio8.sfx.place();
            this.refill(slot);
            this.armed = null;
          } else Audio8.sfx.invalid();   // a miss keeps the piece in hand, ready for another go
          this.draw();                   // on screen now, not on the next frame
          return;
        }
        for (let i = 0; i < 3; i++) {
          const r = this.slotRect(i);
          if (!this.drag && q.x >= r.x && q.x < r.x + r.w && q.y >= r.y && q.y < r.y + r.h) {
            // touching a slot takes its piece in hand, full stop - the tray lights up under the
            // thumb rather than on the lift, and no second meaning is hiding behind the same tap
            this.drag = { id: e.pointerId, slot: i, sx: q.x, sy: q.y, x0: q.x, y0: q.y, moved: false };
            if (this.armed !== i) Audio8.sfx.select();
            this.armed = i;
            this.draw();
            return;
          }
        }
        // the rest of the tray is the place to put a picked piece back down
        if (q.y >= TRAY_Y && this.armed != null) { this.armed = null; Audio8.sfx.click(); }
      }
    },

    // the ghost is derived from the fingertip, so holding it is just remembering where that is
    dragTo(q) {
      this.drag.sx = q.x; this.drag.sy = q.y;
    },

    pointerMove(e) {
      const q = this.toSafe(e);
      this.mouse = e.pointerType === 'touch' ? null : q;
      if (this.state === 'garage') { Garage.pointerMove(q); return; }
      if (this.grab && e.pointerId === this.grab.id) this.grab.ty = q.y - R.fieldTop - this.grab.off;
      if (this.ink && e.pointerId === this.ink.id) { Paint.move(this, this.toField(q)); return; }
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.dragTo(q);
      if (!this.drag.moved) {
        // the slop is a real distance on the glass, not a virtual one. At phone scale six virtual
        // units is four CSS pixels - less than the smudge an ordinary finger leaves on a tap - so
        // a tap read as a drag, the piece never stayed in hand and the tray only ever turned it.
        const slop = (9 * dpr) / scale;
        // and a finger that never leaves the tray is still tapping, however far it slid
        if (q.y < TRAY_Y || Math.hypot(q.x - this.drag.x0, q.y - this.drag.y0) > slop) this.drag.moved = true;
      }
    },

    pointerUp(e) {
      const q = this.toSafe(e);
      if (this.grab && e.pointerId === this.grab.id) { this.releaseGrab(); Audio8.sfx.place(); this.draw(); return; }
      if (this.ink && e.pointerId === this.ink.id) { Paint.up(this); return; }
      if (this.drag && e.pointerId !== this.drag.id) return;
      if (this.drag) {
        const d = this.drag, slot = this.tray[d.slot];
        this.dragTo(q);
        if (q.y < TRAY_Y) {
          // the finger came up over the field, so the piece goes down there and leaves the hand
          // whichever way it went: a drag that missed is an abandoned drag, not a piece still held
          const g = this.ghost();
          if (g.ok && this.tryPlace(g.shape, g.col, g.row, this.gi, true)) {
            Audio8.sfx.place();
            this.refill(slot);
          } else Audio8.sfx.invalid();
          if (this.armed === d.slot) this.armed = null;
        }
        this.drag = null;
        this.draw(); // show the piece now instead of waiting for the next frame
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
            // no orientation lock: the game lays itself out for whichever way the phone is held
            fs.call(el);
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
      const menu = this.state === 'title' || this.state === 'select';
      const cam = menu ? this.time * 40 : this.camX;
      // the sunset hangs off the road: in the menus there is none, so it gets its own line
      Art.drawBackground(ctx, vw, vh, menu ? oy + Layout.menuHorizon() : oy + R.fieldTop, cam, this.time);
      if (this.state === 'title') this.drawTitle();
      else if (this.state === 'select') this.drawSelect();
      else {
        this.drawWorld();
        this.drawTray();
        // the results sheet is its own screen: leaving the race HUD under it only put live
        // buttons behind a dim overlay, and in portrait it collided with the heading outright
        if (this.state === 'results') this.drawResults();
        else { this.drawHUD(); this.drawHeldCursor(); }
      }
      }
      if (window.Bot && (this.state === 'race' || this.state === 'countdown')) { ctx.save(); ctx.translate(ox, oy); Bot.draw(ctx); ctx.restore(); }
      // the settings screen has its own sound panel, and the now-playing card landed right on
      // top of the music slider - the one control it was covering
      if (window.Music && Music.started() && !(this.state === 'garage' && (Garage.screen === 'jukebox' || Garage.screen === 'career' || Garage.screen === 'settings'))) {
        const acc = Profile.data && Profile.data.gang != null ? Art.TEAM[Profile.data.gang].main : '#ff3ea5';
        const inRace = this.state === 'race' || this.state === 'countdown' || this.state === 'results';
        const pw = Math.min(196, DW - 8);
        const pos = P
          ? inRace ? [4, R.trayY - 38, pw] : this.state === 'garage' ? [4, 32, pw] : [4, DH - 42, pw]
          : this.state === 'results' ? [4, 232, 196] : inRace ? [4, 184, 196] : this.state === 'garage' ? [176, 31, 164] : this.state === 'select' ? [4, 2, 168] : [4, 232, 196];
        ctx.save(); ctx.translate(ox, oy);
        Music.drawPopup(ctx, pos[0], pos[1], acc, pos[2]);
        ctx.restore();
      }
      UI.drawTransition(ctx, vw, vh, this.time);
      if (window.Debug) Debug.draw(ctx, { vw, vh, ox, oy, time: this.time, button: (x, y, w, h, l, c, fn) => this.button(x, y, w, h, l, c, fn) });
      this.drawCursor();
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(buf, 0, 0, vw * scale, vh * scale);
    },

    drawTitle() {
      const t = this.time;
      ctx.save(); ctx.translate(ox, oy);
      // the logo sits high over the sunset, the traffic runs along the road below it
      const top = P ? Math.round(DH * 0.16) : 34;
      Font.draw(ctx, 'MIAMI', CX, top, '#ff3ea5', 6, 'center', '#29e0d0');
      Font.draw(ctx, 'BLOCK RUSH', CX, top + 52, '#ffc31f', 3, 'center', '#8c1a5c');
      Font.draw(ctx, 'ГАНГСТЕРСЬКІ ПЕРЕГОНИ 1986', CX, top + 82, '#fff1c9', 1, 'center');
      // the road runs the full glass, not just the safe box: a wide phone had it stop short
      const roadY = Layout.menuRoad(), x0 = -ox - 16, x1 = vw - ox + 16;
      for (let x = x0; x < x1; x += 16) ctx.drawImage(Art.tile(1, 9), x - Math.floor((t * 60) % 16), roadY);
      [0, 1, 2].forEach((i) => {
        const span = x1 - x0 + 120;
        const x = x0 - 60 + ((t * 50 + (i * span) / 3) % span);
        drawMapPreview(starterMap(i), Math.round(x), roadY - 8, 1, t + i);
      });
      if (Math.floor(t * 2) % 2 === 0) Font.draw(ctx, 'ТОРКНИСЬ, ЩОБ ПОЧАТИ', CX, top + 116, '#ffffff', 1, 'center');
      ctx.restore();
    },

    // One gang card. Landscape stands the three side by side; portrait lays them out as wide
    // rows - the turntable on the right, the name and the stat bars filling the width.
    gangCard(i, x, y, w, h, t) {
      const g = GANGS[i], pal = Art.TEAM[i], sel = this.selected === i;
      const lift = sel ? -2 : 0, Y = y + lift;
      ctx.fillStyle = sel ? '#1f0c3ee8' : '#12082ac8';
      ctx.fillRect(x, Y, w, h);
      ctx.fillStyle = sel ? pal.main : pal.dark;
      ctx.fillRect(x, Y, w, sel ? 2 : 1); ctx.fillRect(x, Y + h - 1, w, 1);
      ctx.fillRect(x, Y, 1, h); ctx.fillRect(x + w - 1, Y, 1, h);
      const st = Catalog.STARTERS[i], smap = starterMap(i);
      const hop = i === 1 && sel ? Math.max(0, Math.sin(t * 5)) * 1.6 : 0;
      const spin = { yaw: t * (sel ? 0.9 : 0.35) + i * 2, pitch: 0.34, bob: -hop, glow: sel ? pal.main : null, glowK: 0.5 };
      if (P) {
        // the block of text is a fixed height, so it is centred rather than pinned to the top
        const cy = Y + Math.round((h - 96) / 2), carX = x + w - 52;
        const barW = Math.max(46, Math.min(90, w - 178));
        Voxel3D.render(ctx, smap, Object.assign({ cx: carX, cy: Y + h / 2 - 4, zoom: sel ? 2.3 : 1.9 }, spin));
        Font.draw(ctx, g.name, x + 8, cy + 3, pal.main, 1, 'left');
        Font.draw(ctx, st.name, x + 8, cy + 14, '#b9a8e0', 1, 'left');
        Font.draw(ctx, g.desc, x + 8, cy + 25, '#fff1c9', 1, 'left');
        Profile.bars(Profile.stats(st.id)).forEach((v, si) => {
          const sy = cy + 42 + si * 13;
          Font.draw(ctx, STAT_LABELS[si], x + 8, sy, '#d8ccff', 1, 'left');
          UI.bar(ctx, x + 68, sy, barW, v, null, pal.main);
        });
      } else {
        Font.draw(ctx, g.name, x + w / 2, Y + 8, pal.main, 1, 'center');
        Font.draw(ctx, st.name, x + w / 2, Y + 19, '#b9a8e0', 1, 'center');
        Voxel3D.render(ctx, smap, Object.assign({ cx: x + w / 2, cy: Y + 47, zoom: sel ? 2.4 : 2 }, spin));
        Font.draw(ctx, g.desc, x + w / 2, Y + 80, '#fff1c9', 1, 'center');
        Profile.bars(Profile.stats(st.id)).forEach((v, si) => {
          const sy = Y + 98 + si * 16;
          Font.draw(ctx, STAT_LABELS[si], x + 8, sy, '#d8ccff', 1, 'left');
          UI.bar(ctx, x + 78, sy, 60, v, null, pal.main);
        });
      }
      this.buttons.push({ x, y, w, h, fn: () => (this.selected = i) });
    },

    drawSelect() {
      const t = this.time;
      ctx.save(); ctx.translate(ox, oy);
      Font.draw(ctx, 'ОБЕРИ БАНДУ', CX, 10, '#ffffff', 2, 'center', '#8c1a5c');
      if (P) {
        // a card only needs room for its stats; a tall phone gets the slack as margin, not as
        // three cards with a hole under every one of them
        const top = 28, botH = 68, gap = 8, band = DH - top - botH;
        const h = Math.min(Math.floor((band - gap * 2) / 3), 150);
        const y0 = top + Math.round((band - (h * 3 + gap * 2)) / 2);
        GANGS.forEach((g, i) => this.gangCard(i, 6, y0 + i * (h + gap), DW - 12, h, t));
      } else {
        GANGS.forEach((g, i) => this.gangCard(i, 13 + i * 154, 36, 146, 172, t));
      }
      const pal = Art.TEAM[this.selected];
      const by = P ? DH - 60 : 216;
      this.button(Math.round(CX - 74), by, 148, 24, 'ДО ГАРАЖУ', pal.main, () => { Profile.setGang(this.selected); UI.transition('slash', () => this.toGarage()); }, 2);
      Font.draw(ctx, P ? 'БАНДА ДАЄ ПЕРШУ ТАЧКУ' : 'ТВОЯ БАНДА - ТВОЯ ПЕРША ТАЧКА. РЕШТУ КУПИШ.', CX, by + 30, '#b9a8e0', 1, 'center');
      if (window.Music && Music.started()) Music.drawMini(ctx, P ? DW - 70 : 408, P ? DH - 26 : 4, (x, y, w, h, fn) => this.buttons.push({ x, y, w, h, fn }), pal.main);
      ctx.restore();
    },

    drawWorld() {
      const w = this.world, t = this.time;
      const sh = this.shakeAmt;
      const cx = Math.round(this.camX + (Math.random() - 0.5) * sh * 2);
      const cyOff = Math.round((Math.random() - 0.5) * sh);
      ctx.save(); ctx.translate(ox, oy + R.fieldTop + cyOff);

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
      if (w.ink) Paint.drawInk(ctx, w, cx, t, cx - ox, cx - ox + vw);
      if (w.tunnels) Tunnel.drawHints(ctx, this, cx, t);
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
        ctx.drawImage(w.draw ? Paint.canImg(this.gi) : Art.nitro, X, Math.round(n.y - 6 + bob));
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
      for (const h of this.helis) h.draw(ctx, cx, t);
      Particles.draw(ctx, cx);

      const p = this.player;
      if (p.active || p.state === 'finished') {
        const mx = Math.round(p.x - cx), my = Math.max(2, Math.round(p.y - 20 + Math.sin(t * 6)));
        ctx.fillStyle = Art.TEAM[this.gi].hi;
        ctx.fillRect(mx - 2, my, 5, 1); ctx.fillRect(mx - 1, my + 1, 3, 1); ctx.fillRect(mx, my + 2, 1, 1);
      }

      // A dragged block is two things at once. The landing footprint is snapped to the grid and
      // so it belongs to the road and scrolls with it. The block in the hand belongs to the
      // hand: it is drawn on the fingertip in screen space, pixel for pixel, because a block
      // that slides back with the road and then snaps a cell forward reads as if the finger
      // lost it - worst of all in the tunnels, where the hole is one cell wide.
      if (this.drag && this.drag.moved && this.drag.sy < TRAY_Y) {
        const d = this.drag, g = this.ghost();
        const sw = g.shape[0].length * CELL, sh = g.shape.length * CELL;
        g.shape.forEach((line, dy) => line.forEach((ty, dx) => {
          if (!ty) return;
          const X = (g.col + dx) * CELL - cx, Y = (g.row + dy) * CELL;
          ctx.globalAlpha = g.ok ? 0.3 : 0.22;
          ctx.drawImage(g.ok ? Art.tile(ty, this.gi) : tintTile(ty, '#ff2a3a'), X, Y);
          ctx.globalAlpha = g.ok ? 0.85 : 0.7;
          ctx.fillStyle = g.ok ? Art.TEAM[this.gi].hi : '#ff2a3a';
          ctx.fillRect(X, Y, CELL, 1); ctx.fillRect(X, Y + CELL - 1, CELL, 1);
          ctx.fillRect(X, Y, 1, CELL); ctx.fillRect(X + CELL - 1, Y, 1, CELL);
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
        // aim() hangs the piece DRAG_LIFT above the fingertip, so its bottom edge is there too
        const hx = Math.round(d.sx - sw / 2), hy = Math.round(d.sy - DRAG_LIFT - sh - R.fieldTop);
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#05030c';
        g.shape.forEach((line, dy) => line.forEach((ty, dx) => { if (ty) ctx.fillRect(hx + dx * CELL + 2, hy + dy * CELL + 3, CELL, CELL); }));
        ctx.globalAlpha = 0.95;
        g.shape.forEach((line, dy) => line.forEach((ty, dx) => { if (ty) ctx.drawImage(g.ok ? Art.tile(ty, this.gi) : tintTile(ty, '#ff2a3a'), hx + dx * CELL, hy + dy * CELL); }));
        ctx.globalAlpha = 1;
      }
      if (this.ink) Paint.drawTip(ctx, this, cx, t);
      ctx.restore();
    },

    // With a piece taken from the tray, the mouse pointer becomes that piece: it is what the
    // tap will lay down, drawn where the tap would put it, so the hand and the hint are the same
    // thing. A touchscreen has no pointer to replace, so it gets nothing.
    drawHeldCursor() {
      if (!this.heldPointer()) return;
      const piece = this.tray[this.armed].piece, shape = PIECES[piece.p].v[piece.v];
      const sw = shape[0].length * CELL, sh = shape.length * CELL;
      const g = this.aim(piece, this.mouse.x, this.mouse.y, false);
      const x0 = Math.round(this.mouse.x - sw / 2), y0 = Math.round(this.mouse.y - sh / 2);
      ctx.save(); ctx.translate(ox, oy);
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#05030c';
      shape.forEach((line, dy) => line.forEach((t, dx) => { if (t) ctx.fillRect(x0 + dx * CELL + 2, y0 + dy * CELL + 3, CELL, CELL); }));
      ctx.globalAlpha = 0.95;
      shape.forEach((line, dy) => line.forEach((t, dx) => { if (t) ctx.drawImage(g.ok ? Art.tile(t, this.gi) : tintTile(t, '#ff2a3a'), x0 + dx * CELL, y0 + dy * CELL); }));
      ctx.globalAlpha = 1;
      // a hairline frame keeps the piece readable over the road it is about to join
      ctx.fillStyle = g.ok ? '#ffffff' : '#ff2a3a';
      ctx.fillRect(x0, y0 - 1, sw, 1); ctx.fillRect(x0, y0 + sh, sw, 1);
      ctx.fillRect(x0 - 1, y0, 1, sh); ctx.fillRect(x0 + sw, y0, 1, sh);
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
      if (this.level.draw) { const G = R.gauge; Paint.drawGauge(ctx, this, G.x, G.y, G.w, G.h, this.time); }
      this.tray.forEach((s, i) => {
        const r = this.slotRect(i);
        const dragging = this.drag && this.drag.slot === i && this.drag.moved;
        const picked = this.armed === i && !dragging;
        // on a tunnel level the slot that fits the next wall is lit up
        const wanted = this.world.tunnels && Tunnel.wants(this, s.piece);
        ctx.fillStyle = '#1f0c3e'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = s.flash > 0 && Math.floor(this.time * 16) % 2 ? '#ffffff' : dragging ? pal.main : picked || wanted ? pal.hi : '#3d2f7a';
        ctx.fillRect(r.x, r.y, r.w, 1); ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1); ctx.fillRect(r.x, r.y, 1, r.h); ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
        // The piece in hand has to read at arm's length on a phone in one glance, so it gets a
        // lit floor, a breathing frame two pixels out, and the block itself raised off the slot.
        if (picked) {
          const pulse = 0.5 + 0.5 * Math.sin(this.time * 7);
          ctx.globalAlpha = 0.14 + 0.1 * pulse;
          ctx.fillStyle = pal.hi; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
          ctx.globalAlpha = 0.45 + 0.55 * pulse;
          ctx.fillStyle = '#ffffff';
          for (let k = 1; k <= 2; k++) {
            ctx.fillRect(r.x - k, r.y - k, r.w + k * 2, 1); ctx.fillRect(r.x - k, r.y + r.h + k - 1, r.w + k * 2, 1);
            ctx.fillRect(r.x - k, r.y - k, 1, r.h + k * 2); ctx.fillRect(r.x + r.w + k - 1, r.y - k, 1, r.h + k * 2);
          }
          ctx.globalAlpha = 1;
        }
        if (HAS_KEYS) Font.draw(ctx, SLOT_KEYS[i], r.x + 4, r.y + 4, picked || dragging ? '#ffffff' : '#6d5a9c', 1, 'left', null);
        const shape = PIECES[s.piece.p].v[s.piece.v];
        const sw = shape[0].length * CELL, sh = shape.length * CELL;
        // a held block sits off its slot, with its own shadow left behind on the floor
        const lift = picked ? 2 + Math.round(Math.sin(this.time * 7)) : 0;
        const x0 = Math.round(r.x + r.w / 2 - sw / 2), y0 = Math.round(r.y + r.h / 2 - sh / 2) - lift;
        if (lift) {
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#000000';
          shape.forEach((line, dy) => line.forEach((ty, dx) => { if (ty) ctx.fillRect(x0 + dx * CELL + 1, y0 + dy * CELL + lift + 2, CELL, CELL); }));
          ctx.globalAlpha = 1;
        }
        if (dragging) ctx.globalAlpha = 0.25;
        shape.forEach((line, dy) => line.forEach((ty, dx) => { if (ty) ctx.drawImage(Art.tile(ty, this.gi), x0 + dx * CELL, y0 + dy * CELL); }));
        ctx.globalAlpha = 1;
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
      // glyph over caption, both centred in whatever rectangle the layout handed us: the
      // portrait buttons are half the tray wide and nothing may drift off them
      const artY = (r) => r.y + Math.round((r.h - 29) / 2);
      const capY = (r) => artY(r) + 20;
      const J = this.level.draw ? R.jumpWide : R.jump, canJ = p.canJump;
      box(J, canJ ? pal.main : '#3d2f7a', this.pressJ > 0 ? '#3a1a66' : '#1f0c3e');
      const ax = Math.round(J.x + J.w / 2), ay = artY(J);
      ctx.fillStyle = canJ ? pal.hi : '#5a4a78';
      for (let k = 0; k < 5; k++) ctx.fillRect(ax - k, ay + k, k * 2 + 1, 1);
      ctx.fillRect(ax - 1, ay + 5, 3, 6);
      Font.draw(ctx, 'СТРИБОК', ax, capY(J), canJ ? '#ffffff' : '#8a7aa8', 1, 'center');

      if (this.level.draw) return;
      const N = R.nitro, full = p.nitro >= 3, on = p.boost > 0;
      const glow = full && Math.floor(t * 4) % 2 === 0;
      box(N, on || full ? (glow ? '#ffffff' : '#29d9ff') : '#3d2f7a', this.pressN > 0 ? '#12305a' : '#1f0c3e');
      const nx = Math.round(N.x + N.w / 2 - 21), ny = artY(N) - 2;
      for (let k = 0; k < 3; k++) {
        const filled = on ? k < Math.ceil(p.boost) : k < p.nitro;
        ctx.globalAlpha = filled ? 1 : 0.3;
        ctx.drawImage(Art.nitro, nx + k * 17, ny);
        ctx.globalAlpha = 1;
      }
      if (on) { ctx.fillStyle = '#29d9ff'; ctx.fillRect(N.x + 4, N.y + N.h - 5, Math.round((N.w - 8) * (p.boost / 3)), 2); }
      Font.draw(ctx, on ? 'X3!' : 'НІТРО', Math.round(N.x + N.w / 2), capY(N), full || on ? '#9fdcff' : '#8a7aa8', 1, 'center');
    },

    drawHUD() {
      const t = this.time, p = this.player;
      ctx.save(); ctx.translate(ox, oy);
      // Landscape keeps the old strip along the top of the field. Portrait has no room beside
      // the field, so the same readings get a 46px band of their own above it: the progress
      // bar across the full width, the money board left, the standings right.
      const moneyY = P ? 14 : 4;
      const X0 = P ? 10 : 150, X1 = P ? DW - 18 : 330, ty = 6;
      const rightX = P ? DW - 4 : 420, posY = P ? 14 : 4, lvlY = P ? 24 : 14;
      const muteR = P ? { x: DW - 52, y: 34 } : { x: 428, y: 2 };
      const trackR = P ? { x: DW - 104, y: 34 } : { x: 428, y: 16 };
      // money board
      this.cars.slice().sort((a, b) => a.gi - b.gi).forEach((c, row) => {
        const gi = c.gi, pal = Art.TEAM[gi], y = moneyY + row * 10;
        ctx.fillStyle = pal.main; ctx.fillRect(4, y, 6, 7);
        if (c.isPlayer) { ctx.fillStyle = '#ffffff'; ctx.fillRect(3, y + 3, 1, 1); }
        if (c.state === 'busted') Font.draw(ctx, 'ЗАТРИМАНО', 14, y, '#8a7aa8');
        else {
          const txt = '$' + (c.money + c.bonus) + (c.place ? ' #' + c.place : '');
          Font.draw(ctx, txt, 14, y, c.isPlayer ? '#ffffff' : pal.hi);
          // a bonus run keeps the whole haul, so there is no percentage to warn about
          if (c.deaths && !this.level.bonusRun) Font.draw(ctx, '-' + Math.round((1 - Balance.deathMul(c.deaths)) * 100) + '%', 18 + Font.measure(txt, 1), y, c.isPlayer && this.penaltyFlash > 0 && Math.floor(t * 8) % 2 ? '#ffffff' : '#ff5c7a');
        }
      });
      // progress track - an endless run has no finish to measure against, so it counts metres
      if (this.level.endless) {
        const m = Math.round(((this.world.slid || 0) + p.x) / 16);
        Font.draw(ctx, m + ' М', Math.round((X0 + X1) / 2), ty - 2, '#ffc31f', 1, 'center');
      } else {
      const fin = this.world.finishX;
      ctx.fillStyle = '#12082a'; ctx.fillRect(X0 - 2, ty, X1 - X0 + 4, 4);
      ctx.fillStyle = '#5a4a78'; ctx.fillRect(X0, ty + 1, X1 - X0, 2);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#12082a' : '#ffffff'; ctx.fillRect(X1 + 1, ty - 2 + k * 3, 3, 3); }
      const px = (x) => Math.round(X0 + Math.max(0, Math.min(1, x / fin)) * (X1 - X0));
      this.police.forEach((q) => { ctx.fillStyle = Math.floor(t * 7) % 2 ? '#ff2a3a' : '#2f6bff'; ctx.fillRect(px(q.x) - 1, ty - 1, 3, 6); });
      for (const h of this.helis) { ctx.fillStyle = '#9cc4ff'; ctx.fillRect(px(h.x) - 2, ty - 4, 5, 2); }
      this.cars.forEach((c) => {
        if (c.state === 'busted') return;
        ctx.fillStyle = c.isPlayer ? '#ffffff' : Art.TEAM[c.gi].main;
        ctx.fillRect(px(c.x) - 2, c.isPlayer ? ty - 3 : ty - 1, c.isPlayer ? 5 : 3, c.isPlayer ? 10 : 6);
        if (c.isPlayer) { ctx.fillStyle = Art.TEAM[c.gi].main; ctx.fillRect(px(c.x) - 1, ty - 2, 3, 8); }
      });
      }
      // position
      const key = (c) => (c.state === 'busted' ? -1e9 : c.place ? 1e6 - c.place : c.x);
      const pos = 1 + this.cars.filter((c) => c !== p && key(c) > key(p)).length;
      if (this.level.bonusRun) Font.draw(ctx, 'КОПИ ' + this.police.length, rightX, posY, '#ff5c7a', 1, 'right');
      else Font.draw(ctx, 'ПОЗ ' + pos + '/' + this.cars.length, rightX, posY, '#ffffff', 1, 'right');
      Font.draw(ctx, this.free ? Levels.FREE[this.free].name + ' ' + this.level.freeLevel : this.boss ? 'СПИСОК #' + this.boss.rank : this.level.bonusRun ? 'БОНУС' : 'РІВЕНЬ ' + this.level.n, rightX, lvlY, '#b9a8e0', 1, 'right');
      if (p.boost > 0)
        for (let k = 0; k < 14; k++) {
          ctx.fillStyle = k % 3 ? '#ffffff55' : '#29d9ff88';
          const ly = R.fieldTop + 14 + ((k * 53 + Math.floor(t * 60) * 7) % (FIELD_H - 28));
          const lx = ((k * 97 + Math.floor(t * 900)) % (DW + 40)) - 20;
          ctx.fillRect(DW - lx, ly, 18 + (k % 3) * 8, 1);
        }
      this.button(muteR.x, muteR.y, 48, 12, Audio8.isMuted() ? 'ТИХО' : 'ЗВУК', '#9d8cff', () => Audio8.toggleMute());
      if (window.Music && Music.started()) this.button(trackR.x, trackR.y, 48, 12, 'ТРЕК >', '#29e0d0', () => Music.next());

      if (this.state === 'countdown') {
        const n = Math.ceil(this.count), L = this.level;
        if (P) {
          // one column down the middle: rival, then the count, then the level and its tips
          let y = R.fieldTop + 4;
          if (this.boss) {
            const r = this.boss, pw = Portraits.W * 2, ph = Portraits.H * 2, bx = Math.round(CX - pw / 2);
            ctx.fillStyle = '#05030c'; ctx.fillRect(bx - 2, y - 2, pw + 4, ph + 4);
            ctx.fillStyle = r.portrait.rim; ctx.fillRect(bx - 1, y - 1, pw + 2, ph + 2);
            ctx.drawImage(Portraits.build(r.portrait), bx, y, pw, ph);
            Font.draw(ctx, r.nick, CX, y + ph + 4, '#ffffff', 1, 'center', '#12082a');
            y += ph + 16;
          } else y += 8;
          Font.draw(ctx, String(n), CX, y, '#ffc31f', 5, 'center', '#8c1a5c');
          Font.draw(ctx, this.boss ? L.name : 'РІВЕНЬ ' + L.n, CX, y + 44, '#ffffff', 2, 'center', '#12082a');
          if (!this.boss) Font.draw(ctx, L.name, CX, y + 64, '#ffc31f', 1, 'center', '#12082a');
          L.tips.forEach((str, i) => Font.draw(ctx, str, CX, y + 82 + i * 12, i === 0 ? '#ffc31f' : '#d8ccff', 1, 'center'));
        } else {
          if (this.boss) {
            const r = this.boss, pw = Portraits.W * 2, ph = Portraits.H * 2, bx = 24, by = 34;
            ctx.fillStyle = '#05030c'; ctx.fillRect(bx - 2, by - 2, pw + 4, ph + 4);
            ctx.fillStyle = r.portrait.rim; ctx.fillRect(bx - 1, by - 1, pw + 2, ph + 2);
            ctx.drawImage(Portraits.build(r.portrait), bx, by, pw, ph);
            Font.draw(ctx, r.nick, bx + pw / 2, by + ph + 6, '#ffffff', 1, 'center', '#12082a');
          }
          // a duel keeps its text to the right of the rival's portrait
          const tx = this.boss ? 300 : 240;
          Font.draw(ctx, String(n), tx, 44, '#ffc31f', 6, 'center', '#8c1a5c');
          Font.draw(ctx, this.boss ? L.name : 'РІВЕНЬ ' + L.n + ' - ' + L.name, tx, 98, '#ffffff', 2, 'center', '#12082a');
          L.tips.forEach((str, i) => Font.draw(ctx, str, tx, 122 + i * 12, i === 0 ? '#ffc31f' : '#d8ccff', 1, 'center'));
        }
      }
      const msgY = P ? Math.max(R.hudH + 4, R.fieldTop - 16) : 30;
      if (p.state === 'hover') Font.draw(ctx, (this.level.draw ? 'МАЛЮЙ ПІД СОБОЮ! ' : 'БУДУЙ ПІД СОБОЮ! ') + Math.ceil(p.timer), CX, msgY, '#29e0d0', 1, 'center');
      if (this.state === 'race' && p.active) {
        const near = this.police.some((q) => p.x - q.x < 150);
        if (near && Math.floor(t * 4) % 2) Font.draw(ctx, '< ПОЛІЦІЯ!', 8, R.fieldTop + 40, '#ff2a3a', 1, 'left');
      }
      if (p.state === 'finished' && this.endTimer !== Infinity && this.state === 'race' && this.cars.length > 1) {
        Font.draw(ctx, 'ЧЕКАЄМО СУПЕРНИКІВ ' + Math.ceil(this.endTimer), CX, msgY, '#fff1c9', 1, 'center');
        this.button(CX - 30, msgY + 12, 60, 14, 'ДАЛІ >', '#ffc31f', () => this.showResults());
      }
      if (this.tut && this.state === 'race') this.drawTutorial();
      if (this.banner) Font.draw(ctx, this.banner.text, CX, R.fieldTop + 70, this.banner.color, 3, 'center', '#12082a');
      ctx.restore();
    },

    drawTutorial() {
      const T = this.tut, g = this.world.gap, t = this.time, p = this.player, w = this.world;
      const plate = (text, y, color) => {
        const tw = Font.measure(text, 1), x = Math.round(CX - tw / 2 - 6);
        ctx.fillStyle = '#12082ae0'; ctx.fillRect(x, y - 3, Math.round(tw + 12), 13);
        ctx.fillStyle = color; ctx.fillRect(x, y + 9, Math.round(tw + 12), 1);
        Font.draw(ctx, text, CX, y, color, 1, 'center');
      };
      const py0 = R.fieldTop + 44;
      if (T.bridged) {
        if (p.state !== 'finished') plate('ЗБИРАЙ ГРОШІ І ЇДЬ ДО ФІНІШУ', py0, '#b6ff6a');
        return;
      }
      // pulsing frame over the chasm
      const W = g.len * CELL, tx = Math.round(g.col * CELL - this.camX), ty = g.row * CELL + R.fieldTop;
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
      plate('ПЕРЕТЯГНИ БЛОК З ПАНЕЛІ У ПРІРВУ', py0, '#ffc31f');
      let wrong = false;
      for (let c = g.col; c < g.col + g.len; c++) for (let r = 1; r < ROWS; r++) if (r !== g.row && w.type[r * w.cols + c]) wrong = true;
      if (wrong) plate('СТАВ БЛОК НА РІВНІ ДАХУ', py0 + 14, '#ff7cc6');
      else if (p.hold) plate('МАШИНА ЧЕКАЄ, ПОКИ ТИ ЗБУДУЄШ МІСТ', py0 + 14, '#d8ccff');
    },

    drawDuelResults() {
      const r = this.boss, win = this.win, t = this.time;
      const main = Art.TEAM[this.gi].main;
      const quote = win ? r.lose : r.taunt;
      const toCareer = () => UI.transition('shutter', () => this.toGarage({ earned: this.earned, screen: 'career' }), 'ЧОРНИЙ СПИСОК');
      const retry = () => UI.transition('shutter', () => this.startCareer(r), r.nick + ' VS ТИ');
      const garage = () => UI.transition('shutter', () => this.toGarage({ earned: this.earned }), 'ГАРАЖ');
      const pw = Portraits.W * 2, ph = Portraits.H * 2;
      const earned = 'ЗАРОБЛЕНО: ' + UI.money(this.earned) + (this.player.deaths ? '  (СМЕРТІ: ' + this.player.deaths + ', -' + Math.round((1 - Balance.deathMul(this.player.deaths)) * 100) + '%)' : '');
      const mug = (px, py, dim) => {
        ctx.fillStyle = '#05030c'; ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
        ctx.fillStyle = r.portrait.rim; ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2);
        ctx.drawImage(Portraits.build(r.portrait), px, py, pw, ph);
        if (dim) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#05030c'; ctx.fillRect(px, py, pw, ph); ctx.globalAlpha = 1; }
      };
      if (P) {
        // one column: verdict, mugshot, what the rival says, the prize, then the buttons
        Font.draw(ctx, win ? 'ТАЧКА ТВОЯ!' : 'ПОРАЗКА', CX, 14, win ? '#ffc31f' : '#ff3ea5', 2, 'center', '#12082a');
        Font.draw(ctx, '#' + r.rank + ' ' + r.nick, CX, 34, '#d8ccff', 1, 'center');
        mug(Math.round(CX - pw / 2), 48, win);
        const qw = Math.min(DW - 12, Font.measure(quote, 1) + 16), qx = Math.round(CX - qw / 2), qy = 52 + ph;
        ctx.fillStyle = '#f2eefa'; ctx.fillRect(qx, qy, qw, 17); ctx.fillRect(CX - 2, qy - 4, 4, 4);
        Music.clipText(ctx, quote, qx + 8, qy + 5, qw - 16, '#12082a', 1, false, t);
        const y = qy + 26;
        if (win) {
          const map = Custom.build(r.car);
          Voxel3D.render(ctx, map, { cx: CX, cy: y + 34, zoom: 2.6, yaw: t * 0.9, pitch: 0.3, glow: map.glow });
          Font.draw(ctx, r.car.name, CX, y + 62, '#ffffff', 2, 'center', '#12082a');
          Font.draw(ctx, this.slip ? 'ТЕПЕР У ТВОЄМУ ГАРАЖІ' : 'ПЕРЕМОГА ЗАРАХОВАНА', CX, y + 82, '#9bf08a', 1, 'center');
        } else {
          const p = this.player, boss = this.cars[0];
          Font.draw(ctx, p.place ? 'ТИ ФІНІШУВАВ ДРУГИМ' : 'ТИ НЕ ДОЇХАВ ДО ФІНІШУ', CX, y + 6, '#ff7cc6', 1, 'center');
          Font.draw(ctx, 'РЕЙТИНГ ' + Profile.rating(boss.g) + ' ПРОТИ ТВОГО ' + Profile.rating(p.g), CX, y + 22, '#d8ccff', 1, 'center');
          Font.draw(ctx, 'ПОТРІБНО ' + Math.round((r.need - 90) * 5), CX, y + 38, '#ffc31f', 1, 'center');
          Font.draw(ctx, 'ПРОКАЧАЙ ТАЧКУ В ТЮНІНГУ', CX, y + 54, '#b9a8e0', 1, 'center');
        }
        Music.clipText(ctx, earned, 8, DH - 88, DW - 16, this.earned > 0 ? '#9bf08a' : '#ff5c7a', 1, false, t);
        this.button(Math.round(CX - 80), DH - 70, 160, 26, win ? 'КАР\'ЄРА' : 'ЩЕ РАЗ', main, win ? toCareer : retry, 2);
        this.button(Math.round(CX - 80), DH - 38, 160, 26, 'В ГАРАЖ', '#9d8cff', garage, 2);
        return;
      }
      Font.draw(ctx, win ? 'ТАЧКА ТВОЯ!' : 'ПОРАЗКА', 240, 14, win ? '#ffc31f' : '#ff3ea5', 3, 'center', '#12082a');
      Font.draw(ctx, 'ЧОРНИЙ СПИСОК #' + r.rank + ' - ' + r.nick, 240, 40, '#d8ccff', 1, 'center');
      mug(44, 56, win);
      // speech bubble
      const qw = Math.min(300, Font.measure(quote, 1) + 16);
      ctx.fillStyle = '#f2eefa'; ctx.fillRect(136, 62, qw, 17); ctx.fillRect(132, 68, 4, 4);
      Font.draw(ctx, quote, 144, 67, '#12082a', 1, 'left', null);
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
      Font.draw(ctx, earned, 240, 180, this.earned > 0 ? '#9bf08a' : '#ff5c7a', 1, 'center');
      if (win) this.button(120, 194, 110, 22, 'КАР\'ЄРА', main, toCareer);
      else this.button(120, 194, 110, 22, 'ЩЕ РАЗ', main, retry);
      this.button(250, 194, 110, 22, 'В ГАРАЖ', '#9d8cff', garage);
    },

    drawResults() {
      ctx.fillStyle = '#12082ad0'; ctx.fillRect(0, 0, vw, vh);
      ctx.save(); ctx.translate(ox, oy);
      const L = this.level, busted = this.player.state === 'busted';
      if (this.boss) { this.drawDuelResults(); ctx.restore(); return; }
      const free = this.free, FR = free ? Levels.FREE[free] : null;
      // Coming last is not losing here - only the cell is. A level ends in defeat when the
      // cops took you, and in every other case it is passed, whatever place you came in.
      const title = busted && !L.bonusRun ? 'ТЕБЕ ЗАТРИМАЛИ'
        : L.bonusRun ? 'ЗАЇЗД ЗАКІНЧЕНО'
        : free ? FR.name + ' ' + L.freeLevel + ' - ГОТОВО!'
        : 'РІВЕНЬ ' + L.n + ' ПРОЙДЕНО!';
      const main = Art.TEAM[this.gi].main;
      const label = free ? FR.name + ' ' + L.freeLevel : L.bonusRun ? 'БОНУСНИЙ ЗАЇЗД' : 'РІВЕНЬ ' + L.n;
      const again = () => UI.transition('shutter', () => this.replay(), label);
      const garage = () => UI.transition('shutter', () => this.toGarage({ earned: this.earned, screen: free ? 'freeride' : 'hub' }), free ? 'ВІЛЬНИЙ ЗАЇЗД' : 'ГАРАЖ');
      const next = free
        ? () => UI.transition('shutter', () => this.startFree(free), FR.name + ' ' + (L.freeLevel + 1))
        : () => UI.transition('shutter', () => this.startRace(L.n + 1), 'РІВЕНЬ ' + (L.n + 1));
      const earned = 'ЗАРОБЛЕНО: ' + UI.money(this.earned) + (this.win && L.winBonus ? ' (+' + L.winBonus + ' ЗА ПЕРЕМОГУ)' : '');
      let sub = '';
      if (L.bonusRun) sub = busted ? 'ПОЛІЦІЯ ВЗЯЛА ТЕБЕ НА ' + this.distance + ' М' : 'ТРАСА ПРОЙДЕНА: ' + this.distance + ' М';
      else if (busted) sub = 'НЕ БУЛО ЧИМ ВІДКУПИТИСЬ';
      else if (free) sub = 'ДАЛІ: ' + FR.name + ' ' + (L.freeLevel + 1);
      else { const nx = Levels.config(L.n + 1); sub = (this.unlocked ? 'ВІДКРИТО ' : 'ДАЛІ ') + 'РІВЕНЬ ' + nx.n + ': ' + nx.name; }
      Font.draw(ctx, title, CX, P ? 16 : 18, this.passed ? '#ffc31f' : '#ff3ea5', P ? 2 : 3, 'center', '#12082a');
      Font.draw(ctx, sub, CX, P ? 38 : 46, this.passed ? '#b6ff6a' : '#ff5c7a', 1, 'center');
      if (L.bonusRun) {
        const cy = P ? 96 : 84;
        Font.draw(ctx, 'ЗІБРАНО', CX, cy, '#8a7aa8', 1, 'center');
        Font.draw(ctx, UI.money(this.earned), CX, cy + 14, '#9bf08a', P ? 3 : 4, 'center', '#12082a');
        Font.draw(ctx, 'РЕКОРД ' + UI.money(Profile.bonusBest), CX, cy + 50, this.record ? '#ffc31f' : '#b9a8e0', 1, 'center');
        if (this.record) Font.draw(ctx, 'НОВИЙ РЕКОРД!', CX, cy + 64, Math.floor(this.time * 4) % 2 ? '#ffc31f' : '#ffffff', 1, 'center');
        if (this.player.deaths) Font.draw(ctx, 'ПАДІНЬ: ' + this.player.deaths, CX, cy + 78, '#ff5c7a', 1, 'center');
        const bw = P ? Math.min(200, DW - 24) : 150, bx = Math.round(CX - bw / 2);
        if (P) {
          this.button(bx, DH - 70, bw, 26, 'ЩЕ РАЗ', main, again, 2);
          this.button(bx, DH - 38, bw, 26, 'В ГАРАЖ', '#9d8cff', garage, 2);
        } else {
          this.button(CX - 160, 200, bw, 22, 'ЩЕ РАЗ', main, again);
          this.button(CX + 10, 200, bw, 22, 'В ГАРАЖ', '#9d8cff', garage);
        }
        ctx.restore();
        return;
      }
      if (P) {
        // one card per racer: name and total on the first line, the breakdown under it
        const rw = DW - 12, rh = 46;
        this.results.forEach((r, i) => {
          const y = 54 + i * (rh + 6), c = r.c, pal = Art.TEAM[c.gi], x = 6;
          ctx.fillStyle = c.isPlayer ? '#2a1450' : '#1a0c34'; ctx.fillRect(x, y, rw, rh);
          ctx.fillStyle = pal.main; ctx.fillRect(x, y, 2, rh);
          Font.draw(ctx, i + 1 + '.', x + 8, y + 8, '#ffffff', 1);
          drawMapPreview(c.map, x + 40, y + 16, 1, this.time + i);
          Music.clipText(ctx, c.g.name + (c.isPlayer ? ' (ТИ)' : ''), x + 60, y + 6, rw - 130, pal.hi, 1, false, this.time);
          if (c.state === 'busted') { Font.draw(ctx, 'ЗАТРИМАНО', x + rw - 8, y + 6, '#ff2a3a', 1, 'right'); return; }
          Font.draw(ctx, '$' + r.total, x + rw - 8, y + 4, '#ffffff', 2, 'right');
          Font.draw(ctx, 'ГРОШІ $' + c.money, x + 60, y + 20, '#9bf08a', 1, 'left');
          Font.draw(ctx, c.place ? 'ФІНІШ +' + c.bonus : 'ФІНІШ -', x + 60, y + 32, '#ffc31f', 1, 'left');
          Font.draw(ctx, c.deaths ? 'СМЕРТІ ' + c.deaths + ' -' + Math.round((1 - Balance.deathMul(c.deaths)) * 100) + '%' : 'БЕЗ СМЕРТЕЙ', x + rw - 8, y + 32, c.deaths ? '#ff5c7a' : '#6a5a88', 1, 'right');
        });
        Music.clipText(ctx, earned, 8, 54 + this.results.length * 52 + 10, DW - 16, this.earned > 0 ? '#9bf08a' : '#ff5c7a', 1, false, this.time);
        const bw = Math.min(200, DW - 24), bx = Math.round(CX - bw / 2);
        if (this.passed) {
          this.button(bx, DH - 102, bw, 26, free ? 'ДАЛІ: ' + (L.freeLevel + 1) : 'ДАЛІ: РІВЕНЬ ' + (L.n + 1), main, next, 2);
          this.button(bx, DH - 70, bw, 26, 'ПЕРЕГРАТИ', '#29e0d0', again, 2);
        } else this.button(bx, DH - 70, bw, 26, 'ЩЕ РАЗ', main, again, 2);
        this.button(bx, DH - 38, bw, 26, free ? 'ДО ЗАЇЗДІВ' : 'В ГАРАЖ', '#9d8cff', garage, 2);
        ctx.restore();
        return;
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
      Font.draw(ctx, earned, 240, 178, this.earned > 0 ? '#9bf08a' : '#ff5c7a', 1, 'center');
      if (this.passed) {
        this.button(36, 192, 150, 22, free ? 'ДАЛІ: ' + FR.name + ' ' + (L.freeLevel + 1) : 'ДАЛІ: РІВЕНЬ ' + (L.n + 1), main, next);
        this.button(194, 192, 114, 22, 'ПЕРЕГРАТИ', '#29e0d0', again);
        this.button(316, 192, 128, 22, free ? 'ДО ЗАЇЗДІВ' : 'В ГАРАЖ', '#9d8cff', garage);
      } else {
        this.button(130, 192, 100, 22, 'ЩЕ РАЗ', main, again);
        this.button(250, 192, 100, 22, free ? 'ДО ЗАЇЗДІВ' : 'В ГАРАЖ', '#9d8cff', garage);
      }
      ctx.restore();
    },
  };

  // in bot.html the race is driven by the bot only; real touches still work in menus
  const botOwnsInput = () => window.BOT_MODE && (Game.state === 'race' || Game.state === 'countdown');
  screen.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // keep the whole drag on this element: no gesture hand-off, no lost pointerup
    if (screen.setPointerCapture) { try { screen.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    if (!botOwnsInput()) Game.pointerDown(e);
  });
  screen.addEventListener('pointermove', (e) => { e.preventDefault(); if (!botOwnsInput()) Game.pointerMove(e); });
  screen.addEventListener('pointerup', (e) => { e.preventDefault(); if (!botOwnsInput()) Game.pointerUp(e); });
  screen.addEventListener('pointerleave', () => { Game.mouse = null; });
  screen.addEventListener('pointercancel', () => { Game.drag = null; Game.ink = null; if (Game.grab) Game.releaseGrab(); });
  window.addEventListener('keydown', (e) => {
    if (Game.state === 'garage') { Garage.key(e.code); if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); return; }
    if ((Game.state !== 'race' && Game.state !== 'countdown') || !Game.player || window.BOT_MODE) return;
    if (e.repeat) return;   // a held key is one press, not a stutter of them
    if (e.code === 'Space' || e.code === 'ArrowUp') { Game.player.jump(); Game.pressJ = 0.15; e.preventDefault(); }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyN' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (Game.player.useNitro()) Game.shake(2); else Audio8.sfx.invalid();
      Game.pressN = 0.15;
      e.preventDefault();
    }
    if (SLOT_KEY_CODE[e.code] != null) { Game.armSlot(SLOT_KEY_CODE[e.code]); e.preventDefault(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Audio8.setEngine(0, false); Audio8.setSiren(0); } });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    Game.update(dt);
    Game.draw();
    requestAnimationFrame(loop);
  }
  window.Game = Game;
  requestAnimationFrame(loop);
})();
