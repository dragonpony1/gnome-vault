import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const SP=process.env.SP; const server=await serve(8842);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const GLB=process.env.GLB||(SP+"/glb/squire.glb"); const b64=fs.readFileSync(GLB).toString("base64");
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8842/?silent&nogate"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin")&&window.__defglb&&window.__defglb.list().harpoon&&window.__defglb.list().harpoon[0]&&window.__defglb.list().harpoon[1],null,{timeout:60000});
const fetched=await page.evaluate(()=>window.__defglb.list());
check("hero, goblin and both ballista tiers fetched from assets/",!!fetched.harpoon[0]&&!!fetched.harpoon[1]&&fetched.harpoon[0].turn===null,JSON.stringify(fetched));
// the stand-in model (a rigged squire, so it has a "Head" node that turns) replaces the Mark I look; Mark II keeps the fetched tier-2 ballista
const reg=await page.evaluate(async(b64)=>{ const L=(i)=>new Promise(r=>window.__defglb.load("harpoon",b64,i,e=>r(e?String(e):"ok"))); const a=await L(0); return {a,list:window.__defglb.list()}; },b64);
check("stand-in GLB registered over Mark I",reg.a==="ok"&&reg.list.harpoon[0]&&reg.list.harpoon[0].turn==="Head"&&reg.list.harpoon[1].turn===null,JSON.stringify(reg));
// ghost uses the model with ghost material and no outline; the built turret turns toward an enemy and fires
const r1=await page.evaluate(()=>{ const d=window.__dd; d.resetGear(); d.start(); d.addMana(5000); d.setHero(0,-2,Math.PI); d.step(1/60,5); d.select("harpoon"); d.step(1/60,3);
  const gh=d.ghost(); let ghostMeshes=0, ghostOK=0, olVisible=0, nonOL=0; const sc=d.scene; sc.traverse(o=>{ if(o.userData&&o.userData.glb){ o.traverse(m=>{ if(m.isMesh){ ghostMeshes++; if(m.userData.isOL){ if(m.visible) olVisible++; } else { nonOL++; if(m.material.transparent&&m.material.opacity<1) ghostOK++; } } }); } });
  d.confirmPlace(); d.step(1/60,2); d.confirmPlace(); d.step(1/60,20); const t=d.defs[0]; const glb=!!(t&&t.mdl.userData.glb); const y0=t.mdl.userData.yoke.rotation.y;
  const e=d.spawn("goblin","N"); e.hp=e.max=99999; e.x=t.x+Math.sin(t.rot+.1)*10; e.z=t.z+Math.cos(t.rot+.1)*10; let fired=0; for(let i=0;i<120;i++){ e.x=t.x+Math.sin(t.rot+.1)*10; e.z=t.z+Math.cos(t.rot+.1)*10; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) fired++; }
  const y1=t.mdl.userData.yoke.rotation.y; d.kill(e); d.step(1/60,80); return {ghost:!!gh,ghostMeshes,nonOL,ghostOK,olVisible,glb,turned:Math.abs(y1-y0)>.05,fired,lvl:t.lvl}; });
check("ghost is the model, translucent, no ink shell",r1.ghost&&r1.ghostMeshes>0&&r1.ghostOK===r1.nonOL&&r1.nonOL>0&&r1.olVisible===0,JSON.stringify(r1));
check("built turret is the model, turns to aim and fires",r1.glb&&r1.turned&&r1.fired>0,JSON.stringify(r1));
// Mark II swaps to the tier-2 ballista; Mark III has no model of its own and keeps tier 2; it keeps firing throughout
const r2=await page.evaluate(()=>{ const d=window.__dd; const t=d.defs[0]; d.setHero(t.x,t.z+2,0); const m1=t.mdl; d.upgrade(); d.step(1/60,1); const m2=t.mdl; const swapped=m2!==m1&&!!m2.userData.glb&&m2.parent===d.scene&&m1.parent!==d.scene; d.upgrade(); d.step(1/60,1); const m3=t.mdl; const same=m3!==m2&&m2.parent!==d.scene&&m3.userData.tpl!==m2.userData.tpl; const gone=m1.parent!==d.scene;
  const e=d.spawn("goblin","N"); e.hp=e.max=99999; let fired=0; for(let i=0;i<120;i++){ e.x=t.x+Math.sin(t.rot)*10; e.z=t.z+Math.cos(t.rot)*10; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) fired++; } d.kill(e); return {lvl:t.lvl,same,swapped,gone,fired,pos:[+t.mdl.position.x.toFixed(2),+t.mdl.position.z.toFixed(2)],rot:+t.mdl.rotation.y.toFixed(2)}; });
check("Mark II swaps to tier 2, Mark III to tier 3, still fires",r2.lvl===3&&r2.same&&r2.swapped&&r2.gone&&r2.fired>0,JSON.stringify(r2));
// a kind with no model still builds the procedural one
const r3=await page.evaluate(()=>{ const d=window.__dd; const b=d.place("ball",14,15,0); return {glb:!!b.mdl.userData.glb,hasYoke:!!b.mdl.userData.yoke,hasBall:!!b.mdl.userData.ball}; });
check("kinds without a model stay procedural",!r3.glb&&r3.hasYoke&&r3.hasBall,JSON.stringify(r3));
await page.evaluate(()=>{ const d=window.__dd; const t=d.defs[0]; d.setHero(t.x,t.z+5,Math.PI); d.setCam(Math.PI,.3,7); d.step(1/60,30); document.getElementById("hud").style.display="none"; }); await page.waitForTimeout(120); await page.screenshot({path:SP+"/parts/shots/defglb.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
