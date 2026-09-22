// ===== A HAND-MADE STRIKE for a hero whose attack clip is unusable: the whip arm winds up over the shoulder and snaps forward
// while the body keeps its idle or walk, and the rope lash does the rest. Heroes opt in by id in PROC (which arm); the clip
// stays in the file but never plays for them, and the hit lands at the snap. Nobody uses it now — the witch's re-rig came
// with a real whip crack (a raised wind-up, then a low lunge) — but `window.__armSwing.set('witch','Left')` turns it back on.
(function(){
const PROC={};
const _f=new THREE.Vector3(), _u=new THREE.Vector3(0,1,0), _l=new THREE.Vector3(), _W=new THREE.Vector3(), _S=new THREE.Vector3(), _d=new THREE.Vector3(), _e=new THREE.Vector3(), _a=new THREE.Vector3(), _b=new THREE.Vector3(), _c=new THREE.Vector3(), _q=new THREE.Quaternion(), _pw=new THREE.Quaternion(), _bw=new THREE.Quaternion(), _r=new THREE.Quaternion();
function side(){ const id=window.__heroes?window.__heroes.pick():''; return PROC[id]||null; }
function bones(){ if(!GLBH) return null; if(GLBH.armBones===undefined){ const s=side(); GLBH.armBones=null; if(s){ let up=null,fore=null,hand=null; const rU=new RegExp(s+'Arm$'), rF=new RegExp(s+'ForeArm$'), rH=new RegExp(s+'Hand$'); GLBH.root.traverse(o=>{ if(!o.isBone) return; if(rU.test(o.name)) up=o; else if(rF.test(o.name)) fore=o; else if(rH.test(o.name)) hand=o; }); if(up&&fore&&hand) GLBH.armBones={up,fore,hand}; } } return GLBH.armBones; }
// turn a bone so the segment to its child points along dir (world), blended into the animated pose by w
function aim(bone,child,dir,w){ bone.getWorldPosition(_a); child.getWorldPosition(_b); _c.copy(_b).sub(_a).normalize(); _r.setFromUnitVectors(_c,dir); bone.parent.getWorldQuaternion(_pw); bone.getWorldQuaternion(_bw); _q.copy(_pw).invert().multiply(_r).multiply(_bw); bone.quaternion.slerp(_q,w); bone.updateWorldMatrix(false,true); }
const smooth=t=>{ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); };
function strike(p){ const B=bones(); if(!B) return; const yaw=hero.yaw; _f.set(Math.sin(yaw),0,Math.cos(yaw)); _l.set(Math.cos(yaw),0,-Math.sin(yaw));   // the hero faces +z at yaw 0; her left is +x there
  _W.copy(_u).addScaledVector(_f,-.55).addScaledVector(_l,.35).normalize();   // wind-up: up and back over the shoulder
  _S.copy(_f).addScaledVector(_u,-.3).addScaledVector(_l,.15).normalize();    // the snap: straight out ahead, a touch down
  let w, bend; if(p<.4){ w=smooth(p/.12); _d.copy(_W); bend=.5; } else if(p<.55){ const t=(p-.4)/.15, e=1-Math.pow(1-t,3); w=1; _d.copy(_W).lerp(_S,e).normalize(); bend=.5*(1-e); } else { w=1-smooth((p-.62)/.38); _d.copy(_S); bend=0; }
  if(w<=0) return; aim(B.up,B.fore,_d,w); _e.copy(_d).addScaledVector(_u,bend).normalize(); aim(B.fore,B.hand,_e,w); }
{ const prev=heroModelUpdate; heroModelUpdate=function(dt){ const s=side(); const act=(s&&GLBH)?GLBH.actions.attack:null; if(act) GLBH.actions.attack=null; prev(dt); if(act) GLBH.actions.attack=act;
    if(s&&GLBH&&useGLB&&hero.swingT>=0&&!(hero.dead>0)) strike(Math.min(1,hero.swingT/swingDur())); }; }
{ const prev=hitFrac; hitFrac=function(){ return (side()&&useGLB&&GLBH)?.5:prev(); }; }   // the blow lands at the snap
window.__armSwing={side,bones:()=>{ const B=bones(); return B?{up:B.up.name,fore:B.fore.name,hand:B.hand.name}:null; },set:(id,arm)=>{ if(arm) PROC[id]=arm; else delete PROC[id]; if(GLBH) GLBH.armBones=undefined; }};   // tests and tuning: switch a hero between the hand-made strike and its own clip
})();
