// Physics lab: node lab.js script.js -> runs the script body inside the page (Stage etc. loaded), prints its return value
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
(async () => {
  const code = fs.readFileSync(process.argv[2], 'utf8');
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  page.on('console', (m) => console.log('PAGE:', m.text()));
  await page.goto(pathToFileURL(path.join(__dirname, 'lab.html')).href);
  await page.waitForFunction('window.Stage', { timeout: 20000 });
  try {
    const r = await page.evaluate(new Function('return (async () => {' + code + '})()'));
    console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
  } catch (e) { console.log('EVAL ERROR', e.message); }
  await browser.close();
})();
