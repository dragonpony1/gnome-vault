import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8905);
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await (await browser.newContext({viewport:{width:1100,height:700}})).newPage();
await page.goto("http://127.0.0.1:8905/?silent"); await page.waitForFunction(()=>window.__dd&&window.__packs&&window.__doll&&window.__weapons&&window.__dd.heroModel()&&/v2/.test(window.__dd.heroModel().label),null,{timeout:120000});
await page.evaluate(async()=>{ const d=window.__dd, M=window.__meta, V=window.__void; M.reset(); d.resetGear(); d.start(); d.step(1/60,5); const mk=(slot)=>{ const it=d.rollItem(3,slot,8); V.make(it); M.giveItem(it); M.equip(it.id); return it; }; for(const s of ["weapon","armor","charm","amulet","familiar"]) mk(s); for(let i=0;i<200;i++){ d.step(1/60,1); const st=window.__weapons.state(); if(st.mounted&&st.void) break; await new Promise(r=>setTimeout(r,30)); } d.setHero(0,6,Math.PI); d.setCam(Math.PI-.7,.2,3.6); d.step(1/60,40); document.getElementById("hud").style.display="none"; window.__freeze=true; });
await page.waitForTimeout(200); await page.screenshot({path:SP+"/parts/shots/aura-hall.png"});
await page.evaluate(async()=>{ window.__freeze=false; window.__doll.open(); await new Promise(r=>setTimeout(r,900)); }); await page.screenshot({path:SP+"/parts/shots/aura-sheet.png",clip:{x:0,y:0,width:1100,height:700}});
await browser.close(); server.close();
