# Refactoring Plan: Splitting `js/library.js` into `js/audio-and-book-reader/`

## 1. Contexte actuel

`js/library.js` est un fichier monolithique de **6257 lignes**, encapsulé dans un IIFE `(function () { 'use strict'; … })();`.
Toutes les fonctions et la totalité de l'état sont privées dans cette closure.
L'API publique exposée est minimale :

```js
window.RenamerLibrary = { buildBreadcrumb, renderBreadcrumb };
```

### External dependencies (déjà fournis par d'autres scripts chargés avant `library.js`)

| Global | Fourni par | Méthodes utilisées |
|---|---|---|
| `window.RenamerReader` | `js/tabs/pdf/reader.js` → `window.RenamerReader` | `renderReader(ctx, path, box)`, `renderMultiImage(ctx, folder, files, box)` |
| `RenamerUtils` | `js/utils.js` | `showPromptDialog()`, `showConfirmDialog()`, `setModalLabels()` |
| `window.RenamerNavigation` | `js/navigation.js` | `init(ctx)`, `setCurrentPath()`, `loadFolderContent()`, `getCurrentPath()`, `renderBreadcrumb(el)`, `bindFolderRow()`, `loadFavorites()`, `invalidateFavoritesCache()`, `addFolderLoadedListener()`, `removeFolderLoadedListener()`, `navigateToFolder()`, `updateFavoriteStar()`, `showNavMorePopup()` |
| `window.RenamerIcons` | `js/icons.js` | `OPEN_BOOK_READ`, `READ_CHECK`, `EXPAND`, `COLLAPSE`, `FOLDER`, `GRID`, `LIST_VIEW`, `FILTER`, `SETTINGS_GEAR`, `CLOSE`, `SETTINGS_DOTS`, `CHECK`, `UNCHECK`, `DELETE`, `FILTER`, `EDIT`, `PLAY`, `PAUSE`, `DRAG`, `BACK`, `POPUP_ARROW` |
| `window.RenamerIPadOS` | (module externe) | `isCSSFullscreen(el)`, `exitCSSFullscreen(el)` |
| `OC` | Nextcloud core | `generateUrl()`, `requestToken`, `userid` |

### Chargement actuel

Dans `PageController::renderLibraryPage()` :
```php
OCP\Util::addScript('renamer', 'log');
OCP\Util::addScript('renamer', 'dev-refresh-components');
OCP\Util::addScript('renamer', 'utils');
OCP\Util::addScript('renamer', 'icons');
OCP\Util::addScript('renamer', 'navigation');
OCP\Util::addScript('renamer', 'library');
// + pdf.min, jszip.min, pdf.worker.min, epub.min, tabs/pdf/reader, tabs/pdf/generic-viewer
```

Les scripts sont **exécutés dans l'ordre** par Nextcloud via `addScript`.
`js/tabs/pdf/reader.js` expose `window.RenamerReader` *après* `library.js` dans l'ordre actuel — mais `library.js` ne l'utilise qu'au moment de l'interaction (clic sur un tome), donc l'asymilose est acceptable.

---

## 2. Problèmes de l'architecture actuelle

1. **Fichier de 6257 lignes** → difficile à naviguer, à reviewer, à maintenir.
2. **Toutes les fonctions sont interdépendantes via la closure** → impossible de travailler sur un sous-système sans charger le fichier entier en mémoire.
3. **Deux fonctions dupliquées** (bug latent) :
   - `addLibraryPath` défini deux fois (lignes ~1106 et ~1194) — la 2ᵉ écrase la 1ᵉʳ.
   - `changeLibraryType` défini deux fois (lignes ~1072 et ~1245) — idem.
   - `changeCollectionType` défini deux fois (lignes ~1089 et ~1276) — idem.
4. **Mélange de responsabilités** : parsing de noms de fichiers, appels API, rendu DOM, gestion de navigation, dialogues, toast, et paramètres de traduction sont tous dans le même fichier.
5. **Pas de réutilisation** : les fonctions ne sont pas exportables / testables isolément.
6. **Ordre d'exécution implicite** : les fonctions sont définies après leur utilisation dans le code (hoisting partiel pour les `function declaration`), mais certaines variables (`var` + assignation) créent des dépendances d'ordre subtiles.

---

## 3. Stratégie de modularisation

### 3.1 Choix du modèle de module

Le codebase Nextcloud existant utilise **l'IIFE + namespace global** (`window.Renamer*`, `const RenamerUtils`, etc.).
Nextcloud charge les scripts via `OCP\Util::addScript` en tant que scripts classiques (pas des modules ES).

**Décision :** conserver le modèle IIFE + namespace global pour la compatibilité maximale, mais introduire une **architecture de namespace partagé** où :

- `main.js` est l'**entry point**. Il :
  1. Crée l'objet namespace `window.RenamerLibrary`.
  2. Initialise `state`, les constantes fondamentales et les utilitaires core.
  3. **Charge dynamiquement** les sous-modules via injection `<script>` (comme le fait `js/reader.js` pour `app-reader.js`).
  4. Appelle `init()` une fois tous les modules chargés.

- Chaque sous-module est un IIFE `(function (L) { … })(window.RenamerLibrary);` qui **étend** le namespace avec ses fonctions.
  - `L` = le namespace partagé.
  - Les sous-modules accèdent à `L.state`, `L.t()`, `L.apiRequest()`, etc.
  - Les fonctions sont attachées via `L.nomFonction = function() { … }`.

### 3.2 Stratégie d'injection de dépendances

Toutes les fonctions actuelles accèdent à `state`, `t()`, `apiRequest()`, `showToast()`, `escapeHtml()`,
`getBaseUrl()`, `dbg()`, `getWebdavUrl()`, `getDavHeaders()` via la closure.

Après extraction, chaque module recevra **`L` (le namespace)** et accédera à ces utilitaires via :
```js
var state = L.state;
var t = L.t;
var apiRequest = L.apiRequest;
var showToast = L.showToast;
var escapeHtml = L.escapeHtml;
var getBaseUrl = L.getBaseUrl;
var dbg = L.dbg;
```

Cela nécessite que `main.js` initialise ces utilitaires **avant** de charger les sous-modules.

### 3.3 Chargement dynamique vs. `addScript` statique

Le `main.js` chargera dynamiquement les sous-modules. Deux scénarios :

| Scénario | Avantages | Inconvénients |
|---|---|---|
| **Dynamique (script injection)** | `main.js` est le seul fichier listé dans PHP (`addScript('renamer', 'audio-and-book-reader/main')`). Plus besoin de toucher au PHP pour chaque nouveau module. | Plus difficile à debugger (chargement asynchrone). Nécessite un `onload` pour garantir l'ordre. |
| **Statique (`addScript` pour chaque module en PHP)** | Chargement synchronisé, ordre garanti, debuggage simple. | Chaque nouveau module = changement PHP. Moins "autonome". |

**Recommandation :** Utiliser le **chargement dynamique depuis `main.js`** pour respecter la demande de l'utilisateur ("le fichier main qui serait l'archi et s'occupe de charger les autres"), avec un fallback `addScript` statique possible si le debuggage devient problématique.

Le chargement dynamique garantit l'ordre grâce à une file d'attente séquentielle :

```js
function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = base + src;
    s.onload = cb;
    s.onerror = cb; // ne pas bloquer
    document.head.appendChild(s);
}
```

---

## 4. Structure proposée

```
js/audio-and-book-reader/
├── main.js                 # Entry point : namespace, state, init, chargeur dynamique
├── core.js                 # Constantes + utilitaires fondamentaux (t, escapeHtml, apiRequest, formatSize, fileExt, etc.)
├── classification.js       # Parsing de noms, classification de scans, règles (stripRulesForBackend, enrichFileEntries)
├── covers.js               # Gestion des couvertures (loadCoversBulk, coverUrl, renderTomeIcon, etc.)
├── progress.js             # Progression / favoris (markTomeRead, markCollectionRead, collectPaths, bookmarkLabel, etc.)
├── library-ops.js          # CRUD des bibliothèques (addLibrary, createLibrary, renameLibrary, deleteLibrary, etc.)
├── collection-ops.js       # CRUD des collections (renameCollection, deleteCollection, changeCollectionType, navigateToCollection, rescanCollection, etc.)
├── tome-ops.js             # CRUD des tomes / sous-collections (renameTome, deleteTome, renameSubCollection, deleteSubCollection)
├── reader.js               # Rendu du lecteur (renderReading, renderReadingImages, closeReaderModal, renderDeepLink, findTomeByPath, etc.)
├── ui-components.js        # Dialogues, pickers, context menu, toast, type picker, dossier picker, image picker, filtres colonnes
├── rendering.js            # Toutes les fonctions render* (render, renderShell, renderSidebar, renderBreadcrumb, renderCollections, renderTomes, renderFlatFiles, renderLibrariesContent, renderLibraryCards, renderSubCollectionCard, renderTomeCard, renderFlatCollection, renderProgressCards, renderProgressCard, renderFavoriteCard, renderFavoritesView, renderDataTable, buildFileTableRows, fileTableColumns, getVisibleColumns, showTableColumnFilter, flattenFilesAndSubCollections, normalizeLibPath, buildLibBreadcrumb)
├── progress-carousel.js    # Gestion de la carousel de progression (drag, nav, attachProgressCarouselNav)
├── navigation.js           # Event binding, bind(), resolveReader, updateUrl, handleUrlParams, renderBreadcrumb (binding)
└── i18n.js                 # Dictionnaires TR + refreshTranslations + loadCustomTranslations + saveCustomTranslation + renderLibTranslations + applyLibTranslationFilter + refreshLangDropdown + createLanguage + showAddLanguageModal + showReaderSettings + showReaderGeneralSettings + showReaderTranslationsPanel
```

### 4.1 Détail de chaque module

#### 4.1.1 `main.js` — Point d'entrée / Architecture

Responsabilités :
- Créer `window.RenamerLibrary` (namespace).
- Définir l'objet `state` (copié tel quel).
- Définir les constantes fondamentales : `PAGE_ROOT`, `DOC_EXT`, `IMG_EXT`, `LIB_ACCENT`, `SEQUEL_THRESHOLD`, `VOL_MARKER_RE`, `CH_MARKER_RE`.
- Définir les utilitaires core partagés : `getBaseUrl()`, `dbg()`, `escapeHtml()`, `fileExt()`, `makeFileEntry()`, `formatSize()`, `getWebdavUrl()`, `getDavHeaders()`, `apiRequest()`, `showToast()`, `t()` (pointe vers `i18n.js`).
- Définir `updateUrl()` (dépend de `state` uniquement).
- Définir `buildCtx()` et `buildNavCtx()` (expose l'API au lecteur externe `RenamerReader`).
- Définir `init()` : détecte `isAdmin`, configure `RenamerUtils.setModalLabels`, appelle `renderShell()`, `renderBreadcrumb()`, `bind()`.
- **Charger dynamiquement** tous les sous-modules dans l'ordre de dépendance (voir §4.3).
- Exporter `window.RenamerLibrary.buildBreadcrumb` et `window.RenamerLibrary.renderBreadcrumb` (compatibilité).
- Écouter `DOMContentLoaded` → `init()`.

> Note : `init()` appelle `renderShell()`, `bind()`, `loadCustomTranslations()`, `handleUrlParams()`.
> Toutes ces fonctions seront définies dans des sous-modules, donc `init()` ne peut s'exécuter qu'après le chargement complet.

#### 4.1.2 `core.js` — Utilitaires fondamentaux

Fonctions/core (actuellement lignes ~8-14, ~37-61, ~119-141, ~143-175, ~726-858, ~1345-1366, ~3853-3858) :

| Fonction | Ligne source | Description |
|---|---|---|
| `fileExt(f)` | 12-14 | Extrait l'extension d'un fichier |
| `makeFileEntry(f)` | 16-31 | Normalise un fichier en entrée de collection |
| `minNumberFromRange(s)` | 37-45 | Extrait le premier nombre d'une range |
| `parseNumberRange(s)` | 47-61 | Parse une range de nombres → tableau |
| `parseFilename(name)` | 63-104 | Parse le nom de fichier (série, volume, chapitre, titre) |
| `parseScanEntry(f)` | 106-117 | Applique `parseFilename` à un `makeFileEntry` |
| `jaccardTokens(a, b)` | 119-131 | Similarité de Jaccard entre deux chaînes |
| `sequelBaseOf(name)` | 133-141 | Détecte une suite (ex: "Manga 2" → base "manga" + suffixe 2) |
| `buildReaderSeriesTree(entries)` | 143-169 | Construit un arbre {série → volume → chapitre → fichiers} |
| `sortFiles(files)` | 171-175 | Trie naturel par nom |
| `escapeHtml(s)` | 726-728 | Échappe le HTML |
| `getBaseUrl()` | 730-735 | Retourne l'URL de base de l'app |
| `dbg(context, info)` | 737-744 | Debug console |
| `apiRequest(url, options)` | 830-858 | Wrapper fetch avec token + debug |
| `formatSize(b)` | 3853-3858 | Formate la taille en B/KB/MB |
| `getWebdavUrl(filePath)` | 1345-1358 | Construit l'URL WebDAV d'un fichier |
| `getDavHeaders()` | 1360-1366 | Headers WebDAV (requesttoken) |
| `showToast(message, type)` | 860-875 | Toast global en bas de page |
| `sortFiles(files)` | 171-175 | Tri naturel |

Constantes : `DOC_EXT`, `IMG_EXT`, `LIB_ACCENT`, `SEQUEL_THRESHOLD`, `VOL_MARKER_RE`, `CH_MARKER_RE`.

#### 4.1.3 `classification.js` — Classification & règles

Fonctions (actuellement lignes ~1620-1805, ~2482-2529, ~2505-2529) :

| Fonction | Ligne source | Description |
|---|---|---|
| `classifyScan(files, rootFolder)` | 1620-1792 | Classifie les fichiers scannés en arbre de collections |
| `classifyScanFlat(files, rootFolder)` | 2531-2549 | Variante "livres décorrélés" (tout à plat) |
| `collectAllFiles(node)` | 1794-1805 | Récupère tous les fichiers d'un arbre récursivement |
| `hasOnlyImageFiles(files)` | 1807-1814 | Vérifie si tous les fichiers sont des images |
| `enrichBackendNode(node)` | 1816-1830 | Enrichit un nœud backend (isImages, etc.) |
| `getCollectionRoot(collection)` | 1832-1846 | Récupère la racine normalisée des règles d'une collection |
| `getCurrentNode(collection)` | 1848-1860 | Navigue dans l'arbre selon `state.readerTreePath` |
| `enrichFileEntries(rules)` | 2505-2529 | Parse les métadonnées (série, tome, chapitre) dans les entrées |
| `stripRulesForBackend(rules)` | 2482-2503 | Nettoie les règles pour l'envoi backend |

> `buildReaderSequels()` (interne à `classifyScan`, lignes 1762-1791) reste dans `classification.js`.

#### 4.1.4 `covers.js` — Gestion des couvertures

Fonctions (actuellement lignes ~746-828) :

| Fonction | Ligne source | Description |
|---|---|---|
| `coverUrl(path)` | 746-749 | Retourne l'URL de couverture depuis le cache |
| `coverOfFirstTome(tomePaths)` | 751-758 | Trouve la première couverture disponible |
| `loadCoversBulk(tomePaths, cb)` | 760-801 | Charge les couvertures en lot via `/api/covers/list` |
| `renderNoCoverPlaceholder(f)` | 803-816 | Affiche le placeholder PDF ou texte |
| `renderTomeIcon(f)` | 818-828 | Rend l'icône/couverture d'un tome |

#### 4.1.5 `progress.js` — Progression & favoris

Fonctions (actuellement lignes ~1502-1618) :

| Fonction | Ligne source | Description |
|---|---|---|
| `markTomeRead(tome, collection)` | 1502-1520 | Marquer un tome comme lu |
| `markTomeUnread(tome, collection)` | 1522-1540 | Marquer un tome comme non lu |
| `collectPaths(nodeOrCollection)` | 1542-1548 | Collecte tous les chemins de fichiers d'un nœud |
| `markPathsRead(paths, reRenderFn)` | 1550-1569 | Marquer plusieurs chemins comme lus |
| `markPathsUnread(paths, reRenderFn)` | 1571-1590 | Marquer plusieurs chemins comme non lus |
| `markCollectionRead(collection, lib)` | 1592-1597 | Marquer une collection comme lue |
| `markCollectionUnread(collection, lib)` | 1599-1604 | Marquer une collection comme non lue |
| `markNodeRead(node, collection)` | 1606-1611 | Marquer un nœud (sous-collec) comme lu |
| `markNodeUnread(node, collection)` | 1613-1618 | Marquer un nœud comme non lu |
| `bookmarkLabel(path)` | 3915-3923 | Label texte d'un bookmark |
| `isTomeInProgress(path)` | 3860-3863 | Vérifie si un tome est en cours |
| `isTomeRead(path)` | 3865-3868 | Vérifie si un tome est lu |
| `collectionReadStatus(nodeOrCollection)` | 3870-3879 | Status de lecture d'une collection |
| `collectionStatusIcon(nodeOrCollection)` | 3881-3890 | Icône de status |
| `nodeStatusHtml(nodeOrCollection)` | 3892-3899 | HTML de status d'un nœud |
| `collectionCardStatusHtml(collection)` | 3901-3903 | HTML de status pour une card |
| `renderTomeStatusIcon(path)` | 3905-3913 | Icône de status d'un tome |
| `countTomes(files)` | 3803-3817 | Compte les tomes (exclut les images) |
| `findMissingTomes(files)` | 3819-3838 | Trouve les tomes manquants |
| `renderMissingTomeCard(tomeNum)` | 3840-3851 | Card de tome manquant |
| `tomeLabelFor(f)` | 3724-3733 | Label "Tome X" ou "Tome X-Y" |
| `fileIcon(type)` | 3716-3722 | Icône emoji pour un type de fichier |

#### 4.1.6 `library-ops.js` — Opérations sur les bibliothèques

Fonctions (actuellement lignes ~1023-1053, ~1051-1070, ~1072-1087, ~1089-1104, ~1106-1123, ~1178-1192) :

| Fonction | Ligne source | Description |
|---|---|---|
| `promptRename(label, current, cb)` | 1023-1029 | Dialog de renommage (utilise `RenamerUtils.showPromptDialog`) |
| `renameLibrary(lib)` | 1031-1049 | Renomme une bibliothèque (PUT /api/reader/libraries/{id}) |
| `deleteLibrary(lib)` | 1051-1070 | Supprime une bibliothèque (DELETE) |
| `changeLibraryType(lib, newType)` | 1245-1274 (version définitive) | Change le type d'une bibliothèque avec confirmation |
| `addLibraryPath(lib)` | 1194-1224 (version définitive) | Ajoute un dossier à une bibliothèque via le folder picker |
| `removeLibraryPath(lib, pathToRemove)` | 1305-1327 | Retire un dossier d'une bibliothèque |
| `rescanLibrary(lib)` | 1178-1192 | Rescanne une bibliothèque (POST /rescan) |
| `createLibrary(rootFolder, name, libraryType)` | 2661-2739 | Crée une nouvelle bibliothèque + collections |
| `addLibrary()` | 2741-2761 | Point d'entrée : folder picker → prompt nom → type picker → createLibrary |

> ⚠️ Il y a **deux définitions** de `addLibraryPath` et `changeLibraryType` dans le fichier original.
> La version à conserver est celle qui est **dernièrement définie** (lignes 1194 et 1245), car elle écrase la précédente.
> La version "définitive" sera dans `library-ops.js`. La version obsolète sera éliminée.

#### 4.1.7 `collection-ops.js` — Opérations sur les collections

Fonctions (actuellement lignes ~1089-1104, ~1091-1141, ~1143-1161, ~1163-1176, ~1276-1298, ~1329-1343) :

| Fonction | Ligne source | Description |
|---|---|---|
| `navigateToCollection(col, lib)` | 1163-1176 | Navigue vers une collection (view = 'tomes') |
| `renameCollection(col, lib)` | 1125-1141 | Renomme une collection |
| `deleteCollection(col, lib)` | 1143-1161 | Supprime une collection |
| `changeCollectionType(col, lib, newType)` | 1276-1298 (version définitive) | Change le type d'une collection |
| `getCollectionType(col)` | 1300-1303 | Retourne le type d'une collection |
| `rescanCollection(col, lib)` | 1329-1343 | Rescanne une collection |
| `showLibraryTypeSubMenu(items, currentType, onChange)` | 1226-1243 | Sous-menu pour le type |

> ⚠️ `showLibraryTypeSubMenu` est très lié à `changeLibraryType` / `changeCollectionType` via un paramètre `onChange`.
> Il pourrait aller dans `ui-components.js` mais restera dans `collection-ops.js` car il est spécifique aux types.

#### 4.1.8 `tome-ops.js` — Opérations sur les tomes & sous-collections

Fonctions (actuellement lignes ~1368-1462) :

| Fonction | Ligne source | Description |
|---|---|---|
| `renameTome(tome, collection)` | 1368-1401 | Renomme un tome via WebDAV MOVE |
| `deleteTome(tome, collection)` | 1403-1428 | Supprime un tome via WebDAV DELETE |
| `renameSubCollection(node, idx, collection)` | 1430-1462 | Renomme une sous-collection (modifie `rules`) |
| `deleteSubCollection(node, idx, collection)` | 1464-1500 | Supprime une sous-collection (modifie `rules`) |

#### 4.1.9 `reader.js` — Rendu du lecteur & deep-link

Fonctions (actuellement lignes ~2763-3118, ~4611-4903) :

| Fonction | Ligne source | Description |
|---|---|---|
| `renderReading(tome)` | 2763-2838 | Ouvre le lecteur pour un tome (PDF, CBZ, EPUB, etc.) |
| `renderReadingImages(node, collection)` | 2840-2930 | Ouvre le lecteur pour un tome d'images |
| `killReaderInactivityTimer(overlay)` | 2932-2938 | Tue le timer d'inactivité du lecteur |
| `closeReaderModal()` | 2940-3010 | Ferme le modal de lecture + navigation de retour |
| `closeModalOverlay()` | 3012-3023 | Ferme le modal sans gestion d'état |
| `loadDisplayNameOverrides(library, cb)` | 3025-3054 | Charge les noms affichés personnalisés |
| `saveDisplayNameOverride(f, library, collection)` | 3056-3068 | Sauvegarde un nom affiché personnalisé |
| `findTomeByPath(readPath)` | 4797-4809 | Trouve un tome par son chemin |
| `findImageTomeNodeByFolder(folderPath)` | 4811-4844 | Trouve un nœud d'image par dossier |
| `findImageTomeInCollection(collection, folderPath)` | 4846-4867 | Variante dans une collection |
| `renderDeepLink(readPath, colId)` | 4699-4733 | Rendu d'un deep-link |
| `loadBookmarksForCollection(lib, col, cb)` | 4869-4874 | Charge les bookmarks d'une collection |
| `loadBookmarksForTome(lib, col, cb)` | 4876-4881 | Charge les bookmarks d'un tome |
| `loadBookmarksForPaths(paths, cb)` | 4883-4902 | Chargement générique de bookmarks |

> `showDisplayNameEditDialog` (lignes 3070-3107) → va dans `ui-components.js`.

#### 4.1.10 `ui-components.js` — Composants UI & dialogues

Fonctions (actuellement réparties, lignes ~876-954, ~956-1029, ~2009-2659, ~3070-3107, ~3109-3207) :

| Fonction | Ligne source | Description |
|---|---|---|
| `hideContextMenu()` | 896-901 | Cache le menu contextuel |
| `attachLongPress(el)` | 903-954 | Détecte le long-press → contextmenu |
| `showContextMenu(e, items, target)` | 956-1021 | Affiche un menu contextuel personnalisé |
| `showFolderPicker(callback)` | 2009-2223 | Dialog de sélection de dossier (via RenamerNavigation) |
| `showImagePicker(callback)` | 2246-2480 | Dialog de sélection d'image pour couverture |
| `showLibraryTypePicker(name, folder, cb)` | 2551-2659 | Dialog de choix du type de bibliothèque |
| `showTableColumnFilter(e, onApply)` | 3118-3193 | Pop-up de filtre de colonnes du tableau |
| `showDisplayNameEditDialog(f, currentName, onSave)` | 3070-3107 | Dialog d'édition du nom affiché |
| `createViewToggleBtn(labelKey, iconSvg, onClick)` | 677-687 | Bouton de basculement de vue |
| `refreshTranslations()` | 689-724 | Rafraîchit les attributs `data-translation` |

> Les fonctions `showFolderPicker` et `showImagePicker` partagent une logique très similaire.
> Une refactorisation pour extraire une fonction commune `showNavigationDialog(...)` pourrait être envisagée, mais ce n'est **pas** demandé — on conserve le code tel quel.

#### 4.1.11 `rendering.js` — Rendu UI (toutes les fonctions `render*`)

Fonctions (actuellement lignes ~3286-5345) :

| Fonction | Ligne source | Description |
|---|---|---|
| `fileTableColumns()` | 3195-3207 | Définit les colonnes du tableau |
| `renderDataTable(container, columns, rows, opts)` | 3209-3284 | Rend un tableau générique |
| `buildFileTableRows(files, library, collection)` | 3286-3384 | Construit les lignes du tableau |
| `renderFlatCollection(collection, node)` | 3386-3517 | Rendu en mode "applati" d'une collection |
| `flattenFilesAndSubCollections(node, depth)` | 3519-3544 | Aplatit les fichiers et sous-collections |
| `renderTomes(collection)` | 3547-3660 | Rendu de la vue tomes (hiérarchique) |
| `renderSubCollectionCard(node, idx, collection, treePath)` | 3662-3714 | Card d'une sous-collection |
| `renderTomeCard(f, collection)` | 3735-3801 | Card d'un tome |
| `renderFlatFiles(library)` | 3925-4034 | Rendu en mode "fichiers a plats" |
| `renderCollections(library)` | 4036-4173 | Rendu de la liste des collections |
| `renderLibrariesContent()` | 4175-4258 | Rendu de la page d'accueil / bibliothèques |
| `renderProgressCards(list, progPaths)` | 4260-4315 | Rendu des cards de progression |
| `renderProgressCard(p, collection, lib)` | 4415-4474 | Card de progression individuelle |
| `renderLibraryCards(gridEl)` | 4476-4528 | Cards des bibliothèques |
| `render()` | 4530-4557 | Dispatcher de rendu principal |
| `renderSidebar()` | 5421-5457 | Rendu de la sidebar |
| `renderBreadcrumb()` | 5544-5654 | Rendu du breadcrumb + binding |
| `buildLibBreadcrumb()` | 5459-5542 | Construit le HTML du breadcrumb |
| `normalizeLibPath(p)` | 5459-5462 | Normalise un chemin de bibliothèque |
| `renderFavoritesView()` | 4973-5042 | Rendu de la vue favoris |
| `renderFavoriteCard(ctx, pages)` | 5044-5089 | Card d'un favori |
| `renderShell()` | 5380-5419 | Structure HTML de base (sidebar, header, content) |

#### 4.1.12 `progress-carousel.js` — Carousel de progression

Fonctions (actuellement lignes ~4317-4413) :

| Élément | Ligne source | Description |
|---|---|---|
| `libProgressDrag` | 4317 | Objet d'état pour le drag |
| `handleLibProgressDragMove(e)` | 4319-4326 | Gestion du mouvement de drag |
| `handleLibProgressDragEnd()` | 4328-4332 | Fin du drag |
| listeners globaux `mousemove`/`mouseup` | 4334-4337 | Binding global |
| `attachProgressCarouselNav(header, track)` | 4339-4413 | Boutons prev/next + scroll + drag |

#### 4.1.13 `navigation.js` — Navigation, routing & binding

Fonctions (actuellement lignes ~4585-4795, ~5091-5345) :

| Fonction | Ligne source | Description |
|---|---|---|
| `buildCtx()` | 4559-4583 | Construit le contexte exposé à `RenamerReader` |
| `buildNavCtx()` | 1990-2007 | Construit le contexte pour `RenamerNavigation` |
| `updateUrl(params)` | 4585-4609 | Met à jour l'URL (history.replaceState) |
| `resolveReader(opts, cb)` | 4611-4697 | Résolution server unique (deep-link / vue) |
| `handleUrlParams()` | 4735-4795 | Parse les paramètres URL → navigation |
| `loadAllCollections(cb)` | 4904-4935 | Charge toutes les collections |
| `loadReaderFavoritesList(cb)` | 4937-4951 | Charge la liste des favoris |
| `findLibraryCollectionForPath(path)` | 4953-4971 | Trouve lib+col+fichier par chemin |
| `bind()` | 5091-5345 | Binding de tous les event listeners (sidebar, breadcrumb, contextmenu, touch) |

> `buildCtx()` et `buildNavCtx()` sont utilisés par `reader.js` et `ui-components.js`.
> Ils devraient être dans `main.js` car ils exposent l'API externe.
> Mais ils dépendent de `countTomes`, `findMissingTomes` qui sont dans `progress.js`.
> → On les place dans `main.js` mais on les définit **après** le chargement de tous les modules (dans `init()`).

#### 4.1.14 `i18n.js` — Internationalisation

Fonctions (actuellement lignes ~243-666, ~672-675, ~5656-6249) :

| Élément | Ligne source | Description |
|---|---|---|
| `TR` | 243-666 | Dictionnaire français + anglais |
| `t(key)` | 672-675 | Fonction de traduction |
| `refreshTranslations()` | 689-724 | Rafraîchit `data-translation` dans le DOM |
| `saveCustomTranslation(...)` | 5656-5672 | Sauvegarde d'une traduction personnalisée |
| `loadCustomTranslations()` | 5674-5712 | Charge les traductions custom depuis l'API |
| `showReaderSettings()` | 5714-5754 | Ouvre le modal des paramètres |
| `showReaderGeneralSettings()` | 5756-5798 | Modal paramètres généraux |
| `showReaderTranslationsPanel()` | 5800-5878 | Panel des traductions |
| `renderLibTranslations()` | 5881-6026 | Rendu de la liste des traductions |
| `applyLibTranslationFilter()` | 6028-6052 | Filtre texte dans le panel |
| `refreshLangDropdown(...)` | 6054-6084 | Dropdown de sélection de langue |
| `getLangs()` | 6086-6088 | Liste des langues disponibles |
| `createLanguage(code, sourceLang)` | 6090-6119 | Crée une nouvelle langue |
| `showAddLanguageModal()` | 6121-6220 | Modal d'ajout d'une langue |
| `showLibToast(...)` | 6222-6249 | Toast avec bouton d'action |

---

## 5. Graphique de dépendances & ordre de chargement

L'ordre de chargement dynamique par `main.js` (topologie triée) :

```
1. core.js           ← aucune dépendance (définit state, t, apiRequest, escapeHtml, etc.)
2. i18n.js           ← dépend de core.js (TR, t(), mais t() est core; TR est ici)
3. classification.js ← dépend de core.js (fileExt, makeFileEntry, parseFilename, sortFiles, jaccardTokens, sequelBaseOf, buildReaderSeriesTree)
4. covers.js         ← dépend de core.js (apiRequest, getBaseUrl, dbg, showToast)
5. progress.js       ← dépend de core.js, covers.js (apiRequest, showToast, coverUrl)
6. library-ops.js    ← dépend de core.js, i18n.js, covers.js, progress.js (apiRequest, showToast, t, showFolderPicker, showLibraryTypePicker, render)
7. collection-ops.js ← dépend de core.js, i18n.js, covers.js, progress.js, library-ops.js (promptRename, showLibraryTypeSubMenu)
8. tome-ops.js       ← dépend de core.js, i18n.js (getWebdavUrl, getDavHeaders, showToast, showContextMenu, render)
9. ui-components.js  ← dépend de core.js, i18n.js, navigation.js (buildNavCtx, showToast, escapeHtml)
10. reader.js        ← dépend de core.js, i18n.js, covers.js, navigation.js (buildCtx, renderReading*)
11. rendering.js     ← dépend de core.js, i18n.js, covers.js, progress.js, ui-components.js, library-ops.js, collection-ops.js, tome-ops.js (tout le rendu)
12. progress-carousel.js ← dépend de core.js, i18n.js (t(), window.RenamerIcons)
13. navigation.js    ← dépend de core.js, i18n.js, rendering.js (render, buildCtx, buildNavCtx), library-ops.js (addLibrary, renameLibrary, etc.)
```

### 5.1 Résolution du problème de circularité

Plusieurs modules se réfèrent mutuellement :
- `rendering.js` appelle `addLibrary` (library-ops), `renameLibrary` (library-ops), `markTomeRead` (progress), `showContextMenu` (ui-components), `renderReading` (reader), `buildCtx` (main/navigation).
- `navigation.js` (`bind()`) appelle `render()`, `addLibrary()`, `renderCollections()`, etc.
- `reader.js` appelle `buildCtx()` (qui est dans `main.js` / `navigation.js`).

**Solution :** Toutes les fonctions sont définies comme des propriétés du namespace `L` **au moment du chargement**, mais **appelées seulement à l'exécution** (clics, renders). Donc :
- L'ordre de chargement détermine qui *définit* la fonction, pas qui l'appelle.
- À l'exécution (`init()` → `handleUrlParams()` → `render()`), **toutes** les fonctions sont disponibles sur `L`.
- `main.js` appelle `L.init()` **après** que tous les sous-modules aient été chargés et aient attaché leurs fonctions à `L`.

Cela élimine la circularité : le chargement est séquentiel (pas de cycle), et les appels inter-fonctions se font via `L.nomFonction()` à l'exécution.

### 5.2 Simplification : `main.js` définit `init()`, `renderShell()`, `renderSidebar()`, `bind()`, `renderBreadcrumb()`

Pour réduire le couplage, on peut placer certaines fonctions "orchestration" directement dans `main.js` car elles sont le point central :
- `init()` — orchestrateur
- `renderShell()` — structure HTML de base (peut dépendre de `state`, `t()`, `escapeHtml`, `FAV_STAR_SVG`, etc.)
- `bind()` — binding des événements globaux
- `updateUrl()` — manipulation URL (ne dépend que de `state`)

Ces fonctions restent dans `main.js` et les modules "spécialisés" (`library-ops`, `rendering`, `reader`) les appellent via `L.init()`, `L.render()`, etc.

---

## 6. Stratégie de migration progressif

### Phase 1 : Création de l'infrastructure

1. Créer le dossier `js/audio-and-book-reader/`.
2. Créer `main.js` avec :
   - Le namespace `window.RenamerLibrary`.
   - L'objet `state` (identique au source).
   - Les utilitaires core inline (ou `core.js` chargé en premier).
   - Le chargeur dynamique de scripts.
   - L'export `window.RenamerLibrary = { buildBreadcrumb, renderBreadcrumb, init }`.
3. Créer `core.js` en extrayant les utilitaires du début du fichier.
4. Mettre à jour `PageController::renderLibraryPage()` pour charger `audio-and-book-reader/main` au lieu de `library` (garder `library.js` comme fallback pendant la migration).

### Phase 2 : Extraction module par module (haut → bas)

Extract each function in dependency order. Validate with the browser console + manual testing.

| Phase | Module | Lignes source | Fonctions clés |
|---|---|---|---|
| 2a | `i18n.js` | 243-666, 5656-6249 | TR, t(), translations settings |
| 2b | `classification.js` | 1620-1805, 2482-2529 | classifyScan, enrichFileEntries, stripRulesForBackend |
| 2c | `covers.js` | 746-828 | loadCoversBulk, coverUrl, renderTomeIcon |
| 2d | `progress.js` | 1502-1618, 3803-3923 | markTomeRead, bookmarkLabel, countTomes |
| 2e | `library-ops.js` | 1023-1049, 1051-1070, 1178-1192, 1194-1224, 1245-1274 | renameLibrary, deleteLibrary, createLibrary, addLibraryPath |
| 2f | `collection-ops.js` | 1089-1104, 1125-1161, 1163-1176, 1276-1298, 1329-1343 | renameCollection, deleteCollection, changeCollectionType |
| 2g | `tome-ops.js` | 1368-1500 | renameTome, deleteTome, renameSubCollection, deleteSubCollection |
| 2h | `ui-components.js` | 876-1029, 2009-2480, 2551-2659, 3070-3107, 3109-3207 | showFolderPicker, showImagePicker, showContextMenu, attachLongPress |
| 2i | `reader.js` | 2763-3010, 4611-4903 | renderReading, closeReaderModal, renderDeepLink, resolveReader |
| 2j | `rendering.js` | 3195-5345 | render, renderShell, renderSidebar, renderTomes, renderCollections |
| 2k | `progress-carousel.js` | 4317-4413 | attachProgressCarouselNav |
| 2l | `navigation.js` | 4585-4795, 5091-5345 | updateUrl, handleUrlParams, bind |

### Phase 3 : Remplacement complet

1. Vérifier que `main.js` + tous les sous-modules reproduisent exactement le comportement de `library.js`.
2. Mettre à jour `PageController::renderLibraryPage()` pour ne charger que `audio-and-book-reader/main`.
3. Supprimer `js/library.js` (ou le garder comme référence / backup).
4. Garder `js/tabs/pdf/reader.js` (expose `window.RenamerReader`) — chargé **après** `main.js` mais utilisé au moment de l'interaction.

---

## 7. Patterns de partage d'état et de contexte

### 7.1 Namespace partagé

```js
// main.js
(function () {
    'use strict';

    var L = window.RenamerLibrary = {
        state: { /* ... copié depuis library.js state ... */ },
        // core utilities defined here or in core.js
        t: null,              // defined in i18n.js
        apiRequest: null,     // defined in core.js
        escapeHtml: null,     // defined in core.js
        showToast: null,      // defined in core.js
        // ...
        // fonction slots to be filled by sub-modules
    };

    // Chargement des modules
    var base = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/apps/renamer') : '/apps/renamer';
    var modules = [
        'js/audio-and-book-reader/core.js',
        'js/audio-and-book-reader/i18n.js',
        'js/audio-and-book-reader/classification.js',
        'js/audio-and-book-reader/covers.js',
        'js/audio-and-book-reader/progress.js',
        'js/audio-and-book-reader/library-ops.js',
        'js/audio-and-book-reader/collection-ops.js',
        'js/audio-and-book-reader/tome-ops.js',
        'js/audio-and-book-reader/ui-components.js',
        'js/audio-and-book-reader/reader.js',
        'js/audio-and-book-reader/progress-carousel.js',
        'js/audio-and-book-reader/rendering.js',
        'js/audio-and-book-reader/navigation.js',
    ];

    function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = base + '/' + src;
        s.onload = cb;
        s.onerror = cb;
        document.head.appendChild(s);
    }

    var i = 0;
    function loadNext() {
        if (i >= modules.length) {
            // Tous les modules sont chargés → initialiser
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', L.init);
            } else {
                L.init();
            }
            return;
        }
        loadScript(modules[i++], loadNext);
    }
    loadNext();
})();
```

### 7.2 Pattern de module sous-fichier

```js
// ex: js/audio-and-book-reader/covers.js
(function (L) {
    'use strict';

    // Accès aux utilitaires partagés
    var state = L.state;
    var apiRequest = L.apiRequest;
    var getBaseUrl = L.getBaseUrl;
    var dbg = L.dbg;
    var showToast = L.showToast;
    var escapeHtml = L.escapeHtml;
    var t = L.t;

    L.coverUrl = function(path) {
        var rel = state.covers && state.covers[path];
        return rel ? (getBaseUrl() + rel) : null;
    };

    L.coverOfFirstTome = function(tomePaths) { /* ... */ };

    L.loadCoversBulk = function(tomePaths, cb) { /* ... */ };

    // etc.
})(window.RenamerLibrary);
```

### 7.3 Contexte exposé aux modules externes

`buildCtx()` (ligne 4559) est la fonction qui construit l'objet passé à `window.RenamerReader.renderReader` / `renderMultiImage`.
Elle dépend de : `state`, `t`, `escapeHtml`, `getBaseUrl`, `apiRequest`, `showToast`, `updateUrl`, `countTomes`, `findMissingTomes`.

→ `buildCtx()` est définie dans `main.js` **après** le chargement de tous les modules, ou dans `navigation.js` (dernier module chargé).

### 7.4 `buildNavCtx()`

Définie dans `main.js` — expose `state`, `t`, `escapeHtml`, `getBaseUrl`, `apiRequest`, `showToast` à `RenamerNavigation`.

---

## 8. Mapping PHP

### 8.1 Controller actuel (`PageController::renderLibraryPage()`)

```php
// AVANT
OCP\Util::addScript('renamer', 'library');

// APRÈS (migration complète)
OCP\Util::addScript('renamer', 'audio-and-book-reader/main');
```

### 8.2 Scripts dépendants (à conserver)

Tous les scripts suivants restent nécessaires (chargés par Nextcloud via `addScript`) :
```php
OCP\Util::addScript('renamer', 'log');
OCP\Util::addScript('renamer', 'dev-refresh-components');
OCP\Util::addScript('renamer', 'utils');
OCP\Util::addScript('renamer', 'icons');
OCP\Util::addScript('renamer', 'navigation');
OCP\Util::addScript('renamer', 'audio-and-book-reader/main');  // ← remplace 'library'
OCP\Util::addScript('renamer', 'pdf.min');
OCP\Util::addScript('renamer', 'jszip.min');
OCP\Util::addScript('renamer', 'pdf.worker.min');
OCP\Util::addScript('renamer', 'epub.min');
OCP\Util::addScript('renamer', 'tabs/pdf/reader');    // expose window.RenamerReader
OCP\Util::addScript('renamer', 'tabs/pdf/generic-viewer');
```

> `tabs/pdf/reader.js` expose `window.RenamerReader` **après** `main.js` dans l'ordre d'exécution.
> Mais `library.js` original a le même problème (il est chargé avant `tabs/pdf/reader.js`).
> Les fonctions `renderReading()` / `renderReadingImages()` vérifient `typeof window.RenamerReader !== 'undefined'`
> au moment de l'appel (clic utilisateur), donc le lecteur est garanti chargé à ce moment-là.

---

## 9. Différences / breaking changes à signaler

1. **`addLibraryPath()` et `changeLibraryType()`** : deux définitions dupliquées dans le source.
   La version finale (lignes ~1194 et ~1245) sera conservée. La version obsolète (lignes ~1106 et ~1072) sera supprimée.
   → **Cela peut changer le comportement** si l'une des versions obsolètes était censée prendre le dessus dans certains cas d'usage.
   **Vérifier** que `addLibraryPath` et `changeLibraryType` ne sont pas appelées avec des signatures différentes entre les deux versions.

2. **`window.RenamerLibrary`** : l'API publique actuelle expose { buildBreadcrumb, renderBreadcrumb }.
   Cela doit être conservé pour ne pas casser `dev-refresh-components.js` (qui l'appelle).

3. **CSS** : `library/main.css` est chargé via `addStyle('renamer', 'library/main')` — ne change pas.

4. **`state` nouvel attribut** : `state.collections` (non listé dans l'objet initial mais utilisé via `loadCollections`).
   → doit être initialisé dans `main.js` (même s'il l'était implicitement dans l'original via `state` global).

---

## 10. Résumé de la migration

| Étape | Action | Fichier concerné |
|---|---|---|
| 1 | Créer dossier `js/audio-and-book-reader/` | — |
| 2 | Créer `main.js` (namespace, state, chargeur dynamique, init) | `main.js` |
| 3 | Extraire `core.js` (utilitaires) | `core.js` |
| 4 | Extraire `i18n.js` (TR, t, traductions settings) | `i18n.js` |
| 5 | Extraire `classification.js` | `classification.js` |
| 6 | Extraire `covers.js` | `covers.js` |
| 7 | Extraire `progress.js` | `progress.js` |
| 8 | Extraire `library-ops.js` | `library-ops.js` |
| 9 | Extraire `collection-ops.js` | `collection-ops.js` |
| 10 | Extraire `tome-ops.js` | `tome-ops.js` |
| 11 | Extraire `ui-components.js` | `ui-components.js` |
| 12 | Extraire `reader.js` | `reader.js` |
| 13 | Extraire `progress-carousel.js` | `progress-carousel.js` |
| 14 | Extraire `rendering.js` | `rendering.js` |
| 15 | Extraire `navigation.js` (bind, routing, updateUrl) | `navigation.js` |
| 16 | Mettre à jour `PageController.php` | `lib/Controller/PageController.php` |
| 17 | Tests & validation | — |

---

## 11. Notes sur les fonctions à revivre / à faire attention

- **`bind()`** (ligne 5091-5345) : très longue, contient des listeners pour sidebar, breadcrumb, context menu, touch.
  Doit être découpée logiquement ou conservée intacte dans `navigation.js`.
- **`renderSidebar()`** (ligne 5421-5457) : rebuild complète de la sidebar en HTML string.
- **`showFolderPicker()` et `showImagePicker()`** (lignes 2009-2480) : très similaires.
  Logique dupliquée → pourrait factoriser un `showNavigationDialog()`, mais **ne pas** refactoriser pour le moment (conserver le code tel quel).
- **`showReaderSettings()` / `showReaderTranslationsPanel()` / `renderLibTranslations()`** : forte complexité (lignes 5656-6249).
  Logique de gestion de langues, import/export JSON. Reste dans `i18n.js`.
- **`libProgressDrag` + `attachProgressCarouselNav`** : gestion manuelle de scroll horizontal + drag.
  Les listeners `mousemove`/`mouseup` sont globaux → à initialiser une seule fois.
- **`state` a des champs ajoutés dynamiquement** (`collections`, `collectionsByLib`, `progressLoaded`, `flatFiles`, `flatFilesByExt`, `currentTome`, `ownerUid`, `allCollections`, `loadingLibraries`) —
  tous doivent être présents dans l'objet initial de `main.js` ou documentés comme "ajoutés dynamiquement".
