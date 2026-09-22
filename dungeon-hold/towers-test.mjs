import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8851);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:1280,height:800}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8851/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:60000});
// names on the HUD
const n0=await page.evaluate(()=>({slots:[...document.querySelectorAll("#hotbar .slot .n")].map(e=>e.textContent),hp:document.querySelector(".bar.hp b").textContent,res:document.querySelector(".res .du").textContent,sub:document.querySelector("#start h2").textContent}));
check("five towers on the hotbar with the new names",n0.slots.join("|")==="Ballista|Acorn Cannon|Turnip Trebuchet|Mushroom Ring|Bramble Hedge",n0.slots.join("|"));
check("Warden, roots",n0.hp==="WARDEN"&&/roots/.test(n0.res)&&/WARDEN/.test(n0.sub),JSON.stringify([n0.hp,n0.res,n0.sub]));
// acorn cannon: three acorns per shot, goblin in the cone takes damage
const r1=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.addMana(9000); d.setHero(6,-2,Math.PI); d.step(1/60,3); const t=d.place("acorn",16,15,Math.PI); t.cd=0; const e=d.spawn("goblin","N"); e.hp=e.max=9999; const hp0=e.hp; let maxAcorns=0, fired=0; for(let i=0;i<150;i++){ e.x=t.x; e.z=t.z-6; const b=d.projs.filter(p=>p.kind==="acorn").length; d.step(1/60,1); const a=d.projs.filter(p=>p.kind==="acorn").length; if(a>b) fired++; maxAcorns=Math.max(maxAcorns,a); } const dmg=hp0-e.hp; d.kill(e); return {maxAcorns,fired,dmg,name:d.DEFS.acorn.name}; });
check("acorn cannon sprays 3 acorns a shot and hurts the goblin",r1.maxAcorns>=3&&r1.dmg>0,JSON.stringify(r1));
// trebuchet: splash hits both goblins standing together
const r2=await page.evaluate(()=>{ const d=window.__dd; for(const x of d.defs.slice()){ d.setHero(x.x,x.z+1,0); d.sell(); } d.step(1/60,60); d.setHero(6,-2,Math.PI); const t=d.place("ball",16,15,Math.PI); t.cd=0; const es=[d.spawn("goblin","N"),d.spawn("goblin","N")]; es.forEach(e=>{ e.hp=e.max=9999; e.spd=0; }); let turnips=0, splats=0; for(let i=0;i<400;i++){ es[0].x=t.x-.5; es[0].z=t.z-9; es[1].x=t.x+.6; es[1].z=t.z-9.3; es.forEach(e=>{ e.yaw=0; }); d.step(1/60,1); if(d.projs.some(p=>p.kind==="turnip")) turnips++; if(d.projs.some(p=>p.kind==="splat")) splats++; if(es.every(e=>e.hp<9999)) break; } const out={turnips,splats,dmg:es.map(e=>9999-e.hp)}; es.forEach(e=>d.kill(e)); return out; });
check("trebuchet turnip splats and hurts both goblins",r2.turnips>0&&r2.splats>0&&r2.dmg.every(x=>x>0),JSON.stringify(r2));
// mushroom ring: walkable, slows and spores mobs inside, gets trampled slowly
const r3=await page.evaluate(()=>{ const d=window.__dd; for(const x of d.defs.slice()){ d.setHero(x.x,x.z+1,0); d.sell(); } for(const e of d.enemies) d.kill(e); d.step(1/60,60); d.setHero(6,10,Math.PI);
  const probe=d.spawn("goblin","N"); d.step(1/60,120); const px=probe.x, pz=probe.z; d.kill(probe); d.step(1/60,80);
  const ring=d.place("slice",Math.floor((px+33)/2),Math.floor((pz+35)/2)+3,0); const hp0=ring.hp; const flowOK=d.flow().nxt[ring.cells[0]]>=0;
  const g=d.spawn("goblin","N"); g.hp=g.max=9999; let inside=0, slowed=0, dist=0, lx=g.x, lz=g.z, attacked=false; for(let i=0;i<900;i++){ d.step(1/60,1); const din=Math.hypot(g.x-ring.x,g.z-ring.z)<2.6; if(din){ inside++; if(g.slowT>0) slowed++; } if(g.swing>=0&&Math.hypot(g.x-ring.x,g.z-ring.z)<2.5) attacked=true; dist+=Math.hypot(g.x-lx,g.z-lz); lx=g.x; lz=g.z; if(Math.hypot(g.x,g.z)<4) break; }
  const out={flowOK,inside,slowed,dmg:9999-g.hp,ringHp:[hp0,+ring.hp.toFixed(1)],attacked,reachedCrystal:Math.hypot(g.x,g.z)<4}; d.kill(g); return out; });
check("mobs walk through the ring (flow field), get slowed and spored, ring wears a little",r3.flowOK&&r3.inside>10&&r3.slowed>r3.inside*.7&&r3.dmg>0&&r3.ringHp[1]<r3.ringHp[0]&&!r3.attacked&&r3.reachedCrystal,JSON.stringify(r3));
// bramble hedge: thorns hurt attackers (existing), and it regrows when left alone
const r4=await page.evaluate(()=>{ const d=window.__dd; for(const x of d.defs.slice()){ d.setHero(x.x,x.z+1,0); d.sell(); } d.step(1/60,30); d.setHero(6,10,Math.PI); const h=d.place("spike",16,12,0); h.hp=100; const before=h.hp; d.step(1/60,60); const after1=h.hp; d.step(1/60,600); const after2=h.hp; return {before,after1:+after1.toFixed(1),after2:+after2.toFixed(1),max:h.max}; });
check("hedge regrows after 4 quiet seconds",r4.after1<=r4.before+.01&&r4.after2>r4.before+10&&r4.after2<=r4.max,JSON.stringify(r4));
// archers renamed
const r5=await page.evaluate(()=>{ const d=window.__dd; d.S.wave=2; d.startWave(); const txt=document.getElementById("banner").textContent; d.S.phase="build"; d.S.wave=0; for(const e of d.enemies) d.kill(e); return txt; });
check("wave banner names Hobgoblin Archers",/Hobgoblin Archers/.test(r5)&&!/Dark Elf/.test(r5),r5);
// crystal model in place
const r6=await page.evaluate(async()=>{ for(let i=0;i<100&&!(window.__crystal&&window.__crystal.state().model);i++) await new Promise(r=>setTimeout(r,100)); return window.__crystal?window.__crystal.state():null; });
check("castle crystal model replaces the procedural crystal",r6&&r6.model&&!r6.oldVisible&&r6.cgY>4,JSON.stringify(r6));
// screenshot: the five towers in a row, hero behind them, and a ghost of the ring
await page.evaluate(()=>{ const d=window.__dd; for(const x of d.defs.slice()){ d.setHero(x.x,x.z+1,0); d.sell(); } for(const e of d.enemies) d.kill(e); d.step(1/60,60); d.addMana(9000); const ks=["harpoon","acorn","ball","slice","spike"]; ks.forEach((k,i)=>d.place(k,12+i*2,16,Math.PI)); d.setHero(4,6,Math.PI); d.setCam(Math.PI,.42,9); d.step(1/60,80); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/towers-row.png"});
await page.evaluate(()=>{ const d=window.__dd; d.setHero(4,12,Math.PI); d.setCam(Math.PI+.4,.3,6); d.step(1/60,40); const es=[]; for(let i=0;i<6;i++){ const e=d.spawn("goblin","N"); e.x=-1+i*1.1; e.z=-6-(i%2); e.hp=e.max=999; es.push(e); } d.step(1/60,70); });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/towers-fight.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
