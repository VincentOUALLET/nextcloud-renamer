# Spec — Navigation dans l'app Renamer (onglet intégré Nextcloud)

## Objectif

Permettre à l'app **Renamer** d'être lancée directement dans les **onglets Nextcloud** (pas seulement via les boutons d'action dans Files), et de pouvoir naviguer dans les dossiers/sous-dossiers afin d'appliquer des actions sans avoir à revenir dans Files à chaque fois.

## Principe

Aujourd'hui, Renamer est accessible uniquement via les actions Nextcloud (`window._nc_fileactions`) sur un lot de fichiers pré-sélectionné dans Files.

L'objectif est de proposer une **vue standalone** de Renamer, accessible comme un onglet Nextcloud classique, avec sa propre barre de navigation de dossiers et la possibilité de se déplacer dans l'arborescence pour agir sur les fichiers/dossiers cibles.

## Cas d'usage

```text
1. Je suis dans n'importe quel dossier Nextcloud (Files, Photos, etc.)
2. Je clique sur l'onglet "Renamer" dans la barre latérale Nextcloud
3. Renamer s'ouvre dans un onglet dédié, avec la vue du dossier courant
4. Je peux naviguer dans les sous-dossiers via une breadcrumb intégrée
5. Je sélectionne les fichiers/dossiers et applique les règles renommage/metadata/PDF
6. Je peux remonter dans l'arborescence sans quitter Renamer
```

## Architecture

### Entrée dans l'app

Deux modes d'entrée coexistent :

1. **Action button Nextcloud** (existant) : via `_nc_fileactions`, ouvre Renamer sur le lot sélectionné dans Files.
2. **Onglet Nextcloud** (nouveau) : accessible depuis la barre latérale Nextcloud, ouvre Renamer en mode "navigation libre" dans le dossier courant de l'utilisateur.

Un flag ou un paramètre d'URL distingue les deux modes :
- `mode=action` → lot de fichiers pré-sélectionné (comportement actuel)
- `mode=tab` → navigation libre dans l'arborescence

### Navigation dans les dossiers

L'onglet Renamer expose une **barre de navigation breadcrumb** en haut de la zone de preview, inspirée de la navigation Nextcloud native :

```text
Fichiers / Musique / 2024 / Rock
```

Chaque segment est cliquable et permet de naviguer vers le dossier parent correspondant.

Un clic sur un dossier dans la breadcrumb :
- Met à jour `state.currentPath`
- Relance la lecture du contenu du dossier via l'API Renamer
- Re-render du preview avec les nouveaux fichiers

### États UI

- `state.currentPath` : chemin du dossier courant affiché dans Renamer (ex. `/Music/2024/Rock`)
- `state.navigationStack` : pile des chemins visités pour le bouton "retour"
- `state.files` : contenu du dossier courant (fichiers + sous-dossiers)
- `state.fileSelection` / `state.allSelected` : sélection dans le dossier courant

### Fichiers vs dossiers dans le preview

Dans le preview, deux types d'éléments sont distingués :

- **Fichiers** : mêmes `renamer-preview-row` que l'onglet advanced actuel
- **Dossiers** : affichés avec un identifiant dédié `renamer-preview-row type-folder` (préfixe `folder-` pour les IDs), non sélectionnables directement mais cliquables pour entrer dans le dossier

### Entrée dans un sous-dossier

Clic sur un dossier dans la liste :
- Push du chemin courant dans `state.navigationStack`
- Mise à jour de `state.currentPath`
- Relance de la lecture du contenu via l'API Renamer
- Re-render du preview

### Bouton retour

Un bouton "⬆ Retour" (ou équivalent) dans la breadcrumb permet de revenir au dossier parent :
- Pop du `state.navigationStack`
- Ou navigation vers le parent direct si le stack est vide

### API Backend

- **Lecture du contenu d'un dossier** : `GET /api/files/list?path={path}` → `PageController::listFiles()`
  - Retourne la liste des fichiers et dossiers dans le chemin donné
  - Supporte le filtrage par type (fichiers audio, PDF, images, etc.)
- **Lecture récursive d'un dossier** : `POST /api/files/read-folder` → `PageController::readFolder()`
  - Body : `{ path: string, recursive: bool }`
  - Retourne tous les fichiers du dossier (et sous-dossiers si `recursive: true`) pour alimenter les onglets Renamer/Metadata/PDF

### Intégration avec les onglets existants

Les onglets Renamer, Metadata et PDF partagent le même `state.currentPath` et `state.files` :

- Quand l'utilisateur navigue dans un dossier, les 3 onglets voient leurs previews mis à jour
- `state.files` contient uniquement les fichiers du dossier courant (pas les dossiers)
- Les sous-dossiers sont listés séparément dans le preview pour la navigation

### Identifiants (préfixes)

- `renamer-breadcrumb` : conteneur breadcrumb de navigation
- `renamer-breadcrumb-item` : chaque segment de la breadcrumb
- `renamer-nav-back` : bouton retour
- `renamer-preview-row type-folder` : ligne de dossier dans le preview
- `folder-path-{sanitized}` : ID des lignes de dossier

### i18n

Clés ajoutées :
- `renamerNavFolder` — "Dossier"
- `renamerNavBack` — "Retour"
- `renamerNavRoot` — "Racine"
- `renamerNavCurrentFolder` — "Dossier courant"
- `renamerNavEnterFolder` — "Entrer dans le dossier"

## Non-dépendances

- Pas de modification de la navigation Nextcloud native
- Pas de hack dans le routing Nextcloud
- Pas de dépendance à des apps tierces pour la navigation
- L'API Nextcloud existante (`OCA.Files.FileList` ou équivalent) peut être réutilisée pour la navigation dans les dossiers

## Critère de réussite

1. Je peux ouvrir Renamer depuis la barre latérale Nextcloud (onglet dédié)
2. Je vois la breadcrumb de navigation en haut du preview
3. Je peux cliquer sur un dossier pour y entrer
4. Je peux revenir au dossier parent via le bouton retour
5. Les onglets Renamer/Metadata/PDF affichent les fichiers du dossier courant
6. Les actions de renommage/metadata/PDF s'appliquent aux fichiers du dossier courant
7. Je peux naviguer dans l'arborescence sans jamais quitter Renamer
