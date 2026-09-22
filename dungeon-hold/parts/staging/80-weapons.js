// ===== VISIBLE WEAPONS: the sword in the gnome's hand is the weapon you wear. Sword models live in assets/ and are mounted
// on the hero's right-hand bone at the mount the model carries (an empty node recorded when the baked sword was cut out).
(function(){
const SWORDS={rusty:'sword-rusty.glb',venom:'sword-venom.glb',frost:'sword-frost.glb',flame:'sword-flame.glb',holy:'sword-holy.glb'};
const WHIPS={rope:'whip-rope.glb',chain:'whip-chain.glb',thorn:'whip-thorn.glb',barbed:'whip-barbed.glb',bone:'whip-bone.glb',crystal:'whip-crystal.glb',holy:'whip-holy.glb'};   // the witch's set: handle at the top of the model, lash hanging to y=0
const MODELS=Object.assign({},SWORDS,Object.fromEntries(Object.entries(WHIPS).map(([k,v])=>['whip-'+k,v])));
const GRIP_F=0.17;                        // the fist closes this far up the sword from the pommel (fraction of its full length)
const tpl={}, loading={};                 // name -> template root (bounds in userData.box) / pending callbacks
// which model an item shows: its name decides (cleavers are the goblin blade, embers burn, storms and the deep are ice,
// crystal and myth are holy), then the base weapon, then rarity — so a new find usually looks new in the hand
const BASE_SWORD=[['shortsword','rusty'],['broadsword','rusty'],['cleaver','venom'],['warhammer','flame'],['halberd','frost'],['gnome blade','holy']];
function swordFor(it){ if(!it) return 'rusty'; const n=(it.name||'').toLowerCase(), r=Math.max(0,Math.min(4,it.rarity|0)); const pk=Meta.packs&&Meta.packs.of(it); if(pk&&pk.models&&pk.models.sword) return pk.models.sword;   // a great set's stand-in blade until its own model lands
  if(/cleaver|goblin|venom|serpent/.test(n)) return 'venom';
  if(/ember|flame|fire|dragon|blaze/.test(n)) return 'flame';
  if(/frost|\bice\b|deep|storm|moon|silver/.test(n)) return 'frost';
  if(/crystal|eternal|mythic|holy|sacred/.test(n)) return 'holy';
  for(const [k,v] of BASE_SWORD) if(n.includes(k)) return v;
  return ['rusty','rusty','frost','flame','holy'][r]; }
// the witch's whip for an item: crystal and holy by name, bone for goblin-bane, barbed iron for embers and heavy hafts, thornvine for the deep and the moon, chain for the broad blades, rope otherwise; rarity decides the rest
function whipFor(it){ if(!it) return 'whip-rope'; const n=(it.name||'').toLowerCase(), r=Math.max(0,Math.min(4,it.rarity|0)); const pk=Meta.packs&&Meta.packs.of(it); if(pk&&pk.models&&pk.models.whip) return pk.models.whip;
  if(/crystal/.test(n)) return 'whip-crystal'; if(/holy|eternal|mythic|sacred|radiant/.test(n)) return 'whip-holy'; if(/goblin|bone|venom|skull/.test(n)) return 'whip-bone';
  if(/ember|flame|fire|iron|warhammer|halberd|storm/.test(n)) return 'whip-barbed'; if(/thorn|vine|deep|moon|silver|frost/.test(n)) return 'whip-thorn'; if(/chain|broadsword|cleaver/.test(n)) return 'whip-chain';
  return ['whip-rope','whip-chain','whip-thorn','whip-barbed','whip-holy'][r]; }
function swordTier(it){ return it?Math.max(1,Math.min(5,it.tier||tierOf(it.lvl||1))):1; }
function lenMul(tier){ return .8+.07*(tier-1); }   // a tier-1 blade is a bit short of the baked one; tier 5 a touch longer
const LASH_SEGS=5;
function rigWhip(root){ let mesh=null; root.traverse(m=>{ if(!mesh&&m.isMesh) mesh=m; }); if(!mesh) return root; root.updateMatrixWorld(true); const g=mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld); const pos=g.attributes.position, gi=g.getIndex(); const n=gi?gi.count:pos.count; const vid=i=>gi?gi.getX(i):i;
  const box=new THREE.Box3().setFromBufferAttribute(pos); const top=box.max.y, hEnd=top-(top-box.min.y)*.2, segH=(hEnd-box.min.y)/LASH_SEGS;   // the top fifth is the handle; the rest is lash, in five bands
  const bands=[]; for(let k=0;k<=LASH_SEGS;k++) bands.push([]); const v=new THREE.Vector3();
  for(let i=0;i+2<n;i+=3){ let y=0; for(let q=0;q<3;q++){ v.fromBufferAttribute(pos,vid(i+q)); y+=v.y; } y/=3; const k=y>=hEnd?0:1+Math.min(LASH_SEGS-1,Math.floor((hEnd-y)/segH)); bands[k].push(vid(i),vid(i+1),vid(i+2)); }
  const out=new THREE.Group(); let parent=out, prevPivot=new THREE.Vector3(0,0,0); const segs=[];
  for(let k=0;k<=LASH_SEGS;k++){ if(!bands[k].length) continue; const pg=g.clone(); pg.setIndex(bands[k]); const yTop=k===0?top:hEnd-(k-1)*segH; const c=new THREE.Vector3(); let cn=0; for(const id of bands[k]){ v.fromBufferAttribute(pos,id); if(Math.abs(v.y-yTop)<segH*.25){ c.add(v); cn++; } } if(cn) c.multiplyScalar(1/cn); else c.set(0,yTop,0); c.y=yTop;   // the pivot: the centre of the band's top ring
    const piv=new THREE.Group(); piv.name=k===0?'handle':'lash'+k; piv.position.copy(c).sub(prevPivot); pg.translate(-c.x,-c.y,-c.z); const m=new THREE.Mesh(pg,mesh.material); m.frustumCulled=false; piv.add(m); parent.add(piv); parent=piv; prevPivot=c; if(k>0) segs.push(piv); }
  out.userData.nseg=segs.length; out.userData.segH=segH; out.userData.box=box; return out; }   // plain numbers only: a clone JSON-copies userData
function loadSword(name,cb){ if(tpl[name]) return cb(tpl[name]); if(loading[name]){ loading[name].push(cb); return; } loading[name]=[cb];
  fetchBytes(ASSET(MODELS[name])).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ let root=gltf.scene||gltf.scenes[0]; if(/^whip-/.test(name)) root=rigWhip(root); root.traverse(m=>{ if(m.isMesh) m.frustumCulled=false; }); root.updateMatrixWorld(true); if(!root.userData.box) root.userData.box=new THREE.Box3().setFromObject(root);   // the model's own frame: pommel at box.min.y, tip at box.max.y (static props stand on y=0)
    tpl[name]=root; const cbs=loading[name]; delete loading[name]; cbs.forEach(f=>f(root)); },e=>{ console.warn('sword '+name,e); delete loading[name]; })).catch(e=>{ console.warn('sword '+name,e); delete loading[name]; }); }
const W={key:'',obj:null,hand:null,tier:1};
function setTint(obj,pk){ obj.traverse(m=>{ if(m.isMesh&&!m.userData.isOL&&m.material&&m.material.emissive){ m.material=m.material.clone(); m.material.color.multiplyScalar(.45); m.material.emissive.set(pk.emissive); m.material.emissiveIntensity=.8; } }); obj.userData.void=true; obj.userData.set=pk.name; }   // a great set's piece: the stand-in model darkens and burns with the set's colour from within
function heroMount(){ if(!(useGLB&&GLBH&&GLBH.root)) return null; if(GLBH.mountNode===undefined){ let n=null; GLBH.root.traverse(o=>{ if(!n&&/^(weapon|whip)Mount_\d+/.test(o.name)) n=o; }); GLBH.mountNode=n; }   // an empty node under the hand bone: position = grip, +Y = blade axis (or the way a whip hangs), name = length in cm
  const n=GLBH.mountNode; return n?{node:n,len:+n.name.split('_')[1],whip:/^whip/.test(n.name)}:null; }
function unmount(){ if(W.obj&&W.obj.parent) W.obj.parent.remove(W.obj); W.obj=null; W.hand=null; }
function mountSword(name,tier,key){ const hm=heroMount(); if(!hm) return; loadSword(name,root=>{ if(W.key!==key) return;   // a newer request won
    unmount(); const {node,len,whip}=hm; const obj=root.clone(); const box=root.userData.box; const L=box.max.y-box.min.y; let gripY, tipY, s;
    if(whip){ gripY=box.max.y; tipY=box.min.y; s=(len*lenMul(tier))/L; obj.rotation.z=PI; obj.scale.setScalar(s); obj.position.set(0,box.max.y*s,0); }   // the handle (top of the model) in the fist, the lash hanging down the mount's +Y
    else { gripY=box.min.y+GRIP_F*L; tipY=box.max.y; s=(len*lenMul(tier))/(box.max.y-gripY); obj.scale.setScalar(s); obj.position.set(0,-gripY*s,0); }   // the grip point sits on the mount (in the fist); the blade runs up the mount's +Y
    // ink outline + toon shading like everything else; the outline thickness accounts for the mount scale and the hero's fit
    node.updateWorldMatrix(true,false); const worldPerUnit=s*node.getWorldScale(new THREE.Vector3()).x; toonify(obj,worldPerUnit); { const m=/\|set:(.+)$/.exec(key); const pk=m&&Meta.packs&&Meta.packs.get(m[1]); if(pk) setTint(obj,pk); }
    obj.userData.sword={name,tier,scale:s,gripY,tipY,len:L,whip:!!whip}; if(whip){ const segs=[]; obj.traverse(o=>{ if(/^lash\d/.test(o.name)) segs.push(o); }); segs.sort((a,b)=>a.name.localeCompare(b.name)); obj.userData.segs=segs; }
    node.add(obj); W.obj=obj; W.hand=node.parent; W.tier=tier; }); }
// the lash is a rope: five points hang from the end of the handle, fall under gravity, keep their lengths and trail the fist
// (a swing drags them behind the hand and they snap round after it; at rest they hang, stirred by a faint breeze); each lash
// segment then points at the next point down the rope. Nothing here changes what a swing hits — that is hero.reach
const LASH_G=-16, LASH_DAMP=.955, LASH_DOWN=new THREE.Vector3(0,-1,0), _wq=new THREE.Quaternion(), _wv=new THREE.Vector3(), _wd=new THREE.Vector3(), _wp=new THREE.Vector3();
function whipInit(o,p0){ const segs=o.userData.segs, n=segs.length, segH=tpl[o.userData.sword.name].userData.segH||.3; segs.forEach(s=>s.quaternion.identity()); o.updateWorldMatrix(true,true);
  const rest=[]; let prev=segs[0].getWorldPosition(new THREE.Vector3()); for(let k=1;k<=n;k++){ const p=k<n?segs[k].getWorldPosition(new THREE.Vector3()):segs[n-1].localToWorld(new THREE.Vector3(0,-segH,0)); rest.push(Math.max(.02,p.distanceTo(prev))); prev=p; }
  const pts=[p0.clone()], prv=[p0.clone()]; let cum=0; for(let k=0;k<n;k++){ cum+=rest[k]; pts.push(new THREE.Vector3(p0.x,p0.y-cum,p0.z)); prv.push(pts[k+1].clone()); }   // starts hanging straight down
  return o.userData.whip={pts,prev:prv,rest}; }
function whipAnim(dt){ const o=W.obj; if(!(o&&o.userData.segs)) return; const segs=o.userData.segs, n=segs.length; const p0=segs[0].getWorldPosition(_wp);   // the top of the lash, wherever the handle is now
  let ws=o.userData.whip; if(!ws||p0.distanceTo(ws.pts[0])>2) ws=whipInit(o,p0);   // a teleport (respawn, a test) restarts the rope
  const pts=ws.pts, prev=ws.prev, rest=ws.rest, h=Math.min(dt||1/60,.05), wx=Math.sin(S.t*1.1)*1.5, wz=Math.cos(S.t*.7)*1.2; pts[0].copy(p0);
  for(let k=1;k<=n;k++){ const p=pts[k]; _wv.copy(p).sub(prev[k]).multiplyScalar(LASH_DAMP); prev[k].copy(p); p.add(_wv); p.x+=wx*h*h; p.y+=LASH_G*h*h; p.z+=wz*h*h; }
  for(let it=0;it<3;it++) for(let k=1;k<=n;k++){ const a=pts[k-1], b=pts[k]; _wd.copy(b).sub(a); const L=_wd.length()||1e-6; _wd.multiplyScalar((rest[k-1]-L)/L); if(k===1) b.add(_wd); else { a.addScaledVector(_wd,-.5); b.addScaledVector(_wd,.5); } }   // the first point is pinned to the handle
  for(let k=1;k<=n;k++){ const p=pts[k], fl=(typeof floorH==='function'?floorH(p.x,p.z):0)+.03; if(p.y<fl) p.y=fl; }
  for(let k=0;k<n;k++){ const sg=segs[k]; sg.parent.getWorldQuaternion(_wq); _wd.copy(pts[k+1]).sub(pts[k]).normalize().applyQuaternion(_wq.invert()); sg.quaternion.setFromUnitVectors(LASH_DOWN,_wd); } }
function weaponsUpdate(dt){ const hm=heroMount(); if(!hm){ if(W.obj) unmount(); W.key=''; return; } if(W.obj&&W.obj.parent&&W.obj.parent!==hm.node) unmount();   // the hero model changed: drop the old weapon at once, the new one follows when its model is ready
  whipAnim(dt); const it=gear.weapon, name=hm.whip?whipFor(it):swordFor(it), tier=swordTier(it); const pk=Meta.packs&&Meta.packs.of(it); const key=name+'|'+tier+'|'+GLBH.label+(pk&&pk.emissive?'|set:'+pk.name:''); if(key===W.key&&W.obj&&W.obj.parent===hm.node) return; W.key=key; mountSword(name,tier,key); }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); weaponsUpdate(dt); }; }
// preload the plain sword so the hero is never empty-handed for long
loadSword('rusty',()=>{});
// where the blade is right now, in world units (tests, and anything that wants to hang an effect on the sword)
function bladeWorld(){ if(!(W.obj&&W.obj.parent)) return null; const sd=W.obj.userData.sword, box=tpl[sd.name].userData.box; W.obj.updateWorldMatrix(true,false); const p=v=>W.obj.localToWorld(v.clone()).toArray().map(x=>+x.toFixed(3));
  const cx=(box.min.x+box.max.x)/2, cz=(box.min.z+box.max.z)/2; return {pommel:p(new THREE.Vector3(cx,sd.whip?box.max.y:box.min.y,cz)),grip:p(new THREE.Vector3(cx,sd.gripY,cz)),tip:p(new THREE.Vector3(cx,sd.tipY,cz)),mount:W.obj.parent.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3)),hand:W.hand.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3))}; }
window.__weapons={tick:dt=>weaponsUpdate(dt),state:()=>({key:W.key,void:!!(W.obj&&W.obj.userData.void),mounted:!!(W.obj&&W.obj.parent),whip:!!(W.obj&&W.obj.userData.sword&&W.obj.userData.sword.whip),segs:W.obj&&W.obj.userData.segs?W.obj.userData.segs.length:0,segRot:W.obj&&W.obj.userData.segs?W.obj.userData.segs.map(s=>+s.rotation.x.toFixed(2)):null,segBend:W.obj&&W.obj.userData.segs?W.obj.userData.segs.map(s=>+(2*Math.acos(Math.min(1,Math.abs(s.quaternion.w)))).toFixed(2)):null,lash:W.obj&&W.obj.userData.whip?W.obj.userData.whip.pts.map(p=>p.toArray().map(x=>+x.toFixed(2))):null,hand:W.hand?W.hand.name:null,tier:W.tier,loaded:Object.keys(tpl),mount:GLBH&&GLBH.mountNode?{bone:GLBH.mountNode.parent.name,len:+GLBH.mountNode.name.split('_')[1]}:null,label:GLBH&&GLBH.label}),swordFor,whipFor,swordTier,blade:bladeWorld,testWhip:name=>new Promise(res=>loadSword(name,root=>res({segs:root.userData.nseg|0,box:root.userData.box?root.userData.box.max.y-root.userData.box.min.y:0})))};
})();
