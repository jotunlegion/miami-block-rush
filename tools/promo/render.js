// Frame capture: node render.js --from A --to B [--step N] [--workers K] [--out dir] [--frames a,b,c]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const outDir = path.resolve(__dirname, args.out || 'frames');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const url = pathToFileURL(path.join(__dirname, 'director.html')).href;
  let list;
  if (args.frames) list = args.frames.split(',').map(Number);
  else {
    const from = +(args.from || 0), to = +(args.to || 1997), step = +(args.step || 1);
    list = [];
    for (let f = from; f <= to; f += step) list.push(f);
  }
  const K = Math.max(1, +(args.workers || 1));
  const chunks = Array.from({ length: K }, (_, i) => list.slice(Math.floor((i * list.length) / K), Math.floor(((i + 1) * list.length) / K)));
  const t0 = Date.now();
  let done = 0;
  await Promise.all(chunks.map(async (frames) => {
    if (!frames.length) return;
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('LOG')) console.log('PAGE:', m.text()); });
    await page.setViewport({ width: 320, height: 180 });
    await page.goto(url);
    await page.waitForFunction('window.Director && window.SHOTS', { timeout: 20000 });
    for (const f of frames) {
      const data = await page.evaluate((f, fmt) => {
        try { const info = Director.renderFrame(f); return [info, Director.grab(fmt)]; } catch (e) { return [{ error: e.message, stack: e.stack }, null]; }
      }, f, args.fmt === 'jpg' ? 'image/jpeg' : 'image/png');
      if (!data[1]) { console.log('FRAME', f, 'FAILED', JSON.stringify(data[0])); continue; }
      fs.writeFileSync(path.join(outDir, 'f' + String(f).padStart(5, '0') + (args.fmt === 'jpg' ? '.jpg' : '.png')), Buffer.from(data[1].split(',')[1], 'base64'));
      done++;
      if (args.verbose || done % 60 === 0) console.log(`frame ${f} ${JSON.stringify(data[0])} ${done}/${list.length} ${((Date.now() - t0) / done).toFixed(0)}ms/f`);
    }
    await page.close();
  }));
  console.log('done', list.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close();
})();
