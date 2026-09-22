// ===== THE CHARACTER SHEET (Tab) IS THE FORGE: a paper doll with the five gear slots around the Warden, and every slot is a
// panel showing what the item gives and the upgrades you can buy into it right there (+1 / +5 / +25 per stat, gold per
// upgrade, points used of the item's allowance). The fighting numbers sit in a strip under the title. The HUD keeps only
// what you watch mid-fight — crystal, health, mana, roots, gold, level — and gets bigger.
(function(){
const css=`#hud .bars{width:300px}#hud .bar{height:20px}#hud .bar b{font-size:13px;top:1px}#hud .res{font-size:21px;gap:16px;margin-top:2px}#hud .res .gold{font-size:19px}#hud #xpline{font-size:14px;margin-top:4px}
#hud #gear,#hud #herostats{display:none!important}
#dollbtn{position:absolute;right:110px;top:62px;pointer-events:auto;background:#1c1424;border:2px solid #6b5a3c;border-radius:8px;color:#fff;font-size:16px;padding:5px 10px;cursor:pointer}
#doll{z-index:11}#doll .dl-box{width:min(1120px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;background:linear-gradient(#2a1f33f8,#160f1cf8);border:2px solid #6b5a3c;border-radius:12px;box-shadow:0 6px 0 #000,0 0 30px #000a;padding:14px 20px 16px;text-align:left;color:#f1e6d0}
#doll h1{font-size:26px;letter-spacing:4px;margin:0 0 2px;color:var(--gold);text-shadow:0 2px 0 #000}#doll .dl-sub{font-size:13px;color:#bfae90;letter-spacing:1px;margin-bottom:8px}#doll .dl-sub b{color:var(--gold)}
#doll .dl-x{position:absolute;right:14px;top:10px;background:#1c1424;border:2px solid #6b5a3c;border-radius:8px;color:#fff;font-size:18px;width:40px;height:40px;cursor:pointer}
#doll .dl-strip{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}#doll .dl-stat{flex:1 1 100px;background:#1c1424aa;border:1px solid #6b5a3c66;border-radius:8px;padding:5px 9px}#doll .dl-stat i{font-style:normal;font-size:11px;color:#bfae90;letter-spacing:1px;display:block}#doll .dl-stat b{font-size:19px;color:#f1e6d0;line-height:1.15}#doll .dl-stat.big b{color:var(--gold)}
#doll .dl-grid{display:grid;grid-template-columns:1fr 330px 1fr;gap:12px;align-items:start}#doll .dl-col{display:flex;flex-direction:column;gap:12px}
#doll .dl-figure{position:relative;height:210px;background:radial-gradient(ellipse at 50% 60%,#3a2a4466,transparent 70%);border:1px solid #6b5a3c44;border-radius:10px}
#doll .dl-gnome{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.62);width:150px;height:300px}
#doll .dl-hat{position:absolute;left:50%;top:0;transform:translateX(-50%);width:0;height:0;border-left:44px solid transparent;border-right:44px solid transparent;border-bottom:112px solid #c8262b;filter:drop-shadow(0 3px 0 #120c1a)}
#doll .dl-head{position:absolute;left:50%;top:96px;transform:translateX(-50%);width:76px;height:70px;border-radius:50%;background:#f0b48c;box-shadow:0 0 0 3px #120c1a}
#doll .dl-beard{position:absolute;left:50%;top:132px;transform:translateX(-50%);width:66px;height:54px;border-radius:0 0 40px 40px;background:#9a5a2a;box-shadow:0 0 0 3px #120c1a}
#doll .dl-body{position:absolute;left:50%;top:172px;transform:translateX(-50%);width:104px;height:92px;border-radius:18px 18px 10px 10px;background:linear-gradient(#f1e6d0 0 12%,#c8262b 12% 100%);box-shadow:0 0 0 3px #120c1a}
#doll .dl-legs{position:absolute;left:50%;top:262px;transform:translateX(-50%);width:84px;height:38px;border-radius:0 0 12px 12px;background:#2a2036;box-shadow:0 0 0 3px #120c1a}
#doll .dl-slot{background:#1c1424ee;border:2px solid #6b5a3c;border-radius:10px;padding:8px 10px;font-size:12px;line-height:1.3;box-shadow:0 3px 0 #000}
#doll .dl-slot .sl-head{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}#doll .dl-slot .ic{font-size:20px;line-height:1}#doll .dl-slot .nm{font-weight:bold;font-size:13px;line-height:1.15}#doll .dl-slot .st{color:#bfae90;font-size:11px;margin-top:2px}#doll .dl-slot .em{color:#7d7286;font-style:italic;font-size:13px}#doll .dl-slot .tier{display:inline-block;font-size:10px;color:var(--gold);border:1px solid #6b5a3c;border-radius:4px;padding:0 4px;margin-right:4px;vertical-align:1px}
#doll .fg-meter{position:relative;height:16px;background:#120c1a;border:1px solid #6b5a3c;border-radius:8px;overflow:hidden;margin:4px 0}#doll .fg-meter i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#8a5e34,var(--gold))}#doll .fg-meter span{position:absolute;inset:0;text-align:center;font-size:10px;line-height:16px;color:#fff;text-shadow:0 1px 0 #000}
#doll .fg-cost{font-size:11px;color:#bfae90;margin-bottom:4px}#doll .fg-cost b{color:var(--gold)}#doll .fg-cost .no{color:#ff9a7a}
#doll .fg-row{display:grid;grid-template-columns:1fr auto auto;gap:5px;align-items:center;background:#120c1a88;border:1px solid #6b5a3c55;border-radius:7px;padding:4px 7px;margin-top:4px}#doll .fg-row .fg-l{font-size:12px;line-height:1.15}#doll .fg-row .fg-l small{display:block;color:#7d7286;font-size:10px}#doll .fg-row .fg-v{font-size:14px;color:#f1e6d0;min-width:44px;text-align:right}#doll .fg-row.on .fg-v{color:var(--gold)}
#doll .fg-btns{white-space:nowrap}#doll .fg-btns button{background:linear-gradient(#7a2a2e,#3e1416);border:1px solid var(--gold);border-radius:5px;color:#fff;font:bold 11px Georgia,serif;padding:4px 6px;margin-left:2px;cursor:pointer}#doll .fg-btns button:disabled{opacity:.3;cursor:default}
#doll .dl-mini{background:#2a1f33;border:1px solid #6b5a3c;border-radius:6px;color:#f1e6d0;font:12px Georgia,serif;padding:5px 9px;cursor:pointer;margin-top:6px}
#doll .dl-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:#bfae90;flex-wrap:wrap}
#doll .dl-btn{background:linear-gradient(#7a2a2e,#3e1416);border:2px solid var(--gold);border-radius:8px;color:#fff;font:bold 14px Georgia,serif;letter-spacing:1px;padding:9px 16px;cursor:pointer;box-shadow:0 3px 0 #000}
#doll .dl-skills{font-size:12px;color:#bfae90;line-height:1.5}#doll .dl-skills b{color:#f1e6d0}#doll .fg-hint{font-size:12px;color:var(--gold);text-align:center;padding:6px;border:1px dashed #6b5a3c;border-radius:8px;margin-bottom:8px}
@media (max-width:900px){#doll .dl-grid{grid-template-columns:1fr 1fr}#doll .dl-figure{display:none}#doll .dl-col.mid{grid-column:1/3}}
@media (max-width:640px){#doll .dl-grid{grid-template-columns:1fr}#doll .dl-col.mid{grid-column:auto}}
@media (max-width:700px){#hud .bars{width:190px}#hud .bar{height:16px}#hud .res{font-size:15px;gap:10px}#hud .res .gold{font-size:14px}#hud #xpline{font-size:12px}}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
const D={open:false,timer:0,html:'',hint:false};
const SNAME={weapon:'weapon',armor:'armor',charm:'charm',amulet:'amulet',familiar:'familiar'};
function slotPanel(s){ const it=gear[s], F=Meta.forge; let inner;
  if(!it) inner='<div class="sl-head"><span class="ic">'+SICON[s]+'</span><div><div class="em">no '+SNAME[s]+' yet</div><button class="dl-mini" data-act="bag">🎒 pick one from the locker</button></div></div>';
  else { const head='<div class="sl-head"><span class="ic">'+SICON[s]+'</span><div><div class="nm" style="color:'+RCSS[it.rarity]+'"><span class="tier">T'+(it.tier||tierOf(it.lvl))+'</span><span class="tier">'+RNAME[it.rarity].toUpperCase()+'</span>'+it.name+'</div><div class="st">'+statStr(it)+'</div></div></div>';
    if(!F) inner=head; else { const gold=Meta.gold(), left=F.left(it), cost=F.cost(it);
      const rows=F.keys(it).map(k=>{ const c=F.can(it,k), v=it.stats[k]||0, pts=(it.ups&&it.ups[k])|0; const btn=n=>'<button data-act="up" data-slot="'+s+'" data-key="'+k+'" data-n="'+n+'"'+(c.ok?'':' disabled title="'+c.why+'"')+'>+'+n+'</button>';
        return '<div class="fg-row'+(pts?' on':'')+'"><span class="fg-l">'+F.label(k)+'<small>+'+F.inc[k]+(k==='fproj'?'':/dmg|hp|regen/.test(k)?'':'%')+' per upgrade'+(pts?' · '+pts+' put in':'')+(c.ok||!left?'':' · '+c.why)+'</small></span><span class="fg-v">'+(v?F.fmt(k,v):'—')+'</span><span class="fg-btns">'+btn(1)+btn(5)+btn(25)+'</span></div>'; }).join('');
      inner=head+'<div class="fg-meter"><i style="width:'+Math.round(100*F.used(it)/F.max(it))+'%"></i><span>'+F.used(it)+' / '+F.max(it)+' upgrades'+(left?'':' · MAXED')+'</span></div>'+
        (left?'<div class="fg-cost">next upgrade <b>'+Meta.fmtG(cost)+' ●</b>'+(gold<cost?' · <span class="no">need '+Meta.fmtG(cost-gold)+' more</span>':'')+'</div>':'')+rows; } }
  return '<div class="dl-slot '+s+'" data-slot="'+s+'">'+inner+'</div>'; }
function statCard(l,v,big){ return '<div class="dl-stat'+(big?' big':'')+'"><i>'+l+'</i><b>'+v+'</b></div>'; }
function build(){ const stt=window.__feel?window.__feel.stats():{dmg:heroDmg(),aps:+(1/swingDur()).toFixed(2),magic:0,dps:Math.round(heroDmg()/swingDur()),armor:heroStat('def'),tow:Math.round(((1+heroStat('tow')/100)*heroMult('tow')-1)*100),hp:Math.round(hero.hp)+'/'+hero.max};
  const M=Meta, pts=M.points?M.points():0, lvl=M.level?M.level():1, xp=M.xp?M.xp():0, next=M.xpToNext?M.xpToNext(lvl):100;
  const skills=(M.SKILLS||[]).filter(s=>M.skill(s.id)>0).map(s=>'<b>'+s.name+'</b> '+M.skill(s.id)+' ('+M.skillValue(s.id)+')').join(' · ')||'none yet';
  return '<div class="dl-box"><button class="dl-x" data-act="close">✕</button><h1>THE WARDEN</h1><div class="dl-sub">LEVEL '+lvl+' · '+xp.toLocaleString('en-US')+' / '+next.toLocaleString('en-US')+' XP · <b>● '+M.fmtG(M.gold())+' gold</b> to forge with'+(pts?' · <span style="color:var(--gold)">✦ '+pts+' skill point'+(pts===1?'':'s')+' waiting at the trainer</span>':'')+'</div>'+
    (D.hint&&Meta.forge?'<div class="fg-hint">🔨 The anvil: buy upgrades for it with gold, straight into each piece of gear below (up to its allowance)</div>':'')+
    '<div class="dl-strip">'+statCard('💥 DPS',stt.dps,true)+statCard('⚔ Damage',stt.dmg)+statCard('⚡ Swings / s',(+stt.aps).toFixed(2))+statCard('✨ Magic (familiar)',stt.magic||'—')+statCard('🛡 Armor',stt.armor+'%')+statCard('🏹 Defenses',(stt.tow>=0?'+':'')+stt.tow+'%')+statCard('❤ Health',stt.hp)+'</div>'+
    '<div class="dl-grid"><div class="dl-col">'+slotPanel('weapon')+slotPanel('familiar')+'</div><div class="dl-col mid"><div class="dl-figure"><div class="dl-gnome"><div class="dl-hat"></div><div class="dl-head"></div><div class="dl-beard"></div><div class="dl-body"></div><div class="dl-legs"></div></div></div>'+slotPanel('armor')+'</div><div class="dl-col">'+slotPanel('charm')+slotPanel('amulet')+'</div></div>'+
    '<div class="dl-foot"><span class="dl-skills">Trainer skills (one point per level): '+skills+'</span><span>Gold buys upgrades that stay on the item · skill points are spent at the trainer · <b>Tab</b> closes</span><button class="dl-btn" data-act="tavern">🍺 TAVERN</button></div></div>'; }
let el=null;
function ensure(){ if(el) return; el=document.createElement('div'); el.id='doll'; el.className='screen hide'; document.body.appendChild(el);
  el.addEventListener('click',e=>{ const a=e.target.closest('[data-act]'); if(!a){ if(e.target===el) close(); return; } const act=a.dataset.act;
    if(act==='close') close(); else if(act==='tavern'||act==='bag'){ close(); Meta.open(); if(typeof Tavern!=='undefined'&&Tavern.tab) Tavern.tab('bag'); }
    else if(act==='up'){ const it=gear[a.dataset.slot]; if(!it||!Meta.forge) return; const n=Meta.forge.upgrade(it.id,a.dataset.key,+a.dataset.n||1); if(!n){ const c=Meta.forge.can(it,a.dataset.key); toast(c.why||'cannot upgrade that'); } render(); } });
  const b=document.createElement('button'); b.id='dollbtn'; b.title='Character sheet & forge (Tab)'; b.textContent='👤'; b.addEventListener('click',open); $('hud').appendChild(b); }
function render(){ const h=build(); if(h!==D.html){ D.html=h; el.innerHTML=h; } }
function open(hint){ ensure(); if(D.open||S.phase==='start'||(typeof Tavern!=='undefined'&&Tavern&&Tavern.isOpen())) return false; D.open=true; D.hint=hint===true; render(); el.classList.remove('hide'); if(document.exitPointerLock) document.exitPointerLock(); document.body.classList.remove('play'); for(const k in K) K[k]=0; D.timer=setInterval(render,250); return true; }
function close(){ if(!D.open) return false; D.open=false; el.classList.add('hide'); clearInterval(D.timer); D.timer=0; return true; }
function toggle(){ return D.open?close():open(); }
{ const prev=Meta.isOpen; Meta.isOpen=()=>D.open||!!prev(); }
addEventListener('keydown',e=>{ if(e.code==='Tab'||e.code==='KeyC'){ if(S.phase==='start'||S.phase==='dead') return; if(e.code==='Tab') e.preventDefault(); if(typeof Tavern!=='undefined'&&Tavern&&Tavern.isOpen()) return; toggle(); e.stopImmediatePropagation(); return; }
  if(D.open){ if(e.code==='Escape'||e.code==='KeyI'||e.code==='KeyB'){ e.preventDefault(); close(); } e.stopImmediatePropagation(); } },true);
ensure();
window.__doll={open,close,isOpen:()=>D.open,html:()=>el?el.innerHTML:'',forge:()=>null,setForge:()=>{}};
})();
