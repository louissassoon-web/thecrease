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
- `npm run build:bundle`: bundles `src/ui/index.js` with esbuild (ES modules and npm imports allowed, e.g. `three`), inlined as the same `<script id="cricket-ui">` block. Add `--minify` for a smaller file. Use this once the renderer work begins. Note: the review suite's UI facade groups fail on a bundled build because they patch the UI source by text; run `npm run check:bundle` for the engine harness and rely on Playwright for the UI until the facade is adapted.

## Adding three.js

```sh
npm install three
```

Then import it from modules under `src/ui/` and build with `npm run build:bundle`. Keep the canvas renderer selectable behind a flag until the new one passes the same checks; delete it afterwards.

## Seeing the game while working

`npm run serve`, then open `http://localhost:8000`, or capture reference frames with `npm run frames` (after `npx playwright install chromium` once, or with `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` to use the installed Chrome without a download). `tools/frames.mjs` writes the batting view at release, mid-flight and arrival, plus a field-replay frame, into `frames/`. Those frames are the evidence for any renderer or animation change: both renderers must agree on ball and player positions.

On any http(s) origin, `npm run serve` included, the page registers `dist/sw.js`, which caches `index.html` and serves the cached copy first. When comparing builds on the same origin, use a fresh browser context or unregister the worker; `tools/frames.mjs` opens a new context each run, so it is unaffected.

## Tests

- `node review-check.cjs`: the engine maintainer's portable regression groups (DOM and canvas facades, no browser).
- `node check-balance.cjs`: gameplay balance acceptance; targets are design ranges and are changed only deliberately, with the reason recorded.
