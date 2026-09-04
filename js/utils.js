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

    _findAllMatches(part, pattern, caseSensitive) {
        if (!pattern) return [];
        const matches = [];
        if (caseSensitive === false) {
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try {
                const re = new RegExp(escaped, 'gi');
                let m;
                while ((m = re.exec(part)) !== null) {
                    matches.push({ index: m.index, length: m[0].length });
                    if (m[0].length === 0) re.lastIndex++;
                }
                return matches;
            } catch (e) {}
        }
        let idx = 0;
        while (idx < part.length) {
            const found = part.indexOf(pattern, idx);
            if (found === -1) break;
            matches.push({ index: found, length: pattern.length });
            idx = found + pattern.length;
            if (pattern.length === 0) idx++;
        }
        return matches;
    },

    _findAllRegexMatches(part, pattern, caseSensitive) {
        if (!pattern) return [];
        try {
            const flags = (caseSensitive === false) ? 'gi' : 'g';
            const re = new RegExp(pattern, flags);
            const matches = [];
            let m;
            while ((m = re.exec(part)) !== null) {
                matches.push({ index: m.index, length: m[0].length });
                if (m[0].length === 0) re.lastIndex++;
            }
            return matches;
        } catch (e) {
            return [];
        }
    },

    applyModeToPart(part, mode, pattern, replacement, index, options) {
        const { insertText, insertPosition, truncateLength, truncateDirection, basicSubType, sequenceType, startValue, zeroPadding, incSep, sequencePosition, sequenceAt, caseSensitive, insertAt } = options || {};
        let result = part;
        const zones = [];
        const noop = () => ({ result: part, zones: [] });

        if (!part && mode !== 'add_text' && mode !== 'sequence') return noop();
        if ((mode === 'search_replace' || mode === 'replace') && !pattern) return noop();
        if (mode === 'regex' && !pattern) return noop();

        switch (mode) {
            case 'regex': {
                const matches = this._findAllRegexMatches(part, pattern, caseSensitive);
                let cumulativeShift = 0;
                result = '';
                let cursor = 0;
                const repl = replacement || '';
                for (const m of matches) {
                    result += part.substring(cursor, m.index);
                    const replStart = m.index + cumulativeShift;
                    result += repl;
                    cursor = m.index + m.length;
                    cumulativeShift += repl.length - m.length;
                    zones.push({
                        fromStart: m.index,
                        fromEnd: m.index + m.length,
                        toStart: replStart,
                        toEnd: replStart + repl.length,
                        kind: 'replace'
                    });
                }
                result += part.substring(cursor);
                break;
            }
            case 'replace':
            case 'search_replace': {
                const matches = this._findAllMatches(part, pattern, caseSensitive);
                let cumulativeShift = 0;
                result = '';
                let cursor = 0;
                const repl = replacement || '';
                for (const m of matches) {
                    result += part.substring(cursor, m.index);
                    const replStart = m.index + cumulativeShift;
                    result += repl;
                    cursor = m.index + m.length;
                    cumulativeShift += repl.length - m.length;
                    zones.push({
                        fromStart: m.index,
                        fromEnd: m.index + m.length,
                        toStart: replStart,
                        toEnd: replStart + repl.length,
                        kind: 'replace'
                    });
                }
                result += part.substring(cursor);
                break;
            }
            case 'cascade':
                result = part.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
                zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: result.length, kind: 'replace' });
                break;
            case 'camelcase': {
                let tmp = part.replace(/[^a-zA-Z0-9]+/gu, ' ');
                tmp = tmp.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                tmp = tmp.replace(/\s+/g, '');
                if (tmp !== '') tmp = tmp.charAt(0).toLowerCase() + tmp.slice(1);
                result = tmp;
                zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: result.length, kind: 'replace' });
                break;
            }
            case 'snakecase':
                result = part.toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
                zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: result.length, kind: 'replace' });
                break;
            case 'removespaces':
                result = part.replace(/\s+/gu, '');
                zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: result.length, kind: 'replace' });
                break;
            case 'capitalizefirst':
                if (part.length > 0) {
                    result = part.charAt(0).toUpperCase() + part.slice(1);
                    zones.push({ fromStart: 0, fromEnd: 1, toStart: 0, toEnd: 1, kind: 'replace' });
                } else {
                    result = part;
                }
                break;
            case 'capitalizewords':
                result = part.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                if (part.length > 0) {
                    zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: result.length, kind: 'replace' });
                }
                break;
            case 'basic':
                if (basicSubType === 'lowercase') result = part.toLowerCase();
                else if (basicSubType === 'uppercase') result = part.toUpperCase();
                else if (basicSubType === 'capitalize') result = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                else if (basicSubType === 'capitalize_words') result = part.toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                else result = part;
                if (part.length > 0 || result.length > 0) {
                    zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: result.length, kind: 'replace' });
                }
                break;
            case 'sequence': {
                const seq = this.sequenceGenerate(index || 1, sequenceType, startValue, zeroPadding);
                const sep = (incSep == null) ? ' - ' : incSep;
                const inserted = sep + seq;
                if (sequencePosition === 'start') {
                    result = seq + sep + part;
                    zones.push({ fromStart: 0, fromEnd: 0, toStart: 0, toEnd: inserted.length, kind: 'insert' });
                } else if (sequencePosition === 'at' && sequenceAt !== undefined && sequenceAt !== null) {
                    const pos = Math.max(0, Math.min(part.length, parseInt(sequenceAt, 10) || 0));
                    result = part.slice(0, pos) + inserted + part.slice(pos);
                    zones.push({ fromStart: pos, fromEnd: pos, toStart: pos, toEnd: pos + inserted.length, kind: 'insert' });
                } else {
                    result = part + inserted;
                    zones.push({ fromStart: part.length, fromEnd: part.length, toStart: part.length, toEnd: part.length + inserted.length, kind: 'insert' });
                }
                break;
            }
            case 'truncate': {
                const len = parseInt(truncateLength, 10);
                if (!len || len <= 0) {
                    result = '';
                    if (part.length > 0) {
                        zones.push({ fromStart: 0, fromEnd: part.length, toStart: 0, toEnd: 0, kind: 'remove' });
                    }
                } else if (truncateDirection === 'end') {
                    const start = part.length - len;
                    result = part.slice(0, start);
                    zones.push({ fromStart: start, fromEnd: part.length, toStart: start, toEnd: start, kind: 'remove' });
                } else {
                    result = part.slice(len);
                    zones.push({ fromStart: 0, fromEnd: len, toStart: 0, toEnd: 0, kind: 'remove' });
                }
                break;
            }
            case 'add_text': {
                const text = insertText || '';
                if (insertPosition === 'start') {
                    result = text + part;
                    zones.push({ fromStart: 0, fromEnd: 0, toStart: 0, toEnd: text.length, kind: 'insert' });
                } else if (insertPosition === 'end') {
                    result = part + text;
                    zones.push({ fromStart: part.length, fromEnd: part.length, toStart: part.length, toEnd: part.length + text.length, kind: 'insert' });
                } else if (insertPosition === 'position' && insertAt !== undefined && insertAt !== null) {
                    const pos = Math.max(0, Math.min(part.length, parseInt(insertAt, 10) || 0));
                    result = part.slice(0, pos) + text + part.slice(pos);
                    zones.push({ fromStart: pos, fromEnd: pos, toStart: pos, toEnd: pos + text.length, kind: 'insert' });
                } else {
                    result = part + text;
                    zones.push({ fromStart: part.length, fromEnd: part.length, toStart: part.length, toEnd: part.length + text.length, kind: 'insert' });
                }
                break;
            }
            case 'metadata':
                result = part;
                break;
            default:
                result = part;
        }

        return { result, zones };
    },

    computeNewName(name, mode, pattern, replacement, index, options) {
        options = options || {};
        const { isInc, incSep, incFormat, target } = options;
        const { name: baseName, extension } = this.splitNameAndExt(name);

        let nameResult, extResult, nameZones, extZones;

        if (target === 'name') {
            const r = this.applyModeToPart(baseName, mode, pattern, replacement, index, options);
            nameResult = r.result;
            nameZones = r.zones;
            extResult = extension;
            extZones = [];
        } else if (target === 'extension') {
            nameResult = baseName;
            nameZones = [];
            const r = this.applyModeToPart(extension, mode, pattern, replacement, index, options);
            extResult = r.result;
            const extShift = baseName.length + 1;
            extZones = r.zones.map(z => ({
                fromStart: z.fromStart + extShift,
                fromEnd: z.fromEnd + extShift,
                toStart: z.toStart + extShift,
                toEnd: z.toEnd + extShift,
                kind: z.kind
            }));
        } else {
            const fullInput = baseName + (extension ? '.' + extension : '');
            const r = this.applyModeToPart(fullInput, mode, pattern, replacement, index, options);
            const fullResult = r.result;
            const parts = this.splitNameAndExt(fullResult);
            nameResult = parts.name;
            extResult = parts.extension;
            nameZones = [];
            extZones = [];
            for (const z of r.zones) {
                if (z.fromEnd <= baseName.length) {
                    const toStart = Math.min(z.toStart, nameResult.length);
                    const toEnd = Math.min(z.toEnd, nameResult.length);
                    nameZones.push({ fromStart: z.fromStart, fromEnd: z.fromEnd, toStart, toEnd, kind: z.kind });
                } else if (z.fromStart >= baseName.length + 1) {
                    const extShift = baseName.length + 1;
                    extZones.push({
                        fromStart: z.fromStart,
                        fromEnd: z.fromEnd,
                        toStart: z.toStart,
                        toEnd: z.toEnd,
                        kind: z.kind
                    });
                } else {
                    const toStart = Math.min(z.toStart, nameResult.length);
                    const toEnd = Math.min(z.toEnd, nameResult.length);
                    if (z.fromStart < baseName.length) {
                        nameZones.push({ fromStart: z.fromStart, fromEnd: baseName.length, toStart, toEnd, kind: z.kind });
                    }
                    if (z.fromEnd > baseName.length + 1) {
                        extZones.push({
                            fromStart: baseName.length + 1,
                            fromEnd: z.fromEnd,
                            toStart: Math.max(nameResult.length + 1, z.toStart),
                            toEnd: z.toEnd,
                            kind: z.kind
                        });
                    }
                }
            }
        }

        const dot = extResult ? '.' : '';
        const finalName = nameResult + dot + extResult;

        let allZones = nameZones.concat(extZones);

        if (isInc && incFormat) {
            const formatted = incFormat
                .replace(/\{name\}/g, finalName)
                .replace(/\{sep\}/g, incSep || '')
                .replace(/\{i\}/g, String(index || 1));
            return { name: formatted, zones: allZones };
        }

        return { name: finalName, zones: allZones };
    },

    _zonesToDiff(str, zones, kind) {
        if (!zones || zones.length === 0) return RenamerUtils.escapeHtml(str);
        const escape = (s) => RenamerUtils.escapeHtml(s);
        const sorted = zones.slice().sort((a, b) => {
            const aStart = (kind === 'from') ? a.fromStart : a.toStart;
            const bStart = (kind === 'from') ? b.fromStart : b.toStart;
            return aStart - bStart;
        });
        let out = '';
        let cursor = 0;
        for (const z of sorted) {
            let start, end;
            if (kind === 'from') {
                if (z.kind === 'insert') continue;
                start = z.fromStart;
                end = z.fromEnd;
            } else {
                if (z.kind === 'remove') continue;
                start = z.toStart;
                end = z.toEnd;
            }
            if (start < 0) start = 0;
            if (end > str.length) end = str.length;
            if (start >= end) continue;
            if (start > cursor) out += escape(str.substring(cursor, start));
            const cls = (kind === 'from') ? 'renamer-diff-remove' : 'renamer-diff-add';
            out += '<span class="' + cls + '">' + escape(str.substring(start, end)) + '</span>';
            cursor = Math.max(cursor, end);
        }
        if (cursor < str.length) out += escape(str.substring(cursor));
        return out;
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
            const initialBaseLen = baseName.length;
            let accumulatedZones = [];
            const stateStack = [{ baseName: baseName, zones: [] }];

            rules.forEach((rule, ruleIndex) => {
                if (!rule.enabled || rule.mode === 'filetype') return;
                const r = this.computeNewName(
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
                currentName = r.name;
                accumulatedZones = accumulatedZones.concat(r.zones);
                stateStack.push({ baseName: currentName, zones: accumulatedZones.slice() });
            });

            const changed = currentName !== baseName;
            const newPath = dirName + '/' + currentName;

            let fromDiff, toDiff;
            if (changed) {
                fromDiff = this._zonesToDiff(baseName, accumulatedZones, 'from');
                toDiff = this._zonesToDiff(currentName, accumulatedZones, 'to');
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