# Revision 26 validation report

1 October 2026. Source/scoring revision 26; save schema 5; named profiles 19.

The supplied contract passes **45 of 47**, compared with **44 of 47** on the frozen revision 25 baseline. All four new edge/yorker checks pass. Two inherited bounds remain failing and are explicitly disputed below. This is not a full contract pass. `node review-check.cjs` passes all **52 portable review groups**.

## Changes and working order

The edge and bowling changes were developed together, then the balance result and two disputed bounds were reported before adding the input calibration. Intermediate balance outputs are retained as `validation-v26/balance-*.txt`; the final model is pass 21. The final run after the UI work is `after.txt`. The model has no seed-specific branches, forced totals or outcome corrections. The harness was not edited.

Both revision 25 flat ground-edge surcharges are removed for new balls. Timing risk starts outside 30 ms and increases smoothly with release error and commitment. Spin retains the readable-bounce movement discount and a reaction-time discount on the timing term. The release-error table below exposes the shape rather than reporting only the endpoints.

Pace yorker bases are .05/.08/.28, scaled by the existing bowler yorker skill. Bowler control shifts full-length attempts towards good lengths, tightens the T20 pace stock line towards the body/stumps, and narrows T20 full/good ground precision within the existing 210–300 ms bounds (cut coverage retains its own bounds). A perfectly timed stroke has no new risk from that precision adjustment. Test delivery plans, spin lengths, incoming/struck-ball physics, field interceptions and AI stroke selection are unchanged.

The optional human offset is applied after Gesture.release. rawError remains uncorrected in the shot and history; error, early/late feedback and the existing bat-contact animation use rawError minus offset. The input deadline shifts with the preference so positive calibration is not cut off early; the ball's presentation clock remains 2600 ms per physical second. No presentation or calibration function advances match RNG.

## Targets I disagree with

1. **Projected mixed-policy total ceiling 190:** the observed 207 fails. Its 10.35 runs/over passes the separately permitted 7–10.5 range, and its survival also passes. I favour allowing the total to follow that permitted rate, up to 210 over 20 overs, while keeping the requirement to beat pure slogging. The current checks can be satisfied together, but the projected ceiling imposes a tighter combined scoring limit than the rate check alone. I have not changed either check.
2. **Pure-slog minimum survival 5 balls/wicket:** the observed 4.78 fails. I would not make a committed loft on every eligible delivery safer solely to meet that lower bound. A separate 96-innings sample gives 4.90; pure slogging still projects well below mixed batting in both populations. I have not changed the check.

No disagreement is claimed with the new edge/yorker targets, spin/pace bands or AI targets. The two failures above remain visible in the unedited output.

## Spin versus pace

Re-measured with `node audit-spin.cjs`, using the contract's policy, 24 innings, ground effort .75 and Gaussian release error. The before command uses `review-fixtures/core-v25.js`. These figures are new measurements on the supplied pack, not copied from earlier messages. The ten-innings overall batting check and 24-innings split check use different populations.

| Metric, 60 ms timing SD | R25 pace | R25 spin | R26 pace | R26 spin |
| --- | ---: | ---: | ---: | ---: |
| Runs per over | 6.28 | 6.44 | 7.10 | 6.33 |
| Balls per wicket | 91.76 | 64.42 | 45.35 | 58.29 |
| Fours, % of balls | 15.95 | 13.95 | 17.14 | 12.70 |
| Edges, % of balls | 5.28 | 5.44 | 9.54 | 7.99 |
| Edges caught, % of edges | 20.00 | 27.54 | 22.22 | 20.59 |
| Well-timed unfielded rope reach, % | 99.01 | 92.80 | 97.60 | 89.23 |
| Exit speed of those strokes, m/s | 26.53 | 25.39 | 26.40 | 25.16 |
| Screen seconds per physical second | 2.60 | 2.60 | 2.60 | 2.60 |

| Metric, 130 ms timing SD | R25 pace | R25 spin | R26 pace | R26 spin |
| --- | ---: | ---: | ---: | ---: |
| Runs per over | 4.66 | 5.04 | 5.50 | 4.79 |
| Balls per wicket | 36.95 | 34.00 | 28.44 | 20.32 |
| Fours, % of balls | 9.17 | 7.75 | 9.93 | 7.72 |
| Edges, % of balls | 6.99 | 7.52 | 11.79 | 11.27 |
| Edges caught, % of edges | 29.46 | 21.88 | 24.21 | 30.77 |

The well-timed subset is contact without an edge, ground mode, within 40 ms and not a yorker. Rope reach is the saved trajectory with no interception. Exit speed is the mean on that same subset. Both bowling types retain the uniform clock. Boundary chasing is 100%, running offers 98.63%, and every four still scores at least four.

## Edge curve and yorker phases

The contract measures perfect pace ground strokes at **0.91% edges / 0.30% dismissals** (R25: 7.42% / 1.56%), and +120 ms strokes at **21.45% edges** (R25: 8.59%). Aggregate pace yorkers fall from **33.13% to 16.16%**.

The following independent curve uses 1,000 full/good pace deliveries across phases and teams, effort .75, with shot direction chosen from the arrival line. Bowling changes alter which deliveries qualify, so this compares populations rather than pretending they are identical balls. It does not edit or replace the acceptance check.

| Release error | R25 edge % | R26 edge % | R25 dismissed % | R26 dismissed % |
| ---: | ---: | ---: | ---: | ---: |
| 0 ms | 5.80 | 1.60 | 1.40 | 0.50 |
| 30 ms | 7.00 | 1.60 | 1.80 | 0.50 |
| 60 ms | 8.00 | 18.50 | 1.90 | 4.10 |
| 90 ms | 9.50 | 22.10 | 2.40 | 5.10 |
| 120 ms | 11.30 | 22.70 | 2.70 | 5.30 |
| 150 ms | 13.00 | 23.40 | 3.10 | 5.40 |

| Phase | R25 yorkers / pace balls | R25 share | R26 yorkers / pace balls | R26 share |
| --- | ---: | ---: | ---: | ---: |
| Powerplay | 162/734 | 22.07% | 53/734 | 7.22% |
| Middle | 67/279 | 24.01% | 32/279 | 11.47% |
| Death | 306/602 | 50.83% | 176/602 | 29.24% |

Phase counts use the contract's first-120-delivery defensive census. Shares after skill weighting are expected to differ from the base probabilities.

## Calibration and regression results

The four new facade groups pass:

- Actual pointerUp receives -110 ms raw swings, makes no release-time save write or RNG advance, and offers at 20 legal balls. Apply stores -110. Subsequent -120/-110/-100 raw swings become -10/0/+10 corrected swings, centred at zero. The actual draw path receives corrected error, and the existing contact age is zero at corrected impact.
- Not now persists across reload. Manual paused settings stay inside ±200 ms and Reset restores zero without changing the match. A short Test innings also offers at declaration, with -114 rounded to -110. No offset is silently applied, and no second offer appears in the same innings.
- A frozen revision 25 save with no preference loads at zero, preserving its history and prepared delivery. Historical own-innings raw errors seed the buffer. Invalid new metadata is rejected.
- Watched AI shots, contest history and RNG are byte-identical at human offsets 0 and -110.

The earlier compatibility group now includes the frozen revision 25 core, alongside revisions 22–24, checking exact prepared-shot outcomes, AI inputs and save validation. Generation assertions expect 26. The old boundary/clock fixture asserted all R25 contact windows equal R24; that assertion remains for older balls. New T20 full/good ground strokes instead verify the intentional bowler-control precision effect. Every other window and all uniform-clock assertions remain.

Full review output: `validation-v26/review.txt`.

Testing uses the actual UI handlers and canvas draw code through the portable DOM facade. It does not render browser CSS, emulate Android input latency or measure phone frame rate. This static build has no supported managed preview server; no browser screenshot or Android play-test is claimed.

## Wider-sample limitations

The additional fixed 96-innings policy sample gives ground scoring 6.83/over at 43.47 balls/wicket, mixed scoring 9.91/over with a projected 198, and pure slogging 4.90 balls/wicket with a projected 147. Mixed survival is 19.97, very close to the contract's lower bound of 20. These are separate populations, not substitutes for the contract.

The existing 40-match diagnostic reports AI T20 first-innings mean **187.05**, above the desired 150–180 range, despite **169.28** on the contract. In 40 independent Tests, mean first innings is 305.63, but **zero draws** occur, compared with one of fourteen in the contract. Mean match duration is 3.17 days and top-seven survival is 50.33 balls/wicket. Therefore the contract's AI passes are not evidence that its means or draw rate are robust across seeds. These remain balance limitations; they were not concealed by selecting another diagnostic population or changing the harness.

## Harness integrity

SHA-256 of both the supplied attachment and committed `check-balance.cjs`:

`1af76b0a6f77fb8d0534ba1975f49abb3500c6f87f6b1ddc624bd3e173b970c0`

The output blocks below are copied verbatim from the executions, including failures.

## Before: revision 25

```text
PASS T20 ground strokes, 60 ms timing sd: runs per over                     6.42   target 5-7.5
PASS T20 ground strokes, 60 ms timing sd: balls per wicket                 68.41   target 30-90
PASS T20 ground strokes, 130 ms timing sd: balls per wicket                33.11   target 12-40
PASS T20 25% loft mix, 60 ms sd: runs per over                              9.08   target 7-10.5
PASS T20 25% loft mix, 60 ms sd: balls per wicket                          28.22   target 20-60
PASS T20 loft every ball, 60 ms sd: six % of balls                         20.47   target 10-35
PASS T20 loft every ball, 60 ms sd: balls per wicket                        5.35   target 5-16
PASS Projected 20-over total, 25% loft mix at 60 ms sd                       182   target 120-190
PASS Projected 20-over total, all-loft at 60 ms sd (must trail the mix)      144   target 60-181
PASS Test ground strokes + 35% defence, 60 ms sd: runs per over              3.5   target 2.8-4.8
PASS Test ground strokes + 35% defence, 60 ms sd: balls per wicket         63.97   target 40-130
PASS Perfect full-effort loft on a full ball: six %                        83.75   target 55-90
PASS Perfect full-effort loft on a full ball: exit speed m/s           40.15 m/s   target 30-44 m/s
PASS Loft released 80 ms off: six %                                         32.5   target 10-45
PASS Loft released 80 ms off: caught %                                      22.5   target 15-60
PASS Loft released 130 ms off: six %                                        6.25   target 0-20
PASS AI T20 first-innings mean                                            176.97   target 150-180
PASS AI T20 first-innings standard deviation                               34.42   target 20-45
PASS AI T20 first-innings wickets                                           6.88   target 5-8.5
PASS AI T20 sixes per innings                                               5.63   target 4-9
PASS AI T20 wides, % of balls                                              2.97%   target 1.5-4.5%
PASS AI T20 lbw, % of dismissals                                           7.35%   target 4-20%
PASS AI Test first-innings mean                                           337.86   target 280-400
PASS AI Test first-innings standard deviation                             105.66   target 55-140
PASS AI Test first innings declared, %                                     7.14%   target 0-30%
PASS AI Test bowled, % of dismissals                                      20.51%   target 10-30%
PASS AI Test lbw, % of dismissals                                          12.7%   target 8-25%
PASS AI Test won by the side batting last, %                              42.86%   target 30-65%
PASS AI Test draws, %                                                      7.14%   target 5-25%
PASS Pace yorker: median lateral deviation at the crease, degrees          1.18°   target 0-3°
PASS Left pace yorker that passes the stumps: four byes, %                    0%   target 0-5%
PASS Left pace yorker that passes the stumps: keeper collects for no run, %   98.18%   target 75-100%
PASS Spin v pace, 60 ms ground strokes: balls-per-wicket ratio               0.7   target 0.7-1.6
PASS Spin v pace, 130 ms ground strokes: balls-per-wicket ratio             0.92   target 0.6-1.6
PASS Spin v pace, 60 ms ground strokes: runs-per-over ratio                 1.03   target 0.8-1.1
PASS Spin v pace, 60 ms ground strokes: four % ratio                        0.87   target 0.55-1.1
PASS Well-timed ground strokes that would reach the rope unfielded: spin/pace     0.94   target 0.75-1.1
PASS Spin v pace, 60 ms ground strokes: edge % ratio                        1.03   target 0.7-1.3
PASS Spin edges that are caught, 60 ms ground strokes, %                  27.54%   target 15-40%
PASS Spin flight: screen ms per physical ms (pace is 2.6)                    2.6   target 2.45-2.75
PASS Fours with a named chasing fielder (event.chaser or event.id), %       100%   target 90-100%
PASS Fours where the batters are offered a run at 0.45 s, %               98.62%   target 85-100%
PASS Fours still scoring at least four, %                                   100%   target 100-100%
FAIL Perfectly timed ground stroke on full/good pace: edge %               7.42%   target 0-3%
FAIL Perfectly timed ground stroke on full/good pace: dismissed %          1.56%   target 0-1.5%
PASS Ground stroke 120 ms off on full/good pace: edge %                    8.59%   target 8-25%
FAIL AI pace deliveries in T20 that are yorkers, %                        33.13%   target 6-18%

44 passed, 3 failed of 47 balance checks.
```

## After: revision 26

```text
PASS T20 ground strokes, 60 ms timing sd: runs per over                     6.48   target 5-7.5
PASS T20 ground strokes, 60 ms timing sd: balls per wicket                 44.77   target 30-90
PASS T20 ground strokes, 130 ms timing sd: balls per wicket                23.04   target 12-40
PASS T20 25% loft mix, 60 ms sd: runs per over                             10.35   target 7-10.5
PASS T20 25% loft mix, 60 ms sd: balls per wicket                          25.17   target 20-60
PASS T20 loft every ball, 60 ms sd: six % of balls                         23.73   target 10-35
FAIL T20 loft every ball, 60 ms sd: balls per wicket                        4.78   target 5-16
FAIL Projected 20-over total, 25% loft mix at 60 ms sd                       207   target 120-190
PASS Projected 20-over total, all-loft at 60 ms sd (must trail the mix)      143   target 60-206
PASS Test ground strokes + 35% defence, 60 ms sd: runs per over             3.53   target 2.8-4.8
PASS Test ground strokes + 35% defence, 60 ms sd: balls per wicket         68.06   target 40-130
PASS Perfect full-effort loft on a full ball: six %                        78.75   target 55-90
PASS Perfect full-effort loft on a full ball: exit speed m/s           40.77 m/s   target 30-44 m/s
PASS Loft released 80 ms off: six %                                        36.25   target 10-45
PASS Loft released 80 ms off: caught %                                      22.5   target 15-60
PASS Loft released 130 ms off: six %                                           5   target 0-20
PASS AI T20 first-innings mean                                            169.28   target 150-180
PASS AI T20 first-innings standard deviation                               41.05   target 20-45
PASS AI T20 first-innings wickets                                            7.3   target 5-8.5
PASS AI T20 sixes per innings                                               5.28   target 4-9
PASS AI T20 wides, % of balls                                              2.72%   target 1.5-4.5%
PASS AI T20 lbw, % of dismissals                                           6.73%   target 4-20%
PASS AI Test first-innings mean                                            311.5   target 280-400
PASS AI Test first-innings standard deviation                              86.89   target 55-140
PASS AI Test first innings declared, %                                        0%   target 0-30%
PASS AI Test bowled, % of dismissals                                      19.39%   target 10-30%
PASS AI Test lbw, % of dismissals                                           9.9%   target 8-25%
PASS AI Test won by the side batting last, %                              57.14%   target 30-65%
PASS AI Test draws, %                                                      7.14%   target 5-25%
PASS Pace yorker: median lateral deviation at the crease, degrees          0.99°   target 0-3°
PASS Left pace yorker that passes the stumps: four byes, %                    0%   target 0-5%
PASS Left pace yorker that passes the stumps: keeper collects for no run, %   97.56%   target 75-100%
PASS Spin v pace, 60 ms ground strokes: balls-per-wicket ratio              1.29   target 0.7-1.6
PASS Spin v pace, 130 ms ground strokes: balls-per-wicket ratio             0.71   target 0.6-1.6
PASS Spin v pace, 60 ms ground strokes: runs-per-over ratio                 0.89   target 0.8-1.1
PASS Spin v pace, 60 ms ground strokes: four % ratio                        0.74   target 0.55-1.1
PASS Well-timed ground strokes that would reach the rope unfielded: spin/pace     0.91   target 0.75-1.1
PASS Spin v pace, 60 ms ground strokes: edge % ratio                        0.84   target 0.7-1.3
PASS Spin edges that are caught, 60 ms ground strokes, %                  20.59%   target 15-40%
PASS Spin flight: screen ms per physical ms (pace is 2.6)                    2.6   target 2.45-2.75
PASS Fours with a named chasing fielder (event.chaser or event.id), %       100%   target 90-100%
PASS Fours where the batters are offered a run at 0.45 s, %               98.63%   target 85-100%
PASS Fours still scoring at least four, %                                   100%   target 100-100%
PASS Perfectly timed ground stroke on full/good pace: edge %               0.91%   target 0-3%
PASS Perfectly timed ground stroke on full/good pace: dismissed %           0.3%   target 0-1.5%
PASS Ground stroke 120 ms off on full/good pace: edge %                   21.45%   target 8-25%
PASS AI pace deliveries in T20 that are yorkers, %                        16.16%   target 6-18%

45 passed, 2 failed of 47 balance checks.
```

## PROJECT_NOTES entry

## Revision 26 - timing-led edges, bowling lengths and input calibration

New ground-stroke edge risk no longer includes revision 25's flat pace or spin surcharge. The central 30 ms carries no added timing risk; exposure grows with release error and stroke commitment, with a spin reaction-time discount. Movement, unsuitable shots and excess reach still matter. Defence and loft retain their existing contact rules.

T20 pace yorker bases are 5%, 8% and 28% in the powerplay, middle and death, with the existing named yorker skill weighting. Controlled pace bowling puts more full-length attempts on a good length and uses a tighter body/stump line. Bowler control also narrows T20 full/good attacking ground precision within the existing bounds. This contains scoring through bowling quality without taxing a perfectly timed stroke. Test bowling plans, spin lengths, launch physics and AI stroke selection are unchanged.

Timing offset is an optional saved human-input preference, default 0 and limited to ±200 ms. Touch release preserves rawError and subtracts the offset from error; feedback and the existing bat-contact clock use that corrected error. The last 40 raw human swings supply a median check every 20 legal balls and at innings end. Apply or Not now appears once per innings, between deliveries. Applying rounds to 10 ms. Settings has -10/+10 and Reset. AI input is untouched. Older saves gain a zero offset; their own historical uncorrected swings seed the learning buffer without rewriting history or prepared shots.

New balls use scoring version 26. Prepared revision 22–25 outcomes and AI inputs remain exact; schema 5, profiles 19, the swipe grammar, uniform 2600 ms clock, boundary chasing/running and safety fixes stay intact. No dependency or runtime asset was added. All 52 portable review groups pass, including four new calibration groups. The former all-windows-equal fixture now checks the intentional bowler-control effect on new T20 ground attacks while retaining exact older windows and the uniform clock.

The supplied harness is byte-for-byte unchanged: before 44/47, after 45/47. All four new checks pass. Two targets remain disputed and failing: the mixed-policy projected ceiling of 190 (207, while its 10.35 runs/over is allowed) and the pure-slog minimum survival of 5 balls/wicket (4.78). These are not claimed as passes. Wider samples also show AI T20 scoring above the desired band and unreliable Test draws. See BALANCE_REPORT.md and validation-v26/ for full outputs, measurements and limitations. No browser CSS or Android latency result is claimed.
