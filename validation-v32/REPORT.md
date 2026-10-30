# Revision 32 - bowling controls and fielding calls

12 October 2026. Single self-contained HTML; no new runtime dependencies.

## Changes

- Removed pitch-overlaid length text. The variation and movement symbol sit beside the release arm; fixed length labels and a moving marker replace rapidly changing words. Bowling prompts are no longer overwritten by the batting controls.
- Horizontal swipes on the field change the target line. A 180 ms hold starts the arm at age zero, separating aiming from release. A cancelled/paused swipe cannot prepare a ball, alter a saved delivery or consume match randomness.
- Outfield calls use rings around the actual drawn players and 54-pixel minimum tap targets. Tapping an alternate reachable player changes the caller without teleporting anyone or rerolling the chance. The old bottom buttons are hidden. Close reflex catches are automatic; the same affordance exists for aerial boundaries and pickups.
- The bowler selector appears before the first ball of an over, including after finishing the previous over. It is hidden after any ball starts that over, even an illegal one.
- Each available variation has an original canvas ball/arrow symbol. Swing curves, seam, bounce turn, topspin dip and the slower-ball clock have distinct cues. Left-handed views mirror the direction where appropriate.
- Spinner release labels include Full toss, Very full, Overpitched, Full, Good length, Short and Drag down. A newly selected spinner now uses the selected player's archetype/family instead of a stale scheduled-bowler classification. Manual release paths therefore use the correct spin movement and bounce model.
- New fielding version 32 uses a 2.2% handling-error floor, with further risk for speed, sustained sprinting and awkward hand height. Drops remain live and are retrieved through the existing engine. Switching a previously dropped chance to a held catch clears the old dropped flag.

## Validation

- `node check-balance.cjs`: **48 passed, 0 failed**, before and after. The supplied contract is unchanged.
- `node review-check.cjs`: **90 portable review groups passed**, including eight new R32 groups.
- `node check-bowling-v32.cjs`: all eight groups pass using the real UI handlers and core.
- `node measure-fielding-v32.cjs`: paired diagnostic below. The 20 shot scenarios for each delivery are correlated; this is a controlled engine comparison, not an estimate of an independent real-match drop percentage.

| Catch diagnostic | R31 | R32 |
| --- | ---: | ---: |
| Chances | 1,250 | 1,250 |
| Drops | 12 | 35 |
| Observed drop share | 0.96% | 2.80% |
| Mean model drop probability | 0.97% | 3.91% |

Ground T20 scoring remains 6.45 runs/over, 82.5 balls/wicket. The mixed batting projection is 188. AI T20 mean is 161.26, Test mean 383.90 and Test draws 15%. No unrelated batting, bowling or AI calibration constants were changed.

Unedited outputs: `balance-before.txt`, `balance-after.txt`, `review-after.txt`, `bowling-after.txt`, `drops.txt`.

## Compatibility and regression changes

Scoring version 27, save schema 5, batting swipes, human timing offset and the uniform incoming clock remain unchanged. New manual and fielding markers are 32. Frozen R31 comparisons cover ordinary and manually prepared balls in both formats, full tosses, pace/spin contact, catches, shot outcomes and RNG. Earlier compatibility groups remain in the review suite. New presentation drawings do not sample randomness or change engine state.

The R30/R31 UI setup helpers wait for the visible arm before measuring release age because field holds now distinguish aiming from bowling. The release-age assertions remain 620/900 ms. A fresh manual-version assertion now expects 32; exact R31 behaviour is checked against `review-fixtures/core-v31.js`.

## Visual inspection and limits

`canvas-frames.png` contains six native-canvas frames: two pace release ages, the released ball, a spinner's length widget and the same outfield frame before/after a fielder tap. The words remain fixed, the spinner shows its own movement/length cues, the selected ring moves to the tapped player without a position jump, and the release widget clears after the ball leaves the hand. The frames use the actual drawing functions through a DOM facade; they do not render browser CSS.

No browser layout check or Android device test was available. Swipe feel, visibility on Louis's phone and performance still need a play-test. There are no disputed balance targets in this revision.
