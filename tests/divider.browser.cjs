const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||undefined});
 try {
  const page = await browser.newPage({viewport:{width:1440,height:300}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<style>body{margin:0;background:#100e15;color:#fff;font-family:system-ui}header{height:180px;padding:32px;box-sizing:border-box;background:linear-gradient(110deg,#382135,#15111f)}h1{margin:0;font-size:28px}p{color:#c7b5c3}.sections{padding:20px}</style><header><h1>Sakura Tea</h1><p>Full-width sakura divider preview</p></header><div class="sections">My Media</div>');
  await page.evaluate(()=>{location.hash='#/home';window.ApiClient={getPluginConfiguration:async()=>({ThemeEnabled:false,HeroEnabled:false,PetalsEnabled:true,BuilderPetalDensity:55,BuilderAnimationSpeed:100})}});
  await page.addStyleTag({content:fs.readFileSync('src/Jellyfin.Plugin.SakuraTea/Inject/Petals/sakura-tea-petals.css','utf8')});
  const source=fs.readFileSync('src/Jellyfin.Plugin.SakuraTea/Inject/Build/sakura-tea-runtime.js','utf8');
  const initialization=source.lastIndexOf('    setHomeClass();\n    scheduleReconcile();');
  await page.addScriptTag({content:source.slice(0,initialization)+'window.dividerTest={mount,applyEffectSettings};})();'});
  await page.evaluate(()=>window.dividerTest.mount(document.querySelector('.sections')));
  assert.equal(await page.locator('.sakuraTeaLinePetal:visible').count(),35);
  assert.equal(await page.locator('.sakuraTeaLineFlower:visible').count(),2);
  assert.equal(await page.locator('#sakuraTeaHomeDecor,.sakuraTeaBgPetal,.sakuraTeaBgFlower').count(),0);
  for (const width of [1440,390]) {
   await page.setViewportSize({width,height:300});
   const bounds=await page.locator('.sakuraTeaPetalLine').boundingBox();
   assert.equal(bounds.x,0);assert.equal(bounds.width,width);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   await page.screenshot({path:`/tmp/sakura-divider-${width}.png`});
  }
  await page.evaluate(()=>window.dividerTest.applyEffectSettings(document.querySelector('#sakuraTeaDivider'),{BuilderPetalDensity:0,BuilderAnimationSpeed:0}));
  assert.equal(await page.locator('.sakuraTeaLinePetal:visible').count(),0);
  assert.equal(await page.locator('.sakuraTeaLineFlower:visible').count(),2);
  assert.equal(await page.locator('.sakuraTeaLineFlower').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.sakuraTeaLineFlower').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.deepEqual(errors,[]);
  console.log('PASS: full-width divider at desktop/mobile, 35 default petals, two flowers, no background effects, pause and reduced motion');
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
