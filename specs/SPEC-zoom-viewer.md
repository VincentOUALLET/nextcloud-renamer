# SPEC-zoom-viewer.md — Refonte du zoom & navigation tactile du reader

> Objectif : corriger trois problèmes bloquants du zoom dans `generic-viewer.js`
> (library reader) : (1) les pages adjacentes se chevauchent quand on zoome,
> (2) le pincement tactile (pinch-to-zoom) est absent, (3) il n'y a pas de
> mécanisme pour éliminer les bords enormes (crop) sur les tomes de manga.
>
> Le tout **sans casser** les transitions de navigation entre pages (slider
> `translateX/translateY` + `scroll-snap`) ni le modal PDF (`app-pdf.js`).

---

## 1. Problèmes actuels (diagnostic code)

### P1. 🔴 Chevauchement des pages adjacentes quand zoomé

**Cause** : `applyZoom()` (`generic-viewer.js:2121`) applique `transform: scale()`
à **toutes** les images de pages (`.reader-page-img, .reader-page-canvas`),
pas seulement la courante :

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
  .reader-pages    → transform: translateX(-N%)  (slider de navigation)
    .reader-slide  → flex:0 0 100%  (pas de overflow:hidden)
      .reader-page-img  → scale(currentZoom)  ← déborde du slide
    .reader-slide
      ...
```

- `.reader-slide` n'a **pas** de `overflow: hidden` → l'image scalée déborde
  et se superpose sur le slide voisin.
- `overflow: visible` sur `.reader-pages` (CSS `generic-viewer.js:15`) et
  `.reader-zoomed .reader-pages{overflow:visible}` (`:50`).

**Résultat visuel** : zoomer la page courante agrandit aussi les pages
gauche/droite qui ressortent et se chevauchent — "c'est pas beau du tout".

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
  `app-pdf.js:68` — `e.touches.length === 1`).

→ "en pincant" ne fonctionne pas, c'est la base sur un écran tactile.

### P3. 🔴 Pas de crop pour les bords enormes

- Pas de mécanisme pour "recadrer" une page zoomée pour éliminer les marges
  blanches/noires typiques des scans de manga.
- Le `object-fit: contain` garde toujours la page entière visible — les bords
  sont impossibles à éliminer sans un mode "crop".

### P4. 🟠 Zoom global au lieu de zoom ciblé

- Le zoom agrandit la page mais **tous les slides restent à 100% de leur largeur
  du viewport** (`flex: 0 0 100%`). Le scroll du conteneur `.reader-zoomed`
  (`overflow: auto`) permet de naviguer horizontalement dans la page agrandie,
  mais le snap et la navigation entre pages sont bloqués (`isEnabled:
  currentZoom <= 1`).
- Après avoir zoomé, il faut reset (bouton `reader-zoom-reset`) pour pouvoir
  naviguer à nouveau — UX cassée.

---

## 2. Exigences

### E1. Zoom isolé à la page courante

Le zoom ne s'applique **qu'à la page courante** (ou les N pages visibles).
Les pages adjacentes restent à leur taille naturelle et ne débordent pas.

### E2. Clip Overflow

`.reader-slide` doit avoir `overflow: hidden` pour que l'image zoomée reste
contenue dans son slide — pas de rendering hors-bounds.

### E3. Pinch-to-zoom tactile

Gestion natice du pinch (2 doigts) :
- `touchstart` avec 2 points → entre en mode "pinch".
- `touchmove` → calcule le `scale` = distance actuelle / distance initiale.
- `touchend` (un doigt relâché) → sort du mode pinch, conserve le zoom.
- Désactive le swipe de navigation pendant le pinch (sinon conflit).

### E4. Pan tactile & souris quand zoomé

Quand `currentZoom > 1` :
- Le conteneur de la page courante devient scrollable (pan) pour explorer
  la zone agrandie.
- Le scroll de souris (trackpad) pannede verticalement/horizontalement.
- Navigation entre pages (swipe / clic zone) **temporairement désactivée**
  tant que zoomé (comportement déjà partiellement présent via
  `isEnabled: currentZoom <= 1`, mais le pan doit être fluide).

### E5. Mode "Crop" (éliminer les bords)

Un mode **Crop** permet de recadrer la page courante pour se concentrer sur
le contenu (utile pour les pages de manga avec gros plans ou bordures).
- Toggle dans le menu contextuel (comme `cover`/`contain`).
- Le crop agit sur le `object-position` + `object-fit: cover` + un `scale`
  pour zoomer dans la zone cropée.
- Le crop est **provisoire** (session) : reset à la navigation vers une autre
  page ou au reset du zoom.

### E6. Transitions de navigation préservées

- Le slider (`pagesContainer.style.transform = 'translateX/translateY'`)
  garde sa `transition: transform 0.3s`.
- `scroll-snap-type: x mandatory` et `scroll-snap-align: center` sur les
  slides restent actifs en mode non-zoomé.
- Le swipe tactile entre pages continue de fonctionner dès que la page
  courante n'est plus zoomée.

---

## 3. Architecture proposée

### 3.1 Vue d'ensemble du state

```js
var currentZoom = 1.0;          // 1.0 = 100%
var zoomMode = 'contain';       // 'contain' | 'crop' | 'cover'
var isPanning = false;          // true pendant un drag de pan
var pinchState = null;          // { startDist, startZoom, center } ou null
```

### 3.2 Zoom par page (isolation)

Changer `applyZoom()` pour ne scaler **que le slide courant** :

```js
function applyZoom() {
    var allPageEls = pagesContainer.querySelectorAll('.reader-page-canvas, .reader-page-img');
    for (var k = 0; k < allPageEls.length; k++) {
        var el = allPageEls[k];
        var pageNum = parseInt(el.dataset.page, 10);
        if (pageNum === currentPage && currentZoom > 1) {
            el.style.transform = 'scale(' + currentZoom + ')';
            el.style.transformOrigin = el.dataset.zoomOrigin || 'center center';
        } else {
            el.style.transform = 'none';
        }
    }
    pagesContainer.classList.toggle('reader-fit-cover', zoomMode === 'cover');
    pagesContainer.classList.toggle('reader-fit-crop', zoomMode === 'crop');
    ...
}
```

Le `.reader-slide` courant reçoit `overflow: hidden` (déjà via CSS
`.reader-zoomed`, mais on doit le confiner **dans le slide**, pas dans
le conteneur). Le conteneur garde `overflow: auto` pour le pan.

### 3.3 CSS à ajouter/modifier

```css
/* Le slide courant agrandi : clip le débordement */
.reader-slide.reader-slide-zoomed {
    overflow: hidden;
}

/* Le conteneur devient scrollable pour le pan */
.reader-zoomed .reader-pages {
    overflow: auto;  /* déjà overflow:visible → CHANGER en auto quand zoomé */
}

/* Mode crop : object-fit cover + object-position ajustable */
.reader-fit-crop .reader-page-img,
.reader-fit-crop .reader-page-canvas {
    object-fit: cover;
}
```

**Attention** : le CSS actuel a `.reader-zoomed .reader-pages{overflow:visible}`.
Ce doit devenir `overflow: auto` pour permettre le pan. Mais le slider a
`transition: transform 0.3s` — en mode pan, on ne veut pas de cette transition
sinon le slide "glisse". Solution : désactiver la transition du transform du
slider pendant le pan (mettre `transition: none` temporairement).

### 3.4 Touch / Pinch handler

Nouveau module `createPinchZoom(element, handlers)` :

```js
function createPinchHandler(element, onZoomChange, getCurrentZoom, applyZoomFn) {
    var active = false;
    var startDist = 0;
    var startZoom = 1.0;
    var center = { x: 0, y: 0 };

    function onTouchStart(e) {
        if (e.touches.length === 2 && currentZoom > 1) {
            e.preventDefault();
            active = true;
            var dx = e.touches[1].clientX - e.touches[0].clientX;
            var dy = e.touches[1].clientY - e.touches[0].clientY;
            startDist = Math.sqrt(dx * dx + dy * dy);
            startZoom = currentZoom;
            center = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
            // désactiver le swipe pendant pinch
            if (swipeNav) swipeNav.disable();
        }
    }

    function onTouchMove(e) {
        if (!active || e.touches.length < 2) return;
        e.preventDefault();
        var dx = e.touches[1].clientX - e.touches[0].clientX;
        var dy = e.touches[1].clientY - e.touches[0].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var newZoom = Math.max(1.0, Math.min(3.0, startZoom * (dist / startDist)));
        currentZoom = newZoom;
        applyZoom();
    }

    function onTouchEnd(e) {
        if (!active) return;
        if (e.touches.length <= 1) {
            active = false;
            // réactiver le swipe si zoom revenu à 1
            if (swipeNav && currentZoom <= 1) swipeNav.enable();
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

### 3.5 Navigation entre pages vs zoom

| État | Swipe tactile | Clic zone | Scroll souris | Zoom (roulotte) | Pinch tactile |
|---|---|---|---|---|---|
| `zoom <= 1` | ✅ Nav prev/next | ✅ Nav prev/next | ✅ Nav prev/next | ✅ Zoom | ❌ (1 doigt = swipe) |
| `zoom > 1` | ❌ Désactivé | ❌ Désactivé | ❌ Pan vertical | ✅ Zoom | ✅ Pinch |

- `createSwipeNav.isEnabled` retourne déjà `currentZoom <= 1` → OK, mais
  faut aussi **désactiver** les listeners `touchstart` du swipe pendant le
  pinch pour éviter conflit. Ajouter `disable()` / `enable()` sur
  `createSwipeNav`.

### 3.6 Mode Crop — interaction

- Accessible via le menu contextuel (`reader-ctx-menu`) : ajouter un item
  `Crop` (provisoire, élimine les bords) en plus de `Zoom` / `Classique`.
- Implémenté via `object-fit: cover` + un `scale` qui zoom dans le centre.
- Le crop est **reset** au changement de page (`applyZoom()` doit réinitialiser
  `zoomMode` à `contain` ou le crop doit suivre la page).

---

## 4. Fichiers concernés

| Fichier | Ligne | Changement |
|---|---|---|
| `js/tabs/pdf/generic-viewer.js` | 2121 (`applyZoom`) | Zoom **uniquement** sur le slide courant, pas tous |
| `js/tabs/pdf/generic-viewer.js` | 1043 (`createSwipeNav`) | Ajouter `.enable()` / `.disable()` |
| `js/tabs/pdf/generic-viewer.js` | 2178 (`swipeNav`) | Instancier le pinch handler |
| `js/tabs/pdf/generic-viewer.js` | 49 (`reader-zoomed .reader-pages`) | `overflow: auto` (pas `visible`) |
| `js/tabs/pdf/generic-viewer.js` | 12 (`reader-slide`) | Ajouter `overflow: hidden` optionnel via classe |
| `js/tabs/pdf/generic-viewer.js` | 2446 (`contextmenu`) | Ajouter item "Crop" dans le menu ctx |
| `js/tabs/pdf/generic-viewer.js` | 2656 (click sur img) | Le click-to-zoom garde son comportement |
| `js/tabs/pdf/generic-viewer.js` | 2704 (`uiInstance.destroy`) | Cleanup du pinch handler |
| `js/app-pdf.js` | 68 (`createSwipeNav`) | **Optionnel** : appliquer le même fix (isolation + pinch) |
| `js/app-pdf.js` | 1014 (`applyZoom`) | Zoom sur le slide courant uniquement |

---

## 5. Contraintes (AGENTS.md)

- ✅ Préfixe `reader-` pour les nouveaux identifiants (`reader-fit-crop`,
  `reader-slide-zoomed`, etc.).
- ✅ Commentaires FR / code EN.
- ✅ Pas de `//` en JS/PHP sauf demande explicite.
- ✅ `node --check js/tabs/pdf/generic-viewer.js` + `js/app-pdf.js` avant "fini".
- ✅ Ne pas casser le modal PDF ou le reader library.

---

## 6. Phasage

| Phase | Tâche | Priorité |
|---|---|---|
| 1 | Fix P1 : zoom isolé au slide courant + `overflow: hidden` sur slide | Haute |
| 2 | Fix P2 : handler pinch tactile (2 doigts) + disable du swipe pendant pinch | Haute |
| 3 | Fix P4 : pan fluide quand zoomé (overflow auto + disable transition slider) | Moyenne |
| 4 | Fix P3 : mode "Crop" via menu contextuel + `object-fit: cover` | Moyenne |
| 5 | Sync modal (`app-pdf.js`) : appliquer le même pattern (pinch + isolation) | Basse |
| 6 | Validation : tests manuels pinch/Zoom/Pan/Nav sur device tactile + desktop | Haute |
