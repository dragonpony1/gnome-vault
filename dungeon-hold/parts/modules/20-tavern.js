// ===== 20-tavern.js — the tavern overlay: bag · shop · skills · run summary. UI only; every rule lives in Meta (10-meta.js) =====
// Same scope as game.js. Injects its own <style> + <div id="tavern"> at load. Opened by Meta.open() (keys I/B, 🎒, #tavbtn), closed by ✕ / Escape / DEFEND THE HALL.
const TV={open:false,sum:false,tab:'bag',sel:null,built:{bag:-1,shop:-1,skills:-1},head:{},gold:{shown:0,from:0,to:0,t:0,dur:.6,tick:0,dir:0},lastT:0,msg:'',msgT:0,raf:0};
const TV_TABS=[['bag','🎒 BAG'],['shop','🛒 SHOP'],['skills','✦ SKILLS']];
const tvEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tvG=n=>Math.round(n).toLocaleString('en-US');
const TVCSS=`
#tavern{z-index:20;padding:0;background:#0b0712f4}
.tv-box{position:relative;display:flex;flex-direction:column;width:100%;min-width:0;max-width:980px;height:100%;background:linear-gradient(#1c1424,#120c1a);border:2px solid #6b5a3c;box-shadow:0 8px 40px #000;text-align:left;overflow:hidden;box-sizing:border-box}
.tv-head{display:flex;align-items:center;gap:10px;padding:8px 12px 6px;padding-top:calc(8px + env(safe-area-inset-top,0px));border-bottom:1px solid #3a2a44}
.tv-title{flex:1;min-width:0;font-size:19px;font-weight:bold;letter-spacing:3px;color:var(--gold);text-shadow:0 2px 0 #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-gold{font-size:18px;font-weight:bold;color:#ffd060;text-shadow:0 2px 2px #000;white-space:nowrap;transition:transform .12s,color .2s;transform-origin:right center}
.tv-gold.up{color:#9dff9d;transform:scale(1.14)} .tv-gold.dn{color:#ff9d9d;transform:scale(1.08)}
.tv-x{width:44px;height:44px;flex-shrink:0;border-radius:8px;background:#2a1f33;border:2px solid #6b5a3c;color:#fff;font:bold 18px Georgia,serif;cursor:pointer;box-shadow:0 2px 0 #000}
.tv-lvl{display:flex;align-items:center;gap:8px;padding:6px 12px 4px;font-size:12px;color:#c9b8a0;white-space:nowrap}
.tv-lvl b{color:#fff;font-size:13px}
.tv-xp{flex:1;min-width:60px;height:10px;background:#2a1f33;border:1px solid #0e0a14;border-radius:4px;overflow:hidden}
.tv-xp i{display:block;height:100%;width:0;background:var(--cyan);transition:width .3s}
.tv-pts{background:#7a2a2e;border:1px solid var(--gold);border-radius:10px;padding:1px 8px;color:#fff;font-weight:bold} .tv-pts:empty{display:none}
.tv-tabs{display:flex;gap:6px;padding:4px 12px 0}
.tv-tabs button{flex:1;min-height:44px;min-width:0;background:#1c1424;border:2px solid #6b5a3c;border-bottom:none;border-radius:8px 8px 0 0;color:#c9b8a0;font:bold 13px Georgia,serif;letter-spacing:2px;cursor:pointer;white-space:nowrap;overflow:hidden}
.tv-tabs button.on{background:linear-gradient(#5a4066,#2a1c34);color:var(--gold);border-color:var(--gold)}
.tv-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:10px 12px 90px;border-top:2px solid #6b5a3c;background:#0b071266}
.tv-pane{display:none} .tv-pane.on{display:block}
.tv-sub{display:flex;align-items:center;gap:8px;margin:2px 0 8px;font-size:13px;letter-spacing:2px;color:var(--gold);font-weight:bold;white-space:nowrap}
.tv-sub .tv-n{color:#c9b8a0;letter-spacing:0;font-weight:normal;font-size:12px;min-width:0;overflow:hidden;text-overflow:ellipsis} .tv-sub .sp{flex:1}
.tv-btn{min-height:44px;padding:6px 14px;background:linear-gradient(#3a2a44,#1c1424);border:2px solid #6b5a3c;border-radius:8px;color:#fff;font:bold 13px Georgia,serif;letter-spacing:1px;cursor:pointer;box-shadow:0 2px 0 #000;white-space:nowrap}
.tv-btn.hot{background:linear-gradient(#7a2a2e,#3e1416);border-color:var(--gold)}
.tv-btn:disabled{opacity:.45;cursor:default;box-shadow:none}
.tv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.tv-card{position:relative;display:flex;flex-direction:column;min-height:44px;padding:7px 8px 7px 40px;background:linear-gradient(#2a1f33,#1c1424);border:2px solid #4a3a54;border-radius:8px;cursor:pointer;overflow:hidden;box-sizing:border-box}
.tv-card.sel{border-color:var(--gold);box-shadow:0 0 10px #e8b94a66}
.tv-card .ic{position:absolute;left:8px;top:8px;font-size:22px;line-height:26px}
.tv-card .nm{font-weight:bold;font-size:13px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;line-height:1.3}
.tv-card .st{font-size:11px;color:#bfae90;line-height:1.35}
.tv-card .tb{display:inline-block;vertical-align:1px;margin-right:5px;font-size:11px;font-weight:bold;color:var(--gold);border:1px solid var(--gold);border-radius:4px;padding:0 4px;line-height:14px;background:#0b0712}
.tv-card .em{color:#7d7286;font-style:italic;font-size:12px;line-height:30px}
.tv-card .sl{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8f8470}
.tv-card .vs{font-size:11px;font-weight:bold;margin-top:auto;padding-top:3px}
.tv-card .tv-btn{display:block;width:100%;margin-top:6px;min-height:44px;box-sizing:border-box;padding:6px 4px;letter-spacing:0;overflow:hidden;text-overflow:ellipsis}
.tv-card .why{font-size:11px;color:#ff9d9d;text-align:center;margin-top:3px}
.tv-body.det{padding-bottom:260px}
.tv-eq .tv-card{margin-bottom:6px}
.tv-bag2{display:grid;grid-template-columns:1fr;gap:12px}
.tv-empty{color:#7d7286;font-style:italic;padding:16px 4px;text-align:center;font-size:13px}
.up{color:#9dff9d} .dn{color:#ff9d9d}
.tv-box{--tvfoot:60px}
.tv-detail{position:absolute;left:0;right:0;bottom:calc(var(--tvfoot) + env(safe-area-inset-bottom,0px));background:linear-gradient(#3a2a44,#1c1424);border-top:2px solid var(--gold);box-shadow:0 -6px 24px #000;padding:10px 12px;z-index:2;max-height:60%;overflow:auto;box-sizing:border-box}
.tv-detail .dh{display:flex;align-items:flex-start;gap:8px}
.tv-detail .dn2{flex:1;min-width:0;font-weight:bold;font-size:15px;line-height:1.3;overflow-wrap:anywhere}
.tv-detail .dm{font-size:11px;color:#bfae90;letter-spacing:1px}
.tv-detail .dl{display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0;font-size:13px}
.tv-detail .dl span{font-size:12px;margin-left:4px}
.tv-detail .db{display:flex;gap:8px;flex-wrap:wrap} .tv-detail .db .tv-btn{flex:1;min-height:44px}
.tv-foot{position:relative;display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid #3a2a44;background:#120c1a}
.tv-msgw{position:sticky;top:0;height:0;z-index:3;pointer-events:none}
.tv-msg{position:absolute;left:0;right:0;top:2px;font-size:13px;color:#ffd060;text-align:center;line-height:1.3;padding:6px 10px;background:#120c1aee;border:1px solid #6b5a3c;border-radius:8px;box-shadow:0 2px 8px #000;opacity:0;transition:opacity .25s} .tv-msg.on{opacity:1}
.tv-defend{min-height:44px;font-size:14px}
.tv-sk{display:flex;align-items:center;gap:8px;padding:6px 8px;border:2px solid #4a3a54;border-radius:8px;margin-bottom:6px;background:linear-gradient(#2a1f33,#1c1424)}
.tv-sk .in{flex:1;min-width:0} .tv-sk .nm{font-weight:bold;font-size:14px} .tv-sk .wh{font-size:11px;color:#bfae90;line-height:1.3} .tv-sk .cv{font-size:12px;color:#ffd060}
.tv-pips{display:flex;gap:2px;flex-shrink:0} .tv-pips i{width:7px;height:16px;background:#2a1f33;border:1px solid #6b5a3c;border-radius:2px} .tv-pips i.on{background:var(--gold);border-color:var(--gold)}
.tv-plus{width:44px;height:44px;min-height:44px;padding:0;font-size:24px;flex-shrink:0}
.tv-sum{position:absolute;inset:0;background:radial-gradient(ellipse at center,#1c1424 0%,#0b0712 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px;overflow:auto;box-sizing:border-box}
.tv-sum h1{font-size:40px;letter-spacing:6px;color:var(--gold);margin:0;text-shadow:0 0 30px #e8b94a55,0 4px 0 #000}
.tv-sum h2{font-size:15px;letter-spacing:4px;color:#c9b8a0;margin:6px 0 4px;font-weight:normal}
.tv-stats{display:grid;grid-template-columns:repeat(2,minmax(130px,1fr));gap:8px;margin:14px 0;width:100%;max-width:420px}
.tv-stat{background:#1c1424;border:2px solid #6b5a3c;border-radius:8px;padding:8px} .tv-stat b{display:block;font-size:24px;color:#ffd060;text-shadow:0 2px 0 #000} .tv-stat span{font-size:11px;letter-spacing:2px;color:#c9b8a0} .tv-stat small{display:block;font-size:11px;color:#ff9d9d;letter-spacing:0}
.tv-drops{font-size:12px;color:#c9b8a0;max-width:420px;line-height:1.6;margin:0 0 6px}
.tv-sum .db{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px} .tv-sum .db .tv-btn{min-height:48px;font-size:15px;padding:8px 22px}
@media (min-width:701px){#tavern{padding:0 16px}.tv-box{height:min(92vh,800px);border-radius:12px}.tv-bag2{grid-template-columns:260px 1fr;align-items:start}.tv-title{font-size:22px}.tv-tabs button{font-size:14px}.tv-grid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}.tv-detail{left:auto;right:12px;bottom:70px;width:420px;border:2px solid var(--gold);border-radius:10px}}
@media (max-width:700px){.tv-lvl .tv-best{display:none}.tv-title{font-size:17px;letter-spacing:1px}.tv-gold{font-size:17px}}
@media (max-height:500px){.tv-box{--tvfoot:52px}.tv-head{padding:3px 12px;padding-top:calc(3px + env(safe-area-inset-top,0px))}.tv-title{font-size:15px;letter-spacing:1px}.tv-gold{font-size:15px}.tv-x{width:36px;height:36px;font-size:15px}.tv-lvl{padding:2px 12px;font-size:11px}.tv-tabs button{min-height:36px;font-size:12px}.tv-body{padding:8px 12px 40px}.tv-foot{padding:4px 12px;padding-bottom:calc(4px + env(safe-area-inset-bottom,0px))}.tv-bag2{grid-template-columns:1fr}.tv-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}.tv-detail{left:auto;right:0;width:min(420px,50%);bottom:calc(var(--tvfoot) + env(safe-area-inset-bottom,0px));max-height:none;border:none;border-left:2px solid var(--gold);border-top:2px solid var(--gold);border-radius:8px 0 0 0;box-shadow:-6px 0 24px #000}.tv-body.det{padding-bottom:40px;padding-right:calc(min(420px,50%) + 8px)}.tv-sum h1{font-size:26px;letter-spacing:3px}.tv-sum h2{margin:2px 0}.tv-stats{margin:6px 0;gap:6px}.tv-stat{padding:4px}.tv-stat b{font-size:18px}.tv-drops{font-size:11px;line-height:1.4}}`;   // landscape phone: the detail panel is a right column from the top of the list to the footer, so the list stays in view
function tvBuildDom(){ if($('tavern')) return; const s=document.createElement('style'); s.id='tv-css'; s.textContent=TVCSS; document.head.appendChild(s);
  const d=document.createElement('div'); d.id='tavern'; d.className='screen hide';
  d.innerHTML='<div class="tv-box" id="tv-box"><div class="tv-head"><div class="tv-title">🍺 THE TAVERN</div><div class="tv-gold" id="tv-gold">● <span id="tv-goldn">0</span> gold</div><button class="tv-x" id="tv-close" data-act="close" title="Close (Esc)">✕</button></div>'
   +'<div class="tv-lvl"><b id="tv-lv">Lv 1</b><div class="tv-xp"><i id="tv-xpi"></i></div><span id="tv-xpt">0 / 100 xp</span><span class="tv-pts" id="tv-pts"></span><span class="tv-best" id="tv-best"></span></div>'
   +'<div class="tv-tabs">'+TV_TABS.map(([k,l])=>'<button data-act="tab" data-tab="'+k+'" id="tv-tab-'+k+'">'+l+'</button>').join('')+'</div>'
   +'<div class="tv-body" id="tv-body"><div class="tv-msgw"><div class="tv-msg" id="tv-msg"></div></div><div class="tv-pane" id="tv-bag"></div><div class="tv-pane" id="tv-shop"></div><div class="tv-pane" id="tv-skills"></div></div>'
   +'<div class="tv-detail hide" id="tv-detail"></div>'
   +'<div class="tv-foot"><button class="tv-btn hot tv-defend" id="tv-defend" data-act="defend">⚔ DEFEND THE HALL</button></div></div>'
   +'<div class="tv-sum hide" id="tv-sum"></div>';
  document.body.appendChild(d); d.addEventListener('click',tvClick); }
function tvSay(t){ TV.msg=t; TV.msgT=2.6; const el=$('tv-msg'); el.textContent=t; el.classList.add('on'); }
function tvClearMsg(){ TV.msg=''; TV.msgT=0; const el=$('tv-msg'); if(el) el.classList.remove('on'); }   // a line said just before closing must not greet the next visit
// while the overlay is up the page behind it is inert (no Tab to #wavebtn, no Enter on the button that opened it) and nothing keeps focus
function tvShield(on){ for(const id of ['hud','start','dead']){ const el=$(id); if(el) el.inert=on; } const a=document.activeElement; if(a&&a!==document.body&&a.blur) a.blur(); }
// ---- cards ----
function tvTier(it){ return '<span class="tb">T'+(it.tier||tierOf(it.lvl||1))+'</span>'; }
// the compare label and the Sell junk count agree: Meta.isJunk is the one rule. A Common that still beats the worn item is labelled junk too, so the count never surprises
function tvVs(it){ const eq=gear[it.slot]; if(!eq) return '<span class="vs up">new slot</span>'; if(eq.id===it.id) return ''; const d=Math.round((it.score-eq.score)*10)/10, j=Meta.isJunk(it);
  return d<0?'<span class="vs dn">▼ '+d+' vs worn</span>':j?'<span class="vs" style="color:#8f8470">junk · '+(d>0?'▲ +'+d:'=')+' vs worn</span>':d>0?'<span class="vs up">▲ +'+d+' vs worn</span>':'<span class="vs">= worn</span>'; }
function tvCard(it,from,extra){ const sel=TV.sel&&TV.sel.id===it.id; return '<div class="tv-card'+(sel?' sel':'')+'" data-act="sel" data-id="'+it.id+'" data-from="'+from+'"><span class="ic">'+SICON[it.slot]+'</span><div class="nm" style="color:'+RCSS[it.rarity]+'">'+tvTier(it)+tvEsc(it.name)+'</div><div class="st">'+tvEsc(statStr(it))+'</div>'+(extra||'')+'</div>'; }
function tvEmptyCard(slot){ return '<div class="tv-card" data-act="sel" data-id="" data-from="eq" data-slot="'+slot+'"><span class="ic">'+SICON[slot]+'</span><div class="em">no '+slot+'</div></div>'; }
function tvDeltas(it){ const eq=gear[it.slot]; const keys=Object.keys(it.stats); if(eq&&eq.id!==it.id) for(const k in eq.stats) if(!keys.includes(k)) keys.push(k);
  return keys.map(k=>{ const v=it.stats[k]||0, e=(eq&&eq.id!==it.id)?(eq.stats[k]||0):0; const d=Math.round((v-e)*10)/10; const dl=(!eq||eq.id===it.id)?'':d>0?'<span class="up">+'+d+'</span>':d<0?'<span class="dn">'+d+'</span>':'<span style="color:#8f8470">=</span>'; return '<div>'+tvEsc(STATL[k](v))+dl+'</div>'; }).join(''); }
// ---- panes ----
function tvRenderBag(){ const bag=Meta.bag(); let eqH='<div class="tv-sub">EQUIPPED</div>'; for(const s of SLOTS){ const it=gear[s]; eqH+=it?tvCard(it,'eq'):tvEmptyCard(s); }
  const junk=bag.filter(Meta.isJunk).length;
  let bagH='<div class="tv-sub">BAG <span class="tv-n">'+bag.length+'/'+Meta.BAG_CAP+'</span><span class="sp"></span><button class="tv-btn" data-act="selljunk" id="tv-selljunk"'+(junk?'':' disabled')+'>Sell junk'+(junk?' ('+junk+')':'')+'</button></div>';
  bagH+=bag.length?'<div class="tv-grid">'+bag.map(it=>tvCard(it,'bag',tvVs(it))).join('')+'</div>':'<div class="tv-empty">Your bag is empty. The horde drops loot — walk over it to bag it.</div>';
  $('tv-bag').innerHTML='<div class="tv-bag2"><div class="tv-eq">'+eqH+'</div><div>'+bagH+'</div></div>'; }
function tvRenderShop(){ const st=Meta.stock(), gold=Meta.gold(); let h='<div class="tv-sub"><span class="tv-n">'+tvEsc(Meta.tierLine())+'</span><span class="sp"></span><button class="tv-btn" data-act="restock" id="tv-restock"'+(gold>=Meta.restockCost()?'':' disabled')+'>Restock ('+tvG(Meta.restockCost())+' gold)</button></div>';
  h+=st.length?'<div class="tv-grid">'+st.map((it,i)=>{ const c=Meta.canBuy(i), p=Meta.buyPrice(it); return tvCard(it,'shop',tvVs(it)+'<button class="tv-btn hot" data-act="buy" data-i="'+i+'"'+(c.ok?'':' disabled')+'>Buy ('+tvG(p)+' gold)</button>'+(c.ok?'':'<div class="why">'+tvEsc(c.why)+'</div>')); }).join('')+'</div>':'<div class="tv-empty">Sold out — restock to see new wares.</div>';
  $('tv-shop').innerHTML=h; }
function tvRenderSkills(){ const p=Meta.points(); let h='<div class="tv-sub">SKILLS <span class="tv-n">'+(p?p+' skill point'+(p===1?'':'s')+' to spend · one per level':'no skill points — one per level, hold waves for xp')+'</span><span class="sp"></span><button class="tv-btn" data-act="respec" id="tv-respec"'+(Meta.canRespec()?'':' disabled')+'>Respec ('+tvG(Meta.respecCost())+' gold)</button></div>';
  for(const s of Meta.SKILLS){ const v=Meta.skill(s.id); let pips=''; for(let i=0;i<Meta.SKILL_MAX;i++) pips+='<i'+(i<v?' class="on"':'')+'></i>';
    h+='<div class="tv-sk" id="tv-sk-'+s.id+'"><div class="in"><div class="nm">'+s.name+'</div><div class="wh">'+s.what+' · +'+Math.round(s.per*100)+'% per point</div><div class="cv">'+(v?tvEsc(Meta.skillValue(s.id)):'—')+'</div></div><div class="tv-pips">'+pips+'</div><button class="tv-btn tv-plus" data-act="spend" data-id="'+s.id+'"'+(p>0&&v<Meta.SKILL_MAX?'':' disabled')+' title="Spend a point">+</button></div>'; }
  $('tv-skills').innerHTML=h; }
function tvRenderDetail(){ const el=$('tv-detail'), body=$('tv-body'); const s=TV.sel; if(!s){ el.classList.add('hide'); body.classList.remove('det'); return; }
  let it=null; if(s.from==='eq') it=gear[s.slot]; else if(s.from==='bag') it=Meta.bag().find(b=>b.id===s.id); else if(s.from==='shop') it=Meta.stock().find(b=>b.id===s.id);
  if(!it){ TV.sel=null; el.classList.add('hide'); body.classList.remove('det'); return; }
  const eq=gear[it.slot], worn=s.from==='eq';
  let b=''; if(worn) b='<button class="tv-btn" data-act="unequip" data-slot="'+it.slot+'"'+(Meta.bagFull()?' disabled':'')+'>Unequip</button>';
  else if(s.from==='bag') b='<button class="tv-btn hot" data-act="equip" data-id="'+it.id+'">Equip</button><button class="tv-btn" data-act="sell" data-id="'+it.id+'">Sell ('+tvG(it.value)+' gold)</button>';
  else { const c=Meta.canBuy(Meta.stock().indexOf(it)); b='<button class="tv-btn hot" data-act="buy" data-i="'+Meta.stock().indexOf(it)+'"'+(c.ok?'':' disabled')+'>Buy ('+tvG(Meta.buyPrice(it))+' gold)</button>'; }
  el.innerHTML='<div class="dh"><span class="ic" style="font-size:24px">'+SICON[it.slot]+'</span><div class="dn2" style="color:'+RCSS[it.rarity]+'">'+tvEsc(it.name)+'<div class="dm">'+RNAME[it.rarity].toUpperCase()+' '+it.slot.toUpperCase()+' · TIER '+it.tier+' · lvl '+it.lvl+(worn?' · WORN':eq?' · vs <span style="color:'+RCSS[eq.rarity]+'">'+tvEsc(eq.name)+'</span>':' · nothing worn in this slot')+'</div></div><button class="tv-x" data-act="detclose" style="font-size:14px">✕</button></div>'
   +'<div class="dl">'+tvDeltas(it)+'</div><div class="dm" style="margin-bottom:8px">sells for <b style="color:#ffd060">'+tvG(it.value)+' gold</b>'+(s.from==='shop'?' · costs <b style="color:#ffd060">'+tvG(Meta.buyPrice(it))+' gold</b>':'')+'</div><div class="db">'+b+'</div>';
  const side=innerHeight<=500; el.style.top=side?body.offsetTop+'px':''; el.classList.remove('hide'); body.classList.add('det');
  // the panel floats over the bottom of the list (beside it in landscape): nudge the body so the card it describes stays in view
  const card=body.querySelector('.tv-card.sel'); if(card){ const cr=card.getBoundingClientRect(), dr=el.getBoundingClientRect(), br=body.getBoundingClientRect(); const top=side?br.bottom:Math.min(dr.top,br.bottom); if(cr.bottom>top-6) body.scrollTop+=cr.bottom-top+10; else if(cr.top<br.top) body.scrollTop-=br.top-cr.top+10; } }
function tvRenderTab(force){ const v=Meta.version(); const t=TV.tab; if(force||TV.built[t]!==v){ TV.built[t]=v; if(t==='bag') tvRenderBag(); else if(t==='shop') tvRenderShop(); else tvRenderSkills(); tvRenderDetail(); }
  TV_TABS.forEach(([k])=>{ $('tv-tab-'+k).classList.toggle('on',k===t); $('tv-'+k).classList.toggle('on',k===t); }); }
function tvRenderHead(){ const h=TV.head, L=Meta.level(), x=Meta.xp(), n=Meta.xpToNext(L), p=Meta.points(), b=Meta.best();
  const lv='Lv '+L; if(h.lv!==lv){ h.lv=lv; $('tv-lv').textContent=lv; } const xt=tvG(x)+' / '+tvG(n)+' xp'; if(h.xt!==xt){ h.xt=xt; $('tv-xpt').textContent=xt; $('tv-xpi').style.width=Math.round(100*x/n)+'%'; }
  const pt=p?'✦ '+p+' skill point'+(p===1?'':'s'):''; if(h.pt!==pt){ h.pt=pt; $('tv-pts').textContent=pt; } const bt=b?'Best wave '+b:'No runs yet'; if(h.bt!==bt){ h.bt=bt; $('tv-best').textContent=bt; }
  const ph=S.phase, dl=ph==='start'?'⚔ DEFEND THE HALL':ph==='dead'?'⚔ DEFEND THE HALL AGAIN':'⚔ BACK TO THE HALL'; if(h.dl!==dl){ h.dl=dl; $('tv-defend').textContent=dl; } }
// the feedback line floats at the top of the list (sticky, no layout space) so it never hides the detail panel or the DEFEND button and can wrap to two lines on a phone
// ---- the gold counter: counts up/down over ~0.6 s with coin ticks ----
function tvGoldTick(dt){ const g=TV.gold, now=Meta.gold(); if(now!==g.to){ g.from=g.shown; g.to=now; g.t=0; g.tick=0; g.dir=now>g.shown?1:-1; g.dur=.6; $('tv-gold').classList.toggle('up',g.dir>0); $('tv-gold').classList.toggle('dn',g.dir<0); }
  if(g.shown===g.to){ if(g.flash>0){ g.flash-=dt; if(g.flash<=0) $('tv-gold').classList.remove('up','dn'); } return; }
  g.t+=dt; const k=Math.min(1,g.t/g.dur), e=1-Math.pow(1-k,3); const v=k>=1?g.to:Math.round(g.from+(g.to-g.from)*e);
  if(v!==g.shown){ g.shown=v; $('tv-goldn').textContent=tvG(v); g.tick-=dt; if(g.tick<=0){ g.tick=.05; if(!SILENT) beep(g.dir>0?1100+700*k:900-300*k,.045,'square',.028,g.dir>0?260:-160); } }
  if(k>=1){ g.shown=g.to; g.flash=.2; $('tv-goldn').textContent=tvG(g.to); if(!SILENT) beep(g.dir>0?1568:660,.16,'sine',.05,g.dir>0?300:-120); } }
// one loop, ever: open()/summary() only arm a frame when none is pending, so close+open inside a frame (key auto-repeat) or the crystal falling with the tavern up cannot double the tick rate
function tvLoop(){ if(!TV.raf) TV.raf=requestAnimationFrame(tvFrame); }
function tvFrame(now){ TV.raf=0; if(!TV.open) return; tvLoop(); const dt=Math.min(1,(now-TV.lastT)/1000); TV.lastT=now; if(TV.sum) return;   // real elapsed time: on a slow frame the counter just lands
  tvGoldTick(dt); tvRenderHead(); tvRenderTab(false); if(TV.msgT>0){ TV.msgT-=dt; if(TV.msgT<=0) $('tv-msg').classList.remove('on'); } }
// ---- actions ----
function tvClick(e){ const t=e.target.closest('[data-act]'); if(!t||t.disabled) return; const a=t.dataset.act, D=t.dataset;
  if(a==='close') Tavern.close(); else if(a==='tab') Tavern.tab(D.tab); else if(a==='defend') tvDefend(); else if(a==='detclose'){ TV.sel=null; tvRenderTab(true); }
  else if(a==='sel'){ if(TV.sel&&TV.sel.id===D.id&&TV.sel.from===D.from) TV.sel=null;
    else if(D.from==='eq'){ const w=SLOTS.find(s=>gear[s]&&gear[s].id===D.id); if(w) TV.sel={id:D.id,from:'eq',slot:w}; else { TV.sel=null; tvSay('Nothing worn there yet — equip something from your bag'); } }
    else TV.sel={id:D.id,from:D.from}; tvRenderTab(true); }
  else if(a==='equip'){ const it=Meta.bag().find(b=>b.id===D.id); if(it&&Meta.equip(D.id)){ tvSay('Equipped '+it.name); TV.sel={id:it.id,from:'eq',slot:it.slot}; } tvRenderTab(true); }
  else if(a==='unequip'){ if(Meta.unequip(D.slot)) tvSay('Unequipped'); TV.sel=null; tvRenderTab(true); }
  else if(a==='sell'){ const it=Meta.bag().find(b=>b.id===D.id); const g=Meta.sell(D.id); if(g) tvSay('Sold '+(it?it.name:'item')+' for '+tvG(g)+' gold'); TV.sel=null; tvRenderTab(true); }
  else if(a==='selljunk'){ const r=Meta.sellJunk(); tvSay(r.n?'Sold '+r.n+' item'+(r.n===1?'':'s')+' for '+tvG(r.gold)+' gold':'Nothing worth selling'); TV.sel=null; tvRenderTab(true); }
  else if(a==='buy'){ const i=+D.i, it=Meta.stock()[i], c=Meta.canBuy(i); if(!c.ok) tvSay(c.why); else if(Meta.buy(i)) tvSay('Bought '+it.name); TV.sel=null; tvRenderTab(true); }
  else if(a==='restock'){ if(Meta.restock()) tvSay('Fresh stock on the table'); else tvSay('Need '+tvG(Meta.restockCost())+' gold to restock'); TV.sel=null; tvRenderTab(true); }
  else if(a==='spend'){ const s=Meta.SKILLS.find(s=>s.id===D.id); if(Meta.spend(D.id)) tvSay(s.name+' — '+Meta.skillValue(D.id)); else tvSay(Meta.points()?'That skill is maxed':'No skill points — hold waves to earn xp'); tvRenderTab(true); }
  else if(a==='respec'){ if(Meta.respec()) tvSay('Points refunded'); else tvSay(Meta.spentPoints()?'Need '+tvG(Meta.respecCost())+' gold to respec':'Nothing to refund'); tvRenderTab(true); }
  else if(a==='totavern'){ TV.sum=false; tvClearMsg(); $('tv-sum').classList.add('hide'); $('tv-box').classList.remove('hide'); const d=TV.sumData; TV.gold.shown=TV.gold.to=Math.max(0,Meta.gold()-(d?(d.payout||0):0)); $('tv-goldn').textContent=tvG(TV.gold.shown); Tavern.tab('bag'); tvRenderHead(); }   // count up only the end-of-run payout: wave pay and sells already ticked up on screen during the run
  else if(a==='again') location.reload(); else if(a==='nextmap'){ if(window.__campaign) window.__campaign.next(); } }
function tvDefend(){ if(S.phase==='start'){ Tavern.close(); $('playbtn').click(); } else if(S.phase==='dead') location.reload(); else Tavern.close(); }
const Tavern={
  open(opts){ tvBuildDom(); if(TV.open&&!TV.sum) return false; TV.open=true; TV.sum=false; TV.sel=null; TV.lastT=performance.now(); tvClearMsg(); tvShield(true); $('tv-sum').classList.add('hide'); $('tv-box').classList.remove('hide'); $('tavern').classList.remove('hide');
    if(document.pointerLockElement&&document.exitPointerLock) document.exitPointerLock(); const g=Meta.gold(); TV.gold.shown=TV.gold.to=(opts&&typeof opts.from==='number')?opts.from:g; $('tv-goldn').textContent=tvG(TV.gold.shown); $('tv-gold').classList.remove('up','dn');
    TV.built={bag:-1,shop:-1,skills:-1}; TV.head={}; tvRenderHead(); tvRenderTab(true); tvLoop(); return true; },
  close(){ if(!TV.open) return false; TV.open=false; TV.sum=false; TV.sel=null; $('tavern').classList.add('hide'); $('tv-detail').classList.add('hide'); tvShield(false); if(S.phase==='dead'||S.phase==='won'){ $('deadwave').textContent=S.wave; $('dead').classList.remove('hide'); } return true; },   // after the fall the old screen returns, with its own 🍺 TAVERN button and the HUD 🎒 reachable through it (#dead is pointer-events:none)
  isOpen:()=>TV.open,
  tab(k){ if(!TV_TABS.some(([t])=>t===k)) return; if(TV.tab!==k){ TV.tab=k; TV.sel=null; $('tv-detail').classList.add('hide'); $('tv-body').classList.remove('det'); $('tv-body').scrollTop=0; } tvRenderTab(false); },
  select(id,from){ TV.sel=id?{id,from:from||'bag',slot:(SLOTS.find(s=>gear[s]&&gear[s].id===id))}:null; tvRenderTab(true); },
  summary(data){ tvBuildDom(); TV.sumData=data; TV.open=true; TV.sum=true; TV.sel=null; TV.lastT=performance.now(); tvClearMsg(); tvShield(true); if(document.pointerLockElement&&document.exitPointerLock) document.exitPointerLock(); $('dead').classList.add('hide'); $('banner').style.opacity=0;
    const drops=(data.items||[]).slice(-8); const dh=drops.length?'<p class="tv-drops">Loot this run: '+drops.map(it=>'<b style="color:'+RCSS[it.rarity]+'">'+SICON[it.slot]+' '+tvEsc(it.name)+'</b>').join(' · ')+(data.drops>drops.length?' · +'+(data.drops-drops.length)+' more':'')+'</p>':'<p class="tv-drops">No loot dropped this run.</p>';
    const stat=(v,l)=>'<div class="tv-stat"><b>'+v+'</b><span>'+l+'</span></div>';
    const spent=data.goldSpent||0;
    $('tv-sum').innerHTML='<h1>'+(data.won?'HALL HELD':'SHATTERED')+'</h1><h2>'+(data.won?(data.mapName||'THE HALL')+' CLEARED · THE HORDE BROKE ON WAVE '+(data.wave|0):'THE CRYSTAL FELL ON WAVE '+(data.wave|0))+(data.newBest?' · A NEW BEST':'')+'</h2><div class="tv-stats">'+stat(tvG(data.kills||0),'KILLS')+stat('+'+tvG(data.xpGained||0),'XP')+stat('+'+tvG(data.goldGained||0)+' ●','GOLD EARNED'+(spent?'<small>−'+tvG(spent)+' spent</small>':''))+stat('+'+(data.levelsGained||0),'LEVELS')+'</div>'+dh
     +'<p style="color:#c9b8a0;font-size:13px;margin:0 0 6px">Your gear, gold and skills stay with you.</p><div class="db">'+(data.won&&data.hasNext?'<button class="tv-btn hot" data-act="nextmap" id="tv-nextmap">▶ NEXT MAP</button>':'')+'<button class="tv-btn'+(data.won&&data.hasNext?'':' hot')+'" data-act="totavern" id="tv-totavern">🍺 TO THE TAVERN</button><button class="tv-btn" data-act="again" id="tv-again">'+(data.won?'↻ REPLAY THIS MAP':'↻ GO AGAIN')+'</button></div>';
    $('tv-box').classList.add('hide'); $('tv-sum').classList.remove('hide'); $('tavern').classList.remove('hide'); tvLoop(); return true; },
  say:tvSay, state:()=>({open:TV.open,sum:TV.sum,tab:TV.tab,sel:TV.sel,goldShown:TV.gold.shown,goldTo:TV.gold.to,msg:TV.msg}), goldShown:()=>TV.gold.shown, tick:dt=>tvGoldTick(dt), render:()=>tvRenderTab(true) };
// ---- hooks: Meta.open → the tavern; Meta.isOpen chains with whatever was registered before. Keys run in the capture phase and stop there: game.js's own keydown (bubble) would otherwise see isOpen()===false right after close and re-open on I/B ----
{ const prevIsOpen=Meta.isOpen; Meta.isOpen=()=>TV.open||!!prevIsOpen(); Meta.open=()=>Tavern.open(); }
addEventListener('keydown',e=>{ if(!TV.open) return; const c=e.code; if(c==='Escape'||c==='KeyI'||c==='KeyB'){ e.preventDefault(); e.stopImmediatePropagation(); if(e.repeat) return; /* a held key must not flicker the overlay */ if(TV.sum){ tvClick({target:$('tv-totavern')}); } else Tavern.close(); /* one press closes, selection or not: the detail panel has its own ✕ */ } else if(c==='Digit1'||c==='Digit2'||c==='Digit3'){ if(!TV.sum) Tavern.tab(TV_TABS[+c.slice(5)-1][0]); } },true);
window.__tavern=Tavern; tvBuildDom(); if($('deadtavbtn')) $('deadtavbtn').addEventListener('click',()=>Meta.open());
