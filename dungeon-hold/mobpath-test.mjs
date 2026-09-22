import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8845);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
await page.goto("http://127.0.0.1:8845/?silent&nogate"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:60000});
// find a spot on the north lane's path a few squares from the spawn, drop a blockade across it, then send an ogre
const r=await page.evaluate(()=>{ const d=window.__dd; d.resetGear(); d.start(); d.addMana(9000); d.setHero(6,10,0); d.step(1/60,3);
  const probe=d.spawn("goblin","N"); d.step(1/60,90); const px=probe.x, pz=probe.z; d.kill(probe); d.step(1/60,80);
  // the blockade sits 2 squares further down the goblin's route (grid: cell = floor((x+33)/2), floor((z+35)/2)), laid across the corridor
  const bl=d.place("spike",Math.floor((px+33)/2),Math.floor((pz+35)/2)+2,0);
  const og=d.spawn("ogre","N"); og.hp=og.max=5000; const hp0=bl.hp; let hitAt=-1, reached=false; for(let i=0;i<900;i++){ d.step(1/60,1); if(bl.hp<hp0&&hitAt<0) hitAt=i; if(Math.hypot(og.x,og.z)<4) reached=true; if(hitAt>=0||reached) break; }
  return {blCell:[bl.cx,bl.cz],blHp:[hp0,bl.hp],hitAt,reached,ogre:[+og.x.toFixed(1),+og.z.toFixed(1)],dist:Math.hypot(og.x-bl.x,og.z-bl.z).toFixed(1)}; });
check("an ogre smashes a blockade on its path instead of walking round it",r.hitAt>=0&&r.blHp[1]<r.blHp[0],JSON.stringify(r));
// with the hall empty of defenses, goblins still find the crystal
const r2=await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); for(const x of d.defs.slice()) { d.setHero(x.x,x.z+1,0); d.sell(); } d.setHero(8,12,0); d.step(1/60,60); const g=d.spawn("goblin","N"); g.hp=g.max=999; let near=false; for(let i=0;i<1200;i++){ d.step(1/60,1); if(Math.hypot(g.x,g.z)<4){ near=true; break; } } return {near,defs:d.defs.length}; });
check("goblins still reach the crystal when nothing blocks them",r2.near&&r2.defs===0,JSON.stringify(r2));
check("no errors",errors.length===0,errors.join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
