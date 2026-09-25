# PWA Standalone Fullscreen Fix — Change Report

## Problem
PWA standalone mode in the Renamer reader app had three issues:
1. Empty space at bottom of screen in fullscreen (height miscalculation on iOS)
2. No auto-fullscreen trigger when running as PWA installed app
3. Fullscreen button not hidden in PWA mode

## Files Modified

### `js/tabs/pdf/generic-viewer.js`

**CSS (height calculation):**
- `.reader-true-fullscreen`, `body.reader-ios-fullscreen`, `.reader-container-inner` heights changed from `100dvh` to `calc(var(--renamer-app-height, 100vh) + env(safe-area-inset-top, 0px))` — accounts for iOS safe-area insets

**IIFE (initialization):**
- `--renamer-app-height` set via `window.innerHeight` (was `screen.height`) — `screen.height` reports 852 on iPhone but actual PWA viewport is 793; `innerHeight` is correct
- Added PWA-only body/html height setting (gated on `isPWAStandalone()`)
- Added `theme-color` meta tag handling (`#000` for PWA)

**`getFullscreenHeight()`:**
- New function: returns `window.innerHeight + 30` for PWA (the +30 is a manual offset for iPadOS), `window.innerHeight` for non-PWA, fallback `screen.height`/`100vh`

**`enterPseudoFullscreen()` / `enterEpubPseudoFullscreen()`:**
- Removed inline `container.style.height` and `document.body.style.height` (now handled by CSS class)
- Button hidden via JS **only when `isPWAStandalone()`** (not on manual button click in non-PWA)
- Sets `--renamer-app-height` variable for PWA

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
- New resize/orientation listener: updates `--renamer-app-height` on viewport changes

### `js/app.js`
- Same CSS height fix: `body.reader-ios-fullscreen` height from `100dvh` → `calc(var(--renamer-app-height, 100vh) + env(safe-area-inset-top, 0px))`
- `.reader-container-inner` given explicit height under `reader-ios-fullscreen`
- Removed button-hide CSS rule (was causing button to disappear on non-PWA)

## Key Design Decisions
- Button hide is via JS (`display: none` on `fullscreenBtn` element) not CSS class — prevents button disappearing on non-PWA when user manually clicks fullscreen
- Height uses CSS custom property `--renamer-app-height` set from `window.innerHeight` + 30px offset for PWA — `innerHeight` correct for iOS PWA viewport, 30px compensates for iPadOS browser chrome
- `env(safe-area-inset-top)` added to CSS calculations — fills screen in notch/dynamic-island devices

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
