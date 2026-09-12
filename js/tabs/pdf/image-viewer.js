(function() {
    'use strict';

    function renderImage(blob, container, filePath, ctx) {
        container.innerHTML = '';

        var url = URL.createObjectURL(blob);
        var img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'max-width:100%;max-height:100svh;object-fit:contain;margin:auto;display:block;';
        img.alt = filePath;
        container.appendChild(img);

        // Zoom controls
        var zoomContainer = document.createElement('div');
        zoomContainer.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:8px;z-index:1000;';

        var zoomOut = document.createElement('button');
        zoomOut.className = 'renamer-btn renamer-btn-secondary';
        zoomOut.textContent = '−';
        zoomOut.style.cssText = 'width:36px;height:36px;font-size:18px;';
        zoomOut.addEventListener('click', function() { adjustZoom(-0.2); });

        var zoomLabel = document.createElement('span');
        zoomLabel.style.cssText = 'color:#fff;min-width:60px;text-align:center;line-height:36px;font-size:13px;';
        zoomLabel.textContent = '100%';

        var zoomIn = document.createElement('button');
        zoomIn.className = 'renamer-btn renamer-btn-secondary';
        zoomIn.textContent = '+';
        zoomIn.style.cssText = 'width:36px;height:36px;font-size:18px;';
        zoomIn.addEventListener('click', function() { adjustZoom(0.2); });

        zoomContainer.appendChild(zoomOut);
        zoomContainer.appendChild(zoomLabel);
        zoomContainer.appendChild(zoomIn);
        document.body.appendChild(zoomContainer);

        var zoom = 1.0;

        function adjustZoom(delta) {
            zoom = Math.max(0.2, Math.min(3.0, zoom + delta));
            img.style.transform = 'scale(' + zoom + ')';
            zoomLabel.textContent = Math.round(zoom * 100) + '%';
        }

        // Mouse wheel zoom
        img.addEventListener('wheel', function(e) {
            e.preventDefault();
            adjustZoom(e.deltaY < 0 ? 0.1 : -0.1);
        }, { passive: false });

        // Save progress
        if (ctx && ctx.state) {
            ctx.saveProgress(filePath, 'image_viewed', 1, 1);
        }

        // Cleanup on navigation
        var cleanup = function() {
            URL.revokeObjectURL(url);
            if (zoomContainer.parentNode) zoomContainer.parentNode.removeChild(zoomContainer);
        };

        return { cleanup: cleanup };
    }

    window.RenamerImageViewer = {
        renderImage: renderImage
    };
})();
