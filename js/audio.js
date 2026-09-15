// Chiptune synthwave soundtrack + SFX (pure WebAudio, no assets)
(function () {
  let ac = null, master, musicBus, sfxBus, noiseBuf, pulse25, pulse12;
  let muted = false;
  let music = null; // {mode, step, nextTime, bpm}
  let engine = null, siren = null;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = 0.8;
    master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.42; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    pulse25 = makePulse(0.25);
    pulse12 = makePulse(0.125);
    setInterval(schedule, 25);
  }

  function makePulse(duty) {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }

  function tone(t, freq, dur, vol, wave, bus, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (wave === 'p25') o.setPeriodicWave(pulse25);
    else if (wave === 'p12') o.setPeriodicWave(pulse12);
    else o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(t, dur, vol, type, freq, bus, sweepTo) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  function kick(t, v = 1) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.13);
    g.gain.setValueAtTime(0.9 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.2);
  }
  const snare = (t, v = 1) => { noise(t, 0.14, 0.5 * v, 'bandpass', 1900, musicBus); tone(t, 190, 0.07, 0.25 * v, 'triangle', musicBus); };
  const hat = (t, v = 1, open) => noise(t, open ? 0.09 : 0.03, 0.18 * v, 'highpass', 7500, musicBus);

  // ---- Song data: A minor, Am - F - C - G ----
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const ROOTS = [33, 29, 36, 31];
  // lead: 4 bars x 16 steps (0 = rest, -1 = hold)
  const LEAD_A = [
    76, 0, 76, 0, 74, 0, 72, -1, 0, 0, 69, 0, 72, 0, 74, -1,
    72, 0, 72, 0, 69, 0, 67, -1, 0, 0, 65, 0, 67, 0, 69, -1,
    67, 0, 72, 0, 76, 0, 79, -1, -1, 0, 77, 0, 76, 0, 72, 0,
    74, -1, -1, 0, 71, 0, 74, 0, 79, -1, -1, 0, 78, 0, 79, 0,
  ];
  const LEAD_B = [
    81, 0, 79, 0, 76, 0, 79, 0, 81, 0, 84, -1, 83, 0, 81, 0,
    77, 0, 76, 0, 72, 0, 76, 0, 77, 0, 81, -1, 79, 0, 77, 0,
    76, 0, 72, 0, 67, 0, 72, 0, 76, 0, 79, -1, 77, 0, 76, 0,
    74, 0, 71, 0, 67, 0, 71, 0, 74, 0, 79, -1, 83, -1, 86, 0,
  ];

  function leadLen(arr, i) {
    let n = 1;
    while (arr[(i + n) % arr.length] === -1) n++;
    return n;
  }

  function playStep(t, bar, step, stepDur) {
    const m = music;
    const ci = bar % 4;
    const chord = CHORDS[ci], root = ROOTS[ci];
    const section = Math.floor(bar / 8) % 4; // 0 intro-ish, 1 lead A, 2 lead B, 3 breakdown
    if (m.mode === 'race') {
      // drums
      if (step % 4 === 0 && !(section === 3 && bar % 8 < 2)) kick(t);
      if (step % 8 === 4) snare(t);
      if (step % 4 === 2) hat(t, 1, true); else if (section > 0) hat(t, 0.45);
      if (bar % 8 === 7 && step >= 12) snare(t, 0.4 + (step - 12) * 0.15);
      // bass: pumping octaves
      const bassPat = [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 7, 12];
      tone(t, mtof(root + bassPat[step]), stepDur * 0.9, 0.34, 'sawtooth', musicBus);
      // arp
      const arp = chord[step % 3] + 12 + (step % 6 >= 3 ? 12 : 0);
      tone(t, mtof(arp), stepDur * 0.6, 0.07, 'p12', musicBus);
      // lead
      if (section === 1 || section === 2) {
        const L = section === 1 ? LEAD_A : LEAD_B;
        const i = ci * 16 + step, n = L[i];
        if (n > 0) {
          const len = leadLen(L, i) * stepDur;
          tone(t, mtof(n), len * 0.95, 0.13, 'p25', musicBus);
          tone(t + stepDur * 0.75, mtof(n), len * 0.6, 0.04, 'p25', musicBus); // echo
        }
      }
    } else {
      // menu: laid-back half-time groove
      if (step === 0 || step === 10) kick(t, 0.8);
      if (step === 8) snare(t, 0.7);
      if (step % 2 === 0) hat(t, 0.5, step % 4 === 2);
      if (step % 4 === 0) tone(t, mtof(root + 12), stepDur * 3.5, 0.3, 'triangle', musicBus);
      const arp = chord[(step >> 1) % 3] + 24;
      if (step % 2 === 0) tone(t, mtof(arp), stepDur * 1.8, 0.06, 'p25', musicBus);
      if (step === 0) chord.forEach((c) => tone(t, mtof(c + 12), stepDur * 15, 0.035, 'sawtooth', musicBus));
    }
  }

  function schedule() {
    if (!ac || !music) return;
    const stepDur = 60 / music.bpm / 4;
    while (music.nextTime < ac.currentTime + 0.12) {
      const bar = Math.floor(music.step / 16), step = music.step % 16;
      playStep(music.nextTime, bar, step, stepDur);
      music.nextTime += stepDur;
      music.step++;
    }
  }

  function startMusic(mode) {
    if (window.Music && Music.available()) { music = null; Music.setContext(mode === 'race' ? 'race' : 'menu'); return; }
    if (!ac) return;
    if (music && music.mode === mode) return;
    music = { mode, step: 0, bpm: mode === 'race' ? 132 : 96, nextTime: ac.currentTime + 0.08 };
  }
  function stopMusic() { music = null; }

  // ---- continuous: engine + siren ----
  function ensureLoops() {
    if (engine || !ac) return;
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(sfxBus); o.start();
    engine = { o, f, g };
    const so = ac.createOscillator(), sg = ac.createGain();
    so.setPeriodicWave(pulse25); sg.gain.value = 0;
    so.connect(sg); sg.connect(sfxBus); so.start();
    siren = { o: so, g: sg };
  }
  function setEngine(speed, on) {
    if (!ac) return; ensureLoops();
    const t = ac.currentTime;
    engine.o.frequency.setTargetAtTime(38 + speed * 0.9, t, 0.05);
    engine.f.frequency.setTargetAtTime(260 + speed * 6, t, 0.05);
    engine.g.gain.setTargetAtTime(on ? 0.07 : 0, t, 0.08);
  }
  function setSiren(level) {
    if (!ac) return; ensureLoops();
    const t = ac.currentTime;
    const hi = Math.floor(t / 0.32) % 2 === 0;
    siren.o.frequency.setTargetAtTime(hi ? 960 : 720, t, 0.01);
    siren.g.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.05, t, 0.1);
  }

  // ---- SFX ----
  const now = () => ac.currentTime;
  const sfx = {
    place() { if (!ac) return; tone(now(), 330, 0.08, 0.25, 'p25', sfxBus, 990); noise(now(), 0.05, 0.15, 'highpass', 3000, sfxBus); },
    rotate() { if (!ac) return; tone(now(), 1400, 0.03, 0.15, 'square', sfxBus); },
    invalid() { if (!ac) return; tone(now(), 110, 0.12, 0.25, 'square', sfxBus, 90); },
    coin(big) { if (!ac) return; const t = now(); tone(t, 988, 0.07, 0.2, 'p25', sfxBus); tone(t + 0.06, big ? 1568 : 1319, big ? 0.25 : 0.16, 0.2, 'p25', sfxBus); },
    crash() { if (!ac) return; const t = now(); noise(t, 0.7, 0.9, 'lowpass', 4000, sfxBus, 120); tone(t, 90, 0.4, 0.6, 'sine', sfxBus, 30); tone(t, 220, 0.2, 0.2, 'square', sfxBus, 60); },
    thud(v) { if (!ac) return; noise(now(), 0.12, 0.3 * v, 'lowpass', 800, sfxBus); },
    fall() { if (!ac) return; tone(now(), 900, 0.5, 0.18, 'p25', sfxBus, 150); },
    respawn() { if (!ac) return; const t = now(); [523, 659, 784].forEach((f, i) => tone(t + i * 0.05, f, 0.08, 0.12, 'p12', sfxBus)); },
    beep(go) { if (!ac) return; tone(now(), go ? 880 : 440, go ? 0.4 : 0.15, 0.3, 'p25', sfxBus); },
    finish() { if (!ac) return; const t = now(); [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.07, mtof(m), 0.2, 0.2, 'p25', sfxBus)); },
    bust() { if (!ac) return; const t = now(); [69, 66, 63, 57].forEach((m, i) => tone(t + i * 0.16, mtof(m), 0.2, 0.25, 'square', sfxBus)); },
    fine() { if (!ac) return; const t = now(); tone(t, 988, 0.05, 0.2, 'square', sfxBus, 660); tone(t + 0.06, 523, 0.12, 0.22, 'square', sfxBus, 262); noise(t, 0.08, 0.2, 'highpass', 2500, sfxBus); },
    chop(v) { if (!ac || v <= 0.02) return; noise(now(), 0.045, 0.2 * v, 'lowpass', 420, sfxBus); },
    jump() { if (!ac) return; tone(now(), 220, 0.18, 0.22, 'p25', sfxBus, 660); },
    nitro() { if (!ac) return; const t = now(); noise(t, 0.9, 0.5, 'bandpass', 600, sfxBus, 3500); tone(t, 110, 0.6, 0.2, 'sawtooth', sfxBus, 440); },
    pickup(n) { if (!ac) return; const t = now(); for (let i = 0; i < n; i++) tone(t + i * 0.05, 660 * Math.pow(1.26, i), 0.08, 0.18, 'p12', sfxBus); },
    grab() { if (!ac) return; tone(now(), 520, 0.05, 0.15, 'square', sfxBus, 780); },
    whoosh(style) { if (!ac) return; const t = now(); noise(t, style === 'shutter' ? 0.5 : 0.28, 0.35, 'bandpass', style === 'shutter' ? 300 : 900, sfxBus, style === 'shutter' ? 120 : 4000); },
    buy() { if (!ac) return; const t = now(); [72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.06, mtof(m), 0.12, 0.2, 'p25', sfxBus)); noise(t, 0.2, 0.2, 'highpass', 6000, sfxBus); },
    upgrade() { if (!ac) return; const t = now(); tone(t, 180, 0.35, 0.3, 'sawtooth', sfxBus, 720); noise(t + 0.05, 0.25, 0.25, 'bandpass', 1500, sfxBus, 5000); tone(t + 0.3, 1047, 0.2, 0.18, 'p25', sfxBus); },
    select() { if (!ac) return; tone(now(), 880, 0.04, 0.12, 'p12', sfxBus, 1320); },
    click() { if (!ac) return; tone(now(), 660, 0.05, 0.2, 'p25', sfxBus, 880); },
  };

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.8;
    if (window.Music) Music.setMuted(muted);
    return muted;
  }

  window.Audio8 = { init, startMusic, stopMusic, setEngine, setSiren, sfx, toggleMute, isMuted: () => muted };
})();
