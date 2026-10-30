# Revision 28 presentation review

All 48 balance checks pass. The complete balance output in `balance.txt` is byte-identical to revision 27 `validation-v27/after.txt`; the supplied acceptance harness is unchanged. All 62 review groups pass; full output in `review.txt`.

The eight new groups exercise real UI handlers for fullscreen return, retained corrected timing and contextual text, bowler/umpire clearance, named-player appearance, fitted low-angle replay cameras, paused Test declarations, once-only reward animation and champion/reduced-motion presentation.

Canvas frames were rendered with the existing host's native-canvas hook. `replay-frame.png` shows the lower camera through a behind-square pickup. `trophy-presentation.png`, `trophy-handover.png` and `trophy-lift.png` show the presenter approaching, handing over and the team lifting the cup. Those images show the canvas scene only, not HTML overlays. The result card, bank count and controls are covered by the DOM facade. Chromium was not available, so Chrome CSS and phone frame rate remain for the next play-test. No Android screenshot or smoothness measurement is claimed.

Appearance covers all named profiles and stays attached to immutable identities rather than name length, nationality or field slot. Colours are approximate game art. Result and trophy effects use presentation time and independent visual variation; they do not consume match randomness. Fireworks are small, slow spark fans without screen flashes. Reduced motion removes them, confetti, moving coins and player motion.

The full-screen-exit fixture was updated because a browser exit must retain the chosen batting layout. Standard table methods were added to the test DOM facade to exercise the actual league screen. No balance fixture or target was changed. Paid currency, advertising and native packaging remain proposals in MONETISATION_NOTES.md.
