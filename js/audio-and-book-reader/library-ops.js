(function (L) {
    'use strict';

    var state = L.state;
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
                var isTomeInProgress = L.isTomeInProgress;
    var renderTomeStatusIcon = L.renderTomeStatusIcon;
    var bookmarkLabel = L.bookmarkLabel;
        var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;

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
                    L.render();
                } else {
                    showToast(t('renamedError'), 'error');
                }
            }).catch(function () { showToast(t('renamedError'), 'error'); });
        });
    }

    function deleteLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        var msg = t('deleteLibConfirm').replace('{name}', lib.name || '');
        RenamerUtils.showConfirmDialog(
            t('contextDelete'),
            msg,
            function () {
                apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, { method: 'DELETE' }).then(function (data) {
                    if (data && data.success) {
                        state.libraries = (state.libraries || []).filter(function (l) { return String(l.id) !== String(lib.id); });
                        showToast(t('deleted'), 'info');
                        L.render();
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function () { showToast(t('scanError'), 'error'); });
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-lib' }
         );
     }

    function addLibraryPath(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        showFolderPicker(function (newPath) {
            if (!newPath) {
                showToast(t('scanCancelled'), 'info');
                return;
            }
            RenamerUtils.showConfirmDialog(
                t('addLibraryPathTitle'),
                t('scanConfirm').replace('{name}', (lib.name || '')) + ' ?',
                function () {
                    apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/paths', {
                        method: 'POST',
                        body: JSON.stringify({ path: newPath })
                    }).then(function (data) {
                        if (data && data.success) {
                            lib.paths = data.paths || (data.library ? data.library.paths : null) || lib.paths;
                            if (data.library && data.library.paths) lib.paths = data.library.paths;
                            if (data.library && data.library.description != null) lib.description = data.library.description;
                            if (data.library && data.library.libraryType != null) lib.libraryType = data.library.libraryType;
                            showToast(t('libPathAdded'), 'info');
                            rescanLibrary(lib);
                        } else {
                            showToast(t('libPathRemoveError') + ((data && data.error) || ''), 'error');
                        }
                    }).catch(function () { showToast(t('libPathRemoveError'), 'error'); });
                },
                { confirmLabel: t('scanConfirm'), cancelLabel: t('scanCancel') || 'Annuler', dialogId: 'renamer-add-lib-path-confirm' }
            );
        });
    }

    function changeLibraryType(lib, newType) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        if (newType === lib.libraryType) return;
        RenamerUtils.showConfirmDialog(
            t('libTypeOverwriteWarning').split(' ?')[0] || 'Changer le type',
            t('libTypeOverwriteWarning'),
            function () {
                var payload = {
                    name: lib.name || '',
                    description: lib.description || '',
                    paths: lib.paths || [lib.description || ''],
                    libraryType: newType,
                };
                apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                }).then(function (data) {
                    if (data && data.success) {
                        lib.libraryType = newType;
                        if (data.library && data.library.libraryType != null) lib.libraryType = data.library.libraryType;
                        showToast(t('libTypeUpdated'), 'info');
                        rescanLibrary(lib);
                    } else {
                        showToast(t('libTypeUpdateError'), 'error');
                    }
                }).catch(function () { showToast(t('libTypeUpdateError'), 'error'); });
            },
            { confirmLabel: t('confirm'), cancelLabel: t('cancel'), dialogId: 'renamer-change-lib-type' }
        );
    }

    function changeCollectionType(col, lib, newType) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        col.rules = col.rules || {};
        col.rules.type = newType;
        var payload = {
            name: col.name || '',
            description: col.description || '',
            rules: L.stripRulesForBackend({ folder: col.rules.folder, files: col.rules.files || [], children: col.rules.children || [] }),
        };
        payload.rules.type = newType;
        apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, {
            method: 'PUT',
            body: JSON.stringify(payload)
        }).then(function (data) {
            if (data && data.success) {
                col.rules.type = newType;
                showToast(t('colTypeUpdated'), 'info');
                if (lib) { L.loadCollections(lib.id, function () { L.renderCollections(lib); }); }
            } else {
                showToast(t('colTypeUpdateError'), 'error');
            }
        }).catch(function () { showToast(t('colTypeUpdateError'), 'error'); });
    }

    function getCollectionType(col) {
        if (!col || !col.rules) return null;
        return col.rules.type || null;
    }

    function removeLibraryPath(lib, pathToRemove) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        RenamerUtils.showConfirmDialog(
            t('libPathRemoveConfirm').replace('{path}', pathToRemove).replace('{name}', lib.name || ''),
            '',
            function () {
                apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/paths', {
                    method: 'DELETE',
                    body: JSON.stringify({ path: pathToRemove })
                }).then(function (data) {
                    if (data && data.success) {
                        if (data.library && data.library.paths) lib.paths = data.library.paths;
                        if (data.library && data.library.description != null) lib.description = data.library.description;
                        showToast(t('libPathRemoved'), 'info');
                        rescanLibrary(lib);
                    } else {
                        showToast(t('libPathRemoveError') + ((data && data.error) || ''), 'error');
                    }
                }).catch(function () { showToast(t('libPathRemoveError'), 'error'); });
            },
            { danger: true, confirmLabel: t('confirm'), cancelLabel: t('cancel'), dialogId: 'renamer-remove-lib-path' }
        );
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
                L.loadLibraries();
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
                if (lib) { L.loadCollections(lib.id, function () { L.renderCollections(lib); }); }
            } else {
                showToast(t('scanError') + ' : ' + ((data && data.error) || ''), 'error');
            }
        }).catch(function () { showToast(t('scanError'), 'error'); });
    }

    function deleteCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        var msg = t('deleteColConfirm').replace('{name}', col.name || '');
        RenamerUtils.showConfirmDialog(
            t('contextDeleteCol') || t('contextDelete'),
            msg,
            function () {
                apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'DELETE' }).then(function (data) {
                    if (data && data.success) {
                        if (lib) { L.loadCollections(lib.id, function () { L.renderCollections(lib); }); }
                        showToast(t('deleted'), 'info');
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function () { showToast(t('scanError'), 'error'); });
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-col' }
        );
    }

    function navigateToCollection(col, lib) {
        state.view = 'tomes';
        state.currentLibrary = lib || state.currentLibrary;
        state.currentCollection = col;
        state.currentTome = null;
        state.readerTreePath = [];
        var urlParams = { view: 'tomes' };
        if (lib) urlParams.library = String(lib.id);
        if (col) urlParams.collection = String(col.id);
        updateUrl(urlParams);
        L.renderTomes(col);
        L.renderSidebar();
        L.renderBreadcrumb();
    }

    function showLibraryTypeSubMenu(items, currentType, onChange) {
        var typeOptions = [
            { type: 'flat', label: t('libTypeFlatLabel') },
            { type: 'tomes', label: t('libTypeTomesLabel') },
            { type: 'audio', label: t('libTypeAudioLabel'), enabled: false },
        ];
        typeOptions.forEach(function (opt) {
            items.push({
                label: opt.label + (opt.type === currentType ? ' ✓' : ''),
                icon: '',
                action: opt.enabled === false ? null : function () {
                    onChange(opt.type);
                },
                disabled: opt.enabled === false,
            });
        });
        items.push({ type: 'separator' });
    }

    function promptRename(label, current, cb) {
        RenamerUtils.showPromptDialog(label, '', current || '', function (name) {
            name = (name || '').trim();
            if (!name) return;
            cb(name);
        }, { dialogId: 'renamer-rename-dialog', confirmLabel: t('rename') });
    }

    function showFolderPicker(callback) {
        console.log('[Library DEBUG] showFolderPicker called');
        if (typeof RenamerNavigation === 'undefined' || !RenamerNavigation) {
            console.warn('[Library DEBUG] RenamerNavigation not available, falling back to prompt dialog');
            RenamerUtils.showPromptDialog(
                t('scanFolderDialog') || 'Sélectionner un dossier',
                t('newLibPlaceholder') || 'ex: BD, Romans, Mangas',
                '',
                function (p) {
                    p = (p || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
                    if (p) {
                        callback(p);
                    } else {
                        callback(null);
                    }
                },
                { dialogId: 'renamer-folder-path-prompt', confirmLabel: t('scanConfirm') || 'Scanner', cancelLabel: t('scanCancel') || 'Annuler' }
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

        var existing = document.getElementById('lib-folder-dialog');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-folder-dialog';
        overlay.className = 'lib-dialog-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal lib-dialog-modal';
        overlay.appendChild(dialog);

        dialog.innerHTML =
            '<div class="renamer-header lib-dialog-header">' +
                '<h3 class="lib-dialog-title">' + escapeHtml(t('scanFolderDialog') || 'Sélectionner un dossier à scanner') + '</h3>' +
                '<button type="button" class="renamer-btn-icon renamer-modal-close lib-dialog-close-btn" aria-label="' + escapeHtml(t('readerClose') || 'Fermer') + '" title="' + escapeHtml(t('readerClose') || 'Fermer') + '">×</button>' +
            '</div>' +
            '<div id="lib-folder-breadcrumb" class="lib-dialog-breadcrumb"></div>' +
            '<div id="lib-folder-favorites" class="lib-dialog-favorites"></div>' +
            '<div id="lib-folder-content" class="lib-dialog-content"></div>' +
            '<div class="lib-dialog-footer">' +
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

            if (folders.length > 0) {
                html += '<tr><td class="reader-scan-table-spacer"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('subfolders') || 'Sous-dossiers') + '</div></td></tr>';
                folders.forEach(function(folderPath) {
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
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('scanFiles') || 'Fichiers') + '</div></td></tr>';
                files.forEach(function(filePath) {
                    var baseName = filePath.split('/').pop() || filePath;
                    var ext = baseName.split('.').pop().toLowerCase();
                    var icon = '📄';
                    if (['pdf', 'cbz', 'epub', 'cbr'].indexOf(ext) !== -1) icon = '📚';
                    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) icon = '🖼';
                    html += '<tr class="reader-scan-file-row">';
                    html += '<td class="navigation-col-audio">' + icon + '</td>';
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
        }

         var favoritesRenderGen = 0;

         function renderFavorites() {
             var container = document.getElementById('lib-folder-favorites');
             if (!container) return;

             var gen = (favoritesRenderGen = favoritesRenderGen + 1);

              var heading = document.createElement('div');
              heading.className = 'lib-nav-favorites-heading';
              heading.textContent = t('navFavorites') || 'Favoris';
              container.innerHTML = '';
              container.appendChild(heading);

              nav.loadFavorites().then(function(favorites) {
                  if (!container.parentNode || favoritesRenderGen !== gen) return;
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
                      favorites.forEach(function(favPath) {
                          var parts = favPath.split('/').filter(Boolean);
                          var folderName = parts.length ? parts[parts.length - 1] : (favPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : favPath);
                          var item = document.createElement('div');
                          item.className = 'reader-scan-favorites-item';
                          item.title = favPath;
                          item.innerHTML = '<span class="reader-scan-favorites-star">★</span><span class="reader-fav-text">' + escapeHtml(folderName) + '</span>';
                          item.addEventListener('click', function(e) {
                              e.stopPropagation();
                              nav.navigateToFolder(favPath);
                          });
                          list.appendChild(item);
                      });
                  }
                  container.appendChild(list);
              }).catch(function() {
                  if (!container.parentNode || favoritesRenderGen !== gen) return;
                  container.innerHTML = '';
                  container.appendChild(heading);
                  var errDiv = document.createElement('div');
                  errDiv.className = 'lib-nav-favorites-empty';
                  errDiv.textContent = t('networkError') || 'Erreur réseau';
                  container.appendChild(errDiv);
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
            contentEl.innerHTML = '<div class="lib-loading-text">' + escapeHtml(t('loading') || 'Chargement…') + '</div>';
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

    function showLibraryTypePicker(name, folder, cb) {
        var existing = document.getElementById('lib-type-picker-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-type-picker-overlay';
        overlay.className = 'lib-dialog-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal lib-dialog-modal lib-type-picker-modal';
        overlay.appendChild(dialog);

        var header = document.createElement('div');
        header.className = 'lib-type-picker-header';
        header.innerHTML =
            '<h3 class="lib-type-picker-title">' + escapeHtml(t('newLibTypePrompt')) + '</h3>' +
            '<button type="button" class="renamer-btn-icon renamer-modal-close lib-type-picker-close-btn" aria-label="' + escapeHtml(t('readerClose') || 'Fermer') + '" title="' + escapeHtml(t('readerClose') || 'Fermer') + '">×</button>';
        dialog.appendChild(header);

        var body = document.createElement('div');
        body.className = 'lib-type-picker-body';

        var info = document.createElement('div');
        info.className = 'lib-type-picker-info';
        info.textContent = (name || '') + ' → ' + (folder || '');
        body.appendChild(info);

        var options = [
            { type: 'flat', label: t('libTypeFlat'), icon: '📚', hint: t('libTypeFlatHint'), enabled: true },
            { type: 'tomes', label: t('libTypeTomes'), icon: '📚', hint: t('libTypeTomesHint'), enabled: true },
            { type: 'audio', label: t('libTypeAudio'), icon: '🎧', hint: t('libTypeAudioHint'), enabled: false },
        ];

        var selected = 'tomes';
        var optionEls = [];

        options.forEach(function (opt) {
            var optDiv = document.createElement('div');
            optDiv.className = 'lib-type-picker-option' + (opt.enabled ? '' : ' disabled');
            optDiv.innerHTML =
                '<div class="lib-type-picker-option-content">' +
                    '<span class="lib-type-picker-option-icon">' + opt.icon + '</span>' +
                    '<div class="lib-type-picker-option-label-wrap">' +
                        '<div class="lib-type-picker-option-label">' + escapeHtml(opt.label) + '</div>' +
                        '<div class="lib-type-picker-option-hint">' + escapeHtml(opt.hint) + '</div>' +
                    '</div>' +
                    (opt.enabled
                        ? '<div class="lib-type-picker-radio"><div class="lib-type-picker-radio-inner ' + (opt.type === selected ? 'selected' : '') + '"></div></div>'
                        : '<div title="' + escapeHtml(t('libTypeAudioSoon')) + '" class="lib-type-picker-audio-hint">ⓘ</div>') +
                '</div>';
            if (opt.enabled) {
                optDiv.addEventListener('click', function () {
                    selected = opt.type;
                    optionEls.forEach(function (el, i) {
                        var radios = el.querySelectorAll('.lib-type-picker-radio-inner');
                        if (options[i].type === selected) {
                            radios.forEach(function (d) { d.classList.add('selected'); });
                        } else {
                            radios.forEach(function (d) { d.classList.remove('selected'); });
                        }
                    });
                });
            }
            optionEls.push(optDiv);
            body.appendChild(optDiv);
        });

        dialog.appendChild(body);

        var footer = document.createElement('div');
        footer.className = 'lib-type-picker-footer';
        footer.innerHTML =
            '<button type="button" class="renamer-btn renamer-modal-close">' + escapeHtml(t('scanCancel') || 'Annuler') + '</button>' +
            '<button type="button" id="lib-type-confirm" class="renamer-btn renamer-btn-primary">' + escapeHtml(t('libTypeConfirm')) + '</button>';
        dialog.appendChild(footer);

        document.body.appendChild(overlay);

        function closePicker() {
            var el = document.getElementById('lib-type-picker-overlay');
            if (el) el.remove();
        }

        var closeBtn = header.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closePicker);
        var cancelBtn = footer.querySelector('.renamer-modal-close');
        if (cancelBtn) cancelBtn.addEventListener('click', closePicker);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closePicker();
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closePicker();
                document.removeEventListener('keydown', escHandler);
            }
        });

        var confirmBtn = footer.querySelector('#lib-type-confirm');
        confirmBtn.addEventListener('click', function () {
            closePicker();
            cb({ name: name, folder: folder, type: selected });
        });

        var audioOpt = options[2];
        if (!audioOpt.enabled && audioOpt.type === 'audio') {
            // Le bouton audio reste désactivé; le tooltip "Fonctionnalité à venir" s'affiche au survol.
        }
    }

    function createLibrary(rootFolder, name, libraryType) {
        libraryType = libraryType || 'tomes';
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
            var classified;
            if (libraryType === 'flat') {
                classified = L.classifyScanFlat(files, rootFolder);
            } else {
                classified = L.classifyScan(files, rootFolder);
            }

            var colNames;
            if (libraryType === 'flat') {
                colNames = [classified.rootBase.name];
                classified = { [colNames[0]]: classified.rootBase };
            } else {
                colNames = Object.keys(classified);
            }

            if (colNames.length === 0) {
                showToast(t('noResults'), 'info');
                return;
            }
            apiRequest(getBaseUrl() + '/api/reader/libraries', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    description: rootFolder,
                    paths: [rootFolder],
                    libraryType: libraryType,
                }),
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
                        L.loadLibraries();
                    }
                };
                colNames.forEach(function (colName) {
                    var col = classified[colName];
                    var strippedRules = L.stripRulesForBackend({ folder: col.folder, files: col.files, children: col.children || [] });
                    apiRequest(getBaseUrl() + '/api/reader/collections', {
                        method: 'POST',
                        body: JSON.stringify({
                            libraryId: libId,
                            name: colName,
                            description: '',
                            rules: strippedRules,
                        }),
                    }).then(function () { onEach(); }).catch(function (err) {
                        var msg = (err && err.message) ? err.message : String(err);
                        showToast(t('scanError') + ' : ' + msg, 'error');
                        onEach();
                    });
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
            RenamerUtils.showPromptDialog(t('newLibPrompt'), '', '', function (name) {
                if (!name || !name.trim()) {
                    showToast(t('scanCancelled'), 'info');
                    return;
                }
                showLibraryTypePicker(name.trim(), rootFolder, function (opts) {
                    createLibrary(opts.folder, opts.name, opts.type);
                });
            }, { dialogId: 'renamer-add-lib-prompt', confirmLabel: t('scanConfirm') || 'Scanner', cancelLabel: t('scanCancel') || 'Annuler' });
        });
    }

    L.renameLibrary = renameLibrary;
    L.deleteLibrary = deleteLibrary;
    L.addLibraryPath = addLibraryPath;
    L.changeLibraryType = changeLibraryType;
    L.changeCollectionType = changeCollectionType;
    L.getCollectionType = getCollectionType;
    L.removeLibraryPath = removeLibraryPath;
    L.rescanLibrary = rescanLibrary;
    L.rescanCollection = rescanCollection;
    L.deleteCollection = deleteCollection;
    L.navigateToCollection = navigateToCollection;
    L.showLibraryTypeSubMenu = showLibraryTypeSubMenu;
    L.promptRename = promptRename;
    L.showFolderPicker = showFolderPicker;
    L.showLibraryTypePicker = showLibraryTypePicker;
    L.createLibrary = createLibrary;
    L.addLibrary = addLibrary;

})(window.RenamerLibrary);