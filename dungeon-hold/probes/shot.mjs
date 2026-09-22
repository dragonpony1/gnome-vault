import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const server=await (await import("./serve.mjs")).serve(8807);
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto("http://127.0.0.1:8807/"); await page.evaluate(k=>{ window.__KIND=k; },process.env.KIND||"goblin"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin")&&(window.__KIND!=="orc"||window.__dd.mobModel("orc")),null,{timeout:60000});
const info=await page.evaluate(()=>{ const d=window.__dd; d.resetGear(); d.start(); d.setHero(0,10,0); d.setCam(Math.PI,.22,5.5); d.step(1/60,40);
  const dx=d.hero.x-d.cam.x, dz=d.hero.z-d.cam.z, l=Math.hypot(dx,dz), fx=dx/l, fz=dz/l;   // camera -> hero direction
  const es=[]; for(let i=0;i<(window.__KIND==="orc"?3:5);i++) es.push(d.spawn(window.__KIND||"goblin",["N","E","W"][i%3])); d.step(1/60,25);
  const place=()=>{ es.forEach((e,i)=>{ const s=(i-(window.__KIND==="orc"?1:2))*(window.__KIND==="orc"?2.4:1.5); e.x=d.hero.x+fx*(3.0+Math.abs(s)*.3)-fz*s; e.z=d.hero.z+fz*(3.0+Math.abs(s)*.3)+fx*s; e.yaw=Math.atan2(-fx,-fz); }); };
  place(); d.step(1/60,1); place(); d.swing(); d.step(1/60,8); place(); d.step(1/60,1); document.getElementById("hud").style.display="none";
  return {cam:[d.cam.x,d.cam.y,d.cam.z].map(v=>+v.toFixed(1)),hero:[d.hero.x,d.hero.z],gob:es.map(e=>[+e.x.toFixed(1),+e.z.toFixed(1),d.mobState(e).cur])}; });
console.log(JSON.stringify(info));
await page.waitForTimeout(120); await page.screenshot({path:SP+"/parts/shots/"+(process.env.KIND||"goblin")+"-ingame.png"});
await page.evaluate(()=>{ const d=window.__dd; d.step(1/60,7); }); await page.waitForTimeout(100); await page.screenshot({path:SP+"/parts/shots/"+(process.env.KIND||"goblin")+"-ingame2.png"});
await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) if(Math.random()<.6) d.kill(e); d.step(1/60,25); }); await page.waitForTimeout(100); await page.screenshot({path:SP+"/parts/shots/"+(process.env.KIND||"goblin")+"-ingame3.png"});
console.log("errors:",errs.join(" | ")||"none"); await browser.close(); server.close();
