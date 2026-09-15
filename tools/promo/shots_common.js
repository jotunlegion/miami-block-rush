// Shared helpers for shot scripts
(function () {
  const { CELL } = World;
  window.SHOTS = [];

  const ease = {
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    back: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // keyframed value: keys [[t, v], ...], eased between keys
  function key(keys, t, e = ease.io) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
        const k = e((t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  }
  // piecewise playback rate: [[lt, rate], ...] -> lt => sim seconds
  function rate(segs) {
    return (lt) => {
      let st = 0;
      for (let i = 0; i < segs.length; i++) {
        const a = segs[i][0], b = i + 1 < segs.length ? segs[i + 1][0] : Infinity;
        if (lt <= a) break;
        st += (Math.min(lt, b) - a) * segs[i][1];
      }
      return st;
    };
  }

  function road(S, c0, c1, row, owner = 9) { Stage.fill(S.w, c0, c1, row, 12, 1, owner); }

  const HERO = { glow: 'pink', rims: 'pink', vinyl: 'stripe', accent: '#ff3ea5' };
  const hero = (S, x, y, over) => { const c = Stage.car(S, 'st_vice', x, y, HERO, 0, Object.assign({ top: 200, accel: 420 }, over)); S.player = c; return c; };

  // shot registration: times in song seconds; helper at() schedules on shot-local sim time
  function shot(o) {
    const s = Object.assign({ seed: SHOTS.length * 131 + 7, pre: 0 }, o);
    const init = s.init;
    s.init = function () {
      Particles.clear();
      const pend = [];
      const S = init.call(s, (t, fn) => pend.push([t, fn]));
      const base = s.base != null ? s.base : s.pre;
      for (const [t, fn] of pend) Stage.at(S, base + t, fn);
      return S;
    };
    SHOTS.push(s);
    return s;
  }
  // wrap: init(at) receives an at() bound to the stage created inside
  function stage(cols) {
    const S = Stage.create(cols);
    return S;
  }

  // follow cam: keep a world point at the view centre
  const follow = (S, wx, wy, o = {}) => Object.assign({ x: wx - 240, fx: 240, fy: wy }, o);

  // gradient pixel text: one colour per glyph row (7 rows), dark outline and a hard drop shadow
  function fancy(ctx, str, x, y, s, rows, o = {}) {
    const w = Font.measure(str, s);
    x = Math.round(x - w / 2); y = Math.round(y);
    const ol = o.outline || '#12082a';
    if (o.shadow) Font.draw(ctx, str, x + s * (o.sd || 1.5), y + s * (o.sd || 1.5), o.shadow, s, 'left', null);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]])
      Font.draw(ctx, str, x + dx * Math.max(1, s / 3), y + dy * Math.max(1, s / 3), ol, s, 'left', null);
    for (let r = 0; r < 7; r++) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 2, y + r * s, w + 4, s); ctx.clip();
      Font.draw(ctx, str, x, y, rows[r], s, 'left', null);
      ctx.restore();
    }
  }
  const CHROME = ['#ffffff', '#fff6d8', '#ffe27a', '#ffc31f', '#ff8a3d', '#ff3ea5', '#b0209a'];
  const NEON = ['#ffd6f5', '#ff9ad8', '#ff5cb8', '#ff3ea5', '#e0288f', '#b01c78', '#7a1060'];
  const CYAN = ['#e8ffff', '#b8fff6', '#7af5ea', '#29e0d0', '#1fb8c8', '#1686a8', '#105a7a'];

  // hand keyframes: [{t, x, y, drag?, id?, v?, snap?, press?}] on sim-local time
  function hand(keys, t) {
    if (t < keys[0].t - 0.001 || t > keys[keys.length - 1].t + (keys[keys.length - 1].hold || 0.25)) return null;
    let a = keys[0], b = keys[0];
    for (let i = 0; i < keys.length; i++) { if (keys[i].t <= t) a = keys[i]; if (keys[i].t >= t) { b = keys[i]; break; } b = keys[i]; }
    const k = b.t > a.t ? ease.io(clamp((t - a.t) / (b.t - a.t), 0, 1)) : 0;
    const h = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), drag: a.drag, id: a.id, v: a.v, slot: a.slot, owner: a.owner };
    if (b.snap && k > 0.75) h.snap = b.snap;
    if (a.snap && a.t === b.t) h.snap = a.snap;
    const since = t - a.t;
    h.press = a.tap && since < 0.2 ? 1 - since / 0.2 : 0;
    return h;
  }

  window.P = { ease, clamp, lerp, key, rate, road, hero, HERO, shot, stage, follow, fancy, CHROME, NEON, CYAN, hand, CELL };
})();
