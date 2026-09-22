import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8869);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const ctx=await browser.newContext({viewport:{width:1100,height:700}}); const page=await ctx.newPage(); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
const ready=()=>page.waitForFunction(()=>window.__dd&&window.__dd.map&&window.__campaign&&window.__dd.heroModel()&&window.__dd.mobModel("goblin")&&window.__room,null,{timeout:90000});
await page.goto("http://127.0.0.1:8869/?silent"); await ready();
const r0=await page.evaluate(()=>{ const d=window.__dd; localStorage.removeItem("ddMapsCleared"); return {map:d.map(),line:window.__campaign.line(),lanes:Object.keys(d.lanes())}; });
check("map 1 by default: The Gnome Hall, 7 waves, 2 maps, nothing cleared, start screen names it",r0.map.index===0&&r0.map.waves===7&&r0.map.total===2&&/MAP 1 OF 2/.test(r0.line)&&/GNOME HALL/.test(r0.line)&&r0.lanes.join()==="N,W,E",JSON.stringify(r0));
// a locked map falls back to map 1
await page.goto("http://127.0.0.1:8869/?silent&map=1"); await ready();
const r1=await page.evaluate(()=>window.__dd.map());
check("?map=1 while map 1 is not cleared → still map 1 (locked)",r1.index===0,JSON.stringify(r1));
// hold wave 7 → HALL HELD, map cleared, the tally offers NEXT MAP
const r2=await page.evaluate(async()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.S.wave=6; d.setHero(0,10,0); const g0=window.__meta.gold(); d.startWave(); const banner=document.getElementById("banner").textContent; const eff=d.effWave(); let n=0; for(let i=0;i<60*60;i++){ d.step(1/60,1); for(const e of d.enemies) if(!e.dead){ d.kill(e); n++; } if(d.S.phase!=="wave") break; } const phase=d.S.phase; const hud=document.getElementById("wavet").textContent; await new Promise(r=>setTimeout(r,2700)); const sum=document.getElementById("tv-sum"); const html=sum?sum.innerHTML:""; return {banner,eff,n,phase,hud,cleared:localStorage.getItem("ddMapsCleared"),tallyOpen:window.__tavern.isOpen(),held:/HALL HELD/.test(html),nextBtn:!!document.getElementById("tv-nextmap"),paid:window.__meta.gold()-g0}; });
check("wave 7 held → phase won, HALL HELD tally with NEXT MAP, map 1 marked cleared, the run paid out",r2.phase==="won"&&/WAVE 7 OF 7/.test(r2.banner)&&r2.eff===7&&r2.n>0&&/CLEARED/.test(r2.hud)&&r2.cleared==="1"&&r2.tallyOpen&&r2.held&&r2.nextBtn&&r2.paid>=25*7+150,JSON.stringify(r2));
// NEXT MAP → the throne room
await page.click("#tv-nextmap"); await page.waitForURL(/map=1/); await ready();
const r3=await page.evaluate(()=>{ const d=window.__dd; const L=d.lanes(); const paths=Object.fromEntries(Object.keys(L).map(k=>[k,d.pathLen(L[k].cx,L[k].cz)])); return {map:d.map(),lanes:Object.keys(L),paths,crystalH:d.hgtAt(23,8),stairTop:+d.floorH(0,7.9).toFixed(2),stairBottom:+d.floorH(0,14.9).toFixed(2),floorBelow:d.hgtAt(23,20),door:window.__room.door,stations:window.__room.stations().length,line:window.__campaign.line(),wbase:d.map().wbase}; });
check("map 2 is the throne room: 46×47, three gates with long paths (≥30 cells), crystal platform 2 up, stairs step down to the floor, tavern re-homed",r3.map.index===1&&r3.map.gw===46&&r3.lanes.join()==="W,E,S"&&Object.values(r3.paths).every(p=>p>=30)&&r3.crystalH===2&&r3.stairTop>=1.5&&r3.stairBottom<=.5&&r3.floorBelow===0&&r3.stations===4&&/MAP 2 OF 2/.test(r3.line)&&r3.wbase===7,JSON.stringify(r3));
// difficulty carries on: map 2 wave 1 is the eighth wave
const r4=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,6,Math.PI); d.step(1/60,3); const heroY=+d.hero.y.toFixed(2); d.startWave(); const banner=document.getElementById("banner").textContent; const q=d.status(); const e=d.spawn("goblin","W"); const hp=e.hp; d.kill(e); return {eff:d.effWave(),banner,hp,heroY,wave:d.S.wave}; });
check("map 2 wave 1 fights like wave 8 (goblin hp scaled, banner says WAVE 1 OF 7), hero stands on the platform",r4.eff===8&&r4.wave===1&&/WAVE 1 OF 7/.test(r4.banner)&&r4.hp>=24&&r4.heroY>=1.9,JSON.stringify(r4));
// a goblin from the west gate climbs the stairs to the crystal; a ledge cannot be climbed straight up
const r5=await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); const e=d.spawn("goblin","W"); e.spd=9; let maxY=0, reached=false; for(let i=0;i<60*40;i++){ d.step(1/60,1); maxY=Math.max(maxY,e.y); if(Math.hypot(e.x,e.z)<3.5){ reached=true; break; } if(e.dead) break; } d.kill(e);
  d.setHero(0,15.8,Math.PI); d.step(1/60,30); const y0=d.hero.y; d.setKeys({w:1}); for(let i=0;i<110;i++) d.step(1/60,1); d.setKeys({w:0}); const climbed=d.hero.y; d.setHero(7.5,10.5,Math.PI); d.step(1/60,30); const x0=d.hero.x, yStair=d.hero.y; d.setKeys({d:1}); for(let i=0;i<50;i++) d.step(1/60,1); d.setKeys({d:0}); return {maxY:+maxY.toFixed(2),reached,y0:+y0.toFixed(2),climbed:+climbed.toFixed(2),x0:+x0.toFixed(1),xAfter:+d.hero.x.toFixed(1),yStair:+yStair.toFixed(2)}; });
check("goblin walks the stairs up to the crystal (y reaches 2); the hero climbs the grand stair from the floor; the balustrade stops a sideways step off it",r5.reached&&r5.maxY>=1.9&&r5.y0<.3&&r5.climbed>=1.8&&r5.yStair>.5&&r5.xAfter<9.6,JSON.stringify(r5));
// start-screen map switch and the ◀ button
await page.goto("http://127.0.0.1:8869/?silent&map=1"); await ready();
const r6=await page.evaluate(()=>({line:window.__campaign.line(),prevOn:!document.getElementById("mapprev").disabled,nextOn:!document.getElementById("mapnext").disabled}));
check("start screen on map 2: ◀ enabled, ▶ disabled (no map 3)",/MAP 2 OF 2/.test(r6.line)&&r6.prevOn&&!r6.nextOn,JSON.stringify(r6));
await page.click("#mapprev"); await page.waitForURL(/map=0/); await ready();
const r7=await page.evaluate(()=>window.__dd.map());
check("◀ goes back to map 1",r7.index===0,JSON.stringify(r7));
// screenshots of the throne room
await page.goto("http://127.0.0.1:8869/?silent&map=1"); await ready();
await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,30,Math.PI); d.setCam(Math.PI,.3,9); d.step(1/60,40); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/throne-from-floor.png"});
await page.evaluate(()=>{ const d=window.__dd; d.setHero(0,17,Math.PI); d.setCam(Math.PI,.35,7); const es=[]; for(let i=0;i<6;i++) es.push(d.spawn("goblin",["W","E","S"][i%3])); d.step(1/60,2); es.forEach((e,i)=>{ e.x=(i-2.5)*1.6; e.z=13.5-(i%2)*2; e.spd=0; }); d.step(1/60,30); });
await page.waitForTimeout(200); await page.screenshot({path:SP+"/parts/shots/throne-stairs.png"});
await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.setHero(0,-2,0); d.setCam(0,.3,7); d.step(1/60,40); });
await page.waitForTimeout(200); await page.screenshot({path:SP+"/parts/shots/throne-top.png"});
await page.evaluate(()=>{ const d=window.__dd; d.setHero(30,40,Math.PI); d.setCam(Math.PI,.25,8); d.step(1/60,40); });
await page.waitForTimeout(200); await page.screenshot({path:SP+"/parts/shots/throne-wide.png"});
await page.evaluate(()=>{ const d=window.__dd; const a=window.__anvil; d.setHero(a[0]-2.6,a[1]+1.2,-Math.PI*.3); d.setCam(-Math.PI*.3+Math.PI-.3,.28,5); d.step(1/60,40); });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/smith.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
