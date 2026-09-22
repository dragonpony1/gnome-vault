import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const log=(n,v)=>console.log(n+": "+JSON.stringify(v));
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const page=await browser.newPage({viewport:{width:960,height:600}}); const errs=[]; page.on("pageerror",e=>errs.push(String(e).slice(0,200))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errs.push(m.type()+": "+m.text().slice(0,200)); });
const URL="http://127.0.0.1:8833/?silent";
// 1. older ddGear without id/score (pre-bag saves) → equipped cards
await page.goto(URL); await ready(page); await page.evaluate(()=>{ localStorage.clear(); localStorage.setItem('ddGear','{"weapon":{"slot":"weapon","rarity":3,"lvl":4,"tier":2,"name":"Old Blade","stats":{"dmg":7,"spd":10},"value":120},"armor":{"slot":"armor","rarity":1,"lvl":2,"name":"Old Mail","stats":{"hp":12},"value":30,"score":12}}'); });
await page.goto(URL); await ready(page);
const old=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.start(); d.step(1/60,2); const better=d.rollItem(4,'weapon',9); M.giveItem(better); const worse=d.rollItem(0,'weapon',1); M.giveItem(worse); window.__tavern.open(); window.__tavern.render();
  const eq=document.querySelector('#tv-bag .tv-card[data-from="eq"]'); eq.click(); const m1=window.__tavern.state().msg; const sel1=window.__tavern.state().sel; const eqHtml=eq.outerHTML.slice(0,160);
  const cards=[...document.querySelectorAll('#tv-bag .tv-card[data-from="bag"]')]; const vs=cards.map(c=>(c.querySelector('.vs')||{}).textContent); cards[0].click(); const det=document.getElementById('tv-detail').textContent; const detHidden=document.getElementById('tv-detail').classList.contains('hide');
  const junk=M.sellJunk(); const un=M.unequip('weapon'); return {eqHtml,m1,sel1,vs,det:det.slice(0,200),detHidden,junk,unequip:un,gearW:d.gear().weapon&&d.gear().weapon.name}; });
log('1.oldGear',{...old,errs:errs.slice()}); errs.length=0;
// 2. which click throws for rarity 2.5
await page.evaluate(()=>{ window.__tavern.close(); const M=window.__meta; M.reset(); const it={slot:'charm',rarity:2.5,name:'Odd',stats:{hp:3}}; M.giveItem(it); window.__tavern.open(); window.__tavern.render(); document.querySelector('#tv-bag .tv-card[data-from="bag"]').click(); window.__tavern.close(); });
log('2.frac',errs.slice()); errs.length=0;
// 3. rAF loop duplication, longer windows
const E=await page.evaluate(async()=>{ const raf=window.requestAnimationFrame; let n=0; window.requestAnimationFrame=cb=>{ if(cb.name==='tvFrame') n++; return raf.call(window,cb); }; const wait=ms=>new Promise(r=>setTimeout(r,ms));
  window.__tavern.open(); await wait(300); n=0; await wait(2000); const single=n; window.__tavern.close(); await wait(300); window.__tavern.open(); window.__tavern.close(); window.__tavern.open(); window.__tavern.close(); window.__tavern.open(); await wait(300); n=0; await wait(2000); const triple=n; window.__tavern.close(); await wait(300); n=0; await wait(1000); const closed=n; window.requestAnimationFrame=raf; return {single2s:single,afterSameFrameReopenx3:triple,closed1s:closed}; });
log('3.rafLoops',E);
// 4. key repeat step by step
const K=await page.evaluate(()=>{ const r=[]; for(let i=0;i<5;i++){ dispatchEvent(new KeyboardEvent('keydown',{code:'KeyI',key:'i',bubbles:true,cancelable:true})); r.push(window.__tavern.isOpen()); } return r; });
log('4.keyToggleSeq',K); await page.evaluate(()=>window.__tavern.close());
// 5. bolt allocation: count SphereGeometry constructions per shot and live bolts; render between steps
const F=await page.evaluate(async()=>{ const d=window.__dd, M=window.__meta; M.reset(); const fam=d.rollItem(4,'familiar',12); fam.stats.frate=300; fam.stats.fdmg=1; M.giveItem(fam); M.equip(fam.id); const Orig=THREE.SphereGeometry; let alloc=0; THREE.SphereGeometry=class extends Orig{ constructor(...a){ super(...a); alloc++; } };
  const e=d.spawn('ogre','N'); let shots=0; const oh=window.__familiar.bolts(); for(let i=0;i<240;i++){ e.x=d.hero.x+3; e.z=d.hero.z; e.hp=1e9; e.dead=0; const b0=window.__familiar.bolts(); d.step(1/60,1); if(window.__familiar.bolts()>b0) shots++; if(i%20===0) await new Promise(r=>requestAnimationFrame(r)); }
  d.kill(e); d.step(1/60,120); await new Promise(r=>requestAnimationFrame(r)); const mem=d.r.info.memory; THREE.SphereGeometry=Orig; return {shots,sphereAllocs:alloc,boltsLeft:window.__familiar.bolts(),gpuGeoms:mem.geometries,gpuTex:mem.textures}; });
log('5.boltAlloc',F);
// 6. game.js own projectiles: do they allocate geometry per shot? (baseline for style)
const P=await page.evaluate(async()=>{ const d=window.__dd; const Orig=THREE.CylinderGeometry, OrigS=THREE.SphereGeometry; let alloc=0; THREE.CylinderGeometry=class extends Orig{ constructor(...a){ super(...a); alloc++; } }; THREE.SphereGeometry=class extends OrigS{ constructor(...a){ super(...a); alloc++; } }; d.addMana(999); const ok=d.place('harpoon',Math.round(d.hero.x)+2,Math.round(d.hero.z),0); const e=d.spawn('ogre','N'); let p0=d.projs.length, shots=0; for(let i=0;i<300;i++){ e.x=d.hero.x+4; e.z=d.hero.z; e.hp=1e9; e.dead=0; const n=d.projs.length; d.step(1/60,1); if(d.projs.length>n) shots++; } THREE.CylinderGeometry=Orig; THREE.SphereGeometry=OrigS; d.kill(e); return {placed:ok,shots,geomAllocs:alloc}; });
log('6.gameProjAlloc',P);
log('errs',errs); await browser.close(); server.close();
