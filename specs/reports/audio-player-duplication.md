# Audio Player Code Duplication Report

## Problem

The audio playback code exists in **three separate locations** in the codebase:

1. **`js/audio-player.js`** — Centralized audio player module exposing `window.RenamerAudioPlayer`
2. **`js/app-metadata.js`** (lines 928-2408) — Complete duplicate copy of all audio functions
3. **`js/audio-and-book-reader/main.js`** — Uses `window.RenamerAudioPlayer` API (correct approach)

## Current Architecture

### `js/audio-player.js`
- Single IIFE containing all audio player logic
- Exposes `window.RenamerAudioPlayer` API with methods: `init`, `destroy`, `setup`, `play`, `enqueue`, `prev`, `next`, `pause`, `resume`, `stop`, `refreshPanel`, `reset`, `getQueue`, `getQueueIndex`, `setQueue`, `updateMetadataPlayingState`
- Manages: audio queue, playback state, repeat modes, history popup, drag-and-drop reordering, playlist export, context menus
- Loads as a script in `app.js` (lines 6891, 6905, 6919)

### `js/app-metadata.js`
- Metadata tab module for displaying/editing file metadata
- Contains its OWN complete copy of all audio functions (lines 928-2408):
  - `playAudioFile`, `playAudioFileByWidget`, `enqueueAudioFile`
  - `stopAudioPlayback`, `removeFromQueue`, `playPreviousAudio`, `playNextAudio`
  - `showAudioHistoryPopup`, `refreshAudioHistoryPanel`, `hideAudioHistoryPopup`
  - `showHistoryActionsMenu`, `showExportPlaylistPopup`, `executePlaylistExport`
  - `updateAudioButtonStates`, `updateWidgetQueueIndex`, `updateRepeatButtonState`
  - `ensureAudioWidget`, `setupMediaSession`, `getAudioStreamUrl`, `getAudioMime`
  - Plus its own `onended` handler, `onpause`, `onerror` handlers
- The metadata tab's audio widget HTML and CSS are also duplicated (in its own `getStyles()`)
### `js/audio-and-book-reader/main.js`

- Library navigation module
- Already correctly delegates to `window.RenamerAudioPlayer.play()` (see `audio-library.js` line 56)

## What Needs to Change

### 1. Replace `app-metadata.js` audio code with `window.RenamerAudioPlayer` calls

**`app-metadata.js` should NOT contain**:
- `ensureAudioWidget()` — Already handles widget creation in `audio-player.js`
- `playAudioFile()`, `playAudioFileByWidget()`, `enqueueAudioFile()` — Use `RenamerAudioPlayer.play()` / `.enqueue()`
- `stopAudioPlayback()` — Use `RenamerAudioPlayer.stop()`
- `removeFromQueue()` — Add `RenamerAudioPlayer.removeFromQueue(index)` API method
- `playPreviousAudio()`, `playNextAudio()` — Use `RenamerAudioPlayer.prev()` / `.next()`
- `showAudioHistoryPopup()`, `refreshAudioHistoryPanel()`, `hideAudioHistoryPopup()` — Already handled by `audio-player.js`
- `showHistoryActionsMenu()`, `showExportPlaylistPopup()`, `executePlaylistExport()` — Already handled by `audio-player.js`
- `updateAudioButtonStates()`, `updateWidgetQueueIndex()`, `updateRepeatButtonState()` — Already handled by `audio-player.js`
- `setupMediaSession()`, `getAudioStreamUrl()`, `getAudioMime()` — Already in `audio-player.js`
- All `onended`, `onpause`, `onerror` handlers — Already in `audio-player.js`
- CSS: `#metadata-audio-widget`, `.metadata-audio-*` styles — Already in `audio-player.js` `getStyles()`

**`app-metadata.js` should ONLY keep**:
- Metadata table rendering logic
- Edit/save metadata functionality
- Search/filter functionality
- The context menu integration that calls `RenamerAudioPlayer.play()` / `.enqueue()`

### 2. API extensions needed on `RenamerAudioPlayer`

Add these methods to the `api` object in `audio-player.js`:

```javascript
removeFromQueue: function(index) {
    removeFromQueue(index);
},
showHistoryPopup: function() {
    showAudioHistoryPopup();
},
hideHistoryPopup: function() {
    hideAudioHistoryPopup();
},
getRepeatMode: function() {
    return repeatMode;
},
setRepeatMode: function(mode) {
    repeatMode = mode;
    updateRepeatButtonState();
},
getState: function() {
    return {
        currentlyPlayingPath: currentlyPlayingPath,
        audioState: audioState,
        repeatMode: repeatMode,
        audioQueue: audioQueue.slice(),
        audioQueueIndex: audioQueueIndex
    };
},
```

### 3. Metadata tab integration

The metadata tab's play button in table rows should call:
```javascript
window.RenamerAudioPlayer.play(path, ctx);
```

The metadata tab should call `RenamerAudioPlayer.setup(ctx)` on init to set up the widget with the correct translation context.

## Files That Reference Both Copies

| File | References |
|------|-----------|
| `js/app.js` | Loads both `audio-player.js` and `app-metadata.js` as scripts |
| `js/app-metadata.js` | Has its own complete copy of audio player (928-2408) |
| `js/audio-player.js` | Contains the canonical implementation |
| `js/audio-and-book-reader/reader.js` | Already uses `RenamerAudioPlayer.play()` |
| `js/audio-and-book-reader/audio-library.js` | Already uses `RenamerAudioPlayer.play()` |

## Immediate Bug Fixes Already Applied

1. **History panel structure** — Rewritten in `audio-player.js` to match `app-metadata.js` (header/list/item with drag-handle and delete-btn)
2. **History panel CSS** — Added missing styles for `metadata-audio-history-header`, `metadata-audio-history-list`, `metadata-audio-history-drag-handle`, `metadata-audio-history-delete-btn`, `metadata-audio-history-ghost`
3. **Repeat mode reset bug** — Removed `repeatMode = 0` from `stopAudioPlayback()`; now only resets in close/ stop/ reset/ onended-end contexts
4. **History persistence** — Queue no longer cleared when last track ends; users can replay from history
5. **Null-safe ctx** — All functions use null-safe `t()` and `esc()` helpers

## Recommendation

To eliminate duplication, refactor `app-metadata.js` to:
1. Remove all audio player function definitions (lines 928-2408 audio-related portions)
2. Import and use `window.RenamerAudioPlayer` for all audio operations
3. Keep only metadata table rendering and editing functionality
4. Add necessary API methods to `audio-player.js` as listed above

This would reduce `app-metadata.js` significantly and ensure all audio playback behavior is centralized in one place.