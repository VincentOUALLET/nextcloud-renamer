const RenamerApp = (function() {
    'use strict';

    const state = {
        files: [],
        rules: [],
        isFullscreen: true,
        activeTab: 'advanced',
        isLoading: false,
        lang: 'fr',
    };

    const translations = {
        fr: {
            appName: 'Renamer',
            advancedTab: 'Renommage avancé de fichiers et dossiers',
            metadataTab: 'Renommage par métadonnées',
            close: 'Fermer',
            reduce: 'Réduire',
            expand: 'Agrandir',
            cancel: 'Annuler',
            rename: 'Renommer',
            preview: 'Aperçu',
            flat: 'Vue plate',
            folders: 'Dossiers',
            searchReplace: 'Chercher et Remplacer',
            sequence: 'Séquence',
            regex: 'Regex',
            fileTypeFilter: 'Filtrer par type de fichier',
            truncate: 'Tronquer',
            addText: 'Ajouter texte',
            basicRules: 'Règles basiques',
            search: 'Chercher',
            replaceBy: 'Remplacer par',
            fullName: 'Nom complet',
            nameOnly: 'Nom sans ext',
            extension: 'Extension',
            type: 'Type',
            start: 'Début',
            separator: 'Séparateur',
            numeric: 'Numérique',
            alphabetic: 'Alphabétique',
            roman: 'Romain',
            pattern: 'Motif',
            replacement: 'Remplacement',
            mode: 'Mode',
            ignored: 'Ignoré',
            only: 'Uniquement',
            lengthToKeep: 'Longueur à conserver',
            direction: 'Direction',
            fromStart: 'Depuis le début',
            fromEnd: 'Depuis la fin',
            textToAdd: 'Texte à ajouter',
            position: 'Position',
            startPos: 'Début',
            end: 'Fin',
            atPosition: 'Position',
            charCount: 'Nombre de caractères',
            transformation: 'Transformation',
            lowercase: 'Minuscule',
            uppercase: 'Majuscule',
            capitalize: 'Première lettre majuscule',
            capitalizeWords: 'Première lettre de chaque mot',
            save: 'Sauvegarder',
            duplicate: 'Dupliquer',
            delete: 'Supprimer',
            disable: 'Désactiver',
            enable: 'Activer',
            renameRule: 'Renommer la règle',
            ruleName: 'Nom de la règle',
            loading: 'Renommage en cours...',
            noChanges: 'Aucun renommage à effectuer.',
            renameComplete: 'Renommage terminé',
            renamed: 'Renommés',
            skipped: 'Ignorés',
            errors: 'Erreurs',
            reload: 'Recharger la page',
            closeRenamer: 'Fermer Renamer',
            dragToReorder: 'Déplacer',
            fileTypes: 'Types de fichiers',
            scope: 'Portée',
        },
        en: {
            appName: 'Renamer',
            advancedTab: 'Advanced files & Folder renaming',
            metadataTab: 'Files metadata renaming',
            close: 'Close',
            reduce: 'Reduce',
            expand: 'Expand',
            cancel: 'Cancel',
            rename: 'Rename',
            preview: 'Preview',
            flat: 'Flat',
            folders: 'Folders',
            searchReplace: 'Search & Replace',
            sequence: 'Sequence',
            regex: 'Regex',
            fileTypeFilter: 'File Type Filter',
            truncate: 'Truncate',
            addText: 'Add text',
            basicRules: 'Basic rules',
            search: 'Search',
            replaceBy: 'Replace by',
            fullName: 'Full name',
            nameOnly: 'Name only',
            extension: 'Extension',
            type: 'Type',
            start: 'Start',
            separator: 'Separator',
            numeric: 'Numeric',
            alphabetic: 'Alphabetic',
            roman: 'Roman',
            pattern: 'Pattern',
            replacement: 'Replacement',
            mode: 'Mode',
            ignored: 'Ignored',
            only: 'Only',
            lengthToKeep: 'Length to keep',
            direction: 'Direction',
            fromStart: 'From start',
            fromEnd: 'From end',
            textToAdd: 'Text to add',
            position: 'Position',
            startPos: 'Start',
            end: 'End',
            atPosition: 'Position',
            charCount: 'Character count',
            transformation: 'Transformation',
            lowercase: 'Lowercase',
            uppercase: 'Uppercase',
            capitalize: 'Capitalize first letter',
            capitalizeWords: 'Capitalize each word',
            save: 'Save',
            duplicate: 'Duplicate',
            delete: 'Delete',
            disable: 'Disable',
            enable: 'Enable',
            renameRule: 'Rename rule',
            ruleName: 'Rule name',
            loading: 'Renaming in progress...',
            noChanges: 'No changes to apply.',
            renameComplete: 'Rename complete',
            renamed: 'Renamed',
            skipped: 'Skipped',
            errors: 'Errors',
            reload: 'Reload page',
            closeRenamer: 'Close Renamer',
            dragToReorder: 'Drag to reorder',
            fileTypes: 'File types',
            scope: 'Scope',
        }
    };

    function getBaseUrl() {
        if (typeof OC !== 'undefined' && OC.generateUrl) {
            return OC.generateUrl('/apps/renamer');
        }
        return '/apps/renamer';
    }

    function t(key) {
        const lang = state.lang || 'fr';
        return (translations[lang] && translations[lang][key]) || key;
    }

    function toggleLanguage() {
        state.lang = state.lang === 'fr' ? 'en' : 'fr';
        const langBtn = document.getElementById('renamer-lang-btn');
        if (langBtn) {
            langBtn.textContent = state.lang === 'fr' ? 'FR' : 'EN';
            langBtn.title = state.lang === 'fr' ? 'English' : 'Français';
        }
        renderRules();
        updatePreview();
        const tabs = document.querySelectorAll('.renamer-tab');
        if (tabs[0]) tabs[0].textContent = t('advancedTab');
        if (tabs[1]) tabs[1].textContent = t('metadataTab');
        const headerTitle = document.querySelector('.renamer-header h3');
        if (headerTitle) headerTitle.textContent = t('appName');
        const previewHeader = document.querySelector('.renamer-preview-header span');
        if (previewHeader) previewHeader.textContent = t('preview');
        const cancelBtn = document.getElementById('renamer-cancel');
        if (cancelBtn) cancelBtn.textContent = t('cancel');
        const runBtn = document.getElementById('renamer-run');
        if (runBtn) runBtn.textContent = t('rename');
        const collapseBtn = document.getElementById('renamer-collapse-btn');
        if (collapseBtn) collapseBtn.title = state.isFullscreen ? t('reduce') : t('expand');
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
                background: rgba(0,130,201,0.04);
                border: 1px solid rgba(0,0,0,0.08);
                padding: 12px;
                transition: var(--nc-transition);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .renamer-rule-card.type-search_replace {
                border-left-color: var(--nc-blue);
                background: rgba(0,130,201,0.04);
            }

            .renamer-rule-card.type-sequence {
                border-left-color: var(--nc-orange);
                background: rgba(240,160,48,0.06);
            }

            .renamer-rule-card.type-regex {
                border-left-color: var(--nc-red);
                background: rgba(224,32,32,0.04);
            }

            .renamer-rule-card.type-filetype {
                border-left-color: var(--nc-green);
                background: rgba(34,197,94,0.04);
            }

            .renamer-rule-card.type-truncate {
                border-left-color: #6366f1;
                background: rgba(99,102,241,0.06);
            }

            .renamer-rule-card.type-add_text {
                border-left-color: #ec4899;
                background: rgba(236,72,153,0.06);
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
                position: relative;
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

            .renamer-target-select {
                padding: 4px 8px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: 4px;
                font-size: 12px;
                transition: var(--nc-transition);
                width: 100%;
                padding-right: 32px;
                appearance: none;
                -webkit-appearance: none;
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
        let paths = [];
        if (Array.isArray(files)) {
            paths = files.map(function(f) {
                if (typeof f === 'string') return f;
                if (f && typeof f === 'object' && f.path) return f.path;
                return '';
            }).filter(function(p) { return p; });
        }
        state.files = paths.length ? paths : getSelectedFiles();
        state.rules = [];
        state.isFullscreen = true;
        state.activeTab = 'advanced';

        if (!state.files.length) {
            alert(t('noChanges'));
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
                    <h3>${t('appName')}</h3>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button id="renamer-lang-btn" class="renamer-btn-icon" title="${state.lang === 'fr' ? 'English' : 'Français'}">${state.lang === 'fr' ? 'FR' : 'EN'}</button>
                        <button id="renamer-collapse-btn" class="renamer-btn-icon" title="${t('reduce')}">
                            <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" id="resize"><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="7.82 38.2 25.82 38.2 25.82 56.13"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M25.81,38.2l-24,24"></path><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="56.19 25.8 38.17 25.8 38.17 7.88"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M38.18,25.81l24-24"></path></svg>
                        </button>
                        <button id="renamer-close-btn" class="renamer-btn-icon" title="${t('close')}">
                            <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="renamer-tabs">
                    <button class="renamer-tab active" data-tab="advanced">${t('advancedTab')}</button>
                    <button class="renamer-tab" data-tab="metadata">${t('metadataTab')}</button>
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
                <div class="renamer-main">
                    <div class="renamer-rules">
                        <div class="renamer-rules-list" id="renamer-rules-list"></div>
                        <div style="padding:12px;display:flex;justify-content:center;">
                            <button class="renamer-add-btn" id="renamer-add-btn" title="${t('addText')}">+</button>
                        </div>
                    </div>
                    <div class="renamer-preview">
                        <div class="renamer-preview-header">
                            <span>${t('preview')}</span>
                            <div class="renamer-select-wrapper" style="width:auto;">
                                <select id="renamer-view-mode" style="font-size:12px;padding:2px 6px;padding-right:32px;appearance:none;-webkit-appearance:none;">
                                    <option value="flat">${t('flat')}</option>
                                    <option value="folders">${t('folders')}</option>
                                </select>
                            </div>
                        </div>
                        <div class="renamer-preview-list" id="renamer-preview-list"></div>
                    </div>
                </div>
                <div class="renamer-footer">
                    <button class="renamer-btn" id="renamer-save-plan">${t('save')}</button>
                    <button class="renamer-btn" id="renamer-cancel">${t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" id="renamer-run">${t('rename')}</button>
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

    function renderRules() {
        const list = document.getElementById('renamer-rules-list');
        if (!list) return;
        list.innerHTML = '';
        state.rules.forEach((rule, idx) => {
            const card = document.createElement('div');
            card.className = 'renamer-rule-card type-' + rule.mode + (rule.enabled ? '' : ' disabled');
            card.dataset.index = idx;
            card.draggable = true;
            card.innerHTML = buildRuleCardHtml(rule, idx);
            list.appendChild(card);
        });
    }

    function buildRuleCardHtml(rule, idx) {
        const num = idx + 1;
        const color = getRuleColor(rule.mode);
        return `
            <div class="renamer-rule-header">
                <span class="renamer-rule-drag" title="${t('dragToReorder')}">⋮⋮</span>
                <span class="renamer-rule-number" style="background:${color}">${num}</span>
                <span class="renamer-rule-name">${escapeHtml(rule.name)}</span>
                <div class="renamer-rule-actions">
                    <div class="renamer-toggle ${rule.enabled ? 'on' : ''}" data-index="${idx}" title="${rule.enabled ? 'On' : 'Off'}">
                        <div class="renamer-toggle-knob"></div>
                    </div>
                    <button class="renamer-btn-icon" data-action="duplicate" data-index="${idx}" title="${t('duplicate')}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                    </button>
                    <button class="renamer-btn-icon" data-action="delete" data-index="${idx}" title="${t('delete')}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button class="renamer-btn-icon" data-action="settings" data-index="${idx}" title="${t('save')}">
                        <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
                    </button>
                </div>
            </div>
            <div class="renamer-rule-body">
                ${buildRuleBody(rule, idx)}
            </div>
        `;
    }

    function getRuleColor(mode) {
        switch (mode) {
            case 'search_replace': return 'var(--nc-blue)';
            case 'sequence': return 'var(--nc-orange)';
            case 'regex': return 'var(--nc-red)';
            case 'filetype': return 'var(--nc-green)';
            case 'truncate': return '#6366f1';
            case 'add_text': return '#ec4899';
            default: return 'var(--nc-blue)';
        }
    }

    function buildRuleBody(rule, idx) {
        if (rule.mode === 'search_replace') {
            return `
                <div class="renamer-field">
                    <label>${t('search')}</label>
                    <input type="text" data-field="pattern" data-index="${idx}" value="${escapeHtml(rule.pattern || '')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('replaceBy')}</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''}>${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''}>${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''}>${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'sequence') {
            return `
                <div class="renamer-field">
                    <label>${t('type')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="sequenceType" data-index="${idx}">
                        <option value="numeric" ${rule.sequenceType === 'numeric' ? 'selected' : ''}>${t('numeric')}</option>
                        <option value="alphabetic" ${rule.sequenceType === 'alphabetic' ? 'selected' : ''}>${t('alphabetic')}</option>
                        <option value="roman" ${rule.sequenceType === 'roman' ? 'selected' : ''}>${t('roman')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field">
                    <label>${t('start')}</label>
                    <input type="number" data-field="startValue" data-index="${idx}" value="${rule.startValue || 1}" />
                </div>
                <div class="renamer-field">
                    <label>${t('separator')}</label>
                    <input type="text" data-field="incSep" data-index="${idx}" value="${escapeHtml(rule.incSep || ' - ')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''}>${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''}>${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''}>${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'regex') {
            return `
                <div class="renamer-field">
                    <label>${t('pattern')}</label>
                    <input type="text" data-field="pattern" data-index="${idx}" value="${escapeHtml(rule.pattern || '')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('replacement')}</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''}>${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''}>${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''}>${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'filetype') {
            const exts = RenamerUtils.getUniqueExtensions(state.files);
            const selected = (rule.extensions || []).map(e => e.toLowerCase());
            return `
                <div class="renamer-field">
                    <label>${t('fileTypes')}</label>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${exts.map(ext => `
                            <span class="renamer-file-pill ${selected.includes(ext.toLowerCase()) ? 'active' : ''}" data-ext="${ext}" data-index="${idx}" style="cursor:pointer;">
                                ${escapeHtml(ext)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="renamer-field">
                    <label>${t('mode')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="filterMode" data-index="${idx}">
                        <option value="ignored" ${rule.filterMode === 'ignored' ? 'selected' : ''}>${t('ignored')}</option>
                        <option value="only" ${rule.filterMode === 'only' ? 'selected' : ''}>${t('only')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'truncate') {
            return `
                <div class="renamer-field">
                    <label>${t('lengthToKeep')}</label>
                    <input type="number" data-field="truncateLength" data-index="${idx}" value="${rule.truncateLength || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label>${t('direction')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="truncateDirection" data-index="${idx}">
                        <option value="end" ${rule.truncateDirection === 'end' ? 'selected' : ''}>${t('fromEnd')}</option>
                        <option value="start" ${rule.truncateDirection === 'start' ? 'selected' : ''}>${t('fromStart')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''}>${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''}>${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''}>${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'basic') {
            return `
                <div class="renamer-field">
                    <label>${t('transformation')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="basicSubType" data-index="${idx}">
                        <option value="lowercase" ${rule.basicSubType === 'lowercase' ? 'selected' : ''}>${t('lowercase')}</option>
                        <option value="uppercase" ${rule.basicSubType === 'uppercase' ? 'selected' : ''}>${t('uppercase')}</option>
                        <option value="capitalize" ${rule.basicSubType === 'capitalize' ? 'selected' : ''}>${t('capitalize')}</option>
                        <option value="capitalize_words" ${rule.basicSubType === 'capitalize_words' ? 'selected' : ''}>${t('capitalizeWords')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''}>${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''}>${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''}>${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'add_text') {
            return `
                <div class="renamer-field">
                    <label>${t('textToAdd')}</label>
                    <input type="text" data-field="insertText" data-index="${idx}" value="${escapeHtml(rule.insertText || '')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('position')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="insertPosition" data-index="${idx}">
                        <option value="start" ${rule.insertPosition === 'start' ? 'selected' : ''}>${t('startPos')}</option>
                        <option value="end" ${rule.insertPosition === 'end' ? 'selected' : ''}>${t('end')}</option>
                        <option value="position" ${rule.insertPosition === 'position' ? 'selected' : ''}>${t('atPosition')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field" id="insert-at-${idx}" style="display:${rule.insertPosition === 'position' ? 'block' : 'none'};">
                    <label>${t('charCount')}</label>
                    <input type="number" data-field="insertAt" data-index="${idx}" value="${rule.insertAt || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''}>${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''}>${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''}>${t('extension')}</option>
                    </select>
                </div>
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
        preview.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'renamer-preview-row';
            row.draggable = true;
            row.dataset.index = idx;
            const fromBase = item.from.replace(/^.*\//, '');
            const toBase = item.to.replace(/^.*\//, '');
            const statusBadge = item.changed
                ? '<span class="renamer-badge renamer-badge-success" title="Renommage applicable">✓</span>'
                : '<span class="renamer-badge renamer-badge-neutral" title="Aucun changement">i</span>';
            row.innerHTML = `
                <span class="renamer-preview-from">${item.fromDiff || escapeHtml(fromBase)}</span>
                <span class="renamer-preview-arrow">→</span>
                <span class="renamer-preview-to">${item.toDiff || escapeHtml(toBase)}</span>
                ${statusBadge}
            `;
            list.appendChild(row);
        });

        let previewDragIdx = null;
        let previewDragEl = null;
        list.addEventListener('dragstart', function(e) {
            const row = e.target.closest('.renamer-preview-row');
            if (!row) return;
            previewDragIdx = parseInt(row.dataset.index, 10);
            previewDragEl = row;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', previewDragIdx);
        });
        list.addEventListener('dragend', function(e) {
            const row = e.target.closest('.renamer-preview-row');
            if (row) row.classList.remove('dragging');
            list.querySelectorAll('.renamer-preview-row').forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            previewDragIdx = null;
            previewDragEl = null;
        });
        list.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (previewDragIdx === null) return;
            const row = e.target.closest('.renamer-preview-row');
            if (!row || parseInt(row.dataset.index, 10) === previewDragIdx) return;
            const rect = row.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            list.querySelectorAll('.renamer-preview-row').forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            if (e.clientY < mid) {
                row.classList.add('drag-over-top');
            } else {
                row.classList.add('drag-over-bottom');
            }
        });
        list.addEventListener('dragleave', function(e) {
            const row = e.target.closest('.renamer-preview-row');
            if (row) {
                row.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });
        list.addEventListener('drop', function(e) {
            e.preventDefault();
            list.querySelectorAll('.renamer-preview-row').forEach(r => {
                r.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            if (previewDragIdx === null) return;
            const row = e.target.closest('.renamer-preview-row');
            if (!row) return;
            const targetIdx = parseInt(row.dataset.index, 10);
            if (targetIdx < 0 || targetIdx === previewDragIdx) return;
            const rect = row.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            const insertBefore = e.clientY < mid;
            const fileItem = state.files.splice(previewDragIdx, 1)[0];
            const newTargetIdx = insertBefore ? (targetIdx > previewDragIdx ? targetIdx - 1 : targetIdx) : (targetIdx > previewDragIdx ? targetIdx : targetIdx + 1);
            state.files.splice(newTargetIdx, 0, fileItem);
            setTimeout(function() {
                updatePreview();
            }, 150);
            previewDragIdx = null;
            previewDragEl = null;
        });
    }

     function bindEvents() {
        const modal = document.getElementById('renamer-modal');
        const collapseBtn = document.getElementById('renamer-collapse-btn');
        const closeBtn = document.getElementById('renamer-close-btn');
        const overlay = document.getElementById('renamer-overlay');
        const langBtn = document.getElementById('renamer-lang-btn');
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', function() {
                closeDialog();
            });
        }
        
        if (overlay && modal) {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    closeDialog();
                }
            });
        }
        
        if (langBtn) {
            langBtn.addEventListener('click', function() {
                toggleLanguage();
            });
        }
        
        if (collapseBtn && modal) {
            collapseBtn.addEventListener('click', function() {
                if (modal.classList.contains('fullscreen')) {
                    modal.classList.remove('fullscreen');
                    modal.style.width = '90vw';
                    modal.style.height = '90vh';
                    modal.style.maxWidth = '90vw';
                    modal.style.maxHeight = '90vh';
                    collapseBtn.innerHTML = '<svg height=16 width=16 xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" id="resize"><g id="Outline"><path fill="currentColor" d="M4,21c-0.256,0-0.512-0.098-0.707-0.293c-0.391-0.391-0.391-1.023,0-1.414l16-16    c0.391-0.391,1.023-0.391,1.414,0s0.391,1.023,0,1.414l-16,16C4.512,20.902,4.256,21,4,21z"></path><path fill="currentColor" d="M20,21c-0.256,0-0.512-0.098-0.707-0.293l-16-16c-0.391-0.391-1.023-0.391-1.414,0s-0.391,1.023,0,1.414l16,16    c0.391,0.391,0.391,1.023,0,1.414C20.512,20.902,20.256,21,20,21z"></path><path fill="currentColor" d="M20 21h-5c-.552 0-1-.447-1-1s.448-1 1-1h4v-4c0-.553.448-1 1-1s1 .447 1 1v5C21 20.553 20.552 21 20 21zM9 21H4c-.552 0-1-.447-1-1v-5c0-.553.448-1 1-1s1 .447 1 1v4h4c.552 0 1 .447 1 1S9.552 21 9 21zM4 10c-.552 0-1-.447-1-1V4c0-.553.448-1 1-1h5c.552 0 1 .447 1 1S9.552 5 9 5H5v4C5 9.553 4.552 10 4 10zM20 10c-.552 0-1-.447-1-1V5h-4c-.552 0-1-.447-1-1s.448-1 1-1h5c.552 0 1 .447 1 1v5C21 9.553 20.552 10 20 10z"></path></g></svg>';
                    collapseBtn.title = 'Agrandir';
                } else {
                    modal.classList.add('fullscreen');
                    modal.style.width = '100vw';
                    modal.style.height = '100vh';
                    modal.style.maxWidth = '100vw';
                    modal.style.maxHeight = '100vh';
                    collapseBtn.innerHTML = '<svg height=16 width=16 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" id="resize"><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="7.82 38.2 25.82 38.2 25.82 56.13"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M25.81,38.2l-24,24"></path><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="56.19 25.8 38.17 25.8 38.17 7.88"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M38.18,25.81l24-24"></path></svg>';
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
                popup.style.bottom = '100%';
                popup.style.left = '50%';
                popup.style.transform = 'translateX(-50%)';
                popup.style.marginBottom = '8px';
                popup.style.minWidth = '200px';
                popup.innerHTML = `
                    <div class="renamer-popup-item" data-type="search_replace">${t('searchReplace')}</div>
                    <div class="renamer-popup-item" data-type="sequence">${t('sequence')}</div>
                    <div class="renamer-popup-item" data-type="regex">${t('regex')}</div>
                    <div class="renamer-popup-item" data-type="filetype">${t('fileTypeFilter')}</div>
                    <div class="renamer-popup-item" data-type="truncate">${t('truncate')}</div>
                    <div class="renamer-popup-item" data-type="add_text">${t('addText')}</div>
                    <div class="renamer-popup-item" data-type="basic">${t('basicRules')}</div>
                `;
                addBtn.parentElement.style.position = 'relative';
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
                    else if (action === 'settings') toggleMenu(index, target);
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
                        if (field === 'insertPosition') {
                            const insertAtEl = document.getElementById('insert-at-' + index);
                            if (insertAtEl) {
                                insertAtEl.style.display = select.value === 'position' ? 'block' : 'none';
                            }
                        }
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

                const targetSelect = e.target.closest('.renamer-target-select');
                if (targetSelect) {
                    const index = parseInt(targetSelect.dataset.index, 10);
                    const target = targetSelect.value;
                    if (state.rules[index]) {
                        state.rules[index].target = target;
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

            let draggedIndex = null;
            rulesList.addEventListener('dragstart', function(e) {
                const card = e.target.closest('.renamer-rule-card');
                if (!card) return;
                draggedIndex = parseInt(card.dataset.index, 10);
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            rulesList.addEventListener('dragend', function(e) {
                const card = e.target.closest('.renamer-rule-card');
                if (card) card.classList.remove('dragging');
                rulesList.querySelectorAll('.renamer-rule-card').forEach(c => c.style.borderTop = '');
                draggedIndex = null;
            });

            rulesList.addEventListener('dragover', function(e) {
                e.preventDefault();
                const card = e.target.closest('.renamer-rule-card');
                if (card && draggedIndex !== null) {
                    const targetIndex = parseInt(card.dataset.index, 10);
                    rulesList.querySelectorAll('.renamer-rule-card').forEach(c => c.style.borderTop = '');
                    if (targetIndex !== draggedIndex) {
                        card.style.borderTop = '2px solid var(--nc-blue)';
                    }
                }
            });

            rulesList.addEventListener('drop', function(e) {
                e.preventDefault();
                const card = e.target.closest('.renamer-rule-card');
                rulesList.querySelectorAll('.renamer-rule-card').forEach(c => c.style.borderTop = '');
                if (draggedIndex === null) return;
                const targetIndex = card ? parseInt(card.dataset.index, 10) : -1;
                if (targetIndex >= 0 && targetIndex !== draggedIndex) {
                    const item = state.rules.splice(draggedIndex, 1)[0];
                    state.rules.splice(targetIndex, 0, item);
                    renderRules();
                    updatePreview();
                }
                draggedIndex = null;
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

        const savePlanBtn = document.getElementById('renamer-save-plan');
        if (savePlanBtn) {
            savePlanBtn.addEventListener('click', savePlan);
        }
    }

    function savePlan() {
        const payload = {
            rules: state.rules.map(r => ({
                name: r.name,
                mode: r.mode,
                enabled: r.enabled,
                target: r.target,
                pattern: r.pattern,
                replacement: r.replacement,
                sequenceType: r.sequenceType,
                startValue: r.startValue,
                zeroPadding: r.zeroPadding,
                incSep: r.incSep,
                filterMode: r.filterMode,
                extensions: r.extensions,
                insertText: r.insertText,
                insertPosition: r.insertPosition,
                insertAt: r.insertAt,
                truncateLength: r.truncateLength,
                truncateDirection: r.truncateDirection,
                basicSubType: r.basicSubType
            }))
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'renamer-plan.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function addRule(type) {
        const rule = {
            id: Date.now() + Math.random(),
            type: type,
            mode: type,
            name: type === 'search_replace' ? t('searchReplace') : type === 'sequence' ? t('sequence') : type === 'regex' ? t('regex') : type === 'filetype' ? t('fileTypeFilter') : type === 'truncate' ? t('truncate') : type === 'add_text' ? t('addText') : type === 'basic' ? t('basicRules') : t('ruleName'),
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
            insertText: '',
            insertPosition: 'start',
            insertAt: 0,
            truncateLength: 0,
            truncateDirection: 'end',
            basicSubType: 'capitalize',
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
            <div class="renamer-menu-item" data-action="save">${t('save')}</div>
            <div class="renamer-menu-item" data-action="toggle">${state.rules[index].enabled ? t('disable') : t('enable')}</div>
            <div class="renamer-menu-item" data-action="duplicate">${t('duplicate')}</div>
            <div class="renamer-menu-item" data-action="delete">${t('delete')}</div>
        `;
        button.parentElement.appendChild(menu);
        menu.querySelectorAll('.renamer-menu-item').forEach(item => {
            item.addEventListener('click', function() {
                const action = this.dataset.action;
                if (action === 'save') saveRule(index);
                else if (action === 'toggle') {
                    state.rules[index].enabled = !state.rules[index].enabled;
                    renderRules();
                    updatePreview();
                } else if (action === 'duplicate') duplicateRule(index);
                else if (action === 'delete') deleteRule(index);
                menu.remove();
            });
        });
    }

    function startInlineRename(index) {
        const card = document.querySelector(`.renamer-rule-card[data-index="${index}"]`);
        if (!card) return;
        const nameEl = card.querySelector('.renamer-rule-name');
        if (!nameEl) return;
        const currentName = state.rules[index]?.name || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'renamer-inline-rename';
        input.style.cssText = 'width:100%;padding:4px 8px;font-size:13px;border:1px solid var(--nc-blue);border-radius:4px;outline:none;';
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
            const newName = input.value.trim() || currentName;
            state.rules[index].name = newName;
            renderRules();
            updatePreview();
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            else if (e.key === 'Escape') { state.rules[index].name = currentName; renderRules(); updatePreview(); }
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
        const preview = RenamerUtils.computePreview(state.files, state.rules);
        const renames = preview
            .filter(item => item.changed && !item.skipped)
            .map(item => ({ from: item.from, to: item.to }));

        if (!renames.length) {
            alert('Aucun renommage à effectuer.');
            return;
        }

        const modal = document.getElementById('renamer-modal');
        if (modal) {
            modal.classList.add('renamer-loading');
            const loader = document.createElement('div');
            loader.id = 'renamer-loader';
            loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:50;font-size:16px;font-weight:bold;color:var(--nc-blue);';
            loader.textContent = 'Renommage en cours...';
            modal.appendChild(loader);
        }

        const payload = {
            paths: state.files,
            rules: state.rules,
            renames: renames,
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
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            if (body && body.success) {
                showRenameSuccessPopup(body);
            } else {
                const status = document.getElementById('renamer-status') || buildStatusElement();
                status.textContent = 'Erreur: ' + (body.error || 'Réponse inattendue');
                status.className = 'renamer-status error';
            }
        }).catch(err => {
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            const status = document.getElementById('renamer-status') || buildStatusElement();
            status.textContent = 'Erreur: ' + err.message;
            status.className = 'renamer-status error';
        });
    }

    function showRenameSuccessPopup(body) {
        const overlay = document.createElement('div');
        overlay.id = 'renamer-success-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);transition:opacity 300ms ease,visibility 300ms ease;';
        const popup = document.createElement('div');
        popup.style.cssText = 'background:var(--color-main-background,#fff);color:var(--color-main-text,#000);border-radius:var(--border-radius-large,8px);padding:24px;box-shadow:0 0 20px rgba(0,0,0,.3);max-width:400px;width:90%;text-align:center;transition:all 300ms ease-in-out;';
        const renamed = (body.renamed || []).length;
        const skipped = (body.skipped || []).length;
        const errors = (body.errors || []).length;
        popup.innerHTML = `
            <h3 style="margin-top:0;font-size:18px;">${t('renameComplete')}</h3>
            <p style="font-size:14px;margin:12px 0;">
                ${t('renamed')} : <strong>${renamed}</strong><br>
                ${skipped ? t('skipped') + ' : <strong>' + skipped + '</strong><br>' : ''}
                ${errors ? t('errors') + ' : <strong>' + errors + '</strong>' : ''}
            </p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                <button id="renamer-reload-btn" class="renamer-btn renamer-btn-primary">${t('reload')}</button>
                <button id="renamer-success-close-btn" class="renamer-btn">${t('closeRenamer')}</button>
            </div>
        `;
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        document.getElementById('renamer-reload-btn').addEventListener('click', function() {
            window.location.reload();
        });
        document.getElementById('renamer-success-close-btn').addEventListener('click', function() {
            overlay.remove();
            closeDialog();
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
        // Action registration is handled by rename.js to avoid duplicates
        // This init only ensures the app is ready for use
    }

    if (typeof OC !== 'undefined' && OC.Files && OC.Files.fileActions) {
        try { init(); } catch (e) { console.warn('[Renamer] init failed', e); }
    }

    return { openDialog };
})();
