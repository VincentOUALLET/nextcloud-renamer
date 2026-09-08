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
        window._nc_fileactions = window._nc_fileactions || [];
        if (!window._nc_fileactions.some(function(a) { return a && a.id === 'rename-auto'; })) {
            window._nc_fileactions.push({
                id: 'rename-auto',
                displayName: function() { return 'Edit multiple files'; },
                title: function() { return 'Edit multiple files'; },
                iconSvgInline: function() { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><g fill="currentColor"><g transform="translate(-0.3,-0.3) scale(0.48)"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/></g><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/><g transform="translate(10.8,10.8) scale(0.48)"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/></g></g></svg>'; },
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
