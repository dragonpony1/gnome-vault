// in-game frames of the witch's swing with Meshy's own crack clip (PROC off) and with the hand-made strike (PROC on)
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8904);
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await (await browser.newContext({viewport:{width:800,height:560}})).newPage();
await page.goto("http://127.0.0.1:8904/?silent"); await page.waitForFunction(()=>window.__dd&&window.__heroes&&window.__weapons&&window.__armSwing&&window.__dd.heroModel()&&/v2/.test(window.__dd.heroModel().label),null,{timeout:120000});
await page.evaluate(async()=>{ window.__heroes.select("witch"); await new Promise(r=>setTimeout(r,3000)); const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.step(1/60,5); for(let i=0;i<200;i++){ d.step(1/60,1); if(window.__weapons.state().whip) break; await new Promise(r=>setTimeout(r,30)); } d.setHero(0,6,0); d.setCam(1.1,.22,4.6); d.step(1/60,60); document.getElementById("hud").style.display="none"; window.__freeze=true; });
for(const mode of ["clip","hand"]){ await page.evaluate(m=>{ window.__armSwing.set("witch",m==="hand"?"Left":null); window.__dd.step(1/60,30); },mode); await page.screenshot({path:SP+"/parts/shots/w2-"+mode+"-idle.png"});
  for(const [n,k] of [["a",6],["b",6],["c",6],["d",6]]){ await page.evaluate(([k,first])=>{ const d=window.__dd; if(first) d.swing(); d.step(1/60,k); },[k,n==="a"]); await page.waitForTimeout(120); await page.screenshot({path:SP+"/parts/shots/w2-"+mode+"-"+n+".png"}); } await page.evaluate(()=>window.__dd.step(1/60,60)); }
await browser.close(); server.close();
