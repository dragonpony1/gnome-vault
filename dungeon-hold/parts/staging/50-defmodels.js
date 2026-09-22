// ===== DEFENSE MODELS: drop-in GLB art for defenses (static meshes), per kind and per mark =====
// Models live in assets/ next to the page (fetchDefGLB) or can be handed in as base64 (loadDefGLB). Marks without their
// own model use the highest one below them. The game keeps driving the same userData handles it uses on the procedural
// models: yoke (turns to aim / spins), hp / ball (projectile shown while loaded — dummies here), hub (spinner).
const DEFGLB={};                                                     // kind -> [{wrap,scale,turn,tpl}] by mark index
const DEF_H={harpoon:1.6,acorn:1.5,ball:2.2,slice:.6,spike:1.1,totem:2.8,frost:2.4};              // target heights in world units (about the procedural sizes)
const DEF_W={slice:5.0};                                                    // flat things fit by footprint width instead (the ring's toadstools stand at radius 2.3)
const DEF_TURN=/yoke|turret|swivel|head|top|arm|bow|hub|blade|rotor/i; // a node named like this is the part that turns
function regDefGLB(kind,gltf,markIdx){ const root=gltf.scene||gltf.scenes[0]; let targetH=DEF_H[kind]||2; if(DEF_W[kind]){ root.updateMatrixWorld(true); const sz=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()); targetH=DEF_W[kind]*sz.y/Math.max(sz.x,sz.z,1e-6); } const fit=fitModel(root,targetH); toonify(root,fit.scale); let turn=null; root.traverse(o=>{ if(!turn&&o!==root&&DEF_TURN.test(o.name||'')) turn=o.name; }); (DEFGLB[kind]=DEFGLB[kind]||[])[markIdx||0]={wrap:fit.wrap,scale:fit.scale,turn}; }
function loadDefGLB(kind,b64,markIdx,cb){ try{ const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); new THREE.GLTFLoader().parse(u.buffer,'',gltf=>{ try{ regDefGLB(kind,gltf,markIdx); if(cb) cb(null); }catch(e){ console.warn('defense model '+kind,e); if(cb) cb(e); } },e=>{ console.warn('defense model '+kind,e); if(cb) cb(e); }); }catch(e){ console.warn('defense model '+kind,e); if(cb) cb(e); } }
function fetchDefGLB(kind,url,markIdx){ fetchBytes(url).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ try{ regDefGLB(kind,gltf,markIdx); }catch(e){ console.warn('defense model '+kind,e); } },e=>console.warn('defense model '+kind,e))).catch(e=>console.warn('defense model '+kind+' ('+url+')',e)); }
function defTemplate(kind,lvl){ const list=DEFGLB[kind]; if(!list) return null; let i=Math.min(list.length-1,Math.max(0,(lvl||1)-1)); while(i>=0&&!list[i]) i--; return i>=0?list[i]:null; }
// the procedural ring's spore puffs and faint area disc, reused over the Meshy rings
function sporeHub(){ const hub=new THREE.Group(); for(let k=0;k<7;k++){ const a=k/7*TAU, r=.4+((k*5)%3)*.55; const pf=glow(0xd08aff,.7+((k*3)%2)*.3,.3); pf.position.set(Math.cos(a)*r,.4,Math.sin(a)*r); pf.userData.ph=k*.31; hub.add(pf); } return hub; }
function sporeDisc(){ const disc=new THREE.Mesh(new THREE.CircleGeometry(2.5,24),new THREE.MeshBasicMaterial({color:C(0xb04ad0),transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false})); disc.rotation.x=-PI/2; disc.position.y=.04; disc.userData.noOL=true; return disc; }
const makeDefProc=makeDef;
makeDef=function(kind,ghost,lvl){ const T=defTemplate(kind,lvl); if(!T) return makeDefProc(kind,ghost);
  const g=T.wrap.clone(); g.userData.glb=true; g.userData.tpl=T;                         // clone shares geometry + materials (outline shells included)
  let yoke=null; if(T.turn) g.traverse(o=>{ if(!yoke&&o.name===T.turn) yoke=o; });
  if(!yoke){ yoke=new THREE.Group(); const inner=g.children[0]; g.remove(inner); yoke.add(inner); g.add(yoke); }   // no named part: the whole model turns about its footprint centre
  g.userData.yoke=yoke; g.userData.hub=yoke; g.userData.hp=new THREE.Object3D(); g.userData.ball=new THREE.Object3D();
  if(kind==='slice'){ g.userData.yoke=new THREE.Object3D(); g.userData.hub=sporeHub(); g.add(g.userData.hub); if(!ghost) g.add(sporeDisc()); }   // the ring does not spin: its spore puffs drift up as before, over the model
  if(ghost){ g.traverse(m=>{ if(m.isMesh){ if(m.userData.isOL) m.visible=false; else m.material=GHOST_OK; } }); }
  else g.add(blob(.95));
  return g; };
// re-skin a built defense whenever its mark (or a late-loading model) calls for a different look — checked every frame, cheaply
function reskinDefs(){ for(const d of defs){ const T=defTemplate(d.kind,d.lvl); if(!T||d.mdl.userData.tpl===T) continue; const old=d.mdl; scene.remove(old); d.mdl=makeDef(d.kind,false,d.lvl); d.mdl.position.copy(old.position); d.mdl.rotation.y=d.rot; d.mdl.scale.copy(old.scale); scene.add(d.mdl); } }
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); reskinDefs(); }; }
// the ballista (harpoon turret) by mark: tier models from Meshy; marks beyond the last one reuse it
for(let i=1;i<=4;i++) fetchDefGLB('harpoon',ASSET('ballista-'+i+'.glb'),i-1);   // Mark I..IV; Mark V keeps the tier-4 look
fetchDefGLB('spike',ASSET('hedge.glb'),0);   // the bramble hedge (Meshy), all marks
for(let i=1;i<=4;i++) fetchDefGLB('acorn',ASSET('cannon-'+i+'.glb'),i-1);   // the acorn cannon (Meshy) Mark I..IV; Mark V keeps the tier-4 look
for(let i=1;i<=4;i++) fetchDefGLB('slice',ASSET('mushroom-'+i+'.glb'),i-1);   // the mushroom ring (Meshy) Mark I..IV; Mark V keeps the tier-4 look
for(let i=1;i<=4;i++) fetchDefGLB('totem',ASSET('totem-'+i+'.glb'),i-1);   // the rune totem (Meshy) Mark I..IV; Mark V keeps the tier-4 look
// the frost spire has no Meshy art yet: drop frost-1..4.glb into assets/ and add its fetch line here
// the acorn the cannon fires: Meshy's acorn, toon-shaded, ~0.34 tall; the procedural one until it lands
{ let tpl=null; const proc=acornMesh; fetchBytes(ASSET('acorn.glb')).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ try{ const root=gltf.scene||gltf.scenes[0]; const fit=fitModel(root,.64); toonify(root,fit.scale); const w=fit.wrap; w.children[0].position.y-=.32; tpl=w; }catch(e){ console.warn('acorn model',e); } },e=>console.warn('acorn model',e))).catch(e=>console.warn('acorn model',e));
  acornMesh=function(){ if(!tpl) return proc(); const g=tpl.clone(); g.rotation.set(rnd()*6,rnd()*6,0); return g; }; }
window.__defglb={load:loadDefGLB,fetch:fetchDefGLB,list:()=>Object.fromEntries(Object.entries(DEFGLB).map(([k,v])=>[k,v.map(t=>t?{scale:+t.scale.toFixed(3),turn:t.turn}:null)]))};
