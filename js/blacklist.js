// Blacklist career: 20 rivals ranked #20 -> #1, their pink-slip cars, portraits and stories.
// Car stats are generated from the career curve in balance.js so the numbers stay consistent.
(function () {
  const B = Balance, C = B.CAREER;

  // arch: tweaks on top of the rank baseline (accel/armor are multipliers, launch/hill/air are offsets)
  const ROSTER = [
    {
      nick: 'БАБЛГАМ', name: 'ЛОЛА РЕЙЕС', gang: 0,
      story: ['НАЙМОЛОДША У СПИСКУ, ЇЙ 19.', 'ЇЇ РОЗОВИЙ КОМПРЕСОР ЧУТИ', 'ЗА ТРИ КВАРТАЛИ ВІД ЛІТЛ-ГАВАНИ.'],
      taunt: 'ЖУЙКА ЩЕ НЕ ВСТИГНЕ ЛОПНУТИ!', lose: 'ОК... АЛЕ ЦЕ БУВ МІЙ УЛЮБЛЕНИЙ КОЛІР.',
      portrait: { fem: true, skin: 'tan', face: 'round', hair: { style: 'bob', c: '#ff5cb8' }, eye: '#5a2a8a', lips: '#ff3e8a', makeup: '#29e0d0', cloth: { style: 'tank', c: '#29e0d0' }, acc: ['hoops'], expr: 'grin', bg: ['#3d1066', '#ff7cc6'], motif: 'sun', rim: '#29e0d0' },
      car: {
        name: 'SUGAR RUSH', year: 1987, desc: 'ЦУКЕРКОВИЙ ХОТ-ХЕТЧ З КОМПРЕСОРОМ', paint: '#ff7cc6', accent: '#fff1c9', rims: 'white', wheelX: [-10, 10], wheelY: 4,
        arch: { accel: 1.1, armor: 0.8, mass: 0.7 },
        rows: [
          '....................................',
          '...........KKKKKKKKKK...............',
          '..........KhhhhhhhhhhK...KKK........',
          '.........KgGGGGGwgGGGGK.KCCCK.......',
          '........KgGGGGGGwgGGGGGKKCcCK.......',
          '..KKKKKKhhhhhhhhhhhhhhhhhhKCKKKKKK..',
          '.KRhhhBBBBBBBBBBBBBBBBBBBBBBBBBBBLK.',
          '.KRBBBBSSSSBBBBBBBBBBBBSSSSBBBBBBBOK',
          '.KBBBBSSSSSSBBBBBBBBBBSSSSSSBBBBBBBK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK.',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
        ],
      },
    },
    {
      nick: 'ДОК', name: 'МАРКУС ВЕЙН', gang: 1,
      story: ['КОЛИШНІЙ МЕХАНІК ПОЛІЦІЇ.', 'ЗІБРАВ ЦЕЙ РАТ-РОД З ТРЬОХ', 'КОНФІСКОВАНИХ ДВИГУНІВ.'],
      taunt: 'Я ЧУЮ, ЯК СТУКАЄ ТВІЙ КЛАПАН.', lose: 'ДОБРЕ. ТОЧНО ДОБРЕ ЗІБРАНО.',
      portrait: { skin: 'light', face: 'square', hair: { style: 'buzz', c: '#6a4a3a' }, eye: '#3a5a7a', cloth: { style: 'racing', c: '#4a6a8a', c2: '#ffc31f' }, acc: ['stubble', 'cig'], expr: 'smirk', bg: ['#141a3a', '#4a6aa8'], motif: 'grid', rim: '#ffc31f' },
      car: {
        name: 'RATCHET V8', year: 1979, desc: 'РАТ-РОД З ГОЛИМ ДВИГУНОМ', paint: '#9a5a3a', accent: '#24202e', rims: 'black', wheelX: [-10, 10], wheelY: 4,
        arch: { accel: 1.15, armor: 1.1, hill: 0.05, mass: 0.95 },
        rows: [
          '....................................',
          '.........KKKKKKKK...................',
          '........KhhhhhhhhK......K.K.K.......',
          '.......KTgGGGwgGTK.....KCKCKCK......',
          '.......KTgGGGGwgTK....KCCCCCCCK.....',
          '..KKKKKKhhhhhhhhhKKKKKKCcCcCcCKKK...',
          '.KRBBBBBBBBBBBBBBBBBBBKVVVVVVVVVLK..',
          '.KRBBBBBBBBBBBBBBBBBBBKTTTTTTTTTTOK.',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK.',
          '.KCccccccccccccccccccccccccccccccCK.',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
        ],
      },
    },
    {
      nick: 'КОБРА', name: 'ДЖЕССІ КІМ', gang: 2,
      story: ['КОРОЛЕВА НІЧНИХ ДРЕГІВ У ДОКАХ.', 'НІКОЛИ НЕ ГАЛЬМУЄ ПЕРШОЮ', 'І НІКОЛИ НЕ ПРОБАЧАЄ.'],
      taunt: 'ШШШ... ТИ ВЖЕ ОТРУЄНИЙ.', lose: 'ЦЕЙ УКУС Я ЗАПАМ\'ЯТАЮ.',
      portrait: { fem: true, skin: 'pale', face: 'soft', hair: { style: 'long', c: '#24202e', streak: '#6aff5a' }, eye: '#3a2a2a', lips: '#a8204a', makeup: '#6aff5a', cloth: { style: 'leather', c: '#2a2238' }, acc: ['choker', 'studs'], expr: 'smirk', bg: ['#0e2a1a', '#3aa86a'], motif: 'grid', rim: '#6aff5a' },
      car: {
        name: 'VENOM GT', year: 1988, desc: 'ДОВГИЙ КАПОТ І ОТРУЙНИЙ V12', paint: '#1f5a3c', accent: '#6aff5a', rims: 'black', wheelX: [-11, 10], wheelY: 4,
        arch: { accel: 1.05, launch: 0.02 },
        rows: [
          '....................................',
          '..............KKKKKKK...............',
          '...........KKKhhhhhhhKK.............',
          '.........KKhhhgGGGGGGwgK............',
          '.....KKKKhhhhhgGGGGGGGGwgKKKKKK.....',
          '...KKhhhhhhhhhhhBBBBBBBBBBhhhhhhKKK.',
          '..KRBBBBSSSBBBBBBBBBBBBBBBBBBBBBBBLK',
          '.KRBBBBBBSSSBBBBBBBBBBBBBBBBSSSSBBOK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '.KCCCCCCCCCCCCCCCCdddddddddddddddddK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ФЛАМІНГО', name: 'СОННІ КАСТРО', gang: 0,
      story: ['ВЛАСНИК НАЙГУЧНІШОГО КЛУБУ', 'НА ОУШЕН-ДРАЙВ. ЇЗДИТЬ ТАК,', 'ЯК ТАНЦЮЄ - З ПІДКРУТКОЮ.'],
      taunt: 'ПОСМІХНИСЬ, ТЕБЕ ЗНІМАЮТЬ!', lose: 'МУЗИКА СКІНЧИЛАСЬ, АМІГО.',
      portrait: { skin: 'tan', face: 'square', hair: { style: 'slick', c: '#24202e', vol: 3 }, eye: '#6a3a1a', cloth: { style: 'hawaiian', c: '#ff3ea5', c2: '#ffe27a' }, acc: ['shades', 'chain'], accC: '#ff7cc6', expr: 'grin', bg: ['#621676', '#ff9a52'], motif: 'sun', rim: '#ff7cc6' },
      car: {
        name: 'FLAMINGO 58', year: 1958, desc: 'РАКЕТНІ ПЛАВЦІ Й ХРОМ', paint: '#ff3ea5', accent: '#f2eefa', rims: 'chrome', wheelX: [-10, 10], wheelY: 4,
        arch: { air: -0.03, launch: 0.03, armor: 0.95, mass: 0.9 },
        rows: [
          '.KK.................................',
          '.KhK................................',
          '.KhhK.........KKKKKKK...............',
          '.KhBhK......KKwGGGGGGKK.............',
          '.KhBBhK...KKgGGGGGGGGGwK............',
          '.KhBBBhKKKhhhhhhhhhhhhhhhKKKKKKK....',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBhKK.',
          '.KRSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSLK',
          '.KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBOK',
          '.KCccccccccccccccccccccccccccccccCCK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ХОЛОДНА', name: 'ІНГРІД СВАН', gang: 2,
      story: ['ЧЕМПІОНКА ЗИМОВОГО РАЛІ.', 'У МАЯМІ ЇЙ ЗАНАДТО ЖАРКО -', 'І ЦЕ ТВОЯ ПРОБЛЕМА.'],
      taunt: 'ТВОЇ ШАНСИ ТАНУТЬ.', lose: 'ХМ. МЕНІ ПОТРІБЕН ЛІД.',
      portrait: { fem: true, skin: 'pale', face: 'long', hair: { style: 'bob', c: '#e6ecf5', fringe: 'side' }, eye: '#3aa7e0', lips: '#b0506a', makeup: '#9cc4ff', cloth: { style: 'fur', c: '#b9bfcc', c2: '#f2eefa' }, acc: ['choker'], expr: 'neutral', bg: ['#14244a', '#9cc4ff'], motif: 'stars', rim: '#9fdcff' },
      car: {
        name: 'GLACIER', year: 1984, desc: 'БІЛИЙ КЛИН ЗІ СКАНДИНАВСЬКОЇ ТРАСИ', paint: '#f2eefa', accent: '#5cc8ff', rims: 'white', wheelX: [-10, 10], wheelY: 4,
        arch: { hill: 0.08 },
        rows: [
          '....................................',
          '....................................',
          '..............KKKKKK................',
          '...........KKKhhhhhhKK..............',
          '.........KKhhgGGGGGGwwKK............',
          '.KKKKKKKKhhhhgGGGGGGGGGwwKKKK.......',
          '.KRhhhhhhhhhhhBBBBBBBBBBBBBhhhhKKK..',
          '.KRBBBBBBVVVVBBBBBBBBBBBBBBBBBBBhhKK',
          '.KBBBBBBBBVVVBBBBBBBBBBBBBBBBBBBBBLK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ДЖИНКС', name: 'ТАРА БЛУМ', gang: 1,
      story: ['ХАКЕРКА З АРКАДНОГО ЗАЛУ.', 'ЇЇ КЕЙ-КАР ЗЛАМАНИЙ У ВСІ', 'БОКИ ОДРАЗУ. І ЦЕ ПРАЦЮЄ.'],
      taunt: 'ГЕЙМ ОВЕР, НУБЕ!', lose: 'ПЕРЕЗАВАНТАЖЕННЯ... ЧЕСНА ГРА.',
      portrait: { fem: true, skin: 'light', face: 'round', hair: { style: 'twintails', c: '#29e0b0' }, eye: '#8a2a6a', lips: '#ff5c7a', makeup: '#ff3ea5', cloth: { style: 'hoodie', c: '#ff3ea5', c2: '#ffffff' }, acc: ['bandaid', 'studs'], expr: 'grin', bg: ['#2a0f4a', '#29e0b0'], motif: 'grid', rim: '#ffe27a' },
      car: {
        name: 'PIXEL PUNK', year: 1990, desc: 'БОСОДЗОКУ-КЕЙ ЗІ СПИСАМИ ВИХЛОПІВ', paint: '#29e0b0', accent: '#ff3ea5', rims: 'pink', wheelX: [-10, 10], wheelY: 4,
        arch: { accel: 1.2, armor: 0.8, mass: 0.65 },
        rows: [
          'CK..................................',
          '.CK.................................',
          '..CK......KKKKKKKKKKKK..............',
          '...CK....KhhhhhhhhhhhhK.............',
          '....CK..KgGGGGwTgGGGGGwK............',
          '.....CKKhGGGGGwTgGGGGGGwKKKKKKK.....',
          '.KKKKKhhhhhhhhhhhhhhhhhhhhhhhhhKK...',
          '.KRSSBBBBBBBBBBBBBBBBBBBBBBBBBBBLK..',
          '.KRSSBBBBSSBBBBSSBBBBSSBBBBBBBBBBOK.',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK.',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
        ],
      },
    },
    {
      nick: 'ТАНК', name: 'БРУНО ГАШ', gang: 0,
      story: ['ВИШИБАЛА З КАЗИНО. ЙОГО ТАЧКА', 'ПЕРЕЖИЛА ДВА ТАРАНИ КОПІВ', 'І ОДНЕ ПАДІННЯ З МОСТУ.'],
      taunt: 'ЗІЙДИ З ДОРОГИ. АБО ЛЯЖЕШ.', lose: 'МІЦНО. ПОВАЖАЮ.',
      portrait: { skin: 'brown', face: 'square', hair: { style: 'bald', c: '#1a1010' }, eye: '#3a2a1a', cloth: { style: 'tank', c: '#b9bfcc' }, acc: ['beard', 'chain', 'scar'], expr: 'neutral', bg: ['#3a1010', '#d8203a'], motif: 'grid', rim: '#ffc31f' },
      car: {
        name: 'BULLDOZER', year: 1985, desc: 'БРОНЬОВАНИЙ ПІКАП З ТАРАНОМ', paint: '#4a4a5e', accent: '#ffc31f', rims: 'black', wheelX: [-10, 10], wheelY: 4,
        arch: { armor: 1.6, accel: 0.9, mass: 1.2, restComp: 3 },
        rows: [
          '..........KKKKKKKKKKKKK.............',
          '..........KOROROROROROK.............',
          '.........KKhhhhhhhhhhhKK............',
          '........KTgGGGGTTgGGGGGTK...........',
          '.......KTTgGGGGTTgGGGGGGTK..........',
          '.KKKKKKhhhhhhhhhhhhhhhhhhhhKKKKKKK..',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKK',
          '.KRBtBBBBtBBBBtBBBBtBBBBtBBBBtBBBLCK',
          '.KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBCK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbCK',
          '.KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTCCK',
          '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
        ],
      },
    },
    {
      nick: 'МАДАМ', name: 'ВЕРОНІКА ДЕЛЬ РЕЙ', gang: 2,
      story: ['ТРИМАЄ ВСІ АУКЦІОНИ ВАЙНВУДА.', 'ТІ, ХТО ЇЙ ПРОГРАЄ, ПЛАТЯТЬ', 'НЕ ГРОШИМА, А ТАЧКАМИ.'],
      taunt: 'ЯКА МИЛА МАЛЕНЬКА СТАВКА.', lose: 'МАДАМ НЕ ПЛАЧЕ. МАДАМ ЗАПИСУЄ.',
      portrait: { fem: true, skin: 'light', face: 'long', hair: { style: 'perm', c: '#d8203a' }, eye: '#3a7a3a', lips: '#d8203a', makeup: '#8a3be8', cloth: { style: 'fur', c: '#8a3be8', c2: '#f2eefa' }, acc: ['hoops', 'mole'], expr: 'smirk', bg: ['#2a0a2a', '#8a3be8'], motif: 'stars', rim: '#ffc31f' },
      car: {
        name: 'VELVET 900', year: 1971, desc: 'ЛАКШЕРІ-КУПЕ З ЗОЛОТИМ ХРОМОМ', paint: '#8a3be8', accent: '#ffc31f', rims: 'gold', wheelX: [-11, 11], wheelY: 4,
        fixed: { Q: '#ffc31f', q: '#a86a10' },
        arch: { armor: 1.2, accel: 0.95, mass: 1.05 },
        rows: [
          '....................................',
          '....................................',
          '.........KKKKKKKKK..................',
          '.......KKhhhhhhhhhK.................',
          '......KgGGGGGGwgGGGK................',
          '..KKKKgGGGGGGGGwgGGGKKKKKKKKKKKKKK..',
          '.KKhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhKK',
          '.KRSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSLK',
          '.KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBOK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ГРІМ', name: 'ДЖОННІ МОРГАН', gang: 1,
      story: ['ВОДИВ КАТАФАЛК ДЛЯ МАФІЇ.', 'ТЕПЕР НА НЬОМУ СТОЇТЬ', 'НАГНІТАЧ ВІД ДРЕГСТЕРА.'],
      taunt: 'Я ВЖЕ ЗАМОВИВ ТОБІ КВІТИ.', lose: 'ЦЬОГО РАЗУ ПОХОВАЛИ МЕНЕ.',
      portrait: { skin: 'pale', face: 'long', hair: { style: 'long', c: '#1a1424', len: 42 }, eye: '#8a2a2a', cloth: { style: 'leather', c: '#1a1424' }, acc: ['eyeliner', 'studs'], expr: 'neutral', bg: ['#0a0a14', '#4a3a5e'], motif: 'stars', rim: '#ff2a3a' },
      car: {
        name: 'REAPER', year: 1969, desc: 'КАТАФАЛК-ДРЕГСТЕР З НАГНІТАЧЕМ', paint: '#4a2a44', accent: '#ff2a3a', rims: 'chrome', wheelX: [-11, 11], wheelY: 4,
        arch: { accel: 1.25, armor: 1.1, launch: -0.02 },
        rows: [
          '...................KKKKK............',
          '..................KCCCCCK...........',
          '..KKKKKKKKKKKKKKKKKCcCcCKK..........',
          '..KhhhhhhhhhhhhhhhKKCCCKhhK.........',
          '..KBBCBBCBBBBBgGGGGGwKKgGGwK........',
          '..KBBBCCBBBBBBgGGGGGGwgGGGGwKKKKKK..',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKK',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLK',
          '.KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBOK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'САКУРА', name: 'ЮКІ ТАНАКА', gang: 0,
      story: ['ПРИЛЕТІЛА З ТОКІО З ОДНИМ', 'ЧЕМОДАНОМ І ОДНІЄЮ МЕТОЮ -', 'СТАТИ ПЕРШОЮ У СПИСКУ.'],
      taunt: 'ОДИН ЗАЇЗД. ОДНА ПРАВДА.', lose: 'СИЛЬНО. Я ПОВЕРНУСЯ.',
      portrait: { fem: true, skin: 'light', face: 'soft', hair: { style: 'ponytail', c: '#24202e' }, eye: '#3a2a2a', lips: '#ff5c7a', makeup: '#ff7cc6', cloth: { style: 'racing', c: '#f2eefa', c2: '#d8203a' }, acc: ['headband'], accC: '#d8203a', expr: 'smile', bg: ['#3a0f2a', '#ff7cc6'], motif: 'sun', rim: '#ff3ea5' },
      car: {
        name: 'KAMIKAZE R', year: 1993, desc: 'JDM-МОНСТР З ВЕЛИЧЕЗНИМ КРИЛОМ', paint: '#f2eefa', accent: '#d8203a', rims: 'black', wheelX: [-10, 10], wheelY: 4, wing: [0, 0, 9, 4],
        arch: { hill: 0.06, launch: 0.02 },
        rows: [
          '.KKKKKKKK...........................',
          '.KhhhhhhK.....KKKKKKKK..............',
          '...K..K.....KKhhhhhhhhKK............',
          '...K..K...KKhgGGGGGGGGwgK...........',
          '.KKKKKKKKKhhhgGGGGGGGGGGwgKKKKK.....',
          '.KhhhhhhhhhhhhhBBBBBBBBBBBBhhhhhKK..',
          '.KRRBBBBBBBBBBBBBBBSSSBBBBBBBBBBBLK.',
          '.KRRBBBBBBBBBBBBBBSSSSSBBBBBBBBBBBOK',
          '.KbbbbbbbbbbbbbbbbbSSSbbbbbbbbbbbbVK',
          '.KdddddddddddddddddddddddddddddddVVK',
          '.KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK',
          '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
        ],
      },
    },
    {
      nick: 'ВОЛЬТ', name: 'НІКО СПАРК', gang: 2,
      story: ['ІНЖЕНЕР, ЯКОГО ВИГНАЛИ З НАСА.', 'ЙОГО ЕЛЕКТРОКАР ПЕРЕД СТАРТОМ', 'ГАСИТЬ ЛІХТАРІ НА ВСІЙ ВУЛИЦІ.'],
      taunt: 'ВІДЧУЙ НАПРУГУ!', lose: 'КОРОТКЕ ЗАМИКАННЯ...',
      portrait: { skin: 'light', face: 'square', hair: { style: 'mohawk', c: '#29e0d0' }, eye: '#2a6a8a', cloth: { style: 'racing', c: '#24202e', c2: '#29e0d0' }, acc: ['visor', 'studs'], accC: '#29e0d0', expr: 'grin', bg: ['#081a2a', '#1f8aa8'], motif: 'grid', rim: '#5cf0ff' },
      car: {
        name: 'VOLTAGE', year: 1995, desc: 'ЕЛЕКТРОБОЛІД ЗІ СВІТЛОВИМИ ЛІНІЯМИ', paint: '#1f2a4a', accent: '#5cf0ff', rims: 'cyan', wheelX: [-10, 10], wheelY: 4,
        fixed: { N: '#5cf0ff' },
        arch: { accel: 1.3, armor: 0.9 },
        rows: [
          '....................................',
          '....................................',
          '...............KKKKKK...............',
          '............KKKwwGGGGKK.............',
          '..........KKgGGGGGGGGGGKK...........',
          '.....KKKKKhhhhhhhhhhhhhhhhKKKKK.....',
          '...KKhhhhhhhhhhhhhhhhhhhhhhhhhhhKK..',
          '..KNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNK.',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KKNNNNNNNNNNNNNNNNNNNNNNNNNNNNNKK.',
          '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ПАНТЕРА', name: 'ЗУРІ АМАРА', gang: 1,
      story: ['ФОТОМОДЕЛЬ ВДЕНЬ, ПРИВИД ВНОЧІ.', 'ЇЇ ЧОРНИЙ ГІПЕРКАР ПОМІЧАЮТЬ,', 'ЛИШЕ КОЛИ ВЖЕ ПІЗНО.'],
      taunt: 'ТИ МЕНЕ НАВІТЬ НЕ ПОБАЧИШ.', lose: 'КІШКИ ЗАВЖДИ ПАДАЮТЬ НА ЛАПИ.',
      portrait: { fem: true, skin: 'dark', face: 'soft', hair: { style: 'afro', c: '#1a1010' }, eye: '#6a3a1a', lips: '#8a2a4a', makeup: '#ffc31f', cloth: { style: 'tank', c: '#24202e' }, acc: ['hoops', 'chain'], expr: 'smirk', bg: ['#1a0a1a', '#ffc31f'], motif: 'sun', rim: '#ffc31f' },
      car: {
        name: 'PANTHER X', year: 1996, desc: 'ЧОРНИЙ ГІПЕРКАР ІЗ ЗОЛОТИМИ ПЛЯМАМИ', paint: '#3a3050', accent: '#ffc31f', rims: 'gold', wheelX: [-10, 10], wheelY: 4,
        fixed: { Q: '#ffc31f' },
        arch: { launch: 0.04, air: -0.03 },
        rows: [
          '....................................',
          '...............KKKK.................',
          '.............KKhhhhKK...............',
          '...........KKhhgGGGGwKK.............',
          '.KK......KKhhhhgGGGGGGwgKKK.........',
          '.KhKKKKKKhhhhhhhBBBBBBBBBBBhhhhKKK..',
          '.KRhhBBBBBQBBBBBBBQBBBBBBQBBBBBBhKK.',
          '.KRBBBQBBBBBBQBBBBBBBQBBBBBBBVVVVLK.',
          '.KBBBBBBBBQBBBBBBQBBBBBBBQBBBBVVVVOK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'АДМІРАЛ', name: 'РІК СТОУН', gang: 0,
      story: ['КОНТРАБАНДИСТ З ПОРТУ. ЗРОБИВ', 'ТАЧКУ З КАТЕРА, ЯКОГО НЕ', 'ЗМОГЛА НАЗДОГНАТИ БЕРЕГОВА ОХОРОНА.'],
      taunt: 'ПОВНИЙ ВПЕРЕД!', lose: 'КОРАБЕЛЬ ТВІЙ, КАПІТАНЕ.',
      portrait: { skin: 'tan', face: 'square', hair: { style: 'slick', c: '#b9bfcc' }, eye: '#2a4a6a', cloth: { style: 'suit', c: '#f2eefa', c2: '#2a4fb8' }, acc: ['captain', 'mustache', 'scar'], expr: 'smirk', bg: ['#0a1a3a', '#2f7bff'], motif: 'stars', rim: '#ffffff' },
      car: {
        name: 'RIVIERA 900', year: 1966, desc: 'КАТЕР НА КОЛЕСАХ З ДЕРЕВ\'ЯНОЮ ПАЛУБОЮ', paint: '#f2eefa', accent: '#2a4fb8', rims: 'chrome', wheelX: [-10, 10], wheelY: 4,
        fixed: { W: '#b8743a', w: '#7a4424' },
        arch: { air: -0.05, launch: 0.05, armor: 1.1 },
        rows: [
          '....................................',
          '...RRK..............................',
          '...RRRK.............................',
          '...CK...................KKK.........',
          '...CK.................KKwwGK........',
          '.KKKKKKKKKKKKKKKKKKKKKwwGGGgKKK.....',
          '.KWwWWwWWwWWIIIIIIIWwWWwWWwWWWWKKK..',
          '.KCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCKK',
          '.KRhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhLK',
          '.KBBBBBBBBSSSSSSSSSSSSSSSSBBBBBBBBOK',
          '..KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ЛЕДІ ДІ', name: 'ДІАНА МОРО', gang: 2,
      story: ['СПАДКОЄМИЦЯ ЮВЕЛІРНОЇ ІМПЕРІЇ.', 'ЇЇ ТАЧКА ОБШИТА ЗОЛОТОМ,', 'А ПЕДАЛЬ ГАЗУ - В ПІДЛОЗІ.'],
      taunt: 'ДІАМАНТИ НЕ ЛЮБЛЯТЬ ДРУГЕ МІСЦЕ.', lose: 'ТАТО КУПИТЬ НОВУ. МАБУТЬ.',
      portrait: { fem: true, skin: 'light', face: 'soft', hair: { style: 'long', c: '#f5c131', curly: true, vol: 2 }, eye: '#2a6a8a', lips: '#d8203a', makeup: '#ff7cc6', cloth: { style: 'tank', c: '#d8203a' }, acc: ['aviator', 'hoops'], accC: '#ffc31f', expr: 'smile', bg: ['#3a1a0a', '#ff9a52'], motif: 'sun', rim: '#ffe27a' },
      car: {
        name: 'DIAMANTE', year: 1991, desc: 'ЗОЛОТИЙ СУПЕРКАР З ДІАМАНТОВИМ ВІНІЛОМ', paint: '#f5c131', accent: '#f2eefa', rims: 'gold', wheelX: [-10, 10], wheelY: 4,
        arch: {},
        rows: [
          '....................................',
          '..............KKKKKKK...............',
          '............KKhhhhhhhKK.............',
          '..........KKhhgGGGGGGwwK............',
          '.KKKKKKKKKhhhhgGGGGGGGGGwKKKKK......',
          '.KhhhhhhhhhhhhBBBBBBBBBBBBBBhhhhKK..',
          '.KRBBBBBBBBSBBBBBSBBBBBSBBBBBBBBBhK.',
          '.KRBBBBBBBSSSBBBSSSBBBSSSBBBBBBBBLK.',
          '.KBBBBBBBBBSBBBBBSBBBBBSBBBBBBBBBBOK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTVTVTVTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ЕЛЬ БРУХО', name: 'КАРЛОС РУЇС', gang: 1,
      story: ['ЛЕГЕНДА РАЛІ ГРУПИ Б.', 'КАЖУТЬ, ВІН ПРОДАВ ДУШУ', 'ЗА ОДНУ СЕКУНДУ НА КОЛІ.'],
      taunt: 'ДИЯВОЛ ЇДЕ ЗІ МНОЮ.', lose: 'СЬОГОДНІ ДИЯВОЛ ГРАВ ЗА ТЕБЕ.',
      portrait: { skin: 'brown', face: 'square', hair: { style: 'long', c: '#24202e', len: 36 }, eye: '#3a2a1a', cloth: { style: 'hawaiian', c: '#24202e', c2: '#ff6a1f' }, acc: ['bandana', 'mustache', 'cig'], accC: '#d8203a', expr: 'smirk', bg: ['#2a0a0a', '#ff6a1f'], motif: 'sun', rim: '#ff6a1f' },
      car: {
        name: 'EL DIABLO', year: 1986, desc: 'МОНСТР ГРУПИ Б ЗІ СВІТЛОВОЮ РАМПОЮ', paint: '#d8203a', accent: '#24202e', rims: 'white', wheelX: [-10, 10], wheelY: 4, wing: [0, 0, 9, 4],
        arch: { hill: 0.12, armor: 1.2 },
        rows: [
          'KKKKKKKKK...........................',
          'KhhhhhhhK...KKKKKKKKKK..............',
          '..K...K....KhhhhVVhhhK..............',
          '..K...K...KgGGGGwTgGGGwK............',
          '.KKKKKKKKKgGGGGGwTgGGGGwKKKKKKKK....',
          '.KhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhKK..',
          '.KRRBBBBBBBBBBBBBBBBBBBBBBBBBBBBLLK.',
          '.KRRBBBSSSSSSSSSSSSSSSSSSSSSBBBBBBKK',
          '.KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLLLLK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '.KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK',
          '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.',
        ],
      },
    },
    {
      nick: 'НОВА', name: 'ВЕРОНІКА СТАРР', gang: 0,
      story: ['ПІЛОТ ЗАБОРОНЕНОЇ КОМАНДИ', 'ЛЕ-МАНУ. ЛІТАЄ НИЗЬКО', 'І ВИБУХАЄ ЯСКРАВО.'],
      taunt: 'ЗАПЛЮЩ ОЧІ. БУДЕ СПАЛАХ.', lose: 'НАДНОВА ЗГАСЛА. НА СЬОГОДНІ.',
      portrait: { fem: true, skin: 'pale', face: 'soft', hair: { style: 'undercut', c: '#9d5cff' }, eye: '#29a0b0', lips: '#6a2a8a', makeup: '#29e0d0', cloth: { style: 'leather', c: '#3b3fb8' }, acc: ['tattoo', 'studs'], expr: 'smirk', bg: ['#140a3a', '#9d5cff'], motif: 'grid', rim: '#29e0d0' },
      car: {
        name: 'NOVA X', year: 1989, desc: 'ПРОТОТИП ЛЕ-МАНУ З ДОВГИМ ХВОСТОМ', paint: '#3b3fb8', accent: '#29e0d0', rims: 'black', wheelX: [-10, 10], wheelY: 4,
        fixed: { N: '#29e0d0' },
        arch: { launch: 0.05, air: -0.03 },
        rows: [
          '....................................',
          '.KKK................................',
          '.KhK..........KKKKKK................',
          '.KhK........KKhwwGGKK...............',
          '.KhhKKKKKKKKhhgGGGGGGwKKK...........',
          '.KhhhhhhhhhhhhhhhhhhhhhhhhhhhKKKK...',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBhhKK',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBLK',
          '.KSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSOK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'БАРОН', name: 'ВІКТОР КЕЙН', gang: 2,
      story: ['ТРИМАЄ РЕКОРД ШВИДКОСТІ НА', 'СОЛЯНИХ ОЗЕРАХ. РЕАКТИВНИЙ', 'ДВИГУН ЗНЯВ ІЗ ВИНИЩУВАЧА.'],
      taunt: 'ЗВУК ТЕБЕ НЕ НАЗДОЖЕНЕ.', lose: 'ВИ... ШВИДШІ ЗА ЗВУК.',
      portrait: { skin: 'pale', face: 'long', hair: { style: 'slick', c: '#24202e' }, eye: '#6a2a2a', cloth: { style: 'suit', c: '#24202e', c2: '#d8203a' }, acc: ['eyepatch', 'mustache'], expr: 'neutral', bg: ['#1a0a0a', '#8a1a2a'], motif: 'stars', rim: '#ff2a3a' },
      car: {
        name: 'BARON JET', year: 1970, desc: 'СТРІМЛАЙНЕР З РЕАКТИВНИМ ДВИГУНОМ', paint: '#b9bfcc', accent: '#d8203a', rims: 'chrome', wheelX: [-10, 11], wheelY: 4,
        arch: { accel: 0.9, launch: 0.03 },
        rows: [
          '.KKK................................',
          '.KSSK...............................',
          '.KShSK..............................',
          '.KShhSK......KKKKK..................',
          '.KShhhSK...KKwGGGgKK................',
          '.KKKKKKKKKKhhhhhhhhhhhKKKKKKK.......',
          'KCKhhhhhhhhhhhhhhhhhhhhhhhhhhhhKKK..',
          'CcKRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKK',
          'KCKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBL',
          '.KKbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTKK.',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'НЕОН', name: 'КІРА ЛІН', gang: 1,
      story: ['ЇЇ НЕОНОВИЙ СЛІД ЗНАЄ КОЖЕН', 'ДАХ МІСТА. ВИГРАЛА 99 ЗАЇЗДІВ', 'ПОСПІЛЬ. СОТИЙ - ТВІЙ?'],
      taunt: 'ГАРНИЙ СЛІД ЗАЛИШИШ.', lose: 'СОТИЙ... ТВІЙ.',
      portrait: { fem: true, skin: 'light', face: 'soft', hair: { style: 'long', c: '#ff3ea5', streak: '#29e0d0', split: true, fringe: 'blunt' }, eye: '#8a2a6a', lips: '#ff3e8a', makeup: '#29e0d0', cloth: { style: 'racing', c: '#24202e', c2: '#ff3ea5' }, acc: ['shades'], accC: '#29e0d0', expr: 'smirk', bg: ['#1a0a3a', '#ff3ea5'], motif: 'grid', rim: '#29e0d0' },
      car: {
        name: 'NEON KATANA', year: 1998, desc: 'КІБЕР-КЛИН З ЛЕЗОМ-СПОЙЛЕРОМ', paint: '#2f3a78', accent: '#ff3ea5', rims: 'pink', wheelX: [-10, 10], wheelY: 4, wing: [0, 1, 11, 5],
        fixed: { N: '#ff3ea5' },
        arch: { accel: 1.1, launch: 0.03 },
        rows: [
          '....................................',
          '.KKKKKKKKKK.........................',
          '.KNNNNNNNNK.........................',
          '....K...KK.......KKK................',
          '....K...K.....KKKwwGKK..............',
          '.KKKKKKKKKKKKKhhgGGGGGwKKKKK........',
          '.KhhhhhhhhhhhhhhhhhhhhhhhhhhhhKKKK..',
          '.KRBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBhKK',
          '.KRNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNLK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'ГРАФ', name: 'СЕБАСТЬЯН РУЖ', gang: 0,
      story: ['ТІНЬОВИЙ ВЛАСНИК УСІХ ГОНОК', 'МІСТА. ТУРБІНА ЙОГО ТАЧКИ', 'КОШТУЄ ЯК ХМАРОЧОС.'],
      taunt: 'ГРАФ ЗАВЖДИ ФІНІШУЄ ПЕРШИМ.', lose: 'ВРАЖАЄ. ВІЗЬМИ КЛЮЧІ.',
      portrait: { skin: 'light', face: 'long', hair: { style: 'slick', c: '#e6ecf5', vol: 1 }, eye: '#4a3a7a', cloth: { style: 'suit', c: '#24202e', c2: '#9d8cff' }, acc: ['beard', 'studs'], expr: 'smirk', bg: ['#0a0a1a', '#3d2f7a'], motif: 'stars', rim: '#c9bdff' },
      car: {
        name: 'COUNT ZERO', year: 1989, desc: 'ТУРБІННИЙ БОЛІД З КАЖАНОВИМИ КРИЛАМИ', paint: '#3a3a5e', accent: '#9d8cff', rims: 'black', wheelX: [-10, 10], wheelY: 4,
        arch: { armor: 1.2, accel: 1.1 },
        rows: [
          '.K.......K..........................',
          '.KK.....KK..........................',
          '.KhK...KhK..........................',
          '.KhhK.KhhK.....KKKKK................',
          '.KhhhKhhhK...KKwGGGgK...............',
          '.KhhhhhhhhKKKhhgGGGGGgKKKKKKKKKK....',
          'CKRhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhKKK',
          'cKRBBBBBBBBBBBBBBBBBBBBBBBBVVVVVVBLK',
          'CKBBBBBBBBBBBBBBBBBBBBBBBBBVVVVVVBBK',
          '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
    {
      nick: 'КОРОЛЕВА', name: 'ІЗАБЕЛЛА МОНТАНА', gang: 2,
      story: ['ПЕРША У СПИСКУ ВЖЕ ДЕСЯТЬ', 'РОКІВ. ВАЙС-СІТІ НАЛЕЖИТЬ ЇЙ.', 'ПОКИ ЩО.'],
      taunt: 'КОРОНУ ЗНІМАЮТЬ ЛИШЕ З ГОЛОВОЮ.', lose: 'КОРОЛЕВА ВПАЛА. ХАЙ ЖИВЕ КОРОЛЬ.',
      portrait: { fem: true, skin: 'tan', face: 'soft', hair: { style: 'long', c: '#1a1424', vol: 2, len: 46 }, eye: '#3a7a3a', lips: '#d8203a', makeup: '#ffc31f', cloth: { style: 'suit', c: '#f2eefa', c2: '#ffc31f' }, acc: ['hoops', 'chain', 'mole'], expr: 'smirk', bg: ['#3d1066', '#ffc45c'], motif: 'sun', rim: '#ff3ea5' },
      car: {
        name: 'NIGHTSHADE', year: 1999, desc: 'СТЕЛС-ГІПЕРКАР, ЯКИЙ НЕ БАЧАТЬ РАДАРИ', paint: '#4a3480', accent: '#9d5cff', rims: 'black', wheelX: [-10, 10], wheelY: 4,
        fixed: { N: '#b36cff' },
        arch: { accel: 1.15, launch: 0.05, air: -0.04, armor: 1.1 },
        rows: [
          '....................................',
          '.KK...........KKK...................',
          '.KhK........KKhhhKK.................',
          '.KhhK.....KKhhgGGGGKK...............',
          '.KhhhKKKKKhhhhgGGGGGGwKK............',
          '.KhhhhhhhhhhhhBhhhhhhhhhhKKKKK......',
          '.KRBBBBBBBBBBBBBBBBNNBBBBBBBBBhhhKK.',
          '.KRBBBBBBBBBBBBBBBNNBBBBBBBBBBBBBBLK',
          '.KBBBBBBBBBBBBBBBNNBBBBBBBBBBBBBBBOK',
          '.KNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNK',
          '..KTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTK..',
          '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
        ],
      },
    },
  ];

  // chassis calibration: top-speed factor applied in the physics only, measured on the fixed test track so every
  // blacklist car drives at the speed its pace promises (sprite shape and wheelbase change real handling a little)
  const PHYS = { 20: 0.95, 19: 1.04, 18: 0.95, 17: 0.97, 16: 0.96, 15: 0.96, 14: 1, 13: 0.96, 12: 1, 11: 0.96, 10: 0.97, 9: 0.99, 8: 0.97, 7: 0.98, 6: 1.03, 5: 1, 4: 1, 3: 0.94, 2: 1.02, 1: 1 };

  // stock stats: rank baseline + archetype, top speed solved so the car hits its curve pace
  function stockStats(i, arch) {
    const a = arch || {};
    const s = {
      top: 1,
      accel: Math.round((420 + 26 * i) * (a.accel || 1)),
      armor: Math.round((118 + 5 * i) * (a.armor || 1)),
      mass: a.mass || 0.8, restComp: a.restComp || 2.5, damp: 0.4,
      hill: +(0.62 + 0.01 * i + (a.hill || 0)).toFixed(2),
      launch: +(1.36 + 0.012 * i + (a.launch || 0)).toFixed(3),
      air: +(0.95 - 0.004 * i + (a.air || 0)).toFixed(3),
    };
    const target = C.stockPace(i);
    s.top = Math.round(target / B.pace(s));
    return s;
  }

  const RIVALS = ROSTER.map((r, k) => {
    const i = k + 1, rank = 21 - i;
    const stats = stockStats(i, r.car.arch);
    const car = Object.assign({}, r.car, { id: 'bl' + rank, era: 'BL', bl: true, rank, price: 0, stats, phys: PHYS[rank] || 1 });
    delete car.arch;
    return Object.assign({}, r, { i, rank, id: 'rival' + rank, gate: C.gate(i), need: C.need(i), skill: C.skill(i), car, portrait: Object.assign({ id: 'p' + rank }, r.portrait) });
  });
  // car value: walk the average player's cash (same model as tools/balance.js) and price each pink slip so
  // that tuning it up to the next rival costs `share` of the cash on hand at that gate
  const shop = Catalog.ALL.filter((c) => !c.bl);
  const starter = Catalog.STARTERS.slice().sort((x, y) => B.pace(y.stats) / y.price - B.pace(x.stats) / x.price)[0];
  let cash = 6000 - starter.price + B.income(...C.block(1)), first = Infinity;
  for (const c of shop) {
    const p = B.cheapestUp(c.stats, c.price, RIVALS[0].need);
    if (p) first = Math.min(first, p.cost + (c === starter ? 0 : c.price));
  }
  cash -= first;
  RIVALS.forEach((r, k) => {
    const next = RIVALS[k + 1];
    if (!next) { r.car.price = Math.round((RIVALS[k - 1].car.price * 1.15) / 1000) * 1000; return; }
    cash += B.income(...C.block(next.i));
    const base = B.cheapestUp(r.car.stats, 5000, next.need); // value 5000 -> price multiplier x1
    const value = Math.max(100000, Math.round(((C.share * cash) / base.cost - 0.5) * 10) * 1000);
    r.car.price = value;
    cash -= B.cheapestUp(r.car.stats, value, next.need).cost;
  });
  // challenge rule and boss upgrade package (cheapest set of levels that lifts the stock car by the tune factor)
  RIVALS.forEach((r, k) => {
    r.carReq = k ? RIVALS[k - 1].car.price : 0;
    const s = r.car.stats;
    const pick = C.tune(r.i) > 1 ? B.cheapestUp(s, r.car.price, B.pace(s) * C.tune(r.i)) : null;
    r.bossUp = pick ? pick.up : null;
  });

  RIVALS.forEach((r) => { Catalog.ALL.push(r.car); Catalog.byId[r.car.id] = r.car; });
  Catalog.BLACKLIST = RIVALS;
  window.Blacklist = { RIVALS, stockStats, byRank: (rank) => RIVALS.find((r) => r.rank === rank) };
})();
