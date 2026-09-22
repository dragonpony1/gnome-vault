// ===== THE FORGE: put gold into the gear you wear, Dungeon Defenders style. Every item takes a number of upgrade points
// set by its rarity (Common 50 … Legendary 200); each point goes into a stat you pick for that item — hero stats on
// weapons, armor and amulets, defense stats on charms (and a little on everything), pet stats on familiars — and costs
// gold that climbs slowly with the points already in the item. Bought at the anvil in the tavern, or from the character
// sheet (Tab): tap a slot, pick a stat, press +.
(function(){
const UP_MAX=[50,75,100,150,200];                                    // upgrade points by rarity
const UPINC={dmg:.5,spd:.5,hp:2,def:.2,regen:.05,tow:.5,trate:.4,tarea:.4,mana:.5,move:.2,fdmg:.5,frate:.5,fproj:1};   // what one point adds
const UPCAP={def:60,move:50,spd:150,fproj:[0,1,1,2,3]};             // total-value caps; fproj = points allowed by rarity
const UPKEYS={weapon:['dmg','spd','tow','trate'],armor:['hp','def','regen','tow'],charm:['tow','trate','tarea','mana'],amulet:['hp','regen','def','spd','move'],familiar:['fdmg','frate','fproj','tow']};
const UPLBL={dmg:'⚔ Hero damage',spd:'⚡ Swing speed',hp:'❤ Max health',def:'🛡 Armor',regen:'✚ Regen',tow:'🏹 Defense damage',trate:'🔁 Defense attack speed',tarea:'◎ Defense range & area',mana:'◆ Mana from orbs',move:'👟 Move speed',fdmg:'✨ Pet damage',frate:'✨ Pet attack speed',fproj:'✨ Pet projectiles'};
const UPFMT={dmg:v=>'+'+v,spd:v=>'+'+v+'%',hp:v=>'+'+v,def:v=>'+'+v+'%',regen:v=>'+'+v+'/s',tow:v=>'+'+v+'%',trate:v=>'+'+v+'%',tarea:v=>'+'+v+'%',mana:v=>'+'+v+'%',move:v=>'+'+v+'%',fdmg:v=>'+'+v,frate:v=>'+'+v+'%',fproj:v=>'+'+v};
function upMax(it){ return UP_MAX[clamp(it.rarity|0,0,4)]; }
function upUsed(it){ return it.up|0; }
function upLeft(it){ return Math.max(0,upMax(it)-upUsed(it)); }
function upCost(it){ return Math.max(1,Math.round((3+2*(it.rarity|0))*(1+.06*upUsed(it))*(1+.1*((it.tier||tierOf(it.lvl||1))-1)))); }
function upKeys(it){ return UPKEYS[it.slot]||[]; }
function capOf(it,k){ const c=UPCAP[k]; if(Array.isArray(c)) return c[clamp(it.rarity|0,0,4)]; return c===undefined?Infinity:c; }
function canUp(it,k){ if(!it) return {ok:false,why:'nothing there'}; if(!upKeys(it).includes(k)) return {ok:false,why:'not on this item'}; if(upLeft(it)<=0) return {ok:false,why:'fully upgraded'};
  if(k==='fproj'){ if(((it.ups&&it.ups.fproj)|0)>=capOf(it,k)) return {ok:false,why:capOf(it,k)?'max projectiles for '+RNAME[it.rarity]:'needs an Uncommon or better pet'}; }
  else if((it.stats[k]||0)+UPINC[k]>capOf(it,k)+1e-9) return {ok:false,why:'at the cap'};
  const c=upCost(it); if(Meta.gold()<c) return {ok:false,why:'need '+Meta.fmtG(c-Meta.gold())+' more gold',cost:c}; return {ok:true,why:'',cost:c}; }
function findItem(ref){ if(ref&&typeof ref==='object') return ref; for(const s of SLOTS){ if(gear[s]&&gear[s].id===ref) return gear[s]; } return Meta.bag().find(b=>b.id===ref)||Meta.stock().find(b=>b.id===ref)||null; }
function rescore(it){ let sc=0; for(const k in it.stats) sc+=(it.stats[k]||0)*(STATW[k]||1); it.score=Math.round(sc*10)/10; }
function upgrade(ref,k,n){ const it=findItem(ref); if(!it) return 0; n=Math.max(1,n|0); let done=0;
  while(done<n){ const c=canUp(it,k); if(!c.ok) break; Meta.addGold(-c.cost,'forge'); it.up=upUsed(it)+1; it.ups=it.ups||{}; it.ups[k]=(it.ups[k]|0)+1; it.stats[k]=Math.round(((it.stats[k]||0)+UPINC[k])*100)/100; done++; }
  if(done){ rescore(it); applyGear(); saveGear(); Meta.save(); SFX.place(); } return done; }
// items saved before the forge existed, or edited storage: points are whole numbers within the item's allowance
function sane(it){ if(!it||!it.stats) return; it.up=clamp(Math.floor(+it.up||0),0,upMax(it)); const u={}; let sum=0; if(it.ups&&typeof it.ups==='object') for(const k in it.ups){ const v=clamp(Math.floor(+it.ups[k]||0),0,upMax(it)); if(v>0&&UPINC[k]){ u[k]=v; sum+=v; } } it.ups=u; if(sum>it.up) it.up=Math.min(upMax(it),sum); }
for(const s of SLOTS) if(gear[s]) sane(gear[s]); Meta.bag().forEach(sane); Meta.stock().forEach(sane);
// the stat line everywhere (bag, shop, sheet, toasts) says its upgrades out of the allowance (Common 50 … Legendary 200)
const statStrForge=statStr; statStr=function(it){ const s=statStrForge(it); return (it&&it.stats)?s+' · ⬆ '+upUsed(it)+'/'+upMax(it):s; };   // every card says how far it can go, even before the first point
const forge={max:upMax,used:upUsed,left:upLeft,cost:upCost,keys:upKeys,can:canUp,upgrade,inc:UPINC,cap:capOf,label:k=>UPLBL[k]||k,fmt:(k,v)=>(UPFMT[k]||(x=>x))(v),find:findItem,defStat:(d,k)=>stat(d,k)};
Meta.forge=forge; window.__forge=forge;
})();
