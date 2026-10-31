# Three.js renderer, stage 1 - validation

Branch `claude/reverent-swanson-ceb24c`, after merging master at 590488d (the frames tool's toss fix at 3fd6837 and the revision 33 follow-up). The renderer is selected with `?renderer=three` or the `cricket.renderer` storage key; the canvas renderer stays the default and the committed `dist/index.html` is the plain page.

## Builds

| Page | Bytes | sha256 |
| --- | --- | --- |
| Plain (`npm run build`, committed) | 668,294 | 4c5f1946a6000e92d86d29a1d45d0db20fa33d74646220fefccf3a4119970fac |
| Bundled, minified (`npm run build:bundle`) | 1,189,498 | ab2f293f75f1c390f236cbb9e761d2c014f68e03218c20ba32e342a54007edb4 |

The bundled page carries three.js 0.187.0 tree-shaken for this scene (1,233,564 bytes unminified, 550,973 bytes minified on its own) and keeps exactly two inline script blocks, `cricket-core` then `cricket-ui`, with the three.js MIT notice inline. The plain page differs from master's revision 33 follow-up page (sha256 0842033f…) only by the renderer seam in `cricket-ui`; `RELEASE.json` records its hash and keeps master's as `previousHtmlSha256`. The follow-up's one-string change to the offline status line moved both hashes; the scene, the seam and the frames are unaffected.

## Suite results

`npm run build:check` reproduces the recorded plain page. `node review-check.cjs`: all 90 portable review groups passed. `node check-balance.cjs`: 48 of 48 balance checks on the plain page. `npm run check:bundle`: 48 of 48 on the bundled page, then the plain page restored. The engine block is identical in both pages, so the harness output is the same; no fixture or target was changed.

## Frames

`tools/frames-compare.mjs` with `SEED=12345`, `RENDERERS=canvas,three` and the default `TIMES=0,400,1200`, against the bundled page served from `dist/` on a local server, Pixel 7 profile (412 x 839 CSS px at 2.625x), headless Chrome. The seed gives London (Phil Salt, right-handed) facing Kagiso Rabada; the first toss call loses and the opposition bat, the fixture is replayed from the toss, tails wins and the player bats. Both renderers run on Playwright's fake clock stepped one 16 ms frame at a time from the same seed, so each pair of frames shows the same engine state at exactly 0, 400 and 1200 ms after release, plus the ready frame and the field replay 900 ms after the arrival cue closes. No page or console errors in either run. The capture is repeatable: the composites and crops here were taken before master's revision 33 follow-up was merged, and a capture after the merge (bundle sha256 ab2f293f…) produced byte-identical composites at 0, 400 and 1200 ms, in the field replay and in the crop at the bat; an earlier pair of captures twenty minutes apart differed only in a single one-pixel column at the right edge of the canvas page's field-replay frame, nothing in the scene.

- `compare-flight-0ms.png`, `compare-flight-400ms.png`, `compare-flight-1200ms.png`: canvas left, three.js right. The batter, the stumps and bails at both ends, the creases, the nine fielders, the bowler, the non-striker and the umpire sit on the same pixels in both renderers at all three times, and the batter's stance and backlift match the canvas poses because they are the same `BatterRig.pose`.
- `compare-field-replay.png`: the replay camera following the ball to the keeper ("COLLECTED - keeper"); the runners, the keeper and the mid-distance fielders agree, as does the thirty-yard circle.
- `zoom-flight-0ms.png`, `zoom-flight-400ms.png`, `zoom-flight-1200ms.png`: 3x crops of the same regions (the bowler's hand at release, mid-pitch, and the bat). The ball is within a pixel in each pair. The scene draws the ball at the canvas renderer's 2.6 px minimum, growing it with depth; at true scale a 7 cm ball is a one-pixel dot at the bowler's end.

What agrees to the pixel does so because the scene reproduces `View.project` (focal length .98 h, principal point at .52 w and .43 h, scene x mirrored) rather than approximating it; no per-object calibration was needed.

## Differences that are not parity failures

The scene has a flat sky, no stands, crowd, floodlights, clouds, pitch scuffs, wear marks, helmet grille, kit trim, crest or pattern, long projected shadows or bat seam lines; its sightscreens are plain boxes, its shadows are soft blobs under the feet and the ball. The canvas terrain stripes only the positive-x half of the outfield (`grass[i%2]` is undefined for negative `i`, so the previous fill stays); the scene stripes both halves. These are presentation details for later stages.

## Unverified

Frame rate and draw-call cost on a phone (about three hundred small meshes per frame, no merging or instancing); WebGL context loss (the event is prevented from defaulting, nothing is rebuilt); the bowling view and the replay cameras beyond a visual glance; Test-format colours; the review suite's UI facade groups still run only against the plain page; a Settings toggle and a user-facing three.js licence line remain to be added before the three.js renderer can ship. No Android screenshot or smoothness measurement is claimed.
