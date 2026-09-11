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
                    <div class="renamer-rules" id="pdf-rules">
                        <div class="renamer-rules-list" id="pdf-rules-list">
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
        ctx.state.pdfPreviewMode = false;
        ctx.state.pdfPreviewData = null;
        ctx.state.pdfPreviewSelection = {};
        ctx.state.pdfPageModal = null;

        const list = document.getElementById('pdf-preview-list');
        if (!list) return;
        list.innerHTML = '';

        const header = document.getElementById('pdf-preview-header');
        if (header) {
            header.innerHTML = `
                <span data-translation="preview">${ctx.t('preview')}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button type="button" id="pdf-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="${ctx.t('deselectAllTitle')}" data-translation="deselectAllTitle">${CHECK_SVG}</button>
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
        const list = document.getElementById('pdf-preview-list');
        if (!list) return;
        list.innerHTML = '';

        const header = document.getElementById('pdf-preview-header');
        if (header) {
            const data = ctx.state.pdfPreviewData;
            const totalFiles = (data && data.results) ? data.results.length : 0;
            const totalPages = (data && data.results) ? data.results.reduce(function(s, r) { return s + (r.pages ? r.pages.length : 0); }, 0) : 0;
            header.className = 'renamer-preview-header pdf-preview-header';
            header.innerHTML = `
                <span data-translation="pdfPreviewTitle">${ctx.t('pdfPreviewTitle') || 'Aperçu PDF'}</span>
                <span class="pdf-preview-info">${totalFiles} ${ctx.t('files') || 'fichiers'}, ${totalPages} ${ctx.t('pages') || 'pages'} au total</span>
                <button type="button" id="pdf-preview-back" class="renamer-btn renamer-btn-secondary" data-translation="pdfPreviewBack">← ${ctx.t('pdfPreviewBack') || 'Retour à la liste'}</button>
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
        const existing = document.getElementById('pdf-page-modal');
        if (existing) existing.remove();

        const t = ctx.t;
        const overlay = document.createElement('div');
        overlay.id = 'pdf-page-modal';
        overlay.className = 'renamer-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10001;display:flex;align-items:center;justify-content:center;cursor:pointer;';

        const modal = document.createElement('div');
        modal.className = 'renamer-modal';
        modal.style.cssText = 'background:var(--nc-bg);border-radius:var(--nc-radius);padding:12px;max-width:95vw;max-height:95vh;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);cursor:default;position:relative;';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'renamer-btn-icon';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Fermer');
        closeBtn.setAttribute('role', 'button');
        closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;';
        closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closePageModal(ctx); });

        const img = document.createElement('img');
        img.className = 'pdf-page-modal-img';
        img.alt = 'Page ' + pageNum;
        img.src = '';
        img.style.cssText = 'min-height:200px;background:#f5f5f5;border-radius:var(--nc-radius);';

        const loader = document.createElement('div');
        loader.id = 'pdf-page-modal-loader';
        loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border-radius:var(--nc-radius);z-index:1;';
        loader.innerHTML = '<div style="width:36px;height:36px;border:4px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:pdf-spin 0.8s linear infinite;"></div>';

        const results = (ctx.state.pdfPreviewData && ctx.state.pdfPreviewData.results) || [];
        const entry = results.find(function(r) { return r.path === path; });

        function getMaxPage() {
            if (!entry) return pageNum;
            return entry.pageCount || (entry.pages ? entry.pages.length : pageNum);
        }

        function fetchPage(p) {
            const maxP = getMaxPage();
            const clamped = Math.max(1, Math.min(p, maxP));
            if (!loader.parentNode) {
                const l = document.createElement('div');
                l.id = 'pdf-page-modal-loader';
                l.style.cssText = loader.style.cssText;
                l.innerHTML = loader.innerHTML;
                modal.appendChild(l);
            }
            img.style.opacity = '0.3';
            ctx.apiRequest(ctx.getBaseUrl() + '/api/pdf/page?path=' + encodeURIComponent(path) + '&page=' + clamped + '&width=1200', { method: 'GET' }).then(function(data) {
                const l = document.getElementById('pdf-page-modal-loader');
                if (l) l.remove();
                img.style.opacity = '1';
                if (data && data.success && data.dataUrl) {
                    img.src = data.dataUrl;
                    img.dataset.currentPage = clamped;
                    ctx.state.pdfPageModal = { path: path, page: clamped, dataUrl: data.dataUrl };
                } else {
                    ctx.showToast(t('pdfPageLoadError') ? t('pdfPageLoadError').replace('{n}', clamped).replace('{err}', (data && data.error) || '') : 'Erreur page ' + clamped, 'error');
                }
                if (prevBtn) prevBtn.disabled = clamped <= 1;
                if (nextBtn) nextBtn.disabled = clamped >= maxP;
                if (pageLabel) pageLabel.textContent = clamped + ' / ' + maxP;
            }).catch(function() {
                const l = document.getElementById('pdf-page-modal-loader');
                if (l) l.remove();
                img.style.opacity = '1';
                ctx.showToast(t('pdfPageLoadError') ? t('pdfPageLoadError').replace('{n}', clamped).replace('{err}', '') : 'Erreur page ' + clamped, 'error');
            });
        }

        const nav = document.createElement('div');
        nav.className = 'pdf-page-modal-nav';

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'renamer-btn renamer-btn-secondary';
        prevBtn.textContent = '←';
        prevBtn.addEventListener('click', function(e) { e.stopPropagation(); fetchPage((parseInt(img.dataset.currentPage) || pageNum) - 1); });

        const pageLabel = document.createElement('span');
        pageLabel.style.cssText = 'font-size:13px;opacity:0.7;min-width:60px;text-align:center;';
        pageLabel.textContent = pageNum + ' / ' + getMaxPage();

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'renamer-btn renamer-btn-secondary';
        nextBtn.textContent = '→';
        nextBtn.addEventListener('click', function(e) { e.stopPropagation(); fetchPage((parseInt(img.dataset.currentPage) || pageNum) + 1); });

        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'renamer-btn renamer-btn-secondary';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Plein écran';
        fullscreenBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (document.fullscreenElement) {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '⛶';
            } else {
                modal.requestFullscreen().catch(function() {});
                fullscreenBtn.innerHTML = '⛷';
            }
        });

        nav.appendChild(prevBtn);
        nav.appendChild(pageLabel);
        nav.appendChild(nextBtn);
        nav.appendChild(fullscreenBtn);

        modal.appendChild(closeBtn);
        modal.appendChild(img);
        modal.appendChild(loader);
        modal.appendChild(nav);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closePageModal(ctx);
        });

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closePageModal(ctx);
                document.removeEventListener('keydown', escHandler);
            }
        });

        document.body.appendChild(overlay);
        ctx.state.pdfPageModal = { path: path, page: pageNum, dataUrl: '' };

        fetchPage(pageNum);
    }

    function closePageModal(ctx) {
        const modal = document.getElementById('pdf-page-modal');
        if (modal) modal.remove();
        ctx.state.pdfPageModal = null;
    }

    function runPreview(ctx) {
        const selected = getSelectedPaths(ctx);
        const btn = document.getElementById('pdf-action-preview');
        const t = ctx.t;
        if (!selected.length) {
            ctx.showToast(t('pdfPreviewNoPdf') || 'Aucun fichier PDF sélectionné', 'error');
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
        showLoader(ctx, selected.length);
        let done = 0;
        ctx.apiRequest(ctx.getBaseUrl() + '/api/pdf/preview', {
            method: 'POST',
            body: JSON.stringify({ paths: selected, thumbnailWidth: 150 })
        }).then(function(data) {
            done++;
            updateLoaderProgress(done, 1, '');
            if (data && data.success) {
                ctx.state.pdfPreviewData = data;
                ctx.state.pdfPreviewMode = true;
                ctx.state.pdfPreviewSelection = {};
                (data.results || []).forEach(function(entry) {
                    if (entry.pages && entry.pages.length > 0) {
                        ctx.state.pdfPreviewSelection[entry.path] = new Set(entry.pages.map(function(p) { return p.page; }));
                    }
                });
                renderPreview(ctx);
                ctx.showToast((t('pdfPreviewComplete') || 'Aperçu terminé') + ' — ' + (data.results || []).reduce(function(s, r) { return s + (r.pages ? r.pages.length : 0); }, 0) + ' pages', 'success');
            } else {
                ctx.showToast((t('pdfPreviewError') || 'Erreur aperçu') + ': ' + ((data && data.errors && data.errors[0]) || 'unknown'), 'error');
                render(ctx);
            }
        }).catch(function(err) {
            done++;
            updateLoaderProgress(done, 1, '');
            ctx.showToast((t('pdfPreviewError') || 'Erreur aperçu') + ': ' + (err && err.message ? err.message : String(err)), 'error');
            render(ctx);
        }).then(function() {
            hideLoader();
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset._pdfOriginalLabel || (t('pdfPreviewTitle') || 'Aperçu PDF sélectionnés');
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.setAttribute('data-translation', 'pdfPreviewTitle');
            }
        });
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
        const backBtn = document.getElementById('pdf-preview-back');
        if (backBtn && !backBtn._pdfBound) {
            backBtn._pdfBound = true;
            backBtn.addEventListener('click', function() {
                render(ctx);
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
            build: buildTab,
            bind: bindEvents,
            render: render,
        });
    }

    register();
})();
