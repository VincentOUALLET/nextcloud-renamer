(function() {
    'use strict';

    if (!document.getElementById('renamer-generic-viewer-styles')) {
        var sk = document.createElement('style');
        sk.id = 'renamer-generic-viewer-styles';
        sk.textContent = [
            '@keyframes renamer-spin{to{transform:rotate(360deg)}}',
            ':root{--reader-overlay-filter:blur(.625rem);--nc-blue:#0082c9;--nc-bg:var(--color-main-background,#fff);--nc-text:var(--color-main-text,#000);--nc-border:var(--color-border,#ccc);--nc-red:#e02020;--nc-radius:var(--border-radius-large,8px);--reader-accent:rgb(124 58 237);--reader-accent-light:#a855f7;--reader-accent-lighter:#c4b5ff;--reader-accent-bg:rgb(124 58 237/0.15);--reader-accent-bg-hover:rgb(124 58 237/0.25);--reader-star-color:#a855f7;--reader-star-color-filled:#a855f7;--reader-page-grid-gap:16px;--nc-transition:all 300ms ease-in-out}',
            '.reader-container{position:relative}',
            '.reader-container-inner{flex:1;overflow:visible;display:flex;align-items:center;justify-content:center;background:#000;height:100%;width:100%}',
            '.reader-container-layout{overflow:visible;display:flex;flex-direction:column;align-items:stretch;height:100%;box-sizing:border-box;width:100%;background:#000}',
            '.reader-container-epub{overflow:hidden;display:block;align-items:stretch;position:relative;height:100%;box-sizing:border-box;width:100%;background:#000}',
            '.reader-pages.reader-pages-slider{flex:1;display:flex;flex-direction:row;overflow:visible;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);will-change:transform;box-sizing:border-box;scroll-snap-type:x mandatory}',
            '.reader-slide{position:relative;flex:0 0 100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;scroll-snap-align:center}',
            '.reader-page-img,.reader-page-canvas{max-width:100%;max-height:100svh;min-height:200px;width:auto;height:auto;object-fit:contain;background:#000;user-select:none;-webkit-user-drag:none;transition:transform 0.2s ease-out}',
            '.reader-page-spinner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}',
            '.reader-page-spinner > div{width:32px;height:32px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue,#0082c9);border-radius:50%;animation:renamer-spin 0.8s linear infinite}',
            '.reader-loading-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:100;pointer-events:none}',
            '.reader-loading-overlay .reader-page-spinner{width:48px;height:48px;border-width:4px}',
            '.reader-spinner-hidden{display:none}',
            '.reader-nav-bar{position:fixed;bottom:0;left:0;right:0;padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;flex-shrink:0;opacity:1;transform:translateY(0);transition:opacity 0.2s,transform 0.3s ease-webkit-backdrop-filter:var(--reader-overlay-filter);backdrop-filter:var(--reader-overlay-filter);}',
            '.reader-header-nav{position:fixed;top:0;left:0;z-index:100;padding:12px 16px;display:flex;flex-direction:column;background:rgba(0,0,0,0.5);backdrop-filter:var(--reader-overlay-filter);box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:opacity 0.2s,transform 0.3s ease}',
'.reader-header-nav-row{display:flex;align-items:center;gap:8px}',
'.reader-header-nav-back{background:transparent;border:none;border-radius:50%;width:28px;height:28px;font-size:20px;cursor:pointer;color:#fff;opacity:0.8;display:flex;align-items:center;justify-content:center}',
'.reader-header-nav-back:hover{opacity:1}',
'.reader-header-nav-collection{font-size:14px;font-weight:700;color:#fff}',
'.reader-header-nav-tome{font-size:12px;color:rgba(255,255,255,0.6)}',
'.reader-cursor-hidden .reader-header-nav{opacity:0;transform:translateY(-100%)}',
'.reader-nav-bar-epub{position:absolute}',
            '.reader-nav-group{display:flex;align-items:center;gap:8px}',
            '.reader-fullscreen-btn{position:absolute;right:8px;bottom:8px}',
            '.reader-page-label{font-size:14px;min-width:80px;text-align:center;color:var(--nc-text);cursor:pointer}',
            '.reader-zoom-slider{width:80px;accent-color:var(--nc-blue);cursor:pointer}',
            '.reader-zoom-label{font-size:13px;min-width:50px;text-align:center;color:var(--nc-text)}',
            '.reader-cursor-hidden{cursor:none}',
            '.reader-cursor-hidden *{cursor:none!important}',
            '.reader-cursor-hidden .reader-nav-bar{opacity:0;transform:translateY(100%)}',
            '.reader-zoomed{overflow:auto}',
            '.reader-zoomed .reader-pages{overflow:visible}',
            '.reader-zoomed::-webkit-scrollbar{width:12px;height:12px}',
            '.reader-zoomed::-webkit-scrollbar-track{background:var(--nc-bg)}',
            '.reader-zoomed::-webkit-scrollbar-thumb{background:var(--nc-border);border-radius:6px}',
            '.reader-zoomed::-webkit-scrollbar-thumb:hover{background:var(--nc-blue)}',
            '.reader-fit-cover .reader-page-img,.reader-fit-cover .reader-page-canvas{object-fit:cover}',
            '#reader-page-selector-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center}',
            '#reader-page-selector-overlay > .renamer-modal{box-shadow:rgba(0.6,0.6,0.6,0.6) 10px 18px 24px;-webkit-backdrop-filter:var(--reader-overlay-filter);backdrop-filter:var(--reader-overlay-filter)}',
            '.reader-page-selector-sheet{position:relative;border:1px solid var(--nc-border);border-radius:var(--nc-radius);padding:20px;max-width:800px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;color:var(--nc-text)}',
            '.reader-modal-header{display:flex;align-items:center;justify-content:space-between}',
            '.reader-modal-title{font-size:14px;font-weight:500;color:var(--color-background-hover,#666)}',
            '.reader-close-btn{background:transparent;border:none;border-radius:50%;width:28px;height:28px;font-size:20px;cursor:pointer;color:var(--nc-text);opacity:0.6;display:flex;align-items:center;justify-content:center}',
            '#reader-page-search{position:absolute;top:10px;left:50%;transform:translateX(-50%);max-width:140px;width:100%;padding:4px 8px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);font-size:13px;z-index:100}',
            '#reader-page-search::placeholder{color:var(--color-background-hover,#666);}',
            '.reader-page-selector-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:var(--reader-page-grid-gap,16px);overflow-y:auto}',
            '.reader-page-selector-btn{margin:0;padding:0;border-radius:5px}',
            'button.reader-page-selector-btn{position:relative;width:100%;height:200px;margin:0;padding:0;border-radius:5px;border:1px solid var(--nc-border);background:transparent;color:var(--nc-text);cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box}',
            '.reader-page-selector-btn > span{position:absolute;top:2px;right:2px;font-size:14px;background:var(--reader-accent-bg,rgba(124,58,237,0.9));color:var(--reader-accent-lighter,#c4b5ff);border-radius:3px;padding:1px 4px;z-index:2}',
            '.reader-page-selector-btn img{max-width:100%;object-fit:contain;background:#000}',
            'button.reader-page-selector-btn.selected{box-shadow:var(--reader-accent,rgb(124 58 237)) 4px 4px 4px}',
            '.reader-page-star{position:absolute;top:2px;left:2px;z-index:2;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border:none;border-radius:4px;background:var(--reader-accent-bg,rgba(124,58,237,0.15));color:var(--reader-star-color,#a855f7);opacity:0.6;cursor:pointer;transition:var(--nc-transition)}',
            '.reader-page-star:hover{opacity:1;background:var(--reader-accent-bg-hover,rgba(124,58,237,0.25));color:var(--reader-accent-light,#a855f7)}',
            '.reader-page-star[data-favorite="true"]{opacity:0.9;color:var(--reader-star-color-filled,#a855f7)}',
            '.reader-page-selector-btn:hover .reader-page-star{opacity:0.8}',
            '.reader-page-star-btn{width:24px;height:24px;margin-left:4px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:4px;background:var(--reader-accent-bg,rgba(124,58,237,0.15));color:var(--reader-star-color,#a855f7);opacity:0.6;cursor:pointer;transition:var(--nc-transition)}',
            '.reader-page-star-btn:hover{opacity:1;background:var(--reader-accent-bg-hover,rgba(124,58,237,0.25))}',
            '.reader-page-star-btn[data-favorite="true"]{opacity:0.9;color:var(--reader-star-color-filled,#a855f7)}',
            '#reader-ctx-menu{position:fixed;background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px;z-index:10002;backdrop-filter:blur(8px);min-width:160px}',
            '#reader-ctx-menu button{color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:13px;cursor:pointer;text-align:left;display:flex;align-items:center;justify-content:space-between}',
            '#reader-ctx-menu button.reader-ctx-active{background:rgba(0,130,201,0.3)}',
            '#reader-ctx-menu button .reader-ctx-check{opacity:0.6}',
            '.reader-error{text-align:center;padding:20px;color:var(--nc-red)}',
            '.renamer-reader-loading-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue,#0082c9);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin-right:8px;vertical-align:middle}'
        ].join('');
        document.head.appendChild(sk);
    }

    var STAR_OUTLINE_PATH = 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z';
    var STAR_FILLED_PATH = 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z';

    function getReaderStarSvg(filled, color) {
        var c = color || 'currentColor';
        if (filled) {
            return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="-4 -4 30 30" fill="' + c + '"><path d="' + STAR_FILLED_PATH + '"></path></svg>';
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + STAR_OUTLINE_PATH + '"></path></svg>';
    }

    function getReaderStar(filled, color) {
        if (typeof window !== 'undefined' && window.RenamerNavigation && window.RenamerNavigation.renderStarButton) {
            return window.RenamerNavigation.renderStarButton(filled, color);
        }
        return getReaderStarSvg(filled, color);
    }

    function loadReaderPageFavorites(ctx, filePath) {
        if (!ctx || !filePath) return Promise.resolve([]);
        if (typeof window !== 'undefined' && window.RenamerNavigation) {
            return window.RenamerNavigation.loadPageFavorites(ctx, filePath);
        }
        return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/favorites?path=' + encodeURIComponent(filePath), {
            method: 'GET'
        }).then(function(body) {
            return (body && body.success && Array.isArray(body.pages)) ? body.pages : [];
        }).catch(function() {
            return [];
        });
    }

    function saveReaderPageFavorites(ctx, filePath, pages) {
        if (!ctx || !filePath) return Promise.resolve(false);
        if (typeof window !== 'undefined' && window.RenamerNavigation) {
            return window.RenamerNavigation.savePageFavorites(ctx, filePath, pages);
        }
        return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/favorites', {
            method: 'POST',
            body: JSON.stringify({ path: filePath, pages: pages })
        }).then(function(body) {
            return !!(body && body.success);
        }).catch(function() {
            return false;
        });
    }

    function toggleReaderPageFavorite(ctx, filePath, pageNum, makeFavorite) {
        var useNav = (typeof window !== 'undefined' && window.RenamerNavigation);
        var loader = useNav ? window.RenamerNavigation.loadPageFavorites.bind(window.RenamerNavigation) : loadReaderPageFavorites;
        var saver = useNav ? window.RenamerNavigation.savePageFavorites.bind(window.RenamerNavigation) : saveReaderPageFavorites;
        return loader(ctx, filePath).then(function(pages) {
            var newPages = (pages || []).slice();
            var idx = newPages.indexOf(pageNum);
            if (makeFavorite) {
                if (idx === -1) newPages.push(pageNum);
            } else {
                if (idx !== -1) newPages.splice(idx, 1);
            }
            newPages.sort(function(a, b) { return a - b; });
            return saver(ctx, filePath, newPages).then(function(result) {
                if (useNav && result) {
                    window.RenamerNavigation.invalidatePageFavoritesCache(ctx, filePath);
                }
                return { success: result, pages: newPages };
            });
        });
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

    PdfSource.prototype._initPdfJsFallback = function() {
        var self = this;
        var blobP;
        if (self.blob) {
            blobP = Promise.resolve(self.blob);
        } else if (typeof window !== 'undefined' && window.RenamerReader && typeof window.RenamerReader.fetchFileBlob === 'function') {
            blobP = window.RenamerReader.fetchFileBlob(self.ctx, self.filePath);
        } else {
            return Promise.reject(new Error('No blob available for PDF.js fallback'));
        }
        return blobP.then(function(blob) {
            if (!blob) {
                throw new Error('No blob for PDF.js fallback');
            }
            return blob.arrayBuffer();
        }).then(function(arrayBuffer) {
            if (!window.pdfjsLib) {
                throw new Error('pdf.js library not loaded');
            }
            var pdfjsLib = window.pdfjsLib;
            if (typeof OC !== 'undefined' && OC.generateUrl && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = OC.generateUrl('/apps/renamer/js/pdf.worker.min.js');
            }
            return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        }).then(function(pdfDoc) {
            self._pdfJsDoc = pdfDoc;
            self.totalPages = pdfDoc.numPages || 0;
            var target = restorePage(self.ctx, self.filePath, self.totalPages);
            if (target > 1) {
                self._fetchPage(target);
            }
            return Promise.resolve();
        });
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
        return '';
    };

    PdfSource.prototype.destroy = function() {
        this._inflight = {};
        this._pdfJsRenderCache = {};
        this._loadPromise = null;
    };

    var CBZ_CACHE_MAX = 5;
    var PRELOAD_MARGIN = 5;

    function pathsMatch(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        try { return decodeURIComponent(a) === b; } catch (e) { return false; }
    }

    function findNextTome(ctx, filePath) {
        if (!ctx || !ctx.state || !filePath) return null;
        var curCol = ctx.state.currentCollection;
        if (curCol && curCol.rules && curCol.rules.files) {
            var cf = curCol.rules.files;
            for (var cj = 0; cj < cf.length; cj++) {
                if (pathsMatch(cf[cj].path, filePath)) {
                    return cj < cf.length - 1 ? cf[cj + 1] : null;
                }
            }
        }
        var colList = ctx.state.collections || ctx.state.readerCollections;
        if (Array.isArray(colList)) {
            for (var i = 0; i < colList.length; i++) {
                var col = colList[i];
                var files = (col && col.rules && col.rules.files) ? col.rules.files : null;
                if (!files) continue;
                for (var j = 0; j < files.length; j++) {
                    if (pathsMatch(files[j].path, filePath)) {
                        return j < files.length - 1 ? files[j + 1] : null;
                    }
                }
            }
        }
        var scanned = ctx.state.readerScannedFiles;
        if (Array.isArray(scanned) && scanned.length) {
            for (var k = 0; k < scanned.length; k++) {
                if (pathsMatch(scanned[k].path, filePath)) {
                    return k < scanned.length - 1 ? scanned[k + 1] : null;
                }
            }
        }
        return null;
    }

    function getTomeInfo(ctx, filePath) {
        var info = { collectionName: '', currentTome: 0, totalTomes: 0 };
        var col = ctx.state.currentCollection;
        if (col) {
            info.collectionName = col.name || '';
            var files = (col.rules && col.rules.files) ? col.rules.files : [];
            info.totalTomes = files.length;
            for (var i = 0; i < files.length; i++) {
                if (pathsMatch(files[i].path, filePath)) {
                    info.currentTome = files[i].tome || (i + 1);
                    break;
                }
            }
        }
        if (!info.currentTome && ctx.state.currentTome && ctx.state.currentTome.tome) {
            info.currentTome = ctx.state.currentTome.tome;
        }
        return info;
    }

    function buildHeaderNav(ctx, container, filePath) {
        var tomeInfo = getTomeInfo(ctx, filePath);

        var headerNav = document.createElement('div');
        headerNav.className = 'reader-header-nav';

        var topRow = document.createElement('div');
        topRow.className = 'reader-header-nav-row';

        var backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'reader-header-nav-back';
        backBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.BACK : '&#8592;';
        backBtn.title = (ctx.t ? ctx.t('readerClose') : '') || 'Fermer';
        backBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerClose') : '') || 'Fermer');
        backBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (typeof ctx.closeReader === 'function') {
                ctx.closeReader();
            }
        });

        var collectionSpan = document.createElement('span');
        collectionSpan.className = 'reader-header-nav-collection';
        collectionSpan.textContent = tomeInfo.collectionName || '';

        topRow.appendChild(backBtn);
        topRow.appendChild(collectionSpan);
        headerNav.appendChild(topRow);

        var tomeLabel = document.createElement('span');
        tomeLabel.className = 'reader-header-nav-tome';
        if (tomeInfo.totalTomes > 0) {
            var tomeWord = (ctx.t ? ctx.t('tome') : '') || 'Tome';
            tomeLabel.textContent = tomeWord + ' ' + tomeInfo.currentTome + ' / ' + tomeInfo.totalTomes;
        }
        headerNav.appendChild(tomeLabel);

        container.appendChild(headerNav);
        return headerNav;
    }

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
        return '';
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
        return '';
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

        container.classList.add('reader-container');

        buildHeaderNav(ctx, container, filePath);

        var pagesContainer = document.createElement('div');
        pagesContainer.className = 'reader-pages reader-pages-slider';
        container.appendChild(pagesContainer);

        var currentPage = restorePage(ctx, filePath, totalPages);
        var nextTome = findNextTome(ctx, filePath);
        var preloadStarted = false;
        var direction = 'horizontal';

        function updateLayout(dir) {
            direction = dir;
            pagesContainer.classList.toggle('reader-pages-vertical', dir === 'vertical');
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
                slide.dataset.page = pageNum;

                var pageEl = source.createPageElement();
                pageEl.dataset.page = pageNum;
                pageEl.dataset.loaded = 'false';

                var spinner = document.createElement('div');
                spinner.className = 'reader-page-spinner';
                spinner.innerHTML = '<div></div>';

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
                    if (slideInfo.spinner.parentNode) slideInfo.spinner.classList.add('reader-spinner-hidden');
                });
            }).catch(function(err) {
                console.error('[GenericViewer] Error rendering page', slideInfo.pageNum, err);
                slideInfo.img.dataset.loaded = 'error';
                requestAnimationFrame(function() {
                    if (slideInfo.spinner.parentNode) slideInfo.spinner.classList.add('reader-spinner-hidden');
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

        var leftGroup = document.createElement('div');
        leftGroup.className = 'reader-nav-group';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary reader-fullscreen-btn';
        fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.innerHTML = PREV_SVG;
        prevBtn.disabled = currentPage <= 1;

        var pageLabel = document.createElement('span');
        pageLabel.className = 'reader-page-label';
        pageLabel.title = (ctx.t ? ctx.t('readerAllPages') : '') || 'Toutes les pages';
        pageLabel.setAttribute('role', 'button');
        pageLabel.textContent = currentPage + ' / ' + totalPages;
        pageLabel.addEventListener('click', function(e) {
            e.stopPropagation();
            openPageSelector();
        });

        var pageStarBtn = document.createElement('button');
        pageStarBtn.type = 'button';
        pageStarBtn.className = 'reader-page-star-btn';
        pageStarBtn.dataset.favorite = 'false';
        pageStarBtn.title = (ctx.t ? ctx.t('readerToggleFavorite') : '') || 'Toggle favorite';
        pageStarBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerToggleFavorite') : '') || 'Toggle favorite');
        pageStarBtn.innerHTML = getReaderStar(false);

        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.innerHTML = NEXT_SVG;
        nextBtn.disabled = currentPage >= totalPages;

        var rightGroup = document.createElement('div');
        rightGroup.className = 'reader-nav-group';

        var zoomResetBtn = document.createElement('button');
        zoomResetBtn.type = 'button';
        zoomResetBtn.className = 'renamer-btn renamer-btn-secondary reader-zoom-reset';
        zoomResetBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.LOOP : '⟲';
        zoomResetBtn.title = 'Reset zoom';

        var zoomOutBtn = document.createElement('button');
        zoomOutBtn.type = 'button';
        zoomOutBtn.className = 'renamer-btn renamer-btn-secondary reader-zoom-btn reader-zoom-out';
        zoomOutBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.MINUS : '−';
        zoomOutBtn.title = 'Zoom out (5%)';

        var zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '20';
        zoomSlider.max = '300';
        zoomSlider.value = '100';
        zoomSlider.step = '10';
        zoomSlider.title = 'Zoom';
        zoomSlider.className = 'reader-zoom-slider';

        var zoomInBtn = document.createElement('button');
        zoomInBtn.type = 'button';
        zoomInBtn.className = 'renamer-btn renamer-btn-secondary reader-zoom-btn reader-zoom-in';
        zoomInBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.PLUS : '+';
        zoomInBtn.title = 'Zoom in (5%)';

        var zoomLabel = document.createElement('span');
        zoomLabel.className = 'reader-zoom-label';
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
        leftGroup.appendChild(pageStarBtn);
        nav.appendChild(fullscreenBtn);
        nav.appendChild(rightGroup);
        rightGroup.appendChild(zoomResetBtn);
        rightGroup.appendChild(zoomOutBtn);
        rightGroup.appendChild(zoomSlider);
        rightGroup.appendChild(zoomInBtn);
        rightGroup.appendChild(zoomLabel);
        rightGroup.appendChild(directionToggle);
        container.appendChild(nav);

        function updateNavButtons() {
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = (currentPage >= totalPages) && !nextTome;
        }

        function maybePreloadNextTome() {
            if (!nextTome || preloadStarted) return;
            if (!totalPages || (totalPages - currentPage) > PRELOAD_MARGIN) return;
            preloadStarted = true;
            var nextExt = pathExt(nextTome.path);
            if (nextExt === '.pdf') {
                var tmpSrc = new PdfSource(null, ctx, nextTome.path);
                tmpSrc.load().catch(function(err) {
                    console.error('[GenericViewer] preload PDF next tome error:', err && err.message);
                });
            } else {
                var blobP = (window.RenamerReader && window.RenamerReader.fetchFileBlob)
                    ? window.RenamerReader.fetchFileBlob(ctx, nextTome.path)
                    : Promise.reject(new Error('fetchFileBlob unavailable'));
                blobP.then(function(blob) {
                    container._readerPreloadedBlob = { blob: blob, filePath: nextTome.path };
                }).catch(function(err) {
                    console.error('[GenericViewer] preload next tome blob error:', err && err.message);
                });
            }
        }

        function switchToNextTome() {
            if (!nextTome) return;
            if (container._readerUIInstance && typeof container._readerUIInstance.destroy === 'function') {
                try { container._readerUIInstance.destroy(); } catch (e) {}
            }
            container._readerUIInstance = null;
            var nextExt = pathExt(nextTome.path);
            var blob = null;
            if (nextExt !== '.pdf') {
                if (container._readerPreloadedBlob && container._readerPreloadedBlob.filePath === nextTome.path) {
                    blob = container._readerPreloadedBlob.blob;
                }
            }
            delete container._readerPreloadedBlob;
            if (ctx.state) {
                ctx.state.currentTome = { path: nextTome.path, name: nextTome.name, tome: nextTome.tome || 0 };
            }
            if (ctx && typeof ctx.updateUrl === 'function') {
                ctx.updateUrl({ read: nextTome.path });
            }
            renderFile(ctx, nextTome.path, blob, container);
        }

        function refreshPageStar() {
            loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                if (!pageStarBtn.parentNode) return;
                var isFav = (favPages || []).indexOf(currentPage) !== -1;
                pageStarBtn.dataset.favorite = isFav ? 'true' : 'false';
                pageStarBtn.innerHTML = getReaderStar(isFav);
            }).catch(function() {});
        }

        pageStarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var isFav = pageStarBtn.dataset.favorite === 'true';
            var makeFav = !isFav;
            pageStarBtn.dataset.favorite = makeFav ? 'true' : 'false';
            pageStarBtn.innerHTML = getReaderStar(makeFav);
            toggleReaderPageFavorite(ctx, filePath, currentPage, makeFav).then(function(result) {
                if (ctx.showToast) {
                    ctx.showToast(makeFav ? (ctx.t ? ctx.t('readerFavoriteAdded') : '') || 'Page favorite added' : (ctx.t ? ctx.t('readerFavoriteRemoved') : '') || 'Page favorite removed', 'success');
                }
            }).catch(function() {
                if (!pageStarBtn.parentNode) return;
                pageStarBtn.dataset.favorite = isFav ? 'true' : 'false';
                pageStarBtn.innerHTML = getReaderStar(isFav);
                if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
            });
        });

        function openPageSelector() {
            var existing = document.getElementById('reader-page-selector-overlay');
            if (existing) existing.remove();

            if (!ctx.state.pdfThumbCache) ctx.state.pdfThumbCache = {};
            var thumbCache = ctx.state.pdfThumbCache;

            var overlay = document.createElement('div');
            overlay.id = 'reader-page-selector-overlay';
            overlay.className = 'renamer-modal-overlay';

            var sheet = document.createElement('div');
            sheet.className = 'renamer-modal reader-page-selector-sheet';

            var modalHeader = document.createElement('div');
            modalHeader.className = 'reader-modal-header';

            var title = document.createElement('div');
            title.className = 'reader-modal-title';
            title.textContent = (ctx.t ? ctx.t('readerAllPages') : '') || 'Toutes les pages';
            title.setAttribute('data-translation', 'readerAllPages');
            modalHeader.appendChild(title);

            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'renamer-btn-icon reader-close-btn';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Fermer');
            closeBtn.setAttribute('role', 'button');
            modalHeader.appendChild(closeBtn);
            sheet.appendChild(modalHeader);

            var searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.inputMode = 'numeric';
            searchInput.placeholder = (ctx.t ? ctx.t('readerGoToPage') : '') || 'Aller à la page';
            searchInput.id = 'reader-page-search';
            sheet.appendChild(searchInput);

            searchInput.addEventListener('input', function(e) {
                var val = e.target.value.trim();
                var pageNum = parseInt(val, 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    var targetBtn = grid.querySelector('button[data-page="' + pageNum + '"]');
                    if (targetBtn) {
                        targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });

            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    var val = searchInput.value.trim();
                    var pageNum = parseInt(val, 10);
                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                        currentPage = pageNum;
                        goToPage(pageNum);
                        renderVisiblePages();
                        doSaveProgress();
                        updateNavButtons();
                        closeSelector();
                    }
                }
            });

            var grid = document.createElement('div');
            grid.className = 'reader-page-selector-grid';

            var imgMap = {};

            function loadThumb(pageNum) {
                var thumbKey = filePath + '#thumb#' + pageNum;
                if (thumbCache[thumbKey]) {
                    return Promise.resolve(thumbCache[thumbKey]);
                }
                if (source.type === 'pdf' && !source._pdfJsDoc) {
                    return source._fetchPage(pageNum).then(function(data) {
                        if (data && data.success && data.dataUrl) {
                            thumbCache[thumbKey] = data.dataUrl;
                            return data.dataUrl;
                        }
                        return null;
                    }).catch(function(err) {
                        console.error('[ReaderPageSelector] PDF thumb page ' + pageNum + ' error:', err && err.message ? err.message : String(err));
                        return null;
                    });
                } else if (source.type === 'cbz' || source.type === 'cbr') {
                    if (source.imageUrls && source.imageUrls[pageNum - 1]) {
                        thumbCache[thumbKey] = source.imageUrls[pageNum - 1];
                        return Promise.resolve(source.imageUrls[pageNum - 1]);
                    }
                    if (source.zip && source.imageNames[pageNum - 1]) {
                        var name = source.imageNames[pageNum - 1];
                        return source.zip.file(name).async('blob').then(function(imgBlob) {
                            var url = URL.createObjectURL(imgBlob);
                            source.imageUrls[pageNum - 1] = url;
                            thumbCache[thumbKey] = url;
                            return url;
                        }).catch(function(err) {
                            console.error('[ReaderPageSelector] CBZ thumb page ' + pageNum + ' error:', err && err.message ? err.message : String(err));
                            return null;
                        });
                    }
                    return Promise.resolve(null);
                } else if (source.type === 'image') {
                    if (source.imageUrl) {
                        thumbCache[thumbKey] = source.imageUrl;
                        return Promise.resolve(source.imageUrl);
                    }
                    return Promise.resolve(null);
                }
                return Promise.resolve(null);
            }

            for (var p = 1; p <= totalPages; p++) {
                (function(pageNum) {
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.dataset.page = pageNum;
                    btn.className = 'reader-page-selector-btn';

                    var starBtn = document.createElement('button');
                    starBtn.type = 'button';
                    starBtn.className = 'reader-page-star';
                    starBtn.dataset.page = pageNum;
                    starBtn.dataset.favorite = 'false';
                    starBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerToggleFavorite') : '') || 'Toggle favorite');
                    starBtn.innerHTML = getReaderStar(false);
                    btn.appendChild(starBtn);

                    starBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var isFav = starBtn.dataset.favorite === 'true';
                        var makeFav = !isFav;
                        starBtn.dataset.favorite = makeFav ? 'true' : 'false';
                        starBtn.innerHTML = getReaderStar(makeFav);
                        toggleReaderPageFavorite(ctx, filePath, pageNum, makeFav).then(function(result) {
                            if (ctx.showToast) {
                                var msg = makeFav ?
                                    (ctx.t ? ctx.t('readerFavoriteAdded') : '') || 'Page favorite added' :
                                    (ctx.t ? ctx.t('readerFavoriteRemoved') : '') || 'Page favorite removed';
                                ctx.showToast(msg, 'success');
                            }
                        }).catch(function() {
                            starBtn.dataset.favorite = isFav ? 'true' : 'false';
                            starBtn.innerHTML = getReaderStar(isFav);
                            if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                        });
                    });

                    var numLabel = document.createElement('span');
                    numLabel.textContent = String(pageNum);
                    btn.appendChild(numLabel);

                    var img = document.createElement('img');
                    btn.appendChild(img);
                    imgMap[pageNum] = { btn: btn, img: img };

                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        currentPage = pageNum;
                        goToPage(pageNum);
                        renderVisiblePages();
                        doSaveProgress();
                        updateNavButtons();
                        syncHighlight();
                        closeSelector();
                        refreshPageStar();
                        maybePreloadNextTome();
                    });

                    grid.appendChild(btn);
                })(p);
            }

            function syncStarStates(favorites) {
                if (!favorites) return;
                for (var i = 0; i < favorites.length; i++) {
                    var star = grid.querySelector('.reader-page-star[data-page="' + favorites[i] + '"]');
                    if (star) {
                        star.dataset.favorite = 'true';
                        star.innerHTML = getReaderStar(true);
                    }
                }
            }


            function syncHighlight() {
                var allBtns = grid.querySelectorAll('.reader-page-selector-btn');
                allBtns.forEach(function(b) {
                    var pn = parseInt(b.dataset.page, 10);
                    if (pn === currentPage) {
                        b.classList.add('selected');
                    } else {
                        b.classList.remove('selected');
                    }
                });
            }

             syncHighlight();

            loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                syncStarStates(favPages);
            }).catch(function() {});

            var pending = [];
            for (var i = 1; i <= totalPages; i++) pending.push(i);

            pending.forEach(function(pageNum) {
                loadThumb(pageNum).then(function(dataUrl) {
                    if (dataUrl && imgMap[pageNum] && imgMap[pageNum].img.parentNode) {
                        imgMap[pageNum].img.src = dataUrl;
                    }
                });
            });

            sheet.appendChild(grid);
            overlay.appendChild(sheet);

            function closeSelector() {
                if (overlay.parentNode) overlay.remove();
            }

            closeBtn.addEventListener('click', closeSelector);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) closeSelector();
            });

            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    e.stopImmediatePropagation();
                    closeSelector();
                    document.removeEventListener('keydown', escHandler, true);
                }
            }, true);

            document.body.appendChild(overlay);

            var currentBtn = grid.querySelector('button[data-page="' + currentPage + '"]');
            if (currentBtn) {
                currentBtn.scrollIntoView({ behavior: 'auto', block: 'center' });
            }

            searchInput.focus();
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
            }
            pagesContainer.classList.toggle('reader-fit-cover', fitMode === 'cover');
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
            container.classList.toggle('reader-zoomed', currentZoom > 1);
        }

        function hideCursor() {
            container.classList.add('reader-cursor-hidden');
        }

        function showCursor() {
            container.classList.remove('reader-cursor-hidden');
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(hideCursor, 2000);
        }

        var navHovered = false;
        var navFocused = false;

        var cursorTargets = [container, pagesContainer];
        cursorTargets.forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', function() {
                if (!navHovered) showCursor();
            });
            el.addEventListener('click', showCursor);
            el.addEventListener('touchstart', showCursor, { passive: true });
        });

        nav.addEventListener('mouseenter', function() {
            navHovered = true;
            container.classList.remove('reader-cursor-hidden');
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = null;
        });

        nav.addEventListener('mouseleave', function() {
            navHovered = false;
            if (!navFocused) showCursor();
        });

        nav.addEventListener('focusin', function() {
            navFocused = true;
            container.classList.remove('reader-cursor-hidden');
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = null;
        });

        nav.addEventListener('focusout', function() {
            navFocused = false;
            if (!navHovered) showCursor();
        });

        fullscreenBtn.addEventListener('click', function() {
            var el = container;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                el.requestFullscreen().then(function() {
                    showCursor();
                });
            }
        });

        document.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷';
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
                refreshPageStar();
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
                refreshPageStar();
                maybePreloadNextTome();
            } else if (nextTome) {
                switchToNextTome();
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
                    refreshPageStar();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    if (currentPage < totalPages) {
                        currentPage++;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        updateNavButtons();
                        goToPage(currentPage);
                        doSaveProgress();
                        renderVisiblePages();
                        refreshPageStar();
                        maybePreloadNextTome();
                        e.preventDefault();
                    } else if (nextTome) {
                        switchToNextTome();
                        e.preventDefault();
                    }
                }
            } else {
                if (e.key === 'ArrowUp' && currentPage > 1) {
                    currentPage--;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    doSaveProgress();
                    renderVisiblePages();
                    refreshPageStar();
                    e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    if (currentPage < totalPages) {
                        currentPage++;
                        pageLabel.textContent = currentPage + ' / ' + totalPages;
                        updateNavButtons();
                        goToPage(currentPage);
                        doSaveProgress();
                        renderVisiblePages();
                        refreshPageStar();
                        maybePreloadNextTome();
                        e.preventDefault();
                    } else if (nextTome) {
                        switchToNextTome();
                        e.preventDefault();
                    }
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
            var goingNext = false;
            if (direction === 'horizontal' && Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
                if (e.deltaX < 0 && currentPage > 1) {
                    currentPage--;
                } else if (e.deltaX > 0) {
                    goingNext = true;
                }
            } else {
                if (e.deltaY < 0 && currentPage > 1) {
                    currentPage--;
                } else if (e.deltaY > 0) {
                    goingNext = true;
                }
            }
            if (goingNext && currentPage < totalPages) {
                currentPage++;
            }
            if (currentPage !== oldPage) {
                updateNavButtons();
                goToPage(currentPage);
                doSaveProgress();
                renderVisiblePages();
                refreshPageStar();
                maybePreloadNextTome();
            } else if (goingNext && nextTome) {
                switchToNextTome();
            }
        }, { passive: false });

        container.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            var existing = document.getElementById('reader-ctx-menu');
            if (existing) existing.remove();

            var menu = document.createElement('div');
            menu.id = 'reader-ctx-menu';

            var currentFit = fitMode;

            function makeItem(label, mode) {
                var btn = document.createElement('button');
                btn.type = 'button';
                if (currentFit === mode) {
                    btn.classList.add('reader-ctx-active');
                }
                btn.innerHTML = '<span>' + label + '</span>' + (currentFit === mode ? '<span class="reader-ctx-check">✓</span>' : '');
                btn.addEventListener('click', function() {
                    fitMode = mode;
                    pagesContainer.dataset.fitMode = fitMode;
                    applyZoom();
                    if (menu.parentNode) menu.remove();
                    showCursor();
                });
                return btn;
            }

            menu.appendChild(makeItem('Classique', 'contain'));
            menu.appendChild(makeItem('Zoom', 'cover'));
            document.body.appendChild(menu);

            var ctxEscHandler = function(ev) {
                if (ev.key === 'Escape') {
                    ev.stopImmediatePropagation();
                    closeMenu();
                }
            };
            function closeMenu() {
                if (menu.parentNode) menu.remove();
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('keydown', ctxEscHandler, true);
            }
            setTimeout(function() {
                document.addEventListener('click', closeMenu);
                document.addEventListener('keydown', ctxEscHandler, true);
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
        refreshPageStar();
        showCursor();
        maybePreloadNextTome();
        var uiInstance = {
            destroy: function() {
                document.removeEventListener('keydown', onKeyDown);
                if (source && typeof source.destroy === 'function') {
                    try { source.destroy(); } catch (e) {}
                }
            }
        };
        container._readerUIInstance = uiInstance;
        return uiInstance;
    }

    function renderEpubUI(ctx, container, source, filePath) {
        container.classList.remove('reader-container-layout');
        container.classList.add('reader-container', 'reader-container-epub');
        container.innerHTML = '';

        buildHeaderNav(ctx, container, filePath);

        var nav = document.createElement('div');
        nav.className = 'reader-nav-bar reader-nav-bar-epub';

        var leftGroup = document.createElement('div');
        leftGroup.className = 'reader-nav-group';

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
        pageLabel.className = 'reader-page-label';
        pageLabel.textContent = '';

        leftGroup.appendChild(prevBtn);
        leftGroup.appendChild(pageLabel);
        leftGroup.appendChild(nextBtn);

        var rightGroup = document.createElement('div');
        rightGroup.className = 'reader-nav-group';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary reader-fullscreen-btn';
        fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        rightGroup.appendChild(fullscreenBtn);
        nav.appendChild(leftGroup);
        nav.appendChild(rightGroup);

        container.appendChild(nav);

        var cursorHideTimer = null;

        function hideCursor() {
            container.classList.add('reader-cursor-hidden');
        }

        function showCursor() {
            container.classList.remove('reader-cursor-hidden');
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = setTimeout(hideCursor, 2000);
        }

        var epubNavHovered = false;
        var epubNavFocused = false;

        [container].forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', function() {
                if (!epubNavHovered) showCursor();
            });
            el.addEventListener('click', showCursor);
            el.addEventListener('touchstart', showCursor, { passive: true });
        });

        nav.addEventListener('mouseenter', function() {
            epubNavHovered = true;
            container.classList.remove('reader-cursor-hidden');
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = null;
        });

        nav.addEventListener('mouseleave', function() {
            epubNavHovered = false;
            if (!epubNavFocused) showCursor();
        });

        nav.addEventListener('focusin', function() {
            epubNavFocused = true;
            container.classList.remove('reader-cursor-hidden');
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = null;
        });

        nav.addEventListener('focusout', function() {
            epubNavFocused = false;
            if (!epubNavHovered) showCursor();
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
                container.requestFullscreen().then(function() {
                    showCursor();
                }).catch(function() {});
            }
        });

        document.addEventListener('fullscreenchange', function() {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷';
                fullscreenBtn.title = 'Quitter plein écran / Exit fullscreen';
            } else {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
                fullscreenBtn.title = 'Plein écran / Fullscreen';
            }
            showCursor();
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

        showCursor();

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
            if (savedBm && savedBm.value > 0 && savedBm.value <= 100) {
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
            container.innerHTML = '<div class="reader-error">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    function renderFile(ctx, filePath, blob, container) {
        var startTime = Date.now();
        var timerInterval = null;
        var isVerboseClient = !!(typeof window !== 'undefined' && window.RenamerLog && typeof window.RenamerLog.isClientMode === 'function' && window.RenamerLog.isClientMode());

        function showPageLoader() {
            hidePageLoader();
            var overlay = document.createElement('div');
            overlay.id = 'reader-page-loading-overlay';
            overlay.className = 'reader-loading-overlay';
            overlay.innerHTML = '<div class="reader-page-spinner"><div></div></div>';
            container.appendChild(overlay);
        }

        function hidePageLoader() {
            var overlay = document.getElementById('reader-page-loading-overlay');
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        }

        function startReaderTimer(label) {
            if (!isVerboseClient) return;
            var fileName = filePath.replace(/^.*\//, '');
            console.log('[Reader]', label, 'path:', filePath, 'elapsed: 00:00');
            container.innerHTML = '';

            var toastId = 'renamer-reader-loading-toast';
            var toast = document.getElementById(toastId);

            if (!toast) {
                if (container._readerLoadTimerInterval) {
                    clearInterval(container._readerLoadTimerInterval);
                    container._readerLoadTimerInterval = null;
                }
                var toastContainerEl = document.getElementById('renamer-toast-container');
                if (!toastContainerEl) {
                    toastContainerEl = document.createElement('div');
                    toastContainerEl.id = 'renamer-toast-container';
                    toastContainerEl.className = 'renamer-toast-container';
                    document.body.appendChild(toastContainerEl);
                }

                toast = document.createElement('div');
                toast.id = toastId;
                toast.className = 'renamer-toast renamer-toast-info';
                toast.innerHTML = '<span class="renamer-reader-loading-spinner"></span><span class="renamer-toast-text"></span><button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
                toast.querySelector('.renamer-toast-close').addEventListener('click', function() {
                    clearReaderTimer();
                    if (toast.parentNode) toast.remove();
                });
                toastContainerEl.appendChild(toast);
                setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

                var textEl = toast.querySelector('.renamer-toast-text');
                textEl.textContent = (ctx.t('loading') || 'Chargement...') + ' \'' + fileName + '\' (00:00)';

                timerInterval = setInterval(function() {
                    var elapsed = Date.now() - startTime;
                    if (textEl) textEl.textContent = (ctx.t('loading') || 'Chargement...') + ' \'' + fileName + '\' (' + formatElapsedTime(elapsed) + ')';
                }, 1000);
                container._readerLoadTimerInterval = timerInterval;
                if (toast) toast._readerTimerInterval = timerInterval;
            }
        }

        function clearReaderTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            if (container._readerLoadTimerInterval) {
                clearInterval(container._readerLoadTimerInterval);
                container._readerLoadTimerInterval = null;
            }
            var toast = document.getElementById('renamer-reader-loading-toast');
            if (toast) {
                if (toast._readerTimerInterval) {
                    clearInterval(toast._readerTimerInterval);
                    toast._readerTimerInterval = null;
                }
            }
        }

        function removeReaderToast() {
            clearReaderTimer();
            hidePageLoader();
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
            showPageLoader();
            return source.load().then(function() {
                console.log('[Reader] EPUB loaded', 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                return renderEpubUI(ctx, container, source, filePath);
            }).then(function(result) {
                removeReaderToast();
                return result;
            }).catch(function(err) {
                removeReaderToast();
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        startReaderTimer('Début du chargement');
        showPageLoader();

        return source.load().then(function() {
                console.log('[Reader] Source loaded:', source.type, 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                var result = buildReaderUI(ctx, container, source, filePath);
                removeReaderToast();
                return result;
            }).catch(function(err) {
                removeReaderToast();
                console.error('[Reader] Load error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
    }

    window.RenamerGenericViewer = {
        renderFile: renderFile
    };
})();
