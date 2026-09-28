(() => {
    'use strict';

    if (window.SakuraTeaHeaderRuntime) {
        return;
    }

    const Core = window.SakuraTeaHeaderCore;
    const STATE = {
        root: null,
        sourceBindings: [],
        config: null,
        missing: [],
        anchors: new Map(),
        layoutFrame: 0,
        layoutItems: [],
        brandRequest: 0
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

    function sourceAvatar(source) {
        const image = source.querySelector('.MuiAvatar-root img, .headerUserButtonRound img, img');
        if (image && (image.currentSrc || image.src)) {
            const avatar = document.createElement('img');
            avatar.className = 'sakuraTeaAvatarImage';
            avatar.src = image.currentSrc || image.src;
            avatar.alt = '';
            return avatar;
        }

        const nativeAvatar = source.querySelector('.MuiAvatar-root, .headerUserButtonRound');


        const fallback = document.createElement('span');
        fallback.className = 'sakuraTeaAvatarFallback';
        fallback.textContent = nativeAvatar?.textContent.trim().slice(0, 2) || 'P';
        return fallback;
    }

    function sourceId(source) {
        const provider = (source.id || '').match(/^je-native-tab-(?:btn|link)-([a-z0-9-]+)$/i);
        if (provider) return 'je:' + provider[1].toLowerCase();
        if (source.id === 'randomItemButton') return 'je:random';
        if (source.id === 'je-active-streams') return 'je:active-streams';
        const seerr = source.getAttribute('data-seerrfin-tab') || source.getAttribute('data-seerrfin-menu-nav') || (source.getAttribute('href') || '').match(/[?&]seerrfinTab=([a-z0-9-]+)/i)?.[1];
        if (seerr) return 'sf:' + seerr;
        if (source.matches('.headerBackButton')) return 'jellyfin:back';
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

    function safeMarkup(node) {
        if (!node) {
            return '';
        }

        node.querySelectorAll?.('script, style').forEach((child) => child.remove());
        node.removeAttribute('onload');
        node.removeAttribute('onclick');
        [node, ...(node.querySelectorAll ? node.querySelectorAll('*') : [])].forEach((child) => {
            Array.from(child.attributes || []).forEach((attribute) => {
                if (/^on/i.test(attribute.name)) {
                    child.removeAttribute(attribute.name);
                }
            });
        });

        return node.outerHTML || '';
    }

    function sourceIconMarkup(source) {
        return safeMarkup(sourceIcon(source));
    }

    function sourceAvatarMarkup(source) {
        return safeMarkup(sourceAvatar(source));
    }

    function collectSources(publish = true) {
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
                .slice(0, 64);
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
                .slice(0, 64);
        }

        const extras = document.querySelectorAll('#je-header-buttons-group button, #je-native-tabs-group button, [data-seerrfin-tab], #randomItemButton, #je-active-streams');
        extras.forEach(source => {
            if (!source.closest('#sakuraTeaFloatingHeader') && !sourceIsHidden(source) && !nav.includes(source) && !actions.includes(source)) actions.push(source);
        });
        if (publish) publishCatalog(nav, actions);
        return { nav: nav.slice(0, 64), actions: actions.slice(0, 64) };
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
                available: true,
                iconHtml: avatarSource ? '' : sourceIconMarkup(entry.source)
            };
            items.push(descriptor);

            if (avatarSource) {
                items.push({
                    id: 'jellyfin:profile-avatar',
                    label: 'Profile Avatar',
                    group: entry.group,
                    shape: 'avatar',
                    available: true,
                    iconHtml: sourceAvatarMarkup(entry.source)
                });
            }
        });

        if (JSON.stringify(Core.readPublishedCatalog().items) !== JSON.stringify(items)) Core.publishCatalog(items);
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

        const isProfileAvatar = item.id === 'jellyfin:profile-avatar';
        if (isProfileAvatar) {
            button.appendChild(sourceAvatar(source));
            button.classList.add('has-avatar');
        } else {
            const text = document.createElement('span');
            text.className = 'sakuraTeaHeaderLabel';
            text.textContent = item.label || sourceLabel(source);
            button.appendChild(text);
        }
        const label = item.label || sourceLabel(source);

        const title = item.label || source.getAttribute('aria-label') || source.getAttribute('title') || label;
        if (title) {
            button.setAttribute('aria-label', title);
            button.title = title;
        }

        button.classList.toggle('is-active', sourceIsActive(source));
        button.disabled = source.disabled || source.getAttribute('aria-disabled') === 'true';

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

            anchorPopup(source, button);
            source.click();
            closeOverflow(false);
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
                STATE.missing.push(id);
                return;
            }

            pill.appendChild(makeProxyButton(source, item));
        });

        return pill.childElementCount ? pill : null;
    }

    function applySettings(header, config) {
        const height = Math.max(34, Math.min(80, Number(config.BuilderHeaderHeight || 44)));
        const button = Math.max(28, Math.min(56, Number(config.BuilderHeaderButtonSize || 34)));
        const icon = Math.max(13, Math.min(22, Number(config.BuilderHeaderIconSize || 17)));
        const avatar = Math.max(22, Math.min(36, Number(config.BuilderHeaderAvatarSize || 30)));
        const spacing = Math.max(0, Math.min(24, Number(config.BuilderHeaderSpacing ?? 7)));
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
        header.dataset.position = ['Left', 'Center', 'Right'].includes(config.BuilderHeaderPosition) ? config.BuilderHeaderPosition : 'Left';
        Core.applyHeaderStyle(header, config);
    }

    function anchorPopup(source, button) {
        if (!(isAvatarSource(source) || source.hasAttribute('aria-haspopup') || source.hasAttribute('aria-controls') || source.matches('.headerCastButton,.headerSyncButton'))) return;
        const names = ['position', 'left', 'top', 'width', 'height', 'margin', 'pointer-events'];
        if (!STATE.anchors.has(source)) STATE.anchors.set(source, names.map(name => [name, source.style.getPropertyValue(name), source.style.getPropertyPriority(name)]));
        const bounds = button.getBoundingClientRect();
        Object.entries({ position: 'fixed', left: bounds.left + 'px', top: bounds.top + 'px', width: bounds.width + 'px', height: bounds.height + 'px', margin: '0', 'pointer-events': 'none' })
            .forEach(([name, value]) => source.style.setProperty(name, value, 'important'));
    }

    function createBrand(config, kind) {
        const values = Core.normalizeHeaderStyle(config);
        if (values.BuilderBrandDisplay === 'None' || (kind === 'Logo' && values.BuilderBrandDisplay === 'ServerName') || (kind === 'Name' && values.BuilderBrandDisplay === 'Logo')) return null;
        const brand = document.createElement('a');
        brand.className = 'sakuraTeaBrand sakuraTeaBrand' + kind; brand.href = '#/home';
        brand.setAttribute('aria-label', kind === 'Logo' ? 'Server icon · Home' : 'Server name · Home');
        if (kind === 'Logo') {
            const logo = document.createElement('img'); logo.alt = '';
            const native = getNativeHeader()?.querySelector('a[href="#/"] img');
            const icon = document.querySelector('link[rel~="icon"]');
            if (native?.src || icon?.href) { logo.src = native?.src || icon.href; brand.appendChild(logo); }
            else { const flower = document.createElement('span'); flower.textContent = '✿'; flower.setAttribute('aria-hidden', 'true'); brand.appendChild(flower); }
        } else {
            const name = document.createElement('span'); name.className = 'sakuraTeaServerName'; name.textContent = 'Sakura Tea'; brand.appendChild(name);
            const request = ++STATE.brandRequest;
            const client = window.ApiClient;
            if (client?.ajax && client.getUrl) Promise.resolve(client.ajax({type:'GET',url:client.getUrl('System/Info/Public'),dataType:'json'})).then(info => {
                if (request !== STATE.brandRequest || !brand.isConnected) return;
                name.textContent = info?.ServerName || info?.serverName || 'Sakura Tea'; brand.title = name.textContent; scheduleLayout();
            }).catch(() => {});
        }
        return brand;
    }

    function closeOverflow(focus) {
        const drawer = STATE.root?.querySelector('#sakuraTeaOverflow');
        const toggle = STATE.root?.querySelector('.sakuraTeaOverflowToggle');
        if (!drawer || drawer.hidden) return;
        drawer.hidden = true; toggle.setAttribute('aria-expanded', 'false');
        if (focus) toggle.focus();
    }

    function layout() {
        const root = STATE.root; if (!root?.isConnected) return;
        const pill = root.querySelector('.sakuraTeaHeaderPill');
        const toggle = root.querySelector('.sakuraTeaOverflowToggle');
        const drawer = root.querySelector('#sakuraTeaOverflow');
        if (!pill || !toggle || !drawer) return;
        const focused = document.activeElement;
        STATE.layoutItems.forEach(node => pill.insertBefore(node, toggle));
        toggle.hidden = true;
        if (pill.scrollWidth > pill.clientWidth + 1) {
            toggle.hidden = false;
            for (let i = STATE.layoutItems.length - 1; i >= 0 && pill.scrollWidth > pill.clientWidth + 1; i--) {
                drawer.insertBefore(STATE.layoutItems[i], drawer.firstChild);
            }
        }
        if (!drawer.children.length) closeOverflow(false);
        if (focused && drawer.contains(focused) && drawer.hidden) toggle.focus();
        const values = Core.normalizeHeaderStyle(STATE.config);
        Core.positionHeaderElements(root, [
            {element:root.querySelector('.sakuraTeaBrandLogo'),x:values.BuilderLogoX,y:values.BuilderLogoY},
            {element:root.querySelector('.sakuraTeaBrandName'),x:values.BuilderNameX,y:values.BuilderNameY},
            {element:pill,x:values.BuilderHeaderX,y:values.BuilderHeaderY}
        ]);
        const rect = pill.getBoundingClientRect();
        drawer.style.top = (rect.bottom + 8) + 'px';
        drawer.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 268)) + 'px';
        updateContentTop();
    }

    function scheduleLayout() {
        if (STATE.layoutFrame) return;
        STATE.layoutFrame = requestAnimationFrame(() => { STATE.layoutFrame = 0; layout(); });
    }

    function create(config) {
        if (!Core) {
            return null;
        }

        const sources = collectSources();
        const sourceMap = buildSourceMap(sources);
        const published = Core.readPublishedCatalog();
        const catalog = Core.mergeCatalog(published.items);
        const rawOrder = config && typeof config.BuilderHeaderItems === 'string' ? config.BuilderHeaderItems : Core.DEFAULT_HEADER_ITEMS;
        const migratedOrder = Core.upgradeLegacyOrder(rawOrder);
        const layout = Core.groupOrder(migratedOrder);
        STATE.sourceBindings = [];
        STATE.missing = [];

        const header = document.createElement('div');
        header.id = 'sakuraTeaFloatingHeader';
        applySettings(header, config || {});

        layout.pillGroups.forEach((group) => {
            const pill = createPill(group.entries.map((entry) => entry.id), sourceMap, catalog, group.role);
            if (pill) {
                pill.dataset.groupIndex = String(group.groupIndex);
                header.appendChild(pill);
            }
        });

        const appearance = window.SakuraTeaAppearance?.createControl();
        if (appearance) {
            let pill = header.querySelector('.sakuraTeaHeaderPill');
            if (!pill) {
                pill = document.createElement('div');
                pill.className = 'sakuraTeaHeaderPill sakuraTeaNavPill';
                header.appendChild(pill);
            }
            pill.appendChild(appearance);
        }

        let pill = header.querySelector('.sakuraTeaHeaderPill');
        if (!pill) {
            pill = document.createElement('div'); pill.className = 'sakuraTeaHeaderPill'; header.appendChild(pill);
        }
        ['Logo', 'Name'].forEach(kind => { const brand = createBrand(config, kind); if (brand) header.appendChild(brand); });
        STATE.layoutItems = Array.from(pill.children).filter(node => node !== appearance);
        const toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'sakuraTeaHeaderButton sakuraTeaOverflowToggle'; toggle.textContent = 'More';
        toggle.setAttribute('aria-label', 'More navigation'); toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'sakuraTeaOverflow'); toggle.hidden = true;
        const drawer = document.createElement('nav'); drawer.id = 'sakuraTeaOverflow'; drawer.hidden = true;
        drawer.setAttribute('aria-label', 'More navigation');
        toggle.addEventListener('click', () => {
            drawer.hidden = !drawer.hidden; toggle.setAttribute('aria-expanded', String(!drawer.hidden));
            if (!drawer.hidden) drawer.querySelector('button:not(:disabled), a')?.focus();
        });
        pill.insertBefore(toggle, appearance || null); header.appendChild(drawer);
        return header;
    }

    function mount(config) {
        unmount();
        STATE.config = config || STATE.config || {};
        if (STATE.config.HeaderEnabled === false) {
            const native = getNativeHeader();
            const control = window.SakuraTeaAppearance?.createControl();
            if (native && control) {
                control.dataset.native = 'true';
                (native.querySelector('.headerRight, .MuiToolbar-root') || native).appendChild(control);
            }
            return null;
        }
        STATE.root = create(STATE.config);
        if (STATE.root) {
            document.body.appendChild(STATE.root);
            scheduleLayout();
        }
        return STATE.root;
    }

    function updateContentTop() {
        if (STATE.root) document.documentElement.style.setProperty('--sakura-tea-content-top',
            Math.ceil(STATE.root.getBoundingClientRect().bottom + 20) + 'px');
    }

    window.addEventListener('resize', scheduleLayout);
    document.addEventListener('pointerdown', event => { if (STATE.root && !STATE.root.contains(event.target)) closeOverflow(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverflow(true); });

    function sync() {
        if (!STATE.root || !STATE.root.isConnected) {
            if (STATE.config?.HeaderEnabled === false && !document.querySelector('.sakuraTeaAppearance[data-native="true"]')) mount(STATE.config);
            return;
        }
        updateContentTop();

        if (STATE.sourceBindings.some((record) => !record.source.isConnected)) {
            mount(STATE.config);
            return;
        }

        const sources = collectSources();
        const sourceMap = buildSourceMap(sources);
        if (STATE.missing.some(id => sourceMap.has(id)) || STATE.sourceBindings.some(record => sourceMap.get(record.proxy.dataset.itemId) !== record.source)) {
            mount(STATE.config); return;
        }

        STATE.sourceBindings.forEach((record) => {
            record.proxy.classList.toggle('is-active', sourceIsActive(record.source));
            record.proxy.disabled = record.source.disabled || record.source.getAttribute('aria-disabled') === 'true';
            if (record.proxy.dataset.itemId === 'jellyfin:profile-avatar') {
                const avatar = sourceAvatar(record.source);
                const current = record.proxy.firstElementChild;
                if (avatar && current && (avatar.getAttribute('src') !== current.getAttribute('src') || avatar.textContent !== current.textContent)) {
                    current.replaceWith(avatar);
                }
            }
        });
    }

    function unmount() {
        document.querySelectorAll('.sakuraTeaAppearance[data-native="true"]').forEach(node => node.remove());
        STATE.brandRequest += 1;
        cancelAnimationFrame(STATE.layoutFrame); STATE.layoutFrame = 0;
        STATE.anchors.forEach((styles, source) => {
            styles.forEach(([name, value, priority]) => value ? source.style.setProperty(name, value, priority) : source.style.removeProperty(name));
        });
        STATE.anchors.clear();
        STATE.layoutItems = [];

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
