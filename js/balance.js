// Single source of truth for the numbers: upgrade effects, race pace and rating, upgrade and part prices,
// level cash scaling, the measured income model and the Blacklist career curve. docs/BALANCE.md is generated from this.
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const UP_IDS = ['engine', 'turbo', 'gearbox', 'tires', 'suspension', 'chassis'];

  // ---------- performance upgrades, levels 0..3 ----------
  function applyUp(base, up) {
    const s = Object.assign({}, base);
    const u = (k) => (up && up[k]) || 0;
    s.top *= 1 + 0.06 * u('engine') + 0.025 * u('gearbox');
    s.accel *= 1 + 0.12 * u('turbo') + 0.05 * u('gearbox');
    s.hill += 0.06 * u('tires');
    s.launch += 0.04 * u('tires');
    s.air *= 1 - 0.05 * u('suspension');
    s.damp = Math.max(0.2, s.damp - 0.02 * u('suspension'));
    s.armor *= 1 + 0.15 * u('chassis');
    s.top = Math.round(s.top); s.accel = Math.round(s.accel); s.armor = Math.round(s.armor);
    return s;
  }

  // ---------- pace: effective race speed (px/s) ----------
  // Fitted on a fixed test track with kickers, gaps, steps and drops driven by the real physics:
  // lap time ~ 6750 / top; accel +500 -> -7%, launch +0.3 -> -11%, hill +0.2 -> -2.5%.
  // armor and air are modelled: fewer wrecks and shorter gaps to bridge in a real race.
  function pace(s) {
    return s.top
      * (1 + 0.00016 * (s.accel - 300))
      * (1 + 0.42 * (s.launch - 1.3))
      * (1 + 0.1 * clamp(s.hill - 0.56, 0, 0.3))
      * (1 + 0.08 * clamp((s.armor - 120) / 140, -0.5, 1))
      * (1 + 0.1 * clamp(1 - s.air, 0, 0.3));
  }
  const rating = (s) => Math.max(10, Math.round((pace(s) - 90) * 5));

  // ---------- prices: the more a car is worth, the more every upgrade and part costs ----------
  const tier = (value) => 0.5 + value / 10000;
  const partTier = (value) => 0.6 + value / 25000;
  const upCost = (cat, lvl) => Catalog.UPGRADES.find((u) => u.id === cat).cost[lvl];
  const upgradeCost = (value, cat, lvl) => Math.round((upCost(cat, lvl) * tier(value)) / 50) * 50;
  const partCost = (value, price) => Math.round((price * partTier(value)) / 10) * 10;

  // ---------- level economy ----------
  // cash multiplier on bags and finish bonuses: later levels pay more
  const cashMul = (n) => 1 + 0.02 * (Math.max(1, n) - 1);
  // measured with an AI stand-in for an average player, 10 races per level (x1 cash, before death penalties):
  // L2 $2225, L10 $3845, L20 $4395, L30 $5085, L60 $5475 per attempt
  // every death (fall or wreck) takes 10% off the final sum, but at least 10% of it is kept
  const deathMul = (deaths) => Math.max(0.1, 1 - 0.1 * deaths);
  // share of the sum the same AI stand-in keeps after death penalties (it dies 7-15 times a race):
  // L4 44%, L10 29%, L16 22%, L25 10%, L40 10%; its level win rate drops to ~0.28
  const deathKeep = (n) => Math.max(0.1, 0.48 - 0.015 * n);
  const earnPerAttempt = (n) => (n <= 1 ? 850 : Math.min(5300, 2500 + 90 * n) * cashMul(n) * deathKeep(n));
  const WIN_RATE = 0.28;
  const levelIncome = (n) => (n <= 1 ? 850 : earnPerAttempt(n) / WIN_RATE);
  function income(a, b) { let s = 0; for (let n = a; n <= b; n++) s += levelIncome(n); return s; }

  // ---------- Blacklist career ----------
  // i = 1 (rank #20) .. 20 (rank #1). need = pace the player must bring, skill = boss driving vs an average
  // player (1.06 -> boss finishes 6% sooner in the same car), tune = boss upgrade package on top of stock.
  // A rival only takes the bet from a car worth at least the previous rival's car, so every rank is won on
  // the freshly won pink slip. step: that pink slip is exactly `step` short of the next rival, so every rank
  // needs about the same tuning; blacklist.js prices each car so that tuning costs `share` of the cash on hand.
  const CAREER = {
    ranks: 20,
    gate: (i) => i * 10,
    need: (i) => 205 * Math.pow(1.035, i - 1),
    step: 1.1,
    tune: (i) => (i <= 3 ? 1 : 1 + (0.05 * (i - 3)) / 17),
    stockPace: (i) => (205 * Math.pow(1.035, i)) / 1.1,
    skill: (i) => 1.1 / (1.035 * (i <= 3 ? 1 : 1 + (0.05 * (i - 3)) / 17)),
    share: 0.8,
    block: (i) => [Math.max(1, (i - 1) * 10), i * 10 - 1],
  };

  // cheapest upgrade package (levels bought directly) that lifts a car to a target pace
  const COMBOS = [];
  for (let n = 0; n < 4096; n++) { const up = {}; UP_IDS.forEach((id, k) => (up[id] = (n >> (k * 2)) & 3)); COMBOS.push(up); }
  function cheapestUp(base, value, target, from) {
    let best = null;
    for (const up of COMBOS) {
      if (from && UP_IDS.some((k) => up[k] < (from[k] || 0))) continue;
      let cost = 0;
      for (const k of UP_IDS) if (up[k] && up[k] !== ((from && from[k]) || 0)) cost += upgradeCost(value, k, up[k]);
      if (best && cost >= best.cost) continue;
      if (pace(applyUp(base, up)) >= target) best = { up, cost };
    }
    return best;
  }
  const maxUp = () => { const u = {}; UP_IDS.forEach((k) => (u[k] = 3)); return u; };
  const maxCost = (value) => UP_IDS.reduce((s, k) => s + upgradeCost(value, k, 3), 0);

  window.Balance = { UP_IDS, applyUp, pace, rating, tier, partTier, upgradeCost, partCost, cashMul, deathMul, deathKeep, earnPerAttempt, WIN_RATE, levelIncome, income, CAREER, cheapestUp, maxUp, maxCost };
})();
