# SPEC-scan-tomes-chapitres.md — Analyse des tomes/chapitres & détection de séquelles

> Objectif : améliorer l'analyse de la bibliothèque Reader (`js/library.js` → `classifyScan`,
> `makeFileEntry`; backend `PageController::classifyFilesForLibrary`) pour extraire **série /
> tome / chapitre** à partir des *filenames* (Kavita-like) et construire un arbre
> `Series → Volumes → Chapters` côté **JS uniquement**. Ajouter une heuristique de
> **détection de séquelles entre dossiers EPUB** (ex. `My Manga/` → `My Manga 2/`) sans toucher
> au serveur.
>
> Portée : **frontend JS exclusivement**. Aucun changement PHP ni schéma DB n'est requis
> pour la v1. Le parsing serveur continue d'émettre `tome: 0` ; c'est le rendu JS qui
> affine l'arbre.

---

## 1. Diagnostic — Comportement actuel

### 1.1 `js/library.js` (ligne 16–24)

```js
function makeFileEntry(f) {
    return {
        path: f.path,
        name: f.name,
        tome: 0,          // ← toujours 0, jamais parsé
        type: fileExt(f),
        size: f.size || 0,
        mtime: f.mtime || 0,
    };
}
```

### 1.2 `js/library.js` (ligne 700–826)

`classifyScan(files, rootFolder)` construit un arbre `{ name => { folder, files, children } }`
où chaque *level* 1 = dossier racine. Les fichiers sont classés par dossier, mais :

- Le champ `tome` n'est **pas** extrait du filename → il vaut `0` pour tout le monde.
- Aucune notion de **série** ou de **chapitre** → un fichier `Vol.3 Ch.24 - Title.cbz`
  est traité comme un document anonyme.
- Aucun regroupement par série au-dessus du niveau dossier.

### 1.3 `lib/Controller/PageController.php` (ligne 689)

`classifyFilesForLibrary()` émet exactement la même structure plate (`tome: 0`),
sans parsing de filename. → **On ne touche pas au backend pour la v1**.

---

## 2. Modèle cible — Arbre Series → Volumes → Chapters

### 2.1 Structure JS (`state`)

Ajouter à `state` (`library.js` ligne 38) :

```js
readerSeriesTree: null,   // { series: string, volumes: [{ vol: float, chapters: [...] }] } | null
readerSeriesLoaded: false, // mis à true après le premier parse complet
```

### 2.2 `FileEntry` enrichi

`makeFileEntry` retourne en plus :

| Champ | Type | Source |
|---|---|---|
| `series` | `string` | parsing filename (défaut `name` sans ext) |
| `volume` | `float` | parsing filename (défaut `0`) |
| `chapter` | `float` | parsing filename (défaut `0`) |
| `tome` | `float` | **gardé pour compat Rétro** ← `volume` |
| `displayTitle` | `string` | portion filename entre les marqueurs ch/vol |

Rétrocompatibilité : `tome` reste présent pour le code existant qui le lit,
mais `volume`/`chapter`/`series` deviennent les source de vérité pour le rendu.

---

## 3. Parsing de filename — Règles (Kavita-like)

### 3.1 Généralités

- On parse le **filename** (sans extension, sans chemin).
- On normalise : underscores `_` → espaces, espaces superflus supprimés.
- On applique les regex ci-dessous dans l'ordre. Le **premier match gagne**.

### 3.2 Extracteurs de série

```
/^[^\[]+?(?=\s*(?:vol|volume|v|tome|t|ch|chapter|c)\s*[\d\-.]+)/i
```

- Tout ce qui précède le premier marqueur volume/chapitre = **série**.
- Si aucun marqueur → `series = filename` (sans ext).

### 3.3 Marqueurs de volume (regex)

```
(?:\b(?:vol|volume|v|tome|t|巻|卷|册|권|장|시즌|เล่ม|เล่มที่|Том|Тома)\b|\[(?:V|VOL|토|卷)\])\s*[\d\-.]+
```

- Extraction du nombre : `MinNumberFromRange` (Kavita) — prend le min si plage `1-3`.
- Valeur par défaut si absent : `0`.

### 3.4 Marqueurs de chapitre (regex)

```
(?:\b(?:ch|chapter|c|話|话|化|回|화|회|บทที่|ตอนที่|Глава)\b|\[(?:CH|CHAPTER|화)\])\s*[\d\-.]+
```

- Extraction du nombre : `MinNumberFromRange`.
- Valeur par défaut si absent : `0`.

### 3.5 Exemples

| Filename | series | volume | chapter | displayTitle |
|---|---|---|---|---|
| `Vol.3 Ch.24 - Title.cbz` | (vide → `Title`) | `3` | `24` | `- Title` |
| `My Manga - Volume 2.cbz` | `My Manga` | `2` | `0` | (vide) |
| `Chapitre 5 - Le Mystère.epub` | (vide) | `0` | `5` | `- Le Mystère` |
| `Standalone.pdf` | `Standalone` | `0` | `0` | (vide) |
| `Série/Vol.1_ch1-3.cbz` | `Série` | `1` | `1` | (vide) |

### 3.6 Déduplication (sans effet de bord)

- Deux fichiers `Vol.1 Ch.5.cbz` + `Vol.1 Ch.5 (v2).cbz` → mêmes `volume`/`chapter` mais
  chemins différents. Le rendu garde les deux comme chapitres distincts (conflit résolu
  par `displayTitle` différenciant).

---

## 4. Reconstruction de l'arbre (JS)

### 4.1 Appel

`classifyScan` (ligne 700) parse chaque fichier via un nouveau helper `parseScanEntry(f)`
et reconstruit l'arbre côté client :

```js
function parseScanEntry(f) {
    var e = makeFileEntry(f);
    var parsed = parseFilename(e.name);   // §3
    e.series  = parsed.series;
    e.volume  = parsed.volume;
    e.chapter = parsed.chapter;
    e.tome    = e.volume;                  // rétrocompat
    e.displayTitle = parsed.displayTitle;
    return e;
}
```

### 4.2 Arbre produit

```
{
  "My Manga": [
    { volume: 1, chapters: [ {chapter:1, files:[...]}, {chapter:2, files:[...]} ] },
    { volume: 2, chapters: [ {chapter:24, files:[...]} ] }
  ],
  "Standalone": [
    { volume: 0, chapters: [ {chapter: 0, files:[...] } ] }
  ]
}
```

- Un fichier sans volume/chapitre reconnu → `volume: 0, chapter: 0`.
- Tri ascendant par `volume` puis `chapter` (numeric `localeCompare`).

### 4.3 Rendu (scope v1)

- L'arbre est exposé dans `state.readerSeriesTree` pour le composant d'affichage.
- Le rendu visuel (expand/collapse, badges) est **dans le scope d'un ticket UI ultérieur** —
  ce spec couvre le *parsing* et la *structure*, pas le template DOM.

---

## 5. Séquelles EPUB — Heuristique inter-dossiers

### 5.1 Objectif

Lier automatiquement des dossiers EPUB apparentés par un préfixe commun :

```
/Bibliothèque/BD/My Manga/
/Bibliothèque/BD/My Manga 2/
```

→ détecté comme suite de `My Manga`.

### 5.2 Règles (appliquées côté JS, dans `classifyScan`)

1. **Normalisation des dossiers** : on isole le *base name* du dossier (dernier segment de chemin).
2. **Score de similarité** :
   - Strip des suffixes numériques/traduction : `My Manga 2` → base `my manga`, suffixe `2` (float).
   - `string-similarity` (ratio de Jaccard sur tokens, seuil ≥ `0.85`) entre les bases.
3. **Proximité numérique** : si la base match et qu'un suffixe numérique existe,
   le dossier dont le suffixe = `max + 1` est candidat à être une suite.
4. **Métadonnées internes EPUB (option v1 — *non implémenté*)** :
   si deux dossiers partagent le même `<dc:title>` de série dans leurs EPUBs,
   on force le lien même sans similarité nominaliste. → **déféré à un ticket dédié**.

### 5.3 Donnée produite

Ajout dans l'arbre JS :

```js
state.readerSequels = {
  "/Bibliothèque/BD/My Manga": "/Bibliothèque/BD/My Manga 2",
  ...
};
```

- Clé = chemin absolu du dossier source.
- Valeur = chemin absolu du dossier suite (premier candidat, ou `null` si pas de suite).

### 5.4 Exemples

| Dossier source | Dossier candidat | Similarité base | Suffixe | Liené ? |
|---|---|---|---|---|
| `My Manga` | `My Manga 2` | `1.0` | `2` | ✅ |
| `Manga` | `My Manga 2` | `0.6` | `2` | ❌ (< 0.85) |
| `Manga` | `Mangá` | `0.83` | — | ❌ (< 0.85) |
| `One Piece` | `One Piece 2` | `1.0` | `2` | ✅ |

---

## 6. Contraintes / Non-objectifs

- ❌ Pas de changement serveur (`PageController`) dans la v1.
- ❌ Pas de parsing des métadonnées internes EPUB (`OPF`, `<dc:title>`, `<meta rel="sequel">>`)
  — réservé à un ticket dédié (voir §5.2, note *option v1*).
- ✅ Regex fourni par Kavita (`Parser.cs`) comme référence, **adapté en JS**.
- ✅ Le champ `tome` reste exposé pour rétro-compatibilité.

---

## 7. Références & source de vérité

- **Kavita** `Parser.cs` : `ParseMangaVolume` / `ParseMangaChapter` + `ParserConstants`
  (`DefaultChapter = "-100000"`, `LooseLeafVolume = "-100000"`).
- `js/library.js:16` (`makeFileEntry`), `js/library.js:700` (`classifyScan`).
- `lib/Controller/PageController.php:689` (`classifyFilesForLibrary`) — backend, non modifié.
- `js/library.js:38` (`state`) — point d'injection `readerSeriesTree` / `readerSequels`.
