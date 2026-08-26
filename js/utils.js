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
            return { name: filename.substring(0, dotIndex), extension: filename.substring(dotIndex) };
        }
        return { name: filename, extension: '' };
    },

    applyTargetScope(name, ext, target) {
        if (target === 'extension') {
            return ext;
        } else if (target === 'name') {
            return name;
        }
        return name + ext;
    },

    sequenceGenerate(index, type, startValue, zeroPadding) {
        const i = index - 1 + (startValue || 1);
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

        if (type === 'numeric' && zeroPadding > 0) {
            value = value.padStart(zeroPadding, '0');
        }

        return value;
    },

    computeNewName(name, mode, pattern, replacement, index, options = {}) {
        const { isInc, incSep, incFormat, sequenceType, startValue, zeroPadding, target, insertText, insertPosition, truncateLength, truncateDirection, basicSubType } = options;
        const { name: baseName, extension } = this.splitNameAndExt(name);
        const applyOnName = target === 'full' || target === 'name';
        const applyOnExt = target === 'full' || target === 'extension';
        let nameResult = baseName;
        let extResult = extension;

        if (mode === 'regex' && pattern) {
            try {
                if (applyOnName) nameResult = baseName.replace(new RegExp(pattern), replacement);
                if (applyOnExt && extension) extResult = extension.replace(new RegExp(pattern), replacement);
            } catch (e) {
                nameResult = baseName;
                extResult = extension;
            }
        } else if ((mode === 'replace' || mode === 'search_replace') && pattern) {
            if (applyOnName) nameResult = baseName.split(pattern).join(replacement);
            if (applyOnExt && extension) extResult = extension.split(pattern).join(replacement);
        } else if (mode === 'cascade') {
            if (applyOnName) nameResult = baseName.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
            if (applyOnExt && extension) extResult = extension.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
        } else if (mode === 'camelcase') {
            if (applyOnName) {
                nameResult = baseName.replace(/[^a-zA-Z0-9]+/gu, ' ');
                nameResult = nameResult.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                nameResult = nameResult.replace(/\s+/g, '');
                if (nameResult !== '') nameResult = nameResult.charAt(0).toLowerCase() + nameResult.slice(1);
            }
            if (applyOnExt && extension) {
                extResult = extension.replace(/[^a-zA-Z0-9]+/gu, ' ');
                extResult = extResult.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                extResult = extResult.replace(/\s+/g, '');
                if (extResult !== '') extResult = extResult.charAt(0).toLowerCase() + extResult.slice(1);
            }
        } else if (mode === 'snakecase') {
            if (applyOnName) nameResult = baseName.toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
            if (applyOnExt && extension) extResult = extension.toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
        } else if (mode === 'removespaces') {
            if (applyOnName) nameResult = baseName.replace(/\s+/gu, '');
            if (applyOnExt && extension) extResult = extension.replace(/\s+/gu, '');
        } else if (mode === 'capitalizefirst') {
            if (applyOnName) nameResult = baseName.charAt(0).toUpperCase() + baseName.slice(1);
            if (applyOnExt && extension) extResult = extension.charAt(0).toUpperCase() + extension.slice(1);
        } else if (mode === 'capitalizewords') {
            if (applyOnName) nameResult = baseName.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
            if (applyOnExt && extension) extResult = extension.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        } else if (mode === 'basic') {
            if (applyOnName) {
                if (basicSubType === 'lowercase') nameResult = baseName.toLowerCase();
                else if (basicSubType === 'uppercase') nameResult = baseName.toUpperCase();
                else if (basicSubType === 'capitalize') nameResult = baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();
                else if (basicSubType === 'capitalize_words') nameResult = baseName.toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                else nameResult = baseName;
            }
            if (applyOnExt && extension) {
                if (basicSubType === 'lowercase') extResult = extension.toLowerCase();
                else if (basicSubType === 'uppercase') extResult = extension.toUpperCase();
                else if (basicSubType === 'capitalize') extResult = extension.charAt(0).toUpperCase() + extension.slice(1).toLowerCase();
                else if (basicSubType === 'capitalize_words') extResult = extension.toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                else extResult = extension;
            }
        } else if (mode === 'sequence' && sequenceType) {
            const seq = this.sequenceGenerate(index || 1, sequenceType, startValue, zeroPadding);
            const sep = incSep || ' - ';
            if (applyOnName) nameResult = baseName + sep + seq;
            if (applyOnExt && extension) extResult = extension + sep + seq;
        } else if (mode === 'truncate') {
            const len = parseInt(truncateLength, 10);
            if (applyOnName) {
                if (!len || len <= 0) nameResult = '';
                else if (truncateDirection === 'end') nameResult = baseName.slice(0, -len);
                else nameResult = baseName.slice(len);
            }
            if (applyOnExt && extension) {
                if (!len || len <= 0) extResult = '';
                else if (truncateDirection === 'end') extResult = extension.slice(0, -len);
                else extResult = extension.slice(len);
            }
        } else if (mode === 'add_text' && insertText) {
            if (applyOnName) {
                if (insertPosition === 'start') nameResult = insertText + baseName;
                else if (insertPosition === 'end') nameResult = baseName + insertText;
                else if (insertPosition === 'position' && options.insertAt !== undefined && options.insertAt !== null) {
                    const pos = Math.max(0, Math.min(baseName.length, parseInt(options.insertAt, 10) || 0));
                    nameResult = baseName.slice(0, pos) + insertText + baseName.slice(pos);
                } else {
                    nameResult = baseName + insertText;
                }
            }
            if (applyOnExt && extension) {
                if (insertPosition === 'start') extResult = insertText + extension;
                else if (insertPosition === 'end') extResult = extension + insertText;
                else if (insertPosition === 'position' && options.insertAt !== undefined && options.insertAt !== null) {
                    const pos = Math.max(0, Math.min(extension.length, parseInt(options.insertAt, 10) || 0));
                    extResult = extension.slice(0, pos) + insertText + extension.slice(pos);
                } else {
                    extResult = extension + insertText;
                }
            }
        } else if (mode === 'metadata') {
            nameResult = baseName;
            extResult = extension;
        }

        const finalName = nameResult + extResult;

        if (isInc && incFormat) {
            const formatted = incFormat
                .replace(/\{name\}/g, finalName)
                .replace(/\{sep\}/g, isInc ? (incSep || '') : '')
                .replace(/\{i\}/g, String(index || 1));
            return formatted;
        }

        return finalName;
    },

    computeOriginalDiff(original, mode, pattern) {
        if ((mode === 'regex' || mode === 'replace' || mode === 'search_replace') && pattern) {
            const escaped = this.escapeHtml(original);
            const pat = this.escapeHtml(pattern);
            if (pat === '') return escaped;
            const parts = escaped.split(pat);
            if (parts.length <= 1) return escaped;
            let out = '';
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) {
                    out += '<span class="renamer-diff-remove">' + pat + '</span>';
                }
                out += parts[i];
            }
            return out;
        }
        if (mode === 'cascade') {
            return this.escapeHtml(original).replace(/(\[[^\]]*\])/g, '<span class="renamer-diff-remove">$1</span>').replace(/(\s+)/g, '<span class="renamer-diff-remove">$1</span>');
        }
        return this.escapeHtml(original);
    },

    computeNewDiff(original, transformed, mode, pattern, replacement, isInc, incSep, incFormat, index) {
        let result = this.escapeHtml(transformed);

        if ((mode === 'regex' || mode === 'replace' || mode === 'search_replace') && pattern) {
            result = this.highlightPattern(result, replacement || '', 'renamer-diff-add');
        } else if (mode === 'cascade') {
            result = '<span class="renamer-diff-add">' + result.replace(/(\[[^\]]*\])/g, '').replace(/(\s+)/g, ' ') + '</span>';
        } else if (mode === 'metadata' || mode === 'camelcase' || mode === 'snakecase' || mode === 'removespaces' || mode === 'capitalizefirst' || mode === 'capitalizewords' || mode === 'sequence' || mode === 'basic' || mode === 'truncate' || mode === 'add_text') {
            result = '<span class="renamer-diff-add">' + result + '</span>';
        }

        if (isInc) {
            result = this.highlightIncrement(result, incSep, incFormat, index);
        }

        return result;
    },

    highlightPattern(text, pattern, cssClass) {
        if (!pattern) return text;
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const regex = new RegExp(escapedPattern, 'g');
            return text.replace(regex, function(match) {
                return '<span class="' + cssClass + '">' + match + '</span>';
            });
        } catch (e) {
            return text;
        }
    },

    highlightIncrement(text, incSep, incFormat, index) {
        const incToken = String(index || 1);
        let result = text.split(incToken).join('<span class="renamer-diff-add">' + incToken + '</span>');
        const sep = incSep || '';
        if (sep) {
            result = result.split(sep).join('<span class="renamer-diff-add">' + sep + '</span>');
        }
        return result;
    },

    computePreview(files, rules) {
        const preview = [];
        const fileTypeRules = rules.filter(r => r.mode === 'filetype' && r.enabled);
        
        files.forEach((file, fileIndex) => {
            const baseName = file.replace(/^.*\//, '');
            const ext = this.splitNameAndExt(baseName).extension;
            const dirName = file.replace(/\/[^/]*$/, '') || '.';
            
            let shouldProcess = true;
            fileTypeRules.forEach(rule => {
                if (!rule.enabled) return;
                const selectedExts = (rule.extensions || []).map(e => e.toLowerCase());
                if (selectedExts.length === 0) return;
                
                const fileExt = ext.toLowerCase();
                const isMatch = selectedExts.includes(fileExt);
                
                if (rule.filterMode === 'only') {
                    shouldProcess = shouldProcess && isMatch;
                } else {
                    shouldProcess = shouldProcess && !isMatch;
                }
            });
            
            if (!shouldProcess) {
                preview.push({
                    from: file,
                    to: file,
                    changed: false,
                    skipped: true,
                    fromDiff: this.escapeHtml(baseName),
                    toDiff: this.escapeHtml(baseName)
                });
                return;
            }
            
            let currentName = baseName;
            let changed = false;
            let lastRule = null;

            rules.forEach((rule, ruleIndex) => {
                if (!rule.enabled || rule.mode === 'filetype') return;
                const prevName = currentName;
                currentName = this.computeNewName(
                    currentName,
                    rule.mode,
                    rule.pattern,
                    rule.replacement,
                    fileIndex + 1,
                    {
                        isInc: rule.isInc,
                        incSep: rule.incSep,
                        incFormat: rule.incFormat,
                        sequenceType: rule.sequenceType,
                        startValue: rule.startValue,
                        zeroPadding: rule.zeroPadding,
                        target: rule.target || 'full',
                        insertText: rule.insertText,
                        insertPosition: rule.insertPosition,
                        insertAt: rule.insertAt,
                        truncateLength: rule.truncateLength,
                        truncateDirection: rule.truncateDirection,
                        basicSubType: rule.basicSubType
                    }
                );
                if (currentName !== prevName) {
                    changed = true;
                    lastRule = rule;
                }
            });

            const newPath = dirName + '/' + currentName;
            const currentParts = this.splitNameAndExt(currentName);
            const currentExt = currentParts.extension;
            const currentNameOnly = currentParts.name;

            let fromDiff = this.escapeHtml(baseName);
            let toDiff = this.escapeHtml(currentName);

            if (changed && lastRule) {
                const rule = lastRule;
                const target = rule.target || 'full';
                if (target === 'name') {
                    fromDiff = this.escapeHtml(baseName) + '<span class="renamer-diff-add">' + this.escapeHtml(currentNameOnly.replace(baseName, '')) + '</span>';
                } else if (target === 'extension') {
                    fromDiff = this.escapeHtml(baseName) + '<span class="renamer-diff-add">' + this.escapeHtml(currentExt.replace(ext, '')) + '</span>';
                } else if (rule.mode === 'search_replace' || rule.mode === 'replace' || rule.mode === 'regex') {
                    const pattern = this.escapeHtml(rule.pattern || '');
                    const replacement = this.escapeHtml(rule.replacement || '');
                    if (pattern) {
                        fromDiff = this.computeOriginalDiff(baseName, rule.mode, rule.pattern);
                        toDiff = this.computeNewDiff(baseName, currentName, rule.mode, rule.pattern, rule.replacement, false, '', '', 0);
                    }
                } else if (rule.mode === 'sequence') {
                    const seq = this.sequenceGenerate(fileIndex + 1, rule.sequenceType, rule.startValue, rule.zeroPadding);
                    const sep = rule.incSep || ' - ';
                    const escapedSep = this.escapeHtml(sep);
                    const escapedSeq = this.escapeHtml(seq);
                    toDiff = this.escapeHtml(baseName) + '<span class="renamer-diff-add">' + escapedSep + escapedSeq + '</span>';
                } else if (rule.mode === 'truncate') {
                    const len = parseInt(rule.truncateLength, 10);
                    if (!len || len <= 0) {
                        fromDiff = '<span class="renamer-diff-remove">' + this.escapeHtml(baseName) + '</span>';
                        toDiff = '<span class="renamer-diff-add"></span>';
                    } else if (rule.truncateDirection === 'end') {
                        const keep = this.escapeHtml(baseName.slice(0, -len));
                        const removed = this.escapeHtml(baseName.slice(-len));
                        fromDiff = keep + '<span class="renamer-diff-remove">' + removed + '</span>';
                    } else {
                        const keep = this.escapeHtml(baseName.slice(len));
                        const removed = this.escapeHtml(baseName.slice(0, len));
                        fromDiff = '<span class="renamer-diff-remove">' + removed + '</span>' + keep;
                    }
                } else if (rule.mode === 'add_text') {
                    const text = this.escapeHtml(rule.insertText || '');
                    if (rule.insertPosition === 'start') {
                        toDiff = '<span class="renamer-diff-add">' + text + '</span>' + this.escapeHtml(currentName.slice(text.length));
                    } else if (rule.insertPosition === 'end') {
                        const base = this.escapeHtml(currentName.slice(0, -text.length));
                        toDiff = base + '<span class="renamer-diff-add">' + text + '</span>';
                    } else {
                        const pos = rule.insertAt || 0;
                        const base = this.escapeHtml(currentName);
                        const before = base.slice(0, pos);
                        const after = base.slice(pos);
                        toDiff = before + '<span class="renamer-diff-add">' + text + '</span>' + after;
                    }
                } else if (rule.mode === 'basic') {
                    toDiff = '<span class="renamer-diff-add">' + this.escapeHtml(currentName) + '</span>';
                } else if (rule.mode === 'cascade' || rule.mode === 'camelcase' || rule.mode === 'snakecase' || rule.mode === 'removespaces' || rule.mode === 'capitalizefirst' || rule.mode === 'capitalizewords') {
                    toDiff = '<span class="renamer-diff-add">' + this.escapeHtml(currentName) + '</span>';
                }
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
