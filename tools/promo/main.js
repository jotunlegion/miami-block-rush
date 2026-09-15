// Director: picks the shot for a frame, simulates it, composites it at 1920x1080 through the
// camera and the global edit events (flash, punch zoom, shake, RGB split, blur), then post-FX.
(function () {
  const FPS = 60, W = 1920, H = 1080, K = 4;
  const TOTAL = 33.3;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const octx = out.getContext('2d');
  const scene = document.createElement('canvas');
  scene.width = Stage.SBW; scene.height = Stage.SBH;
  const sctx = scene.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  const gl = document.getElementById('gl');
  FX.init(gl);

  // ---------- edit events ----------
  const EV = [];
  const ease3 = (p) => (1 - p) * (1 - p) * (1 - p);
  function ev(o) { EV.push(o); return o; }
  // the standard beat hit of a TikTok edit
  function hit(t, s = 1, o = {}) {
    ev({ t, type: 'flash', dur: o.flashDur || 0.12, amt: (o.flash != null ? o.flash : 0.85) * Math.min(1, s), col: o.col || [1, 1, 1] });
    ev({ t, type: 'punch', dur: 0.28, amt: 0.22 * s });
    ev({ t, type: 'rgb', dur: 0.22, amt: 22 * s });
    ev({ t, type: 'shake', dur: 0.26, amt: 34 * s, seed: t * 97 });
    ev({ t, type: 'zblur', dur: 0.1, amt: 0.045 * s });
  }
  function impact(t, frames = 2) { ev({ t, type: 'inv', dur: frames / FPS }); }
  function whip(t, dir = 1, s = 1) {
    ev({ t: t - 0.05, type: 'dblur', dur: 0.12, amt: 260 * s * dir, tri: true });
    ev({ t: t - 0.05, type: 'rgbx', dur: 0.12, amt: 30 * s * dir, tri: true });
  }

  function envAt(t) {
    const E = { focus: 0, speed: 0, flash: 0, flashCol: [1, 1, 1], punch: 0, rgb: 0, rgbDir: [1, 0.35], shakeX: 0, shakeY: 0, shakeR: 0, zblur: 0, inv: 0, dblur: 0 };
    for (const e of EV) {
      const p = (t - e.t) / e.dur;
      if (p < 0 || p >= 1) continue;
      const k = e.tri ? 1 - Math.abs(p * 2 - 1) : ease3(p);
      switch (e.type) {
        case 'flash': if (e.amt * k > E.flash) { E.flash = e.amt * k; E.flashCol = e.col; } break;
        case 'punch': E.punch += e.amt * k; break;
        case 'rgb': E.rgb += e.amt * k; break;
        case 'rgbx': E.rgb += Math.abs(e.amt) * k; E.rgbDir = [Math.sign(e.amt), 0]; break;
        case 'shake': {
          const a = e.amt * (1 - p) * (1 - p), q = (t - e.t) * 60 + e.seed;
          E.shakeX += Math.sin(q * 2.7) * Math.cos(q * 1.3) * a;
          E.shakeY += Math.sin(q * 3.1 + 1.7) * a * 0.7;
          E.shakeR += Math.sin(q * 1.9 + 0.4) * a * 0.0009;
          break;
        }
        case 'zblur': E.zblur += e.amt * k; break;
        case 'inv': E.inv = 1; break;
        case 'dblur': E.dblur += e.amt * k; break;
        case 'focus': E.focus = Math.max(E.focus, e.amt * (e.flat ? 1 : k)); break;
        case 'speed': E.speed = Math.max(E.speed, e.amt * (e.flat ? 1 : k)); break;
      }
    }
    return E;
  }

  // ---------- anime focus lines and speed lines, drawn crisp at output resolution ----------
  function lrng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function animeLines(ctx, f, focus, speed, dir) {
    if (focus > 0.01) {
      const r = lrng(f * 7919 + 13), cx = W / 2, cy = H / 2;
      ctx.fillStyle = '#ffffff';
      const n = Math.round(110 * Math.min(1, focus));
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, inner = (0.55 + r() * 0.35) * (1.25 - focus * 0.35), w = 4 + r() * 16;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.globalAlpha = Math.min(1, focus) * (0.35 + r() * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx + ca * 1500 - sa * w, cy + sa * 1500 + ca * w);
        ctx.lineTo(cx + ca * 1500 + sa * w, cy + sa * 1500 - ca * w);
        ctx.lineTo(cx + ca * inner * W * 0.5, cy + sa * inner * H * 0.5);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (speed > 0.01) {
      const r = lrng(f * 104729 + 7);
      ctx.fillStyle = '#ffffff';
      const n = Math.round(46 * Math.min(1, speed));
      for (let i = 0; i < n; i++) {
        const y = Math.round(r() * H / 4) * 4, len = 160 + r() * 700, x = r() * (W + len) - len;
        ctx.globalAlpha = Math.min(1, speed) * (0.12 + r() * 0.4) * (Math.abs(y - H / 2) / (H / 2) * 0.7 + 0.3);
        ctx.fillRect(Math.round(x / 4) * 4, y, Math.round(len / 4) * 4, r() < 0.25 ? 8 : 4);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- shots ----------
  let cur = null, S = null;
  function shotAt(t) {
    const list = window.SHOTS;
    for (let i = list.length - 1; i >= 0; i--) if (t >= list[i].t0) return list[i];
    return list[0];
  }

  function begin(shot) {
    Stage.srand(shot.seed || 1);
    S = shot.init();
    S.shot = shot;
    const pre = shot.pre || 0;
    while (S.t < pre - 1e-9) Stage.step(S);
    S.t0sim = S.t;
    cur = shot;
  }

  function renderFrame(f) {
    const t = f / FPS;
    const shot = shotAt(t);
    const lt = t - shot.t0;
    const st = (shot.speed ? shot.speed(lt) : lt) + (shot.pre || 0);
    if (cur !== shot || !S || S.t > st + 1e-6) begin(shot);
    while (S.t + Stage.DT <= st + 1e-9) { Stage.step(S); Stage.tracerHits(S); }
    // scene at game resolution
    const cam = Object.assign({ z: 1, rot: 0, fx: 240, fy: 135, flip: false }, shot.cam ? shot.cam(S, lt, st) : {});
    if (cam.x != null) S.camX = cam.x;
    if (shot.update) shot.update(S, lt, st, t);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    if (shot.draw) shot.draw(sctx, S, lt, st);
    else Stage.drawWorld(sctx, S, st);
    if (shot.hud) shot.hud(sctx, S, lt, st);

    // composite through the camera
    const E = envAt(t);
    const z = cam.z * (1 + E.punch);
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.fillStyle = '#05030c'; octx.fillRect(0, 0, W, H);
    octx.imageSmoothingEnabled = false;
    const half = 240 / z, halfY = 135 / z;
    const fx = Math.max(half - Stage.OX + 4, Math.min(480 + Stage.OX - half - 4, cam.fx));
    const fy = Math.max(halfY - Stage.OY + 4, Math.min(270 + Stage.OY - halfY - 4, cam.fy));
    octx.translate(W / 2 + E.shakeX, H / 2 + E.shakeY);
    octx.rotate(cam.rot + E.shakeR);
    octx.scale(K * z * (cam.flip ? -1 : 1), K * z);
    octx.translate(-(fx + Stage.OX), -(fy + Stage.OY));
    octx.drawImage(scene, 0, 0);
    octx.setTransform(1, 0, 0, 1, 0, 0);
    animeLines(octx, f, Math.max(E.focus, cam.focus || 0), Math.max(E.speed, cam.speed || 0), cam.linesDir || 0);
    if (shot.overlay) shot.overlay(octx, S, lt, st, t);

    // post
    const P = Object.assign({}, shot.post ? shot.post(S, lt, st) : {});
    P.flash = Math.max(P.flash || 0, E.flash);
    if (E.flash > 0) P.flashCol = E.flashCol;
    P.rgb = (P.rgb || 0) + E.rgb;
    if (E.rgb) P.rgbDir = E.rgbDir;
    P.zoomBlur = (P.zoomBlur || 0) + E.zblur;
    P.inv = Math.max(P.inv || 0, E.inv);
    const db = E.dblur + (cam.blurX || 0);
    if (Math.abs(db) > 0.5) P.dirBlur = [db, cam.blurY || 0];
    FX.apply(out, P, t);
    return { shot: shot.name, lt: +lt.toFixed(3) };
  }

  window.Director = { FPS, TOTAL, frames: Math.round(TOTAL * FPS), renderFrame, hit, impact, whip, ev, EV,
    grab: (type = 'image/png') => gl.toDataURL(type, 0.95) };
})();
