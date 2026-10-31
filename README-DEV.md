# Developer workflow

This repository turns the single-file game into editable sources without changing what ships. `dist/index.html` is still the whole game; it is built from `src/` and can be reproduced byte for byte.

## Handover from a single-file pack (every upstream revision)

1. Copy the pack's `dist/` over `dist/` (the page, plus `sw.js`, `manifest.webmanifest` and the icons when the pack ships them), and its `review-check.cjs`, `check-*.cjs`, `audit-*.cjs`, `review-fixtures/`, `validation-v*/`, `PROJECT_NOTES.md`, `BALANCE_REPORT.md`, `PLAYER_PROFILES.md` and `player-profiles.json` into the repository root, replacing the old ones; the pack's `README.md` becomes `UPSTREAM-README.md`.
2. `npm run split` regenerates `src/` from that file.
3. Update `RELEASE.json` (revision, date, upstream commit, `htmlSha256` of the new page, `harnessSha256` of `check-balance.cjs`), then `npm run build:check` proves the split is lossless (it compares against `RELEASE.json` when present, else the file itself).
4. `npm run check` proves the suite and the balance harness pass; record the counts in `RELEASE.json`. Compare the outputs with the pack's `validation-vN/` records: they should be identical.
5. Commit. From here on, edit `src/`, never `dist/`.

`node tools/split.mjs path/to/other.html` splits a file that is not yet in `dist/`. A revision that did not come from the upstream pack (revision 33 came from the design canvas) is handed over the same way: split that file, `npm run build`, and confirm the result is byte-identical to the source before anything else.

## Building

- `npm run build`: plain build, `src/ui.js` inlined verbatim. Byte-identical to the source pack when nothing has changed.
- `npm run build:bundle`: bundles `src/ui/index.js` with esbuild (ES modules and npm imports allowed, e.g. `three`), minified and inlined as the same `<script id="cricket-ui">` block. The bundle carries three.js, which is 1.23 MB unminified on its own, so the minified build is the one measured against the 1.2 MB page budget; `node tools/build.mjs --bundle` without `--minify` gives a readable bundle for debugging. Note: the review suite's UI facade groups fail on a bundled build because they patch the UI source by text; run `npm run check:bundle` for the engine harness and rely on Playwright for the UI until the facade is adapted.

## The three.js renderer

`three` is pinned in `package.json` and imported only from `src/ui/three/`, so the plain build never carries it. `src/ui/three/register.js` publishes `window.CricketRenderer` before `src/ui.js` runs; `src/ui.js` creates the renderer when the page is opened with `?renderer=three` or the `cricket.renderer` storage key is `three` (the URL wins, and `?renderer=canvas` forces the canvas renderer for that load). Nothing in Settings switches it yet. With the flag off, or in the plain build, the seam in `src/ui.js` is inert and the canvas renderer draws exactly as before.

When the three.js renderer is active, `drawField` hands it the camera it fitted, the stumps, the ball and every posed player, and clears the 2D canvas instead of painting the backdrop; the 2D canvas stays on top as a transparent overlay for the aim line, gesture trail, bowling guide, catch targets and labels, and pointer input still lands on it. `src/ui/three/renderer.js` draws the scene: it reproduces `View.project` (focal length .98 h, principal point at .52 w, .43 h, scene x mirrored) so both renderers put a point on the same pixel. Keep the canvas renderer selectable until the new one passes the same checks; delete it afterwards.

`node tools/frames-compare.mjs [url] [outDir]` is the parity check: it runs the page on Playwright's fake clock stepped one 16 ms frame at a time, captures each renderer in `RENDERERS=` (default `canvas,three`) on identical engine frames at the engine times in `TIMES=` (default `0,400,1200` ms after release) plus the ready and field-replay frames, and writes `compare-*.png` side by side; `SEED=` repeats a fixture. Give it the bundled build on a local server (`npm run build:bundle`, `npm run serve`) and `CHROMIUM_PATH` as for `npm run frames`.

## Seeing the game while working

`npm run serve`, then open `http://localhost:8000`, or capture reference frames with `npm run frames` (after `npx playwright install chromium` once, or with `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` to use the installed Chrome without a download). `tools/frames.mjs` starts a T20 season on a Pixel 7 profile, calls the toss and bats first (when the opposition win and choose to bat, it replays the fixture from the toss and calls the face that came up, which the fixture seed repeats), starts the over, lets the pre-delivery brief run, and writes `batting-ready`, `flight-release`, `flight-mid`, `flight-at-bat` and `field-replay` into `frames/`; the flight frames are taken at fixed engine distances read from the arrival cue. It prints the season seed, and `SEED=<that number> npm run frames` repeats the same fixture, toss and delivery, which is what a comparison between renderers needs. Page errors and console errors are printed with the result. Those frames are the evidence for any renderer or animation change: both renderers must agree on ball and player positions.

On any http(s) origin, `npm run serve` included, the page registers `dist/sw.js`, which caches `index.html` and serves the cached copy first. When comparing builds on the same origin, use a fresh browser context or unregister the worker; `tools/frames.mjs` opens a new context each run, so it is unaffected.

## Tests

- `node review-check.cjs`: the engine maintainer's portable regression groups (DOM and canvas facades, no browser).
- `node check-balance.cjs`: gameplay balance acceptance; targets are design ranges and are changed only deliberately, with the reason recorded.
