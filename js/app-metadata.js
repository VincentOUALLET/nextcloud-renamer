(function() {
    'use strict';

    console.log('[MetadataTab] module loaded');
    document.title = document.title + ' [MT]';
    const TAB_ID = 'metadata';

    function build(ctx) {
        console.log('[MetadataTab] build() called');
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-main">
                    <div class="renamer-rules">
                        <div class="renamer-rules-list" id="metadata-rules-list">
                            <button class="renamer-add-btn" id="metadata-add-btn" title="+">+</button>
                        </div>
                    </div>
                    <div class="renamer-preview">
                        <div class="renamer-preview-header">
                            <span>${ctx.t('preview')}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button type="button" id="metadata-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="Désélectionner Tout">✓</button>
                            </div>
                        </div>
                        <div class="renamer-preview-list" id="metadata-preview-list"></div>
                    </div>
                </div>
                <div class="renamer-footer">
                    <button class="renamer-btn" id="metadata-cancel">${ctx.t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" id="metadata-apply">${ctx.t('metadataApply')}</button>
                </div>
            </div>
         `;
     }

     function render(ctx) {
         console.log('[MetadataTab] render() called');
         renderRules(ctx);
         renderPreview(ctx);
     }

    function showAddPopup(ctx) {
        const existing = document.getElementById('metadata-add-popup');
        if (existing) { existing.remove(); return; }
        const popup = document.createElement('div');
        popup.id = 'metadata-add-popup';
        popup.className = 'renamer-popup';
        popup.style.zIndex = '10000';
        const addBtn = document.getElementById('metadata-add-btn');
        if (!addBtn) return;
        const rect = addBtn.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.left = (rect.left + rect.width / 2) + 'px';
        popup.style.transform = 'translateX(-50%)';
        popup.style.minWidth = '220px';
        popup.innerHTML = '<div class="renamer-popup-item" data-type="search_replace">' + ctx.t('searchReplace') + '</div>' +
            '<div class="renamer-popup-item" data-type="regex">' + ctx.t('regex') + '</div>' +
            '<div class="renamer-popup-item" data-type="sequence">' + ctx.t('sequence') + '</div>' +
            '<div class="renamer-popup-item" data-type="truncate">' + ctx.t('truncate') + '</div>' +
            '<div class="renamer-popup-item" data-type="add_text">' + ctx.t('addText') + '</div>' +
            '<div class="renamer-popup-separator"></div>' +
            '<div class="renamer-popup-item" data-type="basic">' + ctx.t('basicRules') + '</div>' +
            '<div class="renamer-popup-item" data-type="camelcase">CamelCase</div>' +
            '<div class="renamer-popup-item" data-type="snakecase">snake_case</div>' +
            '<div class="renamer-popup-item" data-type="removespaces">Supprimer espaces</div>' +
            '<div class="renamer-popup-item" data-type="capitalizefirst">Majuscule première</div>' +
            '<div class="renamer-popup-item" data-type="capitalizewords">Majuscule mots</div>' +
            '<div class="renamer-popup-item" data-type="cascade">Cascade</div>';
        document.body.appendChild(popup);

        const popupRect = { width: Math.max(popup.offsetWidth, 220), height: popup.offsetHeight };
        const fitsBelow = rect.bottom + popupRect.height + 8 <= window.innerHeight;
        const fitsAbove = rect.top - popupRect.height - 8 >= 0;
        if (fitsBelow) {
            popup.style.top = (rect.bottom + 8) + 'px';
        } else if (fitsAbove) {
            popup.style.top = (rect.top - popupRect.height - 8) + 'px';
        } else {
            popup.style.top = Math.max(8, rect.bottom + 8) + 'px';
            popup.style.maxHeight = (window.innerHeight - rect.bottom - 16) + 'px';
            popup.style.overflowY = 'auto';
        }

        popup.querySelectorAll('.renamer-popup-item').forEach(function(item) {
            item.addEventListener('click', function() {
                const type = this.dataset.type;
                if (type) {
                    createRule(ctx, type);
                    popup.remove();
                }
            });
        });
    }

    function createRule(ctx, mode) {
        const metadataField = prompt(ctx.t('metadataManualEditTitle') || 'Champ metadata (artist, title, album, track, year, genre):', 'artist');
        if (!metadataField) return;

        const validFields = ['artist', 'title', 'album', 'track', 'year', 'genre'];
        if (validFields.indexOf(metadataField) === -1) {
            ctx.showToast('Champ metadata invalide', 'error');
            return;
        }

        const name = 'Règle metadata ' + metadataField + ' (' + mode + ')';
        const rule = {
            id: Date.now() + Math.random(),
            name: name,
            mode: mode,
            pattern: '',
            replacement: '',
            target: 'full',
            sequenceType: 'numeric',
            startValue: 1,
            zeroPadding: 0,
            enabled: true,
            filterMode: 'ignored',
            extensions: [],
            scope: 'metadata',
            metadataField: metadataField,
        };

        ctx.state.metadataRules.push(rule);
        renderRules(ctx);
        saveRules(ctx);
    }

    function saveRules(ctx) {
        const metadataRules = ctx.state.metadataRules.filter(function(r) { return r.scope === 'metadata'; });
        const allRules = ctx.state.rules.filter(function(r) { return r.scope !== 'metadata'; }).concat(metadataRules);

        ctx.apiRequest(ctx.getBaseUrl() + '/api/rules/import', {
            method: 'POST',
            body: JSON.stringify({ rules: allRules.map(function(r) {
                return {
                    name: r.name, mode: r.mode, pattern: r.pattern, replacement: r.replacement,
                    target: r.target, sequenceType: r.sequenceType, startValue: r.startValue,
                    zeroPadding: r.zeroPadding, enabled: r.enabled, filterMode: r.filterMode,
                    extensions: r.extensions, scope: r.scope, metadataField: r.metadataField || ''
                };
            })})
        }).then(function(body) {
            if (body && body.success) {
                loadRules(ctx);
            }
        }).catch(function(err) {
            console.error('Failed to save metadata rules', err);
        });
    }

    function loadRules(ctx) {
        ctx.apiRequest(ctx.getBaseUrl() + '/api/rules', { method: 'GET' })
            .then(function(body) {
                const allRules = (body && body.user) ? body.user : [];
                ctx.state.metadataRules = allRules.filter(function(r) { return r.scope === 'metadata'; });
                if (ctx.state.activeTab === 'metadata') {
                    renderRules(ctx);
                }
            })
            .catch(function(err) {
                console.error('Failed to load metadata rules', err);
            });
    }

    function renderRules(ctx) {
        const list = document.getElementById('metadata-rules-list');
        if (!list) return;
        const existingAddBtn = document.getElementById('metadata-add-btn');
        if (existingAddBtn) existingAddBtn.remove();
        list.innerHTML = '';

        const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata'; });

        metadataRules.forEach(function(rule, idx) {
            const card = document.createElement('div');
            card.className = 'renamer-rule-card type-' + rule.mode + (rule.enabled ? '' : ' disabled');
            card.dataset.index = idx;
            card.innerHTML = buildRuleCardHtml(ctx, rule, idx);
            list.appendChild(card);
        });

        if (existingAddBtn) {
            list.appendChild(existingAddBtn);
        } else {
            const btn = document.createElement('button');
            btn.className = 'renamer-add-btn';
            btn.id = 'metadata-add-btn';
            btn.title = '+';
            btn.textContent = '+';
            list.appendChild(btn);
        }

        const newAddBtn = document.getElementById('metadata-add-btn');
        if (newAddBtn && !newAddBtn._metadataBound) {
            newAddBtn._metadataBound = true;
            newAddBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showAddPopup(ctx);
            });
        }

        ctx.initRulesDnD(list);
    }

    function bind(ctx) {
        console.log('[MetadataTab] bind() called');
        const addBtn = document.getElementById('metadata-add-btn');
        if (addBtn && !addBtn._metadataBound) {
            addBtn._metadataBound = true;
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showAddPopup(ctx);
            });
            console.log('[MetadataTab] bound add button');
        } else if (!addBtn) {
            console.warn('[MetadataTab] add button NOT FOUND in DOM');
        }

        const cancelBtn = document.getElementById('metadata-cancel');
        if (cancelBtn && !cancelBtn._metadataBound) {
            cancelBtn._metadataBound = true;
            cancelBtn.addEventListener('click', function() {
                ctx.closeDialog();
            });
            console.log('[MetadataTab] bound cancel button');
        }

        const applyBtn = document.getElementById('metadata-apply');
        if (applyBtn && !applyBtn._metadataBound) {
            applyBtn._metadataBound = true;
            applyBtn.addEventListener('click', function() {
                handleApply(ctx);
            });
            console.log('[MetadataTab] bound apply button');
        }

        const toggleAllBtn = document.getElementById('metadata-toggle-all');
        if (toggleAllBtn && !toggleAllBtn._metadataBound) {
            toggleAllBtn._metadataBound = true;
            toggleAllBtn.addEventListener('click', function() {
                toggleSelection(ctx);
                renderPreview(ctx);
            });
            console.log('[MetadataTab] bound toggle-all button');
        }
    }

    function buildRuleCardHtml(ctx, rule, idx) {
        const num = idx + 1;
        const color = ctx.getRuleColor(rule.mode);
        const metadataFields = [
            { value: 'artist', label: ctx.t('metadataArtist') || 'Artiste' },
            { value: 'title', label: ctx.t('metadataTitle') || 'Titre' },
            { value: 'album', label: ctx.t('metadataAlbum') || 'Album' },
            { value: 'track', label: ctx.t('metadataTrack') || 'Piste' },
            { value: 'year', label: ctx.t('metadataYear') || 'Année' },
            { value: 'genre', label: ctx.t('metadataGenre') || 'Genre' },
        ];
        let fieldOptions = metadataFields.map(function(f) {
            return '<option value="' + f.value + '" ' + (rule.metadataField === f.value ? 'selected' : '') + '>' + ctx.escapeHtml(f.label) + '</option>';
        }).join('');

        return '<div class="renamer-rule-header">' +
            '<span class="renamer-rule-drag" title="' + ctx.escapeHtml(ctx.t('dragToReorder') || 'Déplacer') + '"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>' +
            '<span class="renamer-rule-number" style="background:' + color + '">' + num + '</span>' +
            '<span class="renamer-rule-name">' + ctx.escapeHtml(rule.name) + '</span>' +
            '<div class="renamer-rule-actions">' +
                '<div class="renamer-toggle ' + (rule.enabled ? 'on' : '') + '" data-index="' + idx + '" title="' + (rule.enabled ? 'On' : 'Off') + '" draggable="false"><div class="renamer-toggle-knob"></div></div>' +
                '<button class="renamer-btn-icon" data-action="duplicate" data-index="' + idx + '" title="Dupliquer" draggable="false"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>' +
                '<button class="renamer-btn-icon" data-action="delete" data-index="' + idx + '" title="Supprimer" draggable="false"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>' +
            '</div>' +
        '</div>' +
        '<div class="renamer-rule-body">' + ctx.buildRuleBody(rule, idx) +
            '<div class="renamer-field" style="flex:1;min-width:140px;">' +
                '<label>' + ctx.t('metadataManualEdit') + '</label>' +
                '<select class="metadata-field-select" data-index="' + idx + '">' +
                    '<option value="" ' + (!rule.metadataField ? 'selected' : '') + '>--</option>' + fieldOptions +
                '</select>' +
            '</div>' +
        '</div>';
    }

    function attachMetadataRulesListeners(ctx, list) {
        list.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action]');
            if (target) {
                const action = target.dataset.action;
                const index = parseInt(target.dataset.index, 10);
                if (action === 'delete' && ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules.splice(index, 1);
                    renderRules(ctx);
                    renderPreview(ctx);
                    saveRules(ctx);
                } else if (action === 'duplicate' && ctx.state.metadataRules[index]) {
                    const original = ctx.state.metadataRules[index];
                    const copy = Object.assign({}, original, { id: Date.now() + Math.random(), name: original.name + ' (copie)' });
                    ctx.state.metadataRules.splice(index + 1, 0, copy);
                    renderRules(ctx);
                    renderPreview(ctx);
                    saveRules(ctx);
                } else if (action === 'swap' && ctx.state.metadataRules[index]) {
                    const rule = ctx.state.metadataRules[index];
                    const tmp = rule.pattern;
                    rule.pattern = rule.replacement;
                    rule.replacement = tmp;
                    renderRules(ctx);
                    renderPreview(ctx);
                } else if (action === 'toggle-case' && ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules[index].caseSensitive = ctx.state.metadataRules[index].caseSensitive === false ? true : false;
                    renderRules(ctx);
                    renderPreview(ctx);
                }
            }
        });

        list.addEventListener('input', function(e) {
            const input = e.target.closest('input[data-field]');
            if (input) {
                const index = parseInt(input.dataset.index, 10);
                const field = input.dataset.field;
                if (ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules[index][field] = input.value;
                    renderPreview(ctx);
                }
            }
        });

        list.addEventListener('change', function(e) {
            const select = e.target.closest('select[data-field]');
            if (select) {
                const index = parseInt(select.dataset.index, 10);
                const field = select.dataset.field;
                if (ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules[index][field] = select.value;
                    if (field === 'insertPosition') {
                        const insertAtEl = document.getElementById('insert-at-' + index);
                        if (insertAtEl) {
                            insertAtEl.style.display = select.value === 'position' ? 'block' : 'none';
                        }
                    }
                    if (field === 'sequencePosition') {
                        const sequenceAtEl = document.getElementById('sequence-at-' + index);
                        if (sequenceAtEl) {
                            sequenceAtEl.style.display = select.value === 'at' ? 'block' : 'none';
                        }
                    }
                    renderPreview(ctx);
                }
            }
        });

        list.addEventListener('click', function(e) {
            const toggle = e.target.closest('.renamer-toggle');
            if (toggle) {
                const index = parseInt(toggle.dataset.index, 10);
                if (ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules[index].enabled = !ctx.state.metadataRules[index].enabled;
                    renderRules(ctx);
                    renderPreview(ctx);
                }
            }

            const targetSelect = e.target.closest('.renamer-target-select');
            if (targetSelect) {
                const index = parseInt(targetSelect.dataset.index, 10);
                const target = targetSelect.value;
                if (ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules[index].target = target;
                    renderPreview(ctx);
                }
            }

            const extPill = e.target.closest('.renamer-file-pill[data-ext]');
            if (extPill) {
                const index = parseInt(extPill.dataset.index, 10);
                const ext = extPill.dataset.ext;
                if (ctx.state.metadataRules[index] && ctx.state.metadataRules[index].mode === 'filetype') {
                    if (!ctx.state.metadataRules[index].extensions) ctx.state.metadataRules[index].extensions = [];
                    const pos = ctx.state.metadataRules[index].extensions.indexOf(ext);
                    if (pos >= 0) {
                        ctx.state.metadataRules[index].extensions.splice(pos, 1);
                    } else {
                        ctx.state.metadataRules[index].extensions.push(ext);
                    }
                    renderRules(ctx);
                    renderPreview(ctx);
                }
            }

            const metaFieldSelect = e.target.closest('.metadata-field-select');
            if (metaFieldSelect) {
                const index = parseInt(metaFieldSelect.dataset.index, 10);
                const field = metaFieldSelect.value;
                if (ctx.state.metadataRules[index]) {
                    ctx.state.metadataRules[index].metadataField = field;
                    renderPreview(ctx);
                    saveRules(ctx);
                }
            }
        });
    }

    function renderPreview(ctx) {
        const list = document.getElementById('metadata-preview-list');
        if (!list) return;
        list.innerHTML = '<div style="padding:16px;text-align:center;opacity:0.6;">Chargement...</div>';

        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const selectedFiles = ctx.state.files.filter(function(f) {
            if (!selectedSet) return true;
            return selectedSet.has(f);
        });

        if (!selectedFiles.length) {
            list.innerHTML = '<div class="renamer-empty">Aucun fichier sélectionné</div>';
            return;
        }

        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = selectedFiles.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        if (!audioFiles.length) {
            list.innerHTML = '<div class="renamer-empty">Aucun fichier audio</div>';
            return;
        }

        ctx.apiRequest(ctx.getBaseUrl() + '/api/metadata/read', {
            method: 'POST',
            body: JSON.stringify({ paths: audioFiles })
        }).then(function(body) {
            if (!body || !body.success) {
                list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(body && body.error ? body.error : 'Erreur inconnue') + '</div>';
                return;
            }

            const files = body.files || [];
            ctx.state.metadataFileData = {};
            files.forEach(function(fileData) {
                ctx.state.metadataFileData[fileData.path] = fileData;
            });

            const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata' && r.enabled; });
            const unsupportedCount = files.filter(function(f) { return !f.readable && !f.writable; }).length;

            if (unsupportedCount > 0) {
                ctx.showToast(unsupportedCount + ' ' + (ctx.t('metadataUnsupportedType') || 'fichiers ignorés (type non supporté pour l\'édition de métadonnées)'), 'info');
            }

            list.innerHTML = '';
            files.forEach(function(fileData) {
                const row = document.createElement('div');
                const isUnhandled = !fileData.readable && !fileData.writable;
                const hasError = !!fileData.error;
                const baseName = fileData.path.replace(/^.*\//, '');
                const meta = fileData.metadata || {};
                const isUpdated = ctx.state.manualOverrides[fileData.path] && Object.keys(ctx.state.manualOverrides[fileData.path]).length > 0;

                const displayMeta = isUpdated ? ctx.state.manualOverrides[fileData.path] : meta;
                const transformedMeta = metadataRules.length > 0 ? applyRulesClient(ctx, displayMeta, metadataRules) : displayMeta;

                let rowClasses = ['renamer-preview-row', 'metadata-preview-row'];
                if (isUnhandled) rowClasses.push('metadata-preview-row-unhandled');
                row.className = rowClasses.join(' ');
                row.dataset.path = fileData.path;

                let metaHtml = '';
                if (isUnhandled) {
                    metaHtml = '<div class="metadata-no-data">' + ctx.escapeHtml(ctx.t('metadataUnsupportedType') || 'Type non supporté') + '</div>';
                } else if (fileData.error) {
                    metaHtml = '<div class="metadata-no-data" style="color:var(--nc-red);">' + ctx.escapeHtml(fileData.error) + '</div>';
                } else if (meta && Object.keys(meta).length) {
                    const fields = [];
                    const fieldKeys = ['artist', 'title', 'album', 'track', 'year', 'genre'];
                    fieldKeys.forEach(function(key) {
                        if (meta[key]) {
                            const changed = isUpdated && ctx.state.manualOverrides[fileData.path][key] && ctx.state.manualOverrides[fileData.path][key] !== meta[key];
                            const val = changed ? ctx.state.manualOverrides[fileData.path][key] : meta[key];
                            fields.push('<span class="metadata-field"><strong>' + ctx.escapeHtml(key) + ':</strong> ' + ctx.escapeHtml(val) + (changed ? ' <span class="metadata-badge-updated">' + ctx.escapeHtml(ctx.t('metadataUpdated') || 'modifié') + '</span>' : '') + '</span>');
                        }
                    });
                    metaHtml = '<div class="metadata-fields">' + fields.join('') + '</div>';
                } else {
                    metaHtml = '<div class="metadata-no-data">' + ctx.escapeHtml(ctx.t('metadataNoMetadata') || 'Pas de métadonnées') + '</div>';
                }

                let resultHtml = '';
                if (fileData.writable && metadataRules.length > 0) {
                    const changedFields = [];
                    const allFields = ['artist', 'title', 'album', 'track', 'year', 'genre'];
                    allFields.forEach(function(key) {
                        const current = (transformedMeta[key] || '').trim();
                        const original = (displayMeta[key] || '').trim();
                        if (current !== original) {
                            changedFields.push('<span class="metadata-field"><strong>' + ctx.escapeHtml(key) + ':</strong> <span class="metadata-from">' + ctx.escapeHtml(original) + '</span> → <span class="metadata-to">' + ctx.escapeHtml(current) + '</span></span>');
                        }
                    });
                    if (changedFields.length) {
                        resultHtml = '<div class="metadata-result">' + changedFields.join('') + '</div>';
                    }
                }

                const eyeBtn = fileData.writable ? '<button class="renamer-btn-icon metadata-eye-btn" data-path="' + ctx.escapeHtml(fileData.path) + '" title="' + ctx.escapeHtml(ctx.t('metadataManualEdit') || 'Édition manuelle') + '" draggable="false" style="font-size:14px;">👁</button>' : '';

                row.innerHTML = '<span class="renamer-preview-drag-handle" title="' + ctx.escapeHtml(ctx.t('dragToReorder') || 'Déplacer') + '"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>' +
                    '<div class="metadata-content">' +
                        '<div class="metadata-filename">' + ctx.escapeHtml(baseName) + (isUpdated ? ' <span class="metadata-badge-updated">' + ctx.escapeHtml(ctx.t('metadataUpdated') || 'modifié') + '</span>' : '') + '</div>' +
                        metaHtml +
                        resultHtml +
                    '</div>' +
                    eyeBtn;

                list.appendChild(row);
            });

            list.querySelectorAll('.metadata-eye-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const path = this.dataset.path;
                    showEditor(ctx, path);
                });
            });

            updateToggleAllButton(ctx);
            updateApplyButtonState(ctx);
        }).catch(function(err) {
            list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(err.message || 'Erreur réseau') + '</div>';
        });
    }

    function applyRulesClient(ctx, meta, rules) {
        const result = {};
        Object.keys(meta).forEach(function(k) { result[k] = meta[k]; });

        rules.forEach(function(rule) {
            if (!rule.enabled || !rule.metadataField) return;
            const field = rule.metadataField;
            if (!result[field]) return;
            result[field] = applyRuleToValue(result[field], rule);
        });

        return result;
    }

    function applyRuleToValue(value, rule) {
        const mode = rule.mode;
        const pattern = rule.pattern || '';
        const replacement = rule.replacement || '';

        switch (mode) {
            case 'search_replace':
                return String(value).split(pattern).join(replacement);
            case 'regex':
                return String(value).replace(new RegExp(pattern, 'g'), replacement);
            case 'replace':
                return String(value).split(pattern).join(replacement);
            case 'truncate':
                var len = parseInt(rule.truncateLength || '0', 10);
                if (len <= 0) return '';
                var direction = rule.truncateDirection || 'end';
                if (direction === 'start') return String(value).slice(len);
                return String(value).slice(0, Math.max(0, String(value).length - len));
            case 'add_text':
                var text = rule.insertText || '';
                var position = rule.insertPosition || 'end';
                if (position === 'start') return text + String(value);
                return String(value) + text;
            case 'basic':
                var subType = rule.basicSubType || '';
                if (subType === 'lowercase') return String(value).toLowerCase();
                if (subType === 'uppercase') return String(value).toUpperCase();
                if (subType === 'capitalize') return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
                if (subType === 'capitalize_words') return String(value).toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                return String(value);
            case 'camelcase':
                var tmp = String(value).replace(/[^a-zA-Z0-9]+/gu, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }).replace(/\s+/g, '');
                if (tmp) tmp = tmp.charAt(0).toLowerCase() + tmp.slice(1);
                return tmp;
            case 'snakecase':
                return String(value).toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
            case 'removespaces':
                return String(value).replace(/\s+/gu, '');
            case 'capitalizefirst':
                if (!String(value)) return String(value);
                return String(value).charAt(0).toUpperCase() + String(value).slice(1);
            case 'capitalizewords':
                return String(value).replace(/\b\w/g, function(c) { return c.toUpperCase(); });
            case 'cascade':
                return String(value).replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
            case 'sequence':
                var index = parseInt(rule.startValue || '1', 10);
                var type = rule.sequenceType || 'numeric';
                var padding = parseInt(rule.zeroPadding || '0', 10);
                var sep = rule.incSep || ' - ';
                var seq = sequenceValue(index, type, padding);
                var position = rule.sequencePosition || 'end';
                if (position === 'start') return seq + sep + String(value);
                return String(value) + sep + seq;
            default:
                return String(value);
        }
    }

    function sequenceValue(index, type, padding) {
        var i = index;
        if (type === 'alphabetic') {
            var value = '';
            var n = i;
            while (n > 0) {
                n--;
                value = String.fromCharCode(97 + (n % 26)) + value;
                n = Math.floor(n / 26);
            }
            return value;
        }
        if (type === 'roman') {
            var romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
            return romans[Math.min(i - 1, romans.length - 1)] || String(i);
        }
        var value = String(i);
        if (padding > 0) value = value.padStart(padding, '0');
        return value;
    }

    function toggleSelection(ctx) {
        const allOn = ctx.state.metadataAllSelected || ctx.state.metadataFileSelection.size === ctx.state.files.length;
        if (allOn) {
            ctx.state.metadataFileSelection = new Set();
            ctx.state.metadataAllSelected = false;
        } else {
            ctx.state.metadataFileSelection = new Set(ctx.state.files);
            ctx.state.metadataAllSelected = true;
        }
    }

    function updateToggleAllButton(ctx) {
        const btn = document.getElementById('metadata-toggle-all');
        if (!btn) return;
        const allOn = ctx.state.metadataAllSelected || ctx.state.metadataFileSelection.size === ctx.state.files.length;
        btn.className = allOn ? 'renamer-badge renamer-badge-success renamer-badge-toggle' : 'renamer-badge renamer-badge-deselected renamer-badge-toggle';
        btn.textContent = allOn ? '✓' : '−';
        btn.title = allOn ? 'Désélectionner Tout' : 'Sélectionner Tout';
    }

    function hasChanges(ctx) {
        const overrides = ctx.state.manualOverrides;
        if (!overrides) return false;
        return Object.keys(overrides).some(function(path) {
            const changes = overrides[path];
            return changes && Object.keys(changes).length > 0;
        });
    }

    function updateApplyButtonState(ctx) {
        const applyBtn = document.getElementById('metadata-apply');
        if (!applyBtn) return;
        const enabled = hasChanges(ctx);
        applyBtn.disabled = !enabled;
        applyBtn.style.opacity = enabled ? '1' : '0.5';
        applyBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    function showEditor(ctx, path) {
        const existing = document.getElementById('metadata-editor-popup-' + path);
        if (existing) { existing.remove(); return; }

        const fileData = ctx.state.metadataFileData && ctx.state.metadataFileData[path];
        if (!fileData) {
            ctx.showToast('Données non disponibles pour ce fichier', 'error');
            return;
        }

        const meta = fileData.metadata || {};
        const overrides = ctx.state.manualOverrides[path] || {};
        const currentValues = {};
        const fieldKeys = ['artist', 'title', 'album', 'track', 'year', 'genre'];
        fieldKeys.forEach(function(key) {
            currentValues[key] = overrides[key] !== undefined ? overrides[key] : (meta[key] || '');
        });

        const row = document.querySelector('.metadata-preview-row[data-path="' + ctx.escapeHtml(path) + '"]');
        if (!row) return;

        const editor = document.createElement('div');
        editor.id = 'metadata-editor-popup-' + path;
        editor.className = 'metadata-editor-popup';
        editor.innerHTML = '<div style="font-weight:500;margin-bottom:8px;">' + ctx.escapeHtml(ctx.t('metadataManualEditTitle') || 'Éditer les métadonnées') + '</div>' +
            fieldKeys.map(function(key) {
                return '<div class="metadata-editor-row">' +
                    '<label>' + ctx.escapeHtml(key) + '</label>' +
                    '<input type="text" data-field="' + key + '" value="' + ctx.escapeHtml(currentValues[key]) + '" />' +
                    '<button class="metadata-copy-btn" data-field="' + key + '" data-value="' + ctx.escapeHtml(currentValues[key]) + '">' + ctx.escapeHtml(ctx.t('metadataCopyClipboard') || 'Copier') + '</button>' +
                '</div>';
            }).join('') +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">' +
                '<button class="renamer-btn" data-action="close-editor">' + ctx.escapeHtml(ctx.t('close') || 'Fermer') + '</button>' +
            '</div>';

        row.appendChild(editor);

        editor.querySelectorAll('.metadata-editor-row input').forEach(function(input) {
            input.addEventListener('input', function() {
                const field = this.dataset.field;
                const value = this.value;
                if (!ctx.state.manualOverrides[path]) ctx.state.manualOverrides[path] = {};
                ctx.state.manualOverrides[path][field] = value;
                updateApplyButtonState(ctx);
            });
        });

        editor.querySelectorAll('.metadata-copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const value = this.dataset.value;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(value).catch(function() {
                        fallbackCopy(ctx, value);
                    });
                } else {
                    fallbackCopy(ctx, value);
                }
            });
        });

        editor.querySelector('[data-action="close-editor"]').addEventListener('click', function() {
            editor.remove();
        });
    }

    function fallbackCopy(ctx, text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        ctx.showToast('Copié : ' + text, 'success');
    }

    function handleApply(ctx) {
        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const selectedFiles = ctx.state.files.filter(function(f) {
            if (!selectedSet) return true;
            return selectedSet.has(f);
        });

        if (!selectedFiles.length) {
            ctx.showToast(ctx.t('noFilesSelected') || 'Aucun fichier sélectionné', 'error');
            return;
        }

        const hasManualOverrides = Object.keys(ctx.state.manualOverrides).some(function(path) {
            return selectedFiles.indexOf(path) !== -1 && Object.keys(ctx.state.manualOverrides[path]).length > 0;
        });

        if (hasManualOverrides) {
            showConflictPopup(ctx, selectedFiles);
        } else {
            executeWrite(ctx, selectedFiles, 'overwrite');
        }
    }

    function showConflictPopup(ctx, selectedFiles) {
        const existing = document.getElementById('metadata-confirm-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'metadata-confirm-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<div class="renamer-header" style="padding:0;"><h3>' + ctx.escapeHtml(ctx.t('metadataApplyConfirmTitle') || 'Confirmer l\'application') + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;">Certains fichiers ont été modifiés manuellement. Que souhaitez-vous faire ?</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                '<button class="renamer-btn" data-action="cancel">' + ctx.escapeHtml(ctx.t('cancel') || 'Annuler') + '</button>' +
                '<button class="renamer-btn renamer-btn-primary" data-action="overwrite">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmOverwrite') || 'Écraser le renommage manuel') + '</button>' +
                '<button class="renamer-btn" data-action="ignore">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmIgnore') || 'Ignorer les fichiers modifiés manuellement') + '</button>' +
            '</div>' +
        '</div>';
        document.body.appendChild(overlay);

        const close = function() { overlay.remove(); };
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', function() { close(); });
        overlay.querySelector('[data-action="overwrite"]').addEventListener('click', function() {
            close();
            executeWrite(ctx, selectedFiles, 'overwrite');
        });
        overlay.querySelector('[data-action="ignore"]').addEventListener('click', function() {
            close();
            executeWrite(ctx, selectedFiles, 'ignore');
        });
    }

    function executeWrite(ctx, paths, conflictMode) {
        const modal = document.getElementById('renamer-modal');
        if (modal) {
            modal.classList.add('renamer-loading');
            const loader = document.createElement('div');
            loader.id = 'renamer-loader';
            loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:50;font-size:16px;font-weight:bold;color:var(--nc-blue);';
            loader.textContent = ctx.t('convertInProgress') || 'Application en cours...';
            modal.appendChild(loader);
        }

        const metadataRules = (ctx.state.metadataRules || []).filter(function(r) { return r.scope === 'metadata' && r.enabled; });

        const payload = {
            paths: paths,
            rules: metadataRules,
            manualOverrides: ctx.state.manualOverrides,
            conflictMode: conflictMode,
        };

        ctx.apiRequest(ctx.getBaseUrl() + '/api/metadata/write', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then(function(body) {
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }

            if (body && body.success) {
                ctx.state.manualOverrides = {};
                const updatedCount = (body.updated || []).length;
                const errorsCount = (body.errors || []).length;
                const skippedCount = (body.skipped || []).length;

                if (updatedCount > 0) {
                    ctx.showToast((ctx.t('metadataWriteSuccess') || 'Métadonnées mises à jour') + ' : ' + updatedCount, 'success');
                }
                if (errorsCount > 0) {
                    ctx.showToast((ctx.t('metadataWriteError') || 'Erreurs') + ' : ' + errorsCount + ' — ' + (body.errors || []).join(' ; '), 'error');
                }
                if (skippedCount > 0) {
                    ctx.showToast((ctx.t('metadataApplyConfirmIgnore') || 'Ignorés') + ' : ' + skippedCount, 'info');
                }

                renderPreview(ctx);
            } else {
                ctx.showToast('Erreur: ' + (body.error || 'Réponse inattendue'), 'error');
            }
        }).catch(function(err) {
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            ctx.showToast('Erreur: ' + err.message, 'error');
        });
    }

    function register() {
        if (typeof RenamerApp === 'undefined' || !RenamerApp.registerTab) {
            console.log('[MetadataTab] RenamerApp not ready, retrying...');
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', register);
            } else {
                setTimeout(register, 50);
            }
            return;
        }
        console.log('[MetadataTab] registering tab', TAB_ID);
        RenamerApp.registerTab(TAB_ID, {
            id: TAB_ID,
            labelKey: 'metadataTab',
            build: build,
            bind: bind,
            render: render,
        });
        console.log('[MetadataTab] tab registered, tabs:', Object.keys(RenamerApp.tabs || {}));
    }

    register();
})();
