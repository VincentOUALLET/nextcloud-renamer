(function() {
    'use strict';

    const TAB_ID = 'pdf';

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
                                    <span class="renamer-rule-drag" title="${t('dragToReorder')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>
                                    <span class="renamer-rule-number" style="background:var(--nc-red)">1</span>
                                    <span class="renamer-rule-name">${t('convertPdfToCbz')}</span>
                                    <div class="renamer-rule-actions">
                                        <div class="renamer-toggle on" data-pdf-toggle-action="convert-cbz" title="ON" draggable="false">
                                            <div class="renamer-toggle-knob"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="renamer-rule-body">
                                    <div style="flex:1;font-size:13px;color:var(--nc-text);opacity:0.8;">${t('pdfConvertDescription') || 'Rasterise chaque page en PNG et assemble en CBZ (compatible Kavita).'}</div>
                                    <button class="renamer-btn renamer-btn-primary" id="pdf-action-convert-cbz" disabled style="opacity:0.5;cursor:not-allowed;margin-left:auto;">${t('convertPdfToCbz')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="renamer-preview" id="pdf-preview">
                        <div class="renamer-preview-header">
                            <span>${t('preview')}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button type="button" id="pdf-toggle-all" class="renamer-badge renamer-badge-success renamer-badge-toggle" title="Désélectionner Tout">✓</button>
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
        btn.textContent = allOn ? '✓' : '−';
        btn.title = allOn ? 'Désélectionner Tout' : 'Sélectionner Tout';
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

    function render(ctx) {
        const list = document.getElementById('pdf-preview-list');
        if (!list) return;
        list.innerHTML = '';

        const files = (ctx.state.files || []).filter(isPdfPath);
        if (ctx.state.allSelected) {
            ctx.state.fileSelection = new Set(files);
        } else {
            const filtered = new Set();
            ctx.state.fileSelection.forEach(function(p) { if (isPdfPath(p)) filtered.add(p); });
            ctx.state.fileSelection = filtered;
            if (files.length && ctx.state.fileSelection.size === 0) {
                ctx.state.allSelected = true;
                ctx.state.fileSelection = new Set(files);
            }
        }

        if (!files.length) {
            const empty = document.createElement('div');
            empty.style.cssText = 'opacity:0.6;font-size:13px;padding:12px;text-align:center;';
            empty.textContent = ctx.t('noPdfSelected') || 'Aucun PDF à afficher';
            list.appendChild(empty);
            updateToggleAllButton(ctx);
            initPreviewDnD(ctx, list);
            updateActionButtonState(ctx);
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
                ? '<button type="button" class="renamer-badge renamer-badge-deselected renamer-badge-toggle" data-path="' + ctx.escapeHtml(file) + '" title="Désélectionné — cliquer pour resélectionner">−</button>'
                : '<button type="button" class="renamer-badge renamer-badge-success renamer-badge-toggle" data-path="' + ctx.escapeHtml(file) + '" title="Cliquer pour désélectionner">✓</button>';
            row.innerHTML = `
                <span class="renamer-preview-drag-handle" title="${ctx.t('dragToReorder')}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg></span>
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
                render(ctx);
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
                <div style="font-size:15px;font-weight:500;">${t('convertInProgress') || 'Conversion en cours...'}</div>
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
        }
        showLoader(ctx, selected.length);
        let done = 0;
        const promises = selected.map(function(p) {
            const baseName = String(p).replace(/^.*\//, '');
            updateLoaderProgress(done, selected.length, baseName);
            return ctx.apiRequest(ctx.getBaseUrl() + '/api/pdf/convert-cbz', {
                method: 'POST',
                body: JSON.stringify({ paths: [p] })
            }).then(function(data) {
                done++;
                updateLoaderProgress(done, selected.length, baseName);
                return data;
            }).catch(function(err) {
                done++;
                updateLoaderProgress(done, selected.length, baseName);
                return { success: false, converted: [], skipped: [], errors: [String(err && err.message || err)] };
            });
        });
        Promise.all(promises).then(function(results) {
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
                        allErrors
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
