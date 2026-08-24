(function() {
    'use strict';

    var appName = 'rename-auto';

    function getBaseUrl() {
        return OC.generateUrl('/apps/renamer');
    }

    function log() {
        try { console.log.apply(console, ['[Renamer]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapePath(path) {
        return '"' + String(path).replace(/"/g, '\\"') + '"';
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
            'overflow:auto;box-shadow:0 0 20px rgba(0,0,0,.3);z-index:9001;min-width:320px;' +
            'transition:opacity .3s ease,transform .3s ease;}' +
            '#renamer-modal h3{margin-top:0;}' +
            '#renamer-status.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}' +
            '#renamer-status.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}' +
            '.renamer-field{margin-bottom:8px;transition:all .3s ease;}' +
            '.renamer-field label{display:inline-block;min-width:120px;}' +
            '.renamer-defaults{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}' +
            '.renamer-defaults button{padding:4px 8px;font-size:12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#fff;}' +
            '.renamer-defaults button:hover{background:#f0f0f0;}' +
            '#renamer-bash-output{background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;font-family:monospace;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto;}' +
            '#renamer-bash-copy{margin-top:8px;padding:6px 12px;cursor:pointer;}' +
            '.renamer-diff-remove{background:#f8d7da;color:#721c24;text-decoration:line-through;padding:2px 4px;border-radius:3px;}' +
            '.renamer-diff-add{background:#d4edda;color:#155724;padding:2px 4px;border-radius:3px;font-weight:bold;}';
        document.head.appendChild(style);
    }

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

    function computeLocalPreview(name, mode, pattern, replacement, isInc, incSep, incFormat, index) {
        var base = name;
        if (mode === 'regex' && pattern) {
            try { base = name.replace(new RegExp(pattern), replacement); } catch (e) { base = name; }
        } else if (mode === 'replace' && pattern) {
            base = name.split(pattern).join(replacement);
        } else if (mode === 'cascade') {
            base = name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
        } else if (mode === 'camelcase') {
            base = name.replace(/[^a-zA-Z0-9]+/gu, ' ');
            base = base.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
            base = base.replace(/\s+/g, '');
            if (base !== '') base = base.charAt(0).toLowerCase() + base.slice(1);
        } else if (mode === 'snakecase') {
            base = name.toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
        } else if (mode === 'removespaces') {
            base = name.replace(/\s+/gu, '');
        } else if (mode === 'capitalizefirst') {
            base = name.charAt(0).toUpperCase() + name.slice(1);
        } else if (mode === 'capitalizewords') {
            base = name.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        }

        if (isInc && incFormat) {
            var ext = '';
            var dotIndex = base.lastIndexOf('.');
            if (dotIndex > 0) {
                ext = base.substring(dotIndex);
                base = base.substring(0, dotIndex);
            }
            var result = incFormat
                .replace(/\{name\}/g, base)
                .replace(/\{sep\}/g, isInc ? (incSep || '') : '')
                .replace(/\{i\}/g, String(index || 1));
            return result + ext;
        }
        return base;
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
        html += '<div id="renamer-status" style="display:none;padding:8px;border-radius:6px;margin-bottom:10px;font-weight:bold;"></div>';
        html += '<div id="renamer-files">';
        html += '<p><strong>Fichiers sélectionnés :</strong></p><ul id="renamer-file-list">';
        files.forEach(function(f, idx) {
            html += '<li draggable="true" data-index="' + idx + '">' + escapeHtml(f) + '</li>';
        });
        html += '</ul></div>';

        html += '<div class="renamer-panel">';
        html += '<div class="renamer-field">';
        html += '<label for="renamer-rule-name">Nom :</label>';
        html += '<input type="text" id="renamer-rule-name" placeholder="Nom de la règle" />';
        html += '</div>';
        html += '<div class="renamer-field">';
        html += '<label for="renamer-saved">Règles :</label>';
        html += '<select id="renamer-saved"><option value="">--</option></select>';
        html += '<button id="renamer-save-rule" type="button">Enregistrer</button>';
        html += '<button id="renamer-delete-rule" type="button">Supprimer</button>';
        html += '</div>';
        html += '<div id="renamer-defaults"></div>';
        html += '<div class="renamer-field">';
        html += '<label for="renamer-mode">Mode :</label>';
        html += '<select id="renamer-mode">';
        html += '<option value="regex">Regex</option>';
        html += '<option value="replace">Replace</option>';
        html += '<option value="cascade">Cascade</option>';
        html += '<option value="camelcase">CamelCase</option>';
        html += '<option value="snakecase">snake_case</option>';
        html += '<option value="removespaces">Remove spaces</option>';
        html += '<option value="capitalizefirst">Capitalize first</option>';
        html += '<option value="capitalizewords">Capitalize words</option>';
        html += '<option value="metadata">Metadata</option>';
        html += '</select>';
        html += '</div>';
        html += '<div class="renamer-field" id="renamer-pattern-section">';
        html += '<label for="renamer-pattern">Chercher :</label>';
        html += '<input type="text" id="renamer-pattern" />';
        html += '</div>';
        html += '<div class="renamer-field" id="renamer-replacement-section">';
        html += '<label for="renamer-replacement">Remplacer par :</label>';
        html += '<input type="text" id="renamer-replacement" />';
        html += '</div>';
        html += '<div class="renamer-field" id="renamer-metadata-section" style="display:none;">';
        html += '<label for="renamer-metadata-format">Format :</label>';
        html += '<input type="text" id="renamer-metadata-format" value="{artist} - {title}" style="width:300px;" />';
        html += '</div>';
        html += '<div class="renamer-field">';
        html += '<label><input type="checkbox" id="renamer-dryrun" checked /> Dry run</label>';
        html += ' <label><input type="checkbox" id="renamer-dev" /> Dev Mode (bash)</label>';
        html += ' <label><input type="checkbox" id="renamer-increment" /> Incrément</label>';
        html += '</div>';
        html += '<div class="renamer-field" id="renamer-increment-section" style="display:none;">';
        html += '<label>Separator :</label>';
        html += '<input type="text" id="renamer-inc-sep" value=" - " style="width:60px;" />';
        html += ' <label>Format :</label>';
        html += '<input type="text" id="renamer-inc-format" value="{name}{sep}{i}" style="width:200px;" />';
        html += '</div>';
        html += '<div id="renamer-preview" style="margin-top:10px;"></div>';
        html += '</div>';

        html += '<div style="margin-top:12px;border-top:1px solid #ccc;padding-top:8px;">';
        html += '<button id="renamer-export" type="button">Exporter règles</button> ';
        html += '<button id="renamer-import" type="button">Importer règles</button> ';
        html += '<input type="file" id="renamer-import-file" accept=".json" style="display:none;" />';
        html += '</div>';

        html += '<br/>';
        html += '<button id="renamer-cancel" type="button">Annuler</button> ';
        html += '<button id="renamer-run" type="button">Renommer</button>';
        html += '</div></div></div>';

        var container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container.firstElementChild || container);

        var modeSelect = document.getElementById('renamer-mode');
        var dryrun = document.getElementById('renamer-dryrun');
        var devCheck = document.getElementById('renamer-dev');
        var incCheck = document.getElementById('renamer-increment');
        var incSection = document.getElementById('renamer-increment-section');
        var patternSection = document.getElementById('renamer-pattern-section');
        var replacementSection = document.getElementById('renamer-replacement-section');
        var metadataSection = document.getElementById('renamer-metadata-section');
        var preview = document.getElementById('renamer-preview');
        var savedSelect = document.getElementById('renamer-saved');

        function showStatus(message, isError) {
            var el = document.getElementById('renamer-status');
            if (!el) return;
            el.textContent = message || '';
            el.style.display = message ? 'block' : 'none';
            el.className = isError ? 'error' : 'success';
        }

        function loadSavedRules() {
            try {
                fetch(getBaseUrl() + '/api/rules').then(function(r) { return r.json(); }).then(function(data) {
                    if (data.error) {
                        console.error('[Renamer] rules load error:', data.error);
                        savedSelect.innerHTML = '<option value="">--</option>';
                        return;
                    }
                    var allRules = (data.user || []).concat(data.defaults || []);
                    savedSelect.innerHTML = '<option value="">--</option>';
                    allRules.forEach(function(rule) {
                        var opt = document.createElement('option');
                        opt.value = rule.id || '';
                        opt.textContent = rule.name || '';
                        opt.dataset.mode = rule.mode || 'regex';
                        opt.dataset.pattern = rule.pattern || '';
                        opt.dataset.replacement = rule.replacement || '';
                        savedSelect.appendChild(opt);
                    });
                }).catch(function(err) {
                    console.error('[Renamer] rules load fetch error:', err);
                    savedSelect.innerHTML = '<option value="">--</option>';
                });
            } catch (e) {
                savedSelect.innerHTML = '<option value="">--</option>';
            }
        }
        loadSavedRules();

        function renderFileList() {
            var list = document.getElementById('renamer-file-list');
            if (!list) return;
            list.innerHTML = '';
            files.forEach(function(f, idx) {
                var li = document.createElement('li');
                li.draggable = true;
                li.dataset.index = idx;
                li.textContent = f;
                list.appendChild(li);
            });
        }

        function reorderFiles(fromIndex, toIndex) {
            if (fromIndex === toIndex) return;
            var item = files.splice(fromIndex, 1)[0];
            files.splice(toIndex, 0, item);
            renderFileList();
            updatePreview();
        }

        document.getElementById('renamer-file-list').addEventListener('dragstart', function(e) {
            var li = e.target.closest('li');
            if (!li) return;
            e.dataTransfer.setData('text/plain', li.dataset.index);
            e.dataTransfer.effectAllowed = 'move';
        });

        document.getElementById('renamer-file-list').addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        document.getElementById('renamer-file-list').addEventListener('drop', function(e) {
            e.preventDefault();
            var fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            var toIndex = parseInt((e.target.closest('li') || {}).dataset.index || '-1', 10);
            if (!isNaN(fromIndex) && !isNaN(toIndex) && toIndex >= 0) {
                reorderFiles(fromIndex, toIndex);
            }
        });

        function updatePreview() {
            var pattern = document.getElementById('renamer-pattern').value;
            var replacement = document.getElementById('renamer-replacement').value;
            var mode = modeSelect ? modeSelect.value : 'regex';
            var isDev = devCheck ? devCheck.checked : false;
            var isInc = incCheck ? incCheck.checked : false;
            var incSep = document.getElementById('renamer-inc-sep') ? document.getElementById('renamer-inc-sep').value : ' - ';
            var incFormat = document.getElementById('renamer-inc-format') ? document.getElementById('renamer-inc-format').value : '{name}{sep}{i}';

            if (mode === 'metadata') {
                var format = document.getElementById('renamer-metadata-format') ? document.getElementById('renamer-metadata-format').value : '{artist} - {title}';
                preview.innerHTML = '<p><strong>Metadata preview (local simulation) :</strong></p><ul>';
                files.forEach(function(f) {
                    var baseName = f.replace(/^.*\//, '');
                    preview.innerHTML += '<li>' + escapeHtml(f) + ' &rarr; <em>' + escapeHtml(format) + '</em> (' + escapeHtml(baseName) + ')</li>';
                });
                preview.innerHTML += '</ul>';
                preview.innerHTML += '<p style="font-size:12px;color:#666;">Metadata extraction requires server-side processing. Click "Renommer" to get actual metadata.</p>';
                return;
            }

            if (isDev) {
                var bashLines = [];
                files.forEach(function(f, idx) {
                    var baseName = f.replace(/^.*\//, '');
                    var dirName = f.replace(/\/[^/]*$/, '') || '.';
                    var newBase = computeLocalPreview(baseName, mode, pattern, replacement, isInc, incSep, incFormat, idx + 1);
                    if (newBase !== baseName) {
                        var newPath = dirName + '/' + newBase;
                        bashLines.push('mv ' + escapePath(f) + ' ' + escapePath(newPath));
                    }
                });
                preview.innerHTML = '<p><strong>Bash commands :</strong></p>' +
                    '<pre id="renamer-bash-output">' + escapeHtml(bashLines.join('\n')) + '</pre>' +
                    '<button id="renamer-bash-copy" type="button">Copy to clipboard</button>';
                var copyBtn = document.getElementById('renamer-bash-copy');
                if (copyBtn) {
                    copyBtn.addEventListener('click', function() {
                        var out = document.getElementById('renamer-bash-output');
                        if (!out || !out.textContent) return;
                        navigator.clipboard.writeText(out.textContent).then(function() {
                            showStatus('Copié dans le presse-papier.', false);
                        }).catch(function() {
                            showStatus('Impossible de copier.', true);
                        });
                    });
                }
                return;
            }

            var htmlPreview = '<p><strong>Aperçu :</strong></p><ul>';
            files.forEach(function(f, idx) {
                var baseName = f.replace(/^.*\//, '');
                var dirName = f.replace(/\/[^/]*$/, '') || '.';
                var newBase = computeLocalPreview(baseName, mode, pattern, replacement, isInc, incSep, incFormat, idx + 1);
                var newPath = dirName + '/' + newBase;

                if (newBase !== baseName) {
                    htmlPreview += '<li>' + computeOriginalDiff(baseName, mode, pattern) + ' &rarr; ' + computeNewDiff(baseName, newBase, mode, pattern, replacement, isInc, incSep, incFormat, idx + 1) + '</li>';
                } else {
                    htmlPreview += '<li>' + escapeHtml(f) + ' &rarr; ' + escapeHtml(newPath) + '</li>';
                }
            });
            htmlPreview += '</ul>';
            preview.innerHTML = htmlPreview;
        }

        function computeOriginalDiff(original, mode, pattern) {
            if ((mode === 'regex' || mode === 'replace') && pattern) {
                var escaped = escapeHtml(original);
                var pat = escapeHtml(pattern);
                if (pat === '') return escaped;
                var parts = escaped.split(pat);
                if (parts.length <= 1) return escaped;
                var out = '';
                for (var i = 0; i < parts.length; i++) {
                    if (i > 0) {
                        out += '<span class="renamer-diff-remove">' + pat + '</span>';
                    }
                    out += parts[i];
                }
                return out;
            }
            if (mode === 'cascade') {
                return escapeHtml(original).replace(/(\[[^\]]*\])/g, '<span class="renamer-diff-remove">$1</span>').replace(/(\s+)/g, '<span class="renamer-diff-remove">$1</span>');
            }
            return escapeHtml(original);
        }

        function computeNewDiff(original, transformed, mode, pattern, replacement, isInc, incSep, incFormat, index) {
            var result = escapeHtml(transformed);

            if ((mode === 'regex' || mode === 'replace') && pattern) {
                result = highlightPattern(result, replacement || '', 'renamer-diff-add');
            } else if (mode === 'cascade') {
                result = '<span class="renamer-diff-add">' + result.replace(/(\[[^\]]*\])/g, '').replace(/(\s+)/g, ' ') + '</span>';
            } else if (mode === 'metadata' || mode === 'camelcase' || mode === 'snakecase' || mode === 'removespaces' || mode === 'capitalizefirst' || mode === 'capitalizewords') {
                result = '<span class="renamer-diff-add">' + result + '</span>';
            }

            if (isInc) {
                result = highlightIncrement(result, incSep, incFormat, index);
            }

            return result;
        }

        function highlightPattern(text, pattern, cssClass) {
            if (!pattern) return text;
            var escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try {
                var regex = new RegExp(escapedPattern, 'g');
                return text.replace(regex, function(match) {
                    return '<span class="' + cssClass + '">' + match + '</span>';
                });
            } catch (e) {
                return text;
            }
        }

        function highlightIncrement(text, incSep, incFormat, index) {
            var incToken = String(index || 1);
            var result = text.split(incToken).join('<span class="renamer-diff-add">' + incToken + '</span>');
            var sep = incSep || '';
            if (sep) {
                result = result.split(sep).join('<span class="renamer-diff-add">' + sep + '</span>');
            }
            return result;
        }

        function updateModeFields() {
            var mode = modeSelect ? modeSelect.value : 'regex';
            var isMeta = mode === 'metadata';
            if (patternSection) patternSection.style.display = isMeta ? 'none' : 'block';
            if (replacementSection) replacementSection.style.display = isMeta ? 'none' : 'block';
            if (metadataSection) metadataSection.style.display = isMeta ? 'block' : 'none';
            updatePreview();
        }

        if (modeSelect) modeSelect.addEventListener('change', updateModeFields);
        document.getElementById('renamer-pattern').addEventListener('input', updatePreview);
        document.getElementById('renamer-replacement').addEventListener('input', updatePreview);
        document.getElementById('renamer-metadata-format').addEventListener('input', updatePreview);
        document.getElementById('renamer-inc-sep').addEventListener('input', updatePreview);
        document.getElementById('renamer-inc-format').addEventListener('input', updatePreview);
        if (devCheck) devCheck.addEventListener('change', updatePreview);
        if (incCheck) {
            incCheck.addEventListener('change', function() {
                var section = document.getElementById('renamer-increment-section');
                if (section) section.style.display = incCheck.checked ? 'block' : 'none';
                updatePreview();
            });
        }

        savedSelect.addEventListener('change', function() {
            var opt = savedSelect.options[savedSelect.selectedIndex];
            if (!opt || !opt.value) return;
            document.getElementById('renamer-pattern').value = opt.dataset.pattern || '';
            document.getElementById('renamer-replacement').value = opt.dataset.replacement || '';
            if (modeSelect && opt.dataset.mode) modeSelect.value = opt.dataset.mode;
            updatePreview();
        });

        document.getElementById('renamer-save-rule').addEventListener('click', function() {
            try {
                var name = document.getElementById('renamer-rule-name').value.trim();
                var pattern = document.getElementById('renamer-pattern').value;
                var replacement = document.getElementById('renamer-replacement').value;
                var mode = modeSelect ? modeSelect.value : 'regex';
                if (!name) {
                    showStatus('Veuillez saisir un nom de règle.', true);
                    return;
                }
                fetch(getBaseUrl() + '/api/rules', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, mode: mode, pattern: pattern, replacement: replacement })
                }).then(function(r) { return r.json(); }).then(function(data) {
                    if (data.id) {
                        showStatus('Règle enregistrée.', false);
                        document.getElementById('renamer-rule-name').value = '';
                        loadSavedRules();
                    } else {
                        showStatus('Erreur: ' + (data.error || 'Réponse inattendue'), true);
                    }
                }).catch(function(err) {
                    showStatus('Erreur: ' + (err.message || 'réseau'), true);
                });
            } catch (e) {
                showStatus('Erreur lors de l\'enregistrement de la règle.', true);
            }
        });

        document.getElementById('renamer-delete-rule').addEventListener('click', function() {
            var id = savedSelect.value;
            if (!id) {
                alert('Veuillez sélectionner une règle.');
                return;
            }
            if (!confirm('Supprimer cette règle ?')) return;
            fetch(getBaseUrl() + '/api/rules/' + encodeURIComponent(id), {
                method: 'DELETE',
                credentials: 'same-origin',
            }).then(function() {
                loadSavedRules();
            }).catch(function() {
                alert('Erreur lors de la suppression.');
            });
        });

        document.getElementById('renamer-export').addEventListener('click', function() {
            fetch(getBaseUrl() + '/api/rules/export', { credentials: 'same-origin' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var blob = new Blob([JSON.stringify(data.rules || [], null, 2)], { type: 'application/json' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'renamer-rules.json';
                    a.click();
                    URL.revokeObjectURL(url);
                });
        });

        document.getElementById('renamer-import').addEventListener('click', function() {
            document.getElementById('renamer-import-file').click();
        });

        document.getElementById('renamer-import-file').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var rules = JSON.parse(ev.target.result);
                    fetch(getBaseUrl() + '/api/rules/import', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rules: rules })
                    }).then(function(r) { return r.json(); }).then(function(data) {
                        showStatus('Importé: ' + (data.imported || 0) + ', ignorés: ' + (data.skipped || 0), false);
                        loadSavedRules();
                    }).catch(function() {
                        showStatus('Erreur import', true);
                    });
                } catch (err) {
                    showStatus('JSON invalide', true);
                }
            };
            reader.readAsText(file);
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
            var isDev = devCheck ? devCheck.checked : false;
            var isInc = incCheck ? incCheck.checked : false;
            var incSep = document.getElementById('renamer-inc-sep') ? document.getElementById('renamer-inc-sep').value : ' - ';
            var incFormat = document.getElementById('renamer-inc-format') ? document.getElementById('renamer-inc-format').value : '{name}{sep}{i}';

            var payload = {
                paths: files,
                mode: mode,
                pattern: pattern,
                replacement: replacement,
                dryRun: isDryRun,
                dev: isDev,
                increment: isInc,
                incSep: incSep,
                incFormat: incFormat
            };
            log('run payload', payload);

            if (isDev) {
                payload.dryRun = true;
            }

            showStatus('Renommage en cours...', false);
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
                var textPromise = r.clone().text().then(function(t) {
                    log('response raw text', t);
                    try {
                        return Promise.resolve({ ok: r.ok, body: JSON.parse(t) });
                    } catch (e) {
                        return Promise.resolve({ ok: r.ok, body: t });
                    }
                });
                return textPromise;
            }).then(function(res) {
                log('response parsed', res);
                var body = res.body;
                if (typeof body !== 'object' || body === null) {
                    showStatus('Erreur serveur: ' + (res.status || '?'), true);
                    console.error('[Renamer]', body);
                    return;
                }

                if (isDev && body.preview) {
                    var bashOutput = document.getElementById('renamer-bash-output');
                    var bashLines = [];
                    body.preview.forEach(function(p) {
                        if (p.bash) bashLines.push(p.bash);
                    });
                    if (!bashOutput) {
                        preview.innerHTML = '<pre id="renamer-bash-output">' + escapeHtml(bashLines.join('\n')) + '</pre>' +
                            '<button id="renamer-bash-copy" type="button">Copy to clipboard</button>';
                        document.getElementById('renamer-bash-copy').addEventListener('click', function() {
                            navigator.clipboard.writeText(bashLines.join('\n')).then(function() {
                                showStatus('Copié dans le presse-papier.', false);
                            }).catch(function() {
                                showStatus('Impossible de copier.', true);
                            });
                        });
                    } else {
                        bashOutput.textContent = bashLines.join('\n');
                    }
                    showStatus('Dev Mode: ' + bashLines.length + ' commandes générées', false);
                    return;
                }

                if (body && body.success) {
                    var msg = 'Renommage terminé.';
                    if (body.renamed && body.renamed.length) {
                        msg += ' Renommés : ' + body.renamed.length;
                    }
                    if (body.skipped && body.skipped.length) {
                        msg += ' Ignorés : ' + body.skipped.length;
                    }
                    if (body.errors && body.errors.length) {
                        msg += ' Erreurs : ' + body.errors.length;
                    }
                    showStatus(msg, false);
                } else {
                    showStatus('Réponse inattendue.', true);
                }
            }).catch(function(err) {
                log('fetch error', err);
                showStatus('Erreur: ' + err.message, true);
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
