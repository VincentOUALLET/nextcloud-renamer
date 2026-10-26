(function() {
    'use strict';

    var CHECK_SVG = window.RenamerIcons.CHECK;
    var UNCHECK_SVG = window.RenamerIcons.UNCHECK;
    var DELETE_SVG = window.RenamerIcons.DELETE;
    var FILTER_SVG = window.RenamerIcons.FILTER;
    var EDIT_ICON_SVG = window.RenamerIcons.EDIT;
    var PLAY_SVG = window.RenamerIcons.PLAY;
    var PAUSE_SVG = window.RenamerIcons.PAUSE;
    var DRAG_HANDLE_SVG = window.RenamerIcons.DRAG;
    var FOLDER_SVG = '<span class="icon-vue" style="width:20px;height:20px;display:flex;">' + window.RenamerIcons.FOLDER + '</span>';
    var HISTORY_SVG = window.RenamerIcons.HISTORY;
    var EXPAND_SVG = (window.RenamerIcons && window.RenamerIcons.EXPAND) || '';
    var COLLAPSE_SVG = (window.RenamerIcons && window.RenamerIcons.COLLAPSE) || '';
    var PREV_SVG = window.RenamerIcons.PREV;
    var NEXT_SVG = window.RenamerIcons.NEXT;
    var SETTINGS_DOTS_SVG = window.RenamerIcons.SETTINGS_DOTS;
    var NAVIGATE_SVG = (window.RenamerIcons && window.RenamerIcons.NAVIGATE) || '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>';

    var REPEAT_OFF_SVG = window.RenamerIcons.REPEAT_OFF;
    var REPEAT_ONE_SVG = window.RenamerIcons.REPEAT_ONE;
    var REPEAT_ALL_SVG = window.RenamerIcons.REPEAT_ALL;

    var AUDIO_EXTENSIONS = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
    var AUDIO_MIME_MAP = {
        'mp3': 'audio/mpeg',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'opus': 'audio/ogg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4'
    };

    var currentlyPlayingPath = null;
    var audioWidgetEl = null;
    var widgetAudioEl = null;
    var widgetDragState = null;
    var lastCtx = null;
    var audioOriginPath = null;
    var audioState = 'idle';
    var audioDuration = 0;
    var playbackFailedPaths = new Set();
    var audioPlayedHistory = [];
    var audioQueue = [];
    var audioQueueIndex = -1;
    var audioHistoryPopup = null;
    var mediaSessionHandlersSetup = false;
    var widgetEventsBound = false;
    var repeatMode = 0;
    var displayMode = 0;
    var progressSaveInterval = null;
    var lastSavedProgress = 0;

    function getCtx() {
        var ctx = (audioWidgetEl && audioWidgetEl._ctx) ? audioWidgetEl._ctx : lastCtx;
        if ((!ctx || !ctx.apiRequest || !ctx.getBaseUrl) && window.RenamerLibrary) {
            ctx = window.RenamerLibrary;
        }
        return ctx;
    }

    function isAudioFile(path) {
        var ext = path.replace(/^.*\./, '').toLowerCase();
        return AUDIO_EXTENSIONS.indexOf(ext) !== -1;
    }

    function getAudioMime(path) {
        var ext = path.replace(/^.*\./, '').toLowerCase();
        return AUDIO_MIME_MAP[ext] || 'audio/mpeg';
    }

    function getAudioStreamUrl(path) {
        var base = window.location.origin;
        var userId = '';
        if (typeof OC !== 'undefined') {
            if (typeof OC.getCurrentUser === 'function') {
                var user = OC.getCurrentUser();
                userId = (user && user.uid) ? user.uid : '';
            }
            if (!userId && typeof OC.getUserId === 'function') {
                userId = OC.getUserId() || '';
            }
        }
        if (!userId) {
            return null;
        }
        var encodedPath = path.split('/').map(encodeURIComponent).join('/');
        var url = base + '/remote.php/dav/files/' + userId + '/' + encodedPath;
        console.log('[AudioPlayer] getAudioStreamUrl path=', path, 'url=', url);
        return url;
    }

    function loadAudioProgress(path) {
        var ctx = getCtx();
        console.log('[AudioPlayer] loadAudioProgress called:', { path: path, hasCtx: !!ctx, hasApiRequest: !!(ctx && ctx.apiRequest), hasGetBaseUrl: !!(ctx && ctx.getBaseUrl) });
        if (!ctx || !ctx.apiRequest || !ctx.getBaseUrl) {
            console.warn('[AudioPlayer] loadAudioProgress: no valid context');
            return Promise.resolve(null);
        }
        return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress/read', {
            method: 'POST',
            body: JSON.stringify({ paths: [path] })
        }).then(function(data) {
            if (data && data.success && data.progress && data.progress[path]) {
                var prog = data.progress[path];
                if (prog.type === 'audio' && typeof prog.value === 'number' && prog.total > 0) {
                    var percent = prog.value / prog.total;
                    console.log('[AudioPlayer] loadAudioProgress: found progress for', path, 'percent=', percent);
                    return percent;
                }
            }
            return null;
        }).catch(function(err) {
            console.warn('[AudioPlayer] loadAudioProgress error:', err);
            return null;
        });
    }

    function saveAudioProgress(path, currentTime, duration) {
        var ctx = getCtx();
        console.log('[AudioPlayer] saveAudioProgress called:', { path: path, currentTime: currentTime, duration: duration, hasCtx: !!ctx, hasApiRequest: !!(ctx && ctx.apiRequest), hasGetBaseUrl: !!(ctx && ctx.getBaseUrl) });
        if (!ctx || !ctx.apiRequest || !ctx.getBaseUrl) {
            console.warn('[AudioPlayer] saveAudioProgress: no valid context, cannot save', { lastCtx: !!lastCtx, widgetCtx: !!(audioWidgetEl && audioWidgetEl._ctx), renamerLib: !!window.RenamerLibrary });
            return;
        }
        if (!isFinite(currentTime) || !isFinite(duration) || duration <= 0) return;
        var percent = Math.round((currentTime / duration) * 10000) / 10000;
        if (Math.abs(percent - lastSavedProgress) < 0.001) return;
        lastSavedProgress = percent;
        var total = Math.round(duration);
        var value = Math.round(currentTime);
        console.log('[AudioPlayer] saveAudioProgress:', path, 'value=', value, 'total=', total, 'percent=', percent);
        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
            method: 'POST',
            body: JSON.stringify({ path: path, type: 'audio', value: value, total: total })
        }).catch(function(err) {
            console.warn('[AudioPlayer] saveAudioProgress error:', err);
        });
    }

    function startProgressSaving() {
        stopProgressSaving();
        progressSaveInterval = setInterval(function() {
            if (widgetAudioEl && currentlyPlayingPath && audioState === 'playing') {
                saveAudioProgress(currentlyPlayingPath, widgetAudioEl.currentTime, widgetAudioEl.duration);
            }
        }, 5000);
    }

    function stopProgressSaving() {
        if (progressSaveInterval) {
            clearInterval(progressSaveInterval);
            progressSaveInterval = null;
        }
        lastSavedProgress = 0;
    }

    function setupMediaSession(path) {
        if (!('mediaSession' in navigator)) return;
        try {
            var ctx = getCtx();
            var baseName = path ? path.replace(/^.*\//, '') : '';
            var fileData = (ctx && ctx.state && ctx.state.metadataFileData) ? ctx.state.metadataFileData[path] : null;
            var meta = fileData && fileData.metadata ? fileData.metadata : {};
            var artist = (meta.artist || '').trim();
            var title = (meta.title || '').trim();
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title || baseName || 'Métadonnées Renamer',
                artist: artist || '',
                album: (meta.album || '').trim() || '',
                artwork: []
            });
            updateMediaSessionPlaybackState();
        } catch (e) {
            console.warn('[AudioPlayer] MediaSession metadata error:', e);
        }
    }

    function updateMediaSessionPlaybackState() {
        if (!('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.playbackState = audioState === 'playing' ? 'playing' : audioState === 'paused' ? 'paused' : 'none';
        } catch (e) {
            console.warn('[AudioPlayer] MediaSession playbackState error:', e);
        }
    }

    function setupMediaSessionHandlers() {
        if (!('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.setActionHandler('play', function() {
                if (currentlyPlayingPath && audioState === 'paused') {
                    playAudioFile(lastCtx, currentlyPlayingPath);
                }
            });
            navigator.mediaSession.setActionHandler('pause', function() {
                if (audioState === 'playing' && widgetAudioEl) {
                    widgetAudioEl.pause();
                }
            });
            navigator.mediaSession.setActionHandler('previoustrack', function() {
                playPreviousAudio();
            });
            navigator.mediaSession.setActionHandler('nexttrack', function() {
                playNextAudio();
            });
        } catch (e) {
            console.warn('[AudioPlayer] MediaSession handler error:', e);
        }
    }

    function ensureAudioWidget() {
        if (audioWidgetEl && widgetAudioEl) return;
        audioWidgetEl = document.getElementById('metadata-audio-widget');
        if (audioWidgetEl) {
            widgetAudioEl = document.getElementById('metadata-audio-hidden');
            if (!widgetAudioEl) {
                widgetAudioEl = document.createElement('audio');
                widgetAudioEl.id = 'metadata-audio-hidden';
                widgetAudioEl.style.display = 'none';
                widgetAudioEl.preload = 'none';
                document.body.appendChild(widgetAudioEl);
            }
            return;
        }
        audioWidgetEl = document.createElement('div');
        audioWidgetEl.id = 'metadata-audio-widget';
        audioWidgetEl.innerHTML = '<div class="metadata-audio-row metadata-audio-row-1">' +
            '<span class="metadata-audio-drag-handle" title="' + escapeHtml('Déplacer') + '" data-translation="dragToReorder">' + DRAG_HANDLE_SVG + '</span>' +
            '<div class="metadata-audio-title"><span class="metadata-audio-title-inner"></span></div>' +
            '<button type="button" class="metadata-audio-btn metadata-audio-display-mode-btn" id="metadata-audio-display-mode" title="' + escapeHtml('Mode d\'affichage') + '" data-translation="displayMode">' + EXPAND_SVG + '</button>' +
            '<button type="button" class="metadata-audio-btn metadata-audio-close" title="' + escapeHtml('Fermer') + '" data-translation="close">×</button>' +
            '</div>' +
            '<div class="metadata-audio-progress-row"><input type="range" class="metadata-audio-progress" min="0" max="1000" value="0" title="00:00" /></div>' +
            '<div class="metadata-audio-row metadata-audio-row-2">' +
            '<span class="metadata-audio-time-current">00:00</span>' +
            '<div class="metadata-audio-row metadata-audio-row-2-controls">' +
            '<button type="button" class="metadata-audio-nav-btn" id="metadata-audio-prev" title="' + escapeHtml('Précédent') + '" data-translation="metadataPrev">' + PREV_SVG + '</button>' +
            '<button type="button" class="metadata-audio-btn metadata-audio-play" title="' + escapeHtml('Écouter') + '" data-translation="metadataListen">' + PLAY_SVG + '</button>' +
            '<button type="button" class="metadata-audio-nav-btn" id="metadata-audio-next" title="' + escapeHtml('Suivant') + '" data-translation="metadataNext">' + NEXT_SVG + '</button>' +
            '<input type="range" class="metadata-audio-volume" min="0" max="1" step="0.01" value="1" title="' + escapeHtml('Volume') + '" data-translation="volume" />' +
            '</div>' +
            '<span class="metadata-audio-time-total">00:00</span>' +
            '</div>' +
            '<div class="metadata-audio-row metadata-audio-row-3">' +
            '<button type="button" class="metadata-audio-nav-btn metadata-audio-repeat repeat-off" id="metadata-audio-repeat" title="' + escapeHtml('Répéter') + '" data-translation="metadataRepeat">' + REPEAT_OFF_SVG + '</button>' +
            '<span class="metadata-audio-queue-index" title="' + escapeHtml('Position dans la file') + '" data-translation="queuePosition"></span>' +
            '</div>' +
            '<div class="metadata-audio-history-panel" id="metadata-audio-history-panel"></div>';
        document.body.appendChild(audioWidgetEl);
        widgetAudioEl = document.getElementById('metadata-audio-hidden');
        if (!widgetAudioEl) {
            widgetAudioEl = document.createElement('audio');
            widgetAudioEl.id = 'metadata-audio-hidden';
            widgetAudioEl.style.display = 'none';
            widgetAudioEl.preload = 'none';
            document.body.appendChild(widgetAudioEl);
        }

        if (!mediaSessionHandlersSetup) {
            mediaSessionHandlersSetup = true;
            setupMediaSessionHandlers();
        }

        const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
        const closeBtn = audioWidgetEl.querySelector('.metadata-audio-close');
        const volumeInput = audioWidgetEl.querySelector('.metadata-audio-volume');
        const progressInput = audioWidgetEl.querySelector('.metadata-audio-progress');
        const prevBtn = audioWidgetEl.querySelector('#metadata-audio-prev');
        const nextBtn = audioWidgetEl.querySelector('#metadata-audio-next');
        const displayModeBtn = audioWidgetEl.querySelector('#metadata-audio-display-mode');
        let seeking = false;

        if (playBtn) {
            playBtn.addEventListener('click', function() {
                if (audioState === 'playing') {
                    widgetAudioEl.pause();
                    audioState = 'paused';
                    playBtn.innerHTML = PLAY_SVG;
                    audioWidgetEl.classList.remove('playing');
                    updateMediaSessionPlaybackState();
                    var ctx = getCtx();
                    if (ctx && currentlyPlayingPath) {
                        saveAudioProgress(currentlyPlayingPath, widgetAudioEl.currentTime, widgetAudioEl.duration);
                    }
                } else if (audioState === 'paused') {
                    widgetAudioEl.play();
                    audioState = 'playing';
                    playBtn.innerHTML = PAUSE_SVG;
                    audioWidgetEl.classList.add('playing');
                    startProgressSaving();
                    updateMediaSessionPlaybackState();
                } else {
                    if (widgetAudioEl.dataset.path) {
                        playAudioFileByWidget(widgetAudioEl.dataset.path);
                    } else if (audioQueue.length > 0) {
                        audioQueueIndex = 0;
                        playAudioFileByWidget(audioQueue[0]);
                    } else {
                        var ctx = getCtx();
                        if (ctx && ctx.showToast) {
                            ctx.showToast(ctx.t('metadataQueueEmpty') || 'Liste de lecture vide', 'success', { duration: 2000 });
                        }
                    }
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                playPreviousAudio();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                playNextAudio();
            });
        }

        if (displayModeBtn) {
            displayModeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleDisplayMode();
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
                hideAudioHistoryPopup();
                audioQueue = [];
                audioQueueIndex = -1;
                audioWidgetEl.classList.remove('visible');
                audioWidgetEl.classList.remove('playing');
                audioWidgetEl.dataset.path = '';
                audioOriginPath = null;
                repeatMode = 0;
                updateAudioButtonStates();
                updateWidgetQueueIndex();
            });
        }

        const repeatBtn = audioWidgetEl.querySelector('.metadata-audio-repeat');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', function() {
                repeatMode = (repeatMode + 1) % 3;
                updateRepeatButtonState();
                updateAudioButtonStates();
            });
        }
        makeWidgetDraggable(audioWidgetEl);
        updateRepeatButtonState();
        applyDisplayMode();
    }

    function toggleDisplayMode() {
        displayMode = (displayMode + 1) % 3;
        applyDisplayMode();
        updateDisplayModeButton();
    }

    function applyDisplayMode() {
        if (!audioWidgetEl) return;
        audioWidgetEl.classList.remove('display-mode-full', 'display-mode-reduced', 'display-mode-fullscreen');
        if (displayMode === 0) {
            audioWidgetEl.classList.add('display-mode-full');
        } else if (displayMode === 1) {
            audioWidgetEl.classList.add('display-mode-reduced');
        } else {
            audioWidgetEl.classList.add('display-mode-fullscreen');
        }
        // Reset inline position styles for fullscreen mode
        if (displayMode === 2) {
            audioWidgetEl.style.left = '';
            audioWidgetEl.style.top = '';
            audioWidgetEl.style.right = '';
            audioWidgetEl.style.bottom = '';
        }
        // Ensure history panel visibility is handled
        const panel = document.getElementById('metadata-audio-history-panel');
        if (panel) {
            const wasVisible = panel.classList.contains('visible');
            if (displayMode === 0 || displayMode === 2) {
                panel.classList.add('visible');
            } else {
                panel.classList.remove('visible');
            }
            // Re-render panel content and initialize Sortable when panel becomes visible
            if (!wasVisible && panel.classList.contains('visible')) {
                refreshAudioHistoryPanel();
            }
        }
        // Also update the display mode button
        updateDisplayModeButton();
    }

    function updateDisplayModeButton() {
        const btn = audioWidgetEl ? audioWidgetEl.querySelector('#metadata-audio-display-mode') : null;
        if (!btn) return;
        // Display mode toggle behavior (3 modes):
        // - Mode 0 (full/default): next click goes to reduced -> "Réduire" with EXPAND_SVG (same as fullscreen)
        // - Mode 1 (reduced): next click goes to fullscreen -> "Agrandir" with COLLAPSE_SVG
        // - Mode 2 (fullscreen): next click goes to full/default -> "Réduire" with EXPAND_SVG
        const titles = [
            (lastCtx && lastCtx.t ? lastCtx.t('displayModeReduced') : 'Réduire') || 'Réduire',
            (lastCtx && lastCtx.t ? lastCtx.t('displayModeFullscreen') : 'Agrandir') || 'Agrandir',
            (lastCtx && lastCtx.t ? lastCtx.t('displayModeFull') : 'Réduire') || 'Réduire'
        ];
        // Mode 0 and 2 use EXPAND_SVG ("Réduire"), Mode 1 uses COLLAPSE_SVG ("Agrandir")
        const svgs = [EXPAND_SVG, COLLAPSE_SVG, EXPAND_SVG];
        btn.title = titles[displayMode];
        btn.innerHTML = svgs[displayMode];
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

    function getAudioHistoryIndex() {
        if (!currentlyPlayingPath || !audioPlayedHistory.length) return -1;
        return audioPlayedHistory.indexOf(currentlyPlayingPath);
    }

    function getQueueIndex() {
        if (!currentlyPlayingPath || !audioQueue.length) return -1;
        return audioQueue.indexOf(currentlyPlayingPath);
    }

    function pushAudioHistory(path) {
        if (!path) return;
        const idx = audioPlayedHistory.indexOf(path);
        if (idx === -1) {
            audioPlayedHistory.push(path);
        }
        if (audioQueue.indexOf(path) === -1) {
            audioQueue.push(path);
        }
    }

    function playPreviousAudio() {
        if (!audioQueue.length) return;
        if (audioQueueIndex <= 0) return;
        audioQueueIndex--;
        const prevPath = audioQueue[audioQueueIndex];
        if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
        playAudioFileByWidget(prevPath);
        refreshAudioHistoryPanel();
    }

    function playNextAudio() {
        if (!audioQueue.length) return;
        if (audioQueueIndex >= audioQueue.length - 1) return;
        audioQueueIndex++;
        const nextPath = audioQueue[audioQueueIndex];
        if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
        playAudioFileByWidget(nextPath);
        refreshAudioHistoryPanel();
    }

    function showAudioContextMenu(ctx, path, event) {
        event.preventDefault();
        event.stopPropagation();
        const existing = document.getElementById('metadata-audio-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'metadata-audio-context-menu';
        menu.className = 'metadata-audio-context-menu';
        menu.innerHTML =
            '<button type="button" class="metadata-audio-context-menu-item" data-action="play" data-translation="metadataListen">' + escapeHtml((ctx && typeof ctx.t === 'function' ? ctx.t('metadataListen') : null) || 'Lire') + '</button>' +
            '<button type="button" class="metadata-audio-context-menu-item" data-action="enqueue" data-translation="metadataEnqueue">' + escapeHtml((ctx && typeof ctx.t === 'function' ? ctx.t('metadataEnqueue') : null) || 'Ajouter à la file d\'attente') + '</button>';

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
                    playAudioFile(ctx, path);
                } else if (action === 'enqueue') {
                    enqueueAudioFile(ctx, path);
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

    function findCollectionForPath(ctx, path) {
        if (!ctx || !ctx.state) return null;
        const allCollections = ctx.state.allCollections || {};
        for (const libId in allCollections) {
            const collections = allCollections[libId] || [];
            for (let i = 0; i < collections.length; i++) {
                const col = collections[i];
                if (!col || !col.rules) continue;
                const paths = collectPathsFromCollection(col);
                if (paths.indexOf(path) !== -1) {
                    return { collection: col, library: ctx.state.libraries && ctx.state.libraries.find(l => String(l.id) === String(libId)) };
                }
            }
        }
        return null;
    }

    function collectPathsFromCollection(collection) {
        if (!collection || !collection.rules) return [];
        const root = collection.rules;
        const files = collectAllFilesFromRules(root);
        const paths = [];
        files.forEach(function(f) { if (f.path) paths.push(f.path); });
        return paths;
    }

    function collectAllFilesFromRules(rules) {
        if (!rules) return [];
        var result = [];
        if (Array.isArray(rules.files)) {
            result = result.concat(rules.files);
        }
        if (Array.isArray(rules.children)) {
            rules.children.forEach(function(child) {
                result = result.concat(collectAllFilesFromRules(child));
            });
        }
        return result;
    }

    function showHistoryContextMenu(ctx, path, event) {
        event.preventDefault();
        event.stopPropagation();
        const existing = document.getElementById('metadata-audio-history-context-menu');
        if (existing) existing.remove();

        const t = function(key, fallback) {
            return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
        };
        const esc = function(str) {
            return String(str)
                .replace(/&/g, '&')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '"')
                .replace(/'/g, '\'');
        };

        const collectionInfo = findCollectionForPath(ctx, path);
        const hasCollection = !!collectionInfo;

        let menuHtml = '';
        if (hasCollection) {
            menuHtml += '<button type="button" class="metadata-audio-context-menu-item" data-action="go-to-collection" data-translation="goToCollection">' + NAVIGATE_SVG + ' ' + esc(t('goToCollection', 'Aller à la collection')) + '</button>';
        }
        menuHtml += '<button type="button" class="metadata-audio-context-menu-item" data-action="remove-from-queue" data-translation="removeFromQueue">' + DELETE_SVG + ' ' + esc(t('removeFromQueue', 'Retirer de la file')) + '</button>';

        const menu = document.createElement('div');
        menu.id = 'metadata-audio-history-context-menu';
        menu.className = 'metadata-audio-context-menu';
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
                if (action === 'go-to-collection' && collectionInfo) {
                    const lib = collectionInfo.library;
                    const col = collectionInfo.collection;
                    if (ctx && typeof ctx.navigateToCollection === 'function') {
                        ctx.navigateToCollection(col, lib);
                    } else if (window.RenamerLibrary && typeof window.RenamerLibrary.navigateToCollection === 'function') {
                        window.RenamerLibrary.navigateToCollection(col, lib);
                    }
                } else if (action === 'remove-from-queue') {
                    const index = audioQueue.indexOf(path);
                    if (index !== -1) {
                        removeFromQueue(index);
                    }
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

    function removeFromQueue(index) {
        if (index < 0 || index >= audioQueue.length) return;
        const removedPath = audioQueue[index];
        audioQueue.splice(index, 1);
        if (audioQueueIndex === index) {
            stopAudioPlayback();
            audioQueueIndex = -1;
        } else if (audioQueueIndex > index) {
            audioQueueIndex--;
        }
        refreshAudioHistoryPanel();
    }

    function adjustWidgetForHistoryPanel() {
        if (!audioWidgetEl) return;
        var panel = document.getElementById('metadata-audio-history-panel');
        if (!panel) return;

        if (panel.classList.contains('visible')) {
            audioWidgetEl.style.top = 'auto';
            audioWidgetEl.style.bottom = '316px';
        } else {
            audioWidgetEl.style.top = '';
            audioWidgetEl.style.bottom = '';
        }
    }

    function showAudioHistoryPopup(triggerBtn) {
        const ctx = lastCtx;
        const t = function(key, fallback) {
            return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
        };
        const esc = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };
        const panel = document.getElementById('metadata-audio-history-panel');
        if (!panel) return;

        if (panel.classList.contains('visible')) {
            panel.classList.remove('visible');
            adjustWidgetForHistoryPanel();
            setTimeout(function() {
                if (!panel.classList.contains('visible')) {
                    panel.innerHTML = '';
                }
            }, 300);
            return;
        }

        if (!audioQueue.length) {
            panel.innerHTML =
                '<div class="metadata-audio-history-header">' +
                '<div>' + esc(t('metadataHistoryEmpty', 'Aucun historique')) + '</div>' +
                '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + esc(t('more', 'Plus')) + '" data-translation="more" disabled>' + SETTINGS_DOTS_SVG + '</button>' +
                '</div>';
            panel.classList.add('visible');
            adjustWidgetForHistoryPanel();
            return;
        }

        let html = '<div class="metadata-audio-history-header">' +
            '<div>' + esc(t('metadataQueue', 'File d\'attente')) + '</div>' +
            '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + esc(t('more', 'Plus')) + '" data-translation="more">' + SETTINGS_DOTS_SVG + '</button>' +
            '</div>' +
            '<div class="metadata-audio-history-list">';

        audioQueue.forEach(function(path, index) {
            const isCurrent = path === currentlyPlayingPath;
            const baseName = path.replace(/^.*\//, '');
            const cls = isCurrent ? ' metadata-audio-history-current' : '';
            html += '<div class="metadata-audio-history-item' + cls + '" data-path="' + esc(path) + '" data-index="' + index + '" style="cursor:pointer;">' +
                '<span class="metadata-audio-history-drag-handle" title="' + esc(t('dragToReorder', 'Réorganiser')) + '" data-translation="dragToReorder">' + DRAG_HANDLE_SVG + '</span>' +
                '<span style="opacity:0.5;min-width:18px;text-align:right;margin-right:4px;font-size:11px;font-variant-numeric:tabular-nums;">' + (index + 1) + '</span>' +
                '<span style="overflow:hidden;text-overflow:ellipsis;flex:1;">' + esc(baseName) + '</span>' +
                '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-delete-btn" title="' + esc(t('removeFromQueue', 'Retirer de la file')) + '" data-translation="removeFromQueue">' + DELETE_SVG + '</button>' +
                '</div>';
        });
        html += '</div>';
        panel.innerHTML = html;
        panel.classList.add('visible');
        adjustWidgetForHistoryPanel();

        // Use event delegation for contextmenu on the list container
        // This ensures it works regardless of which child element is right-clicked
        const listEl = panel.querySelector('.metadata-audio-history-list');
        if (listEl) {
            // Remove any existing contextmenu listener
            if (listEl._historyContextMenuHandler) {
                listEl.removeEventListener('contextmenu', listEl._historyContextMenuHandler);
            }
            listEl._historyContextMenuHandler = function(e) {
                const item = e.target.closest('.metadata-audio-history-item');
                if (item) {
                    e.preventDefault();
                    e.stopPropagation();
                    const path = item.dataset.path;
                    if (path) {
                        showHistoryContextMenu(lastCtx, path, e);
                    }
                }
            };
            listEl.addEventListener('contextmenu', listEl._historyContextMenuHandler);

            if (typeof Sortable !== 'undefined') {
                if (listEl._historySortable) {
                    listEl._historySortable.destroy();
                }
                listEl._historySortable = Sortable.create(listEl, {
                    handle: '.metadata-audio-history-drag-handle',
                    animation: 150,
                    ghostClass: 'metadata-audio-history-ghost',
                    onEnd: function(evt) {
                        const newOrder = [];
                        listEl.querySelectorAll('.metadata-audio-history-item').forEach(function(item) {
                            newOrder.push(item.dataset.path);
                        });
                        audioQueue = newOrder;
                        if (currentlyPlayingPath) {
                            audioQueueIndex = audioQueue.indexOf(currentlyPlayingPath);
                        }
                        refreshAudioHistoryPanel();
                    }
                });
            } else {
                console.warn('[AudioPlayer] Sortable not available or list element not found (showAudioHistoryPopup)', { listEl: !!listEl, Sortable: typeof Sortable });
            }
        }

        panel.querySelectorAll('.metadata-audio-history-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('metadata-audio-history-delete-btn')) return;
                if (e.target.classList.contains('metadata-audio-history-drag-handle')) return;
                e.stopPropagation();
                const path = this.dataset.path;
                const index = parseInt(this.dataset.index, 10);
                if (path && path !== currentlyPlayingPath) {
                    audioQueueIndex = index;
                    if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                    playAudioFileByWidget(path);
                }
            });
        });

        panel.querySelectorAll('.metadata-audio-history-delete-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const item = this.closest('.metadata-audio-history-item');
                const index = parseInt(item.dataset.index, 10);
                removeFromQueue(index);
            });
        });

        const moreBtn = panel.querySelector('.metadata-audio-history-more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showHistoryActionsMenu(ctx, panel, moreBtn);
            });
        }
    }

    function hideAudioHistoryPopup() {
        const panel = document.getElementById('metadata-audio-history-panel');
        if (panel) {
            panel.classList.remove('visible');
            adjustWidgetForHistoryPanel();
            setTimeout(function() {
                if (!panel.classList.contains('visible')) {
                    panel.innerHTML = '';
                }
            }, 300);
        }
        audioHistoryPopup = null;
    }

    function refreshAudioHistoryPanel() {
        const panel = document.getElementById('metadata-audio-history-panel');
        if (!panel || !panel.classList.contains('visible')) {
            console.log('[AudioPlayer] refreshAudioHistoryPanel: panel not visible or not found', { panel: !!panel, visible: panel ? panel.classList.contains('visible') : false });
            return;
        }
        console.log('[AudioPlayer] refreshAudioHistoryPanel: rendering panel');
        const ctx = lastCtx;
        const t = function(key, fallback) {
            return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
        };
        const esc = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

        if (!audioQueue.length) {
            panel.innerHTML =
                '<div class="metadata-audio-history-header">' +
                '<div>' + esc(t('metadataHistoryEmpty', 'Aucun historique')) + '</div>' +
                '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + esc(t('more', 'Plus')) + '" data-translation="more" disabled>' + SETTINGS_DOTS_SVG + '</button>' +
                '</div>';
            return;
        }

        let html = '<div class="metadata-audio-history-header">' +
            '<div>' + esc(t('metadataQueue', 'File d\'attente')) + '</div>' +
            '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + esc(t('more', 'Plus')) + '" data-translation="more">' + SETTINGS_DOTS_SVG + '</button>' +
            '</div>' +
            '<div class="metadata-audio-history-list">';

        audioQueue.forEach(function(path, index) {
            const isCurrent = path === currentlyPlayingPath;
            const baseName = path.replace(/^.*\//, '');
            const cls = isCurrent ? ' metadata-audio-history-current' : '';
            html += '<div class="metadata-audio-history-item' + cls + '" data-path="' + esc(path) + '" data-index="' + index + '" style="cursor:pointer;">' +
                '<span class="metadata-audio-history-drag-handle" title="' + esc(t('dragToReorder', 'Réorganiser')) + '" data-translation="dragToReorder">' + DRAG_HANDLE_SVG + '</span>' +
                '<span style="opacity:0.5;min-width:18px;text-align:right;margin-right:4px;font-size:11px;font-variant-numeric:tabular-nums;">' + (index + 1) + '</span>' +
                '<span style="overflow:hidden;text-overflow:ellipsis;flex:1;">' + esc(baseName) + '</span>' +
                '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-delete-btn" title="' + esc(t('removeFromQueue', 'Retirer de la file')) + '" data-translation="removeFromQueue">' + DELETE_SVG + '</button>' +
                '</div>';
        });
        html += '</div>';
        panel.innerHTML = html;

        // Use event delegation for contextmenu + Sortable on the list container
        const listEl = panel.querySelector('.metadata-audio-history-list');
        if (listEl) {
            // Contextmenu handler (delegated)
            if (listEl._historyContextMenuHandler) {
                listEl.removeEventListener('contextmenu', listEl._historyContextMenuHandler);
            }
            listEl._historyContextMenuHandler = function(e) {
                const item = e.target.closest('.metadata-audio-history-item');
                if (item) {
                    e.preventDefault();
                    e.stopPropagation();
                    const path = item.dataset.path;
                    if (path) {
                        showHistoryContextMenu(lastCtx, path, e);
                    }
                }
            };
            listEl.addEventListener('contextmenu', listEl._historyContextMenuHandler);

            // Sortable for drag-to-reorder
            if (typeof Sortable !== 'undefined') {
                if (listEl._historySortable) {
                    listEl._historySortable.destroy();
                }
                listEl._historySortable = Sortable.create(listEl, {
                    handle: '.metadata-audio-history-drag-handle',
                    animation: 150,
                    ghostClass: 'metadata-audio-history-ghost',
                    onEnd: function(evt) {
                        const newOrder = [];
                        listEl.querySelectorAll('.metadata-audio-history-item').forEach(function(item) {
                            newOrder.push(item.dataset.path);
                        });
                        audioQueue = newOrder;
                        if (currentlyPlayingPath) {
                            audioQueueIndex = audioQueue.indexOf(currentlyPlayingPath);
                        }
                        refreshAudioHistoryPanel();
                    }
                });
            } else {
                console.warn('[AudioPlayer] Sortable not available or list element not found (refreshAudioHistoryPanel)', { listEl: !!listEl, Sortable: typeof Sortable });
            }
        }

        panel.querySelectorAll('.metadata-audio-history-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('metadata-audio-history-delete-btn')) return;
                if (e.target.classList.contains('metadata-audio-history-drag-handle')) return;
                e.stopPropagation();
                const path = this.dataset.path;
                const index = parseInt(this.dataset.index, 10);
                if (path && path !== currentlyPlayingPath) {
                    audioQueueIndex = index;
                    if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                    playAudioFileByWidget(path);
                }
            });
        });

        panel.querySelectorAll('.metadata-audio-history-delete-btn').forEach(function(btn) {
btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const item = this.closest('.metadata-audio-history-item');
                const index = parseInt(item.dataset.index, 10);
                removeFromQueue(index);
            });
        });

        const moreBtn = panel.querySelector('.metadata-audio-history-more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showHistoryActionsMenu(ctx, panel, moreBtn);
            });
        }
    }

    function showHistoryActionsMenu(ctx, panel, triggerBtn) {
        let existingMenu = panel.querySelector('.metadata-audio-history-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const t = function(key, fallback) {
            return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
        };
        const esc = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

        const menu = document.createElement('div');
        menu.className = 'metadata-audio-history-menu';
        menu.innerHTML = '<button type="button" class="metadata-audio-history-menu-item" data-action="export-playlist" data-translation="metadataExportPlaylist">' + esc(t('metadataExportPlaylist', 'Exporter vers playlist')) + '</button>';
        panel.appendChild(menu);

        menu.querySelector('[data-action="export-playlist"]').addEventListener('click', function(e) {
            e.stopPropagation();
            menu.remove();
            showExportPlaylistPopup(ctx);
        });
    }

    function showExportPlaylistPopup(ctx) {
        const existing = document.getElementById('metadata-playlist-export-popup');
        if (existing) existing.remove();

        const t = function(key, fallback) {
            return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
        };
        const esc = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };
        const showToast = function(message, type) {
            if (ctx && typeof ctx.showToast === 'function') {
                ctx.showToast(message, type || 'info');
            } else {
                console.log('[AudioPlayer] Toast:', message);
            }
        };

        const overlay = document.createElement('div');
        overlay.id = 'metadata-playlist-export-popup';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';

        const currentPath = (typeof RenamerNavigation !== 'undefined') ? RenamerNavigation.getCurrentPath() : '/';
        const defaultName = currentPath === '/' ? 'playlist.m3u8' : currentPath.split('/').filter(Boolean).pop() + '.m3u8';

        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<button type="button" class="renamer-modal-close" aria-label="' + esc(t('close', 'Fermer')) + '" role="button" title="' + esc(t('close', 'Fermer')) + '" data-translation="close">×</button>' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3 data-translation="metadataExportPlaylistTitle">' + esc(t('metadataExportPlaylistTitle', 'Exporter la playlist')) + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;" data-translation="metadataExportPlaylistDesc">Créer un fichier playlist dans le dossier courant :</div>' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<label style="min-width:80px;font-weight:500;text-align:right;" data-translation="metadataPlaylistFilename">' + esc(t('metadataPlaylistFilename', 'Nom du fichier')) + '</label>' +
                '<input type="text" id="metadata-playlist-filename-input" value="' + esc(defaultName) + '" style="flex:1;padding:6px 10px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);" />' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                '<button type="button" class="renamer-btn" data-action="cancel-playlist-export" data-translation="cancel">' + esc(t('cancel', 'Annuler')) + '</button>' +
                '<button type="button" class="renamer-btn renamer-btn-primary" data-action="confirm-playlist-export" data-translation="metadataExportPlaylist">' + esc(t('metadataExportPlaylist', 'Exporter')) + '</button>' +
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

        const input = overlay.querySelector('#metadata-playlist-filename-input');
        if (input) {
            input.focus();
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const confirmBtn = overlay.querySelector('[data-action="confirm-playlist-export"]');
                    if (confirmBtn) confirmBtn.click();
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

        overlay.querySelector('[data-action="cancel-playlist-export"]').addEventListener('click', function() {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc, true);
        });

        overlay.querySelector('[data-action="confirm-playlist-export"]').addEventListener('click', function() {
            const filenameInput = overlay.querySelector('#metadata-playlist-filename-input');
            const filename = (filenameInput && filenameInput.value.trim()) ? filenameInput.value.trim() : 'playlist.m3u8';
            executePlaylistExport(ctx, currentPath, filename);
            overlay.remove();
            document.removeEventListener('keydown', handleEsc, true);
        });
    }

    function executePlaylistExport(ctx, folder, filename) {
        const paths = audioQueue.slice();
        if (!paths.length) {
            const msg = (ctx && typeof ctx.t === 'function') ? ctx.t('metadataNoHistory') : 'Aucun titre dans la file d\'attente';
            if (ctx && typeof ctx.showToast === 'function') {
                ctx.showToast(msg || 'Aucun titre dans la file d\'attente', 'error');
            } else {
                console.log('[AudioPlayer] Toast:', msg);
            }
            return;
        }

        const modal = document.getElementById('renamer-modal');
        let exportTimerInterval = null;
        if (modal) {
            modal.classList.add('renamer-loading');
            const loader = document.createElement('div');
            loader.id = 'renamer-loader';
            loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:50;font-size:16px;font-weight:bold;color:var(--reader-accent);';
            const startTime = Date.now();
            const timerLabel = (ctx && typeof ctx.t === 'function' ? ctx.t('loadingElapsed') : null) || 'Écoulé';
            loader.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;font-family:monospace;">' +
                '<div id="renamer-loader-text">' + ((ctx && typeof ctx.t === 'function' ? ctx.t('metadataExporting') : null) || 'Export en cours...') + '</div>' +
                '<div id="renamer-loader-timer" style="font-size:13px;font-weight:normal;opacity:0.7;font-family:monospace;font-variant-numeric:tabular-nums;">' +
                '<span style="opacity:0.5;">' + escapeHtml(timerLabel) + '</span> <span>00:00</span>' +
                '</div></div>';
            loader.setAttribute('data-translation', 'metadataExporting');
            modal.appendChild(loader);
            const timerEl = loader.querySelector('#renamer-loader-timer span:last-child');
            if (timerEl) timerEl.textContent = formatElapsedTime(0);
            exportTimerInterval = setInterval(function() {
                const te = document.getElementById('renamer-loader-timer');
                if (te) {
                    const tv = te.querySelector('span:last-child');
                    if (tv) tv.textContent = formatElapsedTime(Date.now() - startTime);
                }
            }, 1000);
        }

        if (!ctx || typeof ctx.apiRequest !== 'function' || typeof ctx.getBaseUrl !== 'function') {
            if (exportTimerInterval) clearInterval(exportTimerInterval);
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            console.error('[AudioPlayer] executePlaylistExport: ctx.apiRequest not available');
            return;
        }

        ctx.apiRequest(ctx.getBaseUrl() + '/api/playlist/export', {
            method: 'POST',
            body: JSON.stringify({ paths: paths, filename: filename, folder: folder })
        }).then(function(body) {
            if (exportTimerInterval) clearInterval(exportTimerInterval);
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }

            if (body && body.success) {
                const t = function(key, fallback) {
                    return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
                };
                const msg = (t('metadataExportSuccess', null) || 'Playlist exportée') + ' : ' + body.filename;
                if (ctx && typeof ctx.showToast === 'function') {
                    ctx.showToast(msg, 'success');
                } else {
                    console.log('[AudioPlayer] Toast:', msg);
                }
            } else {
                const msg = 'Erreur: ' + (body && body.error ? body.error : 'Réponse inattendue');
                if (ctx && typeof ctx.showToast === 'function') {
                    ctx.showToast(msg, 'error');
                } else {
                    console.log('[AudioPlayer] Toast:', msg);
                }
            }
        }).catch(function(err) {
            if (exportTimerInterval) clearInterval(exportTimerInterval);
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            const msg = 'Erreur: ' + (err.message || err);
            if (ctx && typeof ctx.showToast === 'function') {
                ctx.showToast(msg, 'error');
            } else {
                console.log('[AudioPlayer] Toast:', msg);
            }
        });
    }

    function playAudioFileByWidget(path) {
        console.log('[AudioPlayer] playAudioFileByWidget ENTRY path=' + path);
        stopAudioPlayback();
        const streamUrl = getAudioStreamUrl(path);
        console.log('[AudioPlayer] playAudioFileByWidget streamUrl=' + streamUrl);
        if (!streamUrl) {
            console.warn('[AudioPlayer] Cannot build audio stream URL: user ID not available');
            var ctx = lastCtx;
            if ((!ctx || !ctx.showToast) && audioWidgetEl && audioWidgetEl._ctx) {
                ctx = audioWidgetEl._ctx;
            }
            if (ctx && ctx.showToast) {
                ctx.showToast(ctx.t('metadataPlaybackError') || 'Erreur de lecture audio', 'error');
            }
            return;
        }
        ensureAudioWidget();
        widgetAudioEl._attemptedPath = path;
        widgetAudioEl._playbackErrorHandled = false;

        loadAudioProgress(path).then(function(progressPercent) {
            console.log('[AudioPlayer] loadAudioProgress result:', progressPercent);
            widgetAudioEl.src = streamUrl;

            if (progressPercent !== null && progressPercent > 0) {
                widgetAudioEl.addEventListener('loadedmetadata', function seekToProgress() {
                    widgetAudioEl.removeEventListener('loadedmetadata', seekToProgress);
                    var seekTime = progressPercent * widgetAudioEl.duration;
                    if (isFinite(seekTime) && seekTime > 0 && seekTime < widgetAudioEl.duration) {
                        console.log('[AudioPlayer] Seeking to saved progress:', seekTime, 'percent:', progressPercent);
                        widgetAudioEl.currentTime = seekTime;
                    }
                }, { once: true });
            }

            widgetAudioEl.load();
            console.log('[AudioPlayer] playAudioFileByWidget src set, trying play...');

            const playPromise = widgetAudioEl.play();
            if (playPromise !== undefined) {
                playPromise.then(function() {
                    console.log('[AudioPlayer] playAudioFileByWidget play SUCCESS');
                    currentlyPlayingPath = path;
                    audioOriginPath = path;
                    audioState = 'playing';
                    audioWidgetEl.dataset.path = path;
                    widgetAudioEl._playbackErrorHandled = false;
                    pushAudioHistory(path);
                    setupMediaSession(path);
                    startProgressSaving();
                    const titleEl = audioWidgetEl.querySelector('.metadata-audio-title');
                    const innerEl = audioWidgetEl.querySelector('.metadata-audio-title-inner');
                    if (titleEl) titleEl.title = path.replace(/^.*\//, '');
                    if (innerEl) {
                        var ctx = lastCtx;
                        if ((!ctx || !ctx.state) && audioWidgetEl && audioWidgetEl._ctx) {
                            ctx = audioWidgetEl._ctx;
                        }
                        const baseName = path.replace(/^.*\//, '');
                        const fileData = (ctx && ctx.state && ctx.state.metadataFileData) ? ctx.state.metadataFileData[path] : null;
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
                    applyDisplayMode();
                    const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
                    if (playBtn) playBtn.innerHTML = PAUSE_SVG;
                    updateAudioButtonStates();
                    updateWidgetQueueIndex();
                    refreshAudioHistoryPanel();
                    updateMediaSessionPlaybackState();
                }).catch(function(err) {
                    console.warn('[AudioPlayer] Audio playback failed:', err);
                    if (!widgetAudioEl._playbackErrorHandled) {
                        widgetAudioEl._playbackErrorHandled = true;
                        diagnoseAudioPlayback(path, streamUrl, err);
                        var ctx = lastCtx;
                        if ((!ctx || !ctx.showToast) && audioWidgetEl && audioWidgetEl._ctx) {
                            ctx = audioWidgetEl._ctx;
                        }
                        showPlaybackErrorToast(ctx, path, streamUrl);
                    }
                });
            }
        });
        widgetAudioEl.onended = function() {
            console.log('[AudioPlayer] widgetAudioEl onended');
            stopProgressSaving();
            if (currentlyPlayingPath && widgetAudioEl) {
                saveAudioProgress(currentlyPlayingPath, widgetAudioEl.currentTime, widgetAudioEl.duration);
            }
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

            if (repeatMode === 1 && audioQueueIndex >= 0 && audioQueueIndex < audioQueue.length) {
                if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                playAudioFileByWidget(audioQueue[audioQueueIndex]);
                updateAudioButtonStates();
                updateMediaSessionPlaybackState();
                return;
            }

            if (repeatMode === 2 && audioQueue.length > 0) {
                if (audioQueueIndex >= audioQueue.length - 1) {
                    audioQueueIndex = 0;
                } else {
                    audioQueueIndex++;
                }
                if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                playAudioFileByWidget(audioQueue[audioQueueIndex]);
                updateAudioButtonStates();
                updateMediaSessionPlaybackState();
                return;
            }

            if (audioQueueIndex < audioQueue.length - 1) {
                audioQueueIndex++;
                const nextPath = audioQueue[audioQueueIndex];
                if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                playAudioFileByWidget(nextPath);
            } else {
                audioQueueIndex = -1;
                updateWidgetQueueIndex();
                refreshAudioHistoryPanel();
            }
            updateRepeatButtonState();
            updateAudioButtonStates();
            updateMediaSessionPlaybackState();
        };
        widgetAudioEl.onpause = function() {
            console.log('[AudioPlayer] widgetAudioEl onpause');
            if (audioState === 'playing') {
                stopProgressSaving();
                if (currentlyPlayingPath && widgetAudioEl) {
                    saveAudioProgress(currentlyPlayingPath, widgetAudioEl.currentTime, widgetAudioEl.duration);
                }
                audioState = 'paused';
                const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
                if (playBtn) playBtn.innerHTML = PLAY_SVG;
                audioWidgetEl.classList.remove('playing');
                updateAudioButtonStates();
                updateWidgetQueueIndex();
                updateMediaSessionPlaybackState();
            }
        };
        widgetAudioEl.onerror = function(e) {
            console.warn('[AudioPlayer] widgetAudioEl onerror', e);
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
                var ctx = lastCtx;
                if ((!ctx || !ctx.showToast) && audioWidgetEl && audioWidgetEl._ctx) {
                    ctx = audioWidgetEl._ctx;
                }
                showPlaybackErrorToast(ctx, attemptedPath || path, streamUrl);
            }
        };
        console.log('[AudioPlayer] playAudioFileByWidget EXIT');
    }

    function diagnoseAudioPlayback(path, streamUrl, error) {
        console.log('[AudioPlayer] diagnoseAudioPlayback START path=' + path, 'error=', error && error.message, 'name=', error && error.name);
        if (!streamUrl) {
            console.warn('[AudioPlayer] diagnoseAudioPlayback: no streamUrl');
            return;
        }
        if (typeof fetch === 'undefined') {
            console.warn('[AudioPlayer] diagnoseAudioPlayback: fetch unavailable');
            return;
        }
        fetch(streamUrl, { method: 'GET', credentials: 'same-origin', headers: { 'Accept': 'audio/*,*/*' } })
            .then(function(response) {
                console.log('[AudioPlayer] diagnoseAudioPlayback fetch status=', response.status, 'statusText=', response.statusText, 'contentType=', response.headers.get('content-type'));
                const textPreview = response.text().then(function(text) {
                    console.log('[AudioPlayer] diagnoseAudioPlayback response body preview=', text ? String(text).substring(0, 200) : '(empty)');
                }).catch(function() {
                    console.log('[AudioPlayer] diagnoseAudioPlayback response body preview unavailable');
                });
            })
            .catch(function(err) {
                console.warn('[AudioPlayer] diagnoseAudioPlayback fetch network error:', err);
            });
    }

    function showPlaybackErrorToast(ctx, path, streamUrl) {
        const baseName = path ? path.replace(/^.*\//, '') : '';
        const t = function(key, fallback) {
            return (ctx && typeof ctx.t === 'function') ? ctx.t(key) : fallback;
        };
        const esc = function(str) {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };
        const message = t('metadataUnsupportedPlayback', 'Ce format n\'est pas lisible dans Renamer.');

        const overlay = document.createElement('div');
        overlay.id = 'metadata-playback-error-popup';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';

        const musicUrl = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('apps/music/') : (window.location.origin + '/apps/music/');
        const hasMusicApp = document.querySelector('[href*="/apps/music/"], a[href*="music"]') !== null;

        let actionsHtml = '';
        if (hasMusicApp) {
            actionsHtml += '<a type="button" class="renamer-btn" href="' + musicUrl + '" target="_blank" data-translation="metadataOpenMusic">' + esc(t('metadataOpenMusic', 'Écouter dans Music')) + '</a>';
        }
        actionsHtml += '<button type="button" class="renamer-btn" data-action="close-playback-error" data-translation="close">' + esc(t('close', 'Fermer')) + '</button>';

        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<button type="button" class="renamer-modal-close" aria-label="' + esc(t('close', 'Fermer')) + '" role="button" title="' + esc(t('close', 'Fermer')) + '" data-translation="close">×</button>' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3 data-translation="metadataPlaybackErrorTitle">' + esc(t('metadataPlaybackErrorTitle', 'Erreur de lecture')) + '</h3></div>' +
            '<p style="font-size:14px;color:var(--nc-text);line-height:1.4;">' + esc(message) + '</p>' +
            (baseName ? '<p style="font-size:13px;color:var(--nc-text-muted);word-break:break-all;">' + esc(baseName) + '</p>' : '') +
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
            stopProgressSaving();
            if (currentlyPlayingPath) {
                saveAudioProgress(currentlyPlayingPath, widgetAudioEl.currentTime, widgetAudioEl.duration);
            }
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
        updateMediaSessionPlaybackState();
        updateRepeatButtonState();
    }

    function updateAudioButtonStates() {
        console.log('[AudioPlayer] updateAudioButtonStates currentlyPlayingPath=', currentlyPlayingPath, 'audioState=', audioState);
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
        document.querySelectorAll('tr.metadata-preview-row').forEach(function(row) {
            const path = row.dataset.path;
            if (path === currentlyPlayingPath) {
                row.classList.add('metadata-row-playing');
            } else {
                row.classList.remove('metadata-row-playing');
            }
        });
        scrollToPlayingRow();
    }

    function updateRepeatButtonState() {
        const btn = document.getElementById('metadata-audio-repeat');
        if (!btn) return;
        btn.classList.remove('repeat-off', 'repeat-one', 'repeat-all');
        if (repeatMode === 0) {
            btn.innerHTML = REPEAT_OFF_SVG;
            btn.classList.add('repeat-off');
            btn.title = (lastCtx && lastCtx.t ? lastCtx.t('metadataRepeatOff') : 'Répétition désactivée') || 'Répétition désactivée';
        } else if (repeatMode === 1) {
            btn.innerHTML = REPEAT_ONE_SVG;
            btn.classList.add('repeat-one');
            btn.title = (lastCtx && lastCtx.t ? lastCtx.t('metadataRepeatOne') : 'Répéter cette piste') || 'Répéter cette piste';
        } else {
            btn.innerHTML = REPEAT_ALL_SVG;
            btn.classList.add('repeat-all');
            btn.title = (lastCtx && lastCtx.t ? lastCtx.t('metadataRepeatAll') : 'Répéter tout') || 'Répéter tout';
        }
    }

    function scrollToPlayingRow() {
        if (!currentlyPlayingPath) return;
        const row = document.querySelector('tr.metadata-preview-row[data-path="' + currentlyPlayingPath.replace(/"/g, '\\"') + '"]');
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function updateWidgetQueueIndex() {
        if (!audioWidgetEl) return;
        const indexEl = audioWidgetEl.querySelector('.metadata-audio-queue-index');
        if (!indexEl) return;
        const total = audioQueue.length;
        const current = total > 0 ? audioQueueIndex + 1 : 0;
        indexEl.textContent = total > 0 ? (current + '/' + total) : '';
    }

    function playAudioFile(ctx, path) {
        console.log('[AudioPlayer] playAudioFile ENTRY ctx.t=', typeof (ctx && ctx.t), 'path=', path);
        lastCtx = ctx;
        if (audioWidgetEl) audioWidgetEl._ctx = ctx;
        ensureAudioWidget();
        if (currentlyPlayingPath === path && audioState === 'paused') {
            console.log('[AudioPlayer] playAudioFile RESUMING paused playback for', path);
            widgetAudioEl.play();
            audioState = 'playing';
            audioWidgetEl.classList.add('playing');
            applyDisplayMode();
            const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
            if (playBtn) playBtn.innerHTML = PAUSE_SVG;
            updateAudioButtonStates();
            updateWidgetQueueIndex();
            refreshAudioHistoryPanel();
            return;
        }
        console.log('[AudioPlayer] playAudioFile STARTING playback for', path, 'current queue=', audioQueue.slice());
        const existingIndex = audioQueue.indexOf(path);
        if (existingIndex !== -1) {
            audioQueueIndex = existingIndex;
        } else {
            audioQueue.push(path);
            audioQueueIndex = audioQueue.length - 1;
        }
        playAudioFileByWidget(path);
        refreshAudioHistoryPanel();
    }

    function enqueueAudioFile(ctx, path) {
        console.log('[AudioPlayer] enqueueAudioFile path=', path);
        lastCtx = ctx;
        if (audioWidgetEl) audioWidgetEl._ctx = ctx;
        ensureAudioWidget();
        const wasClosed = !audioWidgetEl.classList.contains('visible');
        const existingIndex = audioQueue.indexOf(path);
        if (existingIndex !== -1) {
            if (wasClosed) {
                audioQueueIndex = existingIndex;
                playAudioFileByWidget(path);
            }
            return;
        }
        audioQueue.push(path);
        if (wasClosed) {
            audioQueueIndex = audioQueue.length - 1;
            playAudioFileByWidget(path);
        }
        refreshAudioHistoryPanel();
        updateWidgetQueueIndex();
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function bindTableEvents(ctx, list) {
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
                showAudioContextMenu(ctx, path, e);
            });
            let longPressTimer = null;
            let longPressTriggered = false;
            row.addEventListener('touchstart', function(e) {
                if (e.touches.length > 1) return;
                longPressTriggered = false;
                longPressTimer = setTimeout(function() {
                    longPressTriggered = true;
                    const touch = e.touches[0];
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
    }

     function getStyles() {
        return `
            body,html{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-drag:none}
            #metadata-audio-widget {
                position: fixed;
                left: 16px;
                bottom: 16px;
                width: 230px;
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
                transition: all 0.05s ease, width 0.3s ease, height 0.3s ease;
            }
            #metadata-audio-widget.visible {
                display: flex;
            }
            #metadata-audio-widget .metadata-audio-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #metadata-audio-widget .metadata-audio-row-3 {
                justify-content: center;
            }
            #metadata-audio-widget .metadata-audio-row-3 .metadata-audio-queue-index {
                margin-left: auto;
                font-variant-numeric: tabular-nums;
            }
            #metadata-audio-widget .metadata-audio-title {
                flex: 1;
                min-width: 0;
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
            #metadata-audio-widget .metadata-audio-btn.metadata-audio-play {
                transform: scale(2.0);
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
            #metadata-audio-widget .metadata-audio-row-2 {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 11px;
                color: var(--nc-text-muted);
                font-variant-numeric: tabular-nums;
            }
            #metadata-audio-widget .metadata-audio-row-2-controls {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
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
                width: 40px;
                transform: rotate(-90deg);
                margin-left: 4px;
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
                color: var(--reader-accent);
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
            #metadata-audio-widget .metadata-audio-nav-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--nc-radius);
                color: var(--nc-text-muted);
                transition: background-color 0.15s, color 0.15s;
                flex-shrink: 0;
            }
            #metadata-audio-widget .metadata-audio-nav-btn:hover {
                background: var(--nc-bg-hover);
                color: var(--nc-text);
            }
            #metadata-audio-widget .metadata-audio-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
                pointer-events: none;
            }
            #metadata-audio-widget .metadata-audio-repeat.repeat-off {
                opacity: 0.4;
            }
            #metadata-audio-widget .metadata-audio-repeat.repeat-one {
                color: var(--reader-accent);
                opacity: 1;
            }
            #metadata-audio-widget .metadata-audio-repeat.repeat-all {
                color: var(--reader-accent);
                opacity: 1;
            }
            #metadata-audio-widget .metadata-audio-history-panel {
                display: flex;
                flex-direction: column;
                border-top: 1px solid var(--nc-border);
                margin-top: 4px;
                padding-top: 4px;
                max-height: 0;
                overflow: hidden;
                font-size: 12px;
                position: relative;
                opacity: 0;
                transition: max-height 0.3s ease, opacity 0.3s ease;
            }
            #metadata-audio-widget .metadata-audio-history-panel.visible {
                opacity: 1;
                max-height: 300px;
            }
            #metadata-audio-widget .metadata-audio-history-actions {
                position: absolute;
                right: 2px;
                bottom: 2px;
            }
            #metadata-audio-widget .metadata-audio-history-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 4px 10px;
                font-size: 12px;
                font-weight: 500;
                color: var(--nc-text);
            }
            #metadata-audio-widget .metadata-audio-history-list {
                overflow-y: auto;
                max-height: 140px;
            }
            #metadata-audio-widget .metadata-audio-history-drag-handle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                opacity: 0.4;
                cursor: grab;
                pointer-events: auto;
            }
            #metadata-audio-widget .metadata-audio-history-drag-handle:hover {
                opacity: 0.8;
            }
            #metadata-audio-widget .metadata-audio-history-item:hover {
                background: var(--nc-bg-hover);
            }
            #metadata-audio-widget .metadata-audio-history-item.metadata-audio-history-current {
                opacity: 0.5;
                pointer-events: none;
            }
            #metadata-audio-widget .metadata-audio-history-delete-btn {
                pointer-events: auto;
                opacity: 0.7;
                margin-left: auto;
            }
            #metadata-audio-widget .metadata-audio-history-delete-btn:hover {
                opacity: 1;
            }
            #metadata-audio-widget .metadata-audio-history-ghost {
                opacity: 0.4;
            }
            #metadata-audio-widget .metadata-audio-history-menu {
                position: absolute;
                right: 32px;
                bottom: 28px;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 4px;
                z-index: 10040;
                min-width: 180px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            #metadata-audio-widget .metadata-audio-history-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                cursor: pointer;
                border-radius: var(--nc-radius);
                font-size: 13px;
                background: transparent;
                border: none;
                width: 100%;
                text-align: left;
                color: var(--nc-text);
            }
            #metadata-audio-widget .metadata-audio-history-menu-item:hover {
                background: var(--nc-bg-hover);
            }
            #metadata-audio-widget .metadata-audio-history-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 0px 6px;
                cursor: pointer;
                border-radius: var(--nc-radius);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            #metadata-audio-widget .metadata-audio-history-item:hover {
                background: var(--nc-bg-hover);
            }
            #metadata-audio-widget .metadata-audio-history-item.metadata-audio-history-current {
                opacity: 0.5;
                pointer-events: none;
            }
            #metadata-audio-widget .metadata-audio-history-empty {
                padding: 6px;
                opacity: 0.6;
                text-align: center;
            }
            #metadata-audio-widget .metadata-audio-queue-index {
                font-size: 11px;
                opacity: 0.7;
                min-width: 22px;
                text-align: center;
                flex-shrink: 0;
                font-variant-numeric: tabular-nums;
            }
            .metadata-audio-context-menu {
                position: fixed;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 4px;
                z-index: 10050;
                min-width: 200px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .metadata-audio-context-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 7px 12px;
                cursor: pointer;
                border-radius: var(--nc-radius);
                font-size: 13px;
                background: transparent;
                border: none;
                width: 100%;
                text-align: left;
                color: var(--nc-text);
            }
            .metadata-audio-context-menu-item:hover {
                background: var(--nc-bg-hover);
            }
            .metadata-table .metadata-preview-row.context-menu-open {
                outline: 2px solid var(--reader-accent-bg);
                outline-offset: -2px;
                border-radius: var(--nc-radius);
                z-index: 1;
                position: relative;
            }
            .metadata-row-playing {
                background-color: rgba(124, 58, 237, 0.06) !important;
            }
            .metadata-row-playing .metadata-audio-play-btn {
                color: var(--reader-accent);
                border-color: var(--reader-accent);
                background: rgba(124, 58, 237, 0.08);
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
            .renamer-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 8px 16px;
                font-size: 13px;
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                background: var(--nc-bg);
                color: var(--nc-text);
                cursor: pointer;
            }
            .renamer-btn:hover {
                background: var(--nc-bg-hover);
            }
            .renamer-btn-primary {
                border-color: var(--reader-accent);
                background: var(--reader-accent);
                color: #fff;
            }
            .renamer-btn-primary:hover {
                background: var(--reader-accent-hover);
                border-color: var(--reader-accent-hover);
            }
            .renamer-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .renamer-btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
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
            .renamer-toast-container {
                position: fixed;
                bottom: 16px;
                right: 16px;
                z-index: 200000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            }
            .renamer-toast {
                min-width: 220px;
                max-width: 420px;
                padding: 10px 14px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                color: var(--nc-text);
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .renamer-toast-info {
                border-left: 4px solid #3b82f6;
                background: #ecf0f1;
                color: #374151;
            }
            .renamer-toast-success {
                border-left: 4px solid #22c55e;
                background: #e8f5e9;
                color: #1a7f1a;
            }
            .renamer-toast-error {
                border-left: 4px solid #ef4444;
                background: #fbe2e1;
                color: #a01818;
            }
            .renamer-toast-icon {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: bold;
                color: #fff;
                flex-shrink: 0;
            }
            .renamer-toast-info .renamer-toast-icon {
                background: #22c55e;
            }
            .renamer-toast-success .renamer-toast-icon {
                background: #22c55e;
            }
            .renamer-toast-error .renamer-toast-icon {
                background: #ef4444;
            }
            .renamer-toast-close {
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.6;
                margin-left: auto;
            }
            .renamer-toast-close:hover {
                opacity: 1;
            }
            .renamer-toast-actions {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-left: 6px;
            }
            .renamer-toast-action {
                background: var(--reader-accent);
                color: #fff;
                border: none;
                padding: 3px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                white-space: nowrap;
                transition: background 150ms ease;
            }
            .renamer-toast-action:hover {
                background: var(--reader-accent-hover);
            }
            .renamer-toast-persistent {
                padding-right: 8px;
            }
            .metadata-audio-history-empty {
                padding: 6px;
                opacity: 0.6;
                text-align: center;
            }
            .renamer-toast-loader-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 4px;
                color: var(--reader-accent);
                animation: renamer-toast-spin 0.75s linear infinite;
            }
            @keyframes renamer-toast-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            /* Display modes */
            #metadata-audio-widget.display-mode-full .metadata-audio-progress-row,
            #metadata-audio-widget.display-mode-full .metadata-audio-time-current,
            #metadata-audio-widget.display-mode-full .metadata-audio-time-total,
            #metadata-audio-widget.display-mode-full .metadata-audio-title,
            #metadata-audio-widget.display-mode-full .metadata-audio-repeat {
                display: flex;
            }
            #metadata-audio-widget.display-mode-full .metadata-audio-row-3 {
                justify-content: center;
            }
            #metadata-audio-widget.display-mode-full .metadata-audio-history-panel {
                max-height: 300px;
                opacity: 1;
            }
            #metadata-audio-widget.display-mode-reduced {
                flex-direction: row;
                flex-wrap: nowrap;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-row-1,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-row-2 {
                display: contents;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-row-3,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-progress-row,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-history-panel,
            metadata-audio-time-current,
            metadata-audio-time-total
            
            {
                display: none;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-title,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-repeat,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-queue-index,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-time-total,
            #metadata-audio-widget.display-mode-reduced .metadata-audio-time-current
            {
                display: none;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-drag-handle {
                order: 1;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-row-2-controls {
                order: 3;
                display: flex;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-display-mode-btn {
                order: 5;
            }
            #metadata-audio-widget.display-mode-reduced .metadata-audio-close {
                order: 6;
            }
            #metadata-audio-widget.display-mode-fullscreen {
                position: fixed;
                left: 0;
                top: 0;
                width: calc(100svw - 40px);
                height: calc(100svh - 40px);
                bottom: auto;
                right: auto;
                border-radius: 0;
                border: none;
                box-shadow: none;
                z-index: 10030;
                padding: 20px;
                justify-content: center;
                align-items: center;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-row {
                flex-direction: row;
                width: 100%;
                max-width: 600px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-title {
                font-size: 24px;
                padding: 20px;
                background: transparent;
                text-align: center;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-progress-row {
                width: 100%;
                max-width: 500px;
                margin: 20px 0;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-progress {
                height: 8px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-row-2 {
                flex-direction: row;
                justify-content: center;
                width: 100%;
                gap: 20px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-row-2-controls {
                display: flex;
                gap: 16px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-btn.metadata-audio-play {
                transform: scale(3);
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-nav-btn {
                width: 48px;
                height: 48px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-volume {
                width: 80px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-time-current,
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-time-total {
                font-size: 18px;
                min-width: 60px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-row-3 {
                margin-top: 30px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-repeat {
                width: 48px;
                height: 48px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-close,
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-display-mode-btn {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 48px;
                height: 48px;
                font-size: 24px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-display-mode-btn {
                right: 80px;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-drag-handle {
                display: none;
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-history-panel {
                max-height: 400px;
                opacity: 1;
                position: absolute;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                width: 100%;
                max-width: 500px;
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            #metadata-audio-widget.display-mode-fullscreen .metadata-audio-history-panel.visible {
                display: flex;
                flex-direction: column;
            }
            #metadata-audio-widget .metadata-audio-btn.metadata-audio-display-mode-btn {
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
            #metadata-audio-widget .metadata-audio-btn.metadata-audio-display-mode-btn:hover {
                background: var(--nc-bg-hover);
            }
         `;
    }

    var api = {
        init: function(ctx) {
            lastCtx = ctx;
            ensureAudioWidget();
        },
        destroy: function() {
            stopAudioPlayback();
            hideAudioHistoryPopup();
            if (audioWidgetEl && audioWidgetEl.parentNode) {
                audioWidgetEl.parentNode.removeChild(audioWidgetEl);
            }
            if (widgetAudioEl && widgetAudioEl.parentNode) {
                widgetAudioEl.parentNode.removeChild(widgetAudioEl);
            }
            audioWidgetEl = null;
            widgetAudioEl = null;
            currentlyPlayingPath = null;
            audioOriginPath = null;
            audioState = 'idle';
            audioQueue = [];
            audioQueueIndex = -1;
            repeatMode = 0;
            audioHistoryPopup = null;
        },
        getQueue: function() {
            return audioQueue.slice();
        },
        getQueueIndex: function() {
            return audioQueueIndex;
        },
        setQueue: function(paths, startIndex) {
            audioQueue = paths.slice();
            audioQueueIndex = startIndex || 0;
            if (audioQueue.length) {
                if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                playAudioFileByWidget(audioQueue[audioQueueIndex]);
            }
        },
        play: function(path, opts) {
            if (opts && opts.ctx) lastCtx = opts.ctx;
            playAudioFile(lastCtx, path);
        },
        enqueue: function(path, opts) {
            if (opts && opts.ctx) lastCtx = opts.ctx;
            enqueueAudioFile(lastCtx, path);
        },
        prev: function() {
            playPreviousAudio();
        },
        next: function() {
            playNextAudio();
        },
        pause: function() {
            if (audioState === 'playing' && widgetAudioEl) {
                if (audioWidgetEl) audioWidgetEl._ctx = lastCtx;
                widgetAudioEl.pause();
            }
        },
        resume: function() {
            if (audioState === 'paused' && currentlyPlayingPath) {
                playAudioFile(lastCtx, currentlyPlayingPath);
            }
        },
        stop: function() {
            stopAudioPlayback();
            audioQueue = [];
            audioQueueIndex = -1;
            repeatMode = 0;
            hideAudioHistoryPopup();
            if (audioWidgetEl) {
                audioWidgetEl.classList.remove('visible', 'playing');
                audioWidgetEl.dataset.path = '';
                updateWidgetQueueIndex();
            }
            updateRepeatButtonState();
        },
        refreshPanel: function() {
            refreshAudioHistoryPanel();
        },
        showHistoryPopup: function() {
            showAudioHistoryPopup();
        },
        hideHistoryPopup: function() {
            hideAudioHistoryPopup();
        },
        removeFromQueue: function(index) {
            removeFromQueue(index);
        },
        getRepeatMode: function() {
            return repeatMode;
        },
        setRepeatMode: function(mode) {
            repeatMode = mode;
            updateRepeatButtonState();
        },
        getDisplayMode: function() {
            return displayMode;
        },
        setDisplayMode: function(mode) {
            displayMode = mode % 3;
            applyDisplayMode();
            updateDisplayModeButton();
        },
        toggleDisplayMode: function() {
            toggleDisplayMode();
        },
        getState: function() {
            return {
                currentlyPlayingPath: currentlyPlayingPath,
                audioState: audioState,
                repeatMode: repeatMode,
                audioQueue: audioQueue.slice(),
                audioQueueIndex: audioQueueIndex,
                playbackFailedPaths: new Set(playbackFailedPaths)
            };
        },
        isAudioFile: function(path) {
            return isAudioFile(path);
        },
        getAudioStreamUrl: function(path) {
            return getAudioStreamUrl(path);
        },
        showPlaybackError: function(ctx, path, streamUrl) {
            lastCtx = ctx;
            showPlaybackErrorToast(ctx, path, streamUrl);
        },
        setup: function(ctx) {
            if (ctx) lastCtx = ctx;
            ensureAudioWidget();
            if (audioWidgetEl && ctx) audioWidgetEl._ctx = ctx;
        },
        updateMetadataPlayingState: function() {
            updateAudioButtonStates();
        },
        reset: function() {
            audioQueue = [];
            audioQueueIndex = -1;
            repeatMode = 0;
            audioPlayedHistory = [];
            playbackFailedPaths.clear();
            if (audioWidgetEl) {
                audioWidgetEl.classList.remove('visible', 'playing');
                audioWidgetEl.dataset.path = '';
                const playBtn = audioWidgetEl.querySelector('.metadata-audio-play');
                if (playBtn) playBtn.innerHTML = PLAY_SVG;
                updateWidgetQueueIndex();
            }
            hideAudioHistoryPopup();
            updateRepeatButtonState();
        }
    };

    (function ensureAudioStyle() {
        if (document.getElementById('audio-player-style')) return;
        var style = document.createElement('style');
        style.id = 'audio-player-style';
        style.textContent = getStyles();
        document.head.appendChild(style);
    })();

    window.RenamerAudioPlayer = api;
})();
