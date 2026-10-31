# Audio Progress Tracking Report

## Overview

This report documents the complete implementation of audio progress tracking in the Renamer app. The system allows users to resume audio playback from where they left off, both in the **main app (onglet Métadonnées)** and in the **standalone library reader (`/reader` route)**.

---

## Architecture

### Two Separate Codebases (Currently)

| Aspect | App principale (`/`) | Bibliothèque standalone (`/reader`) |
|--------|---------------------|-----------------------------------|
| Audio Player | `js/audio-player.js` → `window.RenamerAudioPlayer` | `js/audio-and-book-reader/audio-library.js` → delegates to `RenamerAudioPlayer` |
| Progress API | `ctx.apiRequest` → `/api/reader/progress` | `L.saveProgress` → `/api/reader/progress` |
| State | `audio-player.js` internal state | `window.RenamerLibrary.state.bookmarks` |

---

## Database Schema

**Table:** `renamer_reading_progress`

```sql
CREATE TABLE IF NOT EXISTS `renamer_reading_progress` (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL DEFAULT '',
    file_path VARCHAR(1024) NOT NULL DEFAULT '',
    progress_type VARCHAR(50) NOT NULL DEFAULT 'pdf_page',
    progress_value INTEGER NOT NULL DEFAULT 0,
    progress_total INTEGER NOT NULL DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_file (user_id, file_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

### Fields
- `user_id` — Nextcloud user UID
- `file_path` — Relative path from user's files root (normalized, no leading `/`)
- `progress_type` — `'audio' | 'pdf_page' | 'cbz_page' | 'reader_page' | 'epub_percent' | 'image_viewed' | 'read'`
- `progress_value` — Current position (seconds for audio, page number for PDF/CBZ, percentage for EPUB)
- `progress_total` — Total duration (seconds for audio, total pages for PDF/CBZ, 100 for EPUB)
- `last_accessed` — Auto-updated on each save

---

## Backend API Endpoints

All endpoints are in `lib/Controller/PageController.php`:

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/reader/progress` | **Save single progress** (`saveProgress`) — body: `{ path, type, value, total }` |
| `POST` | `/api/reader/progress/read` | **Read progress for multiple paths** (`readProgress`) — body: `{ paths: [] }` |
| `POST` | `/api/reader/progress/mark` | **Bulk mark/unmark** (`markProgress`) — body: `{ paths: [], type, value, total }` — if `type` is null/empty, deletes |
| `POST` | `/api/reader/progress/delete` | **Delete single** (`deleteProgress`) — body: `{ path }` |

All endpoints:
- Require authenticated user (`@NoCSRFRequired`, `@NoAdminRequired`)
- Use `ReadingProgressMapper` for DB operations
- Return `DataResponse` with `{ success: bool, progress?: object, error?: string }`

---

## Frontend Implementation

### 1. Audio Player (`js/audio-player.js`) — Used by App Principale

#### Progress Loading (`loadAudioProgress`)
```javascript
function loadAudioProgress(path) {
    var ctx = getCtx();
    return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress/read', {
        method: 'POST',
        body: JSON.stringify({ paths: [path] })
    }).then(function(data) {
        if (data && data.success && data.progress && data.progress[path]) {
            var prog = data.progress[path];
            if (prog.type === 'audio' && typeof prog.value === 'number' && prog.total > 0) {
                return prog.value / prog.total; // returns 0-1 float
            }
        }
        return null;
    });
}
```

#### Progress Saving (`saveAudioProgress`)
```javascript
function saveAudioProgress(path, currentTime, duration) {
    if (!ctx || !ctx.apiRequest || !ctx.getBaseUrl) return;
    if (!isFinite(currentTime) || !isFinite(duration) || duration <= 0) return;
    
    var percent = Math.round((currentTime / duration) * 10000) / 10000;
    if (Math.abs(percent - lastSavedProgress) < 0.001) return; // debounce
    lastSavedProgress = percent;
    
    var total = Math.round(duration);
    var value = Math.round(currentTime);
    
    ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/progress', {
        method: 'POST',
        body: JSON.stringify({ path: path, type: 'audio', value: value, total: total })
    });
}
```

#### Auto-save Interval
- **Every 5 seconds** while playing (`startProgressSaving` / `stopProgressSaving`)
- Triggered on: play, pause, seek, track change
- Also saves on: `widgetAudioEl.onpause`, `widgetAudioEl.onended`, `widgetAudioEl.ontimeupdate` (throttled)

#### Context Resolution (`getCtx`)
The audio player needs a context with `apiRequest`, `getBaseUrl`, `t`, `escapeHtml`. It resolves in priority order:
1. `lastCtx` — last context passed to `setup()` or `play()`
2. `audioWidgetEl._ctx` — context attached to the widget DOM element
3. `window.RenamerLibrary` — standalone library context
4. `window.RenamerApp` — main app context (fallback)

### 2. Audio Library (`js/audio-and-book-reader/audio-library.js`) — Used by `/reader`

#### Save Progress Wrapper
```javascript
L.saveAudioProgress = function (filePath, percent, total) {
    if (L.saveProgress) {
        L.saveProgress(filePath, 'audio', percent, total);
    }
};
```

#### Get Progress Helper
```javascript
L.getAudioProgress = function (filePath) {
    if (L.state && L.state.bookmarks && L.state.bookmarks[filePath]) {
        var b = L.state.bookmarks[filePath];
        if (b.type === 'audio' && typeof b.value === 'number') {
            return { percent: b.value, total: b.total }; // percent is 0-100
        }
    }
    return null;
};
```

### 3. Main Library Context (`js/audio-and-book-reader/main.js`)

```javascript
saveProgress: function(filePath, type, value, total) {
    if (!state) return;
    state.bookmarks = state.bookmarks || {};
    state.bookmarks[filePath] = { type: type, value: value, total: total, timestamp: Date.now() };
    apiRequest(getBaseUrl() + '/api/reader/progress', {
        method: 'POST',
        body: JSON.stringify({ path: filePath, type: type, value: value, total: total })
    }).catch(function() {});
}
```

- Updates local `state.bookmarks` immediately for instant UI feedback
- Fire-and-forget API call (errors silently caught)

### 4. Progress UI Rendering (`js/audio-and-book-reader/progress.js`)

#### Progress Card Display
- `renderProgressCards(list, progPaths)` — renders horizontal carousel of in-progress items
- Filters for `type !== 'read'` (in-progress only)
- Shows: cover, title, progress label (percentage for audio)
- Click handler: if audio file → calls `L.playAudioFromLibrary(path)`

#### Progress Label (`bookmarkLabel`)
```javascript
if (b.type === 'audio' && b.total > 0) 
    return Math.round((b.value / b.total) * 100) + t('percent');
```

#### Data Loading (`renderProgressCards`)
- Uses cached `state.bookmarks` if `state.progressLoaded === true`
- Otherwise calls `/api/reader/progress/read` with paths
- Merges response into `state.bookmarks['/' + key] = data.progress[key]`
- Sets `state.progressLoaded = true`

---

## Integration Points

### App Principale (Onglet Métadonnées)
1. User clicks play on audio file in metadata table
2. `app-metadata.js` calls `window.RenamerAudioPlayer.play(path, ctx)`
3. `audio-player.js` loads progress via `loadAudioProgress(path)` 
4. If progress exists → seeks to saved position
5. During playback → auto-saves every 5s via `saveAudioProgress`
6. On pause/stop → final save

### Bibliothèque Standalone (`/reader`)
1. User clicks audio card in progress carousel or library view
2. `audio-library.js` calls `L.playAudioFromLibrary(path)` 
3. Delegates to `window.RenamerAudioPlayer.play(path, opts)`
4. Same flow as above — uses `audio-player.js` for actual playback
5. Progress saved to same DB table via same API

### Reader Tab (`js/tabs/reader/app-reader.js`)
- Has its own `saveProgress` for PDF/EPUB/CBZ/page-based content
- Shares the same `/api/reader/progress` endpoint
- Different `progress_type` values

---

## Data Flow Summary

```
User plays audio
       │
       ▼
┌──────────────────┐
│ audio-player.js  │ ◄─── Central audio engine (single instance)
│ RenamerAudioPlayer.play()
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     loadAudioProgress(path)
│ loadAudioProgress │ ──────────────────────────► /api/reader/progress/read
│ (GET progress)    │ ◄────────────────────────── { progress: { path: {type, value, total} } }
└────────┬─────────┘
         │ percent = value/total
         ▼
┌──────────────────┐
│ widgetAudioEl.currentTime = percent * duration
└────────┬─────────┘
         │
         ▼ (every 5s while playing, on pause, on seek)
┌──────────────────┐     saveAudioProgress(path, currentTime, duration)
│ saveAudioProgress │ ──────────────────────────► /api/reader/progress
└────────┬─────────┘     { path, type: 'audio', value: seconds, total: seconds }
         │
         ▼
┌────────────────────────────┐
│ ReadingProgressMapper      │
│ upsert(ReadingProgress)    │
└────────────┬───────────────┘
             │
             ▼
    ┌────────────────┐
    │ MySQL Table    │
    │ renamer_       │
    │ reading_       │
    │ progress       │
    └────────────────┘
```

---

## Known Issues / Limitations

### 1. Context Resolution Fragility
- `getCtx()` in `audio-player.js` has multiple fallbacks but can fail if:
  - `RenamerApp` not initialized yet (app principale not loaded)
  - `RenamerLibrary` not initialized (reader page not loaded)
  - Widget not in DOM yet
- **Symptom:** `saveAudioProgress: no valid context, cannot save` warning in console

### 2. No Progress Restoration on Track Change
- When `playNextAudio()` / `playPreviousAudio()` loads a new track, `loadAudioProgress` is called
- But if the new track has no saved progress, it starts from 0 (correct)
- **Issue:** No visual indication in UI that progress was restored (no toast, no seek notification)

### 3. Duplicate Progress Saving
- Both `audio-player.js` (interval) AND `widgetAudioEl.onpause` / `onended` save progress
- Can result in duplicate API calls (harmless but wasteful)

### 4. Progress Type Confusion
- Audio uses `type: 'audio'` with `value` = seconds, `total` = seconds
- PDF uses `type: 'pdf_page'` with `value` = page, `total` = pages
- EPUB uses `type: 'epub_percent'` with `value` = 0-100, `total` = 100
- All stored in same table, distinguished by `progress_type`
- **Risk:** If a file is both audio and PDF (impossible), type collision

### 5. No Cleanup of Old Progress
- Progress entries never expire
- Table grows indefinitely
- No admin UI to purge old entries

### 6. Debounce Threshold
- `Math.abs(percent - lastSavedProgress) < 0.001` (0.1%)
- For a 1-hour track (3600s), 0.1% = 3.6 seconds
- Could miss final position if user pauses exactly at threshold boundary

---

## Files Involved

### Backend
| File | Purpose |
|------|---------|
| `lib/Db/ReadingProgress.php` | Entity class |
| `lib/Db/ReadingProgressMapper.php` | Database mapper (CRUD + bulk ops) |
| `lib/Controller/PageController.php:1475-1641` | API endpoints (`saveProgress`, `readProgress`, `deleteProgress`, `markProgress`) |

### Frontend — Audio Player (App Principale)
| File | Purpose |
|------|---------|
| `js/audio-player.js:99-160` | `loadAudioProgress`, `saveAudioProgress`, `startProgressSaving`, `stopProgressSaving` |
| `js/audio-player.js:162-177` | Auto-save interval (5s) |
| `js/audio-player.js:295-328` | Play button handler (saves on pause) |
| `js/audio-player.js:305` | Save on pause |
| `js/audio-player.js:1390, 1453, 1603` | Save on track change/ended |

### Frontend — Library Reader (`/reader`)
| File | Purpose |
|------|---------|
| `js/audio-and-book-reader/audio-library.js:103-117` | `getAudioProgress`, `saveAudioProgress` wrapper |
| `js/audio-and-book-reader/main.js:99-107` | `saveProgress` context function |
| `js/audio-and-book-reader/progress.js:113-122, 124-211` | `bookmarkLabel`, `renderProgressCards` UI |
| `js/audio-and-book-reader/progress.js:177-210` | Progress data loading from API |

### Frontend — Reader Tab (PDF/EPUB/CBZ)
| File | Purpose |
|------|---------|
| `js/tabs/reader/app-reader.js:293-294, 799-810` | `saveProgress` for page-based content |
| `js/tabs/pdf/epub-viewer.js:202, 216` | EPUB progress saving |
| `js/tabs/pdf/generic-viewer.js:1498, 1512, 1569-1582` | PDF/CBZ progress saving |

---

## Testing Checklist

- [ ] Play audio in metadata tab → pause → refresh page → play again → resumes from correct position
- [ ] Play audio in `/reader` library → pause → navigate away → return → resumes
- [ ] Play audio → seek to middle → wait 5s → check DB has entry
- [ ] Play audio → pause → check DB has entry with correct `value` (seconds) and `total` (seconds)
- [ ] Play audio → let it end → check progress marked as `read` (type='read', value=total)
- [ ] Multiple audio files in queue → each maintains separate progress
- [ ] Switch between app principale and `/reader` → progress synced via same DB

---

## Future Improvements

1. **Unify context resolution** — Single shared context provider for both apps
2. **Progress restore notification** — Toast "Reprise à 3:42" when resuming
3. **Visual progress bar on cards** — Show thin progress bar on audio cards in library view
4. **Cleanup job** — Cron to delete progress older than X days for files that no longer exist
5. **Sync across devices** — Already works via DB, but verify multi-session behavior
6. **Keyboard shortcuts** — Save progress on `Space` (play/pause) explicitly
7. **Progress export/import** — For backup/migration