import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8846);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8846/?silent&nogate");
// wait for hero v2 (it carries the weapon mount) and the default sword
await page.waitForFunction(()=>window.__dd&&window.__weapons&&window.__dd.heroModel()&&/v2/.test(window.__dd.heroModel().label),null,{timeout:60000});   // the mount is looked up once the game runs
const s0=await page.evaluate(async()=>{ const d=window.__dd; window.__meta.reset(); d.resetGear(); d.start(); for(let i=0;i<80&&!window.__weapons.state().mounted;i++){ d.step(1/60,1); await new Promise(r=>setTimeout(r,50)); } return window.__weapons.state(); });
check("hero v2 carries a weapon mount on the right hand and holds the plain sword by default",s0.mount&&s0.mount.bone==="RightHand"&&s0.mounted&&s0.hand==="RightHand"&&/rusty/.test(s0.key),JSON.stringify(s0));
// equip swords of different names: the mounted model follows the name (and each of the five looks is reachable)
const r1=await page.evaluate(async()=>{ const d=window.__dd; const out=[]; for(const [r,nm] of [[2,"Silvered Cleaver of the Deep"],[3,"Ancient Warhammer of Embers"],[4,"Eternal Gnome Blade of the Crystal"],[3,"Stormforged Halberd of Fury"],[0,"Rusty Shortsword"]]){ const it=d.rollItem(r,"weapon",6); it.name=nm; window.__meta.giveItem(it); window.__meta.equip(it.id); for(let i=0;i<80;i++){ d.step(1/60,1); const st=window.__weapons.state(); if(st.mounted&&st.key.startsWith(window.__weapons.swordFor(it)+"|")) break; await new Promise(r=>setTimeout(r,40)); } out.push({name:nm,want:window.__weapons.swordFor(it),got:window.__weapons.state().key.split("|")[0],mounted:window.__weapons.state().mounted}); } return out; });
check("cleaver → venom, embers → flame, crystal blade → holy, stormforged → frost, shortsword → rusty; each mounted",r1.every(o=>o.got===o.want&&o.mounted)&&r1.map(o=>o.got).join()==="venom,flame,holy,frost,rusty",JSON.stringify(r1));
// the sword sits in the fist: grip on the mount, pommel just below it, blade about a unit long
const r2=await page.evaluate(()=>{ const b=window.__weapons.blade(); const dist=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1],a[2]-c[2]); return {gripToMount:+dist(b.grip,b.mount).toFixed(3),pommelToMount:+dist(b.pommel,b.mount).toFixed(3),pommelToHand:+dist(b.pommel,b.hand).toFixed(3),bladeLen:+dist(b.grip,b.tip).toFixed(3),tier:window.__weapons.state().tier}; });
check("sword in the fist: grip on the mount (<0.03), pommel within 0.3 of it, blade 0.6–1.3 long",r2.gripToMount<.03&&r2.pommelToMount<.3&&r2.bladeLen>.6&&r2.bladeLen<1.3,JSON.stringify(r2));
// tiers show: a tier-5 blade is longer than a tier-1 one of the same look
const r3=await page.evaluate(async()=>{ const d=window.__dd; const len=async(lvl)=>{ const it=d.rollItem(0,"weapon",lvl); it.name="Rusty Shortsword"; window.__meta.giveItem(it); window.__meta.equip(it.id); for(let i=0;i<80;i++){ d.step(1/60,1); const st=window.__weapons.state(); if(st.mounted&&st.tier===window.__weapons.swordTier(it)) break; await new Promise(r=>setTimeout(r,40)); } const b=window.__weapons.blade(); return {tier:window.__weapons.state().tier,len:+Math.hypot(b.tip[0]-b.grip[0],b.tip[1]-b.grip[1],b.tip[2]-b.grip[2]).toFixed(3)}; }; return {t1:await len(1),t5:await len(14)}; });
check("tier 5 blade longer than tier 1 (same model)",r3.t1.tier===1&&r3.t5.tier===5&&r3.t5.len>r3.t1.len*1.2,JSON.stringify(r3));
// the rarity glow rides the blade at a visible size
const r4=await page.evaluate(async()=>{ const d=window.__dd; const it=d.rollItem(3,"weapon",6); it.name="Ancient Warhammer of Embers"; window.__meta.giveItem(it); window.__meta.equip(it.id); d.step(1/60,3); let sp=null; d.scene.traverse(o=>{ if(o.isSprite&&o.parent&&/^weaponMount_/.test(o.parent.name)) sp=o; }); if(!sp) return {found:false}; sp.updateWorldMatrix(true,false); const ws=sp.getWorldScale(new THREE.Vector3()); const b=window.__weapons.blade(); const p=sp.getWorldPosition(new THREE.Vector3()).toArray(); const onBlade=Math.hypot(p[0]-(b.grip[0]+b.tip[0])/2,p[1]-(b.grip[1]+b.tip[1])/2,p[2]-(b.grip[2]+b.tip[2])/2); return {found:true,size:+ws.x.toFixed(2),onBlade:+onBlade.toFixed(2)}; });
check("weapon glow on the mount, ~0.85 world units, near mid-blade",r4.found&&r4.size>.6&&r4.size<1.2&&r4.onBlade<.35,JSON.stringify(r4));
// a cleaver is venom whatever its rarity
const r5=await page.evaluate(async()=>{ const d=window.__dd; const it=d.rollItem(1,"weapon",3); it.name="Fine Cleaver"; window.__meta.giveItem(it); window.__meta.equip(it.id); for(let i=0;i<80;i++){ d.step(1/60,1); if(window.__weapons.state().key.startsWith("venom")&&window.__weapons.state().mounted) break; await new Promise(r=>setTimeout(r,40)); } return window.__weapons.state(); });
check("a cleaver mounts the venom blade",/^venom/.test(r5.key)&&r5.mounted,JSON.stringify(r5));
// only one sword on the hand at a time
const n=await page.evaluate(()=>{ let n=0; window.__dd.scene.traverse(o=>{ if(o.userData.sword&&o.parent&&/^weaponMount_/.test(o.parent.name)) n++; }); return n; });
check("exactly one sword object on the mount",n===1,"objects on mount: "+n);
// close-up screenshot: holy sword in hand, mid-idle and mid-chop
await page.evaluate(()=>{ const d=window.__dd; const it=d.rollItem(4,"weapon",8); it.name="Eternal Gnome Blade of the Crystal"; window.__meta.giveItem(it); window.__meta.equip(it.id); d.setHero(0,10,Math.PI*.75); d.setCam(Math.PI*.75+Math.PI-.9,.18,4.6); d.step(1/60,60); document.getElementById("hud").style.display="none"; });
await page.waitForTimeout(400); await page.screenshot({path:SP+"/parts/shots/weapon-idle.png"});
await page.evaluate(()=>{ const d=window.__dd; d.swing(); d.step(1/60,10); }); await page.waitForTimeout(150); await page.screenshot({path:SP+"/parts/shots/weapon-chop.png"});
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
