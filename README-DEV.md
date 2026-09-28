# Developer workflow

This repository turns the single-file game into editable sources without changing what ships. `dist/index.html` is still the whole game; it is built from `src/` and can be reproduced byte for byte.

## Handover from a single-file pack (do this when revision 24 arrives)

1. Copy the pack's `dist/index.html` over `dist/index.html`, and its `review-check.cjs`, `check-*.cjs`, `review-fixtures/` and `PROJECT_NOTES.md` into the repository root, replacing the old ones.
2. `npm run split` regenerates `src/` from that file.
3. `npm run build:check` proves the split is lossless (it compares against `RELEASE.json` when present, else the file itself).
4. `npm run check` proves the suite and the balance harness pass.
5. Commit. From here on, edit `src/`, never `dist/`.

`node tools/split.mjs path/to/other.html` splits a file that is not yet in `dist/`.

## Building

- `npm run build`: plain build, `src/ui.js` inlined verbatim. Byte-identical to the source pack when nothing has changed.
- `npm run build:bundle`: bundles `src/ui/index.js` with esbuild (ES modules and npm imports allowed, e.g. `three`), inlined as the same `<script id="cricket-ui">` block. Add `--minify` for a smaller file. Use this once the renderer work begins.

## Adding three.js

```sh
npm install three
```

Then import it from modules under `src/ui/` and build with `npm run build:bundle`. Keep the canvas renderer selectable behind a flag until the new one passes the same checks; delete it afterwards.

## Seeing the game while working

`npm run serve`, then open `http://localhost:8000`, or capture reference frames with `npm run frames` (after `npx playwright install chromium` once; set `CHROMIUM_PATH` to use an existing Chromium). `tools/frames.mjs` writes the batting view at release, mid-flight and arrival, plus a field-replay frame, into `frames/`. Those frames are the evidence for any renderer or animation change: both renderers must agree on ball and player positions.

## Tests

- `node review-check.cjs`: the engine maintainer's portable regression groups (DOM and canvas facades, no browser).
- `node check-balance.cjs`: gameplay balance acceptance; targets are design ranges and are changed only deliberately, with the reason recorded.
