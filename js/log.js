(function() {
    'use strict';

    function getUrlParam(name) {
        try {
            var url = new URL(window.location.href);
            return url.searchParams.get(name);
        } catch (e) {
            return null;
        }
    }

    var verboseMode = getUrlParam('verbose') || 'none';

    var startTime = Date.now();

    if (typeof console === 'undefined' || !console) {
        console = {};
    }

    var origLog = console.log || function() {};
    var origWarn = console.warn || function() {};
    var origError = console.error || function() {};
    var origInfo = console.info || function() {};

    var styleId = 'renamer-log-style';
    var styleInjected = false;

    function ensureToastStyles() {
        if (styleInjected) return;
        styleInjected = true;
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent =
            '.renamer-toast-container{position:fixed;bottom:20px;right:20px;z-index:20001;display:flex;flex-direction:column;gap:8px;pointer-events:none}' +
            '.renamer-toast{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.2);min-width:200px;max-width:480px;pointer-events:auto;opacity:0;transform:translateX(20px);transition:opacity 250ms ease,transform 250ms ease}' +
            '.renamer-toast-show{opacity:1;transform:translateX(0)}' +
            '.renamer-toast-success{border-left:4px solid #22c55e;background:var(--nc-bg,var(--color-main-background,#fff))}' +
            '.renamer-toast-error{border-left:4px solid #ef4444;background:var(--nc-bg,var(--color-main-background,#fff))}' +
            '.renamer-toast-info{border-left:4px solid #22c55e;background:var(--nc-bg,var(--color-main-background,#fff))}' +
            '.renamer-toast-warning{border-left:4px solid #f59e0b;background:var(--nc-bg,var(--color-main-background,#fff))}' +
            '.renamer-toast-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#fff;flex-shrink:0}' +
            '.renamer-toast-success .renamer-toast-icon{background:#22c55e}' +
            '.renamer-toast-error .renamer-toast-icon{background:#ef4444}' +
            '.renamer-toast-info .renamer-toast-icon{background:#22c55e}' +
            '.renamer-toast-warning .renamer-toast-icon{background:#f59e0b}' +
            '.renamer-toast-text{flex:1;word-break:break-word;white-space:normal;color:var(--nc-text,var(--color-main-text,#000))}' +
            '.renamer-toast-close{background:transparent;border:none;color:inherit;opacity:0.5;font-size:20px;line-height:1;cursor:pointer;padding:0 4px;margin-left:4px;flex-shrink:0;transition:opacity 150ms ease}' +
            '.renamer-toast-close:hover{opacity:1}';
        if (!document.getElementById(styleId)) {
            document.head.appendChild(style);
        }
    }

    function getToastContainer() {
        var c = document.getElementById('renamer-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'renamer-toast-container';
            c.className = 'renamer-toast-container';
            document.body.appendChild(c);
        }
        return c;
    }

    var toastCounter = 0;
    var startupToastId = null;
    var closeAllToastId = null;

    function countVisibleToasts() {
        var container = getToastContainer();
        var toasts = container.querySelectorAll('.renamer-toast');
        var count = 0;
        for (var i = 0; i < toasts.length; i++) {
            if (toasts[i].classList.contains('renamer-toast-close-all')) continue;
            if (toasts[i].classList.contains('renamer-toast-show')) count++;
        }
        return count;
    }

    function createCloseAllToast() {
        if (closeAllToastId) return;
        ensureToastStyles();
        var container = getToastContainer();
        var t = document.createElement('div');
        closeAllToastId = 'toast-close-all';
        t.className = 'renamer-toast renamer-toast-close-all renamer-toast-warning';
        t.setAttribute('data-toast-id', closeAllToastId);
        t.innerHTML = '<span class="renamer-toast-icon">!</span>' +
                      '<span class="renamer-toast-text">Tout fermer</span>' +
                      '<button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
        t.querySelector('.renamer-toast-close').addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllToasts();
        });
        t.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllToasts();
        });
        container.insertBefore(t, container.firstChild);
        setTimeout(function() { t.classList.add('renamer-toast-show'); }, 10);
    }

    function removeCloseAllToast() {
        if (!closeAllToastId) return;
        var t = document.querySelector('.renamer-toast[data-toast-id="' + closeAllToastId + '"]');
        if (t && t.parentNode) {
            t.classList.remove('renamer-toast-show');
            setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
        }
        closeAllToastId = null;
    }

    function closeAllToasts() {
        var container = getToastContainer();
        var allToasts = container.querySelectorAll('.renamer-toast');
        allToasts.forEach(function(t) {
            t.remove();
        });
        closeAllToastId = null;
    }

    function checkToastThreshold() {
        var count = countVisibleToasts();
        if (count > 3) {
            createCloseAllToast();
        } else {
            removeCloseAllToast();
        }
    }

    function toast(message, type, persistent) {
        type = type || 'info';
        ensureToastStyles();
        var container = getToastContainer();
        var t = document.createElement('div');
        var toastId = 'toast-' + (toastCounter++);
        t.className = 'renamer-toast renamer-toast-' + type;
        t.setAttribute('data-toast-id', toastId);
        var icon = type === 'error' ? '\u2715' : type === 'success' ? '\u2713' : type === 'warning' ? '!' : 'i';
        t.innerHTML = '<span class="renamer-toast-icon">' + icon + '</span>' +
                      '<span class="renamer-toast-text"></span>' +
                      '<button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
        t.querySelector('.renamer-toast-text').textContent = String(message);

        var dismiss = function() {
            t.classList.remove('renamer-toast-show');
            setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
            setTimeout(checkToastThreshold, 350);
        };
        t.querySelector('.renamer-toast-close').addEventListener('click', function(e) {
            e.stopPropagation();
            dismiss();
        });
        container.appendChild(t);
        setTimeout(function() { t.classList.add('renamer-toast-show'); }, 10);

        if (!persistent) {
            var timeout = type === 'error' ? 8000 : 4000;
            setTimeout(function() {
                if (t.parentNode && t.classList.contains('renamer-toast-show')) dismiss();
            }, timeout);
        }
        setTimeout(checkToastThreshold, 50);
        return toastId;
    }

    function removeToast(toastId) {
        if (!toastId) return;
        var t = document.querySelector('.renamer-toast[data-toast-id="' + toastId + '"]');
        if (t && t.parentNode) {
            t.classList.remove('renamer-toast-show');
            setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
            setTimeout(checkToastThreshold, 350);
        }
    }

    function joinArgs(args) {
        var parts = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            if (typeof arg === 'string') {
                parts.push(arg);
            } else if (arg === null) {
                parts.push('null');
            } else if (arg === undefined) {
                parts.push('undefined');
            } else if (arg instanceof Error) {
                parts.push(arg.message || String(arg));
            } else {
                try {
                    parts.push(JSON.stringify(arg));
                } catch (e) {
                    parts.push(String(arg));
                }
            }
        }
        return parts.join(' ');
    }

    function extractClientFlag(args) {
        if (!args.length) return false;
        var last = args[args.length - 1];
        if (last && typeof last === 'object' && !Array.isArray(last) && !(last instanceof Error) && last.client === true) {
            return true;
        }
        return false;
    }

    function stripClientFlag(args) {
        if (!args.length) return args;
        var last = args[args.length - 1];
        if (last && typeof last === 'object' && !Array.isArray(last) && !(last instanceof Error) && last.client === true) {
            return args.slice(0, -1);
        }
        return args;
    }

    function isClientMode() {
        return verboseMode === 'client';
    }

    function isConsoleMode() {
        return verboseMode === 'client' || verboseMode === 'console_only';
    }

    function isNoneMode() {
        return verboseMode === 'none';
    }

    function log() {
        var args = Array.prototype.slice.call(arguments);
        var isClient = extractClientFlag(args);
        var cleanArgs = stripClientFlag(args);
        var msg = joinArgs(cleanArgs);
        if (isConsoleMode()) {
            origLog.apply(console, cleanArgs);
        }
        if (isClientMode() && isClient) {
            toast(msg, 'info', true);
        }
    }

    function warn() {
        var args = Array.prototype.slice.call(arguments);
        var isClient = extractClientFlag(args);
        var cleanArgs = stripClientFlag(args);
        var msg = joinArgs(cleanArgs);
        if (isConsoleMode()) {
            origWarn.apply(console, cleanArgs);
        }
        if (isClientMode() && isClient) {
            toast('WARNING: ' + msg, 'warning', true);
        }
    }

    function error() {
        var args = Array.prototype.slice.call(arguments);
        var isClient = extractClientFlag(args);
        var cleanArgs = stripClientFlag(args);
        var msg = joinArgs(cleanArgs);
        if (isConsoleMode()) {
            origError.apply(console, cleanArgs);
        }
        if (isClientMode() && isClient) {
            toast('ERROR: ' + msg, 'error', true);
        }
    }

    function info() {
        var args = Array.prototype.slice.call(arguments);
        var isClient = extractClientFlag(args);
        var cleanArgs = stripClientFlag(args);
        var msg = joinArgs(cleanArgs);
        if (isConsoleMode()) {
            origInfo.apply(console, cleanArgs);
        }
        if (isClientMode() && isClient) {
            toast(msg, 'info', true);
        }
    }

    console.log = function() { log.apply(null, arguments); };
    console.warn = function() { warn.apply(null, arguments); };
    console.error = function() { error.apply(null, arguments); };
    console.info = function() { info.apply(null, arguments); };

    function appReady() {
        var elapsed = Date.now() - startTime;
        var msg = 'Renamer app ready (' + elapsed + 'ms load time)';
        origLog.apply(console, ['[Renamer]', msg]);
        if (isClientMode()) {
            toast(msg, 'success', true);
        }
        if (startupToastId) {
            removeToast(startupToastId);
            startupToastId = null;
        }
    }

    if (isClientMode()) {
        startupToastId = toast('Renamer app starting...', 'info', true);
    } else if (isConsoleMode()) {
        origLog.apply(console, ['[Renamer] log.js loaded, verboseMode=' + verboseMode + ', load time measuring enabled']);
    }

    var api = {
        verboseMode: verboseMode,
        startTime: startTime,
        isClientMode: isClientMode,
        isConsoleMode: isConsoleMode,
        isNoneMode: isNoneMode,
        log: log,
        warn: warn,
        error: error,
        info: info,
        toast: toast,
        appReady: appReady,
        removeToast: removeToast,
        closeAllToasts: closeAllToasts,
    };

    window.RenamerLog = api;
})();
