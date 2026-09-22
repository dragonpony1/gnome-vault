import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const server=await serve(8834); const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
for(const vp of [{width:1280,height:800},{width:390,height:844}]){ const page=await browser.newPage({viewport:vp}); await page.goto("http://127.0.0.1:8834/?silent",{timeout:120000}); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:60000});
  const fps=await page.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2); }; requestAnimationFrame(f); }));
  await page.evaluate(()=>{ window.__meta.reset(); window.__dd.start(); for(let i=0;i<8;i++) window.__meta.giveItem(window.__dd.rollItem(1,'charm',2)); window.__dd.Meta.open(); });
  const fpsOpen=await page.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2); }; requestAnimationFrame(f); }));
  const times=[]; for(let i=0;i<6;i++){ await page.click('#tv-bag .tv-grid .tv-card'); await page.waitForTimeout(100); const t0=Date.now(); await page.click('#tv-detail [data-act=sell]'); let landed=false; while(Date.now()-t0<8000){ if(await page.evaluate(()=>window.__tavern.goldShown()===window.__meta.gold())){ landed=true; break; } await page.waitForTimeout(50); } times.push((landed?'':'STALL ')+(Date.now()-t0)+'ms'); }
  console.log(JSON.stringify(vp),'rAF fps in play',fps,'with tavern open',fpsOpen,'sell→counter landed:',times.join(', ')); await page.close(); }
await browser.close(); server.close();
