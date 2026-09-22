import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8872);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const ctx=await browser.newContext({viewport:{width:1100,height:700}}); const page=await ctx.newPage(); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
const ready=()=>page.waitForFunction(()=>window.__dd&&window.__dd.heroModel()&&window.__dd.mobModel("goblin")&&window.__dd.mobModel("archer")&&window.__dd.mobModel("drake"),null,{timeout:120000});
await page.addInitScript(()=>{ try{ localStorage.setItem("ddMapsCleared","2"); localStorage.setItem("ddMap","0"); }catch(e){} });
await page.goto("http://127.0.0.1:8872/?silent&nogate&map=0"); await ready();
// the bandit: rigged model with its clips, throws rocks at a defense
const r1=await page.evaluate(async()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.addMana(1000); d.setHero(0,10,Math.PI); const t=d.place("harpoon",16,13,0); const b=d.spawn("archer","N"); const clips=Object.keys(b.mdl.actions); b.x=t.x; b.z=t.z-7; b.spd=0; let rocks=0, hp0=t.hp; for(let i=0;i<60*8;i++){ d.step(1/60,1); b.x=t.x; b.z=t.z-7; rocks=Math.max(rocks,d.projs.filter(p=>p.kind==="arrow").length); if(t.hp<hp0) break; } const st=d.mobState(b); d.kill(b); return {clips,glb:!!b.mdl.glb,rocks,hurt:t.hp<hp0,cur:st.cur,name:document.getElementById("banner").textContent}; });
check("bandit: Meshy rig with idle/walk/run/attack/death, throws rocks that hurt a ballista",r1.glb&&["idle","walk","run","attack","death"].every(c=>r1.clips.includes(c))&&r1.rocks>0&&r1.hurt,JSON.stringify(r1));
// the drake: the cut rig has wings and a tail, flies at hover height, crosses a hedge wall a goblin cannot
const r2=await page.evaluate(async()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.step(1/60,5); const parts=d.mobModel("drake").parts; d.addMana(2000); const hs=[]; for(let x=15;x<=17;x++){ hs.push(d.place("spike",x,8,0)); } d.step(1/60,2);
  const g=d.spawn("goblin","N"); const dr=d.spawn("drake","N"); const hinge={wingL:!!dr.mdl.parts.wingL,wingR:!!dr.mdl.parts.wingR,tail:!!dr.mdl.parts.tail}; let maxY=0, minY=9, wingMoved=false, w0=dr.mdl.parts.wingL?dr.mdl.parts.wingL.rotation.z:0; let drakePassed=false, gobPassed=false;
  for(let i=0;i<60*20;i++){ d.step(1/60,1); if(!dr.dead){ maxY=Math.max(maxY,dr.y); if(i>60) minY=Math.min(minY,dr.y); if(dr.mdl.parts.wingL&&Math.abs(dr.mdl.parts.wingL.rotation.z-w0)>.2) wingMoved=true; if(dr.z>d.cwz(9)) drakePassed=true; } if(!g.dead&&g.z>d.cwz(9)) gobPassed=true; if(drakePassed&&i>60*6) break; }
  const hedgeHp=hs.map(h=>h.hp); d.kill(g); d.kill(dr); return {hinge,maxY:+maxY.toFixed(2),minY:+minY.toFixed(2),wingMoved,drakePassed,gobPassed,hedgeHp,fly:dr.fly,pathWalk:d.pathLen(16,2),pathFly:d.pathLenFly(16,2)}; });
check("drake: hinged wings and tail that beat, hovers ~2.6 up, flies over a hedge wall the goblin stops at (and does not smash it)",r2.hinge.wingL&&r2.hinge.wingR&&r2.hinge.tail&&r2.wingMoved&&r2.minY>1.8&&r2.maxY<3.6&&r2.drakePassed&&!r2.gobPassed&&r2.fly===2.6,JSON.stringify(r2));
// on the throne room the drake ignores the stairs: its path is shorter, it rises to the platform, and the ring cannot slow it
await page.goto("http://127.0.0.1:8872/?silent&nogate&map=1"); await ready();
const r3=await page.evaluate(async()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,-2,0); const L=d.lanes(); const walk=d.pathLen(L.W.cx,L.W.cz), fly=d.pathLenFly(L.W.cx,L.W.cz); const dr=d.spawn("drake","W"); dr.spd=9; let maxY=0, reached=false; for(let i=0;i<60*40;i++){ d.step(1/60,1); if(dr.dead) break; maxY=Math.max(maxY,dr.y); if(Math.hypot(dr.x,dr.z)<3.6){ reached=true; break; } }
  d.addMana(2000); const ring=d.place("slice",23,30,0); const dr2=d.spawn("drake","S"); dr2.x=ring.x; dr2.z=ring.z; dr2.spd=0; d.step(1/60,40); const slowed=dr2.slowT>0; const gob=d.spawn("goblin","S"); gob.x=ring.x; gob.z=ring.z; gob.spd=0; d.step(1/60,10); const gobSlowed=gob.slowT>0; d.kill(dr); d.kill(dr2); d.kill(gob); return {walk,fly,maxY:+maxY.toFixed(2),reached,slowed,gobSlowed}; });
check("throne room: the drake's path is shorter than the walkers' (no stairs), it reaches the crystal 8+ up, the mushroom ring slows goblins but not drakes",r3.fly<r3.walk&&r3.reached&&r3.maxY>=8&&!r3.slowed&&r3.gobSlowed,JSON.stringify(r3));
// wave text and drake count
const r4=await page.evaluate(()=>{ const d=window.__dd; d.S.wave=0; d.startWave(); const b=document.getElementById("banner").textContent; const n=d.status().enemies; return {banner:b}; });
check("map 2 wave 1 (eighth wave) announces Bandits and Drakes",/Bandits/.test(r4.banner)&&/Drakes/.test(r4.banner),JSON.stringify(r4));
// screenshots
await page.evaluate(()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.step(1/60,80); d.setHero(0,30,Math.PI); d.setCam(Math.PI,.15,7); const a=d.spawn("drake","S"), b=d.spawn("drake","S"), c=d.spawn("archer","S"), e2=d.spawn("archer","S"); d.step(1/60,2); a.x=-2.5; a.z=22; b.x=2.5; b.z=20; a.spd=b.spd=0; c.x=-1; c.z=25.5; e2.x=1.5; e2.z=26; c.spd=e2.spd=0; d.step(1/60,45); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(200); await page.screenshot({path:SP+"/parts/shots/newmobs.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
