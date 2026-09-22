import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8864);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8864/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel()&&window.__dd.mobModel("ogre"),null,{timeout:90000});
// no roar at the door; the roar comes when the ogre first gets within sight of the hero, and it stands still for it
const r1=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,10,0); d.step(1/60,5); const e=d.spawn("ogre","N"); const atDoor={shoutT:e.shoutT,roar:e.roar,cur:d.mobState(e).cur}; d.step(1/60,120); const twoSec={shoutT:e.shoutT,roar:e.roar,cur:d.mobState(e).cur,walking:e.walking,z:+e.z.toFixed(1)};
  // bring the hero to it: 10 units away in the open lane
  d.setHero(e.x,e.z+10,Math.PI); d.step(1/60,10); const onSight={shoutT:+e.shoutT.toFixed(2),roar:e.roar,cur:d.mobState(e).cur,walking:e.walking}; let stood=0; for(let i=0;i<60;i++){ d.step(1/60,1); if(!e.walking) stood++; } const after={cur:d.mobState(e).cur,roar:e.roar,walking:e.walking}; d.kill(e); return {atDoor,twoSec,onSight,stood,after}; });
check("spawns quiet (no shout at the door), walks for 2 s, then roars on first sight of the hero and stands for it",r1.atDoor.roar===0&&!(r1.atDoor.shoutT>0)&&r1.twoSec.roar===0&&r1.twoSec.walking&&r1.onSight.roar===1&&r1.onSight.shoutT>1&&r1.onSight.cur==="Shout"&&r1.stood>50,JSON.stringify(r1));
// half health: a second roar, then enraged — faster and harder, and it does not roar a third time
const r2=await page.evaluate(()=>{ const d=window.__dd; d.setHero(0,10,0); const e=d.spawn("ogre","N"); e.x=0; e.z=-2; d.step(1/60,20); const roar1=e.roar; const spd0=e.spd, dmg0=e.dmg; for(let i=0;i<200&&e.shoutT>0;i++) d.step(1/60,1); e.hp=Math.floor(e.max*.45); d.step(1/60,3); const cur=d.mobState(e).cur, roar2=e.roar, enraged=!!e.enraged, spdUp=+(e.spd/spd0).toFixed(2), dmgUp=+(e.dmg/dmg0).toFixed(2); let glowOn=false; e.mdl.g.traverse(o=>{ if(o.isSprite) glowOn=true; }); for(let i=0;i<200&&e.shoutT>0;i++) d.step(1/60,1); e.hp=Math.floor(e.max*.2); d.step(1/60,3); const third=e.shoutT>0; d.kill(e); return {roar1,roar2,cur,enraged,spdUp,dmgUp,glowOn,third}; });
check("near the crystal it roars at once; at half health it roars again and enrages (+30% speed, +25% damage, red glow), never a third time",r2.roar1===1&&r2.roar2===2&&r2.cur==="Shout"&&r2.enraged&&r2.spdUp===1.3&&r2.dmgUp>=1.2&&r2.glowOn&&!r2.third,JSON.stringify(r2));
// the walk clip never crawls below 0.7x
const r3=await page.evaluate(()=>{ const d=window.__dd; const e=d.spawn("ogre","N"); d.setHero(0,10,0); e.roar=1; d.step(1/60,90); const A=e.mdl.actions; const ts=+(A.walk.timeScale).toFixed(2); const cur=d.mobState(e).cur; d.kill(e); return {ts,cur,walking:e.walking}; });
check("ogre walk animation plays at ≥ 0.7x while it walks",r3.walking&&r3.cur==="Walk"&&r3.ts>=.7,JSON.stringify(r3));
// screenshot: the roar seen from behind the hero
await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.step(1/60,90); d.setHero(0,8,Math.PI); d.setCam(Math.PI,.28,6.5); d.step(1/60,20); const e=d.spawn("ogre","N"); e.x=0; e.z=-1; e.roar=0; d.step(1/60,1); e.x=0; e.z=-1; d.step(1/60,38); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(150); await page.screenshot({path:SP+"/parts/shots/ogre-roar.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
