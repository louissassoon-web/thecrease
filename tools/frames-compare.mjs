// Capture the same engine frames from two renderers for comparison.
//   node tools/frames-compare.mjs [url] [outDir]
//   SEED=<integer>           fixes the season seed, so the fixture, the toss and the delivery repeat (printed each run)
//   RENDERERS=canvas,three   renderers to capture, one page each (default canvas,three); with several, side-by-side
//                            composites named compare-*.png are written as well
//   TIMES=0,400,1200         engine times after release, in milliseconds, for the flight frames (default)
// tools/frames.mjs is the general frame-capture tool; this one exists for renderer parity work, where both renderers
// must see identical state at exact engine times. The page runs on Playwright's fake clock and is stepped one 16 ms
// animation frame at a time. Starts a T20 season on a Pixel 7 profile, calls the toss and bats first (replaying the
// fixture from the toss with the winning call when the opposition win and bat, as frames.mjs does), starts the over,
// lets the pre-delivery brief run, and writes <renderer>-batting-ready, <renderer>-flight-<t>ms and
// <renderer>-field-replay into outDir. Frames are the evidence for renderer work: both renderers must agree on ball
// and player positions.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const url = process.argv[2] || 'http://localhost:8000/index.html';
const out = process.argv[3] || 'frames';
const renderers = (process.env.RENDERERS || 'canvas,three').split(',').map(s => s.trim()).filter(Boolean);
const times = [...new Set((process.env.TIMES || '0,400,1200').split(',').map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
// The season seed is the page's only draw from crypto.getRandomValues; fixing it fixes everything downstream.
const seed = process.env.SEED !== undefined ? Number(process.env.SEED) >>> 0 : Math.floor(Math.random() * 2 ** 32) >>> 0;
const FRAME = 16;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });

async function capture(renderer) {
 const context = await browser.newContext({ ...devices['Pixel 7'] });
 await context.addInitScript(seed => { const real = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = a => a instanceof Uint32Array ? (a.fill(seed), a) : real(a); }, seed);
 const page = await context.newPage();
 await page.clock.install({ time: 0 });
 // Counts the game's animation frames so the clock can be aligned to the 16 ms frame grid.
 await page.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__frames = 0; window.requestAnimationFrame = cb => raf(t => { window.__frames++; return cb(t); }); });
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
 const target = new URL(url); target.searchParams.set('renderer', renderer);
 await page.goto(target.href);
 await page.waitForSelector('#setupDialog[open]', { timeout: 20000 });
 await page.clock.pauseAt(30000);
 const frames = () => page.evaluate(() => window.__frames);
 const hidden = id => page.evaluate(id => document.getElementById(id).hidden, id);
 const open = id => page.evaluate(id => document.getElementById(id).open, id);
 const text = id => page.evaluate(id => document.getElementById(id).textContent.trim(), id);
 const step = async (n = 1) => { await page.clock.runFor(n * FRAME); };
 // Advance to the next frame boundary, one millisecond at a time, so later steps land exactly on frames.
 const align = async () => { const before = await frames(); for (let i = 0; i < 2 * FRAME && await frames() === before; i++) await page.clock.runFor(1); };
 const until = async (predicate, limit, what) => { for (let i = 0; i < limit; i++) { if (await predicate()) return; await step(); } throw new Error('Timed out waiting for ' + what + ' (' + renderer + ')'); };
 const click = async id => { await page.click('#' + id); await step(2); };
 const shot = name => page.screenshot({ path: path.join(out, renderer + '-' + name + '.png') });
 await align();
 await click('startInningsBtn');
 // The toss (revision 30). The coin face comes from the fixture seed, which a match restart keeps, so when the
 // opposition win and choose to bat, replaying the fixture from the toss and calling the face that came up wins it.
 let call = 'heads', batting = false;
 const toss = [];
 for (let attempt = 0; attempt < 4 && !batting; attempt++) {
  await until(() => open('tossDialog'), 120, 'the toss');
  await click(call === 'tails' ? 'tailsBtn' : 'headsBtn');
  const face = await text('tossCoin') === 'T' ? 'tails' : 'heads';
  const won = !await hidden('tossDecision');
  if (won) await click('tossBatBtn');
  await click('tossContinueBtn');
  await until(async () => !await open('tossDialog') && !!await page.evaluate(() => document.getElementById('game').dataset.bowling), 120, 'the toss to close');
  batting = await page.evaluate(() => document.getElementById('game').dataset.bowling === 'false');
  toss.push(call + (won ? ' won, bat' : ' lost, opposition ' + (batting ? 'bowl' : 'bat')));
  if (!batting) { await click('menuBtn'); await click('settingsBtn'); await click('restartMatchBtn'); await click('confirmRestartBtn'); toss.push('fixture replayed'); call = face; }
 }
 if (!batting) throw new Error('The player is still bowling after four tosses');
 await step(90);
 await shot('batting-ready');
 await click('bowlBtn');
 // A player-started over releases each ball itself when the pre-delivery brief ends (releasePrepared, called
 // from the frame clock), so the tool steps single frames until the brief closes: that frame set the engine
 // time to -850 ms and the frame clock to its own time. A visibilitychange event 14 ms into the next frame
 // resets the frame clock without touching the engine, so the following frame adds 2 ms instead of 16 and
 // every later frame lands on a multiple of 16 ms from release: 0 ms after 53 frames, 400 after 78, 1200 after 128.
 await until(async () => await hidden('deliveryBrief'), 700, 'the pre-delivery brief to end');
 await page.clock.runFor(14);
 await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
 await page.clock.runFor(2);
 let elapsed = -848;
 const captured = [];
 for (const t of times) {
  const n = Math.round((t - elapsed) / FRAME);
  if (n > 0) { await step(n); elapsed += n * FRAME; }
  await shot('flight-' + t + 'ms');
  captured.push(t + ' ms' + (elapsed !== t ? ' (frame at ' + elapsed + ' ms)' : ''));
 }
 await until(async () => await hidden('arrivalCue'), 400, 'the ball to reach the bat');
 await step(56);
 await shot('field-replay');
 const info = await page.evaluate(() => { const text = id => document.getElementById(id).textContent.trim(); return { team: text('gameLabel'), batter: text('batterName'), bowler: text('bowlerName'), three: !!document.querySelector('canvas.three-field') }; });
 await context.close();
 return { toss, captured, info, errors };
}

// Side-by-side composites, one per frame, when more than one renderer was captured.
async function composite(name) {
 const files = renderers.map(r => path.join(out, r + '-' + name + '.png')).filter(f => fs.existsSync(f));
 if (files.length < 2) return;
 const context = await browser.newContext({ deviceScaleFactor: 1 });
 const page = await context.newPage();
 const images = files.map((f, i) => '<figure><figcaption>' + renderers[i] + '</figcaption><img src="data:image/png;base64,' + fs.readFileSync(f).toString('base64') + '"></figure>').join('');
 await page.setContent('<style>body{margin:0;background:#101f27;color:#f7f7ef;font:14px sans-serif}main{display:flex;gap:8px;padding:8px}figure{margin:0}figcaption{padding:4px 0}img{display:block}</style><main>' + images + '</main>');
 await page.screenshot({ path: path.join(out, 'compare-' + name + '.png'), fullPage: true });
 await context.close();
}

const report = {};
for (const renderer of renderers) report[renderer] = await capture(renderer);
for (const name of ['batting-ready', ...times.map(t => 'flight-' + t + 'ms'), 'field-replay']) await composite(name);
await browser.close();
const first = report[renderers[0]];
console.log('frames written to', out, '· season seed ' + seed + ' (SEED=' + seed + ' repeats it)', '· toss: ' + first.toss.join(', '), '·', first.info.team + ', ' + first.info.bowler + ' to ' + first.info.batter, '· flight frames at ' + first.captured.join(', '));
for (const renderer of renderers) { const r = report[renderer]; console.log(renderer + ': ' + (renderer === 'three' ? (r.info.three ? 'three.js canvas present' : 'three.js canvas MISSING') + ' · ' : '') + (r.errors.length ? 'page errors: ' + r.errors.join(' | ') : 'no page errors')); }
