# Spec — Preview audio dans Renamer

## Objectif

Ajouter dans l'interface de l'app **Renamer** un bouton `▶` à côté de chaque fichier audio afin de pouvoir écouter rapidement le fichier avant de le renommer.

Le but principal est UX :

> Pouvoir vérifier le contenu d'un fichier audio avant de lui appliquer un renommage, afin d'éviter de renommer le mauvais fichier.

Exemple :

```text
 Nom du fichier                         Actions

 Track 01.mp3                           ▶  ✏
 Track 02.mp3                           ▶  ✏
 Track 03.mp3                           ▶  ✏
```

Le bouton `▶` doit déclencher la lecture du fichier sélectionné.

## Contexte Nextcloud 32 (installation analysée)

- **Version Nextcloud** : `32.0.0` (stable)
- **App Music** : installée à `/var/www/nextcloud/apps/music/` (app officielle Nextcloud)
- **App audioplayer** : installée à `/var/www/nextcloud/apps/audioplayer/` (app tierce)

### Lecteur audio retenu : lecteur HTML5 natif (pas d'app tierce)

Dans Nextcloud 32, **Renamer ne dépend d'aucune app tierce** pour la lecture audio.

Le lecteur audio utilisé est le **lecteur HTML5 natif** du navigateur (`<audio>`), qui est le même moteur que celui utilisé par l'app **Music** (et par l'app **audioplayer**).

**Pourquoi pas audioplayer ?**
- L'app audioplayer est une app tierce qui peut ne pas être installée sur d'autres instances Nextcloud.
- Renamer ne doit pas dépendre d'une app externe pour fonctionner.
- Le lecteur HTML5 natif est universel, ne nécessite aucune dépendance et fonctionne sur toutes les installations Nextcloud.

**Pourquoi pas l'app Music ?**
- L'app Music expose bien un endpoint de stream (`/api/files/{fileId}/download`), mais il nécessite un `fileId`.
- Renamer travaille avec des **chemins de fichiers** (`/Music/song.mp3`), pas des fileIds.
- Convertir un chemin en fileId nécessiterait un appel API préalable ( `/api/files?path=` ou scan préalable), ce qui ajoute de la complexité et un point de défaillance.
- Le lecteur HTML5 natif avec URL WebDAV fonctionne directement avec le chemin, sans conversion.

### URL de stream retenue

**WebDAV** : `/remote.php/dav/files/{userId}/{path}`

Cette URL :
- est **toujours disponible** dans Nextcloud (core)
- stream le fichier avec le bon `Content-Type`
- fonctionne avec la session courante (authentification intégrée)
- ne dépend d'aucune app tierce
- ne nécessite pas de fileId

```js
// Construction de l'URL
function getAudioStreamUrl(path) {
    if (typeof OC !== 'undefined' && OC.generateUrl && typeof OC.getUserId === 'function') {
        return OC.generateUrl('remote.php/dav/files/' + OC.getUserId() + '/' + encodeURIComponent(path));
    }
    // fallback
    return 'remote.php/dav/files/' + encodeURIComponent(path);
}
```

### Lecteur audio dans le DOM

Renamer crée un élément `<audio>` dédié (`#renamer-audio-player`) dans le DOM. Pas de lecteur complexe, pas de barre de lecture persistance.

L'expérience utilisateur reste simple :
- Clic sur `▶` → lecture immédiate via l'élément `<audio>`
- Clic à nouveau → pause/arrêt
- Si l'audioplayer est installé et actif, son bar UI peut également réagir (compatibilité)

### Détection de l'état du lecteur

Pas d'event public nécessaire. L'état est géré localement :

```js
currentlyPlayingPath = null; // chemin du fichier en lecture, ou null
```

Les boutons sont mis à jour via `updateAudioButtonStates()` après chaque changement.

### Adaptation de la zone de preview

Mécanisme identique à ce qui était prévu initialement :
- `ResizeObserver` sur `#sm2-bar-ui` (si audioplayer installé) pour détecter l'apparition/disparition de la barre
- Ajustement de `max-height` de `#metadata-preview-list`

Si audioplayer n'est pas installé, pas de resize nécessaire (pas de barre qui apparaît).

#### Formats non supportés par le lecteur HTML5 natif

Si un fichier audio n'est pas supporté par le lecteur HTML5 natif (ex: format exotique, absence de codec dans le navigateur, fichier corrompu sans métadonnées lisibles) :

* Le bouton de lecture apparaît **grisé** dans l'UI.
* Un clic sur ce bouton grisé ne déclenche pas de lecture.
* Une **modale d'erreur** s'ouvre avec le message : `Ce format n'est pas lisible dans Renamer.`
* La modale affiche le nom du fichier concerné.
* Si l'app **Music** est disponible dans Nextcloud, un bouton **Écouter dans Music** est proposé pour ouvrir le fichier dans cette app.
* Si aucune app complémentaire n'est disponible, seul le bouton **Fermer** est affiché.
* Ces actions ne doivent pas introduire de dépendance système (pas d'installation apt, pas de ffmpeg obligatoire côté utilisateur).

### Comportement en cas d'erreur de lecture

* L'erreur est traquée côté client : après un `NotSupportedError`, le chemin est mémorisé et le bouton passe en état grisé.
* Le même message d'erreur est affiché une seule fois par fichier, pour ne pas perturber l'utilisateur avec des doublons.
* Le diagnostic reste disponible en console pour les debugueurs.

---

## UX

### Bouton

Un bouton `▶` discret est ajouté dans le **premier TD** de chaque `<tr>` du tableau metadata, pour les fichiers audio uniquement.

Exemple :

```text
[▶]  Track 01.mp3    ✓    artist    title    ...
[ ]  Track 02.mp3    ✓    artist    title    ...
[▶]  Track 03.mp3    −    artist    title    ...
```

Le bouton doit :

* être discret (28×28px, transparent, bordure au hover) ;
* avoir un tooltip `Écouter` / `Pause` ;
* ne pas déclencher le renommage ;
* ne pas modifier la sélection (`e.stopPropagation()` + `e.preventDefault()`) ;
* être accessible au clavier (focusable par défaut via `<button>`) ;
* ne pas provoquer de navigation.

---

## Types de fichiers

Le bouton de lecture est proposé uniquement pour :

* MP3, FLAC, OGG, OPUS, WAV, M4A (formats audio reconnus par le lecteur HTML5)
* Le fichier doit être `readable` dans `metadataFileData`

Les autres formats (images, PDF, non-audio) ont un premier TD vide (colonne réservée pour l'alignement).

---

## États UI

* `currentlyPlayingPath` : chemin du fichier en lecture (ou `null`)
* Les boutons sont mis à jour via `updateAudioButtonStates()` après chaque changement de lecture
* Le `ResizeObserver` ajuste `#metadata-preview-list` automatiquement si l'audioplayer est installé

### États du bouton

| État | Icône | Classe CSS |
|------|-------|------------|
| Aucune lecture | `▶` (PLAY_SVG) | `metadata-audio-play-btn` |
| En lecture | `⏸` (PAUSE_SVG) | `metadata-audio-play-btn metadata-audio-playing` |
| Erreur | reste `▶` | — (toast affiché) |

Quand le fichier en lecture est le même que celui du bouton → le bouton passe en `PAUSE_SVG`. Cliquer à nouveau → arrêt de la lecture, retour à `PLAY_SVG`.

### Ligne non sélectionnée

Le bouton reste visible mais en opacité réduite (0.35) et `pointer-events: none` tant que la ligne n'est pas sélectionnée. Si un fichier en lecture est désélectionné, la lecture continue mais le bouton redevient cliquable (utile pour arrêter).

---

## États UI partagés

* `state.metadataFileSelection` / `state.metadataAllSelected` : partagés avec l'onglet renamer
* `state.manualOverrides` : Map `path → { artist: "...", title: "...", ... }`
* `state.metadataFileData` : Map `path → { metadata: {...}, readable: bool, writable: bool }`
* `currentlyPlayingPath` : chemin du fichier en lecture (module-level variable)

---

## Interaction avec le renommage

Le preview audio est totalement indépendant du système de renommage. Le fait de lancer/arrêter une lecture ne modifie pas la sélection, le nom, ou l'état des métadonnées.

---

## Gestion du lecteur

### Ce qui est utilisé

* Élément `<audio>` dédié (`#renamer-audio-player`) ou `OCA.Audioplayer.Player.html5Audio` si audioplayer installé
* URL WebDAV : `/remote.php/dav/files/{userId}/{path}` — toujours disponible, pas de dépendance
* Aucune modification du CSS de Nextcloud ou d'app tierce

### Ce qui n'est PAS fait

* Pas de dépendance à l'app audioplayer
* Pas de dépendance à l'app Music
* Pas de modification du CSS de Nextcloud
* Pas de hack `z-index: 999999`
* Pas de duplication du système de streaming/auth

### Resize

Si l'app audioplayer est installée, le `ResizeObserver` sur `#sm2-bar-ui` détecte l'apparition/disparition de la barre et ajuste `max-height` de `#metadata-preview-list`. Si audioplayer n'est pas installé, pas de resize nécessaire.

---

## Fallback

Pas de fallback nécessaire : le lecteur HTML5 natif fonctionne sur toutes les installations Nextcloud sans dépendance.

---

## Critère de réussite

Depuis Renamer, onglet metadata :

```text
[▶]  fichier-a.mp3    ✓    artist    title    ...
[ ]  fichier-b.mp3    ✓    artist    title    ...
[▶]  fichier-c.mp3    −    artist    title    ...
```

Je clique sur `▶` sur `fichier-b.mp3` :
* Le bouton passe en `⏸`
* Le fichier est lu via l'élément `<audio>` (pas de dépendance à une app tierce)
* Je peux écouter, puis recliquer pour arrêter
* Le renommage reste fonctionnel pendant/après la lecture

---

## Contraintes

Ne pas :

* créer un lecteur custom avant d'avoir étudié le lecteur natif ;
* dépendre d'une app tierce (audioplayer, etc.) pour la lecture ;
* utiliser le previewer générique de Nextcloud ;
* ouvrir inutilement une nouvelle page ;
* ouvrir une grosse modal ;
* modifier globalement le CSS de Nextcloud ;
* ajouter une dépendance npm pour une fonctionnalité aussi simple.

---

## UX

### Bouton

Un bouton `▶` discret est ajouté dans le **premier TD** de chaque `<tr>` du tableau metadata, pour les fichiers audio uniquement.

Exemple :

```text
[▶]  Track 01.mp3    ✓    artist    title    ...
[ ]  Track 02.mp3    ✓    artist    title    ...
[▶]  Track 03.mp3    −    artist    title    ...
```

Le bouton doit :

* être discret (28×28px, transparent, bordure au hover) ;
* avoir un tooltip `Écouter` / `Pause` ;
* ne pas déclencher le renommage ;
* ne pas modifier la sélection (`e.stopPropagation()` + `e.preventDefault()`) ;
* être accessible au clavier (focusable par défaut via `<button>`) ;
* ne pas provoquer de navigation.

### États du bouton

| État | Icône | Classe CSS |
|------|-------|------------|
| Aucune lecture | `▶` (PLAY_SVG) | `metadata-audio-play-btn` |
| En lecture | `⏸` (PAUSE_SVG) | `metadata-audio-play-btn metadata-audio-playing` |
| Erreur | reste `▶` | — (toast affiché) |

Quand le fichier en lecture est le même que celui du bouton → le bouton passe en `PAUSE_SVG`. Cliquer à nouveau → arrêt de la lecture, retour à `PLAY_SVG`.

### Ligne non sélectionnée

Le bouton reste visible mais en opacité réduite (0.35) et `pointer-events: none` tant que la ligne n'est pas sélectionnée. Si un fichier en lecture est désélectionné, la lecture continue mais le bouton redevient cliquable (utile pour arrêter).

---

## Types de fichiers

Le bouton de lecture est proposé uniquement pour :

* MP3, FLAC, OGG, OPUS, WAV, M4A (formats audio reconnus par l'audioplayer)
* Le fichier doit être `readable` dans `metadataFileData`

Les autres formats (images, PDF, non-audio) ont un premier TD vide (colonne réservée pour l'alignement).

---

## États UI

* `currentlyPlayingPath` : chemin du fichier en lecture (ou `null`)
* Les boutons sont mis à jour via `updateAudioButtonStates()` après chaque changement de lecture
* Le `ResizeObserver` ajuste `#metadata-preview-list` automatiquement

## i18n

Clés ajoutées :
* `metadataListen` — "Écouter" / "Listen"
* `metadataPause` — "Pause"
* `metadataPlaybackError` — "Erreur de lecture audio" / "Audio playback error"

## Interaction avec le renommage

Le preview audio est totalement indépendant du système de renommage. Le fait de lancer/arrêter une lecture ne modifie pas la sélection, le nom, ou l'état des métadonnées.

---

## Gestion du lecteur

### Ce qui est utilisé

* Élément `<audio>` dédié (`#renamer-audio-player`) avec URL WebDAV
* URL WebDAV : `/remote.php/dav/files/{userId}/{path}` — toujours disponible dans Nextcloud core
* Si l'app audioplayer est installée et active, son `html5Audio` peut être réutilisé (compatibilité)

### Ce qui n'est PAS fait

* Pas de dépendance à l'app audioplayer
* Pas de dépendance à l'app Music
* Pas de modification du CSS de Nextcloud
* Pas de hack `z-index: 999999` ou `position: fixed; bottom: ...`
* Pas de duplication du système de streaming/auth de Nextcloud

### Resize

Si l'app audioplayer est installée, le `ResizeObserver` sur `#sm2-bar-ui` détecte l'apparition/disparition de la barre et ajuste `max-height` de `#metadata-preview-list`. Si audioplayer n'est pas installé, pas de resize nécessaire (pas de barre qui apparaît).

```js
function applyPlayerResize(ctx, playerVisible) {
    const previewList = document.getElementById('metadata-preview-list');
    if (!previewList) return;
    if (playerVisible) {
        const bar = document.getElementById('sm2-bar-ui');
        const h = bar ? bar.offsetHeight : 80;
        previewList.style.maxHeight = 'calc(100vh - 180px - ' + h + 'px)';
    } else {
        previewList.style.maxHeight = '';
    }
}
```

---

## Fallback : lecteur audio Renamer

Si `OCA.Audioplayer` n'est pas disponible (app non installée), Renamer crée un élément `<audio>` dédié (`#renamer-audio-player`) avec la même URL de stream. L'expérience est équivalente (play/pause/progression intégrée au navigateur).

Pas besoin de lecteur custom dans Renamer tant que l'audioplayer est installé (ce qui est le cas sur l'installation actuelle).

---

## Critère de réussite

Depuis Renamer, onglet metadata :

```text
[▶]  fichier-a.mp3    ✓    artist    title    ...
[ ]  fichier-b.mp3    ✓    artist    title    ...
[▶]  fichier-c.mp3    −    artist    title    ...
```

Je clique sur `▶` sur `fichier-b.mp3` :
* Le bouton passe en `⏸`
* La barre de lecture de l'audioplayer peut apparaître en bas si elle est installée
* La zone de preview se réduit automatiquement si audioplayer est présent
* Je peux écouter, puis recliquer pour arrêter
* Le renommage reste fonctionnel pendant/après la lecture

---

## Non-dépendance à une app tierce

Renamer ne doit pas dépendre de l'app **audioplayer** ni de l'app **Music** pour la fonctionnalité de preview audio.

Le lecteur audio implémenté utilise le **lecteur HTML5 natif** du navigateur, qui est universel et fonctionne sur toutes les installations Nextcloud sans dépendance externe.

L'URL de stream utilisée est l'URL WebDAV de Nextcloud core : `/remote.php/dav/files/{userId}/{path}`.

Cette approche garantit que la fonctionnalité fonctionne quelle que soit la configuration de Nextcloud (avec ou sans audioplayer, avec ou sans Music).
