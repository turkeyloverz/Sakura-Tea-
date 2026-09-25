(() => {
    'use strict';

    if (window.__sakuraTeaRuntimeLoaded) {
        return;
    }

    window.__sakuraTeaRuntimeLoaded = true;

    const PLUGIN_ID = '3bf6515b-c10a-4307-a3e8-942eaffe900d';
    const ROOT = document.documentElement;
    const STATE = {
        hero: null,
        divider: null,
        decor: null,
        header: null,
        headerSources: [],
        host: null,
        items: [],
        index: 0,
        rotateTimer: 0,
        reconcileTimer: 0,
        generation: 0,
        config: null,
        heroOffset: 0
    };

    function isVisible(element) {
        return Boolean(element && (element.offsetParent !== null || element.getClientRects().length));
    }

    function isHomeRoute() {
        const match = window.location.hash.match(/^#\/(?:home)?(?:\?([^#]*))?$/);
        if (match) {
            const tab = new URLSearchParams(match[1] || '').get('tab');
            return !tab || tab === '0';
        }

        const path = window.location.pathname || '/';
        return path === '/' || /\/home\/?$/.test(path);
    }

    function findHost() {
        if (!isHomeRoute()) {
            return null;
        }

        const modern = Array.from(document.querySelectorAll('#indexPage #homeTab.is-active .sections')).find(isVisible);
        if (modern) {
            return modern;
        }

        return Array.from(document.querySelectorAll('#indexPage .sections, .homePage .sections, .homePage .homeSectionsContainer')).find(isVisible) || null;
    }

    function setHomeClass() {
        ROOT.classList.add('sakura-tea-runtime');
        ROOT.classList.toggle('sakura-tea-home', isHomeRoute());
    }

    async function loadConfig() {
        const client = window.ApiClient;
        if (!client || typeof client.getPluginConfiguration !== 'function') {
            return {
                ThemeEnabled: true,
                HeroEnabled: true,
                PetalsEnabled: true,
                AnimeLibraryName: 'Anime',
                HeroSlides: 10,
                HeroRotationSeconds: 9
            };
        }

        try {
            const config = await client.getPluginConfiguration(PLUGIN_ID);
            return Object.assign({
                ThemeEnabled: true,
                HeroEnabled: true,
                PetalsEnabled: true,
                AnimeLibraryName: 'Anime',
                HeroSlides: 10,
                HeroRotationSeconds: 9
            }, config || {});
        } catch (error) {
            console.warn('[Sakura Tea] Could not load plugin configuration.', error);
            return {
                ThemeEnabled: true,
                HeroEnabled: true,
                PetalsEnabled: true,
                AnimeLibraryName: 'Anime',
                HeroSlides: 10,
                HeroRotationSeconds: 9
            };
        }
    }

    async function loadAnimeItems(config) {
        const client = window.ApiClient;
        if (!client || typeof client.getItems !== 'function') {
            return [];
        }

        const userId = client.getCurrentUserId();
        let views = [];

        try {
            const result = await client.ajax({
                type: 'GET',
                url: client.getUrl('Users/' + encodeURIComponent(userId) + '/Views'),
                dataType: 'json'
            });
            views = result && result.Items ? result.Items : [];
        } catch (error) {
            console.warn('[Sakura Tea] Could not load user views.', error);
        }

        const wantedName = String(config.AnimeLibraryName || 'Anime').trim().toLowerCase();
        const library = views.find((view) => String(view.Name || '').trim().toLowerCase() === wantedName);

        if (!library) {
            console.warn('[Sakura Tea] Library not found:', config.AnimeLibraryName || 'Anime');
            return [];
        }

        try {
            const result = await client.getItems(userId, {
                ParentId: library.Id,
                IncludeItemTypes: 'Series',
                Recursive: true,
                SortBy: 'Random',
                EnableTotalRecordCount: false,
                Limit: Math.max(16, Number(config.HeroSlides || 10) * 2),
                Fields: 'Overview,Genres,ProductionYear,PremiereDate,CommunityRating,UserData,ImageTags,BackdropImageTags,MediaType'
            });

            const items = (result && result.Items ? result.Items : [])
                .filter((item) => item && item.Id && item.BackdropImageTags && item.BackdropImageTags.length);

            for (let index = items.length - 1; index > 0; index -= 1) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                const value = items[index];
                items[index] = items[randomIndex];
                items[randomIndex] = value;
            }

            return items.slice(0, Math.max(1, Number(config.HeroSlides || 10)));
        } catch (error) {
            console.warn('[Sakura Tea] Could not load Anime hero items.', error);
            return [];
        }
    }

    function imageUrl(item, type, width) {
        const client = window.ApiClient;
        if (!client || typeof client.getImageUrl !== 'function' || !item || !item.Id) {
            return '';
        }

        if (type === 'Backdrop') {
            const tag = item.BackdropImageTags && item.BackdropImageTags[0];
            if (!tag) {
                return '';
            }

            return client.getImageUrl(item.Id, {
                type: 'Backdrop',
                index: 0,
                tag: tag,
                maxWidth: width || 1920,
                quality: 92
            });
        }

        if (type === 'Logo') {
            const tag = item.ImageTags && item.ImageTags.Logo;
            if (!tag) {
                return '';
            }

            return client.getImageUrl(item.Id, {
                type: 'Logo',
                tag: tag,
                maxWidth: width || 900,
                quality: 92
            });
        }

        return '';
    }

    function actionAttributes(button, item, action) {
        const client = window.ApiClient;
        const serverId = item.ServerId || (client && typeof client.serverId === 'function' ? client.serverId() : '');

        button.classList.add('itemAction');
        button.dataset.action = action;
        button.dataset.id = item.Id || '';
        button.dataset.isfolder = String(Boolean(item.IsFolder));
        button.dataset.mediatype = item.MediaType || 'Video';
        button.dataset.type = item.Type || 'Series';

        if (serverId) {
            button.dataset.serverid = serverId;
        }
    }

    function getNativeHeader() {
        return document.querySelector('header.MuiAppBar-root') || document.querySelector('.skinHeader');
    }

    function sourceLabel(source) {
        const foreground = source.querySelector('.emby-button-foreground');
        if (foreground && foreground.textContent.trim()) {
            return foreground.textContent.trim();
        }

        const clone = source.cloneNode(true);
        clone.querySelectorAll('svg, img, .material-icons, .MuiSvgIcon-root, .MuiTouchRipple-root, [aria-hidden="true"]').forEach((node) => node.remove());
        const text = clone.textContent.replace(/\\s+/g, ' ').trim();
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
                if (target.includes('?')) {
                    return current === target || current.startsWith(target + '&');
                }
                return current === target;
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

    function sourceCatalogId(source) {
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
        const label = sourceLabel(source);
        return label ? 'text' : 'icon';
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

    function publishHeaderCatalog(result) {
        const descriptors = [];
        const seen = new Set();

        [
            ...(result.nav || []).map((source) => ({ source, group: 'nav' })),
            ...(result.actions || []).map((source) => ({ source, group: 'action' }))
        ].forEach((entry) => {
            const id = sourceCatalogId(entry.source);
            if (!id || seen.has(id)) {
                return;
            }

            seen.add(id);
            descriptors.push({
                id,
                label: sourceLabel(entry.source) || entry.source.getAttribute('aria-label') || entry.source.getAttribute('title') || id,
                group: entry.group,
                shape: sourceShape(entry.source),
                iconHtml: sourceIconMarkup(entry.source)
            });
        });

        const payload = {
            version: 1,
            updatedAt: Date.now(),
            items: descriptors
        };

        window.__sakuraTeaHeaderCatalog = payload;
        try {
            window.sessionStorage.setItem('sakuraTeaHeaderCatalog', JSON.stringify(payload));
        } catch (error) {}

        try {
            window.dispatchEvent(new CustomEvent('sakura-tea:header-catalog-changed', { detail: payload }));
        } catch (error) {}
    }

    function collectHeaderSources() {
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
                nav = Array.from(stack.querySelectorAll('a[href], button')).filter((source) => !sourceIsHidden(source));
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
                .slice(0, 6);
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
                .slice(0, 6);
        }

        const result = { nav: nav.slice(0, 6), actions: actions.slice(0, 6) };
        publishHeaderCatalog(result);
        return result;
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

        STATE.headerSources.push({ proxy: button, source: source });
        return button;
    }

    function createFloatingHeader() {
        const sources = collectHeaderSources();
        if (!sources.nav.length && !sources.actions.length) {
            return null;
        }

        STATE.headerSources = [];

        const header = document.createElement('div');
        header.id = 'sakuraTeaFloatingHeader';

        const navPill = document.createElement('div');
        navPill.className = 'sakuraTeaHeaderPill sakuraTeaNavPill';

        const flower = document.createElement('span');
        flower.className = 'sakuraTeaHeaderFlower';
        flower.setAttribute('aria-hidden', 'true');
        navPill.appendChild(flower);

        sources.nav.forEach((source) => {
            navPill.appendChild(makeProxyButton(source, true));
        });

        header.appendChild(navPill);

        if (sources.actions.length) {
            const actionPill = document.createElement('div');
            actionPill.className = 'sakuraTeaHeaderPill sakuraTeaActionPill';

            sources.actions.forEach((source) => {
                actionPill.appendChild(makeProxyButton(source, false));
            });

            header.appendChild(actionPill);
        }

        return header;
    }

    function syncFloatingHeader() {
        if (!STATE.header || !STATE.header.isConnected) {
            return;
        }

        if (STATE.headerSources.some((record) => !record.source.isConnected)) {
            STATE.header.remove();
            STATE.header = createFloatingHeader();
            if (STATE.header) {
                document.body.appendChild(STATE.header);
            }
            return;
        }

        STATE.headerSources.forEach((record) => {
            record.proxy.classList.toggle('is-active', sourceIsActive(record.source));
        });
    }

    function createHero() {
        const hero = document.createElement('section');
        hero.id = 'sakuraTeaHero';
        hero.setAttribute('aria-label', 'Sakura Tea featured Anime');
        hero.innerHTML =
            '<img class="sakuraTeaHeroBackdrop" alt="">' +
            '<div class="sakuraTeaHeroVignette"></div>' +
            '<div class="sakuraTeaHeroContent">' +
                '<div class="sakuraTeaHeroStack">' +
                    '<img class="sakuraTeaHeroLogo" alt="">' +
                    '<h1 class="sakuraTeaHeroTitle"></h1>' +
                    '<div class="sakuraTeaHeroMeta"></div>' +
                    '<p class="sakuraTeaHeroDescription"></p>' +
                    '<div class="sakuraTeaHeroActions">' +
                        '<button type="button" class="sakuraTeaHeroButton sakuraTeaHeroButtonPrimary"><span>▶</span><span>Play</span></button>' +
                        '<button type="button" class="sakuraTeaHeroButton sakuraTeaHeroButtonSecondary"><span>ⓘ</span><span>More info</span></button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        return hero;
    }

    function createDivider() {
        const divider = document.createElement('div');
        divider.id = 'sakuraTeaDivider';
        divider.className = 'sakuraTeaPetalDivider';

        const line = document.createElement('div');
        line.className = 'sakuraTeaPetalLine';
        divider.appendChild(line);

        const linePetals = [
            [8,45,-24,1.15,-0.2],[13,58,50,.78,-.7],[19,38,79,1,-1.5],[25,56,-17,.78,-2.1],
            [31,41,32,1.2,-1.1],[37,59,66,1,-2.9],[43,39,-36,.76,-.4],[48,57,46,1,-2],
            [53,39,80,1.2,-1.4],[59,57,-20,.75,-3],[65,41,31,1,-.9],[71,58,69,1.18,-2.5],
            [77,39,-40,.75,-1.6],[83,56,48,1,-3.3],[89,41,84,1.16,-.3],[94,53,-20,.76,-2.2]
        ];

        linePetals.forEach((data, index) => {
            const petal = document.createElement('span');
            petal.className = 'sakuraTeaLinePetal';
            petal.style.setProperty('--x', data[0] + '%');
            petal.style.setProperty('--y', data[1] + '%');
            petal.style.setProperty('--r', data[2] + 'deg');
            petal.style.setProperty('--s', data[3]);
            petal.style.setProperty('--d', data[4] + 's');
            petal.style.setProperty('--t', (5.2 + (index % 4) * .7) + 's');
            divider.appendChild(petal);
        });

        [[16,8,9,-1],[34,69,11,-2],[69,7,10,-4],[87,66,12,-1.3]].forEach((data) => {
            const flower = document.createElement('span');
            flower.className = 'sakuraTeaLineFlower';
            flower.textContent = '✿';
            flower.style.setProperty('--x', data[0] + '%');
            flower.style.setProperty('--y', data[1] + '%');
            flower.style.setProperty('--fs', data[2] + 'px');
            flower.style.setProperty('--d', data[3] + 's');
            divider.appendChild(flower);
        });

        return divider;
    }

    function createHomeDecor() {
        const decor = document.createElement('div');
        decor.id = 'sakuraTeaHomeDecor';

        const petals = [
            [5,3,22,1.2,-.4,.42],[14,8,-34,.75,-2,.32],[23,5,61,1,-4,.38],[34,12,15,1,-1.1,.36],
            [43,4,-28,.72,-3,.30],[55,10,75,1.25,-1.8,.43],[66,5,-16,1,-4.6,.36],[77,12,43,.72,-.9,.31],
            [91,5,-40,1,-2.7,.38],[8,25,57,.72,-1.4,.32],[18,31,-22,1,-3.6,.36],[30,27,69,1.3,-.7,.44],
            [41,36,-31,1,-2.9,.38],[53,29,33,.72,-1.9,.31],[64,37,81,1.25,-3.1,.43],[76,26,-17,1,-2.3,.36],
            [91,33,48,.72,-.5,.30],[12,49,-32,1,-2.2,.35],[29,55,71,1.25,-4.2,.43],[47,48,24,.72,-1,.30],
            [65,58,-40,1,-3.4,.38],[88,51,55,1.2,-1.7,.41],[7,70,31,.75,-2.8,.31],[22,78,-48,1,-1.2,.36],
            [39,68,76,1.2,-3.8,.42],[58,82,-16,.78,-.6,.32],[74,72,35,1,-2.4,.37],[93,86,63,1.15,-4.4,.40]
        ];

        petals.forEach((data, index) => {
            const petal = document.createElement('span');
            petal.className = 'sakuraTeaBgPetal';
            petal.style.setProperty('--x', data[0] + '%');
            petal.style.setProperty('--y', data[1] + '%');
            petal.style.setProperty('--r', data[2] + 'deg');
            petal.style.setProperty('--s', data[3]);
            petal.style.setProperty('--d', data[4] + 's');
            petal.style.setProperty('--o', data[5]);
            petal.style.setProperty('--t', (7.4 + (index % 6) * .75) + 's');
            decor.appendChild(petal);
        });

        [
            [10,7,10,-.5,.42],[38,9,14,-2.3,.50],[86,7,20,-4,.53],[7,29,14,-3,.47],
            [35,33,10,-1.3,.40],[82,29,20,-4.6,.52],[19,52,14,-2,.47],[70,54,10,-.8,.39],
            [48,74,18,-3.2,.50],[89,78,12,-1.7,.44]
        ].forEach((data) => {
            const flower = document.createElement('span');
            flower.className = 'sakuraTeaBgFlower';
            flower.textContent = '✿';
            flower.style.setProperty('--x', data[0] + '%');
            flower.style.setProperty('--y', data[1] + '%');
            flower.style.setProperty('--fs', data[2] + 'px');
            flower.style.setProperty('--d', data[3] + 's');
            flower.style.setProperty('--o', data[4]);
            decor.appendChild(flower);
        });

        return decor;
    }

    function metaPart(text, className) {
        if (!text) {
            return null;
        }

        const span = document.createElement('span');
        span.textContent = text;
        if (className) {
            span.className = className;
        }
        return span;
    }

    function renderItem(item) {
        const hero = STATE.hero;
        if (!hero || !item) {
            return;
        }

        hero.dataset.switching = 'true';

        const backdrop = hero.querySelector('.sakuraTeaHeroBackdrop');
        const logo = hero.querySelector('.sakuraTeaHeroLogo');
        const title = hero.querySelector('.sakuraTeaHeroTitle');
        const meta = hero.querySelector('.sakuraTeaHeroMeta');
        const description = hero.querySelector('.sakuraTeaHeroDescription');
        const play = hero.querySelector('.sakuraTeaHeroButtonPrimary');
        const info = hero.querySelector('.sakuraTeaHeroButtonSecondary');

        const nextBackdrop = imageUrl(item, 'Backdrop', 1920);
        const nextLogo = imageUrl(item, 'Logo', 900);

        const preloader = new Image();
        preloader.onload = () => {
            if (STATE.hero !== hero) {
                return;
            }

            backdrop.src = nextBackdrop;
            backdrop.alt = item.Name ? item.Name + ' backdrop' : 'Anime backdrop';

            if (nextLogo) {
                logo.src = nextLogo;
                logo.alt = item.Name || '';
                logo.hidden = false;
                title.hidden = true;
            } else {
                logo.removeAttribute('src');
                logo.alt = '';
                logo.hidden = true;
                title.hidden = false;
                title.textContent = item.Name || '';
            }

            meta.replaceChildren();

            const rating = Number(item.CommunityRating || 0);
            if (rating > 0) {
                meta.appendChild(metaPart('★ ' + rating.toFixed(1), 'sakuraTeaHeroRating'));
            }

            if (item.ProductionYear) {
                meta.appendChild(metaPart(String(item.ProductionYear)));
            }

            meta.appendChild(metaPart(item.Type === 'Series' ? 'TV Show' : (item.Type || '')));

            (item.Genres || []).slice(0, 2).forEach((genre) => {
                meta.appendChild(metaPart(genre));
            });

            description.textContent = item.Overview || '';

            actionAttributes(play, item, 'play');
            actionAttributes(info, item, 'link');

            requestAnimationFrame(() => {
                hero.dataset.switching = 'false';
            });
        };

        preloader.onerror = () => {
            hero.dataset.switching = 'false';
        };

        preloader.src = nextBackdrop;
    }

    function alignHeroToTop() {
        const hero = STATE.hero;
        if (!hero || !hero.isConnected) {
            return;
        }

        const previousOffset = Number(STATE.heroOffset || 0);
        const measuredTop = hero.getBoundingClientRect().top + previousOffset;
        const offset = Math.max(0, Math.min(180, Math.round(measuredTop)));

        STATE.heroOffset = offset;
        hero.style.setProperty('--sakura-tea-hero-offset', offset + 'px');
    }

    function stopRotation() {
        if (STATE.rotateTimer) {
            window.clearInterval(STATE.rotateTimer);
            STATE.rotateTimer = 0;
        }
    }

    function startRotation() {
        stopRotation();

        if (STATE.items.length <= 1) {
            return;
        }

        const seconds = Math.max(4, Number((STATE.config && STATE.config.HeroRotationSeconds) || 9));
        STATE.rotateTimer = window.setInterval(() => {
            STATE.index = (STATE.index + 1) % STATE.items.length;
            renderItem(STATE.items[STATE.index]);
        }, seconds * 1000);
    }

    function removeMount() {
        stopRotation();

        if (STATE.hero) {
            STATE.hero.remove();
        }

        if (STATE.divider) {
            STATE.divider.remove();
        }

        if (STATE.decor) {
            STATE.decor.remove();
        }

        if (STATE.header) {
            STATE.header.remove();
        }

        STATE.hero = null;
        STATE.divider = null;
        STATE.decor = null;
        STATE.header = null;
        STATE.headerSources = [];
        STATE.host = null;
        STATE.items = [];
        STATE.index = 0;
        STATE.heroOffset = 0;
    }

    async function mount(host) {
        const generation = ++STATE.generation;
        const config = await loadConfig();

        if (generation !== STATE.generation || !isHomeRoute() || !isVisible(host)) {
            return;
        }

        STATE.config = config;

        if (config.ThemeEnabled) {
            STATE.header = createFloatingHeader();
            if (STATE.header) {
                document.body.appendChild(STATE.header);
            }
        }

        if (!config.HeroEnabled && !config.PetalsEnabled) {
            return;
        }

        const items = config.HeroEnabled ? await loadAnimeItems(config) : [];

        if (generation !== STATE.generation || !isHomeRoute() || !isVisible(host)) {
            return;
        }

        if (config.HeroEnabled && items.length) {
            STATE.hero = createHero();
            host.parentNode.insertBefore(STATE.hero, host);
            STATE.items = items;
            STATE.index = 0;
            alignHeroToTop();
            requestAnimationFrame(alignHeroToTop);
            window.setTimeout(alignHeroToTop, 120);
            renderItem(items[0]);
            startRotation();
        }

        if (config.PetalsEnabled) {
            STATE.divider = createDivider();
            host.parentNode.insertBefore(STATE.divider, host);

            STATE.decor = createHomeDecor();
            host.insertBefore(STATE.decor, host.firstChild);
        }

        STATE.host = host;
        console.info('[Sakura Tea] Home experience mounted.');
    }

    function reconcile() {
        setHomeClass();

        if (!isHomeRoute() || !window.ApiClient) {
            STATE.generation += 1;
            removeMount();
            return;
        }

        const host = findHost();

        if (!host) {
            return;
        }

        if (STATE.host === host && ((STATE.hero && STATE.hero.isConnected) || (STATE.divider && STATE.divider.isConnected))) {
            syncFloatingHeader();
            return;
        }

        STATE.generation += 1;
        removeMount();
        mount(host);
    }

    function scheduleReconcile() {
        setHomeClass();
        syncFloatingHeader();

        if (STATE.reconcileTimer) {
            return;
        }

        STATE.reconcileTimer = window.setTimeout(() => {
            STATE.reconcileTimer = 0;
            reconcile();
        }, 80);
    }

    setHomeClass();
    scheduleReconcile();

    window.addEventListener('hashchange', scheduleReconcile);
    window.addEventListener('popstate', scheduleReconcile);
    window.addEventListener('pageshow', scheduleReconcile);
    document.addEventListener('viewshow', scheduleReconcile);

    new MutationObserver(scheduleReconcile).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
