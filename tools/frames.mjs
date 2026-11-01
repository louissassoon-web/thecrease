// Capture reference frames from the built game for animation review.
//   node tools/frames.mjs [url] [outDir]
//   SEED=<integer> node tools/frames.mjs ...   fixes the season seed, so the fixture, the toss and the delivery repeat
// Starts a T20 season, calls the toss and bats first (replaying the fixture from the toss with the winning call when
// the opposition win and bat), starts the over, and saves the batting view at three engine times plus one
// field-replay frame. Frames are the evidence for renderer work.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const url = process.argv[2] || 'http://localhost:8000/index.html';
const out = process.argv[3] || 'frames';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ ...devices['Pixel 7'] });
if (process.env.SEED !== undefined) {
  // The season seed is the page's only draw from crypto.getRandomValues; fixing it fixes everything downstream.
  await context.addInitScript(seed => { const real = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = a => a instanceof Uint32Array ? (a.fill(seed), a) : real(a); }, Number(process.env.SEED) >>> 0);
}
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const hidden = id => page.evaluate(id => document.getElementById(id).hidden, id);
await page.goto(url);
await page.waitForSelector('#setupDialog[open]', { timeout: 20000 });
await page.click('#startInningsBtn');
// The toss (revision 30). The coin face comes from the fixture seed, which a match restart keeps, so when the
// opposition win and choose to bat, replaying the fixture from the toss and calling the face that came up wins it.
let call = 'heads', batting = false;
const toss = [];
for (let attempt = 0; attempt < 4 && !batting; attempt++) {
  await page.waitForSelector('#tossDialog[open]', { timeout: 20000 });
  await page.click(call === 'tails' ? '#tailsBtn' : '#headsBtn');
  await page.waitForFunction(() => !document.getElementById('tossContinueBtn').hidden, null, { timeout: 5000 });
  const face = await page.evaluate(() => document.getElementById('tossCoin').textContent === 'T' ? 'tails' : 'heads');
  const won = !await hidden('tossDecision');
  if (won) await page.click('#tossBatBtn');
  await page.click('#tossContinueBtn');
  await page.waitForFunction(() => !document.getElementById('tossDialog').open && !!document.getElementById('game').dataset.bowling, null, { timeout: 20000 });
  batting = await page.evaluate(() => document.getElementById('game').dataset.bowling === 'false');
  toss.push(call + (won ? ' won, bat' : ' lost, opposition ' + (batting ? 'bowl' : 'bat')));
  if (!batting) { await page.click('#menuBtn'); await page.click('#settingsBtn'); await page.click('#restartMatchBtn'); await page.click('#confirmRestartBtn'); toss.push('fixture replayed'); call = face; }
}
if (!batting) { await browser.close(); throw new Error('The player is still bowling after four tosses'); }
// After a replay the scene camera blends from the bowling view over 1100 ms; let it settle before the first frame.
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, 'batting-ready.png') });
await page.click('#bowlBtn');
// The pre-delivery brief (player introductions, conditions, field) runs for up to ten seconds and releases the
// ball itself during an over the player has started; "Bowl now" is only offered when it would wait.
await page.waitForFunction(() => !document.getElementById('deliveryBrief').hidden || !document.getElementById('arrivalCue').hidden, null, { timeout: 15000 });
if (!await hidden('readyBallBtn') && !await hidden('deliveryBrief')) await page.click('#readyBallBtn');
await page.waitForFunction(() => !document.getElementById('arrivalCue').hidden, null, { timeout: 30000 });
// Engine time is read from the arrival cue, which the UI updates every frame.
const grab = async (label, metres) => {
  await page.waitForFunction(m => { const t = document.getElementById('arrivalDistance').textContent; const v = parseFloat(t); return t === 'At the bat' || t === 'Past the bat' ? m <= 0 : Number.isFinite(v) && v <= m; }, metres, { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(out, label + '.png') });
};
await grab('flight-release', 17);
await grab('flight-mid', 8);
await grab('flight-at-bat', 0);
await page.waitForFunction(() => document.getElementById('arrivalCue').hidden, null, { timeout: 30000 });
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(out, 'field-replay.png') });
const info = await page.evaluate(() => { let seed = null; try { seed = JSON.parse(localStorage.getItem('cricket.career.v5')).sessions.T20.league.seed; } catch {} const text = id => document.getElementById(id).textContent.trim(); return { seed, team: text('gameLabel'), batter: text('batterName'), bowler: text('bowlerName') }; });
console.log('frames written to', out, '· toss: ' + toss.join(', ') + ' · ' + info.team + ', ' + info.bowler + ' to ' + info.batter + (info.seed === null ? '' : ' · season seed ' + info.seed + ' (SEED=' + info.seed + ' repeats it)') + ' · ' + (errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors'));
await browser.close();
