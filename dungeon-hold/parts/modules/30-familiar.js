// ===== 30-familiar.js — the pet: a small toon creature that follows the hero and fires glowing bolts at enemies =====
// Same scope as game.js. Lives only while gear.familiar is equipped, S.phase is build/wave and the hero is alive.
const FAM_RANGE=9, FAM_BOLT_SPD=18, FAM_BOLT_LIFE=1.2, FAM_RATE=1.2, FAM_SCALE=.85;
const OLF=OL.clone(); OLF.uniforms.t.value=.012;   // thinner outline: the pet is ~0.5 units, the shared 0.028 shell would swallow it
function outlineThin(root){ root.traverse(m=>{ if(m.isMesh&&m.material!==OL&&m.material!==OLF&&!m.userData.noOL&&!m.isSprite&&!m.userData.isOL){ const o=new THREE.Mesh(m.geometry,OLF); o.userData.isOL=true; m.add(o); } }); return root; }
let fam=null; const famBolts=[];
function famShade(hex,k){ const c=new THREE.Color(hex); return (k<1?c.multiplyScalar(k):c.lerp(new THREE.Color(0xffffff),k-1)).getHex(); }   // k<1 darkens, k>1 tints toward white
function famKind(it){ const n=(it&&it.name)||''; for(const k of ['Storm Drake','Crystal Owl','Fire Imp','Sprite','Bat','Wisp']) if(n.includes(k)) return k; return 'Wisp'; }
function famEye(x,y,z,r){ const e=M(G.sph(r||.035,6,5),basic(0x14101c),x,y,z); e.userData.noOL=true; return e; }
function famWing(m,side,w,h,y,z){ const p=new THREE.Group(); p.position.set(side*.1,y||.02,z||0); const b=M(G.box(w,.025,h),m,side*w/2,0,0); p.add(b); const tip=M(G.cone(.05,.1,4),m,side*(w+.03),0,0); tip.rotation.z=-side*PI/2; p.add(tip); p.userData.side=side; return p; }
// procedural model per base name; every variant fits in ~0.5 units, body colour = rarity colour
function famModel(it){ const col=RCOL[it.rarity]||0xcfcfcf, dark=famShade(col,.55), pale=famShade(col,1.35); const m=mat(col), md=mat(dark), mp=mat(pale); const g=new THREE.Group(); const kind=famKind(it); const wings=[], motes=[];
  if(kind==='Wisp'){ const core=M(G.sph(.17,12,9),m,0,0,0); g.add(core); const inner=M(G.sph(.09,8,6),basic(0xffffff),0,0,0); inner.userData.noOL=true; g.add(inner); g.add(glow(col,1.1,.6)); for(let i=0;i<3;i++){ const mo=M(G.sph(.035,6,5),mp,0,0,0); mo.userData.ph=i*TAU/3; motes.push(mo); g.add(mo); } g.add(famEye(-.06,.03,.15,.03)); g.add(famEye(.06,.03,.15,.03)); }
  else if(kind==='Bat'){ const body=M(G.sph(.15,10,8),md,0,0,0); body.scale.set(1,.9,1.1); g.add(body); const e1=M(G.cone(.05,.12,4),md,-.09,.15,0), e2=M(G.cone(.05,.12,4),md,.09,.15,0); e1.rotation.z=.3; e2.rotation.z=-.3; g.add(e1,e2); g.add(famEye(-.06,.03,.13,.035)); g.add(famEye(.06,.03,.13,.035)); const w1=famWing(m,-1,.28,.14,.03,0), w2=famWing(m,1,.28,.14,.03,0); wings.push(w1,w2); g.add(w1,w2); g.add(glow(col,.6,.35)); }
  else if(kind==='Sprite'){ const body=M(G.cyl(.06,.09,.22,8),m,0,-.06,0); g.add(body); g.add(M(G.sph(.1,10,8),mp,0,.12,0)); g.add(famEye(-.04,.13,.09,.025)); g.add(famEye(.04,.13,.09,.025)); for(const s of [-1,1]){ const w=famWing(mp,s,.16,.1,.06,-.04); w.rotation.y=s*.4; wings.push(w); g.add(w); const w2=famWing(mp,s,.12,.08,-.04,-.05); w2.rotation.y=s*.6; wings.push(w2); g.add(w2); } g.add(glow(col,.9,.5)); }
  else if(kind==='Fire Imp'){ const body=M(G.sph(.16,10,8),m,0,0,0); body.scale.set(1,1.05,.95); g.add(body); const h1=M(G.cone(.04,.14,5),md,-.09,.16,0), h2=M(G.cone(.04,.14,5),md,.09,.16,0); h1.rotation.z=.45; h2.rotation.z=-.45; g.add(h1,h2); g.add(famEye(-.06,.03,.14,.035)); g.add(famEye(.06,.03,.14,.035)); const tail=M(G.cone(.03,.22,5),md,0,-.1,-.16); tail.rotation.x=-1.2; g.add(tail); const fl=glow(0xff8a2a,.7,.85); fl.position.y=.28; g.add(fl); const fl2=glow(0xffd070,.35,.9); fl2.position.y=.32; g.add(fl2); g.add(glow(0xff6a20,.8,.3)); for(const s of [-1,1]){ const w=famWing(md,s,.16,.1,.0,-.08); w.rotation.y=s*.5; wings.push(w); g.add(w); } }
  else if(kind==='Crystal Owl'){ const body=M(G.sph(.15,10,8),m,0,-.04,0); body.scale.set(.95,1.25,.9); g.add(body); g.add(M(G.sph(.13,10,8),mp,0,.14,.01)); for(const s of [-1,1]){ const ring=M(G.sph(.055,8,6),basic(0xfff6d8),s*.055,.16,.1); ring.userData.noOL=true; g.add(ring); g.add(famEye(s*.055,.16,.145,.028)); const tuft=M(G.cone(.035,.1,4),md,s*.1,.27,0); tuft.rotation.z=-s*.4; g.add(tuft); const w=famWing(md,s,.14,.16,-.02,-.02); w.rotation.y=s*.7; wings.push(w); g.add(w); } const beak=M(G.cone(.03,.07,4),mat(0xffc040),0,.11,.13); beak.rotation.x=PI/2; g.add(beak); const gem=M(new THREE.OctahedronGeometry(.05,0),basic(0xbff4ff),0,.31,0); gem.userData.noOL=true; gem.userData.spin=1; motes.push(gem); g.add(gem); g.add(glow(0x9ee8ff,.7,.35)); }
  else { /* Storm Drake */ const body=M(G.sph(.13,10,8),m,0,0,0); body.scale.set(.9,.85,1.7); g.add(body); const head=M(G.sph(.1,10,8),mp,0,.08,.22); g.add(head); const snout=M(G.box(.1,.07,.1),mp,0,.06,.31); g.add(snout); g.add(famEye(-.05,.12,.27,.028)); g.add(famEye(.05,.12,.27,.028)); for(const s of [-1,1]){ const horn=M(G.cone(.03,.11,4),md,s*.06,.15,.15); horn.rotation.x=-.8; horn.rotation.z=-s*.3; g.add(horn); const w=famWing(md,s,.3,.18,.06,-.02); wings.push(w); g.add(w); } for(let i=0;i<4;i++){ const sp=M(G.cone(.025,.07,4),md,0,.12-i*.005,.1-i*.1); g.add(sp); } const tail=M(G.cone(.05,.3,5),m,0,-.02,-.33); tail.rotation.x=-PI/2; g.add(tail); const fin=M(G.cone(.06,.09,3),md,0,.0,-.45); fin.rotation.x=-PI/2; g.add(fin); g.add(glow(0x9fd8ff,.9,.35)); }
  outlineThin(g); g.scale.setScalar(FAM_SCALE); const root=new THREE.Group(); root.add(g); root.userData={wings,motes,kind}; return root; }   // root carries position/facing/kick, g the base size
function famSpawn(it){ const g=famModel(it); const fx=Math.sin(hero.yaw), fz=Math.cos(hero.yaw); const x=hero.x-fx*.9-fz*.65, z=hero.z-fz*.9+fx*.65, y=hero.y+2.05; g.position.set(x,y,z); scene.add(g);
  fam={id:it.id,it,g,x,y,z,yaw:hero.yaw,t:LR()*6,cd:.5,target:null,kick:0}; }
// geometries are per model (G.* allocate), basic()/glow() materials too; mat() materials and the OL/OLF outline shaders are shared caches and stay
function famRemove(){ if(!fam) return; scene.remove(fam.g); fam.g.traverse(m=>{ if(m.geometry&&!m.isSprite) m.geometry.dispose(); const mt=m.material; if(mt&&mt!==OL&&mt!==OLF&&(m.isSprite||mt.isMeshBasicMaterial)) mt.dispose(); }); fam=null; famClearBolts(); }
function famClearBolts(){ for(const b of famBolts) scene.remove(b.mesh); famBolts.length=0; }
function famActive(){ return !!(gear.familiar&&(S.phase==='build'||S.phase==='wave')); }
function famRate(){ const it=gear.familiar; return 1/(FAM_RATE*(1+((it&&it.stats.frate)||0)/100)); }
function famDmg(){ const it=gear.familiar; return Math.max(1,Math.round(((it&&it.stats.fdmg)||1)*heroMult('dmg')*10)/10); }   // one decimal like heroDmg/stat: every Blade point shows
function famTarget(){ let best=null, bd=FAM_RANGE; for(const e of enemies){ if(e.dead) continue; const d=Math.hypot(e.x-fam.x,e.z-fam.z); if(d<bd&&los(fam.x,fam.z,e.x,e.z)){ bd=d; best=e; } } return best; }
// every bolt shares one sphere geometry + material and one pair of glow sprite materials per colour (Sprite.clone keeps the material), so a long run allocates nothing per shot
const FAM_BOLT={geo:null,mat:null,glow:{}};
function famBoltMesh(col){ const F=FAM_BOLT; if(!F.geo){ F.geo=G.sph(.08,8,6); F.mat=basic(0xffffff); F.white=glow(0xffffff,.3,.9); } if(!F.glow[col]) F.glow[col]=glow(col,.75,.9);
  const b=new THREE.Group(); const core=M(F.geo,F.mat,0,0,0); core.userData.noOL=true; b.add(core); b.add(F.glow[col].clone()); b.add(F.white.clone()); return b; }
function famFire(e){ const it=gear.familiar, col=RCOL[it.rarity]||0xffffff; const b=famBoltMesh(col);
  const fx=Math.sin(fam.yaw), fz=Math.cos(fam.yaw); const x=fam.x+fx*.25, y=fam.y-.02, z=fam.z+fz*.25; const tx=e.x, ty=e.y+e.h*.55, tz=e.z; const dx=tx-x, dy=ty-y, dz=tz-z, d=Math.hypot(dx,dy,dz)||1;
  b.position.set(x,y,z); scene.add(b); famBolts.push({x,y,z,vx:dx/d*FAM_BOLT_SPD,vy:dy/d*FAM_BOLT_SPD,vz:dz/d*FAM_BOLT_SPD,t:0,mesh:b,col}); fam.kick=1; }
function famBoltsUpdate(dt){ for(let i=famBolts.length-1;i>=0;i--){ const b=famBolts[i]; b.t+=dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt; b.mesh.position.set(b.x,b.y,b.z); let hit=null;
    for(const e of enemies){ if(e.dead) continue; if(Math.hypot(e.x-b.x,e.z-b.z)<e.r+.4&&b.y>e.y-.3&&b.y<e.y+e.h+.5){ hit=e; break; } }
    if(hit){ const d=Math.hypot(b.vx,b.vz)||1; hurt(hit,famDmg(),b.vx/d*.5,b.vz/d*.5); SFX.hit(); }
    if(hit||b.t>FAM_BOLT_LIFE||b.y<-2){ scene.remove(b.mesh); famBolts.splice(i,1); } } }
function famUpdate(dt){ const it=gear.familiar;
  if(!famActive()){ if(fam) famRemove(); else if(famBolts.length) famClearBolts(); return; }
  if(!fam||fam.id!==it.id||fam.it!==it){ famRemove(); famSpawn(it); }
  const g=fam.g; fam.t+=dt; const dead=hero.dead>0; g.visible=!dead; if(dead){ if(famBolts.length) famClearBolts(); fam.target=null; return; }
  // follow: 0.9 behind, 0.65 to the right, 2.05 up — over the hero's shoulder
  const fx=Math.sin(hero.yaw), fz=Math.cos(hero.yaw); const tx=hero.x-fx*.9-fz*.65, tz=hero.z-fz*.9+fx*.65, ty=hero.y+2.05; const k=1-Math.exp(-6*dt);
  fam.x=lerp(fam.x,tx,k); fam.z=lerp(fam.z,tz,k); fam.y=lerp(fam.y,ty,k);
  // aim + fire
  fam.cd-=dt; if(fam.cd<=0||!fam.target||fam.target.dead){ fam.target=famTarget(); }
  if(fam.target&&!fam.target.dead){ const e=fam.target; fam.yaw=angLerp(fam.yaw,Math.atan2(e.x-fam.x,e.z-fam.z),1-Math.exp(-10*dt)); if(fam.cd<=0){ famFire(e); fam.cd=famRate(); } }
  else { fam.yaw=angLerp(fam.yaw,hero.yaw,1-Math.exp(-4*dt)); if(fam.cd<0) fam.cd=0; }
  // pose: bob, face, wing flap, mote orbit, recoil kick
  const bob=Math.sin(fam.t*3)*.08; g.position.set(fam.x,fam.y+bob,fam.z); g.rotation.y=fam.yaw; g.rotation.z=Math.sin(fam.t*1.7)*.06; fam.kick=Math.max(0,fam.kick-dt*5); const s=1+fam.kick*.25; g.scale.set(s,1/s,s);
  const ud=g.userData; const flap=Math.sin(fam.t*(ud.kind==='Storm Drake'?7:14))*.65; for(const w of ud.wings) w.rotation.z=w.userData.side*flap;
  for(const mo of ud.motes){ if(mo.userData.spin){ mo.rotation.y+=dt*2; mo.rotation.x+=dt*.7; } else { const a=fam.t*2.2+mo.userData.ph; mo.position.set(Math.cos(a)*.27,Math.sin(a*1.6)*.1,Math.sin(a)*.27); } }
  famBoltsUpdate(dt); }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); famUpdate(dt); }; }
{ const prev=Meta.hud; Meta.hud=()=>{ prev(); if(fam&&!famActive()) famRemove(); }; }   // hud runs in 'dead' too: clear the pet when the crystal falls
window.__familiar={ state:()=>fam?{id:fam.id,kind:fam.g.userData.kind,x:fam.x,y:fam.y,z:fam.z,yaw:fam.yaw,inScene:fam.g.parent===scene,visible:fam.g.visible,target:!!fam.target,cd:fam.cd}:null, bolts:()=>famBolts.length, model:()=>fam&&fam.g, rate:famRate, dmg:famDmg, build:famModel };
