# Revision 23 balance review

25 September 2026. Source build 23, scoring version 23, save schema 5, player profiles 19.

The seven reported defects are fair. Implemented movement and UI/save safety first, then batting, then opposition decisions. The source remains one self-contained HTML file with seeded simulation, existing presentation clocks and unchanged swipe grammar. Already prepared balls through revision 22 retain their previous rules.

## Requested harness: missing, not passed

`check-balance.cjs` was not present in the checkout, supplied attachments or available files. It has not been recreated, modified or substituted. An attempted invocation returns `MODULE_NOT_FOUND`; its output is in `validation-v23/requested-harness.txt`. Consequently there is **no before/after result from that exact harness**, and this release is not signed off against its unseen assertions. Please supply it for the remaining acceptance check.

The measurements below come from a separately named, disclosed diagnostic, `audit-balance.cjs`. Its protocol is the same before and after: 600 trials per scenario, 40 T20 matches and 20 Tests. Frozen revision 22 is in `review-fixtures/core-v22.js`. Do not compare its counts directly to the different populations in the supplied critique. No seed-specific branches, forced totals, artificial dismissals, result overrides or modified user targets are used.

## Measured before and after

| Measure | Revision 22 | Revision 23 |
| --- | ---: | ---: |
| Strongest tested perfect loft, maximum exit speed | 57.1 m/s | 41.4 m/s |
| Sixes from lofts 130 ms late | 482/600 | 0/600 |
| Ground shots, 60 ms timing SD: runs/over | 9.62 | 3.75 |
| Ground shots, 60 ms timing SD: wickets | 4/600 | 19/600 |
| Ground shots, 130 ms timing SD: wickets | 14/600 | 53/600 |
| Missed pace yorkers: four byes | 297/600 | 31/600 |
| Missed pace yorkers: keeper collections | 0/600 | 569/600 |
| Yorker outgoing lateral angle, mean | 19.39° | 1.38° |
| T20 first innings, mean ± SD | 200.22 ± 18.85 | 164.13 ± 22.37 |
| T20 first-innings wickets, mean | 2.42 | 5.72 |
| Test first innings, mean ± SD | 396.35 ± 57.32 | 331.15 ± 123.01 |
| First Test innings declared | 16/20 | 2/20 |
| Side batting last wins, 20-Test audit | 20/20 | 12/20 |

The independent all-loft policy uses 2,000 deliveries, standard 60 ms Gaussian timing error, full effort and sensible side selection. It scores 30.08 → 18.83 runs/over, with 96 → 348 wickets and 1539 → 589 sixes. This rate counts deliveries across many reset batters; it is not a projected 20-over innings that ignores being all out.

The 20-Test audit had no draws in either version. The separate 70-Test England v India run reaches the five-day limit naturally: 1 draw, 69 wins; first innings average 300.97 ± 97.66, range 130-536; the side batting last wins 37 of the decisive matches. Draws are supported but remain uncommon in this sample. That frequency is a continuing calibration limitation, not a reason to force a draw.

## Models and reasoning

1. **Movement.** `kick` now stores the signed deviation angle in radians for new balls. `Delivery.lateral` adds that angle to the incoming tangent at pitching. Delivery, rules/LBW, and continuation share the same lateral projection. The original displacement is converted using a reference good length of 5.5 m when preparing a new ball; historical balls remain in their previous units.
2. **Loft.** Player power sets a bat contribution and a ceiling capped at 43 m/s. Timing changes off-centre energy transfer, horizontal direction and elevation. The 62 m square / 70 m straight boundary ellipse is shared by scoring and rendering. Catch sampling includes the descending catch height and first ground contact. Actual fielder reach still decides the catch; there is no random dismissal added after the flight.
3. **Ground strokes.** Attacking windows narrow, the spin quality floor is removed, extreme errors can miss, and edges have pace-dependent trajectories capable of carrying to keeper/slips. Defence keeps wider coverage and softer edges. A defence no longer starts an automatic single; manual calls remain possible. Useful drive power was retained after an initial reduction proved excessive. The AI can attack reachable good lengths on their merits.
4. **Opposition.** Seeded Gaussian timing and occasional read errors replace the narrow three-uniform sum. Selection considers line, length, height, movement, field gaps, player strengths and match pressure, with the full shot vocabulary. Bowling aims mix the stumps and off-side channel; control influences wide attempts. Test bounce varies. Declarations use lead, time, wickets in hand, opposition rate and the expected bowling work remaining, rather than declaring at a fixed total.
5. **Recovery.** A failed save is backed up byte-for-byte under a dated key before replacement. The player gets an export option, also retained in the pause menu. A failed backup write prevents overwriting the original.
6. **Frame safety.** A thrown frame error pauses play, appears in the feedback row and is logged; `finally` schedules the next frame. Repeated identical logs are throttled.
7. **Release persistence.** Shot release and its immediate transition to a live ball defer serialisation. Completed balls, running commands, explicit pause and page-hide saves still write. Reloading before a deferred write may replay the already prepared delivery, rather than inventing an unsaved shot.

## Verification and regression fixture changes

`node review-check.cjs`: **All 44 portable review groups passed.** The pre-change suite passed 35 groups. The full repository additionally passes 13 gameplay and 10 display/input groups. These are core and UI-facade checks, not Android frame-rate or touch-feel measurements.

- New-delivery assertions change 22 → 23. No historical engine snapshot is rewritten.
- Revision 22 wide spin-contact fixtures explicitly stay on 22. The new-touch-flow fixture uses 160 ms rather than expecting a 460 ms attacking swipe to connect under narrower rules.
- The no-ball catch fixture uses a 20 ms release instead of 150 ms: the purpose is testing the dismissal exemption on a catchable ball, not demanding a catch from a now-missed shot.
- Handed AI fixtures mirror the saved field as well as the ball, because field-aware shot selection now depends on both.
- Keeper reach is checked against the rendered collector position, including the new bounded lunge. Ground pickups retain ordinary reach.
- The extracted UI harness includes the deferred-write flag and updated loading-block boundary. New tests exercise the actual recovery, release and frame handlers.

## Targets I disagree with

None of the supplied numerical design ranges are rejected. No user check has been changed to make a result pass. The exact acceptance harness is still required.

Two qualifications: the 43 m/s ceiling is an authored gameplay cap, not a proven universal human maximum; and a perfectly middled, correctly chosen loft by the strongest batter can still clear a 70 m rope reliably. The risk comes from timing, shot choice, power and reachable catches. The study [Comparing power hitting kinematics between skilled male and female cricket batters](https://oars.uos.ac.uk/1842/1/McErlain-Naylor%20et%20al.,%202021.pdf) reports a male-sample mean launch speed of 33.5 ± 2.6 m/s; it does not establish an absolute human limit.

Catches now dominate AI dismissals. Bowled and LBW both occur, but the dismissal mix and low draw frequency still deserve the requested harness and play-testing. Save compatibility, deterministic replay, presentation clocks and swipe grammar are regression-tested; they were not sacrificed to meet a sampled score.

## Reproduce

```sh
node review-check.cjs
node audit-balance.cjs review-fixtures/core-v22.js
node audit-balance.cjs
node audit-policy.cjs review-fixtures/core-v22.js
node audit-policy.cjs
node audit-holdout.cjs
```

## Complete before output: independent audit

```text
YORKER {"n":600,"byes4":297,"keeper":0,"angle":{"mean":19.39,"sd":9.3,"min":4.939018076123269,"max":49.97076170577249}}
LOFT {"0":{"balls":600,"runsPerOver":36,"wickets":0,"sixes":600,"maxExitSpeed":57.069108903814566,"contacts":600},"65":{"balls":600,"runsPerOver":33.97,"wickets":3,"sixes":561,"maxExitSpeed":44.57720730509954,"contacts":600},"130":{"balls":600,"runsPerOver":29.81,"wickets":9,"sixes":482,"maxExitSpeed":34.046175748938445,"contacts":600},"200":{"balls":600,"runsPerOver":4.74,"wickets":30,"sixes":0,"maxExitSpeed":25.979474065133022,"contacts":600}}
GROUND {"60":{"balls":600,"runsPerOver":9.62,"wickets":4,"edges":16,"misses":1},"130":{"balls":600,"runsPerOver":6.72,"wickets":14,"edges":45,"misses":46}}
AI T20 {"matches":40,"firstInnings":{"mean":200.22,"sd":18.85,"min":168,"max":249},"wickets":{"mean":2.42,"sd":1.55,"min":0,"max":7},"balls":{"mean":120,"sd":0,"min":120,"max":120},"declared":[],"draws":0,"batLastWins":18,"dismissals":{"bowled":19,"caught":166,"runOut":12},"extras":{"wides":41,"noBalls":122,"byes":77,"legByes":0},"deliveries":9592,"shots":["On drive","Late cut","Yorker dig","Cover drive","Forward defence","Square cut","Duck","Leg glance","Yorker defence","Leave","Hook","Pull","Sweep","Slog sweep","Back-foot defence","Upper cut"]}
AI TEST {"matches":20,"firstInnings":{"mean":396.35,"sd":57.32,"min":186,"max":425},"wickets":{"mean":6.05,"sd":2.64,"min":2,"max":10},"balls":{"mean":507.15,"sd":63.5,"min":279,"max":589},"declared":[420,420,421,422,420,420,423,420,420,420,425,420,420,420,420,424],"draws":0,"batLastWins":20,"dismissals":{"caught":181,"bowled":233,"lbw":5,"runOut":1},"extras":{"wides":72,"noBalls":505,"byes":302,"legByes":8},"deliveries":37212,"shots":["Forward defence","Hook","Leg glance","Cover drive","Duck","Leave","Late cut","Yorker defence","Square cut","On drive","Pull","Back-foot defence","Sweep","Yorker dig","Slog sweep","Upper cut"]}
```

## Complete after output: independent audit

```text
YORKER {"n":600,"byes4":31,"keeper":569,"angle":{"mean":1.38,"sd":0.56,"min":0.45229560958513465,"max":2.806231201585942}}
LOFT {"0":{"balls":600,"runsPerOver":35.57,"wickets":3,"sixes":592,"maxExitSpeed":41.36809461811569,"contacts":600},"65":{"balls":600,"runsPerOver":6.72,"wickets":51,"sixes":0,"maxExitSpeed":25.998762115688987,"contacts":600},"130":{"balls":600,"runsPerOver":1.08,"wickets":492,"sixes":0,"maxExitSpeed":23.20771036078454,"contacts":186},"200":{"balls":600,"runsPerOver":0,"wickets":600,"sixes":0,"maxExitSpeed":0,"contacts":0}}
GROUND {"60":{"balls":600,"runsPerOver":3.75,"wickets":19,"edges":23,"misses":12},"130":{"balls":600,"runsPerOver":2.54,"wickets":53,"edges":35,"misses":158}}
AI T20 {"matches":40,"firstInnings":{"mean":164.13,"sd":22.37,"min":127,"max":248},"wickets":{"mean":5.72,"sd":2.3,"min":2,"max":10},"balls":{"mean":119.5,"sd":2.28,"min":107,"max":120},"declared":[],"draws":0,"batLastWins":17,"dismissals":{"caught":373,"bowled":20,"lbw":38},"extras":{"wides":305,"noBalls":121,"byes":13,"legByes":15},"deliveries":9465,"shots":["Square drive","On drive","Cover drive","Leg glance","Straight drive","Off drive","Late cut","Yorker defence","Leave","Square cut","Pull","Sweep","Paddle sweep","Slog sweep","Back-foot punch","Yorker dig","Hook","Forward defence","Duck","Back-foot defence","Upper cut"]}
AI TEST {"matches":20,"firstInnings":{"mean":331.15,"sd":123.01,"min":158,"max":585},"wickets":{"mean":9.7,"sd":0.95,"min":6,"max":10},"balls":{"mean":483.9,"sd":154.32,"min":259,"max":762},"declared":[585,528],"draws":0,"batLastWins":12,"dismissals":{"caught":652,"bowled":25,"lbw":37},"extras":{"wides":460,"noBalls":472,"byes":55,"legByes":26},"deliveries":34761,"shots":["Forward defence","On drive","Duck","Off drive","Square cut","Hook","Yorker defence","Back-foot defence","Leave","Cover drive","Straight drive","Leg glance","Late cut","Sweep","Square drive","Back-foot punch","Paddle sweep","Pull","Yorker dig","Slog sweep"]}
```

The complete review logs, policy logs, held-out run and missing-harness error are in `validation-v23/`. The change entry is in the source pack's `PROJECT_NOTES.md` (repository `README.md`).
