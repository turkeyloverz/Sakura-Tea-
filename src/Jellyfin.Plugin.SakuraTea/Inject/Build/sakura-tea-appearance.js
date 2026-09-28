(() => {
    'use strict';
    if (window.SakuraTeaAppearance) return;

    let identity = null;
    let enabled = true;
    const preferences = new Map();

    function userKey() {
        const client = window.ApiClient;
        const user = client?.getCurrentUserId?.();
        if (!user) return null;
        const server = client.serverId?.() || client.getUrl?.('') || window.location.origin;
        return 'sakura-tea:appearance:v1:' + JSON.stringify([server, user]);
    }

    function paint() {
        document.documentElement.classList.toggle('sakura-tea-dark', Boolean(identity) && !enabled);
        document.querySelectorAll('.sakuraTeaAppearance input').forEach((input) => {
            input.value = enabled ? '1' : '0';
            input.disabled = !identity;
            input.setAttribute('aria-valuetext', enabled ? 'Effects on' : 'Dark mode');
            input.closest('.sakuraTeaAppearance').dataset.enabled = String(enabled);
        });
    }

    function sync() {
        const next = userKey();
        if (next === identity) return false;
        identity = next;
        enabled = true;
        if (identity) {
            if (preferences.has(identity)) enabled = preferences.get(identity);
            else {
                try { enabled = localStorage.getItem(identity) !== 'off'; } catch (_) {}
                preferences.set(identity, enabled);
            }
        }
        paint();
        return true;
    }

    function setEnabled(value) {
        sync();
        if (!identity || enabled === value) return;
        enabled = value;
        preferences.set(identity, enabled);
        try { localStorage.setItem(identity, enabled ? 'on' : 'off'); } catch (_) {}
        paint();
        window.dispatchEvent(new Event('sakura-tea:appearance-changed'));
    }

    function createControl() {
        sync();
        const label = document.createElement('label');
        label.className = 'sakuraTeaAppearance';
        label.dataset.enabled = String(enabled);
        label.title = 'Personal appearance: effects on / dark mode';
        label.innerHTML = '<span class="sakuraTeaAppearanceTrack" aria-hidden="true"><span class="sakuraTeaAppearancePupil"></span></span>'
            + '<input type="range" min="0" max="1" step="1" aria-label="Personal appearance: effects and background">';
        const input = label.querySelector('input');
        input.value = enabled ? '1' : '0';
        input.disabled = !identity;
        input.setAttribute('aria-valuetext', enabled ? 'Effects on' : 'Dark mode');
        input.addEventListener('input', () => setEnabled(input.value === '1'));
        return label;
    }

    window.addEventListener('storage', (event) => {
        sync();
        if (!identity || (event.key !== identity && event.key !== null)) return;
        enabled = event.newValue !== 'off';
        preferences.set(identity, enabled);
        paint();
        window.dispatchEvent(new Event('sakura-tea:appearance-changed'));
    });

    window.SakuraTeaAppearance = { sync, createControl, get enabled() { return enabled; } };
})();
