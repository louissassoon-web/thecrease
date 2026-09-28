// Reassemble dist/index.html from src/. With --check, fail unless the result matches
// the recorded hash in RELEASE.json (or the existing dist file when no hash is recorded).
//   node tools/build.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fonts = read('src/styles/fonts.css').split('\n'); if (fonts.at(-1) === '') fonts.pop();
const css = read('src/styles/app.css').split('\n');
const order = read('src/styles/order.txt');
let fi = 0, ci = 0; const styleLines = [];
for (const kind of order) styleLines.push(kind === 'F' ? fonts[fi++] : css[ci++]);
if (fi !== fonts.length || ci !== css.length) throw Error('style line count does not match order.txt; re-run split after editing styles, or update order.txt');
// --bundle: build the UI from the module entry src/ui/index.js with esbuild (imports allowed,
// e.g. three.js), inlined as the same <script id="cricket-ui"> block. Plain builds use src/ui.js verbatim.
let uiScript = read('src/ui.js');
if (process.argv.includes('--bundle')) {
  const esbuild = await import('esbuild');
  const result = await esbuild.build({ entryPoints: [path.join(root, 'src/ui/index.js')], bundle: true, format: 'iife', platform: 'browser', target: ['es2022'], write: false, minify: process.argv.includes('--minify'), legalComments: 'inline', logLevel: 'warning' });
  uiScript = result.outputFiles[0].text;
  console.log('bundled src/ui/index.js with esbuild:', uiScript.length, 'chars');
}
const html = read('src/head.html') + '<style>\n' + styleLines.join('\n') + '</style>' + read('src/markup.html')
  + '<script id="cricket-core">\n' + read('src/core.js') + '</script>' + read('src/between.html')
  + '<script id="cricket-ui">\n' + uiScript + '</script>' + read('src/tail.html');
const out = path.join(root, 'dist/index.html');
const sha = crypto.createHash('sha256').update(html).digest('hex');
if (process.argv.includes('--check')) {
  let expected = null;
  try { expected = JSON.parse(read('RELEASE.json')).htmlSha256; } catch {}
  if (!expected && fs.existsSync(out)) expected = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
  if (expected !== sha) { console.error('CHECK FAILED: built sha256 ' + sha + ' expected ' + expected); process.exit(1); }
  console.log('CHECK OK: build reproduces the recorded HTML (' + sha.slice(0, 12) + ')');
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('built dist/index.html', html.length, 'chars, sha256', sha);
