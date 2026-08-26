const RenamerApp = (function() {
    'use strict';

    const state = {
        files: [],
        rules: [],
        isFullscreen: true,
        activeTab: 'advanced',
        isLoading: false,
    };

    function getBaseUrl() {
        return OC.generateUrl('/apps/renamer');
    }

    function escapeHtml(str) {
        return RenamerUtils.escapeHtml(str);
    }

    function ensureStyle() {
        if (document.getElementById('renamer-style')) return;
        const style = document.createElement('style');
        style.id = 'renamer-style';
        style.textContent = getStyles();
        document.head.appendChild(style);
    }

    function getStyles() {
        return `
            :root {
                --nc-blue: #0082c9;
                --nc-blue-hover: #00619a;
                --nc-orange: #f0a030;
                --nc-red: #e02020;
                --nc-green: #22c55e;
                --nc-bg: var(--color-main-background, #fff);
                --nc-text: var(--color-main-text, #000);
                --nc-border: var(--color-border, #ccc);
                --nc-radius: var(--border-radius-large, 8px);
                --nc-transition: all 300ms ease-in-out;
            }

            #renamer-overlay {
                position: fixed;
                inset: 0;
                z-index: 9000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.5);
                transition: opacity 300ms ease, visibility 300ms ease;
            }

            #renamer-overlay.collapsed {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            #renamer-modal {
                background: var(--nc-bg);
                color: var(--nc-text);
                border-radius: var(--nc-radius);
                box-shadow: 0 0 20px rgba(0,0,0,.3);
                transition: var(--nc-transition);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            #renamer-modal.fullscreen {
                width: 100vw;
                height: 100vh;
                max-width: none;
                max-height: none;
                border-radius: 0;
            }

            #renamer-modal.compact {
                width: 90vw;
                height: 90vh;
                max-width: 90vw;
                max-height: 90vh;
            }

            .renamer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                border-bottom: 1px solid var(--nc-border);
                transition: var(--nc-transition);
            }

            .renamer-header h3 {
                margin: 0;
                font-size: 18px;
            }

            .renamer-tabs {
                display: flex;
                gap: 4px;
                padding: 8px 16px;
                border-bottom: 1px solid var(--nc-border);
                transition: var(--nc-transition);
            }

            .renamer-tab {
                padding: 6px 12px;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: var(--nc-radius);
                transition: var(--nc-transition);
                font-size: 14px;
            }

            .renamer-tab:hover {
                background: rgba(0,130,201,0.1);
            }

            .renamer-tab.active {
                background: var(--nc-blue);
                color: #fff;
            }

            .renamer-content {
                flex: 1;
                display: flex;
                overflow: hidden;
                transition: var(--nc-transition);
            }

            .renamer-content.hidden {
                display: none;
            }

            .renamer-panel {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .renamer-files-bar {
                display: flex;
                gap: 8px;
                padding: 8px 16px;
                border-bottom: 1px solid var(--nc-border);
                overflow-x: auto;
                min-height: 48px;
                align-items: center;
                transition: var(--nc-transition);
            }

            .renamer-file-pill {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: 16px;
                font-size: 13px;
                cursor: grab;
                white-space: nowrap;
                transition: var(--nc-transition);
            }

            .renamer-file-pill:active {
                cursor: grabbing;
            }

            .renamer-file-pill.dragging {
                opacity: 0.5;
            }

            .renamer-main {
                display: flex;
                flex: 1;
                overflow: hidden;
                transition: var(--nc-transition);
            }

            .renamer-rules {
                flex: 1;
                display: flex;
                flex-direction: column;
                border-right: 1px solid var(--nc-border);
                overflow: hidden;
                min-width: 320px;
                transition: var(--nc-transition);
            }

            .renamer-rules-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                transition: var(--nc-transition);
            }

            .renamer-preview {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                min-width: 320px;
                transition: var(--nc-transition);
            }

            .renamer-preview-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 16px;
                border-bottom: 1px solid var(--nc-border);
                font-weight: bold;
                transition: var(--nc-transition);
            }

            .renamer-preview-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                transition: var(--nc-transition);
            }

            .renamer-rule-card {
                border-radius: var(--nc-radius);
                border-left: 4px solid var(--nc-blue);
                background: var(--nc-bg);
                padding: 12px;
                transition: var(--nc-transition);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .renamer-rule-card.type-search_replace {
                border-left-color: var(--nc-blue);
            }

            .renamer-rule-card.type-sequence {
                border-left-color: var(--nc-orange);
            }

            .renamer-rule-card.type-regex {
                border-left-color: var(--nc-red);
            }

            .renamer-rule-card.type-filetype {
                border-left-color: var(--nc-green);
            }

            .renamer-rule-card.disabled {
                opacity: 0.5;
                filter: grayscale(1);
            }

            .renamer-rule-header {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .renamer-rule-drag {
                cursor: grab;
                padding: 4px;
                opacity: 0.5;
                transition: var(--nc-transition);
            }

            .renamer-rule-drag:active {
                cursor: grabbing;
            }

            .renamer-rule-number {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                color: #fff;
                flex-shrink: 0;
                transition: var(--nc-transition);
            }

            .renamer-rule-name {
                flex: 1;
                font-weight: 500;
                font-size: 14px;
            }

            .renamer-rule-actions {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .renamer-btn-icon {
                width: 28px;
                height: 28px;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--nc-transition);
            }

            .renamer-btn-icon:hover {
                background: rgba(0,0,0,0.1);
            }

            .renamer-toggle {
                position: relative;
                width: 36px;
                height: 20px;
                background: #ccc;
                border-radius: 10px;
                cursor: pointer;
                transition: var(--nc-transition);
            }

            .renamer-toggle.on {
                background: var(--nc-blue);
            }

            .renamer-toggle-knob {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                background: #fff;
                border-radius: 50%;
                transition: var(--nc-transition);
            }

            .renamer-toggle.on .renamer-toggle-knob {
                left: 18px;
            }

            .renamer-add-btn {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                border: 3px solid var(--nc-blue);
                background: transparent;
                color: var(--nc-blue);
                font-size: 28px;
                cursor: pointer;
                transition: var(--nc-transition);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .renamer-add-btn:hover {
                background: var(--nc-blue);
                color: #fff;
            }

            .renamer-popup {
                position: absolute;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px;
                z-index: 100;
                min-width: 180px;
                transition: var(--nc-transition);
            }

            .renamer-popup-item {
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 4px;
                transition: var(--nc-transition);
                font-size: 14px;
            }

            .renamer-popup-item:hover {
                background: rgba(0,130,201,0.1);
            }

            .renamer-preview-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                border-radius: 4px;
                transition: var(--nc-transition);
            }

            .renamer-preview-row:hover {
                background: rgba(0,0,0,0.03);
            }

            .renamer-preview-from {
                flex: 1;
                font-size: 13px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .renamer-preview-arrow {
                color: var(--nc-blue);
                font-size: 16px;
            }

            .renamer-preview-to {
                flex: 1;
                font-size: 13px;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .renamer-btn {
                padding: 6px 12px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: var(--nc-transition);
            }

            .renamer-btn:hover {
                background: rgba(0,0,0,0.05);
            }

            .renamer-btn-primary {
                background: var(--nc-blue);
                color: #fff;
                border-color: var(--nc-blue);
            }

            .renamer-btn-primary:hover {
                background: var(--nc-blue-hover);
            }

            .renamer-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-bottom: 8px;
            }

            .renamer-field label {
                font-size: 12px;
                font-weight: 500;
                opacity: 0.8;
            }

            .renamer-field input,
            .renamer-field select {
                padding: 6px 8px;
                border: 1px solid var(--nc-border);
                border-radius: 4px;
                background: var(--nc-bg);
                color: var(--nc-text);
                font-size: 13px;
                transition: var(--nc-transition);
            }

            .renamer-field input:focus,
            .renamer-field select:focus {
                outline: none;
                border-color: var(--nc-blue);
            }

            .renamer-target-btns {
                display: flex;
                gap: 4px;
            }

            .renamer-target-btn {
                padding: 4px 8px;
                border: 1px solid var(--nc-border);
                background: transparent;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: var(--nc-transition);
            }

            .renamer-target-btn.active {
                background: var(--nc-blue);
                color: #fff;
                border-color: var(--nc-blue);
            }

            .renamer-menu-dropdown {
                position: absolute;
                right: 0;
                top: 100%;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 4px;
                min-width: 160px;
                z-index: 101;
                transition: var(--nc-transition);
            }

            .renamer-menu-item {
                padding: 6px 12px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                transition: var(--nc-transition);
            }

            .renamer-menu-item:hover {
                background: rgba(0,0,0,0.05);
            }

            .renamer-status {
                padding: 8px 12px;
                border-radius: 4px;
                margin: 8px 16px;
                font-size: 13px;
                transition: var(--nc-transition);
            }

            .renamer-status.success {
                background: #d4edda;
                color: #155724;
            }

            .renamer-status.error {
                background: #f8d7da;
                color: #721c24;
            }

            .renamer-diff-remove {
                background: #f8d7da;
                color: #721c24;
                text-decoration: line-through;
                padding: 2px 4px;
                border-radius: 3px;
            }

            .renamer-diff-add {
                background: #d4edda;
                color: #155724;
                padding: 2px 4px;
                border-radius: 3px;
                font-weight: bold;
            }

            .renamer-empty {
                padding: 24px;
                text-align: center;
                opacity: 0.6;
                font-size: 14px;
            }

            .renamer-footer {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid var(--nc-border);
                justify-content: flex-end;
                transition: var(--nc-transition);
            }
        `;
    }

    function openDialog(files) {
        ensureStyle();
        state.files = files || getSelectedFiles();
        state.rules = [];
        state.isFullscreen = true;
        state.activeTab = 'advanced';

        if (!state.files.length) {
            alert('Veuillez sélectionner un fichier ou un dossier.');
            return;
        }

        const existing = document.getElementById('renamer-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'renamer-overlay';
        overlay.innerHTML = buildModalHtml();
        document.body.appendChild(overlay);

        bindEvents();
        updatePreview();
    }

    function buildModalHtml() {
        return `
            <div id="renamer-modal" class="fullscreen">
                <div class="renamer-header">
                    <h3>Renamer</h3>
                    <button id="renamer-collapse-btn" class="renamer-btn-icon" title="Réduire">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 6l4 4 4-4"/></svg>
                    </button>
                </div>
                <div class="renamer-tabs">
                    <button class="renamer-tab active" data-tab="advanced">Advanced files & Folder renaming</button>
                    <button class="renamer-tab" data-tab="metadata">Files metadata renaming</button>
                </div>
                <div class="renamer-content" id="renamer-content">
                    ${buildAdvancedTab()}
                </div>
            </div>
        `;
    }

    function buildAdvancedTab() {
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-files-bar" id="renamer-files-bar"></div>
                <div class="renamer-main">
                    <div class="renamer-rules">
                        <div class="renamer-rules-list" id="renamer-rules-list"></div>
                        <div style="padding:12px;display:flex;justify-content:center;">
                            <button class="renamer-add-btn" id="renamer-add-btn" title="Ajouter une règle">+</button>
                        </div>
                    </div>
                    <div class="renamer-preview">
                        <div class="renamer-preview-header">
                            <span>Aperçu</span>
                            <select id="renamer-view-mode" style="font-size:12px;padding:2px 6px;">
                                <option value="flat">Flat</option>
                                <option value="folders">Folders</option>
                            </select>
                        </div>
                        <div class="renamer-preview-list" id="renamer-preview-list"></div>
                    </div>
                </div>
                <div class="renamer-footer">
                    <button class="renamer-btn" id="renamer-cancel">Annuler</button>
                    <button class="renamer-btn renamer-btn-primary" id="renamer-run">Renommer</button>
                </div>
            </div>
        `;
    }

    function getSelectedFiles() {
        const files = [];
        try {
            if (typeof OCA !== 'undefined' && OCA.Files && OCA.Files.fileActions) {
                const selected = OCA.Files.fileActions.getSelectedFiles();
                if (selected && selected.length) {
                    selected.forEach(function(f) {
                        if (f && f.path) files.push(f.path);
                    });
                }
            }
        } catch (e) {
            files.length = 0;
        }
        if (!files.length) {
            try {
                const fileList = document.querySelector('.files-list');
                if (fileList) {
                    const selected = fileList.querySelectorAll('.selected');
                    selected.forEach(function(el) {
                        const name = el.getAttribute('data-file');
                        if (name) files.push(name);
                    });
                }
            } catch (e) {
                files.length = 0;
            }
        }
        return files;
    }

    function renderFilesBar() {
        const bar = document.getElementById('renamer-files-bar');
        if (!bar) return;
        bar.innerHTML = '';
        state.files.forEach((f, idx) => {
            const pill = document.createElement('span');
            pill.className = 'renamer-file-pill';
            pill.draggable = true;
            pill.dataset.index = idx;
            pill.textContent = f.replace(/^.*\//, '');
            bar.appendChild(pill);
        });
    }

    function renderRules() {
        const list = document.getElementById('renamer-rules-list');
        if (!list) return;
        list.innerHTML = '';
        state.rules.forEach((rule, idx) => {
            const card = document.createElement('div');
            card.className = 'renamer-rule-card type-' + rule.mode + (rule.enabled ? '' : ' disabled');
            card.dataset.index = idx;
            card.innerHTML = buildRuleCardHtml(rule, idx);
            list.appendChild(card);
        });
    }

    function buildRuleCardHtml(rule, idx) {
        const num = idx + 1;
        const color = getRuleColor(rule.mode);
        return `
            <div class="renamer-rule-header">
                <span class="renamer-rule-drag" title="Déplacer">⋮⋮</span>
                <span class="renamer-rule-number" style="background:${color}">${num}</span>
                <span class="renamer-rule-name">${escapeHtml(rule.name)}</span>
                <div class="renamer-rule-actions">
                    <div class="renamer-toggle ${rule.enabled ? 'on' : ''}" data-index="${idx}" title="${rule.enabled ? 'On' : 'Off'}">
                        <div class="renamer-toggle-knob"></div>
                    </div>
                    <button class="renamer-btn-icon" data-action="duplicate" data-index="${idx}" title="Dupliquer">
                        <svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M2 4h8v8H2zm2 2v4h4V6zm10-2h-8v8h8zm-2 2v4h-4V6z"/></svg>
                    </button>
                    <button class="renamer-btn-icon" data-action="delete" data-index="${idx}" title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                    <button class="renamer-btn-icon" data-action="menu" data-index="${idx}" title="Plus">
                        <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
                    </button>
                </div>
            </div>
            ${buildRuleBody(rule, idx)}
        `;
    }

    function getRuleColor(mode) {
        switch (mode) {
            case 'search_replace': return 'var(--nc-blue)';
            case 'sequence': return 'var(--nc-orange)';
            case 'regex': return 'var(--nc-red)';
            case 'filetype': return 'var(--nc-green)';
            default: return 'var(--nc-blue)';
        }
    }

    function buildRuleBody(rule, idx) {
        if (rule.mode === 'search_replace') {
            return `
                <div class="renamer-field">
                    <label>Chercher</label>
                    <input type="text" data-field="pattern" data-index="${idx}" value="${escapeHtml(rule.pattern || '')}" />
                </div>
                <div class="renamer-field">
                    <label>Remplacer par</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-target-btns">
                    <button class="renamer-target-btn ${rule.target === 'full' ? 'active' : ''}" data-target="full" data-index="${idx}">Nom complet</button>
                    <button class="renamer-target-btn ${rule.target === 'name' ? 'active' : ''}" data-target="name" data-index="${idx}">Nom sans ext</button>
                    <button class="renamer-target-btn ${rule.target === 'extension' ? 'active' : ''}" data-target="extension" data-index="${idx}">Extension</button>
                </div>
            `;
        } else if (rule.mode === 'sequence') {
            return `
                <div class="renamer-field">
                    <label>Type</label>
                    <select data-field="sequenceType" data-index="${idx}">
                        <option value="numeric" ${rule.sequenceType === 'numeric' ? 'selected' : ''}>Numérique</option>
                        <option value="alphabetic" ${rule.sequenceType === 'alphabetic' ? 'selected' : ''}>Alphabétique</option>
                        <option value="roman" ${rule.sequenceType === 'roman' ? 'selected' : ''}>Romain</option>
                    </select>
                </div>
                <div class="renamer-field">
                    <label>Début</label>
                    <input type="number" data-field="startValue" data-index="${idx}" value="${rule.startValue || 1}" />
                </div>
                <div class="renamer-field">
                    <label>Séparateur</label>
                    <input type="text" data-field="incSep" data-index="${idx}" value="${escapeHtml(rule.incSep || ' - ')}" />
                </div>
                <div class="renamer-target-btns">
                    <button class="renamer-target-btn ${rule.target === 'full' ? 'active' : ''}" data-target="full" data-index="${idx}">Nom complet</button>
                    <button class="renamer-target-btn ${rule.target === 'name' ? 'active' : ''}" data-target="name" data-index="${idx}">Nom sans ext</button>
                    <button class="renamer-target-btn ${rule.target === 'extension' ? 'active' : ''}" data-target="extension" data-index="${idx}">Extension</button>
                </div>
            `;
        } else if (rule.mode === 'regex') {
            return `
                <div class="renamer-field">
                    <label>Motif</label>
                    <input type="text" data-field="pattern" data-index="${idx}" value="${escapeHtml(rule.pattern || '')}" />
                </div>
                <div class="renamer-field">
                    <label>Remplacement</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-target-btns">
                    <button class="renamer-target-btn ${rule.target === 'full' ? 'active' : ''}" data-target="full" data-index="${idx}">Nom complet</button>
                    <button class="renamer-target-btn ${rule.target === 'name' ? 'active' : ''}" data-target="name" data-index="${idx}">Nom sans ext</button>
                    <button class="renamer-target-btn ${rule.target === 'extension' ? 'active' : ''}" data-target="extension" data-index="${idx}">Extension</button>
                </div>
            `;
        } else if (rule.mode === 'filetype') {
            const exts = RenamerUtils.getUniqueExtensions(state.files);
            const selected = (rule.extensions || []).map(e => e.toLowerCase());
            return `
                <div class="renamer-field">
                    <label>Types de fichiers</label>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${exts.map(ext => `
                            <span class="renamer-file-pill ${selected.includes(ext.toLowerCase()) ? 'active' : ''}" data-ext="${ext}" data-index="${idx}" style="cursor:pointer;">
                                ${escapeHtml(ext)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="renamer-field">
                    <label>Mode</label>
                    <select data-field="filterMode" data-index="${idx}">
                        <option value="ignored" ${rule.filterMode === 'ignored' ? 'selected' : ''}>Ignored</option>
                        <option value="only" ${rule.filterMode === 'only' ? 'selected' : ''}>Only</option>
                    </select>
                </div>
            `;
        }
        return '';
    }

    function updatePreview() {
        const list = document.getElementById('renamer-preview-list');
        if (!list) return;
        list.innerHTML = '';

        const preview = RenamerUtils.computePreview(state.files, state.rules);
        preview.forEach(item => {
            const row = document.createElement('div');
            row.className = 'renamer-preview-row';
            const fromBase = item.from.replace(/^.*\//, '');
            const toBase = item.to.replace(/^.*\//, '');
            row.innerHTML = `
                <span class="renamer-preview-from">${escapeHtml(fromBase)}</span>
                <span class="renamer-preview-arrow">→</span>
                <span class="renamer-preview-to">${escapeHtml(toBase)}</span>
            `;
            list.appendChild(row);
        });
    }

    function bindEvents() {
        const modal = document.getElementById('renamer-modal');
        const collapseBtn = document.getElementById('renamer-collapse-btn');
        if (collapseBtn && modal) {
            collapseBtn.addEventListener('click', function() {
                if (modal.classList.contains('fullscreen')) {
                    modal.classList.remove('fullscreen');
                    modal.classList.add('compact');
                    collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 6l4 4 4-4"/></svg>';
                    collapseBtn.title = 'Agrandir';
                } else {
                    modal.classList.remove('compact');
                    modal.classList.add('fullscreen');
                    collapseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 6l4 4 4-4"/></svg>';
                    collapseBtn.title = 'Réduire';
                }
            });
        }

        document.querySelectorAll('.renamer-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.renamer-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                state.activeTab = this.dataset.tab;
                const content = document.getElementById('renamer-content');
                if (content) {
                    content.innerHTML = state.activeTab === 'advanced' ? buildAdvancedTab() : '<div class="renamer-empty">Metadata renaming - coming soon</div>';
                    bindEvents();
                    renderFilesBar();
                    renderRules();
                    updatePreview();
                }
            });
        });

        const addBtn = document.getElementById('renamer-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                let popup = document.getElementById('renamer-add-popup');
                if (popup) { popup.remove(); return; }
                popup = document.createElement('div');
                popup.id = 'renamer-add-popup';
                popup.className = 'renamer-popup';
                popup.innerHTML = `
                    <div class="renamer-popup-item" data-type="search_replace">Search & Replace</div>
                    <div class="renamer-popup-item" data-type="sequence">Séquence</div>
                    <div class="renamer-popup-item" data-type="regex">Regex</div>
                    <div class="renamer-popup-item" data-type="filetype">File Type Filter</div>
                `;
                addBtn.parentElement.appendChild(popup);
                popup.querySelectorAll('.renamer-popup-item').forEach(item => {
                    item.addEventListener('click', function() {
                        addRule(this.dataset.type);
                        popup.remove();
                    });
                });
            });
        }

        document.addEventListener('click', function(e) {
            const popup = document.getElementById('renamer-add-popup');
            if (popup && !popup.contains(e.target) && e.target !== addBtn) {
                popup.remove();
            }
        });

        const rulesList = document.getElementById('renamer-rules-list');
        if (rulesList) {
            rulesList.addEventListener('click', function(e) {
                const target = e.target.closest('[data-action]');
                if (target) {
                    const action = target.dataset.action;
                    const index = parseInt(target.dataset.index, 10);
                    if (action === 'delete') deleteRule(index);
                    else if (action === 'duplicate') duplicateRule(index);
                    else if (action === 'menu') toggleMenu(index, target);
                }
            });

            rulesList.addEventListener('input', function(e) {
                const input = e.target.closest('input[data-field]');
                if (input) {
                    const index = parseInt(input.dataset.index, 10);
                    const field = input.dataset.field;
                    if (state.rules[index]) {
                        state.rules[index][field] = input.value;
                        updatePreview();
                    }
                }
            });

            rulesList.addEventListener('change', function(e) {
                const select = e.target.closest('select[data-field]');
                if (select) {
                    const index = parseInt(select.dataset.index, 10);
                    const field = select.dataset.field;
                    if (state.rules[index]) {
                        state.rules[index][field] = select.value;
                        updatePreview();
                    }
                }
            });

            rulesList.addEventListener('click', function(e) {
                const toggle = e.target.closest('.renamer-toggle');
                if (toggle) {
                    const index = parseInt(toggle.dataset.index, 10);
                    if (state.rules[index]) {
                        state.rules[index].enabled = !state.rules[index].enabled;
                        renderRules();
                        updatePreview();
                    }
                }

                const targetBtn = e.target.closest('.renamer-target-btn');
                if (targetBtn) {
                    const index = parseInt(targetBtn.dataset.index, 10);
                    const target = targetBtn.dataset.target;
                    if (state.rules[index]) {
                        state.rules[index].target = target;
                        renderRules();
                        updatePreview();
                    }
                }

                const extPill = e.target.closest('.renamer-file-pill[data-ext]');
                if (extPill) {
                    const index = parseInt(extPill.dataset.index, 10);
                    const ext = extPill.dataset.ext;
                    if (state.rules[index] && state.rules[index].mode === 'filetype') {
                        if (!state.rules[index].extensions) state.rules[index].extensions = [];
                        const pos = state.rules[index].extensions.indexOf(ext);
                        if (pos >= 0) {
                            state.rules[index].extensions.splice(pos, 1);
                        } else {
                            state.rules[index].extensions.push(ext);
                        }
                        renderRules();
                        updatePreview();
                    }
                }
            });
        }

        const cancelBtn = document.getElementById('renamer-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeDialog);
        }

        const runBtn = document.getElementById('renamer-run');
        if (runBtn) {
            runBtn.addEventListener('click', runRename);
        }
    }

    function addRule(type) {
        const rule = {
            id: Date.now() + Math.random(),
            type: type,
            mode: type === 'search_replace' ? 'replace' : type,
            name: type === 'search_replace' ? 'Search & Replace' : type === 'sequence' ? 'Séquence' : type === 'regex' ? 'Regex' : 'File Type Filter',
            enabled: true,
            target: 'full',
            pattern: '',
            replacement: '',
            sequenceType: 'numeric',
            startValue: 1,
            zeroPadding: 0,
            incSep: ' - ',
            filterMode: 'ignored',
            extensions: [],
        };
        state.rules.push(rule);
        renderRules();
        updatePreview();
    }

    function deleteRule(index) {
        state.rules.splice(index, 1);
        renderRules();
        updatePreview();
    }

    function duplicateRule(index) {
        const original = state.rules[index];
        if (!original) return;
        const copy = JSON.parse(JSON.stringify(original));
        copy.id = Date.now() + Math.random();
        copy.name = original.name + ' (copie)';
        state.rules.splice(index + 1, 0, copy);
        renderRules();
        updatePreview();
    }

    function toggleMenu(index, button) {
        let menu = document.getElementById('renamer-menu-' + index);
        if (menu) { menu.remove(); return; }
        document.querySelectorAll('[id^="renamer-menu-"]').forEach(m => m.remove());
        menu = document.createElement('div');
        menu.id = 'renamer-menu-' + index;
        menu.className = 'renamer-menu-dropdown';
        menu.innerHTML = `
            <div class="renamer-menu-item" data-action="save">Sauvegarder</div>
            <div class="renamer-menu-item" data-action="duplicate">Dupliquer</div>
            <div class="renamer-menu-item" data-action="delete">Supprimer</div>
            <div class="renamer-menu-item" data-action="toggle">${state.rules[index].enabled ? 'Désactiver' : 'Activer'}</div>
        `;
        button.parentElement.appendChild(menu);
        menu.querySelectorAll('.renamer-menu-item').forEach(item => {
            item.addEventListener('click', function() {
                const action = this.dataset.action;
                if (action === 'save') saveRule(index);
                else if (action === 'duplicate') duplicateRule(index);
                else if (action === 'delete') deleteRule(index);
                else if (action === 'toggle') {
                    state.rules[index].enabled = !state.rules[index].enabled;
                    renderRules();
                    updatePreview();
                }
                menu.remove();
            });
        });
    }

    function saveRule(index) {
        const rule = state.rules[index];
        if (!rule) return;
        const payload = {
            name: rule.name,
            mode: rule.mode,
            pattern: rule.pattern || '',
            replacement: rule.replacement || '',
        };
        fetch(getBaseUrl() + '/api/rules', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(r => r.json()).then(data => {
            if (data.id) {
                alert('Règle sauvegardée');
            } else {
                alert('Erreur: ' + (data.error || 'Réponse inattendue'));
            }
        }).catch(() => alert('Erreur réseau'));
    }

    function runRename() {
        const payload = {
            paths: state.files,
            rules: state.rules,
        };
        fetch(getBaseUrl() + '/rename', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(r => r.json()).then(body => {
            const status = document.getElementById('renamer-status') || buildStatusElement();
            if (body && body.success) {
                status.textContent = 'Renommage terminé. Renommés : ' + (body.renamed || []).length;
                status.className = 'renamer-status success';
            } else {
                status.textContent = 'Erreur: ' + (body.error || 'Réponse inattendue');
                status.className = 'renamer-status error';
            }
        }).catch(err => {
            const status = document.getElementById('renamer-status') || buildStatusElement();
            status.textContent = 'Erreur: ' + err.message;
            status.className = 'renamer-status error';
        });
    }

    function buildStatusElement() {
        const el = document.createElement('div');
        el.id = 'renamer-status';
        el.className = 'renamer-status';
        el.style.display = 'none';
        const modal = document.getElementById('renamer-modal');
        if (modal && modal.firstElementChild) {
            modal.insertBefore(el, modal.firstElementChild.nextSibling);
        }
        return el;
    }

    function closeDialog() {
        const overlay = document.getElementById('renamer-overlay');
        if (overlay) overlay.remove();
    }

    function init() {
        if (typeof OC === 'undefined' || !OC.Files) return;
        try {
            OC.Files.fileActions.registerAction({
                name: 'rename-auto',
                displayName: 'Rename Auto',
                mimeType: 'all',
                permissions: OC.PERMISSION_UPDATE || 16,
                actionHandler: function() { openDialog(); }
            });
        } catch (e) {
            console.warn('[Renamer] registerAction failed', e);
        }
        window._nc_fileactions = window._nc_fileactions || [];
        if (!window._nc_fileactions.some(function(a) { return a && a.id === 'rename-auto'; })) {
            window._nc_fileactions.push({
                id: 'rename-auto',
                displayName: 'Rename Auto',
                mimeType: 'all',
                permissions: (typeof OC !== 'undefined' && OC.PERMISSION_UPDATE) ? OC.PERMISSION_UPDATE : 16,
                actionHandler: function() { openDialog(); },
                order: 100
            });
        }
    }

    if (typeof OC !== 'undefined' && OC.Files && OC.Files.fileActions) {
        try { init(); } catch (e) { console.warn('[Renamer] registerAction failed', e); }
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }

    return { openDialog };
})();
