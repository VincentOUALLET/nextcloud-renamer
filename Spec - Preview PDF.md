# Spec — Aperçu PDF (thumbnails) dans l'onglet PDF

## Contexte

L'onglet PDF dispose aujourd'hui d'une action unique : **Convertir PDF en CBZ**.
Le backend utilise déjà `pdfimages` (poppler-utils) et `pdfinfo`, tous deux installés sur le serveur.
Le frontend partage `state.files` / `state.fileSelection` avec l'onglet renamer.

---

## Outils serveur disponibles (sans lib tierce)

| Outil | Statut | Usage |
|---|---|---|
| `pdftoppm` (poppler-utils v22.12) | ✅ installé `/usr/bin/pdftoppm` | Rendu raster de pages PDF en PNG/JPEG |
| `pdfinfo` (poppler-utils) | ✅ installé | Lecture métadonnées PDF (pages, titre, etc.) |
| `pdfimages` (poppler-utils) | ✅ installé, déjà utilisé | Extraction images natives du PDF |
| PHP GD | ✅ installé | Resize/convert si nécessaire |
| PHP ZipArchive | ✅ installé | Pour merge PDF côté service si besoin |
| Imagick | ✅ installé sur ce serveur | Non portable, réservé fallback optionnel (voir § Fallback) |
| `pdftk` / `gs` (Ghostscript) | ❓ non vérifié | Merge PDF — à vérifier au moment de l'implémentation |

**Principe de base** : ne compter que sur `pdftoppm` + GD. Ce sont des dépendances déjà acquises
(poppler-utils est requis par `info.xml` pour le CBZ).

---

## pdftoppm — capacités

```
pdftoppm [options] <PDF> <préfixe_sortie>
```

Options pertinentes pour les thumbnails :

| Option | Effet |
|---|---|
| `-png` | Sortie PNG (qualité maximale, fichier plus gros) |
| `-jpeg` | Sortie JPEG (plus léger, quality via `-jpegopt quality=75`) |
| `-scale-to N` | Largeur max = N px, hauteur auto-préservée |
| `-scale-w N` | Largeur exacte = N px |
| `-scale-h N` | Hauteur max = N px |
| `-f N` | Première page à rendre |
| `-l M` | Dernière page à rendre |
| `-singlefile` | Une seule page, nom fixe sans suffixe |

Exemple pour thumbnail 150 px de large, pages 1 à 5 :

```
pdftoppm -png -scale-to 150 -f 1 -l 5 /chemin/fichier.pdf /tmp/renamer-pdf-abc/thumb
```

→ `/tmp/renamer-pdf-abc/thumb-1.png`, `thumb-2.png`, ..., `thumb-5.png`

Pour un aperçu scrollable (miniatures uniquement, pas de lecture) à 150 px de large en JPEG quality 60,
chaque thumbnail fait ~3–8 KB. Total pour 50 pages ≈ 200 KB en base64 (+33 % → ~270 KB).
Même un PDF de 200 pages tient dans ~1 MB. **Pas de problème de taille de réponse** — c'est justement
l'intérêt des miniatures : petites, nombreuses, fluides au scroll.
Le full-res est récupéré page-par-page au clic (voir § Clic sur miniature → page individuelle).

**Donc : pas de `maxPages` limite pour les thumbnails.** On rend toutes les pages.

---

## Nouvelle route backend

```
POST /api/pdf/preview
```

**Controller** : `PageController::pdfPreview()`

**Body** :
```json
{
  "paths": ["/dir/doc1.pdf", "/dir/doc2.pdf"],
  "thumbnailWidth": 150
}
```

`thumbnailWidth` est optionnel (défaut : 150). Pas de `maxPages` : toutes les pages sont rendues
en miniatures (voir § Taille des réponses).

**Réponse** :
```json
{
  "success": true,
  "results": [
    {
      "path": "/dir/doc1.pdf",
      "fileName": "doc1.pdf",
      "pageCount": 12,
      "pages": [
        { "page": 1, "thumbDataUrl": "data:image/jpeg;base64,/9j/4AAQ..." },
        { "page": 2, "thumbDataUrl": "data:image/jpeg;base64,/9j/4AAQ..." }
      ],
      "error": null
    }
  ],
  "errors": ["/dir/doc2.pdf: cannot resolve local file path"]
}
```

- `thumbDataUrl` : miniature JPEG encodée en base64 data URI, prête pour `<img src="...">`.
- Toutes les pages sont présentes dans `pages[]` (pas de troncation).

---

## Implémentation backend — `PdfService::previewPdf()`

Nouvelle méthode publique dans `PdfService` :

```php
/**
 * Render ALL PDF pages as JPEG thumbnails and return base64 data URIs.
 *
 * Thumbnails are small (~3-8 KB each at 150px wide, quality 60) — the goal is visual
 * overview while scrolling, not readability. For full-quality single page view, use
 * the separate GET /api/pdf/page endpoint.
 *
 * @param string[] $paths
 * @param int      $thumbWidth  Thumbnail max width in pixels (default 150)
 * @return array{success: bool, results: array<int, array{...}>, errors: string[]}
 */
public function previewPdf(array $paths, int $thumbWidth = 150): array
```

Pipeline interne pour chaque PDF :

1. **Résoudre le chemin local** (identique à `convertToCbz()`).
   - Non-local → erreur, skip.
   - Non lisible → erreur, skip.
   - Non-PDF → erreur, skip.

2. **Lire `pageCount` via `pdfinfo`**.
   - Si `pageCount === 0` → erreur, skip.

3. **Créer un temp dir** (`sys_get_temp_dir()/renamer-pdf-preview-{hex}`).

4. **Exécuter `pdftoppm` en mode JPEG thumbnail** :
   ```
   pdftoppm -jpeg -jpegopt quality=60 -scale-to {thumbWidth} {pdfPath} {tmpDir}/thumb
   ```
   - `-jpeg` + `-jpegopt quality=60` : JPEG compressé, ~3-8 KB par page à 150 px.
   - `-scale-to` préserve le ratio, pas de `-f`/`-l` : toutes les pages sont rendues.
   - Fallback si `-jpegopt` non supporté : `-jpeg` seul (qualité par défaut ~75, un peu plus gros mais OK).

5. **Scanner le répertoire**, trier par nom naturel (`thumb-1.jpg`, `thumb-2.jpg`, ...).

6. **Pour chaque image** : `file_get_contents()` → `base64_encode()` → construire `data:image/jpeg;base64,...`.

7. **Nettoyer le temp dir** (`rrmdir`).

8. **Retourner** la structure ci-dessus.

**Sécurité** :
- Tous les chemins passent par `escapeshellarg()`.
- Le temp dir est créé en `0700`.
- Le temp dir est nettoyé même en cas d'exception.

---

## Implémentation backend — `PageController::pdfPreview()`

```php
#[NoCSRFRequired]
public function pdfPreview(): Response {
    $content = file_get_contents('php://input');
    $payload = json_decode($content, true) ?: [];
    $paths = $payload['paths'] ?? [];
    $maxPages = (int)($payload['maxPages'] ?? 20);
    $thumbWidth = (int)($payload['thumbnailWidth'] ?? 150);

    if (!is_array($paths) || empty($paths)) {
        return new DataResponse(['success' => false, 'results' => [], 'errors' => ['No paths provided']], 400);
    }

    $result = $this->pdfService->previewPdf($paths, $maxPages, $thumbWidth);
    return new DataResponse($result);
}
```

---

## Route

```php
// appinfo/routes.php
[
    'name' => 'page#pdfPreview',
    'url'  => '/api/pdf/preview',
    'verb' => 'POST'
],
```

---

## Nouvelle action dans l'onglet PDF (colonne gauche)

### Card supplémentaire (ou nouveau bloc dans la card existante)

```
┌──────────────────────────────────────────────────────────────────┐
│ ⠿  2  Prévisualiser les PDFs                        [toggle on] │
│                                                                    │
│ Génère des miniatures des pages pour chaque PDF sélectionné.      │
│                                                                    │
│ [  📄  Aperçu PDF sélectionnés  ]  (bouton #pdf-action-preview)  │
└──────────────────────────────────────────────────────────────────┘
```

Le bouton est désactivé si rien n'est sélectionné.

---

## Layout colonne droite en mode preview

Lorsque l'utilisateur clique sur **Aperçu PDF**, la colonne droite (`#pdf-preview`) change
de contenu pour afficher les miniatures au lieu de la liste `from → to`.

### Structure HTML

```html
<div class="renamer-preview" id="pdf-preview">
  <!-- Header mode preview -->
  <div class="renamer-preview-header pdf-preview-header">
    <span data-translation="pdfPreviewTitle">Aperçu PDF</span>
    <span class="pdf-preview-info" data-translation="pdfPreviewInfo">
      3 fichiers, 27 pages au total
    </span>
    <button id="pdf-preview-back" class="renamer-btn renamer-btn-secondary"
            data-translation="pdfPreviewBack">
      ← Retour à la liste
    </button>
  </div>

  <!-- Scroll container pour les miniatures -->
  <div class="pdf-preview-container" id="pdf-preview-container">
    <!-- Par fichier PDF -->
    <div class="pdf-preview-file-group" data-path="/dir/doc1.pdf">
      <h2 class="pdf-preview-file-title">doc1.pdf</h2>
      <span class="pdf-preview-page-count">12 pages</span>

      <div class="pdf-preview-thumbnails">
        <!-- Par page -->
        <div class="pdf-preview-thumb" data-page="1" data-path="/dir/doc1.pdf">
          <img src="data:image/png;base64,..." alt="Page 1" />
          <div class="pdf-preview-thumb-overlay">
            <button class="pdf-preview-thumb-reopen" title="Revisualiser cette page"
                    data-translation="pdfReopenPage">↗</button>
          </div>
          <span class="pdf-preview-thumb-label">p.1</span>
          <input type="checkbox" class="pdf-preview-thumb-check"
                 data-page="1" data-path="/dir/doc1.pdf" checked />
        </div>
        <!-- ... page 2..N -->
      </div>
    </div>

    <!-- ... fichier 2, 3 ... -->
  </div>

  <!-- Footer actions (pas de bouton footer isolé, intégré dans le flow) -->
  <div class="pdf-preview-actions">
    <button id="pdf-action-merge" class="renamer-btn renamer-btn-primary"
            data-translation="pdfMergeSelected" disabled>
      Fusionner les pages sélectionnées
    </button>
    <button id="pdf-action-rebuild" class="renamer-btn renamer-btn-secondary"
            data-translation="pdfRebuildFromSelection" disabled>
      Reconstruire le PDF (sélection uniquement)
    </button>
  </div>
</div>
```

### Classes CSS requises

```css
/* Header preview PDF */
.renamer-preview-header.pdf-preview-header {
  padding: 8px 23px 8px 10px;
  justify-content: start;
  align-items: center;
  gap: 12px;
}
.pdf-preview-header .pdf-preview-info {
  flex: 1;
  opacity: 0.7;
  font-size: 13px;
  font-weight: normal;
}
#pdf-preview-back {
  margin-left: auto;
}

/* Container scrollable */
.pdf-preview-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Groupe par fichier */
.pdf-preview-file-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pdf-preview-file-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--nc-text);
  margin: 0;
}
.pdf-preview-page-count {
  font-size: 12px;
  opacity: 0.6;
}

/* Grille de miniatures */
.pdf-preview-thumbnails {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* Thumbnail individuelle */
.pdf-preview-thumb {
  position: relative;
  width: 140px;
  border: 1px solid var(--nc-border);
  border-radius: var(--nc-radius);
  overflow: hidden;
  background: var(--nc-bg);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.pdf-preview-thumb:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.pdf-preview-thumb img {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 3/4;
  object-fit: contain;
  background: #f5f5f5;
}
.pdf-preview-thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px;
  transition: background 0.15s;
}
.pdf-preview-thumb:hover .pdf-preview-thumb-overlay {
  background: rgba(0,0,0,0.25);
}
.pdf-preview-thumb-reopen {
  background: rgba(255,255,255,0.9);
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.pdf-preview-thumb:hover .pdf-preview-thumb-reopen {
  opacity: 1;
}
.pdf-preview-thumb-label {
  font-size: 11px;
  text-align: center;
  padding: 3px 0;
  opacity: 0.7;
  background: var(--nc-bg);
  border-top: 1px solid var(--nc-border);
}

/* Checkbox de sélection dans les miniatures */
.pdf-preview-thumb-check {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  z-index: 2;
  accent-color: var(--nc-blue);
}
.pdf-preview-thumb-check:not(:checked) + .pdf-preview-thumb-overlay {
  /* dim si décoché */
}
.pdf-preview-thumb:has(.pdf-preview-thumb-check:not(:checked)) img {
  opacity: 0.4;
  filter: grayscale(0.6);
}

/* Actions en bas du preview */
.pdf-preview-actions {
  padding: 10px 23px;
  border-top: 1px solid var(--nc-border);
  display: flex;
  gap: 8px;
  align-items: center;
}
```

---

## États UI

### Nouveaux états ajoutés à `state`

```js
// Dans app.js ou app-pdf.js
state.pdfPreviewData = null;   // { results: [...] } retourné par l'API
state.pdfPreviewSelection = {}; // Map { "/dir/doc1.pdf": Set([1, 3, 5]) }
state.pdfPreviewMode = false;   // true = on affiche les miniatures
```

### Sélection initiale en mode preview

- Par défaut, toutes les pages de tous les PDFs sélectionnés sont cochées.
- `state.pdfPreviewSelection` est initialisé à partir de `state.fileSelection`.

### Sélection par thumbnail

- Clic sur la checkbox → toggle de la page dans `state.pdfPreviewSelection[path]`.
- Clic sur l'image elle-même → toggle également (UX plus directe).
- Si toutes les pages d'un PDF sont décochées, le PDF entier est marqué comme décoché.

---

## i18n — nouvelles clés

```json
{
  "pdfPreviewTitle":           { "fr": "Aperçu PDF", "en": "PDF Preview" },
  "pdfPreviewInfo":            { "fr": "{n} fichiers, {p} pages au total", "en": "{n} files, {p} pages total" },
  "pdfPreviewBack":            { "fr": "← Retour à la liste", "en": "← Back to list" },
  "pdfMergeSelected":          { "fr": "Fusionner les pages sélectionnées", "en": "Merge selected pages" },
  "pdfRebuildFromSelection":   { "fr": "Reconstruire le PDF (sélection uniquement)", "en": "Rebuild PDF (selection only)" },
  "pdfPreviewInProgress":      { "fr": "Génération des aperçus en cours...", "en": "Generating previews..." },
  "pdfPreviewComplete":        { "fr": "Aperçu terminé — {n} pages générées", "en": "Preview complete — {n} pages generated" },
  "pdfPreviewError":           { "fr": "Erreur aperçu : {err}", "en": "Preview error: {err}" },
  "pdfPreviewNoPdf":           { "fr": "Aucun PDF à prévisualiser", "en": "No PDF to preview" },
  "pdfMergeComplete":          { "fr": "Fusion terminée : {file}", "en": "Merge complete: {file}" },
  "pdfRebuildComplete":        { "fr": "PDF reconstruit : {file}", "en": "PDF rebuilt: {file}" },
  "pdfPageLoadError":          { "fr": "Erreur chargement page {n} : {err}", "en": "Error loading page {n}: {err}" }
}
```

Note : `pdfReopenPage` et `pdfPreviewPagesShown` ne sont plus nécessaires (pas de troncation,
pas de bouton reopen séparé — le clic sur la miniature directly fetch la page full-quality).

---

## États UI

### Nouveaux états ajoutés à `state`

```js
// Dans app-pdf.js
state.pdfPreviewData = null;    // { results: [...] } retourné par l'API preview
state.pdfPreviewSelection = {}; // Map { "/dir/doc1.pdf": Set([1, 2, 3, ...]) }
state.pdfPreviewMode = false;   // true = colonne droite affiche les miniatures
state.pdfPageModal = null;      // { path, page, dataUrl } | null — modal ouvert
```

### Sélection initiale en mode preview

- Par défaut, toutes les pages de tous les PDFs sélectionnés sont cochées.
- `state.pdfPreviewSelection[path] = Set(1..result.pageCount)` pour chaque résultat.

### Sélection par thumbnail

- Clic sur la checkbox → toggle de la page dans `state.pdfPreviewSelection[path]`.
- Clic sur l'image elle-même → toggle également (UX plus directe).
- Si toutes les pages d'un PDF sont décochées, le PDF entier passe en visuel désélectionné.

### Modal page individuelle

- `state.pdfPageModal` stocke la page en cours de visualisation.
- Clic sur miniature → showLoader → `GET /api/pdf/page?path=...&page=N&width=1200` → stocker `dataUrl` → ouvrir modal `renamer-modal`.
- Le modal affiche `<img src="{dataUrl}" style="max-width:100%;max-height:80vh;">`.
- Fermeture : clic overlay, bouton ×, touche Escape.
- Navigation ← → dans le modal pour aller à la page précédente/suivante du même PDF
  (réutilise le `dataUrl` du thumbnail pour la nav rapide, fetch full-quality seulement si on veut zoomer).

---

## Comportement frontend — flux complet

### Entrée dans le mode preview

1. Utilisateur clique sur **Aperçu PDF sélectionnés** (`#pdf-action-preview`).
2. Si rien n'est sélectionné → toast `pdfPreviewNoPdf`, stop.
3. `showLoader(ctx, selected.length)` — affiche la progression.
4. Appel `POST /api/pdf/preview` avec `{ paths: selected, thumbnailWidth: 150 }`.
   - Toutes les pages sont retournées en miniatures JPEG (~3-8 KB chacune).
5. Sur réponse :
   - `state.pdfPreviewData = result.results`
   - `state.pdfPreviewMode = true`
   - Initialiser `state.pdfPreviewSelection` : pour chaque PDF résultat, `Set(1..pageCount)`.
6. `renderPreview(ctx)` — remplace le contenu de `#pdf-preview-list` par les miniatures.
7. `hideLoader()`.

### Sortie du mode preview

- Clic sur **← Retour à la liste** → `state.pdfPreviewMode = false`, `render(ctx)` (liste classique).

### Clic sur une miniature (zoom)

1. Clic sur l'image (pas la checkbox) → `openPageModal(ctx, path, pageNum)`.
2. `showLoader(ctx)` mini dans la miniature pendant le chargement.
3. `GET /api/pdf/page?path={path}&page={pageNum}&width=1200`.
4. Sur réponse → ouvrir `renamer-modal` avec `<img src="{dataUrl}">`.
5. Dans le modal : boutons ← → pour naviguer entre les pages du même PDF
   (navigation instantanée via les `thumbDataUrl` du batch, pas de re-fetch).
6. Bouton **"Qualité originale"** → fetch `GET /api/pdf/page` pour la page courante si l'utilisateur
   veut zoomer sur du texte (le thumbnail est juste pour reconnaître, pas pour lire).
7. Fermeture modal → `state.pdfPageModal = null`.

### Validation avant actions Merge/Rebuild

- Les boutons sont `disabled` tant qu'aucune page n'est sélectionnée.
- `disabled` également si `Object.values(state.pdfPreviewSelection).every(s => s.size === 0)`.

---

## Merge PDF — à implémenter après la preview

### Principe

L'utilisateur sélectionne des pages (via les checkboxes des miniatures) issues d'un ou plusieurs PDFs,
puis clique sur **Fusionner les pages sélectionnées**.

### Route backend (future)

```
POST /api/pdf/merge
Body: { selections: [{ path: "/dir/a.pdf", pages: [1, 3, 5] }, ...] }
```

### Implémentation backend — stratégie

Deux approches possibles, par ordre de préférence :

**A. `pdftk`** (si disponible) :
```bash
pdftk A=doc1.pdf B=doc2.pdf cat A1 A3 A5 B2 output merged.pdf
```
→ Simple, natif, pas de réencodage.

**B. Ghostscript** (`gs`) :
```bash
gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite \
   -dFirstPage=1 -dLastPage=1 -sOutputFile=page1.pdf doc1.pdf
gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite \
   -dFirstPage=3 -dLastPage=3 -sOutputFile=page3.pdf doc1.pdf
# ... puis concaténation via ZipArchive (PDF est un sous-ensemble de PDF)
```
→ Plus lent, réécrit chaque page, mais `gs` est très répandu.

**C. PHP seul** : impossible de manipuler la structure interne d'un PDF sans lib.

**Décision** : implémenter d'abord l'approche A (`pdftk`), avec un check à l'initialisation
du service. Si absent, afficher un message d'erreur clair et proposer Ghostscript comme alternative
(à investiguer ultérieurement).

---

## Rebuild PDF — à implémenter après la preview

### Principe

Même sélection de pages, mais on reconstruit **un seul PDF** par fichier source,
en ne gardant que les pages cochées. Le fichier résultant remplace ou est sauvegardé
à côté de l'original (ex: `doc (extrait).pdf`).

### Route backend (future)

```
POST /api/pdf/rebuild
Body: { selections: [{ path: "/dir/doc1.pdf", pages: [2, 4] }] }
```

→ Retourne `{ rebuilt: [{ from, to }], errors: [...] }`.

Utilise la même logique que merge mais un PDF à la fois, sauvegarde dans le même dossier.

---

## Fallback — si `pdftoppm` absent

Si `pdftoppm` n'est pas trouvé sur le serveur :

1. Vérifier Imagick : si installé, utiliser `Imagick::readImage()` + `setImageResolution()` + `setImageFormat('png')`.
   - **Non portable** : à bannir en dépendance de production, garder comme fallback optionnel
     avec un avertissement dans le log.
2. Si rien n'est disponible : retourner une erreur claire `"pdftoppm (poppler-utils) requis pour les aperçus PDF"`.
   - Le CBZ fonctionne toujours sans preview, donc pas de blocage de l'onglet.

---

## Ordre de implémentation suggéré

| Phase | Contenu |
|---|---|
| **P1** | `PdfService::previewPdf()` + route `POST /api/pdf/preview`, card + bouton dans l'onglet, rendu des miniatures JPEG en batch, back-to-list |
| **P2** | `PdfService::renderPage()` + route `GET /api/pdf/page`, modal full-quality au clic thumbnail, navigation ← → dans le modal |
| **P3** | Checkbox sélection dans les miniatures, boutons Merge/Rebuild (stub backend) |
| **P4** | Route `POST /api/pdf/merge` + `POST /api/pdf/rebuild`, implémentation `pdftk` |
| **P5** | Drag-and-drop des miniatures pour réordonner les pages avant merge/rebuild |
| **P6** | Améliorations : lazy-load natif `loading="lazy"` sur les `<img>`, cache serveur optionnel des thumbs |

---

## Contraintes non négociables

- ❌ Pas d'Imagick comme dépendance de production.
- ❌ Pas de layout en colonne unique.
- ❌ Pas de bouton isolé en footer.
- ❌ Pas de chargement automatique de preview à l'ouverture de l'onglet (action explicite).
- ❌ Pas d'auto-merge ou auto-rebuild sans action utilisateur.
- ❌ Pas de modification de l'API existante (`/api/pdf/convert-cbz` reste inchangé).
- Pas de suppression ni altération de l'onglet renamer/advanced.
