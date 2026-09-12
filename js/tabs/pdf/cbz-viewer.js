(function() {
    'use strict';

    function renderCbz(blob, container, filePath, ctx) {
        if (typeof JSZip === 'undefined') {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">JSZip non chargé</div>';
            return Promise.resolve();
        }

        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin:0 auto 12px;"></div><div>Chargement du CBZ...</div></div></div>';

        return JSZip.loadAsync(blob).then(function(zip) {
            var imageEntries = [];
            for (var name in zip.files) {
                var entry = zip.files[name];
                if (!entry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
                    imageEntries.push({ name: name, entry: entry });
                }
            }
            imageEntries.sort(function(a, b) { return a.name.localeCompare(b.name); });

            if (imageEntries.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:20px;">Aucune image trouvée dans le CBZ</div>';
                return Promise.resolve();
            }

            container.innerHTML = '';
            var viewer = document.createElement('div');
            viewer.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;';

            var imgContainer = document.createElement('div');
            imgContainer.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000;';

            var img = document.createElement('img');
            img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
            imgContainer.appendChild(img);

            var nav = document.createElement('div');
            nav.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--nc-bg-default);border-top:1px solid var(--nc-border);';

            var prevBtn = document.createElement('button');
            prevBtn.className = 'renamer-btn renamer-btn-secondary';
            prevBtn.textContent = '← Précédent';
            prevBtn.addEventListener('click', function() { showPage(currentIdx - 1); });

            var pageLabel = document.createElement('span');
            pageLabel.style.cssText = 'font-size:13px;';

            var nextBtn = document.createElement('button');
            nextBtn.className = 'renamer-btn renamer-btn-secondary';
            nextBtn.textContent = 'Suivant →';
            nextBtn.addEventListener('click', function() { showPage(currentIdx + 1); });

            nav.appendChild(prevBtn);
            nav.appendChild(pageLabel);
            nav.appendChild(nextBtn);

            viewer.appendChild(imgContainer);
            viewer.appendChild(nav);
            container.appendChild(viewer);

            var currentIdx = 0;

            function showPage(idx) {
                if (idx < 0 || idx >= imageEntries.length) return;
                currentIdx = idx;
                var entry = imageEntries[idx];
                entry.entry.async('blob').then(function(blob) {
                    if (img._url) URL.revokeObjectURL(img._url);
                    img._url = URL.createObjectURL(blob);
                    img.src = img._url;
                    pageLabel.textContent = (idx + 1) + ' / ' + imageEntries.length;
                });

                // Auto-save progression
                if (ctx && ctx.state) {
                    ctx.state.readerCurrentPage = idx;
                    ctx.saveProgress(filePath, 'cbz_page', idx, imageEntries.length);
                }
            }

            showPage(0);

            // Keyboard navigation
            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'ArrowRight') showPage(currentIdx + 1);
                if (e.key === 'ArrowLeft') showPage(currentIdx - 1);
            });

            return Promise.resolve();
        }).catch(function(err) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    window.RenamerCbzViewer = {
        renderCbz: renderCbz
    };
})();
