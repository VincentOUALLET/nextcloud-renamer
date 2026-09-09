(function() {
    'use strict';

    console.log('[MetadataTab] module loaded');
    const TAB_ID = 'metadata';

    const METADATA_FIELDS = ['artist', 'title', 'album', 'track', 'year', 'genre'];
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
                background: var(--nc-blue);
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
                display: flex;
                align-items: center;
                font-weight: 500;
                text-align: left;
                pointer-events: none;
            }
            .metadata-col-file .metadata-filename {
                pointer-events: auto;
                padding: 15px 0px; /* SHAMING FIX : I did not succeed centering that one vertically... */
            }
            .metadata-col-select {
                text-align: center;
                vertical-align: middle;
                width: 44px;
                pointer-events: none;
                padding-left: 7px !important; /* SHAMING FIX : I did not succeed without the important but I'll get back to it later, cause it's getting late... */
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
                color: var(--nc-blue);
                border-color: var(--nc-blue);
                background: rgba(0, 120, 212, 0.08);
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
            .metadata-table-container {
                overflow-y: auto;
                flex: 1;
            }
            .renamer-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px;
            }
            .renamer-btn {
                padding: 8px 16px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: var(--nc-radius);
                cursor: pointer;
            }
            .renamer-btn-primary {
                background: var(--nc-button-primary);
                color: var(--nc-button-primary-text);
                border-color: var(--nc-button-primary);
            }
            .renamer-btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
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
            td.foundSearch {
                background-color: #def3de;
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
            .renamer-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .renamer-modal {
                background: var(--nc-bg);
                border-radius: var(--nc-radius);
                padding: 20px;
                max-width: 520px;
                width: 90%;
                max-height: 80svh;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                position: relative;
            }
            .renamer-modal-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 4px;
                opacity: 0.5;
            }
            .renamer-modal-close:hover {
                opacity: 1;
            }
            .metadata-selection-counter {
                margin-left: 8px;
                margin-right: auto;
                font-size: 13px;
                color: var(--nc-text-muted);
            }
            #metadata-audio-widget {
                position: fixed;
                left: 16px;
                bottom: 16px;
                width: 320px;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 6px 20px rgba(0,0,0,0.18);
                z-index: 10020;
                display: none;
                flex-direction: column;
                gap: 6px;
                padding: 8px;
                font-size: 12px;
                color: var(--nc-text);
                user-select: none;
            }
            #metadata-audio-widget.visible {
                display: flex;
            }
            #metadata-audio-widget .metadata-audio-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #metadata-audio-widget .metadata-audio-title {
                width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                background: var(--nc-border);
                padding: 5px 10px;
                border-radius: 3px;
            }
            #metadata-audio-widget .metadata-audio-title-inner {
                display: inline-block;
                white-space: nowrap;
            }
            @keyframes scrollTitle {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
            }
            #metadata-audio-widget.playing .metadata-audio-title-inner {
                animation: scrollTitle 6s linear infinite;
            }
            #metadata-audio-widget .metadata-audio-progress-row {
                width: 100%;
            }
            #metadata-audio-widget .metadata-audio-progress {
                width: 100%;
                height: 6px;
            }
            #metadata-audio-widget .metadata-audio-time-row {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: var(--nc-text-muted);
                font-variant-numeric: tabular-nums;
            }
            #metadata-audio-widget .metadata-audio-time-current,
            #metadata-audio-widget .metadata-audio-time-total {
                min-width: 42px;
                text-align: right;
            }
            #metadata-audio-widget .metadata-audio-time-current {
                text-align: left;
            }
            #metadata-audio-widget .metadata-audio-volume {
                width: 50px;
            }
            #metadata-audio-widget .metadata-audio-controls {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                margin-left: auto;
            }
            #metadata-audio-widget .metadata-audio-close {
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 2px;
                opacity: 0.7;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--nc-radius);
            }
            #metadata-audio-widget .metadata-audio-close:hover {
                opacity: 1;
                background: var(--nc-bg-hover);
            }
            #metadata-audio-widget .metadata-audio-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--nc-radius);
                color: var(--nc-text);
            }
            #metadata-audio-widget .metadata-audio-btn:hover {
                background: var(--nc-bg-hover);
            }
            #metadata-audio-widget.playing .metadata-audio-play {
                color: var(--nc-blue);
            }
            #metadata-audio-widget .metadata-audio-drag-handle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 2px;
                cursor: grab;
                opacity: 0.6;
                color: var(--nc-text-muted);
            }
            #metadata-audio-widget .metadata-audio-drag-handle:hover {
                opacity: 1;
                color: var(--nc-text);
            }
            #metadata-audio-widget .metadata-audio-drag-handle:active {
                cursor: grabbing;
            }
            .metadata-table th.metadata-col-duration,
            .metadata-table th.metadata-col-added_on,
            .metadata-table td.metadata-col-duration,
            .metadata-table td.metadata-col-added_on {
                white-space: nowrap;
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
    const DRAG_HANDLE_SVG = window.RenamerIcons.DRAG;

    const AUDIO_EXTENSIONS = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
    const AUDIO_MIME_MAP = {
        'mp3': 'audio/mpeg',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'opus': 'audio/ogg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4'
    };
    let currentlyPlayingPath = null;
    let audioWidgetEl = null;
    let widgetAudioEl = null;
    let widgetDragState = null;
    let lastCtx = null;
    let audioOriginPath = null;
    let audioState = 'idle'; // idle | playing | paused
    let audioDuration = 0;
    let playbackFailedPaths = new Set();

    function isAudioFile(path) {
        const ext = path.replace(/^.*\./, '').toLowerCase();
        return AUDIO_EXTENSIONS.indexOf(ext) !== -1;
    }

    function getAudioMime(path) {
        const ext = path.replace(/^.*\./, '').toLowerCase();
        return AUDIO_MIME_MAP[ext] || 'audio/mpeg';
    }

    function getAudioStreamUrl(path) {
        const base = window.location.origin;
        let userId = '';
        if (typeof OC !== 'undefined') {
            if (typeof OC.getCurrentUser === 'function') {
                const user = OC.getCurrentUser();
                userId = (user && user.uid) ? user.uid : '';
            }
            if (!userId && typeof OC.getUserId === 'function') {
                userId = OC.getUserId() || '';
            }
        }
        if (!userId) {
            return null;
        }
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        const url = base + '/remote.php/dav/files/' + userId + '/' + encodedPath;
        console.log('[MetadataTab] getAudioStreamUrl path=', path, 'url=', url);
        return url;
    }

    function ensureAudioWidget() {
        if (audioWidgetEl && widgetAudioEl) return;
        audioWidgetEl = document.createElement('div');
        audioWidgetEl.id = 'metadata-audio-widget';
        audioWidgetEl.innerHTML = '<div class="metadata-audio-row">' +
            '<span class="metadata-audio-drag-handle" title="' + escapeHtml('Déplacer') + '" data-translation="dragToReorder">' + DRAG_HANDLE_SVG + '</span>' +
            '<button type="button" class="metadata-audio-btn metadata-audio-play" title="' + escapeHtml('Écouter') + '" data-translation="metadataListen">' + PLAY_SVG + '</button>' +
            '<div class="metadata-audio-title"><span class="metadata-audio-title-inner"></span></div>' +
            '<input type="range" class="metadata-audio-volume" min="0" max="1" step="0.01" value="1" title="' + escapeHtml('Volume') + '" data-translation="volume" />' +
            '<button type="button" class="metadata-audio-btn metadata-audio-close" title="' + escapeHtml('Fermer') + '" data-translation="close">×</button>' +
            '</div>' +
            '<div class="metadata-audio-progress-row"><input type="range" class="metadata-audio-progress" min="0" max="1000" value="0" title="00:00" /></div>' +
            '<div class="metadata-audio-time-row"><span class="metadata-audio-time-current">00:00</span><span class="metadata-audio-time-total">00:00</span></div>';
        document.body.appendChild(audioWidgetEl);
        widgetAudioEl = document.createElement('audio');
        widgetAudioEl.style.display = 'none';
        widgetAudioEl.preload = 'none';
        document.body.appendChild(widgetAudioEl);

        const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
        const closeBtn = audioWidgetEl.querySelector('.metadata-audio-close');
        const volumeInput = audioWidgetEl.querySelector('.metadata-audio-volume');
        const progressInput = audioWidgetEl.querySelector('.metadata-audio-progress');
        let seeking = false;

        if (playBtn) {
            playBtn.addEventListener('click', function() {
                if (audioState === 'playing') {
                    widgetAudioEl.pause();
                    audioState = 'paused';
                    playBtn.innerHTML = PLAY_SVG;
                    audioWidgetEl.classList.remove('playing');
                } else if (audioState === 'paused') {
                    widgetAudioEl.play();
                    audioState = 'playing';
                    playBtn.innerHTML = PAUSE_SVG;
                    audioWidgetEl.classList.add('playing');
                } else {
                    if (audioWidgetEl.dataset.path) {
                        playAudioFileByWidget(audioWidgetEl.dataset.path);
                    }
                }
            });
        }

        if (volumeInput) {
            volumeInput.addEventListener('input', function() {
                if (widgetAudioEl) {
                    widgetAudioEl.volume = parseFloat(this.value);
                }
            });
        }

        if (progressInput) {
            progressInput.addEventListener('input', function() {
                seeking = true;
                const pct = parseFloat(this.value);
                const title = progressInput.getAttribute('title') || '';
                progressInput.setAttribute('title', title);
            });
            progressInput.addEventListener('change', function() {
                if (!widgetAudioEl || !audioDuration) return;
                const pct = parseFloat(this.value);
                const time = (pct / 1000) * audioDuration;
                widgetAudioEl.currentTime = time;
                seeking = false;
                updateTimeDisplay();
            });
        }

        widgetAudioEl.addEventListener('timeupdate', function() {
            if (!widgetAudioEl.duration) return;
            audioDuration = widgetAudioEl.duration;
            if (!progressInput || seeking) return;
            const pct = (widgetAudioEl.currentTime / audioDuration) * 1000;
            progressInput.value = pct;
            updateTimeDisplay();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                stopAudioPlayback();
                audioWidgetEl.classList.remove('visible');
                audioWidgetEl.classList.remove('playing');
                audioWidgetEl.dataset.path = '';
                audioOriginPath = null;
                updateAudioButtonStates();
            });
        }
        makeWidgetDraggable(audioWidgetEl);
    }

    function makeWidgetDraggable(widget) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        const handle = widget.querySelector('.metadata-audio-drag-handle') || widget;

        function getClientCoords(e) {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            if (e.changedTouches && e.changedTouches.length > 0) {
                return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        }

        function onStart(e) {
            if (e.target.closest('button')) return;
            isDragging = true;
            const coords = getClientCoords(e);
            startX = coords.x;
            startY = coords.y;
            const rect = widget.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
            e.preventDefault();
        }

        function onMove(e) {
            if (!isDragging) return;
            const coords = getClientCoords(e);
            const dx = coords.x - startX;
            const dy = coords.y - startY;
            const width = widget.offsetWidth || 280;
            const height = widget.offsetHeight || 100;
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;
            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft + width > window.innerWidth) newLeft = window.innerWidth - width;
            if (newTop + height > window.innerHeight) newTop = window.innerHeight - height;
            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
            e.preventDefault();
        }

        function onEnd() {
            isDragging = false;
        }

        handle.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);

        handle.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    function playAudioFileByWidget(path) {
        console.log('[MetadataTab] playAudioFileByWidget ENTRY path=' + path);
        stopAudioPlayback();
        const streamUrl = getAudioStreamUrl(path);
        console.log('[MetadataTab] playAudioFileByWidget streamUrl=' + streamUrl);
        if (!streamUrl) {
            console.warn('[MetadataTab] Cannot build audio stream URL: user ID not available');
            if (lastCtx && lastCtx.showToast) {
                lastCtx.showToast(lastCtx.t('metadataPlaybackError') || 'Erreur de lecture audio', 'error');
            }
            return;
        }
        ensureAudioWidget();
        widgetAudioEl._attemptedPath = path;
        widgetAudioEl._playbackErrorHandled = false;
        widgetAudioEl.src = streamUrl;
        widgetAudioEl.load();
        console.log('[MetadataTab] playAudioFileByWidget src set, trying play...');
        const playPromise = widgetAudioEl.play();
        if (playPromise !== undefined) {
            playPromise.then(function() {
                console.log('[MetadataTab] playAudioFileByWidget play SUCCESS');
                currentlyPlayingPath = path;
                audioOriginPath = path;
                audioState = 'playing';
                audioWidgetEl.dataset.path = path;
                widgetAudioEl._playbackErrorHandled = false;
                const titleEl = audioWidgetEl.querySelector('.metadata-audio-title');
                const innerEl = audioWidgetEl.querySelector('.metadata-audio-title-inner');
                if (titleEl) titleEl.title = path.replace(/^.*\//, '');
                if (innerEl) {
                    const baseName = path.replace(/^.*\//, '');
                    const fileData = (lastCtx && lastCtx.state && lastCtx.state.metadataFileData) ? lastCtx.state.metadataFileData[path] : null;
                    const meta = fileData && fileData.metadata ? fileData.metadata : {};
                    const artist = (meta.artist || '').trim();
                    const title = (meta.title || '').trim();
                    let displayText = baseName;
                    if (artist || title) {
                        displayText = [artist, title].filter(Boolean).join(' - ');
                    }
                    innerEl.textContent = displayText + ' =========== ' + displayText;
                }
                audioWidgetEl.classList.add('visible', 'playing');
                const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
                if (playBtn) playBtn.innerHTML = PAUSE_SVG;
                updateAudioButtonStates();
            }).catch(function(err) {
                console.warn('[MetadataTab] Audio playback failed:', err);
                if (!widgetAudioEl._playbackErrorHandled) {
                    widgetAudioEl._playbackErrorHandled = true;
                    diagnoseAudioPlayback(path, streamUrl, err);
                    showPlaybackErrorToast(ctx, path, streamUrl);
                }
            });
        }
        widgetAudioEl.onended = function() {
            console.log('[MetadataTab] widgetAudioEl onended');
            currentlyPlayingPath = null;
            audioOriginPath = null;
            audioState = 'idle';
            audioWidgetEl.classList.remove('playing');
            audioWidgetEl.dataset.path = '';
            widgetAudioEl._attemptedPath = null;
            widgetAudioEl._playbackErrorHandled = false;
            const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
            if (playBtn) playBtn.innerHTML = PLAY_SVG;
            const progressInput = audioWidgetEl.querySelector('.metadata-audio-progress');
            if (progressInput) {
                progressInput.value = 0;
                progressInput.setAttribute('title', '00:00 / 00:00');
            }
            const innerEl = audioWidgetEl.querySelector('.metadata-audio-title-inner');
            if (innerEl) innerEl.textContent = '';
            const currentEl = audioWidgetEl.querySelector('.metadata-audio-time-current');
            const totalEl = audioWidgetEl.querySelector('.metadata-audio-time-total');
            if (currentEl) currentEl.textContent = '00:00';
            if (totalEl) totalEl.textContent = '00:00';
            updateAudioButtonStates();
        };
        widgetAudioEl.onpause = function() {
            console.log('[MetadataTab] widgetAudioEl onpause');
            if (audioState === 'playing') {
                audioState = 'paused';
                const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
                if (playBtn) playBtn.innerHTML = PLAY_SVG;
                audioWidgetEl.classList.remove('playing');
                updateAudioButtonStates();
            }
        };
        widgetAudioEl.onerror = function(e) {
            console.warn('[MetadataTab] widgetAudioEl onerror', e);
            const attemptedPath = widgetAudioEl._attemptedPath;
            if (attemptedPath) {
                playbackFailedPaths.add(attemptedPath);
                const escapedPath = attemptedPath.replace(/'/g, "\\'");
                const btn = document.querySelector('.metadata-audio-play-btn[data-path=\'' + escapedPath + '\']');
                if (btn) {
                    btn.classList.add('metadata-audio-play-btn-disabled');
                    btn.title = (lastCtx && lastCtx.t ? lastCtx.t('metadataUnsupportedPlayback') : 'Format non supporté') || 'Format non supporté';
                }
                widgetAudioEl._attemptedPath = null;
            }
            if (!widgetAudioEl._playbackErrorHandled) {
                widgetAudioEl._playbackErrorHandled = true;
                showPlaybackErrorToast(ctx, attemptedPath || path, streamUrl);
            }
        };
        console.log('[MetadataTab] playAudioFileByWidget EXIT');
    }

    function diagnoseAudioPlayback(path, streamUrl, error) {
        console.log('[MetadataTab] diagnoseAudioPlayback START path=' + path, 'error=', error && error.message, 'name=', error && error.name);
        if (!streamUrl) {
            console.warn('[MetadataTab] diagnoseAudioPlayback: no streamUrl');
            return;
        }
        if (typeof fetch === 'undefined') {
            console.warn('[MetadataTab] diagnoseAudioPlayback: fetch unavailable');
            return;
        }
        fetch(streamUrl, { method: 'GET', credentials: 'same-origin', headers: { 'Accept': 'audio/*,*/*' } })
            .then(function(response) {
                console.log('[MetadataTab] diagnoseAudioPlayback fetch status=', response.status, 'statusText=', response.statusText, 'contentType=', response.headers.get('content-type'));
                const textPreview = response.text().then(function(text) {
                    console.log('[MetadataTab] diagnoseAudioPlayback response body preview=', text ? String(text).substring(0, 200) : '(empty)');
                }).catch(function() {
                    console.log('[MetadataTab] diagnoseAudioPlayback response body preview unavailable');
                });
            })
            .catch(function(err) {
                console.warn('[MetadataTab] diagnoseAudioPlayback fetch network error:', err);
            });
    }

    function showPlaybackErrorToast(ctx, path, streamUrl) {
        const baseName = path ? path.replace(/^.*\//, '') : '';
        const message = ctx.t('metadataUnsupportedPlayback') || 'Ce format n\'est pas lisible dans Renamer.';

        const overlay = document.createElement('div');
        overlay.id = 'metadata-playback-error-popup';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';

        const musicUrl = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('apps/music/') : (window.location.origin + '/apps/music/');
        const hasMusicApp = document.querySelector('[href*="/apps/music/"], a[href*="music"]') !== null;

        let actionsHtml = '';
        if (hasMusicApp) {
            actionsHtml += '<a type="button" class="renamer-btn" href="' + musicUrl + '" target="_blank" data-translation="metadataOpenMusic">' + ctx.escapeHtml(ctx.t('metadataOpenMusic') || 'Écouter dans Music') + '</a>';
        }
        actionsHtml += '<button type="button" class="renamer-btn" data-action="close-playback-error" data-translation="close">' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '</button>';

        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<button type="button" class="renamer-modal-close" aria-label="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" role="button" title="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" data-translation="close">×</button>' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3 data-translation="metadataPlaybackErrorTitle">' + ctx.escapeHtml(ctx.t('metadataPlaybackErrorTitle') || 'Erreur de lecture') + '</h3></div>' +
            '<p style="font-size:14px;color:var(--nc-text);line-height:1.4;">' + ctx.escapeHtml(message) + '</p>' +
            (baseName ? '<p style="font-size:13px;color:var(--nc-text-muted);word-break:break-all;">' + ctx.escapeHtml(baseName) + '</p>' : '') +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' + actionsHtml + '</div>' +
        '</div>';

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

        overlay.querySelectorAll('[data-action="close-playback-error"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                overlay.remove();
            });
        });
    }

    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const mm = (m < 10 ? '0' : '') + m;
        const ss = (s < 10 ? '0' : '') + s;
        return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
    }

    function updateTimeDisplay() {
        if (!widgetAudioEl || !audioWidgetEl) return;
        const currentEl = audioWidgetEl.querySelector('.metadata-audio-time-current');
        const totalEl = audioWidgetEl.querySelector('.metadata-audio-time-total');
        const current = widgetAudioEl.currentTime || 0;
        const total = widgetAudioEl.duration || 0;
        if (currentEl) currentEl.textContent = formatTime(current);
        if (totalEl) totalEl.textContent = formatTime(total);
    }

    function stopAudioPlayback() {
        if (widgetAudioEl) {
            widgetAudioEl.pause();
            widgetAudioEl.removeAttribute('src');
            widgetAudioEl.load();
        }
        currentlyPlayingPath = null;
        audioOriginPath = null;
        audioState = 'idle';
        if (audioWidgetEl) {
            audioWidgetEl.classList.remove('playing');
            audioWidgetEl.dataset.path = '';
            const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
            if (playBtn) playBtn.innerHTML = PLAY_SVG;
            const progressInput = audioWidgetEl.querySelector('.metadata-audio-progress');
            if (progressInput) {
                progressInput.value = 0;
                progressInput.setAttribute('title', '00:00 / 00:00');
            }
            const innerEl = audioWidgetEl.querySelector('.metadata-audio-title-inner');
            if (innerEl) innerEl.textContent = '';
            const currentEl = audioWidgetEl.querySelector('.metadata-audio-time-current');
            const totalEl = audioWidgetEl.querySelector('.metadata-audio-time-total');
            if (currentEl) currentEl.textContent = '00:00';
            if (totalEl) totalEl.textContent = '00:00';
        }
    }

    function updateAudioButtonStates() {
        console.log('[MetadataTab] updateAudioButtonStates currentlyPlayingPath=', currentlyPlayingPath, 'audioState=', audioState);
        document.querySelectorAll('.metadata-audio-play-btn').forEach(function(btn) {
            const path = btn.dataset.path;
            if (path === currentlyPlayingPath) {
                btn.innerHTML = PAUSE_SVG;
                btn.title = (lastCtx && lastCtx.t ? lastCtx.t('metadataPause') : 'Pause') || 'Pause';
                btn.classList.add('metadata-audio-playing');
            } else {
                btn.innerHTML = PLAY_SVG;
                btn.title = (lastCtx && lastCtx.t ? lastCtx.t('metadataListen') : 'Écouter') || 'Écouter';
                btn.classList.remove('metadata-audio-playing');
            }
        });
    }

    function playAudioFile(ctx, path) {
        console.log('[MetadataTab] playAudioFile ENTRY ctx.t=', typeof ctx.t, 'path=', path);
        lastCtx = ctx;
        ensureAudioWidget();
        if (currentlyPlayingPath === path && audioState === 'paused') {
            console.log('[MetadataTab] playAudioFile RESUMING paused playback for', path);
            widgetAudioEl.play();
            audioState = 'playing';
            audioWidgetEl.classList.add('playing');
            const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
            if (playBtn) playBtn.innerHTML = PAUSE_SVG;
            updateAudioButtonStates();
            return;
        }
        console.log('[MetadataTab] playAudioFile STARTING new playback for', path);
        playAudioFileByWidget(path);
    }

    function build(ctx) {
        console.log('[MetadataTab] build() called');
        ensureStyle();
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-main">
                    <div class="metadata-preview">
                        <div class="renamer-preview-header">
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
                <div class="renamer-footer">
                    <button class="renamer-btn" id="metadata-cancel" data-translation="cancel">${ctx.t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" id="metadata-apply" disabled data-translation="metadataApply">${ctx.t('metadataApply')}</button>
                </div>
            </div>
        `;
    }

    function bind(ctx) {
        console.log('[MetadataTab] bind() called');

        const cancelBtn = document.getElementById('metadata-cancel');
        if (cancelBtn && !cancelBtn._metadataBound) {
            cancelBtn._metadataBound = true;
            cancelBtn.addEventListener('click', function() {
                cleanupAudioState(ctx);
                ctx.closeDialog();
            });
            console.log('[MetadataTab] bound cancel button');
        }

        const applyBtn = document.getElementById('metadata-apply');
        if (applyBtn && !applyBtn._metadataBound) {
            applyBtn._metadataBound = true;
            applyBtn.addEventListener('click', function() {
                handleApply(ctx);
            });
            console.log('[MetadataTab] bound apply button');
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

        renderPreview(ctx);
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
        });

        if (!searchLower) return;

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

        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const selectedFiles = ctx.state.files.filter(function(f) {
            if (!selectedSet) return true;
            return selectedSet.has(f);
        });

        const audioFiles = selectedFiles.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        console.log('[MetadataTab] loadMetadata -> calling /api/metadata/read for', audioFiles.length, 'files');

        if (!audioFiles.length) {
            list.innerHTML = '<div class="renamer-empty">Aucun fichier audio</div>';
            return;
        }

        ctx.apiRequest(ctx.getBaseUrl() + '/api/metadata/read', {
            method: 'POST',
            body: JSON.stringify({ paths: audioFiles })
        }).then(function(body) {
            if (!body || !body.success) {
                list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(body && body.error ? body.error : 'Erreur inconnue') + '</div>';
                return;
            }

            const files = body.files || [];
            ctx.state.metadataFileData = {};
            files.forEach(function(fileData) {
                ctx.state.metadataFileData[fileData.path] = fileData;
            });

            renderPreviewTable(ctx);
        }).catch(function(err) {
            list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(err.message || 'Erreur réseau') + '</div>';
        });
    }

    function renderPreviewTable(ctx) {
        const list = document.getElementById('metadata-preview-list');
        if (!list) return;

        const files = Object.keys(ctx.state.metadataFileData || {}).map(function(p) {
            return ctx.state.metadataFileData[p];
        });

        if (!files.length) {
            list.innerHTML = '<div class="renamer-empty">Aucun fichier audio</div>';
            return;
        }

        const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata' && r.enabled; });

        let tableHtml = `<table class="metadata-table"><thead><tr><th class="metadata-col-select" style="width:44px;"><button type="button" id="metadata-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="${ctx.t('deselectAll')}" data-translation="deselectAll">${CHECK_SVG}</button></th><th class="metadata-col-audio" style="width:36px;pointer-events:none;"><span class="metadata-selection-counter" id="metadata-selection-counter"></span></th><th class="metadata-col-file" data-translation="filename">` + ctx.escapeHtml(ctx.t('filename')) + `</th>`;
        METADATA_FIELDS.forEach(function(field) {
            const key = 'metadata' + field.charAt(0).toUpperCase() + field.slice(1);
            tableHtml += '<th class="metadata-col-' + field + '" data-translation="' + key + '">' + ctx.escapeHtml(ctx.t(key)) + '</th>';
        });
        tableHtml += '<th class="metadata-col-duration" data-translation="metadataDuration">' + ctx.escapeHtml(ctx.t('metadataDuration')) + '</th>';
        tableHtml += '<th class="metadata-col-added_on" data-translation="metadataAddedOn">' + ctx.escapeHtml(ctx.t('metadataAddedOn')) + '</th>';
        tableHtml += '</tr></thead><tbody>';

        files.forEach(function(fileData, rowIndex) {
            const isUnhandled = !fileData.readable && !fileData.writable;
            const hasError = !!fileData.error;
            const meta = fileData.metadata || {};
            const baseName = fileData.path.replace(/^.*\//, '');
            const isSelected = ctx.state.metadataFileSelection.has(fileData.path) || ctx.state.metadataAllSelected;
            const audioSupported = isAudioFile(fileData.path) && (fileData.readable || fileData.writable);
            const isCurrentlyPlaying = currentlyPlayingPath === fileData.path;

            const rowParity = rowIndex % 2 === 0 ? 'metadata-row-even' : 'metadata-row-odd';
            const rowUnchecked = !isSelected && fileData.writable && !isUnhandled;
            const rowClasses = rowParity + (rowUnchecked ? ' metadata-row-unchecked' : '');

            const badgeBtn = fileData.writable ? '<button type="button" class="' + (isSelected ? 'renamer-badge renamer-badge-success renamer-badge-toggle metadata-row-toggle' : 'renamer-badge renamer-badge-deselected renamer-badge-toggle metadata-row-toggle') + '" data-path="' + ctx.escapeHtml(fileData.path) + '" title="' + ctx.t('selectOrDeselect') + '" data-translation="selectOrDeselect" draggable="false">' + (isSelected ? CHECK_SVG : UNCHECK_SVG) + '</button>' : '';
            tableHtml += '<tr class="metadata-preview-row ' + rowClasses + '" data-path="' + ctx.escapeHtml(fileData.path) + '">';
            
            tableHtml += '<td class="metadata-col-select" style="pointer-events:none;">' + badgeBtn + '</td>';

            if (audioSupported) {
                const playIcon = isCurrentlyPlaying ? PAUSE_SVG : PLAY_SVG;
                const playTitle = isCurrentlyPlaying ? (ctx.t('metadataPause') || 'Pause') : (ctx.t('metadataListen') || 'Écouter');
                const playingClass = isCurrentlyPlaying ? ' metadata-audio-playing' : '';
                const disabledClass = playbackFailedPaths.has(fileData.path) ? ' metadata-audio-play-btn-disabled' : '';
                const streamUrl = getAudioStreamUrl(fileData.path);
                const audioBtn = '<button type="button" class="metadata-audio-play-btn' + playingClass + disabledClass + '" data-path="' + ctx.escapeHtml(fileData.path) + '" data-stream-url="' + escapeHtmlAttr(streamUrl || '') + '" title="' + ctx.escapeHtml(playTitle) + '" data-translation="metadataListen" draggable="false" aria-label="' + ctx.escapeHtml(playTitle) + '">' + playIcon + '</button>';
                tableHtml += '<td class="metadata-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">' + audioBtn + '</td>';
            } else {
                console.log('[MetadataTab] no audio button for', fileData.path, 'readable=' + fileData.readable, 'writable=' + fileData.writable, 'isAudio=' + isAudioFile(fileData.path), 'error=' + (fileData.error || 'null'), 'diagnostic=' + JSON.stringify(fileData.diagnostic || null));
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

        tableHtml += '</tbody></table>';
        list.innerHTML = tableHtml;

        updateToggleAllButton(ctx);
        updateApplyButtonState(ctx);
        bindTableEvents(ctx, list);

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
        cleanupAudioState(ctx);
        if (!ctx.state.metadataFileData || Object.keys(ctx.state.metadataFileData).length === 0) {
            console.log('[MetadataTab] renderPreview -> loadMetadata (empty or closed)');
            loadMetadata(ctx);
        } else {
            console.log('[MetadataTab] renderPreview -> renderPreviewTable (using cached data)');
            renderPreviewTable(ctx);
        }
    }

    function cleanupAudioState(ctx) {
        stopAudioPlayback();
        if (audioWidgetEl) {
            audioWidgetEl.classList.remove('visible', 'playing');
            audioWidgetEl.dataset.path = '';
            const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
            if (playBtn) playBtn.innerHTML = PLAY_SVG;
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
                    const audioPaths = Object.keys(ctx.state.metadataFileData || {}).filter(function(p) {
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
                    showPlaybackErrorToast(ctx, path, streamUrl);
                    return;
                }
                if (!path) return;
                playAudioFile(ctx, path);
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
        updateApplyButtonState(ctx);
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

    function updateApplyButtonState(ctx) {
        const applyBtn = document.getElementById('metadata-apply');
        if (!applyBtn) return;
        const enabled = hasChanges(ctx);
        applyBtn.disabled = !enabled;
        applyBtn.style.opacity = enabled ? '1' : '0.5';
        applyBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
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
        counter.textContent = selected + ' / ' + total;
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

        const hasManualOverrides = Object.keys(ctx.state.manualOverrides).some(function(path) {
            return selectedFiles.indexOf(path) !== -1 && Object.keys(ctx.state.manualOverrides[path]).length > 0;
        });

        if (hasManualOverrides) {
            showConflictPopup(ctx, selectedFiles);
        } else {
            executeWrite(ctx, selectedFiles, 'overwrite');
        }
    }

    function showConflictPopup(ctx, selectedFiles) {
        const existing = document.getElementById('metadata-confirm-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'metadata-confirm-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<button class="renamer-modal-close" aria-label="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" role="button" title="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" data-translation="close">×</button>' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3 data-translation="metadataApplyConfirmTitle">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmTitle') || 'Confirmer l\'application') + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;">Certains fichiers ont été modifiés manuellement. Que souhaitez-vous faire ?</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                '<button class="renamer-btn" data-action="cancel" data-translation="cancel">' + ctx.escapeHtml(ctx.t('cancel') || 'Annuler') + '</button>' +
                '<button class="renamer-btn renamer-btn-primary" data-action="overwrite" data-translation="metadataApplyConfirmOverwrite">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmOverwrite') || 'Écraser le renommage manuel') + '</button>' +
                '<button class="renamer-btn" data-action="ignore" data-translation="metadataApplyConfirmIgnore">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmIgnore') || 'Ignorer les fichiers modifiés manuellement') + '</button>' +
            '</div>' +
        '</div></div>';
        document.body.appendChild(overlay);

        const close = function() { overlay.remove(); };
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
        const escHandler = function(e) { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); document.removeEventListener('keydown', escHandler, true); } };
        document.addEventListener('keydown', escHandler, true);
        if (overlay.querySelector('.renamer-modal-close')) {
            overlay.querySelector('.renamer-modal-close').addEventListener('click', function() { close(); document.removeEventListener('keydown', escHandler, true); });
        }
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', function() { close(); document.removeEventListener('keydown', escHandler, true); });
        overlay.querySelector('[data-action="overwrite"]').addEventListener('click', function() {
            close();
            document.removeEventListener('keydown', escHandler, true);
            executeWrite(ctx, selectedFiles, 'overwrite');
        });
        overlay.querySelector('[data-action="ignore"]').addEventListener('click', function() {
            close();
            document.removeEventListener('keydown', escHandler, true);
            executeWrite(ctx, selectedFiles, 'ignore');
        });
    }

    function executeWrite(ctx, paths, conflictMode) {
        const modal = document.getElementById('renamer-modal');
        if (modal) {
            modal.classList.add('renamer-loading');
            const loader = document.createElement('div');
            loader.id = 'renamer-loader';
            loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:50;font-size:16px;font-weight:bold;color:var(--nc-blue);';
            loader.textContent = ctx.t('convertInProgress') || 'Application en cours...';
            loader.setAttribute('data-translation', 'convertInProgress');
            modal.appendChild(loader);
        }

        const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata' && r.enabled; });

        const payload = {
            paths: paths,
            rules: metadataRules,
            manualOverrides: ctx.state.manualOverrides,
            conflictMode: conflictMode,
        };

        ctx.apiRequest(ctx.getBaseUrl() + '/api/metadata/write', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then(function(body) {
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
                    ctx.showToast((ctx.t('metadataApplyConfirmIgnore') || 'Ignorés') + ' : ' + skippedCount, 'info');
                }

                loadMetadata(ctx);
            } else {
                ctx.showToast('Erreur: ' + (body.error || 'Réponse inattendue'), 'error');
            }
        }).catch(function(err) {
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
        console.log('[MetadataTab] registering tab', TAB_ID);
        RenamerApp.registerTab(TAB_ID, {
            id: TAB_ID,
            labelKey: 'metadataTab',
            build: build,
            bind: bind,
            render: render,
        });
        console.log('[MetadataTab] tab registered, tabs:', Object.keys(RenamerApp.tabs || {}));
    }

    register();
})();