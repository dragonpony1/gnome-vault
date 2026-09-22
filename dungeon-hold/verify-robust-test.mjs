// verify-robust-test.mjs — adversarial robustness probe of the meta-game (port 8833). SP=<scratchpad> node verify-robust-test.mjs
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const out=[]; const log=(n,v)=>{ console.log(n+": "+(typeof v==='string'?v:JSON.stringify(v))); out.push([n,v]); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const mkPage=async(opts)=>{ const page=await browser.newPage(opts||{viewport:{width:960,height:600}}); page.errs=[]; page.on("pageerror",e=>page.errs.push(String(e).slice(0,200))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") page.errs.push(m.type()+": "+m.text().slice(0,200)); }); return page; };
const URL="http://127.0.0.1:8833/?silent";
// ===== A. localStorage corruption =====
const page=await mkPage(); await page.goto(URL); await ready(page);
const shapes={garbage:'garbage{{', empty:'{}', arr:'[]', nul:'null', str:'"str"', num:'42',
  old:'{"gold":"50","level":3,"xp":"9999","skills":{"blade":99,"bogus":3},"bag":[{"slot":"weapon","rarity":2.5,"name":"Odd","stats":{"dmg":"abc"}},{"slot":"armor","rarity":"2","name":"Str","stats":{"hp":5}},{"slot":"nope","rarity":1,"name":"x","stats":{}},null,5],"stock":"no","stockTier":99,"best":"7"}',
  neg:'{"gold":-5,"level":-3,"xp":1e9,"best":-1,"runs":-2,"skills":{"blade":-4}}', huge:'{"gold":1e308,"level":1e9,"xp":1e9}', bagstr:'{"bag":"notarray","skills":"x"}'};
for(const [k,v] of Object.entries(shapes)){ await page.evaluate(v=>{ localStorage.setItem('ddMeta',v); localStorage.setItem('ddGear','{"weapon":{"slot":"weapon","rarity":3,"name":"Old Blade","stats":{"dmg":7}},"armor":"bad"}'); },v); page.errs.length=0; await page.goto(URL); await ready(page);
  const r=await page.evaluate(()=>{ const M=window.__meta, d=window.__dd; const s=M.state(); d.start(); d.step(1/60,5); M.open(); d.step(1/60,3); window.__tavern.tab('bag'); window.__tavern.render(); const eqCard=document.querySelector('#tv-bag .tv-card[data-from="eq"]'); eqCard&&eqCard.click(); window.__tavern.tab('shop'); window.__tavern.tab('skills'); window.__tavern.tab('bag'); const bagCard=document.querySelector('#tv-bag .tv-card[data-from="bag"]'); let clickErr=''; try{ bagCard&&bagCard.click(); }catch(e){ clickErr=String(e); } const txt=document.getElementById('tavern').textContent; const hud=document.getElementById('gold').textContent+' '+document.getElementById('xpline').textContent;
    return {gold:s.gold,level:s.level,xp:s.xp,bag:s.bag.length,tier:s.stockTier,best:s.best,skills:s.skills,finite:[s.gold,s.level,s.xp,s.best].every(Number.isFinite),nan:/NaN|undefined|Infinity/.test(txt+hud),hud,points:M.points(),clickErr,detail:!document.getElementById('tv-detail').classList.contains('hide')}; });
  log('A.'+k, {...r, errs:page.errs}); }
await page.evaluate(()=>{ localStorage.clear(); });
// ===== B. numbers: gold/equip/sell/buy edge paths =====
await page.goto(URL); await ready(page);
const B=await page.evaluate(()=>{ const M=window.__meta, d=window.__dd; M.reset(); d.start(); d.step(1/60,3); const r={};
  const it=d.rollItem(2,'weapon',3); M.giveItem(it); const g0=M.gold(); const s1=M.sell(it.id), s2=M.sell(it.id); r.sellTwice={s1,s2,gold:M.gold()-g0,bag:M.bag().length};
  const it2=d.rollItem(2,'armor',3); M.giveItem(it2); const e1=M.equip(it2.id), e2=M.equip(it2.id); r.equipTwice={e1,e2,worn:d.gear().armor&&d.gear().armor.id===it2.id,bag:M.bag().length};
  const it3=d.rollItem(1,'charm',2); const gi1=M.giveItem(it3), gi2=M.giveItem(it3); r.dupGive={gi1,gi2,bag:M.bag().length,ids:M.bag().map(b=>b.id)}; M.sell(it3.id); M.sell(it3.id);
  const l=d.dropLoot(d.rollItem(1,'amulet',2),d.hero.x,d.hero.z); const p1=M.onPickup(l.it,l), p2=M.onPickup(l.it,l); r.dupPickup={p1,p2,bag:M.bag().length,sameId:M.bag().filter(b=>b.id===l.it.id).length}; for(const x of d.loot) d.scene.remove(x.mesh); d.loot.length=0; while(M.bag().length) M.sell(M.bag()[0].id);
  M.giveGold(-M.gold()); const st0=M.stock()[0]; M.giveGold(M.buyPrice(st0)); const cb=M.canBuy(0); const ok=M.buy(0); r.buyExact={cb,ok,gold:M.gold(),bag:M.bag().length};
  M.giveGold(-M.gold()); r.addNaN={a:M.addGold(NaN),b:M.addGold('abc'),c:M.addGold(-50),d:M.addGold(undefined),e:M.addGold(1e6),gold:M.gold()}; M.giveGold(-M.gold());
  r.buyBad={a:M.buy(99),b:M.buy(-1),c:M.buy('nope'),gold:M.gold(),stock:M.stock().length}; r.sellBad={a:M.sell(undefined),b:M.sell(null),c:M.equip('zzz'),d:M.unequip('nope'),e:M.spend('nope'),f:M.spend('blade')};
  M.addXP(10000); r.spendMax={pts:M.points()}; for(let i=0;i<15;i++) M.spend('blade'); r.spendMax.blade=M.skill('blade'); r.spendMax.ptsAfter=M.points(); r.spendMax.mult=d.heroMult('dmg');
  M.giveGold(-M.gold()); r.respecPoor=M.respec(); M.giveGold(M.respecCost()); r.respecOk=M.respec(); r.respecGold=M.gold(); r.respecPts=M.points();
  return r; });
log('B', {...B, errs:page.errs});
// ===== C. save cost per kill (localStorage.setItem on every addXP) =====
const C=await page.evaluate(()=>{ const M=window.__meta, d=window.__dd; while(M.bag().length<M.BAG_CAP) M.giveItem(d.rollItem(1,'charm',2)); const t0=performance.now(); for(let i=0;i<200;i++) M.addXP(1); const t=(performance.now()-t0)/200; const bytes=localStorage.getItem('ddMeta').length; while(M.bag().length) M.sell(M.bag()[0].id); return {msPerSave:+t.toFixed(3),bytes}; });
log('C.saveCost', C);
// ===== D. per-frame DOM churn: HUD (closed) and tavern (open, idle) =====
const D=await page.evaluate(async()=>{ const d=window.__dd; const cnt=(el)=>{ let n=0; const mo=new MutationObserver(ms=>n+=ms.length); mo.observe(el,{subtree:true,childList:true,characterData:true,attributes:true}); return ()=>{ mo.disconnect(); return n; }; };
  const c1=cnt(document.getElementById('hud')); d.step(1/60,120); const hudMut=c1();
  window.__tavern.open(); await new Promise(r=>setTimeout(r,900)); const c2=cnt(document.getElementById('tavern')); const c3=cnt(document.getElementById('hud')); await new Promise(r=>setTimeout(r,1000)); d.step(1/60,60); const tvMut=c2(), hudMut2=c3(); window.__tavern.close(); return {hudMut,tvMutIdle1s:tvMut,hudMutOpen:hudMut2}; });
log('D.churn', D);
// ===== E. rAF loop duplication on same-frame close/open =====
const E=await page.evaluate(async()=>{ const raf=window.requestAnimationFrame; let n=0; window.requestAnimationFrame=cb=>{ if(cb.name==='tvFrame') n++; return raf.call(window,cb); };
  window.__tavern.open(); n=0; await new Promise(r=>setTimeout(r,500)); const single=n; window.__tavern.close(); window.__tavern.open(); window.__tavern.close(); window.__tavern.open(); n=0; await new Promise(r=>setTimeout(r,500)); const triple=n; window.__tavern.close(); await new Promise(r=>setTimeout(r,100)); n=0; await new Promise(r=>setTimeout(r,300)); const closed=n; window.requestAnimationFrame=raf; return {single,afterCloseOpenx3:triple,closed}; });
log('E.rafLoops', E);
// key auto-repeat variant: I held → keydown repeats faster than a slow frame
const E2=await page.evaluate(async()=>{ const raf=window.requestAnimationFrame; let n=0; window.requestAnimationFrame=cb=>{ if(cb.name==='tvFrame') n++; return raf.call(window,cb); };
  for(let i=0;i<7;i++) dispatchEvent(new KeyboardEvent('keydown',{code:'KeyI',key:'i',bubbles:true,cancelable:true,repeat:i>0})); const open=window.__tavern.isOpen(); n=0; await new Promise(r=>setTimeout(r,500)); const loops=n; window.__tavern.close(); await new Promise(r=>setTimeout(r,100)); window.requestAnimationFrame=raf; return {open,loopsPer500ms:loops}; });
log('E2.keyRepeat', E2);
// ===== F. familiar bolt leak: renderer.info.memory over many shots =====
const F=await page.evaluate(()=>{ const M=window.__meta, d=window.__dd; const fam=d.rollItem(4,'familiar',12); fam.stats.frate=300; fam.stats.fdmg=1; M.giveItem(fam); M.equip(fam.id); d.step(1/60,5); const info=d.r.info.memory; const g0=info.geometries, t0=info.textures, sc0=d.scene.children.length; let shots=0; const b0=window.__familiar.bolts();
  for(let k=0;k<6;k++){ const e=d.spawn('ogre','N'); e.x=d.hero.x+3; e.z=d.hero.z; e.hp=1e9; for(let i=0;i<300;i++){ d.step(1/60,1); e.x=d.hero.x+3; e.z=d.hero.z; e.hp=1e9; } d.kill(e); } d.step(1/60,200);
  return {geoms:info.geometries-g0,tex:info.textures-t0,sceneDelta:d.scene.children.length-sc0,bolts:window.__familiar.bolts(),fam:window.__familiar.state(),rate:window.__familiar.rate()}; });
log('F.boltLeak', F);
// ===== G. tavern input: open during a wave with pointer lock, Escape, keys after close =====
await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) if(!e.dead) d.kill(e); d.step(1/60,5); });
await page.mouse.click(480,300); await page.waitForTimeout(150);
const G0=await page.evaluate(()=>({locked:document.pointerLockElement===document.getElementById('c'),play:document.body.classList.contains('play'),cursor:getComputedStyle(document.getElementById('c')).cursor}));
await page.evaluate(()=>{ window.__dd.startWave(); }); await page.keyboard.down('KeyW'); await page.waitForTimeout(50); await page.keyboard.press('KeyI'); await page.waitForTimeout(80);
const G1=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),locked:!!document.pointerLockElement,play:document.body.classList.contains('play'),cursor:getComputedStyle(document.getElementById('tv-box')).cursor,phase:window.__dd.S.phase}));
await page.keyboard.up('KeyW'); await page.keyboard.press('Escape'); await page.waitForTimeout(80);
const hx=await page.evaluate(()=>window.__dd.hero.x); await page.evaluate(()=>window.__dd.step(1/60,30)); const G2=await page.evaluate(x=>({open:window.__dd.Meta.isOpen(),moved:Math.abs(window.__dd.hero.x-x)>.01||false,heroDx:window.__dd.hero.x-x,phase:window.__dd.S.phase}),hx);
// Escape with a selection → needs two presses; Escape during pointer lock re-acquired?
await page.evaluate(()=>{ window.__tavern.open(); const it=window.__dd.rollItem(1,'charm',2); window.__meta.giveItem(it); window.__tavern.render(); window.__tavern.select(it.id,'bag'); }); await page.keyboard.press('Escape'); const G3a=await page.evaluate(()=>window.__tavern.state()); await page.keyboard.press('Escape'); const G3b=await page.evaluate(()=>window.__tavern.state());
log('G.input', {G0,G1,G2,selEsc1:{open:G3a.open,sel:G3a.sel},selEsc2:{open:G3b.open},errs:page.errs});
// mouse click on canvas while tavern open must not swing / lock; wheel ignored
await page.evaluate(()=>window.__tavern.open()); await page.mouse.click(480,300); await page.waitForTimeout(100); const G4=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),locked:!!document.pointerLockElement})); log('G4.clickThrough', G4);
await page.evaluate(()=>window.__tavern.close());
// ===== H. run end → summary → keys → tavern → close → dead screen; re-open in dead =====
const H=await page.evaluate(async()=>{ const d=window.__dd; d.S.crystal=1; const g=d.spawn('goblin','N'); g.x=0; g.z=0; d.step(1/60,1); d.S.crystal=0; d.S.crystal=-1; // force
  // use the real path: call hurtCrystal through an ogre hit is awkward; emulate by hurting via spawn near crystal
  let guard=0; while(d.S.phase!=='dead'&&guard++<3000){ d.step(1/60,1); } return {phase:d.S.phase,wave:d.S.wave,sum:window.__tavern.state().sum,open:window.__tavern.isOpen(),deadHidden:document.getElementById('dead').classList.contains('hide'),tavernVis:!document.getElementById('tavern').classList.contains('hide')}; });
log('H.runEnd', H);
if(H.phase==='dead'){ await page.keyboard.press('Escape'); await page.waitForTimeout(50); const H1=await page.evaluate(()=>window.__tavern.state()); await page.keyboard.press('Escape'); await page.waitForTimeout(50); const H2=await page.evaluate(()=>({st:window.__tavern.state(),deadVis:!document.getElementById('dead').classList.contains('hide')})); await page.keyboard.press('KeyB'); await page.waitForTimeout(50); const H3=await page.evaluate(()=>({st:window.__tavern.state(),deadVis:!document.getElementById('dead').classList.contains('hide'),tvZ:getComputedStyle(document.getElementById('tavern')).zIndex,deadZ:getComputedStyle(document.getElementById('dead')).zIndex,label:document.getElementById('tv-defend').textContent,top:document.elementFromPoint(480,300).closest('#tavern')?'tavern':'other'})); log('H.escFlow',{afterEsc1:{open:H1.open,sum:H1.sum},afterEsc2:H2,reopenB:H3,errs:page.errs}); }
await page.close();
// ===== I. phone: taps on tavern buttons, touch scrolling, overflow =====
const ph=await mkPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}); await ph.goto(URL); await ready(ph);
await ph.evaluate(()=>{ const M=window.__meta, d=window.__dd; M.reset(); d.start(); d.step(1/60,3); while(M.bag().length<M.BAG_CAP) M.giveItem(d.rollItem(1,'charm',2)); M.giveGold(5000); });
// touch 🎒 HUD button (touchstart handler)
await ph.tap('.hb:last-child').catch(e=>log('I.tapBagBtnErr',String(e))); await ph.waitForTimeout(80); const I0=await ph.evaluate(()=>window.__tavern.isOpen()); log('I.touchBagBtn',I0);
if(!I0) await ph.evaluate(()=>window.__tavern.open());
await ph.tap('#tv-tab-shop'); await ph.waitForTimeout(50); const I1=await ph.evaluate(()=>window.__tavern.state().tab);
const buyOk=await ph.evaluate(()=>{ const b=document.querySelector('#tv-shop [data-act="buy"]:not([disabled])'); return !!b; });
await ph.tap('#tv-tab-bag'); await ph.waitForTimeout(50);
await ph.tap('#tv-bag .tv-card[data-from="bag"]'); await ph.waitForTimeout(50); const I2=await ph.evaluate(()=>({sel:!!window.__tavern.state().sel,detail:!document.getElementById('tv-detail').classList.contains('hide')}));
const g0=await ph.evaluate(()=>window.__meta.gold()); await ph.tap('#tv-detail [data-act="sell"]'); await ph.waitForTimeout(50); const I3=await ph.evaluate(g=>({sold:window.__meta.gold()>g,bag:window.__meta.bag().length,msg:window.__tavern.state().msg}),g0);
// native touch scroll inside .tv-body via CDP
const cdp=await ph.context().newCDPSession(ph); const sc0=await ph.evaluate(()=>({top:document.getElementById('tv-body').scrollTop,h:document.getElementById('tv-body').scrollHeight,c:document.getElementById('tv-body').clientHeight}));
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:600}]}); for(let y=600;y>=250;y-=25){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y}]}); await ph.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await ph.waitForTimeout(300);
const sc1=await ph.evaluate(()=>document.getElementById('tv-body').scrollTop); log('I.taps',{tab:I1,buyBtnEnabled:buyOk,cardTap:I2,sellTap:I3,scroll:{before:sc0,after:sc1},errs:ph.errs});
await ph.tap('#tv-close'); await ph.waitForTimeout(50); log('I.closeTap', await ph.evaluate(()=>window.__tavern.isOpen()));
// level-up toast wording on touch
const I5=await ph.evaluate(()=>{ window.__meta.addXP(200); return {TOUCH:window.__dd.S&&document.body.classList.contains('touch'),toast:document.getElementById('toast').textContent}; }); log('I.levelToastTouch', I5);
await ph.screenshot({path:SP+'/parts/shots/verify-robust-phone.png'}).catch(()=>{});
await ph.close(); await browser.close(); server.close();
