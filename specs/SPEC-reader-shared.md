# SPEC-reader-shared.md — Bibliothèque Reader partagée (admin-owned, user-read)

> Objectif : transformer l'onglet Reader (`js/library.js` + `PageController`) d'une
> bibliothèque **personnelle** (chaque utilisateur refait la sienne) en une
> **bibliothèque partagée serveur** — une seule fois, par les admins, accessible en
> **lecture à tous les utilisateurs** du serveur. Les progrès de lecture et les
> favoris restent **liés à chaque utilisateur**.
>
> **Lien connexe :** [SPEC-auto-covers.md](./SPEC-auto-covers.md) — les covers sont
> transutilisateurs et partagent la même propriété "shared cache, user-independent".
>
> Contexte : aujourd'hui, chaque utilisateur ne voit que **ses propres** bibliothèques
> et collections parce que les tables `renamer_libraries` / `renamer_collections`
> portent une colonne `user_id` utilisée comme **filtre de lecture**. Cela force
> chaque utilisateur à recréer sa bibliothèque → duplication, perte de la
> personnalisation partagée.

---

## 1. Diagnostic — Pourquoi c'est actuellement user-scoped

### 1.1 Schéma DB actuel (`ensureTableExists`)

| Table | user_id | Rôle |
|---|---|---|
| `renamer_libraries` | `user_id VARCHAR(255) NOT NULL DEFAULT ''` | **Filtre de lecture** (`findByUserId`) |
| `renamer_collections` | `user_id VARCHAR(255) NOT NULL DEFAULT ''` | **Filtre de lecture** (`findByLibraryId($libId, $userId)`) |
| `renamer_reading_progress` | `user_id VARCHAR(255) NOT NULL` | Filtre de lecture **déjà correct** ✅ |
| `renamer_covers` *(future)* | `user_id NULL` | **Déjà transutilisateur** ✅ (SPEC-auto-covers §2) |
| `renamer_user_preferences` (reader_favorites_) | PK `user_id` | **Déjà transutilisateur par user** ✅ |

### 1.2 Endpoints actifs — tous `@NoAdminRequired`

| Endpoint | Controller | Comportement user_id |
|---|---|---|
| `GET /api/reader/libraries` | `listLibraries()` | `findByUserId($uid)` → **filtré par user** |
| `POST /api/reader/libraries` | `createLibrary()` | `setUserId($uid)` → **créé pour le user** |
| `PUT/DELETE /api/reader/libraries/{id}` | `updateLibrary` / `deleteLibrary` | `find($id, $uid)` → **404 si pas le proprio** |
| `GET /api/reader/collections?libraryId=` | `listCollections()` | `findByLibraryId($libId, $uid)` → **filtré par user** |
| `POST /api/reader/collections` | `createCollection()` | `setUserId($uid)` → **créé pour le user** |
| `PUT/DELETE /api/reader/collections/{id}` | `updateCollection` / `deleteCollection` | `find($id, $uid)` → **404 si pas le proprio** |

### 1.3 Frontend actuel (`js/library.js`)

| Élément | Ligne | Problème |
|---|---|---|
| `state.libraries` | 11 | Ne contient que les libs du user courant |
| Bouton "Ajouter une librairie" (`#lib-add-lib-btn`) | 907 | **Visible par tout le monde** — devrait être admin-only |
| Bouton "Supprimer" (`lib-delete-btn`) | 967 | **Visible par tout le monde** — devrait être admin-only |
| `loadLibraries()` | 293-295 | Appel `/api/reader/libraries` → ne reçoit que les libs du user |

→ **Aucun contrôle de rôle n'existe côté frontend.** `state` n'a pas de champ
`isAdmin` ou `role`. Tout le monde peut créer/supprimer.

---

## 2. Modèle cible — RBAC

### 2.1 Matrice RBAC

| Endpoint | Méthode | User standard (non-admin) | Admin |
|---|---|---|---|
| `/api/reader/libraries` (list) | GET | ✅ Voit **toutes** les libraries partagées | ✅ |
| `/api/reader/libraries` (create) | POST | ❌ 403 | ✅ |
| `/api/reader/libraries/{id}` (update) | PUT | ❌ 403 | ✅ |
| `/api/reader/libraries/{id}` (delete) | DELETE | ❌ 403 | ✅ |
| `/api/reader/collections` (list) | GET | ✅ Voit **toutes** les collections d'une library | ✅ |
| `/api/reader/collections` (create) | POST | ❌ 403 | ✅ |
| `/api/reader/collections/{id}` (update) | PUT | ❌ 403 | ✅ |
| `/api/reader/collections/{id}` (delete) | DELETE | ❌ 403 | ✅ |
| `/api/reader/progress` (save/read/delete) | POST/GET/DELETE | ✅ **Own progress only** (user_id-scoped) | ✅ |
| `/api/reader/favorites` | GET/POST/LIST | ✅ **Own favorites only** | ✅ |
| `/api/covers/*` | GET | ✅ All | ✅ |
| `/api/covers/regenerate` | POST | ❌ 403 | ✅ |

### 2.2 Règles métier

1. **Une seule source de vérité pour les libraries/collections** : créée par un admin,
   partagée par tous. Le `user_id` dans `renamer_libraries` / `renamer_collections`
   devient le **créateur** (audit trail), **non** un filtre de lecture.
2. **Les tomes sont des fichiers Nextcloud** : l'accès (lecture) dépend des partages
   Nextcloud. Si un admin a scanné un dossier partagé en lecture, tous les users
   connectés peuvent lire les tomes → la library est visible par tous.
3. **Progression & favoris** : liés au `user_id` du lecteur → **pas de partage**.
   Un user B qui lit le même tome que A a sa propre progression.
4. **Covers** : transutilisateurs (SPEC-auto-covers §2 — cache `user_id=NULL`).

---

## 3. Changements DB

### 3.1 Migration

```sql
-- renamer_libraries
ALTER TABLE `*PREFIX*renamer_libraries`
    ADD COLUMN owner_uid VARCHAR(255) DEFAULT NULL AFTER `user_id`,
    RENAME COLUMN `user_id` TO `owner_uid`;

-- renamer_collections
ALTER TABLE `*PREFIX*renamer_collections`
    ADD COLUMN owner_uid VARCHAR(255) DEFAULT NULL AFTER `user_id`,
    RENAME COLUMN `user_id` TO `owner_uid`;

-- Migration des données : user_id → owner_uid (les libs créées restent liées à leur créateur)
UPDATE `*PREFIX*renamer_libraries` SET owner_uid = user_id WHERE owner_uid IS NULL;
UPDATE `*PREFIX*renamer_collections` SET owner_uid = user_id WHERE owner_uid IS NULL;
```

> ⚠️ Nextcloud migrations gèrent `ALTER TABLE` / `RENAME` — voir pattern existant
> dans `lib/Db/LibraryMapper::ensureTableExists()` (qui utilise `CREATE TABLE IF NOT EXISTS`).

### 3.2 Entités

**`Library`** (`lib/Db/Library.php`) — renommer `userId` → `ownerUid` :
- `getOwnerUid(): ?string` / `setOwnerUid(?string)` — nullable.
- Supprimer `getUserId()` / `setUserId()` ou les garder comme alias deprecated.

**`Collection`** (`lib/Db/Collection.php`) — idem :
- `getUserId()` → `getOwnerUid()` — nullable.

---

## 4. Changements backend — `PageController`

### 4.1 Lectures — ouvertes à tous les users authentifiés

```php
// listLibraries() — PageController.php:1686
// AVANT : $this->libraryMapper->findByUserId($userId)
// APRÈS : $this->libraryMapper->findAll()  → toutes les libraries

// listCollections() — PageController.php:1803
// AVANT : $this->collectionMapper->findByLibraryId($libraryId, $userId)
// APRÈS : $this->collectionMapper->findByLibraryId($libraryId)  → toutes les collections d'une library
```

Nouveau mapper : `LibraryMapper::findAll(): Library[]` (supprimer le filtre `user_id`).

```php
// CollectionMapper::findByLibraryId(int $libraryId): array — sans $userId
```

### 4.2 Management — `@AdminRequired`

```php
// createLibrary — PageController.php:1713
//   @NoAdminRequired → @AdminRequired
//   setUserId($uid) → setOwnerUid($uid)

// updateLibrary — PageController.php:1746
//   find($id, $userId) → find($id)  (sans user_id scope)
//   @NoAdminRequired → @AdminRequired

// deleteLibrary — PageController.php:1781
//   find($id, $userId) → find($id)
//   @NoAdminRequired → @AdminRequired

// createCollection — PageController.php:1836
//   @NoAdminRequired → @AdminRequired
//   vérifier que la library existe ET appartient à un admin (ou juste existe)

// updateCollection / deleteCollection — idem
```

> Le `@AdminRequired` annotation est **déjà importée** dans le controller
> (`PageController.php:12` → `use OCP\AppFramework\Annotation\AdminRequired`).
> Nextcloud gère le check serveur (403 automatique si non-admin).

### 4.3 Scan — qui peut lancer un scan ?

`scanFolder()` (`PageController.php:658`) lit les fichiers du user courant via
`getUserFolder($uid)`. Dans le modèle partagé :

- **L'admin** scanne un dossier partagé → les `file_path` stockés dans
  `collection.rules.files` sont des chemins relatifs au **dossier partagé**.
- **Les users** lisent ces mêmes chemins → Nextcloud résout le partage
  automatiquement via `getUserFolder` (le fichier apparaît dans leur folder
  tant qu'il est partagé).

> ✅ Aucun changement backend nécessaire pour le scan — Nextcloud gère la visibilité
> des fichiers partagés. Le `file_path` dans `rules.files` est relatif à la racine
> utilisateur (`/docs/Akira.pdf`) et résolu via `getUserFolder` pour chaque user.

### 4.4 Covers — déjà transutilisateurs

`CoverService::getCover()` (`SPEC-auto-covers §3.1`) calcule le hash sur
`sourcePath . mtime . size` — **indépendant du user**. Un seul cover generé
est réutilisé par tous. Aucun changement → **compatible nativement**.

---

## 5. Changements frontend — `js/library.js`

### 5.1 Détection du rôle

Nextcloud ne expose pas directement `IUser::isAdmin()`. Le pattern robuste consiste
à calculer le flag dans le controller via `IGroupManager` (déjà disponible via DI)
et à le passer en paramètre du `EpubTemplateResponse` au rendu de la page
(`renderLibraryPage`, `PageController.php:112-139`) :

```php
// renderLibraryPage() — PageController.php:112-139
// IGroupManager injecté via le constructeur (PageController.php:44)
$uid = $this->userSession->getUser() ? $this->userSession->getUser()->getUID() : '';
$isAdmin = $uid !== '' && $this->groupManager->isAdmin($uid);

$response = new EpubTemplateResponse('renamer', 'reader', [
    'standalonePage' => true,
    'isAdmin'        => $isAdmin,        // ← NOUVEAU : exposé au template
]);
```

→ Le template `templates/reader.php` (1 ligne) lit `$isAdmin` et positionne
`data-isadmin="true|false"` sur le wrapper `#library-page` (`library.js:4-6`).
Le frontend (`init()`, `library.js:1614`) lit ce flag → `state.isAdmin`.

> ⚠️ `EpubTemplateResponse` (utilisé actuellement, `PageController.php:131`) expose
> les params comme variables PHP dans le template via `$this->fetch()` / les
> paramètres du constructeur. Ajouter `isAdmin` au tableau params est donc souple.

### 5.2 State (`library.js:9-19`)

```js
var state = {
    view: 'libraries',
    libraries: [],            // → maintenant contient TOUTES les libraries (filtré BE)
    currentLibrary: null,
    currentCollection: null,
    bookmarks: {},
    domCache: {},
    readerModal: null,
    allCollections: {},
    allFavorites: null,
    isAdmin: false,          // ← NOUVEAU : true si l'utilisateur est admin
    covers: null,            // ← lié à SPEC-auto-covers §5
    coversLoaded: false,
    coverWidth: 300,
    showManagement: false,  // ← NOUVEAU : true si l'utilisateur peut gérer (admin)
};
```

### 5.3 Conditional rendering des boutons de gestion

| Bouton | Ligne | Condition |
|---|---|---|
| `#lib-add-lib-btn` ("Ajouter une librairie") | 907 | `state.isAdmin === true` |
| `lib-delete-btn` (supprimer la library) | 966 | `state.isAdmin === true` |
| Bouton "Scanner un dossier" | 1631 | `state.isAdmin === true` (ou user propriétaire d'une collection) |

Exemple :
```js
// renderLibrariesContent — library.js:947-965
libs.forEach(function (lib) {
    ...
    card.innerHTML = ... + (state.isAdmin
        ? '<button class="lib-delete-btn" ...>×</button>'   // conservé
        : '');                                              // masqué
    ...
});

// renderLibrariesContent — library.js:902-911 (empty state)
// Bouton "Ajouter une librairie" → conditionné par state.isAdmin
```

### 5.4 UI "mode lecture seule"

Pour un **non-admin**, la Library page devient **enlecture seulement** :

- Pas de bouton "Ajouter une librairie" → empty state affiche un message
  d'information au lieu du bouton (`t('readOnly')` → "Administré par un administrateur").
- Pas de bouton `×` de suppression sur les library/collection cards.
- Les tomes sont **toujours cliquables** (ouverture du reader) → lecture normale.
- Les **progrès** et **favoris** (pages) restent pleinement fonctionnels (user-dependent).

```js
// library.js:902-911 — empty state
if (libs.length === 0) {
    container.innerHTML =
        '<div class="lib-empty">' +
            '<div style="font-size:28px;margin-bottom:8px;">📚</div>' +
            '<div class="lib-empty-msg">' + (state.isAdmin
                ? (t('empty') + '<br><button class="lib-btn lib-btn-primary" id="lib-add-lib-btn">' + t('addLibrary') + '</button>')
                : t('readOnlyHint')) + '</div>' +
            ...
        '</div>';
}
```

### 5.5 Sync du flag admin

```js
// init() — library.js:1614
function init() {
    injectStyles();
    renderShell();
    bind();
    // ← AJOUT : lire le flag depuis le DOM
    var pageRoot = document.getElementById('library-page');
    if (pageRoot) {
        state.isAdmin = pageRoot.dataset.isadmin === 'true';
    }
}
```

Template `reader.php` (`templates/reader.php`) — ajouter l'attribut :

```php
<div id="library-page" data-isadmin="<?= $isAdmin ? 'true' : 'false' ?>">
```

---

## 6. Impact sur les features existantes

| Feature | Impact | Action |
|---|---|---|
| Continuation lecture (`renderProgressRows`) | Aucun — déjà user-scoped (`state.bookmarks`) | ✅ Reste user-dependent |
| Favoris (`allFavorites`) | Aucun — déjà user-scoped | ✅ Reste user-dependent |
| Covers (`SPEC-auto-covers`) | Aucun — déjà transutilisateurs | ✅ Compatible |
| Scan dossier (`scanFolder`) | Aucun — admin scanne, users lisent via share | ✅ No change |
| Rename (onglet renamer) | Aucun — déjà user-scoped (`state.files`) | ✅ No change |
| Metadata (onglet metadata) | Aucun — déjà user-scoped | ✅ No change |
| `LibraryMapper::delete()` / `CollectionMapper::delete()` | Actuellement sans vérif user_id (`LibraryMapper.php:94`, `CollectionMapper.php:99`) — **bug latent** : un user peut delete une library d'un autre si `find()` n'est pas appelé avant | Corriger : passer `find($id, $uid)` dans delete (ou rendre delete `@AdminRequired` + `find($id)` sans scope) |

---

## 7. Migration — data existante

| Entité | Migration |
|---|---|
| Libraries créées par des users avant le changement | `user_id` → `owner_uid`. Ces libraries deviennent **partagées** par tous. L'admin devient le propriétaire logique. |
| Collections existantes | Idem : `user_id` → `owner_uid`. |
| Libraries orphelines (user_id d'un utilisateur supprimé) | Conservées — `owner_uid` peut être stale mais la library reste visible. L'admin peut la réclamer ou la supprimer. |

---

## 8. Mapping code — fichiers concernés

| Fichier | Ligne | Changement |
|---|---|---|
| `lib/Db/Library.php` | 14 | `userId` → `ownerUid` (nullable) |
| `lib/Db/Library.php` | 6,31 | `getFieldTypes()` : `userId` → `ownerUid`, nullable |
| `lib/Db/LibraryMapper.php` | 20,25 | `user_id NOT NULL` → `owner_uid VARCHAR(255) DEFAULT NULL` |
| `lib/Db/LibraryMapper.php` | 32-40 | `findByUserId($userId)` → `findAll()` |
| `lib/Db/LibraryMapper.php` | 42-56 | `find($id, $userId)` → `find($id)` (sans scope user) |
| `lib/Db/LibraryMapper.php` | 58-76 | `insert` : `setUserId` → `setOwnerUid` |
| `lib/Db/LibraryMapper.php` | 94-101 | `delete` : `find($id, $uid)` avant delete (security) |
| `lib/Db/Collection.php` | 16-18 | `userId` → `ownerUid` (nullable) |
| `lib/Db/CollectionMapper.php` | 21,23 | `user_id NOT NULL` → `owner_uid VARCHAR(255) DEFAULT NULL` |
| `lib/Db/CollectionMapper.php` | 33-42 | `findByLibraryId($libId, $userId)` → `findByLibraryId($libId)` |
| `lib/Db/CollectionMapper.php` | 44-58 | `find($id, $userId)` → `find($id)` |
| `lib/Db/CollectionMapper.php` | 60-80 | `insert` : `setUserId` → `setOwnerUid` |
| `lib/Db/CollectionMapper.php` | 99-106 | `delete` : `find($id, $uid)` avant delete |
| `lib/Controller/PageController.php` | 1686-1707 | `listLibraries` : `findByUserId` → `findAll` |
| `lib/Controller/PageController.php` | 1713-1740 | `createLibrary` : `@NoAdminRequired` → `@AdminRequired`, `setUserId` → `setOwnerUid` |
| `lib/Controller/PageController.php` | 1746-1775 | `updateLibrary` : `@AdminRequired`, `find($id)` |
| `lib/Controller/PageController.php` | 1781-1797 | `deleteLibrary` : `@AdminRequired`, `find($id)` |
| `lib/Controller/PageController.php` | 1803-1834 | `listCollections` : `findByLibraryId($libId)` (sans $uid) |
| `lib/Controller/PageController.php` | 1836-1871 | `createCollection` : `@AdminRequired`, `find($id, $uid)` (ligne 1848) → `find($id)` (juste vérifier l'existence de la library) |
| `lib/Controller/PageController.php` | 1877-1909 | `updateCollection` : `@AdminRequired`, `find($id)` |
| `lib/Controller/PageController.php` | 1915-1931 | `deleteCollection` : `@AdminRequired`, `find($id)` |
| `lib/Controller/PageController.php` | 12, 29 | `@AdminRequired` est **déjà importé** (ligne 12) mais inutilisé — appliquer sur les endpoints de management. `IGroupManager` **n'est pas encore importé** → ajouter `use OCP\IGroupManager;` |
| `lib/Controller/PageController.php` | 44 | Ajouter `IGroupManager $groupManager` au constructeur + `$this->groupManager = $groupManager` |
| `lib/Controller/PageController.php` | 112-139 | `renderLibraryPage` : exposer `$isAdmin` au template via `EpubTemplateResponse` params |
| `templates/reader.php` | 1 | Ajouter `data-isadmin` sur `#library-page` (lu depuis le param du TemplateResponse) |
| `js/library.js` | 9-19 | Ajouter `isAdmin`, `covers`, `coversLoaded` à `state` |
| `js/library.js` | 293-295 | `loadLibraries` : pas de filtre user côté client (le BE le fait) |
| `js/library.js` | 902-911 | Empty state : condition `@lib-add-lib-btn` sur `state.isAdmin` |
| `js/library.js` | 907 | Bouton "Ajouter" → `state.isAdmin ? btn : readOnlyMsg` |
| `js/library.js` | 947-965 | Library cards : `state.isAdmin ? deleteBtn : ''` |
| `js/library.js` | 1614-1618 | `init()` : lire `data-isadmin` depuis le DOM |
| `js/library.js` | 1631 | Couvrir le scan button (`lib-scan-btn` dans `renderShell`) → admin-only |

---

## 9. Phasage

| Phase | Tâche | Priorité |
|---|---|---|
| 1 | Migration DB `user_id` → `owner_uid` (nullable) + entités | Haute |
| 2 | `LibraryMapper::findAll()` + `find($id)` sans scope | Haute |
| 3 | `CollectionMapper::findByLibraryId($id)` + `find($id)` sans scope | Haute |
| 4 | `@AdminRequired` sur create/update/delete (libs + collections) | Haute |
| 5 | `IGroupManager` injecté + `data-isadmin` exposé au template | Haute |
| 6 | Frontend : `state.isAdmin` + conditional button rendering | Haute |
| 7 | `delete()` sécurisé (find avant delete) — fix bug latent | Moyenne |
| 8 | Covers bulk (`/api/covers/list`) — lien avec SPEC-auto-covers §4 | Haute |
| 9 | Tests : user standard voit les libs, ne peut pas les modifier | Haute |

---

## 10. Contraintes AGENTS.md (vérifier avant chaque implémentation)

- ❌ Préfixe identifiants : garder `lib-` pour le reader (existant), `cover-` pour le nouveau.
- ❌ Commentaires FR / code EN / pas de `//`.
- ❌ Pas de changement d'API sans update front **et inverse**.
- ❌ Ne pas casser l'onglet `renamer` / `metadata`.
- ✅ `php -l lib/Controller/PageController.php`, `php -l lib/Db/LibraryMapper.php`,
  `php -l lib/Db/CollectionMapper.php`, `node --check js/library.js` avant "fini".
- ✅ Log → `/var/www/nextcloud-data/nextcloud.log`, prefix `[reader-shared]`.

---

## 11. Open questions (à valider)

### Q1 — Un "owner" unique par library, ou multi-admin ?

Actuellement la RBAC ne distingue que `admin` vs `not-admin`. Une library est
propriété d'**un seul** admin (le créateur → `owner_uid`). Proposer un modèle
**multi-admin** (table de jointure `renamer_library_admins`) ou rester simple
admin-unique ?

> **Recommandation :** rester simple pour la v1 — **tout admin** peut gérer
> **toutes** les libraries. Le `owner_uid` sert uniquement d'audit. Pas de table
> de jointure tant que le besoin multi-admin n'est pas exprimé.

### Q2 — Quid des libraries "perso" existantes ?

Un utilisateur A avait créé une library privée avant le changement. Après migration,
elle devient **partagée** et visible par tout le monde. Est-ce souhaité ou faut-il
garder une notion de "library privée" (scope user) ?

> **Recommandation :** migration **tout en partagé**. C'est exactement ce que
> l'utilisateur a demandé ("une bibliothèque une fois pour tous"). Les users
> peuvent créer des favoris/progression personnelle dessus. Si un besoin de
> privacy individuelle émerge, ajouter un flag `is_public` (default true) plus tard.

### Q3 — Le bouton "Scanner" est admin-only, mais qui scanne concrètement ?

Le scan (`scanFolder` → `PageController.php:658`) utilise `getUserFolder($uid)`
du **demandeur**. Donc seul un admin peut scanner. Si l'admin scanne un dossier
partagé, les `file_path` dans `collection.rules` sont des chemins relatifs à la
racine de **l'admin**. Les autres users les résolvent via leurs propres
`getUserFolder` tant que le dossier est partagé en lecture.

> **Vérrier :** s'assurer que les `file_path` scannés sont des chemins relatifs
> à la racine Nextcloud (ex: `/docs/Akira.pdf`), **pas** des chemins absolus ou
> admins-only. Le code actuel (`scanFolder.php:708`) produit bien
> `'path' => '/' . ltrim($childRelPath, '/')` → ✅ relatif, compatible share.

### Q4 — Comment le frontend sait-il qu'un tome n'est pas accessible (403 fichier) ?

Un user standard peut voir une library/collection dans la liste, mais un tome
n'est pas partagé en lecture → `getUserFolder->get($path)` lève une exception.
Le frontend doit gérer le 403/404 élégamment.

> **Recommandation :** le endpoint `/api/covers/list` (`SPEC-auto-covers §4`)
> renvoie `"missing"` (paths sans cover) et le rendu tome affiche l'emoji
> placeholder si le fichier n'est pas accessible. Le reader (`renderReading`)
> affichera un toast d'erreur "fichier non accessible" si le blob échoue.

### Q5 — Lien avec SPEC-auto-covers

La feature de covers repose sur l'endpoint `GET /api/covers/{path}` qui résout
le fichier via `getUserFolder($uid)` du **demandeur**. Donc :
- Un admin génère le cover (ou un quelconque user le déclenche en premier).
- Le cover est **mis en cache transutilisateur** (hash identique).
- Les users suivants **servent le cover depuis le cache** → **aucun accès
  au fichier source n'est requis** pour lire le cover.

> ✅ C'est exactement le comportement souhaité : un user qui n'a pas accès au
> fichier peut quand même **voir le cover** (qui a été généré par un user
> disposant des droits). Cela décorrelle l'affichage du cover du droit de
> lecture du fichier.
