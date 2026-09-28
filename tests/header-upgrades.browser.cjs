const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const base='src/Jellyfin.Plugin.SakuraTea/Inject/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||undefined});try{
 const page=await browser.newPage({viewport:{width:1100,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<style>body{margin:0;background:#100e14;color:white}.headerUserButton{position:absolute;right:0;top:4px}</style><header class="skinHeader"><div class="headerTabs"><a href="#/home">Anime</a><a href="#/home?tab=1">Favourites</a></div><div class="headerRight"><button id="nativeUser" class="headerUserButton" aria-haspopup="true" style="color:red">Profile</button><button class="headerSearchButton">Search</button></div></header><div id="je-native-tabs-group"><button id="je-native-tab-btn-bookmarks">Bookmarks</button></div>');
 await page.evaluate(()=>{location.hash='#/home';document.documentElement.className='sakura-tea-runtime sakura-tea-header-home';window.nativeClicks=0;document.querySelector('#nativeUser').onclick=e=>{window.nativeClicks++;window.anchor=e.target.getBoundingClientRect().toJSON()};window.ApiClient={getCurrentUserId:()=> 'user',serverId:()=> 'server',getUrl:p=>p,ajax:async()=>({ServerName:'My Anime Server'})}});
 for(const file of ['Theme/sakura-tea-theme.css','Theme/sakura-tea-appearance.css','Theme/sakura-tea-controls.css'])await page.addStyleTag({content:fs.readFileSync(base+file,'utf8')});
 for(const file of ['sakura-tea-appearance.js','sakura-tea-header-core.js','sakura-tea-header-runtime.js'])await page.addScriptTag({content:fs.readFileSync(base+'Build/'+file,'utf8')});
 await page.evaluate(()=>{window.config={BuilderHeaderItems:'sakura:anime|jellyfin:favorites|jellyfin:search|je:bookmarks|jellyfin:user-menu|sf:requests',BuilderBrandDisplay:'Both',BuilderBrandPosition:'Left',BuilderItemColor:'#123456',BuilderActiveBackground:'#AA3366',BuilderHeaderPadding:12};window.SakuraTeaHeaderRuntime.mount(window.config)});
 await page.waitForFunction(()=>document.querySelector('.sakuraTeaServerName')?.textContent==='My Anime Server');
 assert.equal(await page.locator('[data-unavailable]').count(),0);
 assert.equal(await page.locator('[data-item-id="sf:requests"]').count(),0);
 assert.equal(await page.locator('[data-item-id="je:bookmarks"]').count(),1);
 assert.equal(await page.locator('#sakuraTeaFloatingHeader').evaluate(e=>getComputedStyle(e).getPropertyValue('--st-bar-padding').trim()),'12px');
 const user=page.locator('#sakuraTeaFloatingHeader [data-item-id="jellyfin:user-menu"]');await user.click();
 const actual=await user.boundingBox();const anchor=await page.evaluate(()=>window.anchor);assert.ok(Math.abs(anchor.x-actual.x)<1);assert.ok(Math.abs(anchor.y-actual.y)<1);assert.equal(await page.evaluate(()=>window.nativeClicks),1);
 await page.setViewportSize({width:360,height:800});
 const toggle=page.getByRole('button',{name:'More navigation',exact:true});await toggle.waitFor({state:'visible'});await toggle.click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#sakuraTeaOverflow').isVisible(),true);
 await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
 const slider=page.getByRole('slider');const rect=await slider.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=360);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
 await toggle.click();await user.click();assert.equal(await page.evaluate(()=>window.nativeClicks),2);assert.equal(await page.locator('#sakuraTeaOverflow').isVisible(),false);
 await page.screenshot({path:'/tmp/sakura-header-upgrade-mobile.png'});
 await page.evaluate(()=>{const btn=document.createElement('button');btn.dataset.seerrfinTab='requests';btn.textContent='Requests';document.querySelector('.headerTabs').appendChild(btn);window.SakuraTeaHeaderRuntime.sync()});
 assert.equal(await page.locator('[data-item-id="sf:requests"]').count(),1);
 await page.evaluate(()=>window.SakuraTeaHeaderRuntime.unmount());assert.equal(await page.locator('#nativeUser').getAttribute('style'),'color: red;');
 await page.evaluate(()=>{document.documentElement.classList.remove('sakura-tea-header-home');window.SakuraTeaHeaderRuntime.mount({...window.config,HeaderEnabled:false})});
 assert.equal(await page.locator('#sakuraTeaFloatingHeader').count(),0);assert.equal(await page.locator('.skinHeader .sakuraTeaAppearance').count(),1);
 await page.getByRole('slider').press('ArrowLeft');assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('sakura-tea-dark')),true);
 await page.evaluate(()=>{window.config.BuilderBrandDisplay='None';window.SakuraTeaHeaderRuntime.mount(window.config)});
 await page.setViewportSize({width:1100,height:800});
 await page.screenshot({path:'/tmp/sakura-header-upgrade-desktop.png'});

 // New defaults keep a single text hotbar, with the native profile dropdown.
 await page.evaluate(()=>{document.documentElement.classList.add('sakura-tea-header-home');window.SakuraTeaHeaderRuntime.mount({BuilderBrandDisplay:'Both',BuilderLogoX:0,BuilderNameX:100,BuilderHeaderX:50})});
 await page.waitForTimeout(100);
 assert.deepEqual(await page.locator('.sakuraTeaHeaderPill [data-item-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.itemId)),['jellyfin:profile-avatar','sakura:anime','jellyfin:favorites']);
 assert.equal(await page.locator('.sakuraTeaHeaderPill .sakuraTeaHeaderButton:not(.has-avatar) svg,.sakuraTeaHeaderPill .sakuraTeaHeaderButton:not(.has-avatar) img,.sakuraTeaHeaderFallbackIcon').count(),0);
 await page.locator('[data-item-id="jellyfin:profile-avatar"]').click();assert.equal(await page.evaluate(()=>window.nativeClicks),3);
 const before=await page.locator('.sakuraTeaBrandLogo').boundingBox();
 const nameBefore=await page.locator('.sakuraTeaBrandName').boundingBox();
 await page.evaluate(()=>window.SakuraTeaHeaderRuntime.mount({BuilderBrandDisplay:'Both',BuilderLogoX:80,BuilderLogoY:60,BuilderNameX:100,BuilderHeaderX:0,BuilderHeaderY:25}));
 await page.waitForTimeout(100);
 const moved=await page.locator('.sakuraTeaBrandLogo').boundingBox();const nameAfter=await page.locator('.sakuraTeaBrandName').boundingBox();
 assert.ok(moved.x>before.x+100);assert.ok(moved.y>before.y+50);assert.equal(nameAfter.x,nameBefore.x);
 await page.setViewportSize({width:320,height:700});await page.waitForTimeout(100);
 const boxes=await page.locator('#sakuraTeaFloatingHeader > .sakuraTeaBrand,#sakuraTeaFloatingHeader > .sakuraTeaHeaderPill').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
 for(const box of boxes){assert.ok(box.x>=0&&box.right<=320);}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y);}
 assert.deepEqual(errors,[]);console.log('PASS: branding, settings, provider discovery, missing controls, native popup anchoring/restoration, mobile overflow, focus and native-header appearance control');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
