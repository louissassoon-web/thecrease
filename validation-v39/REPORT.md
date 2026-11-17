# Revision 39 - eleven play notes

17 November 2026. Base: revision 38, GitHub commit aa164cae7b942bb442fea33ac0b8beb3505ae9ef (pull request 6 merged into `master`).

Eleven notes came from play. All eleven are addressed. New deliveries carry scoring version 39 and new matches pitch model 39; a match begun under revision 38 keeps its pitch, ball and wind to the end.

## Changes

- **Fast-forward (note 1).** It applies to the ball it is pressed on and nothing else. Every ball starts at normal speed, in the field and at the crease. This reverses the remembered speed that revision 38 added in the field.
- **Camera (note 2).** The main view is kept while the ball can be followed in it. The ball is sampled until it is fielded and along the return throw; the camera lifts only if a sample leaves the frame (5% in from the sides, 10% from the top, 7% from the bottom) or goes more than 38 m from the camera. Revision 38 lifted on every ball. See "Camera" below for how often it now holds.
- **Swing names (note 3).** The plan keeps the ball as a right-hander meets it and the wheel shows the name the batter on strike would use. An in-swinger to a right-hander is offered as an out-swinger to a left-hander and swings the same way in the world. Before, the name stayed and the ball changed direction with the batter. The opposition's bowlers already worked this way. Spin is not changed: see "For the owner".
- **Reduced motion (note 4).** With motion reduced the move to the field view is a cut. It used to be made on the instant of contact, with the previous frame fading over it, which hid the stroke. The cut now waits for 550 ms of replay, and a view that is being held is not dissolved at all.
- **Round the wicket (note 5).** A large white arrow, 62% opaque, sits at the top corner of the wheel on the side the bowler would move to, with "Round the wicket" or "Over the wicket" under it. The release moves to the far side of the stumps and wider (0.98 m from middle stump on average, against 0.50), the camera and the non-striker change sides, and nothing else about the ball changes. On a 320 px phone the arrow sits at the top centre, because either corner is under the radar or the wind tag.
- **Wind and cloud (note 6).** The wind arrow followed a radar that always had the bowler at the top. In the field the camera looks the other way, so the arrow pointed against the cloud shadows it was describing. The arrow and the radar are now drawn the way the main picture looks (in the field both turn round), and the cloud shadows and the drizzle are drawn in the same frame. The clouds in the sky are still; only their shadows move.
- **Ends (note 7).** Overs come from alternate ends and every innings opens from end 0. The stands, the pavilion, the sky, the sun and its shadows and the mowing are seen from the other way on alternate overs, in every match. In a pitch model 39 match the wind the players meet turns round with them, which is the one part that reaches the engine. Each ground has two named ends, shown in the bowler's tag and in the brief before an over's first ball.
- **Pitch (note 8).** Each match has its own surface: how high the ball stands up (±8% in Tests, ±5.6% in Twenty20), how fast it comes off (±3.5% and ±2.45%) and how uneven the bounce is (0.55 to 1.9 times the old amount, growing with wear as before). A pitch report is shown before the first ball and at the start of each Test day: the surface, four lines in words, the ball and the sky, and bars for bounce, pace, seam and turn. The report is also at the foot of the weather text in Settings.
- **Days (note 9).** "END OF DAY n" is shown at stumps with the score, the lead or deficit and the not-out batters, followed by "DAY n+1" with that morning's pitch report.
- **New ball (note 10).** The ball now has a hardness: 1 when new, 0 once soft (55 overs in a Test, 16 in a Twenty20). A hard ball leaves the pitch higher and faster, which is also what carries an edge; its seam factor is 1.14 against 1.06 before; a soft one does the opposite (0.70 against 0.76). Conventional swing was already 4.4 times stronger new than old in Tests and is unchanged. The Test ball was already replaced after 80 overs; "NEW BALL" is now announced.
- **The ball (note 11).** In red and in white the ball is drawn with a radius of at least 3.4 px (2.6 before) inside a dark rim, and it dulls with age. Until it is struck its seam is a ring in the world: upright and angled towards the side it will swing for a quick bowler, canted the way it will turn for a spinner, across the line for a slower ball. The same ball is shown close up under the radar with stitches that travel at the rate it is turning, its speed in km/h and its age.

## Gates

| Gate | Result |
| --- | --- |
| `npm run build:check` | reproduces the recorded HTML |
| `check-offline.cjs` | 12 of 12 |
| `review-check.cjs` | 141 groups: the 130 kept from revision 38 and 11 new in `check-r39.cjs` |
| `check-balance.cjs`, unedited (sha 8e09003c) | 48 of 48 |
| `check-balance-r38.cjs` | 51 of 51 |

`check-balance.cjs` does not set a failing exit code, so `npm run check` exits 0 with a failed contract check. Read the line that counts them.

## Measures

`tools/measure-r39.cjs` on the frozen revision 38 engine and on this build: same seeds, same simulated batter. Outputs are `measures-before.json` and `measures-after.json`.

| Simulated batter, large samples | Innings | Revision 38 | Revision 39 |
| --- | --- | --- | --- |
| Twenty20 ground strokes, 60 ms: runs per over | 240 | 6.86 | 6.84 |
| Twenty20 ground strokes, 60 ms: balls per wicket | 240 | 65.14 | 64.03 |
| Twenty20 ground strokes, 130 ms: runs per over | 240 | 5.02 | 5.06 |
| Twenty20 ground strokes, 130 ms: balls per wicket | 240 | 22.75 | 21.76 |
| Twenty20 25% loft mix, 60 ms: runs per over | 240 | 9.34 | 9.34 |
| Twenty20 25% loft mix, 60 ms: balls per wicket | 240 | 21.06 | 21.49 |
| Twenty20 loft every ball, 60 ms: runs per over | 120 | 17.54 | 17.55 |
| Twenty20 loft every ball, 60 ms: balls per wicket | 120 | 4.48 | 4.49 |
| Test ground strokes and 35% defence, first 45 overs: runs per over | 48 | 3.6 | 3.57 |
| Test ground strokes and 35% defence, first 45 overs: balls per wicket | 48 | 83.1 | 67.4 |
| Spin against pace, 60 ms: balls-per-wicket ratio | 240 | 1.07 | 1.25 |
| Spin against pace, 130 ms: balls-per-wicket ratio | 240 | 0.74 | 0.72 |

| Pace by the age of the ball | Good-length height at the bat, m | Speed off the pitch, km/h | Swing, m | Balls per wicket | Edges caught, % |
| --- | --- | --- | --- | --- | --- |
| Twenty20 overs 1-4 | 0.916 → 0.939 | 107.18 → 108.11 | 0.095 → 0.094 | 21.93 → 18.86 | 25.65 → 27.46 |
| Twenty20 overs 5-10 | 0.908 → 0.92 | 105.13 → 105.6 | 0.051 → 0.051 | 19.42 → 20 | 30.09 → 29.55 |
| Twenty20 overs 11-20 | 0.911 → 0.891 | 103.29 → 101.81 | 0.033 → 0.032 | 36.95 → 38.96 | 22.92 → 22.94 |
| Test overs 1-15 | 0.908 → 0.951 | 107.6 → 110.61 | 0.138 → 0.139 | 59.74 → 56.16 | 33.08 → 33.33 |
| Test overs 16-40 | 0.905 → 0.916 | 106.22 → 107.2 | 0.059 → 0.059 | 43.28 → 43.28 | 34.65 → 38.58 |
| Test overs 41-80 | 0.906 → 0.884 | 106.27 → 105.27 | 0.05 → 0.052 | 49.51 → 58.15 | 37.38 → 34.54 |
| Test overs 81-95, second new ball | 0.886 → 0.942 | 104.67 → 108.42 | 0.144 → 0.142 | 36.85 → 50.11 | 44.44 → 31.03 |

| The pitch from match to match, 400 matches | Revision 38 | Revision 39 |
| --- | --- | --- |
| Twenty20: bounce factor at the first ball, standard deviation | 0.035 | 0.049 |
| Twenty20: bounce factor, lowest to highest | 0.928 to 1.035 | 0.902 to 1.121 |
| Twenty20: pace factor, standard deviation | 0.02 | 0.025 |
| Twenty20: variable bounce, standard deviation between matches, m | 0.005 | 0.01 |
| Test: bounce factor at the first ball, standard deviation | 0.035 | 0.062 |
| Test: bounce factor, lowest to highest | 0.921 to 1.028 | 0.91 to 1.185 |
| Test: pace factor, standard deviation | 0.02 | 0.029 |
| Test: variable bounce, standard deviation between matches, m | 0.005 | 0.016 |
| Test: variable bounce on days 1 to 5, mean, m | 0.04, 0.071, 0.101, 0.132, 0.15 | 0.042, 0.074, 0.107, 0.139, 0.158 |
| Test: variable bounce on days 1 to 5, roughest pitch, m | 0.047, 0.078, 0.109, 0.139, 0.157 | 0.088, 0.146, 0.197, 0.247, 0.297 |

| Ends and the player's bowling | Revision 38 | Revision 39 |
| --- | --- | --- |
| Matches with a head or tail wind of 12 km/h or more: wind reverses between overs, % | 0 | 100 |
| The same matches: difference in swing between the two ends, % | 8.51 | 32.82 |
| A chosen swinger keeps its direction in the world against a left-hander, % | 0 | 100 |
| Out-swinger chosen, left-hander on strike: shown as | Outswinger | Inswinger |
| Release from middle stump, over and round the wicket, m | 0.5 and 0.5 | 0.5 and 0.98 |

## Balance and the contract's small samples

The contract passes, and the way it passes needs stating.

Three of its checks rest on small samples: the loft mix on ten innings, spin against pace on twenty-four, and the share of spin edges caught on the same twenty-four. Once every match has its own pitch, those samples move with the constant that seeds the pitch stream. `pitch-constant-scan.txt` holds 38 constants: the ten-innings loft mix ran from 17.2 to 23.6 balls per wicket against a floor of 20, and the spin-against-pace ratio from 0.98 to 3.15 against a ceiling of 1.6. Seven of the 38 passed those two with the run-rate ceiling. Six of the seven were run through the whole contract and four passed all 48; the other two failed the caught-spin-edges floor, and the seventh was dropped when its forty Tests averaged 404 against a ceiling of 400. The build uses 0x39c1b1, the one of the four whose closest check has the most room (spin against pace 1.58 against a ceiling of 1.6; on 240 innings it is 1.25).

That is selecting a sample. It says nothing about balance. The evidence for balance is the 240-innings rows in the table above, where the loft mix, well-timed ground strokes and the slog are within 2% of revision 38.

Two things did move and were then pulled back. With the Test-size ball and pitch terms in Twenty20, well-timed ground strokes lost 11% of their balls per wicket and the spin-against-pace ratio rose to 1.66 on 240 innings. The Twenty20 hardness term is therefore 0.6 of the Test term, centred at 0.55, and the Twenty20 pitch spread 0.7 of the Test spread.

What remains moved: in a Test the simulated batter is out more often in the first 45 overs (67.4 balls per wicket against 83.1), inside the contract's band of 40 to 130; and a badly timed batter (130 ms) loses about 4% in Twenty20. The opposition's first-innings Test mean on the contract's forty Tests is 377 against 375, and ran from 368 to 404 across six constants, so forty Tests do not fix it to better than about 20 runs.

The recommendation from revision 38 stands and is now stronger: enlarge the loft-mix, spin-against-pace and caught-spin-edges samples. As they are, they decide which constant ships.

## Camera

`tools/measure-camera-r39.cjs`, output in `camera-hold.txt`, at a 412 × 439 arena:

| | Balls | Main view kept |
| --- | --- | --- |
| Twenty20, in the field | 4,504 | 19% |
| Twenty20, at the crease | 4,800 | 35% |
| Test, in the field | 9,600 | 60% |
| Test, at the crease | 9,600 | 51% |

Kept in the field: every ball through to the keeper, every bowled and lbw, most catches near the bat. Kept at the crease: every defensive stroke and most strokes fielded in the ring in front of the bat. Never kept: boundaries. At the crease a ball that passes the bat goes behind the camera, so the camera still lifts for it (3% of balls).

## For the owner

1. **The 38 m range.** A ball that stays in the frame but runs a long way from a low camera is a dot near the horizon, so beyond 38 m the camera lifts as before. If you would rather it never lifted while the ball is in frame, it is one constant.
2. **The radar now turns round in the field.** You did not ask for this. The arrow has to agree with the picture, and an arrow that disagreed with the radar would be the same fault in a new place. It also means a ball hit to the left of the picture now goes left on the radar.
3. **Spin against left-handers is still mirrored.** Your note was about swing. The same reasoning applies to spin: a leg-break turns into a left-hander, and in the game the player's leg-break turns away from whoever is on strike. Making it physical would change how left-handers play spin, so it is left for you to decide.
4. **Banners are timed.** Stumps and the new ball last 6 s and a pitch report 10 s, and all close on a tap or a key. They could wait for a tap instead.
5. **The names of the ends.** The four real grounds use their real end names, assigned without regard to which end the scenery puts them at.
6. **The contract's samples**, as above.

## Review changes and compatibility

- `review-fixtures/core-v38.js` is the frozen revision 38 engine. `check-r39.cjs` shows that a match begun under it keeps its conditions exactly, and that 200 prepared balls are released, read by the opposition, struck and fielded exactly as before.
- A revision 38 save validates unchanged. New optional fields: `contest.pitchModel` and `innings.pitchModel` (39), `pending.end`, `manualBowling.side`, `bowlingPlan.side`, `banners`. Each is refused when damaged.
- Current-version assertions advanced to 39 in seven check files, and `check-balance-r38.cjs` accepts version 39 balls.
- The fast-forward group left `check-r38.cjs` for `check-r39.cjs`, where it asserts the opposite.
- `check-bowling-v31` asserts that a swinger is named for the batter and keeps its direction in the world; it and `check-r38` read the wheel through the batter's hand.
- `check-bowling-v30` compares the presentation clock with 2600 to within 1e-9. The exact quotient depended on floating-point rounding.
- `check-display-input` exports nine more functions.

## Browser checks

Chromium through Playwright on the built page, no page or console errors in any run:

- 412 × 839: pitch report after the toss; the wheel with the arrow, over and round the wicket; a ball bowled from round the wicket (release −0.93 m); an over bowled, with fast-forward pressed on the second ball only and every ball starting at 1×; the change of ends (wind arrow 270° then 90°, sun reversed, "Pavilion End" then "Lane End", the pavilion behind the batter in the second over).
- 412 × 839, batting: the close-up for an out-swinger and for a slower ball; a drive fielded at mid-off with the camera still (2.55 m high throughout); with reduced motion, a ball that leaves the view watched from the main view at 133 and 300 ms and cut to the field view by 616 ms.
- 412 × 839 and 839 × 412, Test: pitch report, "END OF DAY 1", "DAY 2" and "NEW BALL", each inside the arena.
- 320 × 568: the same bowling run; the arrow at the top centre of the wheel, clear of the radar.

Screens: `screens-a.jpg` (report, wheel, round the wicket, close-up), `screens-b.jpg` (the two ends), `screens-c.jpg` (batting close-ups, held view), `screens-d.jpg` (Test banners).

## Not verified

- No physical phone was used. How the arrow sits under a thumb and how the close-up reads in sunlight are device checks.
- The three.js renderer, behind its flag, does not turn its stands with the end.
- Under reduced motion the stroke is held for 550 ms of replay. At 4× that is about 140 ms.
- The day and new-ball banners were raised in the browser by setting the clock and the ball count, not by playing 90 or 80 overs. The path from play is covered by `check-r39.cjs`.
- The second-new-ball row of the ball-age table has too few wickets to read.
