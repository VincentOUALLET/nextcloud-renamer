(function() {
    'use strict';
    if (document.getElementById('renamer-style')) return;
    var style = document.createElement('style');
    style.id = 'renamer-style';
    style.textContent = '' +
        ':root{' +
        '--nc-blue:#0082c9;--nc-blue-hover:#00619a;--nc-orange:#f0a030;--nc-red:#e02020;--nc-green:#22c55e;' +
        '--nc-bg:var(--color-main-background,#fff);--nc-text:var(--color-main-text,#000);' +
        '--nc-border:var(--color-border,#ccc);--nc-radius:var(--border-radius-large,8px);' +
        '--nc-transition:all 300ms ease-in-out;}' +
        '#renamer-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);transition:opacity 300ms ease,visibility 300ms ease;}' +
        '#renamer-overlay.collapsed{opacity:0;visibility:hidden;pointer-events:none;}' +
        '#renamer-modal{background:var(--nc-bg);color:var(--nc-text);border-radius:var(--nc-radius);box-shadow:0 0 20px rgba(0,0,0,.3);transition:var(--nc-transition);display:flex;flex-direction:column;overflow:hidden;}' +
        '#renamer-modal.fullscreen{width:100vw;height:100vh;max-width:none;max-height:none;border-radius:0;}' +
        '#renamer-modal.compact{width:90vw;height:90vh;max-width:90vw;max-height:90vh;}' +
        '.renamer-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--nc-border);transition:var(--nc-transition);}' +
        '.renamer-header h3{margin:0;font-size:18px;}' +
        '.renamer-tabs{display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid var(--nc-border);transition:var(--nc-transition);}' +
        '.renamer-tab{padding:6px 12px;border:none;background:transparent;cursor:pointer;border-radius:var(--nc-radius);transition:var(--nc-transition);font-size:14px;}' +
        '.renamer-tab:hover{background:rgba(0,130,201,0.1);}' +
        '.renamer-tab.active{background:var(--nc-blue);color:#fff;}' +
        '.renamer-content{flex:1;display:flex;overflow:hidden;transition:var(--nc-transition);}' +
        '.renamer-panel{display:flex;flex-direction:column;overflow:hidden;}' +
        '.renamer-main{display:flex;flex:1;overflow:auto;transition:var(--nc-transition);}' +
        '.renamer-rules{flex:1;display:flex;flex-direction:column;border-right:1px solid var(--nc-border);overflow:hidden;min-width:320px;transition:var(--nc-transition);}' +
        '.renamer-rules-list{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;transition:var(--nc-transition);}' +
        '.renamer-preview{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:320px;transition:var(--nc-transition);}' +
        '.renamer-preview-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--nc-border);font-weight:bold;transition:var(--nc-transition);}' +
        '.renamer-preview-list{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;transition:var(--nc-transition);}' +
        '.renamer-rule-card{border-radius:var(--nc-radius);border-left:4px solid var(--nc-blue);background:rgba(0,130,201,0.04);border:1px solid rgba(0,0,0,0.08);padding:8px;transition:transform 200ms cubic-bezier(0.4,0,0.2,1),box-shadow 200ms cubic-bezier(0.4,0,0.2,1),background 200ms ease,border-color 200ms ease;display:flex;flex-direction:column;gap:4px;}' +
        '.renamer-rule-card.dragging{opacity:0.4;}' +
        '.renamer-rule-card.type-search_replace{border-left-color:var(--nc-blue);background:rgba(0,130,201,0.04);}' +
        '.renamer-rule-card.type-sequence{border-left-color:var(--nc-orange);background:rgba(240,160,48,0.06);}' +
        '.renamer-rule-card.type-regex{border-left-color:var(--nc-red);background:rgba(224,32,32,0.04);}' +
        '.renamer-rule-card.type-filetype{border-left-color:var(--nc-green);background:rgba(34,197,94,0.04);}' +
        '.renamer-rule-card.type-truncate{border-left-color:#6366f1;background:rgba(99,102,241,0.06);}' +
        '.renamer-rule-card.type-add_text{border-left-color:#ec4899;background:rgba(236,72,153,0.06);}' +
        '.renamer-rule-card.disabled{opacity:0.5;filter:grayscale(1);}' +
        '.renamer-file-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:16px;font-size:13px;white-space:nowrap;transition:var(--nc-transition);cursor:pointer;}' +
        '.renamer-file-pill.active{background:var(--nc-blue);color:#fff;border-color:var(--nc-blue);}' +
        '.renamer-preview-row.filtered-file-type{opacity:0.5;}' +
        '.renamer-preview-row.renamer-preview-row-deselected{opacity:0.5;}' +
        '.renamer-filter-badge{display:inline-flex;align-items:center;padding:1px 6px;background:#e02020;color:#fff;border-radius:8px;font-size:10px;font-weight:bold;text-transform:uppercase;cursor:help;flex-shrink:0;margin-right:4px;}' +
        '.renamer-rule-header{display:flex;align-items:center;gap:4px;}' +
        '.renamer-rule-drag{cursor:grab;padding:2px;opacity:0.5;transition:var(--nc-transition);font-size:12px;}' +
        '.renamer-rule-drag:active{cursor:grabbing;}' +
        '.renamer-rule-number{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#fff;flex-shrink:0;transition:var(--nc-transition);}' +
        '.renamer-rule-name{flex:1;font-weight:500;font-size:13px;}' +
        '.renamer-rule-actions{display:flex;align-items:center;gap:2px;position:relative;}' +
        '.renamer-btn-icon{width:18px;height:18px;border:none;background:transparent;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:var(--nc-transition);}' +
        '.renamer-btn-icon:hover{background:rgba(0,0,0,0.1);}' +
        '.renamer-case-btn{color:var(--nc-text);opacity:0.5;border:1px solid var(--nc-border)!important;background:var(--nc-bg)!important;}' +
        '.renamer-case-btn.on{opacity:1;color:var(--nc-blue);border-color:var(--nc-blue)!important;background:rgba(0,130,201,0.1)!important;}' +
        '.renamer-case-btn:hover{background:rgba(0,130,201,0.15)!important;}' +
        '.renamer-toggle{position:relative;width:24px;height:14px;background:#ccc;border-radius:7px;cursor:pointer;transition:var(--nc-transition);flex-shrink:0;}' +
        '.renamer-toggle.on{background:var(--nc-blue);}' +
        '.renamer-toggle-knob{position:absolute;top:1px;left:1px;width:12px;height:12px;background:#fff;border-radius:50%;transition:var(--nc-transition);}' +
        '.renamer-toggle.on .renamer-toggle-knob{left:11px;}' +
        '.renamer-add-btn{width:100%;height:56px;border-radius:var(--nc-radius);border:2px dashed rgba(0,130,201,0.35);background:rgba(0,130,201,0.03);color:var(--nc-blue);font-size:24px;cursor:pointer;transition:var(--nc-transition);display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
        '.renamer-add-btn:hover{background:rgba(0,130,201,0.08);border-color:var(--nc-blue);}' +
        '.renamer-popup{position:fixed;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:8px;z-index:10000;min-width:180px;transition:var(--nc-transition);}' +
        '.renamer-popup-item{padding:8px 12px;cursor:pointer;border-radius:4px;transition:var(--nc-transition);font-size:14px;}' +
        '.renamer-popup-item:hover{background:rgba(0,130,201,0.1);}' +
        '#renamer-basic-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
        '.renamer-popup-arrow{opacity:0.55;flex-shrink:0;}' +
        '#renamer-basic-trigger:hover .renamer-popup-arrow{opacity:1;}' +
        '.renamer-basic-popup{position:absolute;top:0;left:auto;max-width:calc(100vw - 40px);overflow-y:auto;}' +
        '.renamer-preview-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--nc-radius);background:var(--nc-bg);border:1px solid var(--nc-border);box-shadow:0 1px 3px rgba(0,0,0,0.06);transition:transform 200ms cubic-bezier(0.4,0,0.2,1),box-shadow 200ms cubic-bezier(0.4,0,0.2,1),background 200ms ease,border-color 200ms ease;cursor:grab;position:relative;}' +
        '.renamer-preview-row:hover{background:rgba(0,130,201,0.03);border-color:var(--nc-blue);box-shadow:0 2px 8px rgba(0,130,201,0.12);}' +
        '.renamer-preview-row.renamer-preview-dragging{opacity:0.4;cursor:grabbing;}' +
        '.renamer-preview-row.renamer-preview-chosen{background:rgba(0,130,201,0.05);}' +
        '.renamer-preview-row.renamer-preview-ghost{opacity:0.9;background:var(--nc-bg);box-shadow:0 8px 24px rgba(0,0,0,0.25);cursor:grabbing;}' +
        '.renamer-preview-row.sortable-ghost{opacity:0.4;background:rgba(0,130,201,0.05);}' +
        '.renamer-drop-indicator{position:absolute;left:8px;right:8px;height:4px;background:var(--nc-blue);border-radius:2px;box-shadow:0 0 8px rgba(0,130,201,0.5);z-index:1;transition:opacity 150ms ease;}' +
        '.renamer-preview-drag-handle{cursor:grab;padding:4px;opacity:0.3;transition:opacity 200ms ease;display:flex;align-items:center;flex-shrink:0;}' +
        '.renamer-preview-drag-handle:hover{opacity:0.6;cursor:grabbing;}' +
        '.renamer-preview-from{flex:1;font-size:13px;word-break:break-word;white-space:normal;text-align:left;}' +
        '.renamer-preview-arrow{color:var(--nc-blue);font-size:16px;}' +
        '.renamer-preview-to{flex:1;font-size:13px;font-weight:500;word-break:break-word;white-space:normal;text-align:left;}' +
        '.renamer-badge{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#fff;flex-shrink:0;transition:var(--nc-transition);cursor:help;}' +
        '.renamer-badge-success{background:#22c55e;}' +
        '.renamer-badge-neutral{background:#94a3b8;}' +
        '.renamer-badge-error{background:#ef4444;}' +
        '.renamer-btn{padding:6px 12px;border:1px solid var(--nc-border);background:var(--nc-bg);border-radius:4px;cursor:pointer;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-btn:hover{background:rgba(0,0,0,0.05);}' +
        '.renamer-btn-primary{background:var(--nc-blue);color:#fff;border-color:var(--nc-blue);}' +
        '.renamer-btn-primary:hover{background:var(--nc-blue-hover);}' +
        '.renamer-field{display:flex;flex-direction:column;gap:2px;margin-bottom:4px;}' +
        '.renamer-field label{font-size:11px;font-weight:500;opacity:0.8;}' +
        '.renamer-field input,.renamer-field select{padding:4px 6px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);font-size:12px;transition:var(--nc-transition);}' +
        '.renamer-field input:focus,.renamer-field select:focus{outline:none;border-color:var(--nc-blue);}' +
        '.renamer-rule-body{display:grid;grid-template-columns:1fr;gap:4px 8px;}' +
        '@media (min-width:768px){.renamer-rule-body{grid-template-columns:1fr 1fr;}}' +
        '.renamer-select-wrapper{position:relative;display:flex;align-items:center;}' +
        '.renamer-select-wrapper::after{content:"";position:absolute;right:8px;top:50%;transform:translateY(-50%);width:16px;height:16px;background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 16 16%27%3E%3Cpath fill=%27currentColor%27 d=%27M4.5 6l3.5 3.5L11.5 6%27/%3E%3C/svg%3E") no-repeat center;pointer-events:none;opacity:0.6;}' +
        '.renamer-select-wrapper select{width:100%;padding-right:32px;appearance:none;-webkit-appearance:none;}' +
        '.renamer-target-select{padding:4px 8px;border:1px solid var(--nc-border);background:var(--nc-bg);border-radius:4px;font-size:12px;transition:var(--nc-transition);width:100%;}' +
        '.renamer-menu-dropdown{position:absolute;right:0;top:100%;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px;min-width:160px;z-index:101;transition:var(--nc-transition);}' +
        '.renamer-menu-item{padding:6px 12px;cursor:pointer;border-radius:4px;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-menu-item:hover{background:rgba(0,0,0,0.05);}' +
        '.renamer-rule-popup{position:fixed;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:8px;min-width:180px;z-index:10000;transition:var(--nc-transition);}' +
        '.renamer-rule-popup-header{font-size:12px;font-weight:bold;padding:4px 8px;margin-bottom:4px;border-bottom:1px solid var(--nc-border);}' +
        '.renamer-rule-popup-item{padding:6px 10px;cursor:pointer;border-radius:4px;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-rule-popup-item:hover{background:rgba(0,0,0,0.05);}' +
        '.renamer-rule-popup-separator{height:1px;background:var(--nc-border);margin:4px 0;}' +
        '.renamer-status{padding:8px 12px;border-radius:4px;margin:8px 16px;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-status.success{background:#d4edda;color:#155724;}' +
        '.renamer-status.error{background:#f8d7da;color:#721c24;}' +
        '.renamer-diff-remove{background:rgba(239,68,68,0.2);color:#721c24;padding:2px 4px;border-radius:3px;border-bottom:2px solid #ef4444;}' +
        '.renamer-diff-add{background:rgba(34,197,94,0.25);color:#0f5132;padding:2px 4px;border-radius:3px;font-weight:bold;border-bottom:2px solid #22c55e;}' +
        '.renamer-empty{padding:24px;text-align:center;opacity:0.6;font-size:14px;}' +
        '.renamer-footer{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--nc-border);justify-content:flex-end;transition:var(--nc-transition);}' +
        '.renamer-success-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);transition:opacity 300ms ease,visibility 300ms ease;}' +
        '.renamer-success-popup{background:var(--color-main-background,#fff);color:var(--color-main-text,#000);border-radius:var(--border-radius-large,8px);padding:24px;box-shadow:0 0 20px rgba(0,0,0,.3);max-width:400px;width:90%;text-align:center;transition:all 300ms ease-in-out;}' +
        '.renamer-loading{position:relative;}' +
        '.renamer-loading::after{content:"";position:absolute;inset:0;background:rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;z-index:50;}';
    document.head.appendChild(style);
})();
