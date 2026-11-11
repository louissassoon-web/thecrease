# Revision 38 - the owner's play notes

11 November 2026. Base: revision 37, GitHub commit 87a742da942cf21221bc3898bb1dd624210ad7bb.

Thirteen notes came from play on an Android phone. Twelve are addressed here. The thirteenth, shorter Test days, was withdrawn by the owner before work began and nothing about Test length has changed.

## Changes

- **Vibration (note 1).** Every pulse is now at least 45 ms: light 45, medium 60, heavy 85, catch 70, boundary 50-60-80, wicket 90-70-60-70-110, test 220-110-220. Revision 37 used 24, 38 and 55 ms, which many Android motors do not render. Edges and mistimed contact have their own pattern (45-55-45), a manual release is felt, and so is a changed bowling plan. When the browser accepts the test and nothing is felt, Settings lists the phone settings to check, in order.
- **Run-out chances (note 2).** 4× gives way one second of play before the pickup when a chance is coming. A warning opens then and an end picked early is thrown at the pickup. The choice window itself is shown at 0.4×, so its 0.78 s of play lasts about 2 s on the clock. Fast-forward is remembered from ball to ball while the player's side is in the field and never while batting. Skipping an innings takes a second tap.
- **Edges for four (note 3).** Attacking edges off pace now vary in height. One that goes into the ground or over the cordon keeps more of the ball's pace and can run away to the rope; one at catching height behaves as before. An outside edge on a ball that was missing the stumps can no longer deflect back on to them.
- **Run calls (note 4).** The button reads "Run 2" when the run is on, "Run 2 · tight" when the margin is within 0.35 s either way, and "No run" (disabled) when the throw would win. Revision 37 said "risky" for anything under 0.20 s in hand, including runs that were certain run-outs.
- **High balls (note 5).** Stroke suitability falls with the height of the ball. Above the shoulder a straight bat goes under it, and a hook or pull takes a top edge that always goes behind square. A pace release held as long as possible now climbs over the batter's head and is a wide.
- **Bowling plan (note 6).** The plan is chosen on a wheel over the field: swipe up or down for the ball, sideways for the line, hold still to bowl. An arrow on the pitch runs to the line aimed at and bends the way the ball should move. A small stump map shows the line against the stumps. The bowler waits at the top of the run while the plan is chosen, so the pitch is in view.
- **Loose balls when the player bowls (notes 7 and 8).** The opposition reads a loose ball (short, over-pitched, full toss, wide, down leg) and attacks it with better timing and more intent. In Tests it no longer leaves a slow short ball outside off that it can reach.
- **Mistimed strokes (note 9).** A badly mistimed ground stroke can pop up in front of the bat or take the leading edge, to be caught or to fall in a gap. These come out of the existing edge chances, so a weak-timing batter is dismissed as often as before on 120 innings (22.5 balls a wicket against 22.4).
- **Broadcast strip (note 10).** One line under the picture: both batters with runs and balls, the striker marked, and the bowler's wickets, runs and overs. It reads the same delayed score as the header, so it never gives a result away before the replay.
- **Light and weather (note 11).** The sky, cloud, shadows and ground follow the weather the engine already models and a clock. Tests run from 11:00 to 18:00. A Twenty20 is an afternoon game, or on a ground with floodlights a day-night game for about half its fixtures (the fixture seed decides): low sun, dusk, then lights. Broken cloud throws moving shadows, a damp strip brings drizzle, and the weather is named beside the wind.
- **Bowlers miss (note 13).** One execution model moves every ball from where it was aimed, for the player's bowlers and the opposition's. The spread depends on the bowler's control, the ball attempted, the stage of the innings and a damp ball. A small share of balls slip altogether: full toss, half-volley, long hop, down leg or wide. After a manual release the title says where the ball went against where it was aimed.

## Gates

| Check | Before | After |
| --- | ---: | ---: |
| Unedited balance contract | 48/48 | 48/48 |
| Portable review groups | 119 | 131 |
| Offline checks | 12/12 | 12/12 |
| Revision 38 acceptance harness (`check-balance-r38.cjs`) | - | 51/51 |

Outputs: balance-before.txt, balance-after.txt, balance-r38.txt, review-before.txt, review.txt and offline.txt. `check-balance.cjs` is byte-identical to revision 37 (sha256 8e09003c...). `npm run check` now runs the revision 38 harness after the contract.

## Measures

`node tools/measure-r38.cjs review-fixtures/core-v37.js` and `node tools/measure-r38.cjs` run the same seeds, the same simulated batter and the same bowling policy on the frozen revision 37 engine and on this one. Raw output: measures-before.json and measures-after.json. They are diagnostics of those policies, not estimates of one player's results.

| Measure | R37 | R38 |
| --- | ---: | ---: |
| T20 attacking pace edges that reach the rope | 5.07% | 10.84% |
| T20 attacking pace edges caught | 30.70% | 21.29% |
| Test attacking pace edges that reach the rope | 2.78% | 10.83% |
| Test attacking pace edges caught | 35.19% | 32.48% |
| Above 1.75 m: straight-bat strokes hit cleanly in front of square | 87.16% | 0% |
| Above 1.75 m: a hook finds the edge (every edge goes behind square) | 2.53% | 40.52% |
| 1.2 to 1.45 m: a pull finds the edge | 0% | 2.78% |
| Pace release held as long as possible is a wide | 7.00% | 73.67% |
| Ground contacts that go up in front of the bat, 120 ms timing sd | 0% | 3.54% |
| Ground contacts that go up in front of the bat, 60 ms timing sd | 0% | 0.62% |
| Test, slow short ball outside off in reach: left alone | 41.15% | 4.44% |
| Test, slow short ball outside off in reach: hit for four | 5.00% | 35.12% |
| Test, the same ball: runs per ball (a good ball costs 0.38) | 0.54 | 2.16 |
| Player bowling, control 80 to 87: length miss sd | 0.13 m | 0.69 m |
| Player bowling: a pace release at the yorker instant lands a yorker (T20) | 99.39% | 43.52% |
| Opposition T20 pace: full tosses | 0% | 1.27% |
| Opposition Test pace: full tosses | 0% | 0.35% |
| Run button: open calls carrying a warning ("risky", now "tight") | 84.98% | 7.63% |
| Run button: open calls refused ("No run") | 0% | 57.45% |
| Run button: run out when the warned run is taken | 72.49% | 61.54% |
| Run button: run out when a run with no warning is taken | 0% | 0% |

T20 spin from the player's bowlers, by where the ball landed:

| Length | R37 runs/ball | R38 runs/ball | R37 wicket % | R38 wicket % |
| --- | ---: | ---: | ---: | ---: |
| Full toss | 1.68 | 2.15 | 10.93 | 3.85 |
| Very full | 0.29 | 1.36 | 3.62 | 9.92 |
| Overpitched | 1.32 | 1.86 | 12.04 | 8.37 |
| Full | 1.30 | 1.51 | 10.68 | 9.74 |
| Good length | 1.11 | 1.10 | 6.02 | 8.73 |
| Short | 1.34 | 1.85 | 9.73 | 5.03 |
| Drag down | 1.41 | 1.83 | 8.45 | 5.04 |

## Where revision 38 is short of its plan

The plan set targets before the work. These were not met as written.

- **Pop-ups.** 3.5% of ground contacts at a 120 ms timing sd, against a planned 4 to 10%. A larger share made the weak-timing batter worse off than in revision 37, which the plan ruled out.
- **Very full spin in T20.** 1.36 runs a ball in the harness sample and up to 1.68 in others, against a planned 0.9 to 1.4. Revision 37 gave 0.29.
- **"Loose balls take wickets no more often than good ones".** True for the drag-down, the short ball and the full toss. The full and over-pitched ball still take a wicket more often per ball than a good-length ball, because the opposition's lofted strokes are out about 27% of the time whatever the length. Measured as runs conceded per wicket, every loose length is a worse bargain than good length except "Full", which is near parity (1.23 times).
- **Opposition execution.** Milder than planned: Test full tosses 0.35% against 1 to 3%, and T20 balls down leg between 1.2 and 1.5% depending on where the line is drawn, against 2 to 5%. The opposition's planner already spreads length inside its band, so half of the length error is applied on top of it, and loose balls come at 55% (T20) and 70% (Tests) of the player's rate.

## The contract's small samples

Several contract checks sit within one standard error of a bound for revision 37 itself, because their samples are ten innings. Section 7 of the revision 38 harness repeats three of them on larger samples.

| Check | Contract block R37 | Contract block R38 | 120 innings R37 | 120 innings R38 |
| --- | ---: | ---: | ---: | ---: |
| T20 25% loft mix, balls per wicket (floor 20) | 24.04 | 20.49 | 20.63 | 21.51 |
| T20 ground strokes, 60 ms sd, balls per wicket | 64.06 | 48.08 | 62.0 | 67.3 |
| T20 ground strokes, 130 ms sd, balls per wicket | 22.37 | 28.82 | 22.4 | 22.5 |

The loft-mix check passes by about one wicket in ten innings. On 120 innings revision 38 is the safer of the two. Raising that sample would make the check mean what it says; no target was edited here. Other thin margins in this revision: opposition T20 wickets 8.31 (ceiling 8.5), sixes 4.39 (floor 4), lbw 5.66% (floor 4%); opposition Test bowled 28.57% (ceiling 30%), draws 22.5% (ceiling 25%).

## Counterweights

The new dismissals and the bowling error were paid for so that the contract's totals stayed inside their bands: the T20 pace timing edge is 0.85 of its revision 37 chance; the Test timing edge is 1.10 for pace and 0.77 for spin; the opposition's Test timing sd is 45 ms (42); its T20 misread base is 0.064 (0.055); outside edges on balls missing the stumps no longer play on. All of these apply to scoring version 38 only.

## Decisions confirmed by the owner

`CLAUDE.md` asks for an explicit decision before presentation clocks or the control grammar change. Three changes here touch them. The owner confirmed all three on 11 November 2026.

1. The run-out choice window is shown at 0.4× and 4× drops a second early. The engine's window, the throw and the running are unchanged. This was the direct request in note 2.
2. On the field, a finger that moves more than 8 px restarts the 180 ms hold that begins the run-up. Without it a slow swipe to change the ball would start the bowling action. The hold length is unchanged, and the pad still starts the action at once.
3. While the plan is chosen the bowler stands at the top of the run, out of the picture, instead of on the pitch. He runs in from the same place as before.

## Review changes and compatibility

Twelve new groups in `check-r38.cjs` cover: exact agreement with the frozen revision 37 engine on 200 prepared balls (release, opposition read, stroke and fielding); revision 37 saves validating unchanged in both engines; the execution record surviving a save and a damaged one being refused; the error being a derived stream that neither reads nor advances the match RNG; top edges, pop-ups and leading edges; the run button's three calls; the strip waiting for the replay; the wheel's swipes, taps and still hold; the aim arrow, stump map and release title; remembered fast-forward; vibration patterns; the clock, shadows and floodlights; and every sky state drawing with finite coordinates.

Existing fixtures changed, with reasons:

- `check-boundaries`, `check-bowling-v31`, `check-player-profiles`, `check-spin-drives`, `check-usability-v37`, `check-fielding-balance`: assertions about newly prepared deliveries now expect scoring version 38. Historical comparisons are unchanged.
- `check-bowling-v30`: length never decreases with release age, where it used to increase strictly (two neighbouring releases may land on the same spot), and skipping the innings takes the second tap.
- `check-bowling-v31`: the yorker group asserts the aim (`intendedLength`, `intendedLabel`) and the distribution of landings, since a release at the yorker instant no longer lands a yorker every time. The cost of the gamble is asserted for pace by landing and by aim.
- `check-bowling-v32`: the spin ladder is asserted on what the release aims at; where it lands must be a valid label and 55 to 99% land as aimed.
- `check-audit-v34`: the running group now expects a hopeless run to be refused and finds a tight run that can be run out; play prepared before revision 38 keeps "risky".
- `check-ux-v35`, `check-calm-v36`, `check-usability-v37`: the run-out choice is asserted at 0.4× with the warning a second before the pickup, an early pick thrown at the pickup, and the window still expiring.
- `check-display-input`: the facade exports `lighting` and `dayTime` for the new light checks.

`review-fixtures/core-v37.js` is the revision 37 core, frozen for comparison.

New deliveries use scoring version 38 and manual releases version 38. Prepared balls from earlier versions keep their rules and outcomes. Schema 5 is unchanged; the execution record and the aimed label are optional fields. The 2600 ms delivery clock, the batting swipe grammar and the dependencies are unchanged. No runtime network request was added. Light, weather effects, the strip, the wheel, vibration and the aim arrow do not read or advance match RNG.

## Browser checks

Chromium through Playwright, served from `dist/`, at 412×839 (Pixel 7), 360×740, 320×568 and 839×412 landscape.

- Bowling wheel: field swipes up, down and sideways, swipes that begin on the card and on a wheel button, taps on all six buttons (each acting once), and hold then flick to bowl. Three balls bowled; the strip read "Archer 0-0 (0.3)". Screenshots: bowling-wheel.jpg, bowling-wheel-landscape.jpg, bowling-wheel-360x740.jpg, bowling-wheel-full-view.jpg.
- Batting: 24 balls with releases timed from the engine clock. The run button showed "Run 2", "Run 2 · tight", "No run", "Run queued", "Three-run limit" and "Hold your ground". Screenshots: run-button-tight.jpg, run-button-no-run.jpg.
- Run-out window, mounted as `check-ux-v35` mounts it: 4× switched on 2.4 s before the pickup had given way by 0.9 s before it (sampled every 90 ms); the warning showed both ends; the open window ran at 0.39× (0.13 s of play in 330 ms) and closed when an end was picked. Picking during the warning is covered by the review group, not by this run. Screenshots: run-out-warning.jpg, run-out-window.jpg.
- Light: nine forced states in the batting and bowling views (light-batting.jpg, light-bowling.jpg) and cloud shadows from the outfield camera (cloud-shadows.jpg). The states were forced through a debug hook in the test server; `dist/` has no such hook.
- Simulate over, the two-tap simulate innings, full view and a Test start ran without a page error.

## Not verified

- No physical phone was used. Whether an Android motor renders the new pulses, how the wheel feels under a thumb, and frame rate with the light wash on a mid-range device are untested. The wash is one full-canvas multiply per frame and is skipped on a clear afternoon.
- The run-out and light screenshots use mounted or forced states. They show layout and drawing, not how often the states occur in play.
- The wheel's size tiers use CSS container queries (Chrome 105, Safari 16). An older browser gets the tall layout at every size.
- The legacy test files outside `npm run check` (`check-running-field`, `check-backswing-motion`, `check-core`, `check-gameplay`, and `check-display-input` run directly) already failed on the base commit and were not repaired.
