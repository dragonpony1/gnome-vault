import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8861);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,200)); });
await page.addInitScript(()=>{ try{ localStorage.setItem("ddSound","on"); }catch(e){} }); await page.goto("http://127.0.0.1:8861/"); await page.waitForFunction(()=>window.__dd&&window.__casino&&window.__dd.heroModel(),null,{timeout:60000});
// sound on (not ?silent): run over a line of orbs and count the payouts
const r=await page.evaluate(async()=>{ const d=window.__dd; localStorage.setItem('ddSound','on'); try{ d.mute&&null; }catch(e){} window.__meta.reset(); d.resetGear(); d.start(); d.step(1/60,3); const s0=window.__casino.state();
  for(let i=0;i<9;i++){ const e=d.spawn("goblin","N"); e.x=d.hero.x+(i%3-1)*.8; e.z=d.hero.z-2-(i/3|0)*.6; d.kill(e); } d.step(1/60,2); const orbs0=d.orbs.length; const m0=d.S.mana;
  // stand by the crystal where the orbs drop; they drift to the hero within a few seconds
  for(let i=0;i<300&&d.orbs.length;i++) d.step(1/60,1); const s1=window.__casino.state(); return {orbs0,left:d.orbs.length,gained:+(d.S.mana-m0).toFixed(1),s0,s1,manaIsDing:window.__dd.SFX?undefined:'n/a'}; });
console.log(JSON.stringify(r));
check("orbs picked up ring the casino bell (one ding per orb, streak climbs, a jackpot lands by the 7th)",r.orbs0>0&&r.s1.dings-r.s0.dings>=Math.min(r.orbs0,7)&&r.s1.jackpots>=1,JSON.stringify(r));
const r2=await page.evaluate(async()=>{ await new Promise(r=>setTimeout(r,1500)); window.__casino.ding(); const a=window.__casino.state(); window.__casino.ding(); window.__casino.ding(); const b=window.__casino.state(); await new Promise(r=>setTimeout(r,1500)); window.__casino.ding(); const c=window.__casino.state(); return {a:a.streak,b:b.streak,c:c.streak}; });
check("streak resets after a quiet 1.4 s",r2.a===0&&r2.b===2&&r2.c===0,JSON.stringify(r2));
const realErrors=errors.filter(e=>!/Failed to load resource|favicon|AudioContext was not allowed/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
