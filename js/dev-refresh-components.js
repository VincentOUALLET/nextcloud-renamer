(function() {
    'use strict';

    // ---- Mode detection --------------------------------------------------
    // The dev-refresh tooling reuses the "verbose client" mode (URL param
    // ?verbose=client). Keeping a single source of truth for "are we in dev
    // mode" avoids scattering checks across the codebase. The same flag drives
    // the toast logging in log.js AND these hard-refresh buttons.
    function isDevMode() {
        try {
            return typeof window !== 'undefined'
                && window.RenamerLog
                && typeof window.RenamerLog.isClientMode === 'function'
                && window.RenamerLog.isClientMode();
        } catch (e) {
            return false;
        }
    }

    // ---- In-memory blob cache -------------------------------------------
    // Blobs cannot be serialised, so they live in a JS object on ctx.state.
    // This survives component refreshes (no full page reload) but not a hard
    // browser refresh — which is the expected trade-off: the expensive network
    // fetch only happens on the very first load.
    function getBlobCache(ctx) {
        if (!ctx || !ctx.state) return null;
        if (!ctx.state.readerBlobCache) ctx.state.readerBlobCache = {};
        return ctx.state.readerBlobCache;
    }

    function cacheBlob(ctx, filePath, blob) {
        if (!ctx || !filePath || !blob) return null;
        var cache = getBlobCache(ctx);
        if (!cache) return null;
        cache[filePath] = { blob: blob, size: (blob.size || 0), ts: Date.now() };
        return cache[filePath];
    }

    function getCachedBlob(ctx, filePath) {
        var cache = getBlobCache(ctx);
        return (cache && cache[filePath]) ? cache[filePath].blob : null;
    }

    function invalidateCachedBlob(ctx, filePath) {
        var cache = getBlobCache(ctx);
        if (cache && cache[filePath]) {
            delete cache[filePath];
            return true;
        }
        return false;
    }

    // ---- Script hot-reload (cache-busted) ---------------------------------
    // Only the *application* scripts are reloaded — never the heavy
    // third-party libraries (pdf.js, jszip, epub, …) which are slow to fetch
    // and re-initialising them is pointless during a render iteration.
    var LIBRARY_SKIP_PATTERNS = [
        'pdf.min.js', 'pdf.worker.min.js', 'jszip.min.js',
        'epub.min.js', 'Sortable.min.js', 'audio-player.js'
    ];
    // Relative to /apps/renamer/js/
    // Only the *viewer* scripts are reloaded here. The core `app.js` owns the
    // shared RenamerApp state (readerDomCache, pdfPageCache, currentCollection,
    // etc.): reloading it would create a fresh `state` and wipe every cache,
    // which defeats "refresh without losing the tome". Viewer-only reload keeps
    // the live ctx/state intact so navigation between tomes stays cached.
    var RELOADABLE_MARKERS = [
        'tabs/pdf/generic-viewer.js',
        'tabs/pdf/reader.js',
        'tabs/reader/app-reader.js'
    ];

    function normalizeSrc(src) {
        return (src || '').split('?')[0];
    }

    function isReloadableScript(src) {
        var norm = normalizeSrc(src);
        if (norm.indexOf('/apps/renamer/js/') === -1) return false;
        if (LIBRARY_SKIP_PATTERNS.some(function(p) { return norm.indexOf(p) !== -1; })) return false;
        if (norm.indexOf('dev-refresh-components.js') !== -1) return false;
        if (norm.indexOf('/js/log.js') !== -1) return false;
        if (norm.indexOf('/js/utils.js') !== -1) return false;
        return RELOADABLE_MARKERS.some(function(m) {
            return norm.indexOf('/apps/renamer/js/' + m) !== -1;
        });
    }

    function reloadScriptTag(script, ts) {
        return new Promise(function(resolve, reject) {
            var base = normalizeSrc(script.src);
            var newSrc = base + '?_devt=' + ts;
            var newScript = document.createElement('script');
            newScript.src = newSrc;
            newScript.async = false;
            newScript.onload = function() { resolve(newSrc); };
            newScript.onerror = function() { reject(new Error('Script load failed: ' + newSrc)); };
            if (script.parentNode) {
                script.parentNode.replaceChild(newScript, script);
            } else {
                reject(new Error('Script node detached: ' + base));
            }
        });
    }

    // ID of <style> blocks injected by reloadable app scripts. Because those
    // scripts guard injection with getElementById(...), simply re-executing the
    // script won't refresh the CSS. We remove them here so the reloaded script
    // re-injects a fresh <style> with the current rules.
    var INJECTED_STYLE_IDS = [
        'renamer-generic-viewer-styles',
        'renamer-pdf-styles'
    ];

    function resetReloadableStyles() {
        INJECTED_STYLE_IDS.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    // Reloads the application JS files with a cache-busting query param so
    // the browser fetches fresh code. Third-party libraries are left alone.
    // Resolves once every replaced script has executed.
    function reloadAppScripts() {
        var ts = Date.now();
        var scripts = document.querySelectorAll('script[src]');
        var promises = [];
        scripts.forEach(function(script) {
            if (isReloadableScript(script.src)) {
                promises.push(reloadScriptTag(script, ts));
            }
        });
        return Promise.all(promises);
    }

    // ---- Styles ----------------------------------------------------------
    var STYLE_ID = 'renamer-dev-refresh-style';
    var styleInjected = false;

    function ensureStyles() {
        if (styleInjected) return;
        styleInjected = true;
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.renamer-dev-toolbar{position:fixed;top:8px;right:8px;z-index:2147483000;display:inline-flex;align-items:center;gap:6px 8px;padding:6px 10px;border-radius:6px;background:rgba(34,34,34,0.92);color:#fff;font-size:12px;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.35);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.18)}',
            '.renamer-dev-toolbar .renamer-dev-label{font-variant:small-caps;letter-spacing:0.04em;opacity:0.85;white-space:nowrap}',
            '.renamer-dev-toolbar .renamer-dev-filename{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0.9}',
            '.renamer-dev-btn{background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;transition:background 150ms ease,box-shadow 150ms ease}',
            '.renamer-dev-btn:hover{background:rgba(255,255,255,0.28);box-shadow:0 0 0 2px rgba(255,255,255,0.3)}',
            '.renamer-dev-btn:disabled{opacity:1;cursor:not-allowed}',
            '.renamer-dev-btn.dev-js{background:rgba(255,140,0,1);border-color:rgba(255,140,0,1)}',
            '.renamer-dev-btn.dev-js:hover{background:rgba(255,140,0,1)}',
            '.renamer-dev-btn.dev-data{background:rgba(220,38,38,1);border-color:rgba(220,38,38,1)}',
            '.renamer-dev-btn.dev-data:hover{background:rgba(220,38,38,1)}',
            '.renamer-dev-status{font-variant-numeric:tabular-nums;opacity:0.7;min-width:60px;text-align:right}',
            '@keyframes renamer-dev-spin{to{transform:rotate(360deg)}}',
            '.renamer-dev-spinner{width:10px;height:10px;border:2px solid rgba(255,255,255,1);border-top-color:#fff;border-radius:50%;animation:renamer-dev-spin 0.8s linear infinite}'
        ].join('');
        document.head.appendChild(style);
    }

    // ---- Toolbar ---------------------------------------------------------
    function removeReaderToolbar() {
        var existing = document.querySelector('.renamer-dev-toolbar');
        if (existing) existing.remove();
    }

    function makeBtn(label, title, className) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'renamer-dev-btn ' + (className || '');
        btn.textContent = label;
        btn.title = title || label;
        return btn;
    }

    // Tracks the most recently rendered reader so keyboard shortcuts can target
    // it without having to query the DOM for the "active" container.
    var activeReader = { container: null, ctx: null, filePath: null };

    function setActiveReader(container, ctx, filePath) {
        activeReader.container = container;
        activeReader.ctx = ctx;
        activeReader.filePath = filePath;
    }

    // Creates (or recreates) the dev toolbar on a rendered reader container.
    // Called from generic-viewer.js after the reader UI has been built.
    function createReaderToolbar(ctx, container, source, filePath) {
        if (!isDevMode()) return;
        if (!container || !container.parentNode) return;
        ensureStyles();
        removeReaderToolbar();
        setActiveReader(container, ctx, filePath);

        var toolbar = document.createElement('div');
        toolbar.className = 'renamer-dev-toolbar';
        toolbar.setAttribute('data-dev-toolbar', 'reader');

        var fileSpan = document.createElement('span');
        fileSpan.className = 'renamer-dev-filename';
        fileSpan.textContent = (filePath || '').replace(/^.*\//, '') || 'reader';
        toolbar.appendChild(fileSpan);

        var btnJS = makeBtn('Refresh JS', 'Re-exécuter le rendu avec la donnée en cache (recharge les JS)', 'dev-js');
        var btnData = makeBtn('Refresh Data', 'Hard refresh : re-télécharger la donnée depuis le serveur', 'dev-data');
        var status = document.createElement('span');
        status.className = 'renamer-dev-status';
        status.textContent = 'prêt';

        toolbar.appendChild(btnJS);
        toolbar.appendChild(btnData);
        toolbar.appendChild(status);

        document.body.appendChild(toolbar);

        function setBusy(busy) {
            btnJS.disabled = busy;
            btnData.disabled = busy;
            if (busy) {
                status.innerHTML = '<span class="renamer-dev-spinner"></span>';
            } else {
                status.textContent = 'prêt';
            }
        }

        btnJS.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            doRefreshJS(container, ctx, filePath, setBusy);
        });

        btnData.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            doRefreshData(container, ctx, filePath, setBusy);
        });

        return toolbar;
    }

    // ---- Refresh actions -------------------------------------------------
    // Helper: destroy the current UI instance + source to release listeners
    // and object URLs before re-rendering.
    function destroyCurrentInstance(container) {
        if (container._readerUIInstance && typeof container._readerUIInstance.destroy === 'function') {
            try { container._readerUIInstance.destroy(); } catch (e) {}
            container._readerUIInstance = null;
        }
        // buildReaderUI's destroy() also destroys the source, but be defensive.
        if (container._renamerSource && typeof container._renamerSource.destroy === 'function') {
            try { container._renamerSource.destroy(); } catch (e) {}
        }
        container._renamerSource = null;
    }

    // "Refresh JS": reload app scripts (cache-busted) then re-render using the
    // cached blob. No network fetch of the file data → iteration is fast.
    function doRefreshJS(container, ctx, filePath, setBusy) {
        var dev = window.RenamerDevRefresh;
        removeReaderToolbar();
        destroyCurrentInstance(container);
        resetReloadableStyles();
        if (setBusy) setBusy(true);
        if (ctx && typeof ctx.showToast === 'function') {
            ctx.showToast('Dev : rechargement des scripts JS…', 'info');
        }

        dev.reloadAppScripts().then(function() {
            var blob = container._readerCachedBlob || dev.getCachedBlob(ctx, filePath);
            if (!blob) {
                console.warn('[DevRefresh] No cached blob, falling back to data refresh');
                doRefreshData(container, ctx, filePath, setBusy);
                return;
            }
            if (window.RenamerGenericViewer && typeof window.RenamerGenericViewer.renderFile === 'function') {
                window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
            } else if (window.RenamerReader && typeof window.RenamerReader.renderReader === 'function') {
                // Fallback: let renderReader decide (it will re-fetch since
                // no blob is passed, but that only happens if renderFile is gone).
                window.RenamerReader.renderReader(ctx, filePath, container);
            }
        }).catch(function(err) {
            console.error('[DevRefresh] script reload failed, retrying render with cached blob:', err);
            var blob = container._readerCachedBlob || dev.getCachedBlob(ctx, filePath);
            if (blob && window.RenamerGenericViewer && typeof window.RenamerGenericViewer.renderFile === 'function') {
                window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
            } else {
                doRefreshData(container, ctx, filePath, setBusy);
            }
        });
    }

    // "Refresh Data" (hard refresh): invalidate the blob cache and re-run the
    // full reader pipeline (re-fetches the file from the server).
    function doRefreshData(container, ctx, filePath, setBusy) {
        var dev = window.RenamerDevRefresh;
        removeReaderToolbar(container);
        destroyCurrentInstance(container);
        dev.invalidateCachedBlob(ctx, filePath);
        delete container._readerCachedBlob;
        if (setBusy) setBusy(true);
        if (ctx && typeof ctx.showToast === 'function') {
            ctx.showToast('Dev : hard refresh de la donnée…', 'info');
        }
        if (window.RenamerReader && typeof window.RenamerReader.renderReader === 'function') {
            window.RenamerReader.renderReader(ctx, filePath, container);
        } else if (window.RenamerGenericViewer && typeof window.RenamerGenericViewer.renderFile === 'function') {
            window.RenamerGenericViewer.renderFile(ctx, filePath, null, container);
        }
    }

    // ---- Keyboard shortcuts (dev efficiency) -----------------------------
    function attachKeyboardShortcuts() {
        if (typeof document._renamerDevKeyBound !== 'undefined') return;
        document._renamerDevKeyBound = true;
        document.addEventListener('keydown', function(e) {
            if (!isDevMode()) return;
            var tag = e.target && e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
            if (!activeReader.container) return;
            if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
                e.preventDefault();
                doRefreshJS(activeReader.container, activeReader.ctx, activeReader.filePath);
                return;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                doRefreshData(activeReader.container, activeReader.ctx, activeReader.filePath);
                return;
            }
        });
    }

    attachKeyboardShortcuts();

    window.RenamerDevRefresh = {
        isDevMode: isDevMode,
        cacheBlob: cacheBlob,
        getCachedBlob: getCachedBlob,
        invalidateCachedBlob: invalidateCachedBlob,
        createReaderToolbar: createReaderToolbar,
        removeReaderToolbar: removeReaderToolbar,
        reloadAppScripts: reloadAppScripts,
        refreshJS: doRefreshJS,
        refreshData: doRefreshData,
        isReloadableScript: isReloadableScript,
        _active: activeReader
    };
})();
