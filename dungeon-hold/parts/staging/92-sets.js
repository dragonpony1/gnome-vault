// ===== ITEM SETS: pieces that share an "of the …" suffix belong to a set. Wear three for the small bonus, all five for the
// big one. The bonuses ride the same hooks as skills (Meta.mult) and gear (heroStat), so every number on the sheet
// already includes them. Completing a set says so.
(function(){
const SETS={
  'of the Hall':   {ic:'🏰',three:{tow:.12},five:{tow:.25,aoe:.10},text:['+12% defense damage','+25% defense damage · +10% defense range & area']},
  'of the Deep':   {ic:'🌊',three:{hp:.15},five:{hp:.25,def:12,regen:2},text:['+15% max health','+25% max health · +12% armor · +2 hp/s']},
  'of the Crystal':{ic:'💎',three:{mana:.25},five:{mana:.50,heal:10},text:['+25% mana from orbs','+50% mana from orbs · the crystal mends 10 every wave held']},
  'of the Tower':  {ic:'🗼',three:{tcd:.12},five:{tcd:.25,tow:.10},text:['+12% defense attack speed','+25% defense attack speed · +10% defense damage']}};
const NAMES=Object.keys(SETS);
function setOf(it){ if(!it||!it.name) return null; for(const n of NAMES) if(it.name.endsWith(' '+n)) return n; return null; }
function counts(){ const c={}; for(const s of SLOTS){ const n=setOf(gear[s]); if(n) c[n]=(c[n]|0)+1; } return c; }
function active(){ const c=counts(); const out=[]; for(const n of NAMES){ const k=c[n]|0; if(k>=3) out.push({name:n,count:k,tier:k>=5?5:3,bonus:k>=5?SETS[n].five:SETS[n].three,text:SETS[n].text[k>=5?1:0]}); } return out; }
const PCT={tow:1,hp:1,mana:1,aoe:1,tcd:1};   // fractions that stack onto Meta.mult; the rest are flat stat points
function setMult(k){ let v=0; for(const a of active()) if(PCT[k]&&a.bonus[k]) v+=a.bonus[k]; return v; }
function setFlat(k){ let v=0; for(const a of active()) if(!PCT[k]&&a.bonus[k]) v+=a.bonus[k]; return v; }
{ const prev=Meta.mult; Meta.mult=k=>(prev(k)||0)+setMult(k); }
{ const prev=heroStat; heroStat=function(k){ return prev(k)+setFlat(k); }; }
{ const prev=Meta.onWaveHeld; Meta.onWaveHeld=w=>{ prev(w); const heal=setFlat('heal'); if(heal&&S.crystal>0){ S.crystal=Math.min(100,S.crystal+heal); floatText(0,4.2+(typeof hgt!=='undefined'?0:0),0,'+'+heal+' crystal','#5ee9ff'); } }; }
// completing a set (or its first three) says so
let seen={}; function announce(){ const c=counts(); for(const n of NAMES){ const k=c[n]|0; const lvl=k>=5?5:k>=3?3:0; if(lvl&&seen[n]!==lvl){ const S_=SETS[n]; toast(S_.ic+' SET BONUS · '+n+' ('+k+'/5): '+S_.text[lvl===5?1:0]); SFX.held(); } seen[n]=lvl; } }
{ const prev=Meta.equip; Meta.equip=id=>{ const ok=prev(id); if(ok){ applyGear(); announce(); } return ok; }; const pu=Meta.unequip; Meta.unequip=s=>{ const ok=pu(s); if(ok){ applyGear(); seen=Object.fromEntries(Object.entries(counts()).map(([n,k])=>[n,k>=5?5:k>=3?3:0])); } return ok; }; }
{ const c=counts(); for(const n in c) seen[n]=c[n]>=5?5:c[n]>=3?3:0; }
// the name says the set; the stat line says the count
const statStrSets=statStr; statStr=function(it){ const s=statStrSets(it); const n=setOf(it); if(!n) return s; const k=counts()[n]|0; return s+' · '+SETS[n].ic+' '+n.replace('of the ','')+' set'+(k?' '+k+'/5':''); };
Meta.sets={SETS,names:NAMES,setOf,counts,active,text:(n,lvl)=>SETS[n].text[lvl>=5?1:0]}; window.__sets=Meta.sets;
})();
