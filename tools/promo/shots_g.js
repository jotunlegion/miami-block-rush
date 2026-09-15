// 14.20-33.30: cops close behind, helicopter overhead, title slam, download end card and idle to the end
(function () {
  const { road, hero, shot, follow, key, rate, ease, CELL, clamp, lerp, fancy, CHROME, NEON, CYAN } = P;
  const D = Director;

  // ---------------- G1: we drop off a roof, two cruisers glued to our bumper, shooting ----------------
  D.whip(14.2, 1, 1.2);
  D.hit(14.2, 1.2, { col: [1, 0.35, 0.4] });
  shot({
    name: 'G1', t0: 14.2, pre: 0.45,
    init(at) {
      const S = P.stage(200);
      road(S, 0, 50, 8);
      road(S, 50, 200, 11);
      const c = hero(S, 804 - 200 * 0.53, 121, { top: 205 });
      c.vx = 205; c.land = 1.3; c.smoke = 0.6;
      S.c = c;
      S.cops = [1, 2].map((k) => { const q = Stage.car(S, 'police', c.x - 34 * k - (k - 1) * 4, 121, null, 3, { top: 205, accel: 500 }); q.vx = 205; q.land = 1; return q; });
      S.fire = 0;
      S.onStep = (S, dt) => {
        if (S.t < 0.45 + 0.05) return;
        if ((S.fire -= dt) > 0) return;
        S.fire = 0.07;
        const q = S.cops[(Math.random() * 2) | 0];
        const [mx, my] = q.toWorld(q.bw / 2 - 6, -q.bh / 2 + 2);
        const [tx, ty] = c.toWorld(Stage.rnd(-14, 12), Stage.rnd(-5, 3));
        Stage.muzzle(S, mx, my, tx, ty);
      };
      return S;
    },
    speed: rate([[0, 0.8]]),
    cam(S, lt) {
      const c = S.c, q = S.cops[0];
      return follow(S, (c.x + q.x) / 2 - 8, (c.y + q.y) / 2, { z: key([[0, 1.45], [0.64, 2.75]], lt), rot: key([[0, -0.02], [0.64, -0.11]], lt), fy: (c.y + q.y) / 2 - 4 });
    },
    post: (S, lt) => ({ tint: Math.floor(lt * 14) % 2 ? [1.2, 0.35, 0.45] : [0.45, 0.55, 1.25], tintAmt: 0.16 }),
  });

  // ---------------- G2: off a kicker, the police helicopter rides right above us ----------------
  D.hit(14.84, 1.1, { col: [0.55, 0.65, 1] });
  shot({
    name: 'G2', t0: 14.84, pre: 0.62,
    init() {
      const S = P.stage(200);
      road(S, 0, 39, 9);
      Stage.place(S, 'LAUNCH', 0, 36, 7, 0, { sparks: 0 });
      road(S, 52, 200, 10);
      S.w.flash.fill(0);
      Particles.clear();
      const c = hero(S, 36 * CELL - 230 * 0.5, 137, { top: 230 });
      c.vx = 230; c.land = 1; c.smoke = 0.6;
      S.c = c;
      S.heli = new Helicopter({ player: { x: c.x } });
      S.heli.x = c.x - 30; S.heli.y = 40;
      S.fire = 0;
      S.heliUpdate = (S, dt) => {
        const h = S.heli;
        h.x += (c.x + 18 - h.x) * Math.min(1, dt * 5);
        h.y += (clamp(c.y - 58, 16, 200) - h.y) * Math.min(1, dt * 4);
        if (S.t > 0.7 && (S.fire -= dt) <= 0) { S.fire = 0.09; Stage.muzzle(S, h.x + 16, h.y + 7, c.x + Stage.rnd(-12, 12), c.y + Stage.rnd(-4, 3)); }
        if (Math.random() < dt * 20) Stage.puff(S, h.x + Stage.rnd(-20, 20), h.y + 14, { c: '#6a5a8a', r: 2, grow: 10, life: 0.5, vy: 30 });
      };
      return S;
    },
    speed: rate([[0, 0.7]]),
    cam(S, lt) {
      const c = S.c, h = S.heli;
      return follow(S, (c.x + h.x) / 2, (c.y + h.y) / 2, { z: key([[0, 2.1], [0.46, 1.75]], lt), rot: key([[0, 0.1], [0.46, 0.03]], lt), fy: (c.y + h.y) / 2 });
    },
    post: (S, lt) => ({ tint: Math.floor(lt * 12) % 2 ? [1.15, 0.4, 0.5] : [0.5, 0.6, 1.2], tintAmt: 0.1 }),
  });

  // ---------------- title + end card: one continuous world with cars racing below ----------------
  D.hit(15.3, 1.3, { col: [1, 0.45, 0.85] });
  D.hit(15.42, 0.9);
  D.hit(15.64, 1.2);
  D.impact(15.64, 1);
  D.hit(16.196, 1.6, { flash: 1 });
  D.impact(16.196, 2);
  // idle beat pulses to the end
  const BEAT = 0.4263;
  for (let k = 1; 16.196 + k * BEAT < 32.3; k++) {
    const t = 16.196 + k * BEAT, bar = k % 4 === 0;
    D.ev({ t, type: 'punch', dur: 0.2, amt: bar ? 0.045 : 0.018 });
    if (bar) { D.ev({ t, type: 'rgb', dur: 0.15, amt: 7 }); D.ev({ t, type: 'flash', dur: 0.1, amt: 0.1, col: [1, 0.45, 0.85] }); }
  }
  const beatK = (t) => { if (t < 16.196) return 0; const p = ((t - 16.196) % BEAT) / BEAT; return Math.pow(1 - p, 3); };

  const PAN = 150;
  function titleInit() {
    const S = P.stage(1100);
    road(S, 0, 1100, 12);
    for (let c = 70; c < 1100; c += 38) { Stage.place(S, 'GLIDE', 0, c, 11, (c / 38) % 3 | 0, { sparks: 0 }); }
    S.w.flash.fill(0);
    Particles.clear();
    const y = 12 * CELL - 7;
    const mk = (id, cu, gi, slot, ph, over) => { const c = Stage.car(S, id, slot + 20, y, cu, gi, Object.assign({ top: PAN, accel: 520 }, over)); c.vx = PAN; c.slot = slot; c.ph = ph; c.smoke = 0.3; c.land = 0.6; return c; };
    S.player = mk('st_vice', P.HERO, 0, 300, 0);
    mk('st_kings', { glow: 'gold' }, 1, 230, 1.7);
    mk('st_havana', { glow: 'cyan' }, 2, 370, 3.1);
    mk('furia89', { glow: 'red', vinyl: 'twin' }, 1, 160, 4.4);
    mk('police', null, 3, 80, 0.9);
    mk('police', null, 3, 30, 2.2);
    S.onStep = (S, dt) => {
      const anchor = PAN * S.t;
      for (const c of S.cars) {
        const target = anchor + c.slot + 50 * Math.sin(S.t * 0.55 + c.ph);
        c.g.top = clamp(PAN + (target - c.x) * 1.6, 70, 320);
      }
    };
    return S;
  }
  const camTitle = (S) => ({ x: PAN * S.t - 20, fx: 240, fy: 135 });

  // logo layout: title state (t<16.196) and card state, tweened
  function drawLogo(ctx, S, t) {
    const k = ease.out(clamp((t - 16.196) / 0.35, 0, 1));
    const slam = (t0, from, to) => { const u = clamp((t - t0) / 0.14, 0, 1); return u <= 0 ? 0 : lerp(from, to, ease.back(u)); };
    const flick = t > 16.196 && Math.floor(t * 23) % 37 === 0;
    const bob = t > 16.6 ? Math.sin(t * 2.2) * 1.5 : 0;
    // MIAMI
    const sM = slam(15.3, 16, 6);
    if (sM > 0) fancy(ctx, 'MIAMI', 240, lerp(38, 12, k) - (sM - 6) * 3.5 + bob, lerp(sM, 5, k), flick ? CYAN : NEON, { shadow: '#29e0d0', sd: 1 });
    // BLOCK RUSH
    const sB = slam(15.42, 10, 4), sR = slam(15.64, 10, 4);
    const s2 = lerp(4, 3, k), y2 = lerp(94, 52, k) + bob;
    const wAll = Font.measure('BLOCK RUSH', s2), x0 = 240 - wAll / 2;
    if (sB > 0) fancy(ctx, 'BLOCK', x0 + Font.measure('BLOCK', s2) / 2, y2 - (sB - 4) * 3, lerp(sB, 3, k), CHROME, { shadow: '#8c1a5c' });
    if (sR > 0) fancy(ctx, 'RUSH', x0 + 6 * 6 * s2 + Font.measure('RUSH', s2) / 2, y2 - (sR - 4) * 3, lerp(sR, 3, k), CHROME, { shadow: '#8c1a5c' });
    // subtitle types in on the title, fades out for the card
    if (t > 15.72 && k < 1) {
      const str = 'ГАНГСТЕРСЬКІ ПЕРЕГОНИ 1986', n = Math.floor(clamp((t - 15.72) / 0.22, 0, 1) * str.length);
      ctx.globalAlpha = 1 - k;
      Font.draw(ctx, str.slice(0, n), 240, 132, '#fff1c9', 1, 'center', '#12082a');
      ctx.globalAlpha = 1;
    }
  }

  function drawCard(ctx, S, t) {
    if (t < 16.196) return;
    const b = beatK(t);
    // dark band behind the slogan
    const band = ease.out(clamp((t - 16.35) / 0.25, 0, 1));
    if (band > 0) {
      const h = Math.round(54 * band);
      ctx.fillStyle = '#12082ac8'; ctx.fillRect(-Stage.OX, 103 - h / 2, 640, h);
      ctx.fillStyle = '#ff3ea5'; ctx.fillRect(-Stage.OX, 103 - h / 2, 640, 1);
      ctx.fillStyle = '#29e0d0'; ctx.fillRect(-Stage.OX, 103 + h / 2 - 1, 640, 1);
    }
    // slogan
    const s1 = clamp((t - 16.62) / 0.12, 0, 1);
    if (s1 > 0) {
      const str = 'В ДУПУ ЗАТИШНІ МОБІЛЬНІ ІГРИ!';
      const sc = lerp(5, 2, ease.back(s1));
      Font.draw(ctx, str, 240, 82 - (sc - 2) * 3, '#ffffff', sc, 'center', '#8c1a5c');
    }
    const s2 = clamp((t - 17.05) / 0.12, 0, 1);
    if (s2 > 0) {
      const sc = lerp(8, 3, ease.back(s2)) * (1 + b * 0.05);
      const jit = b > 0.7 ? Math.round((Math.random() - 0.5) * 2) : 0;
      fancy(ctx, 'ТІЛЬКИ ХАРДКОР!', 240 + jit, 101 - (sc - 3) * 3.5, sc, CHROME, { shadow: '#ff3ea5' });
    }
    // download button
    const sb = clamp((t - 16.196) / 0.2, 0, 1);
    if (sb > 0) {
      const tap = handTap(t);
      const pulse = 1 + b * 0.06 - tap.squish * 0.08;
      const bw = Math.round(232 * ease.back(sb) * pulse), bh = Math.round(34 * pulse), bx = Math.round(240 - bw / 2), by = Math.round(157 - bh / 2);
      const sk = 8;
      ctx.fillStyle = '#12082a';
      for (let r = -2; r < bh + 2; r++) { const off = Math.round(((bh - 1 - r) * sk) / bh); ctx.fillRect(bx + off - 2, by + r, bw - sk + 4, 1); }
      for (let r = 0; r < bh; r++) {
        const off = Math.round(((bh - 1 - r) * sk) / bh);
        ctx.fillStyle = r < 2 ? '#ffd6f5' : r < bh * 0.5 ? '#ff5cb8' : r < bh - 3 ? '#ff3ea5' : '#b01c78';
        ctx.fillRect(bx + off, by + r, bw - sk, 1);
      }
      // shine sweep
      const sw = ((t - 16.4) % 1.7) / 0.5;
      if (sw >= 0 && sw <= 1) {
        const sxp = bx + sw * (bw + 40) - 20;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.75;
        for (let r = 0; r < bh; r++) { const off = Math.round(((bh - 1 - r) * sk) / bh); const x = Math.round(sxp + off - r * 0.4); if (x > bx + off && x < bx + off + bw - sk - 6) ctx.fillRect(x, by + r, 6, 1); }
        ctx.globalAlpha = 1;
      }
      if (sb >= 1) {
        const ax = Math.round(bx + 30), ay = Math.round(by + bh / 2 - 8);
        const arrow = (ox, oy, col) => {
          ctx.fillStyle = col;
          ctx.fillRect(ax - 1 + ox, ay + oy, 3, 7);
          for (let k2 = 0; k2 < 5; k2++) ctx.fillRect(ax - (4 - k2) + ox, ay + 7 + k2 + oy, (4 - k2) * 2 + 1, 1);
          ctx.fillRect(ax - 5 + ox, ay + 14 + oy, 11, 2);
        };
        arrow(1, 1, '#8c1a5c');
        arrow(0, 0, '#ffffff');
        Font.draw(ctx, 'ЗАВАНТАЖИТИ', 244 + 10, by + Math.round(bh / 2) - 7, '#ffffff', 2, 'center', '#8c1a5c');
      }
      // tapping finger
      if (tap.on) {
        const HX = 272 + tap.dx, HY = 166 + tap.dy;
        if (tap.ripple > 0) {
          ctx.fillStyle = '#ffffff'; ctx.globalAlpha = tap.ripple;
          const r = 6 + (1 - tap.ripple) * 22;
          for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.fillRect(Math.round(HX + Math.cos(a) * r), Math.round(HY + Math.sin(a) * r * 0.7), 2, 1); }
          ctx.globalAlpha = 1;
        }
        const Sx = { hand: { x: HX, y: HY } };
        ctx.save(); ctx.translate(-Stage.OX, -Stage.OY);
        Stage.drawHand(ctx, { hand: { x: HX, y: HY }, camX: 0, t: 0 }, t);
        ctx.restore();
      }
    }
  }
  // the finger taps the button every 6 beats
  function handTap(t) {
    const t0 = 17.9, period = BEAT * 6;
    if (t < t0 - 0.4) return { on: false, squish: 0, ripple: 0 };
    const u = (t - t0) % period;
    const on = true;
    const down = u < 0.12 ? u / 0.12 : u < 0.3 ? 1 - (u - 0.12) / 0.18 : 0;
    const approach = u > period - 0.5 ? (u - (period - 0.5)) / 0.5 : 0;
    const dy = u < 0.3 ? -2 * (1 - down) + 2 : u < 1 ? (u - 0.3) * 60 : 42 - approach * 42;
    return { on, squish: down, ripple: u < 0.45 ? 1 - u / 0.45 : 0, dx: u < 1 ? (u - 0.3) * 20 : 14 - approach * 14, dy: Math.min(42, dy) };
  }

  const TITLE_PRE = 2.0;
  shot({
    name: 'TITLE', t0: 15.3, pre: TITLE_PRE, init: titleInit,
    speed: rate([[0, 0.9]]),
    cam(S, lt) { return Object.assign(camTitle(S), { z: key([[0, 1.12], [0.6, 1.0], [0.9, 1.04]], lt, ease.out), rot: key([[0, -0.04], [0.6, 0]], lt) }); },
    draw(ctx, S, lt, st) {
      Stage.drawWorld(ctx, S, st);
      ctx.fillStyle = '#12082a';
      ctx.globalAlpha = 0.35; ctx.fillRect(0, 0, Stage.SBW, Stage.SBH); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(Stage.OX, Stage.OY); drawLogo(ctx, S, 15.3 + lt); ctx.restore();
    },
    post: (S, lt) => (lt > 0.6 ? { rgb: 4 + Math.abs(Math.sin(lt * 40)) * 10, grain: 0.06 } : {}),
  });

  shot({
    name: 'END', t0: 16.196, pre: TITLE_PRE + 0.896 * 0.9, init: titleInit,
    cam(S, lt) { return Object.assign(camTitle(S), { z: 1 }); },
    draw(ctx, S, lt, st) {
      const t = 16.196 + lt;
      Stage.drawWorld(ctx, S, st);
      ctx.fillStyle = '#12082a';
      ctx.globalAlpha = lerp(0.35, 0.2, clamp(lt / 0.4, 0, 1)); ctx.fillRect(0, 0, Stage.SBW, Stage.SBH); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(Stage.OX, Stage.OY);
      drawLogo(ctx, S, t);
      drawCard(ctx, S, t);
      ctx.restore();
    },
    post: (S, lt) => {
      const t = 16.196 + lt, b = beatK(t);
      return { bloom: 0.6 + b * 0.25, vig: 0.4, flash: t > 32.9 ? (t - 32.9) / 0.4 * 0 : 0 };
    },
  });
})();
