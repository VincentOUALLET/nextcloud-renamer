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
        var m = first.match(/(\d+(?:\.\d+)?)/);
        if (!m) return 0;
        var v = parseFloat(m[1]);
        return isNaN(v) ? 0 : v;
    }

    function parseNumberRange(s) {
        if (s == null) return [];
        var nums = String(s).split(/[-–]/).map(function (p) {
            var m = (p || '').match(/(\d+(?:\.\d+)?)/);
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
       var FOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 888.000000 1280.000000" preserveAspectRatio="xMidYMid meet"><g transform="translate(0.000000,1280.000000) scale(0.100000,-0.100000)" fill="' + LIB_ACCENT + '" stroke="none"><path d="M6360 12769 c-418 -109 -1503 -469 -2680 -889 -157 -56 -397 -141 -535 -190 -2192 -776 -2648 -960 -2720 -1099 -55 -108 -138 -1301 -255 -3691 -24 -487 -72 -1638 -95 -2275 -13 -379 -27 -760 -30 -845 -22 -586 -37 -1327 -41 -2075 l-5 -870 229 -245 c226 -241 319 -328 457 -427 152 -108 222 -136 394 -153 371 -37 806 36 1031 174 108 66 395 197 855 391 346 145 722 302 900 375 105 43 341 140 525 215 376 154 1854 746 2085 835 83 32 267 104 410 160 143 56 445 171 670 257 226 85 446 173 490 195 161 81 288 186 348 289 92 157 158 866 237 2562 5 119 15 314 20 432 6 118 15 313 20 433 13 276 28 589 40 860 6 116 15 309 20 427 6 118 15 312 20 430 6 118 15 312 20 430 6 118 14 311 20 428 89 1899 102 2330 79 2632 -17 235 -50 347 -120 410 -53 47 -116 62 -299 70 -187 7 -326 26 -480 65 -355 89 -646 229 -907 437 -168 134 -301 212 -437 258 -94 32 -125 31 -266 -6z m414 -269 c65 -24 14 -72 -179 -165 -196 -95 -419 -183 -1127 -444 -76 -28 -199 -73 -273 -101 -74 -27 -195 -72 -267 -99 -73 -27 -194 -72 -268 -99 -74 -28 -216 -80 -315 -117 -189 -70 -1071 -397 -1335 -495 -161 -60 -275 -102 -915 -340 -1152 -428 -1129 -421 -1206 -400 -73 20 -147 112 -163 201 -11 64 5 86 96 129 249 115 1530 558 2808 970 190 62 426 138 525 170 99 32 281 91 405 130 124 39 335 107 470 150 135 43 459 146 720 228 261 83 543 171 625 197 303 96 346 105 399 85z m358 -422 c10 -9 18 -30 18 -49 0 -28 -7 -39 -42 -64 -159 -116 -969 -463 -2088 -897 -135 -52 -312 -121 -395 -153 -1258 -489 -2471 -924 -2860 -1026 -154 -40 -267 -50 -272 -24 -7 34 55 75 223 147 465 198 2037 818 3569 1408 176 68 520 201 765 295 356 138 887 342 970 373 32 12 94 7 112 -10z m789 -422 c10 -13 19 -27 19 -33 0 -52 -1668 -640 -3570 -1256 -713 -232 -1357 -415 -1526 -435 -52 -6 -73 5 -54 28 41 50 218 123 1090 452 2077 783 3159 1150 3700 1254 64 12 208 16 106 -2 187 -7 -271 -12 -288 -18 -258 -88 -278 -94 -292 -78z c-7 -354 -16 -604 -42 -1211 -16 -366 -22 -475 -85 -1735 -22 -440 -49 -980 -60 -1200 -119 -2375 -222 -3833 -278 -3922 -17 -27 -474 -221 -1306 -554 -608 -244 -1486 -588 -2336 -914 -691 -265 -1434 -542 -1622 -604 -54 -18 -106 -30 -116 -27 -52 17 -61 118 -33 386 53 517 83 1014 216 3540 159 3010 213 3922 265 4465 45 459 53 530 59 536 3 4 303 98 666 209 363 111 980 300 1370 420 391 120 800 245 910 279 110 33 313 94 450 136 962 293 1915 562 1939 548 6 -4 7 -140 3 -352z m-7723 -1132 c50 -17 183 -72 296 -122 356 -156 469 -184 719 -174 207 8 605 64 763 108 40 11 89 22 110 26 33 5 38 3 53 -28 42 -81 40 -389 -10 -1339 -26 -489 -69 -989 -95 -1103 -5 -22 -17 -45 -27 -51 -58 -34 -271 -110 -423 -150 -362 -95 -808 -113 -1085 -45 -105 26 -268 106 -331 163 -171 153 -204 439 -174 1526 15 565 40 1094 56 1188 7 42 27 42 148 1z m149 -3160 c111 -49 214 -83 342 -111 88 -20 129 -22 350 -22 272 -1 302 2 744 75 134 21 246 37 249 34 10 -10 -116 -2322 -153 -2790 -50 -644 -92 -834 -201 -897 -113 -66 -673 -86 -1146 -43 -212 20 -353 47 -427 83 -72 35 -180 141 -216 212 -25 50 -28 68 -38 245 -18 314 7 1357 73 3060 5 143 10 281 10 308 l0 47 162 -81 c90 -45 202 -99 251 -120z"/></g></svg>';
      var CHEVRON_DOWN_SVG = '<svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg>';
      var EDIT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" fill="' + LIB_ACCENT + '"></path></svg>';
      var DELETE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      var SYNC_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 32 32"><path d="M 16 4 C 10.886719 4 6.617188 7.160156 4.875 11.625 L 6.71875 12.375 C 8.175781 8.640625 11.710938 6 16 6 C 19.242188 6 22.132813 7.589844 23.9375 10 L 20 10 L 20 12 L 27 12 L 27 5 L 25 5 L 25 8.09375 C 22.808594 5.582031 19.570313 4 16 4 Z M 25.28125 19.625 C 23.824219 23.359375 20.289063 26 16 26 C 12.722656 26 9.84375 24.386719 8.03125 22 L 12 22 L 12 20 L 5 20 L 5 27 L 7 27 L 7 23.90625 C 9.1875 26.386719 12.394531 28 16 28 C 21.113281 28 25.382813 24.839844 27.125 20.375 Z" fill="' + LIB_ACCENT + '"></path></svg>';
     var MARK_READ_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>';
     var MARK_UNREAD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>';
     var OPEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6a2 2 0 0 1 2-2h3l2 3h6l2-3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"></path></svg>';
     var NAVIGATE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + LIB_ACCENT + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 19 19 12 12 5"></polyline></svg>';
     var OPEN_BOOK_READ_SVG = (window.RenamerIcons && window.RenamerIcons.OPEN_BOOK_READ) || '';
     var READ_CHECK_SVG = (window.RenamerIcons && window.RenamerIcons.READ_CHECK) || '';
        var EXPAND_SVG = (window.RenamerIcons && window.RenamerIcons.EXPAND) || '';
     var COLLAPSE_SVG = (window.RenamerIcons && window.RenamerIcons.COLLAPSE) || '';
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
         isFullscreen: false,
        readerFavoritesOnly: false,
        covers: {},          // Map<cheminSource, coverUrl|null> (bulké par /api/covers/list)
        coversLoaded: false, // true après le premier bulk covers
        collectionsByLib: {}, // Map<libId, collections[]> pour couvrir les cards bibliothèque
         coverWidth: 300,     // taille rendue serveur (px) — le browser downscale
         customTranslations: null, // loaded from /api/translations
         settingsLangView: 'fr',
    };

    var TR = {
        fr: {
            title: 'Bibliothèque',
            addLibrary: 'Ajouter une librairie',
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
             loading: 'Chargement…',
             rename: 'Renommer',
             renameLibrary: 'Renommer la librairie',
             renameCollection: 'Renommer la collection',
             renamed: 'Renommé',
             renamedError: 'Renommage échoué',
             contextDelete: 'Supprimer',
             contextDeleteLib: 'Supprimer la librairie',
             contextDeleteCol: 'Supprimer la collection',
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
               metadataSearch: 'Rechercher...',
         },
         en: {
             title: 'Library',
            addLibrary: 'Add a library',
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
             loading: 'Loading…',
             rename: 'Rename',
             renameLibrary: 'Rename library',
             renameCollection: 'Rename collection',
             renamed: 'Renamed',
             renamedError: 'Rename failed',
             contextDelete: 'Delete',
             contextDeleteLib: 'Delete library',
             contextDeleteCol: 'Delete collection',
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
               metadataSearch: 'Search...',
         },
     };
     var LANG = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.slice(0, 2) : 'fr';
    var lang = TR[LANG] ? LANG : 'fr';

    function t(key) {
        var dict = TR[lang] || TR.fr;
        return dict[key] || TR.fr[key] || key;
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
        // Un seul bulk par cycle libraries : évite les boucles render↔load.
        if (state.coversLoaded) {
            if (typeof cb === 'function') cb(false);
            return;
        }
        var paths = [];
        var seen = {};
        (tomePaths || []).forEach(function (f) {
            var p = f.path;
            if (p && !seen[p]) {
                seen[p] = true;
                paths.push(p);
            }
        });
        if (!paths.length) {
            state.coversLoaded = true;
            if (typeof cb === 'function') cb(false);
            return;
        }
        state.coversLoaded = true; // verrou anti-double-fetch
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
            if (typeof cb === 'function') cb(true);
        }).catch(function (err) {
            if (window.console && console.error) {
                console.error('[Renamer covers] coversList failed:', err && err.message ? err.message : err);
            }
            state.coversLoaded = false;
            if (typeof cb === 'function') cb(false);
        });
    }

    function renderTomeIcon(f) {
        var icon = fileIcon(f.type);
        var url = coverUrl(f.path);
        if (url) {
            return '<img class="lib-card-img" src="' + url + '" alt="' + escapeHtml(icon) + '" loading="eager" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">';
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
        return fetch(url, opts).then(function (r) {
            if (!r.ok) {
                return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t); });
            }
            return r.json();
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
                 showToast(t('markedRead'), 'info');
                 if (state.view === 'tomes' && state.currentCollection) { renderTomes(state.currentCollection); }
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
                 delete state.bookmarks[path];
                 showToast(t('markedUnread'), 'info');
                 if (state.view === 'tomes' && state.currentCollection) { renderTomes(state.currentCollection); }
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
                 paths.forEach(function (p) { state.bookmarks[p] = { type: 'read', value: 0, total: 0, timestamp: Date.now() }; });
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
                 paths.forEach(function (p) { delete state.bookmarks[p]; });
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
             if (state.view === 'collection' && state.currentLibrary) { renderCollections(state.currentLibrary); }
         });
     }

     function markCollectionUnread(collection, lib) {
         var paths = collectPaths(collection);
         markPathsUnread(paths, function () {
             if (state.view === 'collection' && state.currentLibrary) { renderCollections(state.currentLibrary); }
         });
     }

     function markNodeRead(node, collection) {
         var paths = collectPaths(node);
         markPathsRead(paths, function () {
             if (state.view === 'tomes' && state.currentCollection) { renderTomes(state.currentCollection); }
         });
     }

     function markNodeUnread(node, collection) {
         var paths = collectPaths(node);
         markPathsUnread(paths, function () {
             if (state.view === 'tomes' && state.currentCollection) { renderTomes(state.currentCollection); }
         });
     }

    function injectStyles() {
        if (document.getElementById('lib-styles')) return;
        var style = document.createElement('style');
        style.id = 'lib-styles';
        style.textContent =
            ':root{--lib-settings-btn-bg:#F0E9FE}@media (prefers-color-scheme: dark){:root{--lib-settings-btn-bg:#2C223B}}' +
            'body,html{user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-drag:none}' +
            '.lib-page-app{display:flex;flex-direction:row;height:calc(100vh - 64px);width:100%;overflow:hidden;background:var(--color-background-assistant);color:var(--reader-accent-lighter);font-family:var(--nc-font-family,"Segoe UI",sans-serif);--lib-nav-accent:#a855f7;}' +
            '.lib-page-app.fullscreen{height:100dvh!important;width:100dvw!important;}' +
            '#content.app-renamer.fullscreen{height:100dvh!important;max-height:100dvh!important;padding:0!important;margin:0!important;overflow:hidden;position:absolute;top:0;left:0;width:100dvw;border-radius:0;z-index:10000;}' +
            '.lib-fullscreen-toggle{background:transparent;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:4px;opacity:0.6;color:var(--nc-text);transition:var(--nc-transition);margin-left:4px;}' +
            '.lib-fullscreen-toggle:hover{opacity:1;background:rgba(0,130,201,0.06);color:var(--reader-accent-light);}' +
            '.lib-fullscreen-toggle svg{width:18px;height:18px;}' +
             '.lib-page-header{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px;border-bottom:1px solid var(--nc-border);background:var(--nc-bg-hover);position:sticky;top:0;z-index:10;}' +
            '#lib-breadcrumb{margin-right:auto;flex:1;min-width:0;}' +
            '#lib-breadcrumb .navigation-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:2px;}' +
            '#lib-breadcrumb .breadcrumb__crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:2px;list-style:none;margin:0;padding:0;}' +
            '#lib-breadcrumb .navigation-crumb{display:inline-flex;align-items:center;gap:2px;}' +
            '#lib-breadcrumb .navigation-crumb a{text-decoration:none;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-crumb a .button-vue__text{color:var(--lib-nav-accent);font-size:13px;}' +
            '#lib-breadcrumb .navigation-crumb:hover a .button-vue__text{color:var(--nc-text);}' +
            '#lib-breadcrumb .navigation-crumb.active a{pointer-events:none;}' +
            '#lib-breadcrumb .navigation-crumb.active a .button-vue__text{color:var(--reader-accent-lighter);font-weight:600;}' +
            '#lib-breadcrumb .vue-crumb__separator{display:inline-flex;align-items:center;opacity:0.7;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-breadcrumb-star{background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:14px;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-breadcrumb-star:hover{opacity:1;}' +
            '#lib-breadcrumb .navigation-breadcrumb-star[data-favorite="true"]{opacity:1;color:var(--lib-nav-accent);}' +
            '#lib-breadcrumb .navigation-nav-more{background:transparent;border:none;cursor:pointer;opacity:0.6;font-size:14px;color:var(--nc-text);}' +
            '#lib-breadcrumb .navigation-nav-more:hover{opacity:1;}' +
            '#lib-folder-breadcrumb .navigation-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:2px;}' +
            '#lib-folder-breadcrumb .breadcrumb__crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:2px;list-style:none;margin:0;padding:0;}' +
            '#lib-folder-breadcrumb .navigation-crumb{display:inline-flex;align-items:center;gap:2px;}' +
            '#lib-folder-breadcrumb .navigation-crumb a{text-decoration:none;color:var(--lib-nav-accent);}' +
            '#lib-folder-breadcrumb .navigation-crumb a .button-vue__text{color:var(--lib-nav-accent);font-size:13px;}' +
            '#lib-folder-breadcrumb .navigation-crumb:hover a .button-vue__text{color:var(--nc-text);}' +
            '#lib-folder-breadcrumb .navigation-crumb.active a{pointer-events:none;}' +
            '#lib-folder-breadcrumb .navigation-crumb.active a .button-vue__text{color:var(--reader-accent-lighter);font-weight:600;}' +
            '#lib-folder-breadcrumb .vue-crumb__separator{display:inline-flex;align-items:center;opacity:0.7;color:var(--lib-nav-accent);}' +
            '.lib-page-title{font-size:18px;font-weight:600;color:var(--nc-text);}' +
            '.lib-page-content{flex:1;overflow-y:auto;padding:16px;scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
            '.lib-main{flex:1;display:flex;flex-direction:column;min-width:0;}' +
            '.lib-sidebar{width:230px;min-width:230px;background:var(--nc-bg-hover);border-right:1px solid var(--nc-border);display:flex;flex-direction:column;flex-shrink:0;transition:width 220ms ease-in-out;z-index:5;position:relative;}' +
            '.lib-sidebar.collapsed{width:0;min-width:0;overflow:hidden;}' +
            '.lib-sidebar-header{display:flex;align-items:center;height:56px;padding:0 12px;border-bottom:1px solid var(--nc-border);}' +
            '.lib-sidebar-header{display:flex;align-items:center;height:56px;padding:0 12px;border-bottom:1px solid var(--nc-border);}' +
'.button:not(.button-vue,[class^=vs__]).lib-sidebar-toggle{background-color:rgba(168,85,247,0.08);border:none;font-size:22px;cursor:pointer;opacity:0.9;flex-shrink:0;color:var(--reader-accent-light);margin-right:5px;}' +
            '.lib-sidebar-toggle:hover{opacity:1;color:var(--reader-accent-light);background-color:rgba(0,130,201,0.06);}' +
            '.lib-sidebar-menu{flex:1;overflow-y:auto;padding:8px 0 60px;scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
            '.lib-sidebar-menu::-webkit-scrollbar{width:6px}' +
            '.lib-sidebar-menu::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '.lib-sidebar-menu::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '.lib-page-content::-webkit-scrollbar{width:8px}' +
            '.lib-page-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '.lib-page-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:4px}' +
            '.lib-sidebar-sub::-webkit-scrollbar{width:6px}' +
            '.lib-sidebar-sub::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '.lib-sidebar-sub::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '.reader-zoomed::-webkit-scrollbar{width:12px;height:12px}' +
            '.reader-zoomed::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '.reader-zoomed::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:6px}' +
            '.reader-zoomed::-webkit-scrollbar-thumb:hover{background:var(--lib-nav-accent)}' +
            '.reader-zoomed{scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
            '.reader-settings-menu::-webkit-scrollbar{width:6px}' +
            '.reader-settings-menu::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '.reader-settings-menu::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '.reader-settings-menu{scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
            '.lib-sidebar-item{display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;-webkit-touch-callout:none;}' +
            '.lib-sidebar-item:hover{background:rgba(0,130,201,0.06);}' +
            '.lib-sidebar-item.active,.lib-sidebar-item.active .lib-sidebar-icon{background:rgba(168,85,247,0.08);font-weight:600;color:var(--lib-nav-accent);}' +
            '.lib-sidebar-item.active .lib-sidebar-icon{color:var(--lib-nav-accent);}' +
            '.lib-sidebar-icon{width:22px;text-align:center;font-size:16px;}' +
             '.lib-sidebar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}' +
             '.lib-sidebar-item.addLib > .lib-sidebar-icon{display:none;}' +
             '.lib-sidebar-item.addLib > .lib-sidebar-label{display:flex;justify-content:center;align-items:center;width:100%;font-size:18px;padding:0;}' +
'.lib-sidebar-sub{margin-left:12px;overflow:hidden;height:0;transition:height 250ms ease;}' +
            '.lib-sidebar-sub.expanded{overflow-y:auto;scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
              '.lib-sidebar-sub .lib-sidebar-item{margin:0 8px;}' +
              '.lib-sidebar-sub .lib-sidebar-icon{width:18px;font-size:14px;}' +
'.lib-sidebar-chevron{display:inline-flex;align-items:center;transition:transform 180ms ease;}' +
'.lib-sidebar-chevron.expanded{transform:rotate(90deg);}' +
'.lib-sidebar-item.sub-open .lib-sidebar-label{color:var(--lib-nav-accent);font-weight:600;}' +
'.lib-context-menu{position:fixed;z-index:99999;min-width:170px;background:var(--color-background-assistant,var(--nc-bg-default));border:1px solid var(--nc-border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);padding:4px 0;font-size:13px;color:var(--nc-text);-webkit-touch-callout:none}' +
'.lib-translation-lang-dropdown{position:absolute;top:100%;right:0;z-index:10001;min-width:100px;background:var(--color-background-assistant,var(--nc-bg-default));border:1px solid var(--nc-border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px 0;font-size:13px;color:var(--nc-text);}' +
'.lib-context-item{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:6px;margin:0 4px;}' +
              '.lib-context-item *{cursor:pointer}' +
              '.lib-context-item:hover{background:rgba(168,85,247,0.08);}' +
            '.lib-context-separator{height:1px;background:var(--nc-border);margin:4px 0;}' +
            '.lib-cards-ctn{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-content:flex-start;}' +
            '.lib-card-portrait{flex:0 0 180px;height:310px;min-width:0;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;cursor:pointer;transition:transform 0.15s;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;position:relative;}' +
            '.lib-card-portrait *, .lib-card *, .lib-collection-card *, .lib-library-card *, .lib-subcollection-card *{cursor:pointer}' +
            '.lib-card-portrait:hover{transform:translateY(-2px);background:rgba(0,130,201,0.06);}' +
            '.lib-card-portrait .lib-card-icon{font-size:32px;text-align:center;margin-bottom:8px;}' +
            '.lib-card-portrait .lib-card-title{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card-portrait .lib-card-sub{font-size:11px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card-portrait .lib-delete-prog-btn{position:absolute;top:8px;right:8px;background:transparent;border:none;color:var(--nc-text);opacity:0.6;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;font-size:14px;line-height:1;font-weight:600;border-radius:50%;transition:opacity 0.15s,background-color 0.15s}' +
            '.lib-card-portrait .lib-delete-prog-btn:hover{background:var(--nc-bg-hover);opacity:1}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:8px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-empty{text-align:center;padding:40px 16px;opacity:0.6;font-size:13px;}' +
            '.lib-sub-col-title{font-size:13px;font-weight:600;margin:16px 0 8px 0;}' +
            '.lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;}' +
             '.lib-card{background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:8px;padding:16px;cursor:pointer;transition:transform 0.15s;-webkit-touch-callout:none;position:relative;}' +
            '.lib-card:hover{transform:translateY(-2px);background:rgba(0,130,201,0.06);}' +
             '.lib-card .lib-icon{font-size:32px;margin-bottom:8px;position:relative;}' +
            '.lib-card-img{width:100%;height:230px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 8px;-webkit-touch-callout:none}' +
            '.lib-card-portrait .lib-card-icon .lib-card-img{width:100%;height:230px;}' +
            '.lib-card-portrait .lib-card-icon{position:relative;}' +
            '.lib-fav-count-badge{position:absolute;bottom:6px;right:6px;background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;min-height:18px;display:flex;align-items:center;justify-content:center;line-height:1;}' +
            '.lib-card .lib-name{font-weight:600;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lib-card .lib-meta{font-size:11px;opacity:0.6;}' +
            '.lib-section{margin-bottom:24px;}' +
            '.lib-section-title{font-weight:600;font-size:14px;margin-bottom:12px;}' +
            '.lib-section-title.lib-section-col-title{margin-top:12px;}' +
            '.lib-fav-count-badge{position:absolute;bottom:6px;right:6px;background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;min-height:18px;display:flex;align-items:center;justify-content:center;line-height:1;}' +
            '.lib-card-portrait .lib-card-icon{position:relative;}' +
            '.lib-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--nc-bg-default);border:1px solid var(--nc-border);border-radius:6px;cursor:pointer;}' +
            '.lib-prog{display:flex;align-items:center;gap:6px;font-size:12px;opacity:0.6;}' +
            '.lib-btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:1px solid var(--nc-border);border-radius:6px;background:var(--nc-bg-default);color:var(--nc-text);font-size:13px;cursor:pointer;}' +
            '.lib-btn:hover{background:var(--nc-bg-hover);}' +
            '.lib-btn-primary{background:var(--nc-button);color:var(--nc-button-text);border-color:var(--nc-button);}' +
            '.lib-btn-primary:hover{background:var(--nc-button-hover);}' +
            '.lib-tome{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--nc-border);}' +
            '@keyframes renamer-spin{to{transform:rotate(360deg)}}' +
            '.renamer-toast-container{position:fixed;bottom:20px;right:20px;z-index:200000;display:flex;flex-direction:column;gap:8px;pointer-events:none;}' +
            '.renamer-toast{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:var(--nc-radius);background:var(--nc-bg);border:1px solid var(--nc-border);box-shadow:0 4px 16px rgba(0,0,0,0.2);font-size:14px;color:var(--nc-text);pointer-events:auto;min-width:200px;max-width:400px;opacity:0;transform:translateX(20px);transition:opacity 250ms ease,transform 250ms ease;}' +
            '.renamer-toast-show{opacity:1;transform:translateX(0);}' +
            '.renamer-toast-info{border-left:4px solid #22c55e;}' +
            '.renamer-toast-success{border-left:4px solid #22c55e;}' +
            '.renamer-toast-error{border-left:4px solid #ef4444;}' +
            '.renamer-toast-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:#fff;flex-shrink:0;}' +
            '.renamer-toast-info .renamer-toast-icon{background:#22c55e;}' +
            '.renamer-toast-success .renamer-toast-icon{background:#22c55e;}' +
            '.renamer-toast-error .renamer-toast-icon{background:#ef4444;}' +
            '.renamer-toast-close{background:transparent;border:none;color:var(--nc-text);cursor:pointer;font-size:16px;opacity:0.6;}' +
            '.renamer-toast-close:hover{opacity:1;}' +
            '#reader-scan-breadcrumb .navigation-breadcrumb,#reader-scan-breadcrumb .navigation-breadcrumb *{font-size:13px;}' +
            '#reader-scan-breadcrumb .navigation-crumb .button-vue__text{color:var(--color-text-maxcontrast);font-size:12px;}' +
            '#reader-scan-breadcrumb .navigation-crumb.active .button-vue__text{color:var(--nc-text);}' +
            '.reader-scan-favorites-item{display:flex;align-items:center;gap:6px;font-size:12px;background:var(--nc-bg-hover);border:1px solid var(--nc-border);border-radius:4px;padding:4px 8px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.reader-scan-favorites-item:hover{background:rgba(0,130,201,0.08);}' +
            '.reader-scan-favorites-star{opacity:0.7;font-size:11px;}' +
            '.reader-scan-folder-row{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;border-radius:6px;border:1px solid var(--nc-border);background:var(--nc-bg-default);transition:var(--nc-transition);}' +
            '.reader-scan-folder-row:hover{background:rgba(0,130,201,0.06);border-color:var(--nc-blue);}' +
            '.reader-scan-folder-row .reader-folder-icon{font-size:16px;opacity:0.8;}' +
            '.reader-scan-file-row{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:6px;border:1px solid var(--nc-border);background:var(--nc-bg-default);opacity:0.6;}' +
            '.reader-scan-file-row .reader-file-icon{font-size:14px;}' +
            '.reader-scan-section-title{font-size:11px;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.04em;margin:10px 0 4px 0;}' +
            '.reader-scan-empty{opacity:0.5;font-size:13px;padding:16px;text-align:center;}' +
            '.reader-scan-table{width:100%;border-collapse:collapse;}' +
            '.reader-scan-table td{padding:0;}' +
            '.lib-tome-status-icon{position:absolute;bottom:11px;right:4px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;opacity:0.85;border-radius: 50px;padding: 5px;background-color: var(--reader-accent);}' +
            '.lib-tome-status-icon svg{display:block;width:16px;height:16px}' +
            '.lib-tome-status-icon.lib-tome-inprogress svg{fill:var(--color-background-assistant)}' +
            '.lib-card-portrait.lib-missing-tome{cursor:default;opacity:0.6;}' +
            '.lib-card-portrait.lib-missing-tome .lib-card-icon{background:var(--nc-bg-hover);border:1px dashed var(--nc-border);}' +
            '.lib-card-portrait.lib-missing-tome .lib-card-icon:before{content:"";display:block;text-align:center;font-size:28px;opacity:0.4;}' +
             '.lib-collection-status-icon{position:absolute;top:8px;right:8px;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;opacity:0.85;border-radius:50px;padding:5px;background-color:var(--reader-accent);}' +
             '.lib-collection-status-icon svg{display:block;width:16px;height:16px}' +
             '.lib-collection-status-icon.lib-tome-inprogress svg{fill:var(--color-background-assistant)}' +
            '.lib-missing-tome-banner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(25deg);background:' + LIB_ACCENT + ';color:#fff;font-size:10px;font-weight:600;padding:4px 12px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);}' +
            '.lib-settings-btn{position:absolute;bottom:0;left:0;right:0;height:48px;border:none;background:var(--lib-settings-btn-bg);border-top:1px solid var(--nc-border);border-radius:0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--nc-text);opacity:0.7;transition:var(--nc-transition);}' +
            '.lib-settings-btn:hover{opacity:1;background:var(--lib-settings-btn-bg);color:var(--reader-accent);}' +
            '.lib-settings-btn svg{width:20px;height:20px;}' +
            '.reader-settings-modal{border-radius:16px;}' +
            '.reader-settings-menu .lib-sidebar-item-like{width:100%;display:flex;align-items:center;gap:8px;padding:12px 16px;text-align:left;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;}' +
            '.reader-settings-menu .lib-sidebar-item-like:hover{background:rgba(168,85,247,0.08);}' +
            '.reader-settings-item{padding:10px;border:1px solid var(--nc-border);border-radius:var(--nc-radius);background:var(--nc-bg);margin-bottom:8px;}' +
            '.reader-settings-item-name{font-weight:500;font-size:14px;margin-bottom:4px;color:var(--nc-text);word-break:break-word;}' +
            '.reader-settings-item input[type="text"]{width:100%;padding:4px 8px;border:1px solid var(--nc-border);border-radius:4px;font-size:13px;box-sizing:border-box;background:var(--nc-bg);color:var(--nc-text);}' +
            '.reader-settings-translations{display:flex;flex-direction:column;gap:8px;}' +
            '.reader-settings-translations .reader-settings-item .reader-settings-item-name code{font-family:monospace;font-size:12px;background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:3px;}' +
            '.reader-settings-btn-row{display:flex;gap:8px;margin-top:6px;justify-content:flex-end;}' +
            '.reader-settings-btn-small{padding:4px 8px;font-size:12px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);cursor:pointer;transition:var(--nc-transition);}' +
            '.reader-settings-btn-small:hover{background:rgba(0,0,0,0.05);}' +
            '.reader-settings-btn-primary{background:var(--reader-accent);color:#fff;border-color:var(--reader-accent);}' +
            '.reader-settings-btn-primary:hover{background:var(--reader-accent-hover);}' +
            '.lib-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;}' +
            '.lib-modal-content{background:var(--nc-bg);border-radius:16px;padding:20px;max-width:520px;width:90%;max-height:80svh;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--nc-text);}' +
            '.lib-modal-header{display:flex;align-items:center;justify-content:space-between;padding:0;}' +
            '.lib-settings-close-btn{background:transparent;border:none;color:var(--nc-text);opacity:0.6;cursor:pointer;font-size:18px;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;transition:var(--nc-transition);}' +
            '.lib-settings-close-btn:hover{opacity:1;background:rgba(0,130,201,0.06);}' +
            '.reader-settings-menu-item{display:flex;align-items:center;gap:8px;padding:12px 16px;text-align:left;cursor:pointer;border-radius:6px;margin:2px 8px;font-size:13px;-webkit-touch-callout:none;transition:var(--nc-transition);}' +
            '.reader-settings-menu-item:hover{background:rgba(168,85,247,0.08);color:var(--lib-nav-accent);}' +
            '.reader-settings-menu-item .reader-settings-icon{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;}' +
            '.reader-settings-menu-item .reader-settings-chevron{margin-left:auto;opacity:0.5;transition:transform 180ms ease;}' +
            '.reader-settings-general-item{display:flex;align-items:center;gap:8px;padding:12px 16px;text-align:left;cursor:pointer;border:1px solid var(--nc-border);border-radius:6px;background:var(--nc-bg);font-size:13px;transition:var(--nc-transition);}' +
            '.reader-settings-general-item:hover{background:rgba(168,85,247,0.08);color:var(--lib-nav-accent);}' +
            '.reader-settings-general-item .reader-settings-chevron{margin-left:auto;opacity:0.5;}' +
            '#lib-reader-settings-content::-webkit-scrollbar{width:6px}' +
            '#lib-reader-settings-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '#lib-reader-settings-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '#lib-reader-settings-content{scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
            '#lib-folder-content::-webkit-scrollbar{width:6px}' +
            '#lib-folder-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '#lib-folder-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '#lib-folder-content{scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}' +
            '#reader-scan-content::-webkit-scrollbar{width:6px}' +
            '#reader-scan-content::-webkit-scrollbar-track{background:var(--nc-bg)}' +
            '#reader-scan-content::-webkit-scrollbar-thumb{background:var(--lib-nav-accent);border-radius:3px}' +
            '#reader-scan-content{scrollbar-color:var(--lib-nav-accent) var(--nc-bg)}'
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

    function getCollectionRoot(collection) {
        if (!collection || !collection.rules) return null;
        var files = collection.rules.files || [];
        var children = collection.rules.children || [];
        var hasOnlyImages = files.length > 0 && files.every(function(f) {
            return IMG_EXT.indexOf(String(f.type || '').toLowerCase()) !== -1;
        });
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
        // Force le rechargement des covers au (re)chargement des bibliothèques.
        state.covers = {};
        state.coversLoaded = false;
        state.collectionsByLib = {};
        state.loadingLibraries = true;
        apiRequest(getBaseUrl() + '/api/reader/libraries').then(function (data) {
            state.loadingLibraries = false;
            if (data && data.success) {
                state.libraries = data.libraries || [];
            } else {
                state.libraries = [];
            }
            renderSidebar();
            renderBreadcrumb();
            if (state.view === 'libraries') {
                renderLibrariesContent();
            }
            if (typeof cb === 'function') cb();
        }).catch(function (err) {
            state.loadingLibraries = false;
            showToast(t('scanError') + ' : ' + (err && err.message ? err.message : err), 'error');
            if (state.view === 'libraries') renderLibrariesContent();
            if (typeof cb === 'function') cb();
        });
    }

    function loadCollections(libraryId, cb) {
        apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + libraryId).then(function (data) {
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

            var parentRowHtml = nav.buildFolderRow();
            if (parentRowHtml) {
                html += parentRowHtml;
            }

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

            if (!folders.length && !files.length && !parentRowHtml) {
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

    function createLibrary(rootFolder, name) {
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
            var classified = classifyScan(files, rootFolder);
            var colNames = Object.keys(classified);
            if (colNames.length === 0) {
                showToast(t('noResults'), 'info');
                return;
            }
            apiRequest(getBaseUrl() + '/api/reader/libraries', {
                method: 'POST',
                body: JSON.stringify({ name: name, description: rootFolder }),
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
                createLibrary(rootFolder, name.trim());
            }, { dialogId: 'renamer-add-lib-prompt', confirmLabel: t('scanConfirm') || 'Scanner', cancelLabel: t('scanCancel') || 'Annuler' });
        });
    }

    function renderReading(tome) {
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

    function closeReaderModal() {
        var overlay = document.getElementById('lib-reader-overlay');
        if (overlay) {
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
            var ipad = window.RenamerIPadOS;
            if (ipad && document.body.classList.contains('renamer-ipados-fullscreen')) {
                ipad.exitCSSFullscreen(null);
            }
            overlay.remove();
        }
        state.readerModal = null;
    }

    function renderTomes(collection) {
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';

        var node = getCurrentNode(collection);
        if (!node) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.textContent = t('noResults');
            container.appendChild(empty);
            return;
        }

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
                filesTitle.textContent = t('tomes') || 'Tomes';
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
            empty2.textContent = t('noResults');
            container.appendChild(empty2);
        }

        var allFiles = collectAllFiles(getCollectionRoot(collection) || {});
        if (!state.coversLoaded && allFiles.length) {
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
            subParts.push(subCount + ' ' + (isImages ? t('files') : t('tomes')));
        }
        var sub = subParts.join(' · ');

        var coverImg = colCover
            ? '<img class="lib-card-img" src="' + colCover + '" alt="' + icon + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.insertAdjacentHTML(\'afterend\',\'' + icon + '\');this.remove();">'
            : '<div style="font-size:28px;text-align:center;">' + icon + '</div>';

         card.innerHTML =
             '<div class="lib-card-icon">' + coverImg + nodeStatusHtml(node) + '</div>' +
             '<div class="lib-card-title" title="' + escapeHtml(node.name || '') + '">' + escapeHtml(node.name || '') + '</div>' +
             '<div class="lib-card-sub">' + escapeHtml(sub) + '</div>';
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
        var subHtml = subLine ? ('<div class="lib-card-sub">' + escapeHtml(subLine) + '</div>') : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + renderTomeStatusIcon(f.path) + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            subHtml +
            (bookmark ? '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress">&times;</button>' : '');
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) {
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
        var delBtn = card.querySelector('.lib-delete-prog-btn');
        if (delBtn) {
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                apiRequest(getBaseUrl() + '/api/reader/progress', {
                    method: 'DELETE',
                    body: JSON.stringify({ path: f.path })
                }).then(function(data) {
                    if (data && data.success) {
                        delete state.bookmarks[f.path];
                        card.remove();
                        showToast(t('progressDeleted'), 'info');
                    } else {
                        showToast(t('scanError'), 'error');
                    }
                }).catch(function() {
                    showToast(t('scanError'), 'error');
                });
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
        var bannerHtml = '<div class="lib-missing-tome-banner"><span>' + escapeHtml(t('missingTome') || 'Tome Manquant') + '</span></div>';
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
         return '<span class="' + cssClass + '" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '">' + icon + '</span>';
     }

     function collectionCardStatusHtml(collection) {
         return nodeStatusHtml(collection);
     }

    function renderTomeStatusIcon(path) {
        if (isTomeRead(path)) {
            return '<span class="lib-tome-status-icon lib-tome-read" title="' + escapeHtml(t('readerRead')) + '" aria-label="' + escapeHtml(t('readerRead')) + '">' + READ_CHECK_SVG + '</span>';
        }
        if (isTomeInProgress(path)) {
            return '<span class="lib-tome-status-icon lib-tome-inprogress" title="' + escapeHtml(t('inProgress')) + '" aria-label="' + escapeHtml(t('inProgress')) + '">' + OPEN_BOOK_READ_SVG + '</span>';
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

    function renderCollections(library) {
        renderSidebar();
        renderBreadcrumb();
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';
        var cols = state.collections || [];
        if (!cols.length) {
            var empty = document.createElement('div');
            empty.className = 'lib-empty';
            empty.textContent = 'Aucune collection';
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
                : '📁';
            var colStatusHtml = collectionCardStatusHtml(col);
            card.innerHTML =
                '<div class="lib-icon">' + colIcon + colStatusHtml + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(col.name || '') + '">' + escapeHtml(col.name || '') + '</div>' +
                '<div class="lib-meta">' + rootFiles.length + ' ' + t('tomes') + (allFiles.length > rootFiles.length ? ' · ' + allFiles.length + ' ' + t('totalFiles') : '') + '</div>';
            card.addEventListener('click', function () {
                state.view = 'tomes';
                state.currentCollection = col;
                state.readerTreePath = [];
                updateUrl({ view: 'tomes', library: String(state.currentLibrary.id), collection: String(col.id) });
                renderTomes(col);
                renderSidebar();
                renderBreadcrumb();
            });
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

        if (!state.coversLoaded) {
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
    }

    function renderLibrariesContent() {
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '';

        var libs = state.libraries || [];

        if (libs.length === 0) {
            var emptyHint = state.isAdmin
                ? ('<div style="margin-bottom:16px;">' + t('emptyHint') + '</div>' +
                   '<button class="lib-btn lib-btn-primary" id="lib-add-lib-btn">' + t('addLibrary') + '</button>')
                : ('<div style="margin-bottom:16px;">' + t('readOnlyHint') + '</div>');
            container.innerHTML =
                '<div class="lib-empty">' +
                    '<div style="font-size:28px;margin-bottom:8px;">📚</div>' +
                    '<div style="font-weight:600;margin-bottom:8px;">' + t('empty') + '</div>' +
                    emptyHint +
                '</div>';
            var addBtn = document.getElementById('lib-add-lib-btn');
            if (addBtn) addBtn.addEventListener('click', addLibrary);
            return;
        }

        var wrap = document.createElement('div');

        var continueSection = document.createElement('div');
        continueSection.className = 'lib-section';
        var continueTitle = document.createElement('div');
        continueTitle.className = 'lib-section-title';
        continueTitle.textContent = t('continueReading');
        continueSection.appendChild(continueTitle);
        var continueList = document.createElement('div');

        var progPaths = [];
        var allTomePaths = [];
        var pendingLibs = libs.length;
        libs.forEach(function (lib) {
            loadCollections(lib.id, function () {
                // Snapshot des collections de cette lib (state.collections est
                // écrasé à chaque appel, on garde le lien dans collectionsByLib).
                state.collectionsByLib[lib.id] = (state.collections || []).slice();
                (state.collections || []).forEach(function (c) {
                    var files = collectAllFiles(c.rules || {});
                    files.forEach(function (f) {
                        progPaths.push({ path: f.path, lib: lib, col: c, file: f });
                        allTomePaths.push(f);
                    });
                });
                // render once collections loaded; bookmarks loaded separately
                renderProgressCards(continueList, progPaths);
                pendingLibs--;
                if (pendingLibs <= 0) {
                    loadCoversBulk(allTomePaths, function (fetched) {
                        if (fetched) render();
                    });
                }
            });
        });

        if (!Object.keys(state.bookmarks).length && !progPaths.length) {
            var emptyProg = document.createElement('div');
            emptyProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            emptyProg.textContent = t('noProgress');
            continueList.appendChild(emptyProg);
        }
        continueSection.appendChild(continueList);
        wrap.appendChild(continueSection);

        var grid = document.createElement('div');
        grid.className = 'lib-grid';
        renderLibraryCards(grid);
        wrap.appendChild(grid);

        container.appendChild(wrap);
    }

    function renderProgressCards(list, progPaths) {
        list.innerHTML = '';
        if (!progPaths.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
            empty.textContent = t('noProgress');
            list.appendChild(empty);
            return;
        }
        apiRequest(getBaseUrl() + '/api/reader/progress/read', {
            method: 'POST',
            body: JSON.stringify({ paths: progPaths.map(function(p) { return p.path; }) })
        }).then(function (data) {
            if (!document.getElementById('lib-content')) return;
            if (data && data.success && data.progress) {
                state.bookmarks = {};
                Object.keys(data.progress).forEach(function(k) {
                    state.bookmarks['/' + k] = data.progress[k];
                });
            }
            list.innerHTML = '';
            var grouped = {};
            progPaths.forEach(function (p) {
                var bm = state.bookmarks[p.path];
                if (!bm || bm.type === 'read') return;
                var libKey = String(p.lib.id);
                if (!grouped[libKey]) grouped[libKey] = { lib: p.lib, items: [] };
                grouped[libKey].items.push(p);
            });
            var hasAny = false;
            Object.keys(grouped).forEach(function (libKey) {
                var g = grouped[libKey];
                hasAny = true;
                var libHeader = document.createElement('div');
                libHeader.className = 'lib-section-sub-title';
                libHeader.style.cssText = 'font-weight:600;font-size:13px;margin-bottom:8px;';
                libHeader.textContent = g.lib.name || '';
                list.appendChild(libHeader);
                var colGroups = {};
                g.items.forEach(function (p) {
                    var colKey = String(p.col.id);
                    if (!colGroups[colKey]) colGroups[colKey] = { col: p.col, items: [] };
                    colGroups[colKey].items.push(p);
                });
                Object.keys(colGroups).forEach(function (colKey) {
                    var cg = colGroups[colKey];
                    var colHeader = document.createElement('div');
                    colHeader.className = 'lib-section-title lib-section-col-title';
                    colHeader.textContent = cg.col.name || t('collection');
                    list.appendChild(colHeader);
                    var cardsCtn = document.createElement('div');
                    cardsCtn.className = 'lib-cards-ctn';
                    cg.items.forEach(function (p) {
                        cardsCtn.appendChild(renderProgressCard(p, cg.col, g.lib));
                    });
                    list.appendChild(cardsCtn);
                });
            });
            if (!hasAny) {
                list.innerHTML = '';
                var noProg = document.createElement('div');
                noProg.style.cssText = 'opacity:0.5;font-size:13px;padding:8px;';
                noProg.textContent = t('noProgress');
                list.appendChild(noProg);
            }
        }).catch(function () {
            list.innerHTML = '';
        });
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
        var subHtml = subLine ? ('<div class="lib-card-sub">' + escapeHtml(subLine) + '</div>') : '';
        card.innerHTML =
            '<div class="lib-card-icon">' + coverImg + renderTomeStatusIcon(p.path) + '</div>' +
            '<div class="lib-card-title" title="' + escapeHtml(titleLine) + '">' + escapeHtml(titleLine) + '</div>' +
            subHtml +
            '<button class="lib-delete-prog-btn" type="button" title="' + escapeHtml(t('deleteProgress')) + '" data-translation="deleteProgress">&times;</button>';
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('lib-delete-prog-btn')) { e.stopPropagation(); return; }
            state.view = 'reading';
            state.currentLibrary = lib;
            state.currentCollection = p.col;
            state.currentTome = { path: p.file.path, name: p.file.name, tome: p.file.tome };
            updateUrl({ view: 'reading', read: p.file.path });
            renderReading(p.file);
            renderSidebar();
            renderBreadcrumb();
        });
        var delBtn = card.querySelector('.lib-delete-prog-btn');
         if (delBtn) {
             delBtn.addEventListener('click', function(e) {
                 e.stopPropagation();
                 apiRequest(getBaseUrl() + '/api/reader/progress', {
                     method: 'DELETE',
                     body: JSON.stringify({ path: p.path })
                 }).then(function(data) {
                     if (data && data.success) {
                         delete state.bookmarks[p.path];
                         card.remove();
                         showToast(t('progressDeleted'), 'info');
                     } else {
                         showToast(t('scanError'), 'error');
                     }
                 }).catch(function() {
                     showToast(t('scanError'), 'error');
                 });
             });
         }
         card.addEventListener('contextmenu', function (e) {
             e.preventDefault();
             var items = [];
             items.push({ label: t('goToCollection'), icon: NAVIGATE_SVG, action: function () { navigateToCollection(p.col, p.lib); } });
             items.push({ type: 'separator' });
             items.push({ label: t('markAsRead'), icon: MARK_READ_SVG, action: function () { markTomeRead(p.file, p.col); } });
             items.push({ label: t('markAsUnread'), icon: MARK_UNREAD_SVG, action: function () { markTomeUnread(p.file, p.col); } });
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
                : '📚';
            card.innerHTML =
                '<div class="lib-icon">' + libIcon + '</div>' +
                '<div class="lib-name" title="' + escapeHtml(lib.name || '') + '">' + escapeHtml(lib.name || '') + '</div>' +
                '<div class="lib-meta">' + (lib.description ? escapeHtml(lib.description) : '') + '</div>';
            card.addEventListener('click', function (e) {
                if (e.target.classList.contains('lib-delete-btn')) return;
                state.view = 'collection';
                state.currentLibrary = lib;
                updateUrl({ view: 'collection', library: String(lib.id) });
                loadCollections(lib.id, function () { renderCollections(lib); });
            });
            card.addEventListener('contextmenu', function (e) {
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
            attachLongPress(card);
            gridEl.appendChild(card);
        });
    }

    function render() {
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
        };
    }

      var MANAGED_URL_KEYS = ['view', 'library', 'collection', 'read', 'node', 'favOnly'];
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
          var newUrl = window.location.pathname + (searchArr.length ? '?' + searchArr.join('&') : '') + window.location.hash;
          window.history.replaceState(null, '', newUrl);
      }

      function handleUrlParams() {
          var params = new URLSearchParams(window.location.search);
          var viewParam = params.get('view');
          var libId = params.get('library');
          var colId = params.get('collection');
          var readPath = params.get('read');
          var nodeParam = params.get('node');
          var favOnlyParam = params.get('favOnly');
          state.readerFavoritesOnly = favOnlyParam === '1';
          state.readerTreePath = nodeParam ? nodeParam.split('.').map(Number) : [];
         if (viewParam === 'favorites') {
             state.view = 'favorites';
             loadLibraries(function () {
                 loadAllCollections(function () {
                     loadReaderFavoritesList(function () {
                         render();
                     });
                 });
             });
             return;
         }
         if (!libId && !colId && !readPath) {
             state.view = viewParam === 'libraries' ? 'libraries' : (viewParam === 'home' ? 'home' : 'libraries');
             loadLibraries();
             return;
         }
        loadLibraries(function () {
            if (libId) {
                var lib = (state.libraries || []).find(function(l) { return String(l.id) === libId; });
                if (!lib) { state.view = 'libraries'; return; }
                loadCollections(lib.id, function () {
                    state.currentLibrary = lib;
                    if (colId) {
                        var col = (state.collections || []).find(function(c) { return String(c.id) === colId; });
                         if (!col) {
                             state.view = 'collection';
                             renderCollections(lib);
                             renderBreadcrumb();
                             return;
                         }
                         loadBookmarksForCollection(lib, col, function () {
                            state.currentCollection = col;
                            state.view = 'tomes';
                             renderTomes(col);
                             renderBreadcrumb();
                             if (readPath && state.view !== 'reading') {
                                 var found = findTomeByPath(readPath);
                                 if (found) {
                                     state.currentTome = found;
                                     renderReading(found);
                                     renderBreadcrumb();
                                 } else {
                                     var imgNode = findImageTomeNodeByFolder(readPath);
                                     if (imgNode) {
                                         renderReadingImages(imgNode, col);
                                         renderBreadcrumb();
                                     }
                                 }
                             }
                        });
                    } else {
                        state.currentLibrary = lib;
                        state.view = 'collection';
                        renderCollections(lib);
                        renderBreadcrumb();
                        if (readPath) {
                            var f2 = findTomeByPath(readPath);
                            if (f2) {
                                state.currentTome = f2;
                                renderReading(f2);
                                renderBreadcrumb();
                            } else {
                                var cols2 = state.collections || [];
                                for (var k = 0; k < cols2.length; k++) {
                                    var imgNode2 = findImageTomeInCollection(cols2[k], readPath);
                                    if (imgNode2) {
                                        state.currentCollection = cols2[k];
                                        state.readerTreePath = [];
                                        renderReadingImages(imgNode2, cols2[k]);
                                        renderBreadcrumb();
                                        break;
                                    }
                                }
                            }
                        }
                    }
                });
            } else if (colId) {
                var foundLib = null;
                var foundCol = null;
                var pending = (state.libraries || []).length;
                if (!pending) { state.view = 'libraries'; return; }
                (state.libraries || []).forEach(function(lib) {
                    loadCollections(lib.id, function () {
                        if (!foundCol) {
                            var match = (state.collections || []).find(function(c) { return String(c.id) === colId; });
                            if (match) {
                                foundLib = lib;
                                foundCol = match;
                            }
                        }
                        pending--;
                        if (pending === 0) {
                            if (foundCol) {
                                loadBookmarksForCollection(foundLib, foundCol, function () {
                                    state.currentLibrary = foundLib;
                                    state.currentCollection = foundCol;
                                    state.view = 'tomes';
                                    renderTomes(foundCol);
                                     renderBreadcrumb();
                                     if (readPath && state.view !== 'reading') {
                                         var found = findTomeByPath(readPath);
                                         if (found) {
                                             state.currentTome = found;
                                             renderReading(found);
                                             renderBreadcrumb();
                                         } else {
                                             var imgNode3 = findImageTomeNodeByFolder(readPath);
                                             if (imgNode3) {
                                                 renderReadingImages(imgNode3, foundCol);
                                                 renderBreadcrumb();
                                             }
                                         }
                                     }
                                });
                            } else {
                                state.view = 'libraries';
                                render();
                            }
                        }
                    });
                });
            } else if (readPath) {
                var pendingR = (state.libraries || []).length;
                if (!pendingR) { state.view = 'libraries'; return; }
                var foundTome = null;
                var foundLibR = null;
                var foundColR = null;
                var foundIsImageTome = false;
                (state.libraries || []).forEach(function(lib) {
                    loadCollections(lib.id, function () {
                        if (!foundTome) {
                            for (var i = 0; i < (state.collections || []).length; i++) {
                                var allF = collectAllFiles(state.collections[i].rules || {});
                                for (var j = 0; j < allF.length; j++) {
                                    if (decodeURIComponent(allF[j].path) === readPath || allF[j].path === readPath) {
                                        foundTome = allF[j];
                                        foundLibR = lib;
                                        foundColR = state.collections[i];
                                        break;
                                    }
                                }
                                if (foundTome) break;
                                var imgNode4 = findImageTomeInCollection(state.collections[i], readPath);
                                if (imgNode4) {
                                    foundTome = imgNode4;
                                    foundLibR = lib;
                                    foundColR = state.collections[i];
                                    foundIsImageTome = true;
                                    break;
                                }
                            }
                        }
                        pendingR--;
                        if (pendingR === 0) {
                            if (foundTome) {
                                if (foundIsImageTome) {
                                    state.currentLibrary = foundLibR;
                                    state.currentCollection = foundColR;
                                    state.readerTreePath = [];
                                    renderReadingImages(foundTome, foundColR);
                                    renderBreadcrumb();
                                } else {
                                    loadBookmarksForTome(foundLibR, foundColR, function () {
                                        state.view = 'reading';
                                        state.currentCollection = foundColR;
                                        state.currentTome = foundTome;
                                        renderReading(foundTome);
                                        renderBreadcrumb();
                                    });
                                }
                            } else {
                                state.view = 'libraries';
                                render();
                            }
                        }
                    });
                });
            }
        });
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
        if (!libs.length) {
            state.allCollections = {};
            if (typeof cb === 'function') cb();
            return;
        }
        var pending = libs.length;
        libs.forEach(function (lib) {
            apiRequest(getBaseUrl() + '/api/reader/collections?libraryId=' + lib.id).then(function (data) {
                state.allCollections[lib.id] = (data && data.success && data.collections) ? data.collections : [];
                pending--;
                if (pending === 0) {
                    if (typeof cb === 'function') cb();
                }
            }).catch(function () {
                state.allCollections[lib.id] = [];
                pending--;
                if (pending === 0) {
                    if (typeof cb === 'function') cb();
                }
            });
        });
    }

    function loadReaderFavoritesList(cb) {
        apiRequest(getBaseUrl() + '/api/reader/favorites/list').then(function (data) {
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
        var container = document.getElementById('lib-content');
        if (!container) return;
        container.innerHTML = '<div class="lib-empty" style="opacity:0.5;">' + (t('favoritesHint') || 'Loading favorites…') + '</div>';

        loadAllCollections(function () {
            loadReaderFavoritesList(function () {
                if (!document.getElementById('lib-content')) return;
                container.innerHTML = '';
                var wrap = document.createElement('div');
                var favorites = state.allFavorites || [];
                if (!favorites.length) {
                    wrap.innerHTML = '<div class="lib-empty">' + (t('noFavorites') || 'Aucun favori') + '</div>';
                    container.appendChild(wrap);
                    return;
                }
                var grouped = {};
                favorites.forEach(function (fav) {
                    var ctx = findLibraryCollectionForPath(fav.path);
                    if (!ctx) return;
                    if (!fav.pages || !fav.pages.length) return;
                    var libKey = String(ctx.lib.id);
                    if (!grouped[libKey]) grouped[libKey] = { lib: ctx.lib, items: [] };
                    grouped[libKey].items.push({ ctx: ctx, pages: fav.pages });
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
                    wrap.innerHTML = '<div class="lib-empty">' + (t('noFavorites') || 'Aucun favori') + '</div>';
                }
                container.appendChild(wrap);
            });
        });
    }

    function renderFavoriteCard(ctx, pages) {
        var f = ctx.file;
        pages = pages || [];
        var card = document.createElement('div');
        card.className = 'lib-card-portrait';
        card.dataset.path = f.path;
        var coverImg = renderTomeIcon(f);
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
            if (e.target.classList.contains('lib-delete-prog-btn')) { e.stopPropagation(); return; }
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
                      btn.innerHTML = COLLAPSE_SVG;
                      btn.title = t('expand');
                      btn.setAttribute('aria-label', t('expand'));
                      btn.setAttribute('data-translation', 'expand');
                  } else {
                      if (pageApp) pageApp.classList.remove('fullscreen');
                      if (contentApp) contentApp.classList.remove('fullscreen');
                      btn.innerHTML = EXPAND_SVG;
                      btn.title = t('reduce');
                      btn.setAttribute('aria-label', t('reduce'));
                      btn.setAttribute('data-translation', 'reduce');
                  }
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
                              sub.style.overflow = 'auto';
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
        PAGE_ROOT.className = 'lib-page-app';

        var sidebar = document.createElement('div');
        sidebar.id = 'lib-sidebar';
        sidebar.className = 'lib-sidebar ' + (state.sidebarOpen ? '' : 'collapsed');
        var SETTINGS_GEAR_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_GEAR) || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
        sidebar.innerHTML =
             '<nav class="lib-sidebar-menu" id="lib-sidebar-menu">' +
                 '<div class="lib-sidebar-item' + ((state.view === 'home' || state.view === 'libraries') ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('home')) + '</span></div>' +
                 '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('myFavorites')) + '</span></div>' +
                  (state.isAdmin ? '<div class="lib-sidebar-item active addLib" data-action="scan"><span class="lib-sidebar-icon">' + FOLDER_SVG + '</span><span class="lib-sidebar-label">+</span></div>' : '') +
             '</nav>' +
             '<button type="button" id="lib-settings-btn" class="lib-settings-btn" title="' + escapeHtml(t('settings')) + '" aria-label="' + escapeHtml(t('settings')) + '" data-translation="settings">' + SETTINGS_GEAR_SVG + '</button>';

         var main = document.createElement('div');
         main.className = 'lib-main';
          var header = document.createElement('div');
          header.className = 'lib-page-header';
            header.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<button type="button" id="lib-sidebar-toggle" class="lib-sidebar-toggle" title="' + escapeHtml(t('toggleSidebar')) + '" aria-label="' + escapeHtml(t('toggleSidebar')) + '">☰</button>' +
                '</div>' +
                 '<div id="lib-breadcrumb"></div>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<button type="button" id="lib-fullscreen-toggle" class="lib-fullscreen-toggle" title="' + escapeHtml(t('reduce')) + '" aria-label="' + escapeHtml(t('reduce')) + '" data-translation="reduce">' + EXPAND_SVG + '</button>' +
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
            html += '<div class="lib-sidebar-item' + (isLibsView ? ' active' : '') + '" data-view="home"><span class="lib-sidebar-icon">' + HOME_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('home')) + '</span></div>';
            html += '<div class="lib-sidebar-item' + (state.view === 'favorites' ? ' active' : '') + '" data-view="favorites"><span class="lib-sidebar-icon">' + FAV_STAR_SVG + '</span><span class="lib-sidebar-label">' + escapeHtml(t('myFavorites')) + '</span></div>';
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
              var textHtml = text !== '' ? '<span class="button-vue__text">' + text + '</span>' : '';
              var btnClass = 'button-vue button-vue--size-normal button-vue--vue-tertiary button-vue--tertiary';
              if (iconOnly && !textHtml) { btnClass += ' button-vue--icon-only'; }
              var dataId = opts.id ? ' data-crumb-id="' + escapeHtml(opts.id) + '"' : '';
              html += '<li class="navigation-crumb' + (isLast ? ' active' : '') + '">';
              html += '<a class="' + btnClass + '" data-crumb-level="' + level + '"' + dataId + ' title="' + escapeHtml(opts.title || '') + '">' +
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

          crumb('', 'home', { icon: HOME_SVG, iconOnly: true, isLast: isLibs && !hasLib, title: homeLabel });
          if (isFavs && !hasLib) {
              crumb(favLabel, 'favorites', { icon: FAV_STAR_SVG, isLast: true, title: favLabel });
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
               html += '<button type="button" id="renamer-breadcrumb-star" class="navigation-breadcrumb-star" title="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" aria-label="' + escapeHtml(t('navAddToFavorites') || t('navFavorites') || 'Ajouter aux favoris') + '" data-favorite="false">' + FAV_STAR_SVG + '</button>';
               html += '<button type="button" id="lib-nav-more" class="navigation-nav-more" title="' + escapeHtml(t('navMore') || 'Plus') + '" aria-label="' + escapeHtml(t('navMore') || 'Plus') + '">' + NAV_MORE_SVG + '</button>';
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
                            '<span style="flex:1;">' + escapeHtml(t('manageTranslations')) + '</span>' +
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
                    '</div>' +
                    '<div id="lib-reader-translations-lang-dropdown" class="lib-translation-lang-dropdown" style="display:none;position:absolute;top:100%;right:0;z-index:10001;"></div>' +
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
            var langs = ['fr', 'en'];
            langs.forEach(function (l) {
                var item = document.createElement('div');
                item.className = 'lib-context-item';
                item.textContent = l.toUpperCase();
                item.addEventListener('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    state.settingsLangView = l;
                    var langLabel = langBtn.querySelector('.lib-lang-label');
                    if (langLabel) langLabel.textContent = l.toUpperCase();
                    langDropdown.style.display = 'none';
                    renderLibTranslations();
                });
                langDropdown.appendChild(item);
            });
            langBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                langDropdown.style.display = langDropdown.style.display === 'none' ? 'block' : 'none';
            });
            document.addEventListener('click', function onOutside(e) {
                if (!langDropdown.contains(e.target) && e.target !== langBtn) {
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

       function showLibToast(message, type) {
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
           container.appendChild(toast);
           setTimeout(function () {
               if (toast.parentNode) toast.remove();
           }, 3500);
       }

       document.addEventListener('DOMContentLoaded', init);

      window.RenamerLibrary = {
          buildBreadcrumb: buildLibBreadcrumb,
          renderBreadcrumb: renderBreadcrumb,
      };
})();
