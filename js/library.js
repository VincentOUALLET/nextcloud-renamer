(function () {
    'use strict';

    var PAGE_ROOT = document.getElementById('library-page');
    if (!PAGE_ROOT) return;
    PAGE_ROOT.id = 'library-page';

    var DOC_EXT = ['pdf', 'cbz', 'cbr', 'epub'];
    var IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    var LIB_ACCENT = '#a855f7';

    function fileExt(f) {
        return (f.extension || (f.name ? f.name.split('.').pop().toLowerCase() : '')).toLowerCase();
    }

    function makeFileEntry(f) {
        return {
            path: f.path,
            name: f.name,
            tome: 0,
            type: fileExt(f),
            size: f.size || 0,
            mtime: f.mtime || 0,
        };
    }

    function sortFiles(files) {
        files.sort(function (a, b) {
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }
    var STAR_OUTLINE_PATH = 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z';
     var FAV_STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + STAR_OUTLINE_PATH + '"></path></svg>';
     var HOME_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 495.398 495.398" fill="' + LIB_ACCENT + '"><path d="M487.083,225.514l-75.08-75.08V63.704c0-15.682-12.708-28.391-28.413-28.391c-15.669,0-28.377,12.709-28.377,28.391v29.941L299.31,37.74c-27.639-27.624-75.694-27.575-103.27,0.05L8.312,225.514c-11.082,11.104-11.082,29.071,0,40.158c11.087,11.101,29.089,11.101,40.172,0l187.71-187.729c6.115-6.083,16.893-6.083,22.976-0.018l187.742,187.747c5.567,5.551,12.825,8.312,20.081,8.312c7.271,0,14.541-2.764,20.091-8.312C498.17,254.586,498.17,236.619,487.083,225.514z"/><path d="M257.561,131.836c-5.454-5.451-14.285-5.451-19.723,0L72.712,296.913c-2.607,2.606-4.085,6.164-4.085,9.877v120.401c0,28.253,22.908,51.16,51.16,51.16h81.754v-126.61h92.299v126.61h81.755c28.251,0,51.159-22.907,51.159-51.159V306.79c0-3.713-1.465-7.271-4.085-9.877L257.561,131.836z"/></svg>';
     var BOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4a2 2 0 0 1-2-2"></path><path d="M16 2v6h-2V2h-2v6H8V2"></path><path d="M4 12h16v2H4z"></path></svg>';
      var FOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M12 11a2 2 0 100-4 2 2 0 000 4z"></path></svg>';
      var CHEVRON_DOWN_SVG = '<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg>';
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
         showNavActions: false,
          readerBrowsingMode: false,
         readerTreePath: [],
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
            rescan: 'Rescanner',
            rescanInProgress: 'Rescan en cours…',
            rescanComplete: 'Rescan terminé',
            rescanLibrary: 'Rescanner la librairie',
            rescanCollection: 'Rescanner la collection',
            rescanEmpty: 'Aucun fichier trouvé lors du rescan',
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
            collections: 'Collections',
            subCollections: 'Sous-collections',
            images: 'Images',
            totalFiles: 'fichiers au total',
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
            rescan: 'Rescan',
            rescanInProgress: 'Rescanning…',
            rescanComplete: 'Rescan complete',
            rescanLibrary: 'Rescan library',
            rescanCollection: 'Rescan collection',
            rescanEmpty: 'No files found during rescan',
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
            collections: 'Collections',
            subCollections: 'Sub-collections',
            images: 'Images',
            totalFiles: 'total',
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
            state.coversLoaded = false;
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

    function attachLongPress(el) {
        var timer = null;
        var startX = 0, startY = 0;
        var THRESHOLD = 15;
        var DELAY = 600;
        var destroyed = false;
        function onTouchStart(e) {
            if (timer || destroyed) return;
            if (e.touches.length !== 1) return;
            var t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            timer = setTimeout(function () {
                if (destroyed) return;
                if (document.getElementById('lib-context-menu')) return;
                var ev = new MouseEvent('contextmenu', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: startX,
                    clientY: startY
                });
                el.dispatchEvent(ev);
                timer = null;
            }, DELAY);
        }
        function onTouchMove(e) {
            if (!timer) return;
            if (e.touches.length > 0) {
                var t = e.touches[0];
                if (Math.abs(t.clientX - startX) > THRESHOLD || Math.abs(t.clientY - startY) > THRESHOLD) {
                    clearTimeout(timer);
                    timer = null;
                }
            }
        }
        function onTouchEnd() {
            if (timer) { clearTimeout(timer); timer = null; }
        }
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchEnd);
        return function destroy() {
            destroyed = true;
            if (timer) { clearTimeout(timer); timer = null; }
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
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

    function rescanLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        showToast(t('rescanInProgress') + ' ' + (lib.name || ''), 'info');
        apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/rescan', {
            method: 'POST',
            body: JSON.stringify({})
        }).then(function (data) {
            if (data && data.success) {
                showToast(t('rescanComplete') + ' — ' + data.fileCount + ' ' + t('documents'), 'info');
                loadLibraries();
            } else {
                showToast(t('scanError') + ' : ' + ((data && data.error) || ''), 'error');
            }
        }).catch(function (err) { showToast(t('scanError'), 'error'); });
    }

    function rescanCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        showToast(t('rescanInProgress') + ' ' + (col.name || ''), 'info');
        apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id + '/rescan', {
            method: 'POST',
            body: JSON.stringify({})
         }).then(function (data) {
            if (data && data.success) {
                showToast(t('rescanComplete') + ' — ' + data.fileCount + ' ' + t('documents'), 'info');
                if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
            } else {
                showToast(t('scanError') + ' : ' + ((data && data.error) || ''), 'error');
            }
        }).catch(function () { showToast(t('scanError'), 'error'); });
    }

    function injectStyles() {
        if (document.getElementById('lib-styles')) return;
        var style = document.createElement('style');
        style.id = 'lib-styles';
        style.textContent =
            'body,html{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-drag:none}' +
            '.lib-page-app{display:flex;flex-direction:row;height:calc(100vh - 64px);width:100%;overflow:hidden;background:var(--color-background-assistant);color:var(--reader-accent-lighter);font-family:var(--nc-font-family,"Segoe UI",sans-serif);--lib-nav-accent:#a855f7;}' +
            '.lib-page-header{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;}' +
            '#lib-breadcrumb{margin-right:auto;flex:1;min-width:0;}' +
            '#lib-breadcrumb .navigation-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:2px;}' +
            '#lib-breadcrumb .breadcrumb__crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:2px;list-style:none;margin:0;padding:0;}' +
            '#lib-breadcrumb .navigation-crumb{display:inline-flex;align-items:center;gap:2px;}' +
            '#lib-breadcrumb .navigation-crumb a{text-decoration:none;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-crumb a .button-vue__text{color:var(--lib-nav-accent);font-size:13px;}' +
            '#lib-breadcrumb .navigation-crumb:hover a .button-vue__text{color:var(--nc-text);}' +
            '#lib-breadcrumb .navigation-crumb.active a{pointer-events:none;}' +
            '#lib-breadcrumb .navigation-crumb.active a .button-vue__text{color:var(--reader-accent-lighter);font-weight:600;}' +
            '#lib-breadcrumb .vue-crumb__separator{display:inline-flex;align-items:center;opacity:0.7;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-breadcrumb-star{background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:14px;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-breadcrumb-star:hover{opacity:1;}' +
            '#lib-breadcrumb .navigation-breadcrumb-star[data-favorite="true"]{opacity:1;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-nav-more{background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:14px;color:var(--nc-text);}' +
            '#lib-breadcrumb .navigation-nav-more:hover{opacity:1;}' +
            '.lib-page-title{font-size:18px;font-weight:600;color:var(--nc-text);}' +
            '.lib-page-content{flex:1;overflow-y:auto;padding:16px;}' +
            '.lib-main{flex:1;display:flex;flex-direction:column;min-width:0;}' +
            '.lib-sidebar{width:230px;min-width:230px;background:var(--nc-bg-hover);border-right:1px solid var(--nc-border);display:flex;flex-direction:column;transition:width 220ms ease-in-out;z-index:5;}' +
            '.lib-sidebar.collapsed{width:0;min-width:0;overflow:hidden;}' +
            '.lib-sidebar-header{display:flex;align-items:center;height:56px;padding:0 12px;border-bottom:1px solid var(--nc-border);}' +
'.lib-sidebar-toggle{background:transparent;border:none;font-size:22px;cursor:pointer;opacity:0.6;flex-shrink:0;color:var(--nc-text);}' +
              '.lib-sidebar-toggle:hover{opacity:1;color:var(--nc-text);}' +
            '.lib-sidebar-menu{flex:1;overflow-y:auto;padding:8px 0;}' +
            '.lib-sidebar-item{display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;-webkit-touch-callout:none;}' +
            '.lib-sidebar-item:hover{background:rgba(0,130,201,0.06);}' +
            '.lib-sidebar-item.active,.lib-sidebar-item.active .lib-sidebar-icon{background:rgba(168,85,247,0.08);font-weight:600;color:var(--lib-nav-accent);}' +
            '.lib-sidebar-item.active .lib-sidebar-icon{color:var(--lib-nav-accent);}' +
            '.lib-sidebar-icon{width:22px;text-align:center;font-size:16px;}' +
             '.lib-sidebar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}' +
             '.lib-sidebar-item.addLib > .lib-sidebar-icon{display:none;}' +
             '.lib-sidebar-item.addLib > .lib-sidebar-label{display:flex;justify-content:center;align-items:center;width:100%;font-size:18px;padding:0;}' +
              '.lib-sidebar-sub{margin-left:12px;overflow:hidden;max-height:0;transition:max-height 220ms ease-in-out;}' +
              '.lib-sidebar-sub.expanded{max-height:500px;}' +
              '.lib-sidebar-sub .lib-sidebar-item{margin:0 8px;}' +
              '.lib-sidebar-sub .lib-sidebar-icon{width:18px;font-size:14px;}' +
              '.lib-sidebar-chevron{display:inline-flex;align-items:center;transition:transform 180ms ease;}' +
              '.lib-sidebar-chevron.expanded{transform:rotate(90deg);}' +
            '.lib-context-menu{position:fixed;z-index:99999;min-width:160px;background:var(--nc-bg-default,#fff);border:1px solid var(--nc-border);border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.25);padding:4px 0;font-size:13px;color:var(--nc-text);-webkit-touch-callout:none}' +
            '.lib-context-item{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;border-radius:4px;margin:2px 6px;}' +
            '.lib-context-item:hover{background:var(--nc-bg-hover);}' +
            '.lib-context-separator{height:1px;background:var(--nc-border);margin:4px 0;}' +
            '.lib-cards-ctn{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-content:flex-start;}' +
            '.lib-card-portrait{flex:0 0 170px;height:280px;min-width:0;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;cursor:pointer;transition:transform 0.15s;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;position:relative;}' +
            '.lib-card-portrait:hover{transform:translateY(-2px);}' +
            '.lib-card-portrait .lib-card-icon{font-size:28px;text-align:center;margin-bottom:8px;}' +
            '.lib-card-portrait .lib-card-title{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card-portrait .lib-card-sub{font-size:12px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:auto;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:8px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-sub-col-title{font-size:13px;font-weight:600;margin:16px 0 8px 0;}' +
            '.lib-section-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;}' +
            '.lib-collection-card{background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:8px;padding:12px;cursor:pointer;min-width:140px;width:100%;transition:transform 0.15s;}' +
            '.lib-collection-card:hover{transform:translateY(-2px);}' +
            '.lib-empty{text-align:center;padding:40px 16px;opacity:0.6;font-size:13px;}' +
            '.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;}' +
            '.lib-card{background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;-webkit-touch-callout:none;}' +
            '.lib-card:hover{transform:translateY(-2px);}' +
            '.lib-card .lib-icon{font-size:32px;margin-bottom:8px;}' +
            '.lib-card-img{width:100%;height:230px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 8px;-webkit-touch-callout:none}' +
            '.lib-card-portrait .lib-card-icon .lib-card-img{width:100%;height:190px;}' +
            '.lib-card-portrait .lib-card-icon{position:relative;}' +
            '.lib-fav-count-badge{position:absolute;bottom:6px;right:6px;background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;min-height:18px;display:flex;align-items:center;justify-content:center;line-height:1;}' +
            '.lib-card .lib-name{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card .lib-meta{font-size:11px;opacity:0.6;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:12px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-fav-count-badge{position:absolute;bottom:6px;right:6px;background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;min-height:18px;display:flex;align-items:center;justify-content:center;line-height:1;}' +
            '.lib-card-portrait .lib-card-icon{position:relative;}' +
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
        console.log('[Library DEBUG] classifyScan called with', files.length, 'files, rootFolder:', rootFolder);
        var prefix = (rootFolder || '').replace(/^\/+|\/+$/g, '');
        var rootBase = (prefix ? prefix.split('/').pop() : '') || 'Bibliothèque';

        var folderMap = {};
        files.forEach(function (f) {
            var ext = fileExt(f);
            if (DOC_EXT.indexOf(ext) === -1 && IMG_EXT.indexOf(ext) === -1) return;
            var absPath = (f.path || '').replace(/^\/+/, '');
            var rel = (prefix && absPath.indexOf(prefix + '/') === 0) ? absPath.substring(prefix.length + 1) : absPath;
            var slashIdx = rel.lastIndexOf('/');
            var folderRel = slashIdx === -1 ? '' : rel.substring(0, slashIdx);
            if (!folderMap[folderRel]) {
                folderMap[folderRel] = { documents: [], images: [] };
            }
            var entry = makeFileEntry(f);
            if (DOC_EXT.indexOf(ext) !== -1) {
                folderMap[folderRel].documents.push(entry);
            } else {
                folderMap[folderRel].images.push(entry);
            }
        });

        Object.keys(folderMap).forEach(function (key) {
            var fd = folderMap[key];
            sortFiles(fd.documents);
            sortFiles(fd.images);
            fd.documents.forEach(function (f, i) { f.tome = i + 1; });
        });

        var folderSet = {};
        Object.keys(folderMap).forEach(function (folderRel) {
            if (!folderRel) return;
            var parts = folderRel.split('/');
            for (var i = 1; i <= parts.length; i++) {
                folderSet[parts.slice(0, i).join('/')] = true;
            }
        });

        function folderAbs(folderRel) {
            if (!prefix) return folderRel || '';
            return folderRel ? prefix + '/' + folderRel : prefix;
        }

        function folderName(folderRel) {
            return folderRel ? folderRel.split('/').pop() : rootBase;
        }

        function directSubfolders(folderRel) {
            var result = [];
            var expected = folderRel ? folderRel + '/' : '';
            Object.keys(folderSet).forEach(function (key) {
                if (key === folderRel) return;
                if (expected === '') {
                    if (key.indexOf('/') === -1) result.push(key);
                } else if (key.indexOf(expected) === 0) {
                    var rem = key.substring(expected.length);
                    if (rem.indexOf('/') === -1) result.push(key);
                }
            });
            result.sort();
            return result;
        }

        function buildNode(folderRel, isRoot) {
            var fd = folderMap[folderRel] || { documents: [], images: [] };
            var subs = directSubfolders(folderRel);
            var looseImages = fd.images.slice();
            var otherSubs = [];

            subs.forEach(function (subRel) {
                var subName = folderName(subRel);
                if (subName.toLowerCase() === 'images') {
                    var subFd = folderMap[subRel];
                    if (subFd) {
                        looseImages = looseImages.concat(subFd.images, subFd.documents);
                    }
                } else {
                    otherSubs.push(subRel);
                }
            });

            var children = [];

            if (looseImages.length > 0) {
                sortFiles(looseImages);
                looseImages.forEach(function (f) { f.tome = 0; });
                children.push({
                    name: 'Images',
                    folder: folderAbs(folderRel),
                    files: looseImages,
                    children: [],
                    isImages: true
                });
            }

            if (!isRoot) {
                otherSubs.forEach(function (subRel) {
                    var childNode = buildNode(subRel, false);
                    if (childNode) children.push(childNode);
                });
            }

            if (!fd.documents.length && !children.length) {
                return null;
            }

            return {
                name: folderName(folderRel),
                folder: folderAbs(folderRel),
                files: fd.documents,
                children: children,
                isImages: false
            };
        }

        var result = {};
        var rootNode = buildNode('', true);
        if (rootNode) result[rootNode.name] = rootNode;
        directSubfolders('').forEach(function (folderRel) {
            var node = buildNode(folderRel, false);
            if (node) result[node.name] = node;
        });
        console.log('[Library DEBUG] classifyScan result keys:', Object.keys(result));
        Object.keys(result).forEach(function(name) {
            var node = result[name];
            console.log('[Library DEBUG] Collection:', name, '- files:', node.files.length, '- children:', node.children.length);
            node.children.forEach(function(child, i) {
                console.log('[Library DEBUG]   Child[' + i + ']:', child.name, '- isImages:', child.isImages, '- files:', child.files.length, '- children:', child.children.length);
            });
        });
        return result;
    }

    function collectAllFiles(node) {
        var files = [];
        if (node) {
            if (node.files && node.files.length) files = files.concat(node.files);
            if (node.children && node.children.length) {
                node.children.forEach(function (child) {
                    files = files.concat(collectAllFiles(child));
                });
            }
        }
        return files;
    }

    function getCollectionRoot(collection) {
        if (!collection || !collection.rules) return null;
        return {
            name: collection.name || '',
            folder: collection.rules.folder || '',
            files: collection.rules.files || [],
            children: collection.rules.children || [],
            isImages: false
        };
    }

    function getCurrentNode(collection) {
        var node = getCollectionRoot(collection);
        if (!node) return null;
        var path = state.readerTreePath || [];
        for (var i = 0; i < path.length; i++) {
            if (node.children && node.children[path[i]]) {
                node = node.children[path[i]];
            } else {
                break;
            }
        }
        return node;
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
            renderBreadcrumb();
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
            state.collectionsByLib[libraryId] = (state.collections || []).slice();
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.collections = [];
            state.collectionsByLib[libraryId] = [];
            if (typeof cb === 'function') cb();
        });
    }

     function loadBookmarks() {
         var paths = [];
         if (state.collections) {
             state.collections.forEach(function (c) {
                 var files = collectAllFiles(c.rules || {});
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
         if (state.navigation) {
             state.navigation.showNavActions = false;
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
                             rules: { folder: col.folder, files: col.files, children: col.children || [] },
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

        if (state.view === 'reading') {
            var params = { view: 'tomes' };
            if (state.currentLibrary) params.library = String(state.currentLibrary.id);
            if (state.currentCollection) params.collection = String(state.currentCollection.id);
            params.read = null;
            var nodePath = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
            params.node = nodePath;
            updateUrl(params);
            state.view = 'tomes';
            state.currentTome = null;
            renderSidebar();
            renderBreadcrumb();
        }
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

        var node = getCurrentNode(collection);
        if (!node) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }

        var files = node.files || [];
        var children = node.children || [];
        var treePath = state.readerTreePath || [];

        var header = document.createElement('div');
        header.className = 'lib-section-header';
        header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;';
        if (treePath.length > 0) {
            var backBtn = document.createElement('button');
            backBtn.type = 'button';
            backBtn.className = 'renamer-btn renamer-btn-secondary';
            backBtn.style.cssText = 'font-size:12px;padding:4px 8px;';
            backBtn.innerHTML = '← ' + escapeHtml(t('back') || 'Retour');
            backBtn.addEventListener('click', function () {
                state.readerTreePath = treePath.slice(0, -1);
                var nodeParam = state.readerTreePath.length ? state.readerTreePath.join('.') : null;
                updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(collection.id), node: nodeParam });
                renderTomes(collection);
            });
            header.appendChild(backBtn);
        }
        var colHeader = document.createElement('div');
        colHeader.className = 'lib-section-title lib-section-col-title';
        colHeader.style.marginRight = 'auto';
        colHeader.textContent = (treePath.length ? (node.name || '') : (collection.name || t('collection')));
        header.appendChild(colHeader);
        container.appendChild(header);

        if (files.length) {
            var cardsCtn = document.createElement('div');
            cardsCtn.className = 'lib-cards-ctn';
            files.forEach(function (f) {
                cardsCtn.appendChild(renderTomeCard(f, collection));
            });
            container.appendChild(cardsCtn);
        }

        if (children.length) {
            var subTitle = document.createElement('div');
            subTitle.className = 'lib-sub-col-title';
            subTitle.style.cssText = 'font-size:13px;font-weight:600;color:var(--nc-text);margin:16px 0 8px 0;';
            subTitle.textContent = t('subCollections') || 'Sous-collections';
            container.appendChild(subTitle);

            var subGrid = document.createElement('div');
            subGrid.className = 'lib-cards-ctn';
            children.forEach(function (child, idx) {
                subGrid.appendChild(renderSubCollectionCard(child, idx, collection, treePath));
            });
            container.appendChild(subGrid);
        }

        if (!files.length && !children.length) {
            var empty2 = document.createElement('div');
            empty2.className = 'lib-empty';
            empty2.textContent = t('noResults');
            container.appendChild(empty2);
        }

        var allFiles = collectAllFiles(getCollectionRoot(collection) || {});
        if (!state.coversLoaded && allFiles.length) {
            loadCoversBulk(allFiles, function (fetched) {
                if (fetched && document.getElementById('lib-content')) renderTomes(collection);
            });
        }
    }

    function renderSubCollectionCard(node, idx, collection, treePath) {
        var card = document.createElement('div');
        card.className = 'lib-collection-card';
        var isImages = node.isImages === true;
        var icon = isImages ? '🖼' : '📂';
        var firstFiles = node.files || [];
        var colCover = coverOfFirstTome(firstFiles);
        var iconHtml = colCover
            ? '<img class="lib-card-img" src="' + colCover + '" alt="' + icon + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">'
            : '<div style="font-size:28px;text-align:center;">' + icon + '</div>';
        var subCount = firstFiles.length;
        card.innerHTML =
            '<div class="lib-icon">' + iconHtml + '</div>' +
            '<div class="lib-name" title="' + escapeHtml(node.name || '') + '">' + escapeHtml(node.name || '') + '</div>' +
            (subCount ? '<div class="lib-meta">' + subCount + ' ' + escapeHtml(t('tomes') || 'tomes') + '</div>' : '');
        card.addEventListener('click', function () {
            state.readerTreePath = treePath.concat(idx);
            var nodeParam = state.readerTreePath.join('.');
            updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(collection.id), node: nodeParam });
            renderTomes(collection);
            renderSidebar();
        });
        return card;
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
         var subParts = [];
         if (f.tome > 0) subParts.push(t('tome') + ' ' + f.tome);
         subParts.push(f.size ? formatSize(f.size) : '');
         var sub = subParts.join(' · ');
         if (bookmark) {
            sub += ' · ' + bookmarkLabel(f.path);
         }
        var coverImg = renderTomeIcon(f);
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + '</div>' +
            '<div class="lib-card-sub">' + escapeHtml(sub) + '</div>' +
            (bookmark ? '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress" style="position:absolute;top:8px;right:8px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;">&times;</button>' : '') +
            '<span style="font-size:11px;opacity:0.6;position:absolute;bottom:8px;right:8px;">→</span>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) {
                e.stopPropagation();
                return;
            }
            state.view = 'reading';
            state.currentTome = f;
            updateUrl({ view: 'reading', library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), read: f.path });
            renderReading(f);
            renderSidebar();
            renderBreadcrumb();
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
        renderSidebar();
        renderBreadcrumb();
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
            var allFiles = collectAllFiles(col.rules || {});
            var rootFiles = (col.rules && col.rules.files) ? col.rules.files : [];
            var colCover = coverOfFirstTome(allFiles);
            var colIcon = colCover
                ? '<img class="lib-card-img" src="' + colCover + '" alt="📁" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📁\');this.remove();">'
                : '📁';
            card.innerHTML =
                '<div class="lib-icon">' + colIcon + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(col.name || '') + '">' + escapeHtml(col.name || '') + '</div>' +
                '<div class="lib-meta">' + rootFiles.length + ' ' + t('tomes') + (allFiles.length > rootFiles.length ? ' · ' + allFiles.length + ' ' + t('totalFiles') : '') + '</div>';
            card.addEventListener('click', function () {
                state.view = 'tomes';
                state.currentCollection = col;
                state.readerTreePath = [];
                updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(col.id) });
                renderTomes(col);
                renderSidebar();
                renderBreadcrumb();
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: '✏️', action: function () { renameCollection(col, library); } });
                    items.push({ label: t('rescan'), icon: '🔄', action: function () { rescanCollection(col, library); } });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteCol'), icon: '🗑', action: function () { deleteCollection(col, library); } });
                }
                if (!items.length) return;
                showContextMenu(e, items, col);
            });
            attachLongPress(card);
            grid.appendChild(card);
        });
        container.appendChild(grid);

        if (!state.coversLoaded) {
            var allPaths = [];
            cols.forEach(function (c) {
                var f = collectAllFiles(c.rules || {});
                f.forEach(function (file) {
                    if (file.path) allPaths.push(file.path);
                });
            });
            loadCoversBulk(allPaths, function (fetched) {
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
                    var files = collectAllFiles(c.rules || {});
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
        var sub = t('tome') + ' ' + (p.file.tome || 0) + ' · ' + (p.file.size ? formatSize(p.file.size) : '');
        if (state.bookmarks[p.path]) {
            sub += ' · ' + bookmarkLabel(p.path);
        }
        var coverImg = renderTomeIcon(p.file);
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + '</div>' +
            '<div class="lib-card-sub">' + escapeHtml(sub) + '</div>' +
            '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress" style="position:absolute;top:8px;right:8px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;">&times;</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = lib;
            state.currentCollection = p.col;
            state.currentTome = { path: p.file.path, name: p.file.name, tome: p.file.tome };
            updateUrl({ view: 'reading', read: p.file.path });
            renderReading(p.file);
            renderSidebar();
            renderBreadcrumb();
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
            var firstFiles = collectAllFiles((cols[0] && cols[0].rules) ? cols[0].rules : {});
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
                updateUrl({ view: 'collection', library: String(lib.id) });
                loadCollections(lib.id, function () { renderCollections(lib); });
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: '✏️', action: renameLibrary });
                    items.push({ label: t('rescanLibrary'), icon: '🔄', action: rescanLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: '🗑', action: deleteLibrary });
                }
                if (!items.length) return;
                showContextMenu(e, items, lib);
            });
            attachLongPress(card);
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
        renderBreadcrumb();
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
         if (params.view) search.push('view=' + encodeURIComponent(params.view));
         if (params.library) search.push('library=' + encodeURIComponent(params.library));
         if (params.collection) search.push('collection=' + encodeURIComponent(params.collection));
         if (params.read) search.push('read=' + encodeURIComponent(params.read));
         if (params.favOnly) search.push('favOnly=1');
         if (params.node) search.push('node=' + encodeURIComponent(params.node));
         var newUrl = window.location.pathname + (search.length ? '?' + search.join('&') : '');
         window.history.replaceState(null, '', newUrl);
     }

      function handleUrlParams() {
          var params = new URLSearchParams(window.location.search);
          var viewParam = params.get('view');
          var libId = params.get('library');
          var colId = params.get('collection');
          var readPath = params.get('read');
          var nodeParam = params.get('node');
          var favOnlyParam = params.get('favOnly');
          state.readerFavoritesOnly = favOnlyParam === '1';
          state.readerTreePath = nodeParam ? nodeParam.split('.').map(Number) : [];
         if (viewParam === 'favorites') {
             state.view = 'favorites';
             loadLibraries(function () {
                 loadAllCollections(function () {
                     loadReaderFavoritesList(function () {
                         render();
                     });
                 });
             });
             return;
         }
         if (!libId && !colId && !readPath) {
             state.view = viewParam === 'libraries' ? 'libraries' : (viewParam === 'home' ? 'home' : 'libraries');
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
                            renderBreadcrumb();
                        }
                        loadBookmarksForCollection(lib, col, function () {
                            state.currentCollection = col;
                            state.view = 'tomes';
                            renderTomes(col);
                            renderBreadcrumb();
                            if (readPath) {
                                var found = findTomeByPath(readPath);
                                if (found) {
                                    state.currentTome = found;
                                    renderReading(found);
                                    renderBreadcrumb();
                                }
                            }
                        });
                    } else {
                        state.currentLibrary = lib;
                        state.view = 'collection';
                        renderCollections(lib);
                        renderBreadcrumb();
                        if (readPath) {
                            var f2 = findTomeByPath(readPath);
                                if (f2) {
                                    state.currentTome = f2;
                                    renderReading(f2);
                                    renderBreadcrumb();
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
                                    renderBreadcrumb();
                                    if (readPath) {
                                        var found = findTomeByPath(readPath);
                                        if (found) {
                                            state.currentTome = found;
                                            renderReading(found);
                                            renderBreadcrumb();
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
                                var allF = collectAllFiles(state.collections[i].rules || {});
                                for (var j = 0; j < allF.length; j++) {
                                    if (decodeURIComponent(allF[j].path) === readPath || allF[j].path === readPath) {
                                        foundTome = allF[j];
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
                                    renderBreadcrumb();
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
            var col = state.collections[i];
            var root = col.rules || {};
            var allFiles = collectAllFiles(root);
            for (var j = 0; j < allFiles.length; j++) {
                if (decodeURIComponent(allFiles[j].path) === readPath || allFiles[j].path === readPath) {
                    return allFiles[j];
                }
            }
        }
        return null;
    }

    function loadBookmarksForCollection(lib, col, cb) {
        var root = col.rules || {};
        var files = collectAllFiles(root);
        var paths = files.map(function(f) { return f.path; });
        loadBookmarksForPaths(paths, cb);
    }

    function loadBookmarksForTome(lib, col, cb) {
        var root = col.rules || {};
        var files = collectAllFiles(root);
        var paths = files.map(function(f) { return f.path; });
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
                var allFiles = collectAllFiles(col.rules || {});
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
        var coverImg = renderTomeIcon(f);
        var tomeLabel = (f.tome && f.tome > 0) ? (t('tome') + ' ' + f.tome) : '';
        var favCount = pages.length;
        var badgeHtml = '<span class="lib-fav-count-badge">' + favCount + '</span>';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + badgeHtml + '</div>' +
            '<div class="lib-card-sub">' + escapeHtml(tomeLabel) + '</div>' +
            '<span style="font-size:11px;opacity:0.6;position:absolute;bottom:8px;right:8px;">→</span>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = ctx.lib;
            state.currentCollection = ctx.col;
            state.currentTome = { path: f.path, name: f.name, tome: f.tome };
            state.readerFavoritesOnly = true;
                updateUrl({ view: 'reading', read: f.path, favOnly: true });
            renderReading(f);
            renderSidebar();
            renderBreadcrumb();
        });
        return card;
    }

     function bind() {
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
                 var chevron = e.target.closest('.lib-sidebar-chevron');
                 if (chevron) {
                     e.preventDefault();
                     e.stopPropagation();
                     var libId = chevron.getAttribute('data-library-id');
                     var sub = menu.querySelector('.lib-sidebar-sub[data-library-id="' + libId + '"]');
                     if (sub) {
                         var isOpen = sub.classList.contains('expanded');
                         if (isOpen) {
                             sub.classList.remove('expanded');
                             chevron.classList.remove('expanded');
                         } else {
                             sub.classList.add('expanded');
                             chevron.classList.add('expanded');
                         }
                     }
                     return;
                 }
                  var item = e.target.closest('.lib-sidebar-item');
                 if (!item) return;
                 var action = item.getAttribute('data-action');
                 if (action === 'scan') {
                     e.preventDefault();
                     addLibrary();
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
                        updateUrl({ view: 'tomes', library: String(lib.id), collection: String(col.id) });
                        renderTomes(col);
                        renderSidebar();
                        renderBreadcrumb();
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
                        updateUrl({ view: 'collection', library: String(lib2.id) });
                        loadCollections(lib2.id, function () { renderCollections(lib2); });
                        return;
                    }
                 } else {
                    state.view = view;
                    state.currentLibrary = null;
                    state.currentCollection = null;
                    state.readerTreePath = [];
                }
                render();
                updateUrl({ view: state.view === 'home' ? 'home' : (state.view === 'favorites' ? 'favorites' : 'libraries') });
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
                    items.push({ label: t('rescanLibrary'), icon: '🔄', action: rescanLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: '🗑', action: deleteLibrary });
                }
                if (!items.length) return;
                showContextMenu(e, items, lib);
            });
            var sbLP = { timer: null, startX: 0, startY: 0, target: null };
            function clearSbLP() {
                if (sbLP.timer) { clearTimeout(sbLP.timer); sbLP.timer = null; }
                sbLP.target = null;
            }
            menu.addEventListener('touchstart', function (e) {
                if (sbLP.timer || e.touches.length !== 1) return;
                var item = e.target.closest && e.target.closest('.lib-sidebar-item[data-view="library"]');
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
         handleUrlParams();
     }
    function init() {
        var pageRoot = document.getElementById('library-page');
        if (pageRoot && pageRoot.dataset && pageRoot.dataset.isadmin) {
            state.isAdmin = pageRoot.dataset.isadmin === 'true';
        }
        injectStyles();
        renderShell();
        renderBreadcrumb();
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
                 '<div class="lib-sidebar-item' + ((state.view === 'home' || state.view === 'libraries') ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('home')) + '</span></div>' +
                 '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('myFavorites')) + '</span></div>' +
                  (state.isAdmin ? '<div class="lib-sidebar-item active addLib" data-action="scan"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">+</span></div>' : '') +
             '</nav>';

         var main = document.createElement('div');
         main.className = 'lib-main';
         var header = document.createElement('div');
         header.className = 'lib-page-header';
          header.innerHTML =
              '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<button type="button" id="lib-sidebar-toggle" class="lib-sidebar-toggle" title="' + escapeHtml(t('toggleSidebar')) + '" aria-label="' + escapeHtml(t('toggleSidebar')) + '">☰</button>' +
              '</div>' +
               '<div id="lib-breadcrumb"></div>';
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
          var isLibsView = state.view === 'home' || state.view === 'libraries';
            html += '<div class="lib-sidebar-item' + (isLibsView ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('home')) + '</span></div>';
            html += '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('myFavorites')) + '</span></div>';
            libs.forEach(function (lib) {
                var libActive = (state.view === 'collection' || state.view === 'tomes' || state.view === 'reading') && state.currentLibrary && String(state.currentLibrary.id) === String(lib.id);
                var hasChildCols = state.collectionsByLib && state.collectionsByLib[lib.id] && state.collectionsByLib[lib.id].length > 0;
                var chevron = hasChildCols ? '<span class="lib-sidebar-chevron" data-library-id="' + escapeHtml(String(lib.id)) + '">' + CHEVRON_DOWN_SVG + '</span>' : '';
                html += '<div class="lib-sidebar-item' + (libActive ? ' active' : '') + '" data-view="library" data-library-id="' + escapeHtml(String(lib.id)) + '">' + chevron + '<span class="lib-sidebar-icon">' + BOOK_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(lib.name || '') + '</span></div>';
                if (hasChildCols) {
                    var cols = state.collectionsByLib && state.collectionsByLib[lib.id] ? state.collectionsByLib[lib.id] : (state.collections || []);
                    var subOpen = libActive;
                    html += '<div class="lib-sidebar-sub' + (subOpen ? ' expanded' : '') + '" data-library-id="' + escapeHtml(String(lib.id)) + '" style="overflow:hidden;">';
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
      }

      function normalizeLibPath(p) {
          if (!p || !p.trim()) return '/';
          return '/' + p.replace(/^\/+|\/+$/g, '');
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
              var iconHtml = opts.icon ? '<span class="button-vue__icon"><span class="icon-vue" style="width:20px;height:20px;display:flex;">' + opts.icon + '</span></span>' : '';
              var textHtml = text !== '' ? '<span class="button-vue__text">' + text + '</span>' : '';
              var btnClass = 'button-vue button-vue--size-normal button-vue--vue-tertiary button-vue--tertiary';
              if (iconOnly && !textHtml) { btnClass += ' button-vue--icon-only'; }
              var dataId = opts.id ? ' data-crumb-id="' + escapeHtml(opts.id) + '"' : '';
              html += '<li class="navigation-crumb' + (isLast ? ' active' : '') + '">';
              html += '<a class="' + btnClass + '" data-crumb-level="' + level + '"' + dataId + ' title="' + escapeHtml(opts.title || '') + '">' +
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

          crumb('', 'home', { icon: HOME_SVG, iconOnly: true, isLast: isLibs && !hasLib, title: homeLabel });
          if (isFavs && !hasLib) {
              crumb(favLabel, 'favorites', { icon: FAV_STAR_SVG, isLast: true, title: favLabel });
          } else {
              if (hasLib) {
                  crumb(libName, 'library', { id: libId, isLast: !hasCol, title: libName });
                  if (hasCol) {
                      crumb(colName, 'collection', { id: colId, isLast: true, title: colName });
                  }
              }
          }

           html += '</ul>';
           if (state.showNavActions !== false) {
               var NAV_MORE_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_DOTS) || '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>';
               html += '<button type="button" id="renamer-breadcrumb-star" class="navigation-breadcrumb-star" title="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" aria-label="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" data-favorite="false">' + FAV_STAR_SVG + '</button>';
               html += '<button type="button" id="lib-nav-more" class="navigation-nav-more" title="' + escapeHtml(t('navMore') || 'Plus') + '" aria-label="' + escapeHtml(t('navMore') || 'Plus') + '">' + NAV_MORE_SVG + '</button>';
           }
           html += '</nav>';
           return html;
      }

      function renderBreadcrumb() {
          renderSidebar();
          var container = document.getElementById('lib-breadcrumb');
          if (!container) return;
          container.innerHTML = buildLibBreadcrumb();

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
                      render();
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
                          loadCollections(lib.id, function () { renderCollections(lib); });
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
                          renderTomes(col);
                          renderSidebar();
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

      document.addEventListener('DOMContentLoaded', init);

      window.RenamerLibrary = {
          buildBreadcrumb: buildLibBreadcrumb,
          renderBreadcrumb: renderBreadcrumb,
      };
})();
