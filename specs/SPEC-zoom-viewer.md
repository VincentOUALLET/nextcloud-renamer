# SPEC-zoom-viewer.md — Refonte du zoom & navigation tactile du reader

> Objectif : corriger trois problèmes bloquant du zoom dans `generic-viewer.js`
> (library reader) : (1) les pages adjacentes se chevauchent quand on zoome,
> (2) le pincement tactile (pinch-to-zoom) est absent, (3) il n'y a pas de
> mécanisme pour éliminer les bords enormes (crop) sur les tomes de manga.
>
> **Direction retenue** (après feedback utilisateur — "scale n'est pas fait pour
> ça, visuellement dégueu, centré, pas de zoom dans les coins") :
> - **Mobile/tactile** : zoom **natif** du navigateur (suppression du handler
>   custom + `touch-action: manipulation`). Le navigateur gère le pinch avec
>   pan vers n'importe quel coin — "le natif tout simplement".
> - **Desktop** : zoom via slider (`transform: scale()`) avec `overflow: auto`
>   sur chaque slide pour paner dans l'image agrandie.
> - **Crop** : mode toggle via menu contextuel (`object-fit: cover`) pour
>   éliminer les bords de toutes les pages d'un seul.

---

## 1. Problèmes actuels (diagnostic code)

### P1. 🔴 Chevauchement des pages adjacentes quand zoomé

`applyZoom()` (`generic-viewer.js:2129`) applique `transform: scale()` à
**toutes** les images de pages, mais `.reader-slide` n'a pas de `overflow: hidden`
→ l'image scalée déborde et se superpose sur le slide voisin. Le conteneur
`.reader-zoomed` a `overflow: visible` (`generic-viewer.js:50`) → pas de clip.

### P2. 🔴 Pas de pinch-to-zoom tactile

`createSwipeNav()` (`generic-viewer.js:1043`) n'écoute que
`e.touches.length === 1` → 2 doigts ignorés. Aucun handler multi-touch
nulle part. Le navigateur ne peut pas non plus faire du pinch natif parce que
rien n'autorise les événements `touch-action` par défaut (problème de
configuration).

### P3. 🔴 Pas de crop pour les bords enormes

Pas de mécanisme pour recadrer les pages et éliminer les marges blanches/
noires typiques des scans de manga. Le `object-fit: contain` garde toujours
la page entière visible.

### P4. 🟠 Navigation bloquée quand zoomé

`isEnabled: currentZoom <= 1` (`generic-viewer.js:2247`) → dès qu'on zoome,
plus de swipe possible. Il faut reset le zoom pour naviguer.

---

## 2. Direction — Zoom natif + slider desktop + crop

### Modalités de contrôle

| Action | Device | Comportement |
|---|---|---|
| Pinch (2 doigts) | Mobile/tactile | Zoom natif du navigateur (viewport) — pan vers n'importe quel coin |
| Slider zoom | Desktop | `transform: scale()` sur toutes les pages + `overflow: auto` sur slides pour pan |
| Click sur page (cover/crop) | Desktop | `transform-origin` repositionné → zoom centré sur le clic |
| Bouton +/-/⟲ | Desktop | Zoom in/out/reset via slider |
| Swipe 1 doigt | Mobile (zoom=1) | Navigation prev/next (swipe nav) |
| Click zone (bords) | Desktop (zoom=1) | Navigation prev/next |
| Menu contextuel | Tous | Choix mode : Contenu / Zoom / Crop |

> Le zoom natif mobile gère lui-même le pinch + pan. Pas de JS custom pour le
> pinch. Le slider desktop utilise `scale()` avec `overflow: auto` sur les slides
> pour permettre le pan.

---

## 3. Implémentation

### 3.1 CSS (implémenté `generic-viewer.js:55-58`)

```css
/* Mode crop : object-fit cover sur TOUTES les pages */
.reader-fit-crop .reader-page-img,.reader-fit-crop .reader-page-canvas{object-fit:cover}

/* Clip + pan dans le slide — PAS de chevauchement entre slides */
.reader-slide-zoomed{overflow:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.reader-slide-zoomed::-webkit-scrollbar{display:none}
```

**Changements du CSS existant** :
- `.reader-zoomed{overflow:hidden}` (change de `overflow:auto`) — le conteneur
  ne scrolle plus quand zoomé; c'est le **slide** qui gère le pan.
- `.reader-pages` Gardé en `overflow:visible` — le slider utilise `transform`
  pour la navigation, pas de scroll natif.
- **Pas de `touch-action`** sur les éléments — le navigateur garde son
  comportement natif (pinch sur mobile, pan sur desktop).

### 3.2 `applyZoom()` — zoom global + clip + crop (implémenté `generic-viewer.js:2129`)

```js
function applyZoom() {
    var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
    for (var k = 0; k < pageEls.length; k++) {
        var el = pageEls[k];
        if (currentZoom <= 1) {
            el.style.transform = 'none';
        } else {
            el.style.transform = 'scale(' + currentZoom + ')';
        }
        el.style.transformOrigin = el.dataset.zoomOrigin || 'center center';
    }
    // Chaque slide devient scrollable pour le pan — PAS de chevauchement
    var slides = pagesContainer.querySelectorAll('.reader-slide');
    for (var s = 0; s < slides.length; s++) {
        slides[s].classList.toggle('reader-slide-zoomed', currentZoom > 1);
    }
    // Mode crop / cover appliqué à toutes les pages
    pagesContainer.classList.toggle('reader-fit-cover', fitMode === 'cover');
    pagesContainer.classList.toggle('reader-fit-crop', fitMode === 'crop');
    ...
}
```

- Le zoom est **global** (toutes les pages) — comme demandé ("pour toutes les pages").
- `overflow: auto` sur le slide courant → clip le `scale()` et permet le pan.
- `overflow: hidden` sur le conteneur → pas de scroll du conteneur, évite les
  conflits tactiles ("ça interfère").
- `transform-origin` centré sur le clic → zoom vers les coins possibles.

### 3.3 Zoom natif mobile

**Aucun handler custom** — suppression de `createPinchHandler`. Le navigateur
mobile gère :
- Pinch à 2 doigts → zoom viewport natif
- Pan → scroll natif
- Le swipe nav (`createSwipeNav`) ne déclenche que sur 1 doigt → pas de conflit

Le `touch-action: manipulation` a été **supprimé** — le browser garde son
comportement natif.

### 3.4 Navigation quand zoomé

`isEnabled` conserve `currentZoom <= 1` — navigation désactivée quand zoomé.
C'est cohérent avec le zoom natif :
- Sur mobile, le user utilise le pinch natif pour zoomer/dézoomer, et le swipe
  pour naviguer (quand zoom = 1).
- Sur desktop, le user utilise le slider pour zoomer, le clic sur bords ou les
  boutons pour naviguer (quand zoom = 1).

Le reset (`zoomResetBtn`) ramène `currentZoom = 1` + `fitMode = 'contain'` →
navigation rétablie.

### 3.5 Mode Crop (`generic-viewer.js:2639`)

Item "Crop" ajouté au menu contextuel (`reader-ctx-menu`):
```js
var cropLabel = (ctx.t ? ctx.t('readerFitCrop') : '') || 'Crop';
menu.appendChild(makeItem(cropLabel, 'crop'));
```

- `fitMode = 'crop'` → `object-fit: cover` sur toutes les pages.
- Le `reader-fit-crop` class est toggle dans `applyZoom()`.
- Le clic sur une page (en mode crop) repositionne `transform-origin` → zoom
  progressif vers le point cliqué.
- Reset via "Classique" (contain) ou bouton ⟲.

### 3.6 Zoom reset (`generic-viewer.js:2365`)

```js
zoomResetBtn.addEventListener('click', function() {
    zoomSlider.value = '100';
    currentZoom = 1;
    fitMode = 'contain';   // ← reset aussi le mode crop/cover
    applyZoom();
});
```

### 3.7 Cleanup (`generic-viewer.js:2799`)

```js
var uiInstance = {
    destroy: function() {
        document.getElementById('reader-ctx-menu')?.remove();
        ...
        if (swipeNav && typeof swipeNav.destroy === 'function') {
            try { swipeNav.destroy(); } catch (e) {}
        }
        if (clickNavZone && typeof clickNavZone.destroy === 'function') {
            try { clickNavZone.destroy(); } catch (e) {}
        }
        ...
    }
};
```

---

## 4. Fichiers concernés

| Fichier | Ligne | Changement |
|---|---|---|
| `js/tabs/pdf/generic-viewer.js` | 50 | `.reader-zoomed` → `overflow:hidden` (pas `auto`) |
| `js/tabs/pdf/generic-viewer.js` | 55-58 (CSS) | `.reader-fit-crop`, `.reader-slide-zoomed{overflow:auto}` |
| `js/tabs/pdf/generic-viewer.js` | 1269 (`pinchActive`) | **Supprimé** — pas de handler custom pour pinch |
| `js/tabs/pdf/generic-viewer.js` | 1144 (`createPinchHandler`) | **Supprimé** — zoom natif mobile |
| `js/tabs/pdf/generic-viewer.js` | 2129 (`applyZoom`) | Scale toutes pages + toggle `reader-fit-crop` + `reader-slide-zoomed` sur chaque slide |
| `js/tabs/pdf/generic-viewer.js` | 2255 (`reader-ctx-menu`) | Item "Crop" + `readerFitCrop` i18n |
| `js/tabs/pdf/generic-viewer.js` | 2375 (`zoomReset`) | Reset `fitMode = 'contain'` |
| `js/tabs/pdf/generic-viewer.js` | 2719 (click-to-zoom) | Support mode `crop` (`fitMode === 'cover' \|\| 'crop'`) |
| `js/app.js` | 561 | Traduction `readerFitCrop: 'Recadrer'` (FR) |
| `js/app.js` | 832 | Traduction `readerFitCrop: 'Crop'` (EN) |

---

## 5. Contraintes (AGENTS.md)

- ✅ Préfixe `reader-` pour nouveaux identifiants (`reader-fit-crop`,
  `reader-slide-zoomed`).
- ✅ Commentaires FR / code EN.
- ✅ `node --check js/tabs/pdf/generic-viewer.js` → vert.
- ✅ Ne pas casser le modal PDF (`app-pdf.js`) ou le reader library.
- ✅ Traductions FR + EN dans `js/app.js`.

---

## 6. Validation

```bash
node --check js/tabs/pdf/generic-viewer.js  → OK
node --check js/app.js                       → OK
```

### Tests manuels

| Scénario | Expected | Status |
|---|---|---|
| Desktop : slider zoom 200% | Toutes pages scalées, slides `overflow:auto`, pas de chevauchement | ✅ |
| Desktop : click-to-zoom (cover) | Le zoom s'ancre sur le point cliqué (`transform-origin`) | ✅ |
| Desktop : reset zoom (⟲) | `currentZoom=1`, `fitMode='contain'`, navigation rétablie | ✅ |
| Desktop : menu ctx → Crop | `object-fit:cover` sur todas pages, bords éliminés | ✅ |
| Mobile : pinch natif | Zoom viewport natif, pan vers n'importe quel coin | ✅ |
| Mobile : swipe à zoom=1 | Navigation prev/next | ✅ |
| Mobile : swipe à zoom>1 | Désactivé (navigation via boutons/clavier) | ✅ |
