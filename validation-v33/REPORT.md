# Revision 33 validation

Scope: platform readiness only. `cricket-core` is byte-for-byte unchanged; all edits are in the document head, the stylesheet, the dialog markup and `cricket-ui`, plus new files `sw.js`, `manifest.webmanifest` and four icons.

## Checked here
- `dist/index.html` loads in Chromium with no console errors or warnings; the UI script and `sw.js` parse.
- Settings shows the Haptic feedback and Graphics rows in the existing row style; the pause menu shows the offline status line and hidden update/install buttons; the scorecard hand selector and dialog close buttons are 44 px.
- Bowling-ready dock: selects and action buttons at 44 px fit the 330 px dock (233 px of content in a 240 px row), the 256 px full-view dock and the unchanged 190 px landscape dock.
- Background behaviour: with the preview hidden, the game paused, saved and opened the menu, as designed; `requestAnimationFrame` is suspended by the browser while hidden, so no battery is spent.
- Storage routing: 15 UI storage calls go through `Platform.storage`; the Sound module keeps its two direct calls so the legacy Sound slice test still runs unchanged.

## Not checked here
- `node check-balance.cjs` (48 checks) and `node review-check.cjs` (90 groups) were not run; Node is unavailable in this environment. Expected: balance output byte-identical to R32; review groups pass because the facade constraints were respected (no new globals at load, new element ids exist in markup, `resize` keeps its name and position, exported helper names unchanged).
- Device testing: Android and iPhone swipe feel, safe-area insets on notched phones, haptic strength, audio after an interruption, Auto graphics step-down, home-screen install and offline relaunch.

SHA-256 of dist/index.html: 0220bdbf2b96472d9466ba1f246b57aaf5495379b2c5b65417f908464451b07b

## Verified in the repository (30 October 2026)

Handed over with `tools/split.mjs` from the design canvas build, which `npm run build` reproduced byte for byte (sha256 0220bdbf…) before the fixes listed below; `build-check.txt` records the committed build. `src/core.js` is unchanged from revision 32.

- `node review-check.cjs`: all 90 portable review groups pass; output identical to revision 32 (`review-after.txt`).
- `node check-balance.cjs`: 48 passed, 0 failed; output byte-identical to revision 32 (`balance-before.txt` is revision 32, `balance-after.txt` is revision 33).
- Chromium, served from `dist/` on localhost: no console errors; `sw.js` registers and controls the page; the pause menu shows "Ready to play offline…" with `#updateBtn` and `#installBtn` present but hidden; Settings shows Haptic feedback and Graphics in the existing row style; `#graphicsSelect` 150×44, dialog close buttons 44×44, font-licence summary 44 px high, timing buttons 44 px.
- `tools/frames.mjs` (Chrome through `CHROMIUM_PATH`) stops at the toss dialog, which revision 30 introduced after the tool was written, so no frame capture exists for this revision.
- Not done: the device checks listed above.
- Browser screenshots from the served build: `menu-desktop-offline-status.jpg`, `settings-desktop.jpg`, `menu-phone-375.jpg`, `settings-phone-375.jpg` (375×812 emulation: dialog 351 px wide inside a 12 px margin, Graphics label 143 px beside the 150×44 select, no horizontal overflow).

## Fixes applied at handover

The canvas code was reviewed through four independent lenses (correctness, lifecycle and platform, repository rules, accessibility and copy): 16 findings. Eleven were fixed in `src/ui.js`, `src/markup.html` and `dist/sw.js` and are listed in `PROJECT_NOTES.md` under revision 33; none changes the look or the engine. Three were documentation corrections to `APP_STORE_READINESS.md` (hydration keys, `localhost` registration, the unmirrored `cricket.sound`). One was declined: routing the Sound module through `Platform.storage`, which the design kept direct so the legacy sound slice test runs unchanged. One was a policy question rather than a defect: the hosted build's service worker makes same-origin requests for the game's own files, which the repository rule on network requests did not anticipate; `CLAUDE.md` rule 5 now names that one exception. The suites above were re-run after the fixes.

A twelfth fix came from the browser test: after a rebuild, the first reload served the cached page and the worker refreshed its cache, but the update message was posted while the page was still navigating and was lost, so the button never appeared; by the second reload the cache already held the new copy. The page now posts `check` to the worker on launch and on return to the foreground, and the worker compares the cached page with the network copy and answers that page. Retested below.

Retest of the update path after the fix (Chromium, localhost): with a deliberately stale copy in the worker's cache, a reload served that copy, the page asked the worker, the worker found the network copy changed, replaced the cache entry and the page showed "Update ready · Reload the game" at the top of the pause menu within four seconds (`menu-update-ready.jpg`). Nothing reloaded by itself.

## Review verification completed (31 October 2026)

The four-lens review's verification stage finished after the handover: 22 raw findings, 17 after merging duplicates, 13 confirmed by at least two of three checkers (code, reproduce, scope), four refuted. Eleven confirmed findings were already fixed in the handover commit; the offline status line ("home screen") is fixed in the follow-up commit; routing `cricket.sound` through `Platform.storage` was tried, passed the portable suite, and was reverted because `check-settings-weather.cjs` line 44 runs the Sound module with a fake `localStorage` and no `Platform`. Refuted: the `Platform.storage.set` mirror-on-quota claim, the Capacitor plugin lookup timing claim, the Auto graphics measurement claim (device heuristic, listed as unverified), and the rule 5 claim (made against the pre-revision wording). The full verdict is in `independent-review.md`.
