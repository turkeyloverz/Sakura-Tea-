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
        host: null,
        pendingHost: null,
        renderGeneration: 0,
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

        // A non-home SPA hash takes precedence over the server's root path.
        if (window.location.hash && window.location.hash !== '#') {
            return false;
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
        ROOT.classList.toggle('sakura-tea-home', isHomeRoute() && Boolean(STATE.config && STATE.config.ThemeEnabled));
    }

    async function loadConfig() {
        const client = window.ApiClient;
        // The public visual-settings endpoint works for non-admin viewers too.
        const config = typeof client.ajax === 'function'
            ? await client.ajax({ type: 'GET', url: client.getUrl('SakuraTea/Settings'), dataType: 'json' })
            : await client.getPluginConfiguration(PLUGIN_ID);
        return Object.fromEntries(Object.entries(config || {}).map(([key, value]) => [key.charAt(0).toUpperCase() + key.slice(1), value]));
    }

    function bounded(value, minimum, maximum, fallback) {
        const number = Number(value);
        return value == null || !Number.isFinite(number) ? fallback : Math.max(minimum, Math.min(maximum, number));
    }

    function applyVisualSettings(config) {
        const styles = {
            'sakura-tea-theme.css': config.ThemeEnabled,
            'sakura-tea-hero.css': config.HeroEnabled,
            'sakura-tea-petals.css': config.PetalsEnabled
        };
        document.querySelectorAll('link[data-sakura-tea-asset]').forEach((link) => {
            const name = link.getAttribute('data-sakura-tea-asset');
            if (name in styles) link.disabled = styles[name] === false;
        });
        setHomeClass();
    }

    function applyHeroSettings(hero, config) {
        const values = {
            '--sakura-hero-height': bounded(config.BuilderHeroHeight, 60, 90, 76) + 'vh',
            '--sakura-title-scale': bounded(config.BuilderHeroTitleSize, 70, 125, 100) / 100,
            '--sakura-button-scale': bounded(config.BuilderHeroButtonSize, 70, 115, 90) / 100,
            '--sakura-backdrop-darkness': bounded(config.BuilderBackdropDarkness, 15, 80, 48) / 100
        };
        Object.entries(values).forEach(([name, value]) => hero.style.setProperty(name, value));
    }

    function applyEffectSettings(element, config) {
        let density = bounded(config.BuilderPetalDensity, 0, 100, 55);
        if (config.BuilderPerformanceMode === 'Performance') density = Math.min(density, 28);
        const speed = bounded(config.BuilderAnimationSpeed, 0, 140, 100);
        const particles = element.querySelectorAll('.sakuraTeaLinePetal');
        const count = Math.round(particles.length * density / 100);
        particles.forEach((particle, index) => {
            particle.hidden = index >= count;
            particle.style.setProperty('--x', (4 + 92 * (index + .5) / Math.max(1, count)) + '%');
            const duration = parseFloat(particle.style.getPropertyValue('--t')) || 7;
            particle.style.animationDuration = (duration * 100 / (speed || 100)) + 's';
            particle.style.animationPlayState = !speed || document.hidden ? 'paused' : 'running';
        });
        // End flowers remain visible even at zero petal density.
        element.querySelectorAll('.sakuraTeaLineFlower').forEach((flower) => {
            flower.style.animationDuration = (36 * 100 / (speed || 100)) + 's';
            flower.style.animationPlayState = !speed || document.hidden ? 'paused' : 'running';
        });
    }

    function refreshSettings() {
        STATE.generation += 1;
        removeMount();
        scheduleReconcile();
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
        divider.setAttribute('aria-hidden', 'true');

        const line = document.createElement('div');
        line.className = 'sakuraTeaPetalLine';
        divider.appendChild(line);

        // More petals, with positions redistributed across the whole line at any density.
        for (let index = 0; index < 64; index += 1) {
            const petal = document.createElement('span');
            petal.className = 'sakuraTeaLinePetal';
            petal.style.setProperty('--x', (4 + 92 * (index + .5) / 64) + '%');
            petal.style.setProperty('--y', (35 + (index * 7 % 30)) + '%');
            petal.style.setProperty('--r', (-55 + index * 47 % 130) + 'deg');
            petal.style.setProperty('--s', .65 + (index % 5) * .12);
            petal.style.setProperty('--d', (-index * .63) + 's');
            petal.style.setProperty('--t', (5.2 + (index % 4) * .7) + 's');
            divider.appendChild(petal);
        }

        ['left', 'right'].forEach((side) => {
            const flower = document.createElement('span');
            flower.className = 'sakuraTeaLineFlower';
            flower.dataset.side = side;
            // Five notched petals make the blossom recognizable without a remote image.
            flower.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">'
                + Array.from({ length: 5 }, (_, index) => '<path transform="rotate(' + index * 72 + ' 32 32)" d="M32 32 C18 24 17 12 25 5 L32 10 L39 5 C47 12 46 24 32 32Z" fill="#ffc4da" stroke="#fff0f5" stroke-width="1.2"/>').join('')
                + '<circle cx="32" cy="32" r="5" fill="#fff0d9"/></svg>';
            divider.appendChild(flower);
        });

        return divider;
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

        const renderGeneration = ++STATE.renderGeneration;
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
            if (STATE.hero !== hero || renderGeneration !== STATE.renderGeneration) {
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
                if (STATE.hero === hero && renderGeneration === STATE.renderGeneration) {
                    hero.dataset.switching = 'false';
                }
            });
        };

        preloader.onerror = () => {
            if (STATE.hero === hero && renderGeneration === STATE.renderGeneration) {
                hero.dataset.switching = 'false';
            }
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

        if (document.hidden || !STATE.hero || STATE.items.length <= 1) {
            return;
        }

        const seconds = bounded(STATE.config && STATE.config.HeroRotationSeconds, 3, 60, 9);
        STATE.rotateTimer = window.setInterval(() => {
            STATE.index = (STATE.index + 1) % STATE.items.length;
            renderItem(STATE.items[STATE.index]);
        }, seconds * 1000);
    }

    function removeMount(keepHeader = false) {
        stopRotation();
        STATE.pendingHost = null;
        STATE.renderGeneration += 1;

        if (STATE.hero) {
            STATE.hero.remove();
        }

        if (STATE.divider) {
            STATE.divider.remove();
        }

        if (!keepHeader && window.SakuraTeaHeaderRuntime) {
            window.SakuraTeaHeaderRuntime.unmount();
        }

        STATE.hero = null;
        STATE.divider = null;
        STATE.host = null;
        STATE.items = [];
        STATE.index = 0;
        STATE.heroOffset = 0;
    }

    async function mount(host) {
        const generation = ++STATE.generation;
        STATE.pendingHost = host;
        try {
            await mountExperience(host, generation);
        } catch (error) {
            if (generation === STATE.generation) {
                removeMount();
                STATE.config = null;
                setHomeClass();
            }
            console.warn('[Sakura Tea] Could not mount home experience.', error);
        } finally {
            if (generation === STATE.generation) {
                STATE.pendingHost = null;
            }
        }
    }

    async function mountExperience(host, generation) {
        const config = await loadConfig();

        if (generation !== STATE.generation || !isHomeRoute() || !isVisible(host)) {
            return;
        }

        STATE.config = config;
        applyVisualSettings(config);

        if (config.ThemeEnabled && window.SakuraTeaHeaderRuntime && !document.getElementById('sakuraTeaFloatingHeader')) {
            window.SakuraTeaHeaderRuntime.mount(config);
        }

        if (window.SakuraTeaAppearance?.enabled === false || (!config.HeroEnabled && !config.PetalsEnabled)) {
            STATE.host = host;
            return;
        }

        const items = config.HeroEnabled ? await loadAnimeItems(config) : [];

        if (generation !== STATE.generation || !isHomeRoute() || !isVisible(host)) {
            return;
        }

        if (config.HeroEnabled && items.length) {
            STATE.hero = createHero();
            applyHeroSettings(STATE.hero, config);
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
            applyEffectSettings(STATE.divider, config);
            host.parentNode.insertBefore(STATE.divider, host);

        }

        STATE.host = host;
        console.info('[Sakura Tea] Home experience mounted.');
    }

    function reconcile() {
        if (window.SakuraTeaAppearance?.sync()) {
            STATE.generation += 1;
            removeMount();
            STATE.config = null;
        }
        setHomeClass();

        if (!isHomeRoute() || !window.ApiClient) {
            STATE.generation += 1;
            removeMount();
            return;
        }

        const host = findHost();

        if (!host) {
            STATE.generation += 1;
            removeMount();
            return;
        }

        // Keep one in-flight mount per host while API requests are pending.
        if (STATE.pendingHost === host) {
            return;
        }

        if (STATE.host === host
            && (!STATE.hero || STATE.hero.isConnected)
            && (!STATE.divider || STATE.divider.isConnected)) {
            if (window.SakuraTeaHeaderRuntime) {
                window.SakuraTeaHeaderRuntime.sync();
            }
            return;
        }

        STATE.generation += 1;
        removeMount();
        mount(host);
    }

    function scheduleReconcile() {
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

    window.addEventListener('sakura-tea:settings-changed', refreshSettings);
    window.addEventListener('sakura-tea:appearance-changed', () => {
        STATE.generation += 1;
        // Preserve the focused slider while cancelling any pending hero request.
        removeMount(true);
        const host = findHost();
        if (host) mount(host);
        else scheduleReconcile();
    });
    window.addEventListener('hashchange', scheduleReconcile);
    window.addEventListener('popstate', scheduleReconcile);
    window.addEventListener('pageshow', scheduleReconcile);
    document.addEventListener('viewshow', scheduleReconcile);
    document.addEventListener('visibilitychange', () => {
        [STATE.divider].filter(Boolean).forEach((element) => applyEffectSettings(element, STATE.config || {}));
        if (document.hidden) {
            stopRotation();
        } else {
            startRotation();
            scheduleReconcile();
        }
    });

    new MutationObserver(scheduleReconcile).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
