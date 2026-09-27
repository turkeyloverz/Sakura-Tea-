const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Jellyfin.Plugin.SakuraTea/Inject/Build/sakura-tea-runtime.js', 'utf8');

function runtime() {
    const timers = new Map();
    let nextTimer = 0;
    const host = { offsetParent: {}, isConnected: true };
    const document = {
        hidden: false,
        documentElement: { classList: { add() {}, toggle() {} } },
        querySelectorAll: () => [host]
    };
    const window = {
        location: { hash: '#/home', pathname: '/' },
        setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
        setInterval(fn) { timers.set(++nextTimer, fn); return nextTimer; },
        clearInterval(id) { timers.delete(id); }
    };
    const context = vm.createContext({ window, document, URLSearchParams, console });
    const initialization = source.lastIndexOf('    setHomeClass();\n    scheduleReconcile();');
    vm.runInContext(source.slice(0, initialization) +
        'window.test = { STATE, isHomeRoute, reconcile, scheduleReconcile, startRotation, stopRotation, applyHeroSettings, applyEffectSettings, refreshSettings, loadConfig }; })();', context);
    return { window, document, host, timers, api: window.test };
}

test('SPA detail and non-home tabs do not inherit the root home route', () => {
    const { window, api } = runtime();
    for (const hash of ['#/details?id=1', '#/home?tab=1', '#/search']) {
        window.location.hash = hash;
        assert.equal(api.isHomeRoute(), false, hash);
    }
    for (const hash of ['#/home', '#/home?tab=0', '#/', '']) {
        window.location.hash = hash;
        assert.equal(api.isHomeRoute(), true, hash);
    }
});

test('DOM churn shares the pending mount; leaving home invalidates it', async () => {
    const { window, api } = runtime();
    let resolveConfig;
    let requests = 0;
    window.ApiClient = { getPluginConfiguration() {
        requests++;
        return new Promise(resolve => { resolveConfig = resolve; });
    } };
    api.reconcile();
    api.reconcile();
    api.reconcile();
    assert.equal(requests, 1);
    window.location.hash = '#/details?id=1';
    api.reconcile();
    resolveConfig({ ThemeEnabled: false, HeroEnabled: false, PetalsEnabled: false });
    await new Promise(setImmediate);
    assert.equal(api.STATE.host, null);
    assert.equal(api.STATE.pendingHost, null);
});

test('reconciliation coalesces header work until the scheduled callback', () => {
    const { window, api, timers, host } = runtime();
    let syncs = 0;
    window.ApiClient = {};
    window.SakuraTeaHeaderRuntime = { sync() { syncs++; } };
    api.STATE.host = host;
    for (let i = 0; i < 20; i++) api.scheduleReconcile();
    assert.equal(syncs, 0);
    assert.equal(timers.size, 1);
    [...timers.values()][0]();
    assert.equal(syncs, 1);
});

test('hidden documents stop rotation and visible documents can restart it', () => {
    const { document, api, timers } = runtime();
    api.STATE.hero = {};
    api.STATE.items = [{}, {}];
    api.startRotation();
    assert.equal(timers.size, 1);
    document.hidden = true;
    api.startRotation();
    assert.equal(timers.size, 0);
    document.hidden = false;
    api.startRotation();
    assert.equal(timers.size, 1);
    api.stopRotation();
    assert.equal(timers.size, 0);
});


test('hero controls apply bounded CSS values to the live hero', () => {
    const { api } = runtime();
    const values = {};
    api.applyHeroSettings({ style: { setProperty(name, value) { values[name] = value; } } }, {
        BuilderHeroHeight: 85, BuilderHeroTitleSize: 120, BuilderHeroButtonSize: 70, BuilderBackdropDarkness: 200
    });
    assert.equal(values['--sakura-hero-height'], '85vh');
    assert.equal(values['--sakura-title-scale'], 1.2);
    assert.equal(values['--sakura-button-scale'], .7);
    assert.equal(values['--sakura-backdrop-darkness'], .8);
});

test('effect budget, zero density, and pause apply to actual particles', () => {
    const { api, document } = runtime();
    const particles = Array.from({length:100}, () => ({style:{getPropertyValue:()=> '8s'}}));
    const element = {querySelectorAll:()=> particles};
    api.applyEffectSettings(element, {BuilderPetalDensity:100, BuilderPerformanceMode:'Performance', BuilderAnimationSpeed:50});
    assert.equal(particles.filter(p=>!p.hidden).length,28);
    assert.equal(particles[0].style.animationDuration,'16s');
    api.applyEffectSettings(element, {BuilderPetalDensity:0, BuilderAnimationSpeed:0});
    assert.equal(particles.filter(p=>!p.hidden).length,0);
    assert.equal(particles[0].style.animationPlayState,'paused');
    document.hidden = true;
    api.applyEffectSettings(element, {BuilderPetalDensity:100, BuilderAnimationSpeed:100});
    assert.equal(particles[0].style.animationPlayState,'paused');
});

test('settings refresh invalidates stale mounts and schedules an update', () => {
    const {api, timers} = runtime();
    api.STATE.pendingHost = {};
    api.refreshSettings();
    assert.equal(api.STATE.pendingHost,null);
    assert.equal(api.STATE.generation,1);
    assert.equal(timers.size,1);
});

test('viewers load visual settings without the admin configuration API', async () => {
    const {window, api} = runtime();
    window.ApiClient = { getUrl:path=>'/base/'+path, ajax: async options=> {
        assert.equal(options.url,'/base/SakuraTea/Settings');
        return {HeroEnabled:false};
    }};
    assert.equal((await api.loadConfig()).HeroEnabled,false);
});
