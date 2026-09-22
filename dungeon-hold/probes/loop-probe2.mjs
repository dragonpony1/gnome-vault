// loop-probe2.mjs — verifier round 1, follow-up probes (port 8831)
import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const html=fs.readFileSync(SP+"/dungeon.html"); const server=http.createServer((q,r)=>{ r.setHeader("content-type","text/html; charset=utf-8"); r.end(html); }); await new Promise(r=>server.listen(8831,"127.0.0.1",r));
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
await page.goto("http://127.0.0.1:8831/?silent"); await ready(page); await page.waitForTimeout(300);
await page.evaluate(()=>{ window.__meta.reset(); });
// ratio of tvFrame registrations per native frame: 1 loop → ~1, 2 loops → ~2
const loops=()=>page.evaluate(()=>new Promise(res=>{ let tv=0, frames=0; const o=window.requestAnimationFrame; window.requestAnimationFrame=cb=>{ if(cb.name==='tvFrame') tv++; return o.call(window,cb); }; const tick=()=>{ frames++; if(frames<12) o.call(window,tick); else { window.requestAnimationFrame=o; res({tv,frames,ratio:+(tv/frames).toFixed(2)}); } }; o.call(window,tick); }));
// A. tavern open (normal) → 1 loop
await page.click('#playbtn'); await page.waitForTimeout(100); await page.evaluate(()=>{ window.__dd.step(1/60,3); window.__dd.Meta.open(); });
const a=await loops(); check("A one overlay frame loop while the tavern is open", a.ratio>=.8&&a.ratio<=1.3, JSON.stringify(a));
// B. crystal falls while the tavern is open → summary() starts a second loop?
const b0=await page.evaluate(()=>{ const d=window.__dd; d.setHero(20,20,0); d.S.wave=2; d.S.crystal=1; d.spawn('ogre','N'); let n=0; while(d.S.phase!=='dead'&&n++<6000) d.step(1/60,1); return {phase:d.S.phase,sum:window.__tavern.state().sum}; });
const b=await loops(); check("B PROBE crystal falls with the tavern open → still one overlay loop (gold ticks/beeps at 1x)", b.ratio<=1.3, JSON.stringify({b0,b})+"  (ratio ~2 = two tvFrame loops running)");
await page.click('#tv-totavern'); await page.waitForTimeout(50); const b2=await loops(); console.log("info: loops after TO THE TAVERN:",JSON.stringify(b2));
// C. a Common item that would fill an empty slot: card says 'new slot' but Sell junk sells it
const c=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; const it=d.rollItem(0,'armor',2); it.rarity=0; M.giveItem(it); window.__tavern.tab('bag'); window.__tavern.render(); const card=document.querySelector('#tv-bag .tv-card[data-id="'+it.id+'"]'); return {vs:(card.querySelector('.vs')||{}).textContent,junkBtn:document.getElementById('tv-selljunk').textContent,armorWorn:!!d.gear().armor,stats:it.stats}; });
check("C PROBE a Common armor for an EMPTY armor slot is not offered as junk while its card says 'new slot'", !/Sell junk \(\d/.test(c.junkBtn)||c.vs!=='new slot', JSON.stringify(c));
// D. I key with a card selected: first press only clears the selection
await page.evaluate(()=>{ window.__tavern.close(); window.__dd.Meta.open(); }); await page.click('#tv-bag .tv-grid .tv-card'); await page.waitForTimeout(50);
await page.keyboard.press('KeyI'); await page.waitForTimeout(40); const d1=await page.evaluate(()=>window.__dd.Meta.isOpen()); await page.keyboard.press('KeyI'); await page.waitForTimeout(40); const d2=await page.evaluate(()=>window.__dd.Meta.isOpen());
check("D PROBE I closes the tavern in one press even with a card selected", d1===false, JSON.stringify({afterFirstI:d1,afterSecondI:d2}));
// E. HUD gold vs tavern gold formatting at >= 1000
const e=await page.evaluate(()=>{ const M=window.__meta; M.giveGold(5000); window.__dd.step(1/60,2); return {hud:document.getElementById('gold').textContent,tv:document.getElementById('tv-goldn').textContent,gold:M.gold()}; }); await page.waitForTimeout(900);
const e2=await page.evaluate(()=>({hud:document.getElementById('gold').textContent,tv:document.getElementById('tv-goldn').textContent}));
check("E PROBE HUD gold and tavern gold use the same number format", e2.hud===e2.tv, JSON.stringify({e,e2}));
// F. summary gold tile vs net: buy everything then die → tile still says +income
await page.reload(); await ready(page); await page.evaluate(()=>{ window.__meta.reset(); }); await page.click('#playbtn'); await page.waitForTimeout(100);
const f=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.step(1/60,3); M.giveGold(1000); const g0=M.gold(); M.buy(0); M.buy(0); const spent=g0-M.gold(); d.setHero(20,20,0); d.S.wave=1; d.S.crystal=1; d.spawn('ogre','N'); let n=0; while(d.S.phase!=='dead'&&n++<6000) d.step(1/60,1); d.step(1/60,2); const tiles=[...document.querySelectorAll('#tv-sum .tv-stat')].map(t=>t.textContent); return {g0,spent,gold:M.gold(),tiles,sum:M.summary().goldGained}; });
check("F PROBE gold tile is labelled as gross income (player spent "+f.spent+", tile says "+f.tiles[2]+")", /earned|income/i.test(f.tiles[2]), JSON.stringify(f));
// G. after a fall: press I on the old dead screen → tavern; DEFEND AGAIN label; GO AGAIN reloads to the start screen
await page.click('#tv-totavern'); await page.waitForTimeout(50); await page.click('#tv-close'); await page.waitForTimeout(50); await page.keyboard.press('KeyI'); await page.waitForTimeout(60);
const g=await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),lbl:document.getElementById('tv-defend').textContent,deadVis:!document.getElementById('dead').classList.contains('hide')}));
check("G I on the dead screen reopens the tavern with DEFEND THE HALL AGAIN", g.open&&/AGAIN/.test(g.lbl), JSON.stringify(g));
check("no page errors", errors.length===0, errors.join(" | ").slice(0,300));
await browser.close(); server.close(); const fl=results.filter(x=>!x).length; console.log(`${results.length-fl}/${results.length} probe checks`); process.exit(0);
