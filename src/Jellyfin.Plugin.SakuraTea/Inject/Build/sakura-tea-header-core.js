(() => {
    'use strict';

    if (window.SakuraTeaHeaderCore) {
        return;
    }

    const DEFAULT_HEADER_ITEMS = Object.freeze([
        'sakura:flower',
        'header:split',
        'jellyfin:favorites',
        'sakura:anime',
        'sakura:not-safe',
        'header:split',
        'jellyfin:user-menu',
        'jellyfin:cast',
        'jellyfin:profile-avatar'
    ]);

    const STATIC_CATALOG = Object.freeze([
        { id: 'sakura:flower', label: 'Sakura Flower', icon: '🌸', shape: 'flower' },
        { id: 'header:split', label: 'Pill Split', icon: '↔', shape: 'split', repeatable: true },
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

    const REPEATABLE = new Set(['space', 'separator', 'header:split']);
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
            if (!id) {
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

        if (!result.includes('sakura:flower')) {
            result.unshift('sakura:flower');
        }

        if (!result.includes('header:split')) {
            const utilityIds = new Set([
                'jellyfin:search',
                'jellyfin:cast',
                'jellyfin:syncplay',
                'jellyfin:user-menu',
                'jellyfin:profile-avatar',
                'jellyfin:home',
                'jellyfin:more',
                'jellyfin:audio-player'
            ]);
            let splitIndex = result.findIndex((id) => utilityIds.has(id));
            if (splitIndex < 0) {
                splitIndex = result.length;
            }
            result.splice(splitIndex, 0, 'header:split');
        }

        return result;
    }

    function splitOrder(value) {
        const order = normalizeOrder(value);
        const splitIndex = order.indexOf('header:split');

        if (splitIndex < 0) {
            return { order, hasSplit: false, left: order.slice(), right: [] };
        }

        return {
            order,
            hasSplit: true,
            left: order.slice(0, splitIndex),
            right: order.slice(splitIndex + 1)
        };
    }

    function groupOrder(value) {
        const order = normalizeOrder(value);
        const groups = [[]];
        const splitIndices = [];

        order.forEach((id, index) => {
            if (id === 'header:split') {
                splitIndices.push(index);
                groups.push([]);
                return;
            }

            groups[groups.length - 1].push({ id, index });
        });

        return {
            order,
            hasSplit: splitIndices.length > 0,
            groups,
            splitIndices
        };
    }

    function mergeCatalog(runtimeItems) {
        const map = new Map();
        STATIC_CATALOG.forEach((item) => map.set(item.id, { ...item }));

        (Array.isArray(runtimeItems) ? runtimeItems : []).forEach((item) => {
            if (!item || !item.id) {
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

    function readPublishedCatalog() {
        if (window.__sakuraTeaHeaderCatalog && Array.isArray(window.__sakuraTeaHeaderCatalog.items)) {
            return window.__sakuraTeaHeaderCatalog;
        }

        try {
            const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
                return parsed;
            }
        } catch (error) {}

        return { version: 2, updatedAt: 0, items: [] };
    }

    function publishCatalog(items) {
        const payload = {
            version: 2,
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
