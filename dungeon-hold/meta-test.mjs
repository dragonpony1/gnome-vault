// meta-test.mjs — integration suite for the meta-game (10-meta.js + 20-tavern.js + 30-familiar.js), per parts/DESIGN.md "Integration + tests".
// SP=<scratchpad> node meta-test.mjs   (port 8810; phone viewport; screenshots → parts/shots/meta-*.png)
import { chromium } from "playwright"; import http from "http"; import fs from "fs"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8810);   // FILE/DIST aware like the other suites (assets/ fetches 404 in file mode instead of returning html)
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const SHOT=SP+"/parts/shots/"; const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const errors=[], warns=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,200)); else if(m.type()==="warning") warns.push(m.text().slice(0,200)); });
const overflow=()=>page.evaluate(()=>{ const de=document.documentElement; const bad=[]; document.querySelectorAll('#tavern *').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.width>0&&(r.right>innerWidth+1||r.left<-1)) bad.push(el.className||el.id||el.tagName); }); return {sw:de.scrollWidth,iw:innerWidth,ok:de.scrollWidth<=innerWidth&&bad.length===0,bad:bad.slice(0,5)}; });
const settle=()=>page.waitForFunction(()=>window.__tavern.goldShown()===window.__meta.gold(),null,{timeout:20000}).catch(()=>{});
await page.goto("http://127.0.0.1:8810/?silent&nogate"); await ready(page); await page.waitForTimeout(300);
// ---- load ----
const boot=await page.evaluate(()=>({line:document.getElementById('buildline').textContent,meta:window.__meta===window.__dd.Meta,tavern:!!window.__tavern,fam:!!window.__familiar,gold:!!document.getElementById('gold'),xp:!!document.getElementById('xpline'),tv:!!document.getElementById('tavern'),phase:window.__dd.S.phase}));
check("build line reads build 14+", /build (1[4-9]|[2-9]\d)/.test(boot.line), boot.line);
check("modules loaded: Meta hook, tavern DOM, familiar, HUD gold + xp line", boot.meta&&boot.tavern&&boot.fam&&boot.gold&&boot.xp&&boot.tv&&boot.phase==='start', JSON.stringify(boot));
check("no console errors or warnings on load", errors.length===0&&warns.length===0, [...errors,...warns].join(" | ").slice(0,300));
// ---- fresh state + the three ways in from the start screen ----
const fresh=await page.evaluate(()=>{ const M=window.__meta; M.reset(); return {gold:M.gold(),level:M.level(),xp:M.xp(),points:M.points(),bag:M.bag().length,stock:M.stock().length,tier:M.tierLine(),best:M.best()}; });
check("Meta.reset → fresh state with 6 tier-1 stock", fresh.gold===0&&fresh.level===1&&fresh.xp===0&&fresh.points===0&&fresh.bag===0&&fresh.stock===6&&/^Tier 1 stock · reach wave \d+ for tier 2$/.test(fresh.tier), JSON.stringify(fresh));
await page.click('#tavbtn'); await page.waitForTimeout(100);
const viaTav=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),vis:!document.getElementById('tavern').classList.contains('hide'),lbl:document.getElementById('tv-defend').textContent}));
check("start screen TAVERN button opens the overlay", viaTav.open&&viaTav.vis&&/DEFEND THE HALL$/.test(viaTav.lbl), JSON.stringify(viaTav));
check("no console errors or warnings on Meta.open()", errors.length===0&&warns.length===0, [...errors,...warns].join(" | ").slice(0,300));
await page.keyboard.press('Escape'); await page.waitForTimeout(60);
const esc=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),phase:window.__dd.S.phase})); check("Escape closes it (still on the start screen)", !esc.open&&esc.phase==='start', JSON.stringify(esc));
await page.keyboard.press('KeyI'); await page.waitForTimeout(60); const viaI=await page.evaluate(()=>window.__dd.Meta.isOpen());
await page.keyboard.press('KeyI'); await page.waitForTimeout(60); const viaI2=await page.evaluate(()=>window.__dd.Meta.isOpen());
check("I opens, I again closes (game.js does not re-open it)", viaI===true&&viaI2===false, JSON.stringify({viaI,viaI2}));
await page.evaluate(()=>window.__dd.Meta.open()); await page.keyboard.press('KeyB'); await page.waitForTimeout(60); const viaB=await page.evaluate(()=>window.__dd.Meta.isOpen());
check("B closes it too", viaB===false, String(viaB));
// ---- into the hall: pickup → bag ----
const pick=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.start(); d.step(1/60,3); const it=d.rollItem(4,'weapon',4); d.dropLoot(it,d.hero.x,d.hero.z); d.step(1/60,120); return {id:it.id,name:it.name,bag:M.bag().map(b=>b.id),loot:d.loot.length,weapon:d.gear().weapon,toast:document.getElementById('toast').textContent,hud:document.getElementById('gear').textContent}; });
check("pickup → bag (not equipped), toast says bagged", pick.bag.length===1&&pick.bag[0]===pick.id&&pick.loot===0&&!pick.weapon&&pick.toast.includes(pick.name)&&/bagged/.test(pick.toast), JSON.stringify(pick).slice(0,300));
// ---- kill → xp ----
const kx=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const x0=M.xp(); const g=d.spawn('goblin','N'); d.kill(g); const o=d.spawn('ogre','N'); d.kill(o); d.step(1/60,2); return {x0,x1:M.xp(),line:document.getElementById('xpline').textContent}; });
check("goblin + ogre kills = 42 xp, HUD xp line updates", kx.x1-kx.x0===42&&/42 ?\/ ?100 xp/.test(kx.line), JSON.stringify(kx));
// ---- wave held → gold + xp ----
const wv=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.step(1/60,120); const x0=M.xp(), g0=M.gold(); let killXp=0; d.startWave(); let guard=0; while(d.S.phase==='wave'&&guard++<400){ d.step(1/60,15); for(const e of d.enemies) if(!e.dead){ killXp+=M.XP[e.kind]; d.kill(e); } } d.step(1/60,2);
  return {phase:d.S.phase,wave:d.S.wave,gold:M.gold()-g0,xp:M.xp()-x0,killXp,hudGold:document.getElementById('gold').textContent,total:M.gold()}; });
check("wave 1 held → +15 gold and +30 xp (+kill xp), HUD gold updates", wv.phase==='build'&&wv.wave===1&&wv.gold===15&&wv.xp===30+wv.killXp&&wv.hudGold===wv.total.toLocaleString('en-US'), JSON.stringify(wv));
// ---- level up → point; spend → heroMult → heroDmg ----
const lv=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const L0=M.level(); M.addXP(1000); const toast=document.getElementById('toast').textContent; const L1=M.level(); return {L0,L1,points:M.points(),toast,next:M.xpToNext(L1),xp:M.xp()}; });
check("xp overflow levels up (multi-level), points = level-1, level toast", lv.L1>lv.L0+1&&lv.points===lv.L1-1&&/LEVEL \d+/.test(lv.toast)&&lv.xp<lv.next, JSON.stringify(lv));
const sp=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const base=d.heroDmg(), max0=d.hero.max, p0=M.points(); M.spend('blade'); M.spend('blade'); M.spend('vigor'); return {base,dmg:d.heroDmg(),mult:d.heroMult('dmg'),max0,max1:d.hero.max,p0,p1:M.points(),val:M.skillValue('blade')}; });
check("spend blade x2 → heroMult('dmg')=1.16 and heroDmg up; vigor → hero.max up; 3 points gone", Math.abs(sp.mult-1.16)<1e-9&&sp.dmg>sp.base&&sp.max1>sp.max0&&sp.p1===sp.p0-3&&/\+16% hero damage/.test(sp.val), JSON.stringify(sp));
// ---- equip / sell / sell junk / buy / restock / tier line (rules) ----
const eq=await page.evaluate(id=>{ const d=window.__dd, M=window.__meta; const base=d.heroDmg(); const ok=M.equip(id); const w=d.gear().weapon; const worse=d.rollItem(0,'weapon',1); worse.score=.1; M.giveItem(worse); const ok2=M.equip(worse.id); return {ok,worn:w&&w.id===id,dmg:d.heroDmg(),base,ok2,worn2:d.gear().weapon.id===worse.id,bagHasOld:M.bag().some(b=>b.id===id),bag:M.bag().length}; },pick.id);
check("equip from the bag swaps into the slot, old one returns to the bag", eq.ok&&eq.worn&&eq.dmg>eq.base&&eq.ok2&&eq.worn2&&eq.bagHasOld&&eq.bag===1, JSON.stringify(eq));
const sl=await page.evaluate(id=>{ const d=window.__dd, M=window.__meta; const g0=M.gold(); M.equip(id); const arm=d.rollItem(2,'armor',3); M.giveItem(arm); M.equip(arm.id); const junk=d.rollItem(0,'armor',1); M.giveItem(junk); const worseW=d.rollItem(2,'weapon',1); worseW.score=.5; M.giveItem(worseW); const good=d.rollItem(3,'charm',5); M.giveItem(good); const r=M.sellJunk(); const g1=M.gold(); const got=M.sell(good.id); d.step(1/60,1); return {g0,r,g1,got,value:good.value,g2:M.gold(),bag:M.bag().length,hud:document.getElementById('gold').textContent}; },pick.id);
check("sellJunk sells the common (slot worn) + the worse weapon; sell pays value; HUD gold follows", sl.r.n===3&&sl.g1-sl.g0===sl.r.gold&&sl.got===sl.value&&sl.g2===sl.g1+sl.value&&sl.bag===0&&sl.hud===sl.g2.toLocaleString('en-US'), JSON.stringify(sl));
const buy=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.giveGold(-M.gold()); const poor=M.canBuy(0); const it=M.stock()[0]; M.giveGold(M.buyPrice(it)+500); const g0=M.gold(); const ok=M.buy(0); const stock5=M.stock().length; const rc=M.restockCost(); const g1=M.gold(); const rok=M.restock(); return {poor,price:M.buyPrice(it),value:it.value,ok,spent:g0-g1,stock5,bagHas:M.bag().some(b=>b.id===it.id),rc,rok,g2:M.gold(),g1,stock6:M.stock().length,tier:M.tierLine(),slots:M.stock().map(s=>s.slot),minR:Math.min(...M.stock().map(s=>s.rarity)),maxR:Math.max(...M.stock().map(s=>s.rarity))}; });
check("buy refused when poor (reason), buy = 3x value into the bag, stock shrinks", !buy.poor.ok&&/gold/.test(buy.poor.why)&&buy.ok&&buy.spent===buy.value*3&&buy.stock5===5&&buy.bagHas, JSON.stringify(buy).slice(0,300));
check("restock costs 40*tier, refills 6 (Uncommon+, a Rare+, a familiar, an amulet)", buy.rok&&buy.rc===40&&buy.g1-buy.g2===40&&buy.stock6===6&&buy.minR>=1&&buy.maxR>=2&&buy.slots.includes('familiar')&&buy.slots.includes('amulet'), JSON.stringify(buy).slice(0,300));
check("shop tier line", /^Tier 1 stock · (reach wave 1 for tier 2|tier 2 wares arrive after this run)$/.test(buy.tier), buy.tier);   // mid-run, once wave 1 is held, the line promises the next tier after the run instead of "reach wave 1"
// ---- bag full → auto-sell ----
const full=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; for(const l of d.loot) d.scene.remove(l.mesh); d.loot.length=0; while(M.bag().length<M.BAG_CAP) M.giveItem(d.rollItem(1,'charm',2)); const g0=M.gold(); const it=d.rollItem(2,'amulet',3); d.dropLoot(it,d.hero.x,d.hero.z); d.step(1/60,120); return {bag:M.bag().length,gain:M.gold()-g0,value:it.value,toast:document.getElementById('toast').textContent,loot:d.loot.length}; });
check("full bag: the item sells itself for its value with the 'Bag is full' toast", full.bag===24&&full.gain===full.value&&/Bag is full/.test(full.toast)&&full.loot===0, JSON.stringify(full));
// ---- respec ----
const rs=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.sellJunk(); M.giveGold(1000); const cost=M.respecCost(), g0=M.gold(), spent=M.spentPoints(); const can=M.canRespec(); const ok=M.respec(); return {cost,level:M.level(),can,ok,spent,points:M.points(),mult:d.heroMult('dmg'),paid:g0-M.gold()}; });
check("respec refunds all points for 100*level gold", rs.can&&rs.ok&&rs.spent===3&&rs.points===rs.level-1&&rs.mult===1&&rs.cost===100*rs.level&&rs.paid===rs.cost, JSON.stringify(rs));
// ---- overlay in play: blocks game keys, 🎒 HUD button opens it, gold counter ----
await page.click('#bagbtn'); await page.waitForTimeout(100);
const openPlay=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),phase:window.__dd.S.phase,lbl:document.getElementById('tv-defend').textContent,plock:!document.pointerLockElement}));
check("🎒 HUD button opens the tavern in play", openPlay.open&&openPlay.phase==='build'&&/BACK TO THE HALL/.test(openPlay.lbl)&&openPlay.plock, JSON.stringify(openPlay));
await page.keyboard.press('KeyG'); await page.keyboard.down('KeyW'); await page.waitForTimeout(80); await page.keyboard.up('KeyW'); await page.keyboard.press('Digit1'); await page.waitForTimeout(60);
const blocked=await page.evaluate(()=>{ const d=window.__dd; const x0=d.hero.x, z0=d.hero.z; d.step(1/60,30); return {phase:d.S.phase,moved:Math.hypot(d.hero.x-x0,d.hero.z-z0),ghost:!!d.ghost(),open:d.Meta.isOpen(),tab:window.__tavern.state().tab}; });
check("G / W / 1 are ignored by the game while the tavern is open (1 switches tabs)", blocked.phase==='build'&&blocked.moved<1e-6&&!blocked.ghost&&blocked.open&&blocked.tab==='bag', JSON.stringify(blocked));
const tw=await page.evaluate(()=>{ const T=window.__tavern, M=window.__meta; const a=T.goldShown(); M.giveGold(1000); T.tick(.1); const mid=T.goldShown(), cls=document.getElementById('tv-gold').className, txt=document.getElementById('tv-goldn').textContent; T.tick(.6); return {a,mid,done:T.goldShown(),to:M.gold(),cls,txt,land:document.getElementById('tv-goldn').textContent}; });
check("gold counter tweens up (eased) and lands on the exact formatted total", tw.mid>tw.a&&tw.mid<tw.to&&Math.abs(tw.mid-(tw.a+421))<=3&&tw.done===tw.to&&/up/.test(tw.cls)&&tw.txt===tw.mid.toLocaleString('en-US')&&tw.land===tw.to.toLocaleString('en-US'), JSON.stringify(tw));
// ---- phone screenshots of each tab, no horizontal overflow ----
await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; while(M.bag().length>12) M.sell(M.bag()[0].id); for(let i=0;i<5;i++) M.giveItem(d.rollItem(i,d.SLOTS[i],2+i*2)); window.__tavern.tab('bag'); window.__tavern.render(); }); await page.waitForTimeout(250);
await page.screenshot({path:SHOT+"meta-bag.png"}); const o1=await overflow(); check("bag tab: no horizontal overflow (meta-bag.png)", o1.ok, JSON.stringify(o1));
await page.click('#tv-bag .tv-grid .tv-card'); await page.waitForTimeout(150); await page.screenshot({path:SHOT+"meta-detail.png"}); const o1b=await overflow();
const det=await page.evaluate(()=>{ const el=document.getElementById('tv-detail'); return {vis:!el.classList.contains('hide'),equip:!!el.querySelector('[data-act=equip]'),sell:/Sell \(\d/.test((el.querySelector('[data-act=sell]')||{}).textContent||'')}; });
check("detail sheet: Equip + Sell (N gold), no overflow (meta-detail.png)", det.vis&&det.equip&&det.sell&&o1b.ok, JSON.stringify({det,o1b}));
await page.click('#tv-tab-shop'); await page.waitForTimeout(250); await page.screenshot({path:SHOT+"meta-shop.png"}); const o2=await overflow();
const shop=await page.evaluate(()=>({cards:document.querySelectorAll('#tv-shop .tv-card').length,tier:document.querySelector('#tv-shop .tv-n').textContent,buy:document.querySelector('#tv-shop [data-act=buy]').textContent}));
check("shop tab: 6 cards, tier line, Buy prices, no overflow (meta-shop.png)", o2.ok&&shop.cards===6&&/Tier 1 stock/.test(shop.tier)&&/Buy \(\d/.test(shop.buy), JSON.stringify({o2,shop}));
await page.click('#tv-tab-skills'); await page.waitForTimeout(250); await page.screenshot({path:SHOT+"meta-skills.png"}); const o3=await overflow();
const sk=await page.evaluate(()=>({rows:document.querySelectorAll('#tv-skills .tv-sk').length,plus:document.querySelectorAll('#tv-skills [data-act=spend]:not([disabled])').length,respec:document.getElementById('tv-respec').textContent}));
check("skills tab: 7 rows, + enabled with points, Respec (N gold), no overflow (meta-skills.png)", o3.ok&&sk.rows===7&&sk.plus===7&&/Respec \(\d/.test(sk.respec), JSON.stringify({o3,sk}));
await page.click('#tv-close'); await page.waitForTimeout(60);
// ---- game.js's own sell() (X key / __dd.sell) must still sell a defense: 10-meta's bag sell is sellItem, not a same-scope clobber ----
const ds=await page.evaluate(()=>{ const d=window.__dd; d.addMana(1000); const t=d.place('harpoon',16,12,0); const n0=d.defs.length, m0=d.S.mana; d.setHero(t.x,t.z+1.2,0); d.step(1/60,2); d.sell(); return {placed:!!t,n0,n1:d.defs.length,refund:d.S.mana-m0}; });
check("defense sell() still works (module did not clobber it)", ds.placed&&ds.n0>=1&&ds.n1===ds.n0-1&&ds.refund>0, JSON.stringify(ds));
// ---- familiar shoots and damages an enemy ----
const fam=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, F=window.__familiar; for(const e of d.enemies) if(!e.dead) d.kill(e); d.step(1/60,80); const it=d.rollItem(3,'familiar',6); const gave=M.giveItem(it), eqd=M.equip(it.id); d.step(1/60,5); const st=F.state(); d.setHero(0,10,Math.PI); d.step(1/60,5);
  const e=d.spawn('goblin','N'); e.x=d.hero.x; e.z=d.hero.z-4; const hp0=e.hp; let minHp=hp0, bolts=0, swung=false; for(let i=0;i<200;i++){ d.step(1/60,1); e.x=d.hero.x; e.z=d.hero.z-4; if(e.hp<minHp) minHp=e.hp; bolts=Math.max(bolts,F.bolts()); if(d.hero.swingT>=0) swung=true; if(e.dead) break; }
  return {gave,eqd,pet:!!st&&st.inScene&&st.visible,kind:st&&st.kind,name:it.name,hp0,minHp,dead:!!e.dead,bolts,swung}; });
check("equipped familiar appears and its attack damages a goblin (hero never swung)", fam.pet&&fam.name.includes(fam.kind)&&(fam.minHp<fam.hp0||fam.dead)&&!fam.swung, JSON.stringify(fam));
// ---- persistence across a reload ----
const before=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.spend('blade'); const s=M.state(); return {gold:s.gold,level:s.level,xp:s.xp,skills:s.skills,bag:s.bag.map(b=>b.id),runs:s.runs,best:s.best,gear:Object.fromEntries(d.SLOTS.map(k=>[k,d.gear()[k]&&d.gear()[k].id]))}; });
await page.reload(); await ready(page);
const after=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const s=M.state(); return {gold:s.gold,level:s.level,xp:s.xp,skills:s.skills,bag:s.bag.map(b=>b.id),runs:s.runs,best:s.best,gear:Object.fromEntries(d.SLOTS.map(k=>[k,d.gear()[k]&&d.gear()[k].id])),mult:d.heroMult('dmg'),hp:d.hero.hp,max:d.hero.max,hud:document.getElementById('gold').textContent,xpline:document.getElementById('xpline').textContent}; });
check("gold / level / xp / skills / bag / gear survive a reload; runs+1; skills applied at boot", after.gold===before.gold&&after.level===before.level&&after.xp===before.xp&&JSON.stringify(after.skills)===JSON.stringify(before.skills)&&JSON.stringify(after.bag)===JSON.stringify(before.bag)&&JSON.stringify(after.gear)===JSON.stringify(before.gear)&&after.runs===before.runs+1&&Math.abs(after.mult-1.08)<1e-9&&after.hp===after.max&&after.hud===after.gold.toLocaleString('en-US')&&after.xpline.startsWith('Lv '+after.level), JSON.stringify({before,after}).slice(0,400));
// ---- run end: the crystal falls → summary → tavern ----
const end=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.start(); d.step(1/60,3); M.unequip('familiar'); d.setHero(20,20,0); d.S.wave=5; d.S.crystal=1; const g0=M.gold(), best0=M.best(); d.spawn('ogre','N'); let n=0; while(d.S.phase!=='dead'&&n++<6000) d.step(1/60,1); d.step(1/60,3);
  const sum=document.getElementById('tv-sum'); return {phase:d.S.phase,steps:n,open:d.Meta.isOpen(),sumVis:!sum.classList.contains('hide'),deadHidden:document.getElementById('dead').classList.contains('hide'),h2:(sum.querySelector('h2')||{}).textContent,tiles:sum.querySelectorAll('.tv-stat').length,best:M.best(),best0,paid:M.gold()-g0,pet:window.__familiar.state()}; });
check("crystal falls → run summary (wave 5, 4 tiles), old #dead suppressed, best + 25*w gold, pet gone", end.phase==='dead'&&end.open&&end.sumVis&&end.deadHidden&&/WAVE 5/.test(end.h2)&&end.tiles===4&&end.best===5&&end.paid===125&&end.pet===null, JSON.stringify(end).slice(0,400));
await page.waitForTimeout(250); await page.screenshot({path:SHOT+"meta-summary.png"}); const o4=await overflow(); check("summary: no horizontal overflow (meta-summary.png)", o4.ok, JSON.stringify(o4));
await page.click('#tv-totavern'); await page.waitForTimeout(40);
const tt=await page.evaluate(()=>({sum:window.__tavern.state().sum,tab:window.__tavern.state().tab,shown:window.__tavern.goldShown(),to:window.__meta.gold(),lbl:document.getElementById('tv-defend').textContent,tier:window.__meta.tierLine()}));
await settle(); const tt2=await page.evaluate(()=>window.__tavern.goldShown());
check("TO THE TAVERN → bag tab, gold counts up to the new total, tier 3 stock unlocked", !tt.sum&&tt.tab==='bag'&&tt.shown<tt.to&&tt2===tt.to&&/AGAIN/.test(tt.lbl)&&/^Tier 3 stock/.test(tt.tier), JSON.stringify({tt,tt2}));
await page.click('#tv-close'); await page.waitForTimeout(60);
const closedDead=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),dead:!document.getElementById('dead').classList.contains('hide'),wave:document.getElementById('deadwave').textContent}));
check("closing the tavern after the fall reveals the old dead screen (TRY AGAIN reachable)", !closedDead.open&&closedDead.dead&&closedDead.wave==='5', JSON.stringify(closedDead));
check("no console errors or warnings during the run", errors.length===0&&warns.length===0, [...errors,...warns].join(" | ").slice(0,400));
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} meta checks passed`); process.exit(f?1:0);
