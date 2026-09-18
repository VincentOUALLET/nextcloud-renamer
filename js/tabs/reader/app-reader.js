(function() {
    'use strict';

    var TAB_ID = 'reader';
    var BACK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
    var IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    var DOC_EXTENSIONS = ['pdf', 'cbz', 'cbr', 'epub'];

    function getFileExt(filePath) {
        var base = String(filePath).replace(/^.*\//, '');
        var idx = base.lastIndexOf('.');
        return idx >= 0 ? base.substring(idx + 1).toLowerCase() : '';
    }

    function isImageFile(filePath) {
        var ext = getFileExt(filePath);
        return IMAGE_EXTENSIONS.indexOf(ext) !== -1;
    }

    function isDocumentFile(filePath) {
        var ext = getFileExt(filePath);
        return DOC_EXTENSIONS.indexOf(ext) !== -1;
    }

    function groupScannedFiles(files) {
        var docs = [];
        var imageGroups = {};

        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (isDocumentFile(f.path)) {
                docs.push({ type: 'doc', file: f });
            } else if (isImageFile(f.path)) {
                var dir = f.path.replace(/\/[^/]*$/, '') || '/';
                if (!imageGroups[dir]) {
                    imageGroups[dir] = { type: 'image-tome', dir: dir, files: [] };
                }
                imageGroups[dir].files.push(f);
            }
        }

        var imageTomes = [];
        for (var dir in imageGroups) {
            if (imageGroups[dir].files.length >= 2) {
                imageTomes.push(imageGroups[dir]);
            } else if (imageGroups[dir].files.length === 1) {
                docs.push({ type: 'doc', file: imageGroups[dir].files[0] });
            }
        }

        return docs.concat(imageTomes);
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildTab(ctx) {
        var t = ctx.t;
        return '' +
        '<div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:visible;">' +
            '<div class="renamer-main" style="flex-direction:column;">' +
                '<div class="renamer-preview" id="reader-content" style="flex:1;display:flex;flex-direction:column;overflow:visible;min-width:0;">' +
                    '<div class="renamer-preview-header" id="reader-header" style="display:flex;align-items:center;justify-content:space-between;padding:8px 23px 8px 10px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;">' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<button type="button" id="reader-back-btn" class="renamer-btn-icon" title="' + escapeHtml(t('readerBack')) + '" style="display:none;">' + BACK_SVG + '</button>' +
                            '<span id="reader-title">' + (t('readerTitle') || 'Lecteur') + '</span>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<button type="button" id="reader-explore-btn" class="renamer-btn renamer-btn-secondary reader-explore-btn" data-translation="readerExploreMode" title="' + escapeHtml(t('readerExploreMode') || 'Mode exploration') + '" style="display:none;">' + (t('readerExploreMode') || 'Exploration') + '</button>' +
                            '<button type="button" id="reader-scan-btn" class="renamer-btn renamer-btn-secondary" data-translation="readerScan">📂 ' + (t('readerScan') || 'Scanner un dossier') + '</button>' +
                            '<button type="button" id="reader-library-btn" class="renamer-btn renamer-btn-secondary" data-translation="readerLibrary" title="' + escapeHtml(t('readerLibrary') || 'Bibliothèque') + '">📚 ' + (t('readerLibrary') || 'Bibliothèque') + '</button>' +
                            '<button type="button" id="reader-new-lib-btn" class="renamer-btn renamer-btn-secondary" data-translation="readerNewLibrary" style="display:none;">' + (t('readerNewLibrary') || 'Nouvelle librairie') + '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="renamer-preview-list" id="reader-list" style="flex:1;overflow-y:auto;padding:12px;"></div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function renderLibraries(ctx) {
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.innerHTML = '';

        var libs = ctx.state && ctx.state.readerLibraries ? ctx.state.readerLibraries : [];

        // Continue reading section
        var continueSection = document.createElement('div');
        continueSection.style.cssText = 'margin-bottom:24px;';
        var continueTitle = document.createElement('div');
        continueTitle.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:14px;';
        continueTitle.textContent = ctx.t('readerContinueReading') || 'Continuer la lecture';
        continueSection.appendChild(continueTitle);

        var continueList = document.createElement('div');
        continueList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
        continueSection.appendChild(continueList);

        var hasProgress = false;
        if (ctx.state && ctx.state.readerBookmarks) {
            var paths = Object.keys(ctx.state.readerBookmarks);
            for (var i = 0; i < paths.length; i++) {
                (function(path) {
                    var prog = ctx.state.readerBookmarks[path];
                    if (prog.type === 'read') return;
                    hasProgress = true;
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:6px;cursor:pointer;';
                    row.addEventListener('click', function() {
                        ctx.state.readerView = 'reading';
                        ctx.state.readerCurrentDoc = { path: path, progress: ctx.state.readerBookmarks[path] };
                        render(ctx);
                    });

                     var info = document.createElement('div');
                     info.style.cssText = 'display:flex;flex-direction:column;';
                     var fname = document.createElement('div');
                     fname.style.cssText = 'font-weight:500;font-size:13px;';
                     fname.textContent = path.split('/').pop();
                     info.appendChild(fname);
                     var progInfo = document.createElement('div');
                     progInfo.style.cssText = 'font-size:11px;opacity:0.6;';
                     if (prog.type === 'read') {
                         progInfo.textContent = ctx.t('readerCompleted') || 'Read';
                     } else if (prog.type === 'pdf_page' || prog.type === 'cbz_page' || prog.type === 'reader_page') {
                         progInfo.textContent = (ctx.t('readerPage') || 'Page') + ' ' + prog.value + '/' + prog.total;
                     } else if (prog.type === 'epub_percent') {
                         progInfo.textContent = prog.value + '%';
                     } else if (prog.type === 'image_viewed') {
                         progInfo.textContent = '✓';
                     }
                     info.appendChild(progInfo);
                     row.appendChild(info);

                     var delBtn = document.createElement('button');
                     delBtn.type = 'button';
                     delBtn.className = 'lib-delete-prog-btn';
                     delBtn.textContent = '×';
                     delBtn.title = ctx.t('readerDeleteProgress') || 'Delete progress';
                     delBtn.setAttribute('data-translation', 'readerDeleteProgress');
                     delBtn.style.cssText = 'flex-shrink:0;margin-left:8px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;opacity:0.6;';
                      delBtn.addEventListener('click', function(e) {
                          e.stopPropagation();
                          ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
                              method: 'DELETE',
                              body: JSON.stringify({ path: path })
                          }).then(function(data) {
                              if (data && data.success) {
                                  delete ctx.state.readerBookmarks[path];
                                  row.remove();
                                  if (ctx.showToast) ctx.showToast(ctx.t('readerProgressDeleted') || 'Progress deleted', 'info');
                              } else {
                                  if (ctx.showToast) ctx.showToast(ctx.t('readerError') || 'Error', 'error');
                              }
                          }).catch(function() {
                              if (ctx.showToast) ctx.showToast(ctx.t('readerError') || 'Error', 'error');
                          });
                      });
                     row.appendChild(delBtn);

                     var arrow = document.createElement('div');
                    arrow.textContent = '→';
                    row.appendChild(arrow);
                    continueList.appendChild(row);
                })(paths[i]);
            }
        }

        if (!hasProgress) {
            var emptyProg = document.createElement('div');
            emptyProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            emptyProg.textContent = 'Aucune progression enregistrée';
            continueList.appendChild(emptyProg);
        }

        list.appendChild(continueSection);

        // Libraries grid
        if (libs.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
            empty.textContent = ctx.t('readerNoLibraries') || 'Aucune librairie';
            empty.setAttribute('data-translation', 'readerNoLibraries');
            list.appendChild(empty);
            return;
        }

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;';

        libs.forEach(function(lib) {
            var card = document.createElement('div');
            card.style.cssText = 'background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;';
            card.addEventListener('mouseenter', function() { card.style.transform = 'translateY(-2px)'; });
            card.addEventListener('mouseleave', function() { card.style.transform = 'translateY(0)'; });
            card.addEventListener('click', function() {
                if (ctx.state) {
                    ctx.state.readerView = 'collection';
                    ctx.state.readerCurrentLibrary = lib;
                    loadCollections(ctx, lib.id);
                }
            });

            var icon = document.createElement('div');
            icon.style.cssText = 'font-size:32px;margin-bottom:8px;';
            icon.textContent = '📚';
            card.appendChild(icon);

            var name = document.createElement('div');
            name.style.cssText = 'font-weight:600;margin-bottom:4px;';
            name.textContent = lib.name || '';
            card.appendChild(name);

            var desc = document.createElement('div');
            desc.style.cssText = 'font-size:12px;opacity:0.6;';
            desc.textContent = lib.description || '';
            card.appendChild(desc);

            grid.appendChild(card);
        });

        list.appendChild(grid);
    }

    function renderCollections(ctx, collections) {
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.innerHTML = '';

        if (!collections || collections.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
            empty.textContent = ctx.t('readerNoCollections') || 'Aucune collection';
            empty.setAttribute('data-translation', 'readerNoCollections');
            list.appendChild(empty);
            return;
        }

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;';

        collections.forEach(function(col) {
            var card = document.createElement('div');
            card.style.cssText = 'background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;';
            card.addEventListener('mouseenter', function() { card.style.transform = 'translateY(-2px)'; });
            card.addEventListener('mouseleave', function() { card.style.transform = 'translateY(0)'; });
            card.addEventListener('click', function() {
                if (ctx.state) {
                    ctx.state.readerView = 'reading';
                    ctx.state.readerCurrentDoc = col;
                    render(ctx);
                }
            });

            var icon = document.createElement('div');
            icon.style.cssText = 'font-size:32px;margin-bottom:8px;';
            icon.textContent = '📂';
            card.appendChild(icon);

            var name = document.createElement('div');
            name.style.cssText = 'font-weight:600;margin-bottom:4px;';
            name.textContent = col.name || '';
            card.appendChild(name);

            var desc = document.createElement('div');
            desc.style.cssText = 'font-size:12px;opacity:0.6;';
            desc.textContent = col.description || '';
            card.appendChild(desc);

            grid.appendChild(card);
        });

        list.appendChild(grid);
    }

    function renderEmpty(ctx) {
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.innerHTML = '';

        var empty = document.createElement('div');
        empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
        empty.textContent = ctx.t('readerEmpty') || 'Sélectionnez un dossier pour commencer';
        empty.setAttribute('data-translation', 'readerEmpty');
        list.appendChild(empty);
    }

    function bind(ctx) {
        console.log('[Reader DEBUG] bind called, activeTab:', ctx.state && ctx.state.activeTab);

        ctx.saveProgress = function(filePath, type, value, total) {
            return saveProgress(ctx, filePath, type, value, total);
        };
        ctx.loadProgress = function(paths) {
            return loadProgress(ctx, paths);
        };
        ctx.deleteProgress = function(filePath) {
            return deleteProgress(ctx, filePath);
        };
        ctx.downloadFile = function(filePath) {
            return downloadFile(ctx, filePath);
        };

        ctx.closeReader = function() {
            if (ctx.state) {
                ctx.state.readerView = 'libraries';
                ctx.state.readerCurrentDoc = null;
            }
            var toast = document.getElementById('renamer-reader-loading-toast');
            if (toast) {
                if (toast._readerTimerInterval) clearInterval(toast._readerTimerInterval);
                toast.remove();
            }
            render(ctx);
        };

        var scanBtn = document.getElementById('reader-scan-btn');
        if (scanBtn && !scanBtn._bound) {
            scanBtn._bound = true;
            scanBtn.addEventListener('click', function(e) {
                console.log('[Reader DEBUG] reader-scan-btn click fired', e);
                showOpenDialog(ctx);
            });
        }

        var libBtn = document.getElementById('reader-library-btn');
        if (libBtn && !libBtn._bound) {
            libBtn._bound = true;
            libBtn.addEventListener('click', function() {
                var url = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/apps/renamer/reader') : '/apps/renamer/reader';
                window.open(url, '_blank');
            });
        }

        var exploreBtn = document.getElementById('reader-explore-btn');
        if (exploreBtn && !exploreBtn._bound) {
            exploreBtn._bound = true;
            exploreBtn.addEventListener('click', function() {
                if (!ctx.state) return;
                ctx.state.readerBrowsingMode = !ctx.state.readerBrowsingMode;
                if (ctx.state.readerBrowsingMode) {
                    exploreBtn.classList.add('reader-explore-active');
                } else {
                    exploreBtn.classList.remove('reader-explore-active');
                }
                updateExploreUrl(ctx);
            });
        }

        var newLibBtn = document.getElementById('reader-new-lib-btn');
        if (newLibBtn && !newLibBtn._bound) {
            newLibBtn._bound = true;
            newLibBtn.addEventListener('click', function() {
                var name = prompt(ctx.t('readerLibraryName') || 'Nom de la librairie');
                if (name && ctx.state) {
                    ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/libraries', {
                        method: 'POST',
                        body: JSON.stringify({ name: name, description: '' })
                    }).then(function(data) {
                        if (data && data.success) {
                            ctx.state.readerLibraries.push({
                                id: data.library.id,
                                name: data.library.name,
                                description: data.library.description
                            });
                            renderLibraries(ctx);
                        }
                    });
                }
            });
        }

        var backBtn = document.getElementById('reader-back-btn');
        if (backBtn && !backBtn._bound) {
            backBtn._bound = true;
            backBtn.addEventListener('click', function() {
                if (ctx.state) {
                    ctx.state.readerView = 'libraries';
                    ctx.state.readerCurrentLibrary = null;
                    ctx.state.readerCurrentCollection = null;
                    render(ctx);
                }
            });
        }

        // Keyboard navigation
        if (!document._readerKeyBound) {
            document._readerKeyBound = true;
            document.addEventListener('keydown', function(e) {
                var view = ctx.state && ctx.state.readerView;
                if (view !== 'reading') return;

                if (e.key === 'Escape') {
                    ctx.state.readerView = 'libraries';
                    ctx.state.readerCurrentDoc = null;
                    render(ctx);
                } else if (e.key === 'f' || e.key === 'F') {
                    var el = document.getElementById('reader-content');
                    if (el) {
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else if (typeof el.requestFullscreen === 'function') {
                            el.requestFullscreen().catch(function() {});
                        }
                    }
                } else if (e.key === '+' || e.key === '=') {
                    if (ctx.state) ctx.state.readerZoom = Math.min(3.0, (ctx.state.readerZoom || 1) + 0.2);
                    render(ctx);
                } else if (e.key === '-' || e.key === '_') {
                    if (ctx.state) ctx.state.readerZoom = Math.max(0.2, (ctx.state.readerZoom || 1) - 0.2);
                    render(ctx);
                }
            });
        }
    }

    function downloadFile(ctx, filePath) {
        var ownerUid = (ctx && ctx.state && ctx.state.ownerUid && ctx.state.ownerUid !== '') ? ctx.state.ownerUid : null;
        var url = ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath);
        if (ownerUid) {
            url += '&ownerUid=' + encodeURIComponent(ownerUid);
        }
        var a = document.createElement('a');
        a.href = url;
        a.download = filePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function updateExploreUrl(ctx) {
        if (ctx && typeof ctx.updateUrl === 'function') {
            ctx.updateUrl({ explore: ctx.state && ctx.state.readerBrowsingMode ? '1' : null });
        }
    }
 
    function updateExploreButton(ctx) {
        var btn = document.getElementById('reader-explore-btn');
        if (!btn) return;
        var view = ctx.state && ctx.state.readerView;
        if (view === 'reading') {
            btn.style.display = 'inline-flex';
            if (ctx.state && ctx.state.readerBrowsingMode) {
                btn.classList.add('reader-explore-active');
            } else {
                btn.classList.remove('reader-explore-active');
            }
        } else {
            btn.style.display = 'none';
        }
    }

    function loadLibraries(ctx) {
        if (!ctx.state) return;
        ctx.state.isLoading = true;
        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/libraries').then(function(data) {
            if (data && data.success) {
                ctx.state.readerLibraries = data.libraries || [];
            }
            ctx.state.isLoading = false;
            render(ctx);
        }).catch(function() {
            ctx.state.isLoading = false;
        });
    }

    function loadCollections(ctx, libraryId) {
        if (!ctx.state) return;
        ctx.state.isLoading = true;
        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/collections?libraryId=' + libraryId).then(function(data) {
            if (data && data.success) {
                ctx.state.readerCollections = data.collections || [];
            }
            ctx.state.isLoading = false;
            render(ctx);
        }).catch(function() {
            ctx.state.isLoading = false;
        });
    }

    function scanFolder(ctx, path) {
        console.log('[Reader DEBUG] scanFolder called, path:', path);
        if (!ctx.state) return;
        ctx.state.isLoading = true;

        if (ctx.showToast) ctx.showToast('Scan en cours… ' + path, 'info');

        var controller = new AbortController();
        var timeoutId = setTimeout(function() {
            console.warn('[Reader DEBUG] scan timeout, aborting request');
            controller.abort();
            if (ctx.showToast) ctx.showToast('Scan interrompu (timeout). Le dossier est trop volumineux.', 'error');
            ctx.state.isLoading = false;
        }, 30000);

        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/scan', {
            method: 'POST',
            body: JSON.stringify({ path: path, recursive: true }),
            signal: controller.signal
        }).then(function(data) {
            clearTimeout(timeoutId);
            console.log('[Reader DEBUG] scan response:', data);
            if (data && data.success) {
                ctx.state.readerScannedFiles = data.files || [];
                ctx.state.readerView = 'scanned';
                console.log('[Reader DEBUG] scan complete, readerView set to scanned, files:', ctx.state.readerScannedFiles.length);
            } else {
                console.warn('[Reader DEBUG] scan returned no success, data:', data);
                if (ctx.showToast) ctx.showToast('Scan échoué', 'error');
            }
            ctx.state.isLoading = false;
            render(ctx);
        }).catch(function(err) {
            clearTimeout(timeoutId);
            console.error('[Reader DEBUG] scan error:', err);
            if (ctx.showToast) ctx.showToast('Erreur scan: ' + (err && err.message ? err.message : String(err)), 'error');
            ctx.state.isLoading = false;
        });
    }

    function showOpenDialog(ctx) {
        console.log('[Reader DEBUG] showOpenDialog called');

        var existing = document.getElementById('reader-scan-dialog');
        if (existing) existing.remove();

        if (typeof RenamerNavigation === 'undefined' || !RenamerNavigation) {
            console.warn('[Reader DEBUG] RenamerNavigation not available, falling back to native dialog');
            return fallbackNativeDialog(ctx);
        }

        var nav = RenamerNavigation;

        if (!ctx.state.navigation) {
            nav.init(ctx);
        }
        if (!ctx.state.navigation || !ctx.state.navigation.currentPath) {
            nav.setCurrentPath('/');
        }
        nav.invalidateFavoritesCache();

        var savedPath = nav.getCurrentPath();

        var overlay = document.createElement('div');
        overlay.id = 'reader-scan-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10006;display:flex;align-items:center;justify-content:center;';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal';
        dialog.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:0;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);max-width:720px;width:90svw;max-height:85svh;';
        overlay.appendChild(dialog);

        dialog.innerHTML =
            '<div class="renamer-header" style="padding:12px 16px;border-bottom:1px solid var(--nc-border);display:flex;align-items:center;justify-content:space-between;">' +
                '<h3 style="margin:0;font-size:16px;font-weight:600;" data-translation="readerScanFolderDialog">' + ctx.escapeHtml(ctx.t('readerScanFolderDialog') || 'Sélectionner un dossier à scanner') + '</h3>' +
                '<button type="button" class="renamer-btn-icon renamer-modal-close" aria-label="' + ctx.escapeHtml(ctx.t('readerClose') || 'Fermer') + '" title="' + ctx.escapeHtml(ctx.t('readerClose') || 'Fermer') + '" data-translation="readerClose" style="font-size:20px;">×</button>' +
            '</div>' +
            '<div id="reader-scan-breadcrumb" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);min-height:32px;"></div>' +
            '<div id="reader-scan-favorites" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);"></div>' +
            '<div id="reader-scan-content" style="flex:1;overflow-y:auto;padding:12px;"></div>' +
            '<div style="padding:12px 16px;border-top:1px solid var(--nc-border);display:flex;justify-content:flex-end;gap:8px;">' +
                '<button type="button" id="reader-scan-cancel" class="renamer-btn" data-translation="readerScanCancel">' + ctx.escapeHtml(ctx.t('readerScanCancel') || ctx.t('cancel') || 'Annuler') + '</button>' +
                '<button type="button" id="reader-scan-confirm" class="renamer-btn renamer-btn-primary" data-translation="readerScanConfirm">' + ctx.escapeHtml(ctx.t('readerScanConfirm') || 'Scanner ce dossier') + '</button>' +
            '</div>';

        document.body.appendChild(overlay);

        function closeDialog() {
            if (nav && nav._readerScanListener) {
                nav.removeFolderLoadedListener(nav._readerScanListener);
                nav._readerScanListener = null;
            }
            var el = document.getElementById('reader-scan-dialog');
            if (el) el.remove();
        }

        var closeBtn = dialog.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        var cancelBtn = dialog.querySelector('#reader-scan-cancel');
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

        nav._readerScanListener = function() {
            if (!document.getElementById('reader-scan-breadcrumb')) return;
            nav.renderBreadcrumb('reader-scan-breadcrumb');
            renderScanFolderList(ctx, nav);
            renderScanFavorites(ctx, nav);
            bindScanConfirm(ctx, nav);
        };
        nav.addFolderLoadedListener(nav._readerScanListener);

        nav.renderBreadcrumb('reader-scan-breadcrumb');

        var contentEl = document.getElementById('reader-scan-content');
        if (contentEl) {
            contentEl.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.5;font-size:13px;">' + ctx.escapeHtml(ctx.t('loading') || 'Chargement…') + '</div>';
        }

        renderScanFavorites(ctx, nav);
        bindScanConfirm(ctx, nav);

        nav.loadFolderContent(nav.getCurrentPath());
    }

    function renderScanFolderList(ctx, nav) {
        var container = document.getElementById('reader-scan-content');
        if (!container) return;

        var currentPath = nav.getCurrentPath();
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
            html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + ctx.escapeHtml(ctx.t('readerSubfolders') || 'Sous-dossiers') + '</div></td></tr>';
            folders.forEach(function(folderPath) {
                var parts = folderPath.split('/').filter(Boolean);
                var folderName = parts.length ? parts[parts.length - 1] : (folderPath === '/' ? (ctx.t('navigationBreadcrumbRoot') || 'Racine') : folderPath);
                html += '<tr class="navigation-folder-row reader-scan-folder-row" data-folder-path="' + ctx.escapeHtml(folderPath) + '" style="cursor:pointer;">';
                html += '<td class="navigation-col-select" style="pointer-events:none;width:24px;"></td>';
                html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">📁</td>';
                html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + ctx.escapeHtml(folderName) + '</span></td>';
                html += '</tr>';
            });
        }

        if (files.length > 0) {
            html += '<tr><td style="padding:0;height:8px;"></td></tr>';
            html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + ctx.escapeHtml(ctx.t('readerFiles') || 'Fichiers') + '</div></td></tr>';
            files.forEach(function(filePath) {
                var baseName = filePath.split('/').pop() || filePath;
                var ext = baseName.split('.').pop().toLowerCase();
                var icon = '📄';
                if (['pdf', 'cbz', 'epub', 'cbr'].indexOf(ext) !== -1) icon = '📚';
                else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) icon = '🖼';
                html += '<tr class="reader-scan-file-row">';
                html += '<td class="navigation-col-select" style="pointer-events:none;width:24px;"></td>';
                html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">' + icon + '</td>';
                html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + ctx.escapeHtml(baseName) + '</span></td>';
                html += '</tr>';
            });
        }

        if (!folders.length && !files.length && !parentRowHtml) {
            html += '<tr><td><div class="reader-scan-empty">' + ctx.escapeHtml(ctx.t('readerNoResults') || 'Aucun élément trouvé') + '</div></td></tr>';
        }

        html += '</tbody></table>';
        container.innerHTML = html;

        nav.bindFolderRow(container);
    }

    function renderScanFavorites(ctx, nav) {
        var container = document.getElementById('reader-scan-favorites');
        if (!container) return;

        var heading = document.createElement('div');
        heading.style.cssText = 'font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;';
        heading.textContent = ctx.t('navFavorites') || 'Favoris';
        container.innerHTML = '';
        container.appendChild(heading);

        nav.loadFavorites().then(function(favorites) {
            if (!container.parentNode) return;
            var list = document.createElement('div');
            list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
            if (!favorites || !favorites.length) {
                var empty = document.createElement('div');
                empty.style.cssText = 'opacity:0.5;font-size:12px;';
                empty.textContent = ctx.t('navNoFavorites') || 'Aucun favori';
                list.appendChild(empty);
            } else {
                favorites.forEach(function(favPath) {
                    var parts = favPath.split('/').filter(Boolean);
                    var folderName = parts.length ? parts[parts.length - 1] : (favPath === '/' ? (ctx.t('navigationBreadcrumbRoot') || 'Racine') : favPath);
                    var item = document.createElement('div');
                    item.className = 'reader-scan-favorites-item';
                    item.title = favPath;
                    item.innerHTML = '<span class="reader-scan-favorites-star">★</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + ctx.escapeHtml(folderName) + '</span>';
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
            container.innerHTML += '<div style="opacity:0.5;font-size:12px;">' + ctx.escapeHtml(ctx.t('networkError') || 'Erreur réseau') + '</div>';
        });
    }

    function bindScanConfirm(ctx, nav) {
        var confirmBtn = document.getElementById('reader-scan-confirm');
        if (!confirmBtn) return;

        confirmBtn.onclick = function() {
            var path = nav.getCurrentPath();
            console.log('[Reader DEBUG] scan confirm clicked, path:', path);
            var el = document.getElementById('reader-scan-dialog');
            if (el) el.remove();
            if (nav && nav._readerScanListener) {
                nav.removeFolderLoadedListener(nav._readerScanListener);
                nav._readerScanListener = null;
            }
            scanFolder(ctx, path);
        };
    }

    function fallbackNativeDialog(ctx) {
        console.log('[Reader DEBUG] fallbackNativeDialog called');
        console.log('[Reader DEBUG] OC defined:', typeof OC !== 'undefined');
        console.log('[Reader DEBUG] OC.files:', typeof OC !== 'undefined' && OC.files ? 'exists' : 'missing');
        console.log('[Reader DEBUG] OC.files.pickFolder:', typeof OC !== 'undefined' && OC.files && OC.files.pickFolder ? 'exists' : 'missing');
        console.log('[Reader DEBUG] RenamerNavigation:', typeof window.RenamerNavigation !== 'undefined' ? 'exists' : 'missing');

        if (typeof OC !== 'undefined' && OC.files && OC.files.pickFolder) {
            console.log('[Reader DEBUG] OC.files.pickFolder available, opening folder picker');
            OC.files.pickFolder(function(path) {
                console.log('[Reader DEBUG] pickFolder callback, path:', path);
                if (path) {
                    scanFolder(ctx, path);
                } else {
                    console.warn('[Reader DEBUG] pickFolder returned empty path');
                    if (ctx.showToast) ctx.showToast('Aucun dossier sélectionné', 'error');
                }
            });
            return;
        }

        console.warn('[Reader DEBUG] OC.files.pickFolder not available, trying fallback');
        if (ctx.showToast) ctx.showToast('Sélection de dossier Nextcloud non disponible', 'info');

        var fallbackPath = null;
        if (typeof window.RenamerNavigation !== 'undefined' && ctx.state && ctx.state.navigation) {
            fallbackPath = window.RenamerNavigation.getCurrentPath();
            console.log('[Reader DEBUG] Fallback: navigation currentPath:', fallbackPath);
        }

        if (!fallbackPath || fallbackPath === '/') {
            console.log('[Reader DEBUG] No usable navigation path (', fallbackPath, '), prompting user');
            var prompted = prompt(ctx.t('readerFolderPathPrompt') || 'Entrez le chemin du dossier à scanner (ex: Renamer/MesBD):', '');
            if (prompted && prompted.trim()) {
                var cleanPath = prompted.trim().replace(/^\/+/, '').replace(/\/+$/, '');
                if (cleanPath) {
                    console.log('[Reader DEBUG] User entered path:', cleanPath);
                    scanFolder(ctx, cleanPath);
                    return;
                }
            }
            if (ctx.showToast) ctx.showToast('Scan annulé', 'info');
            return;
        }

        if (fallbackPath) {
            console.log('[Reader DEBUG] Fallback scanning path:', fallbackPath);
            scanFolder(ctx, fallbackPath);
        } else {
            console.error('[Reader DEBUG] No fallback path available');
            if (ctx.showToast) ctx.showToast('Impossible de scanner: aucune source de dossier disponible', 'error');
        }
    }

    function saveProgress(ctx, filePath, type, value, total) {
        if (!ctx.state) return;
        ctx.state.readerBookmarks = ctx.state.readerBookmarks || {};
        ctx.state.readerBookmarks[filePath] = { type: type, value: value, total: total, timestamp: Date.now() };

        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
            method: 'POST',
            body: JSON.stringify({ path: filePath, type: type, value: value, total: total })
        }).catch(function() {});
    }

    function loadProgress(ctx, paths) {
        if (!ctx.state) return;
        var query = (paths || []).map(function(p) {
            return 'paths[]=' + encodeURIComponent(p);
        }).join('&');
        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress' + (query ? ('?' + query) : ''), {
            method: 'GET'
        }).then(function(data) {
            if (data && data.success && data.progress) {
                ctx.state.readerBookmarks = data.progress;
                render(ctx);
            }
        }).catch(function() {});
    }

    function deleteProgress(ctx, filePath) {
        if (!ctx.state) return Promise.resolve();
        return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
            method: 'DELETE',
            body: JSON.stringify({ path: filePath })
        }).then(function(data) {
            if (data && data.success) {
                delete ctx.state.readerBookmarks[filePath];
                if (ctx.showToast) ctx.showToast(ctx.t('readerProgressDeleted') || 'Progress deleted', 'info');
            }
            return data;
        }).catch(function(err) {
            if (ctx.showToast) ctx.showToast(ctx.t('readerError') || 'Error', 'error');
            throw err;
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function render(ctx) {
        console.log('[Reader DEBUG] render called, readerView:', ctx.state && ctx.state.readerView);
        var list = document.getElementById('reader-list');
        if (!list) return;

        var view = ctx.state && ctx.state.readerView ? ctx.state.readerView : 'libraries';

        if (view === 'reading' && ctx.state && ctx.state.readerCurrentDoc && list.querySelector('.reader-reading-wrapper')) {
            var backBtn = document.getElementById('reader-back-btn');
            var titleEl = document.getElementById('reader-title');
            if (backBtn) backBtn.style.display = 'inline-flex';
            if (titleEl) titleEl.textContent = (ctx.state.readerCurrentDoc.name || ctx.state.readerCurrentDoc.path || '');
            if (ctx.state._readerPrevView !== view) {
                ctx.state._readerPrevView = view;
            }
            updateExploreButton(ctx);
            return;
        }

        var prevView = (ctx.state && ctx.state._readerPrevView !== undefined) ? ctx.state._readerPrevView : view;
        if (prevView === 'reading' && view !== 'reading') {
            var cachedPath = ctx.state && ctx.state._readerCachedPath;
            var readingEl = list.querySelector('.reader-reading-wrapper');
            if (cachedPath && readingEl) {
                if (!ctx.state.readerDomCache) ctx.state.readerDomCache = {};
                ctx.state.readerDomCache[cachedPath] = readingEl;
            }
        }
        ctx.state._readerPrevView = view;
        if (view === 'reading' && ctx.state && ctx.state.readerCurrentDoc) {
            ctx.state._readerCachedPath = ctx.state.readerCurrentDoc.path;
        }

        var main = list.closest('.renamer-main');
        if (main) {
            main.classList.remove('reader-reading-mode');
        }
        list.classList.remove('reader-reading');

        list.innerHTML = '';

        var backBtn = document.getElementById('reader-back-btn');
        var titleEl = document.getElementById('reader-title');
        updateExploreButton(ctx);
        if (backBtn) {
            if (view === 'libraries') {
                backBtn.style.display = 'none';
                if (titleEl) titleEl.textContent = ctx.t('readerTitle') || 'Lecteur';
            } else {
                backBtn.style.display = 'inline-flex';
            }
        }

        if (view === 'libraries') {
            renderLibraries(ctx);
        } else if (view === 'collection') {
            renderCollections(ctx, ctx.state && ctx.state.readerCollections ? ctx.state.readerCollections : []);
        } else if (view === 'scanned') {
            renderScannedFiles(ctx);
        } else if (view === 'reading') {
            renderReading(ctx);
        } else {
            renderEmpty(ctx);
        }
    }

    function renderScannedFiles(ctx) {
        console.log('[Reader DEBUG] renderScannedFiles called');
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.innerHTML = '';

        var titleEl = document.getElementById('reader-title');
        if (titleEl) {
            titleEl.textContent = ctx.t('readerScanResults') || 'Résultats du scan';
        }

        var files = (ctx.state && ctx.state.readerScannedFiles) ? ctx.state.readerScannedFiles : [];
        console.log('[Reader DEBUG] renderScannedFiles, files count:', files.length);

        if (!files.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
            empty.textContent = ctx.t('readerNoResults') || 'Aucun fichier trouvé';
            empty.setAttribute('data-translation', 'readerNoResults');
            list.appendChild(empty);
            return;
        }

        var groups = groupScannedFiles(files);

        var title = document.createElement('div');
        title.style.cssText = 'font-weight:600;margin-bottom:12px;font-size:14px;';
        title.textContent = (ctx.t('readerScanComplete') || 'Scan terminé') + ' — ' + groups.length + ' ' + (ctx.t('readerDocuments') || 'documents');
        title.setAttribute('data-translation', 'readerScanComplete');
        list.appendChild(title);

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;';

        groups.forEach(function(entry) {
            var card = document.createElement('div');
            card.style.cssText = 'background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:12px;cursor:pointer;transition:transform 0.15s;';

            card.addEventListener('mouseenter', function() { card.style.transform = 'translateY(-2px)'; });
            card.addEventListener('mouseleave', function() { card.style.transform = 'translateY(0)'; });

            if (entry.type === 'image-tome') {
                card.dataset.groupDir = entry.dir;
                card.dataset.entryType = 'image-tome';
                card.addEventListener('click', function() {
                    console.log('[Reader DEBUG] image tome clicked:', entry.dir);
                    if (ctx.state) {
                        ctx.state.readerView = 'reading';
                        ctx.state.readerCurrentDoc = {
                            type: 'image-tome',
                            path: entry.dir,
                            name: (ctx.t('readerMiscPictures') || 'Images diverses') + ' (' + entry.files.length + ')',
                            files: entry.files
                        };
                        render(ctx);
                    }
                });

                var iconEl = document.createElement('div');
                iconEl.style.cssText = 'font-size:32px;margin-bottom:8px;';
                iconEl.textContent = '🖼';
                card.appendChild(iconEl);

                var name = document.createElement('div');
                name.style.cssText = 'font-weight:600;margin-bottom:4px;font-size:13px;word-break:break-word;';
                name.textContent = (ctx.t('readerMiscPictures') || 'Images diverses');
                card.appendChild(name);

                var meta = document.createElement('div');
                meta.style.cssText = 'font-size:11px;opacity:0.6;';
                meta.textContent = entry.files.length + ' ' + (ctx.t('readerImages') || 'images');
                card.appendChild(meta);
            } else {
                var file = entry.file;
                card.dataset.path = file.path;
                card.addEventListener('click', function() {
                    console.log('[Reader DEBUG] scanned file clicked:', file.path);
                    if (ctx.state) {
                        ctx.state.readerView = 'reading';
                        ctx.state.readerCurrentDoc = { path: file.path, name: file.name, extension: file.extension };
                        render(ctx);
                    }
                });

                var ext = (file.extension || '').toUpperCase();
                var icon = '📄';
                if (ext === 'PDF') icon = '📄';
                else if (ext === 'CBZ' || ext === 'EPUB') icon = '📚';
                else if (ext === 'CBR') icon = '📦';
                else if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].indexOf(ext) !== -1) icon = '🖼';

                var iconEl2 = document.createElement('div');
                iconEl2.style.cssText = 'font-size:32px;margin-bottom:8px;';
                iconEl2.textContent = icon;
                card.appendChild(iconEl2);

                var name2 = document.createElement('div');
                name2.style.cssText = 'font-weight:600;margin-bottom:4px;font-size:13px;word-break:break-word;';
                name2.textContent = file.name || '';
                card.appendChild(name2);

                var meta2 = document.createElement('div');
                meta2.style.cssText = 'font-size:11px;opacity:0.6;';
                var sizeStr = '';
                if (file.size) {
                    if (file.size >= 1048576) sizeStr = (file.size / 1048576).toFixed(1) + ' MB';
                    else if (file.size >= 1024) sizeStr = (file.size / 1024).toFixed(0) + ' KB';
                    else sizeStr = file.size + ' B';
                }
                meta2.textContent = ext + (sizeStr ? ' · ' + sizeStr : '');
                card.appendChild(meta2);
            }

            grid.appendChild(card);
        });

        list.appendChild(grid);
    }

    function renderReading(ctx) {
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.classList.add('reader-reading');

        var main = list.closest('.renamer-main');
        if (main) {
            main.classList.add('reader-reading-mode');
        }

        var doc = ctx.state && ctx.state.readerCurrentDoc;
        if (!doc) {
            ctx.state.readerView = 'libraries';
            renderLibraries(ctx);
            return;
        }

        var backBtn = document.getElementById('reader-back-btn');
        var titleEl = document.getElementById('reader-title');
        if (backBtn) backBtn.style.display = 'inline-flex';
        if (titleEl) titleEl.textContent = doc.name || doc.path || '';
        updateExploreButton(ctx);

        // Restore a previously rendered reading view instantly (no re-fetch, no
        // re-render) if the document was already loaded and only the view changed.
        if (ctx.state && ctx.state.readerDomCache && ctx.state.readerDomCache[doc.path]) {
            list.appendChild(ctx.state.readerDomCache[doc.path]);
            return;
        }

        var container = document.createElement('div');
        container.className = 'reader-reading-wrapper';

        var readerContainer = document.createElement('div');
        readerContainer.className = 'reader-container-inner';
        container.appendChild(readerContainer);

        // Load the reader
        if (ctx.state && ctx.state.readerCurrentCollection && ctx.state.readerCurrentCollection.userId) {
            ctx.state.ownerUid = ctx.state.readerCurrentCollection.userId;
        }
        if (typeof window.RenamerReader !== 'undefined') {
            if (doc.type === 'image-tome' && doc.files) {
                window.RenamerReader.renderMultiImage(ctx, doc.path, doc.files, readerContainer);
            } else {
                window.RenamerReader.renderReader(ctx, doc.path, readerContainer);
            }
        }

        list.appendChild(container);
    }

    function register() {
        if (typeof RenamerApp === 'undefined' || !RenamerApp.registerTab) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', register);
            } else {
                setTimeout(register, 50);
            }
            return;
        }
        RenamerApp.registerTab(TAB_ID, {
            id: TAB_ID,
            labelKey: 'readerTab',
            icon: '<img src="/apps/renamer/img/reader-tab.png" width="16" height="16">',
            build: buildTab,
            bind: bind,
            render: render,
            loadLibraries: loadLibraries,
            loadCollections: loadCollections,
            scanFolder: scanFolder,
            showOpenDialog: showOpenDialog,
            saveProgress: saveProgress,
            loadProgress: loadProgress,
            downloadFile: downloadFile,
        });
    }

    register();
})();
