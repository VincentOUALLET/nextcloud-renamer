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
    var findMissingTomes = L.findMissingTomes;
    var countTomes = L.countTomes;
    var tomeLabelFor = L.tomeLabelFor;
    var isTomeInProgress = L.isTomeInProgress;
    var renderTomeStatusIcon = L.renderTomeStatusIcon;
    var bookmarkLabel = L.bookmarkLabel;
    var flattenFilesAndSubCollections = L.flattenFilesAndSubCollections;
    var parseNumberRange = L.parseNumberRange;
    var minNumberFromRange = L.minNumberFromRange;

    function hideContextMenu() {
        var m = document.getElementById('lib-context-menu');
        if (m) {
            m.remove();
        }
    }

    function attachLongPress(el) {
        var timer = null;
        var startX = 0, startY = 0;
        var THRESHOLD = 15;
        var DELAY = 600;
        var destroyed = false;
        function onTouchStart(e) {
            if (timer || destroyed) return;
            if (e.touches.length !== 1) return;
            var t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            timer = setTimeout(function () {
                if (destroyed) return;
                if (document.getElementById('lib-context-menu')) return;
                var ev = new MouseEvent('contextmenu', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: startX,
                    clientY: startY
                });
                el.dispatchEvent(ev);
                timer = null;
            }, DELAY);
        }
        function onTouchMove(e) {
            if (!timer) return;
            if (e.touches.length > 0) {
                var t = e.touches[0];
                if (Math.abs(t.clientX - startX) > THRESHOLD || Math.abs(t.clientY - startY) > THRESHOLD) {
                    clearTimeout(timer);
                    timer = null;
                }
            }
        }
        function onTouchEnd() {
            if (timer) { clearTimeout(timer); timer = null; }
        }
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchEnd);
        return function destroy() {
            destroyed = true;
            if (timer) { clearTimeout(timer); timer = null; }
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
    }

    function showContextMenu(e, items, target) {
        e.preventDefault();
        hideContextMenu();
        var x = e.clientX;
        var y = e.clientY;
        var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        var m = document.createElement('div');
        m.id = 'lib-context-menu';
        m.className = 'lib-context-menu';
        m.style.left = x + 'px';
        m.style.top = y + 'px';
        items.forEach(function (it) {
            if (it.type === 'separator') {
                var sep = document.createElement('div');
                sep.className = 'lib-context-separator';
                m.appendChild(sep);
                return;
            }
            var item = document.createElement('div');
            item.className = 'lib-context-item';
            if (it.icon) {
                var span = document.createElement('span');
                span.className = 'lib-context-icon';
                span.innerHTML = it.icon;
                item.appendChild(span);
            }
            var label = document.createElement('span');
            label.textContent = it.label;
            item.appendChild(label);
            item.addEventListener('mousedown', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (ev.button === 1 && it.url) {
                    window.open(it.url, '_blank');
                    return;
                }
                if (typeof it.action === 'function') {
                    try { it.action(target); } catch (err) { showToast((err && err.message) || t('renamedError'), 'error'); }
                }
                hideContextMenu();
            });
            m.appendChild(item);
        });
        document.body.appendChild(m);
        var rect = m.getBoundingClientRect();
        if (rect.right > viewportWidth) m.style.left = Math.max(0, viewportWidth - rect.width - 8) + 'px';
        if (rect.bottom > viewportHeight) m.style.top = Math.max(0, viewportHeight - rect.height - 8) + 'px';
        var onOutside = function (ev) {
            if (ev.type === 'contextmenu') return;
            var menu = document.getElementById('lib-context-menu');
            if (!menu) {
                document.removeEventListener('click', onOutside);
                document.removeEventListener('contextmenu', onOutside);
                return;
            }
            if (ev.target && (ev.target === menu || (ev.target.closest && ev.target.closest('.lib-context-menu')))) return;
            hideContextMenu();
            document.removeEventListener('click', onOutside);
            document.removeEventListener('contextmenu', onOutside);
        };
        setTimeout(function () {
            document.addEventListener('click', onOutside);
            document.addEventListener('contextmenu', onOutside);
        }, 0);
    }

    L.hideContextMenu = hideContextMenu;
    L.attachLongPress = attachLongPress;
    L.showContextMenu = showContextMenu;

})(window.RenamerLibrary);