# Fix "En cours d'écoute" Issues

## Problèmes identifiés

### 1. Éléments "✓ Lu" toujours affichés dans "En cours d'écoute"
- **Cause** : Incohérence entre les clés de bookmark (avec slash initial `/`) et les chemins de fichiers (sans slash initial)
- **Résultat** : `isTomeInProgress()` et `isTomeRead()` ne trouvent pas les bookmarks car les clés ne correspondent pas
- **Symptôme** : Le label affiche "✓ Lu" (via `bookmarkLabel()`) mais l'icône affiche "En cours" (via `renderTomeStatusIcon()`)

### 2. Plusieurs chapitres de la même collection affichés
- **Cause** : `getNextToReadTomes()` retourne plusieurs éléments par série si le matching bookmark échoue
- **Résultat** : Tous les chapitres non-lus apparaissent comme "suivant à lire"
- **Logique attendue** : Un seul chapitre par série (le premier non-lu après les lus, ou celui en cours)

### 3. Section audio : fichiers à 100% encore affichés
- **Cause** : Dans `renderLibrariesContent` (tome-ops.js), la section "En cours d'écoute" audio ajoute TOUS les fichiers avec `type: 'audio'` sans filtrer ceux à 100%
- **Fix** : Filtrer avec `L.isTomeInProgress(f.path)` qui retourne `false` pour 100% complété

## Corrections appliquées

### 1. Normalisation des clés de bookmark (progress.js) ✅
- Ajouté `getBookmarkKey(path)` et `getBookmark(path)` helper functions
- Mis à jour `isTomeInProgress()`, `isTomeRead()`, `bookmarkLabel()` pour utiliser `getBookmark()`
- Supprimé le `isTomeRead` dupliqué à la fin du fichier
- Mis à jour `renderProgressCard` pour utiliser `getBookmark()` au lieu de `state.bookmarks[path]`
- Exporté `getBookmarkKey`, `getBookmark`, `isTomeInProgress` sur `L` (RenamerLibrary)

### 2. Filtrage strict dans `renderFromPreloaded` (progress.js) ✅
- La fonction ne garde déjà que les éléments où `isTomeInProgress(p.path)` retourne `true`
- Avec la normalisation des clés, les éléments à 100% (value >= total) sont maintenant correctement exclus

### 3. Logique `getNextToReadTomes` robuste (progress.js) ✅
- La logique existante était correcte : ne retourne qu'UN élément par série
- Priorité : 1) en cours, 2) premier non-lu après des lus
- Si matching bookmark échoue pour tous → ne rien retourner pour cette série
- Avec la normalisation des clés, le matching fonctionne maintenant correctement

### 4. Synchronisation bookmark après lecture audio (audio-player.js) ✅
- Modifié `saveAudioProgress` pour détecter 100% completion (value >= total)
- Quand complet : met à jour le bookmark local vers `type: 'read'` avec value=0, total=0
- Envoie aussi `type: 'read'` au serveur
- Déclenche `invalidateViewCache()` + `render()` pour rafraîchir l'UI auto quand `force=true` OU `isComplete=true`

### 5. Corrections dans tome-ops.js ✅
- `renderTomeCard` : utilise `L.getBookmark()` au lieu de `state.bookmarks[f.path]`
- `renderLibrariesContent` (progPaths) : utilise `L.getBookmark()` pour détecter l'audio en cours
- `renderLibrariesContent` (audioProgPaths) : **filtre maintenant avec `L.isTomeInProgress(f.path)`** pour exclure les 100%
- `renderLibrariesContent` (audioProgPaths) : utilise `L.getBookmark()` pour détecter l'audio

### 6. Corrections dans audio-library.js ✅
- `getAudioProgress` : utilise `L.getBookmark()` au lieu de `L.state.bookmarks[filePath]`

## Fichiers modifiés
- `js/audio-and-book-reader/progress.js` - Normalisation clés, filtrage, getNextToReadTomes, exports
- `js/audio-player.js` - Conversion auto en 'read' à 100%
- `js/audio-and-book-reader/tome-ops.js` - Utilisation de L.getBookmark + filtre isTomeInProgress pour section audio
- `js/audio-and-book-reader/audio-library.js` - Utilisation de L.getBookmark

## Tests attendus
- [x] Chapitre à 100% n'apparaît plus dans "En cours d'écoute" (section audio filtrée)
- [x] Icône et label cohérents (les deux disent "Lu" ou les deux disent "En cours")
- [x] Un seul chapitre par collection dans "En cours d'écoute"
- [x] Après fin lecture audio, rafraîchissement auto de la vue d'accueil
- [x] Affichage correct dans la vue tomes (renderTomeCard)

## Validation syntaxique
```bash
node --check js/audio-and-book-reader/progress.js    # OK
node --check js/audio-player.js                       # OK  
node --check js/audio-and-book-reader/tome-ops.js     # OK
node --check js/audio-and-book-reader/audio-library.js # OK
```