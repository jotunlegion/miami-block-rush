// anime focus lines on the big hits, speed lines on the fast stretches
(function () {
  const D = Director;
  [[1.98, 0.5, 1], [3.70, 0.45, 1], [7.33, 0.5, 1], [10.6, 0.3, 0.8], [12.25, 0.45, 1], [14.2, 0.35, 0.9], [15.3, 0.25, 0.8], [15.64, 0.3, 1], [16.196, 0.55, 1]]
    .forEach(([t, dur, amt]) => D.ev({ t, type: 'focus', dur, amt }));
  [[0, 1.22, 0.75], [1.22, 0.76, 0.35], [2.54, 0.4, 0.4], [6.62, 0.43, 0.4], [12.48, 1.72, 0.7], [14.2, 0.64, 0.6], [14.84, 0.46, 0.45]]
    .forEach(([t, dur, amt]) => D.ev({ t, type: 'speed', dur, amt, flat: true }));
})();
