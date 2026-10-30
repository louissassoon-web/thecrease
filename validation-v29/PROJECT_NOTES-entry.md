## Revision 29 - batting response, contact and between-match shop

Small joints use geometry appropriate to their screen size, unit sphere/circle geometry is reused, and stationary fielders are cached while the batting camera is still. Moving fielders and ball-adjacent catches retain live drawing and depth ordering. In the local native-canvas sample, median draw time fell from 75.6 ms to 21.9 ms. This measures the host renderer through the existing DOM facade, not Android frame rate or browser layout.

Newly prepared deliveries use presentation marker 29 while retaining scoring version 27. Successful strokes use the visible incoming ball as their contact target, including sweeps and late drives, with coordinated foot placement, hand reach and bat angle. Late footwork returns during the follow-through before running starts. The artificial 35-140 ms settling wait is removed; unused frame time carries into the outgoing ball instead of being dropped at impact. Misses still pass the bat. Older prepared visual clocks remain available, and optional presentation metadata preserves save/resume without changing schema 5.

A swipe released during the run-up now remains an aiming action, eliminating the reproduced 1,907 ms early result before the ball had left the bowler. Held gestures still work across release. Each gesture is bound to its prepared ball, and an older animation callback cannot rewind the UI clock. Real early releases during flight retain their measured error; timing offsets and swipe grammar are unchanged.

The pad camera now uses the same elevated shoulder view as full screen and mirrors for left- and right-handed batting. The completed-match league screen has a visible stadium/kit shop button with the wallet balance. Purchases return to the fixtures; the shop remains blocked during deliveries, over breaks and innings intervals. Existing coins, ownership and reward guards are unchanged.

The user-supplied balance harness is unedited and its 48/48 output is byte-identical to R28. Six new regression groups cover the reported failures. Two existing UI fixtures now accept immediate contact feedback and zero added settling time; they previously encoded that delay. Scoring, seeded randomness, prepared older outcomes, the 2600 ms incoming clock, dependencies and monetisation are unchanged. See validation-v29/ for measurements and checks.

