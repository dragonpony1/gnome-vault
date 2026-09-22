import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const SP=process.env.SP; const server=await serve(8803);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8803/"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin")&&window.__dd.mobModel("orc")&&window.__dd.mobModel("ogre"),null,{timeout:60000});
const info=await page.evaluate(()=>({hero:window.__dd.heroModel(),gob:window.__dd.mobModel("goblin")}));
check("goblin model loaded with all clips",info.gob&&["idle","walk","run","attack","death"].every(k=>info.gob.clips.includes(k)),JSON.stringify(info.gob));
check("hero model still loads, fitted to 2.6",info.hero&&Math.abs(info.hero.scale*info.hero.height-2.6)<.05,JSON.stringify(info.hero));
// --- a spawned goblin uses the GLB and runs toward the crystal ---
const r1=await page.evaluate(()=>{ const d=window.__dd; d.resetGear(); d.start(); d.step(1/60,5); const e=d.spawn("goblin","N"); const x0=e.x, z0=e.z; d.step(1/60,45);
  const st=d.mobState(e); return {glb:!!e.mdl.glb,state:st,moved:Math.hypot(e.x-x0,e.z-z0),visible:e.mdl.g.visible,inScene:!!e.mdl.g.parent,h:e.h,r:e.r}; });
check("goblin is a GLB mob and moves",r1.glb&&r1.moved>1&&r1.inScene,JSON.stringify(r1));
check("goblin plays its run clip while moving",r1.state&&/run|walk/i.test(r1.state.cur)&&r1.state.time>0,JSON.stringify(r1.state));
// --- orc stays procedural (no model yet) ---
const r2=await page.evaluate(()=>{ const d=window.__dd; const e=d.spawn("archer","N"); d.step(1/60,3); const o={glb:!!e.mdl.glb,legs:e.mdl.legs.length,orc:!!d.mobModel("orc")}; d.kill(e); const oe=d.spawn("orc","N"); d.step(1/60,20); o.orcGlb=!!oe.mdl.glb; o.orcState=d.mobState(oe); d.kill(oe); return o; });
check("archer slot wears the bandit model (Meshy rig)",r2.glb===true,JSON.stringify(r2));
const r2b=await page.evaluate(()=>{ const d=window.__dd; if(!d.mobModel("ogre")) return null; const og=d.spawn("ogre","N"); const x0=og.x, z0=og.z; d.step(1/60,20); const st=d.mobState(og); const moved1=Math.hypot(og.x-x0,og.z-z0); d.step(1/60,120); const moved2=Math.hypot(og.x-x0,og.z-z0); const st2=d.mobState(og); d.kill(og); return {shout:st&&st.cur,moved1,moved2,after:st2&&st2.cur,shoutT0:og.shoutT}; });
check("ogre spawns quiet and lumbers in (the roar waits for first sight of the hero)",!!r2b&&(!/shout/i.test(r2b.shout)&&r2b.moved2>1&&/walk|run/i.test(r2b.after)&&!(r2b.shoutT0>0)),JSON.stringify(r2b));
check("orc uses its model when it is served, walking",r2.orc&&(r2.orcGlb&&r2.orcState&&/walk|run/i.test(r2.orcState.cur)),JSON.stringify(r2));
// --- attack: put the hero in its face, expect the attack clip, then damage a beat later ---
const r3=await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.step(1/60,80); const e=d.spawn("goblin","N"); d.step(1/60,2); d.setHero(e.x,e.z+1.0,0); d.hero.hp=d.hero.max; const hp0=d.hero.hp;
  let attackSeen=false, hitFrame=-1, swingStart=-1; for(let i=0;i<120;i++){ d.step(1/60,1); const st=d.mobState(e); if(st&&/attack/i.test(st.cur)) attackSeen=true; if(e.swing>=0&&swingStart<0) swingStart=i; if(d.hero.hp<hp0&&hitFrame<0) hitFrame=i; if(hitFrame>=0) break; }
  return {attackSeen,swingStart,hitFrame,delay:hitFrame-swingStart,hp0,hp:d.hero.hp}; });
check("goblin attacks the hero with the attack clip",r3.attackSeen&&r3.hitFrame>=0,JSON.stringify(r3));
check("damage lands a beat after the swing starts (8-20 frames)",r3.delay>=8&&r3.delay<=20,"delay "+r3.delay);
// --- death: plays the death clip, body lingers, then it is removed ---
const r4=await page.evaluate(()=>{ const d=window.__dd; const e=d.enemies.find(e=>!e.dead&&e.kind==="goblin"); d.kill(e); d.step(1/60,6); const st=d.mobState(e); const alive1=d.enemies.includes(e); d.step(1/60,40); const alive2=d.enemies.includes(e); d.step(1/60,40); const alive3=d.enemies.includes(e); return {cur:st&&st.cur,alive1,alive2,alive3}; });
check("death clip plays and the body lingers ~1s before removal",/death/i.test(r4.cur)&&r4.alive1&&r4.alive2&&!r4.alive3,JSON.stringify(r4));
// --- many goblins: no errors, all animate independently ---
const r5=await page.evaluate(()=>{ const d=window.__dd; const es=[]; for(let i=0;i<12;i++) es.push(d.spawn("goblin",["N","E","W"][i%3])); d.step(1/60,30); const times=es.map(e=>d.mobState(e).time); const distinct=new Set(times.map(t=>t.toFixed(2))).size; return {n:es.length,alive:d.enemies.filter(e=>!e.dead).length,distinct}; });
check("12 goblins animate independently",r5.alive>=12&&r5.distinct>=2,JSON.stringify(r5));
// --- screenshot: hero chopping next to a pack ---
await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.step(1/60,90); d.setHero(0,10,Math.PI); const es=[]; for(let i=0;i<4;i++){ const e=d.spawn("goblin","N"); e.x=-2.2+i*1.5; e.z=6.5; e.yaw=0; es.push(e); } d.setCam(0,.35,7); d.step(1/60,20); d.swing(); d.step(1/60,9); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(150); await page.screenshot({path:SP+"/meshy/goblin/ingame.png"});
await page.evaluate(()=>{ const d=window.__dd; d.step(1/60,40); }); await page.waitForTimeout(100); await page.screenshot({path:SP+"/meshy/goblin/ingame2.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon|font/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
