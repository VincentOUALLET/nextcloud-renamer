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
