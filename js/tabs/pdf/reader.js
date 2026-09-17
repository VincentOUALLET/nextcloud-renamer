(function() {
    'use strict';

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

    function createLoadingToast(ctx, fileName, startTime, message) {
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
        toast.innerHTML = '<span class="renamer-reader-loading-spinner"></span><span class="renamer-toast-text"></span><button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
        var textEl = toast.querySelector('.renamer-toast-text');
        var loadingText = message || (typeof ctx.t === 'function' ? (ctx.t('loading') || 'Chargement...') : 'Chargement...');
        textEl.textContent = loadingText + ' \'' + fileName + '\' (' + formatElapsedTime(0) + ')';

        var interval = setInterval(function() {
            var te = toast.querySelector('.renamer-toast-text');
            if (te) te.textContent = loadingText + ' \'' + fileName + '\' (' + formatElapsedTime(Date.now() - startTime) + ')';
        }, 1000);
        toast._readerTimerInterval = interval;
        toast.querySelector('.renamer-toast-close').addEventListener('click', function() {
            if (toast._readerTimerInterval) {
                clearInterval(toast._readerTimerInterval);
                toast._readerTimerInterval = null;
            }
            if (toast.parentNode) toast.remove();
        });

        toastContainerEl.appendChild(toast);
        setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

        return interval;
    }

    function removeLoadingToast() {
        var toast = document.getElementById('renamer-reader-loading-toast');
        if (toast) {
            toast.classList.remove('renamer-toast-show');
            setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
        }
    }

    function clearLoadingState(container) {
        if (container._readerLoadTimerInterval) {
            clearInterval(container._readerLoadTimerInterval);
            container._readerLoadTimerInterval = null;
        }
        removeLoadingToast();
        if (typeof window.RenamerGenericViewer !== 'undefined' && typeof window.RenamerGenericViewer.hideReaderLoading === 'function') {
            window.RenamerGenericViewer.hideReaderLoading(container);
        }
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

    function base64ToBlob(base64, mime) {
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    }

    function getDownloadUrl(filePath) {
        var cleanPath = String(filePath).replace(/^\/+/, '');
        var segments = cleanPath.split('/').map(function(s) { return encodeURIComponent(s); });
        var base = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/apps/files/download') : '/index.php/apps/files/download';
        return base + '/' + segments.join('/');
    }

    function getWebdavUrl(filePath) {
        var cleanPath = String(filePath).replace(/^\/+/, '');
        var segments = cleanPath.split('/').map(function(s) { return encodeURIComponent(s); });
        var base = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/remote.php/dav') : '/remote.php/dav';
        return base + '/files/' + (typeof OC !== 'undefined' && OC.userid ? OC.userid : '') + '/' + segments.join('/');
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

    function fetchFileBlob(ctx, filePath) {
        var headers = {};
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        var blobUrls = [
            appendOwnerParam(ctx.getBaseUrl() + '/api/files/blob?path=' + encodeURIComponent(filePath), ctx),
            appendOwnerParam(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath), ctx)
        ];
        var downloadUrls = [getDownloadUrl(filePath), getWebdavUrl(filePath)];

        function tryEndpointList(urls, label) {
            if (urls.length === 0) return Promise.reject(new Error(label + ': no URLs to try'));
            var url = urls.shift();
            return fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: headers
            }).then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.blob();
            }).catch(function(err) {
                console.warn('[Reader] ' + label + ' failed (' + url + '):', err && err.message);
                return tryEndpointList(urls, label);
            });
        }

        return tryEndpointList(blobUrls.slice(), 'renamer').then(function(blob) {
            return blob;
        }).catch(function(err) {
            console.warn('[Reader] all renamer endpoints failed, trying Nextcloud core download URLs:', err);
            return tryEndpointList(downloadUrls.slice(), 'nc-core');
        });
    }

    function pathExt(filePath) {
        var base = String(filePath).replace(/^.*\//, '');
        var idx = base.lastIndexOf('.');
        return idx >= 0 ? base.substring(idx).toLowerCase() : '';
    }

    var READERS = {
        '.pdf':  { name: 'PDF',  hasViewer: true },
        '.cbz':  { name: 'CBZ',  hasViewer: true },
        '.cbr':  { name: 'CBR',  hasViewer: true },
        '.epub': { name: 'EPUB', hasViewer: true },
        '.jpg':  { name: 'IMAGE', hasViewer: true },
        '.jpeg': { name: 'IMAGE', hasViewer: true },
        '.png':  { name: 'IMAGE', hasViewer: true },
        '.gif':  { name: 'IMAGE', hasViewer: true },
        '.webp': { name: 'IMAGE', hasViewer: true },
    };

    function renderReader(ctx, filePath, container) {
        var ext = pathExt(filePath);
        var reader = READERS[ext];
        if (!reader) {
            ctx.showToast('Format non supporté: ' + ext, 'error');
            return Promise.resolve();
        }

        var startTime = Date.now();
        var isVerboseClient = !!(typeof window !== 'undefined' && window.RenamerLog && typeof window.RenamerLog.isClientMode === 'function' && window.RenamerLog.isClientMode());
        container.style.cssText = '';
        container.classList.add('reader-container-layout');
        container.innerHTML = '';
        var fileName = filePath.replace(/^.*\//, '');
        container._readerLoadStart = startTime;
        if (isVerboseClient) {
            container._readerLoadTimerInterval = createLoadingToast(ctx, fileName, startTime);
        }
        console.log('[Reader] renderReader:', filePath, 'ext:', ext, 'elapsed: 00:00');

        if (typeof window.RenamerGenericViewer !== 'undefined' && typeof window.RenamerGenericViewer.showReaderLoading === 'function') {
            window.RenamerGenericViewer.showReaderLoading(ctx, container, filePath);
        }

        if (ext === '.pdf') {
            return window.RenamerGenericViewer.renderFile(ctx, filePath, null, container).catch(function(err) {
                clearLoadingState(container);
                console.error('[Reader] PDF load error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        if (ext === '.cbz') {
            return fetchFileBlob(ctx, filePath).then(function(blob) {
                console.log('[Reader] CBZ blob fetched:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                if (blob && typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.cacheBlob) {
                    window.RenamerDevRefresh.cacheBlob(ctx, filePath, blob);
                }
                return window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
            }).catch(function(err) {
                clearLoadingState(container);
                console.error('[Reader] CBZ fetch error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        var headers = {};
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }

        return fetch(appendOwnerParam(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath), ctx), {
            method: 'GET',
            credentials: 'same-origin',
            headers: headers
        }).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.blob();
        }).then(function(blob) {
            if (!blob || blob.size === 0) {
                clearLoadingState(container);
                ctx.showToast('Impossible de lire le fichier', 'error');
                return;
            }

            if (ext === '.cbr') {
                var cbrMessage = (typeof ctx.t === 'function' ? (ctx.t('readerConvertCBR') || 'Conversion CBR...') : 'Conversion CBR...');
                container._readerLoadTimerInterval = createLoadingToast(ctx, fileName, startTime, cbrMessage);
                return fetch(ctx.getBaseUrl() + '/api/reader/convert-cbr', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: headers,
                    body: JSON.stringify({ path: filePath, ownerUid: getOwnerUid(ctx) || '' })
                }).then(function(r) {
                    var contentType = r.headers.get('Content-Type') || '';
                    if (!r.ok) {
                        return r.json().then(function(data) {
                            var errMsg = data && data.error ? data.error : 'HTTP ' + r.status;
                            throw new Error(errMsg);
                        });
                    }
                    if (contentType.indexOf('application/json') === 0) {
                        return r.json().then(function(data) {
                            if (data && data.unavailable) {
                                throw new Error('UNAVAILABLE');
                            }
                            if (!data || !data.success) {
                                throw new Error(data && data.error ? data.error : 'Conversion échouée');
                            }
                            return null;
                        });
                    }
                    return r.blob();
                }).then(function(blob) {
                    if (!blob) {
                        clearLoadingState(container);
                        ctx.showToast(ctx.t('readerUnrarNotAvailable') || 'unrar non disponible sur le serveur. Convertissez votre CBR en CBZ manuellement.', 'error');
                        return;
                    }
                    console.log('[Reader] CBR converted:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                    return window.RenamerGenericViewer.renderFile(ctx, filePath.replace(/\.cbr$/i, '.cbz'), blob, container);
                }).catch(function(err) {
                    clearLoadingState(container);
                    if (err && err.message === 'UNAVAILABLE') {
                        ctx.showToast(ctx.t('readerUnrarNotAvailable') || 'unrar non disponible sur le serveur. Convertissez votre CBR en CBZ manuellement.', 'error');
                    } else {
                        console.error('[Reader] CBR convert error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                        ctx.showToast('Erreur CBR: ' + (err && err.message ? err.message : String(err)), 'error');
                    }
                });
            }

            return window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
        }).catch(function(err) {
            clearLoadingState(container);
            console.error('[Reader] Read error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    window.RenamerReader = {
        renderReader: renderReader,
        getReaderName: function(ext) {
            var r = READERS[String(ext).toLowerCase()];
            return r ? r.name : 'Inconnu';
        },
        hasViewer: function(ext) {
            var r = READERS[String(ext).toLowerCase()];
            return r ? r.hasViewer : false;
        },
        fetchFileBlob: fetchFileBlob,
    };
})();
