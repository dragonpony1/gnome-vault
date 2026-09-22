// ===== FAMILIARS v2: the six Meshy familiars replace the procedural pets, and each fights its own way =====
//   Wisp — quick spark bolts.            Cave Bat — swoops out and bites, then flaps back to your shoulder.
//   Moss Sprite — lobs seed pods that burst into a spore cloud: everything in it crawls.
//   Fire Imp — fireballs that splash and leave the target burning.
//   Crystal Owl — a beam that chains through up to three mobs.   Storm Drake — lightning that forks into the pack.
// Models come from assets/ (fam-*.glb); until one arrives (or in a single-file build) the procedural pet stands in.
(function(){
const FAM_FILES={'Wisp':'fam-wisp.glb','Bat':'fam-bat.glb','Sprite':'fam-sprite.glb','Fire Imp':'fam-imp.glb','Crystal Owl':'fam-owl.glb','Storm Drake':'fam-drake.glb'};
const FAM_H={'Wisp':.8,'Bat':.7,'Sprite':.8,'Fire Imp':.85,'Crystal Owl':.8,'Storm Drake':.95};   // world height of the pet
// per-kind tuning: fire-rate and damage multipliers on the item's stats, plus what the attack does
const FAM_KIND={
  'Wisp':        {rate:1.0,dmg:1.0,desc:'spark bolts'},
  'Bat':         {rate:.55,dmg:1.7,desc:'swoops and bites'},
  'Sprite':      {rate:.8, dmg:.6, desc:'seed pods · spore cloud slows',slow:2.2,r:1.6},
  'Fire Imp':    {rate:.7, dmg:.9, desc:'fireballs · splash + burn',splash:1.3,burn:3,burnDmg:.25},
  'Crystal Owl': {rate:.9, dmg:.8, desc:'beam chains to 3 mobs',hops:2,chain:.7,reach:4},
  'Storm Drake': {rate:.5, dmg:1.4,desc:'lightning forks into the pack',fork:.8,r:1.8}};
const FAM_GLB={}; const famFx=[]; const famShots=[]; let swoop=null; const burnFx=new Map();
function kindOf(){ return fam?fam.g.userData.kind:'Wisp'; }
function K(){ return FAM_KIND[kindOf()]||FAM_KIND.Wisp; }
function dmgOf(m){ return Math.max(.1,Math.round(famDmg()*m*10)/10); }
// ---- models ----
for(const k in FAM_FILES) fetchBytes(ASSET(FAM_FILES[k])).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ try{ const root=gltf.scene||gltf.scenes[0]; const fit=fitModel(root,FAM_H[k]); toonify(root,fit.scale); const w=fit.wrap; w.children[0].position.y-=FAM_H[k]*.5; FAM_GLB[k]=w;
    if(fam&&fam.g.userData.kind===k&&!fam.g.userData.glb) famRemove(); }catch(e){ console.warn('familiar model '+k,e); } },e=>console.warn('familiar model '+k,e))).catch(e=>console.warn('familiar model '+k,e));   // the pet respawns next frame with the real model
const famModelProc=famModel;
famModel=function(it){ const kind=famKind(it); const T=FAM_GLB[kind]; if(!T) return famModelProc(it); const g=T.clone(); const col=RCOL[it.rarity]||0xcfcfcf; const gl=glow(col,1.0,.4); gl.position.y=-.05; g.add(gl);   // rarity shows as the halo under the pet
  const root=new THREE.Group(); root.add(g); root.userData={wings:[],motes:[],kind,glb:true}; return root; };
const famRemoveProc=famRemove;
famRemove=function(){ if(fam&&fam.g.userData.glb){ scene.remove(fam.g); fam.g.traverse(m=>{ if(m.isSprite&&m.material) m.material.dispose(); }); fam=null; famClearBolts(); } else famRemoveProc(); swoop=null; };   // shared model geometry stays
const famRateProc=famRate; famRate=function(){ return famRateProc()/K().rate; };
// ---- effects: short-lived glowing segments (beams, lightning) that fade out ----
const SEG_GEO=new THREE.CylinderGeometry(1,1,1,5); const UP=new THREE.Vector3(0,1,0);
function seg(a,b,r,mt){ const d=new THREE.Vector3().subVectors(b,a); const L=d.length()||1e-3; const m=new THREE.Mesh(SEG_GEO,mt); m.userData.noOL=true; m.position.copy(a).addScaledVector(d,.5); m.scale.set(r,L,r); m.quaternion.setFromUnitVectors(UP,d.normalize()); return m; }
function fx(build,life){ const g=new THREE.Group(); const mt=basic(0xffffff,{transparent:true,opacity:1,depthWrite:false}); build(g,mt); scene.add(g); famFx.push({g,mt,t:0,life}); }
function bolt(a,b,col,r,jag){ fx((g,mt)=>{ mt.color.set(col); let p=a.clone(); const n=jag?6:1; for(let i=1;i<=n;i++){ const q=i===n?b.clone():a.clone().lerp(b,i/n); if(jag&&i<n){ q.x+=(rnd()-.5)*.5; q.y+=(rnd()-.5)*.4; q.z+=(rnd()-.5)*.5; } g.add(seg(p,q,r,mt)); p=q; } const s=glow(col,jag?1.8:1.1,.9); s.position.copy(b); g.add(s); },jag?.28:.32); }
function famFxUpdate(dt){ for(let i=famFx.length-1;i>=0;i--){ const f=famFx[i]; f.t+=dt; const k=1-f.t/f.life; if(k<=0){ scene.remove(f.g); f.mt.dispose(); f.g.traverse(o=>{ if(o.isSprite) o.material.dispose(); }); famFx.splice(i,1); continue; } f.mt.opacity=k; f.g.traverse(o=>{ if(o.isSprite) o.material.opacity=.9*k; }); } }
// ---- projectiles with weight (seed pods) and fireballs ----
function shotMesh(col,scale,core){ const g=new THREE.Group(); const c=M(G.sph(core||.09,8,6),basic(0xffffff),0,0,0); c.userData.noOL=true; g.add(c); g.add(glow(col,scale,.9)); return g; }
function muzzle(){ const fx=Math.sin(fam.yaw), fz=Math.cos(fam.yaw); return [fam.x+fx*.3,fam.y-.02,fam.z+fz*.3]; }
function nearMobs(x,z,r,skip){ const out=[]; for(const e of enemies){ if(e.dead||e===skip) continue; if(Math.hypot(e.x-x,e.z-z)<r+e.r*.5) out.push(e); } return out; }
function famShotsUpdate(dt){ for(let i=famShots.length-1;i>=0;i--){ const s=famShots[i]; s.t+=dt; s.vy-=s.g*dt; s.x+=s.vx*dt; s.y+=s.vy*dt; s.z+=s.vz*dt; s.mesh.position.set(s.x,s.y,s.z); if(s.trail&&(s.t*30|0)!==((s.t-dt)*30|0)){ fx((g,mt)=>{ const p=glow(0xff8a2a,.55,.7); p.position.set(s.x,s.y,s.z); g.add(p); },.25); }
    let hit=null; for(const e of enemies){ if(e.dead) continue; if(Math.hypot(e.x-s.x,e.z-s.z)<e.r+.45&&s.y>e.y-.3&&s.y<e.y+e.h+.6){ hit=e; break; } }
    const floor=s.y<=.12; if(hit||floor||s.t>2.2||s.y<-2){ if(hit||floor) s.land(s,hit); scene.remove(s.mesh); s.mesh.traverse(o=>{ if(o.isSprite) o.material.dispose(); else if(o.geometry) o.geometry.dispose(); }); famShots.splice(i,1); } } }
// ---- the attacks ----
const famFireProc=famFire;
function extraTargets(e,n){ const out=[]; const cands=enemies.filter(m=>!m.dead&&m!==e&&Math.hypot(m.x-fam.x,m.z-fam.z)<FAM_RANGE+2&&los(fam.x,fam.z,m.x,m.z)).sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z)); for(let i=0;i<n;i++) out.push(cands[i]||e); return out; }
famFire=function(e){ const n=heroStat('fproj')|0; fireOne(e,n); const k=kindOf(); if(n>0&&(k==='Wisp'||k==='Sprite'||k==='Fire Imp')) for(const t of extraTargets(e,n)) fireOne(t,0); };
function fireOne(e,extra){ const k=kindOf(), C=FAM_KIND[k]; fam.kick=1;
  if(k==='Bat'){ const [x,y,z]=[fam.x,fam.y,fam.z]; swoop={e,t:0,dur:.6,bit:false,x0:x,y0:y,z0:z}; return; }
  if(k==='Sprite'){ const [x,y,z]=muzzle(); const T=.62, g=14; const tx=e.x+(e.walking?Math.sin(e.yaw)*mobSpd(e)*T*.6:0), tz=e.z+(e.walking?Math.cos(e.yaw)*mobSpd(e)*T*.6:0); const mesh=shotMesh(0x9be36a,.8,.11); mesh.position.set(x,y,z); scene.add(mesh);
    famShots.push({x,y,z,vx:(tx-x)/T,vy:(e.y+.3-y)/T+.5*g*T,vz:(tz-z)/T,g,t:0,mesh,land:(s,h)=>{ const d=dmgOf(C.dmg); for(const m of nearMobs(s.x,s.z,C.r,null)){ hurt(m,d,0,0); m.slowT=Math.max(m.slowT||0,C.slow); } SFX.spore();
      fx((g,mt)=>{ mt.color.set(0x9be36a); for(let i=0;i<7;i++){ const p=glow(0x9be36a,.9+rnd()*.5,.55); const a=rnd()*TAU, r=rnd()*C.r*.8; p.position.set(s.x+Math.cos(a)*r,.25+rnd()*.5,s.z+Math.sin(a)*r); g.add(p); } },.9); }}); SFX.acorn(); return; }
  if(k==='Fire Imp'){ const [x,y,z]=muzzle(); const tx=e.x, ty=e.y+e.h*.5, tz=e.z; const dx=tx-x, dy=ty-y, dz=tz-z, d=Math.hypot(dx,dy,dz)||1, sp=13; const mesh=shotMesh(0xff7a20,1.3,.1); mesh.position.set(x,y,z); scene.add(mesh);
    famShots.push({x,y,z,vx:dx/d*sp,vy:dy/d*sp,vz:dz/d*sp,g:0,t:0,mesh,trail:true,land:(s,h)=>{ const d1=dmgOf(C.dmg), d2=dmgOf(C.dmg*.5); if(h){ hurt(h,d1,s.vx/sp*.4,s.vz/sp*.4); burn(h,C); } for(const m of nearMobs(s.x,s.z,C.splash,h)){ hurt(m,d2,0,0); burn(m,C); } SFX.hit();
      fx((g,mt)=>{ mt.color.set(0xff7a20); const p=glow(0xffb040,2.2,.9); p.position.set(s.x,s.y,s.z); g.add(p); const q=glow(0xff4a10,1.4,.9); q.position.set(s.x,s.y,s.z); g.add(q); },.35); }}); SFX.harpoon(); return; }
  if(k==='Crystal Owl'){ const from=new THREE.Vector3(...muzzle()); let cur=e, prev=from, d=dmgOf(C.dmg); const hitList=[]; for(let hop=0;hop<=C.hops+extra&&cur;hop++){ const to=new THREE.Vector3(cur.x,cur.y+cur.h*.55,cur.z); bolt(prev,to,0x9ee8ff,.03+.01*(hop===0),false); hurt(cur,d,0,0); hitList.push(cur); prev=to; d=dmgOf(C.dmg*Math.pow(C.chain,hop+1));
      let nx=null, nd=C.reach; for(const m of enemies){ if(m.dead||hitList.includes(m)) continue; const dd=Math.hypot(m.x-cur.x,m.z-cur.z); if(dd<nd&&los(cur.x,cur.z,m.x,m.z)){ nd=dd; nx=m; } } cur=nx; } beep(1400,.14,'sine',.04,900); noise(.06,.03,6000); return; }
  if(k==='Storm Drake'){ const from=new THREE.Vector3(...muzzle()); const to=new THREE.Vector3(e.x,e.y+e.h*.6,e.z); bolt(from,to,0xd8ecff,.045,true); hurt(e,dmgOf(C.dmg),0,0); for(const m of nearMobs(e.x,e.z,C.r+.6*extra,e)){ bolt(to,new THREE.Vector3(m.x,m.y+m.h*.6,m.z),0xd8ecff,.03,true); hurt(m,dmgOf(C.fork),0,0); }
    fx((g,mt)=>{ const p=glow(0xffffff,2.6,.8); p.position.set(e.x,e.y+e.h*.5,e.z); g.add(p); },.18); noise(.18,.14,2600); beep(90,.22,'sawtooth',.05,-40); return; }
  famFireProc(e); }   // Wisp: the spark bolt
function burn(e,C){ e.burnT=C.burn; e.burnDmg=dmgOf(C.burnDmg); e.burnTick=e.burnTick||0; }
function burnUpdate(dt){ for(const e of enemies){ if(!(e.burnT>0)) continue; if(e.dead){ e.burnT=0; continue; } e.burnT-=dt; e.burnTick=(e.burnTick||0)+dt; if(e.burnTick>=.5){ e.burnTick-=.5; hurt(e,e.burnDmg,0,0); }
    let s=burnFx.get(e); if(!s){ s=glow(0xff7a20,1.1,.75); scene.add(s); burnFx.set(e,s); } s.position.set(e.x+(rnd()-.5)*.2,e.y+e.h*.6+Math.sin(S.t*23)*.08,e.z+(rnd()-.5)*.2); s.scale.setScalar(.9+Math.sin(S.t*31)*.2); }
  for(const [e,s] of burnFx){ if(!(e.burnT>0)||e.dead){ scene.remove(s); s.material.dispose(); burnFx.delete(e); } } }
function swoopUpdate(dt){ if(!swoop||!fam) return; const w=swoop; w.t+=dt/w.dur; const e=w.e; if(e.dead&&w.t<.5){ w.t=.5; }
  const k=Math.sin(Math.min(1,w.t)*PI);   // 0 → 1 (at the mob) → 0 (back on the shoulder)
  const tx=e.dead?w.x0:e.x, ty=e.dead?w.y0:e.y+e.h*.7, tz=e.dead?w.z0:e.z; const px=lerp(fam.x,tx,k), py=lerp(fam.y,ty,k)+Math.sin(w.t*PI)*.3, pz=lerp(fam.z,tz,k);
  fam.g.position.set(px,py,pz); fam.g.rotation.y=Math.atan2((w.t<.5?tx:fam.x)-px,(w.t<.5?tz:fam.z)-pz); fam.g.rotation.x=(w.t<.5?.5:-.35)*k;
  if(!w.bit&&w.t>=.5&&!e.dead){ w.bit=true; hurt(e,dmgOf(K().dmg),Math.sin(fam.g.rotation.y)*.6,Math.cos(fam.g.rotation.y)*.6); const nb=heroStat('fproj')|0; if(nb>0) for(const m of nearMobs(e.x,e.z,1.6,e).slice(0,nb)) hurt(m,dmgOf(K().dmg*.7),0,0); SFX.hit(); fx((g,mt)=>{ const p=glow(0xffe0a0,1.2,.8); p.position.set(e.x,e.y+e.h*.7,e.z); g.add(p); },.2); }
  if(w.t>=1){ swoop=null; fam.g.rotation.x=0; } }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); if(fam){ swoopUpdate(dt); } famShotsUpdate(dt); famFxUpdate(dt); burnUpdate(dt); }; }
const famClearProc=famClearBolts; famClearBolts=function(){ famClearProc(); for(const s of famShots){ scene.remove(s.mesh); } famShots.length=0; };
// the bag / sheet says what each familiar does
const statStrProc=statStr; statStr=function(it){ const s=statStrProc(it); if(it&&it.slot==='familiar'){ const C=FAM_KIND[famKind(it)]; if(C) return s+' · '+C.desc; } return s; };
Object.assign(window.__familiar,{rate:()=>famRate(),dmg:()=>famDmg(),kinds:FAM_KIND,kindMul:()=>K(),glb:()=>Object.keys(FAM_GLB),fx:()=>famFx.length,shots:()=>famShots.length,swoop:()=>swoop?{t:+swoop.t.toFixed(2),bit:swoop.bit}:null,burning:()=>enemies.filter(e=>e.burnT>0&&!e.dead).length,pos:()=>fam?fam.g.position.toArray().map(v=>+v.toFixed(2)):null});
})();
