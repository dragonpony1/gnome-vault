import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:960,height:600}}); await page.goto("http://127.0.0.1:8833/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:40000});
await page.evaluate(()=>{ localStorage.clear(); window.__meta.reset(); window.__dd.start(); window.__dd.step(1/60,2); window.__dd.Meta.open(); });
let hit=false; for(let i=0;i<40&&!hit;i++){ await page.keyboard.press('Tab'); hit=await page.evaluate(()=>document.activeElement&&document.activeElement.id==='wavebtn'); }
await page.keyboard.press('Enter'); await page.waitForTimeout(80);
console.log(JSON.stringify({reachedWavebtn:hit,...await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen(),queue:window.__dd.status().queue}))}));
await browser.close(); server.close();
