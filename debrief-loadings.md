# Debrief charges / chargement de données — renamer (bibliothèque)

Status : **état des lieux** + **objectif cible** + **causes racines** + **plan d'attaque** +
**implémenté (P0)**.

Scope : page bibliothèque `/apps/renamer/library` (`js/library.js`), avec le
soutènement de l'onglet lecteur embarqué (`js/tabs/reader/app-reader.js`,
`js/tabs/pdf/reader.js`) et du core (`js/app.js`). Focus sur les navigulations
**accueil / favoris / bibliothèques** et sur le **chargement vers un tome**
(deep-link URL ou navigation collection → tome).

---

## 0. Objectif cible (celui vers lequel on converge)

> Si on a une URL vers un tome, on ne doit charger en amont que ce qui est
> **nécessaire** — et surtout **pas** charger successivement « accueil →
> bibliothèque → collection → tome ».

→ Une navigation/URL finale (`?read=<tome>`, `?collection=<col>`,
`?library=<id>&collection=<id>[&read=]`) atteint la vue cible **en un seul
round-trip** (endpoint `/api/reader/resolve`) + un fetch de blob, avec :
- **zéro requête intermédiaire inutile** (plus de fan-out N collections avant d'avoir trouvé la bonne),
- **annulation** des requêtes obsolètes (`AbortController`),
- **garde-stale** (`navigationEpoch`) pour rejeter les réponses tardives,
- **cache** (`collectionsByLib`, `covers`) + **skeletons** (P1).

---

## 1. Endpoints backend (`appinfo/routes.php` + `PageController.php`)

| Endpoint | Verbe | Controller | Coût | Notes |
|---|---|---|---|---|
| `/api/reader/libraries` | GET | `listLibraries` | Léger | id/name/desc/userId. |
| `/api/reader/collections?libraryId=` | GET | `listCollections` | Lourd | TOUTES les collections + `rules` (arbre fichiers complet). |
| `/api/reader/resolve?...` | GET | `resolveReader` (2364) | **1 appel ciblé** | NOUVEAU — voir §6. |
| `/api/reader/progress/read` | POST | `readProgressPost` (1297) | Bulk | `{path:{type,value,total,lastAccessed}}` keyé **sans** slash initial. |
| `/api/covers/list` | POST | `coversList` (2628) | Bulk | `{covers:{path:url}, missing:[path]}` keyé **avec** slash initial (raw `f.path`). |
| `/api/reader/favorites/list` | GET | — | Léger | Favoris utilisateur. |
| `/api/reader/scan` | POST | `scanFolder` | Léger | (re)scan FS → arbre. |
| `/api/files/read` | GET | `reader.js:renderReader` (248) | **Gros blob** tome/epub. |

Forme du `collection.rules` : **nœud unique** `{folder, files:[], children:[]}`
(stocke par `rescanLibrary`/`rescanCollection`, `PageController.php:1056-1077` →
`setRulesArray($rules)` avec `['folder','files','children']`). Le client le consomme
via `collectAllFiles` (1588) / `getCollectionRoot` → `collectAllFiles` /
`findTomeByPath` (3471). Le `path` des fichiers est normalisé **avec slash
initial** (`scanFolderRecursive`, `PageController.php:934 : '/'.ltrim(...)`),
et `readProgress` ltrime avant lookup (`PageController.php:1244`).

---

## 2. Scénarios — Avant (N+1 / racing / successifs)

### 2.1 Deep-link `?read=<path>` **sans** library/collection
`handleUrlParams` ancien (fan-out) :
1. `loadLibraries` → 1 GET `/libraries`.
2. `forEach` sur **toutes** les bibliothèques, chaque `loadCollections(lib.id)` lancé **en parallèle** qui écrase le buffer partagé `state.collections` (race).
3. Parcours de `state.collections` (d'une *autre* bibliothèque à cause de la course) pour `findTomeByPath` / `findImageTomeInCollection`.
4. `loadBookmarksForTome` → 1 POST `/progress/read`.
5. `renderReading` → GET blob tome.

→ **N+2 requêtes**, lancées sans annulation, **N collections en parallèle se
marchent sur les pieds** → tomes parfois manquants/disparus, résultats qui varient
d'un clic à l'autre. C'est l'essence du « chargement successif home→bib→col→tome ».

### 2.2 Deep-link `?collection=<id>` sans library
Même anti-pattern : `forEach` + `loadCollections` parallèle + recherche de la
collection dans `state.collections`empoisonné.

### 2.3 Deep-link `?library=X&collection=Y&read=Z`
3 round-trips (libraries → collections[lib] → progress) ; aucun loading spinner.

### 2.4 Accueil / home (`renderLibrariesContent`, 2999)
- `loadLibraries` → 1 GET.
- `forEach` bibliothèque → `loadCollections` parallèle (race `state.collections`).
- `renderProgressCards` (3075) → 1 POST `/progress/read` **tous les tomes**.
- `loadCoversBulk` (564) → 1 POST `/covers/list`.
→ 1 + N + 1 + 1, N en concurrence. `loadLibraries` (1630-1632) reset force
`state.covers={}`/`coversLoaded=false` à chaque appel → refetch affiches.

### 2.5 Favoris (`renderFavoritesView`, 3637)
`loadAllCollections` (3578) → N GET collections parallèles (bien séparées dans
`state.allCollections[libId]`, **pas de race**). Puis `loadReaderFavoritesList`.
Plus cohérent, mais toujours N appels et **rien n'est cache** → refetch complet.

### 2.6 Bibliothèque → collection → tomes (clic normal)
Seul chemin « propre » (1 collection fetch), mais recommence à zéro
(`loadLibraries` reset covers) et **aucun skeleton** → `container.innerHTML=''`
blanc clignotant.

---

## 3. Causes racines

1. **Race sur `state.collections`** : `loadCollections` (1659) écrit le buffer
   partagé `state.collections` à chaque appel ; les parallélismes du home et du
   deep-link `read`-seul/ `collection`-seul s'entre-écrasent.
2. **Pas d'annulation** : `apiRequest` (632) accepte `signal`, mais
   `loadCollections`/`loadLibraries`/`loadBookmarks*`/`loadCoversBulk` n'en
   passent jamais → réponses tardives qui clobberent `state`.
3. **Pas de résolution ciblée serveur** : **aucun endpoint chemin→bibliothèque/
   collection/tome** → le client doit fouiller *toutes* les collections
   (cause du fan-out N+1).
4. **Redondance** : `loadBookmarksForCollection` (3543) et `loadBookmarksForTome`
   (3550) sont identiques ; la home relit la progression de TOUTES les
   collections.
5. **Pas de cache client** entre navigations ; reset force `state.covers={}`.
6. **Pas de feedback visuel** : `render()` (3250) / `renderCollections` (2921) /
   `renderTomes` (2583) vident `lib-content` sans skeleton ; le seul loader est
   le toast de lecture (`reader.js:19`, blob tome uniquement).

---

## 4. Plan d'attaque (priorités)

- **P0 implémenté — résolution ciblée serveur** : endpoint `/api/reader/resolve`
  (§6) qui localise collection+library(+matched file) + bundled progress+covers en
  **1 appel**. Client : `resolveReader` (3325) + `renderDeepLink` (3386).
  → deep-link `?read=` / `?collection=` = **1 appel + 1 blob** (vs N+2).
- P0 annulation + garde-stale : `AbortController` + `navigationEpoch`.
- P1 cache client + skeletons.
- P2 nettoyer `loadBookmarksForTome`/`loadBookmarksForCollection`/`findImageTomeInCollection`
  (orphelins après §6), mémoriser la liste des tomes pour le changement de tome.

---

## 5. Cartographie ligne par ligne (courant)

Client (`js/library.js`) :
- `apiRequest` : 632 (supporte `signal` ; pas de cache par défaut).
- `loadLibraries` : 1632-1656 (reset force `state.covers={}`/`coversLoaded=false`, 1630-1632).
- `loadCollections` : 1659-1675 (écrit le buffer racy `state.collections` 1666).
- `collectAllFiles` : 1588-1599.
- `enrichFileEntries` : 2223-2247 (enrichit tome/tomes, trie).
- `renderTomes` : 2583-2731.
- `renderCollections` : 2921-2997.
- `renderProgressCards` : 3075-3144 ; fan-out `loadCoversBulk` + POST progress (2999-3074).
- `render()` : 3250-3274 (`innerHTML=''` sans loader).
- **`resolveReader`** : 3325 (nouveau).
- **`renderDeepLink`** : 3386 (nouveau).
- `handleUrlParams` : 3421-3469 (refait — deep-link → 1 appel `resolveReader`).
- `findTomeByPath` : 3471 ; `findImageTomeNodeByFolder` : 3485.
- `loadBookmarksForPaths` : 3557 (déjà `paths` → POST `/progress/read`).
- `loadAllCollections` : 3578 (favorites).
- `loadReaderFavoritesList` : 3603.
- `renderFavoritesView` : 3637.
- `tomeLabelFor` : 2732 ; `findMissingTomes` : 2815 (tome-range `9-13` implémenté).
- `app-reader.js` : `loadLibraries`/`loadCollections` ~464/478 ; `loadProgress` ~815 ; `render` ~851.
- `app.js` : `apiRequest` 1356 (log systématique 1359).

Backend (`lib/Controller/PageController.php`) :
- `listLibraries` : 2201 ; `listCollections` : 2318 ; `coversList` : 2628 ;
  `readProgress`/`readProgressPost` : 1240/1297.
- **`resolveReader`** : 2364 ; helpers `locateCollection` 2508, `findFileInRules` 2527,
  `findImageNodeByFolder` 2550, `flattenRulesFiles` 2573, `libraryEntry` 2477,
  `collectionEntry` 2488.
- Routes (`appinfo/routes.php`) : `listLibraries`~176, `listCollections`~201,
  **`resolveReader`**~211 (GET `/api/reader/resolve`), `coversList`~257.
- `CollectionMapper::findByLibraryId` : 38 ; `LibraryMapper::find/all` : `lib/Db/LibraryMapper.php`.
- `ReadingProgressMapper::findByUserAndPaths` : 63.

---

## 6. Implémenté (P0 — résolution ciblée)

### 6.1 Endpoint serveur
`GET /api/reader/resolve?read=<path>&library=<id>&collection=<id>&width=<px>`
(`PageController::resolveReader`, 2364 ; route `page#resolveReader`).

Résolution serveur (early-return) :
- `collection` donné → `CollectionMapper::find` + `LibraryMapper::find(col.libraryId)`.
- `library` (+ éventuellement `read`/`collection`) → `findByLibraryId(lib)` +
  `locateCollection` qui scanne **cette** bibliothèque.
- `read` seul → scanne **toutes** les bibliothèques (`findAll` + `findByLibraryId`
  par lib) jusqu'au match → early-return.

Réponse (1 seul round-trip) :
```
{ success, found, libraries, library, collection:{id,libraryId,name,description,userId,rules,createdAt,updatedAt},
  matchedLibraryId, matchedCollectionId,
  progress: { <pathSansSlash> : {type,value,total,lastAccessed} },   // keyage serveur = readProgress
  covers:  { <pathAvecSlash>   : <relativeUrl> }                     // keyage = f.path (coversList)
}
```
- `progress` keyé **sans slash** (identique à `readProgress`), `covers` keyé **avec
  slash** (identique à `coversList`/`.rules[].path`).
- `libraries` renvoyée à chaque appel (side nav), évitant un 2ᵉ appel `loadLibraries`.

### 6.2 Client (`js/library.js`)
- `resolveReader(opts, cb)` (3325) : lance `GET /api/reader/resolve` avec
  `AbortController`; annule la précédente; incrémente `navigationEpoch`; rejette les
  réponses stales (`epoch !== state.navigationEpoch`) et les `AbortError`.
- Applique l'état en une passe : `state.libraries`, `currentLibrary`,
  `currentCollection` + `state.collections=[col]` + `collectionsByLib` (cache),
  `enrichFileEntries(col.rules)` (tome/tomes), merge `progress`→`state.bookmarks`
  (`'/' + path`) et `covers`→`state.covers` (+`coversLoaded=true`).
- `renderDeepLink(readPath, colId)` (3386) : ré-utilise `findTomeByPath`
  (3471) / `findImageTomeNodeByFolder` (3485) **sur la collection ciblée** (plus de
  scan multi-bibliothèques → plus de race), puis `renderReading`/`renderReadingImages`
  / `renderTomes` — sans aucun appel réseau supplémentaire.
- `handleUrlParams` (3421) refait :
  - `?view=favorites` → inchangé (`loadAllCollections`, racing-free).
  - home `/libraries` → inchangé (`loadLibraries`).
  - `?library=X` (pas collection/read) → vue collections : `loadLibraries`→
    `loadCollections(lib.id)` (1 fetch ciblé, pas de fan-out).
  - **sinon** (`?collection=` et/ou `?read=`/ou `?library=+?collection=`) → **un
    seul** `resolveReader` → `renderDeepLink`.

### 6.3 Comptes de requêtes (après P0)
| Navigation | Avant | Après |
|---|---|---|
| `?read=<tome>` | 1 + N × collections (racing) + 1 progress + 1 covers + 1 blob | **1 resolve + 1 blob** |
| `?collection=<id>` | 1 + N × collections (racing) + 1 progress + 1 covers | **1 resolve** (+ blob si ouverture lecture) |
| `?library=X&collection=Y[&read=Z]` | 1 lib + 1 col + 1 progress + 1 covers [+ blob] | **1 resolve** (+ blob) |
| clic lib → collections | 1 + 1 | 1 + 1 (inchangé, déjà minimal) |
| home | 1 + N (racing) + 1 + 1 | inchangé (1 + N + 1 + 1) — P1/P2 |
| favoris | 1 + N + 1 | inchangé (racing-free) — P1 cache |

→ Le deep-link tome passe de **N+2/N+3 appels successifs/racés** à **1 appel + blob**,
avec annulation + garde-stale. Le fan-out `state.collections` de la home/favoris est
traité en P1 (cache + cancellation), hors scope du « URL vers un tome ».

### 6.4 Validations
- `php -l appinfo/routes.php` / `PageController.php` / `MetadataService.php` / `PdfService.php` → OK.
- `node --check js/library.js` / `js/app.js` / `js/app-pdf.js` → OK.

---

## Annexe A — Parsing des tomes groupés (`9-13`) — *implémenté*

Contexte : les fichiers bundle (`Serie - Tome 9-13.cbz`) ne couvraient
qu'un seul numéro (`9`) → `findMissingTomes` signalait `10,11,12,13` comme
manquants. Fix dans `js/library.js` :

- `parseNumberRange(s)` (47) → étend `9-13` en `[9,10,11,12,13]`.
- `parseFilename` (63) : `volumeRange`/`chapterRange`; `volume`/`chapter` au min
  (compat `sortFiles`, §3.3 SPEC-scan-tomes-chapitres.md).
- `parseScanEntry` (106) + `enrichFileEntries` (2223) → `f.tomes` (liste complète).
- `findMissingTomes` (2815) → ensemble présent = toute la plage → 10-13 non manquants.
- `tomeLabelFor` (2732) → affiche `Tome 9-13` (renderTomeCard 2743, etc.).

`stripRulesForBackend` (2219) n'exporte que `{path,name,tome,type,size,mtime,pages,displayTitle}`
→ **aucun changement de schéma DB / routes** ; la plage est re-dérivée côté
client. `node --check js/library.js` OK.
