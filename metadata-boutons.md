# Différence entre les boutons "Écraser le renommage manuel" et "Ignorer les fichiers modifiés manuellement"

## Contexte

Lorsque l'utilisateur clique sur **Appliquer** dans l'onglet Métadonnées et qu'il existe des fichiers avec des **modifications manuelles** (dans `state.manualOverrides`), une popup de confirmation s'affiche avec deux boutons. Ces boutons déterminent comment les **règles automatiques** interagissent avec les **modifications manuelles**.

## Où ça se passe

- **Frontend** : `js/app-metadata.js`
  - `handleApply()` (ligne ~3256) : vérifie si des fichiers sélectionnés ont des overrides manuels → affiche `showConflictPopup()`.
  - `showConflictPopup()` (ligne ~3283) : rend les deux boutons et appelle `executeWrite()` avec le `conflictMode` approprié.
  - `executeWrite()` (ligne ~3322) : envoie le `conflictMode` au backend via `POST /api/metadata/write`.

- **Backend** : `lib/Controller/PageController.php`
  - `metadataWrite()` (ligne ~233) : itère sur chaque chemin et agit selon `conflictMode`.

## Les deux boutons

### 1. « Écraser le renommage manuel » (`data-action="ignore"`, `conflictMode = 'overwrite'`)

**Bouton primaire.**

| Aspect | Détail |
|---|---|
| Label i18n | `metadataApplyConfirmOverwrite` |
| `conflictMode` envoyé | `'overwrite'` |
| Fichiers **sans** modif manuelle | ✅ Règles automatiques appliquées sur les métadonnées actuelles du fichier → écrit sur le disque. |
| Fichiers **avec** modif manuelle | ✅ Règles automatiques appliquées **sur la base des valeurs manuelles** → écrasées → écrites sur le disque. Les modifications manuelles servent de point de départ pour l'application des règles, puis le résultat final est persistant. |
| Fichiers dans `$skipped` | Aucun (sauf erreurs/impossibilités d'écriture). |

**Comportement backend** (`PageController.php` ligne ~269) :
```php
$hasManualOverride = isset($manualOverrides[$cleanPath]) && is_array($manualOverrides[$cleanPath]);
// En mode 'overwrite', on ne "skip" jamais les fichiers avec override.

$originalMeta = $hasManualOverride ? ($manualOverrides[$cleanPath] ?? $currentMeta) : $currentMeta;
// ^ Les valeurs manuelles deviennent la base de départ.
$newMeta = $this->metadataService->applyRules($originalMeta, $rules);
// ^ Les règles automatiques sont appliquées sur cette base.
$this->metadataService->writeMetadata($cleanPath, $newMeta, $originalMeta);
// ^ Le résultat final (manuel + règles) est écrit sur le disque.
```

**Comportement frontend après succès** (`executeWrite`, ligne ~3354) :
```js
ctx.state.manualOverrides = {};     // Les overrides sont vidés de la mémoire.
ctx.state.metadataFileData = {};    // Les données en cache sont vidées.
loadMetadata(ctx);                  // Relecture getID3 pour actualiser l'affichage.
```

**En résumé :** L'utilisateur accepte que **toutes** les règles automatiques s'appliquent, **y compris sur les fichiers qu'il a modifiés manuellement**. Les modifications manuelles sont utilisées comme point de départ, puis les règles les transforment, et le résultat final est écrit sur le disque. Les overrides manuels sont consommés et effacés de la mémoire.

---

### 2. « Ignorer les fichiers modifiés manuellement » (`data-action="overwrite"`, `conflictMode = 'ignore'`)

**Bouton secondaire.**

| Aspect | Détail |
|---|---|
| Label i18n | `metadataApplyConfirmIgnore` |
| `conflictMode` envoyé | `'ignore'` |
| Fichiers **sans** modif manuelle | ✅ Règles automatiques appliquées sur les métadonnées actuelles du fichier → écrites sur le disque. |
| Fichiers **avec** modif manuelle | ❌ **Ignorés** : aucune règle appliquée, **aucune écriture sur le disque**. Le fichier reste inchangé. Ajouté à `$skipped` avec le suffixe `(manual override kept)`. |

**Comportement backend** (`PageController.php` ligne ~258) :
```php
$hasManualOverride = isset($manualOverrides[$cleanPath]) && is_array($manualOverrides[$cleanPath]);
if ($hasManualOverride && $conflictMode === 'ignore') {
    $skipped[] = $cleanPath . ' (manual override kept)';
    continue;  // ← Le fichier est sauté, aucune écriture n'a lieu.
}
// Pour les fichiers sans override → application normale des règles sur $currentMeta.
```

**Comportement frontend après succès** (même que pour `overwrite`) :
```js
ctx.state.manualOverrides = {};     // Les overrides sont effacés de la mémoire.
ctx.state.metadataFileData = {};
loadMetadata(ctx);
```

**⚠️ Note importante** : comme `ctx.state.manualOverrides` est vidé après un apply réussi (quel que soit le mode), les modifications manuelles des fichiers *ignorés* ne sont **pas** persitées sur le disque. Elles sont perdues de la mémoire. Ce qui est écrit sur le disque pour ces fichiers, c'est leur contenu **actuel** (inchangé). La spec dit "seules leurs modifs manuelles sont conservées", mais dans l'implémentération actuelle, seules les **données actuelles du fichier** sont conservées (les overrides en mémoire sont effacés). Les manches libres restent vides des modifications non écrites.

**En résumé :** L'utilisateur indique que les fichiers qu'il a modifiés manuellement **ne doivent pas** être touchés par les règles automatiques. Seuls les fichiers **sans** modification manuelle voient les règles automatiques appliquées. Les fichiers manuellement modifiés sont totalement exclus du traitement.

---

## Tableau récapitulatif

| | `overwrite` (Écraser) | `ignore` (Ignorer) |
|---|---|---|
| Fichiers sans modif manuelle | Règles appliquées ✓ | Règles appliquées ✓ |
| Fichiers **avec** modif manuelle | Règles appliquées **sur la base des valeurs manuelles** → écrit sur disque | **Ignorés** : aucune écriture, fichier inchangé |
| Overrides en mémoire après apply | Vidés | Vidés |
| Fichiers dans `$skipped` | Aucun | Fichiers avec manuelle modif |

## Flux

```
Clic "Appliquer"
        ↓
hasManualOverrides ?
        ├─ OUI → showConflictPopup()
        │         ├─ Bouton "Écraser"  → executeWrite(ctx, files, 'overwrite')
        │         └─ Bouton "Ignorer"  → executeWrite(ctx, files, 'ignore')
        │
        └─ NON → executeWrite(ctx, files, 'overwrite')  [écriture directe, pas de popup]
                        ↓
                        POST /api/metadata/write { paths, rules, manualOverrides, conflictMode }
                        ↓
                        PageController::metadataWrite()
                        ↓
                        Pour chaque chemin :
                          overwrite → toujours traité (manuels servent de base)
                          ignore    → skippé si manuel, sinon traité normalement
                        ↓
                        Réponse : { success, updated, skipped, errors }
                        ↓
                        Vider manualOverrides + metadataFileData → loadMetadata() → re-render
```
