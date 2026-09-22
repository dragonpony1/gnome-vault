import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const html=fs.readFileSync(SP+"/dungeon.html"); const server=http.createServer((q,r)=>{ r.setHeader("content-type","text/html; charset=utf-8"); r.end(html); }); await new Promise(r=>server.listen(8823,"127.0.0.1",r));
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8823/"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const r1=await page.evaluate(()=>{ const d=window.__dd, F=window.__familiar; d.resetGear(); const it=d.rollItem(2,"familiar",6); d.gear().familiar=it; d.applyGear(); const before=F.state(); d.start(); d.step(1/60,5); const st=F.state();
  const e=d.spawn("goblin","N"); e.x=d.hero.x; e.z=d.hero.z-4; const hp0=e.hp; let minHp=hp0, swung=false, maxBolts=0; for(let i=0;i<180;i++){ d.step(1/60,1); if(e.hp<minHp) minHp=e.hp; if(d.hero.swingT>=0) swung=true; maxBolts=Math.max(maxBolts,F.bolts()+(F.shots?F.shots():0)); if(e.dead) break; }
  const heroKills=d.S.kills; return {it:{name:it.name,rarity:it.rarity,stats:it.stats,id:it.id},before,st,hp0,minHp,dead:!!e.dead,swung,maxBolts,rate:F.rate(),dmg:F.dmg(),mul:F.kindMul?F.kindMul():{rate:1,dmg:1},kills:heroKills,famNow:F.state()}; });
console.log(JSON.stringify(r1));
check("no pet before the game starts",r1.before===null);
check("pet exists in the scene once in play, right kind",r1.st&&r1.st.inScene&&r1.st.visible&&r1.it.name.includes(r1.st.kind),JSON.stringify(r1.st));
check("goblin took bolt damage (hero never swung)",(r1.minHp<r1.hp0||r1.dead)&&!r1.swung&&r1.maxBolts>0,"hp "+r1.hp0+"->"+r1.minHp+" dead "+r1.dead+" bolts "+r1.maxBolts);
check("fire rate/dmg follow the item stats (and the kind's multiplier)",Math.abs(r1.rate-1/(1.2*(1+(r1.it.stats.frate||0)/100))/r1.mul.rate)<1e-6&&r1.dmg===Math.max(1,Math.round(r1.it.stats.fdmg*10)/10),r1.rate+" "+r1.dmg+" "+JSON.stringify(r1.mul));
const r2=await page.evaluate(()=>{ const d=window.__dd, F=window.__familiar; const n0=d.scene.children.length; d.gear().familiar=null; d.applyGear(); d.step(1/60,2); const gone=F.state()===null, bolts=F.bolts(); const n1=d.scene.children.length;
  const it2=d.rollItem(4,"familiar",12); d.gear().familiar=it2; d.applyGear(); d.step(1/60,2); const s2=F.state(); const it3=d.rollItem(3,"familiar",3); d.gear().familiar=it3; d.applyGear(); d.step(1/60,2); const s3=F.state(); const n2=d.scene.children.length; const pets=d.scene.children.filter(o=>o.userData&&o.userData.kind&&o.userData.wings).length;
  return {gone,bolts,n0,n1,pets,s2:s2&&s2.id,id2:it2.id,s3:s3&&s3.id,id3:it3.id,n2,kinds:["Wisp","Bat","Sprite","Fire Imp","Crystal Owl","Storm Drake"].map(k=>{ const g=F.build({name:"Glowing "+k,rarity:2}); let n=0; g.traverse(o=>{ if(o.isMesh&&!o.userData.isOL) n++; }); return g.userData.kind+":"+n; })}; });
console.log(JSON.stringify(r2));
check("unequip removes the model and bolts",r2.gone&&r2.bolts===0&&r2.n1<r2.n0,r2.n0+"->"+r2.n1);
check("swapping the item swaps the model (one pet in scene)",r2.s2===r2.id2&&r2.s3===r2.id3&&r2.pets===1,JSON.stringify(r2));
check("all six variants build",r2.kinds.length===6&&r2.kinds.every(k=>+k.split(":")[1]>=3),r2.kinds.join(" "));
// hero death hides it; dead phase removes it
const r3=await page.evaluate(()=>{ const d=window.__dd, F=window.__familiar; d.hero.dead=2; d.step(1/60,2); const hid=F.state().visible; d.hero.dead=0; d.step(1/60,2); const back=F.state().visible; return {hid,back}; });
check("hidden while the hero is down, back after",!r3.hid&&r3.back,JSON.stringify(r3));
// screenshot: behind the hero, pet over the shoulder, goblins ahead
const kind=process.env.KIND||"Crystal Owl";
await page.evaluate((kind)=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.step(1/60,90); let it; for(let i=0;i<400;i++){ it=d.rollItem(2,"familiar",8); if(it.name.includes(kind)) break; } d.gear().familiar=it; d.applyGear(); d.setHero(0,10,Math.PI); d.setCam(Math.PI,.3,5.5); d.step(1/60,70);
  const es=[]; for(let i=0;i<3;i++) es.push(d.spawn("goblin","N")); d.step(1/60,10); const place=()=>es.forEach((e,i)=>{ e.x=(i-1)*1.8; e.z=4.8; e.yaw=Math.PI; }); place(); d.step(1/60,25); place(); d.step(1/60,1); document.getElementById("hud").style.display="none"; },kind);
await page.waitForTimeout(150); await page.screenshot({path:SP+"/parts/shots/familiar.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon|font/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
