(function (L) {
    'use strict';

    var AUDIO_EXTENSIONS = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'm4b'];

    var AUDIO_MIME_MAP = {
        'mp3': 'audio/mpeg',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'opus': 'audio/ogg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'm4b': 'audio/mp4'
    };

    L.AUDIO_EXTENSIONS = AUDIO_EXTENSIONS;
    L.AUDIO_MIME_MAP = AUDIO_MIME_MAP;

    L.isAudioFile = function (f) {
        if (!f) return false;
        var ext;
        if (typeof f === 'string') {
            ext = f.replace(/^.*\./, '').toLowerCase();
        } else {
            ext = L.fileExt(f);
        }
        return AUDIO_EXTENSIONS.indexOf(ext) !== -1;
    };

    L.isAudioLibrary = function (lib) {
        return lib && lib.libraryType === 'audio';
    };

    L.getAudioMimeType = function (f) {
        var ext;
        if (typeof f === 'string') {
            ext = f.replace(/^.*\./, '').toLowerCase();
        } else {
            ext = L.fileExt(f);
        }
        return AUDIO_MIME_MAP[ext] || 'audio/mpeg';
    };

    L.formatAudioDuration = function (seconds) {
        if (!seconds || seconds <= 0) return '';
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = Math.floor(seconds % 60);
        if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        return m + ':' + (s < 10 ? '0' : '') + s;
    };

    L.playAudioFromLibrary = function (filePath, opts) {
        opts = opts || {};
        console.log('[AUDIO-LIB DEBUG] L.playAudioFromLibrary CALLED:', {
            filePath: filePath,
            opts: opts,
            hasRenamerAudioPlayer: !!window.RenamerAudioPlayer,
            hasPlayFn: !!(window.RenamerAudioPlayer && typeof window.RenamerAudioPlayer.play === 'function')
        });
        if (window.RenamerAudioPlayer && typeof window.RenamerAudioPlayer.play === 'function') {
            console.log('[AUDIO-LIB DEBUG] Delegating to window.RenamerAudioPlayer.play');
            return window.RenamerAudioPlayer.play(filePath, opts);
        }
        console.warn('[AUDIO-LIB DEBUG] Audio player not available');
        return Promise.reject(new Error('Audio player not available'));
    };

    L.canPlayAudio = function () {
        if (!window.RenamerAudioPlayer) return false;
        return typeof window.RenamerAudioPlayer.play === 'function';
    };

    L.bindAudioCardActions = function (card, file, col, lib) {
        var playBtn = card.querySelector('.lib-audio-play');
        if (playBtn) {
            playBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                L.playAudioFromLibrary(file.path);
            });
        }
    };

    L.renderAudioLibraryCard = function (lib, cols) {
        var firstFiles = L.collectAllFiles((cols[0] && cols[0].rules) ? cols[0].rules : {});
        var audioFiles = firstFiles.filter(function (f) { return L.isAudioFile(f); });
        var stats = {
            total: audioFiles.length,
            duration: audioFiles.reduce(function (sum, f) {
                return sum + (f.durationHint || f.audioDuration || 0);
            }, 0),
            extensions: {}
        };
        audioFiles.forEach(function (f) {
            var ext = L.fileExt(f);
            stats.extensions[ext] = (stats.extensions[ext] || 0) + 1;
        });
        return { audioFiles: audioFiles, stats: stats };
    };

    L.getAudioProgress = function (filePath) {
        if (L.state && L.state.bookmarks && L.state.bookmarks[filePath]) {
            var b = L.state.bookmarks[filePath];
            if (b.type === 'audio' && typeof b.value === 'number') {
                return { percent: b.value, total: b.total };
            }
        }
        return null;
    };

    L.saveAudioProgress = function (filePath, percent, total) {
        if (L.saveProgress) {
            L.saveProgress(filePath, 'audio', percent, total);
        }
    };

    var AUDIO_BOOK_PLACEHOLDER_SVG = L.AUDIO_BOOK_SVG || '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="' + (L.LIB_ACCENT || '#a855f7') + '"><circle cx="12" cy="12" r="10"/><path d="M9 9l3 3 3-3z"/></svg>';

    L.AUDIO_BOOK_PLACEHOLDER_SVG = AUDIO_BOOK_PLACEHOLDER_SVG;

})(window.RenamerLibrary);
