# PWA Standalone Fullscreen Fix — Change Report

## Problem
PWA standalone mode in the Renamer reader app had the following issues:
1. ~20/30px gap on screen (content not filling full height) on iOS landscape
2. No auto-fullscreen trigger when running as PWA installed app
3. Fullscreen button not hidden in PWA mode

## Root Cause (per SO thread: "iOS PWA 20px gap on landscape")
With `viewport-fit=cover` the viewport extends under the iOS status bar / home
indicator, so `window.innerHeight` (and `100dvh`) already cover the full screen.
The old height formula `calc(var(--renamer-app-height, 100vh) + env(safe-area-inset-top, 0px))`
**double-counted** the safe area by adding it to the height, and the `+30` PWA
offset over-shot the viewport. Because the page image is vertically centered
(`align-items:center`) inside an over-tall container, the surplus was split above
and below the image — visible as the gap. `env(safe-area-inset-top)` returns `0` on
non-notch iPhones (iPhone 8/SE) so it never compensated the 20px status-bar gap
there anyway.

## Files Modified

### `js/tabs/pdf/generic-viewer.js`

**CSS (height calculation):**
- `.reader-true-fullscreen`, `body.reader-ios-fullscreen` (`.reader-ios-fullscreen` in `js/app.js`), `.reader-container-inner` heights: `calc(var(--renamer-app-height, 100vh) + env(safe-area-inset-top, 0px))` → `calc(var(--renamer-app-height, 100vh))` then `height: 100dvh` (modern, native on rotation). The `+ env(safe-area-inset-top)` was removed from the height (moved to nav padding).

**IIFE (initialization) in `js/tabs/pdf/generic-viewer.js`:**
- `--renamer-app-height` set via `window.innerHeight` only (was `screen.height`, and the +30 PWA offset removed) — `innerHeight` is correct for the PWA viewport
- `body`/`html` height set to `100dvh` (was `calc(100vh + 30px)` — the `100vh` unit is buggy on iOS and the +30 over-shot)
- `viewport-fit=cover` force-applied to **all** `<meta name="viewport">` tags (was first-match only)
- `theme-color` meta tag handling (`#000` for PWA)

**`getFullscreenHeight()`:**
- Returns `window.innerHeight + 'px'` (was `window.innerHeight + 30` for PWA). No offset — `innerHeight` already equals the full screen under `viewport-fit=cover`.

**`enterPseudoFullscreen()` / `enterEpubPseudoFullscreen()`:**
- Container height driven by the `.reader-true-fullscreen` CSS class (`100dvh`) — no inline height needed.
- Button hidden via JS **only when `isPWAStandalone()`**.

**`exitPseudoFullscreen()` / `exitEpubPseudoFullscreen()`:**
- Resets button `display` property via `removeProperty('display')`

**`buildReaderUI()`:**
- Calls `enterPseudoFullscreen()` when `isPWAStandalone()` — auto-triggers fullscreen on PWA launch

**`renderEpubUI()`:**
- Calls `enterEpubPseudoFullscreen()` when `isPWAStandalone()` — same for EPUB reader

**`updateZoomOverflow()`:**
- Reverted to original (no body class manipulation) — prevents library view regression

**`destroy()` (non-EPUB + EPUB):**
- Reverted to original class cleanup (no `reader-navs-viewport` body class manipulation)

**`autoFullscreenIfPWA()`:**
- Utility function preserved, sets `--renamer-app-height`, hides button in PWA mode

   **`updateAppHeightForResize()`:**
   - Updates `--renamer-app-height` on viewport changes; on iOS re-reads after a
     300ms debounce to work around the stale-`innerHeight`-after-rotation bug.

### `js/app.js`
- Same CSS height fix: `body.reader-ios-fullscreen` height now `calc(var(--renamer-app-height, 100vh))` → `100dvh` (!removed `+ env(safe-area-inset-top)` from height).
- `.reader-container-inner` height given `100dvh` under `reader-ios-fullscreen`.
- Added `env(safe-area-inset-*)` **padding** on `.reader-header-nav` / `.reader-nav-bar` (SO-thread approach — insets as padding, not height).

## Key Design Decisions
- Height = `100dvh` (dynamic viewport height, the modern iOS fix for the `vh` bug)
  with `calc(var(--renamer-app-height, 100vh))` as a legacy fallback. `dvh` is
  declared *after* the fallback so it wins on supporting browsers.
- `--renamer-app-height` is set from `window.innerHeight` (px) — the reliable
  visual-viewport height in PWA standalone — with NO `+30` magic offset. The old
  `+30` over-shot the viewport and, combined with centering, produced the gap.
- `env(safe-area-inset-*)` is used as **padding on the nav elements** (header/nav-bar),
  NOT added to the height. This is the SO-thread approach: with `viewport-fit=cover`
  the page image fills the whole screen (status bar is black-on-black), while the
  nav controls are inset away from the notch / home indicator.
- `viewport-fit=cover` is force-applied to every `<meta name="viewport">` tag at
  script load (handles duplicate tags where the browser picks the first one).
- iOS rotation timing: `updateAppHeightForResize` re-reads `window.innerHeight`
  after a 300ms debounce on iOS where the `resize`/`orientationchange` event fires
  before the property has settled (stale-value bug). On browsers with `dvh` this is
  a fallback-only concern since `dvh` updates natively.
- Button hide is via JS (`display: none` on `fullscreenBtn` element) not CSS class —
  prevents button disappearing on non-PWA when user manually clicks fullscreen.

## iOS iPad Zoom Nav Sticky Fix

### Problem
On iPad (PWA standalone or Chrome iOS), pinch-zoom causes the reader navigation bars (`position: fixed`) to stay at their document position instead of following the viewport. The navs become invisible as the user pans during zoom.

### Fix (`js/tabs/pdf/generic-viewer.js`)

**CSS:**
- Added `reader-ios` class to `<body>` on iOS devices (at script load via `isIOSDevice()`)
- Reinforced `position: fixed !important` on `.reader-header-nav` and `.reader-nav-bar` within `body.reader-ios-fullscreen` — ensures navs stay in fixed positioning context on iOS

**JavaScript (`setupIOSNavSync` function):**
- Runs only on iOS devices (`isIOSDevice()`)
- Uses `visualViewport` API to detect zoom pan — `visualViewport.offsetTop` and `visualViewport.height` give the visible viewport position/size during zoom
- Uses `getBoundingClientRect()` + `getComputedStyle()` to auto-detect drift — works whether `position: fixed` is tracking the layout viewport or visual viewport
- **Continuous sync via `setInterval` (50ms)** — iOS throttles `requestAnimationFrame` during scroll/zoom, but `setInterval` fires reliably
- Event listeners: `visualViewport.resize`, `visualViewport.scroll`, `window.scroll`, `window.resize`, `orientationchange`, plus `touchmove`/`touchend`/`touchstart` on the container
- Only adjusts when drift > 1px (threshold avoids unnecessary style changes)
- Clears inline styles when no drift (reverts to CSS defaults with safe-area insets)
- Only runs in fullscreen mode (`body.reader-ios-fullscreen` check)
- Pauses when navs are hidden (`reader-navs-hidden` class)
- Sync called after `enterPseudoFullscreen()`/`enterEpubPseudoFullscreen()` via `setTimeout(50ms)`
- Full cleanup in destroy functions (removes all listeners, clears interval, resets styles)
