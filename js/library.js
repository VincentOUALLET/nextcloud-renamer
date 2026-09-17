(function () {
    'use strict';

    var PAGE_ROOT = document.getElementById('library-page');
    if (!PAGE_ROOT) return;
    PAGE_ROOT.id = 'library-page';

    var SUPPORTED_EXT = ['pdf', 'cbz', 'cbr', 'epub', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    var LIB_ACCENT = '#a855f7';
    var STAR_OUTLINE_PATH = 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z';
    var FAV_STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + STAR_OUTLINE_PATH + '"></path></svg>';
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
        readerBrowsingMode: false,
        sidebarOpen: true,
        readerFavoritesOnly: false,
        covers: {},          // Map<cheminSource, coverUrl|null> (bulké par /api/covers/list)
        coversLoaded: false, // true après le premier bulk covers
        collectionsByLib: {}, // Map<libId, collections[]> pour couvrir les cards bibliothèque
        coverWidth: 300,     // taille rendue serveur (px) — le browser downscale
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
            librariesLabel: 'Bibliothèques',
            toggleSidebar: 'Réduire le menu',
            navigationBreadcrumbRoot: 'Racine',
            readerClose: 'Fermer',
            loading: 'Chargement…',
            rename: 'Renommer',
            renameLibrary: 'Renommer la librairie',
            renameCollection: 'Renommer la collection',
            renamed: 'Renommé',
            renamedError: 'Renommage échoué',
            contextDelete: 'Supprimer',
            contextDeleteLib: 'Supprimer la librairie',
            contextDeleteCol: 'Supprimer la collection',
            deleted: 'Supprimé',
            deleteLibConfirm: 'Supprimer la librairie "{name}" ?',
            deleteColConfirm: 'Supprimer la collection "{name}" ?',
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
            librariesLabel: 'Libraries',
            toggleSidebar: 'Expand menu',
            navigationBreadcrumbRoot: 'Root',
            readerClose: 'Close',
            loading: 'Loading…',
            rename: 'Rename',
            renameLibrary: 'Rename library',
            renameCollection: 'Rename collection',
            renamed: 'Renamed',
            renamedError: 'Rename failed',
            contextDelete: 'Delete',
            contextDeleteLib: 'Delete library',
            contextDeleteCol: 'Delete collection',
            deleted: 'Deleted',
            deleteLibConfirm: 'Delete library "{name}" ?',
            deleteColConfirm: 'Delete collection "{name}" ?',
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

    function coverUrl(path) {
        var rel = state.covers && state.covers[path];
        return rel ? (getBaseUrl() + rel) : null;
    }

    function coverOfFirstTome(tomePaths) {
        for (var i = 0; i < (tomePaths || []).length; i++) {
            var p = tomePaths[i].path;
            var u = coverUrl(p);
            if (u) return u;
        }
        return null;
    }

    function loadCoversBulk(tomePaths, cb) {
        // Un seul bulk par cycle libraries : évite les boucles render↔load.
        if (state.coversLoaded) {
            if (typeof cb === 'function') cb(false);
            return;
        }
        var paths = [];
        var seen = {};
        (tomePaths || []).forEach(function (f) {
            var p = f.path;
            if (p && !seen[p]) {
                seen[p] = true;
                paths.push(p);
            }
        });
        if (!paths.length) {
            state.coversLoaded = true;
            if (typeof cb === 'function') cb(false);
            return;
        }
        state.coversLoaded = true; // verrou anti-double-fetch
        apiRequest(getBaseUrl() + '/api/covers/list', {
            method: 'POST',
            body: JSON.stringify({ paths: paths, width: state.coverWidth || 300 })
        }).then(function (data) {
            if (data && data.success && data.covers) {
                Object.keys(data.covers).forEach(function (k) {
                    state.covers[k] = data.covers[k];
                });
                if (window.console && console.debug) {
                    console.debug('[Renamer covers] merged covers map (paths=' + paths.length + ')');
                }
            } else if (window.console && console.warn) {
                console.warn('[Renamer covers] coversList error:', data && data.error ? data.error : data);
            }
            if (typeof cb === 'function') cb(true);
        }).catch(function (err) {
            if (window.console && console.error) {
                console.error('[Renamer covers] coversList failed:', err && err.message ? err.message : err);
            }
            if (typeof cb === 'function') cb(false);
        });
    }

    function renderTomeIcon(f) {
        var icon = fileIcon(f.type);
        var url = coverUrl(f.path);
        if (url) {
            return '<img class="lib-card-img" src="' + url + '" alt="' + escapeHtml(icon) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">';
        }
        return icon;
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

    function hideContextMenu() {
        var m = document.getElementById('lib-context-menu');
        if (m) {
            m.remove();
        }
    }

    function showContextMenu(e, items, target) {
        e.preventDefault();
        hideContextMenu();
        var x = e.clientX;
        var y = e.clientY;
        var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        var m = document.createElement('div');
        m.id = 'lib-context-menu';
        m.className = 'lib-context-menu';
        m.style.left = x + 'px';
        m.style.top = y + 'px';
        items.forEach(function (it) {
            if (it.type === 'separator') {
                var sep = document.createElement('div');
                sep.className = 'lib-context-separator';
                m.appendChild(sep);
                return;
            }
            var item = document.createElement('div');
            item.className = 'lib-context-item';
            if (it.icon) {
                var span = document.createElement('span');
                span.style.cssText = 'font-size:14px;';
                span.textContent = it.icon;
                item.appendChild(span);
            }
            var label = document.createElement('span');
            label.textContent = it.label;
            item.appendChild(label);
            item.addEventListener('mousedown', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (typeof it.action === 'function') {
                    try { it.action(target); } catch (err) { showToast((err && err.message) || t('renamedError'), 'error'); }
                }
                hideContextMenu();
            });
            m.appendChild(item);
        });
        document.body.appendChild(m);
        var rect = m.getBoundingClientRect();
        if (rect.right > viewportWidth) m.style.left = Math.max(0, viewportWidth - rect.width - 8) + 'px';
        if (rect.bottom > viewportHeight) m.style.top = Math.max(0, viewportHeight - rect.height - 8) + 'px';
        var onOutside = function (ev) {
            if (ev.type === 'contextmenu') return;
            var menu = document.getElementById('lib-context-menu');
            if (!menu) {
                document.removeEventListener('click', onOutside);
                document.removeEventListener('contextmenu', onOutside);
                return;
            }
            if (ev.target && (ev.target === menu || (ev.target.closest && ev.target.closest('.lib-context-menu')))) return;
            hideContextMenu();
            document.removeEventListener('click', onOutside);
            document.removeEventListener('contextmenu', onOutside);
        };
        setTimeout(function () {
            document.addEventListener('click', onOutside);
            document.addEventListener('contextmenu', onOutside);
        }, 0);
    }

    function promptRename(label, current, cb) {
        var name = prompt(label + ':', current || '');
        if (name === null) return;
        name = (name || '').trim();
        if (!name) return;
        cb(name);
    }

    function renameLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        promptRename(t('renameLibrary'), lib.name || '', function (name) {
            var payload = { name: name, description: lib.description || '' };
            apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, {
                method: 'PUT',
                body: JSON.stringify(payload)
            }).then(function (data) {
                if (data && data.success) {
                    if (data.library) { lib.name = data.library.name; lib.description = data.library.description || ''; }
                    else { lib.name = name; }
                    showToast(t('renamed'), 'info');
                    render();
                } else {
                    showToast(t('renamedError'), 'error');
                }
            }).catch(function () { showToast(t('renamedError'), 'error'); });
        });
    }

    function deleteLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        if (!confirm(t('deleteLibConfirm').replace('{name}', lib.name || ''))) { return; }
        apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, { method: 'DELETE' }).then(function (data) {
            if (data && data.success) {
                state.libraries = (state.libraries || []).filter(function (l) { return String(l.id) !== String(lib.id); });
                showToast(t('deleted'), 'info');
                render();
            } else {
                showToast(t('scanError'), 'error');
            }
        }).catch(function () { showToast(t('scanError'), 'error'); });
    }

    function renameCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        promptRename(t('renameCollection'), col.name || '', function (name) {
            var payload = { name: name, description: col.description || '', rules: col.rules || { files: [] } };
            apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'PUT', body: JSON.stringify(payload) }).then(function (data) {
                if (data && data.success) {
                    var r = data.collection || {};
                    if (r.name != null) { col.name = r.name; col.description = r.description || ''; col.rules = r.rules || (col.rules || { files: [] }); }
                    else { col.name = name; }
                    showToast(t('renamed'), 'info');
                    if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
                } else {
                    showToast(t('renamedError'), 'error');
                }
            }).catch(function () { showToast(t('renamedError'), 'error'); });
        });
    }

    function deleteCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        if (!confirm(t('deleteColConfirm').replace('{name}', col.name || ''))) { return; }
        apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'DELETE' }).then(function (data) {
            if (data && data.success) {
                if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
                showToast(t('deleted'), 'info');
            } else {
                showToast(t('scanError'), 'error');
            }
        }).catch(function () { showToast(t('scanError'), 'error'); });
    }

    function injectStyles() {
        if (document.getElementById('lib-styles')) return;
        var style = document.createElement('style');
        style.id = 'lib-styles';
        style.textContent =
            '.lib-page-app{display:flex;flex-direction:row;height:calc(100vh - 64px);width:100%;overflow:hidden;background:white;color:var(--nc-text);font-family:var(--nc-font-family,"Segoe UI",sans-serif);}' +
            '.lib-page-header{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;}' +
            '.lib-page-title{font-size:18px;font-weight:600;color:var(--nc-text);}' +
            '.lib-page-content{flex:1;overflow-y:auto;padding:16px;}' +
            '.lib-main{flex:1;display:flex;flex-direction:column;min-width:0;}' +
            '.lib-sidebar{width:230px;min-width:230px;background:var(--nc-bg-hover);border-right:1px solid var(--nc-border);display:flex;flex-direction:column;transition:width 220ms ease-in-out;z-index:5;}' +
            '.lib-sidebar.collapsed{width:0;min-width:0;overflow:hidden;}' +
            '.lib-sidebar-header{display:flex;align-items:center;height:56px;padding:0 12px;border-bottom:1px solid var(--nc-border);}' +
            '.lib-sidebar-toggle{background:transparent;border:none;font-size:22px;cursor:pointer;opacity:0.6;flex-shrink:0;}' +
            '.lib-sidebar-toggle:hover{opacity:1;}' +
            '.lib-sidebar-menu{flex:1;overflow-y:auto;padding:8px 0;}' +
            '.lib-sidebar-item{display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;}' +
            '.lib-sidebar-item:hover{background:rgba(0,130,201,0.06);}' +
            '.lib-sidebar-item.active{background:rgba(0,130,201,0.08);font-weight:600;}' +
            '.lib-sidebar-icon{width:22px;text-align:center;font-size:16px;}' +
            '.lib-sidebar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-context-menu{position:fixed;z-index:99999;min-width:160px;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.25);padding:4px 0;font-size:13px;color:var(--nc-text);}' +
            '.lib-context-item{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;border-radius:4px;margin:2px 6px;}' +
            '.lib-context-item:hover{background:var(--nc-bg-hover);}' +
            '.lib-context-separator{height:1px;background:var(--nc-border);margin:4px 0;}' +
            '.lib-cards-ctn{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-content:flex-start;}' +
            '.lib-card-portrait{flex:0 0 170px;height:250px;min-width:0;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;cursor:pointer;transition:transform 0.15s;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;}' +
            '.lib-card-portrait:hover{transform:translateY(-2px);}' +
            '.lib-card-portrait .lib-card-icon{font-size:28px;text-align:center;margin-bottom:8px;}' +
            '.lib-card-portrait .lib-card-title{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card-portrait .lib-card-sub{font-size:12px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:auto;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:8px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-empty{text-align:center;padding:40px 16px;opacity:0.6;font-size:13px;}' +
            '.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;}' +
            '.lib-card{background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;}' +
            '.lib-card:hover{transform:translateY(-2px);}' +
            '.lib-card .lib-icon{font-size:32px;margin-bottom:8px;}' +
            '.lib-card-img{width:100%;height:120px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 8px;}' +
            '.lib-card-portrait .lib-card-icon .lib-card-img{width:100%;height:140px;}' +
            '.lib-card .lib-name{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card .lib-meta{font-size:11px;opacity:0.6;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:12px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
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
        // Force le rechargement des covers au (re)chargement des bibliothèques.
        state.covers = {};
        state.coversLoaded = false;
        state.collectionsByLib = {};
        state.loadingLibraries = true;
        apiRequest(getBaseUrl() + '/api/reader/libraries').then(function (data) {
            state.loadingLibraries = false;
            if (data && data.success) {
                state.libraries = data.libraries || [];
            } else {
                state.libraries = [];
            }
            renderSidebar();
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
        container.innerHTML = '';
        var files = (collection.rules && collection.rules.files) ? collection.rules.files : [];
        if (!files.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }
        var colHeader = document.createElement('div');
        colHeader.className = 'lib-section-title lib-section-col-title';
        colHeader.textContent = collection.name || t('collection');
        container.appendChild(colHeader);
        var cardsCtn = document.createElement('div');
        cardsCtn.className = 'lib-cards-ctn';
        files.forEach(function (f) {
            cardsCtn.appendChild(renderTomeCard(f, collection));
        });
        container.appendChild(cardsCtn);

         if (!state.coversLoaded) {
             loadCoversBulk(files, function (fetched) {
                 if (fetched && document.getElementById('lib-content')) renderTomes(collection);
             });
         }
     }

    function fileIcon(type) {
        if (!type) return '📄';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(type) !== -1) return '🖼';
        if (type === 'epub') return '📚';
        if (['cbz', 'cbr'].indexOf(type) !== -1) return '🗜';
        return '📄';
    }

    function renderTomeCard(f, collection) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var icon = fileIcon(f.type);
        var bookmark = state.bookmarks[f.path];
        var title = f.name || f.path;
        var sub = t('tome') + ' ' + (f.tome || 0) + ' · ' + (f.size ? formatSize(f.size) : '');
        if (bookmark) {
            sub += ' · ' + bookmarkLabel(f.path);
        }
        var coverImg = renderTomeIcon(f);
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</div>' +
            '<div class="lib-card-sub">' + escapeHtml(sub) + '</div>' +
            (bookmark ? '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress" style="align-self:flex-end;margin-top:6px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;">&times;</button>' : '') +
            '<span style="font-size:11px;opacity:0.6;margin-top:auto;margin-left:auto;">→</span>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) {
                e.stopPropagation();
                return;
            }
            state.view = 'reading';
            state.currentTome = f;
            updateUrl({ library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), read: f.path });
            renderReading(f);
        });
        var delBtn = card.querySelector('.lib-delete-prog-btn');
        if (delBtn) {
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                apiRequest(getBaseUrl() + '/api/reader/progress', {
                    method: 'DELETE',
                    body: JSON.stringify({ path: f.path })
                }).then(function(data) {
                    if (data && data.success) {
                        delete state.bookmarks[f.path];
                        card.remove();
                        showToast(t('progressDeleted'), 'info');
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function() {
                    showToast(t('scanError'), 'error');
                });
            });
        }
        return card;
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
        if (b.type === 'read') return '✓ ' + (t('readerRead') || 'Lu');
        if (b.type === 'pdf_page' || b.type === 'cbz_page' || b.type === 'reader_page') return t('page') + ' ' + b.value + '/' + b.total;
        if (b.type === 'epub_percent') return b.value + t('percent');
        if (b.type === 'image_viewed') return '✓';
        return '';
    }

    function renderCollections(library) {
        var container = document.getElementById('lib-content');
        if (!container) return;
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
            var colCover = coverOfFirstTome(files);
            var colIcon = colCover
                ? '<img class="lib-card-img" src="' + colCover + '" alt="📁" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📁\');this.remove();">'
                : '📁';
            card.innerHTML =
                '<div class="lib-icon">' + colIcon + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(col.name || '') + '">' + escapeHtml(col.name || '') + '</div>' +
                '<div class="lib-meta">' + files.length + ' ' + t('documents') + '</div>';
            card.addEventListener('click', function () {
                state.view = 'tomes';
                state.currentCollection = col;
                updateUrl({ library: String(state.currentLibrary.id), collection: String(col.id) });
                renderTomes(col);
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: '✏️', action: function () { renameCollection(col, library); } });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteCol'), icon: '🗑', action: function () { deleteCollection(col, library); } });
                }
                if (!items.length) return;
                showContextMenu(e, items, col);
            });
            grid.appendChild(card);
        });
        container.appendChild(grid);

        if (!state.coversLoaded) {
            var firstPaths = cols.map(function (c) {
                var f = (c.rules && c.rules.files) ? c.rules.files : [];
                return f[0] ? f[0].path : null;
            }).filter(Boolean);
            loadCoversBulk(firstPaths, function (fetched) {
                if (fetched && document.getElementById('lib-content')) renderCollections(library);
            });
        }
    }

    function renderLibrariesContent() {
        var container = document.getElementById('lib-content');
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
        var allTomePaths = [];
        var pendingLibs = libs.length;
        libs.forEach(function (lib) {
            loadCollections(lib.id, function () {
                // Snapshot des collections de cette lib (state.collections est
                // écrasé à chaque appel, on garde le lien dans collectionsByLib).
                state.collectionsByLib[lib.id] = (state.collections || []).slice();
                (state.collections || []).forEach(function (c) {
                    var files = (c.rules && c.rules.files) ? c.rules.files : [];
                    files.forEach(function (f) {
                        progPaths.push({ path: f.path, lib: lib, col: c, file: f });
                        allTomePaths.push(f);
                    });
                });
                // render once collections loaded; bookmarks loaded separately
                renderProgressCards(continueList, progPaths);
                pendingLibs--;
                if (pendingLibs <= 0) {
                    loadCoversBulk(allTomePaths, function (fetched) {
                        if (fetched) render();
                    });
                }
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
        renderLibraryCards(grid);
        wrap.appendChild(grid);

        container.appendChild(wrap);
    }

    function renderProgressCards(list, progPaths) {
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
            if (!document.getElementById('lib-content')) return;
            if (data && data.success && data.progress) {
                state.bookmarks = {};
                Object.keys(data.progress).forEach(function(k) {
                    state.bookmarks['/' + k] = data.progress[k];
                });
            }
            list.innerHTML = '';
            var grouped = {};
            progPaths.forEach(function (p) {
                var bm = state.bookmarks[p.path];
                if (!bm || bm.type === 'read') return;
                var libKey = String(p.lib.id);
                if (!grouped[libKey]) grouped[libKey] = { lib: p.lib, items: [] };
                grouped[libKey].items.push(p);
            });
            var hasAny = false;
            Object.keys(grouped).forEach(function (libKey) {
                var g = grouped[libKey];
                hasAny = true;
                var libHeader = document.createElement('div');
                libHeader.className = 'lib-section-sub-title';
                libHeader.style.cssText = 'font-weight:600;font-size:13px;margin-bottom:8px;';
                libHeader.textContent = g.lib.name || '';
                list.appendChild(libHeader);
                var colGroups = {};
                g.items.forEach(function (p) {
                    var colKey = String(p.col.id);
                    if (!colGroups[colKey]) colGroups[colKey] = { col: p.col, items: [] };
                    colGroups[colKey].items.push(p);
                });
                Object.keys(colGroups).forEach(function (colKey) {
                    var cg = colGroups[colKey];
                    var colHeader = document.createElement('div');
                    colHeader.className = 'lib-section-title lib-section-col-title';
                    colHeader.textContent = cg.col.name || t('collection');
                    list.appendChild(colHeader);
                    var cardsCtn = document.createElement('div');
                    cardsCtn.className = 'lib-cards-ctn';
                    cg.items.forEach(function (p) {
                        cardsCtn.appendChild(renderProgressCard(p, cg.col, g.lib));
                    });
                    list.appendChild(cardsCtn);
                });
            });
            if (!hasAny) {
                list.innerHTML = '';
                var noProg = document.createElement('div');
                noProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
                noProg.textContent = t('noProgress');
                list.appendChild(noProg);
            }
        }).catch(function () {
            list.innerHTML = '';
        });
    }

    function renderProgressCard(p, collection, lib) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = p.path;
        var icon = fileIcon(p.file.type);
        var title = p.file.name || p.file.path;
        var sub = t('tome') + ' ' + (p.file.tome || 0) + ' · ' + (p.file.size ? formatSize(p.file.size) : '');
        if (state.bookmarks[p.path]) {
            sub += ' · ' + bookmarkLabel(p.path);
        }
        var coverImg = renderTomeIcon(p.file);
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</div>' +
            '<div class="lib-card-sub">' + escapeHtml(sub) + '</div>' +
            '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress" style="align-self:flex-end;margin-top:6px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;">&times;</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = lib;
            state.currentCollection = p.col;
            state.currentTome = { path: p.file.path, name: p.file.name, tome: p.file.tome };
            updateUrl({ read: p.file.path });
            renderReading(p.file);
        });
        var delBtn = card.querySelector('.lib-delete-prog-btn');
        if (delBtn) {
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                apiRequest(getBaseUrl() + '/api/reader/progress', {
                    method: 'DELETE',
                    body: JSON.stringify({ path: p.path })
                }).then(function(data) {
                    if (data && data.success) {
                        delete state.bookmarks[p.path];
                        card.remove();
                        showToast(t('progressDeleted'), 'info');
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function() {
                    showToast(t('scanError'), 'error');
                });
            });
        }
        return card;
    }

    function renderLibraryCards(gridEl) {
        gridEl.innerHTML = '';
        var libs = state.libraries || [];
        libs.forEach(function (lib) {
            var card = document.createElement('div');
            card.className = 'lib-card';
            var cols = state.collectionsByLib[lib.id] || [];
            var firstFiles = (cols[0] && cols[0].rules && cols[0].rules.files) ? cols[0].rules.files : [];
            var libCover = coverOfFirstTome(firstFiles);
            var libIcon = libCover
                ? '<img class="lib-card-img" src="' + libCover + '" alt="📚" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📚\');this.remove();">'
                : '📚';
            card.innerHTML =
                '<div class="lib-icon">' + libIcon + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(lib.name || '') + '">' + escapeHtml(lib.name || '') + '</div>' +
                '<div class="lib-meta">' + (lib.description ? escapeHtml(lib.description) : '') + '</div>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-delete-btn')) return;
                state.view = 'collection';
                state.currentLibrary = lib;
                updateUrl({ library: String(lib.id) });
                loadCollections(lib.id, function () { renderCollections(lib); });
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: '✏️', action: renameLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: '🗑', action: deleteLibrary });
                }
                if (!items.length) return;
                showContextMenu(e, items, lib);
            });
            gridEl.appendChild(card);
        });
    }

    function render() {
        var container = document.getElementById('lib-content');
        if (!container) return;

        if (state.view !== 'reading') {
            closeReaderModal();
        }

        if (state.view === 'reading' && state.currentTome) {
            return;
        }

        container.innerHTML = '';

        if (state.view === 'home' || state.view === 'libraries') {
            renderLibrariesContent();
        } else if (state.view === 'favorites') {
            renderFavoritesView();
        } else if (state.view === 'collection' && state.currentLibrary) {
            renderCollections(state.currentLibrary);
        } else if (state.view === 'tomes' && state.currentCollection) {
            renderTomes(state.currentCollection);
        }
        renderSidebar();
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
        if (params.favOnly) search.push('favOnly=1');
        var newUrl = window.location.pathname + (search.length ? '?' + search.join('&') : '');
        window.history.replaceState(null, '', newUrl);
    }

     function handleUrlParams() {
        var params = new URLSearchParams(window.location.search);
        var libId = params.get('library');
        var colId = params.get('collection');
        var readPath = params.get('read');
        var favOnlyParam = params.get('favOnly');
        state.readerFavoritesOnly = favOnlyParam === '1';
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
        var normPath = String(path || '').replace(/^\/+|\/+$/g, '');
        var libs = state.libraries || [];
        for (var i = 0; i < libs.length; i++) {
            var lib = libs[i];
            var cols = state.allCollections[lib.id] || [];
            for (var j = 0; j < cols.length; j++) {
                var col = cols[j];
                var files = (col.rules && col.rules.files) ? col.rules.files : [];
                for (var k = 0; k < files.length; k++) {
                    var fp = String(files[k].path || '').replace(/^\/+|\/+$/g, '');
                    if (decodeURIComponent(fp) === normPath || fp === normPath) {
                        return { lib: lib, col: col, file: files[k] };
                    }
                }
            }
        }
        return null;
    }

    function renderFavoritesView() {
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '<div class="lib-empty" style="opacity:0.5;">' + (t('favoritesHint') || 'Loading favorites…') + '</div>';

        loadAllCollections(function () {
            loadReaderFavoritesList(function () {
                if (!document.getElementById('lib-content')) return;
                container.innerHTML = '';
                var wrap = document.createElement('div');
                var favorites = state.allFavorites || [];
                if (!favorites.length) {
                    wrap.innerHTML = '<div class="lib-empty">' + (t('noFavorites') || 'Aucun favori') + '</div>';
                    container.appendChild(wrap);
                    return;
                }
                var grouped = {};
                favorites.forEach(function (fav) {
                    var ctx = findLibraryCollectionForPath(fav.path);
                    if (!ctx) return;
                    if (!fav.pages || !fav.pages.length) return;
                    var libKey = String(ctx.lib.id);
                    if (!grouped[libKey]) grouped[libKey] = { lib: ctx.lib, items: [] };
                    grouped[libKey].items.push({ ctx: ctx, pages: fav.pages });
                });
                var hasAny = false;
                Object.keys(grouped).forEach(function (libKey) {
                    var g = grouped[libKey];
                    hasAny = true;
                    var libHeader = document.createElement('div');
                    libHeader.className = 'lib-section-sub-title';
                    libHeader.style.cssText = 'font-weight:600;font-size:13px;margin-bottom:8px;';
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
                    wrap.innerHTML = '<div class="lib-empty">' + (t('noFavorites') || 'Aucun favori') + '</div>';
                }
                container.appendChild(wrap);
            });
        });
    }

    function renderFavoriteCard(ctx, pages) {
        var f = ctx.file;
        pages = pages || [];
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var icon = fileIcon(f.type);
        var title = f.name || f.path;
        var favText = pages.length === 1 ? '1 page favorite' : pages.length + ' pages favorites';
        var tomeLabel = (f.tome && f.tome > 0) ? (t('tome') + ' ' + f.tome) : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + icon + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</div>' +
            '<div class="lib-card-sub">' + escapeHtml(favText) + (tomeLabel ? ' · ' + escapeHtml(tomeLabel) : '') + '</div>' +
            '<span style="font-size:11px;opacity:0.6;margin-top:auto;margin-left:auto;">→</span>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = ctx.lib;
            state.currentCollection = ctx.col;
            state.currentTome = { path: f.path, name: f.name, tome: f.tome };
            state.readerFavoritesOnly = true;
            updateUrl({ read: f.path, favOnly: true });
            renderReading(f);
        });
        return card;
    }

    function bind() {
        var scanBtn = document.getElementById('lib-scan-btn');
        if (scanBtn && !scanBtn._bound) {
            scanBtn._bound = true;
            scanBtn.addEventListener('click', addLibrary);
        }
        var toggleBtn = document.getElementById('lib-sidebar-toggle');
        if (toggleBtn && !toggleBtn._bound) {
            toggleBtn._bound = true;
            toggleBtn.addEventListener('click', function () {
                state.sidebarOpen = !state.sidebarOpen;
                var sidebar = document.getElementById('lib-sidebar');
                if (sidebar) {
                    sidebar.className = 'lib-sidebar ' + (state.sidebarOpen ? '' : 'collapsed');
                }
            });
        }
        var menu = document.getElementById('lib-sidebar-menu');
        if (menu && !menu._bound) {
            menu._bound = true;
            menu.addEventListener('click', function (e) {
                var item = e.target.closest('.lib-sidebar-item');
                if (!item) return;
                var view = item.getAttribute('data-view');
                if (!view) return;
                if (view === 'library') {
                    var libId = item.getAttribute('data-library-id');
                    var lib = (state.libraries || []).find(function(l) { return String(l.id) === libId; });
                    if (!lib) {
                        state.view = 'home';
                        state.currentLibrary = null;
                        state.currentCollection = null;
                    } else {
                        state.view = 'collection';
                        state.currentLibrary = lib;
                        state.currentCollection = null;
                        updateUrl({ library: String(lib.id) });
                        loadCollections(lib.id, function () { renderCollections(lib); });
                        return;
                    }
                } else {
                    state.view = view;
                    state.currentLibrary = null;
                    state.currentCollection = null;
                }
                render();
                updateUrl({});
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
                    items.push({ label: t('rename'), icon: '✏️', action: renameLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: '🗑', action: deleteLibrary });
                }
                if (!items.length) return;
                showContextMenu(e, items, lib);
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

        var sidebar = document.createElement('div');
        sidebar.id = 'lib-sidebar';
        sidebar.className = 'lib-sidebar ' + (state.sidebarOpen ? '' : 'collapsed');
        sidebar.innerHTML =
            '<nav class="lib-sidebar-menu" id="lib-sidebar-menu">' +
                '<div class="lib-sidebar-item' + ((state.view === 'home' || state.view === 'libraries') ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">🏠</span><span class="lib-sidebar-label">' + escapeHtml(t('home')) + '</span></div>' +
                '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('myFavorites')) + '</span></div>' +
            '</nav>';

         var main = document.createElement('div');
         main.className = 'lib-main';
         var header = document.createElement('div');
         header.className = 'lib-page-header';
         header.innerHTML =
             '<div style="display:flex;align-items:center;gap:8px;">' +
                 '<button type="button" id="lib-sidebar-toggle" class="lib-sidebar-toggle" title="' + escapeHtml(t('toggleSidebar')) + '" aria-label="' + escapeHtml(t('toggleSidebar')) + '">☰</button>' +
             '</div>' +
             '<div style="display:flex;align-items:center;gap:8px;">' +
                 (state.isAdmin ? '<button type="button" id="lib-scan-btn" class="lib-btn lib-btn-primary">' + escapeHtml(t('scan')) + '</button>' : '') +
             '</div>';
         var content = document.createElement('div');
        content.id = 'lib-content';
        content.className = 'lib-page-content';
        main.appendChild(header);
        main.appendChild(content);
        PAGE_ROOT.appendChild(sidebar);
        PAGE_ROOT.appendChild(main);
    }

     function renderSidebar() {
         var menu = document.getElementById('lib-sidebar-menu');
         if (!menu) return;
         var libs = state.libraries || [];
         var html = '';
         html += '<div class="lib-sidebar-item' + ((state.view === 'home' || state.view === 'libraries') ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">🏠</span><span class="lib-sidebar-label">' + escapeHtml(t('home')) + '</span></div>';
         html += '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('myFavorites')) + '</span></div>';
         libs.forEach(function (lib) {
             var isActive = (state.view === 'collection' || state.view === 'tomes' || state.view === 'reading') && state.currentLibrary && String(state.currentLibrary.id) === String(lib.id);
             html += '<div class="lib-sidebar-item' + (isActive ? ' active' : '') + '" data-view="library" data-library-id="' + escapeHtml(String(lib.id)) + '"><span class="lib-sidebar-icon">📚</span><span class="lib-sidebar-label">' + escapeHtml(lib.name || '') + '</span></div>';
         });
         menu.innerHTML = html;
     }

    document.addEventListener('DOMContentLoaded', init);
})();
