const out = [];
for (const piece of ['RAMP', 'LAUNCH', 'KICK', 'STEEP']) {
  Stage.srand(1);
  const S = Stage.create(200);
  Stage.fill(S.w, 0, 40, 9, 12);
  const row = piece === 'RAMP' || piece === 'LAUNCH' ? 7 : 7;
  Stage.place(S, piece, 0, 30, row, 0);
  const c = Stage.car(S, 'st_vice', 300, 128, {}, 0);
  c.vx = 138;
  const tr = [];
  for (let i = 0; i < 120 * 3.5; i++) { Stage.step(S); if (i % 12 === 0) tr.push([+S.t.toFixed(2), Math.round(c.x), Math.round(c.y), +c.a.toFixed(2), Math.round(c.vx), Math.round(c.vy), c.grounded ? 'G' : 'A']); }
  out.push(piece + ': ' + tr.map((p) => p.join(',')).join(' | '));
}
return out.join('\n');
