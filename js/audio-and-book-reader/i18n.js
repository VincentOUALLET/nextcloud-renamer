(function (L) {
    'use strict';

    var state = L.state;
    L.TR = {
fr: {
            title: 'Bibliothèque',
            addLibrary: 'Ajouter une librairie',
            filterAll: 'Tous les types',
            filterExt: 'Filtrer par extension',
            toggleFlat: 'Affichage applati',
            toggleHierarchical: 'Affichage hiérarchique',
            toggleFileInfo: 'Basculer les infos de fichiers',
            preview: 'Aperçu',
            series: 'Série',
            chapter: 'Chapitre',
            fileType: 'Type',
            displayName: 'Nom affiché',
            filterColumns: 'Colonnes',
            filterColumnsAll: 'Tout',
            toggleGrid: 'Vue grille',
            toggleTable: 'Vue tableau',
            showFileCounts: 'Afficher les compteurs',
            hideFileCounts: 'Masquer les compteurs',
            pages: 'pages',
            empty: 'Aucune librairie',
            noLibraries: 'Aucune bibliothèque à rescanner',
            emptyHint: 'Cliquez sur "Ajouter une librairie" pour commencer à scanner votre collection de documents.',
            readOnlyHint: 'Administré par un administrateur — les bibliothèques sont partagées et en lecture seule.',
            scan: 'Scanner un dossier',
            scanError: 'Scan échoué',
            scanCancelled: 'Scan annulé',
            scanInProgress: 'Scan en cours…',
            scanComplete: 'Scan terminé',
            rescan: 'Rescanner',
            rescanInProgress: 'Rescan en cours…',
            rescanComplete: 'Rescan terminé',
            rescanLibrary: 'Rescanner la librairie',
            rescanCollection: 'Rescanner la collection',
            rescanEmpty: 'Aucun fichier trouvé lors du rescan',
            documents: 'documents',
            noResults: 'Aucun fichier trouvé',
            newLibPrompt: 'Nom de la librairie',
            newLibPlaceholder: 'ex: BD, Romans, Mangas',
            continueReading: 'Continuer la lecture',
            inProgress: 'En cours de lecture',
            inProgressAudio: 'En cours d\'écoute',
            readerRead: 'Lu',
            myFavorites: 'Mes favoris',
            noFavorites: 'Aucun favori',
            favoritesHint: 'Pages marquées comme favoris',
            noProgress: 'Aucune progression enregistrée',
            collection: 'Collection',
            collections: 'Collections',
            subCollections: 'Sous-collections',
            images: 'Images',
            totalFiles: 'fichiers au total',
            files: 'Fichiers',
            tomes: 'Tomes',
            tome: 'Tome',
            missingTome: 'Tome Manquant',
            progress: ' progression',
            open: 'Ouvrir',
            unsupported: 'Format non supporté',
            readError: 'Impossible de lire le fichier',
            loadError: 'Chargement échoué',
            back: 'Retour',
            home: 'Accueil',
            size: 'taille',
            page: 'Page',
            pages: 'Pages',
            percent: '%',
            convertCbr: 'Conversion CBR…',
            convertCbrError: 'Conversion CBR impossible',
             deleteProgress: 'Supprimer la progression',
             progressDeleted: 'Progression supprimée',
             scanFolderDialog: 'Sélectionner un dossier à scanner',
             scanConfirm: 'Scanner ce dossier',
             scanCancel: 'Annuler',
             subfolders: 'Sous-dossiers',
             scanFiles: 'Fichiers',
             navFavorites: 'Favoris',
             navNoFavorites: 'Aucun favori',
             navAddToFavorites: 'Ajouter aux favoris',
             navRemoveFavorite: 'Retirer du favori',
             navFavoriteAdded: 'Ajouté aux favoris',
             navFavoriteRemoved: 'Retiré des favoris',
             navMore: 'Plus',
             navLoading: 'Chargement…',
             librariesLabel: 'Bibliothèques',
             toggleSidebar: 'Réduire le menu',
             reduce: 'Réduire',
             expand: 'Agrandir',
             navigationBreadcrumbRoot: 'Racine',
            readerClose: 'Fermer',
            readerFullscreen: 'Plein écran',
            readerExitFullscreen: 'Quitter le plein écran',
            loading: 'Chargement…',
             rename: 'Renommer',
             renameLibrary: 'Renommer la librairie',
                renameCollection: 'Renommer la collection',
                renamed: 'Renommé',
                renamedError: 'Échec du renommage',
                contextDelete: 'Supprimer',
                contextDeleteLib: 'Supprimer la librairie',
                contextDeleteCol: 'Supprimer la collection',
                changeLibraryType: 'Changer le type de librairie',
                changeColType: 'Changer le type de collection',
                addLibraryPath: 'Ajouter un dossier',
                editLibrary: 'Modifier librairie',
                editCollection: 'Modifier la collection',
                modifyFolder: 'Remplacer',
                deleteFolder: 'Supprimer le dossier',
                 libFolderListTitle: 'Dossiers de la bibliothèque',
                importFromNextcloud: 'Importer depuis Nextcloud',
                noExistingCovers: 'Aucune image de couverture existante',
                typeChanged: 'Type mis à jour',
                typeChangeError: 'Erreur lors du changement de type',
             goToCollection: 'Aller à la collection',
             deleted: 'Supprimé',
             deleteLibConfirm: 'Supprimer la librairie "{name}" ?',
             deleteColConfirm: 'Supprimer la collection "{name}" ?',
             confirm: 'Confirmer',
             cancel: 'Annuler',
             close: 'Fermer',
             markAsRead: 'Marquer comme lu',
             markAsUnread: 'Marquer comme non lu',
             markCollectionRead: 'Marquer comme lue',
             markCollectionUnread: 'Marquer comme non lue',
              markedRead: 'Marqué comme lu',
              markedUnread: 'Marqué comme non lu',
              settings: 'Paramètres',
              generalSettings: 'Paramètres généraux',
              manageTranslations: 'Traductions',
              switchLang: 'Langue',
              save: 'Sauvegarder',
              addTranslation: 'Ajouter une traduction',
              exportAllTranslations: 'Exporter toutes les traductions',
              importAllTranslations: 'Importer toutes les traductions',
              translationsExported: 'Traductions exportées',
              translationsImported: 'Traductions importées',
              translationSaved: 'Traduction enregistrée',
              noTranslations: 'Aucune traduction',
              importError: "Erreur lors de l'import",
               readerSettings: 'Paramètres',
               readerSettingsPlaceholder: 'Bientôt',
               readerAllPages: 'Toutes les pages',
               readerToggleFavorite: 'Étoile de page',
               readerExploreMode: 'Mode exploration / Exploration mode',
               readerFitContain: 'Classique',
               readerFitCover: 'Zoom',
               readerFitCrop: 'Recadrer',
               readerFavoritesOnlyHint: 'Afficher uniquement les pages favorites',
               readerFavoritesOnlyActive: 'Mode favoris activé — navigation entre les pages favorites',
                readerFavoritesOnlyInactive: 'Mode favoris désactivé',
                readerCtxFavOnlyShow: 'Afficher favoris',
                readerCtxFavOnlyClassic: 'Affichage classique',
               readerNoPageFavorites: 'Aucune page favorite',
               readerFavoriteAdded: 'Page favorite ajoutée',
               readerFavoriteRemoved: 'Page favorite retirée',
               readerCtxAddFavorite: 'Ajouter aux favoris',
               readerCtxRemoveFavorite: 'Retirer des favoris',
               readerCtxNextPage: 'Page suivante',
               readerCtxPrevPage: 'Page précédente',
               readerGoToPrevTome: 'Volume précédent',
               readerPrevTomePrompt: 'Voulez-vous naviguer vers le tome précédent ?',
               readerBrowseWithoutProgress: 'Navigation sans progression',
               readerErasePrevProgress: 'Effacer la progression',
               readerCancel: 'Annuler',
             readerGoToPage: 'Aller à la page',
             prev: 'Précédent',
             next: 'Suivant',
             metadataSearch: 'Rechercher...',
               newLanguageLabel: 'Nouvelle langue',
               createLanguage: 'Créer',
               cancel: 'Annuler',
               languageChanged: 'Langue modifiée',
               setAsDefault: 'Définir par défaut',
               basedOn: 'Basé sur',
               fillManuallyHint: 'Laisser vide, je remplirai',
               otherLanguage: 'Autre',
               languageAdded: 'Langue ajoutée',
               languageExists: 'Cette langue existe déjà',
               addLanguage: 'Ajouter une langue',
               inputLanguageCode: 'Code de langue',
               noCover: 'Pas d\'image',
               noCoverHint: 'Sélectionner en une',
               selectCoverTitle: 'Sélectionner une image de couverture',
               editCover: 'Modifier l\'image',
                coverSet: 'Couverture définie',
                coverSetError: 'Erreur lors de la définition de la couverture',
                coverReset: 'Réinitialiser la couverture',
                coverSelect: 'Sélectionner',
                newLibTypePrompt: 'Type de bibliothèque',
                libTypeFlat: 'Livres décorrélés',
                libTypeTomes: 'Séries / tomes',
                libTypeAudio: 'Livre audio',
                libTypeFlatHint: 'Tous les documents sont listés ensemble, sans regroupement par série.',
                libTypeTomesHint: 'Regroupe les documents par dossier (série) avec numérotation de tomes.',
                libTypeAudioHint: 'Bibliothèque pour fichiers audio (mp3, flac, m4a).',
                libTypeConfirm: 'Créer',
                addLibraryPathTitle: 'Ajouter un dossier',
                addLibraryPathPrompt: 'Nouveau dossier pour {name}',
                libTypeFlatLabel: 'Applati',
                libTypeTomesLabel: 'Séries',
                libTypeAudioLabel: 'Audio',
                libTypeAudioSoon: 'Fonctionnalité à venir',
                libTypeOverwriteWarning: ' Changer le type écrasera les paramètres de classification des collections existantes. Continuer ?',
                libTypeUpdated: 'Type de bibliothèque mis à jour',
                libTypeUpdateError: 'Erreur lors de la mise à jour du type',
                libPathsUpdated: 'Dossiers mis à jour',
                libPathAdded: 'Dossier ajouté',
                libPathRemoved: 'Dossier retiré',
                libPathRemoveError: 'Erreur lors du retrait du dossier',
                libPathRemoveConfirm: 'Retirer le dossier "{path}" de la bibliothèque "{name}" ?',
                libPathCannotRemoveLast: 'Impossible de retirer le dernier dossier',
                colTypeOverride: 'Type de collection',
                colTypeInherit: 'Hériter de la bibliothèque',
                colTypeFlat: 'Livres décorrélés',
                colTypeTomes: 'Séries / tomes',
                colTypeAudio: 'Livre audio',
                colTypeUpdated: 'Type de collection mis à jour',
                colTypeUpdateError: 'Erreur lors de la mise à jour du type',
                libFolders: 'dossiers',
                libFolder: 'dossier',
            },
        en: {
            title: 'Library',
            addLibrary: 'Add a library',
            filterAll: 'All types',
            filterExt: 'Filter by extension',
            toggleFlat: 'Flat view',
            toggleHierarchical: 'Hierarchical view',
            toggleFileInfo: 'Toggle file info',
            preview: 'Preview',
            series: 'Series',
            chapter: 'Chapter',
            fileType: 'Type',
            displayName: 'Displayed name',
            filterColumns: 'Columns',
            filterColumnsAll: 'All',
            toggleGrid: 'Grid view',
            toggleTable: 'Table view',
            showFileCounts: 'Show counts',
            hideFileCounts: 'Hide counts',
            pages: 'pages',
            empty: 'No libraries',
            noLibraries: 'No library to rescan',
            emptyHint: 'Click "Add a library" to start scanning your document collection.',
            readOnlyHint: 'Admin-managed — libraries are shared and read-only.',
            scan: 'Scan a folder',
            scanError: 'Scan failed',
            scanCancelled: 'Scan cancelled',
            scanInProgress: 'Scanning…',
            scanComplete: 'Scan complete',
            rescan: 'Rescan',
            rescanInProgress: 'Rescanning…',
            rescanComplete: 'Rescan complete',
            rescanLibrary: 'Rescan library',
            rescanCollection: 'Rescan collection',
            rescanEmpty: 'No files found during rescan',
            documents: 'documents',
            noResults: 'No files found',
            newLibPrompt: 'Library name',
            newLibPlaceholder: 'ex: Comics, Novels, Mangas',
            continueReading: 'Continue reading',
            inProgress: 'In progress',
            inProgressAudio: 'Now listening',
            readerRead: 'Read',
            myFavorites: 'My Favorites',
            noFavorites: 'No favorites',
            favoritesHint: 'Bookmarked pages',
            noProgress: 'No progress saved',
            collection: 'Collection',
            collections: 'Collections',
            subCollections: 'Sub-collections',
            images: 'Images',
            totalFiles: 'total',
            files: 'Files',
            tomes: 'Tomes',
            tome: 'Volume',
            missingTome: 'Missing Tome',
            progress: ' progress',
            open: 'Open',
            unsupported: 'Unsupported format',
            readError: 'Could not read file',
            loadError: 'Load failed',
            back: 'Back',
            home: 'Home',
            size: 'size',
            page: 'Page',
            pages: 'Pages',
            percent: '%',
            convertCbr: 'Converting CBR…',
            convertCbrError: 'Could not convert CBR',
             deleteProgress: 'Delete progress',
             progressDeleted: 'Progress deleted',
             scanFolderDialog: 'Select a folder to scan',
             scanConfirm: 'Scan this folder',
             scanCancel: 'Cancel',
             subfolders: 'Subfolders',
             scanFiles: 'Files',
             navFavorites: 'Favorites',
             navNoFavorites: 'No favorites',
             navAddToFavorites: 'Add to favorites',
             navRemoveFavorite: 'Remove from favorites',
             navFavoriteAdded: 'Added to favorites',
             navFavoriteRemoved: 'Removed from favorites',
             navMore: 'More',
             navLoading: 'Loading…',
             librariesLabel: 'Libraries',
             toggleSidebar: 'Expand menu',
             reduce: 'Reduce',
             expand: 'Expand',
             navigationBreadcrumbRoot: 'Root',
            readerClose: 'Close',
            readerFullscreen: 'Fullscreen',
            readerExitFullscreen: 'Exit fullscreen',
            loading: 'Loading…',
             rename: 'Rename',
             renameLibrary: 'Rename library',
                renameCollection: 'Rename collection',
                renamed: 'Renamed',
                renamedError: 'Rename failed',
                contextDelete: 'Delete',
                contextDeleteLib: 'Delete library',
                contextDeleteCol: 'Delete collection',
                changeLibraryType: 'Change library type',
                changeColType: 'Change collection type',
                addLibraryPath: 'Add folder',
                editLibrary: 'Edit library',
                editCollection: 'Edit collection',
                modifyFolder: 'Replace',
                deleteFolder: 'Delete folder',
                 libFolderListTitle: 'Library folders',
                importFromNextcloud: 'Import from Nextcloud',
                noExistingCovers: 'No existing cover images',
                typeChanged: 'Type updated',
                typeChangeError: 'Error updating type',
             goToCollection: 'Go to collection',
             deleted: 'Deleted',
             deleteLibConfirm: 'Delete library "{name}" ?',
             deleteColConfirm: 'Delete collection "{name}" ?',
             confirm: 'Confirm',
             cancel: 'Cancel',
             close: 'Close',
             markAsRead: 'Mark as read',
             markAsUnread: 'Mark as unread',
             markCollectionRead: 'Mark as read',
             markCollectionUnread: 'Mark as unread',
              markedRead: 'Marked as read',
              markedUnread: 'Marked as unread',
              settings: 'Settings',
              generalSettings: 'General settings',
              manageTranslations: 'Translations',
              switchLang: 'Language',
              save: 'Save',
              addTranslation: 'Add translation',
              exportAllTranslations: 'Export all translations',
              importAllTranslations: 'Import all translations',
              translationsExported: 'Translations exported',
              translationsImported: 'Translations imported',
              translationSaved: 'Translation saved',
              noTranslations: 'No translations',
              importError: 'Import error',
               readerSettings: 'Settings',
               readerSettingsPlaceholder: 'Coming soon',
               readerAllPages: 'All pages',
               readerToggleFavorite: 'Toggle page favorite',
               readerExploreMode: 'Exploration mode',
               readerFitContain: 'Fit to page',
               readerFitCover: 'Zoom',
               readerFitCrop: 'Crop',
               readerFavoritesOnlyHint: 'Show only favorite pages',
               readerFavoritesOnlyActive: 'Favorites mode active — navigating between favorite pages',
                readerFavoritesOnlyInactive: 'Favorites mode deactivated',
                readerCtxFavOnlyShow: 'Show favorites',
                readerCtxFavOnlyClassic: 'Normal view',
               readerNoPageFavorites: 'No favorite pages',
               readerFavoriteAdded: 'Page favorite added',
               readerFavoriteRemoved: 'Page favorite removed',
               readerCtxAddFavorite: 'Add to favorites',
               readerCtxRemoveFavorite: 'Remove from favorites',
               readerCtxNextPage: 'Next page',
               readerCtxPrevPage: 'Previous page',
               readerGoToPrevTome: 'Previous volume',
               readerPrevTomePrompt: 'Navigate to the previous volume?',
               readerBrowseWithoutProgress: 'Browse without progress',
               readerErasePrevProgress: 'Erase progress',
               readerCancel: 'Cancel',
             readerGoToPage: 'Go to page',
             prev: 'Previous',
             next: 'Next',
             metadataSearch: 'Search...',
               newLanguageLabel: 'New language',
               createLanguage: 'Create',
               cancel: 'Cancel',
               languageChanged: 'Language changed',
               setAsDefault: 'Set as default',
               basedOn: 'Based on',
               fillManuallyHint: 'Leave empty, I will fill in',
               otherLanguage: 'Other',
               languageAdded: 'Language added',
               languageExists: 'This language already exists',
               addLanguage: 'Add language',
               inputLanguageCode: 'Language code',
               noCover: 'No image',
               noCoverHint: 'Select as cover',
               selectCoverTitle: 'Select a cover image',
               editCover: 'Edit image',
                 coverSet: 'Cover set',
                 coverSetError: 'Error setting cover',
                 coverReset: 'Reset to default',
                coverSelect: 'Select',
                newLibTypePrompt: 'Library type',
                libTypeFlat: 'Flat books',
                libTypeTomes: 'Series / volumes',
                libTypeAudio: 'Audiobook',
                libTypeFlatHint: 'All documents listed together, no series grouping.',
                libTypeTomesHint: 'Groups documents by folder (series) with volume numbering.',
                libTypeAudioHint: 'Library for audio files (mp3, flac, m4a).',
                libTypeConfirm: 'Create',
                addLibraryPathTitle: 'Add folder',
                addLibraryPathPrompt: 'New folder for {name}',
                libTypeFlatLabel: 'Flat',
                libTypeTomesLabel: 'Series',
                libTypeAudioLabel: 'Audio',
                libTypeAudioSoon: 'Coming soon',
                libTypeOverwriteWarning: ' Changing the type will overwrite collection classification settings. Continue?',
                libTypeUpdated: 'Library type updated',
                libTypeUpdateError: 'Error updating type',
                libPathsUpdated: 'Folders updated',
                libPathAdded: 'Folder added',
                libPathRemoved: 'Folder removed',
                libPathRemoveError: 'Error removing folder',
                libPathRemoveConfirm: 'Remove folder "{path}" from library "{name}"?',
                libPathCannotRemoveLast: 'Cannot remove the last folder',
                colTypeOverride: 'Collection type',
                colTypeInherit: 'Inherit from library',
                colTypeFlat: 'Flat books',
                colTypeTomes: 'Series / volumes',
                colTypeAudio: 'Audiobook',
                colTypeUpdated: 'Collection type updated',
                colTypeUpdateError: 'Error updating type',
                libFolders: 'folders',
                libFolder: 'folder',
            },
    };

    var TR = L.TR;

          var LANG = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.slice(0, 2) : 'fr';
          var storedLang = (typeof localStorage !== 'undefined') ? localStorage.getItem('renamer_default_lang') : null;
          var lang = (storedLang && TR[storedLang]) ? storedLang : (TR[LANG] ? LANG : 'fr');
          state.settingsLangView = lang;

    L.t = function(key) {
        var dict = TR[lang] || TR.fr;
        return dict[key] || TR.fr[key] || key;
    };
    var t = L.t;

    L.refreshTranslations = function() {
        var els = document.querySelectorAll('[data-translation]');
        els.forEach(function(el) {
        var key = el.getAttribute('data-translation');
        var text = t(key);
        if (!text || text === key) return;
        
        var children = Array.from(el.children);
        var hasNonSvgChildren = children.some(function(child) {
        return child.tagName !== 'SVG';
        });
        if (hasNonSvgChildren) return;
        
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if ('placeholder' in el) el.placeholder = text;
        return;
        }        
    });
    };

L.saveCustomTranslation = function saveCustomTranslation(translationKey, translatedText, language) {
           var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
           if (typeof OC !== 'undefined' && OC.requestToken) {
               headers['requesttoken'] = OC.requestToken;
           }
           var lang = language || (TR[language] ? language : 'fr');
           if (lang) {
               headers['Accept-Language'] = lang;
               headers['X-Translation-Language'] = lang;
           }
           return fetch(getBaseUrl() + '/api/translations', {
               method: 'POST',
               credentials: 'same-origin',
               headers: headers,
               body: JSON.stringify({ translationKey: translationKey, translatedText: translatedText, language: lang })
           }).then(function (r) { return r.json(); });
       }

        L.loadCustomTranslations = function loadCustomTranslations() {
            var headers = { 'Accept': 'application/json', 'Accept-Language': lang };
            if (typeof OC !== 'undefined' && OC.requestToken) {
                headers['requesttoken'] = OC.requestToken;
            }
            return fetch(getBaseUrl() + '/api/translations', {
                method: 'GET',
                credentials: 'same-origin',
                headers: headers
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (data && data.success && data.translations) {
                    var responseLang = data.language || lang || 'fr';
                    state.customTranslations = {};
                    Object.keys(data.translations).forEach(function (key) {
                        var val = data.translations[key];
                        if (typeof val === 'object' && val !== null) {
                            Object.keys(val).forEach(function (langCode) {
                                if (val[langCode] !== undefined && val[langCode] !== null && val[langCode] !== '') {
                                    if (!TR[langCode]) TR[langCode] = {};
                                    TR[langCode][key] = val[langCode];
                                    if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                                    state.customTranslations[key][langCode] = val[langCode];
                                }
                            });
                        } else if (typeof val === 'string' && val !== '') {
                            if (!TR[responseLang]) TR[responseLang] = {};
                            TR[responseLang][key] = val;
                            if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                            state.customTranslations[key][responseLang] = val;
                        }
                    });
               } else {
                   state.customTranslations = {};
               }
            }).catch(function (err) {
                console.error('loadCustomTranslations error:', err);
                state.customTranslations = {};
            });
        }

       L.showReaderSettings = function showReaderSettings() {
           var existing = document.getElementById('lib-reader-settings-overlay');
           if (existing) { existing.remove(); return; }
           var SETTINGS_GEAR_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_GEAR) || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
           var CLOSE_SVG = (window.RenamerIcons && window.RenamerIcons.CLOSE) || '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"></path></svg>';
           var overlay = document.createElement('div');
           overlay.id = 'lib-reader-settings-overlay';
            overlay.className = 'lib-dialog-overlay reader-settings-overlay';
            overlay.innerHTML =
                '<div class="lib-dialog-modal reader-settings-modal">' +
                   '<div class="lib-modal-header">' +
                       '<h3 data-translation="settings">' + escapeHtml(t('settings')) + '</h3>' +
                       '<button type="button" id="lib-reader-settings-close" class="lib-settings-close-btn" title="' + escapeHtml(t('close')) + '" data-translation="close">' + CLOSE_SVG + '</button>' +
                   '</div>' +
                    '<div class="reader-settings-menu">' +
                         '<button class="reader-settings-menu-item" data-menu="general">' +
                             '<span class="reader-settings-icon">' + SETTINGS_GEAR_SVG + '</span>' +
                             '<span class="reader-settings-item-label" data-translation="generalSettings">' + escapeHtml(t('generalSettings')) + '</span>' +
                             '<span class="reader-settings-chevron">›</span>' +
                         '</button>' +
                    '</div>' +
               '</div>';
           document.body.appendChild(overlay);

           var closeBtn = overlay.querySelector('#lib-reader-settings-close');
           if (closeBtn) {
               closeBtn.addEventListener('click', function () { overlay.remove(); });
           }
           overlay.addEventListener('click', function (e) {
               if (e.target === overlay) overlay.remove();
           });
           overlay.querySelectorAll('[data-menu]').forEach(function (btn) {
               btn.addEventListener('click', function () {
                   var menu = this.getAttribute('data-menu');
                   if (menu === 'general') {
                       overlay.remove();
                       showReaderGeneralSettings();
                   }
               });
           });
       }

        L.showReaderGeneralSettings = function showReaderGeneralSettings() {
            var existing = document.getElementById('lib-reader-settings-overlay');
            if (existing) { existing.remove(); return; }
            var CLOSE_SVG = (window.RenamerIcons && window.RenamerIcons.CLOSE) || '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"></path></svg>';
            var BACK_SVG = '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 3L5 8L10 13"/></svg>';
            var TRANSLATE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.7l4.6 4.6-4.6 4.6"/><path d="M9.5 9.5A4.5 4.5 0 0 1 15 12.5a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1 0-9 4.5 4.5 0 0 1 4.5 4.5v0"/><path d="M3 3l18 18"/><path d="M12 2v5.5"/></svg>';
            var overlay = document.createElement('div');
            overlay.id = 'lib-reader-settings-overlay';
            overlay.className = 'lib-dialog-overlay reader-settings-overlay';
            overlay.innerHTML =
                '<div class="lib-dialog-modal reader-settings-modal">' +
                    '<div class="lib-modal-header">' +
                        '<button type="button" id="lib-reader-settings-back" class="lib-settings-close-btn" title="' + escapeHtml(t('back')) + '" data-translation="back">' + BACK_SVG + '</button>' +
                        '<h3 id="lib-reader-settings-title" data-translation="generalSettings">' + escapeHtml(t('generalSettings')) + '</h3>' +
                        '<button type="button" id="lib-reader-settings-close" class="lib-settings-close-btn" title="' + escapeHtml(t('close')) + '" data-translation="close">' + CLOSE_SVG + '</button>' +
                    '</div>' +
                    '<div id="lib-reader-settings-content" class="reader-settings-content">' +
                        '<button type="button" id="lib-reader-general-translations-btn" class="reader-settings-general-item" data-translation="manageTranslations">' +
                            '<span class="reader-settings-icon">' + TRANSLATE_SVG + '</span>' +
                            '<span class="reader-settings-item-label" data-translation="manageTranslations">' + escapeHtml(t('manageTranslations')) + '</span>' +
                            '<span class="reader-settings-chevron">›</span>' +
                        '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);
            overlay.querySelector('#lib-reader-settings-back').addEventListener('click', function () {
                overlay.remove();
                showReaderSettings();
            });
            overlay.querySelector('#lib-reader-settings-close').addEventListener('click', function () {
                overlay.remove();
            });
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.remove();
            });
            var tradBtn = overlay.querySelector('#lib-reader-general-translations-btn');
            if (tradBtn) {
                tradBtn.addEventListener('click', function () {
                    overlay.remove();
                    showReaderTranslationsPanel();
                });
            }
        }

        L.showReaderTranslationsPanel = function showReaderTranslationsPanel() {
            var existing = document.getElementById('lib-reader-settings-overlay');
            if (existing) { existing.remove(); return; }
            var CLOSE_SVG = (window.RenamerIcons && window.RenamerIcons.CLOSE) || '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"></path></svg>';
            var BACK_SVG = '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 3L5 8L10 13"/></svg>';
            var overlay = document.createElement('div');
            overlay.id = 'lib-reader-settings-overlay';
            overlay.className = 'lib-dialog-overlay reader-settings-overlay';
            overlay.innerHTML =
                '<div class="lib-dialog-modal reader-settings-modal">' +
                    '<div class="lib-modal-header">' +
                        '<button type="button" id="lib-reader-settings-back" class="lib-settings-close-btn" title="' + escapeHtml(t('back')) + '" data-translation="back">' + BACK_SVG + '</button>' +
                        '<h3 id="lib-reader-settings-title" data-translation="manageTranslations">' + escapeHtml(t('manageTranslations')) + '</h3>' +
                        '<button type="button" id="lib-reader-settings-close" class="lib-settings-close-btn" title="' + escapeHtml(t('close')) + '" data-translation="close">' + CLOSE_SVG + '</button>' +
                    '</div>' +
                    '<div id="lib-reader-settings-search-wrapper" class="reader-settings-search-wrapper">' +
                        '<input type="text" id="lib-reader-translation-search" class="reader-settings-search-input" placeholder="' + escapeHtml(t('metadataSearch') || 'Rechercher...') + '" data-translation="metadataSearch" />' +
                        '<button type="button" id="lib-reader-translation-lang" class="reader-settings-btn-small lib-translation-lang-btn" data-translation="switchLang"><span class="lib-lang-label">' + state.settingsLangView.toUpperCase() + '</span> <svg fill="currentColor" width="12" height="12" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>' +
                        '<button type="button" id="lib-reader-translation-add-lang" class="reader-settings-btn-small lib-translation-add-lang-btn" data-translation="addLanguage" title="' + escapeHtml(t('newLanguageLabel')) + '">+</button>' +
                        '<div id="lib-reader-translations-lang-dropdown" class="lib-translation-lang-dropdown"></div>' +
                    '</div>' +
                    '<div id="lib-reader-settings-content" class="reader-settings-content-alt"></div>' +
                '</div>';
            document.body.appendChild(overlay);
            overlay.querySelector('#lib-reader-settings-back').addEventListener('click', function () {
                overlay.remove();
                showReaderGeneralSettings();
            });
            overlay.querySelector('#lib-reader-settings-close').addEventListener('click', function () {
                overlay.remove();
            });
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.remove();
            });

            var langBtn = overlay.querySelector('#lib-reader-translation-lang');
            var langDropdown = overlay.querySelector('#lib-reader-translations-lang-dropdown');
            var addLangBtn = overlay.querySelector('#lib-reader-translation-add-lang');
            var wrapperEl = overlay.querySelector('#lib-reader-settings-search-wrapper');

            refreshLangDropdown(langBtn, langDropdown);

            langBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (langDropdown.style.display === 'none') {
                    var rect = langBtn.getBoundingClientRect();
                    var wr = wrapperEl.getBoundingClientRect();
                    langDropdown.style.left = (rect.left - wr.left) + 'px';
                    langDropdown.style.top = (rect.bottom - wr.top + 4) + 'px';
                    langDropdown.style.display = 'block';
                } else {
                    langDropdown.style.display = 'none';
                }
            });
            addLangBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                langDropdown.style.display = 'none';
                showAddLanguageModal();
            });
            document.addEventListener('click', function onOutside(e) {
                if (!langDropdown.contains(e.target) && e.target !== langBtn && e.target !== addLangBtn) {
                    langDropdown.style.display = 'none';
                    document.removeEventListener('click', onOutside);
                }
            });

            var searchInput = overlay.querySelector('#lib-reader-translation-search');
            searchInput.addEventListener('input', function () {
                applyLibTranslationFilter();
            });

            if (!state.customTranslations) {
                loadCustomTranslations().then(function () {
                    renderLibTranslations();
                });
            } else {
                renderLibTranslations();
            }
        }


       L.renderLibTranslations = function renderLibTranslations() {
           var content = document.getElementById('lib-reader-settings-content');
           if (!content) return;
           var viewLang = state.settingsLangView;
           var allKeys = new Set();
           Object.keys(TR).forEach(function (l) {
               Object.keys(TR[l] || {}).forEach(function (k) { allKeys.add(k); });
           });
           var sortedKeys = Array.from(allKeys).sort();
           if (!sortedKeys.length) {
                content.innerHTML = '<div class="reader-settings-translations"><div class="reader-settings-empty" data-translation="noTranslations">' + escapeHtml(t('noTranslations')) + '</div></div>';
                return;
            }
            var html = '<div class="reader-settings-translations">';
            html += '<div class="reader-settings-translations-actions">';
            html += '<button type="button" class="reader-settings-btn-small lib-translation-btn-flex" id="lib-reader-export-translations" data-translation="exportAllTranslations">' + escapeHtml(t('exportAllTranslations')) + '</button>';
            html += '<button type="button" class="reader-settings-btn-small lib-translation-btn-flex" id="lib-reader-import-translations" data-translation="importAllTranslations">' + escapeHtml(t('importAllTranslations')) + '</button>';
            html += '<input type="file" id="lib-reader-import-file" accept="application/json,.json" class="reader-settings-hidden-input" />';
            html += '</div>';
           sortedKeys.forEach(function (key) {
               var customVal = null;
               if (state.customTranslations && state.customTranslations[key] && state.customTranslations[key][viewLang] !== undefined && state.customTranslations[key][viewLang] !== null && state.customTranslations[key][viewLang] !== '') {
                   customVal = state.customTranslations[key][viewLang];
               }
               var rawBase = (TR[viewLang] && TR[viewLang][key]);
               var baseVal = typeof rawBase === 'string' ? rawBase : (rawBase === null || rawBase === undefined ? '' : String(rawBase));
               var rawValue = customVal !== null ? customVal : baseVal;
               var value = typeof rawValue === 'string' ? rawValue : String(rawValue);
               html += '<div class="reader-settings-item" data-translation-key="' + escapeHtml(key) + '">';
               html += '<div class="reader-settings-item-name"><code>' + escapeHtml(key) + '</code></div>';
                html += '<div class="reader-settings-item-actions-wrapper">';
                html += '<input type="text" data-original="' + escapeHtml(value) + '" value="' + escapeHtml(value) + '" class="reader-settings-translation-input" />';
                html += '<button type="button" class="reader-settings-btn-small reader-settings-btn-primary lib-save-btn" data-action="save" data-translation="save">' + escapeHtml(t('save')) + '</button>';
               html += '</div></div>';
           });
           html += '</div>';
           content.innerHTML = html;

           content.querySelectorAll('.reader-settings-item[data-translation-key]').forEach(function (item) {
               var key = item.getAttribute('data-translation-key');
               var saveBtn = item.querySelector('[data-action="save"]');
               if (saveBtn) {
                   saveBtn.addEventListener('click', function () {
                       var input = item.querySelector('input');
                       if (!input) return;
                       var newVal = input.value.trim();
                       if (!newVal) return;
                        if (!TR[viewLang]) TR[viewLang] = {};
                        TR[viewLang][key] = newVal;
                        if (!state.customTranslations) state.customTranslations = {};
                        if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                        state.customTranslations[key][viewLang] = newVal;
                        L.saveCustomTranslation(key, newVal, viewLang).then(function () {
                           showLibToast(t('translationSaved'), 'success');
                           input.setAttribute('data-original', newVal);
                       }).catch(function () {
                           showLibToast(t('importError'), 'error');
                       });
                   });
               }
           });

           var exportBtn = content.querySelector('#lib-reader-export-translations');
           if (exportBtn) {
               exportBtn.addEventListener('click', function () {
                   var allLangs = Object.keys(TR);
                   var allKeysSet = new Set();
                   allLangs.forEach(function (l) {
                       Object.keys(TR[l] || {}).forEach(function (k) { allKeysSet.add(k); });
                   });
                   var exportObj = {
                       translations: Array.from(allKeysSet).sort().map(function (key) {
                           var obj = { translationKey: key };
                           allLangs.forEach(function (l) {
                               obj[l] = (TR[l] && TR[l][key]) || '';
                           });
                           return obj;
                       })
                   };
                   var jsonStr = JSON.stringify(exportObj, null, 2);
                   var blob = new Blob([jsonStr], { type: 'application/json' });
                   var url = URL.createObjectURL(blob);
                   var a = document.createElement('a');
                   a.href = url;
                   a.download = 'renamer-translations.json';
                   document.body.appendChild(a);
                   a.click();
                   document.body.removeChild(a);
                   URL.revokeObjectURL(url);
                   showLibToast(t('translationsExported'), 'success');
               });
           }

           var importBtn = content.querySelector('#lib-reader-import-translations');
           var importFile = content.querySelector('#lib-reader-import-file');
           if (importBtn && importFile) {
               importBtn.addEventListener('click', function () {
                   importFile.click();
               });
               importFile.addEventListener('change', function (e) {
                   var file = e.target.files[0];
                   if (!file) return;
                   var reader = new FileReader();
                   reader.onload = function (evt) {
                       try {
                           var imported = JSON.parse(evt.target.result);
                           if (Array.isArray(imported) && imported.length > 0 && imported[0].translationKey) {
                               imported.forEach(function (item) {
                                   var key = item.translationKey;
                                   Object.keys(item).forEach(function (l) {
                                       if (l !== 'translationKey' && item[l] !== undefined && item[l] !== null && item[l] !== '') {
                                           if (!TR[l]) TR[l] = {};
                                           TR[l][key] = item[l];
                                            if (!state.customTranslations) state.customTranslations = {};
                                            if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                                            state.customTranslations[key][l] = item[l];
                                           if (l === state.settingsLangView) {
                                                L.saveCustomTranslation(key, item[l], l).catch(function () {});
                                           }
                                       }
                                   });
                               });
                           } else if (typeof imported === 'object' && !Array.isArray(imported)) {
                               if (!TR[state.settingsLangView]) TR[state.settingsLangView] = {};
                               Object.keys(imported).forEach(function (key) {
                                   if (imported[key] !== undefined && imported[key] !== null && imported[key] !== '') {
                                       TR[state.settingsLangView][key] = imported[key];
                                    if (!state.customTranslations) state.customTranslations = {};
                                    if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                                    state.customTranslations[key][state.settingsLangView] = imported[key];
                                        L.saveCustomTranslation(key, imported[key], state.settingsLangView).catch(function () {});
                                   }
                               });
                           }
                           showLibToast(t('translationsImported'), 'success');
                           renderLibTranslations();
                       } catch (err) {
                           showLibToast(t('importError'), 'error');
                       }
                   };
                   reader.readAsText(file);
               });
           }

           applyLibTranslationFilter();
       }

       L.applyLibTranslationFilter = function applyLibTranslationFilter() {
           var searchInput = document.getElementById('lib-reader-translation-search');
           var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
           var items = document.querySelectorAll('.reader-settings-item[data-translation-key]');
           items.forEach(function (item) {
               var key = item.getAttribute('data-translation-key');
               if (!query) {
                   item.style.display = '';
                   return;
               }
               var visible = key.toLowerCase().includes(query);
               if (!visible) {
                   Object.keys(TR).some(function (l) {
                       var raw = (TR[l] && TR[l][key]);
                       var val = typeof raw === 'string' ? raw : (raw === null || raw === undefined ? '' : String(raw));
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

        L.refreshLangDropdown = function refreshLangDropdown(langBtn, langDropdown) {
            langDropdown.innerHTML = '';
            var langs = Object.keys(TR).filter(function(l) { return TR[l] && typeof TR[l] === 'object'; }).sort();
            if (!langs.length) langs = ['fr', 'en'];
            langs.forEach(function (l) {
                var item = document.createElement('div');
                item.className = 'lib-context-item';
                item.textContent = l.toUpperCase();
                item.addEventListener('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                     state.settingsLangView = l;
                     lang = l;
                     var langLabel = langBtn.querySelector('.lib-lang-label');
                     if (langLabel) langLabel.textContent = l.toUpperCase();
                     langDropdown.style.display = 'none';
                     if (typeof RenamerUtils !== 'undefined' && RenamerUtils.setModalLabels) {
                         RenamerUtils.setModalLabels({ confirm: t('confirm'), cancel: t('cancel'), close: t('close') });
                     }
                     L.render();
                     refreshTranslations();
                    renderLibTranslations();
                    showLibToast(t('languageChanged'), 'info', t('setAsDefault'), function () {
                        state.defaultLang = l;
                        localStorage.setItem('renamer_default_lang', l);
                        showLibToast(t('languageChanged'), 'info');
                    });
                });
                langDropdown.appendChild(item);
            });
        }

        L.getLangs = function getLangs() {
            return Object.keys(TR).filter(function(l) { return TR[l] && typeof TR[l] === 'object'; }).sort();
        }

        L.createLanguage = function createLanguage(code, sourceLang) {
            if (TR[code]) {
                showLibToast(t('languageExists'), 'error');
                return false;
            }
            TR[code] = {};
            if (sourceLang && TR[sourceLang]) {
                Object.keys(TR[sourceLang]).forEach(function (key) {
                    TR[code][key] = '';
                });
            } else {
                var langs = getLangs();
                langs.forEach(function (srcLang) {
                    if (TR[srcLang]) {
                        Object.keys(TR[srcLang]).forEach(function (key) {
                            if (TR[code][key] === undefined) TR[code][key] = '';
                        });
                    }
                });
            }
            state.settingsLangView = code;
            var langLabel = document.querySelector('#lib-reader-translation-lang .lib-lang-label');
            if (langLabel) langLabel.textContent = code.toUpperCase();
            var dd = document.getElementById('lib-reader-translations-lang-dropdown');
            var lb = document.getElementById('lib-reader-translation-lang');
            if (dd && lb) refreshLangDropdown(lb, dd);
            renderLibTranslations();
            showLibToast(t('languageAdded'), 'success');
            return true;
        }

        L.showAddLanguageModal = function showAddLanguageModal() {
            var existing = document.getElementById('lib-add-lang-modal');
            if (existing) { existing.remove(); return; }
            var modal = document.createElement('div');
            modal.id = 'lib-add-lang-modal';
            modal.className = 'lib-add-lang-overlay';
            modal.innerHTML =
                '<div class="lib-add-lang-modal">' +
                    '<h3 class="lib-add-lang-title">' + escapeHtml(t('newLanguageLabel')) + '</h3>' +
                    '<input type="text" id="lib-add-lang-input" class="lib-add-lang-input" placeholder="' + escapeHtml(t('inputLanguageCode') || 'ex: es') + '" />' +
                    '<div class="lib-add-lang-actions">' +
                        '<button type="button" id="lib-add-lang-cancel" class="renamer-btn-small lib-add-lang-cancel-btn">' + escapeHtml(t('cancel')) + '</button>' +
                        '<button type="button" id="lib-add-lang-create" class="renamer-btn-small renamer-btn-primary lib-add-lang-create-btn">' + escapeHtml(t('createLanguage')) + '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
            var input = modal.querySelector('#lib-add-lang-input');
            modal.querySelector('#lib-add-lang-cancel').addEventListener('click', function () { modal.remove(); });
            modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    attemptCreate(input.value.trim());
                }
            });
            modal.querySelector('#lib-add-lang-create').addEventListener('click', function () {
                attemptCreate(input.value.trim());
            });
            input.focus();

            L.attemptCreate = function attemptCreate(code) {
                if (code) {
                    if (createLanguage(code, 'fr')) {
                        modal.remove();
                    }
                } else {
                    showBasedOnModal();
                }
            }

            L.showBasedOnModal = function showBasedOnModal() {
                modal.remove();
                var bModal = document.createElement('div');
                bModal.id = 'lib-add-lang-modal';
                bModal.className = 'lib-add-lang-overlay';
                var existingLangs = getLangs();
                var buttonsHtml = '<div class="lib-add-lang-based-on">';
                buttonsHtml += '<div class="lib-add-lang-hint">' + escapeHtml(t('fillManuallyHint')) + '</div>';
                existingLangs.forEach(function (l) {
                    buttonsHtml += '<button type="button" data-src="' + escapeHtml(l) + '" class="lib-based-on-btn">' + escapeHtml(t('basedOn')) + ' [' + l + ']</button>';
                });
                buttonsHtml += '</div>';
                bModal.innerHTML =
                    '<div class="lib-add-lang-modal">' +
                        '<h3 class="lib-add-lang-title">' + escapeHtml(t('newLanguageLabel')) + '</h3>' +
                        '<input type="text" id="lib-add-lang-input2" class="lib-add-lang-input" placeholder="' + escapeHtml(t('inputLanguageCode') || 'ex: es') + '" />' +
                        buttonsHtml +
                        '<div class="lib-add-lang-other-row">' +
                            '<div class="lib-add-lang-other-inner">' +
                                '<label class="lib-add-lang-other-label">' + escapeHtml(t('otherLanguage')) + '</label>' +
                                '<input type="text" id="lib-other-lang-input" class="lib-add-lang-other-input" placeholder="ex: de" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="lib-add-lang-actions">' +
                            '<button type="button" id="lib-add-lang-cancel" class="renamer-btn-small lib-add-lang-cancel-btn">' + escapeHtml(t('cancel')) + '</button>' +
                            '<button type="button" id="lib-add-lang-create" class="renamer-btn-small renamer-btn-primary lib-add-lang-create-btn">' + escapeHtml(t('createLanguage')) + '</button>' +
                        '</div>' +
                    '</div>';
                document.body.appendChild(bModal);
                bModal.addEventListener('click', function (e) { if (e.target === bModal) bModal.remove(); });
                var input2 = bModal.querySelector('#lib-add-lang-input2');
                var otherInput = bModal.querySelector('#lib-other-lang-input');
                bModal.querySelectorAll('.lib-based-on-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var code = input2.value.trim();
                        if (!code) {
                            showLibToast(t('inputLanguageCode'), 'error');
                            input2.focus();
                            return;
                        }
                        var src = btn.getAttribute('data-src');
                        if (createLanguage(code, src)) {
                            bModal.remove();
                        }
                    });
                });
                bModal.querySelector('#lib-add-lang-cancel').addEventListener('click', function () { bModal.remove(); });
                bModal.querySelector('#lib-add-lang-create').addEventListener('click', function () {
                    var code = input2.value.trim();
                    if (!code) { showLibToast(t('inputLanguageCode'), 'error'); return; }
                    var src = otherInput.value.trim() || 'fr';
                    if (TR[src]) {
                        if (createLanguage(code, src)) bModal.remove();
                    } else {
                        if (createLanguage(code)) bModal.remove();
                    }
                });
                input2.focus();
            }
        }

         L.showLibToast = function showLibToast(message, type, actionLabel, actionCallback) {
            var container = document.getElementById('lib-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'lib-toast-container';
                container.className = 'lib-toast-container lib-toast-container-renamer';
                document.body.appendChild(container);
            }
            var toast = document.createElement('div');
            toast.className = 'lib-toast-renamer ' + (type === 'error' ? 'lib-toast-error' : 'lib-toast-success');
            toast.textContent = message;
            if (actionLabel && actionCallback) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = actionLabel;
                btn.className = 'lib-toast-action-btn ' + (type === 'error' ? 'lib-toast-action-error' : 'lib-toast-action-success');
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (actionCallback) actionCallback();
                    if (toast.parentNode) toast.remove();
                });
                toast.appendChild(btn);
            }
            container.appendChild(toast);
            setTimeout(function () {
                if (toast.parentNode) toast.remove();
            }, 5000);
        }

    var getBaseUrl = L.getBaseUrl;
    var escapeHtml = L.escapeHtml;
    var saveCustomTranslation = L.saveCustomTranslation;
    var loadCustomTranslations = L.loadCustomTranslations;
    var showReaderSettings = L.showReaderSettings;
    var showReaderGeneralSettings = L.showReaderGeneralSettings;
    var showReaderTranslationsPanel = L.showReaderTranslationsPanel;
    var renderLibTranslations = L.renderLibTranslations;
    var applyLibTranslationFilter = L.applyLibTranslationFilter;
    var refreshLangDropdown = L.refreshLangDropdown;
    var getLangs = L.getLangs;
    var createLanguage = L.createLanguage;
    var showAddLanguageModal = L.showAddLanguageModal;
    var attemptCreate = L.attemptCreate;
    var showBasedOnModal = L.showBasedOnModal;
    var showLibToast = L.showLibToast;
})(window.RenamerLibrary);