# Player profiles - revision 19

The game contains 145 named players across the existing Test and T20 fantasy XIs. It now uses individual batting profiles and 79 bowling profiles, including 66 different players in the current five-bowler attacks. Thirteen other all-rounders have bowling profiles for inspection but are outside those attacks. This change does not update the XIs to a current official selection.

## What is evidence, and what is calibration?

The profiles represent broad career styles. The numbers are hand-tuned game estimates, not ICC ratings, measured physical abilities or a statistical fit to ball-by-ball data. Not every player has been individually researched for this update. The wider roster uses conservative role-based estimates; the reference cases below anchor the model and are useful starting points for further review. Current form, injury, fatigue and individual opposition history are not modelled.

A low rating is a relative weakness, not a claim that a professional cannot play that shot. Exact pace bands are game ranges for stock deliveries, not measured career minima/maxima. Slower balls have their own reduction.

Evidence checked on 17 September 2026:

| Reference | What it supports | Implementation judgement |
| --- | --- | --- |
| [ICC: Root's Sri Lanka century](https://www.icc-cricket.com/news/joe-root-masterclass-steers-england-to-powerful-lead) and [ICC: Root's Ranchi hundred](https://www.icc-cricket.com/tournaments/world-test-championship/news/playing-the-situation-helped-root-carve-stellar-31st-test-hundred) | Adaptability, patient conventional batting and successful scoring against spin | High Test timing, defence and spin control; less raw boundary power than specialist finishers |
| [Cricket Australia: Smith's route to 10,000 Test runs](https://www.cricket.com.au/news/4193300/steve-smith-australia-test-milestone-10k-runs-batting-career-highlights) | Developed shot selection, respect for the new ball and sustained Test batting success | Very high Test control and defence; lower T20 control and loft emphasis |
| [Cricket Australia: Head's 600-run Ashes campaign](https://www.cricket.com.au/news/4436567/travis-head-anatomy-of-a-600-run-ashes-campaign-australia-england-three-centries-opening-batter-cricketplus) | Strong attacking production, notably cutting | High attacking power and back-foot control |
| [Cricket Australia: Tim David's T20 role](https://www.cricket.com.au/news/4395217/) | His established finishing role and boundary hitting | High power and loft control, weaker defensive emphasis |
| [ICC: England's Caribbean six-hitting series](https://www.icc-cricket.com/news/buttler-pleased-with-takeaways-for-t20-world-cup-after-sixathon-in-west-indies) | Salt and Buttler's role in a boundary-heavy T20 batting order | High T20 control and power, distinct from Test placement specialists |
| [ICC: Williamson's consistency](https://www.icc-cricket.com/tournaments/cricketworldcup/news/kane-williamson-captain-fantastic-and-mr-consistent-at-cwc19) | Composed batting and consistency | A control-led profile with strong defence and drives |
| [ICC: Bumrah's 2024 T20 World Cup](https://www.icc-cricket.com/tournaments/t20cricketworldcup/news/a-genius-of-his-craft-reflecting-on-jasprit-bumrah-s-t20-world-cup-2024) | Control, changes of pace, movement and effective death bowling | Strong control, variations and yorkers, rather than speed alone |
| [ICC: Archer's pace](https://www.icc-cricket.com/news/jofra-archer-is-the-fastest-ive-ever-faced-says-england-team-mate-moeen-ali) | Express pace and steep bouncers | Fast/seam profile with a higher stock pace range and bounce |
| [Cricket Australia: Lyon's overspin](https://www.cricket.com.au/news/3319826) | Overspin and bounce as distinguishing features | High bounce and control for a Test finger spinner |
| [ICC: Kuldeep's profile](https://www.icc-cricket.com/rankings/63187/kuldeep-yada) | Left-arm wrist-spin identity | Left-arm wrist-spin with a larger movement/variation emphasis |

Other player-specific shot and matchup overrides, including Duckett's sweep preference and Dube's spin-hitting emphasis, are qualitative game estimates. They should be treated as reviewable hypotheses, not unsupported claims of measured success rates.

## Actual game effects

- Each player has independent Test and T20 control ratings. Power and shot preferences are then applied to that format's profile.
- Timing, facing pace/spin and the selected shot's control adjust the contact window. Defence, drives, back-foot shots, sweeps and loft use their relevant rating.
- Power affects bat contribution to exit speed. There is no fixed boundary reward or guaranteed wicket based on a player's name. Flight, bounce, field placement and catches still use the physical simulation.
- Bowlers have individual stock pace ranges, accuracy, movement, bounce, variation and yorker skill. Format still controls the overall Test/T20 plan. Bowler identity remains fixed through an over, including during transition from an older save.
- Opposition batting uses the same player attributes. Bowling skill also affects the seeded opposition timing error.
- The pause menu's Player profiles screen shows both teams, their strongest and lowest ratings, and bowling details. It does not run the match clock.

## Data and code

The authoritative data is inside `const Players` in `dist/index.html`:

- `rows`: name, Test control, T20 control, power, base batting style.
- `bowlingRows`: name, type, arm, lower/upper stock pace, control, movement, bounce, variations, yorkers, Test skill, T20 skill.
- `styles`: base shot/matchup offsets.
- `overrides`: explicit named shot preferences.
- `batting`: builds the final format profile.
- `effective`: maps game ratings into timing/power multipliers.
- `Bowling.delivery`: the guarded revision-19 delivery model after the profile module.

`player-profiles.json` is a human-readable export of the resulting profiles for the 176 roster places. It is a reference export, not a runtime dependency. Editing that JSON alone does not change the game. Edit the inline data and regenerate the reference with `node export-player-profiles.cjs`.

## Save compatibility

New deliveries use scoring version 19 and contain complete batting and bowling profile snapshots. Saved, unplayed version 17 or older balls keep their original rules; the next preparation adopts the profiles. No score or completed outcome is recalculated. The existing schema 5 is extended with validated optional profile data.

Stable player IDs are separate from editable names. Older saves without IDs recover identity from their original format/team/roster slot, including renamed players. Handedness edits remain independent. Future squad transfers will need to preserve these IDs rather than rely on fallback slots.

## Evidence from automated checks

The portable profile suite checks all 145 players, all 80 scheduled bowling slots, real timing/power differences, integer bowling speeds, style consistency, seeded determinism, original version-18 shot outcomes, renamed players, the actual paused UI, profile validation and live save/resume.

In controlled inputs, 24 clean lofts produced mean exit speeds of 42.77 m/s for Root and 49.65 m/s for David. This demonstrates the game effect; it is not a measurement of their real bat speed. In 500 seeded death-over deliveries each, Bumrah produced six wides and 265 yorkers; Rana produced 11 and 246. These are model checks, not predicted career rates.

Browser layout, physical Android swipe feel, sound balance and frame rate have not been verified for this update. The numerical calibration should be refined through play testing, particularly the strength gap between specialist batters and the tail. Player-specific fielding ability is not included in this update.
