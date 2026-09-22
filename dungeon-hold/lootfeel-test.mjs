import { chromium } from "playwright"; import fs from "fs"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8844);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8844/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__feel&&window.__meta,null,{timeout:60000});
// fresh hero: stat block shows base numbers
const s0=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.step(1/60,3); return {stats:window.__feel.stats(),text:document.getElementById("herostats")&&document.getElementById("herostats").textContent}; });
check("hero stat block on the HUD (damage, swings/s, magic, DPS, armor, HP)",s0.text&&/Damage/.test(s0.text)&&/DPS/.test(s0.text)&&/Armor/.test(s0.text)&&s0.stats.dmg>0&&s0.stats.dps>0,JSON.stringify(s0.stats));
// walk over a rare sword: the card pops, compares against nothing (new slot), offers E
const r1=await page.evaluate(()=>{ const d=window.__dd; const it=d.rollItem(2,"weapon",5); it.stats.dmg=9; const l=d.dropLoot(it,d.hero.x,d.hero.z,true); d.step(1/60,30); return {card:window.__feel.card(),bag:window.__meta.bag().length,loot:d.loot.length,it:it.name}; });
check("pickup card shows the item and offers E to equip",r1.card&&r1.card.shown&&r1.card.name===r1.it&&r1.card.outcome==="bagged"&&r1.card.canEquip&&/new slot/.test(r1.card.html)&&/equip now/.test(r1.card.html),JSON.stringify({card:r1.card&&{name:r1.card.name,outcome:r1.card.outcome,canEquip:r1.card.canEquip},bag:r1.bag}));
// E equips it from the card: gear changes, the damage row flashes up, the sword hand glows blue
const r2=await page.evaluate(()=>{ const d=window.__dd; const before=window.__feel.stats().dmg; window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE",bubbles:true})); d.step(1/60,2); const row=document.getElementById("hs-dmg"); return {weapon:d.gear().weapon&&d.gear().weapon.stats.dmg,card:window.__feel.card(),dmgBefore:before,dmgAfter:window.__feel.stats().dmg,flash:row.className,vis:window.__feel.visuals()}; });
check("E equips from the card and the damage row jumps",r2.weapon===9&&r2.card&&r2.card.outcome==="equipped"&&r2.dmgAfter>r2.dmgBefore&&/up/.test(r2.flash),JSON.stringify({weapon:r2.weapon,dmg:[r2.dmgBefore,r2.dmgAfter],flash:r2.flash}));
check("rare sword glows in the gnome's hand",r2.vis.weapon&&r2.vis.hostIsBone&&!!r2.vis.weaponColor,JSON.stringify(r2.vis));
// a worse sword: card says not better, no E; charm + amulet equipped from the bag show up on the hero
const r3=await page.evaluate(()=>{ const d=window.__dd; const it=d.rollItem(0,"weapon",1); it.stats.dmg=1; it.score=1; d.dropLoot(it,d.hero.x,d.hero.z,true); d.step(1/60,30); const c1=window.__feel.card();
  const ch=d.rollItem(3,"charm",6), am=d.rollItem(1,"amulet",4); window.__meta.giveItem(ch); window.__meta.giveItem(am); window.__meta.equip(ch.id); window.__meta.equip(am.id); d.step(1/60,3); return {c1:c1&&{canEquip:c1.canEquip,html:/not better/.test(c1.html)},vis:window.__feel.visuals()}; });
check("worse item: bagged, no equip offer",r3.c1&&!r3.c1.canEquip&&r3.c1.html,JSON.stringify(r3.c1));
check("charm orb and amulet gem appear when equipped",r3.vis.charm&&r3.vis.amulet,JSON.stringify(r3.vis));
// screenshot at phone width with the card up
await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>{ const d=window.__dd; const it=d.rollItem(4,"armor",8); d.dropLoot(it,d.hero.x,d.hero.z,true); d.step(1/60,20); }); await page.waitForTimeout(500); await page.screenshot({path:SP+"/parts/shots/lootfeel-phone.png"});
const ov=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth); check("no horizontal overflow on a phone",ov);
await page.setViewportSize({width:960,height:600}); await page.evaluate(()=>{ const d=window.__dd; d.setHero(0,10,0); d.setCam(Math.PI+.4,.3,5); d.step(1/60,30); }); await page.waitForTimeout(200); await page.screenshot({path:SP+"/parts/shots/lootfeel-hero.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
