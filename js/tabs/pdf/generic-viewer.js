(function() {
    'use strict';

    if (!document.getElementById('renamer-generic-viewer-styles')) {
        var sk = document.createElement('style');
        sk.id = 'renamer-generic-viewer-styles';
        sk.textContent = [
            '@keyframes renamer-spin{to{transform:rotate(360deg)}}',
            'body,html{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-drag:none}',
            ':root{--reader-overlay-filter:blur(.625rem);--nc-blue:#0082c9;--nc-bg:var(--color-main-background,#fff);--nc-text:var(--color-main-text,#000);--nc-border:var(--color-border,#ccc);--nc-red:#e02020;--nc-radius:var(--border-radius-large,8px);--reader-accent:rgb(124 58 237);--reader-accent-light:#a855f7;--reader-accent-lighter:#c4b5ff;--reader-accent-bg:rgb(124 58 237/0.15);--reader-accent-bg-hover:rgb(124 58 237/0.25);--reader-star-color:#a855f7;--reader-star-color-filled:#a855f7;--reader-page-grid-gap:16px;--nc-transition:all 300ms ease-in-out}',
            '.reader-container{position:relative;-webkit-touch-callout:none}',
            '.reader-container-inner{flex:1;overflow:visible;display:flex;align-items:center;justify-content:center;background:#000;height:100%;width:100%}',
            '.reader-container-layout{overflow:visible;display:flex;flex-direction:column;align-items:stretch;height:100%;box-sizing:border-box;width:100%;background:#000}',
            '.reader-container-epub{overflow:hidden;display:block;align-items:stretch;position:relative;height:100%;box-sizing:border-box;width:100%;background:#000}',
            '.reader-pages.reader-pages-slider{flex:1;display:flex;flex-direction:row;overflow:visible;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);will-change:transform;box-sizing:border-box;scroll-snap-type:x mandatory}',
            '.reader-slide{position:relative;flex:0 0 100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;scroll-snap-align:center}',
            '.reader-page-img,.reader-page-canvas{max-width:100%;max-height:100dvh;min-height:200px;width:auto;height:auto;object-fit:contain;background:#000;-webkit-touch-callout:none;transition:transform 0.2s ease-out}',
            '.reader-page-spinner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}',
            '.reader-page-spinner > div{width:32px;height:32px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue,#0082c9);border-radius:50%;animation:renamer-spin 0.8s linear infinite}',
            '.reader-loading-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:1;pointer-events:none}',
            '.reader-loading-spinner{width:48px;height:48px;border:4px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue,#0082c9);border-radius:50%;animation:renamer-spin 0.8s linear infinite}',
            '.reader-spinner-hidden{display:none}',
            '.reader-header-nav{width:calc(100% - 32px);padding-top:30px;}',
            '.reader-nav-bar{position:fixed;bottom:0;left:0;right:0;padding:28px 16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:10;flex-shrink:0;opacity:1;transform:translateY(0);transition:opacity 0.2s,transform 0.3s ease;backdrop-filter:var(--reader-overlay-filter);}',
            '@media (hover:none)and(pointer:coarse){.reader-nav-bar{padding:30px 16px calc(30px + env(safe-area-inset-bottom,0px));gap:24px}}',
            '.reader-header-nav{position:fixed;top:0;left:0;z-index:100;padding:12px 16px;display:flex;flex-direction:column;background:rgba(0,0,0,0.5);backdrop-filter:var(--reader-overlay-filter);box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:opacity 0.2s,transform 0.3s ease}',
            '.reader-header-nav-row{display:flex;align-items:center;gap:8px;}',
            '.reader-header-nav-back{background:transparent;border:none;border-radius:50%;width:28px;height:28px;font-size:20px;cursor:pointer;color:#fff;opacity:0.8;display:flex;align-items:center;justify-content:center}',
            '.reader-header-nav-back:hover{opacity:1}',
            '.reader-header-nav-collection{font-size:14px;font-weight:700;color:#fff}',
            '.reader-header-nav-tome{font-size:12px;color:rgba(255,255,255,0.6)}',
            '.reader-cursor-hidden .reader-header-nav{opacity:0;transform:translateY(-100%)}',
            '.reader-nav-bar-epub{position:absolute}',
            '.reader-nav-group{display:flex;align-items:center;gap:8px}',
            '.reader-settings-btn[data-state="open"]{background:rgba(124,58,237,0.15)}',
            '.reader-settings-panel{overflow:hidden;transition:height .25s ease;display:none}',
            '.reader-settings-panel.reader-settings-open{display:flex;flex-basis:100%;width:100%;box-sizing:border-box;padding:8px 16px;gap:8px;align-items:center;justify-content:center}',
            '.reader-nav-bar.reader-nav-settings-open{flex-wrap:wrap}',
            '.reader-settings-placeholder{opacity:0.6;font-size:13px;white-space:nowrap;color:var(--nc-text)}',
            '.reader-fullscreen-btn{position:absolute;right:8px;bottom:28px;width:28px;height:28px;padding:6px;box-sizing:border-box}',
            '.reader-settings-btn{position:absolute;right:54px;bottom:28px;width:28px;height:28px;padding:6px;box-sizing:border-box}',
            '.reader-page-label{font-size:14px;min-width:80px;text-align:center;color:var(--nc-text);cursor:pointer}',
            '.reader-zoom-slider{width:80px;accent-color:var(--nc-blue);cursor:pointer}',
            '.reader-zoom-label{font-size:13px;min-width:50px;text-align:center;color:var(--nc-text)}',
            '.reader-zoom-btn{padding:4px 8px;min-width:28px;height:28px;font-size:14px;line-height:1}',
            '.reader-cursor-hidden{cursor:none}',
            '.reader-cursor-hidden *{cursor:none!important}',
            '.reader-cursor-hidden .reader-nav-bar{opacity:0;transform:translateY(100%)}',
            '.reader-zoomed{overflow:hidden}',
            '.reader-zoomed .reader-pages{overflow:visible}',
            '.reader-zoomed::-webkit-scrollbar{width:12px;height:12px}',
            '.reader-zoomed::-webkit-scrollbar-track{background:var(--nc-bg)}',
            '.reader-zoomed::-webkit-scrollbar-thumb{background:var(--nc-border);border-radius:6px}',
            '.reader-zoomed::-webkit-scrollbar-thumb:hover{background:var(--nc-blue)}',
            '.reader-fit-cover .reader-page-img,.reader-fit-cover .reader-page-canvas{object-fit:cover}',
'.reader-fit-crop .reader-page-img,.reader-fit-crop .reader-page-canvas{object-fit:cover}',
'.reader-slide-zoomed{overflow:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}',
'.reader-slide-zoomed::-webkit-scrollbar{display:none}',
            '#reader-page-selector-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center}',
            '#reader-page-selector-overlay > .renamer-modal{box-shadow:rgba(0.6,0.6,0.6,0.6) 10px 18px 24px;-webkit-backdrop-filter:var(--reader-overlay-filter);backdrop-filter:var(--reader-overlay-filter)}',
            '.reader-page-selector-sheet{position:relative;border:1px solid var(--nc-border);border-radius:var(--nc-radius);padding:20px;max-width:800px;width:90%;max-height:80dvh;display:flex;flex-direction:column;gap:12px;color:var(--nc-text)}',
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
            '.reader-favorites-only-btn{width:32px;height:32px;font-size:14px;padding:4px;transition:var(--nc-transition)}',
            '.reader-favorites-only-btn[data-on="true"]{opacity:1;background:rgba(124,58,237,0.15)!important;color:var(--reader-star-color-filled,#a855f7)!important}',
            '.reader-favorites-only-btn:hover{opacity:1}',
            '.reader-explore-btn{position:relative;transition:background 0.2s}',
            '.reader-explore-btn.reader-explore-active{background:rgba(124,58,237,0.15)!important;border-color:var(--reader-accent,rgb(124 58 237))!important}',
            '.reader-explore-btn.reader-explore-active::after{content:"\\2022";position:absolute;right:4px;top:4px;font-size:12px;color:var(--reader-accent,rgb(124 58 237))}',
            '#reader-ctx-menu{position:absolute;background:rgba(30,30,30,1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px;z-index:999999;min-width:160px;touch-action:none}',
            '#reader-ctx-menu button{color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:13px;cursor:pointer;text-align:left;display:flex;align-items:center;justify-content:space-between}',
            '#reader-ctx-menu button.reader-ctx-active{background:rgba(0,130,201,0.3)}',
            '#reader-ctx-menu button .reader-ctx-check{opacity:0.6}',
            '#reader-ctx-menu .reader-ctx-star{width:16px;height:16px;margin-left:8px;display:inline-flex;align-items:center}',
                '#reader-ctx-menu .reader-ctx-icon{width:16px;height:16px;margin-right:8px;display:inline-flex;align-items:center;flex-shrink:0}',
            '#reader-ctx-menu .reader-ctx-separator{height:4px;border-top:1px solid rgba(255,255,255,0.15);margin:4px 0}',
            '.reader-navs-hidden .reader-header-nav{opacity:0!important;transform:translateY(-100%)!important}',
            '.reader-navs-hidden .reader-nav-bar{opacity:0!important;transform:translateY(100%)!important}',
            '.reader-error{text-align:center;padding:20px;color:var(--nc-red)}',
            '.renamer-reader-loading-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue,#0082c9);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin-right:8px;vertical-align:middle}'
        ].join('');
        document.head.appendChild(sk);
    }

    function getOwnerUid(ctx) {
        if (!ctx || !ctx.state) return null;
        return (ctx.state.ownerUid && ctx.state.ownerUid !== '') ? ctx.state.ownerUid : null;
    }

    function appendOwnerParam(url, ctx) {
        var ownerUid = getOwnerUid(ctx);
        if (ownerUid) {
            var sep = (url.indexOf('?') !== -1) ? '&' : '?';
            url = url + sep + 'ownerUid=' + encodeURIComponent(ownerUid);
        }
        return url;
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
            '.azw': 'application/vnd.amazon.ebook',
            '.azw3': 'application/vnd.amazon.ebook',
            '.mobi': 'application/x-mobipocket-ebook',
            '.prc': 'application/x-mobipocket-ebook',
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
        var promise = self.ctx.apiRequest(appendOwnerParam(self.ctx.getBaseUrl() + '/api/pdf/page?path=' + encodeURIComponent(self.filePath) + '&page=' + pageNum + '&width=' + PDF_RENDER_WIDTH, self.ctx), { method: 'GET' }).then(function(data) {
             if (data && data.success && data.dataUrl) {
                cache[key] = data.dataUrl;
                pdfCacheTouch(self.ctx, key);
                pdfCacheEvict(self.ctx);
            }
            if (data && typeof data.pageCount === 'number') self.totalPages = data.pageCount;
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
                if (data && data.error) {
                    return self._initPdfJsFallback().catch(function() {
                        throw new Error(data.error);
                    });
                }
                throw new Error((data && data.error) || 'Erreur chargement PDF');
            }
            self.totalPages = typeof data.pageCount === 'number' && data.pageCount > 0 ? data.pageCount : 0;
            if (self.totalPages === 0) {
                return self._initPdfJsFallback();
            }
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
                console.error('[GenericViewer] EpubSource.load: no blob available for epub fallback');
                throw new Error('No blob for PDF.js fallback');
            }
            return blob.arrayBuffer();
        }).then(function(arrayBuffer) {
            if (!window.pdfjsLib) {
                console.error('[GenericViewer] EpubSource.load: pdf.js library not loaded');
                throw new Error('pdf.js library not loaded');
            }
            var pdfjsLib = window.pdfjsLib;
            console.log('[GenericViewer] EpubSource.load: initializing PDF.js fallback, blob size=' + arrayBuffer.byteLength);
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
        var aNorm = String(a).replace(/^\/+/, '');
        var bNorm = String(b).replace(/^\/+/, '');
        if (aNorm === bNorm) return true;
        var aDec, bDec;
        try { aDec = decodeURIComponent(aNorm); } catch (e) {}
        try { bDec = decodeURIComponent(bNorm); } catch (e) {}
        return (aDec && aDec === bNorm) ||
               (bDec && aNorm === bDec) ||
               (aDec && bDec && aDec === bDec);
    }

    function collectAllFilesFromNode(node) {
        var files = [];
        if (!node || typeof node !== 'object') return files;
        if (Array.isArray(node.files)) files = files.concat(node.files);
        if (Array.isArray(node.children)) {
            node.children.forEach(function(child) {
                files = files.concat(collectAllFilesFromNode(child));
            });
        }
        return files;
    }

    function sortFilesByName(files) {
        var sorted = files.slice();
        sorted.sort(function(a, b) {
            return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
        });
        return sorted;
    }

    function findNextTome(ctx, filePath) {
        if (!ctx || !ctx.state || !filePath) return null;
        var curCol = ctx.state.currentCollection || ctx.state.readerCurrentCollection;
        if (curCol && curCol.rules) {
            var cf = sortFilesByName(collectAllFilesFromNode(curCol.rules));
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
                if (!col || !col.rules) continue;
                var files = sortFilesByName(collectAllFilesFromNode(col.rules));
                for (var j = 0; j < files.length; j++) {
                    if (pathsMatch(files[j].path, filePath)) {
                        return j < files.length - 1 ? files[j + 1] : null;
                    }
                }
            }
        }
        var scanned = ctx.state.readerScannedFiles;
        if (Array.isArray(scanned) && scanned.length) {
            var s = sortFilesByName(scanned);
            for (var k = 0; k < s.length; k++) {
                if (pathsMatch(s[k].path, filePath)) {
                    return k < s.length - 1 ? s[k + 1] : null;
                }
            }
        }
        return null;
    }

    function findPrevTome(ctx, filePath) {
        if (!ctx || !ctx.state || !filePath) return null;
        var curCol = ctx.state.currentCollection || ctx.state.readerCurrentCollection;
        if (curCol && curCol.rules) {
            var cf = sortFilesByName(collectAllFilesFromNode(curCol.rules));
            for (var cj = 0; cj < cf.length; cj++) {
                if (pathsMatch(cf[cj].path, filePath)) {
                    return cj > 0 ? cf[cj - 1] : null;
                }
            }
        }
        var colList = ctx.state.collections || ctx.state.readerCollections;
        if (Array.isArray(colList)) {
            for (var i = 0; i < colList.length; i++) {
                var col = colList[i];
                if (!col || !col.rules) continue;
                var files = sortFilesByName(collectAllFilesFromNode(col.rules));
                for (var j = 0; j < files.length; j++) {
                    if (pathsMatch(files[j].path, filePath)) {
                        return j > 0 ? files[j - 1] : null;
                    }
                }
            }
        }
        var scanned = ctx.state.readerScannedFiles;
        if (Array.isArray(scanned) && scanned.length) {
            var s = sortFilesByName(scanned);
            for (var k = 0; k < s.length; k++) {
                if (pathsMatch(s[k].path, filePath)) {
                    return k > 0 ? s[k - 1] : null;
                }
            }
        }
        return null;
    }

    function getTomeInfo(ctx, filePath) {
        var info = { collectionName: '', currentTome: 0, totalTomes: 0 };
        var col = ctx.state.currentCollection || ctx.state.readerCurrentCollection;
        if (col) {
            info.collectionName = col.name || '';
            var allFiles = collectAllFilesFromNode(col.rules);
            var sorted = sortFilesByName(allFiles);
            info.totalTomes = sorted.length;
            for (var i = 0; i < sorted.length; i++) {
                if (pathsMatch(sorted[i].path, filePath)) {
                    info.currentTome = sorted[i].tome || (i + 1);
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

        var favOnlyBtn = document.createElement('button');
        favOnlyBtn.type = 'button';
        favOnlyBtn.className = 'renamer-btn renamer-btn-secondary reader-favorites-only-btn';
        favOnlyBtn.dataset.action = 'favorites-only';
        favOnlyBtn.dataset.on = 'false';
        favOnlyBtn.title = (ctx.t ? ctx.t('readerFavoritesOnlyHint') : '') || 'Show only favorite pages';
        favOnlyBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerFavoritesOnlyHint') : '') || 'Show only favorite pages');
        favOnlyBtn.innerHTML = getReaderStar(false);
        favOnlyBtn.style.cssText = 'width:32px;height:32px;font-size:14px;padding:4px;margin-left:auto;';
        topRow.appendChild(favOnlyBtn);

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

    function MultiImageSource(blobs, paths, ctx, groupPath) {
        this.type = 'multi-image';
        this.blobs = blobs || [];
        this.paths = paths || [];
        this.ctx = ctx;
        this.groupPath = groupPath;
        this.imageUrls = [];
        this.totalPages = this.blobs.length;
        this._loaded = false;
    }

    MultiImageSource.prototype.load = function() {
        var self = this;
        var urls = [];
        for (var i = 0; i < self.blobs.length; i++) {
            urls.push(URL.createObjectURL(self.blobs[i]));
        }
        self.imageUrls = urls;
        self._loaded = true;
        return Promise.resolve();
    };

    MultiImageSource.prototype.renderPage = function(pageNum, element) {
        var img = element;
        img.src = this.imageUrls[pageNum - 1];
        img.alt = this.paths[pageNum - 1].replace(/^.*\//, '');
        return Promise.resolve(img);
    };

    MultiImageSource.prototype.createPageElement = function() {
        var img = document.createElement('img');
        img.className = 'reader-page-img';
        return img;
    };

    MultiImageSource.prototype.getPageStyle = function() {
        return '';
    };

    MultiImageSource.prototype.destroy = function() {
        for (var i = 0; i < this.imageUrls.length; i++) {
            URL.revokeObjectURL(this.imageUrls[i]);
        }
        this.imageUrls = [];
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
        console.log('[GenericViewer] EpubSource.load: path="' + self.filePath + '"');
        if (typeof window.ePub !== 'undefined') {
            console.log('[GenericViewer] EpubSource.load: ePub already loaded, resolving immediately');
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
        console.log('[GenericViewer] EpubSource.render: path="' + self.filePath + '" container=' + (container ? 'present' : 'null'));
        if (!window.ePub) {
            console.error('[GenericViewer] EpubSource.render: ePub library not available');
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
            console.log('[GenericViewer] EpubSource.render: book ready, calling rendition.display() for "' + self.filePath + '"');
            if (book.locations && typeof book.locations.generate === 'function') {
                console.log('[GenericViewer] EpubSource.render: generating epub locations');
                book.locations.generate(1000).then(function() {
                    console.log('[GenericViewer] EpubSource.render: locations generated, pageCount=' + (book.locations.pageCount || 'unknown'));
                }).catch(function(err) {
                    console.warn('[GenericViewer] EpubSource.render: locations.generate failed:', err.message);
                });
            } else {
                console.warn('[GenericViewer] EpubSource.render: book.locations.generate not available');
            }
            rendition.display().catch(function(err) {
                console.error('[GenericViewer] EpubSource.render: rendition.display() failed:', err && err.message ? err.message : String(err));
            });
        }).catch(function(err) {
            console.error('[GenericViewer] EpubSource.render: book.ready failed:', err && err.message ? err.message : String(err));
        });
        rendition.on('relocated', function(loc) {
            var pct = (loc && loc.percentage) ? loc.percentage : 0;
            var startIdx = (loc && loc.start && loc.start.index !== undefined) ? loc.start.index : -1;
            var startLoc = (loc && loc.start && loc.start.location !== undefined) ? loc.start.location : -1;
            var startPct = (loc && loc.start && loc.start.percentage !== undefined) ? loc.start.percentage : 0;
            console.log('[GenericViewer] EpubSource.render: relocated, percentage=' + pct + ' start.index=' + startIdx + ' start.location=' + startLoc + ' start.percentage=' + startPct + ' for "' + self.filePath + '"');
            if (self.ctx && self.ctx.state && typeof self.ctx.saveProgress === 'function') {
                if (self.ctx.state.readerBrowsingMode) return;
                var savePct = Math.round((pct > 0 ? pct : startPct) * 100);
                if (!savePct && startIdx >= 0 && startLoc >= 0) {
                    savePct = Math.round((startLoc / (book.spineTotal || book.spine.length || 1)) * 100);
                    console.log('[GenericViewer] EpubSource.render: using spine-based progress=' + savePct + '% (startLoc=' + startLoc + ', spine length=' + (book.spine ? book.spine.length : 'unknown') + ')');
                }
                self.ctx.state.readerCurrentPage = savePct;
                self.ctx.saveProgress(self.filePath, 'epub_percent', savePct, 100);
                console.log('[GenericViewer] EpubSource.render: saved progress=' + savePct + '% for "' + self.filePath + '"');
            }
        });
        return book.ready.then(function() {
            console.log('[GenericViewer] EpubSource.render: book ready, path="' + self.filePath + '"');
            return book;
        });
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
        console.log('[GenericViewer] createSource: ext="' + ext + '" path="' + filePath + '" blob=' + (blob ? 'present' : 'null'));
        if (ext === '.pdf') return new PdfSource(blob, ctx, filePath);
        if (ext === '.cbz' || ext === '.cbr') return new CbzSource(blob, ctx, filePath);
        if (/\.(jpe?g|png|gif|webp)$/i.test(ext)) return new ImageSource(blob, ctx, filePath);
        if (ext === '.epub') return new EpubSource(blob, ctx, filePath);
        if (ext === '.azw' || ext === '.azw3' || ext === '.mobi' || ext === '.prc') return new EpubSource(blob, ctx, filePath);
        console.warn('[GenericViewer] Unsupported extension "' + ext + '" for file "' + filePath + '" — no source handler available');
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

    function markTomeAsRead(ctx, filePath, totalPages) {
        if (!totalPages || totalPages <= 0) totalPages = 0;
        saveProgress(ctx, filePath, 'read', totalPages, totalPages);
    }

    function eraseProgressForFile(ctx, filePath) {
        if (!ctx) return;
        var bm = getBookmarks(ctx);
        if (bm && bm[filePath]) {
            delete bm[filePath];
        }
        if (ctx.state && ctx.state.readerBookmarks && ctx.state.readerBookmarks[filePath]) {
            delete ctx.state.readerBookmarks[filePath];
        }
        if (ctx.state && ctx.state.bookmarks && ctx.state.bookmarks[filePath]) {
            delete ctx.state.bookmarks[filePath];
        }
        if (ctx.apiRequest && ctx.getBaseUrl) {
            ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
                method: 'DELETE',
                body: JSON.stringify({ path: filePath })
            }).catch(function() {});
        }
    }

    function eraseProgressBeforeTome(ctx, targetPath, currentPath) {
        if (!ctx || !ctx.state) return;
        var curCol = ctx.state.currentCollection || ctx.state.readerCurrentCollection;
        if (!curCol || !curCol.rules) return;
        var cf = sortFilesByName(collectAllFilesFromNode(curCol.rules));
        if (cf.length) {
            var targetIdx = -1;
            var currentIdx = -1;
            for (var i = 0; i < cf.length; i++) {
                if (pathsMatch(cf[i].path, targetPath)) targetIdx = i;
                if (pathsMatch(cf[i].path, currentPath)) currentIdx = i;
            }
            if (targetIdx >= 0 && currentIdx > targetIdx) {
                for (var j = targetIdx + 1; j <= currentIdx; j++) {
                    eraseProgressForFile(ctx, cf[j].path);
                }
            }
        }
    }

    function markTomeAndEarlierAsRead(ctx, filePath, totalPages) {
        if (!ctx || !ctx.state) return;
        if (ctx.state.readerBrowsingMode) return;
        markTomeAsRead(ctx, filePath, totalPages);
        var curCol = ctx.state.currentCollection || ctx.state.readerCurrentCollection;
        if (!curCol || !curCol.rules) return;
        var cf = sortFilesByName(collectAllFilesFromNode(curCol.rules));
        if (cf.length) {
            var found = -1;
            for (var i = 0; i < cf.length; i++) {
                if (pathsMatch(cf[i].path, filePath)) { found = i; break; }
            }
            if (found > 0) {
                for (var j = 0; j < found; j++) {
                    var prevFile = cf[j];
                    var prevBm = getBookmarks(ctx)[prevFile.path];
                    if (!prevBm || prevBm.type !== 'read') {
                        var t = (prevBm && prevBm.total) ? prevBm.total : 0;
                        markTomeAsRead(ctx, prevFile.path, t);
                    }
                }
            }
        }
    }

    function restorePage(ctx, filePath, totalPages) {
        var savedBm = getBookmarks(ctx)[filePath];
        if (savedBm && savedBm.value > 0 && savedBm.value <= totalPages) {
            return savedBm.value;
        }
        return 1;
    }

    function createSwipeNav(element, handlers) {
        if (!element) return { destroy: function() {} };
        var onPrev = handlers.onPrev || function() {};
        var onNext = handlers.onNext || function() {};
        var onSwipeStart = handlers.onSwipeStart || function() {};
        var isEnabled = handlers.isEnabled || function() { return true; };

        var START_THRESHOLD = 30;
        var MAX_DURATION = 600;
        var startX = 0, startY = 0, startTime = 0, tracking = false;

        function onTouchStart(e) {
            if (!isEnabled()) return;
            if (e.touches && e.touches.length === 1) {
                var t = e.touches[0];
                startX = t.clientX;
                startY = t.clientY;
                startTime = Date.now();
                tracking = true;
                if (onSwipeStart) onSwipeStart();
            }
        }

        function onTouchMove() {
            if (!tracking) return;
        }

        function onTouchEnd(e) {
            if (!tracking) return;
            tracking = false;
            var deltaX = 0, deltaY = 0;
            if (e.changedTouches && e.changedTouches.length > 0) {
                var t = e.changedTouches[0];
                deltaX = t.clientX - startX;
                deltaY = t.clientY - startY;
            }
            var elapsed = Date.now() - startTime;
            var isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            if (isHorizontal && Math.abs(deltaX) > START_THRESHOLD && elapsed < MAX_DURATION) {
                if (deltaX > 0) {
                    onPrev();
                } else {
                    onNext();
                }
            }
        }

        var opts = { passive: true };
        element.addEventListener('touchstart', onTouchStart, opts);
        element.addEventListener('touchmove', onTouchMove, opts);
        element.addEventListener('touchend', onTouchEnd, opts);

        return {
            destroy: function() {
                element.removeEventListener('touchstart', onTouchStart, opts);
                element.removeEventListener('touchmove', onTouchMove, opts);
                element.removeEventListener('touchend', onTouchEnd, opts);
            }
        };
    }

    function createClickNavZone(element, handlers) {
        if (!element) return { destroy: function() {} };
        var onPrev = handlers.onPrev || function() {};
        var onNext = handlers.onNext || function() {};
        var isEnabled = handlers.isEnabled || function() { return true; };
        var ZONE = 0.2;

        function onClick(e) {
            if (!isEnabled(e)) return;
            var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            var x = e.clientX;
            var zoneWidth = viewportWidth * ZONE;
            if (x < zoneWidth) {
                onPrev();
                e.stopPropagation();
            } else if (x > viewportWidth - zoneWidth) {
                onNext();
                e.stopPropagation();
            }
        }

        element.addEventListener('click', onClick, true);
        return {
            destroy: function() {
                element.removeEventListener('click', onClick, true);
            }
        };
    }

    function initReaderSettingsPanel(ctx, options) {
        var nav = options.nav;
        var buttonGroup = options.buttonGroup;
        var container = options.container;
        var state = options.state;
        var clearHideTimer = options.clearHideTimer;
        var resumeInactivity = options.resumeInactivity;
        var settingsButtons = options.settingsButtons || [];

        var SETTINGS_GEAR_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_GEAR) || '';
        var settingsLabel = (ctx && ctx.t ? ctx.t('readerSettings') : '') || 'Settings';

        var settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'renamer-btn renamer-btn-secondary reader-settings-btn';
        settingsBtn.innerHTML = SETTINGS_GEAR_SVG || '⚙';
        settingsBtn.title = settingsLabel;
        settingsBtn.setAttribute('aria-label', settingsLabel);
        settingsBtn.dataset.state = 'closed';

        var panel = document.createElement('div');
        panel.className = 'reader-settings-panel';
        panel.setAttribute('role', 'group');
        panel.setAttribute('aria-label', settingsLabel);

        var navGroup = document.createElement('div');
        navGroup.className = 'reader-nav-group';
        if (settingsButtons.length > 0) {
            settingsButtons.forEach(function(btn) {
                navGroup.appendChild(btn);
            });
        } else {
            var placeholder = document.createElement('span');
            placeholder.className = 'reader-settings-placeholder';
            placeholder.textContent = (ctx && ctx.t ? (ctx.t('readerSettingsPlaceholder') || 'Bientôt') : 'Bientôt');
            navGroup.appendChild(placeholder);
        }
        panel.appendChild(navGroup);

        buttonGroup.appendChild(settingsBtn);
        nav.appendChild(panel);

        var outsideListener = null;
        var closeTimer = null;

        function openSettings() {
            if (state.active) return;
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
            state.active = true;
            settingsBtn.dataset.state = 'open';
            if (typeof clearHideTimer === 'function') clearHideTimer();
            if (container) container.classList.remove('reader-cursor-hidden');
            if (nav) nav.classList.add('reader-nav-settings-open');
            panel.classList.add('reader-settings-open');
            panel.style.height = '0';
            requestAnimationFrame(function() {
                panel.style.height = panel.scrollHeight + 'px';
            });
            attachOutside();
        }

        function closeSettings() {
            if (!state.active) return;
            state.active = false;
            settingsBtn.dataset.state = 'closed';
            panel.style.height = '0';
            if (closeTimer) clearTimeout(closeTimer);
            closeTimer = setTimeout(function() {
                closeTimer = null;
                panel.classList.remove('reader-settings-open');
                if (nav) nav.classList.remove('reader-nav-settings-open');
                panel.style.height = '';
            }, 300);
            detachOutside();
            if (typeof resumeInactivity === 'function') resumeInactivity();
        }

        function toggleSettings(e) {
            if (e) { e.stopPropagation(); }
            if (state.active) {
                closeSettings();
            } else {
                openSettings();
            }
        }

        function onDocumentClick(e) {
            if (!state.active) return;
            if (!nav) return;
            if (nav.contains(e.target)) return;
            if (e.target === settingsBtn) return;
            closeSettings();
            e.stopPropagation();
        }

        function attachOutside() {
            if (outsideListener) return;
            outsideListener = onDocumentClick;
            document.addEventListener('click', onDocumentClick, true);
        }

        function detachOutside() {
            if (!outsideListener) return;
            document.removeEventListener('click', outsideListener, true);
            outsideListener = null;
        }

        settingsBtn.addEventListener('click', toggleSettings);

        return {
            button: settingsBtn,
            panel: panel,
            toggle: toggleSettings,
            open: openSettings,
            close: closeSettings,
        destroy: function() {
            closeSettings();
            if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
            detachOutside();
        }
        };
    }

    function buildReaderUI(ctx, container, source, filePath) {
        var totalPages = source.totalPages;
        container.innerHTML = '';

        var fitMode = 'contain';
        var currentZoom = 1.0;
        var hideTimer = null;
        var readerSettingsState = { active: false };
        var favoritesOnlyMode = false;
        var favoritePages = [];
        var favoritesLoaded = false;
        var navsHidden = false;
        var clickTimer = null;
        var suppressNextClick = false;
        var contextMenuOpen = false;
        var longPressTimer = null;
        var PREV_SVG = window.RenamerIcons ? window.RenamerIcons.BACK : '←';
        var NEXT_SVG = window.RenamerIcons ? window.RenamerIcons.POPUP_ARROW : '→';

        container.classList.add('reader-container');

        buildHeaderNav(ctx, container, filePath);

        var favoritesOnlyModeToggle = container.querySelector('.reader-favorites-only-btn');

        var pagesContainer = document.createElement('div');
        pagesContainer.className = 'reader-pages reader-pages-slider';
        container.appendChild(pagesContainer);

        var currentPage = restorePage(ctx, filePath, totalPages);
        var nextTome = findNextTome(ctx, filePath);
        var prevTome = findPrevTome(ctx, filePath);
        var preloadStarted = false;
        var direction = 'horizontal';

        function updateLayout(dir) {
            direction = dir;
            pagesContainer.classList.toggle('reader-pages-vertical', dir === 'vertical');
            goToPage(currentPage);
        }

        function goToPage(page) {
            var offset = -(computeOffset(page)) * 100;
            if (direction === 'horizontal') {
                pagesContainer.style.transform = 'translateX(' + offset + '%)';
            } else {
                pagesContainer.style.transform = 'translateY(' + offset + '%)';
            }
            if (pageLabel) pageLabel.textContent = page + ' / ' + totalPages;
            updateNavButtons();
        }

        function doSaveProgress() {
            if (ctx.state && ctx.state.readerBrowsingMode) return;
            if (currentPage >= totalPages && totalPages > 0) {
                var existing = getBookmarks(ctx)[filePath];
                if (!existing || existing.type !== 'read') {
                    markTomeAsRead(ctx, filePath, totalPages);
                }
            } else {
                var existingBm = getBookmarks(ctx)[filePath];
                if (existingBm && existingBm.type === 'read') return;
                saveProgress(ctx, filePath, 'reader_page', currentPage, totalPages);
            }
        }

        function updateExploreToggle() {
            if (exploreToggle) {
                exploreToggle.dataset.browsingMode = ctx.state && ctx.state.readerBrowsingMode ? 'true' : 'false';
                if (ctx.state && ctx.state.readerBrowsingMode) {
                    exploreToggle.classList.add('reader-explore-active');
                } else {
                    exploreToggle.classList.remove('reader-explore-active');
                }
            }
        }

        var RENDER_RADIUS = 2;

        function computeOffset(page) {
            if (!favoritesOnlyMode || !favoritePages.length) return page - 1;
            var idx = 0;
            for (var i = 0; i < favoritePages.length; i++) {
                if (favoritePages[i] < page) idx++;
            }
            return idx;
        }

        function isPageFavorite(page) {
            return favoritePages.indexOf(page) !== -1;
        }

        function nextFavoritePage(after) {
            for (var i = 0; i < favoritePages.length; i++) {
                if (favoritePages[i] > after) return favoritePages[i];
            }
            return null;
        }

        function prevFavoritePage(before) {
            for (var i = favoritePages.length - 1; i >= 0; i--) {
                if (favoritePages[i] < before) return favoritePages[i];
            }
            return null;
        }

        function refreshFavorites() {
            loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                favoritePages = (favPages || []).slice().sort(function(a, b) { return a - b; });
                favoritesLoaded = true;
                if (favoritesOnlyModeToggle) {
                    favoritesOnlyModeToggle.dataset.active = favoritePages.length ? 'true' : 'false';
                    favoritesOnlyModeToggle.style.opacity = favoritePages.length ? '1' : '0.3';
                    favoritesOnlyModeToggle.disabled = !favoritePages.length;
                }
                if (favoritesOnlyMode) {
                    if (!favoritePages.length) {
                        favoritesOnlyMode = false;
                        favoritesOnlyModeToggle.dataset.on = 'false';
                    } else {
                        syncSlidesVisibility();
                        goToPage(currentPage);
                    }
                }
                syncStarStatesInSelector();
            }).catch(function() {
                favoritesLoaded = true;
            });
        }

        function syncSlidesVisibility() {
            applyFavOnlyVisibility();
        }

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

        function applyFavOnlyVisibility() {
            for (var k = 0; k < slides.length; k++) {
                var si = slides[k];
                var visible = !favoritesOnlyMode || !favoritePages.length || isPageFavorite(si.pageNum);
                si.slide.style.display = visible ? '' : 'none';
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
        zoomOutBtn.title = 'Zoom out (2%)';

        var zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '100';
        zoomSlider.max = '300';
        zoomSlider.value = '100';
        zoomSlider.step = '2';
        zoomSlider.title = 'Zoom';
        zoomSlider.className = 'reader-zoom-slider';

        var zoomInBtn = document.createElement('button');
        zoomInBtn.type = 'button';
        zoomInBtn.className = 'renamer-btn renamer-btn-secondary reader-zoom-btn reader-zoom-in';
        zoomInBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.PLUS : '+';
        zoomInBtn.title = 'Zoom in (2%)';

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
        container.appendChild(nav);

        var exploreToggle = document.createElement('button');
        exploreToggle.type = 'button';
        exploreToggle.className = 'renamer-btn renamer-btn-secondary reader-explore-btn';
        exploreToggle.dataset.browsingMode = 'false';
        exploreToggle.title = (ctx.t ? ctx.t('readerExploreMode') : '') || 'Mode exploration / Exploration mode';
        exploreToggle.setAttribute('aria-label', (ctx.t ? ctx.t('readerExploreMode') : '') || 'Mode exploration / Exploration mode');
        var exploreLabel = document.createElement('span');
        exploreLabel.style.cssText = 'font-size:12px;opacity:0.8;';
        exploreLabel.textContent = (ctx.t ? ctx.t('readerExploreMode') : '') || 'Exploration';
        exploreToggle.appendChild(exploreLabel);
        exploreToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (ctx.state) {
                ctx.state.readerBrowsingMode = !ctx.state.readerBrowsingMode;
                updateExploreToggle();
                if (ctx && typeof ctx.updateUrl === 'function') {
                    ctx.updateUrl({ explore: ctx.state.readerBrowsingMode ? '1' : null });
                }
            }
        });

        var exploreSeparator = document.createElement('div');
        exploreSeparator.className = 'reader-ctx-separator';
        exploreSeparator.style.cssText = 'height:4px;border-top:1px solid rgba(255,255,255,0.15);margin:4px 0;width:100%';

        var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        var settingsButtons = isTouchDevice
            ? [directionToggle, exploreToggle]
            : [zoomResetBtn, zoomOutBtn, zoomSlider, zoomInBtn, zoomLabel, directionToggle, exploreToggle];

        var readerSettings = initReaderSettingsPanel(ctx, {
            nav: nav,
            buttonGroup: rightGroup,
            container: container,
            state: readerSettingsState,
            clearHideTimer: function() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } },
            resumeInactivity: function() { showCursor(); },
            settingsButtons: settingsButtons
        });

        updateExploreToggle();

        function updateNavButtons() {
            if (favoritesOnlyMode && favoritePages.length) {
                prevBtn.disabled = prevFavoritePage(currentPage) === null && !prevTome;
                nextBtn.disabled = nextFavoritePage(currentPage) === null && !nextTome;
            } else {
                prevBtn.disabled = (currentPage <= 1) && !prevTome;
                nextBtn.disabled = (currentPage >= totalPages) && !nextTome;
            }
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
            markTomeAndEarlierAsRead(ctx, filePath, totalPages);
            if (container._readerUIInstance && typeof container._readerUIInstance.destroy === 'function') {
                try { container._readerUIInstance.destroy(); } catch (e) {}
            }
            container._readerUIInstance = null;
            delete container._readerPreloadedBlob;
            if (ctx.state) {
                ctx.state.currentTome = { path: nextTome.path, name: nextTome.name, tome: nextTome.tome || 0 };
            }
            if (ctx && typeof ctx.updateUrl === 'function') {
                ctx.updateUrl({ read: nextTome.path });
            }
            if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderReader === 'function') {
                window.RenamerReader.renderReader(ctx, nextTome.path, container);
            } else {
                renderFile(ctx, nextTome.path, null, container);
            }
        }

        function switchToPrevTome(targetTome) {
            if (!targetTome) return;
            if (container._readerUIInstance && typeof container._readerUIInstance.destroy === 'function') {
                try { container._readerUIInstance.destroy(); } catch (e) {}
            }
            container._readerUIInstance = null;
            delete container._readerPreloadedBlob;
            if (ctx.state) {
                ctx.state.currentTome = { path: targetTome.path, name: targetTome.name, tome: targetTome.tome || 0 };
            }
            if (ctx && typeof ctx.updateUrl === 'function') {
                ctx.updateUrl({ read: targetTome.path });
            }
            if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderReader === 'function') {
                window.RenamerReader.renderReader(ctx, targetTome.path, container);
            } else {
                renderFile(ctx, targetTome.path, null, container);
            }
        }

        function showPrevTomeDialog(targetTome) {
            var existing = document.getElementById('reader-prev-tome-overlay');
            if (existing) existing.remove();

            var overlay = document.createElement('div');
            overlay.id = 'reader-prev-tome-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200000;display:flex;align-items:center;justify-content:center;';

            var dialog = document.createElement('div');
            dialog.className = 'renamer-modal';
            dialog.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:420px;width:90%;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);';

            var title = document.createElement('h3');
            title.textContent = (ctx.t ? ctx.t('readerGoToPrevTome') : '') || 'Aller au tome précédent';

            var msg = document.createElement('div');
            msg.style.cssText = 'margin:12px 0;font-size:14px;line-height:1.4;';
            msg.textContent = (ctx.t ? ctx.t('readerPrevTomePrompt') : '') || 'Voulez-vous naviguer vers le tome précédent ?';

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';

            var browseBtn = document.createElement('button');
            browseBtn.type = 'button';
            browseBtn.className = 'renamer-btn renamer-btn-secondary';
            browseBtn.textContent = (ctx.t ? ctx.t('readerBrowseWithoutProgress') : '') || 'Navigation sans progression';
            browseBtn.onclick = function() {
                overlay.remove();
                if (ctx.state) ctx.state.readerBrowsingMode = true;
                if (ctx && typeof ctx.updateUrl === 'function') {
                    ctx.updateUrl({ explore: '1' });
                }
                switchToPrevTome(targetTome);
            };

            var eraseBtn = document.createElement('button');
            eraseBtn.type = 'button';
            eraseBtn.className = 'renamer-btn renamer-btn-secondary';
            eraseBtn.textContent = (ctx.t ? ctx.t('readerErasePrevProgress') : '') || 'Effacer la progression';
            eraseBtn.onclick = function() {
                overlay.remove();
                eraseProgressBeforeTome(ctx, targetTome.path, filePath);
                switchToPrevTome(targetTome);
            };

            var cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'renamer-btn';
            cancelBtn.textContent = (ctx.t ? ctx.t('readerCancel') : '') || 'Annuler';
            cancelBtn.onclick = function() { overlay.remove(); };

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(eraseBtn);
            btnRow.appendChild(browseBtn);

            dialog.appendChild(title);
            dialog.appendChild(msg);
            dialog.appendChild(btnRow);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            var escHandler = function(e) {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
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
                refreshFavorites();
            }).catch(function() {
                if (!pageStarBtn.parentNode) return;
                pageStarBtn.dataset.favorite = isFav ? 'true' : 'false';
                pageStarBtn.innerHTML = getReaderStar(isFav);
                if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
            });
        });

        if (favoritesOnlyModeToggle) {
            favoritesOnlyModeToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (!favoritesLoaded || !favoritePages.length) {
                    if (ctx.showToast) {
                        ctx.showToast((ctx.t ? ctx.t('readerNoPageFavorites') : '') || 'No favorite pages', 'info');
                    }
                    return;
                }
                favoritesOnlyMode = !favoritesOnlyMode;
                favoritesOnlyModeToggle.dataset.on = favoritesOnlyMode ? 'true' : 'false';
                favoritesOnlyModeToggle.innerHTML = getReaderStar(favoritesOnlyMode);
                if (ctx.showToast) {
                    ctx.showToast(
                        favoritesOnlyMode
                            ? ((ctx.t ? ctx.t('readerFavoritesOnlyActive') : '') || 'Favorites mode active')
                            : ((ctx.t ? ctx.t('readerFavoritesOnlyInactive') : '') || 'Favorites mode deactivated'),
                        'success'
                    );
                }
                if (favoritesOnlyMode) {
                    syncSlidesVisibility();
                    if (favoritePages.indexOf(currentPage) === -1) {
                        currentPage = favoritePages[0] || currentPage;
                    }
                } else {
                    syncSlidesVisibility();
                }
                goToPage(currentPage);
                renderVisiblePages();
            });
        }

        function syncStarStatesInSelector() {
            var grid = document.getElementById('reader-page-selector-grid');
            if (!grid) return;
            var stars = grid.querySelectorAll('.reader-page-star');
            stars.forEach(function(star) {
                var pn = parseInt(star.dataset.page, 10);
                var isFav = favoritePages.indexOf(pn) !== -1;
                star.dataset.favorite = isFav ? 'true' : 'false';
                star.innerHTML = getReaderStar(isFav);
            });
        }

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

            var selectorFavOnlyBtn = document.createElement('button');
            selectorFavOnlyBtn.type = 'button';
            selectorFavOnlyBtn.className = 'renamer-btn renamer-btn-secondary reader-favorites-only-btn';
            selectorFavOnlyBtn.dataset.action = 'selector-favorites-only';
            selectorFavOnlyBtn.dataset.on = favoritesOnlyMode ? 'true' : 'false';
            selectorFavOnlyBtn.title = (ctx.t ? ctx.t('readerFavoritesOnlyHint') : '') || 'Show only favorite pages';
            selectorFavOnlyBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerFavoritesOnlyHint') : '') || 'Show only favorite pages');
            selectorFavOnlyBtn.innerHTML = getReaderStar(favoritesOnlyMode);
            selectorFavOnlyBtn.style.cssText = 'width:32px;height:32px;font-size:14px;padding:4px;margin-right:4px;';
            modalHeader.appendChild(selectorFavOnlyBtn);

            selectorFavOnlyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (!favoritePages.length) {
                    if (ctx.showToast) {
                        ctx.showToast((ctx.t ? ctx.t('readerNoPageFavorites') : '') || 'No favorite pages', 'info');
                    }
                    return;
                }
                favoritesOnlyMode = !favoritesOnlyMode;
                selectorFavOnlyBtn.dataset.on = favoritesOnlyMode ? 'true' : 'false';
                selectorFavOnlyBtn.innerHTML = getReaderStar(favoritesOnlyMode);
                if (favoritesOnlyModeToggle) {
                    favoritesOnlyModeToggle.dataset.on = favoritesOnlyMode ? 'true' : 'false';
                    favoritesOnlyModeToggle.innerHTML = getReaderStar(favoritesOnlyMode);
                }
                if (favoritesOnlyMode) {
                    if (favoritePages.indexOf(currentPage) === -1) {
                        currentPage = favoritePages[0] || currentPage;
                    }
                    goToPage(currentPage);
                }
                applyFavOnlyGridFilter();
            });
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
                } else if (source.type === 'multi-image') {
                    if (source.imageUrls && source.imageUrls[pageNum - 1]) {
                        thumbCache[thumbKey] = source.imageUrls[pageNum - 1];
                        return Promise.resolve(source.imageUrls[pageNum - 1]);
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
                            refreshFavorites();
                            applyFavOnlyGridFilter();
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

            function applyFavOnlyGridFilter() {
                var allBtns = grid.querySelectorAll('.reader-page-selector-btn');
                allBtns.forEach(function(b) {
                    var pn = parseInt(b.dataset.page, 10);
                    if (favoritesOnlyMode && favoritePages.length) {
                        b.style.display = favoritePages.indexOf(pn) !== -1 ? '' : 'none';
                    } else {
                        b.style.display = '';
                    }
                });
            }

            function onSelectorStarClick(starBtn, pageNum) {
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
                        refreshFavorites();
                        applyFavOnlyGridFilter();
                    }).catch(function() {
                        starBtn.dataset.favorite = isFav ? 'true' : 'false';
                        starBtn.innerHTML = getReaderStar(isFav);
                        if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                    });
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
                var el = pageEls[k];
                if (isTouchDevice || currentZoom <= 1) {
                    el.style.transform = 'none';
                } else {
                    el.style.transform = 'scale(' + currentZoom + ')';
                }
                el.style.transformOrigin = el.dataset.zoomOrigin || 'center center';
            }
            var slides = pagesContainer.querySelectorAll('.reader-slide');
            for (var s = 0; s < slides.length; s++) {
                slides[s].classList.toggle('reader-slide-zoomed', currentZoom > 1);
            }
            pagesContainer.classList.toggle('reader-fit-cover', fitMode === 'cover');
            pagesContainer.classList.toggle('reader-fit-crop', fitMode === 'crop');
            var pct = Math.round(currentZoom * 100);
            zoomSlider.value = pct;
            zoomLabel.textContent = pct + '%';
            updateZoomOverflow();
        }

        function adjustZoom(delta) {
            currentZoom = Math.max(1.0, Math.min(3.0, currentZoom + delta));
            applyZoom();
        }

        function updateZoomOverflow() {
            container.classList.toggle('reader-zoomed', currentZoom > 1);
        }

        function hideCursor() {
            if (readerSettingsState.active) return;
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
                if (contextMenuOpen) return;
                if (!navHovered) showCursor();
            });
            el.addEventListener('click', function(e) {
                if (suppressNextClick) {
                    suppressNextClick = false;
                    e.stopImmediatePropagation();
                    return;
                }
                if (!contextMenuOpen) showCursor();
            });
        });

        var swipeNav = createSwipeNav(pagesContainer, {
            onPrev: function() { navigatePrev(); suppressNextClick = true; setTimeout(function() { suppressNextClick = false; }, 800); },
            onNext: function() { navigateNext(); suppressNextClick = true; setTimeout(function() { suppressNextClick = false; }, 800); },
            onSwipeStart: function() { if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; } hideCursor(); },
            isEnabled: function() { return currentZoom <= 1 && !contextMenuOpen; }
        });

        var clickNavZone = createClickNavZone(pagesContainer, {
            onPrev: function() { navigatePrev(); },
            onNext: function() { navigateNext(); },
            isEnabled: function() { return currentZoom <= 1 && !contextMenuOpen; }
        });

        function toggleReaderNavs() {
            navsHidden = !navsHidden;
            if (navsHidden) {
                container.classList.add('reader-navs-hidden');
                if (hideTimer) clearTimeout(hideTimer);
            } else {
                container.classList.remove('reader-navs-hidden');
                showCursor();
            }
        }

        pagesContainer.addEventListener('click', function(e) {
            if (contextMenuOpen) return;
            e.stopPropagation();
            if (e.target.closest && e.target.closest('.reader-nav-bar, .reader-header-nav')) return;
            if (suppressNextClick) {
                suppressNextClick = false;
                return;
            }

            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                    var isFav = (favPages || []).indexOf(currentPage) !== -1;
                    toggleReaderPageFavorite(ctx, filePath, currentPage, !isFav).then(function(result) {
                        if (result && result.success) {
                            refreshPageStar();
                            if (ctx.showToast) {
                                var msg = !isFav
                                    ? ((ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Added to favorites')
                                    : ((ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Removed from favorites');
                                ctx.showToast(msg, 'success');
                            }
                        }
                    }).catch(function() {});
                });
                return;
            }

            clickTimer = setTimeout(function() {
                clickTimer = null;
                toggleReaderNavs();
            }, 300);
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
            } else if (typeof el.requestFullscreen === 'function') {
                el.requestFullscreen().then(function() {
                    showCursor();
                }).catch(function() {});
            }
        });

        document.addEventListener('fullscreenchange', function() {
            var active = !!document.fullscreenElement;
            fullscreenBtn.innerHTML = active ? (window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷') : (window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶');
            fullscreenBtn.title = active ? 'Quitter plein écran / Exit fullscreen' : 'Plein écran / Fullscreen';
            showCursor();
        });

        directionToggle.addEventListener('click', function() {
            var newDir = direction === 'horizontal' ? 'vertical' : 'horizontal';
            updateLayout(newDir);
            prevBtn.disabled = false;
            nextBtn.disabled = false;
            updateNavButtons();
        });

        function navigatePrev() {
            if (favoritesOnlyMode && favoritePages.length) {
                var target = prevFavoritePage(currentPage);
                if (target !== null) {
                    currentPage = target;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    renderVisiblePages();
                    refreshPageStar();
                } else if (prevTome) {
                    showPrevTomeDialog(prevTome);
                } else {
                    prevBtn.disabled = true;
                }
                return;
            }
            if (currentPage > 1) {
                currentPage--;
                pageLabel.textContent = currentPage + ' / ' + totalPages;
                updateNavButtons();
                goToPage(currentPage);
                doSaveProgress();
                renderVisiblePages();
                refreshPageStar();
            } else if (prevTome) {
                showPrevTomeDialog(prevTome);
            } else {
                prevBtn.disabled = true;
            }
        }

        function navigateNext() {
            if (favoritesOnlyMode && favoritePages.length) {
                var target = nextFavoritePage(currentPage);
                if (target !== null) {
                    currentPage = target;
                    pageLabel.textContent = currentPage + ' / ' + totalPages;
                    updateNavButtons();
                    goToPage(currentPage);
                    renderVisiblePages();
                    refreshPageStar();
                    maybePreloadNextTome();
                } else if (nextTome) {
                    switchToNextTome();
                } else {
                    nextBtn.disabled = true;
                }
                return;
            }
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
        }

        prevBtn.addEventListener('click', navigatePrev);

        nextBtn.addEventListener('click', navigateNext);

        zoomSlider.addEventListener('input', function() {
            currentZoom = parseInt(zoomSlider.value, 10) / 100;
            applyZoom();
        });

        zoomResetBtn.addEventListener('click', function() {
            zoomSlider.value = '100';
            currentZoom = 1;
            fitMode = 'contain';
            applyZoom();
        });

        zoomOutBtn.addEventListener('click', function() {
            adjustZoom(-0.02);
        });

        zoomInBtn.addEventListener('click', function() {
            adjustZoom(0.02);
        });

        var onKeyDown = function(e) {
            if (!container.contains(e.target) && e.target !== document.body) {
                return;
            }
             if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else if (typeof container.requestFullscreen === 'function') {
                    container.requestFullscreen().catch(function() {});
                }
                return;
            }
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                adjustZoom(0.02);
                return;
            }
            if (e.key === '-') {
                e.preventDefault();
                adjustZoom(-0.02);
                return;
            }
            if (direction === 'horizontal') {
                if (e.key === 'ArrowLeft') {
                    navigatePrev();
                    if (currentPage < totalPages || nextTome || (currentPage <= 1 && prevTome)) e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    navigateNext();
                    e.preventDefault();
                }
            } else {
                if (e.key === 'ArrowUp') {
                    navigatePrev();
                    if (currentPage < totalPages || nextTome || (currentPage <= 1 && prevTome)) e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    navigateNext();
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
            var goingPrev = false;
            var goingNext = false;
            if (direction === 'horizontal' && Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
                goingPrev = e.deltaX < 0;
                goingNext = e.deltaX > 0;
            } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
                goingPrev = e.deltaY < 0;
                goingNext = e.deltaY > 0;
            }
            var oldPage = currentPage;
            if (goingPrev) {
                navigatePrev();
            } else if (goingNext) {
                navigateNext();
            }
            if (currentPage !== oldPage || (goingNext && nextTome) || (goingPrev && prevTome && currentPage <= 1)) {
                e.preventDefault();
            }
        }, { passive: false });

        container.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            contextMenuOpen = true;
            hideCursor();
            if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
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
                btn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    fitMode = mode;
                    pagesContainer.dataset.fitMode = fitMode;
                    applyZoom();
                    closeMenu();
                });
                return btn;
            }

            var addFavLabel = (ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Ajouter aux favoris';
            var removeFavLabel = (ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Retirer des favoris';
            var favItem = document.createElement('button');
            favItem.type = 'button';
            favItem.dataset.action = 'reader-ctx-favorite';

            var favState = { isFav: false, loaded: false };

            function renderFavoriteBtn() {
                var starSvg = getReaderStar(favState.isFav);
                var label = favState.isFav ? removeFavLabel : addFavLabel;
                favItem.innerHTML = '<span>' + label + '</span><span class="reader-ctx-star">' + starSvg + '</span>';
            }

            loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                if (!favItem.parentNode) return;
                favState.isFav = (favPages || []).indexOf(currentPage) !== -1;
                favState.loaded = true;
                renderFavoriteBtn();
            }).catch(function() {
                favState.loaded = true;
                renderFavoriteBtn();
            });

            favItem.addEventListener('click', function(ev) {
                ev.stopPropagation();
                if (!favState.loaded) return;
                var makeFav = !favState.isFav;
                favState.isFav = makeFav;
                renderFavoriteBtn();
                toggleReaderPageFavorite(ctx, filePath, currentPage, makeFav).then(function(result) {
                    if (result && result.success) {
                        refreshPageStar();
                        if (ctx.showToast) {
                            var msg = makeFav
                                ? ((ctx.t ? ctx.t('readerFavoriteAdded') : '') || 'Page favorite added')
                                : ((ctx.t ? ctx.t('readerFavoriteRemoved') : '') || 'Page favorite removed');
                            ctx.showToast(msg, 'success');
                        }
                        closeMenu();
                    } else {
                        favState.isFav = !makeFav;
                        renderFavoriteBtn();
                        if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                    }
                }).catch(function() {
                    if (!favItem.parentNode) return;
                    favState.isFav = !makeFav;
                    renderFavoriteBtn();
                    if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                });
            });

            menu.appendChild(favItem);

            var nextPageLabel = (ctx.t ? ctx.t('readerCtxNextPage') : '') || 'Page suivante';
            var nextPageBtn = document.createElement('button');
            nextPageBtn.type = 'button';
            nextPageBtn.innerHTML = '<span class="reader-ctx-icon">' + NEXT_SVG + '</span><span>' + nextPageLabel + '</span>';
            nextPageBtn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                navigateNext();
                closeMenu();
            });
            menu.appendChild(nextPageBtn);

            var prevPageLabel = (ctx.t ? ctx.t('readerCtxPrevPage') : '') || 'Page précédente';
            var prevPageBtn = document.createElement('button');
            prevPageBtn.type = 'button';
            prevPageBtn.innerHTML = '<span class="reader-ctx-icon">' + PREV_SVG + '</span><span>' + prevPageLabel + '</span>';
            prevPageBtn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                navigatePrev();
                closeMenu();
            });
            menu.appendChild(prevPageBtn);

            var coverLabel = (ctx.t ? ctx.t('readerFitCover') : '') || 'Zoom';
            menu.appendChild(makeItem(coverLabel, 'cover'));

            var containLabel = (ctx.t ? ctx.t('readerFitContain') : '') || 'Classique';
            menu.appendChild(makeItem(containLabel, 'contain'));

            var cropLabel = (ctx.t ? ctx.t('readerFitCrop') : '') || 'Crop';
            menu.appendChild(makeItem(cropLabel, 'crop'));

            container.appendChild(menu);

            var menuRect = menu.getBoundingClientRect();
            var containerRect = container.getBoundingClientRect();
            var top = e.clientY - containerRect.top;
            var left = e.clientX - containerRect.left;
            if (left + menuRect.width > containerRect.width - 8) {
                left = Math.max(8, containerRect.width - menuRect.width - 8);
            }
            if (top + menuRect.height > containerRect.height - 8) {
                top = Math.max(8, containerRect.height - menuRect.height - 8);
            }
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            var ctxEscHandler = function(ev) {
                if (ev.key === 'Escape') {
                    ev.stopImmediatePropagation();
                    closeMenu();
                }
            };
            function closeMenu() {
                if (!menu.parentNode) {
                    document.removeEventListener('click', onDocumentClick);
                    document.removeEventListener('keydown', ctxEscHandler, true);
                    return;
                }
                menu.remove();
                contextMenuOpen = false;
                hideCursor();
                document.removeEventListener('click', onDocumentClick);
                document.removeEventListener('keydown', ctxEscHandler, true);
            }
            function onDocumentClick(e) {
                if (!contextMenuOpen || !menu.parentNode) {
                    document.removeEventListener('click', onDocumentClick);
                    return;
                }
                if (menu.contains(e.target)) return;
                closeMenu();
            }
            setTimeout(function() {
                document.addEventListener('click', onDocumentClick);
                document.addEventListener('keydown', ctxEscHandler, true);
            }, 10);
        });

        (function() {
            var lpStartX = 0, lpStartY = 0, lpTarget = null;
            function onLpTouchStart(e) {
                if (e.touches.length !== 1 || contextMenuOpen) return;
                var t = e.touches[0];
                lpStartX = t.clientX;
                lpStartY = t.clientY;
                lpTarget = t.target;
                longPressTimer = setTimeout(function() {
                    if (contextMenuOpen) return;
                    var ev = new MouseEvent('contextmenu', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: lpStartX,
                        clientY: lpStartY
                    });
                    lpTarget.dispatchEvent(ev);
                }, 600);
            }
            function onLpTouchMove(e) {
                if (!longPressTimer) return;
                if (e.touches.length > 0) {
                    var t = e.touches[0];
                    if (Math.abs(t.clientX - lpStartX) > 15 || Math.abs(t.clientY - lpStartY) > 15) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                }
            }
            function onLpTouchEnd() {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
            container.addEventListener('touchstart', onLpTouchStart, { passive: true });
            container.addEventListener('touchmove', onLpTouchMove, { passive: true });
            container.addEventListener('touchend', onLpTouchEnd);
            container._readerLongPressHandlers = {
                destroy: function() {
                    container.removeEventListener('touchstart', onLpTouchStart);
                    container.removeEventListener('touchmove', onLpTouchMove);
                    container.removeEventListener('touchend', onLpTouchEnd);
                    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
                }
            };
        })();

        pagesContainer.addEventListener('click', function(e) {
            var img = e.target.closest('.reader-page-img, .reader-page-canvas');
            if (!img) return;
            if (fitMode === 'cover' || fitMode === 'crop') {
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

        loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
            favoritePages = (favPages || []).slice().sort(function(a, b) { return a - b; });
            favoritesLoaded = true;
            if (favoritesOnlyModeToggle) {
                favoritesOnlyModeToggle.dataset.active = favoritePages.length ? 'true' : 'false';
                favoritesOnlyModeToggle.style.opacity = favoritePages.length ? '1' : '0.3';
                favoritesOnlyModeToggle.disabled = !favoritePages.length;
            }
            var startFavOnly = !!(ctx.state && ctx.state.readerFavoritesOnly) && favoritePages.length > 0;
            if (startFavOnly) {
                favoritesOnlyMode = true;
                if (favoritesOnlyModeToggle) {
                    favoritesOnlyModeToggle.dataset.on = 'true';
                    favoritesOnlyModeToggle.innerHTML = getReaderStar(true);
                }
                if (favoritePages.indexOf(currentPage) === -1) {
                    currentPage = favoritePages[0];
                }
                syncSlidesVisibility();
                goToPage(currentPage);
                renderVisiblePages();
                updateNavButtons();
            }
        }).catch(function() {
            favoritesLoaded = true;
        });
        var uiInstance = {
            destroy: function() {
                document.getElementById('reader-ctx-menu')?.remove();
                if (readerSettings && typeof readerSettings.destroy === 'function') {
                    readerSettings.destroy();
                }
                document.removeEventListener('keydown', onKeyDown);
                if (swipeNav && typeof swipeNav.destroy === 'function') {
                    try { swipeNav.destroy(); } catch (e) {}
                }
                if (clickNavZone && typeof clickNavZone.destroy === 'function') {
                    try { clickNavZone.destroy(); } catch (e) {}
                }
                if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
                if (container._readerLongPressHandlers && typeof container._readerLongPressHandlers.destroy === 'function') {
                    try { container._readerLongPressHandlers.destroy(); } catch (e) {}
                }
                if (source && typeof source.destroy === 'function') {
                    try { source.destroy(); } catch (e) {}
                }
                container.classList.remove('reader-navs-hidden');
            }
        };
        container._readerUIInstance = uiInstance;
        return uiInstance;
    }

    function renderEpubUI(ctx, container, source, filePath) {
        console.log('[GenericViewer] renderEpubUI: path="' + filePath + '" source.type="' + source.type + '"');
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

        var epubSettingsState = { active: false };
        var epubNavsHidden = false;
        var epubCurrentPage = 0;
        var epubClickTimer = null;
        var epubContextMenuOpen = false;
        var epubLongPressTimer = null;
        var epubSuppressNextClick = false;
        container.appendChild(nav);

        var epubExploreToggle = document.createElement('button');
        epubExploreToggle.type = 'button';
        epubExploreToggle.className = 'renamer-btn renamer-btn-secondary reader-explore-btn';
        epubExploreToggle.dataset.browsingMode = 'false';
        epubExploreToggle.title = (ctx.t ? ctx.t('readerExploreMode') : '') || 'Mode exploration / Exploration mode';
        epubExploreToggle.setAttribute('aria-label', (ctx.t ? ctx.t('readerExploreMode') : '') || 'Mode exploration / Exploration mode');
        var epubExploreLabel = document.createElement('span');
        epubExploreLabel.style.cssText = 'font-size:12px;opacity:0.8;';
        epubExploreLabel.textContent = (ctx.t ? ctx.t('readerExploreMode') : '') || 'Exploration';
        epubExploreToggle.appendChild(epubExploreLabel);
        epubExploreToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (ctx.state) {
                ctx.state.readerBrowsingMode = !ctx.state.readerBrowsingMode;
                epubExploreToggle.dataset.browsingMode = ctx.state.readerBrowsingMode ? 'true' : 'false';
                if (ctx.state.readerBrowsingMode) {
                    epubExploreToggle.classList.add('reader-explore-active');
                } else {
                    epubExploreToggle.classList.remove('reader-explore-active');
                }
                if (ctx && typeof ctx.updateUrl === 'function') {
                    ctx.updateUrl({ explore: ctx.state.readerBrowsingMode ? '1' : null });
                }
            }
        });

        if (ctx.state && ctx.state.readerBrowsingMode) {
            epubExploreToggle.dataset.browsingMode = 'true';
            epubExploreToggle.classList.add('reader-explore-active');
        }

        var epubSettings = initReaderSettingsPanel(ctx, {
            nav: nav,
            buttonGroup: rightGroup,
            container: container,
            state: epubSettingsState,
            clearHideTimer: function() { if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; } },
            resumeInactivity: function() { showCursor(); },
            settingsButtons: [fullscreenBtn, epubExploreToggle]
        });

        var cursorHideTimer = null;

        function hideCursor() {
            if (epubSettingsState.active) return;
            container.classList.add('reader-cursor-hidden');
        }

        function showCursor() {
            container.classList.remove('reader-cursor-hidden');
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = setTimeout(hideCursor, 2000);
        }

        var epubNavHovered = false;
        var epubNavFocused = false;

        container.setAttribute('tabindex', '-1');
        container.addEventListener('click', function() {
            container.focus();
        });

        [container].forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', function() {
                if (epubContextMenuOpen) return;
                if (!epubNavHovered) showCursor();
            });
            el.addEventListener('click', function(e) {
                if (epubSuppressNextClick) {
                    epubSuppressNextClick = false;
                    e.stopImmediatePropagation();
                    return;
                }
                if (!epubContextMenuOpen) showCursor();
            });
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

        function navigatePrev(suppressShow) {
            if (source.rendition && source.rendition.prev) {
                try {
                    source.rendition.prev().catch(function() {});
                } catch (e) {
                    console.warn('[GenericViewer] navigatePrev: rendition.prev() error:', e.message);
                }
                if (!suppressShow) showCursor();
            }
        }

        function navigateNext(suppressShow) {
            if (source.rendition && source.rendition.next) {
                try {
                    source.rendition.next().catch(function() {});
                } catch (e) {
                    console.warn('[GenericViewer] navigateNext: rendition.next() error:', e.message);
                }
                if (!suppressShow) showCursor();
            }
        }

        prevBtn.addEventListener('click', function() { navigatePrev(); });

        nextBtn.addEventListener('click', function() { navigateNext(); });

        var epubSwipeNav = createSwipeNav(container, {
            onPrev: function() { navigatePrev(true); epubSuppressNextClick = true; setTimeout(function() { epubSuppressNextClick = false; }, 800); },
            onNext: function() { navigateNext(true); epubSuppressNextClick = true; setTimeout(function() { epubSuppressNextClick = false; }, 800); },
            onSwipeStart: function() { if (epubClickTimer) { clearTimeout(epubClickTimer); epubClickTimer = null; } hideCursor(); },
            isEnabled: function() { return !epubContextMenuOpen; }
        });

        var epubClickNavZone = createClickNavZone(container, {
            onPrev: function() { navigatePrev(true); },
            onNext: function() { navigateNext(true); },
            isEnabled: function(e) {
                if (!e || !e.target.closest) return false;
                if (epubContextMenuOpen) return false;
                return !e.target.closest('.reader-nav-bar, .reader-header-nav, a, button, input, select, textarea');
            }
        });

        container.addEventListener('click', function(e) {
            if (epubContextMenuOpen) return;
            e.stopPropagation();
            if (e.target.closest && e.target.closest('.reader-nav-bar, .reader-header-nav')) return;
            if (epubSuppressNextClick) {
                epubSuppressNextClick = false;
                return;
            }

            if (epubClickTimer) {
                clearTimeout(epubClickTimer);
                epubClickTimer = null;
                loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                    var isFav = (favPages || []).indexOf(epubCurrentPage) !== -1;
                    if (epubCurrentPage === 0) return;
                    toggleReaderPageFavorite(ctx, filePath, epubCurrentPage, !isFav).then(function(result) {
                        if (result && result.success) {
                            if (ctx.showToast) {
                                var msg = !isFav
                                    ? ((ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Added to favorites')
                                    : ((ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Removed from favorites');
                                ctx.showToast(msg, 'success');
                            }
                        }
                    }).catch(function() {});
                });
                return;
            }

            epubClickTimer = setTimeout(function() {
                epubClickTimer = null;
                epubNavsHidden = !epubNavsHidden;
                if (epubNavsHidden) {
                    container.classList.add('reader-navs-hidden');
                    if (cursorHideTimer) clearTimeout(cursorHideTimer);
                } else {
                    container.classList.remove('reader-navs-hidden');
                    showCursor();
                }
            }, 300);
        });

        container.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            epubContextMenuOpen = true;
            hideCursor();
            if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; }
            var existing = document.getElementById('reader-ctx-menu');
            if (existing) existing.remove();

            var menu = document.createElement('div');
            menu.id = 'reader-ctx-menu';

            var addFavLabel = (ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Ajouter aux favoris';
            var removeFavLabel = (ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Retirer des favoris';
            var favItem = document.createElement('button');
            favItem.type = 'button';
            favItem.dataset.action = 'reader-ctx-favorite';

            var favState = { isFav: false, loaded: false };

            function renderFavoriteBtn() {
                var starSvg = getReaderStar(favState.isFav);
                var label = favState.isFav ? removeFavLabel : addFavLabel;
                favItem.innerHTML = '<span>' + label + '</span><span class="reader-ctx-star">' + starSvg + '</span>';
            }

            loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                if (!favItem.parentNode) return;
                favState.isFav = (favPages || []).indexOf(epubCurrentPage) !== -1;
                favState.loaded = true;
                renderFavoriteBtn();
            }).catch(function() {
                favState.loaded = true;
                renderFavoriteBtn();
            });

            favItem.addEventListener('click', function(ev) {
                ev.stopPropagation();
                if (!favState.loaded || epubCurrentPage === 0) return;
                var makeFav = !favState.isFav;
                favState.isFav = makeFav;
                renderFavoriteBtn();
                toggleReaderPageFavorite(ctx, filePath, epubCurrentPage, makeFav).then(function(result) {
                    if (result && result.success) {
                        if (ctx.showToast) {
                            var msg = makeFav
                                ? ((ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Added to favorites')
                                : ((ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Removed from favorites');
                            ctx.showToast(msg, 'success');
                        }
                        closeMenu();
                    } else {
                        favState.isFav = !makeFav;
                        renderFavoriteBtn();
                        if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                    }
                }).catch(function() {
                    if (!favItem.parentNode) return;
                    favState.isFav = !makeFav;
                    renderFavoriteBtn();
                    if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                });
            });

            menu.appendChild(favItem);
            container.appendChild(menu);

            var menuRect = menu.getBoundingClientRect();
            var containerRect = container.getBoundingClientRect();
            var top = e.clientY - containerRect.top;
            var left = e.clientX - containerRect.left;
            if (left + menuRect.width > containerRect.width - 8) {
                left = Math.max(8, containerRect.width - menuRect.width - 8);
            }
            if (top + menuRect.height > containerRect.height - 8) {
                top = Math.max(8, containerRect.height - menuRect.height - 8);
            }
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            var ctxEscHandler = function(ev) {
                if (ev.key === 'Escape') {
                    ev.stopImmediatePropagation();
                    closeMenu();
                }
            };
            function closeMenu() {
                if (!menu.parentNode) {
                    document.removeEventListener('click', onDocumentClick);
                    document.removeEventListener('keydown', ctxEscHandler, true);
                    return;
                }
                menu.remove();
                epubContextMenuOpen = false;
                hideCursor();
                document.removeEventListener('click', onDocumentClick);
                document.removeEventListener('keydown', ctxEscHandler, true);
            }
            function onDocumentClick(e) {
                if (!epubContextMenuOpen || !menu.parentNode) {
                    document.removeEventListener('click', onDocumentClick);
                    return;
                }
                if (menu.contains(e.target)) return;
                closeMenu();
            }
            setTimeout(function() {
                document.addEventListener('click', onDocumentClick);
                document.addEventListener('keydown', ctxEscHandler, true);
            }, 10);
        });

        (function() {
            var lpStartX = 0, lpStartY = 0, lpTarget = null;
            function onLpTouchStart(e) {
                if (e.touches.length !== 1 || epubContextMenuOpen) return;
                var t = e.touches[0];
                lpStartX = t.clientX;
                lpStartY = t.clientY;
                lpTarget = t.target;
                epubLongPressTimer = setTimeout(function() {
                    if (epubContextMenuOpen) return;
                    var ev = new MouseEvent('contextmenu', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: lpStartX,
                        clientY: lpStartY
                    });
                    lpTarget.dispatchEvent(ev);
                }, 600);
            }
            function onLpTouchMove(e) {
                if (!epubLongPressTimer) return;
                if (e.touches.length > 0) {
                    var t = e.touches[0];
                    if (Math.abs(t.clientX - lpStartX) > 15 || Math.abs(t.clientY - lpStartY) > 15) {
                        clearTimeout(epubLongPressTimer);
                        epubLongPressTimer = null;
                    }
                }
            }
            function onLpTouchEnd() {
                if (epubLongPressTimer) {
                    clearTimeout(epubLongPressTimer);
                    epubLongPressTimer = null;
                }
            }
            container.addEventListener('touchstart', onLpTouchStart, { passive: true });
            container.addEventListener('touchmove', onLpTouchMove, { passive: true });
            container.addEventListener('touchend', onLpTouchEnd);
            container._readerEpubLongPressHandlers = {
                destroy: function() {
                    container.removeEventListener('touchstart', onLpTouchStart);
                    container.removeEventListener('touchmove', onLpTouchMove);
                    container.removeEventListener('touchend', onLpTouchEnd);
                    if (epubLongPressTimer) { clearTimeout(epubLongPressTimer); epubLongPressTimer = null; }
                }
            };
        })();

        fullscreenBtn.addEventListener('click', function() {
            var el = container;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else if (typeof el.requestFullscreen === 'function') {
                el.requestFullscreen().then(function() {
                    showCursor();
                }).catch(function() {});
            }
        });

        document.addEventListener('fullscreenchange', function() {
            var active = !!document.fullscreenElement;
            fullscreenBtn.innerHTML = active ? (window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷') : (window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶');
            fullscreenBtn.title = active ? 'Quitter plein écran / Exit fullscreen' : 'Plein écran / Fullscreen';
            showCursor();
        });

        var onKeyDown = function(e) {
            if (source.rendition && source.rendition.display && source.book && source.book.ready) {
                if (e.key === 'ArrowLeft') {
                    navigatePrev();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    navigateNext();
                    e.preventDefault();
                } else if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (typeof container.requestFullscreen === 'function') {
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
            var startKeys = loc && loc.start ? Object.keys(loc.start).join(',') : 'none';
            console.log('[GenericViewer] updatePageLabel: loc.start keys=[' + startKeys + ']', loc && loc.start ? loc.start : loc);
            var totalPages = (loc && loc.start && loc.start.totalPages) || (loc && loc.end && loc.end.totalPages) || 0;
            var currentPage = loc && loc.start && loc.start.index !== undefined ? loc.start.index + 1 : 0;
            if (currentPage > 0 && totalPages > 0) {
                pageLabel.textContent = currentPage + ' / ' + totalPages;
                epubCurrentPage = currentPage;
                console.log('[GenericViewer] updatePageLabel: displaying page', currentPage, '/', totalPages);
            } else if (currentPage > 0) {
                var total = source && source.book && source.book.spine ? source.book.spine.length : 0;
                var locTotal = 0;
                var locCurrent = loc && loc.start && loc.start.location !== undefined ? loc.start.location : 0;
                if (source && source.book && source.book.locations && typeof source.book.locations.length === 'function') {
                    locTotal = source.book.locations.length() || 0;
                }
                if (locTotal > 0) {
                    pageLabel.textContent = (locCurrent + 1) + ' / ' + locTotal;
                    epubCurrentPage = locCurrent + 1;
                    console.log('[GenericViewer] updatePageLabel: displaying location', locCurrent + 1, '/', locTotal);
                } else if (total > 0) {
                    pageLabel.textContent = 'Ch. ' + currentPage + ' / ' + total;
                    epubCurrentPage = currentPage;
                    console.log('[GenericViewer] updatePageLabel: displaying chapter', currentPage, '/', total, '(no page-based locations yet)');
                }
            } else if (loc) {
                console.warn('[GenericViewer] updatePageLabel: cannot determine page count, totalPages=' + totalPages + ' currentPage=' + currentPage);
            }
        }

        function refreshEpubPageCount() {
            if (!source || !source.book || !source.book.ready) return;
            source.book.ready.then(function() {
                if (!source.book || !source.book.ready) return;
                try {
                    var loc = source.book.locations;
                    if (loc && typeof loc.totalPageCount === 'number') {
                        console.log('[GenericViewer] refreshEpubPageCount: totalPageCount=' + loc.totalPageCount);
                    } else if (loc && typeof loc.pageCount === 'number') {
                        console.log('[GenericViewer] refreshEpubPageCount: pageCount=' + loc.pageCount);
                    }
                    if (source.rendition && source.rendition.location) {
                        try {
                            var currentLoc = source.rendition.location();
                            if (currentLoc && currentLoc.start) {
                                console.log('[GenericViewer] refreshEpubPageCount: current location start keys=[' + Object.keys(currentLoc.start).join(',') + ']');
                            }
                        } catch(e2) {
                            console.warn('[GenericViewer] refreshEpubPageCount: rendition.location() failed:', e2.message);
                        }
                    }
                } catch(e) {
                    console.error('[GenericViewer] refreshEpubPageCount: error:', e.message);
                }
            }).catch(function(e) {
                console.error('[GenericViewer] refreshEpubPageCount: book.ready failed:', e.message);
            });
        }

         showCursor();

         var epubWindowMouseMove = function(e) {
             if (epubContextMenuOpen) return;
             if (container.classList.contains('reader-cursor-hidden') && !epubNavHovered) {
                 showCursor();
             }
         };
         var epubWindowMouseDown = function(e) {
             if (epubContextMenuOpen) return;
             if (container.classList.contains('reader-cursor-hidden') && !epubNavHovered) {
                 showCursor();
             }
             if (container.classList.contains('reader-navs-hidden')) {
                 container.classList.remove('reader-navs-hidden');
                 if (epubNavsHidden !== undefined) epubNavsHidden = false;
                 console.log('[GenericViewer] renderEpubUI: nav restored via mousedown');
             }
             container.focus();
         };
         window.addEventListener('mousemove', epubWindowMouseMove);
         window.addEventListener('mousedown', epubWindowMouseDown);

        var epubFavOnlyBtn = container.querySelector('.reader-favorites-only-btn');
        var epubFavoritesOnlyMode = false;
        var epubFavoritePages = [];
        if (epubFavOnlyBtn) {
            epubFavOnlyBtn.style.opacity = '0.3';
            epubFavOnlyBtn.disabled = true;
            loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                epubFavoritePages = (favPages || []).slice().sort(function(a, b) { return a - b; });
                if (epubFavOnlyBtn.parentNode) {
                    epubFavOnlyBtn.style.opacity = epubFavoritePages.length ? '1' : '0.3';
                    epubFavOnlyBtn.disabled = !epubFavoritePages.length;
                }
                var startFavOnly = !!(ctx.state && ctx.state.readerFavoritesOnly) && epubFavoritePages.length > 0;
                if (startFavOnly) {
                    epubFavoritesOnlyMode = true;
                    epubFavOnlyBtn.dataset.on = 'true';
                    epubFavOnlyBtn.innerHTML = getReaderStar(true);
                }
            }).catch(function() {});
            epubFavOnlyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (!epubFavoritePages.length) {
                    if (ctx.showToast) {
                        ctx.showToast((ctx.t ? ctx.t('readerNoPageFavorites') : '') || 'No favorite pages', 'info');
                    }
                    return;
                }
                epubFavoritesOnlyMode = !epubFavoritesOnlyMode;
                epubFavOnlyBtn.dataset.on = epubFavoritesOnlyMode ? 'true' : 'false';
                epubFavOnlyBtn.innerHTML = getReaderStar(epubFavoritesOnlyMode);
                if (ctx.showToast) {
                    ctx.showToast(
                        epubFavoritesOnlyMode
                            ? ((ctx.t ? ctx.t('readerFavoritesOnlyActive') : '') || 'Favorites mode active')
                            : ((ctx.t ? ctx.t('readerFavoritesOnlyInactive') : '') || 'Favorites mode deactivated'),
                        'success'
                    );
                }
            });
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
                    console.log('[GenericViewer] renderEpubUI: rendition rendered for "' + filePath + '"');
                    updateNavButtons();
                });
                source.rendition.on('location_changed', function(loc) {
                    updatePageLabel(loc);
                });
                updateNavButtons();
                refreshEpubPageCount();
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
            return {             destroy: function() {
                document.getElementById('reader-ctx-menu')?.remove();
                if (epubSettings && typeof epubSettings.destroy === 'function') {
                    epubSettings.destroy();
                }
                document.removeEventListener('keydown', onKeyDown);
                if (epubSwipeNav && typeof epubSwipeNav.destroy === 'function') {
                    try { epubSwipeNav.destroy(); } catch (e) {}
                }
                if (epubClickNavZone && typeof epubClickNavZone.destroy === 'function') {
                    try { epubClickNavZone.destroy(); } catch (e) {}
                }
                if (epubClickTimer) { clearTimeout(epubClickTimer); epubClickTimer = null; }
                if (container._readerEpubLongPressHandlers && typeof container._readerEpubLongPressHandlers.destroy === 'function') {
                    try { container._readerEpubLongPressHandlers.destroy(); } catch (e) {}
                }
                container.classList.remove('reader-navs-hidden');
                source.destroy();
            } };
        }).catch(function(err) {
            console.error('[GenericViewer] renderEpubUI: render error for "' + filePath + '":', err && err.message ? err.message : String(err));
            container.innerHTML = '<div class="reader-error">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    function scheduleSourceLoad(source) {
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                source.load().then(resolve, reject);
            }, 0);
        });
    }

    function showPageLoader(container) {
        hidePageLoader();
        var overlay = document.createElement('div');
        overlay.id = 'reader-page-loading-overlay';
        overlay.className = 'reader-loading-overlay';
        overlay.innerHTML = '<div class="reader-loading-spinner"></div>';
        if (container) container.appendChild(overlay);
    }

    function hidePageLoader() {
        var overlay = document.getElementById('reader-page-loading-overlay');
        if (overlay && overlay.parentNode) {
            overlay.remove();
        }
    }

    function showReaderLoading(ctx, container, filePath) {
        if (!container) return;
        container.classList.add('reader-container');
        if (!container.querySelector('.reader-header-nav')) {
            buildHeaderNav(ctx, container, filePath);
        }
        showPageLoader(container);
    }

    function hideReaderLoading(container) {
        hidePageLoader();
    }

    function renderMultiImageSource(ctx, groupPath, blobs, paths, container) {
        var source = new MultiImageSource(blobs, paths, ctx, groupPath);
        container._renamerSource = source;
        container._readerFilePath = groupPath;
        container.setAttribute('tabindex', '-1');
        container.addEventListener('click', function() {
            container.focus();
        });

        showReaderLoading(ctx, container, groupPath);

        return scheduleSourceLoad(source).then(function() {
            buildReaderUI(ctx, container, source, groupPath);
            hideReaderLoading(container);
            if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.createReaderToolbar) {
                window.RenamerDevRefresh.createReaderToolbar(ctx, container, source, groupPath);
            }
            return source;
        }).catch(function(err) {
            hideReaderLoading(container);
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    function renderFile(ctx, filePath, blob, container) {
        var startTime = Date.now();
        var timerInterval = null;
        var isVerboseClient = !!(typeof window !== 'undefined' && window.RenamerLog && typeof window.RenamerLog.isClientMode === 'function' && window.RenamerLog.isClientMode());

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
        console.log('[GenericViewer] renderFile: path="' + filePath + '" ext="' + ext + '"', 'blob=' + (blob ? ('size=' + blob.size) : 'null'));
        var source = createSource(ext, blob, ctx, filePath);

        if (!source) {
            console.error('[GenericViewer] renderFile: no source created for ext="' + ext + '" path="' + filePath + '"');
            ctx.showToast('Format non supporté: ' + ext, 'error');
            return Promise.resolve();
        }

        container._renamerSource = source;
        container._readerFilePath = filePath;
        if (blob) {
            container._readerCachedBlob = blob;
            if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.cacheBlob) {
                window.RenamerDevRefresh.cacheBlob(ctx, filePath, blob);
            }
        }
        container.setAttribute('tabindex', '-1');
        container.addEventListener('click', function() {
            container.focus();
        });

        if (source.type === 'epub') {
            console.log('[GenericViewer] renderFile: EPUB path detected, starting load for "' + filePath + '"');
            startReaderTimer('EPUB load');
            showReaderLoading(ctx, container, filePath);
            return scheduleSourceLoad(source).then(function() {
                console.log('[Reader] EPUB loaded', 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                console.log('[GenericViewer] renderFile: EPUB loaded successfully, rendering UI for "' + filePath + '"');
                return renderEpubUI(ctx, container, source, filePath);
            }).then(function(result) {
                removeReaderToast();
                if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.createReaderToolbar) {
                    window.RenamerDevRefresh.createReaderToolbar(ctx, container, source, filePath);
                }
                return result;
            }).catch(function(err) {
                removeReaderToast();
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        startReaderTimer('Début du chargement');
        showReaderLoading(ctx, container, filePath);

        return scheduleSourceLoad(source).then(function() {
            console.log('[Reader] Source loaded:', source.type, 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
            var result = buildReaderUI(ctx, container, source, filePath);
            removeReaderToast();
            if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.createReaderToolbar) {
                window.RenamerDevRefresh.createReaderToolbar(ctx, container, source, filePath);
            }
            return result;
        }).catch(function(err) {
            removeReaderToast();
            console.error('[Reader] Load error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    window.RenamerGenericViewer = {
        renderFile: renderFile,
        renderMultiImageSource: renderMultiImageSource,
        showReaderLoading: showReaderLoading,
        hideReaderLoading: hideReaderLoading
    };
})();
