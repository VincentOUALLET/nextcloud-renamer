# Spec — Covers CBZ natives Nextcloud pour Renamer

## Objectif

Ajouter à l'app Nextcloud `Renamer` un système de covers automatiques pour les fichiers `.cbz`, afin d'obtenir une présentation type bibliothèque/Kavita dans notre interface, **sans créer de fichiers `cover.jpg` à côté des CBZ et sans modifier le core Nextcloud**.

L'objectif principal est de rester le plus possible dans les mécanismes natifs de Nextcloud.

---

## Architecture souhaitée

Le fichier `.cbz` reste l'unique source de vérité.

Exemple :

```
Mangas/
├── One Piece/
│   ├── One Piece - 001.cbz
│   ├── One Piece - 002.cbz
│   └── One Piece - 003.cbz
└── Berserk/
    ├── Berserk - 001.cbz
    └── Berserk - 002.cbz
```

Ne PAS créer :

```
cover.jpg
folder.jpg
.thumbnail/
.metadata/
ou toute autre donnée persistante à côté du CBZ.
```

La cover doit être exposée via le système de previews de Nextcloud.

Architecture cible :

```
CBZ
 ↓
Preview Provider de Renamer
 ↓
système de Preview natif Nextcloud
 ↓
cache Preview Nextcloud
 ↓
interface Reader / bibliothèque de Renamer
```

Le Reader ne doit pas implémenter lui-même la logique ZIP/CBZ pour récupérer la cover.

---

## 1. Commencer par inspecter l'existant

AVANT TOUT CODE :

1. Inspecter la structure actuelle de l'app `Renamer`.
2. Identifier comment les fichiers sont actuellement récupérés dans l'interface Reader.
3. Identifier comment les previews Nextcloud sont actuellement utilisées, si elles le sont déjà.
4. Identifier le MIME type réellement attribué aux `.cbz` par cette installation Nextcloud.
5. Vérifier la version/API Nextcloud actuellement ciblée par l'app.
6. Vérifier les interfaces/classes de preview disponibles dans cette version.
7. Vérifier s'il existe déjà dans le projet une logique permettant de lire un CBZ.
8. Vérifier les éventuelles contraintes de sécurité liées à la lecture d'une archive ZIP.

Ne pas partir du principe que les noms de classes/API sont ceux d'une autre version de Nextcloud.

Si l'API de preview disponible dans notre version diffère de la documentation générique, utiliser l'API réellement disponible dans cette installation.

---

# 2. Implémenter un Preview Provider CBZ

Ajouter dans `Renamer` un provider de preview dédié aux `.cbz`.

Conceptuellement :

```
CbzPreviewProvider
```

Il doit s'intégrer au système de previews de Nextcloud, et non créer son propre système de thumbnails.

Responsabilités du provider :

1. Recevoir un fichier CBZ.
2. Ouvrir l'archive en lecture seule.
3. Identifier l'image servant de couverture.
4. Charger cette image.
5. La retourner au système de preview Nextcloud dans le format attendu par l'API de la version utilisée.
6. Laisser Nextcloud gérer le cache de preview.

Le provider ne doit jamais modifier le CBZ.

---

# 3. Sélection de la cover

Utiliser une stratégie déterministe.

Ordre de priorité souhaité :

1. `cover.jpg`
2. `cover.jpeg`
3. `cover.png`
4. `folder.jpg`
5. `folder.jpeg`
6. `folder.png`
7. première image numérotée
8. première image valide du CBZ

La recherche des noms doit être raisonnablement tolérante à la casse :

```
cover.jpg
Cover.jpg
COVER.JPG
```

doivent être considérés comme équivalents.

Pour les fichiers numérotés, gérer au minimum :

```
000.jpg
001.jpg
01.jpg
1.jpg
```

et leurs variantes PNG/JPEG.

Si aucune image valide n'est trouvée, le provider doit échouer proprement et laisser Nextcloud gérer l'absence de preview.

---

# 4. Sécurité

Le CBZ est une archive ZIP potentiellement fournie par un utilisateur.

Ne jamais extraire aveuglément l'intégralité de l'archive sur disque.

Éviter :

```
unzip archive.cbz /tmp/...
```

si cela entraîne l'extraction complète.

Lire uniquement l'entrée nécessaire à la cover.

Refuser les entrées manifestement problématiques :

```
../file
../../file
/absolute/path
```

Ne jamais permettre à un chemin contenu dans l'archive d'être utilisé comme chemin système.

Limiter également la taille de l'image chargée si l'API utilisée le permet, afin d'éviter qu'un CBZ contenant une image volontairement énorme provoque une consommation mémoire excessive.

Le provider doit être en lecture seule.

---

# 5. Ne pas créer de cache propriétaire

NE PAS créer :

```
apps/renamer/covers/
/var/www/nextcloud/covers/
/tmp/renamer-covers/
base de données de covers
fichiers `cover.jpg` générés
```

sauf si l'API native Nextcloud impose explicitement un stockage temporaire interne pendant la génération de preview.

Le cache final doit rester celui du système Preview de Nextcloud.

---

# 6. Intégration avec l'interface Reader

Une fois le provider fonctionnel, modifier l'interface de bibliothèque/Reader pour utiliser la preview Nextcloud du CBZ.

La logique JS ne doit PAS :

```
télécharger le CBZ
décompresser le CBZ côté navigateur
rechercher cover.jpg
fabriquer un Blob à partir du CBZ
```

Elle doit demander à Nextcloud la preview du fichier.

Le résultat attendu est conceptuellement :

```
fichier CBZ
    ↓
URL/API Preview Nextcloud
    ↓
image de cover
    ↓
<img>
```

Réutiliser autant que possible les mécanismes/API déjà utilisés par Nextcloud Files pour construire les URLs de preview.

Ne pas hardcoder une URL interne si Nextcloud fournit une API appropriée.

---

# 7. Affichage

La cover doit pouvoir être utilisée dans une grille de bibliothèque.

Exemple conceptuel :

```
┌──────────────┐
│              │
│    COVER     │
│              │
│              │
└──────────────┘
   Tome 001
```

La cover doit conserver son ratio d'origine.

Pour la grille, utiliser `object-fit: cover` ou `contain` selon le comportement visuel déjà présent dans Reader.

Ne pas modifier inutilement le design actuel du Reader.

Cette tâche concerne principalement la récupération automatique des covers et son intégration propre à Nextcloud.

---

# 8. Performance

La génération de cover peut être relativement coûteuse si un utilisateur possède beaucoup de CBZ.

Ne pas ouvrir/décompresser inutilement plusieurs fois le même CBZ pendant une seule requête.

Le provider doit :

* rechercher rapidement l'entrée candidate ;
* ne lire que ce qui est nécessaire ;
* laisser Nextcloud gérer le cache ;
* éviter de générer plusieurs tailles si Nextcloud peut gérer les dimensions demandées.

Ne pas ajouter de système de cache parallèle sans nécessité démontrée.

Si la génération de previews nécessite une configuration ou un outil Nextcloud existant, l'utiliser plutôt que de recréer un mécanisme dans Renamer.

---

# 9. Compatibilité Nextcloud

Aucune modification du core Nextcloud.

NE PAS modifier :

```
core/
lib/
apps/files/
autres apps natives
```

Toutes les modifications doivent rester dans :

```
apps/renamer/
```

Le résultat doit survivre à une mise à jour de Nextcloud.

---

# 10. Compatibilité avec les fichiers existants

Le système doit fonctionner immédiatement avec les CBZ existants.

Aucune migration de fichiers.

Aucune commande qui ajoute des covers aux bibliothèques.

Aucun changement de nom.

Aucune modification des permissions des fichiers utilisateur.

Aucun `files:scan` massif ne doit être lancé automatiquement uniquement pour cette fonctionnalité.

---

# 11. Comportement attendu

Cas 1 :

```
manga.cbz
  ├── cover.jpg
  ├── 001.jpg
  ├── 002.jpg
  └── ...
```

→ preview = `cover.jpg`

Cas 2 :

```
manga.cbz
  ├── 001.jpg
  ├── 002.jpg
  └── ...
```

→ preview = `001.jpg`

Cas 3 :

```
manga.cbz
  ├── Cover.PNG
  ├── 001.jpg
  └── ...
```

→ preview = `Cover.PNG`

Cas 4 :

```
manga.cbz
  ├── fichier.txt
  └── ...
```

→ aucune preview, sans erreur fatale.

Cas 5 :

Un CBZ est remplacé par une nouvelle version contenant une autre cover.

→ la preview Nextcloud doit pouvoir être invalidée/régénérée selon le fonctionnement normal du système de previews.

Ne pas implémenter un mécanisme parallèle de détection des modifications sauf nécessité technique réelle.

---

# 12. Tests obligatoires

Avant de considérer la tâche terminée, créer ou utiliser des tests couvrant au minimum :

* CBZ avec `cover.jpg`
* CBZ avec `Cover.JPG`
* CBZ sans cover mais avec images
* CBZ avec plusieurs images numérotées
* CBZ avec PNG
* CBZ sans image
* CBZ avec chemins ZIP malveillants
* CBZ avec image très volumineuse
* archive invalide/corrompue

Tester également l'intégration réelle avec Nextcloud et pas uniquement la classe PHP isolée.

---

# 13. Vérification finale

Avant de modifier l'interface, vérifier que le provider peut réellement être appelé par Nextcloud.

Tester :

```
CBZ
 ↓
Preview Provider
 ↓
image retournée
 ↓
endpoint Preview Nextcloud
 ↓
navigateur
```

Puis seulement intégrer cette preview dans le Reader.

---

# 14. Contraintes importantes

NE PAS :

* modifier le core Nextcloud ;
* créer des fichiers `cover.jpg` automatiquement ;
* créer une base de données parallèle de covers ;
* extraire systématiquement les CBZ sur disque ;
* télécharger les CBZ dans le navigateur juste pour afficher la cover ;
* réimplémenter côté JS le système de preview ;
* casser le fonctionnement actuel du Reader ;
* modifier les événements existants du Reader sans nécessité ;
* faire une refactorisation générale de l'application dans cette tâche.

Faire la modification la plus petite et réversible possible.

---

# 15. Principe directeur

La règle à suivre est :

**"Le CBZ appartient à Nextcloud, la cover est une Preview Nextcloud, et Renamer fournit uniquement le provider permettant à Nextcloud de comprendre comment prévisualiser un CBZ."**

Si une partie de cette architecture n'est pas compatible avec l'API exacte de notre version de Nextcloud, NE PAS bricoler une solution équivalente immédiatement.

Commencer par identifier précisément la limitation/API concernée, puis proposer l'adaptation minimale qui conserve autant que possible ce principe.
