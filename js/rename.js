(function() {
    'use strict';

    function log() {
        try { console.log.apply(console, ['[Renamer]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }

    function injectScript(src, id) {
        return new Promise(function(resolve, reject) {
            if (document.getElementById(id)) { resolve(); return; }
            var script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function injectStyle(src, id) {
        if (document.getElementById(id)) return;
        var link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = src;
        document.head.appendChild(link);
    }

    function openWhenReady() {
        if (typeof RenamerApp !== 'undefined' && RenamerApp.openDialog) {
            try { RenamerApp.openDialog(); } catch (e) { log('openDialog failed', e); }
        } else {
            setTimeout(openWhenReady, 50);
        }
    }

    function registerAction() {
        window._nc_fileactions = window._nc_fileactions || [];
        if (!window._nc_fileactions.some(function(a) { return a && a.id === 'rename-auto'; })) {
            window._nc_fileactions.push({
                id: 'rename-auto',
                displayName: 'Rename Auto',
                mimeType: 'all',
                permissions: (typeof OC !== 'undefined' && OC.PERMISSION_UPDATE) ? OC.PERMISSION_UPDATE : 16,
                actionHandler: function() { openWhenReady(); },
                order: 100
            });
            log('registered file action into window._nc_fileactions (count=' + window._nc_fileactions.length + ')');
        }
    }

    function init() {
        log('loaded');
        injectStyle(OC.generateUrl('/apps/renamer/css/style'), 'renamer-css');
        registerAction();
        injectScript(OC.generateUrl('/apps/renamer/js/utils'), 'renamer-utils')
            .then(function() { return injectScript(OC.generateUrl('/apps/renamer/js/app'), 'renamer-app'); })
            .catch(function(err) {
                log('inject failed', err);
            });
    }

    if (typeof OC !== 'undefined' && OC.generateUrl) {
        init();
    } else {
        log('OC not ready, deferring init');
        window.addEventListener('DOMContentLoaded', init);
    }
})();
