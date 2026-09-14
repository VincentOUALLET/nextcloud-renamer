> ⚠️ INSTRUCTION IA : ce fichier TODO.md doit être mis à jour à la fin de chaque session de codage. Coche (✅) les items réellement accomplis et vérifiés dans le code, et ajoute (❌) les items non accomplis. Ne laisse jamais un item ✅ sans l'avoir validé dans le code.

---

> Vision à terme : un "Netflix de lecture" pour Nextcloud — librairies, collections, progression de lecture par utilisateur, interface Kavita. Le tab actuel reste pour l'édition/rangement.

## Travail effectué (session courante) — page lecteur Bibliothèque

- `lib/AppInfo/Application.php` — `boot()` enregistre l'entrée de navigation `renamer-reader` (`href=/apps/renamer/reader`) + injection des mappers `LibraryMapper`/`CollectionMapper`/`ReadingProgressMapper`. ✅
- `appinfo/routes.php` — routes `page#readerPage` (GET `/apps/renamer/reader`) + API dédiées (files/read, files/info, reader/scan, reader/progress, libraries CRUD, collections CRUD, reader/convert-cbr). ✅
- `lib/Controller/PageController.php` — `index()` et `readerPage()` rendent la page Bibliothèque dédiée (`templates/reader.php`) en chargeant **uniquement** `js/library.js` + les viewers (pdf.js/JSZip/epub.js) — **pas** l'app renamer/tab system. ✅
- `lib/Db/LibraryMapper.php` / `lib/Db/CollectionMapper.php` — fix 500 sur creation (`getCreatedAt()->format()` sur null) : les mappeurs hydrattent désormais `createdAt`/`updatedAt` sur l'entité, et les réponses controller sont guardées (`? : null`). ✅
- `templates/reader.php` — conteneur `#renamer-page-app` pour la page dédiée. ✅
- `js/library.js` — page Bibliothèque autonome (hors onglets renamer) : état `libraries`/`collection`/`tomes`/`reading`, état vide + bouton "Ajouter une librairie", scan folder picker (Nextcloud `OC.files.pickFolder` + fallback), **classification Phase 7** (sous-dossier → collection, fichier → tome numéroté par ordre de nom) persistée en DB (library + collections avec rules), grille librairies/collections, liste des tomès, section "Continuer la lecture" (progression par utilisateur), cache DOM mémoire (`domCache`), ouverture tome via `RenamerReader`, navigation clavier. ✅
- `js/tabs/reader/app-reader.js` — onglet lecteur (dans l'app renamer modal) : bouton "Bibliothèque" ajouté à côté de "Scanner un dossier" → `/apps/renamer/reader` (ouvre la page dédiée). ✅
- `js/tabs/pdf/reader.js` — dispatcher `renderReader()` par extension → `/api/files/read` (base64→blob) + délégation viewer. ✅
- `js/tabs/pdf/{pdf-viewer,cbz-viewer,image-viewer,epub-viewer}.js` → remplacés par `js/tabs/pdf/generic-viewer.js` — visionneuse unifiée (slider + nav + zoom + fullscreen) pour PDF (pdf.js), CBZ/CBR (JSZip), images, EPUB (epub.js). ✅
- `lib/js/{pdf.min,pdf.worker.min,jszip.min,epub.min}.js` — intégration statique des libs. ✅

## TODO / Progression
| **Phase 6** | Créer page d'app lecteur qu'on appellera Bibliothèque (un onglet nextcloud, hors de l'app renamer, avec le même svg que celui de l'onglet lecteur) | ✅ |
|     | - `appinfo/app.php` — enregistrement de la navigation dans la sidebar Nextcloud | ✅ |
|     | - Route `page#readerPage` (GET `/apps/renamer/reader`) dans `routes.php` | ✅ |
|     | - `PageController::readerPage()` — loads JS + CSS, renders `templates/reader.php` | ✅ |
|     | - `templates/reader.php` — page container `#renamer-page-app` | ✅ |
|     | - `app.js` — `init()` détecte page mode via `#renamer-page-app`, `initPageMode()` rend l'app en page (pas de modal) | ✅ |
|     | - CSS `.renamer-page-app`, `.renamer-page-header`, `.renamer-page-wrapper` dans `getStyles()` | ✅ |
|     | - Navigation dans la page : `RenamerNavigation`, `renderPageApp()`, `bindPageEvents()` (tabs switching) | ✅ |
|     | - Auto-load libraries au montage de la page via `tabDef.loadLibraries(ctx)` | ✅ |
|     | - `closeDialog()` en page mode → redirect vers `/apps/renamer` | ✅ |
|     | - `isPageMode()`, `openPage` exportés dans l'API publique | ✅ |
|     | - Fix TDZ : `loadNavigationScript()` appelé directement (pas via `RenamerApp.`) | ✅ |
|     | - tab lecteur `app-reader.js` (vues libraries/collection/scanned/reading, scan, cache DOM, progression, clavier) | ✅ |
|     | - dispatcher `reader.js` + viewers pdf/cbz/image/epub + lib JS (pdf.js/JSZip/epub.js) | ✅ |
|     | - menu sur la gauche avec : | ❌ |
|     |     * "home" (ici il y aura tout les livres commencés) | ✅ |
|     |     * une ligne bouton par librairie déjà scannée | ✅ |
|     |     une ligne bouton "Bookmark" on à terme on affichera des images sauvegardée par des like générables par image dans les livres | ❌ |
| **Phase 7** | Spec affichage de page lecteur : | ✅ |
|     | - si dossier pas scanné, un texte "Bibliothèque vide" avec bouton à côté "ajouter une librairie" | ✅ |
|     | - quand on clique ça ouvre un choix de dossier nextcloud qui sera une nouvelle librairie | ✅ |
|     | - une fois choisi => input "nom de librairie" | ✅ |
|     | - ensuite on scanne tout le dossier pour créer la librairie en DB avec : | ✅ |
|     |     - chaque sous-dossier = une oeuvre (dragon ball, tintin) | ✅ |
|     |     - à l'intérieur pour le moment on ignore les sous-sous dossier | ✅ |
|     |     - à l'intérieur de chaque sous-dossier du dossier de la nouvelle librairie ils définiront une collection dans la librairie par nom de sous-dossier | ✅ |
|     |     - dans chaque sous dossier on scanne tous les fichiers pdf / CBZ / zip / EPUB par nom, avec un numéro de tome par fichier qui suit l'ordre de la liste par nom (à terme on créera un système de check du nom de fichier mais pour le début ça me parait compliqué) | ✅ |

| **Phase 8** | si dossier déjà scanné on affiche directement la ou les librairies dans home, sous section livres déjà lus | ✅ |


| **Phase 9** | au clic sur une librairie on atterrit dans la liste de toute les collections, au clic sur une collection on atterrit sur la liste de tous les tomes | ✅ |

| **Phase 10** | au clic sur un tome on ouvre le tome via le reader déjà codé, l'interface sera la même que ce soit un CBZ ou un PDF | ✅ |





BOUTONS à rajouter dans @icons.js

- PLAY (remplacer l'autre par ce svg) : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play h-3.5 w-3.5" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>

- importer : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download h-3.5 w-3.5" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg>

- PDF FILE TXT : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text h-3.5 w-3.5" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>

- 



AUDIO
- repeat all : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path></svg>
- repeat 1 : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"></path><path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"></path><path d="M8.77 2.544 8 1.85v.693z"></path></svg>
- repeat OFF grisé : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path></svg>
- file d'attente : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M15 15H1v-1.5h14zm0-4.5H1V9h14zm-14-7A2.5 2.5 0 0 1 3.5 1h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 1 3.5m2.5-1a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2z"></path></svg>
- prev : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"></path></svg>
- suiv : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path></svg>
-aléatoire : <svg data-encore-id="icon" role="img" aria-hidden="true" class="e-10860-icon" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path></svg>


SOUND ON : <svg data-encore-id="icon" role="presentation" aria-label="Volume élevé" aria-hidden="false" class="e-10860-icon" id="volume-icon" viewBox="0 0 16 16"><path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path><path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127z"></path></svg>
SOUND OFF : <svg data-encore-id="icon" role="presentation" aria-label="Volume désactivé" aria-hidden="false" class="e-10860-icon" id="volume-icon" viewBox="0 0 16 16"><path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06"></path><path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.64 3.64 0 0 0-1.33 4.967 3.64 3.64 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.7 4.7 0 0 1-1.5-.694v1.3L2.817 9.852a2.14 2.14 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694z"></path></svg>