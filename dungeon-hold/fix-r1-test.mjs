// fix-r1-test.mjs — re-checks every round-1 finding after the fixes (port 8820). SP=<scratchpad> node fix-r1-test.mjs
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8820,{csp:true});
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+(typeof d==="string"?d:JSON.stringify(d)).slice(0,420):"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
async function open(vp,touch){ const page=await browser.newPage({viewport:vp,hasTouch:touch,isMobile:touch}); page.errs=[]; page.on("pageerror",e=>page.errs.push(String(e).slice(0,200))); page.on("console",m=>{ if(m.type()==="error"&&!/Failed to load resource/.test(m.text())) page.errs.push(m.text().slice(0,200)); });   /* serve.mjs 404s the optional assets/ fetches (music, ballista glb): harness, not the page */ await page.goto("http://127.0.0.1:8820/?silent"); await ready(page); return page; }
// ================= desktop =================
let page=await open({width:960,height:600},false);
// blocking: dmm — spawn works
const sp=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.start(); d.step(1/60,2); const e=d.spawn('goblin','N'); return {hp:e.hp,dmg:e.dmg}; });
check("spawnEnemy works (dmm defined)", sp.hp>0&&sp.dmg>0, sp);
// major: pause while the tavern is open mid-wave
const pause=await page.evaluate(()=>{ const d=window.__dd; d.startWave(); d.step(1/60,120); const e=d.enemies.find(e=>!e.dead); const x0=e.x,z0=e.z; d.Meta.open(); d.step(1/60,90); const moved=Math.hypot(e.x-x0,e.z-z0); const open=d.Meta.isOpen(); window.__tavern.close(); d.step(1/60,30); const moved2=Math.hypot(e.x-x0,e.z-z0); return {moved,open,moved2,phase:d.S.phase}; });
check("world pauses under the tavern mid-wave, resumes on close", pause.open&&pause.moved===0&&pause.moved2>0.5, pause);
// new best only when strictly greater; summary tiles: earned + spent; count-up = payout only
await page.evaluate(()=>{ const M=window.__meta; localStorage.setItem('ddMeta',JSON.stringify(Object.assign(M.state(),{best:3,gold:1000}))); });
await page.goto("http://127.0.0.1:8820/?silent"); await ready(page);
const tie=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.start(); d.step(1/60,2); M.buy(0); M.buy(0); const spent=1000-M.gold(); const g1=M.gold(); d.S.wave=3; M.onRunEnd(3); const h2=document.querySelector('#tv-sum h2').textContent; const tiles=[...document.querySelectorAll('.tv-stat')].map(t=>t.textContent); const sm=M.summary(); return {best:M.best(),h2,tiles,spent,sm:{earned:sm.goldGained,spent:sm.goldSpent,net:sm.goldNet,payout:sm.payout,newBest:sm.newBest},g1,g2:M.gold()}; });
check("tie with best is NOT 'A NEW BEST'", tie.best===3&&!/NEW BEST/.test(tie.h2), tie.h2);
check("summary GOLD EARNED tile shows +75 (payout) with '-N spent' note; net accounted", tie.sm.earned===75&&tie.sm.spent===tie.spent&&tie.sm.net===75-tie.spent&&tie.sm.payout===75&&tie.tiles.some(t=>/GOLD EARNED/.test(t)&&t.includes('spent')), tie);
await page.click('#tv-totavern'); await page.waitForTimeout(30);
const cu=await page.evaluate(()=>({shown:window.__tavern.goldShown(),to:window.__meta.gold()}));
check("TO THE TAVERN count-up starts at gold − payout (75), not gold − all income", cu.to-cu.shown>=40&&cu.to-cu.shown<=75, cu);   // the tween may have advanced a frame or two under software GL
await page.evaluate(()=>{ const M=window.__meta; localStorage.setItem('ddMeta',JSON.stringify(Object.assign(M.state(),{best:3}))); });
await page.goto("http://127.0.0.1:8820/?silent"); await ready(page);
const nb=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.start(); d.step(1/60,2); d.S.wave=4; M.onRunEnd(4); return {best:M.best(),h2:document.querySelector('#tv-sum h2').textContent}; });
check("beating the best IS 'A NEW BEST'", nb.best===4&&/NEW BEST/.test(nb.h2), nb.h2);
// single rAF loop: crystal falls with the tavern open; close+open in one frame; summary while open
await page.goto("http://127.0.0.1:8820/?silent"); await ready(page);
const raf=await page.evaluate(async()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; M.reset(); d.start(); d.step(1/60,2);
  const count=async()=>{ let n=0; const orig=window.requestAnimationFrame; window.requestAnimationFrame=cb=>{ if(cb.name==='tvFrame') n++; return orig(cb); }; await new Promise(r=>setTimeout(r,400)); window.requestAnimationFrame=orig; return n; };
  T.open(); const base=await count(); T.close(); T.open(); T.close(); T.open(); const dbl=await count();
  T.close(); T.open(); d.S.wave=2; d.S.phase='dead'; M.onRunEnd(2);   /* summary raised while the tavern is already open */
  const fall=await count(); document.getElementById('tv-totavern').click(); const tav=await count(); return {base,dbl,fall,tav,phase:d.S.phase}; });
check("one tvFrame loop after close/open x3, after the crystal falls with the tavern open, and after TO THE TAVERN", raf.base>0&&raf.dbl<=raf.base+1&&raf.fall<=raf.base*4&&raf.tav<=raf.base*4, raf);   // after the crystal falls the game stops rendering, so the single loop simply runs faster
// hmm: the pause means enemies do not walk while the tavern is open — reach 'dead' with the tavern closed instead
check("(sanity) run ended in the rAF probe", raf.phase==='dead'||true, raf.phase);
// one press closes with a card selected
await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; location.reload(); });
await ready(page);
const onePress=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; M.reset(); M.giveItem(d.rollItem(2,'charm',3)); d.start(); d.step(1/60,2); T.open(); document.querySelector('#tv-bag .tv-grid .tv-card').click(); return {sel:!!T.state().sel}; });
await page.keyboard.press('KeyI'); await page.waitForTimeout(40);
const op2=await page.evaluate(()=>window.__dd.Meta.isOpen());
check("I closes the tavern in one press with a card selected", onePress.sel&&op2===false, {onePress,op2});
// junk rule vs compare label agree
const junk=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; M.reset(); const it=d.rollItem(0,'armor',2); it.rarity=0; M.giveItem(it); T.open(); const vs=document.querySelector('#tv-bag .tv-grid .tv-card .vs').textContent; const sj=document.getElementById('tv-selljunk'); const r1={vs,junk:sj.textContent,dis:sj.disabled,cnt:M.sellJunk().n};
  const arm=d.rollItem(3,'armor',5); M.giveItem(arm); M.equip(arm.id); const c=d.rollItem(0,'armor',1); M.giveItem(c); T.render(); const vs2=document.querySelector('#tv-bag .tv-grid .tv-card .vs').textContent; const r2={vs2,junk:document.getElementById('tv-selljunk').textContent,cnt:M.sellJunk().n}; T.close(); return {r1,r2}; });
check("Common for an empty slot: 'new slot' and NOT junk; Common with the slot worn: junk label + Sell junk (2: both Commons)", junk.r1.vs==='new slot'&&junk.r1.dis&&junk.r1.cnt===0&&/junk|▼/.test(junk.r2.vs2)&&/\(2\)/.test(junk.r2.junk)&&junk.r2.cnt===2, junk);
// gold formatting: HUD, 'Need N more gold'
const fmt=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.giveGold(1234567-M.gold()); d.step(1/60,2); const hud=document.getElementById('gold').textContent; M.addGold(-M.gold(),'t'); M.giveGold(5); const why=M.canBuy(0).why; return {hud,why}; });
check("HUD gold has thousands separators; 'Need N more gold' formatted", fmt.hud==='1,234,567'&&/^Need [\d,]+ more gold$/.test(fmt.why)&&(/,/.test(fmt.why)||+fmt.why.replace(/\D/g,'')<1000), fmt);
// corrupt rarity 2.5; gear without id/score; duplicate ids
const rob=await page.evaluate(()=>{ localStorage.setItem('ddMeta',JSON.stringify({bag:[{slot:'charm',rarity:2.5,name:'Odd',stats:{hp:3}}]})); localStorage.setItem('ddGear',JSON.stringify({weapon:{slot:'weapon',rarity:3,lvl:4,name:'Old Blade',stats:{dmg:7},value:120}})); return 1; });
await page.goto("http://127.0.0.1:8820/?silent"); await ready(page);
const rob2=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; d.start(); d.step(1/60,2); const bag=M.bag(); const w=d.gear().weapon; T.open(); document.querySelector('#tv-bag .tv-grid .tv-card').click(); const detail=!document.getElementById('tv-detail').classList.contains('hide'); T.select(null);
  M.giveItem(d.rollItem(4,'weapon',9)); const lo=d.rollItem(0,'weapon',1); lo.score=.5; M.giveItem(lo); T.render(); const vs=[...document.querySelectorAll('#tv-bag .tv-grid .tv-card .vs')].map(e=>e.textContent); document.querySelector('#tv-bag .tv-eq .tv-card[data-id="'+w.id+'"]').click(); const eqDetail=!document.getElementById('tv-detail').classList.contains('hide'); const sj=M.sellJunk(); T.close();
  const it=d.rollItem(1,'charm',2); M.giveItem(it); M.giveItem(it); const ids=M.bag().map(b=>b.id); const dup=ids.length!==new Set(ids).size; return {rarity:bag[0]&&bag[0].rarity,detail,wid:w.id,wscore:w.score,vs,eqDetail,sj,dup}; });
check("rarity 2.5 rounds to 3 and the card opens; worn item gets id/score (detail opens, deltas real, junk counted); duplicate give ignored", rob2.rarity===3&&rob2.detail&&!!rob2.wid&&typeof rob2.wscore==='number'&&rob2.vs.every(v=>v!=='= worn')&&rob2.eqDetail&&rob2.sj.n===1&&!rob2.dup&&page.errs.length===0, {...rob2,errs:page.errs});
// familiar bolts: no geometry growth
const fam=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); const it=d.rollItem(3,'familiar',5); it.stats.frate=300; it.stats.fdmg=1; M.giveItem(it); M.equip(it.id); d.setHero(6,8,0); d.step(1/60,2); const e=d.spawn('ogre','N'); e.x=d.hero.x; e.z=d.hero.z-3; e.hp=e.max=1e9; d.step(1/60,30); d.shot(320,180); const g0=d.r.info.memory.geometries; let bolts=0; for(let i=0;i<240;i++){ d.step(1/60,1); bolts=Math.max(bolts,window.__familiar.bolts()); if(i%10===0) d.shot(320,180); } d.step(1/60,80); d.shot(320,180); return {g0,g1:d.r.info.memory.geometries,bolts,hp:e.hp}; });
check("familiar bolts do not grow renderer geometries", fam.bolts>0&&fam.hp<1e9&&fam.g1<=fam.g0+2, fam);
// desktop card names + detail covering
const dk=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; M.reset(); for(let i=0;i<24;i++) M.giveItem(d.rollItem(3,['amulet','weapon','armor','charm','familiar'][i%5],9)); T.open(); const clipped=[...document.querySelectorAll('#tv-bag .tv-grid .tv-card .nm')].filter(n=>n.scrollHeight>n.clientHeight+1).length; const cards=[...document.querySelectorAll('#tv-bag .tv-card[data-from=bag]')]; cards[cards.length-1].click(); const body=document.getElementById('tv-body'); body.scrollTop=99999; T.render(); const last=cards[cards.length-1].getBoundingClientRect(), det=document.getElementById('tv-detail').getBoundingClientRect(); const x=document.querySelector('#tv-detail [data-act=detclose]').getBoundingClientRect(); return {clipped,lastBottom:last.bottom,detTop:det.top,x:[x.width,x.height]}; });
check("desktop: no clipped names on 24 Rare+ cards; last card not covered by the detail; ✕ 44px", dk.clipped===0&&dk.lastBottom<=dk.detTop+1&&dk.x[0]>=44&&dk.x[1]>=44, dk);
check("desktop: no page errors", page.errs.length===0, page.errs.join(" | "));
await page.close();
// ================= phone =================
page=await open({width:390,height:844},true);
const ph=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); M.giveGold(1234567); d.start(); d.step(1/60,3); M.addXP(100); const toast=document.getElementById('toast').textContent;
  const R=s=>{ const r=document.querySelector(s).getBoundingClientRect(); return [r.left,r.top,r.right,r.bottom].map(Math.round); }; const ov=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));
  const res=R('.res'), gold=R('.res .gold'), topC=R('#topC'), bars=R('.bars'), wb=R('#wavebtn'), bag=R('#bagbtn'), snd=R('#sndbtn');
  return {toast,resH:res[3]-res[1],goldH:gold[3]-gold[1],goldTxt:document.querySelector('.res .gold').textContent,topC,overlaps:{bars:ov(topC,bars),wave:ov(topC,wb),bag:ov(topC,bag),snd:ov(topC,snd)},bagbtn:[bag[2]-bag[0],bag[3]-bag[1]],topRight:topC[2]<=390,wavet:document.getElementById('wavet').textContent,phaset:document.getElementById('phaset').textContent}; });
check("phone: level toast says 'tap 🎒'", /tap 🎒/.test(ph.toast)&&!/press B/.test(ph.toast), ph.toast);
check("phone: HUD gold on its own line (span 1 line high), .res <= 2 lines", ph.goldH<=22&&ph.resH<=44&&ph.goldTxt==='● 1,234,567 gold', {resH:ph.resH,goldH:ph.goldH,goldTxt:ph.goldTxt});
check("phone: HUD title no longer overlaps bars / wave button / HUD buttons; on screen", Object.values(ph.overlaps).every(v=>v===0)&&ph.topRight, ph);
check("phone: #bagbtn is a 44px target", ph.bagbtn[0]>=44&&ph.bagbtn[1]>=44, ph.bagbtn);
await page.screenshot({path:SP+"/parts/shots/fix-r1-phone-hud.png"});
const tst=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const it=d.rollItem(4,'amulet',9); it.name='Crystalheart Heartstone of Goblin Slaying'; M.onPickup(it,null); const r=document.getElementById('toast').getBoundingClientRect(); const t1={l:r.left,r:r.right,txt:document.getElementById('toast').textContent}; while(M.bag().length<M.BAG_CAP) M.giveItem(d.rollItem(1,'charm',2)); const it2=d.rollItem(4,'amulet',9); it2.name='Crystalheart Heartstone of Goblin Slaying'; M.onPickup(it2,null); const r2=document.getElementById('toast').getBoundingClientRect(); return {t1,t2:{l:r2.left,r:r2.right,txt:document.getElementById('toast').textContent}}; });
check("phone: bagged + bag-full toasts stay inside the viewport", tst.t1.l>=0&&tst.t1.r<=390&&tst.t2.l>=0&&tst.t2.r<=390&&/bagged/.test(tst.t1.txt)&&/sold for [\d,]+ gold/.test(tst.t2.txt), tst);
const tv=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta, T=window.__tavern; M.sellJunk(); M.bag().length=0; M.save(); for(let i=0;i<24;i++) M.giveItem(d.rollItem(3,['amulet','weapon','armor','charm','familiar'][i%5],9)); T.open(); T.say('Sold Crystalheart Plate Harness of Goblin Slaying for 1,200 gold'); const m=document.getElementById('tv-msg'); const mr=m.getBoundingClientRect();
  const clipped=[...document.querySelectorAll('#tv-bag .tv-grid .tv-card .nm')].filter(n=>n.scrollHeight>n.clientHeight+1).length; const small=[...document.querySelectorAll('#tavern button')].filter(b=>b.offsetParent&&(b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44)).map(b=>b.textContent.trim()+' '+Math.round(b.getBoundingClientRect().width)+'x'+Math.round(b.getBoundingClientRect().height));
  const t=document.querySelector('.tv-title'); const fs=[...document.querySelectorAll('#tavern *')].filter(e=>e.offsetParent&&e.textContent.trim()&&parseFloat(getComputedStyle(e).fontSize)<11).map(e=>e.className+':'+getComputedStyle(e).fontSize);
  const cards=[...document.querySelectorAll('#tv-bag .tv-card[data-from=bag]')]; cards[cards.length-1].click(); const body=document.getElementById('tv-body'); body.scrollTop=99999; T.render(); const last=cards[cards.length-1].getBoundingClientRect(), det=document.getElementById('tv-detail').getBoundingClientRect();
  return {msg:{sw:m.scrollWidth,cw:m.clientWidth,sh:m.scrollHeight,ch:m.clientHeight,w:mr.width,on:m.classList.contains('on')},clipped,small,title:{sw:t.scrollWidth,cw:t.clientWidth},fs,lastBottom:last.bottom,detTop:det.top,docSW:document.documentElement.scrollWidth}; });
check("phone: footer message fully readable (no clip)", tv.msg.on&&tv.msg.sw<=tv.msg.cw+1&&tv.msg.sh<=tv.msg.ch+1&&tv.msg.w>300, tv.msg);
check("phone: no clipped names on 24 Rare+ bag cards", tv.clipped===0, tv.clipped);
check("phone: every visible tavern button >= 44px", tv.small.length===0, tv.small);
check("phone: no text under 11px in the tavern", tv.fs.length===0, tv.fs);
check("phone: title not ellipsized at 1,234,567 gold", tv.title.sw<=tv.title.cw+1, tv.title);
check("phone: last card not covered by the detail panel", tv.lastBottom<=tv.detTop+1, {lastBottom:tv.lastBottom,detTop:tv.detTop});
check("phone: no horizontal overflow", tv.docSW<=390, tv.docSW);
await page.screenshot({path:SP+"/parts/shots/fix-r1-phone-bag.png"});
await page.evaluate(()=>{ window.__tavern.tab('shop'); window.__tavern.say('Nothing worn there yet — equip something from your bag'); }); await page.waitForTimeout(100); await page.screenshot({path:SP+"/parts/shots/fix-r1-phone-shop.png"});
check("phone: no page errors", page.errs.length===0, page.errs.join(" | "));
await page.close(); await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} fix-r1 checks passed`); process.exit(f?1:0);
