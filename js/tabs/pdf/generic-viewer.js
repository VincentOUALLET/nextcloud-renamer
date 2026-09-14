(function() {
    'use strict';

    if (!document.getElementById('renamer-spin-keyframes')) {
        var sk = document.createElement('style');
        sk.id = 'renamer-spin-keyframes';
        sk.textContent = '@keyframes renamer-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(sk);
    }

    function pathExt(filePath) {
        var base = String(filePath).replace(/^.*\//, '');
        var idx = base.lastIndexOf('.');
        return idx >= 0 ? base.substring(idx).toLowerCase() : '';
    }

    function getMimeType(ext) {
        var map = {
            '.pdf': 'application/pdf',
            '.cbz': 'application/zip',
            '.cbr': 'application/x-rar-compressed',
            '.epub': 'application/epub+zip',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        return map[ext] || 'application/octet-stream';
    }

    function PdfSource(blob, ctx, filePath) {
        this.type = 'pdf';
        this.blob = blob;
        this.ctx = ctx;
        this.filePath = filePath;
        this.totalPages = 0;
        this._loadPromise = null;
        this._inflight = {};
        this._pdfJsDoc = null;
        this._pdfJsRenderCache = {};
    }

    var PDF_CACHE_MAX = 60;
    var PDF_RENDER_WIDTH = 1920;

    function pdfPageCache(ctx) {
        if (!ctx.state) ctx.state = {};
        if (!ctx.state.pdfPageCache) ctx.state.pdfPageCache = {};
        if (!ctx.state.pdfPageCacheOrder) ctx.state.pdfPageCacheOrder = [];
        return ctx.state.pdfPageCache;
    }

    function pdfPageCacheOrder(ctx) {
        if (!ctx.state) ctx.state = {};
        if (!ctx.state.pdfPageCacheOrder) ctx.state.pdfPageCacheOrder = [];
        return ctx.state.pdfPageCacheOrder;
    }

    function pdfCacheTouch(ctx, key) {
        var order = pdfPageCacheOrder(ctx);
        var idx = order.indexOf(key);
        if (idx !== -1) order.splice(idx, 1);
        order.push(key);
    }

    function pdfCacheEvict(ctx) {
        var cache = pdfPageCache(ctx);
        var order = pdfPageCacheOrder(ctx);
        while (order.length > PDF_CACHE_MAX) {
            var oldKey = order.shift();
            delete cache[oldKey];
        }
    }

     PdfSource.prototype._fetchPage = function(pageNum) {
        var self = this;
        if (self._pdfJsDoc) {
            return Promise.resolve({ success: true, pageCount: self.totalPages, pdfJs: true });
        }
        var cache = pdfPageCache(self.ctx);
        var key = self.filePath + '#' + pageNum;
        if (cache[key]) {
            pdfCacheTouch(self.ctx, key);
            return Promise.resolve({ success: true, dataUrl: cache[key], pageCount: self.totalPages });
        }
        if (self._inflight[key]) return self._inflight[key];
        var promise = self.ctx.apiRequest(self.ctx.getBaseUrl() + '/api/pdf/page?path=' + encodeURIComponent(self.filePath) + '&page=' + pageNum + '&width=' + PDF_RENDER_WIDTH, { method: 'GET' }).then(function(data) {
            if (data && data.success && data.dataUrl) {
                cache[key] = data.dataUrl;
                pdfCacheTouch(self.ctx, key);
                pdfCacheEvict(self.ctx);
            }
            if (data && data.pageCount) self.totalPages = data.pageCount;
            delete self._inflight[key];
            return data;
        }).catch(function(err) {
            delete self._inflight[key];
            throw err;
        });
        self._inflight[key] = promise;
        return promise;
    };

    PdfSource.prototype.load = function() {
        var self = this;
        if (self._loadPromise) return self._loadPromise;
        self._loadPromise = self._fetchPage(1).then(function(data) {
            if (!data || !data.success) {
                if (data && data.error === 'pdftoppm not found') {
                    return self._initPdfJsFallback();
                }
                throw new Error((data && data.error) || 'Erreur chargement PDF');
            }
            self.totalPages = data.pageCount || 0;
            var target = restorePage(self.ctx, self.filePath, self.totalPages);
            if (target > 1) {
                self._fetchPage(target);
            }
        });
        return self._loadPromise;
    };

    PdfSource.prototype.renderPage = function(pageNum, element) {
        var self = this;
        if (self._pdfJsDoc) {
            return self._renderPagePdfJs(pageNum, element);
        }
        element.src = '';
        return self._fetchPage(pageNum).then(function(data) {
            if (data && data.success && data.dataUrl) {
                element.src = data.dataUrl;
            }
        });
    };

    PdfSource.prototype._renderPagePdfJs = function(pageNum, canvas) {
        var self = this;
        if (canvas.dataset.loaded === 'true') return Promise.resolve();
        if (self._pdfJsRenderCache[pageNum]) {
            var cached = self._pdfJsRenderCache[pageNum];
            canvas.width = cached.width;
            canvas.height = cached.height;
            var ctx2d = canvas.getContext('2d');
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            ctx2d.drawImage(cached.img, 0, 0);
            canvas.dataset.loaded = 'true';
            return Promise.resolve();
        }
        return self._pdfJsDoc.getPage(pageNum).then(function(page) {
            var viewport = page.getViewport({ scale: 1.5 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            var ctx2d = canvas.getContext('2d');
            var renderContext = {
                canvasContext: ctx2d,
                viewport: viewport
            };
            return page.render(renderContext).promise;
        }).then(function() {
            canvas.dataset.loaded = 'true';
            self._pdfJsRenderCache[pageNum] = {
                width: canvas.width,
                height: canvas.height,
                img: canvas.cloneNode(true)
            };
        });
    };

    PdfSource.prototype.createPageElement = function() {
        if (this._pdfJsDoc) {
            var canvas = document.createElement('canvas');
            canvas.className = 'reader-page-canvas';
            return canvas;
        }
        var img = document.createElement('img');
        img.className = 'reader-page-img';
        img.alt = 'Page';
        return img;
    };

    PdfSource.prototype.getPageStyle = function() {
        if (this._pdfJsDoc) {
            return 'max-width:100%;width:100%;height:100%;object-fit:contain;';
        }
        return 'max-width:100%;height:100%;object-fit:contain;';
    };

     PdfSource.prototype._initPdfJsFallback = function() {
        var self = this;
        if (typeof window.pdfjsLib === 'undefined') {
            if (self.ctx && self.ctx.showToast) {
                self.ctx.showToast('pdftoppm non disponible et pdf.js non chargé', 'error');
            }
            return Promise.reject(new Error('pdftoppm not found and pdf.js unavailable'));
        }
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            var workerPath = self.ctx.getBaseUrl() + '/js/pdf.worker.min.js';
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
        }
        return window.RenamerReader.fetchFileBlob(self.ctx, self.filePath).then(function(blob) {
            return blob.arrayBuffer();
        }).then(function(arrayBuffer) {
            var loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
            return loadingTask.promise;
        }).then(function(pdf) {
            self._pdfJsDoc = pdf;
            self.totalPages = pdf.numPages;
        }).catch(function(err) {
            if (self.ctx && self.ctx.showToast) {
                self.ctx.showToast('Erreur pdf.js fallback: ' + (err && err.message ? err.message : String(err)), 'error');
            }
            throw err;
        });
    };

     PdfSource.prototype.destroy = function() {
        var cache = pdfPageCache(this.ctx);
        var order = pdfPageCacheOrder(this.ctx);
        var prefix = this.filePath + '#';
        Object.keys(cache).forEach(function(k) {
            if (k.indexOf(prefix) === 0) delete cache[k];
        });
        if (this._pdfJsDoc && this._pdfJsDoc.destroy) {
            try { this._pdfJsDoc.destroy(); } catch (e) {}
        }
        this._pdfJsDoc = null;
        this._pdfJsRenderCache = {};
        this._loadPromise = null;
        this._inflight = {};
    };

    var CBZ_CACHE_MAX = 5;

    function CbzSource(blob, ctx, filePath) {
        this.type = 'cbz';
        this.blob = blob;
        this.ctx = ctx;
        this.filePath = filePath;
        this.zip = null;
        this.imageNames = [];
        this.imageUrls = null;
        this.totalPages = 0;
        this._loadPromise = null;
        this._inflight = {};
        this._lruOrder = [];
    }

    CbzSource.prototype.load = function() {
        var self = this;
        if (self._loadPromise) return self._loadPromise;
        if (typeof JSZip === 'undefined') {
            return Promise.reject(new Error('JSZip non chargé'));
        }
        self._loadPromise = JSZip.loadAsync(self.blob).then(function(zip) {
            self.zip = zip;
            var entries = [];
            for (var name in zip.files) {
                var entry = zip.files[name];
                if (!entry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
                    entries.push(name);
                }
            }
            entries.sort(function(a, b) { return a.localeCompare(b); });
            if (entries.length === 0) {
                return Promise.reject(new Error('Aucune image trouvée dans le fichier'));
            }
            self.imageNames = entries;
            self.totalPages = entries.length;
            self.imageUrls = new Array(entries.length);
        });
        return self._loadPromise;
    };

    CbzSource.prototype.renderPage = function(pageNum, element) {
        var self = this;
        var cached = self.imageUrls[pageNum - 1];
        if (cached) {
            var idx = self._lruOrder.indexOf(pageNum);
            if (idx !== -1) self._lruOrder.splice(idx, 1);
            self._lruOrder.push(pageNum);
            element.src = cached;
            element.alt = 'Page ' + pageNum;
            element.loading = 'lazy';
            return Promise.resolve(element);
        }
        var name = self.imageNames[pageNum - 1];
        if (!name) return Promise.reject(new Error('page inconnue'));
        if (self._inflight[pageNum]) return self._inflight[pageNum];
        var promise = self.zip.file(name).async('blob').then(function(imgBlob) {
            var url = URL.createObjectURL(imgBlob);
            self.imageUrls[pageNum - 1] = url;
            self._lruOrder.push(pageNum);
            self._evictLru();
            element.src = url;
            element.alt = 'Page ' + pageNum;
            element.loading = 'lazy';
            delete self._inflight[pageNum];
            return element;
        }).catch(function(err) {
            delete self._inflight[pageNum];
            throw err;
        });
        self._inflight[pageNum] = promise;
        return promise;
    };

    CbzSource.prototype._evictLru = function() {
        var self = this;
        while (self._lruOrder.length > CBZ_CACHE_MAX) {
            var oldPage = self._lruOrder.shift();
            var oldUrl = self.imageUrls[oldPage - 1];
            if (oldUrl) {
                URL.revokeObjectURL(oldUrl);
                self.imageUrls[oldPage - 1] = null;
            }
        }
    };

    CbzSource.prototype.createPageElement = function() {
        var img = document.createElement('img');
        img.className = 'reader-page-img';
        return img;
    };

    CbzSource.prototype.getPageStyle = function() {
        return 'max-width:100%;height:100%;object-fit:contain;';
    };

    CbzSource.prototype.destroy = function() {
        if (this.imageUrls) {
            this.imageUrls.forEach(function(url) { if (url) URL.revokeObjectURL(url); });
            this.imageUrls = [];
        }
        this.imageNames = [];
        this._lruOrder = [];
        this.zip = null;
        this._loadPromise = null;
        this._inflight = {};
    };

    function ImageSource(blob, ctx, filePath) {
        this.type = 'image';
        this.blob = blob;
        this.ctx = ctx;
        this.filePath = filePath;
        this.imageUrl = null;
        this.totalPages = 1;
    }

    ImageSource.prototype.load = function() {
        var self = this;
        self.imageUrl = URL.createObjectURL(self.blob);
        return Promise.resolve();
    };

    ImageSource.prototype.renderPage = function(pageNum, element) {
        var img = element;
        img.src = this.imageUrl;
        img.alt = this.filePath.replace(/^.*\//, '');
        return Promise.resolve(img);
    };

    ImageSource.prototype.createPageElement = function() {
        var img = document.createElement('img');
        img.className = 'reader-page-img';
        return img;
    };

    ImageSource.prototype.getPageStyle = function() {
        return 'max-width:100%;height:100%;object-fit:contain;';
    };

    ImageSource.prototype.destroy = function() {
        if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
        this.imageUrl = null;
    };

    function EpubSource(blob, ctx, filePath) {
        this.type = 'epub';
        this.blob = blob;
        this.ctx = ctx;
        this.filePath = filePath;
        this.book = null;
        this.rendition = null;
        this._blobUrl = null;
    }

    EpubSource.prototype.load = function() {
        var self = this;
        if (typeof window.ePub !== 'undefined') {
            return Promise.resolve();
        }
        return new Promise(function(resolve, reject) {
            var baseUrl = '';
            if (typeof OC !== 'undefined' && OC.getBaseUrl) {
                baseUrl = OC.getBaseUrl();
            } else if (self.ctx && typeof self.ctx.getBaseUrl === 'function') {
                baseUrl = self.ctx.getBaseUrl().replace(/\/$/, '');
            }
            var script = document.createElement('script');
            script.src = baseUrl + '/js/epub.min.js';
            script.onload = function() {
                if (window.ePub) { resolve(); } else { reject(new Error('epub.js non disponible')); }
            };
            script.onerror = function() { reject(new Error('Impossible de charger epub.js')); };
            document.head.appendChild(script);
        });
    };

    EpubSource.prototype.render = function(container) {
        var self = this;
        if (!window.ePub) {
            return Promise.reject(new Error('epub.js non disponible'));
        }
        self._blobUrl = URL.createObjectURL(self.blob);
        var book = window.ePub(self._blobUrl);
        self.book = book;
        var rendition = book.renderTo(container, {
            width: '100%',
            height: '100%',
            method: 'default'
        });
        self.rendition = rendition;
        book.ready.then(function() {
            rendition.display().catch(function() {});
        });
        rendition.on('relocated', function(loc) {
            if (self.ctx && self.ctx.state && typeof self.ctx.saveProgress === 'function') {
                var pct = Math.round((loc.percentage || 0) * 100);
                self.ctx.state.readerCurrentPage = pct;
                self.ctx.saveProgress(self.filePath, 'epub_percent', pct, 100);
            }
        });
        return book;
    };

    EpubSource.prototype.destroy = function() {
        if (this.rendition && this.rendition.destroy) {
            try { this.rendition.destroy(); } catch (e) {}
        }
        if (this.book && this.book.destroy) {
            try { this.book.destroy(); } catch (e) {}
        }
        if (this._blobUrl) {
            URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = null;
        }
        this.rendition = null;
        this.book = null;
    };

    function createSource(ext, blob, ctx, filePath) {
        if (ext === '.pdf') return new PdfSource(blob, ctx, filePath);
        if (ext === '.cbz' || ext === '.cbr') return new CbzSource(blob, ctx, filePath);
        if (/\.(jpe?g|png|gif|webp)$/i.test(ext)) return new ImageSource(blob, ctx, filePath);
        if (ext === '.epub') return new EpubSource(blob, ctx, filePath);
        return null;
    }

    function getBookmarks(ctx) {
        var s = ctx && ctx.state;
        if (!s) return {};
        return s.bookmarks || s.readerBookmarks || {};
    }

    function saveProgress(ctx, filePath, pageType, currentPage, totalPages) {
        if (ctx && ctx.saveProgress) {
            ctx.saveProgress(filePath, pageType, currentPage, totalPages);
        } else if (ctx && ctx.apiRequest && ctx.getBaseUrl) {
            ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
                method: 'POST',
                body: JSON.stringify({ path: filePath, type: pageType, value: currentPage, total: totalPages })
            }).catch(function() {});
        }
    }

    function restorePage(ctx, filePath, totalPages) {
        var savedBm = getBookmarks(ctx)[filePath];
        if (savedBm && savedBm.value > 0 && savedBm.value <= totalPages) {
            return savedBm.value;
        }
        return 1;
    }

    function buildReaderUI(ctx, container, source, filePath) {
        var totalPages = source.totalPages;
        container.innerHTML = '';

        var pagesContainer = document.createElement('div');
        pagesContainer.className = 'reader-pages reader-pages-slider';
        pagesContainer.dataset.direction = 'horizontal';
        pagesContainer.style.cssText = 'display:flex;flex-direction:row;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;';
        container.appendChild(pagesContainer);

        var currentPage = restorePage(ctx, filePath, totalPages);
        var direction = 'horizontal';

        function updateLayout(dir) {
            direction = dir;
            pagesContainer.dataset.direction = dir;
            if (dir === 'horizontal') {
                pagesContainer.style.cssText = 'display:flex;flex-direction:row;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;';
            } else {
                pagesContainer.style.cssText = 'display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;scroll-behavior:smooth;';
            }
            var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
            for (var i = 0; i < pageEls.length; i++) {
                pageEls[i].style.height = '100%';
                pageEls[i].style.boxSizing = 'border-box';
            }
            var active = pageEls[currentPage - 1];
            if (active) {
                active.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' });
            }
        }

        function getCurrentPageFromDOM() {
            var elements = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
            if (direction === 'horizontal') {
                for (var i = 0; i < elements.length; i++) {
                    var rect = elements[i].getBoundingClientRect();
                    if (rect.left >= 0 && rect.left < window.innerWidth / 2) {
                        return i + 1;
                    }
                }
            } else {
                for (var j = 0; j < elements.length; j++) {
                    var r = elements[j].getBoundingClientRect();
                    if (r.top >= 0 && r.top < window.innerHeight / 2) {
                        return j + 1;
                    }
                }
            }
            return currentPage;
        }

        function scrollToPage(page) {
            var elements = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
            if (elements[page - 1]) {
                elements[page - 1].scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
            }
        }

        function doSaveProgress() {
            saveProgress(ctx, filePath, 'reader_page', currentPage, totalPages);
        }

        var RENDER_RADIUS = 2;
        var slides = [];
        for (var i = 1; i <= totalPages; i++) {
            (function(pageNum) {
                var slide = document.createElement('div');
                slide.className = 'reader-slide';
                slide.style.cssText = 'position:relative;flex:0 0 100%;display:flex;align-items:center;justify-content:center;height:100%;box-sizing:border-box;';
                slide.dataset.page = pageNum;

                var pageEl = source.createPageElement();
                pageEl.style.cssText = source.getPageStyle();
                pageEl.dataset.page = pageNum;
                pageEl.dataset.loaded = 'false';

                var spinner = document.createElement('div');
                spinner.className = 'reader-page-spinner';
                spinner.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;';
                spinner.innerHTML = '<div style="width:32px;height:32px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;"></div>';

                slide.appendChild(pageEl);
                slide.appendChild(spinner);
                pagesContainer.appendChild(slide);

                slides.push({ pageNum: pageNum, slide: slide, img: pageEl, spinner: spinner });
            })(i);
        }

        function renderSlide(slideInfo) {
            if (slideInfo.img.dataset.loaded === 'true') return;
            source.renderPage(slideInfo.pageNum, slideInfo.img).then(function() {
                slideInfo.img.dataset.loaded = 'true';
                if (slideInfo.spinner.parentNode) slideInfo.spinner.style.display = 'none';
            }).catch(function(err) {
                console.error('[GenericViewer] Error rendering page', slideInfo.pageNum, err);
            });
        }

        function renderVisiblePages() {
            for (var k = 0; k < slides.length; k++) {
                var si = slides[k];
                if (si.pageNum >= currentPage - RENDER_RADIUS && si.pageNum <= currentPage + RENDER_RADIUS) {
                    renderSlide(si);
                }
            }
        }

        var nav = document.createElement('div');
        nav.className = 'reader-nav-bar';
        nav.style.cssText = 'position:sticky;bottom:0;background:var(--nc-bg);border-top:1px solid var(--nc-border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;';

        var leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
        fullscreenBtn.textContent = '\u26F6';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.textContent = '\u2190';
        prevBtn.disabled = currentPage <= 1;

        var pageLabel = document.createElement('span');
        pageLabel.style.cssText = 'font-size:14px;min-width:80px;text-align:center;';
        pageLabel.textContent = currentPage + ' / ' + totalPages;

        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.textContent = '\u2192';
        nextBtn.disabled = currentPage >= totalPages;

        var rightGroup = document.createElement('div');
        rightGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var zoomOutBtn = document.createElement('button');
        zoomOutBtn.type = 'button';
        zoomOutBtn.className = 'renamer-btn renamer-btn-secondary';
        zoomOutBtn.textContent = '\u2212';
        zoomOutBtn.title = 'Zoom moins';
        zoomOutBtn.style.cssText = 'width:32px;height:32px;font-size:16px;';

        var zoomLabel = document.createElement('span');
        zoomLabel.style.cssText = 'font-size:13px;min-width:50px;text-align:center;';
        zoomLabel.textContent = '100%';

        var zoomInBtn = document.createElement('button');
        zoomInBtn.type = 'button';
        zoomInBtn.className = 'renamer-btn renamer-btn-secondary';
        zoomInBtn.textContent = '+';
        zoomInBtn.title = 'Zoom plus';
        zoomInBtn.style.cssText = 'width:32px;height:32px;font-size:16px;';

        var directionToggle = document.createElement('button');
        directionToggle.type = 'button';
        directionToggle.className = 'renamer-btn renamer-btn-secondary';
        directionToggle.textContent = '\u21D3';
        directionToggle.title = 'Basculer direction / Toggle direction';

        nav.appendChild(leftGroup);
        leftGroup.appendChild(fullscreenBtn);
        leftGroup.appendChild(prevBtn);
        leftGroup.appendChild(pageLabel);
        leftGroup.appendChild(nextBtn);
        nav.appendChild(rightGroup);
        rightGroup.appendChild(zoomOutBtn);
        rightGroup.appendChild(zoomLabel);
        rightGroup.appendChild(zoomInBtn);
        rightGroup.appendChild(directionToggle);
        container.appendChild(nav);

        function updateNavButtons() {
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
        }

        var zoom = 1.0;

        function applyZoom() {
            var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
            for (var k = 0; k < pageEls.length; k++) {
                pageEls[k].style.transform = 'scale(' + zoom + ')';
            }
            zoomLabel.textContent = Math.round(zoom * 100) + '%';
        }

        function adjustZoom(delta) {
            zoom = Math.max(0.2, Math.min(3.0, zoom + delta));
            applyZoom();
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
                doSaveProgress();
            }
        });

        nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                pageLabel.textContent = currentPage + ' / ' + totalPages;
                updateNavButtons();
                scrollToPage(currentPage);
                doSaveProgress();
            }
        });

        zoomOutBtn.addEventListener('click', function() { adjustZoom(-0.1); });
        zoomInBtn.addEventListener('click', function() { adjustZoom(0.1); });

        container.addEventListener('keydown', function(e) {
            if (direction === 'horizontal') {
                if (e.key === 'ArrowLeft' && currentPage > 1) {
                    currentPage--;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    scrollToPage(currentPage);
                    doSaveProgress();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                    currentPage++;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    scrollToPage(currentPage);
                    doSaveProgress();
                    e.preventDefault();
                }
            } else {
                if (e.key === 'ArrowUp' && currentPage > 1) {
                    currentPage--;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    scrollToPage(currentPage);
                    doSaveProgress();
                    e.preventDefault();
                } else if (e.key === 'ArrowDown' && currentPage < totalPages) {
                    currentPage++;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    scrollToPage(currentPage);
                    doSaveProgress();
                    e.preventDefault();
                }
            }
        });

        container.addEventListener('wheel', function(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                adjustZoom(e.deltaY < 0 ? 0.1 : -0.1);
            }
        }, { passive: false });

        var scrollHandler = function() {
            var newPage = getCurrentPageFromDOM();
            if (newPage !== currentPage) {
                currentPage = newPage;
                pageLabel.textContent = currentPage + ' / ' + totalPages;
                updateNavButtons();
                doSaveProgress();
            }
            renderVisiblePages();
        };
        pagesContainer.addEventListener('scroll', scrollHandler, { passive: true });

        renderVisiblePages();
        scrollToPage(currentPage, false);
        doSaveProgress();

        return {
            destroy: function() {
                source.destroy();
            }
        };
    }

    function renderEpubUI(ctx, container, source, filePath) {
        container.style.overflow = 'auto';
        container.style.display = 'block';
        container.style.alignItems = 'stretch';

        var nav = document.createElement('div');
        nav.className = 'reader-nav-bar';
        nav.style.cssText = 'position:sticky;bottom:0;background:var(--nc-bg);border-top:1px solid var(--nc-border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;';

        var leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
        fullscreenBtn.textContent = '\u26F6';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        var pageLabel = document.createElement('span');
        pageLabel.style.cssText = 'font-size:14px;min-width:80px;text-align:center;';
        pageLabel.textContent = '';

        leftGroup.appendChild(fullscreenBtn);
        leftGroup.appendChild(pageLabel);
        nav.appendChild(leftGroup);

        container.appendChild(nav);

        fullscreenBtn.addEventListener('click', function() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        });

        return source.render(container).then(function() {
            var savedBm = getBookmarks(ctx)[filePath];
            if (savedBm && savedBm.type === 'epub_percent' && savedBm.value > 0) {
                try {
                    source.book.ready.then(function() {
                        var loc = savedBm.value / 100;
                        if (source.rendition && source.rendition.goto) {
                            source.rendition.goto(loc).catch(function() {});
                        }
                    });
                } catch (e) {}
            }
            return { destroy: function() { source.destroy(); } };
        }).catch(function(err) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    function renderFile(ctx, filePath, blob, container) {
        var ext = pathExt(filePath);
        var source = createSource(ext, blob, ctx, filePath);

        if (!source) {
            ctx.showToast('Format non supporté: ' + ext, 'error');
            return Promise.resolve();
        }

        container._renamerSource = source;

        if (source.type === 'epub') {
            return source.load().then(function() {
                return renderEpubUI(ctx, container, source, filePath);
            }).catch(function(err) {
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        container.style.overflow = 'auto';
        container.style.display = 'block';
        container.style.alignItems = 'stretch';

        return source.load().then(function() {
            return buildReaderUI(ctx, container, source, filePath);
        }).catch(function(err) {
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    window.RenamerGenericViewer = {
        renderFile: renderFile
    };
})();
