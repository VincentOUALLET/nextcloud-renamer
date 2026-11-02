# Dernières modifications - Todo List

## Problèmes à résoudre

### 1. Menu contextuel cassé sur les bibliothèques (swipe)
- **Erreur** : `ADD_FOLDER_SVG is not defined` à la ligne 1662 de tome-ops.js
- **Cause** : Variable `ADD_FOLDER_SVG` non importée dans tome-ops.js
- **Fix** : Ajouté `var ADD_FOLDER_SVG = L.ADD_FOLDER_SVG;` dans les imports (fait)

### 2. Swipe/drag ingérable sur les bibliothèques + RÉGRESSION sur "En cours"
- **Problème** : Le swipe drag les images au lieu du container
- **Problème** : Après un drag réussi, un clic est généré qui fait rentrer dans la bibliothèque
- **Régression** : Même problème sur "En cours" qui marchait avant
- **Comparaison** : Le swipe sur "En cours" fonctionnait parfaitement avant

**Causes identifiées** :
1. Les images dans les cartes n'ont pas `draggable="false"` → le navigateur drag l'image native
2. Pas de communication entre le drag du track et le click handler des cartes
3. Le `dragState` n'est pas partagé correctement avec les cartes enfants
4. **BUG CRITIQUE** : Les handlers globaux `handleLibProgressDragMove/End` sur `document` sont toujours utilisés pour mousemove/touchmove, mais ils ne mettaient pas à jour le flag per-track `_dragThresholdExceeded`. Seule la fonction `onDragMove` interne à `attachProgressCarouselNav` le faisait, mais elle n'était JAMAIS appelée (pas de listeners mousemove/touchmove sur le track).

**Fixes appliqués** :
1. ✅ Ajouté `draggable="false"` sur toutes les images `lib-card-img` (paper + audio + progress via renderTomeIcon)
2. ✅ Ajouté `track._dragThresholdExceeded` flag dans `handleLibProgressDragMove` (progress.js ligne 248)
3. ✅ Reset du flag global `libProgressDrag.threshold` dans `handleLibProgressDragEnd` et track click handler
4. ✅ Les cartes (library + progress) vérifient ce flag dans leur click handler avant de naviguer
5. ✅ Track click handler (capture: true) utilise aussi ce flag et stopPropagation

### 4. Audio progress shows ALL chapters instead of ONE per collection
- **Problème** : Pour un livre audio (ex: Sapiens 56 chapitres), "En cours d'écoute" affiche les 56 chapitres au lieu d'une seule carte pour le livre
- **Cause** : La boucle `files.forEach` ajoute chaque chapitre qui a une progression audio, sans grouper par collection
- **Fix** : Regrouper par collection (clé `lib.id:col.id`), trouver le "prochain à écouter" (chapitre en cours OU premier non lu), n'afficher qu'une carte par collection

**Fixes appliqués** :
1. ✅ Nouveau code ligne ~1566-1620 de tome-ops.js : regroupement par collection via `audioProgByCol`, sélection du chapitre suivant

## Fichiers modifiés
- `js/audio-and-book-reader/tome-ops.js` - Imports, draggable=false, click handlers avec check drag (paperTrack/audioTrack), fix bookmark fallback, **regroupement audio par collection**
- `js/audio-and-book-reader/progress.js` - track._dragThresholdExceeded flag dans handleLibProgressDragMove, handleLibProgressDragEnd, track click handler, renderProgressCard click handler
- `js/audio-and-book-reader/i18n.js` - Nouvelles clés de traduction (librariesPaperLabel, librariesAudioLabel, noLibrariesGeneric)
- `css/library/main.css` - Styles .lib-progress-dragging pour cursor grabbing
- `js/audio-and-book-reader/covers.js` - renderTomeIcon a déjà draggable="false" (ligne 157)

## À tester
- [ ] Swipe fluide sur "Bibliothèques papier" (horizontal, pas de drag image)
- [ ] Swipe fluide sur "Bibliothèques audio" 
- [ ] Swipe fluide sur "En cours" (RÉGRESSION - doit remarcher)
- [ ] Swipe fluide sur "En cours d'écoute" 
- [ ] Après swipe, pas de navigation accidentelle dans la lib/collection/tome
- [ ] Clic droit menu contextuel fonctionne (admin: rename, edit cover, change type, add path, rescan, delete)
- [ ] Long press mobile ouvre menu contextuel
- [ ] Boutons prev/next navigation fonctionnent
- [ ] Pas de fichiers audio dans "En cours de lecture" (doivent être dans "En cours d'écoute")
- [ ] **UNE seule carte par livre audio dans "En cours d'écoute" (chapitre suivant)**