(function() {
    'use strict';

    console.log('[MetadataTab] module loaded');
    const TAB_ID = 'metadata';

    const METADATA_FIELDS = ['artist', 'title', 'album', 'track', 'year', 'genre'];
    const EDIT_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"></path></svg>';

    function ensureStyle() {
        const existing = document.getElementById('metadata-style');
        if (existing) {
            existing.textContent = getStyles();
            return;
        }
        const style = document.createElement('style');
        style.id = 'metadata-style';
        style.textContent = getStyles();
        document.head.appendChild(style);
    }

    function getStyles() {
        return `
            .metadata-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 13px;
            }
            .metadata-table thead th {
                text-align: left;
                padding: 8px 12px;
                background: var(--nc-bg-hover);
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid var(--nc-border);
            }
            .metadata-table tbody td {
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                box-shadow: inset 0 1px 0 0 var(--nc-border);
            }
            .metadata-row-even {
                background-color: var(--nc-bg);
            }
            .metadata-row-odd {
                background-color: var(--nc-background-default);
            }
            .metadata-col-file {
                display: flex;
                align-items: center;
                font-weight: 500;
                text-align: left;
            }
            .metadata-pencil-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                opacity: 0.4;
                padding: 4px 6px;
                margin-left: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.15s;
            }
            .metadata-pencil-btn:hover {
                opacity: 1;
            }
            .metadata-preview-row-unhandled {
                opacity: 0.6;
            }
            .metadata-unhandled-badge {
                background: var(--nc-border);
                color: var(--nc-text);
                padding: 2px 8px;
                border-radius: var(--nc-border-radius);
                font-size: 11px;
            }
            .metadata-table-container {
                overflow-y: auto;
                flex: 1;
            }
            .renamer-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px;
            }
            .renamer-btn {
                padding: 8px 16px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: var(--nc-border-radius);
                cursor: pointer;
            }
            .renamer-btn-primary {
                background: var(--nc-button-primary);
                color: var(--nc-button-primary-text);
                border-color: var(--nc-button-primary);
            }
            .renamer-btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .metadata-editable-cell {
                cursor: pointer;
            }
            .metadata-editable-cell:hover .metadata-pencil-btn {
                opacity: 1;
            }
        `;
    }

    function build(ctx) {
        console.log('[MetadataTab] build() called');
        ensureStyle();
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-main">
                    <div class="metadata-preview">
                        <div class="renamer-preview-header">
                            <span>${ctx.t('metadataPreview')}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button type="button" id="metadata-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="Désélectionner Tout">✓</button>
                            </div>
                        </div>
                        <div class="metadata-table-container" id="metadata-preview-list"></div>
                    </div>
                </div>
                <div class="renamer-footer">
                    <button class="renamer-btn" id="metadata-cancel">${ctx.t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" id="metadata-apply" disabled>${ctx.t('metadataApply')}</button>
                </div>
            </div>
        `;
    }

    function bind(ctx) {
        console.log('[MetadataTab] bind() called');

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

    function render(ctx) {
        console.log('[MetadataTab] render() called');
        if (ctx.state.metadataFileSelection && ctx.state.metadataFileSelection.size === 0) {
            const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
            const audioFiles = ctx.state.files.filter(function(f) {
                const ext = f.replace(/^.*\./, '').toLowerCase();
                return audioExtensions.indexOf(ext) !== -1;
            });
            ctx.state.metadataFileSelection = new Set(audioFiles);
            ctx.state.metadataAllSelected = true;
        }
        renderPreview(ctx);
    }

    function renderPreview(ctx) {
        const list = document.getElementById('metadata-preview-list');
        if (!list) return;
        list.innerHTML = '<div style="padding:16px;text-align:center;opacity:0.6;">Chargement...</div>';

        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const selectedFiles = ctx.state.files.filter(function(f) {
            if (!selectedSet) return true;
            return selectedSet.has(f);
        });

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

            let tableHtml = '<table class="metadata-table"><thead><tr><th class="metadata-col-file">' + ctx.escapeHtml(ctx.t('metadataPreview')) + '</th>';
            METADATA_FIELDS.forEach(function(field) {
                tableHtml += '<th>' + ctx.escapeHtml(ctx.t('metadata' + field.charAt(0).toUpperCase() + field.slice(1))) + '</th>';
            });
            tableHtml += '</tr></thead><tbody>';

            files.forEach(function(fileData, rowIndex) {
                const isUnhandled = !fileData.readable && !fileData.writable;
                const hasError = !!fileData.error;
                const meta = fileData.metadata || {};
                const baseName = fileData.path.replace(/^.*\//, '');

                const rowParity = rowIndex % 2 === 0 ? 'metadata-row-even' : 'metadata-row-odd';
                tableHtml += '<tr class="metadata-preview-row ' + rowParity + '" data-path="' + ctx.escapeHtml(fileData.path) + '">';

                tableHtml += '<td class="metadata-col-file">';
                if (fileData.writable) {
                    const isSelected = ctx.state.metadataFileSelection.has(fileData.path) || ctx.state.metadataAllSelected;
                    const badgeClass = isSelected ? 'renamer-badge renamer-badge-success renamer-badge-toggle metadata-row-toggle' : 'renamer-badge renamer-badge-deselected renamer-badge-toggle metadata-row-toggle';
                    const badgeContent = isSelected ? '✓' : '−';
                    tableHtml += '<button type="button" class="' + badgeClass + '" data-path="' + ctx.escapeHtml(fileData.path) + '" title="Sélectionner/Désélectionner" draggable="false" style="margin-right:8px;">' + badgeContent + '</button>';
                }
                tableHtml += ctx.escapeHtml(baseName);
                tableHtml += '</td>';

                METADATA_FIELDS.forEach(function(field) {
                    let value = meta[field] || '';
                    let displayHtml = value ? ctx.escapeHtml(value) : '<span style="opacity:0.4;">—</span>';

                    if (isUnhandled) {
                        displayHtml = '<span class="metadata-unhandled-badge">' + ctx.escapeHtml(ctx.t('metadataUnsupportedType') || 'Non supporté') + '</span>';
                    } else if (hasError) {
                        displayHtml = '<span style="color:var(--nc-red);">' + ctx.escapeHtml(fileData.error) + '</span>';
                    }

                    const isEditable = fileData.writable && !isUnhandled;
                    const pencil = isEditable ?
                        '<button class="metadata-pencil-btn" data-path="' + ctx.escapeHtml(fileData.path) + '" data-field="' + field + '" title="Modifier" draggable="false">' + EDIT_ICON_SVG + '</button>' : '';

                    const tdClass = isEditable ? 'metadata-col-' + field + ' metadata-editable-cell' : 'metadata-col-' + field;

                    tableHtml += '<td class="' + tdClass + '" data-selectable="' + (isEditable ? 'true' : 'false') + '">' + displayHtml + pencil + '</td>';
                });

                tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            list.innerHTML = tableHtml;

            updateToggleAllButton(ctx);
            updateApplyButtonState(ctx);
            bindTableEvents(ctx, list);
        }).catch(function(err) {
            list.innerHTML = '<div class="renamer-empty">' + ctx.escapeHtml(err.message || 'Erreur réseau') + '</div>';
        });
    }

    function bindTableEvents(ctx, list) {
        list.querySelectorAll('.metadata-pencil-btn').forEach(function(btn) {
            if (btn._metadataBound) return;
            btn._metadataBound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const path = this.dataset.path;
                const field = this.dataset.field;
                showEditPopup(ctx, [path], field);
            });
        });

        list.querySelectorAll('.metadata-row-toggle').forEach(function(btn) {
            if (btn._metadataBound) return;
            btn._metadataBound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const path = this.dataset.path;
                if (ctx.state.metadataFileSelection.has(path)) {
                    ctx.state.metadataFileSelection.delete(path);
                    ctx.state.metadataAllSelected = false;
                    this.className = 'renamer-badge renamer-badge-deselected renamer-badge-toggle metadata-row-toggle';
                    this.textContent = '−';
                    this.title = 'Sélectionner';
                } else {
                    ctx.state.metadataFileSelection.add(path);
                    this.className = 'renamer-badge renamer-badge-success renamer-badge-toggle metadata-row-toggle';
                    this.textContent = '✓';
                    this.title = 'Désélectionner';
                }
                updateToggleAllButton(ctx);
            });
        });

        list.querySelectorAll('td[data-selectable="true"]').forEach(function(cell) {
            if (cell._metadataBound) return;
            cell._metadataBound = true;
            cell.addEventListener('click', function(e) {
                if (e.target.classList.contains('metadata-pencil-btn')) return;
                const row = this.closest('tr');
                const path = row.dataset.path;
                const fieldMatch = this.className.match(/metadata-col-(\w+)/);
                if (!fieldMatch) return;
                const field = fieldMatch[1];
                showEditPopup(ctx, [path], field);
            });
        });
    }

    function showEditPopup(ctx, paths, field) {
        const existing = document.getElementById('metadata-edit-popup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'metadata-edit-popup';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';

        const fieldLabel = ctx.t('metadata' + field.charAt(0).toUpperCase() + field.slice(1));
        const currentValues = paths.map(function(p) {
            const data = ctx.state.metadataFileData && ctx.state.metadataFileData[p];
            return data && data.metadata ? (data.metadata[field] || '') : '';
        });

        const selectedSet = ctx.state.metadataAllSelected ? null : ctx.state.metadataFileSelection;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const allSelected = ctx.state.metadataAllSelected ? ctx.state.files : Array.from(ctx.state.metadataFileSelection);
        const selectedAudio = allSelected.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        const showApplyAll = paths.length === 1 && selectedAudio.length > 1;
        const applyAllBtn = showApplyAll ?
            '<button class="renamer-btn renamer-btn-primary" id="metadata-apply-all-col" style="margin-left:auto;">' + ctx.escapeHtml('Appliquer à toute la colonne') + '</button>' : '';

        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-border-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3>' + ctx.escapeHtml(ctx.t('metadataManualEditTitle') || 'Modifier') + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;">Appliquer cette valeur à <strong>' + paths.length + ' fichier(s)</strong> pour le champ <strong>' + ctx.escapeHtml(fieldLabel) + '</strong> :</div>' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<label style="min-width:80px;font-weight:500;text-align:right;">' + ctx.escapeHtml(fieldLabel) + '</label>' +
                '<input type="text" id="metadata-edit-input" value="' + ctx.escapeHtml(currentValues[0] || '') + '" style="flex:1;padding:6px 10px;border:1px solid var(--nc-border);border-radius:var(--nc-border-radius);background:var(--nc-bg);color:var(--nc-text);" />' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                '<button class="renamer-btn" data-action="cancel-edit">' + ctx.escapeHtml(ctx.t('cancel') || 'Annuler') + '</button>' +
                applyAllBtn +
                '<button class="renamer-btn renamer-btn-primary" data-action="save-edit">' + ctx.escapeHtml(ctx.t('metadataApply') || 'Appliquer') + '</button>' +
            '</div>' +
        '</div></div>';

        document.body.appendChild(overlay);

        overlay.querySelector('[data-action="cancel-edit"]').addEventListener('click', function() {
            overlay.remove();
        });

        overlay.querySelector('[data-action="save-edit"]').addEventListener('click', function() {
            const input = overlay.querySelector('#metadata-edit-input');
            const newValue = input.value;
            paths.forEach(function(p) {
                if (!ctx.state.manualOverrides[p]) ctx.state.manualOverrides[p] = {};
                ctx.state.manualOverrides[p][field] = newValue;
            });
            overlay.remove();
            renderPreview(ctx);
        });

        const applyAllBtnEl = overlay.querySelector('#metadata-apply-all-col');
        if (applyAllBtnEl) {
            applyAllBtnEl.addEventListener('click', function() {
                const input = overlay.querySelector('#metadata-edit-input');
                const newValue = input.value;
                selectedAudio.forEach(function(p) {
                    if (!ctx.state.manualOverrides[p]) ctx.state.manualOverrides[p] = {};
                    ctx.state.manualOverrides[p][field] = newValue;
                });
                overlay.remove();
                renderPreview(ctx);
            });
        }
    }

    function toggleSelection(ctx) {
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = ctx.state.files.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });

        if (ctx.state.metadataAllSelected) {
            ctx.state.metadataFileSelection = new Set();
            ctx.state.metadataAllSelected = false;
        } else {
            ctx.state.metadataFileSelection = new Set(audioFiles);
            ctx.state.metadataAllSelected = true;
        }
    }

    function updateToggleAllButton(ctx) {
        const btn = document.getElementById('metadata-toggle-all');
        if (!btn) return;
        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const audioFiles = ctx.state.files.filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
        });
        const allOn = ctx.state.metadataAllSelected || ctx.state.metadataFileSelection.size >= audioFiles.length;
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

    function handleApply(ctx) {
        if (!hasChanges(ctx)) {
            return;
        }

        const audioExtensions = ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'];
        const selectedFiles = (ctx.state.metadataAllSelected ? ctx.state.files : Array.from(ctx.state.metadataFileSelection)).filter(function(f) {
            const ext = f.replace(/^.*\./, '').toLowerCase();
            return audioExtensions.indexOf(ext) !== -1;
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
        overlay.innerHTML = '<div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-border-radius);padding:20px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">' +
            '<div class="renamer-header" style="padding:0;padding-bottom:4px;"><h3>' + ctx.escapeHtml(ctx.t('metadataApplyConfirmTitle') || 'Confirmer l\'application') + '</h3></div>' +
            '<div style="font-size:14px;color:var(--nc-text);line-height:1.4;">Certains fichiers ont été modifiés manuellement. Que souhaitez-vous faire ?</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">' +
                '<button class="renamer-btn" data-action="cancel">' + ctx.escapeHtml(ctx.t('cancel') || 'Annuler') + '</button>' +
                '<button class="renamer-btn renamer-btn-primary" data-action="overwrite">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmOverwrite') || 'Écraser le renommage manuel') + '</button>' +
                '<button class="renamer-btn" data-action="ignore">' + ctx.escapeHtml(ctx.t('metadataApplyConfirmIgnore') || 'Ignorer les fichiers modifiés manuellement') + '</button>' +
            '</div>' +
        '</div></div>';
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