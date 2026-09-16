(function () {
    'use strict';

    var PAGE_ROOT = document.getElementById('library-page');
    if (!PAGE_ROOT) return;
    PAGE_ROOT.id = 'library-page';

    var SUPPORTED_EXT = ['pdf', 'cbz', 'cbr', 'epub', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    var state = {
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
    };

    var TR = {
        fr: {
            title: 'Bibliothèque',
            addLibrary: 'Ajouter une librairie',
            empty: 'Aucune librairie',
            emptyHint: 'Cliquez sur "Ajouter une librairie" pour commencer à scanner votre collection de documents.',
            readOnlyHint: 'Administré par un administrateur — les bibliothèques sont partagées et en lecture seule.',
            scan: 'Scanner un dossier',
            scanError: 'Scan échoué',
            scanCancelled: 'Scan annulé',
            scanInProgress: 'Scan en cours…',
            scanComplete: 'Scan terminé',
            documents: 'documents',
            noResults: 'Aucun fichier trouvé',
            newLibPrompt: 'Nom de la librairie',
            newLibPlaceholder: 'ex: BD, Romans, Mangas',
            continueReading: 'Continuer la lecture',
            myFavorites: 'Mes favoris',
            noFavorites: 'Aucun favori',
            favoritesHint: 'Pages marquées comme favoris',
            noProgress: 'Aucune progression enregistrée',
            collection: 'Collection',
            tomes: 'Tomes',
            tome: 'Tome',
            progress: ' progression',
            open: 'Ouvrir',
            unsupported: 'Format non supporté',
            readError: 'Impossible de lire le fichier',
            back: 'Retour',
            home: 'Accueil',
            size: 'taille',
            page: 'Page',
            percent: '%',
            convertCbr: 'Conversion CBR…',
            convertCbrError: 'Conversion CBR impossible',
            deleteProgress: 'Supprimer la progression',
            progressDeleted: 'Progression supprimée',
            scanFolderDialog: 'Sélectionner un dossier à scanner',
            scanConfirm: 'Scanner ce dossier',
            scanCancel: 'Annuler',
            subfolders: 'Sous-dossiers',
            scanFiles: 'Fichiers',
            navFavorites: 'Favoris',
            navNoFavorites: 'Aucun favori',
            navAddToFavorites: 'Ajouter aux favoris',
            navRemoveFavorite: 'Retirer du favori',
            navFavoriteAdded: 'Ajouté aux favoris',
            navFavoriteRemoved: 'Retiré des favoris',
            navMore: 'Plus',
            navLoading: 'Chargement…',
            navigationBreadcrumbRoot: 'Racine',
            readerClose: 'Fermer',
            loading: 'Chargement…',
        },
        en: {
            title: 'Library',
            addLibrary: 'Add a library',
            empty: 'No libraries',
            emptyHint: 'Click "Add a library" to start scanning your document collection.',
            readOnlyHint: 'Admin-managed — libraries are shared and read-only.',
            scan: 'Scan a folder',
            scanError: 'Scan failed',
            scanCancelled: 'Scan cancelled',
            scanInProgress: 'Scanning…',
            scanComplete: 'Scan complete',
            documents: 'documents',
            noResults: 'No files found',
            newLibPrompt: 'Library name',
            newLibPlaceholder: 'ex: Comics, Novels, Mangas',
            continueReading: 'Continue reading',
            myFavorites: 'My Favorites',
            noFavorites: 'No favorites',
            favoritesHint: 'Bookmarked pages',
            noProgress: 'No progress saved',
            collection: 'Collection',
            tomes: 'Tomes',
            tome: 'Volume',
            progress: ' progress',
            open: 'Open',
            unsupported: 'Unsupported format',
            readError: 'Could not read file',
            back: 'Back',
            home: 'Home',
            size: 'size',
            page: 'Page',
            percent: '%',
            convertCbr: 'Converting CBR…',
            convertCbrError: 'Could not convert CBR',
            deleteProgress: 'Delete progress',
            progressDeleted: 'Progress deleted',
            scanFolderDialog: 'Select a folder to scan',
            scanConfirm: 'Scan this folder',
            scanCancel: 'Cancel',
            subfolders: 'Subfolders',
            scanFiles: 'Files',
            navFavorites: 'Favorites',
            navNoFavorites: 'No favorites',
            navAddToFavorites: 'Add to favorites',
            navRemoveFavorite: 'Remove from favorites',
            navFavoriteAdded: 'Added to favorites',
            navFavoriteRemoved: 'Removed from favorites',
            navMore: 'More',
            navLoading: 'Loading…',
            navigationBreadcrumbRoot: 'Root',
            readerClose: 'Close',
            loading: 'Loading…',
            pwaInstallText: 'iPad : ajoutez à l\'écran d\'accueil pour un plein écran natif 100%.',
            pwaInstallBtn: 'Ajouter à l\'écran',
            pwaInstallSteps: 'Appuyez sur Partager (↑) puis « Ajouter à l\'écran d\'accueil ».',
        },
    };
    var LANG = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.slice(0, 2) : 'fr';
    var lang = TR[LANG] ? LANG : 'fr';

    function t(key) {
        var dict = TR[lang] || TR.fr;
        return dict[key] || TR.fr[key] || key;
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getBaseUrl() {
        if (typeof OC !== 'undefined' && OC.generateUrl) {
            return OC.generateUrl('/apps/renamer');
        }
        return '/apps/renamer';
    }

    function apiRequest(url, options) {
        options = options || {};
        var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        var opts = {
            method: options.method || 'GET',
            credentials: 'same-origin',
            headers: headers,
            body: options.body || null,
        };
        if (options.signal) opts.signal = options.signal;
        return fetch(url, opts).then(function (r) {
            if (!r.ok) {
                return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t); });
            }
            return r.json();
        });
    }

    function showToast(message, type) {
        var container = document.getElementById('lib-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'lib-toast-container';
            container.style.cssText = 'position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:8px;z-index:20000;';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.style.cssText = 'min-width:220px;max-width:420px;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:500;color:var(--nc-text);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;gap:8px;';
        var bg = type === 'error' ? '#fbe2e1' : type === 'info' ? '#ecf0f1' : '#e8f5e9';
        var fg = type === 'error' ? '#a01818' : type === 'info' ? '#374151' : '#1a7f1a';
        toast.style.background = bg;
        toast.style.color = fg;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 3500);
    }

    function injectStyles() {
        if (document.getElementById('lib-styles')) return;
        var style = document.createElement('style');
        style.id = 'lib-styles';
        style.textContent =
            '.lib-page-app{display:flex;flex-direction:column;height:calc(100vh - 64px);width:100%;overflow:hidden;background:white;color:var(--nc-text);font-family:var(--nc-font-family,"Segoe UI",sans-serif);}' +
            '.lib-page-header{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;}' +
            '.lib-page-title{font-size:18px;font-weight:600;color:var(--nc-text);}' +
            '.lib-page-content{flex:1;overflow-y:auto;padding:16px;}' +
            '.lib-empty{text-align:center;padding:40px 16px;opacity:0.6;font-size:13px;}' +
            '.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;}' +
            '.lib-card{background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;}' +
            '.lib-card:hover{transform:translateY(-2px);}' +
            '.lib-card .lib-icon{font-size:32px;margin-bottom:8px;}' +
            '.lib-card .lib-name{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card .lib-meta{font-size:11px;opacity:0.6;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:12px;}' +
            '.lib-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:6px;cursor:pointer;}' +
            '.lib-prog{display:flex;align-items:center;gap:6px;font-size:12px;opacity:0.6;}' +
            '.lib-btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:1px solid var(--nc-border);border-radius:6px;background:var(--nc-bg-default);color:var(--nc-text);font-size:13px;cursor:pointer;}' +
            '.lib-btn:hover{background:var(--nc-bg-hover);}' +
            '.lib-btn-primary{background:var(--nc-button);color:var(--nc-button-text);border-color:var(--nc-button);}' +
            '.lib-btn-primary:hover{background:var(--nc-button-hover);}' +
            '.lib-tome{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--nc-border);}' +
            '@keyframes renamer-spin{to{transform:rotate(360deg)}}' +
            '.renamer-toast-container{position:fixed;bottom:20px;right:20px;z-index:200000;display:flex;flex-direction:column;gap:8px;pointer-events:none;}' +
            '.renamer-toast{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:var(--nc-radius);background:var(--nc-bg);border:1px solid var(--nc-border);box-shadow:0 4px 16px rgba(0,0,0,0.2);font-size:14px;color:var(--nc-text);pointer-events:auto;min-width:200px;max-width:400px;opacity:0;transform:translateX(20px);transition:opacity 250ms ease,transform 250ms ease;}' +
            '.renamer-toast-show{opacity:1;transform:translateX(0);}' +
            '.renamer-toast-info{border-left:4px solid #22c55e;}' +
            '.renamer-toast-success{border-left:4px solid #22c55e;}' +
            '.renamer-toast-error{border-left:4px solid #ef4444;}' +
            '.renamer-toast-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#fff;flex-shrink:0;}' +
            '.renamer-toast-info .renamer-toast-icon{background:#22c55e;}' +
            '.renamer-toast-success .renamer-toast-icon{background:#22c55e;}' +
            '.renamer-toast-error .renamer-toast-icon{background:#ef4444;}' +
            '.renamer-toast-close{background:transparent;border:none;color:var(--nc-text);cursor:pointer;font-size:16px;opacity:0.6;}' +
            '.renamer-toast-close:hover{opacity:1;}' +
            '#reader-scan-breadcrumb .navigation-breadcrumb,#reader-scan-breadcrumb .navigation-breadcrumb *{font-size:13px;}' +
            '#reader-scan-breadcrumb .navigation-crumb .button-vue__text{color:var(--color-text-maxcontrast);font-size:12px;}' +
            '#reader-scan-breadcrumb .navigation-crumb.active .button-vue__text{color:var(--nc-text);}' +
            '.reader-scan-favorites-item{display:flex;align-items:center;gap:6px;font-size:12px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:4px;padding:4px 8px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.reader-scan-favorites-item:hover{background:rgba(0,130,201,0.08);}' +
            '.reader-scan-favorites-star{opacity:0.7;font-size:11px;}' +
            '.reader-scan-folder-row{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;border-radius:6px;border:1px solid var(--nc-border);background:var(--nc-bg-default);transition:var(--nc-transition);}' +
            '.reader-scan-folder-row:hover{background:rgba(0,130,201,0.06);border-color:var(--nc-blue);}' +
            '.reader-scan-folder-row .reader-folder-icon{font-size:16px;opacity:0.8;}' +
            '.reader-scan-file-row{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:6px;border:1px solid var(--nc-border);background:var(--nc-bg-default);opacity:0.6;}' +
            '.reader-scan-file-row .reader-file-icon{font-size:14px;}' +
            '.reader-scan-section-title{font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin:10px 0 4px 0;}' +
            '.reader-scan-empty{opacity:0.5;font-size:13px;padding:16px;text-align:center;}' +
            '.reader-scan-table{width:100%;border-collapse:collapse;}' +
            '.reader-scan-table td{padding:0;}';
        if (typeof cssVars !== 'undefined') {}
        document.head.appendChild(style);
    }

    function classifyScan(files, rootFolder) {
        var collections = {};
        var rootBase = (rootFolder || '').replace(/^\/+|\/+$/g, '').split('/').pop() || 'Bibliothèque';
        var prefix = (rootFolder || '').replace(/^\/+|\/+$/g, '');
        files.forEach(function (f) {
            var ext = (f.extension || (f.name ? f.name.split('.').pop().toLowerCase() : '')).toLowerCase();
            if (SUPPORTED_EXT.indexOf(ext) === -1) return;
            var absPath = (f.path || '').replace(/^\/+/, '');
            var rel;
            if (prefix && absPath.indexOf(prefix + '/') === 0) {
                rel = absPath.substring(prefix.length + 1);
            } else {
                rel = absPath;
            }
            var slashIdx = rel.indexOf('/');
            var colName, colFolder;
            if (slashIdx === -1) {
                colName = rootBase;
                colFolder = prefix;
            } else {
                colName = rel.substring(0, slashIdx);
                colFolder = prefix + '/' + colName;
            }
            if (!collections[colName]) {
                collections[colName] = { folder: colFolder, files: [] };
            }
            collections[colName].files.push({
                path: f.path,
                name: f.name,
                tome: 0,
                type: ext,
                size: f.size || 0,
                mtime: f.mtime || 0,
            });
        });
        Object.keys(collections).forEach(function (name) {
            var col = collections[name];
            col.files.sort(function (a, b) {
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });
            col.files.forEach(function (f, i) { f.tome = i + 1; });
        });
        return collections;
    }

    function loadLibraries(cb) {
        state.loadingLibraries = true;
        apiRequest(getBaseUrl() + '/api/reader/libraries').then(function (data) {
            state.loadingLibraries = false;
            if (data && data.success) {
                state.libraries = data.libraries || [];
            } else {
                state.libraries = [];
            }
            if (state.view === 'libraries') {
                renderLibrariesContent();
            }
            if (typeof cb === 'function') cb();
        }).catch(function (err) {
            state.loadingLibraries = false;
            showToast(t('scanError') + ' : ' + (err && err.message ? err.message : err), 'error');
            if (state.view === 'libraries') renderLibrariesContent();
            if (typeof cb === 'function') cb();
        });
    }

    function loadCollections(libraryId, cb) {
        apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + libraryId).then(function (data) {
            if (data && data.success) {
                state.collections = data.collections || [];
            } else {
                state.collections = [];
            }
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.collections = [];
            if (typeof cb === 'function') cb();
        });
    }

    function loadBookmarks() {
        var paths = [];
        if (state.collections) {
            state.collections.forEach(function (c) {
                var files = (c.rules && c.rules.files) ? c.rules.files : [];
                files.forEach(function (f) { paths.push(f.path); });
            });
        }
        if (!paths.length) { renderLibrariesContent(); return; }
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
            renderLibrariesContent();
        }).catch(function () {
            state.bookmarks = {};
            renderLibrariesContent();
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
        return state.navCtx;
    }

    function showFolderPicker(callback) {
        console.log('[Library DEBUG] showFolderPicker called');
        if (typeof RenamerNavigation === 'undefined' || !RenamerNavigation) {
            console.warn('[Library DEBUG] RenamerNavigation not available, falling back to native prompt');
            var p = prompt(t('newLibPlaceholder') || 'Entrez le chemin du dossier (ex: Renamer/MesBD):', '');
            if (p && p.trim()) {
                callback(p.trim().replace(/^\/+/, '').replace(/\/+$/, ''));
            } else {
                callback(null);
            }
            return;
        }

        var nav = RenamerNavigation;
        var ctx = buildNavCtx();

        nav.init(ctx);
        if (!ctx.state.navigation || !ctx.state.navigation.currentPath) {
            nav.setCurrentPath('/');
        }
        nav.invalidateFavoritesCache();

        var existing = document.getElementById('lib-folder-dialog');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-folder-dialog';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10006;display:flex;align-items:center;justify-content:center;';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal';
        dialog.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:0;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);max-width:720px;width:90svw;max-height:85svh;';
        overlay.appendChild(dialog);

        dialog.innerHTML =
            '<div class="renamer-header" style="padding:12px 16px;border-bottom:1px solid var(--nc-border);display:flex;align-items:center;justify-content:space-between;">' +
                '<h3 style="margin:0;font-size:16px;font-weight:600;">' + escapeHtml(t('scanFolderDialog') || 'Sélectionner un dossier à scanner') + '</h3>' +
                '<button type="button" class="renamer-btn-icon renamer-modal-close" aria-label="' + escapeHtml(t('readerClose') || 'Fermer') + '" title="' + escapeHtml(t('readerClose') || 'Fermer') + '" style="font-size:20px;">×</button>' +
            '</div>' +
            '<div id="lib-folder-breadcrumb" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);min-height:32px;"></div>' +
            '<div id="lib-folder-favorites" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);"></div>' +
            '<div id="lib-folder-content" style="flex:1;overflow-y:auto;padding:12px;"></div>' +
            '<div style="padding:12px 16px;border-top:1px solid var(--nc-border);display:flex;justify-content:flex-end;gap:8px;">' +
                '<button type="button" id="lib-folder-cancel" class="renamer-btn">' + escapeHtml(t('scanCancel') || 'Annuler') + '</button>' +
                '<button type="button" id="lib-folder-confirm" class="renamer-btn renamer-btn-primary">' + escapeHtml(t('scanConfirm') || 'Scanner ce dossier') + '</button>' +
            '</div>';

        document.body.appendChild(overlay);

        function closeDialog() {
            if (nav && nav._libFolderListener) {
                nav.removeFolderLoadedListener(nav._libFolderListener);
                nav._libFolderListener = null;
            }
            var el = document.getElementById('lib-folder-dialog');
            if (el) el.remove();
        }

        var closeBtn = dialog.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        var cancelBtn = dialog.querySelector('#lib-folder-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeDialog();
        });
        var escHandler = function(e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        function renderFolderList() {
            var container = document.getElementById('lib-folder-content');
            if (!container) return;

            var folders = (ctx.state.navigation && ctx.state.navigation.folders) ? ctx.state.navigation.folders : [];
            var allFiles = ctx.state.files || [];
            var folderSet = {};
            folders.forEach(function(f) { folderSet[f] = true; });
            var files = allFiles.filter(function(f) { return !folderSet[f]; });

            var html = '<table class="reader-scan-table"><tbody>';

            var parentRowHtml = nav.buildFolderRow();
            if (parentRowHtml) {
                html += parentRowHtml;
            }

            if (folders.length > 0) {
                html += '<tr><td style="padding:0;height:8px;"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('subfolders') || 'Sous-dossiers') + '</div></td></tr>';
                folders.forEach(function(folderPath) {
                    var parts = folderPath.split('/').filter(Boolean);
                    var folderName = parts.length ? parts[parts.length - 1] : (folderPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : folderPath);
                    html += '<tr class="navigation-folder-row reader-scan-folder-row" data-folder-path="' + escapeHtml(folderPath) + '" style="cursor:pointer;">';
                    html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">📁</td>';
                    html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + escapeHtml(folderName) + '</span></td>';
                    html += '</tr>';
                });
            }

            if (files.length > 0) {
                html += '<tr><td style="padding:0;height:8px;"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('scanFiles') || 'Fichiers') + '</div></td></tr>';
                files.forEach(function(filePath) {
                    var baseName = filePath.split('/').pop() || filePath;
                    var ext = baseName.split('.').pop().toLowerCase();
                    var icon = '📄';
                    if (['pdf', 'cbz', 'epub', 'cbr'].indexOf(ext) !== -1) icon = '📚';
                    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) icon = '🖼';
                    html += '<tr class="reader-scan-file-row">';
                    html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">' + icon + '</td>';
                    html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + escapeHtml(baseName) + '</span></td>';
                    html += '</tr>';
                });
            }

            if (!folders.length && !files.length && !parentRowHtml) {
                html += '<tr><td><div class="reader-scan-empty">' + escapeHtml(t('noResults') || 'Aucun élément trouvé') + '</div></td></tr>';
            }

            html += '</tbody></table>';
            container.innerHTML = html;
            nav.bindFolderRow(container);
        }

        function renderFavorites() {
            var container = document.getElementById('lib-folder-favorites');
            if (!container) return;

            var heading = document.createElement('div');
            heading.style.cssText = 'font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;';
            heading.textContent = t('navFavorites') || 'Favoris';
            container.innerHTML = '';
            container.appendChild(heading);

            nav.loadFavorites().then(function(favorites) {
                if (!container.parentNode) return;
                var list = document.createElement('div');
                list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
                if (!favorites || !favorites.length) {
                    var empty = document.createElement('div');
                    empty.style.cssText = 'opacity:0.5;font-size:12px;';
                    empty.textContent = t('navNoFavorites') || 'Aucun favori';
                    list.appendChild(empty);
                } else {
                    favorites.forEach(function(favPath) {
                        var parts = favPath.split('/').filter(Boolean);
                        var folderName = parts.length ? parts[parts.length - 1] : (favPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : favPath);
                        var item = document.createElement('div');
                        item.className = 'reader-scan-favorites-item';
                        item.title = favPath;
                        item.innerHTML = '<span class="reader-scan-favorites-star">★</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(folderName) + '</span>';
                        item.addEventListener('click', function(e) {
                            e.stopPropagation();
                            nav.navigateToFolder(favPath);
                        });
                        list.appendChild(item);
                    });
                }
                container.appendChild(list);
            }).catch(function() {
                if (!container.parentNode) return;
                container.innerHTML += '<div style="opacity:0.5;font-size:12px;">' + escapeHtml(t('networkError') || 'Erreur réseau') + '</div>';
            });
        }

        nav._libFolderListener = function() {
            if (!document.getElementById('lib-folder-breadcrumb')) return;
            nav.renderBreadcrumb('lib-folder-breadcrumb');
            renderFolderList();
            renderFavorites();
        };
        nav.addFolderLoadedListener(nav._libFolderListener);

        nav.renderBreadcrumb('lib-folder-breadcrumb');

        var contentEl = document.getElementById('lib-folder-content');
        if (contentEl) {
            contentEl.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.5;font-size:13px;">' + escapeHtml(t('loading') || 'Chargement…') + '</div>';
        }

        renderFavorites();
        nav.loadFolderContent(nav.getCurrentPath());

        var confirmBtn = dialog.querySelector('#lib-folder-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = function() {
                var path = nav.getCurrentPath();
                var el = document.getElementById('lib-folder-dialog');
                if (el) el.remove();
                if (nav && nav._libFolderListener) {
                    nav.removeFolderLoadedListener(nav._libFolderListener);
                    nav._libFolderListener = null;
                }
                callback(path);
            };
        }
    }

    function createLibrary(rootFolder, name) {
        showToast(t('scanInProgress') + ' ' + rootFolder, 'info');
        apiRequest(getBaseUrl() + '/api/reader/scan', {
            method: 'POST',
            body: JSON.stringify({ path: rootFolder, recursive: true }),
        }).then(function (data) {
            if (!data || !data.success) {
                showToast(t('scanError'), 'error');
                return;
            }
            var files = data.files || [];
            var classified = classifyScan(files, rootFolder);
            var colNames = Object.keys(classified);
            if (colNames.length === 0) {
                showToast(t('noResults'), 'info');
                return;
            }
            apiRequest(getBaseUrl() + '/api/reader/libraries', {
                method: 'POST',
                body: JSON.stringify({ name: name, description: rootFolder }),
            }).then(function (ldata) {
                if (!ldata || !ldata.success) {
                    showToast(t('scanError'), 'error');
                    return;
                }
                var libId = ldata.library.id;
                var pending = colNames.length;
                var created = 0;
                var onEach = function () {
                    created++;
                    if (created >= pending) {
                        showToast(t('scanComplete') + ' — ' + files.length + ' ' + t('documents'), 'info');
                        state.view = 'libraries';
                        loadLibraries();
                    }
                };
                colNames.forEach(function (colName) {
                    var col = classified[colName];
                    apiRequest(getBaseUrl() + '/api/reader/collections', {
                        method: 'POST',
                        body: JSON.stringify({
                            libraryId: libId,
                            name: colName,
                            description: '',
                            rules: { folder: col.folder, files: col.files },
                        }),
                    }).then(function () {}).catch(function () {}).then(onEach);
                });
            }).catch(function () {
                showToast(t('scanError'), 'error');
            });
        }).catch(function (err) {
            showToast(t('scanError'), 'error');
        });
    }

    function addLibrary() {
        if (!state.isAdmin) {
            showToast(t('readOnlyHint'), 'info');
            return;
        }
        showFolderPicker(function (rootFolder) {
            if (!rootFolder) {
                showToast(t('scanCancelled'), 'info');
                return;
            }
            var name = prompt(t('newLibPrompt'), '');
            if (!name || !name.trim()) {
                showToast(t('scanCancelled'), 'info');
                return;
            }
            createLibrary(rootFolder, name.trim());
        });
    }

    function renderReading(tome) {
        var key = tome.path;
        state.currentTome = { path: key, name: tome.name, tome: tome.tome };
        if (state.currentCollection && state.currentCollection.userId) {
            state.ownerUid = state.currentCollection.userId;
        } else if (state.currentLibrary && state.currentLibrary.userId) {
            state.ownerUid = state.currentLibrary.userId;
        } else {
            state.ownerUid = null;
        }
        var isEpub = String(key).toLowerCase().endsWith('.epub');
        if (!isEpub && state.domCache[key]) {
            closeModalOverlay();
            var cached = state.domCache[key];
            cached.style.display = 'flex';
            document.body.appendChild(cached);
            state.readerModal = cached;
            return;
        }

        var existing = document.getElementById('lib-reader-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'lib-reader-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;height:100dvh;width:100dvw;background:#000;display:flex;flex-direction:column;';

        var wrapper = document.createElement('div');
        wrapper.className = 'lib-reading-wrapper';
        wrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;height:100%;';
        overlay.appendChild(wrapper);

        var readerBox = document.createElement('div');
        readerBox.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;height:100%;';
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
                    var ipad = window.RenamerIPadOS;
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (ipad && ipad.isIOS()) {
                        if (ipad.isCSSFullscreen(el)) {
                            ipad.exitCSSFullscreen(el);
                        } else {
                            ipad.enterCSSFullscreen(el);
                        }
                    } else {
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
            readerBox.innerHTML = '<div style="color:#fff;text-align:center;">' + t('unsupported') + '</div>';
        }

        document.body.appendChild(overlay);
        if (!isEpub) { state.domCache[key] = overlay; }
        state.readerModal = overlay;
    }

    function closeReaderModal() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
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
    }

    function closeModalOverlay() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
            var ipad = window.RenamerIPadOS;
            if (ipad && document.body.classList.contains('renamer-ipados-fullscreen')) {
                ipad.exitCSSFullscreen(null);
            }
            overlay.remove();
        }
        state.readerModal = null;
    }

    function renderTomes(collection) {
        var container = document.getElementById('lib-content');
        if (!container) return;
        var backBtn = document.getElementById('lib-back-btn');
        if (backBtn) backBtn.dataset.target = 'library';
        var titleEl = document.getElementById('lib-title');
        if (titleEl) titleEl.textContent = collection.name || '';
        container.innerHTML = '';
        var files = (collection.rules && collection.rules.files) ? collection.rules.files : [];
        if (!files.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }
        var list = document.createElement('div');
        list.style.cssText = 'max-width:720px;margin:0 auto;';
        files.forEach(function (f) {
            var row = document.createElement('div');
            row.className = 'lib-tome';
            row.dataset.path = f.path;
            var icon = '📄';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(f.type) !== -1) icon = '🖼';
            else if (f.type === 'epub') icon = '📚';
            else if (['cbz', 'cbr'].indexOf(f.type) !== -1) icon = '🗜';
            row.innerHTML =
                '<span style="font-size:20px;width:24px;text-align:center;">' + icon + '</span>' +
                '<div style="flex:1;min-width:0;">' +
                    '<p style="margin:0;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(f.name) + '</p>' +
                    '<p style="margin:0;font-size:11px;opacity:0.6;">' +
                        t('tome') + ' ' + (f.tome || 0) + ' · ' + (f.size ? formatSize(f.size) : '') +
                        (state.bookmarks[f.path] ? (' · ' + bookmarkLabel(f.path)) : '') +
                    '</p>' +
                '</div>' +
                (state.bookmarks[f.path] ? '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress" style="flex-shrink:0;margin-left:4px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;opacity:0.6;">&times;</button>' : '') +
                '<button class="lib-btn" style="flex-shrink:0;">' + t('open') + ' →</button>';
            row.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-delete-prog-btn')) {
                    e.stopPropagation();
                    return;
                }
                state.view = 'reading';
                state.currentTome = f;
                var backBtn = document.getElementById('lib-back-btn');
                if (backBtn) {
                    backBtn.style.display = 'inline-flex';
                    backBtn.dataset.target = 'library';
                }
                updateUrl({ library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), read: f.path });
                renderReading(f);
            });
            var delBtn = row.querySelector('.lib-delete-prog-btn');
            if (delBtn) {
                delBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (confirm(t('deleteProgress') + ' ?')) {
                        apiRequest(getBaseUrl() + '/api/reader/progress', {
                            method: 'DELETE',
                            body: JSON.stringify({ path: f.path })
                        }).then(function(data) {
                            if (data && data.success) {
                                delete state.bookmarks[f.path];
                                var metaP = row.querySelector('.lib-tome p:last-child');
                                if (metaP) {
                                    metaP.innerHTML = t('tome') + ' ' + (f.tome || 0) + ' · ' + (f.size ? formatSize(f.size) : '');
                                }
                                delBtn.style.display = 'none';
                                showToast(t('progressDeleted'), 'info');
                            } else {
                                showToast(t('scanError'), 'error');
                            }
                        }).catch(function() {
                            showToast(t('scanError'), 'error');
                        });
                    }
                });
            }
            list.appendChild(row);
        });
        container.appendChild(list);
    }

    function formatSize(b) {
        if (!b) return '';
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024) return (b / 1024).toFixed(0) + ' KB';
        return b + ' B';
    }

    function bookmarkLabel(path) {
        var b = state.bookmarks[path];
        if (!b) return '';
        if (b.type === 'pdf_page' || b.type === 'cbz_page') return t('page') + ' ' + b.value + '/' + b.total;
        if (b.type === 'epub_percent') return b.value + t('percent');
        if (b.type === 'image_viewed') return '✓';
        return '';
    }

    function renderCollections(library) {
        var container = document.getElementById('lib-content');
        if (!container) return;
        var backBtn = document.getElementById('lib-back-btn');
        if (backBtn) backBtn.dataset.target = 'libraries';
        var titleEl = document.getElementById('lib-title');
        if (titleEl) titleEl.textContent = library.name || '';
        container.innerHTML = '';
        var cols = state.collections || [];
        if (!cols.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.textContent = 'Aucune collection';
            container.appendChild(empty);
            return;
        }
        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        cols.forEach(function (col) {
            var card = document.createElement('div');
            card.className = 'lib-card';
            var files = (col.rules && col.rules.files) ? col.rules.files : [];
            card.innerHTML =
                '<div class="lib-icon">📁</div>' +
                '<div class="lib-name" title="' + escapeHtml(col.name || '') + '">' + escapeHtml(col.name || '') + '</div>' +
                '<div class="lib-meta">' + files.length + ' ' + t('documents') + '</div>';
            card.addEventListener('click', function () {
                state.view = 'tomes';
                state.currentCollection = col;
                var backBtn = document.getElementById('lib-back-btn');
                if (backBtn) {
                    backBtn.style.display = 'inline-flex';
                    backBtn.dataset.target = 'library';
                }
                updateUrl({ library: String(state.currentLibrary.id), collection: String(col.id) });
                renderTomes(col);
            });
            grid.appendChild(card);
        });
        container.appendChild(grid);
    }

    function renderLibrariesContent() {
        var container = document.getElementById('lib-content');
        var titleEl = document.getElementById('lib-title');
        if (titleEl) titleEl.textContent = t('title');
        if (!container) return;
        container.innerHTML = '';

        var libs = state.libraries || [];

        if (libs.length === 0) {
            var emptyHint = state.isAdmin
                ? ('<div style="margin-bottom:16px;">' + t('emptyHint') + '</div>' +
                   '<button class="lib-btn lib-btn-primary" id="lib-add-lib-btn">' + t('addLibrary') + '</button>')
                : ('<div style="margin-bottom:16px;">' + t('readOnlyHint') + '</div>');
            container.innerHTML =
                '<div class="lib-empty">' +
                    '<div style="font-size:28px;margin-bottom:8px;">📚</div>' +
                    '<div style="font-weight:600;margin-bottom:8px;">' + t('empty') + '</div>' +
                    emptyHint +
                '</div>';
            var addBtn = document.getElementById('lib-add-lib-btn');
            if (addBtn) addBtn.addEventListener('click', addLibrary);
            return;
        }

        var wrap = document.createElement('div');

        var continueSection = document.createElement('div');
        continueSection.className = 'lib-section';
        var continueTitle = document.createElement('div');
        continueTitle.className = 'lib-section-title';
        continueTitle.textContent = t('continueReading');
        continueSection.appendChild(continueTitle);
        var continueList = document.createElement('div');

        var progPaths = [];
        libs.forEach(function (lib) {
            loadCollections(lib.id, function () {
                (state.collections || []).forEach(function (c) {
                    var files = (c.rules && c.rules.files) ? c.rules.files : [];
                    files.forEach(function (f) { progPaths.push({ path: f.path, lib: lib, col: c, file: f }); });
                });
                // render once collections loaded; bookmarks loaded separately
                renderProgressRows(continueList, progPaths);
            });
        });

        if (!Object.keys(state.bookmarks).length && !progPaths.length) {
            var emptyProg = document.createElement('div');
            emptyProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            emptyProg.textContent = t('noProgress');
            continueList.appendChild(emptyProg);
        }
        continueSection.appendChild(continueList);
        wrap.appendChild(continueSection);

        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        libs.forEach(function (lib) {
            var card = document.createElement('div');
            card.className = 'lib-card';
            card.innerHTML =
                '<div class="lib-icon">📚</div>' +
                '<div class="lib-name" title="' + escapeHtml(lib.name || '') + '">' + escapeHtml(lib.name || '') + '</div>' +
                '<div class="lib-meta">' + (lib.description ? escapeHtml(lib.description) : '') + '</div>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-delete-btn')) return;
                state.view = 'collection';
                state.currentLibrary = lib;
                var backBtn = document.getElementById('lib-back-btn');
                if (backBtn) {
                    backBtn.style.display = 'inline-flex';
                    backBtn.dataset.target = 'libraries';
                }
                updateUrl({ library: String(lib.id) });
                loadCollections(lib.id, function () { renderCollections(lib); });
            });
            if (state.isAdmin) {
                var delBtn = document.createElement('button');
                delBtn.className = 'lib-delete-btn';
                delBtn.textContent = '×';
                delBtn.title = 'Supprimer la librairie';
                delBtn.style.cssText = 'position:absolute;top:4px;right:4px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;';
                delBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (confirm('Supprimer la librairie "' + (lib.name || '') + '" ?')) {
                        apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, {
                            method: 'DELETE'
                        }).then(function (data) {
                            if (data && data.success) {
                                state.libraries = (state.libraries || []).filter(function(l) { return l.id !== lib.id; });
                                render();
                            }
                        }).catch(function () {});
                    }
                });
                card.style.position = 'relative';
                card.appendChild(delBtn);
            }
            grid.appendChild(card);
        });
        wrap.appendChild(grid);

        var favSection = document.createElement('div');
        favSection.className = 'lib-section';
        var favTitle = document.createElement('div');
        favTitle.className = 'lib-section-title';
        favTitle.textContent = t('myFavorites') || 'My Favorites';
        favSection.appendChild(favTitle);
        var favList = document.createElement('div');
        favList.className = 'lib-favorites-list';
        favSection.appendChild(favList);
        wrap.appendChild(favSection);

        var favEmpty = document.createElement('div');
        favEmpty.className = 'lib-empty';
        favEmpty.style.cssText = 'opacity:0.5;font-size:13px;padding:12px;';
        favEmpty.textContent = t('favoritesHint') || 'Loading favorites…';
        favList.appendChild(favEmpty);

        container.appendChild(wrap);

        loadAllCollections(function () {
            loadReaderFavoritesList(function () {
                if (!document.getElementById('lib-content')) return;
                favList.innerHTML = '';
                var favorites = state.allFavorites || [];
                if (!favorites.length) {
                    var empty = document.createElement('div');
                    empty.className = 'lib-empty';
                    empty.style.cssText = 'opacity:0.5;font-size:13px;padding:12px;';
                    empty.textContent = t('noFavorites') || 'No favorites';
                    favList.appendChild(empty);
                    return;
                }

                var grouped = {};
                favorites.forEach(function (fav) {
                    var fctx = findLibraryCollectionForPath(fav.path);
                    if (!fctx) return;
                    var libKey = String(fctx.lib.id);
                    if (!grouped[libKey]) grouped[libKey] = { lib: fctx.lib, collections: {} };
                    var colKey = String(fctx.col.id);
                    if (!grouped[libKey].collections[colKey]) grouped[libKey].collections[colKey] = { col: fctx.col, files: [] };
                    grouped[libKey].collections[colKey].files.push({ file: fctx.file, pages: fav.pages });
                });

                var hasAny = false;
                Object.keys(grouped).forEach(function (libKey) {
                    var libGroup = grouped[libKey];
                    var libHeader = document.createElement('div');
                    libHeader.className = 'lib-fav-group-header';
                    libHeader.style.cssText = 'font-weight:600;font-size:13px;padding:8px 12px 4px;background:var(--nc-bg-hover);border-radius:4px;margin-top:6px;';
                    libHeader.textContent = libGroup.lib.name || '';
                    favList.appendChild(libHeader);

                    Object.keys(libGroup.collections).forEach(function (colKey) {
                        var colGroup = libGroup.collections[colKey];
                        var colHeader = document.createElement('div');
                        colHeader.className = 'lib-fav-col-header';
                        colHeader.style.cssText = 'font-size:12px;font-weight:600;opacity:0.6;padding:6px 12px 2px 12px;';
                        colHeader.textContent = colGroup.col.name || '';
                        favList.appendChild(colHeader);

                        colGroup.files.forEach(function (entry) {
                            hasAny = true;
                            var f = entry.file;
                            var pages = entry.pages || [];
                            var row = document.createElement('div');
                            row.className = 'lib-tome';
                            row.dataset.path = f.path;
                            var icon = '📄';
                            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(f.type) !== -1) icon = '🖼';
                            else if (f.type === 'epub') icon = '📚';
                            else if (['cbz', 'cbr'].indexOf(f.type) !== -1) icon = '🗜';
                            var label = f.name || f.path.split('/').pop();
                            var favText = pages.length === 1
                                ? (t('fr') === 'fr' ? '1 page favorite' : '1 page favorite')
                                : (t('fr') === 'fr' ? pages.length + ' pages favorites' : pages.length + ' pages favorite');
                            var meta = t('tome') + ' ' + (f.tome || 0) + ' · ' + (f.size ? formatSize(f.size) : '') + (state.bookmarks[f.path] ? (' · ' + bookmarkLabel(f.path)) : '');
                            row.innerHTML =
                                '<span style="font-size:20px;width:24px;text-align:center;">' + icon + '</span>' +
                                '<div style="flex:1;min-width:0;">' +
                                    '<p style="margin:0;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</p>' +
                                    '<p style="margin:0;font-size:11px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(meta) + '</p>' +
                                '</div>' +
                                '<span style="font-size:11px;opacity:0.7;margin-right:4px;white-space:nowrap;">' + escapeHtml(favText) + '</span>' +
                                '<span style="font-size:11px;opacity:0.6;">→</span>';
                            row.addEventListener('click', function (e) {
                                state.view = 'reading';
                                state.currentLibrary = fctx.lib;
                                state.currentCollection = fctx.col;
                                state.currentTome = { path: f.path, name: f.name, tome: f.tome };
                                var backBtn = document.getElementById('lib-back-btn');
                                if (backBtn) {
                                    backBtn.style.display = 'inline-flex';
                                    backBtn.dataset.target = 'libraries';
                                }
                                updateUrl({ read: f.path });
                                renderReading(f);
                            });
                            favList.appendChild(row);
                        });
                    });
                });

                if (!hasAny) {
                    favList.innerHTML = '';
                    var noFav = document.createElement('div');
                    noFav.className = 'lib-empty';
                    noFav.style.cssText = 'opacity:0.5;font-size:13px;padding:12px;';
                    noFav.textContent = t('noFavorites') || 'No favorites';
                    favList.appendChild(noFav);
                }
            });
        });
    }

    function renderProgressRows(list, progPaths) {
        list.innerHTML = '';
        if (!progPaths.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            empty.textContent = t('noProgress');
            list.appendChild(empty);
            return;
        }
        apiRequest(getBaseUrl() + '/api/reader/progress/read', {
            method: 'POST',
            body: JSON.stringify({ paths: progPaths.map(function(p) { return p.path; }) })
        }).then(function (data) {
            if (data && data.success && data.progress) {
                state.bookmarks = {};
                Object.keys(data.progress).forEach(function(k) {
                    state.bookmarks['/' + k] = data.progress[k];
                });
            }
            list.innerHTML = '';
            progPaths.forEach(function (p) {
                if (!state.bookmarks[p.path]) return;
                var row = document.createElement('div');
                row.className = 'lib-row';
                row.dataset.path = p.path;
                var label = p.file.name || p.file.path.split('/').pop();
                row.innerHTML =
                    '<div style="display:flex;align-items:center;flex:1;min-width:0;">' +
                        '<div style="display:flex;flex-direction:column;flex:1;min-width:0;">' +
                            '<div style="font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(label) + '</div>' +
                            '<div class="lib-prog">' + bookmarkLabel(p.path) + '</div>' +
                        '</div>' +
                        '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress" style="flex-shrink:0;margin-left:8px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;">&times;</button>' +
                    '</div>' +
                    '<div style="font-size:11px;opacity:0.6;margin-left:8px;">→</div>';
                row.addEventListener('click', function (e) {
                    if (e.target.classList.contains('lib-delete-prog-btn')) {
                        e.stopPropagation();
                        return;
                    }
                    state.view = 'reading';
                    state.currentCollection = p.col;
                    state.currentTome = { path: p.file.path, name: p.file.name, tome: p.file.tome };
                    var backBtn = document.getElementById('lib-back-btn');
                    if (backBtn) {
                        backBtn.style.display = 'inline-flex';
                        backBtn.dataset.target = 'libraries';
                    }
                    updateUrl({ read: p.file.path });
                    renderReading(p.file);
                });
                var delBtn = row.querySelector('.lib-delete-prog-btn');
                if (delBtn) {
                    delBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (confirm(t('deleteProgress') + ' ?')) {
                            apiRequest(getBaseUrl() + '/api/reader/progress', {
                                method: 'DELETE',
                                body: JSON.stringify({ path: p.path })
                            }).then(function(data) {
                                if (data && data.success) {
                                    delete state.bookmarks[p.path];
                                    row.remove();
                                    showToast(t('progressDeleted'), 'info');
                                } else {
                                    showToast(t('scanError'), 'error');
                                }
                            }).catch(function() {
                                showToast(t('scanError'), 'error');
                            });
                        }
                    });
                }
                list.appendChild(row);
            });
        }).catch(function () {
            list.innerHTML = '';
        });
    }

    function render() {
        var container = document.getElementById('lib-content');
        var backBtn = document.getElementById('lib-back-btn');
        if (!container) return;

        if (state.view !== 'reading') {
            closeReaderModal();
        }

        if (state.view === 'reading' && state.currentTome) {
            return;
        }

        container.innerHTML = '';

        var titleEl = document.getElementById('lib-title');
        if (titleEl) titleEl.textContent = t('title');

        if (state.view === 'libraries') {
            renderLibrariesContent();
        } else if (state.view === 'collection' && state.currentLibrary) {
            renderCollections(state.currentLibrary);
        } else if (state.view === 'tomes' && state.currentCollection) {
            renderTomes(state.currentCollection);
        }
    }

    function buildCtx() {
        return {
            state: state,
            t: t,
            escapeHtml: escapeHtml,
            getBaseUrl: getBaseUrl,
            apiRequest: apiRequest,
            showToast: showToast,
            updateUrl: updateUrl,
            closeReader: function() {
                closeReaderModal();
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
        };
    }

    function updateUrl(params) {
        var search = [];
        if (params.library) search.push('library=' + encodeURIComponent(params.library));
        if (params.collection) search.push('collection=' + encodeURIComponent(params.collection));
        if (params.read) search.push('read=' + encodeURIComponent(params.read));
        var newUrl = window.location.pathname + (search.length ? '?' + search.join('&') : '');
        window.history.replaceState(null, '', newUrl);
    }

    function handleUrlParams() {
        var params = new URLSearchParams(window.location.search);
        var libId = params.get('library');
        var colId = params.get('collection');
        var readPath = params.get('read');
        if (!libId && !colId && !readPath) {
            state.view = 'libraries';
            loadLibraries();
            return;
        }
        loadLibraries(function () {
            if (libId) {
                var lib = (state.libraries || []).find(function(l) { return String(l.id) === libId; });
                if (!lib) { state.view = 'libraries'; return; }
                loadCollections(lib.id, function () {
                    state.currentLibrary = lib;
                    if (colId) {
                        var col = (state.collections || []).find(function(c) { return String(c.id) === colId; });
                        if (!col) {
                            state.view = 'collection';
                            renderCollections(lib);
                            return;
                        }
                        loadBookmarksForCollection(lib, col, function () {
                            state.currentCollection = col;
                            state.view = 'tomes';
                            renderTomes(col);
                            if (readPath) {
                                var found = findTomeByPath(readPath);
                                if (found) {
                                    state.currentTome = found;
                                    var backBtn = document.getElementById('lib-back-btn');
                                    if (backBtn) {
                                        backBtn.style.display = 'inline-flex';
                                        backBtn.dataset.target = 'library';
                                    }
                                    renderReading(found);
                                }
                            }
                        });
                    } else {
                        state.currentLibrary = lib;
                        state.view = 'collection';
                        renderCollections(lib);
                        if (readPath) {
                            var f2 = findTomeByPath(readPath);
                            if (f2) {
                                state.currentTome = f2;
                                var backBtn2 = document.getElementById('lib-back-btn');
                                if (backBtn2) {
                                    backBtn2.style.display = 'inline-flex';
                                    backBtn2.dataset.target = 'library';
                                }
                                renderReading(f2);
                            }
                        }
                    }
                });
            } else if (colId) {
                var foundLib = null;
                var foundCol = null;
                var pending = (state.libraries || []).length;
                if (!pending) { state.view = 'libraries'; return; }
                (state.libraries || []).forEach(function(lib) {
                    loadCollections(lib.id, function () {
                        if (!foundCol) {
                            var match = (state.collections || []).find(function(c) { return String(c.id) === colId; });
                            if (match) {
                                foundLib = lib;
                                foundCol = match;
                            }
                        }
                        pending--;
                        if (pending === 0) {
                            if (foundCol) {
                                loadBookmarksForCollection(foundLib, foundCol, function () {
                                    state.currentLibrary = foundLib;
                                    state.currentCollection = foundCol;
                                    state.view = 'tomes';
                                    renderTomes(foundCol);
                                    if (readPath) {
                                        var found = findTomeByPath(readPath);
                                        if (found) {
                                            state.currentTome = found;
                                            var backBtn = document.getElementById('lib-back-btn');
                                            if (backBtn) {
                                                backBtn.style.display = 'inline-flex';
                                                backBtn.dataset.target = 'library';
                                            }
                                            renderReading(found);
                                        }
                                    }
                                });
                            } else {
                                state.view = 'libraries';
                                render();
                            }
                        }
                    });
                });
            } else if (readPath) {
                var pendingR = (state.libraries || []).length;
                if (!pendingR) { state.view = 'libraries'; return; }
                var foundTome = null;
                var foundLibR = null;
                var foundColR = null;
                (state.libraries || []).forEach(function(lib) {
                    loadCollections(lib.id, function () {
                        if (!foundTome) {
                            for (var i = 0; i < (state.collections || []).length; i++) {
                                var files = (state.collections[i].rules && state.collections[i].rules.files) ? state.collections[i].rules.files : [];
                                for (var j = 0; j < files.length; j++) {
                                    if (decodeURIComponent(files[j].path) === readPath || files[j].path === readPath) {
                                        foundTome = files[j];
                                        foundLibR = lib;
                                        foundColR = state.collections[i];
                                        break;
                                    }
                                }
                                if (foundTome) break;
                            }
                        }
                        pendingR--;
                        if (pendingR === 0) {
                            if (foundTome) {
                                loadBookmarksForTome(foundLibR, foundColR, function () {
                                    state.view = 'reading';
                                    state.currentCollection = foundColR;
                                    state.currentTome = foundTome;
                                    var backBtn = document.getElementById('lib-back-btn');
                                    if (backBtn) {
                                        backBtn.style.display = 'inline-flex';
                                        backBtn.dataset.target = 'libraries';
                                    }
                                    renderReading(foundTome);
                                });
                            } else {
                                state.view = 'libraries';
                                render();
                            }
                        }
                    });
                });
            }
        });
    }

    function findTomeByPath(readPath) {
        for (var i = 0; i < (state.collections || []).length; i++) {
            var files = (state.collections[i].rules && state.collections[i].rules.files) ? state.collections[i].rules.files : [];
            for (var j = 0; j < files.length; j++) {
                if (decodeURIComponent(files[j].path) === readPath || files[j].path === readPath) {
                    return files[j];
                }
            }
        }
        return null;
    }

    function loadBookmarksForCollection(lib, col, cb) {
        var files = (col.rules && col.rules.files) ? col.rules.files : [];
        var paths = files.map(function(f) { return f.path; });
        loadBookmarksForPaths(paths, cb);
    }

    function loadBookmarksForTome(lib, col, cb) {
        var paths = (col.rules && col.rules.files) ? col.rules.files.map(function(f) { return f.path; }) : [];
        loadBookmarksForPaths(paths, cb);
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

    function loadAllCollections(cb) {
        var libs = state.libraries || [];
        if (!libs.length) {
            state.allCollections = {};
            if (typeof cb === 'function') cb();
            return;
        }
        var pending = libs.length;
        libs.forEach(function (lib) {
            apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + lib.id).then(function (data) {
                state.allCollections[lib.id] = (data && data.success && data.collections) ? data.collections : [];
                pending--;
                if (pending === 0) {
                    if (typeof cb === 'function') cb();
                }
            }).catch(function () {
                state.allCollections[lib.id] = [];
                pending--;
                if (pending === 0) {
                    if (typeof cb === 'function') cb();
                }
            });
        });
    }

    function loadReaderFavoritesList(cb) {
        apiRequest(getBaseUrl() + '/api/reader/favorites/list').then(function (data) {
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
        var libs = state.libraries || [];
        for (var i = 0; i < libs.length; i++) {
            var lib = libs[i];
            var cols = state.allCollections[lib.id] || [];
            for (var j = 0; j < cols.length; j++) {
                var col = cols[j];
                var files = (col.rules && col.rules.files) ? col.rules.files : [];
                for (var k = 0; k < files.length; k++) {
                    if (decodeURIComponent(files[k].path) === path || files[k].path === path) {
                        return { lib: lib, col: col, file: files[k] };
                    }
                }
            }
        }
        return null;
    }

    function renderFavoritesSection(wrap) {
        var section = document.createElement('div');
        section.className = 'lib-section';
        var title = document.createElement('div');
        title.className = 'lib-section-title';
        title.textContent = t('myFavorites') || 'My Favorites';
        section.appendChild(title);
        var list = document.createElement('div');
        list.className = 'lib-favorites-list';
        section.appendChild(list);
        wrap.appendChild(section);

        if (!state.allFavorites || !state.allFavorites.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty-fav';
            empty.style.cssText = 'opacity:0.5;font-size:13px;padding:12px;';
            empty.textContent = t('noFavorites') || 'No favorites';
            list.appendChild(empty);
            return;
        }

        var grouped = {};
        state.allFavorites.forEach(function (fav) {
            var ctx = findLibraryCollectionForPath(fav.path);
            if (!ctx) return;
            var libKey = String(ctx.lib.id);
            if (!grouped[libKey]) grouped[libKey] = { lib: ctx.lib, collections: {} };
            var colKey = String(ctx.col.id);
            if (!grouped[libKey].collections[colKey]) grouped[libKey].collections[colKey] = { col: ctx.col, files: [] };
            grouped[libKey].collections[colKey].files.push({ file: ctx.file, pages: fav.pages });
        });

        Object.keys(grouped).forEach(function (libKey) {
            var libGroup = grouped[libKey];
            var libHeader = document.createElement('div');
            libHeader.className = 'lib-fav-group-header';
            libHeader.style.cssText = 'font-weight:600;font-size:13px;padding:8px 12px 4px;background:var(--nc-bg-hover);border-radius:4px;margin-top:6px;';
            libHeader.textContent = libGroup.lib.name || '';
            list.appendChild(libHeader);

            Object.keys(libGroup.collections).forEach(function (colKey) {
                var colGroup = libGroup.collections[colKey];
                var colHeader = document.createElement('div');
                colHeader.className = 'lib-fav-col-header';
                colHeader.style.cssText = 'font-size:12px;font-weight:600;opacity:0.6;padding:6px 12px 2px 12px;';
                colHeader.textContent = colGroup.col.name || '';
                list.appendChild(colHeader);

                colGroup.files.forEach(function (entry) {
                    var f = entry.file;
                    var pages = entry.pages || [];
                    var row = document.createElement('div');
                    row.className = 'lib-tome';
                    row.dataset.path = f.path;
                    var icon = '📄';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(f.type) !== -1) icon = '🖼';
                    else if (f.type === 'epub') icon = '📚';
                    else if (['cbz', 'cbr'].indexOf(f.type) !== -1) icon = '🗜';
                    var label = f.name || f.path.split('/').pop();
                    var favLabel = (pages.length === 1 ? '1 page favorite' : pages.length + ' pages favorite');
                    if (t('fr') === 'fr' || (navigator.language && navigator.language.slice(0, 2) === 'fr')) {
                        favLabel = pages.length === 1 ? '1 page favorite' : pages.length + ' pages favorites';
                    }
                    var meta = t('tome') + ' ' + (f.tome || 0) + ' · ' + (f.size ? formatSize(f.size) : '') + (state.bookmarks[f.path] ? (' · ' + bookmarkLabel(f.path)) : '');
                    row.innerHTML =
                        '<span style="font-size:20px;width:24px;text-align:center;">' + icon + '</span>' +
                        '<div style="flex:1;min-width:0;">' +
                            '<p style="margin:0;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</p>' +
                            '<p style="margin:0;font-size:11px;opacity:0.6;">' + meta + '</p>' +
                        '</div>' +
                        '<span style="font-size:11px;opacity:0.7;margin-right:4px;">' + escapeHtml(favLabel) + '</span>' +
                        '<span style="font-size:11px;opacity:0.6;">→</span>';
                    row.addEventListener('click', function (e) {
                        state.view = 'reading';
                        state.currentLibrary = ctx.lib;
                        state.currentCollection = ctx.col;
                        state.currentTome = { path: f.path, name: f.name, tome: f.tome };
                        var backBtn = document.getElementById('lib-back-btn');
                        if (backBtn) {
                            backBtn.style.display = 'inline-flex';
                            backBtn.dataset.target = 'libraries';
                        }
                        updateUrl({ read: f.path });
                        renderReading(f);
                    });
                    list.appendChild(row);
                });
            });
        });
    }

    function bind() {
        var scanBtn = document.getElementById('lib-scan-btn');
        if (scanBtn && !scanBtn._bound) {
            scanBtn._bound = true;
            scanBtn.addEventListener('click', addLibrary);
        }
        var backBtn = document.getElementById('lib-back-btn');
        if (backBtn && !backBtn._bound) {
            backBtn._bound = true;
            backBtn.addEventListener('click', function () {
                var target = backBtn.dataset.target || 'libraries';
                if (target === 'libraries') {
                    state.view = 'libraries';
                    state.currentLibrary = null;
                    state.currentCollection = null;
                } else if (target === 'library') {
                    state.view = 'collection';
                    state.currentCollection = null;
                } else {
                    state.view = 'libraries';
                }
                var titleEl = document.getElementById('lib-title');
                if (titleEl) titleEl.textContent = t('title');
                render();
                updateUrl({});
            });
        }
        handleUrlParams();
    }

    function init() {
        var pageRoot = document.getElementById('library-page');
        if (pageRoot && pageRoot.dataset && pageRoot.dataset.isadmin) {
            state.isAdmin = pageRoot.dataset.isadmin === 'true';
        }
        injectStyles();
        renderShell();
        bind();
    }

    function renderShell() {
        PAGE_ROOT.innerHTML = '';
        PAGE_ROOT.className = 'lib-page-app';
        var header = document.createElement('div');
        header.className = 'lib-page-header';
        header.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;">' +
                '<button type="button" id="lib-back-btn" class="lib-btn" title="' + escapeHtml(t('back')) + '" style="display:none;">←</button>' +
                '<span id="lib-title">' + escapeHtml(t('title')) + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
                (state.isAdmin ? '<button type="button" id="lib-scan-btn" class="lib-btn lib-btn-primary">' + escapeHtml(t('scan')) + '</button>' : '') +
            '</div>';
        var content = document.createElement('div');
        content.id = 'lib-content';
        content.className = 'lib-page-content';
        PAGE_ROOT.appendChild(header);
        PAGE_ROOT.appendChild(content);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
