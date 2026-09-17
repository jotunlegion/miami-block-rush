// Player profile: save data, economy, effective car stats, rival matching
(function () {
  const KEY = window.BOT_MODE ? 'mbr_save_bot' : 'mbr_save_v2';
  const START_CASH = 6000;
  const DEFAULT_GANG = 0;
  const GANG_LOOK = [
    { paint: '#ff3ea5', accent: '#29e0d0', glow: 'pink' },
    { paint: '#7b2fbe', accent: '#ffc31f', glow: 'gold' },
    { paint: '#29c7b8', accent: '#fff1c9', glow: 'cyan' },
  ];
  let data = null;

  const blankUp = () => { const u = {}; Catalog.UPGRADES.forEach((x) => (u[x.id] = 0)); return u; };
  // free: one level counter per mechanic, kept apart from the campaign level on purpose -
  // a free ride is practice, not progress, and must not push the Blacklist along
  const blankFree = () => ({ blocks: 1, neon: 1, tunnel: 1 });
  const blank = () => ({ v: 2, gang: DEFAULT_GANG, cash: START_CASH, current: null, level: 1, career: { beaten: [] }, free: blankFree(), bonusBest: 0, cars: {}, stats: { races: 0, wins: 0, earned: 0, best: 0 } });

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      const saved = s ? JSON.parse(s) : null;
      data = saved ? Object.assign(blank(), saved) : blank();
      // saves from before levels existed: players who already raced skip the tutorial
      if (saved && saved.level == null) data.level = data.stats.races > 0 ? 2 : 1;
    } catch (e) { data = blank(); }
    for (const id of Object.keys(data.cars)) {
      if (!Catalog.byId[id]) { delete data.cars[id]; continue; }
      const e = data.cars[id];
      e.up = Object.assign(blankUp(), e.up || {});
      e.cu = Object.assign(Custom.defaults(Catalog.byId[id]), e.cu || {});
    }
    if (data.gang == null) data.gang = DEFAULT_GANG;
    data.free = Object.assign(blankFree(), data.free || {});
    data.bonusBest = data.bonusBest || 0;
    if (!data.cars[data.current]) data.current = Object.keys(data.cars)[0] || null;
    return data;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ } }

  const newEntry = (id) => ({ up: blankUp(), cu: Custom.defaults(Catalog.byId[id]) });

  function setGang(g) {
    data.gang = g;
    const st = Catalog.STARTERS[g];
    if (!data.cars[st.id]) data.cars[st.id] = newEntry(st.id);
    data.current = st.id;
    save();
  }

  function buy(id) {
    const car = Catalog.byId[id];
    if (data.cars[id]) return 'owned';
    if (data.cash < car.price) return 'cash';
    data.cash -= car.price;
    data.cars[id] = newEntry(id);
    data.current = id;
    save();
    return 'ok';
  }

  function spend(n) { if (data.cash < n) return false; data.cash -= n; save(); return true; }

  // ---------- stats ----------
  // upgrade effects, rating and prices live in balance.js
  const stats = (id, up) => Balance.applyUp(Catalog.byId[id].stats, up);
  const rating = (s) => Balance.rating(s);

  // soft NFS-like scale: stock cars still show a readable bar, top builds approach full
  const clamp01 = (v) => Math.max(0.08, Math.min(1, 0.18 + 0.82 * Math.pow(Math.max(0, v), 0.75)));
  function bars(s) {
    return [
      clamp01((s.top - 120) / (300 - 120)),
      clamp01((s.accel - 200) / (1200 - 200)),
      // flight: ramp launch boost (tires) and air gravity (suspension) -> how far jumps carry
      clamp01(((s.launch - 1.25) / 0.5 + (1.05 - s.air) / 0.35) / 2),
      clamp01((s.armor - 80) / (320 - 80)),
    ];
  }

  const upgradeCost = (id, cat, lvl) => Balance.upgradeCost(Catalog.byId[id].price, cat, lvl);
  const partCost = (id, price) => Balance.partCost(Catalog.byId[id].price, price);

  function def(id, up, cu) {
    const car = Catalog.byId[id];
    const s = stats(id, up);
    if (car.phys) s.top = Math.round(s.top * car.phys); // physics-only chassis calibration
    return Object.assign({ key: id, name: car.name, map: Custom.build(car, cu) }, s);
  }

  // top speed of the car in the garage, without building its voxel map: used to size levels
  function topSpeed() {
    try {
      const e = data.cars[data.current], c = Catalog.byId[data.current];
      const s = Balance.applyUp(c.stats, e.up);
      return c.phys ? Math.round(s.top * c.phys) : s.top;
    } catch (err) { return 140; }
  }

  function playerDef() {
    const e = data.cars[data.current];
    return def(data.current, e.up, e.cu);
  }

  // rivals drive catalog cars in gang colors, tuned to roughly match the player's rating
  function rivalDef(gi, targetRating, exclude = []) {
    const pool = Catalog.ALL.filter((c) => !c.bl && !exclude.includes(c.id)).map((c) => ({ c, r: rating(stats(c.id)) }));
    let near = pool.filter((p) => p.r >= targetRating - 120 && p.r <= targetRating + 30);
    if (!near.length) near = pool.slice().sort((a, b) => Math.abs(a.r - targetRating) - Math.abs(b.r - targetRating)).slice(0, 3);
    const pick = near[Math.floor(Math.random() * near.length)].c;
    const up = blankUp();
    let guard = 0;
    while (rating(stats(pick.id, up)) < targetRating - 20 && guard++ < 40) {
      const cat = Catalog.UPGRADES[Math.floor(Math.random() * Catalog.UPGRADES.length)].id;
      if (up[cat] < 3) up[cat]++;
    }
    const look = GANG_LOOK[gi];
    const vinyls = ['stripe', 'twin', 'flames', 'bolt', 'tribal'];
    const cu = { paint: look.paint, accent: look.accent, vinyl: vinyls[Math.floor(Math.random() * vinyls.length)], glow: look.glow, rims: gi === 1 ? 'gold' : 'chrome' };
    return def(pick.id, up, cu);
  }

  function rivalDefs(gangs) {
    const r = rating(stats(data.current, data.cars[data.current].up));
    const used = [data.current];
    return gangs.map((gi) => { const d = rivalDef(gi, r, used); used.push(d.key); return d; });
  }

  function raceDone(earned, won) {
    data.cash += earned;
    data.stats.races++;
    if (won) data.stats.wins++;
    data.stats.earned += earned;
    data.stats.best = Math.max(data.stats.best, earned);
    save();
  }

  function levelDone(n) { if (n >= data.level) data.level = n + 1; save(); }

  // ---------- free ride ----------
  const freeLevel = (m) => data.free[m] || 1;
  const freeOpen = (m) => data.level >= Levels.FREE[m].gate;
  function freeDone(m) { data.free[m] = freeLevel(m) + 1; save(); }
  function bonusScore(v) { if (v > data.bonusBest) { data.bonusBest = v; save(); return true; } return false; }

  // ---------- Blacklist career ----------
  const beaten = (rank) => data.career.beaten.includes(rank);
  function careerState(r) {
    if (beaten(r.rank)) return 'beaten';
    if (r.rank < 20 && !beaten(r.rank + 1)) return 'prev';
    if (data.level < r.gate) return 'level';
    return 'open';
  }
  // the rival only takes a bet from a car worth at least the previous rival's car
  const carOk = (r, id = data.current) => !!id && Catalog.byId[id].price >= r.carReq;
  function careerWin(r) {
    if (!beaten(r.rank)) data.career.beaten.push(r.rank);
    const fresh = !data.cars[r.car.id];
    if (fresh) data.cars[r.car.id] = newEntry(r.car.id);
    save();
    return fresh;
  }

  function reset() { data = blank(); save(); }

  window.Profile = {
    load, save, setGang, levelDone, beaten, careerState, carOk, careerWin, buy, spend, stats, rating, bars, upgradeCost, partCost, def, playerDef, topSpeed, rivalDefs, raceDone, reset, GANG_LOOK,
    freeLevel, freeOpen, freeDone, bonusScore,
    get bonusBest() { return data.bonusBest; },
    get data() { return data; },
    get cash() { return data.cash; },
    entry: (id) => data.cars[id],
    owned: (id) => !!data.cars[id],
    select: (id) => { if (data.cars[id]) { data.current = id; save(); } },
  };
})();
