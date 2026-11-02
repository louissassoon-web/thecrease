# Revision 35 verification

Implemented the requested running, return-end, toss and backup fixes, plus the approved UX review pass. New balls use scoring version 35. Prepared R34 and earlier deliveries retain their rules; schema 5 is unchanged.

| Check | Result |
| --- | --- |
| Unedited `node check-balance.cjs` | 48 / 48 |
| `node review-check.cjs` | 107 groups |
| `node check-offline.cjs` | 12 / 12 |
| Build reconstruction | Exact RELEASE.json HTML hash |
| Prepared R34 compatibility | Byte-identical results and return choices across T20/Test, manual/AI and ground/loft/leave |
| Bowler pickup coverage | 12 seeded collections checked with a distinct receiver and backup |

Full test output is in balance-after.txt, review-after.txt and offline.txt. The balance harness was not changed. No balance targets are disputed or retuned in this revision. The first return planner required the receiver's body at the target and delayed even direct hits, causing two marginal AI failures; the final planner correctly includes catching reach and preserves immediate direct hits. Non-direct throws now wait with the collector when necessary. Direct hits without a receiver fall to the ground while coverage arrives.

The new facade groups exercise actual button and pointer handlers: run greys out at three, cancellation of a queued third, 4× stops at the exact pickup, both end choices resume at 1× and permit 4×, no RNG or runner changes during the choice, and save/reload at that point. Boundary allowance tests still pass. Test fixtures for the former fourth-run behaviour, hidden Continue button, automatic return and right-side guide were updated to the requested behaviour; historical engine fixtures are retained.

Browser QA used the managed preview and real Chromium UI in fixed-size frames at 390×844, 360×640 and 844×390. Bowling controls fit without document overflow; the guide is left of the pitch rather than over the batter. At 390×844 the batting field measured about 490 px with the pad and 626 px expanded (previous review: 448 and 510 px); the expanded dock measured 128 px instead of 244 px. The settled coin displayed one H face with the correct final transform. Screenshot: bowling-phone-20261102.jpg. Menu grouping, read-only scorecards and profile editing were checked through the real handlers. The browser frame checks do not measure real phone performance, audio or touch latency.

The temporary QA wrapper is excluded from the published build. Optional onboarding and the alternate Three.js renderer are outside this pass.
