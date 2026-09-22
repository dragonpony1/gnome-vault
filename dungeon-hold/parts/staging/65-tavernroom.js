// ===== THE TAVERN AS A PLACE: a snug room through the south door of the hall (rows 25..31 of the grid). Three stations you
// walk up to — your LOCKER (bag), the BARKEEP (shop) and the TRAINER (skills) — open the matching page with E. The 🎒 / I
// shortcut still works from anywhere; walking there is the intended way between waves.
(function(){
const wood=mat(0x6b4a2a), dark=mat(0x2b2540), plank=mat(0x8a5e34), stone=mat(0x4a4262), cream=mat(0xf1e6d0), gold=mat(0xe0b040), brass=mat(0xc9a44a);
const room=new THREE.Group(); world.add(room);
const TD=MAP.tavern||{dx:0,dz:0}; const at=(x,z)=>[cw(x+TD.dx),cwz(z+TD.dz)];   // grid → world, in map 1's room coordinates shifted to where this map keeps its tavern
// --- text sprites for the station labels (canvas → sprite: no fonts fetched, CSP-safe) ---
function label(txt,col){ const c=document.createElement('canvas'); c.width=256; c.height=64; const g=c.getContext('2d'); g.font='bold 34px Georgia,serif'; g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=6; g.strokeStyle='#120c1a'; g.strokeText(txt,128,34); g.fillStyle=col||'#e8b94a'; g.fillText(txt,128,34);
  const t=new THREE.CanvasTexture(c); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false})); s.scale.set(2.6,.65,1); s.userData.noOL=true; return s; }
// --- furniture ---
const [lx,lz]=at(12,26), [tx,tz]=at(13,30), [bx,bz]=at(19,28), [hx,hz]=at(16,31), [dx,dz]=at(16,24);
{ // the locker: a tall wardrobe against the west wall, gold trim, your name on it
  const g=new THREE.Group(); g.position.set(lx-.35,0,lz); g.add(M(G.box(.7,2.3,1.4),dark,0,1.15,0)); g.add(M(G.box(.74,.08,1.44),gold,0,2.3,0)); g.add(M(G.box(.74,.08,1.44),gold,0,.08,0));
  g.add(M(G.box(.06,1.9,.6),plank,.36,1.15,-.34)); g.add(M(G.box(.06,1.9,.6),plank,.36,1.15,.34)); g.add(M(G.sph(.05,6,5),brass,.4,1.15,-.06)); g.add(M(G.sph(.05,6,5),brass,.4,1.15,.06)); room.add(outline(g)); const l=label('LOCKER'); l.position.set(lx+.2,3.0,lz); room.add(l); }
{ // the bar: counter along the east wall with mugs, a shelf of bottles behind
  const g=new THREE.Group(); g.position.set(bx,0,bz); g.add(M(G.box(1.0,1.05,5.6),wood,0,.52,0)); g.add(M(G.box(1.2,.12,5.8),plank,0,1.1,0)); g.add(M(G.box(.06,.9,5.4),dark,-.5,.5,0));
  [[-.2,-2],[.1,-.6],[-.1,1.1],[.2,2.2]].forEach(([mx,mz])=>{ g.add(M(G.cyl(.13,.11,.26,8),cream,mx,1.29,mz)); g.add(M(new THREE.TorusGeometry(.09,.025,5,10),cream,mx+.16,1.29,mz)); });
  g.add(M(G.box(.3,.08,5.4),plank,1.0,2.3,0)); g.add(M(G.box(.3,.08,5.4),plank,1.0,3.1,0)); const cols=[0x6a9a3a,0xc8262b,0x2fb8e8,0xe0b040,0x9a5ab8,0xf1e6d0]; for(let k=0;k<11;k++){ const c=cols[k%cols.length]; g.add(M(G.cyl(.09,.11,.42,7),mat(c),1.0,(k%2?2.55:3.35),-2.4+k*.48)); }
  room.add(outline(g)); const l=label('BARKEEP'); l.position.set(bx-.6,3.3,bz); room.add(l); }
{ // the trainer's corner: a straw dummy on a post, a rack with two practice swords
  const g=new THREE.Group(); g.position.set(tx,0,tz+.2); g.add(M(G.cyl(.08,.1,1.4,7),wood,0,.7,0)); const body=M(G.cyl(.32,.38,.9,9),mat(0xcdb27a),0,1.55,0); g.add(body); g.add(M(G.sph(.28,9,7),mat(0xcdb27a),0,2.25,0)); g.add(M(G.box(1.3,.12,.12),wood,0,1.75,0));
  g.add(M(G.box(.06,1.1,.06),dark,-.7,.55,.5)); g.add(M(G.box(.06,1.1,.06),dark,.7,.55,.5)); g.add(M(G.box(1.5,.06,.06),dark,0,1.1,.5)); [[-.35,.45],[.3,.45]].forEach(([sx,sz])=>{ const b=M(G.box(.06,.9,.03),wood,sx,.65,sz); b.rotation.z=.12; g.add(b); g.add(M(G.box(.22,.05,.05),dark,sx,.25,sz)); });
  room.add(outline(g)); const l=label('TRAINER'); l.position.set(tx,3.2,tz); room.add(l); }
{ // the hearth on the south wall
  const g=new THREE.Group(); g.position.set(hx,0,hz+.55); g.add(M(G.box(3.0,2.6,.9),stone,0,1.3,0)); g.add(M(G.box(3.3,.25,1.1),mat(0x5a5276),0,2.7,0)); g.add(M(G.box(1.6,1.4,.6),mat(0x1a1420),0,.75,-.25));
  const f=M(G.cone(.42,.9,7),basic(0xff7a1a),0,.6,-.3); f.userData.noOL=true; const f2=M(G.cone(.22,.6,7),basic(0xffd060),0,.55,-.32); f2.userData.noOL=true; g.add(f,f2); flames.push({f,f2,p:1.7}); const gl=glow(0xff8a2a,3.6,.7); gl.position.set(0,.9,-.3); g.add(gl);
  [[-.5,.2,-.2],[.4,.2,-.15]].forEach(([x,y,z])=>{ const lg=M(G.cyl(.09,.09,.8,6),wood,x,y,z); lg.rotation.z=PI/2; g.add(lg); }); room.add(outline(g)); }
{ // a table with stools, and a rug by the door
  const [ux,uz]=at(15,28); const g=new THREE.Group(); g.position.set(ux+1,0,uz); g.add(M(G.cyl(.9,.9,.1,12),plank,0,.9,0)); g.add(M(G.cyl(.12,.16,.9,7),wood,0,.45,0)); g.add(M(G.cyl(.4,.4,.08,10),dark,0,.06,0));
  [[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]].forEach(([sx,sz])=>{ g.add(M(G.cyl(.3,.3,.08,9),plank,sx,.5,sz)); g.add(M(G.cyl(.06,.08,.5,6),wood,sx,.25,sz)); }); g.add(M(G.cyl(.13,.11,.26,8),cream,.3,1.08,.2)); room.add(outline(g)); }
{ // the anvil in the north-east corner: a stump, the anvil, a hammer left on it — the forge
  const [ax,az]=at(19,25); const g=new THREE.Group(); g.position.set(ax,0,az+.35); g.add(M(G.cyl(.42,.5,.7,9),wood,0,.35,0)); g.add(M(G.box(.9,.22,.4),mat(0x3a3648),0,.85,0)); g.add(M(G.box(.5,.16,.34),mat(0x3a3648),.55,.86,0)); g.add(M(G.cone(.17,.5,6),mat(0x3a3648),-.6,.85,0)).rotation.z=PI/2;
  g.add(M(G.box(.18,.1,.14),dark,.1,1.01,.04)).rotation.y=.5; const hd=M(G.cyl(.02,.02,.5,5),wood,-.1,1.03,.12); hd.rotation.z=1.2; hd.rotation.y=.5; g.add(hd); const em=glow(0xff8a2a,.9,.5); em.position.set(-.2,1.05,0); g.add(em); room.add(outline(g)); const l=label('ANVIL'); l.position.set(ax,2.9,az+.3); room.add(l); window.__anvil=[ax,az+.35]; grid[idx(19+TD.dx,25+TD.dz)]=T.PROP;
  // the smith: an orc in a leather apron (Meshy), standing at his anvil; toon-shaded like the hall
  fetchBytes(ASSET('smith.glb')).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ try{ const root=gltf.scene||gltf.scenes[0]; const fit=fitModel(root,2.9); toonify(root,fit.scale); const w=fit.wrap; w.position.set(ax+.9,0,az+1.75); w.rotation.y=Math.atan2(-.9,-1.4); room.add(w); window.__smith=w; /* south-east of the anvil, inside the room, turned to face it */ }catch(e){ console.warn('smith model',e); } },e=>console.warn('smith model',e))).catch(e=>console.warn('smith model',e)); }
{ // the sign over the door, seen from the hall
  const s=label('TAVERN','#ffd060'); s.scale.set(3.4,.85,1); s.position.set(dx,5.0,dz-1.1); room.add(s); const l=new THREE.PointLight(C(0xffb05a),1.1,9,2); l.position.set(dx,3.4,dz); l.userData.base=1.1; scene.add(l); torchLights.push(l); }
// --- two gnomes who live here: the barkeep behind the bar, the trainer by the dummy ---
function npc(x,z,yaw,apron){ const n=makeHero(); n.g.position.set(x,0,z); n.g.rotation.y=yaw; n.g.scale.setScalar(.95); if(apron){ const a=M(G.box(.5,.55,.06),cream,0,.55,.27); n.g.add(a); } world.add(n.g); return n; }
const keep=npc(bx+.85,bz,-PI/2,true), trainer=npc(tx+1.3,tz-.6,PI*.7,false);
// --- stations ---
const STATIONS=[{x:lx+.6,z:lz,tab:'bag',what:'your locker (bag)'},{x:bx-1.0,z:bz,tab:'shop',what:'the barkeep (buy & sell)'},{x:tx+.4,z:tz-.4,tab:'skills',what:'the trainer (skills)'},{x:window.__anvil[0]-1.0,z:window.__anvil[1]+.3,tab:'forge',what:'the smith (upgrade your gear)'},{x:at(13.65,25.42)[0],z:at(13.65,25.42)[1]+1.1,tab:'armory',what:'the armory (keep your treasures)'}];
let near=null, told=false;
function nearest(){ let best=null, bd=2.6; for(const st of STATIONS){ const d=Math.hypot(hero.x-st.x,hero.z-st.z); if(d<bd){ bd=d; best=st; } } return best; }
function visit(st){ if(st.tab==='forge'){ if(window.__doll&&window.__doll.open(true)){ SFX.place(); return true; } return false; } if(st.tab==='armory'){ if(window.__doll&&window.__doll.open()){ const a=(Meta.armory&&Meta.armory())||[]; window.__doll.select(a.length?a[0].id:null,'arm'); SFX.place(); return true; } return false; } if(!(typeof Tavern!=='undefined'&&Tavern)) return false; Tavern.open(); Tavern.tab(st.tab); SFX.place(); return true; }
const upgradeProc=upgrade; upgrade=function(){ if(near&&!placing&&!Meta.isOpen()){ visit(near); return; } upgradeProc(); };   // E (and the 🔧 touch button) at a station opens it
addEventListener('keydown',e=>{ if(e.code!=='KeyE'||!near||placing||Meta.isOpen()||S.phase==='start'||S.phase==='dead') return; if(visit(near)){ e.stopImmediatePropagation(); e.preventDefault(); } },true);
function roomUpdate(dt){ near=nearest(); const t=S.t; keep.g.position.y=Math.sin(t*2.2)*.02; keep.armR.rotation.x=-.4+Math.sin(t*1.7)*.15; trainer.armR.rotation.x=-1.2+Math.sin(t*3.1)*.5; trainer.head.rotation.y=Math.sin(t*.8)*.3;
  if(!told&&S.phase==='build'){ told=true; setTimeout(()=>{ if(S.phase==='build') toast('The tavern is through the south door — locker, barkeep, trainer and the anvil are in there'); },4200); } }
function roomHud(){ if(S.phase==='start') return; const el=$('prompt'); if(near&&!placing&&!Meta.isOpen()){ const want='E  '+near.what; if(el.textContent!==want) el.textContent=want; } }
{ const pu=Meta.update; Meta.update=dt=>{ pu(dt); roomUpdate(dt); }; const ph=Meta.hud; Meta.hud=()=>{ ph(); roomHud(); }; }
window.__room={stations:()=>STATIONS.map(s=>({x:+s.x.toFixed(2),z:+s.z.toFixed(2),tab:s.tab})),near:()=>near&&near.tab,door:[dx,dz],bounds:{x0:at(12,25)[0]-1,x1:at(20,31)[0]+1,z0:at(12,25)[1]-1,z1:at(20,31)[1]+1}};
})();
