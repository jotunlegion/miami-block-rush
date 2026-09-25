// Onboarding. Level 1 teaches laying a block over two chasms; two short lessons run the first
// time the brush and the tunnels turn up. Every hint is acted out on the screen by a hand (on a
// phone) or by the keyboard and the mouse pointer (on a desk), aimed at the real slot and the
// real hole, so it reads the same in portrait and in landscape.
(function () {
  const CELL = World.CELL, PIECES = World.PIECES;
  const KEYS = ['A', 'S', 'D'];
  const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
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

  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  // The device is whatever was last used: a touch makes it a phone, a key or a mouse click a
  // desk. Before any input at all, the kind of pointer the browser reports decides.
  const mode = (game) => (game.inputMode ? (game.inputMode === 'touch' ? 'touch' : 'pc') : COARSE ? 'touch' : 'pc');

  // ---------------- props ----------------
  // the fingertip is the top of the index finger, pixel (2,0) of the sprite
  function hand(ctx, x, y, press) { ctx.drawImage(HAND, Math.round(x - 2), Math.round(y + (press ? 1 : 0))); }
  function ring(ctx, x, y, k, color) { if (k > 0 && k < 1) { UI.clickRing(ctx, x, y, k, color, 1); ctx.globalAlpha = 1; } }
  function frame(ctx, r, color, pad) {
    ctx.fillStyle = color;
    ctx.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, 1); ctx.fillRect(r.x - pad, r.y + r.h + pad - 1, r.w + pad * 2, 1);
    ctx.fillRect(r.x - pad, r.y - pad, 1, r.h + pad * 2); ctx.fillRect(r.x + r.w + pad - 1, r.y - pad, 1, r.h + pad * 2);
  }
  function ghost(ctx, piece, x, y, gi, a) {
    const shape = PIECES[piece.p].v[piece.v];
    ctx.globalAlpha = a;
    shape.forEach((line, dy) => line.forEach((t, dx) => { if (t) ctx.drawImage(Art.tile(t, gi), Math.round(x + dx * CELL), Math.round(y + dy * CELL)); }));
    ctx.globalAlpha = 1;
  }
  // a chunky keycap, drawn pressed or up
  function keycap(ctx, x, y, letter, down, acc) {
    const s = 15, d = down ? 2 : 0;
    ctx.fillStyle = '#05030c'; ctx.fillRect(x - 1, y + 1, s + 2, s + 2);
    ctx.fillStyle = down ? acc : '#d8ccff'; ctx.fillRect(x, y + d, s, s);
    ctx.fillStyle = down ? '#3a1a66' : '#1f0c3e'; ctx.fillRect(x + 1, y + d + 1, s - 2, s - 3);
    Font.draw(ctx, letter, x + Math.round(s / 2), y + d + 4, '#ffffff', 1, 'center', null);
  }
  // a hint plate; a line too wide for a narrow phone is split in two at a space
  function plate(ctx, V, text, y, color) {
    const max = V.W - 16;
    let lines = [text];
    if (Font.measure(text, 1) > max) {
      const mid = text.length / 2;
      let cut = -1;
      for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
      if (cut > 0) lines = [text.slice(0, cut), text.slice(cut + 1)];
    }
    const tw = Math.max(...lines.map((l) => Font.measure(l, 1))), x = Math.round(V.cx - tw / 2 - 6), h = lines.length * 10 + 3;
    ctx.fillStyle = '#12082ae0'; ctx.fillRect(x, y - 3, Math.round(tw + 12), h);
    ctx.fillStyle = color; ctx.fillRect(x, y - 3 + h - 1, Math.round(tw + 12), 1);
    lines.forEach((l, i) => Font.draw(ctx, l, V.cx, y + i * 10, color, 1, 'center'));
    return y + h + 4;
  }

  // ---------------- the demos ----------------
  // Drag: a see-through block flies out of the slot into the target with the hand under it.
  function dragDemo(ctx, game, slot, tgt, piece, t) {
    const k = (t % 2.4) / 1.6;
    if (k > 1) return;
    const e = ease(k), r = game.slotRect(slot), shape = PIECES[piece.p].v[piece.v];
    const w = shape[0].length * CELL, h = shape.length * CELL;
    const sx = r.x + r.w / 2 - w / 2, sy = r.y + r.h / 2 - h / 2;
    const x = lerp(sx, tgt.x, e), y = lerp(sy, tgt.y, e) - Math.sin(e * Math.PI) * 36;
    ghost(ctx, piece, x, y, game.gi, 0.6);
    hand(ctx, x + w / 2, y + h / 2 + 2, false);
  }

  // Tap-tap: the hand taps the slot, travels, taps the target, and the block appears there.
  function tapDemo(ctx, game, slot, tgt, piece, t, armed) {
    const acc = Art.TEAM[game.gi].hi, r = game.slotRect(slot), s = center(r), g = center(tgt);
    if (armed) {
      const u = t % 1.8, k = ease(clamp01(u / 0.7));
      const x = lerp(s.x, g.x, k), y = lerp(s.y, g.y, k);
      ring(ctx, g.x, g.y, (u - 0.7) / 0.35, acc);
      hand(ctx, x, y, u > 0.7 && u < 1.0);
      return;
    }
    const u = t % 2.8;
    let x, y, press = false;
    if (u < 0.5) { const k = ease(u / 0.5); x = lerp(s.x + 26, s.x, k); y = lerp(s.y + 20, s.y, k); }
    else if (u < 0.8) { x = s.x; y = s.y; press = true; }
    else if (u < 1.5) { const k = ease((u - 0.8) / 0.7); x = lerp(s.x, g.x, k); y = lerp(s.y, g.y, k); }
    else { x = g.x; y = g.y; press = u < 1.8; }
    if (u >= 0.5 && u < 1.5) frame(ctx, r, '#ffffff', 2);
    ring(ctx, s.x, s.y, (u - 0.5) / 0.35, acc);
    ring(ctx, g.x, g.y, (u - 1.5) / 0.35, acc);
    if (u >= 1.5) ghost(ctx, piece, tgt.x, tgt.y, game.gi, 0.25 + 0.45 * clamp01((u - 1.5) / 0.4));
    hand(ctx, x, y, press);
  }

  // Keyboard: the slot's key goes down, then the mouse pointer glides to the target and clicks.
  function keyDemo(ctx, game, slot, tgt, piece, t, armed) {
    const acc = Art.TEAM[game.gi].main, hi = Art.TEAM[game.gi].hi, r = game.slotRect(slot), s = center(r), g = center(tgt);
    const kx = Math.round(s.x - 7), ky = Math.round(r.y - 21);
    if (armed) {
      keycap(ctx, kx, ky, KEYS[slot], false, acc);
      const u = t % 1.9, k = ease(clamp01(u / 0.8));
      ring(ctx, g.x, g.y, (u - 0.8) / 0.35, hi);
      UI.cursor(ctx, lerp(s.x, g.x, k), lerp(s.y - 14, g.y, k), acc, u > 0.8 && u < 1.1, game.time, 1);
      return;
    }
    const u = t % 3;
    const down = u > 0.25 && u < 0.6;
    keycap(ctx, kx, ky, KEYS[slot], down, acc);
    if (u > 0.25 && u < 1.5) frame(ctx, r, '#ffffff', 2);
    if (u < 0.6) return;
    const k = ease(clamp01((u - 0.6) / 0.8));
    const x = lerp(s.x, g.x, k), y = lerp(s.y - 14, g.y, k);
    ring(ctx, g.x, g.y, (u - 1.4) / 0.35, hi);
    if (u >= 1.4) ghost(ctx, piece, tgt.x, tgt.y, game.gi, 0.25 + 0.45 * clamp01((u - 1.4) / 0.4));
    UI.cursor(ctx, x, y, acc, u > 1.4 && u < 1.7, game.time, 1);
  }

  // Painting: the finger (or the pointer with its button held) pulls a line from a to b.
  function strokeDemo(ctx, game, a, b, t, pc) {
    const pal = Art.TEAM[game.gi], u = t % 2.6, k = ease(clamp01((u - 0.3) / 1.4));
    const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k), len = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.globalAlpha = u > 2.1 ? Math.max(0, 1 - (u - 2.1) / 0.5) : 0.85;
    for (let d = 0; d <= len * k; d += 3) {
      const q = d / len;
      const px = Math.round(lerp(a.x, b.x, q)), py = Math.round(lerp(a.y, b.y, q));
      ctx.fillStyle = '#12082a'; ctx.fillRect(px - 2, py - 2, 4, 4);
      ctx.fillStyle = (d / 3) % 2 ? pal.hi : '#ffffff'; ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    const held = u > 0.2 && u < 1.8;
    if (pc) {
      UI.cursor(ctx, x, y, pal.main, held, game.time, 1);
      if (held) { ctx.fillStyle = pal.hi; ctx.fillRect(Math.round(x) - 3, Math.round(y) + 13, 7, 1); Font.draw(ctx, 'ЛКМ', Math.round(x) + 10, Math.round(y) + 10, '#ffffff', 1, 'left', '#12082a'); }
    } else hand(ctx, x, y, held);
  }

  // ---------------- state ----------------
  function inkBridged(w, g) {
    const top = Math.min(g.rA, g.rB) * CELL - 40, bot = Math.max(g.rA, g.rB) * CELL + 6;
    for (let c = g.c0; c < g.c1; c++) {
      let hit = false;
      for (let y = top; y <= bot && !hit; y += 2) hit = World.inkSolid(w, c * CELL + 8, y);
      if (!hit) return false;
    }
    return true;
  }

  // the car waits at the edge of whatever is not done yet
  function hold(p, on) { if (p.hold && !on) p.stopped = false; p.hold = on; }

  const Lessons = {
    mode,

    update(game, dt) {
      const w = game.world, p = game.player;
      if (game.tut) {
        for (const g of w.gaps) {
          if (g.bridged) continue;
          let ok = true;
          for (let c = g.col; c < g.col + g.len; c++) if (World.cellAt(w, c, g.row) !== 1) ok = false;
          if (ok) { g.bridged = true; game.banner = { text: 'ЧУДОВО!', color: '#b6ff6a', t: 1.4 }; Audio8.sfx.pickup(3); }
        }
        const cur = w.gaps.find((g) => !g.bridged) || null;
        w.gap = cur;
        hold(p, !!cur && p.x > cur.col * CELL - 70 && p.x < cur.col * CELL);
        return;
      }
      const L = game.lesson;
      if (!L) return;
      if (L.kind === 'neon') {
        for (const g of w.lessonGaps) if (!g.done && inkBridged(w, g)) { g.done = true; game.banner = { text: 'ЧУДОВО!', color: '#b6ff6a', t: 1.2 }; Audio8.sfx.pickup(3); }
        const cur = w.lessonGaps.find((g) => !g.done);
        hold(p, !!cur && p.x > cur.c0 * CELL - 60 && p.x < cur.c0 * CELL);
      } else {
        const wall = Tunnel.nextWall(w, p.tunnel, p.x);
        const d = wall ? wall.col * CELL - p.x : Infinity;
        hold(p, d < 36 && d > -6);
      }
      if (p.state === 'finished' && !L.done) {
        L.done = true; L.t = 1.6;
        game.banner = { text: 'НАВЧАННЯ ПРОЙДЕНО!', color: '#b6ff6a', t: 1.8 };
        Audio8.sfx.finish();
      }
      if (L.done && (L.t -= dt) <= 0) game.lessonDone();
    },

    draw(ctx, game) {
      const V = game.view(), w = game.world, p = game.player, t = game.time;
      const pc = mode(game) === 'pc', y0 = V.fieldTop + 44;
      const camX = game.camX, fy = V.fieldTop;
      if (game.lesson) game.button(pc || !V.portrait ? Math.round(V.cx - 36) : 4, V.portrait ? V.fieldTop + 4 : 16, 72, 13, 'ПРОПУСТИТИ', '#9d8cff', () => game.lessonDone());
      if (game.lesson && game.lesson.done) return;

      // ---- level 1: two chasms ----
      if (game.tut) {
        const g = w.gap;
        if (!g) { if (p.state !== 'finished') plate(ctx, V, 'ЗБИРАЙ ГРОШІ І ЇДЬ ДО ФІНІШУ', y0, '#b6ff6a'); return; }
        const step = w.gaps.indexOf(g);
        const tgt = { x: Math.round(g.col * CELL - camX), y: g.row * CELL + fy, w: g.len * CELL, h: CELL };
        ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ffc31f' : '#fff3a0';
        for (let x = 0; x < tgt.w; x += 4) { ctx.fillRect(tgt.x + x, tgt.y, 2, 1); ctx.fillRect(tgt.x + x + 2, tgt.y + CELL - 1, 2, 1); }
        for (let y = 0; y < CELL; y += 4) { ctx.fillRect(tgt.x, tgt.y + y, 1, 2); ctx.fillRect(tgt.x + tgt.w - 1, tgt.y + y + 2, 1, 2); }
        const armed = game.armed != null;
        const slot = armed ? game.armed : step === 0 ? 1 : 0;
        const piece = game.tray[slot] ? game.tray[slot].piece : { p: 0, v: 0 };
        let text;
        if (pc) {
          text = armed ? 'ТЕПЕР КЛАЦНИ ПО ПРІРВІ' : 'НАТИСНИ ' + KEYS[slot] + ', ПОТІМ КЛАЦНИ ПО ПРІРВІ';
          if (!game.drag) keyDemo(ctx, game, slot, tgt, piece, t, armed);
        } else if (step === 0) {
          text = 'ПЕРЕТЯГНИ БЛОК З ПАНЕЛІ У ПРІРВУ';
          if (!game.drag && !armed) dragDemo(ctx, game, slot, tgt, piece, t);
          else if (armed) tapDemo(ctx, game, slot, tgt, piece, t, true);
        } else {
          text = armed ? 'ТЕПЕР ТОРКНИСЬ ПРІРВИ' : 'А ТАК ШВИДШЕ: ТОРКНИСЬ БЛОКУ, ПОТІМ ПРІРВИ';
          if (!game.drag) tapDemo(ctx, game, slot, tgt, piece, t, armed);
        }
        let y = plate(ctx, V, text, y0, '#ffc31f');
        let wrong = false;
        for (let c = g.col; c < g.col + g.len; c++) for (let r = 1; r < World.ROWS; r++) if (r !== g.row && w.type[r * w.cols + c]) wrong = true;
        if (wrong) plate(ctx, V, 'СТАВ БЛОК НА РІВНІ ДАХУ', y, '#ff7cc6');
        else if (p.hold) plate(ctx, V, 'МАШИНА ЧЕКАЄ, ПОКИ ТИ ЗБУДУЄШ МІСТ', y, '#d8ccff');
        return;
      }

      // ---- the brush ----
      if (game.lesson.kind === 'neon') {
        const g = w.lessonGaps.find((q) => !q.done);
        if (!g) { if (p.state !== 'finished') plate(ctx, V, 'БАЛОНИ ДОЛИВАЮТЬ ФАРБУ - ЇДЬ ДО ФІНІШУ', y0, '#b6ff6a'); return; }
        const step = w.lessonGaps.indexOf(g);
        const a = { x: g.c0 * CELL - 12 - camX, y: g.rA * CELL - 3 + fy }, b = { x: g.c1 * CELL + 12 - camX, y: g.rB * CELL - 3 + fy };
        if (!game.ink) strokeDemo(ctx, game, a, b, t, pc);
        const text = step === 0
          ? (pc ? 'ЗАТИСНИ КНОПКУ МИШІ І ПРОВЕДИ ЛІНІЮ ЧЕРЕЗ ПРІРВУ' : 'ПРОВЕДИ ПАЛЬЦЕМ ЛІНІЮ ЧЕРЕЗ ПРІРВУ')
          : 'ТЕПЕР НАМАЛЮЙ ПІДЙОМ НА ВИЩИЙ ДАХ';
        const y = plate(ctx, V, text, y0, '#ffc31f');
        plate(ctx, V, 'ЛІНІЯ ЇСТЬ ФАРБУ - БАК ВНИЗУ', y, '#d8ccff');
        return;
      }

      // ---- the tunnels ----
      const wall = Tunnel.nextWall(w, p.tunnel, p.x);
      if (!wall) { if (p.state !== 'finished') plate(ctx, V, 'ПРОХІД ВІЛЬНИЙ - ЇДЬ ДО ФІНІШУ', y0, '#b6ff6a'); return; }
      const need = Tunnel.need(w, wall);
      let slot = -1, hole = null;
      for (let i = 0; i < game.tray.length && slot < 0; i++) {
        const q = game.tray[i].piece, h = need.find((n) => n.p === q.p && n.v === q.v);
        if (h) { slot = i; hole = h; }
      }
      if (game.armed != null) { const q = game.tray[game.armed].piece, h = need.find((n) => n.p === q.p && n.v === q.v); if (h) { slot = game.armed; hole = h; } }
      if (slot < 0) return;
      const shape = PIECES[hole.p].v[hole.v];
      const tgt = { x: Math.round(hole.col * CELL - camX), y: hole.row * CELL + fy, w: shape[0].length * CELL, h: shape.length * CELL };
      const armed = game.armed === slot, piece = game.tray[slot].piece;
      let text;
      if (pc) { text = armed ? 'ТЕПЕР КЛАЦНИ ПО ДІРЦІ У СТІНІ' : 'НАТИСНИ ' + KEYS[slot] + ', ПОТІМ КЛАЦНИ ПО ДІРЦІ'; if (!game.drag) keyDemo(ctx, game, slot, tgt, piece, t, armed); }
      else { text = armed ? 'ТЕПЕР ТОРКНИСЬ ДІРКИ У СТІНІ' : 'ТОРКНИСЬ ПІДСВІЧЕНОЇ ФІГУРИ, ПОТІМ ДІРКИ'; if (!game.drag) tapDemo(ctx, game, slot, tgt, piece, t, armed); }
      const y = plate(ctx, V, text, y0, '#ffc31f');
      plate(ctx, V, 'ПОВНИЙ СТОВПЧИК ЗНИКНЕ - ПРОХІД ВІДКРИТО', y, '#d8ccff');
    },
  };

  window.Lessons = Lessons;
})();
