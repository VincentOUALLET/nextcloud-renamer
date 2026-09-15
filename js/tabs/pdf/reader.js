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
        var spinnerHtml = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></span>';
        toast.innerHTML = spinnerHtml + '<span class="renamer-toast-text"></span>';
        var textEl = toast.querySelector('.renamer-toast-text');
        var loadingText = message || (typeof ctx.t === 'function' ? (ctx.t('loading') || 'Chargement...') : 'Chargement...');
        textEl.textContent = loadingText + ' \'' + fileName + '\' (' + formatElapsedTime(0) + ')';

        toastContainerEl.appendChild(toast);
        setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

        var interval = setInterval(function() {
            var textEl = toast.querySelector('.renamer-toast-text');
            if (textEl) textEl.textContent = loadingText + ' \'' + fileName + '\' (' + formatElapsedTime(Date.now() - startTime) + ')';
        }, 1000);

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
        var base = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/remote.php/webdav') : '/remote.php/webdav';
        return base + '/' + segments.join('/');
    }

    function fetchFileBlob(ctx, filePath) {
        var headers = {};
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        var downloadUrls = [getDownloadUrl(filePath), getWebdavUrl(filePath)];
        var attemptIdx = 0;

        function tryBinaryEndpoint() {
            return fetch(ctx.getBaseUrl() + '/api/files/blob?path=' + encodeURIComponent(filePath), {
                method: 'GET',
                credentials: 'same-origin',
                headers: headers
            }).then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.blob();
            }).catch(function(blobErr) {
                console.warn('[Reader] blob endpoint failed, fallback base64:', blobErr && blobErr.message);
                return ctx.apiRequest(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath)).then(function(data) {
                    if (!data || !data.content) {
                        throw new Error('Impossible de lire le fichier');
                    }
                    return base64ToBlob(data.content, getMimeType(pathExt(filePath)));
                });
            });
        }

        function tryDownload() {
            if (attemptIdx >= downloadUrls.length) {
                return tryBinaryEndpoint();
            }
            var url = downloadUrls[attemptIdx];
            attemptIdx++;
            return fetch(url, { method: 'GET', credentials: 'same-origin', headers: headers }).then(function(r) {
                if (!r.ok) {
                    throw new Error('HTTP ' + r.status);
                }
                return r.blob();
            }).catch(function(err) {
                if (attemptIdx < downloadUrls.length) {
                    console.warn('[Reader] download URL failed (' + url + '), retrying next:', err && err.message);
                    return tryDownload();
                }
                console.warn('[Reader] all download URLs failed, trying blob endpoint:', err && err.message);
                return tryBinaryEndpoint();
            });
        }
        return tryDownload();
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
        container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;width:100%;background:#000;';
        container.innerHTML = '';
        var fileName = filePath.replace(/^.*\//, '');
        container._readerLoadStart = startTime;
        container._readerLoadTimerInterval = createLoadingToast(ctx, fileName, startTime);
        console.log('[Reader] renderReader:', filePath, 'ext:', ext, 'elapsed: 00:00');

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
                return window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
            }).catch(function(err) {
                clearLoadingState(container);
                console.error('[Reader] CBZ fetch error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        return ctx.apiRequest(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath)).then(function(data) {
            if (!data || !data.content) {
                clearLoadingState(container);
                ctx.showToast('Impossible de lire le fichier', 'error');
                return;
            }
            var blob = base64ToBlob(data.content, getMimeType(ext));

            if (ext === '.cbr') {
                container.innerHTML = '';
                var cbrMessage = (typeof ctx.t === 'function' ? (ctx.t('readerConvertCBR') || 'Conversion CBR...') : 'Conversion CBR...');
                container._readerLoadTimerInterval = createLoadingToast(ctx, fileName, startTime, cbrMessage);
                return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/convert-cbr', {
                    method: 'POST',
                    body: JSON.stringify({ path: filePath })
                }).then(function(data) {
                    if (!data) {
                        clearLoadingState(container);
                        ctx.showToast('Erreur serveur', 'error');
                        return;
                    }
                    if (data.unavailable) {
                        clearLoadingState(container);
                        ctx.showToast(ctx.t('readerUnrarNotAvailable') || 'unrar non disponible sur le serveur. Convertissez votre CBR en CBZ manuellement.', 'error');
                        return;
                    }
                    if (!data.success || !data.content) {
                        clearLoadingState(container);
                        ctx.showToast(ctx.t('readerConvertCBRError') || 'Échec de la conversion CBR: ' + (data.error || 'erreur inconnue'), 'error');
                        return;
                    }
                    console.log('[Reader] CBR converted:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                    var cbzBlob = base64ToBlob(data.content, 'application/zip');
                    return window.RenamerGenericViewer.renderFile(ctx, filePath.replace(/\.cbr$/i, '.cbz'), cbzBlob, container);
                }).catch(function(err) {
                    clearLoadingState(container);
                    console.error('[Reader] CBR convert error:', err && err.message ? err.message : String(err), 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
                    ctx.showToast('Erreur CBR: ' + (err && err.message ? err.message : String(err)), 'error');
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
