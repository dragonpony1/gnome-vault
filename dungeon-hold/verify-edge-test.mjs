// verify-edge-test.mjs — phone edge cases for the verifier (port 8832)
import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const html=fs.readFileSync(SP+"/dungeon.html"); const server=http.createServer((q,r)=>{ r.setHeader("content-type","text/html; charset=utf-8"); r.end(html); }); await new Promise(r=>server.listen(8832,"127.0.0.1",r));
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true}); const SHOT=SP+"/parts/shots/verify-r1-";
await page.goto("http://127.0.0.1:8832/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:60000}); await page.waitForTimeout(300);
const log=(k,v)=>console.log(k+": "+JSON.stringify(v));
// HUD .res line: with and without the gold span
log("res line with gold",await page.evaluate(()=>{ const d=window.__dd; window.__meta.reset(); window.__meta.giveGold(1234567); d.S.mana=260; d.start(); d.step(1/60,3); const r=document.querySelector('.res'); const spans=[...r.children].map(c=>{ const b=c.getBoundingClientRect(); return c.textContent.trim()+' '+Math.round(b.width)+'x'+Math.round(b.height); }); return {h:Math.round(r.getBoundingClientRect().height),spans,gold:document.getElementById('gold').textContent}; }));
log("res line without gold",await page.evaluate(()=>{ const g=document.querySelector('.res .gold'); g.style.display='none'; const r=document.querySelector('.res'); const spans=[...r.children].filter(c=>c!==g).map(c=>{ const b=c.getBoundingClientRect(); return c.textContent.trim()+' '+Math.round(b.width)+'x'+Math.round(b.height); }); const h=Math.round(r.getBoundingClientRect().height); g.style.display=''; return {h,spans}; }));
await page.screenshot({path:SHOT+"phone-hud-biggold.png"});
// header with huge gold + level 100 + many points
const big=await page.evaluate(()=>{ const M=window.__meta; M.addXP(5e6); window.__dd.Meta.open(); window.__tavern.render(); const t=document.querySelector('.tv-title'), g=document.getElementById('tv-gold'), l=document.querySelector('.tv-lvl'), xp=document.querySelector('.tv-xp'); return {level:M.level(),points:M.points(),gold:M.gold(),title:t.textContent,titleClip:t.scrollWidth>t.clientWidth+1,titleW:Math.round(t.clientWidth),goldW:Math.round(g.getBoundingClientRect().width),lvlSW:l.scrollWidth,lvlCW:l.clientWidth,xpW:Math.round(xp.getBoundingClientRect().width),lvlTxt:l.textContent}; });
log("header at huge values",big); await page.waitForTimeout(900); await page.screenshot({path:SHOT+"phone-header-big.png"});
// footer message clipping with each DEFEND label
log("footer msg space",await page.evaluate(()=>{ const m=document.getElementById('tv-msg'); window.__tavern.say('Sold Crystalheart Plate Harness of Goblin Slaying for 1,200 gold'); return {msgW:Math.round(m.clientWidth),msgSW:m.scrollWidth,btn:document.getElementById('tv-defend').textContent,visibleChars:Math.round(m.clientWidth/6.2)}; }));
await page.waitForTimeout(200); await page.screenshot({path:SHOT+"phone-footer-msg.png"});
// level toast wording on touch
log("level toast",await page.evaluate(()=>{ window.__tavern.close(); const M=window.__meta; M.addXP(M.xpToNext(M.level())); return document.getElementById('toast').textContent; }));
// bag-full toast on phone: width vs viewport
log("bag full toast",await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; while(M.bag().length<24) M.giveItem(d.rollItem(1,'charm',2)); const it=d.rollItem(4,'amulet',9); it.name='Crystalheart Heartstone of Goblin Slaying'; d.Meta.onPickup(it,null); const t=document.getElementById('toast'); const r=t.getBoundingClientRect(); return {txt:t.textContent,left:Math.round(r.left),right:Math.round(r.right),iw:innerWidth,off:r.left<0||r.right>innerWidth}; }));
await page.waitForTimeout(150); await page.screenshot({path:SHOT+"phone-toast-full.png"});
log("bagged toast",await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; M.sell(M.bag()[0].id); const it=d.rollItem(4,'amulet',9); it.name='Crystalheart Heartstone of Goblin Slaying'; d.Meta.onPickup(it,null); const t=document.getElementById('toast'); const r=t.getBoundingClientRect(); return {txt:t.textContent,left:Math.round(r.left),right:Math.round(r.right),iw:innerWidth,off:r.left<0||r.right>innerWidth}; }));
await page.waitForTimeout(150); await page.screenshot({path:SHOT+"phone-toast-bagged.png"});
await browser.close(); server.close();
