# Revision 39 - eleven play notes

17 November 2026. Base: revision 38, GitHub commit aa164cae7b942bb442fea33ac0b8beb3505ae9ef (pull request 6 merged into `master`).

Eleven notes came from play. All eleven are addressed. New deliveries carry scoring version 39 and new matches pitch model 39; a match begun under revision 38 keeps its pitch, ball and wind to the end. The owner then decided five open points the same day; they are built in and listed under "Decisions by the owner".

## Changes

- **Fast-forward (note 1).** It applies to the ball it is pressed on and nothing else. Every ball starts at normal speed, in the field and at the crease. This reverses the remembered speed that revision 38 added in the field.
- **Camera (note 2).** The main view is kept while the ball is in it. The ball is sampled until it is fielded and along the return throw; the camera lifts only if a sample leaves the frame (5% in from the sides, 10% from the top, 7% from the bottom). However far the ball runs, it is followed from the main view while it is in frame. Revision 38 lifted on every ball. See "Camera" below for how often it now holds.
- **Swing and spin (note 3).** The plan keeps the ball as a right-hander meets it. For swing, the wheel shows the name the batter on strike would use: an in-swinger to a right-hander is offered as an out-swinger to a left-hander and swings the same way in the world. Before, the name stayed and the ball changed direction with the batter. Spin is now the same ball against either hand too: a leg-break that leaves a right-hander turns into a left-hander, and keeps its name. The opposition's bowlers already worked this way.
- **Reduced motion (note 4).** With motion reduced the move to the field view is a cut. It used to be made on the instant of contact, with the previous frame fading over it, which hid the stroke. The cut now waits for 550 ms of replay, and a view that is being held is not dissolved at all.
- **Round the wicket (note 5).** A large white arrow, 62% opaque, sits at the top corner of the wheel on the side the bowler would move to, with "Round the wicket" or "Over the wicket" under it. The release moves to the far side of the stumps and wider (0.98 m from middle stump on average, against 0.50), the camera and the non-striker change sides, and nothing else about the ball changes. On a 320 px phone the arrow sits at the top centre, because either corner is under the radar or the wind tag.
- **Wind and cloud (note 6).** The wind arrow followed a radar that always had the bowler at the top. In the field the camera looks the other way, so the arrow pointed against the cloud shadows it was describing. The arrow and the radar are now drawn the way the main picture looks (in the field both turn round), and the cloud shadows and the drizzle are drawn in the same frame. The clouds in the sky are still; only their shadows move.
- **Ends (note 7).** Overs come from alternate ends and every innings opens from end 0. The stands, the pavilion, the sky, the sun and its shadows and the mowing are seen from the other way on alternate overs, in every match. In a pitch model 39 match the wind the players meet turns round with them, which is the one part that reaches the engine. Each ground has two named ends, shown in the bowler's tag and in the brief before an over's first ball.
- **Pitch (note 8).** Each match has its own surface: how high the ball stands up (±8% in Tests, ±5.6% in Twenty20), how fast it comes off (±3.5% and ±2.45%) and how uneven the bounce is (0.55 to 1.9 times the old amount, growing with wear as before). A pitch report is shown before the first ball and at the start of each Test day: the surface, four lines in words, the ball and the sky, and bars for bounce, pace, seam and turn. The report is also at the foot of the weather text in Settings.
- **Days (note 9).** "END OF DAY n" is shown at stumps with the score, the lead or deficit and the not-out batters, followed by "DAY n+1" with that morning's pitch report.
- **New ball (note 10).** The ball now has a hardness: 1 when new, 0 once soft (55 overs in a Test, 16 in a Twenty20). A hard ball leaves the pitch higher and faster, which is also what carries an edge; its seam factor is 1.14 against 1.06 before; a soft one does the opposite (0.70 against 0.76). Conventional swing was already 4.4 times stronger new than old in Tests and is unchanged. The Test ball was already replaced after 80 overs; "NEW BALL" is now announced.
- **The ball (note 11).** In red and in white the ball is drawn with a radius of at least 3.4 px (2.6 before) inside a dark rim, and it dulls with age. Until it is struck its seam is a ring in the world: upright and angled towards the side it will swing for a quick bowler, canted the way it will turn for a spinner, across the line for a slower ball. The same ball is shown close up under the radar with stitches that travel at the rate it is turning, its speed in km/h and its age.
- **Banners.** The pitch report, stumps, the new day and the new ball stay on screen until they are tapped or a key is pressed.

## Decisions by the owner, 17 November 2026

| Question | Decision | What was done |
| --- | --- | --- |
| Lift the camera beyond 38 m, or never while the ball is in frame? | Never while it is in frame | The range is removed. The main view is now kept on 26% of balls in the field and 46% at the crease in Twenty20 (19% and 37% with the range) |
| Keep the radar turned round in the field? | Keep it | No change |
| Spin against left-handers: mirrored or physical? | Physical, like swing | A plan records `frame: 'world'` and its turn is no longer mirrored. A version 39 plan saved before that keeps its mirrored turn |
| Banners: timed or on a tap? | On a tap | The timers are removed; Enter, Space and Escape also close a banner |
| The contract's small samples | Enlarge them | The loft mix runs on 240 innings (10 before), spin against pace on 240 (24 before) and the AI Tests on 120 (40 before). No band changed. The pitch constant is the one first written, not a selected one |

## Gates

| Gate | Result |
| --- | --- |
| `npm run build:check` | reproduces the recorded HTML |
| `check-offline.cjs` | 12 of 12 |
| `review-check.cjs` | 141 groups: the 130 kept from revision 38 and 11 new in `check-r39.cjs` |
| `check-balance.cjs`, with the three samples enlarged | 48 of 48 |
| `check-balance-r38.cjs` | 51 of 51 |

`check-balance.cjs` does not set a failing exit code, so `npm run check` exits 0 with a failed contract check. Read the line that counts them.

## Measures

`tools/measure-r39.cjs` on the frozen revision 38 engine and on this build: same seeds, same simulated batter. Outputs are `measures-before.json` and `measures-after.json`.

| Simulated batter, large samples | Innings | Revision 38 | Revision 39 |
| --- | --- | --- | --- |
| Twenty20 ground strokes, 60 ms: runs per over | 240 | 6.86 | 6.91 |
| Twenty20 ground strokes, 60 ms: balls per wicket | 240 | 65.14 | 64.51 |
| Twenty20 ground strokes, 130 ms: runs per over | 240 | 5.02 | 5.01 |
| Twenty20 ground strokes, 130 ms: balls per wicket | 240 | 22.75 | 20.82 |
| Twenty20 25% loft mix, 60 ms: runs per over | 240 | 9.34 | 9.39 |
| Twenty20 25% loft mix, 60 ms: balls per wicket | 240 | 21.06 | 21.52 |
| Twenty20 loft every ball, 60 ms: runs per over | 120 | 17.54 | 17.46 |
| Twenty20 loft every ball, 60 ms: balls per wicket | 120 | 4.48 | 4.42 |
| Test ground strokes and 35% defence, first 45 overs: runs per over | 48 | 3.6 | 3.55 |
| Test ground strokes and 35% defence, first 45 overs: balls per wicket | 48 | 83.1 | 69.68 |
| Spin against pace, 60 ms: balls-per-wicket ratio | 240 | 1.07 | 1.15 |
| Spin against pace, 130 ms: balls-per-wicket ratio | 240 | 0.74 | 0.77 |

| Pace by the age of the ball | Good-length height at the bat, m | Speed off the pitch, km/h | Swing, m | Balls per wicket | Edges caught, % |
| --- | --- | --- | --- | --- | --- |
| Twenty20 overs 1-4 | 0.916 → 0.934 | 107.18 → 108.13 | 0.095 → 0.095 | 21.93 → 19.82 | 25.65 → 27.95 |
| Twenty20 overs 5-10 | 0.908 → 0.918 | 105.13 → 105.5 | 0.051 → 0.051 | 19.42 → 21.09 | 30.09 → 26.56 |
| Twenty20 overs 11-20 | 0.911 → 0.888 | 103.29 → 101.96 | 0.033 → 0.033 | 36.95 → 37.04 | 22.92 → 21.88 |
| Test overs 1-15 | 0.908 → 0.971 | 107.6 → 110.72 | 0.138 → 0.138 | 59.74 → 72 | 33.08 → 22.39 |
| Test overs 16-40 | 0.905 → 0.933 | 106.22 → 107.35 | 0.059 → 0.059 | 43.28 → 51.76 | 34.65 → 32.31 |
| Test overs 41-80 | 0.906 → 0.895 | 106.27 → 105.32 | 0.05 → 0.052 | 49.51 → 53.42 | 37.38 → 34.43 |
| Test overs 81-95, second new ball | 0.886 → 0.942 | 104.67 → 107.73 | 0.144 → 0.138 | 36.85 → 48.33 | 44.44 → 37.97 |

| The pitch from match to match, 400 matches | Revision 38 | Revision 39 |
| --- | --- | --- |
| Twenty20: bounce factor at the first ball, standard deviation | 0.035 | 0.049 |
| Twenty20: bounce factor, lowest to highest | 0.928 to 1.035 | 0.901 to 1.121 |
| Twenty20: pace factor, standard deviation | 0.02 | 0.025 |
| Twenty20: variable bounce, standard deviation between matches, m | 0.005 | 0.01 |
| Test: bounce factor at the first ball, standard deviation | 0.035 | 0.06 |
| Test: bounce factor, lowest to highest | 0.921 to 1.028 | 0.909 to 1.185 |
| Test: pace factor, standard deviation | 0.02 | 0.029 |
| Test: variable bounce, standard deviation between matches, m | 0.005 | 0.016 |
| Test: variable bounce on days 1 to 5, mean, m | 0.04, 0.071, 0.101, 0.132, 0.15 | 0.042, 0.075, 0.108, 0.14, 0.159 |
| Test: variable bounce on days 1 to 5, roughest pitch, m | 0.047, 0.078, 0.109, 0.139, 0.157 | 0.073, 0.145, 0.196, 0.259, 0.279 |

| Ends and the player's bowling | Revision 38 | Revision 39 |
| --- | --- | --- |
| Matches with a head or tail wind of 12 km/h or more: wind reverses between overs, % | 0 | 100 |
| The same matches: difference in swing between the two ends, % | 8.51 | 32.82 |
| A chosen swinger keeps its direction in the world against a left-hander, % | 0 | 100 |
| Out-swinger chosen, left-hander on strike: shown as | Outswinger | Inswinger |
| Release from middle stump, over and round the wicket, m | 0.5 and 0.5 | 0.5 and 0.98 |

Wickets by the age of the ball are too few to read in the Test rows (36 innings, 10 to 20 wickets a band): across three pitch constants the first 15 overs gave 43, 56 and 72 balls per wicket. The heights and speeds in those rows are steady.

## Balance and the contract

Three contract checks rested on small samples: the loft mix on ten innings, spin against pace on twenty-four, and the share of spin edges caught on the same twenty-four. Once every match has its own pitch, those samples moved with the constant that seeds the pitch stream. `pitch-constant-scan.txt` holds 38 constants on the old samples: the ten-innings loft mix ran from 17.2 to 23.6 balls per wicket against a floor of 20, and the 24-innings spin-against-pace ratio from 0.98 to 3.15 against a ceiling of 1.6. Four of the 38 passed all 48 checks. A build could pass only by choosing among them, which says nothing about balance.

On the owner's decision those two samples are now 240 innings each. The AI Test sample was in the same state and is raised from 40 to 120 Tests under the same decision. The reason and the date are recorded at the head of `check-balance.cjs`. No band changed. On ten constants, with all three enlarged (`contract-enlarged-constants.txt` and `test-sample.txt`):

| Pitch constant | Result | Loft mix, balls per wicket | Spin against pace | Test first-innings mean, first 40 Tests | On 120 Tests |
| --- | --- | --- | --- | --- | --- |
| 0x39c1a7, first written, in the build | 48 of 48 | 21.52 | 1.39 | 391.3 | 375.4 |
| 0x39c1a8 | 48 of 48 | 21.50 | 1.36 | 404.5, over the ceiling of 400 | 386.4 |
| 0x39c1a9 | 48 of 48 | 21.30 | 1.50 | 397.8 | 377.8 |
| 0x39c1aa | 48 of 48 | 20.91 | 1.43 | 374.8 | 370.5 |
| 0x39c1ab | 47 of 48 | 21.29 | 1.45 | 406.1, over the ceiling | 383.4 |
| 0x39c1ae | 48 of 48 | 20.79 | 1.58 | 372.2 | 363.7 |
| 0x39c1b1 | 48 of 48 | 21.49 | 1.36 | 377.0 | 369.2 |
| 0x39c1bc | 48 of 48 | 21.04 | 1.49 | 399.9 | 379.0 |
| 0x39c1c2 | 48 of 48 | 21.15 | 1.45 | 373.6 | 369.3 |
| 0x39c1c9 | 48 of 48 | 21.15 | 1.50 | 368.2 | 368.1 |

The build uses the constant that was written before any scan. On the old samples the loft mix and the spin-against-pace ratio ran from 17.2 to 23.6 and from 0.98 to 3.15, and four constants of 38 passed all 48 checks. On 240 innings they run from 20.8 to 21.5 and from 1.36 to 1.58, and nine constants of ten pass all 48.

The AI Test sample. On the contract's forty Tests the first-innings mean read 368 to 406 across the ten constants against a ceiling of 400, and two of the ten were over it. On 120 Tests the ten read 364 to 386. The first forty seeds score high: they read above the following eighty on all ten constants, by 18 runs on average (by 6 under revision 38). Revision 38 reads 371 on the same 120 Tests and revision 39 averages 374 across the ten, a difference inside the standard error of 11, so revision 39 has not moved Test first-innings totals by an amount this sample can detect. Every other AI Test check passes on 120 Tests on all ten constants. The contract takes 87 s with 120 Tests against 55 s with forty.

What still depends on the constant. 0x39c1ab fails one check: AI Twenty20 first-innings wickets, 8.58 against a ceiling of 8.5. That check is taken on 120 matches and read 8.47 in revision 37, 8.31 in revision 38 and 8.30 here (8.14 to 8.58 across the ten, 8.29 on average). The game sits a fifth of a wicket under that ceiling and about one constant in ten crosses it. A larger sample would confirm the 8.3; whether 8.3 is acceptable is a design question for a later revision. Two other checks come near a limit without crossing it on any constant: spin against pace at 1.36 to 1.58 against a ceiling of 1.6, and the all-loft slog, which reads 4.13 to 4.60 balls per wicket on its ten innings across 38 constants against a floor of 4 (4.42 on 120 innings). The remaining small samples (ground strokes on ten innings, the Test day on eight) kept every verdict across the same 38 constants and are as they were.

What moved, measured on 240 innings: the loft mix, well-timed ground strokes and the slog are within 3% of revision 38. A badly timed batter (130 ms) loses between 4% and 9% of his balls per wicket in Twenty20, depending on the constant. In a Test the simulated batter is out more often in the first 45 overs (about 70 balls per wicket against 83), inside the contract's band of 40 to 130.

Two things moved further at first and were pulled back. With the Test-size ball and pitch terms in Twenty20, well-timed ground strokes lost 11% of their balls per wicket and the spin-against-pace ratio rose to 1.66 on 240 innings. The Twenty20 hardness term is therefore 0.6 of the Test term and neutral at a hardness of 0.55, and the Twenty20 pitch spread is 0.7 of the Test spread.

The player's spin against left-handers is not in these measures, which use the opposition's bowling. `check-balance-r38.cjs` covers the player's bowling against the opposition and passes 51 of 51 with it.

## Camera

`tools/measure-camera-r39.cjs`, output in `camera-hold.txt`, at a 412 × 439 arena:

| | Balls | Main view kept | With the 38 m range first built |
| --- | --- | --- | --- |
| Twenty20, in the field | 4,504 | 26% | 19% |
| Twenty20, at the crease | 4,800 | 46% | 37% |
| Test, in the field | 9,600 | 64% | 61% |
| Test, at the crease | 9,600 | 55% | 52% |

Kept in the field: every ball through to the keeper, every bowled and lbw, most catches near the bat. Kept at the crease: every defensive stroke, strokes fielded in front of the bat, and about one boundary in eight (the straight ones). In the field almost no boundary is kept, because the ball leaves the frame. At the crease a ball that passes the bat goes behind the camera, so the camera still lifts for it (3% of balls).

## Review changes and compatibility

- `review-fixtures/core-v38.js` is the frozen revision 38 engine. `check-r39.cjs` shows that a match begun under it keeps its conditions exactly, and that 200 prepared balls are released, read by the opposition, struck and fielded exactly as before.
- A revision 38 save validates unchanged. New optional fields: `contest.pitchModel` and `innings.pitchModel` (39), `pending.end`, `manualBowling.side`, `manualBowling.frame`, `bowlingPlan.side`, `banners`. Each is refused when damaged.
- `check-balance.cjs`: three sample sizes raised, as above. Its hash in `RELEASE.json` is updated.
- Current-version assertions advanced to 39 in seven check files, and `check-balance-r38.cjs` accepts version 39 balls and names the contract's new sample.
- The fast-forward group left `check-r38.cjs` for `check-r39.cjs`, where it asserts the opposite.
- `check-bowling-v31` asserts that a swinger is named for the batter and keeps its direction in the world; it and `check-r38` read the wheel through the batter's hand.
- `check-bowling-v30` compares the presentation clock with 2600 to within 1e-9. The exact quotient depended on floating-point rounding.
- `check-display-input` exports nine more functions.

## Browser checks

Chromium through Playwright on the built page, no page or console errors in any run:

- 412 × 839: pitch report after the toss, still on screen 12.5 s later and closed by Enter; the wheel with the arrow, over and round the wicket; a ball bowled from round the wicket (release −0.93 m); an over bowled, with fast-forward pressed on the second ball only and every ball starting at 1×; the change of ends (wind arrow 270° then 90°, sun reversed, "Pavilion End" then "Lane End", the pavilion behind the batter in the second over).
- 412 × 839, batting: the close-up for an out-swinger and for a slower ball; a straight drive for four to a rope 70 m away with the camera still for the whole replay; with reduced motion, a ball that leaves the view watched from the main view at 133 and 300 ms and cut to the field view by 616 ms.
- 412 × 839, in the field: a right-arm leg-break to a left-hander, recorded in the world's frame and turning towards his leg side.
- 412 × 839 and 839 × 412, Test: pitch report, "END OF DAY 1", "DAY 2" and "NEW BALL", each inside the arena.
- 320 × 568: the same bowling run; the arrow at the top centre of the wheel, clear of the radar.

Screens: `screens-a.jpg` (report, wheel, round the wicket, close-up), `screens-b.jpg` (the two ends), `screens-c.jpg` (batting close-up, a drive to the rope from the main view), `screens-d.jpg` (Test banners), `screens-e.jpg` (leg-break to a left-hander).

## Not verified

- No physical phone was used. How the arrow sits under a thumb and how the close-up reads in sunlight are device checks.
- The three.js renderer, behind its flag, does not turn its stands with the end.
- Under reduced motion the stroke is held for 550 ms of replay. At 4× that is about 140 ms.
- The day and new-ball banners were raised in the browser by setting the clock and the ball count, not by playing 90 or 80 overs. The path from play is covered by `check-r39.cjs`.
- From the main view a ball at the far rope is 7 px across and the fielders about 10 px tall. Whether that reads well enough on a phone is for play to say.
- The names of the ends at the four real grounds are their usual names, assigned without regard to which end the scenery puts them at.
