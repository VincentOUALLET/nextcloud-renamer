(function() {
    'use strict';

    function renderPdfPage(ctx, container, blob, filePath) {
        if (typeof window.pdfjsLib === 'undefined') {
            ctx.showToast('pdf.js non chargé', 'error');
            return Promise.resolve();
        }

        container.style.overflow = 'auto';
        container.style.display = 'block';
        container.style.alignItems = 'stretch';

        var pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = ctx.getBaseUrl() + '/js/pdf.worker.min.js';

        var arrayBufferPromise;
        if (blob.arrayBuffer) {
            arrayBufferPromise = blob.arrayBuffer();
        } else {
            var reader = new FileReader();
            arrayBufferPromise = new Promise(function(resolve, reject) {
                reader.onload = function() { resolve(reader.result); };
                reader.onerror = reject;
                reader.readAsArrayBuffer(blob);
            });
        }

        return arrayBufferPromise.then(function(arrayBuffer) {
            console.log('[Reader PDF] loading PDF, arrayBuffer size:', arrayBuffer.byteLength);
            return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        }).then(function(pdf) {
            container.innerHTML = '';

            var pagesContainer = document.createElement('div');
            pagesContainer.className = 'reader-pages reader-pages-slider';
            pagesContainer.dataset.direction = 'horizontal';
            pagesContainer.style.cssText = 'display:flex;flex-direction:row;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;';

            var currentPage = 1;
            var totalPages = pdf.numPages;

            var savedBm = ctx.state.bookmarks ? ctx.state.bookmarks[filePath] : null;
            if (savedBm && savedBm.type === 'pdf_page' && savedBm.value > 0 && savedBm.value <= totalPages) {
                currentPage = savedBm.value;
            }

            var direction = 'horizontal';

            function updateLayout(dir) {
                direction = dir;
                pagesContainer.dataset.direction = dir;
                if (dir === 'horizontal') {
                    pagesContainer.style.cssText = 'display:flex;flex-direction:row;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;';
                } else {
                    pagesContainer.style.cssText = 'display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;scroll-behavior:smooth;';
                }
                var canvases = pagesContainer.querySelectorAll('.reader-page-canvas');
                canvases.forEach(function(c) {
                    c.style.height = '100%';
                    c.style.boxSizing = 'border-box';
                });
                var active = canvases[currentPage - 1];
                if (active) {
                    active.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' });
                }
            }

            function getCurrentPageFromDOM() {
                var canvases = pagesContainer.querySelectorAll('.reader-page-canvas');
                if (direction === 'horizontal') {
                    for (var i = 0; i < canvases.length; i++) {
                        var rect = canvases[i].getBoundingClientRect();
                        if (rect.left >= 0 && rect.left < window.innerWidth / 2) {
                            return i + 1;
                        }
                    }
                } else {
                    for (var j = 0; j < canvases.length; j++) {
                        var r = canvases[j].getBoundingClientRect();
                        if (r.top >= 0 && r.top < window.innerHeight / 2) {
                            return j + 1;
                        }
                    }
                }
                return currentPage;
            }

            function scrollToPage(page) {
                var canvases = pagesContainer.querySelectorAll('.reader-page-canvas');
                if (canvases[page - 1]) {
                    canvases[page - 1].scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
                }
            }

            function renderPage(pageNum) {
                return pdf.getPage(pageNum).then(function(page) {
                    var viewport = page.getViewport({ scale: 1.5 });
                    var canvas = document.createElement('canvas');
                    canvas.className = 'reader-page-canvas';
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.cssText = 'max-width:100%;height:100%;box-sizing:border-box;box-shadow:0 2px 12px rgba(0,0,0,0.2);border-radius:4px;flex-shrink:0;';
                    canvas.dataset.page = pageNum;

                    var ctx2d = canvas.getContext('2d');
                    return page.render({ canvasContext: ctx2d, viewport: viewport }).promise.then(function() {
                        return canvas;
                    });
                });
            }

            var renderPromises = [];
            for (var i = 1; i <= totalPages; i++) {
                renderPromises.push((function(pageNum) {
                    return renderPage(pageNum).then(function(canvas) {
                        pagesContainer.appendChild(canvas);
                    });
                })(i));
            }

            return Promise.all(renderPromises).then(function() {
                container.appendChild(pagesContainer);
                var canvases = pagesContainer.querySelectorAll('.reader-page-canvas');
                canvases.forEach(function(c) {
                    c.style.height = '100%';
                    c.style.boxSizing = 'border-box';
                });

                var nav = document.createElement('div');
                nav.className = 'reader-nav-bar';
                nav.style.cssText = 'position:sticky;bottom:0;background:var(--nc-bg);border-top:1px solid var(--nc-border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;';

                var leftGroup = document.createElement('div');
                leftGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

                var fullscreenBtn = document.createElement('button');
                fullscreenBtn.type = 'button';
                fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
                fullscreenBtn.textContent = '⛶';
                fullscreenBtn.title = 'Plein écran / Fullscreen';

                var prevBtn = document.createElement('button');
                prevBtn.type = 'button';
                prevBtn.className = 'renamer-btn renamer-btn-secondary';
                prevBtn.textContent = '←';
                prevBtn.disabled = currentPage <= 1;

                var pageLabel = document.createElement('span');
                pageLabel.style.cssText = 'font-size:14px;min-width:80px;text-align:center;';
                pageLabel.textContent = currentPage + ' / ' + totalPages;

                var nextBtn = document.createElement('button');
                nextBtn.type = 'button';
                nextBtn.className = 'renamer-btn renamer-btn-secondary';
                nextBtn.textContent = '→';
                nextBtn.disabled = currentPage >= totalPages;

                var rightGroup = document.createElement('div');
                rightGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

                var directionToggle = document.createElement('button');
                directionToggle.type = 'button';
                directionToggle.className = 'renamer-btn renamer-btn-secondary';
                directionToggle.textContent = '⇅';
                directionToggle.title = 'Basculer direction / Toggle direction';

                nav.appendChild(leftGroup);
                leftGroup.appendChild(fullscreenBtn);
                leftGroup.appendChild(prevBtn);
                leftGroup.appendChild(pageLabel);
                leftGroup.appendChild(nextBtn);
                nav.appendChild(rightGroup);
                rightGroup.appendChild(directionToggle);
                container.appendChild(nav);

                function updateNavButtons() {
                    prevBtn.disabled = currentPage <= 1;
                    nextBtn.disabled = currentPage >= totalPages;
                }

                fullscreenBtn.addEventListener('click', function() {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        container.requestFullscreen();
                    }
                });

                directionToggle.addEventListener('click', function() {
                    var newDir = direction === 'horizontal' ? 'vertical' : 'horizontal';
                    updateLayout(newDir);
                    prevBtn.disabled = false;
                    nextBtn.disabled = false;
                    updateNavButtons();
                });

                prevBtn.addEventListener('click', function() {
                    if (currentPage > 1) {
                        currentPage--;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        updateNavButtons();
                        scrollToPage(currentPage);
                        saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                    }
                });

                nextBtn.addEventListener('click', function() {
                    if (currentPage < totalPages) {
                        currentPage++;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        updateNavButtons();
                        scrollToPage(currentPage);
                        saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                    }
                });

                container.addEventListener('keydown', function(e) {
                    if (direction === 'horizontal') {
                        if (e.key === 'ArrowLeft' && currentPage > 1) {
                            currentPage--;
                            pageLabel.textContent = currentPage + ' / ' + totalPages;
                            updateNavButtons();
                            scrollToPage(currentPage);
                            saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                            e.preventDefault();
                        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                            currentPage++;
                            pageLabel.textContent = currentPage + ' / ' + totalPages;
                            updateNavButtons();
                            scrollToPage(currentPage);
                            saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                            e.preventDefault();
                        }
                    } else {
                        if (e.key === 'ArrowUp' && currentPage > 1) {
                            currentPage--;
                            pageLabel.textContent = currentPage + ' / ' + totalPages;
                            updateNavButtons();
                            scrollToPage(currentPage);
                            saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                            e.preventDefault();
                        } else if (e.key === 'ArrowDown' && currentPage < totalPages) {
                            currentPage++;
                            pageLabel.textContent = currentPage + ' / ' + totalPages;
                            updateNavButtons();
                            scrollToPage(currentPage);
                            saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                            e.preventDefault();
                        }
                    }
                });

                var scrollHandler = function() {
                    var newPage = getCurrentPageFromDOM();
                    if (newPage !== currentPage) {
                        currentPage = newPage;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        updateNavButtons();
                        saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                    }
                };
                pagesContainer.addEventListener('scroll', scrollHandler, { passive: true });

                scrollToPage(currentPage);
                saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);

                return { pdf: pdf, pagesContainer: pagesContainer, currentPage: function() { return currentPage; }, totalPages: totalPages };
            });
        });
    }

    function saveProgress(ctx, filePath, type, value, total) {
        if (!ctx || !filePath) return;
        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
            method: 'POST',
            body: JSON.stringify({
                path: filePath,
                type: type,
                value: value,
                total: total
            })
        }).catch(function() {});
    }

    window.RenamerPdfViewer = {
        renderPdfPage: renderPdfPage,
        saveProgress: saveProgress
    };
})();
