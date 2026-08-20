(function() {
    'use strict';

    var appName = 'app-renamer-rename-auto';

    function getBaseUrl() {
        return OC.generateUrl('/apps/renamer');
    }

    function log() {
        try { console.log.apply(console, ['Renamer:'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
                if (fileList && fileList.querySelector('.selected')) {
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

        var currentDir = '';
        try {
            if (typeof OCA !== 'undefined' && OCA.Files && OCA.Files.getCurrentDirectory) {
                currentDir = OCA.Files.getCurrentDirectory();
            }
        } catch (e) {
            currentDir = '';
        }
        if (currentDir && currentDir !== '/') {
            files = files.map(function(f) {
                return currentDir + '/' + f;
            });
        }
        return files;
    }

    function openDialog() {
        var files = getSelectedFiles();
        if (!files.length) {
            alert('Veuillez sélectionner un fichier ou un dossier.');
            return;
        }

        var existing = document.getElementById('renamer-dialog');
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
            var dialog = document.getElementById('renamer-dialog');
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

            fetch(getBaseUrl() + '/rename', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).then(function(r) {
                return r.json().then(function(data) { return { ok: r.ok, body: data }; });
            }).then(function(res) {
                if (!res.ok) {
                    alert('Erreur serveur: ' + res.status);
                    console.error('Renamer', res.body);
                    return;
                }
                if (res.body && res.body.success) {
                    var msg = 'Renommage terminé.\n';
                    if (res.body.renamed && res.body.renamed.length) {
                        msg += 'Renommés : ' + res.body.renamed.length + '\n';
                    }
                    if (res.body.skipped && res.body.skipped.length) {
                        msg += 'Ignorés : ' + res.body.skipped.length + '\n';
                    }
                    if (res.body.errors && res.body.errors.length) {
                        msg += 'Erreurs : ' + res.body.errors.length + '\n';
                    }
                    alert(msg);
                    if (confirm('Recharger la page ?')) {
                        location.reload();
                    }
                } else {
                    alert('Réponse inattendue.');
                }
            }).catch(function(err) {
                alert('Erreur: ' + err.message);
            });
        });
    }

    function tryRegisterAction() {
        if (typeof OCA !== 'undefined' && OCA.Files && OCA.Files.fileActions) {
            try {
                var perm = (typeof OC !== 'undefined' && OC.PERMISSION_UPDATE) ? OC.PERMISSION_UPDATE : 16;
                OCA.Files.fileActions.registerAction({
                    name: appName,
                    displayName: 'Rename Auto',
                    mimeType: 'all',
                    permissions: perm,
                    actionHandler: openDialog
                });
                log('fileActions.registerAction ok');
                return true;
            } catch (e) {
                console.warn('Renamer: registerAction failed', e);
                return false;
            }
        }
        return false;
    }

    function injectToolbarButton() {
        if (document.getElementById('renamer-toolbar-button')) {
            log('toolbar button already present');
            return;
        }

        var target = document.querySelector('.files-controls') || document.querySelector('.header') || document.body;
        if (!target) {
            log('toolbar target not found');
            return;
        }

        var btn = document.createElement('button');
        btn.id = 'renamer-toolbar-button';
        btn.type = 'button';
        btn.textContent = 'Rename Auto';
        btn.style.marginLeft = '8px';
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
        });

        target.appendChild(btn);
        log('toolbar button injected');
    }

    function init() {
        log('init');
        if (tryRegisterAction()) {
            log('registered via fileActions');
            return;
        }
        log('fileActions not available, using toolbar fallback');
        injectToolbarButton();
    }

    log('loaded');
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
