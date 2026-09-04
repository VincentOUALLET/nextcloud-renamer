const RenamerUtils = {
    escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    escapePath(path) {
        return '"' + String(path).replace(/"/g, '\\"') + '"';
    },

    splitNameAndExt(filename) {
        const dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0) {
            return { name: filename.substring(0, dotIndex), extension: filename.substring(dotIndex + 1) };
        }
        if (dotIndex === 0 && filename.length > 1) {
            return { name: '', extension: filename.substring(1) };
        }
        return { name: filename, extension: '' };
    },

    applyTargetScope(name, ext, target) {
        if (target === 'extension') {
            return ext;
        } else if (target === 'name') {
            return name;
        }
        return name + (ext ? '.' + ext : '');
    },

    sequenceGenerate(index, type, startValue, zeroPadding) {
        const i = index - 1 + (parseInt(startValue, 10) || 1);
        let value = String(i);

        if (type === 'alphabetic') {
            value = String.fromCharCode(97 + (i - 1) % 26);
            const cycles = Math.floor((i - 1) / 26);
            if (cycles > 0) {
                value = String.fromCharCode(97 + cycles - 1) + value;
            }
        } else if (type === 'roman') {
            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
            const idx = i - 1;
            value = romanNumerals[Math.min(idx, romanNumerals.length - 1)] || String(i);
        }

        if (type === 'numeric') {
            const pad = Math.max(0, parseInt(zeroPadding, 10) || 0);
            if (pad > 0) {
                value = value.padStart(value.length + pad, '0');
            }
        }

        return value;
    },

    applyModeToPart(part, mode, pattern, replacement, index, options) {
        const { insertText, insertPosition, truncateLength, truncateDirection, basicSubType, sequenceType, startValue, zeroPadding, incSep, sequencePosition, sequenceAt, caseSensitive, insertAt } = options || {};
        let result = part;

        if (!part && mode !== 'add_text' && mode !== 'sequence') return result;
        if ((mode === 'search_replace' || mode === 'replace') && !pattern) return result;
        if (mode === 'regex' && !pattern) return result;

        switch (mode) {
            case 'regex':
                try {
                    const flags = (caseSensitive === false) ? 'gi' : 'g';
                    result = part.replace(new RegExp(pattern, flags), replacement);
                }
                catch (e) { result = part; }
                break;
            case 'replace':
            case 'search_replace':
                if (caseSensitive === false) {
                    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    try { result = part.replace(new RegExp(escaped, 'gi'), replacement); }
                    catch (e) { result = part.split(pattern).join(replacement); }
                } else {
                    result = part.split(pattern).join(replacement);
                }
                break;
            case 'cascade':
                result = part.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
                break;
            case 'camelcase':
                result = part.replace(/[^a-zA-Z0-9]+/gu, ' ');
                result = result.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                result = result.replace(/\s+/g, '');
                if (result !== '') result = result.charAt(0).toLowerCase() + result.slice(1);
                break;
            case 'snakecase':
                result = part.toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
                break;
            case 'removespaces':
                result = part.replace(/\s+/gu, '');
                break;
            case 'capitalizefirst':
                result = part.charAt(0).toUpperCase() + part.slice(1);
                break;
            case 'capitalizewords':
                result = part.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                break;
            case 'basic':
                if (basicSubType === 'lowercase') result = part.toLowerCase();
                else if (basicSubType === 'uppercase') result = part.toUpperCase();
                else if (basicSubType === 'capitalize') result = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                else if (basicSubType === 'capitalize_words') result = part.toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                break;
            case 'sequence':
                var seq = this.sequenceGenerate(index || 1, sequenceType, startValue, zeroPadding);
                const sep = (incSep == null) ? ' - ' : incSep;
                if (sequencePosition === 'start') {
                    result = seq + sep + part;
                } else if (sequencePosition === 'at' && sequenceAt !== undefined && sequenceAt !== null) {
                    var pos = Math.max(0, Math.min(part.length, parseInt(sequenceAt, 10) || 0));
                    result = part.slice(0, pos) + sep + seq + part.slice(pos);
                } else {
                    result = part + sep + seq;
                }
                break;
            case 'truncate':
                var len = parseInt(truncateLength, 10);
                if (!len || len <= 0) result = '';
                else if (truncateDirection === 'end') result = part.slice(0, -len);
                else result = part.slice(len);
                break;
            case 'add_text':
                if (insertPosition === 'start') result = insertText + part;
                else if (insertPosition === 'end') result = part + insertText;
                else if (insertPosition === 'position' && insertAt !== undefined && insertAt !== null) {
                    var pos = Math.max(0, Math.min(part.length, parseInt(insertAt, 10) || 0));
                    result = part.slice(0, pos) + insertText + part.slice(pos);
                } else {
                    result = part + insertText;
                }
                break;
            case 'metadata':
                result = part;
                break;
            default:
                result = part;
        }

        return result;
    },

    computeNewName(name, mode, pattern, replacement, index, options) {
        options = options || {};
        const { isInc, incSep, incFormat, target } = options;
        const { name: baseName, extension } = this.splitNameAndExt(name);

        let nameResult, extResult;

        if (target === 'name') {
            nameResult = this.applyModeToPart(baseName, mode, pattern, replacement, index, options);
            extResult = extension;
        } else if (target === 'extension') {
            nameResult = baseName;
            extResult = this.applyModeToPart(extension, mode, pattern, replacement, index, options);
        } else {
            const fullInput = baseName + (extension ? '.' + extension : '');
            const fullResult = this.applyModeToPart(fullInput, mode, pattern, replacement, index, options);
            const parts = this.splitNameAndExt(fullResult);
            nameResult = parts.name;
            extResult = parts.extension;
        }

        const dot = extResult ? '.' : '';
        const finalName = nameResult + dot + extResult;

        if (isInc && incFormat) {
            const formatted = incFormat
                .replace(/\{name\}/g, finalName)
                .replace(/\{sep\}/g, incSep || '')
                .replace(/\{i\}/g, String(index || 1));
            return formatted;
        }

        return finalName;
    },

    computeDiffHtml(fromStr, toStr) {
        const a = fromStr;
        const b = toStr;
        const tokenize = (s) => {
            const tokens = [];
            const re = /([a-zA-Z0-9]+)|([^a-zA-Z0-9]+)/g;
            let m;
            while ((m = re.exec(s)) !== null) {
                tokens.push({ text: m[0], isWord: !!m[1] });
            }
            return tokens;
        };

        const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const charLcs = (sa, sb) => {
            const n = sa.length, m = sb.length;
            if (n === 0 && m === 0) return [];
            const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
            for (let i = 1; i <= n; i++) {
                for (let j = 1; j <= m; j++) {
                    if (sa.charAt(i - 1) === sb.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
                    else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
            const ops = [];
            let i = n, j = m;
            while (i > 0 && j > 0) {
                if (sa.charAt(i - 1) === sb.charAt(j - 1)) {
                    ops.push({ type: 'eq', ch: sa.charAt(i - 1) });
                    i--; j--;
                } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                    ops.push({ type: 'del', ch: sa.charAt(i - 1) });
                    i--;
                } else {
                    ops.push({ type: 'ins', ch: sb.charAt(j - 1) });
                    j--;
                }
            }
            while (i > 0) { ops.push({ type: 'del', ch: sa.charAt(i - 1) }); i--; }
            while (j > 0) { ops.push({ type: 'ins', ch: sb.charAt(j - 1) }); j--; }
            return ops.reverse();
        };

        const renderCharOps = (ops) => {
            let fromOut = '', toOut = '';
            let fromBuf = '', toBuf = '';
            const flush = () => {
                if (fromBuf) { fromOut += '<span class="renamer-diff-remove">' + escape(fromBuf) + '</span>'; fromBuf = ''; }
                if (toBuf) { toOut += '<span class="renamer-diff-add">' + escape(toBuf) + '</span>'; toBuf = ''; }
            };
            for (const op of ops) {
                if (op.type === 'eq') { flush(); fromOut += escape(op.ch); toOut += escape(op.ch); }
                else if (op.type === 'del') { if (toBuf) flush(); fromBuf += op.ch; }
                else { if (fromBuf) flush(); toBuf += op.ch; }
            }
            flush();
            return { from: fromOut, to: toOut };
        };

        const tokA = tokenize(a);
        const tokB = tokenize(b);
        const n = tokA.length;
        const m = tokB.length;

        if (n === 0 && m === 0) return { fromDiff: '', toDiff: '' };

        const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                if (tokA[i - 1].text === tokB[j - 1].text) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }

        const ops = [];
        let i = n, j = m;
        while (i > 0 && j > 0) {
            if (tokA[i - 1].text === tokB[j - 1].text) {
                ops.push({ type: 'eq', text: tokA[i - 1].text });
                i--; j--;
            } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                ops.push({ type: 'del', text: tokA[i - 1].text });
                i--;
            } else {
                ops.push({ type: 'ins', text: tokB[j - 1].text });
                j--;
            }
        }
        while (i > 0) { ops.push({ type: 'del', text: tokA[i - 1].text }); i--; }
        while (j > 0) { ops.push({ type: 'ins', text: tokB[j - 1].text }); j--; }
        ops.reverse();

        let fromOut = '';
        let toOut = '';
        for (let k = 0; k < ops.length; k++) {
            const op = ops[k];
            const next = k + 1 < ops.length ? ops[k + 1] : null;
            if ((op.type === 'del' && next && next.type === 'ins') || (op.type === 'ins' && next && next.type === 'del')) {
                const delText = op.type === 'del' ? op.text : next.text;
                const insText = op.type === 'ins' ? op.text : next.text;
                const sub = renderCharOps(charLcs(delText, insText));
                fromOut += sub.from;
                toOut += sub.to;
                k++;
                continue;
            }
            if (op.type === 'eq') {
                fromOut += escape(op.text);
                toOut += escape(op.text);
            } else if (op.type === 'del') {
                fromOut += '<span class="renamer-diff-remove">' + escape(op.text) + '</span>';
            } else {
                toOut += '<span class="renamer-diff-add">' + escape(op.text) + '</span>';
            }
        }

        return { fromDiff: fromOut, toDiff: toOut };
    },

    computePreview(files, rules, selectedSet) {
        const preview = [];
        const fileTypeRules = rules.filter(r => r.mode === 'filetype' && r.enabled);
        const sel = (selectedSet instanceof Set) ? selectedSet : null;

        let selectedCounter = 0;
        files.forEach((file, fileIndex) => {
            const baseName = file.replace(/^.*\//, '');
            const ext = this.splitNameAndExt(baseName).extension;
            const dirName = file.replace(/\/[^/]*$/, '') || '.';

            const isSelected = !sel || sel.has(file);
            if (isSelected) selectedCounter++;
            const sequenceIndex = selectedCounter;

            let shouldProcess = true;
            let filteredByType = false;
            fileTypeRules.forEach(rule => {
                if (!rule.enabled) return;
                const selectedExts = (rule.extensions || []).map(e => e.replace(/^\./, '').toLowerCase());
                if (selectedExts.length === 0) return;

                const fileExt = ext.toLowerCase();
                const isMatch = selectedExts.includes(fileExt);

                if (rule.filterMode === 'only') {
                    if (!isMatch) filteredByType = true;
                    shouldProcess = shouldProcess && isMatch;
                } else {
                    if (isMatch) filteredByType = true;
                    shouldProcess = shouldProcess && !isMatch;
                }
            });

            if (!shouldProcess || !isSelected) {
                preview.push({
                    from: file,
                    to: file,
                    changed: false,
                    skipped: true,
                    deselected: isSelected ? false : true,
                    filteredByType: filteredByType,
                    fromDiff: this.escapeHtml(baseName),
                    toDiff: this.escapeHtml(baseName)
                });
                return;
            }

            let currentName = baseName;

            rules.forEach((rule, ruleIndex) => {
                if (!rule.enabled || rule.mode === 'filetype') return;
                currentName = this.computeNewName(
                    currentName,
                    rule.mode,
                    rule.pattern,
                    rule.replacement,
                    sequenceIndex,
                    {
                        isInc: rule.isInc,
                        incSep: rule.incSep,
                        incFormat: rule.incFormat,
                        sequenceType: rule.sequenceType,
                        startValue: rule.startValue,
                        zeroPadding: rule.zeroPadding,
                        sequencePosition: rule.sequencePosition,
                        sequenceAt: rule.sequenceAt,
                        target: rule.target || 'full',
                        insertText: rule.insertText,
                        insertPosition: rule.insertPosition,
                        insertAt: rule.insertAt,
                        truncateLength: rule.truncateLength,
                        truncateDirection: rule.truncateDirection,
                        basicSubType: rule.basicSubType,
                        caseSensitive: rule.caseSensitive
                    }
                );
            });

            const changed = currentName !== baseName;
            const newPath = dirName + '/' + currentName;

            let fromDiff, toDiff;
            if (changed) {
                const diff = this.computeDiffHtml(this.escapeHtml(baseName), this.escapeHtml(currentName));
                fromDiff = diff.fromDiff;
                toDiff = diff.toDiff;
            } else {
                fromDiff = this.escapeHtml(baseName);
                toDiff = this.escapeHtml(baseName);
            }

            preview.push({
                from: file,
                to: newPath,
                changed: changed,
                skipped: false,
                fromDiff: fromDiff,
                toDiff: toDiff
            });
        });
        return preview;
    },

    getUniqueExtensions(files) {
        const exts = new Set();
        files.forEach(file => {
            const baseName = file.replace(/^.*\//, '');
            const { extension } = this.splitNameAndExt(baseName);
            if (extension) {
                exts.add(extension.toLowerCase());
            }
        });
        return Array.from(exts).sort();
    }
};