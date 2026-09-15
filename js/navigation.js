(function() {
    'use strict';

    const STAR_OUTLINE_PATH = 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z';
    const STAR_FILLED_PATH = 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z';

    function getStarSvg(filled, color) {
        const c = color || 'currentColor';
        if (filled) {
            return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-4 -4 30 30" fill="' + c + '"><path d="' + STAR_FILLED_PATH + '"></path></svg>';
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + STAR_OUTLINE_PATH + '"></path></svg>';
    }

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
            html += '</ul>';
            html += '<button type="button" id="renamer-breadcrumb-star" class="navigation-breadcrumb-star" title="' + this.ctx.escapeHtml(this.ctx.t('navFavorites') || 'Favoris') + '" aria-label="' + this.ctx.escapeHtml(this.ctx.t('navFavorites') || 'Favoris') + '" data-favorite="false">' + getStarSvg(false) + '</button>';
            const NAV_MORE_SVG = (window.RenamerIcons && window.RenamerIcons.SETTINGS_DOTS) || '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>';
            html += '<button type="button" id="renamer-nav-more" class="navigation-nav-more" title="' + this.ctx.escapeHtml(this.ctx.t('navMore') || 'Plus') + '" aria-label="' + this.ctx.escapeHtml(this.ctx.t('navMore') || 'Plus') + '">' + NAV_MORE_SVG + '</button>';
            html += '</nav>';
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

            const moreBtn = container.querySelector('#renamer-nav-more');
            if (moreBtn && !moreBtn._navBound) {
                moreBtn._navBound = true;
                moreBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (document.getElementById('renamer-nav-more-popup')) {
                        this.closeNavMorePopup();
                    } else {
                        this.showNavMorePopup(moreBtn);
                    }
                }.bind(this));
            }

            this.updateFavoriteStar(container);
        },

        updateFavoriteStar(container) {
            const star = container.querySelector('#renamer-breadcrumb-star');
            if (!star) return;
            const currentPath = this.getCurrentPath();
            const self = this;

            function renderStar(isFav) {
                star.innerHTML = getStarSvg(isFav);
                star.dataset.favorite = isFav ? 'true' : 'false';
                star.title = isFav ? self.ctx.t('navRemoveFavorite') || 'Retirer du favori' : self.ctx.t('navAddToFavorites') || 'Ajouter aux favoris';
                star.setAttribute('aria-label', star.title);
            }

            this.loadFavorites().then(function(favorites) {
                if (!star.parentNode) return;
                const isFav = favorites.indexOf(currentPath) !== -1;
                renderStar(isFav);
            }).catch(function() {
                renderStar(false);
            });

            if (!star._navBound) {
                star._navBound = true;
                star.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const isFav = star.dataset.favorite === 'true';
                    self.toggleFavorite(currentPath, !isFav).then(function(result) {
                        if (!star.parentNode) return;
                        if (result) {
                            renderStar(!isFav);
                            self.ctx.showToast(!isFav ? (self.ctx.t('navFavoriteAdded') || 'Ajouté aux favoris') : (self.ctx.t('navFavoriteRemoved') || 'Retiré des favoris'), 'success');
                        } else {
                            self.ctx.showToast(self.ctx.t('networkError') || 'Erreur réseau', 'error');
                        }
                    }).catch(function(err) {
                        self.ctx.showToast(self.ctx.t('networkError') || 'Erreur réseau', 'error');
                    });
                });
            }
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
                    console.warn('[RenamerNavigation] loadFolderContent failed', body, { client: true });
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
                console.warn('[RenamerNavigation] loadFolderContent error:', err, { client: true });
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
        },

        closeNavMorePopup() {
            const popup = document.getElementById('renamer-nav-more-popup');
            if (popup) {
                popup.remove();
            }
            if (this._navMoreOutsideListener) {
                document.removeEventListener('click', this._navMoreOutsideListener);
                this._navMoreOutsideListener = null;
            }
        },

        _attachNavMoreOutside(anchorBtn) {
            if (this._navMoreOutsideListener) {
                document.removeEventListener('click', this._navMoreOutsideListener);
            }
            const self = this;
            const onDocClick = function(e) {
                const popupEl = document.getElementById('renamer-nav-more-popup');
                if (!popupEl) {
                    document.removeEventListener('click', onDocClick);
                    self._navMoreOutsideListener = null;
                    return;
                }
                if (!popupEl.contains(e.target) && e.target !== anchorBtn) {
                    self.closeNavMorePopup();
                }
            };
            this._navMoreOutsideListener = onDocClick;
            document.addEventListener('click', onDocClick);
        },

        showNavMorePopup(anchorBtn) {
            this.closeNavMorePopup();
            const rect = anchorBtn.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.id = 'renamer-nav-more-popup';
            popup.className = 'renamer-popup renamer-nav-more-popup';
            popup.style.position = 'fixed';
            popup.style.left = rect.left + 'px';
            popup.style.top = (rect.bottom + 4) + 'px';
            popup.style.minWidth = '200px';
            popup.style.zIndex = '10000';
            popup.innerHTML = '<div class="renamer-popup-item" data-nav-action="favorites">' + this.ctx.escapeHtml(this.ctx.t('navFavorites') || 'Favoris') + '</div>';
            popup.addEventListener('click', function(e) {
                e.stopPropagation();
                const item = e.target.closest('.renamer-popup-item[data-nav-action]');
                if (!item) return;
                const action = item.dataset.navAction;
                this.closeNavMorePopup();
                if (action === 'favorites') {
                    this.showFavoritesPopup(anchorBtn);
                }
            }.bind(this));
            document.body.appendChild(popup);
            this._attachNavMoreOutside(anchorBtn);
        },

         loadFavorites() {
            if (this._favoritesCache) {
                return Promise.resolve(this._favoritesCache);
            }
            return this.ctx.apiRequest(this.ctx.getBaseUrl() + '/api/navigation/favorites', {
                method: 'GET'
            }).then(function(body) {
                if (body && body.success && Array.isArray(body.favorites)) {
                    this._favoritesCache = body.favorites;
                    return body.favorites;
                }
                this._favoritesCache = [];
                return [];
            }.bind(this)).catch(function() {
                return [];
            });
        },

        invalidateFavoritesCache() {
            this._favoritesCache = null;
        },

        toggleFavorite(path, makeFavorite) {
            return this.ctx.apiRequest(this.ctx.getBaseUrl() + '/api/navigation/favorites/toggle', {
                method: 'POST',
                body: JSON.stringify({ path: path, favorite: makeFavorite })
            }).then(function(body) {
                if (body && body.success) {
                    this.invalidateFavoritesCache();
                    return true;
                }
                return false;
            }.bind(this));
        },

        showFavoritesPopup(anchorBtn) {
            const self = this;
            const rect = anchorBtn.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.id = 'renamer-nav-more-popup';
            popup.className = 'renamer-popup renamer-nav-more-popup';
            popup.style.position = 'fixed';
            popup.style.left = rect.left + 'px';
            popup.style.top = (rect.bottom + 4) + 'px';
            popup.style.minWidth = '240px';
            popup.style.maxHeight = '60vh';
            popup.style.overflowY = 'auto';
            popup.style.zIndex = '10000';

            let h = '<div class="renamer-popup-header" style="font-size:12px;font-weight:bold;padding:4px 8px;margin-bottom:4px;border-bottom:1px solid var(--nc-border);">' + self.ctx.escapeHtml(self.ctx.t('navFavorites') || 'Favoris') + '</div>';
            h += '<div class="navigation-favorites-list" id="renamer-nav-favorites-list"></div>';
            popup.innerHTML = h;

            const listDiv = popup.querySelector('#renamer-nav-favorites-list');

            popup.addEventListener('click', function(e) { e.stopPropagation(); });
            document.body.appendChild(popup);
            this._attachNavMoreOutside(anchorBtn);

            const currentPath = this.getCurrentPath();
            const needsLoader = !this._favoritesCache;

            if (needsLoader && self.ctx.showLoaderInContainer) {
                self.ctx.showLoaderInContainer(listDiv, { message: self.ctx.t('navLoading') || 'Chargement...', showTimer: false });
            }

            this.loadFavorites().then(function(favorites) {
                if (!listDiv.parentNode) return;
                if (needsLoader && self.ctx.hideLoaderInContainer) {
                    self.ctx.hideLoaderInContainer(listDiv);
                }
                favorites = favorites || [];
                const isFav = favorites.indexOf(currentPath) !== -1;
                const STAR = getStarSvg(true);
                let listHtml = '';
                if (!favorites.length) {
                    listHtml += '<div class="renamer-popup-item" style="opacity:0.5;">' + self.ctx.escapeHtml(self.ctx.t('navNoFavorites') || 'Aucun favori') + '</div>';
                } else {
                    favorites.forEach(function(path) {
                        const favPath = (path || '/').replace(/\/+$/, '') || '/';
                        let folderName;
                        if (favPath === '/') {
                            folderName = self.ctx.t('navigationBreadcrumbRoot') || 'Racine';
                        } else {
                            folderName = favPath.split('/').pop() || favPath;
                        }
                        listHtml += '<div class="renamer-popup-item navigation-favorite-item" data-favorite-path="' + self.ctx.escapeHtml(favPath) + '">';
                        listHtml += '<span class="navigation-favorite-star" title="' + self.ctx.escapeHtml(self.ctx.t('navRemoveFavorite') || 'Retirer du favori') + '">' + STAR + '</span>';
                        listHtml += '<span class="navigation-favorite-path" title="' + self.ctx.escapeHtml(favPath) + '">' + self.ctx.escapeHtml(folderName) + '</span>';
                        listHtml += '</div>';
                    });
                }
                if (!isFav) {
                    listHtml += '<div class="renamer-popup-separator"></div>';
                    listHtml += '<div class="renamer-popup-item navigation-favorite-add" title="' + self.ctx.escapeHtml(self.ctx.t('navAddToFavorites') || 'Ajouter aux favoris') + '">' + self.ctx.escapeHtml(self.ctx.t('navAddToFavorites') || 'Ajouter aux favoris') + '</div>';
                }
                listDiv.innerHTML = listHtml;

                listDiv.querySelectorAll('.navigation-favorite-item').forEach(function(item) {
                    item.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const p = item.dataset.favoritePath;
                        if (p) {
                            self.closeNavMorePopup();
                            self.navigateToFolder(p);
                        }
                    });
                });

                listDiv.querySelectorAll('.navigation-favorite-star').forEach(function(star) {
                    star.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const row = star.closest('.navigation-favorite-item');
                        const p = row && row.dataset.favoritePath;
                        if (!p) return;
                        self.closeNavMorePopup();
                        self.toggleFavorite(p, false).then(function(result) {
                            if (result) {
                                self.ctx.showToast(self.ctx.t('navFavoriteRemoved') || 'Retiré des favoris', 'success');
                                self.showFavoritesPopup(anchorBtn);
                            } else {
                                self.ctx.showToast(self.ctx.t('networkError') || 'Erreur réseau', 'error');
                            }
                        }).catch(function() {
                            self.ctx.showToast(self.ctx.t('networkError') || 'Erreur réseau', 'error');
                        });
                    });
                });

                const addBtn = listDiv.querySelector('.navigation-favorite-add');
                if (addBtn) {
                    addBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        self.closeNavMorePopup();
                        self.toggleFavorite(currentPath, true).then(function(result) {
                            if (result) {
                                self.ctx.showToast(self.ctx.t('navFavoriteAdded') || 'Ajouté aux favoris', 'success');
                                self.showFavoritesPopup(anchorBtn);
                            } else {
                                self.ctx.showToast(self.ctx.t('networkError') || 'Erreur réseau', 'error');
                            }
                        }).catch(function() {
                            self.ctx.showToast(self.ctx.t('networkError') || 'Erreur réseau', 'error');
                        });
                    });
                }
             }).catch(function() {});
         },

         loadPageFavorites(ctx, filePath) {
            if (!ctx) ctx = this.ctx;
            if (!ctx || !filePath) return Promise.resolve([]);
            var key = 'readerFav#' + filePath;
            if (this._pageFavoritesCache && this._pageFavoritesCache[key]) {
                return Promise.resolve(this._pageFavoritesCache[key]);
            }
            return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/favorites?path=' + encodeURIComponent(filePath), {
                method: 'GET'
            }).then(function(body) {
                var pages = [];
                if (body && body.success && Array.isArray(body.pages)) {
                    pages = body.pages;
                }
                this._pageFavoritesCache = this._pageFavoritesCache || {};
                this._pageFavoritesCache[key] = pages;
                return pages;
            }.bind(this)).catch(function() {
                return [];
            });
        },

        savePageFavorites(ctx, filePath, pages) {
            if (!ctx) ctx = this.ctx;
            if (!ctx || !filePath) return Promise.resolve(false);
            return ctx.apiRequest(ctx.getBaseUrl() + '/api/reader/favorites', {
                method: 'POST',
                body: JSON.stringify({ path: filePath, pages: pages })
            }).then(function(body) {
                var key = 'readerFav#' + filePath;
                this._pageFavoritesCache = this._pageFavoritesCache || {};
                this._pageFavoritesCache[key] = pages.slice();
                return !!(body && body.success);
            }.bind(this)).catch(function() {
                return false;
            });
        },

        invalidatePageFavoritesCache(ctx, filePath) {
            if (!filePath) return;
            var key = 'readerFav#' + filePath;
            if (this._pageFavoritesCache && this._pageFavoritesCache[key]) {
                delete this._pageFavoritesCache[key];
            }
        },

        togglePageFavorite(ctx, filePath, pageNum, makeFavorite) {
            var self = this;
            if (!ctx) ctx = this.ctx;
            return self.loadPageFavorites(ctx, filePath).then(function(pages) {
                var newPages = pages.slice();
                var idx = newPages.indexOf(pageNum);
                if (makeFavorite) {
                    if (idx === -1) newPages.push(pageNum);
                } else {
                    if (idx !== -1) newPages.splice(idx, 1);
                }
                newPages.sort(function(a, b) { return a - b; });
                return self.savePageFavorites(ctx, filePath, newPages).then(function(result) {
                    return { success: result, pages: newPages };
                });
            });
        },

        renderStarButton(filled, color) {
            return getStarSvg(filled, color || 'currentColor');
        },
    };

    window.RenamerNavigation = RenamerNavigation;
})();