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
 assert.equal(layout.order.join('|'),'sakura:flower|jellyfin:favorites|jellyfin:cast');
 assert.equal(core.STATIC_CATALOG.some(item=>item.id==='header:split'),false);
 assert.equal(core.mergeCatalog([{id:'header:split'}]).some(item=>item.id==='header:split'),false);
 assert.equal(core.upgradeLegacyOrder('jellyfin:profile|header:split').includes('header:split'),false);
});
test('one bar retains repeatable separators and intentional empty layouts',()=>{
 assert.equal(core.groupOrder('space|space|separator|separator').order.length,4);
 assert.equal(core.groupOrder('').pillGroups.length,0);
 assert.equal(core.groupOrder(core.DEFAULT_HEADER_ITEMS).pillGroups.length,1);
});
