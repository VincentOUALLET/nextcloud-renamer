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
        '.renamer-files-bar{display:flex;gap:8px;padding:8px 16px;border-bottom:1px solid var(--nc-border);overflow-x:auto;min-height:48px;align-items:center;transition:var(--nc-transition);}' +
        '.renamer-file-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:16px;font-size:13px;cursor:grab;white-space:nowrap;transition:var(--nc-transition);}' +
        '.renamer-file-pill:active{cursor:grabbing;}' +
        '.renamer-file-pill.dragging{opacity:0.5;}' +
        '.renamer-main{display:flex;flex:1;overflow:hidden;transition:var(--nc-transition);}' +
        '.renamer-rules{flex:1;display:flex;flex-direction:column;border-right:1px solid var(--nc-border);overflow:hidden;min-width:320px;transition:var(--nc-transition);}' +
        '.renamer-rules-list{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;transition:var(--nc-transition);}' +
        '.renamer-preview{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:320px;transition:var(--nc-transition);}' +
        '.renamer-preview-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--nc-border);font-weight:bold;transition:var(--nc-transition);}' +
        '.renamer-preview-list{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;transition:var(--nc-transition);}' +
        '.renamer-rule-card{border-radius:var(--nc-radius);border-left:4px solid var(--nc-blue);background:var(--nc-bg);padding:12px;transition:var(--nc-transition);display:flex;flex-direction:column;gap:8px;}' +
        '.renamer-rule-card.type-search_replace{border-left-color:var(--nc-blue);}' +
        '.renamer-rule-card.type-sequence{border-left-color:var(--nc-orange);}' +
        '.renamer-rule-card.type-regex{border-left-color:var(--nc-red);}' +
        '.renamer-rule-card.type-filetype{border-left-color:var(--nc-green);}' +
        '.renamer-rule-card.disabled{opacity:0.5;filter:grayscale(1);}' +
        '.renamer-rule-header{display:flex;align-items:center;gap:8px;}' +
        '.renamer-rule-drag{cursor:grab;padding:4px;opacity:0.5;transition:var(--nc-transition);}' +
        '.renamer-rule-drag:active{cursor:grabbing;}' +
        '.renamer-rule-number{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:#fff;flex-shrink:0;transition:var(--nc-transition);}' +
        '.renamer-rule-name{flex:1;font-weight:500;font-size:14px;}' +
        '.renamer-rule-actions{display:flex;align-items:center;gap:4px;}' +
        '.renamer-btn-icon{width:28px;height:28px;border:none;background:transparent;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:var(--nc-transition);}' +
        '.renamer-btn-icon:hover{background:rgba(0,0,0,0.1);}' +
        '.renamer-toggle{position:relative;width:36px;height:20px;background:#ccc;border-radius:10px;cursor:pointer;transition:var(--nc-transition);}' +
        '.renamer-toggle.on{background:var(--nc-blue);}' +
        '.renamer-toggle-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:var(--nc-transition);}' +
        '.renamer-toggle.on .renamer-toggle-knob{left:18px;}' +
        '.renamer-add-btn{width:56px;height:56px;border-radius:50%;border:3px solid var(--nc-blue);background:transparent;color:var(--nc-blue);font-size:28px;cursor:pointer;transition:var(--nc-transition);display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
        '.renamer-add-btn:hover{background:var(--nc-blue);color:#fff;}' +
        '.renamer-popup{position:absolute;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:8px;z-index:100;min-width:180px;transition:var(--nc-transition);}' +
        '.renamer-popup-item{padding:8px 12px;cursor:pointer;border-radius:4px;transition:var(--nc-transition);font-size:14px;}' +
        '.renamer-popup-item:hover{background:rgba(0,130,201,0.1);}' +
        '.renamer-preview-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;transition:var(--nc-transition);}' +
        '.renamer-preview-row:hover{background:rgba(0,0,0,0.03);}' +
        '.renamer-preview-from{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.renamer-preview-arrow{color:var(--nc-blue);font-size:16px;}' +
        '.renamer-preview-to{flex:1;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.renamer-btn{padding:6px 12px;border:1px solid var(--nc-border);background:var(--nc-bg);border-radius:4px;cursor:pointer;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-btn:hover{background:rgba(0,0,0,0.05);}' +
        '.renamer-btn-primary{background:var(--nc-blue);color:#fff;border-color:var(--nc-blue);}' +
        '.renamer-btn-primary:hover{background:var(--nc-blue-hover);}' +
        '.renamer-field{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;}' +
        '.renamer-field label{font-size:12px;font-weight:500;opacity:0.8;}' +
        '.renamer-field input,.renamer-field select{padding:6px 8px;border:1px solid var(--nc-border);border-radius:4px;background:var(--nc-bg);color:var(--nc-text);font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-field input:focus,.renamer-field select:focus{outline:none;border-color:var(--nc-blue);}' +
        '.renamer-target-btns{display:flex;gap:4px;}' +
        '.renamer-target-btn{padding:4px 8px;border:1px solid var(--nc-border);background:transparent;border-radius:4px;cursor:pointer;font-size:12px;transition:var(--nc-transition);}' +
        '.renamer-target-btn.active{background:var(--nc-blue);color:#fff;border-color:var(--nc-blue);}' +
        '.renamer-menu-dropdown{position:absolute;right:0;top:100%;background:var(--nc-bg);border:1px solid var(--nc-border);border-radius:var(--nc-radius);box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px;min-width:160px;z-index:101;transition:var(--nc-transition);}' +
        '.renamer-menu-item{padding:6px 12px;cursor:pointer;border-radius:4px;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-menu-item:hover{background:rgba(0,0,0,0.05);}' +
        '.renamer-status{padding:8px 12px;border-radius:4px;margin:8px 16px;font-size:13px;transition:var(--nc-transition);}' +
        '.renamer-status.success{background:#d4edda;color:#155724;}' +
        '.renamer-status.error{background:#f8d7da;color:#721c24;}' +
        '.renamer-diff-remove{background:#f8d7da;color:#721c24;text-decoration:line-through;padding:2px 4px;border-radius:3px;}' +
        '.renamer-diff-add{background:#d4edda;color:#155724;padding:2px 4px;border-radius:3px;font-weight:bold;}' +
        '.renamer-empty{padding:24px;text-align:center;opacity:0.6;font-size:14px;}' +
        '.renamer-footer{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--nc-border);justify-content:flex-end;transition:var(--nc-transition);}';
    document.head.appendChild(style);
})();
