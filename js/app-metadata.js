(function() {
    'use strict';

    console.log('[MetadataTab] module loaded', { client: true });
    const TAB_ID = 'metadata';

    const METADATA_FIELDS = ['artist', 'title', 'album', 'track', 'year', 'genre'];

    function formatElapsedTime(ms) {
        var total = Math.floor(ms / 1000);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        var mm = (m < 10 ? '0' : '') + m;
        var ss = (s < 10 ? '0' : '') + s;
        if (h > 0) {
            var hh = (h < 10 ? '0' : '') + h;
            return hh + ':' + mm + ':' + ss;
        }
        return mm + ':' + ss;
    }

    function ensureStyle() {
        const existing = document.getElementById('metadata-style');
        if (existing) {
            existing.textContent = getStyles();
            return;
        }
        const style = document.createElement('style');
        style.id = 'metadata-style';
        style.textContent = getStyles();
        document.head.appendChild(style);
    }

     function getStyles() {
        return `
            body,html{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-drag:none}
            .metadata-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 13px;
                table-layout: auto;
            }
            .metadata-preview {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .renamer-preview-header {
                display: flex;
                align-items: center;
                padding: 8px 23px 8px 10px;
                border-bottom: 1px solid var(--nc-border);
                background: var(--nc-bg-hover);
                position: sticky;
                top: 0;
                z-index: 10;
                justify-content: start;
            }
            button#metadata-toggle-all {
                pointer-events: auto;
                position: relative;
                z-index: 10;
                padding: 0;
                margin: 0;
                margin-right: auto;
            }
            .renamer-preview-header #metadata-search {
                max-width: 200px;
                margin: 0 8px;
                padding: 4px 28px 4px 8px;
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                font-size: 13px;
                background-color: #fff;
            }
            #metadata-breadcrumb {
                margin-right: auto;
                flex: 1;
                min-width: 0;
            }
            #metadata-breadcrumb .navigation-breadcrumb {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 2px;
            }
            #metadata-breadcrumb .breadcrumb__crumbs {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 2px;
                list-style: none;
                margin: 0;
                padding: 0;
            }
            #metadata-breadcrumb .navigation-crumb {
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }
            #metadata-breadcrumb .navigation-crumb a {
                text-decoration: none;
            }
            #metadata-breadcrumb .navigation-crumb.active a {
                cursor: default;
                pointer-events: none;
            }
            #metadata-breadcrumb .vue-crumb__separator {
                display: inline-flex;
                align-items: center;
                opacity: 0.7;
            }

            #metadata-breadcrumb .navigation-crumb svg {
                fill: var(--color-text-maxcontrast);
            }

            #metadata-breadcrumb .navigation-crumb .button-vue__text {
                color: var(--color-text-maxcontrast);
            }

            #metadata-breadcrumb .navigation-crumb.active .button-vue__text {
                color: var(--nc-text);
            }
            .navigation-folder-row td,
            .navigation-subfolder-row td {
                padding: 8px 12px;
                cursor: pointer;
                background-color: var(--nc-bg-hover);
                pointer-events: auto;
            }
            .navigation-folder-row:hover td,
            .navigation-subfolder-row:hover td {
                background-color: var(--nc-hover);
            }
            .navigation-folder-row .navigation-folder-icon,
            .navigation-subfolder-row .navigation-folder-icon {
                width: 20px;
                text-align: center;
                margin-right: 8px;
                opacity: 0.8;
            }
            .navigation-folder-row .navigation-folder-name,
            .navigation-subfolder-row .navigation-folder-name {
                font-weight: 500;
                color: var(--nc-text);
                cursor: pointer;
            }
            .navigation-folder-row svg,
            .navigation-subfolder-row svg {
                fill: var(--color-text-maxcontrast);
            }
            .navigation-folder-row .metadata-col-file,
            .navigation-subfolder-row .metadata-col-file {
                pointer-events: auto;
                cursor: pointer;
            }
            .metadata-search-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
            }
            .metadata-search-clear {
                position: absolute;
                right: 8px !important;
                padding: 0px 7px !important;
                margin: 0px !important;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
            }
            .metadata-search-clear.disabled {
                opacity: 0.3;
                cursor: default;
                pointer-events: none;
            }
            .renamer-preview-header #metadata-filter-btn {
                padding: 4px 12px;
                font-size: 12px;
            }
            .renamer-preview-header #metadata-filter-btn svg {
                width: 12px;
                height: 12px;
            }
            .metadata-filter-popup {
                position: fixed;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 10px;
                z-index: 10000;
                min-width: 180px;
                max-width: 220px;
            }
            .metadata-filter-title {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 6px;
            }
            .metadata-filter-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
                cursor: pointer;
                font-size: 13px;
            }
            .metadata-filter-item:last-child {
                margin-bottom: 0;
            }
            .metadata-filter-toggle {
                position: relative;
                width: 28px;
                height: 16px;
                background: #ccc;
                border-radius: 8px;
                cursor: pointer;
                transition: var(--nc-transition);
                flex-shrink: 0;
            }
            .metadata-filter-toggle.on {
                background: var(--reader-accent);
            }
            .metadata-filter-toggle .renamer-toggle-knob {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 12px;
                height: 12px;
                background: #fff;
                border-radius: 50%;
                transition: var(--nc-transition);
            }
            .metadata-filter-toggle.on .renamer-toggle-knob {
                left: 14px;
            }
            .metadata-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
            }
            .metadata-table thead {
                position: sticky;
                top: 0px;
                z-index: 9;
                background-color: var(--nc-bg);
                outline: 2px solid var(--nc-border);
            }
            .metadata-table thead th {
                text-align: left;
                padding: 8px 12px;
                background: var(--nc-bg-hover);
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding-left: 7px;
            }
            .metadata-table tbody td {
                padding: 0px;
                box-shadow: inset 0 1px 0 0 var(--nc-border);
                vertical-align: middle;
            }
            .metadata-row-even {
                background-color: var(--nc-bg);
            }
            .metadata-row-odd {
                background-color: var(--nc-background-default);
            }
            .metadata-col-file {
                font-weight: 500;
                text-align: left;
                pointer-events: none;
            }
            .metadata-col-file .metadata-filename {
                pointer-events: auto;
            }
            #metadata-preview-list .metadata-col-select {
                text-align: center;
                vertical-align: middle;
                width: 32px;
                pointer-events: none;
                padding-left: 7px;
            }
            .metadata-col-select button.renamer-badge-toggle {
                pointer-events: auto;
                position: relative;
                z-index: 2;
            }
            .metadata-pencil-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                opacity: 0;
                padding: 4px 6px;
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.15s;
                pointer-events: auto;
                z-index: 3;
            }
            .metadata-pencil-btn:hover {
                opacity: 1;
            }
            .metadata-audio-play-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                padding: 0;
                border: 1px solid transparent;
                border-radius: var(--nc-radius);
                background: transparent;
                color: var(--nc-text-muted);
                cursor: pointer;
                flex-shrink: 0;
                transition: background-color 0.15s, color 0.15s, border-color 0.15s;
                pointer-events: auto;
                position: relative;
                z-index: 2;
            }
            .metadata-audio-play-btn:hover {
                background: var(--nc-bg-hover);
                color: var(--nc-text);
                border-color: var(--nc-border);
            }
            .metadata-audio-play-btn.metadata-audio-playing {
                color: var(--reader-accent);
                border-color: var(--reader-accent);
                background: rgba(124, 58, 237, 0.08);
            }
            .metadata-preview-row-unchecked .metadata-audio-play-btn {
                opacity: 0.35;
                pointer-events: none;
                cursor: not-allowed;
            }
            .metadata-preview-row-unchecked .metadata-audio-play-btn.metadata-audio-playing {
                opacity: 1;
                pointer-events: auto;
                cursor: pointer;
            }
            .metadata-audio-play-btn-disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            .metadata-preview-row-unhandled {
                opacity: 0.6;
            }
            .renamer-check-icon, .renamer-uncheck-icon {
                display: inline-block;
                width: 16px;
                height: 16px;
            }
            .metadata-row-unchecked {
                opacity: 0.4;
            }
            .metadata-row-unchecked .metadata-pencil-btn {
                opacity: 0 !important;
                cursor: not-allowed;
                pointer-events: none;
            }
            .metadata-row-unchecked td.metadata-editable-cell {
                cursor: not-allowed;
            }
            .metadata-row-playing {
                background-color: rgba(124, 58, 237, 0.06) !important;
            }
            .metadata-row-playing .metadata-audio-play-btn {
                color: var(--reader-accent);
                border-color: var(--reader-accent);
                background: rgba(124, 58, 237, 0.08);
            }
            .metadata-table-container {
                overflow-y: auto;
                flex: 1;
            }
            .metadata-save-btn {
                position: fixed;
                right: 16px;
                bottom: 16px;
                z-index: 10010;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border: 1px solid var(--nc-border);
                background: var(--reader-accent);
                color: var(--reader-accent-light);
                border-radius: var(--nc-radius);
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px);
                transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;
            }
            .metadata-save-btn.visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            .metadata-save-btn svg {
                width: 16px;
                height: 16px;
            }
            .renamer-badge-toggle {
                pointer-events: auto;
                position: relative;
                z-index: 2;
            }
            .metadata-editable-cell {
                cursor: pointer;
                position: relative;
                vertical-align: middle;
            }
            .metadata-editable-cell * {
                cursor: pointer;
            }
            .metadata-row-unchecked td.metadata-editable-cell * {
                cursor: default;
            }
            .metadata-editable-cell:hover .metadata-pencil-btn {
                opacity: 1;
            }
            th.metadata-sortable {
                cursor: pointer;
            }
            th.metadata-sortable:hover .metadata-sort-icon:not(.active) {
                opacity: 0.5;
            }
            .metadata-sort-icon {
                width: 14px;
                height: 14px;
                margin-left: 6px;
                opacity: 0.25;
                transition: opacity 0.15s ease, transform 0.15s ease;
                pointer-events: none;
                vertical-align: middle;
            }
            .metadata-sort-icon.active {
                opacity: 0.8;
            }
            .metadata-sort-icon.desc {
                transform: rotate(180deg);
            }
            td.foundSearch {
                background-color: #bcedbc;
            }
            td.metadata-modified {
                background-color: #efefd3 !important;
            }
            .search-match {
                background: rgba(34, 197, 94, 0.15);
                color: #155724;
                border-radius: 5px;
                padding: 4px 1px;
            }
            .metadata-selection-counter {
                margin-left: 8px;
                margin-right: auto;
                font-size: 13px;
                color: var(--nc-text-muted);
            }
            .metadata-table .metadata-preview-row.context-menu-open {
                outline: 2px solid var(--reader-accent-bg);
                outline-offset: -2px;
                border-radius: var(--nc-radius);
                z-index: 1;
                position: relative;
            }
            .metadata-table th.metadata-col-duration,
            .metadata-table th.metadata-col-added_on,
            .metadata-table td.metadata-col-duration,
            .metadata-table td.metadata-col-added_on {
                white-space: nowrap;
            }
            .metadata-preview-row.search-hidden {
                display: none !important;
            }
         `;
    }

    const CHECK_SVG = window.RenamerIcons.CHECK;
    const UNCHECK_SVG = window.RenamerIcons.UNCHECK;
    const DELETE_SVG = window.RenamerIcons.DELETE;
    const FILTER_SVG = window.RenamerIcons.FILTER;
    const EDIT_ICON_SVG = window.RenamerIcons.EDIT;
    const PLAY_SVG = window.RenamerIcons.PLAY;
    const PAUSE_SVG = window.RenamerIcons.PAUSE;
    const SAVE_SVG = window.RenamerIcons.SAVE;
    const FOLDER_SVG = '<span class="icon-vue" style="width:20px;height:20px;display:flex;">' + window.RenamerIcons.FOLDER + '</span>';
    const SORT_ASC_SVG = window.RenamerIcons.SORT_ASC;

    const METADATA_BATCH_SIZE = 20;
    const METADATA_LAZY_THRESHOLD = 50;
    const METADATA_PREF_KEY = 'metadataAlwaysLoadAll';

    let metadataLazyLoadToast = null;

    function removeLazyLoadToast() {
        if (metadataLazyLoadToast && metadataLazyLoadToast.parentNode) {
            metadataLazyLoadToast.remove();
        }
        metadataLazyLoadToast = null;
    }

    function getMetadataAlwaysLoadAllPref(ctx) {
        return new Promise(function(resolve) {
            ctx.apiRequest(ctx.getBaseUrl() + '/api/user-preferences', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }).then(function(body) {
                if (body && body.success && body.preferences && body.preferences.metadataAlwaysLoadAll !== undefined) {
                    resolve(!!body.preferences.metadataAlwaysLoadAll);
                } else {
                    resolve(false);
                }
            }).catch(function() {
                resolve(false);
            });
        });
    }

    function setMetadataAlwaysLoadAllPref(ctx, value) {
        return ctx.apiRequest(ctx.getBaseUrl() + '/api/user-preferences', {
            method: 'POST',
            body: JSON.stringify({ key: METADATA_PREF_KEY, value: !!value })
        }).then(function(body) {
            if (body && body.success) {
                ctx.state._metadataAlwaysLoadAll = true;
            }
            return body;
        });
    }

    function loadMetadataBatch(ctx, audioFiles, offset, limit) {
        const list = document.getElementById('metadata-preview-list');
        if (!list) return;

        const batch = audioFiles.slice(offset, offset + limit);
        if (!batch.length) {
            removeLazyLoadToast();
            renderPreviewTable(ctx);
            return;
        }

        console.log('[MetadataTab] loadMetadataBatch -> offset=' + offset + ' limit=' + limit + ' batch size=' + batch.length);

        ctx.apiRequest(ctx.getBaseUrl() + '/api/metadata/read', {
            method: 'POST',
            body: JSON.stringify({ paths: batch })
        }).then(function(body) {
            if (!body || !body.success) {
                list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(body && body.error ? body.error : 'Erreur inconnue') + '</div>';
                removeLazyLoadToast();
                return;
            }

            const files = body.files || [];
            if (!ctx.state.metadataFileData) ctx.state.metadataFileData = {};
            files.forEach(function(fileData) {
                if (!fileData || !fileData.path) return;
                ctx.state.metadataFileData[fileData.path] = fileData;
            });

            const totalLoaded = Object.keys(ctx.state.metadataFileData || {}).length;
            const totalAudio = audioFiles.length;
            const remaining = totalAudio - totalLoaded;

            renderPreviewTable(ctx);

            if (remaining <= 0) {
                removeLazyLoadToast();
                return;
            }

            const alwaysLoadAll = ctx.state._metadataAlwaysLoadAll;
            if (alwaysLoadAll) {
                showLazyLoadToast(ctx, totalLoaded, totalAudio, remaining, function() {
                    loadMetadataBatch(ctx, audioFiles, totalLoaded, METADATA_BATCH_SIZE);
                }, false);
            } else if (totalAudio > METADATA_LAZY_THRESHOLD && totalLoaded >= METADATA_LAZY_THRESHOLD) {
                showThresholdToast(ctx, totalLoaded, totalAudio, remaining, function() {
                    loadMetadataBatch(ctx, audioFiles, totalLoaded, remaining);
                });
            } else if (totalAudio > METADATA_BATCH_SIZE) {
                showLazyLoadToast(ctx, totalLoaded, totalAudio, remaining, function() {
                    loadMetadataBatch(ctx, audioFiles, totalLoaded, METADATA_BATCH_SIZE);
                }, false);
            }
        }).catch(function(err) {
            list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(err.message || 'Erreur réseau') + '</div>';
            removeLazyLoadToast();
        });
    }

    function showLazyLoadToast(ctx, loadedCount, totalCount, remainingCount, onLoadMore, showAlwaysLoadAll) {
        removeLazyLoadToast();

        let container = document.getElementById('renamer-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'renamer-toast-container';
            container.className = 'renamer-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'renamer-toast renamer-toast-info renamer-toast-persistent';

        const loadedLabel = ctx.t('metadataLazyLoaded') || 'fichiers chargés';
        const message = loadedCount + ' ' + loadedLabel + ', ' + remainingCount + ' manquants';

        let buttonsHtml = '<button type="button" class="renamer-toast-action renamer-toast-load-more" data-translation="metadataLoadRemaining">' + ctx.escapeHtml(ctx.t('metadataLoadRemaining') || 'Charger les manquants') + '</button>';

        if (showAlwaysLoadAll) {
            buttonsHtml += '<button type="button" class="renamer-toast-action renamer-toast-always-load" data-translation="metadataAlwaysLoadAll">' + ctx.escapeHtml(ctx.t('metadataAlwaysLoadAll') || 'Toujours tout charger') + '</button>';
        }

        const loaderSvg = '<svg class="renamer-toast-loader-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><circle cx="12" cy="12" r="9" stroke-dasharray="56" stroke-dashoffset="14" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/></circle></svg>';
        const closeBtn = '<button type="button" class="renamer-toast-close" aria-label="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '">×</button>';

        toast.innerHTML = '<span class="renamer-toast-icon"></span>' +
            '<span class="renamer-toast-text">' + ctx.escapeHtml(message) + '</span>' +
            '<span class="renamer-toast-actions">' + buttonsHtml + '</span>' +
            closeBtn +
            '<span class="renamer-toast-loader-icon">' + loaderSvg + '</span>';

        container.appendChild(toast);
        setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

        metadataLazyLoadToast = toast;

        toast.querySelector('.renamer-toast-close').addEventListener('click', removeLazyLoadToast);

        const loadMoreBtn = toast.querySelector('.renamer-toast-load-more');
        if (loadMoreBtn && onLoadMore) {
            loadMoreBtn.addEventListener('click', function() {
                removeLazyLoadToast();
                onLoadMore();
            });
        }

        const alwaysLoadBtn = toast.querySelector('.renamer-toast-always-load');
        if (alwaysLoadBtn) {
            alwaysLoadBtn.addEventListener('click', function() {
                removeLazyLoadToast();
                const currentLoaded = Object.keys(ctx.state.metadataFileData || {}).length;
                setMetadataAlwaysLoadAllPref(ctx, true).then(function() {
                    loadMetadataBatch(ctx, ctx.state._metadataAudioFiles || [], currentLoaded, METADATA_BATCH_SIZE);
                });
            });
        }
    }

    function showThresholdToast(ctx, loadedCount, totalCount, remainingCount, onLoadAll) {
        removeLazyLoadToast();

        let container = document.getElementById('renamer-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'renamer-toast-container';
            container.className = 'renamer-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'renamer-toast renamer-toast-info renamer-toast-persistent';

        const message = (ctx.t('metadataLazyThresholdReached') || '50 fichiers chargés, charger les manquants ?') + ' (' + remainingCount + ' manquants)';

        const loaderSvg = '<svg class="renamer-toast-loader-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><circle cx="12" cy="12" r="9" stroke-dasharray="56" stroke-dashoffset="14" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/></circle></svg>';
        const closeBtn = '<button type="button" class="renamer-toast-close" aria-label="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '">×</button>';

        toast.innerHTML = '<span class="renamer-toast-icon"></span>' +
            '<span class="renamer-toast-text">' + ctx.escapeHtml(message) + '</span>' +
            '<span class="renamer-toast-actions">' +
                '<button type="button" class="renamer-toast-action renamer-toast-load-more" data-translation="metadataLoadRemaining">' + ctx.escapeHtml(ctx.t('metadataLoadRemaining') || 'Charger les manquants') + ' (' + remainingCount + ')</button>' +
                '<button type="button" class="renamer-toast-action renamer-toast-always-load" data-translation="metadataAlwaysLoadAll">' + ctx.escapeHtml(ctx.t('metadataAlwaysLoadAll') || 'Toujours tout charger') + '</button>' +
            '</span>' +
            closeBtn +
            '<span class="renamer-toast-loader-icon">' + loaderSvg + '</span>';

        container.appendChild(toast);
        setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

        metadataLazyLoadToast = toast;

        toast.querySelector('.renamer-toast-close').addEventListener('click', removeLazyLoadToast);

        const loadMoreBtn = toast.querySelector('.renamer-toast-load-more');
        if (loadMoreBtn && onLoadAll) {
            loadMoreBtn.addEventListener('click', function() {
                removeLazyLoadToast();
                onLoadAll();
            });
        }

        const alwaysLoadBtn = toast.querySelector('.renamer-toast-always-load');
        if (alwaysLoadBtn) {
            alwaysLoadBtn.addEventListener('click', function() {
                removeLazyLoadToast();
                const currentLoaded = Object.keys(ctx.state.metadataFileData || {}).length;
                setMetadataAlwaysLoadAllPref(ctx, true).then(function() {
                    loadMetadataBatch(ctx, ctx.state._metadataAudioFiles || [], currentLoaded, METADATA_BATCH_SIZE);
                });
            });
        }
    }

    function formatTime(sec) {
        const total = Math.floor(sec || 0);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        const mm = (m < 10 ? '0'  : '') + m;
        const ss = (s < 10 ? '0'  : '') + s;
        if (h > 0) {
            const hh = (h < 10 ? '0'  : '') + h;
            return hh + '' + mm + '' + ss;
        }
        return mm + '' + ss;
    }

    function enqueueSelectedAudioFiles(ctx) {
        if (!window.RenamerAudioPlayer) return;
        window.RenamerAudioPlayer.setup({ ctx: ctx });
        let selectedPaths = [];
        if (ctx.state.metadataAllSelected) {
            selectedPaths = ctx.state.files.filter(function(f) {
                return window.RenamerAudioPlayer.isAudioFile(f);
            });
        } else {
            selectedPaths = Array.from(ctx.state.metadataFileSelection).filter(function(f) {
                return window.RenamerAudioPlayer.isAudioFile(f);
            });
        }
        selectedPaths.forEach(function(path) {
            window.RenamerAudioPlayer.enqueue(path, { ctx: ctx });
        });
        window.RenamerAudioPlayer.updateMetadataPlayingState();
    }

    function showAudioContextMenu(ctx, path, event, ctxField) {
        event.preventDefault();
        event.stopPropagation();
        const existing = document.getElementById('metadata-audio-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'metadata-audio-context-menu';
        menu.className = 'metadata-audio-context-menu';
        let menuHtml =
            '<button type="button" class="metadata-audio-context-menu-item" data-action="play" data-translation="metadataListen">' + ctx.escapeHtml(ctx.t('metadataListen') || 'Lire') + '</button>' +
            '<button type="button" class="metadata-audio-context-menu-item" data-action="enqueue" data-translation="metadataEnqueue">' + ctx.escapeHtml(ctx.t('metadataEnqueue') || 'Ajouter à la file d\'attente') + '</button>' +
            '<button type="button" class="metadata-audio-context-menu-item" data-action="enqueue-selection" data-translation="metadataEnqueueSelection">' + ctx.escapeHtml(ctx.t('metadataEnqueueSelection') || 'Ajouter la sélection à la file d\'attente') + '</button>';
        if (ctxField) {
            const FIELD_LABELS = { artist: 'artiste', title: 'titre', album: 'album', track: 'piste', year: 'année', genre: 'genre' };
            const label = FIELD_LABELS[ctxField] || ctxField;
            menuHtml += '<button type="button" class="metadata-audio-context-menu-item" data-action="edit-field" data-translation="metadataEditField" data-field="' + ctx.escapeHtml(ctxField) + '">' + ctx.escapeHtml(ctx.t('metadataEditField') || 'Modifier') + ' \'' + ctx.escapeHtml(label) + '\'</button>';
        }
        menu.innerHTML = menuHtml;

        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        let top = event.clientY;
        let left = event.clientX;
        if (left + menuRect.width > window.innerWidth - 8) {
            left = window.innerWidth - menuRect.width - 8;
        }
        if (top + menuRect.height > window.innerHeight - 8) {
            top = window.innerHeight - menuRect.height - 8;
        }
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';

        menu.querySelectorAll('.metadata-audio-context-menu-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.dataset.action;
                menu.remove();
                if (action === 'play') {
                    window.RenamerAudioPlayer.play(path, { ctx: ctx });
                } else if (action === 'enqueue') {
                    window.RenamerAudioPlayer.enqueue(path, { ctx: ctx });
                } else if (action === 'enqueue-selection') {
                    enqueueSelectedAudioFiles(ctx);
                } else if (action === 'edit-field') {
                    const field = this.dataset.field;
                    if (field) showEditPopup(ctx, [path], field);
                }
            });
        });

        const closeHandler = function(e) {
            if (menu && !menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(function() {
            document.addEventListener('click', closeHandler);
        }, 10);

        const escHandler = function(e) {
            if (e.key === 'Escape') {
                menu.remove();
                document.removeEventListener('keydown', escHandler, true);
            }
        };
        document.addEventListener('keydown', escHandler, true);
    }

    function build(ctx) {
        console.log('[MetadataTab] build() called');
        ensureStyle();
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-main">
                    <div class="metadata-preview">
                        <div class="renamer-preview-header">
                            <div id="metadata-breadcrumb"></div>
                            <span class="metadata-selection-counter" id="metadata-selection-counter"></span>
                            <div class="metadata-search-wrapper">
                                <input type="text" id="metadata-search" placeholder="${ctx.t('metadataSearch')}" data-translation="metadataSearch" />
                                <button type="button" id="metadata-search-clear" class="metadata-search-clear" title="${ctx.t('delete')}" data-translation="delete">${DELETE_SVG}</button>
                            </div>
                            <button type="button" id="metadata-filter-btn" class="renamer-btn renamer-btn-icon" title="${ctx.t('metadataFilter')}" data-translation="metadataFilter">${FILTER_SVG}</button>
                        </div>
                        <div class="metadata-table-container" id="metadata-preview-list"></div>
                    </div>
                </div>
            </div>
            <button type="button" id="metadata-save-btn" class="metadata-save-btn" data-translation="metadataApply">${SAVE_SVG}<span>${ctx.t('save') || 'Sauvegarder'}</span></button>
        `;
    }

    function bind(ctx) {
        console.log('[MetadataTab] bind() called');

        const saveBtn = document.getElementById('metadata-save-btn');
        if (saveBtn && !saveBtn._metadataBound) {
            saveBtn._metadataBound = true;
            saveBtn.addEventListener('click', function() {
                handleApply(ctx);
            });
            console.log('[MetadataTab] bound save button');
        }

        const searchInput = document.getElementById('metadata-search');
        if (searchInput && !searchInput._metadataBound) {
            searchInput._metadataBound = true;
            searchInput.addEventListener('input', function() {
                handleSearch(ctx, this.value.trim());
                updateSearchClearState();
            });
        }

        const searchClear = document.getElementById('metadata-search-clear');
        if (searchClear && !searchClear._metadataBound) {
            searchClear._metadataBound = true;
            searchClear.addEventListener('click', function() {
                const input = document.getElementById('metadata-search');
                if (input) {
                    input.value = '';
                    handleSearch(ctx, '');
                    updateSearchClearState();
                }
            });
        }

        function updateSearchClearState() {
            const input = document.getElementById('metadata-search');
            const clearBtn = document.getElementById('metadata-search-clear');
            if (!input || !clearBtn) return;
            if (input.value.trim()) {
                clearBtn.classList.remove('disabled');
            } else {
                clearBtn.classList.add('disabled');
            }
        }

        updateSearchClearState();

        const filterBtn = document.getElementById('metadata-filter-btn');
        if (filterBtn && !filterBtn._metadataBound) {
            filterBtn._metadataBound = true;
            filterBtn.addEventListener('click', function() {
                showFilterPopup(ctx);
            });
        }

        function setupNavigation() {
            console.log('[MetadataTab] setupNavigation called, RenamerNavigation=', typeof RenamerNavigation);
            if (typeof RenamerNavigation === 'undefined') {
                console.warn('[MetadataTab] RenamerNavigation not loaded');
                return;
            }
            console.log('[MetadataTab] setupNavigation initializing');
            RenamerNavigation.init(ctx);
            RenamerNavigation.addFolderLoadedListener(function(ctx) {
                console.log('[MetadataTab] onFolderLoaded triggered');
                if (ctx.state.activeTab !== 'metadata') return;
                ctx.state.metadataSubfolders = null;
                ctx.state.metadataSubfoldersPath = null;
                clearSearchInput(ctx);
                loadMetadata(ctx);
            });
            RenamerNavigation.renderBreadcrumb('metadata-breadcrumb');
            console.log('[MetadataTab] setupNavigation done, currentPath=', RenamerNavigation.getCurrentPath());
        }

        if (typeof RenamerApp !== 'undefined' && typeof RenamerApp.loadNavigationScript === 'function') {
            console.log('[MetadataTab] bind using RenamerApp.loadNavigationScript');
            RenamerApp.loadNavigationScript().then(setupNavigation).catch(function(err) {
                console.warn('[MetadataTab] navigation unavailable:', err);
            });
        } else {
            console.log('[MetadataTab] bind fallback setupNavigation');
            setupNavigation();
        }
    }

    function showFilterPopup(ctx) {
        const existing = document.getElementById('metadata-filter-popup');
        if (existing) { existing.remove(); return; }

        const fields = ['filename'].concat(METADATA_FIELDS, ['duration', 'added_on']);
        let checked = ctx.state.metadataFilterColumns || {};
        let allChecked = fields.every(function(f) { return checked[f] !== false; });

        const filterBtn = document.getElementById('metadata-filter-btn');
        const btnRect = filterBtn ? filterBtn.getBoundingClientRect() : null;

        const popup = document.createElement('div');
        popup.id = 'metadata-filter-popup';
        popup.className = 'metadata-filter-popup';

        let html = '<div class="metadata-filter-title" data-translation="metadataFilterColumns">' + ctx.escapeHtml(ctx.t('metadataFilterColumns') || 'Colonnes') + '</div>';
        html += '<label class="metadata-filter-item"><div class="metadata-filter-toggle' + (allChecked ? ' on' : '') + '" data-field="__all"><div class="renamer-toggle-knob"></div></div> <span data-translation="selectAll">' + ctx.escapeHtml(ctx.t('selectAll') || 'Tout') + '</span></label>';
        fields.forEach(function(field) {
            let label, key;
            if (field === 'filename') {
                label = ctx.t('filename') || 'Fichier';
                key = 'filename';
            } else if (field === 'added_on') {
                label = ctx.t('metadataAddedOn') || 'Ajouté le';
                key = 'metadataAddedOn';
            } else if (field === 'duration') {
                label = ctx.t('metadataDuration') || 'Durée';
                key = 'metadataDuration';
            } else {
                label = ctx.t('metadata' + field.charAt(0).toUpperCase() + field.slice(1));
                key = 'metadata' + field.charAt(0).toUpperCase() + field.slice(1);
            }
            const isChecked = checked[field] !== false;
            html += '<label class="metadata-filter-item"><div class="metadata-filter-toggle' + (isChecked ? ' on' : '') + '" data-field="' + field + '"><div class="renamer-toggle-knob"></div></div> <span data-translation="' + key + '">' + ctx.escapeHtml(label || field) + '</span></label>';
        });
        popup.innerHTML = html;
        document.body.appendChild(popup);

        if (btnRect) {
            const popupRect = popup.getBoundingClientRect();
            let top = btnRect.bottom + 6;
            let left = btnRect.left + btnRect.width / 2 - popupRect.width / 2;
            if (left + popupRect.width > window.innerWidth - 8) {
                left = window.innerWidth - popupRect.width - 8;
            }
            if (left < 8) left = 8;
            if (top + popupRect.height > window.innerHeight - 8) {
                top = btnRect.top - popupRect.height - 6;
            }
            popup.style.top = top + 'px';
            popup.style.left = left + 'px';
        } else {
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
        }

        function syncState() {
            const newChecked = {};
            const toggles = popup.querySelectorAll('.metadata-filter-toggle');
            toggles.forEach(function(t) {
                if (t.dataset.field && t.dataset.field !== '__all') {
                    newChecked[t.dataset.field] = t.classList.contains('on');
                }
            });
            ctx.state.metadataFilterColumns = newChecked;
            applyColumnFilter(ctx);
        }

        function updateAllToggle() {
            const toggles = popup.querySelectorAll('.metadata-filter-toggle[data-field="__all"]');
            const others = popup.querySelectorAll('.metadata-filter-toggle:not([data-field="__all"])');
            const allOn = Array.from(others).every(function(t) { return t.classList.contains('on'); });
            toggles.forEach(function(t) {
                if (allOn) t.classList.add('on');
                else t.classList.remove('on');
            });
        }

        popup.querySelectorAll('.metadata-filter-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const toggle = item.querySelector('.metadata-filter-toggle');
                if (!toggle) return;
                const field = toggle.dataset.field;

                if (field === '__all') {
                    const isOn = toggle.classList.contains('on');
                    const others = popup.querySelectorAll('.metadata-filter-toggle:not([data-field="__all"])');
                    others.forEach(function(t) {
                        if (isOn) t.classList.remove('on');
                        else t.classList.add('on');
                    });
                    if (isOn) toggle.classList.remove('on');
                    else toggle.classList.add('on');
                } else {
                    toggle.classList.toggle('on');
                    updateAllToggle();
                }
                syncState();
            });
        });

        setTimeout(() => {
            document.addEventListener('click', function close(e) {
                if (popup && !popup.contains(e.target) && e.target !== filterBtn) {
                    popup.remove();
                    document.removeEventListener('click', close);
                }
            });
        }, 10);
    }

    function applyColumnFilter(ctx) {
        const checked = ctx.state.metadataFilterColumns || {};
        const fields = ['filename'].concat(METADATA_FIELDS, ['duration', 'added_on']);
        const allChecked = fields.every(function(f) { return checked[f] !== false; });

        METADATA_FIELDS.forEach(function(field) {
            const colClass = 'metadata-col-' + field;
            const visible = allChecked || checked[field] !== false;
            const header = document.querySelector('th.' + colClass);
            const cells = document.querySelectorAll('td.' + colClass);
            if (header) header.style.display = visible ? '' : 'none';
            cells.forEach(function(cell) {
                cell.style.display = visible ? '' : 'none';
            });
        });

        ['duration', 'added_on'].forEach(function(field) {
            const colClass = 'metadata-col-' + field;
            const visible = allChecked || checked[field] !== false;
            const header = document.querySelector('th.' + colClass);
            const cells = document.querySelectorAll('td.' + colClass);
            if (header) header.style.display = visible ? '' : 'none';
            cells.forEach(function(cell) {
                cell.style.display = visible ? '' : 'none';
            });
        });

        const filenameVisible = allChecked || checked['filename'] !== false;
        const filenameHeader = document.querySelector('th.metadata-col-file');
        const filenameCells = document.querySelectorAll('td.metadata-col-file');
        if (filenameHeader) filenameHeader.style.display = filenameVisible ? '' : 'none';
        filenameCells.forEach(function(cell) {
            cell.style.display = filenameVisible ? '' : 'none';
        });

        const selectHeader = document.querySelector('th.metadata-col-select');
        const selectCells = document.querySelectorAll('td.metadata-col-select');
        if (selectHeader) selectHeader.style.display = '';
        selectCells.forEach(function(cell) {
            cell.style.display = '';
        });
    }

    function render(ctx) {
        console.log('[MetadataTab] render called, __renamerAppClosed=', window.__renamerAppClosed, 'metadataFileData keys=', Object.keys(ctx.state.metadataFileData || {}).length, 'files count=', (ctx.state.files || []).length);
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = ctx.state.files.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        if (!ctx.state.metadataFileSelection || ctx.state.metadataFileSelection.size === 0) {
            ctx.state.metadataFileSelection = new Set(audioFiles);
            ctx.state.metadataAllSelected = true;
        } else if (ctx.state.metadataAllSelected) {
            ctx.state.metadataFileSelection = new Set(audioFiles);
        } else {
            const filtered = new Set();
            ctx.state.metadataFileSelection.forEach(function(p) {
                if (audioFiles.indexOf(p) !== -1) filtered.add(p);
            });
            ctx.state.metadataFileSelection = filtered;
            if (audioFiles.length && ctx.state.metadataFileSelection.size === 0) {
                ctx.state.metadataAllSelected = true;
                ctx.state.metadataFileSelection = new Set(audioFiles);
            }
        }

        if (!ctx.state.metadataSortField) {
            ctx.state.metadataSortField = null;
            ctx.state.metadataSortDirection = 'desc';
        }

        renderPreview(ctx);
    }

    function clearSearchInput(ctx) {
        const input = document.getElementById('metadata-search');
        if (input) {
            input.value = '';
        }
        handleSearch(ctx, '');
        if (typeof updateSearchClearState === 'function') {
            updateSearchClearState();
        }
    }

    function handleSearch(ctx, query) {
        ctx.state.metadataSearchQuery = query || '';

        const searchLower = query.toLowerCase();

        const allTds = document.querySelectorAll('td[data-original-html]');
        allTds.forEach(function(cell) {
            cell.innerHTML = cell.getAttribute('data-original-html');
            cell.classList.remove('foundSearch');
        });

        const allFilenameCells = document.querySelectorAll('td.metadata-col-file');
        allFilenameCells.forEach(function(cell) {
            cell.classList.remove('foundSearch');
            const p = cell.querySelector('.metadata-filename');
            if (p) {
                const original = cell.getAttribute('data-original-filename');
                if (original) {
                    p.innerHTML = unescapeHtml(original);
                }
            }
            const folderName = cell.querySelector('.navigation-folder-name');
            if (folderName) {
                const originalFolder = cell.getAttribute('data-original-folder');
                if (originalFolder) {
                    folderName.textContent = originalFolder;
                }
            }
        });

        if (!searchLower) {
            document.querySelectorAll('.metadata-preview-row.search-hidden').forEach(function(row) {
                row.classList.remove('search-hidden');
            });
            return;
        }

        let foundCount = 0;
        const files = ctx.state.metadataFileData || {};
        Object.keys(files).forEach(function(path) {
            const fileData = files[path];
            if (!fileData) return;
            const meta = fileData.metadata || {};
            const baseName = path.replace(/^.*\//, '');

            if (baseName.toLowerCase().indexOf(searchLower) !== -1) {
                const row = document.querySelector('tr[data-path="' + escapeHtmlAttr(path) + '"]');
                if (!row) return;
                const cell = row.querySelector('td.metadata-col-file');
                if (!cell) return;
                const p = cell.querySelector('.metadata-filename');
                if (p) {
                    const idx = baseName.toLowerCase().indexOf(searchLower);
                    const before = escapeHtml(baseName.substring(0, idx));
                    const match = escapeHtml(baseName.substring(idx, idx + query.length));
                    const after = escapeHtml(baseName.substring(idx + query.length));
                    p.innerHTML = before + '<span class="search-match">' + match + '</span>' + after;
                }
                cell.classList.add('foundSearch');
                foundCount++;
            }

            METADATA_FIELDS.forEach(function(field) {
                const val = (meta[field] || '').toString();
                if (val.toLowerCase().indexOf(searchLower) !== -1) {
                    const row = document.querySelector('tr[data-path="' + escapeHtmlAttr(path) + '"]');
                    if (!row) return;
                    const cell = findTdByField(row, field);
                    if (!cell) return;
                    const p = cell.querySelector('p');
                    if (!p) return;
                    const idx = val.toLowerCase().indexOf(searchLower);
                    if (idx !== -1) {
                        const before = escapeHtml(val.substring(0, idx));
                        const match = escapeHtml(val.substring(idx, idx + query.length));
                        const after = escapeHtml(val.substring(idx + query.length));
                        p.innerHTML = before + '<span class="search-match">' + match + '</span>' + after;
                    }
                    cell.classList.add('foundSearch');
                    foundCount++;
                }
            });

            const fileInfo = fileData.fileInfo || {};
            const extraFields = [
                { key: 'duration', value: fileInfo.duration !== null ? formatTime(fileInfo.duration) : null },
                { key: 'added_on', value: fileInfo.added_on }
            ];
            extraFields.forEach(function(item) {
                const val = (item.value || '').toString();
                if (val.toLowerCase().indexOf(searchLower) !== -1) {
                    const row = document.querySelector('tr[data-path="' + escapeHtmlAttr(path) + '"]');
                    if (!row) return;
                    const cell = findTdByField(row, item.key);
                    if (!cell) return;
                    const p = cell.querySelector('span.metadata-value-' + item.key);
                    if (!p) return;
                    const idx = val.toLowerCase().indexOf(searchLower);
                    if (idx !== -1) {
                        const before = escapeHtml(val.substring(0, idx));
                        const match = escapeHtml(val.substring(idx, idx + query.length));
                        const after = escapeHtml(val.substring(idx + query.length));
                        p.innerHTML = before + '<span class="search-match">' + match + '</span>' + after;
                    }
                    cell.classList.add('foundSearch');
                    foundCount++;
                }
            });
        });

        document.querySelectorAll('tr.navigation-folder-row, tr.navigation-subfolder-row').forEach(function(row) {
            const cell = row.querySelector('td.metadata-col-file');
            if (!cell) return;
            const folderNameEl = cell.querySelector('.navigation-folder-name');
            if (!folderNameEl) return;
            const folderName = folderNameEl.textContent || '';
            if (folderName.toLowerCase().indexOf(searchLower) !== -1) {
                const idx = folderName.toLowerCase().indexOf(searchLower);
                const before = escapeHtml(folderName.substring(0, idx));
                const match = escapeHtml(folderName.substring(idx, idx + query.length));
                const after = escapeHtml(folderName.substring(idx + query.length));
                folderNameEl.innerHTML = before + '<span class="search-match">' + match + '</span>' + after;
                cell.classList.add('foundSearch');
                foundCount++;
            }
        });

        document.querySelectorAll('.metadata-preview-row').forEach(function(row) {
            const hasMatch = row.querySelector('td.foundSearch');
            if (hasMatch) {
                row.classList.remove('search-hidden');
            } else {
                row.classList.add('search-hidden');
            }
        });

        if (foundCount === 0) {
            showToast(ctx, ctx.t('metadataSearchNotFound', query));
        }
    }

    function findTdByField(row, field) {
        if (!row) return null;
        const cells = row.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].className.indexOf('metadata-col-' + field) !== -1) {
                return cells[i];
            }
        }
        return null;
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function unescapeHtml(str) {
        return String(str).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }

    function escapeHtmlAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function showToast(ctx, message, type) {
        if (ctx.showToast) {
            ctx.showToast(message, type || 'info');
        } else {
            console.log('[MetadataTab] Toast:', message);
        }
    }

    function loadMetadata(ctx) {
        const list = document.getElementById('metadata-preview-list');
        if (!list) return;
        list.innerHTML = '<div style="padding:16px;text-align:center;opacity:0.6;">Chargement...</div>';
        removeLazyLoadToast();

        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];

        const selectedFiles = (ctx.state.files || []).filter(function(f) {
            if (!selectedSet) return true;
            return selectedSet.has(f);
        });

        const audioFiles = selectedFiles.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        console.log('[MetadataTab] loadMetadata -> total audio files:', audioFiles.length);

        if (!audioFiles.length) {
            ctx.state.metadataFileData = {};
            renderPreviewTable(ctx);
            return;
        }

        ctx.state._metadataAudioFiles = audioFiles;

        if (audioFiles.length <= METADATA_BATCH_SIZE) {
            loadMetadataBatch(ctx, audioFiles, 0, audioFiles.length);
            return;
        }

        getMetadataAlwaysLoadAllPref(ctx).then(function(alwaysLoadAll) {
            ctx.state._metadataAlwaysLoadAll = alwaysLoadAll;
            const initialLimit = Math.min(METADATA_BATCH_SIZE, audioFiles.length);
            loadMetadataBatch(ctx, audioFiles, 0, initialLimit);
        });
    }

    function renderPreviewTable(ctx) {
        const list = document.getElementById('metadata-preview-list');
        if (!list) return;

        const files = Object.keys(ctx.state.metadataFileData || {}).map(function(p) {
            return ctx.state.metadataFileData[p];
        }).filter(Boolean);

        const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata' && r.enabled; });

        let tableHtml = `<table class="metadata-table"><thead><tr><th class="metadata-col-select"><button type="button" id="metadata-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="${ctx.t('deselectAll')}" data-translation="deselectAll">${CHECK_SVG}</button></th><th class="metadata-col-audio" style="width:36px;pointer-events:none;"><span class="metadata-selection-counter" id="metadata-selection-counter"></span></th><th class="metadata-col-file metadata-sortable" data-sort-field="filename" data-translation="filename">` + ctx.escapeHtml(ctx.t('filename')) + SORT_ASC_SVG + '</th>';
        METADATA_FIELDS.forEach(function(field) {
            const key = 'metadata' + field.charAt(0).toUpperCase() + field.slice(1);
            tableHtml += '<th class="metadata-col-' + field + ' metadata-sortable" data-sort-field="' + field + '" data-translation="' + key + '">' + ctx.escapeHtml(ctx.t(key)) + SORT_ASC_SVG + '</th>';
        });
        tableHtml += '<th class="metadata-col-duration metadata-sortable" data-sort-field="duration" data-translation="metadataDuration">' + ctx.escapeHtml(ctx.t('metadataDuration')) + SORT_ASC_SVG + '</th>';
        tableHtml += '<th class="metadata-col-added_on metadata-sortable" data-sort-field="added_on" data-translation="metadataAddedOn">' + ctx.escapeHtml(ctx.t('metadataAddedOn')) + SORT_ASC_SVG + '</th>';
        tableHtml += '</tr></thead><tbody>';

        let hasRows = false;

        if (typeof RenamerNavigation !== 'undefined') {
            const currentPath = RenamerNavigation.getCurrentPath();

            if (!ctx.state.metadataSubfolders || ctx.state.metadataSubfoldersPath !== currentPath) {
                ctx.state.metadataSubfolders = null;
                ctx.state.metadataSubfoldersPath = currentPath;
                ctx.apiRequest(ctx.getBaseUrl() + '/api/files/list', {
                    method: 'POST',
                    body: JSON.stringify({ path: currentPath })
                }).then(function(body) {
                    if (body && body.success) {
                        ctx.state.metadataSubfolders = (body.folders || []).map(function(folderPath) {
                            const parts = folderPath.split('/').filter(Boolean);
                            return {
                                path: folderPath,
                                name: parts[parts.length - 1]
                            };
                        });
            renderPreviewTable(ctx);
            if (window.RenamerAudioPlayer) {
                window.RenamerAudioPlayer.updateMetadataPlayingState();
            }
                    }
                }).catch(function() {
                    console.warn('[MetadataTab] failed to load subfolders');
                });
            }

            if (ctx.state.metadataSubfolders && ctx.state.metadataSubfolders.length > 0) {
                ctx.state.metadataSubfolders.forEach(function(folder) {
                    tableHtml += '<tr class="metadata-preview-row navigation-subfolder-row" data-folder-path="' + ctx.escapeHtml(folder.path) + '">';
                    tableHtml += '<td class="metadata-col-select"></td>';
                    tableHtml += '<td class="metadata-col-audio" style="width:36px;text-align:center;padding:4px 2px;">' + FOLDER_SVG + '</td>';
                    tableHtml += '<td class="metadata-col-file" data-original-folder="' + ctx.escapeHtml(folder.name) + '"><span class="navigation-folder-name">' + ctx.escapeHtml(folder.name) + '</span></td>';
                    METADATA_FIELDS.forEach(function(field) {
                        tableHtml += '<td class="metadata-col-' + field + '"></td>';
                    });
                    tableHtml += '<td class="metadata-col-duration"></td>';
                    tableHtml += '<td class="metadata-col-added_on"></td>';
                    tableHtml += '</tr>';
                });
                hasRows = true;
            }
        }

        files.forEach(function(fileData, rowIndex) {
            const isUnhandled = !fileData.readable && !fileData.writable;
            const hasError = !!fileData.error;
            const meta = fileData.metadata || {};
            const baseName = fileData.path.replace(/^.*\//, '');
            const isSelected = ctx.state.metadataFileSelection.has(fileData.path) || ctx.state.metadataAllSelected;
            const audioSupported = window.RenamerAudioPlayer && window.RenamerAudioPlayer.isAudioFile(fileData.path) && (fileData.readable || fileData.writable);
            const _audioState = window.RenamerAudioPlayer ? window.RenamerAudioPlayer.getState() : { currentlyPlayingPath: null, playbackFailedPaths: new Set() };
            const isCurrentlyPlaying = _audioState.currentlyPlayingPath === fileData.path;

            const rowParity = rowIndex % 2 === 0 ? 'metadata-row-even' : 'metadata-row-odd';
            const rowUnchecked = !isSelected && fileData.writable && !isUnhandled;
            const rowClasses = rowParity + (rowUnchecked ? ' metadata-row-unchecked' : '') + (isCurrentlyPlaying ? ' metadata-row-playing' : '');

            const badgeBtn = fileData.writable ? '<button type="button" class="' + (isSelected ? 'renamer-badge renamer-badge-success renamer-badge-toggle metadata-row-toggle' : 'renamer-badge renamer-badge-deselected renamer-badge-toggle metadata-row-toggle') + '" data-path="' + ctx.escapeHtml(fileData.path) + '" title="' + ctx.t('selectOrDeselect') + '" data-translation="selectOrDeselect" draggable="false">' + (isSelected ? CHECK_SVG : UNCHECK_SVG) + '</button>' : '';
            tableHtml += '<tr class="metadata-preview-row ' + rowClasses + '" data-path="' + ctx.escapeHtml(fileData.path) + '">';
            
            tableHtml += '<td class="metadata-col-select" style="pointer-events:none;">' + badgeBtn + '</td>';

            if (audioSupported) {
                const playIcon = isCurrentlyPlaying ? PAUSE_SVG : PLAY_SVG;
                const playTitle = isCurrentlyPlaying ? (ctx.t('metadataPause') || 'Pause') : (ctx.t('metadataListen') || 'Écouter');
                const playingClass = isCurrentlyPlaying ? ' metadata-audio-playing' : '';
                const disabledClass = _audioState.playbackFailedPaths && _audioState.playbackFailedPaths.has(fileData.path) ? ' metadata-audio-play-btn-disabled' : '';
                const streamUrl = window.RenamerAudioPlayer ? window.RenamerAudioPlayer.getAudioStreamUrl(fileData.path) : '';
                const audioBtn = '<button type="button" class="metadata-audio-play-btn' + playingClass + disabledClass + '" data-path="' + ctx.escapeHtml(fileData.path) + '" data-stream-url="' + escapeHtmlAttr(streamUrl || '') + '" title="' + ctx.escapeHtml(playTitle) + '" data-translation="metadataListen" draggable="false" aria-label="' + ctx.escapeHtml(playTitle) + '">' + playIcon + '</button>';
                tableHtml += '<td class="metadata-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">' + audioBtn + '</td>';
            } else {
                console.log('[MetadataTab] no audio button for', fileData.path, 'readable=' + fileData.readable, 'writable=' + fileData.writable, 'isAudio=' + (window.RenamerAudioPlayer && window.RenamerAudioPlayer.isAudioFile(fileData.path)), 'error=' + (fileData.error || 'null'), 'diagnostic=' + JSON.stringify(fileData.diagnostic || null));
                tableHtml += '<td class="metadata-col-audio" style="width:36px;pointer-events:none;"></td>';
            }
            tableHtml += '<td class="metadata-col-file" data-original-filename="' + escapeHtmlAttr(baseName) + '"><p class="metadata-filename">' + ctx.escapeHtml(baseName) + '</p></td>';

            METADATA_FIELDS.forEach(function(field) {
                let value = meta[field] || '';
                const overrides = ctx.state.manualOverrides && ctx.state.manualOverrides[fileData.path];
                const hasOverride = overrides && overrides[field] !== undefined && overrides[field] !== null;
                if (hasOverride) {
                    value = overrides[field];
                }

                let displayHtml;
                if (isUnhandled) {
                    displayHtml = '<p class="metadata-value-' + field + '"><span class="metadata-unhandled-badge" data-translation="metadataUnsupportedType">' + ctx.escapeHtml(ctx.t('metadataUnsupportedType') || 'Non supporté') + '</span></p>';
                } else if (hasError && !hasOverride) {
                    displayHtml = '<p class="metadata-value-' + field + '"><span style="color:var(--nc-red);">' + ctx.escapeHtml(fileData.error) + '</span></p>';
                } else {
                    displayHtml = value ? '<p class="metadata-value-' + field + '">' + ctx.escapeHtml(value) + '</p>' : '<p class="metadata-value-' + field + '"><span style="opacity:0.4;">—</span></p>';
                }

                const isEditable = fileData.writable && !isUnhandled;
                const pencil = isEditable ?
                    '<button class="metadata-pencil-btn" data-path="' + ctx.escapeHtml(fileData.path) + '" data-field="' + field + '" title="' + ctx.t('edit') + '" data-translation="edit" draggable="false">' + EDIT_ICON_SVG + '</button>' : '';

                let tdClass = isEditable ? 'metadata-col-' + field + ' metadata-editable-cell' : 'metadata-col-' + field;
                if (hasOverride) {
                    tdClass += ' metadata-modified';
                }
                tableHtml += '<td class="' + tdClass + '" data-selectable="' + (isEditable ? 'true' : 'false') + '" data-original-html="' + escapeHtmlAttr(displayHtml) + '">' + displayHtml + pencil + '</td>';
            });

            const duration = (fileData.fileInfo && fileData.fileInfo.duration) || null;
            const durationText = duration !== null ? formatTime(duration) : '—';
            tableHtml += '<td class="metadata-col-duration"><span class="metadata-value-duration">' + ctx.escapeHtml(durationText) + '</span></td>';

            const addedOn = (fileData.fileInfo && fileData.fileInfo.added_on) || null;
            tableHtml += '<td class="metadata-col-added_on"><span class="metadata-value-added_on">' + ctx.escapeHtml(addedOn || '—') + '</span></td>';

            tableHtml += '</tr>';
        });

        if (!hasRows && files.length === 0) {
            list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(ctx.t('metadataNoAudio') || 'Aucun fichier audio') + '</div>';
            updateToggleAllButton(ctx);
            updateSaveButtonState(ctx);
            if (typeof RenamerNavigation !== 'undefined') {
                RenamerNavigation.renderBreadcrumb('metadata-breadcrumb');
            }
            return;
        }

        tableHtml += '</tbody></table>';
        list.innerHTML = tableHtml;

        updateToggleAllButton(ctx);
        updateSaveButtonState(ctx);
        if (typeof RenamerNavigation !== 'undefined') {
            RenamerNavigation.renderBreadcrumb('metadata-breadcrumb');
         }
        bindTableEvents(ctx, list);

        applySort(ctx);
        updateSortIcons(ctx);

        if (ctx.state.metadataSearchQuery) {
            const searchInput = document.getElementById('metadata-search');
            if (searchInput) searchInput.value = ctx.state.metadataSearchQuery;
            setTimeout(function() {
                handleSearch(ctx, ctx.state.metadataSearchQuery);
            }, 0);
        }
    }

    function renderPreview(ctx) {
        console.log('[MetadataTab] renderPreview called, __renamerAppClosed=', window.__renamerAppClosed, 'metadataFileData empty=', !ctx.state.metadataFileData || Object.keys(ctx.state.metadataFileData).length === 0);
        if (!ctx.state.navigation && typeof RenamerNavigation !== 'undefined') {
            RenamerNavigation.init(ctx);
        }
        if (window.RenamerAudioPlayer) {
            window.RenamerAudioPlayer.setup(ctx);
        }
        if (!ctx.state.metadataFileData || Object.keys(ctx.state.metadataFileData).length === 0) {
            console.log('[MetadataTab] renderPreview -> loadMetadata (empty or closed)');
            loadMetadata(ctx);
        } else {
            console.log('[MetadataTab] renderPreview -> renderPreviewTable (using cached data)');
            renderPreviewTable(ctx);
        }
        if (window.RenamerAudioPlayer) {
            window.RenamerAudioPlayer.updateMetadataPlayingState();
        }
    }

    function cleanupAudioState(ctx) {
        if (window.RenamerAudioPlayer) {
            window.RenamerAudioPlayer.stop();
        }
    }

    function bindTableEvents(ctx, list) {
        const toggleAllBtn = document.getElementById('metadata-toggle-all');
        if (toggleAllBtn && !toggleAllBtn._metadataBound) {
            toggleAllBtn._metadataBound = true;
            toggleAllBtn.addEventListener('click', function() {
                toggleSelection(ctx);
                updateSelectionCounter(ctx);
            });
            console.log('[MetadataTab] bound toggle-all button in table');
        }

        list.querySelectorAll('.navigation-subfolder-row').forEach(function(row) {
            if (row._subfolderBound) return;
            row._subfolderBound = true;
            const targetPath = row.dataset.folderPath;
            console.log('[MetadataTab] bind subfolder row', targetPath);
            row.addEventListener('click', function() {
                console.log('[MetadataTab] subfolder clicked', targetPath);
                if (targetPath && typeof RenamerNavigation !== 'undefined') {
                    ctx.state.metadataSubfolders = null;
                    ctx.state.metadataSubfoldersPath = null;
                    RenamerNavigation.navigateToFolder(targetPath);
                }
            });
        });

        list.querySelectorAll('.metadata-pencil-btn').forEach(function(btn) {
            if (btn._metadataBound) return;
            btn._metadataBound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const path = this.dataset.path;
                const field = this.dataset.field;
                showEditPopup(ctx, [path], field);
            });
        });

        list.querySelectorAll('.metadata-row-toggle').forEach(function(btn) {
            if (btn._metadataBound) return;
            btn._metadataBound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                const path = this.dataset.path;
                const row = this.closest('tr');
                console.log('[BADGE-CLICK] BEFORE', {
                    path: path,
                    allSelected: ctx.state.metadataAllSelected,
                    setSize: ctx.state.metadataFileSelection.size,
                    hasPath: ctx.state.metadataFileSelection.has(path),
                    filesLength: ctx.state.files.length,
                    filesContainsPath: ctx.state.files.indexOf(path) !== -1,
                    setHasPath: ctx.state.metadataFileSelection.has(path)
                });
                if (ctx.state.metadataAllSelected) {
                    console.log('[BADGE-CLICK] CONVERTING allSelected to set');
                    const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
                    const audioPaths = (ctx.state.files || []).filter(function(p) {
                        const ext = p.replace(/^.*\./, '').toLowerCase();
                        return audioExtensions.indexOf(ext) !== -1;
                    });
                    ctx.state.metadataFileSelection = new Set(audioPaths);
                    ctx.state.metadataAllSelected = false;
                    console.log('[BADGE-CLICK] AFTER convert: setSize=', ctx.state.metadataFileSelection.size, 'hasPath=', ctx.state.metadataFileSelection.has(path));
                }
                if (ctx.state.metadataFileSelection.has(path)) {
                    console.log('[BADGE-CLICK] DESELECTING');
                    ctx.state.metadataFileSelection.delete(path);
                    this.className = 'renamer-badge renamer-badge-deselected renamer-badge-toggle metadata-row-toggle';
                    this.innerHTML = UNCHECK_SVG;
                    this.title = 'Sélectionner';
                    if (row) row.classList.add('metadata-row-unchecked');
                } else {
                    console.log('[BADGE-CLICK] SELECTING');
                    ctx.state.metadataFileSelection.add(path);
                    this.className = 'renamer-badge renamer-badge-success renamer-badge-toggle metadata-row-toggle';
                    this.innerHTML = CHECK_SVG;
                    this.title = 'Désélectionner';
                    if (row) row.classList.remove('metadata-row-unchecked');
                }
                console.log('[BADGE-CLICK] AFTER', {
                    setSize: ctx.state.metadataFileSelection.size,
                    hasPath: ctx.state.metadataFileSelection.has(path),
                    className: this.className
                });
                updateToggleAllButton(ctx);
                updateSelectionCounter(ctx);
            });
        });

        list.querySelectorAll('.metadata-audio-play-btn').forEach(function(btn) {
            if (btn._metadataBound) return;
            btn._metadataBound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                const path = this.dataset.path;
                if (this.classList.contains('metadata-audio-play-btn-disabled')) {
                    const streamUrl = this.dataset.streamUrl || '';
                    if (window.RenamerAudioPlayer) {
                        window.RenamerAudioPlayer.showPlaybackError(ctx, path, streamUrl);
                    }
                    return;
                }
                if (!path) return;
                if (window.RenamerAudioPlayer) {
                    window.RenamerAudioPlayer.play(path, { ctx: ctx });
                }
            });
        });

        list.querySelectorAll('tr.metadata-preview-row').forEach(function(row) {
            if (row._ctxBound) return;
            row._ctxBound = true;
            const path = row.dataset.path;
            if (!path) return;
            row.addEventListener('contextmenu', function(e) {
                const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
                const ext = path.replace(/^.*\./, '').toLowerCase();
                if (audioExtensions.indexOf(ext) === -1) return;
                const fileData = ctx.state.metadataFileData && ctx.state.metadataFileData[path];
                if (!fileData || (!fileData.readable && !fileData.writable)) return;
                let ctxField = null;
                if (e.target) {
                    const td = e.target.closest && e.target.closest('td[data-selectable="true"]');
                    if (td) {
                        const match = (td.getAttribute('class') || '').match(/metadata-col-(\w+)/);
                        if (match) ctxField = match[1];
                    }
                }
                showAudioContextMenu(ctx, path, e, ctxField);
            });
            let longPressTimer = null;
            row.addEventListener('touchstart', function(e) {
                if (e.touches.length > 1) return;
                const touch = e.touches[0];
                longPressTimer = setTimeout(function() {
                    const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
                    const ext = path.replace(/^.*\./, '').toLowerCase();
                    if (audioExtensions.indexOf(ext) === -1) return;
                    const fileData = ctx.state.metadataFileData && ctx.state.metadataFileData[path];
                    if (!fileData || (!fileData.readable && !fileData.writable)) return;
                    const fakeEvent = {
                        preventDefault: function() {},
                        stopPropagation: function() {},
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    };
                    showAudioContextMenu(ctx, path, fakeEvent);
                }, 500);
            }, { passive: true });
            row.addEventListener('touchmove', function() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
            row.addEventListener('touchend', function() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
            row.addEventListener('touchcancel', function() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            });
        });

        list.querySelectorAll('td[data-selectable="true"]').forEach(function(cell) {
            if (cell._metadataBound) return;
            cell._metadataBound = true;
            cell.addEventListener('click', function(e) {
                if (e.target.classList.contains('metadata-pencil-btn')) return;
                const row = this.closest('tr');
                if (row.classList.contains('metadata-row-unchecked')) return;
                const path = row.dataset.path;
                const classes = this.getAttribute('class') || '';
                const fieldMatch = classes.match(/metadata-col-(\w+)/);
                if (!fieldMatch) return;
                const field = fieldMatch[1];
                showEditPopup(ctx, [path], field);
            });
        });

        list.querySelectorAll('th.metadata-sortable').forEach(function(th) {
            if (th._metadataSortBound) return;
            th._metadataSortBound = true;
            th.addEventListener('click', function() {
                const field = this.dataset.sortField;
                if (ctx.state.metadataSortField === field) {
                    ctx.state.metadataSortDirection = ctx.state.metadataSortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    ctx.state.metadataSortField = field;
                    ctx.state.metadataSortDirection = 'desc';
                }
                applySort(ctx);
                updateSortIcons(ctx);
            });
        });
    }

    const NUMERIC_SORT_FIELDS = ['year', 'track', 'duration'];

    function getSortValue(ctx, row, field) {
        const path = row.dataset.path;
        if (!path) return '';

        if (field === 'filename') {
            return path.replace(/^.*\//, '').toLowerCase();
        }

        const fileData = ctx.state.metadataFileData && ctx.state.metadataFileData[path];
        if (!fileData) return '';

        const overrides = ctx.state.manualOverrides && ctx.state.manualOverrides[path];

        if (METADATA_FIELDS.indexOf(field) !== -1) {
            if (overrides && overrides[field] !== undefined && overrides[field] !== null) {
                return String(overrides[field]);
            }
            const meta = fileData.metadata || {};
            return String(meta[field] || '');
        }

        if (field === 'duration') {
            const duration = (fileData.fileInfo && fileData.fileInfo.duration) || 0;
            return String(duration);
        }

        if (field === 'added_on') {
            return String((fileData.fileInfo && fileData.fileInfo.added_on) || '');
        }

        return '';
    }

    function applySort(ctx) {
        const field = ctx.state.metadataSortField;
        if (!field) return;

        const tbody = document.querySelector('#metadata-preview-list tbody');
        if (!tbody) return;

        const folderRows = [];
        const fileRows = [];

        tbody.querySelectorAll('tr.metadata-preview-row').forEach(function(row) {
            if (row.classList.contains('navigation-subfolder-row') || row.classList.contains('navigation-folder-row')) {
                folderRows.push(row);
            } else {
                fileRows.push(row);
            }
        });

        fileRows.sort(function(a, b) {
            let valA = getSortValue(ctx, a, field);
            let valB = getSortValue(ctx, b, field);

            if (NUMERIC_SORT_FIELDS.indexOf(field) !== -1) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
                if (isNaN(valA)) valA = 0;
                if (isNaN(valB)) valB = 0;
                return ctx.state.metadataSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            if (valA < valB) return ctx.state.metadataSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return ctx.state.metadataSortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        fileRows.forEach(function(row) {
            if (row.parentNode) {
                row.parentNode.removeChild(row);
            }
        });
        fileRows.forEach(function(row) {
            tbody.appendChild(row);
        });
    }

    function updateSortIcons(ctx) {
        const activeField = ctx.state.metadataSortField;
        const activeDirection = ctx.state.metadataSortDirection;

        document.querySelectorAll('th.metadata-sortable').forEach(function(th) {
            const icon = th.querySelector('.metadata-sort-icon');
            if (!icon) return;
            const field = th.dataset.sortField;
            if (field === activeField) {
                icon.classList.add('active');
                if (activeDirection === 'desc') {
                    icon.classList.add('desc');
                } else {
                    icon.classList.remove('desc');
                }
            } else {
                icon.classList.remove('active', 'desc');
            }
        });
    }

    function showEditPopup(ctx, paths, field) {
        const existing = document.getElementById('metadata-edit-popup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'metadata-edit-popup';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';

        const fieldLabel = ctx.t('metadata' + field.charAt(0).toUpperCase() + field.slice(1));
        const fieldKey = 'metadata' + field.charAt(0).toUpperCase() + field.slice(1);
        const currentValues = paths.map(function(p) {
            const overrides = ctx.state.manualOverrides && ctx.state.manualOverrides[p];
            if (overrides && overrides[field] !== undefined && overrides[field] !== null) {
                return overrides[field];
            }
            const data = ctx.state.metadataFileData && ctx.state.metadataFileData[p];
            return data && data.metadata ? (data.metadata[field] || '') : '';
        });

        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const allSelected = ctx.state.metadataAllSelected ? ctx.state.files : Array.from(ctx.state.metadataFileSelection);
        const selectedAudio = allSelected.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        const showApplyAll = paths.length === 1 && selectedAudio.length > 1;
        const applyAllBtn = showApplyAll ?
            '<button type="button" class="renamer-btn renamer-btn-primary" id="metadata-apply-all-col" data-translation="applyAllColumn">' + ctx.escapeHtml('Appliquer à toute la colonne') + '</button>' : '';

        const hasOverride = paths.some(function(p) {
            const overrides = ctx.state.manualOverrides && ctx.state.manualOverrides[p];
            return overrides && overrides[field] !== undefined && overrides[field] !== null;
        });
        const resetBtn = hasOverride ?
            '<button type="button" class="renamer-btn" data-action="reset-edit" data-translation="metadataReset">' + ctx.escapeHtml(ctx.t('metadataReset') || 'Réinitialiser') + '</button>' : '';

        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<button type="button" class="renamer-modal-close" aria-label="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" role="button" title="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" data-translation="close">×</button>' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3 data-translation="metadataManualEditTitle">' + ctx.escapeHtml(ctx.t('metadataManualEditTitle') || 'Modifier') + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;" data-translation="editApplyTo">Appliquer cette valeur à <strong>' + paths.length + ' fichier(s)</strong> pour le champ <strong>' + ctx.escapeHtml(fieldLabel) + '</strong> :</div>' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<label style="min-width:80px;font-weight:500;text-align:right;" data-translation="' + fieldKey + '">' + ctx.escapeHtml(fieldLabel) + '</label>' +
                '<input type="text" id="metadata-edit-input" value="' + ctx.escapeHtml(currentValues[0] || '') + '" style="flex:1;padding:6px 10px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);" />' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                resetBtn +
                '<button type="button" class="renamer-btn" data-action="cancel-edit" data-translation="cancel">' + ctx.escapeHtml(ctx.t('cancel') || 'Annuler') + '</button>' +
                applyAllBtn +
                '<button type="button" class="renamer-btn renamer-btn-primary" data-action="save-edit" data-translation="metadataApply">' + ctx.escapeHtml(ctx.t('metadataApply') || 'Appliquer') + '</button>' +
            '</div>' +
        '</div></div>';

        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector('.renamer-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                overlay.remove();
            });
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });

        const input = overlay.querySelector('#metadata-edit-input');
        if (input) {
            input.focus();
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const saveBtn = overlay.querySelector('[data-action="save-edit"]');
                    if (saveBtn) saveBtn.click();
                }
            });
        }

        const handleEsc = function(e) {
            if (e.key === 'Escape') {
                e.stopImmediatePropagation();
                overlay.remove();
                document.removeEventListener('keydown', handleEsc, true);
            }
        };
        document.addEventListener('keydown', handleEsc, true);

        overlay.querySelector('[data-action="cancel-edit"]').addEventListener('click', function() {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc, true);
        });

        overlay.querySelector('[data-action="save-edit"]').addEventListener('click', function() {
            const input = overlay.querySelector('#metadata-edit-input');
            const newValue = input.value;
            paths.forEach(function(p) {
                if (!ctx.state.manualOverrides[p]) ctx.state.manualOverrides[p] = {};
                ctx.state.manualOverrides[p][field] = newValue;
            });

            overlay.remove();

            renderPreviewTable(ctx);
        });

        const applyAllBtnEl = overlay.querySelector('#metadata-apply-all-col');
        if (applyAllBtnEl) {
            applyAllBtnEl.addEventListener('click', function() {
                const input = overlay.querySelector('#metadata-edit-input');
                const newValue = input.value;
                const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
                Object.keys(ctx.state.metadataFileData || {}).forEach(function(p) {
                    const ext = p.replace(/^.*\./, '').toLowerCase();
                    if (audioExtensions.indexOf(ext) !== -1) {
                        if (!ctx.state.manualOverrides[p]) ctx.state.manualOverrides[p] = {};
                        ctx.state.manualOverrides[p][field] = newValue;
                    }
                });

                overlay.remove();

                renderPreviewTable(ctx);
            });
        }

        const resetBtnEl = overlay.querySelector('[data-action="reset-edit"]');
        if (resetBtnEl) {
            resetBtnEl.addEventListener('click', function() {
                paths.forEach(function(p) {
                    if (ctx.state.manualOverrides[p]) {
                        delete ctx.state.manualOverrides[p][field];
                        if (Object.keys(ctx.state.manualOverrides[p]).length === 0) {
                            delete ctx.state.manualOverrides[p];
                        }
                    }
                });

                overlay.remove();

                renderPreviewTable(ctx);
            });
        }
    }

    function toggleSelection(ctx) {
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = ctx.state.files.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        if (ctx.state.metadataAllSelected) {
            ctx.state.metadataFileSelection = new Set();
            ctx.state.metadataAllSelected = false;
        } else {
            ctx.state.metadataFileSelection = new Set(audioFiles);
            ctx.state.metadataAllSelected = true;
        }

        const allOn = ctx.state.metadataAllSelected;
        const listEl = document.getElementById('metadata-preview-list');
        if (listEl) {
            listEl.querySelectorAll('.metadata-row-toggle').forEach(function(btn) {
                const path = btn.dataset.path;
                const isSelected = allOn || ctx.state.metadataFileSelection.has(path);
                if (isSelected) {
                    btn.className = 'renamer-badge renamer-badge-success renamer-badge-toggle metadata-row-toggle';
                    btn.innerHTML = CHECK_SVG;
                    btn.title = 'Désélectionner';
                } else {
                    btn.className = 'renamer-badge renamer-badge-deselected renamer-badge-toggle metadata-row-toggle';
                    btn.innerHTML = UNCHECK_SVG;
                    btn.title = 'Sélectionner';
                }
                const row = btn.closest('tr');
                if (row) {
                    if (isSelected) {
                        row.classList.remove('metadata-row-unchecked');
                    } else {
                        row.classList.add('metadata-row-unchecked');
                    }
                }
            });
        }

        updateToggleAllButton(ctx);
        updateSaveButtonState(ctx);
    }

    function updateToggleAllButton(ctx) {
        const btn = document.getElementById('metadata-toggle-all');
        if (!btn) return;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = ctx.state.files.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });
        const allOn = ctx.state.metadataAllSelected || ctx.state.metadataFileSelection.size >= audioFiles.length;
        btn.className = allOn ? 'renamer-badge renamer-badge-success renamer-badge-toggle' : 'renamer-badge renamer-badge-deselected renamer-badge-toggle';
        btn.innerHTML = allOn ? CHECK_SVG : UNCHECK_SVG;
        btn.title = allOn ? 'Désélectionner Tout' : 'Sélectionner Tout';
    }

    function hasChanges(ctx) {
        const overrides = ctx.state.manualOverrides;
        if (!overrides) return false;
        return Object.keys(overrides).some(function(path) {
            const changes = overrides[path];
            return changes && Object.keys(changes).length > 0;
        });
    }

    function updateSaveButtonState(ctx) {
        const saveBtn = document.getElementById('metadata-save-btn');
        if (!saveBtn) return;
        const enabled = hasChanges(ctx);
        if (enabled) {
            saveBtn.classList.add('visible');
        } else {
            saveBtn.classList.remove('visible');
        }
        updateSelectionCounter(ctx);
    }

    function updateSelectionCounter(ctx) {
        const counter = document.getElementById('metadata-selection-counter');
        if (!counter) return;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = (ctx.state.files || []).filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });
        const total = audioFiles.length;
        const selected = ctx.state.metadataAllSelected ? total : ctx.state.metadataFileSelection.size;
        const loaded = Object.keys(ctx.state.metadataFileData || {}).length;
        counter.textContent = selected + ' / ' + total + ' (' + loaded + ' loaded)';
    }

    function handleApply(ctx) {
        if (!hasChanges(ctx)) {
            return;
        }

        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const selectedFiles = (ctx.state.metadataAllSelected ? ctx.state.files : Array.from(ctx.state.metadataFileSelection)).filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        if (!selectedFiles.length) {
            ctx.showToast(ctx.t('noFilesSelected') || 'Aucun fichier sélectionné', 'error');
            return;
        }

        const pathsToWrite = [];
        const overridesToSend = {};

        Object.keys(ctx.state.manualOverrides || {}).forEach(function(path) {
            if (selectedFiles.indexOf(path) !== -1 && Object.keys(ctx.state.manualOverrides[path]).length > 0) {
                pathsToWrite.push(path);
                overridesToSend[path] = ctx.state.manualOverrides[path];
            }
        });

        if (!pathsToWrite.length) {
            ctx.showToast(ctx.t('metadataNoChanges') || 'Aucune modification à appliquer', 'info');
            return;
        }

        executeWrite(ctx, pathsToWrite, overridesToSend);
    }

    function executeWrite(ctx, paths, manualOverrides) {
        const modal = document.getElementById('renamer-modal');
        let writeTimerInterval = null;
        if (modal) {
            modal.classList.add('renamer-loading');
            const loader = document.createElement('div');
            loader.id = 'renamer-loader';
            loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:50;font-size:16px;font-weight:bold;color:var(--reader-accent);';
            const startTime = Date.now();
            const timerLabel = ctx.t('loadingElapsed') || 'Écoulé';
            loader.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;font-family:monospace;">' +
                '<div id="renamer-loader-text">' + (ctx.t('convertInProgress') || 'Application en cours...') + '</div>' +
                '<div id="renamer-loader-timer" style="font-size:13px;font-weight:normal;opacity:0.7;font-family:monospace;font-variant-numeric:tabular-nums;">' +
                '<span style="opacity:0.5;">' + ctx.escapeHtml(timerLabel) + '</span> <span>00:00</span>' +
                '</div></div>';
            loader.setAttribute('data-translation', 'convertInProgress');
            modal.appendChild(loader);
            const timerEl = loader.querySelector('#renamer-loader-timer span:last-child');
            if (timerEl) timerEl.textContent = formatElapsedTime(0);
            writeTimerInterval = setInterval(function() {
                const te = document.getElementById('renamer-loader-timer');
                if (te) {
                    const tv = te.querySelector('span:last-child');
                    if (tv) tv.textContent = formatElapsedTime(Date.now() - startTime);
                }
            }, 1000);
        }

        const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata' && r.enabled; });

        const payload = {
            paths: paths,
            rules: metadataRules,
            manualOverrides: manualOverrides,
        };

        ctx.apiRequest(ctx.getBaseUrl() + '/api/metadata/write', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then(function(body) {
            if (writeTimerInterval) clearInterval(writeTimerInterval);
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }

            if (body && body.success) {
                ctx.state.manualOverrides = {};
                ctx.state.metadataFileData = {};
                const updatedCount = (body.updated || []).length;
                const errorsCount = (body.errors || []).length;
                const skippedCount = (body.skipped || []).length;

                if (updatedCount > 0) {
                    ctx.showToast((ctx.t('metadataWriteSuccess') || 'Métadonnées mises à jour') + ' : ' + updatedCount, 'success');
                }
                if (errorsCount > 0) {
                    ctx.showToast((ctx.t('metadataWriteError') || 'Erreurs') + ' : ' + errorsCount + ' — ' + (body.errors || []).join(' ; '), 'error');
                }
                if (skippedCount > 0) {
                    ctx.showToast((ctx.t('metadataSkipped') || 'Ignorés') + ' : ' + skippedCount, 'info');
                }

                loadMetadata(ctx);
            } else {
                ctx.showToast('Erreur: ' + (body.error || 'Réponse inattendue'), 'error');
            }
        }).catch(function(err) {
            if (writeTimerInterval) clearInterval(writeTimerInterval);
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            ctx.showToast('Erreur: ' + err.message, 'error');
        });
    }

    function register() {
        if (typeof RenamerApp === 'undefined' || !RenamerApp.registerTab) {
            console.log('[MetadataTab] RenamerApp not ready, retrying...');
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', register);
            } else {
                setTimeout(register, 50);
            }
            return;
        }
        console.log('[MetadataTab] registering tab', TAB_ID, { client: true });
        RenamerApp.registerTab(TAB_ID, {
            id: TAB_ID,
            labelKey: 'metadataTab',
            icon: window.RenamerIcons.MUSIC_NOTE,
            build: build,
            bind: bind,
            render: render,
        });
        console.log('[MetadataTab] tab registered, tabs:', Object.keys(RenamerApp.tabs || {}), { client: true });
    }

    register();
})();