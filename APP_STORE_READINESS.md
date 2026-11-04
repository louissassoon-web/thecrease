# App store readiness - revision 33

15 October 2026. Browser-first build, prepared for a later native wrapper (Capacitor or similar) for Google Play and the App Store. The playable game is `dist/index.html`; `dist/sw.js`, `dist/manifest.webmanifest` and the icons are optional progressive-web-app files for the hosted version. The single HTML file still opens on its own. Monetisation is unchanged: no payments, adverts or tracking.

## What changed in the game

**Phone safe areas, cut-outs, touch targets, full-screen play**
- Insets now apply on all four sides through `--safe-top/right/bottom/left` (defaults from `env(safe-area-inset-*)`). A shell can set these variables when a WebView reports zero insets. Dialogs stay inside the safe box.
- Every remaining control is at least 44 px: dialog close buttons, the scorecard batting-hand selector, bowling selects and action buttons, the font-licence disclosure. The bowling dock grows 10 px (6 px in full view) to fit; landscape heights are unchanged.
- Full-screen batting in a native shell no longer calls the browser Fullscreen API (unavailable on iPhone); it asks the shell (`fullscreen(full)`, default: Capacitor StatusBar hide/show) and keeps the expanded layout.

**App switching, interruptions, audio, save/resume**
- Leaving the foreground still pauses, saves and opens the menu. Added: a save and audio suspend on page `freeze`; audio resume now also recovers from the iOS `interrupted` state on the player's next tap; returning to the app checks for an update.
- Shell events: dispatch `cricket:pause` on window to pause; `cricket:back` for the hardware back button (closes the open dialog or pauses; required decisions stay open; `event.detail.handled` tells the shell whether to leave the app instead).
- All UI storage goes through `Platform.storage` (localStorage stays the synchronous hot copy; a shell mirrors writes to native storage or answers reads). A hook `get` that returns `undefined` or `null` falls through to the hot copy; `set` mirrors even when the hot copy is full, then rethrows so the game can report it. Sound and volume now use the same storage wrapper and are mirrored too. `navigator.storage.persist()` is requested on the first tap. Save export and recovery export go through `Platform.saveFile`, because Blob downloads do not work inside a WebView.

**Offline play, loading speed, battery, mid-range devices**
- Hosted version: a service worker caches the game and serves it instantly; on launch and on return to the foreground the page asks the worker to compare the cached `index.html` with the network copy, and "Update ready · Reload the game" appears in the pause menu when it has changed. Nothing reloads during play. Registration happens only on a top-level http(s) page, so also on `localhost` during development, and never from `file:`, inside a frame or in native builds. A web app manifest plus icons allow home-screen install; Android and desktop Chromium show an "Install this game" button when the browser offers it. The old "prototype needs a connection" notice is replaced by a live status line.
- Drawing drops to a quarter rate while a menu is open.
- New Settings › Graphics: Auto (default), Sharp, Battery saver. Auto steps the canvas resolution from 2× to 1.5× to 1× once if more than 40 % of 90 live frames spend over 13 ms drawing. Cached fielder sprites follow the render scale. Timing input is unaffected; it is measured on pointer events, not frames.

**Accessibility, reduced motion, haptics**
- New Settings › Haptic feedback (on by default where the device supports it): light pulse at the player's own bat contact and bowling release, patterned pulses at boundaries and wickets. Uses `navigator.vibrate`, the Capacitor Haptics plugin or a shell hook; disabled with an explanation where none exists (iOS Safari). Reduced motion is unchanged. New controls are labelled.

**Platform services separated from the engine**
- `Platform` (top of `cricket-ui`) owns storage, haptics, full screen, offline install, file export, lifecycle events and reserved `purchases` / `ads` slots. `cricket-core` is untouched. Scoring, RNG, save schema 5 and all prepared-ball rules are unchanged.

## Native shell contract

Define before the game script runs (inject a `<script>` ahead of `cricket-ui` when packaging), all fields optional:

```js
window.CricketPlatform = {
  native: true, name: 'capacitor-ios',
  storage: { get(key), set(key, value), remove(key) },   // mirror; localStorage remains the hot copy; get returns undefined or null for a miss
  haptics: { pulse(kind) },                              // light | medium | heavy | boundary | wicket | test
  fullscreen(full),                                      // hide/show status bar
  saveFile(name, text, type),                            // return false to fall back to a Blob download
  purchases: null, ads: null                             // later phase
};
// Events the shell dispatches on window:
window.dispatchEvent(new CustomEvent('cricket:pause'));
const back = new CustomEvent('cricket:back', { detail: { handled: false } });
window.dispatchEvent(back); if (!back.detail.handled) App.exitApp();
// Insets when the WebView cannot report them:
document.documentElement.style.setProperty('--safe-top', '24px');
```

Hydration for native storage: read the saved keys (`cricket.career.v5`, `cricket.career.v5.recoveryKey`, backups `cricket.career.v5.backup.*`, `cricket.before-import`, `cricket.view`, `cricket.motion`, `cricket.sound`, `cricket.volume`, `cricket.haptics`, `cricket.graphics`, and the legacy `cricket.the-crease.v2` or `cricket.three-over.v1` when present) from native storage into `localStorage` before the game script runs, then mirror every `set`. Keys and formats are unchanged, so an exported JSON save moves between the web and native builds.

## Choices that would complicate the transition

- **Save storage.** WebView `localStorage` can be evicted under storage pressure. The mirror hook exists; the shell must use it (Preferences or Filesystem) before release. Saves reach about 1 MB for a long Test career; Preferences handles that, but test it.
- **Audio.** Web Audio needs a user gesture and, on iOS, follows the ring/silent switch unless the shell sets the `AVAudioSession` category. Decide `.ambient` (respect silent switch, mixes with music) versus `.playback` before submission.
- **Edge swipes.** Batting and bowling swipes near the screen edges can collide with iOS back-swipe and system gestures. Keep `allowsBackForwardNavigationGestures` off; the safe-area padding already keeps the pad away from the bottom edge.
- **Modern CSS.** The layout uses `:has()`, `dvh` and `env()`. This needs iOS 15.4+ (WKWebView) and Android System WebView 105+. Set the Android `minSdk` accordingly and show an "update Android System WebView" notice if `:has()` is unsupported.
- **Real players and teams.** Names and ratings of real players are a store-review risk (Apple 5.2.1 intellectual property; Google impersonation). Resolve rights or switch to original identities before release, as already noted in `MONETISATION_NOTES.md`.
- **Testing surface.** The "Share for testing" panel and the public game link are hidden in native builds; store listings must not describe the app as a prototype or test.
- **Icons.** `dist/icon-*.png` are generated placeholders. Store icons, splash screens and screenshots need final artwork.
- **Fonts.** The embedded fonts are SIL OFL; keep the licence text in Settings. Nothing else is third-party.

## What must change before store release (requirements checked 15 October 2026)

Apple
- Builds must use Xcode 26 and the iOS 26 SDK: since 28 April 2026 App Store Connect only accepts uploads built that way ([Apple, Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/)).
- Answer the new age-rating questionnaire (in force since 31 January 2026, same page).
- Privacy manifest: if the shell stores saves with `@capacitor/preferences`, declare `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` in `PrivacyInfo.xcprivacy`; missing declarations are rejected at upload ([Capacitor Preferences README](https://github.com/ionic-team/capacitor-plugins/blob/main/preferences/README.md)).
- App Privacy labels (currently "data not collected"), a privacy policy URL and a support URL. Bundle the HTML locally (Guideline 2.5.2, no downloaded executable code; 4.7 does not apply to a bundled game). Native haptics, offline play and device storage help with 4.2 minimum functionality.
- Later phases: coin packs through In-App Purchase (3.1.1); any ad SDK triggers App Tracking Transparency.

Google Play
- New apps and updates must target Android 16 (API 36) since 31 August 2026; extensions run to 1 November 2026 ([Play Console help](https://support.google.com/googleplay/android-developer/answer/11926878)). Behaviour changes to check: edge-to-edge is enforced, `onBackPressed` is no longer called (use the predictive-back APIs; the game's `cricket:back` event is the hook), orientation locks are ignored on screens of 600 dp and wider, so the existing landscape layout matters ([Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16)).
- Safe areas: on Android 15+ with edge-to-edge the WebView may report zero `env()` insets on older Chromium. Capacitor's `android.adjustMarginsForEdgeToEdge: 'auto'` or the `@capacitor-community/safe-area` plugin fixes this; otherwise set the `--safe-*` variables from the shell.
- A personal developer account created after 13 November 2023 needs a closed test with at least 12 testers opted in continuously for 14 days before production access ([Play Console help](https://support.google.com/googleplay/android-developer/answer/14151465)). Start it early; the current tester group fits this.
- Data safety form, content rating questionnaire, privacy policy URL, Android App Bundle, 16 KB page-size compatible native libraries (keep Capacitor and plugins current).
- Later phases: Play Billing for coin packs; rewarded ads through a certified SDK with the required consent flow.

Both
- Remove testing language, hide or remove the share panel (done for native builds), finish store listings and real icons, set app IDs and versioning, and keep `VERSION` in `dist/sw.js` in step with releases of the hosted build.

## Verification

- Done here: the edited UI script and worker parse; the game loads without console errors; settings, pause menu, scorecard and bowling layouts were inspected; the pause-on-hidden path triggered correctly in a background preview.
- Not done here: `node check-balance.cjs` and `node review-check.cjs` could not be run in this environment. Run both before accepting the revision. (Done at handover into the repository on 30 October 2026: 90/90 review groups, 48/48 balance checks, outputs identical to revision 32; see `validation-v33/REPORT.md`.) The engine is untouched, so the balance contract should be byte-identical; UI checks exercise the real handlers through the DOM facade, which this revision was written against (no new globals, element ids present in markup, guarded platform calls).
- Still required: physical Android and iPhone testing of swipe feel, safe areas, haptics, background/return, audio after a call, the Auto graphics step-down on a mid-range phone, and home-screen install.

R37 device notes: web vibration returns the browser’s acceptance flag and handles asynchronous native-plugin rejection. The Settings test sends a longer pulse from a direct tap. Browser acceptance does not prove motor activity; Pixel/Chrome hardware testing remains outstanding. A browser embedding the game can block vibration; the Settings link opens the canonical game URL. Native wrappers should map the `test` pulse too. The new `tutorialSeen` career property is optional under schema 5; absence in an older career does not trigger onboarding. New careers show a three-part, skippable demo, replayable from How to play. Sound volume is local and mirrored via Platform.storage. The quieter R37 palette is still generated audio, not recorded library material. No external audio fetch, SDK, dependency or third-party audio licence is added.
