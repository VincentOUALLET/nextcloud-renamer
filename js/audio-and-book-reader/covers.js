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
                                                    var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;
    var COMIC_EXT = L.COMIC_EXT;
    var PDF_NO_COVER_SVG = L.PDF_NO_COVER_SVG;
    var DOC_NO_COVER_SVG = L.DOC_NO_COVER_SVG;

    var collectionCoverCache = {};

    function getCollectionCoverUrl(collection) {
        if (!collection) return null;
        var key = collection.id || JSON.stringify(collection.rules);
        if (key in collectionCoverCache) return collectionCoverCache[key];
        var files = L.collectAllFiles(collection.rules || {});
        var url = coverOfFirstTome(files);
        collectionCoverCache[key] = url;
        return url;
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
        var paths = [];
        var seen = {};
        (tomePaths || []).forEach(function (f) {
            var p = f.path;
            if (p && !seen[p]) {
                seen[p] = true;
                if (state.covers[p] !== undefined) return;
                paths.push(p);
            }
        });
        console.debug('[Renamer] loadCoversBulk', { totalPaths_in: (tomePaths || []).length, needFetch: paths.length, coversLoaded: state.coversLoaded, coversCount: Object.keys(state.covers).length });
        if (!paths.length) {
            state.coversLoaded = true;
            if (typeof cb === 'function') cb(false);
            return;
        }
        console.debug('[Renamer] loadCoversBulk fetching covers', { pathsCount: paths.length, firstPath: paths[0] });
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
            paths.forEach(function (p) {
                if (state.covers[p] === undefined) {
                    state.covers[p] = null;
                }
            });
             state.coversLoaded = true;
             collectionCoverCache = {};
             if (typeof cb === 'function') cb(true);
         }).catch(function (err) {
             if (window.console && console.error) {
                 console.error('[Renamer covers] coversList failed:', err && err.message ? err.message : err);
             }
             paths.forEach(function (p) {
                 if (state.covers[p] === undefined) {
                     state.covers[p] = null;
                 }
             });
             state.coversLoaded = true;
             collectionCoverCache = {};
             if (typeof cb === 'function') cb(false);
        });
    }

    function renderNoCoverPlaceholder(f) {
        var isPdf = !!(f && (f.type === 'pdf' || (f.name && f.name.toLowerCase().indexOf('.pdf') === f.name.length - 4)));
        var ext = fileExt(f);
        var isComic = ext && COMIC_EXT.indexOf(ext) !== -1;
        var name = (f && f.name) ? f.name : '';
        if (isPdf) {
            return '<span class="lib-card-no-cover lib-card-no-cover-pdf">' +
                PDF_NO_COVER_SVG +
                '<span class="lib-card-no-cover-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>' +
                '</span>';
        }
        if (isComic) {
            return '<span class="lib-card-no-cover">' +
                DOC_NO_COVER_SVG +
                '<span class="lib-card-no-cover-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>' +
                '</span>';
        }
        return '<span class="lib-card-no-cover">' +
            '<span class="lib-card-no-cover-text" data-translation="noCover">' + escapeHtml(t('noCover')) + '</span>' +
            '<span class="lib-card-no-cover-hint" data-translation="noCoverHint">' + escapeHtml(t('noCoverHint')) + '</span>' +
            '</span>';
    }

    function renderTomeIcon(f, collection) {
        var icon = fileIcon(f.type);
        var url = coverUrl(f.path);
        if (!url && collection) {
            url = getCollectionCoverUrl(collection);
        }
        if (url) {
            return '<img class="lib-card-img" draggable="false" src="' + url + '" alt="' + escapeHtml(icon) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">';
        }
        if (state.isAdmin) {
            return renderNoCoverPlaceholder(f);
        }
        return icon;
    }

function pickCoverForTome(f) {
        if (!f || !f.path) return;
        showImagePicker(function (imgPath) {
            if (!imgPath) return;
            apiRequest(getBaseUrl() + '/api/covers/set-override', {
                method: 'POST',
                body: JSON.stringify({ sourcePath: f.path, imagePath: imgPath, width: 300 })
            }).then(function (data) {
                if (data && data.success && data.coverUrl) {
                    state.covers[f.path] = data.coverUrl + '?_=' + Date.now();
                    L.invalidateViewCache();
                    L.render();
                    showToast(t('coverSet'), 'info');
                } else {
                    showToast(t('coverSetError'), 'error');
                }
            }).catch(function () {
                showToast(t('coverSetError'), 'error');
            });
        });
    }

function showImagePicker(callback) {
        if (typeof RenamerNavigation === 'undefined' || !RenamerNavigation) {
            console.warn('[Library DEBUG] RenamerNavigation not available for image picker');
            RenamerUtils.showPromptDialog(
                t('selectCoverTitle') || 'Sélectionner une image de couverture',
                t('selectCoverHint') || 'ex: cover.jpg',
                '',
                function (p) {
                    p = (p || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
                    if (p) {
                        callback(p);
                    } else {
                        callback(null);
                    }
                },
                { dialogId: 'renamer-image-path-prompt', confirmLabel: t('coverSelect'), cancelLabel: t('cancel') }
            );
            return;
        }

        var nav = RenamerNavigation;
        var ctx = L.buildNavCtx();

        nav.init(ctx);
        if (!ctx.state.navigation || !ctx.state.navigation.currentPath) {
            nav.setCurrentPath('/');
        }
        nav.invalidateFavoritesCache();

        var existing = document.getElementById('lib-image-dialog');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-image-dialog';
        overlay.className = 'lib-dialog-overlay lib-image-dialog-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal lib-dialog-modal';
        overlay.appendChild(dialog);

        var IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        var selectedPath = null;

        dialog.innerHTML =
            '<div class="renamer-header lib-dialog-header">' +
                '<h3 class="lib-dialog-title">' + escapeHtml(t('selectCoverTitle')) + '</h3>' +
                '<button type="button" class="renamer-btn-icon renamer-modal-close lib-dialog-close-btn" aria-label="' + escapeHtml(t('readerClose')) + '" title="' + escapeHtml(t('readerClose')) + '">×</button>' +
            '</div>' +
            '<div id="lib-image-breadcrumb" class="lib-dialog-breadcrumb"></div>' +
            '<div id="lib-image-favorites" class="lib-dialog-favorites"></div>' +
            '<div id="lib-image-content" class="lib-dialog-content"></div>' +
            '<div class="lib-dialog-footer">' +
                '<button type="button" id="lib-image-cancel" class="renamer-btn">' + escapeHtml(t('cancel')) + '</button>' +
                '<button type="button" id="lib-image-confirm" class="renamer-btn renamer-btn-primary" disabled>' + escapeHtml(t('coverSelect')) + '</button>' +
            '</div>';

        document.body.appendChild(overlay);

        function closeDialog() {
            if (nav && nav._libImageListener) {
                nav.removeFolderLoadedListener(nav._libImageListener);
                nav._libImageListener = null;
            }
            var el = document.getElementById('lib-image-dialog');
            if (el) el.remove();
        }

        var closeBtn = dialog.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        var cancelBtn = dialog.querySelector('#lib-image-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeDialog();
        });
        var escHandler = function (e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        function updateConfirmState() {
            var confirmBtn = document.getElementById('lib-image-confirm');
            if (confirmBtn) confirmBtn.disabled = !selectedPath;
        }

        function selectFile(path) {
            selectedPath = path;
            updateConfirmState();
            var container = document.getElementById('lib-image-content');
            if (container) {
                container.querySelectorAll('.lib-cover-file-row').forEach(function (r) {
                    r.classList.remove('selected');
                });
                var row = container.querySelector('[data-file-path="' + escapeHtml(path) + '"]');
                if (row) row.classList.add('selected');
            }
        }

        function renderFolderList() {
            var container = document.getElementById('lib-image-content');
            if (!container) return;
            var folders = (ctx.state.navigation && ctx.state.navigation.folders) ? ctx.state.navigation.folders : [];
            var allFiles = ctx.state.files || [];
            var folderSet = {};
            folders.forEach(function (f) { folderSet[f] = true; });
            var files = allFiles.filter(function (f) { return !folderSet[f]; });
            files = files.filter(function (filePath) {
                var base = filePath.split('/').pop() || filePath;
                var ext = base.split('.').pop().toLowerCase();
                return IMAGE_EXTS.indexOf(ext) !== -1;
            });

            var html = '<table class="reader-scan-table"><tbody>';
            if (folders.length > 0) {
                html += '<tr><td class="reader-scan-table-spacer"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('subfolders') || 'Sous-dossiers') + '</div></td></tr>';
                folders.forEach(function (folderPath) {
                    var parts = folderPath.split('/').filter(Boolean);
                    var folderName = parts.length ? parts[parts.length - 1] : (folderPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : folderPath);
                    html += '<tr class="navigation-folder-row reader-scan-folder-row" data-folder-path="' + escapeHtml(folderPath) + '">';
                    html += '<td class="navigation-col-audio">📁</td>';
                    html += '<td class="navigation-col-file"><span class="navigation-folder-name">' + escapeHtml(folderName) + '</span></td>';
                    html += '</tr>';
                });
            }
            if (files.length > 0) {
                html += '<tr><td class="reader-scan-table-spacer"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('images') || 'Images') + '</div></td></tr>';
                files.forEach(function (filePath) {
                    var baseName = filePath.split('/').pop() || filePath;
                    var isSelected = (filePath === selectedPath);
                    html += '<tr class="reader-scan-file-row lib-cover-file-row' + (isSelected ? ' selected' : '') + '" data-file-path="' + escapeHtml(filePath) + '">';
                    html += '<td class="navigation-col-audio">🖼</td>';
                    html += '<td class="navigation-col-file"><span class="navigation-folder-name">' + escapeHtml(baseName) + '</span></td>';
                    html += '</tr>';
                });
            }
            if (!folders.length && !files.length) {
                html += '<tr><td><div class="reader-scan-empty">' + escapeHtml(t('noResults') || 'Aucun élément trouvé') + '</div></td></tr>';
            }
            html += '</tbody></table>';
            container.innerHTML = html;
            nav.bindFolderRow(container);
            container.querySelectorAll('.lib-cover-file-row').forEach(function (row) {
                if (row._boundImage) return;
                row._boundImage = true;
                row.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    selectFile(row.getAttribute('data-file-path'));
                });
            });
            updateConfirmState();
        }

        function renderFavorites() {
            var container = document.getElementById('lib-image-favorites');
            if (!container) return;
            var heading = document.createElement('div');
            heading.className = 'lib-nav-favorites-heading';
            heading.textContent = t('navFavorites') || 'Favoris';
            container.innerHTML = '';
            container.appendChild(heading);
            nav.loadFavorites().then(function (favorites) {
                if (!container.parentNode) return;
                container.innerHTML = '';
                container.appendChild(heading);
                var list = document.createElement('div');
                list.className = 'lib-nav-favorites-list';
                if (!favorites || !favorites.length) {
                    var empty = document.createElement('div');
                    empty.className = 'lib-nav-favorites-empty';
                    empty.textContent = t('navNoFavorites') || 'Aucun favori';
                    list.appendChild(empty);
                } else {
                    favorites.forEach(function (favPath) {
                        var parts = favPath.split('/').filter(Boolean);
                        var folderName = parts.length ? parts[parts.length - 1] : (favPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : favPath);
                        var item = document.createElement('div');
                        item.className = 'reader-scan-favorites-item';
                        item.title = favPath;
                        item.innerHTML = '<span class="reader-scan-favorites-star">★</span><span class="reader-fav-text">' + escapeHtml(folderName) + '</span>';
                        item.addEventListener('click', function (e) {
                            e.stopPropagation();
                            nav.navigateToFolder(favPath);
                        });
                        list.appendChild(item);
                    });
                }
                container.appendChild(list);
            }).catch(function () {
                if (!container.parentNode) return;
                container.innerHTML = '';
                container.appendChild(heading);
                var errDiv = document.createElement('div');
                errDiv.className = 'lib-nav-favorites-empty';
                errDiv.textContent = t('networkError') || 'Erreur réseau';
                container.appendChild(errDiv);
            });
        }

        nav._libImageListener = function () {
            if (!document.getElementById('lib-image-breadcrumb')) return;
            nav.renderBreadcrumb('lib-image-breadcrumb');
            renderFolderList();
            renderFavorites();
        };
        nav.addFolderLoadedListener(nav._libImageListener);

        nav.renderBreadcrumb('lib-image-breadcrumb');

        var contentEl = document.getElementById('lib-image-content');
        if (contentEl) {
            contentEl.innerHTML = '<div class="lib-loading-text">' + escapeHtml(t('loading') || 'Chargement…') + '</div>';
        }

        renderFavorites();
        nav.loadFolderContent(nav.getCurrentPath());

        var confirmBtn = dialog.querySelector('#lib-image-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = function () {
                var path = selectedPath;
                var el = document.getElementById('lib-image-dialog');
                if (el) el.remove();
                if (nav && nav._libImageListener) {
                    nav.removeFolderLoadedListener(nav._libImageListener);
                    nav._libImageListener = null;
                }
                callback(path || null);
            };
        }
    }

    function loadHomeImage() {
        return L.apiRequest(L.getBaseUrl() + '/api/user-preferences', {
            method: 'GET'
        }).then(function (data) {
            if (data && data.success && data.preferences && data.preferences.homeImage !== undefined) {
                L.state.homeImage = data.preferences.homeImage || null;
            }
        }).catch(function () {
            L.state.homeImage = null;
        });
    }

    function editHomeImage() {
        if (!L.state.isAdmin) { L.showToast(L.t('readOnlyHint'), 'error'); return; }
        L.showImagePicker(function (imgPath) {
            if (!imgPath) return;
            L.apiRequest(L.getBaseUrl() + '/api/user-preferences', {
                method: 'POST',
                body: JSON.stringify({ key: 'homeImage', value: imgPath })
            }).then(function (data) {
                if (data && data.success) {
                    L.state.homeImage = imgPath;
                    L.render();
                    L.showToast(L.t('coverSet'), 'info');
                } else {
                    L.showToast(L.t('coverSetError'), 'error');
                }
            }).catch(function () {
                L.showToast(L.t('coverSetError'), 'error');
            });
        });
    }

    L.coverUrl = coverUrl;
    L.coverOfFirstTome = coverOfFirstTome;
    L.getCollectionCoverUrl = getCollectionCoverUrl;
    L.loadCoversBulk = loadCoversBulk;
    L.renderNoCoverPlaceholder = renderNoCoverPlaceholder;
    L.renderTomeIcon = renderTomeIcon;

    L.pickCoverForTome = pickCoverForTome;
    L.showImagePicker = showImagePicker;
    L.loadHomeImage = loadHomeImage;
    L.editHomeImage = editHomeImage;

})(window.RenamerLibrary);