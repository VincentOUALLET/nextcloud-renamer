(function (L) {
    'use strict';

    var state = L.state;
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
    var FAV_STAR_SVG = L.FAV_STAR_SVG;
    var HOME_SVG = L.HOME_SVG;
    var FOLDER_SVG = L.FOLDER_SVG;
    var INFO_SVG = L.INFO_SVG;
    var EXPAND_SVG = L.EXPAND_SVG;
    var COLLAPSE_SVG = L.COLLAPSE_SVG;
    var CHEVRON_DOWN_SVG = L.CHEVRON_DOWN_SVG;
    var BOOK_SVG = L.BOOK_SVG;
    var PAGE_ROOT = L.PAGE_ROOT;

    function getViewKey() {
        var v = state.view || 'libraries';
        var parts = [v];
        if (state.currentLibrary) parts.push('lib:' + state.currentLibrary.id);
        if (state.currentCollection) parts.push('col:' + state.currentCollection.id);
        if (state.readerTreePath && state.readerTreePath.length) parts.push('tree:' + state.readerTreePath.join('.'));
        if (state.flatFilesMode) parts.push('flatFiles');
        if (state.flatCollectionMode) parts.push('flatCol');
        return parts.join('|');
    }

    function cacheCurrentView() {
        var container = document.getElementById('lib-content');
        var prevKey = state.renderedViewKey;
        if (!container || !prevKey || !container.firstChild) return;
        state.viewCache = state.viewCache || {};
        var nodes = [];
        while (container.firstChild) {
            nodes.push(container.removeChild(container.firstChild));
        }
        state.viewCache[prevKey] = nodes;
        console.debug('[Renamer] cacheCurrentView', { prevKey: prevKey, nodeCount: nodes.length });
    }

    function restoreCachedView(viewKey) {
        var container = document.getElementById('lib-content');
        if (!container) return false;
        var cached = state.viewCache && state.viewCache[viewKey];
        if (!cached || !cached.length) {
            console.debug('[Renamer] restoreCachedView FAILED', { viewKey: viewKey, hasContainer: !!container, cachedExists: !!(state.viewCache && state.viewCache[viewKey]), cachedLength: cached ? cached.length : 0 });
            return false;
        }
        container.innerHTML = '';
        cached.forEach(function (node) {
            container.appendChild(node);
        });
        state.renderedViewKey = viewKey;
        console.debug('[Renamer] restoreCachedView OK', { viewKey: viewKey, nodeCount: cached.length });
        return true;
    }

    function invalidateViewCache(exceptKey) {
        state.viewCache = state.viewCache || {};
        if (exceptKey) {
            var newCache = {};
            if (state.viewCache[exceptKey]) newCache[exceptKey] = state.viewCache[exceptKey];
            state.viewCache = newCache;
        } else {
            state.viewCache = {};
        }
        state.viewCacheEpoch = (state.viewCacheEpoch || 0) + 1;
    }

    L.getViewKey = getViewKey;
    L.cacheCurrentView = cacheCurrentView;
    L.restoreCachedView = restoreCachedView;
    L.invalidateViewCache = invalidateViewCache;

    function render() {
        console.debug('[Renamer] render() start', { view: state.view, currentLib: state.currentLibrary && state.currentLibrary.id, _rendering: state._rendering, coversLoaded: state.coversLoaded, progressLoaded: state.progressLoaded, collectionsByLibKeys: Object.keys(state.collectionsByLib || {}) });
        if (state._rendering) {
            console.debug('[Renamer] render() skipped - already rendering');
            return;
        }
        state._rendering = true;
        dbg('render', { view: state.view, currentLibrary: state.currentLibrary && state.currentLibrary.id, currentCollection: state.currentCollection && state.currentCollection.id });
        var container = document.getElementById('lib-content');
        if (!container) {
            state._rendering = false;
            return;
        }

        if (state.view !== 'reading') {
            L.closeReaderModal();
        }

        if (state.view === 'reading' && state.currentTome) {
            state._rendering = false;
            return;
        }

        var viewKey = getViewKey();
        console.debug('[Renamer] render() viewKey', { viewKey: viewKey, prevRenderedViewKey: state.renderedViewKey, sameView: state.renderedViewKey === viewKey, hasCache: !!(state.viewCache && state.viewCache[viewKey]), coversLoaded: state.coversLoaded });

        if (state.renderedViewKey !== viewKey) {
            cacheCurrentView();
        }

        if (state.coversLoaded && state.viewCache && state.viewCache[viewKey]) {
            console.debug('[Renamer] render() cache HIT, restoring', { viewKey: viewKey });
            if (restoreCachedView(viewKey)) {
                L.renderBreadcrumb();
                state._rendering = false;
                console.debug('[Renamer] render() cache restored, returning early');
                return;
            }
        }

        console.debug('[Renamer] render() cache MISS, rendering fresh', { viewKey: viewKey });
        state.renderedViewKey = viewKey;
        container.innerHTML = '';

        if (state.view === 'home' || state.view === 'libraries') {
            L.renderLibrariesContent();
        } else if (state.view === 'favorites') {
            L.renderFavoritesView();
        } else if (state.view === 'flat-files' && state.currentLibrary) {
            L.renderFlatFiles(state.currentLibrary);
        } else if (state.view === 'collection' && state.currentLibrary) {
            L.renderCollections(state.currentLibrary);
        } else if (state.view === 'tomes' && state.currentCollection) {
            L.renderTomes(state.currentCollection);
        }
        L.renderBreadcrumb();
        state._rendering = false;
        console.debug('[Renamer] render() done', { viewKey: viewKey });
    }

function renderSidebar() {

          var menu = document.getElementById('lib-sidebar-menu');

          if (!menu) return;

          var libs = state.libraries || [];

          var html = '';

          var isLibsView = state.view === 'home' || state.view === 'libraries';

            html += '<div class="lib-sidebar-item' + (isLibsView ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label" data-translation="home">' + escapeHtml(t('home')) + '</span></div>';

            html += '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label" data-translation="myFavorites">' + escapeHtml(t('myFavorites')) + '</span></div>';

            libs.forEach(function (lib) {

                var libActive = (state.view === 'collection' || state.view === 'tomes' || state.view === 'reading') && state.currentLibrary && String(state.currentLibrary.id) === String(lib.id);

                var hasChildCols = state.collectionsByLib && state.collectionsByLib[lib.id] && state.collectionsByLib[lib.id].length > 0;

                var subOpen = libActive;

                var chevron = hasChildCols ? '<span class="lib-sidebar-chevron' + (subOpen ? ' expanded' : '') + '" data-library-id="' + escapeHtml(String(lib.id)) + '">' + CHEVRON_DOWN_SVG + '</span>' : '';

                html += '<div class="lib-sidebar-item' + (libActive ? ' active sub-open' : '') + '" data-view="library" data-library-id="' + escapeHtml(String(lib.id)) + '">' + chevron + '<span class="lib-sidebar-icon">' + BOOK_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(lib.name || '') + '</span></div>';

                if (hasChildCols) {

                    var cols = state.collectionsByLib && state.collectionsByLib[lib.id] ? state.collectionsByLib[lib.id] : (state.collections || []);

                    var subOpen = libActive;

                    html += '<div class="lib-sidebar-sub' + (subOpen ? ' expanded' : '') + '" data-library-id="' + escapeHtml(String(lib.id)) + '">';

                    cols.forEach(function (col) {

                        var colActive = (state.view === 'tomes' || state.view === 'reading') && state.currentCollection && String(state.currentCollection.id) === String(col.id);

                        html += '<div class="lib-sidebar-item' + (colActive ? ' active' : '') + '" data-view="collection" data-library-id="' + escapeHtml(String(lib.id)) + '" data-collection-id="' + escapeHtml(String(col.id)) + '"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(col.name || '') + '</span></div>';

                    });

                    html += '</div>';

                }

            });

            if (state.isAdmin) {

                html += '<div class="lib-sidebar-item active addLib" data-action="scan"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">+</span></div>';

            }

          menu.innerHTML = html;

          var subs = menu.querySelectorAll('.lib-sidebar-sub.expanded');

          subs.forEach(function(sub) {

              sub.style.height = 'auto';

              var h = sub.scrollHeight + 'px';

              sub.style.height = h;

              sub.style.overflow = '';

          });

      }

    function renderShell() {
        if (!PAGE_ROOT) { console.warn('[Renamer] renderShell: PAGE_ROOT is null', { state: state }); return; }
        PAGE_ROOT.innerHTML = '';
        PAGE_ROOT.className = 'lib-page-app' + (state.isFullscreen ? ' fullscreen' : '');

        var contentApp = document.querySelector('#content.app-renamer');
        if (contentApp && state.isFullscreen) contentApp.classList.add('fullscreen');

        var sidebar = document.createElement('div');
        sidebar.id = 'lib-sidebar';
        sidebar.className = 'lib-sidebar ' + (state.sidebarOpen ? '' : 'collapsed');
        var SETTINGS_GEAR_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_GEAR) || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
        sidebar.innerHTML =
             '<nav class="lib-sidebar-menu" id="lib-sidebar-menu">' +
                 '<div class="lib-sidebar-item' + ((state.view === 'home' || state.view === 'libraries') ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label" data-translation="home">' + escapeHtml(t('home')) + '</span></div>' +
                 '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label" data-translation="myFavorites">' + escapeHtml(t('myFavorites')) + '</span></div>' +
                (state.isAdmin ? '<div class="lib-sidebar-item active addLib" data-action="scan"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">+</span></div>' : '') +
             '</nav>' +
             '<button type="button" id="lib-settings-btn" class="lib-settings-btn" title="' + escapeHtml(t('settings')) + '" aria-label="' + escapeHtml(t('settings')) + '" data-translation="settings">' + SETTINGS_GEAR_SVG + '</button>';

         var main = document.createElement('div');
         main.className = 'lib-main';
          var header = document.createElement('div');
          header.className = 'lib-page-header';
            header.innerHTML =
                '<div class="lib-header-actions">' +
                    '<button type="button" id="lib-sidebar-toggle" class="lib-sidebar-toggle" title="' + escapeHtml(t('toggleSidebar')) + '" aria-label="' + escapeHtml(t('toggleSidebar')) + '" data-translation="toggleSidebar">☰</button>' +
                '</div>' +
                '<div id="lib-breadcrumb"></div>' +
                '<div class="lib-header-actions">' +
                    '<button type="button" id="lib-info-toggle" class="lib-info-toggle' + (state.showFileCounts ? ' active' : '') + '" title="' + escapeHtml(t('toggleFileInfo')) + '" aria-label="' + escapeHtml(t('toggleFileInfo')) + '" data-translation="toggleFileInfo">' + INFO_SVG + '</button>' +
                    '<button type="button" id="lib-fullscreen-toggle" class="lib-fullscreen-toggle" title="' + escapeHtml(state.isFullscreen ? t('reduce') : t('expand')) + '" aria-label="' + escapeHtml(state.isFullscreen ? t('reduce') : t('expand')) + '" data-translation="' + (state.isFullscreen ? 'reduce' : 'expand') + '">' + (state.isFullscreen ? EXPAND_SVG : COLLAPSE_SVG) + '</button>' +
                '</div>';
         var content = document.createElement('div');
        content.id = 'lib-content';
        content.className = 'lib-page-content';
        main.appendChild(header);
        main.appendChild(content);
        PAGE_ROOT.appendChild(sidebar);
        PAGE_ROOT.appendChild(main);
    }

    L.render = render;
    L.renderShell = renderShell;

    L.renderSidebar = renderSidebar;

})(window.RenamerLibrary);