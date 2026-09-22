import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8880);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:1200,height:800}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8880/?silent"); await page.waitForFunction(()=>window.__dd&&window.__sets&&window.__doll&&window.__dd.heroModel(),null,{timeout:90000});
const r=await page.evaluate(async()=>{ const d=window.__dd, M=window.__meta; M.reset(); d.resetGear(); d.start(); d.step(1/60,3); const base={tow:d.Meta.mult("tow"),hp:d.hero.max,mana:d.Meta.mult("mana"),tcd:d.Meta.mult("tcd")};
  const wear=(slot,name,r)=>{ const it=d.rollItem(r||2,slot,6); it.name=name; M.giveItem(it); M.equip(it.id); return it; };
  wear("weapon","Keen Broadsword of the Hall"); wear("armor","Runed Chainmail of the Hall"); const t2=document.getElementById("toast").textContent; const two=d.Meta.mult("tow");
  wear("charm","Silvered Idol of the Hall"); const t3=document.getElementById("toast").textContent; const three=d.Meta.mult("tow"); const act3=window.__sets.active();
  wear("amulet","Ancient Torc of the Hall"); wear("familiar","Runed Wisp of the Hall"); const t5=document.getElementById("toast").textContent; const five=d.Meta.mult("tow"), aoe=d.Meta.mult("aoe"); const act5=window.__sets.active();
  window.__doll.open(); await new Promise(r=>setTimeout(r,300)); const sheet=window.__doll.html(); window.__doll.close();
  // swap the amulet for a Deep piece: Hall drops to 4 (still the three-piece bonus), Deep starts counting
  const am=wear("amulet","Gleaming Locket of the Deep"); const c=window.__sets.counts(); const line=d.statStr(am);
  // the Deep five-piece: max health up, armor and regen flat
  d.resetGear(); M.reset(); d.start(); const hp0=d.hero.max, def0=d.heroStat("def"), rg0=d.heroStat("regen"); for(const [s,n] of [["weapon","Cleaver of the Deep"],["armor","Chainmail of the Deep"],["charm","Idol of the Deep"],["amulet","Torc of the Deep"],["familiar","Bat of the Deep"]]) wear(s,"Fine "+n,1); const hp5=d.hero.max, def5=d.heroStat("def"), rg5=d.heroStat("regen");
  return {base,two,three,five,aoe,t2,t3,t5,act3:act3.map(a=>a.name+":"+a.count),act5:act5.map(a=>a.name+":"+a.count),sheetHasSet:/of the Hall 5\/5/.test(sheet),counts:c,line,deep:{hp0,hp5,def0,def5,rg0,rg5}}; });
console.log(JSON.stringify(r));
check("three Hall pieces: +12% defense damage, a set toast; two pieces nothing",Math.abs(r.two-r.base.tow)<1e-9&&Math.abs(r.three-r.base.tow-.12)<1e-9&&/SET BONUS/.test(r.t3)&&!/SET BONUS/.test(r.t2)&&r.act3.join()==="of the Hall:3",JSON.stringify({two:r.two,three:r.three,t3:r.t3}));
check("five Hall pieces: +25% defense damage and +10% area, the sheet lists the full set",Math.abs(r.five-r.base.tow-.25)<1e-9&&Math.abs(r.aoe-.10)<1e-9&&/SET BONUS/.test(r.t5)&&r.act5.join()==="of the Hall:5"&&r.sheetHasSet,JSON.stringify({five:r.five,aoe:r.aoe,t5:r.t5}));
check("swapping one piece: Hall counts 4 (three-piece bonus stays), the Deep piece's stat line says its set 1/5",r.counts["of the Hall"]===4&&r.counts["of the Deep"]===1&&/Deep set 1\/5/.test(r.line),JSON.stringify({counts:r.counts,line:r.line}));
check("five Deep pieces: max health ×1.25 and flat +12% armor, +2 regen",r.deep.hp5>r.deep.hp0*1.2&&r.deep.def5-r.deep.def0>=12&&r.deep.rg5-r.deep.rg0>=2,JSON.stringify(r.deep));
await page.evaluate(async()=>{ window.__doll.open(); await new Promise(r=>setTimeout(r,300)); });
await page.screenshot({path:SP+"/parts/shots/sets.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
