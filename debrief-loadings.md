# Debrief charges / chargement de données — renamer (bibliothèque)

Scope : page bibliothèque `/apps/renamer/library` (fichier `js/library.js`) et, en
soutènement, l'onglet lecteur embarqué (`js/tabs/reader/app-reader.js`) +
`js/app.js`. Focus sur les scénarios **accueil / favoris / bibliothèques** et sur
le **chargement vers un tome** (deep link ou navigation collection → tome).

## 1. Architecture des appels backend (ce que le front tire)

Endpoints réellement utilisés par la bibliothèque (`appinfo/routes.php` 170-259) :

| Endpoint | Verbe | Où | Note |
|---|---|---|---|
| `/api/reader/libraries` | GET | `loadLibraries()` (library.js:1245) | Liste les bibliothèques (id,name,desc,userId). Léger. |
| `/api/reader/collections?libraryId=X` | GET | `loadCollections()` (library.js:1267) | Retourne **les collections + leurs `rules` (arbre fichiers complet)**. C'est le lourd : 1 requête par bibliothèque. |
| `/api/reader/progress/read` | POST | `loadBookmarksForPaths()` (library.js:2871), `renderProgressCards()` (library.js:2365) | Envoie la liste **de tous les chemins** de tomes d'une collection (ou de toutes collections) pour récupérer la progression. |
| `/api/covers/list` | POST | `loadCoversBulk()` (library.js:416) | Bulk d'affiches (base64/data URL) pour tous les tomes d'une vue. |
| `/api/reader/scan` | POST | `createLibrary()` (library.js:1603) | Scan de création. |
| `/api/reader/favorites/list` | GET | `loadReaderFavoritesList()` (library.js:2916) | Favoris utilisateur. |

Deux implémentations parallèles de "reader" :
- `js/library.js` → page bibliothèque standalone (`/apps/renamer/library`) : vues
  `home`/`libraries` ↔ `collection` ↔ `tomes` ↔ `reading` + `favorites`.
- `js/tabs/reader/app-reader.js` → onglet lecteur dans la modale principale
  (`js/app.js`) : vues `libraries` ↔ `collection` ↔ `scanned` ↔ `reading`.

## 2. Scénarios de chargement et points d'entrée

### 2.1 Accueil / "mes bibliothèques" (`renderLibrariesContent`, library.js:2280)
Déclenché depuis `loadLibraries()` (library.js:1254) ou le clic home de la sidebar
(bind, library.js:3144).

Cascade d'appels **pour chaque bibliothèque** (library.js:2316-2337) :
1. `loadLibraries()` → **1 GET `/api/reader/libraries`**.
2. Pour chaque librairie : `loadCollections(lib.id)` → **N GET `/api/reader/collections`**
   (N = nb de bibliothèques), lancés **en parallèle** (`forEach` synchrone) puis
   `enrichFileEntries` (parsing côté client).
3. `renderProgressCards(continueList, progPaths)` (library.js:2329) → **1 POST
   `/api/reader/progress/read`** avec *tous les chemins de tous les tomes de
   toutes les collections*.
4. `loadCoversBulk(allTomePaths)` (library.js:2332) → **1 POST `/api/covers/list`**
   avec tous les chemins de tomes.

### 2.2 Favoris (`renderFavoritesView`, library.js:2949)
Déclenché par le clic favoris (bind, library.js:3144 → `render()`).
1. `loadAllCollections()` (library.js:2890) → **N GET `/api/reader/collections`**
   (parallèles, mais stockés dans `state.allCollections[lib.id]` — là c'est OK,
   pas de buffer partagé).
2. `loadReaderFavoritesList()` → **1 GET `/api/reader/favorites/list`**.
3. `findLibraryCollectionForPath` pour chaque favori → **0 appel réseau** mais
   parsing client lourd sur l'arbre des collections.

### 2.3 Collection → tomes (`renderLibraryCards` → `renderCollections` → `renderTomes`)
- Clic sur une bibliothèque (library.js:2497) → `loadCollections(lib.id)` (1 GET)
  → `renderCollections` (library.js:2211) → **1 POST `/api/covers/list`** si
  `!state.coversLoaded` (library.js:2266).
- Clic sur une collection (library.js:2240) → `renderTomes(col)` (library.js:1935)
  → **1 POST `/api/covers/list`** si `!state.coversLoaded` (library.js:2016).

### 2.4 Vers un tome / lecture (`renderReading`, library.js:1682)
- Clic tome (renderTomeCard, library.js:2096) → `renderReading(f)` →
  `RenamerReader.renderReader(ctx, filePath, readerBox)` (reader.js:248).
- `renderReader` (reader.js:248) : fetch du blob du fichier (`GET /api/files/read`
  pour epub, `fetchFileBlob` pour cbz, conversion synchrone CBR→CBZ
  `POST /api/reader/convert-cbr`). C'est le **gros téléchargement réel**.
- La progression lecture est récupérée en amont (loadBookmarks*) pour afficher le
  badge "page X/Y" / "✓ lu" sur la card.

## 3. Le cas "chargement vers un tome" (deep link) — le plus cassant

`handleUrlParams` (library.js:2591) décortique l'URL (`view/library/collection/read/node`).

### 3.1 Deep link `?read=<tome>` SANS library/collection (library.js:2723-2778)
Flux :
1. `loadLibraries(cb)` → render sidebar/breadcrumb.
2. `cb` → **pour chaque bibliothèque, `loadCollections(lib.id, cb)` lancé en
   parallèle dans une boucle `forEach`** (library.js:2730-2778).
3. À chaque résolution, parcours de `state.collections` pour
   `findTomeByPath` / `findImageTomeInCollection` jusqu'au tome trouvé.
4. `loadBookmarksForTome` (→ POST progress/read) → `renderReading`.

👉 Résultat : **on recharge d'abord les bibliothèques (accueil), puis les
collections de *toutes* les bibliothèques une par une, puis enfin le tome.**
C'est exactement la cascade "accueil → collection → tome" que vous décrivez.
Et c'est O(N) en nombre de bibliothèques au lieu d'une cible connue.

### 3.2 Deep link `?collection=<col>` SANS library (library.js:2678-2722)
Même pattern : boucle `forEach` sur toutes les bibliothèques, `loadCollections`
parallèle, recherche de la collection dans `state.collections`.

### 3.3 Deep link `?library=X&collection=Y&read=Z` (library.js:2617-2677)
Plus ciblé : `loadLibraries` → `loadCollections(lib.id)` →
`loadBookmarksForCollection` → `renderTomes`/`renderReading`. Mais il y a
quand-même **2 appels réseau + 1 POST progress** au lieu d'un seul endpoint
agrégé.

## 4. Causes racines (pourquoi c'est "très moche" et "inconsistant")

### 4.1 Race condition sur `state.collections` (PRINCIPAL)
`loadCollections` (library.js:1266-1283) **écrit sur le buffer partagé
`state.collections`** à chaque appel :

```js
state.collections = data.collections || [];   // library.js:1269
```

Dans `renderLibrariesContent` (home), le clic deep-link `read`/`collection`
sans library, et le deep-link `read` seul, plusieurs `loadCollections` sont
lancés **en parallèle** et écrasent mutuellement `state.collections`. Le
dernier résolu l'emporte. Les callbacks qui suivent (`cb`) lisent alors
`state.collections`, qui peut correspondre à **une autre bibliothèque** →
tomes manquants, mauvaise collection affichée, résultats qui varient d'un clic
à l'autre. D'où l'**inconstance** et les **clics inséparés**.

Le code contredit même le commentaire (library.js:2318-2320) : une snapshot
`collectionsByLib` est bien conservée, mais **`state.collections` reste
partagé** et est utilisé juste au-dessus par `renderProgressCards`/recherche.

### 4.2 Pas d'annulation des requêtes (cancellation)
`apiRequest` (library.js:449-468) accepte `options.signal` mais
`loadCollections`/`loadLibraries`/`loadBookmarksForPaths` **n'en passent
jamais**. Un double-clic / navigation rapide laisse des requêtes en vol qui se
résolvent *après* le nouveau rendu et **clobberent l'état** → clics
inséparés. Même constat dans `app.js` (`apiRequest` 1356-1386, pas de
cancellation) et `app-reader.js` (`loadLibraries`/464, `loadCollections`/478).

### 4.3 Redondance / fan-out d'appels
- Home : `loadCollections` pour chaque bibliothèque + POST progress/read avec
  **tous** les tomes + POST covers/list avec **tous** les tomes. 3 gros
  batches pour une vue qui ne fait que lister les bibliothèques au topo.
- `loadBookmarksForCollection` (library.js:2855) et `loadBookmarksForTome`
  (library.js:2862) sont **identiques** (délèguent tous deux à
  `loadBookmarksForPaths`) — code dupliqué.
- La progression est relue **séparément** de chaque collection (`renderProgressCards`
  relit pour "continuer la lecture" alors que `loadBookmarksForTome` a déjà
  chargé la progression de la collection courante).

### 4.4 Pas de cache côté client (re-fetch systématique)
- Pas de cache des collections par `libraryId` (hormis la snapshot
  `collectionsByLib` reconstruite à chaque home, et `allCollections` réservé au
  favoris).
- `renderCollections` → `renderTomes` → covers : le bulk covers est refetché
  (re)joué dans presque toutes les vues.
- `loadLibraries()` (library.js:1241-1242) **réinitialise à chaque appel**
  `state.covers = {}` et `state.coversLoaded = false` → force le re-fetch des
  affiches même si on naviguait déjà dans une collection.
- `apiRequest` (library.js:449 et app.js:1356) : **aucun cache HTTP/mémoire**,
  requête brute à chaque fois. app.js ajoute un `console.log` de chaque appel
  (library.js:1359) — bruit de log en plus.

### 4.5 Pas d'indicateur de chargement (le "moche" visuel)
- Les vues navigation (home/collection/tomes) font un `container.innerHTML = ''`
  (render library.js:2528, renderCollections library.js:2216, renderTomes
  library.js:1938) **sans loader / placeholder** → écran blanc clignotant pendant
  les appels.
- Le seul loader existant est le **toast de progression de lecture**
  (`renamer-reader-loading-toast`, reader.js:19-34) : timer + spinner, mais **rien
  pendant le listrage des collections**. C'est pourquoi le chargement "semble
  long/inconsistant" sans retour visible.
- `renderLibrariesContent` montre un placeholder texte "Aucune librairie" dès le
  départ (library.js:2287) avant même d'avoir reçu les données.

### 4.6 Lecteur embarqué (`app-reader.js`)
- `initPageMode` (app.js:6573) lance `loadLibraries` mais **pas `loadProgress`**
  directement (chargé uniquement via le listener folder-loaded, app.js:6591-6595
  → `ctx.loadProgress()` sans args = GET /api/reader/progress sans paths →
  renvoie tout).
- `app-reader.js` `loadCollections` (478) est correct (1 lib ciblé), mais le
  passage par `render()` puis `renderReading` → `window.RenamerReader.renderReader`
  n'a **aucun loader intermédiaire** tant que le blob du tome n'est pas chargé.

## 5. Recommandations concrètes (par priorité)

**P0 — Corriger la race condition (le + impact "inconsistance/clics bloquants")**
- Ne plus écrire les collections parallèles dans `state.collections`. Faire de
  `loadCollections` une fonction **ciblée** : `loadCollections(libId)` renvoie la
  liste et la stocke dans `state.collectionsByLib[libId]` (déjà existant), et ne
  touche `state.collections` que pour la vue courante *après* que le bon
  `libraryId` soit résolu.
- `handleUrlParams` : ne charger les collections que de la bibliothèque cible
  (déterminée depuis libId/colId/readPath via `collectionsByLib` ou, à défaut,
  itérer **séquentiellement** et s'arrêter dès que le tome est trouvé — abort du
  reste).

**P0 — Ajouter l'annulation (AbortController)**
- `apiRequest` et les `load*Collections` : accepter/`abort` les requêtes précédentes
  dès qu'une nouvelle navigation démarre. Invalider les réponses "stale"
  (vérifier un token/généré courant avant de muter `state`).

**P1 — Un endpoint agrégé serveur**
- Ajouter `GET /api/reader/libraries/collections` (ou `POST` avec `libraryIds`)
  qui renvoie ** toutes les collections de toutes les bibliothèques en un seul
  round-trip** (au lieu de N GET). À exploiter pour `home`, `favorites`, et le
  deep-link `read`-seul. Cela élimine le fan-out N+1.
- Regrouper `progress/read` + `covers/list` dans la même réponse endpoint, ou
  servir la progression/covers inline dans le listing des collections, pour éviter
  2-3 POST supplémentaires par vue.

**P1 — Cache côté client + invalidation ciblée**
- Cache `Map<libraryId, collections[]>` avec `coversByLib` et `bookmarksByCol`.
- Supprimer la remise à zéro `state.covers={}`/`coversLoaded=false` dans
  `loadLibraries` ; invalider seulement après un rescan/crUD collection.
- Faire tendre `apiRequest` (library.js:449 et app.js:1356) dans une couche
  `fetchJson` unique avec cache mémoire optionnel + debounce, et retirer le
  `console.log` systématique (app.js:1359) qui bruite la console.

**P2 — UX de chargement (loaders / placeholders)**
- Ajouter un **skeleton-loader** (placeholder cartes) dans `lib-content` dès le
  `innerHTML=''` des vues navigation (render, renderCollections, renderTomes),
  au lieu du blanc. Un indicateur spinner simple sur le bouton/sidebar "Chargement…".
- Garder le toast de lecture (`renamer-reader-loading-toast`) mais le déclencher
  **aussi** au listrage des collections, pas seulement au chargement du blob.

**P2 — Dédup des fetches de progression**
- `renderProgressCards` (home, library.js:2365) et `loadBookmarksForTome` relisent
  la progression séparément. Unifier : charger la progression une fois après le
  (bulk) collections, puis dériver les badges "continuer la lecture".

**P3 — Navigation tome précédent/suivant dans le viewer**
- `generic-viewer.js` (`switchToNextTome`/`switchToPrevTome`, 1612/1633) relit la
  collection pour retrouver le tome → si ce n'est pas caché client, ça déclenche
  un `loadCollections` + `loadBookmarksForTome` synchrone. Mettre la liste des
  tomes en cache dans l'overlay (`state.readerTomeList[collectionId]`) au moment
  de l'ouverture du tome pour éviter de re-fetcher.

## 6. Cartographie des lignes clés

- `apiRequest` (library.js:449-468) — pas de cache, pas de cancellation par défaut.
- `loadLibraries` (library.js:1239-1264) — reset forcé des covers à chaque appel.
- `loadCollections` (library.js:1266-1283) — **écrit le buffer partagé racy**.
- `loadBookmarksForCollection`/`loadBookmarksForTome` (library.js:2855-2867) —
  doublons.
- `renderLibrariesContent` (library.js:2280-2354) — fan-out `loadCollections` par
  bibliothèque (2316) + progress/read (2365) + covers (2332).
- `renderProgressCards` (library.js:2356-2424) — POST progress/read redondant.
- `renderTomes` (library.js:1935-2021) — relance `loadCoversBulk` + rerender.
- `renderCollections` (library.js:2211-2278) — relance `loadCoversBulk`.
- `handleUrlParams` (library.js:2591-2781) — deep-link `read`-seul (2723) et
  `collection`-seul (2678) itèrent toutes les bibliothèques.
- `render()` (library.js:2516-2540) — `innerHTML=''` sans loader.
- `app-reader.js` `loadLibraries`/`loadCollections` (464-490) — ok ciblé mais
  `renderReading` n'a pas de loader intermédiaire.
- `app.js` `apiRequest` (1356-1386) — log systématique (1359), pas de cache.
- `reader.js` `renderReader` (248) — seul vrai point de chargement du blob tome.
 - Routes backend (`appinfo/routes.php:170-259`) : listLibraries(176)/listCollections(201)/readProgressPost(171)/coversList(256).

---

## Annexe — Parsing des tomes groupés (`9-13`) — *implémenté*

Contexte : les fichiers bundle (ex. `Serie - Tome 9-13.cbz`) ne couvraient
qu'un seul numéro (`9`) → `findMissingTomes` signalait `10,11,12,13` comme
manquants. Fix appliqué dans `js/library.js` :

- `parseNumberRange(s)` (nouveau, library.js:47) : étend `minNumberFromRange` →
  `[9,10,11,12,13]` pour les plages d'entiers (garde le min sinon, compat).
- `parseFilename` expose `volumeRange`/`chapterRange` ; `volume`/`chapter` restent
  au min (compat `sortFiles` / §3.3 SPEC-scan-tomes-chapitres).
- `parseScanEntry` (~line 86) et `enrichFileEntries` (~line 1583) renseignent
  `f.tomes` (liste complète). `volume` reste au min pour le tri.
- `findMissingTomes` (library.js:~2169) construit l'ensemble présent à partir de
  **toute** la plage `f.tomes`, donc 10-13 ne sont plus "manquants".
- `tomeLabelFor(f)` (library.js:~2106) utilisé par `renderTomeCard` (2112),
  `renderProgressCard` (2462), `renderFavoriteCard` (3050) : affiche `Tome 9-13`
  au lieu de `Tome 9`.

Vérifié : `Tome 9-13` + `Tome 14` + `Tome 1` → `missing = [2..8]` (10-13 absents
du missing). `node --check js/library.js` OK. `stripRulesForBackend`
(library.js:1580) n'persist que `{path,name,tome,type,size,mtime,pages,displayTitle}`
→ **aucun changement de schéma DB**, la plage est re-dérivée côté client par
`enrichFileEntries` au chargement des collections.

Remarque : le scan backend (`PageController::classifyFilesForLibrary`,
PageController.php:689) n'est pas impacté — il ne parse pas le tome (spec v1,
`enrichFileEntries` JS reste l'unique source). Pas de route PHP ajoutée.

