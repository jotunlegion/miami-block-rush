// Licensed soundtrack player (NFS MW "EA Trax" style): per-context queues, crossfades,
// "Now Playing" popup with procedural pixel covers, mini player and jukebox data.
(function () {
  // cover: a/b gradient, f fg, h highlight, x dark, m motif
  const TRACKS = [
    // ---- menu / garage ----
    // The house band's theme. Whatever the rotation has reached, the menu opens on this one
    // every time the game is loaded - see take() below.
    { id: 'theme', file: 'Miami Block Rush.mp3', ctx: 'menu', dur: 161, theme: true, artist: 'DJ NIGHT SHIFT', title: 'MIAMI BLOCK RUSH', album: 'MEMPHIS TAPES', genre: 'MEMPHIS PHONK', year: 2023,
      cover: { a: '#ff3ea5', b: '#12082a', f: '#e6ecf5', h: '#ffffff', x: '#8c1a5c', m: 'tape' } },
    { id: 'lights', file: 'When The Lights Go Green.mp3', ctx: 'menu', dur: 133, artist: 'GRANDMASTER CLUTCH & THE PIT CREW', title: 'GONE IN A MINUTE', album: 'BREAKBEAT BOULEVARD', genre: 'OLD SCHOOL HIP-HOP', year: 1984,
      cover: { a: '#ff9a2e', b: '#6a1e10', f: '#ffd23f', h: '#fff3a0', x: '#1a1020', m: 'record' } },
    { id: 'hood', file: 'Dance on My Hood.mp3', ctx: 'menu', dur: 227, artist: 'HOOD ORNAMENT MOB', title: 'OWN THAT HOOD', album: 'CRUNK & CHROME', genre: 'CRUNK', year: 2005,
      cover: { a: '#7b2fbe', b: '#1a0a36', f: '#ffc31f', h: '#fff3a0', x: '#12082a', m: 'dollar' } },
    { id: 'runitup', file: 'Run It Up.mp3', ctx: 'menu', dur: 164, artist: 'HOOD ORNAMENT MOB', title: 'CHASE THIS PACK', album: 'CRUNK & CHROME', genre: 'CRUNK', year: 2005,
      cover: { a: '#7b2fbe', b: '#1a0a36', f: '#ffc31f', h: '#fff3a0', x: '#12082a', m: 'dollar' } },
    { id: 'getoff', file: 'Get Off The Road.mp3', ctx: 'menu', dur: 188, artist: 'HOOD ORNAMENT MOB', title: 'GET OFF THE ROAD', album: 'CRUNK & CHROME', genre: 'CRUNK', year: 2005,
      cover: { a: '#7b2fbe', b: '#1a0a36', f: '#ffc31f', h: '#fff3a0', x: '#12082a', m: 'dollar' } },
    { id: 'speedmachine', file: 'Speed Machine.mp3', ctx: 'menu', dur: 181, artist: 'BLACKLIGHT', title: 'SPEED MACHINE', album: 'HEAVY WEATHER', genre: 'DUBSTEP', year: 2012,
      cover: { a: '#9d5cff', b: '#0c1030', f: '#7ae83a', h: '#d8ff9a', x: '#12082a', m: 'wub' } },
    { id: 'redline', file: 'Redline Rush.mp3', ctx: 'menu', dur: 157, artist: 'LOS HIJOS DEL ASFALTO', title: 'NO SE PUEDE SLOW DOWN', album: 'BARRIO NITRO', genre: 'LATIN GANGSTA RAP', year: 2003,
      cover: { a: '#d8203a', b: '#0f3d1f', f: '#ffd23f', h: '#ffffff', x: '#12081a', m: 'crown' } },
    { id: 'raceboys', file: 'Race Boys.mp3', ctx: 'menu', dur: 198, artist: 'CHROME HONEYZ', title: 'COOLEST IN THE LANE', album: 'SUGAR & SPEEDWAY', genre: 'R&B', year: 2002,
      cover: { a: '#ff7cc6', b: '#5a2a7a', f: '#e6ecf5', h: '#ffffff', x: '#8c1a5c', m: 'heart' } },
    // ---- races ----
    { id: 'raster', file: 'Race Through the Raster.mp3', ctx: 'race', dur: 190, artist: 'SCANLINE ZERO', title: 'ONE LAP MORE', album: 'INSERT COIN', genre: 'ARCADE ELECTRO', year: 1989,
      cover: { a: '#ff3e8a', b: '#1a0a50', f: '#ffc45c', h: '#fff07a', x: '#12082a', m: 'sun' } },
    { id: 'crash', file: 'Crash Into.mp3', ctx: 'race', dur: 130, artist: 'THE SKIDMARK YOBS', title: 'WHO GIVES A DAMN', album: 'LAST ORDERS AT THE PIT STOP', genre: 'UK STREET PUNK', year: 1982,
      cover: { a: '#f5e04a', b: '#ff3ea5', f: '#12081a', h: '#ffffff', x: '#f5e04a', m: 'skull' } },
    { id: 'vogon', file: 'Мій Вогонь.mp3', ctx: 'race', dur: 187, artist: 'ІСКРА.EXE', title: 'ЗАПУСКАЙ', album: 'ЖАР', genre: 'ЕЛЕКТРО', year: 2024,
      cover: { a: '#2f7bff', b: '#12205a', f: '#ffd23f', h: '#fff3a0', x: '#0c1030', m: 'spark' } },
    { id: 'hagane', file: '鋼のマシン.mp3', ctx: 'race', dur: 226, artist: 'PIXEL HIGHWAY', title: 'HASHIRE! YOAKE NO MUKOU', album: 'HAGANE BEAT', genre: 'J-POP RACING', year: 1998,
      cover: { a: '#ffd0e8', b: '#ff5c9a', f: '#ffffff', h: '#fff3a0', x: '#d8203a', m: 'star' } },
    { id: 'turbo', file: 'Turbo Arcade.mp3', ctx: 'race', dur: 150, artist: 'MC QUARTER MILE', title: 'OWN THE ROAD TONIGHT', album: 'CLUB CIRCUIT', genre: 'CLUB RAP', year: 2006,
      cover: { a: '#29e0d0', b: '#3a0f66', f: '#12082a', h: '#ffffff', x: '#e6ecf5', m: 'mic' } },
    { id: 'eightbit', file: 'Eight-Bit Exit.mp3', ctx: 'race', dur: 88, artist: 'DJ HAYBALE 8000', title: "PICKIN' UP SUSIE", album: 'BARN RAVE VOL. 2', genre: 'COUNTRY TECHNO', year: 1996,
      cover: { a: '#7ae83a', b: '#4a2a12', f: '#d9a05a', h: '#fff1c9', x: '#2a1608', m: 'hat' } },
    { id: 'hagane1', file: '鋼のマシン (1).mp3', ctx: 'race', dur: 216, artist: 'PIXEL HIGHWAY', title: 'TOBE! HAGANE NO MACHINE', album: 'HAGANE BEAT', genre: 'J-POP RACING', year: 1998,
      cover: { a: '#ffd0e8', b: '#9d5cff', f: '#ffffff', h: '#fff3a0', x: '#d8203a', m: 'star' } },
    { id: 'sober', file: 'Sober Racers.mp3', ctx: 'race', dur: 120, artist: 'THE SKIDMARK YOBS', title: 'DRIVE LIKE GHOSTS', album: 'LAST ORDERS AT THE PIT STOP', genre: 'UK STREET PUNK', year: 1982,
      cover: { a: '#f5e04a', b: '#29c7d8', f: '#12081a', h: '#ffffff', x: '#f5e04a', m: 'skull' } },
    { id: 'toofast', file: 'Too Fast for the Frame.mp3', ctx: 'race', dur: 187, artist: 'BLACKLIGHT', title: 'TOO FAST FOR THE FRAME', album: 'HEAVY WEATHER', genre: 'DUBSTEP', year: 2012,
      cover: { a: '#7ae83a', b: '#0c1030', f: '#9d5cff', h: '#d8ff9a', x: '#12082a', m: 'wub' } },
    { id: 'fullspeed', file: 'Full Speed, No Sleep.mp3', ctx: 'race', dur: 144, artist: 'THE REARVIEW KIDS', title: 'LIPSTICK ON THE PASSENGER SEAT', album: 'MIXTAPES & MIDNIGHT EXITS', genre: 'POP-PUNK', year: 2006,
      cover: { a: '#29c7d8', b: '#12081a', f: '#ff2a3a', h: '#ffffff', x: '#12081a', m: 'heartbreak' } },
  ];

  const MOTIFS = {
    record: ['....xxxx....', '..xxhxxhxx..', '.xhxxxxxxhx.', '.xxxx##xxxx.', 'xxhx####xhxx', 'xxx##hh##xxx', 'xxx##hh##xxx', 'xxhx####xhxx', '.xxxx##xxxx.', '.xhxxxxxxhx.', '..xxhxxhxx..', '....xxxx....'],
    dollar: ['.....##.....', '...######...', '..##h##.##..', '..##.##.....', '...#####....', '.....#####..', '.....##.##..', '..##.##.##..', '...######...', '.....##.....', '..xxxxxxxx..', '............'],
    crown: ['............', '#....#....#.', '##..###..##.', '###.###.###.', '###########.', '#h#h#h#h#h#.', '###########.', '#xxxxxxxxx#.', '###########.', '............', '..########..', '............'],
    heart: ['............', '.###....###.', '#hh##..#####', '#h##########', '############', '############', '.##########.', '..########..', '...######...', '....####....', '.....##.....', '............'],
    sun: ['....####....', '..###hh###..', '.##########.', '############', '############', '............', '############', '............', '.##########.', '............', '...######...', '............'],
    skull: ['..########..', '.##########.', '############', '##xxx##xxx##', '##xxx##xxx##', '############', '#####xx#####', '.##########.', '..#x#x#x#x..', '..########..', '...#.#.#.#..', '............'],
    spark: ['......###...', '.....###....', '....###.....', '...###......', '..#######...', '.....###....', '....###.....', '...###......', '..##........', '.#..........', '............', '............'],
    star: ['.....##.....', '.....##.....', '....####....', '############', '.####hh####.', '..########..', '..###..###..', '.###....###.', '.##......##.', '............', '..h......h..', '............'],
    mic: ['....####....', '...#hhhh#...', '...#h##h#...', '...#hhhh#...', '...#h##h#...', '....####....', '.....##.....', '..#..##..#..', '...######...', '.....##.....', '....####....', '............'],
    heartbreak: ['............', '.###....###.', '#hh##..#####', '#h###.######', '#####..#####', '######.#####', '.####.#####.', '..###..###..', '...###.##...', '....##.#....', '.....#......', '............'],
    tape: ['............', '.##########.', '.#hhhhhhhh#.', '.#hhhhhhhh#.', '.##########.', '.#xx####xx#.', '.#x######x#.', '.#xx####xx#.', '.##########.', '.#.#.##.#.#.', '.##########.', '............'],
    wub: ['...######...', '.##xxxxxx##.', '.#xx####xx#.', '#x##hhhh##x#', '#x#hh##hh#x#', '#x#h####h#x#', '#x#h####h#x#', '#x#hh##hh#x#', '#x##hhhh##x#', '.#xx####xx#.', '.##xxxxxx##.', '...######...'],
    hat: ['............', '....####....', '...######...', '...#h##h#...', '...######...', '############', '.##########.', '..xxxxxxxx..', '............', '.h.h.h.h.h..', 'h.h.h.h.h.h.', '............'],
  };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  const KEY = window.BOT_MODE ? 'mbr_music_bot' : 'mbr_music_v1';
  let st = { ptr: { menu: 0, race: 0 }, assign: {}, vol: 0.75 };
  let audio = null, context = 'menu', cur = null, muted = false, fadeTimer = null, popupT = 0, failed = 0, wasPlaying = false;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) st = Object.assign(st, s, { ptr: Object.assign({ menu: 0, race: 0 }, s.ptr) }); } catch (e) { /* no storage */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* no storage */ } }

  const assign = (id) => st.assign[id] || TRACKS.find((t) => t.id === id).ctx;
  const playlist = (c) => TRACKS.filter((t) => { const a = assign(t.id); return a === c || a === 'both'; });
  // st.vol is this track's place in the mix; the settings slider is a scale on top of it, read
  // straight off Audio8 so there is one answer to "how loud is the music" and not two.
  const scale = () => (window.Audio8 && Audio8.vol ? Audio8.vol('music') : 1);
  const target = () => (muted ? 0 : st.vol * scale());

  function init() {
    if (audio) return;
    load();
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('ended', () => advance());
    audio.addEventListener('error', () => { failed++; if (failed < TRACKS.length) setTimeout(advance, 250); });
    audio.addEventListener('playing', () => { failed = 0; });
    document.addEventListener('visibilitychange', () => {
      if (!audio || !cur) return;
      if (document.hidden) { wasPlaying = !audio.paused; audio.pause(); }
      else if (wasPlaying) audio.play().catch(() => {});
    });
  }

  function fade(to, dur, done) {
    clearInterval(fadeTimer);
    const from = audio.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (dur * 1000));
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(fadeTimer); if (done) done(); }
    }, 30);
  }

  function start(track) {
    if (!track) { if (cur) fade(0, 0.5, () => audio.pause()); cur = null; return; }
    cur = track;
    audio.src = 'Ost/' + encodeURIComponent(track.file);
    audio.volume = 0;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
    fade(target(), 1.0);
    popupT = 5.5;
  }

  function switchTo(track) {
    if (cur && !audio.paused && audio.volume > 0.02) fade(0, 0.6, () => start(track));
    else start(track);
  }

  // take the next track of a context and move its pointer immediately,
  // so a song interrupted by a context change is never replayed from the start
  let opened = false;                 // the theme has had its turn this load
  function take(c) {
    const pl = playlist(c);
    if (!pl.length) return null;
    // The menu opens on the theme every time the game is loaded, and the rotation carries
    // on from behind it. Send the theme to another context in the player, or switch it off,
    // and this steps aside - the jukebox still has the last word on where a track plays.
    if (c === 'menu' && !opened) {
      opened = true;
      const th = pl.find((t) => t.theme);
      if (th) { st.ptr[c] = (pl.indexOf(th) + 1) % pl.length; save(); return th; }
    }
    const i = ((st.ptr[c] % pl.length) + pl.length) % pl.length;
    st.ptr[c] = (i + 1) % pl.length;
    save();
    return pl[i];
  }

  function advance() { switchTo(take(context)); }

  const api = {
    tracks: TRACKS,
    init,
    available: () => failed < TRACKS.length,
    started: () => !!(audio && cur),
    current: () => cur,
    context: () => context,
    isPaused: () => !audio || audio.paused,
    assign,
    setContext(c) {
      init();
      if (context === c && cur) return;
      context = c;
      advance();
    },
    next() { init(); advance(); },
    prev() {
      init();
      const pl = playlist(context);
      if (!pl.length) return;
      st.ptr[context] = (st.ptr[context] - 2 + pl.length * 2) % pl.length;
      advance();
    },
    toggle() {
      if (!audio || !cur) { api.next(); return; }
      if (audio.paused) { audio.play().catch(() => {}); fade(target(), 0.4); }
      else fade(0, 0.3, () => audio.pause());
      popupT = Math.max(popupT, 3);
    },
    play(id) { init(); switchTo(TRACKS.find((t) => t.id === id)); },
    cycleAssign(id) {
      const order = ['menu', 'race', 'both', 'off'];
      st.assign[id] = order[(order.indexOf(assign(id)) + 1) % order.length];
      save();
    },
    setMuted(m) { muted = m; if (audio && cur) fade(target(), 0.2); },
    // dragging a slider has to be heard on the same frame it moves, so this one skips the fade
    refreshVol() { if (audio && cur) { clearInterval(fadeTimer); audio.volume = Math.max(0, Math.min(1, target())); } },
    progress: () => ({ t: audio ? audio.currentTime || 0 : 0, d: audio && isFinite(audio.duration) ? audio.duration : cur ? cur.dur : 0 }),
    update(dt) { if (popupT > 0) popupT -= dt; },
    showPopup() { if (cur) popupT = Math.max(popupT, 4); },
  };

  // ---------- procedural pixel covers ----------
  const coverCache = {};
  api.cover = function (track, size) {
    const k = track.id + size;
    if (coverCache[k]) return coverCache[k];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const C = track.cover;
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const A = hex(C.a), B = hex(C.b);
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const f = y / (size - 1), th = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        const band = Math.floor(f * 4), frac = f * 4 - band;
        const col = (band + (frac > th ? 1 : 0)) / 4 > 0.5 ? B : A;
        const o = (y * size + x) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    if (C.m === 'sun') { g.fillStyle = '#00000030'; for (let y = 1; y < size; y += 2) g.fillRect(0, y, size, 1); }
    const rows = MOTIFS[C.m];
    const s = Math.max(1, Math.floor((size - 4) / 12));
    const ox = Math.floor((size - 12 * s) / 2), oy = Math.floor((size - 12 * s) / 2);
    const pal = { '#': C.f, h: C.h, x: C.x };
    // drop shadow then motif
    rows.forEach((r, y) => { for (let x = 0; x < 12; x++) if (r[x] !== '.') { g.fillStyle = '#00000055'; g.fillRect(ox + x * s + s, oy + y * s + s, s, s); } });
    rows.forEach((r, y) => { for (let x = 0; x < 12; x++) if (r[x] !== '.') { g.fillStyle = pal[r[x]]; g.fillRect(ox + x * s, oy + y * s, s, s); } });
    g.fillStyle = '#ffffff30'; g.fillRect(1, 1, size - 2, 1); g.fillRect(1, 1, 1, Math.floor(size / 3));
    g.fillStyle = '#0a0614'; g.fillRect(0, 0, size, 1); g.fillRect(0, size - 1, size, 1); g.fillRect(0, 0, 1, size); g.fillRect(size - 1, 0, 1, size);
    return (coverCache[k] = c);
  };

  // ---------- widgets ----------
  function clipText(ctx, text, x, y, w, color, s = 1, scroll = true, t = 0) {
    const tw = Font.measure(text, s);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y - 1, w, 7 * s + 3); ctx.clip();
    if (tw <= w || !scroll) Font.draw(ctx, text, x, y, color, s, 'left', null);
    else {
      const gap = 36, off = Math.round((t * 22) % (tw + gap));
      Font.draw(ctx, text, x - off, y, color, s, 'left', null);
      Font.draw(ctx, text, x - off + tw + gap, y, color, s, 'left', null);
    }
    ctx.restore();
  }
  api.clipText = clipText;

  function eq(ctx, x, y, color, t, bars = 5, h = 7) {
    const playing = audio && !audio.paused;
    for (let i = 0; i < bars; i++) {
      const v = playing ? Math.abs(Math.sin(t * (5 + i * 1.7) + i * 1.3)) * 0.8 + 0.2 : 0.15;
      const bh = Math.max(1, Math.round(v * h));
      ctx.fillStyle = color;
      ctx.fillRect(x + i * 3, y + h - bh, 2, bh);
    }
  }
  api.eq = eq;

  // "Now Playing" toast, slides in from the left like EA Trax
  api.drawPopup = function (ctx, x, y, accent, w = 196) {
    if (!cur || popupT <= 0) return;
    const t = performance.now() / 1000;
    const k = popupT > 5 ? (5.5 - popupT) / 0.5 : popupT < 0.5 ? popupT / 0.5 : 1;
    const e = 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
    const px = Math.round(x - (1 - e) * (w + 20));
    UI.slant(ctx, px, y, w, 34, '#12082af4', accent, 6);
    ctx.drawImage(api.cover(cur, 28), px + 8, y + 3);
    Font.draw(ctx, 'ЗАРАЗ ГРАЄ', px + 42, y + 4, accent, 1, 'left', null);
    eq(ctx, px + w - 26, y + 3, accent, t, 5, 7);
    clipText(ctx, cur.title, px + 42, y + 14, w - 52, '#ffffff', 1, true, t);
    clipText(ctx, cur.artist, px + 42, y + 24, w - 52, '#b9a8e0', 1, true, t);
  };

  // compact prev / play-pause / next plate
  api.drawMini = function (ctx, x, y, button, accent) {
    UI.slant(ctx, x, y, 66, 22, '#12082af0', accent, 6);
    const paused = !audio || audio.paused;
    UI.icon(ctx, 'prev', x + 9, y + 5, '#ffffff');
    UI.icon(ctx, paused ? 'play' : 'pause', x + 27, y + 5, accent);
    UI.icon(ctx, 'next', x + 45, y + 5, '#ffffff');
    button(x, y, 22, 24, () => { api.prev(); if (window.Audio8) Audio8.sfx.select(); });
    button(x + 22, y, 22, 24, () => { api.toggle(); });
    button(x + 44, y, 24, 24, () => { api.next(); if (window.Audio8) Audio8.sfx.select(); });
  };

  window.Music = api;
})();
