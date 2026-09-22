import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8881);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const ctx=await browser.newContext({viewport:{width:1100,height:700}}); const page=await ctx.newPage(); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
const ready=()=>page.waitForFunction(()=>window.__dd&&window.__dd.map&&window.__campaign&&window.__dd.heroModel()&&window.__dd.mobModel("goblin")&&window.__room,null,{timeout:120000});
await page.goto("http://127.0.0.1:8881/?silent&nogate"); await ready(); await page.evaluate(()=>window.__campaign.unlockAll());
const run=async(mapi)=>{ await page.goto("http://127.0.0.1:8881/?silent&nogate&map="+mapi); await ready(); return page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.step(1/60,5); const L=d.lanes(); const paths=Object.fromEntries(Object.keys(L).map(k=>[k,d.pathLen(L[k].cx,L[k].cz)])); const m=d.map();
    const reach={}; for(const k of Object.keys(L)){ const e=d.spawn("goblin",k); e.spd=9; let ok=false, maxY=0; for(let i=0;i<60*45;i++){ d.step(1/60,1); maxY=Math.max(maxY,e.y); if(Math.hypot(e.x,e.z)<3.6){ ok=true; break; } if(e.dead) break; } reach[k]={ok,maxY:+maxY.toFixed(2)}; d.kill(e); }
    return {id:m.id,name:m.name,gw:m.gw,gh:m.gh,wallH:m.wallH,windows:m.windows,style:m.style,lanes:Object.keys(L),paths,reach,heroY:+d.hero.y.toFixed(2),crystalH:d.hgtAt(...[m.id==="court"?22:5,m.id==="court"?21:13]),stations:window.__room.stations().length,line:window.__campaign.line()}; }); };
const c=await run(2); console.log(JSON.stringify(c));
check("map 3 The Cloister Court: outdoor, no ceiling windows, three corner gates with paths ≥ 28, crystal in the sunken court, goblins walk the cloister and a stair down to it, tavern at hand",c.id==="court"&&c.style&&c.style.outdoor&&c.windows===0&&c.lanes.length===3&&Object.values(c.paths).every(p=>p>=28)&&c.crystalH===0&&Object.values(c.reach).every(r=>r.ok&&r.maxY>=1.4)&&c.stations===5&&/MAP 3 OF 4/.test(c.line),JSON.stringify(c));
const f=await run(3); console.log(JSON.stringify(f));
check("map 4 The Great Feast Hall: long hall with windows, three doors with paths ≥ 20 (east ≥ 38), crystal on the high-table dais a step up, goblins thread the tables to it",f.id==="feast"&&f.windows>0&&f.lanes.join()==="E,N,S"&&f.paths.E>=38&&Object.values(f.paths).every(p=>p>=20)&&f.crystalH===1&&f.heroY>=.9&&Object.values(f.reach).every(r=>r.ok)&&f.stations===5&&/MAP 4 OF 4/.test(f.line),JSON.stringify(f));
// tables block: the cells of a table are props, the gaps are floor
const t=await page.evaluate(()=>{ const d=window.__dd; return {table:d.cellAt(16,8),gap:d.cellAt(22,8),aisle:d.cellAt(16,11)}; });
check("feast tables are solid, their gaps and the aisles are floor",t.table===7&&t.gap===1&&t.aisle===1,JSON.stringify(t));
// screenshots
await page.evaluate(()=>{ const d=window.__dd; d.setHero(0,18,Math.PI); d.setCam(Math.PI,.25,8); d.step(1/60,40); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(250); await page.screenshot({path:SP+"/parts/shots/feast-hall.png"});
await page.evaluate(()=>{ const d=window.__dd; d.setHero(30,-3,Math.PI/2); d.setCam(Math.PI/2,.2,9); d.step(1/60,40); });
await page.waitForTimeout(250); await page.screenshot({path:SP+"/parts/shots/feast-tables.png"});
await page.goto("http://127.0.0.1:8881/?silent&nogate&map=2"); await ready();
await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,12,Math.PI); d.setCam(Math.PI,.3,9); d.step(1/60,40); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(250); await page.screenshot({path:SP+"/parts/shots/court.png"});
await page.evaluate(()=>{ const d=window.__dd; d.setHero(-30,-32,Math.PI*.75); d.hero.y=1.5; d.setCam(Math.PI*.75,.2,8); d.step(1/60,40); });
await page.waitForTimeout(250); await page.screenshot({path:SP+"/parts/shots/court-cloister.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
