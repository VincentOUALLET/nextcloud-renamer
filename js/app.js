const RenamerApp = (function() {
    'use strict';

    const state = {
        files: [],
        rules: [],
        isFullscreen: true,
        activeTab: 'advanced',
        isLoading: false,
        lang: 'fr',
        currentPlan: null,
        fileSelection: new Set(),
        allSelected: true,
    };

    const presetRules = [
        { name: 'Supprimer l\'extension', pattern: '\\.[^.]+$', replacement: '', translationKey: 'presetRemoveExtension' },
        { name: 'Supprimer le texte entre crochets', pattern: '\\s*\\[[^\\]]*\\]', replacement: '', translationKey: 'presetRemoveBrackets' },
        { name: 'Supprimer le texte entre parenthèses', pattern: '\\s*\\([^)]*\\)', replacement: '', translationKey: 'presetRemoveParentheses' },
        { name: 'Supprimer le numéro au début', pattern: '^\\d+\\s*[-._]?\\s*', replacement: '', translationKey: 'presetRemoveLeadingNumber' },
        { name: 'Remplacer les underscores par des espaces', pattern: '_+', replacement: ' ', translationKey: 'presetReplaceUnderscores' },
        { name: 'Remplacer les points par des espaces', pattern: '(?<!^)(?=\\.)|\\.(?![^.]+$)', replacement: ' ', translationKey: 'presetReplaceDots' },
        { name: 'Supprimer les espaces multiples', pattern: '\\s{2,}', replacement: ' ', translationKey: 'presetRemoveMultipleSpaces' },
        { name: 'Supprimer tout après un tiret', pattern: '\\s*[-–—]\\s*.*$', replacement: '', translationKey: 'presetRemoveAfterDash' },
        { name: 'Supprimer l\'année', pattern: '\\s*[\\[(]?(?:19|20)\\d{2}[\\])]?', replacement: '', translationKey: 'presetRemoveYear' },
        { name: 'Supprimer les informations de qualité vidéo', pattern: '\\s*(?:2160p|1080p|720p|480p|4K|HDR|WEB-DL|WEBRip|BluRay|BDRip|HDTV|DVDRip)\\b.*$', replacement: '', translationKey: 'presetRemoveQuality' },
        { name: 'Supprimer le numéro de saison et épisode', pattern: '\\bS\\d{1,2}E\\d{1,2}\\b', replacement: ' ', translationKey: 'presetRemoveSeasonEpisode' },
        { name: 'Supprimer la saison', pattern: '\\bS(?:eason)?\\s*0*\\d+\\b', replacement: ' ', translationKey: 'presetRemoveSeason' },
        { name: 'Supprimer les informations de langue', pattern: '\\s*\\b(?:VF|VFF|VO|VOSTFR|FR|EN|FRENCH|ENGLISH)\\b\\s*', replacement: ' ', translationKey: 'presetRemoveLanguage' },
        { name: 'Supprimer les espaces en début et fin', pattern: '^\\s+|\\s+$', replacement: '', translationKey: 'presetTrimSpaces' },
        { name: 'Remplacer plusieurs séparateurs par un espace', pattern: '[._-]+', replacement: ' ', translationKey: 'presetReplaceSeparators' }
    ];

    const translations = {
        fr: {
            appName: 'Renamer',
            advancedTab: 'Renommage avancé de fichiers et dossiers',
            metadataTab: 'Renommage par métadonnées',
            pdfTab: 'Manipulation PDF',
            convertPdfToCbz: 'Convertir PDF en CBZ 1 par 1',
            noPdfSelected: 'Aucun fichier PDF sélectionné',
            pdfConvertComplete: 'Conversion PDF → CBZ terminée',
            pdfConverted: 'Convertis',
            pdfSkipped: 'Ignorés',
            pdfErrors: 'Erreurs',
            convertInProgress: 'Conversion en cours...',
            pdfConvertDescription: 'Rasterise chaque page en PNG et assemble en CBZ (compatible Kavita).',
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
            zeroPadding: 'Zero padding',
            separator: 'Séparateur',
            numeric: 'Numérique',
            alphabetic: 'Alphabétique',
            roman: 'Romain',
            pattern: 'Motif',
            replacement: 'Remplacement',
            mode: 'Mode',
            ignored: 'Ignoré',
            only: 'Uniquement',
            filtered: 'filtré',
            filteredByTypeRule: 'Filtré par la règle de filtrage par type de fichiers',
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
            on: 'ON',
            off: 'OFF',
            caseSensitive: 'Prendre en compte la casse',
            caseInsensitive: 'Ignorer la casse',
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
            applyAnother: 'Appliquer d\'autres actions',
            dragToReorder: 'Déplacer',
            fileTypes: 'Types de fichiers',
            scope: 'Portée',
            importRule: 'Importer une règle',
            exportRule: 'Exporter la règle',
            loadSavedRule: 'Charger une règle sauvegardée',
            ruleSaved: 'Règle sauvegardée',
            ruleUpdated: 'Règle mise à jour',
            ruleRenamed: 'Règle renommée',
            ruleDeleted: 'Règle supprimée',
            translationSaved: 'Traduction enregistrée',
            noSavedRules: 'Aucune règle sauvegardée',
            noTranslations: 'Aucune traduction',
            ruleLoaded: 'Règle chargée',
            saveRuleTitle: 'Sauvegarder la règle',
            resaveRule: 'Re-sauvegarder la règle',
            overwrite: 'Écraser l\'ancienne',
            createNew: 'Créer nouvelle',
            settings: 'Paramètres',
            manageSavedRules: 'Règles sauvegardées',
            manageTranslations: 'Traductions',
            confirmDelete: 'Supprimer cette règle ?',
            confirm: 'Confirmer',
            networkError: 'Erreur réseau',
            deleteError: 'Erreur lors de la suppression',
            rename: 'Renommer',
            load: 'Charger',
            loadPlan: 'Charger un plan',
            savePlan: 'Sauvegarder le plan',
            planName: 'Nom du plan',
            planSaved: 'Plan sauvegardé',
            planLoaded: 'Plan chargé',
            planDeleted: 'Plan supprimé',
            noPlanLoaded: 'Aucun plan chargé',
            noPlanLoadedTitle: 'Nouveau plan',
            noPlans: 'Aucun plan sauvegardé',
            currentPlan: 'Plan courant',
            currentPlanLabel: 'Plan courant',
            newPlanLabel: 'Nouveau plan',
            newPlan: 'Nouveau plan',
            overwritePlan: 'Écraser plan existant',
            confirmDeletePlan: 'Supprimer ce plan ?',
            saveError: 'Erreur lors de la sauvegarde',
            loadError: 'Erreur de chargement',
            invalidPlan: 'Plan invalide',
            noRulesToSave: 'Aucune règle à sauvegarder',
            back: 'Retour',
            loading: 'Chargement',
            presetRemoveExtension: 'Supprimer l\'extension',
            presetRemoveBrackets: 'Supprimer le texte entre crochets',
            presetRemoveParentheses: 'Supprimer le texte entre parenthèses',
            presetRemoveLeadingNumber: 'Supprimer le numéro au début',
            presetReplaceUnderscores: 'Remplacer les underscores par des espaces',
            presetReplaceDots: 'Remplacer les points par des espaces',
            presetRemoveMultipleSpaces: 'Supprimer les espaces multiples',
            presetRemoveAfterDash: 'Supprimer tout après un tiret',
            presetRemoveYear: 'Supprimer l\'année',
            presetRemoveQuality: 'Supprimer les informations de qualité vidéo',
            presetRemoveSeasonEpisode: 'Supprimer le numéro de saison et épisode',
            presetRemoveSeason: 'Supprimer la saison',
            presetRemoveLanguage: 'Supprimer les informations de langue',
            presetTrimSpaces: 'Supprimer les espaces en début et fin',
            presetReplaceSeparators: 'Remplacer plusieurs séparateurs par un espace',
        },
        en: {
            appName: 'Renamer',
            advancedTab: 'Advanced files & Folder renaming',
            metadataTab: 'Files metadata renaming',
            pdfTab: 'PDF manipulation',
            convertPdfToCbz: 'Convert PDF to CBZ 1 by 1',
            noPdfSelected: 'No PDF files selected',
            pdfConvertComplete: 'PDF → CBZ conversion complete',
            pdfConverted: 'Converted',
            pdfSkipped: 'Skipped',
            pdfErrors: 'Errors',
            convertInProgress: 'Converting...',
            pdfConvertDescription: 'Rasterize each page to PNG and assemble into a CBZ (Kavita-compatible).',
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
            filtered: 'filtered',
            filteredByTypeRule: 'Filtered by the file type filter rule',
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
            on: 'ON',
            off: 'OFF',
            caseSensitive: 'Case sensitive',
            caseInsensitive: 'Ignore case',
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
            applyAnother: 'Apply other actions',
            dragToReorder: 'Drag to reorder',
            fileTypes: 'File types',
            scope: 'Scope',
            importRule: 'Import rule',
            exportRule: 'Export rule',
            loadSavedRule: 'Load a saved rule',
            ruleSaved: 'Rule saved',
            ruleUpdated: 'Rule updated',
            ruleRenamed: 'Rule renamed',
            ruleDeleted: 'Rule deleted',
            translationSaved: 'Translation saved',
            noSavedRules: 'No saved rules',
            noTranslations: 'No translations',
            ruleLoaded: 'Rule loaded',
            saveRuleTitle: 'Save rule',
            resaveRule: 'Re-save rule',
            overwrite: 'Overwrite',
            createNew: 'Create new',
            settings: 'Settings',
            manageSavedRules: 'Saved rules',
            manageTranslations: 'Translations',
            confirmDelete: 'Delete this rule?',
            confirm: 'Confirm',
            networkError: 'Network error',
            deleteError: 'Error deleting rule',
            rename: 'Rename',
            load: 'Load',
            loadPlan: 'Load a plan',
            savePlan: 'Save plan',
            planName: 'Plan name',
            planSaved: 'Plan saved',
            planLoaded: 'Plan loaded',
            planDeleted: 'Plan deleted',
            noPlanLoaded: 'No plan loaded',
            noPlanLoadedTitle: 'New plan',
            noPlans: 'No saved plans',
            currentPlan: 'Current plan',
            currentPlanLabel: 'Current plan',
            newPlanLabel: 'New plan',
            newPlan: 'New plan',
            overwritePlan: 'Overwrite existing plan',
            confirmDeletePlan: 'Delete this plan?',
            saveError: 'Save error',
            loadError: 'Load error',
            invalidPlan: 'Invalid plan',
            noRulesToSave: 'No rules to save',
            back: 'Back',
            loading: 'Loading',
            presetRemoveExtension: 'Remove extension',
            presetRemoveBrackets: 'Remove text in brackets',
            presetRemoveParentheses: 'Remove text in parentheses',
            presetRemoveLeadingNumber: 'Remove leading number',
            presetReplaceUnderscores: 'Replace underscores with spaces',
            presetReplaceDots: 'Replace dots with spaces',
            presetRemoveMultipleSpaces: 'Remove multiple spaces',
            presetRemoveAfterDash: 'Remove everything after dash',
            presetRemoveYear: 'Remove year',
            presetRemoveQuality: 'Remove video quality info',
            presetRemoveSeasonEpisode: 'Remove season and episode number',
            presetRemoveSeason: 'Remove season',
            presetRemoveLanguage: 'Remove language info',
            presetTrimSpaces: 'Trim spaces',
            presetReplaceSeparators: 'Replace separators with space',
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

    function loadCustomTranslations() {
        const baseUrl = getBaseUrl();
        fetch(baseUrl + '/api/translations', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).then(r => r.json()).then(data => {
            if (data.success && data.translations) {
                const lang = state.lang || 'fr';
                if (!translations[lang]) translations[lang] = {};
                Object.assign(translations[lang], data.translations);
                renderRules();
                updatePreview();
            }
        }).catch(err => {
            console.error('Failed to load translations:', err);
        });
    }

    function saveCustomTranslation(translationKey, translatedText) {
        const baseUrl = getBaseUrl();
        const headers = { 'Content-Type': 'application/json' };
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        return fetch(baseUrl + '/api/translations', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ translationKey, translatedText })
        }).then(r => r.json());
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
        const tabsContainer = document.getElementById('renamer-tabs');
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.renamer-tab').forEach(function(btn) {
                const id = btn.dataset.tab;
                const tabDef = tabs[id];
                if (tabDef) btn.textContent = t(tabDef.labelKey);
            });
        }
        const convertBtn = document.getElementById('pdf-action-convert-cbz');
        if (convertBtn) convertBtn.textContent = t('convertPdfToCbz');
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

    function showRenameDetails(renamedList, skippedList, errorsList) {
        const existing = document.getElementById('renamer-details-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'renamer-details-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10005;display:flex;align-items:center;justify-content:center;';
        const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const renamedHtml = (renamedList || []).map(r => `<li><span class="renamer-details-from">${escape(r.from)}</span> → <span class="renamer-details-to">${escape(r.to)}</span></li>`).join('') || '<li class="renamer-details-empty">Aucun</li>';
        const skippedHtml = (skippedList || []).map(s => `<li>${escape(s)}</li>`).join('') || '<li class="renamer-details-empty">Aucun</li>';
        const errorsHtml = (errorsList || []).map(e => `<li>${escape(e)}</li>`).join('') || '<li class="renamer-details-empty">Aucun</li>';
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:600px;width:90%;max-height:80vh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <h3 style="margin:0;">Détail des renommages</h3>
                    <button class="renamer-btn-icon" data-action="close-details" aria-label="Fermer">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                </div>
                <div style="overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
                    <div>
                        <h4 style="margin:0 0 6px 0;color:var(--nc-green);">Renommés (${(renamedList || []).length})</h4>
                        <ul class="renamer-details-list renamer-details-renamed">${renamedHtml}</ul>
                    </div>
                    <div>
                        <h4 style="margin:0 0 6px 0;color:var(--nc-orange);">Ignorés (${(skippedList || []).length})</h4>
                        <ul class="renamer-details-list renamer-details-skipped">${skippedHtml}</ul>
                    </div>
                    <div>
                        <h4 style="margin:0 0 6px 0;color:var(--nc-red);">Erreurs (${(errorsList || []).length})</h4>
                        <ul class="renamer-details-list renamer-details-errors">${errorsHtml}</ul>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const close = () => { overlay.remove(); };
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('[data-action="close-details"]').addEventListener('click', close);
    }

    function showToast(message, type, options) {
        options = options || {};
        type = type || 'success';
        let container = document.getElementById('renamer-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'renamer-toast-container';
            container.className = 'renamer-toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'renamer-toast renamer-toast-' + type;
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'i';
        const detailBtnHtml = options.detail ? '<button class="renamer-toast-detail" type="button">Voir détail</button>' : '';
        const closeBtn = '<button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
        toast.innerHTML = '<span class="renamer-toast-icon">' + icon + '</span><span class="renamer-toast-text"></span>' + detailBtnHtml + closeBtn;
        toast.querySelector('.renamer-toast-text').textContent = message;
        const dismiss = () => {
            toast.classList.remove('renamer-toast-show');
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        };
        toast.querySelector('.renamer-toast-close').addEventListener('click', dismiss);
        if (options.detail && typeof options.onDetail === 'function') {
            const detailBtn = toast.querySelector('.renamer-toast-detail');
            if (detailBtn) detailBtn.addEventListener('click', options.onDetail);
        }
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('renamer-toast-show'); }, 10);
        const persistent = options.persistent === true;
        if (!persistent && (type === 'success' || type === 'info')) {
            setTimeout(() => {
                if (toast.parentNode && toast.classList.contains('renamer-toast-show')) {
                    dismiss();
                }
            }, 3000);
        }
    }

    function showConfirmDialog(title, message, onConfirm, options) {
        options = options || {};
        const existing = document.getElementById('renamer-confirm-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'renamer-confirm-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        const confirmLabel = options.confirmLabel || t('confirm') || 'Confirmer';
        const cancelLabel = options.cancelLabel || t('cancel') || 'Annuler';
        const isDanger = options.danger !== false;
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3>${escapeHtml(title)}</h3>
                </div>
                <div style="font-size:14px;color:var(--nc-text);line-height:1.4;">${escapeHtml(message)}</div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
                    <button class="renamer-btn" data-action="cancel">${escapeHtml(cancelLabel)}</button>
                    <button class="renamer-btn ${isDanger ? 'renamer-btn-danger' : 'renamer-btn-primary'}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const close = () => { overlay.remove(); };
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            close();
            if (typeof options.onCancel === 'function') options.onCancel();
        });
        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            close();
            if (onConfirm) onConfirm();
        });
    }

    function apiRequest(url, options) {
        options = options || {};
        const method = options.method || 'GET';
        console.log('[Renamer API]', method, url, options.body ? JSON.parse(options.body) : '');
        const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        return fetch(url, {
            method: method,
            credentials: 'same-origin',
            headers: headers,
            body: options.body || null,
        }).then(r => {
            const contentType = r.headers.get('Content-Type') || '';
            const isJson = contentType.includes('application/json');
            if (!r.ok) {
                return (isJson ? r.json() : r.text()).then(body => {
                    const errMsg = (body && body.error) ? body.error : (typeof body === 'string' ? body : ('HTTP ' + r.status));
                    console.error('[Renamer API ERROR]', method, url, r.status, body);
                    throw new Error(errMsg);
                });
            }
            return isJson ? r.json() : r.text();
        }).catch(err => {
            console.error('[Renamer API NETWORK ERROR]', method, url, err);
            showToast((t('networkError') || 'Erreur réseau') + ': ' + (err.message || err), 'error');
            throw err;
        });
    }

    function ensureStyle() {
        const existing = document.getElementById('renamer-style');
        if (existing) {
            existing.textContent = getStyles();
            return;
        }
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
                width: 100svw;
                height: 100svh;
                max-width: none;
                max-height: none;
                border-radius: 0;
            }

            #renamer-modal.compact {
                width: 90svw;
                height: 90svh;
                max-width: 90svw;
                max-height: 90svh;
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
                overflow: auto;
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
                padding: 8px;
                transition: transform 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms cubic-bezier(0.4,0,0.2,1), background 200ms ease, border-color 200ms ease;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .renamer-rule-card.dragging {
                opacity: 0.4;
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

            .renamer-rule-card.type-search_replace .renamer-case-btn.on {
                background: var(--nc-blue);
                color: #fff;
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

            .renamer-rule-card.renamer-rule-dragging {
                opacity: 0.4;
                cursor: grabbing;
            }

            .renamer-rule-card.renamer-rule-chosen {
                background: rgba(0,130,201,0.05);
            }

            .renamer-rule-card.renamer-rule-ghost {
                opacity: 0.9;
                background: var(--nc-bg);
                box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                cursor: grabbing;
            }

            .renamer-rule-card.sortable-ghost {
                opacity: 0.4;
                background: rgba(0,130,201,0.05);
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
                width: 100%;
                height: 56px;
                border-radius: var(--nc-radius);
                border: 2px dashed rgba(0,130,201,0.35);
                background: rgba(0,130,201,0.03);
                color: var(--nc-blue);
                font-size: 24px;
                cursor: pointer;
                transition: var(--nc-transition);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .renamer-add-btn:hover {
                background: rgba(0,130,201,0.08);
                border-color: var(--nc-blue);
            }

            .renamer-popup {
                position: fixed;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px;
                z-index: 10000;
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

            #renamer-basic-trigger {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            .renamer-popup-arrow {
                opacity: 0.55;
                flex-shrink: 0;
            }

            #renamer-basic-trigger:hover .renamer-popup-arrow {
                opacity: 1;
            }

            .renamer-basic-popup {
                position: absolute;
                top: 0;
                left: auto;
                max-width: calc(100svw - 40px);
                overflow-y: auto;
            }

            .renamer-rule-popup {
                position: fixed;
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px;
                min-width: 180px;
                z-index: 10000;
                transition: var(--nc-transition);
            }

            .renamer-rule-popup-header {
                font-size: 12px;
                font-weight: bold;
                padding: 4px 8px;
                margin-bottom: 4px;
                border-bottom: 1px solid var(--nc-border);
            }

            .renamer-rule-popup-item {
                padding: 6px 10px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                transition: var(--nc-transition);
            }

            .renamer-rule-popup-item:hover {
                background: rgba(0,0,0,0.05);
            }

            .renamer-rule-popup-separator {
                height: 1px;
                background: var(--nc-border);
                margin: 4px 0;
            }

            .renamer-rule-popup-empty {
                padding: 12px;
                color: var(--nc-text);
                opacity: 0.6;
                font-size: 13px;
                text-align: center;
            }

            .renamer-rule-popup-meta {
                float: right;
                opacity: 0.5;
                font-size: 11px;
                font-weight: normal;
            }

            .renamer-popup-separator {
                height: 1px;
                background: var(--nc-border);
                margin: 4px 0;
            }

            .renamer-preview-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 3px;
                border-radius: var(--nc-radius);
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                transition: transform 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms cubic-bezier(0.4,0,0.2,1), background 200ms ease, border-color 200ms ease;
                cursor: grab;
                position: relative;
            }

            .renamer-preview-row:hover {
                background: rgba(0,130,201,0.03);
                border-color: var(--nc-blue);
                box-shadow: 0 2px 8px rgba(72, 136, 255, 0.12);
            }

            .renamer-preview-row.renamer-preview-dragging {
                opacity: 0.4;
                cursor: grabbing;
            }

            .renamer-preview-row.renamer-preview-chosen {
                background: rgba(0,130,201,0.05);
            }

            .renamer-preview-row.renamer-preview-ghost {
                opacity: 0.9;
                background: var(--nc-bg);
                box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                cursor: grabbing;
            }

            .renamer-preview-row.sortable-ghost {
                opacity: 0.4;
                background: rgba(0,130,201,0.05);
            }
            .renamer-preview-row.filtered-file-type {
                opacity: 0.5;
                filter: grayscale(1);
            }
            .renamer-preview-row.renamer-preview-row-deselected {
                opacity: 0.5;
                filter: grayscale(1);
            }

            .renamer-drop-indicator {
                position: absolute;
                left: 8px;
                right: 8px;
                height: 4px;
                background: var(--nc-blue);
                border-radius: 2px;
                box-shadow: 0 0 8px rgba(0,130,201,0.5);
                z-index: 1;
                transition: opacity 150ms ease;
            }

            .renamer-preview-drag-handle {
                cursor: grab;
                padding: 4px;
                opacity: 0.3;
                transition: opacity 200ms ease;
                display: flex;
                align-items: center;
                flex-shrink: 0;
            }

            .renamer-preview-drag-handle:hover {
                opacity: 0.6;
                cursor: grabbing;
            }

            .renamer-preview-row.drag-over-top {
                border-top: 3px solid var(--nc-blue);
            }

            .renamer-preview-row.drag-over-bottom {
                border-bottom: 3px solid var(--nc-blue);
            }

            .renamer-preview-from {
                flex: 1;
                font-size: 13px;
                word-break: break-word;
                white-space: normal;
                text-align: left;
            }

            .renamer-preview-arrow {
                color: var(--nc-blue);
                font-size: 16px;
                flex-shrink: 0;
            }

            .renamer-preview-to {
                flex: 1;
                font-size: 13px;
                font-weight: 500;
                word-break: break-word;
                white-space: normal;
                text-align: left;
            }

            button:not(.button-vue,[class^=vs__]).renamer-badge {
                // width: 20px;
                // height: 20px;
                // margin: 0px;
                // border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                color: #fff;
                flex-shrink: 0;
                transition: var(--nc-transition);
                cursor: pointer;
                border: none;
                font-family: inherit;
                padding: 10px;
            }

            .renamer-badge-success {
                background: #22c55e;
            }

            .renamer-badge-neutral {
                background: #94a3b8;
            }

            .renamer-badge-error {
                background: #ef4444;
            }

            .renamer-badge-deselected {
                background: #cbd5e1;
                color: #64748b;
                font-size: 14px;
                line-height: 1;
            }

            button.renamer-badge-toggle {
                cursor: pointer;
            }

            button.renamer-badge-toggle:hover {
                transform: scale(1.15);
            }

            button.renamer-badge-success.renamer-badge-toggle:hover {
                box-shadow: 0 0 0 2px rgba(34,197,94,0.3);
            }

            button.renamer-badge-deselected.renamer-badge-toggle:hover {
                background: #94a3b8;
                color: #fff;
                box-shadow: 0 0 0 2px rgba(148,163,184,0.3);
            }

            button.renamer-badge-toggle:active {
                transform: scale(0.95);
            }

            .renamer-toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10003;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            }

            .renamer-toast {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 16px;
                border-radius: var(--nc-radius);
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                font-size: 14px;
                color: var(--nc-text);
                pointer-events: auto;
                min-width: 200px;
                max-width: 400px;
                opacity: 0;
                transform: translateX(20px);
                transition: opacity 250ms ease, transform 250ms ease;
            }

            .renamer-toast-show {
                opacity: 1;
                transform: translateX(0);
            }

            .renamer-toast-icon {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: bold;
                color: #fff;
                flex-shrink: 0;
            }

            .renamer-toast-success .renamer-toast-icon {
                background: #22c55e;
            }

            .renamer-toast-success {
                border-left: 4px solid #22c55e;
            }

            .renamer-toast-error .renamer-toast-icon {
                background: #ef4444;
            }

            .renamer-toast-error {
                border-left: 4px solid #ef4444;
            }

            .renamer-toast-info .renamer-toast-icon {
                background: #22c55e;
            }

            .renamer-toast-info {
                border-left: 4px solid #22c55e;
            }

            .renamer-toast-close {
                background: transparent;
                border: none;
                color: var(--nc-text);
                opacity: 0.5;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
                padding: 0 4px;
                margin-left: 4px;
                flex-shrink: 0;
                transition: opacity 150ms ease;
            }

            .renamer-toast-close:hover {
                opacity: 1;
            }

            .renamer-toast-detail {
                background: var(--nc-blue);
                color: #fff;
                border: none;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                flex-shrink: 0;
                margin-left: 4px;
                transition: background 150ms ease;
            }

            .renamer-toast-detail:hover {
                background: var(--nc-blue-hover);
            }

            .renamer-details-list {
                list-style: none;
                padding: 0;
                margin: 0;
                font-size: 13px;
                line-height: 1.4;
            }

            .renamer-details-list li {
                padding: 4px 8px;
                border-bottom: 1px solid var(--nc-border);
                word-break: break-word;
            }

            .renamer-details-list li:last-child {
                border-bottom: none;
            }

            .renamer-details-empty {
                opacity: 0.5;
                font-style: italic;
            }

            .renamer-details-from {
                opacity: 0.7;
                text-decoration: line-through;
            }

            .renamer-details-to {
                color: var(--nc-green);
                font-weight: 500;
            }

            .renamer-modal-overlay {
                font-family: var(--nc-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
            }

            .renamer-rule-body {
            display: flex;
            flex-wrap: wrap;
            align-items: end;
            gap: 0px 10px;
            }

            .renamer-btn-primary {
                background: var(--nc-blue);
                color: #fff;
                border-color: var(--nc-blue);
            }

            .renamer-btn-primary:hover {
                background: var(--nc-blue-hover);
                border-color: var(--nc-blue-hover);
            }

            .renamer-btn-danger {
                background: var(--nc-red, #e02020);
                color: #fff;
                border-color: var(--nc-red, #e02020);
            }

            .renamer-btn-danger:hover {
                background: #b81818;
                border-color: #b81818;
            }

            .renamer-btn-small {
                padding: 4px 8px;
                font-size: 12px;
            }

            .renamer-settings-list, .renamer-settings-translations {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .renamer-settings-item {
                padding: 10px;
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                background: var(--nc-bg);
            }

            .renamer-settings-item-name {
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 4px;
                color: var(--nc-text);
                word-break: break-word;
            }

            .renamer-settings-item-actions {
                display: flex;
                gap: 6px;
                margin-top: 6px;
            }

            .renamer-settings-item input[type="text"] {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid var(--nc-border);
                border-radius: 4px;
                font-size: 13px;
                box-sizing: border-box;
            }

            .renamer-settings-item code {
                font-family: monospace;
                font-size: 12px;
                background: rgba(0,0,0,0.05);
                padding: 2px 6px;
                border-radius: 3px;
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
                gap: 0px;
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
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .renamer-status.success {
                background: #d4edda;
                color: #155724;
            }

            .renamer-status.error {
                background: #f8d7da;
                color: #721c24;
            }

            .renamer-status.warning {
                background: #fff3cd;
                color: #856404;
            }

            .renamer-status.info {
                background: #d1ecf1;
                color: #0c5460;
            }

            .renamer-status-text {
                flex: 1;
            }

            .renamer-status-close {
                background: transparent;
                border: none;
                color: inherit;
                opacity: 0.6;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                padding: 0 4px;
                flex-shrink: 0;
                transition: opacity 150ms ease;
            }

            .renamer-status-close:hover {
                opacity: 1;
            }

            .renamer-diff-remove,
            .renamer-preview-row .renamer-filter-badge
            {
                background: rgba(239,68,68,0.15);
                color: #721c24;
                padding: 2px 4px;
                border-radius: 3px;
            }

            .renamer-diff-add {
                background: rgba(34,197,94,0.15);
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
            @media (max-width:768px){
                .renamer-rule-actions button,
                .renamer-rule-actions .renamer-toggle.on{
                    transform:scale(0.8);
                }
                .renamer-rule-actions {
                ￼    gap: 0px;
                }
                .renamer-rule-header {
                    flex-wrap: wrap;
                }
            }

            .renamer-success-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.5);
                transition: opacity 300ms ease, visibility 300ms ease;
            }
            .renamer-success-popup {
                background: var(--color-main-background, #fff);
                color: var(--color-main-text, #000);
                border-radius: var(--border-radius-large, 8px);
                padding: 24px;
                box-shadow: 0 0 20px rgba(0,0,0,.3);
                max-width: 400px;
                width: 90%;
                text-align: center;
                transition: all 300ms ease-in-out;
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
        state.fileSelection = new Set(state.files);
        state.allSelected = true;

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
        bindAdvancedTabEvents();
        loadCustomTranslations();
        updatePreview();
    }

    function buildModalHtml() {
        return `
            <div id="renamer-modal" class="fullscreen">
                <div class="renamer-header">
                    <h3>${t('appName')}</h3>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button id="renamer-settings-btn" class="renamer-btn-icon" title="${t('settings') || 'Paramètres'}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                        <button id="renamer-lang-btn" class="renamer-btn-icon" title="${state.lang === 'fr' ? 'English' : 'Français'}">${state.lang === 'fr' ? 'FR' : 'EN'}</button>
                        <button id="renamer-collapse-btn" class="renamer-btn-icon" title="${t('reduce')}">
                            <svg height="16" width="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" id="resize"><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="7.82 38.2 25.82 38.2 25.82 56.13"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M25.81,38.2l-24,24"></path><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="56.19 25.8 38.17 25.8 38.17 7.88"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M38.18,25.81l24-24"></path></svg>
                        </button>
                        <button id="renamer-close-btn" class="renamer-btn-icon" title="${t('close')}">
                            <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="renamer-tabs" id="renamer-tabs">
                    ${Object.keys(tabs).map(function(id) {
                        const tab = tabs[id];
                        const active = id === state.activeTab ? ' active' : '';
                        return `<button class="renamer-tab${active}" data-tab="${id}">${escapeHtml(t(tab.labelKey))}</button>`;
                    }).join('')}
                </div>
                <div class="renamer-content" id="renamer-content">
                    ${buildAdvancedTab()}
                </div>
            </div>
        `;
    }

    const tabs = {};

    function registerTab(id, def) {
        if (!id || !def) return;
        tabs[id] = def;
    }

    function getTab(id) {
        return tabs[id] || null;
    }

    function listTabs() {
        return Object.keys(tabs);
    }

    function tabContext() {
        return {
            state: state,
            t: t,
            escapeHtml: escapeHtml,
            getBaseUrl: getBaseUrl,
            apiRequest: apiRequest,
            showToast: showToast,
            showRenameDetails: showRenameDetails,
            animateFlipOnList: animateFlipOnList,
        };
    }

    function buildAdvancedTab() {
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-main">
                    <div class="renamer-rules">
                        <div class="renamer-rules-list" id="renamer-rules-list">
                            <button class="renamer-add-btn" id="renamer-add-btn" title="${t('addText')}">+</button>
                        </div>
                    </div>
                    <div class="renamer-preview">
                        <div class="renamer-preview-header">
                            <span>${t('preview')}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div class="renamer-select-wrapper" style="width:auto;">
                                    <select id="renamer-view-mode" style="font-size:12px;padding:2px 6px;padding-right:32px;appearance:none;-webkit-appearance:none;">
                                        <option value="flat">${t('flat')}</option>
                                        <option value="folders">${t('folders')}</option>
                                    </select>
                                </div>
                                <button type="button" id="renamer-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="Désélectionner Tout">✓</button>
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

    tabs['advanced'] = {
        id: 'advanced',
        labelKey: 'advancedTab',
        build: function() { return buildAdvancedTab(); },
        bind: function() { bindAdvancedTabEvents(); },
        render: function() { renderAdvancedTab(); },
    };

    function bindAdvancedTabEvents() {
        const addBtn = document.getElementById('renamer-add-btn');
        if (addBtn && !addBtn._advancedBound) {
            addBtn._advancedBound = true;
            addBtn.addEventListener('click', handleAddBtnClick);
        }
        const cancelBtn = document.getElementById('renamer-cancel');
        if (cancelBtn && !cancelBtn._advancedBound) {
            cancelBtn._advancedBound = true;
            cancelBtn.addEventListener('click', closeDialog);
        }
        const runBtn = document.getElementById('renamer-run');
        if (runBtn && !runBtn._advancedBound) {
            runBtn._advancedBound = true;
            runBtn.addEventListener('click', runRename);
        }
        const savePlanBtn = document.getElementById('renamer-save-plan');
        if (savePlanBtn && !savePlanBtn._advancedBound) {
            savePlanBtn._advancedBound = true;
            savePlanBtn.addEventListener('click', showSavePlanDialog);
        }
        const toggleAllBtn = document.getElementById('renamer-toggle-all');
        if (toggleAllBtn && !toggleAllBtn._advancedBound) {
            toggleAllBtn._advancedBound = true;
            toggleAllBtn.addEventListener('click', function() {
                const allOn = state.allSelected || state.fileSelection.size === state.files.length;
                if (allOn) {
                    state.fileSelection = new Set();
                    state.allSelected = false;
                } else {
                    state.fileSelection = new Set(state.files);
                    state.allSelected = true;
                }
                updatePreview();
            });
        }
        const rulesList = document.getElementById('renamer-rules-list');
        if (rulesList && !rulesList._advancedBound) {
            rulesList._advancedBound = true;
            attachAdvancedRulesListeners(rulesList);
        }
    }

    function renderAdvancedTab() {
        renderRules();
        updatePreview();
    }

    function getSelectedFiles() {
        const files = [];
        try {
            const fileList = document.querySelector('.files-list');
            if (fileList) {
                const selected = fileList.querySelectorAll('.selected');
                selected.forEach(function(el) {
                    const name = el.getAttribute('data-file') || el.getAttribute('data-filename');
                    if (name) files.push(name);
                });
            }
        } catch (e) {
            files.length = 0;
        }
        return files;
    }

    function renderRules() {
        const list = document.getElementById('renamer-rules-list');
        if (!list) return;
        const existingAddBtn = document.getElementById('renamer-add-btn');
        if (existingAddBtn) existingAddBtn.remove();
        list.innerHTML = '';
        state.rules.forEach((rule, idx) => {
            const card = document.createElement('div');
            card.className = 'renamer-rule-card type-' + rule.mode + (rule.enabled ? '' : ' disabled');
            card.dataset.index = idx;
            card.innerHTML = buildRuleCardHtml(rule, idx);
            list.appendChild(card);
        });
        if (existingAddBtn) {
            list.appendChild(existingAddBtn);
        } else {
            const btn = document.createElement('button');
            btn.className = 'renamer-add-btn';
            btn.id = 'renamer-add-btn';
            btn.title = t('addText');
            btn.textContent = '+';
            list.appendChild(btn);
        }
        initRulesDnD(list);
    }

    function buildRuleCardHtml(rule, idx) {
        const num = idx + 1;
        const color = getRuleColor(rule.mode);
        return `
            <div class="renamer-rule-header">
                <span class="renamer-rule-drag" title="${t('dragToReorder')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>
                <span class="renamer-rule-number" style="background:${color}">${num}</span>
                <span class="renamer-rule-name">${escapeHtml(rule.translationKey && translations[state.lang]?.[rule.translationKey] ? translations[state.lang][rule.translationKey] : rule.name)}</span>
                <div class="renamer-rule-actions">
                    <div class="renamer-toggle ${rule.enabled ? 'on' : ''}" data-index="${idx}" title="${rule.enabled ? 'On' : 'Off'}" draggable="false">
                        <div class="renamer-toggle-knob"></div>
                    </div>
                    <button class="renamer-btn-icon" data-action="duplicate" data-index="${idx}" title="${t('duplicate')}" draggable="false">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                    </button>
                    <button class="renamer-btn-icon" data-action="delete" data-index="${idx}" title="${t('delete')}" draggable="false">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button class="renamer-btn-icon" data-action="settings" data-index="${idx}" title="${t('save')}" draggable="false">
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
                    <button class="renamer-btn-icon renamer-case-btn ${rule.caseSensitive !== false ? 'on' : ''}" data-action="toggle-case" data-index="${idx}" title="${rule.caseSensitive !== false ? t('caseSensitive') : t('caseInsensitive')}" draggable="false" style="font-size:13px;font-weight:bold;padding:2px 6px;min-width:32px;">Aa</button>
                </div>
                <button class="renamer-btn-icon" data-action="swap" data-index="${idx}" title="Inverser" draggable="false">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-right h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true"><path d="M8 3 4 7l4 4"></path><path d="M4 7h16"></path><path d="m16 21 4-4-4-4"></path><path d="M20 17H4"></path></svg>
                </button>
                <div class="renamer-field">
                    <label style="margin:0;">${t('replaceBy')}</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
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
                    <label>${t('zeroPadding')}</label>
                    <input type="number" data-field="zeroPadding" data-index="${idx}" value="${rule.zeroPadding || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label>${t('separator')}</label>
                    <input type="text" data-field="incSep" data-index="${idx}" value="${escapeHtml(rule.incSep || ' - ')}" />
                </div>
                <div class="renamer-field">
                    <label>${t('position')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="sequencePosition" data-index="${idx}">
                        <option value="start" ${(rule.sequencePosition || 'start') === 'start' ? 'selected' : ''}>${t('startPos')}</option>
                        <option value="end" ${(rule.sequencePosition || 'start') === 'end' ? 'selected' : ''}>${t('end')}</option>
                        <option value="at" ${(rule.sequencePosition || 'start') === 'at' ? 'selected' : ''}>${t('atPosition')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field" id="sequence-at-${idx}" style="display:${(rule.sequencePosition || 'start') === 'at' ? 'block' : 'none'};">
                    <label>${t('charCount')}</label>
                    <input type="number" data-field="sequenceAt" data-index="${idx}" value="${rule.sequenceAt || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label>${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
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
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
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
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
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
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
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
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
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

        const selectedSet = (state.allSelected) ? null : state.fileSelection;
        const preview = RenamerUtils.computePreview(state.files, state.rules, selectedSet);
        preview.forEach((item, idx) => {
            const row = document.createElement('div');
            const fromBase = item.from.replace(/^.*\//, '');
            const toBase = item.to.replace(/^.*\//, '');
            const isDeselected = item.deselected === true;
            const isApplicable = item.changed && !item.skipped && !isDeselected;
            const isSkipped = item.skipped;
            const isFilteredByType = item.filteredByType === true;
            let badgeHtml;
            if (isDeselected) {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-deselected renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="Désélectionné — cliquer pour resélectionner">−</button>';
            } else if (item.empty === true) {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-error renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="Nom vide — non autorisé">empty</button>';
            } else if (isApplicable) {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-success renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="Cliquer pour désélectionner">✓</button>';
            } else {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-neutral renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="Aucune règle applicable — cliquer pour désélectionner">i</button>';
            }
            const filterBadgeHtml = isFilteredByType
                ? '<span class="renamer-filter-badge" title="' + escapeHtml(t('filteredByTypeRule')) + '">' + escapeHtml(t('filtered')) + '</span>'
                : '';
            const rowClasses = ['renamer-preview-row'];
            if (isDeselected) rowClasses.push('renamer-preview-row-deselected');
            if (isFilteredByType) rowClasses.push('filtered-file-type');
            row.className = rowClasses.join(' ');
            row.dataset.index = idx;
            row.dataset.path = item.from;
            if (isDeselected) row.style.opacity = '0.5';
            row.innerHTML = `
                <span class="renamer-preview-drag-handle" title="${t('dragToReorder')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>
                <span class="renamer-preview-from" style="word-break:break-word;white-space:normal;">${item.fromDiff || escapeHtml(fromBase)}</span>
                <span class="renamer-preview-arrow">→</span>
                <span class="renamer-preview-to" style="word-break:break-word;white-space:normal;">${item.toDiff || escapeHtml(toBase)}</span>
                ${filterBadgeHtml}
                ${badgeHtml}
            `;
            list.appendChild(row);
        });

        list.querySelectorAll('.renamer-badge-toggle').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const p = this.dataset.path;
                if (!p) return;
                if (state.allSelected) {
                    state.fileSelection = new Set(state.files);
                    state.allSelected = false;
                }
                if (state.fileSelection.has(p)) state.fileSelection.delete(p);
                else state.fileSelection.add(p);
                updateToggleAllButton();
                updatePreview();
            });
        });

        updateToggleAllButton();

        initPreviewDnD(list);
        updateRunButtonState();
    }

    function updateToggleAllButton() {
        const btn = document.getElementById('renamer-toggle-all');
        if (!btn) return;
        const allOn = state.allSelected || state.fileSelection.size === state.files.length;
        btn.className = allOn
            ? 'renamer-badge renamer-badge-success renamer-badge-toggle'
            : 'renamer-badge renamer-badge-deselected renamer-badge-toggle';
        btn.textContent = allOn ? '✓' : '−';
        btn.title = allOn ? 'Désélectionner Tout' : 'Sélectionner Tout';
    }

    let dndInitialized = false;

    function initPreviewDnD(list) {
        if (list._sortable) {
            list._sortable.destroy();
        }
        if (typeof Sortable === 'undefined') {
            console.error('[Renamer] SortableJS not loaded');
            return;
        }
        const FLIP_DURATION = 250;

        const capturePositions = () => {
            const pos = [];
            list.querySelectorAll('.renamer-preview-row').forEach(row => {
                pos.push(row.getBoundingClientRect().top);
            });
            return pos;
        };

        const animateFlip = (oldPositions) => {
            const rows = list.querySelectorAll('.renamer-preview-row');
            rows.forEach((row, i) => {
                if (oldPositions[i] === undefined) return;
                const newY = row.getBoundingClientRect().top;
                const deltaY = oldPositions[i] - newY;
                if (Math.abs(deltaY) < 1) return;
                row.style.transition = 'none';
                row.style.transform = 'translateY(' + deltaY + 'px)';
                requestAnimationFrame(() => {
                    row.style.transition = 'transform ' + FLIP_DURATION + 'ms cubic-bezier(0.4,0,0.2,1), box-shadow ' + FLIP_DURATION + 'ms ease';
                    row.style.transform = '';
                    setTimeout(() => { row.style.transition = ''; }, FLIP_DURATION);
                });
            });
        };

        list._sortable = Sortable.create(list, {
            handle: '.renamer-preview-drag-handle',
            animation: FLIP_DURATION,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            ghostClass: 'renamer-preview-ghost',
            chosenClass: 'renamer-preview-chosen',
            dragClass: 'renamer-preview-dragging',
            forceFallback: false,
            fallbackOnBody: true,
            swapThreshold: 0.5,
            invertSwap: false,
            onStart: function(evt) {
                console.log('[Renamer DnD] start', evt.oldIndex);
            },
            onEnd: function(evt) {
                if (evt.oldIndex === evt.newIndex) return;
                console.log('[Renamer DnD] end', evt.oldIndex, '->', evt.newIndex);
                const oldPositions = capturePositions();
                const item = state.files.splice(evt.oldIndex, 1)[0];
                state.files.splice(evt.newIndex, 0, item);
                updatePreview();
                const newList = document.getElementById('renamer-preview-list');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (newList) animateFlipOnList(newList, oldPositions);
                    });
                });
            },
        });
    }

    function animateFlipOnList(list, oldPositions) {
        const rows = list.querySelectorAll('.renamer-preview-row');
        const FLIP_DURATION = 250;
        rows.forEach((row, i) => {
            if (oldPositions[i] === undefined) return;
            const newY = row.getBoundingClientRect().top;
            const deltaY = oldPositions[i] - newY;
            if (Math.abs(deltaY) < 1) return;
            row.style.transition = 'none';
            row.style.transform = 'translateY(' + deltaY + 'px)';
            requestAnimationFrame(() => {
                row.style.transition = 'transform ' + FLIP_DURATION + 'ms cubic-bezier(0.4,0,0.2,1), box-shadow ' + FLIP_DURATION + 'ms ease';
                row.style.transform = '';
                setTimeout(() => { row.style.transition = ''; }, FLIP_DURATION);
            });
        });
    }

    function initRulesDnD(list) {
        if (list._sortable) {
            list._sortable.destroy();
        }
        if (typeof Sortable === 'undefined') {
            console.error('[Renamer] SortableJS not loaded');
            return;
        }
        const FLIP_DURATION = 250;

        const capturePositions = () => {
            const pos = [];
            list.querySelectorAll('.renamer-rule-card').forEach(card => {
                pos.push(card.getBoundingClientRect().top);
            });
            return pos;
        };

        const animateFlip = (oldPositions) => {
            const cards = list.querySelectorAll('.renamer-rule-card');
            cards.forEach((card, i) => {
                if (oldPositions[i] === undefined) return;
                const newY = card.getBoundingClientRect().top;
                const deltaY = oldPositions[i] - newY;
                if (Math.abs(deltaY) < 1) return;
                card.style.transition = 'none';
                card.style.transform = 'translateY(' + deltaY + 'px)';
                requestAnimationFrame(() => {
                    card.style.transition = 'transform ' + FLIP_DURATION + 'ms cubic-bezier(0.4,0,0.2,1), box-shadow ' + FLIP_DURATION + 'ms ease';
                    card.style.transform = '';
                    setTimeout(() => { card.style.transition = ''; }, FLIP_DURATION);
                });
            });
        };

        list._sortable = Sortable.create(list, {
            handle: '.renamer-rule-drag',
            animation: FLIP_DURATION,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            ghostClass: 'renamer-rule-ghost',
            chosenClass: 'renamer-rule-chosen',
            dragClass: 'renamer-rule-dragging',
            forceFallback: false,
            fallbackOnBody: true,
            swapThreshold: 0.5,
            invertSwap: false,
            filter: '.renamer-add-btn',
            preventOnFilter: false,
            onEnd: function(evt) {
                if (evt.oldIndex === evt.newIndex) return;
                const oldPositions = capturePositions();
                const item = state.rules.splice(evt.oldIndex, 1)[0];
                state.rules.splice(evt.newIndex, 0, item);
                const cards = list.querySelectorAll('.renamer-rule-card');
                cards.forEach((card, i) => {
                    card.dataset.index = i;
                    card.querySelectorAll('[data-index]').forEach(el => {
                        el.dataset.index = i;
                    });
                });
                updatePreview();
                const newList = document.getElementById('renamer-rules-list');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (newList) animateFlipOnList(newList, oldPositions);
                    });
                });
            },
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

        const settingsBtn = document.getElementById('renamer-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function() {
                showSettingsPanel();
            });
        }

        if (collapseBtn && modal) {
            collapseBtn.addEventListener('click', function() {
                if (modal.classList.contains('fullscreen')) {
                    modal.classList.remove('fullscreen');
                    modal.style.width = '90svw';
                    modal.style.height = '90svh';
                    modal.style.maxWidth = '90svw';
                    modal.style.maxHeight = '90svh';
                    collapseBtn.innerHTML = '<svg height=16 width=16 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" id="resize"><path d="M30 2v12h-2V5.41L5.41 28H14v2H2V18h2v8.59L26.59 4H18V2Z" fill="#000000"></path></svg>';
                    collapseBtn.title = 'Agrandir';
                } else {
                    modal.classList.add('fullscreen');
                    modal.style.width = '100svw';
                    modal.style.height = '100svh';
                    modal.style.maxWidth = '100svw';
                    modal.style.maxHeight = '100svh';
                    collapseBtn.innerHTML = '<svg height=16 width=16 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" id="resize"><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="7.82 38.2 25.82 38.2 25.82 56.13"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M25.81,38.2l-24,24"></path><polyline fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" points="56.19 25.8 38.17 25.8 38.17 7.88"></polyline><path fill="currentColor" stroke="currentColor" stroke-miterlimit="10" stroke-width="4" d="M38.18,25.81l24-24"></path></svg>';
                    collapseBtn.title = 'Réduire';
                }
            });
        }

        const tabEls = document.querySelectorAll('.renamer-tab');
        tabEls.forEach(tab => {
            if (tab._tabBound) return;
            tab._tabBound = true;
            tab.addEventListener('click', function() {
                document.querySelectorAll('.renamer-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                state.activeTab = this.dataset.tab;
                const content = document.getElementById('renamer-content');
                if (!content) return;
                const tabDef = tabs[state.activeTab];
                if (tabDef) {
                    const ctx = {
                        state: state,
                        t: t,
                        escapeHtml: escapeHtml,
                        getBaseUrl: getBaseUrl,
                        apiRequest: apiRequest,
                        showToast: showToast,
                        showRenameDetails: showRenameDetails,
                        animateFlipOnList: animateFlipOnList,
                    };
                    content.innerHTML = tabDef.build(ctx);
                    bindEvents();
                    if (typeof tabDef.bind === 'function') tabDef.bind(ctx);
                    if (typeof tabDef.render === 'function') tabDef.render(ctx);
                } else {
                    content.innerHTML = '<div class="renamer-empty">' + escapeHtml(state.activeTab) + ' - coming soon</div>';
                }
            });
        });
    }

    function handleAddBtnClick(e) {
        e.stopPropagation();
        const addBtn = e.currentTarget;
        let popup = document.getElementById('renamer-add-popup');
        if (popup) { popup.remove(); return; }
        popup = document.createElement('div');
        popup.id = 'renamer-add-popup';
        popup.className = 'renamer-popup';
        popup.style.zIndex = '10000';
        const rect = addBtn.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.left = (rect.left + rect.width / 2) + 'px';
        popup.style.transform = 'translateX(-50%)';
        popup.style.minWidth = '220px';
        popup.innerHTML = `
            <div class="renamer-popup-item" data-type="search_replace">${t('searchReplace')}</div>
            <div class="renamer-popup-item" data-type="sequence">${t('sequence')}</div>
            <div class="renamer-popup-item" data-type="regex">${t('regex')}</div>
            <div class="renamer-popup-item" data-type="filetype">${t('fileTypeFilter')}</div>
            <div class="renamer-popup-item" data-type="truncate">${t('truncate')}</div>
            <div class="renamer-popup-item" data-type="add_text">${t('addText')}</div>
            <div class="renamer-popup-item" data-type="basic" id="renamer-basic-trigger"><span>${t('basicRules')}</span><svg class="renamer-popup-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
            <div class="renamer-popup-separator"></div>
            <div class="renamer-popup-item" data-action="load-saved-rule">${t('loadSavedRule')}</div>
            <div class="renamer-popup-item" data-action="import-rule">${t('importRule')}</div>
        `;
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
        document.body.appendChild(popup);

        const basicTrigger = popup.querySelector('#renamer-basic-trigger');
        if (basicTrigger) {
            let basicPopup = null;
            const isMobile = () => window.matchMedia('(hover: none)').matches;
            const showBasicPopup = (e) => {
                if (e) e.stopPropagation();
                if (basicPopup) { basicPopup.remove(); basicPopup = null; return; }
                basicPopup = document.createElement('div');
                basicPopup.id = 'renamer-basic-popup';
                basicPopup.className = 'renamer-popup renamer-basic-popup';
                basicPopup.style.zIndex = '10002';
                if (isMobile()) {
                    basicPopup.style.position = 'fixed';
                    basicPopup.style.left = '8px';
                    basicPopup.style.right = '8px';
                    basicPopup.style.top = '8px';
                    basicPopup.style.minWidth = 'auto';
                    basicPopup.style.maxHeight = 'calc(100svh - 100px)';
                    document.body.appendChild(basicPopup);
                } else {
                    basicPopup.style.position = 'absolute';
                    basicPopup.style.left = (basicTrigger.offsetLeft + basicTrigger.offsetWidth + 8) + 'px';
                    basicPopup.style.top = '0px';
                    basicPopup.style.minWidth = '220px';
                    basicPopup.style.maxHeight = '400px';
                    popup.appendChild(basicPopup);
                }

                let items = '';
                presetRules.forEach((preset, idx) => {
                    const translationKey = preset.translationKey;
                    const translated = translationKey ? t(translationKey) : preset.name;
                    items += `<div class="renamer-popup-item" data-type="basic" data-preset="${idx}">${escapeHtml(translated)}</div>`;
                });
                basicPopup.innerHTML = items;

                basicPopup.querySelectorAll('.renamer-popup-item').forEach(item => {
                    item.addEventListener('click', function(e) {
                        e.stopPropagation();
                        addRule('basic', parseInt(this.dataset.preset, 10));
                        if (basicPopup) { basicPopup.remove(); basicPopup = null; }
                        if (popup) { popup.remove(); }
                    });
                });

                setTimeout(() => {
                    document.addEventListener('click', function close(e) {
                        if (basicPopup && !basicPopup.contains(e.target)) {
                            basicPopup.remove();
                            basicPopup = null;
                            document.removeEventListener('click', close);
                        }
                    });
                }, 10);
            };
            basicTrigger.addEventListener('click', showBasicPopup);
            if (!isMobile()) {
                let hoverTimer = null;
                basicTrigger.addEventListener('mouseenter', () => {
                    hoverTimer = setTimeout(showBasicPopup, 150);
                });
                basicTrigger.addEventListener('mouseleave', () => {
                    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
                    setTimeout(() => {
                        if (basicPopup && !basicPopup.contains(document.activeElement) && !basicPopup.matches(':hover')) {
                            basicPopup.remove();
                            basicPopup = null;
                        }
                    }, 200);
                });
            }
        }

        popup.querySelectorAll('.renamer-popup-item').forEach(item => {
            item.addEventListener('click', function() {
                if (this.dataset.type === 'basic') return;
                if (this.dataset.action === 'import-rule') {
                    importSingleRule();
                } else if (this.dataset.action === 'load-saved-rule') {
                    loadSavedRule();
                } else {
                    addRule(this.dataset.type);
                }
                popup.remove();
            });
        });
    }

    function attachAdvancedRulesListeners(rulesList) {
        rulesList.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action]');
            if (target) {
                const action = target.dataset.action;
                const index = parseInt(target.dataset.index, 10);
                if (action === 'delete') deleteRule(index);
                else if (action === 'duplicate') duplicateRule(index);
                else if (action === 'settings') toggleMenu(index, target);
                else if (action === 'swap' && state.rules[index]) {
                    const rule = state.rules[index];
                    const tmp = rule.pattern;
                    rule.pattern = rule.replacement;
                    rule.replacement = tmp;
                    renderRules();
                    updatePreview();
                } else if (action === 'toggle-case' && state.rules[index]) {
                    state.rules[index].caseSensitive = state.rules[index].caseSensitive === false ? true : false;
                    renderRules();
                    updatePreview();
                }
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
                    if (field === 'sequencePosition') {
                        const sequenceAtEl = document.getElementById('sequence-at-' + index);
                        if (sequenceAtEl) {
                            sequenceAtEl.style.display = select.value === 'at' ? 'block' : 'none';
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
    }

    function getPlanPayload() {
        return {
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
                sequencePosition: r.sequencePosition,
                sequenceAt: r.sequenceAt,
                incSep: r.incSep,
                filterMode: r.filterMode,
                extensions: r.extensions,
                insertText: r.insertText,
                insertPosition: r.insertPosition,
                insertAt: r.insertAt,
                truncateLength: r.truncateLength,
                truncateDirection: r.truncateDirection,
                basicSubType: r.basicSubType,
                translationKey: r.translationKey || null,
            }))
        };
    }

    function showSavePlanDialog() {
        if (!state.rules.length) {
            showToast(t('noRulesToSave') || 'Aucune règle à sauvegarder', 'error');
            return;
        }
        const existing = document.getElementById('renamer-save-plan-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'renamer-save-plan-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        const hasPlan = !!state.currentPlan;
        const defaultName = hasPlan ? state.currentPlan.replace(/\.json$/, '').replace(/^plan-/, '') : 'plan-' + new Date().toISOString().slice(0, 10);
        const extraActions = hasPlan
            ? `<button class="renamer-btn" data-action="overwrite">${escapeHtml(t('overwritePlan') || 'Écraser plan existant')}</button>`
            : '';
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3>${t('savePlan') || 'Sauvegarder le plan'}</h3>
                </div>
                <div style="font-size:13px;opacity:0.8;">${hasPlan ? (t('currentPlanLabel') || 'Plan courant') + ': <code>' + escapeHtml(state.currentPlan) + '</code>' : (t('newPlanLabel') || 'Nouveau plan')}</div>
                <div class="renamer-field">
                    <label>${escapeHtml(t('planName') || 'Nom du plan')}</label>
                    <input type="text" id="renamer-save-plan-input" value="${escapeHtml(defaultName)}" />
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                    <button class="renamer-btn" data-action="cancel">${t('cancel')}</button>
                    ${extraActions}
                    <button class="renamer-btn renamer-btn-primary" data-action="new" ${!hasPlan && !defaultName ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>${escapeHtml(hasPlan ? (t('newPlan') || 'Nouveau plan') : (t('save') || 'Enregistrer'))}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#renamer-save-plan-input');
        if (input) { input.focus(); input.select(); }
        const newBtn = overlay.querySelector('[data-action="new"]');
        const updateBtnState = () => {
            const val = (input ? input.value : '').trim();
            if (newBtn) {
                if (!val) {
                    newBtn.disabled = true;
                    newBtn.style.opacity = '0.5';
                    newBtn.style.cursor = 'not-allowed';
                } else {
                    newBtn.disabled = false;
                    newBtn.style.opacity = '';
                    newBtn.style.cursor = '';
                }
            }
        };
        if (input) input.addEventListener('input', updateBtnState);
        updateBtnState();
        const close = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
        const doSave = (asNew) => {
            const val = (input ? input.value : '').trim();
            if (asNew && !val) return;
            close();
            performSavePlan(val, asNew);
        };
        if (newBtn) newBtn.addEventListener('click', () => doSave(true));
        const overwriteBtn = overlay.querySelector('[data-action="overwrite"]');
        if (overwriteBtn) overwriteBtn.addEventListener('click', () => doSave(false));
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); doSave(true); }
            else if (e.key === 'Escape') { close(); }
        });
    }

    function performSavePlan(name, asNew) {
        const payload = getPlanPayload();
        if (asNew) {
            payload.name = name.endsWith('.json') ? name : (name + '.json');
        }
        console.log('[Renamer] Saving plan', payload);
        apiRequest(getBaseUrl() + '/api/plans/save', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then(data => {
            if (data.success) {
                const fileName = (data.path || '').split('/').pop();
                state.currentPlan = fileName;
                showToast((t('planSaved') || 'Plan sauvegardé') + ': ' + fileName, 'success');
            } else {
                showToast((t('saveError') || 'Erreur') + ': ' + (data.error || 'unknown'), 'error');
            }
        }).catch(err => {
            showToast((t('saveError') || 'Erreur') + ': ' + err.message, 'error');
        });
    }

    function showLoadPlanDialog() {
        const existing = document.getElementById('renamer-load-plan-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'renamer-load-plan-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:520px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3>${t('loadPlan') || 'Charger un plan'}</h3>
                    <button id="renamer-load-plan-close" class="renamer-btn-icon" title="${t('close')}">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                </div>
                <div id="renamer-load-plan-content" style="overflow-y:auto;flex:1;min-height:200px;">${t('loading') || 'Chargement'}...</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#renamer-load-plan-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        const content = overlay.querySelector('#renamer-load-plan-content');
        apiRequest(getBaseUrl() + '/api/plans/load', { method: 'GET' })
            .then(data => {
                const plans = (data && data.plans) ? data.plans : [];
                if (!plans.length) {
                    content.innerHTML = '<div class="renamer-rule-popup-empty">' + escapeHtml(t('noPlans') || 'Aucun plan sauvegardé') + '</div>';
                    return;
                }
                let html = '<div class="renamer-settings-list">';
                plans.forEach(plan => {
                    const date = new Date(plan.mtime * 1000);
                    const dateStr = date.toLocaleString();
                    html += '<div class="renamer-settings-item" data-plan-name="' + escapeHtml(plan.name) + '">';
                    html += '<div class="renamer-settings-item-name">' + escapeHtml(plan.name) + '</div>';
                    html += '<div style="font-size:12px;opacity:0.6;">' + escapeHtml(dateStr) + '</div>';
                    html += '<div class="renamer-settings-item-actions">';
                    html += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" data-action="load">' + escapeHtml(t('load') || 'Charger') + '</button>';
                    html += '<button class="renamer-btn renamer-btn-small" data-action="delete">' + escapeHtml(t('delete') || 'Supprimer') + '</button>';
                    html += '</div></div>';
                });
                html += '</div>';
                content.innerHTML = html;
                content.querySelectorAll('.renamer-settings-item').forEach(item => {
                    const planName = item.dataset.planName;
                    item.querySelector('[data-action="load"]').addEventListener('click', () => {
                        loadPlanContent(planName, overlay);
                    });
                    item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                        showConfirmDialog(
                            t('delete') || 'Supprimer',
                            (t('confirmDeletePlan') || 'Supprimer ce plan ?') + ' (' + planName + ')',
                            () => {
                                apiRequest(getBaseUrl() + '/api/plans/delete/' + encodeURIComponent(planName), { method: 'DELETE' })
                                    .then(() => {
                                        showToast(t('planDeleted') || 'Plan supprimé', 'success');
                                        overlay.remove();
                                        showLoadPlanDialog();
                                    })
                                    .catch(err => showToast((t('deleteError') || 'Erreur') + ': ' + err.message, 'error'));
                            }
                        );
                    });
                });
            })
            .catch(err => {
                content.innerHTML = '<div class="renamer-rule-popup-empty">' + escapeHtml(t('loadError') || 'Erreur de chargement') + ': ' + escapeHtml(err.message) + '</div>';
            });
    }

    function loadPlanContent(planName, overlay) {
        console.log('[Renamer] Loading plan', planName);
        apiRequest(getBaseUrl() + '/api/plans/load/' + encodeURIComponent(planName), { method: 'GET' })
            .then(data => {
                if (data.success && data.plan) {
                    if (data.plan.rules && Array.isArray(data.plan.rules)) {
                        state.rules = data.plan.rules.map(r => Object.assign({}, r));
                        state.currentPlan = data.name || planName;
                        renderRules();
                        updatePreview();
                        if (overlay) overlay.remove();
                        showToast((t('planLoaded') || 'Plan chargé') + ': ' + state.currentPlan, 'success');
                    } else {
                        showToast(t('invalidPlan') || 'Plan invalide', 'error');
                    }
                } else {
                    showToast((t('loadError') || 'Erreur') + ': ' + (data.error || 'unknown'), 'error');
                }
            })
            .catch(err => showToast((t('loadError') || 'Erreur') + ': ' + err.message, 'error'));
    }

    function addRule(type, presetIndex) {
        let rule;
        
        if (type === 'basic' && typeof presetIndex !== 'undefined' && presetRules[presetIndex]) {
            const preset = presetRules[presetIndex];
            const translationKey = preset.translationKey;
            let name = preset.name;
            
            if (translationKey) {
                const translated = t(translationKey);
                if (translated !== translationKey) {
                    name = translated;
                }
            }
            
            rule = {
                id: Date.now() + Math.random(),
                type: 'regex',
                mode: 'regex',
                name: name,
                enabled: true,
                target: 'name',
                pattern: preset.pattern,
                replacement: preset.replacement || '',
                translationKey: translationKey || null,
                caseSensitive: false,
            };
        } else {
            rule = {
                id: Date.now() + Math.random(),
                type: type,
                mode: type,
                name: type === 'search_replace' ? t('searchReplace') : type === 'sequence' ? t('sequence') : type === 'regex' ? t('regex') : type === 'filetype' ? t('fileTypeFilter') : type === 'truncate' ? t('truncate') : type === 'add_text' ? t('addText') : type === 'basic' ? t('basicRules') : t('ruleName'),
                enabled: true,
                target: 'name',
                pattern: '',
                replacement: '',
                caseSensitive: false,
                sequenceType: 'numeric',
                startValue: 1,
                zeroPadding: 0,
                sequencePosition: 'end',
                sequenceAt: 0,
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
        }
        
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
        let popup = document.getElementById('renamer-rule-popup');
        if (popup) { popup.remove(); return; }
        
        popup = document.createElement('div');
        popup.id = 'renamer-rule-popup';
        popup.className = 'renamer-rule-popup';
        popup.innerHTML = `
            <div class="renamer-rule-popup-header">${escapeHtml(state.rules[index].translationKey && translations[state.lang]?.[state.rules[index].translationKey] ? translations[state.lang][state.rules[index].translationKey] : state.rules[index].name)}</div>
            <div class="renamer-rule-popup-item" data-action="save">${t('save')}</div>
            <div class="renamer-rule-popup-item" data-action="toggle">${state.rules[index].enabled ? t('on') : t('off')}</div>
            <div class="renamer-rule-popup-item" data-action="duplicate">${t('duplicate')}</div>
            <div class="renamer-rule-popup-item" data-action="delete">${t('delete')}</div>
            <div class="renamer-rule-popup-separator"></div>
            <div class="renamer-rule-popup-item" data-action="export">${t('exportRule')}</div>
            <div class="renamer-rule-popup-item" data-action="import">${t('importRule')}</div>
        `;
        document.body.appendChild(popup);
        const rect = button.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.left = (rect.right - 8) + 'px';
        popup.style.top = (rect.bottom + 8) + 'px';
        popup.style.transform = 'none';
        popup.style.zIndex = '10000';
        
        // Adjust if overflowing
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.right > window.innerWidth - 8) {
            popup.style.left = (rect.left - popupRect.width + 8) + 'px';
        }
        if (popupRect.bottom > window.innerHeight - 8) {
            popup.style.top = (rect.top - popupRect.height - 8) + 'px';
        }
        
        const closePopup = () => { if (popup) popup.remove(); };
        
        popup.querySelectorAll('.renamer-rule-popup-item').forEach(item => {
            item.addEventListener('click', function() {
                const action = this.dataset.action;
                if (action === 'save') saveRule(index);
                else if (action === 'toggle') {
                    state.rules[index].enabled = !state.rules[index].enabled;
                    renderRules();
                    updatePreview();
                } else if (action === 'duplicate') duplicateRule(index);
                else if (action === 'delete') deleteRule(index);
                else if (action === 'export') exportRule(index);
                else if (action === 'import') importRule(index);
                closePopup();
            });
        });
        
        setTimeout(() => {
            document.addEventListener('click', function(e) {
                if (popup && !popup.contains(e.target)) {
                    popup.remove();
                }
            });
        }, 10);
    }
    
    function exportRule(index) {
        const rule = state.rules[index];
        if (!rule) return;
        const payload = JSON.stringify(rule, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (rule.name || 'rule') + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function importSingleRule() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data && data.mode) {
                        const newRule = {
                            id: Date.now() + Math.random(),
                            name: data.name || t('ruleName'),
                            mode: data.mode,
                            enabled: data.enabled !== false,
                            target: data.target || 'full',
                            pattern: data.pattern || '',
                            replacement: data.replacement || '',
                            sequenceType: data.sequenceType || null,
                            startValue: data.startValue || 1,
                            zeroPadding: data.zeroPadding || 0,
                            incSep: data.incSep || ' - ',
                            filterMode: data.filterMode || 'ignored',
                            extensions: data.extensions || [],
                            insertText: data.insertText || '',
                            insertPosition: data.insertPosition || 'start',
                            insertAt: data.insertAt || 0,
                            truncateLength: data.truncateLength || 0,
                            truncateDirection: data.truncateDirection || 'end',
                            basicSubType: data.basicSubType || 'capitalize',
                            translationKey: data.translationKey || null,
                        };
                        if (data.translationKey && !translations[state.lang]?.[data.translationKey]) {
                            const newIndex = state.rules.length;
                            state.rules.push(newRule);
                            renderRules();
                            updatePreview();
                            showTranslationPopup(newIndex, data);
                            return;
                        }
                        state.rules.push(newRule);
                        renderRules();
                        updatePreview();
                    } else {
                        alert('Invalid rule JSON');
                    }
                } catch (err) {
                    alert('Error parsing JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    function importRule(index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data && data.mode) {
                        if (data.translationKey && !translations[state.lang]?.[data.translationKey]) {
                            showTranslationPopup(index, data);
                            return;
                        }
                        state.rules[index] = { ...state.rules[index], ...data, id: state.rules[index].id };
                        renderRules();
                        updatePreview();
                    } else {
                        alert('Invalid rule JSON');
                    }
                } catch (err) {
                    alert('Error parsing JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    function showTranslationPopup(index, ruleData) {
        const popup = document.createElement('div');
        popup.id = 'renamer-translation-popup';
        popup.className = 'renamer-rule-popup';
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.zIndex = '10000';
        popup.innerHTML = `
            <div class="renamer-rule-popup-header">${t('ruleName')}</div>
            <div class="renamer-field">
                <label>Translation key: ${escapeHtml(ruleData.translationKey || '')}</label>
                <input type="text" id="renamer-translation-input" value="${escapeHtml(ruleData.name || '')}" />
            </div>
            <div class="renamer-rule-popup-item" data-action="save-translation">${t('save')}</div>
            <div class="renamer-rule-popup-item" data-action="skip-translation">${t('cancel')}</div>
        `;
        document.body.appendChild(popup);
        
        popup.querySelectorAll('.renamer-rule-popup-item').forEach(item => {
            item.addEventListener('click', function() {
                const action = this.dataset.action;
                if (action === 'save-translation') {
                    const input = document.getElementById('renamer-translation-input');
                    const newName = input ? input.value.trim() : '';
                    if (newName) {
                        ruleData.name = newName;
                        if (!translations[state.lang]) translations[state.lang] = {};
                        translations[state.lang][ruleData.translationKey] = newName;
                        saveCustomTranslation(ruleData.translationKey, newName).then(() => {
                            console.log('Translation saved to DB');
                        }).catch(err => {
                            console.error('Failed to save translation:', err);
                        });
                    }
                    state.rules[index] = { ...state.rules[index], ...ruleData, id: state.rules[index].id };
                    renderRules();
                    updatePreview();
                } else if (action === 'skip-translation') {
                    state.rules[index] = { ...state.rules[index], ...ruleData, id: state.rules[index].id };
                    renderRules();
                    updatePreview();
                }
                popup.remove();
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
        showSaveRuleDialog(index, function(newName, overwrite) {
            const translationKey = rule.translationKey || ('customRule_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
            const payload = {
                name: newName,
                mode: rule.mode,
                pattern: rule.pattern || '',
                replacement: rule.replacement || '',
                target: rule.target || 'full',
                sequenceType: rule.sequenceType || null,
                startValue: rule.startValue || 1,
                zeroPadding: rule.zeroPadding || 0,
                enabled: rule.enabled !== false,
                filterMode: rule.filterMode || 'ignored',
                extensions: rule.extensions || [],
                translationKey: translationKey,
            };

            const finalize = (savedRule, isNew) => {
                if (!translations[state.lang]) translations[state.lang] = {};
                translations[state.lang][translationKey] = newName;
                saveCustomTranslation(translationKey, newName).catch(() => {});
                state.rules[index].name = newName;
                state.rules[index].translationKey = translationKey;
                state.rules[index].saved_rule = true;
                state.rules[index].dbId = savedRule.id;
                if (!isNew) {
                    state.rules[index].dbId = rule.dbId;
                }
                renderRules();
                updatePreview();
                showToast(isNew ? (t('ruleSaved') || 'Règle sauvegardée') : (t('ruleUpdated') || 'Règle mise à jour'), 'success');
            };

            if (overwrite && rule.dbId) {
                fetch(getBaseUrl() + '/api/rules/' + rule.dbId, {
                    method: 'PUT',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }).then(r => r.json()).then(data => {
                    if (data.id) {
                        finalize(data, false);
                    } else {
                        showToast('Erreur: ' + (data.error || 'Réponse inattendue'), 'error');
                    }
                }).catch(() => showToast('Erreur réseau', 'error'));
            } else {
                fetch(getBaseUrl() + '/api/rules', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }).then(r => r.json()).then(data => {
                    if (data.id) {
                        finalize(data, true);
                    } else {
                        showToast('Erreur: ' + (data.error || 'Réponse inattendue'), 'error');
                    }
                }).catch(() => showToast('Erreur réseau', 'error'));
            }
        });
    }

    function loadSavedRule() {
        fetch(getBaseUrl() + '/api/rules', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
        }).then(r => r.json()).then(data => {
            const allRules = (data && data.user) ? data.user : [];
            const existing = document.getElementById('renamer-load-rule-popup');
            if (existing) { existing.remove(); return; }
            const popup = document.createElement('div');
            popup.id = 'renamer-load-rule-popup';
            popup.className = 'renamer-rule-popup';
            if (!allRules.length) {
                popup.innerHTML = '<div class="renamer-rule-popup-header">' + escapeHtml(t('loadSavedRule') || 'Charger une règle sauvegardée') + '</div><div class="renamer-rule-popup-empty">' + escapeHtml(t('noSavedRules') || 'Aucune règle sauvegardée') + '</div>';
            } else {
                let items = '<div class="renamer-rule-popup-header">' + escapeHtml(t('loadSavedRule') || 'Charger une règle sauvegardée') + '</div>';
                allRules.forEach(rule => {
                    items += '<div class="renamer-rule-popup-item" data-rule-id="' + rule.id + '">' + escapeHtml(rule.name) + ' <span class="renamer-rule-popup-meta">' + escapeHtml(rule.mode) + '</span></div>';
                });
                popup.innerHTML = items;
            }
            popup.style.position = 'fixed';
            popup.style.zIndex = '10002';
            const addBtn = document.getElementById('renamer-add-btn');
            if (addBtn) {
                const rect = addBtn.getBoundingClientRect();
                popup.style.left = rect.left + 'px';
                popup.style.top = (rect.bottom + 8) + 'px';
                popup.style.minWidth = '240px';
                popup.style.maxHeight = '400px';
                popup.style.overflowY = 'auto';
            } else {
                popup.style.left = '50%';
                popup.style.top = '50%';
                popup.style.transform = 'translate(-50%, -50%)';
            }
            document.body.appendChild(popup);

            popup.querySelectorAll('.renamer-rule-popup-item[data-rule-id]').forEach(item => {
                item.addEventListener('click', function() {
                    const ruleId = parseInt(this.dataset.ruleId, 10);
                    const rule = allRules.find(r => r.id === ruleId);
                    if (rule) {
                        const newRule = Object.assign({}, rule);
                        delete newRule.id;
                        delete newRule.isDefault;
                        newRule.dbId = rule.id;
                        newRule.saved_rule = true;
                        if (newRule.enabled === undefined) newRule.enabled = true;
                        state.rules.push(newRule);
                        renderRules();
                        updatePreview();
                        showToast(t('ruleLoaded') || 'Règle chargée', 'success');
                    }
                    popup.remove();
                });
            });

            setTimeout(() => {
                document.addEventListener('click', function close(e) {
                    if (popup && !popup.contains(e.target)) {
                        popup.remove();
                        document.removeEventListener('click', close);
                    }
                });
            }, 10);
        }).catch(err => showToast('Erreur réseau', 'error'));
    }

    function showSettingsPanel() {
        const existing = document.getElementById('renamer-settings-panel');
        if (existing) { existing.remove(); return; }
        const overlay = document.createElement('div');
        overlay.id = 'renamer-settings-panel';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10003;display:flex;align-items:center;justify-content:center;';
        const planLabel = state.currentPlan ? escapeHtml(state.currentPlan) : (t('noPlanLoaded') || 'Aucun plan chargé');
        overlay.innerHTML = `
            <div class="renamer-modal renamer-settings-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:520px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3>${t('settings') || 'Paramètres'}</h3>
                    <button id="renamer-settings-close" class="renamer-btn-icon" title="${t('close')}">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                </div>
                <div style="font-size:12px;opacity:0.7;padding:4px 0;">${t('currentPlan') || 'Plan courant'}: <code>${planLabel}</code></div>
                <div class="renamer-settings-menu" style="display:flex;flex-direction:column;gap:8px;">
                    <button class="renamer-btn" data-menu="rules" style="text-align:left;justify-content:flex-start;padding:12px;">
                        <span style="font-size:18px;margin-right:8px;">⚙</span>
                        <span style="flex:1;">${t('manageSavedRules') || 'Paramètres des règles'}</span>
                        <span style="opacity:0.5;">›</span>
                    </button>
                    <button class="renamer-btn" data-menu="translations" style="text-align:left;justify-content:flex-start;padding:12px;">
                        <span style="font-size:18px;margin-right:8px;">🌐</span>
                        <span style="flex:1;">${t('manageTranslations') || 'Traductions'}</span>
                        <span style="opacity:0.5;">›</span>
                    </button>
                    <button class="renamer-btn" data-menu="load-plan" style="text-align:left;justify-content:flex-start;padding:12px;">
                        <span style="font-size:18px;margin-right:8px;">📂</span>
                        <span style="flex:1;">${t('loadPlan') || 'Charger un plan'}</span>
                        <span style="opacity:0.5;">›</span>
                    </button>
                    <button class="renamer-btn" data-menu="save-plan" style="text-align:left;justify-content:flex-start;padding:12px;">
                        <span style="font-size:18px;margin-right:8px;">💾</span>
                        <span style="flex:1;">${t('savePlan') || 'Sauvegarder le plan'}</span>
                        <span style="opacity:0.5;">›</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#renamer-settings-close').addEventListener('click', function() {
            overlay.remove();
        });
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });
        overlay.querySelectorAll('[data-menu]').forEach(btn => {
            btn.addEventListener('click', function() {
                const menu = this.dataset.menu;
                if (menu === 'rules') {
                    showRulesSubPanel();
                } else if (menu === 'translations') {
                    showTranslationsSubPanel();
                } else if (menu === 'load-plan') {
                    overlay.remove();
                    showLoadPlanDialog();
                } else if (menu === 'save-plan') {
                    overlay.remove();
                    showSavePlanDialog();
                }
            });
        });
    }

    function showSubPanel() {
        const existing = document.getElementById('renamer-settings-panel');
        if (existing) { existing.remove(); }
        const overlay = document.createElement('div');
        overlay.id = 'renamer-settings-panel';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10003;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div class="renamer-modal renamer-settings-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:640px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <button id="renamer-settings-back" class="renamer-btn-icon" title="${t('back') || 'Retour'}">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 3L5 8L10 13"/></svg>
                    </button>
                    <h3 id="renamer-sub-title"></h3>
                    <button id="renamer-settings-close" class="renamer-btn-icon" title="${t('close')}">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                </div>
                <div id="renamer-settings-content" style="overflow-y:auto;flex:1;min-height:200px;"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#renamer-settings-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#renamer-settings-back').addEventListener('click', () => {
            overlay.remove();
            showSettingsPanel();
        });
        return overlay;
    }

    function showRulesSubPanel() {
        const overlay = showSubPanel();
        if (!overlay) return;
        overlay.querySelector('#renamer-sub-title').textContent = t('manageSavedRules') || 'Règles sauvegardées';
        renderSettingsSavedRules();
    }

    function showTranslationsSubPanel() {
        const overlay = showSubPanel();
        if (!overlay) return;
        overlay.querySelector('#renamer-sub-title').textContent = t('manageTranslations') || 'Traductions';
        renderSettingsTranslations();
    }

    function renderSettingsSavedRules() {
        const content = document.getElementById('renamer-settings-content');
        if (!content) return;
        content.innerHTML = '<div style="opacity:0.6;text-align:center;padding:20px;">Chargement...</div>';
        fetch(getBaseUrl() + '/api/rules', { method: 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const allRules = (data && data.user) ? data.user : [];
                if (!allRules.length) {
                    content.innerHTML = '<div class="renamer-rule-popup-empty">' + escapeHtml(t('noSavedRules') || 'Aucune règle sauvegardée') + '</div>';
                    return;
                }
                let html = '<div class="renamer-settings-list">';
                allRules.forEach(rule => {
                    html += '<div class="renamer-settings-item" data-rule-id="' + rule.id + '">';
                    html += '<div class="renamer-settings-item-name">' + escapeHtml(rule.name) + ' <span class="renamer-rule-popup-meta">' + escapeHtml(rule.mode) + '</span></div>';
                    html += '<div class="renamer-settings-item-actions">';
                    html += '<button class="renamer-btn renamer-btn-small" data-action="rename">' + escapeHtml(t('rename') || 'Renommer') + '</button>';
                    html += '<button class="renamer-btn renamer-btn-small" data-action="delete">' + escapeHtml(t('delete') || 'Supprimer') + '</button>';
                    html += '<button class="renamer-btn renamer-btn-small" data-action="load">' + escapeHtml(t('load') || 'Charger') + '</button>';
                    html += '</div></div>';
                });
                html += '</div>';
                content.innerHTML = html;

                content.querySelectorAll('.renamer-settings-item').forEach(item => {
                    const ruleId = parseInt(item.dataset.ruleId, 10);
                    item.querySelector('[data-action="load"]').addEventListener('click', function() {
                        fetch(getBaseUrl() + '/api/rules', { method: 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
                            .then(r => r.json())
                            .then(d => {
                                const rule = (d.user || []).find(r => r.id === ruleId);
                                if (rule) {
                                    const newRule = Object.assign({}, rule);
                                    delete newRule.id;
                                    newRule.dbId = rule.id;
                                    newRule.saved_rule = true;
                                    newRule.translationKey = rule.translationKey || null;
                                    if (newRule.enabled === undefined) newRule.enabled = true;
                                    state.rules.push(newRule);
                                    renderRules();
                                    updatePreview();
                                    showToast(t('ruleLoaded') || 'Règle chargée', 'success');
                                }
                            });
                    });
                    item.querySelector('[data-action="delete"]').addEventListener('click', function() {
                        showConfirmDialog(
                            t('delete') || 'Supprimer',
                            t('confirmDelete') || 'Supprimer cette règle ?',
                            function() {
                                apiRequest(getBaseUrl() + '/api/rules/' + ruleId, { method: 'DELETE' })
                                    .then(() => {
                                        showToast(t('ruleDeleted') || 'Règle supprimée', 'success');
                                        renderSettingsSavedRules();
                                    })
                                    .catch(err => {
                                        showToast((t('deleteError') || 'Erreur lors de la suppression') + ': ' + err.message, 'error');
                                    });
                            }
                        );
                    });
                    item.querySelector('[data-action="rename"]').addEventListener('click', function() {
                        const rule = allRules.find(r => r.id === ruleId);
                        if (!rule) return;
                        showSettingsRenameDialog(rule, () => renderSettingsSavedRules());
                    });
                });
            });
    }

    function showSettingsRenameDialog(rule, onSaved) {
        const existing = document.getElementById('renamer-settings-rename');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'renamer-settings-rename';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:400px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3>${t('rename') || 'Renommer'}</h3>
                </div>
                <div class="renamer-field">
                    <label>${escapeHtml(t('ruleName') || 'Nom de la règle')}</label>
                    <input type="text" id="renamer-settings-rename-input" value="${escapeHtml(rule.name)}" />
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="renamer-btn" data-action="cancel">${t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" data-action="save">${t('save')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#renamer-settings-rename-input');
        if (input) { input.focus(); input.select(); }
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('[data-action="save"]').addEventListener('click', () => {
            const newName = input ? input.value.trim() : '';
            if (!newName) return;
            const payload = {
                name: newName,
                mode: rule.mode,
                pattern: rule.pattern,
                replacement: rule.replacement,
                target: rule.target,
                sequenceType: rule.sequenceType,
                startValue: rule.startValue,
                zeroPadding: rule.zeroPadding,
                enabled: rule.enabled,
                filterMode: rule.filterMode,
                extensions: rule.extensions,
                translationKey: rule.translationKey || null,
            };
            fetch(getBaseUrl() + '/api/rules/' + rule.id, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json()).then(data => {
                if (data.id) {
                    showToast(t('ruleRenamed') || 'Règle renommée', 'success');
                    if (rule.translationKey) {
                        saveCustomTranslation(rule.translationKey, newName).catch(() => {});
                        if (!translations[state.lang]) translations[state.lang] = {};
                        translations[state.lang][rule.translationKey] = newName;
                    }
                    overlay.remove();
                    if (onSaved) onSaved();
                }
            });
        });
    }

    function renderSettingsTranslations() {
        const content = document.getElementById('renamer-settings-content');
        if (!content) return;
        fetch(getBaseUrl() + '/api/translations', { method: 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const lang = state.lang;
                const trs = (data && data.translations) ? data.translations : {};
                const keys = Object.keys(trs);
                if (!keys.length) {
                    content.innerHTML = '<div class="renamer-rule-popup-empty">' + escapeHtml(t('noTranslations') || 'Aucune traduction') + '</div>';
                    return;
                }
                let html = '<div class="renamer-settings-translations">';
                keys.sort().forEach(key => {
                    html += '<div class="renamer-settings-item" data-translation-key="' + escapeHtml(key) + '">';
                    html += '<div class="renamer-settings-item-name"><code>' + escapeHtml(key) + '</code></div>';
                    html += '<div class="renamer-field" style="margin-top:6px;">';
                    html += '<input type="text" data-original="' + escapeHtml(trs[key]) + '" value="' + escapeHtml(trs[key]) + '" />';
                    html += '</div>';
                    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">';
                    html += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" data-action="save">' + escapeHtml(t('save') || 'Enregistrer') + '</button>';
                    html += '</div></div>';
                });
                html += '</div>';
                content.innerHTML = html;
                content.querySelectorAll('.renamer-settings-item[data-translation-key]').forEach(item => {
                    const key = item.dataset.translationKey;
                    item.querySelector('[data-action="save"]').addEventListener('click', function() {
                        const input = item.querySelector('input');
                        if (!input) return;
                        const newVal = input.value.trim();
                        if (!newVal) return;
                        saveCustomTranslation(key, newVal).then(() => {
                            if (!translations[lang]) translations[lang] = {};
                            translations[lang][key] = newVal;
                            showToast(t('translationSaved') || 'Traduction enregistrée', 'success');
                        });
                    });
                });
            });
    }

    function showSaveRuleDialog(index, onConfirm) {
        const rule = state.rules[index];
        if (!rule) return;
        const existing = document.getElementById('renamer-save-rule-dialog');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'renamer-save-rule-dialog';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10004;display:flex;align-items:center;justify-content:center;';
        const isReSave = rule.saved_rule && rule.dbId;
        let extraActions = '';
        if (isReSave) {
            extraActions = '<button class="renamer-btn" data-action="overwrite">' + escapeHtml(t('overwrite') || 'Écraser l\'ancienne') + '</button>';
        }
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3>${isReSave ? (t('resaveRule') || 'Re-sauvegarder la règle') : (t('saveRuleTitle') || 'Sauvegarder la règle')}</h3>
                </div>
                <div class="renamer-field">
                    <label>${escapeHtml(t('ruleName') || 'Nom de la règle')} (${state.lang === 'fr' ? 'Français' : 'English'})</label>
                    <input type="text" id="renamer-save-rule-input" value="${escapeHtml(rule.name || '')}" />
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                    <button class="renamer-btn" data-action="cancel">${t('cancel')}</button>
                    ${extraActions}
                    <button class="renamer-btn renamer-btn-primary" data-action="create">${escapeHtml(isReSave ? (t('createNew') || 'Créer nouvelle') : (t('save') || 'Enregistrer'))}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#renamer-save-rule-input');
        if (input) { input.focus(); input.select(); }
        const close = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
        const doSave = (overwrite) => {
            const newName = input ? input.value.trim() : '';
            if (!newName) return;
            close();
            onConfirm(newName, overwrite);
        };
        const createBtn = overlay.querySelector('[data-action="create"]');
        if (createBtn) createBtn.addEventListener('click', () => doSave(false));
        const overwriteBtn = overlay.querySelector('[data-action="overwrite"]');
        if (overwriteBtn) overwriteBtn.addEventListener('click', () => doSave(true));
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); doSave(false); }
            else if (e.key === 'Escape') { close(); }
        });
    }

    function runRename() {
        const selectedSet = (state.allSelected) ? null : state.fileSelection;
        const selectedFiles = state.files.filter(function(f) {
            if (!selectedSet) return true;
            return selectedSet.has(f);
        });
        const preview = RenamerUtils.computePreview(state.files, state.rules, selectedSet);
        const renames = preview
            .filter(function(item) {
                if (!item.changed || item.skipped) return false;
                if (item.empty === true) return false;
                if (item.deselected === true) return false;
                return true;
            })
            .map(item => ({ from: item.from, to: item.to }));

        if (!renames.length) {
            showToast(t('noChanges') || 'Aucun renommage à effectuer.', 'error');
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
            paths: selectedFiles,
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
                const renamedList = body.renamed || [];
                const errorsList = body.errors || [];
                const skippedList = body.skipped || [];
                const failedPaths = new Set();
                renamedList.forEach(function(r) { if (r.from) failedPaths.add(r.from); });
                errorsList.forEach(function(e) {
                    const m = String(e).match(/rename ([^:]+):/);
                    if (m) failedPaths.add(m[1].trim());
                });
                skippedList.forEach(function(s) {
                    const p = String(s).split(' ')[0];
                    if (p) failedPaths.add(p);
                });
                state.files = state.files.filter(function(f) { return !failedPaths.has(f); });
                applyRenamedToInternalState(renamedList);
                state.rules = [];
                renderRules();
                updatePreview();
                updateRunButtonState();
                const renamedCount = renamedList.length;
                const errorsCount = errorsList.length;
                const skippedCount = skippedList.length;
                if (renamedCount > 0) {
                    showToast(
                        'Noms mis à jour dans l\'outil. Si vous souhaitez les voir à jour hors de l\'app, il vous faudra rafraîchir la page.',
                        'success',
                        { persistent: true, detail: true, onDetail: function() { showRenameDetails(renamedList, skippedList, errorsList); } }
                    );
                }
                if (errorsCount > 0) {
                    showToast(
                        t('errors') + ' : ' + errorsCount + ' — ' + errorsList.join(' ; '),
                        'error',
                        { persistent: true, detail: true, onDetail: function() { showRenameDetails(renamedList, skippedList, errorsList); } }
                    );
                } else if (skippedCount > 0) {
                    showToast(
                        t('renamed') + ' : ' + renamedCount + ', ' + t('skipped') + ' : ' + skippedCount,
                        'info',
                        { persistent: true, detail: true, onDetail: function() { showRenameDetails(renamedList, skippedList, errorsList); } }
                    );
                }
            } else {
                showToast('Erreur: ' + (body.error || 'Réponse inattendue'), 'error', { persistent: true });
            }
        }).catch(err => {
            if (modal) {
                modal.classList.remove('renamer-loading');
                const loader = document.getElementById('renamer-loader');
                if (loader) loader.remove();
            }
            showToast('Erreur: ' + err.message, 'error', { persistent: true });
        });
    }

    function applyRenamedToInternalState(renamedList) {
        if (!renamedList || !renamedList.length) return;
        const map = new Map();
        const basenameMap = new Map();
        renamedList.forEach(function(r) {
            if (r && r.from && r.to) {
                map.set(r.from, r.to);
                const baseFrom = r.from.replace(/^.*\//, '');
                const baseTo = r.to.replace(/^.*\//, '');
                if (baseFrom) basenameMap.set(baseFrom, baseTo);
            }
        });
        state.files = state.files.map(function(f) {
            if (map.has(f)) return map.get(f);
            const base = f.replace(/^.*\//, '');
            if (basenameMap.has(base)) {
                const dir = f.replace(/\/[^/]*$/, '');
                return (dir ? dir + '/' : '') + basenameMap.get(base);
            }
            return f;
        });
        console.log('[Renamer] state.files after apply:', JSON.stringify(state.files));
    }

    function clearRenamedFromState(renamedList) {
        if (!renamedList || !renamedList.length) return;
        const renamedPaths = new Set(renamedList.map(r => r.from || r));
        state.files = state.files.filter(f => !renamedPaths.has(f));
        if (state.files.length === 0) {
            closeDialog();
            return;
        }
    }

    function updateRunButtonState() {
        const runBtn = document.getElementById('renamer-run');
        if (!runBtn) return;
        if (!state.rules || !state.rules.length || !state.files || !state.files.length) {
            runBtn.disabled = true;
            runBtn.style.opacity = '0.5';
            runBtn.style.cursor = 'not-allowed';
            runBtn.title = 'Aucune règle ou fichier';
            return;
        }
        const preview = RenamerUtils.computePreview(state.files, state.rules);
        const hasChanges = preview.some(item => item.changed && !item.skipped && item.empty !== true);
        const allEmptyOrDeselected = preview.every(item => item.empty === true || item.deselected === true || item.skipped || !item.changed);
        runBtn.disabled = !hasChanges;
        runBtn.style.opacity = hasChanges ? '' : '0.5';
        runBtn.style.cursor = hasChanges ? '' : 'not-allowed';
        runBtn.title = hasChanges ? '' : 'Impossible de renommer, aucune opération valable';
        if (allEmptyOrDeselected && hasChanges === false) {
            runBtn.title = 'Impossible de renommer, aucune opération valable';
        }
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

    function showStatus(message, type, options) {
        options = options || {};
        const status = document.getElementById('renamer-status') || buildStatusElement();
        status.className = 'renamer-status ' + (type || 'info');
        const dismissible = options.dismissible !== false;
        const textHtml = '<span class="renamer-status-text"></span>';
        const closeHtml = dismissible ? '<button class="renamer-status-close" type="button" aria-label="Fermer">×</button>' : '';
        status.innerHTML = textHtml + closeHtml;
        status.querySelector('.renamer-status-text').textContent = message;
        const closeBtn = status.querySelector('.renamer-status-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                status.style.display = 'none';
                status.className = 'renamer-status';
                status.innerHTML = '';
            });
        }
        status.style.display = 'flex';
    }

    function clearStatus() {
        const status = document.getElementById('renamer-status');
        if (status) {
            status.style.display = 'none';
            status.className = 'renamer-status';
            status.innerHTML = '';
        }
    }

    function closeDialog() {
        const overlay = document.getElementById('renamer-overlay');
        if (overlay) overlay.remove();
    }

    function init() {
        // Action registration is handled by rename.js to avoid duplicates
        // This init only ensures the app is ready for use
    }

    if (typeof OC !== 'undefined') {
        try { init(); } catch (e) { console.warn('[Renamer] init failed', e); }
    }

    return {
        openDialog: openDialog,
        registerTab: registerTab,
        getTab: getTab,
        listTabs: listTabs,
        tabs: tabs,
    };
})();
