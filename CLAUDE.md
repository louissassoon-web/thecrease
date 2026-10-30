# Cricket · The crease

Single-file browser cricket game (swipe batting, deterministic simulation, league seasons). `dist/index.html` is GENERATED from `src/` by `tools/build.mjs`; never hand-edit it. Read `README-DEV.md` for the workflow.

## Layout

- `src/core.js`: the pure engine, exported as the frozen global `Cricket`. Deterministic and seeded: every random draw comes from `RNG.stream`; `Math.random` is forbidden here. Presentation code never advances match RNG.
- `src/ui.js`: pointer input, canvas rendering, audio, menus, storage. Reads engine state; the only writes are through engine calls and `persist()`. `Platform`, at the top of the script, owns storage, haptics, full screen, offline install, file export and the shell events `cricket:pause` and `cricket:back`; UI code calls `Platform`, not the browser or Capacitor APIs directly, so a native shell can replace them (see `APP_STORE_READINESS.md`).
- `src/ui/index.js`: module entry for the bundled UI (`--bundle`). New presentation code (renderer, three.js) is imported from here, not appended to `src/ui.js`.
- `src/markup.html`, `src/head.html`, `src/tail.html`, `src/styles/*.css`: the page. `order.txt` records how font and CSS lines interleave; re-run `npm run split` rather than editing it by hand.
- `dist/index.html` must keep exactly two inline script blocks with ids `cricket-core` and `cricket-ui`, in that order. The test harnesses parse them.
- `dist/sw.js`, `dist/manifest.webmanifest`, `dist/icon-*.png`: static files for the hosted progressive-web-app build, committed as they are; the build writes only `dist/index.html`, which must still play when opened on its own. Bump `VERSION` in `dist/sw.js` for every hosted release and keep its `SHELL` list equal to the files in `dist/`.
- `review-check.cjs`, `check-*.cjs`, `review-fixtures/`: regression suite from the engine maintainer's pack. `check-balance.cjs`: gameplay balance acceptance. Both must pass before and after every change.

## Rules

1. Run `npm run build:check` after touching styles or markup: the plain build must reproduce the recorded HTML byte for byte, or you have changed something you did not intend to. The review suite's UI groups patch `src/ui.js` by source text (`replaceFunction` in `check-display-input.cjs`), so they run only against the plain build; a bundled build (`npm run build:bundle`) is checked with `npm run check:bundle` (engine harness) plus the Playwright smoke test and `npm run frames`. Adapting the UI facade to the bundled output is part of the renderer work, not something to skip.
2. Run `npm run check` before claiming anything works. A change to a regression fixture needs a stated reason in `PROJECT_NOTES.md`.
3. Engine changes (scoring, physics, AI, rules) are versioned: new deliveries carry a new `scoringVersion`; already prepared balls in old saves keep their rules. Do not change `CareerSave` validation so that an older save fails; a save that fails validation is backed up before replacement, never discarded.
4. Presentation work goes behind a flag until it reaches parity with the canvas renderer, and is judged with screenshots at fixed engine times (Playwright), not by description. Contact must be drawn where `Fielding.contactOrigin` says; fielders where `Fielding.frame` says; the ball where `BallView` says.
5. No runtime network requests from the game: fonts are embedded, licences stay in Settings, nothing third-party, no telemetry. The one exception is the hosted build's service worker refreshing the game's own files from its origin (`dist/sw.js`, and `registration.update()` when the app returns to the foreground); it never runs from `file:` or inside a native shell. Output stays one HTML file; budget 1.2 MB uncompressed once three.js is bundled.
6. Do not change presentation clocks, the swipe grammar (`Gesture`), the Test ball-by-ball design or the save schema number without an explicit decision.
7. British English in all copy. Keep the existing tone of `PROJECT_NOTES.md` when adding entries: what changed, why, what was measured, what remains unverified.

## Commands

- `npm run split [file]`: regenerate `src/` from a single-file build (used at handover from the engine maintainer's pack).
- `npm run build` / `npm run build:check` / `npm run build:bundle`.
- `npm run check`: regression suite plus balance harness.
- `npm run serve`: local server on port 8000 for Playwright and manual play.
