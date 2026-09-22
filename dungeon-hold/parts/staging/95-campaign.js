// ===== THE CAMPAIGN: maps in a row. The start screen picks a map (◀ ▶, locked until the one before it is held); holding
// the last wave of a map clears it and offers NEXT MAP on the tally and on the end screen. The map is built when the page
// loads, so moving on is a reload with ?map=N (other query flags kept).
(function(){
const cleared=()=>{ try{ return Math.max(0,Math.min(MAPS.length,parseInt(localStorage.getItem('ddMapsCleared'))||0)); }catch(e){ return 0; } };
function go(i){ i=Math.max(0,Math.min(i,MAPS.length-1,cleared())); try{ localStorage.setItem('ddMap',String(i)); }catch(e){} const q=new URLSearchParams(location.search); q.set('map',String(i)); location.href=location.pathname+'?'+q.toString(); }
function next(){ if(MAPI+1<MAPS.length) go(MAPI+1); }
function mapLine(){ const el=$('mapline'); if(!el) return; const c=cleared(); const m=MAP; el.innerHTML='<button id="mapprev" title="previous map"'+(MAPI>0?'':' disabled')+'>◀</button><span>MAP '+(MAPI+1)+' OF '+MAPS.length+' · '+m.name+(c>MAPI?' ✓':'')+'<small>'+m.sub+(MAPI+1<MAPS.length&&c<=MAPI?' · hold all '+m.waves+' waves to unlock map '+(MAPI+2):'')+'</small></span><button id="mapnext" title="next map"'+(MAPI+1<MAPS.length&&c>MAPI?'':' disabled')+'>▶</button>';
  $('mapprev').onclick=()=>go(MAPI-1); $('mapnext').onclick=()=>go(MAPI+1); }
mapLine();
// the hero pick, under the map line
function heroLine(){ let el=$('heroline'); if(!el){ el=document.createElement('p'); el.id='heroline'; el.className='mapline'; $('mapline').insertAdjacentElement('afterend',el); } const H=HEROES, i=H.findIndex(h=>h.id===heroPick.id); const h=H[i];
  el.innerHTML='<button id="heroprev" title="previous hero">◀</button><span>HERO · '+h.name+'<small>'+h.sub+'</small></span><button id="heronext" title="next hero">▶</button>';
  $('heroprev').onclick=()=>{ installHero(H[(i-1+H.length)%H.length]); heroLine(); }; $('heronext').onclick=()=>{ installHero(H[(i+1)%H.length]); heroLine(); }; }
heroLine();
// testing shortcuts, on the start screen: unlock every map, magnet mana from anywhere, a purse of gold
const TEST={autoMana:false}; try{ TEST.autoMana=localStorage.getItem('ddAutoMana')==='on'; }catch(e){} window.__autoMana=TEST.autoMana;
function testLine(){ let el=$('testline'); if(!el){ el=document.createElement('p'); el.id='testline'; el.className='mapline'; el.style.fontSize='12px'; el.style.letterSpacing='1px'; el.style.color='#bfae90'; el.style.gap='8px'; $('heroline').insertAdjacentElement('afterend',el); }
  el.innerHTML='🧪 testing: <button data-t="maps">'+(cleared()>=MAPS.length?'all maps unlocked ✓':'unlock all maps')+'</button><button data-t="mana">auto-mana: '+(TEST.autoMana?'ON':'off')+'</button><button data-t="gold">+1000 gold</button>';
  el.querySelectorAll('button').forEach(b=>{ b.style.width='auto'; b.style.height='30px'; b.style.fontSize='12px'; b.style.padding='0 10px'; b.onclick=()=>{ const t=b.dataset.t; if(t==='maps'){ try{ localStorage.setItem('ddMapsCleared',String(MAPS.length)); }catch(e){} mapLine(); } else if(t==='mana'){ TEST.autoMana=!TEST.autoMana; window.__autoMana=TEST.autoMana; try{ localStorage.setItem('ddAutoMana',TEST.autoMana?'on':'off'); }catch(e){} } else if(t==='gold'){ Meta.addGold(1000,'refund'); } testLine(); }; }); }
testLine();
// the end screen for a held map
const winProc=winMap; winMap=function(){ winProc(); $('deadh1').textContent='HALL HELD'; $('deadh2').textContent=MAP.name+' CLEARED · ALL '+MAP.waves+' WAVES HELD'; $('deadp').textContent=MAPI+1<MAPS.length?'The horde broke. Your gear, gold and skills come with you to the next map.':'That was the last map for now — the horde will be back with more halls.'; $('nextmapbtn').style.display=MAPI+1<MAPS.length?'':'none'; $('againbtn').textContent='↻ REPLAY THIS MAP'; };
$('nextmapbtn').addEventListener('click',next);
window.__campaign={index:MAPI,cleared,next,go,maps:()=>MAPS.map(m=>({id:m.id,name:m.name,waves:m.waves})),line:()=>$('mapline').textContent,test:()=>({autoMana:TEST.autoMana,line:$('testline').textContent}),unlockAll:()=>{ try{ localStorage.setItem('ddMapsCleared',String(MAPS.length)); }catch(e){} mapLine(); testLine(); }};
})();
