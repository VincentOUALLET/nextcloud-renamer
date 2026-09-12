(function() {
    'use strict';

    function renderEpub(blob, container, filePath, ctx) {
        container.innerHTML = '';

        // Load epub.js from CDN if not already loaded
        if (typeof window.ePub === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js';
            document.head.appendChild(script);
            script.onload = function() {
                renderEpubContent(blob, container, filePath, ctx);
            };
            script.onerror = function() {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">Impossible de charger epub.js</div>';
            };
            return Promise.resolve();
        }

        return renderEpubContent(blob, container, filePath, ctx);
    }

    function renderEpubContent(blob, container, filePath, ctx) {
        var arrayBuffer;
        try {
            arrayBuffer = blob.arrayBuffer();
        } catch (e) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">Erreur: ' + e.message + '</div>';
            return Promise.resolve();
        }

        return Promise.resolve(arrayBuffer).then(function(ab) {
            if (typeof window.ePub === 'undefined') {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">epub.js non disponible</div>';
                return;
            }

            var book = window.ePub({ url: ab });
            var rendition = book.renderTo(container, {
                width: '100%',
                height: '100%',
                method: 'default'
            });

            rendition.display();

            // Auto-save progression
            rendition.on('relocated', function(loc) {
                if (ctx && ctx.state) {
                    var pct = Math.round((loc.percentage || 0) * 100);
                    ctx.state.readerCurrentPage = pct;
                    ctx.saveProgress(filePath, 'epub_percent', pct, 100);
                }
            });

            return Promise.resolve();
        }).catch(function(err) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    window.RenamerEpubViewer = {
        renderEpub: renderEpub
    };
})();
