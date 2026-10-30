# Revision 30 - bowling and fielding

11 October 2026. Single HTML; scoring 27, optional fielding 30, save schema 5. No new dependencies. The presentation clock remains 2600 ms per physical second. Older prepared balls preserve their exact results.

## Checks

- `balance-before.txt`: R29, 48 / 48.
- `balance-after.txt`: R30, 48 / 48. The supplied harness is unchanged (SHA-256 `8e09003ca2128e0684c87cf7f034178631aac2bd88c3c4f439aa3c4973c59747`).
- `review-after.txt`: all 76 portable review groups.
- `bowling-after.txt`: eight new groups exercising the actual input handlers and pure engine.

The tests cover both touch surfaces, continuous release length, pause/cancel/resume without rerolling the ball, named-player ratings, both spin families, field legality, bowler quotas, simulation stopping at the over, toss persistence, automatic close catching, outfield alternatives, position continuity, live drops and exact older outcomes. Rendering loops leave the seeded match state unchanged.

## Balance effect

| Measure | R29 | R30 |
| --- | ---: | ---: |
| T20 ground strokes, runs/over | 6.45 | 6.45 |
| T20 ground strokes, balls/wicket | 77.00 | 82.50 |
| Mixed T20 projected total | 189 | 189 |
| AI T20 first innings | 159.51 | 160.42 |
| AI Test first innings | 371.85 | 380.38 |
| AI Test draws | 12.5% | 15.0% |

An initial catch model over-penalised the first reachable intercept, which is often geometrically marginal even on an ordinary chance. This raised Test scores too far. The final handling model uses sustained running distance/effort, ball speed and hand height. It leaves the existing reach and contact balance intact. No harness target was changed or disputed.

## Presentation and limits

Native-canvas frames at 500 ms, 900 ms and after release show the bowler beside the umpire, the moving pitch marker, arm arc and ball leaving the hand. The new tests also draw the entire delivery and replay with finite coordinates. This is not a browser layout or Android frame-rate test.

The pre-ball bowling form occupies the control dock; it is removed during the action. Outfield buttons appear on aerial catches, pickups and boundaries. The default caller acts automatically if the player does nothing. Close catches have no selection prompt. Switching retains each player's current position before movement resumes. Drops visibly deflect at the original catch point, then use a real collection and return.

Bowling variations currently use style-based repertoires and the existing named-player ratings. Catch handling probabilities are design values rather than measured player-specific statistics. Real-phone timing and feel should be tested next. Purchasable ball brands, paid coins and advertisements are not part of this revision.
