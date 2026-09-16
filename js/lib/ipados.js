(function() {
    'use strict';

    var CSS_FS_CLASS = 'renamer-css-fullscreen';
    var BODY_FS_CLASS = 'renamer-ipados-fullscreen';
    var STYLE_ID = 'renamer-ipados-styles';

    function isIOS() {
        try {
            /* A "needs CSS fullscreen" signal. iOS Safari on iPadOS supports the
               Fullscreen API, but Chrome / Firefox / Edge on iOS/iPadOS do NOT
               (they run on Apple's WKWebView which keeps the Fullscreen API off, so
               requestFullscreen() no-ops and document.fullscreenEnabled is false).
               Route every iOS browser through the CSS fallback so the fullscreen
               button actually triggers on iPad/iPhone regardless of the engine. */
            if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
                return true;
            }
            /* iPadOS 13+ (e.g. iPad Pro) may report a Mac-like user agent
               (platform "MacIntel", no "iPad" token) when "Request Desktop Site"
               is on. Separate those real iPads from desktop Macs via touch points,
               or via the standalone PWA signal for touch-point-0 Pro devices. */
            if (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && /Mac/.test(navigator.userAgent)) {
                if (navigator.maxTouchPoints > 1) {
                    return true;
                }
                /* iPad Pro in PWA standalone (macIntel UA): maxTouchPoints can report 0,
                    but a standalone PWA launched from iOS/iPadOS is still iOS. */
                if (isPWAInstalled()) {
                    return true;
                }
                /* Chrome on iPadOS "Request Desktop Site" mode reports MacIntel UA
                    and maxTouchPoints <= 1 (often 1). Detect the coarse primary
                    pointer to separate real iPads from desktop Macs. */
                if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    function isIPadOS() {
        try {
            if (/iPad/.test(navigator.userAgent)) {
                return true;
            }
            if (navigator.platform === 'MacIntel' && /Mac/.test(navigator.userAgent)) {
                if (navigator.maxTouchPoints > 1) {
                    return true;
                }
                /* iPad Pro in PWA standalone: maxTouchPoints reports 0, but the
                    standalone PWA launched from iOS/iPadOS is still iPadOS. */
                if (isPWAInstalled()) {
                    return true;
                }
                if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    function isPWAInstalled() {
        if (typeof navigator !== 'undefined' && navigator.standalone === true) {
            return true;
        }
        try {
            if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
                return true;
            }
        } catch (e) {
        }
        return false;
    }

    /* True for touch-primary, hover-none surfaces (phones/tablets). On these there
       is no mouse cursor to fade out, and sliding the reader nav bar off-screen
       via .reader-cursor-hidden just makes the controls untouchable. Keeping the
       nav always reachable on touch fixes the "nav bar dead after fullscreen"
       regression reported on iPadOS Safari (PWA) and Chrome. */
    function isTouchDevice() {
        try {
            if (typeof window === 'undefined' || !window.matchMedia) return false;
            return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        } catch (e) {
            return false;
        }
    }

    function lockOrientationLandscape() {
        try {
            if (screen && screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape-primary').catch(function() {});
            }
        } catch (e) {
        }
    }

    function unlockOrientation() {
        try {
            if (screen && screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) {
        }
    }

    function enterCSSFullscreen(el) {
        if (!el || el.nodeType !== 1) return;
        ensureViewportMeta();
        el.classList.add(CSS_FS_CLASS);
        document.body.classList.add(BODY_FS_CLASS);
        lockOrientationLandscape();
    }

    function exitCSSFullscreen(el) {
        if (el && el.nodeType === 1 && el.classList) {
            el.classList.remove(CSS_FS_CLASS);
        }
        document.body.classList.remove(BODY_FS_CLASS);
        unlockOrientation();
    }

    function isCSSFullscreen(el) {
        return !!(el && el.nodeType === 1 && el.classList && el.classList.contains(CSS_FS_CLASS));
    }

    function setFullscreenButton(btn, active) {
        if (!btn) return;
        var expand = (window.RenamerIcons && window.RenamerIcons.EXPAND) || '⛶';
        var collapse = (window.RenamerIcons && window.RenamerIcons.COLLAPSE) || '⛷';
        btn.innerHTML = active ? collapse : expand;
        btn.title = active ? 'Quitter plein écran / Exit fullscreen' : 'Plein écran / Fullscreen';
    }

    function ensureViewportMeta() {
        if (typeof document === 'undefined') return;
        if (!isIOS()) return;
        var VP_NAME = 'viewport';
        var existing = document.querySelector('meta[name="' + VP_NAME + '"]');
        var content = 'width=device-width,initial-scale=1,viewport-fit=cover,shrink-to-fit=no';
        if (existing) {
            var parts = existing.getAttribute('content') || '';
            if (/viewport-fit=cover/i.test(parts) && /shrink-to-fit=no/i.test(parts)) return;
            var tokens = String(parts).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
            var hasFit = false;
            var hasShrink = false;
            for (var i = 0; i < tokens.length; i++) {
                if (/^viewport-fit=/i.test(tokens[i])) {
                    tokens[i] = 'viewport-fit=cover';
                    hasFit = true;
                }
                if (/^shrink-to-fit=/i.test(tokens[i])) {
                    tokens[i] = 'shrink-to-fit=no';
                    hasShrink = true;
                }
            }
            if (!hasFit) tokens.push('viewport-fit=cover');
            if (!hasShrink) tokens.push('shrink-to-fit=no');
            existing.setAttribute('content', tokens.join(','));
        } else {
            var meta = document.createElement('meta');
            meta.name = VP_NAME;
            meta.content = content;
            document.head.appendChild(meta);
        }
    }

    function injectStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.renamer-css-fullscreen{',
            'position:fixed!important;',
            'top:0;left:0;right:0;bottom:0!important;',
            'z-index:2147483000!important;',
            'margin:0!important;',
            'padding:0!important;',
            'box-sizing:border-box!important;',
            'background:#000!important;',
            'border:none!important;',
            'border-radius:0!important;',
            '}',
            'body.renamer-ipados-fullscreen{',
            'position:fixed!important;',
            'inset:0!important;',
            'width:100vw!important;',
            'height:100dvh!important;',
            'overflow:hidden!important;',
            'margin:0!important;',
            'padding:0!important;',
            'z-index:auto!important;',
            '}',
        ].join(' ');
        document.head.appendChild(style);

        if (window.addEventListener) {
            window.addEventListener('beforeunload', function() {
                var body = document.body;
                if (body && body.classList) {
                    body.classList.remove(BODY_FS_CLASS);
                }
                var fsEl = document.querySelector('.' + CSS_FS_CLASS);
                if (fsEl && fsEl.classList) {
                    fsEl.classList.remove(CSS_FS_CLASS);
                }
            });
        }
    }

    function init() {
        injectStyles();
    }

    window.RenamerIPadOS = {
        isIOS: isIOS,
        isIPadOS: isIPadOS,
        isPWAInstalled: isPWAInstalled,
        enterCSSFullscreen: enterCSSFullscreen,
        exitCSSFullscreen: exitCSSFullscreen,
        isCSSFullscreen: isCSSFullscreen,
        setFullscreenButton: setFullscreenButton,
        ensureViewportMeta: ensureViewportMeta,
        injectStyles: injectStyles,
        isTouchDevice: isTouchDevice,
    };

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } else {
        init();
    }
})();
