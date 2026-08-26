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
        const { isInc, incSep, incFormat, sequenceType, startValue, zeroPadding, target } = options;
        const { name: baseName, extension } = this.splitNameAndExt(name);
        let result = baseName;

        if (mode === 'regex' && pattern) {
            try {
                result = baseName.replace(new RegExp(pattern), replacement);
            } catch (e) {
                result = baseName;
            }
        } else if ((mode === 'replace' || mode === 'search_replace') && pattern) {
            result = baseName.split(pattern).join(replacement);
        } else if (mode === 'cascade') {
            result = baseName.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
        } else if (mode === 'camelcase') {
            result = baseName.replace(/[^a-zA-Z0-9]+/gu, ' ');
            result = result.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
            result = result.replace(/\s+/g, '');
            if (result !== '') result = result.charAt(0).toLowerCase() + result.slice(1);
        } else if (mode === 'snakecase') {
            result = baseName.toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/g, '');
        } else if (mode === 'removespaces') {
            result = baseName.replace(/\s+/gu, '');
        } else if (mode === 'capitalizefirst') {
            result = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        } else if (mode === 'capitalizewords') {
            result = baseName.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        } else if (mode === 'sequence' && sequenceType) {
            result = this.sequenceGenerate(index || 1, sequenceType, startValue, zeroPadding);
        } else if (mode === 'metadata') {
            result = baseName;
        }

        if (isInc && incFormat) {
            const ext = extension;
            const formatted = incFormat
                .replace(/\{name\}/g, result)
                .replace(/\{sep\}/g, isInc ? (incSep || '') : '')
                .replace(/\{i\}/g, String(index || 1));
            result = formatted + ext;
        } else {
            result = this.applyTargetScope(result, extension, target);
        }

        return result;
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
        } else if (mode === 'metadata' || mode === 'camelcase' || mode === 'snakecase' || mode === 'removespaces' || mode === 'capitalizefirst' || mode === 'capitalizewords' || mode === 'sequence') {
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
                    skipped: true
                });
                return;
            }
            
            let currentName = baseName;
            let changed = false;

            rules.forEach((rule, ruleIndex) => {
                if (!rule.enabled || rule.mode === 'filetype') return;
                const newName = this.computeNewName(
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
                        target: rule.target || 'full'
                    }
                );
                if (newName !== currentName) {
                    changed = true;
                }
                currentName = newName;
            });

            const newPath = dirName + '/' + currentName;
            preview.push({
                from: file,
                to: newPath,
                changed: changed,
                skipped: false
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
