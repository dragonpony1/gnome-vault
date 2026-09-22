// ===== THE DRAKE: Meshy could not rig it, so it is rigged here. The single mesh is cut into body, two wings and a tail
// by where each triangle sits; each wing hangs on a hinge at the shoulder and the tail on one at the hips, and the game
// flaps and sways them as it flies (updateEnemies). Registered like any other mob model; the block figure stands in until it loads.
{ fetchBytes(ASSET('drake.glb')).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ try{
    const root=gltf.scene||gltf.scenes[0]; root.updateMatrixWorld(true); let mesh=null; root.traverse(m=>{ if(!mesh&&m.isMesh) mesh=m; });
    const g=mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld); const pos=g.attributes.position, gi=g.getIndex(); const n=gi?gi.count:pos.count; const vid=i=>gi?gi.getX(i):i;
    const box=new THREE.Box3().setFromBufferAttribute(pos); const cx=(box.min.x+box.max.x)/2, W=box.max.x-box.min.x, cz=(box.min.z+box.max.z)/2, D=box.max.z-box.min.z;
    const parts={body:[],wingL:[],wingR:[],tail:[]}; const v=new THREE.Vector3();
    for(let i=0;i+2<n;i+=3){ let x=0,z=0; for(let k=0;k<3;k++){ v.fromBufferAttribute(pos,vid(i+k)); x+=v.x; z+=v.z; } x/=3; z/=3; const rx=(x-cx)/W, rz=(z-cz)/D;
      parts[rx<-.16?'wingL':rx>.16?'wingR':rz<-.28?'tail':'body'].push(vid(i),vid(i+1),vid(i+2)); }
    const inner=new THREE.Group(); const pivots={wingL:[cx-W*.15,cz],wingR:[cx+W*.15,cz],tail:[cx,cz-D*.24]};
    for(const k in parts){ if(!parts[k].length) continue; const pg=g.clone(); pg.setIndex(parts[k]); const pm=new THREE.Mesh(pg,mesh.material); let node=pm;
      if(pivots[k]){ const pb=new THREE.Box3().setFromBufferAttribute(pg.attributes.position); const py=(pb.min.y+pb.max.y)/2; const piv=new THREE.Group(); piv.name=k; piv.position.set(pivots[k][0],py,pivots[k][1]); pg.translate(-pivots[k][0],-py,-pivots[k][1]); piv.add(pm); node=piv; }   // the hinge: at the part's mid height where it meets the body
      inner.add(node); }
    const fit=fitModel(inner,MOBDIM.drake.fit); toonify(inner,fit.scale); MOBGLB.drake={wrap:fit.wrap,map:{},scale:fit.scale,parts:Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,v.length/3]))};
  }catch(e){ console.warn('drake model',e); } },e=>console.warn('drake model',e))).catch(e=>console.warn('drake model',e)); }
