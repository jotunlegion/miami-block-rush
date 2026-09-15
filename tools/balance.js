// Balance sheet generator: loads the real game data (catalog, balance, blacklist), walks an economical
// player through all 20 Blacklist gates and writes docs/BALANCE.md with every number and check.
// Usage: node tools/balance.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { window: {}, Math, console, JSON, Object, Array, Set, Map };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['js/catalog.js', 'js/balance.js', 'js/blacklist.js', 'js/levels.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const { Catalog, Balance: B, Blacklist } = ctx;
const C = B.CAREER, U = B.UP_IDS;

const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const upStr = (u) => (u ? U.map((k) => u[k] || 0).join('') : '000000');
const pct = (v) => (v * 100).toFixed(0) + '%';
const f1 = (v) => v.toFixed(1);

// ---------------- economy ----------------
const blocks = [];
let cum = 6000;
for (let i = 1; i <= 20; i++) {
  const a = i === 1 ? 1 : (i - 1) * 10, b = i * 10 - 1;
  const inc = B.income(a, b);
  cum += inc;
  blocks.push({ i, a, b, earn: B.earnPerAttempt(b), mul: B.cashMul(b), inc, cum });
}

// ---------------- economical player walk-through ----------------
const shop = Catalog.ALL.filter((c) => !c.bl);
const starter = Catalog.STARTERS.slice().sort((x, y) => B.pace(y.stats) / y.price - B.pace(x.stats) / x.price)[0];
let cash = 6000 - starter.price;
const owned = [{ car: starter, up: {} }];
const rows = [], flags = [];

// a rival only accepts a car worth at least the previous rival's car
function bestPlan(target, budget, minValue = 0) {
  let best = null;
  const consider = (car, from, buy) => {
    const p = B.cheapestUp(car.stats, car.price, target, from);
    if (!p) return;
    const cost = p.cost + (buy ? car.price : 0);
    if (!best || cost < best.cost) best = { car, up: p.up, cost, buy, upCost: p.cost };
  };
  for (const o of owned) if (o.car.price >= minValue) consider(o.car, o.up, false);
  for (const c of shop) if (!owned.some((o) => o.car.id === c.id) && c.price <= budget && c.price >= minValue) consider(c, null, true);
  return best;
}
// highest pace the money on hand could buy right now (upgrades on owned cars or a shop car + upgrades)
function maxAffordablePace(budget, minValue = 0) {
  let best = 0;
  const scan = (car, from, extra) => {
    for (let n = 0; n < 4096; n++) {
      const up = {}; let ok = true, cost = extra;
      U.forEach((k, j) => { up[k] = (n >> (j * 2)) & 3; if (from && up[k] < (from[k] || 0)) ok = false; if (up[k] && up[k] !== ((from && from[k]) || 0)) cost += B.upgradeCost(car.price, k, up[k]); });
      if (ok && cost <= budget) best = Math.max(best, B.pace(B.applyUp(car.stats, up)));
    }
  };
  for (const o of owned) if (o.car.price >= minValue) scan(o.car, o.up, 0);
  for (const c of shop) if (c.price <= budget && c.price >= minValue && !owned.some((o) => o.car.id === c.id)) scan(c, null, c.price);
  return best;
}

for (const r of Blacklist.RIVALS) {
  const blk = blocks[r.i - 1];
  cash += blk.inc;
  const need = r.need;
  const plan = bestPlan(need, Infinity, r.carReq);
  const row = { r, blk, cashAt: cash, need, plan };
  if (!plan) { flags.push(`#${r.rank}: no car can reach pace ${f1(need)} at all`); rows.push(row); continue; }
  row.dead = plan.cost > cash;
  if (row.dead) {
    let extra = 0, lvl = blk.b + 1, c2 = cash;
    while (c2 < plan.cost && extra < 200) { c2 += B.levelIncome(lvl++); extra++; }
    row.extraLevels = extra;
    flags.push(`#${r.rank}: short by ${money(plan.cost - cash)} at level ${r.gate} (needs ${extra} extra levels of grinding)`);
    cash = c2;
  }
  cash -= plan.cost;
  let o = owned.find((x) => x.car.id === plan.car.id);
  if (!o) { o = { car: plan.car, up: {} }; owned.push(o); }
  o.up = plan.up;
  row.after = B.pace(B.applyUp(plan.car.stats, plan.up));
  row.cashLeft = cash;
  row.share = plan.cost / blk.inc;
  row.maxed = U.every((k) => plan.up[k] === 3);
  row.maxLeft = U.reduce((s, k) => s + (plan.up[k] < 3 ? B.upgradeCost(plan.car.price, k, 3) : 0), 0);
  // pink slip
  owned.push({ car: r.car, up: {} });
  const next = Blacklist.RIVALS[r.i];
  if (next) {
    const nextBlk = blocks[r.i];
    row.nextNeed = next.need;
    row.bestOwned = Math.max(...owned.filter((x) => x.car.price >= next.carReq).map((x) => B.pace(B.applyUp(x.car.stats, x.up))));
    row.slipPace = B.pace(r.car.stats);
    row.affordNow = maxAffordablePace(cash, next.carReq);
    row.maxLeftVsNext = row.maxLeft / nextBlk.inc;
    if (row.bestOwned >= next.need) flags.push(`#${r.rank}: already strong enough for #${next.rank} right after the win`);
    if (row.affordNow >= next.need) flags.push(`#${r.rank}: leftover cash already buys the pace for #${next.rank}`);
    if (row.slipPace >= next.need) flags.push(`#${r.rank}: the pink slip car alone beats #${next.rank}`);
    row.usable = plan.car.price >= next.carReq;
    if (row.usable && !row.maxed && row.maxLeft <= nextBlk.inc) flags.push(`#${r.rank}: ${plan.car.name} can be maxed within the next 10 levels`);
  }
  rows.push(row);
}
// monotonic car ladder
Blacklist.RIVALS.forEach((r, k) => { if (k && B.pace(r.car.stats) <= B.pace(Blacklist.RIVALS[k - 1].car.stats)) flags.push(`#${r.rank}: stock pace not above #${r.rank + 1}`); });
Blacklist.RIVALS.forEach((r, k) => { if (k && r.car.price <= Blacklist.RIVALS[k - 1].car.price) flags.push(`#${r.rank}: value not above #${r.rank + 1}`); });
const shopMax = Math.max(...shop.map((c) => B.pace(B.applyUp(c.stats, B.maxUp()))));

// ---------------- markdown ----------------
const L = [];
L.push('# Miami Block Rush - balance sheet', '', 'Generated by `node tools/balance.js` from `js/balance.js`, `js/catalog.js` and `js/blacklist.js`. Do not edit by hand.', '');
L.push('## Formulas', '');
L.push('| What | Formula |', '|---|---|');
L.push('| Upgrades (per level 0..3) | engine top +6%, gearbox top +2.5% & accel +5%, turbo accel +12%, tires hill +0.06 & launch +0.04, suspension air -5%, chassis armor +15% |');
L.push('| Pace (px/s) | top x (1+0.00016(accel-300)) x (1+0.42(launch-1.3)) x (1+0.1 clamp(hill-0.56,0,0.3)) x (1+0.08 clamp((armor-120)/140,-0.5,1)) x (1+0.1 clamp(1-air,0,0.3)) |');
L.push('| Rating | (pace - 90) x 5 |');
L.push('| Upgrade price | base x (0.5 + car value / 10 000), bought level by level directly |');
L.push('| Part price | base x (0.6 + car value / 25 000) |');
L.push('| Level cash | bags and finish bonuses x (1 + 0.02 (level - 1)) |');
L.push('| Income per level | earned per attempt / win rate ' + B.WIN_RATE + '; earned = min(5300, 2500 + 90 L) x cash |');
L.push('| Boss race | 1 vs 1, first to the finish wins and takes the car |');
L.push('| Beatable | player pace >= need = boss pace x boss skill |');
L.push('| Challenge rule | the rival only takes a bet from a car worth at least the previous rival car |');
L.push('| Blacklist value | set so tuning the pink slip to the next rival costs ' + Math.round(C.share * 100) + '% of the cash on hand at that gate |', '');
L.push('Pace was fitted on a fixed test track driven by the real car physics (no building): lap time scales as 6750 / top; accel 200 -> 700 is -7%, launch 1.3 -> 1.6 is -11%, hill 0.56 -> 0.75 is -2.5%. Income per attempt and win rate were measured with the AI builder standing in for an average player, 10 races per level.', '');

L.push('## Economy by 10-level block', '');
L.push('| Block | Levels | Earned/attempt | Cash x | Income | Cumulative |', '|---|---|---|---|---|---|');
blocks.forEach((b) => L.push(`| ${b.i} | ${b.a}-${b.b} | ${money(b.earn)} | x${b.mul.toFixed(2)} | ${money(b.inc)} | ${money(b.cum)} |`));
L.push('');

L.push('## Blacklist', '');
L.push('| # | Rival | Car | Gate | Car req | Top | Accel | Launch | Hill | Armor | Air | Stock pace | Rating | Value | Upg x | Max upg | Boss upg | Boss pace | Skill | Need | Rating need |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
Blacklist.RIVALS.forEach((r) => {
  const s = r.car.stats, bp = B.pace(B.applyUp(s, r.bossUp));
  L.push(`| ${r.rank} | ${r.nick} (${r.name}) | ${r.car.name} | L${r.gate} | ${r.carReq ? money(r.carReq) : '-'} | ${s.top} | ${s.accel} | ${s.launch} | ${s.hill} | ${s.armor} | ${s.air} | ${f1(B.pace(s))} | ${B.rating(s)} | ${money(r.car.price)} | x${B.tier(r.car.price).toFixed(1)} | ${money(B.maxCost(r.car.price))} | ${upStr(r.bossUp)} | ${f1(bp)} | x${r.skill.toFixed(3)} | ${f1(r.need)} | ${Math.round((r.need - 90) * 5)} |`);
});
L.push('', 'Upgrade strings are engine, turbo, gearbox, tires, suspension, chassis.', '');

L.push('## Economical player walk-through', '');
L.push(`Starts with $6 000, buys ${starter.name}. At each gate it picks the cheapest way to reach the needed pace: more upgrades on a car it owns, or a shop car plus upgrades. Winning adds the rival's car (stock).`, '');
L.push('| # | Gate | Cash at gate | Need | Plan | Upgrades | Cost | % of block | Pace after | Cash left | Left to max | vs next block | Best owned | Next need | Pink slip pace | Leftover buys | Status |');
L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
rows.forEach((w) => {
  const p = w.plan;
  if (!p) { L.push(`| ${w.r.rank} | L${w.r.gate} | ${money(w.cashAt)} | ${f1(w.need)} | - | - | - | - | - | - | - | - | - | - | - | - | DEAD |`); return; }
  const st = [];
  if (w.dead) st.push('SHORT +' + w.extraLevels + ' lvls');
  if (w.nextNeed && w.bestOwned >= w.nextNeed) st.push('TOO STRONG');
  if (w.nextNeed && w.affordNow >= w.nextNeed) st.push('CASH SKIPS');
  if (w.nextNeed && w.usable && !w.maxed && w.maxLeft <= blocks[w.r.i].inc) st.push('MAXABLE');
  L.push(`| ${w.r.rank} | L${w.r.gate} | ${money(w.cashAt)} | ${f1(w.need)} | ${p.buy ? 'buy ' : ''}${p.car.name} | ${upStr(p.up)} | ${money(p.cost)} | ${pct(w.share)} | ${f1(w.after)} | ${money(w.cashLeft)} | ${money(w.maxLeft)} | ${w.maxLeftVsNext != null ? 'x' + w.maxLeftVsNext.toFixed(2) : '-'} | ${w.bestOwned ? f1(w.bestOwned) : '-'} | ${w.nextNeed ? f1(w.nextNeed) : '-'} | ${w.slipPace ? f1(w.slipPace) : '-'} | ${w.affordNow ? f1(w.affordNow) : '-'} | ${st.join(', ') || 'OK'} |`);
});
L.push('');
L.push('## Shop cars for reference', '');
L.push('| Car | Price | Stock pace | Max pace | Upg x | Max upg cost |', '|---|---|---|---|---|---|');
shop.forEach((c) => L.push(`| ${c.name} | ${money(c.price)} | ${f1(B.pace(c.stats))} | ${f1(B.pace(B.applyUp(c.stats, B.maxUp())))} | x${B.tier(c.price).toFixed(2)} | ${money(B.maxCost(c.price))} |`));
L.push('', `Best maxed shop car pace: ${f1(shopMax)}.`, '');
L.push('## Checks', '');
L.push(flags.length ? flags.map((f) => '- ' + f).join('\n') : '- All checks pass: every gate is reachable on time, no rival is skippable, no car maxes out within a block.');
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/BALANCE.md'), L.join('\n') + '\n');

// console summary
console.log('rank gate cash    need   plan                      cost      share after  left   next  status');
rows.forEach((w) => {
  const p = w.plan;
  console.log(String(w.r.rank).padStart(3), ('L' + w.r.gate).padEnd(5), money(w.cashAt).padEnd(11), f1(w.need).padEnd(6), p ? ((p.buy ? '+' : '') + p.car.name + ' ' + upStr(p.up)).padEnd(26) : '-', p ? money(p.cost).padEnd(10) : '', w.share ? pct(w.share).padEnd(5) : '', w.after ? f1(w.after).padEnd(6) : '', w.cashLeft != null ? money(w.cashLeft).padEnd(10) : '', w.nextNeed ? f1(w.nextNeed) : '');
});
console.log('\nstock pace/value:', Blacklist.RIVALS.map((r) => r.rank + ':' + f1(B.pace(r.car.stats)) + '/' + Math.round(r.car.price / 1000) + 'k/top' + r.car.stats.top).join(' '));
console.log('shop max pace', f1(shopMax));
console.log('\nFLAGS (' + flags.length + '):\n' + flags.join('\n'));

// ---------------- HTML ledger (docs/balance.html) ----------------
// duel checks run in the browser: an AI stand-in for an average player against the real boss AI,
// once on the pink slip tuned to the needed pace and once on the same car stock
const DUELS = JSON.parse(fs.readFileSync(path.join(__dirname, 'duels.json'), 'utf8'));
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ukMoney = (v) => '$' + Math.round(v).toLocaleString('en-US').replace(/,/g, ' ');
const UP_UK = ['двигун', 'турбо', 'коробка', 'шини', 'підвіска', 'каркас'];
const pkg = (u) => {
  const parts = U.map((k, j) => (u && u[k] ? UP_UK[j] + ' ' + u[k] : null)).filter(Boolean);
  return parts.length ? parts.join(', ') : 'сток';
};
const statusOf = (w) => {
  if (!w.plan) return ['fail', 'недосяжно'];
  if (w.dead) return ['fail', 'бракує ' + w.extraLevels + ' рів.'];
  if (w.nextNeed && (w.bestOwned >= w.nextNeed || w.affordNow >= w.nextNeed)) return ['warn', 'пропуск рангу'];
  return ['ok', 'OK'];
};

// ladder chart: need, boss pace and the pink slip's stock pace per rank on one shared scale
function ladderSvg() {
  const W = 960, Hh = 300, L0 = 56, R0 = 20, T0 = 18, B0 = 42;
  const ranks = Blacklist.RIVALS;
  const vals = ranks.flatMap((r) => [r.need, B.pace(B.applyUp(r.car.stats, r.bossUp)), B.pace(r.car.stats)]);
  const lo = Math.floor(Math.min(...vals) / 50) * 50, hi = Math.ceil(Math.max(...vals) / 50) * 50;
  const x = (k) => L0 + (k * (W - L0 - R0)) / (ranks.length - 1);
  const y = (v) => T0 + ((hi - v) * (Hh - T0 - B0)) / (hi - lo);
  const line = (fn) => ranks.map((r, k) => (k ? 'L' : 'M') + x(k).toFixed(1) + ' ' + y(fn(r)).toFixed(1)).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Темп по рангах: потрібен гравцю, бос, стокова тачка">`;
  for (let v = lo; v <= hi; v += 50) s += `<line x1="${L0}" x2="${W - R0}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L0 - 10}" y="${y(v) + 4}" class="tick" text-anchor="end">${v}</text>`;
  ranks.forEach((r, k) => { s += `<text x="${x(k)}" y="${Hh - B0 + 20}" class="tick" text-anchor="middle">#${r.rank}</text>`; });
  s += `<path d="${line((r) => B.pace(r.car.stats))}" class="ln stock"/>`;
  s += `<path d="${line((r) => B.pace(B.applyUp(r.car.stats, r.bossUp)))}" class="ln boss"/>`;
  s += `<path d="${line((r) => r.need)}" class="ln need"/>`;
  ranks.forEach((r, k) => { s += `<circle cx="${x(k)}" cy="${y(r.need)}" r="3.5" class="dot"/>`; });
  s += `<text x="${L0}" y="${Hh - 6}" class="tick">ранг у списку: від першого виклику до останнього</text></svg>`;
  return s;
}

const HT = [];
HT.push(`<title>Miami Blacklist Ledger</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>
:root{--ground:#120a24;--panel:#1b1034;--panel2:#22143f;--zebra:#1f1239;--line:#35245c;--ink:#f1eaff;--muted:#a698c9;--dim:#7a6d9e;--pink:#ff3ea5;--cyan:#29e0d0;--amber:#ffc31f;--ok:#6aff9a;--warn:#ffc31f;--fail:#ff5c7a;
--display:'Silkscreen','Courier New',monospace;--body:'Chakra Petch','Trebuchet MS',sans-serif;--mono:'IBM Plex Mono',ui-monospace,Consolas,monospace}
*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;background:var(--ground);color:var(--ink);font:16px/1.55 var(--body);padding-inline:clamp(16px,4vw,48px);padding-block:32px 72px}
.wrap{max-width:1180px;margin:0 auto;display:grid;gap:56px}
header{display:grid;gap:18px}
.eyebrow{font:13px var(--display);letter-spacing:.12em;color:var(--cyan);text-transform:uppercase}
h1{font:clamp(30px,5vw,52px)/1.05 var(--display);margin:0;text-wrap:balance}
h1 em{font-style:normal;color:var(--pink)}
h2{font:22px/1.2 var(--display);margin:0;text-wrap:balance}
.lead{max-width:68ch;color:var(--muted);margin:0}
.lead b,.note b{color:var(--ink);font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{border:1px solid var(--line);background:var(--panel);padding:8px 12px;display:grid;gap:2px;min-width:160px}
.chip span{font:12px var(--body);color:var(--dim);letter-spacing:.06em;text-transform:uppercase}
.chip b{font:600 18px var(--mono);font-variant-numeric:tabular-nums}
.chip.good b{color:var(--ok)}
section{display:grid;gap:14px;align-content:start}
.note{color:var(--muted);max-width:72ch;margin:0;font-size:15px}
.scroll{overflow-x:auto;border:1px solid var(--line);background:var(--panel)}
table{border-collapse:collapse;width:max-content;min-width:100%;font:13px/1.35 var(--mono);font-variant-numeric:tabular-nums}
th,td{padding:7px 10px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--line)}
th{font:600 11px var(--body);letter-spacing:.07em;text-transform:uppercase;color:var(--muted);background:var(--panel2)}
thead tr.grp th{color:var(--ink);font-size:12px;text-align:center}
thead tr.grp th.car{box-shadow:inset 0 2px 0 var(--amber)}
thead tr.grp th.boss{box-shadow:inset 0 2px 0 var(--cyan)}
thead tr.grp th.you{box-shadow:inset 0 2px 0 var(--pink)}
td.l,th.l{text-align:left}
tbody tr:nth-child(even) td{background:var(--zebra)}
td.rank,th.rank{position:sticky;left:0;background:var(--panel2);text-align:left;z-index:1}
tbody tr:nth-child(even) td.rank{background:var(--panel2)}
td.rank b{font:15px var(--display);color:var(--amber)}
.who{font:600 13px var(--body);color:var(--ink)}
.who small{display:block;color:var(--dim);font-weight:400}
.need{color:var(--pink);font-weight:600}
.bosspace{color:var(--cyan)}
.muted{color:var(--dim)}
.pill{display:inline-block;padding:2px 8px;font:600 11px var(--body);letter-spacing:.05em;border:1px solid currentColor}
.pill.ok{color:var(--ok)} .pill.warn{color:var(--warn)} .pill.fail{color:var(--fail)}
.bar{display:inline-grid;grid-template-columns:44px 64px;gap:8px;align-items:center}
.bar i{display:block;height:6px;background:var(--line);position:relative}
.bar i::after{content:'';position:absolute;inset:0 auto 0 0;width:var(--w);background:var(--pink)}
.chart{border:1px solid var(--line);background:var(--panel);padding:12px;overflow-x:auto}
.chart svg{display:block;width:100%;min-width:640px;height:auto}
.grid{stroke:var(--line);stroke-width:1}
.tick{fill:var(--dim);font:11px var(--mono)}
.ln{fill:none;stroke-width:2.5}
.ln.need{stroke:var(--pink)} .ln.boss{stroke:var(--cyan)} .ln.stock{stroke:var(--amber);stroke-dasharray:6 5}
.dot{fill:var(--pink)}
.legend{display:flex;flex-wrap:wrap;gap:18px;font-size:14px;color:var(--muted)}
.legend span::before{content:'';display:inline-block;width:18px;height:3px;margin-right:8px;vertical-align:middle;background:var(--c)}
.formulas{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line);border:1px solid var(--line);margin:0}
.formulas div{background:var(--panel);padding:12px 16px;display:grid;gap:4px}
.formulas dt{font:600 12px var(--body);letter-spacing:.07em;text-transform:uppercase;color:var(--cyan)}
.formulas dd{margin:0;font:13px/1.5 var(--mono);color:var(--ink)}
.cols2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:28px;align-items:start}
details{border:1px solid var(--line);background:var(--panel)}
summary{cursor:pointer;padding:12px 16px;font:600 14px var(--body);color:var(--muted)}
summary:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
@media (max-width:640px){.chip{min-width:calc(50% - 5px)}.cols2{grid-template-columns:1fr}}
</style>`);

const okCount = rows.filter((w) => statusOf(w)[0] === 'ok').length;
const shares = rows.slice(1).map((w) => w.share);
HT.push(`<div class="wrap"><header>
<div class="eyebrow">Miami Block Rush · кар'єра</div>
<h1>Баланс <em>чорного списку</em></h1>
<p class="lead">20 суперників. Кожен наступний відкривається на <b>кожному 10-му рівні</b> (L10 → L200) і лише після перемоги над попереднім. Дуель 1 на 1 без копів: <b>хто перший на фініші, той забирає тачку</b>. Ставку приймають лише на тачці, не дешевшій за тачку попереднього суперника, тож кожен ранг виграється на щойно відвойованій машині з тюнінгом. Ціни машин прив'язані до готівки, яку середній гравець встигає заробити за 10 рівнів.</p>
<div class="chips">
<div class="chip good"><span>Перевірки</span><b>${flags.length ? flags.length + ' проблем' : 'усі пройдено'}</b></div>
<div class="chip"><span>Ворота вчасно</span><b>${okCount} / 20</b></div>
<div class="chip"><span>Тюнінг на воротах</span><b>${pct(Math.min(...shares))}–${pct(Math.max(...shares))} блоку</b></div>
<div class="chip"><span>Потрібен темп #20 → #1</span><b>${f1(Blacklist.RIVALS[0].need)} → ${f1(Blacklist.RIVALS[19].need)}</b></div>
<div class="chip"><span>Стеля автосалону</span><b>${f1(shopMax)}</b></div>
</div></header>`);

HT.push(`<section><h2>Зведена таблиця</h2>
<p class="note">Один рядок на суперника. <b>Потрібен темп</b> = темп боса × його навичка: стільки має привезти гравець, щоб перемагати. <b>План</b> — найдешевший спосіб дотягнути до цього темпу за готівку, накопичену до воріт. Статус перевіряє, що ворота досяжні вчасно, а залишок грошей і стокова тачка-приз не дають одразу пройти наступного.</p>
<div class="scroll"><table><thead>
<tr class="grp"><th class="rank"></th><th colspan="3"></th><th colspan="9" class="car">Тачка-приз, сток</th><th colspan="4" class="boss">Бос у дуелі</th><th colspan="9" class="you">Гравець на воротах</th></tr>
<tr><th class="rank l">Ранг</th><th class="l">Суперник</th><th>Ворота</th><th>Ставка від</th>
<th class="l">Тачка</th><th>Top</th><th>Розгін</th><th>Трамплін</th><th>Підйом</th><th>Міцність</th><th>Гравітація</th><th>Темп</th><th>Вартість</th>
<th class="l">Пакет тюнінгу</th><th>Темп</th><th>Навичка</th><th>Потрібен темп</th>
<th>Готівка</th><th class="l">План</th><th>Ціна плану</th><th class="l">Частка блоку</th><th>Темп після</th><th>Залишок</th><th>Наступному</th><th>Приз у стоку</th><th class="l">Статус</th></tr>
</thead><tbody>`);
rows.forEach((w) => {
  const r = w.r, s = r.car.stats, [cls, label] = statusOf(w), p = w.plan;
  const bp = B.pace(B.applyUp(s, r.bossUp));
  HT.push(`<tr><td class="rank"><b>#${r.rank}</b></td><td class="l"><span class="who">${esc(r.nick)}<small>${esc(r.name)}</small></span></td><td>L${r.gate}</td><td>${r.carReq ? ukMoney(r.carReq) : '<span class="muted">будь-яка</span>'}</td>
<td class="l">${esc(r.car.name)}</td><td>${s.top}</td><td>${s.accel}</td><td>${s.launch.toFixed(2)}</td><td>${s.hill.toFixed(2)}</td><td>${s.armor}</td><td>${s.air.toFixed(2)}</td><td>${f1(B.pace(s))}</td><td>${ukMoney(r.car.price)}</td>
<td class="l">${pkg(r.bossUp)}</td><td class="bosspace">${f1(bp)}</td><td>×${r.skill.toFixed(3)}</td><td class="need">${f1(r.need)}</td>
<td>${ukMoney(w.cashAt)}</td><td class="l">${p ? (p.buy ? 'купити ' : '') + esc(p.car.name) + ' · ' + pkg(p.up) : '—'}</td><td>${p ? ukMoney(p.cost) : '—'}</td>
<td class="l"><span class="bar" style="--w:${Math.min(100, (w.share || 0) * 100).toFixed(0)}%">${w.share ? pct(w.share) : '—'}<i></i></span></td>
<td>${w.after ? f1(w.after) : '—'}</td><td>${w.cashLeft != null ? ukMoney(w.cashLeft) : '—'}</td><td>${w.nextNeed ? f1(w.nextNeed) : '<span class="muted">фінал</span>'}</td><td>${w.slipPace ? f1(w.slipPace) : '—'}</td>
<td class="l"><span class="pill ${cls}">${label}</span></td></tr>`);
});
HT.push(`</tbody></table></div></section>`);

HT.push(`<section><h2>Драбина темпу</h2>
<p class="note">Суцільні лінії — те, що бачить гравець на воротах: скільки треба привезти і з чим їде бос. Пунктир — з чим гравець виїжджає після перемоги. Приз завжди нижчий за наступне «потрібно», тож без тюнінгу наступного боса не пройти.</p>
<div class="legend"><span style="--c:var(--pink)">Потрібен темп гравця</span><span style="--c:var(--cyan)">Темп боса з тюнінгом</span><span style="--c:var(--amber)">Стоковий темп тачки-призу</span></div>
<div class="chart">${ladderSvg()}</div></section>`);

HT.push(`<section><h2>Перевірка дуелями</h2>
<p class="note">Бот із навичками середнього гравця (затримка 0.6 с, помилки 7%) проти справжнього ШІ боса на трасі воріт. Прокачана до потрібного темпу тачка має виграти помітно частіше, ніж стокова.</p>
<div class="scroll"><table><thead><tr><th class="rank l">Ранг</th><th class="l">Тачка гравця</th><th>Темп прокачаної</th><th>Перемоги прокачаною</th><th>Темп стокової</th><th>Перемоги стоковою</th><th>Дуелей</th></tr></thead><tbody>
${DUELS.map((d) => {
  const r = Blacklist.byRank(d.rank);
  const prev = d.rank < 20 ? Blacklist.byRank(d.rank + 1).car : Catalog.byId.contessa85;
  const plan = B.cheapestUp(prev.stats, prev.price, r.need);
  return `<tr><td class="rank"><b>#${d.rank}</b></td><td class="l">${esc(prev.name)}</td><td class="need">${f1(B.pace(B.applyUp(prev.stats, plan.up)))}</td><td>${pct(d.tuned)}</td><td>${f1(B.pace(prev.stats))}</td><td class="muted">${pct(d.stock)}</td><td>${d.n}</td></tr>`;
}).join('')}
</tbody></table></div></section>`);

HT.push(`<div class="cols2"><section><h2>Формули</h2><dl class="formulas">
<div><dt>Темп, px/с</dt><dd>top × (1 + 0.00016·(розгін − 300)) × (1 + 0.42·(трамплін − 1.3)) × (1 + 0.1·підйом) × (1 + 0.08·міцність) × (1 + 0.1·(1 − гравітація))</dd></div>
<div><dt>Рейтинг</dt><dd>(темп − 90) × 5</dd></div>
<div><dt>Апгрейд</dt><dd>база × (0.5 + вартість тачки / 10 000)</dd></div>
<div><dt>Деталі й фарба</dt><dd>база × (0.6 + вартість тачки / 25 000)</dd></div>
<div><dt>Гроші рівня</dt><dd>мішки й бонуси × (1 + 0.02·(рівень − 1))</dd></div>
<div><dt>Потрібен темп</dt><dd>195 × 1.035^(n − 1); стоковий приз = потрібне наступному / 1.10</dd></div>
<div><dt>Вартість тачки-призу</dt><dd>тюнінг до наступного рангу = ${Math.round(C.share * 100)}% готівки на воротах</dd></div>
<div><dt>Калібрування шасі</dt><dd>top у фізиці × 0.94…1.03, заміряно на тест-трасі</dd></div>
</dl><p class="note">Темп виміряно на фіксованій тест-трасі з трамплінами, прірвами, сходами й падіннями на справжній фізиці: час кола ≈ 6750 / top, розгін 200 → 700 дає −7%, трамплін 1.3 → 1.6 дає −11%.</p></section>
<section><h2>Економіка по блоках</h2><div class="scroll"><table><thead><tr><th class="l">Рівні</th><th>За спробу</th><th>Множник</th><th>Дохід блоку</th><th>Разом</th></tr></thead><tbody>
${blocks.map((b) => `<tr><td class="l">${b.a}–${b.b}</td><td>${ukMoney(b.earn)}</td><td>×${b.mul.toFixed(2)}</td><td>${ukMoney(b.inc)}</td><td>${ukMoney(b.cum)}</td></tr>`).join('')}
</tbody></table></div><p class="note">Дохід = заробіток за спробу / ${B.WIN_RATE} (частка виграних заїздів). Заробіток за спробу виміряно ботом на рівнях 2–60, далі він росте лише множником рівня.</p></section></div>`);

HT.push(`<details><summary>Тачки автосалону для порівняння</summary><div class="scroll"><table><thead><tr><th class="l">Тачка</th><th>Ціна</th><th>Темп стоку</th><th>Макс. темп</th><th>Множник апгрейдів</th><th>Повний тюнінг</th></tr></thead><tbody>
${shop.map((c) => `<tr><td class="l">${esc(c.name)}</td><td>${ukMoney(c.price)}</td><td>${f1(B.pace(c.stats))}</td><td>${f1(B.pace(B.applyUp(c.stats, B.maxUp())))}</td><td>×${B.tier(c.price).toFixed(2)}</td><td>${ukMoney(B.maxCost(c.price))}</td></tr>`).join('')}
</tbody></table></div></details>
<p class="note">Згенеровано скриптом tools/balance.js із js/balance.js, js/catalog.js і js/blacklist.js.</p></div>`);
fs.writeFileSync(path.join(ROOT, 'docs/balance.html'), HT.join('\n'));
