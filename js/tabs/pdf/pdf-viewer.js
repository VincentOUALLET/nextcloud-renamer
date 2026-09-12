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
            pagesContainer.className = 'reader-pages';
            pagesContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px;';

            var currentPage = 1;
            var totalPages = pdf.numPages;

            function renderPage(pageNum) {
                return pdf.getPage(pageNum).then(function(page) {
                    var viewport = page.getViewport({ scale: 1.5 });
                    var canvas = document.createElement('canvas');
                    canvas.className = 'reader-page-canvas';
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.cssText = 'max-width:100%;box-shadow:0 2px 12px rgba(0,0,0,0.2);border-radius:4px;';
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
                        if (pageNum === currentPage) {
                            canvas.scrollIntoView({ behavior: 'instant', block: 'start' });
                        }
                    });
                })(i));
            }

            return Promise.all(renderPromises).then(function() {
                container.appendChild(pagesContainer);

                var footer = document.createElement('div');
                footer.className = 'reader-footer-nav';
                footer.style.cssText = 'position:sticky;bottom:0;background:var(--nc-bg);border-top:1px solid var(--nc-border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;';

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

                footer.appendChild(prevBtn);
                footer.appendChild(pageLabel);
                footer.appendChild(nextBtn);
                container.appendChild(footer);

                prevBtn.addEventListener('click', function() {
                    if (currentPage > 1) {
                        currentPage--;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        prevBtn.disabled = currentPage <= 1;
                        nextBtn.disabled = currentPage >= totalPages;
                        var canvases = pagesContainer.querySelectorAll('canvas');
                        if (canvases[currentPage - 1]) {
                            canvases[currentPage - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                        saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                    }
                });

                nextBtn.addEventListener('click', function() {
                    if (currentPage < totalPages) {
                        currentPage++;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        prevBtn.disabled = currentPage <= 1;
                        nextBtn.disabled = currentPage >= totalPages;
                        var canvases = pagesContainer.querySelectorAll('canvas');
                        if (canvases[currentPage - 1]) {
                            canvases[currentPage - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                        saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                    }
                });

                var scrollHandler = function() {
                    var canvases = pagesContainer.querySelectorAll('canvas');
                    for (var i = 0; i < canvases.length; i++) {
                        var rect = canvases[i].getBoundingClientRect();
                        if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
                            var newPage = i + 1;
                            if (newPage !== currentPage) {
                                currentPage = newPage;
                                pageLabel.textContent = currentPage + ' / ' + totalPages;
                                prevBtn.disabled = currentPage <= 1;
                                nextBtn.disabled = currentPage >= totalPages;
                                saveProgress(ctx, filePath, 'pdf_page', currentPage, totalPages);
                            }
                            break;
                        }
                    }
                };
                pagesContainer.addEventListener('scroll', scrollHandler, { passive: true });

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
