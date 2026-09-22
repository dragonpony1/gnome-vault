// ===== THE GREAT SETS: the arcane Void set is the first of ten planned. Each is a registry entry: its "of the …" suffix, icon and
// colour, how rare it is (lowest rarity that can carry it, the chance per drop by wave), what a piece is worth, the sound and
// light of its drop, the three- and five-piece buffs (percentages on the multiplier hook, and an optional five-piece power that
// fires on hero hits), and which weapon models stand in until its own arrive. Add a set = add an entry to PACKS.
(function(){
const PACKS={};
function addSet(d){ PACKS[d.name]=d; Meta.sets.SETS[d.name]={ic:d.ic,three:{},five:{},text:d.text,col:d.css}; Meta.sets.names.push(d.name); }
const packOf=it=>{ const n=it&&Meta.sets.setOf(it); return n&&PACKS[n]||null; };
const worn=()=>Meta.sets.active().filter(a=>PACKS[a.name]).map(a=>({pack:PACKS[a.name],tier:a.tier}));
// ---- the Void: dark runed pieces that burn violet. Rare+ only, from wave 4 (5% of such drops, +1 point a wave, 15% cap), worth ×3.
addSet({name:'of the Void',ic:'🌌',col:0x8a3dff,css:'#c070ff',emissive:0x5a2bd0,minR:2,chance:w=>w>=4?Math.min(.15,.05+.01*(w-4)):0,valueMul:3,
  three:{dmg:.15,fam:.20},five:{dmg:.15,fam:.20},text:['+15% hero damage · +20% familiar damage','+15% hero damage · +20% familiar damage · VOID RIFT: every hit tears a rift — 40% of the blow to all within 3 units, and they crawl for 2 s'],
  models:{sword:'holy',whip:'whip-crystal'},
  sfx:()=>{ beep(98,.9,'sine',.13,-30); beep(196,.7,'triangle',.05,0); setTimeout(()=>beep(1046,.35,'sine',.045,900),80); setTimeout(()=>beep(1568,.5,'sine',.035,1400),220); noise(.5,.04,6000); },
  onHit:(e,dmg)=>{ const r=rift(e,Math.round(dmg*.4*10)/10); riftFx(e.x,e.y||0,e.z,0x8a3dff); SFX.rift(); return r; }});
// ---- the buffs: percentages on the same multiplier hook as skills, keyed by the set so nothing reads them as flat points
{ const prev=Meta.mult; Meta.mult=k=>{ let v=prev(k)||0; for(const {pack,tier} of worn()){ const b=tier>=5?pack.five:pack.three; if(b&&b[k]) v+=b[k]; } return v; }; }
{ const prev=famDmg; famDmg=function(){ return Math.round(prev()*(1+(Meta.mult('fam')||0))*10)/10; }; }
// ---- the drop rule: after the ordinary roll a Rare-or-better piece may become a set piece; the old suffix goes, the value climbs
function makeSet(it,d){ let base=it.name; for(const s of SUFFIX) if(base.endsWith(' '+s)) base=base.slice(0,-(s.length+1)); for(const n in PACKS) if(base.endsWith(' '+n)) base=base.slice(0,-(n.length+1)); it.name=base+' '+d.name; it.value=Math.round(it.value*(d.valueMul||1)); return it; }
{ const prev=rollItem; rollItem=function(minR,slot,lvl){ const it=prev(minR,slot,lvl); const w=effWave(); for(const n in PACKS){ const d=PACKS[n]; if(it.rarity>=(d.minR|0)&&LR()<d.chance(w)){ makeSet(it,d); break; } } return it; }; }
// ---- the drop: the set's own sound, a column of its light for three seconds, a shout; the piece on the floor takes its colour
SFX.rift=()=>{ beep(140,.22,'sawtooth',.05,-90); noise(.12,.05,2400); };
const FX=[]; const RING_GEO=new THREE.RingGeometry(.6,1,32), COL_GEO=new THREE.CylinderGeometry(.14,.3,7,14,1,true);
function fxMat(col,op){ return new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}); }
function column(x,z,col){ const m=new THREE.Mesh(COL_GEO,fxMat(col,.55)); m.position.set(x,3.5,z); m.userData.noOL=true; scene.add(m); FX.push({m,t:0,kind:'col'}); }
function riftFx(x,y,z,col){ const m=new THREE.Mesh(RING_GEO,fxMat(col,.9)); m.rotation.x=-PI/2; m.position.set(x,y+.08,z); m.userData.noOL=true; scene.add(m); FX.push({m,t:0,kind:'ring'}); }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); for(let i=FX.length-1;i>=0;i--){ const f=FX[i]; f.t+=dt; let done=false;
    if(f.kind==='ring'){ const s=1+f.t*6; f.m.scale.set(s,s,1); f.m.material.opacity=Math.max(0,.9-f.t*2.2); done=f.t>.45; }
    else { f.m.material.opacity=Math.max(0,.55*(1-f.t/3)); f.m.rotation.y+=dt*1.5; f.m.scale.set(1+f.t*.15,1,1+f.t*.15); done=f.t>3; }
    if(done){ scene.remove(f.m); f.m.material.dispose(); FX.splice(i,1); } } }; }
{ const prev=dropLoot; dropLoot=function(it,x,z,gentle){ const l=prev(it,x,z,gentle); const d=packOf(it); if(d){ if(d.sfx) d.sfx(); floatText(x,1.7,z,d.ic+' A PIECE '+d.name.toUpperCase(),d.css); column(x,z,d.col); l.mesh.traverse(m=>{ if(m.isMesh&&m.material&&m.material.color&&!m.userData.isOL){ m.material=m.material.clone(); m.material.color.set(d.col); if(m.material.emissive) m.material.emissive.set(d.emissive||0); } }); } return l; }; }
// ---- the five-piece powers ride hero hits: a hit that lands hands the target and the blow to the set
function rift(e,dmg){ let n=0; for(const o of enemies){ if(o.dead||o===e) continue; if(Math.hypot(o.x-e.x,o.z-e.z)<3+(o.r||.5)){ hurt(o,dmg,0,0); o.slowT=Math.max(o.slowT||0,2); n++; } } e.slowT=Math.max(e.slowT||0,2); return n; }
{ const prev=hitCone; hitCone=function(){ const five=worn().filter(w=>w.tier>=5&&w.pack.onHit); if(!five.length) return prev(); const before=[]; for(const e of enemies) if(!e.dead) before.push([e,e.hp]); prev(); const dmg=heroDmg(); for(const [e,h] of before) if(e.hp<h) for(const w of five) w.pack.onHit(e,dmg); }; }
Meta.packs={of:packOf,list:()=>Object.keys(PACKS),get:n=>PACKS[n],add:addSet};
window.__void={NAME:'of the Void',isVoid:it=>packOf(it)===PACKS['of the Void'],chance:w=>PACKS['of the Void'].chance(w===undefined?effWave():w),lvl:()=>{ const a=Meta.sets.active().find(x=>x.name==='of the Void'); return a?a.tier:0; },make:it=>makeSet(it,PACKS['of the Void']),fx:()=>FX.length,rift};
window.__packs=Meta.packs;
})();
