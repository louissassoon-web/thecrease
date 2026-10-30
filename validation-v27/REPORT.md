# Revision 27 balance report

3 October 2026. Calibration is complete. The supplied acceptance harness is unchanged: **44/48 before, 48/48 after**. All **54 portable review groups pass**. No target is disputed in this revision.

## Changes, in the requested order

1. Ground-edge exposure now rises gradually after the neutral first 30 ms: the exponential coefficient is 3 rather than 9, the shoulder uses power 1.3, and committed full/good attacks have a higher eventual plateau. The extra risk is driven by error, not a constant surcharge. Spin retains the reaction-time discount. T20 spin ground coverage uses .90 rather than .85 of base precision to retain poor-timing parity as the pace shoulder softens. Defence and ground launch physics are unchanged. Stage output: `validation-v27/step1-accepted.txt` (45/48).
2. Off-centre lofts lose more exit energy and gain elevation/scatter. Partial swings no longer turn most imperfect lofts into flat fours. Matched-contact ground launches and a fully committed perfect loft are exactly unchanged, including random draw counts. T20 AI deliberate loft effort is .95-1, so its chosen attacks stay committed; ground choice and effort are unchanged. Stage output: `validation-v27/step2-balanced.txt` (47/48).
3. First-innings Test top-order ground attacks use measured effort. The final-innings save decision weighs target, time and wickets, and also recognises a late second-innings deficit. Saving batters read more carefully, leave/defend on merit, avoid deliberate loft and still rotate the strike. Watched AI receives the same context as simulation. Declarations, time limits and outcome rules are unchanged. Stage output: `validation-v27/step3-defence.txt` (48/48).

New deliveries use scoring version 27. Prepared revision 22-26 outcomes and AI inputs are compared with frozen engines and remain exact. Save schema 5, profile revision 19, timing calibration, the 2600 ms presentation clock, swipe grammar, boundary chasing/running and safety fixes are retained. No dependencies added.

## Edge curve

Independent population of 1,000 full/good pace deliveries, effort .75, sensible arrival-line stroke. Same seed for every release error within each delivery; this is separate from the contract's sample.

| Error (ms) | R26 edges | R27 edges | R27 dismissed |
| ---: | ---: | ---: | ---: |
| 0 | 1.6% | 1.6% | 0.5% |
| 30 | 1.6% | 1.6% | 0.5% |
| 60 | 18.5% | 8.9% | 2.2% |
| 90 | 22.1% | 15.6% | 3.4% |
| 120 | 22.7% | 20.3% | 4.6% |
| 160 | 23.4% | 24.8% | 6.0% |

The curve is now distinguishable across release errors. The wider sample is somewhat steeper beyond 90 ms than the illustrative 12/16/20% trajectory; the acceptance ranges all pass. No target or seed was changed.

## Loft, scoring and Tests

Contract full-effort pace loft: perfect **78.75% sixes, 40.72 m/s**; 80 ms **27.5% sixes, 32.5% caught**; 130 ms **0% sixes**. Mixed batting is **9.46/over, projected 189**, against pure slogging **132**. Ground strokes remain **6.45/over, 77 balls/wicket**.

Contract Tests: **5/40 draws (12.5%)**, first-innings **371.85 ± 124.40**, last-batting-side wins **57.5%**. Independent sample: **9/40 draws (22.5%)**. Top-seven first-innings survival is **70.81 and 71.69 balls/wicket** respectively. Mean duration is **3.89 and 4.18 days**.

Saving mode scores **2.47/over, 77.54 balls/wicket** on the contract and **2.56/over, 100.38 balls/wicket** independently. Combined survival is 91.93 balls/wicket. The contract subgroup remains below the suggested 90+ even though draws and match-level targets pass; this is a limitation, not a claimed per-sample pass.

The independent 96-innings human policies give ground **6.76/over**, mix **9.36/over, projected 187**, slog **projected 126**. A separate 40-match T20 AI sample gives **162.2** first-innings mean but **8.65 wickets**, marginally above the contract's 8.5 ceiling; the 120-match contract is **159.51 and 8.4 wickets**. These broader figures are retained in the raw files rather than hidden.

## Spin and pace, re-measured

Same 60 ms human policy, 24 innings.

| Measure | Pace | Spin |
| --- | ---: | ---: |
| Runs per over | 6.72 | 6.51 |
| Balls per wicket | 77.85 | 111.09 |
| Fours (% of balls) | 16.76 | 13.32 |
| Edges (% of balls) | 5.21 | 5.04 |
| Edges caught (%) | 23.81 | 17.19 |
| Well-timed unfielded rope reach (%) | 98.10 | 90.83 |
| Well-timed exit speed (m/s) | 26.48 | 25.21 |
| Screen/physical clock | 2.60 | 2.60 |

## Why fewer full/good balls hit the stumps

The independent geometry audit gives 22.5%, 18.4% and 9.3% for revisions 24, 25 and 26/27. R26 improved lateral alignment (49% to 58%), so the body/stump line did not move the wrong way. The full-ball share within the sampled full/good population fell from 47.3% to 39.2% to 15.2%. Full balls themselves became more likely to hit (47.6%, 46.9%, 61.2%).

The missing factor is height: every sampled good-length pace delivery clears the bails, with mean projected height around 1.00 m. In R26/27, 48.7% of the whole full/good sample is laterally aligned but above the stumps. Describing that bowling adjustment as improving stump threat was misleading: it improved alignment while reducing the lower, wicket-threatening length.

Bowled and LBW against the competent arrival-reading policy are rarer than intended. In the R26 split audit all pace and spin wickets at 60 ms were edges; at 130 ms, missed straight balls do produce both LBW and bowled. The policy also defends yorkers and rarely misses within current contact coverage. The overly uniform good-length height is a separate model weakness. This revision leaves the line/length/height geometry unchanged, as requested, and reports it rather than slipping another balance change into the pass.

## Review fixture change

The late-deficit fixture used to require at least 90 leaves/defences in 100 inputs. That encoded almost universal blocking. It now requires sustained extra defence compared with ordinary batting, some appropriate ground strokes and zero deliberate lofts, while keeping deterministic/pure-state checks. Two new model groups test gradual symmetric edge exposure and unchanged ground/perfect-committed-loft physics. Existing prepared/save fixtures extend through R26.

The review uses the real UI handlers with a DOM/canvas facade. It does not claim Android latency or CSS layout testing.

## Unedited before output

```text
PASS T20 ground strokes, 60 ms timing sd: runs per over                     6.48   target 5-7.5
PASS T20 ground strokes, 60 ms timing sd: balls per wicket                 44.77   target 30-90
PASS T20 ground strokes, 130 ms timing sd: balls per wicket                23.04   target 12-40
FAIL T20 25% loft mix, 60 ms sd: runs per over                             10.35   target 7-9.5
PASS T20 25% loft mix, 60 ms sd: balls per wicket                          25.17   target 20-60
PASS T20 loft every ball, 60 ms sd: six % of balls                         23.73   target 10-35
PASS T20 loft every ball, 60 ms sd: balls per wicket                        4.78   target 4-16
FAIL Projected 20-over total, 25% loft mix at 60 ms sd                       207   target 120-190
PASS Projected 20-over total, all-loft at 60 ms sd (must trail the mix)      143   target 60-206
PASS Test ground strokes + 35% defence, 60 ms sd: runs per over             3.53   target 2.8-4.8
PASS Test ground strokes + 35% defence, 60 ms sd: balls per wicket         68.06   target 40-130
PASS Perfect full-effort loft on a full ball: six %                        78.75   target 55-90
PASS Perfect full-effort loft on a full ball: exit speed m/s           40.77 m/s   target 30-44 m/s
PASS Loft released 80 ms off: six %                                        36.25   target 10-45
PASS Loft released 80 ms off: caught %                                      22.5   target 15-60
PASS Loft released 130 ms off: six %                                           5   target 0-20
PASS AI T20 first-innings mean                                            177.13   target 150-180
PASS AI T20 first-innings standard deviation                               37.09   target 20-45
PASS AI T20 first-innings wickets                                           7.16   target 5-8.5
PASS AI T20 sixes per innings                                               5.32   target 4-9
PASS AI T20 wides, % of balls                                              2.88%   target 1.5-4.5%
PASS AI T20 lbw, % of dismissals                                           6.28%   target 4-20%
PASS AI Test first-innings mean                                            285.8   target 280-400
PASS AI Test first-innings standard deviation                               94.1   target 55-140
PASS AI Test first innings declared, %                                      2.5%   target 0-30%
PASS AI Test bowled, % of dismissals                                      19.34%   target 10-30%
PASS AI Test lbw, % of dismissals                                         10.27%   target 8-25%
PASS AI Test won by the side batting last, %                               47.5%   target 30-65%
FAIL AI Test draws, %                                                       2.5%   target 5-25%
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
FAIL Ground stroke 60 ms off on full/good pace: edge % (the curve must rise gradually)   20.85%   target 4-10%
PASS Ground stroke 120 ms off on full/good pace: edge %                   21.45%   target 8-25%
PASS AI pace deliveries in T20 that are yorkers, %                        16.16%   target 6-18%

44 passed, 4 failed of 48 balance checks.
```

## Unedited after output

```text
PASS T20 ground strokes, 60 ms timing sd: runs per over                     6.45   target 5-7.5
PASS T20 ground strokes, 60 ms timing sd: balls per wicket                    77   target 30-90
PASS T20 ground strokes, 130 ms timing sd: balls per wicket                25.26   target 12-40
PASS T20 25% loft mix, 60 ms sd: runs per over                              9.46   target 7-9.5
PASS T20 25% loft mix, 60 ms sd: balls per wicket                          25.09   target 20-60
PASS T20 loft every ball, 60 ms sd: six % of balls                         21.23   target 10-35
PASS T20 loft every ball, 60 ms sd: balls per wicket                        4.54   target 4-16
PASS Projected 20-over total, 25% loft mix at 60 ms sd                       189   target 120-190
PASS Projected 20-over total, all-loft at 60 ms sd (must trail the mix)      132   target 60-188
PASS Test ground strokes + 35% defence, 60 ms sd: runs per over             3.33   target 2.8-4.8
PASS Test ground strokes + 35% defence, 60 ms sd: balls per wicket         96.09   target 40-130
PASS Perfect full-effort loft on a full ball: six %                        78.75   target 55-90
PASS Perfect full-effort loft on a full ball: exit speed m/s           40.72 m/s   target 30-44 m/s
PASS Loft released 80 ms off: six %                                         27.5   target 10-45
PASS Loft released 80 ms off: caught %                                      32.5   target 15-60
PASS Loft released 130 ms off: six %                                           0   target 0-20
PASS AI T20 first-innings mean                                            159.51   target 150-180
PASS AI T20 first-innings standard deviation                               33.87   target 20-45
PASS AI T20 first-innings wickets                                            8.4   target 5-8.5
PASS AI T20 sixes per innings                                               4.18   target 4-9
PASS AI T20 wides, % of balls                                              2.93%   target 1.5-4.5%
PASS AI T20 lbw, % of dismissals                                           5.13%   target 4-20%
PASS AI Test first-innings mean                                           371.85   target 280-400
PASS AI Test first-innings standard deviation                              124.4   target 55-140
PASS AI Test first innings declared, %                                       20%   target 0-30%
PASS AI Test bowled, % of dismissals                                      23.83%   target 10-30%
PASS AI Test lbw, % of dismissals                                         13.06%   target 8-25%
PASS AI Test won by the side batting last, %                               57.5%   target 30-65%
PASS AI Test draws, %                                                      12.5%   target 5-25%
PASS Pace yorker: median lateral deviation at the crease, degrees          0.99°   target 0-3°
PASS Left pace yorker that passes the stumps: four byes, %                    0%   target 0-5%
PASS Left pace yorker that passes the stumps: keeper collects for no run, %   97.56%   target 75-100%
PASS Spin v pace, 60 ms ground strokes: balls-per-wicket ratio              1.43   target 0.7-1.6
PASS Spin v pace, 130 ms ground strokes: balls-per-wicket ratio             0.81   target 0.6-1.6
PASS Spin v pace, 60 ms ground strokes: runs-per-over ratio                 0.97   target 0.8-1.1
PASS Spin v pace, 60 ms ground strokes: four % ratio                        0.79   target 0.55-1.1
PASS Well-timed ground strokes that would reach the rope unfielded: spin/pace     0.93   target 0.75-1.1
PASS Spin v pace, 60 ms ground strokes: edge % ratio                        0.97   target 0.7-1.3
PASS Spin edges that are caught, 60 ms ground strokes, %                  17.19%   target 15-40%
PASS Spin flight: screen ms per physical ms (pace is 2.6)                    2.6   target 2.45-2.75
PASS Fours with a named chasing fielder (event.chaser or event.id), %       100%   target 90-100%
PASS Fours where the batters are offered a run at 0.45 s, %               98.86%   target 85-100%
PASS Fours still scoring at least four, %                                   100%   target 100-100%
PASS Perfectly timed ground stroke on full/good pace: edge %               0.91%   target 0-3%
PASS Perfectly timed ground stroke on full/good pace: dismissed %           0.3%   target 0-1.5%
PASS Ground stroke 60 ms off on full/good pace: edge % (the curve must rise gradually)    9.97%   target 4-10%
PASS Ground stroke 120 ms off on full/good pace: edge %                   17.52%   target 8-25%
PASS AI pace deliveries in T20 that are yorkers, %                        16.16%   target 6-18%

48 passed, 0 failed of 48 balance checks.
```

## Review output

```text
PASS Every player has a stable named profile in both formats; roles are not inferred from batting position
Matched clean lofts: { samples: 24, rootMeanExitSpeed: 42.77, davidMeanExitSpeed: 49.65 }
PASS Named strengths change real timing windows, defence, spin match-ups and loft power
500 death-over deliveries per bowler: {
  bumrahWides: 13,
  ranaWides: 15,
  bumrahYorkers: 177,
  ranaYorkers: 165
}
PASS Bowler speed, control and variations affect real deliveries, with integer speeds and a fixed style through the over
PASS V18 pending balls retain exact outcomes, while the next preparation adopts profiles deterministically
PASS Existing edited names retain their original player identity and incoming profiles contain no random variation
PASS The paused profile selector shows both teams, strengths and actual bowling data without advancing play
PASS Prepared profile snapshots survive save/resume and validation rejects broken ratings
PASS Exported ball details remain sufficient to reproduce an opposition shot including its profiles
8 player-profile checks passed.
PASS Backswing loft works in both views, while direct swipes stay grounded without height buttons
PASS One start plays six legal balls automatically, then stops between overs
PASS A no-ball is rebowled inside the active over without an extra start or a missing legal ball
PASS Fast-forward advances the shared replay clock fourfold and produces the same score, throw and RNG
PASS Calling a run or pausing restores normal playback speed and keeps the running decision live
PASS Paused auto-over saves resume the same prepared ball and complete the over once
PASS An innings interval stops the automatic sequence even when the over has balls remaining
7 automatic-over and replay checks passed.
PASS Drive names, guides, foot plants and contact origins agree for both hands and formats
Matched spin strokes: {
  samples: 486,
  old: { miss: 248, edge: 118, clean: 120 },
  now: { miss: 0, edge: 50, clean: 436 }
}
PASS Controlled spin contact stays usable across late releases without raising middle timing or power
Ground scoring: {
  samples: 192,
  fours: 58,
  scores: [ 0, 1, 2, 3, 4 ],
  weakContacts: 27
}
PASS Weak spin contact loses speed, clean middles retain their speed, and ground drives offer a scoring range
Mistimed spin edges: { edges: 8, keeperCatches: 2 }
PASS Real edges and poor choices still matter, while pace contact windows retain their difficulty
PASS Late spin releases work through actual pad/fullscreen handlers, and a live save resumes identically
PASS Prepared V19 balls keep exact outcomes and subsequent deliveries upgrade deterministically
6 spin and drive checks passed.
PASS The distance cue reaches the bat consistently and spin has no speed jump or frozen ball at the crease
PASS Contact-to-fielding joins continuously and nearby ball/body drawing stays finite in both views
PASS Coins are paid only for a player win, once per fixture across reloads and restarts
PASS The actual shop buys and equips permanently, applies both team roles and exports the shared wallet
PASS All grounds have distinct world geometry, render in play, and full reset restores the starter items
PASS Player graphs and changed conditions appear before bowling, resume mid-card and clear before the run-up
PASS A completed real T20 fixture credits the UI wallet once, including after reloading
7 world, presentation and progression checks passed.
Short outside-off trials: {
  n: 5400,
  before: { miss: 2160, edge: 980 },
  after: { miss: 0, edge: 468 }
}
PASS Short outside-off diagonals become controlled cuts, with fewer forced edges and room for genuine mistakes
Spin release trials: {
  n: 469,
  before: { miss: 268, edge: 16 },
  after: { miss: 0, edge: 24 }
}
PASS Spin coverage improves at ordinary phone release offsets while precision, pace difficulty and power stay separate
PASS Actual rendering retains the ball through keeper/slip catches, gathering, release and the deep return
PASS Cordon playback shows the interception before returning to batting; catches and high returns fit the camera
PASS Catching hands hold the ball and fielders keep fixed limb lengths through gather, turn and throw
PASS Shop access closes at match start and remains blocked through over and innings breaks, including stale buttons
PASS Saved V20 deliveries retain exact outcomes; new spin swipes work on both touch surfaces and resume identically
7 fielding, contact and shop regression groups passed.
PASS V23 bounce angle is length independent and shared by delivery, LBW and continuation
PASS Prepared V22/V23/V24/V25/V26 balls retain exact outcomes, AI inputs and save compatibility
PASS Invalid saves are backed up byte-for-byte before replacement, or protected when storage is full
PASS Frame exceptions surface in feedback and schedule the next animation frame
PASS Release and first contact defer storage; running commands and completed balls still persist
PASS New lofts obey the power ceiling, retain player differences, and mistiming changes speed and both launch angles
PASS Elliptical boundary and descending landing-point interception use the same world geometry
PASS Attack coverage is narrower than defence; defence holds the crease without preventing a called single
PASS New opposition inputs are deterministic, varied and repeatable; time and wickets alter declaration decisions
9 model and safety regression groups passed.
PASS Four and six running commands are live, cancellable and safe; boundary allowance and completed runs are preserved
PASS Chaser runs from the field position, gathers low at the rope, then walks; real canvas and engine frames agree without RNG changes
PASS A cut-off ball retains its collector, throw and run-out route
PASS New pace and spin share 2600 ms per physical second before and after pitching; preparation is pure; new T20 ground precision responds to control, with V27 spin coverage calibrated separately
PASS Twenty human touch swings offer calibration; Apply centres raw -110 ms timing and aligns the bat without advancing RNG
PASS Not now persists; paused settings clamp to ±200 ms and reset without changing the prepared match
PASS Revision 25 saves with no offset keep their prepared ball and history; malformed calibration data is rejected
PASS Human calibration leaves watched AI shots, history and match RNG identical
4 timing-offset review groups passed.
PASS V27 edge exposure has a neutral centre and a gradual, symmetric rise through ordinary and large release errors
PASS Ground launches and perfect committed lofts retain their physics; off-centre lofts lose energy without extra random draws
2 revision 27 model review groups passed.
All 54 portable review groups passed.
```
