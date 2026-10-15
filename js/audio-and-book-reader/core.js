(function (L) {
    'use strict';

    L.DOC_EXT = ['pdf', 'cbz', 'cbr', 'epub', 'azw', 'azw3', 'mobi', 'prc'];
    L.IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    L.LIB_ACCENT = '#a855f7';
    L.PAGE_ROOT = document.getElementById('library-page');

    L.SEQUEL_THRESHOLD = 0.85;
    L.VOL_MARKER_RE = /(?:\b(?:vol|volume|v|tome|t|巻|卷|册|권|장|시즌|เล่ม|เล่มที่|Том|Тома)|\[(?:V|VOL|토|卷)\])\s*[\d\-.]+/i;
    L.CH_MARKER_RE = /(?:\b(?:ch|chapter|c|chapitre|épisode|episode|話|话|化|回|화|회|บทที่|ตอนที่|Глава)|\[(?:CH|CHAPTER|화)\])\s*[\d\-.]+/i;

    L.fileExt = function (f) {
        return (f.extension || (f.name ? f.name.split('.').pop().toLowerCase() : '')).toLowerCase();
    };

    L.makeFileEntry = function (f) {
        var nm = f && f.name ? String(f.name) : '';
        return {
            path: f.path, name: nm, tome: 0, type: L.fileExt(f),
            size: f.size || 0, mtime: f.mtime || 0, pages: f.pages || 0,
            series: nm ? nm.replace(/\.[^.]+$/, '') : '', volume: 0, chapter: 0, displayTitle: '',
        };
    };

    L.minNumberFromRange = function (s) {
        if (s == null) return 0;
        var first = (String(s).split(/[-–]/)[0] || '').trim();
        var m = first.match(/(\d+)/);
        if (!m) return 0;
        var v = parseFloat(m[1]);
        return isNaN(v) ? 0 : v;
    };

    L.parseNumberRange = function (s) {
        if (s == null) return [];
        var nums = String(s).split(/[-–]/).map(function (p) {
            var m = (p || '').match(/(\d+)/);
            return m ? parseFloat(m[1]) : NaN;
        }).filter(function (n) { return !isNaN(n); });
        if (!nums.length) return [];
        if (nums.length >= 2 && Number.isInteger(nums[0]) && Number.isInteger(nums[1]) && nums[0] <= nums[1]) {
            var arr = [];
            for (var n = nums[0]; n <= nums[1]; n++) arr.push(n);
            return arr;
        }
        return [nums[0]];
    };

    L.parseFilename = function (name) {
        var result = { series: '', volume: 0, chapter: 0, displayTitle: '' };
        if (!name) return result;
        var base = String(name).replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        var volM = L.VOL_MARKER_RE.exec(base);
        var chM = L.CH_MARKER_RE.exec(base);
        var volume = volM ? L.minNumberFromRange(volM[0]) : 0;
        var chapter = chM ? L.minNumberFromRange(chM[0]) : 0;
        var volumeRange = volM ? L.parseNumberRange(volM[0]) : [];
        var chapterRange = chM ? L.parseNumberRange(chM[0]) : [];
        var hasVol = !!volM, hasCh = !!chM;
        var firstIdx = base.length, lastEnd = 0;
        if (volM && volM.index < firstIdx) firstIdx = volM.index;
        if (chM && chM.index < firstIdx) firstIdx = chM.index;
        if (volM && (volM.index + volM[0].length) > lastEnd) lastEnd = volM.index + volM[0].length;
        if (chM && (chM.index + chM[0].length) > lastEnd) lastEnd = chM.index + chM[0].length;
        var series = firstIdx < base.length ? base.substring(0, firstIdx) : base;
        series = series.replace(/[\s\-–—:;\.]+$/g, '').trim();
        var displayTitle = (lastEnd > 0 && lastEnd < base.length) ? base.substring(lastEnd).trim() : '';
        if (!series) {
            if (hasVol) series = displayTitle.replace(/^[\s\-–—:;\.]+/g, '').trim();
            if (!series && !hasVol && !hasCh) series = base;
        }
        result.series = series; result.volume = volume; result.chapter = chapter;
        result.volumeRange = volumeRange; result.chapterRange = chapterRange; result.displayTitle = displayTitle;
        return result;
    };

    L.parseScanEntry = function (f) {
        var e = L.makeFileEntry(f);
        var parsed = L.parseFilename(e.name);
        e.series = parsed.series; e.volume = parsed.volume; e.chapter = parsed.chapter;
        e.tome = e.volume;
        e.tomes = (parsed.volumeRange && parsed.volumeRange.length) ? parsed.volumeRange
            : (parsed.volume > 0 ? [parsed.volume] : []);
        e.displayTitle = parsed.displayTitle;
        return e;
    };

    L.jaccardTokens = function (a, b) {
        function tokens(s) {
            return String(s || '').toLowerCase().replace(/_/g, ' ').replace(/[\s]+/g, ' ').trim().split(/\s+/).filter(Boolean);
        }
        var ta = tokens(a), tb = tokens(b);
        var sa = {}, sb = {};
        ta.forEach(function (t) { sa[t] = true; });
        tb.forEach(function (t) { sb[t] = true; });
        var inter = 0;
        Object.keys(sa).forEach(function (t) { if (sb[t]) inter++; });
        var union = Object.keys(sa).length + Object.keys(sb).length - inter;
        return union === 0 ? 0 : inter / union;
    };

    L.sequelBaseOf = function (name) {
        var raw = String(name || '');
        var m = raw.match(/^(.*?)\s+([\d][\d.]*)\s*$/);
        if (m) {
            var suffix = L.minNumberFromRange(m[2]);
            return { base: (m[1] || '').trim().toLowerCase(), suffix: (isNaN(suffix) || suffix <= 0) ? null : suffix, hasSuffix: true };
        }
        return { base: raw.toLowerCase(), suffix: null, hasSuffix: false };
    };

    L.buildReaderSeriesTree = function (entries) {
        var bySeries = {};
        entries.forEach(function (e) {
            var series = e.series || (e.name ? String(e.name).replace(/\.[^.]+$/, '') : '');
            if (!bySeries[series]) bySeries[series] = {};
            if (!bySeries[series][e.volume]) bySeries[series][e.volume] = {};
            if (!bySeries[series][e.volume][e.chapter]) bySeries[series][e.volume][e.chapter] = [];
            bySeries[series][e.volume][e.chapter].push(e);
        });
        var tree = {};
        Object.keys(bySeries).forEach(function (series) {
            var volKeys = Object.keys(bySeries[series]).map(function (k) { return parseFloat(k); });
            volKeys.sort(function (a, b) { return a - b; });
            tree[series] = volKeys.map(function (vol) {
                var chMap = bySeries[series][String(vol)];
                var chKeys = Object.keys(chMap).map(function (k) { return parseFloat(k); });
                chKeys.sort(function (a, b) { return a - b; });
                return { volume: vol, chapters: chKeys.map(function (ch) { return { chapter: ch, files: chMap[String(ch)] }; }) };
            });
        });
        return tree;
    };

    L.sortFiles = function (files) {
        files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    };

    L.escapeHtml = function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    L.getBaseUrl = function () {
        if (typeof OC !== 'undefined' && OC.generateUrl) {
            return OC.generateUrl('/apps/renamer');
        }
        return '/apps/renamer';
    };

    L.dbg = function (context, info) {
        try {
            if (typeof console !== 'undefined' && console.debug) {
                var payload = typeof info === 'object' && info !== null ? info : { info: info };
                console.debug('[Renamer]', context, payload);
            }
        } catch (e) { /* noop */ }
    };

    L.getWebdavUrl = function (filePath) {
        var cleanPath = String(filePath || '').replace(/^\/+/, '');
        var segments = cleanPath.split('/').map(function (s) { return encodeURIComponent(s); });
        var base = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/remote.php/dav') : '/remote.php/dav';
        var uid = (typeof OC !== 'undefined' && OC.userid) ? OC.userid : '';
        var ownerUid = (L.state.currentCollection && L.state.currentCollection.userId) ? L.state.currentCollection.userId
            : (L.state.currentLibrary && L.state.currentLibrary.userId) ? L.state.currentLibrary.userId : null;
        var prefix = ownerUid ? ('users/' + ownerUid) : ('files/' + uid);
        var url = base + '/' + prefix + '/' + segments.join('/');
        if (url.indexOf('http') !== 0 && typeof window !== 'undefined' && window.location && window.location.origin) {
            url = window.location.origin + url;
        }
        return url;
    };

    L.getDavHeaders = function () {
        var headers = {};
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        return headers;
    };

    L.apiRequest = function (url, options) {
        options = options || {};
        var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        var opts = { method: options.method || 'GET', credentials: 'same-origin', headers: headers, body: options.body || null };
        if (options.signal) opts.signal = options.signal;
        var _t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        var _shortUrl = url.replace(L.getBaseUrl(), '');
        L.dbg('apiRequest', { method: opts.method, url: _shortUrl });
        return fetch(url, opts).then(function (r) {
            var _dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - _t0;
            L.dbg('apiRequest done', { url: _shortUrl, status: r.status, ok: r.ok, ms: Math.round(_dt) });
            if (!r.ok) {
                return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t); });
            }
            return r.json();
        }).catch(function (err) {
            var _dt2 = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - _t0;
            L.dbg('apiRequest error', { url: _shortUrl, ms: Math.round(_dt2), msg: err && err.message });
            throw err;
        });
    };

    L.showToast = function (message, type) {
        var container = document.getElementById('lib-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'lib-toast-container';
            container.className = 'lib-toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'lib-toast-renamer ' + (type === 'error' ? 'lib-toast-error' : type === 'info' ? 'lib-toast-info' : 'lib-toast-success');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3500);
    };

    L.showLoader = function () {
        var existing = document.getElementById('lib-loading-overlay');
        if (existing) return;
        var overlay = document.createElement('div');
        overlay.id = 'lib-loading-overlay';
        overlay.className = 'lib-loading-overlay';
        var spinner = document.createElement('div');
        spinner.className = 'lib-loading-spinner';
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    };

    L.hideLoader = function () {
        var overlay = document.getElementById('lib-loading-overlay');
        if (overlay) { overlay.remove(); }
    };

    L.formatSize = function (b) {
        if (!b) return '';
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024) return (b / 1024).toFixed(0) + ' KB';
        return b + ' B';
    };

    L.fileIcon = function (type) {
        if (!type) return '📄';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(type) !== -1) return '🖼';
        if (type === 'epub') return '📚';
        if (['cbz', 'cbr'].indexOf(type) !== -1) return '🗜';
        return '📄';
    };

    L.STAR_OUTLINE_PATH = 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z';
    L.FAV_STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + L.STAR_OUTLINE_PATH + '"></path></svg>';
    L.HOME_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 495.398 495.398" fill="' + L.LIB_ACCENT + '"><path d="M487.083,225.514l-75.08-75.08V63.704c0-15.682-12.708-28.391-28.413-28.391c-15.669,0-28.377,12.709-28.377,28.391v29.941L299.31,37.74c-27.639-27.624-75.694-27.575-103.27,0.05L8.312,225.514c-11.082,11.104-11.082,29.071,0,40.158c11.087,11.101,29.089,11.101,40.172,0l187.71-187.729c6.115-6.083,16.893-6.083,22.976-0.018l187.742,187.747c5.567,5.551,12.825,8.312,20.081,8.312c7.271,0,14.541-2.764,20.091-8.312C498.17,254.586,498.17,236.619,487.083,225.514z"/><path d="M257.561,131.836c-5.454-5.451-14.285-5.451-19.723,0L72.712,296.913c-2.607,2.606-4.085,6.164-4.085,9.877v120.401c0,28.253,22.908,51.16,51.16,51.16h81.754v-126.61h92.299v126.61h81.755c28.251,0,51.159-22.907,51.159-51.159V306.79c0-3.713-1.465-7.271-4.085-9.877L257.561,131.836z"/></svg>';
    L.FOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--lib-nav-accent)" stroke="none"><path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z"></path></svg>';
    L.CHEVRON_DOWN_SVG = '<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg>';
    L.EDIT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" fill="' + L.LIB_ACCENT + '"></path></svg>';
    L.DELETE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    L.SYNC_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 32 32"><path d="M 16 4 C 10.886719 4 6.617188 7.160156 4.875 11.625 L 6.71875 12.375 C 8.175781 8.640625 11.710938 6 16 6 C 19.242188 6 22.132813 7.589844 23.9375 10 L 20 10 L 20 12 L 27 12 L 27 5 L 25 5 L 25 8.09375 C 22.808594 5.582031 19.570313 4 16 4 Z M 25.28125 19.625 C 23.824219 23.359375 20.289063 26 16 26 C 12.722656 26 9.84375 24.386719 8.03125 22 L 12 22 L 12 20 L 5 20 L 5 27 L 7 27 L 7 23.90625 C 9.1875 26.386719 12.394531 28 16 28 C 21.113281 28 25.382813 24.839844 27.125 20.375 Z" fill="' + L.LIB_ACCENT + '"></path></svg>';
    L.MARK_READ_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
    L.MARK_UNREAD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
    L.OPEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6a2 2 0 0 1 2-2h3l2 3h6l2-3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path></svg>';
    L.NAVIGATE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>';
    L.COVER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M2 16l4-4 2 2 3-3 5 5H2z"></path></svg>';
    L.TYPE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>';
    L.ADD_FOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + L.LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6v6h-2v-6H8v-2h6V4h2v6h6z"></path><path d="M4 6v2h16V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2z"></path></svg>';
    L.INFO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lib-nav-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    L.BOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 33.085281 27.973282"><defs><clipPath clipPathUnits="userSpaceOnUse" id="libBookClip"><path d="M 0,500 H 500 V 0 H 0 Z"/></clipPath></defs><g transform="translate(-79.876791,-139.4399)"><g transform="matrix(0.35277777,0,0,-0.35277777,-29.815752,252.79627)"><g fill="' + L.LIB_ACCENT + '" clip-path="url(#libBookClip)"><g transform="translate(332.5514,318.7658)"><path d="m 0,0 c -1.073,0 -1.943,-0.87 -1.943,-1.943 v -72.849 c 0,-1.073 0.87,-1.943 1.943,-1.943 1.072,0 1.942,0.87 1.942,1.943 V -1.943 C 1.942,-0.87 1.072,0 0,0"/></g><g transform="translate(312.8815,318.7658)"><path d="m 0,0 c -1.072,0 -1.942,-0.87 -1.942,-1.943 v -72.849 c 0,-1.073 0.87,-1.943 1.942,-1.943 1.073,0 1.943,0.87 1.943,1.943 V -1.943 C 1.943,-0.87 1.073,0 0,0"/></g><g transform="translate(329.0905,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.514,0.229 0.514,0.512 v 72.04 C 0.514,-0.229 0.284,0 0,0"/></g><g transform="translate(326.5416,316.9313)"><path d="m 0,0 c -0.284,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.229,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(323.9908,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(321.441,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.514,0.229 0.514,0.512 v 72.04 C 0.514,-0.229 0.284,0 0,0"/></g><g transform="translate(318.8922,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(316.3424,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(358.4528,318.7658)"><path d="m 0,0 c -1.073,0 -1.942,-0.87 -1.942,-1.943 v -72.849 c 0,-1.073 0.869,-1.943 1.942,-1.943 1.073,0 1.942,0.87 1.942,1.943 V -1.943 C 1.942,-0.87 1.073,0 0,0"/></g><g transform="translate(338.7838,318.7658)"><path d="m 0,0 c -1.073,0 -1.942,-0.87 -1.942,-1.943 v -72.849 c 0,-1.073 0.869,-1.943 1.942,-1.943 1.073,0 1.942,0.87 1.942,1.943 V -1.943 C 1.942,-0.87 1.073,0 0,0"/></g><g transform="translate(354.9928,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(352.442,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.514,0.229 0.514,0.512 v 72.04 C 0.514,-0.229 0.284,0 0,0"/></g><g transform="translate(349.8932,316.9313)"><path d="m 0,0 c -0.284,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.229,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(347.3434,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(344.7946,316.9313)"><path d="m 0,0 c -0.284,0 -0.514,-0.229 -0.514,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.514,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(342.2438,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(404.6373,250.3659)"><path d="m 0,0 -21.544,69.59 c -0.317,1.025 -1.406,1.599 -2.431,1.282 -1.025,-0.318 -1.598,-1.406 -1.281,-2.431 l 21.544,-69.59 c 0.317,-1.025 1.405,-1.599 2.431,-1.282 C -0.257,-2.113 0.317,-1.025 0,0"/></g><g transform="translate(364.3033,314.1393)"><path d="m 0,0 c -0.317,1.025 -1.405,1.599 -2.43,1.281 -1.025,-0.317 -1.598,-1.405 -1.281,-2.43 l 21.544,-69.59 c 0.317,-1.026 1.405,-1.599 2.43,-1.282 1.025,0.318 1.598,1.406 1.281,2.43 z"/></g><g transform="translate(378.5406,318.1232)"><path d="M 0,0 C -0.083,0.27 -0.371,0.421 -0.641,0.338 -0.912,0.254 -1.063,-0.033 -0.979,-0.303 L 20.325,-69.12 c 0.069,-0.22 0.271,-0.362 0.49,-0.362 0.05,0 0.102,0.007 0.152,0.024 0.271,0.083 0.423,0.37 0.339,0.641 z"/></g><g transform="translate(376.1051,317.3693)"><path d="M 0,0 C -0.083,0.27 -0.369,0.42 -0.641,0.338 -0.912,0.255 -1.063,-0.033 -0.979,-0.303 L 20.325,-69.12 c 0.068,-0.22 0.271,-0.361 0.489,-0.361 0.051,0 0.102,0.007 0.152,0.023 0.271,0.084 0.423,0.371 0.339,0.641 z"/></g><g transform="translate(373.6696,316.6159)"><path d="M 0,0 C -0.083,0.27 -0.373,0.421 -0.642,0.338 -0.913,0.254 -1.064,-0.033 -0.979,-0.304 L 20.325,-69.12 c 0.069,-0.221 0.271,-0.362 0.49,-0.362 0.05,0 0.101,0.006 0.152,0.023 0.27,0.084 0.422,0.37 0.338,0.641 z"/></g><g transform="translate(371.234,315.8615)"><path d="M 0,0 C -0.084,0.271 -0.37,0.422 -0.641,0.338 -0.912,0.254 -1.063,-0.033 -0.979,-0.304 l 21.304,-68.817 c 0.069,-0.219 0.271,-0.361 0.49,-0.361 0.05,0 0.101,0.007 0.152,0.023 0.271,0.084 0.423,0.371 0.338,0.641 z"/></g><g transform="translate(368.7985,315.1076)"><path d="M 0,0 C -0.084,0.27 -0.37,0.421 -0.641,0.338 -0.912,0.254 -1.063,-0.033 -0.979,-0.304 l 21.304,-68.817 c 0.068,-0.22 0.27,-0.361 0.489,-0.361 0.05,0 0.102,0.007 0.152,0.023 0.271,0.084 0.423,0.371 0.339,0.641 z"/></g><g transform="translate(366.3629,314.3532)"><path d="M 0,0 C -0.084,0.27 -0.371,0.421 -0.642,0.338 -0.913,0.254 -1.064,-0.033 -0.979,-0.303 L 20.325,-69.12 c 0.069,-0.22 0.271,-0.361 0.49,-0.361 0.05,0 0.101,0.006 0.151,0.023 0.271,0.084 0.423,0.37 0.339,0.641 z"/></g></g></g></g></svg>';

    L.PDF_NO_COVER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="-4 0 40 40" fill="none" class="lib-card-no-cover-svg"><path d="M25.6686 26.0962C25.1812 26.2401 24.4656 26.2563 23.6984 26.145C22.875 26.0256 22.0351 25.7739 21.2096 25.403C22.6817 25.1888 23.8237 25.2548 24.8005 25.6009C25.0319 25.6829 25.412 25.9021 25.6686 26.0962ZM17.4552 24.7459C17.3953 24.7622 17.3363 24.7776 17.2776 24.7939C16.8815 24.9017 16.4961 25.0069 16.1247 25.1005L15.6239 25.2275C14.6165 25.4824 13.5865 25.7428 12.5692 26.0529C12.9558 25.1206 13.315 24.178 13.6667 23.2564C13.9271 22.5742 14.193 21.8773 14.468 21.1894C14.6075 21.4198 14.7531 21.6503 14.9046 21.8814C15.5948 22.9326 16.4624 23.9045 17.4552 24.7459ZM14.8927 14.2326C14.958 15.383 14.7098 16.4897 14.3457 17.5514C13.8972 16.2386 13.6882 14.7889 14.2489 13.6185C14.3927 13.3185 14.5105 13.1581 14.5869 13.0744C14.7049 13.2566 14.8601 13.6642 14.8927 14.2326ZM9.63347 28.8054C9.38148 29.2562 9.12426 29.6782 8.86063 30.0767C8.22442 31.0355 7.18393 32.0621 6.64941 32.0621C6.59681 32.0621 6.53316 32.0536 6.44015 31.9554C6.38028 31.8926 6.37069 31.8476 6.37359 31.7862C6.39161 31.4337 6.85867 30.8059 7.53527 30.2238C8.14939 29.6957 8.84352 29.2262 9.63347 28.8054ZM27.3706 26.1461C27.2889 24.9719 25.3123 24.2186 25.2928 24.2116C24.5287 23.9407 23.6986 23.8091 22.7552 23.8091C21.7453 23.8091 20.6565 23.9552 19.2582 24.2819C18.014 23.3999 16.9392 22.2957 16.1362 21.0733C15.7816 20.5332 15.4628 19.9941 15.1849 19.4675C15.8633 17.8454 16.4742 16.1013 16.3632 14.1479C16.2737 12.5816 15.5674 11.5295 14.6069 11.5295C13.948 11.5295 13.3807 12.0175 12.9194 12.9813C12.0965 14.6987 12.3128 16.8962 13.562 19.5184C13.1121 20.5751 12.6941 21.6706 12.2895 22.7311C11.7861 24.0498 11.2674 25.4103 10.6828 26.7045C9.04334 27.3532 7.69648 28.1399 6.57402 29.1057C5.8387 29.7373 4.95223 30.7028 4.90163 31.7107C4.87693 32.1854 5.03969 32.6207 5.37044 32.9695C5.72183 33.3398 6.16329 33.5348 6.6487 33.5354C8.25189 33.5354 9.79489 31.3327 10.0876 30.8909C10.6767 30.0029 11.2281 29.0124 11.7684 27.8699C13.1292 27.3781 14.5794 27.011 15.985 26.6562L16.4884 26.5283C16.8668 26.4321 17.2601 26.3257 17.6635 26.2153C18.0904 26.0999 18.5296 25.9802 18.976 25.8665C20.4193 26.7844 21.9714 27.3831 23.4851 27.6028C24.7601 27.7883 25.8924 27.6807 26.6589 27.2811C27.3486 26.9219 27.3866 26.3676 27.3706 26.1461ZM30.4755 36.2428C30.4755 38.3932 28.5802 38.5258 28.1978 38.5301H3.74486C1.60224 38.5301 1.47322 36.6218 1.46913 36.2428L1.46884 3.75642C1.46884 1.6039 3.36763 1.4734 3.74457 1.46908H20.263L20.2718 1.4778V7.92396C20.2718 9.21763 21.0539 11.6669 24.0158 11.6669H30.4203L30.4753 11.7218L30.4755 36.2428ZM28.9572 10.1976H24.0169C21.8749 10.1976 21.7453 8.29969 21.7424 7.92417V2.95307L28.9572 10.1976ZM31.9447 36.2428V11.1157L21.7424 0.871022V0.823357H21.6936L20.8742 0H3.74491C2.44954 0 0 0.785336 0 3.75711V36.2435C0 37.5427 0.782956 40 3.74491 40H28.2001C29.4952 39.9997 31.9447 39.2143 31.9447 36.2428Z" fill="#EB5757"/></svg>';

    L.READ_CHECK_SVG = (window.RenamerIcons && window.RenamerIcons.READ_CHECK) || '';
    L.EXPAND_SVG = (window.RenamerIcons && window.RenamerIcons.EXPAND) || '';
    L.COLLAPSE_SVG = (window.RenamerIcons && window.RenamerIcons.COLLAPSE) || '';
    L.NO_PREVIEW_SVG = (window.RenamerIcons && window.RenamerIcons.FOLDER)
        ? window.RenamerIcons.FOLDER.replace('<svg ', '<svg class="lib-svg-icon-folder" ')
        : '<svg class="lib-svg-icon-folder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z"></path></svg>';
    L.GRID_VIEW_SVG = (window.RenamerIcons && window.RenamerIcons.GRID) || '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v8h8V3H3zm10 0v8h8V3h-8zm0 10v8h8v-8h-8zm-10 0v8h8v-8H3z"></path></svg>';
    L.LIST_VIEW_SVG = (window.RenamerIcons && window.RenamerIcons.LIST_VIEW) || '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"></path></svg>';
    L.FILTER_SVG = (window.RenamerIcons && window.RenamerIcons.FILTER)
        ? window.RenamerIcons.FILTER.replace('<svg ', '<svg class="lib-svg-icon-filter" ')
        : '<svg class="lib-svg-icon-filter" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path></svg>';

})(window.RenamerLibrary);
