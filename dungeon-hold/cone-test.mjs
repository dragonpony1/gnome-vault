import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const SP=process.env.SP; const server=await serve(8840);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
await page.goto("http://127.0.0.1:8840/?silent&nogate"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:40000});
// a harpoon at world (0,-4) facing -z; an enemy 12° off its axis at range 15 is outside a 16° cone (±8°) but inside a 28° one (±14°)
const r=await page.evaluate(()=>{ const d=window.__dd; d.resetGear(); d.start(); d.addMana(5000); d.setHero(0,-2,Math.PI); d.step(1/60,5);
  const t=d.place("harpoon",16,15,Math.PI); const cones=[]; const off=12*Math.PI/180;
  const trial=()=>{ for(const e of d.enemies) d.kill(e); d.step(1/60,90); d.projs.length=0; t.cd=0; const e=d.spawn("goblin","N"); e.hp=e.max=99999; e.x=t.x+Math.sin(Math.PI+off)*15; e.z=t.z+Math.cos(Math.PI+off)*15; let fired=0; for(let i=0;i<150;i++){ e.x=t.x+Math.sin(Math.PI+off)*15; e.z=t.z+Math.cos(Math.PI+off)*15; const b=d.projs.length; d.step(1/60,1); if(d.projs.length>b) fired++; } return fired; };
  const out={}; out.mk1={lvl:t.lvl,arc:d.DEFS.harpoon.arcs[t.lvl-1],shots:trial()};
  d.setHero(t.x,t.z+2,0); d.upgrade(); d.upgrade(); out.mk3={lvl:t.lvl,arc:d.DEFS.harpoon.arcs[t.lvl-1],shots:trial()};
  d.upgrade(); d.upgrade(); out.mk5={lvl:t.lvl,arc:d.DEFS.harpoon.arcs[t.lvl-1],shots:trial()}; d.upgrade(); out.capped=t.lvl; out.hp=t.max; return out; });
check("Mark I cone is 16° and ignores an enemy 12° off-axis",r.mk1.lvl===1&&r.mk1.arc===16&&r.mk1.shots===0,JSON.stringify(r.mk1));
check("Mark III cone is 28° and fires at it",r.mk3.lvl===3&&r.mk3.arc===28&&r.mk3.shots>0,JSON.stringify(r.mk3));
check("Mark V cone is the old 40° and it stops there",r.mk5.lvl===5&&r.mk5.arc===40&&r.mk5.shots>0&&r.capped===5,JSON.stringify(r.mk5)+" capped "+r.capped);
check("no errors",errors.length===0,errors.join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
