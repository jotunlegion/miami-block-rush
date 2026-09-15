// Level generator settings: difficulty curve, unlocks per level, countdown tips
(function () {
  const DISTRICTS = ['ОУШЕН-ДРАЙВ', 'ЛІТЛ-ГАВАНА', 'ВАЙНВУД', 'ДАУНТАУН', 'СТАРФІШ-АЙЛЕНД', 'ПОРТ МАЯМІ', 'ВАШИНГТОН-БІЧ', 'ЛІТЛ-ГАЇТІ', 'ДОКИ', 'КІ-БІСКЕЙН'];
  const UNLOCKS = {
    1: 'НАВЧАННЯ',
    2: 'ПЕРШИЙ ВИЇЗД',
    3: 'СУПЕРНИК',
    4: 'КОПИ НА ХВОСТІ',
    5: 'РУХОМІ ПЛАТФОРМИ',
    6: 'ДВІ БАНДИ',
    8: 'ПОДВІЙНИЙ ПАТРУЛЬ',
    15: 'БЕЗ ОСТРОВІВ',
    20: 'ВЕРТОЛІТ',
  };
  const TIPS = {
    1: ['ТВОЯ МАШИНА ЇДЕ САМА', 'ТВОЯ СПРАВА - БУДУВАТИ ДОРОГУ'],
    2: ['ТАП ПО БЛОКУ В ПАНЕЛІ - ПОВОРОТ', 'БЛОК СТАВИТЬСЯ ПОВЕРХ СВОГО ЧИ ЧУЖОГО', 'ДОВГІ ОСТРОВИ З ВІРАЖАМИ - БЕЗПЕЧНІ', '3 БАЛОНИ = НІТРО X3'],
    3: ['НОВИЙ СУПЕРНИК!', 'ПЕРЕМАГАЄ ТОЙ, У КОГО БІЛЬШЕ ГРОШЕЙ', 'ФІНІШ: +1000 / +500 / +200'],
    4: ['ЗА ТОБОЮ КОПИ!', 'ДОТИК ПОЛІЦІЇ - ШТРАФ $50', 'НЕМАЄ ГРОШЕЙ - АРЕШТ'],
    5: ['ЗЕЛЕНІ ПЛАТФОРМИ ТЯГНИ ВГОРУ/ВНИЗ', 'ВОНИ НЕ ВИТРАЧАЮТЬ БЛОКИ'],
    6: ['ТЕПЕР ДВІ БАНДИ-СУПЕРНИЦІ', 'ПЕРЕМАГАЄ НАЙБАГАТШИЙ'],
    8: ['ДРУГА ПАТРУЛЬНА МАШИНА', 'ДОТИК - ШТРАФ $50, БЕЗ ГРОШЕЙ - АРЕШТ'],
    15: ['ОСТРОВІВ БЕЗПЕКИ БІЛЬШЕ НЕМАЄ', 'ВСЯ ДОРОГА - ТВОЯ'],
    20: ['ПОЛІЦЕЙСЬКИЙ ВЕРТОЛІТ!', 'ВІН ПІРНАЄ І ЗБИВАЄ МАШИНИ', 'КРІЗЬ НЬОГО БЛОКИ НЕ СТАВЛЯТЬСЯ'],
  };
  const GENERIC = ['ВИКЛАДАЙ ДОРОГУ ЗАЗДАЛЕГІДЬ!', 'ПОМИЛИВСЯ? СТАВ БЛОК ПОВЕРХ СТАРОГО', 'ДОТИК ПОЛІЦІЇ - ШТРАФ $50'];

  function config(n) {
    n = Math.max(1, Math.floor(n || 1));
    if (n === 1) {
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
    const rivals = n >= 6 ? 2 : n >= 3 ? 1 : 0;
    const cash = Balance.cashMul(n), scale = (v) => Math.round((v * cash) / 10) * 10;
    return {
      cash,
      n, cols, rivals,
      name: UNLOCKS[n] || DISTRICTS[(n - 7) % DISTRICTS.length],
      tutorial: false,
      islands: [count, count ? len : 0],
      police: n >= 8 ? 2 : n >= 4 ? 1 : 0,
      platforms: n >= 5,
      heli: n >= 20,
      nitro: true,
      trapGap: Math.max(34, 80 - n * 3),
      bonus: (rivals ? [1000, 500, 200] : [600]).map(scale),
      winBonus: rivals ? scale(500) : 0,
      ai: { delay: Math.max(0.45, 0.72 - (n - 3) * 0.015), mistake: Math.max(0.03, 0.1 - (n - 3) * 0.004) },
      policeSpeed: Math.min(1.15, 0.8 + Math.max(0, n - 4) * 0.02),
      tips: TIPS[n] || GENERIC,
    };
  }

  // Blacklist duel: the gate level's layout, one on one, no police; first to the finish takes the car
  function boss(r) {
    const L = config(r.gate);
    return Object.assign({}, L, {
      boss: r, rivals: 1, police: 0, heli: false, platforms: true,
      name: 'ЧОРНИЙ СПИСОК #' + r.rank,
      bonus: [Math.round((1500 * L.cash) / 10) * 10, 0], winBonus: 0,
      ai: { delay: +(0.55 - 0.012 * r.i).toFixed(3), mistake: +(0.06 - 0.0025 * r.i).toFixed(4), look: 1.7 },
      tips: [r.nick + ': ' + r.taunt, 'ПЕРШИЙ НА ФІНІШІ ЗАБИРАЄ ТАЧКУ'],
    });
  }

  window.Levels = { config, boss };
})();
