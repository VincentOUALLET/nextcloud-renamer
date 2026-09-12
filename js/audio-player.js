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
    var HISTORY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(255, 239, 175)" class="Icon-sc-fc05f1f0-0 cJLMRD"><path d="M4.75 16.429c.414 0 .75.351.75.785 0 .434-.336.786-.75.786S4 17.648 4 17.214c0-.434.336-.785.75-.785zm13.5 0c.414 0 .75.351.75.785 0 .434-.336.786-.75.786H8.5c-.414 0-.75.352-.75.786 0-.434.336-.785.75-.785zm-13.5-4.715c.414 0 .75.352.75.786 0 .434-.336.786-.75.786S4 12.934 4 12.5c0-.434.336-.786.75-.786zm3.75 0h9.75c.414 0 .75.352.75.786a.775.775 0 0 1-.648.779l-.102.007H8.5c-.414 0-.75.352-.75.786 0-.398.282-.727.648-.779l.102-.007h9.75zM18.25 7c.414 0 .75.352.75.786a.775.775 0 0 1-.648.778l-.102.007H8.5c-.414 0-.75.351-.75.785 0-.398.282-.727.648-.779L8.5 7h9.75zM4.75 7c.414 0 .75.352.75.786 0 .434-.336.785-.75.785S4 7.786 4 7.352C4 6.916 4.336 7 4.75 7z"></path></svg>';
    var PREV_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(255, 239, 175)" class="Icon-sc-fc05f1f0-0 cJLMRD"><path d="m11.253 17.84-6.955-5.248a.736.736 0 0 1 0-1.184l6.955-5.249c.507-.383 1.247-.032 1.247.592V17.25c0 .624-.74.975-1.247.592zm8.5 0-6.955-5.248a.736.736 0 0 1 0-1.184l6.955-5.249C20.26 5.776 21 6.127 21 6.751V17.25c0 .624-.74.975-1.247.592z"></path></svg>';
    var NEXT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(255, 239, 175)" class="Icon-sc-fc05f1f0-0 cJLMRD"><path d="m12.747 17.84 6.955-5.248a.736.736 0 0 0 0-1.184L12.747 6.16c-.507-.383-1.247-.032-1.247.592V17.25c0 .624.74.975 1.247.592zm-8.5 0 6.955-5.248a.736.736 0 0 0 0-1.184L4.247 6.16C3.74 5.776 3 6.127 3 6.751V17.25c0 .624.74.975 1.247.592z"></path></svg>';
    var SETTINGS_DOTS_SVG = window.RenamerIcons.SETTINGS_DOTS;

    var REPEAT_OFF_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(255, 239, 175)" class="Icon-sc-fc05f1f0-0 cJLMRD"><path d="M7.5 7.5h9.675l-2.775-2.775 1.05-1.05L20.25 8.25l-4.5 4.5-1.05-1.05 2.775-2.775H7.5v-1.5zm11.25 9.75H9.075l2.775-2.775-1.05-1.05L3.75 16.5l4.5-4.5 1.05 1.05L8.175 11.25h10.575v1.5z"></path></svg>';
    var REPEAT_ONE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(255, 239, 175)" class="Icon-sc-fc05f1f0-0 cJLMRD"><path d="M7.5 7.5h9.675l-2.775-2.775 1.05-1.05L20.25 8.25l-4.5 4.5-1.05-1.05 2.775-2.775H7.5v-1.5zm11.25 9.75H9.075l2.775-2.775-1.05-1.05L3.75 16.5l4.5-4.5 1.05 1.05L8.175 11.25h10.575v1.5zM12 14.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z"></path></svg>';
    var REPEAT_ALL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgb(255, 239, 175)" class="Icon-sc-fc05f1f0-0 cJLMRD"><path d="M7.5 7.5h9.675l-2.775-2.775 1.05-1.05L20.25 8.25l-4.5 4.5-1.05-1.05 2.775-2.775H7.5v-1.5zm11.25 9.75H9.075l2.775-2.775-1.05-1.05L3.75 16.5l4.5-4.5 1.05 1.05L8.175 11.25h10.575v1.5z"></path></svg>';

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

    function setupMediaSession(path) {
        if (!('mediaSession' in navigator)) return;
        try {
            var baseName = path ? path.replace(/^.*\//, '') : '';
            var fileData = (lastCtx && lastCtx.state && lastCtx.state.metadataFileData) ? lastCtx.state.metadataFileData[path] : null;
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
        audioWidgetEl.innerHTML = '<div class="metadata-audio-row">' +
            '<span class="metadata-audio-drag-handle" title="' + escapeHtml('Déplacer') + '" data-translation="dragToReorder">' + DRAG_HANDLE_SVG + '</span>' +
            '<span class="metadata-audio-queue-index" title="' + escapeHtml('Position dans la file') + '" data-translation="queuePosition"></span>' +
            '<button type="button" class="metadata-audio-btn metadata-audio-play" title="' + escapeHtml('Écouter') + '" data-translation="metadataListen">' + PLAY_SVG + '</button>' +
            '<div class="metadata-audio-title"><span class="metadata-audio-title-inner"></span></div>' +
            '<button type="button" class="metadata-audio-nav-btn" id="metadata-audio-prev" title="' + escapeHtml('Précédent') + '" data-translation="metadataPrev">' + PREV_SVG + '</button>' +
            '<button type="button" class="metadata-audio-nav-btn" id="metadata-audio-next" title="' + escapeHtml('Suivant') + '" data-translation="metadataNext">' + NEXT_SVG + '</button>' +
            '<button type="button" class="metadata-audio-nav-btn metadata-audio-repeat" id="metadata-audio-repeat" title="' + escapeHtml('Répéter') + '" data-translation="metadataRepeat">' + REPEAT_OFF_SVG + '</button>' +
            '<button type="button" class="metadata-audio-nav-btn" id="metadata-audio-history" title="' + escapeHtml('Historique') + '" data-translation="metadataHistory">' + HISTORY_SVG + '</button>' +
            '<input type="range" class="metadata-audio-volume" min="0" max="1" step="0.01" value="1" title="' + escapeHtml('Volume') + '" data-translation="volume" />' +
            '<button type="button" class="metadata-audio-btn metadata-audio-close" title="' + escapeHtml('Fermer') + '" data-translation="close">×</button>' +
            '</div>' +
            '<div class="metadata-audio-progress-row"><input type="range" class="metadata-audio-progress" min="0" max="1000" value="0" title="00:00" /></div>' +
            '<div class="metadata-audio-time-row"><span class="metadata-audio-time-current">00:00</span><span class="metadata-audio-time-total">00:00</span></div>' +
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
        const historyBtn = audioWidgetEl.querySelector('#metadata-audio-history');
        let seeking = false;

        if (playBtn) {
            playBtn.addEventListener('click', function() {
                if (audioState === 'playing') {
                    widgetAudioEl.pause();
                    audioState = 'paused';
                    playBtn.innerHTML = PLAY_SVG;
                    audioWidgetEl.classList.remove('playing');
                    updateMediaSessionPlaybackState();
                } else if (audioState === 'paused') {
                    widgetAudioEl.play();
                    audioState = 'playing';
                    playBtn.innerHTML = PAUSE_SVG;
                    audioWidgetEl.classList.add('playing');
                    updateMediaSessionPlaybackState();
                } else {
                    if (widgetAudioEl.dataset.path) {
                        playAudioFileByWidget(widgetAudioEl.dataset.path);
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

        if (historyBtn) {
            historyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showAudioHistoryPopup(historyBtn);
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
        playAudioFileByWidget(prevPath);
        refreshAudioHistoryPanel();
    }

    function playNextAudio() {
        if (!audioQueue.length) return;
        if (audioQueueIndex >= audioQueue.length - 1) return;
        audioQueueIndex++;
        const nextPath = audioQueue[audioQueueIndex];
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
            '<button type="button" class="metadata-audio-context-menu-item" data-action="play" data-translation="metadataListen">' + ctx.escapeHtml(ctx.t('metadataListen') || 'Lire') + '</button>' +
            '<button type="button" class="metadata-audio-context-menu-item" data-action="enqueue" data-translation="metadataEnqueue">' + ctx.escapeHtml(ctx.t('metadataEnqueue') || 'Ajouter à la file d\'attente') + '</button>';

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

    function showAudioHistoryPopup(triggerBtn) {
        const ctx = lastCtx;
        if (!ctx) return;
        const panel = document.getElementById('metadata-audio-history-panel');
        if (!panel) return;

        if (panel.classList.contains('visible')) {
            panel.classList.remove('visible');
            panel.innerHTML = '';
            return;
        }

        if (!audioQueue.length) {
            panel.innerHTML = '<div class="metadata-audio-history-empty">' + ctx.escapeHtml(ctx.t('metadataHistoryEmpty') || 'Aucun historique') + '</div>' +
                '<div class="metadata-audio-history-actions">' +
                    '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + ctx.escapeHtml(ctx.t('more') || 'Plus') + '" data-translation="more" disabled>' + SETTINGS_DOTS_SVG + '</button>' +
                '</div>';
            panel.classList.add('visible');
            return;
        }

        let html = '';
        audioQueue.forEach(function(path, index) {
            const isCurrent = path === currentlyPlayingPath;
            const baseName = path.replace(/^.*\//, '');
            const cls = isCurrent ? ' metadata-audio-history-current' : '';
            html += '<div class="metadata-audio-history-item' + cls + '" data-path="' + ctx.escapeHtml(path) + '" data-index="' + index + '">' +
                '<span style="opacity:0.5;min-width:18px;text-align:right;margin-right:4px;font-size:11px;font-variant-numeric:tabular-nums;">' + (index + 1) + '</span>' +
                '<span style="overflow:hidden;text-overflow:ellipsis;flex:1;">' + ctx.escapeHtml(baseName) + '</span></div>';
        });
        html += '<div class="metadata-audio-history-actions">' +
            '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + ctx.escapeHtml(ctx.t('more') || 'Plus') + '" data-translation="more">' + SETTINGS_DOTS_SVG + '</button>' +
        '</div>';
        panel.innerHTML = html;
        panel.classList.add('visible');

        panel.querySelectorAll('.metadata-audio-history-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const path = this.dataset.path;
                const index = parseInt(this.dataset.index, 10);
                if (path && path !== currentlyPlayingPath) {
                    audioQueueIndex = index;
                    playAudioFileByWidget(path);
                }
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
            panel.innerHTML = '';
        }
        audioHistoryPopup = null;
    }

    function refreshAudioHistoryPanel() {
        const panel = document.getElementById('metadata-audio-history-panel');
        if (!panel || !panel.classList.contains('visible')) return;
        const ctx = lastCtx;
        if (!ctx || !audioQueue.length) {
            panel.innerHTML = '<div class="metadata-audio-history-empty">' + ctx.escapeHtml(ctx.t('metadataHistoryEmpty') || 'Aucun historique') + '</div>' +
                '<div class="metadata-audio-history-actions">' +
                    '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + ctx.escapeHtml(ctx.t('more') || 'Plus') + '" data-translation="more" disabled>' + SETTINGS_DOTS_SVG + '</button>' +
                '</div>';
            return;
        }
        let html = '';
        audioQueue.forEach(function(path, index) {
            const isCurrent = path === currentlyPlayingPath;
            const baseName = path.replace(/^.*\//, '');
            const cls = isCurrent ? ' metadata-audio-history-current' : '';
            html += '<div class="metadata-audio-history-item' + cls + '" data-path="' + ctx.escapeHtml(path) + '" data-index="' + index + '">' +
                '<span style="opacity:0.5;min-width:18px;text-align:right;margin-right:4px;font-size:11px;font-variant-numeric:tabular-nums;">' + (index + 1) + '</span>' +
                '<span style="overflow:hidden;text-overflow:ellipsis;flex:1;">' + ctx.escapeHtml(baseName) + '</span></div>';
        });
        html += '<div class="metadata-audio-history-actions">' +
            '<button type="button" class="metadata-audio-nav-btn metadata-audio-history-more-btn" title="' + ctx.escapeHtml(ctx.t('more') || 'Plus') + '" data-translation="more">' + SETTINGS_DOTS_SVG + '</button>' +
        '</div>';
        panel.innerHTML = html;
        panel.querySelectorAll('.metadata-audio-history-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const path = this.dataset.path;
                const index = parseInt(this.dataset.index, 10);
                if (path && path !== currentlyPlayingPath) {
                    audioQueueIndex = index;
                    playAudioFileByWidget(path);
                }
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

        const menu = document.createElement('div');
        menu.className = 'metadata-audio-history-menu';
        menu.innerHTML = '<button type="button" class="metadata-audio-history-menu-item" data-action="export-playlist" data-translation="metadataExportPlaylist">' + ctx.escapeHtml(ctx.t('metadataExportPlaylist') || 'Exporter vers playlist') + '</button>';
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

        const overlay = document.createElement('div');
        overlay.id = 'metadata-playlist-export-popup';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';

        const currentPath = (typeof RenamerNavigation !== 'undefined') ? RenamerNavigation.getCurrentPath() : '/';
        const defaultName = currentPath === '/' ? 'playlist.m3u8' : currentPath.split('/').filter(Boolean).pop() + '.m3u8';

        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<button type="button" class="renamer-modal-close" aria-label="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" role="button" title="' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '" data-translation="close">×</button>' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3 data-translation="metadataExportPlaylistTitle">' + ctx.escapeHtml(ctx.t('metadataExportPlaylistTitle') || 'Exporter la playlist') + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;" data-translation="metadataExportPlaylistDesc">Créer un fichier playlist dans le dossier courant :</div>' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<label style="min-width:80px;font-weight:500;text-align:right;" data-translation="metadataPlaylistFilename">' + ctx.escapeHtml(ctx.t('metadataPlaylistFilename') || 'Nom du fichier') + '</label>' +
                '<input type="text" id="metadata-playlist-filename-input" value="' + ctx.escapeHtml(defaultName) + '" style="flex:1;padding:6px 10px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);" />' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                '<button type="button" class="renamer-btn" data-action="cancel-playlist-export" data-translation="cancel">' + ctx.escapeHtml(ctx.t('cancel') || 'Annuler') + '</button>' +
                '<button type="button" class="renamer-btn renamer-btn-primary" data-action="confirm-playlist-export" data-translation="metadataExportPlaylist">' + ctx.escapeHtml(ctx.t('metadataExportPlaylist') || 'Exporter') + '</button>' +
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
            ctx.showToast(ctx.t('metadataNoHistory') || 'Aucun titre dans la file d\'attente', 'error');
            return;
        }

        const modal = document.getElementById('renamer-modal');
        if (modal) {
            modal.classList.add('renamer-loading');
            const loader = document.createElement('div');
            loader.id = 'renamer-loader';
            loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:50;font-size:16px;font-weight:bold;color:var(--nc-blue);';
            loader.textContent = ctx.t('metadataExporting') || 'Export en cours...';
            loader.setAttribute('data-translation', 'metadataExporting');
            modal.appendChild(loader);
        }

        ctx.apiRequest(ctx.getBaseUrl() + '/api/playlist/export', {
            method: 'POST',
            body: JSON.stringify({ paths: paths, filename: filename, folder: folder })
        }).then(function(body) {
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }

            if (body && body.success) {
                ctx.showToast((ctx.t('metadataExportSuccess') || 'Playlist exportée') + ' : ' + body.filename, 'success');
            } else {
                ctx.showToast('Erreur: ' + (body && body.error ? body.error : 'Réponse inattendue'), 'error');
            }
        }).catch(function(err) {
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            ctx.showToast('Erreur: ' + (err.message || err), 'error');
        });
    }

    function playAudioFileByWidget(path) {
        console.log('[AudioPlayer] playAudioFileByWidget ENTRY path=' + path);
        stopAudioPlayback();
        const streamUrl = getAudioStreamUrl(path);
        console.log('[AudioPlayer] playAudioFileByWidget streamUrl=' + streamUrl);
        if (!streamUrl) {
            console.warn('[AudioPlayer] Cannot build audio stream URL: user ID not available');
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
                updateWidgetQueueIndex();
                refreshAudioHistoryPanel();
                updateMediaSessionPlaybackState();
            }).catch(function(err) {
                console.warn('[AudioPlayer] Audio playback failed:', err);
                if (!widgetAudioEl._playbackErrorHandled) {
                    widgetAudioEl._playbackErrorHandled = true;
                    diagnoseAudioPlayback(path, streamUrl, err);
                    showPlaybackErrorToast(ctx, path, streamUrl);
                }
            });
        }
        widgetAudioEl.onended = function() {
            console.log('[AudioPlayer] widgetAudioEl onended');
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
                playAudioFileByWidget(audioQueue[audioQueueIndex]);
                updateAudioButtonStates();
                updateMediaSessionPlaybackState();
                return;
            }

            if (audioQueueIndex < audioQueue.length - 1) {
                audioQueueIndex++;
                const nextPath = audioQueue[audioQueueIndex];
                playAudioFileByWidget(nextPath);
            } else {
                audioQueue = [];
                audioQueueIndex = -1;
                updateWidgetQueueIndex();
                refreshAudioHistoryPanel();
            }
            updateAudioButtonStates();
            updateMediaSessionPlaybackState();
        };
        widgetAudioEl.onpause = function() {
            console.log('[AudioPlayer] widgetAudioEl onpause');
            if (audioState === 'playing') {
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
        repeatMode = 0;
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
        console.log('[AudioPlayer] playAudioFile ENTRY ctx.t=', typeof ctx.t, 'path=', path);
        lastCtx = ctx;
        ensureAudioWidget();
        if (currentlyPlayingPath === path && audioState === 'paused') {
            console.log('[AudioPlayer] playAudioFile RESUMING paused playback for', path);
            widgetAudioEl.play();
            audioState = 'playing';
            audioWidgetEl.classList.add('playing');
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
                color: var(--nc-blue);
                opacity: 1;
            }
            #metadata-audio-widget .metadata-audio-repeat.repeat-all {
                color: var(--nc-green);
                opacity: 1;
            }
            #metadata-audio-widget .metadata-audio-history-panel {
                display: none;
                flex-direction: column;
                border-top: 1px solid var(--nc-border);
                margin-top: 4px;
                padding-top: 4px;
                max-height: 180px;
                overflow-y: auto;
                font-size: 12px;
                position: relative;
            }
            #metadata-audio-widget .metadata-audio-history-panel.visible {
                display: flex;
            }
            #metadata-audio-widget .metadata-audio-history-actions {
                position: absolute;
                right: 2px;
                bottom: 2px;
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
                padding: 4px 6px;
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
                outline: 2px solid var(--nc-blue);
                outline-offset: -2px;
                border-radius: var(--nc-radius);
                z-index: 1;
                position: relative;
            }
            .metadata-row-playing {
                background-color: rgba(0, 130, 201, 0.06) !important;
            }
            .metadata-row-playing .metadata-audio-play-btn {
                color: var(--nc-blue);
                border-color: var(--nc-blue);
                background: rgba(0, 120, 212, 0.08);
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
                playAudioFileByWidget(audioQueue[audioQueueIndex]);
            }
        },
        play: function(path) {
            playAudioFile(lastCtx, path);
        },
        enqueue: function(path) {
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
        setup: function(ctx) {
            if (ctx) lastCtx = ctx;
            ensureAudioWidget();
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

    window.RenamerAudioPlayer = api;
})();
