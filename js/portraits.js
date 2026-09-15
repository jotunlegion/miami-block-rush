// Blacklist rival portraits: procedural pixel busts (40x48), front view,
// light from the top-left, synthwave neon rim light on the right edge.
(function () {
  const W = 40, H = 48, CX = 20, HEAD_Y = 9, EYE_Y = 20, MOUTH_Y = 28;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // skin ramps: highlight, base, shade, deep, outline
  const SKIN = {
    pale: ['#fff0e6', '#f7cdb8', '#dca08c', '#b06c70', '#5c2c44'],
    light: ['#ffe0c2', '#efb892', '#cc8a6c', '#9a5860', '#50243c'],
    tan: ['#f6c894', '#d99a6c', '#ae6c50', '#80444c', '#421e34'],
    brown: ['#d9a070', '#b0704c', '#84503c', '#5c3236', '#2e1628'],
    dark: ['#b07850', '#855038', '#5e362c', '#3e2026', '#1e0c18'],
  };
  // head half-width per row, crown (HEAD_Y) to chin
  const FACES = {
    soft: [4, 6, 7, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 7, 6, 5, 4, 3],
    round: [5, 7, 8, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 8, 8, 7, 6, 5, 4],
    square: [5, 7, 8, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 8, 7, 6, 5],
    long: [4, 6, 7, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 7, 6, 5, 4, 3],
  };
  // hair style defaults: fringe type, side curtain length/thickness, crown volume
  const HAIR = {
    bob: { fringe: 'blunt', len: 30, side: 3, vol: 1 },
    long: { fringe: 'side', len: 45, side: 4, vol: 1 },
    ponytail: { fringe: 'blunt', len: 20, side: 1, vol: 0, tail: 'pony' },
    twintails: { fringe: 'spiky', len: 20, side: 2, vol: 1, tail: 'twin' },
    perm: { fringe: 'curly', len: 38, side: 6, vol: 3, curly: true },
    afro: { fringe: 'none', len: 26, side: 5, vol: 6, curly: true },
    slick: { fringe: 'none', len: 16, side: 1, vol: 0, sleek: true },
    buzz: { fringe: 'none', len: 14, side: 0, vol: -1 },
    mohawk: { fringe: 'none', len: 0, side: 0, vol: -2, mohawk: true },
    undercut: { fringe: 'swoop', len: 24, side: 3, vol: 2, shaved: true },
    bald: { fringe: 'none', len: 0, side: 0, vol: -9 },
  };
  const cache = {};

  function mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  function build(p) {
    const key = p.id || JSON.stringify(p);
    if (cache[key]) return cache[key];
    const img = new Array(W * H).fill(null);
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const put = (x, y, c, m) => { if (inb(x, y) && c) img[y * W + x] = [c, m]; };
    const at = (x, y) => (inb(x, y) ? img[y * W + x] : null);
    const mat = (x, y) => { const v = at(x, y); return v ? v[1] : null; };
    const sk = SKIN[p.skin] || SKIN.light;
    const fem = !!p.fem;
    const face = FACES[p.face] || FACES.soft;
    const chin = HEAD_Y + face.length - 1;
    const hw = (y) => (y >= HEAD_Y && y <= chin ? face[y - HEAD_Y] : 0);
    const hs = Object.assign({}, HAIR[p.hair.style] || HAIR.bob, p.hair);
    const hr = Custom.ramp(hs.c), st = hs.streak ? Custom.ramp(hs.streak) : null;
    const cl = Custom.ramp(p.cloth.c), c2 = Custom.ramp(p.cloth.c2 || p.cloth.c);
    const rim = p.rim || '#29e0d0';
    const acc = new Set(p.acc || []);

    // ---------- shoulders & clothes ----------
    const bodyTop = 37;
    const half = (y) => Math.min(19, (fem ? 8 : 10) + Math.round((y - bodyTop) * 2.3));
    for (let y = bodyTop; y < H; y++) {
      const hh = half(y);
      for (let x = CX - hh; x < CX + hh; x++) {
        const t = (x - (CX - hh) + 0.5) / (2 * hh);
        put(x, y, t < 0.16 ? cl.h : t > 0.8 ? cl.b : cl.B, 'cloth');
      }
    }
    const chest = (x0, x1, y) => { for (let x = x0; x <= x1; x++) put(x, y, x > CX + 2 ? sk[2] : sk[1], 'skin'); };
    switch (p.cloth.style) {
      case 'tank':
        for (let y = bodyTop; y < 44; y++) { const hh = half(y); for (let x = CX - hh + 1; x < CX + hh - 1; x++) put(x, y, x > CX + hh - 5 ? sk[2] : x < CX - hh + 3 ? sk[0] : sk[1], 'skin'); }
        for (let y = bodyTop; y < 44; y++) { put(CX - 6, y, cl.B, 'cloth'); put(CX + 5, y, cl.b, 'cloth'); }
        for (let x = CX - 10; x < CX + 10; x++) put(x, 43, cl.h, 'cloth');
        break;
      case 'jacket': case 'suit':
        for (let y = bodyTop; y < H; y++) { const v = Math.floor((y - bodyTop) / 1.6); for (let x = CX - v; x < CX + v; x++) put(x, y, x > CX + 1 ? c2.b : c2.B, 'cloth'); put(CX - v - 1, y, cl.o, 'cloth'); put(CX + v, y, cl.o, 'cloth'); }
        if (p.cloth.style === 'suit') for (let y = bodyTop + 2; y < H; y++) { put(CX - 1, y, cl.d, 'cloth'); put(CX, y, cl.b, 'cloth'); }
        break;
      case 'leather':
        for (let y = bodyTop - 2; y < bodyTop + 3; y++) { put(CX - 5 - (y - bodyTop + 2), y, cl.h, 'cloth'); put(CX + 4 + (y - bodyTop + 2), y, cl.b, 'cloth'); }
        for (let y = bodyTop + 1; y < H; y += 2) put(CX, y, '#c9cfe6', 'cloth');
        for (let x = CX - 3; x < CX + 3; x++) chest(x, x, bodyTop);
        break;
      case 'racing':
        for (let x = CX - 6; x < CX + 6; x++) { put(x, bodyTop - 1, c2.B, 'cloth'); put(x, bodyTop, c2.b, 'cloth'); }
        for (let y = bodyTop + 2; y < H; y++) { put(CX - 12 + (y - bodyTop), y, c2.B, 'cloth'); put(CX - 11 + (y - bodyTop), y, c2.h, 'cloth'); }
        put(CX + 7, bodyTop + 5, '#ffffff', 'cloth'); put(CX + 8, bodyTop + 5, c2.B, 'cloth');
        break;
      case 'hawaiian':
        for (let y = bodyTop; y < H; y++) for (let x = CX - half(y); x < CX + half(y); x++) if ((x * 3 + y * 5) % 7 === 0) put(x, y, c2.B, 'cloth'); else if ((x * 3 + y * 5) % 7 === 1) put(x, y, c2.h, 'cloth');
        for (let y = bodyTop; y < bodyTop + 5; y++) { const v = y - bodyTop; chest(CX - v, CX + v - 1, y); }
        break;
      case 'fur':
        for (let x = CX - 16; x < CX + 16; x++) { const bump = (x * 7) % 3; for (let y = bodyTop - 1 - bump; y < bodyTop + 4 - bump; y++) put(x, y, y === bodyTop - 1 - bump ? c2.h : x > CX + 6 ? c2.b : c2.B, 'cloth'); }
        break;
      case 'hoodie':
        for (let x = CX - 12; x < CX + 12; x++) { put(x, bodyTop - 1, cl.b, 'cloth'); put(x, bodyTop, cl.d, 'cloth'); }
        put(CX - 3, bodyTop + 3, c2.h, 'cloth'); put(CX - 3, bodyTop + 4, c2.h, 'cloth'); put(CX + 2, bodyTop + 3, c2.h, 'cloth'); put(CX + 2, bodyTop + 5, c2.h, 'cloth');
        break;
    }

    // ---------- neck ----------
    const nw = fem ? 3 : 4;
    for (let y = chin - 3; y < bodyTop + (p.cloth.style === 'tank' ? 2 : 1); y++)
      for (let x = CX - nw; x < CX + nw; x++) put(x, y, y <= chin + 2 ? sk[3] : x >= CX + nw - 2 ? sk[2] : sk[1], 'skin');

    // ---------- head ----------
    for (let y = HEAD_Y; y <= chin; y++) {
      const h = hw(y);
      for (let x = CX - h; x < CX + h; x++) {
        const t = (x - (CX - h) + 0.5) / (2 * h);
        let col = sk[1];
        if (t > 0.74) col = sk[2];
        if (t > 0.9 && y > EYE_Y) col = sk[3];
        if (t < 0.24 && y > HEAD_Y + 3 && y < chin - 6) col = sk[0];
        if (y >= chin - 1 && t > 0.28) col = sk[2];
        put(x, y, col, 'skin');
      }
    }
    // ears
    for (const [ex, sh] of [[CX - hw(EYE_Y) - 1, sk[1]], [CX + hw(EYE_Y), sk[3]]]) for (let y = EYE_Y + 1; y < EYE_Y + 5; y++) put(ex, y, y === EYE_Y + 4 ? sk[3] : sh, 'skin');

    // ---------- face ----------
    const L = (x) => x, R = (x) => 2 * CX - 1 - x;
    const lash = '#1c0f24', sclera = '#fff6f0';
    const eye = Custom.ramp(p.eye || '#3a2a5a');
    if (fem) {
      for (const f of [L, R]) {
        put(f(13), EYE_Y - 1, lash, 'face'); put(f(14), EYE_Y - 1, lash, 'face'); put(f(15), EYE_Y - 1, lash, 'face'); put(f(16), EYE_Y - 1, lash, 'face');
        put(f(12), EYE_Y - 2, lash, 'face');
        put(f(14), EYE_Y, sclera, 'face'); put(f(14), EYE_Y + 1, sk[2], 'face');
        put(f(15), EYE_Y + 1, eye.d, 'face'); put(f(16), EYE_Y + 1, eye.B, 'face');
        put(f(15), EYE_Y, eye.B, 'face'); put(f(16), EYE_Y, eye.b, 'face');
        if (p.makeup) { const mk = mix(sk[1], p.makeup, 0.55); put(f(14), EYE_Y - 2, mk, 'face'); put(f(15), EYE_Y - 2, mk, 'face'); put(f(16), EYE_Y - 2, mix(sk[1], p.makeup, 0.3), 'face'); }
        put(f(13), EYE_Y - 4, hr.b, 'face'); put(f(14), EYE_Y - 5, hr.b, 'face'); put(f(15), EYE_Y - 5, hr.b, 'face'); put(f(16), EYE_Y - 5, hr.d, 'face');
      }
      put(15, EYE_Y, '#ffffff', 'face'); put(24, EYE_Y, eye.B, 'face'); put(23, EYE_Y, '#ffffff', 'face');
      const blush = mix(sk[1], '#ff6a8a', 0.4);
      put(13, EYE_Y + 4, blush, 'face'); put(14, EYE_Y + 4, blush, 'face'); put(25, EYE_Y + 4, mix(sk[2], '#ff6a8a', 0.35), 'face'); put(26, EYE_Y + 4, mix(sk[2], '#ff6a8a', 0.35), 'face');
    } else {
      for (const f of [L, R]) {
        put(f(14), EYE_Y - 1, sk[3], 'face'); put(f(15), EYE_Y - 1, lash, 'face'); put(f(16), EYE_Y - 1, sk[3], 'face');
        put(f(14), EYE_Y, sclera, 'face'); put(f(15), EYE_Y, eye.d, 'face'); put(f(16), EYE_Y, eye.b, 'face');
        put(f(14), EYE_Y + 1, sk[2], 'face'); put(f(15), EYE_Y + 1, sk[2], 'face'); put(f(16), EYE_Y + 1, sk[2], 'face');
        for (let x = 13; x <= 16; x++) put(f(x), EYE_Y - 3, hr.d, 'face');
        put(f(13), EYE_Y - 2, hr.d, 'face'); put(f(16), EYE_Y - 2, hr.b, 'face');
      }
      put(R(16), EYE_Y, eye.d, 'face'); put(R(15), EYE_Y, eye.b, 'face');
    }
    // nose: shadow on the right, a warm tip
    put(CX, EYE_Y + 3, sk[2], 'face'); put(CX, EYE_Y + 4, sk[2], 'face'); put(CX, EYE_Y + 5, sk[3], 'face'); put(CX - 1, EYE_Y + 5, fem ? sk[2] : sk[3], 'face');
    if (!fem) put(CX - 2, EYE_Y + 5, sk[2], 'face');
    // mouth
    const expr = p.expr || 'neutral';
    if (fem) {
      const lp = Custom.ramp(p.lips || '#e0306a');
      put(CX - 2, MOUTH_Y, lp.b, 'face'); put(CX - 1, MOUTH_Y, lp.B, 'face'); put(CX, MOUTH_Y, lp.B, 'face'); put(CX + 1, MOUTH_Y, lp.d, 'face');
      put(CX - 1, MOUTH_Y + 1, lp.B, 'face'); put(CX, MOUTH_Y + 1, lp.h, 'face');
      if (expr === 'smirk') put(CX + 2, MOUTH_Y - 1, lp.d, 'face');
      if (expr === 'smile' || expr === 'grin') { put(CX - 3, MOUTH_Y - 1, lp.b, 'face'); put(CX + 2, MOUTH_Y - 1, lp.d, 'face'); }
      if (expr === 'grin') { put(CX - 1, MOUTH_Y, '#fff6f0', 'face'); put(CX, MOUTH_Y, '#fff6f0', 'face'); }
    } else {
      for (let x = CX - 2; x <= CX + 1; x++) put(x, MOUTH_Y, sk[3], 'face');
      put(CX - 1, MOUTH_Y + 1, sk[2], 'face'); put(CX, MOUTH_Y + 1, sk[2], 'face');
      if (expr === 'smirk') { put(CX + 2, MOUTH_Y - 1, sk[3], 'face'); put(CX - 2, MOUTH_Y, sk[2], 'face'); }
      if (expr === 'grin') { put(CX - 1, MOUTH_Y, '#fff6f0', 'face'); put(CX, MOUTH_Y, '#fff6f0', 'face'); put(CX + 2, MOUTH_Y - 1, sk[3], 'face'); put(CX - 3, MOUTH_Y - 1, sk[3], 'face'); }
    }

    // ---------- facial hair ----------
    if (acc.has('stubble') || acc.has('beard')) {
      for (let y = MOUTH_Y - 2; y <= chin + (acc.has('beard') ? 2 : 0); y++) {
        const h = Math.max(hw(y), acc.has('beard') && y > chin ? 5 - (y - chin) * 2 : 0);
        for (let x = CX - h; x < CX + h; x++) {
          if (y === MOUTH_Y && x >= CX - 2 && x <= CX + 1) continue;
          if (acc.has('beard')) put(x, y, x > CX + 3 ? hr.d : (x + y) % 3 ? hr.b : hr.B, 'hair');
          else if ((x + y) % 2 === 0 && y > MOUTH_Y - 1) put(x, y, mix(sk[2], hr.d, 0.45), 'face');
        }
      }
    }
    if (acc.has('mustache')) { for (let x = CX - 3; x <= CX + 2; x++) put(x, MOUTH_Y - 1, x > CX ? hr.d : hr.b, 'hair'); put(CX - 4, MOUTH_Y, hr.b, 'hair'); put(CX + 3, MOUTH_Y, hr.d, 'hair'); }

    // ---------- hair ----------
    const vol = hs.vol;
    const crownTop = HEAD_Y - 2 - vol;
    const hairPx = (x, y, front) => {
      if (!inb(x, y)) return;
      const onFace = y >= HEAD_Y + 4 && x >= CX - hw(y) && x < CX + hw(y);
      if (onFace && !front) return;
      let col = hr.B;
      if (x > CX + 5) col = hr.b;
      if (x > CX + 9 || y > (hs.len || 0) - 2) col = hr.d;
      if (st && ((hs.split && x >= CX) || (!hs.split && x >= CX - 8 && x <= CX - 6))) col = x > CX + 5 ? st.b : st.B;
      if (hs.curly && (x * 5 + y * 3) % 4 === 0) col = hr.d;
      put(x, y, col, 'hair');
    };
    if (vol > -9 && !hs.mohawk) {
      const rx = 10 + vol, ry = 9 + vol, cy = HEAD_Y + 7;
      for (let y = crownTop; y <= cy; y++)
        for (let x = CX - rx - 1; x <= CX + rx; x++) {
          const dx = x + 0.5 - CX, dy = y + 0.5 - cy;
          let edge = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
          if (hs.curly) edge -= ((x * 7 + y * 13) % 5) * 0.035;
          if (edge > 1) continue;
          if (hs.style === 'buzz' && y > HEAD_Y + 4 && Math.abs(dx) < hw(y)) continue;
          // slicked back: hugs the skull, shows the forehead, combed highlight lines
          if (hs.sleek) {
            if (y > HEAD_Y + 3 && Math.abs(dx) < hw(y) - 1) continue;
            if (y > HEAD_Y + 1 && Math.abs(dx) < hw(y) - 3) continue;
            if ((x - y * 2 + 40) % 5 === 0 && x < CX + 4) { put(x, y, hr.h, 'hair'); continue; }
          }
          if (hs.shaved && x < CX - 3 && y > HEAD_Y + 2) { if ((x + y) % 2 === 0) put(x, y, mix(sk[2], hr.d, 0.5), 'hair'); continue; }
          hairPx(x, y, true);
        }
    }
    // fringe over the forehead
    const fr = HEAD_Y + 7;
    if (hs.fringe !== 'none') {
      for (let x = CX - hw(fr) - 1; x <= CX + hw(fr); x++) {
        let bottom = fr;
        if (hs.fringe === 'blunt') bottom = fr + 1;
        if (hs.fringe === 'side') bottom = fr + 2 - Math.floor((x - (CX - 10)) / 5);
        if (hs.fringe === 'swoop') bottom = x > CX - 2 ? fr + 3 - Math.floor((x - CX) / 3) : fr - 2;
        if (hs.fringe === 'spiky') bottom = fr + ((x * 5) % 3);
        if (hs.fringe === 'curly') bottom = fr + ((x * 3) % 2);
        for (let y = HEAD_Y + 2; y <= bottom; y++) hairPx(x, y, true);
        if (hs.fringe === 'blunt' || hs.fringe === 'spiky') if (x % 3 === 0) put(x, bottom, hr.d, 'hair');
      }
    }
    // side curtains
    if (hs.side > 0 && hs.len > HEAD_Y + 6) {
      for (let y = HEAD_Y + 4; y <= hs.len; y++) {
        const inner = y <= chin ? hw(y) : Math.max(nw + 1, hw(chin));
        const taper = hs.style === 'bob' && y > hs.len - 3 ? 1 : 0;
        const wave = hs.curly ? ((y * 3) % 3) - 1 : 0;
        for (let k = 0; k < hs.side - taper; k++) {
          hairPx(CX - inner - 1 - k + wave, y, false);
          if (!hs.shaved) hairPx(CX + inner + k - wave, y, false);
        }
      }
    }
    // tails, mohawk
    if (hs.tail === 'pony') for (let y = HEAD_Y + 2; y < 38; y++) { const x = CX + 11 + Math.round(Math.sin(y * 0.3) * 1.5); for (let k = 0; k < 3; k++) hairPx(x + k, y, false); }
    if (hs.tail === 'twin') for (const s of [-1, 1]) for (let y = HEAD_Y + 4; y < 40; y++) { const w = y < HEAD_Y + 8 ? 2 : 4 - Math.floor((y - HEAD_Y) / 12); const x0 = s < 0 ? CX - 13 - w : CX + 12; for (let k = 0; k < w; k++) hairPx(x0 + k, y, false); }
    if (hs.mohawk) {
      for (let y = HEAD_Y - 8; y < HEAD_Y + 6; y++) for (let x = CX - 2; x < CX + 2; x++) if (y > HEAD_Y - 8 + Math.abs(x - CX) * 2) hairPx(x, y, true);
      for (let y = HEAD_Y + 1; y < HEAD_Y + 8; y++) for (let x = CX - hw(y); x < CX + hw(y); x++) if (Math.abs(x - CX + 0.5) > 3 && (x + y) % 2 === 0) put(x, y, mix(sk[2], hr.d, 0.4), 'face');
    }
    // hair casts a shadow on the forehead
    for (let x = CX - 10; x < CX + 10; x++) for (let y = HEAD_Y + 3; y < EYE_Y; y++) if (mat(x, y) === 'hair' && mat(x, y + 1) === 'skin') put(x, y + 1, sk[2], 'skin');

    // ---------- accessories ----------
    const gold = ['#ffe27a', '#ffc31f', '#a86a10'];
    const ramp = (c) => Custom.ramp(c || rim);
    if (acc.has('hoops')) for (const s of [-1, 1]) { const x = s < 0 ? CX - hw(EYE_Y) - 2 : CX + hw(EYE_Y) + 1; put(x, EYE_Y + 5, gold[1], 'acc'); put(x, EYE_Y + 8, gold[2], 'acc'); put(x - s, EYE_Y + 6, gold[0], 'acc'); put(x - s, EYE_Y + 7, gold[1], 'acc'); put(x + s, EYE_Y + 6, gold[2], 'acc'); put(x + s, EYE_Y + 7, gold[2], 'acc'); }
    if (acc.has('studs')) { put(CX - hw(EYE_Y) - 1, EYE_Y + 5, rim, 'acc'); put(CX + hw(EYE_Y), EYE_Y + 5, rim, 'acc'); }
    if (acc.has('chain')) for (let x = CX - 6; x < CX + 6; x++) put(x, bodyTop + 2 + (Math.abs(x - CX + 0.5) < 3 ? 1 : 0), x % 2 ? gold[1] : gold[0], 'acc');
    if (acc.has('choker')) { for (let x = CX - nw; x < CX + nw; x++) put(x, chin + 3, '#1c0f24', 'acc'); put(CX, chin + 4, rim, 'acc'); }
    if (acc.has('mole')) put(CX - 4, MOUTH_Y - 1, sk[4], 'face');
    if (acc.has('bandaid')) { put(CX + 5, EYE_Y + 3, '#f2eefa', 'acc'); put(CX + 6, EYE_Y + 3, '#ffb0c0', 'acc'); put(CX + 7, EYE_Y + 3, '#f2eefa', 'acc'); }
    if (acc.has('scar')) for (let k = 0; k < 6; k++) put(CX + 4 + (k >> 1), EYE_Y - 3 + k, mix(sk[3], '#ff7a8a', 0.3), 'face');
    if (acc.has('eyeliner')) for (const f of [L, R]) { put(f(13), EYE_Y, lash, 'face'); put(f(14), EYE_Y + 1, sk[3], 'face'); put(f(15), EYE_Y + 2, mix(sk[2], '#1c0f24', 0.4), 'face'); }
    if (acc.has('tattoo')) { const tc = mix(sk[2], rim, 0.6); put(CX + 5, EYE_Y + 2, tc, 'face'); put(CX + 6, EYE_Y + 3, tc, 'face'); put(CX + 5, EYE_Y + 4, tc, 'face'); for (let y = chin; y < bodyTop; y++) if (y % 2) put(CX + nw - 2, y, tc, 'face'); }
    if (acc.has('cig')) { for (let x = CX + 2; x < CX + 6; x++) put(x, MOUTH_Y, '#f2eefa', 'acc'); put(CX + 6, MOUTH_Y, '#ff6a1f', 'acc'); put(CX + 7, MOUTH_Y - 2, '#8a7aa8', 'acc'); put(CX + 8, MOUTH_Y - 4, '#6a5a88', 'acc'); }
    if (acc.has('headband') || acc.has('bandana')) {
      const b = ramp(p.accC);
      for (let x = CX - hw(HEAD_Y + 5) - 1; x <= CX + hw(HEAD_Y + 5); x++) { put(x, HEAD_Y + 4, b.h, 'acc'); put(x, HEAD_Y + 5, x > CX + 5 ? b.b : b.B, 'acc'); if (acc.has('bandana')) put(x, HEAD_Y + 3, b.B, 'acc'); }
      if (acc.has('bandana')) for (let k = 0; k < 5; k++) { put(CX + 10 + k, HEAD_Y + 5 + k, b.b, 'acc'); put(CX + 10 + k, HEAD_Y + 6 + k, b.d, 'acc'); }
    }
    if (acc.has('captain')) {
      const b = ramp(p.accC || '#f2eefa');
      for (let y = HEAD_Y - 3; y < HEAD_Y + 4; y++) for (let x = CX - 11; x < CX + 11; x++) if (y > HEAD_Y - 3 || Math.abs(x - CX + 0.5) < 9) put(x, y, x > CX + 6 ? b.b : y === HEAD_Y - 3 ? b.h : b.B, 'acc');
      for (let x = CX - 10; x < CX + 11; x++) { put(x, HEAD_Y + 4, '#1c0f24', 'acc'); put(x, HEAD_Y + 5, '#2a2238', 'acc'); }
      for (let x = CX - 3; x < CX + 3; x++) put(x, HEAD_Y + 1, gold[1], 'acc'); put(CX - 1, HEAD_Y, gold[0], 'acc'); put(CX, HEAD_Y, gold[0], 'acc');
    }
    if (acc.has('shades') || acc.has('aviator')) {
      const av = acc.has('aviator'), lens = ramp(p.accC);
      for (const f of [L, R]) {
        for (let x = 12; x <= 18; x++) put(f(x), EYE_Y - 1, '#120a1e', 'acc');
        for (let y = EYE_Y; y <= EYE_Y + (av ? 2 : 1); y++) for (let x = 12; x <= 18; x++) {
          const edge = x === 12 || x === 18 || y === EYE_Y + (av ? 2 : 1);
          const cut = av && y === EYE_Y + 2 && (x === 12 || x === 18);
          if (cut) continue;
          put(f(x), y, edge ? '#120a1e' : y === EYE_Y ? lens.h : y === EYE_Y + 1 ? lens.b : lens.d, 'acc');
        }
      }
      put(14, EYE_Y, '#ffffff', 'acc'); put(15, EYE_Y, '#ffffff', 'acc'); put(24, EYE_Y, '#ffffff', 'acc');
    }
    if (acc.has('visor')) {
      const v = ramp(p.accC);
      for (let x = CX - hw(EYE_Y) - 1; x <= CX + hw(EYE_Y); x++) { put(x, EYE_Y - 2, '#120a1e', 'acc'); put(x, EYE_Y - 1, v.h, 'acc'); put(x, EYE_Y, v.B, 'acc'); put(x, EYE_Y + 1, v.b, 'acc'); put(x, EYE_Y + 2, '#120a1e', 'acc'); }
      for (let k = 0; k < 4; k++) put(CX - 7 + k * 2, EYE_Y - 1, '#ffffff', 'acc');
    }
    if (acc.has('eyepatch')) {
      for (let y = EYE_Y - 2; y <= EYE_Y + 2; y++) for (let x = 12; x <= 17; x++) if (!((y === EYE_Y - 2 || y === EYE_Y + 2) && (x === 12 || x === 17))) put(x, y, y === EYE_Y - 2 ? '#3a2a4a' : '#120a1e', 'acc');
      for (let k = 0; k < 12; k++) put(17 + k, EYE_Y - 3 - (k >> 1), '#120a1e', 'acc');
    }

    // ---------- outline + neon rim ----------
    const outCol = { skin: sk[4], face: sk[4], hair: hr.o, cloth: cl.o, acc: '#0c0818' };
    const res = img.map((v) => v && v.slice());
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const v = img[y * W + x];
        if (!v) continue;
        if (!at(x + 1, y) && v[1] !== 'acc') res[y * W + x][0] = mix(v[0], rim, 0.75);
        else if (!at(x - 1, y) || !at(x, y - 1)) res[y * W + x][0] = outCol[v[1]] || v[0];
      }

    // ---------- background ----------
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const A = Custom.ramp(p.bg[0]), B = Custom.ramp(p.bg[1]);
    const bands = [A.o, A.d, A.b, A.B, B.b, B.B];
    for (let y = 0; y < H; y++) {
      const f = (y / (H - 1)) * (bands.length - 1), i = Math.floor(f), fr2 = f - i;
      for (let x = 0; x < W; x++) {
        g.fillStyle = fr2 * 16 > BAYER[(y & 3) * 4 + (x & 3)] ? bands[Math.min(bands.length - 1, i + 1)] : bands[i];
        g.fillRect(x, y, 1, 1);
      }
    }
    if (p.motif === 'sun') {
      for (let y = 10; y < 36; y++) for (let x = 20; x < 40; x++) {
        const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 24);
        if (d < 11 && !(y > 22 && (y % 3 === 0 || (y > 30 && y % 3 === 1)))) { g.fillStyle = y < 18 ? B.h : y < 26 ? B.B : B.b; g.fillRect(x, y, 1, 1); }
      }
    } else if (p.motif === 'grid') {
      g.fillStyle = B.h;
      for (let y = 30; y < H; y += y < 36 ? 3 : 4) g.fillRect(0, y, W, 1);
      for (let i = -6; i <= 6; i++) for (let y = 30; y < H; y++) { const x = Math.round(CX + i * 4 * ((y - 22) / 8)); if (x >= 0 && x < W && y % 2) g.fillRect(x, y, 1, 1); }
    } else if (p.motif === 'stars') {
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 18; i++) g.fillRect((i * 17 + 5) % W, (i * 11 + 3) % 30, 1, 1);
      g.fillStyle = B.h;
      for (let i = 0; i < 6; i++) g.fillRect((i * 23 + 9) % W, (i * 7 + 13) % 26, 1, 1);
    }
    for (let i = 0; i < W * H; i++) { const v = res[i]; if (!v) continue; g.fillStyle = v[0]; g.fillRect(i % W, (i / W) | 0, 1, 1); }
    return (cache[key] = c);
  }

  window.Portraits = { build, W, H };
})();
