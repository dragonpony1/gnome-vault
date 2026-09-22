import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8895);
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await (await browser.newContext({viewport:{width:800,height:560}})).newPage();
await page.goto("http://127.0.0.1:8895/?silent"); await page.waitForFunction(()=>window.__dd&&window.__heroes&&window.__weapons&&window.__dd.heroModel()&&/v2/.test(window.__dd.heroModel().label),null,{timeout:120000});
await page.evaluate(async()=>{ window.__heroes.select("witch"); await new Promise(r=>setTimeout(r,3000)); const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.step(1/60,5); for(let i=0;i<200;i++){ d.step(1/60,1); if(window.__weapons.state().whip) break; await new Promise(r=>setTimeout(r,30)); } d.setHero(0,6,0); d.setCam(.9,.25,4.4); d.step(1/60,60); document.getElementById("hud").style.display="none"; window.__freeze=true; });
for(const [n,k] of [["s0",0],["s5",5],["s10",5],["s14",4],["s18",4],["s26",8]]){ await page.evaluate(k=>{ const d=window.__dd; if(k===0) d.swing(); d.step(1/60,k||1); },k); await page.waitForTimeout(150); await page.screenshot({path:SP+"/parts/shots/strike-"+n+".png"}); }
await browser.close(); server.close();
