# SPEC-audio-library-improvements.md — Audiobook Library Improvements

> Status: **Active** — Improvements to SPEC-audio-library.md

## Issues to Fix

### 1. Terminology: "Tome" → "Chapitre" / "Chapter" for Audio Libraries

**Problem**: Audio libraries currently use "Tome" (FR) / "Volume" (EN) labels, but for audiobooks the correct term is "Chapitre" (FR) / "Chapter" (EN).

**Solution**: 
- Detect when rendering audio library content (libraryType === 'audio')
- Use "Chapitre" / "Chapter" instead of "Tome" / "Volume" in:
  - Progress cards (`renderProgressCard` in progress.js)
  - Tome cards (`renderTomeCard` in tome-ops.js)
  - Table columns (`buildFileTableRows` in tome-ops.js)
  - Collection titles (`renderTomes` in tome-ops.js)
  - Missing tome cards (`renderMissingTomeCard` in tome-ops.js)
  - i18n translations

**Files to modify**:
- `js/audio-and-book-reader/i18n.js` — Add `chapter` / `chapitre` keys
- `js/audio-and-book-reader/progress.js` — `renderProgressCard` label
- `js/audio-and-book-reader/tome-ops.js` — `tomeLabelFor`, `renderTomeCard`, `renderTomes`, `renderMissingTomeCard`, `buildFileTableRows`
- `js/audio-and-book-reader/classification.js` — Ensure chapter parsing works

### 2. Progress: 100% Audio Should Not Show as "En Cours"

**Problem**: When an audio file reaches 100% progress, it still shows in "En cours d'écoute" with the "en cours" badge instead of being marked as completed.

**Root Cause**: `isTomeInProgress` in progress.js returns true for any bookmark that is not `type === 'read'`. For audio, when progress reaches 100%, the bookmark should be treated as "read" (completed).

**Solution**:
- Modify `isTomeInProgress` to check if audio progress is at 100% (value >= total)
- If audio progress is 100%, treat it as "read" (completed)
- Update `renderTomeStatusIcon` to show "read" icon for completed audio
- Update `bookmarkLabel` to show "Lu" / "Read" for completed audio

**Files to modify**:
- `js/audio-and-book-reader/progress.js` — `isTomeInProgress`, `renderTomeStatusIcon`, `bookmarkLabel`

### 3. Audio Player Queue from Progress Mode

**Problem**: When launching the audio player from the progress view ("En cours d'écoute"), it only plays the single clicked file. The user wants:
- All chapters of the audio collection in the playlist
- Positioned on the correct chapter (the one clicked)
- Ability to go back to previous chapters
- Auto-advance to next chapter when current ends

**Solution**:
- When `playAudioFromLibrary` is called from progress view, detect the collection/library
- Build the audio queue with all audio files from the same collection, sorted by chapter/volume order
- Set `audioQueueIndex` to the clicked file's position
- Ensure `repeatMode = 2` (repeat all) is set for auto-advance

**Files to modify**:
- `js/audio-and-book-reader/audio-library.js` — `playAudioFromLibrary` to accept collection context
- `js/audio-player.js` — `playAudioFile` to build queue from collection when called with context

## Implementation Plan

### Phase 1: Terminology Changes
1. Add `chapter` / `chapitre` translations to i18n.js
2. Create helper function `isAudioLibrary(lib)` check in rendering functions
3. Update `tomeLabelFor` to use chapter label for audio
4. Update all rendering functions to use chapter terminology for audio

### Phase 2: Progress Fix
1. Modify `isTomeInProgress` to return false for 100% audio
2. Update `renderTomeStatusIcon` to show read icon for completed audio
3. Update `bookmarkLabel` for completed audio

### Phase 3: Audio Player Queue
1. Modify `playAudioFromLibrary` to pass collection context
2. Update `playAudioFile` in audio-player.js to build queue from collection
3. Set repeat mode to "repeat all" (2) for audio library playback

## Testing Checklist
- [ ] Audio library shows "Chapitre 1", "Chapitre 2" instead of "Tome 1", "Tome 2"
- [ ] 100% completed audio shows "Lu" / "Read" badge, not "En cours"
- [ ] 100% completed audio does not appear in "En cours d'écoute" carousel
- [ ] Clicking audio from progress opens player with full collection queue
- [ ] Previous/next buttons work to navigate chapters
- [ ] Auto-advance to next chapter works
- [ ] Progress saves correctly when switching chapters