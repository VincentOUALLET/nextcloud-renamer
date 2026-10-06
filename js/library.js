(function () {
    'use strict';

    var PAGE_ROOT = document.getElementById('library-page');
    if (!PAGE_ROOT) return;
    PAGE_ROOT.id = 'library-page';

    var DOC_EXT = ['pdf', 'cbz', 'cbr', 'epub', 'azw', 'azw3', 'mobi', 'prc'];
    var IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    var LIB_ACCENT = '#a855f7';

    function fileExt(f) {
        return (f.extension || (f.name ? f.name.split('.').pop().toLowerCase() : '')).toLowerCase();
    }

    function makeFileEntry(f) {
        var nm = f && f.name ? String(f.name) : '';
        return {
            path: f.path,
            name: nm,
            tome: 0,
            type: fileExt(f),
            size: f.size || 0,
            mtime: f.mtime || 0,
            pages: f.pages || 0,
            series: nm ? nm.replace(/\.[^.]+$/, '') : '',
            volume: 0,
            chapter: 0,
            displayTitle: '',
        };
    }

    var SEQUEL_THRESHOLD = 0.85;
    var VOL_MARKER_RE = /(?:\b(?:vol|volume|v|tome|t|巻|卷|册|권|장|시즌|เล่ม|เล่มที่|Том|Тома)|\[(?:V|VOL|토|卷)\])\s*[\d\-.]+/i;
    var CH_MARKER_RE = /(?:\b(?:ch|chapter|c|chapitre|épisode|episode|話|话|化|回|화|회|บทที่|ตอนที่|Глава)|\[(?:CH|CHAPTER|화)\])\s*[\d\-.]+/i;

    function minNumberFromRange(s) {
        if (s == null) return 0;
        var parts = String(s).split(/[-–]/);
        var first = (parts[0] || '').trim();
        var m = first.match(/(\d+)/);
        if (!m) return 0;
        var v = parseFloat(m[1]);
        return isNaN(v) ? 0 : v;
    }

    function parseNumberRange(s) {
        if (s == null) return [];
        var nums = String(s).split(/[-–]/).map(function (p) {
            var m = (p || '').match(/(\d+)/);
            return m ? parseFloat(m[1]) : NaN;
        }).filter(function (n) { return !isNaN(n); });
        if (!nums.length) return [];
        if (nums.length >= 2 && Number.isInteger(nums[0]) && Number.isInteger(nums[1]) && nums[0] <= nums[1]) {
            var lo = nums[0], hi = nums[1];
            var arr = [];
            for (var n = lo; n <= hi; n++) arr.push(n);
            return arr;
        }
        return [nums[0]];
    }

    function parseFilename(name) {
        var result = { series: '', volume: 0, chapter: 0, displayTitle: '' };
        if (!name) return result;
        var base = String(name).replace(/\.[^.]+$/, '');
        base = base.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

        var volM = VOL_MARKER_RE.exec(base);
        var chM = CH_MARKER_RE.exec(base);
        var volume = volM ? minNumberFromRange(volM[0]) : 0;
        var chapter = chM ? minNumberFromRange(chM[0]) : 0;
        var volumeRange = volM ? parseNumberRange(volM[0]) : [];
        var chapterRange = chM ? parseNumberRange(chM[0]) : [];
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
            if (hasVol) {
                series = displayTitle.replace(/^[\s\-–—:;\.]+/g, '').trim();
            }
            if (!series && !hasVol && !hasCh) {
                series = base;
            }
        }

        result.series = series;
        result.volume = volume;
        result.chapter = chapter;
        result.volumeRange = volumeRange;
        result.chapterRange = chapterRange;
        result.displayTitle = displayTitle;
        return result;
    }

    function parseScanEntry(f) {
        var e = makeFileEntry(f);
        var parsed = parseFilename(e.name);
        e.series = parsed.series;
        e.volume = parsed.volume;
        e.chapter = parsed.chapter;
        e.tome = e.volume;
        e.tomes = (parsed.volumeRange && parsed.volumeRange.length) ? parsed.volumeRange
            : (parsed.volume > 0 ? [parsed.volume] : []);
        e.displayTitle = parsed.displayTitle;
        return e;
    }

    function jaccardTokens(a, b) {
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
    }

    function sequelBaseOf(name) {
        var raw = String(name || '');
        var m = raw.match(/^(.*?)\s+([\d][\d.]*)\s*$/);
        if (m) {
            var suffix = minNumberFromRange(m[2]);
            return { base: (m[1] || '').trim().toLowerCase(), suffix: (isNaN(suffix) || suffix <= 0) ? null : suffix, hasSuffix: true };
        }
        return { base: raw.toLowerCase(), suffix: null, hasSuffix: false };
    }

    function buildReaderSeriesTree(entries) {
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
                return {
                    volume: vol,
                    chapters: chKeys.map(function (ch) {
                        return { chapter: ch, files: chMap[String(ch)] };
                    })
                };
            });
        });
        return tree;
    }

    function sortFiles(files) {
        files.sort(function (a, b) {
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }
    var STAR_OUTLINE_PATH = 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z';
     var FAV_STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + STAR_OUTLINE_PATH + '"></path></svg>';
     var HOME_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 495.398 495.398" fill="' + LIB_ACCENT + '"><path d="M487.083,225.514l-75.08-75.08V63.704c0-15.682-12.708-28.391-28.413-28.391c-15.669,0-28.377,12.709-28.377,28.391v29.941L299.31,37.74c-27.639-27.624-75.694-27.575-103.27,0.05L8.312,225.514c-11.082,11.104-11.082,29.071,0,40.158c11.087,11.101,29.089,11.101,40.172,0l187.71-187.729c6.115-6.083,16.893-6.083,22.976-0.018l187.742,187.747c5.567,5.551,12.825,8.312,20.081,8.312c7.271,0,14.541-2.764,20.091-8.312C498.17,254.586,498.17,236.619,487.083,225.514z"/><path d="M257.561,131.836c-5.454-5.451-14.285-5.451-19.723,0L72.712,296.913c-2.607,2.606-4.085,6.164-4.085,9.877v120.401c0,28.253,22.908,51.16,51.16,51.16h81.754v-126.61h92.299v126.61h81.755c28.251,0,51.159-22.907,51.159-51.159V306.79c0-3.713-1.465-7.271-4.085-9.877L257.561,131.836z"/></svg>';
      var BOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 33.085281 27.973282"><defs><clipPath clipPathUnits="userSpaceOnUse" id="libBookClip"><path d="M 0,500 H 500 V 0 H 0 Z"/></clipPath></defs><g transform="translate(-79.876791,-139.4399)"><g transform="matrix(0.35277777,0,0,-0.35277777,-29.815752,252.79627)"><g fill="' + LIB_ACCENT + '" clip-path="url(#libBookClip)"><g transform="translate(332.5514,318.7658)"><path d="m 0,0 c -1.073,0 -1.943,-0.87 -1.943,-1.943 v -72.849 c 0,-1.073 0.87,-1.943 1.943,-1.943 1.072,0 1.942,0.87 1.942,1.943 V -1.943 C 1.942,-0.87 1.072,0 0,0"/></g><g transform="translate(312.8815,318.7658)"><path d="m 0,0 c -1.072,0 -1.942,-0.87 -1.942,-1.943 v -72.849 c 0,-1.073 0.87,-1.943 1.942,-1.943 1.073,0 1.943,0.87 1.943,1.943 V -1.943 C 1.943,-0.87 1.073,0 0,0"/></g><g transform="translate(329.0905,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.514,0.229 0.514,0.512 v 72.04 C 0.514,-0.229 0.284,0 0,0"/></g><g transform="translate(326.5416,316.9313)"><path d="m 0,0 c -0.284,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.229,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(323.9908,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(321.441,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.514,0.229 0.514,0.512 v 72.04 C 0.514,-0.229 0.284,0 0,0"/></g><g transform="translate(318.8922,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(316.3424,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(358.4528,318.7658)"><path d="m 0,0 c -1.073,0 -1.942,-0.87 -1.942,-1.943 v -72.849 c 0,-1.073 0.869,-1.943 1.942,-1.943 1.073,0 1.942,0.87 1.942,1.943 V -1.943 C 1.942,-0.87 1.073,0 0,0"/></g><g transform="translate(338.7838,318.7658)"><path d="m 0,0 c -1.073,0 -1.942,-0.87 -1.942,-1.943 v -72.849 c 0,-1.073 0.869,-1.943 1.942,-1.943 1.073,0 1.942,0.87 1.942,1.943 V -1.943 C 1.942,-0.87 1.073,0 0,0"/></g><g transform="translate(354.9928,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(352.442,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.514,0.229 0.514,0.512 v 72.04 C 0.514,-0.229 0.284,0 0,0"/></g><g transform="translate(349.8932,316.9313)"><path d="m 0,0 c -0.284,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.229,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(347.3434,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.284,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(344.7946,316.9313)"><path d="m 0,0 c -0.284,0 -0.514,-0.229 -0.514,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.514,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(342.2438,316.9313)"><path d="m 0,0 c -0.283,0 -0.513,-0.229 -0.513,-0.513 v -72.04 c 0,-0.283 0.23,-0.512 0.513,-0.512 0.283,0 0.513,0.229 0.513,0.512 v 72.04 C 0.513,-0.229 0.283,0 0,0"/></g><g transform="translate(404.6373,250.3659)"><path d="m 0,0 -21.544,69.59 c -0.317,1.025 -1.406,1.599 -2.431,1.282 -1.025,-0.318 -1.598,-1.406 -1.281,-2.431 l 21.544,-69.59 c 0.317,-1.025 1.405,-1.599 2.431,-1.282 C -0.257,-2.113 0.317,-1.025 0,0"/></g><g transform="translate(364.3033,314.1393)"><path d="m 0,0 c -0.317,1.025 -1.405,1.599 -2.43,1.281 -1.025,-0.317 -1.598,-1.405 -1.281,-2.43 l 21.544,-69.59 c 0.317,-1.026 1.405,-1.599 2.43,-1.282 1.025,0.318 1.598,1.406 1.281,2.43 z"/></g><g transform="translate(378.5406,318.1232)"><path d="M 0,0 C -0.083,0.27 -0.371,0.421 -0.641,0.338 -0.912,0.254 -1.063,-0.033 -0.979,-0.303 L 20.325,-69.12 c 0.069,-0.22 0.271,-0.362 0.49,-0.362 0.05,0 0.102,0.007 0.152,0.024 0.271,0.083 0.423,0.37 0.339,0.641 z"/></g><g transform="translate(376.1051,317.3693)"><path d="M 0,0 C -0.083,0.27 -0.369,0.42 -0.641,0.338 -0.912,0.255 -1.063,-0.033 -0.979,-0.303 L 20.325,-69.12 c 0.068,-0.22 0.271,-0.361 0.489,-0.361 0.051,0 0.102,0.007 0.152,0.023 0.271,0.084 0.423,0.371 0.339,0.641 z"/></g><g transform="translate(373.6696,316.6159)"><path d="M 0,0 C -0.083,0.27 -0.373,0.421 -0.642,0.338 -0.913,0.254 -1.064,-0.033 -0.979,-0.304 L 20.325,-69.12 c 0.069,-0.221 0.271,-0.362 0.49,-0.362 0.05,0 0.101,0.006 0.152,0.023 0.27,0.084 0.422,0.37 0.338,0.641 z"/></g><g transform="translate(371.234,315.8615)"><path d="M 0,0 C -0.084,0.271 -0.37,0.422 -0.641,0.338 -0.912,0.254 -1.063,-0.033 -0.979,-0.304 l 21.304,-68.817 c 0.069,-0.219 0.271,-0.361 0.49,-0.361 0.05,0 0.101,0.007 0.152,0.023 0.271,0.084 0.423,0.371 0.338,0.641 z"/></g><g transform="translate(368.7985,315.1076)"><path d="M 0,0 C -0.084,0.27 -0.37,0.421 -0.641,0.338 -0.912,0.254 -1.063,-0.033 -0.979,-0.304 l 21.304,-68.817 c 0.068,-0.22 0.27,-0.361 0.489,-0.361 0.05,0 0.102,0.007 0.152,0.023 0.271,0.084 0.423,0.371 0.339,0.641 z"/></g><g transform="translate(366.3629,314.3532)"><path d="M 0,0 C -0.084,0.27 -0.371,0.421 -0.642,0.338 -0.913,0.254 -1.064,-0.033 -0.979,-0.303 L 20.325,-69.12 c 0.069,-0.22 0.271,-0.361 0.49,-0.361 0.05,0 0.101,0.006 0.151,0.023 0.271,0.084 0.423,0.37 0.339,0.641 z"/></g></g></g></g></svg>';
       var FOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--lib-nav-accent)" stroke="none"><path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z"></path></svg>';
      var CHEVRON_DOWN_SVG = '<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg>';
      var EDIT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" fill="' + LIB_ACCENT + '"></path></svg>';
      var DELETE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      var SYNC_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 32 32"><path d="M 16 4 C 10.886719 4 6.617188 7.160156 4.875 11.625 L 6.71875 12.375 C 8.175781 8.640625 11.710938 6 16 6 C 19.242188 6 22.132813 7.589844 23.9375 10 L 20 10 L 20 12 L 27 12 L 27 5 L 25 5 L 25 8.09375 C 22.808594 5.582031 19.570313 4 16 4 Z M 25.28125 19.625 C 23.824219 23.359375 20.289063 26 16 26 C 12.722656 26 9.84375 24.386719 8.03125 22 L 12 22 L 12 20 L 5 20 L 5 27 L 7 27 L 7 23.90625 C 9.1875 26.386719 12.394531 28 16 28 C 21.113281 28 25.382813 24.839844 27.125 20.375 Z" fill="' + LIB_ACCENT + '"></path></svg>';
     var MARK_READ_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
     var MARK_UNREAD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
     var OPEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6a2 2 0 0 1 2-2h3l2 3h6l2-3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path></svg>';
     var NAVIGATE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>';
      var COVER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M2 16l4-4 2 2 3-3 5 5H2z"></path></svg>';
      var TYPE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>';
      var ADD_FOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6v6h-2v-6H8v-2h6V4h2v6h6z"></path><path d="M4 6v2h16V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2z"></path></svg>';
      var INFO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
     var PDF_NO_COVER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="-4 0 40 40" fill="none" class="lib-card-no-cover-svg"><path d="M25.6686 26.0962C25.1812 26.2401 24.4656 26.2563 23.6984 26.145C22.875 26.0256 22.0351 25.7739 21.2096 25.403C22.6817 25.1888 23.8237 25.2548 24.8005 25.6009C25.0319 25.6829 25.412 25.9021 25.6686 26.0962ZM17.4552 24.7459C17.3953 24.7622 17.3363 24.7776 17.2776 24.7939C16.8815 24.9017 16.4961 25.0069 16.1247 25.1005L15.6239 25.2275C14.6165 25.4824 13.5865 25.7428 12.5692 26.0529C12.9558 25.1206 13.315 24.178 13.6667 23.2564C13.9271 22.5742 14.193 21.8773 14.468 21.1894C14.6075 21.4198 14.7531 21.6503 14.9046 21.8814C15.5948 22.9326 16.4624 23.9045 17.4552 24.7459ZM14.8927 14.2326C14.958 15.383 14.7098 16.4897 14.3457 17.5514C13.8972 16.2386 13.6882 14.7889 14.2489 13.6185C14.3927 13.3185 14.5105 13.1581 14.5869 13.0744C14.7049 13.2566 14.8601 13.6642 14.8927 14.2326ZM9.63347 28.8054C9.38148 29.2562 9.12426 29.6782 8.86063 30.0767C8.22442 31.0355 7.18393 32.0621 6.64941 32.0621C6.59681 32.0621 6.53316 32.0536 6.44015 31.9554C6.38028 31.8926 6.37069 31.8476 6.37359 31.7862C6.39161 31.4337 6.85867 30.8059 7.53527 30.2238C8.14939 29.6957 8.84352 29.2262 9.63347 28.8054ZM27.3706 26.1461C27.2889 24.9719 25.3123 24.2186 25.2928 24.2116C24.5287 23.9407 23.6986 23.8091 22.7552 23.8091C21.7453 23.8091 20.6565 23.9552 19.2582 24.2819C18.014 23.3999 16.9392 22.2957 16.1362 21.0733C15.7816 20.5332 15.4628 19.9941 15.1849 19.4675C15.8633 17.8454 16.4742 16.1013 16.3632 14.1479C16.2737 12.5816 15.5674 11.5295 14.6069 11.5295C13.948 11.5295 13.3807 12.0175 12.9194 12.9813C12.0965 14.6987 12.3128 16.8962 13.562 19.5184C13.1121 20.5751 12.6941 21.6706 12.2895 22.7311C11.7861 24.0498 11.2674 25.4103 10.6828 26.7045C9.04334 27.3532 7.69648 28.1399 6.57402 29.1057C5.8387 29.7373 4.95223 30.7028 4.90163 31.7107C4.87693 32.1854 5.03969 32.6207 5.37044 32.9695C5.72183 33.3398 6.16329 33.5348 6.6487 33.5354C8.25189 33.5354 9.79489 31.3327 10.0876 30.8909C10.6767 30.0029 11.2281 29.0124 11.7684 27.8699C13.1292 27.3781 14.5794 27.011 15.985 26.6562L16.4884 26.5283C16.8668 26.4321 17.2601 26.3257 17.6635 26.2153C18.0904 26.0999 18.5296 25.9802 18.976 25.8665C20.4193 26.7844 21.9714 27.3831 23.4851 27.6028C24.7601 27.7883 25.8924 27.6807 26.6589 27.2811C27.3486 26.9219 27.3866 26.3676 27.3706 26.1461ZM30.4755 36.2428C30.4755 38.3932 28.5802 38.5258 28.1978 38.5301H3.74486C1.60224 38.5301 1.47322 36.6218 1.46913 36.2428L1.46884 3.75642C1.46884 1.6039 3.36763 1.4734 3.74457 1.46908H20.263L20.2718 1.4778V7.92396C20.2718 9.21763 21.0539 11.6669 24.0158 11.6669H30.4203L30.4753 11.7218L30.4755 36.2428ZM28.9572 10.1976H24.0169C21.8749 10.1976 21.7453 8.29969 21.7424 7.92417V2.95307L28.9572 10.1976ZM31.9447 36.2428V11.1157L21.7424 0.871022V0.823357H21.6936L20.8742 0H3.74491C2.44954 0 0 0.785336 0 3.75711V36.2435C0 37.5427 0.782956 40 3.74491 40H28.2001C29.4952 39.9997 31.9447 39.2143 31.9447 36.2428Z" fill="#EB5757"/></svg>';
     var OPEN_BOOK_READ_SVG = (window.RenamerIcons && window.RenamerIcons.OPEN_BOOK_READ) || '';
     var READ_CHECK_SVG = (window.RenamerIcons && window.RenamerIcons.READ_CHECK) || '';
        var EXPAND_SVG = (window.RenamerIcons && window.RenamerIcons.EXPAND) || '';
     var COLLAPSE_SVG = (window.RenamerIcons && window.RenamerIcons.COLLAPSE) || '';
     var NO_PREVIEW_SVG = (window.RenamerIcons && window.RenamerIcons.FOLDER)
        ? window.RenamerIcons.FOLDER.replace('<svg ', '<svg style="height:50px;width:50px;fill:var(--reader-accent);" ')
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="height:50px;width:50px;fill:var(--reader-accent);"><path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z"></path></svg>';
     var state = {
        view: 'libraries',
        libraries: [],
        currentLibrary: null,
        currentCollection: null,
        bookmarks: {},
        domCache: {},
        readerModal: null,
        allCollections: {},
        allFavorites: null,
         isAdmin: false,
         showNavActions: false,
          readerBrowsingMode: false,
         readerTreePath: [],
         readerImageTome: null,
         readerImageTomeWasRoot: false,
         readerSeriesTree: null,
         readerSeriesLoaded: false,
         readerSequels: {},
         sidebarOpen: true,
         isFullscreen: true,
          readerFavoritesOnly: false,
         covers: {},          // Map<cheminSource, coverUrl|null> (bulké par /api/covers/list)
         coversLoaded: false, // true après le premier bulk covers
         collectionsByLib: {}, // Map<libId, collections[]> pour couvrir les cards bibliothèque
          coverWidth: 300,     // taille rendue serveur (px) — le browser downscale
          navigationEpoch: 0,  // incrémenté à chaque navigation -> invalide les réponses stales
          resolveAbort: null,  // AbortController de la résolution en cours (deep-link)
          customTranslations: null, // loaded from /api/translations
          settingsLangView: 'fr',
          flatFilesMode: false, // toggle between hierarchical and flat (decorrelated) view
          flatCollectionMode: false, // toggle for flat view inside a collection/tomes context
          showFileCounts: false, // toggle to show/hide file type counts in filter bar
    };

    var TR = {
        fr: {
            title: 'Bibliothèque',
            addLibrary: 'Ajouter une librairie',
            filterAll: 'Tous les types',
            filterExt: 'Filtrer par extension',
            toggleFlat: 'Affichage applati',
            toggleHierarchical: 'Affichage hiérarchique',
            toggleFileInfo: 'Basculer les infos de fichiers',
            showFileCounts: 'Afficher les compteurs',
            hideFileCounts: 'Masquer les compteurs',
            pages: 'pages',
            empty: 'Aucune librairie',
            emptyHint: 'Cliquez sur "Ajouter une librairie" pour commencer à scanner votre collection de documents.',
            readOnlyHint: 'Administré par un administrateur — les bibliothèques sont partagées et en lecture seule.',
            scan: 'Scanner un dossier',
            scanError: 'Scan échoué',
            scanCancelled: 'Scan annulé',
            scanInProgress: 'Scan en cours…',
            scanComplete: 'Scan terminé',
            rescan: 'Rescanner',
            rescanInProgress: 'Rescan en cours…',
            rescanComplete: 'Rescan terminé',
            rescanLibrary: 'Rescanner la librairie',
            rescanCollection: 'Rescanner la collection',
            rescanEmpty: 'Aucun fichier trouvé lors du rescan',
            documents: 'documents',
            noResults: 'Aucun fichier trouvé',
            newLibPrompt: 'Nom de la librairie',
            newLibPlaceholder: 'ex: BD, Romans, Mangas',
            continueReading: 'Continuer la lecture',
            inProgress: 'En cours de lecture',
            readerRead: 'Lu',
            myFavorites: 'Mes favoris',
            noFavorites: 'Aucun favori',
            favoritesHint: 'Pages marquées comme favoris',
            noProgress: 'Aucune progression enregistrée',
            collection: 'Collection',
            collections: 'Collections',
            subCollections: 'Sous-collections',
            images: 'Images',
            totalFiles: 'fichiers au total',
            files: 'Fichiers',
            tomes: 'Tomes',
            tome: 'Tome',
            missingTome: 'Tome Manquant',
            progress: ' progression',
            open: 'Ouvrir',
            unsupported: 'Format non supporté',
            readError: 'Impossible de lire le fichier',
            loadError: 'Chargement échoué',
            back: 'Retour',
            home: 'Accueil',
            size: 'taille',
            page: 'Page',
            pages: 'Pages',
            percent: '%',
            convertCbr: 'Conversion CBR…',
            convertCbrError: 'Conversion CBR impossible',
             deleteProgress: 'Supprimer la progression',
             progressDeleted: 'Progression supprimée',
             scanFolderDialog: 'Sélectionner un dossier à scanner',
             scanConfirm: 'Scanner ce dossier',
             scanCancel: 'Annuler',
             subfolders: 'Sous-dossiers',
             scanFiles: 'Fichiers',
             navFavorites: 'Favoris',
             navNoFavorites: 'Aucun favori',
             navAddToFavorites: 'Ajouter aux favoris',
             navRemoveFavorite: 'Retirer du favori',
             navFavoriteAdded: 'Ajouté aux favoris',
             navFavoriteRemoved: 'Retiré des favoris',
             navMore: 'Plus',
             navLoading: 'Chargement…',
             librariesLabel: 'Bibliothèques',
             toggleSidebar: 'Réduire le menu',
             reduce: 'Réduire',
             expand: 'Agrandir',
             navigationBreadcrumbRoot: 'Racine',
            readerClose: 'Fermer',
            readerFullscreen: 'Plein écran',
            readerExitFullscreen: 'Quitter le plein écran',
            loading: 'Chargement…',
             rename: 'Renommer',
             renameLibrary: 'Renommer la librairie',
                renameCollection: 'Renommer la collection',
                renamed: 'Renommé',
                renamedError: 'Échec du renommage',
                contextDelete: 'Supprimer',
                contextDeleteLib: 'Supprimer la librairie',
                contextDeleteCol: 'Supprimer la collection',
                changeLibraryType: 'Changer le type de librairie',
                changeColType: 'Changer le type de collection',
                addLibraryPath: 'Ajouter un dossier',
                typeChanged: 'Type mis à jour',
                typeChangeError: 'Erreur lors du changement de type',
             goToCollection: 'Aller à la collection',
             deleted: 'Supprimé',
             deleteLibConfirm: 'Supprimer la librairie "{name}" ?',
             deleteColConfirm: 'Supprimer la collection "{name}" ?',
             confirm: 'Confirmer',
             cancel: 'Annuler',
             close: 'Fermer',
             markAsRead: 'Marquer comme lu',
             markAsUnread: 'Marquer comme non lu',
             markCollectionRead: 'Marquer comme lue',
             markCollectionUnread: 'Marquer comme non lue',
              markedRead: 'Marqué comme lu',
              markedUnread: 'Marqué comme non lu',
              settings: 'Paramètres',
              generalSettings: 'Paramètres généraux',
              manageTranslations: 'Traductions',
              switchLang: 'Langue',
              save: 'Sauvegarder',
              addTranslation: 'Ajouter une traduction',
              exportAllTranslations: 'Exporter toutes les traductions',
              importAllTranslations: 'Importer toutes les traductions',
              translationsExported: 'Traductions exportées',
              translationsImported: 'Traductions importées',
              translationSaved: 'Traduction enregistrée',
              noTranslations: 'Aucune traduction',
              importError: "Erreur lors de l'import",
               readerSettings: 'Paramètres',
               readerSettingsPlaceholder: 'Bientôt',
               readerAllPages: 'Toutes les pages',
               readerToggleFavorite: 'Étoile de page',
               readerExploreMode: 'Mode exploration / Exploration mode',
               readerFitContain: 'Classique',
               readerFitCover: 'Zoom',
               readerFitCrop: 'Recadrer',
               readerFavoritesOnlyHint: 'Afficher uniquement les pages favorites',
               readerFavoritesOnlyActive: 'Mode favoris activé — navigation entre les pages favorites',
               readerFavoritesOnlyInactive: 'Mode favoris désactivé',
               readerNoPageFavorites: 'Aucune page favorite',
               readerFavoriteAdded: 'Page favorite ajoutée',
               readerFavoriteRemoved: 'Page favorite retirée',
               readerCtxAddFavorite: 'Ajouter aux favoris',
               readerCtxRemoveFavorite: 'Retirer des favoris',
               readerCtxNextPage: 'Page suivante',
               readerCtxPrevPage: 'Page précédente',
               readerGoToPrevTome: 'Volume précédent',
               readerPrevTomePrompt: 'Voulez-vous naviguer vers le tome précédent ?',
               readerBrowseWithoutProgress: 'Navigation sans progression',
               readerErasePrevProgress: 'Effacer la progression',
               readerCancel: 'Annuler',
             readerGoToPage: 'Aller à la page',
             prev: 'Précédent',
             next: 'Suivant',
             metadataSearch: 'Rechercher...',
               newLanguageLabel: 'Nouvelle langue',
               createLanguage: 'Créer',
               cancel: 'Annuler',
               languageChanged: 'Langue modifiée',
               setAsDefault: 'Définir par défaut',
               basedOn: 'Basé sur',
               fillManuallyHint: 'Laisser vide, je remplirai',
               otherLanguage: 'Autre',
               languageAdded: 'Langue ajoutée',
               languageExists: 'Cette langue existe déjà',
               addLanguage: 'Ajouter une langue',
               inputLanguageCode: 'Code de langue',
               noCover: 'Pas d\'image',
               noCoverHint: 'Sélectionner en une',
               selectCoverTitle: 'Sélectionner une image de couverture',
               editCover: 'Modifier l\'image',
                coverSet: 'Couverture définie',
                coverSetError: 'Erreur lors de la définition de la couverture',
                coverSelect: 'Sélectionner',
                newLibTypePrompt: 'Type de bibliothèque',
                libTypeFlat: 'Livres décorrélés',
                libTypeTomes: 'Séries / tomes',
                libTypeAudio: 'Livre audio',
                libTypeFlatHint: 'Tous les documents sont listés ensemble, sans regroupement par série.',
                libTypeTomesHint: 'Regroupe les documents par dossier (série) avec numérotation de tomes.',
                libTypeAudioHint: 'Bibliothèque pour fichiers audio (mp3, flac, m4a).',
                libTypeConfirm: 'Créer',
                addLibraryPathTitle: 'Ajouter un dossier',
                addLibraryPathPrompt: 'Nouveau dossier pour {name}',
                libTypeFlatLabel: 'Applati',
                libTypeTomesLabel: 'Séries',
                libTypeAudioLabel: 'Audio',
                libTypeAudioSoon: 'Fonctionnalité à venir',
                libTypeOverwriteWarning: ' Changer le type écrasera les paramètres de classification des collections existantes. Continuer ?',
                libTypeUpdated: 'Type de bibliothèque mis à jour',
                libTypeUpdateError: 'Erreur lors de la mise à jour du type',
                libPathsUpdated: 'Dossiers mis à jour',
                libPathAdded: 'Dossier ajouté',
                libPathRemoved: 'Dossier retiré',
                libPathRemoveError: 'Erreur lors du retrait du dossier',
                libPathRemoveConfirm: 'Retirer le dossier "{path}" de la bibliothèque "{name}" ?',
                libPathCannotRemoveLast: 'Impossible de retirer le dernier dossier',
                colTypeOverride: 'Type de collection',
                colTypeInherit: 'Hériter de la bibliothèque',
                colTypeFlat: 'Livres décorrélés',
                colTypeTomes: 'Séries / tomes',
                colTypeAudio: 'Livre audio',
                colTypeUpdated: 'Type de collection mis à jour',
                colTypeUpdateError: 'Erreur lors de la mise à jour du type',
                libFolders: 'dossiers',
                libFolder: 'dossier',
            },
        en: {
            title: 'Library',
            addLibrary: 'Add a library',
            filterAll: 'All types',
            filterExt: 'Filter by extension',
            toggleFlat: 'Flat view',
            toggleHierarchical: 'Hierarchical view',
            toggleFileInfo: 'Toggle file info',
            showFileCounts: 'Show counts',
            hideFileCounts: 'Hide counts',
            pages: 'pages',
            empty: 'No libraries',
            emptyHint: 'Click "Add a library" to start scanning your document collection.',
            readOnlyHint: 'Admin-managed — libraries are shared and read-only.',
            scan: 'Scan a folder',
            scanError: 'Scan failed',
            scanCancelled: 'Scan cancelled',
            scanInProgress: 'Scanning…',
            scanComplete: 'Scan complete',
            rescan: 'Rescan',
            rescanInProgress: 'Rescanning…',
            rescanComplete: 'Rescan complete',
            rescanLibrary: 'Rescan library',
            rescanCollection: 'Rescan collection',
            rescanEmpty: 'No files found during rescan',
            documents: 'documents',
            noResults: 'No files found',
            newLibPrompt: 'Library name',
            newLibPlaceholder: 'ex: Comics, Novels, Mangas',
            continueReading: 'Continue reading',
            inProgress: 'In progress',
            readerRead: 'Read',
            myFavorites: 'My Favorites',
            noFavorites: 'No favorites',
            favoritesHint: 'Bookmarked pages',
            noProgress: 'No progress saved',
            collection: 'Collection',
            collections: 'Collections',
            subCollections: 'Sub-collections',
            images: 'Images',
            totalFiles: 'total',
            files: 'Files',
            tomes: 'Tomes',
            tome: 'Volume',
            missingTome: 'Missing Tome',
            progress: ' progress',
            open: 'Open',
            unsupported: 'Unsupported format',
            readError: 'Could not read file',
            loadError: 'Load failed',
            back: 'Back',
            home: 'Home',
            size: 'size',
            page: 'Page',
            pages: 'Pages',
            percent: '%',
            convertCbr: 'Converting CBR…',
            convertCbrError: 'Could not convert CBR',
             deleteProgress: 'Delete progress',
             progressDeleted: 'Progress deleted',
             scanFolderDialog: 'Select a folder to scan',
             scanConfirm: 'Scan this folder',
             scanCancel: 'Cancel',
             subfolders: 'Subfolders',
             scanFiles: 'Files',
             navFavorites: 'Favorites',
             navNoFavorites: 'No favorites',
             navAddToFavorites: 'Add to favorites',
             navRemoveFavorite: 'Remove from favorites',
             navFavoriteAdded: 'Added to favorites',
             navFavoriteRemoved: 'Removed from favorites',
             navMore: 'More',
             navLoading: 'Loading…',
             librariesLabel: 'Libraries',
             toggleSidebar: 'Expand menu',
             reduce: 'Reduce',
             expand: 'Expand',
             navigationBreadcrumbRoot: 'Root',
            readerClose: 'Close',
            readerFullscreen: 'Fullscreen',
            readerExitFullscreen: 'Exit fullscreen',
            loading: 'Loading…',
             rename: 'Rename',
             renameLibrary: 'Rename library',
                renameCollection: 'Rename collection',
                renamed: 'Renamed',
                renamedError: 'Rename failed',
                contextDelete: 'Delete',
                contextDeleteLib: 'Delete library',
                contextDeleteCol: 'Delete collection',
                changeLibraryType: 'Change library type',
                changeColType: 'Change collection type',
                addLibraryPath: 'Add folder',
                typeChanged: 'Type updated',
                typeChangeError: 'Error updating type',
             goToCollection: 'Go to collection',
             deleted: 'Deleted',
             deleteLibConfirm: 'Delete library "{name}" ?',
             deleteColConfirm: 'Delete collection "{name}" ?',
             confirm: 'Confirm',
             cancel: 'Cancel',
             close: 'Close',
             markAsRead: 'Mark as read',
             markAsUnread: 'Mark as unread',
             markCollectionRead: 'Mark as read',
             markCollectionUnread: 'Mark as unread',
              markedRead: 'Marked as read',
              markedUnread: 'Marked as unread',
              settings: 'Settings',
              generalSettings: 'General settings',
              manageTranslations: 'Translations',
              switchLang: 'Language',
              save: 'Save',
              addTranslation: 'Add translation',
              exportAllTranslations: 'Export all translations',
              importAllTranslations: 'Import all translations',
              translationsExported: 'Translations exported',
              translationsImported: 'Translations imported',
              translationSaved: 'Translation saved',
              noTranslations: 'No translations',
              importError: 'Import error',
               readerSettings: 'Settings',
               readerSettingsPlaceholder: 'Coming soon',
               readerAllPages: 'All pages',
               readerToggleFavorite: 'Toggle page favorite',
               readerExploreMode: 'Exploration mode',
               readerFitContain: 'Fit to page',
               readerFitCover: 'Zoom',
               readerFitCrop: 'Crop',
               readerFavoritesOnlyHint: 'Show only favorite pages',
               readerFavoritesOnlyActive: 'Favorites mode active — navigating between favorite pages',
               readerFavoritesOnlyInactive: 'Favorites mode deactivated',
               readerNoPageFavorites: 'No favorite pages',
               readerFavoriteAdded: 'Page favorite added',
               readerFavoriteRemoved: 'Page favorite removed',
               readerCtxAddFavorite: 'Add to favorites',
               readerCtxRemoveFavorite: 'Remove from favorites',
               readerCtxNextPage: 'Next page',
               readerCtxPrevPage: 'Previous page',
               readerGoToPrevTome: 'Previous volume',
               readerPrevTomePrompt: 'Navigate to the previous volume?',
               readerBrowseWithoutProgress: 'Browse without progress',
               readerErasePrevProgress: 'Erase progress',
               readerCancel: 'Cancel',
             readerGoToPage: 'Go to page',
             prev: 'Previous',
             next: 'Next',
             metadataSearch: 'Search...',
               newLanguageLabel: 'New language',
               createLanguage: 'Create',
               cancel: 'Cancel',
               languageChanged: 'Language changed',
               setAsDefault: 'Set as default',
               basedOn: 'Based on',
               fillManuallyHint: 'Leave empty, I will fill in',
               otherLanguage: 'Other',
               languageAdded: 'Language added',
               languageExists: 'This language already exists',
               addLanguage: 'Add language',
               inputLanguageCode: 'Language code',
               noCover: 'No image',
               noCoverHint: 'Select as cover',
               selectCoverTitle: 'Select a cover image',
               editCover: 'Edit image',
                coverSet: 'Cover set',
                coverSetError: 'Error setting cover',
                coverSelect: 'Select',
                newLibTypePrompt: 'Library type',
                libTypeFlat: 'Flat books',
                libTypeTomes: 'Series / volumes',
                libTypeAudio: 'Audiobook',
                libTypeFlatHint: 'All documents listed together, no series grouping.',
                libTypeTomesHint: 'Groups documents by folder (series) with volume numbering.',
                libTypeAudioHint: 'Library for audio files (mp3, flac, m4a).',
                libTypeConfirm: 'Create',
                addLibraryPathTitle: 'Add folder',
                addLibraryPathPrompt: 'New folder for {name}',
                libTypeFlatLabel: 'Flat',
                libTypeTomesLabel: 'Series',
                libTypeAudioLabel: 'Audio',
                libTypeAudioSoon: 'Coming soon',
                libTypeOverwriteWarning: ' Changing the type will overwrite collection classification settings. Continue?',
                libTypeUpdated: 'Library type updated',
                libTypeUpdateError: 'Error updating type',
                libPathsUpdated: 'Folders updated',
                libPathAdded: 'Folder added',
                libPathRemoved: 'Folder removed',
                libPathRemoveError: 'Error removing folder',
                libPathRemoveConfirm: 'Remove folder "{path}" from library "{name}"?',
                libPathCannotRemoveLast: 'Cannot remove the last folder',
                colTypeOverride: 'Collection type',
                colTypeInherit: 'Inherit from library',
                colTypeFlat: 'Flat books',
                colTypeTomes: 'Series / volumes',
                colTypeAudio: 'Audiobook',
                colTypeUpdated: 'Collection type updated',
                colTypeUpdateError: 'Error updating type',
                libFolders: 'folders',
                libFolder: 'folder',
            },
     };
      var LANG = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.slice(0, 2) : 'fr';
      var storedLang = (typeof localStorage !== 'undefined') ? localStorage.getItem('renamer_default_lang') : null;
      var lang = (storedLang && TR[storedLang]) ? storedLang : (TR[LANG] ? LANG : 'fr');
      state.settingsLangView = lang;

      function t(key) {
          var dict = TR[lang] || TR.fr;
          return dict[key] || TR.fr[key] || key;
      }

      function refreshTranslations() {
          var els = document.querySelectorAll('[data-translation]');
          els.forEach(function(el) {
              var key = el.getAttribute('data-translation');
              var text = t(key);
              if (!text || text === key) return;

              var children = Array.from(el.children);
              var hasNonSvgChildren = children.some(function(child) {
                  return child.tagName !== 'SVG';
              });
              if (hasNonSvgChildren) return;

              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  if ('placeholder' in el) el.placeholder = text;
                  return;
              }

              var isIconOnly = !el.textContent.trim() && el.querySelector('svg');
              var tc = el.textContent.trim();
              var hasNonTextChild = tc && !/^[a-zA-Z]+$/.test(tc);

              if (el.tagName === 'BUTTON' || (el.tagName === 'SPAN' && isIconOnly)) {
                  if (isIconOnly || (hasNonTextChild && el.hasAttribute('title'))) {
                      el.title = text;
                      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', text);
                      return;
                  }
                  if (tc === '×' || tc === '+') return;
                  el.textContent = text;
                  return;
              }

              el.textContent = text;
          });
      }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getBaseUrl() {
        if (typeof OC !== 'undefined' && OC.generateUrl) {
            return OC.generateUrl('/apps/renamer');
        }
        return '/apps/renamer';
    }

    function dbg(context, info) {
        try {
            if (typeof console !== 'undefined' && console.debug) {
                var payload = typeof info === 'object' && info !== null ? info : { info: info };
                console.debug('[Renamer]', context, payload);
            }
        } catch (e) { /* noop */ }
    }

    function coverUrl(path) {
        var rel = state.covers && state.covers[path];
        return rel ? (getBaseUrl() + rel) : null;
    }

    function coverOfFirstTome(tomePaths) {
        for (var i = 0; i < (tomePaths || []).length; i++) {
            var p = tomePaths[i].path;
            var u = coverUrl(p);
            if (u) return u;
        }
        return null;
    }

    function loadCoversBulk(tomePaths, cb) {
        // Charge les covers pour les chemins non encore demandés (ni URL ni "manquant").
        // Ne bloque pas sur `coversLoaded` afin de permettre le chargement des covers
        // d'une nouvelle collection après un deep-link.
        var paths = [];
        var seen = {};
        (tomePaths || []).forEach(function (f) {
            var p = f.path;
            if (p && !seen[p]) {
                seen[p] = true;
                if (state.covers[p] !== undefined) return;
                paths.push(p);
            }
        });
        if (!paths.length) {
            state.coversLoaded = true;
            if (typeof cb === 'function') cb(false);
            return;
        }
        apiRequest(getBaseUrl() + '/api/covers/list', {
            method: 'POST',
            body: JSON.stringify({ paths: paths, width: state.coverWidth || 300 })
        }).then(function (data) {
            if (data && data.success && data.covers) {
                Object.keys(data.covers).forEach(function (k) {
                    state.covers[k] = data.covers[k];
                });
                if (window.console && console.debug) {
                    console.debug('[Renamer covers] merged covers map (paths=' + paths.length + ')');
                }
            } else if (window.console && console.warn) {
                console.warn('[Renamer covers] coversList error:', data && data.error ? data.error : data);
            }
            state.coversLoaded = true;
            if (typeof cb === 'function') cb(true);
        }).catch(function (err) {
            if (window.console && console.error) {
                console.error('[Renamer covers] coversList failed:', err && err.message ? err.message : err);
            }
            if (typeof cb === 'function') cb(false);
        });
    }

    function renderNoCoverPlaceholder(f) {
        var isPdf = !!(f && (f.type === 'pdf' || (f.name && f.name.toLowerCase().indexOf('.pdf') === f.name.length - 4)));
        if (isPdf) {
            var name = (f && f.name) ? f.name : '';
            return '<span class="lib-card-no-cover lib-card-no-cover-pdf">' +
                PDF_NO_COVER_SVG +
                '<span class="lib-card-no-cover-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>' +
                '</span>';
        }
        return '<span class="lib-card-no-cover">' +
            '<span class="lib-card-no-cover-text" data-translation="noCover">' + escapeHtml(t('noCover')) + '</span>' +
            '<span class="lib-card-no-cover-hint" data-translation="noCoverHint">' + escapeHtml(t('noCoverHint')) + '</span>' +
            '</span>';
    }

    function renderTomeIcon(f) {
        var icon = fileIcon(f.type);
        var url = coverUrl(f.path);
        if (url) {
            return '<img class="lib-card-img" draggable="false" src="' + url + '" alt="' + escapeHtml(icon) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">';
        }
        if (state.isAdmin) {
            return renderNoCoverPlaceholder(f);
        }
        return icon;
    }

    function apiRequest(url, options) {
        options = options || {};
        var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        var opts = {
            method: options.method || 'GET',
            credentials: 'same-origin',
            headers: headers,
            body: options.body || null,
        };
        if (options.signal) opts.signal = options.signal;
        var _t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        var _shortUrl = url.replace(getBaseUrl(), '');
        dbg('apiRequest', { method: opts.method, url: _shortUrl });
        return fetch(url, opts).then(function (r) {
            var _dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - _t0;
            dbg('apiRequest done', { url: _shortUrl, status: r.status, ok: r.ok, ms: Math.round(_dt) });
            if (!r.ok) {
                return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t); });
            }
            return r.json();
        }).catch(function (err) {
            var _dt2 = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - _t0;
            dbg('apiRequest error', { url: _shortUrl, ms: Math.round(_dt2), msg: err && err.message });
            throw err;
        });
    }

    function showToast(message, type) {
        var container = document.getElementById('lib-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'lib-toast-container';
            container.style.cssText = 'position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:8px;z-index:20000;';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.style.cssText = 'min-width:220px;max-width:420px;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:500;color:var(--nc-text);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;gap:8px;';
        var bg = type === 'error' ? '#fbe2e1' : type === 'info' ? '#ecf0f1' : '#e8f5e9';
        var fg = type === 'error' ? '#a01818' : type === 'info' ? '#374151' : '#1a7f1a';
        toast.style.background = bg;
        toast.style.color = fg;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 3500);
    }

    function showLoader() {
        var existing = document.getElementById('lib-loading-overlay');
        if (existing) return;
        var overlay = document.createElement('div');
        overlay.id = 'lib-loading-overlay';
        overlay.className = 'lib-loading-overlay';
        var spinner = document.createElement('div');
        spinner.className = 'lib-loading-spinner';
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }

    function hideLoader() {
        var overlay = document.getElementById('lib-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

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
                span.style.cssText = 'display:inline-flex;align-items:center;width:16px;height:16px;';
                span.innerHTML = it.icon;
                item.appendChild(span);
            }
            var label = document.createElement('span');
            label.textContent = it.label;
            item.appendChild(label);
            item.addEventListener('mousedown', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
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

    function promptRename(label, current, cb) {
        RenamerUtils.showPromptDialog(label, '', current || '', function (name) {
            name = (name || '').trim();
            if (!name) return;
            cb(name);
        }, { dialogId: 'renamer-rename-dialog', confirmLabel: t('rename') });
    }

    function renameLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        promptRename(t('renameLibrary'), lib.name || '', function (name) {
            var payload = { name: name, description: lib.description || '' };
            apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, {
                method: 'PUT',
                body: JSON.stringify(payload)
            }).then(function (data) {
                if (data && data.success) {
                    if (data.library) { lib.name = data.library.name; lib.description = data.library.description || ''; }
                    else { lib.name = name; }
                    showToast(t('renamed'), 'info');
                    render();
                } else {
                    showToast(t('renamedError'), 'error');
                }
            }).catch(function () { showToast(t('renamedError'), 'error'); });
        });
    }

    function deleteLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        var msg = t('deleteLibConfirm').replace('{name}', lib.name || '');
        RenamerUtils.showConfirmDialog(
            t('contextDelete'),
            msg,
            function () {
                apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, { method: 'DELETE' }).then(function (data) {
                    if (data && data.success) {
                        state.libraries = (state.libraries || []).filter(function (l) { return String(l.id) !== String(lib.id); });
                        showToast(t('deleted'), 'info');
                        render();
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function () { showToast(t('scanError'), 'error'); });
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-lib' }
         );
     }

     function changeLibraryType(lib) {
         if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
         showLibraryTypePicker(lib.name, '', function (result) {
             var newType = result.type;
             var payload = { libraryType: newType };
             apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, { method: 'PUT', body: JSON.stringify(payload) }).then(function (data) {
                 if (data && data.success) {
                     lib.libraryType = newType;
                     showToast(t('typeChanged'), 'info');
                     render();
                 } else {
                     showToast(t('typeChangeError'), 'error');
                 }
             }).catch(function () { showToast(t('typeChangeError'), 'error'); });
         });
     }

     function changeCollectionType(col, lib) {
         if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
         showLibraryTypePicker(col.name, '', function (result) {
             var newType = result.type;
             var payload = { collectionType: newType };
             apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'PUT', body: JSON.stringify(payload) }).then(function (data) {
                 if (data && data.success) {
                     col.collectionType = newType;
                     showToast(t('typeChanged'), 'info');
                     render();
                 } else {
                     showToast(t('typeChangeError'), 'error');
                 }
             }).catch(function () { showToast(t('typeChangeError'), 'error'); });
         });
     }

     function addLibraryPath(lib) {
         if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
         showFolderPicker(function (folderPath) {
             if (!folderPath) return;
             apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/paths', {
                 method: 'POST',
                 body: JSON.stringify({ path: folderPath })
             }).then(function (data) {
                 if (data && data.success) {
                     lib.paths = data.paths || lib.paths;
                     showToast(t('pathAdded'), 'info');
                     render();
                 } else {
                     showToast(t('pathAddError'), 'error');
                 }
             }).catch(function () { showToast(t('pathAddError'), 'error'); });
         });
     }

     function renameCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        promptRename(t('renameCollection'), col.name || '', function (name) {
            var payload = { name: name, description: col.description || '', rules: col.rules || { files: [] } };
            apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'PUT', body: JSON.stringify(payload) }).then(function (data) {
                if (data && data.success) {
                    var r = data.collection || {};
                    if (r.name != null) { col.name = r.name; col.description = r.description || ''; col.rules = r.rules || (col.rules || { files: [] }); }
                    else { col.name = name; }
                    showToast(t('renamed'), 'info');
                    if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
                } else {
                    showToast(t('renamedError'), 'error');
                }
            }).catch(function () { showToast(t('renamedError'), 'error'); });
        });
    }

    function deleteCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        var msg = t('deleteColConfirm').replace('{name}', col.name || '');
        RenamerUtils.showConfirmDialog(
            t('contextDeleteCol') || t('contextDelete'),
            msg,
            function () {
                apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, { method: 'DELETE' }).then(function (data) {
                    if (data && data.success) {
                        if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
                        showToast(t('deleted'), 'info');
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function () { showToast(t('scanError'), 'error'); });
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-col' }
        );
    }

    function navigateToCollection(col, lib) {
        state.view = 'tomes';
        state.currentLibrary = lib || state.currentLibrary;
        state.currentCollection = col;
        state.currentTome = null;
        state.readerTreePath = [];
        var urlParams = { view: 'tomes' };
        if (lib) urlParams.library = String(lib.id);
        if (col) urlParams.collection = String(col.id);
        updateUrl(urlParams);
        renderTomes(col);
        renderSidebar();
        renderBreadcrumb();
    }

    function rescanLibrary(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        showToast(t('rescanInProgress') + ' ' + (lib.name || ''), 'info');
        apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/rescan', {
            method: 'POST',
            body: JSON.stringify({})
        }).then(function (data) {
            if (data && data.success) {
                showToast(t('rescanComplete') + ' — ' + data.fileCount + ' ' + t('documents'), 'info');
                loadLibraries();
            } else {
                showToast(t('scanError') + ' : ' + ((data && data.error) || ''), 'error');
            }
        }).catch(function (err) { showToast(t('scanError'), 'error'); });
    }

    function addLibraryPath(lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        showFolderPicker(function (newPath) {
            if (!newPath) {
                showToast(t('scanCancelled'), 'info');
                return;
            }
            RenamerUtils.showConfirmDialog(
                t('addLibraryPathTitle'),
                t('scanConfirm').replace('{name}', (lib.name || '')) + ' ?',
                function () {
                    apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/paths', {
                        method: 'POST',
                        body: JSON.stringify({ path: newPath })
                    }).then(function (data) {
                        if (data && data.success) {
                            lib.paths = data.paths || (data.library ? data.library.paths : null) || lib.paths;
                            if (data.library && data.library.paths) lib.paths = data.library.paths;
                            if (data.library && data.library.description != null) lib.description = data.library.description;
                            if (data.library && data.library.libraryType != null) lib.libraryType = data.library.libraryType;
                            showToast(t('libPathAdded'), 'info');
                            rescanLibrary(lib);
                        } else {
                            showToast(t('libPathRemoveError') + ((data && data.error) || ''), 'error');
                        }
                    }).catch(function () { showToast(t('libPathRemoveError'), 'error'); });
                },
                { confirmLabel: t('scanConfirm'), cancelLabel: t('scanCancel') || 'Annuler', dialogId: 'renamer-add-lib-path-confirm' }
            );
        });
    }

    function showLibraryTypeSubMenu(items, currentType, onChange) {
        var typeOptions = [
            { type: 'flat', label: t('libTypeFlatLabel') },
            { type: 'tomes', label: t('libTypeTomesLabel') },
            { type: 'audio', label: t('libTypeAudioLabel'), enabled: false },
        ];
        typeOptions.forEach(function (opt) {
            items.push({
                label: opt.label + (opt.type === currentType ? ' ✓' : ''),
                icon: '',
                action: opt.enabled === false ? null : function () {
                    onChange(opt.type);
                },
                disabled: opt.enabled === false,
            });
        });
        items.push({ type: 'separator' });
    }

    function changeLibraryType(lib, newType) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        if (newType === lib.libraryType) return;
        RenamerUtils.showConfirmDialog(
            t('libTypeOverwriteWarning').split(' ?')[0] || 'Changer le type',
            t('libTypeOverwriteWarning'),
            function () {
                var payload = {
                    name: lib.name || '',
                    description: lib.description || '',
                    paths: lib.paths || [lib.description || ''],
                    libraryType: newType,
                };
                apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                }).then(function (data) {
                    if (data && data.success) {
                        lib.libraryType = newType;
                        if (data.library && data.library.libraryType != null) lib.libraryType = data.library.libraryType;
                        showToast(t('libTypeUpdated'), 'info');
                        rescanLibrary(lib);
                    } else {
                        showToast(t('libTypeUpdateError'), 'error');
                    }
                }).catch(function () { showToast(t('libTypeUpdateError'), 'error'); });
            },
            { confirmLabel: t('confirm'), cancelLabel: t('cancel'), dialogId: 'renamer-change-lib-type' }
        );
    }

    function changeCollectionType(col, lib, newType) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        col.rules = col.rules || {};
        col.rules.type = newType;
        var payload = {
            name: col.name || '',
            description: col.description || '',
            rules: stripRulesForBackend({ folder: col.rules.folder, files: col.rules.files || [], children: col.rules.children || [] }),
        };
        payload.rules.type = newType;
        apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id, {
            method: 'PUT',
            body: JSON.stringify(payload)
        }).then(function (data) {
            if (data && data.success) {
                col.rules.type = newType;
                showToast(t('colTypeUpdated'), 'info');
                if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
            } else {
                showToast(t('colTypeUpdateError'), 'error');
            }
        }).catch(function () { showToast(t('colTypeUpdateError'), 'error'); });
    }

    function getCollectionType(col) {
        if (!col || !col.rules) return null;
        return col.rules.type || null;
    }

    function removeLibraryPath(lib, pathToRemove) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'info'); return; }
        RenamerUtils.showConfirmDialog(
            t('libPathRemoveConfirm').replace('{path}', pathToRemove).replace('{name}', lib.name || ''),
            '',
            function () {
                apiRequest(getBaseUrl() + '/api/reader/libraries/' + lib.id + '/paths', {
                    method: 'DELETE',
                    body: JSON.stringify({ path: pathToRemove })
                }).then(function (data) {
                    if (data && data.success) {
                        if (data.library && data.library.paths) lib.paths = data.library.paths;
                        if (data.library && data.library.description != null) lib.description = data.library.description;
                        showToast(t('libPathRemoved'), 'info');
                        rescanLibrary(lib);
                    } else {
                        showToast(t('libPathRemoveError') + ((data && data.error) || ''), 'error');
                    }
                }).catch(function () { showToast(t('libPathRemoveError'), 'error'); });
            },
            { danger: true, confirmLabel: t('confirm'), cancelLabel: t('cancel'), dialogId: 'renamer-remove-lib-path' }
        );
    }

    function rescanCollection(col, lib) {
        if (!state.isAdmin) { showToast(t('readOnlyHint'), 'error'); return; }
        showToast(t('rescanInProgress') + ' ' + (col.name || ''), 'info');
        apiRequest(getBaseUrl() + '/api/reader/collections/' + col.id + '/rescan', {
            method: 'POST',
            body: JSON.stringify({})
         }).then(function (data) {
            if (data && data.success) {
                showToast(t('rescanComplete') + ' — ' + data.fileCount + ' ' + t('documents'), 'info');
                if (lib) { loadCollections(lib.id, function () { renderCollections(lib); }); }
            } else {
                showToast(t('scanError') + ' : ' + ((data && data.error) || ''), 'error');
            }
        }).catch(function () { showToast(t('scanError'), 'error'); });
    }

    function getWebdavUrl(filePath) {
        var cleanPath = String(filePath || '').replace(/^\/+/, '');
        var segments = cleanPath.split('/').map(function(s) { return encodeURIComponent(s); });
        var base = (typeof OC !== 'undefined' && OC.generateUrl) ? OC.generateUrl('/remote.php/dav') : '/remote.php/dav';
        var uid = (typeof OC !== 'undefined' && OC.userid) ? OC.userid : '';
        var ownerUid = (state.currentCollection && state.currentCollection.userId) ? state.currentCollection.userId :
                        (state.currentLibrary && state.currentLibrary.userId) ? state.currentLibrary.userId : null;
        var prefix = ownerUid ? ('users/' + ownerUid) : ('files/' + uid);
        var url = base + '/' + prefix + '/' + segments.join('/');
        if (url.indexOf('http') !== 0 && typeof window !== 'undefined' && window.location && window.location.origin) {
            url = window.location.origin + url;
        }
        return url;
    }

    function getDavHeaders() {
        var headers = {};
        if (typeof OC !== 'undefined' && OC.requestToken) {
            headers['requesttoken'] = OC.requestToken;
        }
        return headers;
    }

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
                        loadCollections(state.currentLibrary.id, function () { renderTomes(state.currentCollection); });
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
                            loadCollections(state.currentLibrary.id, function () { renderTomes(state.currentCollection); });
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
            var root = getCollectionRoot(collection);
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
                        renderTomes(collection);
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
                var root = getCollectionRoot(collection);
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
                            renderTomes(collection);
                        } else {
                            showToast(t('scanError'), 'error');
                        }
                    }).catch(function () { showToast(t('scanError'), 'error'); });
                }
            },
            { danger: true, confirmLabel: t('contextDelete'), cancelLabel: t('cancel') || 'Annuler', dialogId: 'renamer-confirm-delete-subcol' }
        );
    }

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
                   render();
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
                   render();
               } else {
                   showToast(t('scanError'), 'error');
               }
           }).catch(function () { showToast(t('scanError'), 'error'); });
       }

      function collectPaths(nodeOrCollection) {
         var root = nodeOrCollection && nodeOrCollection.rules ? nodeOrCollection.rules : nodeOrCollection;
         var files = collectAllFiles(root);
         var paths = [];
         files.forEach(function (f) { if (f.path) paths.push(f.path); });
         return paths;
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
          var paths = collectPaths(collection);
          markPathsRead(paths, function () {
              render();
          });
      }

      function markCollectionUnread(collection, lib) {
          var paths = collectPaths(collection);
          markPathsUnread(paths, function () {
              render();
          });
      }

      function markNodeRead(node, collection) {
          var paths = collectPaths(node);
          markPathsRead(paths, function () {
              render();
          });
      }

      function markNodeUnread(node, collection) {
          var paths = collectPaths(node);
          markPathsUnread(paths, function () {
              render();
          });
      }

    function injectStyles() {
        if (document.getElementById('lib-styles')) return;
        var style = document.createElement('style');
        style.id = 'lib-styles';
        style.textContent =
            ':root{--lib-settings-btn-bg:#F0E9FE;--reader-accent:#7c3aed;--reader-accent-hover:#6d28d9;--reader-accent-light:#a855f7;--reader-accent-lighter:#c4b5ff;--reader-accent-bg:rgba(124,58,237,0.15);--reader-accent-bg-hover:rgba(124,58,237,0.25)}@media (prefers-color-scheme: dark){:root{--lib-settings-btn-bg:#2C223B;--reader-accent:#8b5cf6;--reader-accent-hover:#7c3aed}}' +
            'body,html{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-drag:none}' +
            '.lib-page-app{display:flex;flex-direction:row;height:calc(100dvh - 64px);width:100%;overflow:hidden;background:var(--color-background-assistant);color:var(--reader-accent-lighter);font-family:var(--nc-font-family,"Segoe UI",sans-serif);--lib-nav-accent:#a855f7;}' +
            '.lib-page-app.fullscreen{height:calc(var(--renamer-app-height,100dvh))!important;height:100dvh!important;width:100dvw!important}' +
            '#content.app-renamer.fullscreen{height:100dvh!important;max-height:100dvh!important;padding:0!important;margin:0!important;overflow:hidden;position:absolute;top:0;left:0;width:100dvw;border-radius:0;z-index:10000;}' +
            '.lib-fullscreen-toggle{background:transparent;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:4px;opacity:0.6;color:var(--reader-accent-lighter);transition:var(--nc-transition);margin-left:4px;}' +
            '.lib-fullscreen-toggle:hover{opacity:1;background:var(--reader-accent-bg);color:var(--reader-accent-light);}' +
            '.lib-fullscreen-toggle svg{width:18px;height:18px;}' +
             '.lib-page-header{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;}' +
            '#lib-breadcrumb{margin-right:auto;flex:1;min-width:0;}' +
            '#lib-breadcrumb .navigation-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:2px;}' +
            '#lib-breadcrumb .breadcrumb__crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:2px;list-style:none;margin:0;padding:0;}' +
            '#lib-breadcrumb .navigation-crumb{display:inline-flex;align-items:center;gap:2px;}' +
            '#lib-breadcrumb .navigation-crumb a{text-decoration:none;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-crumb a .button-vue__text{color:var(--lib-nav-accent);font-size:13px;}' +
            '#lib-breadcrumb .navigation-crumb:hover a .button-vue__text{color:var(--reader-accent-light);}' +
            '#lib-breadcrumb .navigation-crumb.active a{pointer-events:none;}' +
            '#lib-breadcrumb .navigation-crumb.active a .button-vue__text{color:var(--reader-accent-lighter);font-weight:600;}' +
            '#lib-breadcrumb .vue-crumb__separator{display:inline-flex;align-items:center;opacity:0.7;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-breadcrumb-star{background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:14px;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-breadcrumb-star:hover{opacity:1;}' +
            '#lib-breadcrumb .navigation-breadcrumb-star[data-favorite="true"]{opacity:1;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-nav-more{background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:14px;color:var(--reader-accent-lighter);}' +
            '#lib-breadcrumb .navigation-nav-more:hover{opacity:1;}' +
            '#lib-folder-breadcrumb .navigation-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:2px;}' +
            '#lib-folder-breadcrumb .breadcrumb__crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:2px;list-style:none;margin:0;padding:0;}' +
            '#lib-folder-breadcrumb .navigation-crumb{display:inline-flex;align-items:center;gap:2px;}' +
            '#lib-folder-breadcrumb .navigation-crumb a{text-decoration:none;color:var(--lib-nav-accent);}' +
            '#lib-folder-breadcrumb .navigation-crumb a .button-vue__text{color:var(--lib-nav-accent);font-size:13px;}' +
            '#lib-folder-breadcrumb .navigation-crumb:hover a .button-vue__text{color:var(--reader-accent-light);}' +
            '#lib-folder-breadcrumb .navigation-crumb.active a{pointer-events:none;}' +
            '#lib-folder-breadcrumb .navigation-crumb.active a .button-vue__text{color:var(--reader-accent-lighter);font-weight:600;}' +
            '#lib-folder-breadcrumb .vue-crumb__separator{display:inline-flex;align-items:center;opacity:0.7;color:var(--lib-nav-accent);}' +
            '.lib-page-title{font-size:18px;font-weight:600;color:var(--nc-text);}' +
            '.lib-page-content{flex:1;overflow-y:auto;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,30px));-webkit-overflow-scrolling:touch;scrollbar-color:var(--lib-nav-accent) transparent}' +
            '.lib-main{flex:1;display:flex;flex-direction:column;min-width:0;}' +
            '.lib-sidebar{width:230px;min-width:230px;background:var(--nc-bg-hover);border-right:1px solid var(--nc-border);display:flex;flex-direction:column;flex-shrink:0;transition:width 220ms ease-in-out;z-index:5;position:relative;transition: var(--nc-transition);}' +
            '.lib-sidebar.collapsed{width:0;min-width:0;overflow:hidden;}' +
            '@media (display-mode: standalone){.lib-sidebar{padding-top:20px}.lib-main{padding-top:20px}}' +
            '.lib-sidebar-header{display:flex;align-items:center;height:56px;padding:0 12px;border-bottom:1px solid var(--nc-border);}' +
            '.lib-sidebar-header{display:flex;align-items:center;height:56px;padding:0 12px;border-bottom:1px solid var(--nc-border);}' +
            '.select, button:not(.button-vue,[class^=vs__]), .button, input[type=button], input[type=submit], input[type=reset]{background-color:var(--reader-accent-bg);color:var(--reader-accent-lighter)}' +
            '.select:hover, button:not(.button-vue,[class^=vs__]):hover, .button, input[type=button]:hover, input[type=submit]:hover, input[type=reset]:hover{background-color:var(--reader-accent-bg);}' +
            'select:hover, select:focus, button:not(.button-vue,[class^=vs__]):hover, button:not(.button-vue,[class^=vs__]):focus, .button:hover, .button:focus, input[type=button]:hover, input[type=button]:focus, input[type=submit]:hover, input[type=submit]:focus, input[type=reset]:hover, input[type=reset]:focus{background-color:var(--reader-accent-bg);}' +
            'button:not(.button-vue,[class^=vs__]).lib-sidebar-toggle{margin-right:10px;transition: all 300ms ease-in-out;}' +
'.button:not(.button-vue,[class^=vs__]).lib-sidebar-toggle{background-color:var(--reader-accent-bg);border:none;font-size:22px;cursor:pointer;opacity:0.9;flex-shrink:0;color:var(--reader-accent-light);margin-right:5px;}' +
            '.lib-sidebar-toggle:hover{opacity:1;color:var(--reader-accent-light);background-color:var(--reader-accent-bg);}' +
            '.lib-sidebar-menu{flex:1;overflow-y:auto;padding:8px 0 calc(60px + env(safe-area-inset-bottom,30px));-webkit-overflow-scrolling:touch;scrollbar-color:var(--lib-nav-accent) transparent;max-height: calc(100% - 50px);overflow-x: hidden;}' +
            '.lib-sidebar-menu::-webkit-scrollbar{width:6px}' +
            '.lib-sidebar-menu::-webkit-scrollbar-track{background:transparent}' +
            '.lib-sidebar-menu::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '.lib-page-content::-webkit-scrollbar{width:8px}' +
            '.lib-page-content::-webkit-scrollbar-track{background:transparent}' +
            '.lib-page-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:4px}' +
            '.reader-zoomed::-webkit-scrollbar{width:12px;height:12px}' +
            '.reader-zoomed::-webkit-scrollbar-track{background:transparent}' +
            '.reader-zoomed::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:6px}' +
            '.reader-zoomed::-webkit-scrollbar-thumb:hover{background:var(--lib-nav-accent)}' +
            '.reader-zoomed{scrollbar-color:var(--lib-nav-accent) transparent}' +
            '.reader-settings-menu::-webkit-scrollbar{width:6px}' +
            '.reader-settings-menu::-webkit-scrollbar-track{background:transparent}' +
            '.reader-settings-menu::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '.reader-settings-menu{scrollbar-color:var(--lib-nav-accent) transparent}' +
            '.lib-sidebar-item{display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;-webkit-touch-callout:none;transition: all 300ms ease-in-out;}' +
            '.lib-sidebar-item:hover{background:var(--reader-accent-bg);}' +
            '.lib-sidebar-item.active{background:var(--reader-accent-bg);font-weight:600;color:var(--lib-nav-accent);}' +
            '.lib-sidebar-item.active .lib-sidebar-icon{color:var(--lib-nav-accent);}' +
            '.lib-sidebar-icon{display:flex;width:22px;text-align:center;font-size:16px;}' +
             '.lib-sidebar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}' +
             '.lib-sidebar-item.addLib > .lib-sidebar-icon{display:none;}' +
             '.lib-sidebar-item.addLib > .lib-sidebar-label{display:flex;justify-content:center;align-items:center;width:100%;font-size:18px;padding:0;}' +
'.lib-sidebar-sub{margin-left:12px;overflow:hidden;height:0;transition:height 250ms ease;}' +
            '.lib-sidebar-sub.expanded{overflow-y:hidden;}' +
            '.lib-sidebar-sub::-webkit-scrollbar{display: none;overflow: hidden}' +
              '.lib-sidebar-sub .lib-sidebar-item{margin:0 8px;}' +
              '.lib-sidebar-sub .lib-sidebar-icon{width:18px;font-size:14px;}' +
'.lib-sidebar-chevron{display:inline-flex;align-items:center;transition:transform 180ms ease;}' +
'.lib-sidebar-chevron.expanded{transform:rotate(90deg);}' +
'.lib-sidebar-item.sub-open .lib-sidebar-label{color:var(--lib-nav-accent);font-weight:600;}' +
'.lib-filter-bar{border-bottom:1px solid var(--nc-border);overflow-x:auto;display:flex;gap:8px;padding:12px 16px;}' +
'.lib-filter-btn-active{padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--reader-accent-bg)!important;color:var(--reader-accent-lighter)!important;font-size:13px;cursor:pointer;white-space:nowrap;}' +
'.lib-filter-wrapper{overflow:hidden;max-height:500px;transition:max-height 240ms ease,opacity 240ms ease,padding 240ms ease,border-bottom 240ms ease;}' +
'.lib-filter-wrapper.lib-info-hidden{max-height:0;opacity:0;overflow:hidden;padding:0;border-bottom:none;pointer-events:none;}' +
'.lib-info-toggle.active{color:var(--reader-accent-lighter);}' +
'.lib-page-header-left{display:flex;align-items:center;gap:8px;}' +
'.lib-context-menu{position:fixed;z-index:99999;min-width:170px;background:var(--color-background-assistant,var(--nc-bg-default));border:1px solid var(--nc-border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);padding:4px 0;font-size:13px;color:var(--nc-text);-webkit-touch-callout:none}' +
'.lib-translation-lang-dropdown{position:absolute;top:100%;right:0;z-index:10001;min-width:100px;background:var(--color-background-assistant,var(--nc-bg-default));border:1px solid var(--reader-accent-bg);border-radius:6px;box-shadow:0 4px 12px rgba(124,58,237,0.15);padding:4px 0;font-size:13px;color:var(--nc-text);}' +
'.lib-context-item{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:6px;margin:0 4px;}' +
              '.lib-context-item *{cursor:pointer}' +
              '.lib-context-item:hover{background:var(--reader-accent-bg);}' +
            '.lib-context-separator{height:1px;background:var(--nc-border);margin:4px 0;}' +
            '.lib-cards-ctn{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-content:flex-start;}' +
            '.lib-card-portrait{flex:0 0 180px;height:310px;min-width:0;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;cursor:pointer;transition:transform 0.15s;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;position:relative;transition: all 300ms ease-in-out;}' +
            '.lib-card-portrait *, .lib-card *, .lib-collection-card *, .lib-library-card *, .lib-subcollection-card *{cursor:pointer}' +
            '.lib-card-portrait:hover{transform:translateY(-2px);background:var(--reader-accent-bg);}' +
            '.lib-card-portrait .lib-card-icon{font-size:32px;text-align:center;margin-bottom:8px;width:100%;fill:var(--reader-accent);}' +
            '.lib-card-portrait .lib-card-title{font-weight:600;font-size:13px;margin-bottom:0px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;box-sizing:border-box;}' +
            '.lib-card-portrait .lib-card-sub{font-size:11px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;box-sizing:border-box;}' +
            '.lib-card-portrait .lib-tome-actions-btn,.lib-card .lib-tome-actions-btn{position:absolute;bottom:0;right:0;background:var(--color-background-assistant,#221D2B);border:none;color:var(--reader-accent-lighter);opacity:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:22px;font-size:14px;line-height:1;font-weight:600;border-radius:100%;transition:opacity 0.15s,background-color 0.15s;rotate:90deg}' +
            '.lib-card-portrait .lib-tome-actions-btn:hover,.lib-card .lib-tome-actions-btn:hover{background:var(--reader-accent-bg);opacity:1}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:8px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-empty{text-align:center;padding:40px 16px;opacity:0.6;font-size:13px;}' +
            '.lib-sub-col-title{font-size:13px;font-weight:600;margin:16px 0 8px 0;}' +
            '.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;}' +
             '.lib-card{background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;-webkit-touch-callout:none;position:relative;display:flex;flex-direction:column;justify-content:center;height:310px;transition: all 300ms ease-in-out;}' +
             '.lib-card.noPreview{align-items:center;}' +
            '.lib-card:hover{transform:translateY(-2px);background:var(--reader-accent-bg);}' +
             '.lib-card .lib-icon{font-size:32px;text-align:center;margin-bottom:0px;position:relative;width:100%;fill:var(--reader-accent);}' +
            '.lib-card-img{width:100%;height:230px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 8px;-webkit-touch-callout:none}' +
            '.lib-card-portrait .lib-card-icon .lib-card-img{width:100%;height:230px;}' +
            '.lib-card-portrait .lib-card-icon{position:relative;}' +
            '.lib-fav-count-badge{position:absolute;bottom:6px;right:6px;background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;min-height:18px;display:flex;align-items:center;justify-content:center;line-height:1;}' +
            '.lib-card .lib-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;box-sizing:border-box;}' +
            '.lib-card.noPreview .lib-name, .lib-card-portrait.noPreview .lib-card-title{display:flex;justify-content:center;}' +
            '.lib-card .lib-meta{font-size:11px;opacity:0.6;}' +
            '.lib-card.noPreview .lib-collection-status-icon {top: -90px;height: 50px;width: 50px;padding: 10px;right: -5px;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:12px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-fav-count-badge{position:absolute;bottom:6px;right:6px;background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;min-height:18px;display:flex;align-items:center;justify-content:center;line-height:1;}' +
            '.lib-card-portrait .lib-card-icon{position:relative;}' +
            '.lib-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:6px;cursor:pointer;}' +
            '.lib-prog{display:flex;align-items:center;gap:6px;font-size:12px;opacity:0.6;}' +
            '.lib-btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:1px solid var(--reader-accent-bg);border-radius:6px;background:var(--nc-bg-default);color:var(--reader-accent-lighter);font-size:13px;cursor:pointer;}' +
            '.lib-btn:hover{background:var(--reader-accent-bg);}' +
            '.lib-btn-primary{background:var(--reader-accent);color:#fff;border-color:var(--reader-accent);}' +
            '.lib-btn-primary:hover{background:var(--reader-accent-hover);}' +
            '.lib-tome{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--reader-accent-bg);}' +
            '@keyframes renamer-spin{to{transform:rotate(360deg)}}' +
            '.renamer-toast-container{position:fixed;bottom:20px;right:20px;z-index:200000;display:flex;flex-direction:column;gap:8px;pointer-events:none;}' +
            '.renamer-toast{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:var(--nc-radius);background:var(--lib-settings-btn-bg);border:1px solid var(--nc-border);box-shadow:0 4px 16px rgba(0,0,0,0.2);font-size:14px;color:var(--nc-text);pointer-events:auto;min-width:200px;max-width:400px;opacity:0;transform:translateX(20px);transition:opacity 250ms ease,transform 250ms ease;}' +
            '.renamer-toast-show{opacity:1;transform:translateX(0);}' +
            '.renamer-toast-info{border-left:4px solid #22c55e;}' +
            '.renamer-toast-success{border-left:4px solid #22c55e;}' +
            '.renamer-toast-error{border-left:4px solid #ef4444;}' +
            '.renamer-toast-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#fff;flex-shrink:0;}' +
            '.renamer-toast-info .renamer-toast-icon{background:#22c55e;}' +
            '.renamer-toast-success .renamer-toast-icon{background:#22c55e;}' +
            '.renamer-toast-error .renamer-toast-icon{background:#ef4444;}' +
            '.renamer-toast-close{background:transparent;border:none;color:var(--reader-accent-lighter);cursor:pointer;font-size:16px;opacity:0.6;}' +
            '.renamer-toast-close:hover{opacity:1;}' +
            '#reader-scan-breadcrumb .navigation-breadcrumb,#reader-scan-breadcrumb .navigation-breadcrumb *{font-size:13px;}' +
            '#reader-scan-breadcrumb .navigation-crumb .button-vue__text{color:var(--color-text-maxcontrast);font-size:12px;}' +
            '#reader-scan-breadcrumb .navigation-crumb.active .button-vue__text{color:var(--reader-accent-lighter);font-size:12px;}' +
            '.reader-scan-favorites-item{display:flex;align-items:center;gap:6px;font-size:12px;background:var(--reader-accent-bg);border:1px solid var(--reader-accent-bg);border-radius:4px;padding:4px 8px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.reader-scan-favorites-item:hover{background:var(--reader-accent-bg);}' +
            '.reader-scan-favorites-star{opacity:0.7;font-size:11px;}' +
            '.reader-scan-folder-row{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;border-radius:6px;border:1px solid var(--reader-accent-bg);background:var(--nc-bg-default);transition:var(--nc-transition);}' +
            '.reader-scan-folder-row:hover{background:var(--reader-accent-bg);border-color:var(--reader-accent-light);}' +
            '.reader-scan-folder-row .reader-folder-icon{font-size:16px;opacity:0.8;}' +
            '.reader-scan-file-row{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:6px;border:1px solid var(--reader-accent-bg);background:var(--nc-bg-default);opacity:0.6;}' +
            '.reader-scan-file-row .reader-file-icon{font-size:14px;}' +
            '.reader-scan-section-title{font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin:10px 0 4px 0;}' +
            '.reader-scan-empty{opacity:0.5;font-size:13px;padding:16px;text-align:center;}' +
            '.reader-scan-table{width:100%;border-collapse:collapse;}' +
            '.reader-scan-table td{padding:0;}' +
            '.lib-tome-status-icon{position:absolute;bottom:11px;right:4px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;opacity:0.85;border-radius: 50px;padding: 5px;background-color: var(--color-background-assistant);}' +
            '.lib-tome-status-icon svg{display:block;width:16px;height:16px}' +
            '.lib-tome-status-icon.lib-tome-inprogress svg{fill:var(--color-background-assistant)}' +
            '.lib-card-portrait.lib-missing-tome{cursor:not-allowed;}' +
            '.lib-card-portrait.lib-missing-tome > *{pointer-events:none;}' +
            '.lib-card-portrait.lib-missing-tome .lib-card-icon{background:var(--nc-bg-hover);border:1px dashed var(--nc-border);}' +
            '.lib-card-portrait.lib-missing-tome .lib-card-icon:before{content:"";display:block;text-align:center;font-size:28px;opacity:0.4;}' +
             '.lib-collection-status-icon{position:absolute;top:8px;right:8px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;opacity:0.85;border-radius:50px;padding:5px;background-color:var(--reader-accent);}' +
             '.lib-collection-status-icon svg{display:block;width: 100%;height: 100%;}' +
             '.lib-collection-status-icon.lib-tome-inprogress svg{fill:var(--color-background-assistant)}' +
            '.lib-missing-tome-banner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(25deg);background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:4px 12px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);}' +
            '.lib-card-no-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:230px;min-height:230px;border:1px dashed var(--nc-border);border-radius:6px;background:var(--nc-bg-hover);cursor:pointer;color:var(--reader-accent-lighter);font-size:13px;text-align:center;}' +
            '.lib-card-no-cover .lib-card-no-cover-text{font-weight:500;color:var(--reader-accent-lighter);}' +
            '.lib-card-no-cover .lib-card-no-cover-hint{font-size:11px;opacity:0.6;margin-top:2px;}' +
            '.lib-card-no-cover .lib-card-no-cover-svg{width:120px;height:120px;opacity:0.6}' +
            '.lib-card-no-cover .lib-card-no-cover-name{margin-top:8px;font-size:12px;color:var(--nc-text);word-break:break-word;white-space:normal;text-align:center;max-width:160px;overflow-wrap:break-word;}' +
            '.lib-card-portrait.lib-card-no-cover .lib-card-icon{border:1px dashed var(--nc-border);}' +
            '.lib-cover-file-row{cursor:pointer;}' +
            '.lib-cover-file-row:hover{background:var(--reader-accent-bg)}' +
            '.lib-cover-file-row.selected{background:var(--reader-accent-bg)}' +
            '.lib-cover-file-row td{color:var(--nc-text)}' +
            '.lib-settings-btn{position:absolute;bottom:0;left:0;right:0;height:48px;border:none;background:var(--color-background-assistant);border-top:1px solid var(--reader-accent-bg);border-radius:0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--reader-accent);transition:var(--nc-transition);}' +
            '.lib-settings-btn:hover{opacity:1;background:var(--lib-settings-btn-bg);color:var(--reader-accent);}' +
            '.lib-settings-btn svg{width:20px;height:20px;}' +
            '.reader-settings-modal{border-radius:16px;}' +
            '.reader-settings-menu .lib-sidebar-item-like{width:100%;display:flex;align-items:center;gap:8px;padding:12px 16px;text-align:left;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;}' +
            '.reader-settings-menu .lib-sidebar-item-like:hover{background:var(--reader-accent-bg);}' +
            '.reader-settings-item{padding:10px;border:1px solid var(--reader-accent-bg);border-radius:var(--nc-radius);background:var(--lib-settings-btn-bg);margin-bottom:8px;}' +
            '.reader-settings-item-name{font-weight:500;font-size:14px;margin-bottom:4px;color:var(--reader-accent-lighter);word-break:break-word;}' +
            '.reader-settings-item input[type="text"]{width:100%;padding:4px 8px;border:1px solid var(--reader-accent-bg);border-radius:4px;font-size:13px;box-sizing:border-box;background:var(--lib-settings-btn-bg);color:var(--reader-accent-lighter);}' +
            '.reader-settings-translations{display:flex;flex-direction:column;gap:8px;}' +
            '.reader-settings-translations .reader-settings-item .reader-settings-item-name code{font-family:monospace;font-size:12px;background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:3px;}' +
            '.reader-settings-btn-row{display:flex;gap:8px;margin-top:6px;justify-content:flex-end;}' +
            '.reader-settings-btn-small{padding:4px 8px;font-size:12px;border:1px solid var(--reader-accent-bg);border-radius:4px;background:var(--lib-settings-btn-bg);cursor:pointer;transition:var(--nc-transition);}' +
            '.reader-settings-btn-small:hover{background:var(--reader-accent-bg);}' +
            '.reader-settings-btn-primary{background:var(--reader-accent);color:#fff;border-color:var(--reader-accent);}' +
            '.reader-settings-btn-primary:hover{background:var(--reader-accent-hover);}' +
            '.lib-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;}' +
            '.lib-modal-content{background:var(--lib-settings-btn-bg);border-radius:16px;padding:20px;max-width:520px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(124,58,237,0.15);color:var(--nc-text);}' +
            '.lib-modal-header{display:flex;align-items:center;justify-content:space-between;padding:0;}' +
            '.lib-settings-close-btn{background:transparent;border:none;color:var(--reader-accent-light);opacity:0.6;cursor:pointer;font-size:18px;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;transition:var(--nc-transition);}' +
            '.lib-settings-close-btn:hover{opacity:1;background:var(--reader-accent-bg);color:var(--reader-accent);}' +
            '.reader-settings-menu-item{display:flex;align-items:center;gap:8px;padding:12px 16px;text-align:left;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;-webkit-touch-callout:none;transition:var(--nc-transition);}' +
            '.reader-settings-menu-item:hover{background:var(--reader-accent-bg);color:var(--reader-accent);}' +
            '.reader-settings-menu-item .reader-settings-icon{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;}' +
            '.reader-settings-menu-item .reader-settings-chevron{margin-left:auto;opacity:0.5;transition:transform 180ms ease;}' +
            '.reader-settings-general-item{display:flex;align-items:center;gap:8px;padding:12px 16px;text-align:left;cursor:pointer;border:1px solid var(--reader-accent-bg);border-radius:6px;background:var(--lib-settings-btn-bg);font-size:13px;transition:var(--nc-transition);}' +
            '.reader-settings-general-item:hover{background:var(--reader-accent-bg);color:var(--reader-accent);}' +
            '.reader-settings-general-item .reader-settings-chevron{margin-left:auto;opacity:0.5;}' +
            '#lib-reader-settings-content::-webkit-scrollbar{width:6px}' +
            '#lib-reader-settings-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '#lib-reader-settings-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '#lib-reader-settings-content{scrollbar-color:var(--lib-nav-accent) transparent}' +
            '#lib-folder-content::-webkit-scrollbar{width:6px}' +
            '#lib-folder-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '#lib-folder-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '#lib-folder-content{scrollbar-color:var(--lib-nav-accent) transparent}' +
            '#reader-scan-content::-webkit-scrollbar{width:6px}' +
            '#reader-scan-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '#reader-scan-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '#reader-scan-content{scrollbar-color:var(--lib-nav-accent) transparent}' +
            '.lib-loading-overlay{position:fixed;inset:0;background:var(--color-background-assistant);opacity:0.8;z-index:99998;display:flex;align-items:center;justify-content:center;pointer-events:auto;}' +
            '.lib-loading-spinner{width:48px;height:48px;border:4px solid rgba(124,58,237,0.2);border-top-color:var(--nc-blue,#7c3aed);border-radius:50%;animation:renamer-spin 0.8s linear infinite;}'
;
        if (typeof cssVars !== 'undefined') {}
        document.head.appendChild(style);
    }

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
        state.readerSequels = buildReaderSequels();
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

    function loadLibraries(cb) {
        state.covers = {};
        state.coversLoaded = false;
        state.collectionsByLib = {};
        state.allCollections = {};
        state.loadingLibraries = true;
        apiRequest(getBaseUrl() + '/api/reader/libraries').then(function (data) {
            state.loadingLibraries = false;
            dbg('loadLibraries ok', { count: (data && data.libraries ? data.libraries.length : 0), view: state.view });
            if (data && data.success) {
                state.libraries = data.libraries || [];
            } else {
                state.libraries = [];
            }
            loadAllCollections(function () {
                renderSidebar();
                renderBreadcrumb();
                if (state.view === 'libraries' || state.view === 'home') {
                    renderLibrariesContent();
                }
                if (typeof cb === 'function') cb();
            });
        }).catch(function (err) {
            state.loadingLibraries = false;
            showToast(t('scanError') + ' : ' + (err && err.message ? err.message : err), 'error');
            if (state.view === 'libraries') renderLibrariesContent();
            if (typeof cb === 'function') cb();
        });
    }

    function loadCollections(libraryId, cb) {
        dbg('loadCollections start', { libraryId: libraryId });
        apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + libraryId).then(function (data) {
            dbg('loadCollections done', { libraryId: libraryId, count: (data && data.collections ? data.collections.length : 0) });
            if (data && data.success) {
                state.collections = data.collections || [];
            } else {
                state.collections = [];
            }
            state.collections.forEach(function (c) {
                if (c && c.rules) enrichFileEntries(c.rules);
            });
            state.collectionsByLib[libraryId] = (state.collections || []).slice();
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.collections = [];
            state.collectionsByLib[libraryId] = [];
            if (typeof cb === 'function') cb();
        });
    }

    function loadAllFilesForLibrary(lib, cb) {
        dbg('loadAllFilesForLibrary start', { libraryId: lib && lib.id });
        var paths = Array.isArray(lib.paths) ? lib.paths : (lib.description ? [lib.description] : []);
        var allFiles = [];
        var pending = paths.length;
        if (!pending) {
            state.flatFiles = [];
            state.flatFilesByExt = {};
            if (typeof cb === 'function') cb();
            return;
        }
        paths.forEach(function (folder) {
            apiRequest(getBaseUrl() + '/api/reader/scan', {
                method: 'POST',
                body: JSON.stringify({ path: folder, recursive: true })
            }).then(function (data) {
                if (data && data.success) {
                    var files = data.files || [];
                    files.forEach(function (f) {
                        var ext = fileExt(f);
                        if (DOC_EXT.indexOf(ext) === -1) return;
                        allFiles.push(f);
                        state.flatFilesByExt = state.flatFilesByExt || {};
                        state.flatFilesByExt[ext] = (state.flatFilesByExt[ext] || 0) + 1;
                    });
                }
                pending--;
                if (pending <= 0) {
                    state.flatFiles = allFiles;
                    if (typeof cb === 'function') cb();
                }
            }).catch(function () {
                pending--;
                if (pending <= 0) {
                    state.flatFiles = allFiles;
                    if (typeof cb === 'function') cb();
                }
            });
        });
    }

     function loadBookmarks() {
         var paths = [];
         if (state.collections) {
             state.collections.forEach(function (c) {
                 var files = collectAllFiles(c.rules || {});
                 files.forEach(function (f) { paths.push(f.path); });
             });
         }
        if (!paths.length) { renderLibrariesContent(); return; }
        apiRequest(getBaseUrl() + '/api/reader/progress/read', {
            method: 'POST',
            body: JSON.stringify({ paths: paths })
        }).then(function (data) {
            if (data && data.success && data.progress) {
                state.bookmarks = {};
                Object.keys(data.progress).forEach(function(k) {
                    state.bookmarks['/' + k] = data.progress[k];
                });
            } else {
                state.bookmarks = {};
            }
            renderLibrariesContent();
        }).catch(function () {
            state.bookmarks = {};
            renderLibrariesContent();
        });
    }

     function buildNavCtx() {
         if (!state.navCtx) {
             state.navCtx = {
                 t: t,
                 escapeHtml: escapeHtml,
                 getBaseUrl: getBaseUrl,
                 apiRequest: apiRequest,
                 showToast: showToast,
                 state: state,
             };
             state.navCtx.showLoaderInContainer = function() {};
             state.navCtx.hideLoaderInContainer = function() {};
         }
         if (state.navigation) {
             state.navigation.showNavActions = false;
         }
         return state.navCtx;
     }

    function showFolderPicker(callback) {
        console.log('[Library DEBUG] showFolderPicker called');
        if (typeof RenamerNavigation === 'undefined' || !RenamerNavigation) {
            console.warn('[Library DEBUG] RenamerNavigation not available, falling back to prompt dialog');
            RenamerUtils.showPromptDialog(
                t('scanFolderDialog') || 'Sélectionner un dossier',
                t('newLibPlaceholder') || 'ex: BD, Romans, Mangas',
                '',
                function (p) {
                    p = (p || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
                    if (p) {
                        callback(p);
                    } else {
                        callback(null);
                    }
                },
                { dialogId: 'renamer-folder-path-prompt', confirmLabel: t('scanConfirm') || 'Scanner', cancelLabel: t('scanCancel') || 'Annuler' }
            );
            return;
        }

        var nav = RenamerNavigation;
        var ctx = buildNavCtx();

        nav.init(ctx);
        if (!ctx.state.navigation || !ctx.state.navigation.currentPath) {
            nav.setCurrentPath('/');
        }
        nav.invalidateFavoritesCache();

        var existing = document.getElementById('lib-folder-dialog');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-folder-dialog';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10006;display:flex;align-items:center;justify-content:center;';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal';
        dialog.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:0;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);max-width:720px;width:90svw;max-height:85svh;';
        overlay.appendChild(dialog);

        dialog.innerHTML =
            '<div class="renamer-header" style="padding:12px 16px;border-bottom:1px solid var(--nc-border);display:flex;align-items:center;justify-content:space-between;">' +
                '<h3 style="margin:0;font-size:16px;font-weight:600;">' + escapeHtml(t('scanFolderDialog') || 'Sélectionner un dossier à scanner') + '</h3>' +
                '<button type="button" class="renamer-btn-icon renamer-modal-close" aria-label="' + escapeHtml(t('readerClose') || 'Fermer') + '" title="' + escapeHtml(t('readerClose') || 'Fermer') + '" style="font-size:20px;">×</button>' +
            '</div>' +
            '<div id="lib-folder-breadcrumb" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);min-height:32px;"></div>' +
            '<div id="lib-folder-favorites" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);"></div>' +
            '<div id="lib-folder-content" style="flex:1;overflow-y:auto;padding:12px;"></div>' +
            '<div style="padding:12px 16px;border-top:1px solid var(--nc-border);display:flex;justify-content:flex-end;gap:8px;">' +
                '<button type="button" id="lib-folder-cancel" class="renamer-btn">' + escapeHtml(t('scanCancel') || 'Annuler') + '</button>' +
                '<button type="button" id="lib-folder-confirm" class="renamer-btn renamer-btn-primary">' + escapeHtml(t('scanConfirm') || 'Scanner ce dossier') + '</button>' +
            '</div>';

        document.body.appendChild(overlay);

        function closeDialog() {
            if (nav && nav._libFolderListener) {
                nav.removeFolderLoadedListener(nav._libFolderListener);
                nav._libFolderListener = null;
            }
            var el = document.getElementById('lib-folder-dialog');
            if (el) el.remove();
        }

        var closeBtn = dialog.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        var cancelBtn = dialog.querySelector('#lib-folder-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeDialog();
        });
        var escHandler = function(e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        function renderFolderList() {
            var container = document.getElementById('lib-folder-content');
            if (!container) return;

            var folders = (ctx.state.navigation && ctx.state.navigation.folders) ? ctx.state.navigation.folders : [];
            var allFiles = ctx.state.files || [];
            var folderSet = {};
            folders.forEach(function(f) { folderSet[f] = true; });
            var files = allFiles.filter(function(f) { return !folderSet[f]; });

            var html = '<table class="reader-scan-table"><tbody>';

            if (folders.length > 0) {
                html += '<tr><td style="padding:0;height:8px;"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('subfolders') || 'Sous-dossiers') + '</div></td></tr>';
                folders.forEach(function(folderPath) {
                    var parts = folderPath.split('/').filter(Boolean);
                    var folderName = parts.length ? parts[parts.length - 1] : (folderPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : folderPath);
                    html += '<tr class="navigation-folder-row reader-scan-folder-row" data-folder-path="' + escapeHtml(folderPath) + '" style="cursor:pointer;">';
                    html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">📁</td>';
                    html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + escapeHtml(folderName) + '</span></td>';
                    html += '</tr>';
                });
            }

            if (files.length > 0) {
                html += '<tr><td style="padding:0;height:8px;"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('scanFiles') || 'Fichiers') + '</div></td></tr>';
                files.forEach(function(filePath) {
                    var baseName = filePath.split('/').pop() || filePath;
                    var ext = baseName.split('.').pop().toLowerCase();
                    var icon = '📄';
                    if (['pdf', 'cbz', 'epub', 'cbr'].indexOf(ext) !== -1) icon = '📚';
                    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) icon = '🖼';
                    html += '<tr class="reader-scan-file-row">';
                    html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">' + icon + '</td>';
                    html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + escapeHtml(baseName) + '</span></td>';
                    html += '</tr>';
                });
            }

            if (!folders.length && !files.length) {
                html += '<tr><td><div class="reader-scan-empty">' + escapeHtml(t('noResults') || 'Aucun élément trouvé') + '</div></td></tr>';
            }

            html += '</tbody></table>';
            container.innerHTML = html;
            nav.bindFolderRow(container);
        }

         var favoritesRenderGen = 0;

         function renderFavorites() {
             var container = document.getElementById('lib-folder-favorites');
             if (!container) return;

             var gen = (favoritesRenderGen = favoritesRenderGen + 1);

             var heading = document.createElement('div');
             heading.style.cssText = 'font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;';
             heading.textContent = t('navFavorites') || 'Favoris';
             container.innerHTML = '';
             container.appendChild(heading);

             nav.loadFavorites().then(function(favorites) {
                 if (!container.parentNode || favoritesRenderGen !== gen) return;
                 container.innerHTML = '';
                 container.appendChild(heading);
                 var list = document.createElement('div');
                 list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
                 if (!favorites || !favorites.length) {
                     var empty = document.createElement('div');
                     empty.style.cssText = 'opacity:0.5;font-size:12px;';
                     empty.textContent = t('navNoFavorites') || 'Aucun favori';
                     list.appendChild(empty);
                 } else {
                     favorites.forEach(function(favPath) {
                         var parts = favPath.split('/').filter(Boolean);
                         var folderName = parts.length ? parts[parts.length - 1] : (favPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : favPath);
                         var item = document.createElement('div');
                         item.className = 'reader-scan-favorites-item';
                         item.title = favPath;
                         item.innerHTML = '<span class="reader-scan-favorites-star">★</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(folderName) + '</span>';
                         item.addEventListener('click', function(e) {
                             e.stopPropagation();
                             nav.navigateToFolder(favPath);
                         });
                         list.appendChild(item);
                     });
                 }
                 container.appendChild(list);
             }).catch(function() {
                 if (!container.parentNode || favoritesRenderGen !== gen) return;
                 container.innerHTML = '';
                 container.appendChild(heading);
                 var errDiv = document.createElement('div');
                 errDiv.style.cssText = 'opacity:0.5;font-size:12px;';
                 errDiv.textContent = t('networkError') || 'Erreur réseau';
                 container.appendChild(errDiv);
             });
         }

        nav._libFolderListener = function() {
            if (!document.getElementById('lib-folder-breadcrumb')) return;
            nav.renderBreadcrumb('lib-folder-breadcrumb');
            renderFolderList();
            renderFavorites();
        };
        nav.addFolderLoadedListener(nav._libFolderListener);

        nav.renderBreadcrumb('lib-folder-breadcrumb');

        var contentEl = document.getElementById('lib-folder-content');
        if (contentEl) {
            contentEl.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.5;font-size:13px;">' + escapeHtml(t('loading') || 'Chargement…') + '</div>';
        }

        renderFavorites();
        nav.loadFolderContent(nav.getCurrentPath());

        var confirmBtn = dialog.querySelector('#lib-folder-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = function() {
                var path = nav.getCurrentPath();
                var el = document.getElementById('lib-folder-dialog');
                if (el) el.remove();
                if (nav && nav._libFolderListener) {
                    nav.removeFolderLoadedListener(nav._libFolderListener);
                    nav._libFolderListener = null;
                }
                callback(path);
            };
        }
    }

    function pickCoverForTome(f) {
        if (!f || !f.path) return;
        showImagePicker(function (imgPath) {
            if (!imgPath) return;
            apiRequest(getBaseUrl() + '/api/covers/set-override', {
                method: 'POST',
                body: JSON.stringify({ sourcePath: f.path, imagePath: imgPath, width: 300 })
            }).then(function (data) {
                if (data && data.success && data.coverUrl) {
                    state.covers[f.path] = data.coverUrl;
                    render();
                    showToast(t('coverSet'), 'info');
                } else {
                    showToast(t('coverSetError'), 'error');
                }
            }).catch(function () {
                showToast(t('coverSetError'), 'error');
            });
        });
    }

    function showImagePicker(callback) {
        if (typeof RenamerNavigation === 'undefined' || !RenamerNavigation) {
            console.warn('[Library DEBUG] RenamerNavigation not available for image picker');
            RenamerUtils.showPromptDialog(
                t('selectCoverTitle') || 'Sélectionner une image de couverture',
                t('selectCoverHint') || 'ex: cover.jpg',
                '',
                function (p) {
                    p = (p || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
                    if (p) {
                        callback(p);
                    } else {
                        callback(null);
                    }
                },
                { dialogId: 'renamer-image-path-prompt', confirmLabel: t('coverSelect'), cancelLabel: t('cancel') }
            );
            return;
        }

        var nav = RenamerNavigation;
        var ctx = buildNavCtx();

        nav.init(ctx);
        if (!ctx.state.navigation || !ctx.state.navigation.currentPath) {
            nav.setCurrentPath('/');
        }
        nav.invalidateFavoritesCache();

        var existing = document.getElementById('lib-image-dialog');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-image-dialog';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10008;display:flex;align-items:center;justify-content:center;';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal';
        dialog.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:0;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);max-width:720px;width:90svw;max-height:85svh;';
        overlay.appendChild(dialog);

        var IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        var selectedPath = null;

        dialog.innerHTML =
            '<div class="renamer-header" style="padding:12px 16px;border-bottom:1px solid var(--nc-border);display:flex;align-items:center;justify-content:space-between;">' +
                '<h3 style="margin:0;font-size:16px;font-weight:600;">' + escapeHtml(t('selectCoverTitle')) + '</h3>' +
                '<button type="button" class="renamer-btn-icon renamer-modal-close" aria-label="' + escapeHtml(t('readerClose')) + '" title="' + escapeHtml(t('readerClose')) + '" style="font-size:20px;">×</button>' +
            '</div>' +
            '<div id="lib-image-breadcrumb" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);min-height:32px;"></div>' +
            '<div id="lib-image-favorites" style="padding:8px 16px;border-bottom:1px solid var(--nc-border);"></div>' +
            '<div id="lib-image-content" style="flex:1;overflow-y:auto;padding:12px;"></div>' +
            '<div style="padding:12px 16px;border-top:1px solid var(--nc-border);display:flex;justify-content:flex-end;gap:8px;">' +
                '<button type="button" id="lib-image-cancel" class="renamer-btn">' + escapeHtml(t('cancel')) + '</button>' +
                '<button type="button" id="lib-image-confirm" class="renamer-btn renamer-btn-primary" disabled>' + escapeHtml(t('coverSelect')) + '</button>' +
            '</div>';

        document.body.appendChild(overlay);

        function closeDialog() {
            if (nav && nav._libImageListener) {
                nav.removeFolderLoadedListener(nav._libImageListener);
                nav._libImageListener = null;
            }
            var el = document.getElementById('lib-image-dialog');
            if (el) el.remove();
        }

        var closeBtn = dialog.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        var cancelBtn = dialog.querySelector('#lib-image-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeDialog();
        });
        var escHandler = function (e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeDialog();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        function updateConfirmState() {
            var confirmBtn = document.getElementById('lib-image-confirm');
            if (confirmBtn) confirmBtn.disabled = !selectedPath;
        }

        function selectFile(path) {
            selectedPath = path;
            updateConfirmState();
            var container = document.getElementById('lib-image-content');
            if (container) {
                container.querySelectorAll('.lib-cover-file-row').forEach(function (r) {
                    r.classList.remove('selected');
                });
                var row = container.querySelector('[data-file-path="' + escapeHtml(path) + '"]');
                if (row) row.classList.add('selected');
            }
        }

        function renderFolderList() {
            var container = document.getElementById('lib-image-content');
            if (!container) return;
            var folders = (ctx.state.navigation && ctx.state.navigation.folders) ? ctx.state.navigation.folders : [];
            var allFiles = ctx.state.files || [];
            var folderSet = {};
            folders.forEach(function (f) { folderSet[f] = true; });
            var files = allFiles.filter(function (f) { return !folderSet[f]; });
            files = files.filter(function (filePath) {
                var base = filePath.split('/').pop() || filePath;
                var ext = base.split('.').pop().toLowerCase();
                return IMAGE_EXTS.indexOf(ext) !== -1;
            });

            var html = '<table class="reader-scan-table"><tbody>';
            if (folders.length > 0) {
                html += '<tr><td style="padding:0;height:8px;"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('subfolders') || 'Sous-dossiers') + '</div></td></tr>';
                folders.forEach(function (folderPath) {
                    var parts = folderPath.split('/').filter(Boolean);
                    var folderName = parts.length ? parts[parts.length - 1] : (folderPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : folderPath);
                    html += '<tr class="navigation-folder-row reader-scan-folder-row" data-folder-path="' + escapeHtml(folderPath) + '" style="cursor:pointer;">';
                    html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">📁</td>';
                    html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + escapeHtml(folderName) + '</span></td>';
                    html += '</tr>';
                });
            }
            if (files.length > 0) {
                html += '<tr><td style="padding:0;height:8px;"></td></tr>';
                html += '<tr class="reader-scan-section-tr"><td><div class="reader-scan-section-title">' + escapeHtml(t('images') || 'Images') + '</div></td></tr>';
                files.forEach(function (filePath) {
                    var baseName = filePath.split('/').pop() || filePath;
                    var isSelected = (filePath === selectedPath);
                    html += '<tr class="reader-scan-file-row lib-cover-file-row' + (isSelected ? ' selected' : '') + '" data-file-path="' + escapeHtml(filePath) + '">';
                    html += '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">🖼</td>';
                    html += '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + escapeHtml(baseName) + '</span></td>';
                    html += '</tr>';
                });
            }
            if (!folders.length && !files.length) {
                html += '<tr><td><div class="reader-scan-empty">' + escapeHtml(t('noResults') || 'Aucun élément trouvé') + '</div></td></tr>';
            }
            html += '</tbody></table>';
            container.innerHTML = html;
            nav.bindFolderRow(container);
            container.querySelectorAll('.lib-cover-file-row').forEach(function (row) {
                if (row._boundImage) return;
                row._boundImage = true;
                row.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    selectFile(row.getAttribute('data-file-path'));
                });
            });
            updateConfirmState();
        }

        function renderFavorites() {
            var container = document.getElementById('lib-image-favorites');
            if (!container) return;
            var heading = document.createElement('div');
            heading.style.cssText = 'font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;';
            heading.textContent = t('navFavorites') || 'Favoris';
            container.innerHTML = '';
            container.appendChild(heading);
            nav.loadFavorites().then(function (favorites) {
                if (!container.parentNode) return;
                container.innerHTML = '';
                container.appendChild(heading);
                var list = document.createElement('div');
                list.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
                if (!favorites || !favorites.length) {
                    var empty = document.createElement('div');
                    empty.style.cssText = 'opacity:0.5;font-size:12px;';
                    empty.textContent = t('navNoFavorites') || 'Aucun favori';
                    list.appendChild(empty);
                } else {
                    favorites.forEach(function (favPath) {
                        var parts = favPath.split('/').filter(Boolean);
                        var folderName = parts.length ? parts[parts.length - 1] : (favPath === '/' ? (t('navigationBreadcrumbRoot') || 'Racine') : favPath);
                        var item = document.createElement('div');
                        item.className = 'reader-scan-favorites-item';
                        item.title = favPath;
                        item.innerHTML = '<span class="reader-scan-favorites-star">★</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(folderName) + '</span>';
                        item.addEventListener('click', function (e) {
                            e.stopPropagation();
                            nav.navigateToFolder(favPath);
                        });
                        list.appendChild(item);
                    });
                }
                container.appendChild(list);
            }).catch(function () {
                if (!container.parentNode) return;
                container.innerHTML = '';
                container.appendChild(heading);
                var errDiv = document.createElement('div');
                errDiv.style.cssText = 'opacity:0.5;font-size:12px;';
                errDiv.textContent = t('networkError') || 'Erreur réseau';
                container.appendChild(errDiv);
            });
        }

        nav._libImageListener = function () {
            if (!document.getElementById('lib-image-breadcrumb')) return;
            nav.renderBreadcrumb('lib-image-breadcrumb');
            renderFolderList();
            renderFavorites();
        };
        nav.addFolderLoadedListener(nav._libImageListener);

        nav.renderBreadcrumb('lib-image-breadcrumb');

        var contentEl = document.getElementById('lib-image-content');
        if (contentEl) {
            contentEl.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.5;font-size:13px;">' + escapeHtml(t('loading') || 'Chargement…') + '</div>';
        }

        renderFavorites();
        nav.loadFolderContent(nav.getCurrentPath());

        var confirmBtn = dialog.querySelector('#lib-image-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = function () {
                var path = selectedPath;
                var el = document.getElementById('lib-image-dialog');
                if (el) el.remove();
                if (nav && nav._libImageListener) {
                    nav.removeFolderLoadedListener(nav._libImageListener);
                    nav._libImageListener = null;
                }
                callback(path || null);
            };
        }
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

    function showLibraryTypePicker(name, folder, cb) {
        var existing = document.getElementById('lib-type-picker-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'lib-type-picker-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10006;display:flex;align-items:center;justify-content:center;';

        var dialog = document.createElement('div');
        dialog.className = 'renamer-modal';
        dialog.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:0;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);max-width:520px;width:90svw;max-height:85svh;';
        overlay.appendChild(dialog);

        var header = document.createElement('div');
        header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--nc-border);display:flex;align-items:center;justify-content:space-between;';
        header.innerHTML =
            '<h3 style="margin:0;font-size:16px;font-weight:600;">' + escapeHtml(t('newLibTypePrompt')) + '</h3>' +
            '<button type="button" class="renamer-btn-icon renamer-modal-close" aria-label="' + escapeHtml(t('readerClose') || 'Fermer') + '" title="' + escapeHtml(t('readerClose') || 'Fermer') + '" style="font-size:20px;">×</button>';
        dialog.appendChild(header);

        var body = document.createElement('div');
        body.style.cssText = 'padding:16px 20px;display:flex;flex-direction:column;gap:12px;';

        var info = document.createElement('div');
        info.style.cssText = 'font-size:13px;opacity:0.7;color:var(--nc-text);';
        info.textContent = (name || '') + ' → ' + (folder || '');
        body.appendChild(info);

        var options = [
            { type: 'flat', label: t('libTypeFlat'), icon: '📚', hint: t('libTypeFlatHint'), enabled: true },
            { type: 'tomes', label: t('libTypeTomes'), icon: '📚', hint: t('libTypeTomesHint'), enabled: true },
            { type: 'audio', label: t('libTypeAudio'), icon: '🎧', hint: t('libTypeAudioHint'), enabled: false },
        ];

        var selected = 'tomes';
        var optionEls = [];

        options.forEach(function (opt) {
            var optDiv = document.createElement('div');
            optDiv.style.cssText = 'border:2px solid var(--nc-border);border-radius:var(--nc-radius);padding:12px;cursor:' + (opt.enabled ? 'pointer' : 'not-allowed') + ';opacity:' + (opt.enabled ? '1' : '0.5');
            optDiv.innerHTML =
                '<div style="display:flex;align-items:center;gap:12px;">' +
                    '<span style="font-size:20px;">' + opt.icon + '</span>' +
                    '<div style="flex:1;">' +
                        '<div style="font-weight:600;font-size:14px;">' + escapeHtml(opt.label) + '</div>' +
                        '<div style="font-size:12px;opacity:0.7;">' + escapeHtml(opt.hint) + '</div>' +
                    '</div>' +
                    (opt.enabled
                        ? '<div style="width:20px;height:20px;border:2px solid var(--nc-border);border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;border-radius:50%;background:' + (opt.type === selected ? 'var(--reader-accent)' : 'transparent') + ';"></div></div>'
                        : '<div title="' + escapeHtml(t('libTypeAudioSoon')) + '" style="width:20px;height:20px;">ⓘ</div>') +
                '</div>';
            if (opt.enabled) {
                optDiv.addEventListener('click', function () {
                    selected = opt.type;
                    optionEls.forEach(function (el, i) {
                        var dots = el.querySelectorAll('div[style*="border:2px solid var(--nc-border);border-radius:50%"] > div');
                        if (options[i].type === selected) {
                            dots.forEach(function (d) { d.style.background = 'var(--reader-accent)'; });
                        } else {
                            dots.forEach(function (d) { d.style.background = 'transparent'; });
                        }
                    });
                });
            }
            optionEls.push(optDiv);
            body.appendChild(optDiv);
        });

        dialog.appendChild(body);

        var footer = document.createElement('div');
        footer.style.cssText = 'padding:12px 20px;border-top:1px solid var(--nc-border);display:flex;justify-content:flex-end;gap:8px;';
        footer.innerHTML =
            '<button type="button" class="renamer-btn renamer-modal-close">' + escapeHtml(t('scanCancel') || 'Annuler') + '</button>' +
            '<button type="button" id="lib-type-confirm" class="renamer-btn renamer-btn-primary">' + escapeHtml(t('libTypeConfirm')) + '</button>';
        dialog.appendChild(footer);

        document.body.appendChild(overlay);

        function closePicker() {
            var el = document.getElementById('lib-type-picker-overlay');
            if (el) el.remove();
        }

        var closeBtn = header.querySelector('.renamer-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closePicker);
        var cancelBtn = footer.querySelector('.renamer-modal-close');
        if (cancelBtn) cancelBtn.addEventListener('click', closePicker);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closePicker();
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closePicker();
                document.removeEventListener('keydown', escHandler);
            }
        });

        var confirmBtn = footer.querySelector('#lib-type-confirm');
        confirmBtn.addEventListener('click', function () {
            closePicker();
            cb({ name: name, folder: folder, type: selected });
        });

        var audioOpt = options[2];
        if (!audioOpt.enabled && audioOpt.type === 'audio') {
            // Le bouton audio reste désactivé; le tooltip "Fonctionnalité à venir" s'affiche au survol.
        }
    }

    function createLibrary(rootFolder, name, libraryType) {
        libraryType = libraryType || 'tomes';
        showToast(t('scanInProgress') + ' ' + rootFolder, 'info');
        apiRequest(getBaseUrl() + '/api/reader/scan', {
            method: 'POST',
            body: JSON.stringify({ path: rootFolder, recursive: true }),
        }).then(function (data) {
            if (!data || !data.success) {
                showToast(t('scanError'), 'error');
                return;
            }
            var files = data.files || [];
            var classified;
            if (libraryType === 'flat') {
                classified = classifyScanFlat(files, rootFolder);
            } else {
                classified = classifyScan(files, rootFolder);
            }

            var colNames;
            if (libraryType === 'flat') {
                colNames = [classified.rootBase.name];
                classified = { [colNames[0]]: classified.rootBase };
            } else {
                colNames = Object.keys(classified);
            }

            if (colNames.length === 0) {
                showToast(t('noResults'), 'info');
                return;
            }
            apiRequest(getBaseUrl() + '/api/reader/libraries', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    description: rootFolder,
                    paths: [rootFolder],
                    libraryType: libraryType,
                }),
            }).then(function (ldata) {
                if (!ldata || !ldata.success) {
                    showToast(t('scanError'), 'error');
                    return;
                }
                var libId = ldata.library.id;
                var pending = colNames.length;
                var created = 0;
                var onEach = function () {
                    created++;
                    if (created >= pending) {
                        showToast(t('scanComplete') + ' — ' + files.length + ' ' + t('documents'), 'info');
                        state.view = 'libraries';
                        loadLibraries();
                    }
                };
                colNames.forEach(function (colName) {
                    var col = classified[colName];
                    var strippedRules = stripRulesForBackend({ folder: col.folder, files: col.files, children: col.children || [] });
                    apiRequest(getBaseUrl() + '/api/reader/collections', {
                        method: 'POST',
                        body: JSON.stringify({
                            libraryId: libId,
                            name: colName,
                            description: '',
                            rules: strippedRules,
                        }),
                    }).then(function () { onEach(); }).catch(function (err) {
                        var msg = (err && err.message) ? err.message : String(err);
                        showToast(t('scanError') + ' : ' + msg, 'error');
                        onEach();
                    });
                });
            }).catch(function () {
                showToast(t('scanError'), 'error');
            });
        }).catch(function (err) {
            showToast(t('scanError'), 'error');
        });
    }

    function addLibrary() {
        if (!state.isAdmin) {
            showToast(t('readOnlyHint'), 'info');
            return;
        }
        showFolderPicker(function (rootFolder) {
            if (!rootFolder) {
                showToast(t('scanCancelled'), 'info');
                return;
            }
            RenamerUtils.showPromptDialog(t('newLibPrompt'), '', '', function (name) {
                if (!name || !name.trim()) {
                    showToast(t('scanCancelled'), 'info');
                    return;
                }
                showLibraryTypePicker(name.trim(), rootFolder, function (opts) {
                    createLibrary(opts.folder, opts.name, opts.type);
                });
            }, { dialogId: 'renamer-add-lib-prompt', confirmLabel: t('scanConfirm') || 'Scanner', cancelLabel: t('scanCancel') || 'Annuler' });
        });
    }

    function renderReading(tome) {
        state.view = 'reading';
        var key = tome.path;
        state.currentTome = { path: key, name: tome.name, tome: tome.tome };
        if (state.currentCollection && state.currentCollection.userId) {
            state.ownerUid = state.currentCollection.userId;
        } else if (state.currentLibrary && state.currentLibrary.userId) {
            state.ownerUid = state.currentLibrary.userId;
        } else {
            state.ownerUid = null;
        }
        var isEpubLike = /\.(epub|azw|azw3|mobi|prc)$/i.test(String(key));
        if (!isEpubLike && state.domCache[key]) {
            closeModalOverlay();
            var cached = state.domCache[key];
            cached.style.display = 'flex';
            document.body.appendChild(cached);
            state.readerModal = cached;
            return;
        }

        var existing = document.getElementById('lib-reader-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'lib-reader-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;height:100dvh;width:100dvw;background:#000;display:flex;flex-direction:column;';

        var wrapper = document.createElement('div');
        wrapper.className = 'lib-reading-wrapper';
        wrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;height:100%;';
        overlay.appendChild(wrapper);

        var readerBox = document.createElement('div');
        readerBox.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;height:100%;';
        wrapper.appendChild(readerBox);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeReaderModal();
        });

        var activeKeyHandler = null;
        activeKeyHandler = function(e) {
            if (!document.getElementById('lib-reader-overlay')) {
                document.removeEventListener('keydown', activeKeyHandler);
                return;
            }
            if (e.key === 'Escape') {
                closeReaderModal();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                var el = document.getElementById('lib-reader-overlay');
                if (el) {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (typeof el.requestFullscreen === 'function') {
                        el.requestFullscreen().catch(function() {});
                    }
                }
            }
        };
        document.addEventListener('keydown', activeKeyHandler);

        state.readerModal = overlay;

        if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderReader === 'function') {
            var ctx = buildCtx();
            window.RenamerReader.renderReader(ctx, tome.path, readerBox).catch(function (e) {
                showToast(t('readError') + (e && e.message ? (': ' + e.message) : ''), 'error');
            });
        } else {
            readerBox.innerHTML = '<div style="color:#fff;text-align:center;">' + t('unsupported') + '</div>';
        }

        document.body.appendChild(overlay);
        if (!isEpubLike) { state.domCache[key] = overlay; }
        state.readerModal = overlay;
    }

    function renderReadingImages(node, collection) {
        var key = node.folder;
        state.view = 'reading';
        state.readerImageTomeWasRoot = (state.readerTreePath || []).length === 0;
        state.readerImageTome = {
            folder: node.folder,
            name: node.name,
            files: node.files || [],
            exitTreePath: (state.readerTreePath || []).slice(0, -1)
        };
        state.currentTome = { path: key, name: node.name, tome: 0 };
        if (state.currentCollection && state.currentCollection.userId) {
            state.ownerUid = state.currentCollection.userId;
        } else if (state.currentLibrary && state.currentLibrary.userId) {
            state.ownerUid = state.currentLibrary.userId;
        } else {
            state.ownerUid = null;
        }
        var treePathStr = state.readerTreePath.length ? state.readerTreePath.join('.') : null;
        updateUrl({
            view: 'reading',
            library: state.currentLibrary ? String(state.currentLibrary.id) : null,
            collection: state.currentCollection ? String(state.currentCollection.id) : null,
            node: treePathStr,
            read: node.folder
        });

        if (state.domCache[key]) {
            closeModalOverlay();
            var cached = state.domCache[key];
            cached.style.display = 'flex';
            document.body.appendChild(cached);
            state.readerModal = cached;
            return;
        }

        var existing = document.getElementById('lib-reader-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'lib-reader-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;height:100dvh;width:100dvw;background:#000;display:flex;flex-direction:column;';

        var wrapper = document.createElement('div');
        wrapper.className = 'lib-reading-wrapper';
        wrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;height:100%;';
        overlay.appendChild(wrapper);

        var readerBox = document.createElement('div');
        readerBox.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;height:100%;';
        wrapper.appendChild(readerBox);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeReaderModal();
        });

        var activeKeyHandler = null;
        activeKeyHandler = function(e) {
            if (!document.getElementById('lib-reader-overlay')) {
                document.removeEventListener('keydown', activeKeyHandler);
                return;
            }
            if (e.key === 'Escape') {
                closeReaderModal();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                var el = document.getElementById('lib-reader-overlay');
                if (el) {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (typeof el.requestFullscreen === 'function') {
                        el.requestFullscreen().catch(function() {});
                    }
                }
            }
        };
        document.addEventListener('keydown', activeKeyHandler);

        state.readerModal = overlay;

        if (typeof window.RenamerReader !== 'undefined' && typeof window.RenamerReader.renderMultiImage === 'function') {
            var ctx = buildCtx();
            window.RenamerReader.renderMultiImage(ctx, node.folder, node.files, readerBox).catch(function (e) {
                showToast(t('readError') + (e && e.message ? (': ' + e.message) : ''), 'error');
            });
        } else {
            readerBox.innerHTML = '<div style="color:#fff;text-align:center;">' + t('unsupported') + '</div>';
        }

        document.body.appendChild(overlay);
        state.domCache[key] = overlay;
        state.readerModal = overlay;
    }

    function killReaderInactivityTimer(overlay) {
        if (!overlay) return;
        var readerBox = overlay.querySelector('.lib-reading-wrapper > div');
        if (readerBox && readerBox._readerUIInstance && typeof readerBox._readerUIInstance.killInactivityTimer === 'function') {
            try { readerBox._readerUIInstance.killInactivityTimer(); } catch (e) {}
        }
    }

    function closeReaderModal() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
            killReaderInactivityTimer(overlay);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                var ipad = window.RenamerIPadOS;
                if (ipad && ipad.isCSSFullscreen(overlay)) {
                    ipad.exitCSSFullscreen(overlay);
                }
            }
            overlay.remove();
        }
        state.readerModal = null;

        var wasImageTome = state.readerImageTome;
        var wasRoot = state.readerImageTomeWasRoot;
        if (wasImageTome) {
            state.readerImageTome = null;
            state.readerImageTomeWasRoot = false;
        }

        if (state.view === 'reading') {
            if (wasImageTome) {
                var exitPath = wasImageTome.exitTreePath || [];
                state.readerTreePath = exitPath;
                state.view = 'tomes';
                state.currentTome = null;
                renderSidebar();
                renderBreadcrumb();
                if (exitPath.length === 0 && !wasRoot) {
                    var params = { view: 'tomes' };
                    if (state.currentLibrary) params.library = String(state.currentLibrary.id);
                    if (state.currentCollection) params.collection = String(state.currentCollection.id);
                    params.node = null;
                    updateUrl(params);
                    if (state.currentCollection) {
                        renderTomes(state.currentCollection);
                    }
                } else if (wasRoot) {
                    state.view = 'collection';
                     updateUrl({ view: 'collection', library: state.currentLibrary ? String(state.currentLibrary.id) : null });
                    if (state.currentLibrary) {
                        renderCollections(state.currentLibrary);
                    }
                } else {
                    var params2 = { view: 'tomes' };
                    if (state.currentLibrary) params2.library = String(state.currentLibrary.id);
                    if (state.currentCollection) params2.collection = String(state.currentCollection.id);
                    params2.node = exitPath.length ? exitPath.join('.') : null;
                    updateUrl(params2);
                    if (state.currentCollection) {
                        renderTomes(state.currentCollection);
                    }
                }
                return;
            }
            var params = { view: 'tomes' };
            if (state.currentLibrary) params.library = String(state.currentLibrary.id);
            if (state.currentCollection) params.collection = String(state.currentCollection.id);
            params.read = null;
            var nodePath = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
            params.node = nodePath;
            updateUrl(params);
            state.view = 'tomes';
            state.currentTome = null;
            renderSidebar();
            renderBreadcrumb();
        }
    }

    function closeModalOverlay() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
            killReaderInactivityTimer(overlay);
            var ipad = window.RenamerIPadOS;
            if (ipad && document.body.classList.contains('renamer-ipados-fullscreen')) {
                ipad.exitCSSFullscreen(null);
            }
            overlay.remove();
        }
        state.readerModal = null;
    }

    function renderFlatCollection(collection, node) {
        dbg('renderFlatCollection', { collection: collection && collection.id });
        renderSidebar();
        renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;

        var flatData = flattenFilesAndSubCollections(node);
        var allFiles = flatData.files || [];
        var subCollections = flatData.subCollections || [];
        var subCollectionIndices = flatData.childIndices || [];

        var extGroup = {};
        allFiles.forEach(function (f) {
            var ext = fileExt(f);
            if (!extGroup[ext]) extGroup[ext] = 0;
            extGroup[ext]++;
        });

        function renderCollectionBody(filesToRender, nodesToRender, nodeIndices) {
            container.innerHTML = '';

            var toggleWrapper = document.createElement('div');
            toggleWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);';
            var toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'lib-filter-btn';
            toggleBtn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--reader-accent-bg);color:var(--reader-accent-lighter);font-size:13px;cursor:pointer;white-space:nowrap;';
            toggleBtn.textContent = t('toggleHierarchical');
            toggleBtn.addEventListener('click', function () {
                state.flatCollectionMode = false;
                var nodeParam = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
                updateUrl({ view: 'tomes', library: state.currentLibrary ? String(state.currentLibrary.id) : null, collection: collection ? String(collection.id) : null, node: nodeParam, viewType: 'tree' });
                showLoader();
                render();
                setTimeout(hideLoader, 300);
            });
            toggleWrapper.appendChild(toggleBtn);

            var filterBar = document.createElement('div');
            filterBar.className = 'lib-filter-bar';
            var allExtBtn = document.createElement('button');
            allExtBtn.type = 'button';
            allExtBtn.className = 'lib-filter-btn lib-filter-btn-active';
            allExtBtn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--reader-accent-bg);color:var(--reader-accent-lighter);font-size:13px;cursor:pointer;white-space:nowrap;';
            allExtBtn.textContent = t('filterAll');
            allExtBtn.addEventListener('click', function () {
                renderCollectionBody(allFiles, subCollections, subCollectionIndices);
            });
            filterBar.appendChild(allExtBtn);
            var extFiltersDiv = document.createElement('div');
            extFiltersDiv.className = 'lib-ext-filters';
            Object.keys(extGroup).sort().forEach(function (ext) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'lib-filter-btn';
                btn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);font-size:13px;cursor:pointer;white-space:nowrap;';
                btn.innerHTML = '.' + escapeHtml(ext) + ' <span class="lib-ext-counts">(' + extGroup[ext] + ')</span>';
                btn.addEventListener('click', function () {
                    renderCollectionBody(allFiles.filter(function (f) { return fileExt(f) === ext; }), subCollections, subCollectionIndices);
                });
                extFiltersDiv.appendChild(btn);
            });
            filterBar.appendChild(extFiltersDiv);

            var filterWrapper = document.createElement('div');
            filterWrapper.className = 'lib-filter-wrapper';
            filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
            filterWrapper.appendChild(toggleWrapper);
            filterWrapper.appendChild(filterBar);
            container.appendChild(filterWrapper);

            var grid = document.createElement('div');
            grid.className = 'lib-grid';

            nodesToRender.forEach(function (child, idx) {
                var card = document.createElement('div');
                card.className = 'lib-card';
                var label = child.name || child.folder || (child.path ? child.path.split('/').pop() : '');
                var childFiles = collectAllFiles(child);
                var coverImg = childFiles.length ? coverOfFirstTome(childFiles) : null;
                var cardIcon = coverImg
                    ? '<img class="lib-card-img" src="' + coverImg + '" alt="' + escapeHtml(label) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📁\');this.remove();">'
                    : '<span style="font-size:24px;">📁</span>';
                if (!coverImg) card.classList.add('noPreview');
                card.innerHTML =
                    '<div class="lib-icon">' + cardIcon + '</div>' +
                    '<div class="lib-name" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</div>';
                card.addEventListener('click', function (e) {
                    if (e.target.classList.contains('lib-delete-btn')) return;
                    state.readerTreePath = (state.readerTreePath || []).concat([nodeIndices[idx]]);
                    updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(collection.id), node: state.readerTreePath.join('.'), viewType: 'flat' });
                    render();
                    renderSidebar();
                    renderBreadcrumb();
                });
                grid.appendChild(card);
            });

            filesToRender.forEach(function (f) {
                var card = document.createElement('div');
                card.className = 'lib-card';
                var label = f.name ? f.name.replace(/\.[^.]+$/, '') : f.path;
                var coverImg = coverOfFirstTome([f]);
                var cardIcon = coverImg
                    ? '<img class="lib-card-img" src="' + coverImg + '" alt="' + escapeHtml(label) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + escapeHtml(label.charAt(0) || '📄') + '\');this.remove();">'
                    : '<span style="font-size:24px;">📄</span>';
                if (!coverImg) card.classList.add('noPreview');
                var pageCount = f.pages ? (f.pages + ' ' + t('pages')) : '';
                card.innerHTML =
                    '<div class="lib-icon">' + cardIcon + '</div>' +
                    '<div class="lib-name" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</div>' +
                    (pageCount ? '<div class="lib-meta">' + escapeHtml(pageCount) + '</div>' : '');
                card.addEventListener('click', function (e) {
                    if (e.target.classList.contains('lib-delete-btn')) return;
                    state.view = 'reading';
                    state.currentTome = { path: f.path, name: f.name, tome: 1 };
                    updateUrl({ view: 'reading', library: String(state.currentLibrary.id), collection: String(collection.id), read: f.path });
                    renderReading(f);
                    renderSidebar();
                    renderBreadcrumb();
                });
                grid.appendChild(card);
            });

            if (!filesToRender.length && !nodesToRender.length) {
                var empty = document.createElement('div');
                empty.className = 'lib-empty';
                empty.setAttribute('data-translation', 'noResults');
                empty.textContent = t('noResults');
                container.appendChild(empty);
            } else {
                container.appendChild(grid);
            }
        }

        renderCollectionBody(allFiles, subCollections, subCollectionIndices);
    }

    function flattenFilesAndSubCollections(node, depth) {
        depth = depth || 0;
        if (depth > 10) return { files: [], subCollections: [], childIndices: [] };
        var collectedFiles = (node.files || []).slice();
        var subCollections = [];
        var childIndices = [];
        (node.children || []).forEach(function (child, idx) {
            var childFiles = child.files || [];
            var childChildren = child.children || [];
            if (childChildren.length === 0 && childFiles.length > 0) {
                var isImageCollection = hasOnlyImageFiles(childFiles);
                if (isImageCollection) {
                    subCollections.push(child);
                    childIndices.push(idx);
                } else {
                    collectedFiles = collectedFiles.concat(childFiles);
                }
            } else if (childChildren.length > 0) {
                var expanded = flattenFilesAndSubCollections(child, depth + 1);
                collectedFiles = collectedFiles.concat(expanded.files);
                subCollections = subCollections.concat(expanded.subCollections);
                childIndices = childIndices.concat(expanded.childIndices);
            }
        });
        return { files: collectedFiles, subCollections: subCollections, childIndices: childIndices };
    }


    function renderTomes(collection) {
        dbg('renderTomes', { collection: collection && collection.id, view: state.view });
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';

        var node = getCurrentNode(collection);
        if (!node) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.setAttribute('data-translation', 'noResults');
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }

        if (state.flatCollectionMode) {
            renderFlatCollection(collection, node);
            return;
        }

        var toggleWrapper = document.createElement('div');
        toggleWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--nc-border);';
        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'lib-filter-btn';
        toggleBtn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);font-size:13px;cursor:pointer;white-space:nowrap;';
        toggleBtn.textContent = t('toggleFlat');
        toggleBtn.addEventListener('click', function () {
            state.flatCollectionMode = true;
            var nodeParam = state.readerTreePath && state.readerTreePath.length ? state.readerTreePath.join('.') : null;
            updateUrl({ view: 'tomes', library: state.currentLibrary ? String(state.currentLibrary.id) : null, collection: state.currentCollection ? String(state.currentCollection.id) : null, node: nodeParam, viewType: 'flat' });
            showLoader();
            render();
            setTimeout(hideLoader, 300);
        });
        toggleWrapper.appendChild(toggleBtn);

        var filterWrapper = document.createElement('div');
        filterWrapper.className = 'lib-filter-wrapper';
        filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
        filterWrapper.appendChild(toggleWrapper);
        container.appendChild(filterWrapper);

        if (node.isImageTome && (node.files || []).length > 0) {
            renderReadingImages(node, collection);
            renderSidebar();
            renderBreadcrumb();
            return;
        }

        var files = node.files || [];
        var children = node.children || [];
        var treePath = state.readerTreePath || [];

        if (children.length) {
            var subTitle = document.createElement('div');
            subTitle.className = 'lib-sub-col-title';
            subTitle.style.cssText = 'font-size:13px;font-weight:600;color:var(--nc-text);margin:16px 0 8px 0;';
            subTitle.setAttribute('data-translation', 'subCollections');
            subTitle.textContent = t('subCollections') || 'Sous-collections';
            container.appendChild(subTitle);

            var subGrid = document.createElement('div');
            subGrid.className = 'lib-cards-ctn';
            children.forEach(function (child, idx) {
                subGrid.appendChild(renderSubCollectionCard(child, idx, collection, treePath));
            });
            container.appendChild(subGrid);
        }

        if (files.length) {
            if (treePath.length === 0) {
                var filesTitle = document.createElement('div');
                filesTitle.className = 'lib-sub-col-title';
                filesTitle.style.cssText = 'font-size:13px;font-weight:600;color:var(--nc-text);margin:16px 0 8px 0;';
                var isImages = hasOnlyImageFiles(files);
                filesTitle.setAttribute('data-translation', isImages ? 'images' : 'tomes');
                filesTitle.textContent = isImages ? (t('images') || 'Images') : (t('tomes') || 'Tomes');
                container.appendChild(filesTitle);
            }

            var cardsCtn = document.createElement('div');
            cardsCtn.className = 'lib-cards-ctn';
            var sortedFiles = files.slice().sort(function(a, b) {
                var ta = (a.volume > 0 ? a.volume : a.tome) || 0;
                var tb = (b.volume > 0 ? b.volume : b.tome) || 0;
                if (ta !== tb) return ta - tb;
                return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
            });
            var missingTomes = findMissingTomes(sortedFiles);
            var missingIdx = 0;
            sortedFiles.forEach(function (f) {
                while (missingIdx < missingTomes.length && missingTomes[missingIdx] < ((f.volume > 0 ? f.volume : f.tome) || 0)) {
                    cardsCtn.appendChild(renderMissingTomeCard(missingTomes[missingIdx]));
                    missingIdx++;
                }
                cardsCtn.appendChild(renderTomeCard(f, collection));
            });
            while (missingIdx < missingTomes.length) {
                cardsCtn.appendChild(renderMissingTomeCard(missingTomes[missingIdx]));
                missingIdx++;
            }
            container.appendChild(cardsCtn);
        }

        if (!files.length && !children.length) {
            var empty2 = document.createElement('div');
            empty2.className = 'lib-empty';
            empty2.setAttribute('data-translation', 'noResults');
            empty2.textContent = t('noResults');
            container.appendChild(empty2);
        }

        var allFiles = collectAllFiles(getCollectionRoot(collection) || {});
        if (allFiles.length) {
            loadCoversBulk(allFiles, function (fetched) {
                if (fetched && document.getElementById('lib-content')) renderTomes(collection);
            });
        }
    }

    function renderSubCollectionCard(node, idx, collection, treePath) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        var isImages = node.isImages === true;
        var icon = isImages ? '🖼' : '📂';
        var firstFiles = node.files || [];
        var colCover = coverOfFirstTome(firstFiles);
        var subCount = firstFiles.length;

        var subParts = [];
        if (subCount) {
            subParts.push(subCount + ' <span data-translation="' + (isImages ? 'images' : 'tomes') + '">' + escapeHtml(isImages ? t('images') : t('tomes')) + '</span>');
        }
        var sub = subParts.join(' · ');

        var coverImg = colCover
            ? '<img class="lib-card-img" src="' + colCover + '" alt="' + icon + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">'
            : NO_PREVIEW_SVG;

         if (!colCover) card.classList.add('noPreview');
         card.innerHTML =
             '<div class="lib-card-icon">' + coverImg + nodeStatusHtml(node) + '</div>' +
             '<div class="lib-card-title" title="' + escapeHtml(node.name || '') + '">' + escapeHtml(node.name || '') + '</div>' +
             '<div class="lib-card-sub">' + sub + '</div>';
         card.addEventListener('click', function () {
            state.readerTreePath = treePath.concat(idx);
            var nodeParam = state.readerTreePath.join('.');
            updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(collection.id), node: nodeParam });
            renderTomes(collection);
            renderSidebar();
            renderBreadcrumb();
        });
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            var items = [];
            var colPaths = collectPaths(node);
            if (colPaths.length) {
                items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { markNodeRead(node, collection); } });
                items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { markNodeUnread(node, collection); } });
            }
            if (state.isAdmin) {
                if (items.length) items.push({ type: 'separator' });
                items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { renameSubCollection(node, idx, collection); } });
                items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { rescanCollection(collection, state.currentLibrary); } });
                items.push({ type: 'separator' });
                items.push({ label: t('contextDelete'), icon: DELETE_SVG, action: function () { deleteSubCollection(node, idx, collection); } });
            }
            if (!items.length) return;
            showContextMenu(e, items, node);
        });
        attachLongPress(card);
        return card;
    }

    function fileIcon(type) {
        if (!type) return '📄';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(type) !== -1) return '🖼';
        if (type === 'epub') return '📚';
        if (['cbz', 'cbr'].indexOf(type) !== -1) return '🗜';
        return '📄';
    }

    function tomeLabelFor(f) {
        var list = (f && f.tomes && f.tomes.length) ? f.tomes : ((f && f.tome > 0) ? [f.tome] : []);
        if (list.length > 1) {
            return t('tome') + ' ' + list[0] + '-' + list[list.length - 1];
        }
        if (list.length === 1) {
            return t('tome') + ' ' + list[0];
        }
        return '';
    }

    function renderTomeCard(f, collection) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var icon = fileIcon(f.type);
        var bookmark = state.bookmarks[f.path];
        var titleLine = (f.tome > 0 || (f.tomes && f.tomes.length))
            ? (tomeLabelFor(f) || (f.displayTitle || (f.name ? f.name.replace(/\.[^.]+$/, '') : '')))
            : (f.displayTitle || (f.name ? f.name.replace(/\.[^.]+$/, '') : ''));
        var subLine = f.pages ? (f.pages + ' ' + t('pages')) : '';
        if (bookmark) {
            subLine += (subLine ? ' · ' : '') + bookmarkLabel(f.path);
        }
        var coverImg = renderTomeIcon(f);
        if (!coverUrl(f.path)) card.classList.add('noPreview');
        var subHtml = subLine ? ('<div class="lib-card-sub">' + escapeHtml(subLine) + '</div>') : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + renderTomeStatusIcon(f.path) + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            subHtml +
            '<button class="lib-tome-actions-btn" type="button" title="' + escapeHtml(t('navMore')) + '" aria-label="' + escapeHtml(t('navMore')) + '">⋯</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-tome-actions-btn')) {
                e.stopPropagation();
                return;
            }
            state.view = 'reading';
            state.currentTome = f;
            updateUrl({ view: 'reading', library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), read: f.path });
            renderReading(f);
            renderSidebar();
            renderBreadcrumb();
        });
        var actionsBtn = card.querySelector('.lib-tome-actions-btn');
        if (actionsBtn) {
            actionsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var rect = actionsBtn.getBoundingClientRect();
                var evt = new MouseEvent('contextmenu', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.bottom
                });
                card.dispatchEvent(evt);
            });
        }
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            var items = [];
            items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { markTomeRead(f, collection); } });
            items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { markTomeUnread(f, collection); } });
            if (state.isAdmin) {
                items.push({ type: 'separator' });
                items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { renameTome(f, collection); } });
                items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { pickCoverForTome(f); } });
                items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { rescanCollection(collection, state.currentLibrary); } });
                items.push({ type: 'separator' });
                items.push({ label: t('contextDelete'), icon: DELETE_SVG, action: function () { deleteTome(f, collection); } });
            }
            if (!items.length) return;
            showContextMenu(e, items, f);
        });
        attachLongPress(card);
        return card;
    }

    function countTomes(files) {
        var count = 0;
        (files || []).forEach(function(f) {
            var ext = fileExt(f);
            if (IMG_EXT.indexOf(ext) !== -1) return;
            var list = (f.tomes && f.tomes.length) ? f.tomes : [];
            if (!list.length) {
                var t = (f.volume > 0 ? f.volume : f.tome) || 0;
                list = t > 0 ? [t] : [];
            }
            if (!list.length) count++;
            else list.forEach(function(t) { if (t > 0) count++; });
        });
        return count;
    }

    function findMissingTomes(files) {
        var tomes = {};
        files.forEach(function(f) {
            var list = (f.tomes && f.tomes.length) ? f.tomes : [];
            if (!list.length) {
                var t = (f.volume > 0 ? f.volume : f.tome) || 0;
                list = t > 0 ? [t] : [];
            }
            list.forEach(function(t){ if (t > 0) tomes[t] = true; });
        });
        var existing = Object.keys(tomes).map(function(k) { return parseInt(k, 10); }).sort(function(a, b) { return a - b; });
        if (!existing.length) return [];
        var missing = [];
        var min = existing[0];
        var max = existing[existing.length - 1];
        for (var i = min; i <= max; i++) {
            if (!tomes[i]) missing.push(i);
        }
        return missing;
    }

    function renderMissingTomeCard(tomeNum) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait lib-missing-tome';
        var icon = '📚';
        var titleLine = t('tome') + ' ' + tomeNum;
        var bannerHtml = '<div class="lib-missing-tome-banner"><span data-translation="missingTome">' + escapeHtml(t('missingTome') || 'Tome Manquant') + '</span></div>';
        card.innerHTML =
            '<div class="lib-card-icon" style="height:230px;">' + icon + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            bannerHtml;
        return card;
    }

    function formatSize(b) {
        if (!b) return '';
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024) return (b / 1024).toFixed(0) + ' KB';
        return b + ' B';
    }

    function isTomeInProgress(path) {
        var b = state.bookmarks[path];
        return !!b && b.type !== 'read';
    }

     function isTomeRead(path) {
         var b = state.bookmarks[path];
         return !!b && b.type === 'read';
     }

     function collectionReadStatus(nodeOrCollection) {
         var root = nodeOrCollection && nodeOrCollection.rules ? nodeOrCollection.rules : nodeOrCollection;
         var files = collectAllFiles(root);
         if (!files.length) return null;
         var readCount = 0;
         files.forEach(function (f) { if (isTomeRead(f.path)) readCount++; });
         if (readCount === files.length) return 'read';
         if (readCount === 0) return 'unread';
         return 'partial';
     }

     function collectionStatusIcon(nodeOrCollection) {
         var status = collectionReadStatus(nodeOrCollection);
         if (status === 'read') {
            return READ_CHECK_SVG;
         }
         if (status === 'partial') {
             return OPEN_BOOK_READ_SVG;
         }
         return '';
     }

      function nodeStatusHtml(nodeOrCollection) {
          var icon = collectionStatusIcon(nodeOrCollection);
          if (!icon) return '';
          var status = collectionReadStatus(nodeOrCollection);
          var label = status === 'read' ? t('readerRead') : t('inProgress');
          var cssClass = status === 'read' ? 'lib-collection-status-icon lib-tome-read' : 'lib-collection-status-icon lib-tome-inprogress';
          return '<span class="' + cssClass + '" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '" data-translation="' + (status === 'read' ? 'readerRead' : 'inProgress') + '">' + icon + '</span>';
      }

     function collectionCardStatusHtml(collection) {
         return nodeStatusHtml(collection);
     }

    function renderTomeStatusIcon(path) {
        if (isTomeRead(path)) {
            return '<span class="lib-tome-status-icon lib-tome-read" title="' + escapeHtml(t('readerRead')) + '" aria-label="' + escapeHtml(t('readerRead')) + '" data-translation="readerRead">' + READ_CHECK_SVG + '</span>';
        }
        if (isTomeInProgress(path)) {
            return '<span class="lib-tome-status-icon lib-tome-inprogress" title="' + escapeHtml(t('inProgress')) + '" aria-label="' + escapeHtml(t('inProgress')) + '" data-translation="inProgress">' + OPEN_BOOK_READ_SVG + '</span>';
        }
        return '';
    }

    function bookmarkLabel(path) {
        var b = state.bookmarks[path];
        if (!b) return '';
        if (b.type === 'read') return '✓ ' + (t('readerRead') || 'Lu');
        if (b.type === 'pdf_page' || b.type === 'cbz_page' || b.type === 'reader_page') return t('page') + ' ' + b.value + '/' + b.total;
        if (b.type === 'epub_percent') return b.value + t('percent');
        if (b.type === 'image_viewed') return '✓';
        return '';
    }

    function renderFlatFiles(library) {
        dbg('renderFlatFiles', { library: library && library.id });
        renderSidebar();
        renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';

        var files = (state.flatFiles || []).slice();

        var filterBar = document.createElement('div');
        filterBar.className = 'lib-filter-bar';

        var allExtBtn = document.createElement('button');
        allExtBtn.type = 'button';
        allExtBtn.className = 'lib-filter-btn lib-filter-btn-active';
        allExtBtn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--reader-accent-bg);color:var(--reader-accent-lighter);font-size:13px;cursor:pointer;white-space:nowrap;';
        allExtBtn.textContent = t('filterAll');
        allExtBtn.addEventListener('click', function () {
            files = (state.flatFiles || []).slice();
            document.querySelectorAll('.lib-filter-btn').forEach(function(b) { b.classList.remove('lib-filter-btn-active'); });
            allExtBtn.classList.add('lib-filter-btn-active');
            renderFlatFilesBody();
        });
        filterBar.appendChild(allExtBtn);
        var extFiltersDiv = document.createElement('div');
        extFiltersDiv.className = 'lib-ext-filters';

        var extGroup = {};
        files.forEach(function (f) {
            var ext = fileExt(f);
            if (!extGroup[ext]) extGroup[ext] = 0;
            extGroup[ext]++;
        });
        Object.keys(extGroup).sort().forEach(function (ext) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lib-filter-btn';
            btn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);font-size:13px;cursor:pointer;white-space:nowrap;';
            btn.innerHTML = '.' + escapeHtml(ext) + ' <span class="lib-ext-counts">(' + extGroup[ext] + ')</span>';
            btn.addEventListener('click', function () {
                files = (state.flatFiles || []).filter(function (f) { return fileExt(f) === ext; });
                document.querySelectorAll('.lib-filter-btn').forEach(function(b) { b.classList.remove('lib-filter-btn-active'); });
                btn.classList.add('lib-filter-btn-active');
                renderFlatFilesBody();
            });
            extFiltersDiv.appendChild(btn);
        });
        filterBar.appendChild(extFiltersDiv);

        function renderFlatFilesBody() {
            container.innerHTML = '';
            var filterWrapper = document.createElement('div');
            filterWrapper.className = 'lib-filter-wrapper';
            filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
            if (!files.length) {
                filterWrapper.appendChild(filterBar);
                container.appendChild(filterWrapper);
                var empty = document.createElement('div');
                empty.className = 'lib-empty';
                empty.setAttribute('data-translation', 'noResults');
                empty.textContent = t('noResults');
                container.appendChild(empty);
                return;
            }

            var toggleWrapper = document.createElement('div');
            toggleWrapper.style.cssText = 'padding:12px 16px;border-bottom:1px solid var(--nc-border);display:flex;align-items:center;gap:8px;';
            var toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'lib-filter-btn';
            toggleBtn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--reader-accent-bg);color:var(--reader-accent-lighter);font-size:13px;cursor:pointer;white-space:nowrap;';
            toggleBtn.textContent = t('toggleHierarchical');
            toggleBtn.addEventListener('click', function () {
                state.flatFilesMode = false;
                state.view = 'collection';
                 updateUrl({ view: 'collection', library: String(library.id) });
                 showLoader();
                loadCollections(library.id, function () {
                    hideLoader();
                    renderCollections(library);
                });
            });
            toggleWrapper.appendChild(toggleBtn);
            filterWrapper.appendChild(toggleWrapper);
            filterWrapper.appendChild(filterBar);
            container.appendChild(filterWrapper);

            var grid = document.createElement('div');
            grid.className = 'lib-grid';
            files.forEach(function (f) {
                var card = document.createElement('div');
                card.className = 'lib-card';
                var label = f.name ? f.name.replace(/\.[^.]+$/, '') : f.path;
                var coverImg = coverOfFirstTome([f]);
                var cardIcon = coverImg
                    ? '<img class="lib-card-img" src="' + coverImg + '" alt="' + escapeHtml(label) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + escapeHtml(label.charAt(0) || '📄') + '\');this.remove();">'
                    : '<span style="font-size:24px;">📄</span>';
                if (!coverImg) card.classList.add('noPreview');
                var pageCount = f.pages ? (f.pages + ' ' + t('pages')) : '';
                card.innerHTML =
                    '<div class="lib-icon">' + cardIcon + '</div>' +
                    '<div class="lib-name" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</div>' +
                    (pageCount ? '<div class="lib-meta">' + escapeHtml(pageCount) + '</div>' : '');
                card.addEventListener('click', function (e) {
                    if (e.target.classList.contains('lib-delete-btn')) return;
                    state.view = 'reading';
                    state.currentTome = { path: f.path, name: f.name, tome: 1 };
                    updateUrl({ view: 'reading', library: String(library.id), read: f.path });
                    renderReading(f);
                    renderSidebar();
                    renderBreadcrumb();
                });
                grid.appendChild(card);
            });
            container.appendChild(grid);
        }

        renderFlatFilesBody();
    }

    function renderCollections(library) {
        dbg('renderCollections', { library: library && library.id, view: state.view });
        renderSidebar();
        renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';

        var filterWrapper = document.createElement('div');
        filterWrapper.className = 'lib-filter-wrapper';
        filterWrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
        container.appendChild(filterWrapper);

        if (library && library.libraryType !== 'audio') {
            var headerBar = document.createElement('div');
            headerBar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--nc-border);';
            var toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'lib-filter-btn';
            toggleBtn.style.cssText = 'padding:4px 12px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);color:var(--nc-text);font-size:13px;cursor:pointer;white-space:nowrap;';
            toggleBtn.textContent = t('toggleFlat');
            toggleBtn.addEventListener('click', function () {
                state.flatFilesMode = true;
                state.view = 'flat-files';
                updateUrl({ view: 'flat-files', library: String(library.id) });
                showLoader();
                loadAllFilesForLibrary(library, function () {
                    hideLoader();
                    renderFlatFiles(library);
                });
            });
            headerBar.appendChild(toggleBtn);
            filterWrapper.appendChild(headerBar);
        }
        var cols = (state.collectionsByLib && library && library.id != null && state.collectionsByLib[library.id])
            ? state.collectionsByLib[library.id]
            : (state.collections || []);
        if (!cols.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.setAttribute('data-translation', 'noResults');
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }
        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        cols.forEach(function (col) {
            var card = document.createElement('div');
            card.className = 'lib-card';
            var allFiles = collectAllFiles(col.rules || {});
            var rootFiles = (col.rules && col.rules.files) ? col.rules.files : [];
            var colCover = coverOfFirstTome(allFiles);
            var colIcon = colCover
                ? '<img class="lib-card-img" src="' + colCover + '" alt="📁" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📁\');this.remove();">'
                : NO_PREVIEW_SVG;
            if (!colCover) card.classList.add('noPreview');
            var colStatusHtml = collectionCardStatusHtml(col);
            var rootAllImages = hasOnlyImageFiles(rootFiles);
            var rootCount;
            if (rootAllImages) {
                rootCount = rootFiles.length;
            } else {
                rootCount = countTomes(rootFiles);
                if (!rootCount && rootFiles.length) {
                    rootCount = rootFiles.length;
                }
            }
            var childCount = (col.rules && Array.isArray(col.rules.children)) ? col.rules.children.length : 0;
            var metaParts = [];
            if (rootCount) {
                metaParts.push(rootCount + ' <span data-translation="' + (rootAllImages ? 'images' : 'tomes') + '">' + escapeHtml(rootAllImages ? t('images') : t('tomes')) + '</span>');
            }
            if (childCount) {
                metaParts.push(childCount + ' <span data-translation="subCollections">' + escapeHtml(t('subCollections')) + '</span>');
            }
            card.innerHTML =
                '<div class="lib-icon">' + colIcon + colStatusHtml + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(col.name || '') + '">' + escapeHtml(col.name || '') + '</div>' +
                '<div class="lib-meta">' + metaParts.join(' · ') + '</div>' +
                '<button class="lib-tome-actions-btn" type="button" title="' + escapeHtml(t('navMore')) + '" aria-label="' + escapeHtml(t('navMore')) + '">⋯</button>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-tome-actions-btn')) { e.stopPropagation(); return; }
                state.view = 'tomes';
                state.currentCollection = col;
                state.readerTreePath = [];
                updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(col.id) });
                renderTomes(col);
                renderSidebar();
                renderBreadcrumb();
            });
            var actionsBtn = card.querySelector('.lib-tome-actions-btn');
            if (actionsBtn) {
                actionsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var rect = actionsBtn.getBoundingClientRect();
                    var evt = new MouseEvent('contextmenu', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: rect.left + rect.width / 2,
                        clientY: rect.bottom
                    });
                    card.dispatchEvent(evt);
                });
            }
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                items.push({ label: t('open'), icon: OPEN_SVG, action: function () { navigateToCollection(col, library); } });
                var colPaths = collectPaths(col);
                if (colPaths.length) {
                    items.push({ type: 'separator' });
                    items.push({ label: t('markCollectionRead'), icon: MARK_READ_SVG, action: function () { markCollectionRead(col, library); } });
                    items.push({ label: t('markCollectionUnread'), icon: MARK_UNREAD_SVG, action: function () { markCollectionUnread(col, library); } });
                }
                if (state.isAdmin) {
                    if (items.length) items.push({ type: 'separator' });
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { renameCollection(col, library); } });
                    items.push({ label: t('changeColType'), icon: TYPE_SVG, action: function () { changeCollectionType(col, library); } });
                    items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { rescanCollection(col, library); } });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteCol'), icon: DELETE_SVG, action: function () { deleteCollection(col, library); } });
                }
                if (!items.length) return;
                showContextMenu(e, items, col);
            });
            attachLongPress(card);
            grid.appendChild(card);
        });
        container.appendChild(grid);

        var allPaths = [];
        cols.forEach(function (c) {
            var f = collectAllFiles(c.rules || {});
            f.forEach(function (file) {
                if (file.path) allPaths.push(file.path);
            });
        });
        loadCoversBulk(allPaths, function (fetched) {
            if (fetched && document.getElementById('lib-content')) renderCollections(library);
        });
    }

    function renderLibrariesContent() {
        dbg('renderLibrariesContent', { libraries: (state.libraries || []).length, view: state.view });
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';

        var libs = state.libraries || [];

        if (libs.length === 0) {
            var emptyHint = state.isAdmin
                ? ('<div style="margin-bottom:16px;" data-translation="emptyHint">' + t('emptyHint') + '</div>' +
                   '<button class="lib-btn lib-btn-primary" id="lib-add-lib-btn" data-translation="addLibrary">' + t('addLibrary') + '</button>')
                : ('<div style="margin-bottom:16px;" data-translation="readOnlyHint">' + t('readOnlyHint') + '</div>');
            container.innerHTML =
                '<div class="lib-empty">' +
                    '<div style="font-size:28px;margin-bottom:8px;">📚</div>' +
                    '<div style="font-weight:600;margin-bottom:8px;" data-translation="empty">' + escapeHtml(t('empty')) + '</div>' +
                    emptyHint +
                '</div>';
            var addBtn = document.getElementById('lib-add-lib-btn');
            if (addBtn) addBtn.addEventListener('click', addLibrary);
            return;
        }

        var wrap = document.createElement('div');

        var continueSection = document.createElement('div');
        continueSection.className = 'lib-section';
        var continueHeader = document.createElement('div');
        continueHeader.className = 'lib-progress-header';
        continueHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
        var continueTitle = document.createElement('div');
        continueTitle.className = 'lib-section-title';
        continueTitle.setAttribute('data-translation', 'inProgress');
        continueTitle.textContent = t('inProgress');
        continueHeader.appendChild(continueTitle);
        var continueList = document.createElement('div');
        continueList.className = 'lib-progress-track';
        continueList.style.cssText = 'display:flex;gap:12px;overflow-x:auto;scroll-behavior:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;';
        continueSection.appendChild(continueHeader);

        var progPaths = [];
        var allTomePaths = [];
        libs.forEach(function (lib) {
            var cols = (state.collectionsByLib && state.collectionsByLib[lib.id]) ? state.collectionsByLib[lib.id] : (state.collections || []);
            cols.forEach(function (c) {
                var files = collectAllFiles(c.rules || {});
                files.forEach(function (f) {
                    progPaths.push({ path: f.path, lib: lib, col: c, file: f });
                    allTomePaths.push(f);
                });
            });
        });

        loadCoversBulk(allTomePaths, function (fetched) {
            if (fetched && document.getElementById('lib-content')) render();
        });

        renderProgressCards(continueList, progPaths);
        attachProgressCarouselNav(continueHeader, continueList);

        if (!Object.keys(state.bookmarks).length && !progPaths.length) {
            var emptyProg = document.createElement('div');
            emptyProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            emptyProg.setAttribute('data-translation', 'noProgress');
            emptyProg.textContent = t('noProgress');
            continueList.appendChild(emptyProg);
        }
        continueSection.appendChild(continueList);
        wrap.appendChild(continueSection);

        var gridSection = document.createElement('div');
        gridSection.className = 'lib-section';
        var gridTitle = document.createElement('div');
        gridTitle.className = 'lib-section-title';
        gridTitle.setAttribute('data-translation', 'librariesLabel');
        gridTitle.textContent = t('librariesLabel');
        gridSection.appendChild(gridTitle);
        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        renderLibraryCards(grid);
        gridSection.appendChild(grid);
        wrap.appendChild(gridSection);

        container.appendChild(wrap);
    }

    function renderProgressCards(list, progPaths) {
        list.innerHTML = '';
        if (!progPaths.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            empty.setAttribute('data-translation', 'noProgress');
            empty.textContent = t('noProgress');
            list.appendChild(empty);
            return;
        }
        var renderFromPreloaded = function () {
            list.innerHTML = '';
            var inProgress = [];
            progPaths.forEach(function (p) {
                var bm = state.bookmarks[p.path];
                if (!bm || bm.type === 'read') return;
                inProgress.push(p);
            });
            if (!inProgress.length) {
                var noProg = document.createElement('div');
                noProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
                noProg.setAttribute('data-translation', 'noProgress');
                noProg.textContent = t('noProgress');
                list.appendChild(noProg);
                return;
            }
            inProgress.forEach(function (p) {
                list.appendChild(renderProgressCard(p, p.col, p.lib));
            });
        };
        if (state.progressLoaded) {
            var covered = true;
            for (var i = 0; i < progPaths.length; i++) {
                if (!Object.prototype.hasOwnProperty.call(state.bookmarks, progPaths[i].path)) { covered = false; break; }
            }
            if (covered) {
                renderFromPreloaded();
                return;
            }
        }
        apiRequest(getBaseUrl() + '/api/reader/progress/read', {
                method: 'POST',
                body: JSON.stringify({ paths: progPaths.map(function(p) { return p.path; }) })
            }).then(function (data) {
                if (!document.getElementById('lib-content')) return;
                if (data && data.success && data.progress) {
                    Object.keys(data.progress).forEach(function(k) {
                        state.bookmarks['/' + k] = data.progress[k];
                    });
                }
                state.progressLoaded = true;
                renderFromPreloaded();
            }).catch(function () {
                list.innerHTML = '';
            });
    }

    var libProgressDrag = { active: false, track: null, startX: 0, startScroll: 0, threshold: false };

    function handleLibProgressDragMove(e) {
        if (!libProgressDrag.active) return;
        var delta = e.clientX - libProgressDrag.startX;
        if (Math.abs(delta) > 5) {
            libProgressDrag.threshold = true;
            if (libProgressDrag.track) libProgressDrag.track.scrollLeft = libProgressDrag.startScroll - delta;
        }
    }

    function handleLibProgressDragEnd() {
        if (!libProgressDrag.active) return;
        libProgressDrag.active = false;
        if (libProgressDrag.track) libProgressDrag.track.classList.remove('lib-progress-dragging');
    }

    if (typeof window !== 'undefined') {
        document.addEventListener('mousemove', handleLibProgressDragMove);
        document.addEventListener('mouseup', handleLibProgressDragEnd);
    }

    function attachProgressCarouselNav(header, track) {
        var btnPrev = document.createElement('button');
        var btnNext = document.createElement('button');
        var icon = function (name, fallback) {
            return (typeof window !== 'undefined' && window.RenamerIcons && window.RenamerIcons[name]) ? window.RenamerIcons[name] : fallback;
        };
        btnPrev.innerHTML = icon('BACK', '&#8592;');
        btnNext.innerHTML = icon('POPUP_ARROW', '&#8594;');
        btnPrev.setAttribute('data-translation', 'prev');
        btnNext.setAttribute('data-translation', 'next');
        btnPrev.title = t('prev') || 'Précédent';
        btnNext.title = t('next') || 'Suivant';
        var btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:6px;';
        btns.appendChild(btnPrev);
        btns.appendChild(btnNext);
        header.appendChild(btns);

        var updateOverflow = function () {
            var scrollable = track.scrollWidth > Math.round(track.clientWidth) + 1;
            var atStart = track.scrollLeft <= 1;
            var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
            btnPrev.style.display = scrollable ? 'inline-flex' : 'none';
            btnNext.style.display = scrollable ? 'inline-flex' : 'none';
            btnPrev.disabled = atStart;
            btnNext.disabled = atEnd;
            btnPrev.style.opacity = atStart ? '0.35' : '1';
            btnNext.style.opacity = atEnd ? '0.35' : '1';
        };
        [btnPrev, btnNext].forEach(function (btn) {
            btn.type = 'button';
            btn.className = 'lib-progress-btn';
            btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border-radius:6px;background:var(--reader-accent-bg);color:var(--reader-accent-lighter);cursor:pointer;';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var item = track.querySelector(':scope > *:first-child');
                if (!item) return;
                var step = Math.round(item.getBoundingClientRect().width + 12);
                track.scrollBy({ left: btn === btnNext ? step : -step, behavior: 'smooth' });
            });
        });

        if (typeof window !== 'undefined') {
            var ro = null;
            var mo = (typeof MutationObserver !== 'undefined') ? new MutationObserver(updateOverflow) : null;
            var onTick = function () { updateOverflow(); };
            track.addEventListener('scroll', onTick);
            window.addEventListener('resize', onTick);
            if (typeof ResizeObserver !== 'undefined') {
                ro = new ResizeObserver(updateOverflow);
                ro.observe(track);
                ro.observe(header);
            }
            if (mo) { mo.observe(track, { childList: true, subtree: true }); }
        }
        setTimeout(updateOverflow, 50);

        track.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('.lib-progress-btn')) return;
            libProgressDrag.active = true;
            libProgressDrag.track = track;
            libProgressDrag.startX = e.clientX;
            libProgressDrag.startScroll = track.scrollLeft;
            libProgressDrag.threshold = false;
            track.classList.add('lib-progress-dragging');
        });

        track.addEventListener('click', function (e) {
            if (libProgressDrag.threshold) {
                libProgressDrag.threshold = false;
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    function renderProgressCard(p, collection, lib) {
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = p.path;
        var titleLine = tomeLabelFor(p.file) || (t('tome') + ' ' + (p.file.tome || 0));
        var subLine = p.file.pages ? (p.file.pages + ' ' + t('pages')) : '';
        if (state.bookmarks[p.path]) {
            subLine += (subLine ? ' · ' : '') + bookmarkLabel(p.path);
        }
        var coverImg = renderTomeIcon(p.file);
        if (!coverUrl(p.file.path)) card.classList.add('noPreview');
        var subHtml = subLine ? ('<div class="lib-card-sub">' + escapeHtml(subLine) + '</div>') : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + renderTomeStatusIcon(p.path) + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            subHtml +
            '<button class="lib-tome-actions-btn" type="button" title="' + escapeHtml(t('navMore')) + '" aria-label="' + escapeHtml(t('navMore')) + '">⋯</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-tome-actions-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = lib;
            state.currentCollection = p.col;
            state.currentTome = { path: p.file.path, name: p.file.name, tome: p.file.tome };
            updateUrl({ view: 'reading', read: p.file.path });
            renderReading(p.file);
            renderSidebar();
            renderBreadcrumb();
        });
        var actionsBtn = card.querySelector('.lib-tome-actions-btn');
        if (actionsBtn) {
            actionsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var rect = actionsBtn.getBoundingClientRect();
                var evt = new MouseEvent('contextmenu', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.bottom
                });
                card.dispatchEvent(evt);
            });
        }
         card.addEventListener('contextmenu', function (e) {
             e.preventDefault();
             var items = [];
             items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, action: function () { navigateToCollection(p.col, p.lib); } });
             items.push({ type: 'separator' });
             items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { markTomeRead(p.file, p.col); } });
              items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { markTomeUnread(p.file, p.col); } });
              if (state.isAdmin) {
                  items.push({ type: 'separator' });
                  items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { pickCoverForTome(p.file); } });
              }
              if (!items.length) return;
             showContextMenu(e, items, p.file);
         });
         attachLongPress(card);
         return card;
     }

    function renderLibraryCards(gridEl) {
        gridEl.innerHTML = '';
        var libs = state.libraries || [];
        libs.forEach(function (lib) {
            var card = document.createElement('div');
            card.className = 'lib-card';
        var cols = state.collectionsByLib[lib.id] || [];
        var firstFiles = collectAllFiles((cols[0] && cols[0].rules) ? cols[0].rules : {});
        var libCover = coverOfFirstTome(firstFiles);
        var libIcon = libCover
            ? '<img class="lib-card-img" src="' + libCover + '" alt="📚" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'📚\');this.remove();">'
            : NO_PREVIEW_SVG;
        if (!libCover) card.classList.add('noPreview');
        var colCount = cols.length;
        var pathCount = Array.isArray(lib.paths) && lib.paths.length ? lib.paths.length : (lib.description ? 1 : 0);
        var pathText = pathCount > 1 ? (pathCount + ' ' + t('libFolders')) : (lib.description || '');
        var metaText = colCount ? (colCount + ' ' + t('collections')) : pathText;
        card.innerHTML =
            '<div class="lib-icon">' + libIcon + '</div>' +
            '<div class="lib-name" title="' + escapeHtml(lib.name || '') + '">' + escapeHtml(lib.name || '') + '</div>' +
            '<div class="lib-meta">' + escapeHtml(metaText) + '</div>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-delete-btn')) return;
                state.currentLibrary = lib;
                state.currentCollection = null;
                if (state.flatFilesMode) {
                    state.view = 'flat-files';
                    updateUrl({ view: 'flat-files', library: String(lib.id), viewType: 'flat' });
                    loadAllFilesForLibrary(lib, function () { renderFlatFiles(lib); });
                } else {
                    state.view = 'collection';
                           updateUrl({ view: 'collection', library: String(lib.id) });
                    loadCollections(lib.id, function () { renderCollections(lib); });
                }
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: renameLibrary });
                    items.push({ label: t('changeLibraryType'), icon: TYPE_SVG, action: changeLibraryType });
                    items.push({ label: t('addLibraryPath'), icon: ADD_FOLDER_SVG, action: addLibraryPath });
                    items.push({ label: t('rescanLibrary'), icon: SYNC_SVG, action: rescanLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: DELETE_SVG, action: deleteLibrary });
                }
                if (!items.length) return;
                showContextMenu(e, items, lib);
            });
            attachLongPress(card);
            gridEl.appendChild(card);
        });
    }

    function render() {
        dbg('render', { view: state.view, currentLibrary: state.currentLibrary && state.currentLibrary.id, currentCollection: state.currentCollection && state.currentCollection.id });
        var container = document.getElementById('lib-content');
        if (!container) return;

        if (state.view !== 'reading') {
            closeReaderModal();
        }

        if (state.view === 'reading' && state.currentTome) {
            return;
        }

        container.innerHTML = '';

        if (state.view === 'home' || state.view === 'libraries') {
            renderLibrariesContent();
        } else if (state.view === 'favorites') {
            renderFavoritesView();
        } else if (state.view === 'flat-files' && state.currentLibrary) {
            renderFlatFiles(state.currentLibrary);
        } else if (state.view === 'collection' && state.currentLibrary) {
            renderCollections(state.currentLibrary);
        } else if (state.view === 'tomes' && state.currentCollection) {
            renderTomes(state.currentCollection);
        }
        renderBreadcrumb();
    }

    function buildCtx() {
        return {
            state: state,
            t: t,
            escapeHtml: escapeHtml,
            getBaseUrl: getBaseUrl,
            apiRequest: apiRequest,
            showToast: showToast,
            updateUrl: updateUrl,
            closeReader: function() {
                closeReaderModal();
            },
            saveProgress: function(filePath, type, value, total) {
                if (!state) return;
                state.bookmarks = state.bookmarks || {};
                state.bookmarks[filePath] = { type: type, value: value, total: total, timestamp: Date.now() };
                apiRequest(getBaseUrl() + '/api/reader/progress', {
                    method: 'POST',
                    body: JSON.stringify({ path: filePath, type: type, value: value, total: total })
                }).catch(function() {});
            },
            countTomes: countTomes,
            findMissingTomes: findMissingTomes,
        };
    }

      var MANAGED_URL_KEYS = ['view', 'library', 'collection', 'read', 'node', 'favOnly', 'viewType'];
      function updateUrl(params) {
          var preserved = {};
          try {
              var searchParams = new URLSearchParams(window.location.search);
              searchParams.forEach(function(val, key) {
                  if (MANAGED_URL_KEYS.indexOf(key) === -1) {
                      preserved[key] = val;
                  }
              });
          } catch (e) {}
          var searchArr = [];
          Object.keys(preserved).forEach(function(key) {
              searchArr.push(encodeURIComponent(key) + '=' + encodeURIComponent(preserved[key]));
          });
          if (params.view) searchArr.push('view=' + encodeURIComponent(params.view));
          if (params.library) searchArr.push('library=' + encodeURIComponent(params.library));
          if (params.collection) searchArr.push('collection=' + encodeURIComponent(params.collection));
          if (params.read) searchArr.push('read=' + encodeURIComponent(params.read));
          if (params.favOnly) searchArr.push('favOnly=1');
          if (params.node) searchArr.push('node=' + encodeURIComponent(params.node));
          if (params.viewType) searchArr.push('viewType=' + encodeURIComponent(params.viewType));
          var newUrl = window.location.pathname + (searchArr.length ? '?' + searchArr.join('&') : '') + window.location.hash;
          window.history.replaceState(null, '', newUrl);
      }

    function resolveReader(opts, cb) {
        if (state.resolveAbort) { try { state.resolveAbort.abort(); } catch (e) {} }
        var ctrl = new AbortController();
        state.resolveAbort = ctrl;
        var epoch = ++state.navigationEpoch;

        var qs = [];
        if (opts.readPath) qs.push('read=' + encodeURIComponent(opts.readPath));
        if (opts.colId) qs.push('collection=' + encodeURIComponent(opts.colId));
        if (opts.libId) qs.push('library=' + encodeURIComponent(opts.libId));
        qs.push('width=' + (state.coverWidth || 300));

         dbg('resolveReader start', { url: '/api/reader/resolve?' + qs.join('&'), opts: opts });
         apiRequest(getBaseUrl() + '/api/reader/resolve?' + qs.join('&'), { signal: ctrl.signal }).then(function (data) {
            if (epoch !== state.navigationEpoch) return;
            if (!data || !data.success || !data.found) {
                // Résolution échouée (URL périmée ou collection introuvable) : on ne
                // laisse pas la page blanche — on replonge sur la liste des bibliothèques.
                state.view = 'libraries';
                loadLibraries(function () {
                    render();
                    if (typeof cb === 'function') cb();
                });
                return;
            }

            if (Array.isArray(data.libraries) && data.libraries.length) {
                state.libraries = data.libraries;
            }
            state.currentLibrary = data.library || null;

             state.bookmarks = {};
             if (data.progress && typeof data.progress === 'object') {
                 Object.keys(data.progress).forEach(function (k) { state.bookmarks['/' + k] = data.progress[k]; });
                 state.progressLoaded = true;
             }

            state.covers = state.covers || {};
            if (data.covers && typeof data.covers === 'object') {
                Object.keys(data.covers).forEach(function (k) { state.covers[k] = data.covers[k]; });
            }
            if (Object.keys(state.covers).length) {
                state.coversLoaded = true;
            }

             if (data.collection) {
                 var col = data.collection;
                 col.rules = col.rules || {};
                 enrichFileEntries(col.rules);
                 state.currentCollection = col;
                 state.collections = [col];
             } else {
                 state.currentCollection = null;
                 state.collections = [];
             }

              var librariesReady = Array.isArray(data.libraries) && data.libraries.length && (!opts.viewParam || opts.viewParam === 'home' || opts.viewParam === 'libraries' || opts.viewParam === 'favorites');
              if (librariesReady) {
                  state.libraries = data.libraries;
                  if (data.favorites) {
                      state.allFavorites = data.favorites;
                  }
              }

              // Always process collectionsByLib — needed for sidebar chevrons in ALL views (including deep-links).
              if (data.collectionsByLib) {
                  state.collectionsByLib = {};
                  state.allCollections = {};
                  Object.keys(data.collectionsByLib).forEach(function (lid) {
                      var cols = data.collectionsByLib[lid] || [];
                      cols.forEach(function (c) { if (c && c.rules) enrichFileEntries(c.rules); });
                      state.collectionsByLib[lid] = cols;
                      state.allCollections[lid] = cols;
                  });
              }

             if (typeof cb === 'function') cb();
            dbg('resolveReader ok', { found: data && data.found, library: !!(data && data.library), collection: !!(data && data.collection), covers: data && data.covers ? Object.keys(data.covers).length : 0, progress: data && data.progress ? Object.keys(data.progress).length : 0, libraries: data && data.libraries ? data.libraries.length : 0 });
        }).catch(function (err) {
            dbg('resolveReader error', { msg: err && err.message, name: err && err.name });
            if (epoch !== state.navigationEpoch) return;
            if (err && err.name === 'AbortError') return;
            showToast(t('loadError') + (err && err.message ? (': ' + err.message) : ''), 'error');
            state.view = 'libraries';
            render();
        });
    }

    function renderDeepLink(readPath, colId) {
        var col = state.currentCollection;
        dbg('renderDeepLink', { readPath: readPath, colId: colId, colFound: !!col, view: state.view });
        if (!col) {
            state.view = 'libraries';
            render();
            return;
        }
        renderSidebar();
        if (readPath) {
            var found = findTomeByPath(readPath);
            if (found) {
                state.view = 'tomes';
                renderTomes(col);
                renderBreadcrumb();
                state.currentTome = found;
                renderReading(found);
                renderBreadcrumb();
                return;
            }
            var imgNode = findImageTomeNodeByFolder(readPath);
            if (imgNode) {
                renderReadingImages(imgNode, col);
                renderBreadcrumb();
                return;
            }
            state.view = 'tomes';
            renderTomes(col);
            renderBreadcrumb();
            return;
        }
        state.view = 'tomes';
        renderTomes(col);
        renderBreadcrumb();
    }

       function handleUrlParams() {
            var params = new URLSearchParams(window.location.search);
            var viewParam = params.get('view');
            var libId = params.get('library');
            var colId = params.get('collection');
            var readPath = params.get('read');
            var nodeParam = params.get('node');
            var viewTypeParam = params.get('viewType');
            dbg('handleUrlParams', { view: viewParam, library: libId, collection: colId, read: readPath, node: nodeParam, viewType: viewTypeParam });
            var favOnlyParam = params.get('favOnly');
            state.readerFavoritesOnly = favOnlyParam === '1';
            state.readerTreePath = nodeParam ? nodeParam.split('.').map(Number) : [];
            if (viewTypeParam === 'flat') {
                state.flatFilesMode = true;
                state.flatCollectionMode = true;
            } else {
                state.flatFilesMode = false;
                state.flatCollectionMode = false;
            }

           // Deep-link (?collection= et/ou ?read=) : résolution serveur unique — élimine
           // le fan-out N+1 et la course sur state.collections (handleUrlParams ancien).
           if (colId || readPath) {
               resolveReader({ libId: libId, colId: colId, readPath: readPath, nodeParam: nodeParam, viewParam: viewParam }, function () {
                   renderDeepLink(readPath, colId, libId);
               });
               return;
           }

           // Vue collections d'une bibliothèque : même endpoint serveur unique, mais
           // on garde state.view='collection' pour la sidebar/collections ciblées.
            if (libId && !colId && !readPath) {
                if (viewParam === 'favorites') {
                    state.view = 'favorites';
                } else if (viewParam === 'flat-files') {
                    state.view = 'flat-files';
                    state.flatFilesMode = true;
                } else {
                    state.view = 'collection';
                }
                resolveReader({ libId: libId, colId: colId, readPath: readPath, viewParam: state.view }, function () {
                    if (state.view === 'flat-files' && state.currentLibrary) {
                        showLoader();
                        loadAllFilesForLibrary(state.currentLibrary, function () {
                            hideLoader();
                            render();
                        });
                    } else {
                        render();
                    }
                });
                return;
            }

           // Home / libraries / favorites : un seul appel resolveReader renvoie
           // libraries + collectionsByLib + covers + progress + favorites.
           state.view = viewParam === 'favorites' ? 'favorites' : (viewParam === 'home' ? 'home' : 'libraries');
           state.flatFilesMode = false;
           state.flatCollectionMode = false;
           resolveReader({ viewParam: state.view }, function () { render(); });
       }

    function findTomeByPath(readPath) {
        for (var i = 0; i < (state.collections || []).length; i++) {
            var col = state.collections[i];
            var root = col.rules || {};
            var allFiles = collectAllFiles(root);
            for (var j = 0; j < allFiles.length; j++) {
                if (decodeURIComponent(allFiles[j].path) === readPath || allFiles[j].path === readPath) {
                    return allFiles[j];
                }
            }
        }
        return null;
    }

    function findImageTomeNodeByFolder(folderPath) {
        if (!folderPath) return null;
        var normPath = String(folderPath).replace(/^\/+|\/+$/g, '');
        var result = null;
        function searchNode(node) {
            if (!node || result) return;
            var nodeFolder = String(node.folder || '').replace(/^\/+|\/+$/g, '');
            if (nodeFolder === normPath && node.isImageTome) {
                result = node;
                return;
            }
            if (node.children && node.children.length) {
                for (var i = 0; i < node.children.length; i++) {
                    searchNode(node.children[i]);
                    if (result) return;
                }
            }
        }
        var cols = state.allCollections || {};
        for (var libId in cols) {
            var colList = cols[libId] || [];
            for (var i = 0; i < colList.length; i++) {
                var root = getCollectionRoot(colList[i]);
                searchNode(root);
                if (result) return result;
            }
        }
        for (var j = 0; j < (state.collections || []).length; j++) {
            var root2 = getCollectionRoot(state.collections[j]);
            searchNode(root2);
            if (result) return result;
        }
        return null;
    }

    function findImageTomeInCollection(collection, folderPath) {
        if (!collection || !collection.rules) return null;
        var normPath = String(folderPath).replace(/^\/+|\/+$/g, '');
        var result = null;
        var root = getCollectionRoot(collection);
        function searchNode(node) {
            if (!node || result) return;
            var nodeFolder = String(node.folder || '').replace(/^\/+|\/+$/g, '');
            if (nodeFolder === normPath && node.isImageTome) {
                result = node;
                return;
            }
            if (node.children && node.children.length) {
                for (var i = 0; i < node.children.length; i++) {
                    searchNode(node.children[i]);
                    if (result) return;
                }
            }
        }
        searchNode(root);
        return result;
    }

    function loadBookmarksForCollection(lib, col, cb) {
        var root = col.rules || {};
        var files = collectAllFiles(root);
        var paths = files.map(function(f) { return f.path; });
        loadBookmarksForPaths(paths, cb);
    }

    function loadBookmarksForTome(lib, col, cb) {
        var root = col.rules || {};
        var files = collectAllFiles(root);
        var paths = files.map(function(f) { return f.path; });
        loadBookmarksForPaths(paths, cb);
    }

     function loadBookmarksForPaths(paths, cb) {
        if (!paths.length) { if (typeof cb === 'function') cb(); return; }
        apiRequest(getBaseUrl() + '/api/reader/progress/read', {
            method: 'POST',
            body: JSON.stringify({ paths: paths })
        }).then(function (data) {
            if (data && data.success && data.progress) {
                state.bookmarks = {};
                Object.keys(data.progress).forEach(function(k) {
                    state.bookmarks['/' + k] = data.progress[k];
                });
            } else {
                state.bookmarks = {};
            }
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.bookmarks = {};
            if (typeof cb === 'function') cb();
        });
    }

    function loadAllCollections(cb) {
        var libs = state.libraries || [];
        dbg('loadAllCollections start', { libraries: libs.length });
        if (!libs.length) {
            state.allCollections = {};
            state.collectionsByLib = {};
            if (typeof cb === 'function') cb();
            return;
        }
        var pending = libs.length;
        libs.forEach(function (lib) {
            apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + lib.id).then(function (data) {
                var cols = (data && data.success && data.collections) ? data.collections : [];
                cols.forEach(function (c) { if (c && c.rules) enrichFileEntries(c.rules); });
                state.allCollections[lib.id] = cols;
                state.collectionsByLib[lib.id] = cols;
                pending--;
                if (pending === 0) {
                    dbg('loadAllCollections done', { libs: libs.length });
                    if (typeof cb === 'function') cb();
                }
            }).catch(function () {
                state.allCollections[lib.id] = [];
                state.collectionsByLib[lib.id] = [];
                pending--;
                if (pending === 0) {
                    dbg('loadAllCollections done', { libs: libs.length });
                    if (typeof cb === 'function') cb();
                }
            });
        });
    }

    function loadReaderFavoritesList(cb) {
        dbg('loadReaderFavoritesList start');
        apiRequest(getBaseUrl() + '/api/reader/favorites/list').then(function (data) {
            dbg('loadReaderFavoritesList done', { count: (data && Array.isArray(data.favorites) ? data.favorites.length : 0) });
            if (data && data.success && Array.isArray(data.favorites)) {
                state.allFavorites = data.favorites;
            } else {
                state.allFavorites = [];
            }
            if (typeof cb === 'function') cb();
        }).catch(function () {
            state.allFavorites = [];
            if (typeof cb === 'function') cb();
        });
    }

    function findLibraryCollectionForPath(path) {
        var normPath = String(path || '').replace(/^\/+|\/+$/g, '');
        var libs = state.libraries || [];
        for (var i = 0; i < libs.length; i++) {
            var lib = libs[i];
            var cols = state.allCollections[lib.id] || [];
            for (var j = 0; j < cols.length; j++) {
                var col = cols[j];
                var allFiles = collectAllFiles(col.rules || {});
                for (var k = 0; k < allFiles.length; k++) {
                    var fp = String(allFiles[k].path || '').replace(/^\/+|\/+$/g, '');
                    if (decodeURIComponent(fp) === normPath || fp === normPath) {
                        return { lib: lib, col: col, file: allFiles[k] };
                    }
                }
            }
        }
        return null;
    }

    function renderFavoritesView() {
        dbg('renderFavoritesView', { view: state.view, preloaded: Array.isArray(state.allFavorites) && state.allFavorites.length, loaded: !!state.progressLoaded });
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '<div class="lib-empty" style="opacity:0.5;" data-translation="favoritesHint">' + (t('favoritesHint') || 'Loading favorites…') + '</div>';

        var renderBody = function () {
            if (!document.getElementById('lib-content')) return;
            container.innerHTML = '';
            var wrap = document.createElement('div');
            var favorites = state.allFavorites || [];
            if (!Array.isArray(favorites)) favorites = [];
            if (!favorites.length) {
                wrap.innerHTML = '<div class="lib-empty" data-translation="noFavorites">' + (t('noFavorites') || 'Aucun favori') + '</div>';
                container.appendChild(wrap);
                return;
            }
            var grouped = {};
            favorites.forEach(function (fav) {
                var favPages = (fav && Array.isArray(fav.pages)) ? fav.pages : [];
                if (!favPages.length) return;
                var ctx = findLibraryCollectionForPath(fav.path);
                if (!ctx) return;
                var libKey = String(ctx.lib.id);
                if (!grouped[libKey]) grouped[libKey] = { lib: ctx.lib, items: [] };
                grouped[libKey].items.push({ ctx: ctx, pages: favPages });
            });
            var hasAny = false;
            Object.keys(grouped).forEach(function (libKey) {
                var g = grouped[libKey];
                hasAny = true;
                var libHeader = document.createElement('div');
                libHeader.className = 'lib-section-sub-title';
                libHeader.style.cssText = 'font-weight:600;font-size:13px;margin-bottom:8px;';
                libHeader.textContent = g.lib.name || '';
                wrap.appendChild(libHeader);
                var colGroups = {};
                g.items.forEach(function (entry) {
                    var colKey = String(entry.ctx.col.id);
                    if (!colGroups[colKey]) colGroups[colKey] = { col: entry.ctx.col, items: [] };
                    colGroups[colKey].items.push(entry);
                });
                Object.keys(colGroups).forEach(function (colKey) {
                    var cg = colGroups[colKey];
                    var colHeader = document.createElement('div');
                    colHeader.className = 'lib-section-title lib-section-col-title';
                    colHeader.textContent = cg.col.name || t('collection');
                    wrap.appendChild(colHeader);
                    var cardsCtn = document.createElement('div');
                    cardsCtn.className = 'lib-cards-ctn';
                    cg.items.forEach(function (entry) {
                        cardsCtn.appendChild(renderFavoriteCard(entry.ctx, entry.pages));
                    });
                    wrap.appendChild(cardsCtn);
                });
            });
            if (!hasAny) {
                wrap.innerHTML = '<div class="lib-empty" data-translation="noFavorites">' + (t('noFavorites') || 'Aucun favori') + '</div>';
            }
            container.appendChild(wrap);
        };

        if (Array.isArray(state.allFavorites) || state.allFavorites === null) {
            renderBody();
            return;
        }
        // Fallback: préchargement absent
        loadAllCollections(function () {
            loadReaderFavoritesList(function () { renderBody(); });
        });
    }

    function renderFavoriteCard(ctx, pages) {
        var f = ctx.file;
        pages = pages || [];
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var coverImg = renderTomeIcon(f);
        if (!coverUrl(f.path)) card.classList.add('noPreview');
        var tomeLabel = tomeLabelFor(f);
        var titleLine = tomeLabel || (f.name ? f.name.replace(/\.[^.]+$/, '') : '');
        var favCount = pages.length;
        var badgeHtml = '<span class="lib-fav-count-badge">' + favCount + '</span>';
        var pagesLabel = f.pages ? (f.pages + ' ' + t('pages')) : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + badgeHtml + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            (pagesLabel ? '<div class="lib-card-sub">' + escapeHtml(pagesLabel) + '</div>' : '');
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-tome-actions-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = ctx.lib;
            state.currentCollection = ctx.col;
            state.currentTome = { path: f.path, name: f.name, tome: f.tome };
            state.readerFavoritesOnly = true;
                updateUrl({ view: 'reading', read: f.path, favOnly: true });
            renderReading(f);
            renderSidebar();
            renderBreadcrumb();
        });
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            var items = [];
            items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, action: function () { navigateToCollection(ctx.col, ctx.lib); } });
            items.push({ type: 'separator' });
            items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { markTomeRead(f, ctx.col); } });
             items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { markTomeUnread(f, ctx.col); } });
             if (state.isAdmin) {
                 items.push({ type: 'separator' });
                 items.push({ label: t('editCover'), icon: COVER_SVG, action: function () { pickCoverForTome(f); } });
             }
             if (!items.length) return;
            showContextMenu(e, items, f);
        });
        attachLongPress(card);
        return card;
    }

      function bind() {
         if (PAGE_ROOT && !PAGE_ROOT._ctxBound) {
             PAGE_ROOT._ctxBound = true;
             PAGE_ROOT.addEventListener('contextmenu', function (e) {
                 var card = e.target.closest('.lib-card, .lib-card-portrait, .lib-collection-card, .lib-library-card, .lib-subcollection-card, .lib-sidebar-item, .lib-context-menu, #lib-context-menu');
                 if (!card) e.preventDefault();
             });
         }
         var toggleBtn = document.getElementById('lib-sidebar-toggle');
         if (toggleBtn && !toggleBtn._bound) {
             toggleBtn._bound = true;
             toggleBtn.addEventListener('click', function () {
                 state.sidebarOpen = !state.sidebarOpen;
                 var sidebar = document.getElementById('lib-sidebar');
                 if (sidebar) {
                     if (state.sidebarOpen) {
                         sidebar.classList.remove('collapsed');
                     } else {
                         sidebar.classList.add('collapsed');
                     }
                 }
             });
         }
          var settingsBtn = document.getElementById('lib-settings-btn');
          if (settingsBtn && !settingsBtn._bound) {
              settingsBtn._bound = true;
              settingsBtn.addEventListener('click', function (e) {
                  e.stopPropagation();
                  showReaderSettings();
              });
          }
          var fullscreenBtn = document.getElementById('lib-fullscreen-toggle');
          if (fullscreenBtn && !fullscreenBtn._bound) {
              fullscreenBtn._bound = true;
              fullscreenBtn.addEventListener('click', function () {
                  state.isFullscreen = !state.isFullscreen;
                  var pageApp = document.querySelector('.lib-page-app');
                  var contentApp = document.querySelector('#content.app-renamer');
                  var btn = document.getElementById('lib-fullscreen-toggle');
                  if (!btn) return;
                   if (state.isFullscreen) {
                       if (pageApp) pageApp.classList.add('fullscreen');
                       if (contentApp) contentApp.classList.add('fullscreen');
                       btn.innerHTML = EXPAND_SVG;
                       btn.title = t('reduce');
                       btn.setAttribute('aria-label', t('reduce'));
                       btn.setAttribute('data-translation', 'reduce');
                   } else {
                       if (pageApp) pageApp.classList.remove('fullscreen');
                       if (contentApp) contentApp.classList.remove('fullscreen');
                       btn.innerHTML = COLLAPSE_SVG;
                       btn.title = t('expand');
                       btn.setAttribute('aria-label', t('expand'));
                       btn.setAttribute('data-translation', 'expand');
                   }
              });
          }
        var infoToggle = document.getElementById('lib-info-toggle');
        if (infoToggle && !infoToggle._bound) {
            infoToggle._bound = true;
             infoToggle.addEventListener('click', function () {
                 state.showFileCounts = !state.showFileCounts;
                 var filterWrappers = document.querySelectorAll('.lib-filter-wrapper');
                 filterWrappers.forEach(function (wrapper) {
                     wrapper.classList.toggle('lib-info-hidden', !state.showFileCounts);
                 });
                 infoToggle.title = state.showFileCounts ? t('hideFileCounts') : t('showFileCounts');
                 infoToggle.setAttribute('aria-label', state.showFileCounts ? t('hideFileCounts') : t('showFileCounts'));
                 infoToggle.classList.toggle('active', state.showFileCounts);
                 renderBreadcrumb();
             });
        }
        var menu = document.getElementById('lib-sidebar-menu');
        if (menu && !menu._bound) {
            menu._bound = true;
             menu.addEventListener('click', function (e) {
                 var chevron = e.target.closest('.lib-sidebar-chevron');
                 if (chevron) {
                     e.preventDefault();
                     e.stopPropagation();
                     var libId = chevron.getAttribute('data-library-id');
                      var sub = menu.querySelector('.lib-sidebar-sub[data-library-id="' + libId + '"]');
                      if (sub) {
                          var isOpen = sub.classList.contains('expanded');
                          var item = sub.previousElementSibling;
                          if (isOpen) {
                              sub.style.height = '0px';
                              sub.classList.remove('expanded');
                              sub.style.overflow = 'hidden';
                              chevron.classList.remove('expanded');
                              if (item) item.classList.remove('sub-open');
                          } else {
                              sub.style.height = 'auto';
                              sub.style.overflow = 'hidden';
                              var targetHeight = sub.scrollHeight + 'px';
                              sub.style.height = '0px';
                              void sub.offsetWidth;
                              sub.classList.add('expanded');
                              sub.style.height = targetHeight;
                              sub.style.overflow = 'hidden';
                              chevron.classList.add('expanded');
                              if (item) item.classList.add('sub-open');
                          }
                      }
                     return;
                 }
                  var item = e.target.closest('.lib-sidebar-item');
                 if (!item) return;
                 var action = item.getAttribute('data-action');
                 if (action === 'scan') {
                     e.preventDefault();
                     addLibrary();
                     return;
                 }
                 var view = item.getAttribute('data-view');
                 if (!view) return;
                if (view === 'collection') {
                    var libId = item.getAttribute('data-library-id');
                    var colId = item.getAttribute('data-collection-id');
                    var lib = (state.libraries || []).find(function(l) { return String(l.id) === libId; });
                    var col = (state.collectionsByLib && state.collectionsByLib[libId])
                        ? (state.collectionsByLib[libId] || []).find(function(c) { return String(c.id) === colId; })
                        : (state.collections || []).find(function(c) { return String(c.id) === colId; });
                    if (lib && col) {
                        state.view = 'tomes';
                        state.currentLibrary = lib;
                        state.currentCollection = col;
                        state.currentTome = null;
                        state.readerTreePath = [];
                        updateUrl({ view: 'tomes', library: String(lib.id), collection: String(col.id) });
                        renderTomes(col);
                        renderSidebar();
                        renderBreadcrumb();
                        return;
                    }
                } else if (view === 'library') {
                    var libId2 = item.getAttribute('data-library-id');
                    var lib2 = (state.libraries || []).find(function(l) { return String(l.id) === libId2; });
                    if (!lib2) {
                        state.view = 'home';
                        state.currentLibrary = null;
                        state.currentCollection = null;
                    } else {
                        state.view = 'collection';
                        state.currentLibrary = lib2;
                        state.currentCollection = null;
                         updateUrl({ view: 'collection', library: String(lib2.id) });
                        loadCollections(lib2.id, function () { renderCollections(lib2); });
                        return;
                    }
                 } else {
                    state.view = view;
                    state.currentLibrary = null;
                    state.currentCollection = null;
                    state.readerTreePath = [];
                 }
                 state.flatFilesMode = false;
                 state.flatCollectionMode = false;
                 render();
                 updateUrl({ view: state.view === 'home' ? 'home' : (state.view === 'favorites' ? 'favorites' : 'libraries') });
            });
            menu.addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.lib-sidebar-item[data-view="library"]');
                if (!item) return;
                var libId = item.getAttribute('data-library-id');
                var lib = (state.libraries || []).find(function (l) { return String(l.id) === libId; });
                if (!lib) return;
                e.preventDefault();
                var items = [];
                if (state.isAdmin) {
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: renameLibrary });
                    items.push({ label: t('rescanLibrary'), icon: SYNC_SVG, action: rescanLibrary });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteLib'), icon: DELETE_SVG, action: deleteLibrary });
                }
                if (!items.length) return;
                showContextMenu(e, items, lib);
            });
            menu.addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.lib-sidebar-sub .lib-sidebar-item[data-view="collection"]');
                if (!item) return;
                var libId = item.getAttribute('data-library-id');
                var colId = item.getAttribute('data-collection-id');
                var lib = (state.libraries || []).find(function (l) { return String(l.id) === libId; });
                var col = (state.collectionsByLib && state.collectionsByLib[libId] ? state.collectionsByLib[libId] : state.collections || []).find(function (c) { return String(c.id) === colId; });
                if (!lib || !col) return;
                e.preventDefault();
                var items = [];
                items.push({ label: t('open'), icon: OPEN_SVG, action: function () { navigateToCollection(col, lib); } });
                var colPaths = collectPaths(col);
                if (colPaths.length) {
                    items.push({ type: 'separator' });
                    items.push({ label: t('markCollectionRead'), icon: MARK_READ_SVG, action: function () { markCollectionRead(col, lib); } });
                    items.push({ label: t('markCollectionUnread'), icon: MARK_UNREAD_SVG, action: function () { markCollectionUnread(col, lib); } });
                }
                if (state.isAdmin) {
                    if (items.length) items.push({ type: 'separator' });
                    items.push({ label: t('rename'), icon: EDIT_SVG, action: function () { renameCollection(col, lib); } });
                    items.push({ label: t('rescan'), icon: SYNC_SVG, action: function () { rescanCollection(col, lib); } });
                    items.push({ type: 'separator' });
                    items.push({ label: t('contextDeleteCol'), icon: DELETE_SVG, action: function () { deleteCollection(col, lib); } });
                }
                if (!items.length) return;
                showContextMenu(e, items, col);
            });
            var sbLP = { timer: null, startX: 0, startY: 0, target: null };
            function clearSbLP() {
                if (sbLP.timer) { clearTimeout(sbLP.timer); sbLP.timer = null; }
                sbLP.target = null;
            }
            menu.addEventListener('touchstart', function (e) {
                if (sbLP.timer || e.touches.length !== 1) return;
                var item = e.target.closest && (e.target.closest('.lib-sidebar-item[data-view="library"]') || e.target.closest('.lib-sidebar-item[data-view="collection"]'));
                if (!item) return;
                var t = e.touches[0];
                sbLP.startX = t.clientX;
                sbLP.startY = t.clientY;
                sbLP.target = item;
                sbLP.timer = setTimeout(function () {
                    if (!sbLP.target || document.getElementById('lib-context-menu')) return;
                    var ev = new MouseEvent('contextmenu', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: sbLP.startX,
                        clientY: sbLP.startY
                    });
                    sbLP.target.dispatchEvent(ev);
                    sbLP.timer = null;
                    sbLP.target = null;
                }, 600);
            }, { passive: true });
            menu.addEventListener('touchmove', function (e) {
                if (!sbLP.timer) return;
                if (e.touches.length > 0) {
                    var t = e.touches[0];
                    if (Math.abs(t.clientX - sbLP.startX) > 15 || Math.abs(t.clientY - sbLP.startY) > 15) {
                        clearSbLP();
                    }
                }
            }, { passive: true });
            menu.addEventListener('touchend', clearSbLP);
            menu.addEventListener('touchcancel', clearSbLP);
         }
         handleUrlParams();
     }
     function init() {
         dbg('init', { view: state.view, hasContainer: !!document.getElementById('lib-content') });
         var pageRoot = document.getElementById('library-page');
        if (pageRoot && pageRoot.dataset && pageRoot.dataset.isadmin) {
            state.isAdmin = pageRoot.dataset.isadmin === 'true';
        }
        if (typeof RenamerUtils !== 'undefined' && RenamerUtils.setModalLabels) {
            RenamerUtils.setModalLabels({ confirm: t('confirm'), cancel: t('cancel'), close: t('close') });
        }
        injectStyles();
        renderShell();
        renderBreadcrumb();
        bind();
        loadCustomTranslations();
        if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.createGlobalDevToolbar) {
            var devCtx = {
                refreshData: function() {
                    return new Promise(function(resolve) {
                        loadLibraries(function() {
                            if (state.currentLibrary) {
                                loadCollections(state.currentLibrary.id, function() {
                                    render();
                                    resolve();
                                });
                            } else {
                                render();
                                resolve();
                            }
                        });
                    });
                }
            };
            window.RenamerDevRefresh.createGlobalDevToolbar(devCtx);
        }
    }
    function renderShell() {
        PAGE_ROOT.innerHTML = '';
        PAGE_ROOT.className = 'lib-page-app' + (state.isFullscreen ? ' fullscreen' : '');

        var contentApp = document.querySelector('#content.app-renamer');
        if (contentApp && state.isFullscreen) contentApp.classList.add('fullscreen');

        var sidebar = document.createElement('div');
        sidebar.id = 'lib-sidebar';
        sidebar.className = 'lib-sidebar ' + (state.sidebarOpen ? '' : 'collapsed');
        var SETTINGS_GEAR_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_GEAR) || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
        sidebar.innerHTML =
             '<nav class="lib-sidebar-menu" id="lib-sidebar-menu">' +
                 '<div class="lib-sidebar-item' + ((state.view === 'home' || state.view === 'libraries') ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label" data-translation="home">' + escapeHtml(t('home')) + '</span></div>' +
                 '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label" data-translation="myFavorites">' + escapeHtml(t('myFavorites')) + '</span></div>' +
                (state.isAdmin ? '<div class="lib-sidebar-item active addLib" data-action="scan"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">+</span></div>' : '') +
             '</nav>' +
             '<button type="button" id="lib-settings-btn" class="lib-settings-btn" title="' + escapeHtml(t('settings')) + '" aria-label="' + escapeHtml(t('settings')) + '" data-translation="settings">' + SETTINGS_GEAR_SVG + '</button>';

         var main = document.createElement('div');
         main.className = 'lib-main';
          var header = document.createElement('div');
          header.className = 'lib-page-header';
            header.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<button type="button" id="lib-sidebar-toggle" class="lib-sidebar-toggle" title="' + escapeHtml(t('toggleSidebar')) + '" aria-label="' + escapeHtml(t('toggleSidebar')) + '" data-translation="toggleSidebar">☰</button>' +
                '</div>' +
                '<div id="lib-breadcrumb"></div>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<button type="button" id="lib-fullscreen-toggle" class="lib-fullscreen-toggle" title="' + escapeHtml(state.isFullscreen ? t('reduce') : t('expand')) + '" aria-label="' + escapeHtml(state.isFullscreen ? t('reduce') : t('expand')) + '" data-translation="' + (state.isFullscreen ? 'reduce' : 'expand') + '">' + (state.isFullscreen ? EXPAND_SVG : COLLAPSE_SVG) + '</button>' +
                     '<button type="button" id="lib-info-toggle" class="lib-info-toggle' + (state.showFileCounts ? ' active' : '') + '" title="' + escapeHtml(t('toggleFileInfo')) + '" aria-label="' + escapeHtml(t('toggleFileInfo')) + '" data-translation="toggleFileInfo" style="padding:2px 4px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:transparent;color:var(--nc-text);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">' + INFO_SVG + '</button>' +
                '</div>';
         var content = document.createElement('div');
        content.id = 'lib-content';
        content.className = 'lib-page-content';
        main.appendChild(header);
        main.appendChild(content);
        PAGE_ROOT.appendChild(sidebar);
        PAGE_ROOT.appendChild(main);
    }

      function renderSidebar() {
          var menu = document.getElementById('lib-sidebar-menu');
          if (!menu) return;
          var libs = state.libraries || [];
          var html = '';
          var isLibsView = state.view === 'home' || state.view === 'libraries';
            html += '<div class="lib-sidebar-item' + (isLibsView ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label" data-translation="home">' + escapeHtml(t('home')) + '</span></div>';
            html += '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label" data-translation="myFavorites">' + escapeHtml(t('myFavorites')) + '</span></div>';
            libs.forEach(function (lib) {
                var libActive = (state.view === 'collection' || state.view === 'tomes' || state.view === 'reading') && state.currentLibrary && String(state.currentLibrary.id) === String(lib.id);
                var hasChildCols = state.collectionsByLib && state.collectionsByLib[lib.id] && state.collectionsByLib[lib.id].length > 0;
                var subOpen = libActive;
                var chevron = hasChildCols ? '<span class="lib-sidebar-chevron' + (subOpen ? ' expanded' : '') + '" data-library-id="' + escapeHtml(String(lib.id)) + '">' + CHEVRON_DOWN_SVG + '</span>' : '';
                html += '<div class="lib-sidebar-item' + (libActive ? ' active sub-open' : '') + '" data-view="library" data-library-id="' + escapeHtml(String(lib.id)) + '">' + chevron + '<span class="lib-sidebar-icon">' + BOOK_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(lib.name || '') + '</span></div>';
                if (hasChildCols) {
                    var cols = state.collectionsByLib && state.collectionsByLib[lib.id] ? state.collectionsByLib[lib.id] : (state.collections || []);
                    var subOpen = libActive;
                    html += '<div class="lib-sidebar-sub' + (subOpen ? ' expanded' : '') + '" data-library-id="' + escapeHtml(String(lib.id)) + '" style="overflow:hidden;">';
                    cols.forEach(function (col) {
                        var colActive = (state.view === 'tomes' || state.view === 'reading') && state.currentCollection && String(state.currentCollection.id) === String(col.id);
                        html += '<div class="lib-sidebar-item' + (colActive ? ' active' : '') + '" data-view="collection" data-library-id="' + escapeHtml(String(lib.id)) + '" data-collection-id="' + escapeHtml(String(col.id)) + '"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(col.name || '') + '</span></div>';
                    });
                    html += '</div>';
                }
            });
            if (state.isAdmin) {
                html += '<div class="lib-sidebar-item active addLib" data-action="scan"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">+</span></div>';
            }
          menu.innerHTML = html;
          var subs = menu.querySelectorAll('.lib-sidebar-sub.expanded');
          subs.forEach(function(sub) {
              sub.style.height = 'auto';
              var h = sub.scrollHeight + 'px';
              sub.style.height = h;
              sub.style.overflow = '';
          });
      }

      function normalizeLibPath(p) {
          if (!p || !p.trim()) return '/';
          return '/' + p.replace(/^\/+|\/+$/g, '');
      }

      function buildLibBreadcrumb() {
          var CHEVRON = '<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg>';
          var homeLabel = escapeHtml(t('home'));
          var favLabel = escapeHtml(t('myFavorites') || 'Favoris');

           var html = '<nav class="navigation-breadcrumb" aria-label="' + escapeHtml(t('navigationBreadcrumbRoot') || 'Current directory path') + '"><ul class="breadcrumb__crumbs">';

           function crumb(text, level, opts) {
               opts = opts || {};
               var isLast = opts.isLast || false;
               var iconOnly = opts.iconOnly || false;
               var iconHtml = opts.icon ? '<span class="button-vue__icon"><span class="icon-vue" style="width:20px;height:20px;display:flex;">' + opts.icon + '</span></span>' : '';
               var transKey = opts.transKey;
               var textAttr = transKey ? ' data-translation="' + transKey + '"' : '';
               var textHtml = text !== '' ? '<span class="button-vue__text"' + textAttr + '>' + text + '</span>' : '';
               var btnClass = 'button-vue button-vue--size-normal button-vue--vue-tertiary button-vue--tertiary';
               if (iconOnly && !textHtml) { btnClass += ' button-vue--icon-only'; }
               var dataId = opts.id ? ' data-crumb-id="' + escapeHtml(opts.id) + '"' : '';
               var aTransAttr = (transKey && iconOnly && !textHtml) ? ' data-translation="' + transKey + '"' : '';
               html += '<li class="navigation-crumb' + (isLast ? ' active' : '') + '">';
               html += '<a class="' + btnClass + '" data-crumb-level="' + level + '"' + dataId + aTransAttr + ' title="' + escapeHtml(opts.title || '') + '">' +
                   '<span class="button-vue__wrapper">' + iconHtml + textHtml + '</span></a>';
              if (!isLast) {
                  html += '<span class="material-design-icon chevron-right-icon vue-crumb__separator">' + CHEVRON + '</span>';
              }
              html += '</li>';
          }

          var isLibs = state.view === 'libraries' || state.view === 'home';
          var isFavs = state.view === 'favorites';
          var hasLib = state.currentLibrary;
          var hasCol = state.currentCollection;

          var libName = hasLib ? (state.currentLibrary.name || '') : '';
          var libId = hasLib ? String(state.currentLibrary.id) : '';
          var colName = (hasCol && state.currentCollection) ? (state.currentCollection.name || '') : '';
          var colId = (hasCol && state.currentCollection) ? String(state.currentCollection.id) : '';

        crumb('', 'home', { icon: HOME_SVG, iconOnly: true, isLast: isLibs && !hasLib, title: homeLabel, transKey: 'home' });
        if (isFavs && !hasLib) {
            crumb(favLabel, 'favorites', { icon: FAV_STAR_SVG, isLast: true, title: favLabel, transKey: 'myFavorites' });
        } else {
              if (hasLib) {
                  crumb(libName, 'library', { id: libId, isLast: !hasCol, title: libName });
                  if (hasCol) {
                      var hasSubPath = state.view === 'tomes' && state.readerTreePath && state.readerTreePath.length > 0;
                      if (hasSubPath) {
                          crumb(colName, 'collection', { id: colId, isLast: false, title: colName });
                          var colNode = getCollectionRoot(state.currentCollection);
                          var tp = state.readerTreePath;
                          for (var si = 0; si < tp.length; si++) {
                              if (colNode && colNode.children && colNode.children[tp[si]]) {
                                  colNode = colNode.children[tp[si]];
                                  var isLastSub = (si === tp.length - 1);
                                  crumb(colNode.name || '', 'subcollection', {
                                      id: tp.slice(0, si + 1).join('.'),
                                      isLast: isLastSub,
                                      title: colNode.name || ''
                                  });
                              } else {
                                  break;
                              }
                          }
                      } else {
                          crumb(colName, 'collection', { id: colId, isLast: true, title: colName });
                      }
                  }
              }
          }

           html += '</ul>';
           if (state.showNavActions !== false) {
               var NAV_MORE_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_DOTS) || '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>';
                html += '<button type="button" id="renamer-breadcrumb-star" class="navigation-breadcrumb-star" title="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" aria-label="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" data-favorite="false" data-translation="navAddToFavorites">' + FAV_STAR_SVG + '</button>';
                html += '<button type="button" id="lib-nav-more" class="navigation-nav-more" title="' + escapeHtml(t('navMore') || 'Plus') + '" aria-label="' + escapeHtml(t('navMore') || 'Plus') + '" data-translation="navMore">' + NAV_MORE_SVG + '</button>';
           }
           html += '</nav>';
           return html;
      }

      function renderBreadcrumb() {
          renderSidebar();
          var container = document.getElementById('lib-breadcrumb');
          if (!container) return;
          container.innerHTML = buildLibBreadcrumb();

          container.querySelectorAll('.navigation-crumb a[data-crumb-level]').forEach(function (link) {
              if (link._libCrumbBound) return;
              link._libCrumbBound = true;
              link.addEventListener('click', function (e) {
                  e.preventDefault();
                  e.stopPropagation();
                  var level = link.getAttribute('data-crumb-level');
                  var crumbId = link.getAttribute('data-crumb-id');
                  if (level === 'home' || level === 'libraries' || level === 'favorites') {
                      if (level === 'favorites') {
                          state.view = 'favorites';
                          state.currentLibrary = null;
                          state.currentCollection = null;
                          state.currentTome = null;
                      } else {
                          state.view = 'libraries';
                          state.currentLibrary = null;
                          state.currentCollection = null;
                          state.currentTome = null;
                      }
                      render();
                      updateUrl({ view: level === 'favorites' ? 'favorites' : 'libraries' });
                      return;
                  }
                  if (level === 'library') {
                      var lib = (state.libraries || []).find(function (l) { return String(l.id) === crumbId; });
                      if (lib) {
                           state.view = 'collection';
                           state.currentLibrary = lib;
                           state.currentCollection = null;
                           state.readerTreePath = [];
                           state.currentTome = null;
                    updateUrl({ view: 'collection', library: String(lib.id) });
                          loadCollections(lib.id, function () { renderCollections(lib); });
                          return;
                      }
                   } else if (level === 'collection') {
                      var col = (state.collections || []).find(function (c) { return String(c.id) === crumbId; });
                      if (!col && state.currentLibrary && state.collectionsByLib) {
                          var cols = state.collectionsByLib[state.currentLibrary.id] || [];
                          col = cols.find(function (c) { return String(c.id) === crumbId; });
                      }
                       if (col) {
                            state.view = 'tomes';
                            state.currentCollection = col;
                            state.currentTome = null;
                            state.readerTreePath = [];
                            updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(col.id) });
                           renderTomes(col);
                           renderSidebar();
                           renderBreadcrumb();
                           return;
                       }
                   } else if (level === 'subcollection') {
                       if (state.currentCollection && state.currentLibrary) {
                           state.view = 'tomes';
                           state.currentTome = null;
                           state.readerTreePath = crumbId ? crumbId.split('.').map(Number) : [];
                           var nodeParam = crumbId || null;
                           updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(state.currentCollection.id), node: nodeParam });
                           renderTomes(state.currentCollection);
                           renderSidebar();
                           renderBreadcrumb();
                           return;
                       }
                   }
              });
          });

          if (typeof RenamerNavigation !== 'undefined' && RenamerNavigation && RenamerNavigation.updateFavoriteStar) {
              try {
                  var navCtx = buildNavCtx();
                  RenamerNavigation.init(navCtx);
                  var navPath = '/';
                  if (state.view === 'collection' && state.currentLibrary) {
                      navPath = normalizeLibPath(state.currentLibrary.description);
                  } else if (state.view === 'tomes' && state.currentLibrary && state.currentCollection) {
                      navPath = normalizeLibPath(state.currentCollection.rules && state.currentCollection.rules.folder);
                  }
                  RenamerNavigation.setCurrentPath(navPath);
                  RenamerNavigation.updateFavoriteStar(container);
              } catch (e) {}
          }

           if (state.showNavActions !== false) {
               var moreBtn = container.querySelector('#lib-nav-more');
               if (moreBtn && !moreBtn._libNavMoreBound) {
                   moreBtn._libNavMoreBound = true;
                   moreBtn.addEventListener('click', function (e) {
                       e.stopPropagation();
                       if (typeof RenamerNavigation !== 'undefined' && RenamerNavigation && RenamerNavigation.showNavMorePopup) {
                           try {
                               RenamerNavigation.showNavMorePopup(moreBtn);
                           } catch (ex) {}
                       }
                   });
               }
           }
       }

       function saveCustomTranslation(translationKey, translatedText, language) {
           var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
           if (typeof OC !== 'undefined' && OC.requestToken) {
               headers['requesttoken'] = OC.requestToken;
           }
           var lang = language || (TR[language] ? language : 'fr');
           if (lang) {
               headers['Accept-Language'] = lang;
               headers['X-Translation-Language'] = lang;
           }
           return fetch(getBaseUrl() + '/api/translations', {
               method: 'POST',
               credentials: 'same-origin',
               headers: headers,
               body: JSON.stringify({ translationKey: translationKey, translatedText: translatedText, language: lang })
           }).then(function (r) { return r.json(); });
       }

        function loadCustomTranslations() {
            var headers = { 'Accept': 'application/json', 'Accept-Language': lang };
            if (typeof OC !== 'undefined' && OC.requestToken) {
                headers['requesttoken'] = OC.requestToken;
            }
            return fetch(getBaseUrl() + '/api/translations', {
                method: 'GET',
                credentials: 'same-origin',
                headers: headers
            }).then(function (r) { return r.json(); }).then(function (data) {
                if (data && data.success && data.translations) {
                    var responseLang = data.language || lang || 'fr';
                    state.customTranslations = {};
                    Object.keys(data.translations).forEach(function (key) {
                        var val = data.translations[key];
                        if (typeof val === 'object' && val !== null) {
                            Object.keys(val).forEach(function (langCode) {
                                if (val[langCode] !== undefined && val[langCode] !== null && val[langCode] !== '') {
                                    if (!TR[langCode]) TR[langCode] = {};
                                    TR[langCode][key] = val[langCode];
                                    if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                                    state.customTranslations[key][langCode] = val[langCode];
                                }
                            });
                        } else if (typeof val === 'string' && val !== '') {
                            if (!TR[responseLang]) TR[responseLang] = {};
                            TR[responseLang][key] = val;
                            if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                            state.customTranslations[key][responseLang] = val;
                        }
                    });
               } else {
                   state.customTranslations = {};
               }
            }).catch(function (err) {
                console.error('loadCustomTranslations error:', err);
                state.customTranslations = {};
            });
        }

       function showReaderSettings() {
           var existing = document.getElementById('lib-reader-settings-overlay');
           if (existing) { existing.remove(); return; }
           var SETTINGS_GEAR_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_GEAR) || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
           var CLOSE_SVG = (window.RenamerIcons && window.RenamerIcons.CLOSE) || '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"></path></svg>';
           var overlay = document.createElement('div');
           overlay.id = 'lib-reader-settings-overlay';
           overlay.className = 'lib-modal-overlay reader-settings-overlay';
           overlay.innerHTML =
               '<div class="lib-modal-content reader-settings-modal">' +
                   '<div class="lib-modal-header">' +
                       '<h3 data-translation="settings">' + escapeHtml(t('settings')) + '</h3>' +
                       '<button type="button" id="lib-reader-settings-close" class="lib-settings-close-btn" title="' + escapeHtml(t('close')) + '" data-translation="close">' + CLOSE_SVG + '</button>' +
                   '</div>' +
                   '<div class="reader-settings-menu" style="display:flex;flex-direction:column;gap:8px;">' +
                        '<button class="reader-settings-menu-item" data-menu="general">' +
                            '<span class="reader-settings-icon">' + SETTINGS_GEAR_SVG + '</span>' +
                            '<span style="flex:1;" data-translation="generalSettings">' + escapeHtml(t('generalSettings')) + '</span>' +
                            '<span class="reader-settings-chevron">›</span>' +
                        '</button>' +
                   '</div>' +
               '</div>';
           document.body.appendChild(overlay);

           var closeBtn = overlay.querySelector('#lib-reader-settings-close');
           if (closeBtn) {
               closeBtn.addEventListener('click', function () { overlay.remove(); });
           }
           overlay.addEventListener('click', function (e) {
               if (e.target === overlay) overlay.remove();
           });
           overlay.querySelectorAll('[data-menu]').forEach(function (btn) {
               btn.addEventListener('click', function () {
                   var menu = this.getAttribute('data-menu');
                   if (menu === 'general') {
                       overlay.remove();
                       showReaderGeneralSettings();
                   }
               });
           });
       }

        function showReaderGeneralSettings() {
            var existing = document.getElementById('lib-reader-settings-overlay');
            if (existing) { existing.remove(); return; }
            var CLOSE_SVG = (window.RenamerIcons && window.RenamerIcons.CLOSE) || '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"></path></svg>';
            var BACK_SVG = '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 3L5 8L10 13"/></svg>';
            var TRANSLATE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.7l4.6 4.6-4.6 4.6"/><path d="M9.5 9.5A4.5 4.5 0 0 1 15 12.5a4.5 4.5 0 0 1-4.5 4.5 4.5 4.5 0 0 1 0-9 4.5 4.5 0 0 1 4.5 4.5v0"/><path d="M3 3l18 18"/><path d="M12 2v5.5"/></svg>';
            var overlay = document.createElement('div');
            overlay.id = 'lib-reader-settings-overlay';
            overlay.className = 'lib-modal-overlay reader-settings-overlay';
            overlay.innerHTML =
                '<div class="lib-modal-content reader-settings-modal">' +
                    '<div class="lib-modal-header">' +
                        '<button type="button" id="lib-reader-settings-back" class="lib-settings-close-btn" title="' + escapeHtml(t('back')) + '" data-translation="back">' + BACK_SVG + '</button>' +
                        '<h3 id="lib-reader-settings-title" data-translation="generalSettings">' + escapeHtml(t('generalSettings')) + '</h3>' +
                        '<button type="button" id="lib-reader-settings-close" class="lib-settings-close-btn" title="' + escapeHtml(t('close')) + '" data-translation="close">' + CLOSE_SVG + '</button>' +
                    '</div>' +
                    '<div id="lib-reader-settings-content" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;">' +
                        '<button type="button" id="lib-reader-general-translations-btn" class="reader-settings-general-item" data-translation="manageTranslations">' +
                            '<span class="reader-settings-icon">' + TRANSLATE_SVG + '</span>' +
                            '<span style="flex:1;" data-translation="manageTranslations">' + escapeHtml(t('manageTranslations')) + '</span>' +
                            '<span class="reader-settings-chevron">›</span>' +
                        '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);
            overlay.querySelector('#lib-reader-settings-back').addEventListener('click', function () {
                overlay.remove();
                showReaderSettings();
            });
            overlay.querySelector('#lib-reader-settings-close').addEventListener('click', function () {
                overlay.remove();
            });
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.remove();
            });
            var tradBtn = overlay.querySelector('#lib-reader-general-translations-btn');
            if (tradBtn) {
                tradBtn.addEventListener('click', function () {
                    overlay.remove();
                    showReaderTranslationsPanel();
                });
            }
        }

        function showReaderTranslationsPanel() {
            var existing = document.getElementById('lib-reader-settings-overlay');
            if (existing) { existing.remove(); return; }
            var CLOSE_SVG = (window.RenamerIcons && window.RenamerIcons.CLOSE) || '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"></path></svg>';
            var BACK_SVG = '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 3L5 8L10 13"/></svg>';
            var overlay = document.createElement('div');
            overlay.id = 'lib-reader-settings-overlay';
            overlay.className = 'lib-modal-overlay reader-settings-overlay';
            overlay.innerHTML =
                '<div class="lib-modal-content reader-settings-modal">' +
                    '<div class="lib-modal-header">' +
                        '<button type="button" id="lib-reader-settings-back" class="lib-settings-close-btn" title="' + escapeHtml(t('back')) + '" data-translation="back">' + BACK_SVG + '</button>' +
                        '<h3 id="lib-reader-settings-title" data-translation="manageTranslations">' + escapeHtml(t('manageTranslations')) + '</h3>' +
                        '<button type="button" id="lib-reader-settings-close" class="lib-settings-close-btn" title="' + escapeHtml(t('close')) + '" data-translation="close">' + CLOSE_SVG + '</button>' +
                    '</div>' +
                    '<div id="lib-reader-settings-search-wrapper" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative;">' +
                        '<input type="text" id="lib-reader-translation-search" placeholder="' + escapeHtml(t('metadataSearch') || 'Rechercher...') + '" style="flex:1;max-width:200px;font-size:13px;padding:4px 8px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);" data-translation="metadataSearch" />' +
                        '<button type="button" id="lib-reader-translation-lang" class="reader-settings-btn-small" data-translation="switchLang" style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;"><span class="lib-lang-label">' + state.settingsLangView.toUpperCase() + '</span> <svg fill="currentColor" width="12" height="12" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>' +
                        '<button type="button" id="lib-reader-translation-add-lang" class="reader-settings-btn-small" data-translation="addLanguage" title="' + escapeHtml(t('newLanguageLabel')) + '" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;font-size:14px;">+</button>' +
                        '<div id="lib-reader-translations-lang-dropdown" class="lib-translation-lang-dropdown" style="display:none;position:absolute;z-index:10001;min-width:100px;"></div>' +
                    '</div>' +
                    '<div id="lib-reader-settings-content" style="overflow-y:auto;flex:1;min-height:200px;"></div>' +
                '</div>';
            document.body.appendChild(overlay);
            overlay.querySelector('#lib-reader-settings-back').addEventListener('click', function () {
                overlay.remove();
                showReaderGeneralSettings();
            });
            overlay.querySelector('#lib-reader-settings-close').addEventListener('click', function () {
                overlay.remove();
            });
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.remove();
            });

            var langBtn = overlay.querySelector('#lib-reader-translation-lang');
            var langDropdown = overlay.querySelector('#lib-reader-translations-lang-dropdown');
            var addLangBtn = overlay.querySelector('#lib-reader-translation-add-lang');
            var wrapperEl = overlay.querySelector('#lib-reader-settings-search-wrapper');

            refreshLangDropdown(langBtn, langDropdown);

            langBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (langDropdown.style.display === 'none') {
                    var rect = langBtn.getBoundingClientRect();
                    var wr = wrapperEl.getBoundingClientRect();
                    langDropdown.style.left = (rect.left - wr.left) + 'px';
                    langDropdown.style.top = (rect.bottom - wr.top + 4) + 'px';
                    langDropdown.style.display = 'block';
                } else {
                    langDropdown.style.display = 'none';
                }
            });
            addLangBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                langDropdown.style.display = 'none';
                showAddLanguageModal();
            });
            document.addEventListener('click', function onOutside(e) {
                if (!langDropdown.contains(e.target) && e.target !== langBtn && e.target !== addLangBtn) {
                    langDropdown.style.display = 'none';
                    document.removeEventListener('click', onOutside);
                }
            });

            var searchInput = overlay.querySelector('#lib-reader-translation-search');
            searchInput.addEventListener('input', function () {
                applyLibTranslationFilter();
            });

            if (!state.customTranslations) {
                loadCustomTranslations().then(function () {
                    renderLibTranslations();
                });
            } else {
                renderLibTranslations();
            }
        }


       function renderLibTranslations() {
           var content = document.getElementById('lib-reader-settings-content');
           if (!content) return;
           var viewLang = state.settingsLangView;
           var allKeys = new Set();
           Object.keys(TR).forEach(function (l) {
               Object.keys(TR[l] || {}).forEach(function (k) { allKeys.add(k); });
           });
           var sortedKeys = Array.from(allKeys).sort();
           if (!sortedKeys.length) {
               content.innerHTML = '<div class="reader-settings-translations"><div style="opacity:0.5;font-size:13px;padding:12px;text-align:center;" data-translation="noTranslations">' + escapeHtml(t('noTranslations')) + '</div></div>';
               return;
           }
           var html = '<div class="reader-settings-translations">';
           html += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
           html += '<button type="button" class="reader-settings-btn-small" id="lib-reader-export-translations" data-translation="exportAllTranslations" style="flex:1;">' + escapeHtml(t('exportAllTranslations')) + '</button>';
           html += '<button type="button" class="reader-settings-btn-small" id="lib-reader-import-translations" data-translation="importAllTranslations" style="flex:1;">' + escapeHtml(t('importAllTranslations')) + '</button>';
           html += '<input type="file" id="lib-reader-import-file" accept="application/json,.json" style="display:none;" />';
           html += '</div>';
           sortedKeys.forEach(function (key) {
               var customVal = null;
               if (state.customTranslations && state.customTranslations[key] && state.customTranslations[key][viewLang] !== undefined && state.customTranslations[key][viewLang] !== null && state.customTranslations[key][viewLang] !== '') {
                   customVal = state.customTranslations[key][viewLang];
               }
               var rawBase = (TR[viewLang] && TR[viewLang][key]);
               var baseVal = typeof rawBase === 'string' ? rawBase : (rawBase === null || rawBase === undefined ? '' : String(rawBase));
               var rawValue = customVal !== null ? customVal : baseVal;
               var value = typeof rawValue === 'string' ? rawValue : String(rawValue);
               html += '<div class="reader-settings-item" data-translation-key="' + escapeHtml(key) + '">';
               html += '<div class="reader-settings-item-name"><code>' + escapeHtml(key) + '</code></div>';
               html += '<div class="reader-settings-item-actions-wrapper" style="display:flex;align-items:center;gap:8px;">';
               html += '<input type="text" data-original="' + escapeHtml(value) + '" value="' + escapeHtml(value) + '" style="flex:1;font-size:13px;padding:4px 8px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);box-sizing:border-box;" />';
               html += '<button type="button" class="reader-settings-btn-small reader-settings-btn-primary" data-action="save" data-translation="save" style="flex-shrink:0;">' + escapeHtml(t('save')) + '</button>';
               html += '</div></div>';
           });
           html += '</div>';
           content.innerHTML = html;

           content.querySelectorAll('.reader-settings-item[data-translation-key]').forEach(function (item) {
               var key = item.getAttribute('data-translation-key');
               var saveBtn = item.querySelector('[data-action="save"]');
               if (saveBtn) {
                   saveBtn.addEventListener('click', function () {
                       var input = item.querySelector('input');
                       if (!input) return;
                       var newVal = input.value.trim();
                       if (!newVal) return;
                        if (!TR[viewLang]) TR[viewLang] = {};
                        TR[viewLang][key] = newVal;
                        if (!state.customTranslations) state.customTranslations = {};
                        if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                        state.customTranslations[key][viewLang] = newVal;
                       saveCustomTranslation(key, newVal, viewLang).then(function () {
                           showLibToast(t('translationSaved'), 'success');
                           input.setAttribute('data-original', newVal);
                       }).catch(function () {
                           showLibToast(t('importError'), 'error');
                       });
                   });
               }
           });

           var exportBtn = content.querySelector('#lib-reader-export-translations');
           if (exportBtn) {
               exportBtn.addEventListener('click', function () {
                   var allLangs = Object.keys(TR);
                   var allKeysSet = new Set();
                   allLangs.forEach(function (l) {
                       Object.keys(TR[l] || {}).forEach(function (k) { allKeysSet.add(k); });
                   });
                   var exportObj = {
                       translations: Array.from(allKeysSet).sort().map(function (key) {
                           var obj = { translationKey: key };
                           allLangs.forEach(function (l) {
                               obj[l] = (TR[l] && TR[l][key]) || '';
                           });
                           return obj;
                       })
                   };
                   var jsonStr = JSON.stringify(exportObj, null, 2);
                   var blob = new Blob([jsonStr], { type: 'application/json' });
                   var url = URL.createObjectURL(blob);
                   var a = document.createElement('a');
                   a.href = url;
                   a.download = 'renamer-translations.json';
                   document.body.appendChild(a);
                   a.click();
                   document.body.removeChild(a);
                   URL.revokeObjectURL(url);
                   showLibToast(t('translationsExported'), 'success');
               });
           }

           var importBtn = content.querySelector('#lib-reader-import-translations');
           var importFile = content.querySelector('#lib-reader-import-file');
           if (importBtn && importFile) {
               importBtn.addEventListener('click', function () {
                   importFile.click();
               });
               importFile.addEventListener('change', function (e) {
                   var file = e.target.files[0];
                   if (!file) return;
                   var reader = new FileReader();
                   reader.onload = function (evt) {
                       try {
                           var imported = JSON.parse(evt.target.result);
                           if (Array.isArray(imported) && imported.length > 0 && imported[0].translationKey) {
                               imported.forEach(function (item) {
                                   var key = item.translationKey;
                                   Object.keys(item).forEach(function (l) {
                                       if (l !== 'translationKey' && item[l] !== undefined && item[l] !== null && item[l] !== '') {
                                           if (!TR[l]) TR[l] = {};
                                           TR[l][key] = item[l];
                                            if (!state.customTranslations) state.customTranslations = {};
                                            if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                                            state.customTranslations[key][l] = item[l];
                                           if (l === state.settingsLangView) {
                                               saveCustomTranslation(key, item[l], l).catch(function () {});
                                           }
                                       }
                                   });
                               });
                           } else if (typeof imported === 'object' && !Array.isArray(imported)) {
                               if (!TR[state.settingsLangView]) TR[state.settingsLangView] = {};
                               Object.keys(imported).forEach(function (key) {
                                   if (imported[key] !== undefined && imported[key] !== null && imported[key] !== '') {
                                       TR[state.settingsLangView][key] = imported[key];
                                    if (!state.customTranslations) state.customTranslations = {};
                                    if (typeof state.customTranslations[key] !== 'object') state.customTranslations[key] = {};
                                    state.customTranslations[key][state.settingsLangView] = imported[key];
                                       saveCustomTranslation(key, imported[key], state.settingsLangView).catch(function () {});
                                   }
                               });
                           }
                           showLibToast(t('translationsImported'), 'success');
                           renderLibTranslations();
                       } catch (err) {
                           showLibToast(t('importError'), 'error');
                       }
                   };
                   reader.readAsText(file);
               });
           }

           applyLibTranslationFilter();
       }

       function applyLibTranslationFilter() {
           var searchInput = document.getElementById('lib-reader-translation-search');
           var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
           var items = document.querySelectorAll('.reader-settings-item[data-translation-key]');
           items.forEach(function (item) {
               var key = item.getAttribute('data-translation-key');
               if (!query) {
                   item.style.display = '';
                   return;
               }
               var visible = key.toLowerCase().includes(query);
               if (!visible) {
                   Object.keys(TR).some(function (l) {
                       var raw = (TR[l] && TR[l][key]);
                       var val = typeof raw === 'string' ? raw : (raw === null || raw === undefined ? '' : String(raw));
                       if (val.toLowerCase().includes(query)) {
                           visible = true;
                           return true;
                       }
                       return false;
                   });
               }
               item.style.display = visible ? '' : 'none';
           });
        }

        function refreshLangDropdown(langBtn, langDropdown) {
            langDropdown.innerHTML = '';
            var langs = Object.keys(TR).filter(function(l) { return TR[l] && typeof TR[l] === 'object'; }).sort();
            if (!langs.length) langs = ['fr', 'en'];
            langs.forEach(function (l) {
                var item = document.createElement('div');
                item.className = 'lib-context-item';
                item.textContent = l.toUpperCase();
                item.addEventListener('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                     state.settingsLangView = l;
                     lang = l;
                     var langLabel = langBtn.querySelector('.lib-lang-label');
                     if (langLabel) langLabel.textContent = l.toUpperCase();
                     langDropdown.style.display = 'none';
                     if (typeof RenamerUtils !== 'undefined' && RenamerUtils.setModalLabels) {
                         RenamerUtils.setModalLabels({ confirm: t('confirm'), cancel: t('cancel'), close: t('close') });
                     }
                     render();
                     refreshTranslations();
                    renderLibTranslations();
                    showLibToast(t('languageChanged'), 'info', t('setAsDefault'), function () {
                        state.defaultLang = l;
                        localStorage.setItem('renamer_default_lang', l);
                        showLibToast(t('languageChanged'), 'info');
                    });
                });
                langDropdown.appendChild(item);
            });
        }

        function getLangs() {
            return Object.keys(TR).filter(function(l) { return TR[l] && typeof TR[l] === 'object'; }).sort();
        }

        function createLanguage(code, sourceLang) {
            if (TR[code]) {
                showLibToast(t('languageExists'), 'error');
                return false;
            }
            TR[code] = {};
            if (sourceLang && TR[sourceLang]) {
                Object.keys(TR[sourceLang]).forEach(function (key) {
                    TR[code][key] = '';
                });
            } else {
                var langs = getLangs();
                langs.forEach(function (srcLang) {
                    if (TR[srcLang]) {
                        Object.keys(TR[srcLang]).forEach(function (key) {
                            if (TR[code][key] === undefined) TR[code][key] = '';
                        });
                    }
                });
            }
            state.settingsLangView = code;
            var langLabel = document.querySelector('#lib-reader-translation-lang .lib-lang-label');
            if (langLabel) langLabel.textContent = code.toUpperCase();
            var dd = document.getElementById('lib-reader-translations-lang-dropdown');
            var lb = document.getElementById('lib-reader-translation-lang');
            if (dd && lb) refreshLangDropdown(lb, dd);
            renderLibTranslations();
            showLibToast(t('languageAdded'), 'success');
            return true;
        }

        function showAddLanguageModal() {
            var existing = document.getElementById('lib-add-lang-modal');
            if (existing) { existing.remove(); return; }
            var modal = document.createElement('div');
            modal.id = 'lib-add-lang-modal';
            modal.className = 'lib-modal-overlay';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100001;';
            modal.innerHTML =
                '<div class="lib-modal-content" style="background:var(--nc-bg);border-radius:16px;padding:20px;max-width:400px;width:90%;color:var(--nc-text);">' +
                    '<h3 style="margin:0 0 12px;font-size:16px;">' + escapeHtml(t('newLanguageLabel')) + '</h3>' +
                    '<input type="text" id="lib-add-lang-input" placeholder="' + escapeHtml(t('inputLanguageCode') || 'ex: es') + '" style="width:100%;padding:6px 8px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);font-size:13px;margin-bottom:16px;box-sizing:border-box;" />' +
                    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
                        '<button type="button" id="lib-add-lang-cancel" class="renamer-btn-small" style="padding:6px 12px;font-size:13px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);cursor:pointer;">' + escapeHtml(t('cancel')) + '</button>' +
                        '<button type="button" id="lib-add-lang-create" class="renamer-btn-small renamer-btn-primary" style="padding:6px 12px;font-size:13px;border:1px solid var(--reader-accent);border-radius:4px;background:var(--reader-accent);color:#fff;cursor:pointer;">' + escapeHtml(t('createLanguage')) + '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
            var input = modal.querySelector('#lib-add-lang-input');
            modal.querySelector('#lib-add-lang-cancel').addEventListener('click', function () { modal.remove(); });
            modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    attemptCreate(input.value.trim());
                }
            });
            modal.querySelector('#lib-add-lang-create').addEventListener('click', function () {
                attemptCreate(input.value.trim());
            });
            input.focus();

            function attemptCreate(code) {
                if (code) {
                    if (createLanguage(code, 'fr')) {
                        modal.remove();
                    }
                } else {
                    showBasedOnModal();
                }
            }

            function showBasedOnModal() {
                modal.remove();
                var bModal = document.createElement('div');
                bModal.id = 'lib-add-lang-modal';
                bModal.className = 'lib-modal-overlay';
                bModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100001;';
                var existingLangs = getLangs();
                var buttonsHtml = '<div style="display:flex;flex-direction:column;gap:8px;">';
                buttonsHtml += '<div style="font-size:13px;color:var(--nc-text);opacity:0.7;margin-bottom:8px;">' + escapeHtml(t('fillManuallyHint')) + '</div>';
                existingLangs.forEach(function (l) {
                    buttonsHtml += '<button type="button" data-src="' + escapeHtml(l) + '" class="lib-based-on-btn" style="padding:8px 12px;font-size:13px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);cursor:pointer;text-align:left;">' + escapeHtml(t('basedOn')) + ' [' + l + ']</button>';
                });
                buttonsHtml += '</div>';
                bModal.innerHTML =
                    '<div class="lib-modal-content" style="background:var(--nc-bg);border-radius:16px;padding:20px;max-width:400px;width:90%;color:var(--nc-text);">' +
                        '<h3 style="margin:0 0 12px;font-size:16px;">' + escapeHtml(t('newLanguageLabel')) + '</h3>' +
                        '<input type="text" id="lib-add-lang-input2" placeholder="' + escapeHtml(t('inputLanguageCode') || 'ex: es') + '" style="width:100%;padding:6px 8px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);font-size:13px;margin-bottom:16px;box-sizing:border-box;" />' +
                        buttonsHtml +
                        '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--nc-border);font-size:13px;">' +
                            '<div style="display:flex;align-items:center;gap:8px;">' +
                                '<label style="white-space:nowrap;">' + escapeHtml(t('otherLanguage')) + '</label>' +
                                '<input type="text" id="lib-other-lang-input" placeholder="ex: de" style="flex:1;padding:6px 8px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);font-size:13px;box-sizing:border-box;" />' +
                            '</div>' +
                        '</div>' +
                        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
                            '<button type="button" id="lib-add-lang-cancel" class="renamer-btn-small" style="padding:6px 12px;font-size:13px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);cursor:pointer;">' + escapeHtml(t('cancel')) + '</button>' +
                            '<button type="button" id="lib-add-lang-create" class="renamer-btn-small renamer-btn-primary" style="padding:6px 12px;font-size:13px;border:1px solid var(--reader-accent);border-radius:4px;background:var(--reader-accent);color:#fff;cursor:pointer;">' + escapeHtml(t('createLanguage')) + '</button>' +
                        '</div>' +
                    '</div>';
                document.body.appendChild(bModal);
                bModal.addEventListener('click', function (e) { if (e.target === bModal) bModal.remove(); });
                var input2 = bModal.querySelector('#lib-add-lang-input2');
                var otherInput = bModal.querySelector('#lib-other-lang-input');
                bModal.querySelectorAll('.lib-based-on-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var code = input2.value.trim();
                        if (!code) {
                            showLibToast(t('inputLanguageCode'), 'error');
                            input2.focus();
                            return;
                        }
                        var src = btn.getAttribute('data-src');
                        if (createLanguage(code, src)) {
                            bModal.remove();
                        }
                    });
                });
                bModal.querySelector('#lib-add-lang-cancel').addEventListener('click', function () { bModal.remove(); });
                bModal.querySelector('#lib-add-lang-create').addEventListener('click', function () {
                    var code = input2.value.trim();
                    if (!code) { showLibToast(t('inputLanguageCode'), 'error'); return; }
                    var src = otherInput.value.trim() || 'fr';
                    if (TR[src]) {
                        if (createLanguage(code, src)) bModal.remove();
                    } else {
                        if (createLanguage(code)) bModal.remove();
                    }
                });
                input2.focus();
            }
        }

         function showLibToast(message, type, actionLabel, actionCallback) {
            var container = document.getElementById('lib-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'lib-toast-container';
                container.style.cssText = 'position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:8px;z-index:99999;';
                document.body.appendChild(container);
            }
            var toast = document.createElement('div');
            toast.style.cssText = 'min-width:220px;max-width:420px;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:500;color:var(--nc-text);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;gap:8px;';
            var bg = type === 'error' ? '#fbe2e1' : '#e8f5e9';
            var fg = type === 'error' ? '#a01818' : '#1a7f1a';
            toast.style.background = bg;
            toast.style.color = fg;
            toast.textContent = message;
            if (actionLabel && actionCallback) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = actionLabel;
                btn.style.cssText = 'margin-left:auto;font-size:12px;padding:2px 8px;border:1px solid ' + fg + ';border-radius:4px;background:transparent;color:' + fg + ';cursor:pointer;';
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (actionCallback) actionCallback();
                    if (toast.parentNode) toast.remove();
                });
                toast.appendChild(btn);
            }
            container.appendChild(toast);
            setTimeout(function () {
                if (toast.parentNode) toast.remove();
            }, 5000);
        }

       document.addEventListener('DOMContentLoaded', init);

      window.RenamerLibrary = {
          buildBreadcrumb: buildLibBreadcrumb,
          renderBreadcrumb: renderBreadcrumb,
      };
})();
