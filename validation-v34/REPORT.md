# Revision 34 - gameplay audit fixes

Base: `d9e69acf1bc30aa59990690fd9abf4eb08de56cf` on `master`, audited on 1 November 2026. These changes are prepared for a review branch. They have not been merged or deployed.

## Verification

| Check | Audited master | Revision 34 |
| --- | ---: | ---: |
| Unedited balance contract | 48 / 48 | 48 / 48 |
| Portable review groups | 90 / 90 | 100 / 100 |
| Reproducible single-file build | Pass | Pass |
| Save schema | 5 | 5 |

Raw output: [balance before](balance-before.txt), [balance after](balance-after.txt), [review before](review-before.txt), [review after](review-after.txt), [build check](build-check.txt). No balance targets or harness code were changed. No targets are disputed in this revision. New scoring and manual bowling markers are 34; prepared older balls keep their rules. A frozen copy of the audited core verifies exact R33 delivery, manual release, AI-input and shot-result compatibility, alongside the existing historical fixtures.

HTML SHA-256: `504af4624ef461719cb13324b647e95274baf2eaac9f20cb95a7c74bc46c77f7`.

Harness SHA-256: `8e09003ca2128e0684c87cf7f034178631aac2bd88c3c4f439aa3c4973c59747`.

## Feedback addressed

| Feedback | Result |
| --- | --- |
| Toss result arrives before settlement | Face, winner and choices wait until after the existing 1.8-second flip; reduced motion uses a short reveal. The regression checks the result is still hidden at 1.2 seconds. |
| Gold looks stuck onto the chest | Trim follows the lit torso surface on batters and fielders in the default canvas renderer. |
| Completed T20 match loops back from the league | The exact reported loop was not reproduced on audited master. Explicit league navigation now acknowledges the completed ceremony and survives reload, with a next-fixture regression. |
| Choose a bowler before choosing the ball | The existing eligible default and over-break selector are retained. Changing bowler refreshes that player's repertoire; selection remains unavailable after the over has begun. |
| Ball choice should share the length view, with icons and swipe navigation | The bowling camera now shows the length guide while planning. Adjacent icon/name cards share the existing swipe gallery; keyboard and tap alternatives remain. |
| Four byes and boundary wides never happen | Already supported. The paired leave sample contains eight four-bye balls and five boundary wides among 2,813 pace balls, unchanged. A boundary wide scores five wides: the one-wide penalty plus four. These remain rare rather than receiving a forced quota. |
| Pace edges hardly ever reach four | Low, fine attacking edges retain more horizontal speed. Pace edge fours increase from 3 to 29 in the paired 615-edge sample. Catch-height and spin-edge launch rules remain unchanged. |
| Choose the return end; make run-outs possible | A collection offers two wicket targets and two fallback buttons. Choosing a route preserves current fielder positions and can change a safe run into a run-out. The default throw follows if no choice is made. |
| Running stops at three or refuses risky calls | New balls permit further calls while live, including a fourth run. Risky calls are available; an unstarted queued run can still be cancelled. Target completion and boundary scoring remain enforced. |
| A perfectly timed hoik cannot miss | A committed full/good-length swing on the wrong side of the ball can now miss using an existing seeded contact draw. Sensible strokes retain the existing timing/edge curve. |
| Late full-ball strokes move the batter into the stumps | Backward foot placement is limited and the hands/bat solve contact within fixed arm lengths. Existing late-drive and sweep contact checks pass. |
| Speed and no-ball information appear too soon | Current speed and the no-ball call wait for release. Previously awarded free hits remain visible before the delivery. |
| Spin drag-downs behave like effective bouncers | Lower post-bounce heights and short-ball stroke selection make them attackable. Good length contains scoring better in the paired sample. |
| Edges never hit the stumps | Outgoing paths now test the striker's wicket before collection. No-balls and free hits protect against bowled dismissal. |
| High-wide commentary says the ball was too wide | A height-specific wide reason produces height-specific commentary. |
| T20 batters should chase more urgently | Required rate affects loft frequency, defence, ground effort and running risk. No target means the existing first-innings intent. |

## Measurements

`node validation-v34/measure-feedback.cjs` reproduces the paired diagnostic on the current build. These are controlled scenario samples, not forecasts of a full innings. Raw data: [before](physics-before.json), [after](physics-after.json).

| Scenario | Before | After |
| --- | ---: | ---: |
| Spin drag-down mean contact height, 400 releases | 1.73 m | 1.05 m |
| AI leaves against those drag-downs | 284 / 400 | 5 / 400 |
| Runs per legal over, drag-down sample | 4.21 | 13.60 |
| Runs per legal over, good-length spin sample | 10.70 | 11.23 |
| Pace edges reaching four | 3 / 615 | 29 / 615 |
| Outgoing inside-edge paths crossing the stumps without dismissal | 15 | 0 |
| Wrong-side hoik contact at perfect timing | 238 / 238 | 215 / 238 |
| Back ankle z on the sampled 120 ms late full ball | -1.157 m | -0.760 m |

The return-end regression uses 400 separately seeded manual deliveries. More than 100 contain a selectable collection, and some paired choices give a run-out at one end and a safe outcome at the other. It also taps both on-field targets through the real UI handlers, checks no fielder position jump or match-RNG change, and validates the saved choice.

Adding outgoing wicket collisions raised the Test AI's bowled share above the old limit. The final build retains the existing edge spread and uses a safer perceived off-stump margin before an AI Test leave (0.65 m for new balls, previously 0.42 m). It does not suppress a collision or assign an artificial dismissal quota. On the unchanged 40-Test contract sample: mean first innings 374.63, 29.79% bowled dismissals, 13.97% lbw, 20% first-innings declarations, 50% wins for the side batting last and five draws. T20 AI mean is 156.86 with 8.49 first-innings wickets. The wickets and bowled-share results sit near their acceptance limits; watch them during play-testing.

## Visual evidence and limits

[Canvas frames](canvas-frames.png) show right- and left-handed late full-ball contact, the gold trim on the shirt, the bowling guide before and during the action, and a pickup before and after a chosen return. They were produced by the real canvas drawing code through the DOM facade using an existing native-canvas dependency in the development environment. No dependency was added to the game. The screenshot helper is optional and separate from the portable review suite.

A browser executable was unavailable here. These frames do not verify browser CSS layout, native touch latency, frame rate, safe areas or Android/iOS behaviour. Phone play-testing should cover the compact gallery, the return-choice window and late drives/sweeps before merging. The optional Three.js prototype keeps its existing renderer seam and does not gain the new canvas kit trim. No native wrapper, billing, advertising integration or store submission is included.

## Fixture changes

Assertions for newly prepared scoring/manual deliveries now expect version 34. Historical prepared-ball fixtures retain their original expectations. The toss fixture waits for the animation to settle because its old immediate-result expectation encoded the reported leak. `check-audit-v34.cjs` adds ten groups; the existing 90 groups still pass. `tools/frames.mjs` now waits for the revealed toss before continuing. `PROJECT_NOTES.md` records each model and presentation change in the project's existing revision style.
