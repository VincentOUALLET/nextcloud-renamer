# Spec — IndexedDB Caching for the Reader App

## Context & Motivation

The **Reader** app in the Renamer Nextcloud extension provides a document reading experience for PDF, CBZ, CBR, EPUB, and image files. Two entry points exist:

1. **Reader tab** (`js/tabs/reader/app-reader.js`) — registered via `RenamerApp.registerTab('reader', ...)`, runs inside the main Renamer app page at `/apps/renamer`.
2. **Standalone library page** (`js/library.js`) — runs at `/apps/renamer/reader`, loads its own DOM and state independently.

Both share the generic viewer (`js/tabs/pdf/generic-viewer.js`) and PDF reader entry point (`js/tabs/pdf/reader.js`).

### Current caching situation

| Data type | Current cache | Limitation |
|---|---|---|
| PDF pages (rendered as dataUrl PNG) | In-memory `ctx.state.pdfPageCache` (LRU, max 60 entries) | Lost on tab close / app reload; no persistence |
| File blobs (full file content for CBZ/CBR/image/EPUB) | None — re-fetched from server every time | Repeated network fetches for same file |
| Reading progress | In-memory `ctx.state.readerBookmarks` | Re-fetched from DB on every tab open; no offline access |
| Library / collection metadata | In-memory `ctx.state.readerLibraries`, `ctx.state.readerCollections` | Re-fetched on every app open |
| DOM for reading view | In-memory `ctx.state.readerDomCache` (`app-reader.js`) / `state.domCache` (`library.js`) | Lost on reload; large memory footprint |

### Why IndexedDB

The Nextcloud environment runs in a browser context where `localStorage` and `sessionStorage` are available but have size limits (~5–10 MB) and are synchronous. PDFs and CBZ files can be tens of MB; rendered PDF pages as dataUrl PNG are several MB each. `localStorage` cannot handle this volume.

`IndexedDB` provides:
- Asynchronous, non-blocking access
- Quota-based storage (typically 50%–80% of free disk space in most browsers)
- Structured clone algorithm support (can store Blobs and ArrayBuffers directly)
- Key-range queries and indexes for efficient lookups

No new libraries are needed — IndexedDB is natively supported in all modern browsers. The `localforage` library is **not** available in the vendor directory and will **not** be introduced (per AGENTS.md: "Utiliser uniquement les bibliothèques PHP déjà disponibles" — this applies to server-side; for JS, we only use what is already loaded or native browser APIs).

---

## Design Goals

1. **Transparent caching** — The cache layer sits between the existing API calls and the rendering code. Callers make the same `apiRequest` / `fetchFileBlob` calls; the cache intercepts and serves cached data when fresh, falling back to the network when needed.
2. **Persistence across app reloads** — Data survives tab close, page refresh, and browser restart.
3. **Automatic cache invalidation** — Cache entries are invalidated based on file `mtime`, explicit user actions, or TTL.
4. **Graceful degradation** — If IndexedDB is unavailable or throws, the app falls back to the current in-memory behavior without breaking.
5. **No new dependencies** — Only native IndexedDB APIs.
6. **Consistent with AGENTS.md** — No system modifications, French comments/UI labels, English code, `--` prefixed identifiers, `node --check` validation.

---

## Architecture

### Module: `js/lib/idb-cache.js`

A new lightweight wrapper module that abstracts IndexedDB operations. It is designed to be loaded before the reader scripts (via `\OCP\Util::addScript('renamer', 'idb-cache')`) so that both `app-reader.js` and `library.js` (standalone page) and `generic-viewer.js` can use it.

#### API surface

```js
window.RenamerIDBCache = {
    open(): Promise<void>,                    // ensures DB is open
    get(store, key): Promise<any>,            // retrieve a value
    set(store, key, value, opts?): Promise<void>, // store a value with metadata
    del(store, key): Promise<void>,           // delete a single entry
    clear(store): Promise<void>,              // clear an entire store
    keys(store): Promise<string[]>,          // list all keys in a store
    query(store, index, range?): Promise<any[]>, // query by indexed field
    close(): void,                           // close DB connection
};
```

`opts` for `set()` includes:
- `ttl` (ms) — time-to-live; entry expires after this duration.
- `expiresAt` (timestamp) — absolute expiry timestamp.
- `version` (number) — schema version of the cached data; increment when the data format changes.

#### Database schema

```
Database name: "renamer-reader"
Version: 1

Stores:
├── fileMetadata       // file info: name, size, mtime, ext, type
│   keyPath: "path"
│   indexes:
│     - "byLibrary"  (libraryId)
│     - "byMtime"    (mtime)
│
├── fileBlobs          // full file content as Blob
│   keyPath: "path"
│   indexes:
│     - "byMtime"    (mtime)
│
├── pdfPages           // rendered PDF page dataUrls
│   keyPath: [path, pageNum]
│   indexes:
│     - "byDoc"      (path)
│     - "byMtime"    (mtime)
│
├── epubState          // serialized epub.js rendition state (if feasible)
│   keyPath: "path"
│   indexes:
│     - "byMtime"    (mtime)
│
├── readingProgress    // local mirror of reading bookmarks / progress
│   keyPath: [userId, path]
│   indexes:
│     - "byPath"     (path)
│     - "byLastAccessed" (lastAccessed)
│
├── libraryData        // cached library list + collection data
│   keyPath: "type"    // 'libraries' or 'library:{id}' or 'collections:{libraryId}'
│   indexes:
│     - "byType"
│
└── cacheMeta          // metadata about cache entries (size, firstSeen, lastAccessed)
    keyPath: "path"
    indexes:
│     - "byLastAccessed"
│     - "byStore"
```

### Integration with existing code

#### 1. PDF page caching (`generic-viewer.js`)

**Current flow:**
```js
PdfSource.prototype._fetchPage = function(pageNum) {
    // 1. Check in-memory cache: ctx.state.pdfPageCache
    // 2. If miss: fetch from /api/pdf/page?path=...&page=...&width=...
    // 3. Store dataUrl in ctx.state.pdfPageCache
}
```

**After spec:**
```js
PdfSource.prototype._fetchPage = function(pageNum) {
    var self = this;
    // 1. Check in-memory cache (fastest): ctx.state.pdfPageCache
    var cache = pdfPageCache(self.ctx);
    var key = self.filePath + '#' + pageNum;
    if (cache[key]) {
        pdfCacheTouch(self.ctx, key);
        pdfCacheEvict(self.ctx);
        return Promise.resolve({ success: true, dataUrl: cache[key], pageCount: self.totalPages });
    }
    // 2. Check IndexedDB: RenamerIDBCache.get('pdfPages', {path, pageNum})
    //    - Validate mtime: compare with ctx.state.fileMetaCache[path].mtime
    //    - If valid: store in in-memory cache, return
    // 3. If miss: fetch from /api/pdf/page, store in BOTH caches, return
}
```

The `pageCount` (total pages) will be cached alongside the first page of each document in `fileMetadata` or in a dedicated `pdfPageCount` field within `pdfPages`.

#### 2. File blob caching (`reader.js` → `generic-viewer.js`)

**Current flow:**
```js
// reader.js → renderReader() → fetchFileBlob() → RenamerGenericViewer.renderFile(blob)
// For CBZ/CBR/EPUB: blob is fetched fresh every time via /api/files/blob or download URL
```

**After spec:**
```js
// fetchFileBlob checks IndexedDB for cached blob by path+mtime
// If hit: return cached blob (no network)
// If miss: fetch from server, store in IndexedDB, return blob
```

The blob cache key will be the file path. Cache invalidation will be based on file `mtime` (retrieved from `/api/files/info` or stored metadata). For large files, only the Blob reference is stored (IndexedDB stores Blob as a native type, no serialization needed).

#### 3. Reading progress caching (`app-reader.js` / `library.js`)

**Current flow:**
- On opening the reader tab or library page: `loadProgress(ctx, paths)` or `loadBookmarksForPaths(paths, cb)` fetches all progress from `/api/reader/progress/read`.
- On navigating between tabs: progress stays in memory.
- On page reload: progress is re-fetched.

**After spec:**
- On app/tab open: first check IndexedDB for `readingProgress` entries by userId.
  - If entries exist and are younger than a configurable TTL (e.g., 5 minutes), use cached data.
  - If entries are stale or missing, fetch from API and update cache.
- On progress save (`saveProgress`): update both the in-memory state and IndexedDB.
- On progress delete: remove from both in-memory state and IndexedDB.

This reduces the number of `/api/reader/progress/read` calls when the user quickly navigates between tabs.

#### 4. File metadata caching (`app-reader.js` / `library.js`)

**Current flow:**
- Libraries are fetched from `/api/reader/libraries` on every app open.
- Collections are fetched from `/api/reader/collections?libraryId=X` on every library open.
- Scanned files from `/api/reader/scan` are fetched once and stored in memory.

**After spec:**
- Library list cached in `libraryData` store with key `'libraries'`.
- Per-library collections cached in `libraryData` store with key `'collections:{libraryId}'`.
- Cache TTL: 30 seconds for collections (to pick up new scans); 2 minutes for libraries (rarely changes).
- On cache miss or stale data: fetch from API, update cache.

#### 5. Document metadata / file info caching

**Current flow:**
- File info retrieved via `/api/files/info` (POST, single path) or during scan.
- Used for determining file type, size, mtime for cache invalidation.

**After spec:**
- File info (name, size, mtime, ext, type) cached in `fileMetadata` store.
- Used to determine if a file blob or PDF page cache entry is stale.
- TTL: 1 hour (file metadata doesn't change often; Nextcloud file modification is tracked separately).

---

## Cache Invalidation Strategy

### File blob and PDF page invalidation

| Trigger | Action |
|---|---|
| File `mtime` changes (detected via `/api/files/info` or `fileMetadata` cache) | Invalidate blob + all PDF pages for that file path |
| Explicit scan / refresh (user clicks "Scanner un dossier") | Invalidate `fileMetadata`, `fileBlobs`, `pdfPages` for all scanned paths |
| User renames a file (via Renamer rename action) | Invalidate cache entry for old path, create new entry for new path |
| App-level reload (full page refresh after long closure) | Keep cache; validate freshness on next access (lazy invalidation) |
| User manually triggers cache clear | Clear all stores (or specific store) |

### TTL-based invalidation

| Store | Default TTL | Rationale |
|---|---|---|
| `fileMetadata` | 1 hour | File metadata rarely changes; long TTL avoids excessive `/api/files/info` calls |
| `fileBlobs` | 30 minutes (or mtime-based) | Large blobs; keep for session + short revisit |
| `pdfPages` | 10 minutes (or mtime-based) | Rendered pages are expensive to regenerate but also large |
| `epubState` | Until page reload | EPUB state is session-scoped; no cross-reload persistence |
| `readingProgress` | 5 minutes | Progress syncs to server every save; short TTL to pick up changes from other devices |
| `libraryData` | 30 seconds (collections), 2 minutes (libraries) | Collections may update after scan; libraries rarely change |
| `cacheMeta` | N/A (updated on every access) | Metadata about cache entries themselves |

> **Note:** TTL is a soft limit. Even with a TTL hit, if an mtime mismatch is detected (via `fileMetadata`), the entry is still invalidated.

### mtime-based freshness check

For file-scoped caches (`fileBlobs`, `pdfPages`):
1. Before serving a cached entry, look up `fileMetadata` for the path.
2. Compare cached `mtime` against the stored `mtime` in `fileMetadata`.
3. If they match → serve cached data.
4. If they differ or `fileMetadata` is missing → invalidate cache entry, fetch fresh data, update `fileMetadata`.

For user-scoped data (`readingProgress`, `libraryData`):
- No mtime equivalent; rely on TTL only.

---

## Disk Space Management

### Quota handling

- Use `navigator.storage.estimate()` to check current usage before writing large blobs.
- If remaining quota is insufficient for a file blob, log a warning and fall back to in-memory caching only (no IndexedDB write).
- On `QuotaExceededError`, evict the oldest entries in the relevant store based on `cacheMeta.lastAccessed`.

### Eviction policy

1. **LRU eviction** for `pdfPages` and `fileBlobs` stores:
   - Before writing a new entry, query `cacheMeta` ordered by `lastAccessed` ascending.
   - Delete oldest entries until estimated free space >= needed space (or free space >= 50% of total).

2. **Count-based eviction** for `readingProgress` and `libraryData`:
   - Cap at 500 entries; evict oldest by `lastAccessed`.

3. **Bulk clearance triggers:**
   - User-initiated "Clear cache" action in settings (if added later).
   - Storage pressure event: `window.addEventListener('storage', ...)` — not reliable for cross-tab, but `beforeunload` can trigger a flush of pending writes.

---

## Multi-tab coordination

Since the Renamer app may be open in multiple browser tabs simultaneously:

- **Writes** are safe because IndexedDB handles concurrent transactions.
- **Reads** are safe because they are isolated per-tab.
- **Cache staleness** across tabs: each tab maintains its own in-memory cache. When tab A writes to IndexedDB (e.g., saves progress), tab B will see the update on its next IndexedDB read. In-memory caches within each tab are not synchronized — this is acceptable because progress writes are immediately sent to the server.
- `storage` event on `window` can be used to notify other tabs of invalidation events (e.g., a file was renamed), but per AGENTS.md we avoid over-engineering — a simple approach is: any destructive operation (rename, delete, scan) clears the relevant IndexedDB store entries from all tabs via a broadcast.

---

## New Backend Endpoints

The existing backend already provides all endpoints needed for cache initialization and invalidation. No new backend endpoints are required for the v1 of IndexedDB caching.

| Endpoint | Usage for cache |
|---|---|
| `GET /api/reader/libraries` | Populate `libraryData` store |
| `GET /api/reader/progress` | Populate `readingProgress` store |
| `POST /api/reader/progress/read` | Populate/update `readingProgress` store |
| `POST /api/files/info` | Validate freshness of `fileMetadata`, `fileBlobs`, `pdfPages` |
| `GET /api/pdf/page?path=...&page=...` | Fetch PDF page on cache miss |
| `GET /api/files/blob?path=...` | Fetch file blob on cache miss |
| `POST /api/reader/scan` | Trigger cache invalidation for scanned paths |

### Potential backend convenience endpoint (optional, v1.5)

If cache invalidation proves too costly on the client side (e.g., validating mtimes for hundreds of files), a single batch endpoint could be added:

```
POST /api/files/metadata-batch
Body: { paths: string[] }
Response: { files: [{ path, mtime, size, name, ext, type }] }
```

This would allow validating the freshness of many files in one round-trip instead of N individual `/api/files/info` calls.

---

## Implementation Plan (v1)

### Phase 1: Core IDB module (`js/lib/idb-cache.js`)

- [ ] Create `js/lib/idb-cache.js` with `open()`, `get()`, `set()`, `del()`, `clear()`, `keys()`, `query()`.
- [ ] Wire up in `PageController::renderRenamerPage()` and `renderLibraryPage()` via `\OCP\Util::addScript('renamer', 'idb-cache')`.
- [ ] Add error handling: if IndexedDB unavailable, all operations are no-ops (return undefined / empty).
- [ ] `node --check js/lib/idb-cache.js` validation.

### Phase 2: File blob caching

- [ ] Modify `fetchFileBlob()` in `reader.js` to check IndexedDB first.
- [ ] Modify `renderFile()` entry in `reader.js` to cache fetched blobs.
- [ ] Cache invalidation based on `fileMetadata.mtime`.
- [ ] `node --check js/tabs/pdf/reader.js` validation.

### Phase 3: PDF page caching

- [ ] Modify `PdfSource.prototype._fetchPage()` in `generic-viewer.js` to check IndexedDB after in-memory cache miss.
- [ ] Store page dataUrls in `pdfPages` store with `[path, pageNum]` composite key.
- [ ] Cache page count alongside page 1.
- [ ] Eviction: on `destroy()`, optionally persist remaining pages to IndexedDB before clearing in-memory cache.
- [ ] `node --check js/tabs/pdf/generic-viewer.js` validation.

### Phase 4: Reading progress caching

- [ ] Modify `loadProgress()` in `app-reader.js` to check IndexedDB first.
- [ ] Modify `saveProgress()` to write to IndexedDB immediately (optimistic) + server.
- [ ] Modify `deleteProgress()` to remove from IndexedDB.
- [ ] Same modifications for `library.js` (`loadBookmarksForPaths`, bookmark save/delete).
- [ ] `node --check js/tabs/reader/app-reader.js` validation.
- [ ] `node --check js/library.js` validation.

### Phase 5: Library/collection metadata caching

- [ ] Modify `loadLibraries()` to check IndexedDB with TTL.
- [ ] Modify `loadCollections()` to check IndexedDB with TTL.
- [ ] Invalidate on scan completion (new library/collection created).
- [ ] `node --check js/tabs/reader/app-reader.js` validation.
- [ ] `node --check js/library.js` validation.

### Phase 6: DOM caching enhancement (optional)

- [ ] The existing in-memory DOM cache (`ctx.state.readerDomCache`) can optionally be serialized to IndexedDB.
  - **Caution:** DOM elements are not structured-cloneable. Only cache a lightweight "snapshot" (page number, zoom, fit mode) rather than the full DOM tree.
  - On reopen, restore the snapshot (page, zoom) and re-render, but skip the file blob fetch if already cached.

### Phase 7: Cache management UI (deferred)

- [ ] Add a "Clear cache" button in reader settings (if a settings panel exists).
- [ ] Add cache usage display (via `navigator.storage.estimate()`).
- Deferred to a later phase — out of scope for v1.

---

## i18n Keys

New i18n keys (FR + EN), to be added to `app.js` translations:

| Key | FR | EN |
|---|---|---|
| `readerCacheClearing` | "Effacement du cache..." | "Clearing cache..." |
| `readerCacheCleared` | "Cache vidé" | "Cache cleared" |
| `readerCacheError` | "Erreur du cache" | "Cache error" |
| `readerCacheUsed` | "Depuis le cache" | "From cache" |
| `readerCacheStale` | "Cache périmé, actualisation..." | "Cache stale, refreshing..." |

---

## Error Handling & Graceful Degradation

| Error scenario | Behavior |
|---|---|
| `indexedDB` undefined | All cache operations are no-ops; app behaves as today (in-memory only) |
| `open()` fails (browser policy, private mode) | Log warning; set `window.__renamerIDBAvailable = false`; skip all cache operations |
| `set()` fails (QuotaExceededError) | Log warning; continue without caching this entry; proceed with normal fetch |
| `transaction` fails | Catch and log; return null/undefined so caller proceeds with network fetch |
| Browser page closed mid-transaction | IndexedDB transactions are atomic; no corruption |
| Structured clone failure (unsupported type) | Catch; log; skip caching for that entry type |

---

## Validation

```bash
node --check js/lib/idb-cache.js
node --check js/tabs/reader/app-reader.js
node --check js/tabs/pdf/generic-viewer.js
node --check js/tabs/pdf/reader.js
node --check js/library.js
```

All five commands must pass without error.

---

## Files Affected

| File | Change |
|---|---|
| `js/lib/idb-cache.js` | **New** — IndexedDB wrapper module |
| `js/tabs/reader/app-reader.js` | Cache integration for progress, libraries, collections |
| `js/tabs/pdf/generic-viewer.js` | PDF page caching, blob caching hooks |
| `js/tabs/pdf/reader.js` | Blob caching entry point |
| `js/library.js` | Cache integration for standalone library page |
| `lib/Controller/PageController.php` | Add `\OCP\Util::addScript('renamer', 'idb-cache')` to `renderRenamerPage()` and `renderLibraryPage()` |
| `js/app.js` | Add new i18n keys |
| `appinfo/routes.php` | No changes needed (existing routes suffice) |

---

## Non-goals (v1)

- No IndexedDB for the **metadata** tab (out of scope — metadata tab already uses server-side reads).
- No IndexedDB for the **advanced rename** tab (server-side operations only).
- No IndexedDB for the **PDF convert CBZ** tab (server-side processing only).
- No cross-device sync of cache (progress sync is handled via server API).
- No encryption of cached data (Nextcloud files are already user-scoped; browser storage is sandboxed per-origin).
