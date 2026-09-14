(function() {
    'use strict';

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

        container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;width:100%;background:#000;';
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin:0 auto 12px;"></div>            <div>' + ctx.t('loading') + '</div></div></div>';

        if (ext === '.pdf') {
            return window.RenamerGenericViewer.renderFile(ctx, filePath, null, container).catch(function(err) {
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        if (ext === '.cbz') {
            return fetchFileBlob(ctx, filePath).then(function(blob) {
                return window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
            }).catch(function(err) {
                ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
            });
        }

        return ctx.apiRequest(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath)).then(function(data) {
            if (!data || !data.content) {
                ctx.showToast('Impossible de lire le fichier', 'error');
                return;
            }
            var blob = base64ToBlob(data.content, getMimeType(ext));

            if (ext === '.cbr') {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin:0 auto 12px;"></div><div>' + (ctx.t('readerConvertCBR') || 'Conversion CBR...') + '</div></div></div>';
                return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/convert-cbr', {
                    method: 'POST',
                    body: JSON.stringify({ path: filePath })
                }).then(function(data) {
                    if (!data) {
                        ctx.showToast('Erreur serveur', 'error');
                        return;
                    }
                    if (data.unavailable) {
                        ctx.showToast(ctx.t('readerUnrarNotAvailable') || 'unrar non disponible sur le serveur. Convertissez votre CBR en CBZ manuellement.', 'error');
                        return;
                    }
                    if (!data.success || !data.content) {
                        ctx.showToast(ctx.t('readerConvertCBRError') || 'Échec de la conversion CBR: ' + (data.error || 'erreur inconnue'), 'error');
                        return;
                    }
                    var cbzBlob = base64ToBlob(data.content, 'application/zip');
                    return window.RenamerGenericViewer.renderFile(ctx, filePath.replace(/\.cbr$/i, '.cbz'), cbzBlob, container);
                }).catch(function(err) {
                    ctx.showToast('Erreur CBR: ' + (err && err.message ? err.message : String(err)), 'error');
                });
            }

            return window.RenamerGenericViewer.renderFile(ctx, filePath, blob, container);
        }).catch(function(err) {
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
