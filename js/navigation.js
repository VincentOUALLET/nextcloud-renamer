(function() {
    'use strict';

    const RenamerNavigation = {
        stateKey: 'navigation',

        init(ctx) {
            if (!ctx.state.navigation) {
                ctx.state.navigation = {
                    currentPath: '/',
                    folderStack: [],
                };
            }
            this.ctx = ctx;
        },

        getCurrentPath() {
            return (this.ctx.state.navigation.currentPath || '/').replace(/\/+$/, '') || '/';
        },

        setCurrentPath(path) {
            const normalized = (path || '/').replace(/\/+$/, '') || '/';
            this.ctx.state.navigation.currentPath = normalized;
        },

        pushFolderStack(path) {
            if (!this.ctx.state.navigation.folderStack) {
                this.ctx.state.navigation.folderStack = [];
            }
            const normalized = (path || '/').replace(/\/+$/, '') || '/';
            if (normalized !== '/') {
                this.ctx.state.navigation.folderStack.push(normalized);
            }
        },

        popFolderStack() {
            if (this.ctx.state.navigation.folderStack && this.ctx.state.navigation.folderStack.length > 0) {
                return this.ctx.state.navigation.folderStack.pop();
            }
            return null;
        },

        buildBreadcrumb() {
            const currentPath = this.getCurrentPath();
            console.log('[RenamerNavigation] buildBreadcrumb currentPath=', currentPath);
            const parts = currentPath.split('/').filter(Boolean);
            let html = '<nav class="navigation-breadcrumb" aria-label="Current directory path"><ul class="breadcrumb__crumbs">';
            html += '<li class="navigation-crumb"><a class="button-vue button-vue--size-normal button-vue--icon-only button-vue--vue-tertiary button-vue--tertiary" data-folder-path="/" title="' + this.ctx.escapeHtml(this.ctx.t('navigationBreadcrumbRoot') || 'Root') + '"><span class="button-vue__wrapper"><span class="button-vue__icon"><span class="icon-vue" style="width:20px;height:20px;display:flex;">' + window.RenamerIcons.FOLDER + '</span></span></span></a><span class="material-design-icon chevron-right-icon vue-crumb__separator"><svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg></span></li>';
            let built = '';
            parts.forEach(function(part, index) {
                built += '/' + part;
                const isLast = index === parts.length - 1;
                const activeClass = isLast ? ' active' : '';
                html += '<li class="navigation-crumb' + activeClass + '"><a class="button-vue button-vue--size-normal button-vue--text-only button-vue--vue-tertiary button-vue--tertiary" data-folder-path="' + this.ctx.escapeHtml(built) + '" title="' + this.ctx.escapeHtml(part) + '"><span class="button-vue__wrapper"><span class="button-vue__text">' + this.ctx.escapeHtml(part) + '</span></span></a>';
                if (!isLast) {
                    html += '<span class="material-design-icon chevron-right-icon vue-crumb__separator"><svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"></path></svg></span>';
                }
                html += '</li>';
            }.bind(this));
            html += '</ul></nav>';
            return html;
        },

        renderBreadcrumb(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = this.buildBreadcrumb();
            console.log('[RenamerNavigation] renderBreadcrumb rendered, currentPath=', this.getCurrentPath());
            container.querySelectorAll('.navigation-crumb a').forEach(function(link) {
                if (link._navBound) return;
                link._navBound = true;
                const targetPath = link.dataset.folderPath;
                console.log('[RenamerNavigation] bind breadcrumb link', targetPath);
                link.addEventListener('click', function(e) {
                    console.log('[RenamerNavigation] breadcrumb clicked', targetPath);
                    e.preventDefault();
                    e.stopPropagation();
                    if (targetPath) {
                        this.navigateToFolder(targetPath);
                    }
                }.bind(this));
            }.bind(this));
        },

        buildFolderRow() {
            const currentPath = this.getCurrentPath();
            if (currentPath === '/') {
                return '';
            }
            const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
            const FOLDER_SVG = '<span class="icon-vue" style="width:20px;height:20px;display:flex;">' + window.RenamerIcons.FOLDER + '</span>';
        const parentName = parentPath === '/' ? (this.ctx.t('navigationBreadcrumbRoot') || 'Racine') : currentPath.split('/').filter(Boolean).pop() || '..';
        return '<tr class="navigation-preview-row navigation-folder-row" data-folder-path="' + this.ctx.escapeHtml(parentPath) + '">' +
            '<td class="navigation-col-select" style="pointer-events:none;"></td>' +
            '<td class="navigation-col-audio" style="pointer-events:none;width:36px;text-align:center;padding:4px 2px;">' + FOLDER_SVG + '</td>' +
            '<td class="navigation-col-file" style="pointer-events:none;"><span class="navigation-folder-name">' + this.ctx.escapeHtml(parentName) + '</span></td>' +
            '</tr>';
        },

        bindFolderRow(list) {
            list.querySelectorAll('.navigation-folder-row').forEach(function(row) {
                if (row._navBound) return;
                row._navBound = true;
                const folderPath = row.dataset.folderPath;
                row.addEventListener('click', function() {
                    if (folderPath) {
                        this.navigateToFolder(folderPath);
                    }
                }.bind(this));
            }.bind(this));
        },

        navigateToFolder(path) {
            const currentPath = this.getCurrentPath();
            console.log('[RenamerNavigation] navigateToFolder called', path, 'from', currentPath);
            if (path === currentPath) {
                console.log('[RenamerNavigation] navigateToFolder same path, aborting');
                return;
            }

            this.pushFolderStack(currentPath);
            this.setCurrentPath(path);
            this.ctx.state.fileSelection = new Set();
            this.ctx.state.allSelected = true;
            console.log('[RenamerNavigation] navigateToFolder set currentPath=', this.getCurrentPath(), 'loading content');

            this.loadFolderContent(path);
        },

        loadFolderContent(path) {
            console.log('[RenamerNavigation] loadFolderContent', path);
            this.ctx.apiRequest(this.ctx.getBaseUrl() + '/api/files/list', {
                method: 'POST',
                body: JSON.stringify({ path: path })
            }).then(function(body) {
                console.log('[RenamerNavigation] loadFolderContent response', body);
                if (!body || !body.success) {
                    console.warn('[RenamerNavigation] loadFolderContent failed', body);
                    return;
                }

                var files = body.files || [];
                var folders = body.folders || [];
                this.ctx.state.files = folders.concat(files);
                this.ctx.state.navigation.folders = folders;
                this.ctx.state.fileSelection = new Set(this.ctx.state.files);
                this.ctx.state.allSelected = true;

                var callbacks = this._folderLoadedCallbacks || [];
                if (callbacks.length) {
                    console.log('[RenamerNavigation] loadFolderContent calling', callbacks.length, 'folderLoaded callbacks');
                    callbacks.forEach(function(cb) {
                        try { cb(this.ctx); } catch (e) { console.warn('[RenamerNavigation] onFolderLoaded error:', e); }
                    }.bind(this));
                } else {
                    console.warn('[RenamerNavigation] loadFolderContent no folderLoaded callbacks');
                }
            }.bind(this)).catch(function(err) {
                console.warn('[RenamerNavigation] loadFolderContent error:', err);
            });
        },

        goUp() {
            const parent = this.popFolderStack();
            if (parent) {
                this.setCurrentPath(parent);
                this.loadFolderContent(parent);
            } else {
                this.setCurrentPath('/');
                this.loadFolderContent('/');
            }
        },

        addFolderLoadedListener(callback) {
            if (!this._folderLoadedCallbacks) {
                this._folderLoadedCallbacks = [];
            }
            if (typeof callback === 'function' && this._folderLoadedCallbacks.indexOf(callback) === -1) {
                this._folderLoadedCallbacks.push(callback);
            }
        },

        removeFolderLoadedListener(callback) {
            if (!this._folderLoadedCallbacks) return;
            this._folderLoadedCallbacks = this._folderLoadedCallbacks.filter(function(cb) { return cb !== callback; });
        },

        setOnFolderLoaded(callback) {
            this._folderLoadedCallbacks = [];
            if (typeof callback === 'function') {
                this._folderLoadedCallbacks.push(callback);
            }
        }
    };

    window.RenamerNavigation = RenamerNavigation;
})();