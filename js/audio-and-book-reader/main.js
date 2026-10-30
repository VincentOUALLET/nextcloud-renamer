(function () {
    'use strict';

    window.RenamerLibrary = window.RenamerLibrary || { state: {} };
    var L = window.RenamerLibrary;

    L.state = {
        view: 'libraries',
        libraries: [],
        currentLibrary: null,
        currentCollection: null,
        bookmarks: {},
        domCache: {},
        readerModal: null,
        allCollections: {},
        allFavorites: null,
        isAdmin: false,
        showNavActions: false,
        readerBrowsingMode: false,
        readerTreePath: [],
        readerImageTome: null,
        readerImageTomeWasRoot: false,
        readerSeriesTree: null,
        readerSeriesLoaded: false,
        readerSequels: {},
        sidebarOpen: true,
        isFullscreen: true,
        readerFavoritesOnly: false,
        covers: {},
        coversLoaded: false,
        progressLoaded: false,
        progressLoading: false,
        _rendering: false,
        collectionsByLib: {},
        coverWidth: 300,
        navigationEpoch: 0,
        resolveAbort: null,
        customTranslations: null,
        settingsLangView: 'fr',
        flatFilesMode: false,
        flatCollectionMode: false,
        flatFilesFolderFilter: null,
        showFileCounts: false,
        displayNameOverrides: null,
        tableColumnVisibility: null,
        viewCache: {},
        renderedViewKey: null,
        viewCacheEpoch: 0,
        homeImage: null, // custom home page image path (user preference)
        libCovers: {}, // per-library custom cover paths (user preference: libCover_<id>)
        colCovers: {}, // per-collection custom cover paths (user preference: colCover_<id>)
    };

    L.MANAGED_URL_KEYS = ['view', 'library', 'collection', 'read', 'node', 'favOnly', 'viewType'];
      L.updateUrl = function updateUrl(params) {
          var preserved = {};
          try {
              var searchParams = new URLSearchParams(window.location.search);
              searchParams.forEach(function(val, key) {
                  if (L.MANAGED_URL_KEYS.indexOf(key) === -1) {
                      preserved[key] = val;
                  }
              });
          } catch (e) {}
          var searchArr = [];
          Object.keys(preserved).forEach(function(key) {
              searchArr.push(encodeURIComponent(key) + '=' + encodeURIComponent(preserved[key]));
          });
          if (params.view) searchArr.push('view=' + encodeURIComponent(params.view));
          if (params.library) searchArr.push('library=' + encodeURIComponent(params.library));
          if (params.collection) searchArr.push('collection=' + encodeURIComponent(params.collection));
          if (params.read) searchArr.push('read=' + encodeURIComponent(params.read));
          if (params.favOnly) searchArr.push('favOnly=1');
          if (params.node) searchArr.push('node=' + encodeURIComponent(params.node));
          if (params.viewType) searchArr.push('viewType=' + encodeURIComponent(params.viewType));
          var newUrl = window.location.pathname + (searchArr.length ? '?' + searchArr.join('&') : '') + window.location.hash;
          window.history.replaceState(null, '', newUrl);
      };

L.buildCtx = function buildCtx() {
        var state = L.state;
        var t = L.t;
        var escapeHtml = L.escapeHtml;
        var getBaseUrl = L.getBaseUrl;
        var apiRequest = L.apiRequest;
        var showToast = L.showToast;
        var updateUrl = L.updateUrl;
        return {
            state: state,
            t: t,
            escapeHtml: escapeHtml,
            getBaseUrl: getBaseUrl,
            apiRequest: apiRequest,
            showToast: showToast,
            updateUrl: updateUrl,
            closeReader: function() {
                L.closeReaderModal();
            },
            saveProgress: function(filePath, type, value, total) {
                if (!state) return;
                state.bookmarks = state.bookmarks || {};
                state.bookmarks[filePath] = { type: type, value: value, total: total, timestamp: Date.now() };
                apiRequest(getBaseUrl() + '/api/reader/progress', {
                    method: 'POST',
                    body: JSON.stringify({ path: filePath, type: type, value: value, total: total })
                }).catch(function() {});
            },
            countTomes: L.countTomes,
            findMissingTomes: L.findMissingTomes,
        };
    };

L.normalizeLibPath = function normalizeLibPath(p) {
          if (!p || !p.trim()) return '/';
          return '/' + p.replace(/^\/+|\/+$/g, '');
      };

L.init = function init() {
        var state = L.state;
        var t = L.t;
        var dbg = L.dbg;
        var renderShell = L.renderShell;
        var render = L.render;
        console.debug('[Renamer] L.init() starting', { view: state.view, hasContainer: !!document.getElementById('lib-content') });
        L.dbg('init', { view: state.view, hasContainer: !!document.getElementById('lib-content') });
        var pageRoot = document.getElementById('library-page');
        if (pageRoot && pageRoot.dataset && pageRoot.dataset.isadmin) {
            state.isAdmin = pageRoot.dataset.isadmin === 'true';
        }
        console.debug('[Renamer] L.init() isAdmin:', state.isAdmin);
        if (typeof RenamerUtils !== 'undefined' && RenamerUtils.setModalLabels) {
            RenamerUtils.setModalLabels({ confirm: t('confirm'), cancel: t('cancel'), close: t('close') });
        }
        L.renderShell();
        L.renderBreadcrumb();
        L.bind();
        L.loadCustomTranslations();
        console.debug('[Renamer] L.init() initialization complete, handleUrlParams was called by L.bind()');
        if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.createGlobalDevToolbar) {
            var devCtx = {
                refreshData: function() {
                    return new Promise(function(resolve) {
                        L.loadLibraries(function() {
                            if (state.currentLibrary) {
                                L.loadCollections(state.currentLibrary.id, function() {
                                    L.render();
                                    resolve();
                                });
                            } else {
                                L.render();
                                resolve();
                            }
                        });
                    });
                }
            };
            window.RenamerDevRefresh.createGlobalDevToolbar(devCtx);
        }
    };

L.bind = function bind() {
        var state = L.state;
        var t = L.t;
        var PAGE_ROOT = L.PAGE_ROOT;
        var EXPAND_SVG = L.EXPAND_SVG;
        var COLLAPSE_SVG = L.COLLAPSE_SVG;
        var OPEN_SVG = L.OPEN_SVG;
        var EDIT_SVG = L.EDIT_SVG;
        var SYNC_SVG = L.SYNC_SVG;
        var DELETE_SVG = L.DELETE_SVG;
        var MARK_READ_SVG = L.MARK_READ_SVG;
        var MARK_UNREAD_SVG = L.MARK_UNREAD_SVG;
        var FAV_STAR_SVG = L.FAV_STAR_SVG;
        var COVER_SVG = L.COVER_SVG;
        var escapeHtml = L.escapeHtml;
        if (L.PAGE_ROOT && !L.PAGE_ROOT._ctxBound) {
            L.PAGE_ROOT._ctxBound = true;
            L.PAGE_ROOT.addEventListener('contextmenu', function (e) {
                 var card = e.target.closest('.lib-card, .lib-card-portrait, .lib-collection-card, .lib-library-card, .lib-subcollection-card, .lib-sidebar-item, .lib-context-menu, #lib-context-menu');
                 if (!card) e.preventDefault();
             });
         }
         var toggleBtn = document.getElementById('lib-sidebar-toggle');
         if (toggleBtn && !toggleBtn._bound) {
             toggleBtn._bound = true;
             toggleBtn.addEventListener('click', function () {
                 state.sidebarOpen = !state.sidebarOpen;
                 var sidebar = document.getElementById('lib-sidebar');
                 if (sidebar) {
                     if (state.sidebarOpen) {
                         sidebar.classList.remove('collapsed');
                     } else {
                         sidebar.classList.add('collapsed');
                     }
                 }
             });
         }
          var settingsBtn = document.getElementById('lib-settings-btn');
          if (settingsBtn && !settingsBtn._bound) {
              settingsBtn._bound = true;
              settingsBtn.addEventListener('click', function (e) {
                  e.stopPropagation();
                  L.showReaderSettings();
              });
          }
          var fullscreenBtn = document.getElementById('lib-fullscreen-toggle');
          if (fullscreenBtn && !fullscreenBtn._bound) {
              fullscreenBtn._bound = true;
              fullscreenBtn.addEventListener('click', function () {
                  state.isFullscreen = !state.isFullscreen;
                  var pageApp = document.querySelector('.lib-page-app');
                  var contentApp = document.querySelector('#content.app-renamer');
                  var btn = document.getElementById('lib-fullscreen-toggle');
                  if (!btn) return;
                   if (state.isFullscreen) {
                       if (pageApp) pageApp.classList.add('fullscreen');
                       if (contentApp) contentApp.classList.add('fullscreen');
                       btn.innerHTML = EXPAND_SVG;
                       btn.title = t('reduce');
                       btn.setAttribute('aria-label', t('reduce'));
                       btn.setAttribute('data-translation', 'reduce');
                   } else {
                       if (pageApp) pageApp.classList.remove('fullscreen');
                       if (contentApp) contentApp.classList.remove('fullscreen');
                       btn.innerHTML = COLLAPSE_SVG;
                       btn.title = t('expand');
                       btn.setAttribute('aria-label', t('expand'));
                       btn.setAttribute('data-translation', 'expand');
                   }
              });
          }
        var infoToggle = document.getElementById('lib-info-toggle');
        if (infoToggle && !infoToggle._bound) {
            infoToggle._bound = true;
             infoToggle.addEventListener('click', function () {
                 state.showFileCounts = !state.showFileCounts;
                 var filterWrappers = document.querySelectorAll('.lib-filter-wrapper');
                 filterWrappers.forEach(function (wrapper) {
                     wrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
                 });
                 infoToggle.title = state.showFileCounts ? t('hideFileCounts') : t('showFileCounts');
                 infoToggle.setAttribute('aria-label', state.showFileCounts ? t('hideFileCounts') : t('showFileCounts'));
                 infoToggle.classList.toggle('active', state.showFileCounts);
                  L.renderBreadcrumb();
              });
        }
        var menu = document.getElementById('lib-sidebar-menu');
        if (menu && !menu._bound) {
            menu._bound = true;
             menu.addEventListener('click', function (e) {
                 var chevron = e.target.closest('.lib-sidebar-chevron');
                 if (chevron) {
                     e.preventDefault();
                     e.stopPropagation();
                     var libId = chevron.getAttribute('data-library-id');
                      var sub = menu.querySelector('.lib-sidebar-sub[data-library-id="' + libId + '"]');
                      if (sub) {
                          var isOpen = sub.classList.contains('expanded');
                          var item = sub.previousElementSibling;
                          if (isOpen) {
                              sub.style.height = '0px';
                              sub.classList.remove('expanded');
                              sub.style.overflow = 'hidden';
                              chevron.classList.remove('expanded');
                              if (item) item.classList.remove('sub-open');
                          } else {
                              sub.style.height = 'auto';
                              sub.style.overflow = 'hidden';
                              var targetHeight = sub.scrollHeight + 'px';
                              sub.style.height = '0px';
                              void sub.offsetWidth;
                              sub.classList.add('expanded');
                              sub.style.height = targetHeight;
                              sub.style.overflow = 'hidden';
                              chevron.classList.add('expanded');
                              if (item) item.classList.add('sub-open');
                          }
                      }
                     return;
                 }
                  var item = e.target.closest('.lib-sidebar-item');
                 if (!item) return;
                 var action = item.getAttribute('data-action');
                 if (action === 'scan') {
                     e.preventDefault();
                     L.addLibrary();
                     return;
                 }
                 var view = item.getAttribute('data-view');
                 if (!view) return;
                if (view === 'collection') {
                    var libId = item.getAttribute('data-library-id');
                    var colId = item.getAttribute('data-collection-id');
                    var lib = (state.libraries || []).find(function(l) { return String(l.id) === libId; });
                    var col = (state.collectionsByLib && state.collectionsByLib[libId])
                        ? (state.collectionsByLib[libId] || []).find(function(c) { return String(c.id) === colId; })
                        : (state.collections || []).find(function(c) { return String(c.id) === colId; });
                    if (lib && col) {
                        state.view = 'tomes';
                        state.currentLibrary = lib;
                        state.currentCollection = col;
                        state.currentTome = null;
                        state.readerTreePath = [];
                        L.updateUrl({ view: 'tomes', library: String(lib.id), collection: String(col.id) });
                        L.showLoader();
                        L.loadBookmarksForCollection(lib, col, function () {
                            L.hideLoader();
                            L.invalidateViewCache();
                            L.render();
                        });
                        return;
                    }
                } else if (view === 'library') {
                    var libId2 = item.getAttribute('data-library-id');
                    var lib2 = (state.libraries || []).find(function(l) { return String(l.id) === libId2; });
                    if (!lib2) {
                        state.view = 'home';
                        state.currentLibrary = null;
                        state.currentCollection = null;
                    } else {
                        state.view = 'collection';
                        state.currentLibrary = lib2;
                        state.currentCollection = null;
                        L.updateUrl({ view: 'collection', library: String(lib2.id) });
                        L.loadCollections(lib2.id, function () { L.render(); });
                        return;
                    }
                  } else {
                     state.view = view;
                     state.currentLibrary = null;
                     state.currentCollection = null;
                     state.readerTreePath = [];
                  }
                  state.flatFilesMode = false;
                  state.flatCollectionMode = false;
                  if (state.view === 'favorites') {
                      L.loadReaderFavoritesList(function () {
                          L.loadAllCollections(function () {
                              L.render();
                              L.updateUrl({ view: state.view === 'home' ? 'home' : (state.view === 'favorites' ? 'favorites' : 'libraries') });
                          });
                      });
                } else {
                    L.invalidateViewCache();
                    L.resolveReader({ viewParam: state.view }, function () {
                        L.render();
                        L.updateUrl({ view: state.view === 'home' ? 'home' : (state.view === 'favorites' ? 'favorites' : 'libraries') });
                    });
                }
            });
            menu.addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.lib-sidebar-item[data-view="home"]');
                if (!item) return;
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.editHomeImage(); } });
                    items.push({ label: t('rescanLibrary'), icon: SYNC_SVG, action: function () {
                        var lib = state.currentLibrary || (state.libraries && state.libraries[0]);
                        if (lib) L.rescanLibrary(lib);
                        else showToast(t('noLibraries'), 'error');
                    } });
                }
                if (!items.length) return;
                L.showContextMenu(e, items, null);
            });
            menu.addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.lib-sidebar-item[data-view="library"]');
                if (!item) return;
                var libId = item.getAttribute('data-library-id');
                var lib = (state.libraries || []).find(function (l) { return String(l.id) === libId; });
                if (!lib) return;
                e.preventDefault();
                var cols = state.collectionsByLib[lib.id] || [];
                var firstFiles = L.collectAllFiles((cols[0] && cols[0].rules) ? cols[0].rules : {});
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: L.renameLibrary });
                    items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.pickCoverForTome(firstFiles[0]); } });
                    items.push({ label: t('changeLibraryType'), icon: L.TYPE_SVG, action: L.changeLibraryType });
                    items.push({ label: t('addLibraryPath'), icon: L.ADD_FOLDER_SVG, action: L.addLibraryPath });
                    items.push({ label: t('rescanLibrary'), icon: SYNC_SVG, action: L.rescanLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: DELETE_SVG, action: L.deleteLibrary });
                }
                if (!items.length) return;
                L.showContextMenu(e, items, lib);
            });
            menu.addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.lib-sidebar-sub .lib-sidebar-item[data-view="collection"]');
                if (!item) return;
                var libId = item.getAttribute('data-library-id');
                var colId = item.getAttribute('data-collection-id');
                var lib = (state.libraries || []).find(function (l) { return String(l.id) === libId; });
                var col = (state.collectionsByLib && state.collectionsByLib[libId] ? state.collectionsByLib[libId] : state.collections || []).find(function (c) { return String(c.id) === colId; });
                if (!lib || !col) return;
                e.preventDefault();
                var items = [];
                items.push({ label: t('open'), icon: OPEN_SVG, action: function () { L.navigateToCollection(col, lib); } });
                var colPaths = L.collectPaths(col);
                if (colPaths.length) {
                    items.push({ type: 'separator' });
                    items.push({ label: t('markCollectionRead'), icon: MARK_READ_SVG, action: function () { L.markCollectionRead(col, lib); } });
                    items.push({ label: t('markCollectionUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markCollectionUnread(col, lib); } });
                }
                if (state.isAdmin) {
                    if (items.length) items.push({ type: 'separator' });
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { L.renameCollection(col, lib); } });
                    items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { L.rescanCollection(col, lib); } });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteCol'), icon: DELETE_SVG, action: function () { L.deleteCollection(col, lib); } });
                }
                if (!items.length) return;
                L.showContextMenu(e, items, col);
            });
            var sbLP = { timer: null, startX: 0, startY: 0, target: null };
            function clearSbLP() {
                if (sbLP.timer) { clearTimeout(sbLP.timer); sbLP.timer = null; }
                sbLP.target = null;
            }
            menu.addEventListener('touchstart', function (e) {
                if (sbLP.timer || e.touches.length !== 1) return;
                var item = e.target.closest && (e.target.closest('.lib-sidebar-item[data-view="home"]') || e.target.closest('.lib-sidebar-item[data-view="library"]') || e.target.closest('.lib-sidebar-item[data-view="collection"]'));
                if (!item) return;
                var t = e.touches[0];
                sbLP.startX = t.clientX;
                sbLP.startY = t.clientY;
                sbLP.target = item;
                sbLP.timer = setTimeout(function () {
                    if (!sbLP.target || document.getElementById('lib-context-menu')) return;
                    var ev = new MouseEvent('contextmenu', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: sbLP.startX,
                        clientY: sbLP.startY
                    });
                    sbLP.target.dispatchEvent(ev);
                    sbLP.timer = null;
                    sbLP.target = null;
                }, 600);
            }, { passive: true });
            menu.addEventListener('touchmove', function (e) {
                if (!sbLP.timer) return;
                if (e.touches.length > 0) {
                    var t = e.touches[0];
                    if (Math.abs(t.clientX - sbLP.startX) > 15 || Math.abs(t.clientY - sbLP.startY) > 15) {
                        clearSbLP();
                    }
                }
            }, { passive: true });
            menu.addEventListener('touchend', clearSbLP);
            menu.addEventListener('touchcancel', clearSbLP);
         }
         if (L.loadHomeImage) L.loadHomeImage();
         L.handleUrlParams();
     };

L.buildBreadcrumb = L.buildLibBreadcrumb;
L.renderBreadcrumbPublic = L.renderBreadcrumb;

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
        L.init();
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('load', function () {
        if (typeof RenamerDevRefresh !== 'undefined' && RenamerDevRefresh.onPageReady) {
            try { RenamerDevRefresh.onPageReady(); } catch (e) {}
        }
    });
}
})();
