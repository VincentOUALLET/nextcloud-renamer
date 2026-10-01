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

    function cacheBlob(ctx, filePath, blob, loadStart) {
        if (!ctx || !filePath || !blob) return null;
        var cache = getBlobCache(ctx);
        if (!cache) return null;
        var ts = Date.now();
        var newLoadTime = loadStart ? (ts - loadStart) : 0;
        var existing = cache[filePath];
        cache[filePath] = { blob: blob, size: (blob.size || 0), ts: ts, loadTime: (existing && existing.loadTime > 0) ? existing.loadTime : newLoadTime };

        // Sync size/loadTime into the loadedTomes tracking list so the dev
        // toolbar details panel can show them even for tomes loaded via API
        // navigation (blob was null at renderFile entry).
        if (ctx && ctx.state) {
            if (!Array.isArray(ctx.state.loadedTomes)) ctx.state.loadedTomes = [];
            for (var i = 0; i < ctx.state.loadedTomes.length; i++) {
                if (ctx.state.loadedTomes[i].path === filePath) {
                    ctx.state.loadedTomes[i].size = blob.size || 0;
                    if (!ctx.state.loadedTomes[i].loadTime || ctx.state.loadedTomes[i].loadTime === 0) {
                        ctx.state.loadedTomes[i].loadTime = newLoadTime;
                    }
                    ctx.state.loadedTomes[i].ts = ts;
                    break;
                }
            }
        }

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
        'tabs/pdf/epub-viewer.js',
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
            '.renamer-dev-toolbar{position:fixed;top:8px;left:8px;z-index:2147483000;display:inline-flex;align-items:center;gap:6px 8px;padding:6px 10px;border-radius:6px;background:rgba(34,34,34,0.92);color:#fff;font-size:12px;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,0.35);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.18);cursor:grab;cursor:-webkit-grab}',
            '#renamer-dev-global-toolbar{top:auto;bottom:8px;right:8px;left:unset;width:120px;z-index:100000;flex-direction:column;align-items:stretch;background:var(--nc-bg,var(--color-main-background,#fff));color:var(--nc-text,var(--color-main-text,#000));box-shadow:0 4px 16px rgba(0,0,0,0.2);border:1px solid var(--nc-border,rgba(0,0,0,0.18));transition:top 0.2s ease,bottom 0.2s ease,width 0.25s ease}',
            '#renamer-dev-global-toolbar.renamer-dev-details-open{width:310px}',
            '#renamer-dev-global-toolbar.dragging{transition:none}',
            '.renamer-dev-toolbar-row{display:flex;align-items:center;gap:6px 8px;width:100%;box-sizing:border-box}',
            '.renamer-dev-info-btn{background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:4px;width:24px;height:24px;font-size:13px;line-height:1;cursor:pointer;opacity:0.6;display:flex;align-items:center;justify-content:center;transition:opacity 150ms ease,background 150ms ease}',
            '.renamer-dev-info-btn:hover{opacity:1;background:rgba(255,255,255,0.2)}',
            '.renamer-dev-info-btn.active{opacity:1;background:rgba(124,58,237,0.3)}',
            '.renamer-dev-details{max-height:0;overflow:hidden;opacity:0;transition:max-height 0.25s ease,opacity 0.25s ease;box-sizing:border-box;width:100%;max-width:340px;display:flex;flex-direction:column;gap:4px}',
            '#renamer-dev-global-toolbar .renamer-dev-tome-details{margin-top:4px}',
            '#renamer-dev-global-toolbar .renamer-dev-details .renamer-dev-btn{width:100%;box-sizing:border-box}',
            '#renamer-dev-global-toolbar.renamer-dev-details-open .renamer-dev-details{max-height:500px;opacity:1;padding:8px 10px}',
            '#renamer-dev-global-toolbar:not(.renamer-dev-details-open){.renamer-dev-details{padding:0}}',
            '#renamer-dev-global-toolbar:not(.renamer-dev-details-open){gap:0 8px}',
            '#renamer-dev-global-toolbar .renamer-dev-btn{background:rgba(0,0,0,0.05);border:1px solid var(--nc-border,rgba(0,0,0,0.18));color:var(--nc-text,var(--color-main-text,#000))}',
            '#renamer-dev-global-toolbar .renamer-dev-btn:hover{background:rgba(0,0,0,0.1)}',
            '#renamer-dev-global-toolbar .renamer-dev-info-btn{border:1px solid var(--nc-border,rgba(0,0,0,0.18));color:var(--nc-text,var(--color-main-text,#000));transition:opacity 150ms ease,background 150ms ease}',
            '#renamer-dev-global-toolbar .renamer-dev-info-btn:hover{background:rgba(0,0,0,0.05)}',
            '#renamer-dev-global-toolbar .renamer-dev-info-btn svg{transition:transform 0.2s ease}',
            '#renamer-dev-global-toolbar .renamer-dev-info-btn.open svg{transform:rotate(90deg)}',
            '.renamer-dev-handle{display:inline-flex;align-items:center;justify-content:center;cursor:grab;cursor:-webkit-grab}',
            '#renamer-dev-global-toolbar .renamer-dev-close{border:1px solid var(--nc-border,rgba(0,0,0,0.18));color:var(--nc-text,var(--color-main-text,#000))}',
            '#renamer-dev-global-toolbar .renamer-dev-close:hover{background:rgba(0,0,0,0.05)}',
            '#renamer-dev-global-toolbar .renamer-dev-spinner{border:2px solid rgba(0,0,0,0.3);border-top-color:rgba(0,0,0,0.6)}',
            '.renamer-dev-tome-line{padding:2px 0;opacity:0.85;display:flex;justify-content:space-between;align-items:baseline}',
            '.renamer-dev-tome-line .renamer-dev-tome-name{opacity:1;font-weight:500}',
            '.renamer-dev-tome-line .renamer-dev-tome-meta{font-size:11px;opacity:0.6}',
            '.renamer-dev-tome-line .renamer-dev-tome-loadtime{font-variant-numeric:tabular-nums;opacity:0.5}',
            '.renamer-dev-tome-current{border-left:2px solid rgba(124,58,237,0.8);padding-left:6px}',
            '.renamer-dev-toolbar.dragging{cursor:grabbing;cursor:-webkit-grabbing}',
            '.renamer-dev-btn{background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;transition:background 150ms ease,box-shadow 150ms ease}',
            '.renamer-dev-btn:hover{background:rgba(255,255,255,0.28);box-shadow:0 0 0 2px rgba(255,255,255,0.3)}',
            '.renamer-dev-btn:disabled{opacity:1;cursor:not-allowed}',
            '.renamer-dev-btn.dev-js{background:rgba(255,140,0,1);border-color:rgba(255,140,0,1)}',
            '.renamer-dev-btn.dev-js:hover{background:rgba(255,140,0,1)}',
            '.renamer-dev-btn.dev-data{background:rgba(220,38,38,1);border-color:rgba(220,38,38,1)}',
            '.renamer-dev-btn.dev-data:hover{background:rgba(220,38,38,1)}',
            '@keyframes renamer-dev-spin{to{transform:rotate(360deg)}}',
            '.renamer-dev-spinner{width:10px;height:10px;border:2px solid rgba(255,255,255,1);border-top-color:#fff;border-radius:50%;animation:renamer-dev-spin 0.8s linear infinite}',
            '.renamer-dev-close{position:relative;margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:4px;width:20px;height:20px;font-size:14px;line-height:1;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0.6;transition:opacity 150ms ease,background 150ms ease,box-shadow 150ms ease}',
            '.renamer-dev-close:hover{opacity:1;background:rgba(255,255,255,0.2);box-shadow:0 0 0 2px rgba(255,255,255,0.3)}',
            '.renamer-dev-close:focus{outline:2px solid currentColor;outline-offset:1px}'
        ].join('');
        document.head.appendChild(style);
    }

     // ---- Toolbar ---------------------------------------------------------
     function makeBtn(label, title, className) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'renamer-dev-btn ' + (className || '');
        btn.textContent = label;
        btn.title = title || label;
        return btn;
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' kB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function formatElapsedTime(ms) {
        var total = Math.floor(ms / 1000);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        var mm = (m < 10 ? '0' : '') + m;
        var ss = (s < 10 ? '0' : '') + s;
        if (h > 0) {
            var hh = (h < 10 ? '0' : '') + h;
            return hh + ':' + mm + ':' + ss;
        }
        return mm + ':' + ss;
    }

    function buildTomeDetails(ctx, filePath, container) {
        container.innerHTML = '';

        var generic = window.RenamerGenericViewer;
        var tomeInfo = null;
        if (generic && typeof generic.getTomeInfo === 'function') {
            try { tomeInfo = generic.getTomeInfo(ctx, filePath); } catch (e) {}
        }

        if (tomeInfo && tomeInfo.collectionName) {
            var colLine = document.createElement('div');
            colLine.className = 'renamer-dev-tome-line';
            var colName = document.createElement('span');
            colName.className = 'renamer-dev-tome-name';
            colName.textContent = tomeInfo.collectionName;
            colLine.appendChild(colName);
            var colMeta = document.createElement('span');
            colMeta.className = 'renamer-dev-tome-meta';
            colMeta.textContent = ' Collection';
            colLine.appendChild(colMeta);
            container.appendChild(colLine);
        }

        if (tomeInfo && tomeInfo.totalTomes > 0) {
            var posLine = document.createElement('div');
            posLine.className = 'renamer-dev-tome-line';
            var posSpan = document.createElement('span');
            posSpan.className = 'renamer-dev-tome-name';
            var tomeWord = (ctx.t ? ctx.t('tome') : '') || 'Tome';
            posSpan.textContent = tomeWord + ' ' + tomeInfo.currentTome + ' / ' + tomeInfo.totalTomes;
            posLine.appendChild(posSpan);
            var posMeta = document.createElement('span');
            posMeta.className = 'renamer-dev-tome-meta';
            posMeta.textContent = ' Position';
            posLine.appendChild(posMeta);
            container.appendChild(posLine);
        }

        // All loaded tomes (from loadedTomes, includes API-navigated ones)
        var loaded = ctx && ctx.state && Array.isArray(ctx.state.loadedTomes) ? ctx.state.loadedTomes : null;
        if (loaded && loaded.length > 0) {
            var entries = loaded.slice().sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });

            var header = document.createElement('div');
            header.className = 'renamer-dev-tome-line renamer-dev-tome-meta';
            header.textContent = 'Tomes chargés';
            container.appendChild(header);

            entries.forEach(function(entry) {
                var line = document.createElement('div');
                line.className = 'renamer-dev-tome-line' + (entry.path === filePath ? ' renamer-dev-tome-current' : '');
                var leftDiv = document.createElement('span');
                leftDiv.style.cssText = 'display:flex;align-items:baseline;gap:6px;';
                var nameSpan = document.createElement('span');
                nameSpan.className = 'renamer-dev-tome-name';
                var name = entry.path.replace(/^.*\//, '') || entry.path;
                var display = name;
                var formatted = formatBytes(entry.size);
                if (formatted) display += ' (' + formatted + ')';
                nameSpan.textContent = display;
                leftDiv.appendChild(nameSpan);
                if (entry.path === filePath) {
                    var curMeta = document.createElement('span');
                    curMeta.className = 'renamer-dev-tome-meta';
                    curMeta.textContent = ' courant';
                    leftDiv.appendChild(curMeta);
                }
                line.appendChild(leftDiv);
                var loadTimeSpan = document.createElement('span');
                loadTimeSpan.className = 'renamer-dev-tome-loadtime';
                loadTimeSpan.textContent = (entry.loadTime > 0) ? formatElapsedTime(entry.loadTime) : '';
                line.appendChild(loadTimeSpan);
                container.appendChild(line);
            });
        }

        if (container.children.length === 0) {
            var empty = document.createElement('span');
            empty.className = 'renamer-dev-tome-meta';
            empty.textContent = 'Aucun tome chargé';
            container.appendChild(empty);
        }
    }

    // Tracks the most recently rendered reader so keyboard shortcuts can target
    // it without having to query the DOM for the "active" container.
    var activeReader = { container: null, ctx: null, filePath: null };

    function setActiveReader(container, ctx, filePath) {
        activeReader.container = container;
        activeReader.ctx = ctx;
        activeReader.filePath = filePath;

        // Accumulate every tome that has been rendered into ctx.state.loadedTomes
        // so the dev toolbar details panel can list ALL loaded tomes — including
        // those navigated via API (blob=null) that never reached cacheBlob.
        if (ctx && ctx.state) {
            if (!Array.isArray(ctx.state.loadedTomes)) ctx.state.loadedTomes = [];
            var found = false;
            for (var i = 0; i < ctx.state.loadedTomes.length; i++) {
                if (ctx.state.loadedTomes[i].path === filePath) {
                    ctx.state.loadedTomes[i].ts = Date.now();
                    ctx.state.loadedTomes[i].isCurrent = true;
                    found = true;
                } else {
                    ctx.state.loadedTomes[i].isCurrent = false;
                }
            }
            if (!found) {
                // If cacheBlob already ran for this tome, pull size/loadTime
                // from the blob cache so the details panel has real values.
                var cached = null;
                if (ctx.state.readerBlobCache && ctx.state.readerBlobCache[filePath]) {
                    cached = ctx.state.readerBlobCache[filePath];
                }
                ctx.state.loadedTomes.push({
                    path: filePath,
                    size: cached ? (cached.size || 0) : 0,
                    ts: Date.now(),
                    loadTime: cached ? (cached.loadTime || 0) : 0,
                    isCurrent: true
                });
            }
        }

        // If the global toolbar details panel is currently open, refresh its
        // content so the user sees the freshly loaded tome immediately.
        var toolbar = document.getElementById(globalToolbarId);
        if (toolbar && toolbar.classList.contains('renamer-dev-details-open')) {
            var tomeDetails = toolbar.querySelector('.renamer-dev-tome-details');
            if (tomeDetails) {
                buildTomeDetails(ctx, filePath, tomeDetails);
            }
        }
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

     // ---- Global dev toolbar (visible on all pages when verbose=client) -----
     var globalToolbarId = 'renamer-dev-global-toolbar';
     var globalToolbarActive = false;

      function removeGlobalDevToolbar() {
          var existing = document.querySelectorAll('#' + globalToolbarId);
          existing.forEach(function(el) { el.remove(); });
          globalToolbarActive = false;
      }

      // Ensures the global toolbar (with expanded details) stays fully visible
      // in the viewport. If the details panel would extend beyond the top or
      // bottom edge, the toolbar is repositioned with a CSS transition.
       function ensureToolbarVisible(toolbar) {
            var rect = toolbar.getBoundingClientRect();
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var newTop = rect.top;
            var newLeft = rect.left;
            var changed = false;

            if (rect.top < 8) {
                newTop = 8;
                changed = true;
            }

            if (rect.bottom > vh - 8) {
                newTop = Math.max(8, newTop - (rect.bottom - (vh - 8)));
                changed = true;
            }

            // Keep the toolbar from overflowing horizontally when its width
            // grows (120px closed -> 310px open), whether it was anchored to the
            // right edge or dragged close to a viewport edge.
            if (rect.left < 8) {
                newLeft = 8;
                changed = true;
            }

            if (rect.right > vw - 8) {
                newLeft = Math.max(8, newLeft - (rect.right - (vw - 8)));
                changed = true;
            }

            if (changed) {
                toolbar.style.top = newTop + 'px';
                toolbar.style.bottom = 'auto';
                toolbar.style.left = newLeft + 'px';
                toolbar.style.right = 'auto';
            }
        }

      function createGlobalDevToolbar(ctx) {
         if (!isDevMode()) return;
         removeGlobalDevToolbar();
         ensureStyles();

         var toolbar = document.createElement('div');
         toolbar.id = globalToolbarId;
         toolbar.className = 'renamer-dev-toolbar';
         toolbar.setAttribute('data-dev-toolbar', 'global');

          var row = document.createElement('div');
          row.className = 'renamer-dev-toolbar-row';
          toolbar.appendChild(row);

          var handle = document.createElement('span');
          handle.className = 'renamer-dev-handle';
          handle.innerHTML = window.RenamerIcons.DRAG;
          handle.title = 'Glisser pour déplacer la barre d\'outils';
          row.appendChild(handle);

          var infoBtn = document.createElement('button');
          infoBtn.type = 'button';
          infoBtn.className = 'renamer-dev-info-btn';
          infoBtn.innerHTML = window.RenamerIcons.CHEVRON_DOWN;
          infoBtn.title = 'Informations sur les tomes chargés';
          infoBtn.setAttribute('aria-label', 'Informations sur les tomes chargés');
          row.appendChild(infoBtn);

           var closeBtn = document.createElement('button');
           closeBtn.type = 'button';
           closeBtn.className = 'renamer-dev-close';
           closeBtn.innerHTML = '×';
           closeBtn.title = 'Fermer la barre d' + 'outils';
           closeBtn.setAttribute('aria-label', 'Fermer la barre d' + 'outils');
           row.appendChild(closeBtn);

           var details = document.createElement('div');
           details.className = 'renamer-dev-details';
           toolbar.appendChild(details);

           var btnJS = makeBtn('Refresh JS', 'Recharger les scripts JS de la page', 'dev-js');
           var btnData = makeBtn('Refresh Data', 'Recharger les données depuis le serveur', 'dev-data');
           details.appendChild(btnJS);
           details.appendChild(btnData);

           var tomeDetails = document.createElement('div');
           tomeDetails.className = 'renamer-dev-tome-details';
           details.appendChild(tomeDetails);

          closeBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              e.preventDefault();
              removeGlobalDevToolbar();
          });

           var detailsOpen = false;
           var savedPos = null;
           infoBtn.addEventListener('click', function(e) {
               e.stopPropagation();
               e.preventDefault();
               // Always rebuild so the panel reflects the latest loaded tomes
                buildTomeDetails(activeReader.ctx, activeReader.filePath, toolbar.querySelector('.renamer-dev-tome-details'));
               detailsOpen = !detailsOpen;
                infoBtn.classList.toggle('active', detailsOpen);
                infoBtn.classList.toggle('open', detailsOpen);
                toolbar.classList.toggle('renamer-dev-details-open', detailsOpen);

                if (detailsOpen) {
                    savedPos = {
                        top: toolbar.style.top,
                        bottom: toolbar.style.bottom,
                        left: toolbar.style.left,
                        right: toolbar.style.right
                    };
                    // Wait for the details CSS transition (250ms) to complete,
                    // then nudge the toolbar into view if needed.
                    setTimeout(function() { ensureToolbarVisible(toolbar); }, 300);
                } else if (savedPos) {
                    toolbar.style.top = savedPos.top;
                    toolbar.style.bottom = savedPos.bottom;
                    toolbar.style.left = savedPos.left;
                    toolbar.style.right = savedPos.right;
                    savedPos = null;
                }
           });

          document.body.appendChild(toolbar);
         globalToolbarActive = true;

          function setBusy(busy) {
              btnJS.disabled = busy;
              btnData.disabled = busy;
          }

         btnJS.addEventListener('click', function(e) {
             e.stopPropagation();
             e.preventDefault();
             setBusy(true);
             // Hard-reload the page scripts by reloading the whole page with cache-bust
             window.location.reload();
         });

         btnData.addEventListener('click', function(e) {
             e.stopPropagation();
             e.preventDefault();
             setBusy(true);
             if (ctx && typeof ctx.refreshData === 'function') {
                 ctx.refreshData().then(function() { setBusy(false); }).catch(function() { setBusy(false); });
             } else {
                 window.location.reload();
             }
         });

         // ---- Drag-to-move (same as reader toolbar) -------------------------
          var dragState = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };

          function onMouseMove(e) {
              if (!dragState.active) return;
              var dx = e.clientX - dragState.startX;
              var dy = e.clientY - dragState.startY;
              var newLeft = dragState.startLeft + dx;
              var newTop = dragState.startTop + dy;
              var maxLeft = window.innerWidth - toolbar.offsetWidth - 4;
              var maxTop = window.innerHeight - toolbar.offsetHeight - 4;
              newLeft = Math.max(4, Math.min(newLeft, maxLeft));
              newTop = Math.max(4, Math.min(newTop, maxTop));
              toolbar.style.left = newLeft + 'px';
              toolbar.style.top = newTop + 'px';
              toolbar.style.right = 'auto';
              toolbar.style.bottom = 'auto';
          }

         function stopDrag() {
             if (!dragState.active) return;
             dragState.active = false;
             toolbar.classList.remove('dragging');
             document.removeEventListener('mousemove', onMouseMove);
             document.removeEventListener('mouseup', stopDrag);
             document.removeEventListener('touchmove', onTouchMove, { passive: false });
             document.removeEventListener('touchend', stopDrag);
         }

         function onTouchMove(e) {
             if (!dragState.active) return;
             e.preventDefault();
             var touch = e.touches[0];
             onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
         }

         function startDrag(e) {
             if (e.button !== undefined && e.button !== 0) return;
             e.preventDefault();
             e.stopPropagation();
             var startEvent = e.touches ? e.touches[0] : e;
             dragState.startX = startEvent.clientX;
             dragState.startY = startEvent.clientY;
             var rect = toolbar.getBoundingClientRect();
             dragState.startLeft = rect.left;
             dragState.startTop = rect.top;
             dragState.active = true;
             toolbar.classList.add('dragging');
             document.addEventListener('mousemove', onMouseMove);
             document.addEventListener('mouseup', stopDrag);
             if (e.type.indexOf('touch') !== -1) {
                 document.addEventListener('touchmove', onTouchMove, { passive: false });
                 document.addEventListener('touchend', stopDrag);
             }
         }

         handle.addEventListener('mousedown', startDrag);
         handle.addEventListener('touchstart', startDrag, { passive: false });

         return toolbar;
     }

    // Records the actual load time for a tome (used when the blob was loaded
    // internally by the source, e.g. PDF via page API, so cacheBlob was never
    // called with a valid start time). Only sets it if the current value is 0.
    function recordLoadTime(ctx, filePath, loadTime) {
        if (!ctx || !ctx.state) return;
        if (!Array.isArray(ctx.state.loadedTomes)) ctx.state.loadedTomes = [];
        for (var i = 0; i < ctx.state.loadedTomes.length; i++) {
            if (ctx.state.loadedTomes[i].path === filePath) {
                if (!ctx.state.loadedTomes[i].loadTime || ctx.state.loadedTomes[i].loadTime === 0) {
                    ctx.state.loadedTomes[i].loadTime = loadTime;
                }
                return;
            }
        }
    }

     window.RenamerDevRefresh = {
         isDevMode: isDevMode,
         cacheBlob: cacheBlob,
         getCachedBlob: getCachedBlob,
         invalidateCachedBlob: invalidateCachedBlob,
         setActiveReader: setActiveReader,
         createGlobalDevToolbar: createGlobalDevToolbar,
         removeGlobalDevToolbar: removeGlobalDevToolbar,
         reloadAppScripts: reloadAppScripts,
         refreshJS: doRefreshJS,
        refreshData: doRefreshData,
        isReloadableScript: isReloadableScript,
        _active: activeReader,
        recordLoadTime: recordLoadTime
    };
})();
