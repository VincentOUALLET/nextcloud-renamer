(function (L) {
    'use strict';

    var state = L.state;
    var t = L.t;
    var apiRequest = L.apiRequest;
    var getBaseUrl = L.getBaseUrl;
    var dbg = L.dbg;
    var getWebdavUrl = L.getWebdavUrl;
    var getDavHeaders = L.getDavHeaders;
    var showToast = L.showToast;
    var showLoader = L.showLoader;
    var hideLoader = L.hideLoader;
    var escapeHtml = L.escapeHtml;
    var formatSize = L.formatSize;
    var fileIcon = L.fileIcon;
    var parseFilename = L.parseFilename;
    var parseScanEntry = L.parseScanEntry;
    var sequelBaseOf = L.sequelBaseOf;
    var jaccardTokens = L.jaccardTokens;
    var buildReaderSeriesTree = L.buildReaderSeriesTree;
    var sortFiles = L.sortFiles;
    var fileExt = L.fileExt;
    var makeFileEntry = L.makeFileEntry;
    var coverUrl = L.coverUrl;
    var coverOfFirstTome = L.coverOfFirstTome;
    var loadCoversBulk = L.loadCoversBulk;
    var renderTomeIcon = L.renderTomeIcon;
    var renderNoCoverPlaceholder = L.renderNoCoverPlaceholder;
                var isTomeInProgress = L.isTomeInProgress;
    var renderTomeStatusIcon = L.renderTomeStatusIcon;
    var bookmarkLabel = L.bookmarkLabel;
        var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;

    function renameTome(tome, collection) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        if (!collection) { showToast(t('scanError'), 'error'); return; }
        var currentName = tome.name || '';
        var baseName = currentName.replace(/\.[^.]+$/, '');
        var ext = currentName.match(/\.[^.]+$/) || '';
        RenamerUtils.showPromptDialog(t('rename'), '', baseName, function (inputName) {
            var newName = (inputName || '').trim();
            if (!newName || newName === baseName) return;
            newName = newName + ext;
            var oldPath = tome.path;
            var dirIdx = oldPath.lastIndexOf('/');
            var dir = dirIdx >= 0 ? oldPath.substring(0, dirIdx) : '';
            var newPath = dir ? (dir + '/' + newName) : newName;
            var oldUrl = getWebdavUrl(oldPath);
            var newUrl = getWebdavUrl(newPath);
            var headers = getDavHeaders();
            headers['Destination'] = newUrl;
            fetch(oldUrl, {
                method: 'MOVE',
                credentials: 'same-origin',
                headers: headers
            }).then(function(r) {
                if (r.ok) {
                    showToast(t('renamed'), 'info');
                    if (collection && collection.id) {
                        L.loadCollections(state.currentLibrary.id, function () { L.renderTomes(state.currentCollection); });
                    }
                } else {
                    showToast(t('renamedError'), 'error');
                }
            }).catch(function() { showToast(t('renamedError'), 'error'); });
        }, { dialogId: 'renamer-rename-tome', confirmLabel: t('rename') });
    }

    function deleteTome(tome, collection) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        var msg = t('contextDelete') + ' "' + (tome.name || '') + '" ?';
        RenamerUtils.showConfirmDialog(
            t('contextDelete'),
            msg,
            function () {
                var url = getWebdavUrl(tome.path);
                fetch(url, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    headers: getDavHeaders()
                }).then(function(r) {
                    if (r.ok) {
                        showToast(t('deleted'), 'info');
                        if (collection && collection.id) {
                            L.loadCollections(state.currentLibrary.id, function () { L.renderTomes(state.currentCollection); });
                        }
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function() { showToast(t('scanError'), 'error'); });
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-tome' }
        );
    }

    function renameSubCollection(node, idx, collection) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        RenamerUtils.showPromptDialog(t('rename'), '', node.name || '', function (newName) {
            newName = (newName || '').trim();
            if (!newName || newName === node.name) return;
            var root = L.getCollectionRoot(collection);
            if (!root) return;
            var parent = root;
            var path = state.readerTreePath || [];
            for (var i = 0; i < path.length; i++) {
                if (parent.children && parent.children[path[i]]) {
                    parent = parent.children[path[i]];
                } else {
                    return;
                }
            }
            if (parent.children && parent.children[idx]) {
                parent.children[idx].name = newName;
                var payload = { name: collection.name || '', description: collection.description || '', rules: root };
                apiRequest(getBaseUrl() + '/api/reader/collections/' + collection.id, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                }).then(function (data) {
                    if (data && data.success) {
                        showToast(t('renamed'), 'info');
                        L.renderTomes(collection);
                    } else {
                        showToast(t('renamedError'), 'error');
                    }
                }).catch(function () { showToast(t('renamedError'), 'error'); });
            }
        }, { dialogId: 'renamer-rename-subcol', confirmLabel: t('rename') });
    }

    function deleteSubCollection(node, idx, collection) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        var msg = t('contextDelete') + ' "' + (node.name || '') + '" ?';
        RenamerUtils.showConfirmDialog(
            t('contextDelete'),
            msg,
            function () {
                var root = L.getCollectionRoot(collection);
                if (!root) return;
                var parent = root;
                var path = state.readerTreePath || [];
                for (var i = 0; i < path.length; i++) {
                    if (parent.children && parent.children[path[i]]) {
                        parent = parent.children[path[i]];
                    } else {
                        return;
                    }
                }
                if (parent.children && parent.children[idx]) {
                    parent.children.splice(idx, 1);
                    var payload = { name: collection.name || '', description: collection.description || '', rules: root };
                    apiRequest(getBaseUrl() + '/api/reader/collections/' + collection.id, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    }).then(function (data) {
                        if (data && data.success) {
                            showToast(t('deleted'), 'info');
                            L.renderTomes(collection);
                        } else {
                            showToast(t('scanError'), 'error');
                        }
                    }).catch(function () { showToast(t('scanError'), 'error'); });
                }
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-subcol' }
        );
    }

function renameCollection(col, lib) {

        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }

        L.promptRename(t('renameCollection'), col.name || '', function (name) {

            var payload = { name: name, description: col.description || '', rules: col.rules || { files: [] } };

            apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'PUT', body: JSON.stringify(payload) }).then(function (data) {

                if (data && data.success) {

                    var r = data.collection || {};

                    if (r.name != null) { col.name = r.name; col.description = r.description || ''; col.rules = r.rules || (col.rules || { files: [] }); }

                    else { col.name = name; }

                    showToast(t('renamed'), 'info');

                    if (lib) { L.loadCollections(lib.id, function () { L.renderCollections(lib); }); }

                } else {

                    showToast(t('renamedError'), 'error');

                }

            }).catch(function () { showToast(t('renamedError'), 'error'); });

        });

    }

    L.renameTome = renameTome;
    L.deleteTome = deleteTome;
    L.renameSubCollection = renameSubCollection;
    L.deleteSubCollection = deleteSubCollection;

    L.renameCollection = renameCollection;

function markTomeRead(tome, collection) {

         var path = tome && (tome.path || (tome.file && tome.file.path));

         if (!path) { showToast(t('scanError'), 'error'); return; }

         apiRequest(getBaseUrl() + '/api/reader/progress', {

             method: 'POST',

             body: JSON.stringify({ path: path, type: 'read', value: 0, total: 0 })

          }).then(function (data) {

               if (data && data.success) {

                   state.bookmarks[path] = { type: 'read', value: 0, total: 0, timestamp: Date.now() };

                   state.domCache = state.domCache || {};

                   delete state.domCache[path];

                   state.progressLoaded = true;

                   showToast(t('markedRead'), 'info');

                   L.render();

              } else {

                  showToast(t('scanError'), 'error');

              }

          }).catch(function () { showToast(t('scanError'), 'error'); });

      }

function markTomeUnread(tome, collection) {

          var path = tome && (tome.path || (tome.file && tome.file.path));

          if (!path) { showToast(t('scanError'), 'error'); return; }

          apiRequest(getBaseUrl() + '/api/reader/progress', {

              method: 'DELETE',

              body: JSON.stringify({ path: path })

          }).then(function (data) {

               if (data && data.success) {

                   state.bookmarks[path] = null;

                   state.domCache = state.domCache || {};

                   delete state.domCache[path];

                   state.progressLoaded = true;

                   showToast(t('markedUnread'), 'info');

                   L.render();

               } else {

                   showToast(t('scanError'), 'error');

               }

           }).catch(function () { showToast(t('scanError'), 'error'); });

       }

function markPathsRead(paths, reRenderFn) {

         if (!paths.length) return;

         apiRequest(getBaseUrl() + '/api/reader/progress/mark', {

             method: 'POST',

             body: JSON.stringify({ paths: paths, type: 'read' })

          }).then(function (data) {

               if (data && data.success) {

                   paths.forEach(function (p) {

                       state.bookmarks[p] = { type: 'read', value: 0, total: 0, timestamp: Date.now() };

                       state.domCache = state.domCache || {};

                       delete state.domCache[p];

                   });

                   state.progressLoaded = true;

                   showToast(t('markedRead'), 'info');

                   if (typeof reRenderFn === 'function') reRenderFn();

              } else {

                  showToast(t('scanError'), 'error');

              }

          }).catch(function () { showToast(t('scanError'), 'error'); });

      }

function markPathsUnread(paths, reRenderFn) {

         if (!paths.length) return;

         apiRequest(getBaseUrl() + '/api/reader/progress/mark', {

             method: 'POST',

             body: JSON.stringify({ paths: paths, type: null })

          }).then(function (data) {

               if (data && data.success) {

                   paths.forEach(function (p) {

                       state.bookmarks[p] = null;

                       state.domCache = state.domCache || {};

                       delete state.domCache[p];

                   });

                   state.progressLoaded = true;

                   showToast(t('markedUnread'), 'info');

                   if (typeof reRenderFn === 'function') reRenderFn();

               } else {

                  showToast(t('scanError'), 'error');

              }

          }).catch(function () { showToast(t('scanError'), 'error'); });

     }

function markCollectionRead(collection, lib) {

          var paths = L.collectPaths(collection);

          markPathsRead(paths, function () {

              L.render();

          });

      }

function markCollectionUnread(collection, lib) {

          var paths = L.collectPaths(collection);

          markPathsUnread(paths, function () {

              L.render();

          });

      }

function markNodeRead(node, collection) {

          var paths = L.collectPaths(node);

          markPathsRead(paths, function () {

              L.render();

          });

      }

function markNodeUnread(node, collection) {

          var paths = L.collectPaths(node);

          markPathsUnread(paths, function () {

              L.render();

          });

      }

    L.markTomeRead = markTomeRead;
    L.markTomeUnread = markTomeUnread;
    L.markPathsRead = markPathsRead;
    L.markPathsUnread = markPathsUnread;
    L.markCollectionRead = markCollectionRead;
    L.markCollectionUnread = markCollectionUnread;
    L.markNodeRead = markNodeRead;
    L.markNodeUnread = markNodeUnread;

})(window.RenamerLibrary);