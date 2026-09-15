# SPEC-fullscreen-ipados.md — True fullscreen 100% immersion sur iPadOS

> Problème : le fullscreen natif (`requestFullscreen`) sur iPadOS est cassé — la barre d'URL, le dock, l'horloge et la croix de fermeture restent visibles. Objectif : une immersion 100% fullscreen (pas d'horloge, pas de croix, pas de browser chrome) **sans** développement natif.

---

## 1. Diagnostic — Pourquoi le fullscreen natif est cassé sur iPadOS

### Contexte technique

Sur iPadOS Safari (et les navigateurs basés sur WebKit comme Chrome, Brave), l'API standard `requestFullscreen()` a des limitations connues :

1. **`requestFullscreen()` ne cache pas le browser chrome** — Contrairement au desktop, Safari sur iPadOS n'offre pas un vrai "standalone fullscreen". La barre d'URL, la barre d'onglets et le dock restent visibles. Apple considère que l'API Fullscreen doit être "best-effort" sur mobile et n'impose pas l'effacement du chrome.

2. **La croix de fermeture (X) apparaît en haut-à-gauche** — Sur iPadOS, quand une page entre en `requestFullscreen()`, Safari affiche une petite croix rouge "Done" en haut-à-gauche. C'est le mécanisme de sécurité Apple, mais c'est moche et casse l'immersion.

3. **L'horloge reste visible** — L'horloge en haut-à-droite de l'écran n'est pas masquée par `requestFullscreen()`.

4. **`document.exitFullscreen()` est flaky** — Sur iPadOS, le retour du fullscreen natif peut laisser des artefacts de layout, ou le `fullscreenchange` event fire inconsistantement.

### Code actuel concerné

Le fullscreen est implémenté dans 4 fichiers :

| Fichier | Ligne | Code |
|---|---|---|
| `js/tabs/pdf/generic-viewer.js` | 1245-1254 | `container.requestFullscreen()` / `document.exitFullscreen()` |
| `js/tabs/pdf/generic-viewer.js` | 1614-1622 | (EPUB) `container.requestFullscreen()` / `document.exitFullscreen()` |
| `js/app-pdf.js` | 775-787 | `sheet.requestFullscreen()` / `document.exitFullscreen()` |
| `js/library.js` | 425-433, 455-461 | `el.requestFullscreen()` / `document.exitFullscreen()` |
| `js/tabs/reader/app-reader.js` | 322-330 | `el.requestFullscreen()` / `document.exitFullscreen()` |

Le CSS existe déjà pour `:fullscreen` et `:-webkit-full-screen` (app.js:3086-3122, app-pdf.js:3086-3116) mais **rien n'est fait pour iPadOS**.

---

## 2. Alternatives — Solutions sans développement natif

### Alternative A (RECOMMANDÉE) — PWA / Web App Manifest

**Principe** : Ajouter un `manifest.webmanifest` à l'application. Quand l'utilisateur ajoute l'onglet à l'écran d'accueil iPad (via le menu Partager → "Ajouter à l'écran d'accueil"), l'app s'ouvre en mode **standalone** (`display: standalone`).

**Pourquoi c'est la solution idéale pour iPadOS :**

- En mode standalone, il n'y a **aucun browser chrome** — pas d'URL bar, pas de dock, pas de tab bar, pas d'horloge, pas de croix de fermeture.
- L'écran est utilisé à 100 %, vraiment fullscreen natif.
- C'est une solution 100% web standard, pas de code natif.
- iOS/iPadOS a supporté l'installation d' PWA depuis iOS 11.3 (2018).

**Limites :**
- L'utilisateur doit manuellement "Ajouter à l'écran d'accueil" une fois.
- Nextcloud est une app web complexe — le manifest doit pointer sur une URL accessible.
- On ne peut pas forcer l'installation ; il faut informer l'utilisateur.

### Alternative B — CSS pseudo-fullscreen (fallback immédiat, pas PWA)

**Principe** : Détecter iPadOS via user-agent sniffing et, au lieu d'appeler `requestFullscreen()`, activer un **mode CSS "soft fullscreen"** qui :

- Passe le conteneur du viewer en `position: fixed; inset: 0; z-index: 2147483647`
- Utilise `height: 100dvh` (dynamic viewport height) pour couvrir la status bar
- Ajoute `viewport-fit=cover` dans la meta viewport + `env(safe-area-inset-*)` pour le home indicator
- Cache **tous** les éléments UI non nécessaires (pas de croix, pas d'horloge — on contrôle tout le DOM)
- Active la **Screen Orientation API** (`screen.orientation.lock('landscape-primary')`) pour un format paysage immersif

**Pourquoi c'est efficace :**
- Fonctionne immédiatement, sans installation préalable
- Contourne complètement le système de fullscreen natif d'iPadOS
- On contrôle 100% du DOM → on décide ce qui est visible

**Limite :** Le browser chrome (URL bar) reste techniquement visible en haut, mais on peut souvent le faire disparaître avec un scroll léger ou en utilisant `100dvh`.

### Alternative C — Combine PWA + CSS pseudo-fullscreen (RECOMMANDÉE — solution hybride)

**Principe** : PWA pour les utilisateurs qui installent l'app (true standalone), CSS pseudo-fullscreen pour ceux qui utilisent le navigateur directement. Le bouton fullscreen détecte l'environnement et bascule en mode approprié.

---

## 3. Décision — Solution retenue : Alternative C (hybride)

| Scénario | Solution | Résultat |
|---|---|---|
| iPadOS + PWA installée | Mode standalone | **Fullscreen 100% natif**, zéro browser chrome |
| iPadOS + navigateur | CSS pseudo-fullscreen | Fullscreen "soft" — pas d'horloge ni croix, chrome minimisé |
| Desktop | `requestFullscreen()` existant | Fullscreen natif desktop (inchangé) |
| Fallback | `requestFullscreen()` standard | Fonctionne comme aujourd'hui |

---

## 4. Implémentation

### Phase 1 — Détection iPadOS + utilitaire JS

**Nouveau fichier : `js/lib/ipados.js`** (ou intégré dans `js/utils.js`)

```js
// Détection iPadOS
function isIPadOS() {
    return /iPad/.test(navigator.userAgent) && !!navigator.platform;
    // Alternative plus robuste :
    // /macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1
}

// Détection iOS générale
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Tenter un vrai requestFullscreen, mais enregistrer l'état
function enterFullscreen(element) {
    if (document.fullscreenElement) {
        return document.exitFullscreen();
    }
    return element.requestFullscreen().catch(function(e) {
        // Sur iPadOS, requestFullscreen peut échouer ou ne pas cacher le chrome
        if (isIOS()) {
            return enterCSSFullscreen(element);
        }
        throw e;
    });
}

// Mode CSS "soft fullscreen" — contourne le system native
function enterCSSFullscreen(element) {
    element.classList.add('renamer-css-fullscreen');
    element.style.cssText = [
        'position: fixed',
        'inset: 0',
        'z-index: 2147483000',
        'width: 100dvw',
        'height: 100dvh',
        'margin: 0',
        'padding: 0',
        // Safe area insets for home indicator / Dynamic Island
        'padding-top: env(safe-area-inset-top)',
        'padding-left: env(safe-area-inset-left)',
        'padding-right: env(safe-area-inset-right)',
        'padding-bottom: env(safe-area-inset-bottom)',
        'background: #000'
    ].join(';') + ';';

    // Lock orientation landscape (optionnel, pour le lecture)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape-primary').catch(function() {});
    }

    document.body.classList.add('renamer-ipados-fullscreen');
    return Promise.resolve();
}

function exitCSSFullscreen(element) {
    element.classList.remove('renamer-css-fullscreen');
    element.style.position = '';
    element.style.inset = '';
    element.style.zIndex = '';
    element.style.width = '';
    element.style.height = '';
    element.style.margin = '';
    element.style.padding = '';

    // Restore orientation
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }

    document.body.classList.remove('renamer-ipados-fullscreen');
}
```

**CSS à ajouter** (dans `app.js` styles, `generic-viewer.js` styles, et `app-pdf.js` styles) :

```css
/* Cacher le body scroll / overflow quand en CSS fullscreen */
.renamer-ipados-fullscreen,
.renamer-ipados-fullscreen body {
    overflow: hidden;
    overscroll-behavior: none;
    height: 100dvh;
    width: 100dvw;
}

/* Le conteneur fullscreen prend toute la place */
.renamer-css-fullscreen {
    width: 100dvw !important;
    height: 100dvh !important;
    max-width: 100dvw !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
}

/* Cacher la status bar sur iOS */
.renamer-ipados-fullscreen::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: env(safe-area-inset-top, 0px);
    background: #000;
    z-index: 2147483647;
    pointer-events: none;
}
```

### Phase 2 — Intégration dans le code existant

#### 2a. `generic-viewer.js` — `buildReaderUI` (fullscreenBtn, line 1245)

```js
fullscreenBtn.addEventListener('click', function() {
    var el = container;
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (isIOS()) {
        enterCSSFullscreen(el);
        showCursor();
    } else {
        el.requestFullscreen().then(function() {
            showCursor();
        });
    }
});

document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = COLLAPSE_SVG;
        fullscreenBtn.title = 'Quitter plein écran / Exit fullscreen';
    } else if (!container.classList.contains('renamer-css-fullscreen')) {
        fullscreenBtn.innerHTML = EXPAND_SVG;
        fullscreenBtn.title = 'Plein écran / Fullscreen';
    }
    showCursor();
});

// Toggle CSS fullscreen via click droit ou bouton dédié (iPadOS)
fullscreenBtn.addEventListener('click', function() {
    if (el.classList.contains('renamer-css-fullscreen')) {
        exitCSSFullscreen(el);
    } else if (isIOS()) {
        enterCSSFullscreen(el);
    }
});
```

#### 2b. `generic-viewer.js` — `renderEpubUI` (fullscreenBtn, line 1614)

Même logique que 2a — détecter iOS et basculer en CSS pseudo-fullscreen.

#### 2c. `app-pdf.js` — `openPageModal` (fullscreenBtn, line 775)

```js
fullscreenBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (document.fullscreenElement) {
        document.exitFullscreen();
        fullscreenBtn.innerHTML = '⛶';
    } else if (isIOS()) {
        enterCSSFullscreen(sheet);
        fullscreenBtn.innerHTML = '⛷';
    } else {
        sheet.requestFullscreen().catch(function() {});
        fullscreenBtn.innerHTML = '⛷';
    }
    showCursor();
});
```

#### 2d. `library.js` — `renderReading` (line 428)

```js
} else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    var el = document.getElementById('lib-reader-overlay');
    if (el) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (isIOS()) {
            enterCSSFullscreen(el);
        } else {
            el.requestFullscreen().catch(function() {});
        }
    }
}
```

#### 2e. `app-reader.js` — keyboard handler (line 322)

Même pattern :
```js
if (!document.fullscreenElement && !isIOS()) {
    el.requestFullscreen().catch(function() {});
} else if (isIOS()) {
    enterCSSFullscreen(el);
}
```

### Phase 3 — Web App Manifest (PWA)

**Nouveau fichier : `appinfo/manifest.json`**

```json
{
    "name": "Renamer Reader",
    "short_name": "Reader",
    "description": "Lecture PDF/CBZ/EPUB — fullscreen immersion",
    "start_url": "/apps/renamer/reader",
    "display": "standalone",
    "background_color": "#000000",
    "theme_color": "#000000",
    "display_override": ["window-controls-overlay", "minimal-ui"],
    "icons": [
        {
            "src": "/apps/renamer/img/app-icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/apps/renamer/img/app-icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

> **`display: standalone`** est la clé — sur iPadOS, cela lance l'app sans browser chrome du tout. L'horloge, la croix X et la barre d'URL disparaissent complètement. C'est le fullscreen 100% natif.

**Injection dans le PageController** — `lib/Controller/PageController.php` :

Dans `renderLibraryPage()` et `renderRenamerPage()`, ajouter :
```php
$response->addHeader('Link', '<' . $this->getBaseUrl() . '/apps/renamer/manifest.json>; rel="manifest"');
```

Ou via Nextcloud Util :
```php
\OCP\Util::addHeader('<link rel="manifest" href="' . \OCP\Util::getLinkConverter()->getBaseUrl() . '/apps/renamer/manifest.json">');
```

> **Note** : Nextcloud a une gestion native de manifest dans `OCP\Util::addManifest()`. À investiguer — si disponible, on utilise la méthode native Nextcloud. Sinon, on injecte le `<link>` via header.

### Phase 4 — Viewport meta (pour safe-area + dynamic viewport)

Le viewport meta doit être mis à jour pour iPadOS. Nextcloud injecte déjà une meta viewport de base, mais on peut forcer la nôtre via `Util::addHeader` :

```php
\OCP\Util::addHeader('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no">');
```

- **`viewport-fit=cover`** : essentiel pour les iPads récents (Dynamic Island, rounded corners) — permet au CSS `env(safe-area-inset-*)` de fonctionner.
- **`shrink-to-fit=no`** : empêche le "shrink-to-fit" qui peut redimensionner la page sur scroll sur iOS.

### Phase 5 — "Add to Home Screen" prompt (UX)

Pour guider l'utilisateur vers l'installation de la PWA sur iPadOS, ajouter un bouton dans le viewer :

```
Dans le nav-bar du viewer (generic-viewer.js) ou en overlay:
┌─────────────────────────────────────────┐
│ ⚠️ iPad — Pour un vrai plein écran :    │
│ [Ajouter à l'écran d'accueil]           │
│ (menu Partager → Ajouter à l'écran)     │
└─────────────────────────────────────────┘
```

```js
function showIPadPWAPrompt() {
    var banner = document.createElement('div');
    banner.className = 'reader-pwa-banner';
    banner.innerHTML = 
        '<div class="reader-pwa-text">Pour un vrai plein écran 100% : ajoutez à l\'écran d\'accueil</div>' +
        '<button class="reader-pwa-btn">Ajouter</button>' +
        '<button class="reader-pwa-close">×</button>';
    // ... show on screen, click → instruct user to use Share menu
}
```

---

## 5. Résumé des fichiers à modifier

| Fichier | Action |
|---|---|
| `js/lib/ipados.js` | **Nouveau** — détection iPadOS + fonctions `enterCSSFullscreen`/`exitCSSFullscreen` |
| `js/tabs/pdf/generic-viewer.js` | Modifier `fullscreenBtn` handler (2x : buildReaderUI + renderEpubUI) pour détecter iOS |
| `js/app-pdf.js` | Modifier `fullscreenBtn` handler (openPageModal) pour détecter iOS |
| `js/library.js` | Modifier `activeKeyHandler` (f/F key) pour détecter iOS |
| `js/tabs/reader/app-reader.js` | Modifier keydown handler (f/F key) pour détecter iOS |
| `js/app.js` | Ajouter CSS `.renamer-css-fullscreen`, `.renamer-ipados-fullscreen`, `.reader-pwa-banner` + import du manifest |
| `appinfo/manifest.json` | **Nouveau** — web app manifest avec `display: standalone` |
| `lib/Controller/PageController.php` | Injecter `<link rel="manifest">` + meta viewport `viewport-fit=cover` |
| `appinfo/routes.php` | Servir `manifest.json` (ou le placer dans `img/` pour un accès statique) |

---

## 6. Validation

```bash
node --check js/tabs/pdf/generic-viewer.js
node --check js/app-pdf.js
node --check js/library.js
node --check js/tabs/reader/app-reader.js
node --check js/app.js
php -l lib/Controller/PageController.php
```

---

## 7. Notes importantes

- **Pas de modification de fichiers système** (pas de `apt install`, pas de changement de config serveur) — conformément à AGENTS.md.
- **Pas de nouvelle dépendance JS** — pure API native browser.
- **Le fullscreen desktop continue de fonctionner** comme aujourd'hui — le CSS fullscreen n'intervient que sur iOS/iPadOS.
- **Les `:fullscreen` / `:-webkit-full-screen` pseudo-sélecteurs existants** restent valides — on ajoute des classes CSS supplémentaires pour le mode fallback.
- **L'icône du manifest** doit exister dans `img/` — à créer ou réutiliser l'icône existante de l'app.
- **Nextcloud peut déjà avoir un manifest** — si Nextcloud-core gère déjà `display: standalone` pour l'ensemble de l'app, le reader page pourrait hériter de ce comportement. À vérifier avant de forcer notre propre manifest.
