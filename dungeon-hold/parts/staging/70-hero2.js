// ===== HERO v2: Meshy's second rig of the gnome squire (clean 24-joint rig, both arms swing, Meshy walk/run/slash + procedural
// idle/jump/death) fetched from assets/. The squire baked into the page shows for the first second and stays as the fallback.
{ const swap=()=>fetchBytes(ASSET('squire2.glb')).then(buf=>{ if(GLBH&&GLBH.label&&!/Meshy/.test(GLBH.label)) return;   // the player dropped their own model meanwhile: keep it
    loadHeroGLB(buf,'Gnome Warden (Meshy v2)',true); }).catch(e=>console.warn('hero v2',e));
  swap(); }
