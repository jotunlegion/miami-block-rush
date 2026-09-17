// Screen layout: one design box per orientation, and every metric the race, the menus and
// the garage hang off it.
//
// Landscape is unchanged - a 480x270 box centred on the screen, with the spare pixels of a
// tall phone spilling past its edges. Portrait makes the whole view the design box instead:
// ox/oy are zero, W and H are the view, and the screens lay themselves out top-down. That
// way a 9:20 phone gets a deeper tray and bigger buttons rather than a taller letterbox.
(function () {
  const LAND = { W: 480, H: 270 };
  const PORT = { W: 240, H: 400 };   // the smallest portrait view we promise to lay out for
  const FIELD_H = 208;               // World.ROWS * World.CELL, kept here to stay load-order free

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const L = {
    portrait: false, dpr: 1, scale: 1,
    vw: LAND.W, vh: LAND.H, ox: 0, oy: 0,
    W: LAND.W, H: LAND.H, cx: LAND.W / 2,
    race: null,
  };

  // The tray the way it has always been: one strip under a full-width field.
  function landscapeRace() {
    const trayY = 222;
    return {
      fieldTop: 0, trayY, trayH: LAND.H - trayY, hudH: 0,
      slots: [0, 1, 2].map((i) => ({ x: 240 + (i - 1) * 84 - 38, y: trayY + 3, w: 76, h: 44 })),
      jump: { x: 6, y: trayY + 5, w: 68, h: 40 },
      jumpWide: { x: 6, y: trayY + 5, w: 68, h: 40 },
      nitro: { x: 406, y: trayY + 5, w: 68, h: 40 },
      gauge: { x: 84, y: trayY + 5, w: 390, h: 40 },
      lead: { base: 130, fast: 80 },
    };
  }

  // Portrait: a HUD strip on top, the field under it, and a deep tray on the bottom third.
  // The tray takes a fixed share of the height, so a taller phone buys bigger slots and
  // bigger buttons instead of more empty sky.
  function portraitRace(W, H) {
    const pad = 6, hudH = 46;
    const trayH = clamp(Math.round(H * 0.33), 128, 230);
    const trayY = H - trayH;
    const inner = trayH - pad * 4;
    const btnH = clamp(Math.round(inner * 0.46), 44, 72);
    // a slot only ever holds a 4x2 piece, so past 76 the extra height is padding: the buttons
    // keep it and stay pinned to the bottom edge, where the thumbs already are
    const slotH = clamp(inner - btnH, 48, 76);
    const slotW = Math.floor((W - pad * 4) / 3);
    // on a very tall phone the tray is deeper than the two rows need, so the slack is split
    // above and below the slots instead of piling up between them and the buttons
    const btnY = trayY + trayH - pad - btnH;
    const slotY = trayY + pad * 2 + Math.round(Math.max(0, inner - slotH - btnH) / 2);
    const btnW = Math.floor((W - pad * 3) / 2);
    // the field sits low, close to the thumbs, with the leftover height going to the sky
    const spare = Math.max(0, trayY - hudH - FIELD_H - 10);
    return {
      fieldTop: hudH + Math.round(spare * 0.75), trayY, trayH, hudH,
      slots: [0, 1, 2].map((i) => ({ x: pad + i * (slotW + pad), y: slotY, w: slotW, h: slotH })),
      jump: { x: pad, y: btnY, w: btnW, h: btnH },
      jumpWide: { x: pad, y: btnY, w: W - pad * 2, h: btnH },
      nitro: { x: W - pad - btnW, y: btnY, w: btnW, h: btnH },
      gauge: { x: pad, y: slotY, w: W - pad * 2, h: slotH },
      lead: { base: Math.round(W * 0.24), fast: Math.round(W * 0.15) },
    };
  }

  // A screen with no field to line up with (title, gang select) hangs the sunset off the
  // strip of road the title cars drive along, which sits about three quarters down.
  L.menuRoad = function () { return L.portrait ? Math.round(L.H * 0.76) : 196; };
  L.menuHorizon = function () { return L.portrait ? L.menuRoad() - 196 : L.oy; };

  L.set = function (winW, winH, dpr) {
    const portrait = winH > winW;
    const S = portrait ? PORT : LAND;
    const pxW = Math.round(winW * dpr), pxH = Math.round(winH * dpr);
    let s = Math.min(pxW / S.W, pxH / S.H);
    s = s >= 1 ? Math.floor(s) : s;
    const vw = Math.ceil(pxW / s), vh = Math.ceil(pxH / s);
    L.portrait = portrait; L.dpr = dpr; L.scale = s;
    L.pxW = pxW; L.pxH = pxH; L.vw = vw; L.vh = vh;
    if (portrait) { L.ox = 0; L.oy = 0; L.W = vw; L.H = vh; }
    else { L.ox = Math.floor((vw - LAND.W) / 2); L.oy = Math.floor((vh - LAND.H) / 2); L.W = LAND.W; L.H = LAND.H; }
    L.cx = Math.round(L.W / 2);
    L.race = portrait ? portraitRace(L.W, L.H) : landscapeRace();
    return L;
  };

  L.set(window.innerWidth || LAND.W, window.innerHeight || LAND.H, window.devicePixelRatio || 1);
  window.Layout = L;
})();
