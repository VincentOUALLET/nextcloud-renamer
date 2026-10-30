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
    var getCollectionCoverUrl = L.getCollectionCoverUrl;
    var loadCoversBulk = L.loadCoversBulk;
    var renderTomeIcon = L.renderTomeIcon;
    var renderNoCoverPlaceholder = L.renderNoCoverPlaceholder;
                                var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;
    var EDIT_SVG = L.EDIT_SVG;
    var DELETE_SVG = L.DELETE_SVG;
    var SYNC_SVG = L.SYNC_SVG;
    var MARK_READ_SVG = L.MARK_READ_SVG;
    var MARK_UNREAD_SVG = L.MARK_UNREAD_SVG;
    var NAVIGATE_SVG = L.NAVIGATE_SVG;
    var COVER_SVG = L.COVER_SVG;
    var TYPE_SVG = L.TYPE_SVG;
    var ADD_FOLDER_SVG = L.ADD_FOLDER_SVG;
    var OPEN_BOOK_READ_SVG = L.OPEN_BOOK_READ_SVG;
    var READ_CHECK_SVG = L.READ_CHECK_SVG;
    var NO_PREVIEW_SVG = L.NO_PREVIEW_SVG;
    var isAudioFile = L.isAudioFile;

    function isTomeInProgress(path) {
        var b = state.bookmarks[path];
        return !!b && b.type !== 'read';
    }

    function getSeriesKey(file) {
        return file.series || (file.name ? String(file.name).replace(/\.[^.]+$/, '').toLowerCase() : '');
    }

    function getTomeNumber(file) {
        return file.volume > 0 ? file.volume : (file.tome || 0);
    }

    function getNextToReadTomes(progPaths) {
        var bySeries = {};
        progPaths.forEach(function (p) {
            var file = p.file;
            var seriesKey = getSeriesKey(file);
            var tomeNum = getTomeNumber(file);
            if (!seriesKey || tomeNum <= 0) return;
            if (!bySeries[seriesKey]) bySeries[seriesKey] = [];
            bySeries[seriesKey].push({ path: p.path, tomeNum: tomeNum, file: file, p: p });
        });

        var nextToRead = [];
        Object.keys(bySeries).forEach(function (seriesKey) {
            var tomes = bySeries[seriesKey];
            tomes.sort(function (a, b) { return a.tomeNum - b.tomeNum; });

            var foundRead = false;
            for (var i = 0; i < tomes.length; i++) {
                var path = tomes[i].path;
                var bm = state.bookmarks[path];
                var isRead = !!bm && bm.type === 'read';
                var isInProgress = !!bm && bm.type !== 'read';

                if (isInProgress) {
                    nextToRead.push(tomes[i].p);
                    foundRead = true;
                    break;
                }
                if (isRead) {
                    foundRead = true;
                    continue;
                }
                if (foundRead && !isRead && !isInProgress) {
                    nextToRead.push(tomes[i].p);
                    break;
                }
            }
        });

        return nextToRead;
    }

    function renderTomeStatusIcon(path) {
        if (isTomeRead(path)) {
            return '<span class="lib-tome-status-icon lib-tome-read" title="' + escapeHtml(t('readerRead')) + '" aria-label="' + escapeHtml(t('readerRead')) + '" data-translation="readerRead">' + READ_CHECK_SVG + '</span>';
        }
        if (isTomeInProgress(path)) {
            return '<span class="lib-tome-status-icon lib-tome-inprogress" title="' + escapeHtml(t('inProgress')) + '" aria-label="' + escapeHtml(t('inProgress')) + '" data-translation="inProgress">' + OPEN_BOOK_READ_SVG + '</span>';
        }
        return '';
    }

    function bookmarkLabel(path) {
        var b = state.bookmarks[path];
        if (!b) return '';
        if (b.type === 'read') return '✓ ' + (t('readerRead') || 'Lu');
        if (b.type === 'pdf_page' || b.type === 'cbz_page' || b.type === 'reader_page') return t('page') + ' ' + (b.value || 0) + '/' + (b.total || 0);
        if (b.type === 'epub_percent') return (b.value || 0) + t('percent');
        if (b.type === 'audio' && b.total > 0) return Math.round((b.value / b.total) * 100) + t('percent');
        if (b.type === 'image_viewed') return '✓';
        return '';
    }

    function renderProgressCards(list, progPaths) {
        console.debug('[Renamer] renderProgressCards called', { count: progPaths.length, progressLoaded: state.progressLoaded, progressLoading: state.progressLoading, listId: list ? list.id : 'unknown' });
        list.innerHTML = '';
        if (!progPaths.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-progress-empty';
            empty.setAttribute('data-translation', 'noProgress');
            empty.textContent = t('noProgress');
            list.appendChild(empty);
            return;
        }
        var renderFromPreloaded = function () {
            console.debug('[Renamer] renderFromPreloaded', { progPaths: progPaths.length, bookmarksCount: Object.keys(state.bookmarks).length, listHasParent: !!list.parentNode });
            list.innerHTML = '';
            var inProgress = [];
            progPaths.forEach(function (p) {
                var bm = state.bookmarks[p.path];
                if (!bm || bm.type === 'read') return;
                inProgress.push(p);
            });
            var nextToRead = getNextToReadTomes(progPaths);
            nextToRead.forEach(function (p) {
                if (inProgress.indexOf(p) === -1) {
                    inProgress.push(p);
                }
            });
            console.debug('[Renamer] renderFromPreloaded inProgress', { inProgressCount: inProgress.length, totalPaths: progPaths.length });
            if (!inProgress.length) {
                var noProg = document.createElement('div');
                noProg.className = 'lib-progress-empty';
                noProg.setAttribute('data-translation', 'noProgress');
                noProg.textContent = t('noProgress');
                list.appendChild(noProg);
                return;
            }
            inProgress.forEach(function (p) {
                list.appendChild(renderProgressCard(p, p.col, p.lib));
            });
        };
        if (state.progressLoaded) {
            console.debug('[Renamer] renderProgressCards using preloaded data', { progPaths: progPaths.length, bookmarksCount: Object.keys(state.bookmarks).length });
            renderFromPreloaded();
            return;
        }
        if (state.progressLoading) {
            console.debug('[Renamer] renderProgressCards: API request already in flight, skipping duplicate call');
            var noProg2 = document.createElement('div');
            noProg2.className = 'lib-progress-empty';
            noProg2.setAttribute('data-translation', 'noProgress');
            noProg2.textContent = t('loading');
            list.appendChild(noProg2);
            return;
        }
        state.progressLoading = true;
        console.debug('[Renamer] renderProgressCards: making API call to /api/reader/progress/read', { pathsCount: progPaths.length });
        apiRequest(getBaseUrl() + '/api/reader/progress/read', {
                method: 'POST',
                body: JSON.stringify({ paths: progPaths.map(function(p) { return p.path; }) })
            }).then(function (data) {
                console.debug('[Renamer] renderProgressCards API response', { success: data && data.success, hasProgress: data && data.progress, progressKeys: data && data.progress ? Object.keys(data.progress).length : 0 });
                state.progressLoading = false;
                if (!document.getElementById('lib-content')) return;
                if (data && data.success && data.progress) {
                    Object.keys(data.progress).forEach(function(k) {
                        state.bookmarks['/' + k] = data.progress[k];
                    });
                }
                state.progressLoaded = true;
                if (list.parentNode) {
                    renderFromPreloaded();
                } else {
                    var currentKey = L.getViewKey();
                    var isLibsView = state.view === 'home' || state.view === 'libraries' || state.view === 'favorites';
                    if (isLibsView && currentKey === state.renderedViewKey) {
                        console.debug('[Renamer] progress API resolved but list gone, re-rendering');
                        if (window.RenamerLibrary && window.RenamerLibrary.render) {
                            window.RenamerLibrary.render();
                        } else {
                            renderFromPreloaded();
                        }
                    }
                }
            }).catch(function () {
                state.progressLoading = false;
                console.error('[Renamer] renderProgressCards API call failed');
                if (list.parentNode) list.innerHTML = '';
            });
    }

    var libProgressDrag = { active: false, track: null, startX: 0, startScroll: 0, threshold: false };

    if (typeof window !== 'undefined') {
        document.addEventListener('mousemove', handleLibProgressDragMove);
        document.addEventListener('mouseup', handleLibProgressDragEnd);
    }

    function handleLibProgressDragMove(e) {
        if (!libProgressDrag.active) return;
        var delta = e.clientX - libProgressDrag.startX;
        if (Math.abs(delta) > 5) {
            libProgressDrag.threshold = true;
            if (libProgressDrag.track) libProgressDrag.track.scrollLeft = libProgressDrag.startScroll - delta;
        }
    }

    function handleLibProgressDragEnd() {
        if (!libProgressDrag.active) return;
        libProgressDrag.active = false;
        if (libProgressDrag.track) libProgressDrag.track.classList.remove('lib-progress-dragging');
    }

    function attachProgressCarouselNav(header, track) {
        var btnPrev = document.createElement('button');
        var btnNext = document.createElement('button');
        var icon = function (name, fallback) {
            return (typeof window !== 'undefined' && window.RenamerIcons && window.RenamerIcons[name]) ? window.RenamerIcons[name] : fallback;
        };
        btnPrev.innerHTML = icon('BACK', '&#8592;');
        btnNext.innerHTML = icon('POPUP_ARROW', '&#8594;');
        btnPrev.setAttribute('data-translation', 'prev');
        btnNext.setAttribute('data-translation', 'next');
        btnPrev.title = t('prev') || 'Précédent';
        btnNext.title = t('next') || 'Suivant';
        var btns = document.createElement('div');
        btns.className = 'lib-progress-btns';
        btns.appendChild(btnPrev);
        btns.appendChild(btnNext);
        header.appendChild(btns);

        var updateOverflow = function () {
            var scrollable = track.scrollWidth > Math.round(track.clientWidth) + 1;
            var atStart = track.scrollLeft <= 1;
            var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
            btnPrev.classList.toggle('lib-progress-btn-hidden', !scrollable);
            btnNext.classList.toggle('lib-progress-btn-hidden', !scrollable);
            btnPrev.disabled = atStart;
            btnNext.disabled = atEnd;
            btnPrev.classList.toggle('lib-progress-btn-disabled', atStart);
            btnNext.classList.toggle('lib-progress-btn-disabled', atEnd);
        };
        [btnPrev, btnNext].forEach(function (btn) {
            btn.type = 'button';
            btn.className = 'lib-progress-btn';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var item = track.querySelector(':scope > *:first-child');
                if (!item) return;
                var step = Math.round(item.getBoundingClientRect().width + 12);
                track.scrollBy({ left: btn === btnNext ? step : -step, behavior: 'smooth' });
            });
        });

        if (typeof window !== 'undefined') {
            var ro = null;
            var mo = (typeof MutationObserver !== 'undefined') ? new MutationObserver(updateOverflow) : null;
            var onTick = function () { updateOverflow(); };
            track.addEventListener('scroll', onTick);
            window.addEventListener('resize', onTick);
            if (typeof ResizeObserver !== 'undefined') {
                ro = new ResizeObserver(updateOverflow);
                ro.observe(track);
                ro.observe(header);
            }
            if (mo) { mo.observe(track, { childList: true, subtree: true }); }
        }
        setTimeout(updateOverflow, 50);

        track.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('.lib-progress-btn')) return;
            libProgressDrag.active = true;
            libProgressDrag.track = track;
            libProgressDrag.startX = e.clientX;
            libProgressDrag.startScroll = track.scrollLeft;
            libProgressDrag.threshold = false;
            track.classList.add('lib-progress-dragging');
        });

        track.addEventListener('click', function (e) {
            if (libProgressDrag.threshold) {
                libProgressDrag.threshold = false;
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    function renderProgressCard(p, collection, lib) {
        console.debug('[Renamer] renderProgressCard', { path: p.path, hasFile: !!p.file, hasLib: !!lib, hasCol: !!collection });
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = p.path;
        var titleLine = L.tomeLabelFor(p.file) || (t('tome') + ' ' + (p.file.tome || 0));
        var subLine = p.file.pages ? (p.file.pages + ' ' + t('pages')) : '';
        if (state.bookmarks[p.path]) {
            subLine += (subLine ? ' · ' : '') + bookmarkLabel(p.path);
        }
        var coverImg = renderTomeIcon(p.file, collection);
        if (!coverUrl(p.file.path) && !getCollectionCoverUrl(collection)) card.classList.add('noPreview');
        var subHtml = subLine ? ('<div class="lib-card-sub">' + escapeHtml(subLine) + '</div>') : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + renderTomeStatusIcon(p.path) + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            subHtml +
            '<button class="lib-tome-actions-btn" type="button" title="' + escapeHtml(t('navMore')) + '" aria-label="' + escapeHtml(t('navMore')) + '">⋯</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-tome-actions-btn')) { e.stopPropagation(); return; }
            if (typeof L.isAudioFile === 'function' && L.isAudioFile(p.file.path)) {
                console.log('[PROGRESS DEBUG] Audio progress card CLICKED, calling playAudioFromLibrary:', p.file.path);
                L.playAudioFromLibrary(p.file.path);
                return;
            }
            state.view = 'reading';
            state.currentLibrary = lib;
            state.currentCollection = p.col;
            state.currentTome = { path: p.file.path, name: p.file.name, tome: p.file.tome };
            updateUrl({ view: 'reading', read: p.file.path });
            L.renderReading(p.file);
            L.renderSidebar();
            L.renderBreadcrumb();
        });
        var actionsBtn = card.querySelector('.lib-tome-actions-btn');
        if (actionsBtn) {
            actionsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var rect = actionsBtn.getBoundingClientRect();
                var evt = new MouseEvent('contextmenu', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.bottom
                });
                card.dispatchEvent(evt);
            });
        }
         card.addEventListener('contextmenu', function (e) {
             e.preventDefault();
             var items = [];
             items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, action: function () { L.navigateToCollection(p.col, p.lib); } });
             items.push({ type: 'separator' });
             items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { L.markTomeRead(p.file, p.col); } });
              items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markTomeUnread(p.file, p.col); } });
              if (state.isAdmin) {
                  items.push({ type: 'separator' });
                  items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.pickCoverForTome(p.file); } });
              }
              if (!items.length) return;
             L.showContextMenu(e, items, p.file);
         });
         L.attachLongPress(card);
         return card;
     }

    function renderLibraryCards(gridEl) {
        gridEl.innerHTML = '';
        var libs = state.libraries || [];
        libs.forEach(function (lib) {
            var card = document.createElement('div');
            card.className = 'lib-card';
            card.dataset.libId = String(lib.id);
        var cols = state.collectionsByLib[lib.id] || [];
        var firstFiles = L.collectAllFiles((cols[0] && cols[0].rules) ? cols[0].rules : {});
        var storedCover = (state.libCovers && state.libCovers[lib.id]);
        var libCover = storedCover ? L.libCoverUrl(storedCover) : coverOfFirstTome(firstFiles);
        var libIcon = libCover
            ? '<img class="lib-card-img" src="' + libCover + '" alt="📚" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📚\');this.remove();">'
            : NO_PREVIEW_SVG;
        if (!libCover) card.classList.add('noPreview');
        var colCount = cols.length;
        var pathCount = Array.isArray(lib.paths) && lib.paths.length ? lib.paths.length : (lib.description ? 1 : 0);
        var pathText = pathCount > 1 ? (pathCount + ' ' + t('libFolders')) : (lib.description || '');
        var metaText = colCount ? (colCount + ' ' + t('collections')) : pathText;
        card.innerHTML =
            '<div class="lib-icon">' + libIcon + '</div>' +
            '<div class="lib-name" title="' + escapeHtml(lib.name || '') + '">' + escapeHtml(lib.name || '') + '</div>' +
            '<div class="lib-meta">' + escapeHtml(metaText) + '</div>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-delete-btn')) return;
                state.currentLibrary = lib;
                state.currentCollection = null;
                if (state.flatFilesMode) {
                    state.view = 'flat-files';
                    updateUrl({ view: 'flat-files', library: String(lib.id), viewType: 'flat' });
                    L.loadAllFilesForLibrary(lib, function () { L.render(); });
                } else {
                    state.view = 'collection';
                           updateUrl({ view: 'collection', library: String(lib.id) });
                    L.loadCollections(lib.id, function () { L.render(); });
                }
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: L.renameLibrary });
                    items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.showLibraryCoverPicker(lib, firstFiles); } });
                    items.push({ label: t('changeLibraryType'), icon: TYPE_SVG, action: L.changeLibraryType });
                    items.push({ label: t('addLibraryPath'), icon: ADD_FOLDER_SVG, action: L.addLibraryPath });
                    items.push({ label: t('rescanLibrary'), icon: SYNC_SVG, action: L.rescanLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: DELETE_SVG, action: L.deleteLibrary });
                }
                if (!items.length) return;
                L.showContextMenu(e, items, lib);
            });
            L.attachLongPress(card);
            gridEl.appendChild(card);
        });
    }

function isTomeRead(path) {

         var b = state.bookmarks[path];

         return !!b && b.type === 'read';

     }

function collectionReadStatus(nodeOrCollection) {

         var root = nodeOrCollection && nodeOrCollection.rules ? nodeOrCollection.rules : nodeOrCollection;

         var files = L.collectAllFiles(root);

         if (!files.length) return null;

         var readCount = 0;
         var inProgressCount = 0;

         files.forEach(function (f) {
             if (isTomeRead(f.path)) readCount++;
             else if (isTomeInProgress(f.path)) inProgressCount++;
         });

         if (readCount === files.length) return 'read';

         if (readCount === 0 && inProgressCount === 0) return 'unread';

         return 'partial';
     }

function collectionStatusIcon(nodeOrCollection) {

         var status = collectionReadStatus(nodeOrCollection);

         if (status === 'read') {

            return READ_CHECK_SVG;

         }

         if (status === 'partial') {

             return OPEN_BOOK_READ_SVG;

         }

         return '';

     }

function nodeStatusHtml(nodeOrCollection) {

          var icon = collectionStatusIcon(nodeOrCollection);

          if (!icon) return '';

          var status = collectionReadStatus(nodeOrCollection);

          var label = status === 'read' ? t('readerRead') : t('inProgress');

          var cssClass = status === 'read' ? 'lib-collection-status-icon lib-tome-read' : 'lib-collection-status-icon lib-tome-inprogress';

          return '<span class="' + cssClass + '" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '" data-translation="' + (status === 'read' ? 'readerRead' : 'inProgress') + '">' + icon + '</span>';

      }

function collectionCardStatusHtml(collection) {

         return nodeStatusHtml(collection);

     }

    L.isTomeInProgress = isTomeInProgress;
    L.getSeriesKey = getSeriesKey;
    L.getTomeNumber = getTomeNumber;
    L.getNextToReadTomes = getNextToReadTomes;
    L.renderTomeStatusIcon = renderTomeStatusIcon;
    L.bookmarkLabel = bookmarkLabel;
    L.renderProgressCards = renderProgressCards;
    L.handleLibProgressDragMove = handleLibProgressDragMove;
    L.handleLibProgressDragEnd = handleLibProgressDragEnd;
    L.attachProgressCarouselNav = attachProgressCarouselNav;
    L.renderProgressCard = renderProgressCard;
    L.renderLibraryCards = renderLibraryCards;

    L.isTomeRead = isTomeRead;

    L.collectionReadStatus = collectionReadStatus;

    L.collectionStatusIcon = collectionStatusIcon;

    L.nodeStatusHtml = nodeStatusHtml;

    L.collectionCardStatusHtml = collectionCardStatusHtml;

function isTomeRead(path) {

         var b = state.bookmarks[path];

         return !!b && b.type === 'read';

     }






})(window.RenamerLibrary);