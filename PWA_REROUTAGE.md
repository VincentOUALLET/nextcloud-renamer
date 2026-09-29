# PWA Entry Point — `start_url` = `/apps/renamer/reader?view=home`

## TL;DR — State Final (1 oct 2026)

**Server-side 100% correct. Le problème est 100% client/cache du navigateur.**

```
image_path('renamer', 'manifest.json') → /apps/renamer/img/manifest.json ✅
curl https://localhost/apps/renamer/img/manifest.json → start_url: "/apps/renamer/reader?view=home" ✅
```

Mais l'utilisateur installe la PWA → Chrome/Safari utilise le manifest **en cache** (ancien, avec `start_url: /apps/renamer/`).

→ Il faut **supprimer l'icône PWA + vider le cache navigateur** puis réinstaller depuis `/apps/renamer/reader?view=home`.

## Objectif

Faire en sorte que l'entrée de l'app en PWA (installée depuis l'écran d'accueil /
"Add to Home Screen") ouvre directement `/apps/renamer/reader?view=home` au lieu de
`/apps/renamer` (l'app avec ses onglets).

---

## État des lieux — ce qui existait AVANT

- Aucun `manifest.json` dans l'app. Nextcloud core le générait dynamiquement via
  `theming.Theming.getManifest` avec `start_url: /index.php/apps/renamer/` (ou
  `/apps/renamer/`).
- `layout.user.php:49` injecte `<link rel="manifest" href="image_path($_['appid'], 'manifest.json')">`.
- `imagePath()` → `ThemingDefaults::replaceImagePath()` :
  - si `app/img/manifest.json` existe → retourne `false` (utilise le fichier de l'app) ;
  - sinon → sert le manifest thématisé (core), dont le `start_url` pointe sur l'app elle-même.

---

## Ce qui a été fait

### 1. `img/manifest.json` (NOUVEAU)

```json
{
  "name": "Renamer",
  "short_name": "Renamer",
  "start_url": "/apps/renamer/reader?view=home",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    { "src": "app-icon-192.png", "type": "image/png", "sizes": "192x192", "purpose": "any" },
    { "src": "app-icon-512.png", "type": "image/png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

→ Dès ce fichier présent, `replaceImagePath` retourne `false`, donc
`imagePath('renamer', 'manifest.json')` sert `/apps/renamer/img/manifest.json`
(vérifié par curl → HTTP 200, contenu JSON correct).

### 2. `img/favicon-touch.png` (NOUVEAU — copié depuis app-icon-192.png)

→ iOS n'utilise PAS le `start_url` du manifest. Il utilise `apple-touch-icon`
(layout.user.php:46 → `image_path('renamer', 'favicon-touch.png')`) ET se fie à
l'URL de la page au moment de l'ajout. Le favicon-personnalisé évite la
recherche du fallback thématique.

### 3. `lib/AppInfo/Application.php` (MODIFIÉ)

```php
// ligne 133 :
'href' => '/apps/renamer/reader?view=home',
```

→ L'entrée de navigation dans le menu Nextcloud ouvre désormais directement le
reader en mode `home`, au lieu de `/apps/renamer/reader` (qui sans paramètre
view=home démarre sur `libraries`).

### 4. Pas de modification nécessaire côté template / routeur

- La route `/reader` existe déjà (`appinfo/routes.php:9-13` → `page#readerPage`
  → `renderLibraryPage()`).
- `library.js:handleUrlParams()` (lignes 3552-3587) traite déjà `?view=home` :
  ```js
  state.view = viewParam === 'favorites' ? 'favorites'
             : (viewParam === 'home' ? 'home' : 'libraries');
  ```
  → `render()` avec `view === 'home'` → `renderLibrariesContent()`.
- Le endpoint `/api/reader/resolve` gère le mode listing (pas de `read=`/`collection=`/`library=`
  → retourne libraries + collectionsByLib + covers + progress + favorites).

---

## Pourquoi ça n'affiche toujours pas le bon point d'entrée (cache client)

### iOS
- iOS **n'interprète pas** le champ `start_url` du manifest.json.
- L'URL d'entrée est **l'URL de la page au moment où l'utilisateur clique sur
  "Ajouter à l'écran d'accueil"**.
- Donc même avec le manifest corrigé, si l'icône a été ajoutée depuis
  `/apps/renamer` (les onglets), elle restera sur `/apps/renamer` tant qu'elle
  n'est pas recréée depuis `/apps/renamer/reader?view=home`.

### Android Chrome
- Le manifest est **mis en cache** par le moteur de rendu. Une fois l'icône
  installée, le `start_url` du manifest en cache est "gelé".
- Chrome n'actualise le `start_url` qu'après :
  (a) suppression de l'application web installée,
  (b) vidage du cache du site,
  (c) puis ré-ajout depuis une page où le manifest fraîchement servi est déjà
      le bon.

---

## Processus de (re)installation correct

1. **Supprimer** l'icône PWA existante des écrans d'accueil.
2. **Vider le cache complet** :
   - Safari iOS : Réglages → Safari → Effacer historique et données.
   - Chrome Android : `chrome://settings/clearBrowserData` → tout.
3. Ouvrir `/apps/renamer/reader?view=home` dans le navigateur.
4. "Partager" → "Ajouter à l'écran d'accueil" (iOS) ou
   "Installer l'app Renamer" (Android, via `beforeinstallprompt` ou
   le menu … → Ajouter à l'écran d'accueil).

---

## Recherche complémentaire — PWA routing best practices

Ressources consultées :

- **web.dev / Web Fundamentals (Google)**
  - Un manifeste installable nécessite (a) `manifest.json` lié via
    `<link rel="manifest">`, (b) un `start_url` résolu par rapport à l'URL du
    manifest ou absolu, (c) un `display` (`standalone`/`fullscreen`/`minimal-ui`),
    (d) des icônes 192+512 px pour Android, (e) un **service worker** pour le
    `beforeinstallprompt` sur Android.
  - Sans service worker, Android Chrome n'affichera pas de *prompt* d'installation
    natif (mais l'icône "Ajouter à l'écran d'accueil" du menu reste disponible).

- **MDN — Web App Manifest**
  - `start_url` est résolu **par rapport à l'URL du manifest.json**. Un chemin
    absolu (`/apps/renamer/reader?view=home`) est résolu contre l'origine. Un
    chemin relatif (`../reader?view=home` depuis `/apps/renamer/img/manifest.json`)
    est résolu contre l'URL du manifest — préférable si Nextcloud est installé
    dans un sous-répertoire (`/nextcloud/`).
  - `scope` limite les navigations concernées par la PWA. Par défaut, le scope
    est le répertoire du `start_url`. On peut l'étendre mais pas l'élargir au-delà
    de l'origine.
  - iOS ne supporte pas `display: minimal-ui`/`fullscreen` de la même façon que
    Chrome : iOS se contente de `apple-mobile-web-app-capable: yes` (déjà injecté
    par `layout.user.php:40`) + `apple-touch-icon`.

- **Nextcloud core** (`core/img/manifest.json`)
  ```json
  { "start_url": "../../", "display_override": ["minimal-ui"], "display": "standalone" }
  ```
  Nextcloud utilise un `start_url` **relatif** (`../../`) pour la robustesse face
  aux sous-répertoires. Le theming endpoint (`theming.Theming.getManifest`) génère
  dynamiquement le manifest avec `start_url: /index.php/apps/<app>/` ou
  `/apps/<app>/` selon le routeur.

- **Theming override** (`ThemingDefaults::replaceImagePath`)
  - Pour `manifest.json` : si le fichier `app/img/manifest.json` existe → renvoie
    `false` (priorité à l'app) ; sinon → route vers le manifest thématisé.
  - Pour `favicon-touch.png` / `favicon.ico` : si `shouldReplaceIcons()` (requiert
    l'extension PHP `imagick` + support SVG) → renvoie la route thématisée.
    Sinon → utilise le fichier de l'app.

---

## Recommandations pour un routage PWA plus robuste

1. **Service worker** (facultatif mais recommandé pour Android) :
   - Enregistrer `service-worker.js` au **niveau de la racine de l'app**
     (`/apps/renamer/sw.js`) pour un `scope` couvrant `/apps/renamer/`.
   - Stratégie : `fetch` pass-through (réseau pour tout) + cache du manifeste
     et des icônes pour la disponibilité hors ligne du *prompt* d'installation.
   - Attention : ne jamais mettre en cache les réponses API authentifiées
     (`/apps/renamer/api/*`) → risque de servir du contenu obsolète/stuffé.

2. **Résolution du `start_url`** :
   - Préférer un chemin **relatif** (`../reader?view=home`) dans le manifest
     pour supporter les installations en sous-répertoire. Actuellement on utilise
     un chemin absolu `/apps/renamer/reader?view=home` qui suppose une installation
     à la racine du web. À confirmer avec l'équipe infra.

3. **Éviter la double injection** : ne pas Ajouter un `<link rel="manifest">` via
   `Util::addHeader` dans le controller (celui de `layout.user.php` suffit et
   évite les doublons / ambiguïtés de résolution).

4. **Cache-buster** : le theming ajoute `?v=<cachebuster>` à ses URLs d'icônes.
   Pour forcer le rafraîchissement du manifeste après un déploiement, on peut
   versionner l'URL : `/apps/renamer/img/manifest.json?v=<version-app>`.
