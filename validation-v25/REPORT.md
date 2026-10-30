# Revision 25 - balance and boundary report

29 September 2026. Revision 24 baseline source: `c144feaed5159223e65a132ab07053a5480b1325`.

The supplied contract passes **43/43**, up from **33/43**. `node review-check.cjs` passes **all 48 portable review groups**. The harness was saved as supplied and never edited during calibration. Its SHA-256 is `c9afb7f29f7c53a6d2b4c70897e8fb8e116a1d163d22d2ab621672299702b848`.

Only spin parity, boundary chasing/running and their bowling-balance consequences changed. The baseline reproduces all ten reported failures. Its AI T20 mean is 174.5, rather than the 164 quoted in the request; the complete baseline below records the source actually tested.

## Working passes

- Boundary mechanics: 35/43. Chasers on 100% of fours, running offered on 95.81%, and every four still worth at least four. Every other harness metric was identical to the baseline.
- Spin wickets: 39/43. Spin edge conversion fell to 30.14%, edge frequency reached 0.97 of pace, and both timing-error wicket ratios passed. The four remaining failures were spin scoring and its clock.
- Spin scoring and bowling calibration: 42/43. Ground-stroke energy now compensates for a slower arrival. Slightly tighter T20 length plans keep mixed batting and opposition totals in range without weakening AI decisions against spin.
- Uniform delivery clock: 43/43. Removing the new-ball spin stretch changed the screen scale from 2.8 to 2.6 without changing any other acceptance metric.

Intermediate raw outputs are in `validation-v25/boundaries.txt`, `spin-edges-4.txt` and `spin-scoring-4.txt`. Earlier calibration attempts are retained in the same folder. There are no seed-specific branches or outcomes forced to meet a total.

## Spin and pace re-measured

The table uses the exact section 5 batting policy and seeds. The diagnostic adds only an exit-speed counter to that policy; it does not alter the acceptance harness. Rope reach and exit speed cover contacted, non-edge ground shots within 40 ms, excluding yorkers.

| Metric, 60 ms timing SD | R24 pace | R24 spin | R25 pace | R25 spin |
| --- | ---: | ---: | ---: | ---: |
| Runs per over | 6.45 | 4.48 | 6.28 | 6.44 |
| Balls per wicket | 97.50 | 32.21 | 91.76 | 64.42 |
| Fours, % of balls | 16.82% | 4.96% | 15.95% | 13.95% |
| Edges, % of balls | 3.29% | 4.96% | 5.28% | 5.44% |
| Edges caught | 30.19% | 60.32% | 20.00% | 27.54% |
| Well-timed ground strokes reaching the rope unfielded | 97.28% | 43.32% | 99.01% | 92.80% |
| Mean exit speed of those well-timed strokes | 26.13 m/s | 23.20 m/s | 26.53 m/s | 25.39 m/s |
| Screen time per physical second | 2.60 s | 2.80 s | 2.60 s | 2.60 s |
| Balls per wicket, 130 ms SD | 49.03 | 17.97 | 36.95 | 34.00 |

Run `node audit-spin.cjs` for the current table, or `node audit-spin.cjs review-fixtures/core-v24.js` for the baseline. Raw counters are in `spin-before.json` and `spin-after.json`.

## Independent population

A separate fixed set of 96 innings per timing level was used to check that the model change generalises (`node audit-spin.cjs --independent`). At 60 ms, pace/spin produced 6.28/6.93 runs per over and 68.21/104.17 balls per wicket. Spin edge conversion was 22.38%. At 130 ms, pace/spin produced 30.08/28.74 balls per wicket.

Sampling still matters: the contract's competent spin/pace wicket ratio is 0.70, while the independent set gives 1.53. Its run-rate ratio is 1.104, slightly above the contract's 1.1 upper bound if applied to that other population. The exact contract passes; these separate observations are reported rather than concealed or used to select favourable seeds. Phone play-testing remains useful for judging the uniform timing cue.

## Boundary motion and running

Every four and six records the fielder with the shortest arrival to the crossing point, with arrival no earlier than crossing plus 0.15 seconds. The chaser has a distinct ID; `event.id` remains unset. The two nearest support fielders keep their small moves. Running uses the same offer/command path for fours and sixes, permits cancelling queued legs, stops at `event.time`, and never invents a return or run-out. A queued leg can be interrupted by the umpire signal. The recorded allowance is the greater of the boundary and runs completed before crossing; the existing three-run UI limit remains.

The real canvas drawing path and `Fielding.frame` were checked at contact, mid-chase, arrival and walking, including serialised running commands. In a representative four, cover starts at (14.70, 20.23) m at contact, reaches (28.53, 31.90) m at 4.33 s with full running gait, then arrives 0.55 m from the crossing point at 8.65 s and reaches low. By 9.95 s he is walking and turning back. The six follows the same sequence. The boundary is scored at its crossing time; the replay remains available to show the lost chase. Detailed frames are in `validation-v25/boundary-frames.txt`.

This is a deterministic engine and actual canvas-call check, not a claim of fresh Android or Playwright visual QA. The allowed description route was used. No presentation callback advances match RNG.

## Review fixtures and compatibility

`node review-check.cjs` result:

```text
PASS Every player has a stable named profile in both formats; roles are not inferred from batting position
Matched clean lofts: { samples: 24, rootMeanExitSpeed: 42.77, davidMeanExitSpeed: 49.65 }
PASS Named strengths change real timing windows, defence, spin match-ups and loft power
500 death-over deliveries per bowler: {
  bumrahWides: 13,
  ranaWides: 15,
  bumrahYorkers: 269,
  ranaYorkers: 261
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
PASS Prepared V22/V23/V24 balls retain exact outcomes, AI inputs and save compatibility
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
PASS New pace and spin share 2600 ms per physical second before and after pitching; preparation is pure and contact windows stay unchanged
All 48 portable review groups passed.
```

Version assertions now expect 25. The frozen V24 core extends exact old-outcome, opposition-input and save-acceptance checks to revisions 22-24. The fast-forward fixture now requires a real throw when selecting its pickup, because `play.running` also exists on boundaries. No old balance fixture was weakened. Four additional review groups exercise boundary scoring and commands, chaser/canvas agreement, retained pickup returns, and the uniform clock with unchanged contact windows. Schema 5, gestures, quality curves, player power, angular movement and safety fixes remain intact.

## Targets disputed

None. The contract is unchanged. The small independent-sample variation above is a measurement limitation, not a request to relax a target.

## PROJECT_NOTES entry

## Revision 25 - spin parity and live boundaries

Boundary fours and sixes name the quickest chaser to the crossing point. The fielder runs from the real field position, reaches down at the rope after the ball, then turns and walks. The two support fielders retain their small moves. Both boundary types allow running and cancellation while the ball travels; the umpire signal ends the legs at the crossing time. There is no boundary run-out or invented throw. Scoring uses the boundary allowance or completed runs, whichever is greater. Pickups keep their real return and run-out risk.

Spin edges now span downward, steeper and wider deflections instead of all being lobbed at the close keeper. The spin movement contribution to contact risk is reduced to 40%, because the chosen stroke already reads the arrival line. Residual attacking risk scales with bowler control and is larger against pace, where there is less reaction time. Defence remains forgiving; suitability, timing windows and quality curves retain revision 24 behaviour.

Ground strokes gain up to 12% of their bat contribution as incoming speed drops from 28 to 16.5 m/s. This represents time to complete the swing and reach the pitch; incoming-ball energy, guided deflections, loft and named power differences remain intact. T20 bowling transfers a small share of full balls into good lengths and pace yorkers to contain the resulting scoring increase. Test length plans and AI shot selection are unchanged.

New spin deliveries use the same 2600 presentation milliseconds per physical second before and after pitching. The revision 17 post-bounce stretch is retained only for prepared older balls. New balls use scoring version 25; prepared revision 22, 23 and 24 outcomes, AI inputs and saves remain supported. Schema 5, swipe grammar, seeded determinism, the single-file build and the revision 23 safety fixes are unchanged. Chase and runner animation use saved event data and time without advancing match RNG.

The supplied 43-check contract is unedited: revision 24 passes 33/43; revision 25 passes 43/43. All 48 portable review groups pass. Version assertions now expect 25, compatibility fixtures include the frozen revision 24 engine, and the fast-forward fixture explicitly selects a pickup because running no longer implies a throw. Four new groups cover boundary commands/scoring, the real canvas chase path, pickup returns and the uniform clock. See BALANCE_REPORT.md and validation-v25/ for raw outputs and the re-measured spin/pace table. No target is disputed.

## Complete before output - unedited

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
FAIL Spin v pace, 60 ms ground strokes: balls-per-wicket ratio              0.33   target 0.7-1.6
FAIL Spin v pace, 130 ms ground strokes: balls-per-wicket ratio             0.37   target 0.6-1.6
FAIL Spin v pace, 60 ms ground strokes: runs-per-over ratio                 0.69   target 0.8-1.1
FAIL Spin v pace, 60 ms ground strokes: four % ratio                         0.3   target 0.55-1.1
FAIL Well-timed ground strokes that would reach the rope unfielded: spin/pace     0.45   target 0.75-1.1
FAIL Spin v pace, 60 ms ground strokes: edge % ratio                        1.51   target 0.7-1.3
FAIL Spin edges that are caught, 60 ms ground strokes, %                  60.32%   target 15-40%
FAIL Spin flight: screen ms per physical ms (pace is 2.6)                    2.8   target 2.45-2.75
FAIL Fours with a named chasing fielder (event.chaser or event.id), %         0%   target 90-100%
FAIL Fours where the batters are offered a run at 0.45 s, %                   0%   target 85-100%
PASS Fours still scoring at least four, %                                   100%   target 100-100%

33 passed, 10 failed of 43 balance checks.
```

## Complete after output - unedited

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

43 passed, 0 failed of 43 balance checks.
```
