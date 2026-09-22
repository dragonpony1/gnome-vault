// every map: lanes, path lengths, a goblin and a drake per lane run 75 s (did they reach the crystal?), loot dropped on the crystal's
// own floor (lands on it, hero picks it up), a defense placed on the highest and lowest floor, and two screenshots each
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8907);
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const ctx=await browser.newContext({viewport:{width:1000,height:640}}); const page=await ctx.newPage(); const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
for(let m=0;m<4;m++){ await page.goto("http://127.0.0.1:8907/?silent&nogate&map="+m); await page.evaluate(()=>{ try{ localStorage.setItem("ddMapsCleared","4"); }catch(e){} }); if(m>0){ const idx=await page.evaluate(()=>window.__dd&&window.__dd.map?window.__dd.map().index:-1); if(idx!==m){ await page.goto("http://127.0.0.1:8907/?silent&nogate&map="+m); } }
  await page.waitForFunction(()=>window.__dd&&window.__dd.map&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:120000});
  const r=await page.evaluate(()=>{ const d=window.__dd; const map=d.map(); d.start(); d.step(1/60,3); const lanes=d.lanes(); const out={map:map.index+" "+map.name,gw:map.gw,gh:map.gh,lanes:{}};
    for(const k of Object.keys(lanes)){ const L=lanes[k]; const cx=L.cx!==undefined?L.cx:L[0], cz=L.cz!==undefined?L.cz:L[1]; out.lanes[k]={walk:d.pathLen(cx,cz),fly:d.pathLenFly(cx,cz)}; }
    // mobs run: one goblin and one drake per lane, 75 s
    const mobs=[]; for(const k of Object.keys(lanes)){ const g=d.spawn("goblin",k); g.hp=g.max=1e6; mobs.push({k,kind:"goblin",e:g}); const f=d.spawn("drake",k); f.hp=f.max=1e6; mobs.push({k,kind:"drake",e:f}); }
    const c0=d.S.crystal; for(let i=0;i<75*60;i++){ d.step(1/60,1); if(d.S.crystal<c0-30) break; } const cx0=d.cw(map.gw/2|0), cz0=d.cwz(map.gh/2|0);
    out.mobs=mobs.map(mb=>({lane:mb.k,kind:mb.kind,dist:+Math.hypot(mb.e.x-0,mb.e.z-0).toFixed(1),dead:!!mb.e.dead})); out.crystalHit=c0-d.S.crystal; mobs.forEach(mb=>d.kill(mb.e)); d.S.crystal=100;
    // loot on the crystal's own floor
    const fl=d.floorH(0,0); const g=d.spawn("goblin",Object.keys(lanes)[0]); g.x=1.2; g.z=1.2; const it=d.rollItem(1,"weapon",3); d.dropLoot(it,1.2,1.2); d.kill(g); d.step(1/60,120); const l=d.loot[d.loot.length-1]; out.loot={floor:+fl.toFixed(2),y:l?+l.y.toFixed(2):null,n:d.loot.length}; const bag0=window.__meta.bag().length; d.setHero(l?l.x:1.2,l?l.z:1.2,0); d.step(1/60,20); out.loot.picked=window.__meta.bag().length>=bag0+1;
    // hero on the crystal floor and on the lowest floor: y follows
    d.setHero(0,2,0); d.step(1/60,30); out.heroYAtCrystal=+d.hero.y.toFixed(2); let low=null; for(let cz=2;cz<map.gh-2&&!low;cz++) for(let cx=2;cx<map.gw-2&&!low;cx++){ const c=d.cellAt(cx,cz); if((c===1||c===2)&&d.hgtAt(cx,cz)===0) low=[cx,cz]; } if(low){ d.setHero(d.cw(low[0]),d.cwz(low[1]),0); d.step(1/60,30); out.heroYLow=+d.hero.y.toFixed(2); d.S.mana=5000; const t=d.place("harpoon",low[0],low[1],0); out.placedLow=!!t; if(t) d.setHero(t.x,t.z+1,0), d.sell(); }
    return out; });
  console.log(JSON.stringify(r));
  await page.evaluate(()=>{ const d=window.__dd; d.setHero(0,4,Math.PI); d.setCam(Math.PI,.5,14); d.step(1/60,20); document.getElementById("hud").style.display="none"; window.__freeze=true; }); await page.waitForTimeout(250); await page.screenshot({path:SP+"/parts/shots/audit-m"+m+"-crystal.png"});
  await page.evaluate(()=>{ const d=window.__dd; const map=d.map(); d.setHero(0,d.cwz(map.gh-6),0); d.setCam(0,.6,16); d.step(1/60,10); }); await page.waitForTimeout(250); await page.screenshot({path:SP+"/parts/shots/audit-m"+m+"-far.png"}); }
console.log("errors:",errors.slice(0,4).join(" | ")||"none"); await browser.close(); server.close();
