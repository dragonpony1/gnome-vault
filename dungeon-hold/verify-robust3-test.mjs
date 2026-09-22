import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const log=(n,v)=>console.log(n+": "+JSON.stringify(v));
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const page=await browser.newPage({viewport:{width:960,height:600}}); const errs=[]; page.on("pageerror",e=>errs.push(String(e).slice(0,200))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errs.push(m.type()+": "+m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8833/?silent&nogate"); await ready(page); await page.evaluate(()=>{ localStorage.clear(); window.__meta.reset(); window.__dd.start(); window.__dd.step(1/60,2); });
// a. key toggling: synthetic vs real keyboard
const a1=await page.evaluate(()=>{ const r=[]; for(let i=0;i<3;i++){ const ev=new KeyboardEvent('keydown',{code:'KeyI',key:'i',bubbles:true,cancelable:true}); const ok=window.dispatchEvent(ev); r.push([ok,window.__tavern.isOpen(),ev.code]); } return r; });
const seq=[]; for(let i=0;i<3;i++){ await page.keyboard.press('KeyI'); seq.push(await page.evaluate(()=>window.__tavern.isOpen())); }
log('a.keys',{synthetic:a1,real:seq}); await page.evaluate(()=>window.__tavern.close());
// a2. real key repeat: hold I with keyboard.down repeatedly (Playwright sends repeat keydowns), count loops
const a2=await page.evaluate(async()=>{ const raf=window.requestAnimationFrame; let n=0; window.requestAnimationFrame=cb=>{ if(cb.name==='tvFrame') n++; return raf.call(window,cb); }; window.__loopCount=()=>n; window.__loopReset=()=>{n=0;}; window.__loopRestore=()=>{ window.requestAnimationFrame=raf; }; return 1; });
for(let i=0;i<9;i++){ await page.keyboard.down('KeyI'); await page.waitForTimeout(8); } await page.keyboard.up('KeyI'); await page.waitForTimeout(300);
const a3=await page.evaluate(async()=>{ window.__loopReset(); await new Promise(r=>setTimeout(r,2000)); const n=window.__loopCount(); const open=window.__tavern.isOpen(); window.__tavern.close(); await new Promise(r=>setTimeout(r,400)); window.__loopReset(); window.__tavern.open(); await new Promise(r=>setTimeout(r,2000)); const base=window.__loopCount(); window.__tavern.close(); window.__loopRestore(); return {open,loops2s:n,singleBaseline2s:base}; });
log('a2.holdI',a3);
// b. GPU geometry growth: familiar bolts vs harpoon shots, rendering between steps
const b=await page.evaluate(async()=>{ const d=window.__dd, M=window.__meta; const frame=()=>new Promise(r=>requestAnimationFrame(r)); const mem=d.r.info.memory;
  const fam=d.rollItem(4,'familiar',12); fam.stats.frate=300; fam.stats.fdmg=1; M.giveItem(fam); M.equip(fam.id); d.step(1/60,5); await frame(); const e=d.spawn('ogre','N'); const g0=mem.geometries, t0=mem.textures; let shots=0;
  for(let i=0;i<240;i++){ e.x=d.hero.x+3; e.z=d.hero.z; e.hp=1e9; e.dead=0; const b0=window.__familiar.bolts(); d.step(1/60,1); if(window.__familiar.bolts()>b0) shots++; if(i%10===0) await frame(); } d.step(1/60,120); await frame(); const famG=mem.geometries-g0, famT=mem.textures-t0; d.kill(e); d.step(1/60,60); await frame();
  M.unequip('familiar'); d.step(1/60,2); await frame(); d.addMana(999); d.place('harpoon',Math.round(d.hero.x)+2,Math.round(d.hero.z),0); const e2=d.spawn('ogre','N'); const g1=mem.geometries; let hs=0; for(let i=0;i<300;i++){ e2.x=d.hero.x+4; e2.z=d.hero.z; e2.hp=1e9; e2.dead=0; const n=d.projs.length; d.step(1/60,1); if(d.projs.length>n) hs++; if(i%10===0) await frame(); } d.step(1/60,120); await frame(); return {famShots:shots,famGeomGrowth:famG,famTexGrowth:famT,harpoonShots:hs,harpoonGeomGrowth:mem.geometries-g1,programs:d.r.info.programs.length}; });
log('b.gpu',b); log('errs',errs); await browser.close(); server.close();
