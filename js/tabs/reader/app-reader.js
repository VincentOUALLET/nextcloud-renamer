(function() {
    'use strict';

    var TAB_ID = 'reader';
    var BACK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildTab(ctx) {
        var t = ctx.t;
        return '' +
        '<div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">' +
            '<div class="renamer-main" style="flex-direction:column;">' +
                '<div class="renamer-preview" id="reader-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">' +
                    '<div class="renamer-preview-header" id="reader-header" style="display:flex;align-items:center;justify-content:space-between;padding:8px 23px 8px 10px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;">' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<button type="button" id="reader-back-btn" class="renamer-btn-icon" title="' + escapeHtml(t('readerBack')) + '" style="display:none;">' + BACK_SVG + '</button>' +
                            '<span id="reader-title">' + (t('readerTitle') || 'Lecteur') + '</span>' +
                        '</div>' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                            '<button type="button" id="reader-scan-btn" class="renamer-btn renamer-btn-secondary" data-translation="readerScan">📂 ' + (t('readerScan') || 'Scanner un dossier') + '</button>' +
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
                    if (prog.type === 'pdf_page') {
                        progInfo.textContent = 'Page ' + prog.value + '/' + prog.total;
                    } else if (prog.type === 'epub_percent') {
                        progInfo.textContent = prog.value + '%';
                    } else if (prog.type === 'cbz_page') {
                        progInfo.textContent = 'Page ' + prog.value + '/' + prog.total;
                    }
                    info.appendChild(progInfo);
                    row.appendChild(info);

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
        ctx.downloadFile = function(filePath) {
            return downloadFile(ctx, filePath);
        };

        var scanBtn = document.getElementById('reader-scan-btn');
        if (scanBtn && !scanBtn._bound) {
            scanBtn._bound = true;
            scanBtn.addEventListener('click', function(e) {
                console.log('[Reader DEBUG] reader-scan-btn click fired', e);
                showOpenDialog(ctx);
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
                        if (!document.fullscreenElement) {
                            el.requestFullscreen().catch(function() {});
                        } else {
                            document.exitFullscreen();
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
        var a = document.createElement('a');
        a.href = ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath);
        a.download = filePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function render(ctx) {
        console.log('[Reader DEBUG] render called, readerView:', ctx.state && ctx.state.readerView);
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.innerHTML = '';

        var view = ctx.state && ctx.state.readerView ? ctx.state.readerView : 'libraries';

        var backBtn = document.getElementById('reader-back-btn');
        var titleEl = document.getElementById('reader-title');
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

        var title = document.createElement('div');
        title.style.cssText = 'font-weight:600;margin-bottom:12px;font-size:14px;';
        title.textContent = (ctx.t('readerScanComplete') || 'Scan terminé') + ' — ' + files.length + ' ' + (ctx.t('readerDocuments') || 'documents');
        title.setAttribute('data-translation', 'readerScanComplete');
        list.appendChild(title);

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;';

        files.forEach(function(file) {
            var card = document.createElement('div');
            card.style.cssText = 'background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:12px;cursor:pointer;transition:transform 0.15s;';
            card.dataset.path = file.path;
            card.addEventListener('mouseenter', function() { card.style.transform = 'translateY(-2px)'; });
            card.addEventListener('mouseleave', function() { card.style.transform = 'translateY(0)'; });
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

            var iconEl = document.createElement('div');
            iconEl.style.cssText = 'font-size:32px;margin-bottom:8px;';
            iconEl.textContent = icon;
            card.appendChild(iconEl);

            var name = document.createElement('div');
            name.style.cssText = 'font-weight:600;margin-bottom:4px;font-size:13px;word-break:break-word;';
            name.textContent = file.name || '';
            card.appendChild(name);

            var meta = document.createElement('div');
            meta.style.cssText = 'font-size:11px;opacity:0.6;';
            var sizeStr = '';
            if (file.size) {
                if (file.size >= 1048576) sizeStr = (file.size / 1048576).toFixed(1) + ' MB';
                else if (file.size >= 1024) sizeStr = (file.size / 1024).toFixed(0) + ' KB';
                else sizeStr = file.size + ' B';
            }
            meta.textContent = ext + (sizeStr ? ' · ' + sizeStr : '');
            card.appendChild(meta);

            grid.appendChild(card);
        });

        list.appendChild(grid);
    }

    function renderReading(ctx) {
        var list = document.getElementById('reader-list');
        if (!list) return;
        list.innerHTML = '';

        var doc = ctx.state && ctx.state.readerCurrentDoc;
        if (!doc) {
            ctx.state.readerView = 'libraries';
            renderLibraries(ctx);
            return;
        }

        var container = document.createElement('div');
        container.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';

        var readerContainer = document.createElement('div');
        readerContainer.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;';
        container.appendChild(readerContainer);

        // Load the reader
        if (typeof window.RenamerReader !== 'undefined') {
            window.RenamerReader.renderReader(ctx, doc.path, readerContainer);
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
