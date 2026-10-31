# SPEC-audio-library.md — Audiobook Library Support

> Status: **Active** — replaces `OLD-SPECS/Spec - Preview audio dans Renamer.md`
> Related: `SPEC-library-multi-paths-and-types.md`

## Overview

This specification defines audiobook library support in the Renamer library reader,
using the modular `js/audio-and-book-reader/` architecture (the "new arborescence").

Audiobook libraries are a third library type alongside `flat` and `tomes`. They use
a dedicated icon and have special handling for audio file rendering, playback
integration, and progress tracking.

## Library Types

| Type    | Constant          | Label (FR)        | Description                         |
|---------|-------------------|-------------------|-------------------------------------|
| flat    | `libTypeFlat`     | Livres décorrélés | All files listed together           |
| tomes   | `libTypeTomes`    | Séries / tomes    | Grouped by folder (series/tomes)    |
| audio   | `libTypeAudio`    | Livre audio       | Library for audio files (mp3, etc.) |

## File Layout (New Arborescence)

```
js/audio-and-book-reader/
├── main.js          # Entry point, state machine, init
├── core.js          # Constants, SVG icons, helpers (BOOK_SVG, AUDIO_BOOK_SVG, getLibraryIcon)
├── i18n.js          # Translations (TR.fr, TR.en) — libTypeAudio, libTypeAudioHint
├── classification.js # Volume / chapter parsing, sequencing
├── covers.js        # Cover loading, caching, fallbacks
├── progress.js      # Progress tracking, renderLibraryCards
├── library-ops.js   # Library CRUD, type changes (lib.libraryType)
├── collection-ops.js # Collection CRUD (rules, folders)
├── tome-ops.js      # Tome navigation, flat-files gating (line ~1088: skip flat header for audio)
├── ui-components.js # Modal, context menu, UI widgets
├── audio-library.js # [NEW] Audiobook constants, helpers, card rendering, playback integration
├── reader.js        # Reader modal / rendering (PDF, images)
├── rendering.js     # Sidebar + breadcrumb rendering (renderSidebar → getLibraryIcon)
└── navigation.js    # URL routing, deep-link handling
```

## SVG Icon

### Definition — `js/audio-and-book-reader/core.js`

`L.AUDIO_BOOK_SVG` is defined alongside `L.BOOK_SVG` (line ~339). It uses the same
`L.LIB_ACCENT` color, `width="20" height="20"`, and the user-provided `viewBox`
of `0 0 1920.000000 1278.000000`.

### Type-specific selection — `js/audio-and-book-reader/core.js`

```js
L.getLibraryIcon = function (lib) {
    if (lib && lib.libraryType === 'audio') return L.AUDIO_BOOK_SVG;
    return L.BOOK_SVG;
};
```

### Usage in sidebar — `js/audio-and-book-reader/rendering.js`

`renderSidebar()` (line ~194) calls `L.getLibraryIcon(lib)` instead of the
hardcoded `BOOK_SVG`. Book libraries keep `BOOK_SVG`; audiobook libraries get
`AUDIO_BOOK_SVG`.

### Usage in old monolith — `js/audio-and-book-reader/main.js`

`renderSidebar()` uses a local `getLibraryIcon(lib)` function that mirrors the
`L.getLibraryIcon` logic. This ensures consistency while the old code is
gradually phased out.

## Audio Library Module — `js/audio-and-book-reader/audio-library.js`

This dedicated module (not stacked in `library.js` or `app-metadata.js`) provides:

| Member            | Type     | Purpose                                           |
|-------------------|----------|---------------------------------------------------|
| `AUDIO_EXTENSIONS`| const[]  | `['mp3','flac','ogg','opus','wav','m4a','aac','m4b']` |
| `AUDIO_MIME_MAP`  | const    | Extension-to-MIME mapping for download/playback   |
| `isAudioFile(f)`  | function | Checks if a file entry is an audio file           |
| `isAudioLibrary(lib)` | function | Checks if a library has `libraryType === 'audio'` |
| `getAudioMimeType(f)` | function | Returns MIME type for an audio file           |
| `formatAudioDuration(s)` | function | Formats seconds → `mm:ss` or `h:mm:ss`     |
| `playAudioFromLibrary(filePath, opts)` | function | Delegates to `window.RenamerAudioPlayer.play` |
| `canPlayAudio()`  | function | Checks if the audio player API is available      |
| `bindAudioCardActions(card, file, col, lib)` | function | Binds play button click on card  |
| `renderAudioLibraryCard(lib, cols)` | function | Collects audio file stats for a library |
| `getAudioProgress(filePath)` | function | Reads audio playback progress from bookmarks |
| `saveAudioProgress(filePath, percent, total)` | function | Persists audio progress via L.saveProgress |

### Integration with existing `audio-player.js`

The existing monolithic `js/audio-player.js` (1587 lines) exposes
`window.RenamerAudioPlayer` with its `play()`, `pause()`, queue, and history APIs.
It is loaded dynamically by `js/app.js` for the old metadata tab.

The new `audio-library.js` module **consumes** `window.RenamerAudioPlayer`
rather than duplicating its playback logic. This keeps the playback engine in
one place while the library-side logic (icon selection, card rendering, progress
reading) lives in the modular arborescence.

## PageController — Script Loading

`lib/Controller/PageController.php` `renderLibraryPage()` loads:

```
audio-and-book-reader/audio-library  ← [NEW] added after 'tome-ops'
```

## Backend Scan Support

The backend scan endpoint must include audio file extensions in its supported list.

### `lib/Controller/PageController.php`

- **Line ~709**: `SUPPORTED_SCAN_EXTENSIONS` now includes `mp3, flac, ogg, opus, wav, m4a, aac, m4b`
- **Line ~712**: New `AUDIO_EXT` constant: `['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a', 'aac', 'm4b']`
- **`classifyFilesForLibrary()`** (line ~742): Audio files pass the extension filter and are
  treated as **documents** (not images) so each audio file becomes a tome within its folder collection
- **`scanFolderRecursive()`** (line ~989): Uses `SUPPORTED_SCAN_EXTENSIONS` — audio files now included
- **`scanStorageDirect()`** (line ~1052): Same extension filter — audio files now included

### Frontend Classification

Both `classification.js` (line ~39) check
`AUDIO_EXT` alongside `DOC_EXT` and `IMG_EXT`. Audio files are classified as documents, not images.

## Library Type Picker

`js/audio-and-book-reader/library-ops.js` handles type changes. The picker offers
`flat`, `tomes`, and `audio` options (FR translations in `i18n.js` lines ~185-190).

The old type picker marks `audio` as `enabled: false` with
`libTypeAudioSoon: 'Coming soon'` — this is a placeholder until the audiobook
module is fully wired.

## Tome Operations Gating

`tome-ops.js` line ~1088 gates flat-files behavior:

```js
if (library && library.libraryType !== 'audio') { ... }
```

Audio libraries skip the "flat files" header bar since audio collections are
inherently sequential (playback order matters, not file flattening).

## Progress Tracking

Audio progress uses the same `bookmarks` mechanism as reading progress
(`L.saveProgress` / `L.state.bookmarks`). See `main.js` line ~96-103 and
`audio-library.js` `saveAudioProgress()`.
