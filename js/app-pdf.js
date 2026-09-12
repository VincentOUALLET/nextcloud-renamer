(function() {
    'use strict';

    const TAB_ID = 'pdf';

    const CHECK_SVG = window.RenamerIcons.CHECK;
    const UNCHECK_SVG = window.RenamerIcons.UNCHECK;
    const DRAG_HANDLE_SVG = window.RenamerIcons.DRAG;

    function pdfToCbzName(path) {
        const base = String(path).replace(/^.*\//, '');
        return base.replace(/\.pdf$/i, '') + '.cbz';
    }

    function isPdfPath(path) {
        return /\.pdf$/i.test(String(path || ''));
    }

    function buildTab(ctx) {
        const t = ctx.t;
        return `
            <div class="renamer-panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div class="renamer-main">
                    <div class="renamer-rules" id="pdf-rules" style="overflow:hidden;transition:width 0.3s ease,min-width 0.3s ease;">
                        <button type="button" id="pdf-rules-toggle" class="renamer-btn-icon pdf-rules-toggle" title="${t('pdfActions') || 'Actions PDF'}" data-translation="pdfActions" style="padding:8px;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);cursor:pointer;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                        </button>
                        <div class="renamer-rules-list" id="pdf-rules-list" style="overflow:hidden;">
                            <div class="renamer-rule-card type-pdf-action" data-action-id="convert-cbz">
                                <div class="renamer-rule-header">
                                    <span class="renamer-rule-drag" title="${t('dragToReorder')}" data-translation="dragToReorder">${DRAG_HANDLE_SVG}</span>
                                    <span class="renamer-rule-number" style="background:var(--nc-red)">1</span>
                                    <span class="renamer-rule-name" data-title="${t('convertPdfToCbz')}" data-translation="convertPdfToCbz">${t('convertPdfToCbz')}</span>
                                    <div class="renamer-rule-actions">
                                        <div class="renamer-toggle on" data-pdf-toggle-action="convert-cbz" title="${t('on')}" data-translation="on" draggable="false">
                                            <div class="renamer-toggle-knob"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="renamer-rule-body">
                                    <div style="flex:1;font-size:13px;color:var(--nc-text);opacity:0.8;" data-translation="pdfConvertDescription">${t('pdfConvertDescription') || 'Rasterise chaque page en PNG et assemble en CBZ (compatible Kavita).'}</div>
                                    <button class="renamer-btn renamer-btn-primary" id="pdf-action-convert-cbz" disabled style="opacity:0.5;cursor:not-allowed;margin-left:auto;" data-translation="convertPdfToCbz">${t('convertPdfToCbz')}</button>
                                </div>
                            </div>
                            <div class="renamer-rule-card type-pdf-action" data-action-id="preview-pdf" style="margin-top:8px;">
                                <div class="renamer-rule-header">
                                    <span class="renamer-rule-drag" title="${t('dragToReorder')}" data-translation="dragToReorder">${DRAG_HANDLE_SVG}</span>
                                    <span class="renamer-rule-number" style="background:var(--nc-blue)">2</span>
                                    <span class="renamer-rule-name" data-title="${t('pdfPreviewTitle')}" data-translation="pdfPreviewTitle">${t('pdfPreviewTitle') || 'Aperçu PDF'}</span>
                                    <div class="renamer-rule-actions">
                                        <div class="renamer-toggle on" data-pdf-toggle-action="preview-pdf" title="${t('on')}" data-translation="on" draggable="false">
                                            <div class="renamer-toggle-knob"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="renamer-rule-body">
                                    <div style="flex:1;font-size:13px;color:var(--nc-text);opacity:0.8;" data-translation="pdfPreviewDescription">${t('pdfPreviewDescription') || 'Génère des miniatures JPEG de toutes les pages pour visualiser rapidement le contenu.'}</div>
                                    <button class="renamer-btn renamer-btn-primary" id="pdf-action-preview" disabled style="opacity:0.5;cursor:not-allowed;margin-left:auto;" data-translation="pdfPreviewTitle">${t('pdfPreviewTitle') || 'Aperçu PDF sélectionnés'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="renamer-preview" id="pdf-preview">
                        <div class="renamer-preview-header" id="pdf-preview-header">
                            <span data-translation="preview">${t('preview')}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button type="button" id="pdf-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="${t('deselectAllTitle')}" data-translation="deselectAllTitle">${CHECK_SVG}</button>
                                <button type="button" id="pdf-preview-back" class="renamer-btn renamer-btn-secondary" data-translation="pdfPreviewBack" style="display:none;">← ${t('pdfPreviewBack') || 'Retour à la liste'}</button>
                            </div>
                        </div>
                        <div class="renamer-preview-list" id="pdf-preview-list"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function updateToggleAllButton(ctx) {
        const btn = document.getElementById('pdf-toggle-all');
        if (!btn) return;
        const total = (ctx.state.files || []).filter(isPdfPath).length;
        const allOn = ctx.state.allSelected || ctx.state.fileSelection.size === total;
        btn.className = allOn
            ? 'renamer-badge renamer-badge-success renamer-badge-toggle'
            : 'renamer-badge renamer-badge-deselected renamer-badge-toggle';
        btn.innerHTML = allOn ? CHECK_SVG : UNCHECK_SVG;
        btn.title = allOn ? 'Désélectionner Tout' : 'Sélectionner Tout';
        btn.setAttribute('data-translation', allOn ? 'deselectAllTitle' : 'selectAll');
    }

    function updateActionButtonState(ctx) {
        const btn = document.getElementById('pdf-action-convert-cbz');
        if (!btn) return;
        const total = (ctx.state.files || []).filter(isPdfPath).length;
        const selected = ctx.state.allSelected ? total : ctx.state.fileSelection.size;
        const ok = selected > 0;
        btn.disabled = !ok;
        btn.style.opacity = ok ? '1' : '0.5';
        btn.style.cursor = ok ? 'pointer' : 'not-allowed';
    }

    function updatePreviewActionButtonState(ctx) {
        const btn = document.getElementById('pdf-action-preview');
        if (!btn) return;
        const total = (ctx.state.files || []).filter(isPdfPath).length;
        const selected = ctx.state.allSelected ? total : ctx.state.fileSelection.size;
        const ok = selected > 0;
        btn.disabled = !ok;
        btn.style.opacity = ok ? '1' : '0.5';
        btn.style.cursor = ok ? 'pointer' : 'not-allowed';
    }

    function render(ctx) {
        console.log('[PDF DEBUG] render called, pdfPreviewMode:', ctx.state.pdfPreviewMode);
        ctx.state.pdfPreviewMode = false;
        // Don't reset pdfPreviewData - keep cache!
        ctx.state.pdfPreviewSelection = {};
        ctx.state.pdfPageModal = null;

        const rulesList = document.getElementById('pdf-rules-list');
        const rulesPanel = document.getElementById('pdf-rules');
        if (rulesList) rulesList.style.display = '';
        if (rulesPanel) {
            rulesPanel.style.width = '280px';
            rulesPanel.style.minWidth = '280px';
        }

        const list = document.getElementById('pdf-preview-list');
        if (!list) return;
        list.innerHTML = '';

        const header = document.getElementById('pdf-preview-header');
        if (header) {
            header.innerHTML = `
                <span data-translation="preview">${ctx.t('preview')}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button type="button" id="pdf-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="${ctx.t('deselectAllTitle')}" data-translation="deselectAllTitle">${CHECK_SVG}</button>
                    <button type="button" id="pdf-preview-back" class="renamer-btn renamer-btn-secondary" data-translation="pdfPreviewBack" style="display:none;">← ${ctx.t('pdfPreviewBack') || 'Retour à la liste'}</button>
                </div>
            `;
            header.className = 'renamer-preview-header';
        }

        const files = (ctx.state.files || []).filter(isPdfPath);
        if (ctx.state.allSelected) {
            ctx.state.fileSelection = new Set(files);
        } else {
            const filtered = new Set();
            ctx.state.fileSelection.forEach(function(p) { if (isPdfPath(p)) filtered.add(p); });
            ctx.state.fileSelection = filtered;
        }

        if (!files.length) {
            const empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
            empty.textContent = ctx.t('noPdfSelected') || 'Aucun PDF à afficher';
            empty.setAttribute('data-translation', 'noPdfSelected');
            list.appendChild(empty);
            updateToggleAllButton(ctx);
            initPreviewDnD(ctx, list);
            updateActionButtonState(ctx);
            updatePreviewActionButtonState(ctx);
            return;
        }

        files.forEach((file, idx) => {
            const isDeselected = !ctx.state.allSelected && !ctx.state.fileSelection.has(file);
            const fromBase = file.replace(/^.*\//, '');
            const toBase = pdfToCbzName(file);
            const row = document.createElement('div');
            const rowClasses = ['renamer-preview-row'];
            if (isDeselected) rowClasses.push('renamer-preview-row-deselected');
            row.className = rowClasses.join(' ');
            row.dataset.index = idx;
            row.dataset.path = file;
            if (isDeselected) row.style.opacity = '0.5';
            const badgeHtml = isDeselected
                ? '<button type="button" class="renamer-badge renamer-badge-deselected renamer-badge-toggle" data-path="' + ctx.escapeHtml(file) + '" title="' + ctx.t('deselectDeselected') + '" data-translation="deselectDeselected">' + UNCHECK_SVG + '</button>'
                : '<button type="button" class="renamer-badge renamer-badge-success renamer-badge-toggle" data-path="' + ctx.escapeHtml(file) + '" title="' + ctx.t('clickToDeselect') + '" data-translation="clickToDeselect">' + CHECK_SVG + '</button>';
            row.innerHTML = `
                <span class="renamer-preview-drag-handle" title="${ctx.t('dragToReorder')}" data-translation="dragToReorder">${DRAG_HANDLE_SVG}</span>
                <span class="renamer-preview-from" style="word-break:break-word;white-space:normal;">${ctx.escapeHtml(fromBase)}</span>
                <span class="renamer-preview-arrow">→</span>
                <span class="renamer-preview-to" style="word-break:break-word;white-space:normal;">${ctx.escapeHtml(toBase)}</span>
                ${badgeHtml}
            `;
            list.appendChild(row);
        });

        list.querySelectorAll('.renamer-badge-toggle').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const p = this.dataset.path;
                if (!p) return;
                if (ctx.state.allSelected) {
                    ctx.state.fileSelection = new Set((ctx.state.files || []).filter(isPdfPath));
                    ctx.state.allSelected = false;
                }
                if (ctx.state.fileSelection.has(p)) ctx.state.fileSelection.delete(p);
                else ctx.state.fileSelection.add(p);
                render(ctx);
            });
        });

        updateToggleAllButton(ctx);
        initPreviewDnD(ctx, list);
        updateActionButtonState(ctx);
        updatePreviewActionButtonState(ctx);
        bindEvents(ctx);
    }

    function renderPreview(ctx) {
        console.log('[PDF DEBUG] renderPreview called, pdfPreviewMode:', ctx.state.pdfPreviewMode, 'pdfPreviewData:', !!ctx.state.pdfPreviewData);
        const list = document.getElementById('pdf-preview-list');
        if (!list) return;

        const rulesList = document.getElementById('pdf-rules-list');
        const rulesPanel = document.getElementById('pdf-rules');
        if (rulesList) rulesList.style.display = 'none';
        if (rulesPanel) {
            rulesPanel.style.transition = 'width 0.3s ease, min-width 0.3s ease';
            rulesPanel.style.width = '0';
            rulesPanel.style.minWidth = '0';
        }

        const backBtn = document.getElementById('pdf-preview-back');
        if (backBtn) backBtn.style.display = 'inline-flex';

        list.innerHTML = '';

        const header = document.getElementById('pdf-preview-header');
        if (header) {
            const data = ctx.state.pdfPreviewData;
            const totalFiles = (data && data.results) ? data.results.length : 0;
            const totalPages = (data && data.results) ? data.results.reduce(function(s, r) { return s + (r.pages ? r.pages.length : 0); }, 0) : 0;
            header.className = 'renamer-preview-header pdf-preview-header';
            header.innerHTML = `
                <span data-translation="pdfPreviewTitle">${ctx.t('pdfPreviewTitle') || 'Aperçu PDF'}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="pdf-preview-info">${totalFiles} ${ctx.t('files') || 'fichiers'}, ${totalPages} ${ctx.t('pages') || 'pages'} au total</span>
                    <button type="button" id="pdf-preview-back" class="renamer-btn renamer-btn-secondary" data-translation="pdfPreviewBack">← ${ctx.t('pdfPreviewBack') || 'Retour à la liste'}</button>
                    <button type="button" id="pdf-preview-fullscreen" class="renamer-btn renamer-btn-secondary" title="${ctx.t('pdfFullscreen') || 'Plein écran'}" data-translation="pdfFullscreen" style="padding:4px 8px;">⛶</button>
                </div>
            `;
        }

        const results = (ctx.state.pdfPreviewData && ctx.state.pdfPreviewData.results) || [];
        if (!results.length) {
            const empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
            empty.textContent = ctx.t('pdfPreviewNoPdf') || 'Aucun aperçu disponible';
            empty.setAttribute('data-translation', 'pdfPreviewNoPdf');
            list.appendChild(empty);
            bindEvents(ctx);
            return;
        }

        results.forEach(function(entry) {
            const group = document.createElement('div');
            group.className = 'pdf-preview-file-group';
            group.dataset.path = entry.path;

            const title = document.createElement('h2');
            title.className = 'pdf-preview-file-title';
            title.textContent = entry.fileName || entry.path.replace(/^.*\//, '');
            group.appendChild(title);

            if (entry.error) {
                const err = document.createElement('div');
                err.style.cssText = 'font-size:12px;color:var(--nc-red);opacity:0.8;';
                err.textContent = 'Erreur: ' + entry.error;
                group.appendChild(err);
            }

            const thumbsContainer = document.createElement('div');
            thumbsContainer.className = 'pdf-preview-thumbnails';

            const pages = entry.pages || [];
            pages.forEach(function(pageData) {
                const thumb = document.createElement('div');
                thumb.className = 'pdf-preview-thumb';
                thumb.dataset.path = entry.path;
                thumb.dataset.page = pageData.page;
                thumb.dataset.thumbDataUrl = pageData.thumbDataUrl;

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'pdf-preview-thumb-check';
                cb.dataset.path = entry.path;
                cb.dataset.page = pageData.page;

                const sel = ctx.state.pdfPreviewSelection[entry.path];
                if (sel && sel.has(pageData.page)) {
                    cb.checked = true;
                }

                const img = document.createElement('img');
                img.src = pageData.thumbDataUrl;
                img.alt = 'Page ' + pageData.page;
                img.loading = 'lazy';

                const overlay = document.createElement('div');
                overlay.className = 'pdf-preview-thumb-overlay';

                const reopenBtn = document.createElement('button');
                reopenBtn.type = 'button';
                reopenBtn.className = 'pdf-preview-thumb-reopen';
                reopenBtn.innerHTML = '↗';
                reopenBtn.title = ctx.t('pdfReopenPage') || 'Voir en plein écran';
                reopenBtn.setAttribute('data-translation', 'pdfReopenPage');
                reopenBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    openPageModal(ctx, entry.path, pageData.page);
                });

                overlay.appendChild(reopenBtn);

                const label = document.createElement('span');
                label.className = 'pdf-preview-thumb-label';
                label.textContent = 'p.' + pageData.page;

                thumb.appendChild(cb);
                thumb.appendChild(img);
                thumb.appendChild(overlay);
                thumb.appendChild(label);

                cb.addEventListener('change', function() {
                    togglePageSelection(ctx, entry.path, pageData.page, cb.checked);
                });

                thumb.addEventListener('click', function(e) {
                    if (e.target === cb) return;
                    openPageModal(ctx, entry.path, pageData.page);
                });

                thumbsContainer.appendChild(thumb);
            });

            group.appendChild(thumbsContainer);
            list.appendChild(group);
        });

        updatePreviewActionButtons(ctx);
        bindEvents(ctx);
    }

    function togglePageSelection(ctx, path, pageNum, checked) {
        if (!ctx.state.pdfPreviewSelection[path]) {
            ctx.state.pdfPreviewSelection[path] = new Set();
        }
        if (checked) {
            ctx.state.pdfPreviewSelection[path].add(pageNum);
        } else {
            ctx.state.pdfPreviewSelection[path].delete(pageNum);
        }
        updatePreviewActionButtons(ctx);
    }

    function updatePreviewActionButtons(ctx) {
        const mergeBtn = document.getElementById('pdf-action-merge');
        const rebuildBtn = document.getElementById('pdf-action-rebuild');
        if (!mergeBtn && !rebuildBtn) return;

        let anySelected = false;
        const sel = ctx.state.pdfPreviewSelection || {};
        Object.keys(sel).forEach(function(path) {
            if (sel[path] && sel[path].size > 0) anySelected = true;
        });

        if (mergeBtn) mergeBtn.disabled = !anySelected;
        if (rebuildBtn) rebuildBtn.disabled = !anySelected;
    }

    function openPageModal(ctx, path, pageNum) {
        console.log('[PDF DEBUG] openPageModal called, path:', path, 'page:', pageNum, 'pdfPreviewMode:', ctx.state.pdfPreviewMode);
        const existing = document.getElementById('pdf-page-modal');
        if (existing) existing.remove();

        window.closePdfPageModal = function() { closePageModal(ctx); };

        const t = ctx.t;
        const results = (ctx.state.pdfPreviewData && ctx.state.pdfPreviewData.results) || [];
        const entry = results.find(function(r) { return r.path === path; });
        const maxPage = entry ? (entry.pageCount || entry.pages.length) : pageNum;
        const totalPages = maxPage;

        const overlay = document.createElement('div');
        overlay.id = 'pdf-page-modal';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10001;display:flex;align-items:center;justify-content:center;cursor:pointer;';

        const sheet = document.createElement('div');
        sheet.className = 'pdf-page-modal-sheet';
        sheet.style.cssText = 'width:100svw;height:100svh;display:flex;flex-direction:column;position:relative;background:#000;';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'renamer-btn-icon';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.setAttribute('role', 'button');
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;backdrop-filter:blur(4px);';
        closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closePageModal(ctx); });

        let hideTimer = null;
        function showOverlayControls() {
            closeBtn.classList.remove('hidden');
            nav.classList.remove('hidden');
        }
        function hideOverlayControls() {
            closeBtn.classList.add('hidden');
            nav.classList.add('hidden');
        }
        function resetHideTimer() {
            showOverlayControls();
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(hideOverlayControls, 2000);
        }

        const slider = document.createElement('div');
        slider.className = 'pdf-page-modal-slider';
        slider.style.cssText = 'flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;';
        slider.dataset.currentPage = pageNum;
        slider.dataset.direction = 'horizontal';

        console.log('[PDF Modal] Opening modal for:', path, 'page:', pageNum, 'totalPages:', totalPages);
        
        // Initialize persistent page cache in state BEFORE creating slides
        if (!ctx.state.pdfPageCache) {
            ctx.state.pdfPageCache = {};
        }
        const pageCache = ctx.state.pdfPageCache;
        console.log('[PDF Modal] Cache size:', Object.keys(pageCache || {}).length);

        const slides = [];
        for (let i = 1; i <= totalPages; i++) {
            const slide = document.createElement('div');
            slide.className = 'pdf-page-modal-slide';
            slide.style.cssText = 'flex:0 0 100svw;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:48px 16px 80px;height:100%;box-sizing:border-box;';
            slide.dataset.page = i;

            const img = document.createElement('img');
            img.className = 'pdf-page-modal-page-img';
            img.alt = 'Page ' + i;
            img.style.cssText = 'max-width:100%;max-height:100svh;object-fit:contain;background:#1a1a1a;border-radius:2px;';
            img.dataset.page = i;
            img.dataset.fitMode = 'contain';

            const placeholder = document.createElement('div');
            placeholder.className = 'pdf-page-modal-loader';
            placeholder.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;';
            placeholder.innerHTML = '<div style="width:36px;height:36px;border:3px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:pdf-spin 0.8s linear infinite;"></div>';

            const key = path + '#' + i;
            if (pageCache[key]) {
                img.src = pageCache[key];
                img.dataset.loaded = 'true';
                placeholder.style.display = 'none';
            } else {
                img.dataset.loaded = 'false';
            }

            slide.appendChild(img);
            slide.appendChild(placeholder);
            slider.appendChild(slide);
            slides.push({ slide: slide, img: img, placeholder: placeholder, page: i });
        }

        slider.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const existing = document.getElementById('pdf-ctx-menu');
            if (existing) existing.remove();

            const menu = document.createElement('div');
            menu.id = 'pdf-ctx-menu';
            menu.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:4px;z-index:10002;backdrop-filter:blur(8px);min-width:160px;';

            const currentImg = e.target.closest('.pdf-page-modal-page-img');
            const currentFit = currentImg ? currentImg.dataset.fitMode : 'contain';

            function makeItem(label, fit) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.cssText = 'background:' + (currentFit === fit ? 'rgba(0,130,201,0.3)' : 'transparent') + ';color:#fff;border:none;border-radius:4px;padding:8px 12px;font-size:13px;cursor:pointer;text-align:left;display:flex;align-items:center;justify-content:space-between;';
                btn.innerHTML = '<span>' + label + '</span>' + (currentFit === fit ? '<span style="opacity:0.6;">✓</span>' : '');
                btn.addEventListener('click', function() {
                    slides.forEach(function(s) {
                        s.img.style.objectFit = fit;
                        s.img.dataset.fitMode = fit;
                    });
                    if (currentImg) {
                        currentImg.style.objectFit = fit;
                        currentImg.dataset.fitMode = fit;
                    }
                    if (menu.parentNode) menu.remove();
                    resetHideTimer();
                });
                return btn;
            }

            menu.appendChild(makeItem('Classique', 'contain'));
            menu.appendChild(makeItem('Zoom', 'cover'));

            document.body.appendChild(menu);

            function closeMenu() {
                if (menu.parentNode) menu.remove();
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('keydown', closeMenu);
            }
            setTimeout(function() {
                document.addEventListener('click', closeMenu);
                document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeMenu(); });
            }, 10);
});
        
        const pendingRequests = {};
        const PRELOAD_RADIUS = 2;

        function cacheKey(p) {
            return path + '#' + p;
        }

        function fetchPageImage(p) {
            const key = cacheKey(p);
            console.log('[PDF Modal] fetchPageImage called for page', p, 'key:', key, 'cached:', !!pageCache[key]);
            if (pageCache[key]) {
                console.log('[PDF Modal] CACHE HIT for', key);
                return Promise.resolve(pageCache[key]);
            }
            if (pendingRequests[key]) {
                console.log('[PDF Modal] PENDING for', key);
                return pendingRequests[key];
            }

            // No width parameter = native PDF resolution
            console.log('[PDF Modal] FETCHING page', p);
            const promise = ctx.apiRequest(ctx.getBaseUrl() + '/api/pdf/page?path=' + encodeURIComponent(path) + '&page=' + p, { method: 'GET' }).then(function(data) {
                if (data && data.success && data.dataUrl) {
                    pageCache[key] = data.dataUrl;
                    console.log('[PDF Modal] CACHED page', p, 'key:', key);
                }
                delete pendingRequests[key];
                return data;
            }).catch(function(err) {
                console.error('[PDF Modal] ERROR fetching page', p, err);
                delete pendingRequests[key];
                return null;
            });
            pendingRequests[key] = promise;
            return promise;
        }

        function setSlideImage(slideInfo, dataUrl) {
            const { img, placeholder, page } = slideInfo;
            if (dataUrl) {
                img.src = dataUrl;
                img.dataset.loaded = 'true';
                if (placeholder.parentNode) placeholder.style.display = 'none';
            }
        }

        function loadPage(p) {
            const idx = p - 1;
            if (idx < 0 || idx >= slides.length) return Promise.resolve();
            const slideInfo = slides[idx];
            if (slideInfo.img.dataset.loaded === 'true') {
                console.log('[PDF Modal] loadPage SKIP - already loaded:', p);
                return Promise.resolve();
            }
            console.log('[PDF Modal] loadPage START:', p);
            return fetchPageImage(p).then(function(data) {
                if (data && data.success) {
                    setSlideImage(slideInfo, data.dataUrl);
                    console.log('[PDF Modal] loadPage DONE:', p);
                }
            });
        }

        function preloadAround(currentPage) {
            console.log('[PDF Modal] preloadAround:', currentPage);
            for (let offset = -PRELOAD_RADIUS; offset <= PRELOAD_RADIUS; offset++) {
                if (offset === 0) continue;
                const p = currentPage + offset;
                if (p >= 1 && p <= totalPages) {
                    loadPage(p);
                }
            }
        }

        async function loadPageAndPreload(p) {
            console.log('[PDF Modal] loadPageAndPreload:', p);
            await loadPage(p);
            preloadAround(p);
        }

        function getCurrentSlidePage() {
            const sliderRect = slider.getBoundingClientRect();
            const isVertical = slider.dataset.direction === 'vertical';
            const sliderCenter = isVertical
                ? sliderRect.top + sliderRect.height / 2
                : sliderRect.left + sliderRect.width / 2;
            let closest = null;
            let closestDist = Infinity;
            slides.forEach(function(s) {
                const rect = s.slide.getBoundingClientRect();
                const slideCenter = isVertical
                    ? rect.top + rect.height / 2
                    : rect.left + rect.width / 2;
                const dist = Math.abs(sliderCenter - slideCenter);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = s;
                }
            });
            return closest ? closest.page : pageNum;
        }

        function scrollToPage(p, smooth) {
            const idx = p - 1;
            if (idx < 0 || idx >= slides.length) return;
            const targetSlide = slides[idx].slide;
            const isVertical = slider.dataset.direction === 'vertical';
            const props = { behavior: smooth === false ? 'instant' : 'smooth' };
            if (isVertical) {
                props.top = targetSlide.offsetTop;
                props.left = 0;
            } else {
                props.left = targetSlide.offsetLeft;
                props.top = 0;
            }
            slider.scrollTo(props);
        }

        function updatePageDirection(direction) {
            slider.dataset.direction = direction;
            if (direction === 'vertical') {
                slider.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;';
                slides.forEach(function(s) {
                    s.slide.style.cssText = 'flex:0 0 auto;width:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:48px 16px 80px;height:100%;box-sizing:border-box;';
                });
                directionToggleBtn.textContent = ctx.t('pdfScrollDirectionHorizontal') || 'Horizontal';
                directionToggleBtn.title = ctx.t('pdfScrollDirectionHorizontal') || 'Horizontal';
                directionToggleBtn.dataset.translation = 'pdfScrollDirectionHorizontal';
                directionToggleBtn.dataset.direction = 'vertical';
            } else {
                slider.style.cssText = 'flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;';
                slides.forEach(function(s) {
                    s.slide.style.cssText = 'flex:0 0 100svw;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:48px 16px 80px;height:100%;box-sizing:border-box;';
                });
                directionToggleBtn.textContent = ctx.t('pdfScrollDirectionVertical') || 'Vertical';
                directionToggleBtn.title = ctx.t('pdfScrollDirectionVertical') || 'Vertical';
                directionToggleBtn.dataset.translation = 'pdfScrollDirectionVertical';
                directionToggleBtn.dataset.direction = 'horizontal';
            }
            scrollToPage(currentPage, false);
        }

        let currentPage = pageNum;
        loadPageAndPreload(currentPage);

        slider.addEventListener('scroll', function() {
            const p = getCurrentSlidePage();
            if (p !== currentPage) {
                currentPage = p;
                slider.dataset.currentPage = p;
                ctx.state.pdfPageModal = { path: path, page: p, dataUrl: '' };
                loadPageAndPreload(p);
                if (pageLabel) pageLabel.textContent = p + ' / ' + totalPages;
                if (prevBtn) prevBtn.disabled = p <= 1;
                if (nextBtn) nextBtn.disabled = p >= totalPages;
            }
        });

        const nav = document.createElement('div');
        nav.className = 'pdf-page-modal-nav';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.textContent = '←';
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (currentPage > 1) {
                scrollToPage(currentPage - 1);
            }
        });

        const pageLabel = document.createElement('span');
        pageLabel.style.cssText = 'font-size:13px;opacity:0.8;min-width:60px;text-align:center;color:#fff;';
        pageLabel.textContent = currentPage + ' / ' + totalPages;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.textContent = '→';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (currentPage < totalPages) {
                scrollToPage(currentPage + 1);
            }
        });

        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Plein écran (f)';
        fullscreenBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (document.fullscreenElement) {
                console.log('[PDF DEBUG] fullscreenBtn: exiting fullscreen');
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '⛶';
            } else {
                console.log('[PDF DEBUG] fullscreenBtn: entering fullscreen');
                sheet.requestFullscreen().catch(function() {});
                fullscreenBtn.innerHTML = '⛷';
            }
            showCursor();
        });

        const directionToggleBtn = document.createElement('button');
        directionToggleBtn.type = 'button';
        directionToggleBtn.className = 'renamer-btn renamer-btn-secondary';
        directionToggleBtn.id = 'pdf-page-direction-toggle';
        directionToggleBtn.textContent = ctx.t('pdfScrollDirectionVertical') || 'Vertical';
        directionToggleBtn.title = ctx.t('pdfScrollDirectionVertical') || 'Vertical';
        directionToggleBtn.dataset.translation = 'pdfScrollDirectionVertical';
        directionToggleBtn.dataset.direction = 'horizontal';
        directionToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const currentDirection = slider.dataset.direction;
            const newDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
            updatePageDirection(newDirection);
        });

        const zoomLabel = document.createElement('span');
        zoomLabel.className = 'zoom-label';
        zoomLabel.style.cssText = 'font-size:11px;opacity:0.8;min-width:36px;text-align:center;color:#fff;';
        zoomLabel.textContent = '100%';

        const zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '50';
        zoomSlider.max = '500';
        zoomSlider.value = '100';
        zoomSlider.step = '10';
        zoomSlider.title = 'Zoom';
        zoomSlider.style.cssText = 'width:80px;accent-color:var(--nc-blue);cursor:pointer;';
        zoomSlider.addEventListener('input', function() {
            const val = parseInt(zoomSlider.value, 10);
            zoomLabel.textContent = val + '%';
            applyZoom(val / 100);
        });
        zoomSlider.addEventListener('mousedown', function(e) { e.stopPropagation(); });
        zoomSlider.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });

        const zoomResetBtn = document.createElement('button');
        zoomResetBtn.type = 'button';
        zoomResetBtn.className = 'renamer-btn renamer-btn-secondary';
        zoomResetBtn.innerHTML = '⟲';
        zoomResetBtn.title = 'Reset zoom';
        zoomResetBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            zoomSlider.value = '100';
            zoomLabel.textContent = '100%';
            applyZoom(1);
            resetHideTimer();
        });

        nav.appendChild(prevBtn);
        nav.appendChild(pageLabel);
        nav.appendChild(nextBtn);
        nav.appendChild(fullscreenBtn);
        nav.appendChild(directionToggleBtn);
        nav.appendChild(zoomResetBtn);
        nav.appendChild(zoomSlider);
        nav.appendChild(zoomLabel);

        sheet.appendChild(closeBtn);
        sheet.appendChild(slider);
        sheet.appendChild(nav);
        overlay.appendChild(sheet);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closePageModal(ctx);
        });

        function onOverlayActivity() {
            resetHideTimer();
        }
        overlay.addEventListener('mousemove', onOverlayActivity);
        overlay.addEventListener('click', onOverlayActivity);
        overlay.addEventListener('touchstart', onOverlayActivity, { passive: true });
        sheet.addEventListener('mousemove', onOverlayActivity);
        sheet.addEventListener('click', onOverlayActivity);
        sheet.addEventListener('touchstart', onOverlayActivity, { passive: true });

        resetHideTimer();

        let currentZoom = 1;

        function applyZoom(level) {
            currentZoom = Math.max(0.5, Math.min(5, level));
            slides.forEach(function(s) {
                s.img.style.transform = 'scale(' + currentZoom + ')';
                s.img.style.transformOrigin = s.img.dataset.zoomOrigin || 'center center';
                s.img.style.transition = 'transform 0.2s ease-out';
            });
            if (zoomSlider) zoomSlider.value = Math.round(currentZoom * 100);
            if (zoomLabel) zoomLabel.textContent = Math.round(currentZoom * 100) + '%';
            ctx.state.pdfPageModal = { path: path, page: currentPage, dataUrl: '', zoom: currentZoom };
        }

        function setCursorForMode(fitMode) {
            const cursor = fitMode === 'cover' ? 'zoom-in' : 'default';
            slides.forEach(function(s) {
                s.img.style.cursor = cursor;
            });
        }

        slider.addEventListener('click', function(e) {
            const img = e.target.closest('.pdf-page-modal-page-img');
            if (!img) return;
            const fitMode = img.dataset.fitMode || 'contain';
            if (fitMode === 'cover') {
                const rect = img.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                img.dataset.zoomOrigin = x + '% ' + y + '%';
                applyZoom(currentZoom * 1.2);
                resetHideTimer();
            }
        });

        const menu = document.querySelector('#pdf-ctx-menu');
        if (menu) {
            menu.addEventListener('click', function(e) {
                const item = e.target.closest('button');
                if (!item) return;
                const label = item.querySelector('span') ? item.querySelector('span').textContent.trim() : '';
                if (label === 'Zoom') {
                    setCursorForMode('cover');
                } else if (label === 'Classique') {
                    setCursorForMode('contain');
                }
                resetHideTimer();
            });
        }

document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    console.log('[PDF DEBUG] Escape: exiting fullscreen');
                    document.exitFullscreen();
                } else {
                    console.log('[PDF DEBUG] Escape: closing modal');
                    closePageModal(ctx);
                    document.removeEventListener('keydown', escHandler);
                }
            } else if (e.key === 'f' || e.key === 'F') {
                if (document.fullscreenElement) {
                    console.log('[PDF DEBUG] f key: exiting fullscreen');
                    document.exitFullscreen();
                    if (fullscreenBtn) fullscreenBtn.innerHTML = '⛶';
                } else {
                    console.log('[PDF DEBUG] f key: entering fullscreen');
                    sheet.requestFullscreen().catch(function() {});
                    if (fullscreenBtn) fullscreenBtn.innerHTML = '⛷';
                }
                resetHideTimer();
                showCursor();
            } else if (e.key === 'ArrowLeft') {
                if (slider.dataset.direction !== 'vertical' && currentPage > 1) scrollToPage(currentPage - 1);
            } else if (e.key === 'ArrowRight') {
                if (slider.dataset.direction !== 'vertical' && currentPage < totalPages) scrollToPage(currentPage + 1);
            } else if (e.key === 'ArrowUp') {
                if (slider.dataset.direction === 'vertical' && currentPage > 1) scrollToPage(currentPage - 1);
            } else if (e.key === 'ArrowDown') {
                if (slider.dataset.direction === 'vertical' && currentPage < totalPages) scrollToPage(currentPage + 1);
            }
        });

        document.body.appendChild(overlay);
        ctx.state.pdfPageModal = { path: path, page: currentPage, dataUrl: '', zoom: 1 };

        requestAnimationFrame(function() {
            scrollToPage(currentPage, false);
            loadPageAndPreload(currentPage);
        });

        function hideCursor() {
            if (document.fullscreenElement) {
                sheet.style.cursor = 'none';
                closeBtn.style.cursor = 'none';
                nav.style.cursor = 'none';
            }
        }
        function showCursor() {
            sheet.style.cursor = '';
            closeBtn.style.cursor = 'pointer';
            if (nav) nav.style.cursor = '';
            if (cursorHideTimer) clearTimeout(cursorHideTimer);
            cursorHideTimer = setTimeout(hideCursor, 2000);
        }

        let cursorHideTimer = null;
        const cursorTargets = [sheet, slider, overlay];
        cursorTargets.forEach(function(el) {
            if (!el) return;
            el.addEventListener('mousemove', showCursor);
            el.addEventListener('click', showCursor);
            el.addEventListener('touchstart', showCursor, { passive: true });
        });
        if (document.fullscreenElement) {
            cursorHideTimer = setTimeout(hideCursor, 2000);
        }
    }

    function closePageModal(ctx) {
        console.log('[PDF DEBUG] closePageModal called, pdfPreviewMode:', ctx.state.pdfPreviewMode);
        const modal = document.getElementById('pdf-page-modal');
        if (modal) modal.remove();
        ctx.state.pdfPageModal = null;
        window.closePdfPageModal = null;
    }

    function runPreview(ctx) {
        const selected = getSelectedPaths(ctx);
        const btn = document.getElementById('pdf-action-preview');
        const t = ctx.t;
        if (!selected.length) {
            ctx.showToast(t('pdfPreviewNoPdf') || 'Aucun fichier PDF sélectionné', 'error');
            return;
        }

        ctx.state.pdfPreviewMode = true;
        ctx.state.pdfPreviewSelection = {};
        renderPreview(ctx);

        // Check cache - don't reset pdfPreviewData, keep it!
        const cached = (ctx.state.pdfPreviewData && ctx.state.pdfPreviewData.results) || [];
        const cachedMap = {};
        cached.forEach(function(r) { cachedMap[r.path] = r; });

        const missing = selected.filter(function(p) { return !cachedMap[p]; });

        if (!missing.length) {
            const merged = mergePreviewResults(cached, selected);
            ctx.state.pdfPreviewData = { success: true, results: merged };
            merged.forEach(function(entry) {
                if (entry.pages && entry.pages.length > 0) {
                    ctx.state.pdfPreviewSelection[entry.path] = new Set(entry.pages.map(function(p) { return p.page; }));
                }
            });
            renderPreview(ctx);
            ctx.showToast((t('pdfPreviewComplete') || 'Aperçu terminé') + ' — ' + merged.reduce(function(s, r) { return s + (r.pages ? r.pages.length : 0); }, 0) + ' pages', 'success');
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset._pdfOriginalLabel || (t('pdfPreviewTitle') || 'Aperçu PDF sélectionnés');
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.setAttribute('data-translation', 'pdfPreviewTitle');
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.dataset._pdfOriginalLabel = btn.dataset._pdfOriginalLabel || btn.textContent;
            btn.textContent = t('pdfPreviewInProgress') || 'Génération des aperçus...';
            btn.setAttribute('data-translation', 'pdfPreviewInProgress');
        }

        // Show loader in preview list
        const list = document.getElementById('pdf-preview-list');
        let loader = null;
        if (list && ctx.showLoaderInContainer) {
            loader = ctx.showLoaderInContainer(list, { message: t('pdfPreviewInProgress') || 'Génération des aperçus...', detail: '0 / ' + missing.length });
        }

        ctx.apiRequest(ctx.getBaseUrl() + '/api/pdf/preview', {
            method: 'POST',
            body: JSON.stringify({ paths: missing, thumbnailWidth: 150 })
        }).then(function(data) {
            if (data && data.success) {
                const merged = mergePreviewResults(cached.concat(data.results || []), selected);
                ctx.state.pdfPreviewData = { success: true, results: merged };
                merged.forEach(function(entry) {
                    if (entry.pages && entry.pages.length > 0) {
                        ctx.state.pdfPreviewSelection[entry.path] = new Set(entry.pages.map(function(p) { return p.page; }));
                    }
                });
                renderPreview(ctx);
                ctx.showToast((t('pdfPreviewComplete') || 'Aperçu terminé') + ' — ' + merged.reduce(function(s, r) { return s + (r.pages ? r.pages.length : 0); }, 0) + ' pages', 'success');
            } else {
                ctx.showToast((t('pdfPreviewError') || 'Erreur aperçu') + ': ' + ((data && data.errors && data.errors[0]) || 'unknown'), 'error');
                render(ctx);
            }
        }).catch(function(err) {
            ctx.showToast((t('pdfPreviewError') || 'Erreur aperçu') + ': ' + (err && err.message ? err.message : String(err)), 'error');
            render(ctx);
        }).then(function() {
            if (loader) loader.remove();
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset._pdfOriginalLabel || (t('pdfPreviewTitle') || 'Aperçu PDF sélectionnés');
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.setAttribute('data-translation', 'pdfPreviewTitle');
            }
        });
    }

    function mergePreviewResults(existingResults, selectedPaths) {
        const selectedSet = new Set(selectedPaths);
        const map = {};
        (existingResults || []).forEach(function(r) {
            map[r.path] = r;
        });
        const merged = selectedPaths.map(function(p) {
            if (map[p]) return map[p];
            return { path: p, fileName: p.replace(/^.*\//, ''), pageCount: 0, pages: [], error: 'Non chargé' };
        });
        return merged;
    }

    function initPreviewDnD(ctx, list) {
        if (list._pdfSortable) {
            list._pdfSortable.destroy();
        }
        if (typeof Sortable === 'undefined') {
            console.error('[Renamer PDF] SortableJS not loaded');
            return;
        }
        const FLIP_DURATION = 250;
        const capturePositions = () => {
            const pos = [];
            list.querySelectorAll('.renamer-preview-row').forEach(row => {
                pos.push(row.getBoundingClientRect().top);
            });
            return pos;
        };
        list._pdfSortable = Sortable.create(list, {
            handle: '.renamer-preview-drag-handle',
            animation: FLIP_DURATION,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            ghostClass: 'renamer-preview-ghost',
            chosenClass: 'renamer-preview-chosen',
            dragClass: 'renamer-preview-dragging',
            forceFallback: false,
            fallbackOnBody: true,
            swapThreshold: 0.5,
            invertSwap: false,
            onEnd: function(evt) {
                if (evt.oldIndex === evt.newIndex) return;
                const oldPositions = capturePositions();
                const item = ctx.state.files.splice(evt.oldIndex, 1)[0];
                ctx.state.files.splice(evt.newIndex, 0, item);
                render(ctx);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (typeof ctx.animateFlipOnList === 'function') {
                            ctx.animateFlipOnList(list, oldPositions);
                        }
                    });
                });
            },
        });
    }

    function bindEvents(ctx) {
        const toggleAllBtn = document.getElementById('pdf-toggle-all');
        if (toggleAllBtn && !toggleAllBtn._pdfBound) {
            toggleAllBtn._pdfBound = true;
            toggleAllBtn.addEventListener('click', function() {
                const total = (ctx.state.files || []).filter(isPdfPath).length;
                const allOn = ctx.state.allSelected || ctx.state.fileSelection.size === total;
                if (allOn) {
                    ctx.state.fileSelection = new Set();
                    ctx.state.allSelected = false;
                } else {
                    ctx.state.fileSelection = new Set((ctx.state.files || []).filter(isPdfPath));
                    ctx.state.allSelected = true;
                }
                if (ctx.state.pdfPreviewMode) {
                    renderPreview(ctx);
                } else {
                    render(ctx);
                }
            });
        }

        const rulesToggle = document.getElementById('pdf-rules-toggle');
        const rulesPanel = document.getElementById('pdf-rules');
        if (rulesToggle && rulesPanel && !rulesToggle._pdfBound) {
            rulesToggle._pdfBound = true;
            rulesToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                const isOpen = rulesPanel.style.width && rulesPanel.style.width !== '0px';
                if (isOpen) {
                    rulesPanel.style.width = '0';
                    rulesPanel.style.minWidth = '0';
                } else {
                    rulesPanel.style.width = '280px';
                    rulesPanel.style.minWidth = '280px';
                }
            });
        }

        // Back button in preview header
        const backBtn = document.getElementById('pdf-preview-back');
        if (backBtn && !backBtn._pdfBound) {
            backBtn._pdfBound = true;
            backBtn.addEventListener('click', function() {
                render(ctx);
            });
        }

        // Fullscreen button in preview header
        const previewFsBtn = document.getElementById('pdf-preview-fullscreen');
        if (previewFsBtn && !previewFsBtn._pdfBound) {
            previewFsBtn._pdfBound = true;
            previewFsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const list = document.getElementById('pdf-preview-list');
                if (!list) return;
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                    previewFsBtn.innerHTML = '⛶';
                } else {
                    list.requestFullscreen().catch(function() {});
                    previewFsBtn.innerHTML = '⛷';
                }
            });
        }

        const convertBtn = document.getElementById('pdf-action-convert-cbz');
        if (convertBtn && !convertBtn._pdfBound) {
            convertBtn._pdfBound = true;
            convertBtn.addEventListener('click', function() { runConvert(ctx); });
        }
        const actionToggle = document.querySelector('[data-pdf-toggle-action="convert-cbz"]');
        if (actionToggle && !actionToggle._pdfBound) {
            actionToggle._pdfBound = true;
            actionToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('on');
                updateActionButtonState(ctx);
            });
        }
        const previewBtn = document.getElementById('pdf-action-preview');
        if (previewBtn && !previewBtn._pdfBound) {
            previewBtn._pdfBound = true;
            previewBtn.addEventListener('click', function() { runPreview(ctx); });
        }
        const previewActionToggle = document.querySelector('[data-pdf-toggle-action="preview-pdf"]');
        if (previewActionToggle && !previewActionToggle._pdfBound) {
            previewActionToggle._pdfBound = true;
            previewActionToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('on');
                updatePreviewActionButtonState(ctx);
            });
        }
    }

    function getSelectedPaths(ctx) {
        const pdfs = (ctx.state.files || []).filter(isPdfPath);
        if (ctx.state.allSelected) return pdfs;
        return pdfs.filter(function(p) { return ctx.state.fileSelection.has(p); });
    }

    function showLoader(ctx, total) {
        const existing = document.getElementById('pdf-loader');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'pdf-loader';
        overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.5);z-index:50;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
        const t = ctx.t;
        overlay.innerHTML = `
            <div style="background:var(--nc-bg);border-radius:var(--nc-radius);padding:24px 32px;min-width:320px;max-width:480px;display:flex;flex-direction:column;align-items:center;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,0.3);color:var(--nc-text);">
                <div style="width:48px;height:48px;border:4px solid rgba(0,130,201,0.2);border-top-color:var(--nc-blue);border-radius:50%;animation:pdf-spin 0.9s linear infinite;"></div>
                <div style="font-size:15px;font-weight:500;" data-translation="convertInProgress">${t('convertInProgress') || 'Conversion en cours...'}</div>
                <div id="pdf-loader-detail" style="font-size:13px;opacity:0.75;text-align:center;"></div>
                <div id="pdf-loader-current" style="font-size:12px;opacity:0.6;text-align:center;max-width:380px;word-break:break-word;white-space:normal;font-family:monospace;"></div>
            </div>
        `;
        const style = document.createElement('style');
        style.id = 'pdf-loader-style';
        style.textContent = '@keyframes pdf-spin{to{transform:rotate(360deg)}}';
        if (!document.getElementById('pdf-loader-style')) {
            document.head.appendChild(style);
        }
        const panel = document.getElementById('renamer-modal') || document.body;
        panel.style.position = 'relative';
        panel.appendChild(overlay);
        const detail = overlay.querySelector('#pdf-loader-detail');
        if (detail) detail.textContent = '0 / ' + total;
    }

    function updateLoaderProgress(done, total, currentName) {
        const detail = document.getElementById('pdf-loader-detail');
        if (detail) detail.textContent = done + ' / ' + total;
        const current = document.getElementById('pdf-loader-current');
        if (current) current.textContent = currentName || '';
    }

    function hideLoader() {
        const el = document.getElementById('pdf-loader');
        if (el) el.remove();
    }

    function runConvert(ctx) {
        const selected = getSelectedPaths(ctx);
        const btn = document.getElementById('pdf-action-convert-cbz');
        const t = ctx.t;
        if (!selected.length) {
            ctx.showToast(t('noPdfSelected') || 'Aucun fichier PDF sélectionné', 'error');
            return;
        }
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.dataset._pdfOriginalLabel = btn.dataset._pdfOriginalLabel || btn.textContent;
            btn.textContent = t('convertInProgress') || 'Conversion en cours...';
            btn.setAttribute('data-translation', 'convertInProgress');
        }
        showLoader(ctx, selected.length);
        let done = 0;
        const results = [];
        selected.reduce(function(chain, p) {
            return chain.then(function() {
                const baseName = String(p).replace(/^.*\//, '');
                updateLoaderProgress(done, selected.length, baseName);
                return ctx.apiRequest(ctx.getBaseUrl() + '/api/pdf/convert-cbz', {
                    method: 'POST',
                    body: JSON.stringify({ paths: [p] })
                }).then(function(data) {
                    done++;
                    updateLoaderProgress(done, selected.length, baseName);
                    results.push(data);
                    return data;
                }).catch(function(err) {
                    done++;
                    updateLoaderProgress(done, selected.length, baseName);
                    results.push({ success: false, converted: [], skipped: [], errors: [String(err && err.message || err)] });
                    return results[results.length - 1];
                });
            });
        }, Promise.resolve()).then(function() {
            const allConverted = [];
            const allSkipped = [];
            const allErrors = [];
            let ok = true;
            results.forEach(function(d) {
                if (d && d.success === false) ok = false;
                (d && d.converted || []).forEach(function(c) { allConverted.push(c); });
                (d && d.skipped || []).forEach(function(s) { allSkipped.push(s); });
                (d && d.errors || []).forEach(function(e) { allErrors.push(e); });
            });
            const msg = (t('pdfConvertComplete') || 'Conversion PDF → CBZ terminée')
                + ' — ' + (t('pdfConverted') || 'Convertis') + ': ' + allConverted.length
                + ', ' + (t('pdfSkipped') || 'Ignorés') + ': ' + allSkipped.length
                + ', ' + (t('pdfErrors') || 'Erreurs') + ': ' + allErrors.length;
            ctx.showToast(msg, allErrors.length ? 'error' : (ok ? 'success' : 'info'), {
                detail: (allConverted.length + allSkipped.length + allErrors.length) > 0,
                onDetail: function() {
                    ctx.showRenameDetails(
                        allConverted.map(function(c) { return { from: c.from, to: c.to }; }),
                        allSkipped,
                        allErrors,
                        {
                            title: t('pdfDetailsTitle') || 'Détail des conversions',
                            renamedLabel: t('pdfConvertedLabel') || 'Convertis',
                            skippedLabel: t('skipped') || 'Ignorés',
                            errorsLabel: t('errors') || 'Erreurs',
                            titleKey: 'pdfDetailsTitle',
                            renamedLabelKey: 'pdfConvertedLabel',
                            skippedLabelKey: 'skipped',
                            errorsLabelKey: 'errors'
                        }
                    );
                },
                persistent: allErrors.length > 0
            });
            if (allConverted.length) {
                const convertedSet = new Set(allConverted.map(function(c) { return c.from; }));
                ctx.state.files = ctx.state.files.filter(function(f) { return !convertedSet.has(f); });
                if (ctx.state.allSelected) {
                    ctx.state.fileSelection = new Set(ctx.state.files.filter(isPdfPath));
                } else {
                    const next = new Set();
                    ctx.state.fileSelection.forEach(function(p) { if (!convertedSet.has(p)) next.add(p); });
                    ctx.state.fileSelection = next;
                }
            }
            render(ctx);
        }).then(function() {
            hideLoader();
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset._pdfOriginalLabel || t('convertPdfToCbz');
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.setAttribute('data-translation', 'convertPdfToCbz');
            }
        });
    }

    function register() {
        if (typeof RenamerApp === 'undefined' || !RenamerApp.registerTab) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', register);
            } else {
                setTimeout(register, 50);
            }
            return;
        }
        RenamerApp.registerTab(TAB_ID, {
            id: TAB_ID,
            labelKey: 'pdfTab',
            icon: window.RenamerIcons.PDF_FILE,
            build: buildTab,
            bind: bindEvents,
            render: render,
        });
    }

    register();
})();
