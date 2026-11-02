# Revision 36 verification

This is a presentation and return-prompt update. `src/core.js` is byte-identical to revision 35. Scoring version 35, schema 5, older prepared deliveries, the swipe grammar and the 2600 ms delivery clock are unchanged. Presentation does not draw from match RNG.

The field no longer changes height as the delivery briefing, bowling selectors, running controls or return popup appear. The fixed dock and overlays replace the content-sized R35 layout that was resizing the canvas between phases. ResizeObserver now marks pending work; the next animation frame resizes and paints together. Background invalidation rebuilds the cache without resetting the visible canvas. Auto resolution changes wait for a dead ball. Negative-index grass stripes are corrected, and stationary fielder drawings are reused outside the delivery phase too.

Fielding cameras retain the pitch direction rather than orbiting towards the shot. The camera eases for 1.5 seconds and carries its current position into the next-ball transition. Reduced motion dissolves between steady views for 400 ms. Menus and the run-out card have short opacity fades, without pulses, flashes, scaling or sliding. The scene and stadium use the same drawing path throughout.

Return choices require a batter currently running between creases and a real return route capable of a run-out or arriving within 0.25 seconds of bat grounding. Both routes use the actual collector and receiver positions. “Runout Chance!” holds the replay at collection and offers both ends, including taps on the wickets. Choosing an end permits fast-forward again. Safe returns continue automatically. The predicate is cached by result and replay time, so resumed older saves are assessed at their current time. It does not alter the precomputed automatic route or consume RNG.

| Check | Result |
| --- | --- |
| Unedited `node check-balance.cjs` | 48 / 48 |
| `node review-check.cjs` | 112 groups |
| `node check-offline.cjs` | 12 / 12 |
| `node tools/build.mjs --check` | Exact recorded HTML hash |
| Pure engine | Byte-identical to R35 |
| Balance output | Byte-identical to R35 output |

Five new facade groups exercise safe automatic returns at 4×, real running and throw margins, resize notifications without blank canvas exposure, camera continuity into the next ball, and path fitting without camera orbit or RNG use. The R34/R35 return-tap fixtures now select a close running situation at the time being tested; their old expectation of a prompt after every pickup conflicts with the requested behaviour. Historical scoring comparisons are unchanged. The acceptance harness is untouched and no balance targets are disputed.

Browser QA used the managed Chromium preview. At 390×844, the field stayed at x=0, y=90, width=390, height=474 through batting preparation, flight, keeper collection, the next ball, bowling setup and introduction. At 360×640, the pad view measured 360×288 and the full-screen view 360×396; both had no document overflow. Both throw buttons measured 44 px tall and stayed within the screen. The run-out popup appeared, selecting the bowler's end removed it, and fast-forward became available again. Landscape at 844×390 has a 522×326 field and 320 px control column with no overflow; an inherited full-screen 400 px minimum was removed during this check.

Evidence: `browser-layout.json` records DOM measurements and phase histories; `runout-phone.jpg` shows the popup using an isolated synthetic saved-match fixture. The temporary fixture controls and JSON files are excluded from deployment. An attempted browser file upload stalled; the remaining visual checks used that isolated local fixture selector. Native Android touch latency, frame rate, audio and personal motion comfort were not measured. These checks establish the fixes to layout, camera continuity and prompts, not a guarantee about how every phone will feel.

Full command output is in `review.txt`, `balance.txt` and `offline.txt`.
