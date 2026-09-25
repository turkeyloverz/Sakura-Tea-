(() => {
    'use strict';

    if (window.SakuraTeaHeaderRuntime) {
        return;
    }

    const Core = window.SakuraTeaHeaderCore;
    const STATE = {
        root: null,
        sourceBindings: [],
        config: null
    };

    function getNativeHeader() {
        return document.querySelector('header.MuiAppBar-root') || document.querySelector('.skinHeader');
    }

    function sourceLabel(source) {
        const foreground = source.querySelector('.emby-button-foreground');
        if (foreground && foreground.textContent.trim()) {
            return foreground.textContent.trim();
        }

        const clone = source.cloneNode(true);
        clone.querySelectorAll('svg, img, .material-icons, .MuiSvgIcon-root, .MuiTouchRipple-root, [aria-hidden="true"]')
            .forEach((node) => node.remove());

        const text = clone.textContent.replace(/\s+/g, ' ').trim();
        return text || source.getAttribute('aria-label') || source.getAttribute('title') || '';
    }

    function sourceIsHidden(source) {
        return Boolean(source.hidden || source.classList.contains('hide') || source.getAttribute('aria-hidden') === 'true');
    }

    function sourceIsActive(source) {
        if (source.classList.contains('emby-tab-button-active') || source.getAttribute('aria-current') === 'page') {
            return true;
        }

        if (source.matches('a[href]')) {
            const href = source.getAttribute('href') || '';
            if (href.startsWith('#/')) {
                const current = window.location.hash.toLowerCase();
                const target = href.toLowerCase();
                return target.includes('?')
                    ? current === target || current.startsWith(target + '&')
                    : current === target;
            }
        }

        return false;
    }

    function sourceIcon(source) {
        const candidate =
            source.querySelector('.MuiButton-startIcon') ||
            source.querySelector('.MuiBadge-root') ||
            source.querySelector('.MuiAvatar-root') ||
            source.querySelector('img') ||
            source.querySelector('.material-icons') ||
            source.querySelector('.MuiSvgIcon-root') ||
            source.querySelector('svg');

        if (!candidate) {
            return null;
        }

        const clone = candidate.cloneNode(true);
        clone.querySelectorAll('.MuiTouchRipple-root').forEach((node) => node.remove());
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));

        if (clone.matches('img')) {
            clone.src = candidate.currentSrc || candidate.src;
            clone.removeAttribute('srcset');
        }

        return clone;
    }

    function isAvatarSource(source) {
        return Boolean(
            source.matches('.headerUserButton, [aria-controls="app-user-menu"]') ||
            source.querySelector('.MuiAvatar-root, .headerUserButtonRound')
        );
    }

    function sourceId(source) {
        const label = sourceLabel(source).trim().toLowerCase();
        const href = (source.getAttribute('href') || '').trim();

        if (source.matches('.headerSearchButton') || /\bsearch\b/.test(label)) return 'jellyfin:search';
        if (source.matches('.headerCastButton') || /\bcast\b/.test(label)) return 'jellyfin:cast';
        if (source.matches('.headerSyncButton') || /sync\s*play/.test(label)) return 'jellyfin:syncplay';
        if (isAvatarSource(source)) return 'jellyfin:user-menu';
        if (/favo(u)?rites?/.test(label)) return 'jellyfin:favorites';
        if (label === 'anime') return 'sakura:anime';
        if (label === 'not safe') return 'sakura:not-safe';
        if (label === 'home') return 'jellyfin:home';
        if (label === 'more') return 'jellyfin:more';
        if (/audio/.test(label)) return 'jellyfin:audio-player';

        if (href) {
            try {
                const url = new URL(href, document.baseURI);
                const parentId =
                    url.searchParams.get('topParentId') ||
                    url.searchParams.get('parentId') ||
                    url.searchParams.get('collectionId') ||
                    '';

                if (parentId) {
                    return 'jellyfin:view:' + parentId.toLowerCase();
                }

                const route = (url.hash || url.pathname || href).toLowerCase();
                if (route) {
                    return 'jellyfin:route:' + encodeURIComponent(route).slice(0, 160);
                }
            } catch (error) {}
        }

        const slug = label.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
        return slug ? 'jellyfin:label:' + slug : '';
    }

    function sourceShape(source) {
        return isAvatarSource(source) ? 'avatar' : (sourceLabel(source) ? 'text' : 'icon');
    }

    function sourceIconMarkup(source) {
        const icon = sourceIcon(source);
        if (!icon) {
            return '';
        }

        icon.querySelectorAll('script, style').forEach((node) => node.remove());
        icon.removeAttribute('onload');
        icon.removeAttribute('onclick');
        icon.querySelectorAll('*').forEach((node) => {
            Array.from(node.attributes || []).forEach((attribute) => {
                if (/^on/i.test(attribute.name)) {
                    node.removeAttribute(attribute.name);
                }
            });
        });

        return icon.outerHTML || '';
    }

    function collectSources() {
        const header = getNativeHeader();
        if (!header) {
            return { nav: [], actions: [] };
        }

        let nav = Array.from(header.querySelectorAll('.headerTabs .emby-tab-button, .headerTabs a[href]'))
            .filter((source) => !sourceIsHidden(source));

        if (!nav.length && header.matches('header.MuiAppBar-root')) {
            const toolbar = header.querySelector('.MuiToolbar-root');
            const stack = toolbar && Array.from(toolbar.children).find((child) => child.classList.contains('MuiStack-root'));
            if (stack) {
                nav = Array.from(stack.querySelectorAll('a[href], button'))
                    .filter((source) => !sourceIsHidden(source));
            }
        }

        if (!nav.length) {
            nav = Array.from(header.querySelectorAll('a[href], button'))
                .filter((source) => {
                    if (sourceIsHidden(source)) {
                        return false;
                    }

                    const label = sourceLabel(source).toLowerCase();
                    if (!label || label === 'sakura tea' || label === 'home' || label === 'menu' || label === 'back') {
                        return false;
                    }

                    if (source.matches('.headerSearchButton, .headerCastButton, .headerSyncButton, .headerUserButton')) {
                        return false;
                    }

                    if (source.getAttribute('aria-controls')) {
                        return false;
                    }

                    return Boolean(source.matches('a[href]') || source.classList.contains('emby-tab-button'));
                })
                .slice(0, 10);
        }

        nav = nav.filter((source) => {
            const label = sourceLabel(source).toLowerCase();
            const href = (source.getAttribute('href') || '').toLowerCase();
            return label !== 'sakura tea' && label !== 'home' && href !== '#/' && href !== '/';
        });

        const used = new Set(nav);
        let actions = Array.from(header.querySelectorAll('.headerRight button, .headerRight a[href]'))
            .filter((source) => !sourceIsHidden(source) && !used.has(source));

        if (!actions.length) {
            actions = Array.from(header.querySelectorAll('button, a[href]'))
                .filter((source) => {
                    if (sourceIsHidden(source) || used.has(source)) {
                        return false;
                    }

                    const label = sourceLabel(source).toLowerCase();
                    if (label === 'sakura tea' || label === 'home' || label === 'menu' || label === 'back') {
                        return false;
                    }

                    return Boolean(
                        source.getAttribute('aria-controls') ||
                        source.matches('.headerSearchButton, .headerCastButton, .headerSyncButton, .headerUserButton') ||
                        (!sourceLabel(source) && sourceIcon(source))
                    );
                })
                .slice(0, 10);
        }

        publishCatalog(nav, actions);
        return { nav: nav.slice(0, 10), actions: actions.slice(0, 10) };
    }

    function publishCatalog(nav, actions) {
        if (!Core) {
            return;
        }

        const seen = new Set();
        const items = [];

        [
            ...nav.map((source) => ({ source, group: 'nav' })),
            ...actions.map((source) => ({ source, group: 'action' }))
        ].forEach((entry) => {
            const id = sourceId(entry.source);
            if (!id || seen.has(id)) {
                return;
            }

            seen.add(id);
            const avatarSource = id === 'jellyfin:user-menu' && isAvatarSource(entry.source);
            const descriptor = {
                id,
                label: avatarSource ? 'User Menu' : (sourceLabel(entry.source) || entry.source.getAttribute('aria-label') || entry.source.getAttribute('title') || id),
                group: entry.group,
                shape: avatarSource ? 'icon' : sourceShape(entry.source),
                iconHtml: avatarSource ? '' : sourceIconMarkup(entry.source)
            };
            items.push(descriptor);

            if (avatarSource) {
                items.push({
                    id: 'jellyfin:profile-avatar',
                    label: 'Profile Avatar',
                    group: entry.group,
                    shape: 'avatar',
                    iconHtml: sourceIconMarkup(entry.source)
                });
            }
        });

        Core.publishCatalog(items);
    }

    function buildSourceMap(sources) {
        const map = new Map();

        [...sources.nav, ...sources.actions].forEach((source) => {
            const id = sourceId(source);
            if (id && !map.has(id)) {
                map.set(id, source);
            }

            if (id === 'jellyfin:user-menu' && isAvatarSource(source)) {
                map.set('jellyfin:profile-avatar', source);
            }
        });

        return map;
    }

    function makeProxyButton(source, item) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sakuraTeaHeaderButton';
        button.dataset.itemId = item.id;

        const useSourceIcon = !(item.id === 'jellyfin:user-menu' && isAvatarSource(source));
        const icon = useSourceIcon ? sourceIcon(source) : null;
        if (icon) {
            button.appendChild(icon);
        } else if (item.icon) {
            const fallbackIcon = document.createElement('span');
            fallbackIcon.className = 'sakuraTeaHeaderFallbackIcon';
            fallbackIcon.textContent = item.icon;
            button.appendChild(fallbackIcon);
        }

        const label = sourceLabel(source);
        const includeLabel = item.shape === 'text';
        if (includeLabel && label) {
            const text = document.createElement('span');
            text.className = 'sakuraTeaHeaderLabel';
            text.textContent = label;
            button.appendChild(text);
        }

        if (!includeLabel || !label) {
            button.classList.add('icon-only');
        }

        if (item.id === 'jellyfin:profile-avatar' || isAvatarSource(source)) {
            button.classList.add('has-avatar');
        }

        const title = item.label || source.getAttribute('aria-label') || source.getAttribute('title') || label;
        if (title) {
            button.setAttribute('aria-label', title);
            button.title = title;
        }

        button.classList.toggle('is-active', sourceIsActive(source));

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (source.matches('a[href]')) {
                const href = source.getAttribute('href');
                if (href && href.startsWith('#/')) {
                    window.location.hash = href.slice(1);
                    return;
                }
            }

            source.click();
        });

        STATE.sourceBindings.push({ proxy: button, source });
        return button;
    }

    function createStructuralItem(item) {
        if (item.shape === 'flower') {
            const flower = document.createElement('span');
            flower.className = 'sakuraTeaHeaderFlower';
            flower.dataset.itemId = item.id;
            flower.setAttribute('aria-hidden', 'true');
            return flower;
        }

        if (item.shape === 'space') {
            const spacer = document.createElement('span');
            spacer.className = 'sakuraTeaHeaderSpacer';
            spacer.dataset.itemId = item.id;
            spacer.setAttribute('aria-hidden', 'true');
            return spacer;
        }

        if (item.shape === 'separator') {
            const separator = document.createElement('span');
            separator.className = 'sakuraTeaHeaderSeparator';
            separator.dataset.itemId = item.id;
            separator.setAttribute('aria-hidden', 'true');
            return separator;
        }

        return null;
    }

    function createPill(ids, sourceMap, catalog, role) {
        const pill = document.createElement('div');
        pill.className = 'sakuraTeaHeaderPill ' + (role === 'right' ? 'sakuraTeaActionPill' : 'sakuraTeaNavPill');

        ids.forEach((id) => {
            const item = Core.itemById(catalog, id);
            const structural = createStructuralItem(item);
            if (structural) {
                pill.appendChild(structural);
                return;
            }

            const source = sourceMap.get(id);
            if (!source) {
                return;
            }

            pill.appendChild(makeProxyButton(source, item));
        });

        return pill.childElementCount ? pill : null;
    }

    function applySettings(header, config, hasSplit) {
        const height = Math.max(34, Math.min(58, Number(config.BuilderHeaderHeight || 44)));
        const button = Math.max(28, Math.min(44, Number(config.BuilderHeaderButtonSize || 34)));
        const icon = Math.max(13, Math.min(22, Number(config.BuilderHeaderIconSize || 17)));
        const avatar = Math.max(22, Math.min(36, Number(config.BuilderHeaderAvatarSize || 30)));
        const spacing = Math.max(2, Math.min(14, Number(config.BuilderHeaderSpacing || 7)));
        const opacity = Math.max(25, Math.min(90, Number(config.BuilderHeaderOpacity || 68))) / 100;

        header.style.setProperty('--sakura-tea-header-height', height + 'px');
        header.style.setProperty('--sakura-tea-button-size', button + 'px');
        header.style.setProperty('--sakura-tea-icon-size', icon + 'px');
        header.style.setProperty('--sakura-tea-avatar-size', avatar + 'px');
        header.style.setProperty('--sakura-tea-header-gap', spacing + 'px');
        header.style.setProperty('--sakura-tea-header-alpha', opacity.toFixed(2));
        header.style.setProperty('--sakura-tea-header-alpha-soft', Math.max(.18, opacity * .68).toFixed(2));
        header.style.setProperty('--sakura-tea-action-alpha', Math.max(.18, opacity * .76).toFixed(2));
        header.style.setProperty('--sakura-tea-action-alpha-soft', Math.max(.14, opacity * .50).toFixed(2));
        header.dataset.position = String(config.BuilderHeaderPosition || 'Left');
        header.classList.toggle('has-split', hasSplit);
    }

    function create(config) {
        if (!Core) {
            return null;
        }

        const sources = collectSources();
        const sourceMap = buildSourceMap(sources);
        const published = Core.readPublishedCatalog();
        const catalog = Core.mergeCatalog(published.items);
        const rawOrder = (config && config.BuilderHeaderItems) || Core.DEFAULT_HEADER_ITEMS;
        const migratedOrder = Core.upgradeLegacyOrder(rawOrder);
        const layout = Core.splitOrder(migratedOrder);

        STATE.sourceBindings = [];

        const header = document.createElement('div');
        header.id = 'sakuraTeaFloatingHeader';
        applySettings(header, config || {}, layout.hasSplit);

        if (layout.hasSplit) {
            const leftPill = createPill(layout.left, sourceMap, catalog, 'left');
            const rightPill = createPill(layout.right, sourceMap, catalog, 'right');

            if (leftPill) header.appendChild(leftPill);
            if (rightPill) header.appendChild(rightPill);
        } else {
            const pill = createPill(layout.left, sourceMap, catalog, 'left');
            if (pill) header.appendChild(pill);
        }

        return header.childElementCount ? header : null;
    }

    function mount(config) {
        unmount();
        STATE.config = config || STATE.config || {};
        STATE.root = create(STATE.config);
        if (STATE.root) {
            document.body.appendChild(STATE.root);
        }
        return STATE.root;
    }

    function sync() {
        if (!STATE.root || !STATE.root.isConnected) {
            return;
        }

        if (STATE.sourceBindings.some((record) => !record.source.isConnected)) {
            mount(STATE.config);
            return;
        }

        STATE.sourceBindings.forEach((record) => {
            record.proxy.classList.toggle('is-active', sourceIsActive(record.source));
        });
    }

    function unmount() {
        if (STATE.root) {
            STATE.root.remove();
        }
        STATE.root = null;
        STATE.sourceBindings = [];
    }

    window.SakuraTeaHeaderRuntime = Object.freeze({
        mount,
        sync,
        unmount,
        collectSources
    });
})();
