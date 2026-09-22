import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8866); const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errs=[]; page.on("pageerror",e=>errs.push(String(e))); page.on("console",m=>{ if(m.type()!=="log") errs.push(m.text().slice(0,160)); });
await page.goto("http://127.0.0.1:8866/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel()&&window.__crystal&&window.__crystal.state().model,null,{timeout:90000});
const st=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,7,Math.PI); d.setCam(Math.PI,.25,7); d.step(1/60,30); d.S.crystal-=1; d.hurtCrystal&&null; document.getElementById("hud").style.display="none"; return window.__crystal.state(); });
console.log(JSON.stringify(st));
await page.waitForTimeout(120); await page.screenshot({path:SP+"/parts/shots/crystal-calm.png"});
// the hit flash at full strength: only the crystal should light up
await page.evaluate(()=>{ const d=window.__dd; const e=d.spawn("goblin","N"); e.x=1.5; e.z=-2.5; e.spd=0; for(let i=0;i<400;i++){ d.step(1/60,1); e.x=1.5; e.z=-2.5; if(d.S.crystal<100) break; } d.kill(e); d.step(1/60,2); });
await page.waitForTimeout(120); await page.screenshot({path:SP+"/parts/shots/crystal-flash.png"});
console.log("errors:",errs.join(" | ")||"none"); await browser.close(); server.close();
