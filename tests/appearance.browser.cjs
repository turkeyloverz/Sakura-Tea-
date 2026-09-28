const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = 'src/Jellyfin.Plugin.SakuraTea/Inject/';
const scripts = ['sakura-tea-appearance.js', 'sakura-tea-header-core.js', 'sakura-tea-header-runtime.js', 'sakura-tea-runtime.js'];
const styles = ['Theme/sakura-tea-theme.css', 'Hero/sakura-tea-hero.css', 'Petals/sakura-tea-petals.css', 'Theme/sakura-tea-appearance.css'];
const html = '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;color:white;font-family:system-ui}.sections h2{margin:0;padding:12px}.card{width:140px;height:120px;background:#25202b;margin:12px}</style>'
 + styles.map(file => '<style>' + fs.readFileSync(base + file, 'utf8') + '</style>').join('')
 + '</head><body><header class="skinHeader"><div class="headerTabs"><a href="#/home">Anime</a><a href="#/home?tab=1">Favourites</a></div><div class="headerRight"><button class="headerUserButton">User Menu</button></div></header>'
 + '<div id="indexPage" class="homePage libraryPage"><div id="homeTab" class="is-active"><div class="sections"><h2>My Media</h2><div class="card">Anime library</div></div></div></div>'
 + scripts.map(file => '<script>' + fs.readFileSync(base + 'Build/' + file, 'utf8') + '</script>').join('') + '</body></html>';

(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_PATH || undefined});
 try {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  await context.route('**/*', route => route.request().url().startsWith('http://sakura.test/')
   ? route.fulfill({contentType:'text/html',body:html}) : route.abort());
  await context.addInitScript(() => {
   window.testUser = 'you'; window.testServer = 'server-a'; window.itemRequests = 0;
   window.testConfig = {ThemeEnabled:true,HeroEnabled:true,PetalsEnabled:true,HeroRotationSeconds:3,
    BuilderHeaderItems:'sakura:flower|sakura:anime|jellyfin:favorites|jellyfin:user-menu'};
   window.ApiClient = {
    getCurrentUserId:()=>window.testUser, serverId:()=>window.testServer, getUrl:p=>'http://sakura.test/'+p,
    ajax:async options=>options.url.endsWith('Settings')?window.testConfig:{Items:[{Id:'anime',Name:'Anime'}]},
    getItems:async()=>{window.itemRequests++; if(window.holdItems) await new Promise(resolve=>window.releaseItems=resolve);
     return {Items:[{Id:'one',Name:'Featured anime',Type:'Series',BackdropImageTags:['tag']},{Id:'two',Name:'Next anime',Type:'Series',BackdropImageTags:['tag']}]};},
    getImageUrl:()=> 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
   };
  });
  const page = await context.newPage(); const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://sakura.test/#/home');
  const slider=page.getByRole('slider');
  await page.locator('#sakuraTeaHero').waitFor();
  assert.equal(await page.locator('.sakuraTeaLineFlower').count(),2);
  const bounds=await page.locator('.sakuraTeaAppearanceTrack').boundingBox();
  assert.ok(Math.abs(bounds.width-49.68)<.1);assert.ok(Math.abs(bounds.height-26.4)<.1);
  await slider.focus();await slider.press('ArrowLeft');
  await page.locator('#sakuraTeaHero').waitFor({state:'detached'});
  assert.equal(await page.locator('#sakuraTeaDivider').count(),0);
  assert.equal(await slider.evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
  assert.equal(await page.locator('.sakuraTeaHeaderPill').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
  assert.ok((await page.locator('.sections h2').boundingBox()).y>(await page.locator('#sakuraTeaFloatingHeader').boundingBox()).height);
  await page.reload();await slider.waitFor();
  assert.equal(await slider.getAttribute('aria-valuetext'),'Dark mode');
  assert.equal(await page.evaluate(()=>window.itemRequests),0);
  await page.evaluate(()=>{window.testUser='guest';document.dispatchEvent(new Event('viewshow'))});
  await page.locator('#sakuraTeaHero').waitFor();
  assert.equal(await slider.getAttribute('aria-valuetext'),'Effects on');
  await page.evaluate(()=>{window.testUser='you';document.dispatchEvent(new Event('viewshow'))});
  await page.locator('#sakuraTeaHero').waitFor({state:'detached'});
  assert.equal(await slider.getAttribute('aria-valuetext'),'Dark mode');
  // Same user on another server must not inherit the first server's preference.
  await page.evaluate(()=>{window.testServer='server-b';document.dispatchEvent(new Event('viewshow'))});
  await page.locator('#sakuraTeaHero').waitFor();
  await page.evaluate(()=>{window.testServer='server-a';document.dispatchEvent(new Event('viewshow'))});
  await page.locator('#sakuraTeaHero').waitFor({state:'detached'});
  // A slow hero response cannot remount after dark mode was chosen.
  await page.evaluate(()=>window.holdItems=true);
  await slider.press('ArrowRight');await page.waitForFunction(()=>Boolean(window.releaseItems));
  await slider.press('ArrowLeft');await page.evaluate(()=>{window.holdItems=false;window.releaseItems()});
  await page.waitForTimeout(200);assert.equal(await page.locator('#sakuraTeaHero').count(),0);
  const second=await context.newPage();await second.goto('http://sakura.test/#/home');
  await second.getByRole('slider').waitFor();
  await slider.press('ArrowRight');await page.locator('#sakuraTeaHero').waitFor();
  await second.locator('#sakuraTeaHero').waitFor();
  assert.equal(await second.getByRole('slider').getAttribute('aria-valuetext'),'Effects on');
  await second.close();
  await page.screenshot({path:'/tmp/sakura-release-on.png'});
  await page.setViewportSize({width:360,height:800});
  const box=await slider.boundingBox();await page.mouse.move(box.x+box.width-3,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+3,box.y+box.height/2,{steps:8});await page.mouse.up();
  await page.locator('#sakuraTeaHero').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
  const control=await slider.boundingBox();assert.ok(control.x>=0&&control.x+control.width<=360);
  await page.screenshot({path:'/tmp/sakura-release-dark-mobile.png'});
  // Empty builder layouts still leave the appearance switch reachable.
  await page.evaluate(()=>{window.testConfig.BuilderHeaderItems='';window.dispatchEvent(new Event('sakura-tea:settings-changed'))});
  await page.waitForFunction(()=>document.querySelector('#sakuraTeaFloatingHeader')?.querySelectorAll('.sakuraTeaHeaderButton').length===0);await slider.waitFor();assert.equal(await page.locator('.sakuraTeaHeaderPill').count(),1);
  await slider.press('ArrowRight');await page.locator('#sakuraTeaHero').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.sakuraTeaAppearancePupil').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  assert.deepEqual(errors,[]);
  // Storage-denied browsers retain an in-memory preference without throwing.
  const denied=await context.newPage();await denied.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('blocked')};Storage.prototype.getItem=()=>{throw Error('blocked')}});
  await denied.goto('http://sakura.test/#/home');await denied.locator('#sakuraTeaHero').waitFor();
  await denied.getByRole('slider').press('ArrowLeft');await denied.locator('#sakuraTeaHero').waitFor({state:'detached'});
  await denied.evaluate(()=>document.dispatchEvent(new Event('viewshow')));
  assert.equal(await denied.getByRole('slider').getAttribute('aria-valuetext'),'Dark mode');
  console.log('PASS: real runtime appearance toggle, persistence, user/server isolation, cross-tab sync, pending hero cancellation, keyboard/drag, mobile, empty header and blocked storage');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
