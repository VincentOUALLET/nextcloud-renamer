# Schéma du chargement des fichiers JS — Library → Generic Viewer (PDF)

## Contexte

Page : `/apps/renamer/reader` (standalone library/reader page).

URL de navigation typique :
```
/apps/renamer/reader?view=reading&library=1&collection=2&read=/Comics/Series/Tome%201.pdf
```

---

## 1. Entrée serveur (PHP → HTTP → HTML)

```
[Browser] GET /apps/renamer/reader
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Nextcloud core                                                          │
│   • Route matching: appinfo/routes.php → 'page#readerPage'              │
│       "name" => "page#readerPage"                                       │
│       "url"  => "/reader"                                               │
│       "verb" => "GET"                                                   │
│                                                                         │
│   • Dispatches to:                                                      │
│     lib/Controller/PageController.php :: readerPage()  [line 78]        │
│       └─► renderLibraryPage()                                          │
└─────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PageController::renderLibraryPage()  [line 119-156]                      │
│                                                                         │
│  Step 1 — Script registration via \OCP\Util::addScript('renamer', …) :  │
│     ┌─────┬──────────────────────────────────┬─────────────────────────┐│
│     │ Ordre│ Script registered                │ File served             ││
│     ├─────┼──────────────────────────────────┼─────────────────────────┤│
│     │  1  │ 'log'                            │ js/log.js               ││
│     │  2  │ 'dev-refresh-components'         │ js/dev-refresh-components.js ││
│     │  3  │ 'utils'                          │ js/utils.js             ││
│     │  4  │ 'icons'                          │ js/icons.js             ││
│     │  5  │ 'navigation'                     │ js/navigation.js        ││
│     │  6  │ 'library'   ← ENTRY POINT        │ js/library.js           ││
│     │  7  │ 'pdf.min'                        │ js/pdf.min.js           ││
│     │  8  │ 'jszip.min'                      │ js/jszip.min.js         ││
│     │  9  │ 'pdf.worker.min'                 │ js/pdf.worker.min.js    ││
│     │ 10  │ 'epub.min'                       │ js/epub.min.js          ││
│     │ 11  │ 'tabs/pdf/reader'                │ js/tabs/pdf/reader.js   ││
│     │ 12  │ 'tabs/pdf/generic-viewer'        │ js/tabs/pdf/generic-viewer.js ← TARGET││
│     └─────┴──────────────────────────────────┴─────────────────────────┘│
│                                                                         │
│  Step 2 — Template :                                                   │
│     EpubTemplateResponse('renamer', 'reader', [                       │
│         'standalonePage' => true,                                       │
│         'isAdmin' => $isAdmin,                                          │
│     ])                                                                  │
│     ──► renders templates/reader.php :                                 │
│         <div id="library-page" class="lib-page-app"                   │
│               data-isadmin="true|false"></div>                          │
│                                                                         │
│  Step 3 — Headers / CSP :                                              │
│     • meta viewport (width=device-width, … viewport-fit=cover)          │
│     • meta apple-mobile-web-app-status-bar-style = black-translucent    │
│     • ReaderContentSecurityPolicy (blob:, data:, 'self')                │
└─────────────────────────────────────────────────────────────────────────┘
   │
   ▼
[Browser] parses HTML, fetches <script> tags in registration order
(Nextcloud core injects script URLs: /apps/renamer/js/log.js etc.)
```

---

## 2. Exécution JS côté client (ordonnre de chargement des <script>)

```
Browser script execution order (sequential, top-to-bottom):

  js/log.js                         → window.RenamerLog   (mode verbose client)
  js/dev-refresh-components.js      → window.RenamerDevRefresh (hot-reload viewer scripts)
  js/utils.js                       → window.RenamerUtils
  js/icons.js                       → window.RenamerIcons
  js/navigation.js                  → window.RenamerNavigation (favoris, progress bulk)
  js/library.js                     → window.RenamerLibrary
                                         │
                                         │  (IIFE — ne s'exécute pas immédiatement)
                                         │  → définit toutes les fonctions + state
                                         │  → document.addEventListener('DOMContentLoaded', init)
                                         │
                                         ▼
                                   init()  [line 4105]
                                     │
                                     ├── injectStyles()       (injecte CSS inline dans <head>)
                                     ├── renderShell()        (dessine #lib-sidebar + #lib-content)
                                     ├── renderBreadcrumb()
                                     ├── bind()               (écouteurs clic sidebar, touche, etc.)
                                     ├── loadCustomTranslations()  (GET /api/translations)
                                     │
                                     └── handleUrlParams()  [line 3552]
                                           │
                                           │  Analyse URLSearchParams(window.location.search)
                                           │
                                           ├── view= param
                                           ├── library= param  → libId
                                           ├── collection= param → colId
                                           ├── read= param → readPath
                                           ├── node= param → nodeParam
                                           └── favOnly= param
                                           │
                                           └── SI (colId || readPath)  →  deep-link tome :
                                                 │
                                                 ▼
                                             resolveReader({libId, colId, readPath, …}, cb)  [line 3427]
                                                 │
                                                 │  1 API call serveur :
                                                 │  GET /api/reader/resolve?read=<path>&collection=<id>&library=<id>&width=300
                                                 │  → route page#resolveReader [line 211]
                                                 │  → PageController::resolveReader() [line ~2364]
                                                 │  → single round-trip: locate collection + matched file
                                                 │     + bundled progress + covers
                                                 │
                                                 │  Réponse :
                                                 │  { success, found, libraries, library,
                                                 │    collection: {id, libraryId, name, rules:{folder,files,children}},
                                                 │    matchedLibraryId, matchedCollectionId,
                                                 │    progress: {...},
                                                 │    covers: {...} }
                                                 │
                                                 │  cb → renderDeepLink(readPath, colId) [line 3516]
                                                 │         │
                                                 │         ├── findTomeByPath(readPath) [line 3471]
                                                 │         │   (parcourt collection.rules.files + children)
                                                 │         │
                                                 │         ├── state.currentTome = found
                                                 │         │
                                                 │         └── renderReading(found)  [line 2354]
                                                 │               │
                                                 │               ├── Crée DOM overlay #lib-reader-overlay
                                                 │               │   └── readerBox (div vide, flex center)
                                                 │               │
                                                 │               ├── buildCtx()  [line 3378]
                                                 │               │   → { state, t, escapeHtml, getBaseUrl,
                                                 │               │      apiRequest, showToast, updateUrl,
                                                 │               │      closeReader, saveProgress }
                                                 │               │
                                                 │               └── window.RenamerReader.renderReader(ctx, tome.path, readerBox)
                                                 │                       └─► js/tabs/pdf/reader.js :: renderReader() [line 244]
```

---

## 3. Chaîne d'appel library.js → generic-viewer.js

```
js/library.js                          js/tabs/pdf/reader.js                  js/tabs/pdf/generic-viewer.js
────────────────────────              ─────────────────────────               ──────────────────────────────────
                                      (function() { 'use strict';        (function() { 'use strict';
                                       │                                    │
                                       │  var READERS = {                    │  (IIFE auto-exécuté au chargement)
                                       │    '.pdf':  { name, hasViewer:true },│  → définit PdfSource, CbzSource,
                                       │    '.cbz':  { ... },                │    ImageSource, EpubSource,
                                       │    '.epub': { ... }, ...           │    MultiImageSource, etc.
                                       │  }                                │  → window.RenamerGenericViewer = {
                                       │                                   │      renderFile, renderMultiImageSource,
                                       │                                   │      showReaderLoading, hideReaderLoading
                                       │                                   │    }
                                       │                                   │
  renderReading(tome)                │                                   │
       │                              │                                   │
       │  window.RenamerReader        │                                   │
       │  .renderReader(             │                                   │
       │    ctx, filePath,           │                                   │
       │    readerBox)               │                                   │
       ├──►                          │                                   │
       │                              function renderReader(             │
       │                              ctx, filePath, container)  [244]    │
       │                              │                                   │
       │                              │  ext = pathExt(filePath)          │
       │                              │  reader = READERS[ext]             │
       │                              │  (e.g. '.pdf' → renderReader)      │
       │                              │                                   │
       │                              │  showReaderLoading(ctx, container)│
       │                              │         ────────────────────────►   │
       │                              │  → window.RenamerGenericViewer      │
       │                              │        .showReaderLoading(...)       │
       │                              │                                   │
       │                              │  SI ext === '.pdf':                 │
       │                              │  return window.RenamerGenericViewer│
       │                              │         .renderFile(ctx, file,   │
       │                              │                   null, container) │
       │                              │         ────────────────────────►   │
       │                              │                                   │
       │                              │  SI ext === '.cbz':                 │
       │                              │  fetchFileBlob(ctx, filePath)       │
       │                              │    → GET /api/files/read?path=...   │
       │                              │  .then(blob => renderFile(...))     │
       │                              │         ────────────────────────►   │
       │                              │                                   │
       │                              │  SI ext === '.epub':                │
       │                              │  fetchFileBlob(ctx, filePath)       │
       │                              │  .then(blob => renderFile(...))     │
       │                              │         ────────────────────────►   │
       │                              │                                   │
       │                              │  SI ext === '.cbr':                 │
       │                              │  POST /api/reader/convert-cbr      │
       │                              │  .then(blob => renderFile(          │
       │                              │       path.replace('.cbr','.cbz')))│
       │                              │         ────────────────────────►   │
       │                              │                                   │
       │                              │  Images (jpg/png/gif/webp):         │
       │                              │  fetchFileBlob(ctx, filePath)       │
       │                              │  .then(blob => renderFile(...,      │
       │                              │                blob, container))      │
       │                              │         ────────────────────────►   │
       │                                                 │
       │                                                 │  function renderFile(ctx, filePath, blob, container) [4208]
       │                                                 │    │
       │                                                 │    ├── ext = pathExt(filePath)
       │                                                 │    ├── source = createSource(ext, blob, ctx, filePath)
       │                                                 │    │   '.pdf' → new PdfSource(blob, ctx, filePath)
       │                                                 │    │   '.cbz'/'.cbr' → new CbzSource(...)
       │                                                 │    │   images → new ImageSource(...)
       │                                                 │    │   '.epub'/mobi → new EpubSource(...)
                                                         │    │
                                                         │    ├── container._renamerSource = source
                                                         │    │
                                                         │    ├── enableReaderZoom()
                                                         │    │   → modifie <meta viewport> (max-scale=10)
                                                         │    │
                                                         │    ├── scheduleSourceLoad(source)
                                                         │    │     │
                                                         │    │     ▼  (source.load() — dépend du type)
                                                         │    │
     │                              │                   │    │   PdfSource.load() [526]
     │                              │                   │    │       │
     │                              │                   │    │       ├── _fetchPage(1) → GET /api/pdf/page?path=…&page=1
     │                              │                   │    │       │    (serveur : pdftoppm → dataUrl JPEG)
     │                              │                   │    │       │
     │                              │                   │    │       └── SI échec ('pdftoppm not found' ou
     │                              │                   │    │            totalPages===0) → _initPdfJsFallback()
     │                              │                   │    │             → lit blob en ArrayBuffer
     │                              │                   │    │             → window.pdfjsLib.getDocument({data:arrayBuffer})
     │                              │                   │    │             → global worker = /js/pdf.worker.min.js
     │                              │                   │    │
     │                              │                   │    └── .then(() => buildReaderUI(ctx, container, source, filePath))
     │                              │                   │          │
     │                              │                   │          └──► (voir §4 — rendu des pages)
```

---

## 4. Rendu des pages PDF (generic-viewer.js — cycle de vie complet)

```
PdfSource.load()
  │
  ├─→ _fetchPage(1)
  │     │
  │     ├── Si serveur OK (pdftoppm) :
  │     │   GET /api/pdf/page?path=<enc>&page=1&width=1920
  │     │   → dataUrl (JPEG base64)
  │     │   → mis en cache : ctx.state.pdfPageCache[path#page] = dataUrl
  │     │   → LRU eviction à 60 entrées (PDF_CACHE_MAX)
  │     │
  │     └── Si serveur échoue :
  │         → _initPdfJsFallback()  [line 553]
  │           → blob.arrayBuffer()
  │           → pdfjsLib.getDocument({data: arrayBuffer})
  │           → self._pdfJsDoc = pdfDoc
  │           → self.totalPages = pdfDoc.numPages
  │
  └─→ totalPages déterminé
      └─→ restorePage(ctx, filePath, totalPages)
          → GET /api/reader/progress  (lecture progrès sauvegardé)

renderFile() → scheduleSourceLoad() → source.load() → DONE
  │
  ▼
buildReaderUI(ctx, container, source, filePath)  [generic-viewer.js]
  │
  ├── Container : reader-container-layout (flex, bg #000)
  │
  ├── Header nav : buildHeaderNav(ctx, container, filePath)  [line 789]
  │     │
  │     ├── Back button  → ctx.closeReader()
  │     ├── Collection / Tome label
  │     ├── Favorites-only toggle  → renderPageSelector()
  │     └── Settings button
  │
  ├── Pages slider : .reader-pages.reader-pages-slider
  │     │
  │     ├── source.createPageElement()
  │     │   PdfSource → <img class="reader-page-img">  (ou <canvas> si pdfjs)
  │     │   CbzSource  → <img>
  │     │   ImageS.    → <img>
  │     │
  │     └── renderSlide(ctx, source, pageNum, element)
  │           │
  │           ├── source.renderPage(pageNum, element)
  │           │   │
  │           │   ├── PdfSource (serveur) :
  │           │   │   _fetchPage(pageNum) → waitForImageLoad(element, dataUrl)
  │           │   │   (lazy : page demandée au scroll)
  │           │   │
  │           │   └── PdfSource (pdfjs fallback) :
  │           │       _renderPagePdfJs(pageNum, canvas) → canvas 2d render
  │           │       cache par page (_pdfJsRenderCache)
  │           │
  │           ├── preload suivante (PRELOAD_MARGIN=5)
  │           │
  │           └── updatePageLabel (footer page X/Y, progress %)

Navigation (clavier / swipe) :
  ← / →  : page précédente / suivante
  Haut  : page précédente (dans certaines vues)
  Bas   : page suivante
  F     : plein écran (reader.js:2401 / library.js:2401)
  Échap : closeReaderModal()
```

---

## 5. PWA / hauteur plein écran — points critiques

```
generic-viewer.js IIFE (top, lines 4-167)
  │
  ├── isIOSDevice() / isPWAStandalone() / isChromeIOS()
  │
  ├── PWA_HEIGHT_OFFSET = 30
  │
  ├── window.innerHeight + (isPwa ? PWA_HEIGHT_OFFSET : 0) → h
  │   → document.documentElement.style.setProperty('--renamer-app-height', h)
  │   → document.body.style.height = h  (← valeur JS, PAS calc(100vh+30px))
  │
  ├── viewport-fit=cover forcé sur tous les <meta viewport>
  │
  └── updateAppHeightForResize()
      → 300ms debounce sur resize/orientationchange
      → refresh de --renamer-app-height depuis window.innerHeight

library.js → injectStyles() (lines 1212-1224)
  │
  ├── .lib-page-app.fullscreen
  │     height: calc(var(--renamer-app-height, 100dvh))
  │     height: 100dvh          (fallback moderne)
  │
  ├── body.renamer-pwa .lib-page-app.fullscreen
  │     height: calc(var(--renamer-app-height, 100dvh))
  │     height: 100dvh
  │
  └── #content.app-renamer.fullscreen
        height: calc(var(--renamer-app-height, 100dvh))
        height: 100dvh
        max-height: calc(var(--renamer-app-height, 100dvh))
        max-height: 100dvh

reader.js (standalone, /apps/renamer) → renderLibraryPage()
  │
  └── addHeader('meta', ['viewport', '…viewport-fit=cover'])
  └── addHeader('meta', ['apple-mobile-web-app-status-bar-style', 'black-translucent'])
```

---

## 6. Résumé du chemin critique (deep-link PDF)

```
Browser URL: /apps/renamer/reader?view=reading&read=/path/file.pdf

1. Nextcloud core → route page#readerPage → PageController::readerPage()
2. renderLibraryPage() → addScript x12 (log → library → pdf.min → … → generic-viewer)
3. EpubTemplateResponse → templates/reader.php → <div id="library-page">
4. Browser charge 12 <script> dans l'ordre → window.RenamerGenericViewer défini
5. library.js DOMContentLoaded → init() → handleUrlParams()
6. ?read= présent → resolveReader() → GET /api/reader/resolve (1 appel serveur)
7. renderDeepLink() → findTomeByPath() → renderReading(tome)
8. renderReading() → buildCtx() → window.RenamerReader.renderReader(ctx, path, box)
9. reader.js:renderReader('.pdf') → renderFile(ctx, path, null, box)
10. generic-viewer.js:renderFile → PdfSource → source.load() → buildReaderUI()
11. buildReaderUI → renderSlide → PdfSource.renderPage → GET /api/pdf/page → <img>/<canvas>
```

---

## 7. Cartographie fichiers ↔ responsabilités

| Fichier | Rôle | Export global |
|---|---|---|
| `js/log.js` | Logging client/serveur, mode verbose | `window.RenamerLog` |
| `js/dev-refresh-components.js` | Hot-reload viewer scripts + blob cache | `window.RenamerDevRefresh` |
| `js/utils.js` | Utilitaires (prompts, dialogs, formater) | `window.RenamerUtils` |
| `js/icons.js` | Icônes SVG | `window.RenamerIcons` |
| `js/navigation.js` | Navigation Nextcloud + Favorites/Read progress bulk | `window.RenamerNavigation` |
| `js/library.js` | **Page library** : état global, routing URL, deep-link, UI | `window.RenamerLibrary` |
| `js/tabs/pdf/reader.js` | Routeur format→source, blob fetching | `window.RenamerReader` |
| `js/tabs/pdf/generic-viewer.js` | **Render PDF/CBZ/EPUB/images** + PWA height + CSS | `window.RenamerGenericViewer` |
| `js/tabs/reader/app-reader.js` | Reader tab UI (pour le standalone renamer app page /apps/renamer) | (tab registré dans RenamerApp) |
| `js/pdf.min.js` | PDF.js viewer (pour fallback pdfjs) | `window.pdfjsLib` |
| `js/pdf.worker.min.js` | Worker PDF.js | — |
| `js/jszip.min.js` | Lecture archives ZIP (CBZ) | `window.JSZip` |
| `js/epub.min.js` | Lecteur EPUB | `window.ePub` |
| `templates/reader.php` | Template HTML library page | (rien — juste le #library-page) |
| `appinfo/routes.php` | Route `page#readerPage` → `/reader` | — |
| `lib/Controller/PageController.php` | `readerPage()` → `renderLibraryPage()` | — |
| `lib/Listener/LoadAdditionalListener.php` | Listener pour les pages Nextcloud courantes (pas /reader) | — |
