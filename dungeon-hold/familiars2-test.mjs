import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8860);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8860/?silent"); await page.waitForFunction(()=>window.__dd&&window.__familiar&&window.__familiar.glb&&window.__familiar.glb().length===6&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:90000});
check("all six familiar models loaded",true);
// one run per kind: equip it, park two goblins in front of the hero, watch what its attack does
const KINDS=["Wisp","Cave Bat","Moss Sprite","Fire Imp","Crystal Owl","Storm Drake"];
const out=await page.evaluate(async(KINDS)=>{ const d=window.__dd, F=window.__familiar; window.__meta.reset(); d.resetGear(); d.start(); d.setHero(0,10,Math.PI); d.setCam(Math.PI,.3,5.5); d.step(1/60,5); const res={};
  for(const kind of KINDS){ for(const e of d.enemies) d.kill(e); d.step(1/60,120); const it=d.rollItem(2,"familiar",8); it.name="Runed "+kind; d.gear().familiar=it; d.applyGear(); d.step(1/60,3); d.setHero(0,10,Math.PI); d.step(1/60,30);
    const es=[d.spawn("goblin","N"),d.spawn("goblin","N")]; es.forEach((e,i)=>{ e.x=(i-.5)*1.6; e.z=5.2; e.spd=0; e.hp=400; e.max=400; }); d.step(1/60,2); es.forEach((e,i)=>{ e.x=(i-.5)*1.6; e.z=5.2; }); const hp0=es.map(e=>e.hp);
    const st=F.state(); const glb=!!(F.model()&&F.model().userData.glb); let maxDev=0, maxBolts=0, maxShots=0, maxFx=0, slowed=false, burning=false, bothHit=false, backHome=false, firstHitT=-1;
    for(let i=0;i<300;i++){ d.step(1/60,1); es.forEach((e,i)=>{ e.x=(i-.5)*1.6; e.z=5.2; }); const s=F.state(), p=F.pos(); if(p) maxDev=Math.max(maxDev,Math.hypot(p[0]-s.x,p[1]-s.y,p[2]-s.z)); maxBolts=Math.max(maxBolts,F.bolts()); maxShots=Math.max(maxShots,F.shots()); maxFx=Math.max(maxFx,F.fx());
      if(es.some(e=>e.slowT>0)) slowed=true; if(F.burning()>0) burning=true; if(es[0].hp<hp0[0]&&es[1].hp<hp0[1]) bothHit=true; if(firstHitT<0&&es.some((e,i)=>e.hp<hp0[i])) firstHitT=i; if(firstHitT>=0&&i>firstHitT+60&&F.pos()&&Math.hypot(F.pos()[0]-s.x,F.pos()[2]-s.z)<.3) backHome=true; }
    const dmgDone=es.map((e,i)=>+(hp0[i]-e.hp).toFixed(1)); const kd=F.kindMul();
    res[kind]={kind:st&&st.kind,glb,maxDev:+maxDev.toFixed(2),maxBolts,maxShots,maxFx,slowed,burning,bothHit,backHome,dmgDone,rate:+F.rate().toFixed(3),wantRate:+((1/(1.2*(1+(it.stats.frate||0)/100)))/kd.rate).toFixed(3),dmg:F.dmg()}; }
  return res; },KINDS);
console.log(JSON.stringify(out));
const W=out["Wisp"], B=out["Cave Bat"], S=out["Moss Sprite"], I=out["Fire Imp"], O=out["Crystal Owl"], D=out["Storm Drake"];
check("every kind spawns its Meshy model and fires at the kind's rate",KINDS.every(k=>out[k].glb&&out[k].kind&&k.includes(out[k].kind)&&Math.abs(out[k].rate-out[k].wantRate)<1e-3),KINDS.map(k=>k+":"+out[k].kind+"/"+out[k].glb+"/"+out[k].rate).join(" "));
check("Wisp: spark bolts hit",W.maxBolts>0&&W.dmgDone.some(x=>x>0),JSON.stringify(W));
check("Cave Bat: swoops out (>1.5 from the shoulder), bites, comes back",B.maxDev>1.5&&B.dmgDone.some(x=>x>0)&&B.backHome&&B.maxBolts===0,JSON.stringify(B));
check("Moss Sprite: seed pods land and slow the pack",S.maxShots>0&&S.slowed&&S.dmgDone.some(x=>x>0),JSON.stringify(S));
check("Fire Imp: fireballs burn",I.maxShots>0&&I.burning&&I.dmgDone.some(x=>x>0),JSON.stringify(I));
check("Crystal Owl: one beam chains to both goblins",O.maxFx>0&&O.bothHit&&O.maxBolts===0,JSON.stringify(O));
check("Storm Drake: lightning forks to both goblins",D.maxFx>0&&D.bothHit&&D.maxBolts===0,JSON.stringify(D));
// unequip clears everything the pet left behind
const r2=await page.evaluate(()=>{ const d=window.__dd, F=window.__familiar; d.gear().familiar=null; d.applyGear(); d.step(1/60,60); return {pet:F.state(),shots:F.shots(),bolts:F.bolts(),fx:F.fx()}; });
check("unequip: no pet, no shots, effects faded",r2.pet===null&&r2.shots===0&&r2.bolts===0&&r2.fx===0,JSON.stringify(r2));
// bag text says what the familiar does
const r3=await page.evaluate(()=>{ const d=window.__dd; const it=d.rollItem(3,"familiar",9); it.name="Ancient Crystal Owl"; return d.statStr(it); });
check("familiar stat line names the attack",/chains/.test(r3),r3);
// screenshots: the drake mid-strike, and each pet over the shoulder
const shot=async(kind,file,fire)=>{ await page.evaluate(async({kind,fire})=>{ const d=window.__dd, F=window.__familiar; for(const e of d.enemies) d.kill(e); d.step(1/60,120); const it=d.rollItem(3,"familiar",9); it.name="Ancient "+kind; d.gear().familiar=it; d.applyGear(); d.setHero(0,10,Math.PI); d.setCam(Math.PI,.3,5.5); d.step(1/60,50);
    const es=[d.spawn("goblin","N"),d.spawn("goblin","N"),d.spawn("goblin","N")]; const place=()=>es.forEach((e,i)=>{ e.x=(i-1)*1.7; e.z=5; e.spd=0; e.yaw=Math.PI; }); place(); d.step(1/60,2); place(); if(fire){ for(let i=0;i<200;i++){ d.step(1/60,1); place(); if(F.fx()>0||F.shots()>0||(F.swoop()&&F.swoop().t>.35&&F.swoop().t<.6)) break; } } else d.step(1/60,20); document.getElementById("hud").style.display="none"; },{kind,fire}); await page.waitForTimeout(120); await page.screenshot({path:SP+"/parts/shots/"+file}); };
await shot("Storm Drake","fam-drake.png",true); await shot("Crystal Owl","fam-owl.png",true); await shot("Fire Imp","fam-imp.png",true); await shot("Cave Bat","fam-bat.png",true); await shot("Moss Sprite","fam-sprite.png",true); await shot("Wisp","fam-wisp.png",false);
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
