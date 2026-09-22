// verify-robust5b-test.mjs — follow-ups: real key auto-repeat on I, raw touch-event scrolling of the bag list, Enter on the start screen after TAVERN→Esc. Port 8833.
import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const URL="http://127.0.0.1:8833/?silent";
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const out=(n,v)=>console.log("## "+n+"\n"+JSON.stringify(v));
const page=await browser.newPage({viewport:{width:960,height:600}}); const errs=[]; page.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await page.goto(URL); await ready(page); await page.evaluate(()=>{ localStorage.clear(); window.__meta.reset(); });
// Enter after TAVERN → Esc on the start screen
const f={}; await page.click('#tavbtn'); await page.keyboard.press('Escape'); await page.waitForTimeout(40); await page.keyboard.press('Enter'); await page.waitForTimeout(150); f.enterAfterTavEsc=await page.evaluate(()=>({phase:window.__dd.S.phase,open:window.__dd.Meta.isOpen()}));
await page.evaluate(()=>window.__tavern.close());
// real auto-repeat: keyboard.down twice = second keydown carries repeat:true (Playwright semantics)
const seq=[]; await page.keyboard.down('KeyI'); await page.waitForTimeout(30); seq.push(await page.evaluate(()=>window.__dd.Meta.isOpen()));
for(let i=0;i<4;i++){ await page.keyboard.down('KeyI'); await page.waitForTimeout(30); seq.push(await page.evaluate(()=>window.__dd.Meta.isOpen())); } await page.keyboard.up('KeyI'); f.holdI=seq;
await page.evaluate(()=>{ window.__reps=[]; addEventListener('keydown',e=>window.__reps.push(e.code+':'+e.repeat),true); }); await page.keyboard.down('KeyB'); await page.keyboard.down('KeyB'); await page.keyboard.up('KeyB'); f.downTwice=await page.evaluate(()=>window.__reps); await page.evaluate(()=>window.__tavern.close());
f.errs=errs.slice(); out("desktop",f); await page.close();
// phone: raw touch scroll
const ph=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}); await ph.goto(URL); await ready(ph);
await ph.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.reset(); for(let i=0;i<20;i++) M.giveItem(d.rollItem(i%5,['weapon','armor','charm','amulet','familiar'][i%5],1+i)); d.Meta.open(); });
const cdp=await ph.context().newCDPSession(ph);
const swipe=async(x,y0,y1,steps)=>{ await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]}); for(let i=1;i<=steps;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*i/steps}]}); await ph.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); };
const T={}; T.geom=await ph.evaluate(()=>{ const b=document.getElementById('tv-body'); const r=b.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,sh:b.scrollHeight,ch:b.clientHeight}; });
await swipe(195,T.geom.bottom-40,T.geom.top+40,12); await ph.waitForTimeout(400); T.bagScrollTop=await ph.evaluate(()=>document.getElementById('tv-body').scrollTop);
T.ctl=await ph.evaluate(()=>{ const s=document.createElement('div'); s.id='ctl'; s.style.cssText='position:fixed;left:0;top:0;width:200px;height:300px;overflow:auto;z-index:99;background:#333;touch-action:pan-y'; s.innerHTML='<div style="height:3000px"></div>'; document.body.appendChild(s); return 1; });
await swipe(100,250,50,12); await ph.waitForTimeout(400); T.ctlScrollTop=await ph.evaluate(()=>{ const s=document.getElementById('ctl'); const v=s.scrollTop; s.remove(); return v; });
// control 2: same swipe on a scroller whose own touch-action is none (must NOT scroll) to prove the events are honoured
T.ctl2=await ph.evaluate(()=>{ const s=document.createElement('div'); s.id='ctl2'; s.style.cssText='position:fixed;left:0;top:0;width:200px;height:300px;overflow:auto;z-index:99;background:#333;touch-action:none'; s.innerHTML='<div style="height:3000px"></div>'; document.body.appendChild(s); return 1; });
await swipe(100,250,50,12); await ph.waitForTimeout(400); T.ctl2ScrollTop=await ph.evaluate(()=>{ const s=document.getElementById('ctl2'); const v=s.scrollTop; s.remove(); return v; });
// detail panel scroll + tap after scrolling (no ghost click)
await ph.tap('#tv-bag .tv-grid .tv-card'); await ph.waitForTimeout(50); T.selAfterTap=await ph.evaluate(()=>!!window.__tavern.state().sel);
await ph.screenshot({path:SP+"/parts/shots/verify-r5-phone-bag.png"});
out("phone",T); await browser.close(); server.close();
