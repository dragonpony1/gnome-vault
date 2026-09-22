// verify-loop-r2-test.mjs — adversarial round 2: the player's loop end to end through the real UI (port 8830).
// SP=<scratchpad> node verify-loop-r2-test.mjs
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8830);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const log=(n,d)=>console.log("INFO "+n+"  -> "+(typeof d==='string'?d:JSON.stringify(d)).slice(0,700));
const SHOT=SP+"/parts/shots/";
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const ctx=await browser.newContext({viewport:{width:1280,height:800}}); const page=await ctx.newPage();
const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if((m.type()==="error"||m.type()==="warning")&&!/assets\/|404/.test(m.text())) errors.push(m.type()+": "+m.text().slice(0,200)); });
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:60000});
const settle=()=>page.waitForFunction(()=>window.__tavern.goldShown()===window.__meta.gold(),null,{timeout:5000}).then(()=>true).catch(()=>false);
const ui=()=>page.evaluate(()=>{ const T=window.__tavern.state(); return {open:window.__dd.Meta.isOpen(),tab:T.tab,sum:T.sum,goldTxt:document.getElementById('tv-goldn').textContent,goldHud:document.getElementById('gold').textContent,gold:window.__meta.gold(),msg:document.getElementById('tv-msg').textContent,xp:document.getElementById('tv-xpt').textContent,lv:document.getElementById('tv-lv').textContent,pts:document.getElementById('tv-pts').textContent,xpline:document.getElementById('xpline').textContent,phase:window.__dd.S.phase,defend:document.getElementById('tv-defend').textContent,detail:!document.getElementById('tv-detail').classList.contains('hide')}; });
const totalXP=()=>page.evaluate(()=>{ const M=window.__meta; let t=M.xp(); for(let l=1;l<M.level();l++) t+=M.xpToNext(l); return t; });
const tally={xp:0,goldEarned:0,goldSpent:0,given:0,kills:0,drops:0};
await page.goto("http://127.0.0.1:8830/?silent"); await ready(page); await page.waitForTimeout(300);
await page.evaluate(()=>{ window.__meta.reset(); });
// ================= 1. start a run from the start screen =================
await page.click('#playbtn'); await page.waitForTimeout(150);
const st1=await page.evaluate(()=>({phase:window.__dd.S.phase,startHidden:document.getElementById('start').classList.contains('hide'),gold:document.getElementById('gold').textContent,xp:document.getElementById('xpline').textContent,hp:window.__dd.hero.hp,max:window.__dd.hero.max}));
check("PLAY → build phase, HUD shows 0 gold, Lv 1 · 0/100 xp", st1.phase==='build'&&st1.startHidden&&st1.gold==='0'&&/Lv 1 · 0\/100 xp/.test(st1.xp), JSON.stringify(st1));
// ================= 2. kill enemies with the hook, walk over drops (real walking with W) =================
const k1=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const x0=M.xp(); const kinds=['goblin','goblin','archer','orc','ogre']; let exp=0; for(const k of kinds){ const e=d.spawn(k,'N'); exp+=M.XP[k]; d.kill(e); } d.step(1/60,2); return {x0,x1:M.xp(),exp,kills:d.S.kills,line:document.getElementById('xpline').textContent}; });
tally.xp+=k1.exp; tally.kills+=5;
check("5 kills (gob,gob,archer,orc,ogre) = 56 xp, HUD line 56/100", k1.x1-k1.x0===k1.exp&&k1.exp===56&&/56\/100/.test(k1.line), JSON.stringify(k1));
// drop three items ahead of the hero and WALK into them with the W key
const walk=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; for(const l of d.loot) d.scene.remove(l.mesh); d.loot.length=0; d.setHero(0,6,Math.PI); d.cam.yaw=0; d.step(1/60,2);
  const a=d.rollItem(3,'weapon',4), b=d.rollItem(1,'armor',2), c=d.rollItem(0,'weapon',1); c.score=.1; // c is a junk weapon
  d.dropLoot(a,0,7.6,true); d.dropLoot(b,0,8.6,true); d.dropLoot(c,0,9.6,true); d.step(1/60,30); const lootBefore=d.loot.length; const hz0=d.hero.z; const yaw=d.hero.yaw;
  d.setKeys({w:1}); d.step(1/60,240); d.setKeys({w:0}); d.step(1/60,5);
  return {ids:[a.id,b.id,c.id],names:[a.name,b.name,c.name],values:[a.value,b.value,c.value],lootBefore,lootAfter:d.loot.length,hz0,hz1:d.hero.z,yaw,bag:M.bag().map(x=>x.id),gear:Object.fromEntries(Object.entries(d.gear()).map(([k,v])=>[k,v&&v.id])),toast:document.getElementById('toast').textContent,dmg:d.heroDmg(),max:d.hero.max}; });
log("walk over drops", walk);
const walked=walk.ids.every(id=>walk.bag.includes(id));
check("walking (W) over 3 drops bags all 3, gear untouched", walked&&walk.lootAfter===0&&!walk.gear.weapon&&!walk.gear.armor, JSON.stringify({bag:walk.bag,gear:walk.gear,lootAfter:walk.lootAfter}));
if(!walked){ await page.evaluate(()=>{ const d=window.__dd; for(const l of d.loot.slice()){ d.setHero(l.x,l.z); d.step(1/60,3); } }); }
tally.drops+=3;
check("toast names the last bagged item with 'bagged'", /bagged/.test(walk.toast), walk.toast);
// ================= 3. hold wave 1 =================
const tx0=await totalXP(); const w1=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const x0=M.xp(), g0=M.gold(), k0=d.S.kills; let killXp=0, n=0; d.startWave(); let guard=0; while(d.S.phase==='wave'&&guard++<600){ d.step(1/60,10); for(const e of d.enemies) if(!e.dead){ killXp+=M.XP[e.kind]; n++; d.kill(e); } } d.step(1/60,3);
  return {phase:d.S.phase,wave:d.S.wave,gold:M.gold()-g0,xp:M.xp()-x0,killXp,n,kills:d.S.kills-k0,hudGold:document.getElementById('gold').textContent,total:M.gold(),loot:d.loot.length,level:M.level(),points:M.points(),xpNow:M.xp(),toast:document.getElementById('toast').textContent}; });
tally.xp+=w1.killXp+30; tally.goldEarned+=15; tally.kills+=w1.n;
const tx1=await totalXP(); w1.xp=tx1-tx0; check("wave 1 held: +15 gold, +30 xp + kill xp (level 2 reached, toast); HUD gold = 15; reward loot dropped", w1.phase==='build'&&w1.wave===1&&w1.gold===15&&w1.xp===30+w1.killXp&&w1.level===2&&w1.points===1&&/LEVEL 2 — 1 skill point/.test(w1.toast)&&w1.hudGold==='15'&&w1.loot>=1, JSON.stringify(w1));
log("after wave 1", w1);
// pick the reward too
const rw=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const n0=M.bag().length; for(const l of d.loot.slice()){ d.setHero(l.x,l.z); d.step(1/60,5); } return {bag:M.bag().length,loot:d.loot.length,got:M.bag().length-n0}; });
tally.drops+=rw.got; check("wave reward (and any kill drop) walked over → bag grows, floor empty", rw.got>=1&&rw.loot===0, JSON.stringify(rw));
// ================= 4. open the tavern with the I key =================
await page.keyboard.press('KeyI'); await page.waitForTimeout(120);
let u=await ui(); check("I opens the tavern in play; counter shows 15 gold, header Lv/xp matches HUD", u.open&&u.tab==='bag'&&u.goldTxt==='15'&&/BACK TO THE HALL/.test(u.defend)&&u.xp===(w1.xpNow.toLocaleString('en-US')+' / 283 xp')&&u.lv==='Lv 2'&&u.pts==='1 point'&&u.xpline==='Lv 2 · '+w1.xpNow+'/283 xp · 1 point' , JSON.stringify(u));
await page.screenshot({path:SHOT+"r2-bag-open.png"});
// bag card count + junk count
const bagUi=await page.evaluate(()=>({cards:[...document.querySelectorAll('#tv-bag .tv-grid .tv-card')].map(c=>({id:c.dataset.id,vs:(c.querySelector('.vs')||{}).textContent||''})),junk:document.getElementById('tv-selljunk').textContent,junkDis:document.getElementById('tv-selljunk').disabled,n:document.querySelector('#tv-bag .tv-n').textContent}));
log("bag cards", bagUi);
check("bag shows "+(3+rw.got)+" cards, count "+(3+rw.got)+"/24, every card 'new slot' (nothing worn) and Sell junk disabled (nothing worn → nothing is junk)", bagUi.cards.length===3+rw.got&&bagUi.n===(3+rw.got)+'/24'&&bagUi.cards.every(c=>c.vs==='new slot')&&bagUi.junkDis, JSON.stringify(bagUi));
// ---- 4a. sell one item via the detail panel (the armor b) ----
await page.click('#tv-bag .tv-card[data-id="'+walk.ids[1]+'"]'); await page.waitForTimeout(120);
const det1=await page.evaluate(()=>{ const el=document.getElementById('tv-detail'); return {vis:!el.classList.contains('hide'),sell:(el.querySelector('[data-act=sell]')||{}).textContent,equip:!!el.querySelector('[data-act=equip]'),txt:el.textContent.replace(/\s+/g,' ').slice(0,200)}; });
check("tapping a bag card opens the detail with Equip + Sell (value gold)", det1.vis&&det1.equip&&det1.sell==='Sell ('+walk.values[1].toLocaleString('en-US')+' gold)', JSON.stringify(det1));
const g0=await page.evaluate(()=>window.__meta.gold());
await page.click('#tv-detail [data-act=sell]'); await page.waitForTimeout(80); const midSell=await ui(); const landed=await settle(); await page.waitForTimeout(120); u=await ui();
tally.goldEarned+=walk.values[1];
check("Sell: gold += value ("+walk.values[1]+"), counter lands, HUD gold agrees, message says sold", landed&&u.gold===g0+walk.values[1]&&u.goldTxt===u.gold.toLocaleString('en-US')&&u.goldHud===u.goldTxt&&new RegExp('Sold '+walk.names[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' for '+walk.values[1]+' gold').test(u.msg)&&!u.detail, JSON.stringify({g0,u,midSell}));
const bagAfterSell=await page.evaluate(()=>window.__meta.bag().length); check("bag now "+(2+rw.got), bagAfterSell===2+rw.got, String(bagAfterSell));
// ---- 4b. equip the good weapon a via detail → heroDmg rises, slot card shows it ----
const dmg0=await page.evaluate(()=>window.__dd.heroDmg());
await page.click('#tv-bag .tv-card[data-id="'+walk.ids[0]+'"]'); await page.waitForTimeout(100); await page.click('#tv-detail [data-act=equip]'); await page.waitForTimeout(120);
const eq1=await page.evaluate(id=>{ const d=window.__dd; const w=d.gear().weapon; const eqCard=[...document.querySelectorAll('#tv-bag .tv-eq .tv-card')].find(c=>c.dataset.id===id); const det=document.getElementById('tv-detail'); return {worn:w&&w.id===id,dmg:d.heroDmg(),eqCard:!!eqCard,detVis:!det.classList.contains('hide'),detTxt:det.textContent.replace(/\s+/g,' ').slice(0,160),msg:document.getElementById('tv-msg').textContent,hudGear:document.getElementById('gear').textContent.slice(0,120),bag:window.__meta.bag().length,junkBtn:document.getElementById('tv-selljunk').textContent,junkDis:document.getElementById('tv-selljunk').disabled,cards:[...document.querySelectorAll('#tv-bag .tv-grid .tv-card')].map(c=>(c.querySelector('.vs')||{}).textContent||'')}; },walk.ids[0]);
log("after equip", eq1);
check("Equip: weapon worn, heroDmg up ("+dmg0+" → "+eq1.dmg+"), equipped card + HUD gear show it, detail now WORN", eq1.worn&&eq1.dmg>dmg0&&eq1.eqCard&&eq1.detVis&&/WORN/.test(eq1.detTxt)&&/Equipped/.test(eq1.msg)&&eq1.bag===1+rw.got, JSON.stringify(eq1));
check("junk weapon now labelled ▼ vs worn and Sell junk (1) enabled", eq1.cards.some(v=>/▼/.test(v))&&/Sell junk \(1\)/.test(eq1.junkBtn)&&!eq1.junkDis, JSON.stringify({cards:eq1.cards,junk:eq1.junkBtn}));
// ---- 4c. sell junk ----
const g1=await page.evaluate(()=>window.__meta.gold());
await page.click('#tv-selljunk'); await page.waitForTimeout(60); await settle(); await page.waitForTimeout(100); u=await ui();
tally.goldEarned+=walk.values[2];
check("Sell junk: sold 1 item for junk value ("+walk.values[2]+"), gold adds up, counter+HUD agree", u.gold===g1+walk.values[2]&&/Sold 1 item for \d+ gold/.test(u.msg)&&u.goldTxt===u.gold.toLocaleString('en-US')&&u.goldHud===u.goldTxt, JSON.stringify({g1,u}));
const bagAfterJunk=await page.evaluate(()=>({bag:window.__meta.bag().length,gearWeapon:!!window.__dd.gear().weapon,junkDis:document.getElementById('tv-selljunk').disabled})); check("bag "+rw.got+" left (the wave reward), weapon still worn, Sell junk disabled again", bagAfterJunk.bag===rw.got&&bagAfterJunk.gearWeapon&&bagAfterJunk.junkDis, JSON.stringify(bagAfterJunk));
// ---- 4d. equip the armor via a second drop (hero.max check) — give it, re-render happens by version ----
const armor=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const it=d.rollItem(2,'armor',3); it.stats.hp=Math.max(it.stats.hp||0,20); M.giveItem(it); return {id:it.id,hp:it.stats.hp,max0:d.hero.max,hp0:d.hero.hp}; }); tally.given; await page.waitForTimeout(150);
await page.click('#tv-bag .tv-card[data-id="'+armor.id+'"]'); await page.waitForTimeout(100);
const detA=await page.evaluate(()=>document.getElementById('tv-detail').textContent.replace(/\s+/g,' '));
await page.click('#tv-detail [data-act=equip]'); await page.waitForTimeout(100);
const eqA=await page.evaluate(()=>({max:window.__dd.hero.max,hp:window.__dd.hero.hp,worn:!!window.__dd.gear().armor}));
check("Equip armor: hero.max rises by its hp stat ("+armor.max0+" → "+eqA.max+", +"+armor.hp+"), hp grows with it", eqA.worn&&eqA.max===armor.max0+armor.hp&&eqA.hp===armor.hp0+armor.hp, JSON.stringify({armor,eqA,detA:detA.slice(0,140)}));
// ================= 5. shop: buy + restock (gold given for the setup and tracked) =================
await page.click('#tv-tab-shop'); await page.waitForTimeout(150);
const shop0=await page.evaluate(()=>({cards:[...document.querySelectorAll('#tv-shop .tv-card')].map(c=>({id:c.dataset.id,buy:c.querySelector('[data-act=buy]').textContent,dis:c.querySelector('[data-act=buy]').disabled,why:(c.querySelector('.why')||{}).textContent||''})),tier:document.querySelector('#tv-shop .tv-n').textContent,restock:document.getElementById('tv-restock').textContent,restockDis:document.getElementById('tv-restock').disabled,gold:window.__meta.gold(),stock:window.__meta.stock().map(s=>({id:s.id,v:s.value,t:s.tier,r:s.rarity,slot:s.slot}))}));
log("shop (poor)", shop0);
const poorOk=shop0.cards.every((c,i)=>c.buy==='Buy ('+(shop0.stock[i].v*3).toLocaleString('en-US')+' gold)'&&(c.dis===(shop0.gold<shop0.stock[i].v*3))&&(c.dis?c.why==='Need '+((shop0.stock[i].v*3)-shop0.gold).toLocaleString('en-US')+' more gold':c.why===''));
check("shop: 6 cards, Buy = 3x value, disabled + exact 'Need N more gold' when poor, tier 1 line", shop0.cards.length===6&&poorOk&&/^Tier 1 stock · reach wave 1 for tier 2$/.test(shop0.tier), JSON.stringify(shop0).slice(0,500));
check("tier line 'reach wave 1 for tier 2' while the player is already on wave 1 (best=0 until a run ends) — is that confusing?", true, shop0.tier);
// try clicking a disabled Buy: nothing should happen
const gBefore=await page.evaluate(()=>window.__meta.gold()); const disIdx=shop0.cards.findIndex(c=>c.dis);
if(disIdx>=0){ await page.click('#tv-shop .tv-card:nth-child('+(disIdx+1)+') [data-act=buy]',{force:true}).catch(()=>{}); await page.waitForTimeout(80); const gAfter=await page.evaluate(()=>({g:window.__meta.gold(),bag:window.__meta.bag().length})); check("clicking a disabled Buy changes nothing", gAfter.g===gBefore&&gAfter.bag===rw.got, JSON.stringify(gAfter)); }
// give gold (refund path: not in run.gold) and buy the most expensive
const give=await page.evaluate(()=>{ const M=window.__meta; M.giveGold(2000); return M.gold(); }); tally.given+=2000; await page.waitForTimeout(200); await settle();
const shop1=await page.evaluate(()=>({cards:[...document.querySelectorAll('#tv-shop .tv-card')].map(c=>({dis:c.querySelector('[data-act=buy]').disabled})),goldTxt:document.getElementById('tv-goldn').textContent}));
check("after gold arrives the shop re-renders: all Buy enabled, counter shows the new total", shop1.cards.every(c=>!c.dis)&&shop1.goldTxt===give.toLocaleString('en-US'), JSON.stringify(shop1));
const buyIdx=shop0.stock.reduce((b,s,i)=>s.v>shop0.stock[b].v?i:b,0); const buyIt=shop0.stock[buyIdx];
await page.click('#tv-shop .tv-card[data-id="'+buyIt.id+'"] [data-act=buy]'); await page.waitForTimeout(80); await settle(); await page.waitForTimeout(100); u=await ui();
tally.goldSpent+=buyIt.v*3;
const afterBuy=await page.evaluate(id=>({bagHas:window.__meta.bag().some(b=>b.id===id),stock:window.__meta.stock().length,cards:document.querySelectorAll('#tv-shop .tv-card').length,bagN:window.__meta.bag().length}),buyIt.id);
check("Buy: gold -= 3x value ("+buyIt.v*3+"), item in bag, 5 cards left, counter+HUD agree, 'Bought' message", u.gold===give-buyIt.v*3&&afterBuy.bagHas&&afterBuy.stock===5&&afterBuy.cards===5&&afterBuy.bagN===rw.got+1&&u.goldTxt===u.gold.toLocaleString('en-US')&&u.goldHud===u.goldTxt&&/^Bought /.test(u.msg), JSON.stringify({u,afterBuy}));
// restock
const g2=await page.evaluate(()=>window.__meta.gold()); const oldIds=shop0.stock.map(s=>s.id);
await page.click('#tv-restock'); await page.waitForTimeout(80); await settle(); await page.waitForTimeout(100); u=await ui(); tally.goldSpent+=40;
const rs=await page.evaluate(()=>({n:window.__meta.stock().length,ids:window.__meta.stock().map(s=>s.id),cards:document.querySelectorAll('#tv-shop .tv-card').length,slots:window.__meta.stock().map(s=>s.slot),minR:Math.min(...window.__meta.stock().map(s=>s.rarity)),maxR:Math.max(...window.__meta.stock().map(s=>s.rarity))}));
check("Restock: -40 gold, 6 fresh cards (new ids), Uncommon+ with a Rare+, familiar + amulet present", u.gold===g2-40&&rs.n===6&&rs.cards===6&&rs.ids.every(id=>!oldIds.includes(id))&&rs.minR>=1&&rs.maxR>=2&&rs.slots.includes('familiar')&&rs.slots.includes('amulet')&&/Fresh stock/.test(u.msg), JSON.stringify({u,rs}));
await page.screenshot({path:SHOT+"r2-shop.png"});
// ================= 6. skills: spend + respec via buttons =================
await page.click('#tv-tab-skills'); await page.waitForTimeout(120);
const sk0=await page.evaluate(()=>({sub:document.querySelector('#tv-skills .tv-n').textContent,plusDis:[...document.querySelectorAll('#tv-skills [data-act=spend]')].map(b=>b.disabled),respDis:document.getElementById('tv-respec').disabled,resp:document.getElementById('tv-respec').textContent,pts:window.__meta.points()}));
check("skills with the 1 point from Lv 2: '1 point to spend', all + enabled, Respec disabled (nothing spent) at 100*level", sk0.pts===1&&sk0.plusDis.every(d=>!d)&&/1 point to spend/.test(sk0.sub)&&sk0.respDis&&sk0.resp==='Respec (200 gold)', JSON.stringify(sk0));
// earn a level honestly: addXP counts into run.xp like kills do
const lvl=await page.evaluate(()=>{ const M=window.__meta; const before=M.xp(), L0=M.level(); M.addXP(300); return {before,L0,L1:M.level(),xp:M.xp(),pts:M.points(),toast:document.getElementById('toast').textContent,next:M.xpToNext(M.level())}; }); tally.xp+=300; await page.waitForFunction(L=>document.getElementById('tv-lv').textContent==='Lv '+L,lvl.L1,{timeout:5000}).catch(()=>{}); await page.waitForTimeout(50);
log("level up", lvl);
u=await ui(); const sk1=await page.evaluate(()=>({sub:document.querySelector('#tv-skills .tv-n').textContent,plusDis:[...document.querySelectorAll('#tv-skills [data-act=spend]')].map(b=>b.disabled)}));
check("level-up re-renders: header badge shows points, skills sub-line and + buttons enabled", u.pts===lvl.pts+' point'+(lvl.pts===1?'':'s')&&new RegExp(lvl.pts+' point').test(sk1.sub)&&sk1.plusDis.every(d=>!d)&&u.lv==='Lv '+lvl.L1, JSON.stringify({u,sk1,lvl}));
// spend on blade
const d0=await page.evaluate(()=>window.__dd.heroDmg());
await page.click('#tv-sk-blade [data-act=spend]'); await page.waitForTimeout(120);
const sp1=await page.evaluate(()=>({dmg:window.__dd.heroDmg(),mult:window.__dd.heroMult('dmg'),pts:window.__meta.points(),cv:document.querySelector('#tv-sk-blade .cv').textContent,pips:document.querySelectorAll('#tv-sk-blade .tv-pips i.on').length,msg:document.getElementById('tv-msg').textContent,respDis:document.getElementById('tv-respec').disabled,resp:document.getElementById('tv-respec').textContent,badge:document.getElementById('tv-pts').textContent,xpline:document.getElementById('xpline').textContent}));
check("+ on Blade: mult 1.06, heroDmg up ("+d0+" → "+sp1.dmg+"), 1 pip, '+6% hero damage', point gone, Respec enabled", Math.abs(sp1.mult-1.06)<1e-9&&sp1.dmg>d0&&sp1.pips===1&&/\+6% hero damage/.test(sp1.cv)&&sp1.pts===lvl.pts-1&&!sp1.respDis&&sp1.resp==='Respec ('+(100*lvl.L1)+' gold)', JSON.stringify(sp1));
// spend the rest on vigor if any, then respec
const max0=await page.evaluate(()=>window.__dd.hero.max);
while((await page.evaluate(()=>window.__meta.points()))>0){ await page.click('#tv-sk-vigor [data-act=spend]'); await page.waitForTimeout(60); }
const g3=await page.evaluate(()=>window.__meta.gold()); const spentPts=await page.evaluate(()=>window.__meta.spentPoints());
await page.click('#tv-respec'); await page.waitForTimeout(80); await settle(); await page.waitForTimeout(100); u=await ui(); tally.goldSpent+=100*lvl.L1;
const rp=await page.evaluate(()=>({pts:window.__meta.points(),spent:window.__meta.spentPoints(),mult:window.__dd.heroMult('dmg'),max:window.__dd.hero.max,pips:document.querySelectorAll('#tv-skills .tv-pips i.on').length,respDis:document.getElementById('tv-respec').disabled}));
check("Respec: -"+(100*lvl.L1)+" gold, all "+spentPts+" points back, mults reset, pips cleared, Respec disabled", u.gold===g3-100*lvl.L1&&rp.pts===spentPts&&rp.spent===0&&rp.mult===1&&rp.max===max0&&rp.pips===0&&rp.respDis&&/refunded/.test(u.msg), JSON.stringify({u,rp}));
await page.screenshot({path:SHOT+"r2-skills.png"});
// spend one point again (keep it for persistence check)
await page.click('#tv-sk-blade [data-act=spend]'); await page.waitForTimeout(60);
// ================= 7. close and keep playing =================
await page.click('#tv-defend'); await page.waitForTimeout(100);
const cl=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),hidden:document.getElementById('tavern').classList.contains('hide'),phase:window.__dd.S.phase,dead:document.getElementById('dead').classList.contains('hide')}));
check("BACK TO THE HALL closes the overlay, still build phase", !cl.open&&cl.hidden&&cl.phase==='build'&&cl.dead, JSON.stringify(cl));
// W moves the hero again (keys not stuck), G starts wave 2 via the real key
const mv=await page.evaluate(()=>{ const d=window.__dd; const z0=d.hero.z; d.setKeys({w:1}); d.step(1/60,20); d.setKeys({w:0}); return Math.abs(d.hero.z-z0); });
check("hero moves again after close", mv>.1, String(mv));
await page.keyboard.press('KeyG'); await page.waitForTimeout(80);
const w2=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const x0=M.xp(), g0=M.gold(), k0=d.S.kills; let killXp=0, n=0; let guard=0; const started=d.S.phase==='wave'; while(d.S.phase==='wave'&&guard++<800){ d.step(1/60,10); for(const e of d.enemies) if(!e.dead){ killXp+=M.XP[e.kind]; n++; d.kill(e); } } d.step(1/60,3); return {started,phase:d.S.phase,wave:d.S.wave,gold:M.gold()-g0,xp:M.xp()-x0,killXp,n,loot:d.loot.length}; });
tally.xp+=w2.killXp+40; tally.goldEarned+=20; tally.kills+=w2.n;
check("G key starts wave 2; held → +20 gold, +40 xp + kills", w2.started&&w2.phase==='build'&&w2.wave===2&&w2.gold===20&&w2.xp===40+w2.killXp, JSON.stringify(w2));
const midTier=await page.evaluate(()=>({wave:window.__dd.S.wave,best:window.__meta.best(),tier:window.__meta.tierLine(),hudWave:document.getElementById('wave')?document.getElementById('wave').textContent:''}));
check("INFO shop tier line mid-run after holding wave 2 (best only moves at run end)", true, JSON.stringify(midTier));
const rw2=await page.evaluate(()=>{ const d=window.__dd; for(const l of d.loot.slice()){ d.setHero(l.x,l.z); d.step(1/60,5); } return window.__meta.bag().length; }); tally.drops+=1; log("bag after wave 2 reward", rw2);
// ================= 8. let the crystal fall =================
const before=await page.evaluate(()=>({gold:window.__meta.gold(),xp:window.__meta.xp(),level:window.__meta.level(),kills:window.__dd.S.kills,bag:window.__meta.bag().map(b=>b.id),gear:Object.fromEntries(Object.entries(window.__dd.gear()).map(([k,v])=>[k,v&&v.id])),skills:window.__meta.skills(),stockIds:window.__meta.stock().map(s=>s.id),best:window.__meta.best(),runs:window.__meta.runs()}));
await page.keyboard.press('KeyG'); await page.waitForTimeout(80);
const fall=await page.evaluate(()=>{ const d=window.__dd; d.S.crystal=1; const o=d.spawn('ogre','N'); o.x=0; o.z=-3.2; let guard=0; while(d.S.phase!=='dead'&&guard++<600) d.step(1/60,1); const sum=document.getElementById('tv-sum'); const T=window.__tavern.state();
  return {phase:d.S.phase,wave:d.S.wave,guard,sumVis:!sum.classList.contains('hide'),tavVis:!document.getElementById('tavern').classList.contains('hide'),deadHidden:document.getElementById('dead').classList.contains('hide'),T,h2:(sum.querySelector('h2')||{}).textContent,stats:[...sum.querySelectorAll('.tv-stat')].map(s=>s.textContent.replace(/\s+/g,' ')),drops:(sum.querySelector('.tv-drops')||{}).textContent,summary:window.__meta.summary(),gold:window.__meta.gold(),body:document.body.className}; });
log("crystal fell", fall);
const S=fall.summary; const expGold=before.gold+25*fall.wave;
check("crystal falls on wave 3 → summary overlay shown, old #dead hidden, Meta.isOpen", fall.phase==='dead'&&fall.wave===3&&fall.sumVis&&fall.tavVis&&fall.deadHidden&&fall.T.sum, JSON.stringify({phase:fall.phase,wave:fall.wave,sumVis:fall.sumVis,deadHidden:fall.deadHidden}));
check("payout 25*wave = "+(25*fall.wave)+" added to gold", fall.gold===expGold&&S.payout===25*fall.wave, JSON.stringify({gold:fall.gold,expGold,payout:S.payout}));
check("summary h2 names the wave", fall.h2==='THE CRYSTAL FELL ON WAVE '+fall.wave+' · A NEW BEST', fall.h2);
const expEarned=tally.goldEarned+25*fall.wave;
check("summary numbers add up: kills="+fall.summary.kills+" (S.kills "+(before.kills)+"), xp "+S.xpGained+" == tally "+tally.xp+", goldGained "+S.goldGained+" == earned "+expEarned+", spent "+S.goldSpent+" == "+tally.goldSpent+", levels "+S.levelsGained+", drops "+S.drops+" == "+tally.drops, S.kills===before.kills&&S.xpGained===tally.xp&&S.goldGained===expEarned&&S.goldSpent===tally.goldSpent&&S.levelsGained===lvl.L1-1&&S.drops===tally.drops, JSON.stringify({S,tally}));
check("gold identity: final gold == earned - spent + given", fall.gold===S.goldGained-S.goldSpent+tally.given, JSON.stringify({gold:fall.gold,earned:S.goldGained,spent:S.goldSpent,given:tally.given}));
check("summary tiles show those numbers (kills / +xp / +gold −spent / +levels)", fall.stats[0].startsWith(S.kills.toLocaleString('en-US'))&&fall.stats[1].startsWith('+'+S.xpGained.toLocaleString('en-US'))&&fall.stats[2].includes('+'+S.goldGained.toLocaleString('en-US'))&&fall.stats[2].includes('−'+S.goldSpent.toLocaleString('en-US')+' spent')&&fall.stats[3].startsWith('+'+S.levelsGained), JSON.stringify(fall.stats));
await page.screenshot({path:SHOT+"r2-summary.png"});
// game keys while the summary is up: G should not start a wave; W should not move
await page.keyboard.press('KeyG'); await page.keyboard.down('KeyW'); await page.waitForTimeout(60); await page.keyboard.up('KeyW');
const deadKeys=await page.evaluate(()=>{ const d=window.__dd; const z0=d.hero.z; d.step(1/60,20); return {phase:d.S.phase,wave:d.S.wave,dz:Math.abs(d.hero.z-z0),sumVis:!document.getElementById('tv-sum').classList.contains('hide')}; });
check("G/W ignored on the summary", deadKeys.phase==='dead'&&deadKeys.wave===3&&deadKeys.dz<1e-6&&deadKeys.sumVis, JSON.stringify(deadKeys));
// ---- TO THE TAVERN ----
await page.evaluate(()=>{ document.getElementById('tv-totavern').click(); window.__tt0=document.getElementById('tv-goldn').textContent; });
const tt0={goldTxt:await page.evaluate(()=>window.__tt0)}; const samples=[tt0.goldTxt]; for(let i=0;i<8;i++){ await page.waitForTimeout(90); samples.push(await page.evaluate(()=>document.getElementById('tv-goldn').textContent)); }
await settle(); u=await ui();
const stale=await page.evaluate(()=>({on:document.getElementById('tv-msg').classList.contains('on'),txt:document.getElementById('tv-msg').textContent,msgT:window.__tavern.state().msg}));
check("no stale feedback line from before the run shows in the tavern after the summary", !stale.on, JSON.stringify(stale));
check("TO THE TAVERN → bag tab, counter counts up from gold-payout to the total, label 'DEFEND THE HALL AGAIN', phase dead", !u.sum&&u.tab==='bag'&&tt0.goldTxt===(fall.gold-25*fall.wave).toLocaleString('en-US')&&u.goldTxt===fall.gold.toLocaleString('en-US')&&new Set(samples).size>=2&&/AGAIN/.test(u.defend)&&u.phase==='dead', JSON.stringify({tt0:tt0.goldTxt,samples,u}));
await page.screenshot({path:SHOT+"r2-tavern-dead.png"});
// shop tier after a wave-3 run: best=3 → tierOf(3)=1 → stockTier 2
await page.click('#tv-tab-shop'); await page.waitForTimeout(100);
const tierAfter=await page.evaluate(()=>({tier:document.querySelector('#tv-shop .tv-n').textContent,stockTier:window.__meta.stockTier(),best:window.__meta.best(),tiers:window.__meta.stock().map(s=>s.tier),restock:document.getElementById('tv-restock').textContent}));
check("after the wave-3 run: best 3 → Tier 2 stock (line + item tiers + restock 80)", tierAfter.best===3&&tierAfter.stockTier===2&&/^Tier 2 stock · reach wave 4 for tier 3$/.test(tierAfter.tier)&&tierAfter.tiers.every(t=>t===2)&&/Restock \(80 gold\)/.test(tierAfter.restock), JSON.stringify(tierAfter));
// sell something while dead: works? (player sells after a run)
await page.click('#tv-tab-bag'); await page.waitForTimeout(80);
const deadSell=await page.evaluate(()=>{ const b=window.__meta.bag()[0]; return b?{id:b.id,v:b.value,g:window.__meta.gold()}:null; });
if(deadSell){ await page.click('#tv-bag .tv-card[data-id="'+deadSell.id+'"]'); await page.waitForTimeout(80); await page.click('#tv-detail [data-act=sell]'); await page.waitForTimeout(60); await settle(); const gd=await page.evaluate(()=>window.__meta.gold()); check("selling in the tavern after the crystal fell works (+"+deadSell.v+")", gd===deadSell.g+deadSell.v, JSON.stringify({gd,deadSell})); }
// Escape while dead in the tavern → what does the player see?
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
const escDead=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),tav:document.getElementById('tavern').classList.contains('hide'),dead:!document.getElementById('dead').classList.contains('hide'),deadwave:document.getElementById('deadwave').textContent,deadTxt:document.getElementById('dead').textContent.replace(/\s+/g,' ').trim()}));
log("Escape in tavern while dead", escDead);
check("Escape after death shows the old SHATTERED screen with the right wave (TRY AGAIN)", !escDead.open&&escDead.tav&&escDead.dead&&escDead.deadwave==='3', JSON.stringify(escDead));
// can the player get back to the tavern from the old dead screen? (I key)
await page.keyboard.press('KeyI'); await page.waitForTimeout(80);
const backIn=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),deadHidden:document.getElementById('dead').classList.contains('hide'),sum:window.__tavern.state().sum}));
check("I re-opens the tavern from the dead screen (dead screen stays under it?)", backIn.open&&!backIn.sum, JSON.stringify(backIn));
const persistExp=await page.evaluate(()=>({gold:window.__meta.gold(),xp:window.__meta.xp(),level:window.__meta.level(),bag:window.__meta.bag().map(b=>b.id),gear:Object.fromEntries(Object.entries(window.__dd.gear()).map(([k,v])=>[k,v&&v.id])),skills:window.__meta.skills(),stockIds:window.__meta.stock().map(s=>s.id),best:window.__meta.best(),runs:window.__meta.runs(),stockTier:window.__meta.stockTier()}));
// ---- DEFEND THE HALL AGAIN → reload ----
await page.evaluate(()=>{ window.__tavern.say('Sold X for 1 gold'); }); await page.keyboard.press('Escape'); await page.waitForTimeout(50); await page.keyboard.press('KeyI'); await page.waitForTimeout(50);
const stale2=await page.evaluate(()=>document.getElementById('tv-msg').classList.contains('on')); check("a feedback line left when closing does not reappear on the next open", !stale2, String(stale2));
await Promise.all([page.waitForNavigation({timeout:60000}).catch(()=>{}), page.click('#tv-defend')]); await ready(page); await page.waitForTimeout(300);
const after=await page.evaluate(()=>({phase:window.__dd.S.phase,gold:window.__meta.gold(),xp:window.__meta.xp(),level:window.__meta.level(),bag:window.__meta.bag().map(b=>b.id),gear:Object.fromEntries(Object.entries(window.__dd.gear()).map(([k,v])=>[k,v&&v.id])),skills:window.__meta.skills(),stockIds:window.__meta.stock().map(s=>s.id),best:window.__meta.best(),runs:window.__meta.runs(),stockTier:window.__meta.stockTier(),hudGold:document.getElementById('gold').textContent,xpline:document.getElementById('xpline').textContent,mult:window.__dd.heroMult('dmg'),max:window.__dd.hero.max,hp:window.__dd.hero.hp,tier:window.__meta.tierLine()}));
log("after reload", after);
check("reload → start screen; gold/xp/level/bag/gear/skills/best persisted", after.phase==='start'&&after.gold===persistExp.gold&&after.xp===persistExp.xp&&after.level===persistExp.level&&JSON.stringify(after.bag)===JSON.stringify(persistExp.bag)&&JSON.stringify(after.gear)===JSON.stringify(persistExp.gear)&&JSON.stringify(after.skills)===JSON.stringify(persistExp.skills)&&after.best===3, JSON.stringify({after,persistExp}).slice(0,600));
check("skill bonus + gear applied on load (heroMult dmg 1.06, hero.max = full, hp full)", Math.abs(after.mult-1.06)<1e-9&&after.hp===after.max&&after.max>100, JSON.stringify({mult:after.mult,max:after.max,hp:after.hp}));
check("new run: shop restocked (new ids) at tier 2, runs counter +1", after.stockIds.every(id=>!persistExp.stockIds.includes(id))&&after.stockTier===2&&after.runs===persistExp.runs+1, JSON.stringify({stockTier:after.stockTier,runs:after.runs,prevRuns:persistExp.runs}));
check("HUD after reload shows persisted gold/xp", after.hudGold===after.gold.toLocaleString('en-US')&&after.xpline.startsWith('Lv '+after.level+' · '+after.xp+'/'), JSON.stringify({hudGold:after.hudGold,xpline:after.xpline}));
// start-screen TAVERN shows best wave and DEFEND label → PLAY
await page.click('#tavbtn'); await page.waitForTimeout(100);
const tv2=await page.evaluate(()=>({best:document.getElementById('tv-best').textContent,defend:document.getElementById('tv-defend').textContent,gold:document.getElementById('tv-goldn').textContent}));
check("start-screen tavern: 'Best wave 3', DEFEND THE HALL, gold shown", tv2.best==='Best wave 3'&&tv2.defend==='⚔ DEFEND THE HALL'&&tv2.gold===after.gold.toLocaleString('en-US'), JSON.stringify(tv2));
await page.click('#tv-defend'); await page.waitForTimeout(150);
const play2=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen(),start:document.getElementById('start').classList.contains('hide')}));
check("DEFEND THE HALL from the start screen starts the run", play2.phase==='build'&&!play2.open&&play2.start, JSON.stringify(play2));
// second run: does the summary/run accounting start fresh? hold one wave then die
const run2=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const g0=M.gold(), x0=M.xp(); d.startWave(); let guard=0, kx=0; while(d.S.phase==='wave'&&guard++<800){ d.step(1/60,10); for(const e of d.enemies) if(!e.dead){ kx+=M.XP[e.kind]; d.kill(e); } } d.step(1/60,3); d.startWave(); d.S.crystal=1; const o=d.spawn('ogre','N'); o.x=0; o.z=-3.2; guard=0; while(d.S.phase!=='dead'&&guard++<600) d.step(1/60,1);
  const s=M.summary(); return {s,gold:M.gold(),g0,x0,kx,h2:document.querySelector('#tv-sum h2').textContent,stats:[...document.querySelectorAll('#tv-sum .tv-stat')].map(e=>e.textContent.replace(/\s+/g,' '))}; });
log("run 2 summary", run2);
check("run 2 (fell on wave 2, best stays 3): summary is per-run (xp = 30+kills, gold = 15 + 50 payout, no spent), not a new best", run2.s.wave===2&&run2.s.xpGained===30+run2.kx&&run2.s.goldGained===15+50&&run2.s.goldSpent===0&&!run2.s.newBest&&run2.h2==='THE CRYSTAL FELL ON WAVE 2'&&run2.gold===run2.g0+65, JSON.stringify(run2).slice(0,500));
check("no page errors / console errors or warnings across the loop", errors.length===0, errors.join(" | ").slice(0,600));
const stateSnap=await ctx.storageState(); await ctx.close();
// ================= 9. phone pass: real taps =================
const pctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:stateSnap}); const pp=await pctx.newPage(); const perr=[]; pp.on("pageerror",e=>perr.push(String(e))); pp.on("console",m=>{ if((m.type()==="error"||m.type()==="warning")&&!/assets\/|404/.test(m.text())) perr.push(m.text().slice(0,200)); });
await pp.goto("http://127.0.0.1:8830/?silent",{timeout:120000}); await ready(pp); await pp.waitForTimeout(300);
const pOverflow=()=>pp.evaluate(()=>{ const de=document.documentElement; const bad=[]; document.querySelectorAll('#tavern *').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.width>0&&(r.right>innerWidth+1||r.left<-1)) bad.push((el.className||el.id||el.tagName)+':'+Math.round(r.right)); }); return {sw:de.scrollWidth,iw:innerWidth,ok:de.scrollWidth<=innerWidth&&bad.length===0,bad:bad.slice(0,6)}; });
await pp.tap('#playbtn'); await pp.waitForTimeout(150);
const pst=await pp.evaluate(()=>({phase:window.__dd.S.phase,gold:window.__meta.gold(),bag:window.__meta.bag().length,touch:!!document.querySelector('#btns .hb')}));
check("phone: PLAY tap starts the run with the persisted state (gold "+pst.gold+", bag "+pst.bag+")", pst.phase==='build'&&pst.gold===run2.gold&&pst.touch, JSON.stringify(pst));
// tap the 🎒 touch button
const bagHb=await pp.evaluate(()=>{ const b=[...document.querySelectorAll('#btns .hb')].find(b=>b.textContent==='🎒'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}; });
if(bagHb){ await pp.touchscreen.tap(bagHb.x,bagHb.y); await pp.waitForTimeout(150); }
const pOpen=await pp.evaluate(()=>({open:window.__dd.Meta.isOpen(),tab:window.__tavern.state().tab})); const ov1=await pOverflow(); await pp.screenshot({path:SHOT+"r2-phone-bag.png"});
check("phone: 🎒 touch button ("+(bagHb?Math.round(bagHb.w)+'x'+Math.round(bagHb.h):'missing')+") opens the tavern; no horizontal overflow", !!bagHb&&pOpen.open&&ov1.ok, JSON.stringify({bagHb,pOpen,ov1}));
// tap a bag card then Sell; measure the detail panel + button sizes
const pcard=await pp.evaluate(()=>{ const c=document.querySelector('#tv-bag .tv-grid .tv-card'); if(!c) return null; const r=c.getBoundingClientRect(); return {id:c.dataset.id,x:r.x+r.width/2,y:r.y+r.height/2,h:r.height}; });
if(pcard){ await pp.touchscreen.tap(pcard.x,pcard.y); await pp.waitForTimeout(150); const pdet=await pp.evaluate(()=>{ const el=document.getElementById('tv-detail'); const r=el.getBoundingClientRect(); const btns=[...el.querySelectorAll('button')].map(b=>{ const q=b.getBoundingClientRect(); return b.textContent.trim().slice(0,14)+' '+Math.round(q.width)+'x'+Math.round(q.height); }); const body=document.getElementById('tv-body').getBoundingClientRect(); const card=document.querySelector('.tv-card.sel').getBoundingClientRect(); return {vis:!el.classList.contains('hide'),top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),btns,cardBottom:Math.round(card.bottom),covered:card.bottom>r.top,bodyTop:Math.round(body.top)}; }); const ov2=await pOverflow(); await pp.screenshot({path:SHOT+"r2-phone-detail.png"});
  check("phone: tap a card → detail sheet, buttons ≥44px tall, selected card not hidden under the sheet, no overflow", pdet.vis&&pdet.btns.every(b=>+b.split('x')[1]>=44)&&!pdet.covered&&ov2.ok, JSON.stringify({pdet,ov2}));
  const gp0=await pp.evaluate(()=>window.__meta.gold()); const sellBtn=await pp.evaluate(()=>{ const b=document.querySelector('#tv-detail [data-act=sell]'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,v:+b.textContent.replace(/[^\d]/g,'')}; });
  await pp.touchscreen.tap(sellBtn.x,sellBtn.y); await pp.waitForTimeout(900); const gp1=await pp.evaluate(()=>({g:window.__meta.gold(),txt:document.getElementById('tv-goldn').textContent,msg:document.getElementById('tv-msg').textContent}));
  check("phone: tap Sell → gold += "+sellBtn.v+", counter lands", gp1.g===gp0+sellBtn.v&&gp1.txt===gp1.g.toLocaleString('en-US'), JSON.stringify({gp0,gp1,sellBtn})); }
// summary on the phone
await pp.evaluate(()=>{ window.__tavern.close(); const d=window.__dd; d.startWave(); d.S.crystal=1; const o=d.spawn('ogre','N'); o.x=0; o.z=-3.2; let guard=0; while(d.S.phase!=='dead'&&guard++<600) d.step(1/60,1); }); await pp.waitForTimeout(200);
const ov3=await pOverflow(); const psum=await pp.evaluate(()=>{ const s=document.getElementById('tv-sum'); const r=s.getBoundingClientRect(); const b=document.getElementById('tv-totavern').getBoundingClientRect(); return {vis:!s.classList.contains('hide'),sh:s.scrollHeight,ch:s.clientHeight,btn:[Math.round(b.top),Math.round(b.bottom),Math.round(b.width),Math.round(b.height)],ih:innerHeight}; });
await pp.screenshot({path:SHOT+"r2-phone-summary.png"});
check("phone: summary fits (no scroll needed), TO THE TAVERN on screen, no overflow", psum.vis&&psum.sh<=psum.ch+1&&psum.btn[1]<=psum.ih&&ov3.ok, JSON.stringify({psum,ov3}));
const tt=await pp.evaluate(()=>{ const b=document.getElementById('tv-totavern').getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; }); await pp.touchscreen.tap(tt.x,tt.y); await pp.waitForTimeout(1000);
const ptav=await pp.evaluate(()=>({sum:window.__tavern.state().sum,tab:window.__tavern.state().tab,gold:document.getElementById('tv-goldn').textContent,real:window.__meta.gold().toLocaleString('en-US'),defend:document.getElementById('tv-defend').textContent})); const ov4=await pOverflow(); await pp.screenshot({path:SHOT+"r2-phone-tavern-dead.png"});
// the phone player taps ✕ in the tavern after death: where do they land, and can they get back?
const xb=await pp.evaluate(()=>{ const b=document.getElementById('tv-close').getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; }); await pp.touchscreen.tap(xb.x,xb.y); await pp.waitForTimeout(150);
const deadEnd=await pp.evaluate(()=>{ const dead=document.getElementById('dead'); const hb=[...document.querySelectorAll('#btns .hb')].find(b=>b.textContent==='🎒'); const bag=document.getElementById('bagbtn'); const at=el=>{ if(!el) return 'none'; const r=el.getBoundingClientRect(); if(!r.width) return 'zero-size'; const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return e?(e.id||e.className||e.tagName):'null'; };
  return {deadVis:!dead.classList.contains('hide'),deadTxt:dead.textContent.replace(/\s+/g,' ').trim(),deadButtons:[...dead.querySelectorAll('button')].map(b=>b.textContent),hbHit:at(hb),bagbtnHit:at(bag),hudVis:getComputedStyle(document.getElementById('hud')).display,open:window.__dd.Meta.isOpen()}; });
await pp.screenshot({path:SHOT+"r2-phone-dead-end.png"}); log("phone: ✕ after death", deadEnd);
check("phone: after ✕ on the post-run tavern the player can still reach the tavern (🎒 not covered by the SHATTERED screen)", deadEnd.hbHit==='hb'||deadEnd.bagbtnHit==='bagbtn', JSON.stringify(deadEnd));
await pp.evaluate(()=>window.__dd.Meta.open()); await pp.waitForTimeout(100);
check("phone: TO THE TAVERN tap → bag tab, gold landed, DEFEND AGAIN, no overflow", !ptav.sum&&ptav.tab==='bag'&&ptav.gold===ptav.real&&/AGAIN/.test(ptav.defend)&&ov4.ok, JSON.stringify({ptav,ov4}));
check("phone: no errors/warnings", perr.length===0, perr.join(" | ").slice(0,400));
await browser.close(); server.close();
console.log(results.filter(Boolean).length+"/"+results.length+" passed"); process.exit(results.every(Boolean)?0:1);
