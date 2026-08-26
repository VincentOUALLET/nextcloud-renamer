(function() {
    'use strict';

    function log() {
        try { console.log.apply(console, ['[Renamer]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }

    function openWhenReady(files) {
        if (typeof RenamerApp !== 'undefined' && RenamerApp.openDialog) {
            try { RenamerApp.openDialog(files); } catch (e) { log('openDialog failed', e); }
        } else {
            setTimeout(function() { openWhenReady(files); }, 50);
        }
    }

    function registerAction() {
        if (typeof OC !== 'undefined' && OC.Files && OC.Files.fileActions) {
            try {
                OC.Files.fileActions.registerAction({
                    name: 'rename-auto',
                    displayName: 'Rename Auto',
                    mimeType: 'all',
                    permissions: OC.PERMISSION_UPDATE || 16,
                    actionHandler: function() { openWhenReady(); }
                });
            } catch (e) {
                log('registerAction failed', e);
            }
        }
        window._nc_fileactions = window._nc_fileactions || [];
        if (!window._nc_fileactions.some(function(a) { return a && a.id === 'rename-auto'; })) {
            window._nc_fileactions.push({
                id: 'rename-auto',
                displayName: function() { return 'Rename Auto'; },
                title: function() { return 'Rename Auto'; },
                iconSvgInline: function() { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M11.7 3.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-.4.24l-2.4.8a.5.5 0 0 1-.63-.63l.8-2.4a1 1 0 0 1 .24-.4l6-6a1 1 0 0 1 1.4 0zM12.5 2.5l1 1a1 1 0 0 1 0 1.4l-1-1a1 1 0 0 1 0-1.4z"/></svg>'; },
                mimeType: 'all',
                permissions: (typeof OC !== 'undefined' && OC.PERMISSION_UPDATE) ? OC.PERMISSION_UPDATE : 16,
                enabled: function(files) { return Array.isArray(files) ? files.length > 0 : true; },
                exec: function(file) { openWhenReady([file]); return Promise.resolve(null); },
                execBatch: function(files) { openWhenReady(files); return Promise.resolve((files || []).map(function() { return null; })); },
                order: 100
            });
            log('registered file action into window._nc_fileactions (count=' + window._nc_fileactions.length + ')');
        }
    }

    registerAction();
    log('loaded');
})();
