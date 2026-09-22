import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const server=await serve(8798);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
await page.goto("http://127.0.0.1:8798/?silent&nogate"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:30000});
const r=await page.evaluate(()=>{ const d=window.__dd; d.start(); d.resetGear(); d.setHero(0,8,Math.PI); d.setCam(0,.42,8); d.step(1/60,30);
  d.select("harpoon"); d.step(1/60,5); const g1=d.ghost(); d.setCam(0,.15,8); d.step(1/60,5); const g2=d.ghost(); d.setCam(0,.9,8); d.step(1/60,5); const g3=d.ghost();
  d.rotateGhost(Math.PI/12); d.step(1/60,2); const g4=d.ghost();
  d.confirmPlace(); d.step(1/60,2); const stuck=d.ghost(); d.setCam(0.6,.3,8); d.step(1/60,5); const stuck2=d.ghost();   // first click sets it down; camera moves should not move it
  d.rotateGhost(Math.PI/6); d.step(1/60,2); const stuck3=d.ghost(); d.unstick(); d.step(1/60,3); const free=d.ghost(); d.setCam(0,.42,8); d.step(1/60,5);
  d.confirmPlace(); d.step(1/60,2); d.rotateGhost(Math.PI/12); d.step(1/60,2); const g4b=d.ghost(); d.confirmPlace(); d.step(1/60,2); const def=d.defs[0];
  // a blockade across the corridor: it should claim more than one square
  d.setHero(0,-10,0); d.setCam(0,.42,8); d.step(1/60,5); d.select("spike"); d.step(1/60,5); d.rotateGhost(Math.PI/2-d.cam.yaw); d.step(1/60,2); d.confirmPlace(); d.step(1/60,2); d.confirmPlace(); d.step(1/60,2); const sp=d.defs[1];
  const before=d.defs.length; d.setHero(sp.x,sp.z-3.36,0); d.setCam(0,.42,8); d.step(1/60,5); d.select("harpoon"); d.step(1/60,5); const g5=d.ghost(); d.confirmPlace(); d.step(1/60,2); d.confirmPlace(); d.step(1/60,2); const after=d.defs.length-before;
  const gridOk=!!d.place("ball",12,12,0);
  return {g1,g2,g3,g4,stuck,stuck2,stuck3,free,g4b,def:def&&{x:def.x,z:def.z,rot:def.rot,cells:def.cells.length},sp:sp&&{cells:sp.cells.length,x:sp.x,z:sp.z},g5,after,gridOk,defs:d.defs.length}; });
check("ghost sits where the camera looks, not on a grid centre", r.g1&&Math.abs(r.g1.x-Math.round(r.g1.x))>1e-6||Math.abs(r.g1.z-Math.round(r.g1.z))>1e-6, JSON.stringify(r.g1));
check("look flatter → further away, look down → closer", r.g2.dist>r.g1.dist&&r.g3.dist<r.g1.dist, JSON.stringify({near:r.g3.dist,mid:r.g1.dist,far:r.g2.dist}));
check("R turns the ghost by 15 degrees", Math.abs(((r.g4.yaw-r.g1.yaw)%(2*Math.PI))-Math.PI/12)<1e-6, String(r.g4.yaw-r.g1.yaw));
check("first click sets it down; it no longer follows the camera", r.stuck.stage===1&&r.stuck2.stage===1&&Math.abs(r.stuck2.x-r.stuck.x)<1e-9&&Math.abs(r.stuck2.z-r.stuck.z)<1e-9, JSON.stringify({stuck:r.stuck,stuck2:r.stuck2}));
check("it turns in place while set down", Math.abs(((r.stuck3.yaw-r.stuck2.yaw)%(2*Math.PI))-Math.PI/6)<1e-6&&r.stuck3.x===r.stuck2.x, String(r.stuck3.yaw-r.stuck2.yaw));
check("right-click picks it back up", r.free.stage===0, JSON.stringify(r.free));
check("second click builds it exactly there with that rotation", r.def&&Math.abs(r.def.x-r.g4b.x)<1e-6&&Math.abs(r.def.z-r.g4b.z)<1e-6&&Math.abs(r.def.rot-r.g4b.yaw)<1e-6, JSON.stringify({def:r.def,ghost:r.g4b}));
check("blockade claims more than one square", r.sp&&r.sp.cells>=2, JSON.stringify(r.sp));
check("cannot build on an occupied spot", r.g5&&!r.g5.ok&&/occupied/i.test(r.g5.why)&&r.after===0, JSON.stringify(r.g5));
check("old grid placement API still works", r.gridOk, String(r.defs));
check("no errors", errors.length===0, errors.join(" | "));
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} placement checks passed`); process.exit(f?1:0);
