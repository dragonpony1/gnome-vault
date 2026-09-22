// verify-numbers-r2-test.mjs — round-2 adversarial verifier: do the meta numbers reach the enemy / survive reload? (port 8832)
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8832);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[], warns=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,200)); else if(m.type()==="warning") warns.push(m.text().slice(0,200)); });
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
await page.goto("http://127.0.0.1:8832/?silent"); await ready(page); await page.waitForTimeout(1500);
console.log("load warnings:",JSON.stringify(warns)); console.log("load errors:",JSON.stringify(errors));
const helpers=()=>{ const d=window.__dd, M=window.__meta; window.H={
  clear(){ for(const e of d.enemies) if(!e.dead){ e.hp=-1; e.dead=.001; } d.step(1/60,80); d.projs.length=0; for(const o of d.orbs) d.scene.remove(o.mesh); d.orbs.length=0; for(const l of d.loot) d.scene.remove(l.mesh); d.loot.length=0; },
  spendN(id,n){ let k=0; for(let i=0;i<n;i++) if(M.spend(id)) k++; return k; },
  respecAll(){ M.giveGold(1e6); M.respec(); },
  swingFrames(){ d.hero.swingT=-1; d.swing(); let n=0; while(d.hero.swingT>=0&&n<600){ d.step(1/60,1); n++; } return n; } }; };
await page.evaluate(helpers);
// ---------- prep ----------
const prep=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.start(); d.step(1/60,5); d.addMana(5000); M.addXP(200000); return {level:M.level(),points:M.points()}; });
check("prep: points", prep.points>=20, JSON.stringify(prep));
// ---------- 1. sword hit on an enemy == heroDmg() (blade 0 and 10) ----------
const sword=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; d.resetGear(); H.respecAll(); H.clear(); d.setHero(16,10,0); d.step(1/60,3);
  const hitOnce=()=>{ const g=d.spawn("goblin","N"); g.hp=99999; g.max=99999; let dmg=null; d.hero.swingT=-1; d.swing(); for(let i=0;i<60;i++){ g.x=d.hero.x+Math.sin(d.hero.yaw)*1.4; g.z=d.hero.z+Math.cos(d.hero.yaw)*1.4; g.y=0; d.step(1/60,1); if(g.hp<99999){ dmg=99999-g.hp; break; } } H.clear(); return dmg; };
  const out={dmg0:d.heroDmg(),hit0:hitOnce()}; H.spendN('blade',10); out.dmg10=d.heroDmg(); out.hit10=hitOnce(); const w=d.rollItem(3,'weapon',6); M.giveItem(w); M.equip(w.id); out.wStat=w.stats.dmg; out.wdmg10=d.heroDmg(); out.whit10=hitOnce(); M.unequip('weapon'); H.respecAll(); return out; });
check("sword: enemy loses exactly heroDmg() per hit at 0 and 10 blade, with and without weapon", sword.hit0===sword.dmg0&&sword.hit10===sword.dmg10&&sword.whit10===sword.wdmg10&&sword.dmg10>sword.dmg0, JSON.stringify(sword));
// ---------- 2. familiar bolt damage = round(fdmg * heroMult('dmg')) ----------
const fam=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); H.clear(); d.resetGear(); d.setHero(0,10,Math.PI); d.step(1/60,3);
  const f=d.rollItem(2,'familiar',6); f.stats.fdmg=9; f.stats.frate=0; M.giveItem(f); M.equip(f.id); d.step(1/60,5);
  const bolt=()=>{ const g=d.spawn("goblin","N"); g.hp=99999; g.max=99999; let dmg=null, shots=0; for(let i=0;i<300;i++){ g.x=d.hero.x+1; g.z=d.hero.z-3; g.y=0; d.step(1/60,1); if(g.hp<99999){ dmg=99999-g.hp; break; } } H.clear(); return dmg; };
  const out={f0:bolt(),fdmg:f.stats.fdmg}; H.spendN('blade',10); out.f10=bolt(); out.mult=d.heroMult('dmg'); H.respecAll(); M.unequip('familiar'); return out; });
check("familiar: fdmg 9 → 9 dmg at 0 blade, 14 (round 14.4) at 10 blade", fam.f0===9&&fam.f10===14, JSON.stringify(fam));
// ---------- 3. skill cap 10, spend without points ----------
const cap=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); const got=H.spendN('vigor',12); const eleven=M.spend('vigor'); const s=M.skill('vigor'); M.reset(); d.step(1/60,1); const none=M.spend('blade'); return {got,eleven,s,none,pts:M.points(),mult:d.heroMult('hp')}; });
check("skill cap: 10 accepted, 11th refused; no points → refused", cap.got===10&&cap.eleven===false&&cap.s===10&&cap.none===false&&cap.pts===0&&cap.mult===1, JSON.stringify(cap));
// ---------- 4. one-point granularity table (base hero, T1 weapon, lvl-1 harpoon) ----------
const gran=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; M.reset(); d.step(1/60,1); M.addXP(200000); d.resetGear(); H.respecAll(); const seq=(fn,id)=>{ const a=[fn()]; for(let i=1;i<=10;i++){ M.spend(id); a.push(fn()); } H.respecAll(); return a; };
  const dead=a=>a.map((v,i)=>i&&v===a[i-1]?i:null).filter(x=>x!==null);
  const out={}; out.blade=seq(()=>d.heroDmg(),'blade'); out.vigor=seq(()=>d.hero.max,'vigor'); out.overseerH=seq(()=>Math.max(1,Math.round(6*d.heroMult('tow'))),'overseer'); out.overseerS=seq(()=>Math.max(1,Math.round(2*d.heroMult('tow'))),'overseer'); out.overseerB=seq(()=>Math.max(1,Math.round(6*d.heroMult('tow'))),'overseer');
  out.mana=seq(()=>Math.round(5*d.heroMult('mana')),'manawell'); out.swing=seq(()=>H.swingFrames(),'fleet'); out.loaderCd=seq(()=>+(1.6/d.heroMult('tcd')).toFixed(3),'loader');
  const w=d.rollItem(1,'weapon',1); M.giveItem(w); M.equip(w.id); out.wdmg=w.stats.dmg||0; out.bladeW=seq(()=>d.heroDmg(),'blade'); M.unequip('weapon');
  return {t:out,dead:{blade:dead(out.blade),bladeW:dead(out.bladeW),vigor:dead(out.vigor),overseerH:dead(out.overseerH),overseerS:dead(out.overseerS),mana:dead(out.mana),swing:dead(out.swing)}}; });
console.log("GRANULARITY", JSON.stringify(gran));
check("granularity: every single point changes blade dmg / harpoon dmg / orb mana (dead points listed)", gran.dead.blade.length===0&&gran.dead.overseerH.length===0&&gran.dead.mana.length===0, JSON.stringify(gran.dead));
// ---------- 5. HUD text: gold + xp line after a wave held ----------
const hud=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; M.reset(); d.step(1/60,2); H.clear(); const g0=M.gold(); d.startWave(); let guard=0; while(d.S.phase==='wave'&&guard++<600){ d.step(1/60,15); for(const e of d.enemies) if(!e.dead) d.kill(e); } d.step(1/60,5);
  return {gold:M.gold()-g0,hudGold:document.getElementById('gold').textContent,xp:document.getElementById('xpline').textContent,mxp:M.xp(),lvl:M.level(),phase:d.S.phase}; });
check("HUD: #gold = 15 after wave 1, #xpline matches Meta xp/level", hud.gold===15&&hud.hudGold==="15"&&new RegExp('^Lv '+hud.lvl+' · '+hud.mxp+'/').test(hud.xp), JSON.stringify(hud));
// ---------- 6. tavern shows sell = value and buy = 3*value ----------
const tv=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const it=d.rollItem(2,'charm',5); it.value=1234; M.giveItem(it); M.open(); const tab=document.querySelector('#tavern [data-tab="bag"]'); if(tab) tab.click(); const card=document.querySelector('#tavern [data-id="'+it.id+'"]'); if(card) card.click(); const txt=document.getElementById('tavern').textContent;
  const s0=M.stock()[0]; const stab=document.querySelector('#tavern [data-tab="shop"]'); if(stab) stab.click(); const stxt=document.getElementById('tavern').textContent; const open=M.isOpen(); const esc=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}); document.dispatchEvent(esc); window.dispatchEvent(esc);
  return {card:!!card,sellShown:/sells for 1,234 gold/.test(txt),sellBtn:/Sell \(1,234 gold\)/.test(txt),buyShown:stxt.includes('Buy ('+M.fmtG(s0.value*3)+' gold)'),buyExp:M.fmtG(s0.value*3),open,closed:!M.isOpen()}; });
check("tavern: detail says 'sells for 1,234 gold' + Sell (1,234 gold); shop card Buy = 3*value", tv.card&&tv.sellShown&&tv.sellBtn&&tv.buyShown&&tv.open, JSON.stringify(tv));
// ---------- 7. sellJunk: Common in an empty slot, Common better than equipped ----------
const junk=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; if(M.isOpen()) M.open(); while(M.bag().length) M.sell(M.bag()[0].id); d.resetGear(); const eqw=d.rollItem(1,'weapon',2); M.giveItem(eqw); M.equip(eqw.id);
  const cEmpty=d.rollItem(0,'armor',2); cEmpty.rarity=0; const cBetter=d.rollItem(0,'weapon',9); cBetter.rarity=0; cBetter.score=eqw.score+40; [cEmpty,cBetter].forEach(i=>M.giveItem(i)); const r=M.sellJunk(); return {n:r.n,emptySlotCommonKept:M.bag().some(b=>b.id===cEmpty.id),betterCommonSold:!M.bag().some(b=>b.id===cBetter.id),junkEmpty:M.isJunk(cEmpty)}; });
check("sellJunk (DESIGN: 'every bag item that is Common' sells): Common armor with no armor worn", junk.emptySlotCommonKept===false, JSON.stringify(junk));
// ---------- 8. persistence: skills/gold/bag/level survive reload AND apply to the hero without any call ----------
const before=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; M.reset(); d.step(1/60,1); M.addXP(200000); d.resetGear(); H.respecAll(); H.spendN('vigor',10); H.spendN('blade',10); H.spendN('fleet',5); H.spendN('manawell',3); M.giveGold(777-M.gold()); const it=d.rollItem(2,'amulet',4); M.giveItem(it); return {max:d.hero.max,dmg:d.heroDmg(),move:d.heroMult('move'),gold:M.gold(),level:M.level(),xp:M.xp(),bag:M.bag().length,pts:M.points(),skills:M.skills()}; });
await page.reload(); await ready(page); await page.waitForTimeout(300); await page.evaluate(helpers);
const after=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; return {max:d.hero.max,hp:d.hero.hp,dmg:d.heroDmg(),move:d.heroMult('move'),mana:d.heroMult('mana'),gold:M.gold(),level:M.level(),xp:M.xp(),bag:M.bag().length,pts:M.points(),skills:M.skills(),hud:document.getElementById('gold').textContent}; });
check("reload: hero.max 180 / heroDmg / move 1.15 / mana 1.18 applied at boot; gold 777, level, xp, bag, points, skills identical", after.max===180&&after.hp===180&&after.dmg===before.dmg&&Math.abs(after.move-1.15)<1e-9&&Math.abs(after.mana-1.18)<1e-9&&after.gold===777&&after.level===before.level&&after.xp===before.xp&&after.bag===before.bag&&after.pts===before.pts&&JSON.stringify(after.skills)===JSON.stringify(before.skills)&&after.hud==="777", JSON.stringify({before,after}));
// ---------- 9. real crystal fall on wave 2: payout 25*2, best 2, tier 2 stock, summary shown ----------
const fall=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.start(); d.step(1/60,3); d.startWave(); d.step(1/60,5); for(const e of d.enemies) if(!e.dead) d.kill(e); let guard=0; while(d.S.phase==='wave'&&guard++<400){ d.step(1/60,15); for(const e of d.enemies) if(!e.dead) d.kill(e); } d.step(1/60,5); const w1={phase:d.S.phase,wave:d.S.wave,gold:M.gold()};
  d.startWave(); d.S.crystal=1; d.setHero(2,2,0); const g0=M.gold(); let guard2=0; while(d.S.phase!=='dead'&&guard2++<3000) d.step(1/60,4); const sum=M.summary();
  return {w1,phase:d.S.phase,wave:d.S.wave,frames:guard2*4,gold:M.gold()-g0,best:M.best(),tier:M.stockTier(),line:M.tierLine(),payout:sum.payout,sumWave:sum.wave,tavern:!document.getElementById('tavern').classList.contains('hide'),dead:!document.getElementById('dead').classList.contains('hide'),stockTiers:M.stock().map(s=>s.tier)}; });
check("crystal falls on wave 2: +50 gold, best 2, tier 2 stock (reach wave 4 for tier 3), summary/tavern shown, old #dead hidden", fall.phase==='dead'&&fall.wave===2&&fall.gold===50&&fall.best===2&&fall.tier===2&&fall.payout===50&&fall.sumWave===2&&fall.tavern&&!fall.dead&&fall.stockTiers.every(t=>t===2)&&/reach wave 4 for tier 3/.test(fall.line), JSON.stringify(fall));
// ---------- 10. cone: Mark I / II / III at 12° off-axis, range 15 ----------
await page.reload(); await ready(page); await page.waitForTimeout(300); await page.evaluate(helpers);
const cone=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.start(); d.step(1/60,5); d.addMana(1000); d.setHero(6,8,Math.PI); d.step(1/60,3);
  const t=d.place("harpoon",16,15,Math.PI); if(!t) return {err:'no place'}; t.cd=0; const a=12*Math.PI/180, R=15; const ex=t.x+Math.sin(Math.PI+a)*R, ez=t.z+Math.cos(Math.PI+a)*R;
  const trial=(frames)=>{ const g=d.spawn("goblin","N"); g.x=ex; g.z=ez; g.hp=99999; g.max=99999; let shots=0, hits=0, first=null; for(let i=0;i<frames;i++){ g.x=ex; g.z=ez; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) shots++; if(g.hp<99999){ hits++; if(first===null) first=i; g.hp=99999; } } for(const e of d.enemies) if(!e.dead){ e.hp=-1; e.dead=.001; } d.step(1/60,60); d.projs.length=0; return {shots,hits,first,lvl:t.lvl,arc:d.DEFS.harpoon.arcs[t.lvl-1]}; };
  const mk1=trial(300); d.setHero(t.x,t.z+2,Math.PI); d.step(1/60,2); d.upgrade(); t.cd=0; const mk2=trial(300); d.upgrade(); t.cd=0; const mk3=trial(480); return {mk1,mk2,mk3,angle:Math.abs(Math.atan2(ex-t.x,ez-t.z)-Math.PI)*180/Math.PI,dist:Math.hypot(ex-t.x,ez-t.z)}; });
check("cone: Mark I (16°→±8°) and Mark II (22°→±11°) ignore 12° off-axis; Mark III (28°→±14°) fires and hits", cone.mk1.shots===0&&cone.mk2.shots===0&&cone.mk2.lvl===2&&cone.mk3.shots>0&&cone.mk3.hits>0&&cone.mk3.lvl===3, JSON.stringify(cone));
// ---------- 11. upgraded harpoon damage/cd stack with overseer/loader (Mark III, 10 pts) ----------
const stack=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; M.addXP(200000); H.respecAll(); H.clear(); const t=d.defs.find(x=>x.kind==='harpoon'); const dmgAt=()=>{ const g=d.spawn("goblin","N"); g.x=t.x; g.z=t.z-8; g.hp=99999; g.max=99999; let dmg=null; t.cd=0; for(let i=0;i<400;i++){ g.x=t.x; g.z=t.z-8; d.step(1/60,1); if(g.hp<99999){ dmg=99999-g.hp; break; } } H.clear(); t.cd=0; return dmg; };
  const shots=()=>{ const g=d.spawn("goblin","N"); g.x=t.x; g.z=t.z-8; g.hp=1e9; g.max=1e9; t.cd=0; let n=0; for(let i=0;i<600;i++){ g.x=t.x; g.z=t.z-8; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) n++; } H.clear(); return n; };
  const out={lvl:t.lvl,d0:dmgAt(),n0:shots()}; H.spendN('overseer',10); H.spendN('loader',10); out.d10=dmgAt(); out.n10=shots(); H.respecAll(); return out; });
check("Mark III harpoon: dmg 12 → 18 with overseer 10; shots/10s (cd 1.024 → 0.731) 10 → 14 with loader 10", stack.lvl===3&&stack.d0===12&&stack.d10===18&&stack.n0===10&&stack.n10===14, JSON.stringify(stack));
check("no page errors", errors.length===0, errors.join(" | ").slice(0,400));
console.log("warnings total:",JSON.stringify(warns).slice(0,400));
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} r2 checks passed`); process.exit(f?1:0);
