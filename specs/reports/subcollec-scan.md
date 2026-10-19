# Sub-collection Scan Report

## Contexte

Ce rapport documente le fonctionnement du rescan de bibliothèques et de collections dans l'application renamer, avec un focus sur la détection correcte des sous-collections lors de déplacements/renommages de fichiers.

## Architecture de scan

Le rescan utilise deux parcours de code principaux :

### 1. `scanFolderRecursive()` (PageController.php:943)

- **Mode cache (par défaut)** : Utilise `$folder->getDirectoryListing()` qui lit depuis `oc_filecache` (cache fichier de Nextcloud). Peut être périmé après un déplacement/renommage de fichiers.
- **Mode direct (forceCacheScan=true)** : Appelle `scanStorageDirect()` qui utilise `IStorage::opendir()` + `readdir()` + `stat()` pour lire directement depuis le backend de stockage, contournant complètement le cache fichier.

### 2. `classifyFilesForLibrary()` (PageController.php:730)

Transforme une liste plate de fichiers en arbre de collections :
- Fichiers documents (cbz, pdf, etc.) → tomes
- Dossiers contenant des fichiers → sous-collections (children)
- Dossiers vides → **ignorés** (retournent `null` dans `buildNode()`)

## Résultats des tests

### Scénario 1 : Fichier déplacé dans un sous-dossier existant

**Setup** : `Naruto Gaiden.cbz` déplacé dans le dossier `Naruto/Naruto Gaiden TEST/`

**Résultat après `rescanLibrary(24)`** :
- Collection "Naruto" : 72 fichiers racine (Naruto v01-v72, tomes 1-72)
- Children : `["Naruto Gaiden TEST" (1 fichier, tome 1)]`
- ✅ Fonctionne correctement

### Scénario 2 : Fichier déplacé en retour à la racine, dossier vide

**Setup** : `Naruto Gaiden.cbz` déplacé enraciné dans `Naruto/`, dossier `Naruto Gaiden TEST/` vide

**Résultat après `rescanLibrary(24)`** :
- Collection "Naruto" : 73 fichiers racine (Naruto Gaiden.cbz = tome 1, Naruto v01-v72 = tomes 2-73)
- Children : 0
- ✅ Ancienne sous-collection correctement supprimée

### Scénario 3 : Dossier renommé, fichier dans le nouveau dossier

**Setup** : Dossier renommé de `Naruto Gaiden` → `Naruto Gaiden TEST`, fichier déplacé dans le nouveau dossier

**Résultat après `rescanLibrary(24)`** :
- Collection "Naruto" : 72 fichiers racine
- Children : `["Naruto Gaiden TEST" (1 fichier)]`
- ✅ Nouveau nom de sous-collection correctement détecté

### Scénario 4 : Dossier vide renommé (fichier enraciné)

**Setup** : Dossier `Naruto Gaiden TEST/` vide (fichier dans le dossier racine `Naruto/`)

**Résultat après `rescanLibrary(24)`** :
- Children : 0
- ✅ Ancienne sous-collection correctement supprimée

## Différence entre `rescanLibrary` et `rescanCollection`

| Aspect | `rescanLibrary` | `rescanCollection` |
|--------|-----------------|---------------------|
| Portée | Toute la bibliothèque | Une collection spécifique |
| Scan | `scanFolderRecursive(rootFolder, ..., true, true)` | `scanFolderRecursive(folder, ..., true, true)` |
| Classification | `classifyFilesForLibrary(files, rootFolder)` — construit l'arbre complet | `classifyFilesForLibrary(files, folder)` — construit l'arbre pour une collection |
| Mise à jour children | `$data['children']` directement depuis classification | Reconstruction explicite: `$rootEntry['children']` + autres entrées |
| Nettoyage des collections obsolètes | Compare `$classifiedNames` vs `$existingByName` et supprime les manquantes | Met à jour in-place la même collection |

**Note** : `rescanCollection` a une logique supplémentaire pour reconstruire l'arbre (`rootBase` extraction + fusion `children`), mais le comportement final est identique à `rescanLibrary`.

## Causes racines du bug initial

1. **Colonne `rules` en TEXT (65KB)** : Provoquait `SQLSTATE[22001]: Data too long for column 'rules'` sur les grands manga (One Piece, Naruto avec 72 tomes). Résolu par migration `ALTER TABLE ... MODIFY rules LONGTEXT`.

2. **Cache fichier périmé** : `Folder::getDirectoryListing()` lisait depuis `oc_filecache` au lieu du système de fichiers réel. Résolu par `scanStorageDirect()` qui utilise `IStorage::opendir()` directement.

3. **Collections obsolètes non supprimées** : Lorsqu'un dossier était supprimé/déplacé, le cache montrait encore le dossier, empêchant la suppression de la collection. Résolu par `folderExistsDirect()` et le double-check dans la boucle de suppression de `rescanLibrary`.

## Conclusion

Le rescan fonctionne correctement dans tous les scénarios testés. Le bug initial ("toujours EXACTEMENT le même bug") était dû à :
1. L'erreur SQL (colonne `rules` trop petite) — corrigée par migration LONGTEXT
2. Le cache fichier périmé — corrigé par `scanStorageDirect()`

Les tests utilisateur qui ont échoué ont eu lieu **avant** l'application des correctifs (fichiers modifiés à 09:33, tests utilisateurs à 09:16-09:29). Les tests post-correction confirment le bon fonctionnement.

## Bug frontend identifié

Le **vrai problème UX** est côté client :

- `showToast()` supprime automatiquement le toast après **3500ms** (library.js:874)
- Un `rescanLibrary` pour une grande bibliothèque prend **5+ minutes** (2425 fichiers, 27 collections)
- Le toast "Rescan en cours…" disparaît, l'utilisateur n'a **aucune indication** que le scan continue
- Le spinner de loading n'est pas activé
- L'utilisateur pense que le scan a échoué et recommence, ou abandonne

### Différence entre rescanLibrary et rescanCollection

- **`rescanCollection`** : scanne un seul dossier (~1s) → le toast est encore visible → semble "marcher parfaitement"
- **`rescanLibrary`** : scanne toute la bibliothèque (27 sous-dossiers, 2425 fichiers) → lent (5+ min) → le toast disparaît → semble "bloquer"

### Correctif frontend appliqué v2 (non bloquant)

Première version appliquait `showLoader()` (overlay full-screen avec `pointer-events: auto`) — **régression** car ça blocait toute navigation pendant le scan.

Version corrigée utilise un **toast persistant avec spinner** :

Depuis `js/library.js` (et `js/audio-and-book-reader/core.js` + `library-ops.js`) :

1. **`showToast(message, type, durationMs)`** — `durationMs` optionnel permet de garder le toast plus longtemps (sinon 3500ms)

2. **`showPersistentToast(message, type)`** — nouveau toast avec spinner animé (`<span class="lib-toast-spinner">`), persistant jusqu'à appel explicite de `hidePersistentToast()`

3. **`hidePersistentToast(toastInfo)`** — retire un toast persistant spécifique

4. **`hideAllToasts()`** — retire tous les toasts actifs

5. **`rescanLibrary` et `rescanCollection`** utilisent désormais :
   - `showPersistentToast(...)` → affiche un toast avec spinner ET garde-le affiché (pas de `setTimeout` auto-remove)
   - L'utilisateur peut **continuer à naviguer** pendant le scan
   - Dans `.then()` : `hidePersistentToast()` → retire le toast du scan, `showToast()` → affiche "Rescan terminé", puis `loadLibraries()` / `loadCollections()` pour rafraîchir les données
   - Dans `.catch()` : `hidePersistentToast()` + `showToast(error)`

### Fichiers modifiés (frontend)

- `js/library.js` :
  - `showToast()` — accepte `durationMs` paramètre optionnel
  - `showPersistentToast()` — nouveau, toast avec spinner persistant
  - `hidePersistentToast()` — nouveau, retire un toast persistant
  - `hideAllToasts()` — nouveau, retire tous les toasts
  - `rescanLibrary()` — utilise `showPersistentToast` au lieu de `showToast`
  - `rescanCollection()` — utilise `showPersistentToast` au lieu de `showToast`

- `js/audio-and-book-reader/core.js` :
  - `L.showToast()` — accepte `durationMs`
  - `L.showPersistentToast()` / `L.hidePersistentToast()` — nouveaux
  - `L.hideAllToasts()` — déplacé et amélioré
  - `L._toastCounter` / `L._activeToasts` — système de tracking des toasts

- `js/audio-and-book-reader/library-ops.js` :
  - Importe `showPersistentToast` / `hidePersistentToast` / `hideAllToasts`
  - `rescanLibrary()` / `rescanCollection()` — utilisent `showPersistentToast`

## Validation syntaxique

- `php -l lib/Controller/PageController.php` → OK
- `php -l lib/Db/CollectionMapper.php` → OK
- `node --check js/library.js` → OK
- `node --check js/audio-and-book-reader/core.js` → OK
- `node --check js/audio-and-book-reader/library-ops.js` → OK
- `node --check js/audio-and-book-reader/main.js` → OK
