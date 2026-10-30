# Monetisation and app-store route

Recommendation for Louis, 3 October 2026. Discussion only. No payments, adverts, tracking SDKs, subscriptions or native wrapper have been added.

## Keep the engine

A complete rewrite is unnecessary. Capacitor can package an existing JavaScript game for Android and iOS and bridge to native APIs. Keep the deterministic match engine and canvas game; add native integrations around them. The current browser build remains one self-contained HTML file with no dependencies. Native projects will have their own SDK dependencies when that work is authorised.

This is a technical assessment, not a promise of store approval or device performance. Test lifecycle handling, audio, frame rate, saves and touch latency on real Android and iOS devices before release. If future graphics demand full 3D, a renderer change can be considered separately from the rules engine.

## Proposed business model

- Free cricket with coins earned by winning.
- Optional rewarded adverts between matches for a small cosmetic reward. Never interrupt a delivery or disguise adverts as cricket controls.
- Cosmetic coin packs for kits and grounds. Keep timing windows and batting ability separate from purchased currency to protect the skill game.
- An optional ad-free purchase if compulsory ads are ever introduced. With rewarded-only ads there is little need for an ad-removal purchase at launch.
- If “advertising space” means selling boundary-board sponsorship to businesses, treat it as a separate sponsorship product with agreed creative and campaign dates. It is different from the player coin shop. If it means watching adverts for coins, that is the rewarded-ad option above.

## What must change before real money

The editable localStorage wallet and importable JSON save are appropriate for testing, not a secure purchased-currency ledger. Use a server ledger with verified purchase/reward receipts, unique transaction IDs, replay protection and recovery across devices. Define how existing earned coins migrate. Keep offline batting playable and reconcile purchases when connected; do not trust a client callback alone as proof of payment.

Use Apple In-App Purchase and Google Play Billing as the default for coin packs and in-game digital goods. Both have regional exceptions/programmes; check the chosen launch territories at implementation time. Adding a generic card checkout inside this browser build would not establish a compliant store payment flow.

Before commercial release, resolve the rights for real-player identities/likenesses and any team branding, and use original or licensed commentary. Current text is original and the sounds/graphics are procedural. Do not turn an archive of broadcast transcripts into a shipping quote bank without a licence.

## Suggested order

1. Continue gameplay and device testing with this public browser build.
2. Package an Android test build using Capacitor, with reliable bundled offline assets and save migration. Validate performance and return-from-background behaviour on the phone.
3. Add identity/recovery and a protected wallet, then test store billing in its sandbox.
4. Trial opt-in rewarded ads and cosmetic packs, measuring retention and player complaints before expanding placements.
5. Prepare the iOS package, purchase integration, privacy information and store submission.

## Primary sources checked

- [Capacitor documentation](https://capacitorjs.com/docs): adding the native runtime to an existing JavaScript project and using native device APIs.
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): sections 3.1.1 (digital currency purchases), 3.1.1(a) (regional purchase links) and 5.2 (intellectual property).
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738): virtual goods/currencies, billing requirements and alternative-billing programmes.
- [Google AdMob rewarded ads](https://developers.google.com/admob/android/rewarded): native rewarded-ad integration and earned-reward callbacks.
