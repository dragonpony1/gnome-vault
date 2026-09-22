// ===== 10-meta.js — Meta core: persistent state (ddMeta), bag, gold, xp/levels/points, skills, shop, run accounting =====
// Same scope as game.js (inside its IIFE). The tavern UI (20-tavern.js) and the familiar (30-familiar.js) build on this.
const BAG_CAP=24, XP={goblin:2,archer:4,orc:8,ogre:40,drake:12};
const SKILLS=[
  {id:'blade',   name:'Blade',    per:.08, keys:['dmg'],        what:'Hero damage',              fmt:v=>'+'+Math.round(v*100)+'% hero damage'},
  {id:'vigor',   name:'Vigor',    per:.08, keys:['hp'],         what:'Hero max health',          fmt:v=>'+'+Math.round(v*100)+'% max health'},
  {id:'fleet',   name:'Fleet',    per:.03, keys:['move','spd'], what:'Move speed and swing speed',fmt:v=>'+'+Math.round(v*100)+'% speed & swing'},
  {id:'overseer',name:'Overseer', per:.08, keys:['tow'],        what:'Defense damage',           fmt:v=>'+'+Math.round(v*100)+'% defense damage'},
  {id:'loader',  name:'Loader',   per:.04, keys:['tcd'],        what:'Defense attack speed',     fmt:v=>'+'+Math.round(v*100)+'% defense attack speed'},
  {id:'wideshot',name:'Wideshot', per:.06, keys:['aoe'],        what:'Area of effect radius',    fmt:v=>'+'+Math.round(v*100)+'% AoE radius'},
  {id:'manawell',name:'Manawell', per:.10, keys:['mana'],       what:'Mana from orbs',           fmt:v=>'+'+Math.round(v*100)+'% mana'}];
const SKILL_MAX=10, GOLD_CSS='#ffd060';
const fmtG=n=>Math.round(n).toLocaleString('en-US');   // one gold format everywhere: HUD, reasons, tavern
const bagKey=()=>TOUCH?'tap 🎒':'press B';              // how this device gets into the tavern
function xpToNext(L){ return Math.round(100*Math.pow(Math.max(1,L),1.5)); }
function freshMeta(){ const skills={}; SKILLS.forEach(s=>skills[s.id]=0); return {v:1,gold:0,xp:0,level:1,skills,bag:[],best:0,stock:[],stockTier:1,runs:0}; }
function validItem(it){ return !!(it&&typeof it==='object'&&it.stats&&typeof it.stats==='object'&&SLOTS.includes(it.slot)&&Number.isFinite(+it.rarity)&&it.rarity>=0&&it.rarity<=4&&it.name); }
function fixItem(it){ it.rarity=clamp(Math.round(+it.rarity)||0,0,4); if(!it.id) it.id=Math.floor(LR()*1e9).toString(36); if(!it.lvl) it.lvl=1; if(!it.tier) it.tier=tierOf(it.lvl); for(const k in it.stats){ const v=+it.stats[k]; if(Number.isFinite(v)) it.stats[k]=v; else delete it.stats[k]; } if(!Number.isFinite(it.value)) it.value=10; if(!Number.isFinite(it.score)){ let sc=0; for(const k in it.stats) sc+=(it.stats[k]||0)*(STATW[k]||1); it.score=Math.round(sc*10)/10; } return it; }
function fixGear(){ let ch=false; for(const s of SLOTS){ const it=gear[s]; if(!it) continue; if(validItem(it)){ const had=it.id&&typeof it.score==='number'; fixItem(it); if(!had) ch=true; } else { gear[s]=null; ch=true; } } if(ch) saveGear(); }   // saves from before rollItem gave items id/score
let st=freshMeta(), metaVer=0, run={xp:0,gold:0,spent:0,payout:0,levels:0,drops:0,items:[],ended:false,newBest:false,started:false};
const GOLD_MAX=1e12, num=(v,lo,hi,d)=>{ v=Math.floor(+v); return Number.isFinite(v)?clamp(v,lo,hi):d; };   // storage can hold "1e999": every number is finite and clamped or falls back
function loadMeta(){ const f=freshMeta(); try{ const m=JSON.parse(localStorage.getItem('ddMeta'));
    if(m&&typeof m==='object'){ f.gold=num(m.gold,0,GOLD_MAX,0); f.level=num(m.level,1,999,1); f.xp=num(m.xp,0,xpToNext(f.level)-1,0); f.best=num(m.best,0,9999,0); f.runs=num(m.runs,0,1e9,0);
      if(m.skills&&typeof m.skills==='object'){ let sum=0; SKILLS.forEach(s=>{ const p=clamp(Math.floor(+m.skills[s.id]||0),0,SKILL_MAX); f.skills[s.id]=p; sum+=p; }); if(sum>f.level-1){ SKILLS.forEach(s=>f.skills[s.id]=0); } }
      if(Array.isArray(m.bag)) f.bag=m.bag.filter(validItem).map(fixItem).slice(0,BAG_CAP);
      if(Array.isArray(m.stock)) f.stock=m.stock.filter(validItem).map(fixItem); f.stockTier=num(m.stockTier,1,5,1); } }catch(e){}
  st=f; }
function saveMeta(){ metaVer++; try{ localStorage.setItem('ddMeta',JSON.stringify(st)); }catch(e){} metaHud(); }   // the HUD shows through the start screen: keep it current on every change, not only from update()
// ---- gold / xp ----
function addGold(n,why){ n=Math.round(+n||0); if(!n||!Number.isFinite(n)) return st.gold; st.gold=clamp(st.gold+n,0,GOLD_MAX); if(!Number.isFinite(st.gold)) st.gold=0; if(why!=='refund'){ if(n>0) run.gold+=n; else run.spent-=n; } saveMeta(); return st.gold; }
function points(){ let sum=0; SKILLS.forEach(s=>sum+=st.skills[s.id]); return Math.max(0,st.level-1-sum); }
function addXP(n){ n=Math.round(+n||0); if(!(n>0)||!Number.isFinite(n)) return; n=Math.min(n,1e9); st.xp+=n; run.xp+=n; let ups=0; while(st.xp>=xpToNext(st.level)){ st.xp-=xpToNext(st.level); st.level++; ups++; }
  if(ups){ run.levels+=ups; const p=points(); toast('LEVEL '+st.level+' — '+p+' skill point'+(p===1?'':'s')+' for the trainer ('+bagKey()+')'); SFX.held(); if(S.phase!=='start') floatText(hero.x,hero.y+2.4,hero.z,'LEVEL '+st.level+'!','#ffd060'); }
  saveMeta(); }
// ---- skills ----
function skillMult(k){ let v=0; for(const s of SKILLS){ if(s.keys.includes(k)) v+=s.per*st.skills[s.id]; } return v; }
function spend(id){ const s=SKILLS.find(s=>s.id===id); if(!s||points()<=0||st.skills[id]>=SKILL_MAX) return false; st.skills[id]++; applyGear(); saveMeta(); SFX.place(); return true; }
function respecCost(){ return 100*st.level; }
function spentPoints(){ let sum=0; SKILLS.forEach(s=>sum+=st.skills[s.id]); return sum; }
function canRespec(){ return spentPoints()>0&&st.gold>=respecCost(); }
function respec(){ if(!canRespec()) return false; addGold(-respecCost(),'respec'); SKILLS.forEach(s=>st.skills[s.id]=0); applyGear(); saveMeta(); SFX.mana(); toast('Skill points refunded — '+points()+' to spend'); return true; }
// ---- bag ----
function bagFull(){ return st.bag.length>=BAG_CAP; }
function bagIdx(id){ return st.bag.findIndex(b=>b.id===id); }
function bagItem(it,why){ if(!validItem(it)) return false; fixItem(it); if(bagIdx(it.id)>=0||bagFull()) return false; st.bag.push(it); saveMeta(); return true; }
function htmlToast(h,t){ $('toast').innerHTML=h; $('toast').style.opacity=1; toastT=t||3.4; }
function onPickup(it,l){ if(!validItem(it)) return false; fixItem(it); if(bagIdx(it.id)>=0) return true; run.drops++; run.items.push(it); const nm='<b style="color:'+RCSS[it.rarity]+'">'+it.name+'</b>';
  if(bagFull()){ addGold(it.value,'auto'); SFX.mana(); if(l) floatText(l.x,l.y+.8,l.z,'+'+it.value+' ●',GOLD_CSS); htmlToast('Bag is full — '+nm+' sold for '+fmtG(it.value)+' gold'); return true; }
  st.bag.push(it); saveMeta(); SFX.loot(it.rarity); if(l) floatText(l.x,l.y+1,l.z,RNAME[it.rarity].toUpperCase()+' '+SICON[it.slot],RCSS[it.rarity]);
  if(TOUCH) htmlToast(nm+' — bagged'); else lootToast(it,'bagged'); return true; }   // phones: name only, the stat line runs off a 390px screen
function sellItem(id){ const i=bagIdx(id); if(i<0) return 0; const it=st.bag.splice(i,1)[0]; addGold(it.value,'sell'); SFX.mana(); return it.value; }
// junk = not an upgrade: scores below what is worn in that slot, or a Common that does not beat it. With nothing worn it is the only thing the player could wear, and a Common that beats the worn item is an upgrade, never junk
function isJunk(it){ const eq=gear[it.slot]; if(!eq||eq.id===it.id) return false; return it.score<eq.score||(it.rarity===0&&it.score<=eq.score); }
function sellJunk(){ let n=0, g=0; for(let i=st.bag.length-1;i>=0;i--){ const it=st.bag[i]; if(isJunk(it)){ st.bag.splice(i,1); g+=it.value; n++; } } if(n){ addGold(g,'sell'); SFX.mana(); } return {n,gold:g}; }
function equip(id){ const i=bagIdx(id); if(i<0) return false; const it=st.bag.splice(i,1)[0], old=gear[it.slot]; gear[it.slot]=it; if(old) st.bag.push(old); applyGear(); saveGear(); saveMeta(); SFX.loot(it.rarity); return true; }
function unequip(slot){ const it=gear[slot]; if(!it) return false; if(bagFull()){ toast('Bag is full'); return false; } gear[slot]=null; st.bag.push(it); applyGear(); saveGear(); saveMeta(); return true; }
// ---- shop ----
function stockTierFor(best){ return best>0?clamp(tierOf(best)+1,1,5):1; }
function stockLvl(t){ return 3*t-2+((LR()*3)|0); }
function rollStockItem(minR,slot,t){ const L=stockLvl(t), w0=S.wave; S.wave=L; try{ return fixItem(rollItem(minR,slot,L)); } finally{ S.wave=w0; } }
function rollStock(){ const t=st.stockTier, slots=SLOTS.slice(); for(let i=slots.length-1;i>0;i--){ const j=(LR()*(i+1))|0; [slots[i],slots[j]]=[slots[j],slots[i]]; } slots.push(SLOTS[(LR()*SLOTS.length)|0]);
  st.stock=slots.map((s,i)=>rollStockItem(i===0?2:1,s,t)); saveMeta(); }
function restockCost(){ return 40*st.stockTier; }
function restock(){ if(st.gold<restockCost()) return false; addGold(-restockCost(),'restock'); rollStock(); SFX.place(); return true; }
function buyPrice(it){ return it.value*3; }
function stockIdx(i){ return typeof i==='string'?st.stock.findIndex(s=>s.id===i):i|0; }
function canBuy(i){ const it=st.stock[stockIdx(i)]; if(!it) return {ok:false,why:'Sold out'}; if(st.gold<buyPrice(it)) return {ok:false,why:'Need '+fmtG(buyPrice(it)-st.gold)+' more gold'}; if(bagFull()) return {ok:false,why:'Bag is full'}; return {ok:true,why:''}; }
function buy(i){ const k=stockIdx(i), c=canBuy(k); if(!c.ok){ toast(c.why); return false; } const it=st.stock.splice(k,1)[0]; addGold(-buyPrice(it),'buy'); st.bag.push(it); saveMeta(); SFX.loot(it.rarity); return true; }
// mid-run the best wave only moves when the crystal falls, so the line counts the waves held this run too: no 'reach wave 1' while the HUD says wave 2 held
function tierLine(){ const t=st.stockTier; if(t>=5) return 'Tier 5 stock · the finest in the hall'; const need=3*t-2, held=(S.phase==='build'||S.phase==='wave')?Math.max(st.best,S.wave-(S.phase==='wave'?1:0)):st.best; return 'Tier '+t+' stock · '+(held>=need?'tier '+(t+1)+' wares arrive after this run':'reach wave '+need+' for tier '+(t+1)); }
// ---- run accounting ----
function onKill(e){ addXP(XP[e&&e.kind]||2); }
function onWaveHeld(w){ const g=10+5*w, x=20+10*w; addGold(g,'wave'); floatText(hero.x,hero.y+2.2,hero.z,'+'+g+' ● gold  +'+x+' xp',GOLD_CSS); addXP(x); }
// goldGained = everything earned this run (wave pay, sells, the end payout); goldSpent = buys/restock/respec; payout = the 25*w paid when the crystal fell; newBest = strictly beat the old best
function summary(){ return {wave:S.wave,kills:S.kills,xpGained:run.xp,goldGained:run.gold,goldSpent:run.spent,goldNet:run.gold-run.spent,payout:run.payout,levelsGained:run.levels,drops:run.drops,items:run.items.slice(),best:st.best,newBest:run.newBest,gold:st.gold,level:st.level}; }
function onRunEnd(w,o){ if(run.ended) return true; run.ended=true; w=w|0; const tierUp=stockTierFor(Math.max(st.best,w))>st.stockTier; run.newBest=w>st.best; if(w>st.best) st.best=w; if(w>0){ run.payout=25*w+(o&&o.won?150:0); addGold(run.payout,'run'); }   // a map held pays 150 on top
  if(tierUp){ st.stockTier=stockTierFor(st.best); rollStock(); } saveMeta(); const data=summary(); if(o) Object.assign(data,o); let shown=false;
  if(typeof Tavern!=='undefined'&&Tavern&&Tavern.summary){ try{ Tavern.summary(data); shown=true; }catch(e){ console.error(e); } }
  if(!shown) toast('The crystal fell on wave '+w+' — +'+(25*w)+' gold'); return shown; }
// the reroll happens when a run actually starts (first in-play frame), never on a page load: TRY AGAIN / a refresh is not a free Restock
function metaUpdate(dt){ if(!run.started&&S.phase!=='start'){ run.started=true; rollStock(); } }
function metaOpen(){ if(typeof Tavern!=='undefined'&&Tavern&&Tavern.open) Tavern.open(); else toast('The tavern is being built'); }
// ---- HUD: gold readout in the .res line, level/xp line under #gear ----
const mhud={};
function ensureMetaHud(){ if(!$('gold')){ const res=document.querySelector('.res'); if(res){ const sp=document.createElement('span'); sp.className='gold'; sp.innerHTML='● <span id="gold">0</span> gold'; res.appendChild(sp); } }
  if(!$('xpline')&&$('gear')){ const d=document.createElement('div'); d.id='xpline'; $('gear').insertAdjacentElement('afterend',d); }
  // #hud-prefixed: the game's <style> sits in <body>, after this one in the cascade. .res may wrap (phone .bars is 170px): gold takes its own line instead of each span breaking mid-word; #toast wraps inside the viewport; HUD buttons reach 44px
  if(!$('metacss')){ const s=document.createElement('style'); s.id='metacss'; s.textContent='#hud .res{flex-wrap:wrap;row-gap:0}#hud .res>span{white-space:nowrap}#hud .res .gold{color:#ffd060}#hud #xpline{margin-top:4px;font-size:12px;color:#ffd060;text-shadow:0 1px 2px #000;white-space:nowrap}#hud #toast{left:16px;right:16px;max-width:none;transform:none;white-space:normal;line-height:1.3;text-align:center}#hud #bagbtn,#hud #sndbtn{min-height:44px;min-width:44px}'; document.head.appendChild(s); } }
function metaHud(){ const g=fmtG(st.gold), el=$('gold'); if(el&&mhud.gold!==g){ mhud.gold=g; el.textContent=g; }
  const p=points(), x='Lv '+st.level+' · '+fmtG(st.xp)+' / '+fmtG(xpToNext(st.level))+' xp'+(p?' · ✦ '+p+' skill pt'+(p===1?'':'s')+' for the trainer':''), xl=$('xpline'); if(xl&&mhud.xp!==x){ mhud.xp=x; xl.textContent=x; } }
// ---- test / debug helpers ----
function metaReset(){ try{ localStorage.removeItem('ddMeta'); }catch(e){} st=freshMeta(); run={xp:0,gold:0,spent:0,payout:0,levels:0,drops:0,items:[],ended:false,newBest:false,started:run.started}; resetGear(); st.stockTier=1; rollStock(); saveMeta(); }
{ const prevU=Meta.update; Meta.update=dt=>{ prevU(dt); metaUpdate(dt); }; }
Object.assign(Meta,{
  mult:skillMult, onPickup, onKill, onWaveHeld, onRunEnd, open:metaOpen, hud:metaHud,
  BAG_CAP, XP, SKILLS, SKILL_MAX, xpToNext, fmtG, isJunk, bagKey,
  gold:()=>st.gold, addGold, level:()=>st.level, xp:()=>st.xp, points, spentPoints, canRespec, respecCost, respec, spend,
  skill:id=>st.skills[id]||0, skills:()=>Object.assign({},st.skills), skillValue:id=>{ const s=SKILLS.find(s=>s.id===id); return s?s.fmt(s.per*st.skills[id]):''; },
  bag:()=>st.bag, bagFull, sell:sellItem, sellJunk, equip, unequip,
  stock:()=>st.stock, stockTier:()=>st.stockTier, tierLine, restockCost, restock, buyPrice, canBuy, buy,
  best:()=>st.best, runs:()=>st.runs, summary, version:()=>metaVer, save:saveMeta,
  state:()=>JSON.parse(JSON.stringify(st)), reset:metaReset, addXP, giveGold:n=>addGold(n,'refund'), giveItem:it=>bagItem(it,'give') });
window.__meta=Meta;
// ---- boot: load, new run → reroll stock at the shop tier, apply skill bonuses to the hero ----
loadMeta(); fixGear(); st.runs++; { const t=stockTierFor(st.best); if(t!==st.stockTier||!st.stock.length){ st.stockTier=t; rollStock(); } else saveMeta(); } applyGear(); hero.hp=hero.max; ensureMetaHud(); metaHud();
