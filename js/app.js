const RenamerApp = (function() {
    'use strict';

    const CHECK_SVG = window.RenamerIcons.CHECK;
    const UNCHECK_SVG = window.RenamerIcons.UNCHECK;
    const CLOSE_SVG = window.RenamerIcons.CLOSE;
    const BACK_SVG = window.RenamerIcons.BACK;
    const DELETE_SVG = window.RenamerIcons.DELETE;
    const EDIT_ICON_SVG = window.RenamerIcons.EDIT;
    const DRAG_HANDLE_SVG = window.RenamerIcons.DRAG;
    const FILTER_SVG = window.RenamerIcons.FILTER;
    const SETTINGS_GEAR_SVG = window.RenamerIcons.SETTINGS_GEAR;
    const EXPAND_SVG = window.RenamerIcons.EXPAND;
    const COLLAPSE_SVG = window.RenamerIcons.COLLAPSE;
    const POPUP_ARROW_SVG = window.RenamerIcons.POPUP_ARROW;
    const ARROW_LEFT_RIGHT_SVG = window.RenamerIcons.ARROW_LEFT_RIGHT;
    const SETTINGS_DOTS_SVG = window.RenamerIcons.SETTINGS_DOTS;
    const DUPLICATE_SVG = window.RenamerIcons.DUPLICATE;
    const EDIT_MULTI_SVG = window.RenamerIcons.EDIT_MULTI;
    const FOLDER_SVG = '<span class="icon-vue" style="width:20px;height:20px;display:flex;">' + window.RenamerIcons.FOLDER + '</span>';

    const baseUrl = (typeof OC !== 'undefined' && OC.getBaseUrl) ? OC.getBaseUrl() : '';

    function loadNavigationScript() {
        if (typeof RenamerNavigation !== 'undefined') {
            console.log('[Renamer] loadNavigationScript: RenamerNavigation already available');
            return Promise.resolve(RenamerNavigation);
        }
        var existingScript = document.querySelector('script[src*="navigation.js"]');
        if (existingScript) {
            console.log('[Renamer] loadNavigationScript: script tag already present', existingScript.src);
            return new Promise(function(resolve, reject) {
                var timeout = setTimeout(function() {
                    console.warn('[Renamer] loadNavigationScript: timeout waiting for RenamerNavigation');
                    reject(new Error('timeout waiting for RenamerNavigation'));
                }, 3000);
                var interval = setInterval(function() {
                    if (typeof RenamerNavigation !== 'undefined') {
                        clearTimeout(timeout);
                        clearInterval(interval);
                        console.log('[Renamer] loadNavigationScript: RenamerNavigation ready after wait');
                        resolve(RenamerNavigation);
                    }
                }, 100);
            });
        }
        console.log('[Renamer] loadNavigationScript: baseUrl=', baseUrl, 'will create script');
        if (!baseUrl) {
            return Promise.reject(new Error('No baseUrl'));
        }
        return new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = baseUrl + '/js/navigation.js';
            console.log('[Renamer] loadNavigationScript: creating script', script.src);
            script.onload = function() {
                console.log('[Renamer] loadNavigationScript: script onload fired for', script.src);
                var timeout = setTimeout(function() {
                    console.warn('[Renamer] loadNavigationScript: timeout after onload, RenamerNavigation=', typeof RenamerNavigation);
                    reject(new Error('timeout after onload waiting for RenamerNavigation'));
                }, 3000);
                var check = setInterval(function() {
                    console.log('[Renamer] loadNavigationScript: polling RenamerNavigation=', typeof RenamerNavigation);
                    if (typeof RenamerNavigation !== 'undefined') {
                        clearTimeout(timeout);
                        clearInterval(check);
                        console.log('[Renamer] loadNavigationScript: RenamerNavigation ready after onload');
                        resolve(RenamerNavigation);
                    }
                }, 100);
            };
            script.onerror = function() {
                console.warn('[Renamer] loadNavigationScript: script onerror for', script.src);
                reject(new Error('navigation.js failed to load'));
            };
            document.head.appendChild(script);
            console.log('[Renamer] loadNavigationScript: script appended to head');
        });
    }

    loadNavigationScript().catch(function(err) {
        console.warn('[Renamer] navigation.js unavailable:', err);
    });

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
        metadataRules: [],
        metadataFileSelection: new Set(),
        metadataAllSelected: true,
        manualOverrides: {},
        metadataFileMetaCache: {},
        tabOrder: null,
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
            appName: 'Edit multiple files',
            advancedTab: 'Renommage avancé de fichiers et dossiers',
            metadataTab: 'Renommage DES METADATA',
            pdfTab: 'Manipulation PDF',
            convertPdfToCbz: 'Convertir PDF en CBZ 1 par 1',
            noPdfSelected: 'Aucun fichier PDF sélectionné',
            pdfConvertComplete: 'Conversion PDF → CBZ terminée',
            pdfConverted: 'Convertis',
            pdfSkipped: 'Ignorés',
            pdfErrors: 'Erreurs',
            convertInProgress: 'Conversion en cours...',
            pdfConvertDescription: 'Rasterise chaque page en PNG et assemble en CBZ (compatible Kavita).',
            metadataFormat: 'Format de sortie',
            metadataPresets: 'Préréglages',
            metadataPreview: 'Aperçu',
            metadataNoMetadata: 'Pas de métadonnées',
            metadataArtist: 'Artiste',
            metadataTitle: 'Titre',
            metadataAlbum: 'Album',
            metadataTrack: 'Piste',
            metadataYear: 'Année',
            metadataGenre: 'Genre',
            metadataApply: 'Appliquer',
            metadataReset: 'Réinitialiser',
            runRename: 'Edit multiple files',
            metadataApplyConfirmTitle: 'Confirmer l\'application',
            metadataApplyConfirmOverwrite: 'Écraser le renommage manuel',
            metadataApplyConfirmIgnore: 'Ignorer les fichiers modifiés manuellement',
            metadataWriteSuccess: 'Métadonnées mises à jour avec succès',
            metadataWriteError: 'Erreur lors de l\'écriture des métadonnées',
            metadataUnsupportedType: 'Type non supporté',
            metadataReadOnly: 'Lecture seule',
            metadataUpdated: 'Modifié',
            metadataCopyClipboard: 'Copier',
            metadataManualEdit: 'Édition manuelle',
            metadataManualEditTitle: 'Éditer les métadonnées',
            metadataBreadcrumbRoot: 'Racine',
            navigationBreadcrumbRoot: 'Racine',
            metadataFolderParent: 'Dossier parent',
            metadataEnterFolder: 'Entrer',
            metadataCurrentFolder: 'Dossier courant',
            close: 'Fermer',
            reduce: 'Réduire',
            expand: 'Agrandir',
            cancel: 'Annuler',
            filename: 'Fichier',
            selectAll: 'Tout',
            deselectAll: 'Tout désélectionner',
            selected: 'sélectionnés',
            filter: 'Filtrer',
            metadataSearch: 'Rechercher...',
            metadataFilter: 'Filtrer les colonnes',
            metadataFilterColumns: 'Colonnes affichées',
            metadataNoRules: 'Aucune règle',
            metadataSearchNotFound: 'Aucune metadata trouvée avec : ',
            metadataLazyLoaded: 'fichiers chargés',
            metadataLoadRemaining: 'Charger les manquants',
            metadataAlwaysLoadAll: 'Toujours tout charger malgré le nb de fichiers',
            metadataLazyThresholdReached: '50 fichiers chargés, charger les manquants ?',
            metadataLoadingBatch: 'Chargement du lot suivant...',
            metadataListen: 'Écouter',
            metadataPause: 'Pause',
            metadataDuration: 'Durée',
            metadataAddedOn: 'Ajouté le',
            metadataHistoryEmpty: 'Aucun historique',
            metadataEnqueue: 'Ajouter à la file d\'attente',
            metadataQueuePosition: 'Position dans la file',
            metadataPlaybackError: 'Erreur de lecture audio',
            rename: 'Renommer',
            preview: 'Aperçu',
            flat: 'Vue plate',
            folders: 'Dossiers',
            exportAllTranslations: 'Exporter toutes les traductions',
            importAllTranslations: 'Importer toutes les traductions',
            translationsExported: 'Traductions exportées',
            translationsImported: 'Traductions importées',
            importTranslationsSuccess: 'Traductions importées avec succès',
            exportError: 'Erreur lors de l\'export',
            importError: 'Erreur lors de l\'import',
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
            addTranslation: 'Ajouter une traduction',
            translationKey: 'Clé',
            translationText: 'Texte',
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
            deselectDeselected: 'Désélectionné — cliquer pour resélectionner',
            emptyNotAllowed: 'Nom vide — non autorisé',
            clickToDeselect: 'Cliquer pour désélectionner',
            noApplicableRule: 'Aucune règle applicable — cliquer pour désélectionner',
            swapRule: 'Inverser',
            deselectAllTitle: 'Désélectionner Tout',
            selectOrDeselect: 'Sélectionner/Désélectionner',
            edit: 'Modifier',
            detailsTitle: 'Détail des renommages',
            pdfDetailsTitle: 'Détail des conversions',
            pdfConvertedLabel: 'Convertis',
            switchToEn: 'Passer en anglais',
            switchToFr: 'Passer en français',
            generalSettings: 'Paramètres généraux',
            advancedSettings: 'Paramètres de renommage avancé',
            settingsNotAvailableOutsideTab: 'Paramètres Non réglables hors de l\'onglet',
            tabOrder: 'Ordre des onglets',
            tabOrderSaved: 'Ordre des onglets enregistré',
            tabOrderError: 'Erreur lors de l\'enregistrement de l\'ordre des onglets',
            moveUp: 'Monter',
            moveDown: 'Descendre',
            tabOrderDescription: 'Glissez-déposez pour réorganiser les onglets',
            switchLang: 'Langue',
        },
        en: {
            appName: 'Edit multiple files',
            advancedTab: 'Advanced files & Folder renaming',
            metadataTab: 'Metadata renaming',
            pdfTab: 'PDF manipulation',
            convertPdfToCbz: 'Convert PDF to CBZ 1 by 1',
            noPdfSelected: 'No PDF files selected',
            pdfConvertComplete: 'PDF → CBZ conversion complete',
            pdfConverted: 'Converted',
            pdfSkipped: 'Skipped',
            pdfErrors: 'Errors',
            convertInProgress: 'Converting...',
            pdfConvertDescription: 'Rasterize each page to PNG and assemble into a CBZ (Kavita-compatible).',
            metadataFormat: 'Output format',
            metadataPresets: 'Presets',
            metadataPreview: 'Preview',
            metadataNoMetadata: 'No metadata',
            metadataArtist: 'Artist',
            metadataTitle: 'Title',
            metadataAlbum: 'Album',
            metadataTrack: 'Track',
            metadataYear: 'Year',
            metadataGenre: 'Genre',
            metadataApply: 'Apply',
            metadataReset: 'Reset',
            runRename: 'Edit multiple files',
            metadataApplyConfirmTitle: 'Confirm apply',
            metadataApplyConfirmOverwrite: 'Overwrite manual edits',
            metadataApplyConfirmIgnore: 'Ignore manually edited files',
            metadataWriteSuccess: 'Metadata updated successfully',
            metadataWriteError: 'Error writing metadata',
            metadataUnsupportedType: 'Unsupported type',
            metadataReadOnly: 'Read-only',
            metadataUpdated: 'Updated',
            metadataCopyClipboard: 'Copy',
            metadataManualEdit: 'Manual edit',
            metadataManualEditTitle: 'Edit metadata',
            metadataBreadcrumbRoot: 'Root',
            navigationBreadcrumbRoot: 'Root',
            metadataFolderParent: 'Parent folder',
            metadataEnterFolder: 'Enter',
            metadataCurrentFolder: 'Current folder',
            close: 'Close',
            reduce: 'Reduce',
            expand: 'Expand',
            cancel: 'Cancel',
            filename: 'File',
            selectAll: 'Select All',
            deselectAll: 'Deselect All',
            selected: 'selected',
            filter: 'Filter',
            metadataSearch: 'Search...',
            metadataFilter: 'Filter columns',
            metadataFilterColumns: 'Visible columns',
            metadataNoRules: 'No rules',
            metadataSearchNotFound: 'No metadata found for: ',
            metadataLazyLoaded: 'files loaded',
            metadataLoadRemaining: 'Load remaining',
            metadataAlwaysLoadAll: 'Always load all files regardless of count',
            metadataLazyThresholdReached: '50 files loaded, load the remaining ones?',
            metadataLoadingBatch: 'Loading next batch...',
            metadataListen: 'Listen',
            metadataPause: 'Pause',
            metadataDuration: 'Duration',
            metadataAddedOn: 'Added on',
            metadataHistoryEmpty: 'No history',
            metadataEnqueue: 'Add to queue',
            metadataQueuePosition: 'Queue position',
            metadataPlaybackError: 'Audio playback error',
            rename: 'Rename',
            preview: 'Preview',
            flat: 'Flat',
            folders: 'Folders',
            exportAllTranslations: 'Export all translations',
            importAllTranslations: 'Import all translations',
            translationsExported: 'Translations exported',
            translationsImported: 'Translations imported',
            importTranslationsSuccess: 'Translations imported successfully',
            exportError: 'Export error',
            importError: 'Import error',
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
            addTranslation: 'Add translation',
            translationKey: 'Key',
            translationText: 'Text',
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
            deselectDeselected: 'Deselected — click to reselect',
            emptyNotAllowed: 'Empty name — not allowed',
            clickToDeselect: 'Click to deselect',
            noApplicableRule: 'No applicable rule — click to deselect',
            swapRule: 'Swap',
            deselectAllTitle: 'Deselect All',
            selectOrDeselect: 'Select/Deselect',
            edit: 'Edit',
            detailsTitle: 'Rename details',
            pdfDetailsTitle: 'Conversion details',
            pdfConvertedLabel: 'Converted',
            switchToEn: 'Switch to English',
            switchToFr: 'Switch to French',
            generalSettings: 'General settings',
            advancedSettings: 'Advanced renaming settings',
            settingsNotAvailableOutsideTab: 'Settings not available outside this tab',
            tabOrder: 'Tab order',
            tabOrderSaved: 'Tab order saved',
            tabOrderError: 'Error saving tab order',
            moveUp: 'Move up',
            moveDown: 'Move down',
            tabOrderDescription: 'Drag and drop to reorder tabs',
            switchLang: 'Language',
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

        if (state.activeTab !== 'metadata') {
            renderRules();
            updatePreview();
        }

        const tabsContainer = document.getElementById('renamer-tabs');
        if (tabsContainer) {
            const orderedTabIds = state.tabOrder && state.tabOrder.length ? state.tabOrder.filter(id => tabs[id]) : Object.keys(tabs);
            tabsContainer.querySelectorAll('.renamer-tab').forEach(function(btn, idx) {
                const id = btn.dataset.tab;
                const tabDef = tabs[id];
                if (tabDef) {
                    const icon = idx === 0 ? '<span style="display:inline-flex;align-items:center;margin-right:4px;">' + EDIT_MULTI_SVG + '</span>' : '';
                    btn.innerHTML = icon + escapeHtml(t(tabDef.labelKey));
                }
            });
        }

        document.querySelectorAll('[data-translation]').forEach(function(el) {
            if (el.classList.contains('renamer-tab')) return;

            const key = el.dataset.translation;
            const text = t(key);
            if (!text || text === key) return;

            if (el.id === 'renamer-run') return;

            const children = Array.from(el.children);
            const hasNonSvgChildren = children.some(function(child) { return child.tagName !== 'SVG'; });
            if (hasNonSvgChildren) return;

            if (el.tagName === 'BUTTON') {
                if (!el.textContent.trim() && el.querySelector('svg')) {
                    el.title = text;
                    return;
                }
                if (el.textContent.trim() === '×') return;
                el.textContent = text;
                return;
            }

            if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                el.placeholder = text;
                return;
            }

            el.textContent = text;
        });

        const runBtn = document.getElementById('renamer-run');
        if (runBtn) {
            runBtn.innerHTML = EDIT_MULTI_SVG + ' ' + t('runRename');
        }
    }

    function escapeHtml(str) {
        return RenamerUtils.escapeHtml(str);
    }

    function showRenameDetails(renamedList, skippedList, errorsList, options) {
        options = options || {};
        const title = options.title || t('detailsTitle') || 'Détail des renommages';
        const renamedLabel = options.renamedLabel || t('renamed') || 'Renommés';
        const skippedLabel = options.skippedLabel || t('skipped') || 'Ignorés';
        const errorsLabel = options.errorsLabel || t('errors') || 'Erreurs';
        const titleKey = options.titleKey || 'detailsTitle';
        const renamedKey = options.renamedLabelKey || 'renamed';
        const skippedKey = options.skippedLabelKey || 'skipped';
        const errorsKey = options.errorsLabelKey || 'errors';
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
                    <h3 style="margin:0;" data-translation="${titleKey}">${escapeHtml(title)}</h3>
                    <button class="renamer-btn-icon" data-action="close-details" aria-label="Fermer">
                        ${CLOSE_SVG}
                    </button>
                </div>
                <div style="overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
                    <div>
                        <h4 style="margin:0 0 6px 0;color:var(--nc-green);" data-translation="${renamedKey}">${escapeHtml(renamedLabel)} (${(renamedList || []).length})</h4>
                        <ul class="renamer-details-list renamer-details-renamed">${renamedHtml}</ul>
                    </div>
                    <div>
                        <h4 style="margin:0 0 6px 0;color:var(--nc-orange);" data-translation="${skippedKey}">${escapeHtml(skippedLabel)} (${(skippedList || []).length})</h4>
                        <ul class="renamer-details-list renamer-details-skipped">${skippedHtml}</ul>
                    </div>
                    <div>
                        <h4 style="margin:0 0 6px 0;color:var(--nc-red);" data-translation="${errorsKey}">${escapeHtml(errorsLabel)} (${(errorsList || []).length})</h4>
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
        const closeIcon = '<button class="renamer-modal-close" aria-label="' + escapeHtml(t('close')) + '" title="' + escapeHtml(t('close')) + '" role="button" data-translation="close">×</button>';
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:440px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                ${closeIcon}
                <div class="renamer-header" style="padding:0;">
                    <h3 data-translation="${options.titleKey || 'confirmTitle'}">${escapeHtml(title)}</h3>
                </div>
                <div style="font-size:14px;color:var(--nc-text);line-height:1.4;">${escapeHtml(message)}</div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
                    <button class="renamer-btn" data-action="cancel" data-translation="${options.cancelLabelKey || 'cancel'}">${escapeHtml(cancelLabel)}</button>
                    <button class="renamer-btn ${isDanger ? 'renamer-btn-danger' : 'renamer-btn-primary'}" data-action="confirm" data-translation="${options.confirmLabelKey || 'confirm'}">${escapeHtml(confirmLabel)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const close = () => { overlay.remove(); };
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        const escHandler = function(e) { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); document.removeEventListener('keydown', escHandler, true); } };
        document.addEventListener('keydown', escHandler, true);
        overlay.querySelector('.renamer-modal-close').addEventListener('click', close);
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            close();
            document.removeEventListener('keydown', escHandler, true);
            if (typeof options.onCancel === 'function') options.onCancel();
        });
        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
            close();
            document.removeEventListener('keydown', escHandler, true);
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
                gap: 8px;
                padding: 8px 12px;
                border-bottom: 1px solid var(--nc-border);
                transition: var(--nc-transition);
                position: relative;
            }

            .renamer-header h3 {
                margin: 0;
                font-size: 18px;
            }

            .renamer-tabs {
                display: flex;
                gap: 4px;
                flex: 1;
                overflow-x: auto;
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
                white-space: nowrap;
            }

            .renamer-tab:hover {
                background: rgba(0,130,201,0.1);
            }

            .renamer-tab.active {
                background: var(--nc-blue);
                color: #fff;
            }

            .renamer-header-actions {
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            }

            .renamer-header .renamer-burger-btn {
                display: none;
            }

            @media (max-width: 768px) {
                .renamer-header {
                    flex-wrap: wrap;
                }

                .renamer-header .renamer-burger-btn {
                    display: flex;
                }

                .renamer-tabs {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--nc-bg);
                    border-bottom: 1px solid var(--nc-border);
                    padding: 8px;
                    flex-direction: column;
                    gap: 4px;
                    z-index: 100;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    overflow-y: auto;
                    max-height: 60vh;
                }

                .renamer-tabs.open {
                    display: flex;
                }
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

            #renamer-breadcrumb {
                margin-right: auto;
                flex: 1;
                min-width: 0;
            }

            #renamer-breadcrumb .navigation-breadcrumb {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 2px;
            }

            #renamer-breadcrumb .breadcrumb__crumbs {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 2px;
                list-style: none;
                margin: 0;
                padding: 0;
            }

            #renamer-breadcrumb .navigation-crumb {
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }

            #renamer-breadcrumb .navigation-crumb a {
                text-decoration: none;
            }

            #renamer-breadcrumb .navigation-crumb.active a {
                cursor: default;
                pointer-events: none;
            }

            #renamer-breadcrumb .vue-crumb__separator {
                display: inline-flex;
                align-items: center;
                opacity: 0.7;
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
                background-color: var(--nc-bg);
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
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                font-size: 11px;
                font-weight: bold;
                color: #4F6071;
                flex-shrink: 0;
                transition: var(--nc-transition);
                cursor: pointer;
                border: none;
                font-family: inherit;
                padding: 0;
                box-sizing: border-box;
                background-color: var(--nc-bg);
            }

            .renamer-badge-success {
                background-color: var(--nc-bg);
                color: #4F6071;
            }

            .renamer-badge-neutral {
                background-color: var(--nc-bg);
                color: #4F6071;
            }

            .renamer-badge-error {
                background-color: var(--nc-bg);
                color: #4F6071;
            }

            .renamer-badge-deselected {
                background-color: var(--nc-bg);
                color: #4F6071;
            }

            button.renamer-badge-toggle {
                cursor: pointer;
            }

            button.renamer-badge-toggle:hover {
                transform: scale(1.15);
                background: #cbd5e1;
                color: #64748b;
            }

            button.renamer-badge-success.renamer-badge-toggle:hover {
                background: #cbd5e1;
                color: #64748b;
                box-shadow: 0 0 0 2px rgba(148,163,184,0.3);
            }

            button.renamer-badge-deselected.renamer-badge-toggle:hover {
                background: #cbd5e1;
                color: #64748b;
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

            .renamer-modal-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 4px;
                opacity: 0.5;
                font-size: 24px;
                line-height: 1;
            }
            .renamer-modal-close:hover {
                opacity: 1;
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

            .metadata-preview-row {
                flex-direction: column;
                align-items: stretch;
                gap: 6px;
                padding: 8px;
            }

            .metadata-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
                flex: 1;
                min-width: 0;
            }

            .metadata-filename {
                font-size: 13px;
                font-weight: 500;
                word-break: break-word;
            }

            .metadata-fields {
                display: flex;
                flex-wrap: wrap;
                gap: 4px 12px;
                font-size: 12px;
                color: var(--nc-text);
                opacity: 0.9;
            }

            .metadata-field {
                white-space: nowrap;
            }

            .metadata-no-data {
                font-size: 12px;
                opacity: 0.6;
                font-style: italic;
            }

            .metadata-result {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                flex-wrap: wrap;
            }

            .metadata-from {
                text-decoration: line-through;
                opacity: 0.7;
            }

            .metadata-to {
                font-weight: 500;
                color: var(--nc-green);
            }

            .metadata-arrow {
                color: var(--nc-blue);
                font-size: 16px;
            }

            .renamer-preset-btn {
                padding: 3px 8px;
                font-size: 11px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: 4px;
                cursor: pointer;
                transition: var(--nc-transition);
                white-space: nowrap;
            }

            .renamer-preset-btn:hover {
                background: rgba(0,0,0,0.05);
                border-color: var(--nc-blue);
            }

            .metadata-preview-row-unhandled {
                opacity: 0.5;
                filter: grayscale(1);
                pointer-events: none;
            }

            .metadata-badge-updated {
                background: var(--nc-orange);
                color: #fff;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                margin-left: 6px;
            }

            .metadata-editor-popup {
                background: var(--nc-bg);
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                padding: 12px;
                margin-top: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .metadata-editor-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
            }

            .metadata-editor-row label {
                font-size: 12px;
                font-weight: 500;
                min-width: 60px;
                opacity: 0.8;
            }

            .metadata-editor-row input {
                flex: 1;
                padding: 4px 8px;
                border: 1px solid var(--nc-border);
                border-radius: 4px;
                background: var(--nc-bg);
                color: var(--nc-text);
                font-size: 13px;
            }

            .metadata-copy-btn {
                padding: 4px 8px;
                font-size: 11px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: 4px;
                cursor: pointer;
                white-space: nowrap;
            }

            .metadata-copy-btn:hover {
                background: rgba(0,0,0,0.05);
                border-color: var(--nc-blue);
            }

            .metadata-field-select {
                padding: 4px 8px;
                border: 1px solid var(--nc-border);
                background: var(--nc-bg);
                border-radius: var(--nc-radius);
                font-size: 12px;
                width: 100%;
            }

            .renamer-tab-order-row:hover .renamer-tab-order-up,
            .renamer-tab-order-row:hover .renamer-tab-order-down {
                opacity: 1;
            }

            .renamer-tab-order-up,
            .renamer-tab-order-down {
                opacity: 0.4;
                transition: opacity 0.15s;
                cursor: pointer;
            }

            .renamer-tab-order-up:hover,
            .renamer-tab-order-down:hover {
                opacity: 1;
                background: rgba(0,130,201,0.1);
            }

            .renamer-tab-order-row:last-child .renamer-tab-order-down {
                opacity: 0.2;
                cursor: not-allowed;
            }

            .renamer-tab-order-row:first-child .renamer-tab-order-up {
                opacity: 0.2;
                cursor: not-allowed;
            }

            .renamer-settings-submenu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                background: var(--nc-bg);
                cursor: pointer;
                transition: var(--nc-transition);
            }

            .renamer-settings-submenu-item:hover {
                background: rgba(0,130,201,0.05);
            }

            .renamer-settings-submenu-item:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }

             .renamer-settings-submenu-item:disabled .renamer-settings-submenu-arrow {
                 opacity: 0.3;
             }

            /* PDF preview thumbnails */
            .renamer-preview-header.pdf-preview-header {
                padding: 8px 23px 8px 10px;
                justify-content: start;
                align-items: center;
                gap: 12px;
            }
            .pdf-preview-header .pdf-preview-info {
                flex: 1;
                opacity: 0.7;
                font-size: 13px;
                font-weight: normal;
            }
            #pdf-preview-back {
                margin-left: auto;
            }
            .pdf-preview-container {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            .pdf-preview-file-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .pdf-preview-file-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--nc-text);
                margin: 0;
            }
            .pdf-preview-page-count {
                font-size: 12px;
                opacity: 0.6;
            }
            .pdf-preview-thumbnails {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }
            .pdf-preview-thumb {
                position: relative;
                width: 140px;
                border: 1px solid var(--nc-border);
                border-radius: var(--nc-radius);
                overflow: hidden;
                background: var(--nc-bg);
                display: flex;
                flex-direction: column;
                cursor: pointer;
                transition: box-shadow 0.15s;
            }
            .pdf-preview-thumb:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            }
            .pdf-preview-thumb img {
                width: 100%;
                height: auto;
                display: block;
                object-fit: contain;
                background: #f5f5f5;
            }
            .pdf-preview-thumb-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0);
                display: flex;
                align-items: flex-start;
                justify-content: flex-end;
                padding: 4px;
                transition: background 0.15s;
            }
            .pdf-preview-thumb:hover .pdf-preview-thumb-overlay {
                background: rgba(0,0,0,0.25);
            }
            .pdf-preview-thumb-reopen {
                background: rgba(255,255,255,0.9);
                border: none;
                border-radius: 4px;
                width: 28px;
                height: 28px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.15s;
            }
            .pdf-preview-thumb:hover .pdf-preview-thumb-reopen {
                opacity: 1;
            }
            .pdf-preview-thumb-label {
                font-size: 11px;
                text-align: center;
                padding: 3px 0;
                opacity: 0.7;
                background: var(--nc-bg);
                border-top: 1px solid var(--nc-border);
            }
            .pdf-preview-thumb-check {
                position: absolute;
                top: 4px;
                left: 4px;
                width: 18px;
                height: 18px;
                cursor: pointer;
                z-index: 2;
                accent-color: var(--nc-blue);
            }
            .pdf-preview-thumb:has(.pdf-preview-thumb-check:not(:checked)) img {
                opacity: 0.4;
                filter: grayscale(0.6);
            }
            .pdf-preview-actions {
                padding: 10px 23px;
                border-top: 1px solid var(--nc-border);
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .pdf-page-modal-img {
                max-width: 100%;
                max-height: 80vh;
                display: block;
                object-fit: contain;
            }
            .pdf-page-modal-nav {
                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: center;
                padding: 8px;
            }
            .renamer-modal:fullscreen,
            .renamer-modal:-webkit-full-screen {
                max-width: 100vw;
                max-height: 100vh;
                padding: 0;
                background: #000;
                border-radius: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .renamer-modal:fullscreen .pdf-page-modal-img,
            .renamer-modal:-webkit-full-screen .pdf-page-modal-img {
                max-width: 100vw;
                max-height: 100vh;
                object-fit: contain;
            }
            .renamer-modal:fullscreen .pdf-page-modal-nav,
            .renamer-modal:-webkit-full-screen .pdf-page-modal-nav {
                position: fixed;
                bottom: 16px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                border-radius: var(--nc-radius);
                padding: 8px 16px;
                gap: 12px;
            }
            .renamer-modal:fullscreen .renamer-btn-icon,
            .renamer-modal:-webkit-full-screen .renamer-btn-icon {
                top: 16px;
                right: 16px;
            }
        `;
    }

    function getCommonPath(paths) {
        if (!paths || !paths.length) {
            console.log('[Renamer] getCommonPath empty paths, returning /');
            return '/';
        }
        const dirs = paths.map(function(p) {
            const clean = (p || '').replace(/\/+$/, '');
            const last = clean.lastIndexOf('/');
            const dir = last === -1 ? '/' : clean.slice(0, last) || '/';
            console.log('[Renamer] getCommonPath file=', p, 'dir=', dir);
            return dir;
        });
        if (!dirs.length) {
            console.log('[Renamer] getCommonPath no dirs, returning /');
            return '/';
        }
        let common = dirs[0];
        console.log('[Renamer] getCommonPath starting common=', common);
        dirs.slice(1).forEach(function(d) {
            while (!d.startsWith(common + '/') && d !== common && common !== '/') {
                const idx = common.lastIndexOf('/');
                common = idx === -1 ? '/' : common.slice(0, idx) || '/';
            }
        });
        const result = common || '/';
        console.log('[Renamer] getCommonPath result=', result);
        return result;
    }

    async function openDialog(files) {
        ensureStyle();
        console.log('[Renamer] openDialog called, __renamerAppClosed=', window.__renamerAppClosed, 'files count=', Array.isArray(files) ? files.length : 'n/a');
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
        state.tabOrder = null;
        await loadTabOrder();
        state.activeTab = (state.tabOrder && state.tabOrder.length) ? state.tabOrder[0] : 'advanced';
        state.fileSelection = new Set(state.files);
        state.allSelected = true;

        if (window.__renamerAppClosed === true) {
            console.log('[Renamer] openDialog: app was closed, resetting metadata state');
            state.metadataFileData = {};
            state.manualOverrides = {};
            state.metadataFileSelection = new Set();
            state.metadataAllSelected = false;
            window.__renamerAppClosed = false;
        } else {
            console.log('[Renamer] openDialog: app was not closed, keeping metadata state, __renamerAppClosed=', window.__renamerAppClosed);
        }

        if (!state.files.length) {
            alert(t('noChanges'));
            return;
        }

        const commonPath = getCommonPath(state.files);
        console.log('[Renamer] openDialog commonPath=', commonPath, 'RenamerNavigation=', typeof RenamerNavigation);
        if (typeof RenamerApp !== 'undefined' && typeof RenamerApp.loadNavigationScript === 'function') {
            console.log('[Renamer] openDialog calling loadNavigationScript');
            RenamerApp.loadNavigationScript().then(function() {
                console.log('[Renamer] openDialog navigation ready, RenamerNavigation=', typeof RenamerNavigation);
                if (typeof RenamerNavigation !== 'undefined') {
                    RenamerNavigation.init({ state: state });
                    RenamerNavigation.setCurrentPath(commonPath);
                    RenamerNavigation.addFolderLoadedListener(function(ctx) {
                        updatePreview();
                    });
                    console.log('[Renamer] openDialog navigation init done, currentPath=', RenamerNavigation.getCurrentPath());
                }
            }).catch(function(err) {
                console.warn('[Renamer] navigation not ready at openDialog:', err);
            });
        } else {
            console.log('[Renamer] openDialog loadNavigationScript not available');
        }

        const existing = document.getElementById('renamer-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'renamer-overlay';
        overlay.innerHTML = buildModalHtml();
        document.body.appendChild(overlay);

        bindEvents();

        const activeTabDef = tabs[state.activeTab];
        if (activeTabDef) {
            const ctx = tabContext();
            if (typeof activeTabDef.bind === 'function') {
                activeTabDef.bind(ctx);
            }
            if (typeof activeTabDef.render === 'function') {
                activeTabDef.render(ctx);
            }
        }

        loadCustomTranslations();
        updatePreview();
    }
    function buildModalHtml() {
        const orderedTabIds = state.tabOrder && state.tabOrder.length ? state.tabOrder.filter(id => tabs[id]) : Object.keys(tabs);
        const activeTabId = state.activeTab || orderedTabIds[0];
        const activeTabDef = tabs[activeTabId];
        const ctx = tabContext();
        const initialContent = activeTabDef && typeof activeTabDef.build === 'function' ? activeTabDef.build(ctx) : buildAdvancedTab();
        return `
            <div id="renamer-modal" class="fullscreen">
                <div class="renamer-header">
                    <button class="renamer-burger-btn renamer-btn-icon" id="renamer-burger-btn" title="Menu" aria-label="Menu">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <div class="renamer-tabs" id="renamer-tabs">
                        ${orderedTabIds.map(function(id, idx) {
                            const tab = tabs[id];
                            const active = id === state.activeTab ? ' active' : '';
                            const icon = idx === 0 ? '<span style="display:inline-flex;align-items:center;margin-right:4px;">' + EDIT_MULTI_SVG + '</span>' : '';
                            return '<button class="renamer-tab' + active + '" data-tab="' + id + '" data-translation="' + tab.labelKey + '">' + icon + escapeHtml(t(tab.labelKey)) + '</button>';
                        }).join('')}
                    </div>
                    <div class="renamer-header-actions">
                        <button id="renamer-settings-btn" class="renamer-btn-icon" title="${t('settings') || 'Paramètres'}" data-translation="settings">
                            ${SETTINGS_GEAR_SVG}
                        </button>
                        <button id="renamer-lang-btn" class="renamer-btn-icon" title="${state.lang === 'fr' ? t('switchToEn') : t('switchToFr')}" data-translation="${state.lang === 'fr' ? 'switchToEn' : 'switchToFr'}">${state.lang === 'fr' ? 'FR' : 'EN'}</button>
                        <button id="renamer-collapse-btn" class="renamer-btn-icon" title="${t('reduce')}" data-translation="reduce">
                            ${EXPAND_SVG}
                        </button>
                        <button id="renamer-close-btn" class="renamer-btn-icon" title="${t('close')}" data-translation="close">
                            ${CLOSE_SVG}
                        </button>
                    </div>
                </div>
                <div class="renamer-content" id="renamer-content">
                    ${initialContent}
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
        const ordered = state.tabOrder && state.tabOrder.length ? state.tabOrder.filter(id => tabs[id]) : Object.keys(tabs);
        return ordered;
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
                            <button class="renamer-add-btn" id="renamer-add-btn" title="${t('addText')}" data-translation="addText">+</button>
                        </div>
                    </div>
                    <div class="renamer-preview">
                        <div class="renamer-preview-header">
                            <div id="renamer-breadcrumb"></div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div class="renamer-select-wrapper" style="width:auto;">
                                    <select id="renamer-view-mode" style="font-size:12px;padding:2px 6px;padding-right:32px;appearance:none;-webkit-appearance:none;">
                                        <option value="flat" data-translation="flat">${t('flat')}</option>
                                        <option value="folders" data-translation="folders">${t('folders')}</option>
                                    </select>
                                </div>
                                <button type="button" id="renamer-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="${t('deselectAllTitle')}" data-translation="deselectAllTitle">${CHECK_SVG}</button>
                            </div>
                        </div>
                        <div class="renamer-preview-list" id="renamer-preview-list"></div>
                    </div>
                </div>
                <div class="renamer-footer">
                    <button class="renamer-btn" id="renamer-save-plan" data-translation="savePlan">${t('savePlan')}</button>
                    <button class="renamer-btn" id="renamer-cancel" data-translation="cancel">${t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" id="renamer-run" data-translation="runRename">${EDIT_MULTI_SVG} ${t('runRename')}</button>
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
            btn.setAttribute('data-translation', 'addText');
            list.appendChild(btn);
        }
        initRulesDnD(list);
    }

    function getRuleDisplayName(rule) {
        if (rule.translationKey && translations[state.lang]?.[rule.translationKey]) {
            return translations[state.lang][rule.translationKey];
        }
        const modeKey = rule.mode === 'search_replace' ? 'searchReplace'
            : rule.mode === 'sequence' ? 'sequence'
            : rule.mode === 'regex' ? 'regex'
            : rule.mode === 'filetype' ? 'fileTypeFilter'
            : rule.mode === 'truncate' ? 'truncate'
            : rule.mode === 'add_text' ? 'addText'
            : rule.mode === 'basic' ? 'basicRules'
            : null;
        if (modeKey) return t(modeKey) || rule.name;
        return rule.name;
    }

    function buildRuleCardHtml(rule, idx) {
        const num = idx + 1;
        const color = getRuleColor(rule.mode);
        const displayName = getRuleDisplayName(rule);
        return `
            <div class="renamer-rule-header">
                <span class="renamer-rule-drag" title="${t('dragToReorder')}" data-translation="dragToReorder">${DRAG_HANDLE_SVG}</span>
                <span class="renamer-rule-number" style="background:${color}">${num}</span>
                <span class="renamer-rule-name" data-title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
                <div class="renamer-rule-actions">
                    <div class="renamer-toggle ${rule.enabled ? 'on' : ''}" data-index="${idx}" title="${t(rule.enabled ? 'on' : 'off')}" data-translation="${rule.enabled ? 'on' : 'off'}" draggable="false">
                        <div class="renamer-toggle-knob"></div>
                    </div>
                    <button class="renamer-btn-icon" data-action="duplicate" data-index="${idx}" title="${t('duplicate')}" data-translation="duplicate" draggable="false">
                        ${DUPLICATE_SVG}
                    </button>
                    <button class="renamer-btn-icon" data-action="delete" data-index="${idx}" title="${t('delete')}" data-translation="delete" draggable="false">
                        ${DELETE_SVG}
                    </button>
                    <button class="renamer-btn-icon" data-action="settings" data-index="${idx}" title="${t('save')}" data-translation="save" draggable="false">
                        ${SETTINGS_DOTS_SVG}
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
                    <label data-translation="search">${t('search')}</label>
                    <input type="text" data-field="pattern" data-index="${idx}" value="${escapeHtml(rule.pattern || '')}" />
                </div>
                <div class="renamer-field">
                    <button class="renamer-btn-icon renamer-case-btn ${rule.caseSensitive !== false ? 'on' : ''}" data-action="toggle-case" data-index="${idx}" title="${rule.caseSensitive !== false ? t('caseSensitive') : t('caseInsensitive')}" data-translation="${rule.caseSensitive !== false ? 'caseSensitive' : 'caseInsensitive'}" draggable="false" style="font-size:13px;font-weight:bold;padding:2px 6px;min-width:32px;">Aa</button>
                </div>
                <button class="renamer-btn-icon" data-action="swap" data-index="${idx}" title="${t('swapRule')}" data-translation="swapRule" draggable="false">
                    ${ARROW_LEFT_RIGHT_SVG}
                </button>
                <div class="renamer-field">
                    <label style="margin:0;" data-translation="replaceBy">${t('replaceBy')}</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-field">
                    <label data-translation="scope">${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''} data-translation="fullName">${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''} data-translation="nameOnly">${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''} data-translation="extension">${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'sequence') {
            return `
                <div class="renamer-field">
                    <label data-translation="type">${t('type')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="sequenceType" data-index="${idx}">
                        <option value="numeric" ${rule.sequenceType === 'numeric' ? 'selected' : ''} data-translation="numeric">${t('numeric')}</option>
                        <option value="alphabetic" ${rule.sequenceType === 'alphabetic' ? 'selected' : ''} data-translation="alphabetic">${t('alphabetic')}</option>
                        <option value="roman" ${rule.sequenceType === 'roman' ? 'selected' : ''} data-translation="roman">${t('roman')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field">
                    <label data-translation="start">${t('start')}</label>
                    <input type="number" data-field="startValue" data-index="${idx}" value="${rule.startValue || 1}" />
                </div>
                <div class="renamer-field">
                    <label data-translation="zeroPadding">${t('zeroPadding')}</label>
                    <input type="number" data-field="zeroPadding" data-index="${idx}" value="${rule.zeroPadding || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label data-translation="separator">${t('separator')}</label>
                    <input type="text" data-field="incSep" data-index="${idx}" value="${escapeHtml(rule.incSep || ' - ')}" />
                </div>
                <div class="renamer-field">
                    <label data-translation="position">${t('position')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="sequencePosition" data-index="${idx}">
                        <option value="start" ${(rule.sequencePosition || 'start') === 'start' ? 'selected' : ''} data-translation="startPos">${t('startPos')}</option>
                        <option value="end" ${(rule.sequencePosition || 'start') === 'end' ? 'selected' : ''} data-translation="end">${t('end')}</option>
                        <option value="at" ${(rule.sequencePosition || 'start') === 'at' ? 'selected' : ''} data-translation="atPosition">${t('atPosition')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field" id="sequence-at-${idx}" style="display:${(rule.sequencePosition || 'start') === 'at' ? 'block' : 'none'};">
                    <label data-translation="charCount">${t('charCount')}</label>
                    <input type="number" data-field="sequenceAt" data-index="${idx}" value="${rule.sequenceAt || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label data-translation="scope">${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''} data-translation="fullName">${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''} data-translation="nameOnly">${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''} data-translation="extension">${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'regex') {
            return `
                <div class="renamer-field">
                    <label data-translation="pattern">${t('pattern')}</label>
                    <input type="text" data-field="pattern" data-index="${idx}" value="${escapeHtml(rule.pattern || '')}" />
                </div>
                <div class="renamer-field">
                    <label data-translation="replacement">${t('replacement')}</label>
                    <input type="text" data-field="replacement" data-index="${idx}" value="${escapeHtml(rule.replacement || '')}" />
                </div>
                <div class="renamer-field">
                    <label data-translation="scope">${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''} data-translation="fullName">${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''} data-translation="nameOnly">${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''} data-translation="extension">${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'filetype') {
            const exts = RenamerUtils.getUniqueExtensions(state.files);
            const selected = (rule.extensions || []).map(e => e.toLowerCase());
            return `
                <div class="renamer-field">
                    <label data-translation="fileTypes">${t('fileTypes')}</label>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${exts.map(ext => `
                            <span class="renamer-file-pill ${selected.includes(ext.toLowerCase()) ? 'active' : ''}" data-ext="${ext}" data-index="${idx}" style="cursor:pointer;">
                                ${escapeHtml(ext)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="renamer-field">
                    <label data-translation="mode">${t('mode')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="filterMode" data-index="${idx}">
                        <option value="ignored" ${rule.filterMode === 'ignored' ? 'selected' : ''} data-translation="ignored">${t('ignored')}</option>
                        <option value="only" ${rule.filterMode === 'only' ? 'selected' : ''} data-translation="only">${t('only')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'truncate') {
            return `
                <div class="renamer-field">
                    <label data-translation="lengthToKeep">${t('lengthToKeep')}</label>
                    <input type="number" data-field="truncateLength" data-index="${idx}" value="${rule.truncateLength || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label data-translation="direction">${t('direction')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="truncateDirection" data-index="${idx}">
                        <option value="end" ${rule.truncateDirection === 'end' ? 'selected' : ''} data-translation="fromEnd">${t('fromEnd')}</option>
                        <option value="start" ${rule.truncateDirection === 'start' ? 'selected' : ''} data-translation="fromStart">${t('fromStart')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field">
                    <label data-translation="scope">${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''} data-translation="fullName">${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''} data-translation="nameOnly">${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''} data-translation="extension">${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'basic') {
            return `
                <div class="renamer-field">
                    <label data-translation="transformation">${t('transformation')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="basicSubType" data-index="${idx}">
                        <option value="lowercase" ${rule.basicSubType === 'lowercase' ? 'selected' : ''} data-translation="lowercase">${t('lowercase')}</option>
                        <option value="uppercase" ${rule.basicSubType === 'uppercase' ? 'selected' : ''} data-translation="uppercase">${t('uppercase')}</option>
                        <option value="capitalize" ${rule.basicSubType === 'capitalize' ? 'selected' : ''} data-translation="capitalize">${t('capitalize')}</option>
                        <option value="capitalize_words" ${rule.basicSubType === 'capitalize_words' ? 'selected' : ''} data-translation="capitalizeWords">${t('capitalizeWords')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field">
                    <label data-translation="scope">${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''} data-translation="fullName">${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''} data-translation="nameOnly">${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''} data-translation="extension">${t('extension')}</option>
                    </select>
                </div>
                </div>
            `;
        } else if (rule.mode === 'add_text') {
            return `
                <div class="renamer-field">
                    <label data-translation="textToAdd">${t('textToAdd')}</label>
                    <input type="text" data-field="insertText" data-index="${idx}" value="${escapeHtml(rule.insertText || '')}" />
                </div>
                <div class="renamer-field">
                    <label data-translation="position">${t('position')}</label>
                <div class="renamer-select-wrapper">
                    <select data-field="insertPosition" data-index="${idx}">
                        <option value="start" ${rule.insertPosition === 'start' ? 'selected' : ''} data-translation="startPos">${t('startPos')}</option>
                        <option value="end" ${rule.insertPosition === 'end' ? 'selected' : ''} data-translation="end">${t('end')}</option>
                        <option value="position" ${rule.insertPosition === 'position' ? 'selected' : ''} data-translation="atPosition">${t('atPosition')}</option>
                    </select>
                </div>
                </div>
                <div class="renamer-field" id="insert-at-${idx}" style="display:${rule.insertPosition === 'position' ? 'block' : 'none'};">
                    <label data-translation="charCount">${t('charCount')}</label>
                    <input type="number" data-field="insertAt" data-index="${idx}" value="${rule.insertAt || 0}" min="0" />
                </div>
                <div class="renamer-field">
                    <label data-translation="scope">${t('scope')}</label>
                <div class="renamer-select-wrapper">
                    <select class="renamer-target-select" data-field="target" data-index="${idx}">
                        <option value="full" ${rule.target === 'full' ? 'selected' : ''} data-translation="fullName">${t('fullName')}</option>
                        <option value="name" ${rule.target === 'name' ? 'selected' : ''} data-translation="nameOnly">${t('nameOnly')}</option>
                        <option value="extension" ${rule.target === 'extension' ? 'selected' : ''} data-translation="extension">${t('extension')}</option>
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
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-deselected renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="' + t('deselectDeselected') + '" data-translation="deselectDeselected">' + UNCHECK_SVG + '</button>';
            } else if (item.empty === true) {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-error renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="' + t('emptyNotAllowed') + '" data-translation="emptyNotAllowed">empty</button>';
            } else if (isApplicable) {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-success renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="' + t('clickToDeselect') + '" data-translation="clickToDeselect">' + CHECK_SVG + '</button>';
            } else {
                badgeHtml = '<button type="button" class="renamer-badge renamer-badge-neutral renamer-badge-toggle" data-path="' + escapeHtml(item.from) + '" title="' + t('noApplicableRule') + '" data-translation="noApplicableRule">i</button>';
            }
            const filterBadgeHtml = isFilteredByType
                ? '<span class="renamer-filter-badge" title="' + escapeHtml(t('filteredByTypeRule')) + '" data-translation="filteredByTypeRule">' + escapeHtml(t('filtered')) + '</span>'
                : '';
            const rowClasses = ['renamer-preview-row'];
            if (isDeselected) rowClasses.push('renamer-preview-row-deselected');
            if (isFilteredByType) rowClasses.push('filtered-file-type');
            row.className = rowClasses.join(' ');
            row.dataset.index = idx;
            row.dataset.path = item.from;
            if (isDeselected) row.style.opacity = '0.5';
            row.innerHTML = `
                <span class="renamer-preview-drag-handle" title="${t('dragToReorder')}" data-translation="dragToReorder">${DRAG_HANDLE_SVG}</span>
                <span class="renamer-preview-from" style="word-break:break-word;white-space:normal;">${item.fromDiff || escapeHtml(fromBase)}</span>
                <span class="renamer-preview-arrow">→</span>
                <span class="renamer-preview-to" style="word-break:break-word;white-space:normal;">${item.toDiff || escapeHtml(toBase)}</span>
                ${filterBadgeHtml}
                ${badgeHtml}
            `;
            list.appendChild(row);
        });

        const folderPaths = (state.navigation && state.navigation.folders) ? state.navigation.folders : [];
        const folderSet = {};
        folderPaths.forEach(function(p) { folderSet[p] = true; });

        list.querySelectorAll('.renamer-preview-row').forEach(function(row) {
            const path = row.dataset.path;
            if (!path || !folderSet[path]) return;
            const fromEl = row.querySelector('.renamer-preview-from');
            if (!fromEl) return;
            fromEl.innerHTML = FOLDER_SVG + '<span style="margin-left:6px;">' + fromEl.textContent + '</span>';
            fromEl.style.cursor = 'pointer';
            row.addEventListener('click', function(e) {
                if (e.target.closest('.renamer-badge-toggle')) return;
                if (typeof RenamerNavigation !== 'undefined') {
                    RenamerNavigation.navigateToFolder(path);
                }
            });
        });

        if (!preview.length) {
            list.innerHTML = '<div class="renamer-empty">' + escapeHtml(t('noChanges')) + '</div>';
        }

        list.querySelectorAll('.renamer-badge-toggle').forEach(function(btn) {
            if (btn._advancedBound) return;
            btn._advancedBound = true;
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
        if (typeof RenamerNavigation !== 'undefined') {
            RenamerNavigation.renderBreadcrumb('renamer-breadcrumb');
        }
        updateRunButtonState();
    }

    function updateToggleAllButton() {
        const btn = document.getElementById('renamer-toggle-all');
        if (!btn) return;
        const allOn = state.allSelected || state.fileSelection.size === state.files.length;
        btn.className = allOn
            ? 'renamer-badge renamer-badge-success renamer-badge-toggle'
            : 'renamer-badge renamer-badge-deselected renamer-badge-toggle';
        btn.innerHTML = allOn ? CHECK_SVG : UNCHECK_SVG;
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
        const burgerBtn = document.getElementById('renamer-burger-btn');

        if (!modal) return;
        if (modal._bound) return;
        modal._bound = true;

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeDialog();
            });
        }

        if (overlay) {
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

        if (!modal._escBound) {
            modal._escBound = true;
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const settingsPanel = document.getElementById('renamer-settings-panel');
                    if (settingsPanel && settingsPanel.parentNode) { settingsPanel.remove(); return; }
                    const popups = document.querySelectorAll('.renamer-popup, .renamer-modal-overlay, .renamer-confirm-dialog, #metadata-edit-popup, #metadata-confirm-dialog, #metadata-filter-overlay, #pdf-loader');
                    if (popups.length) {
                        popups[popups.length - 1].remove();
                        return;
                    }
                    closeDialog();
                }
            });
        }

        if (collapseBtn) {
            collapseBtn.addEventListener('click', function() {
                if (modal.classList.contains('fullscreen')) {
                    modal.classList.remove('fullscreen');
                    modal.style.width = '90svw';
                    modal.style.height = '90svh';
                    modal.style.maxWidth = '90svw';
                    modal.style.maxHeight = '90svh';
                    collapseBtn.innerHTML = COLLAPSE_SVG;
                    collapseBtn.title = 'Agrandir';
                } else {
                    modal.classList.add('fullscreen');
                    modal.style.width = '100svw';
                    modal.style.height = '100svh';
                    modal.style.maxWidth = '100svw';
                    modal.style.maxHeight = '100svh';
                    collapseBtn.innerHTML = EXPAND_SVG;
                    collapseBtn.title = 'Réduire';
                }
            });
        }

        if (burgerBtn) {
            burgerBtn.addEventListener('click', function() {
                const tabsEl = document.getElementById('renamer-tabs');
                if (tabsEl) {
                    tabsEl.classList.toggle('open');
                }
            });
        }

        const tabEls = document.querySelectorAll('.renamer-tab');
        tabEls.forEach(tab => {
            if (tab._tabBound) return;
                    tab._tabBound = true;
                    tab.addEventListener('click', function() {
                        console.log('[Renamer] tab clicked:', this.dataset.tab);
                        document.querySelectorAll('.renamer-tab').forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        const tabsEl = document.getElementById('renamer-tabs');
                        if (tabsEl) tabsEl.classList.remove('open');
                        state.activeTab = this.dataset.tab;
                        const content = document.getElementById('renamer-content');
                        if (!content) return;
                        const tabDef = tabs[state.activeTab];
                        console.log('[Renamer] tabDef for', state.activeTab, ':', tabDef ? 'found' : 'NOT FOUND');
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
                                closeDialog: closeDialog,
                                buildRuleBody: buildRuleBody,
                                getRuleColor: getRuleColor,
                                initRulesDnD: initRulesDnD,
                            };
                            content.innerHTML = tabDef.build(ctx);
                            console.log('[Renamer] built tab content for', state.activeTab);
                            bindEvents();
                            if (typeof tabDef.bind === 'function') {
                                console.log('[Renamer] calling bind for', state.activeTab);
                                tabDef.bind(ctx);
                            }
                            if (typeof tabDef.render === 'function') {
                                console.log('[Renamer] calling render for', state.activeTab);
                                tabDef.render(ctx);
                            }
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
            <div class="renamer-popup-item" data-type="basic" id="renamer-basic-trigger"><span>${t('basicRules')}</span>${POPUP_ARROW_SVG}</div>
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

        setTimeout(() => {
            const closeHandler = function(e) {
                if (popup && !popup.contains(e.target) && e.target !== addBtn) {
                    popup.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);

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
            ? `<button class="renamer-btn" data-action="overwrite" data-translation="overwritePlan">${escapeHtml(t('overwritePlan') || 'Écraser plan existant')}</button>`
            : '';
        overlay.innerHTML = `
            <div class="renamer-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:480px;width:90%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3 data-translation="savePlan">${t('savePlan') || 'Sauvegarder le plan'}</h3>
                </div>
                <div style="font-size:13px;opacity:0.8;" data-translation="${hasPlan ? 'currentPlanLabel' : 'newPlanLabel'}">${hasPlan ? (t('currentPlanLabel') || 'Plan courant') + ': <code>' + escapeHtml(state.currentPlan) + '</code>' : (t('newPlanLabel') || 'Nouveau plan')}</div>
                <div class="renamer-field">
                    <label data-translation="planName">${escapeHtml(t('planName') || 'Nom du plan')}</label>
                    <input type="text" id="renamer-save-plan-input" value="${escapeHtml(defaultName)}" />
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                    <button class="renamer-btn" data-action="cancel" data-translation="cancel">${t('cancel')}</button>
                    ${extraActions}
                    <button class="renamer-btn renamer-btn-primary" data-action="new" ${!hasPlan && !defaultName ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} data-translation="${hasPlan ? 'newPlan' : 'save'}">${escapeHtml(hasPlan ? (t('newPlan') || 'Nouveau plan') : (t('save') || 'Enregistrer'))}</button>
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
                    <button id="renamer-load-plan-back" class="renamer-btn-icon" title="${t('back') || 'Retour'}" data-translation="back">
                        ${BACK_SVG}
                    </button>
                    <h3 data-translation="loadPlan">${t('loadPlan') || 'Charger un plan'}</h3>
                    <button id="renamer-load-plan-close" class="renamer-btn-icon" title="${t('close')}" data-translation="close">
                        ${CLOSE_SVG}
                    </button>
                </div>
                <div id="renamer-load-plan-content" style="overflow-y:auto;flex:1;min-height:200px;" data-translation="loading">${t('loading') || 'Chargement'}...</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#renamer-load-plan-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#renamer-load-plan-back').addEventListener('click', () => {
            overlay.remove();
        });
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

    function showAddTranslationPopup(triggerBtn) {
        const popup = document.createElement('div');
        popup.id = 'renamer-add-translation-popup';
        popup.className = 'renamer-rule-popup';
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.zIndex = '10000';
        popup.style.minWidth = '320px';
        popup.innerHTML = `
            <div class="renamer-rule-popup-header">${escapeHtml(t('addTranslation') || 'Ajouter une traduction')}</div>
            <div class="renamer-field" style="margin-top:8px;">
                <label>${escapeHtml(t('translationKey') || 'Clé')}</label>
                <input type="text" id="renamer-new-translation-key" placeholder="ex: metadataEditField" />
            </div>
            <div class="renamer-field" style="margin-top:8px;">
                <label>${escapeHtml(t('translationText') || 'Texte')}</label>
                <input type="text" id="renamer-new-translation-text" placeholder="ex: Modifier" />
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                <button class="renamer-btn renamer-btn-small" data-action="cancel-add-translation">${escapeHtml(t('cancel') || 'Annuler')}</button>
                <button class="renamer-btn renamer-btn-small renamer-btn-primary" data-action="save-add-translation">${escapeHtml(t('save') || 'Enregistrer')}</button>
            </div>
        `;
        document.body.appendChild(popup);

        const keyInput = popup.querySelector('#renamer-new-translation-key');
        const textInput = popup.querySelector('#renamer-new-translation-text');
        if (keyInput) keyInput.focus();

        popup.querySelectorAll('[data-action]').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.dataset.action;
                popup.remove();
                if (action === 'save-add-translation') {
                    const key = keyInput ? keyInput.value.trim() : '';
                    const text = textInput ? textInput.value.trim() : '';
                    if (!key) return;
                    const viewLang = state.translationPopupLang || state.lang;
                    if (!translations[viewLang]) translations[viewLang] = {};
                    translations[viewLang][key] = text;
                    saveCustomTranslation(key, text).then(() => {
                        showToast(t('translationSaved') || 'Traduction enregistrée', 'success');
                        renderSettingsTranslations();
                    }).catch(() => {
                        showToast(t('saveError') || 'Erreur lors de la sauvegarde', 'error');
                    });
                }
            });
        });

        const escHandler = function(e) {
            if (e.key === 'Escape') {
                popup.remove();
                document.removeEventListener('keydown', escHandler, true);
            }
        };
        document.addEventListener('keydown', escHandler, true);
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
                popup.innerHTML = '<div class="renamer-rule-popup-header" data-translation="loadSavedRule">' + escapeHtml(t('loadSavedRule') || 'Charger une règle sauvegardée') + '</div><div class="renamer-rule-popup-empty" data-translation="noSavedRules">' + escapeHtml(t('noSavedRules') || 'Aucune règle sauvegardée') + '</div>';
            } else {
                let items = '<div class="renamer-rule-popup-header" data-translation="loadSavedRule">' + escapeHtml(t('loadSavedRule') || 'Charger une règle sauvegardée') + '</div>';
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
        const isAdvanced = state.activeTab === 'advanced';
        const planLabel = state.currentPlan ? escapeHtml(state.currentPlan) : (t('noPlanLoaded') || 'Aucun plan chargé');
        overlay.innerHTML = `
            <div class="renamer-modal renamer-settings-modal" style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:20px;max-width:520px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                <div class="renamer-header" style="padding:0;">
                    <h3 data-translation="settings">${t('settings') || 'Paramètres'}</h3>
                    <button id="renamer-settings-close" class="renamer-btn-icon" title="${t('close')}" data-translation="close">
                        ${CLOSE_SVG}
                    </button>
                </div>
                <div style="font-size:12px;opacity:0.7;padding:4px 0;" data-translation="currentPlan">${t('currentPlan') || 'Plan courant'}: <code>${planLabel}</code></div>
                <div class="renamer-settings-menu" style="display:flex;flex-direction:column;gap:8px;">
                    <button class="renamer-btn" data-menu="general" style="text-align:left;justify-content:flex-start;padding:12px;">
                        <span style="font-size:18px;margin-right:8px;">⚙</span>
                        <span style="flex:1;" data-translation="generalSettings">${t('generalSettings') || 'Paramètres généraux'}</span>
                        <span style="opacity:0.5;">›</span>
                    </button>
                    <button class="renamer-btn" data-menu="advanced" style="text-align:left;justify-content:flex-start;padding:12px;${isAdvanced ? '' : 'opacity:0.5;cursor:not-allowed;'}" title="${isAdvanced ? '' : escapeHtml(t('settingsNotAvailableOutsideTab') || 'Paramètres Non réglables hors de l\'onglet')}" data-translation="advancedSettings">
                        <span style="font-size:18px;margin-right:8px;">📝</span>
                        <span style="flex:1;">${t('advancedSettings') || 'Paramètres de renommage avancé'}</span>
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
                if (menu === 'general') {
                    showGeneralSettingsSubPanel();
                } else if (menu === 'advanced') {
                    if (state.activeTab !== 'advanced') {
                        showToast(t('settingsNotAvailableOutsideTab') || 'Paramètres Non réglables hors de l\'onglet', 'error');
                        return;
                    }
                    showAdvancedSettingsSubPanel();
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
                    <button id="renamer-settings-back" class="renamer-btn-icon" title="${t('back') || 'Retour'}" data-translation="back">
                        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 3L5 8L10 13"/></svg>
                    </button>
                    <h3 id="renamer-sub-title"></h3>
                    <button id="renamer-settings-close" class="renamer-btn-icon" title="${t('close')}" data-translation="close">
                        ${CLOSE_SVG}
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

    function showGeneralSettingsSubPanel() {
        const overlay = showSubPanel();
        if (!overlay) return;
        const subTitle = overlay.querySelector('#renamer-sub-title');
        if (subTitle) {
            subTitle.textContent = t('generalSettings') || 'Paramètres généraux';
            subTitle.setAttribute('data-translation', 'generalSettings');
        }
        const content = overlay.querySelector('#renamer-settings-content');
        if (!content) return;

        let html = '<div class="renamer-settings-list" style="display:flex;flex-direction:column;gap:16px;">';

        html += '<div style="display:flex;flex-direction:column;gap:8px;">';
        html += '<div style="font-weight:500;font-size:14px;" data-translation="manageTranslations">' + escapeHtml(t('manageTranslations') || 'Traductions') + '</div>';
        html += '<button class="renamer-btn renamer-btn-small" id="renamer-settings-open-translations" data-translation="manageTranslations" style="align-self:flex-start;">' + escapeHtml(t('manageTranslations') || 'Traductions') + ' ›</button>';
        html += '</div>';

        html += '<div style="display:flex;flex-direction:column;gap:8px;" id="renamer-tab-order-section">';
        html += '<div style="font-weight:500;font-size:14px;" data-translation="tabOrder">' + escapeHtml(t('tabOrder') || 'Ordre des onglets') + '</div>';
        html += '<div style="font-size:12px;opacity:0.7;" data-translation="tabOrderDescription">' + escapeHtml(t('tabOrderDescription') || 'Glissez-déposez pour réorganiser les onglets') + '</div>';
        html += '<div id="renamer-tab-order-list" style="display:flex;flex-direction:column;gap:4px;"></div>';
        html += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" id="renamer-save-tab-order" data-translation="save" style="align-self:flex-start;margin-top:8px;">' + escapeHtml(t('save') || 'Sauvegarder') + '</button>';
        html += '</div>';

        html += '</div>';
        content.innerHTML = html;

        content.querySelector('#renamer-settings-open-translations').addEventListener('click', () => {
            showTranslationsSubPanel();
        });

        renderTabOrder(content.querySelector('#renamer-tab-order-list'));

        content.querySelector('#renamer-save-tab-order').addEventListener('click', () => {
            saveTabOrder();
        });
    }

    function showAdvancedSettingsSubPanel() {
        const overlay = showSubPanel();
        if (!overlay) return;
        const subTitle = overlay.querySelector('#renamer-sub-title');
        if (subTitle) {
            subTitle.textContent = t('advancedSettings') || 'Paramètres de renommage avancé';
            subTitle.setAttribute('data-translation', 'advancedSettings');
        }
        const content = overlay.querySelector('#renamer-settings-content');
        if (!content) return;

        let html = '<div class="renamer-settings-list" style="display:flex;flex-direction:column;gap:12px;">';

        html += '<div style="display:flex;flex-direction:column;gap:8px;" id="renamer-advanced-rules-section">';
        html += '<div style="font-weight:500;font-size:14px;" data-translation="manageSavedRules">' + escapeHtml(t('manageSavedRules') || 'Règles sauvegardées') + '</div>';
        html += '<div id="renamer-advanced-rules-content"><div style="opacity:0.6;text-align:center;padding:20px;">Chargement...</div></div>';
        html += '</div>';

        html += '<div style="display:flex;flex-direction:column;gap:8px;">';
        html += '<div style="font-weight:500;font-size:14px;">' + escapeHtml(t('savePlan') || 'Sauvegarder le plan') + ' / ' + escapeHtml(t('loadPlan') || 'Charger un plan') + '</div>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="renamer-btn renamer-btn-small" id="renamer-advanced-load-plan" data-translation="loadPlan" style="flex:1;">' + escapeHtml(t('loadPlan') || 'Charger un plan') + '</button>';
        html += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" id="renamer-advanced-save-plan" data-translation="savePlan" style="flex:1;">' + escapeHtml(t('savePlan') || 'Sauvegarder le plan') + '</button>';
        html += '</div></div>';

        html += '</div>';
        content.innerHTML = html;

        const rulesContent = content.querySelector('#renamer-advanced-rules-content');
        if (rulesContent) {
            renderSettingsSavedRules(rulesContent);
        }

        content.querySelector('#renamer-advanced-load-plan').addEventListener('click', () => {
            showLoadPlanDialog();
        });
        content.querySelector('#renamer-advanced-save-plan').addEventListener('click', () => {
            showSavePlanDialog();
        });
    }

    function renderTabOrder(container) {
        if (!container) return;
        const allTabIds = Object.keys(tabs);
        const ordered = state.tabOrder && state.tabOrder.length ? state.tabOrder.filter(id => tabs[id]) : allTabIds;
        const remaining = allTabIds.filter(id => !ordered.includes(id));
        const fullOrder = ordered.concat(remaining);

        let html = '';
        fullOrder.forEach((id, idx) => {
            const tab = tabs[id];
            if (!tab) return;
            const label = escapeHtml(t(tab.labelKey) || tab.labelKey || id);
            html += '<div class="renamer-preview-row renamer-tab-order-row" data-index="' + idx + '" data-tab-id="' + id + '" style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);">';
            html += '<span class="renamer-preview-drag-handle renamer-tab-drag-handle" title="' + escapeHtml(t('dragToReorder') || 'Déplacer') + '" data-translation="dragToReorder" style="cursor:grab;touch-action:none;">' + DRAG_HANDLE_SVG + '</span>';
            html += '<span style="flex:1;word-break:break-word;white-space:normal;" class="metadata-filename">' + label + '</span>';
            html += '<div style="display:flex;gap:4px;flex-shrink:0;">';
            html += '<button class="renamer-btn renamer-btn-small renamer-tab-order-up" data-action="up" data-index="' + idx + '" title="' + escapeHtml(t('moveUp') || 'Monter') + '" data-translation="moveUp" aria-label="' + escapeHtml(t('moveUp') || 'Monter') + ' ' + label + '">▲</button>';
            html += '<button class="renamer-btn renamer-btn-small renamer-tab-order-down" data-action="down" data-index="' + idx + '" title="' + escapeHtml(t('moveDown') || 'Descendre') + '" data-translation="moveDown" aria-label="' + escapeHtml(t('moveDown') || 'Descendre') + ' ' + label + '">▼</button>';
            html += '</div></div>';
        });

        container.innerHTML = html;

        container.querySelectorAll('.renamer-tab-order-up').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                moveTabOrderItem(container, idx, -1);
            });
        });

        container.querySelectorAll('.renamer-tab-order-down').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                moveTabOrderItem(container, idx, 1);
            });
        });

        if (typeof Sortable !== 'undefined') {
            if (container._tabSortable) {
                container._tabSortable.destroy();
                container._tabSortable = null;
            }
            container._tabSortable = Sortable.create(container, {
                handle: '.renamer-tab-drag-handle',
                animation: 150,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                ghostClass: 'renamer-preview-ghost',
                chosenClass: 'renamer-preview-chosen',
                dragClass: 'renamer-preview-dragging',
                forceFallback: false,
                fallbackOnBody: true,
                swapThreshold: 0.5,
                onEnd: function(evt) {
                    const rows = container.querySelectorAll('.renamer-tab-order-row');
                    const newOrder = [];
                    rows.forEach(row => {
                        const tabId = row.dataset.tabId;
                        if (tabId && tabs[tabId]) newOrder.push(tabId);
                    });
                    const allTabIds = Object.keys(tabs);
                    const remaining = allTabIds.filter(id => !newOrder.includes(id));
                    state.tabOrder = newOrder.concat(remaining);
                    updateTabOrderIndexes(container);
                }
            });
        }
    }

    function updateTabOrderIndexes(container) {
        if (!container) return;
        const rows = container.querySelectorAll('.renamer-tab-order-row');
        rows.forEach((row, idx) => {
            row.dataset.index = idx;
            const upBtn = row.querySelector('.renamer-tab-order-up');
            const downBtn = row.querySelector('.renamer-tab-order-down');
            if (upBtn) upBtn.dataset.index = idx;
            if (downBtn) downBtn.dataset.index = idx;
        });
    }

    function moveTabOrderItem(container, index, direction) {
        const rows = Array.from(container.querySelectorAll('.renamer-tab-order-row'));
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= rows.length) return;

        const currentTabId = rows[index].dataset.tabId;
        const targetTabId = rows[newIndex].dataset.tabId;

        if (direction === -1) {
            container.insertBefore(rows[index], rows[newIndex]);
        } else {
            container.insertBefore(rows[newIndex], rows[index]);
        }

        const newOrder = [];
        container.querySelectorAll('.renamer-tab-order-row').forEach(row => {
            const tabId = row.dataset.tabId;
            if (tabId && tabs[tabId]) newOrder.push(tabId);
        });
        const allTabIds = Object.keys(tabs);
        const remaining = allTabIds.filter(id => !newOrder.includes(id));
        state.tabOrder = newOrder.concat(remaining);
        updateTabOrderIndexes(container);
    }

    function saveTabOrder() {
        const baseUrl = getBaseUrl();
        const order = state.tabOrder && state.tabOrder.length ? state.tabOrder.filter(id => tabs[id]) : Object.keys(tabs);
        fetch(baseUrl + '/api/user-preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'tabOrder', value: order })
        }).then(r => r.json()).then(data => {
            if (data && data.success) {
                showToast(t('tabOrderSaved') || 'Ordre des onglets enregistré', 'success');
            } else {
                showToast((t('tabOrderError') || 'Erreur lors de l\'enregistrement de l\'ordre des onglets') + ': ' + (data.error || ''), 'error');
            }
        }).catch(err => {
            showToast((t('tabOrderError') || 'Erreur lors de l\'enregistrement de l\'ordre des onglets') + ': ' + err.message, 'error');
        });
    }

    function loadTabOrder() {
        const baseUrl = getBaseUrl();
        return fetch(baseUrl + '/api/user-preferences', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }).then(r => r.json()).then(data => {
            if (data && data.success && data.preferences && data.preferences.tabOrder) {
                state.tabOrder = data.preferences.tabOrder.filter(id => tabs[id]);
            } else {
                state.tabOrder = null;
            }
        }).catch(err => {
            console.error('Failed to load tab order:', err);
            state.tabOrder = null;
        });
    }
    function showRulesSubPanel() {
        const overlay = showSubPanel();
        if (!overlay) return;
        overlay.querySelector('#renamer-sub-title').textContent = t('manageSavedRules') || 'Règles sauvegardées';
        overlay.querySelector('#renamer-sub-title').setAttribute('data-translation', 'manageSavedRules');
        renderSettingsSavedRules();
    }

    function rebuildTranslationLangDropdown() {
        const langBtn = document.getElementById('renamer-translation-lang-btn');
        const langDropdown = document.getElementById('renamer-translation-lang-dropdown');
        if (!langBtn || !langDropdown) return;
        langDropdown.innerHTML = '';
        Object.keys(translations).sort().forEach(function(lang) {
            const item = document.createElement('div');
            item.className = 'renamer-popup-item';
            item.textContent = lang.toUpperCase();
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                state.translationPopupLang = lang;
                langBtn.textContent = lang.toUpperCase();
                langDropdown.style.display = 'none';
                updateTranslationView();
            });
            langDropdown.appendChild(item);
        });
    }

    function showTranslationsSubPanel() {
        const overlay = showSubPanel();
        if (!overlay) return;
        const subTitle = overlay.querySelector('#renamer-sub-title');
        if (subTitle) {
            subTitle.textContent = t('manageTranslations') || 'Traductions';
            subTitle.setAttribute('data-translation', 'manageTranslations');
        }

        const header = overlay.querySelector('.renamer-header');
        if (header && !document.getElementById('renamer-translation-search')) {
            state.translationPopupLang = state.lang;

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.id = 'renamer-translation-search';
            searchInput.placeholder = t('metadataSearch') || 'Rechercher...';
            searchInput.style.maxWidth = '200px';
            searchInput.style.marginRight = '8px';
            searchInput.setAttribute('data-translation', 'metadataSearch');

            const langBtn = document.createElement('button');
            langBtn.id = 'renamer-translation-lang-btn';
            langBtn.className = 'renamer-btn renamer-btn-small';
            langBtn.textContent = state.lang.toUpperCase();
            langBtn.setAttribute('data-translation', 'switchLang');

            const langDropdown = document.createElement('div');
            langDropdown.id = 'renamer-translation-lang-dropdown';
            langDropdown.className = 'renamer-popup';
            langDropdown.style.display = 'none';
            langDropdown.style.position = 'absolute';
            langDropdown.style.top = '100%';
            langDropdown.style.right = '0';
            langDropdown.style.zIndex = '10001';

            Object.keys(translations).sort().forEach(function(lang) {
                const item = document.createElement('div');
                item.className = 'renamer-popup-item';
                item.textContent = lang.toUpperCase();
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    state.translationPopupLang = lang;
                    langBtn.textContent = lang.toUpperCase();
                    langDropdown.style.display = 'none';
                    updateTranslationView();
                });
                langDropdown.appendChild(item);
            });

            langBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                langDropdown.style.display = langDropdown.style.display === 'none' ? 'block' : 'none';
            });

            header.style.position = 'relative';
            const closeBtn = header.querySelector('#renamer-settings-close');
            header.insertBefore(searchInput, closeBtn);
            header.insertBefore(langBtn, closeBtn);
            header.appendChild(langDropdown);

            searchInput.addEventListener('input', applyTranslationFilter);

            document.addEventListener('click', function(e) {
                if (!langDropdown.contains(e.target) && e.target !== langBtn) {
                    langDropdown.style.display = 'none';
                }
            });
        } else if (header && document.getElementById('renamer-translation-lang-btn')) {
            state.translationPopupLang = state.lang;
            const langBtn = document.getElementById('renamer-translation-lang-btn');
            if (langBtn) langBtn.textContent = state.lang.toUpperCase();
            rebuildTranslationLangDropdown();
        }

        renderSettingsTranslations();
    }

    function renderSettingsSavedRules(contentEl) {
        const content = contentEl || document.getElementById('renamer-settings-content');
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
                    html += '<button class="renamer-btn renamer-btn-small" data-action="rename" data-translation="rename">' + escapeHtml(t('rename') || 'Renommer') + '</button>';
                    html += '<button class="renamer-btn renamer-btn-small" data-action="delete" data-translation="delete">' + escapeHtml(t('delete') || 'Supprimer') + '</button>';
                    html += '<button class="renamer-btn renamer-btn-small" data-action="load" data-translation="load">' + escapeHtml(t('load') || 'Charger') + '</button>';
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
                                        renderSettingsSavedRules(contentEl);
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
                        showSettingsRenameDialog(rule, () => renderSettingsSavedRules(contentEl));
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
                    <h3 data-translation="rename">${t('rename') || 'Renommer'}</h3>
                </div>
                <div class="renamer-field">
                    <label data-translation="ruleName">${escapeHtml(t('ruleName') || 'Nom de la règle')}</label>
                    <input type="text" id="renamer-settings-rename-input" value="${escapeHtml(rule.name)}" />
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="renamer-btn" data-action="cancel" data-translation="cancel">${t('cancel')}</button>
                    <button class="renamer-btn renamer-btn-primary" data-action="save" data-translation="save">${t('save')}</button>
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

    function renderSettingsTranslations(contentEl) {
        const content = contentEl || document.getElementById('renamer-settings-content');
        if (!content) return;
        const viewLang = state.translationPopupLang || state.lang;
        const allTranslations = translations[viewLang] || {};

        let html = '<div class="renamer-settings-translations">';

        html += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
        html += '<button class="renamer-btn renamer-btn-small" id="renamer-export-translations" style="flex:1;" data-translation="exportAllTranslations">' + escapeHtml(t('exportAllTranslations') || 'Exporter toutes les traductions') + '</button>';
        html += '<button class="renamer-btn renamer-btn-small" id="renamer-import-translations" style="flex:1;" data-translation="importAllTranslations">' + escapeHtml(t('importAllTranslations') || 'Importer toutes les traductions') + '</button>';
        html += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" id="renamer-add-translation-btn" style="flex:1;" data-translation="addTranslation">' + escapeHtml(t('addTranslation') || 'Ajouter une traduction') + '</button>';
        html += '</div>';
        html += '<input type="file" id="renamer-import-file" accept="application/json,.json" style="display:none;" />';

        html += '<div style="opacity:0.6;text-align:center;padding:20px;">Chargement...</div>';
        content.innerHTML = html;
        bindTranslationActions(content);
        fetch(getBaseUrl() + '/api/translations', { method: 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const customTrs = (data && data.translations) ? data.translations : {};
                const allKeys = new Set();
                Object.keys(translations).forEach(function(lang) {
                    Object.keys(translations[lang] || {}).forEach(function(k) { allKeys.add(k); });
                });
                const sortedKeys = Array.from(allKeys).sort();
                let listHtml = '<div class="renamer-settings-translations">';
                listHtml += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
                listHtml += '<button class="renamer-btn renamer-btn-small" id="renamer-export-translations" style="flex:1;" data-translation="exportAllTranslations">' + escapeHtml(t('exportAllTranslations') || 'Exporter toutes les traductions') + '</button>';
                listHtml += '<button class="renamer-btn renamer-btn-small" id="renamer-import-translations" style="flex:1;" data-translation="importAllTranslations">' + escapeHtml(t('importAllTranslations') || 'Importer toutes les traductions') + '</button>';
                listHtml += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" id="renamer-add-translation-btn" style="flex:1;" data-translation="addTranslation">' + escapeHtml(t('addTranslation') || 'Ajouter une traduction') + '</button>';
                listHtml += '</div>';
                listHtml += '<input type="file" id="renamer-import-file" accept="application/json,.json" style="display:none;" />';
                if (!sortedKeys.length) {
                    listHtml += '<div class="renamer-rule-popup-empty" style="margin-top:8px;" data-translation="noTranslations">' + escapeHtml(t('noTranslations') || 'Aucune traduction') + '</div>';
                    listHtml += '</div>';
                    content.innerHTML = listHtml;
                    bindTranslationActions(content);
                    applyTranslationFilter();
                    return;
                }
                sortedKeys.forEach(function(key) {
                    const customVal = (customTrs[key] !== undefined && customTrs[key] !== null && customTrs[key] !== '') ? customTrs[key] : null;
                    const rawBase = (translations[viewLang] && translations[viewLang][key]);
                    const baseVal = typeof rawBase === 'string' ? rawBase : (rawBase === null || rawBase === undefined ? '' : String(rawBase));
                    const rawValue = customVal !== null ? customVal : baseVal;
                    const value = typeof rawValue === 'string' ? rawValue : String(rawValue);
                    listHtml += '<div class="renamer-settings-item" data-translation-key="' + escapeHtml(key) + '">';
                    listHtml += '<div class="renamer-settings-item-name"><code>' + escapeHtml(key) + '</code></div>';
                    listHtml += '<div class="renamer-field" style="margin-top:6px;">';
                    listHtml += '<input type="text" data-original="' + escapeHtml(value) + '" value="' + escapeHtml(value) + '" />';
                    listHtml += '</div>';
                    listHtml += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">';
                    listHtml += '<button class="renamer-btn renamer-btn-small renamer-btn-primary" data-action="save" data-translation="save">' + escapeHtml(t('save') || 'Enregistrer') + '</button>';
                    listHtml += '</div></div>';
                });
                listHtml += '</div>';
                content.innerHTML = listHtml;
                bindTranslationActions(content);
                applyTranslationFilter();
            });
    }

    function applyTranslationFilter() {
        const searchInput = document.getElementById('renamer-translation-search');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const items = document.querySelectorAll('.renamer-settings-item[data-translation-key]');
        items.forEach(function(item) {
            const key = item.dataset.translationKey;
            if (!query) {
                item.style.display = '';
                return;
            }
            let visible = key.toLowerCase().includes(query);
            if (!visible) {
                Object.keys(translations).some(function(lang) {
                    const raw = (translations[lang] && translations[lang][key]);
                    const val = typeof raw === 'string' ? raw : (raw === null || raw === undefined ? '' : String(raw));
                    if (val.toLowerCase().includes(query)) {
                        visible = true;
                        return true;
                    }
                    return false;
                });
            }
            item.style.display = visible ? '' : 'none';
        });
    }

    function updateTranslationView() {
        const viewLang = state.translationPopupLang || state.lang;
        const items = document.querySelectorAll('.renamer-settings-item[data-translation-key]');
        items.forEach(function(item) {
            const key = item.dataset.translationKey;
            const raw = (translations[viewLang] && translations[viewLang][key]);
            const baseVal = typeof raw === 'string' ? raw : (raw === null || raw === undefined ? '' : String(raw));
            const input = item.querySelector('input[type="text"]');
            if (input) {
                input.value = baseVal;
                input.dataset.original = baseVal;
            }
        });
        applyTranslationFilter();
    }

    function bindTranslationActions(content) {
        const exportBtn = content.querySelector('#renamer-export-translations');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                const allLangs = Object.keys(translations);
                const allKeys = new Set();
                allLangs.forEach(function(lang) {
                    Object.keys(translations[lang] || {}).forEach(function(k) { allKeys.add(k); });
                });
                const exportObj = {
                    translations: Array.from(allKeys).sort().map(function(key) {
                        const obj = { translationKey: key };
                        allLangs.forEach(function(lang) {
                            obj[lang] = (translations[lang] && translations[lang][key]) || '';
                        });
                        return obj;
                    })
                };
                const jsonStr = JSON.stringify(exportObj, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'renamer-translations.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(t('translationsExported') || 'Traductions exportées', 'success');
            });
        }

        const importBtn = content.querySelector('#renamer-import-translations');
        const importFile = content.querySelector('#renamer-import-file');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', function() {
                importFile.click();
            });
            importFile.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        const imported = JSON.parse(evt.target.result);
                        const currentLang = state.lang || 'fr';
                        if (Array.isArray(imported) && imported.length > 0 && imported[0].translationKey) {
                            imported.forEach(function(item) {
                                const key = item.translationKey;
                                Object.keys(item).forEach(function(lang) {
                                    if (lang !== 'translationKey' && item[lang] !== undefined && item[lang] !== null && item[lang] !== '') {
                                        if (!translations[lang]) translations[lang] = {};
                                        translations[lang][key] = item[lang];
                                        if (lang === currentLang) {
                                            saveCustomTranslation(key, item[lang]).catch(function() {});
                                        }
                                    }
                                });
                            });
                        } else if (typeof imported === 'object' && !Array.isArray(imported)) {
                            if (!translations[currentLang]) translations[currentLang] = {};
                            Object.keys(imported).forEach(function(key) {
                                if (imported[key] !== undefined && imported[key] !== null && imported[key] !== '') {
                                    translations[currentLang][key] = imported[key];
                                    saveCustomTranslation(key, imported[key]).catch(function() {});
                                }
                            });
                        }
                        showToast(t('translationsImported') || 'Traductions importées', 'success');
                        renderRules();
                        updatePreview();
                        rebuildTranslationLangDropdown();
                        renderSettingsTranslations();
                    } catch (err) {
                        showToast(t('importError') || 'Erreur lors de l\'import', 'error');
                    }
                };
                reader.readAsText(file);
            });
        }

        const addBtn = content.querySelector('#renamer-add-translation-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                showAddTranslationPopup(addBtn);
            });
        }

        content.querySelectorAll('.renamer-settings-item[data-translation-key]').forEach(item => {
            const key = item.dataset.translationKey;
            item.querySelector('[data-action="save"]').addEventListener('click', function() {
                const input = item.querySelector('input');
                if (!input) return;
                const newVal = input.value.trim();
                if (!newVal) return;
                const viewLang = state.translationPopupLang || state.lang;
                if (!translations[viewLang]) translations[viewLang] = {};
                translations[viewLang][key] = newVal;
                saveCustomTranslation(key, newVal).then(() => {
                    showToast(t('translationSaved') || 'Traduction enregistrée', 'success');
                    input.dataset.original = newVal;
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

        apiRequest(getBaseUrl() + '/rename', {
            method: 'POST',
            body: JSON.stringify(payload)
        }).then(body => {
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
        console.log('[Renamer] closeDialog called, setting __renamerAppClosed=true');
        window.__renamerAppClosed = true;
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

    try {
        if (typeof RenamerApp !== 'undefined' && typeof RenamerApp.loadNavigationScript === 'function') {
            RenamerApp.loadNavigationScript().then(function() {
                var audioScript = document.createElement('script');
                audioScript.src = '/apps/renamer/js/audio-player.js';
                audioScript.onload = function() {
                    console.log('[Renamer] audio-player.js loaded');
                    var metaScript = document.createElement('script');
                    metaScript.src = '/apps/renamer/js/app-metadata.js';
                    metaScript.onload = function() { console.log('[Renamer] app-metadata.js loaded'); };
                    metaScript.onerror = function() { console.warn('[Renamer] app-metadata.js failed to load'); };
                    document.head.appendChild(metaScript);
                };
                audioScript.onerror = function() { console.warn('[Renamer] audio-player.js failed to load'); };
                document.head.appendChild(audioScript);
            }).catch(function(err) {
                console.warn('[Renamer] navigation.js unavailable, loading audio-player.js and app-metadata.js anyway:', err);
                var audioScript = document.createElement('script');
                audioScript.src = '/apps/renamer/js/audio-player.js';
                audioScript.onload = function() {
                    console.log('[Renamer] audio-player.js loaded');
                    var metaScript = document.createElement('script');
                    metaScript.src = '/apps/renamer/js/app-metadata.js';
                    metaScript.onload = function() { console.log('[Renamer] app-metadata.js loaded'); };
                    metaScript.onerror = function() { console.warn('[Renamer] app-metadata.js failed to load'); };
                    document.head.appendChild(metaScript);
                };
                audioScript.onerror = function() { console.warn('[Renamer] audio-player.js failed to load'); };
                document.head.appendChild(audioScript);
            });
        } else {
            var audioScript = document.createElement('script');
            audioScript.src = '/apps/renamer/js/audio-player.js';
            audioScript.onload = function() {
                console.log('[Renamer] audio-player.js loaded');
                var metaScript = document.createElement('script');
                metaScript.src = '/apps/renamer/js/app-metadata.js';
                metaScript.onload = function() { console.log('[Renamer] app-metadata.js loaded'); };
                metaScript.onerror = function() { console.warn('[Renamer] app-metadata.js failed to load'); };
                document.head.appendChild(metaScript);
            };
            audioScript.onerror = function() { console.warn('[Renamer] audio-player.js failed to load'); };
            document.head.appendChild(audioScript);
        }
    } catch (e) {
        console.warn('[Renamer] metadata script injection failed', e);
    }

    return {
        openDialog: openDialog,
        registerTab: registerTab,
        getTab: getTab,
        listTabs: listTabs,
        tabs: tabs,
        loadNavigationScript: loadNavigationScript,
    };
})();