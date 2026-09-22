import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const html=fs.readFileSync(SP+"/dungeon.html"); const server=http.createServer((q,r)=>{ r.setHeader("content-type","text/html; charset=utf-8"); r.end(html); }); await new Promise(r=>server.listen(8822,"127.0.0.1",r));
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const errors=[]; const SHOT=SP+"/parts/shots/";
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:40000});
const overflow=p=>p.evaluate(()=>{ const de=document.documentElement; const bad=[]; document.querySelectorAll('#tavern *').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.width>0&&(r.right>innerWidth+1||r.left<-1)) bad.push(el.className||el.id||el.tagName); }); return {sw:de.scrollWidth,iw:innerWidth,bad:bad.slice(0,6)}; });
async function run(vp,tag){
  const page=await browser.newPage({viewport:vp,hasTouch:vp.width<500,isMobile:vp.width<500}); page.on("pageerror",e=>errors.push(tag+": "+String(e))); page.on("console",m=>{ if(m.type()==="error") errors.push(tag+": "+m.text().slice(0,160)); });
  await page.goto("http://127.0.0.1:8822/?silent&nogate"); await ready(page);
  // seed: items, gold, xp; open from the start screen
  const seed=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); M.giveGold(1240); M.addXP(1500); d.S.wave=7; for(let i=0;i<7;i++) M.giveItem(d.rollItem(i%5,d.SLOTS[i%5],3+i)); M.giveItem(d.rollItem(4,'weapon',9)); d.S.wave=0; const w=M.bag().find(b=>b.slot==='armor'); M.equip(w.id); const c=M.bag().find(b=>b.slot==='charm'); M.equip(c.id);
    d.Meta.open(); d.step(1/60,3); return {open:d.Meta.isOpen(),vis:!document.getElementById('tavern').classList.contains('hide'),bag:M.bag().length,gold:M.gold(),shown:window.__tavern?window.__tavern.goldShown():null}; });
  check(tag+" opens via Meta.open, isOpen true", seed.open&&seed.vis&&seed.bag===6, JSON.stringify(seed));
  const bgc=await page.evaluate(()=>getComputedStyle(document.getElementById("tavern")).backgroundColor); check(tag+" overlay backdrop is the module's (94% ink)", /0\.9[5-6]/.test(bgc), bgc);
  await page.waitForTimeout(250); await page.screenshot({path:SHOT+"tavern-"+tag+"-bag.png"});
  const ov1=await overflow(page); check(tag+" bag tab: no horizontal overflow", ov1.sw<=ov1.iw&&ov1.bad.length===0, JSON.stringify(ov1));
  // tap a bag card → detail with deltas; Equip
  const firstId=await page.evaluate(()=>{ const M=window.__meta; const it=M.bag().find(b=>b.slot==='armor'); return it.id; });
  await page.click('#tv-bag .tv-card[data-id="'+firstId+'"]'); await page.waitForTimeout(150);
  const det=await page.evaluate(()=>{ const el=document.getElementById('tv-detail'); return {vis:!el.classList.contains('hide'),hasDelta:!!el.querySelector('.up,.dn'),equipBtn:!!el.querySelector('[data-act=equip]'),sellBtn:(el.querySelector('[data-act=sell]')||{}).textContent}; });
  check(tag+" detail panel shows deltas + Equip/Sell", det.vis&&det.hasDelta&&det.equipBtn&&/Sell \(\d/.test(det.sellBtn||''), JSON.stringify(det));
  await page.screenshot({path:SHOT+"tavern-"+tag+"-detail.png"});
  await page.click('#tv-detail [data-act=equip]'); await page.waitForTimeout(100);
  const eq=await page.evaluate(id=>{ const d=window.__dd; return {worn:d.gear().armor&&d.gear().armor.id===id,msg:document.getElementById('tv-msg').textContent}; },firstId);
  check(tag+" Equip button swaps armor", eq.worn&&/Equipped/.test(eq.msg), JSON.stringify(eq));
  // sell one item via detail → gold counter tweens up with ticks
  const sellId=await page.evaluate(()=>{ const M=window.__meta; return M.bag().find(b=>b.slot==='weapon'&&b.rarity<4).id; });
  await page.click('#tv-detail [data-act=detclose]').catch(()=>{}); await page.click('#tv-bag .tv-card[data-id="'+sellId+'"]'); await page.waitForTimeout(100);
  const g0=await page.evaluate(()=>window.__meta.gold()); await page.click('#tv-detail [data-act=sell]'); await page.waitForFunction(()=>window.__tavern.goldShown()===window.__meta.gold(),null,{timeout:20000}).catch(()=>{});
  const end=await page.evaluate(()=>({shown:window.__tavern.goldShown(),to:window.__meta.gold(),txt:document.getElementById('tv-goldn').textContent}));
  check(tag+" selling raises gold; counter lands on the exact formatted total", end.to>g0&&end.shown===end.to&&end.txt===end.to.toLocaleString('en-US'), JSON.stringify({g0,end}));
  // deterministic tween: one synchronous evaluate (rAF cannot interleave) — after 0.1 s the eased value is ~27% of the way, with the 'up' class on
  const tw=await page.evaluate(()=>{ const T=window.__tavern, M=window.__meta; const a=T.goldShown(); M.giveGold(1000); T.tick(.1); const mid=T.goldShown(), cls=document.getElementById('tv-gold').className, txt=document.getElementById('tv-goldn').textContent; T.tick(.3); const mid2=T.goldShown(); T.tick(.5); const done=T.goldShown(); return {a,mid,mid2,done,to:M.gold(),cls,txt}; });
  check(tag+" gold counter eases up over ~0.6 s (42% at 0.1 s → more → lands)", tw.mid>tw.a&&tw.mid<tw.to&&Math.abs(tw.mid-(tw.a+421))<=3&&tw.mid2>tw.mid&&tw.mid2<tw.to&&tw.done===tw.to&&/up/.test(tw.cls)&&tw.txt===tw.mid.toLocaleString('en-US'), JSON.stringify(tw));
  const twd=await page.evaluate(()=>{ const T=window.__tavern, M=window.__meta; const a=T.goldShown(); M.addGold(-500,'test'); T.tick(.1); const mid=T.goldShown(), cls=document.getElementById('tv-gold').className; T.tick(.6); return {a,mid,cls,done:T.goldShown(),to:M.gold()}; });
  check(tag+" gold counter counts down in red when spending", twd.mid<twd.a&&twd.mid>twd.to&&/dn/.test(twd.cls)&&twd.done===twd.to, JSON.stringify(twd));
  // sell junk
  await page.click('#tv-selljunk'); await page.waitForTimeout(100); const sj=await page.evaluate(()=>({msg:document.getElementById('tv-msg').textContent,bag:window.__meta.bag().length}));
  check(tag+" Sell junk works and reports", /Sold|Nothing/.test(sj.msg), JSON.stringify(sj));
  // shop tab: buy + restock
  await page.click('#tv-tab-shop'); await page.waitForTimeout(200); await page.screenshot({path:SHOT+"tavern-"+tag+"-shop.png"});
  const ov2=await overflow(page); check(tag+" shop tab: no horizontal overflow", ov2.sw<=ov2.iw&&ov2.bad.length===0, JSON.stringify(ov2));
  const shop=await page.evaluate(()=>({cards:document.querySelectorAll('#tv-shop .tv-card').length,tier:document.querySelector('#tv-shop .tv-n').textContent,buy:document.querySelector('#tv-shop [data-act=buy]').textContent,restock:document.getElementById('tv-restock').textContent}));
  check(tag+" shop shows 6 cards, tier line, prices", shop.cards===6&&/Tier \d stock/.test(shop.tier)&&/Buy \(\d/.test(shop.buy)&&/Restock \(\d/.test(shop.restock), JSON.stringify(shop));
  await page.evaluate(()=>window.__meta.giveGold(5000)); await page.waitForFunction(()=>window.__tavern.goldShown()===window.__meta.gold(),null,{timeout:20000}).catch(()=>{});
  const gb=await page.evaluate(()=>window.__meta.gold()); await page.click('#tv-shop [data-act=buy]:not([disabled])'); await page.waitForFunction(()=>window.__tavern.goldShown()===window.__meta.gold(),null,{timeout:20000}).catch(()=>{});
  const bought=await page.evaluate(()=>({gold:window.__meta.gold(),shown:window.__tavern.goldShown(),cards:document.querySelectorAll('#tv-shop .tv-card').length,cls:document.getElementById('tv-gold').className}));
  check(tag+" Buy: gold down (counter followed), 5 cards left", bought.gold<gb&&bought.shown===bought.gold&&bought.cards===5, JSON.stringify({gb,bought}));
  await page.click('#tv-restock'); await page.waitForTimeout(150); const rs=await page.evaluate(()=>document.querySelectorAll('#tv-shop .tv-card').length); check(tag+" Restock refills 6", rs===6, String(rs));
  // skills tab: + and Respec
  await page.click('#tv-tab-skills'); await page.waitForTimeout(200); await page.screenshot({path:SHOT+"tavern-"+tag+"-skills.png"});
  const ov3=await overflow(page); check(tag+" skills tab: no horizontal overflow", ov3.sw<=ov3.iw&&ov3.bad.length===0, JSON.stringify(ov3));
  const p0=await page.evaluate(()=>window.__meta.points()); await page.click('#tv-sk-blade [data-act=spend]'); await page.click('#tv-sk-blade [data-act=spend]'); await page.waitForTimeout(100);
  const sk=await page.evaluate(()=>({pts:window.__meta.points(),blade:window.__meta.skill('blade'),pips:document.querySelectorAll('#tv-sk-blade .tv-pips i.on').length,cv:document.querySelector('#tv-sk-blade .cv').textContent,mult:window.__dd.heroMult('dmg')}));
  check(tag+" + spends points: pips + value + heroMult", p0>=2&&sk.pts===p0-2&&sk.blade===2&&sk.pips===2&&/\+16% hero damage/.test(sk.cv)&&Math.abs(sk.mult-1.16)<1e-9, JSON.stringify({p0,sk}));
  await page.click('#tv-respec'); await page.waitForTimeout(100); const rp=await page.evaluate(()=>({pts:window.__meta.points(),blade:window.__meta.skill('blade'),dis:document.getElementById('tv-respec').disabled}));
  check(tag+" Respec refunds and disables itself", rp.blade===0&&rp.pts===p0&&rp.dis, JSON.stringify(rp));
  // Escape closes; keys blocked while open
  const bag2=await page.evaluate(()=>{ window.__tavern.tab('bag'); return document.getElementById('tv-bag').classList.contains('on'); }); check(tag+" tab('bag') switches", bag2);
  await page.keyboard.press('Escape'); await page.waitForTimeout(60); const closed=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),hide:document.getElementById('tavern').classList.contains('hide'),phase:window.__dd.S.phase}));
  check(tag+" Escape closes (still on start screen)", !closed.open&&closed.hide&&closed.phase==='start', JSON.stringify(closed));
  // DEFEND THE HALL from the start screen → play; open in play, close again
  await page.evaluate(()=>window.__dd.Meta.open()); await page.click('#tv-defend'); await page.waitForTimeout(100);
  const played=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen(),startHidden:document.getElementById('start').classList.contains('hide')}));
  check(tag+" DEFEND THE HALL on the start screen enters the hall", played.phase==='build'&&!played.open&&played.startHidden, JSON.stringify(played));
  await page.evaluate(()=>{ window.__dd.Meta.open(); }); await page.keyboard.press('KeyG'); await page.waitForTimeout(80);
  const blocked=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen()})); check(tag+" G is ignored while the tavern is open", blocked.phase==='build'&&blocked.open, JSON.stringify(blocked));
  await page.click('#tv-close'); await page.waitForTimeout(50);
  // run end → summary → TO THE TAVERN (gold counts up from pre-run value)
  const sum=await page.evaluate(()=>{ const d=window.__dd; d.S.wave=5; d.S.kills=37; d.S.phase="dead"; d.Meta.onKill({kind:'ogre'}); const r=d.Meta.onRunEnd(5); d.step(1/60,2); const el=document.getElementById('tv-sum'); return {r,vis:!el.classList.contains('hide'),h:el.querySelector('h2').textContent,dead:document.getElementById('dead').classList.contains('hide'),open:d.Meta.isOpen(),stats:[...el.querySelectorAll('.tv-stat b')].map(b=>b.textContent)}; });
  check(tag+" summary shows wave + stats, old dead screen suppressed", sum.r===true&&sum.vis&&/WAVE 5/.test(sum.h)&&sum.dead&&sum.open&&sum.stats.length===4, JSON.stringify(sum));
  await page.waitForTimeout(200); await page.screenshot({path:SHOT+"tavern-"+tag+"-summary.png"});
  await page.click('#tv-totavern'); await page.waitForTimeout(30);
  const tt=await page.evaluate(()=>({sum:window.__tavern.state().sum,tab:window.__tavern.state().tab,shown:window.__tavern.goldShown(),to:window.__meta.gold(),lbl:document.getElementById('tv-defend').textContent}));
  await page.waitForFunction(()=>window.__tavern.goldShown()===window.__meta.gold(),null,{timeout:20000}).catch(()=>{}); const tt2=await page.evaluate(()=>window.__tavern.goldShown());
  check(tag+" TO THE TAVERN → bag tab, gold counts up from pre-run total", !tt.sum&&tt.tab==='bag'&&tt.shown<=tt.to&&tt2===tt.to&&/AGAIN/.test(tt.lbl), JSON.stringify({tt,tt2}));
  await page.close(); }
await run({width:390,height:844},"phone");
await run({width:1280,height:800},"desktop");
check("no page errors", errors.length===0, errors.join(" | "));
await browser.close(); server.close(); const f=results.filter(x=>!x).length; console.log(`${results.length-f}/${results.length} tavern checks passed`); process.exit(f?1:0);
