const out = [];
const cfgs = [];
for (const sp of [160, 200, 240, 280]) for (const pc of [['LAUNCH', 7], ['STEEP', 7], ['GLIDE', 8]]) cfgs.push([sp, pc[0], pc[1]]);
for (const [sp, piece, row] of cfgs) {
  Stage.srand(1);
  const S = Stage.create(300);
  Stage.fill(S.w, 0, 300, 9, 12);
  Stage.place(S, piece, 0, 24, row, 1);
  const c = Stage.car(S, 'st_kings', 24 * 16 - sp * 0.6, 137, {}, 1, { top: sp, accel: 600 });
  c.vx = sp;
  let launch = null, apex = { y: 999 }, cross = null, land = null, wasG = true;
  for (let i = 0; i < 120 * 4; i++) {
    Stage.step(S);
    const g = c.grounded;
    if (!g && wasG && c.x > 24 * 16 && !launch) launch = { t: +S.t.toFixed(2), x: Math.round(c.x), y: Math.round(c.y) };
    if (launch && c.y < apex.y) apex = { t: +S.t.toFixed(2), x: Math.round(c.x), y: Math.round(c.y) };
    if (launch && !cross && c.vy > 0 && c.y >= 80) cross = { t: +S.t.toFixed(2), x: Math.round(c.x) };
    if (launch && !land && g && S.t > launch.t + 0.2) land = { t: +S.t.toFixed(2), x: Math.round(c.x) };
    wasG = g;
  }
  out.push(`${piece} sp${sp}: launch ${JSON.stringify(launch)} apex ${JSON.stringify(apex)} cross80 ${JSON.stringify(cross)} land ${JSON.stringify(land)}`);
}
return out.join('\n');
