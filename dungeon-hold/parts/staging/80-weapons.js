// ===== VISIBLE WEAPONS: the sword in the gnome's hand is the weapon you wear. Sword models live in assets/ and are mounted
// on the hero's right-hand bone at the mount the model carries (an empty node recorded when the baked sword was cut out).
(function(){
const SWORDS={rusty:'sword-rusty.glb',venom:'sword-venom.glb',frost:'sword-frost.glb',flame:'sword-flame.glb',holy:'sword-holy.glb'};
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
function swordTier(it){ return it?Math.max(1,Math.min(5,it.tier||tierOf(it.lvl||1))):1; }
function lenMul(tier){ return .8+.07*(tier-1); }   // a tier-1 blade is a bit short of the baked one; tier 5 a touch longer
function loadSword(name,cb){ if(tpl[name]) return cb(tpl[name]); if(loading[name]){ loading[name].push(cb); return; } loading[name]=[cb];
  fetchBytes(ASSET(SWORDS[name])).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ const root=gltf.scene||gltf.scenes[0]; root.traverse(m=>{ if(m.isMesh) m.frustumCulled=false; }); root.updateMatrixWorld(true); root.userData.box=new THREE.Box3().setFromObject(root);   // the model's own frame: pommel at box.min.y, tip at box.max.y (static props stand on y=0)
    tpl[name]=root; const cbs=loading[name]; delete loading[name]; cbs.forEach(f=>f(root)); },e=>{ console.warn('sword '+name,e); delete loading[name]; })).catch(e=>{ console.warn('sword '+name,e); delete loading[name]; }); }
const W={key:'',obj:null,hand:null,tier:1};
function heroMount(){ if(!(useGLB&&GLBH&&GLBH.root)) return null; if(GLBH.mountNode===undefined){ let n=null; GLBH.root.traverse(o=>{ if(!n&&/^weaponMount_\d+/.test(o.name)) n=o; }); GLBH.mountNode=n; }   // an empty node under the hand bone: position = grip, +Y = blade axis, name = blade length in cm
  const n=GLBH.mountNode; return n?{node:n,len:+n.name.split('_')[1]}:null; }
function unmount(){ if(W.obj&&W.obj.parent) W.obj.parent.remove(W.obj); W.obj=null; W.hand=null; }
function mountSword(name,tier,key){ const hm=heroMount(); if(!hm) return; loadSword(name,root=>{ if(W.key!==key) return;   // a newer request won
    unmount(); const {node,len}=hm; const obj=root.clone(); const box=root.userData.box; const L=box.max.y-box.min.y, gripY=box.min.y+GRIP_F*L;
    const s=(len*lenMul(tier))/(box.max.y-gripY);   // tip lands where the baked blade's tip was, scaled by tier
    obj.scale.setScalar(s); obj.position.set(0,-gripY*s,0);   // the grip point sits on the mount (in the fist); the blade runs up the mount's +Y
    // ink outline + toon shading like everything else; the outline thickness accounts for the mount scale and the hero's fit
    node.updateWorldMatrix(true,false); const worldPerUnit=s*node.getWorldScale(new THREE.Vector3()).x; toonify(obj,worldPerUnit);
    obj.userData.sword={name,tier,scale:s,gripY,len:L}; node.add(obj); W.obj=obj; W.hand=node.parent; W.tier=tier; }); }
function weaponsUpdate(){ const hm=heroMount(); if(!hm){ if(W.obj) unmount(); W.key=''; return; } const it=gear.weapon, name=swordFor(it), tier=swordTier(it); const key=name+'|'+tier+'|'+GLBH.label; if(key===W.key&&W.obj&&W.obj.parent===hm.node) return; W.key=key; mountSword(name,tier,key); }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); weaponsUpdate(); }; }
// preload the plain sword so the hero is never empty-handed for long
loadSword('rusty',()=>{});
// where the blade is right now, in world units (tests, and anything that wants to hang an effect on the sword)
function bladeWorld(){ if(!(W.obj&&W.obj.parent)) return null; const sd=W.obj.userData.sword, box=tpl[sd.name].userData.box; W.obj.updateWorldMatrix(true,false); const p=v=>W.obj.localToWorld(v.clone()).toArray().map(x=>+x.toFixed(3));
  const cx=(box.min.x+box.max.x)/2, cz=(box.min.z+box.max.z)/2; return {pommel:p(new THREE.Vector3(cx,box.min.y,cz)),grip:p(new THREE.Vector3(cx,sd.gripY,cz)),tip:p(new THREE.Vector3(cx,box.max.y,cz)),mount:W.obj.parent.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3)),hand:W.hand.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3))}; }
window.__weapons={state:()=>({key:W.key,mounted:!!(W.obj&&W.obj.parent),hand:W.hand?W.hand.name:null,tier:W.tier,loaded:Object.keys(tpl),mount:GLBH&&GLBH.mountNode?{bone:GLBH.mountNode.parent.name,len:+GLBH.mountNode.name.split('_')[1]}:null,label:GLBH&&GLBH.label}),swordFor,swordTier,blade:bladeWorld};
})();
