(function() {
    'use strict';

    // Reader tab wrapper — loads after app.js, provides ctx to app-reader.js
    function initReaderTab() {
        if (typeof RenamerApp === 'undefined' || typeof RenamerApp.registerTab === 'undefined') {
            setTimeout(initReaderTab, 100);
            return;
        }

        // Load app-reader.js if not already loaded
        if (typeof RenamerApp.registerTab === 'function') {
            var script = document.createElement('script');
            script.src = (typeof OC !== 'undefined' && OC.generateUrl ? OC.generateUrl('/apps/renamer') : '/apps/renamer') + '/js/tabs/reader/app-reader.js';
            document.head.appendChild(script);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReaderTab);
    } else {
        initReaderTab();
    }
})();