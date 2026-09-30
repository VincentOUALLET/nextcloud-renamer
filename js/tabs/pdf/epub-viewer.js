(function() {
    'use strict';

    var GV = window.RenamerGenericViewer;

    function EpubSource(blob, ctx, filePath) {
        this.type = 'epub';
        this.blob = blob;
        this.ctx = ctx;
        this.filePath = filePath;
        this.book = null;
        this.rendition = null;
        this._blobUrl = null;
        this.navMode = null;
        this._onLocationsReady = null;
    }

    EpubSource.prototype.load = function() {
        var self = this;
        console.log('[EpubViewer] EpubSource.load: path="' + self.filePath + '"');
        return new Promise(function(resolve, reject) {
            if (typeof window.ePub !== 'undefined') {
                console.log('[EpubViewer] EpubSource.load: ePub already loaded, resolving immediately');
                return resolve();
            }
            var baseUrl = '';
            if (typeof OC !== 'undefined' && OC.getBaseUrl) {
                baseUrl = OC.getBaseUrl();
            } else if (self.ctx && typeof self.ctx.getBaseUrl === 'function') {
                baseUrl = self.ctx.getBaseUrl().replace(/\/$/, '');
            }
            var script = document.createElement('script');
            script.src = baseUrl + '/js/epub.min.js';
            script.onload = function() {
                if (window.ePub) { resolve(); } else { reject(new Error('epub.js non disponible')); }
            };
            script.onerror = function() { reject(new Error('Impossible de charger epub.js')); };
            document.head.appendChild(script);
        });
    };

    EpubSource.prototype._getNavMethod = function() {
        var navMode = 'paginated';
        var state = this.ctx && this.ctx.state;
        if (state && state.readerEpubNavMode) {
            navMode = state.readerEpubNavMode;
        }
        return navMode;
    };

    EpubSource.prototype.applyTheme = function(themeName) {
        if (!this.rendition || !this.rendition.themes) return;
        var theme = EpubThemeManager.getTheme(themeName);
        if (!theme) {
            try { this.rendition.themes.select('default'); } catch (e) {}
            return;
        }
        try {
            if (!this.rendition.themes._themes[themeName]) {
                this.rendition.themes.registerRules(themeName, theme);
            }
            this.rendition.themes.select(themeName);
        } catch (e) {
            console.warn('[EpubViewer] EpubSource.applyTheme: theme apply failed:', e.message);
        }
    };

    EpubSource.prototype.setFont = function(fontFamily) {
        if (!this.rendition || !this.rendition.themes) return;
        try {
            this.rendition.themes.font(fontFamily);
        } catch (e) {
            console.warn('[EpubViewer] EpubSource.setFont: font set failed:', e.message);
        }
    };

    EpubSource.prototype.setFontSize = function(size) {
        if (!this.rendition || !this.rendition.themes) return;
        try {
            this.rendition.themes.fontSize(size);
        } catch (e) {
            console.warn('[EpubViewer] EpubSource.setFontSize: fontsize set failed:', e.message);
        }
    };

    EpubSource.prototype.switchNavMode = function(mode) {
        var self = this;
        if (!this.book || !this.rendition) return Promise.resolve();
        if (this.navMode === mode && this.rendition) return Promise.resolve();

        var method;
        if (mode === 'scrolling') {
            method = 'continuous';
        } else if (mode === 'slide') {
            method = 'slide';
        } else {
            method = 'default';
        }

        this.navMode = mode;
        if (this.ctx && this.ctx.state) {
            this.ctx.state.readerEpubNavMode = mode;
        }

        var book = this.book;
        var oldRendition = this.rendition;
        var container = oldRendition && oldRendition.element ? oldRendition.element.parentNode : null;

        return new Promise(function(resolve, reject) {
            try { oldRendition.destroy(); } catch (e) {}
            var newRendition = book.renderTo(container, {
                width: '100%',
                height: '100%',
                method: method,
                allowScriptedContent: true
            });
            self.rendition = newRendition;

            if (oldRendition.location) {
                try {
                    var loc = oldRendition.location();
                    if (loc && loc.start) {
                        newRendition.goto(loc.start.location || loc.start.index || 0).catch(function() {});
                    }
                } catch (e) {
                    console.warn('[EpubViewer] EpubSource.switchNavMode: could not restore location');
                }
            }

            if (typeof window.RenamerEpubViewer !== 'undefined' && window.RenamerEpubViewer._onRenditionRebuilt) {
                window.RenamerEpubViewer._onRenditionRebuilt(newRendition);
            }

            resolve();
        });
    };

    EpubSource.prototype.render = function(container) {
        var self = this;
        console.log('[EpubViewer] EpubSource.render: path="' + self.filePath + '" container=' + (container ? 'present' : 'null'));
        if (!window.ePub) {
            console.error('[EpubViewer] EpubSource.render: ePub library not available');
            return Promise.reject(new Error('epub.js non disponible'));
        }

        var book = window.ePub(self.blob);
        self.book = book;

        var navMode = self._getNavMethod();
        var method = 'default';
        if (navMode === 'scrolling') method = 'continuous';
        else if (navMode === 'slide') method = 'slide';

        var rendition = book.renderTo(container, {
            width: '100%',
            height: '100%',
            method: method,
            allowScriptedContent: true
        });
        self.rendition = rendition;
        self.navMode = navMode;

        var readyTimeout = setTimeout(function() {
            console.error('[EpubViewer] EpubSource.render: book.ready timed out after 15s, path="' + self.filePath + '"');
            if (self.rendition && self.rendition.destroy) {
                try { self.rendition.destroy(); } catch (e) {}
            }
            if (self.book && self.book.destroy) {
                try { self.book.destroy(); } catch (e) {}
            }
        }, 15000);

        book.ready.then(function() {
            clearTimeout(readyTimeout);
            console.log('[EpubViewer] EpubSource.render: book ready, calling rendition.display() for "' + self.filePath + '"');
            if (book.locations && typeof book.locations.generate === 'function') {
                console.log('[EpubViewer] EpubSource.render: generating epub locations');
                book.locations.generate(1000).then(function() {
                    console.log('[EpubViewer] EpubSource.render: locations generated, total=' + (book.locations.total || 'unknown'));
                    if (typeof self._onLocationsReady === 'function') {
                        try { self._onLocationsReady(); } catch (e) {}
                    }
                }).catch(function(err) {
                    console.warn('[EpubViewer] EpubSource.render: locations.generate failed:', err.message);
                });
            } else {
                console.warn('[EpubViewer] EpubSource.render: book.locations.generate not available');
            }
            rendition.display().catch(function(err) {
                console.error('[EpubViewer] EpubSource.render: rendition.display() failed:', err && err.message ? err.message : String(err));
            });
        }).catch(function(err) {
            clearTimeout(readyTimeout);
            console.error('[EpubViewer] EpubSource.render: book.ready failed:', err && err.message ? err.message : String(err));
        });
        rendition.on('relocated', function(loc) {
            var pct = (loc && loc.percentage) ? loc.percentage : 0;
            var startIdx = (loc && loc.start && loc.start.index !== undefined) ? loc.start.index : -1;
            var startLoc = (loc && loc.start && loc.start.location !== undefined) ? loc.start.location : -1;
            var startPct = (loc && loc.start && loc.start.percentage !== undefined) ? loc.start.percentage : 0;
            console.log('[EpubViewer] EpubSource.render: relocated, percentage=' + pct + ' start.index=' + startIdx + ' start.location=' + startLoc + ' start.percentage=' + startPct + ' for "' + self.filePath + '"');
            if (self.ctx && self.ctx.state && typeof self.ctx.saveProgress === 'function') {
                if (self.ctx.state.readerBrowsingMode) return;
                var savePct = Math.round((pct > 0 ? pct : startPct) * 100);
                if (!savePct && startIdx >= 0) {
                    var spineLen = (book.spine && book.spine.length) ? book.spine.length : 1;
                    if (startLoc > 0) {
                        savePct = Math.round((startLoc / spineLen) * 100);
                        console.log('[EpubViewer] EpubSource.render: using location-based progress=' + savePct + '% (startLoc=' + startLoc + ', spine length=' + spineLen + ')');
                    } else if (startIdx > 0) {
                        savePct = Math.round((startIdx / spineLen) * 100);
                        console.log('[EpubViewer] EpubSource.render: using spine index progress=' + savePct + '% (startIdx=' + startIdx + ', spine length=' + spineLen + ')');
                    }
                }
                self.ctx.state.readerCurrentPage = savePct;
                self.ctx.saveProgress(self.filePath, 'epub_percent', savePct, 100);
                console.log('[EpubViewer] EpubSource.render: saved progress=' + savePct + '% for "' + self.filePath + '"');
            }
        });

        var raceTimeoutId = null;
        return Promise.race([
            book.ready,
            new Promise(function(resolve, reject) {
                raceTimeoutId = setTimeout(function() {
                    console.error('[EpubViewer] EpubSource.render: book.ready timed out after 15s, path="' + self.filePath + '"');
                    if (self.rendition && self.rendition.destroy) {
                        try { self.rendition.destroy(); } catch (e) {}
                    }
                    if (self.book && self.book.destroy) {
                        try { self.book.destroy(); } catch (e) {}
                    }
                    reject(new Error('Timeout: epub.js n\'a pas réussi à charger le fichier après 15 secondes'));
                }, 15000);
            })
        ]).then(function() {
            if (raceTimeoutId) { clearTimeout(raceTimeoutId); raceTimeoutId = null; }
            clearTimeout(readyTimeout);
            console.log('[EpubViewer] EpubSource.render: book ready, path="' + self.filePath + '"');
            return book;
        });
    };

    EpubSource.prototype.destroy = function() {
        if (this.rendition && this.rendition.destroy) {
            try { this.rendition.destroy(); } catch (e) {}
        }
        if (this.book && this.book.destroy) {
            try { this.book.destroy(); } catch (e) {}
        }
        this.rendition = null;
        this.book = null;
    };

    function createEpubSource(blob, ctx, filePath) {
        return new EpubSource(blob, ctx, filePath);
    }

    var EpubThemeManager = {
        themes: {
            'day': {
                body: { background: '#fff', color: '#000' }
            },
            'night': {
                body: { background: '#000', color: '#fff' }
            },
            'sepia': {
                body: { background: '#f4ecd8', color: '#5c4a3a' }
            },
            'paper': {
                body: { background: '#fdf6e3', color: '#4a4539' }
            }
        },
        fonts: {
            'default': '',
            'serif': 'Georgia, "Times New Roman", serif',
            'sans': '"Helvetica Neue", Arial, sans-serif'
        },
        fontSizes: ['12px', '14px', '16px', '18px', '20px'],
        navModes: ['paginated', 'scrolling', 'slide'],

        getTheme: function(themeName) {
            return this.themes[themeName] || this.themes['day'];
        },

        getFont: function(fontName) {
            return this.fonts[fontName] || this.fonts['default'];
        },

        getFontSize: function(index) {
            index = typeof index === 'number' ? index : 2;
            if (index < 0) index = 0;
            if (index >= this.fontSizes.length) index = this.fontSizes.length - 1;
            return this.fontSizes[index];
        },

        applyToRendition: function(rendition, source) {
            if (!rendition || !rendition.themes) return;
            var state = source.ctx && source.ctx.state;
            if (!state) return;

            var themeName = state.readerEpubTheme || 'day';
            var fontName = state.readerEpubFont || 'default';
            var fontSizeIdx = (typeof state.readerEpubFontSize === 'number') ? state.readerEpubFontSize : 2;

            try {
                var theme = this.getTheme(themeName);
                if (!rendition.themes._themes[themeName]) {
                    rendition.themes.registerRules(themeName, theme);
                }
                rendition.themes.select(themeName);
            } catch (e) {
                console.warn('[EpubViewer] EpubThemeManager.applyToRendition: theme apply failed:', e.message);
            }

            try {
                var font = this.getFont(fontName);
                rendition.themes.font(font);
            } catch (e) {
                console.warn('[EpubViewer] EpubThemeManager.applyToRendition: font set failed:', e.message);
            }

            try {
                rendition.themes.fontSize(this.getFontSize(fontSizeIdx));
            } catch (e) {
                console.warn('[EpubViewer] EpubThemeManager.applyToRendition: fontsize set failed:', e.message);
            }
        }
    };

    var _currentRendition = null;

    function renderEpubUI(ctx, container, source, filePath) {
        console.log('[EpubViewer] renderEpubUI: path="' + filePath + '" source.type="' + source.type + '"');
        var GV = window.RenamerGenericViewer;
        container.classList.remove('reader-container-layout');
        container.classList.add('reader-container', 'reader-container-epub');
        document.body.classList.add('reader-navs-viewport');
        container.innerHTML = '';

         GV.buildHeaderNav(ctx, container, filePath);
         var headerNavEl = container.querySelector('.reader-header-nav');
         if (headerNavEl) GV.neutralizeAncestorTransforms(headerNavEl);

          var nav = document.createElement('div');
          nav.className = 'reader-nav-bar reader-nav-bar-epub';

        var leftGroup = document.createElement('div');
        leftGroup.className = 'reader-nav-group';

        var PREV_SVG = window.RenamerIcons ? window.RenamerIcons.BACK : '←';
        var NEXT_SVG = window.RenamerIcons ? window.RenamerIcons.POPUP_ARROW : '→';

        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.innerHTML = PREV_SVG;
        prevBtn.disabled = true;

        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.innerHTML = NEXT_SVG;
        nextBtn.disabled = true;

        var pageLabel = document.createElement('span');
        pageLabel.className = 'reader-page-label';
        pageLabel.textContent = '';

        leftGroup.appendChild(prevBtn);
        leftGroup.appendChild(pageLabel);
        leftGroup.appendChild(nextBtn);

        var rightGroup = document.createElement('div');
        rightGroup.className = 'reader-nav-group';

        var fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary reader-fullscreen-btn';
        fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷';
        fullscreenBtn.title = 'Plein écran / Fullscreen';

        var epubNavLocked = false;

        var epubLockNavBtn = document.createElement('button');
        epubLockNavBtn.type = 'button';
        epubLockNavBtn.className = 'reader-nav-lock-btn';
        epubLockNavBtn.dataset.locked = 'false';
        epubLockNavBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.UNLOCK : '🔓';
        epubLockNavBtn.title = (ctx.t ? ctx.t('readerLockNav') : '') || 'Verrouiller / Lock';
        epubLockNavBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerLockNav') : '') || 'Verrouiller / Lock');
        epubLockNavBtn.setAttribute('aria-pressed', 'false');
        epubLockNavBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            epubNavLocked = !epubNavLocked;
            epubLockNavBtn.dataset.locked = epubNavLocked ? 'true' : 'false';
            epubLockNavBtn.setAttribute('aria-pressed', epubNavLocked ? 'true' : 'false');
            if (epubNavLocked) {
                epubLockNavBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.LOCK : '🔒';
                epubLockNavBtn.title = (ctx.t ? ctx.t('readerUnlockNav') : '') || 'Déverrouiller / Unlock';
                epubLockNavBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerUnlockNav') : '') || 'Déverrouiller / Unlock');
                if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; }
                container.classList.remove('reader-cursor-hidden');
                container.classList.remove('reader-navs-hidden');
                epubNavsHidden = false;
            } else {
                epubLockNavBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.UNLOCK : '🔓';
                epubLockNavBtn.title = (ctx.t ? ctx.t('readerLockNav') : '') || 'Verrouiller / Lock';
                epubLockNavBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerLockNav') : '') || 'Verrouiller / Lock');
                showCursor();
            }
        });

        rightGroup.appendChild(fullscreenBtn);
        rightGroup.appendChild(epubLockNavBtn);
        nav.appendChild(leftGroup);
        nav.appendChild(rightGroup);

        var epubSettingsState = { active: false };
        var epubNavsHidden = false;
        var epubCurrentPage = 0;
        var epubClickTimer = null;
        var epubContextMenuOpen = false;
        var epubLongPressTimer = null;
        var epubSuppressNextClick = false;
        container.appendChild(nav);
        GV.neutralizeAncestorTransforms(nav);

        var epubIosNavSync = GV.setupIOSNavSync ? GV.setupIOSNavSync(container) : { sync: function() {}, cleanup: function() {} };

        var epubExploreToggle = document.createElement('button');
        epubExploreToggle.type = 'button';
        epubExploreToggle.className = 'renamer-btn renamer-btn-secondary reader-explore-btn';
        epubExploreToggle.dataset.browsingMode = 'false';
        epubExploreToggle.title = (ctx.t ? ctx.t('readerExploreMode') : '') || 'Mode exploration / Exploration mode';
        epubExploreToggle.setAttribute('aria-label', (ctx.t ? ctx.t('readerExploreMode') : '') || 'Mode exploration / Exploration mode');
        var epubExploreLabel = document.createElement('span');
        epubExploreLabel.style.cssText = 'font-size:12px;opacity:0.8;';
        epubExploreLabel.textContent = (ctx.t ? ctx.t('readerExploreMode') : '') || 'Exploration';
        epubExploreToggle.appendChild(epubExploreLabel);
        epubExploreToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (ctx.state) {
                ctx.state.readerBrowsingMode = !ctx.state.readerBrowsingMode;
                epubExploreToggle.dataset.browsingMode = ctx.state.readerBrowsingMode ? 'true' : 'false';
                if (ctx.state.readerBrowsingMode) {
                    epubExploreToggle.classList.add('reader-explore-active');
                } else {
                    epubExploreToggle.classList.remove('reader-explore-active');
                }
                if (ctx && typeof ctx.updateUrl === 'function') {
                    ctx.updateUrl({ explore: ctx.state.readerBrowsingMode ? '1' : null });
                }
            }
        });

        if (ctx.state && ctx.state.readerBrowsingMode) {
            epubExploreToggle.dataset.browsingMode = 'true';
            epubExploreToggle.classList.add('reader-explore-active');
        }

        var themeBtn = document.createElement('button');
        themeBtn.type = 'button';
        themeBtn.className = 'renamer-btn renamer-btn-secondary reader-epub-theme-btn';
        themeBtn.dataset.theme = ctx.state && ctx.state.readerEpubTheme ? ctx.state.readerEpubTheme : 'day';
        themeBtn.title = (ctx.t ? ctx.t('readerEpubTheme') : '') || 'Theme / Thème';
        themeBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerEpubTheme') : '') || 'Theme / Thème');
        themeBtn.innerHTML = getEpubThemeIcon(themeBtn.dataset.theme);
        themeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var themes = EpubThemeManager.navModes ? Object.keys(EpubThemeManager.themes) : Object.keys(EpubThemeManager.themes);
            var current = ctx.state && ctx.state.readerEpubTheme ? ctx.state.readerEpubTheme : 'day';
            var idx = themes.indexOf(current);
            var next = themes[(idx + 1) % themes.length];
            ctx.state.readerEpubTheme = next;
            themeBtn.dataset.theme = next;
            themeBtn.innerHTML = getEpubThemeIcon(next);
            if (source.rendition) {
                source.applyTheme(next);
            }
        });

        var fontBtn = document.createElement('button');
        fontBtn.type = 'button';
        fontBtn.className = 'renamer-btn renamer-btn-secondary reader-epub-font-btn';
        fontBtn.dataset.font = ctx.state && ctx.state.readerEpubFont ? ctx.state.readerEpubFont : 'default';
        fontBtn.title = (ctx.t ? ctx.t('readerEpubFont') : '') || 'Font / Police';
        fontBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerEpubFont') : '') || 'Font / Police');
        fontBtn.innerHTML = getEpubFontIcon(fontBtn.dataset.font);
        fontBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var fonts = Object.keys(EpubThemeManager.fonts);
            var current = ctx.state && ctx.state.readerEpubFont ? ctx.state.readerEpubFont : 'default';
            var idx = fonts.indexOf(current);
            var next = fonts[(idx + 1) % fonts.length];
            ctx.state.readerEpubFont = next;
            fontBtn.dataset.font = next;
            fontBtn.innerHTML = getEpubFontIcon(next);
            if (source.rendition) {
                source.setFont(EpubThemeManager.getFont(next));
            }
        });

        var fontSizeLabel = document.createElement('span');
        fontSizeLabel.className = 'reader-epub-fontsize-label';
        var fsIdx = (ctx.state && typeof ctx.state.readerEpubFontSize === 'number') ? ctx.state.readerEpubFontSize : 2;
        fontSizeLabel.textContent = Math.round(parseFloat(EpubThemeManager.fontSizes[fsIdx])) + 'px';
        fontSizeLabel.title = (ctx.t ? ctx.t('readerEpubFontSize') : '') || 'Font size / Taille de police';
        fontSizeLabel.style.cssText = 'font-size:13px;color:var(--nc-text);min-width:40px;text-align:center;';

        var fontSizeDecBtn = document.createElement('button');
        fontSizeDecBtn.type = 'button';
        fontSizeDecBtn.className = 'renamer-btn renamer-btn-secondary reader-epub-fontsize-btn';
        fontSizeDecBtn.innerHTML = '−';
        fontSizeDecBtn.title = 'Diminuer la taille / Decrease size';
        fontSizeDecBtn.setAttribute('aria-label', 'Diminuer la taille / Decrease size');
        fontSizeDecBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (ctx.state) {
                if (ctx.state.readerEpubFontSize > 0) ctx.state.readerEpubFontSize--;
                if (ctx.state.readerEpubFontSize < 0) ctx.state.readerEpubFontSize = 0;
                var newIdx = ctx.state.readerEpubFontSize;
                var size = EpubThemeManager.getFontSize(newIdx);
                fontSizeLabel.textContent = Math.round(parseFloat(size)) + 'px';
                if (source.rendition) {
                    source.setFontSize(size);
                }
            }
        });

        var fontSizeIncBtn = document.createElement('button');
        fontSizeIncBtn.type = 'button';
        fontSizeIncBtn.className = 'renamer-btn renamer-btn-secondary reader-epub-fontsize-btn';
        fontSizeIncBtn.innerHTML = '+';
        fontSizeIncBtn.title = 'Augmenter la taille / Increase size';
        fontSizeIncBtn.setAttribute('aria-label', 'Augmenter la taille / Increase size');
        fontSizeIncBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (ctx.state) {
                if (ctx.state.readerEpubFontSize < EpubThemeManager.fontSizes.length - 1) ctx.state.readerEpubFontSize++;
                var newIdx = ctx.state.readerEpubFontSize;
                var size = EpubThemeManager.getFontSize(newIdx);
                fontSizeLabel.textContent = Math.round(parseFloat(size)) + 'px';
                if (source.rendition) {
                    source.setFontSize(size);
                }
            }
        });

        var navModeBtn = document.createElement('button');
        navModeBtn.type = 'button';
        navModeBtn.className = 'renamer-btn renamer-btn-secondary reader-epub-navmode-btn';
        navModeBtn.dataset.navMode = source._getNavMethod();
        navModeBtn.title = (ctx.t ? ctx.t('readerEpubNavMode') : '') || 'Navigation mode / Mode de navigation';
        navModeBtn.setAttribute('aria-label', (ctx.t ? ctx.t('readerEpubNavMode') : '') || 'Navigation mode / Mode de navigation');
        navModeBtn.innerHTML = getEpubNavModeIcon(navModeBtn.dataset.navMode);
        navModeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (!source || !source.book || !source.book.ready) return;
            var mode = navModeBtn.dataset.navMode;
            var modes = EpubThemeManager.navModes;
            var idx = modes.indexOf(mode);
            var next = modes[(idx + 1) % modes.length];
            navModeBtn.dataset.navMode = next;
            navModeBtn.innerHTML = getEpubNavModeIcon(next);
            if (source.rendition) {
                source.switchNavMode(next).then(function() {
                    if (source.rendition) {
                        source.applyTheme(ctx.state && ctx.state.readerEpubTheme ? ctx.state.readerEpubTheme : 'day');
                        source.setFontSize(EpubThemeManager.getFontSize(fsIdx));
                    }
                }).catch(function(err) {
                    console.error('[EpubViewer] renderEpubUI: switchNavMode failed:', err && err.message ? err.message : String(err));
                    ctx.showToast('Erreur de navigation: ' + (err && err.message ? err.message : String(err)), 'error');
                });
            }
        });

        var epubSettings = GV.initReaderSettingsPanel(ctx, {
            nav: nav,
            buttonGroup: rightGroup,
            container: container,
            state: epubSettingsState,
            clearHideTimer: function() { if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; } },
            resumeInactivity: function() { showCursor(); },
            settingsButtons: [epubLockNavBtn, fullscreenBtn, epubExploreToggle, themeBtn, fontBtn, fontSizeLabel, fontSizeDecBtn, fontSizeIncBtn, navModeBtn]
        });

         var cursorHideTimer = null;

         function hideCursor() {
             if (epubSettingsState.active) return;
             if (epubNavLocked) return;
             if (!container.isConnected) return;
             container.classList.add('reader-cursor-hidden');
         }

         function showCursor() {
             if (!container.isConnected) return;
             container.classList.remove('reader-cursor-hidden');
             if (cursorHideTimer) clearTimeout(cursorHideTimer);
             if (!epubNavLocked) {
                 cursorHideTimer = setTimeout(hideCursor, 2000);
             }
         }

        var epubNavHovered = false;
        var epubNavFocused = false;

        container.setAttribute('tabindex', '-1');
        container.addEventListener('click', function() {
            container.focus();
        });

        [container].forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', function() {
                if (epubContextMenuOpen) return;
                if (!epubNavHovered) showCursor();
            });
            el.addEventListener('click', function(e) {
                if (epubSuppressNextClick) {
                    epubSuppressNextClick = false;
                    e.stopImmediatePropagation();
                    return;
                }
                if (!epubContextMenuOpen) showCursor();
            });
        });

        nav.addEventListener('mouseenter', function() {
            epubNavHovered = true;
            container.classList.remove('reader-cursor-hidden');
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = null;
        });

        nav.addEventListener('mouseleave', function() {
            epubNavHovered = false;
            if (!epubNavFocused) showCursor();
        });

        nav.addEventListener('focusin', function() {
            epubNavFocused = true;
            container.classList.remove('reader-cursor-hidden');
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = null;
        });

        nav.addEventListener('focusout', function() {
            epubNavFocused = false;
            if (!epubNavHovered) showCursor();
        });

        function navigatePrev(suppressShow) {
            if (source.rendition && source.rendition.prev) {
                try {
                    console.log('[EpubViewer] navigatePrev: calling rendition.prev()');
                    source.rendition.prev().then(function() {
                        console.log('[EpubViewer] navigatePrev: rendition.prev() resolved');
                    }).catch(function(err) {
                        console.warn('[EpubViewer] navigatePrev: rendition.prev() catch:', err && err.message ? err.message : String(err));
                    });
                } catch (e) {
                    console.error('[EpubViewer] navigatePrev: rendition.prev() error:', e.message);
                }
                if (!suppressShow) showCursor();
            } else {
                console.warn('[EpubViewer] navigatePrev: rendition or prev not available, rendition=' + (source.rendition ? 'present' : 'null'));
            }
        }

        function navigateNext(suppressShow) {
            if (source.rendition && source.rendition.next) {
                try {
                    console.log('[EpubViewer] navigateNext: calling rendition.next()');
                    source.rendition.next().then(function() {
                        console.log('[EpubViewer] navigateNext: rendition.next() resolved');
                    }).catch(function(err) {
                        console.warn('[EpubViewer] navigateNext: rendition.next() catch:', err && err.message ? err.message : String(err));
                    });
                } catch (e) {
                    console.error('[EpubViewer] navigateNext: rendition.next() error:', e.message);
                }
                if (!suppressShow) showCursor();
            } else {
                console.warn('[EpubViewer] navigateNext: rendition or next not available, rendition=' + (source.rendition ? 'present' : 'null'));
            }
        }

        prevBtn.addEventListener('click', function() { console.log('[EpubViewer] prevBtn clicked'); navigatePrev(); });

        nextBtn.addEventListener('click', function() { console.log('[EpubViewer] nextBtn clicked'); navigateNext(); });

        var epubSwipeNav = GV.createSwipeNav(container, {
            onPrev: function() { navigatePrev(true); epubSuppressNextClick = true; setTimeout(function() { epubSuppressNextClick = false; }, 800); },
            onNext: function() { navigateNext(true); epubSuppressNextClick = true; setTimeout(function() { epubSuppressNextClick = false; }, 800); },
            onSwipeStart: function() { if (epubClickTimer) { clearTimeout(epubClickTimer); epubClickTimer = null; } hideCursor(); },
            isEnabled: function() { return !epubContextMenuOpen; }
        });

        var epubClickNavZone = GV.createClickNavZone(container, {
            onPrev: function() { navigatePrev(true); },
            onNext: function() { navigateNext(true); },
            isEnabled: function(e) {
                if (!e || !e.target.closest) return false;
                if (epubContextMenuOpen) return false;
                return !e.target.closest('.reader-nav-bar, .reader-header-nav, a, button, input, select, textarea');
            }
        });

        container.addEventListener('click', function(e) {
            if (epubContextMenuOpen) return;
            e.stopPropagation();
            if (e.target.closest && e.target.closest('.reader-nav-bar, .reader-header-nav')) return;
            if (epubSuppressNextClick) {
                epubSuppressNextClick = false;
                return;
            }

            if (epubClickTimer) {
                clearTimeout(epubClickTimer);
                epubClickTimer = null;
                GV.loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                    var isFav = (favPages || []).indexOf(epubCurrentPage) !== -1;
                    if (epubCurrentPage === 0) return;
                    GV.toggleReaderPageFavorite(ctx, filePath, epubCurrentPage, !isFav).then(function(result) {
                        if (result && result.success) {
                            if (ctx.showToast) {
                                var msg = !isFav
                                    ? ((ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Added to favorites')
                                    : ((ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Removed from favorites');
                                ctx.showToast(msg, 'success');
                            }
                        }
                    }).catch(function() {});
                });
                return;
            }

            epubClickTimer = setTimeout(function() {
                epubClickTimer = null;
                if (epubNavLocked) return;
                epubNavsHidden = !epubNavsHidden;
                if (epubNavsHidden) {
                    container.classList.add('reader-navs-hidden');
                    if (cursorHideTimer) clearTimeout(cursorHideTimer);
                } else {
                    container.classList.remove('reader-navs-hidden');
                    showCursor();
                }
            }, 300);
        });

        container.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            epubContextMenuOpen = true;
            showCursor();
            if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; }
            var existing = document.getElementById('reader-ctx-menu');
            if (existing) existing.remove();

            var menu = document.createElement('div');
            menu.id = 'reader-ctx-menu';

            var addFavLabel = (ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Ajouter aux favoris';
            var removeFavLabel = (ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Retirer des favoris';
            var favItem = document.createElement('button');
            favItem.type = 'button';
            favItem.dataset.action = 'reader-ctx-favorite';

            var favState = { isFav: false, loaded: false };

            function renderFavoriteBtn() {
                var starSvg = GV.getReaderStar(favState.isFav);
                var label = favState.isFav ? removeFavLabel : addFavLabel;
                favItem.innerHTML = '<span>' + label + '</span><span class="reader-ctx-star">' + starSvg + '</span>';
            }

            GV.loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                if (!favItem.parentNode) return;
                favState.isFav = (favPages || []).indexOf(epubCurrentPage) !== -1;
                favState.loaded = true;
                renderFavoriteBtn();
            }).catch(function() {
                favState.loaded = true;
                renderFavoriteBtn();
            });

            favItem.addEventListener('click', function(ev) {
                ev.stopPropagation();
                if (!favState.loaded || epubCurrentPage === 0) return;
                var makeFav = !favState.isFav;
                favState.isFav = makeFav;
                renderFavoriteBtn();
                GV.toggleReaderPageFavorite(ctx, filePath, epubCurrentPage, makeFav).then(function(result) {
                    if (result && result.success) {
                        if (ctx.showToast) {
                            var msg = makeFav
                                ? ((ctx.t ? ctx.t('readerCtxAddFavorite') : '') || 'Added to favorites')
                                : ((ctx.t ? ctx.t('readerCtxRemoveFavorite') : '') || 'Removed from favorites');
                            ctx.showToast(msg, 'success');
                        }
                        closeMenu();
                    } else {
                        favState.isFav = !makeFav;
                        renderFavoriteBtn();
                        if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                    }
                }).catch(function() {
                    if (!favItem.parentNode) return;
                    favState.isFav = !makeFav;
                    renderFavoriteBtn();
                    if (ctx.showToast) ctx.showToast((ctx.t ? ctx.t('networkError') : '') || 'Network error', 'error');
                });
            });

            menu.appendChild(favItem);

            if (!GV.isPWAStandalone()) {
                var epubFsActive = epubPseudoFullscreen || !!document.fullscreenElement;
                var epubFsLabel = epubFsActive
                    ? ((ctx.t ? ctx.t('readerExitFullscreen') : '') || 'Quitter le plein écran / Exit fullscreen')
                    : ((ctx.t ? ctx.t('readerFullscreen') : '') || 'Plein écran / Fullscreen');
                var epubFsSep = document.createElement('div');
                epubFsSep.className = 'reader-ctx-separator';
                menu.appendChild(epubFsSep);
                var epubFsBtn = document.createElement('button');
                epubFsBtn.type = 'button';
                var epubFsIcon = epubFsActive
                    ? (window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷')
                    : (window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶');
                epubFsBtn.innerHTML = '<span class="reader-ctx-icon">' + epubFsIcon + '</span><span>' + epubFsLabel + '</span>';
                epubFsBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    var el = container;
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (epubPseudoFullscreen) {
                        exitEpubPseudoFullscreen();
                    } else if (GV.needsCSSFullscreen()) {
                        enterEpubPseudoFullscreen();
                    } else if (typeof el.requestFullscreen === 'function') {
                        el.requestFullscreen().then(function() {
                            showCursor();
                        }).catch(function() {
                            enterEpubPseudoFullscreen();
                        });
                    } else {
                        enterEpubPseudoFullscreen();
                    }
                    closeMenu();
                });
                menu.appendChild(epubFsBtn);
            }

            container.appendChild(menu);

            var menuRect = menu.getBoundingClientRect();
            var containerRect = container.getBoundingClientRect();
            var top = e.clientY - containerRect.top;
            var left = e.clientX - containerRect.left;
            if (left + menuRect.width > containerRect.width - 8) {
                left = Math.max(8, containerRect.width - menuRect.width - 8);
            }
            if (top + menuRect.height > containerRect.height - 8) {
                top = Math.max(8, containerRect.height - menuRect.height - 8);
            }
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';

            var ctxEscHandler = function(ev) {
                if (ev.key === 'Escape') {
                    ev.stopImmediatePropagation();
                    closeMenu();
                }
            };
            function closeMenu() {
                if (!menu.parentNode) {
                    document.removeEventListener('click', onDocumentClick);
                    document.removeEventListener('keydown', ctxEscHandler, true);
                    return;
                }
                menu.remove();
                epubContextMenuOpen = false;
                hideCursor();
                document.removeEventListener('click', onDocumentClick);
                document.removeEventListener('keydown', ctxEscHandler, true);
            }
            function onDocumentClick(e) {
                if (!epubContextMenuOpen || !menu.parentNode) {
                    document.removeEventListener('click', onDocumentClick);
                    return;
                }
                if (menu.contains(e.target)) return;
                closeMenu();
            }
            setTimeout(function() {
                document.addEventListener('click', onDocumentClick);
                document.addEventListener('keydown', ctxEscHandler, true);
            }, 10);
        });

        (function() {
            var lpStartX = 0, lpStartY = 0, lpTarget = null;
            function onLpTouchStart(e) {
                if (e.touches.length !== 1 || epubContextMenuOpen) return;
                var t = e.touches[0];
                lpStartX = t.clientX;
                lpStartY = t.clientY;
                lpTarget = t.target;
                epubLongPressTimer = setTimeout(function() {
                    if (epubContextMenuOpen) return;
                    var ev = new MouseEvent('contextmenu', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: lpStartX,
                        clientY: lpStartY
                    });
                    lpTarget.dispatchEvent(ev);
                }, 600);
            }
            function onLpTouchMove(e) {
                if (!epubLongPressTimer) return;
                if (e.touches.length > 0) {
                    var t = e.touches[0];
                    if (Math.abs(t.clientX - lpStartX) > 15 || Math.abs(t.clientY - lpStartY) > 15) {
                        clearTimeout(epubLongPressTimer);
                        epubLongPressTimer = null;
                    }
                }
            }
            function onLpTouchEnd() {
                if (epubLongPressTimer) {
                    clearTimeout(epubLongPressTimer);
                    epubLongPressTimer = null;
                }
            }
            container.addEventListener('touchstart', onLpTouchStart, { passive: true });
            container.addEventListener('touchmove', onLpTouchMove, { passive: true });
            container.addEventListener('touchend', onLpTouchEnd);
            container._readerEpubLongPressHandlers = {
                destroy: function() {
                    container.removeEventListener('touchstart', onLpTouchStart);
                    container.removeEventListener('touchmove', onLpTouchMove);
                    container.removeEventListener('touchend', onLpTouchEnd);
                    if (epubLongPressTimer) { clearTimeout(epubLongPressTimer); epubLongPressTimer = null; }
                }
            };
        })();

        var epubPseudoFullscreen = false;
        var epubSavedStyles = {};
        var epubSavedBodyClass = '';
        var epubSavedBodyStyles = {};

        function enterEpubPseudoFullscreen() {
            epubSavedStyles = {
                position: container.style.position,
                top: container.style.top,
                left: container.style.left,
                right: container.style.right,
                bottom: container.style.bottom,
                width: container.style.width,
                height: container.style.height,
                zIndex: container.style.zIndex,
                transform: container.style.transform,
                margin: container.style.margin,
                padding: container.style.padding,
                borderRadius: container.style.borderRadius
            };
            epubSavedBodyClass = document.body.className;
            epubSavedBodyStyles = {
                overflow: document.body.style.overflow,
                height: document.body.style.height,
                margin: document.body.style.margin,
                padding: document.body.style.padding,
                background: document.body.style.background
            };
            container.style.position = 'fixed';
            container.style.top = '';
            container.style.left = '';
            container.style.right = '';
            container.style.bottom = '';
            container.style.inset = '0';
            container.style.width = '100dvw';
            container.style.margin = '0';
            container.style.padding = '0';
            container.style.borderRadius = '0';
            container.style.zIndex = '99999';
            container.style.transform = 'none';
            container.style.boxShadow = 'none';
            container.classList.add('reader-pseudo-fullscreen', 'reader-true-fullscreen');
            document.body.classList.add('reader-ios-fullscreen');
            document.body.style.overflow = 'hidden';
            document.body.style.background = '#000';
            GV.enableReaderZoom();
            GV.setFullscreenTheme();
            epubPseudoFullscreen = true;
            fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
            fullscreenBtn.title = 'Quitter plein écran / Exit fullscreen';
            if (GV.isPWAStandalone()) {
                fullscreenBtn.style.setProperty('display', 'none', 'important');
            }
            showCursor();
        }

        function exitEpubPseudoFullscreen() {
            Object.keys(epubSavedStyles).forEach(function(k) {
                container.style[k] = epubSavedStyles[k];
            });
            container.classList.remove('reader-pseudo-fullscreen', 'reader-true-fullscreen');
            document.body.className = epubSavedBodyClass;
            Object.keys(epubSavedBodyStyles).forEach(function(k) {
                document.body.style[k] = epubSavedBodyStyles[k];
            });
            epubPseudoFullscreen = false;
            fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷';
            fullscreenBtn.title = 'Plein écran / Fullscreen';
            fullscreenBtn.style.removeProperty('display');
            showCursor();
        }

        fullscreenBtn.addEventListener('click', function() {
            var el = container;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else if (epubPseudoFullscreen) {
                exitEpubPseudoFullscreen();
            } else if (GV.needsCSSFullscreen()) {
                enterEpubPseudoFullscreen();
            } else if (typeof el.requestFullscreen === 'function') {
                el.requestFullscreen().then(function() {
                    showCursor();
                }).catch(function() {
                    enterEpubPseudoFullscreen();
                });
            } else {
                enterEpubPseudoFullscreen();
            }
        });

        document.addEventListener('fullscreenchange', function() {
            var active = !!document.fullscreenElement;
            if (!active && epubPseudoFullscreen) {
                exitEpubPseudoFullscreen();
                return;
            }
            if (!active && !epubPseudoFullscreen) {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.COLLAPSE : '⛷';
                fullscreenBtn.title = 'Plein écran / Fullscreen';
            } else if (active && !epubPseudoFullscreen) {
                fullscreenBtn.innerHTML = window.RenamerIcons ? window.RenamerIcons.EXPAND : '⛶';
                fullscreenBtn.title = 'Quitter plein écran / Exit fullscreen';
                showCursor();
            }
        });

        var epubFullScreenKeydown = function(e) {
            if (epubPseudoFullscreen && !document.fullscreenElement && (e.key === 'Escape' || e.key === 'Esc')) {
                e.preventDefault();
                exitEpubPseudoFullscreen();
            }
        };
        document.addEventListener('keydown', epubFullScreenKeydown);

        var onKeyDown = function(e) {
            if (source.rendition && source.rendition.display && source.book && source.book.ready) {
                if (e.key === 'ArrowLeft') {
                    navigatePrev();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    navigateNext();
                    e.preventDefault();
                } else if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else if (epubPseudoFullscreen) {
                        exitEpubPseudoFullscreen();
                    } else if (GV.needsCSSFullscreen()) {
                        enterEpubPseudoFullscreen();
                    } else if (typeof container.requestFullscreen === 'function') {
                        container.requestFullscreen().catch(function() {
                            enterEpubPseudoFullscreen();
                        });
                    } else {
                        enterEpubPseudoFullscreen();
                    }
                }
            }
        };
        document.addEventListener('keydown', onKeyDown);

        function updateNavButtons() {
            if (source.rendition && source.rendition.manager) {
                var mgr = source.rendition.manager;
                var current = mgr.current ? mgr.current() : null;
                if (!current || !current.section) {
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                } else {
                    try {
                        prevBtn.disabled = !current.section.prev();
                        nextBtn.disabled = !current.section.next();
                    } catch(e) {
                        prevBtn.disabled = true;
                        nextBtn.disabled = true;
                    }
                }
            } else {
                prevBtn.disabled = true;
                nextBtn.disabled = true;
            }
        }

        function updatePageLabel(loc) {
            console.log('[EpubViewer] updatePageLabel: loc.start keys=[' + (loc && loc.start ? Object.keys(loc.start).join(',') : 'none') + ']', loc && loc.start ? loc.start : loc);
            var totalPages = (loc && loc.start && loc.start.displayed && loc.start.displayed.total) || (loc && loc.end && loc.end.displayed && loc.end.displayed.total) || 0;
            var currentPage = loc && loc.start && loc.start.index !== undefined ? loc.start.index + 1 : 0;
            if (currentPage > 0 && totalPages > 0) {
                pageLabel.textContent = currentPage + ' / ' + totalPages;
                epubCurrentPage = currentPage;
                console.log('[EpubViewer] updatePageLabel: displaying page', currentPage, '/', totalPages);
            } else if (currentPage > 0) {
                var total = source && source.book && source.book.spine ? source.book.spine.length : 0;
                var locCurrent = loc && loc.start && loc.start.location !== undefined ? loc.start.location : 0;
                if (locCurrent < 0) locCurrent = 0;
                var locTotalGenerated = (source && source.book && source.book.locations && typeof source.book.locations.total === 'number') ? source.book.locations.total : 0;
                if (locTotalGenerated > 0) {
                    pageLabel.textContent = (locCurrent + 1) + ' / ' + (locTotalGenerated + 1);
                    epubCurrentPage = locCurrent + 1;
                    console.log('[EpubViewer] updatePageLabel: displaying location', locCurrent + 1, '/', locTotalGenerated + 1);
                } else if (total > 0) {
                    pageLabel.textContent = 'Ch. ' + currentPage + ' / ' + total;
                    epubCurrentPage = currentPage;
                    console.log('[EpubViewer] updatePageLabel: displaying chapter', currentPage, '/', total, '(locations not generated yet)');
                }
            } else if (loc) {
                console.warn('[EpubViewer] updatePageLabel: cannot determine page count, totalPages=' + totalPages + ' currentPage=' + currentPage);
            }
        }

        function refreshEpubPageCount() {
            if (!source || !source.book || !source.book.ready) return;
            source.book.ready.then(function() {
                if (!source.book || !source.book.ready) return;
                try {
                    var loc = source.book.locations;
                    if (loc && typeof loc.total === 'number' && loc.total > 0) {
                        console.log('[EpubViewer] refreshEpubPageCount: total=' + loc.total);
                    } else if (loc && typeof loc.length === 'function') {
                        console.log('[EpubViewer] refreshEpubPageCount: locations.length()=' + loc.length());
                    }
                    if (source.rendition && source.rendition.location) {
                        try {
                            var currentLoc = source.rendition.location();
                            if (currentLoc && currentLoc.start) {
                                console.log('[EpubViewer] refreshEpubPageCount: current location start keys=[' + Object.keys(currentLoc.start).join(',') + ']');
                            }
                        } catch(e2) {
                            console.warn('[EpubViewer] refreshEpubPageCount: rendition.location() failed:', e2.message);
                        }
                    }
                } catch(e) {
                    console.error('[EpubViewer] refreshEpubPageCount: error:', e.message);
                }
            }).catch(function(e) {
                console.error('[EpubViewer] refreshEpubPageCount: book.ready failed:', e.message);
            });
        }

         showCursor();

         var epubWindowMouseMove = function(e) {
             try {
                 if (epubContextMenuOpen) return;
                 if (container.classList.contains('reader-cursor-hidden') && !epubNavHovered) {
                     showCursor();
                 }
             } catch (err) {
                 console.warn('[EpubViewer] epubWindowMouseMove error:', err.message);
             }
         };
         var epubWindowMouseDown = function(e) {
             try {
                 if (epubContextMenuOpen) return;
                 if (container.classList.contains('reader-cursor-hidden') && !epubNavHovered) {
                     showCursor();
                 }
                 if (container.classList.contains('reader-navs-hidden')) {
                     container.classList.remove('reader-navs-hidden');
                     if (epubNavsHidden !== undefined) epubNavsHidden = false;
                     console.log('[EpubViewer] renderEpubUI: nav restored via mousedown');
                 }
                 if (container.isConnected) container.focus();
             } catch (err) {
                 console.warn('[EpubViewer] epubWindowMouseDown error:', err.message);
             }
         };
         window.addEventListener('mousemove', epubWindowMouseMove);
         window.addEventListener('mousedown', epubWindowMouseDown);
         window.addEventListener('focus', function() {
             try {
                 if (!container.isConnected || !source.rendition) return;
                 if (source.rendition && source.rendition.resize) {
                     source.rendition.resize();
                 }
             } catch (err) {
                 console.warn('[EpubViewer] window focus handler error:', err.message);
             }
         });

        var epubFavOnlyBtn = container.querySelector('.reader-favorites-only-btn');
        var epubFavoritesOnlyMode = false;
        var epubFavoritePages = [];
        if (epubFavOnlyBtn) {
            epubFavOnlyBtn.style.opacity = '0.3';
            epubFavOnlyBtn.disabled = true;
            GV.loadReaderPageFavorites(ctx, filePath).then(function(favPages) {
                epubFavoritePages = (favPages || []).slice().sort(function(a, b) { return a - b; });
                if (epubFavOnlyBtn.parentNode) {
                    epubFavOnlyBtn.style.opacity = epubFavoritePages.length ? '1' : '0.3';
                    epubFavOnlyBtn.disabled = !epubFavoritePages.length;
                }
                var startFavOnly = !!(ctx.state && ctx.state.readerFavoritesOnly) && epubFavoritePages.length > 0;
                if (startFavOnly) {
                    epubFavoritesOnlyMode = true;
                    epubFavOnlyBtn.dataset.on = 'true';
                    epubFavOnlyBtn.innerHTML = GV.getReaderStar(true);
                }
            }).catch(function() {});
            epubFavOnlyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (!epubFavoritePages.length) {
                    if (ctx.showToast) {
                        ctx.showToast((ctx.t ? ctx.t('readerNoPageFavorites') : '') || 'No favorite pages', 'info');
                    }
                    return;
                }
                epubFavoritesOnlyMode = !epubFavoritesOnlyMode;
                epubFavOnlyBtn.dataset.on = epubFavoritesOnlyMode ? 'true' : 'false';
                epubFavOnlyBtn.innerHTML = GV.getReaderStar(epubFavoritesOnlyMode);
                if (ctx.showToast) {
                    ctx.showToast(
                        epubFavoritesOnlyMode
                            ? ((ctx.t ? ctx.t('readerFavoritesOnlyActive') : '') || 'Favorites mode active')
                            : ((ctx.t ? ctx.t('readerFavoritesOnlyInactive') : '') || 'Favorites mode deactivated'),
                        'success'
                    );
                }
            });
        }

        _currentRendition = source.rendition;

        return source.render(container).then(function() {
            _currentRendition = source.rendition;
            if (!container.isConnected) {
                console.log('[EpubViewer] renderEpubUI: container detached during epub render');
                window.removeEventListener('mousemove', epubWindowMouseMove);
                window.removeEventListener('mousedown', epubWindowMouseDown);
                if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; }
                if (epubClickTimer) { clearTimeout(epubClickTimer); epubClickTimer = null; }
                if (epubLongPressTimer) { clearTimeout(epubLongPressTimer); epubLongPressTimer = null; }
                return Promise.resolve(null);
            }
            if (source.rendition) {
                source.rendition.on('relocated', function(loc) {
                    updateNavButtons();
                    updatePageLabel(loc);
                    if (source.rendition.manager) {
                        source.rendition.manager.on('relocated', function() {
                            showCursor();
                        });
                    }
                });
                source.rendition.on('rendered', function() {
                    console.log('[EpubViewer] renderEpubUI: rendition rendered for "' + filePath + '"');
                    updateNavButtons();
                });
                source.rendition.on('location_changed', function(loc) {
                    updatePageLabel(loc);
                });
                updateNavButtons();
                refreshEpubPageCount();

                source._onLocationsReady = function() {
                    console.log('[EpubViewer] renderEpubUI: locations ready, refreshing page label');
                    try {
                        if (source.rendition && source.rendition.location) {
                            var currentLoc = source.rendition.location();
                            if (currentLoc) {
                                updatePageLabel(currentLoc);
                            }
                        }
                    } catch (e) {
                        console.warn('[EpubViewer] renderEpubUI: _onLocationsReady refresh failed:', e.message);
                    }
                };
            }

            EpubThemeManager.applyToRendition(source.rendition, source);

            var savedBm = GV.getBookmarks(ctx)[filePath];
            if (savedBm && savedBm.value > 0 && savedBm.value <= 100) {
                try {
                    source.book.ready.then(function() {
                        var loc = savedBm.value / 100;
                        if (source.rendition && source.rendition.goto) {
                            source.rendition.goto(loc).catch(function() {});
                        }
                    });
                } catch (e) {}
             }
            if (GV.isPWAStandalone()) {
                enterEpubPseudoFullscreen();
                if (epubIosNavSync && epubIosNavSync.sync) {
                    setTimeout(function() { epubIosNavSync.sync(); }, 50);
                }
            }
            var epubInstance = {
                killInactivityTimer: function() {
                    if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; }
                    if (epubClickTimer) { clearTimeout(epubClickTimer); epubClickTimer = null; }
                    if (epubLongPressTimer) { clearTimeout(epubLongPressTimer); epubLongPressTimer = null; }
                },
                destroy: function() {
                document.getElementById('reader-ctx-menu')?.remove();
                if (epubSettings && typeof epubSettings.destroy === 'function') {
                    epubSettings.destroy();
                }
                document.removeEventListener('keydown', onKeyDown);
                if (epubSwipeNav && typeof epubSwipeNav.destroy === 'function') {
                    try { epubSwipeNav.destroy(); } catch (e) {}
                }
                if (epubClickNavZone && typeof epubClickNavZone.destroy === 'function') {
                    try { epubClickNavZone.destroy(); } catch (e) {}
                }
                if (epubClickTimer) { clearTimeout(epubClickTimer); epubClickTimer = null; }
                if (cursorHideTimer) { clearTimeout(cursorHideTimer); cursorHideTimer = null; }
                window.removeEventListener('mousemove', epubWindowMouseMove);
                window.removeEventListener('mousedown', epubWindowMouseDown);
                if (container._readerEpubLongPressHandlers && typeof container._readerEpubLongPressHandlers.destroy === 'function') {
                    try { container._readerEpubLongPressHandlers.destroy(); } catch (e) {}
                }
                container.classList.remove('reader-navs-hidden');
                document.body.classList.remove('reader-navs-viewport');
                document.body.classList.remove('reader-cursor-hidden');
                container.classList.remove('reader-cursor-hidden');
                GV.restoreAncestorTransforms();
                if (epubPseudoFullscreen) {
                    exitEpubPseudoFullscreen();
                }
                 document.removeEventListener('keydown', epubFullScreenKeydown);
                 GV.restoreViewport();
                 source.destroy();
                    if (epubIosNavSync && epubIosNavSync.cleanup) epubIosNavSync.cleanup();
                } };
            container._readerUIInstance = epubInstance;
            return epubInstance;
        }).catch(function(err) {
            console.error('[EpubViewer] renderEpubUI: render error for "' + filePath + '":', err && err.message ? err.message : String(err));
            container.innerHTML = '<div class="reader-error">Erreur: ' + (err && err.message ? err.message : String(err)) + '</div>';
        });
    }

    function pathExt(filePath) {
        if (!filePath) return '';
        var idx = filePath.lastIndexOf('.');
        if (idx === -1) return '';
        return filePath.slice(idx).toLowerCase();
    }

    function formatElapsedTime(ms) {
        var total = Math.floor(ms / 1000);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        return (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function renderFile(ctx, filePath, blob, container) {
        var startTime = Date.now();
        var isVerboseClient = !!(typeof window !== 'undefined' && window.RenamerLog && typeof window.RenamerLog.isClientMode === 'function' && window.RenamerLog.isClientMode());

        function startReaderTimer(label) {
            if (!isVerboseClient) return;
            var fileName = filePath.replace(/^.*\//, '');
            console.log('[Reader]', label, 'path:', filePath, 'elapsed: 00:00');
            container.innerHTML = '';

            var toastId = 'renamer-reader-loading-toast';
            var toast = document.getElementById(toastId);

            if (!toast) {
                var toastContainerEl = document.getElementById('renamer-toast-container');
                if (!toastContainerEl) {
                    toastContainerEl = document.createElement('div');
                    toastContainerEl.id = 'renamer-toast-container';
                    toastContainerEl.className = 'renamer-toast-container';
                    document.body.appendChild(toastContainerEl);
                }

                toast = document.createElement('div');
                toast.id = toastId;
                toast.className = 'renamer-toast renamer-toast-info';
                toast.innerHTML = '<span class="renamer-reader-loading-spinner"></span><span class="renamer-toast-text"></span><button class="renamer-toast-close" type="button" aria-label="Fermer">×</button>';
                toast.querySelector('.renamer-toast-close').addEventListener('click', function() {
                    if (container._readerLoadTimerInterval) { clearInterval(container._readerLoadTimerInterval); container._readerLoadTimerInterval = null; }
                    if (toast.parentNode) toast.remove();
                });
                toastContainerEl.appendChild(toast);
                setTimeout(function() { toast.classList.add('renamer-toast-show'); }, 10);

                var textEl = toast.querySelector('.renamer-toast-text');
                textEl.textContent = (ctx.t('loading') || 'Chargement...') + ' \'' + fileName + '\' (00:00)';

                var timerInterval = setInterval(function() {
                    var elapsed = Date.now() - startTime;
                    if (textEl) textEl.textContent = (ctx.t('loading') || 'Chargement...') + ' \'' + fileName + '\' (' + formatElapsedTime(elapsed) + ')';
                }, 1000);
                container._readerLoadTimerInterval = timerInterval;
                if (toast) toast._readerTimerInterval = timerInterval;
            }
        }

        function removeReaderToast() {
            if (container._readerLoadTimerInterval) {
                clearInterval(container._readerLoadTimerInterval);
                container._readerLoadTimerInterval = null;
            }
            var toast = document.getElementById('renamer-reader-loading-toast');
            if (toast) {
                if (toast._readerTimerInterval) {
                    clearInterval(toast._readerTimerInterval);
                    toast._readerTimerInterval = null;
                }
                toast.classList.remove('renamer-toast-show');
                setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
            }
            var overlay = document.getElementById('reader-page-loading-overlay');
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        }

        var ext = pathExt(filePath);
        console.log('[EpubViewer] renderFile: path="' + filePath + '" ext="' + ext + '"', 'blob=' + (blob ? ('size=' + blob.size) : 'null'));

        if (ext !== '.epub' && ext !== '.azw' && ext !== '.azw3' && ext !== '.mobi' && ext !== '.prc') {
            console.error('[EpubViewer] renderFile: unsupported extension "' + ext + '" for file "' + filePath + '"');
            ctx.showToast('Format non supporté: ' + ext, 'error');
            return Promise.resolve();
        }

        var source = createEpubSource(blob, ctx, filePath);
        console.log('[EpubViewer] renderFile: EPUB path detected, starting load for "' + filePath + '"');
        startReaderTimer('EPUB load');
        GV.showReaderLoading(ctx, container, filePath);

        container._renamerSource = source;
        container._readerFilePath = filePath;
        if (blob) {
            container._readerCachedBlob = blob;
            if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.cacheBlob) {
                window.RenamerDevRefresh.cacheBlob(ctx, filePath, blob, startTime);
            }
        }

        return GV.scheduleSourceLoad(source).then(function() {
            console.log('[Reader] EPUB loaded', 'path:', filePath, 'elapsed:', formatElapsedTime(Date.now() - startTime));
            console.log('[EpubViewer] renderFile: EPUB loaded successfully, rendering UI for "' + filePath + '"');
            return renderEpubUI(ctx, container, source, filePath);
        }).then(function(result) {
            removeReaderToast();
            if (typeof window.RenamerDevRefresh !== 'undefined' && window.RenamerDevRefresh.setActiveReader) {
                window.RenamerDevRefresh.setActiveReader(container, ctx, filePath);
            }
            return result;
        }).catch(function(err) {
            removeReaderToast();
            ctx.showToast('Erreur: ' + (err && err.message ? err.message : String(err)), 'error');
        });
    }

    function getEpubThemeIcon(themeName) {
        var icons = {
            'day': '☀',
            'night': '🌙',
            'sepia': '📜',
            'paper': '📄'
        };
        return icons[themeName] || '☀';
    }

    function getEpubFontIcon(fontName) {
        var icons = {
            'default': 'A',
            'serif': 'S',
            'sans': 'Sans'
        };
        return icons[fontName] || 'A';
    }

    function getEpubNavModeIcon(mode) {
        var icons = {
            'paginated': '📄',
            'scrolling': '↕',
            'slide': '⇀'
        };
        return icons[mode] || '📄';
    }

    if (!GV._epubCssInjected) {
        GV._epubCssInjected = true;
        var css = [
            '.reader-epub-theme-btn{width:32px;height:32px;font-size:16px;padding:4px;transition:var(--nc-transition)}',
            '.reader-epub-font-btn{width:32px;height:32px;font-size:14px;padding:4px;transition:var(--nc-transition)}',
            '.reader-epub-fontsize-label{width:40px;height:28px;font-size:13px;display:flex;align-items:center;justify-content:center;color:var(--nc-text);background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);cursor:default}',
            '.reader-epub-fontsize-btn{width:28px;height:28px;font-size:16px;padding:4px;transition:var(--nc-transition)}',
            '.reader-epub-navmode-btn{width:32px;height:32px;font-size:16px;padding:4px;transition:var(--nc-transition);display:flex;align-items:center;justify-content:center}',
            '.reader-epub-theme-btn:hover,.reader-epub-font-btn:hover,.reader-epub-fontsize-btn:hover,.reader-epub-navmode-btn:hover{background:rgba(124,58,237,0.1)}'
        ].join('');
        var styleEl = document.createElement('style');
        styleEl.id = 'renamer-epub-viewer-styles';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }

    window.RenamerEpubViewer = {
        EpubSource: EpubSource,
        EpubThemeManager: EpubThemeManager,
        renderEpubUI: renderEpubUI,
        renderFile: renderFile,
        createEpubSource: createEpubSource
    };
})();
