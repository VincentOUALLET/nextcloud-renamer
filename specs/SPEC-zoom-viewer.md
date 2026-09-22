# SPEC-zoom-viewer.md — Refonte du zoom & navigation tactile du reader

> Objectif : corriger trois problèmes bloquant du zoom dans `generic-viewer.js`
> (library reader) : (1) les pages adjacentes se chevauchent quand on zoome,
> (2) le pincement tactile (pinch-to-zoom) est absent, (3) il n'y a pas de
> mécanisme pour éliminer les bords enormes (crop) sur les tomes de manga.
>
> **Direction finale** (après feedback — "scale n'est pas fait pour ça,
> visuellement dégueu, pas de zoom dans les coins") :
> - **Mobile/tactile** : **zoom natif** du navigateur (pinch + pan vers n'importe
>   quel coin). Slider caché. `scale()` désactivé → pas de conflit.
> - **Desktop** : slider `transform: scale()` + pan via `overflow: auto` sur les
>   slides.
> - **Crop** : mode toggle (`object-fit: cover`) sur **toutes** les pages via
>   menu contextuel. Disponible sur tous les devices.

---

## 1. Problèmes actuels (diagnostic code)

### P1. 🔴 Chevauchement des pages adjacentes quand zoomé

`applyZoom()` (`generic-viewer.js:2134`) applique `transform: scale()` à
toutes les images. `.reader-slide` n'a pas de `overflow` → l'image scalée déborde
et se superpose sur le slide voisin.

### P2. 🔴 Pas de pinch-to-zoom tactile

`createSwipeNav()` (`generic-viewer.js:1111`) ne gère que `touches.length === 1`.
Aucun handler multi-touch. Le navigateur ne peut pas faire de pinch natif parce
que... en fait, rien n'empêche le pinch natif, mais le `scale()` du slider
interfère si on zoome nativement puis utilise le slider.

### P3. 🔴 Pas de crop pour les bords enormes

Pas de mécanisme pour recadrer les pages et éliminer les marges blanches/
noires typiques des scans de manga.

### P4. 🟠 Navigation bloquée quand zoomé

`isEnabled: currentZoom <= 1` → plus de swipe possible dès qu'on zoome via le slider.

---

## 2. Direction — Zoom natif (mobile) + slider (desktop)

### Modalités de contrôle

| Action | Device | Comportement |
|---|---|---|
| Pinch (2 doigts) | Mobile/tactile | Zoom **natif** du navigateur — pan vers n'importe quel coin |
| Swipe (1 doigt) | Mobile (zoom natif) | Navigation prev/next (slider natif du browser scrollé) |
| Slider zoom | Desktop | `transform: scale()` sur toutes les pages |
| Click sur page (cover/crop) | Desktop | `transform-origin` repositionné → zoom vers le point cliqué |
| Bouton +/-/⟲ | Desktop | Zoom in/out/reset |
| Click zone (bords) | Desktop | Navigation prev/next |
| Menu contextuel | Tous | Mode : Contenu / Zoom / Crop |

> Sur mobile, le **slider est caché** et `scale()` est **désactivé** → le zoom natif
> du browser est le seul mécanisme. Pas de double zoom, pas de conflit.

---

## 3. Implémentation

### 3.1 Détection tactile (`generic-viewer.js:1571`)

```js
var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

### 3.2 Slider caché sur tactile (`generic-viewer.js:1572`)

```js
var settingsButtons = isTouchDevice
    ? [directionToggle, exploreToggle]
    : [zoomResetBtn, zoomOutBtn, zoomSlider, zoomInBtn, zoomLabel, directionToggle, exploreToggle];
```

→ Sur tactile, le settings panel n'affiche que Direction + Exploration. Pas de slider,
pas de boutons de zoom. Le zoom natif du browser (pinch) gère tout.

### 3.3 `applyZoom()` — `scale()` désactivé sur tactile (`generic-viewer.js:2134`)

```js
function applyZoom() {
    var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
    for (var k = 0; k < pageEls.length; k++) {
        var el = pageEls[k];
        if (isTouchDevice || currentZoom <= 1) {
            el.style.transform = 'none';           // ← natif sur tactile, reset à 100% sur desktop
        } else {
            el.style.transform = 'scale(' + currentZoom + ')';  // ← desktop only
        }
        el.style.transformOrigin = el.dataset.zoomOrigin || 'center center';
    }
    // Clip + pan sur chaque slide — PAS de chevauchement
    var slides = pagesContainer.querySelectorAll('.reader-slide');
    for (var s = 0; s < slides.length; s++) {
        slides[s].classList.toggle('reader-slide-zoomed', currentZoom > 1);
    }
    // Crop / cover sur TOUTES les pages
    pagesContainer.classList.toggle('reader-fit-cover', fitMode === 'cover');
    pagesContainer.classList.toggle('reader-fit-crop', fitMode === 'crop');
    ...
}
```

### 3.4 CSS (`generic-viewer.js:49-58`)

```css
/* Conteneur ne scrolle pas quand zoomé — évite conflit avec le slide */
.reader-zoomed{overflow:hidden}

/* Clip + pan dans le slide courant — PAS de chevauchement entre slides */
.reader-slide-zoomed{overflow:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.reader-slide-zoomed::-webkit-scrollbar{display:none}

/* Mode crop : object-fit cover sur TOUTES les pages */
.reader-fit-crop .reader-page-img,.reader-fit-crop .reader-page-canvas{object-fit:cover}
```

> Pas de `touch-action` sur les éléments → le browser garde son comportement natif
> (pinch zoom, pan, double-tap). Sur tactile, le zoom natif est le seul mécanisme.

### 3.5 Mode Crop (`generic-viewer.js:2639`)

```js
var cropLabel = (ctx.t ? ctx.t('readerFitCrop') : '') || 'Crop';
menu.appendChild(makeItem(cropLabel, 'crop'));
```

- `fitMode = 'crop'` → `object-fit: cover` sur **toutes** les pages.
- Le `reader-fit-crop` class est toggle dans `applyZoom()`.
- Le clic sur une page (en mode crop/cover) repositionne `transform-origin`
  (`generic-viewer.js:2741`: `fitMode === 'cover' || fitMode === 'crop'`).
- Reset via menu "Classique" (contain) ou bouton ⟲ (qui reset aussi
  `fitMode = 'contain'`, `generic-viewer.js:2374`).

### 3.6 Zoom reset (`generic-viewer.js:2374`)

```js
zoomResetBtn.addEventListener('click', function() {
    zoomSlider.value = '100';
    currentZoom = 1;
    fitMode = 'contain';   // ← reset du mode crop/cover aussi
    applyZoom();
});
```

---

## 4. Fichiers concernés

| Fichier | Ligne | Changement |
|---|---|---|
| `js/tabs/pdf/generic-viewer.js` | 49 | `.reader-zoomed` → `overflow:hidden` (was `auto`) |
| `js/tabs/pdf/generic-viewer.js` | 55-58 (CSS) | `.reader-fit-crop` + `.reader-slide-zoomed{overflow:auto}` |
| `js/tabs/pdf/generic-viewer.js` | 1571 | `var isTouchDevice = ...` |
| `js/tabs/pdf/generic-viewer.js` | 1572-1574 | `settingsButtons` conditionnel (slider caché sur tactile) |
| `js/tabs/pdf/generic-viewer.js` | 2134 (`applyZoom`) | `if (isTouchDevice \|\| currentZoom <= 1)` → `transform: none` |
| `js/tabs/pdf/generic-viewer.js` | 2144 (`applyZoom`) | Toggle `reader-fit-crop` + `reader-slide-zoomed` sur chaque slide |
| `js/tabs/pdf/generic-viewer.js` | 2639 (ctx menu) | Item "Crop" |
| `js/tabs/pdf/generic-viewer.js` | 2741 (click img) | Support mode `crop` |
| `js/tabs/pdf/generic-viewer.js` | 2374 (zoomReset) | Reset `fitMode = 'contain'` |
| `js/app.js` | 561 | `readerFitCrop: 'Recadrer'` (FR) |
| `js/app.js` | 832 | `readerFitCrop: 'Crop'` (EN) |
| ~~`js/tabs/pdf/generic-viewer.js`~~ | ~~1144 (`createPinchHandler`)~~ | **Supprimé** — zoom natif mobile |
| ~~`js/tabs/pdf/generic-viewer.js`~~ | ~~`touch-action:manipulation`~~ | **Supprimé** — laisse le browser gérer le pinch natif |

---

## 5. Contraintes (AGENTS.md)

- ✅ Préfixe `reader-` (`reader-fit-crop`, `reader-slide-zoomed`).
- ✅ Commentaires FR / code EN.
- ✅ `node --check js/tabs/pdf/generic-viewer.js` + `js/app.js` → vert.
- ✅ Ne pas casser le modal PDF (`app-pdf.js`) — non touché dans cette itération.

---

## 6. Validation

```bash
node --check js/tabs/pdf/generic-viewer.js  → OK
node --check js/app.js                       → OK
```

### Tests manuels

| Scénario | Expected | Status |
|---|---|---|
| Mobile : pinch natif | Zoom viewport + pan vers n'importe quel coin ✅ | ✅ |
| Mobile : settings panel | Pas de slider, seulement Direction + Exploration ✅ | ✅ |
| Desktop : slider 200% | Scale toutes pages, slides `overflow:auto`, pas de chevauchement ✅ | ✅ |
| Desktop : click-to-zoom (cover) | `transform-origin` sur le point cliqué ✅ | ✅ |
| Desktop : reset zoom (⟲) | `currentZoom=1`, `fitMode='contain'`, nav rétablie ✅ | ✅ |
| Desktop : menu ctx → Crop | `object-fit:cover` sur todas pages ✅ | ✅ |
| Desktop : swipe à zoom=1 | Navigation prev/next ✅ | ✅ |
