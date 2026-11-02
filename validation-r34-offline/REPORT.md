# R34.1 offline reload repair

2 November 2026. This hotfix changes the offline service worker, not the cricket build.

## Evidence

The Site remained public and active; its production error-log query returned no errors. A fresh browser visit rendered Format & team. Reload then became inaccessible to the browser tool, which refused the resulting non-HTTP(S) page. Direct command-line requests received Cloudflare error 1010 and were stopped; these do not establish that ordinary players were refused.

The old worker cached a followed redirect from `index.html` and returned the response unchanged. The Fetch standard rejects a response with multiple URL-list entries when the intercepted request's redirect mode is not follow. Browser navigations use manual redirects. Cloudflare static asset HTML handling canonicalises index paths to their directory URLs. The exact live redirect chain could not be inspected, so this is a reproduced code defect consistent with the initial-open/reload symptoms, not a captured Chrome network trace.

References: https://fetch.spec.whatwg.org/#http-fetch and https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/ .

## Repair

- Fetch the canonical directory URL and remove redirect history from cached/navigation responses.
- Validate game HTML before replacing the offline copy, preserving it through failed updates or gateway/sign-in responses.
- Let online play continue if CacheStorage fails; let a repaired worker install even when an optional icon fails.
- Return a readable reconnect page if the game cannot be loaded. Do not clear saved games or browser data.
- Bump only the offline cache to r34.1; retain public access and the existing URL.

## Checks

- `node check-offline.cjs` against the old worker: 3 passed, 9 failed of 12. Full output: `before.txt`.
- Same unmodified tests against the repaired worker: 12 passed, 0 failed. Full output: `after.txt`.
- `node review-check.cjs`: all 100 portable review groups passed. Full output: `review.txt`.
- `node tools/build.mjs --check`: exact existing R34 game hash reproduced.
- HTML SHA256: `504af4624ef461719cb13324b647e95274baf2eaac9f20cb95a7c74bc46c77f7`.
- No balance constants, source engine, gameplay UI or acceptance harness changed. The existing 48/48 balance run remains valid for the identical HTML.

## Limits and player recovery

The offline tests use real Request/Response objects with a fake network and CacheStorage that preserve redirect metadata. They test the worker's install, activate, message and fetch handlers, not a full Chromium navigation. Browser automation refused access after the failed reload; no post-fix browser or physical Android verification is claimed. Native deployment status is recorded separately by Sites.

Reopen the normal game URL while online. Chrome checks for a changed worker during navigation. If the old error page appears once more while the worker updates, close that tab and reopen it. Do not clear site data: it contains the career save.
