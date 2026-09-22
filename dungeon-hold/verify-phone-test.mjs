// verify-phone-test.mjs — adversarial verifier (phone + looks). SP=<scratchpad> node verify-phone-test.mjs  (port 8831)
import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const html=fs.readFileSync(SP+"/dungeon.html"); const server=http.createServer((q,r)=>{ r.setHeader("content-type","text/html; charset=utf-8"); r.end(html); }); await new Promise(r=>server.listen(8831,"127.0.0.1",r));
const out=[]; const log=(k,v)=>{ out.push([k,v]); console.log(k+": "+(typeof v==='string'?v:JSON.stringify(v))); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const SHOT=SP+"/parts/shots/verify-r1-"; const ready=p=>p.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:60000});
const LONG='Crystalheart Plate Harness of Goblin Slaying';
// measurement helpers (run in page)
const measure=(sel)=>`(()=>{ const de=document.documentElement, root=document.querySelector(${JSON.stringify(sel)}); const bad=[], clipX=[], clipY=[], small=[];
  const body=document.getElementById('tv-body'); const bodyOv=body?{sw:body.scrollWidth,cw:body.clientWidth}:null;
  (root?root.querySelectorAll('*'):[]).forEach(el=>{ const r=el.getBoundingClientRect(); if(r.width>0&&(r.right>innerWidth+1||r.left<-1)) bad.push((el.className||el.id||el.tagName)+'@'+Math.round(r.right));
    const cs=getComputedStyle(el); if(r.width>0&&el.children.length===0&&el.textContent.trim()&&el.scrollWidth>el.clientWidth+1&&cs.overflow!=='visible') clipX.push((el.className||el.id||el.tagName)+':'+el.textContent.trim().slice(0,40)+' '+el.scrollWidth+'>'+el.clientWidth);
    if(r.width>0&&el.textContent.trim()&&el.scrollHeight>el.clientHeight+1&&cs.overflowY!=='auto'&&cs.overflowY!=='scroll'&&cs.overflow!=='visible') clipY.push((el.className||el.id||el.tagName)+':'+el.textContent.trim().slice(0,40)+' '+el.scrollHeight+'>'+el.clientHeight);
    if((el.tagName==='BUTTON'||el.matches('.tv-card,.hb,[data-act]'))&&r.width>0&&(r.width<44||r.height<44)) small.push((el.className||el.id||el.tagName)+':'+el.textContent.trim().slice(0,22)+' '+Math.round(r.width)+'x'+Math.round(r.height)); });
  return {docSW:de.scrollWidth,iw:innerWidth,bodyOv,offscreen:bad.slice(0,8),clipX:clipX.slice(0,10),clipY:clipY.slice(0,10),small:[...new Set(small)].slice(0,12)}; })()`;
const overlaps=(sel)=>`(()=>{ const els=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.getBoundingClientRect().width>0&&e.textContent.trim()); const res=[];
  for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ if(els[i].contains(els[j])||els[j].contains(els[i])) continue; const a=els[i].getBoundingClientRect(), b=els[j].getBoundingClientRect(); const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left), oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); if(ox>2&&oy>2) res.push((els[i].id||els[i].className)+' x '+(els[j].id||els[j].className)+' '+Math.round(ox)+'x'+Math.round(oy)); }
  return res.slice(0,10); })()`;
async function seed(page){ return page.evaluate(LONG=>{ const d=window.__dd, M=window.__meta; M.reset(); M.giveGold(3000); let need=0; for(let L=1;L<8;L++) need+=M.xpToNext(L); M.addXP(need+123); M.spend('blade'); M.spend('overseer');
    d.S.wave=9; const items=[]; for(let i=0;i<24;i++){ const it=d.rollItem(i%5,d.SLOTS[i%5],1+(i%15)); items.push(it); }
    items[0].name=LONG; items[1].name='Stormforged Crystal Owl of Goblin Slaying'; items[2].name='Goblinbane Warhammer of Goblin Slaying'; items.forEach(it=>M.giveItem(it)); d.S.wave=0;
    for(const s of d.SLOTS){ const it=M.bag().filter(b=>b.slot===s).sort((a,b)=>b.score-a.score)[0]; if(it) M.equip(it.id); }
    while(M.bag().length<24) M.giveItem(d.rollItem(4,'familiar',13));
    return {gold:M.gold(),level:M.level(),points:M.points(),bag:M.bag().length,stock:M.stock().length,tier:M.tierLine(),touch:document.body.classList.contains('touch'),touchBag:[...document.querySelectorAll('#btns .hb')].map(b=>b.textContent),xpline:document.getElementById('xpline').textContent}; },LONG); }
async function run(vp,tag){
  const phone=vp.width<500; const page=await browser.newPage({viewport:vp,deviceScaleFactor:phone?2:1,hasTouch:phone,isMobile:phone}); const errors=[]; page.on("pageerror",e=>errors.push(tag+": "+String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(tag+" "+m.type()+": "+m.text().slice(0,200)); });
  await page.goto("http://127.0.0.1:8831/?silent&nogate"); await ready(page); await page.waitForTimeout(300);
  const s=await seed(page); log(tag+" seed",s);
  // ---- start screen with tavern button ----
  await page.screenshot({path:SHOT+tag+"-start.png"});
  // ---- bag tab ----
  await page.evaluate(()=>window.__dd.Meta.open()); await page.waitForTimeout(400); await page.screenshot({path:SHOT+tag+"-bag.png"});
  log(tag+" bag measure",await page.evaluate(measure('#tavern'))); log(tag+" bag head overlaps",await page.evaluate(overlaps('.tv-head *, .tv-lvl *, .tv-sub *')));
  const rar=await page.evaluate(()=>{ const M=window.__meta, d=window.__dd; const bad=[]; document.querySelectorAll('#tv-bag .tv-card[data-from=bag]').forEach(c=>{ const it=M.bag().find(b=>b.id===c.dataset.id); const nm=c.querySelector('.nm'); const col=getComputedStyle(nm).color; const exp=d.RCSS[it.rarity]; const h=exp.slice(1); const rgb='rgb('+parseInt(h.slice(0,2),16)+', '+parseInt(h.slice(2,4),16)+', '+parseInt(h.slice(4,6),16)+')'; const tb=c.querySelector('.tb').textContent; if(col!==rgb) bad.push(it.name+' '+col+'!='+rgb); if(tb!=='T'+d.tierOf(it.lvl)) bad.push('tier '+it.name+' '+tb+' vs T'+d.tierOf(it.lvl)+' lvl'+it.lvl); }); return {cards:document.querySelectorAll('#tv-bag .tv-card[data-from=bag]').length,bad,title:document.querySelector('.tv-title').getBoundingClientRect().width,titleSW:document.querySelector('.tv-title').scrollWidth,goldTxt:document.getElementById('tv-gold').textContent,lvl:document.querySelector('.tv-lvl').textContent}; });
  log(tag+" rarity/tier",rar);
  const bodyH=await page.evaluate(()=>({sh:document.getElementById('tv-body').scrollHeight,ch:document.getElementById('tv-body').clientHeight,ta:getComputedStyle(document.getElementById('tv-body')).touchAction})); log(tag+" body scroll",bodyH);
  // scrolled bag bottom
  await page.evaluate(()=>{ document.getElementById('tv-body').scrollTop=99999; }); await page.waitForTimeout(150); await page.screenshot({path:SHOT+tag+"-bag-bottom.png"}); await page.evaluate(()=>{ document.getElementById('tv-body').scrollTop=0; });
  // ---- detail: long-name item (bag) ----
  const longId=await page.evaluate(L=>window.__meta.bag().find(b=>b.name===L).id,LONG);
  await page.click('#tv-bag .tv-card[data-id="'+longId+'"]'); await page.waitForTimeout(250); await page.screenshot({path:SHOT+tag+"-detail.png"});
  log(tag+" detail measure",await page.evaluate(measure('#tv-detail'))); log(tag+" detail overlaps",await page.evaluate(overlaps('#tv-detail *')));
  log(tag+" detail card visible?",await page.evaluate(id=>{ const c=document.querySelector('#tv-bag .tv-card[data-id="'+id+'"]').getBoundingClientRect(), d=document.getElementById('tv-detail').getBoundingClientRect(); return {cardBottom:Math.round(c.bottom),detailTop:Math.round(d.top),hidden:c.bottom>d.top,detH:Math.round(d.height),xBtn:(()=>{const r=document.querySelector('#tv-detail [data-act=detclose]').getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height);})()}; },longId));
  // detail of an equipped item
  const eqId=await page.evaluate(()=>window.__dd.gear().weapon.id); await page.click('#tv-bag .tv-card[data-id="'+eqId+'"][data-from=eq]'); await page.waitForTimeout(200); await page.screenshot({path:SHOT+tag+"-detail-worn.png"});
  // ---- gold count-up sampling after a sell ----
  const sellId=await page.evaluate(()=>window.__meta.bag().filter(b=>b.rarity>=3).sort((a,b)=>b.value-a.value)[0].id);
  await page.click('#tv-bag .tv-card[data-id="'+sellId+'"][data-from=bag]'); await page.waitForTimeout(150); const g0=await page.evaluate(()=>window.__meta.gold());
  await page.evaluate(()=>{ window.__gs=[]; const el=document.getElementById('tv-goldn'); window.__gt=performance.now(); new MutationObserver(()=>window.__gs.push([Math.round(performance.now()-window.__gt),el.textContent])).observe(el,{childList:true,characterData:true,subtree:true}); });
  await page.click('#tv-detail [data-act=sell]'); const samples=[]; const t0=Date.now(); while(Date.now()-t0<1500){ samples.push(await page.evaluate(()=>document.getElementById('tv-goldn').textContent+'|'+document.getElementById('tv-gold').className)); await page.waitForTimeout(25); }
  const distinct=[...new Set(samples)]; log(tag+" gold count-up samples",{g0,g1:await page.evaluate(()=>window.__meta.gold()),distinct:distinct.length,seq:distinct.slice(0,14)});
  await page.waitForTimeout(1500); log(tag+" gold MutationObserver log (ms,text)",await page.evaluate(()=>window.__gs));
  await page.screenshot({path:SHOT+tag+"-after-sell.png"});
  // detail open + scrolled to the bottom: is the last bag card reachable above the panel?
  await page.click('#tv-bag .tv-card[data-from=bag]'); await page.waitForTimeout(100); await page.evaluate(()=>{ document.getElementById('tv-body').scrollTop=99999; }); await page.waitForTimeout(150);
  log(tag+" last card vs detail",await page.evaluate(()=>{ const cs=[...document.querySelectorAll('#tv-bag .tv-card[data-from=bag]')]; const c=cs[cs.length-1].getBoundingClientRect(), d=document.getElementById('tv-detail').getBoundingClientRect(); return {lastCardBottom:Math.round(c.bottom),detailTop:Math.round(d.top),covered:c.bottom>d.top+1,coveredPx:Math.round(c.bottom-d.top)}; }));
  await page.screenshot({path:SHOT+tag+"-detail-bottom.png"}); await page.click('#tv-detail [data-act=detclose]'); await page.evaluate(()=>{ document.getElementById('tv-body').scrollTop=0; });
  if(phone){ const cdp=await page.context().newCDPSession(page); const st0=await page.evaluate(()=>document.getElementById('tv-body').scrollTop);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:700}]}); for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:700-i*40}]}); await page.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(300);
    log(tag+" touch pan scrolls tv-body",{before:st0,after:await page.evaluate(()=>document.getElementById('tv-body').scrollTop)}); }
  // ---- shop tab (tier 1) ----
  await page.click('#tv-tab-shop'); await page.waitForTimeout(300); await page.screenshot({path:SHOT+tag+"-shop.png"});
  log(tag+" shop measure",await page.evaluate(measure('#tavern'))); log(tag+" shop overlaps",await page.evaluate(overlaps('#tv-shop .tv-card *')));
  log(tag+" shop cards",await page.evaluate(()=>[...document.querySelectorAll('#tv-shop .tv-card')].map(c=>({nm:c.querySelector('.nm').textContent,tb:c.querySelector('.tb').textContent,buy:c.querySelector('[data-act=buy]').textContent,dis:c.querySelector('[data-act=buy]').disabled,why:(c.querySelector('.why')||{}).textContent}))));
  // shop detail
  await page.click('#tv-shop .tv-card'); await page.waitForTimeout(200); await page.screenshot({path:SHOT+tag+"-shop-detail.png"}); await page.click('#tv-detail [data-act=detclose]');
  // poor + bag full states: give away gold → why text
  await page.evaluate(()=>{ const M=window.__meta; M.addGold(-M.gold(),'test'); window.__tavern.render(); }); await page.waitForTimeout(700); await page.screenshot({path:SHOT+tag+"-shop-poor.png"});
  log(tag+" shop poor why",await page.evaluate(()=>[...document.querySelectorAll('#tv-shop .why')].map(w=>w.textContent+' @'+getComputedStyle(w).fontSize)));
  await page.evaluate(()=>{ window.__meta.giveGold(3000); }); await page.waitForTimeout(700);
  // buy everything → sold out empty state
  await page.evaluate(()=>{ const M=window.__meta; M.giveGold(50000); while(M.bag().length>6) M.sell(M.bag()[0].id); while(M.stock().length) M.buy(0); window.__tavern.render(); }); await page.waitForTimeout(800); await page.screenshot({path:SHOT+tag+"-shop-empty.png"});
  log(tag+" shop empty state",await page.evaluate(()=>({empty:(document.querySelector('#tv-shop .tv-empty')||{}).textContent,gold:document.getElementById('tv-goldn').textContent})));
  // ---- skills tab ----
  await page.click('#tv-tab-skills'); await page.waitForTimeout(300); await page.screenshot({path:SHOT+tag+"-skills.png"});
  log(tag+" skills measure",await page.evaluate(measure('#tavern'))); log(tag+" skills overlaps",await page.evaluate(overlaps('#tv-skills .tv-sk *')));
  log(tag+" skills rows",await page.evaluate(()=>[...document.querySelectorAll('#tv-skills .tv-sk')].map(r=>({nm:r.querySelector('.nm').textContent,cv:r.querySelector('.cv').textContent,on:r.querySelectorAll('.tv-pips i.on').length,dis:r.querySelector('[data-act=spend]').disabled,h:Math.round(r.getBoundingClientRect().height)}))));
  // max a skill: spend 10 in blade (give xp)
  await page.evaluate(()=>{ const M=window.__meta; M.addXP(200000); for(let i=0;i<10;i++) M.spend('blade'); window.__tavern.render(); }); await page.waitForTimeout(300); await page.screenshot({path:SHOT+tag+"-skills-max.png"});
  log(tag+" skills maxed row",await page.evaluate(()=>({cv:document.querySelector('#tv-sk-blade .cv').textContent,dis:document.querySelector('#tv-sk-blade [data-act=spend]').disabled,lvl:document.querySelector('.tv-lvl').textContent,xpline:document.getElementById('xpline').textContent,hudGold:document.getElementById('gold').textContent})));
  // ---- empty bag state ----
  await page.evaluate(()=>{ const M=window.__meta; const d=window.__dd; while(M.bag().length) M.sell(M.bag()[0].id); for(const s of d.SLOTS) if(d.gear()[s]) { M.unequip(s); M.sell(M.bag()[0].id); } window.__tavern.tab('bag'); window.__tavern.render(); }); await page.waitForTimeout(800); await page.screenshot({path:SHOT+tag+"-bag-empty.png"});
  log(tag+" empty bag",await page.evaluate(()=>({empty:(document.querySelector('#tv-bag .tv-empty')||{}).textContent,ems:[...document.querySelectorAll('#tv-bag .em')].map(e=>e.textContent),junk:document.getElementById('tv-selljunk').textContent,junkDis:document.getElementById('tv-selljunk').disabled})));
  await page.click('#tv-bag .tv-card[data-from=eq]'); await page.waitForTimeout(100); log(tag+" tap empty slot msg",await page.evaluate(()=>document.getElementById('tv-msg').textContent));
  // ---- close, enter hall, HUD ----
  await page.evaluate(()=>{ window.__tavern.close(); }); await seed(page);
  await page.evaluate(()=>{ const d=window.__dd; d.start(); d.step(1/60,5); }); await page.waitForTimeout(300); await page.screenshot({path:SHOT+tag+"-hud.png"});
  log(tag+" hud",await page.evaluate(()=>{ const r=id=>{ const e=document.getElementById(id)||document.querySelector(id); if(!e) return null; const b=e.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]; }; return {res:r('.res'),resSW:document.querySelector('.res').scrollWidth,bars:r('.bars'),gear:r('gear'),xpline:r('xpline'),xpTxt:document.getElementById('xpline').textContent,gold:document.getElementById('gold').textContent,bagbtn:r('bagbtn'),sndbtn:r('sndbtn'),wavebtn:r('wavebtn'),topC:r('topC'),btns:r('btns'),joy:r('joy'),hotbar:r('hotbar'),touchBtns:[...document.querySelectorAll('#btns .hb')].map(b=>b.textContent+':'+Math.round(b.getBoundingClientRect().width)),bagbtnSize:r('bagbtn')?[r('bagbtn')[2]-r('bagbtn')[0],r('bagbtn')[3]-r('bagbtn')[1]]:null}; }));
  log(tag+" hud overlaps",await page.evaluate(overlaps('#hud .bars *, #topC *, #bagbtn, #sndbtn, #wavebtn, #btns .hb, #hotbar .slot, #xpline')));
  // wave held → HUD gold change; sample HUD gold text
  const held=await page.evaluate(()=>{ const d=window.__dd; const g0=document.getElementById('gold').textContent; d.Meta.onWaveHeld(3); d.step(1/60,1); return {g0,g1:document.getElementById('gold').textContent,toast:document.getElementById('toast').textContent}; }); log(tag+" hud gold after wave",held);
  await page.waitForTimeout(200); await page.screenshot({path:SHOT+tag+"-hud-float.png"});
  // open tavern in play via touch button / bagbtn
  if(phone){ const bb=await page.evaluate(()=>{ const b=[...document.querySelectorAll('#btns .hb')].find(b=>b.textContent==='🎒'); if(!b) return null; const r=b.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; }); if(bb){ await page.touchscreen.tap(bb[0],bb[1]); await page.waitForTimeout(150); log(tag+" touch 🎒 opens tavern",await page.evaluate(()=>({open:window.__dd.Meta.isOpen(),phase:window.__dd.S.phase,lbl:document.getElementById('tv-defend').textContent}))); await page.screenshot({path:SHOT+tag+"-bag-inplay.png"}); await page.click('#tv-close'); } else log(tag+" touch 🎒",'MISSING'); }
  else { await page.click('#bagbtn'); await page.waitForTimeout(150); log(tag+" bagbtn opens",await page.evaluate(()=>window.__dd.Meta.isOpen())); await page.click('#tv-close'); }
  // ---- run end → summary (long-name drops) ----
  const sum=await page.evaluate(L=>{ const d=window.__dd; d.S.wave=10; d.S.kills=123; for(let i=0;i<9;i++){ const it=d.rollItem(4,d.SLOTS[i%5],10); if(i===0) it.name=L; d.Meta.onPickup(it,null); } d.S.phase='dead'; d.Meta.onKill({kind:'ogre'}); const r=d.Meta.onRunEnd(10); d.step(1/60,2); return {r,h2:document.querySelector('#tv-sum h2').textContent,stats:[...document.querySelectorAll('.tv-stat')].map(s=>s.textContent),drops:document.querySelector('.tv-drops').textContent.slice(0,120)}; },LONG); log(tag+" summary",sum);
  await page.waitForTimeout(400); await page.screenshot({path:SHOT+tag+"-summary.png"});
  log(tag+" summary measure",await page.evaluate(measure('#tv-sum'))); log(tag+" summary overlaps",await page.evaluate(overlaps('#tv-sum *')));
  log(tag+" summary scroll",await page.evaluate(()=>({sh:document.getElementById('tv-sum').scrollHeight,ch:document.getElementById('tv-sum').clientHeight})));
  await page.click('#tv-totavern'); const samples2=[]; const t1=Date.now(); while(Date.now()-t1<1500){ samples2.push(await page.evaluate(()=>document.getElementById('tv-goldn').textContent)); await page.waitForTimeout(25); }
  log(tag+" totavern count-up",{distinct:[...new Set(samples2)].length,seq:[...new Set(samples2)].slice(0,12),lbl:await page.evaluate(()=>document.getElementById('tv-defend').textContent)});
  await page.waitForTimeout(300); await page.screenshot({path:SHOT+tag+"-tavern-after-run.png"});
  // shop after tier-up
  await page.click('#tv-tab-shop'); await page.waitForTimeout(300); await page.screenshot({path:SHOT+tag+"-shop-t4.png"});
  log(tag+" shop tier after run",await page.evaluate(()=>({tier:window.__meta.tierLine(),cards:[...document.querySelectorAll('#tv-shop .tv-card')].map(c=>c.querySelector('.nm').textContent+' '+c.querySelector('.tb').textContent+' '+c.querySelector('[data-act=buy]').textContent)})));
  log(tag+" shop t4 measure",await page.evaluate(measure('#tavern')));
  // summary "NEW BEST" logic when equalling the best
  const nb=await page.evaluate(()=>{ const d=window.__dd; window.__tavern.close(); const s=d.Meta.summary(); return {best:s.best,wave:s.wave,h2:document.querySelector('#tv-sum h2').textContent}; }); log(tag+" new-best line",nb);
  // contrast checks on key text elements
  log(tag+" contrast",await page.evaluate(()=>{ const L=c=>{ const m=c.match(/[\d.]+/g).map(Number); const f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]); }; const ratio=(a,b)=>{ const x=L(a),y=L(b); return Math.round(((Math.max(x,y)+.05)/(Math.min(x,y)+.05))*100)/100; };
    const bg=el=>{ let e=el; while(e){ const b=getComputedStyle(e).backgroundColor, bi=getComputedStyle(e).backgroundImage; if(bi&&bi!=='none'){ const m=bi.match(/rgb\([^)]*\)/g); if(m) return m[m.length-1]; } if(b&&b!=='rgba(0, 0, 0, 0)'&&!/rgba\(.*, 0\)$/.test(b)) return b; e=e.parentElement; } return 'rgb(11,7,18)'; };
    const sels=['.tv-card .st','.tv-card .sl','.tv-card .tb','.tv-card .why','.tv-empty','.tv-sub .tv-n','.tv-sk .wh','.tv-sk .cv','.tv-detail .dm','.tv-stat span','.tv-lvl','.tv-tabs button:not(.on)','.tv-btn:disabled','#xpline','.tv-card .em','.tv-card .nm'];
    return sels.map(s=>{ const el=document.querySelector(s); if(!el) return s+': n/a'; const cs=getComputedStyle(el); return s+': '+cs.fontSize+' '+cs.color+' on '+bg(el)+' = '+ratio(cs.color,bg(el))+(cs.opacity!=='1'?' op'+cs.opacity:''); }); }));
  log(tag+" errors",errors);
  await page.close(); }
await run({width:390,height:844},"phone");
await run({width:1280,height:800},"desktop");
await browser.close(); server.close(); fs.writeFileSync(SP+"/parts/shots/verify-r1-log.json",JSON.stringify(out,null,1)); console.log("done");
