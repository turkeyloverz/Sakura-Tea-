(() => {
    'use strict';
    if (window.SakuraTeaDetails) return;
    let mounted = null, generation = 0, timer = 0, pending = '', settings = null, scope = '', metadata = null, retryAfter = 0;
    const supported = new Set(['Movie', 'Series', 'Season', 'Episode']);

    function destroy() {
        if (!mounted) return;
        const { page, hero, moved } = mounted;
        // Restore the exact native nodes, including their handlers and permission state.
        moved.reverse().forEach(({ node, marker }) => {
            if (marker.parentNode && hero.contains(node)) marker.replaceWith(node);
            else marker.remove();
        });
        hero.remove(); delete page.dataset.sakuraTeaDetails; mounted = null;
    }

    function mount(page, item, client, key) {
        const wrapper = page.querySelector('.detailPageWrapperContainer');
        const actions = page.querySelector('.mainDetailButtons');
        const name = page.querySelector('.nameContainer');
        if (!wrapper || !actions || !name || page.hasAttribute('data-sleekfin-details')) return false;
        const hero = document.createElement('section'); hero.className = 'sakuraTeaDetailHero';
        hero.setAttribute('aria-label', item.Name || 'Title details');
        const image = document.createElement('img'); image.className = 'sakuraTeaDetailBackdrop'; image.alt = '';
        let imageId = item.Id, tag = item.BackdropImageTags?.[0];
        if (!tag && item.ParentBackdropItemId) { imageId = item.ParentBackdropItemId; tag = item.ParentBackdropImageTags?.[0]; }
        if (tag && client.getImageUrl) {
            image.src = client.getImageUrl(imageId, {type:'Backdrop',index:0,tag,maxWidth:1920,quality:90});
            image.addEventListener('error', () => { image.hidden = true; });
            hero.appendChild(image);
        }
        const stack = document.createElement('div'); stack.className = 'sakuraTeaDetailStack';
        hero.appendChild(stack);
        if (item.SeriesName && item.Type !== 'Series') {
            const series = document.createElement('p'); series.className = 'sakuraTeaDetailKicker';
            series.textContent = [item.SeriesName, item.Type === 'Episode' && item.ParentIndexNumber != null ? 'S' + item.ParentIndexNumber + ' · E' + item.IndexNumber : ''].filter(Boolean).join(' · ');
            stack.appendChild(series);
        }
        const moved = [];
        function move(node) {
            if (!node) return;
            const marker = document.createComment('sakura-tea native position'); node.before(marker);
            moved.push({node, marker}); stack.appendChild(node);
        }
        move(page.querySelector('.detailLogo')); move(name);
        const facts = document.createElement('p'); facts.className = 'sakuraTeaDetailFacts';
        facts.textContent = [item.CommunityRating ? '★ ' + Number(item.CommunityRating).toFixed(1) : '', item.ProductionYear,
            item.OfficialRating, item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) + ' min' : item.Type,
            ...(item.Genres || []).slice(0, 3)].filter(Boolean).join(' · ');
        stack.appendChild(facts); move(page.querySelector('.overview')); move(actions);
        wrapper.before(hero); page.dataset.sakuraTeaDetails = 'true';
        mounted = {page, hero, moved, key};
        return true;
    }

    async function reconcile() {
        const client = window.ApiClient;
        const user = client?.getCurrentUserId?.();
        const currentScope = JSON.stringify([client?.serverId?.() || '', user || '']);
        if (scope !== currentScope) { scope = currentScope; settings = null; metadata = null; retryAfter = 0; generation++; pending = ''; destroy(); }
        const match = window.location.hash.match(/^#\/details\?([^#]*)/);
        const params = new URLSearchParams(match ? match[1] : '');
        const id = params.get('id');
        const server = params.get('serverId');
        const page = Array.from(document.querySelectorAll('#itemDetailPage')).find(p => p.getClientRects().length && !p.classList.contains('hide'));
        if (!id || !page || !user || (server && client.serverId?.() && server.toLowerCase() !== client.serverId().toLowerCase()) || document.documentElement.classList.contains('sakura-tea-dark')) {
            generation++; pending = ''; destroy(); return;
        }
        const key = scope + ':' + id;
        if (mounted?.key === key && mounted.page === page && mounted.hero.isConnected && mounted.moved.every(record => mounted.hero.contains(record.node))) return;
        if (pending === key || Date.now() < retryAfter) return;
        destroy(); const request = ++generation; pending = key;
        try {
            if (!settings) {
                const config = await client.ajax({type:'GET',url:client.getUrl('SakuraTea/Settings'),dataType:'json'});
                if (request !== generation) return;
                settings = Object.fromEntries(Object.entries(config || {}).map(([name,value]) => [name.charAt(0).toUpperCase()+name.slice(1),value]));
            }
            if (settings.DetailsEnabled !== true) return;
            const item = metadata?.key === key ? metadata.item : await client.getItem(user, id);
            if (request !== generation || !page.isConnected || client.getCurrentUserId() !== user || document.documentElement.classList.contains('sakura-tea-dark') || window.location.hash !== '#/details?' + match[1]) return;
            metadata = {key, item};
            if (!supported.has(item.Type)) return;
            mount(page, item, client, key);
        } catch (error) {
            // The original page stays usable if metadata or settings cannot be read.
            if (request === generation) retryAfter = Date.now() + 5000;
            console.warn('[Sakura Tea] Keeping native detail page.', error);
        } finally { if (request === generation) pending = ''; }
    }
    function schedule() { if (!timer) timer = setTimeout(() => {timer=0;reconcile();}, 80); }
    ['hashchange','popstate','pageshow','sakura-tea:appearance-changed'].forEach(event => window.addEventListener(event,schedule));
    window.addEventListener('sakura-tea:settings-changed', () => {settings=null;metadata=null;retryAfter=0;generation++;pending='';destroy();schedule();});
    document.addEventListener('viewshow',schedule);
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    window.SakuraTeaDetails = { refresh: schedule };
    schedule();
})();
