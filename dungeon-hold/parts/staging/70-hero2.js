// ===== HEROES: the playable characters, each a Meshy rig fetched from assets/. The squire baked into the page shows for
// the first second and stays as the fallback. The pick is saved (ddHero) and can be changed on the start screen; a
// different hero swaps in live, no reload. The witch fights with a whip: longer reach, no sword models mounted (her
// model carries no weapon mount, so the visible-weapons module leaves her hand alone).
const HEROES=[
  {id:'warden',name:'GNOME WARDEN',sub:'sword and shield-arm · the hall\'s keeper',glb:'squire2.glb',label:'Gnome Warden (Meshy v2)',reach:2.4},
  {id:'witch', name:'FAE BATTLE WITCH',sub:'a whip that reaches half again as far',glb:'witch.glb',label:'Fae Battle Witch (Meshy)',reach:3.6}];
let heroPick=(()=>{ try{ return HEROES.find(h=>h.id===localStorage.getItem('ddHero'))||HEROES[0]; }catch(e){ return HEROES[0]; } })();
function installHero(h){ heroPick=h; try{ localStorage.setItem('ddHero',h.id); }catch(e){} hero.reach=h.reach;
  return fetchBytes(ASSET(h.glb)).then(buf=>{ if(heroPick!==h) return; if(GLBH&&GLBH.label&&!/Meshy/.test(GLBH.label)) return;   // the player dropped their own model meanwhile: keep it
    loadHeroGLB(buf,h.label,true); hero.reach=h.reach; }).catch(e=>console.warn('hero '+h.id,e)); }
installHero(heroPick);
window.__heroes={list:()=>HEROES.map(h=>({id:h.id,name:h.name})),pick:()=>heroPick.id,select:id=>{ const h=HEROES.find(h=>h.id===id); if(h) return installHero(h); }};
