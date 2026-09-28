# PWA Standalone Fullscreen Fix — Change Report

## Problem
PWA standalone mode in the Renamer reader app had a ~20/30px gap — content didn't
fill the full screen height on iOS (landscape rotation, installed-from-home-screen).

## Root Cause
Commit `806cf0c` ("tests to fix regression on PWA height — not finished") rewrote the
inline body height from the **JS runtime value** `h` to the **CSS unit**
`calc(100vh + 30px)`:

```js
// main / 2321a35 (WORKS)
document.body.style.height = h;            // h = window.innerHeight + 30

// 806cf0c (BROKEN)
document.body.style.height = 'calc(100vh + 30px)';
```

On iOS, the `vh` unit is **not** the live viewport height — it is frozen at the value
from when the page first rendered and does **not** update on orientation change. In PWA
standalone the page loads in the orientation reported by the OS; after the user rotates
to landscape, `100vh` keeps its *old* (portrait) value, leaving a visible gap. The same
mistake was introduced in `library.js` via `body.renamer-pwa .lib-page-app.fullscreen
{ height: calc(100vh + 30px) !important }`.

`window.innerHeight` (the JS property) *does* track rotation correctly, which is why
`main` — which sets the inline height from `h` (= `window.innerHeight + 30`) — has
perfect height.

## Fix (aligned with main / 2321a35)

### `js/tabs/pdf/generic-viewer.js`
**IIFE (initialization):**
- Restored `var PWA_HEIGHT_OFFSET = 30` and `var h = (window.innerHeight + (isPwa ? PWA_HEIGHT_OFFSET : 0)) + 'px'`.
- `document.body.style.height = h` and `document.documentElement.style.height = h`
  (uses the JS runtime value; **no** `calc(100vh + 30px)`).
- `viewport-fit=cover` force-applied to **all** `<meta name="viewport">` tags (handles
  the duplicate-tag case where the browser may pick Nextcloud's meta first).
- Keeps the `renamer-pwa` body class (parallel feature, non-breaking).

**`getFullscreenHeight()`:** returns `window.innerHeight + 30` for PWA (main's model).

**CSS heights:** `calc(var(--renamer-app-height, 100vh) + env(safe-area-inset-top, 0px))`
 — `main`'s formula, unchanged. `env()` is used as **padding on nav elements**
(`.reader-header-nav` / `.reader-nav-bar`), not added to the page-image height.

**`updateAppHeightForResize()`:** keeps the `--renamer-app-height` custom-property
sync; on iOS a 300ms debounce re-reads `window.innerHeight` after the
`resize`/`orientationchange` event fires (defends against the momentarily-stale
value on browsers without `dvh` support).

### `js/app.js`
- `body.reader-ios-fullscreen` / `.reader-container-inner` heights use
  `calc(var(--renamer-app-height, 100vh) + env(safe-area-inset-top, 0px))` (same as
  `generic-viewer.js` SK styles, matching `main`).

### `js/library.js`
- `body.renamer-pwa .lib-page-app.fullscreen` and `body.renamer-pwa #content.app-renamer.fullscreen`
  now use `calc(var(--renamer-app-height, 100vh))` + `height: 100dvh` instead of the
  buggy `calc(100vh + 30px)` (which used the frozen `vh` unit).

## Why this works
- `window.innerHeight` (JS) tracks viewport rotation on iOS ✓
- `100vh` (CSS) does NOT ✓ → replaced by JS-driven values everywhere it was used inline
- `100dvh` added as the modern dynamic unit for the library PWA overrides (Safari 16.4+)
  with the JS custom-property fallback for older browsers.
