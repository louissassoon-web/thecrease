# Revision 31 - behind-arm bowling and release control

11 October 2026. Single self-contained HTML. Scoring remains 27, fielding remains 30 and the save schema remains 5. New manually prepared balls use manualBowling version 31. The batting gestures, AI delivery model and 2600 ms flight clock are unchanged.

## Changes

The camera is lower and closer to the delivery arm, mirrored for the bowler's arm. It targets the striker's stumps. The existing smooth transition to fielding remains in place.

Line and variation selectors are replaced with a two-axis gallery. Horizontal dragging moves the aim across the physical bowling view; line order mirrors for left-handed batters. Upward swipes show the next delivery, downward swipes the previous one. Arrow buttons and keyboard controls are also available. The gallery cannot start a run-up or change a ball that has already been prepared. Hold on the pitch or pad, then flick upwards and release to bowl. Bowler and field selectors remain available between deliveries, subject to the existing over restrictions.

The old release curve had a low-end yorker plateau and no full-toss path. The new signed length curve has a yorker interval of about 37 ms. Control changes the small seeded release dispersion. An early miss reaches the batter without pitching; a later miss overpitches. Full tosses use an unbounced ballistic path with no seam/spin kick, no pitching sound or marker, the incoming pace retained at the bat, and a consistent keeper/pad continuation. They remain eligible for LBW when impact and projection warrant it, without a fictional landing test. See [MCC Law 36](https://www.lords.org/getmedia/a4ef9f77-2a25-4f5b-a286-4601f08e6334/Laws-of-Cricket-2017-Code-4th-Edition-%282026%29_5.pdf).

Swing cards now include suitable seam bowlers, using existing movement ratings: outswing from 80, inswing from 90. Swing specialists retain both and left-arm pace retains inswing, adding outswing at 90. Spin families remain separate. This is a game repertoire based on the existing ratings, not a newly researched assertion about every named player's real-world skill set. Each card shows the existing individual control value and labels swing as movement in the air.

## Checks

- The unedited balance harness passes 48 / 48. Its output is byte-identical to R30. `balance-before.txt` is the retained R30 output and `balance-after.txt` is the R31 run.
- `node review-check.cjs` passes all 82 portable review groups.
- Six new groups exercise actual gallery/input handlers, both touch surfaces, cancellation, save/resume, full-toss geometry and scoring, mirrored swing, camera projection, and exact R30 prepared paths/outcomes/RNG.
- The R30 continuous-length fixture now starts its comparison below zero because early releases can be full tosses. No target or balance fixture was changed.
- Harness SHA-256: `8e09003ca2128e0684c87cf7f034178631aac2bd88c3c4f439aa3c4973c59747`.

Across 200 seeded deliveries, using the same AI and line for paired release offsets:

| Release | Runs per ball |
| --- | ---: |
| Early full toss, 620 ms | 2.575 |
| Yorker, 680 ms | 0.625 |
| Overpitched, 740 ms | 1.965 |

These are game measurements showing the cost of missing the yorker. They are not real-world scoring estimates or a guarantee that a full toss cannot take a wicket. A 1 ms sweep across those deliveries finds a 36-37 ms yorker interval. The input-offset setting remains available.

## Presentation verification

Native-canvas frames were inspected at 500 ms, 900 ms and after release. The bowler fills more of the foreground, the view looks over the bowling shoulder and the target end remains visible. Draw loops and the gallery consume no match RNG. No browser CSS-layout or Android performance test was available. Phone touch feel is the remaining play-test check.
