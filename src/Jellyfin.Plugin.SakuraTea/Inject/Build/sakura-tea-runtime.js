(() => {
    'use strict';
    if (window.__sakuraTeaRuntimeLoaded) return;
    window.__sakuraTeaRuntimeLoaded = true;

    const root = document.documentElement;

    function route() {
        return (location.hash.slice(1) || location.pathname || '/').replace(/^!+/, '').split('?')[0];
    }

    function isHome() {
        const value = route().replace(/^[!\\/]+/, '/');
        return value === '/' || /(^|\\/)home\\/?$/.test(value);
    }

    function sync() {
        root.classList.add('sakura-tea-runtime');
        root.classList.toggle('sakura-tea-home', isHome());
    }

    sync();
    addEventListener('hashchange', sync);
    addEventListener('popstate', sync);
    addEventListener('pageshow', sync);

    new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true });
})();
