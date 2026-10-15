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
        collectionsByLib: {},
        coverWidth: 300,
        navigationEpoch: 0,
        resolveAbort: null,
        customTranslations: null,
        settingsLangView: 'fr',
        flatFilesMode: false,
        flatCollectionMode: false,
        showFileCounts: false,
        displayNameOverrides: null,
        tableColumnVisibility: null,
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
            countTomes: countTomes,
            findMissingTomes: findMissingTomes,
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
        L.dbg('init', { view: state.view, hasContainer: !!document.getElementById('lib-content') });
         var pageRoot = document.getElementById('library-page');
        if (pageRoot && pageRoot.dataset && pageRoot.dataset.isadmin) {
            state.isAdmin = pageRoot.dataset.isadmin === 'true';
        }
        if (typeof RenamerUtils !== 'undefined' && RenamerUtils.setModalLabels) {
            RenamerUtils.setModalLabels({ confirm: t('confirm'), cancel: t('cancel'), close: t('close') });
        }
        L.renderShell();
        L.renderBreadcrumb();
        L.bind();
        L.loadCustomTranslations();
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
                 renderBreadcrumb();
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
                        L.renderTomes(col);
                        L.renderSidebar();
                        L.renderBreadcrumb();
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
                        L.loadCollections(lib2.id, function () { L.renderCollections(lib2); });
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
                      L.render();
                      L.updateUrl({ view: state.view === 'home' ? 'home' : (state.view === 'favorites' ? 'favorites' : 'libraries') });
                  }
            });
            menu.addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.lib-sidebar-item[data-view="library"]');
                if (!item) return;
                var libId = item.getAttribute('data-library-id');
                var lib = (state.libraries || []).find(function (l) { return String(l.id) === libId; });
                if (!lib) return;
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: L.renameLibrary });
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
                var item = e.target.closest && (e.target.closest('.lib-sidebar-item[data-view="library"]') || e.target.closest('.lib-sidebar-item[data-view="collection"]'));
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
         L.handleUrlParams();
     };

L.buildLibBreadcrumb = function buildLibBreadcrumb() {
        var state = L.state;
        var t = L.t;
        var escapeHtml = L.escapeHtml;
          var CHEVRON = '<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg>';
          var homeLabel = escapeHtml(t('home'));
          var favLabel = escapeHtml(t('myFavorites') || 'Favoris');

           var html = '<nav class="navigation-breadcrumb" aria-label="' + escapeHtml(t('navigationBreadcrumbRoot') || 'Current directory path') + '"><ul class="breadcrumb__crumbs">';

           function crumb(text, level, opts) {
               opts = opts || {};
               var isLast = opts.isLast || false;
               var iconOnly = opts.iconOnly || false;
                var iconHtml = opts.icon ? '<span class="button-vue__icon"><span class="icon-vue lib-icon-vue">' + opts.icon + '</span></span>' : '';
               var transKey = opts.transKey;
               var textAttr = transKey ? ' data-translation="' + transKey + '"' : '';
               var textHtml = text !== '' ? '<span class="button-vue__text"' + textAttr + '>' + text + '</span>' : '';
               var btnClass = 'button-vue button-vue--size-normal button-vue--vue-tertiary button-vue--tertiary';
               if (iconOnly && !textHtml) { btnClass += ' button-vue--icon-only'; }
               var dataId = opts.id ? ' data-crumb-id="' + escapeHtml(opts.id) + '"' : '';
               var aTransAttr = (transKey && iconOnly && !textHtml) ? ' data-translation="' + transKey + '"' : '';
               html += '<li class="navigation-crumb' + (isLast ? ' active' : '') + '">';
               html += '<a class="' + btnClass + '" data-crumb-level="' + level + '"' + dataId + aTransAttr + ' title="' + escapeHtml(opts.title || '') + '">' +
                   '<span class="button-vue__wrapper">' + iconHtml + textHtml + '</span></a>';
              if (!isLast) {
                  html += '<span class="material-design-icon chevron-right-icon vue-crumb__separator">' + CHEVRON + '</span>';
              }
              html += '</li>';
          }

          var isLibs = state.view === 'libraries' || state.view === 'home';
          var isFavs = state.view === 'favorites';
          var hasLib = state.currentLibrary;
          var hasCol = state.currentCollection;

          var libName = hasLib ? (state.currentLibrary.name || '') : '';
          var libId = hasLib ? String(state.currentLibrary.id) : '';
          var colName = (hasCol && state.currentCollection) ? (state.currentCollection.name || '') : '';
          var colId = (hasCol && state.currentCollection) ? String(state.currentCollection.id) : '';

        crumb('', 'home', { icon: HOME_SVG, iconOnly: true, isLast: isLibs && !hasLib, title: homeLabel, transKey: 'home' });
        if (isFavs && !hasLib) {
            crumb(favLabel, 'favorites', { icon: FAV_STAR_SVG, isLast: true, title: favLabel, transKey: 'myFavorites' });
        } else {
              if (hasLib) {
                  crumb(libName, 'library', { id: libId, isLast: !hasCol, title: libName });
                  if (hasCol) {
                      var hasSubPath = state.view === 'tomes' && state.readerTreePath && state.readerTreePath.length > 0;
                      if (hasSubPath) {
                          crumb(colName, 'collection', { id: colId, isLast: false, title: colName });
                          var colNode = L.getCollectionRoot(state.currentCollection);
                          var tp = state.readerTreePath;
                          for (var si = 0; si < tp.length; si++) {
                              if (colNode && colNode.children && colNode.children[tp[si]]) {
                                  colNode = colNode.children[tp[si]];
                                  var isLastSub = (si === tp.length - 1);
                                  crumb(colNode.name || '', 'subcollection', {
                                      id: tp.slice(0, si + 1).join('.'),
                                      isLast: isLastSub,
                                      title: colNode.name || ''
                                  });
                              } else {
                                  break;
                              }
                          }
                      } else {
                          crumb(colName, 'collection', { id: colId, isLast: true, title: colName });
                      }
                  }
              }
          }

           html += '</ul>';
           if (state.showNavActions !== false) {
               var NAV_MORE_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_DOTS) || '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>';
                html += '<button type="button" id="renamer-breadcrumb-star" class="navigation-breadcrumb-star" title="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" aria-label="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" data-favorite="false" data-translation="navAddToFavorites">' + FAV_STAR_SVG + '</button>';
                html += '<button type="button" id="lib-nav-more" class="navigation-nav-more" title="' + escapeHtml(t('navMore') || 'Plus') + '" aria-label="' + escapeHtml(t('navMore') || 'Plus') + '" data-translation="navMore">' + NAV_MORE_SVG + '</button>';
           }
           html += '</nav>';
           return html;
      };

L.renderBreadcrumb = function renderBreadcrumb() {
        var state = L.state;
        var t = L.t;
        var updateUrl = L.updateUrl;
        L.renderSidebar();
          var container = document.getElementById('lib-breadcrumb');
          if (!container) return;
          container.innerHTML = L.buildLibBreadcrumb();

          var infoToggle = document.getElementById('lib-info-toggle');
          if (infoToggle) {
              var showInfoToggle = state.view === 'collection' || state.view === 'tomes' || state.view === 'flat-files' || state.view === 'reading';
              infoToggle.style.display = showInfoToggle ? '' : 'none';
          }

          container.querySelectorAll('.navigation-crumb a[data-crumb-level]').forEach(function (link) {
              if (link._libCrumbBound) return;
              link._libCrumbBound = true;
              link.addEventListener('click', function (e) {
                  e.preventDefault();
                  e.stopPropagation();
                  var level = link.getAttribute('data-crumb-level');
                  var crumbId = link.getAttribute('data-crumb-id');
                  if (level === 'home' || level === 'libraries' || level === 'favorites') {
                      if (level === 'favorites') {
                          state.view = 'favorites';
                          state.currentLibrary = null;
                          state.currentCollection = null;
                          state.currentTome = null;
                      } else {
                          state.view = 'libraries';
                          state.currentLibrary = null;
                          state.currentCollection = null;
                          state.currentTome = null;
                      }
                      L.render();
                      updateUrl({ view: level === 'favorites' ? 'favorites' : 'libraries' });
                      return;
                  }
                  if (level === 'library') {
                      var lib = (state.libraries || []).find(function (l) { return String(l.id) === crumbId; });
                      if (lib) {
                           state.view = 'collection';
                           state.currentLibrary = lib;
                           state.currentCollection = null;
                           state.readerTreePath = [];
                           state.currentTome = null;
                    updateUrl({ view: 'collection', library: String(lib.id) });
                          L.loadCollections(lib.id, function () { L.renderCollections(lib); });
                          return;
                      }
                   } else if (level === 'collection') {
                      var col = (state.collections || []).find(function (c) { return String(c.id) === crumbId; });
                      if (!col && state.currentLibrary && state.collectionsByLib) {
                          var cols = state.collectionsByLib[state.currentLibrary.id] || [];
                          col = cols.find(function (c) { return String(c.id) === crumbId; });
                      }
                       if (col) {
                            state.view = 'tomes';
                            state.currentCollection = col;
                            state.currentTome = null;
                            state.readerTreePath = [];
                            updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(col.id) });
                           L.renderTomes(col);
                           L.renderSidebar();
                           renderBreadcrumb();
                           return;
                       }
                   } else if (level === 'subcollection') {
                       if (state.currentCollection && state.currentLibrary) {
                           state.view = 'tomes';
                           state.currentTome = null;
                           state.readerTreePath = crumbId ? crumbId.split('.').map(Number) : [];
                           var nodeParam = crumbId || null;
                           updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), node: nodeParam });
                           L.renderTomes(state.currentCollection);
                           L.renderSidebar();
                           renderBreadcrumb();
                           return;
                       }
                   }
              });
          });

          if (typeof RenamerNavigation !== 'undefined' && RenamerNavigation && RenamerNavigation.updateFavoriteStar) {
              try {
                  var navCtx = L.buildNavCtx();
                  RenamerNavigation.init(navCtx);
                  var navPath = '/';
                  if (state.view === 'collection' && state.currentLibrary) {
                      navPath = normalizeLibPath(state.currentLibrary.description);
                  } else if (state.view === 'tomes' && state.currentLibrary && state.currentCollection) {
                      navPath = normalizeLibPath(state.currentCollection.rules && state.currentCollection.rules.folder);
                  }
                  RenamerNavigation.setCurrentPath(navPath);
                  RenamerNavigation.updateFavoriteStar(container);
              } catch (e) {}
          }

           if (state.showNavActions !== false) {
               var moreBtn = container.querySelector('#lib-nav-more');
               if (moreBtn && !moreBtn._libNavMoreBound) {
                   moreBtn._libNavMoreBound = true;
                   moreBtn.addEventListener('click', function (e) {
                       e.stopPropagation();
                       if (typeof RenamerNavigation !== 'undefined' && RenamerNavigation && RenamerNavigation.showNavMorePopup) {
                           try {
                               RenamerNavigation.showNavMorePopup(moreBtn);
                           } catch (ex) {}
                       }
                   });
               }
           }
       };

    L.buildBreadcrumb = L.buildLibBreadcrumb;
    L.renderBreadcrumbPublic = L.renderBreadcrumb;
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                L.init();
            });
        } else {
            L.init();
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('load', function () {
            if (typeof RenamerDevRefresh !== 'undefined' && RenamerDevRefresh.onPageReady) {
                try { RenamerDevRefresh.onPageReady(); } catch (e) {}
            }
        });
    }
})();
