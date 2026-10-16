(function (L) {
    'use strict';

    var state = L.state;
    var t = L.t;
    var dbg = L.dbg;
    var escapeHtml = L.escapeHtml;
    var getBaseUrl = L.getBaseUrl;
    var apiRequest = L.apiRequest;
    var showToast = L.showToast;
    var showLoader = L.showLoader;
    var hideLoader = L.hideLoader;
    var updateUrl = L.updateUrl;
    var normalizeLibPath = L.normalizeLibPath;
    var fileExt = L.fileExt;
    var makeFileEntry = L.makeFileEntry;
    var getCollectionRoot = L.getCollectionRoot;
    var enrichFileEntries = L.enrichFileEntries;
    var fileIcon = L.fileIcon;
    var formatSize = L.formatSize;
    var getWebdavUrl = L.getWebdavUrl;
    var getDavHeaders = L.getDavHeaders;
    var HOME_SVG = L.HOME_SVG;
    var FAV_STAR_SVG = L.FAV_STAR_SVG;


function collectPaths(nodeOrCollection) {
         var root = nodeOrCollection && nodeOrCollection.rules ? nodeOrCollection.rules : nodeOrCollection;
         var files = L.collectAllFiles(root);
         var paths = [];
         files.forEach(function (f) { if (f.path) paths.push(f.path); });
         return paths;
     }

function loadLibraries(cb) {
        state.covers = {};
        state.coversLoaded = false;
        state.progressLoaded = false;
        state.progressLoading = false;
        state.collectionsByLib = {};
        state.allCollections = {};
        state.loadingLibraries = true;
        apiRequest(getBaseUrl() + '/api/reader/libraries').then(function (data) {
            state.loadingLibraries = false;
            dbg('loadLibraries ok', { count: (data && data.libraries ? data.libraries.length : 0), view: state.view });
            if (data && data.success) {
                state.libraries = data.libraries || [];
            } else {
                state.libraries = [];
            }
            L.loadAllCollections(function () {
                L.renderSidebar();
                renderBreadcrumb();
                if (state.view === 'libraries' || state.view === 'home') {
                    L.renderLibrariesContent();
                }
                if (typeof cb === 'function') cb();
            });
        }).catch(function (err) {
            state.loadingLibraries = false;
            showToast(t('scanError') + ' : ' + (err && err.message ? err.message : err), 'error');
            if (state.view === 'libraries') L.renderLibrariesContent();
            if (typeof cb === 'function') cb();
        });
    }

function loadCollections(libraryId, cb) {
        dbg('loadCollections start', { libraryId: libraryId });
        apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + libraryId).then(function (data) {
            dbg('loadCollections done', { libraryId: libraryId, count: (data && data.collections ? data.collections.length : 0) });
            if (data && data.success) {
                state.collections = data.collections || [];
            } else {
                state.collections = [];
            }
            state.collections.forEach(function (c) {
                if (c && c.rules) enrichFileEntries(c.rules);
            });
            state.collectionsByLib[libraryId] = (state.collections || []).slice();
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.collections = [];
            state.collectionsByLib[libraryId] = [];
            if (typeof cb === 'function') cb();
        });
    }

function loadAllFilesForLibrary(lib, cb) {
        dbg('loadAllFilesForLibrary start', { libraryId: lib && lib.id });
        var paths = Array.isArray(lib.paths) ? lib.paths : (lib.description ? [lib.description] : []);
        var allFiles = [];
        var pending = paths.length;
        if (!pending) {
            state.flatFiles = [];
            state.flatFilesByExt = {};
            if (typeof cb === 'function') cb();
            return;
        }
        paths.forEach(function (folder) {
            apiRequest(getBaseUrl() + '/api/reader/scan', {
                method: 'POST',
                body: JSON.stringify({ path: folder, recursive: true })
            }).then(function (data) {
                if (data && data.success) {
                    var files = data.files || [];
                    files.forEach(function (f) {
                        var ext = fileExt(f);
                        if (DOC_EXT.indexOf(ext) === -1) return;
                        allFiles.push(f);
                        state.flatFilesByExt = state.flatFilesByExt || {};
                        state.flatFilesByExt[ext] = (state.flatFilesByExt[ext] || 0) + 1;
                    });
                }
                pending--;
                if (pending <= 0) {
                    allFiles = allFiles.map(function (f) {
                        try { return parseScanEntry(f); } catch (e) { return makeFileEntry(f); }
                    });
                    state.flatFiles = allFiles;
                    L.loadCoversBulk(allFiles.slice());
                    if (typeof cb === 'function') cb();
                }
            }).catch(function () {
                pending--;
                if (pending <= 0) {
                    allFiles = allFiles.map(function (f) {
                        try { return parseScanEntry(f); } catch (e) { return makeFileEntry(f); }
                    });
                    state.flatFiles = allFiles;
                    L.loadCoversBulk(allFiles.slice());
                    if (typeof cb === 'function') cb();
                }
            });
        });
    }

function buildNavCtx() {
         if (!state.navCtx) {
             state.navCtx = {
                 t: t,
                 escapeHtml: escapeHtml,
                 getBaseUrl: getBaseUrl,
                 apiRequest: apiRequest,
                 showToast: showToast,
                 state: state,
             };
             state.navCtx.showLoaderInContainer = function() {};
             state.navCtx.hideLoaderInContainer = function() {};
         }
         if (state.navigation) {
             state.navigation.showNavActions = false;
         }
         return state.navCtx;
     }

function handleUrlParams() {
            var params = new URLSearchParams(window.location.search);
            var viewParam = params.get('view');
            var libId = params.get('library');
            var colId = params.get('collection');
            var readPath = params.get('read');
            var nodeParam = params.get('node');
            var viewTypeParam = params.get('viewType');
            dbg('handleUrlParams', { view: viewParam, library: libId, collection: colId, read: readPath, node: nodeParam, viewType: viewTypeParam });
            var favOnlyParam = params.get('favOnly');
            state.readerFavoritesOnly = favOnlyParam === '1';
            state.readerTreePath = nodeParam ? nodeParam.split('.').map(Number) : [];
            if (viewTypeParam === 'flat') {
                state.flatFilesMode = true;
                state.flatCollectionMode = true;
            } else {
                state.flatFilesMode = false;
                state.flatCollectionMode = false;
            }

           // Deep-link (?collection= et/ou ?read=) : résolution serveur unique — élimine
           // le fan-out N+1 et la course sur state.collections (handleUrlParams ancien).
           if (colId || readPath) {
               L.resolveReader({ libId: libId, colId: colId, readPath: readPath, nodeParam: nodeParam, viewParam: viewParam }, function () {
                   L.renderDeepLink(readPath, colId, libId);
               });
               return;
           }

           // Vue collections d'une bibliothèque : même endpoint serveur unique, mais
           // on garde state.view='collection' pour la sidebar/collections ciblées.
            if (libId && !colId && !readPath) {
                if (viewParam === 'favorites') {
                    state.view = 'favorites';
                } else if (viewParam === 'flat-files') {
                    state.view = 'flat-files';
                    state.flatFilesMode = true;
                } else {
                    state.view = 'collection';
                }
                L.resolveReader({ libId: libId, colId: colId, readPath: readPath, viewParam: state.view }, function () {
                    if (state.view === 'flat-files' && state.currentLibrary) {
                        showLoader();
                        loadAllFilesForLibrary(state.currentLibrary, function () {
                            hideLoader();
                            L.render();
                        });
                    } else {
                        L.render();
                    }
                });
                return;
            }

           // Home / libraries / favorites : un seul appel resolveReader renvoie
           // libraries + collectionsByLib + covers + progress + favorites.
           state.view = viewParam === 'favorites' ? 'favorites' : (viewParam === 'home' ? 'home' : 'libraries');
           state.flatFilesMode = false;
           state.flatCollectionMode = false;
           L.resolveReader({ viewParam: state.view }, function () { L.render(); });
       }

function buildLibBreadcrumb() {
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
                          var colNode = getCollectionRoot(state.currentCollection);
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
      }

function renderBreadcrumb() {
          L.renderSidebar();
          var container = document.getElementById('lib-breadcrumb');
          if (!container) return;
          container.innerHTML = buildLibBreadcrumb();

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
                          loadCollections(lib.id, function () { L.render(); });
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
                             L.render();
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
                            L.render();
                           L.renderSidebar();
                           renderBreadcrumb();
                           return;
                       }
                   }
              });
          });

          if (typeof RenamerNavigation !== 'undefined' && RenamerNavigation && RenamerNavigation.updateFavoriteStar) {
              try {
                  var navCtx = buildNavCtx();
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
       }

    L.loadLibraries = loadLibraries;
    L.loadCollections = loadCollections;
    L.loadAllFilesForLibrary = loadAllFilesForLibrary;
    L.collectPaths = collectPaths;
    L.handleUrlParams = handleUrlParams;
    L.buildLibBreadcrumb = buildLibBreadcrumb;
    L.renderBreadcrumb = renderBreadcrumb;
    L.buildNavCtx = buildNavCtx;

})(window.RenamerLibrary);
