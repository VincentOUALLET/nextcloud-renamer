# SPEC-real-pdf.md — Lecteur de documents Nextcloud (PDF / CBZ / CBR / EPUB)

> Vision à terme : un "Netflix de lecture" pour Nextcloud — librairies, collections, progression de lecture par utilisateur, interface Kavita. Le tab actuel reste pour l'édition/rangement.

---

## TODO / Progression

| Phase | Tâche | Statut |
|-------|-------|--------|
| **Phase 1** | Tables DB `renamer_reading_progress`, `renamer_libraries`, `renamer_collections` | ✅ |
| **Phase 1** | Endpoints `/api/files/read`, `/api/files/info`, `/api/reader/scan`, `/api/reader/progress` (GET/POST) | ✅ |
| **Phase 1** | pdf.js intégré dans `lib/js/` | ✅ |
| **Phase 1** | `js/tabs/pdf/pdf-viewer.js` — rendu PDF basique | ✅ |
| **Phase 1** | `js/tabs/pdf/reader.js` — dispatcher par type | ✅ |
| **Phase 1** | `js/tabs/reader/app-reader.js` — tab lecteur skeleton | ✅ |
| **Phase 1** | Auto-save progression PDF | ✅ |
| **Phase 1** | State lecteur ajouté dans `app.js` | ✅ |
| **Phase 2** | Endpoints `/api/reader/libraries` + `/api/reader/collections` (CRUD) | ✅ |
| **Phase 2** | Routes PHP enregistrées dans `routes.php` | ✅ |
| **Phase 2** | `Application.php` — injection des mappers Library/Collection | ✅ |
| **Phase 2** | `app-reader.js` — UI librairies (grille) + collections + event handlers | ✅ |
| **Phase 2** | `app-reader.js` — loadLibraries / loadCollections / scanFolder helpers | ✅ |
| **Phase 2** | JSZip intégré dans `lib/js/` | ✅ |
| **Phase 3** | `js/tabs/pdf/cbz-viewer.js` — extraction + ComicViewer | ✅ |
| **Phase 3** | `js/tabs/pdf/image-viewer.js` — simple img viewer | ✅ |
| **Phase 3** | `reader.js` — dispatcher mis à jour pour CBZ/Image | ✅ |
| **Phase 3** | `PageController::index()` — chargement des libs JS (pdf.js, JSZip) | ✅ |
| **Phase 4** | `js/tabs/pdf/epub-viewer.js` — rendu + TOC + nav chapitres | ✅ |
| **Phase 4** | Vue "Continuer la lecture" (dans renderLibraries) | ✅ |
| **Phase 4** | Navigation clavier (flèches, Escape, F, +/- zoom) | ✅ |
| **Phase 4** | Download original (fonction downloadFile) | ✅ |
| **Phase 5** | CBR (unrar) — backend convertCbrToCbz + frontend dispatcher (option B fallback si unrar absent) | ✅ |
| **Phase 5** | Tests responsive | ❌ |
| **Phase 6** | Gérer erreurs encore présentes après la phase 4 LISTÉES EN DESSOUS et mettre à jour avec " ✅" quand fait  | ❌ |


Erreur 1: ❌
Erreur 2: ❌
Erreur 3: ❌
Erreur 4: ❌
Erreur 5: ❌

---

## 1. Ce qui est déjà fait (à garder)

### Onglet PDF actuel (`js/app-pdf.js`)
- **Tab PDF** avec colonne gauche (règles/actions) + colonne droite (preview) — layout OK
- **Conversion PDF → CBZ** via `PdfService::convertToCbz()` (backend) — utile pour compatibilité Kavita
- **Preview miniatures** via `PdfService::previewPdf()` (backend pdftoppm) — OK comme étape transitoire
- **Modal page** avec zoom, fit-mode, navigation clavier, plein écran — bon travail UI
- **Sélection fichiers / pages**, toggle-all, drag-to-reorder — OK

### À conserver impérativement
- Le système de tab (RenamerApp.registerTab) et state partagé
- Le layout 2 colonnes `.renamer-main`
- Le système de modale générique (`renamer-modal`)
- La conversion CBZ (utile pour compatibilité externe)
- Le système de sélection et drag-and-drop
- **Tout le tab PDF actuel** → il sert à **éditer/ranger** les PDF, il reste en place
- **Le tab Métadonnées** → inchangé, sert à éditer les métadonnées
- **L'onglet Renamer** (renommage) → inchangé

### À déprécier (remplacer par la nouvelle approche côté lecteur)
- `PdfService::previewPdf()` (pdftoppm) → remplacé par rendu client dans le futur tab lecteur
- `PdfService::renderPage()` (pdftoppm) → remplacé par rendu client dans le futur tab lecteur
- Tout appel API `/api/pdf/preview` et `/api/pdf/page` → remplacé par lecture JS directe dans le futur tab lecteur

---

## 2. Vision globale — Le vrai but

Créer un **lecteur de documents** intégré à Nextcloud, type Kavita, qui fonctionne comme un **Netflix de lecture** :

### 2.1 Fonctionnalités principales
- **Scan de dossiers** : l'utilisateur choisit 1+ dossiers à scanner → l'app découvre tous les PDF/CBZ/CBR/EPUB/images
- **Librairies** : regroupements logiques de collections (ex: "BD", "Roman", "Technique")
- **Collections** : sous-groupes dans une librairie (ex: dans "BD" → "Tintin", "Astérix", "Spirou")
- **Classification automatique** : par type de fichier, par dossier source, par règles utilisateur
- **Interface Kavita/Netflix** : couvertures en grille, navigation visuelle, découverte
- **Progression de lecture** : sauvegardée **par utilisateur Nextcloud** (page/chapitre pour PDF, % pour EPUB, page pour CBZ)
- **Reprise automatique** : à l'ouverture, on reprend là où on s'est arrêté
- **Lecteur intégré** : PDF (pdf.js), CBZ/CBR (JSZip + ComicViewer), EPUB (epub.js), Images (img viewer)

### 2.2 Architecture des onglets (à terme)

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar Nextcloud    │  Renamer (actuel)  │  Lecteur       │
│                       │                    │  (NOUVEAU)     │
│  - Renamer            │  Éditer/Ranger     │  Lire          │
│  - Métadonnées        │  PDF/CBZ/EPUB      │  Librairies    │
│  - (futur: Archives)  │  Conversion        │  Collections   │
│                       │  Métadonnées       │  Progression   │
│                       │                    │  Continuer     │
└─────────────────────────────────────────────────────────────┘
```

| Tab | Rôle | État |
|-----|------|------|
| **Renamer** | Renommer fichiers | ✅ Existant |
| **Métadonnées** | Éditer métadonnées | ✅ Existant |
| **PDF (actuel)** | Actions sur PDF (convert CBZ, preview) | ✅ Existant → reste |
| **Lecteur** | Lire documents (Kavita-like) | 🆕 À créer |
| **Archives** | Gérer/mettre à jour archives CBZ/CBR/EPUB | 🔮 Futur |

### 2.3 Principe clé
- **L'app actuelle (Renamer + Métadonnées + PDF actions)** reste telle quelle pour **éditer/ranger** les documents
- **Un nouveau tab Lecteur** est ajouté pour **lire** les documents avec l'interface Kavita
- **Les deux coexistent** : on range avec l'app actuelle, on lit avec le lecteur
- **À terme**, quand le lecteur sera mature, le layout actuel du tab PDF pourra être remplacé

---

## 3. Librairies JS à intégrer

| Librairie | URL | Usage | Format |
|-----------|-----|-------|--------|
| **pdf.js** | github.com/mozilla/pdf.js | Rendu PDF natif | PDF |
| **JSZip** | github.com/Stuk/jszip | Extraction archives | CBZ/CBR (zip) |
| **ComicViewer** | github.com/gmurphy/Comic-Reader | Défilement comic | CBZ/CBR |
| **epub.js** | github.com/futurepress/epub.js | Lecture EPUB | EPUB |
| **FileSaver.js** | github.com/eligrey/FileSaver.js | Download fichiers | Tous |

### Intégration
- Télécharger les builds minifiés dans `vendor/` ou charger via CDN
- `pdf.js` : `pdf.worker.min.js` + `pdf.min.js`
- `JSZip` : `jszip.min.js` (3.x)
- `epub.js` : `epub.min.js`
- Aucune dépendance npm/node — inclusion statique

---

## 4. Architecture — Nouvelle structure

### 4.1 Backend PHP — Rôle minimal

Le backend ne fait plus de traitement d'image. Il sert uniquement :

```php
// 1. Lister les fichiers d'un dossier (déjà existant)
POST /api/files/list → { files: [...], folders: [...] }

// 2. Servir le contenu brut d'un fichier (NOUVEAU)
GET /api/files/read?path=/dossier/fichier.pdf → base64 content
GET /api/files/read?path=/dossier/fichier.cbz → base64 content
GET /api/files/read?path=/dossier/book.epub → base64 content

// 3. Info rapide sur un fichier (NOUVEAU)
POST /api/files/info → { path, type, size, mtime }

// 4. Scanner un dossier et classer les documents (NOUVEAU)
POST /api/reader/scan → { path, recursive: true } → { files: [...], libraries: [...], collections: [...] }

// 5. Progression de lecture (NOUVEAU)
POST /api/reader/progress → { path, progress: { type, value, total, timestamp } }
GET /api/reader/progress?paths=... → { progress: { [path]: { type, value, total } } }

// 6. Librairies & Collections (NOUVEAU)
POST /api/reader/libraries → { name, description, folders: [...] } → crée une librairie
GET /api/reader/libraries → liste des librairies de l'utilisateur
POST /api/reader/collections → { libraryId, name, rules: [...] } → crée une collection
GET /api/reader/collections?libraryId=... → liste des collections

// 7. Garder la conversion CBZ (optionnel, pour compatibilité externe)
POST /api/pdf/convert-cbz → inchangé
```

#### Nouveau endpoint : `page#readFile`
```php
public function readFile(): Response {
    $path = $_GET['path'] ?? '';
    if ($path === '') return new DataResponse(['error' => 'No path'], 400);
    $user = $this->userSession->getUser();
    $uid = $user->getUID();
    $userFolder = $this->rootFolder->getUserFolder($uid);
    $node = $userFolder->get(ltrim($path, '/'));
    if (!$node instanceof File) return new DataResponse(['error' => 'Not a file'], 400);
    if (!$node->isReadable()) return new DataResponse(['error' => 'Not readable'], 403);
    $stream = $node->fopen('rb');
    $content = stream_get_contents($stream);
    fclose($stream);
    return new DataResponse(['content' => base64_encode($content)]);
}
```

#### Nouveau endpoint : `page#scanFolder`
```php
/**
 * Scanne récursivement un dossier et retourne tous les documents classables.
 * Ne fait AUCUN traitement lourd — juste liste les fichiers par type.
 */
public function scanFolder(): Response {
    $payload = json_decode(file_get_contents('php://input'), true);
    $path = ltrim((string)($payload['path'] ?? ''), '/');
    $recursive = (bool)($payload['recursive'] ?? true);
    
    $user = $this->userSession->getUser();
    $uid = $user->getUID();
    $userFolder = $this->rootFolder->getUserFolder($uid);
    $folder = $userFolder->get($path);
    if (!$folder instanceof \OCP\Files\Folder) {
        return new DataResponse(['error' => 'Not a folder'], 400);
    }
    
    $supportedExtensions = ['pdf', 'cbz', 'cbr', 'epub', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    $files = [];
    
    $iterator = $recursive
        ? $folder->getRecursiveIterator()
        : $folder->getDirectoryListing();
    
    foreach ($iterator as $node) {
        if ($node instanceof \OCP\Files\File) {
            $ext = strtolower(pathinfo($node->getName(), PATHINFO_EXTENSION));
            if (in_array($ext, $supportedExtensions)) {
                $files[] = [
                    'path' => ltrim($folder->getInternalPath() . '/' . $node->getName(), '/'),
                    'name' => $node->getName(),
                    'extension' => $ext,
                    'size' => $node->getSize(),
                    'mtime' => $node->getMTime(),
                ];
            }
        }
    }
    
    return new DataResponse(['success' => true, 'files' => $files]);
}
```

#### Nouveau endpoint : `page#saveProgress` / `page#readProgress`
```php
/**
 * Sauvegarde la progression de lecture d'un fichier pour l'utilisateur courant.
 * Body: { path: "...", type: "pdf|epub|cbz|image", value: 42, total: 100, timestamp: 1234567890 }
 */
public function saveProgress(): Response { ... }

/**
 * Récupère la progression de lecture pour une liste de fichiers.
 * Body: { paths: ["...", "..."] }
 * Retourne: { progress: { [path]: { type, value, total, timestamp } } }
 */
public function readProgress(): Response { ... }
```

#### Stockage de la progression
- Table `renamer_reading_progress` :
  - `user_id` (VARCHAR) — utilisateur Nextcloud
  - `file_path` (VARCHAR) — chemin du fichier
  - `progress_type` (ENUM: 'pdf_page', 'epub_percent', 'cbz_page', 'image_viewed')
  - `progress_value` (INT) — page actuelle / pourcentage
  - `progress_total` (INT) — total pages / 100
  - `last_accessed` (DATETIME)
  - UNIQUE KEY (`user_id`, `file_path`)

#### Nouveau endpoint : `page#manageLibraries` / `page#manageCollections`
```php
/**
 * Gestion des librairies et collections (CRUD simple).
 * Stockage dans la table renamer_libraries et renamer_collections.
 */
// Librairies : CRUD
POST /api/reader/libraries → créer
GET  /api/reader/libraries → lister
PUT  /api/reader/libraries/{id} → mettre à jour
DEL  /api/reader/libraries/{id} → supprimer

// Collections : CRUD (avec règles de classification automatique)
POST /api/reader/collections → créer (avec règles: extension, nom contient, dossier contient...)
GET  /api/reader/collections?libraryId=X → lister
PUT  /api/reader/collections/{id} → mettre à jour
DEL  /api/reader/collections/{id} → supprimer
```

### 4.2 Frontend JS — Structure des fichiers

```
js/
  app.js                  core (state, i18n, modal, registry)
  tabs/
    pdf/                  ← TAB ACTUEL (édition/rangement) — inchangé
      app-pdf.js          (reste tel quel)
      reader.js           NOUVEAU — moteur de rendu par type (utilisé par le futur tab lecteur)
      pdf-viewer.js       NOUVEAU — pdf.js wrapper (utilisé par le futur tab lecteur)
      cbz-viewer.js       NOUVEAU — CBZ/CBR via JSZip (utilisé par le futur tab lecteur)
      epub-viewer.js      NOUVEAU — epub.js wrapper (utilisé par le futur tab lecteur)
      image-viewer.js     NOUVEAU — simple img viewer (utilisé par le futur tab lecteur)
    reader/               ← TAB NOUVEAU (lecture Kavita-like)
      app-reader.js       auto-enregistre via RenamerApp.registerTab('reader', ...)
      reader-list.js      liste des documents classés par librairies/collections
      reader-detail.js    détail d'un document (couverture, métadonnées, progression)
      reader-modal.js     modale de lancement de lecture
    archives/             ← TAB FUTUR (gestion/update archives)
      app-archives.js     (à créer plus tard)
  lib/
    pdf.worker.min.js
    pdf.min.js
    jszip.min.js
    epub.min.js
```

### 4.3 Moteur de rendu `reader.js` (partagé)

```js
const READERS = {
    '.pdf':  { name: 'PDF',  render: renderPdf },
    '.cbz':  { name: 'CBZ',  render: renderCbz },
    '.cbr':  { name: 'CBR',  render: renderCbz },
    '.epub': { name: 'EPUB', render: renderEpub },
    '.jpg':  { name: 'IMAGE', render: renderImage },
    '.png':  { name: 'IMAGE', render: renderImage },
};

async function renderReader(ctx, filePath, container) {
    const ext = pathExt(filePath).toLowerCase();
    const reader = READERS[ext];
    if (!reader) {
        showToast(`Format non supporté: ${ext}`, 'error');
        return;
    }
    const data = await ctx.apiRequest(ctx.getBaseUrl() + '/api/files/read?path=' + encodeURIComponent(filePath));
    const blob = base64ToBlob(data.content, getMimeType(ext));
    return reader.render(blob, filePath, container);
}
```

---

## 5. Le Lecteur — Tab dédié (Kavita-like)

### 5.1 Vue d'ensemble

Le tab lecteur a 3 modes :
1. **Vue bibliothèque** — grille de librairies/collections avec couvertures
2. **Vue collection** — grille de documents dans une collection
3. **Vue lecture** — lecteur plein écran du document sélectionné

### 5.2 Vue bibliothèque (accueil)

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Rechercher...                              [⚙ Paramètres] │  Header
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📚 Vos Librairies                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 📖 BD    │ │ 📖 Roman │ │ 📖 Tech│ │ 📖 Manga│        │
│  │ 142 docs │ │  87 docs │ │  23 docs │ │  56 docs│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│  📂 Collections récentes                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ Tintin   │ │ Astérix  │ │ Spirou │                     │
│  │ 24 docs  │ │ 18 docs  │ │ 31 docs│                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                              │
│  🕐 Continuer la lecture                                     │
│  ┌──────────────────────────────────────────────┐            │
│  │ 📄 document.pdf — Page 42/120               │            │
│  │ 📄 comic.cbz — Page 15/48                   │            │
│  │ 📚 book.epub — 67%                          │            │
│  └──────────────────────────────────────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Vue collection (grille de documents)

```
┌──────────────────────────────────────────────────────────────┐
│  ← Librairies  📖 BD / Tintin                    [≡ Tri]    │  Header
├──────────────────────────────────────────────────────────────┤
│  🔍 Filtrer...  [Tous] [PDF] [CBZ] [EPUB] [Images]         │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │        │ │        │ │        │ │        │ │        │    │
│  │  📄    │ │  📄    │ │  📄    │ │  📄    │ │  📄    │    │
│  │ couv.  │ │ couv.  │ │ couv.  │ │ couv.  │ │ couv.  │    │
│  │        │ │        │ │        │ │        │ │        │    │
│  │ doc1   │ │ doc2   │ │ doc3   │ │ doc4   │ │ doc5   │    │
│  │ 42/120 │ │ 15/48  │ │ 67%    │ │ 1/30   │ │ 88/100 │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
│  ┌────────┐ ┌────────┐ ┌────────┐                          │
│  │        │ │        │ │        │                          │
│  │  📄    │ │  📄    │ │  📄    │                          │
│  │ couv.  │ │ couv.  │ │ couv.  │                          │
│  │        │ │        │ │        │                          │
│  │ doc6   │ │ doc7   │ │ doc8   │                          │
│  │ 12/50  │ │ 33/33  │ │ 5/200  │                          │
│  └────────┘ └────────┘ └────────┘                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.4 Vue lecture (plein écran)

```
┌──────────────────────────────────────────────────────────────┐
│  ← Retour  Titre du document    📥 Download  [⋯]  [F]       │  Header sticky
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│              ZONE DE LECTURE (canvas/epub/img)               │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [⟵]  Page 42/120  [⟶]  │  Zoom: [═══●══] 100%  [📑] [⚙] │  Footer nav
└──────────────────────────────────────────────────────────────┘
```

### 5.5 Progression de lecture

- **PDF** : page actuelle sauvegardée automatiquement toutes les 30s ou à chaque navigation
- **EPUB** : pourcentage de lecture (chapitre + position)
- **CBZ** : page actuelle
- **Image** : marqué comme "vu" au scroll
- **Auto-save** : sauvegarde automatique côté serveur via API
- **Reprise** : à l'ouverture d'une collection, les documents affichent "Continuer à la page X"
- **Par utilisateur** : chaque utilisateur Nextcloud a sa propre progression

---

## 6. Scan et classification

### 6.1 Scan de dossier

L'utilisateur choisit 1+ dossiers via le tab lecteur :
1. Clique "Scanner un dossier"
2. Choisit le dossier via Nextcloud file picker (ou saisit le chemin)
3. L'app scanne récursivement et découvre tous les documents supportés
4. Les documents sont affichés dans une liste temporaire avec leur type
5. L'utilisateur les classe manuellement ou par règles automatiques

### 6.2 Classification automatique

Règles de classification (configurables par l'utilisateur) :
- **Par extension** : PDF → Librairie "Documents", CBZ → Librairie "BD", EPUB → Librairie "Livres"
- **Par nom de dossier** : dossier "BD" → collection "BD", dossier "Roman" → collection "Roman"
- **Par nom de fichier** : contient "Tintin" → collection "Tintin"
- **Par règles personnalisées** : regex, mots-clés, etc.

### 6.3 Librairies et Collections

**Librairie** = grand regroupement (ex: "BD", "Roman", "Technique", "Manga")
- Contient des collections
- Peut avoir une couverture/icône personnalisée

**Collection** = sous-groupe dans une librairie (ex: "Tintin" dans "BD")
- Contient des documents
- Peut être alimentée automatiquement par règles (nom de fichier, dossier, extension)
- Tri par: date, nom, taille, progression

---

## 7. PDF — pdf.js (dans le tab lecteur)

### Principe
- Charger le PDF depuis le blob via `pdfjsLib.getDocument()`
- Rendre chaque page sur un `<canvas>`
- pdf.js gère nativement : zoom, recherche de texte, navigation, bookmarks

### Implémentation
```js
// tabs/pdf/pdf-viewer.js
import * as pdfjsLib from 'lib/pdf.min.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

async function renderPdf(blob, container, filePath, ctx) {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Charger la progression sauvegardée
    const progress = await ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
        method: 'POST', body: JSON.stringify({ paths: [filePath] })
    });
    const startPage = progress.progress?.[filePath]?.progress_value || 1;
    
    // Rendu des pages (lazy — seulement pages visibles + buffer)
    // ... (rendu canvas par page)
    
    // Auto-save progression toutes les 30s
    setInterval(() => {
        const currentPage = getCurrentPage();
        ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
            method: 'POST',
            body: JSON.stringify({
                paths: [{ path: filePath, type: 'pdf_page', value: currentPage, total: pdf.numPages }]
            })
        });
    }, 30000);
    
    return { pdf, pagesContainer };
}
```

### Features à implémenter
- [x] Rendu page par page (canvas)
- [ ] Zoom in/out (slider + raccourcis clavier +/-)
- [ ] Fit width / fit height / actual size
- [ ] Navigation page précédente/suivante (flèches, page N)
- [ ] Recherche texte dans le PDF (pdf.findController)
- [ ] Mode continu (scroll vertical) vs page par page
- [ ] Sélection de texte (par défaut pdf.js)
- [ ] Download original
- [ ] Progression auto-save

---

## 8. CBZ / CBR — JSZip + ComicViewer

### CBZ
```js
// tabs/pdf/cbz-viewer.js
import JSZip from 'lib/jszip.min.js';

async function renderCbz(blob, container, filePath, ctx) {
    const zip = await JSZip.loadAsync(blob);
    const imageEntries = [];
    for (const [name, entry] of Object.entries(zip.files)) {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name) && !entry.dir) {
            imageEntries.push({ name, entry });
        }
    }
    imageEntries.sort((a, b) => a.name.localeCompare(b.name));
    
    // ComicViewer avec lazy loading
    // Auto-save progression toutes les 30s
    // ...
}
```

### CBR (RAR)
Le format CBR (RAR) n'est pas supportable nativement en JS pur. Options :
- **Option A** : Convertir CBR → CBZ côté serveur PHP avec `unrar` si disponible
- **Option B** : Message utilisateur (convertir en CBZ manuellement)
→ Décision : Option A si `unrar` disponible, sinon message.

---

## 9. EPUB — epub.js

```js
// tabs/pdf/epub-viewer.js
import ePub from 'lib/epub.min.js';

async function renderEpub(blob, container, filePath, ctx) {
    const arrayBuffer = await blob.arrayBuffer();
    const book = ePub({ url: arrayBuffer });
    const rendition = book.renderTo(container, { width: '100%', height: '100%', method: 'default' });
    rendition.display();
    
    // Auto-save progression (pourcentage) toutes les 30s
    // ...
}
```

---

## 10. Image Viewer

Simple viewer pour images JPG/PNG/WebP/GIF avec zoom/pan :
```js
function renderImage(blob, container) {
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.src = url;
    img.className = 'reader-image';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100svh';
    img.style.objectFit = 'contain';
    container.appendChild(img);
    // Zoom/pan via CSS transform
}
```

---

## 11. State management — State lecteur

Ajouter dans `state` (app.js) :

```js
// === État du tab Lecteur (NOUVEAU) ===
state.readerMode = false;                // On est dans le lecteur ou dans l'édition ?
state.readerView = 'libraries';          // 'libraries' | 'collection' | 'reading' | 'list'
state.readerLibraries = [];              // { id, name, description, cover, collections: [...] }
state.readerCollections = [];            // { id, libraryId, name, rules, documents: [...] }
state.readerDocuments = [];              // { path, name, extension, type, size, mtime, progress }
state.readerCurrentDoc = null;           // Document en cours de lecture
state.readerCurrentPage = 0;             // Page/chapitre actuel
state.readerZoom = 1.0;
state.readerFitMode = 'fit-width';       // 'fit-width' | 'fit-height' | 'actual' | 'cover'
state.readerSearchQuery = '';
state.readerFilterType = 'all';          // 'all' | 'pdf' | 'cbz' | 'cbr' | 'epub' | 'image'
state.readerSortBy = 'date';             // 'date' | 'name' | 'size' | 'progress'
state.readerScanFolders = [];            // Dossiers scannés par l'utilisateur
state.readerScannedFiles = [];           // Fichiers découverts lors du scan
state.readerBookmarks = {};              // { filePath: [page/chapter numbers] }

// === État du tab PDF actuel (INCHANGÉ) ===
// (tout ce qui existe déjà dans state pour le tab pdf)
```

---

## 12. UI Layout — Lecteur vs Édition

### Layout tab Lecteur (NOUVEAU — dedicated)

Le tab lecteur est un **layout plein écran dédié**, pas le layout 2 colonnes actuel :
- Vue bibliothèque : grille de librairies/collections
- Vue collection : grille de documents avec couvertures
- Vue lecture : lecteur plein écran (canvas/epub/img)
- **Pas de colonne gauche "règles"** dans le lecteur — c'est un lecteur pur
- **Pas de footer d'action** — juste la navigation de lecture

### Layout tab PDF actuel (INCHANGÉ)
- Garde le layout 2 colonnes `.renamer-main`
- Colonne gauche : actions (convert CBZ, preview, etc.)
- Colonne droite : preview fichiers
- C'est un tab **d'édition/rangement**, pas de lecture

### Résumé

| Tab | Layout | Rôle |
|-----|--------|------|
| Renamer | 2 colonnes | Renommer fichiers |
| Métadonnées | 2 colonnes | Éditer métadonnées |
| PDF (actuel) | 2 colonnes | Actions PDF (convert, preview) |
| **Lecteur** | **Plein écran dédié** | **Lire (Kavita-like)** |
| Archives | À définir | Gérer archives |

---

## 13. Backend — Résumé des changements

### À ajouter dans `PageController.php`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/files/read` | GET | Servir le contenu brut d'un fichier (base64) |
| `/api/files/info` | POST | Type/size/mtime d'un fichier |
| `/api/reader/scan` | POST | Scanner un dossier (liste documents par type) |
| `/api/reader/progress` | GET/POST | Sauvegarder/lire progression par utilisateur |
| `/api/reader/libraries` | GET/POST/PUT/DEL | CRUD librairies |
| `/api/reader/collections` | GET/POST/PUT/DEL | CRUD collections |
| `/api/pdf/convert-cbz` | POST | **Inchangé** (compatibilité Kavita) |

### À ajouter dans `routes.php`
```php
[
    'name' => 'page#readFile',
    'url' => '/api/files/read',
    'verb' => 'GET'
],
[
    'name' => 'page#fileInfo',
    'url' => '/api/files/info',
    'verb' => 'POST'
],
[
    'name' => 'page#scanFolder',
    'url' => '/api/reader/scan',
    'verb' => 'POST'
],
[
    'name' => 'page#saveProgress',
    'url' => '/api/reader/progress',
    'verb' => 'POST'
],
[
    'name' => 'page#readProgress',
    'url' => '/api/reader/progress',
    'verb' => 'GET'
],
// + routes libraries/collections (GET/POST/PUT/DEL)
```

### À NE PAS MODIFIER
- Les routes PDF existantes (`/api/pdf/preview`, `/api/pdf/page`) → gardées en fallback
- Le tab Renamer et son API → inchangé
- Le tab Métadonnées et son API → inchangé
- Les routes de règles/plans/translations → inchangées

---

## 14. Dépendances serveur

### À NE PAS ajouter
- ❌ pdftoppm, pdfimages, pdfinfo (poppler-utils) → plus nécessaires côté serveur
- ❌ Imagick → plus nécessaire
- ❌ Aucune extension PHP nouvelle requise (sauf `unrar` pour CBR, optionnel)
- ❌ Pas de bash côté serveur pour le rendu

### Déjà disponibles
- ✅ PHP-Zip (pour CBZ build si on garde convert-cbz)
- ✅ getID3 (pour metadata, inchangé)
- ✅ PHP-DB (pour tables progress/libraries/collections)

---

## 15. Contraintes

- **Pas de bash** côté serveur pour le rendu (pdf.js, JSZip, epub.js font tout en JS)
- **Pas de dépendance npm/node** — inclusion statique des librairies JS
- **Pas de cache serveur** pour les fichiers — lus à la volée depuis Nextcloud filesystem
- **Pas de modification des fichiers** — lecture seule sauf download explicite
- **Progression par utilisateur** — chaque utilisateur Nextcloud a sa propre progression
- **Respect des règles AGENTS.md** : préfixes, layout 2 colonnes pour tabs édition, pas de footer dans le lecteur
- **L'app actuelle reste fonctionnelle** — le lecteur est un ajout, pas un remplacement

---

## 16. Phases d'implémentation

### Phase 1 — Fondations backend + lecteur PDF basique (2-3 jours)
- [ ] Créer tables DB `renamer_reading_progress`, `renamer_libraries`, `renamer_collections`
- [ ] Ajouter endpoints PHP : `/api/files/read`, `/api/files/info`, `/api/reader/progress` (GET/POST)
- [ ] Intégrer pdf.js (worker + core) dans le projet
- [ ] Créer `js/tabs/pdf/pdf-viewer.js` — rendu PDF basique (page par page, zoom simple)
- [ ] Créer `js/tabs/pdf/reader.js` — dispatcher par type
- [ ] Créer `js/tabs/reader/app-reader.js` — tab lecteur vide avec skeleton UI
- [ ] Auto-save progression PDF (page actuelle toutes les 30s)

### Phase 2 — Librairies & Collections + Vue bibliothèque (2 jours)
- [ ] Ajouter endpoints PHP : `/api/reader/libraries`, `/api/reader/collections` (CRUD)
- [ ] Créer UI librairies (grille de librairies)
- [ ] Créer UI collections (grille de documents dans une collection)
- [ ] Classification automatique par extension/dossier/nom
- [ ] Scan de dossier (`/api/reader/scan`)

### Phase 3 — CBZ + Images (1 jour)
- [ ] Intégrer JSZip
- [ ] Créer `js/tabs/pdf/cbz-viewer.js` — extraction + ComicViewer
- [ ] Créer `js/tabs/pdf/image-viewer.js` — simple img viewer
- [ ] Auto-save progression CBZ/Image

### Phase 4 — EPUB + Polish (2 jours)
- [ ] Intégrer epub.js
- [ ] Créer `js/tabs/pdf/epub-viewer.js` — rendu + TOC + nav chapitres
- [ ] Auto-save progression EPUB
- [ ] Vue "Continuer la lecture" (documents avec progression)
- [ ] Recherche texte PDF
- [ ] Navigation clavier complète (flèches, espace, F plein écran, +/- zoom)
- [ ] Download original
- [ ] Toast de chargement pour gros fichiers

### Phase 5 — CBR + Finitions (1 jour)
- [ ] Vérifier si `unrar` disponible → conversion CBR→CBZ
- [ ] Tests sur PDF scanné (image) vs PDF texte
- [ ] Tests multi-utilisateurs (progression isolée)
- [ ] Tests responsive (mobile/tablette)

### Phase future — Tab Archives
- [ ] Gestion/update des archives CBZ/CBR/EPUB (ajouter/remplacer des pages, mettre à jour métadonnées)

---

## 17. Résultat attendu

À terme, l'app Renamer Nextcloud offre :

1. **Tab Édition** (actuel) : renommer, métadonnées, convertir CBZ, preview — **inchangé**
2. **Tab Lecteur** (nouveau) : un "Netflix de lecture" avec :
   - Scan de dossiers choisis par l'utilisateur
   - Documents classés par **librairies** et **collections**
   - Interface Kavita avec couvertures en grille
   - Lecture intégrée PDF/CBZ/EPUB/Image (pdf.js, JSZip, epub.js)
   - **Progression de lecture sauvegardée par utilisateur Nextcloud**
   - Reprise automatique là où on s'est arrêté
3. **Tab Archives** (futur) : gestion et mise à jour des archives
4. **Zéro dépendance serveur** pour le rendu (tout en JS côté client)
5. **Backend PHP minimal** : lister, servir les fichiers bruts, stocker progression/librairies/collections
