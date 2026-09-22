// verify-numbers-test.mjs — adversarial verifier: do the meta-game numbers actually apply? (port 8832)
import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const SP=process.env.SP; const server=await serve(8832);   // 404 for non-root paths like the other suites: the html must not be served for assets/*.glb.txt
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.type()+": "+m.text().slice(0,200)); });
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
await page.goto("http://127.0.0.1:8832/?silent&nogate"); await ready(page); await page.waitForTimeout(300);
// (the round-1 window.dmm shim is gone: game.js declares const dmm inside spawnEnemy)

await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; window.H={
  clear(){ for(const e of d.enemies) if(!e.dead){ e.hp=-1; e.dead=.001; } d.step(1/60,80); d.projs.length=0; for(const o of d.orbs) d.scene.remove(o.mesh); d.orbs.length=0; for(const l of d.loot) d.scene.remove(l.mesh); d.loot.length=0; },
  spendN(id,n){ let k=0; for(let i=0;i<n;i++) if(M.spend(id)) k++; return k; },
  respecAll(){ M.giveGold(1e6); M.respec(); },
  swingFrames(){ d.hero.swingT=-1; d.swing(); let n=0; while(d.hero.swingT>=0&&n<600){ d.step(1/60,1); n++; } return n; },
  moveDist(frames){ d.setHero(6,8,Math.PI); d.setCam(Math.PI,.42,8); d.step(1/60,3); const x0=d.hero.x, z0=d.hero.z; d.setKeys({w:1}); d.step(1/60,frames); d.setKeys({w:0}); d.step(1/60,2); return Math.hypot(d.hero.x-x0,d.hero.z-z0); } }; });
// ---------- prep: fresh meta, in the hall, lots of levels ----------
const prep=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.start(); d.step(1/60,5); d.addMana(5000); M.addXP(200000); return {level:M.level(),points:M.points(),xp:M.xp(),next:M.xpToNext(M.level())}; });
check("prep: many points available", prep.points>=20, JSON.stringify(prep));
// ---------- xpToNext curve ----------
const curve=await page.evaluate(()=>[1,2,3,4,5,10].map(L=>window.__meta.xpToNext(L)));
check("xpToNext(L)=round(100*L^1.5): 100,283,520,800,1118,3162", JSON.stringify(curve)==="[100,283,520,800,1118,3162]", JSON.stringify(curve));
// ---------- BLADE → heroDmg ----------
const blade=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; d.resetGear(); H.respecAll(); const out={base:d.heroDmg(),mult0:d.heroMult('dmg')}; H.spendN('blade',1); out.p1=d.heroDmg(); out.mult1=d.heroMult('dmg'); H.spendN('blade',1); out.p2=d.heroDmg(); H.spendN('blade',8); out.p10=d.heroDmg(); out.mult10=d.heroMult('dmg'); out.val=M.skillValue('blade'); out.skill=M.skill('blade');
  // with a weapon (rounding is less brutal)
  const w=d.rollItem(3,'weapon',6); M.giveItem(w); M.equip(w.id); out.wdmgStat=w.stats.dmg; out.w10=d.heroDmg(); H.respecAll(); out.w0=d.heroDmg(); M.unequip('weapon'); return out; });
check("blade: mult 1.00 → 1.06 → 1.60 and heroDmg rises", Math.abs(blade.mult1-1.06)<1e-9&&Math.abs(blade.mult10-1.6)<1e-9&&blade.p10>blade.base&&blade.w10>blade.w0, JSON.stringify(blade));
check("blade: ONE point visibly changes heroDmg (no weapon)", blade.p1>blade.base, JSON.stringify({base:blade.base,p1:blade.p1,p2:blade.p2}));
// ---------- VIGOR → hero.max ----------
const vigor=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); d.applyGear(); const out={max0:d.hero.max}; H.spendN('vigor',1); d.applyGear(); out.max1=d.hero.max; out.hp1=Math.round(d.hero.hp); H.spendN('vigor',9); d.applyGear(); out.max10=d.hero.max; out.hp10=Math.round(d.hero.hp); out.mult=d.heroMult('hp'); H.respecAll(); out.maxBack=d.hero.max; out.hpBack=Math.round(d.hero.hp); return out; });
check("vigor: max 100 → 108 → 180, hp follows up and clamps back", vigor.max0===100&&vigor.max1===108&&vigor.max10===180&&vigor.hp10===180&&vigor.maxBack===100&&vigor.hpBack<=100, JSON.stringify(vigor));
// ---------- FLEET → swing frames + move distance ----------
const fleet=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); const out={swing0:H.swingFrames(),move0:H.moveDist(40)}; H.spendN('fleet',1); out.swing1=H.swingFrames(); out.move1=H.moveDist(40); H.spendN('fleet',9); out.swing10=H.swingFrames(); out.move10=H.moveDist(40); out.multMove=d.heroMult('move'); out.multSpd=d.heroMult('spd'); out.spdMul=d.hero.spdMul; H.respecAll(); return out; });
check("fleet: move +3%/pt (1.03, 1.30) measured on distance per 40 frames", Math.abs(fleet.move1/fleet.move0-1.03)<.01&&Math.abs(fleet.move10/fleet.move0-1.30)<.01&&Math.abs(fleet.multMove-1.3)<1e-9, JSON.stringify(fleet));
check("fleet: swing completes in fewer frames at 10 pts (~/1.3)", fleet.swing10<fleet.swing0&&Math.abs(fleet.swing10/fleet.swing0-1/1.3)<.06, JSON.stringify(fleet));
check("fleet: ONE point visibly shortens the swing", fleet.swing1<fleet.swing0, JSON.stringify({swing0:fleet.swing0,swing1:fleet.swing1}));
// ---------- OVERSEER → tower damage (harpoon / ball / slice) ----------
const ovs=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); H.clear(); d.setHero(6,8,Math.PI); d.step(1/60,5);
  const t=d.place("harpoon",16,15,Math.PI); t.cd=0; const dmgAt=()=>{ const g=d.spawn("goblin","N"); g.x=t.x; g.z=t.z-8; g.hp=99999; g.max=99999; let hp0=g.hp, dmg=null; for(let i=0;i<400;i++){ d.step(1/60,1); if(g.hp<hp0){ dmg=hp0-g.hp; break; } } H.clear(); t.cd=0; return dmg; };
  const out={h0:dmgAt()}; H.spendN('overseer',1); out.h1=dmgAt(); H.spendN('overseer',1); out.h2=dmgAt(); H.spendN('overseer',8); out.h10=dmgAt(); out.mult=d.heroMult('tow');
  // slice damage via its own tick: place a slice, spawn goblin on it
  const s=d.place("slice",16,12,0); const sdmg=()=>{ const g=d.spawn("goblin","N"); g.x=s.x+.5; g.z=s.z; g.hp=99999; g.max=99999; let hp0=g.hp, dmg=null; s.cd=0; for(let i=0;i<120;i++){ d.step(1/60,1); if(g.hp<hp0){ dmg=hp0-g.hp; break; } } H.clear(); return dmg; };
  out.s10=sdmg(); H.respecAll(); out.s0=sdmg(); out.harpoon=t; out.slicePlaced=!!s; return {h0:out.h0,h1:out.h1,h2:out.h2,h10:out.h10,mult:out.mult,s0:out.s0,s10:out.s10,t:!!t,s:!!s}; });
check("overseer: harpoon dmg 6 → 9 at 10 pts (mult 1.5)", ovs.h0===6&&ovs.h10===9&&Math.abs(ovs.mult-1.5)<1e-9, JSON.stringify(ovs));
check("overseer: ONE point visibly changes harpoon damage", ovs.h1>ovs.h0, JSON.stringify({h0:ovs.h0,h1:ovs.h1,h2:ovs.h2}));
check("overseer: slice dmg 2 → 3 at 10 pts", ovs.s0===2&&ovs.s10===3, JSON.stringify({s0:ovs.s0,s10:ovs.s10}));
// ---------- LOADER → shots per 10 s ----------
const loader=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); H.clear(); const t=d.defs.find(x=>x.kind==='harpoon'); const shots=()=>{ const g=d.spawn("goblin","N"); g.x=t.x; g.z=t.z-8; g.hp=1e9; g.max=1e9; t.cd=0; let n=0; for(let i=0;i<600;i++){ g.x=t.x; g.z=t.z-8; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) n++; } H.clear(); return n; };
  const out={n0:shots()}; H.spendN('loader',1); out.n1=shots(); H.spendN('loader',9); out.n10=shots(); out.mult=d.heroMult('tcd'); H.respecAll(); return out; });
check("loader: shots/10s 0 pts ≈6 (cd 1.6), 10 pts ≈8-9 (cd 1.14)", loader.n0>=6&&loader.n0<=7&&loader.n10>=8&&Math.abs(loader.mult-1.4)<1e-9, JSON.stringify(loader));
check("loader: ONE point changes shot count over 10 s (cd 1.6→1.54 ⇒ 6→6.5)", loader.n1>=loader.n0, JSON.stringify(loader));
// ---------- WIDESHOT → slice reach + ball hit radius ----------
const wide=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); H.clear(); const s=d.defs.find(x=>x.kind==='slice');
  const hitAt=(dist)=>{ const g=d.spawn("goblin","N"); g.x=s.x+dist; g.z=s.z; g.hp=99999; g.max=99999; s.cd=0; let hit=false; for(let i=0;i<90;i++){ d.step(1/60,1); g.x=s.x+dist; g.z=s.z; if(g.hp<99999){ hit=true; break; } } H.clear(); return hit; };
  const g0=d.spawn("goblin","N"); const r=g0.r; H.clear(); const edge0=2.6+r*.5; const out={r,edge0,in0:hitAt(edge0-.05),out0:hitAt(edge0+.1),far0:hitAt(edge0+1.2)};
  H.spendN('wideshot',10); out.mult=d.heroMult('aoe'); out.far10=hitAt(edge0+1.2); out.edge10=2.6*1.6+r*.5; out.beyond10=hitAt(out.edge10+.1);
  // bowling ball hit radius: a static ball projectile next to a goblin
  const ballHit=(dx)=>{ const g=d.spawn("goblin","N"); g.x=s.x+6; g.z=s.z+6; g.hp=99999; g.max=99999; const m=new THREE.Object3D(); d.scene.add(m); d.projs.push({kind:'ball',x:g.x+dx,y:1,z:g.z,vx:0,vz:0,vy:0,life:1,dmg:6,mesh:m,hitT:new Map()}); let hit=false; for(let i=0;i<30;i++){ d.step(1/60,1); g.x=s.x+6; g.z=s.z+6; if(g.hp<99999){ hit=true; break; } } H.clear(); return hit; };
  out.ball10_near=ballHit(r+.45+.15); out.ball10_far=ballHit(r+.72+.1); H.respecAll(); out.ball0_near=ballHit(r+.45+.15); out.ball0_in=ballHit(r+.45-.05); return out; });
check("wideshot: slice reach 2.6 → 4.16 (hits at +1.2 only with 10 pts)", wide.in0&&!wide.out0&&!wide.far0&&wide.far10&&!wide.beyond10&&Math.abs(wide.mult-1.6)<1e-9, JSON.stringify(wide));
check("wideshot: ball hit radius e.r+.45 → e.r+.72", wide.ball0_in&&!wide.ball0_near&&wide.ball10_near&&!wide.ball10_far, JSON.stringify(wide));
// ---------- MANAWELL → mana from one orb ----------
const mana=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.respecAll(); H.clear(); d.setHero(6,8,Math.PI); d.step(1/60,3);
  const orb=()=>{ const g=d.spawn("goblin","N"); g.x=d.hero.x+1; g.z=d.hero.z; const m0=d.S.mana; d.kill(g); const n=d.orbs.length; d.step(1/60,120); const got=d.S.mana-m0; H.clear(); return {n,got}; };
  const out={p0:orb()}; H.spendN('manawell',1); out.p1=orb(); H.spendN('manawell',1); out.p2=orb(); H.spendN('manawell',3); out.p5=orb(); H.spendN('manawell',5); out.p10=orb(); out.mult=d.heroMult('mana'); H.respecAll(); return out; });
check("manawell: one goblin orb = 5 mana at 0 pts, 8 at 10 pts (mult 1.6)", mana.p0.n===1&&mana.p0.got===5&&mana.p10.got===8&&Math.abs(mana.mult-1.6)<1e-9, JSON.stringify(mana));
check("manawell: ONE point visibly changes orb mana", mana.p1.got>mana.p0.got, JSON.stringify(mana));
// ---------- XP per kill per kind, level-up point ----------
const xpk=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.clear(); const out={}; for(const k of ['goblin','archer','orc','ogre']){ const g=d.spawn(k,'N'); g.x=20; g.z=20; const x0=M.xp(), L0=M.level(); d.kill(g); out[k]=M.xp()-x0+(M.level()-L0)*M.xpToNext(L0); } H.clear();
  // level-up: fresh level 1 → exactly 100 xp → level 2, 1 point
  M.reset(); d.step(1/60,2); M.addXP(99); const a={L:M.level(),xp:M.xp(),p:M.points()}; M.addXP(1); const b={L:M.level(),xp:M.xp(),p:M.points(),toast:document.getElementById('toast').textContent}; return {out,a,b}; });
check("xp per kill: goblin 2, archer 4, orc 8, ogre 40", xpk.out.goblin===2&&xpk.out.archer===4&&xpk.out.orc===8&&xpk.out.ogre===40, JSON.stringify(xpk.out));
check("level 2 at exactly 100 xp, +1 point, toast", xpk.a.L===1&&xpk.a.p===0&&xpk.b.L===2&&xpk.b.xp===0&&xpk.b.p===1&&/LEVEL 2/.test(xpk.b.toast), JSON.stringify({a:xpk.a,b:xpk.b}));
// ---------- wave held gold+xp (waves 1 and 2), run end ----------
const waves=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; H.clear(); const res=[]; for(let w=1;w<=2;w++){ const g0=M.gold(), x0=M.xp(), L0=M.level(); let killXp=0; d.startWave(); let guard=0; while(d.S.phase==='wave'&&guard++<600){ d.step(1/60,15); for(const e of d.enemies) if(!e.dead){ killXp+=M.XP[e.kind]; d.kill(e); } } d.step(1/60,5); res.push({w:d.S.wave,phase:d.S.phase,gold:M.gold()-g0,xp:M.xp()-x0,killXp,levelsUp:M.level()-L0}); H.clear(); } return res; });
check("wave 1 held: +15 gold, +30 xp (+kills); wave 2: +20 gold, +40 xp", waves[0].gold===15&&waves[0].xp+waves[0].levelsUp*100===30+waves[0].killXp&&waves[1].gold===20&&waves[1].phase==='build', JSON.stringify(waves));
// ---------- sell = value, buy = 3*value, bag cap, sellJunk, respec ----------
const econ=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, H=window.H; const out={};
  const it=d.rollItem(2,'charm',5); M.giveItem(it); const g0=M.gold(); out.sold=M.sell(it.id); out.sellDelta=M.gold()-g0; out.value=it.value;
  const s0=M.stock()[0]; out.buyPrice=M.buyPrice(s0); out.stockValue=s0.value; M.giveGold(out.buyPrice-M.gold()); const g1=M.gold(); out.canBuyExact=M.canBuy(0).ok; M.giveGold(-1); out.canBuyShort=M.canBuy(0); M.giveGold(1); out.bought=M.buy(0); out.buyDelta=g1-M.gold(); out.inBag=M.bag().some(b=>b.id===s0.id);
  // bag cap: fill to 24 by pickup, 25th auto-sells
  H.clear(); while(M.bag().length<24) M.giveItem(d.rollItem(1,'armor',2)); out.bagBefore=M.bag().length; out.giveWhenFull=M.giveItem(d.rollItem(1,'armor',2)); const x=d.rollItem(3,'amulet',4); const g2=M.gold(); d.dropLoot(x,d.hero.x,d.hero.z,true); d.step(1/60,150); out.bagAfter=M.bag().length; out.autoGold=M.gold()-g2; out.autoValue=x.value; out.lootLeft=d.loot.length; out.toast=document.getElementById('toast').textContent;
  out.canBuyFull=M.canBuy(0); out.unequipFull=(function(){ const w=d.rollItem(2,'weapon',3); d.gear().weapon=w; d.applyGear(); return M.unequip('weapon'); })();
  // sellJunk
  while(M.bag().length) M.sell(M.bag()[0].id); d.resetGear(); const eqw=d.rollItem(2,'weapon',6); M.giveItem(eqw); M.equip(eqw.id);
  const common=d.rollItem(0,'armor',2); common.rarity=0; const worseW=d.rollItem(1,'weapon',1); worseW.score=eqw.score-1; const betterW=d.rollItem(1,'weapon',9); betterW.score=eqw.score+50; const uncNoEq=d.rollItem(1,'charm',3); const equalW=d.rollItem(1,'weapon',2); equalW.score=eqw.score; [common,worseW,betterW,uncNoEq,equalW].forEach(i=>M.giveItem(i));
  const g3=M.gold(); const jr=M.sellJunk(); out.junk={n:jr.n,gold:jr.gold,delta:M.gold()-g3,expect:common.value+worseW.value,left:M.bag().map(b=>b.id),betterKept:M.bag().some(b=>b.id===betterW.id),uncKept:M.bag().some(b=>b.id===uncNoEq.id),equalKept:M.bag().some(b=>b.id===equalW.id),commonGone:!M.bag().some(b=>b.id===common.id),worseGone:!M.bag().some(b=>b.id===worseW.id)};
  // respec
  M.addXP(5000); H.spendN('blade',3); M.giveGold(-M.gold()); out.respecPoor={can:M.canRespec(),ok:M.respec(),skill:M.skill('blade')}; M.giveGold(M.respecCost()); const g4=M.gold(); out.respec={cost:M.respecCost(),level:M.level(),can:M.canRespec(),ok:M.respec(),paid:g4-M.gold(),skill:M.skill('blade'),points:M.points(),mult:d.heroMult('dmg')}; out.respecNothing={can:M.canRespec()}; return out; });
check("sell price = value", econ.sold===econ.value&&econ.sellDelta===econ.value, JSON.stringify({sold:econ.sold,value:econ.value,delta:econ.sellDelta}));
check("buy price = 3*value, exact gold ok, 1 short refused, gold deducted, item in bag", econ.buyPrice===3*econ.stockValue&&econ.canBuyExact&&!econ.canBuyShort.ok&&/1 more gold/.test(econ.canBuyShort.why)&&econ.bought&&econ.buyDelta===econ.buyPrice&&econ.inBag, JSON.stringify({p:econ.buyPrice,v:econ.stockValue,exact:econ.canBuyExact,short:econ.canBuyShort,d:econ.buyDelta}));
check("bag cap: 25th pickup auto-sells for its value, bag stays 24, giveItem/buy/unequip refused when full", econ.bagBefore===24&&econ.giveWhenFull===false&&econ.bagAfter===24&&econ.autoGold===econ.autoValue&&econ.lootLeft===0&&/Bag is full/.test(econ.toast)&&!econ.canBuyFull.ok&&econ.unequipFull===false, JSON.stringify({b:econ.bagBefore,a:econ.bagAfter,g:econ.autoGold,v:econ.autoValue,full:econ.canBuyFull,uneq:econ.unequipFull,toast:econ.toast.slice(0,80)}));
check("sellJunk: sells the common + the worse weapon only (better, equal, unequipped-slot uncommon kept)", econ.junk.n===2&&econ.junk.gold===econ.junk.expect&&econ.junk.delta===econ.junk.expect&&econ.junk.betterKept&&econ.junk.uncKept&&econ.junk.equalKept&&econ.junk.commonGone&&econ.junk.worseGone, JSON.stringify(econ.junk));
check("respec: refused when poor; costs 100*level, refunds all points, mult back to 1; nothing to respec after", !econ.respecPoor.can&&!econ.respecPoor.ok&&econ.respecPoor.skill===3&&econ.respec.cost===100*econ.respec.level&&econ.respec.ok&&econ.respec.paid===econ.respec.cost&&econ.respec.skill===0&&econ.respec.points===econ.respec.level-1&&econ.respec.mult===1&&!econ.respecNothing.can, JSON.stringify({poor:econ.respecPoor,r:econ.respec,after:econ.respecNothing}));
// ---------- stock tier vs best wave ----------
const tier=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); const t1={tier:M.stockTier(),line:M.tierLine(),tiers:M.stock().map(s=>s.tier),lvls:M.stock().map(s=>s.lvl)}; const g0=M.gold(); const shown=M.onRunEnd(4); const t2={best:M.best(),tier:M.stockTier(),line:M.tierLine(),tiers:M.stock().map(s=>s.tier),lvls:M.stock().map(s=>s.lvl),gold:M.gold()-g0,shown,phase:d.S.phase,dead:!document.getElementById('dead').classList.contains('hide'),tavern:!document.getElementById('tavern').classList.contains('hide')};
  const again=M.onRunEnd(9); const t3={best:M.best(),tier:M.stockTier(),gold:M.gold()-g0,again}; return {t1,t2,t3,tierOf:[1,2,3,4,5,6,7,9,10,12,13].map(d.tierOf)}; });
check("tierOf brackets of 3: 1,1,1,2,2,2,3,3,4,4,5", JSON.stringify(tier.tierOf)==="[1,1,1,2,2,2,3,3,4,4,5]", JSON.stringify(tier.tierOf));
check("fresh: tier 1 stock (lvl 1-3), line says reach wave 1 for tier 2", tier.t1.tier===1&&tier.t1.tiers.every(t=>t===1)&&/reach wave 1 for tier 2/.test(tier.t1.line), JSON.stringify(tier.t1));
check("run end on wave 4: +100 gold, best 4 → tier 3 stock (lvl 7-9), line 'reach wave 7 for tier 4', summary shown", tier.t2.gold===100&&tier.t2.best===4&&tier.t2.tier===3&&tier.t2.tiers.every(t=>t===3)&&/^Tier 3 stock · reach wave 7 for tier 4$/.test(tier.t2.line)&&tier.t2.shown, JSON.stringify(tier.t2));
check("second onRunEnd in the same run is a no-op (no double payout)", tier.t3.gold===100&&tier.t3.best===4, JSON.stringify(tier.t3));
// ---------- ballista cone: 12° off-axis at range 15 ----------
await page.evaluate(()=>{ location.reload(); }); await ready(page); await page.waitForTimeout(200); 
const cone=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.start(); d.step(1/60,5); d.addMana(1000); d.setHero(6,8,Math.PI); d.step(1/60,3);
  const t=d.place("harpoon",16,15,Math.PI); if(!t) return {err:'no place'}; t.cd=0; const a=12*Math.PI/180, R=15; const ex=t.x+Math.sin(Math.PI+a)*R, ez=t.z+Math.cos(Math.PI+a)*R; // 12° left of the -z axis
  const trial=(frames)=>{ const g=d.spawn("goblin","N"); g.x=ex; g.z=ez; g.hp=99999; g.max=99999; let shots=0, hits=0, first=null; for(let i=0;i<frames;i++){ g.x=ex; g.z=ez; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) shots++; if(g.hp<99999){ hits++; if(first===null) first=i; g.hp=99999; } } for(const e of d.enemies) if(!e.dead){ e.hp=-1; e.dead=.001; } d.step(1/60,60); d.projs.length=0; return {shots,hits,first,yawOff:Math.round((t.yaw-t.rot)*180/Math.PI*10)/10}; };
  const mk1=trial(300); const arc1=d.DEFS.harpoon.arcs; // upgrade twice: hero must stand within 3.4, needs 100 then 200 mana
  d.setHero(t.x,t.z+2,Math.PI); d.step(1/60,2); const m0=d.S.mana; d.upgrade(); const l2=t.lvl, m1=d.S.mana; d.upgrade(); const l3=t.lvl, m2=d.S.mana; t.cd=0; const mk3=trial(480);
  d.setHero(t.x+8,t.z+8,Math.PI); d.step(1/60,2); d.upgrade(); const farLvl=t.lvl; return {mk1,mk3,arcs:arc1,l2,l3,cost1:m0-m1,cost2:m1-m2,farLvl,dist:Math.hypot(ex-t.x,ez-t.z),angle:Math.abs(Math.atan2(ex-t.x,ez-t.z)-Math.PI)*180/Math.PI}; });
check("cone: Mark I (16°) ignores a goblin 12° off-axis at range 15", cone.mk1&&cone.mk1.shots===0&&cone.mk1.hits===0, JSON.stringify(cone.mk1));
check("upgrade needs hero within 3.4 + mana: 100 then 200, Mark III; far away does nothing", cone.l2===2&&cone.l3===3&&cone.cost1===100&&cone.cost2===200&&cone.farLvl===3, JSON.stringify({l2:cone.l2,l3:cone.l3,c1:cone.cost1,c2:cone.cost2,far:cone.farLvl}));
check("cone: Mark III (28°) fires at and HITS the same goblin", cone.mk3&&cone.mk3.shots>0&&cone.mk3.hits>0, JSON.stringify(cone.mk3));
check("no page errors / console errors or warnings", errors.length===0, errors.join(" | ").slice(0,400));
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} number checks passed`); process.exit(f?1:0);
