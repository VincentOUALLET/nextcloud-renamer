# Spec — Navigation par dossiers dans l'onglet Métadonnées

## Objectif

Ajouter dans l'onglet **Métadonnées** la capacité de naviguer par dossier : une ligne représentant le dossier parent apparaît en haut de la table, le clic dessus relance une requête `read` sur l'ensemble du dossier, et une breadcrumb de navigation est ajoutée dans `renamer-preview-header` en reprenant le style de la breadcrumb Nextcloud.

## Principe

L'onglet Métadonnées affiche aujourd'hui les métadonnées des fichiers audio d'un lot donné. L'utilisateur doit pouvoir :
1. Voir dans quel dossier il se trouve via une breadcrumb
2. Remonter au dossier parent en cliquant sur la ligne "dossier parent" en haut de la table
3. Naviguer dans l'arborescence des dossiers audio sans quitter l'onglet Métadonnées

## Layout — STRICT

Le layout reste **identique** à l'onglet renamer advanced (2 colonnes dans `.renamer-main`). La modification concerne uniquement la colonne droite `.renamer-preview`.

### Breadcrumb dans `renamer-preview-header`

En haut du `.renamer-preview-header`, avant le toggle-all et la recherche, on ajoute une breadcrumb :

```text
Fichiers / Musique / 2024 / Rock
```

- ID : `metadata-breadcrumb`
- Style : repris du style Nextcloud natif (`--nc-radius`, `--nc-border`, mêmes fonts et couleurs)
- Chaque segment est cliquable
- Le dossier courant est en gras
- Un separator `/` entre chaque segment
- La breadcrumb est `position: sticky` dans le header

### Ligne "dossier parent" dans la table

Juste au-dessus de la liste des fichiers, une ligne spéciale apparaît :

```text
[📁]  ../                                    [↗]
```

- ID : `metadata-folder-row`
- Classe : `renamer-preview-row type-folder-nav`
- Contenu :
  - Icône dossier (`📁` ou SVG Nextcloud)
  - Nom du dossier parent (`..` ou nom du dossier)
  - Un chevron/bouton "entrer" (`↗`) à droite
- La ligne est **toujours visible** sauf si on est à la racine du storage
- Clic sur la ligne → navigation vers le dossier parent

### Cas de la racine

Si `state.currentPath === '/'` (ou chemin racine du storage) :
- La ligne dossier parent est masquée
- La breadcrumb affiche uniquement "Fichiers" (ou le nom du storage racine)

## États UI

- `state.currentPath` : chemin du dossier courant (ex. `/Music/2024/Rock`)
- `state.metadataFolderStack` : pile des chemins visités pour la navigation
- `state.metadataFileData` : Map `path → metadata` — les clés correspondent aux chemins absolus
- `state.metadataFileSelection` : Set des chemins sélectionnés dans le dossier courant
- `state.metadataAllSelected` : booléen

## Comportement

### Entrée dans l'onglet Métadonnées

1. Si `window.__renamerAppClosed === true` :
   - Réinitialiser `state.metadataFileData`, `state.manualOverrides`, `state.metadataFileSelection`, `state.metadataAllSelected`, `state.metadataFolderStack`.
   - Lancer `/api/metadata/read` pour les fichiers audio du dossier courant.
   - Remettre `window.__renamerAppClosed = false`.

2. Si `window.__renamerAppClosed === false` :
   - Même logique de cache que dans la spec existante (10 minutes d'inactivité → popup).
   - Si on garde les données, on vérifie que `state.currentPath` n'a pas changé ; sinon, relancer le read.

### Clic sur la ligne "dossier parent"

1. Pop du dernier élément de `state.metadataFolderStack` (ou calcul du parent direct si stack vide).
2. Mise à jour de `state.currentPath`.
3. Push de l'ancien chemin dans `state.metadataFolderStack` (pour pouvoir revenir).
4. Réinitialiser `state.metadataFileSelection` et `state.metadataAllSelected`.
5. Relancer `/api/metadata/read` pour le nouveau dossier.
6. Re-render du preview (breadcrumb + folder row + liste).

### Navigation dans les sous-dossiers

Depuis la breadcrumb, clic sur un segment parent :
1. Mise à jour de `state.currentPath` vers le chemin cliqué.
2. Réinitialiser `state.metadataFolderStack` (les chemins intermédiaires sont perdus, on repart du chemin cliqué).
3. Relancer `/api/metadata/read` pour le nouveau dossier.
4. Re-render.

### Clic sur un segment de la breadcrumb

Chaque segment est cliquable et navigue vers ce dossier précis. Le segment courant n'est pas cliquable (en gras, pas de lien).

### Après écriture metadata

Après un apply réussi (`/api/metadata/write`) :
- Vider `state.metadataFileData` et `state.manualOverrides`.
- Relancer `/api/metadata/read` pour le dossier courant (`state.currentPath`).

### Cas du renommage dans l'onglet Renamer

Si l'utilisateur quitte l'onglet metadata pour aller sur l'onglet renamer et y fait un rename, puis revient :

- Les chemins dans `state.metadataFileData` et `state.manualOverrides` sont mis à jour pour refléter les nouveaux chemins (mapping automatique basé sur `state.files`).
- `state.metadataFileSelection` et `state.metadataAllSelected` sont mis à jour.
- `state.currentPath` est mis à jour si le dossier courant a été renommé.
- Pas de re-lecture getID3 nécessaire dans ce cas.

## Backend

- **Lecture metadata d'un dossier** : `POST /api/metadata/read-folder` → `PageController::metadataReadFolder()`.
  - Body : `{ path: string }`
  - Retour : `{ files: Array<{ path: string, metadata: object|null, readable: bool, writable: bool }> }`
  - Seuls les fichiers audio lus par getID3 sont retournés (MP3, FLAC, OGG, OPUS, WAV, M4A).
  - Les sous-dossiers ne sont **pas** explorés récursivement (lecture du dossier courant uniquement).

- **Lecture metadata existante** : `POST /api/metadata/read` (inchangé) pour un lot de chemins.

## Identifiants (préfixe `metadata-` partout)

- `metadata-breadcrumb` : conteneur breadcrumb
- `metadata-breadcrumb-item` : chaque segment
- `metadata-folder-row` : ligne dossier parent dans la table
- `metadata-folder-nav-btn` : bouton d'entrée dans le dossier parent
- `metadata-preview-list` : liste des fichiers (inchangé)
- `metadata-toggle-all` : toggle all (inchangé)
- `metadata-search` : input recherche (inchangé)

## i18n

Clés ajoutées :
- `metadataBreadcrumbRoot` — "Racine" / "Root"
- `metadataFolderParent` — "Dossier parent" / "Parent folder"
- `metadataEnterFolder` — "Entrer" / "Enter"
- `metadataCurrentFolder` — "Dossier courant" / "Current folder"

## Style

- La breadcrumb `#metadata-breadcrumb` reprend les variables CSS Nextcloud : `--nc-radius`, `--nc-border`, `--color-text-maxcontrast`, `--color-text`
- Les segments inactifs sont en `--color-text-maxcontrast`, le segment courant en `--color-text` (gras)
- `#metadata-folder-row` : hover avec `background-color: var(--color-hover)` comme les autres rows
- `td.metadata-col-file` : `pointer-events: none` (règle existante) ; les boutons dans la folder row sont réactivés avec `pointer-events: auto`

## Critère de réussite

1. J'ouvre l'onglet Métadonnées : je vois la breadcrumb en haut du preview avec le chemin courant.
2. Je vois une ligne "dossier parent" juste au-dessus de la liste des fichiers.
3. Je clique sur la ligne "dossier parent" → je navigue vers le parent, la breadcrumb se met à jour, les fichiers du parent sont listés.
4. Je clique sur un segment de la breadcrumb → je navigue vers ce dossier.
5. Les métadonnées affichées correspondent bien au dossier courant.
6. Après un apply réussi, les métadonnées sont rafraîchies pour le dossier courant.
