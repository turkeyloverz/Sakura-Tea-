const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('src/Jellyfin.Plugin.SakuraTea/Inject/Build/sakura-tea-header-core.js','utf8'),context);
const core = context.window.SakuraTeaHeaderCore;
test('saved splits migrate to one bar without changing item order',()=>{
 const layout=core.groupOrder('sakura:flower|header:split|jellyfin:favorites|Split|jellyfin:cast');
 assert.equal(layout.pillGroups.length,1);
 assert.equal(layout.order.join('|'),'jellyfin:favorites|jellyfin:cast');
 assert.equal(core.STATIC_CATALOG.some(item=>item.id==='header:split'),false);
 assert.equal(core.mergeCatalog([{id:'header:split'}]).some(item=>item.id==='header:split'),false);
 assert.equal(core.upgradeLegacyOrder('jellyfin:profile|header:split').includes('header:split'),false);
});
test('one bar retains repeatable separators and intentional empty layouts',()=>{
 assert.equal(core.groupOrder('space|space|separator|separator').order.length,4);
 assert.equal(core.groupOrder('').pillGroups.length,0);
 assert.equal(core.groupOrder(core.DEFAULT_HEADER_ITEMS).pillGroups.length,1);
});
test('header styling rejects unsafe colours and bounds saved dimensions',()=>{
 const values=core.normalizeHeaderStyle({BuilderHeaderPadding:999,BuilderBrandDisplay:'<script>',BuilderItemColor:'url(https://bad.example)',BuilderLogoX:-10,BuilderNameY:200,BuilderHoverOpacity:'invalid'});
 assert.equal(values.BuilderHeaderPadding,20);assert.equal(values.BuilderBrandDisplay,'Both');
 assert.equal(values.BuilderItemColor,'#FFF8FC');assert.equal(values.BuilderLogoX,0);assert.equal(values.BuilderHoverOpacity,100);
 assert.equal(core.normalizeHeaderStyle({BuilderItemBackground:'transparent'}).BuilderItemBackground,'transparent');
});
test('header catalog does not leak controls across accounts or servers',()=>{
 let user='one',server='first';context.window.ApiClient={getCurrentUserId:()=>user,serverId:()=>server};
 core.publishCatalog([{id:'je:bookmarks',available:true}]);assert.equal(core.readPublishedCatalog().items.length,1);
 user='two';assert.equal(core.readPublishedCatalog().items.length,0);
 user='one';server='second';assert.equal(core.readPublishedCatalog().items.length,0);
});

test('positions clamp, respect legacy alignment, and avoid collisions within narrow screens',()=>{
 assert.equal(core.normalizeHeaderStyle({BuilderHeaderPosition:'Right'}).BuilderHeaderX,100);
 assert.equal(core.normalizeHeaderStyle({BuilderHeaderPosition:'Right',BuilderHeaderX:0}).BuilderHeaderX,0);
 assert.equal(core.normalizeHeaderStyle({BuilderNameY:200}).BuilderNameY,100);
 assert.equal(core.DEFAULT_HEADER_ITEMS.join('|'),'jellyfin:profile-avatar|sakura:anime|jellyfin:favorites');
 const container={clientWidth:320,style:{}};
 const logo={offsetWidth:44,offsetHeight:44,style:{}};
 const name={offsetWidth:140,offsetHeight:44,style:{}};
 const bar={offsetWidth:300,offsetHeight:50,style:{}};
 core.positionHeaderElements(container,[{element:logo,x:0,y:0},{element:name,x:100,y:0},{element:bar,x:50,y:0}]);
 assert.equal(name.style.left,'180px');assert.equal(bar.style.left,'10px');assert.equal(bar.style.top,'52px');assert.equal(container.style.height,'102px');
});
