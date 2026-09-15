(function() {
    'use strict';

    if (!document.getElementById('renamer-spin-keyframes')) {
        var sk = document.createElement('style');
        sk.id = 'renamer-spin-keyframes';
        sk.textContent = '@keyframes renamer-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(sk);
    }

    function formatElapsedTime(ms) {
        var total = Math.floor(ms / 1000);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        var mm = (m < 10 ? '0' : '') + m;
        var ss = (s < 10 ? '0' : '') + s;
        if (h > 0) {
            var hh = (h < 10 ? '0' : '') + h;
            return hh + ':' + mm + ':' + ss;
        }
        return mm + ':' + ss;
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

    function waitForImageLoad(element, src, pageNum) {
        if (element.complete && element.naturalWidth > 0 && element.src === src) {
            element.loading = 'eager';
            return Promise.resolve();
        }
        element.loading = 'eager';
        return new Promise(function(resolve, reject) {
            var done = false;
            function onLoad() {
                if (done) return;
                done = true;
                cleanup();
                resolve();
            }
            function onError() {
                if (done) return;
                done = true;
                cleanup();
                reject(new Error('Erreur chargement page ' + pageNum));
            }
            function cleanup() {
                element.removeEventListener('load', onLoad);
                element.removeEventListener('error', onError);
            }
            element.addEventListener('load', onLoad, { once: false });
            element.addEventListener('error', onError, { once: false });
            element.src = src;
            setTimeout(function() {
                if (!done) {
                    done = true;
                    cleanup();
                    resolve();
                }
            }, 3000);
        });
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
        return self._fetchPage(pageNum).then(function(data) {
            if (data && data.success && data.dataUrl) {
                return waitForImageLoad(element, data.dataUrl, pageNum);
            }
            return Promise.reject(new Error('No dataUrl for page ' + pageNum));
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
            return 'max-width:100%;max-height:calc(100vh - 100px);min-height:200px;width:auto;height:auto;object-fit:contain;background:#000;border-radius:2px;';
        }
        return 'max-width:100%;max-height:calc(100vh - 100px);min-height:200px;width:auto;height:auto;object-fit:contain;background:#000;border-radius:2px;';
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
            self._evictLru();
            element.alt = 'Page ' + pageNum;
            element.loading = 'eager';
            return waitForImageLoad(element, cached, pageNum);
        }
        var name = self.imageNames[pageNum - 1];
        if (!name) return Promise.reject(new Error('page inconnue'));
        if (self._inflight[pageNum]) return self._inflight[pageNum];
        var promise = self.zip.file(name).async('blob').then(function(imgBlob) {
            var url = URL.createObjectURL(imgBlob);
            self.imageUrls[pageNum - 1] = url;
            self._lruOrder.push(pageNum);
            element.alt = 'Page ' + pageNum;
            element.loading = 'eager';
            delete self._inflight[pageNum];
            return waitForImageLoad(element, url, pageNum).then(function() {
                self._evictLru();
                return element;
            });
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
        return 'max-width:100%;max-height:calc(100vh - 100px);min-height:200px;width:auto;height:auto;object-fit:contain;background:#000;';
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
        return 'max-width:100%;max-height:calc(100vh - 100px);min-height:200px;width:auto;height:auto;object-fit:contain;background:#000;';
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
        var book = window.ePub(self.blob);
        self.book = book;
        var rendition = book.renderTo(container, {
            width: '100%',
            height: '100%',
            method: 'default',
            allowScriptedContent: true
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
        return book.ready.then(function() { return book; });
    };

    EpubSource.prototype.destroy = function() {
        if (this.rendition && this.rendition.destroy) {
            try { this.rendition.destroy(); } catch (e) {}
        }
        if (this.book && this.book.destroy) {
            try { this.book.destroy(); } catch (e) {}
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

        var fitMode = 'contain';
        var currentZoom = 1.0;
        var hideTimer = null;
        var PREV_SVG = window.RenamerIcons ? window.RenamerIcons.BACK : '←';
        var NEXT_SVG = window.RenamerIcons ? window.RenamerIcons.POPUP_ARROW : '→';

        var pagesContainer = document.createElement('div');
        pagesContainer.className = 'reader-pages reader-pages-slider';
        pagesContainer.dataset.direction = 'horizontal';
        pagesContainer.dataset.fitMode = fitMode;
        pagesContainer.style.cssText = 'flex:1;display:flex;flex-direction:row;overflow:visible;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);will-change:transform;box-sizing:border-box;scroll-snap-type:x mandatory;';
        container.style.position = 'relative';
        container.appendChild(pagesContainer);

        var currentPage = restorePage(ctx, filePath, totalPages);
        var direction = 'horizontal';

        function updateLayout(dir) {
            direction = dir;
            pagesContainer.dataset.direction = dir;
            if (dir === 'horizontal') {
                pagesContainer.style.flexDirection = 'row';
            } else {
                pagesContainer.style.flexDirection = 'column';
            }
            goToPage(currentPage);
        }

        function goToPage(page) {
            var offset = -(page - 1) * 100;
            if (direction === 'horizontal') {
                pagesContainer.style.transform = 'translateX(' + offset + '%)';
            } else {
                pagesContainer.style.transform = 'translateY(' + offset + '%)';
            }
            if (pageLabel) pageLabel.textContent = page + ' / ' + totalPages;
            updateNavButtons();
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
                slide.style.cssText = 'position:relative;flex:0 0 100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;scroll-snap-align:center;';
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
            if (slideInfo.img.dataset.loaded === 'error') return;
            source.renderPage(slideInfo.pageNum, slideInfo.img).then(function() {
                slideInfo.img.dataset.loaded = 'true';
                requestAnimationFrame(function() {
                    if (slideInfo.spinner.parentNode) slideInfo.spinner.style.display = 'none';
                });
            }).catch(function(err) {
                console.error('[GenericViewer] Error rendering page', slideInfo.pageNum, err);
                slideInfo.img.dataset.loaded = 'error';
                requestAnimationFrame(function() {
                    if (slideInfo.spinner.parentNode) slideInfo.spinner.style.display = 'none';
                });
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
        nav.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--nc-bg);border-top:1px solid var(--nc-border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;flex-shrink:0;opacity:1;transform:translateY(0);transition:opacity 0.2s,transform 0.3s ease;';

        var leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
        fullscreenBtn.style.cssText = 'position:absolute;right:8px;bottom:8px;';
        fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.innerHTML = PREV_SVG;
        prevBtn.disabled = currentPage <= 1;

        var pageLabel = document.createElement('span');
        pageLabel.style.cssText = 'font-size:14px;min-width:80px;text-align:center;color:var(--nc-text);cursor:pointer;';
        pageLabel.title = 'All pages / Toutes les pages';
        pageLabel.setAttribute('role', 'button');
        pageLabel.textContent = currentPage + ' / ' + totalPages;
        pageLabel.addEventListener('click', function(e) {
            e.stopPropagation();
            openPageSelector();
        });

        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.innerHTML = NEXT_SVG;
        nextBtn.disabled = currentPage >= totalPages;

        var rightGroup = document.createElement('div');
        rightGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var zoomResetBtn = document.createElement('button');
        zoomResetBtn.type = 'button';
        zoomResetBtn.className = 'renamer-btn renamer-btn-secondary';
        zoomResetBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.LOOP : '⟲';
        zoomResetBtn.title = 'Reset zoom';

        var zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '20';
        zoomSlider.max = '300';
        zoomSlider.value = '100';
        zoomSlider.step = '10';
        zoomSlider.title = 'Zoom';
        zoomSlider.style.cssText = 'width:80px;accent-color:var(--nc-blue);cursor:pointer;';

        var zoomLabel = document.createElement('span');
        zoomLabel.style.cssText = 'font-size:13px;min-width:50px;text-align:center;color:var(--nc-text);';
        zoomLabel.textContent = '100%';

        var directionToggle = document.createElement('button');
        directionToggle.type = 'button';
        directionToggle.className = 'renamer-btn renamer-btn-secondary';
        directionToggle.innerHTML = window.RenamerIcons ? window.RenamerIcons.ARROW_LEFT_RIGHT : '↕';
        directionToggle.title = 'Basculer direction / Toggle direction';

        nav.appendChild(leftGroup);
        leftGroup.appendChild(prevBtn);
        leftGroup.appendChild(pageLabel);
        leftGroup.appendChild(nextBtn);
        nav.appendChild(fullscreenBtn);
        nav.appendChild(rightGroup);
        rightGroup.appendChild(zoomResetBtn);
        rightGroup.appendChild(zoomSlider);
        rightGroup.appendChild(zoomLabel);
        rightGroup.appendChild(directionToggle);
        container.appendChild(nav);

    function updateNavButtons() {
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
        }

        function openPageSelector() {
            var existing = document.getElementById('reader-page-selector-overlay');
            if (existing) existing.remove();

            var overlay = document.createElement('div');
            overlay.id = 'reader-page-selector-overlay';
            overlay.className = 'renamer-modal-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;';

            var sheet = document.createElement('div');
            sheet.className = 'renamer-modal';
            sheet.style.cssText = 'background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);padding:20px;max-width:600px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);';

            var modalHeader = document.createElement('div');
            modalHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';

            var title = document.createElement('div');
            title.style.cssText = 'font-size:14px;font-weight:500;';
            title.textContent = 'All pages / Toutes les pages';
            modalHeader.appendChild(title);

            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'renamer-btn-icon';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Fermer');
            closeBtn.setAttribute('role', 'button');
            closeBtn.style.cssText = 'background:transparent;border:none;border-radius:50%;width:28px;height:28px;font-size:20px;cursor:pointer;color:var(--nc-text);opacity:0.6;display:flex;align-items:center;justify-content:center;';
            modalHeader.appendChild(closeBtn);
            sheet.appendChild(modalHeader);

            var grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:4px;overflow-y:auto;';

            for (var p = 1; p <= totalPages; p++) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = String(p);
                btn.dataset.page = p;
                btn.className = 'reader-page-selector-btn';
                btn.style.cssText = 'height:36px;font-size:13px;border-radius:var(--nc-radius);border:1px solid var(--nc-border);background:transparent;color:var(--nc-text);cursor:pointer;font-family:monospace;font-variant-numeric:tabular-nums;';
                if (p === currentPage) {
                    btn.style.background = 'var(--nc-blue)';
                    btn.style.color = '#fff';
                    btn.style.borderColor = 'var(--nc-blue)';
                }
                (function(pageNum) {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        goToPage(pageNum);
                        closeSelector();
                    });
                })(p);
                grid.appendChild(btn);
            }

            sheet.appendChild(grid);

            function closeSelector() {
                if (overlay.parentNode) overlay.remove();
            }

            closeBtn.addEventListener('click', closeSelector);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) closeSelector();
            });

            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeSelector();
                    document.removeEventListener('keydown', escHandler);
                }
            });

            document.body.appendChild(overlay);

            var firstBtn = grid.querySelector('button');
            if (firstBtn) firstBtn.focus();
            showCursor();
        }

        function applyZoom() {
            var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
            for (var k = 0; k < pageEls.length; k++) {
                if (currentZoom <= 1) {
                    pageEls[k].style.transform = 'none';
                } else {
                    pageEls[k].style.transform = 'scale(' + currentZoom + ')';
                }
                pageEls[k].style.transformOrigin = pageEls[k].dataset.zoomOrigin || 'center center';
                pageEls[k].style.transition = 'transform 0.2s ease-out';
                pageEls[k].style.objectFit = fitMode;
            }
            var pct = Math.round(currentZoom * 100);
            zoomSlider.value = pct;
            zoomLabel.textContent = pct + '%';
            updateZoomOverflow();
        }

        function adjustZoom(delta) {
            currentZoom = Math.max(0.2, Math.min(3.0, currentZoom + delta));
            applyZoom();
        }

        function updateZoomOverflow() {
            if (currentZoom > 1) {
                container.classList.add('reader-zoomed');
                container.style.overflow = 'auto';
                pagesContainer.style.overflow = 'visible';
            } else {
                container.classList.remove('reader-zoomed');
                container.style.overflow = 'visible';
                pagesContainer.style.overflow = 'visible';
            }
        }

        function hideCursor() {
            container.style.cursor = 'none';
            nav.style.opacity = '0';
            nav.style.transform = 'translateY(100%)';
        }

        function showCursor() {
            container.style.cursor = '';
            nav.style.opacity = '1';
            nav.style.transform = 'translateY(0)';
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(hideCursor, 2000);
        }

        var cursorTargets = [container, pagesContainer];
        cursorTargets.forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', showCursor);
            el.addEventListener('click', showCursor);
            el.addEventListener('touchstart', showCursor, { passive: true });
        });

        fullscreenBtn.addEventListener('click', function() {
            var el = container;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                el.requestFullscreen().then(function() {
                    hideTimer = setTimeout(hideCursor, 2000);
                });
            }
        });

        document.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛶';
                fullscreenBtn.title = 'Quitter plein écran / Exit fullscreen';
            } else {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
                fullscreenBtn.title = 'Plein écran / Fullscreen';
            }
            showCursor();
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
                goToPage(currentPage);
                doSaveProgress();
                renderVisiblePages();
            }
        });

        nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                pageLabel.textContent = currentPage + ' / ' + totalPages;
                updateNavButtons();
                goToPage(currentPage);
                doSaveProgress();
                renderVisiblePages();
            }
        });

        zoomSlider.addEventListener('input', function() {
            currentZoom = parseInt(zoomSlider.value, 10) / 100;
            applyZoom();
        });

        zoomResetBtn.addEventListener('click', function() {
            zoomSlider.value = '100';
            currentZoom = 1;
            applyZoom();
        });

        var onKeyDown = function(e) {
            if (!container.contains(e.target) && e.target !== document.body) {
                return;
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    container.requestFullscreen().catch(function() {});
                }
                return;
            }
            if (direction === 'horizontal') {
                if (e.key === 'ArrowLeft' && currentPage > 1) {
                    currentPage--;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    doSaveProgress();
                    renderVisiblePages();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
                    currentPage++;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    doSaveProgress();
                    renderVisiblePages();
                    e.preventDefault();
                }
            } else {
                if (e.key === 'ArrowUp' && currentPage > 1) {
                    currentPage--;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    doSaveProgress();
                    renderVisiblePages();
                    e.preventDefault();
                } else if (e.key === 'ArrowDown' && currentPage < totalPages) {
                    currentPage++;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    doSaveProgress();
                    renderVisiblePages();
                    e.preventDefault();
                }
            }
        };
        document.addEventListener('keydown', onKeyDown);

        container.addEventListener('wheel', function(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                adjustZoom(e.deltaY < 0 ? 0.1 : -0.1);
                return;
            }
            if (currentZoom > 1) {
                return;
            }
            e.preventDefault();
            var oldPage = currentPage;
            if (direction === 'horizontal' && Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
                if (e.deltaX < 0 && currentPage > 1) {
                    currentPage--;
                } else if (e.deltaX > 0 && currentPage < totalPages) {
                    currentPage++;
                }
            } else {
                if (e.deltaY < 0 && currentPage > 1) {
                    currentPage--;
                } else if (e.deltaY > 0 && currentPage < totalPages) {
                    currentPage++;
                }
            }
            if (currentPage !== oldPage) {
                updateNavButtons();
                goToPage(currentPage);
                doSaveProgress();
                renderVisiblePages();
            }
        }, { passive: false });

        container.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            var existing = document.getElementById('reader-ctx-menu');
            if (existing) existing.remove();

            var menu = document.createElement('div');
            menu.id = 'reader-ctx-menu';
            menu.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px;z-index:10002;backdrop-filter:blur(8px);min-width:160px;';

            var currentFit = fitMode;

            function makeItem(label, mode) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.style.cssText = 'background:' + (currentFit === mode ? 'rgba(0,130,201,0.3)' : 'transparent') + ';color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:13px;cursor:pointer;text-align:left;display:flex;align-items:center;justify-content:space-between;';
                btn.innerHTML = '<span>' + label + '</span>' + (currentFit === mode ? '<span style="opacity:0.6;">✓</span>' : '');
                btn.addEventListener('click', function() {
                    fitMode = mode;
                    pagesContainer.dataset.fitMode = fitMode;
                    var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
                    for (var k = 0; k < pageEls.length; k++) {
                        pageEls[k].style.objectFit = fitMode;
                    }
                    applyZoom();
                    if (menu.parentNode) menu.remove();
                    showCursor();
                });
                return btn;
            }

            menu.appendChild(makeItem('Classique', 'contain'));
            menu.appendChild(makeItem('Zoom', 'cover'));
            document.body.appendChild(menu);

            function closeMenu() {
                if (menu.parentNode) menu.remove();
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('keydown', closeMenu);
            }
            setTimeout(function() {
                document.addEventListener('click', closeMenu);
                document.addEventListener('keydown', function(ev) { if (ev.key === 'Escape') closeMenu(); });
            }, 10);
        });

        pagesContainer.addEventListener('click', function(e) {
            var img = e.target.closest('.reader-page-img, .reader-page-canvas');
            if (!img) return;
            if (fitMode === 'cover') {
                var rect = img.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width) * 100;
                var y = ((e.clientY - rect.top) / rect.height) * 100;
                img.dataset.zoomOrigin = x + '% ' + y + '%';
                adjustZoom(0.2);
                showCursor();
            }
        });

        updateZoomOverflow();
        applyZoom();
        renderVisiblePages();
        goToPage(currentPage);
        doSaveProgress();

        return {
            destroy: function() {
                document.removeEventListener('keydown', onKeyDown);
                source.destroy();
            }
        };
    }

    function renderEpubUI(ctx, container, source, filePath) {
        container.style.overflow = 'hidden';
        container.style.display = 'block';
        container.style.alignItems = 'stretch';
        container.style.position = 'relative';
        container.style.height = '100%';
        container.style.boxSizing = 'border-box';

        var nav = document.createElement('div');
        nav.className = 'reader-nav-bar';
        nav.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:var(--nc-bg);border-top:1px solid var(--nc-border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;flex-shrink:0;opacity:1;transform:translateY(0);transition:opacity 0.2s,transform 0.3s ease;';

        var leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var PREV_SVG = window.RenamerIcons ? window.RenamerIcons.BACK : '←';
        var NEXT_SVG = window.RenamerIcons ? window.RenamerIcons.POPUP_ARROW : '→';

        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.innerHTML = PREV_SVG;
        prevBtn.disabled = true;

        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.innerHTML = NEXT_SVG;
        nextBtn.disabled = true;

        var pageLabel = document.createElement('span');
        pageLabel.style.cssText = 'font-size:14px;min-width:80px;text-align:center;color:var(--nc-text);';
        pageLabel.textContent = '';

        leftGroup.appendChild(prevBtn);
        leftGroup.appendChild(pageLabel);
        leftGroup.appendChild(nextBtn);

        var rightGroup = document.createElement('div');
        rightGroup.style.cssText = 'display:flex;align-items:center;gap:8px;';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
        fullscreenBtn.style.cssText = 'position:absolute;right:8px;bottom:8px;';
        fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        rightGroup.appendChild(fullscreenBtn);
        nav.appendChild(leftGroup);
        nav.appendChild(rightGroup);

        container.appendChild(nav);

        var cursorHideTimer = null;

        function hideCursor() {
            if (document.fullscreenElement) {
                container.style.cursor = 'none';
                nav.style.opacity = '0';
                nav.style.transform = 'translateY(100%)';
            }
        }

        function showCursor() {
            container.style.cursor = '';
            nav.style.opacity = '1';
            nav.style.transform = 'translateY(0)';
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = setTimeout(hideCursor, 2000);
        }

        [container].forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', showCursor);
            el.addEventListener('click', showCursor);
            el.addEventListener('touchstart', showCursor, { passive: true });
        });

        prevBtn.addEventListener('click', function() {
            if (source.rendition && source.rendition.prev) {
                source.rendition.prev().catch(function() {});
                showCursor();
            }
        });

        nextBtn.addEventListener('click', function() {
            if (source.rendition && source.rendition.next) {
                source.rendition.next().catch(function() {});
                showCursor();
            }
        });

        fullscreenBtn.addEventListener('click', function() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen().catch(function() {});
            }
        });

        document.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛶';
                fullscreenBtn.title = 'Quitter plein écran / Exit fullscreen';
            } else {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
                fullscreenBtn.title = 'Plein écran / Fullscreen';
            }
        });

        var onKeyDown = function(e) {
            if (!container.contains(e.target) && e.target !== document.body) {
                return;
            }
            if (source.rendition && source.rendition.display && source.book && source.book.ready) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    source.rendition.prev().catch(function() {});
                    showCursor();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    source.rendition.next().catch(function() {});
                    showCursor();
                } else if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        container.requestFullscreen().catch(function() {});
                    }
                }
            }
        };
        document.addEventListener('keydown', onKeyDown);

        function updateNavButtons() {
            if (source.rendition && source.rendition.manager) {
                var mgr = source.rendition.manager;
                var current = mgr.current ? mgr.current() : null;
                if (!current || !current.section) {
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                } else {
                    try {
                        prevBtn.disabled = !current.section.prev();
                        nextBtn.disabled = !current.section.next();
                    } catch(e) {
                        prevBtn.disabled = true;
                        nextBtn.disabled = true;
                    }
                }
            } else {
                prevBtn.disabled = true;
                nextBtn.disabled = true;
            }
        }

        function updatePageLabel(loc) {
            if (loc && loc.start && loc.start.index !== undefined && loc.start.totalPages !== undefined) {
                var currentPage = loc.start.index + 1;
                var totalPages = loc.start.totalPages;
                pageLabel.textContent = currentPage + ' / ' + totalPages;
            }
        }

        return source.render(container).then(function() {
            if (source.rendition) {
                source.rendition.on('relocated', function(loc) {
                    updateNavButtons();
                    updatePageLabel(loc);
                    if (source.rendition.manager) {
                        source.rendition.manager.on('relocated', function() {
                            showCursor();
                        });
                    }
                });
                source.rendition.on('rendered', function() {
                    updateNavButtons();
                });
                source.rendition.on('location_changed', function(loc) {
                    updatePageLabel(loc);
                });
                updateNavButtons();
            }
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
            return { destroy: function() {
                document.removeEventListener('keydown', onKeyDown);
                source.destroy();
            } };
        }).catch(function(err) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--nc-red);">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    function renderFile(ctx, filePath, blob, container) {
        var startTime = Date.now();
        var timerInterval = null;

        function startReaderTimer(label) {
            if (container._readerLoadTimerInterval) {
                clearInterval(container._readerLoadTimerInterval);
                container._readerLoadTimerInterval = null;
            }
            var fileName = filePath.replace(/^.*\//, '');
            console.log('[Reader]', label, 'path:', filePath, 'elapsed: 00:00');
            container.innerHTML = '';

            var toastId = 'renamer-reader-loading-toast';
            var existingToast = document.getElementById(toastId);
            if (existingToast) existingToast.remove();

            var toastContainerEl = document.getElementById('renamer-toast-container');
            if (!toastContainerEl) {
                toastContainerEl = document.createElement('div');
                toastContainerEl.id = 'renamer-toast-container';
                toastContainerEl.className = 'renamer-toast-container';
                document.body.appendChild(toastContainerEl);
            }

            var toast = document.createElement('div');
            toast.id = toastId;
            toast.className = 'renamer-toast renamer-toast-info';
            var spinnerHtml = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span>';
            toast.innerHTML = spinnerHtml + '<span class="renamer-toast-text"></span><button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
            var textEl = toast.querySelector('.renamer-toast-text');
            textEl.textContent = (ctx.t('loading') || 'Chargement...') + ' \'' + fileName + '\' (00:00)';

            toast.querySelector('.renamer-toast-close').addEventListener('click', function() {
                if (toast.parentNode) toast.remove();
                if (container._readerLoadTimerInterval) {
                    clearInterval(container._readerLoadTimerInterval);
                    container._readerLoadTimerInterval = null;
                }
            });

            toastContainerEl.appendChild(toast);
            setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

            timerInterval = setInterval(function() {
                var elapsed = Date.now() - startTime;
                if (textEl) textEl.textContent = (ctx.t('loading') || 'Chargement...') + ' \'' + fileName + '\' (' + formatElapsedTime(elapsed) + ')';
            }, 1000);
        }

        function clearReaderTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            var toast = document.getElementById('renamer-reader-loading-toast');
            if (toast) {
                toast.classList.remove('renamer-toast-show');
                setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
            }
        }

        var ext = pathExt(filePath);
        var source = createSource(ext, blob, ctx, filePath);

        if (!source) {
            ctx.showToast('Format non supporté: ' + ext, 'error');
            return Promise.resolve();
        }

        container._renamerSource = source;
        container.setAttribute('tabindex', '-1');
        container.addEventListener('click', function() {
            container.focus();
        });

        if (source.type === 'epub') {
            startReaderTimer('EPUB load');
            return source.load().then(function() {
                clearReaderTimer();
                console.log('[Reader] EPUB loaded', 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                return renderEpubUI(ctx, container, source, filePath);
            }).catch(function(err) {
                clearReaderTimer();
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        startReaderTimer('Début du chargement');
        container.style.overflow = 'visible';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'stretch';
        container.style.height = '100%';
        container.style.boxSizing = 'border-box';

        return source.load().then(function() {
            clearReaderTimer();
            console.log('[Reader] Source loaded:', source.type, 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
            return buildReaderUI(ctx, container, source, filePath);
        }).catch(function(err) {
            clearReaderTimer();
            console.error('[Reader] Load error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    window.RenamerGenericViewer = {
        renderFile: renderFile
    };
})();
