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
    };

    var TR = {
        fr: {
            title: 'Bibliothèque',
            addLibrary: 'Ajouter une librairie',
            empty: 'Aucune librairie',
            emptyHint: 'Cliquez sur "Ajouter une librairie" pour commencer à scanner votre collection de documents.',
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
        },
        en: {
            title: 'Library',
            addLibrary: 'Add a library',
            empty: 'No libraries',
            emptyHint: 'Click "Add a library" to start scanning your document collection.',
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
            '.lib-page-app{display:flex;flex-direction:column;height:calc(100vh - 64px);overflow:hidden;background:white;color:var(--nc-text);font-family:var(--nc-font-family,"Segoe UI",sans-serif);}' +
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
            '.lib-tome{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--nc-border);}';
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

    function loadLibraries() {
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
        }).catch(function (err) {
            state.loadingLibraries = false;
            showToast(t('scanError') + ' : ' + (err && err.message ? err.message : err), 'error');
            if (state.view === 'libraries') renderLibrariesContent();
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
        var q = paths.map(function (p) { return 'paths[]=' + encodeURIComponent(p); }).join('&');
        apiRequest(getBaseUrl() + '/api/reader/progress?' + q, { method: 'GET' }).then(function (data) {
            if (data && data.success && data.progress) {
                state.bookmarks = data.progress;
            } else {
                state.bookmarks = {};
            }
            renderLibrariesContent();
        }).catch(function () {
            state.bookmarks = {};
            renderLibrariesContent();
        });
    }

    function showFolderPicker(callback) {
        if (typeof OC !== 'undefined' && OC.files && OC.files.pickFolder) {
            OC.files.pickFolder(function (path) {
                callback(path);
            });
            return;
        }
        var p = prompt(t('newLibPlaceholder') || 'Entrez le chemin du dossier (ex: Renamer/MesBD):', '');
        if (p && p.trim()) {
            callback(p.trim().replace(/^\/+/, '').replace(/\/+$/, ''));
        } else {
            callback(null);
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
        var container = document.getElementById('lib-content');
        if (!container) return;
        var key = tome.path;
        state.currentTome = { path: key, name: tome.name, tome: tome.tome };
        if (state.domCache[key]) {
            container.innerHTML = '';
            container.appendChild(state.domCache[key]);
            return;
        }
        container.innerHTML = '';
        var wrapper = document.createElement('div');
        wrapper.className = 'lib-reading-wrapper';
        wrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow-hidden;';
        var readerBox = document.createElement('div');
        readerBox.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;';
        wrapper.appendChild(readerBox);
        container.appendChild(wrapper);

        if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderReader === 'function') {
            var ctx = buildCtx();
            window.RenamerReader.renderReader(ctx, tome.path, readerBox).catch(function (e) {
                showToast(t('readError') + (e && e.message ? (': ' + e.message) : ''), 'error');
            });
        } else {
            readerBox.innerHTML = '<div style="color:#fff;text-align:center;">' + t('unsupported') + '</div>';
        }
        state.domCache[key] = wrapper;
    }

    function renderTomes(collection) {
        var container = document.getElementById('lib-content');
        if (!container) return;
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
                '<button class="lib-btn" style="flex-shrink:0;">' + t('open') + ' →</button>';
            row.addEventListener('click', function () {
                state.view = 'reading';
                state.currentTome = f;
                var backBtn = document.getElementById('lib-back-btn');
                if (backBtn) backBtn.style.display = 'inline-flex';
                renderReading(f);
            });
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
            container.innerHTML =
                '<div class="lib-empty">' +
                    '<div style="font-size:28px;margin-bottom:8px;">📚</div>' +
                    '<div style="font-weight:600;margin-bottom:8px;">' + t('empty') + '</div>' +
                    '<div style="margin-bottom:16px;">' + t('emptyHint') + '</div>' +
                    '<button class="lib-btn lib-btn-primary" id="lib-add-lib-btn">' + t('addLibrary') + '</button>' +
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
            card.addEventListener('click', function () {
                state.view = 'collection';
                state.currentLibrary = lib;
                var backBtn = document.getElementById('lib-back-btn');
                if (backBtn) {
                    backBtn.style.display = 'inline-flex';
                    backBtn.dataset.target = 'libraries';
                }
                loadCollections(lib.id, function () { renderCollections(lib); });
            });
            grid.appendChild(card);
        });
        wrap.appendChild(grid);

        container.appendChild(wrap);
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
        var q = progPaths.map(function (p) { return 'paths[]=' + encodeURIComponent(p.path); }).join('&');
        apiRequest(getBaseUrl() + '/api/reader/progress?' + q, { method: 'GET' }).then(function (data) {
            if (data && data.success && data.progress) {
                state.bookmarks = data.progress;
            }
            list.innerHTML = '';
            progPaths.forEach(function (p) {
                if (!state.bookmarks[p.path]) return;
                var row = document.createElement('div');
                row.className = 'lib-row';
                row.dataset.path = p.path;
                var label = p.file.name || p.file.path.split('/').pop();
                row.innerHTML =
                    '<div style="display:flex;flex-direction:column;">' +
                        '<div style="font-weight:500;font-size:13px;">' + escapeHtml(label) + '</div>' +
                        '<div class="lib-prog">' + bookmarkLabel(p.path) + '</div>' +
                    '</div>' +
                    '<div style="font-size:11px;opacity:0.6;">→</div>';
                row.addEventListener('click', function () {
                    state.view = 'reading';
                    var backBtn = document.getElementById('lib-back-btn');
                    if (backBtn) backBtn.style.display = 'inline-flex';
                    renderReading(p.file);
                });
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

        if (state.view === 'reading' && state.currentTome && state.domCache[state.currentTome.path]) {
            container.innerHTML = '';
            container.appendChild(state.domCache[state.currentTome.path]);
            return;
        }

        container.innerHTML = '';

        var titleEl = document.getElementById('lib-title');
        if (titleEl) titleEl.textContent = t('title');

        if (state.view === 'libraries') {
            renderLibrariesContent();
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
        };
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
            });
        }
        // URL ?read=<path> → open a tome directly (Phase 10 entry point)
        var params = new URLSearchParams(window.location.search);
        var readPath = params.get('read');
        if (readPath) {
            var found = null;
            if (state.collections) {
                for (var i = 0; i < state.collections.length; i++) {
                    var files = (state.collections[i].rules && state.collections[i].rules.files) ? state.collections[i].rules.files : [];
                    for (var j = 0; j < files.length; j++) {
                        if (decodeURIComponent(files[j].path) === readPath || files[j].path === readPath) {
                            found = files[j]; break;
                        }
                    }
                    if (found) break;
                }
            }
            if (found) {
                state.view = 'reading';
                state.currentTome = found;
                var backBtn2 = document.getElementById('lib-back-btn');
                if (backBtn2) backBtn2.style.display = 'inline-flex';
                renderReading(found);
                return;
            }
        }
        loadLibraries();
    }

    function init() {
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
                '<button type="button" id="lib-scan-btn" class="lib-btn lib-btn-primary">' + escapeHtml(t('scan')) + '</button>' +
            '</div>';
        var content = document.createElement('div');
        content.id = 'lib-content';
        content.className = 'lib-page-content';
        PAGE_ROOT.appendChild(header);
        PAGE_ROOT.appendChild(content);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
