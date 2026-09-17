// Level generator settings: difficulty curve, unlocks per level, countdown tips
(function () {
  const DISTRICTS = ['ОУШЕН-ДРАЙВ', 'ЛІТЛ-ГАВАНА', 'ВАЙНВУД', 'ДАУНТАУН', 'СТАРФІШ-АЙЛЕНД', 'ПОРТ МАЯМІ', 'ВАШИНГТОН-БІЧ', 'ЛІТЛ-ГАЇТІ', 'ДОКИ', 'КІ-БІСКЕЙН'];
  const UNLOCKS = {
    1: 'НАВЧАННЯ',
    2: 'ПЕРШИЙ ВИЇЗД',
    3: 'СУПЕРНИК',
    4: 'НЕОНОВА ТРАСА',
    5: 'КОПИ І ПЛАТФОРМИ',
    7: 'ДВІ БАНДИ',
    8: 'ТУНЕЛІ',
    10: 'ПОДВІЙНИЙ ПАТРУЛЬ',
    15: 'БЕЗ ОСТРОВІВ',
    20: 'ВЕРТОЛІТ',
  };
  const TIPS = {
    1: ['ТВОЯ МАШИНА ЇДЕ САМА', 'ТВОЯ СПРАВА - БУДУВАТИ ДОРОГУ'],
    2: ['ТАП ПО БЛОКУ В ПАНЕЛІ - ПОВОРОТ', 'БЛОК СТАВИТЬСЯ ПОВЕРХ БУДЬ-ЯКОГО БЛОКУ', 'ДОВГІ ОСТРОВИ З ВІРАЖАМИ - БЕЗПЕЧНІ', '3 БАЛОНИ = НІТРО X3'],
    3: ['НОВИЙ СУПЕРНИК!', 'ПЕРЕМАГАЄ ТОЙ, У КОГО БІЛЬШЕ ГРОШЕЙ', 'ФІНІШ: +1000 / +500 / +200'],
    4: ['БЛОКІВ НЕМАЄ - МАЛЮЙ ДОРОГУ ПАЛЬЦЕМ', 'ФАРБИ НА 5 КОРПУСІВ, БАЛОН = +20%', 'ЛІНІЯ ЛЯГАЄ ПОВЕРХ ЧОГО ЗАВГОДНО', 'АЛЕ ГРОШІ Й БАЛОНИ ПІД НЕЮ ЗГОРЯТЬ'],
    5: ['ЗА ТОБОЮ КОПИ! ДОТИК - ШТРАФ $50', 'ЗЕЛЕНІ ПЛАТФОРМИ ТЯГНИ ВГОРУ/ВНИЗ', 'НЕМАЄ ГРОШЕЙ - АРЕШТ'],
    7: ['ТЕПЕР ДВІ БАНДИ-СУПЕРНИЦІ', 'ПЕРЕМАГАЄ НАЙБАГАТШИЙ'],
    8: ['У КОЖНОГО СВІЙ ТУНЕЛЬ', 'У СТІНІ БРАКУЄ 1-2 ФІГУР - ВСТАВ ЇХ', 'ПОВНИЙ СТОВПЧИК ЗНИКАЄ, ПРОХІД ВІДКРИТО'],
    10: ['ДРУГА ПАТРУЛЬНА МАШИНА', 'ДОТИК - ШТРАФ $50, БЕЗ ГРОШЕЙ - АРЕШТ'],
    15: ['ОСТРОВІВ БЕЗПЕКИ БІЛЬШЕ НЕМАЄ', 'ВСЯ ДОРОГА - ТВОЯ'],
    20: ['ПОЛІЦЕЙСЬКИЙ ВЕРТОЛІТ!', 'ВІН ПІРНАЄ І ЗБИВАЄ МАШИНИ', 'КРІЗЬ НЬОГО БЛОКИ НЕ СТАВЛЯТЬСЯ'],
  };
  const GENERIC = ['ВИКЛАДАЙ ДОРОГУ ЗАЗДАЛЕГІДЬ!', 'ПОМИЛИВСЯ? СТАВ БЛОК ПОВЕРХ СТАРОГО', 'БЛОК ПОВЕРХ ГРОШЕЙ ЧИ НІТРО ЇХ ЗНИЩИТЬ'];
  const NEON_TIPS = ['НЕОНОВА ТРАСА: МАЛЮЙ ДОРОГУ ПАЛЬЦЕМ', 'ЛІНІЯ ЇСТЬ ФАРБУ - БАЛОН ДАЄ +20%', 'ЛІНІЯ ПОВЕРХ ГРОШЕЙ ЧИ БАЛОНА ЇХ ПАЛИТЬ', 'РОЗБИВСЯ БЕЗ ФАРБИ? ПОВЕРНУТЬ ПІВБАКА'];

  // neon levels: the 4th, then every fifth one
  const isNeon = (n) => n >= 4 && (n - 4) % 5 === 0;
  // tunnel levels: the 8th, then every fifteenth one - they never land on a neon level
  const isTunnel = (n) => n >= 8 && (n - 8) % 15 === 0;
  // Bonus run: every sixth level. 8 + 15k is never a multiple of six, so it never lands on a
  // tunnel; it does land on a neon level every thirty (24, 54, ...), and that is no clash -
  // the bonus run alternates between the two mechanics anyway, and takes the brush on those.
  const isBonus = (n) => n >= 6 && n % 6 === 0;
  const bonusPaints = (n) => isNeon(n) || (n / 6) % 2 === 0;
  const BONUS_TIPS = ['САМ ПРОТИ ВСІЄЇ ПОЛІЦІЇ МАЯМІ', 'ФІНІШУ НЕМАЄ - ЗБИРАЙ, ПОКИ ЇДЕШ', 'ЗАТРИМАЛИ - ЗАЇЗД ЗАКІНЧЕНО'];
  const TUNNEL_TIPS = ['ТРИ ТУНЕЛІ - У КОЖНОГО СВІЙ', 'У СТІНІ БРАКУЄ 1-2 ФІГУР', 'ЗАПОВНИВ СТОВПЧИК - ВІН ЗНИК'];

  // Tunnel difficulty peaks on the twentieth tunnel level, and is driven by three things:
  // how many walls a tunnel holds, how often one is missing two pieces, and how much run-up
  // there is between walls. The run-up is set in SECONDS at the player's own top speed, so a
  // tuned car gets a proportionally longer level instead of less time to think.
  function tunnelCfg(n) {
    const d = Math.min(20, Math.round((n - 8) / 15)), k = d / 20;
    const top = (window.Profile && Profile.topSpeed ? Profile.topSpeed() : 0) || 140;
    const sec = [4.6 - 1.9 * k, 6.4 - 2.6 * k];          // 4.6-6.4 s of warning, 2.7-3.8 s at the peak
    const cell = (s) => Math.max(6, Math.round((s * top) / 16));
    const gap = [cell(sec[0]), cell(sec[1])];
    const walls = Math.round(6 + d * 0.9);
    return {
      d, top, sec, gap, walls,
      two: 0.1 + 0.5 * k,      // chance a wall is missing two pieces instead of one
      nitro: true,
      cols: Math.min(1100, 70 + walls * Math.round((gap[0] + gap[1]) / 2)),
    };
  }

  // paint economy: a full tank is about 4.5 car bodies of line, one can is a fifth of it.
  // waste is how much longer than the bare gap a real player's line ends up, floor is the
  // reserve the generator never lets the tank fall below - that is the room for mistakes.
  function paintCfg(n) {
    const d = Math.min(3, Math.round((n - 4) / 5)); // 0 on level 4, harder later
    return {
      max: 144,                          // a full tank is about 4.5 car bodies of line
      can: 0.2,                          // one can refills a fifth of it
      waste: [1.8, 1.7, 1.6, 1.5][d],    // paint a hand drawn bridge really eats, vs the bare gap
      retry: [1.55, 1.45, 1.35, 1.3][d], // tank before every gap: that many bridges, so a botched
      gap: [2, d >= 2 ? 3 : 2],          // one still leaves enough to reach the safety island
      rise: 1 + Math.min(1, d),
      ledge: [9 - d, 15 - d],
    };
  }

  // force ('blocks' | 'neon' | 'tunnel') pins the mechanic: that is how a free ride asks for
  // one mechanic at the difficulty of the level number it is given.
  function config(n, force) {
    n = Math.max(1, Math.floor(n || 1));
    if (n === 1 && !force) {
      return {
        n, name: UNLOCKS[1], tutorial: true, cols: 72, gap: { col: 28, len: 4, row: 9 },
        rivals: 0, police: 0, platforms: false, heli: false, nitro: false, islands: [0, 0], trapGap: 0,
        bonus: [300], winBonus: 0, ai: null, policeSpeed: 1, tips: TIPS[1], cash: 1,
      };
    }
    // every level is a bit longer
    const cols = Math.min(640, 300 + (n - 2) * 10);
    const field = cols - 52;
    // safety islands: 5 of them covering a quarter of the field on level 2, fewer and shorter until level 15
    const k = Math.max(0, (15 - n) / 13);
    const count = k > 0 ? Math.max(1, Math.round(5 * k)) : 0;
    const len = Math.max(6, Math.round((field / 20) * (0.4 + 0.6 * k)));
    const bonus = !force && isBonus(n);
    const neon = force ? force === 'neon' : isNeon(n) || (bonus && bonusPaints(n));
    const tun = force ? force === 'tunnel' : isTunnel(n);
    const T = tun ? tunnelCfg(n) : null;
    // a neon level is always one on one: the paint is challenge enough.
    // a tunnel level is always three cars, because there are three tunnels
    // a bonus run is one car against the whole police force, and it never ends on its own
    const rivals = bonus ? 0 : tun ? 2 : neon ? 1 : n >= 7 ? 2 : n >= 3 ? 1 : 0;
    const cash = Balance.cashMul(n), scale = (v) => Math.round((v * cash) / 10) * 10;
    if (bonus) {
      const b = n / 6;
      return {
        cash: 1, n, rivals: 0, bonusRun: true, endless: true, loot: true,
        cols: 3000, chunk: 1200,
        draw: neon, paint: neon ? paintCfg(Math.max(4, n)) : null, tunnel: null,
        name: 'БОНУСНИЙ ЗАЇЗД', tutorial: false,
        islands: neon ? [8, 14] : [7, 12],
        police: Math.min(6, 4 + b), policeX: [150, 60, 900, 1900, 2900, 4100],
        platforms: true, heli: 2, nitro: true,
        trapGap: Math.max(40, 80 - n * 2),
        bonus: [0], winBonus: 0,
        ai: { delay: 0.6, mistake: 0.05 },
        policeSpeed: Math.min(1.2, 0.9 + b * 0.03),
        tips: BONUS_TIPS,
      };
    }
    return {
      cash,
      n, cols: tun ? T.cols : cols, rivals,
      draw: neon,
      paint: neon ? paintCfg(n) : null,
      tunnel: T,
      name: UNLOCKS[n] || DISTRICTS[(n - 7) % DISTRICTS.length],
      tutorial: false,
      islands: neon ? [Math.max(2, count), Math.max(10, len)] : [count, count ? len : 0],
      // no cops, platforms or helicopter in the tunnels: the walls are the whole job there
      police: tun ? 0 : neon ? (n >= 9 ? 1 : 0) : n >= 10 ? 2 : n >= 5 ? 1 : 0,
      platforms: n >= 5 && !tun,
      heli: n >= 20 && !tun ? 1 : 0,
      nitro: true,
      trapGap: Math.max(34, 80 - n * 3),
      bonus: (rivals ? [1000, 500, 200] : [600]).map(scale),
      winBonus: rivals ? scale(500) : 0,
      ai: { delay: Math.max(0.45, 0.72 - (n - 3) * 0.015), mistake: Math.max(0.03, 0.1 - (n - 3) * 0.004) },
      policeSpeed: Math.min(1.15, 0.8 + Math.max(0, n - 4) * 0.02),
      tips: TIPS[n] || (neon ? NEON_TIPS : tun ? TUNNEL_TIPS : GENERIC),
    };
  }

  // Blacklist duel: the gate level's layout, one on one, no police; first to the finish takes the car
  function boss(r) {
    const L = config(r.gate);
    return Object.assign({}, L, {
      boss: r, rivals: 1, police: 0, heli: false, platforms: true, draw: false, paint: null, tunnel: null,
      name: 'ЧОРНИЙ СПИСОК #' + r.rank,
      bonus: [Math.round((1500 * L.cash) / 10) * 10, 0], winBonus: 0,
      ai: { delay: +(0.55 - 0.012 * r.i).toFixed(3), mistake: +(0.06 - 0.0025 * r.i).toFixed(4), look: 1.7 },
      tips: [r.nick + ': ' + r.taunt, 'ПЕРШИЙ НА ФІНІШІ ЗАБИРАЄ ТАЧКУ'],
    });
  }

  // free ride: each mechanic keeps its own counter, and level k of a mechanic is played at
  // the difficulty of the campaign level where that mechanic's k-th outing would have been
  const FREE = {
    blocks: { name: 'БЛОКИ', icon: 'flag', gate: 2, at: (k) => 2 + k },
    neon: { name: 'НЕОН', icon: 'spray', gate: 4, at: (k) => 4 + (k - 1) * 5 },
    tunnel: { name: 'ТУНЕЛІ', icon: 'garage', gate: 8, at: (k) => 8 + (k - 1) * 15 },
  };
  const freeConfig = (mode, k) => Object.assign(config(FREE[mode].at(Math.max(1, k)), mode), {
    free: mode, freeLevel: Math.max(1, k), name: FREE[mode].name + ' ' + Math.max(1, k),
  });

  window.Levels = { config, boss, isNeon, isTunnel, isBonus, FREE, freeConfig };
})();
