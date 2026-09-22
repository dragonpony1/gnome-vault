import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8854);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:1280,height:800}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8854/?silent&nogate"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin")&&window.__room,null,{timeout:60000});
// the room is there and the hero can walk in through the south door
const r0=await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); d.step(1/60,3); const [dx,dz]=window.__room.door; d.setHero(dx,dz-3,0); d.setCam(0,.3,7); d.setKeys({w:1}); for(let i=0;i<150;i++) d.step(1/60,1); d.setKeys({w:0}); const b=window.__room.bounds; return {z:d.hero.z,door:dz,inRoom:d.hero.z>b.z0&&d.hero.x>b.x0&&d.hero.x<b.x1}; });
check("hero walks through the south door into the tavern",r0.inRoom&&r0.z>r0.door+2,JSON.stringify(r0));
// each station: prompt names it, E opens the matching page, Escape closes
const r1=await page.evaluate(async()=>{ const d=window.__dd, T=window.__tavern; const out=[]; for(const st of window.__room.stations()){ d.setHero(st.x-.8,st.z,0); d.step(1/60,3); const prompt=document.getElementById("prompt").textContent; window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE",bubbles:true})); await new Promise(r=>setTimeout(r,60)); const forge=st.tab==="forge"||st.tab==="armory"; const open=forge?window.__doll.isOpen():T.isOpen(), tab=forge?st.tab:(T.state?T.state().tab:document.querySelector("#tavern .tv-tab.on,#tavern [data-tab].on,#tavern .on")?.textContent); window.dispatchEvent(new KeyboardEvent("keydown",{code:"Escape",bubbles:true})); await new Promise(r=>setTimeout(r,60)); out.push({near:window.__room.near(),prompt,open,tab,closed:!(forge?window.__doll.isOpen():T.isOpen())}); } return out; });
check("locker → bag, barkeep → shop, trainer → skills, anvil → forge, stands → armory (prompt + E + Escape)",r1.length===5&&r1[4].near==="armory"&&/armory/.test(r1[4].prompt)&&r1.every(o=>o.open&&o.closed&&/^E /.test(o.prompt))&&r1[0].near==="bag"&&r1[1].near==="shop"&&r1[2].near==="skills"&&r1[3].near==="forge"&&String(r1[0].tab).toLowerCase().includes("bag")&&String(r1[1].tab).toLowerCase().includes("shop")&&String(r1[2].tab).toLowerCase().includes("skill")&&/anvil|smith/.test(r1[3].prompt),JSON.stringify(r1));
// upgrading in the hall still works and now says what it cost
const r2=await page.evaluate(()=>{ const d=window.__dd; d.addMana(1000); d.setHero(6,10,Math.PI); const t=d.place("harpoon",16,13,Math.PI); d.setHero(t.x+1.5,t.z+1.5,0); d.step(1/60,2); const card=window.__feel.defcard(); const m0=d.S.mana; window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE",bubbles:true})); d.step(1/60,2); const toast=document.getElementById("toast").textContent; return {lvl:t.lvl,spent:m0-d.S.mana,toast,cardHasCost:/Upgrade[^]*100 ◆ mana/.test(card||""),cardHasSell:/Sell[^]*\+\d+ ◆/.test(card||""),card:(card||"").slice(0,160)}; });
check("defense card lists repair / upgrade (with next-mark preview) / sell costs",r2.cardHasCost&&r2.cardHasSell,r2.card);
check("E in the hall upgrades and the toast says what it cost",r2.lvl===2&&r2.spent===100&&/100 mana/.test(r2.toast),JSON.stringify({lvl:r2.lvl,spent:r2.spent,toast:r2.toast}));
// mobs never wander into the tavern during a wave
const r3=await page.evaluate(()=>{ const d=window.__dd; d.setHero(0,20,0); const es=[]; for(let i=0;i<6;i++) es.push(d.spawn("goblin",["N","E","W"][i%3])); let inside=0; const b=window.__room.bounds; for(let i=0;i<600;i++){ d.step(1/60,1); for(const e of es) if(!e.dead&&e.z>b.z0&&e.x>b.x0&&e.x<b.x1) inside++; } es.forEach(e=>d.kill(e)); return {inside}; });
check("mobs stay out of the tavern",r3.inside===0,JSON.stringify(r3));
// screenshots: the room from the door, and the sign from the hall
await page.evaluate(()=>{ const d=window.__dd; const [dx,dz]=window.__room.door; d.setHero(dx,dz+2.5,0); d.setCam(0,.36,8); d.step(1/60,40); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/tavern-room.png"});
await page.evaluate(()=>{ const d=window.__dd; const [dx,dz]=window.__room.door; d.setHero(dx,dz-8,0); d.setCam(0,.3,7); d.step(1/60,40); });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/tavern-door.png"});
await page.evaluate(()=>{ const d=window.__dd; const st=window.__room.stations()[1]; d.setHero(st.x-1.2,st.z,Math.PI/2); d.setCam(Math.PI/2+Math.PI-.5,.25,5); d.step(1/60,40); });
await page.waitForTimeout(300); await page.screenshot({path:SP+"/parts/shots/tavern-bar.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
