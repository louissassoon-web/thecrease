// Capture reference frames from the built game for animation review.
//   node tools/frames.mjs [url] [outDir]
// Starts a T20 fixture in which the player bats, starts the over, and saves the batting view
// at three engine times plus one field-replay frame. Frames are the evidence for renderer work.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const url = process.argv[2] || 'http://localhost:8000/index.html';
const out = process.argv[3] || 'frames';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.waitForSelector('#setupDialog[open]', { timeout: 20000 });
await page.click('#startInningsBtn');
await page.waitForTimeout(400);
for (let attempt = 0; attempt < 12; attempt++) {
  if (await page.evaluate(() => document.getElementById('bowlingPanel').hidden)) break;
  await page.click('#menuBtn'); await page.click('#settingsBtn'); await page.click('#restartGameBtn'); await page.click('#confirmRestartBtn'); await page.click('#startInningsBtn'); await page.waitForTimeout(400);
}
await page.screenshot({ path: path.join(out, 'batting-ready.png') });
await page.click('#bowlBtn');
await page.waitForFunction(() => !document.getElementById('arrivalCue').hidden, null, { timeout: 30000 });
// Engine time is read from the arrival cue, which the UI updates every frame.
const grab = async (label, metres) => {
  await page.waitForFunction(m => { const t = document.getElementById('arrivalDistance').textContent; const v = parseFloat(t); return t === 'At the bat' ? m <= 0 : Number.isFinite(v) && v <= m; }, metres, { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(out, label + '.png') });
};
await grab('flight-release', 17);
await grab('flight-mid', 8);
await grab('flight-at-bat', 0);
await page.waitForFunction(() => document.getElementById('arrivalCue').hidden, null, { timeout: 30000 });
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(out, 'field-replay.png') });
console.log('frames written to', out, errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
await browser.close();
