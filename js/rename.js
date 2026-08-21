(function() {
    'use strict';

    var appName = 'rename-auto';
    console.log('[Renamer] rename.js loaded, OC=', typeof OC, 'OCA=', typeof OCA,
        'OCA.Files=', (typeof OCA !== 'undefined' && OCA.Files) ? 'yes' : 'no',
        'fileActions=', (typeof OCA !== 'undefined' && OCA.Files && OCA.Files.fileActions) ? 'yes' : 'no',
        'window._nc_fileactions=', (typeof window !== 'undefined' && window._nc_fileactions) ? 'yes' : 'no');

    function getBaseUrl() {
        return OC.generateUrl('/apps/renamer');
    }

    function log() {
        try { console.log.apply(console, ['[Renamer]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function ensureStyle() {
        if (document.getElementById('renamer-style')) {
            return;
        }
        var style = document.createElement('style');
        style.id = 'renamer-style';
        style.textContent = '' +
            '#renamer-overlay{position:fixed;inset:0;z-index:9000;display:flex;' +
            'align-items:center;justify-content:center;background:rgba(0,0,0,0.5);}' +
            '#renamer-modal{background:var(--color-main-background,#fff);color:var(--color-main-text,#000);' +
            'padding:20px;border-radius:var(--border-radius-large,12px);max-width:90vw;max-height:90vh;' +
            'overflow:auto;box-shadow:0 0 20px rgba(0,0,0,.3);z-index:9001;min-width:320px;}' +
            '#renamer-modal h3{margin-top:0;}';
        document.head.appendChild(style);
    }

    // @nextcloud/files v3 Node -> full path string (relative to user files root)
    function nodeToPath(node) {
        return node && node.path ? node.path : '';
    }

    function getSelectedFiles() {
        var files = [];
        try {
            if (typeof OCA !== 'undefined' && OCA.Files && OCA.Files.fileActions) {
                files = OCA.Files.fileActions.getSelectedFiles();
            }
        } catch (e) {
            files = [];
        }
        if (!files || !files.length) {
            try {
                var fileList = document.querySelector('.files-list');
                if (fileList) {
                    var selected = fileList.querySelectorAll('.selected');
                    selected.forEach(function(el) {
                        var name = el.getAttribute('data-file');
                        if (name) files.push(name);
                    });
                }
            } catch (e) {
                files = [];
            }
        }
        return files;
    }

    function openDialog(files) {
        ensureStyle();
        files = files || getSelectedFiles();
        log('openDialog files', files);
        if (!files || !files.length) {
            alert('Veuillez sélectionner un fichier ou un dossier.');
            return;
        }

        var existing = document.getElementById('renamer-overlay');
        if (existing) existing.remove();

        var html = '<div id="renamer-overlay">';
        html += '<div id="renamer-modal">';
        html += '<h3>Renamer</h3>';
        html += '<div id="renamer-files">';
        html += '<p><strong>Fichiers sélectionnés :</strong></p><ul>';
        files.forEach(function(f) {
            html += '<li>' + escapeHtml(f) + '</li>';
        });
        html += '</ul></div>';

        html += '<div id="renamer-rule-section">';
        html += '<label for="renamer-mode">Mode : </label>';
        html += '<select id="renamer-mode">';
        html += '<option value="regex">Regex</option>';
        html += '<option value="replace">Replace</option>';
        html += '<option value="cascade">Cascade (métadonnées)</option>';
        html += '</select><br/><br/>';

        html += '<label for="renamer-pattern">Chercher : </label>';
        html += '<input type="text" id="renamer-pattern" /><br/><br/>';

        html += '<label for="renamer-replacement">Remplacer par : </label>';
        html += '<input type="text" id="renamer-replacement" /><br/><br/>';

        html += '<label for="renamer-saved">Règles enregistrées : </label>';
        html += '<select id="renamer-saved"><option value="">--</option></select>';
        html += '<button id="renamer-save-rule" type="button">Enregistrer</button>';
        html += '<button id="renamer-delete-rule" type="button">Supprimer</button><br/><br/>';

        html += '<label><input type="checkbox" id="renamer-dryrun" checked /> Dry run</label><br/><br/>';

        html += '<div id="renamer-preview"></div>';

        html += '<button id="renamer-cancel" type="button">Annuler</button>';
        html += '<button id="renamer-run" type="button">Renommer</button>';
        html += '</div></div></div>';

        var container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container.firstElementChild || container);

        var modeSelect = document.getElementById('renamer-mode');
        var dryrun = document.getElementById('renamer-dryrun');
        var preview = document.getElementById('renamer-preview');
        var savedSelect = document.getElementById('renamer-saved');

        function loadSavedRules() {
            try {
                var rules = JSON.parse(localStorage.getItem('renamer_saved_rules') || '[]');
                savedSelect.innerHTML = '<option value="">--</option>';
                rules.forEach(function(rule, idx) {
                    var opt = document.createElement('option');
                    opt.value = String(idx);
                    opt.textContent = rule.name || ('Règle ' + (idx + 1));
                    savedSelect.appendChild(opt);
                });
            } catch (e) {
                savedSelect.innerHTML = '<option value="">--</option>';
            }
        }
        loadSavedRules();

        function updatePreview() {
            var pattern = document.getElementById('renamer-pattern').value;
            var replacement = document.getElementById('renamer-replacement').value;
            var mode = modeSelect ? modeSelect.value : 'regex';
            var htmlPreview = '<p><strong>Aperçu (local) :</strong></p><ul>';
            files.forEach(function(f) {
                var newName = f;
                try {
                    if (mode === 'regex') {
                        newName = f.replace(new RegExp(pattern), replacement);
                    } else if (mode === 'replace') {
                        newName = f.split(pattern).join(replacement);
                    } else if (mode === 'cascade') {
                        newName = f.replace(/\[[^\]]*\]/g, '').trim();
                        newName = newName.replace(/\s+/g, ' ').trim();
                    }
                } catch (e) {
                    newName = '(erreur)';
                }
                htmlPreview += '<li>' + escapeHtml(f) + ' &rarr; ' + escapeHtml(newName) + '</li>';
            });
            htmlPreview += '</ul>';
            preview.innerHTML = htmlPreview;
        }

        if (modeSelect) modeSelect.addEventListener('change', updatePreview);
        if (dryrun) dryrun.addEventListener('change', updatePreview);
        document.getElementById('renamer-pattern').addEventListener('input', updatePreview);
        document.getElementById('renamer-replacement').addEventListener('input', updatePreview);

        document.getElementById('renamer-save-rule').addEventListener('click', function() {
            try {
                var pattern = document.getElementById('renamer-pattern').value;
                var replacement = document.getElementById('renamer-replacement').value;
                var mode = modeSelect ? modeSelect.value : 'regex';
                var rules = JSON.parse(localStorage.getItem('renamer_saved_rules') || '[]');
                var name = prompt('Nom de la règle :');
                if (!name) return;
                rules.push({ name: name, mode: mode, pattern: pattern, replacement: replacement });
                localStorage.setItem('renamer_saved_rules', JSON.stringify(rules));
                loadSavedRules();
                alert('Règle enregistrée.');
            } catch (e) {
                alert('Erreur lors de l\'enregistrement de la règle.');
            }
        });

        document.getElementById('renamer-delete-rule').addEventListener('click', function() {
            var idx = savedSelect.value;
            if (idx === '') {
                alert('Veuillez sélectionner une règle.');
                return;
            }
            if (!confirm('Supprimer cette règle ?')) return;
            try {
                var rules = JSON.parse(localStorage.getItem('renamer_saved_rules') || '[]');
                rules.splice(parseInt(idx, 10), 1);
                localStorage.setItem('renamer_saved_rules', JSON.stringify(rules));
                loadSavedRules();
            } catch (e) {
                alert('Erreur lors de la suppression.');
            }
        });

        savedSelect.addEventListener('change', function() {
            var idx = savedSelect.value;
            if (idx === '') return;
            try {
                var rules = JSON.parse(localStorage.getItem('renamer_saved_rules') || '[]');
                var rule = rules[parseInt(idx, 10)];
                if (!rule) return;
                document.getElementById('renamer-pattern').value = rule.pattern || '';
                document.getElementById('renamer-replacement').value = rule.replacement || '';
                if (modeSelect && rule.mode) modeSelect.value = rule.mode;
                updatePreview();
            } catch (e) {
                // ignore
            }
        });

        updatePreview();

        document.getElementById('renamer-cancel').addEventListener('click', function() {
            var dialog = document.getElementById('renamer-overlay');
            if (dialog) dialog.remove();
        });

        document.getElementById('renamer-run').addEventListener('click', function() {
            var pattern = document.getElementById('renamer-pattern').value;
            var replacement = document.getElementById('renamer-replacement').value;
            var mode = modeSelect ? modeSelect.value : 'regex';
            var isDryRun = dryrun ? dryrun.checked : true;

            var payload = {
                paths: files,
                mode: mode,
                pattern: pattern,
                replacement: replacement,
                dryRun: isDryRun
            };
            log('run payload', payload);

            fetch(getBaseUrl() + '/rename', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then(function(r) {
                log('response status', r.status);
                log('response headers', r.headers);
                var ct = '';
                try { ct = r.headers.get('content-type') || ''; } catch (e) {}
                log('response content-type', ct);
                var textPromise = r.clone().text().then(function(t) {
                    log('response raw text', t);
                    if (typeof t === 'string' && t.indexOf('<!DOCTYPE') === 0) {
                        log('response is HTML, skipping JSON parse');
                        return Promise.resolve({ ok: r.ok, body: t });
                    }
                    try {
                        var data = JSON.parse(t);
                        return Promise.resolve({ ok: r.ok, body: data });
                    } catch (e) {
                        log('response JSON parse error', e);
                        return Promise.resolve({ ok: r.ok, body: t });
                    }
                });
                return textPromise;
            }).then(function(res) {
                log('response parsed', res);
                var body = res.body;
                if (typeof body !== 'object' || body === null) {
                    alert('Erreur serveur: ' + (res.status || '?'));
                    console.error('[Renamer]', body);
                    return;
                }
                log('response body keys', Object.keys(body || {}));
                log('response body raw', JSON.stringify(body));
                if (!res.ok || !body) {
                    alert('Erreur serveur: ' + (res.status || '?'));
                    console.error('[Renamer]', body);
                    return;
                }
                if (body && body.success) {
                    var msg = 'Renommage terminé.\n';
                    if (body.renamed && body.renamed.length) {
                        msg += 'Renommés : ' + body.renamed.length + '\n';
                    }
                    if (body.skipped && body.skipped.length) {
                        msg += 'Ignorés : ' + body.skipped.length + '\n';
                    }
                    if (body.errors && body.errors.length) {
                        msg += 'Erreurs : ' + body.errors.length + '\n';
                    }
                    alert(msg);
                    if (confirm('Recharger la page ?')) {
                        location.reload();
                    }
                } else {
                    alert('Réponse inattendue.');
                }
            }).catch(function(err) {
                log('fetch error', err);
                alert('Erreur: ' + err.message);
            });
        });
    }

    var RENAME_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">' +
        '<path fill="currentColor" d="M11.7 3.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-.4.24l-2.4.8a.5.5 0 0 1-.63-.63l.8-2.4a1 1 0 0 1 .24-.4l6-6a1 1 0 0 1 1.4 0zM12.5 2.5l1 1a1 1 0 0 1 0 1.4l-1-1a1 1 0 0 1 0-1.4z"/>' +
        '</svg>';

    function registerFilesAction() {
        if (typeof window === 'undefined') {
            return false;
        }
        window._nc_fileactions = window._nc_fileactions || [];
        if (window._nc_fileactions.some(function(a) { return a && a.id === appName; })) {
            log('file action already registered (count=' + window._nc_fileactions.length + ')');
            return true;
        }
        var action = {
            id: appName,
            displayName: function() { return 'Rename Auto'; },
            title: function() { return 'Rename Auto'; },
            iconSvgInline: function() { return RENAME_SVG; },
            enabled: function(files) {
                return Array.isArray(files) ? files.length > 0 : true;
            },
            exec: function(file) {
                log('exec single node path=', nodeToPath(file));
                openDialog([nodeToPath(file)]);
                return Promise.resolve(null);
            },
            execBatch: function(files) {
                var paths = (files || []).map(nodeToPath);
                log('execBatch paths', paths);
                openDialog(paths);
                return Promise.resolve((files || []).map(function() { return null; }));
            },
            order: 100
        };
        window._nc_fileactions.push(action);
        log('registered file action into window._nc_fileactions (count=' + window._nc_fileactions.length + ')');
        return true;
    }

    function injectToolbarButton() {
        if (document.getElementById('renamer-toolbar-button')) {
            return;
        }
        var target = document.querySelector('.files-controls') || document.querySelector('.header') || document.body;
        if (!target) {
            return;
        }
        var btn = document.createElement('button');
        btn.id = 'renamer-toolbar-button';
        btn.type = 'button';
        btn.textContent = 'Rename Auto';
        btn.className = 'button';
        btn.style.marginLeft = '8px';
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
        });
        target.appendChild(btn);
        log('toolbar button injected');
    }

    log('loaded');
    var registered = false;
    if (typeof OCA !== 'undefined' && OCA.Files && OCA.Files.fileActions) {
        try {
            var perm = (typeof OC !== 'undefined' && OC.PERMISSION_UPDATE) ? OC.PERMISSION_UPDATE : 16;
            OCA.Files.fileActions.registerAction({
                name: appName,
                displayName: 'Rename Auto',
                mimeType: 'all',
                permissions: perm,
                actionHandler: function() { openDialog(); }
            });
            log('registered via legacy fileActions');
            registered = true;
        } catch (e) {
            log('legacy registerAction failed', e);
        }
    }
    if (!registered) {
        try {
            registered = registerFilesAction();
        } catch (e) {
            log('registerFilesAction failed', e);
        }
    }
    if (!registered) {
        log('file action registration unavailable -> toolbar fallback');
        injectToolbarButton();
    }
})();
