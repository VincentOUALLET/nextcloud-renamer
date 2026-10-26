# Rapport d'analyse : Architecture réelle — 3 codebases parallèles (NETTOYÉ)

## Correction importante

**Mon premier rapport était FAUX sur un point critique** : `js/library.js` n'est **chargé nulle part**. Les fichiers `audio-and-book-reader/*` **SONT chargés** sur la route `/reader`.

---

## Architecture réelle : 2 codebases séparées (après nettoyage)

### Route `/` (app principale à onglets) — `PageController::renderRenamerPage()`
```
js/app.js                    ← Core (state, i18n, modales, registry onglets)
js/rename.js                 ← Action menu Nextcloud
js/utils.js
js/navigation.js             ← Navigation dossiers (folder browser pour app principale)
js/reader.js                 ← Loader pour onglet reader (charge tabs/reader/app-reader.js)
js/app-pdf.js                ← Onglet PDF
js/app-metadata.js           ← Onglet Métadonnées
js/main.js                   ← Entry point renamer app (3.8 KB)
js/icons.js
js/tabs/pdf/*.js             ← Viewers PDF/EPUB
```

### Route `/reader` (page bibliothèque standalone) — `PageController::renderLibraryPage()`
```
js/audio-and-book-reader/main.js          ← Entry point (state, init, bind, updateUrl, buildCtx)
js/audio-and-book-reader/core.js          ← Utilitaires de base (fileExt, parseFilename, apiRequest, etc.)
js/audio-and-book-reader/i18n.js          ← Traductions FR/EN + t(), loadCustomTranslations
js/audio-and-book-reader/classification.js ← classifyScan, enrichFileEntries, getCollectionRoot
js/audio-and-book-reader/covers.js        ← coverUrl, loadCoversBulk, renderTomeIcon, etc.
js/audio-and-book-reader/audio-library.js  ← NOUVEAU (code audio légitime, pas dans library.js)
js/audio-and-book-reader/progress.js      ← markTomeRead, markCollectionRead, etc.
js/audio-and-book-reader/library-ops.js   ← CRUD library/collection (rename, delete, rescan, etc.)
js/audio-and-book-reader/collection-ops.js ← Opérations collections
js/audio-and-book-reader/tome-ops.js      ← renameTome, deleteTome, renameSubCollection, etc.
js/audio-and-book-reader/ui-components.js  ← createViewToggleBtn, refreshTranslations
js/audio-and-book-reader/reader.js        ← renderReading, closeReaderModal, resolveReader, etc.
js/audio-and-book-reader/rendering.js     ← render, renderShell, renderSidebar, cache vues
js/audio-and-book-reader/navigation.js    ← loadLibraries, loadCollections, handleUrlParams, breadcrumb
```

### Fichier orphelin **SUPPRIMÉ** ✅
```
js/library.js (6000+ lignes)  ← SUPPRIMÉ — était code mort non chargé
```

---

## Nettoyage effectué

### 1. Suppression du fichier mort ✅
- `js/library.js` (6000 lignes) **SUPPRIMÉ** — n'était chargé nulle part

### 2. Déduplication interne `audio-and-book-reader/` ✅
- **`main.js`** : Supprimé `buildLibBreadcrumb` et `renderBreadcrumb` (doublons de `navigation.js`)
  - Avant : 669 lignes → Après : **470 lignes** (-199 lignes)
- Les fonctions `buildLibBreadcrumb` / `renderBreadcrumb` / `renderShell` / `renderSidebar` / `render` sont maintenant **uniquement** dans leurs modules respectifs :
  - `navigation.js` : `buildLibBreadcrumb`, `renderBreadcrumb`, `handleUrlParams`, `loadLibraries`, `loadCollections`
  - `rendering.js` : `render`, `renderShell`, `renderSidebar`, cache vues
  - `main.js` : `state`, `init`, `bind`, `updateUrl`, `buildCtx`, entry point DOMContentLoaded

### 3. Vérifications syntaxiques ✅
```bash
# Tous les fichiers audio-and-book-reader : OK
node --check js/audio-and-book-reader/*.js  # 14 fichiers, 0 erreurs

# Fichiers racine (app principale) : OK
node --check js/*.js  # 17 fichiers, 0 erreurs

# PHP : OK
php -l lib/Controller/PageController.php  # 0 erreurs
```

---

## État actuel des duplications (inchangé mais documenté)

| Fichier split | Lignes | Origine dans `library.js` (supprimé) |
|---------------|--------|--------------------------------------|
| `core.js` | 368 | Utilitaires de base |
| `classification.js` | 353 | classifyScan, enrichFileEntries |
| `reader.js` | 907 | renderReading, resolveReader, etc. |
| `library-ops.js` | 1382 | CRUD library/collection |
| `navigation.js` | 422 | loadLibraries, breadcrumb, handleUrlParams |
| `rendering.js` | 288 | render, renderShell, renderSidebar |
| `i18n.js` | 1091 | Objet TR complet + t() |
| `covers.js` | 562 | Gestion couvertures |
| `progress.js` | 479 | Progression lecture |
| `tome-ops.js` | 1626 | Opérations tomes |
| `ui-components.js` | 170 | Composants UI |
| `collection-ops.js` | 446 | Opérations collections |
| `audio-library.js` | 115 | **NOUVEAU** (légitime) |

**Total `audio-and-book-reader/` : 8677 lignes** (vs ~6000 ancien library.js)
- L'augmentation vient de `i18n.js` (TR complet 1091 lignes) et `audio-library.js` (nouveau)

---

## Architecture résumée

### Deux apps indépendantes, zéro code partagé (pour l'instant)

| Aspect | `/` (app principale) | `/reader` (bibliothèque) |
|--------|---------------------|--------------------------|
| Entry point | `js/main.js` (3.8 KB) | `js/audio-and-book-reader/main.js` |
| State | `app.js` (RenamerApp) | `audio-and-book-reader/main.js` (L.state) |
| Navigation | `js/navigation.js` (folder browser) | `audio-and-book-reader/navigation.js` (library breadcrumb) |
| Rendering | `app.js` + onglets | `audio-and-book-reader/rendering.js` |
| Reader | `js/tabs/reader/app-reader.js` | `audio-and-book-reader/reader.js` |
| i18n | `app.js` (inline) | `audio-and-book-reader/i18n.js` (TR complet) |

### Points de drift connus (inchangés)

| Fonction | App principale | Bibliothèque (`/reader`) |
|----------|---------------|--------------------------|
| `changeLibraryType` | N/A | Signature `(lib, newType)` seulement |
| `showFolderPicker` | Dans `navigation.js` (root) | Version simplifiée dans `library-ops.js` |
| `loadCoversBulk` | N/A | Version Promise dans `covers.js` |
| `showLibraryEditModal` | ❌ | ✅ Dans `library-ops.js` |
| `showCollectionEditModal` | ❌ | ✅ Dans `library-ops.js` |

---

## Prochaines étapes recommandées

### Court terme (factorisation commune)
1. **Extraire `core.js` + `i18n.js`** en modules partagés `js/shared/` chargés par les deux apps
2. **Unifier `navigation.js`** : le folder browser (root) et le library breadcrumb (split) font des choses différentes mais partagent `RenamerNavigation` pour les favoris

### Moyen terme (vrai split modulaire)
1. **Build step (Vite/esbuild)** pour bundler chaque app
2. **ES modules** avec vrais `import`/`export` au lieu de `window.RenamerLibrary`
3. **Tree-shaking** pour éliminer le code mort

### Long terme (unification)
1. **Une seule app** avec routing côté client (`/`, `/reader`, `/pdf`, `/metadata`)
2. **State unique** partagé
3. **Lazy loading** des onglets lourds (PDF, reader)

---

## Fichiers modifiés lors de ce nettoyage

| Fichier | Action |
|---------|--------|
| `js/library.js` | **SUPPRIMÉ** (était mort) |
| `js/audio-and-book-reader/main.js` | **MODIFIÉ** : -199 lignes (supprimé buildLibBreadcrumb, renderBreadcrumb doublons) |
| `js/audio-and-book-reader/navigation.js` | Inchangé (source unique breadcrumb) |
| `js/audio-and-book-reader/rendering.js` | Inchangé (source unique render) |

**Total lignes supprimées : ~6200** (library.js 6000 + main.js doublons 199)