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

        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:renamer-spin 0.8s linear infinite;margin:0 auto 12px;"></div><div>' + ctx.t('loading') + '</div></div></div>';

        return ctx.apiRequest(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath)).then(function(data) {
            if (!data || !data.content) {
                ctx.showToast('Impossible de lire le fichier', 'error');
                return;
            }
            var blob = base64ToBlob(data.content, getMimeType(ext));

            if (ext === '.pdf' && typeof window.pdfjsLib !== 'undefined') {
                return window.RenamerPdfViewer.renderPdfPage(ctx, container, blob, filePath);
            }

            if (ext === '.cbz' && typeof window.RenamerCbzViewer !== 'undefined') {
                return window.RenamerCbzViewer.renderCbz(blob, container, filePath, ctx);
            }

            if (ext === '.cbr') {
                // CBR is RAR format - server-side conversion to CBZ
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
                    if (typeof window.RenamerCbzViewer !== 'undefined') {
                        return window.RenamerCbzViewer.renderCbz(cbzBlob, container, filePath.replace(/\.cbr$/i, '.cbz'), ctx);
                    }
                    ctx.showToast('Lecteur CBZ non disponible', 'error');
                }).catch(function(err) {
                    ctx.showToast('Erreur CBR: ' + (err && err.message ? err.message : String(err)), 'error');
                });
            }

            if (ext === '.epub' && typeof window.RenamerEpubViewer !== 'undefined') {
                return window.RenamerEpubViewer.renderEpub(blob, container, filePath, ctx);
            }

            if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.webp') {
                if (typeof window.RenamerImageViewer !== 'undefined') {
                    return window.RenamerImageViewer.renderImage(blob, container, filePath, ctx);
                }
                var url = URL.createObjectURL(blob);
                container.innerHTML = '';
                var img = document.createElement('img');
                img.src = url;
                img.style.cssText = 'max-width:100%;max-height:100svh;object-fit:contain;margin:auto;display:block;';
                img.alt = filePath;
                container.appendChild(img);
                return Promise.resolve();
            }

            ctx.showToast(reader.name + ': viewer non encore disponible', 'error');
        }).catch(function(err) {
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    window.RenamerReader = {
        renderReader: renderReader,
        getReaderName: function(ext) {
            var r = READERS[ext];
            return r ? r.name : 'Inconnu';
        },
        hasViewer: function(ext) {
            var r = READERS[ext];
            return r ? r.hasViewer : false;
        },
    };
})();
