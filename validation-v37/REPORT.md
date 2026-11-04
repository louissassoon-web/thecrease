# Revision 37 - mobile usability and opposition running

4 November 2026. Base: revision 36, GitHub commit 909ff72787ba78b14488d8749a4a98e39f71197c.

## Changes

- Run-out choices keep play moving at normal speed. Fourfold playback slows at collection for an actual chance, with no frozen clock. If no end is chosen, the existing automatic throw proceeds when its choice window expires.
- Opposition runners on new manual deliveries judge an ordinary quick return to either end, with seeded judgement variation. They no longer gain apparent running time from the human throw-choice allowance. Human running controls, the three-run limit, receiver backups and historical prepared balls retain their rules.
- Line-gallery labels and arrows refresh on a striker hand change. The camera uses the selected bowler's real arm and prepared release side, including the first ball, with the existing quiet transition.
- A skippable three-step animated intro teaches batting, bowling and running/fielding. It appears for new careers and is replayable from How to play. Instructions are shorter. Old saves are not forced through it.
- Settings has a direct vibration test and honest failure guidance, plus sound volume and a sound test. Effects are quieter and less repetitive; crowd reactions no longer use the old pitched drones. They remain generated audio, not library recordings.

## Gates

| Check | Before | After |
| --- | ---: | ---: |
| Unedited balance contract | 48/48 | 48/48 |
| Portable review groups | 112 | 119 |
| Offline checks | 12/12 | 12/12 |

Full unedited outputs: balance-before.txt, balance-after.txt, review-before.txt, review.txt and offline.txt. The balance outputs are byte-identical. No target was changed or disputed in this revision.

## Manual-bowling diagnostic

`node tools/measure-running.cjs review-fixtures/core-v35.js` and `node tools/measure-running.cjs` run the same independently seeded 40 T20 innings. The policy varies line, ball and release and chooses the quicker end on a live chance. It measures the reported manual-bowling problem, which the AI-versus-AI balance contract does not cover.

| Measure | R36 | R37 |
| --- | ---: | ---: |
| Run-outs | 137 | 23 |
| Run-outs per innings | 3.43 | 0.58 |
| Run-outs as share of wickets | 34.34% | 6.27% |
| Runs per innings | 112.88 | 151.48 |

The raw JSON outputs retain ball and wicket counts. These numbers apply to this bowling policy; they are not estimates of every player's results.

## Review changes and compatibility

Seven added groups cover accepted/rejected haptics and late native failures, handed gallery refresh, first-ball camera and actual bowler profiles, an expiring run-out choice with continuous movement, first-play/replayed/skipped demos, bounded varied sound with volume/mute, and exact prepared-R35 compatibility.

R35/R36 tests that deliberately expected a frozen return clock now assert continued movement, 4× dropping to 1× and save/resume. A fielding test supplies an explicit tight-running leg to exercise the two return ends; it no longer requires the AI to repeat an avoidable first-ball run-out. Assertions for newly prepared delivery versions now expect 37; historical fixtures are unchanged. The added core-v35 fixture is the original revision 36 core.

New balls use scoring version 37. Existing prepared balls keep their original scoring versions; older career fields remain optional. Schema 5, swipe grammar, delivery clock and dependencies are unchanged. Audio, haptic feedback, camera and tutorial do not advance match RNG.

## Browser and device limits

Managed browser preview was checked at 390×844 and 360×640. The first intro card measured 366×535.97 and 336×518.16 respectively, with matching client/scroll dimensions. The last card at 360×640 measured 336×540.56 and fit without scrolling. Settings showed no horizontal overflow. The live left-handed bowling gallery showed Leg stump on the left and Off stump on the right; the facade also checks an actual handedness swap without changing ball count or plan. intro-phone.jpg is the 360×640 browser view.

The browser accepted the direct vibration test and the sound-preview control ran. This does not prove vibration on a physical Pixel, audio naturalness, touch latency or Android frame rate. Opening the standalone game in Chrome avoids a cross-origin embedded preview's vibration restriction. The phone's vibration settings may still suppress a valid request.

Freesound has relevant CC0 bat and crowd recordings. Direct download returned HTTP 403 here, so none was embedded. audio-sources.md records exact sources and the next sample-replacement step. No account, purchase, sound licence agreement or runtime asset dependency was introduced.
