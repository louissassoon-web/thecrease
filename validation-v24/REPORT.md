# Revision 24 calibration report

28 September 2026. Source/scoring revision 24; save schema 5; player profiles 19.

The supplied, unedited acceptance harness goes from **20 passed, 12 failed** on revision 23 to **32 passed, 0 failed** on revision 24. `node review-check.cjs` passes all **44 portable review groups**. The ten separate display/input checks also pass.

## Contract and scope

`check-balance.cjs` was copied beside `review-check.cjs` and run with `node check-balance.cjs` before any engine edit and again against the final source. Both the supplied file and repository copy have SHA-256:

```text
27da0186d2bf92a3b3bb7ae87a66e2a3bba9dfdb94a09dbbe21b287610c51d3c
```

No harness line, target, fixture population or seed was changed. Calibration changes operate on timing, shot effort, player skills, movement and match situation. No sampled seed is recognised by the engine, and no total, dismissal or match result is imposed.

The batting pass was reported before the AI pass: it passed 14/16 batting checks, with projected mixed/slog totals of 176/128; both outstanding wicket rates were high. Varying edge trajectories and completing the loft/defence calibration then resolved them. Final projected totals are 185/145. Intermediate command outputs are retained in `validation-v24/`.

Angular bounce movement, ellipse dimensions, fielder reach, keeper collection, bowling plans/wides, declaration logic, presentation clocks, swipe grammar, Test time per ball and the three revision 23 safety fixes remain unchanged. There are no new runtime dependencies or features. The optional contest argument to the AI is transient and adds nothing to the save schema.

## PROJECT_NOTES entry

Attacking quality now falls gradually across ordinary phone release offsets. Pace loft coverage is 200-230 ms; spin loft can extend to 270 ms, while ground coverage follows player precision within 210-300 ms. The exponential quality curves are softer, without a quality floor or a power bonus for perfect timing. Ground strokes retain more of their bat contribution at middling quality, so placement and running remain useful.

Loft keeps the 43 m/s player-dependent ceiling and the existing boundary ellipse. Shorter aerial strokes stay flatter; a committed swing opens the face and magnifies angular scatter. Speed falls less steeply with quality, while elevation and direction spread with mistiming. This puts more imperfect full swings into reachable catching arcs. The field still has to intercept the actual flight.

Edges now vary below, above and beside the cordon. Soft defensive edges more often fall short, and defensive timing risk is lower. Movement still raises the edge risk of attacking ground strokes. Catch reach, yorker geometry and keeper collection are unchanged.

The opposition chooses from a perceived line and length and can misread either. Rare large timing errors can miss straight balls; the existing pad and stump geometry decides LBW or bowled. Defence reduces the penalty for a misread. T20 finishers loft more often at the death, with more measured ground effort. Tests select more defensive strokes, and the survival decision considers required rate, wickets, remaining time and a late second-innings deficit. Match context is transient; declarations, clocks and the five-day limit are unchanged.

New balls use scoring version 24. Prepared revision 22 and 23 balls retain exact shot outcomes and AI inputs, and both save revisions remain accepted. Schema 5, profiles 19, swipe grammar, presentation clocks, dependencies and the revision 23 safety fixes are unchanged. The supplied `check-balance.cjs` is byte-for-byte unedited: revision 23 passes 20/32; revision 24 passes 32/32. The 44 portable review groups also pass. See `BALANCE_REPORT.md` and `validation-v24/` for complete output, independent samples and fixture changes.

## Independent delivery curve

The same 240 full/good pace deliveries per format were sampled before and after, with a fixed stream separate from the acceptance harness. These are mean contact quality values for the T20 population, including shot suitability; they are not human timing measurements.

| Stroke | Release error | Revision 23 quality | Revision 24 quality |
| --- | ---: | ---: | ---: |
| Ground | 0 ms | 0.980 | 0.980 |
| Ground | 30 ms | 0.829 | 0.899 |
| Ground | 60 ms | 0.639 | 0.775 |
| Ground | 90 ms | 0.468 | 0.643 |
| Ground | 120 ms | 0.330 | 0.516 |
| Loft | 0 ms | 0.980 | 0.980 |
| Loft | 30 ms | 0.593 | 0.826 |
| Loft | 60 ms | 0.334 | 0.680 |
| Loft | 90 ms | 0.070 | 0.554 |
| Loft | 120 ms | 0.028 | 0.448 |

Full delivery outcomes, including contact, fours, sixes and catches, are in `validation-v24/curve-before.json` and `curve-after.json`. The 30 ms quality cliff is removed. The physical flight and field still determine the score.

## Independent match sample and limits

A separate fixed sample uses 40 T20s and 40 Tests across all eight teams. Final T20 first innings average 178.18, with 6.83 wickets. Tests average 371.70 with a standard deviation of 109.14, at 3.22 runs an over across the matches. Nine Tests draw (22.5%); the side batting last wins 16 of 40 matches. Eight first innings are declared. Test dismissals include 23.12% bowled and 14.21% LBW.

The top seven average 69.8 balls per dismissal in that Test sample, slightly slower than the suggested 55-65 guidance. The acceptance sample has one draw in 14 Tests; the separate sample has nine in 40. These small populations expose sampling variation, so they do not establish a universal draw rate. I have retained this result rather than selecting seeds or forcing time-outs. These diagnostics use the actual seeded engine and the unchanged five-day limit. Android touch feel has not been physically tested in this pass.

## Review checks and fixture changes

```text
node review-check.cjs
All 44 portable review groups passed.

node check-display-input.cjs
10 display and input checks passed.
```

The expected version of newly prepared balls changes from 23 to 24 in the player-profile, spin/drive and fielding regression files. `check-model-v23.cjs` keeps its entrypoint name and now compares revision 22 and 23 prepared-ball outcomes and AI inputs against their frozen engines. Both flight and in-play saves validate. The AI regression also checks that a late deficit increases sustained defensive intent without mutating its match input. No regression assertion encoding the old steep quality curve needed to be relaxed. Older revision 18/19/20 behaviour remains covered.

The source download includes the unedited acceptance harness, frozen engines, report, notes and complete captured output. The test facade checks drawing/input code and finite coordinates; it does not replace browser layout or Android testing.

## Targets I disagree with

None. All 32 supplied acceptance targets are retained and pass. The additional top-order survival guidance and sampling limits are reported above.

## Complete before output - revision 23

```text
FAIL T20 ground strokes, 60 ms timing sd: runs per over                     3.95   target 5-7.5
PASS T20 ground strokes, 60 ms timing sd: balls per wicket                  55.1   target 30-90
PASS T20 ground strokes, 130 ms timing sd: balls per wicket                15.14   target 12-40
FAIL T20 25% loft mix, 60 ms sd: runs per over                              6.36   target 7-10.5
FAIL T20 25% loft mix, 60 ms sd: balls per wicket                          19.08   target 20-60
PASS T20 loft every ball, 60 ms sd: six % of balls                         12.04   target 10-35
PASS T20 loft every ball, 60 ms sd: balls per wicket                        6.52   target 5-16
PASS Projected 20-over total, 25% loft mix at 60 ms sd                       127   target 120-190
FAIL Projected 20-over total, all-loft at 60 ms sd (must trail the mix)      147   target 60-126
FAIL Test ground strokes + 35% defence, 60 ms sd: runs per over             2.28   target 2.8-4.8
PASS Test ground strokes + 35% defence, 60 ms sd: balls per wicket         41.06   target 40-130
FAIL Perfect full-effort loft on a full ball: six %                         97.5   target 55-90
PASS Perfect full-effort loft on a full ball: exit speed m/s           40.03 m/s   target 30-44 m/s
FAIL Loft released 80 ms off: six %                                            0   target 10-45
FAIL Loft released 80 ms off: caught %                                     11.25   target 15-60
PASS Loft released 130 ms off: six %                                           0   target 0-20
PASS AI T20 first-innings mean                                            153.15   target 150-180
PASS AI T20 first-innings standard deviation                               32.45   target 20-45
PASS AI T20 first-innings wickets                                           6.05   target 5-8.5
FAIL AI T20 sixes per innings                                                3.8   target 4-9
PASS AI T20 wides, % of balls                                              3.05%   target 1.5-4.5%
PASS AI T20 lbw, % of dismissals                                            8.6%   target 4-20%
PASS AI Test first-innings mean                                           338.07   target 280-400
PASS AI Test first-innings standard deviation                             119.67   target 55-140
PASS AI Test first innings declared, %                                     7.14%   target 0-30%
FAIL AI Test bowled, % of dismissals                                       4.15%   target 10-30%
FAIL AI Test lbw, % of dismissals                                          4.74%   target 8-25%
PASS AI Test won by the side batting last, %                              42.86%   target 30-65%
FAIL AI Test draws, %                                                         0%   target 5-25%
PASS Pace yorker: median lateral deviation at the crease, degrees           1.1°   target 0-3°
PASS Left pace yorker that passes the stumps: four byes, %                    0%   target 0-5%
PASS Left pace yorker that passes the stumps: keeper collects for no run, %   98.15%   target 75-100%

20 passed, 12 failed of 32 balance checks.
```

## Complete after output - revision 24

```text
PASS T20 ground strokes, 60 ms timing sd: runs per over                     5.79   target 5-7.5
PASS T20 ground strokes, 60 ms timing sd: balls per wicket                    89   target 30-90
PASS T20 ground strokes, 130 ms timing sd: balls per wicket                 25.2   target 12-40
PASS T20 25% loft mix, 60 ms sd: runs per over                              9.25   target 7-10.5
PASS T20 25% loft mix, 60 ms sd: balls per wicket                          27.79   target 20-60
PASS T20 loft every ball, 60 ms sd: six % of balls                         23.25   target 10-35
PASS T20 loft every ball, 60 ms sd: balls per wicket                        5.09   target 5-16
PASS Projected 20-over total, 25% loft mix at 60 ms sd                       185   target 120-190
PASS Projected 20-over total, all-loft at 60 ms sd (must trail the mix)      145   target 60-184
PASS Test ground strokes + 35% defence, 60 ms sd: runs per over             3.09   target 2.8-4.8
PASS Test ground strokes + 35% defence, 60 ms sd: balls per wicket         87.88   target 40-130
PASS Perfect full-effort loft on a full ball: six %                        83.75   target 55-90
PASS Perfect full-effort loft on a full ball: exit speed m/s           40.15 m/s   target 30-44 m/s
PASS Loft released 80 ms off: six %                                         32.5   target 10-45
PASS Loft released 80 ms off: caught %                                      22.5   target 15-60
PASS Loft released 130 ms off: six %                                        6.25   target 0-20
PASS AI T20 first-innings mean                                             174.5   target 150-180
PASS AI T20 first-innings standard deviation                               30.69   target 20-45
PASS AI T20 first-innings wickets                                           7.08   target 5-8.5
PASS AI T20 sixes per innings                                               5.51   target 4-9
PASS AI T20 wides, % of balls                                               3.2%   target 1.5-4.5%
PASS AI T20 lbw, % of dismissals                                           8.73%   target 4-20%
PASS AI Test first-innings mean                                           351.57   target 280-400
PASS AI Test first-innings standard deviation                              94.92   target 55-140
PASS AI Test first innings declared, %                                    14.29%   target 0-30%
PASS AI Test bowled, % of dismissals                                      23.86%   target 10-30%
PASS AI Test lbw, % of dismissals                                         10.79%   target 8-25%
PASS AI Test won by the side batting last, %                              57.14%   target 30-65%
PASS AI Test draws, %                                                      7.14%   target 5-25%
PASS Pace yorker: median lateral deviation at the crease, degrees           1.1°   target 0-3°
PASS Left pace yorker that passes the stumps: four byes, %                    0%   target 0-5%
PASS Left pace yorker that passes the stumps: keeper collects for no run, %   98.15%   target 75-100%

32 passed, 0 failed of 32 balance checks.
```

## Reproduce

```sh
node check-balance.cjs
node review-check.cjs
node audit-calibration.cjs review-fixtures/core-v23.js
node audit-calibration.cjs
node audit-matches.cjs
```

`audit-calibration.cjs` and `audit-matches.cjs` are supplementary diagnostics, not replacements for the acceptance harness. Earlier revision 23 findings remain in `validation-v23/REPORT.md`.
