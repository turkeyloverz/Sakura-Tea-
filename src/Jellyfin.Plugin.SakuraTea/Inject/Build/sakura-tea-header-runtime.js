(() => {
    'use strict';

    if (window.SakuraTeaHeaderRuntime) {
        return;
    }

    const Core = window.SakuraTeaHeaderCore;
    const STATE = {
        root: null,
        sourceBindings: []
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

    function sourceId(source) {
        const label = sourceLabel(source).trim().toLowerCase();
        const href = (source.getAttribute('href') || '').trim();

        if (source.matches('.headerSearchButton') || /\bsearch\b/.test(label)) return 'jellyfin:search';
        if (source.matches('.headerCastButton') || /\bcast\b/.test(label)) return 'jellyfin:cast';
        if (source.matches('.headerSyncButton') || /sync\s*play/.test(label)) return 'jellyfin:syncplay';
        if (source.matches('.headerUserButton, [aria-controls="app-user-menu"]') || source.querySelector('.MuiAvatar-root, .headerUserButtonRound')) return 'jellyfin:user-menu';
        if (/favo(u)?rites?/.test(label)) return 'jellyfin:favorites';
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
        if (
            source.matches('.headerUserButton, [aria-controls="app-user-menu"]') ||
            source.querySelector('.MuiAvatar-root, .headerUserButtonRound')
        ) {
            return 'avatar';
        }

        return sourceLabel(source) ? 'text' : 'icon';
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
                .slice(0, 8);
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
                .slice(0, 8);
        }

        publishCatalog(nav, actions);
        return { nav: nav.slice(0, 8), actions: actions.slice(0, 8) };
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
            items.push({
                id,
                label: sourceLabel(entry.source) || entry.source.getAttribute('aria-label') || entry.source.getAttribute('title') || id,
                group: entry.group,
                shape: sourceShape(entry.source),
                iconHtml: sourceIconMarkup(entry.source)
            });
        });

        Core.publishCatalog(items);
    }

    function makeProxyButton(source, includeLabel) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sakuraTeaHeaderButton';

        const icon = sourceIcon(source);
        if (icon) {
            button.appendChild(icon);
        }

        const label = sourceLabel(source);
        if (includeLabel && label) {
            const text = document.createElement('span');
            text.className = 'sakuraTeaHeaderLabel';
            text.textContent = label;
            button.appendChild(text);
        }

        if (!includeLabel || !label) {
            button.classList.add('icon-only');
        }

        if (
            source.matches('.headerUserButton, [aria-controls="app-user-menu"]') ||
            source.querySelector('.MuiAvatar-root, .headerUserButtonRound')
        ) {
            button.classList.add('has-avatar');
        }

        const title = source.getAttribute('aria-label') || source.getAttribute('title') || label;
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

    function create() {
        const sources = collectSources();
        if (!sources.nav.length && !sources.actions.length) {
            return null;
        }

        STATE.sourceBindings = [];

        const header = document.createElement('div');
        header.id = 'sakuraTeaFloatingHeader';

        const navPill = document.createElement('div');
        navPill.className = 'sakuraTeaHeaderPill sakuraTeaNavPill';

        const flower = document.createElement('span');
        flower.className = 'sakuraTeaHeaderFlower';
        flower.setAttribute('aria-hidden', 'true');
        navPill.appendChild(flower);

        sources.nav.forEach((source) => navPill.appendChild(makeProxyButton(source, true)));
        header.appendChild(navPill);

        if (sources.actions.length) {
            const actionPill = document.createElement('div');
            actionPill.className = 'sakuraTeaHeaderPill sakuraTeaActionPill';
            sources.actions.forEach((source) => actionPill.appendChild(makeProxyButton(source, false)));
            header.appendChild(actionPill);
        }

        return header;
    }

    function mount() {
        unmount();
        STATE.root = create();
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
            mount();
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
