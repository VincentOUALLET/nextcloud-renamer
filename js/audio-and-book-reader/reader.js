(function (L) {
    'use strict';

    var state = L.state;
    var buildCtx = L.buildCtx;
    var updateUrl = L.updateUrl;
    var t = L.t;
    var apiRequest = L.apiRequest;
    var getBaseUrl = L.getBaseUrl;
    var dbg = L.dbg;
    var getWebdavUrl = L.getWebdavUrl;
    var getDavHeaders = L.getDavHeaders;
    var showToast = L.showToast;
    var showLoader = L.showLoader;
    var hideLoader = L.hideLoader;
    var escapeHtml = L.escapeHtml;
    var formatSize = L.formatSize;
    var fileIcon = L.fileIcon;
    var parseFilename = L.parseFilename;
    var parseScanEntry = L.parseScanEntry;
    var sequelBaseOf = L.sequelBaseOf;
    var jaccardTokens = L.jaccardTokens;
    var buildReaderSeriesTree = L.buildReaderSeriesTree;
    var sortFiles = L.sortFiles;
    var fileExt = L.fileExt;
    var makeFileEntry = L.makeFileEntry;
    var coverUrl = L.coverUrl;
    var coverOfFirstTome = L.coverOfFirstTome;
    var loadCoversBulk = L.loadCoversBulk;
    var renderTomeIcon = L.renderTomeIcon;
    var renderNoCoverPlaceholder = L.renderNoCoverPlaceholder;
    var findMissingTomes = L.findMissingTomes;
    var countTomes = L.countTomes;
    var tomeLabelFor = L.tomeLabelFor;
    var isTomeInProgress = L.isTomeInProgress;
    var renderTomeStatusIcon = L.renderTomeStatusIcon;
    var bookmarkLabel = L.bookmarkLabel;
    var flattenFilesAndSubCollections = L.flattenFilesAndSubCollections;
    var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;
    var MARK_READ_SVG = L.MARK_READ_SVG;
    var MARK_UNREAD_SVG = L.MARK_UNREAD_SVG;
    var NAVIGATE_SVG = L.NAVIGATE_SVG;
    var COVER_SVG = L.COVER_SVG;

    function renderReading(tome) {
        state.view = 'reading';
        var key = tome.path;
        state.currentTome = { path: key, name: tome.name, tome: tome.tome };
        if (state.currentCollection && state.currentCollection.userId) {
            state.ownerUid = state.currentCollection.userId;
        } else if (state.currentLibrary && state.currentLibrary.userId) {
            state.ownerUid = state.currentLibrary.userId;
        } else {
            state.ownerUid = null;
        }
        var isEpubLike = /\.(epub|azw|azw3|mobi|prc)$/i.test(String(key));
            if (!isEpubLike && state.domCache[key]) {
            closeModalOverlay();
            var cached = state.domCache[key];
            cached.classList.add('lib-reader-modal-shown');
            document.body.appendChild(cached);
            state.readerModal = cached;
            return;
        }

        var existing = document.getElementById('lib-reader-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'lib-reader-overlay';
        overlay.className = 'lib-reader-overlay';

        var wrapper = document.createElement('div');
        wrapper.className = 'lib-reading-wrapper';
        overlay.appendChild(wrapper);

        var readerBox = document.createElement('div');
        readerBox.className = 'lib-reading-box';
        wrapper.appendChild(readerBox);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeReaderModal();
        });

        var activeKeyHandler = null;
        activeKeyHandler = function(e) {
            if (!document.getElementById('lib-reader-overlay')) {
                document.removeEventListener('keydown', activeKeyHandler);
                return;
            }
            if (e.key === 'Escape') {
                closeReaderModal();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                var el = document.getElementById('lib-reader-overlay');
                if (el) {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (typeof el.requestFullscreen === 'function') {
                        el.requestFullscreen().catch(function() {});
                    }
                }
            }
        };
        document.addEventListener('keydown', activeKeyHandler);

        state.readerModal = overlay;

        if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderReader === 'function') {
            var ctx = buildCtx();
            window.RenamerReader.renderReader(ctx, tome.path, readerBox).catch(function (e) {
                showToast(t('readError') + (e && e.message ? (': ' + e.message) : ''), 'error');
            });
        } else {
            readerBox.innerHTML = '<div class="lib-reading-unsupported">' + t('unsupported') + '</div>';
        }

        document.body.appendChild(overlay);
        if (!isEpubLike) { state.domCache[key] = overlay; }
        state.readerModal = overlay;
    }

    function renderReadingImages(node, collection) {
        var key = node.folder;
        state.view = 'reading';
        state.readerImageTomeWasRoot = (state.readerTreePath || []).length === 0;
        state.readerImageTome = {
            folder: node.folder,
            name: node.name,
            files: node.files || [],
            exitTreePath: (state.readerTreePath || []).slice(0, -1)
        };
        state.currentTome = { path: key, name: node.name, tome: 0 };
        if (state.currentCollection && state.currentCollection.userId) {
            state.ownerUid = state.currentCollection.userId;
        } else if (state.currentLibrary && state.currentLibrary.userId) {
            state.ownerUid = state.currentLibrary.userId;
        } else {
            state.ownerUid = null;
        }
        var treePathStr = state.readerTreePath.length ? state.readerTreePath.join('.') : null;
        updateUrl({
            view: 'reading',
            library: state.currentLibrary ? String(state.currentLibrary.id) : null,
            collection: state.currentCollection ? String(state.currentCollection.id) : null,
            node: treePathStr,
            read: node.folder
        });

        if (state.domCache[key]) {
            closeModalOverlay();
            var cached = state.domCache[key];
            cached.classList.add('lib-reader-modal-shown');
            document.body.appendChild(cached);
            state.readerModal = cached;
            return;
        }

        var existing = document.getElementById('lib-reader-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'lib-reader-overlay';
        overlay.className = 'lib-reader-overlay';

        var wrapper = document.createElement('div');
        wrapper.className = 'lib-reading-wrapper';
        overlay.appendChild(wrapper);

        var readerBox = document.createElement('div');
        readerBox.className = 'lib-reading-box';
        wrapper.appendChild(readerBox);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeReaderModal();
        });

        var activeKeyHandler = null;
        activeKeyHandler = function(e) {
            if (!document.getElementById('lib-reader-overlay')) {
                document.removeEventListener('keydown', activeKeyHandler);
                return;
            }
            if (e.key === 'Escape') {
                closeReaderModal();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                var el = document.getElementById('lib-reader-overlay');
                if (el) {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (typeof el.requestFullscreen === 'function') {
                        el.requestFullscreen().catch(function() {});
                    }
                }
            }
        };
        document.addEventListener('keydown', activeKeyHandler);

        state.readerModal = overlay;

        if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderMultiImage === 'function') {
            var ctx = buildCtx();
            window.RenamerReader.renderMultiImage(ctx, node.folder, node.files, readerBox).catch(function (e) {
                showToast(t('readError') + (e && e.message ? (': ' + e.message) : ''), 'error');
            });
        } else {
            readerBox.innerHTML = '<div class="lib-reading-unsupported">' + t('unsupported') + '</div>';
        }

        document.body.appendChild(overlay);
        state.domCache[key] = overlay;
        state.readerModal = overlay;
    }

    function killReaderInactivityTimer(overlay) {
        if (!overlay) return;
        var readerBox = overlay.querySelector('.lib-reading-wrapper > div');
        if (readerBox && readerBox._readerUIInstance && typeof readerBox._readerUIInstance.killInactivityTimer === 'function') {
            try { readerBox._readerUIInstance.killInactivityTimer(); } catch (e) {}
        }
    }

    function closeReaderModal() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
            killReaderInactivityTimer(overlay);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                var ipad = window.RenamerIPadOS;
                if (ipad && ipad.isCSSFullscreen(overlay)) {
                    ipad.exitCSSFullscreen(overlay);
                }
            }
            overlay.remove();
        }
        state.readerModal = null;

        var wasImageTome = state.readerImageTome;
        var wasRoot = state.readerImageTomeWasRoot;
        if (wasImageTome) {
            state.readerImageTome = null;
            state.readerImageTomeWasRoot = false;
        }

        if (state.view === 'reading') {
            if (wasImageTome) {
                var exitPath = wasImageTome.exitTreePath || [];
                state.readerTreePath = exitPath;
                state.view = 'tomes';
                state.currentTome = null;
                L.renderSidebar();
                L.renderBreadcrumb();
                if (exitPath.length === 0 && !wasRoot) {
                    var params = { view: 'tomes' };
                    if (state.currentLibrary) params.library = String(state.currentLibrary.id);
                    if (state.currentCollection) params.collection = String(state.currentCollection.id);
                    params.node = null;
                    updateUrl(params);
                    if (state.currentCollection) {
                        L.render();
                    }
                } else if (wasRoot) {
                    state.view = 'collection';
                     updateUrl({ view: 'collection', library: state.currentLibrary ? String(state.currentLibrary.id) : null });
                    if (state.currentLibrary) {
                        L.render();
                    }
                } else {
                    var params2 = { view: 'tomes' };
                    if (state.currentLibrary) params2.library = String(state.currentLibrary.id);
                    if (state.currentCollection) params2.collection = String(state.currentCollection.id);
                    params2.node = exitPath.length ? exitPath.join('.') : null;
                    updateUrl(params2);
                    if (state.currentCollection) {
                        L.render();
                    }
                }
                return;
            }
            var params = { view: 'tomes' };
            if (state.currentLibrary) params.library = String(state.currentLibrary.id);
            if (state.currentCollection) params.collection = String(state.currentCollection.id);
            params.read = null;
            var nodePath = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
            params.node = nodePath;
            updateUrl(params);
            state.view = 'tomes';
            state.currentTome = null;
            L.renderSidebar();
            L.renderBreadcrumb();
        }
    }

    function closeModalOverlay() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
            killReaderInactivityTimer(overlay);
            var ipad = window.RenamerIPadOS;
            if (ipad && document.body.classList.contains('renamer-ipados-fullscreen')) {
                ipad.exitCSSFullscreen(null);
            }
            overlay.remove();
        }
        state.readerModal = null;
    }

    function resolveReader(opts, cb) {
        if (state.resolveAbort) { try { state.resolveAbort.abort(); } catch (e) {} }
        var ctrl = new AbortController();
        state.resolveAbort = ctrl;
        var epoch = ++state.navigationEpoch;

        var qs = [];
        if (opts.readPath) qs.push('read=' + encodeURIComponent(opts.readPath));
        if (opts.colId) qs.push('collection=' + encodeURIComponent(opts.colId));
        if (opts.libId) qs.push('library=' + encodeURIComponent(opts.libId));
        qs.push('width=' + (state.coverWidth || 300));

         dbg('resolveReader start', { url: '/api/reader/resolve?' + qs.join('&'), opts: opts });
         apiRequest(getBaseUrl() + '/api/reader/resolve?' + qs.join('&'), { signal: ctrl.signal }).then(function (data) {
            if (epoch !== state.navigationEpoch) return;
            if (!data || !data.success || !data.found) {
                // Résolution échouée (URL périmée ou collection introuvable) : on ne
                // laisse pas la page blanche — on replonge sur la liste des bibliothèques.
                state.view = 'libraries';
                L.loadLibraries(function () {
                    L.render();
                    if (typeof cb === 'function') cb();
                });
                return;
            }

            if (Array.isArray(data.libraries) && data.libraries.length) {
                state.libraries = data.libraries;
            }
            state.currentLibrary = data.library || null;

             state.bookmarks = {};
             if (data.progress && typeof data.progress === 'object') {
                 Object.keys(data.progress).forEach(function (k) { state.bookmarks['/' + k] = data.progress[k]; });
                 state.progressLoaded = true;
             }

            state.covers = state.covers || {};
            if (data.covers && typeof data.covers === 'object') {
                Object.keys(data.covers).forEach(function (k) { state.covers[k] = data.covers[k]; });
            }
            if (Object.keys(state.covers).length) {
                state.coversLoaded = true;
            }

             if (data.collection) {
                 var col = data.collection;
                 col.rules = col.rules || {};
                 L.enrichFileEntries(col.rules);
                 state.currentCollection = col;
                 state.collections = [col];
             } else {
                 state.currentCollection = null;
                 state.collections = [];
             }

              var librariesReady = Array.isArray(data.libraries) && data.libraries.length && (!opts.viewParam || opts.viewParam === 'home' || opts.viewParam === 'libraries' || opts.viewParam === 'favorites');
              if (librariesReady) {
                  state.libraries = data.libraries;
                  if (data.favorites) {
                      state.allFavorites = data.favorites;
                  }
              }

              // Always process collectionsByLib — needed for sidebar chevrons in ALL views (including deep-links).
              if (data.collectionsByLib) {
                  state.collectionsByLib = {};
                  state.allCollections = {};
                  Object.keys(data.collectionsByLib).forEach(function (lid) {
                      var cols = data.collectionsByLib[lid] || [];
                      cols.forEach(function (c) { if (c && c.rules) L.enrichFileEntries(c.rules); });
                      state.collectionsByLib[lid] = cols;
                      state.allCollections[lid] = cols;
                  });
              }

             if (typeof cb === 'function') cb();
            dbg('resolveReader ok', { found: data && data.found, library: !!(data && data.library), collection: !!(data && data.collection), covers: data && data.covers ? Object.keys(data.covers).length : 0, progress: data && data.progress ? Object.keys(data.progress).length : 0, libraries: data && data.libraries ? data.libraries.length : 0 });
        }).catch(function (err) {
            dbg('resolveReader error', { msg: err && err.message, name: err && err.name });
            if (epoch !== state.navigationEpoch) return;
            if (err && err.name === 'AbortError') return;
            showToast(t('loadError') + (err && err.message ? (': ' + err.message) : ''), 'error');
            state.view = 'libraries';
            L.render();
        });
    }

    function renderDeepLink(readPath, colId) {
        var col = state.currentCollection;
        dbg('renderDeepLink', { readPath: readPath, colId: colId, colFound: !!col, view: state.view });
        if (!col) {
            state.view = 'libraries';
            L.render();
            return;
        }
        L.renderSidebar();
        if (readPath) {
            var found = findTomeByPath(readPath);
            if (found) {
                state.view = 'tomes';
                L.renderTomes(col);
                L.renderBreadcrumb();
                state.currentTome = found;
                renderReading(found);
                L.renderBreadcrumb();
                return;
            }
            var imgNode = findImageTomeNodeByFolder(readPath);
            if (imgNode) {
                renderReadingImages(imgNode, col);
                L.renderBreadcrumb();
                return;
            }
            state.view = 'tomes';
            L.renderTomes(col);
            L.renderBreadcrumb();
            return;
        }
        state.view = 'tomes';
        L.renderTomes(col);
        L.renderBreadcrumb();
    }

    function findTomeByPath(readPath) {
        for (var i = 0; i < (state.collections || []).length; i++) {
            var col = state.collections[i];
            var root = col.rules || {};
            var allFiles = L.collectAllFiles(root);
            for (var j = 0; j < allFiles.length; j++) {
                if (decodeURIComponent(allFiles[j].path) === readPath || allFiles[j].path === readPath) {
                    return allFiles[j];
                }
            }
        }
        return null;
    }

    function findImageTomeNodeByFolder(folderPath) {
        if (!folderPath) return null;
        var normPath = String(folderPath).replace(/^\/+|\/+$/g, '');
        var result = null;
        function searchNode(node) {
            if (!node || result) return;
            var nodeFolder = String(node.folder || '').replace(/^\/+|\/+$/g, '');
            if (nodeFolder === normPath && node.isImageTome) {
                result = node;
                return;
            }
            if (node.children && node.children.length) {
                for (var i = 0; i < node.children.length; i++) {
                    searchNode(node.children[i]);
                    if (result) return;
                }
            }
        }
        var cols = state.allCollections || {};
        for (var libId in cols) {
            var colList = cols[libId] || [];
            for (var i = 0; i < colList.length; i++) {
                var root = L.getCollectionRoot(colList[i]);
                searchNode(root);
                if (result) return result;
            }
        }
        for (var j = 0; j < (state.collections || []).length; j++) {
            var root2 = L.getCollectionRoot(state.collections[j]);
            searchNode(root2);
            if (result) return result;
        }
        return null;
    }

    function findImageTomeInCollection(collection, folderPath) {
        if (!collection || !collection.rules) return null;
        var normPath = String(folderPath).replace(/^\/+|\/+$/g, '');
        var result = null;
        var root = L.getCollectionRoot(collection);
        function searchNode(node) {
            if (!node || result) return;
            var nodeFolder = String(node.folder || '').replace(/^\/+|\/+$/g, '');
            if (nodeFolder === normPath && node.isImageTome) {
                result = node;
                return;
            }
            if (node.children && node.children.length) {
                for (var i = 0; i < node.children.length; i++) {
                    searchNode(node.children[i]);
                    if (result) return;
                }
            }
        }
        searchNode(root);
        return result;
    }

    function loadBookmarksForCollection(lib, col, cb) {
        var root = col.rules || {};
        var files = L.collectAllFiles(root);
        var paths = files.map(function(f) { return f.path; });
        loadBookmarksForPaths(paths, cb);
    }

    function loadBookmarksForTome(lib, col, cb) {
        var root = col.rules || {};
        var files = L.collectAllFiles(root);
        var paths = files.map(function(f) { return f.path; });
        loadBookmarksForPaths(paths, cb);
    }

    function loadAllCollections(cb) {
        var libs = state.libraries || [];
        dbg('loadAllCollections start', { libraries: libs.length });
        if (!libs.length) {
            state.allCollections = {};
            state.collectionsByLib = {};
            if (typeof cb === 'function') cb();
            return;
        }
        var pending = libs.length;
        libs.forEach(function (lib) {
            apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + lib.id).then(function (data) {
                var cols = (data && data.success && data.collections) ? data.collections : [];
                cols.forEach(function (c) { if (c && c.rules) L.enrichFileEntries(c.rules); });
                state.allCollections[lib.id] = cols;
                state.collectionsByLib[lib.id] = cols;
                pending--;
                if (pending === 0) {
                    dbg('loadAllCollections done', { libs: libs.length });
                    if (typeof cb === 'function') cb();
                }
            }).catch(function () {
                state.allCollections[lib.id] = [];
                state.collectionsByLib[lib.id] = [];
                pending--;
                if (pending === 0) {
                    dbg('loadAllCollections done', { libs: libs.length });
                    if (typeof cb === 'function') cb();
                }
            });
        });
    }

    function loadReaderFavoritesList(cb) {
        dbg('loadReaderFavoritesList start');
        apiRequest(getBaseUrl() + '/api/reader/favorites/list').then(function (data) {
            dbg('loadReaderFavoritesList done', { count: (data && Array.isArray(data.favorites) ? data.favorites.length : 0) });
            if (data && data.success && Array.isArray(data.favorites)) {
                state.allFavorites = data.favorites;
            } else {
                state.allFavorites = [];
            }
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.allFavorites = [];
            if (typeof cb === 'function') cb();
        });
    }

    function findLibraryCollectionForPath(path) {
        var normPath = String(path || '').replace(/^\/+|\/+$/g, '');
        var libs = state.libraries || [];
        for (var i = 0; i < libs.length; i++) {
            var lib = libs[i];
            var cols = state.allCollections[lib.id] || [];
            for (var j = 0; j < cols.length; j++) {
                var col = cols[j];
                var allFiles = L.collectAllFiles(col.rules || {});
                for (var k = 0; k < allFiles.length; k++) {
                    var fp = String(allFiles[k].path || '').replace(/^\/+|\/+$/g, '');
                    if (decodeURIComponent(fp) === normPath || fp === normPath) {
                        return { lib: lib, col: col, file: allFiles[k] };
                    }
                }
            }
        }
        return null;
    }

    function renderFavoritesView() {
        dbg('renderFavoritesView', { view: state.view, preloaded: Array.isArray(state.allFavorites) && state.allFavorites.length, loaded: !!state.progressLoaded });
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '<div class="lib-empty lib-favorites-loading" data-translation="favoritesHint">' + (t('favoritesHint') || 'Loading favorites…') + '</div>';

        var renderBody = function () {
            if (!document.getElementById('lib-content')) return;
            container.innerHTML = '';
            var wrap = document.createElement('div');
            var favorites = state.allFavorites || [];
            if (!Array.isArray(favorites)) favorites = [];
            if (!favorites.length) {
                wrap.innerHTML = '<div class="lib-empty" data-translation="noFavorites">' + (t('noFavorites') || 'Aucun favori') + '</div>';
                container.appendChild(wrap);
                return;
            }
            var grouped = {};
            favorites.forEach(function (fav) {
                var favPages = (fav && Array.isArray(fav.pages)) ? fav.pages : [];
                if (!favPages.length) return;
                var ctx = findLibraryCollectionForPath(fav.path);
                if (!ctx) return;
                var libKey = String(ctx.lib.id);
                if (!grouped[libKey]) grouped[libKey] = { lib: ctx.lib, items: [] };
                grouped[libKey].items.push({ ctx: ctx, pages: favPages });
            });
            var hasAny = false;
            Object.keys(grouped).forEach(function (libKey) {
                var g = grouped[libKey];
                hasAny = true;
                var libHeader = document.createElement('div');
                libHeader.className = 'lib-section-sub-title';
                libHeader.textContent = g.lib.name || '';
                wrap.appendChild(libHeader);
                var colGroups = {};
                g.items.forEach(function (entry) {
                    var colKey = String(entry.ctx.col.id);
                    if (!colGroups[colKey]) colGroups[colKey] = { col: entry.ctx.col, items: [] };
                    colGroups[colKey].items.push(entry);
                });
                Object.keys(colGroups).forEach(function (colKey) {
                    var cg = colGroups[colKey];
                    var colHeader = document.createElement('div');
                    colHeader.className = 'lib-section-title lib-section-col-title';
                    colHeader.textContent = cg.col.name || t('collection');
                    wrap.appendChild(colHeader);
                    var cardsCtn = document.createElement('div');
                    cardsCtn.className = 'lib-cards-ctn';
                    cg.items.forEach(function (entry) {
                        cardsCtn.appendChild(renderFavoriteCard(entry.ctx, entry.pages));
                    });
                    wrap.appendChild(cardsCtn);
                });
            });
            if (!hasAny) {
                wrap.innerHTML = '<div class="lib-empty" data-translation="noFavorites">' + (t('noFavorites') || 'Aucun favori') + '</div>';
            }
            container.appendChild(wrap);
        };

        if (Array.isArray(state.allFavorites)) {
            renderBody();
            return;
        }
        // Fallback: favorites not yet loaded (e.g. sidebar navigation without a deep-link resolve)
        loadAllCollections(function () {
            loadReaderFavoritesList(function () { renderBody(); });
        });
    }

    function renderFavoriteCard(ctx, pages) {
        var f = ctx.file;
        pages = pages || [];
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var coverImg = renderTomeIcon(f);
        if (!coverUrl(f.path)) card.classList.add('noPreview');
        var tomeLabel = tomeLabelFor(f);
        var titleLine = tomeLabel || (f.name ? f.name.replace(/\.[^.]+$/, '') : '');
        var favCount = pages.length;
        var badgeHtml = '<span class="lib-fav-count-badge">' + favCount + '</span>';
        var pagesLabel = f.pages ? (f.pages + ' ' + t('pages')) : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + badgeHtml + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            (pagesLabel ? '<div class="lib-card-sub">' + escapeHtml(pagesLabel) + '</div>' : '');
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-tome-actions-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = ctx.lib;
            state.currentCollection = ctx.col;
            state.currentTome = { path: f.path, name: f.name, tome: f.tome };
            state.readerFavoritesOnly = true;
                updateUrl({ view: 'reading', read: f.path, favOnly: true });
            renderReading(f);
            L.renderSidebar();
            L.renderBreadcrumb();
        });
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            var items = [];
            items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, action: function () { L.navigateToCollection(ctx.col, ctx.lib); } });
            items.push({ type: 'separator' });
            items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { L.markTomeRead(f, ctx.col); } });
             items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markTomeUnread(f, ctx.col); } });
             if (state.isAdmin) {
                 items.push({ type: 'separator' });
                 items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.pickCoverForTome(f); } });
             }
             if (!items.length) return;
            L.showContextMenu(e, items, f);
        });
        L.attachLongPress(card);
        return card;
    }

function killReaderInactivityTimer(overlay) {

        if (!overlay) return;

        var readerBox = overlay.querySelector('.lib-reading-wrapper > div');

        if (readerBox && readerBox._readerUIInstance && typeof readerBox._readerUIInstance.killInactivityTimer === 'function') {

            try { readerBox._readerUIInstance.killInactivityTimer(); } catch (e) {}

        }

    }

    L.renderReading = renderReading;
    L.renderReadingImages = renderReadingImages;
    L.killReaderInactivityTimer = killReaderInactivityTimer;
    L.closeReaderModal = closeReaderModal;
    L.closeModalOverlay = closeModalOverlay;
    L.resolveReader = resolveReader;
    L.renderDeepLink = renderDeepLink;
    L.findTomeByPath = findTomeByPath;
    L.findImageTomeNodeByFolder = findImageTomeNodeByFolder;
    L.findImageTomeInCollection = findImageTomeInCollection;
    L.loadBookmarksForCollection = loadBookmarksForCollection;
    L.loadBookmarksForTome = loadBookmarksForTome;
    L.loadAllCollections = loadAllCollections;
    L.loadReaderFavoritesList = loadReaderFavoritesList;
    L.findLibraryCollectionForPath = findLibraryCollectionForPath;
    L.renderFavoritesView = renderFavoritesView;
    L.renderFavoriteCard = renderFavoriteCard;


function buildReaderSequels() {

            var folders = [];

            Object.keys(folderSet).forEach(function (folderRel) {

                if (folderRel === '') return;

                folders.push({ abs: folderAbs(folderRel), name: folderName(folderRel) });

            });

            var parsed = folders.map(function (f) {

                var sb = sequelBaseOf(f.name);

                return { abs: f.abs, base: sb.base, suffix: sb.suffix, hasSuffix: sb.hasSuffix };

            });

            var links = {};

            parsed.forEach(function (a) {

                if (a.hasSuffix) return;

                var candidates = parsed.filter(function (b) {

                    if (b.abs === a.abs || !b.hasSuffix) return false;

                    if (b.base === a.base) return true;

                    return jaccardTokens(a.base, b.base) >= SEQUEL_THRESHOLD;

                });

                if (candidates.length) {

                    candidates.sort(function (x, y) { return x.suffix - y.suffix; });

                    links[a.abs] = candidates[0].abs;

                }

            });

            return links;

        }

function loadBookmarks() {

          var paths = [];

         if (state.collections) {

             state.collections.forEach(function (c) {

                 var files = L.collectAllFiles(c.rules || {});

                 files.forEach(function (f) { paths.push(f.path); });

             });

         }

        if (!paths.length) { L.renderLibrariesContent(); return; }

        apiRequest(getBaseUrl() + '/api/reader/progress/read', {

            method: 'POST',

            body: JSON.stringify({ paths: paths })

        }).then(function (data) {

            if (data && data.success && data.progress) {

                state.bookmarks = {};

                Object.keys(data.progress).forEach(function(k) {

                    state.bookmarks['/' + k] = data.progress[k];

                });

            } else {

                state.bookmarks = {};

            }

            L.renderLibrariesContent();

        }).catch(function () {

            state.bookmarks = {};

            L.renderLibrariesContent();

        });

    }

function loadBookmarksForPaths(paths, cb) {

        if (!paths.length) { if (typeof cb === 'function') cb(); return; }

        apiRequest(getBaseUrl() + '/api/reader/progress/read', {

            method: 'POST',

            body: JSON.stringify({ paths: paths })

        }).then(function (data) {

            if (data && data.success && data.progress) {

                state.bookmarks = {};

                Object.keys(data.progress).forEach(function(k) {

                    state.bookmarks['/' + k] = data.progress[k];

                });

            } else {

                state.bookmarks = {};

            }

            if (typeof cb === 'function') cb();

        }).catch(function () {

            state.bookmarks = {};

            if (typeof cb === 'function') cb();

        });

    }

    L.buildReaderSequels = buildReaderSequels;
    L.loadBookmarks = loadBookmarks;
    L.loadBookmarksForPaths = loadBookmarksForPaths;

})(window.RenamerLibrary);