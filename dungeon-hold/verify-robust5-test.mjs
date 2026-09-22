// verify-robust5-test.mjs — round-2 adversarial robustness probe of the meta-game (port 8833, CSP on, verify.html). SP=<scratchpad> node verify-robust5-test.mjs
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const URL="http://127.0.0.1:8833/?silent";
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const out=(n,v)=>console.log("## "+n+"\n"+JSON.stringify(v));
const mkPage=async(opts)=>{ const page=await browser.newPage(opts); const errs=[]; page.on("pageerror",e=>errs.push("PAGEERR "+String(e).slice(0,200))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errs.push(m.type()+": "+m.text().slice(0,200)); }); page.errs=errs; return page; };
const page=await mkPage({viewport:{width:960,height:600}});
await page.goto(URL); await ready(page);
// ---------- 1. localStorage corruption battery (each: set ddMeta/ddGear, reload, must boot, open tavern, state sane) ----------
const CASES={ garbage:"}{not json", empty:"{}", array:"[]", nul:"null", str:'"hi"', num:"42",
  hostile:'{"gold":"1e999","level":-5,"xp":"abc","skills":{"blade":99,"zzz":3},"bag":[null,1,{"slot":"weapon"},{"slot":"hat","rarity":1,"name":"x","stats":{}}],"stock":"x","stockTier":99,"best":"7","runs":-3}',
  oldshape:'{"gold":50,"bag":[{"slot":"weapon","rarity":2,"name":"Old Blade","stats":{"dmg":"abc"}},{"slot":"armor","rarity":9,"name":"Bad","stats":{"hp":20},"value":-500}]}',
  huge:'{"gold":999999999999,"level":5000,"xp":1e12,"skills":{"blade":10,"vigor":10},"bag":[]}' };
const corr={};
for(const [k,v] of Object.entries(CASES)){ await page.evaluate(v=>{ localStorage.setItem('ddMeta',v); localStorage.setItem('ddGear',v==='{}'?'{"weapon":{"slot":"weapon","rarity":1,"name":"Legacy","stats":{"dmg":4}}}':'garbage'); },v);
  page.errs.length=0; await page.goto(URL); await ready(page);
  corr[k]=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const st=M.state(); let opened=false, tabs=[]; try{ M.open(); opened=M.isOpen(); for(const t of ['bag','shop','skills']){ window.__tavern.tab(t); tabs.push(document.getElementById('tv-'+t).textContent.length>0); } window.__tavern.close(); }catch(e){ tabs.push(String(e)); }
    const hud=document.getElementById('gold').textContent; return {gold:st.gold,goldFinite:Number.isFinite(st.gold),level:st.level,xp:st.xp,skills:st.skills,bag:st.bag.length,bagValues:st.bag.map(b=>[b.name,b.value,b.score]),stock:st.stock.length,tier:st.stockTier,best:st.best,runs:st.runs,gear:Object.fromEntries(Object.entries(d.gear()).map(([k,v])=>[k,v?v.name:null])),heroMax:d.hero.max,dmg:d.heroDmg(),opened,tabs,hud,errs:0}; });
  corr[k].errs=page.errs.slice(); }
out("corruption",corr);
// old-shape follow-up: the armor with value -500 → sell it; weapon with stats.dmg 'abc' → equip → heroDmg?
await page.evaluate(v=>{ localStorage.setItem('ddMeta',v); localStorage.removeItem('ddGear'); },CASES.oldshape); page.errs.length=0; await page.goto(URL); await ready(page);
const old2=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const bag=M.bag(); const g0=M.gold(); const arm=bag.find(b=>b.slot==='armor'), wep=bag.find(b=>b.slot==='weapon'); const r={g0,armVal:arm&&arm.value,wepStats:wep&&wep.stats,wepScore:wep&&wep.score};
  if(arm){ r.sold=M.sell(arm.id); r.g1=M.gold(); } if(wep){ M.equip(wep.id); r.dmg=d.heroDmg(); r.max=d.hero.max; r.hp=d.hero.hp; d.start(); d.step(1/60,5); r.hpAfter=d.hero.hp; r.maxAfter=d.hero.max; } r.errs=window.__dd.S.phase; return r; });
old2.errs=page.errs.slice(); out("oldshape-followup",old2);
// ---------- 2. gold / bag edge paths ----------
await page.evaluate(()=>{ localStorage.clear(); }); page.errs.length=0; await page.goto(URL); await ready(page);
const edge=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); const r={};
  M.giveGold(NaN); M.giveGold('abc'); M.giveGold(Infinity); r.afterNaN=M.gold(); M.addGold(-1e9); r.afterNeg=M.gold();
  const it=M.stock()[0]; M.giveGold(M.buyPrice(it)); r.exact={gold:M.gold(),price:M.buyPrice(it),ok:M.buy(0),after:M.gold(),bagHas:M.bag().some(b=>b.id===it.id),stock:M.stock().length};
  r.badBuys=[M.buy(99),M.buy(-1),M.buy('nope'),M.buy(undefined),M.buy(null),M.buy(1.7)]; r.goldAfterBadBuys=M.gold(); r.stockAfterBadBuys=M.stock().length;
  const id=it.id; r.sellTwice=[M.sell(id),M.sell(id)]; r.goldAfterSell=M.gold(); r.bagAfterSell=M.bag().length;
  const w=d.rollItem(2,'weapon',3); M.giveItem(w); r.giveDup=M.giveItem(w); r.giveDupCount=M.bag().filter(b=>b.id===w.id).length;
  r.equipTwice=[M.equip(w.id),M.equip(w.id)]; r.wornId=d.gear().weapon&&d.gear().weapon.id===w.id; r.bagAfterEquip=M.bag().length; r.sellWorn=M.sell(w.id); r.wornStill=!!d.gear().weapon;
  // pickup of an item whose id equals the worn one (dup by id across gear+bag)
  const clone=JSON.parse(JSON.stringify(w)); d.start(); d.step(1/60,2); d.dropLoot(clone,d.hero.x,d.hero.z); d.step(1/60,90); r.cloneBagged=M.bag().filter(b=>b.id===w.id).length; r.lootLeft=d.loot.length;
  // fill bag, unequip refused, equip swap keeps 24
  while(!M.bagFull()) M.giveItem(d.rollItem(1,'charm',2)); r.unequipFull=M.unequip('weapon'); r.wornAfterUnequipFull=!!d.gear().weapon; const c=M.bag()[0]; r.equipFull=M.equip(c.id); r.bagAfterSwapFull=M.bag().length; r.ids=new Set(M.bag().map(b=>b.id)).size;
  r.spendNoPoints=M.spend('blade'); r.respecNoPoints=M.respec(); M.giveGold(-M.gold()); r.restockPoor=M.restock(); r.goldEnd=M.gold(); r.allFinite=Number.isFinite(M.gold())&&Number.isFinite(d.heroDmg())&&Number.isFinite(d.hero.max);
  return r; });
edge.errs=page.errs.slice(); out("edges",edge);
// ---------- 3. hooks chained / functions present ----------
const hooks=await page.evaluate(()=>{ const M=window.__dd.Meta; return Object.fromEntries(['mult','onPickup','onKill','onWaveHeld','onRunEnd','update','hud','open','isOpen'].map(k=>[k,typeof M[k]+':'+String(M[k]).slice(0,60)])); }); out("hooks",hooks);
// ---------- 4. input: open during a wave, Escape closes, keys resume; Escape doesn't cancel placement; key auto-repeat ----------
await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.S.phase='build'; d.addMana(500); });
await page.keyboard.press('Digit1'); await page.waitForTimeout(50);
const inp={}; inp.placingBefore=await page.evaluate(()=>!!window.__dd.ghost());
await page.evaluate(()=>{ window.__dd.startWave(); window.__dd.step(1/60,5); });
await page.keyboard.press('KeyI'); await page.waitForTimeout(50); inp.openI=await page.evaluate(()=>window.__dd.Meta.isOpen());
await page.keyboard.down('KeyW'); await page.waitForTimeout(30); inp.wWhileOpen=await page.evaluate(()=>{ const d=window.__dd; const x0=d.hero.z; d.step(1/60,10); return {moved:d.hero.z!==x0,phase:d.S.phase}; }); await page.keyboard.up('KeyW');
await page.keyboard.press('Escape'); await page.waitForTimeout(50); inp.afterEsc=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),placing:!!window.__dd.ghost(),phase:window.__dd.S.phase,tavHidden:document.getElementById('tavern').classList.contains('hide')}));
await page.keyboard.down('KeyW'); await page.waitForTimeout(30); inp.wAfter=await page.evaluate(()=>{ const d=window.__dd; const p=[d.hero.x,d.hero.z]; d.step(1/60,20); return Math.hypot(d.hero.x-p[0],d.hero.z-p[1])>0.05; }); await page.keyboard.up('KeyW');
await page.keyboard.press('Escape'); inp.escCancelsPlace=await page.evaluate(()=>!window.__dd.ghost());
// key auto-repeat: hold I → keydown repeats with repeat:true
await page.keyboard.press('KeyI'); await page.waitForTimeout(30); inp.repeat=await page.evaluate(()=>{ const M=window.__dd.Meta; const seq=[M.isOpen()]; for(let i=0;i<3;i++){ window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyI',key:'i',repeat:true,bubbles:true,cancelable:true})); seq.push(M.isOpen()); } return seq; });
await page.evaluate(()=>window.__tavern.close());
// Escape during summary (dead) → tavern; then Escape → #dead visible; then I re-opens over #dead?
inp.dead=await page.evaluate(()=>{ const d=window.__dd; d.S.wave=2; for(let i=0;i<20;i++) d.spawn('ogre','N'); d.enemies.forEach(e=>{ e.x=0; e.z=0; }); let g=0; while(d.S.phase!=='dead'&&g++<3000) d.step(1/60,1); return {phase:d.S.phase,open:d.Meta.isOpen(),sum:window.__tavern.state().sum,g}; });
await page.keyboard.press('Escape'); await page.waitForTimeout(30); inp.deadEsc1=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),sum:window.__tavern.state().sum,tab:window.__tavern.state().tab,deadHidden:document.getElementById('dead').classList.contains('hide')}));
await page.keyboard.press('Escape'); await page.waitForTimeout(30); inp.deadEsc2=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),deadHidden:document.getElementById('dead').classList.contains('hide'),deadText:document.getElementById('dead').textContent.replace(/\s+/g,' ').slice(0,120)}));
await page.keyboard.press('KeyI'); await page.waitForTimeout(30); inp.deadI=await page.evaluate(()=>{ const t=document.getElementById('tavern'), dd=document.getElementById('dead'); const el=document.elementFromPoint(innerWidth/2,innerHeight/2); return {open:window.__dd.Meta.isOpen(),tavZ:getComputedStyle(t).zIndex,deadZ:getComputedStyle(dd).zIndex,topEl:el&&(el.closest('#tavern')?'tavern':el.closest('#dead')?'dead':el.id||el.tagName)}; });
inp.errs=page.errs.slice(); out("input",inp);
// ---------- 5. focus: TAVERN button on start screen → Esc → Space to play → does the tavern re-open? bagbtn → Esc → Enter? ----------
await page.evaluate(()=>localStorage.clear()); page.errs.length=0; await page.goto(URL); await ready(page);
const foc={};
await page.click('#tavbtn'); await page.waitForTimeout(50); foc.open1=await page.evaluate(()=>window.__dd.Meta.isOpen());
await page.keyboard.press('Escape'); await page.waitForTimeout(50); foc.afterEsc=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),active:document.activeElement&&document.activeElement.id}));
await page.keyboard.press('Space'); await page.waitForTimeout(150); foc.afterSpace=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen(),startHidden:document.getElementById('start').classList.contains('hide')}));
await page.evaluate(()=>window.__tavern.close());
await page.click('#bagbtn'); await page.waitForTimeout(50); foc.bagOpen=await page.evaluate(()=>window.__dd.Meta.isOpen());
await page.keyboard.press('Escape'); await page.waitForTimeout(50); foc.bagEsc=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),active:document.activeElement&&document.activeElement.id}));
await page.keyboard.press('Enter'); await page.waitForTimeout(50); foc.afterEnter=await page.evaluate(()=>window.__dd.Meta.isOpen()); await page.evaluate(()=>window.__tavern.close());
await page.click('#bagbtn'); await page.keyboard.press('Escape'); await page.waitForTimeout(30); await page.keyboard.press('Space'); await page.waitForTimeout(50); foc.afterSpace2=await page.evaluate(()=>window.__dd.Meta.isOpen()); await page.evaluate(()=>window.__tavern.close());
// inside the tavern: click a tab (focus stays on it), press Space → tab click again (harmless?) ; then Tab-key focus wander: can Tab reach #playbtn/#wavebtn under the overlay?
await page.evaluate(()=>window.__dd.Meta.open()); await page.click('#tv-tab-shop'); await page.keyboard.press('Space'); await page.waitForTimeout(30); foc.spaceOnTab=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),tab:window.__tavern.state().tab,phase:window.__dd.S.phase}));
const reach=[]; for(let i=0;i<60;i++){ await page.keyboard.press('Tab'); const a=await page.evaluate(()=>{ const a=document.activeElement; return a?(a.closest('#tavern')?'':(a.id||a.tagName)):'none'; }); if(a) reach.push(a); } foc.tabReachesOutside=[...new Set(reach)];
await page.evaluate(()=>window.__tavern.close());
foc.errs=page.errs.slice(); out("focus",foc);
// ---------- 6. pointer lock: try to lock via a real click, open with I → lock exited, cursor visible ----------
await page.evaluate(()=>{ window.__dd.start(); window.__dd.step(1/60,2); });
await page.mouse.click(480,300); await page.waitForTimeout(200);
const pl={}; pl.lockedAfterClick=await page.evaluate(()=>({lock:document.pointerLockElement===document.getElementById('c'),play:document.body.classList.contains('play'),cursor:getComputedStyle(document.getElementById('c')).cursor}));
await page.keyboard.press('KeyI'); await page.waitForTimeout(150); pl.afterOpen=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),lock:!!document.pointerLockElement,play:document.body.classList.contains('play'),cursor:getComputedStyle(document.getElementById('c')).cursor,tavCursor:getComputedStyle(document.getElementById('tv-close')).cursor,topEl:(document.elementFromPoint(480,300)||{}).id}));
// mouse works on the overlay: click the shop tab with the mouse
await page.click('#tv-tab-shop'); pl.mouseTab=await page.evaluate(()=>window.__tavern.state().tab);
await page.keyboard.press('Escape'); await page.waitForTimeout(50); pl.afterClose=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),lock:!!document.pointerLockElement,play:document.body.classList.contains('play')}));
pl.errs=page.errs.slice(); out("pointerlock",pl);
// ---------- 7. per-frame churn: DOM mutations in #tavern while idle-open, and in #hud from Meta.hud over 300 frames ----------
const churn=await page.evaluate(async()=>{ const d=window.__dd; window.__meta.reset(); const r={};
  d.Meta.open(); await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>requestAnimationFrame(r));
  let n=0; const mo=new MutationObserver(m=>n+=m.length); mo.observe(document.getElementById('tavern'),{subtree:true,childList:true,attributes:true,characterData:true});
  const t0=performance.now(); let frames=0; await new Promise(res=>{ const f=()=>{ if(++frames>=60) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }); mo.disconnect(); r.tavernIdle={mutationsPer60Frames:n,ms:Math.round(performance.now()-t0)};
  window.__tavern.close();
  let h=0; const mh=new MutationObserver(m=>h+=m.length); mh.observe(document.getElementById('hud'),{subtree:true,childList:true,attributes:true,characterData:true}); const t1=performance.now(); d.step(1/60,300); mh.disconnect(); r.hudIdle={mutationsPer300Steps:h,ms:Math.round(performance.now()-t1)};
  return r; }); out("churn",churn);
// ---------- 8. leaks: familiar swap x30 and 300 bolts vs renderer.info + scene children; open/close x50 → one #tavern, one style ----------
const leak=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, r=d.r, info=()=>({geo:r.info.memory.geometries,tex:r.info.memory.textures,prog:r.info.programs.length,kids:d.scene.children.length}); M.reset(); d.S.phase='build';
  const fams=[]; for(let i=0;i<30;i++){ const f=d.rollItem(i%5,'familiar',1+(i%15)); fams.push(f); M.giveItem(f); }
  d.step(1/60,2); d.shot(64,64); const before=info();
  for(let i=0;i<30;i++){ M.equip(fams[i].id); d.step(1/60,3); d.shot(64,64); } M.unequip('familiar'); d.step(1/60,3); d.shot(64,64); const afterSwaps=info();
  // bolts: equip one, spawn a goblin in range, hold it alive, let it fire ~200 times
  M.equip(fams[0].id); d.step(1/60,3); const g=d.spawn('goblin','N'); g.x=d.hero.x+3; g.z=d.hero.z; g.hp=1e9; let shots=0, maxBolts=0; for(let i=0;i<60*40;i++){ g.x=d.hero.x+3; g.z=d.hero.z; g.hp=1e9; d.step(1/60,1); const b=window.__familiar.bolts(); maxBolts=Math.max(maxBolts,b); if(i%60===0) d.shot(64,64); } const afterBolts=info(); g.hp=1; d.kill(g); for(let i=0;i<120;i++) d.step(1/60,1); d.shot(64,64); const afterExpire=info();
  for(let i=0;i<50;i++){ d.Meta.open(); window.__tavern.close(); } const dom={tav:document.querySelectorAll('#tavern').length,css:document.querySelectorAll('#tv-css').length,meta:document.querySelectorAll('#metacss').length};
  return {before,afterSwaps,afterBolts,afterExpire,maxBolts,boltsNow:window.__familiar.bolts(),dom}; }).catch(e=>String(e)); out("leak",leak);
// ---------- 9. sell → equip race: click Sell then Equip on the same stale detail panel ----------
const race=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); const w=d.rollItem(3,'weapon',3); M.giveItem(w); d.Meta.open(); window.__tavern.select(w.id,'bag'); const det=document.getElementById('tv-detail'); const sellBtn=det.querySelector('[data-act=sell]'), eqBtn=det.querySelector('[data-act=equip]');
  const g0=M.gold(); sellBtn.click(); const g1=M.gold(); eqBtn.click(); /* stale node, detached */ const g2=M.gold(); sellBtn.click(); const g3=M.gold(); const worn=!!d.gear().weapon; window.__tavern.close(); return {g0,g1,g2,g3,worn,bag:M.bag().length,val:w.value}; }); out("race",race);
console.log("## desktop-errs\n"+JSON.stringify(page.errs)); await page.close();
// ---------- 10. phone: real touch taps on the tavern, scrolling the bag with a touch gesture ----------
const ph=await mkPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await ph.goto(URL); await ready(ph); const T={};
await ph.tap('#playbtn'); await ph.waitForTimeout(100); T.phase=await ph.evaluate(()=>window.__dd.S.phase);
await ph.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); M.giveGold(5000); for(let i=0;i<20;i++) M.giveItem(d.rollItem(i%5,['weapon','armor','charm','amulet','familiar'][i%5],1+i)); d.step(1/60,2); });
const hb=await ph.evaluate(()=>{ const b=[...document.querySelectorAll('#btns .hb')].find(b=>b.textContent==='🎒'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,vis:r.width>0}; });
await ph.touchscreen.tap(hb.x,hb.y); await ph.waitForTimeout(100); T.hbOpens=await ph.evaluate(()=>window.__dd.Meta.isOpen());
await ph.tap('#tv-tab-shop'); await ph.waitForTimeout(50); T.tapTab=await ph.evaluate(()=>window.__tavern.state().tab);
await ph.tap('#tv-tab-bag'); await ph.waitForTimeout(50);
await ph.tap('#tv-bag .tv-grid .tv-card'); await ph.waitForTimeout(50); T.tapCard=await ph.evaluate(()=>({sel:!!window.__tavern.state().sel,detVisible:!document.getElementById('tv-detail').classList.contains('hide')}));
await ph.tap('#tv-detail [data-act=equip]'); await ph.waitForTimeout(50); T.tapEquip=await ph.evaluate(()=>({msg:window.__tavern.state().msg,worn:Object.values(window.__dd.gear()).filter(Boolean).length}));
await ph.tap('#tv-bag .tv-grid .tv-card'); await ph.waitForTimeout(50); await ph.tap('#tv-detail [data-act=sell]'); await ph.waitForTimeout(50); T.tapSell=await ph.evaluate(()=>window.__tavern.state().msg);
await ph.tap('#tv-selljunk').catch(e=>T.selljunkErr=String(e).slice(0,80)); await ph.waitForTimeout(50); T.tapSellJunk=await ph.evaluate(()=>window.__tavern.state().msg);
// touch scroll of the bag list (CDP synthesizeScrollGesture, touch source)
const cdp=await ph.context().newCDPSession(ph); const body=await ph.evaluate(()=>{ const b=document.getElementById('tv-body'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,sh:b.scrollHeight,ch:b.clientHeight,ta:getComputedStyle(b).touchAction,bodyTa:getComputedStyle(document.body).touchAction}; });
T.scrollable=body; try{ await cdp.send('Input.synthesizeScrollGesture',{x:body.x,y:body.y,yDistance:-300,gestureSourceType:'touch',speed:800}); }catch(e){ T.scrollErr=String(e).slice(0,100); } await ph.waitForTimeout(300);
T.scrollTopAfterTouch=await ph.evaluate(()=>document.getElementById('tv-body').scrollTop);
// control: same gesture on a plain scroller injected with touch-action:auto, to know the synthesizer works here
T.control=await ph.evaluate(()=>{ const s=document.createElement('div'); s.id='ctl'; s.style.cssText='position:fixed;left:0;top:0;width:200px;height:200px;overflow:auto;z-index:99;background:#333;touch-action:pan-y'; s.innerHTML='<div style="height:2000px"></div>'; document.body.appendChild(s); return 1; });
try{ await cdp.send('Input.synthesizeScrollGesture',{x:100,y:100,yDistance:-300,gestureSourceType:'touch',speed:800}); }catch(e){ T.ctlErr=String(e).slice(0,100); } await ph.waitForTimeout(300); T.controlScrollTop=await ph.evaluate(()=>{ const s=document.getElementById('ctl'); const v=s.scrollTop; s.remove(); return v; });
await ph.tap('#tv-close'); await ph.waitForTimeout(50); T.tapClose=await ph.evaluate(()=>window.__dd.Meta.isOpen());
// hb 🎒 during a wave then tap DEFEND
await ph.evaluate(()=>{ window.__dd.startWave(); window.__dd.step(1/60,5); }); await ph.touchscreen.tap(hb.x,hb.y); await ph.waitForTimeout(80); await ph.tap('#tv-defend'); await ph.waitForTimeout(50); T.defendInWave=await ph.evaluate(()=>({open:window.__dd.Meta.isOpen(),phase:window.__dd.S.phase}));
T.errs=ph.errs.slice(); out("phone",T);
await browser.close(); server.close();
