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
function swordFor(it){ if(!it) return 'rusty'; const n=(it.name||'').toLowerCase(), r=Math.max(0,Math.min(4,it.rarity|0));
  if(/cleaver|goblin|venom|serpent/.test(n)) return 'venom';
  if(/ember|flame|fire|dragon|blaze/.test(n)) return 'flame';
  if(/frost|\bice\b|deep|storm|moon|silver/.test(n)) return 'frost';
  if(/crystal|eternal|mythic|holy|sacred/.test(n)) return 'holy';
  for(const [k,v] of BASE_SWORD) if(n.includes(k)) return v;
  return ['rusty','rusty','frost','flame','holy'][r]; }
// the witch's whip for an item: crystal and holy by name, bone for goblin-bane, barbed iron for embers and heavy hafts, thornvine for the deep and the moon, chain for the broad blades, rope otherwise; rarity decides the rest
function whipFor(it){ if(!it) return 'whip-rope'; const n=(it.name||'').toLowerCase(), r=Math.max(0,Math.min(4,it.rarity|0));
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
  out.userData.segs=segs; out.userData.box=box; return out; }
function loadSword(name,cb){ if(tpl[name]) return cb(tpl[name]); if(loading[name]){ loading[name].push(cb); return; } loading[name]=[cb];
  fetchBytes(ASSET(MODELS[name])).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ let root=gltf.scene||gltf.scenes[0]; if(/^whip-/.test(name)) root=rigWhip(root); root.traverse(m=>{ if(m.isMesh) m.frustumCulled=false; }); root.updateMatrixWorld(true); if(!root.userData.box) root.userData.box=new THREE.Box3().setFromObject(root);   // the model's own frame: pommel at box.min.y, tip at box.max.y (static props stand on y=0)
    tpl[name]=root; const cbs=loading[name]; delete loading[name]; cbs.forEach(f=>f(root)); },e=>{ console.warn('sword '+name,e); delete loading[name]; })).catch(e=>{ console.warn('sword '+name,e); delete loading[name]; }); }
const W={key:'',obj:null,hand:null,tier:1};
function heroMount(){ if(!(useGLB&&GLBH&&GLBH.root)) return null; if(GLBH.mountNode===undefined){ let n=null; GLBH.root.traverse(o=>{ if(!n&&/^(weapon|whip)Mount_\d+/.test(o.name)) n=o; }); GLBH.mountNode=n; }   // an empty node under the hand bone: position = grip, +Y = blade axis (or the way a whip hangs), name = length in cm
  const n=GLBH.mountNode; return n?{node:n,len:+n.name.split('_')[1],whip:/^whip/.test(n.name)}:null; }
function unmount(){ if(W.obj&&W.obj.parent) W.obj.parent.remove(W.obj); W.obj=null; W.hand=null; }
function mountSword(name,tier,key){ const hm=heroMount(); if(!hm) return; loadSword(name,root=>{ if(W.key!==key) return;   // a newer request won
    unmount(); const {node,len,whip}=hm; const obj=root.clone(); const box=root.userData.box; const L=box.max.y-box.min.y; let gripY, tipY, s;
    if(whip){ gripY=box.max.y; tipY=box.min.y; s=(len*lenMul(tier))/L; obj.rotation.z=PI; obj.scale.setScalar(s); obj.position.set(0,box.max.y*s,0); }   // the handle (top of the model) in the fist, the lash hanging down the mount's +Y
    else { gripY=box.min.y+GRIP_F*L; tipY=box.max.y; s=(len*lenMul(tier))/(box.max.y-gripY); obj.scale.setScalar(s); obj.position.set(0,-gripY*s,0); }   // the grip point sits on the mount (in the fist); the blade runs up the mount's +Y
    // ink outline + toon shading like everything else; the outline thickness accounts for the mount scale and the hero's fit
    node.updateWorldMatrix(true,false); const worldPerUnit=s*node.getWorldScale(new THREE.Vector3()).x; toonify(obj,worldPerUnit);
    obj.userData.sword={name,tier,scale:s,gripY,tipY,len:L,whip:!!whip}; if(whip){ const segs=[]; obj.traverse(o=>{ if(/^lash\d/.test(o.name)) segs.push(o); }); segs.sort((a,b)=>a.name.localeCompare(b.name)); obj.userData.segs=segs; }
    node.add(obj); W.obj=obj; W.hand=node.parent; W.tier=tier; }); }
// the lash: a lazy sway at rest, a wave that runs down the segments on a swing (the handle leads, the tip cracks last)
function whipAnim(){ const o=W.obj; if(!(o&&o.userData.segs)) return; const segs=o.userData.segs, t=S.t; const p=hero.swingT>=0?Math.min(1,hero.swingT/swingDur()):-1;
  segs.forEach((sg,k)=>{ const lag=k/(segs.length-1||1); let ax=Math.sin(t*2.4-k*.8)*.10*(.4+lag), az=Math.sin(t*1.7+k*.6)*.07*lag;
    if(p>=0){ const q=Math.max(0,Math.min(1,(p*1.6-lag*.45))); ax+=-Math.sin(q*PI)*(1.0+.8*lag); az+=Math.sin(q*PI*2)*.35*lag; }   // the crack
    sg.rotation.x=ax; sg.rotation.z=az; }); }
function weaponsUpdate(){ const hm=heroMount(); if(!hm){ if(W.obj) unmount(); W.key=''; return; } if(W.obj&&W.obj.parent&&W.obj.parent!==hm.node) unmount();   // the hero model changed: drop the old weapon at once, the new one follows when its model is ready
  whipAnim(); const it=gear.weapon, name=hm.whip?whipFor(it):swordFor(it), tier=swordTier(it); const key=name+'|'+tier+'|'+GLBH.label; if(key===W.key&&W.obj&&W.obj.parent===hm.node) return; W.key=key; mountSword(name,tier,key); }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); weaponsUpdate(); }; }
// preload the plain sword so the hero is never empty-handed for long
loadSword('rusty',()=>{});
// where the blade is right now, in world units (tests, and anything that wants to hang an effect on the sword)
function bladeWorld(){ if(!(W.obj&&W.obj.parent)) return null; const sd=W.obj.userData.sword, box=tpl[sd.name].userData.box; W.obj.updateWorldMatrix(true,false); const p=v=>W.obj.localToWorld(v.clone()).toArray().map(x=>+x.toFixed(3));
  const cx=(box.min.x+box.max.x)/2, cz=(box.min.z+box.max.z)/2; return {pommel:p(new THREE.Vector3(cx,sd.whip?box.max.y:box.min.y,cz)),grip:p(new THREE.Vector3(cx,sd.gripY,cz)),tip:p(new THREE.Vector3(cx,sd.tipY,cz)),mount:W.obj.parent.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3)),hand:W.hand.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3))}; }
window.__weapons={state:()=>({key:W.key,mounted:!!(W.obj&&W.obj.parent),whip:!!(W.obj&&W.obj.userData.sword&&W.obj.userData.sword.whip),segs:W.obj&&W.obj.userData.segs?W.obj.userData.segs.length:0,segRot:W.obj&&W.obj.userData.segs?W.obj.userData.segs.map(s=>+s.rotation.x.toFixed(2)):null,hand:W.hand?W.hand.name:null,tier:W.tier,loaded:Object.keys(tpl),mount:GLBH&&GLBH.mountNode?{bone:GLBH.mountNode.parent.name,len:+GLBH.mountNode.name.split('_')[1]}:null,label:GLBH&&GLBH.label}),swordFor,whipFor,swordTier,blade:bladeWorld,testWhip:name=>new Promise(res=>loadSword(name,root=>res({segs:(root.userData.segs||[]).length,box:root.userData.box?root.userData.box.max.y-root.userData.box.min.y:0})))};
})();
