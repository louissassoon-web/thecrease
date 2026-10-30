# Cricket game - coder review pack

This is the complete playable source for Louis's browser cricket game, updated on 12 October 2026. Revision 32 clears bowling text from the pitch, adds screen swipes for target lines, direct on-field catcher taps, over-break bowler selection, movement icons and spin-specific length labels. Catching now has a larger difficulty-based handling allowance, and manually selected spinners use their own classification. Older prepared balls keep their rules. Ball purchases remain out of scope. It passes 48 balance checks and 90 portable review groups. See validation-v32/REPORT.md for current results; earlier reports are retained as history.

## Run it

Open `dist/index.html` in Chrome. It contains all HTML, CSS, game logic, procedural graphics, synthesised audio and embedded fonts. There are no npm packages, build commands, API keys, accounts or downloaded assets required to play.

For predictable local save behaviour, you can serve the folder:

```sh
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`. Saves are per browser and origin. The pause menu has JSON save export/import. This pack contains no personal career save.

The shared live game is [Cricket - The crease](https://cricket-three-over.workspace-710372.chatgpt.site).

## Run the portable checks

With Node 18 or newer, from the extracted folder:

```sh
node check-balance.cjs
node review-check.cjs
```

The balance harness runs 48 checks. The portable review runs 90 groups (including eight R32 controls/catching groups, six R31 bowling-control groups, eight R30 bowling/fielding groups, two R27 model groups, eight R28 presentation groups and six R29 batting presentation groups): eight player-profile groups, seven automatic-over/input/replay groups, six spin/drive groups, seven world/presentation/progression groups, seven fielding/contact/shop regression groups, nine model, compatibility and safety groups, four boundary/clock groups, and four human timing-offset groups. No installation or Git history is needed. The UI checks use a DOM/canvas facade; they do not render CSS or replace testing on an Android phone.

## Files

| File | Purpose |
| --- | --- |
| `check-bowling-v32.cjs`, `measure-fielding-v32.cjs`, `validation-v32/` | Screen aiming, on-field taps, spin labels/icons, drops, exact R31 compatibility |
| `check-bowling-v31.cjs`, `validation-v31/` | Bowling gallery, release misses, camera, swing and prepared-R30 compatibility |
| `check-bowling-v30.cjs`, `validation-v30/` | Bowling, simulation, toss, selection, drops, save and compatibility checks |
| `check-batting-presentation-v29.cjs`, `validation-v29/` | Actual touch, clock, shop, mirrored-camera, contact and redraw regressions, with render measurements |
| `MONETISATION_NOTES.md` | Proposed native packaging, billing and ads; no payments or ads are live |
| `check-presentation-v28.cjs`, `validation-v28/` | New UI/presentation regressions, full review output and rendered canvas evidence |
| `check-model-v27.cjs` | Gradual edge exposure and preserved ground/perfect-loft physics |
| `dist/index.html` | Complete application; the authoritative source |
| `PLAYER_PROFILES.md` | Rating methodology, sources, effects, compatibility and limitations |
| `player-profiles.json` | Readable reference export of ratings for every roster place |
| `export-player-profiles.cjs` | Regenerate that reference after changing inline ratings |
| `check-player-profiles.cjs` | Named-ability, save, replay and UI regressions |
| `check-fielding-balance.cjs` | Visible catches/returns through actual drawing, fitted cameras, limb geometry, contact balance, shop gating and version 20 compatibility |
| `check-world-progression.cjs` | Continuous ball presentation, rewards, the actual shop, venue scenes, resets and introduction queues |
| `check-spin-drives.cjs` | Spin contact, drive footwork, scoring variety, actual pointer handlers and version 19 compatibility |
| `check-over-flow.cjs` | Continuous overs, gesture input and fast-forward regressions |
| `check-display-input.cjs` | Shared DOM/canvas harness; its direct legacy tests require the original repository |
| `review-fixtures/core-v18.js`, `core-v19.js`, `core-v20.js`, `core-v22.js`, `core-v23.js`, `core-v24.js`, `core-v25.js`, `core-v26.js` | Previous pure engines used to prove existing saved shots keep their outcomes |
| `check-model-v23.cjs` | Angular movement, saved V22/V23/V24/V25/V26 replay, save safety, frame recovery, deferred writes, power/catches and AI |
| `audit-balance.cjs`, `audit-policy.cjs`, `audit-holdout.cjs` | Earlier reproducible diagnostics retained for comparison |
| `check-balance.cjs` | Unedited user-supplied revision 27 acceptance contract |
| `audit-calibration.cjs`, `audit-matches.cjs` | Independent fixed delivery curves and 40-match samples in each format |
| `BALANCE_REPORT.md`, `validation-v27/` | R27 model changes, unedited before/after outputs, edge curves, Test draws and geometry explanation |
| `check-timing-offset.cjs` | Actual touch release, learning offer, Apply/Not now, settings limits, old saves and AI isolation |
| `audit-revision26.cjs`, `audit-strategies-v26.cjs` | Independent timing curves, phase counts and fixed batting-policy populations |
| `validation-v25/` | Previous revision report, measurements and chase frames |
| `audit-spin.cjs`, `check-boundaries.cjs` | Spin/pace diagnostics and boundary/clock regressions |
| `validation-v24/` | Previous revision report and measurements |
| `validation-v23/` | Previous revision report and measurements |
| `review-check.cjs` | Portable review test entrypoint |
| `PROJECT_NOTES.md` | Project history and known limitations; some historical test commands refer to the full repository |
| `RELEASE.json` | Source revision and SHA-256 of the playable HTML |

## Timing calibration

Pause and open Settings for Timing offset, -10/+10 ms and Reset. Negative values compensate for early release; positive values compensate for late release. No offset is applied automatically. A median-based suggestion can appear in the existing feedback area after 20 legal balls or at innings end, once per innings. Apply accepts it; Not now keeps the current value. Both the raw human release error and corrected error are retained in history. Export/import includes the preference and last 40 raw swings. The AI does not use either.

## Where to start in the code

The first large block is embedded font data. Search for these markers instead of reading it:

- `<script id="cricket-core">`: pure deterministic modules, exported as `Cricket`.
- `const Players`: named player data and conversion into gameplay attributes.
- `const Economy`, `const Broadcast`, `const BallView`: shared progression, pre-delivery cards and visual ball continuity.
- `const Gesture`: direct swipes and the latched backswing gesture.
- `const Contact` and `NormalBall.launch`: timing, edges and exit speed.
- `Bowling.delivery`, `Delivery.at`: bowling plans and the delivery path.
- `LiveBall`, `Rules`, `Running`, `Innings`, `Contest`: fielding, scoring and match progression.
- `Season`, `CareerSave`: fixtures, tables and persistence.
- `<script id="cricket-ui">`: pointer events, canvas rendering, audio, menus and browser storage.
- `renderProfiles`: the paused player browser.

Several modules are wrapped by later version-specific implementations. Read the last assignment as well as the original definition. This preserves older saves, but the accumulated wrappers are a worthwhile review target. Avoid deleting old paths without a migration plan.

## Revision 26 - timing-led edges, bowling lengths and input calibration

New ground-stroke edge risk no longer includes revision 25's flat pace or spin surcharge. The central 30 ms carries no added timing risk; exposure grows with release error and stroke commitment, with a spin reaction-time discount. Movement, unsuitable shots and excess reach still matter. Defence and loft retain their existing contact rules.

T20 pace yorker bases are 5%, 8% and 28% in the powerplay, middle and death, with the existing named yorker skill weighting. Controlled pace bowling puts more full-length attempts on a good length and uses a tighter body/stump line. Bowler control also narrows T20 full/good attacking ground precision within the existing bounds. This contains scoring through bowling quality without taxing a perfectly timed stroke. Test bowling plans, spin lengths, launch physics and AI stroke selection are unchanged.

Timing offset is an optional saved human-input preference, default 0 and limited to ±200 ms. Touch release preserves rawError and subtracts the offset from error; feedback and the existing bat-contact clock use that corrected error. The last 40 raw human swings supply a median check every 20 legal balls and at innings end. Apply or Not now appears once per innings, between deliveries. Applying rounds to 10 ms. Settings has -10/+10 and Reset. AI input is untouched. Older saves gain a zero offset; their own historical uncorrected swings seed the learning buffer without rewriting history or prepared shots.

New balls use scoring version 26. Prepared revision 22–25 outcomes and AI inputs remain exact; schema 5, profiles 19, the swipe grammar, uniform 2600 ms clock, boundary chasing/running and safety fixes stay intact. No dependency or runtime asset was added. All 52 portable review groups pass, including four new calibration groups. The former all-windows-equal fixture now checks the intentional bowler-control effect on new T20 ground attacks while retaining exact older windows and the uniform clock.

The supplied harness is byte-for-byte unchanged: before 44/47, after 45/47. All four new checks pass. Two targets remain disputed and failing: the mixed-policy projected ceiling of 190 (207, while its 10.35 runs/over is allowed) and the pure-slog minimum survival of 5 balls/wicket (4.78). These are not claimed as passes. Wider samples also show AI T20 scoring above the desired band and unreliable Test draws. See BALANCE_REPORT.md and validation-v26/ for full outputs, measurements and limitations. No browser CSS or Android latency result is claimed.

## Revision 25 - spin parity and live boundaries (historical)

Boundary fours and sixes name the quickest chaser to the crossing point. The fielder runs from the real field position, reaches down at the rope after the ball, then turns and walks. The two support fielders retain their small moves. Both boundary types allow running and cancellation while the ball travels; the umpire signal ends the legs at the crossing time. There is no boundary run-out or invented throw. Scoring uses the boundary allowance or completed runs, whichever is greater. Pickups keep their real return and run-out risk.

Spin edges now span downward, steeper and wider deflections instead of all being lobbed at the close keeper. The spin movement contribution to contact risk is reduced to 40%, because the chosen stroke already reads the arrival line. Residual attacking risk scales with bowler control and is larger against pace, where there is less reaction time. Defence remains forgiving; suitability, timing windows and quality curves retain revision 24 behaviour.

Ground strokes gain up to 12% of their bat contribution as incoming speed drops from 28 to 16.5 m/s. This represents time to complete the swing and reach the pitch; incoming-ball energy, guided deflections, loft and named power differences remain intact. T20 bowling transfers a small share of full balls into good lengths and pace yorkers to contain the resulting scoring increase. Test length plans and AI shot selection are unchanged.

New spin deliveries use the same 2600 presentation milliseconds per physical second before and after pitching. The revision 17 post-bounce stretch is retained only for prepared older balls. New balls use scoring version 25; prepared revision 22, 23 and 24 outcomes, AI inputs and saves remain supported. Schema 5, swipe grammar, seeded determinism, the single-file build and the revision 23 safety fixes are unchanged. Chase and runner animation use saved event data and time without advancing match RNG.

The supplied 43-check contract is unedited: revision 24 passes 33/43; revision 25 passes 43/43. All 48 portable review groups pass. Version assertions now expect 25, compatibility fixtures include the frozen revision 24 engine, and the fast-forward fixture explicitly selects a pickup because running no longer implies a throw. Four new groups cover boundary commands/scoring, the real canvas chase path, pickup returns and the uniform clock. See BALANCE_REPORT.md and validation-v25/ for raw outputs and the re-measured spin/pace table. No target is disputed.

## Revision 24 - batting and opposition calibration (historical)

Attacking quality now falls gradually across ordinary phone release offsets. Pace loft coverage is 200-230 ms; spin loft can extend to 270 ms, while ground coverage follows player precision within 210-300 ms. The exponential quality curves are softer, without a quality floor or a power bonus for perfect timing. Ground strokes retain more of their bat contribution at middling quality, so placement and running remain useful.

Loft keeps the 43 m/s player-dependent ceiling and the existing boundary ellipse. Shorter aerial strokes stay flatter; a committed swing opens the face and magnifies angular scatter. Speed falls less steeply with quality, while elevation and direction spread with mistiming. This puts more imperfect full swings into reachable catching arcs. The field still has to intercept the actual flight.

Edges now vary below, above and beside the cordon. Soft defensive edges more often fall short, and defensive timing risk is lower. Movement still raises the edge risk of attacking ground strokes. Catch reach, yorker geometry and keeper collection are unchanged.

The opposition chooses from a perceived line and length and can misread either. Rare large timing errors can miss straight balls; the existing pad and stump geometry decides LBW or bowled. Defence reduces the penalty for a misread. T20 finishers loft more often at the death, with more measured ground effort. Tests select more defensive strokes, and the survival decision considers required rate, wickets, remaining time and a late second-innings deficit. Match context is transient; declarations, clocks and the five-day limit are unchanged.

New balls use scoring version 24. Prepared revision 22 and 23 balls retain exact shot outcomes and AI inputs, and both save revisions remain accepted. Schema 5, profiles 19, swipe grammar, presentation clocks, dependencies and the revision 23 safety fixes are unchanged. The supplied `check-balance.cjs` is byte-for-byte unedited: revision 23 passes 20/32; revision 24 passes 32/32. The 44 portable review groups also pass. See `BALANCE_REPORT.md` and `validation-v24/` for complete output, independent samples and fixture changes.

## Revision 23 - balance and save safety (historical)

Bounce movement is now a signed angle at pitching, shared by delivery, LBW projection and continuation. Its displacement grows with distance travelled after the bounce, removing the extreme sideways yorkers. Bowling plans mix the stumps and off-side channel, with control-dependent wides and variable Test bounce.

Loft uses player-dependent power capped at 43 m/s. Timing error changes speed, direction and elevation. Scoring, the field and radar share a 62 m square / 70 m straight boundary ellipse. Fielding explicitly samples descending catch height and landing; a bounded lunge keeps the collector's hands aligned with a permitted catch.

Attacking contact windows narrow and revision 22's spin quality floor is removed. Mistimed attacks can edge or miss; edge height reflects incoming pace and hand softness. Defence retains generous coverage and holds the crease until a run is called. Controlled drives retain useful power and named-player differences.

The AI reads line, length, height, movement, field gaps and player strengths, with seeded Gaussian timing and occasional reading errors. It leaves and defends on merit, attacks reachable good lengths, and uses the full shot range. Declarations depend on lead, time left, wickets and the remaining bowling work. Totals and results are never forced.

Invalid saves receive a dated, byte-for-byte backup and an export option before replacement. Failed backup writes protect the original. Frame exceptions pause play, report in the feedback row and keep animation callbacks alive. Release/contact writes wait until the ball is dead; completed-ball and running-command writes remain.

New balls use scoring version 23; prepared balls through 22 retain their rules. Schema 5, profiles 19, presentation clocks, swipe grammar and the single-file build stay unchanged. All 44 portable review groups pass. See `validation-v23/REPORT.md` and `validation-v23/` for measurements and regression changes. The requested `check-balance.cjs` was not supplied, reconstructed or edited.

## Previous revision 22 changes

The renderer incorrectly stopped drawing the ball at the interception time. It now renders the catch, held ball, gather and full return throw. Nearby ball/player meshes share depth ordering. Catching hands prepare at the ball's height and close around it; the caught ball rises smoothly to the chest. Close catches behind the wicket have a steady front/side camera, a 1.05-second minimum approach and a 1.25-second hold after collection. The wicket card waits 950 ms so the catch can be seen first. The field camera includes the return throw's arc. Presentation clocks do not change the scoring interception or match RNG.

The fielder rig now bases the stride on distance travelled, eases out near collection, and keeps a stable heading while arriving. Crouch, gathering, turning towards the wicket, release and recovery are blended. The keeper no longer snaps out of the ready crouch when a catch begins. Catching hands have space for the ball. The batter's foot plant and body weight transfer are offset, with a less rigid held finish. Joint lengths remain constrained by two-link inverse kinematics.

Short-ball off-side diagonals from 28 to 112 degrees select a square cut. Short cuts with width gain contact coverage, without increasing middled power. Cramped cuts and excessive reach retain risk. Controlled spin ground strokes now have 520-640 ms coverage each side of arrival, defence 560-700 ms, and loft 285-380 ms. The precision window remains separate. Weak controlled contact loses power and no longer forces an edge solely because quality is low. The thresholds are game assistance, not real-world batting measurements.

The shop is available before the first prepared ball and after a complete match. It stays closed at over breaks and Test innings breaks, with the access check repeated at purchase/equip time. Existing coins, ownership, rewards and saves are preserved.

The current source and scoring revision is 26, with version 19 player profiles. Versions 18, 19, 20, 22, 23, 24 and 25 have frozen regression engines to verify old prepared shots remain identical.

## Animation-library assessment

[Tween.js](https://tweenjs.github.io/tween.js/docs/user_guide.html) provides easing, interpolation and externally controlled tween time. It can help coordinate transitions, but it does not supply cricket motion or anatomical poses. The current single-file game already uses deterministic interpolation and a constrained joint model. This release corrects those state transitions without adding a dependency.

[Spine for Phaser](https://esotericsoftware.com/spine-phaser) is a possible future route for authored skeletal animation. It requires exported skeleton/animation data and texture atlases; the runtime and editor export versions must match, and its licensing needs reviewing before adoption. That is an asset-authoring and renderer change, not a substitute for calibrating the existing catch and shot timing. No Spine assets or runtime are included.

Validation includes actual canvas drawing through the portable facade, original-engine save comparisons, deterministic input trials and rendered native-canvas stills of keeper/slip catches and a deep return. The latter inspect the game's draw code, not browser CSS, Android input latency or frame rate. Physical Android play-testing is still required.

## Useful review priorities

1. Play on Android in pad and full-screen modes. Check backswing recognition, release timing, readable profiles and reduced motion.
2. Compare specialist batters, finishers and the tail under matched shots. Refine numerical differences without making outcomes automatic.
3. Check the physical relationship between ball movement, drawn bat contact, edges and fielders.
4. Export during a live ball, reload, import and compare the continuation. RNG and profile snapshots must stay deterministic.
5. Consider reducing the version-wrapper complexity while retaining exact legacy behaviour.

The project prioritises gameplay. Manual bowling, player-specific fielding, stumpings, a full overthrow chase, offline home-screen caching, player recruitment and deeper career progression remain incomplete. T20 and Test innings, simulated opposition batting, leagues, running decisions, weather, sound, celebrations and shared testing are implemented.

The game uses original procedural artwork and synthesised audio. Embedded font licences are included in Settings and in the HTML source. The pack omits hosting credentials, deployment configuration, repository metadata and personal saves.
