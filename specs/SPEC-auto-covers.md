# SPEC-auto-covers.md — Génération/Récupération automatique des couvertures (covers)

> Objectif : générer **automatiquement** une couverture visuelle pour chaque entité
> (bibliothèque, collection, tome) dans l'onglet Reader, et la **partager entre tous
> les utilisateurs** (transutilisateur). Les progrès de lecture et les favoris
> restent, eux, **liés à chaque utilisateur** (déjà le cas aujourd'hui).
>
> **Lien connexe :** [SPEC-reader-shared.md](./SPEC-reader-shared.md) — définit le
> modèle RBAC (admin-owned libraries/collections, user-read) dont le reader partagé
> est le compagnon direct : covers transutilisateurs + progrès/favoris user-dependent.
>
> Contexte : aujourd'hui, `js/library.js` n'affiche que des **placeholders emoji**
> (`📚` pour les bibliothèques, `📁` pour les collections, `📄`/`🖼`/`📚`/`🗜` pour
> les tomes). Ce spec définit une architecture de génération + cache transutilisateur
> des covers, avec un fallback progressif par type de fichier.

---

## 1. Contexte & motivation

### 1.1 Vue d'ensemble du domaine

L'application `renamer` expose un onglet Reader (`js/library.js`) qui organise les
fichiers en 3 niveaux hiérarchiques :

```
Library  →  Collection  →  Tome (fichier)
   📚        📁           📄/🖼/📚/🗜
```

| Entité | Table DB | Données | Couverture aujourd'hui |
|---|---|---|---|
| Library | `renamer_libraries` | `id, user_id, name, description, created_at, updated_at` | Emoji `📚` (`library.js:951`) |
| Collection | `renamer_collections` | `id, library_id, user_id, name, description, rules, ...` | Emoji `📁` (`library.js:873`) |
| Tome | fichier utilisateur | `path, name, type, size, tome` | Emoji selon ext (`library.js:773-776`) |

### 1.2 Le contrainte transutilisateur

Les bibliothèques et collections sont **actuellement liées à un utilisateur**
(`user_id` dans les tables). Les tomes sont des fichiers Nextcloud qui, eux,
peuvent être partagés.

**Demande explicite :** les *covers* doivent être **transutilisateurs** (un seul
cache partagé, quel que soit l'utilisateur qui le génère), mais les *progrès de
lecture* (`renamer_reading_progress`, `state.bookmarks`) et les *favoris*
(`state.allFavorites`, `library.js:105`) restent **utilisateur-dépendants**.

### 1.3 Ce qui existe déjà (à réutiliser, pas réinventer)

| Composant | Fonction utile pour les covers | Chemin |
|---|---|---|
| `PdfService::renderPage()` | Rend une page PDF serveur-side via `pdftoppm` → `dataUrl` PNG | `lib/Service/Pdf/PdfService.php:525` |
| `PdfService::previewPdf()` | Rend toutes les pages PDF en miniatures JPEG | `PdfService.php:374` |
| `PdfService::convertToCbz()` | Pipe extraction `pdfimages` → pattern à réutiliser pour les images embedded PDF | `PdfService.php:44` |
| `MetadataService` | getID3 → extraction art intégré audio (mp3/flac/m4a) | `lib/Service/MetadataService.php:27` |
| `MetadataService` | ffmpeg pour M4A (art intégré + rendu) | `MetadataService.php` (ligne ~322) |
| `PageController::pdfPage` | Endpoint `GET /api/pdf/page` → `dataUrl` d'une page | `PageController.php:1055` |
| `PageController::fileBlob` | Endpoint binaire raw (`DataDisplayResponse`) | `PageController.php:560` |
| `CbzSource.load()` | JSZip liste les images d'un CBZ sans tout décompresser | `js/tabs/pdf/generic-viewer.js:535` |
| `PdfService::resolvePdfImages()` | Localise `pdfimages` | `PdfService.php:192` |
| `PdfService::resolvePdfToPpm()` | Localise `pdftoppm` | `PdfService.php:352` |
| `Utils::splitNameAndExt()` | Parse nom/ext | `lib/Service/Utils.php` |

### 1.4 Outils serveur disponibles (AGENTS.md)

| Outil | Statut | Usage couverture |
|---|---|---|
| `pdftoppm` (poppler) | ✅ `/usr/bin/pdftoppm` | Rendre 1ère page PDF |
| `pdfimages` (poppler) | ✅ installé | Extraire art intégré PDF |
| `pdfinfo` (poppler) | ✅ installé | Métadonnées PDF |
| PHP `ZipArchive` | ✅ | Extraire première image CBZ/CBR/RAR |
| PHP `GD` | ✅ | Resize + normalisation PNG/JPEG |
| PHP `Imagick` | ✅ (non portable) | Fallback optionnel |
| `ffmpeg` | ✅ (déjà dépendance M4A) | Art intégré/extrait M4A/MP4 |
| getID3 | ✅ (vendor) | Art intégré audio |
| `unrar` | ❓ optionnel | CBR extraction (fallback) |

---

## 2. Architecture du cache transutilisateur

### 2.1 Principe

Le cache des covers est **indépendant du `user_id`**. Une couverture est adressée
par un **hash stable du fichier source** :

```
hash = sha1( chemin_relatif + mtime + size )
```

> Pour les **tomes** : le fichier source est le fichier Nextcloud du tome.
> Pour les **collections** : le fichier source est le **fichier du tome qui a
> fourni la couverture** (héritée).
> Pour les **libraries** : idem, hérité du tome principal.

### 2.2 Storage candidate — comparaison

| Option | Principe | Avantages | Inconvénients | Verdict |
|---|---|---|---|---|
| **A — AppData folder** | `IRootFolder::get('/__covers__/')` ou `OCP\Files\GenericFileStorage` | Isolation, garbage-free, cross-user via appdata | Nextcloud `getAppDataFolder('renamer')` peut mapper sur un stockage non-local (S3) → `getLocalFile()` peut échouer → GD/Imagick pas disponible | **⚠ Primaire** — à valider que le stockage appdata est local |
| **B — Dossier data root** | `nextcloud-data/renamer-covers/` (hors user folder) | Toujours local, GD garanti | Path dépend de l'install; risque de cleanup par le gestionnaire de data Nextcloud | **⚠ Fallback** |
| **C — Table DB** | Table `renamer_covers` : `hash, path, cover_path, type, created_at, user_id=NULL` | Versionning, invalidation explicite par `updated_at` | Nécessite schema migration; la donnée binaire reste dans le FS | **✅ Complément de A/B** — métadonnées de cache en DB, blob sur FS |

**Décision :** combiner **A + C** :
- Le **blob** du cover est stocké sur le filesystem partagé (`appdata/{app}/covers/` ou fallback `nextcloud-data/renamer-covers/`).
- Les **métadonnées de cache** (`hash → cover_path, type, generated_at, source_path`) sont dans une nouvelle table `renamer_covers` (`user_id` = NULL → transutilisateur).
- À l'ouverture de la library page, le backend sert une table de mapping `{source_path_hash: cover_url}` et le frontend remplit un `Map` en mémoire (`state.covers`).

### 2.3 Invalidation

| Événement | Action |
|---|---|
| Le fichier source change (mtime/taille) | Hash change → regeneration forcée |
| Suppression d'un tome | `DELETE` de la row `renamer_covers` correspondant |
| Renommage d'un fichier | `UPDATE renamer_covers SET source_path=...` (le hash reste valide si le contenu est identique) |
| Purge manuelle admin | `DELETE FROM renamer_covers` + `unlink` des fichiers du dossier covers |
| Changement de library/collection | Le cover est recalculé à la volée (hérité du tome) — pas de persistance besoin |

### 2.4 Sécurité

- Les covers sont des **images publiques** (pas de contenu sensible).
- L'URL du cover passera par une route backend authentifiée (`OCP\IRequest`), jamais
  un lien direct vers le filesystem (évite l'escalade vers d'autres fichiers).

---

## 3. Stratégies de génération par type de fichier

### 3.1 Tomes (fichiers)

| Type fichier | Ext | Stratégie de génération (ordre priorité) | Fallback |
|---|---|---|---|
| PDF | pdf | 1. `pdfimages -list -png` → 1ère image embedded<br>2. `pdftoppm -png -f 1 -l 1 -scale-to 300` → 1ère page | `pdftohtml`/`pdftoppm` fallback déjà existant (`PdfService::renderPage`) |
| Bande dessin emaillée | cbz | 1. `ZipArchive` → 1ère image (jpg/png/gif/webp) triée (`CbzSource.load` `generic-viewer.js:544-550`) | Placeholder |
| Archive RAR | cbr/rar | 1. `ZipArchive` (si .cbr est en fait un zip) → 1ère image<br>2. `unrar` (optionnel) → extraction | Placeholder |
| E-book | epub | 1. Parser le `.opf` → `<meta property="cover">` ou `<link rel="coverImage">` → extractor image<br>2. Sinon 1ère image du zip | Placeholder |
| Image | jpg/jpeg/png/gif/webp | 1. GD : load + crop center + resize | Placeholder |
| Audio | mp3/flac/ogg/opus/wav | 1. getID3 → art intégré (`MetadataService` getID3) | Placeholder |
| Vidéo | mp4/m4a/mkv | 1. ffmpeg → 1ère frame ou art intégré (`MetadataService` ligne ~322) | Placeholder |
| Autre | — | Placeholder couleur unie | — |

#### 3.1.1 Pipeline serveur (PHP) — `CoverService`

Nouvelle classe `OCA\Renamer\Service\CoverService` (enregistrée dans `Application.php`
comme `PdfService`) :

```php
namespace OCA\Renamer\Service;

class CoverService {
    // Constructeur : IRootFolder, IUserSession, IDBConnection, LoggerInterface,
    //    MetadataService, PdfService, Utils

    /**
     * Génère (ou récupère le cache) du cover pour un fichier source.
     * Cross-user : user_id=NULL en DB.
     *
     * @param string $sourcePath  chemin relatif utilisateur (ex: "/docs/Akira v01.pdf")
     * @param array  $options     { width: int (300), height: int, force: bool }
     * @return array{success: bool, coverUrl?: string, coverDataUrl?: string, cached: bool, error?: string}
     */
    public function getCover(string $sourcePath, array $options = []): array {}

    /**
     * Génère le cover depuis le fichier, type par type.
     */
    private function generateForFile(Node $node, string $ext, int $width): array {}

    private function makePdfCover(File $node, string $path, int $width): ?string {}  // pdftoppm/pdfimages
    private function makeCbzCover(File $node, string $path, int $width): ?string {}  // ZipArchive
    private function makeEpubCover(File $node, string $path, int $width): ?string {} // OPF parser
    private function makeImageCover(File $node, string $path, int $width): ?string {} // GD resize
    private function makeAudioCover(File $node, string $path, int $width): ?string {} // getID3
    private function makeVideoCover(File $node, string $path, int $width): ?string {} // ffmpeg

    /**
     * Calcule le cover agrégé d'une collection/bibliothèque depuis la première
     * image de couverture de ses tomes.
     */
    public function getAggregateCover(array $tomePaths, int $width): ?string {}
}
```

##### Flux `getCover($sourcePath, $options)`

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Résoudre le chemin utilisateur → Node (rootFolder->getUserFolder) │
├─ 2. Calculer le hash stable : sha1(sourcePath . mtime . size)   │
├─ 3. Vérifier le cache DB (renamer_covers WHERE hash=?)         │
│   ├─ HIT  → servir le fichier coverUrl (200, 304 si If-Modified)   │
│   └─ MISS → passer à l'étape 4                                  │
├─ 4. generateForFile() selon l'extension                      │
│   ├─ pdftoppm / pdfimages / ZipArchive / getID3 / ffmpeg / GD  │
│   └─ Normaliser : resize GD → JPEG quality 80, width=300px   │
├─ 5. Sauvegarder sur le FS partagé (appdata/renamer/covers/)    │
├─ 6. Persister en DB (renamer_covers, user_id=NULL)            │
└─ 7. Retourner l'URL publique du cover                          │
```

> **Note cross-user :** l'accès au fichier source se fait via
> `IRootFolder::getUserFolder($uid)` (le **demandeur**), mais le **cache**
> (`renamer_covers`, dossier appdata) est partagé. Un utilisateur B peut
> réutiliser le cover généré par A sans relire le fichier source (le hash
> est basé sur le chemin + mtime + size, qui sont identiques quel que soit
> l'utilisateur tant que le fichier est le même — *cf. § 6 open questions*).

#### 3.1.2 Extraction PDF détaillée

```php
private function makePdfCover(File $node, string $path, int $width): ?string {
    $srcPath = $this->resolveSourceFilePath($node); // PdfService.php:28
    $tmpDir  = $this->mkTempDir();

    // Stratégie 1 : image embarquée (pdfimages -list)
    $bin  = $this->resolvePdfImages(); // PdfService.php:192
    $cmd  = escapeshellcmd($bin) . ' -list -png ' . escapeshellarg($srcPath);
    // parse stdout → première image avec 'image' dans la colonne "type"
    //   pdfimages -png <pdf> <prefix> → extract la 1ère image embedded

    // Stratégie 2 : rendre la page 1 (pdftoppm) — réutilise PdfService::renderPage()
    //   $this->pdfService->renderPage($path, 1, $width) → return dataUrl
    //   → decode dataUrl → GD resize → save JPEG

    return $this->normalizeToJpeg($rawImagePath, $width);
}
```

#### 3.1.3 Extraction CBZ détaillée

Réutilise la logique client `CbzSource.load()` (`generic-viewer.js:544-550`) mais
côté serveur en PHP :

```php
private function makeCbzCover(File $node, string $path, int $width): ?string {
    $srcPath = $this->resolveSourceFilePath($node);
    $zip = new \ZipArchive();
    if ($zip->open($srcPath) !== true) return null; // ouvrant possiblement CBR en zip
    $entries = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $name)) $entries[] = $name;
    }
    sort($entries);
    if (empty($entries)) { $zip->close(); return null; }
    $first = $zip->getFromName($entries[0]); // raw image bytes
    $zip->close();
    return $this->normalizeToJpegFromBlob($first, $width);
}
```

#### 3.1.4 Extraction EPUB détaillée

```php
private function makeEpubCover(File $node, string $path, int $width): ?string {
    // EPUB = ZIP. Parser le .opf pour trouver la couverture.
    $zip = new \ZipArchive();
    $zip->open($this->resolveSourceFilePath($node));
    $opfPath = null;
    $entries = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entries[] = $zip->getNameIndex($i);
        if (preg_match('/\.opf$/', $zip->getNameIndex($i))) $opfPath = $zip->getNameIndex($i);
    }
    if (!$opfPath) return null;

    $opf = $zip->getFromName($opfPath);
    // 1. <meta property="covr" content="..."/>  (EPUB 3)
    // 2. <meta name="cover" content="..."/>   (EPUB 2)
    // 3. <link rel="coverImage" href="..."/>
    // → résoudre le href relatif → $zip->getFromName($resolved)
    // → normalizeToJpegFromBlob()
}
```

#### 3.1.5 Extraction audio (getID3)

`MetadataService` utilise déjà getID3 (`MetadataService.php:27`). Ajouter une
méthode `getEmbeddedCover($path): ?string` qui retourne un `dataUrl` du
premier art intégré (`['comments']['picture'][0]['data']`).

#### 3.1.6 Extraction vidéo (ffmpeg)

`MetadataService` utilise déjà ffmpeg (`MetadataService.php:~322`). Ajouter :

```bash
ffmpeg -i <file> -an -vframes 1 -s 300x<auto> <tmp>.jpg
```

ou extraire l'art intégré via `ffmpeg -i <file> -an -vcodec copy`.

### 3.2 Collections & Bibliothèques (héritage)

Une collection/library **n'a pas de fichier source direct**. Son cover est
dérivé du **premier tome** de sa règle `files[]`.

| Entité | Source du cover | Logique |
|---|---|---|
| Collection | `collection.rules.files[0].path` | `CoverService::getCover(files[0])` → si échec, fallback au `files[1]`, etc. |
| Library | `collection[0].rules.files[0].path` | Itération sur les collections de la library jusqu'à trouver un tome coverable |

> **UI :** si aucun tome n'a de cover générable, le cover de fallback reste
> l'emoji actuel (`📁` / `📚`). Pas de placeholder couleur figé — garder l'emoji
> existant comme dernier recours (cohérent avec l'UI actuelle `library.js`).

---

## 4. Endpoints backend

| Méthode | Route | Controller | Description |
|---|---|---|---|
| `GET` | `/api/covers/{path}` | `PageController::cover()` | Cover d'un **tome**. Param `?path=...&width=300`. Serre une image JPEG (Content-Type + cache headers). 304 si unchanged. |
| `GET` | `/api/covers/collection/{libraryId}/{collectionId}` | `PageController::coverCollection()` | Cover agrégé d'une collection. |
| `GET` | `/api/covers/library/{libraryId}` | `PageController::coverLibrary()` | Cover agrégé d'une bibliothèque. |
| `GET` | `/api/covers/list` | `PageController::coversList()` | **Bulk :** pour tous les tomes listés dans la library page, renvoie `{ sourcePathHash: coverUrl }` en une seule requête (évite N appels individuels au rendu). |
| `POST` | `/api/covers/regenerate` | `PageController::coversRegenerate()` | Force la régénération (admin ou "Rafraîchir"). Body `{ paths: [...], force: true }`. |

> Convention routes `routes.php` : utilise le prefixe existant `api/covers`,
> verb `GET` (lecture) / `POST` (action). `@NoCSRFRequired` comme le reste.

### 4.1 Exemple de réponse — `GET /api/covers/{path}?path=/docs/Akira.pdf&width=300`

```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=86400       ← 24h côté client
ETag: "<hash>"
Vary: Accept-Encoding
Content-Length: 4523
```

→ Corps binaire JPEG. Si `If-None-Match` correspond → `304 Not Modified`.

### 4.2 Exemple de réponse — `GET /api/covers/list`

```json
{
  "success": true,
  "covers": {
    "/docs/Akira v01.pdf": "/index.php/apps/renamer/api/covers/docs%2FAkira%20v01.pdf?width=300",
    "/docs/Akira v02.pdf": "/index.php/apps/renamer/api/covers/docs%2FAkira%20v02.pdf?width=300"
  },
  "missing": ["/docs/Berlin.pdf"]   ← pas de cover générable → garder emoji
}
```

---

## 5. Frontend — `js/library.js`

### 5.1 État (`state`)

Ajouter à l'objet `state` existants (`library.js`):

```js
state.covers = null;          // Map<cheminSource, urlCover> — bulké par /api/covers/list
state.coversLoaded = false;    // true après le premier bulk
state.coverWidth = 300;        // taille rendue (px)
```

### 5.2 Rendu — remplacement des emoji

#### Library card (`renderLibrariesContent`, `library.js:947-965`)

Avant (ligne 951) :
```js
'<div class="lib-icon">📚</div>'
```

Après (proposé) :
```js
'<div class="lib-icon lib-icon-img" style="background-image:url(\'' + coverUrl + '\')" data-path="' + lib.id + '">📚</div>'
```

> `coverUrl` provient de `state.covers` (bulké). Si absent → emoji (fallback).

#### Collection card (`renderCollections`, `library.js:868-888`)

Avant (ligne 873) :
```js
'<div class="lib-icon">📁</div>'
```

Après :
```js
'<div class="lib-icon lib-icon-img" style="background-image:url(\'' + colCoverUrl + '\')" data-path="col:' + col.id + '">📁</div>'
```

#### Tome rows (`renderTomes`, `library.js:751-832`)

Avant (ligne 778) :
```js
'<span style="font-size:20px;width:24px;text-align:center;">' + icon + '</span>'
```

Après :
```js
'<span class="lib-tome-cover" style="width:48px;height:64px;background-image:url(\'' + tomeCoverUrl + '\')" title="' + escapeHtml(f.name) + '">' + icon + '</span>'
```

> Le fallback emoji reste **dans** le `<span>` (visible si l'image échoue à charger
> via CSS `background-image` + emoji en texte).

### 5.3 CSS (à ajouter dans `injectStyles()` ou `css/app.css`)

```css
.lib-icon-img, .lib-tome-cover {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 4px;
}
.lib-icon-img {
    font-size: 24px;
}
.lib-tome-cover {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    opacity: 0.5;            /* emoji visible sous l'image */
}
.lib-tome-cover[style*="url("] {
    opacity: 1;              /* image chargée → emoji masqué */
}
```

### 5.4 Chargement paresseux des covers (lazy load)

Le bulk `/api/covers/list` peut être lourd si la library a des milliers de tomes.
Stratégie hybride :

1. **Au render initial** : appeler `/api/covers/list` une fois (couvre les covers
   agrégés library/collection + les tomes visibles).
2. **Lazy load des tomes** : dans `renderTomes()`, les `<span class="lib-tome-cover">`
   utilisent **l'URL directe** du cover (pas de dataUrl). Le navigateur fait du lazy
   loading natif via l'image de background — pas de JS nécessaire.
3. **IntersectionObserver optionnel** : si la library a > 100 tomes, charger les
   covers par "page" au scroll.

> Le bulk `list` évite le *thundering herd* de N appels `GET /api/covers/{path}`.

---

## 6. Table DB — `renamer_covers`

### 6.1 Schéma (migration `migrations/...`)

```sql
CREATE TABLE renamer_covers (
    hash          VARCHAR(40)  NOT NULL PRIMARY KEY,   -- sha1(sourcePath . mtime . size)
    source_path   VARCHAR(512) NOT NULL,               -- chemin relatif du tome source (ex: /docs/Akira.pdf)
    source_mtime  INTEGER      NOT NULL,               -- mtime au moment du cache
    source_size   INTEGER      NOT NULL,               -- size au moment du cache
    cover_path    VARCHAR(512) NOT NULL,               -- chemin relatif dans le FS partagé (appdata/renamer/covers/<hash>.jpg)
    entity_type   VARCHAR(20)  NOT NULL DEFAULT 'tome', -- 'tome' | 'collection' | 'library'
    entity_id     INTEGER      NULL,                   -- id de la collection/library (NULL pour tome)
    width         INTEGER      NOT NULL DEFAULT 300,
    generated_by  VARCHAR(64)  NULL,                   -- user_id qui a généré (audit)
    created_at    INTEGER      NOT NULL,               -- unix timestamp
    updated_at    INTEGER      NOT NULL,               -- unix timestamp
    INDEX idx_source (source_path),
    INDEX idx_entity (entity_type, entity_id)
)
```

### 6.2 Mapper — `CoverMapper`

Nouveau mapper `lib/Db/CoverMapper.php` suivant le pattern `QBMapper` existant
(`LibraryMapper`, `CollectionMapper`) :

```php
namespace OCA\Renamer\Db;

use OCP\IDBConnection;
use OCP\AppFramework\Db\QBMapper;

class CoverMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_covers', Cover::class);
    }

    public function ensureTableExists(): void {
        $this->db->runDeferredSchemaNeedUpdate();
    }

    public function findByHash(string $hash): ?Cover {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')->from($this->getTable())
           ->where($qb->expr()->eq('hash', $qb->createPositionalParam($hash)));
        return $this->findOneOptional($qb);
    }

    public function findBySourcePath(string $path): ?Cover {
        // pour invalidation quand le fichier change de nom
    }

    public function deleteByHash(string $hash): int {
        // ...
    }
}
```

> `ensureTableExists()` suit le pattern déjà utilisé par d'autres mappers du projet
> (`renamer_libraries`, `renamer_collections` via `ensureTableExists`).

---

## 7. Open questions (à valider avec l'utilisateur)

### Q1 — Comment calculer le hash source cross-user ?

Le hash `sha1(sourcePath . mtime . size)` repose sur le **chemin relatif**.
Dans Nextcloud, le chemin relatif (`/docs/Akira.pdf`) est **le même quel que
soit l'utilisateur** si le fichier est partagé via un dossier partagé commun.

**Mais** : si le fichier n'est pas partagé (chaque utilisateur a sa propre copie),
alors le `sourcePath` diffère selon l'utilisateur → le hash diffère → **pas de
partage réel**.

| Cas | Comportement |
|---|---|
| Fichier **partagé** (Shared folder / monté dans 2 user folders) | ✅ Même path → même hash → cover partagé |
| Fichier **personnel** | ❌ Hash diffère → 2 covers générés (1 par user) — coût doublé mais correct |

**Proposition :** garder le hash basé sur `sourcePath . mtime . size`. Le
partage transutilisateur fonctionne **automatiquement** pour les fichiers dans
des dossiers partagés (le cas d'usage principal : une library/collection partagée).
Pour les fichiers personnels, chaque utilisateur génère son propre cover (c'est
acceptable — l'espace disque est le seul coût, pas un bug fonctionnel).

**À valider :** est-ce que le hash doit aussi incorporer le `user_id` du
propriétaire du fichier (pas du demandeur), ou reste-t-il basé uniquement sur
le path relatif + contenu ? → **Recommandation : path relatif + contenu (mtime+size).**

### Q2 — Où stocker physiquement le dossier covers ?

| Option | Dossier | Pros | Cons |
|---|---|---|---|
| AppData folder | `OCP\Files\IRootFolder` → `getAppDataFolder('renamer')` | Standard NC | Peut être non-local (S3) → GD/Imagick échoue |
| Data root fixe | `nextcloud-data/renamer-covers/` | Toujours local | Path fragile |
| Temp dir + cache FS | `sys_get_temp_dir()/renamer-covers/` | Simple | Nettoyé au reboot → regeneration |

**Recommandation :** AppData folder comme primaire (`appdata://renamer/covers/`),
avec fallback sur temp dir si le stockage appdata n'est pas local. L'important
est que le **dossier soit partagé entre utilisateurs** — le `appdata` NC l'est
par défaut.

> Vérifier à l'implémentation si `AppData::getFolder()` / `IRootFolder` expose
> le appdata partagé ou si faut passer par `OCP\Files\IRootFolder::get('renamer')`
> dans le home directory (`/apps/renamer/`).

### Q3 — Taille des covers ?

- **Library/Collection :** 300×450 px (format portrait carré-ish, comme les éditeurs de mangas).
- **Tome row :** 48×64 px (thumbnail dans la liste).
- **Normalisation serveur :** toujours générer le **300×450** et laisser le browser **downscale**.
  Mieux vaut 1 image générée qu'une par taille.

**À valider :** 300×450 px ou 200×300 px (plus léger) ?

### Q4 — Mode "Rafraîchir les covers" utilisable par l'utilisateur ?

Proposition : un bouton `#lib-refresh-covers` dans le header de la Library page
qui déclenche `POST /api/covers/regenerate` pour tous les tomes de la library
courante. Utile quand un fichier a été remplacé par une version avec une
meilleure couverture.

### Q5 — Regenerer à la volée vs au scan ?

Le scan (`POST /api/reader/scan`, `library.js:1206`) parcourt les dossiers et
remplit les collections. **Proposition :** le scan génère **lazy** les covers
en arrière-plan (worker ou progressif), et le frontend les sert via le cache.
Pas de régénération bloquante à l'ouverture de la library.

---

## 8. Mapping code — fichiers concernés

| Fichier | Ligne | Rôle dans cette feature |
|---|---|---|
| `js/library.js` | 850-890 | `renderCollections` → remplacer `📁` par cover collect |
| `js/library.js` | 892-979 | `renderLibrariesContent` → remplacer `📚` par cover library |
| `js/library.js` | 751-832 | `renderTomes` → remplacer emoji tome par cover image |
| `js/library.js` | 105, 1058-1061, 1547-1550 | Fallbacks emoji (garder comme dernier recours) |
| `js/library.js` | 314-320 | `loadCollections` → appel `/api/reader/collections` (ajouter covers bulk) |
| `js/tabs/pdf/generic-viewer.js` | 219-412 | `PdfSource` → réutiliser `_fetchPage` / `state.pdfPageCache` pattern pour cover PDF |
| `js/tabs/pdf/generic-viewer.js` | 521-627 | `CbzSource` → réutiliser le zip listing pour cover CBZ |
| `lib/Db/CoverMapper.php` | (nouveau) | Nouveau mapper `QBMapper` pour `renamer_covers` |
| `lib/Db/Cover.php` | (nouveau) | Entité `Cover` (Entity) |
| `lib/Service/CoverService.php` | (nouveau) | Génération + cache covers (pdfimages/pdftoppm/ZipArchive/getID3/ffmpeg/GD) |
| `lib/Service/Pdf/PdfService.php` | 525 | `renderPage()` — réutilisable pour cover PDF page 1 |
| `lib/Service/Pdf/PdfService.php` | 192 | `resolvePdfImages()` — pour art embedded PDF |
| `lib/Service/MetadataService.php` | 27 | getID3 — extension pour art intégré audio |
| `lib/Service/MetadataService.php` | ~322 | ffmpeg — extension pour art intégré vidéo |
| `lib/Controller/PageController.php` | 1055 | `pdfPage()` — pattern d'endpoint à copier pour `cover()` |
| `lib/Controller/PageController.php` | 560 | `fileBlob()` — pattern binaire (DataDisplayResponse) |
| `lib/AppInfo/Application.php` | 82-89 | DI registration `PdfService` — pattern à copier pour `CoverService` |
| `appinfo/routes.php` | 231-234 | `page#pdfPage` — pattern de route pour nouvelles routes covers |
| `appinfo/info.xml` | 13 | Description existante — mettre à jour pour mentionner le générateur de covers |

---

## 9. Phasage de implémentation

| Phase | Tâche | Scope | Priorité |
|---|---|---|---|
| P0 | **DB :** table `renamer_covers` + `CoverMapper` + entité `Cover` | migration schema + mapper | Haute |
| P0 | **Service :** `CoverService` squelette + `getCover()` + hash + cache lookup | `CoverService.php` | Haute |
| P1 | **PDF cover** : `makePdfCover` (pdftoppm page 1 + pdfimages embedded) | PdfService reuse | Haute |
| P2 | **CBZ/CBR cover** : `makeCbzCover` (ZipArchive) | ZipArchive | Moyenne |
| P3 | **EPUB cover** : OPF parser | ZipArchive + XML | Moyenne |
| P4 | **Image cover** : GD resize | GD (php déjà dispo) | Moyenne |
| P5 | **Audio cover** : getID3 art intégré | MetadataService | Moyenne |
| P6 | **Video cover** : ffmpeg frame | MetadataService | Basse |
| P7 | **Backend routes** : `/api/covers/{path}`, `/api/covers/list`, `/api/covers/regenerate` | PageController | Haute |
| P8 | **Frontend** : bulk covers load + remplacement emoji dans `renderTomes`/`renderCollections`/`renderLibrariesContent` | `library.js` | Haute |
| P9 | **Aggregate covers** : library/collection héritent du tome | CoverService::getAggregateCover | Moyenne |
| P10 | **CSS** : `.lib-tome-cover` / `.lib-icon-img` + fallback | `injectStyles()` / css | Basse |

---

## 10. Contraintes AGENTS.md (vérifier avant chaque implémentation)

- ❌ Préfixe identifiants : tous les nouveaux HTML ids/classes → `lib-` (existant)
  ou `cover-`. PHP namespace déjà `OCA\Renamer`.
- ❌ Commentaires : français dans les labels UI / commentaires, anglais dans le
  code PHP/JS.
- ❌ `//` comments en JS/PHP — **interdit** sauf demande explicite.
- ❌ Ne pas modifier `appinfo/info.xml` sans validation (documenter la dépendance
  poppler/gd/ffmpeg comme déjà fait pour PDF/CBZ).
- ❌ Ne pas casser l'onglet `metadata` / `advanced`.
- ✅ `php -l lib/Controller/PageController.php`, `php -l lib/Service/CoverService.php`,
  `node --check js/library.js` avant de répondre "fini".
- ✅ Log → `[errorCover]` prefix dans `/var/www/nextcloud-data/nextcloud.log`.

---

## 11. Décisions validées

| # | Question | Décision |
|---|---|---|
| 1 | Hash source | `sha1(sourcePath . mtime . size)` — path relatif + contenu |
| 2 | Storage covers | AppData folder `appdata://renamer/covers/` (cross-user), fallback temp dir |
| 3 | Table DB | `renamer_covers` (entity_type, entity_id nullable, user_id=NULL toujours) |
| 4 | Taille cover | 300px de large (server-side), browser downscale pour thumbnails |
| 5 | Fallback | Emoji existant gardé dans le DOM si image cover absente/échec |
| 6 | Format | JPEG (quality 80) — taille minimale, support universel |
| 7 | Cache headers | `Cache-Control: public, max-age=86400` + ETag |
| 8 | Lazy load | Bulk `/api/covers/list` à l'ouverture, images de background (lazy natif browser) |
| 9 | Accès au cover | Transutilisateur — **aucun accès au fichier source requis** si le cover est en cache (un user sans read access au tome peut quand même voir le cover généré par un autre). Décorrélé du droit de lecture fichier. Voir [SPEC-reader-shared.md](./SPEC-reader-shared.md) §Q5. |
