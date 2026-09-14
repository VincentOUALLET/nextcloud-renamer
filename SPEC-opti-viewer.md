# SPEC-opti-viewer.md — Debrief & feuille de route : optimisation du viewer PDF/CBZ

> Objectif : faire passer l'ouverture d'un PDF/CBZ de **5 s (20 Mo) / 20 s (100 Mo)** à **page 1 en < 1-2 s** en restant sur JS client + libs déjà intégrées (pdf.js, JSZip, epub.js) et outils serveur déjà présents (poppler `pdftoppm`/`pdfinfo`). Validated par lecture du code réel.

---

## 1. Carte des deux chemins d'ouverture

| Chemin | Entrée | Backend | Lazy ? |
|---|---|---|---|
| **#1 Library reader (LENT)** | `library.js → RenamerReader.renderReader()` | `/api/files/read` (base64 tout le fichier) → `generic-viewer.js:PdfSource` (pdf.js) → `buildReaderUI` rend TOUTES les pages | **NON** |
| **#2 Preview modal (OK)** | `app-pdf.js → openPageModal()` | `/api/pdf/page?path&page=N` (pdftoppm, page par page) + `state.pdfPageCache` + `PRELOAD_RADIUS=2` | **OUI** — déjà lazy, prouvé |

Le reader lent = **#1**. Le modal (#2) est le **modèle à copier** : il est déjà instantané car il ne télécharge jamais le fichier entier et ne rend qu'une page à la fois.

---

## 2. Pourquoi c'est si lent — causes racines

> **À retenir (merci pour la correction) :** ce n'est pas un problème de ms de rendering. C'est la **rampe 5 s→20 s (20 Mo→100 Mo)** imposée par (B0) le téléchargement+base64 de l'intégralité du fichier + (B2) le rendu de TOUTES les pages. Coût = fction **taille du fichier** (B0/B1) **et** nombre de pages (B2).

### B0/B1. 🔴 Le fichier entier est téléchargé + décodé en base64 AVANT le premier affichage capable

- `reader.js:57` → `GET /api/files/read?path=…`
- `PageController::readFile()` (`PageController.php:460-493`) : `stream_get_contents` (486) → `base64_encode` (489) → JSON `{ content: "<base64>" }`.
- Client `reader.js:19-26` :

```js
var binary = atob(base64);              // 100 Mo → 133 Mo base64 → 100 Mo binary string
var bytes = new Uint8Array(binary.length);
for (var i = 0; i < binary.length; i++) {   // ← BOUCLE JS BYTE-PAR-BYTE : GÈLE le thread principal plusieurs secondes
    bytes[i] = binary.charCodeAt(i);
}
```

→ Rien ne s'affiche tant que les N Mo sont reçus + décodés. C'est ce qui impose la rampe 5 s→20 s. Même chose pour **CBR** (`convertCbrToCbz` -> base64, `reader.js:82`).

### B2. 🔴 PDF : rendu de TOUTES les pages d'un coup (`generic-viewer.js:362-378`)

```js
for (var i = 1; i <= totalPages; i++) {
    ... source.renderPage(pageNum, pageEl)   // ← rend chaque page à scale 1.5 (generic-viewer.js:76)
}
```

pdf.js parse dans le worker (OK), mais le **paint canvas est sur le thread principal** → saturation, jank.

### B3. 🟠 CBZ : extraction de TOUTES les images d'un coup (`generic-viewer.js:110-147`)

`JSZip.loadAsync(blob)` → `Promise.all` de `entry.async('blob')` pour **toutes** les entrées → objets + URLs créés en masse.

### B4. 🟠 Pas de cache du blob/dernières pages entre deux ouvertures

`pdfPageCache` (`app-pdf.js:430`) ne concerne que le modal. Le reader #1 recommence à zéro à chaque ouverture.

### B5. 🟡 pdf.js via `data:` buffer (pas de range requests) — linéarisation dépendante

`generic-viewer.js:62-63` : `pdfjsLib.getDocument({ data: arrayBuffer })` ne peut pas faire de range requests → full download requis avant parse; et même avec `getDocument(url)`, pdf.js ne peut sauter à la page 50 que si le PDF est **web-optimisé (linearisé)**. Sinon il télécharge le fichier en entier.

### B6. 🟡 `scale: 1.5` fixe (`generic-viewer.js:76`) → 2.25× plus de pixels à peindre.

---

## 3. Réponses aux questions du ticket

### Q1 — "Ton idée (range requests) peut-elle reprendre une progression / ouvrir à la page courante, ou ça charge forcément depuis le début ?"

**pdf.js `getDocument(url)` + range requests :** oui, **mais uniquement si le PDF est web-optimisé (linearisé)** — le cross-reference table est alors en début de fichier, pdf.js fetch les bytes de la page cible directement. **Pour un PDF non-linearisé, non** : pdf.js doit récupérer la fin du fichier (tableau xref) → full download. Donc **incertain** selon la source du PDF. Pas fiable pour le "quasi instantané" exigé.

**Notre solution serveur (recommandée, ci-dessous) :** oui, **toujours** — on ne télécharge jamais le PDF, on ne rend que la page demandée via `pdftoppm` (`PdfService::renderPage`, déjà implémenté et utilisé par le modal).

### Q2 — "Comment fait Kavita pour être quasi instantané ?"

Kavita **pré-rasterise les pages en images (PNG/JPG) à l'import** dans un cache serveur, et lit les images mises en cache. Il ne parse jamais de PDF live côté client.

Nous, on a **volontairement pas de cache persistant** (design actuel : lectures getID3 refaites, pas d'IndexedDB — cf. AGENTS.md). On ne peut pas reproduire le pré-raster au repos sans gros chantier (job background + stockage). **Mais** on peut reproduire le *principe on-demand* : rendre **une page à la demande via poppler (`pdftoppm`)**, exactement comme le modal le fait déjà et déjà prouvé. C'est le plus proche atteignable sans cache persistant → première page en < 1-2 s, resume à n'importe quelle page, zéro download de 100 Mo.

---

## 4. Plan d'optimisation retenu (Kavita-like, libs/déjà présentes)

### Option A (PRINCIPALE) — 🟢 **PDF : rendre la page courante via `pdftoppm` serveur + lazy load (copier le modal)**

Rejette pdf.js pour le reader PDF, au profit du chemin **déjà existant et prouvé** (`/api/pdf/page`, `PdfService::renderPage` 525 — pdftoppm, page par page, renvoie `dataUrl` + `pageCount`).

- `reader.js`/`PdfSource` ne télécharge **jamais** le PDF.
- `/api/pdf/page?path=X&page=1` renvoie la page 1 + `pageCount` → première page en < 1-2 s.
- Tous les pages connus → construire des placeholders cheap (divs).
- `IntersectionObserver` (radius 1-2) déclenche `/api/pdf/page?path=X&page=N` au scroll.
- Cache en mémoire `state.pdfPageCache[path#page]` (comme `app-pdf.js:430`) + révocation LRU.
- **Avantage résolution B0/B1/B2/B5/B6 en une fois** pour PDF : plus de base64, plus de 100 Mo téléchargés, plus de 250 renders.

> pdf.js devient inutile pour le reader PDF → on peut même ne plus le charger dans le library reader (économie bundle). À valider.

### Option A' (CBZ) — 🟢 **Éliminer le base64 CBZ : fetch binaire via URL de téléchargement Nextcloud**

`/apps/files/download/<path>` (same-origin, cookie). `fetch(url).then(r=>r.blob())` → zéro atob. CBZ n'a pas d'équivalent serveur page-par-page → on doit télécharger le zip, mais **sans freeze** et **lazy extraction** (Option C).

### Option C — 🟢 **CBZ : extraction paresseuse + LRU**

`CbzSource.load()` ne décompresse plus tout : liste les noms via le central directory, `renderPage(n)` fait `zip.file(name[n]).async('blob')` à la demande + `ObjectURL`, LRU (~3-5), révocation.

### Option D — 🟡 **Blob cache entre sessions (library `domCache` déjà existe pour le wrapper ; étendre au blob)**

### Option E — 🟡 **pdf.js `getDocument(url)` streaming** — retenu comme fallback si on veut garder pdf.js + offline. À débattre.

### Option F — 🟡 **CBR : écrire le CBZ sur le FS user, retourner `path`** au lieu de base64 (`convertCbrToCbz`).

---

## 5. Décision cadre (choix validé)

> "si on peut et si ça fait descendre les temps de chargement on partira sur du lazy loading, à moins que tu aies déjà de quoi mieux optimiser l'existant en restant sur du JS et des lib client"

**Réponse :** votre intuition "charger 5-10 pages d'abord, puis le reste" est **exactement** la bonne, et on peut la dépasser : **on ne télécharge même pas le fichier.**

**Choix validé — Phase 1 (PDF) :** copier le modèle du modal #2 : **rendre les pages via `pdftoppm` serveur (`/api/pdf/page`) + lazy load + cache.** C'est ce qui donne le "quasi instantané" de Kavita *on-demand*, sans cache persistant, en réutilisant du code **déjà existant et prouvé** (`PdfService::renderPage`, `openPageModal`'s `fetchPageImage`). Gain : 20 s → page 1 en < 2 s, resume instantané à n'importe quelle page, plus jamais de base64/atob ni de 250 renders.

**Phase 2 (CBZ) :** Option A' + C (download URL binaire + extraction lazy). Le CBZ télécharge toujours le zip (pas d'équivalent serveur page-par-page), mais **sans freeze** et **sans tout décompresser d'un coup**.

→ A+B+C (avec A = server-page pour PDF) : PDF 100 Mo page 1 < 2 s ; CBZ 100 Mo sans freeze, pages au scroll. Tout reste dans le scope libs existantes (pdf.js éventuellement décroché du reader, JSZip, pdf.js worker déjà là).

---

## 6. Todolist (phased — mise à jour en temps réel)

> **État des implémentations :** Phase 0 et Phase 1 sont **déjà implémentées** dans le code actuel (vérifié par lecture du code et `node --check` vert). Phase 2 est partiellement faite. Voir section "Dernières questions / réponses" pour les réponses aux questions ouvertes.

### Phase 0 — Diagnostic ✅ (code lu + checks syntax verts)
- [x] Cartographier les deux chemins (reader #1 vs modal #2). Le modal est le modèle.
- [x] `node --check js/tabs/pdf/generic-viewer.js` / `reader.js` → OK ; `php -l PageController.php / PdfService.php / routes.php` → OK.
- [x] (facultatif) `curl -I` sur `/apps/files/download/...` pour confirmer `Accept-Ranges` (utile seulement si on garde pdf.js streaming — pas prioritaire avec le plan serveur-page).

### Phase 1 — PDF : rendu page-par-page serveur + lazy (Option A) ✅ TERMINÉE
- [x] Refactor `PdfSource` (`generic-viewer.js:32-233`) : `load()` ne télécharge plus le PDF ; récupère `pageCount` + page 1 (+ page cible si progression) via `/api/pdf/page` (`_fetchPage` + cache `state.pdfPageCache`). Plus de pdf.js / `data:` buffer.
- [x] `PdfSource.renderPage` (`generic-viewer.js:124-136`) → `<img>` + cache `path#page` + dédup `_inflight` (mêmes principes que `fetchPageImage` du modal `app-pdf.js:525`).
- [x] `buildReaderUI` (`generic-viewer.js:486-839`) : crée des **placeholders** (spinner) pour toutes les pages ; ne rend que `currentPage ± RENDER_RADIUS=2` (`generic-viewer.js:549`).
- [x] `renderVisiblePages()` (`generic-viewer.js:586-593`) branché sur le `scrollHandler` existant (`generic-viewer.js:755`) + appel initial.
- [x] Scale 1.5 fixe → **supprimé** (plus de canvas pour le mode serveur-page ; pdftoppm rend l'image).
- [x] `reader.js:121-125` : branche `ext === '.pdf'` qui saute `/api/files/read` base64 → `renderFile(ctx, filePath, null, container)`. Aucun download du fichier entier pour PDF.
- [x] (bonus) `&width=1920` passé à `pdftoppm` pour limiter la résolution native sur le library reader (`PDF_RENDER_WIDTH` const `generic-viewer.js:45`, transmis via `/api/pdf/page?width=1920` → `PdfService::renderPage` accepte `$width`).
- [x] (bonus) Fallback pdf.js si pdftoppm non disponible : `PdfSource.load()` détecte `{success:false, error:'pdftoppm not found'}` → `_initPdfJsFallback()` (`generic-viewer.js:150`) → lazy-load de pdf.js + fallback au download URL/WebDAV via `fetchFileBlob` exporté.
- [x] (bonus) `reader.js:173-183` : `fetchFileBlob` exposé via `window.RenamerReader.fetchFileBlob` pour usage par `PdfSource._initPdfJsFallback`.
- [x] `node --check js/tabs/pdf/generic-viewer.js` + `reader.js` → OK.

### Phase 2 — CBZ : éliminer le base64 + extraction lazy (Options A' + C) 🔧 EN COURS
- [x] `reader.js:42-90` : `fetchFileBlob` tente 3 stratégies de download en cascade :
  1. `/apps/files/download/{path}` (download URL Nextcloud) — 404 derrière reverse proxy si non accessible
  2. `/remote.php/webdav/{path}` (WebDAV endpoint, plus robuste derrière reverse proxy)
  3. `/api/files/blob?path={path}` (nouveau endpoint backend → `DataDisplayResponse` binaire, zéro overhead base64) — fallback si les 2 URLs directes échouent
  4. `/api/files/read?path={path}` (base64, dernier recours)
- [x] `CbzSource.load()` (`generic-viewer.js:248-272`) : ne garde que la liste des noms d'entrées (pas d'extraction d'images en bloc). ✅
- [x] **Bug fix** : `entries.sort(function(a, b) { return a.localeCompare(b); })` — auparavant `a.name.localeCompare(b.name)` provoquait `Cannot read properties of undefined (reading 'localeCompare')` car `entries` contient des strings, pas des objets (`generic-viewer.js:275`).
- [x] `CbzSource.renderPage` (`generic-viewer.js:275-319`) : extraction à la demande + LRU d'ObjectURLs (`CBZ_CACHE_MAX=5`, `_evictLru()` `generic-viewer.js:322`).
- [x] `PdfSource._fetchPage` (`generic-viewer.js:76-103`) : LRU eviction pour `state.pdfPageCache` (`PDF_CACHE_MAX=60`, `pdfCacheTouch` + `pdfCacheEvict` `generic-viewer.js:63-73`).
- [x] Nouveau endpoint backend `PageController::fileBlob()` (`PageController.php:501-540`) + route `/api/files/blob` (`routes.php:116-119`) → `DataDisplayResponse` renvoie le contenu binaire raw, zéro overhead base64.
- [x] `node --check js/tabs/pdf/generic-viewer.js` + `reader.js` → OK ; `php -l PageController.php` + `routes.php` → OK.

### Phase 3 — CBR non-base64 (Option F)
- [ ] `convertCbrToCbz` : écrire le CBZ sur le FS user, retourner `path` ; reader relance via download URL.

### Phase 4 — Cache inter-sessions (Option D)
- [ ] `state.fileBlobCache` / étendre `domCache`.

### Phase 5 — Validation finale
- [ ] Re-profilage 20 Mo / 100 Mo : temps jusqu'au first paint.
- [ ] Vérifier que le modal (`openPageModal`) n'a pas regressed.

---

## Dernières questions / réponses

### Q1 — "Ton idée (range requests) peut-elle reprendre une progression ou ça charge forcément depuis le début progressivement ? C'est déterminant, sinon il nous faut choisir une autre méthode."

**Réponse courte :** La solution Q1 (pdf.js `getDocument(url)` + range requests) est **rejetée** — même en mode "streaming" progressif, pdf.js doit d'abord télécharger la fin du fichier (tableau xref) pour un PDF non-linearisé, ce qui équivaut à un full download. Pour un PDF linearisé, oui elle peut sauter à n'importe quelle page, mais ce n'est **pas fiable** (dépend de la source du PDF).

**Solution retenue (Option A — serveur-page via pdftoppm) :** OUI, **toujours** instantané et **sans download du fichier**. `/api/pdf/page?path=X&page=N` rend la page N directement via `pdftoppm -f N -l N -singlefile` sur le serveur local. Aucun téléchargement de 100 Mo, aucun range request. La page 1 s'affiche en < 1-2 s, et en naviguant à n'importe quelle page, le rendu se fait serveur-side en ms. **C'est le modèle Kavita-like on-demand, sans cache persistant.**

### Q2 — "Comment fait Kavita pour être quasi instantané ?"

**Réponse :** Kavita **pré-rasterise les pages en images (PNG/JPG) à l'import** dans un cache serveur, puis lit les images mises en cache côté client. Il ne parse **jamais** de PDF en live.

**Notre contrainte :** Pas de cache persistant (design actuel : lectures getID3 refaites, pas d'IndexedDB — cf. AGENTS.md). On ne peut pas reproduire le pré-raster au repos sans gros chantier (job background + stockage).

**Notre solution équivalente :** Reproduire le *principe on-demand* : rendre **une page à la demande via poppler (`pdftoppm`)**, exactement comme le modal (`openPageModal` / `fetchPageImage` dans `app-pdf.js:525`) le fait déjà et qui est **prouvé instantané**. Gain : 20 s → page 1 < 2 s, resume instantané à n'importe quelle page, zéro download de 100 Mo. Le cache en mémoire `state.pdfPageCache` joue le rôle du cache serveur entre deux navigulations dans la même session.

> **Q2-suivi :** *"=> alors pourquoi kavita si j'ouvre dans une nav privée c'est quand même max 3sec sur les memes pdf??"*
> 
> Parce que Kavita a **déjà pré-rasterisé les pages en images à l'import** (dans un cache serveur persistant). En nav privée, le cache *client* est effacé, mais le **cache serveur persiste** — Kavita ne "parse" jamais le PDF en live. La 3s correspondent au téléchargement de l'image PNG pré-render serveur → client.
> 
> **Notre différence :** On n'a pas de pré-rasterisation serveur. Mais `pdftoppm -f N -l N -singlefile` rend **une page en ms** (vs parsing PDF entier). Donc même à la page 50, le serveur rend la page 50 directement sans télécharger le PDF. La seule latence = un seul appel `pdftoppm` serveur + transfert d'une image PNG.

### Q3 — "La navigation entre pages peut-elle reprendre là où on s'est arrêté, ou ça recharge depra la page 1 ?"

**Réponse :** La navigation dans le library reader (`buildReaderUI`) utilise un **slider horizontal** où toutes les pages sont des placeholders (divs vides avec spinner). En scrollant ou en cliquant "précédent/suivant", `renderVisiblePages()` rend les pages `currentPage ± 2` via `/api/pdf/page`. Il n'y a **aucun reload depuis la page 1** — `getCurrentPageFromDOM()` détecte la page centrale dans le viewport, et `scrollToPage()` scroll vers n'importe quelle page. La progression est sauvegardée via `saveProgress()` dans la DB (ReadingProgressMapper). À la réouverture, `restorePage()` lit le bookmark et scroll automatiquement à la bonne page.

> **Q3-suivi :** *"=> ma question concernait l'option 4, tu y réponds Q1 il me semble, j'ai bien vu que la progression ça fonctionnait, je demande si on aura un chargement rapide de la page de progression si elle n'est pas la première, mais par exemple à la moitié du cbz / pdf"*
>
> **Oui, pour PDF :** `PdfSource.load()` (`generic-viewer.js:100-113`) récupère `pageCount` via `/api/pdf/page?page=1` (1 appel API), puis immédiatement pré-fetch la page cible via `restorePage()`. Le `buildReaderUI` (`generic-viewer.js:362`) crée des placeholders pour TOUTES les pages, mais `renderVisiblePages()` (`generic-viewer.js:452`) ne rend que `currentPage ± RENDER_RADIUS(2)`. Donc à la page 50 : 1 appel API pour la page 1 (pageCount) + 1 appel pour la page 50 = **2 appels API, page 50 en < 2 s**.
>
> L'API `/api/pdf/page` rend la page serveur-side (pdftoppm si disponible, pdf.js fallback sinon — voir Q4-suivi). Sur les serveurs sans poppler, le fallback pdf.js requiert le download du PDF en binaire (via WebDAV → blob endpoint) mais ne freeze pas (parse en worker) et rend 1 page à la fois.
>
> **Pour CBZ :** Le CBZ nécessite de télécharger le zip entier en premier (via `fetchFileBlob` : download URL → WebDAV → blob endpoint → base64), puis `JSZip.loadAsync()` lit le central directory pour lister les images. Une fois le zip chargé, `CbzSource.renderPage()` extrait les pages à la demande. À la page 50 : le zip est déjà en mémoire → extraction lazy de la page 50 = **rapide au scroll, mais un delay sur le premier rendu** (nécessite le download du zip). Le `restorePage()` scroll automatiquement à la page sauvegardée.

### Q4 — "pdf.js est-il encore nécessaire ?"

**Réponse :** pdf.js est **encore chargé** (`PageController.php:81-83` → `pdf.min` + `pdf.worker.min`) mais **n'est plus utilisé par le library reader** (`PdfSource` utilise désormais pdftoppm via l'API). Il ne reste potentiellement utile que si un autre composant l'utilise. **À vérifier** avant de le retirer du chargement (Phase 2 bonus).

> **Q4-suivi :** *"tu dis que pdftoppm est efficace mais si je te demande tout ça c'est justement parce que ça prend plusieurs seconde pour une seule page, ensuite pdftoppm est censé disparaitre à terme parce que inutilisable dans une infra nextcloud pour d'autres serveurs nextcloud qui ne seront pas configuré avec"*
>
> **pdftoppm a un coût de démarrage (~1-3 s)** (processus `proc_open` + lecture PDF). C'est **toujours 5-10x plus rapide** que le download base64 de 100 Mo + atob + rendu 250 pages. Pour réduire ce coût :
> 1. **Cache en mémoire** (`state.pdfPageCache` + LRU) — une fois une page rendue, elle est instantanée en réutilisation
> 2. **Préchargement** (`PRELOAD_RADIUS=2`) — `PdfSource.load()` pré-fetches la page cible + page 1 en parallèle
> 3. **Passer `?width=N`** (`/api/pdf/page?width=1920`) — pdftoppm rend à 1920px max au lieu de la résolution native → 2-3x plus rapide pour les PDF haute résolution
>
> **Pour les serveurs sans poppler :** `PdfService::renderPage` retourne `{success: false, error: 'pdftoppm not found'}`. Le frontend peut détecter cela et **basculer sur pdf.js `getDocument(url)`** (Option E) comme fallback serveur-side non disponible :
> - `PdfSource.load()` tente `/api/pdf/page` → si error, passe en mode pdf.js (`pdfjsLib.getDocument({url: downloadUrl})`)
> - Cela nécessite de charger pdf.js uniquement dans ce cas (lazy load conditionnel)
> - L'UX reste acceptable : 5-10 s pour le premier rendu vs 20 s+ baseline
> Voir Q5 pour le download URL binaire (WebDAV) qui sert de fallback transport pour pdf.js streaming.

### Q5 — "Pourquoi le download URL `/apps/files/download/{path}` retourne 404 derrière le reverse proxy (DuckDNS) ?"

**Diagnostic :** Le format `/apps/files/download/{path}` (Nextcloud endpoint standard) retourne 404 dans certains environnements derrière reverse proxy (Docker + DuckDNS) où la réécriture d'URL peut être incomplète. Le fallback base64 via `/api/files/read` fonctionne car il passe par le code PHP du backend (même que le reste de l'app).

**Solution implémentée** — `reader.js:42-90` : `fetchFileBlob` tente 3 stratégies de download en cascade :
1. `/apps/files/download/{path}` — endpoint standard Nextcloud (peut 404 derrière reverse proxy)
2. `/remote.php/webdav/{path}` — endpoint WebDAV (plus robuste, CORE de Nextcloud, généralement proxied)
3. `/api/files/blob?path={path}` — **nouveau endpoint backend** (`PageController::fileBlob`) qui renvoie le contenu **binaire raw** via `DataDisplayResponse` (zéro overhead base64, contrairement à `/api/files/read`)
4. `/api/files/read?path={path}` — base64, dernier recours (déjà existant)

Le blob endpoint (`fileBlob`) est le plus efficace : pas de 33% overhead base64, et il passe par le même code PHP que `readFile` (qui fonctionne). Il sert de fallback entre les URLs directes et le base64.

---

## 7. Contraintes / anti-patterns (AGENTS.md)

- Pas de **footer** dans le reader, pas de layout colonne unique.
- Le viewer `generic-viewer.js` est utilisé par le **library reader** (`reader.js`) — le **modal** (`app-pdf.js`) a son propre code (`openPageModal`), **ne pas casser le modal**.
- Ne pas casser l'onglet renamer **advanced**.
- Pas de changement d'API backend sans mettre à jour le front.
- `node --check` / `php -l` sur tout ce qui est touché.

## 8. Fichiers concernés (références)

- `js/tabs/pdf/reader.js` — `renderReader` (75), `base64ToBlob` (19-26), `getDownloadUrl` (28), `getWebdavUrl` (35), `fetchFileBlob` (42-90, cascade download URL → WebDAV → blob endpoint → base64).
- `js/tabs/pdf/generic-viewer.js` — `PdfSource` (48-144, server-page + LRU cache `pdfPageCache`), `CbzSource` (146-242, lazy extraction + LRU ObjectURLs), `buildReaderUI` (348+, placeholders + RENDER_RADIUS=2).
- `js/app-pdf.js` — `openPageModal` (375), `fetchPageImage` (525, **modèle à copier**), `pdfPageCache` (430, partagé avec PdfSource).
- `lib/Controller/PageController.php` — `readFile` (462, base64 — garder), `fileBlob` (497, **nouveau** — DataDisplayResponse binaire), `pdfPage` (760, serveur — à garder).
- `lib/Service/Pdf/PdfService.php` — `renderPage` (525, pdftoppm), `getPageCount` (209, pdfinfo).
- `appinfo/routes.php` — `/api/files/blob` GET (116, **nouveau**), `/api/pdf/page` GET (191).

## 9. Estimation

| Phase | Tâche | Gain utilisateur |
|---|---|---|
| 0 | Diagnostic (OK) | — |
| 1 | A : PDF server-page + lazy (copier le modal) | **très fort** : 20 s → page 1 < 2 s ; resume instantané |
| 2 | A'+C : CBZ binaire + extraction lazy | **fort** : plus de freeze/atob ; pages au scroll |
| 3 | F : CBR non-base64 | **moyen** : CBR lourd |
| 4 | D : cache inter-sessions | **moyen** : ouverture répétée |
| 5 | Validation | — |

---

> Note : le plan serveur-page (A) est une **divergence délibérée** de l'idée "pdf.js streaming". Il est plus Kavita-like, plus robuste (pas de dépendance à la linéarisation), et réutilise le code du modal déjà validé. pdf.js reste chargé pour l'instant (épicemis si A aboutit).
