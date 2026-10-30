# Revision 29 validation

This is a presentation and navigation repair on scoring version 27. `check-balance.cjs` remains byte-for-byte unchanged. `balance.txt` is byte-identical to R28, with all 48 checks passing. The complete review result is in `review.txt`.

## Reproduced problems and fixes

- A swipe released at -400 ms of the run-up was accepted as a ground shot, with 1,907 ms early feedback. It now stays an aiming action. Real releases after the ball leaves the hand retain their actual error; the fix does not clamp away bad timing. Gestures also belong to one prepared ball, and late frame timestamps cannot move the clock backwards.
- Both pad stances used the same right-handed camera. Pad and full views now mirror consistently, with the same elevated shoulder angle.
- The result sequence led to the league screen with no shop link. A visible shop/balance button now opens the real shop there, and returns to the fixtures after buying. Mid-match access remains denied, including stale button events.
- The renderer repeated sphere-vertex trigonometry and rebuilt stationary fielders every frame. Pixel-sized geometry, reusable unit meshes, early polygon clipping checks and stationary sprite caching reduce that work. Moving players and nearby ball depth sorting remain live.
- The contact pose aimed at a nominal position, while the ball continued past it during an extra settling wait. New presentations remove that wait, carry leftover frame time across impact, and aim a successful stroke at the actual displayed incoming ball. Footwork and bat angle adapt together; arm lengths and grip attachment are checked. Existing prepared presentations still resume on their saved path.

## Measurements

Local native canvas, 390 x 400 pad field, 100 frames with 10 warm-up frames excluded. This uses the existing DOM facade and the host's installed native canvas; no game dependency was added. Timings do not certify Chrome layout or a phone frame rate.

| Draw measurement | R28 | R29 |
| --- | ---: | ---: |
| Median | 75.64 ms | 21.93 ms |
| 95th percentile | 96.67 ms | 31.34 ms |
| Canvas calls per frame, including warm-up | 29,498 | 12,671 |

The representative frame sample measured the distance between the drawn ball centre and the intended blade contact point at impact. A cricket ball has a 3.6 cm rendering radius; up to 2.9 cm centre separation remains an intersection with the bat in this sample.

| Stroke | R28 separation | R29 separation |
| --- | ---: | ---: |
| Sweep, 0 ms | 0.80 m | <0.001 m |
| Sweep, 100 ms late | 1.51 m | 0.029 m |
| Drive, 100 ms late | 1.66 m | <0.001 m |
| Left-handed drive, 0 ms | 0.51 m | <0.001 m |

The new portable suite exercises both hands, early/on-time/late releases, attached gloves, fixed arm lengths, real post-match purchases and return navigation, input guards, spare frame time at impact, stationary drawing reuse and exact save/resume. The two changed older UI expectations were an immediate `Shot played` title before resolution and the artificial 35 ms impact delay; timing/scoring assertions remain.

The PNG files are canvas-only evidence. Chromium was not installed in this workspace, so responsive browser layout, touch latency and Pixel performance still need device play-testing. No monetisation or gameplay calibration was added.
