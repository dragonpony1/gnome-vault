// ===== LEVEL-GATED GEAR AND THE ARMORY. Every piece asks for a hero level — its drop level × 0.8 plus its rarity (a wave-7
// legendary wants level 10, a wave-7 common level 6); the sheet and the tavern show the level in red until you have it and
// EQUIP refuses. Pieces you want to keep for later go in the ARMORY: eight stands along the tavern's north wall that show
// what you keep — armor on a wooden mannequin, a weapon on a rack (its real model), a charm or amulet on a pedestal, a
// familiar's egg on a perch — saved on their own (ddArmory). The sheet has the armory grid (KEEP / TAKE); E at the stands
// opens it.
(function(){
const CAP=8, ARM_CSS='.tb.no{color:#ff6a5a!important;border-color:#ff6a5a!important}';
{ const st=document.createElement('style'); st.textContent=ARM_CSS; document.head.appendChild(st); }
function reqFor(it){ return Math.max(1,Math.round((it.lvl||1)*.8+(it.rarity|0))); }
function ensureReq(it){ if(it&&typeof it==='object'&&!Number.isFinite(it.req)) it.req=reqFor(it); return it; }
{ const prev=fixItem; fixItem=function(it){ const r=prev(it); ensureReq(it); return r; }; }   // legacy pieces (bag, stock, drops) get theirs on the way through
{ const prev=rollItem; rollItem=function(a,b,c){ return ensureReq(prev(a,b,c)); }; }
for(const it of Meta.bag()) ensureReq(it); for(const s of SLOTS) if(gear[s]) ensureReq(gear[s]); (Meta.stock()||[]).forEach(ensureReq);
let GATE=!new URLSearchParams(location.search).has('nogate');   // ?nogate: no level gate (the test suites that only care about the piece, not the level)
const canWear=it=>!GATE||!it||!it.req||Meta.level()>=it.req;
{ const prev=Meta.equip; Meta.equip=id=>{ const it=Meta.bag().find(b=>b.id===id); if(it&&!canWear(it)){ toast('Needs level '+it.req+' — you are level '+Meta.level()); return false; } return prev(id); }; }
if(typeof tvTier==='function'){ const prev=tvTier; tvTier=function(it){ return prev(it)+(it.req?'<span class="tb'+(canWear(it)?'':' no')+'">Lv '+it.req+'</span>':''); }; }
// --- the store ---
let ARM=[]; try{ const a=JSON.parse(localStorage.getItem('ddArmory')); if(Array.isArray(a)) ARM=a.filter(validItem).map(fixItem).slice(0,CAP); }catch(e){}
function save(){ try{ localStorage.setItem('ddArmory',JSON.stringify(ARM)); }catch(e){} if(Meta.save) Meta.save(); refresh(); }
function stash(id){ const bag=Meta.bag(); const i=bag.findIndex(b=>b.id===id); if(i<0) return false; if(ARM.length>=CAP){ toast('The armory is full — '+CAP+' stands'); return false; } const it=bag.splice(i,1)[0]; ARM.push(it); save(); SFX.place(); return true; }
function unstash(id){ const i=ARM.findIndex(b=>b.id===id); if(i<0) return false; if(Meta.bagFull()){ toast('Bag is full'); return false; } const it=ARM.splice(i,1)[0]; if(!Meta.giveItem(it)){ ARM.splice(i,0,it); return false; } save(); return true; }
{ const prev=Meta.reset; Meta.reset=()=>{ prev(); ARM=[]; save(); }; }
Meta.levelGate=v=>{ if(v!==undefined) GATE=!!v; return GATE; }; Meta.armory=()=>ARM; Meta.armoryCap=CAP; Meta.stash=stash; Meta.unstash=unstash; Meta.canWear=canWear; Meta.reqFor=reqFor;
// --- the stands in the tavern: six along the north wall west of the door, two east of it ---
const TD=MAP.tavern||{dx:0,dz:0}; const at=(x,z)=>[cw(x+TD.dx),cwz(z+TD.dz)];
const SPOTS=[12.2,12.775,13.35,13.925,14.5,15.075,17.0,17.7].map(x=>at(x,25.42)); for(const cx of [12,13,14,15,17,18]){ const i=idx(cx+TD.dx,25+TD.dz); if(grid[i]===T.FLOOR||grid[i]===T.CARPET) grid[i]=T.PROP; }
const wood=mat(0x6b4a2a), dark=mat(0x2b2540), cream=mat(0xf1e6d0); const ROOT=new THREE.Group(); world.add(ROOT); const STANDS=SPOTS.map(([x,z])=>{ const g=new THREE.Group(); g.position.set(x,0,z); g.add(M(G.cyl(.34,.38,.08,12),dark,0,.04,0)); ROOT.add(g); return {g,x,z,shown:null,item:null}; });
function tag(txt,col){ const c=document.createElement('canvas'); c.width=256; c.height=48; const g=c.getContext('2d'); g.font='bold 24px Georgia,serif'; g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=5; g.strokeStyle='#120c1a'; g.strokeText(txt,128,25); g.fillStyle=col||'#e8b94a'; g.fillText(txt,128,25); const t=new THREE.CanvasTexture(c); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false})); s.scale.set(1.9,.36,1); s.userData.noOL=true; return s; }
function itemColor(it){ const pk=Meta.packs&&Meta.packs.of(it); return pk&&pk.col?pk.col:RCOL[it.rarity]; }
function build(st,it){ const g=new THREE.Group(); const col=itemColor(it), tint=mat(col), shine=basic(col);
  if(it.slot==='armor'){ g.add(M(G.cyl(.06,.08,1.0,7),wood,0,.55,0)); const torso=M(G.box(.56,.72,.34),tint,0,1.4,0); g.add(torso); g.add(M(G.box(.62,.16,.38),tint,0,1.82,0)); g.add(M(G.box(.5,.2,.3),dark,0,.98,0)); g.add(M(G.sph(.17,9,7),cream,0,2.08,0)); g.add(M(G.box(.14,.5,.14),tint,-.4,1.45,0)); g.add(M(G.box(.14,.5,.14),tint,.4,1.45,0)); }
  else if(it.slot==='weapon'){ g.add(M(G.box(.08,1.7,.08),wood,-.3,.85,-.12)); g.add(M(G.box(.08,1.7,.08),wood,.3,.85,-.12)); g.add(M(G.box(.8,.07,.1),wood,0,1.62,-.12)); g.add(M(G.box(.8,.07,.1),wood,0,.55,-.12));
    if(window.__weapons&&window.__weapons.model){ const witch=window.__heroes&&window.__heroes.pick()==='witch'; const name=witch?window.__weapons.whipFor(it):window.__weapons.swordFor(it); window.__weapons.model(name,root=>{ if(st.shown!==g) return; const box=root.userData.box||new THREE.Box3().setFromObject(root); const L=Math.max(.2,box.max.y-box.min.y), s=1.25/L; root.scale.setScalar(s); if(/^whip-/.test(name)){ root.position.set(0,1.5-box.max.y*s,.02); } else { root.position.set(0,.2-box.min.y*s,.02); } toonify(root,s); root.traverse(o=>{ if(o.isMesh&&!o.userData.isOL&&o.material&&o.material.emissive&&Meta.packs&&Meta.packs.of(it)){ o.material=o.material.clone(); o.material.emissive.set(Meta.packs.of(it).emissive||0); o.material.emissiveIntensity=.7; } }); g.add(root); }); } }
  else if(it.slot==='charm'){ g.add(M(G.cyl(.16,.22,1.0,9),dark,0,.55,0)); const orb=M(G.sph(.17,10,8),shine,0,1.25,0); orb.userData.noOL=true; g.add(orb); const gl=glow(col,.9,.55); gl.position.y=1.25; g.add(gl); }
  else if(it.slot==='amulet'){ g.add(M(G.cyl(.16,.22,1.0,9),dark,0,.55,0)); const gem=M(new THREE.OctahedronGeometry(.16,0),shine,0,1.3,0); gem.userData.noOL=true; g.add(gem); const gl=glow(col,.8,.5); gl.position.y=1.3; g.add(gl); }
  else { g.add(M(G.cyl(.05,.07,1.1,7),wood,0,.6,0)); g.add(M(G.cyl(.26,.3,.07,10),wood,0,1.15,0)); const egg=M(G.sph(.17,10,8),tint,0,1.4,0); egg.scale.y=1.3; g.add(egg); const gl=glow(col,.7,.4); gl.position.y=1.42; g.add(gl); }
  outline(g); const nm=it.name.length>20?it.name.slice(0,19)+'…':it.name; const t=tag(nm,RCSS[it.rarity]); t.position.y=2.45; g.add(t); return g; }
function refresh(){ STANDS.forEach((st,i)=>{ const it=ARM[i]||null; if(st.item===it) return; if(st.shown){ st.g.remove(st.shown); st.shown=null; } st.item=it; if(it){ st.shown=build(st,it); st.g.add(st.shown); } }); }
refresh();
// the gems turn; a stand in use is the "armory" station's centre
{ const prev=Meta.update; Meta.update=dt=>{ prev(dt); for(const st of STANDS){ if(!st.shown||!st.item) continue; if(st.item.slot==='charm'||st.item.slot==='amulet') st.shown.children.forEach(o=>{ if(o.userData.noOL&&!o.isSprite) o.rotation.y+=dt*1.2; }); } }; }
window.__armory={cap:CAP,list:()=>ARM.map(it=>it.id),stands:()=>STANDS.map(st=>({x:+st.x.toFixed(2),z:+st.z.toFixed(2),slot:st.item?st.item.slot:null,shown:!!st.shown})),stash,unstash,reqFor,canWear,refresh,center:()=>[(SPOTS[2][0]+SPOTS[3][0])/2,SPOTS[2][1]+1.0]};
})();
