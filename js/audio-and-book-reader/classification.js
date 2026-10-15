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
                                                    var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;
    var SEQUEL_THRESHOLD = L.SEQUEL_THRESHOLD;
    var DOC_EXT = L.DOC_EXT;
    var IMG_EXT = L.IMG_EXT;

    function classifyScan(files, rootFolder) {
        var prefix = (rootFolder || '').replace(/^\/+|\/+$/g, '');
        var rootBase = (prefix ? prefix.split('/').pop() : '') || 'Bibliothèque';

        var folderMap = {};
        var allParsed = [];
        files.forEach(function (f) {
            var ext = fileExt(f);
            if (DOC_EXT.indexOf(ext) === -1 && IMG_EXT.indexOf(ext) === -1) return;
            var absPath = (f.path || '').replace(/^\/+/, '');
            var rel = (prefix && absPath.indexOf(prefix + '/') === 0) ? absPath.substring(prefix.length + 1) : absPath;
            var slashIdx = rel.lastIndexOf('/');
            var folderRel = slashIdx === -1 ? '' : rel.substring(0, slashIdx);
            if (!folderMap[folderRel]) {
                folderMap[folderRel] = { documents: [], images: [] };
            }
            var entry = parseScanEntry(f);
            if (DOC_EXT.indexOf(ext) !== -1) {
                folderMap[folderRel].documents.push(entry);
                allParsed.push(entry);
            } else {
                folderMap[folderRel].images.push(entry);
            }
        });

        Object.keys(folderMap).forEach(function (key) {
            var fd = folderMap[key];
            sortFiles(fd.documents);
            sortFiles(fd.images);
            fd.documents.forEach(function (f, i) { f.tome = (f.volume > 0) ? f.volume : (i + 1); });
        });

        var folderSet = {};
        Object.keys(folderMap).forEach(function (folderRel) {
            if (!folderRel) return;
            var parts = folderRel.split('/');
            for (var i = 1; i <= parts.length; i++) {
                folderSet[parts.slice(0, i).join('/')] = true;
            }
        });

        function folderAbs(folderRel) {
            if (!prefix) return folderRel || '';
            return folderRel ? prefix + '/' + folderRel : prefix;
        }

        function folderName(folderRel) {
            return folderRel ? folderRel.split('/').pop() : rootBase;
        }

        function directSubfolders(folderRel) {
            var result = [];
            var expected = folderRel ? folderRel + '/' : '';
            Object.keys(folderSet).forEach(function (key) {
                if (key === folderRel) return;
                if (expected === '') {
                    if (key.indexOf('/') === -1) result.push(key);
                } else if (key.indexOf(expected) === 0) {
                    var rem = key.substring(expected.length);
                    if (rem.indexOf('/') === -1) result.push(key);
                }
            });
            result.sort();
            return result;
        }

        function buildNode(folderRel, isRoot) {
            var fd = folderMap[folderRel] || { documents: [], images: [] };
            var subs = directSubfolders(folderRel);
            var looseImages = fd.images.slice();
            var otherSubs = [];
            var hasDocuments = fd.documents.length > 0;

            subs.forEach(function (subRel) {
                var subName = folderName(subRel);
                if (subName.toLowerCase() === 'images' && hasDocuments) {
                    var subFd = folderMap[subRel];
                    if (subFd) {
                        looseImages = looseImages.concat(subFd.images, subFd.documents);
                    }
                } else {
                    otherSubs.push(subRel);
                }
            });

            var children = [];

            // Special case: folder with exactly 1 document + 1 image + no subfolders.
            // The image is treated as the document's cover, not a separate "Images" sub-collection.
            var singleDocCoverCase = hasDocuments && fd.documents.length === 1 && looseImages.length === 1 && otherSubs.length === 0;

            if (looseImages.length > 0 && hasDocuments && !singleDocCoverCase) {
                sortFiles(looseImages);
                looseImages.forEach(function (f) { f.tome = 0; });
                children.push({
                    name: 'Images',
                    folder: folderAbs(folderRel),
                    files: looseImages,
                    children: [],
                    isImages: true,
                    isImageTome: true
                });
            }

            if (!isRoot) {
                otherSubs.forEach(function (subRel) {
                    var childNode = buildNode(subRel, false);
                    if (childNode) children.push(childNode);
                });
            }

            var nodeFiles = fd.documents;
            var isImageTome = false;
            if (fd.documents.length === 0 && looseImages.length > 0) {
                nodeFiles = looseImages.slice();
                sortFiles(nodeFiles);
                nodeFiles.forEach(function (f, i) { f.tome = (f.volume > 0) ? f.volume : (i + 1); });
                isImageTome = children.length === 0;
            }

            if (!nodeFiles.length && !children.length) {
                return null;
            }

            return {
                name: folderName(folderRel),
                folder: folderAbs(folderRel),
                files: nodeFiles,
                children: children,
                isImages: false,
                isImageTome: isImageTome
            };
        }

        var result = {};
        var rootNode = buildNode('', true);
        if (rootNode) result[rootNode.name] = rootNode;
        directSubfolders('').forEach(function (folderRel) {
            var node = buildNode(folderRel, false);
            if (node) result[node.name] = node;
        });

        function buildReaderSequels() {
            var folders = [];
            Object.keys(folderSet).forEach(function (folderRel) {
                if (folderRel === '') return;
                folders.push({ abs: folderAbs(folderRel), name: folderName(folderRel) });
            });
            var parsed = folders.map(function (f) {
                var sb = sequelBaseOf(f.name);
                return { abs: f.abs, base: sb.base, suffix: sb.suffix, hasSuffix: sb.hasSuffix };
            });
            var links = {};
            parsed.forEach(function (a) {
                if (a.hasSuffix) return;
                var candidates = parsed.filter(function (b) {
                    if (b.abs === a.abs || !b.hasSuffix) return false;
                    if (b.base === a.base) return true;
                    return jaccardTokens(a.base, b.base) >= SEQUEL_THRESHOLD;
                });
                if (candidates.length) {
                    candidates.sort(function (x, y) { return x.suffix - y.suffix; });
                    links[a.abs] = candidates[0].abs;
                }
            });
            return links;
        }

        state.readerSeriesTree = buildReaderSeriesTree(allParsed);
        state.readerSeriesLoaded = true;
        state.readerSequels = L.buildReaderSequels();
        return result;
    }

    function collectAllFiles(node) {
        var files = [];
        if (node) {
            if (node.files && node.files.length) files = files.concat(node.files);
            if (node.children && node.children.length) {
                node.children.forEach(function (child) {
                    files = files.concat(collectAllFiles(child));
                });
            }
        }
        return files;
    }

    function hasOnlyImageFiles(files) {
        files = files || [];
        if (!files.length) return false;
        return files.every(function(f) {
            if (!f) return false;
            return IMG_EXT.indexOf(fileExt(f)) !== -1;
        });
    }

    function enrichBackendNode(node) {
        if (!node || typeof node !== 'object') return node;
        var files = node.files || [];
        var rawChildren = node.children || [];
        var children = Array.isArray(rawChildren) ? rawChildren.map(enrichBackendNode) : [];
        var allImages = hasOnlyImageFiles(files);
        var result = {};
        Object.keys(node).forEach(function(key) {
            result[key] = node[key];
        });
        result.files = files;
        result.children = children;
        result.isImages = !!allImages;
        return result;
    }

    function getCollectionRoot(collection) {
        if (!collection || !collection.rules) return null;
        var files = collection.rules.files || [];
        var rawChildren = collection.rules.children || [];
        var children = Array.isArray(rawChildren) ? rawChildren.map(enrichBackendNode) : [];
        var hasOnlyImages = hasOnlyImageFiles(files);
        return {
            name: collection.name || '',
            folder: collection.rules.folder || '',
            files: files,
            children: children,
            isImages: false,
            isImageTome: hasOnlyImages && children.length === 0
        };
    }

    function getCurrentNode(collection) {
        var node = getCollectionRoot(collection);
        if (!node) return null;
        var path = state.readerTreePath || [];
        for (var i = 0; i < path.length; i++) {
            if (node.children && node.children[path[i]]) {
                node = node.children[path[i]];
            } else {
                break;
            }
        }
        return node;
    }

    function stripRulesForBackend(rules) {
        if (!rules || typeof rules !== 'object') return rules;
        var cleaned = { folder: rules.folder, files: [], children: [] };
        if (Array.isArray(rules.files)) {
            cleaned.files = rules.files.map(function (f) {
                return {
                    path: f.path,
                    name: f.name,
                    tome: f.tome,
                    type: f.type,
                    size: f.size,
                    mtime: f.mtime,
                    pages: f.pages,
                    displayTitle: f.displayTitle
                };
            });
        }
        if (Array.isArray(rules.children)) {
            cleaned.children = rules.children.map(stripRulesForBackend);
        }
        return cleaned;
    }

    function enrichFileEntries(rules) {
        if (!rules || typeof rules !== 'object') return rules;
        if (Array.isArray(rules.files)) {
            rules.files.forEach(function (f) {
                var parsed = parseFilename(f.name || (f.path ? f.path.split('/').pop() : ''));
                f.series = parsed.series;
                if (parsed.volume > 0) f.volume = parsed.volume;
                if (parsed.chapter > 0) f.chapter = parsed.chapter;
                f.tome = parsed.volume > 0 ? parsed.volume : f.tome;
                f.tomes = (parsed.volumeRange && parsed.volumeRange.length) ? parsed.volumeRange
                    : (f.tome > 0 ? [f.tome] : []);
                if (parsed.displayTitle && !f.displayTitle) f.displayTitle = parsed.displayTitle;
            });
            rules.files.sort(function (a, b) {
                var ta = (a.volume > 0 ? a.volume : a.tome) || 0;
                var tb = (b.volume > 0 ? b.volume : b.tome) || 0;
                if (ta !== tb) return ta - tb;
                return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
            });
        }
        if (Array.isArray(rules.children)) {
            rules.children.forEach(enrichFileEntries);
        }
        return rules;
    }

    function classifyScanFlat(files, rootFolder) {
        var prefix = (rootFolder || '').replace(/^\/+|\/+$/g, '');
        var rootBase = (prefix ? prefix.split('/').pop() : '') || 'Bibliothèque';

        var docs = [];
        files.forEach(function (f) {
            var ext = fileExt(f);
            if (DOC_EXT.indexOf(ext) === -1) return;
            var parsed = parseScanEntry(f);
            docs.push(parsed);
        });
        sortFiles(docs);
        docs.forEach(function (f, i) { f.tome = i + 1; });

        state.readerSeriesTree = {};
        state.readerSeriesLoaded = true;
        state.readerSequels = {};
        return { rootBase: { name: rootBase, folder: prefix, files: docs, children: [], isImages: false, isImageTome: false } };
    }

    L.classifyScan = classifyScan;
    L.collectAllFiles = collectAllFiles;
    L.hasOnlyImageFiles = hasOnlyImageFiles;
    L.enrichBackendNode = enrichBackendNode;
    L.getCollectionRoot = getCollectionRoot;
    L.getCurrentNode = getCurrentNode;
    L.stripRulesForBackend = stripRulesForBackend;
    L.enrichFileEntries = enrichFileEntries;
    L.classifyScanFlat = classifyScanFlat;

})(window.RenamerLibrary);