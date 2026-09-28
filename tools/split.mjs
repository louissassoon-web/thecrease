// Split the single-file game into editable sources. Lossless: `node tools/build.mjs --check`
// must reproduce dist/index.html byte for byte from what this writes.
//   node tools/split.mjs [path/to/index.html]
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const input = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist/index.html');
const html = fs.readFileSync(input, 'utf8');
const cut = (text, startMarker, endMarker, from = 0) => {
  const a = text.indexOf(startMarker, from); if (a < 0) throw Error('missing ' + startMarker);
  const b = text.indexOf(endMarker, a + startMarker.length); if (b < 0) throw Error('missing ' + endMarker);
  return { start: a, inner: text.slice(a + startMarker.length, b), end: b + endMarker.length };
};
const style = cut(html, '<style>\n', '</style>');
const core = cut(html, '<script id="cricket-core">\n', '</script>');
const ui = cut(html, '<script id="cricket-ui">\n', '</script>', core.end);
const fontLines = [], cssLines = [];
for (const line of style.inner.split('\n')) (line.startsWith('@font-face{') ? fontLines : cssLines).push(line);
const write = (rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); console.log('wrote', rel, text.length); };
write('src/head.html', html.slice(0, style.start));                         // doctype, meta, title, up to <style>
write('src/styles/fonts.css', fontLines.join('\n') + (fontLines.length ? '\n' : ''));
write('src/styles/app.css', cssLines.join('\n'));                          // everything else in the style block, order preserved
write('src/markup.html', html.slice(style.end, core.start));                // </style></head><body> ... markup
write('src/core.js', core.inner);
write('src/between.html', html.slice(core.end, ui.start));                  // whitespace between the two scripts
write('src/ui.js', ui.inner);
write('src/tail.html', html.slice(ui.end));                                 // </body></html>
// Record the order of css lines so build can interleave fonts back into their original positions.
const order = style.inner.split('\n').map(l => l.startsWith('@font-face{') ? 'F' : 'C').join('');
write('src/styles/order.txt', order);
console.log('split complete from', input);
