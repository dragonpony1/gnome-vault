// fix-r2-test.mjs — regression checks for the round-2 adversarial findings (port 8820). SP=<scratchpad> node fix-r2-test.mjs
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8820);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+String(d).slice(0,300):"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:60000});
const listen=p=>{ const errors=[], warns=[]; p.on("pageerror",e=>errors.push(String(e))); p.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,160)); else if(m.type()==="warning") warns.push(m.text().slice(0,160)); }); return {errors,warns}; };

// ---------- desktop ----------
let page=await browser.newPage({viewport:{width:1280,height:800}}); let log=listen(page);
await page.goto("http://127.0.0.1:8820/?silent&nogate"); await ready(page); await page.waitForTimeout(400);
check("single file: no 404 / mob model warnings on load", log.errors.length===0&&log.warns.length===0, [...log.errors,...log.warns].join(" | "));
// focus: TAVERN → Escape → Space must start the run WITHOUT re-opening the tavern
await page.click('#tavbtn'); await page.waitForTimeout(50); await page.keyboard.press('Escape'); await page.waitForTimeout(50);
const foc=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),active:document.activeElement&&document.activeElement.id}));
await page.keyboard.press('Space'); await page.waitForTimeout(80);
const foc2=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen(),startHidden:document.getElementById('start').classList.contains('hide')}));
check("TAVERN → Escape → Space starts the run with the tavern closed", !foc.open&&foc.active!=='tavbtn'&&foc2.phase==='build'&&!foc2.open&&foc2.startHidden, JSON.stringify({foc,foc2}));
// key auto-repeat must not flicker the overlay
const seq=[]; for(let i=0;i<5;i++){ await page.keyboard.down('KeyI'); await page.waitForTimeout(30); seq.push(await page.evaluate(()=>window.__dd.Meta.isOpen())); } await page.keyboard.up('KeyI');
check("holding I opens once and stays open across auto-repeat", JSON.stringify(seq)==='[true,true,true,true,true]', JSON.stringify(seq));
// Tab cannot reach the HUD; Enter never starts a wave under the overlay
let reached=null; for(let i=0;i<40;i++){ await page.keyboard.press('Tab'); const id=await page.evaluate(()=>document.activeElement&&document.activeElement.id); if(id==='wavebtn'||id==='sndbtn'||id==='bagbtn'){ reached=id; break; } }
await page.keyboard.press('Enter'); await page.waitForTimeout(50);
const tab=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen(),inert:document.getElementById('hud').inert}));
check("HUD is inert under the open tavern: Tab never reaches #wavebtn, phase stays build", reached===null&&tab.phase==='build'&&tab.open&&tab.inert===true, JSON.stringify({reached,tab}));
await page.keyboard.press('Escape'); await page.waitForTimeout(50);
const inert2=await page.evaluate(()=>document.getElementById('hud').inert);
check("closing lifts the inert shield", inert2===false, String(inert2));
// stale message: say → close → open
const stale=await page.evaluate(()=>{ const T=window.__tavern; window.__dd.Meta.open(); T.say('Sold X for 1 gold'); T.close(); window.__dd.Meta.open(); const el=document.getElementById('tv-msg'); const r={on:el.classList.contains('on'),msg:T.state().msg}; T.close(); return r; });
check("last tvSay line does not survive close → open", !stale.on&&stale.msg==='', JSON.stringify(stale));
// tier line mid-run
const tier=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); const t0=M.tierLine(); d.startWave(); for(let i=0;i<600&&d.S.phase==='wave';i++){ d.step(1/60,1); for(const e of d.enemies) if(!e.dead) d.kill(e); } return {t0,phase:d.S.phase,wave:d.S.wave,t1:M.tierLine(),best:M.best()}; });
check("tier line: 'reach wave 1' before, 'tier 2 wares arrive after this run' once wave 1 is held (best still 0)", /reach wave 1 for tier 2/.test(tier.t0)&&tier.phase==='build'&&tier.wave===1&&tier.best===0&&/tier 2 wares arrive after this run/.test(tier.t1), JSON.stringify(tier));
// granularity: every Blade point moves heroDmg (no weapon)
const gran=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.resetGear(); M.addXP(200000); const a=[d.heroDmg()]; for(let i=0;i<10;i++){ M.spend('blade'); a.push(d.heroDmg()); } const fam=[]; const it=d.rollItem(2,'familiar',3); it.stats={fdmg:3,frate:0}; M.reset(); d.resetGear(); M.giveItem(it); M.equip(it.id); M.addXP(200000); fam.push(window.__familiar.dmg()); for(let i=0;i<3;i++){ M.spend('blade'); fam.push(window.__familiar.dmg()); } return {a,fam}; });
check("heroDmg changes on every Blade point (one decimal)", gran.a.every((v,i)=>i===0||v>gran.a[i-1]), JSON.stringify(gran.a));
check("familiar bolt damage changes on every Blade point", gran.fam.every((v,i)=>i===0||v>gran.fam[i-1]), JSON.stringify(gran.fam));
// junk rule: a Common that beats the worn item is not junk; worse items are; empty slot keeps a Common
const junk=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.resetGear(); const w=d.rollItem(1,'weapon',2); M.giveItem(w); M.equip(w.id); const better=d.rollItem(0,'weapon',12); better.rarity=0; better.score=w.score+40; M.giveItem(better); const worse=d.rollItem(0,'weapon',1); worse.rarity=0; worse.score=w.score-5; M.giveItem(worse); const worse2=d.rollItem(3,'weapon',1); worse2.score=w.score-1; M.giveItem(worse2); const arm=d.rollItem(0,'armor',2); arm.rarity=0; M.giveItem(arm); const j={better:M.isJunk(better),worse:M.isJunk(worse),worse2:M.isJunk(worse2),arm:M.isJunk(arm)}; const r=M.sellJunk(); return {j,n:r.n,left:M.bag().map(b=>b.id),better:better.id,arm:arm.id}; });
check("isJunk: better Common kept, worse Common + worse Epic sold, Common in an empty slot kept", !junk.j.better&&junk.j.worse&&junk.j.worse2&&!junk.j.arm&&junk.n===2&&junk.left.includes(junk.better)&&junk.left.includes(junk.arm), JSON.stringify(junk));
// gold / xp finiteness
const fin=await page.evaluate(()=>{ const M=window.__meta; M.reset(); M.giveGold(Infinity); const a=M.gold(); M.giveGold(-Infinity); const b=M.gold(); M.giveGold(NaN); M.addXP(Infinity); M.addXP(NaN); const c=M.gold(); const rs=M.restock(); return {a,b,c,rs,xp:M.xp(),lvl:M.level(),fin:[a,b,c,M.xp()].every(Number.isFinite)}; });
check("gold/xp stay finite through Infinity/NaN helpers; a broke player cannot restock", fin.fin&&fin.c===0&&fin.rs===false, JSON.stringify(fin));
await page.evaluate(()=>{ localStorage.setItem('ddMeta',JSON.stringify({gold:"1e999",xp:"1e999",level:"Infinity",best:"1e400",bag:[{slot:'weapon',rarity:2,name:'Old Blade',stats:{dmg:'abc',spd:'12'},lvl:1}],stock:[]})); });
await page.reload(); await ready(page);
const corrupt=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const it=M.bag()[0]; const eq=it&&M.equip(it.id); return {gold:M.gold(),xp:M.xp(),level:M.level(),best:M.best(),hud:document.getElementById('gold').textContent,it:it&&{stats:it.stats,score:it.score},eq,dmg:d.heroDmg(),finite:Number.isFinite(d.heroDmg())&&Number.isFinite(M.gold())}; });
check("corrupt storage (1e999 gold, string stats) loads finite: gold falls back to 0, 'abc' stat dropped, '12' coerced, heroDmg finite", corrupt.finite&&corrupt.gold===0&&corrupt.hud==='0'&&corrupt.it&&corrupt.it.stats.dmg===undefined&&corrupt.it.stats.spd===12&&Number.isFinite(corrupt.it.score)&&corrupt.eq, JSON.stringify(corrupt));
// reload is not a free restock; the run start is the one reroll
await page.evaluate(()=>{ window.__meta.reset(); });
const ids0=await page.evaluate(()=>window.__meta.stock().map(s=>s.id)); const runs0=await page.evaluate(()=>window.__meta.runs());
await page.reload(); await ready(page);
const ids1=await page.evaluate(()=>window.__meta.stock().map(s=>s.id)); const runs1=await page.evaluate(()=>window.__meta.runs());
check("reload keeps the same 6 stock cards (no free reroll)", JSON.stringify(ids0)===JSON.stringify(ids1)&&runs1===runs0+1, JSON.stringify({ids0,ids1,runs0,runs1}));
const ids2=await page.evaluate(()=>{ const d=window.__dd; d.start(); d.step(1/60,2); return window.__meta.stock().map(s=>s.id); });
check("starting the run rerolls the stock once", JSON.stringify(ids2)!==JSON.stringify(ids1)&&ids2.length===6, JSON.stringify(ids2));
const ids3=await page.evaluate(()=>{ window.__dd.step(1/60,60); return window.__meta.stock().map(s=>s.id); });
check("…and not again on later frames", JSON.stringify(ids3)===JSON.stringify(ids2), "");
// HUD gold/xp update behind the start screen
await page.reload(); await ready(page);
const hud=await page.evaluate(()=>{ const M=window.__meta; M.reset(); M.giveGold(3000); M.addXP(5000); return {phase:window.__dd.S.phase,gold:document.getElementById('gold').textContent,xp:document.getElementById('xpline').textContent,lvl:M.level()}; });
check("HUD gold/xp refresh on the start screen, tavern number format", hud.phase==='start'&&hud.gold==='3,000'&&hud.xp.startsWith('Lv '+hud.lvl+' · ')&&/ \/ [\d,]+ xp/.test(hud.xp), JSON.stringify(hud));
// familiar swaps release their geometries
const leak=await page.evaluate(async()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.resetGear(); d.start(); d.step(1/60,2); for(let i=0;i<200&&!(window.__weapons&&window.__weapons.state().mounted&&/v2/.test(d.heroModel().label)&&d.mobModel('ogre'));i++){ d.step(1/60,1); await new Promise(r=>setTimeout(r,50)); } d.step(1/60,5); d.shot(64,64); const g0=d.r.info.memory.geometries; /* lazily fetched hero, sword and mob models have landed */ const kinds=['Wisp','Bat','Sprite','Fire Imp','Crystal Owl','Storm Drake']; for(let i=0;i<12;i++){ const it=d.rollItem(2,'familiar',3); it.name='Fine '+kinds[i%6]; M.giveItem(it); M.equip(it.id); d.step(1/60,2); d.shot(64,64); } const g1=d.r.info.memory.geometries; M.unequip('familiar'); d.step(1/60,2); d.shot(64,64); return {g0,g1,g2:d.r.info.memory.geometries}; });
check("12 familiar swaps + unequip leave renderer geometry count where it started (±2)", Math.abs(leak.g2-leak.g0)<=2&&leak.g1-leak.g0<20, JSON.stringify(leak));
// no rendering under the tavern
const rend=await page.evaluate(async()=>{ const d=window.__dd; const c0=d.r.info.render.frame; await new Promise(r=>setTimeout(r,400)); const c1=d.r.info.render.frame; d.Meta.open(); await new Promise(r=>setTimeout(r,400)); const c2=d.r.info.render.frame; await new Promise(r=>setTimeout(r,400)); const c3=d.r.info.render.frame; window.__tavern.close(); return {play:c1-c0,open:c3-c2}; });
check("renderer idles while the tavern is open", rend.play>0&&rend.open===0, JSON.stringify(rend));
// shop buy buttons line up across a row
const rows=await page.evaluate(()=>{ window.__meta.reset(); window.__dd.Meta.open(); window.__tavern.tab('shop'); window.__tavern.render(); const bs=[...document.querySelectorAll('#tv-shop [data-act=buy]')].map(b=>b.getBoundingClientRect()); const byRow={}; for(const r of bs){ const card=Math.round(r.top/100); } const cards=[...document.querySelectorAll('#tv-shop .tv-card')].map(c=>({top:Math.round(c.getBoundingClientRect().top),btn:Math.round(c.querySelector('[data-act=buy]').getBoundingClientRect().top)})); const groups={}; for(const c of cards){ (groups[c.top]=groups[c.top]||[]).push(c.btn); } window.__tavern.close(); return Object.values(groups).map(g=>Math.max(...g)-Math.min(...g)); });
check("Buy buttons share a baseline within each shop row", rows.length>0&&rows.every(d=>d<=1), JSON.stringify(rows));
check("desktop: no page errors", log.errors.length===0, log.errors.join(" | "));
await page.close();

// ---------- phone portrait: dead end + detail panel + toast ----------
page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}); log=listen(page);
await page.goto("http://127.0.0.1:8820/?silent&nogate"); await ready(page); await page.tap('#playbtn'); await page.waitForTimeout(200);
await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.startWave(); d.S.crystal=1; const o=d.spawn('ogre','N'); o.x=0; o.z=-3.2; let n=0; while(d.S.phase!=='dead'&&n++<3000) d.step(1/60,1); });
const sum=await page.evaluate(()=>({phase:window.__dd.S.phase,sum:window.__tavern.state().sum,banner:getComputedStyle(document.getElementById('banner')).opacity}));
check("phone: crystal falls → summary, wave banner hidden", sum.phase==='dead'&&sum.sum&&sum.banner==='0', JSON.stringify(sum));
await page.tap('#tv-totavern'); await page.waitForTimeout(100); await page.tap('#tv-close'); await page.waitForTimeout(100);
const dead=await page.evaluate(()=>{ const hb=[...document.querySelectorAll('#btns .hb')].find(b=>b.textContent==='🎒'); const c=e=>{ const r=e.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return el&&(el.id||el.className); }; return {deadShown:!document.getElementById('dead').classList.contains('hide'),open:window.__dd.Meta.isOpen(),hb:c(hb),bag:c(document.getElementById('bagbtn')),tavbtn:!!document.getElementById('deadtavbtn')&&c(document.getElementById('deadtavbtn'))}; });
check("phone: after ✕ on the post-run tavern the 🎒 buttons and a 🍺 TAVERN button are reachable", dead.deadShown&&!dead.open&&dead.hb==='hb'&&dead.bag==='bagbtn'&&dead.tavbtn==='deadtavbtn', JSON.stringify(dead));
await page.tap('#deadtavbtn'); await page.waitForTimeout(100);
const reopen=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),sum:window.__tavern.state().sum,msgOn:document.getElementById('tv-msg').classList.contains('on')}));
check("🍺 TAVERN on the dead screen re-opens the tavern (no stale message)", reopen.open&&!reopen.sum&&!reopen.msgOn, JSON.stringify(reopen));
const det=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.resetGear(); for(let i=0;i<6;i++) M.giveItem(d.rollItem(1,'weapon',2)); window.__tavern.tab('bag'); window.__tavern.render(); document.querySelector('#tv-bag .tv-card[data-from=bag]').click(); const a=document.getElementById('tv-defend').getBoundingClientRect(), b=document.getElementById('tv-detail').getBoundingClientRect(); return {defendBottom:a.bottom,defendTop:a.top,detailBottom:b.bottom,detailTop:b.top,covered:!(a.bottom<=b.top||a.top>=b.bottom)}; });
check("phone: the detail panel sits above the DEFEND footer", !det.covered&&det.detailBottom<=det.defendTop+1, JSON.stringify(det));
await page.screenshot({path:SP+"/parts/shots/fix-r2-phone-detail.png"});
const toast=await page.evaluate(()=>{ window.__tavern.close(); const d=window.__dd; d.S.phase='build'; const it=d.rollItem(4,'armor',9); it.name='Crystalheart Plate Harness of Goblin Slaying'; window.__meta.reset(); for(let i=0;i<24;i++) window.__meta.giveItem(d.rollItem(1,'charm',2)); d.Meta.onPickup(it,{x:d.hero.x,y:0,z:d.hero.z}); d.step(1/60,1); const r=document.getElementById('toast').getBoundingClientRect(); return {w:r.width,l:r.left,r:r.right,txt:document.getElementById('toast').textContent}; });
check("phone: a long toast uses the full width (16px gutters)", Math.abs(toast.w-358)<2&&toast.l>=15&&toast.r<=375, JSON.stringify(toast));
await page.close();

// ---------- phone landscape ----------
page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2}); log=listen(page);
await page.goto("http://127.0.0.1:8820/?silent&nogate"); await ready(page); await page.evaluate(()=>{ window.__dd.start(); window.__dd.step(1/60,5); });
const land=await page.evaluate(()=>{ const R=id=>document.getElementById(id).getBoundingClientRect(); const hbs=[...document.querySelectorAll('#btns .hb')].map(b=>b.getBoundingClientRect()); const hit=(a,b)=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom); const hud=['wavebtn','sndbtn','bagbtn','topC','hotbar','joy','prompt'].map(R); const overlaps=[]; hbs.forEach((h,i)=>hud.forEach((u,j)=>{ if(u.width&&hit(h,u)) overlaps.push(i+':'+['wavebtn','sndbtn','bagbtn','topC','hotbar','joy','prompt'][j]); })); return {n:hbs.length,onScreen:hbs.every(h=>h.top>=0&&h.bottom<=390&&h.left>=0&&h.right<=844),size:hbs.map(h=>Math.round(h.height)),overlaps,btns:[Math.round(R('btns').top),Math.round(R('btns').bottom)]}; });
check("landscape: all 6 touch buttons on screen and clear of the HUD", land.n===6&&land.onScreen&&land.overlaps.length===0, JSON.stringify(land));
await page.screenshot({path:SP+"/parts/shots/fix-r2-land-hud.png"});
const lt=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.resetGear(); for(let i=0;i<8;i++) M.giveItem(d.rollItem(1,'weapon',2)); d.Meta.open(); window.__tavern.tab('bag'); window.__tavern.render(); document.querySelector('#tv-bag .tv-card[data-from=bag]').click(); const b=document.getElementById('tv-body').getBoundingClientRect(), p=document.getElementById('tv-detail').getBoundingClientRect(), f=document.getElementById('tv-defend').getBoundingClientRect(); const sel=document.querySelector('.tv-card.sel').getBoundingClientRect(); return {bodyH:Math.round(b.height),panelTop:Math.round(p.top),bodyTop:Math.round(b.top),panelLeft:Math.round(p.left),panelBottom:Math.round(p.bottom),defendTop:Math.round(f.top),listVisibleW:Math.round(p.left-b.left),selVisible:sel.right<=p.left+1&&sel.top>=b.top-1&&sel.bottom<=b.bottom+1,tabH:Math.round(document.getElementById('tv-tab-bag').getBoundingClientRect().height)}; });
check("landscape tavern: detail panel is a right column beside a visible list, above the footer, selected card in view", lt.bodyH>=150&&lt.panelTop>=lt.bodyTop-1&&lt.listVisibleW>=380&&lt.panelBottom<=lt.defendTop+1&&lt.selVisible, JSON.stringify(lt));
await page.screenshot({path:SP+"/parts/shots/fix-r2-land-detail.png"});
check("phone pages: no errors or warnings", log.errors.length===0&&log.warns.length===0, [...log.errors,...log.warns].join(" | "));
await page.close();
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} fix-r2 checks passed`); process.exit(f?1:0);
