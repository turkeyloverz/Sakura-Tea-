(() => {
    'use strict';

    const CORE_VERSION = 7;
    if (window.SakuraTeaHeaderCore && Number(window.SakuraTeaHeaderCore.version || 0) >= CORE_VERSION) {
        return;
    }

    const DEFAULT_HEADER_ITEMS = Object.freeze([
        'jellyfin:profile-avatar', 'sakura:anime', 'jellyfin:favorites'
    ]);

    const STATIC_CATALOG = Object.freeze([
        { id: 'space', label: 'Space', icon: '□', shape: 'space', repeatable: true },
        { id: 'separator', label: 'Separator', icon: '│', shape: 'separator', repeatable: true },
        { id: 'jellyfin:favorites', label: 'Favourites', icon: '♥', shape: 'text' },
        { id: 'sakura:anime', label: 'Anime', icon: '▶', shape: 'text' },
        { id: 'sakura:not-safe', label: 'Not Safe', icon: '◈', shape: 'text' },
        { id: 'jellyfin:search', label: 'Search', icon: '⌕', shape: 'icon' },
        { id: 'jellyfin:cast', label: 'Cast', icon: '▣', shape: 'icon' },
        { id: 'jellyfin:syncplay', label: 'SyncPlay', icon: '↻', shape: 'icon' },
        { id: 'jellyfin:user-menu', label: 'User Menu', icon: '▦', shape: 'icon' },
        { id: 'jellyfin:profile-avatar', label: 'Profile Avatar', icon: '●', shape: 'avatar' },
        { id: 'jellyfin:home', label: 'Home', icon: '⌂', shape: 'icon' },
        { id: 'jellyfin:more', label: 'More', icon: '•••', shape: 'icon' },
        { id: 'je:active-streams', label: 'Active Streams', icon: '▶', shape: 'text' },
        { id: 'je:bookmarks', label: 'Bookmarks', icon: '♥', shape: 'text' },
        { id: 'je:hidden-content', label: 'Hidden Content', icon: '◈', shape: 'text' },
        { id: 'sf:requests', label: 'SeerrFin Requests', icon: '＋', shape: 'text' },
        { id: 'sf:letterboxd', label: 'Letterboxd', icon: '●', shape: 'text' },
        { id: 'jellyfin:back', label: 'Back', icon: '←', shape: 'icon' },
        { id: 'je:random', label: 'Random', icon: '⤨', shape: 'icon' },
        { id: 'je:activity', label: 'Activity', icon: '▥', shape: 'icon' },
        { id: 'je:requests', label: 'Requests', icon: '☷', shape: 'icon' },
        { id: 'je:calendar', label: 'Calendar', icon: '▣', shape: 'icon' },
        { id: 'sf:movies', label: 'Movies', icon: '▤', shape: 'text' },
        { id: 'sf:tv', label: 'TV Shows', icon: '▭', shape: 'text' },
        { id: 'je:recommendations', label: 'Recommendations', icon: '★', shape: 'text' },
        { id: 'jellyfin:audio-player', label: 'Audio Player', icon: '♫', shape: 'icon' }
    ]);

    const LEGACY_IDS = Object.freeze({
        'Sakura Flower': 'sakura:flower',
        'Flower': 'sakura:flower',
        'Split': 'header:split',
        'Space': 'space',
        'Separator': 'separator',
        'Favourites': 'jellyfin:favorites',
        'Favorites': 'jellyfin:favorites',
        'Anime': 'sakura:anime',
        'Not Safe': 'sakura:not-safe',
        'Search': 'jellyfin:search',
        'Cast': 'jellyfin:cast',
        'SyncPlay': 'jellyfin:syncplay',
        'User Menu': 'jellyfin:user-menu',
        'Profile': 'jellyfin:profile-avatar',
        'Profile Avatar': 'jellyfin:profile-avatar',
        'jellyfin:profile': 'jellyfin:profile-avatar',
        'Home': 'jellyfin:home',
        'More': 'jellyfin:more',
        'Random': 'je:random',
        'Activity': 'je:activity',
        'Requests': 'je:requests',
        'Calendar': 'je:calendar',
        'Movies': 'sf:movies',
        'TV Shows': 'sf:tv',
        'Recommendations': 'je:recommendations',
        'Audio Player': 'jellyfin:audio-player'
    });

    const REPEATABLE = new Set(['space', 'separator']);
    const STORAGE_KEY = 'sakuraTeaHeaderCatalog';

    function normalizeItemId(value) {
        const raw = String(value || '').trim();
        return LEGACY_IDS[raw] || raw;
    }

    function normalizeOrder(value) {
        const source = Array.isArray(value) ? value : String(value || '').split('|');
        const seen = new Set();
        const result = [];

        source.forEach((entry) => {
            const id = normalizeItemId(entry);
            if (!id || id === 'header:split' || id === 'sakura:flower') {
                return;
            }

            if (!REPEATABLE.has(id)) {
                if (seen.has(id)) {
                    return;
                }
                seen.add(id);
            }

            result.push(id);
        });

        return result;
    }

    function upgradeLegacyOrder(value) {
        const raw = Array.isArray(value) ? value.slice() : String(value || '').split('|');
        const wasLegacy = raw.some((entry) => String(entry || '').trim() === 'jellyfin:profile');
        const result = normalizeOrder(raw);

        if (!wasLegacy) {
            return result;
        }

        return result;
    }

    // Preserve the helper contract for existing consumers while migrating split layouts.
    function splitOrder(value) {
        const order = normalizeOrder(value);
        return { order, hasSplit: false, left: order.slice(), right: [] };
    }

    function groupOrder(value) {
        const order = normalizeOrder(value);
        const entries = order.map((id, index) => ({ id, index }));
        return {
            order,
            hasSplit: false,
            groups: [entries],
            splitIndices: [],
            pillGroups: entries.length ? [{ entries, groupIndex: 0, role: 'left' }] : []
        };
    }

    function mergeCatalog(runtimeItems) {
        const map = new Map();
        STATIC_CATALOG.forEach((item) => map.set(item.id, { ...item }));

        (Array.isArray(runtimeItems) ? runtimeItems : []).forEach((item) => {
            if (!item || !item.id || normalizeItemId(item.id) === 'header:split') {
                return;
            }

            const previous = map.get(item.id) || {};
            map.set(item.id, {
                ...previous,
                ...item,
                repeatable: previous.repeatable === true
            });
        });

        return Array.from(map.values());
    }

    function itemById(catalog, id) {
        return (Array.isArray(catalog) ? catalog : STATIC_CATALOG).find((item) => item.id === id)
            || { id, label: id, icon: '•', shape: 'text' };
    }

    function sanitizeIconElement(element) {
        if (!element) {
            return null;
        }

        element.querySelectorAll('script, style').forEach((node) => node.remove());
        element.removeAttribute('id');
        element.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));

        [element, ...element.querySelectorAll('*')].forEach((node) => {
            Array.from(node.attributes || []).forEach((attribute) => {
                if (/^on/i.test(attribute.name)) {
                    node.removeAttribute(attribute.name);
                }
            });
        });

        if (element.matches('img')) {
            element.removeAttribute('srcset');
        }

        return element;
    }

    function renderVisual(target, item, withLabel) {
        if (!target) {
            return;
        }

        target.replaceChildren();

        if (item && item.iconHtml) {
            try {
                const template = document.createElement('template');
                template.innerHTML = item.iconHtml;
                const visual = sanitizeIconElement(template.content.firstElementChild);
                if (visual) {
                    target.appendChild(visual);
                }
            } catch (error) {}
        }

        if (!target.childNodes.length && item && item.icon) {
            const fallback = document.createElement('span');
            fallback.textContent = item.icon;
            target.appendChild(fallback);
        }

        if (withLabel && item && item.label) {
            const label = document.createElement('span');
            label.textContent = item.label;
            target.appendChild(label);
        }
    }

    // Shared schema keeps the builder preview and live header on the same settings.
    const HEADER_STYLE_FIELDS = Object.freeze([
        { key: 'BuilderHeaderPadding', label: 'Bar padding', group: 'Layout', type: 'range', min: 0, max: 20, value: 4, css: '--st-bar-padding', unit: 'px' },
        { key: 'BuilderBrandDisplay', label: 'Show branding', group: 'Branding', type: 'select', options: ['None', 'Logo', 'ServerName', 'Both'], value: 'Both' },
        { key: 'BuilderLogoHeight', label: 'Logo size', group: 'Branding', type: 'range', min: 16, max: 56, value: 30, css: '--st-logo-height', unit: 'px' },
        { key: 'BuilderHeaderX', label: 'Hotbar · left / middle / right', group: 'Positioning', type: 'range', min: 0, max: 100, value: 50 },
        { key: 'BuilderHeaderY', label: 'Hotbar · top / lower', group: 'Positioning', type: 'range', min: 0, max: 100, value: 0 },
        { key: 'BuilderLogoX', label: 'Server icon · left / middle / right', group: 'Positioning', type: 'range', min: 0, max: 100, value: 0 },
        { key: 'BuilderLogoY', label: 'Server icon · top / lower', group: 'Positioning', type: 'range', min: 0, max: 100, value: 0 },
        { key: 'BuilderNameX', label: 'Server name · left / middle / right', group: 'Positioning', type: 'range', min: 0, max: 100, value: 100 },
        { key: 'BuilderNameY', label: 'Server name · top / lower', group: 'Positioning', type: 'range', min: 0, max: 100, value: 0 },
        { key: 'BuilderBrandColor', label: 'Server name', group: 'Colours', type: 'color', value: '#FFFFFF', css: '--st-brand-color' },
        { key: 'BuilderItemColor', label: 'Button text', group: 'Colours', type: 'color', value: '#FFF8FC', css: '--st-item-color' },
        { key: 'BuilderItemBackground', label: 'Button background', group: 'Colours', type: 'color', value: 'transparent', css: '--st-item-bg' },
        { key: 'BuilderActiveColor', label: 'Selected text', group: 'Colours', type: 'color', value: '#FFFFFF', css: '--st-active-color' },
        { key: 'BuilderActiveBackground', label: 'Selected background', group: 'Colours', type: 'color', value: '#C76D91', css: '--st-active-bg' },
        { key: 'BuilderHoverOpacity', label: 'Hover opacity', group: 'Colours', type: 'range', min: 30, max: 100, value: 100, css: '--st-hover-opacity', divisor: 100 }
    ]);

    function normalizeHeaderStyle(config = {}) {
        return Object.fromEntries(HEADER_STYLE_FIELDS.map(field => {
            let value = config[field.key] ?? (field.key === 'BuilderHeaderX' ? ({Left:0,Center:50,Right:100}[config.BuilderHeaderPosition] ?? field.value) : field.value);
            if (field.type === 'range') value = Number.isFinite(Number(value)) ? Math.max(field.min, Math.min(field.max, Number(value))) : field.value;
            else if (field.options) value = field.options.includes(value) ? value : field.value;
            else if (!/^(transparent|#[0-9a-f]{6})$/i.test(String(value))) value = field.value;
            return [field.key, value];
        }));
    }

    function applyHeaderStyle(element, config) {
        const values = normalizeHeaderStyle(config);
        HEADER_STYLE_FIELDS.forEach(field => {
            if (field.css) element.style.setProperty(field.css, String(field.divisor ? values[field.key] / field.divisor : values[field.key]) + (field.unit || ''));
        });
        return values;
    }

    // Measure once, then place independent elements inside the available width.
    // When chosen positions collide, move the later element below the earlier one.
    function positionHeaderElements(container, entries) {
        const width = container.clientWidth;
        const placed = [];
        const measured = entries.filter(entry => entry.element).map(entry => ({...entry,
            width: entry.element.offsetWidth, height: entry.element.offsetHeight}));
        measured.forEach(entry => {
            const left = Math.max(0, width - entry.width) * entry.x / 100;
            let top = entry.y * 1.2;
            for (let pass = 0; pass < measured.length; pass++) {
                const collisions = placed.filter(box => left < box.left + box.width + 8 && left + entry.width + 8 > box.left && top < box.top + box.height + 8 && top + entry.height + 8 > box.top);
                if (!collisions.length) break;
                top = Math.max(...collisions.map(box => box.top + box.height + 8));
            }
            placed.push({left,top,width:entry.width,height:entry.height});
            entry.element.style.left = Math.round(left) + 'px';
            entry.element.style.top = Math.round(top) + 'px';
        });
        const height = Math.ceil(Math.max(0, ...placed.map(box => box.top + box.height)));
        container.style.height = height + 'px';
        return height;
    }

    function catalogScope() {
        const client = window.ApiClient;
        return JSON.stringify([client?.serverId?.() || client?.getUrl?.('') || '', client?.getCurrentUserId?.() || '']);
    }

    function readPublishedCatalog() {
        if (window.__sakuraTeaHeaderCatalog && window.__sakuraTeaHeaderCatalog.scope === catalogScope() && Array.isArray(window.__sakuraTeaHeaderCatalog.items)) {
            return window.__sakuraTeaHeaderCatalog;
        }

        try {
            const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (parsed && parsed.version === 2 && parsed.scope === catalogScope() && Array.isArray(parsed.items)) {
                return parsed;
            }
        } catch (error) {}

        return { version: 2, updatedAt: 0, items: [] };
    }

    function publishCatalog(items) {
        const payload = {
            version: 2,
            scope: catalogScope(),
            updatedAt: Date.now(),
            items: Array.isArray(items) ? items : []
        };

        window.__sakuraTeaHeaderCatalog = payload;

        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {}

        try {
            window.dispatchEvent(new CustomEvent('sakura-tea:header-catalog-changed', { detail: payload }));
        } catch (error) {}

        return payload;
    }

    window.SakuraTeaHeaderCore = Object.freeze({
        version: CORE_VERSION,
        HEADER_STYLE_FIELDS,
        normalizeHeaderStyle,
        applyHeaderStyle,
        positionHeaderElements,
        DEFAULT_HEADER_ITEMS,
        STATIC_CATALOG,
        normalizeItemId,
        normalizeOrder,
        upgradeLegacyOrder,
        splitOrder,
        groupOrder,
        mergeCatalog,
        itemById,
        renderVisual,
        readPublishedCatalog,
        publishCatalog
    });
})();
