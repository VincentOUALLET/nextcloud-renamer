# SPEC-library-multi-paths-and-types.md — Bibliothèques à chemins multiples & types de classification

> Objectif : permettre à une **bibliothèque** de regrouper plusieurs dossiers
> Nextcloud situés dans des endroits divers (sans écraser), et introduire un
> **type de bibliothèque** (`flat` | `tomes` | `audio`) qui déclare la stratégie
> de classification. Le type peut être modifié ultérieurement depuis l'interface,
> avec prise en compte granulaire au niveau des collections.
>
> Portée : `js/library.js`, `js/tabs/pdf/generic-viewer.js`,
> `lib/Db/Library.php`, `lib/Db/LibraryMapper.php`,
> `lib/Db/CollectionMapper.php`, `lib/Controller/PageController.php`,
> `appinfo/routes.php`.

---

## 0. Diagnostic — Comportement actuel

### 0.1 Modèle de données (library)

`lib/Db/Library.php` — entité `Library` :

```
id, user_id, name, description, created_at, updated_at
```

- `description` sert d'**unique** chemin racine (root folder path).
- `LibraryMapper::insert()` / `update()` écrivent seulement `name` / `description`.
- `listLibraries()` et `libraryEntry()` retournent `description` → le frontend l'affiche
  dans `renderLibraryCards()` comme `metaText` (`js/library.js:3483`).

### 0.2 Flux de création actuel (`js/library.js:2347` — `createLibrary` + `js/library.js:2408` — `addLibrary`)

1. `addLibrary()` → `showFolderPicker(cb)` → l'utilisateur choisit **un seul** dossier.
2. `RenamerUtils.showPromptDialog()` → l'utilisateur entre le **nom**.
3. `createLibrary(rootFolder, name)` :
   - POST `/api/reader/scan` `{ path, recursive: true }` → liste des fichlers.
   - `classifyScan(files, rootFolder)` → `{ name => { folder, files, children } }`.
   - POST `/api/reader/libraries` `{ name, description: rootFolder }`.
   - Pour chaque collection classée : POST `/api/reader/collections` `{ libraryId, name, rules }`.

### 0.3 Rescan (`PageController.php:1052` — `rescanLibrary`)

- Lit `$library->getDescription()` comme **unique** root folder.
- Scane recursivement, reconstruit toutes les collections par nom.

### 0.4 Frontend — `state`

- `state.libraries` : tableau d'objets `{ id, name, description, userId, … }`.
- `lib.description` est utilisé comme root folder partout (cards, rename, etc.).

### 0.5 Collection — `rules`

```
{ folder: string, files: [{ path, name, tome, … }], children: [...] }
```

---

## 1. Stockage des paths multiples

### 1.1 Schéma DB — `renamer_libraries`

Ajouter une colonne `paths` de type `TEXT` (JSON).

Modifier `LibraryMapper::ensureTableExists()` (`lib/Db/LibraryMapper.php:15`) :

```php
$this->db->executeStatement("CREATE TABLE IF NOT EXISTS `" . $sqlTable . "` (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT,
    paths TEXT,              -- ← NOUVEAU : JSON array de chemins racine
    library_type VARCHAR(32) NOT NULL DEFAULT 'tomes', -- ← NOUVEAU (voir §2)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_name (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
```

> **Stratégie de migration** : pas de migration dédiée (l'app utilise `CREATE TABLE
> IF NOT EXISTS`). Pour les bibliothèques existantes, `paths` est `NULL` → le code
> lit `description` comme fallback (voir §1.2).

### 1.2 Entité `Library` (`lib/Db/Library.php`)

Ajouter :

```php
/** @var string|null  JSON-encoded array of root paths */
protected $paths;

/** @var string  'flat' | 'tomes' | 'audio' */
protected $libraryType;
```

Méthodes d'accès :

| Méthode | Description |
|---|---|
| `getPaths(): ?string` | Retourne le JSON brut (ou `null`). |
| `setPaths(?string $paths): void` | Stocke le JSON. |
| `getPathsArray(): array` | Décodage JSON → `array<string>`. `[]` si vide. |
| `setPathsArray(array $paths): void` | Encode en JSON. |
| `getLibraryType(): string` | Retourne `libraryType` ou `'tomes'` par défaut. |
| `setLibraryType(string $type): void` | Valide contre la whitelist. |

**Rétrocompatibilité** : si `paths` est `null`/vide mais `description` non vide →
`getPathsArray()` retourne `[$description]`.

### 1.3 Mapper — `LibraryMapper`

- **`insert()`** : écrire `paths` (JSON) et `library_type`.
- **`update()`** : mettre à jour `paths`, `library_type`, `name`, `description`.
- **`findAll()`** / **`find()`** : la requête `SELECT *` récupère automatiquement `paths`
  et `library_type` via l'hydratation d'entité.

### 1.4 Contrôleur — `PageController.php`

#### `createLibrary()` (`PageController.php:2251`)

Payload accepté :

```json
{
  "name": "string",
  "description": "string (legacy root path, optional)",
  "paths": ["string", ...],
  "libraryType": "flat" | "tomes" | "audio"
}
```

- Si `paths` est fourni et non vide → utiliser `setPathsArray(paths)`.
- Sinon → fallback `description` → `[description]`.
- `libraryType` optionnel, défaut `'tomes'`.

Réponse : ajouter `paths` et `libraryType` au payload `library`.

#### `updateLibrary()` (`PageController.php:2284`)

Accepter `paths` et `libraryType` dans le payload PUT.

#### `listLibraries()` (`PageController.php:2224`)

Ajouter `paths` et `libraryType` dans la réponse.

#### `libraryEntry()` (`PageController.php:2589`)

Ajouter `paths` et `libraryType`.

#### `rescanLibrary()` (`PageController.php:1052`)

Modifier pour itérer sur **tous** les chemins. Décision utilisateur : **option (b)** —
une collection par path racine.

```php
$paths = $library->getPathsArray();
// Si paths vide et description non vide → [$library->getDescription()]
$existing = $this->collectionMapper->findByLibraryId($library->getId());
$existingByName = [];
foreach ($existing as $col) $existingByName[$col->getName()] = $col;

$updated = []; $created = []; $removed = [];

foreach ($paths as $rootFolder) {
    $files = $this->scanFolderRecursive($rootFolder, $uid, true);
    $classified = $this->classifyFilesForLibrary($files, $rootFolder);
    // classified = { rootBase => { folder, files, children } }
    foreach ($classified as $name => $data) {
        $rules = ['folder' => $data['folder'], 'files' => $data['files'], 'children' => $data['children'] ?? []];
        if (isset($existingByName[$name])) {
            $col = $existingByName[$name];
            $col->setRulesArray($rules);
            $this->collectionMapper->update($col);
            $updated[] = $col->getId();
        } else {
            $col = new Collection();
            $col->setUserId($uid);
            $col->setLibraryId($library->getId());
            $col->setName($name);
            $col->setDescription('');
            $col->setRulesArray($rules);
            $col = $this->collectionMapper->insert($col);
            $created[] = $col->getId();
        }
    }
}
// Collections dont le path racine n'existe plus → delete (optionnel, à débattre)
// Les progrès / favoris sont préservés (keyés sur file_path).
```

> Chaque path racine produit une collection dont le nom = `rootBase` (nom du dossier).
> Si un path est retiré de la lib, les collections orphelines (plus de path correspondant)
> sont supprimées au prochain rescan.

#### Nouveau endpoint : `addPathToLibrary()` (`PageController.php:NEW`)

Route : `POST /api/reader/libraries/{id}/paths`

Payload : `{ path: "string" }`

- Ajoute le chemin au tableau `paths` (sans écraser les existants).
- Déclenche un rescan interne ou non (débat, voir §4).

#### Nouveau endpoint : `removePathFromLibrary()` (`PageController.php:NEW`)

Route : `DELETE /api/reader/libraries/{id}/paths`

Payload : `{ path: "string" }`

- Retire le chemin du tableau.

### 1.5 Routes (`appinfo/routes.php`)

```php
// Ajouter après la route rescanLibrary (ligne 204) :
[
    'name' => 'page#addLibraryPath',
    'url' => '/api/reader/libraries/{id}/paths',
    'verb' => 'POST'
],
[
    'name' => 'page#removeLibraryPath',
    'url' => '/api/reader/libraries/{id}/paths',
    'verb' => 'DELETE'
],
```

---

## 2. Type de bibliothèque — workflow de création

### 2.1 Enumération des types

| Valeur | Libellé FR | Comportement |
|---|---|---|
| `flat` | "Livres décorrélés" | Tous les fichiers d'un path → tomes plats, **pas** d'arbre séries/tome. |
| `tomes` | "Séries / tomes" (comportement actuel) | Classification hiérarchique (dossiers → collections, fichiers → tomes). |
| `audio` | "Livre audio" (placeholder) | Bouton affiché dans le sélecteur, mais **pas** d'implémentation backend/frontend pour le moment. |

### 2.2 Workflow modifié — `addLibrary()` (`js/library.js:2408`)

```
addLibrary()
  → showFolderPicker(cb)           [pas de changement, mais doit permettre sélection multi-dossiers — optionnel pour v1]
    → cb(rootFolder)
      → showPromptDialog(nom)
        → cb(name)
          → showLibraryTypePicker(name, rootFolder)   [NOUVEAU]
            → cb({ name, type })
              → createLibrary(rootFolder, name, type)  [MODIFIÉ]
```

#### `showLibraryTypePicker(name, folder, cb)`

Affiche une modale (réutiliser le système `renamer-modal`) avec :

- Bouton radio / cards pour choisir le type :
  - **📚 Livres décorrélés** (`flat`)
  - **📚 Séries / tomes** (`tomes`) — sélectionné par défaut
  - **🎧 Livre audio** (`audio`) — désactivé (coming soon), mais visible
- Bouton "Confirmer" → appelle `cb({ name, type })`.

Le bouton audio est désactivé avec un tooltip "Fonctionnalité à venir". **On ne
crée pas la logique audio pour le moment** — seulement le bouton dans le
sélecteur.

### 2.3 `createLibrary(rootFolder, name, libraryType)` (`js/library.js:2347`)

Modifier la signature pour accepter `libraryType` (défaut `'tomes'`).

```js
apiRequest(getBaseUrl() + '/api/reader/libraries', {
    method: 'POST',
    body: JSON.stringify({
        name: name,
        description: rootFolder,
        paths: [rootFolder],         // ← NOUVEAU
        libraryType: libraryType,    // ← NOUVEAU
    }),
})
```

#### Classification selon le type

- `flat` : `classifyScan` produit **un seul groupe plat** — chaque fichier devient
  un "tome" directement sous une collection unique nommée d'après le dossier racine.
  Pas de sous-collections `children`.

  ```
  classifyScanFlat(files, rootFolder) → { [rootBase]: { folder, files: allDocs, children: [] } }
  ```

- `tomes` : comportement actuel (`classifyScan`).
- `audio` : pas de classification — création de la bibliothèque uniquement.
  Le bouton "Livre audio" dans le sélecteur ne doit **pas** déclencher l'audio pour le
  moment.

### 2.4 i18n (`TR` dans `js/library.js` — section `fr:`/`en:`)

| Clé | FR | EN |
|---|---|---|
| `newLibTypePrompt` | "Type de bibliothèque" | "Library type" |
| `libTypeFlat` | "Livres décorrélés" | "Flat books" |
| `libTypeTomes` | "Séries / tomes" | "Series / volumes" |
| `libTypeAudio` | "Livre audio" | "Audiobook" |
| `libTypeAudioSoon` | "Fonctionnalité à venir" | "Coming soon" |
| `libTypeFlatHint` | "Tous les documents sont listés ensemble, sans regroupement par série." | "All documents listed together, no series grouping." |
| `libTypeTomesHint` | "Regroupe les documents par dossier (série) avec numérotation de tomes." | "Groups documents by folder (series) with volume numbering." |
| `libTypeAudioHint` | "Bibliothèque pour fichiers audio (mp3, flac, m4a)." | "Library for audio files (mp3, flac, m4a)." |
| `libTypeConfirm` | "Créer" | "Create" |
| `addLibraryPathPrompt` | "Nouveau dossier pour {name}" | "New folder for {name}" |
| `addLibraryPathTitle` | "Ajouter un dossier" | "Add folder" |
| `libTypeOverwriteWarning` | " Changer le type écrasera les paramètres de classification des collections existantes. Continuer ?" | "Changing the type will overwrite collection classification settings. Continue?" |

---

## 3. Interface — modification du type et des paths

### 3.1 Bibliothèque — menu contextuel (`renderLibraryCards` → `js/library.js:3495`)

Le menu contextuel d'une **bibliothèque** (`card.addEventListener('contextmenu', …)`)
gagne :

```
[Renommer]                (existant — `renameLibrary`)
[Rescanner]               (existant — `rescanLibrary`)
[Ajouter un dossier]      (NOUVEAU — `addLibraryPath`)
────────────────────────
Type de bibliothèque →    (NOUVEAU — sous-menu)
  [Livres décorrélés]
  [Séries / tomes]
  [Livre audio]
────────────────────────
[Supprimer]               (existant — `deleteLibrary`)
```

#### `addLibraryPath(lib)` (`js/library.js:NEW`)

- Ouvre `showFolderPicker` → récupère le nouveau `path`.
- Affiche une confirmation : *"Ajouter ce dossier à la bibliothèque **{name}** ?"*
- POST `/api/reader/libraries/{id}/paths` `{ path }`.
- Met à jour `state.libraries[i].paths`.
- Trigger un rescan de la bibliothèque.

#### `changeLibraryType(lib, newType)` (`js/library.js:NEW`)

- Si `newType === lib.libraryType` → ne rien faire.
- Sinon → afficher `showConfirmDialog` avec le message
  `t('libTypeOverwriteWarning')`.
- Si confirmé → PUT `/api/reader/libraries/{id}` `{ name, description, paths, libraryType: newType }`.
- Afficher un toast : *"Type mis à jour — les collections seront re-classées au prochain rescan."*
- Trigger un rescan.

> **Comportement du rescan post-changement de type** : le rescan reconstruit
> les collections selon le **nouveau** type. Les progrès de lecture et favoris
> sont préservés (keyés sur `file_path`, pas sur `collection_id`).
> Le mot warning informe l'utilisateur que **les règles de classification des
> collections existantes seront réécrites**.

### 3.2 Affichage des paths dans la card bibliothèque

`renderLibraryCards()` (`js/library.js:3469`) :

- Si `lib.paths` (tableau) est disponible et a plusieurs entrées → afficher
  `"{n} dossiers"` dans `metaText` au lieu de `lib.description`.
- Si un seul path → afficher le path comme actuellement.

### 3.3 Collection — type de collection (override)

Chaque **collection** peut avoir un type qui **découle** du type de sa bibliothèque
mais peut être **surchargé** :

- Le `rules` JSON de collection peut contenir un champ optionnel `type` :
  `'flat'` | `'tomes'` | `null` (hérite du parent library).

```js
rules = {
  folder: "...",
  files: [...],
  children: [...],
  type: "flat"  // ← NOUVEAU, optionnel, hérite si absent
}
```

#### Menu contextuel collection (`renderCollections` → `js/library.js:3128`)

```
[Ouvrir]                  (existant)
[Marquer comme lu]        (existant)
[Marquer comme non lu]    (existant)
────────────────────────
Type de collection →      (NOUVEAU — sous-menu)
  [Hériter de la bibliothèque]
  [Livres décorrélés]
  [Séries / tomes]
  [Livre audio]
────────────────────────
[Renommer]                (existant)
[Rescanner]               (existant)
[Supprimer]               (existant)
```

#### `changeCollectionType(col, newType)` (`js/library.js:NEW`)

- Met à jour `col.rules.type` côté client.
- PUT `/api/reader/collections/{id}` `{ rules }`.
- Toast : *"Type de collection mis à jour."*
- Re-render.

> **Note** : le changement de type de collection **n'overwrite pas** les autres
> collections. C'est un override local. Seul le changement de type de **bibliothèque**
> a un impact global (avec warning).

---

## 4. Impact sur `generic-viewer.js`

Le fichier `js/tabs/pdf/generic-viewer.js` n'a **pas besoin de changement fondamental**
pour le support multi-path ou les types. Toutefois :

### 4.1 Détection de type audio (future-proofing)

Ajouter une vérification dans le dispatcher de ouverture (`renderReading` ou
équivalent) : si le fichier est `.mp3` / `.flac` / `.m4a` et que la bibliothèque
est de type `audio`, afficher un message *"Lecteur audio — fonctionnalité à venir"*
au lieu de tenter d'ouvrir le PDF viewer.

> Pour le moment, le bouton "Livre audio" dans le sélecteur de type ne déclenche
> **aucune** logique. Le support audio complet (tags, waveform, etc.) est un
> chantier futur.

### 4.2 `restorePage` / `savePage`

Aucun changement — la progression est déjà keyée sur `filePath`, ce qui reste
valide avec des paths multiples.

---

## 5. Todolist — suivi d'implémentation

Les agents mettront à jour cette section en cochant les items `✅` ou `❌` :

```
[ ] §1.1 — Schéma DB : colonne `paths` + `library_type` dans `LibraryMapper::ensureTableExists()`
[ ] §1.2 — Entité `Library` : `getPaths()`, `getPathsArray()`, `getLibraryType()`, setters + retrocompat `description`
[ ] §1.3 — `LibraryMapper::insert()` / `update()` écrivent `paths` et `library_type`
[ ] §1.4a — `PageController::createLibrary()` accepte `paths` + `libraryType`
[ ] §1.4b — `PageController::updateLibrary()` accepte `paths` + `libraryType`
[ ] §1.4c — `PageController::listLibraries()` + `libraryEntry()` renvoient `paths` + `libraryType`
[ ] §1.4d — `PageController::rescanLibrary()` itère sur tous les paths
[ ] §1.4e — Nouveau endpoint `POST /api/reader/libraries/{id}/paths` (add)
[ ] §1.4f — Nouveau endpoint `DELETE /api/reader/libraries/{id}/paths` (remove)
[ ] §1.5  — Routes ajoutées dans `appinfo/routes.php`
[ ] §2.2  — `showLibraryTypePicker()` (modale) dans `js/library.js`
[ ] §2.3  — `createLibrary()` accepte `libraryType`, classify `flat` vs `tomes`
[ ] §2.4  — i18n FR + EN ajoutée au `TR`
[ ] §3.1a — `addLibraryPath(lib)` dans le menu contextuel bibliothèque
[ ] §3.1b — `changeLibraryType(lib, newType)` avec warning, dans le menu contextuel
[ ] §3.2  — `renderLibraryCards()` affiche le nombre de dossiers
[ ] §3.3a — Collection `rules.type` (hérite / override) — backend + frontend
[ ] §3.3b — `changeCollectionType(col, newType)` dans le menu contextuel collection
[ ] §4  — Future-proofing audio detection dans `generic-viewer.js`
```

---

## 6. Fichiers concernés

| Fichier | Modification |
|---|---|
| `lib/Db/Library.php` | Ajout `paths`, `libraryType` + getters/setters |
| `lib/Db/LibraryMapper.php` | `ensureTableExists()` + `insert()`/`update()` |
| `lib/Controller/PageController.php` | `createLibrary`, `updateLibrary`, `listLibraries`, `libraryEntry`, `rescanLibrary`, nouveaux endpoints paths + routes |
| `appinfo/routes.php` | Routes `addLibraryPath` / `removeLibraryPath` |
| `js/library.js` | `addLibrary`, `createLibrary`, `showLibraryTypePicker`, `classifyScanFlat`, `addLibraryPath`, `changeLibraryType`, `changeCollectionType`, `renderLibraryCards`, menus contextuels, i18n |
| `js/tabs/pdf/generic-viewer.js` | Future-proofing audio (minimal, §4) |

---

## 7. Décisions validées par l'utilisateur

1. **Multi-path à la création :** v1 = **un seul dossier** à la création, puis ajout
   ultérieur via le menu contextuel (option "Ajouter un dossier").
   V2 éventuelle : multi-select dans `showFolderPicker`.

2. **Rescan multi-path :** **option (b)** — créer **une collection par path racine**.
   Chaque path devient une collection dont `folder` = le path absolu.
   Le `rootBase` pour la classification est dérivé du nom du dossier.
   > La v1 (a) était rejetée car visuellement buguée / incompréhensible : l'utilisateur
   > s'attend à ce que tous les dossiers concernés soient rescannés. Avec (b), chaque
   > path donne une collection isolée, clairement identifiable.

3. **Type `audio` :** bouton **visible mais désactivé** dans le sélecteur avec tooltip
   "Fonctionnalité à venir". La création ne se lance pas tant que le type audio n'est pas
   sélectionné (et le bouton est désactivé).
