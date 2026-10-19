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
                var isTomeInProgress = L.isTomeInProgress;
    var renderTomeStatusIcon = L.renderTomeStatusIcon;
    var bookmarkLabel = L.bookmarkLabel;
        var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;
    var EDIT_SVG = L.EDIT_SVG;
    var DELETE_SVG = L.DELETE_SVG;
    var SYNC_SVG = L.SYNC_SVG;
    var MARK_READ_SVG = L.MARK_READ_SVG;
    var MARK_UNREAD_SVG = L.MARK_UNREAD_SVG;
    var OPEN_SVG = L.OPEN_SVG;
    var NAVIGATE_SVG = L.NAVIGATE_SVG;
    var COVER_SVG = L.COVER_SVG;
    var TYPE_SVG = L.TYPE_SVG;
    var NO_PREVIEW_SVG = L.NO_PREVIEW_SVG;
    var GRID_VIEW_SVG = L.GRID_VIEW_SVG;
    var LIST_VIEW_SVG = L.LIST_VIEW_SVG;
    var FILTER_SVG = L.FILTER_SVG;
    var IMG_EXT = L.IMG_EXT;

    function tomeLabelFor(f) {
        var list = (f && f.tomes && f.tomes.length) ? f.tomes : ((f && f.tome > 0) ? [f.tome] : []);
        if (list.length > 1) {
            return t('tome') + ' ' + list[0] + '-' + list[list.length - 1];
        }
        if (list.length === 1) {
            return t('tome') + ' ' + list[0];
        }
        return '';
    }

    function countTomes(files) {
        var count = 0;
        (files || []).forEach(function(f) {
            var ext = fileExt(f);
            if (IMG_EXT.indexOf(ext) !== -1) return;
            var list = (f.tomes && f.tomes.length) ? f.tomes : [];
            if (!list.length) {
                var t = (f.volume > 0 ? f.volume : f.tome) || 0;
                list = t > 0 ? [t] : [];
            }
            if (!list.length) count++;
            else list.forEach(function(t) { if (t > 0) count++; });
        });
        return count;
    }

    function findMissingTomes(files) {
        var tomes = {};
        files.forEach(function(f) {
            var list = (f.tomes && f.tomes.length) ? f.tomes : [];
            if (!list.length) {
                var t = (f.volume > 0 ? f.volume : f.tome) || 0;
                list = t > 0 ? [t] : [];
            }
            list.forEach(function(t){ if (t > 0) tomes[t] = true; });
        });
        var existing = Object.keys(tomes).map(function(k) { return parseInt(k, 10); }).sort(function(a, b) { return a - b; });
        if (!existing.length) return [];
        var missing = [];
        var min = existing[0];
        var max = existing[existing.length - 1];
        for (var i = min; i <= max; i++) {
            if (!tomes[i]) missing.push(i);
        }
        return missing;
    }

    function renderMissingTomeCard(tomeNum) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait lib-missing-tome';
        var icon = '📚';
        var titleLine = t('tome') + ' ' + tomeNum;
        var bannerHtml = '<div class="lib-missing-tome-banner"><span data-translation="missingTome">' + escapeHtml(t('missingTome') || 'Tome Manquant') + '</span></div>';
        card.innerHTML =
            '<div class="lib-card-icon lib-card-icon-tall">' + icon + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            bannerHtml;
        return card;
    }

    function renderTomeCard(f, collection) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var icon = fileIcon(f.type);
        var bookmark = state.bookmarks[f.path];
        var titleLine = (f.tome > 0 || (f.tomes && f.tomes.length))
            ? (tomeLabelFor(f) || (f.displayTitle || (f.name ? f.name.replace(/\.[^.]+$/, '') : '')))
            : (f.displayTitle || (f.name ? f.name.replace(/\.[^.]+$/, '') : ''));
        var subLine = f.pages ? (f.pages + ' ' + t('pages')) : '';
        if (bookmark) {
            subLine += (subLine ? ' · ' : '') + bookmarkLabel(f.path);
        }
        var coverImg = renderTomeIcon(f, collection);
        if (!coverUrl(f.path) && !getCollectionCoverUrl(collection)) card.classList.add('noPreview');
        var subHtml = subLine ? ('<div class="lib-card-sub">' + escapeHtml(subLine) + '</div>') : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + renderTomeStatusIcon(f.path) + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            subHtml +
            '<button class="lib-tome-actions-btn" type="button" title="' + escapeHtml(t('navMore')) + '" aria-label="' + escapeHtml(t('navMore')) + '">⋯</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-tome-actions-btn')) {
                e.stopPropagation();
                return;
            }
            state.view = 'reading';
            state.currentTome = f;
            updateUrl({ view: 'reading', library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), read: f.path });
            L.renderReading(f);
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
            items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { L.markTomeRead(f, collection); } });
            items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markTomeUnread(f, collection); } });
            if (state.isAdmin) {
                items.push({ type: 'separator' });
                items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { L.renameTome(f, collection); } });
                items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.pickCoverForTome(f); } });
                items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { L.rescanCollection(collection, state.currentLibrary); } });
                items.push({ type: 'separator' });
                items.push({ label: t('contextDelete'), icon: DELETE_SVG, action: function () { L.deleteTome(f, collection); } });
            }
            if (!items.length) return;
            L.showContextMenu(e, items, f);
        });
        L.attachLongPress(card);
        return card;
    }

    function renderSubCollectionCard(node, idx, collection, treePath) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        var isImages = node.isImages === true;
        var icon = isImages ? '🖼' : '📂';
        var firstFiles = node.files || [];
        var colCover = coverOfFirstTome(firstFiles);
        var subCount = firstFiles.length;

        var subParts = [];
        if (subCount) {
            subParts.push(subCount + ' <span data-translation="' + (isImages ? 'images' : 'tomes') + '">' + escapeHtml(isImages ? t('images') : t('tomes')) + '</span>');
        }
        var sub = subParts.join(' · ');

        var coverImg = colCover
            ? '<img class="lib-card-img" src="' + colCover + '" alt="' + icon + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">'
            : NO_PREVIEW_SVG;

         if (!colCover) card.classList.add('noPreview');
         card.innerHTML =
             '<div class="lib-card-icon">' + coverImg + L.nodeStatusHtml(node) + '</div>' +
             '<div class="lib-card-title" title="' + escapeHtml(node.name || '') + '">' + escapeHtml(node.name || '') + '</div>' +
             '<div class="lib-card-sub">' + sub + '</div>';
         card.addEventListener('click', function () {
            state.readerTreePath = treePath.concat(idx);
            var nodeParam = state.readerTreePath.join('.');
            updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(collection.id), node: nodeParam });
            L.render();
            L.renderSidebar();
            L.renderBreadcrumb();
        });
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            var items = [];
            var colPaths = L.collectPaths(node);
            if (colPaths.length) {
                items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { L.markNodeRead(node, collection); } });
                items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markNodeUnread(node, collection); } });
            }
            if (state.isAdmin) {
                if (items.length) items.push({ type: 'separator' });
                items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { L.renameSubCollection(node, idx, collection); } });
                items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { L.rescanCollection(collection, state.currentLibrary); } });
                items.push({ type: 'separator' });
                items.push({ label: t('contextDelete'), icon: DELETE_SVG, action: function () { L.deleteSubCollection(node, idx, collection); } });
            }
            if (!items.length) return;
            L.showContextMenu(e, items, node);
        });
        L.attachLongPress(card);
        return card;
    }

    function renderFlatCollection(collection, node) {
        dbg('renderFlatCollection', { collection: collection && collection.id });
        L.renderSidebar();
        L.renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;

        var flatData = flattenFilesAndSubCollections(node);
        var allFiles = flatData.files || [];
        var subCollections = flatData.subCollections || [];
        var subCollectionIndices = flatData.childIndices || [];

        var extGroup = {};
        allFiles.forEach(function (f) {
            var ext = fileExt(f);
            if (!extGroup[ext]) extGroup[ext] = 0;
            extGroup[ext]++;
        });

        function renderCollectionBody(filesToRender, nodesToRender, nodeIndices) {
            container.innerHTML = '';

            var toggleWrapper = document.createElement('div');
            toggleWrapper.className = 'lib-collection-toggle-wrapper lib-collection-toggle-wrapper-toolbar';
            var toggleBtn = createViewToggleBtn('toggleFlat', LIST_VIEW_SVG, function () {
                state.flatCollectionMode = false;
                var nodeParam = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
                updateUrl({ view: 'tomes', library: state.currentLibrary ? String(state.currentLibrary.id) : null, collection: collection ? String(collection.id) : null, node: nodeParam, viewType: 'tree' });
                showLoader();
                L.render();
                setTimeout(hideLoader, 300);
            });
            toggleWrapper.appendChild(toggleBtn);

            var filterTBtn = document.createElement('button');
            filterTBtn.type = 'button';
            filterTBtn.id = 'lib-table-filter-btn';
            filterTBtn.className = 'lib-btn lib-btn-icon lib-table-filter-btn';
            filterTBtn.innerHTML = FILTER_SVG;
            filterTBtn.title = t('filterColumns');
            filterTBtn.addEventListener('click', function (e) { showTableColumnFilter(e, function () { renderCollectionBody(allFiles, subCollections, subCollectionIndices); }); });
            toggleWrapper.appendChild(filterTBtn);

            var filterBar = document.createElement('div');
            filterBar.className = 'lib-filter-bar';
            var allExtBtn = document.createElement('button');
            allExtBtn.type = 'button';
            allExtBtn.className = 'lib-filter-btn lib-filter-btn-active';
            allExtBtn.textContent = t('filterAll');
            allExtBtn.addEventListener('click', function () {
                renderCollectionBody(allFiles, subCollections, subCollectionIndices);
            });
            filterBar.appendChild(allExtBtn);
            var extFiltersDiv = document.createElement('div');
            extFiltersDiv.className = 'lib-ext-filters';
            Object.keys(extGroup).sort().forEach(function (ext) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'lib-filter-btn';
                btn.innerHTML = '.' + escapeHtml(ext) + ' <span class="lib-ext-counts">(' + extGroup[ext] + ')</span>';
                btn.addEventListener('click', function () {
                    renderCollectionBody(allFiles.filter(function (f) { return fileExt(f) === ext; }), subCollections, subCollectionIndices);
                });
                extFiltersDiv.appendChild(btn);
            });
            filterBar.appendChild(extFiltersDiv);

            var filterWrapper = document.createElement('div');
            filterWrapper.className = 'lib-filter-wrapper';
            filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
            filterWrapper.appendChild(toggleWrapper);
            filterWrapper.appendChild(filterBar);
            container.appendChild(filterWrapper);

            if (!filesToRender.length && !nodesToRender.length) {
                var empty = document.createElement('div');
                empty.className = 'lib-empty';
                empty.setAttribute('data-translation', 'noResults');
                empty.textContent = t('noResults');
                container.appendChild(empty);
                return;
            }

            if (nodesToRender.length) {
                var grid = document.createElement('div');
                grid.className = 'lib-grid';
                nodesToRender.forEach(function (child, idx) {
                    var card = document.createElement('div');
                    card.className = 'lib-card';
                    var label = child.name || child.folder || (child.path ? child.path.split('/').pop() : '');
                    var childFiles = L.collectAllFiles(child);
                    var coverImg = childFiles.length ? coverOfFirstTome(childFiles) : null;
                    var cardIcon = coverImg
                        ? '<img class="lib-card-img" src="' + coverImg + '" alt="' + escapeHtml(label) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📁\');this.remove();">'
                        : '<span class="lib-no-preview-icon">📁</span>';
                    if (!coverImg) card.classList.add('noPreview');
                    card.innerHTML =
                        '<div class="lib-icon">' + cardIcon + '</div>' +
                        '<div class="lib-name" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</div>';
                    card.addEventListener('click', function (e) {
                        if (e.target.classList.contains('lib-delete-btn')) return;
                        state.readerTreePath = (state.readerTreePath || []).concat([nodeIndices[idx]]);
                        updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(collection.id), node: state.readerTreePath.join('.'), viewType: 'flat' });
                        L.render();
                        L.renderSidebar();
                        L.renderBreadcrumb();
                    });
                    grid.appendChild(card);
                });
                container.appendChild(grid);
            }

            if (filesToRender.length) {
                var tableWrapper = document.createElement('div');
                tableWrapper.className = 'lib-data-table-wrapper';
                container.appendChild(tableWrapper);
                var columns = getVisibleColumns(fileTableColumns(), state.currentLibrary ? state.currentLibrary.id : null);
                var rows = buildFileTableRows(filesToRender, null, collection);
                renderDataTable(tableWrapper, columns, rows);
                var collectionBodyViewKey = L.getViewKey();
                var hasUncachedCoversFlat = filesToRender.some(function (f) {
                    return f.path && state.covers[f.path] === undefined;
                });
                if (hasUncachedCoversFlat) {
                    L.showLoaderToast(t('loadingCovers') || t('loading') || 'Chargement des couvertures…');
                }
                loadCoversBulk(filesToRender.slice(), function (fetched) {
                    L.hideLoaderToast();
                    if (fetched) {
                        if (state.viewCache && state.viewCache[collectionBodyViewKey]) { state.viewCacheEpoch = (state.viewCacheEpoch || 0) + 1; delete state.viewCache[collectionBodyViewKey]; }
                        if (document.getElementById('lib-content') && L.getViewKey() === collectionBodyViewKey) {
                            L.invalidateViewCache();
                            renderCollectionBody(allFiles, subCollections, subCollectionIndices);
                        }
                    }
                });
            }
        }

        
        var displayNameViewKey = L.getViewKey();
        loadDisplayNameOverrides(state.currentLibrary, function () {
            if (document.getElementById('lib-content') && L.getViewKey() === displayNameViewKey) {
                L.invalidateViewCache();
                renderCollectionBody(allFiles, subCollections, subCollectionIndices);
            }
        });

        renderCollectionBody(allFiles, subCollections, subCollectionIndices);
    }

    function flattenFilesAndSubCollections(node, depth) {
        depth = depth || 0;
        if (depth > 10) return { files: [], subCollections: [], childIndices: [] };
        var collectedFiles = (node.files || []).slice();
        var subCollections = [];
        var childIndices = [];
        (node.children || []).forEach(function (child, idx) {
            var childFiles = child.files || [];
            var childChildren = child.children || [];
            if (childChildren.length === 0 && childFiles.length > 0) {
                var isImageCollection = L.hasOnlyImageFiles(childFiles);
                if (isImageCollection) {
                    subCollections.push(child);
                    childIndices.push(idx);
                } else {
                    collectedFiles = collectedFiles.concat(childFiles);
                }
            } else if (childChildren.length > 0) {
                var expanded = flattenFilesAndSubCollections(child, depth + 1);
                collectedFiles = collectedFiles.concat(expanded.files);
                subCollections = subCollections.concat(expanded.subCollections);
                childIndices = childIndices.concat(expanded.childIndices);
            }
        });
        return { files: collectedFiles, subCollections: subCollections, childIndices: childIndices };
    }

    function renderTomes(collection) {
        dbg('renderTomes', { collection: collection && collection.id, view: state.view });

        var viewKey = L.getViewKey();
        if (state.coversLoaded && state.viewCache && state.viewCache[viewKey] && document.getElementById('lib-content') && document.getElementById('lib-content').firstChild) {
            L.cacheCurrentView();
            if (L.restoreCachedView(viewKey)) {
                L.renderSidebar();
                L.renderBreadcrumb();
                return;
            }
        }

        L.renderSidebar();
        L.renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;

        state.renderedViewKey = viewKey;
        container.innerHTML = '';

        var node = L.getCurrentNode(collection);
        if (!node) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.setAttribute('data-translation', 'noResults');
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }

        if (state.flatCollectionMode) {
            renderFlatCollection(collection, node);
            return;
        }

        var toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'lib-collection-toggle-wrapper';
        var toggleBtn = createViewToggleBtn('toggleHierarchical', GRID_VIEW_SVG, function () {
            state.flatCollectionMode = true;
            var nodeParam = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
            updateUrl({ view: 'tomes', library: state.currentLibrary ? String(state.currentLibrary.id) : null, collection: state.currentCollection ? String(state.currentCollection.id) : null, node: nodeParam, viewType: 'flat' });
            showLoader();
            L.render();
            setTimeout(hideLoader, 300);
        });
        toggleWrapper.appendChild(toggleBtn);

        var filterWrapper = document.createElement('div');
        filterWrapper.className = 'lib-filter-wrapper';
        filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
        filterWrapper.appendChild(toggleWrapper);
        container.appendChild(filterWrapper);

        if (node.isImageTome && (node.files || []).length > 0) {
            L.renderReadingImages(node, collection);
            L.renderSidebar();
            L.renderBreadcrumb();
            return;
        }

        var files = node.files || [];
        var children = node.children || [];
        var treePath = state.readerTreePath || [];

        if (children.length) {
            var subTitle = document.createElement('div');
            subTitle.className = 'lib-sub-col-title';
            subTitle.setAttribute('data-translation', 'subCollections');
            subTitle.textContent = t('subCollections') || 'Sous-collections';
            container.appendChild(subTitle);

            var subGrid = document.createElement('div');
            subGrid.className = 'lib-cards-ctn';
            children.forEach(function (child, idx) {
                subGrid.appendChild(renderSubCollectionCard(child, idx, collection, treePath));
            });
            container.appendChild(subGrid);
        }

        if (files.length) {
            if (treePath.length === 0) {
                var filesTitle = document.createElement('div');
                filesTitle.className = 'lib-sub-col-title';
                var isImages = L.hasOnlyImageFiles(files);
                filesTitle.setAttribute('data-translation', isImages ? 'images' : 'tomes');
                filesTitle.textContent = isImages ? (t('images') || 'Images') : (t('tomes') || 'Tomes');
                container.appendChild(filesTitle);
            }

            var cardsCtn = document.createElement('div');
            cardsCtn.className = 'lib-cards-ctn';
            var sortedFiles = files.slice().sort(function(a, b) {
                var ta = (a.volume > 0 ? a.volume : a.tome) || 0;
                var tb = (b.volume > 0 ? b.volume : b.tome) || 0;
                if (ta !== tb) return ta - tb;
                return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
            });
            var missingTomes = findMissingTomes(sortedFiles);
            var missingIdx = 0;
            sortedFiles.forEach(function (f) {
                while (missingIdx < missingTomes.length && missingTomes[missingIdx] < ((f.volume > 0 ? f.volume : f.tome) || 0)) {
                    cardsCtn.appendChild(renderMissingTomeCard(missingTomes[missingIdx]));
                    missingIdx++;
                }
                cardsCtn.appendChild(renderTomeCard(f, collection));
            });
            while (missingIdx < missingTomes.length) {
                cardsCtn.appendChild(renderMissingTomeCard(missingTomes[missingIdx]));
                missingIdx++;
            }
            container.appendChild(cardsCtn);
        }

        if (!files.length && !children.length) {
            var empty2 = document.createElement('div');
            empty2.className = 'lib-empty';
            empty2.setAttribute('data-translation', 'noResults');
            empty2.textContent = t('noResults');
            container.appendChild(empty2);
        }

        var allFiles = L.collectAllFiles(L.getCollectionRoot(collection) || {});
        if (allFiles.length) {
            var tomesViewKey = L.getViewKey();

            var hasUncachedCovers = allFiles.some(function (f) {
                return f.path && state.covers[f.path] === undefined;
            });
            if (hasUncachedCovers) {
                L.showLoaderToast(t('loadingCovers') || t('loading') || 'Chargement des couvertures…');
            }

            loadCoversBulk(allFiles, function (fetched) {
                L.hideLoaderToast();
                if (fetched) {
                    if (state.viewCache && state.viewCache[tomesViewKey]) { state.viewCacheEpoch = (state.viewCacheEpoch || 0) + 1; delete state.viewCache[tomesViewKey]; }
                    if (document.getElementById('lib-content') && L.getViewKey() === tomesViewKey) {
                        L.invalidateViewCache();
                        renderTomes(collection);
                    }
                }
            });
        }
    }

    function buildFileTableRows(files, library, collection) {
        return files.map(function (f) {
            var label = f.name ? f.name.replace(/\.[^.]+$/, '') : f.path;
            var prev = renderTomeIcon(f, collection);
            var vol = (f.volume > 0) ? f.volume : '';
            var ch = (f.chapter > 0) ? f.chapter : '';
            var tomeTxt = (f.tome > 0 || (f.tomes && f.tomes.length)) ? tomeLabelFor(f) : (vol ? String(vol) : '');
            var displayNameVal = (state.displayNameOverrides && state.displayNameOverrides[f.path]) || label;

            var openHandler = function () {
                state.view = 'reading';
                state.currentTome = { path: f.path, name: f.name, tome: f.tome || 1 };
                if (library) {
                    updateUrl({ view: 'reading', library: String(library.id), read: f.path });
                } else if (collection) {
                    updateUrl({ view: 'reading', library: String(state.currentLibrary.id), collection: String(collection.id), read: f.path });
                } else {
                    updateUrl({ view: 'reading', read: f.path });
                }
                L.renderReading(f);
                L.renderSidebar();
                L.renderBreadcrumb();
            };

            var goToCollectionHandler = function () {
                if (library) {
                    state.view = 'collection';
                    state.flatFilesMode = false;
                    state.currentCollection = null;
                    updateUrl({ view: 'collection', library: String(library.id) });
                    L.render();
                    L.renderSidebar();
                    L.renderBreadcrumb();
                } else if (collection) {
                    L.navigateToCollection(collection, state.currentLibrary);
                }
            };

            var editDisplayNameHandler = function () {
                if (!state.isAdmin) return;
                showDisplayNameEditDialog(f, displayNameVal, function (newName) {
                    if (newName === null) return;
                    state.displayNameOverrides = state.displayNameOverrides || {};
                    if (newName.trim() === '') {
                        delete state.displayNameOverrides[f.path];
                    } else {
                        state.displayNameOverrides[f.path] = newName.trim();
                    }
                    saveDisplayNameOverride(f, library, collection);
                });
            };

            return {
                cells: [
                    { html: '<div class="lib-table-preview">' + prev + '</div>', className: 'lib-col-preview' },
                    { text: label, className: 'lib-col-name' },
                    { html: '<span class="lib-display-name-value">' + escapeHtml(displayNameVal) + '</span> <button type="button" class="lib-display-name-pencil" data-path="' + escapeHtml(f.path) + '" title="' + escapeHtml(t('rename')) + '" data-translation="rename" draggable="false">' + EDIT_SVG + '</button>', className: 'lib-col-display-name lib-display-name-cell', attrs: { 'data-path': f.path, 'data-editable': state.isAdmin ? 'true' : 'false' } },
                    { text: f.series || '', className: 'lib-col-series' },
                    { text: tomeTxt || '', className: 'lib-col-tome' },
                    { text: ch || '', className: 'lib-col-chapter' },
                    { text: fileExt(f).toUpperCase(), className: 'lib-col-type' },
                    { text: f.size ? formatSize(f.size) : '', className: 'lib-col-size' },
                    { text: f.pages ? String(f.pages) : '', className: 'lib-col-pages' }
                ],
                data: { path: f.path },
                onClick: function (e) {
                    if (e.target.classList.contains('lib-display-name-pencil')) {
                        e.stopPropagation();
                        editDisplayNameHandler();
                        return;
                    }
                    if (e.target.classList.contains('lib-tome-actions-btn') || (e.target.closest && e.target.closest('.lib-table-actions'))) return;
                    openHandler();
                },
                onContextMenu: function (e) {
                    e.preventDefault();
                    var items = [];
                     items.push({ label: t('open'), icon: OPEN_SVG, action: openHandler });
                    if (library) {
                        items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, url: getBaseUrl() + '/reader?view=collection&library=' + String(library.id), action: goToCollectionHandler });
                    } else if (collection) {
                        items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, url: getBaseUrl() + '/reader?view=tomes&library=' + String(state.currentLibrary.id) + '&collection=' + String(collection.id), action: goToCollectionHandler });
                    }
                    items.push({ type: 'separator' });
                    items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { L.markTomeRead(f, collection || null); } });
                    items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markTomeUnread(f, collection || null); } });
                    if (state.isAdmin) {
                        items.push({ type: 'separator' });
                        items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { L.renameTome(f, collection || null); } });
                        items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.pickCoverForTome(f); } });
                        items.push({ type: 'separator' });
                        items.push({ label: t('contextDelete'), icon: DELETE_SVG, action: function () { L.deleteTome(f, collection || null); } });
                    }
                    if (!items.length) return;
                    L.showContextMenu(e, items, f);
                }
            };
        });
    }

    function renderFlatFiles(library) {
        dbg('renderFlatFiles', { library: library && library.id });

        var viewKey = L.getViewKey();
        if (state.coversLoaded && state.viewCache && state.viewCache[viewKey] && document.getElementById('lib-content') && document.getElementById('lib-content').firstChild) {
            L.cacheCurrentView();
            if (L.restoreCachedView(viewKey)) {
                L.renderSidebar();
                L.renderBreadcrumb();
                return;
            }
        }

        L.renderSidebar();
        L.renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;

        state.renderedViewKey = viewKey;
        container.innerHTML = '';

        var files = (state.flatFiles || []).slice();

        var filterBar = document.createElement('div');
        filterBar.className = 'lib-filter-bar';

        var allExtBtn = document.createElement('button');
        allExtBtn.type = 'button';
        allExtBtn.className = 'lib-filter-btn lib-filter-btn-active';
        allExtBtn.textContent = t('filterAll');
        allExtBtn.addEventListener('click', function () {
            files = (state.flatFiles || []).slice();
            document.querySelectorAll('.lib-filter-btn').forEach(function(b) { b.classList.remove('lib-filter-btn-active'); });
            allExtBtn.classList.add('lib-filter-btn-active');
            renderFlatFilesBody();
        });
        filterBar.appendChild(allExtBtn);
        var extFiltersDiv = document.createElement('div');
        extFiltersDiv.className = 'lib-ext-filters';

        var extGroup = {};
        files.forEach(function (f) {
            var ext = fileExt(f);
            if (!extGroup[ext]) extGroup[ext] = 0;
            extGroup[ext]++;
        });
        Object.keys(extGroup).sort().forEach(function (ext) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lib-filter-btn';
            btn.innerHTML = '.' + escapeHtml(ext) + ' <span class="lib-ext-counts">(' + extGroup[ext] + ')</span>';
            btn.addEventListener('click', function () {
                files = (state.flatFiles || []).filter(function (f) { return fileExt(f) === ext; });
                document.querySelectorAll('.lib-filter-btn').forEach(function(b) { b.classList.remove('lib-filter-btn-active'); });
                btn.classList.add('lib-filter-btn-active');
                renderFlatFilesBody();
            });
            extFiltersDiv.appendChild(btn);
        });
        filterBar.appendChild(extFiltersDiv);

        function renderFlatFilesBody() {
            container.innerHTML = '';
            var filterWrapper = document.createElement('div');
            filterWrapper.className = 'lib-filter-wrapper';
            filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);

            var toggleWrapper = document.createElement('div');
            toggleWrapper.className = 'lib-collection-toggle-wrapper';
            var toggleBtn = createViewToggleBtn('toggleFlat', LIST_VIEW_SVG, function () {
                state.flatFilesMode = false;
                state.view = 'collection';
                updateUrl({ view: 'collection', library: String(library.id) });
                showLoader();
                L.loadCollections(library.id, function () {
                    hideLoader();
                    renderCollections(library);
                });
            });
            toggleWrapper.appendChild(toggleBtn);

            var filterBtn = document.createElement('button');
            filterBtn.type = 'button';
            filterBtn.id = 'lib-table-filter-btn';
            filterBtn.className = 'lib-btn lib-btn-icon lib-table-filter-btn';
            filterBtn.innerHTML = FILTER_SVG;
            filterBtn.title = t('filterColumns');
            filterBtn.addEventListener('click', function (e) { showTableColumnFilter(e, function () { renderFlatFilesBody(); }); });
            toggleWrapper.appendChild(filterBtn);

            filterWrapper.appendChild(toggleWrapper);
            filterWrapper.appendChild(filterBar);
            container.appendChild(filterWrapper);

            if (!files.length) {
                var empty = document.createElement('div');
                empty.className = 'lib-empty';
                empty.setAttribute('data-translation', 'noResults');
                empty.textContent = t('noResults');
                container.appendChild(empty);
                return;
            }

            var tableWrapper = document.createElement('div');
            tableWrapper.className = 'lib-data-table-wrapper';
            container.appendChild(tableWrapper);

            var columns = getVisibleColumns(fileTableColumns(), library.id);
            var rows = buildFileTableRows(files, library);
            renderDataTable(tableWrapper, columns, rows);

            var flatFilesViewKey = L.getViewKey();
            var hasUncachedCoversFlatFiles = files.some(function (f) {
                return f.path && state.covers[f.path] === undefined;
            });
            if (hasUncachedCoversFlatFiles) {
                L.showLoaderToast(t('loadingCovers') || t('loading') || 'Chargement des couvertures…');
            }
            loadCoversBulk(files.slice(), function (fetched) {
                L.hideLoaderToast();
                if (fetched) {
                    if (state.viewCache && state.viewCache[flatFilesViewKey]) { state.viewCacheEpoch = (state.viewCacheEpoch || 0) + 1; delete state.viewCache[flatFilesViewKey]; }
                    if (document.getElementById('lib-content') && L.getViewKey() === flatFilesViewKey) {
                        L.invalidateViewCache();
                        renderFlatFilesBody();
                    }
                }
            });
        }

        
        var displayNameViewKey = L.getViewKey();
        loadDisplayNameOverrides(library, function () {
            if (document.getElementById('lib-content') && L.getViewKey() === displayNameViewKey) {
                L.invalidateViewCache();
                renderFlatFilesBody();
            }
        });

        renderFlatFilesBody();
    }

    function loadDisplayNameOverrides(library, cb) {
        if (!library || !library.id) { if (typeof cb === 'function') cb(); return; }
        var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (typeof OC !== 'undefined' && OC.requestToken) headers['requesttoken'] = OC.requestToken;
        fetch(getBaseUrl() + '/api/reader/display-names/' + encodeURIComponent(String(library.id)), {
            method: 'GET',
            credentials: 'same-origin',
            headers: headers
        }).then(function (r) {
            if (r.status === 404) {
                state.displayNameOverrides = {};
                if (typeof cb === 'function') cb();
                return null;
            }
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (data) {
            if (data) {
                if (data.success && data.names) {
                    state.displayNameOverrides = data.names;
                } else {
                    state.displayNameOverrides = {};
                }
            }
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.displayNameOverrides = {};
            if (typeof cb === 'function') cb();
        });
    }

    function saveDisplayNameOverride(f, library, collection) {
        if (!state.isAdmin) return;
        var names = {};
        Object.keys(state.displayNameOverrides || {}).forEach(function (p) {
            names[p] = state.displayNameOverrides[p];
        });
        apiRequest(getBaseUrl() + '/api/reader/display-names' + (library ? ('/' + String(library.id)) : ''), {
            method: 'POST',
            body: JSON.stringify({ path: f.path, name: state.displayNameOverrides[f.path] || null })
        }).catch(function (err) {
            dbg('saveDisplayNameOverride error', { err: err && err.message });
        });
    }

    function showDisplayNameEditDialog(f, currentName, onSave) {
        var existing = document.getElementById('lib-display-name-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'lib-display-name-overlay';
        overlay.className = 'lib-display-name-overlay';
        overlay.innerHTML =
            '<div class="lib-display-name-modal">' +
            '<div class="lib-display-name-title" data-translation="rename">' + escapeHtml(t('rename')) + '</div>' +
            '<input type="text" class="lib-display-name-input" value="' + escapeHtml(currentName || '') + '" placeholder="' + escapeHtml(t('displayName')) + '" />' +
            '<div class="lib-display-name-actions">' +
            '<button type="button" class="lib-btn lib-display-name-cancel" data-translation="cancel">' + escapeHtml(t('cancel')) + '</button>' +
            '<button type="button" class="lib-btn lib-btn-primary lib-display-name-save" data-translation="save">' + escapeHtml(t('save')) + '</button>' +
            '</div></div>';
        document.body.appendChild(overlay);

        var cancelBtn = overlay.querySelector('.lib-display-name-cancel');
        var saveBtn = overlay.querySelector('.lib-display-name-save');
        var input = overlay.querySelector('.lib-display-name-input');

        function cleanup() {
            if (overlay.parentNode) overlay.remove();
        }
        cancelBtn.addEventListener('click', function () {
            cleanup();
            onSave(null);
        });
        saveBtn.addEventListener('click', function () {
            cleanup();
            onSave(input.value.trim());
        });
        input.addEventListener('keydown', function (ev) {
            if (ev.keyCode === 13) { saveBtn.click(); }
            else if (ev.keyCode === 27) { cancelBtn.click(); }
        });
        input.focus();
        input.select();
    }

    function getVisibleColumns(columns, libraryId) {
        var visibility = (state.tableColumnVisibility && libraryId && state.tableColumnVisibility[libraryId]) || {};
        return columns.filter(function (col) {
            if (col.hideable === false) return true;
            if (visibility[col.key] === undefined) return true;
            return visibility[col.key] !== false;
        });
    }

    function showTableColumnFilter(e, onApply) {
        e.preventDefault();
        var existing = document.getElementById('lib-table-filter-popup');
        if (existing) { existing.remove(); }
        var libId = state.currentLibrary ? String(state.currentLibrary.id) : '__all__';
        var columns = getVisibleColumns(fileTableColumns(), state.currentLibrary ? state.currentLibrary.id : null);
        var visibility = (state.tableColumnVisibility && state.tableColumnVisibility[libId]) || {};

        var popup = document.createElement('div');
        popup.id = 'lib-table-filter-popup';
        popup.className = 'lib-filter-popup';
        popup.style.left = (e.pageX || 0) + 'px';
        popup.style.top = (e.pageY || 0) + 'px';

        var checkAllDiv = document.createElement('div');
        checkAllDiv.className = 'lib-filter-check-all';
        checkAllDiv.textContent = t('filterColumnsAll');
        var allChecked = Object.keys(visibility).every(function (k) { return visibility[k] !== false; }) || Object.keys(visibility).length === 0;
        checkAllDiv.innerHTML = (allChecked ? '✓ ' : '') + t('filterColumnsAll');
        checkAllDiv.addEventListener('click', function () {
            var allOn = Object.keys(visibility).every(function (k) { return visibility[k] !== false; }) || Object.keys(visibility).length === 0;
            if (allOn) {
                state.tableColumnVisibility = state.tableColumnVisibility || {};
                state.tableColumnVisibility[libId] = {};
                columns.forEach(function (col) {
                    if (col.hideable !== false) state.tableColumnVisibility[libId][col.key] = false;
                });
            } else {
                state.tableColumnVisibility = state.tableColumnVisibility || {};
                state.tableColumnVisibility[libId] = {};
                columns.forEach(function (col) {
                    if (col.hideable !== false) state.tableColumnVisibility[libId][col.key] = true;
                });
            }
            rebuildPopup();
        });
        popup.appendChild(checkAllDiv);

        var title = document.createElement('div');
        title.className = 'lib-filter-title';
        title.textContent = t('filterColumns');
        popup.appendChild(title);

        function rebuildPopup() {
            while (popup.children.length > 2) popup.removeChild(popup.children[2]);
            columns.forEach(function (col) {
                if (col.hideable === false) return;
                var isChecked = visibility[col.key] !== false;
                var row = document.createElement('div');
                row.className = 'lib-filter-checkbox';
                row.innerHTML = '<input type="checkbox" ' + (isChecked ? 'checked' : '') + ' data-key="' + col.key + '"/><span>' + (col.label || col.key) + '</span>';
                var checkbox = row.querySelector('input');
                checkbox.addEventListener('change', function () {
                    visibility[col.key] = this.checked;
                    state.tableColumnVisibility = state.tableColumnVisibility || {};
                    state.tableColumnVisibility[libId] = visibility;
                    if (typeof onApply === 'function') onApply();
                });
                popup.appendChild(row);
            });
        }
        rebuildPopup();

        document.body.appendChild(popup);

        function closePopup() {
            if (popup.parentNode) popup.remove();
            document.removeEventListener('mousedown', closeOnOutsideClick);
        }
        function closeOnOutsideClick(ev) {
            if (!popup.contains(ev.target)) {
                closePopup();
            }
        }
        setTimeout(function () { document.addEventListener('mousedown', closeOnOutsideClick); }, 0);
    }

    function fileTableColumns() {
        return [
            { key: 'preview', label: '', className: 'lib-col-preview', width: '56px', hideable: true },
            { key: 'name', label: t('filename'), className: 'lib-col-name', hideable: true },
            { key: 'displayName', label: t('displayName'), className: 'lib-col-display-name', hideable: true },
            { key: 'series', label: t('series'), className: 'lib-col-series', hideable: true },
            { key: 'tome', label: t('tome'), width: '80px', className: 'lib-col-tome', hideable: true },
            { key: 'chapter', label: t('chapter'), width: '80px', className: 'lib-col-chapter', hideable: true },
            { key: 'type', label: t('fileType'), width: '50px', className: 'lib-col-type', hideable: true },
            { key: 'size', label: t('size'), width: '70px', className: 'lib-col-size', hideable: true },
            { key: 'pages', label: t('pages'), width: '60px', className: 'lib-col-pages', hideable: true }
        ];
    }

    function renderDataTable(container, columns, rows, opts) {
        opts = opts || {};
        container.innerHTML = '';
        var table = document.createElement('table');
        table.className = opts.className || 'lib-data-table';
        if (opts.tableId) table.id = opts.tableId;

        var thead = document.createElement('thead');
        var headerRow = thead.insertRow(-1);
        headerRow.className = 'lib-data-table-header';
        columns.forEach(function (col) {
            var th = document.createElement('th');
            th.scope = 'col';
            th.textContent = col.label || '';
            if (col.key) th.setAttribute('data-key', col.key);
            if (col.className) th.className = col.className;
            if (col.width) th.style.width = col.width;
            if (col.align) th.style.textAlign = col.align;
            headerRow.appendChild(th);
        });
        table.appendChild(thead);

        var tbody = document.createElement('tbody');

        if (!rows.length) {
            var emptyTr = tbody.insertRow(-1);
            var emptyTd = emptyTr.insertCell(-1);
            emptyTd.colSpan = columns.length;
            emptyTd.className = 'lib-data-table-empty';
            emptyTd.setAttribute('data-translation', 'noResults');
            emptyTd.textContent = opts.emptyMessage || t('noResults');
         } else {
            rows.forEach(function (row, idx) {
                var tr = tbody.insertRow(-1);
                tr.className = 'lib-data-table-row ' + (idx % 2 === 0 ? 'lib-data-table-row-even' : 'lib-data-table-row-odd');
                if (row.rowClassName) tr.className += ' ' + row.rowClassName;
                if (row.data) {
                    Object.keys(row.data).forEach(function (k) {
                        tr.setAttribute('data-' + k, String(row.data[k]));
                    });
                }
                var colClassMap = {};
                columns.forEach(function (col) { if (col.className) colClassMap[col.className.split(' ')[0]] = col; });
                row.cells.forEach(function (cell, i) {
                    var colKey = cell.className ? cell.className.split(' ')[0] : '';
                    if (colKey && colClassMap[colKey]) {
                        var td = tr.insertCell(-1);
                        if (cell.className) td.className = cell.className;
                        if (cell.html) td.innerHTML = cell.html;
                        else if (typeof cell === 'string') td.textContent = cell;
                        else if (cell.text) td.textContent = cell.text;
                        if (cell.width) td.style.width = cell.width;
                        if (cell.align) td.style.textAlign = cell.align;
                        if (cell.attrs) {
                            Object.keys(cell.attrs).forEach(function (k) {
                                td.setAttribute(k, cell.attrs[k]);
                            });
                        }
                    }
                });
                if (typeof row.onClick === 'function') {
                    tr.addEventListener('click', row.onClick);
                }
                if (typeof row.onContextMenu === 'function') {
                    tr.addEventListener('contextmenu', row.onContextMenu);
                }
                if (typeof row.onDblClick === 'function') {
                    tr.addEventListener('dblclick', row.onDblClick);
                }
            });
        }

        table.appendChild(tbody);
        container.appendChild(table);
        return table;
    }

    function renderCollections(library) {
        dbg('renderCollections', { library: library && library.id, view: state.view });

        var viewKey = L.getViewKey();
        if (state.coversLoaded && state.viewCache && state.viewCache[viewKey] && document.getElementById('lib-content') && document.getElementById('lib-content').firstChild) {
            L.cacheCurrentView();
            if (L.restoreCachedView(viewKey)) {
                L.renderSidebar();
                L.renderBreadcrumb();
                return;
            }
        }

        L.renderSidebar();
        L.renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;

        state.renderedViewKey = viewKey;
        container.innerHTML = '';

        var filterWrapper = document.createElement('div');
        filterWrapper.className = 'lib-filter-wrapper';
        filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
        container.appendChild(filterWrapper);

        if (library && library.libraryType !== 'audio') {
            var headerBar = document.createElement('div');
            headerBar.className = 'lib-collection-toggle-wrapper';
            var toggleBtn = createViewToggleBtn('toggleHierarchical', GRID_VIEW_SVG, function () {
                state.flatFilesMode = true;
                state.view = 'flat-files';
                updateUrl({ view: 'flat-files', library: String(library.id) });
                showLoader();
                L.loadAllFilesForLibrary(library, function () {
                    hideLoader();
                    renderFlatFiles(library);
                });
            });
            headerBar.appendChild(toggleBtn);
            filterWrapper.appendChild(headerBar);
        }
        var cols = (state.collectionsByLib && library && library.id != null && state.collectionsByLib[library.id])
            ? state.collectionsByLib[library.id]
            : (state.collections || []);
        if (!cols.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.setAttribute('data-translation', 'noResults');
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }
        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        cols.forEach(function (col) {
            var card = document.createElement('div');
            card.className = 'lib-card';
            var allFiles = L.collectAllFiles(col.rules || {});
            var rootFiles = (col.rules && col.rules.files) ? col.rules.files : [];
            var colCover = coverOfFirstTome(allFiles);
            var colIcon = colCover
                ? '<img class="lib-card-img" src="' + colCover + '" alt="📁" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📁\');this.remove();">'
                : NO_PREVIEW_SVG;
            if (!colCover) card.classList.add('noPreview');
            var colStatusHtml = L.collectionCardStatusHtml(col);
            var rootAllImages = L.hasOnlyImageFiles(rootFiles);
            var rootCount;
            if (rootAllImages) {
                rootCount = rootFiles.length;
            } else {
                rootCount = countTomes(rootFiles);
                if (!rootCount && rootFiles.length) {
                    rootCount = rootFiles.length;
                }
            }
            var childCount = (col.rules && Array.isArray(col.rules.children)) ? col.rules.children.length : 0;
            var metaParts = [];
            if (rootCount) {
                metaParts.push(rootCount + ' <span data-translation="' + (rootAllImages ? 'images' : 'tomes') + '">' + escapeHtml(rootAllImages ? t('images') : t('tomes')) + '</span>');
            }
            if (childCount) {
                metaParts.push(childCount + ' <span data-translation="subCollections">' + escapeHtml(t('subCollections')) + '</span>');
            }
            card.innerHTML =
                '<div class="lib-icon">' + colIcon + colStatusHtml + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(col.name || '') + '">' + escapeHtml(col.name || '') + '</div>' +
                '<div class="lib-meta">' + metaParts.join(' · ') + '</div>' +
                '<button class="lib-tome-actions-btn" type="button" title="' + escapeHtml(t('navMore')) + '" aria-label="' + escapeHtml(t('navMore')) + '">⋯</button>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-tome-actions-btn')) { e.stopPropagation(); return; }
                state.view = 'tomes';
                state.currentCollection = col;
                state.readerTreePath = [];
                updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(col.id) });
                L.render();
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
                items.push({ label: t('open'), icon: OPEN_SVG, action: function () { L.navigateToCollection(col, library); } });
                var colPaths = L.collectPaths(col);
                if (colPaths.length) {
                    items.push({ type: 'separator' });
                    items.push({ label: t('markCollectionRead'), icon: MARK_READ_SVG, action: function () { L.markCollectionRead(col, library); } });
                    items.push({ label: t('markCollectionUnread'), icon: MARK_UNREAD_SVG, action: function () { L.markCollectionUnread(col, library); } });
                }
                if (state.isAdmin) {
                    if (items.length) items.push({ type: 'separator' });
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { L.renameCollection(col, library); } });
                    items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.pickCoverForTome(allFiles[0]); } });
                    items.push({ label: t('changeColType'), icon: TYPE_SVG, action: function () { L.changeCollectionType(col, library); } });
                    items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { L.rescanCollection(col, library); } });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteCol'), icon: DELETE_SVG, action: function () { L.deleteCollection(col, library); } });
                }
                if (!items.length) return;
                L.showContextMenu(e, items, col);
            });
            L.attachLongPress(card);
            grid.appendChild(card);
        });
        container.appendChild(grid);

        var allFiles = [];
        cols.forEach(function (c) {
            var f = L.collectAllFiles(c.rules || {});
            f.forEach(function (file) {
                if (file.path) allFiles.push(file);
            });
        });
        var collectionsViewKey = L.getViewKey();

        var hasUncachedCovers = allFiles.some(function (f) {
            return f.path && state.covers[f.path] === undefined;
        });
        if (hasUncachedCovers) {
            L.showLoaderToast(t('loadingCovers') || t('loading') || 'Chargement des couvertures…');
        }

        loadCoversBulk(allFiles, function (fetched) {
            L.hideLoaderToast();
            console.debug('[Renamer] loadCoversBulk callback in renderCollections', { fetched: fetched, allFiles: allFiles.length, viewKey: collectionsViewKey, currentViewKey: L.getViewKey(), coversLoaded: state.coversLoaded });
            if (fetched) {
                if (state.viewCache && state.viewCache[collectionsViewKey]) { state.viewCacheEpoch = (state.viewCacheEpoch || 0) + 1; delete state.viewCache[collectionsViewKey]; }
                if (document.getElementById('lib-content') && L.getViewKey() === collectionsViewKey) {
                    console.debug('[Renamer] Re-rendering collections with covers');
                    L.invalidateViewCache();
                    renderCollections(library);
                }
            }
        });
    }

    function renderLibrariesContent() {
        console.debug('[Renamer] renderLibrariesContent() start', { libraries: (state.libraries || []).length, view: state.view, coversLoaded: state.coversLoaded, progressLoaded: state.progressLoaded, collectionsByLibKeys: Object.keys(state.collectionsByLib || {}), viewCacheKeys: Object.keys(state.viewCache || {}), renderedViewKey: state.renderedViewKey });
        dbg('renderLibrariesContent', { libraries: (state.libraries || []).length, view: state.view });

        var viewKey = L.getViewKey();
        if (state.coversLoaded && state.viewCache && state.viewCache[viewKey] && document.getElementById('lib-content') && document.getElementById('lib-content').firstChild) {
            L.cacheCurrentView();
            if (L.restoreCachedView(viewKey)) {
                L.renderSidebar();
                L.renderBreadcrumb();
                return;
            }
        }

        L.renderSidebar();
        L.renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;

        state.renderedViewKey = viewKey;
        container.innerHTML = '';

        var libs = state.libraries || [];

        if (libs.length === 0) {
            var emptyHint = state.isAdmin
                ? ('<div class="lib-empty-hint" data-translation="emptyHint">' + t('emptyHint') + '</div>' +
                   '<button class="lib-btn lib-btn-primary" id="lib-add-lib-btn" data-translation="addLibrary">' + t('addLibrary') + '</button>')
                : ('<div class="lib-empty-hint" data-translation="readOnlyHint">' + t('readOnlyHint') + '</div>');
            container.innerHTML =
                '<div class="lib-empty">' +
                    '<div class="lib-empty-icon">📚</div>' +
                    '<div class="lib-empty-title" data-translation="empty">' + escapeHtml(t('empty')) + '</div>' +
                    emptyHint +
                '</div>';
            var addBtn = document.getElementById('lib-add-lib-btn');
            if (addBtn) addBtn.addEventListener('click', addLibrary);
            return;
        }

        var wrap = document.createElement('div');

        if (state.homeImage) {
            var homeBanner = document.createElement('div');
            homeBanner.className = 'lib-home-banner';
            homeBanner.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { L.editHomeImage(); } });
                    items.push({ label: t('rescanLibrary'), icon: SYNC_SVG, action: function () { L.render(); } });
                }
                if (!items.length) return;
                L.showContextMenu(e, items, null);
            });
            var img = document.createElement('img');
            img.className = 'lib-home-banner-img';
            img.src = L.getBaseUrl() + '/api/files/blob?path=' + encodeURIComponent(state.homeImage);
            img.alt = escapeHtml(t('home'));
            img.onerror = function () { homeBanner.remove(); };
            homeBanner.appendChild(img);
            wrap.appendChild(homeBanner);
        }

        var continueSection = document.createElement('div');
        continueSection.className = 'lib-section';
        var continueHeader = document.createElement('div');
        continueHeader.className = 'lib-progress-header';
        var continueTitle = document.createElement('div');
        continueTitle.className = 'lib-section-title';
        continueTitle.setAttribute('data-translation', 'inProgress');
        continueTitle.textContent = t('inProgress');
        continueHeader.appendChild(continueTitle);
        var continueList = document.createElement('div');
        continueList.className = 'lib-progress-track';
        continueSection.appendChild(continueHeader);

        var progPaths = [];
        var allTomePaths = [];
        libs.forEach(function (lib) {
            var cols = (state.collectionsByLib && state.collectionsByLib[lib.id]) ? state.collectionsByLib[lib.id] : (state.collections || []);
            console.debug('[Renamer] libs.forEach lib', { libId: lib.id, libName: lib.name, hasColsByLib: !!(state.collectionsByLib && state.collectionsByLib[lib.id]), colsCount: cols.length });
            cols.forEach(function (c) {
                var files = L.collectAllFiles(c.rules || {});
                files.forEach(function (f) {
                    progPaths.push({ path: f.path, lib: lib, col: c, file: f });
                    allTomePaths.push(f);
                });
            });
        });
        console.debug('[Renamer] renderLibrariesContent paths', { libsCount: libs.length, progPaths: progPaths.length, allTomePaths: allTomePaths.length, bookmarksCount: Object.keys(state.bookmarks).length, coversCount: Object.keys(state.covers).length });

        var viewKey = L.getViewKey();

        var hasUncachedCoversLibs = allTomePaths.some(function (f) {
            return f.path && state.covers[f.path] === undefined;
        });
        if (hasUncachedCoversLibs) {
            L.showLoaderToast(t('loadingCovers') || t('loading') || 'Chargement des couvertures…');
        }

        loadCoversBulk(allTomePaths, function (fetched) {
            L.hideLoaderToast();
            console.debug('[Renamer] loadCoversBulk callback in renderLibrariesContent', { fetched: fetched, coversLoaded: state.coversLoaded, progressLoaded: state.progressLoaded, viewKey: viewKey, currentViewKey: L.getViewKey() });
            if (fetched) {
                if (state.viewCache && state.viewCache[viewKey]) { state.viewCacheEpoch = (state.viewCacheEpoch || 0) + 1; delete state.viewCache[viewKey]; }
                if (document.getElementById('lib-content') && !state._rendering && L.getViewKey() === viewKey) {
                    console.debug('[Renamer] Re-rendering libraries content with covers');
                    renderLibrariesContent();
                } else {
                    console.debug('[Renamer] NOT re-rendering libraries', { hasContainer: !!document.getElementById('lib-content'), _rendering: state._rendering, viewMatch: L.getViewKey() === viewKey });
                }
            }
        });

        console.debug('[Renamer] renderProgressCards about to be called', { progPaths: progPaths.length, progressLoaded: state.progressLoaded, bookmarksCount: Object.keys(state.bookmarks).length });
        L.renderProgressCards(continueList, progPaths);
        L.attachProgressCarouselNav(continueHeader, continueList);

        if (!Object.keys(state.bookmarks).length && !progPaths.length) {
            var emptyProg = document.createElement('div');
            emptyProg.className = 'lib-progress-empty';
            emptyProg.setAttribute('data-translation', 'noProgress');
            emptyProg.textContent = t('noProgress');
            continueList.appendChild(emptyProg);
        }
        continueSection.appendChild(continueList);
        wrap.appendChild(continueSection);

        var gridSection = document.createElement('div');
        gridSection.className = 'lib-section';
        var gridTitle = document.createElement('div');
        gridTitle.className = 'lib-section-title';
        gridTitle.setAttribute('data-translation', 'librariesLabel');
        gridTitle.textContent = t('librariesLabel');
        gridSection.appendChild(gridTitle);
        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        L.renderLibraryCards(grid);
        gridSection.appendChild(grid);
        wrap.appendChild(gridSection);

        container.appendChild(wrap);
    }

    L.tomeLabelFor = tomeLabelFor;
    L.countTomes = countTomes;
    L.findMissingTomes = findMissingTomes;
    L.renderMissingTomeCard = renderMissingTomeCard;
    L.renderTomeCard = renderTomeCard;
    L.renderSubCollectionCard = renderSubCollectionCard;
    L.renderFlatCollection = renderFlatCollection;
    L.flattenFilesAndSubCollections = flattenFilesAndSubCollections;
    L.renderTomes = renderTomes;
    L.buildFileTableRows = buildFileTableRows;
    L.renderFlatFiles = renderFlatFiles;
    L.loadDisplayNameOverrides = loadDisplayNameOverrides;
    L.saveDisplayNameOverride = saveDisplayNameOverride;
    L.showDisplayNameEditDialog = showDisplayNameEditDialog;
    L.getVisibleColumns = getVisibleColumns;
    L.showTableColumnFilter = showTableColumnFilter;
    L.fileTableColumns = fileTableColumns;
    L.renderDataTable = renderDataTable;
    L.renderCollections = renderCollections;
    L.renderLibrariesContent = renderLibrariesContent;

function createViewToggleBtn(labelKey, iconSvg, onClick) {

           var btn = document.createElement('button');

        btn.type = 'button';

            btn.className = 'lib-sidebar-toggle lib-view-toggle-btn';

            var label = t(labelKey);

            btn.title = label;

            btn.setAttribute('aria-label', label);

            btn.innerHTML = '<span class="lib-view-toggle-btn-icon">' + iconSvg + '</span> ' + label;

           btn.addEventListener('click', onClick);

           return btn;

       }

    L.createViewToggleBtn = createViewToggleBtn;
})(window.RenamerLibrary);