# SPEC-zoom-viewer.md — Refonte du zoom & navigation tactile du reader

> Objectif : corriger trois problèmes bloquants du zoom dans `generic-viewer.js`
> (library reader) : (1) les pages adjacentes se chevauchent quand on zoome,
> (2) le pincement tactile (pinch-to-zoom) est absent, (3) il n'y a pas de
> mécanisme pour éliminer les bords enormes (crop) sur les tomes de manga.
>
> **Vision globale** : la navigation entre pages (1 doigt / clic zone) et le
> zoom tactile (2 doigts / pinch) doivent fonctionner **en parallèle**. Le pinch
> contrôle un **zoom/crop global** appliqué à **toutes** les pages visibles —
> utile pour éliminer les bords des scans de manga d'un seul geste.
>
> Le tout **sans casser** les transitions de navigation entre pages (slider
> `translateX/translateY` + `scroll-snap`) ni le modal PDF (`app-pdf.js`).

---

## 1. Problèmes actuels (diagnostic code)

### P1. 🔴 Chevauchement des pages adjacentes quand zoomé

**Cause** : `applyZoom()` (`generic-viewer.js:2121`) applique `transform: scale()`
à **toutes** les images de pages (`.reader-page-img, .reader-page-canvas`) :

```js
function applyZoom() {
    var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
    for (var k = 0; k < pageEls.length; k++) {
        pageEls[k].style.transform = 'scale(' + currentZoom + ')';  // ← TOUS les slides
    }
}
```

Structure DOM :

```
.reader-container
  .reader-pages          → transform: translateX(-N%)  (slider de navigation)
  .reader-slide          → flex:0 0 100%  (pas de overflow:hidden)
    .reader-page-img     → scale(currentZoom)  ← déborde du slide
  .reader-slide
    ...
```

- `.reader-slide` n'a **pas** de `overflow: hidden` → l'image scalée déborde
  et se superpose sur le slide voisin.
- `overflow: visible` sur `.reader-pages` (`generic-viewer.js:15`) et
  `.reader-zoomed .reader-pages{overflow:visible}` (`generic-viewer.js:50`).

**Résultat visuel** : "si on zoom les images de droite et gauche de la courante
se chevauchent par dessus, c'est pas beau du tout."

### P2. 🔴 Pas de pinch-to-zoom tactile

**Cause** : `createSwipeNav()` (`generic-viewer.js:1043`) n'écoute que les
**touches uniques** :

```js
function onTouchStart(e) {
    if (!isEnabled()) return;
    if (e.touches && e.touches.length === 1) {   // ← ignore 2 doigts
        ...
    }
}
```

- Aucun gestionnaire `touchstart` avec `e.touches.length >= 2` nulle part.
- Les événements multi-touch sont swallowed mais jamais interprétés.
- Le modal PDF (`app-pdf.js`) a **le même défaut** (`createSwipeNav` identique,
  `app-pdf.js:68`).

→ "on peut pas zoomer avec le tactile 'en pincant', ce qui est la base."

### P3. 🔴 Pas de crop pour les bords enormes

- Pas de mécanisme pour "recadrer" une page pour éliminer les marges
  blanches/noires typiques des scans de manga.
- Le `object-fit: contain` garde toujours la page entière visible — les bords
  sont impossibles à éliminer sans un mode "crop".

### P4. 🟠 Navigation bloquée quand zoomé

- Dès que `currentZoom > 1`, `createSwipeNav.isEnabled` retourne `false`
  (`generic-viewer.js:2182` / `app-pdf.js:1131`) → **plus de swipe possible**.
- Il faut reset le zoom (bouton `reader-zoom-reset`) pour pouvoir naviguer
  à nouveau → UX cassée.

---

## 2. Vision — Navigation + Pinch to Zoom en parallèle

Le user a exprimé clairement :

> "je veux un mode où ça reste à la navigation entre pages... le zoom natif tactile
> doit aussi être pensé, **mais indépendemment**, ou alors **le banger** serait que
> l'on puisse gérer les 2 en parallèle, de sorte à utiliser le pinch pour contrôler
> un zoom / type crop pour **toutes les pages**"

### Modalité retenue

| Gesture | Doigt | Action |
|---|---|---|
| 1 doigt → glisse | 1 | Navigation prev/next page (slider) |
| 2 doigts → pincer | 2 | Zoom/crop **global** sur toutes les pages visibles |
| Molette souris / `Ctrl+/-` | — | Zoom/crop global (desktop) |
| Clic sur page (mode crop activé) | 1 | Recentrage du crop sur le point cliqué |

### Principe du "banger" — Zoom/crop global appliqué à TOUTES les pages

Contrairement à l'approche "zoom isolé à la page courante" (qui bloque la nav),
le pinch applique un **même zoom/crop à toutes les pages** :

- **Zoom** : `scale()` identique sur toutes les images (pas de chevauchement
  grâce à `overflow: hidden` sur chaque slide).
- **Crop** : un mode toggle (menu contextuel) élimine les bords de **toutes**
  les pages via `object-fit: cover` + `object-position` ajustable. Le pinch
  contrôle ensuite l'**amplification** (centrage sur le crop).
- Le résultat : un manga avec gros plans noirs est "débordé" (crop) une fois
  pour toute, et le user zoome/dézoome via le pinch sans jamais perdre la
  capacité de naviguer (1 doigt = nav, 2 doigts = zoom).

---

## 3. Exigences

### E1. Navigation toujours disponible (1 doigt)

- Le swipe entre pages fonctionne **même quand zoomé**, dès qu'un seul doigt
  est utilisé.
- Pendant un pinch (2 doigts), le swipe est **temporairement suspendu** —
  dès qu'un doigt lâche, le swipe reprend.

### E2. Pinch-to-zoom global (2 doigts)

- `touchstart` avec 2 points → entre en mode "pinch", désactive le swipe.
- `touchmove` → `scale = distance actuelle / distance initiale` → `currentZoom`
  mis à jour → `applyZoom()` scale **toutes** les pages.
- `touchend` (dépasse 1 doigt) → sort du mode pinch. Si le second doigt reste,
  le swipe est toujours désactivé (on est encore en pinch).
- Range : `1.0` (100%) à `3.0` (300%).

### E3. Clip overflow — pas de chevauchement

`.reader-slide` reçoit `overflow: hidden` **quand zoomé** pour que l'image
scalée reste contenue — pas de rendering hors-bounds, pas de chevauchement
entre slides adjacents.

### E4. Pan fluide quand zoomé

- Le conteneur `.reader-pages` devient `overflow: auto` quand `currentZoom > 1`.
- Le pan se fait sur l'axe du scroll (horizontal pour lecture verticale, etc.).
- La `transition: transform 0.3s` du slider est **temporairement désactivée**
  pendant le pan pour éviter le "glissement" du slide.

### E5. Mode Crop (éliminer les bords — toutes les pages)

- Toggle dans le menu contextuel (`reader-ctx-menu`) : item "Crop" en plus de
  "Zoom" / "Classique".
- En mode crop : `object-fit: cover` + `object-position` centré sur le contenu.
- Le pinch agit comme un **amplificateur de crop** : à `zoom=1`, le crop montre
  la page recadrée à 100 % ; à `zoom>1`, le crop est "zoomé" (centrage sur le
  point central du pinch / du clic).
- Le crop est **provisoire** (session) : reset au changement de fichier.

### E6. Transitions de navigation préservées

- Le slider garde `transition: transform 0.3s cubic-bezier(...)` en mode nav.
- `scroll-snap-type: x mandatory` + `scroll-snap-align: center` sur les slides.
- Le swipe 1-dof reprend immédiatement après la fin du pinch.

---

## 4. Architecture proposée

### 4.1 State global

```js
var currentZoom = 1.0;          // 1.0 = 100% (appliqué à TOUTES les pages)
var zoomMode = 'contain';       // 'contain' | 'crop' | 'cover'
var pinchActive = false;        // true pendant un geste à 2 doigts
var swipeNavEnabled = true;     // true sauf pendant pinch
```

### 4.2 `applyZoom()` — zoom global, pas isolé

```js
function applyZoom() {
    var pageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
    for (var k = 0; k < pageEls.length; k++) {
        var el = pageEls[k];
        if (currentZoom > 1) {
            el.style.transform = 'scale(' + currentZoom + ')';
            el.style.transformOrigin = el.dataset.zoomOrigin || 'center center';
        } else {
            el.style.transform = 'none';
        }
    }
    // Mode crop/cover appliqué à toutes les pages
    pagesContainer.classList.toggle('reader-fit-cover', zoomMode === 'cover');
    pagesContainer.classList.toggle('reader-fit-crop', zoomMode === 'crop');

    // overflow clip sur slides pour éviter le chevauchement
    var slides = pagesContainer.querySelectorAll('.reader-slide');
    for (var s = 0; s < slides.length; s++) {
        slides[s].style.overflow = currentZoom > 1 ? 'hidden' : '';
    }
}
```

### 4.3 CSS à ajouter/modifier

```css
/* Clip le contenu zoomé dans chaque slide — PAS de chevauchement */
.reader-slide.reader-slide-zoomed {
    overflow: hidden;
}

/* Le conteneur devient scrollable pour le pan quand zoomé */
.reader-zoomed .reader-pages {
    overflow: auto;   /* ← CHANGER de 'visible' (generic-viewer.js:50) */
}

/* Mode crop : object-fit cover sur TOUTES les pages */
.reader-fit-crop .reader-page-img,
.reader-fit-crop .reader-page-canvas {
    object-fit: cover;
}

/* Mode crop : cursor zoom-in pour signaler l'interaction */
.reader-fit-crop .reader-page-img {
    cursor: zoom-in;
}
```

**Attention** : le CSS `generic-viewer.js:50` a
`.reader-zoomed .reader-pages{overflow:visible}` — **changer en `overflow: auto`**
pour le pan. Mais le slider a `transition: transform 0.3s` — en mode pan, désactiver
la transition (`transition: none`) pour éviter le glissement du slide.

### 4.4 Pinch handler — nouveau module `createPinchHandler`

```js
function createPinchHandler(element, callbacks) {
    var active = false;
    var startDist = 0;
    var startZoom = 1.0;

    function onTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            active = true;
            pinchActive = true;
            swipeNavEnabled = false;          // suspend le swipe 1 doigt
            var dx = e.touches[1].clientX - e.touches[0].clientX;
            var dy = e.touches[1].clientY - e.touches[0].clientY;
            startDist = Math.sqrt(dx * dx + dy * dy);
            startZoom = currentZoom;
            if (callbacks.onStart) callbacks.onStart();
        }
    }

    function onTouchMove(e) {
        if (!active || e.touches.length < 2) return;
        e.preventDefault();
        var dx = e.touches[1].clientX - e.touches[0].clientX;
        var dy = e.touches[1].clientY - e.touches[0].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        currentZoom = Math.max(1.0, Math.min(3.0, startZoom * (dist / startDist)));
        applyZoom();
        if (callbacks.onZoomChange) callbacks.onZoomChange(currentZoom);
    }

    function onTouchEnd(e) {
        if (!active) return;
        // si un doigt est toujours en contact → on reste en mode pinch
        if (e.touches.length <= 1) {
            active = false;
            pinchActive = false;
            swipeNavEnabled = true;            // rétablit le swipe
            if (callbacks.onEnd) callbacks.onEnd();
        }
    }

    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: false });

    return {
        destroy: function() {
            element.removeEventListener('touchstart', onTouchStart);
            element.removeEventListener('touchmove', onTouchMove);
            element.removeEventListener('touchend', onTouchEnd);
        }
    };
}
```

### 4.5 `createSwipeNav` — garde swipe 1 doigt, ignore 2 doigts

Le `createSwipeNav` existant gére déjà `e.touches.length === 1`. Il faut juste
vérifier que le `touchstart` de 2 doigts n'est **pas intercepté** par le swipe.
Le pinch handler est attaché au **même** élément (`pagesContainer`) mais avec
`{ passive: false }` + `e.preventDefault()` pour prioriser le pinch.

- `createSwipeNav.isEnabled` : garde `currentZoom <= 1` pour les clics zones,
  mais **autorise le swipe à currentZoom > 1** si `!pinchActive`.
- La navigation par clavier (`ArrowLeft/Right`) et la molette restent
  disponibles quoi qu'il arrive.

### 4.6 Mode crop — interaction via menu contextuel

- Ajouter un item "Crop" dans le menu contextuel (`reader-ctx-menu`,
  `generic-viewer.js:2446`).
- En mode crop, `zoomMode = 'crop'` → `object-fit: cover` sur toutes les pages.
- Le `scale()` du pinch agit *en plus* du cover crop (centrage sur le point
  du pinch ou du clic).
- Le crop est reset via l'item "Classique" (contain) ou "Zoom" (cover), ou
  au reset du zoom (`zoomResetBtn`).

---

## 5. Fichiers concernés

| Fichier | Ligne | Changement |
|---|---|---|
| `js/tabs/pdf/generic-viewer.js` | 2121 (`applyZoom`) | Scale **toutes** les pages, mais avec `overflow:hidden` sur slides + `object-fit` selon `zoomMode` |
| `js/tabs/pdf/generic-viewer.js` | 1043 (`createSwipeNav`) | Vérifier que 2 doigts ne déclenchent pas le swipe ; autoriser swipe à `zoom > 1` si `!pinchActive` |
| `js/tabs/pdf/generic-viewer.js` | 2178 (`swipeNav`) | Instancier `createPinchHandler` sur `pagesContainer` |
| `js/tabs/pdf/generic-viewer.js` | 50 (CSS) | `.reader-zoomed .reader-pages` → `overflow: auto` |
| `js/tabs/pdf/generic-viewer.js` | 12–15 (CSS) | `.reader-slide` → `overflow: hidden` quand zoomé (classe `reader-slide-zoomed`) |
| `js/tabs/pdf/generic-viewer.js` | 2446 (`contextmenu`) | Ajouter item "Crop" dans le menu ctx |
| `js/tabs/pdf/generic-viewer.js` | 2121 (`applyZoom`) | Toggle `reader-fit-crop` class sur `pagesContainer` |
| `js/tabs/pdf/generic-viewer.js` | 2656 (click sur img) | En mode crop, le clic centre le `object-position` + zoom |
| `js/tabs/pdf/generic-viewer.js` | 2704 (`uiInstance.destroy`) | Cleanup du pinch handler |
| `js/app-pdf.js` | 68 (`createSwipeNav`) | **Optionnel** : même pattern (pinch + global zoom) |
| `js/app-pdf.js` | 1014 (`applyZoom`) | Zoom global (déjà le cas) + `overflow:hidden` sur slides |

---

## 6. Contraintes (AGENTS.md)

- ✅ Préfixe `reader-` pour les nouveaux identifiants (`reader-fit-crop`,
  `reader-slide-zoomed`, etc.).
- ✅ Commentaires FR / code EN.
- ✅ Pas de `//` en JS/PHP sauf demande explicite.
- ✅ `node --check js/tabs/pdf/generic-viewer.js` + `js/app-pdf.js` avant "fini".
- ✅ Ne pas casser le modal PDF ou le reader library.

---

## 7. Phasage

| Phase | Tâche | Priorité |
|---|---|---|
| 1 | Fix P1/P3 : `applyZoom()` scale toutes les pages + `overflow:hidden` sur slides + `reader-fit-crop` CSS | Haute |
| 2 | Fix P2 : `createPinchHandler` (2 doigts) + désactive temporairement le swipe pendant pinch | Haute |
| 3 | Fix P4 : autoriser swipe à `zoom > 1` (sauf pendant pinch) + pan fluide (`overflow:auto` + disable transition) | Haute |
| 4 | Mode Crop : item menu contextuel + `object-fit: cover` + clic centre `object-position` | Moyenne |
| 5 | Sync modal (`app-pdf.js`) : appliquer le même pattern (pinch + global zoom + crop) | Basse |
| 6 | Validation : tests manuels pinch/Zoom/Pan/Nav/Crop sur device tactile + desktop | Haute |

---

## 8. Open questions

### Q1 — Le crop doit-il persister entre les pages ?

Le pinch agit sur **toutes** les pages en même temps. Si le user passe à la
page suivante, le crop/zoom restent-ils appliqués ?

> **Décision :** Oui, le crop/zoom global persiste tant que le user ne reset
> pas ou ne quitte pas le tome. C'est l'effet "le banger" : un seul pinch
> configure le crop pour le **tome entier**.

### Q2 — Le crop doit-il suivre l'orientation du manga (vertical) ?

Dans une lecture verticale, le pan doit être vertical. Dans une lecture
horizontale, le pan est horizontal.

> **Décision :** Le pan s'adapte à `direction` (horizontal/vertical) — le
> `overflow: auto` du conteneur suit l'axe de la direction de lecture.
> Le `scroll-snap` reste sur l'axe principal.

### Q3 — Pinch à `zoom <= 1` ou à tout moment ?

Le pinch doit-il être actif dès `touchstart` (même si `zoom = 1.0`), ou
nécessiter qu'on ait déjà zoomé au moins une fois ?

> **Décision :** Le pinch est **toujours actif** quand 2 doigts sont détectés.
> Cela permet de partir de `zoom=1` et de pincer pour zoomer directement —
> c'est le comportement natif attendu ("c'est la base").
