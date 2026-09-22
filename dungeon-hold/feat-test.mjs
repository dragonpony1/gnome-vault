import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const SP=process.env.SP; const server=await serve(8799);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,160)); });
await page.goto("http://127.0.0.1:8799/"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:30000});
// --- sector of fire: a harpoon facing north (rot=0 → +z... in-game "north gate" is -z; use rot=Math.PI to face -z) ---
const sec=await page.evaluate(()=>{ const d=window.__dd; d.resetGear(); d.start(); d.addMana(1000); d.setHero(6,8,Math.PI); d.step(1/60,5);
  const t=d.place("harpoon",16,15,Math.PI); t.cd=0;   // at world (0,-4) facing -z (toward the north corridor)
  const inFront=d.spawn("goblin","N"); inFront.x=t.x; inFront.z=t.z-8; inFront.hp=99999; inFront.max=99999;
  const count=n=>{ let fired=0; for(let i=0;i<n;i++){ const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) fired++; } return fired; };
  const shotsFront=count(90); const yawFront=t.yaw;
  for(const e of d.enemies) d.kill(e); d.step(1/60,40); d.projs.length=0; t.cd=0;
  const behind=d.spawn("goblin","N"); behind.x=t.x; behind.z=t.z+8; behind.hp=99999; behind.max=99999;   // directly behind it
  const shotsBehind=count(90); const yawBehind=t.yaw;
  for(const e of d.enemies) d.kill(e); d.step(1/60,40);
  return {shotsFront,shotsBehind,yawFront,yawBehind,rot:t.rot}; });
check("harpoon fires at an enemy inside its arc", sec.shotsFront>0, JSON.stringify(sec));
check("harpoon ignores an enemy behind it and stays facing its arc", sec.shotsBehind===0&&Math.abs(((sec.yawBehind-sec.rot+Math.PI)%(2*Math.PI))-Math.PI)<0.7, JSON.stringify(sec));
// --- wedges: while placing, and when standing by a tower ---
const wedge=await page.evaluate(()=>{ const d=window.__dd; d.setHero(6,8,Math.PI); d.setCam(0,.42,8); d.step(1/60,5); d.select("harpoon"); d.step(1/60,5); const g=d.ghost(); const ghostWedge=g&&g.sector; d.select("harpoon"); d.step(1/60,2);
  d.setHero(0,-2,0); d.step(1/60,5); const hover=d.hoverSector(); d.setHero(10,10,0); d.step(1/60,5); const hoverGone=d.hoverSector(); return {ghostWedge,hover,hoverGone}; });
check("placing shows the sector wedge", wedge.ghostWedge===true, JSON.stringify(wedge));
check("standing by a tower shows its wedge, walking away hides it", wedge.hover===true&&wedge.hoverGone===false, JSON.stringify(wedge));
// --- jump onto a defense ---
const jmp=await page.evaluate(()=>{ const d=window.__dd; const t=d.defs[0]; d.setHero(t.x,t.z+1.3,Math.PI); d.setCam(Math.PI,.42,8); d.step(1/60,5); d.jump(); let peak=0; for(let i=0;i<10;i++){ d.step(1/60,1); peak=Math.max(peak,d.hero.y); } d.setKeys({w:1}); for(let i=0;i<12;i++){ d.step(1/60,1); peak=Math.max(peak,d.hero.y); } d.setKeys({w:0}); for(let i=0;i<60;i++){ d.step(1/60,1); peak=Math.max(peak,d.hero.y); } return {peak,y:d.hero.y,top:t.top,dist:Math.hypot(d.hero.x-t.x,d.hero.z-t.z),grounded:d.hero.grounded}; });
check("jump clears a turret's height", jmp.peak>jmp.top+0.2, JSON.stringify(jmp));
check("lands and stands on top of it", jmp.grounded&&Math.abs(jmp.y-jmp.top)<0.05&&jmp.dist<1.0, JSON.stringify(jmp));
// --- music follows the phase ---
const mus=await page.evaluate(async()=>{ const d=window.__dd; const before=d.music(); d.startWave(); d.step(1/60,30); await new Promise(r=>setTimeout(r,400)); const wave=d.music(); for(let k=0;k<400&&d.S.phase==="wave";k++){ d.step(1/60,10); for(const e of d.enemies) d.kill(e); } await new Promise(r=>setTimeout(r,400)); const build=d.music(); return {before,wave,build,phase:d.S.phase}; });
check("battle music during the wave, hall music after", mus.wave.mode==="wave"&&mus.build.mode==="build"&&mus.phase==="build", JSON.stringify(mus));
// --- chop timing ---
const atk=await page.evaluate(()=>{ const d=window.__dd; d.swing(); d.step(1/60,3); const a=d.heroModel().cur; d.step(1/60,40); return {a,after:d.heroModel().cur,dmg:d.heroDmg()}; });
check("overhand chop plays on swing", atk.a==="Attack"&&atk.after==="Idle", JSON.stringify(atk));
check("no errors", errors.length===0, errors.join(" | "));
// pictures
const shot=async(name,fn)=>{ await page.evaluate(fn); await page.waitForTimeout(150); await page.screenshot({path:SP+"/meshy/"+name+".png"}); };
await shot("f-sector",()=>{ const d=window.__dd; d.setHero(0,6,Math.PI); d.setCam(Math.PI,.55,9); d.step(1/60,20); d.select("harpoon"); d.step(1/60,10); });
await shot("f-chop",()=>{ const d=window.__dd; d.select("harpoon"); d.setHero(0,10,Math.PI/2); d.setCam(Math.PI/2,.15,5); d.cam.x=-5; d.cam.y=2.2; d.cam.z=10; d.step(1/60,30); d.swing(); d.step(1/60,13); });
await shot("f-ontop",()=>{ const d=window.__dd; const t=d.defs[0]; d.setHero(t.x,t.z,Math.PI); d.hero.y=t.top; d.setCam(Math.PI,.35,7); d.step(1/60,25); });
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} feature checks passed`); process.exit(f?1:0);
