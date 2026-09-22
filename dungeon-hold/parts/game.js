
/* DUNGEON HOLD — a Dungeon Defenders style hall in the Gnome's Tower world.
   Third-person squire, hero-sized defenses, goblin waves. Single file, Three.js r128 inlined. */
(function(){
'use strict';
const Q=new URLSearchParams(location.search), SILENT=Q.has('silent');
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
let seed=91731; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296;};
const R=(a,b)=>a+rnd()*(b-a);
const C=h=>new THREE.Color(h).convertSRGBToLinear();
const PI=Math.PI, TAU=PI*2;
const TOUCH=('ontouchstart' in window)&&matchMedia('(pointer:coarse)').matches;
if(TOUCH) document.body.classList.add('touch');

// ================= SOUND (off by default — M toggles) =================
let soundOff=SILENT||(localStorage.getItem('ddSound')==='off');
let ac=null;
function A(){ if(soundOff) return null; if(!ac){ ac=new (window.AudioContext||window.webkitAudioContext)(); } if(ac.state==='suspended') ac.resume(); return ac; }
function beep(f,dur,type,vol,slide){ const a=A(); if(!a) return; const o=a.createOscillator(), g=a.createGain(); o.type=type||'square'; o.frequency.setValueAtTime(f,a.currentTime); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),a.currentTime+dur); g.gain.setValueAtTime(vol||.06,a.currentTime); g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime+dur); }
function noise(dur,vol,f){ const a=A(); if(!a) return; const n=(a.sampleRate*dur)|0, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n); const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f||1200; fl.Q.value=.7; const g=a.createGain(); g.gain.value=vol||.1; s.connect(fl).connect(g).connect(a.destination); s.start(); }
const SFX={ acorn:()=>{ beep(520,.08,'triangle',.05,-200); noise(.05,.06,3000); }, spore:()=>noise(.2,.045,520), swing:()=>noise(.16,.14,900), harpoon:()=>{noise(.07,.12,2600); beep(240,.12,'square',.05,-160);}, ball:()=>beep(95,.32,'sine',.14,-45), hit:()=>beep(520,.06,'square',.04,-220), mana:()=>beep(880,.13,'sine',.05,420), crystal:()=>beep(150,.45,'sawtooth',.07,-70), place:()=>beep(330,.11,'triangle',.06,140), horn:()=>{beep(196,.7,'sawtooth',.06,0); beep(294,.7,'sawtooth',.05,0);}, held:()=>{beep(523,.15,'triangle',.06,0); setTimeout(()=>beep(659,.15,'triangle',.06,0),150); setTimeout(()=>beep(784,.3,'triangle',.06,0),300);}, hurt:()=>beep(200,.15,'square',.06,-80), sell:()=>beep(660,.1,'sine',.05,-300), die:()=>{ noise(.16,.11,650); beep(320,.18,'square',.045,-220); }, bigDie:()=>{ noise(.4,.18,300); beep(85,.55,'sawtooth',.12,-45); }, jump:()=>beep(380,.09,'square',.035,320), land:()=>noise(.05,.07,320), step:()=>noise(.03,.035,420), enter:()=>{ beep(392,.18,'triangle',.05,0); setTimeout(()=>beep(523,.28,'triangle',.05,0),160); }, loot:(r)=>{ const n=[523,659,784,1047,1319]; for(let i=0;i<=Math.min(4,r+1);i++) setTimeout(()=>beep(n[i],.14,'triangle',.06,0),i*90); }, destroy:()=>noise(.35,.16,400), thud:()=>beep(70,.25,'sine',.12,-30) };
// ================= MUSIC (procedural: hall theme while building, battle loop during waves) =================
let musicOn=localStorage.getItem('ddMusic')!=='off', musicMode='none', musicTimer=null, mNext=0, mStep=0, mGain=null;
const mf=m=>440*Math.pow(2,(m-69)/12);
const MUS_WAVE={bpm:132,chords:[[45,'m'],[41,'M'],[48,'M'],[43,'M']]}, MUS_BUILD={bpm:76,chords:[[45,'m'],[50,'m'],[41,'M'],[43,'M']]};
function mnote(freq,t,dur,type,vol,attack){ const a=A(); if(!a||!mGain) return; const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+(attack||.01)); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g).connect(mGain); o.start(t); o.stop(t+dur+.02); }
function mnoise(t,dur,vol,f){ const a=A(); if(!a||!mGain) return; const n=(a.sampleRate*dur)|0, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n); const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f; fl.Q.value=.8; const g=a.createGain(); g.gain.setValueAtTime(vol,t); s.connect(fl).connect(g).connect(mGain); s.start(t); }
function mkick(t){ const a=A(); if(!a||!mGain) return; const o=a.createOscillator(), g=a.createGain(); o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(45,t+.16); g.gain.setValueAtTime(.16,t); g.gain.exponentialRampToValueAtTime(.0001,t+.2); o.connect(g).connect(mGain); o.start(t); o.stop(t+.22); }
const mrand=i=>(((i+1)*2654435761)>>>0)/4294967296;
function mschedule(step,t){ const M=musicMode==='wave'?MUS_WAVE:MUS_BUILD; const sd=60/M.bpm/4; const bar=(step>>4), s16=step&15; const [root,q]=M.chords[(bar>>1)%M.chords.length]; const tones=q==='m'?[0,3,7,12,15,19]:[0,4,7,12,16,19];
  if(musicMode==='wave'){
    if(s16%4===0) mkick(t); if(s16%4===2) mnoise(t,.05,.05,7000); if(s16===4||s16===12) mnoise(t,.12,.11,1800);
    if(s16%2===0){ const oct=(s16%8===4)?12:0; mnote(mf(root+oct-12),t,sd*1.8,'square',.045); }
    const ti=[0,2,4,5,4,2,3,1][s16%8]; mnote(mf(root+12+tones[ti]),t,sd*1.6,'triangle',.04);
    if(s16===0&&bar%2===0) mnote(mf(root+24+tones[(bar>>1)%3*2]),t,sd*14,'sawtooth',.02,.4);
  } else {
    if(s16===0){ mnote(mf(root-12),t,sd*30,'triangle',.05,.6); mnote(mf(root+7-12),t,sd*30,'triangle',.035,.9); }
    if(s16%4===0&&mrand(step)<.55){ const pent=[0,3,5,7,10,12,15]; mnote(mf(root+12+pent[Math.floor(mrand(step*7)*pent.length)]),t,sd*6,'sine',.05,.02); }
    if(s16===8&&bar%2===1) mnoise(t,.3,.02,900);
  } }
function mtick(){ const a=A(); if(!a||musicMode==='none') return; if(mNext<a.currentTime-.5) mNext=a.currentTime+.05; const M=musicMode==='wave'?MUS_WAVE:MUS_BUILD; const sd=60/M.bpm/4; while(mNext<a.currentTime+.35){ mschedule(mStep,mNext); mStep++; mNext+=sd; } }
function setMusic(mode){ const want=(musicOn&&!soundOff)?mode:'none'; if(want===musicMode) return; const a=want==='none'?ac:A(); musicMode=want;
  if(want==='none'){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } if(mGain&&a){ const g=mGain; mGain=null; g.gain.setTargetAtTime(.0001,a.currentTime,.3); setTimeout(()=>{ try{ g.disconnect(); }catch(e){} },1500); } return; }
  if(!a) return; if(!mGain){ mGain=a.createGain(); mGain.gain.value=.8; mGain.connect(a.destination); } mStep=0; mNext=a.currentTime+.05; if(!musicTimer) musicTimer=setInterval(mtick,100); }
function musicForPhase(){ setMusic(S.phase==='wave'?'wave':S.phase==='build'?'build':'none'); }
function toggleMusic(){ musicOn=!musicOn; localStorage.setItem('ddMusic',musicOn?'on':'off'); musicForPhase(); toast(musicOn?'Music on':'Music off (N turns it back on)'); }
function sting(){ [[220,0],[207,.25],[196,.5],[185,.8]].forEach(([f,d])=>setTimeout(()=>beep(f,.7,'sawtooth',.06,-20),d*1000)); }
let droneN=null;
function droneOn(){ const a=A(); if(!a||droneN) return; const g=a.createGain(); g.gain.setValueAtTime(.0001,a.currentTime); g.gain.exponentialRampToValueAtTime(.028,a.currentTime+1.5); const fl=a.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=220; const os=[55,82.4,110].map((f,i)=>{ const o=a.createOscillator(); o.type=i?'sawtooth':'triangle'; o.frequency.value=f; o.detune.value=(i-1)*6; o.connect(fl); o.start(); return o; }); fl.connect(g).connect(a.destination); droneN={g,os}; }
function droneOff(){ if(!droneN||!ac) return; const d=droneN; droneN=null; d.g.gain.setTargetAtTime(.0001,ac.currentTime,.4); setTimeout(()=>d.os.forEach(o=>{ try{o.stop();}catch(e){} }),1500); }
function setSound(on){ soundOff=!on; if(!on){ droneOff(); setMusic('none'); } else setTimeout(musicForPhase,0); localStorage.setItem('ddSound',on?'on':'off'); $('sndbtn').textContent=on?'🔊':'🔇'; if(!on&&ac) ac.suspend(); }
$('sndbtn').onclick=()=>setSound(soundOff);
$('sndbtn').textContent=soundOff?'🔇':'🔊';
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&ac) ac.suspend(); });
window.addEventListener('pagehide',()=>{ if(ac) ac.suspend(); });

// ================= GRID / MAP =================
// ================= MAPS =================
// A campaign map: its grid (built with f=fill and g=set when the page loads), where the crystal stands, the gates the
// horde comes through, the hall's props and lights, and where the tavern room sits (an offset from map 1's room, which
// the room module is written against). Hold MAP.waves waves and the map is cleared: the next one unlocks, and the horde
// carries on where it left off (map 2 wave 1 fights like wave 8). The map is chosen when the page loads (?map=N or the
// saved ddMap) so the hall is built once.
const MAPS=[
 {id:'hall',name:'THE GNOME HALL',sub:'three gates · seven waves',gw:34,gh:33,crystal:[16,17],waves:7,
  build(f,g){ f(10,22,11,23,T.FLOOR);                                   // the great hall
    f(15,17,11,15,T.CARPET); f(10,14,16,18,T.CARPET); f(18,22,16,18,T.CARPET); f(15,17,16,18,T.DAIS); g(16,17,T.CRYSTAL);
    f(15,17,4,10,T.FLOOR); f(14,18,1,3,T.FLOOR); g(16,2,T.SPAWN);          // north gate
    f(4,9,16,18,T.FLOOR); f(4,6,6,18,T.FLOOR); f(2,8,2,5,T.FLOOR); g(5,3,T.SPAWN);   // west gate (with a bend)
    f(23,29,16,18,T.FLOOR); f(29,32,14,20,T.FLOOR); g(31,17,T.SPAWN);      // east gate
    f(12,20,25,31,T.FLOOR); g(16,24,T.FLOOR); f(16,16,25,27,T.CARPET);     // the tavern: a snug room through the south door
    [[12,26],[13,30],[19,27],[19,28],[19,29],[16,31]].forEach(([x,z])=>g(x,z,T.PROP));   // locker · trainer's dummy · the bar · the hearth
    [[12,13],[20,13],[12,21],[20,21]].forEach(([x,z])=>g(x,z,T.PILLAR)); [[10,11],[22,11],[10,23],[22,23]].forEach(([x,z])=>g(x,z,T.PROP)); },
  lanes:{N:{cx:16,cz:2,face:0,name:'North'}, W:{cx:5,cz:3,face:0,name:'West'}, E:{cx:31,cz:17,face:-PI/2,name:'East'}},
  hall:[10,22,11,23],pillars:[[12,13],[20,13],[12,21],[20,21]],barrels:[[10,11],[22,11]],crates:[[10,23],[22,23]],chandelier:[0,-6],beams:{zs:[-8,0,8],w:26},tavern:{dx:0,dz:0},
  lights:[[-9,4.4,-9,0xff8a2a,1.5,16],[9,4.4,-9,0xff8a2a,1.5,16],[-9,4.4,9,0xff8a2a,1.5,16],[9,4.4,9,0xff8a2a,1.5,16],
   [0,5,-6,0xffb05a,.8,13],[0,3.2,0,0x4ae6ff,1.3,15],[0,4,-18,0xff8a2a,1.7,15],[0,4,-26,0xff8a2a,1.2,12],[-16,4,0,0xff8a2a,1.7,15],[-24,4,-10,0xff8a2a,1.5,14],[-24,4,-22,0xff8a2a,1.4,13],[18,4,0,0xff8a2a,1.7,15],[28,4,0,0xff8a2a,1.6,15],[-22,4,-26,0xc040ff,.9,10],[0,4,-28,0xc040ff,.9,10],[30,4,0,0xc040ff,.9,10],
   [0,4.2,19,0xffb05a,1.3,13],[-6,3.8,24,0xff8a2a,1.2,12],[6,3.8,22,0xff8a2a,1.2,12],[0,2.2,26.4,0xff7a1a,1.6,9]]},   // the tavern: lamps and the hearth
 {id:'throne',name:'THE THRONE ROOM',sub:'a vast marble hall, the grand stair, the throne six steps above · seven waves',gw:46,gh:55,crystal:[23,7],waves:7,wallH:14,fog:[40,110],style:{marble:true,windows:true},
  build(f,g,h,ramp){ f(14,32,3,14,T.FLOOR); h(14,32,3,14,6); f(21,25,3,14,T.CARPET); f(22,24,6,8,T.DAIS); g(23,7,T.CRYSTAL);   // the platform, six up: the throne and the crystal
    f(14,17,11,14,T.CARPET); ramp(14,17,11,14,1,3,6); f(29,32,11,14,T.CARPET); ramp(29,32,11,14,1,3,6);   // twin upper stairs, terrace to platform, either side of a retaining wall
    f(14,32,15,18,T.FLOOR); h(14,32,15,18,3); f(19,27,15,18,T.CARPET); f(14,18,19,24,T.FLOOR); h(14,18,19,24,3); f(28,32,19,24,T.FLOOR); h(28,32,19,24,3);   // the terrace, three up, with wings flanking the grand stair
    f(19,27,19,24,T.CARPET); ramp(19,27,19,24,1,0,3);   // the grand stair, floor to terrace
    for(let z=25;z<=45;z++){ const w=Math.round(8*(45-z)/20); f(4+w,42-w,z,z,T.FLOOR); } f(22,24,25,45,T.CARPET);   // the vast floor: wide at the gates, narrowing to the stair
    f(1,7,34,36,T.FLOOR); g(2,35,T.SPAWN); f(39,45,34,36,T.FLOOR); g(44,35,T.SPAWN); f(22,24,46,50,T.FLOOR); g(23,49,T.SPAWN);   // gates: west, east, south
    f(34,42,47,53,T.FLOOR); g(38,46,T.FLOOR); f(38,38,47,49,T.CARPET); [[34,48],[35,52],[41,49],[41,50],[41,51],[38,53]].forEach(([x,z])=>g(x,z,T.PROP));   // the tavern, south-east, off the bottom row
    [[12,33],[34,33],[9,41],[37,41],[16,28],[30,28]].forEach(([x,z])=>g(x,z,T.PILLAR)); [[5,45],[41,45],[13,26],[33,26]].forEach(([x,z])=>g(x,z,T.PROP)); },
  lanes:{W:{cx:2,cz:35,face:PI/2,name:'West'}, E:{cx:44,cz:35,face:-PI/2,name:'East'}, S:{cx:23,cz:49,face:PI,name:'South'}},
  hall:[4,42,3,45],pillars:[[12,33],[34,33],[9,41],[37,41],[16,28],[30,28]],barrels:[[5,45],[41,45]],crates:[[13,26],[33,26]],chandeliers:[[0,42],[0,62]],beams:{zs:[40,50,60,70],w:78},tavern:{dx:22,dz:22},throne:[23,4],
  lights:[{cx:15,cz:4,y:10.2,c:0xff8a2a,i:1.5,d:16},{cx:31,cz:4,y:10.2,c:0xff8a2a,i:1.5,d:16},{cx:15,cz:12,y:10.2,c:0xff8a2a,i:1.5,d:16},{cx:31,cz:12,y:10.2,c:0xff8a2a,i:1.5,d:16},[0,9.2,0,0x4ae6ff,1.3,15],[0,11,42,0xffb05a,.9,16],[0,11,62,0xffb05a,.9,16],
   {cx:16,cz:17,y:7.2,c:0xff8a2a,i:1.4,d:14},{cx:30,cz:17,y:7.2,c:0xff8a2a,i:1.4,d:14},{cx:16,cz:24,y:7,c:0xff8a2a,i:1.4,d:14},{cx:30,cz:24,y:7,c:0xff8a2a,i:1.4,d:14},{cx:18,cz:26,y:4,c:0xff8a2a,i:1.6,d:15},{cx:28,cz:26,y:4,c:0xff8a2a,i:1.6,d:15},
   {cx:9,cz:30,y:4,c:0xff8a2a,i:1.5,d:15},{cx:37,cz:30,y:4,c:0xff8a2a,i:1.5,d:15},{cx:6,cz:38,y:4,c:0xff8a2a,i:1.5,d:15},{cx:40,cz:38,y:4,c:0xff8a2a,i:1.5,d:15},{cx:8,cz:44,y:4,c:0xff8a2a,i:1.5,d:15},{cx:38,cz:44,y:4,c:0xff8a2a,i:1.5,d:15},
   {cx:2,cz:35,y:4,c:0xc040ff,i:.9,d:10},{cx:44,cz:35,y:4,c:0xc040ff,i:.9,d:10},{cx:23,cz:49,y:4,c:0xc040ff,i:.9,d:10},
   {cx:38,cz:46,y:4.2,c:0xffb05a,i:1.3,d:13},{cx:36,cz:48,y:3.8,c:0xff8a2a,i:1.2,d:12},{cx:40,cz:52,y:3.8,c:0xff8a2a,i:1.2,d:12},{cx:38,cz:53,y:2.2,c:0xff7a1a,i:1.6,d:9,oz:.4}]}];
const MAPS_CLEARED=(()=>{ try{ return Math.max(0,Math.min(MAPS.length,parseInt(localStorage.getItem('ddMapsCleared'))||0)); }catch(e){ return 0; } })();
const MAPI=(()=>{ let i=parseInt(Q.get('map')); if(!(i>=0)){ try{ i=parseInt(localStorage.getItem('ddMap'))||0; }catch(e){ i=0; } } return Math.max(0,Math.min(i,MAPS_CLEARED,MAPS.length-1)); })();   // a map past the last one cleared is locked
const MAP=MAPS[MAPI]; MAP.wbase=MAPS.slice(0,MAPI).reduce((a,m)=>a+m.waves,0);
const CELL=2, GW=MAP.gw, GH=MAP.gh, OX=MAP.crystal[0]*CELL+CELL/2, OZ=MAP.crystal[1]*CELL+CELL/2, WALLH=MAP.wallH||7;   // the crystal stands at world (0,0)
const T={WALL:0,FLOOR:1,CARPET:2,DAIS:3,PILLAR:4,SPAWN:5,CRYSTAL:6,PROP:7};
const grid=new Uint8Array(GW*GH);
const idx=(cx,cz)=>cz*GW+cx;
const cw=cx=>cx*CELL+CELL/2-OX, cwz=cz=>cz*CELL+CELL/2-OZ;
const wc=x=>Math.floor((x+OX)/CELL), wcz=z=>Math.floor((z+OZ)/CELL);
const inb=(cx,cz)=>cx>=0&&cz>=0&&cx<GW&&cz<GH;
const gat=(cx,cz)=>inb(cx,cz)?grid[idx(cx,cz)]:T.WALL;
function fill(x0,x1,z0,z1,t){ for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++) grid[idx(x,z)]=t; }
// floor height per cell (raised floors), and stairs: an axis (1 rises north/-z, 2 south/+z, 3 east/+x, 4 west/-x) with the low and high heights of each cell's two steps
const hgt=new Float32Array(GW*GH), rampA=new Int8Array(GW*GH), rampL=new Float32Array(GW*GH), rampH=new Float32Array(GW*GH);
function hfill(x0,x1,z0,z1,y){ for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++) hgt[idx(x,z)]=y; }
function ramp(x0,x1,z0,z1,dir,y0,y1){ const alongZ=dir===1||dir===2; const n=alongZ?(z1-z0+1):(x1-x0+1); for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++){ const k=alongZ?(dir===1?z1-z:z-z0):(dir===3?x-x0:x1-x); const i=idx(x,z); rampA[i]=dir; rampL[i]=y0+(y1-y0)*k/n; rampH[i]=y0+(y1-y0)*(k+1)/n; hgt[i]=(rampL[i]+rampH[i])/2; } }
MAP.build(fill,(x,z,t)=>{ grid[idx(x,z)]=t; },hfill,ramp);
const GOAL=idx(MAP.crystal[0],MAP.crystal[1]);
const LANES=MAP.lanes;
const walk=t=>t===T.FLOOR||t===T.CARPET||t===T.DAIS||t===T.SPAWN;
const heroSolid=t=>t===T.WALL||t===T.PILLAR||t===T.CRYSTAL||t===T.PROP;
const defAt=new Array(GW*GH).fill(null);

// flow fields: 'free' ignores defenses, 'def' respects them
let flowFree=null, flowDef=null;
function bfs(respect){
  const nxt=new Int16Array(GW*GH).fill(-1), dist=new Int16Array(GW*GH).fill(-1);
  dist[GOAL]=0; const q=[GOAL]; let qi=0;
  while(qi<q.length){ const i=q[qi++]; const x=i%GW, z=(i/GW)|0;
    for(let k=0;k<4;k++){ const nx=x+[1,-1,0,0][k], nz=z+[0,0,1,-1][k]; if(!inb(nx,nz)) continue; const j=idx(nx,nz); if(Math.abs(hgt[j]-hgt[i])>.8) continue; /* no path over a ledge: stairs only */
      if(dist[j]>=0||!walk(grid[j])) continue; if(respect&&defAt[j]&&defAt[j].kind!=='slice') continue;
      dist[j]=dist[i]+1; nxt[j]=i; q.push(j); } }
  return {nxt,dist};
}
function reflow(){ flowFree=bfs(false); flowDef=bfs(true); }
reflow();
function los(ax,az,bx,bz){ const d=Math.hypot(bx-ax,bz-az); const n=Math.ceil(d/0.7)||1; for(let i=1;i<n;i++){ const t=i/n; const g=gat(wc(ax+(bx-ax)*t),wcz(az+(bz-az)*t)); if(g===T.WALL||g===T.PILLAR) return false; } return true; }

// ================= RENDERER / SCENE =================
const canvas=$('c'), ov=$('ov'), ovx=ov.getContext('2d');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();
scene.background=C(0x0b0712); scene.fog=new THREE.Fog(C(0x0b0712),(MAP.fog||[24,62])[0],(MAP.fog||[24,62])[1]);   // a big hall needs to be seen end to end from the top of its stairs
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,140);
function onResize(){ renderer.setSize(innerWidth,innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); ov.width=innerWidth; ov.height=innerHeight; }
addEventListener('resize',onResize); onResize();

// lights: cool ambient, warm torches, cyan crystal
scene.add(new THREE.HemisphereLight(C(0x5a4a8a),C(0x130d1a),0.62));
const sun=new THREE.DirectionalLight(C(0x8a7ab0),0.22); sun.position.set(6,14,4); scene.add(sun);
const LIGHTS=MAP.lights.map(l=>Array.isArray(l)?l:[cw(l.cx)+(l.ox||0),l.y,cwz(l.cz)+(l.oz||0),l.c,l.i,l.d]);   // world coords, or {cx,cz} grid cells
const torchLights=[];
// sconces burn brighter and reach further than the crystal / portal glows (the hall was too dark)
const SCONCE_BOOST=1.75, SCONCE_REACH=1.3;
LIGHTS.forEach(([x,y,z,c,i,d])=>{ const torch=(c===0xff8a2a||c===0xffb05a); if(torch){ i*=SCONCE_BOOST; d*=SCONCE_REACH; } const l=new THREE.PointLight(C(c),i,d,2); l.position.set(x,y,z); l.userData.base=i; scene.add(l); torchLights.push(l); });

// toon gradient (4 bands)
const GRAD=(()=>{ const t=new THREE.DataTexture(new Uint8Array([48,120,200,255]),4,1,THREE.LuminanceFormat); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })();
const GRAD_SOFT=(()=>{ const t=new THREE.DataTexture(new Uint8Array([110,165,215,255]),4,1,THREE.LuminanceFormat); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })();
const MATS={};
function mat(hex,o){ const k=hex+JSON.stringify(o||{}); if(!MATS[k]) MATS[k]=new THREE.MeshToonMaterial(Object.assign({color:C(hex),gradientMap:GRAD},o||{})); return MATS[k]; }
function basic(hex,o){ return new THREE.MeshBasicMaterial(Object.assign({color:C(hex)},o||{})); }
// outline: back-face hull pushed along normals, fog-aware
const OL=new THREE.ShaderMaterial({side:THREE.BackSide,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{t:{value:0.028},col:{value:C(0x160c1e)}}]),
  vertexShader:'uniform float t;\n#include <fog_pars_vertex>\nvoid main(){ vec3 p=position+normal*t; vec4 mvPosition=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
  fragmentShader:'uniform vec3 col;\n#include <fog_pars_fragment>\nvoid main(){ gl_FragColor=vec4(col,1.0);\n#include <fog_fragment>\n}'});
function outline(root){ root.traverse(m=>{ if(m.isMesh&&m.material!==OL&&!m.userData.noOL&&!m.isSprite&&!m.userData.isOL){ const o=new THREE.Mesh(m.geometry,OL); o.userData.isOL=true; m.add(o); } }); return root; }
const G={box:(w,h,d)=>new THREE.BoxGeometry(w,h,d), cyl:(rt,rb,h,s)=>new THREE.CylinderGeometry(rt,rb,h,s||10), sph:(r,a,b)=>new THREE.SphereGeometry(r,a||12,b||9), cone:(r,h,s)=>new THREE.ConeGeometry(r,h,s||8)};
function M(geo,m,x,y,z){ const o=new THREE.Mesh(geo,m); if(x!==undefined) o.position.set(x,y,z); return o; }
function glowTex(){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const r=g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.35,'rgba(255,255,255,.45)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }
const GLOWT=glowTex();
function glow(hex,scale,op){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOWT,color:C(hex),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op||.8})); s.scale.set(scale,scale,1); s.userData.noOL=true; return s; }
const SHADOWMAT=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.42,depthWrite:false});
function blob(r){ const m=new THREE.Mesh(new THREE.CircleGeometry(r,14),SHADOWMAT); m.rotation.x=-PI/2; m.position.y=.04; m.userData.noOL=true; return m; }

// ================= PAINTED TEXTURES =================
function cv(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function splat(g,x,y,r,col,a){ g.globalAlpha=a; g.fillStyle=col; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); g.globalAlpha=1; }
function hsl(h,s,l){ return 'hsl('+h+','+s+'%,'+l+'%)'; }
function paintFloor(){
  const S=32, c=cv(GW*S*2,GH*S*2), g=c.getContext("2d"); g.scale(2,2);
  g.fillStyle='#0f0a16'; g.fillRect(0,0,c.width,c.height);
  for(let z=0;z<GH;z++) for(let x=0;x<GW;x++){ const t=grid[idx(x,z)]; if(t===T.WALL) continue; const px=x*S, pz=z*S;
    if(t===T.CARPET){ g.fillStyle='#8c1d24'; g.fillRect(px,pz,S,S); for(let i=0;i<14;i++) splat(g,px+rnd()*S,pz+rnd()*S,R(1.5,4),rnd()<.5?'#5a0f14':'#b03038',.16);
      g.globalAlpha=.32; g.fillStyle='#e8b94a'; g.beginPath(); g.moveTo(px+16,pz+6); g.lineTo(px+26,pz+16); g.lineTo(px+16,pz+26); g.lineTo(px+6,pz+16); g.closePath(); g.fill(); g.globalAlpha=1;
      g.strokeStyle='#e8b94a'; g.lineWidth=3; g.beginPath();
      if(gat(x,z-1)!==T.CARPET){ g.moveTo(px,pz+2); g.lineTo(px+S,pz+2);} if(gat(x,z+1)!==T.CARPET){ g.moveTo(px,pz+S-2); g.lineTo(px+S,pz+S-2);} if(gat(x-1,z)!==T.CARPET){ g.moveTo(px+2,pz); g.lineTo(px+2,pz+S);} if(gat(x+1,z)!==T.CARPET){ g.moveTo(px+S-2,pz); g.lineTo(px+S-2,pz+S);} g.stroke();
    } else if(t===T.DAIS||t===T.CRYSTAL){ g.fillStyle='#2a2136'; g.fillRect(px,pz,S,S); for(let sx=0;sx<2;sx++) for(let sz=0;sz<2;sz++){ g.fillStyle=hsl(36,18,R(28,35)); g.fillRect(px+sx*16+1.5,pz+sz*16+1.5,13,13); }
      for(let i=0;i<6;i++) splat(g,px+rnd()*S,pz+rnd()*S,R(1,3),rnd()<.5?'#3a2e1e':'#c9b48a',.15);
      g.strokeStyle='#e8b94a'; g.lineWidth=2.5; g.beginPath(); const D=v=>v!==T.DAIS&&v!==T.CRYSTAL;
      if(D(gat(x,z-1))){ g.moveTo(px,pz+1.5); g.lineTo(px+S,pz+1.5);} if(D(gat(x,z+1))){ g.moveTo(px,pz+S-1.5); g.lineTo(px+S,pz+S-1.5);} if(D(gat(x-1,z))){ g.moveTo(px+1.5,pz); g.lineTo(px+1.5,pz+S);} if(D(gat(x+1,z))){ g.moveTo(px+S-1.5,pz); g.lineTo(px+S-1.5,pz+S);} g.stroke();
    } else if(t===T.SPAWN){ g.fillStyle='#1d1430'; g.fillRect(px,pz,S,S); for(let i=0;i<10;i++) splat(g,px+rnd()*S,pz+rnd()*S,R(2,5),'#6a2fb0',.18);
    } else { const mar=!!(MAP.style&&MAP.style.marble); g.fillStyle=mar?'#a89c88':'#1c1626'; g.fillRect(px,pz,S,S);
      for(let sx=0;sx<2;sx++) for(let sz=0;sz<2;sz++){ const L=mar?R(58,70)-((x+z)%2?7:0):R(30,41), H=mar?R(34,46):R(246,262), SA=mar?14:17; g.fillStyle=hsl(H,SA,L); g.fillRect(px+sx*16+1.5,pz+sz*16+1.5,13,13);
        g.fillStyle=hsl(H,SA+3,L+12); g.globalAlpha=.35; g.fillRect(px+sx*16+1.5,pz+sz*16+1.5,13,2); g.globalAlpha=1;
        for(let i=0;i<3;i++) splat(g,px+sx*16+2+rnd()*12,pz+sz*16+2+rnd()*12,R(1,3.5),rnd()<.5?hsl(H,15,L-10):hsl(H,22,L+10),.22); }
      if(rnd()<.12){ g.strokeStyle='#120c18'; g.lineWidth=1; g.globalAlpha=.6; g.beginPath(); g.moveTo(px+rnd()*S,pz+rnd()*S); g.lineTo(px+rnd()*S,pz+rnd()*S); g.stroke(); g.globalAlpha=1; }
    }
  }
  for(let i=0;i<7000;i++) splat(g,rnd()*c.width,rnd()*c.height,R(2,7),rnd()<.5?'#000':'#fff',.045);
  const tex=new THREE.CanvasTexture(c); tex.encoding=THREE.sRGBEncoding; tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); return tex;
}
function paintWall(){
  const mar=!!(MAP.style&&MAP.style.marble); const c=cv(256,256), g=c.getContext('2d'); g.fillStyle=mar?'#8a7c6a':'#1a1322'; g.fillRect(0,0,256,256);
  for(let r=0;r<4;r++){ const y0=r*64, off=(r%2)*64; for(let b=-1;b<3;b++){ const x0=b*128+off; const L=mar?R(60,70):R(33,43), H=mar?R(34,44):R(246,258), SA=mar?16:15;
      g.fillStyle=hsl(H,SA,L); g.fillRect(x0+3,y0+3,122,58);
      g.globalAlpha=.5; g.fillStyle=hsl(H,SA+3,L+16); g.fillRect(x0+3,y0+3,122,4); g.fillRect(x0+3,y0+3,4,58); g.globalAlpha=.4; g.fillStyle=mar?'#6a5d4e':'#0d0912'; g.fillRect(x0+3,y0+56,122,5); g.fillRect(x0+121,y0+3,4,58); g.globalAlpha=1;
      for(let i=0;i<9;i++) splat(g,x0+6+rnd()*116,y0+6+rnd()*52,R(2,7),rnd()<.5?hsl(H,12,L-12):hsl(H,20,L+12),.2); } }
  for(let i=0;i<1800;i++) splat(g,rnd()*256,rnd()*256,R(1,5),rnd()<.5?'#000':'#fff',.05);
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.encoding=THREE.sRGBEncoding; tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); return tex;
}
function paintBanner(){
  const c=cv(128,256), g=c.getContext('2d'); g.clearRect(0,0,128,256);
  g.beginPath(); g.moveTo(0,0); g.lineTo(128,0); g.lineTo(128,214); g.lineTo(64,256); g.lineTo(0,214); g.closePath();
  g.fillStyle='#8c1d24'; g.fill(); g.lineWidth=9; g.strokeStyle='#e8b94a'; g.stroke();
  for(let i=0;i<40;i++) splat(g,rnd()*128,rnd()*230,R(2,6),rnd()<.5?'#5a0f14':'#b03038',.18);
  g.fillStyle='#e8b94a'; g.beginPath(); g.arc(64,100,34,0,TAU); g.fill();
  g.fillStyle='#8c1d24'; g.beginPath(); g.moveTo(64,62); g.lineTo(88,116); g.lineTo(40,116); g.closePath(); g.fill();
  g.fillStyle='#e8b94a'; g.fillRect(28,150,72,8); g.fillRect(28,170,72,8);
  const tex=new THREE.CanvasTexture(c); tex.encoding=THREE.sRGBEncoding; return tex;
}
function paintWindow(){ const c=cv(128,320), g=c.getContext('2d'); g.clearRect(0,0,128,320); const arch=()=>{ g.beginPath(); g.moveTo(10,312); g.lineTo(10,110); g.quadraticCurveTo(10,28,64,10); g.quadraticCurveTo(118,28,118,110); g.lineTo(118,312); g.closePath(); };
  arch(); const gr=g.createLinearGradient(0,0,0,320); gr.addColorStop(0,'#1a2a6a'); gr.addColorStop(.6,'#2a3f9a'); gr.addColorStop(1,'#141a44'); g.fillStyle=gr; g.fill();
  g.save(); arch(); g.clip(); for(let i=0;i<40;i++) splat(g,rnd()*128,rnd()*320,R(.6,1.8),'#dfe8ff',.7); g.globalAlpha=.35; g.fillStyle='#8fb8ff'; g.beginPath(); g.arc(88,72,30,0,TAU); g.fill(); g.globalAlpha=.95; g.fillStyle='#f4efd8'; g.beginPath(); g.arc(88,72,15,0,TAU); g.fill(); g.globalAlpha=1;
  g.strokeStyle='#e8b94a'; g.lineWidth=4; g.beginPath(); g.moveTo(64,10); g.lineTo(64,312); g.moveTo(10,150); g.lineTo(118,150); g.moveTo(10,230); g.lineTo(118,230); g.stroke(); g.restore();
  arch(); g.strokeStyle='#e8b94a'; g.lineWidth=9; g.stroke(); arch(); g.strokeStyle='#5a4220'; g.lineWidth=3; g.stroke(); const tex=new THREE.CanvasTexture(c); tex.encoding=THREE.sRGBEncoding; return tex; }
function paintDrape(){ const c=cv(64,256), g=c.getContext('2d'); g.fillStyle='#8c1d24'; g.fillRect(0,0,64,256); for(let x=0;x<64;x+=8){ g.fillStyle=(x/8)%2?'#6a1219':'#a3282f'; g.fillRect(x,0,8,256); g.globalAlpha=.5; g.fillStyle='#b8383f'; g.fillRect(x+2,0,2,256); g.globalAlpha=1; }
  for(let i=0;i<60;i++) splat(g,rnd()*64,rnd()*256,R(1,4),rnd()<.5?'#5a0f14':'#c04048',.15); g.fillStyle='#e8b94a'; g.fillRect(0,0,64,9); g.fillRect(0,247,64,9); g.beginPath(); g.moveTo(0,150); g.quadraticCurveTo(32,172,64,150); g.lineTo(64,162); g.quadraticCurveTo(32,184,0,162); g.closePath(); g.fill();
  const tex=new THREE.CanvasTexture(c); tex.encoding=THREE.sRGBEncoding; return tex; }
const FLOORTEX=paintFloor(), WALLTEX=paintWall(), BANNERTEX=paintBanner(); const WINDOWTEX=(MAP.style&&MAP.style.windows)?paintWindow():null, DRAPETEX=WINDOWTEX?paintDrape():null;

// ================= BUILD THE HALL =================
const world=new THREE.Group(); scene.add(world);
{ const floor=new THREE.Mesh(new THREE.PlaneGeometry(GW*CELL,GH*CELL),new THREE.MeshToonMaterial({map:FLOORTEX,gradientMap:GRAD,color:C(0xffffff)})); floor.rotation.x=-PI/2; floor.position.set(GW*CELL/2-OX,0,GH*CELL/2-OZ); world.add(floor);
  const dais=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshToonMaterial({map:FLOORTEX,gradientMap:GRAD,color:C(0xffffff)})); // raised copy of the dais cells
  const [kx,kz]=MAP.crystal; const u0=(kx-1)/GW,u1=(kx+2)/GW,v0=1-(kz+2)/GH,v1=1-(kz-1)/GH; const uv=dais.geometry.attributes.uv; uv.setXY(0,u0,v1); uv.setXY(1,u1,v1); uv.setXY(2,u0,v0); uv.setXY(3,u1,v0); uv.needsUpdate=true;
  dais.rotation.x=-PI/2; dais.position.set(0,0.5+hgt[GOAL],0); world.add(dais);
  const daisSide=new THREE.Mesh(G.box(6,0.5,6),mat(0x4e4236)); daisSide.position.set(0,0.25+hgt[GOAL],0); world.add(daisSide);
  [[0,-3.05],[0,3.05]].forEach(([x,z])=>world.add(M(G.box(6.2,.1,.12),mat(0xe0b040),x,.5,z))); [[-3.05,0],[3.05,0]].forEach(([x,z])=>world.add(M(G.box(.12,.1,6.2),mat(0xe0b040),x,.5,z)));
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(GW*CELL,GH*CELL),mat(0x120c1a)); ceil.rotation.x=PI/2; ceil.position.set(GW*CELL/2-OX,WALLH,GH*CELL/2-OZ); world.add(ceil);
}
const wallFaces=[];
{ const pos=[],nrm=[],uv=[],ind=[]; let vi=0;
  for(let z=0;z<GH;z++) for(let x=0;x<GW;x++){ if(grid[idx(x,z)]===T.WALL) continue;
    for(let k=0;k<4;k++){ const dx=[1,-1,0,0][k], dz=[0,0,1,-1][k]; if(gat(x+dx,z+dz)!==T.WALL) continue;
      const fx=cw(x)+dx*CELL/2, fz=cwz(z)+dz*CELL/2, tx=dz, tz=-dx, hx=tx*CELL/2, hz=tz*CELL/2;
      const P=[[fx-hx,0,fz-hz],[fx-hx,WALLH,fz-hz],[fx+hx,WALLH,fz+hz],[fx+hx,0,fz+hz]];
      const ua=((fx-hx)*tx+(fz-hz)*tz)/CELL, ub=((fx+hx)*tx+(fz+hz)*tz)/CELL;
      const U=[[ua,0],[ua,WALLH/CELL],[ub,WALLH/CELL],[ub,0]];
      for(let i=0;i<4;i++){ pos.push(P[i][0],P[i][1],P[i][2]); nrm.push(-dx,0,-dz); uv.push(U[i][0],U[i][1]); }
      ind.push(vi,vi+1,vi+2,vi,vi+2,vi+3); vi+=4;
      wallFaces.push({x:fx,z:fz,nx:-dx,nz:-dz,cx:x,cz:z}); } }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geo.setIndex(ind);
  const walls=new THREE.Mesh(geo,new THREE.MeshToonMaterial({map:WALLTEX,gradientMap:GRAD,color:C(0xffffff),side:THREE.DoubleSide})); world.add(walls);
  // dark cap so nothing leaks over the top edge
  const capGeo=new THREE.BufferGeometry(); const cp=[],ci=[]; let cvi=0;
  for(let z=0;z<GH;z++) for(let x=0;x<GW;x++){ if(grid[idx(x,z)]!==T.WALL) continue; const x0=cw(x)-1,x1=cw(x)+1,z0=cwz(z)-1,z1=cwz(z)+1; cp.push(x0,WALLH,z0,x1,WALLH,z0,x1,WALLH,z1,x0,WALLH,z1); ci.push(cvi,cvi+2,cvi+1,cvi,cvi+3,cvi+2); cvi+=4; }
  capGeo.setAttribute('position',new THREE.Float32BufferAttribute(cp,3)); capGeo.setIndex(ci); world.add(new THREE.Mesh(capGeo,basic(0x0b0712)));
}
// raised floors and stairs: tops carry the painted floor (same texture window as the flat floor), drops and risers are stone
{ const tp=[],tn=[],tu=[],ti=[]; let tv=0; const sp=[],sn=[],si=[]; let sv=0;
  const Hc=(cx,cz,fx,fz)=>{ if(!inb(cx,cz)||grid[idx(cx,cz)]===T.WALL) return -1; return floorH(cw(cx)-CELL/2+fx*CELL,cwz(cz)-CELL/2+fz*CELL); };   // -1: a wall (its face covers the drop)
  const side=(A,B,lo,hi,nx,nz)=>{ sp.push(A[0],lo,A[1], A[0],hi,A[1], B[0],hi,B[1], B[0],lo,B[1]); for(let q=0;q<4;q++) sn.push(nx,0,nz); si.push(sv,sv+1,sv+2,sv,sv+2,sv+3); sv+=4; };
  for(let cz=0;cz<GH;cz++) for(let cx=0;cx<GW;cx++){ const i=idx(cx,cz); if(grid[i]===T.WALL||(hgt[i]<=0&&!rampA[i])) continue; const a=rampA[i], alongZ=a===1||a===2; const X0=cw(cx)-CELL/2, Z0=cwz(cz)-CELL/2;
    for(let k=0;k<(a?2:1);k++){ const fx0=(a&&!alongZ)?k/2:0, fx1=(a&&!alongZ)?(k+1)/2:1, fz0=(a&&alongZ)?k/2:0, fz1=(a&&alongZ)?(k+1)/2:1; const y=Hc(cx,cz,(fx0+fx1)/2,(fz0+fz1)/2);
      const P=[[X0+fx0*CELL,Z0+fz0*CELL],[X0+fx0*CELL,Z0+fz1*CELL],[X0+fx1*CELL,Z0+fz1*CELL],[X0+fx1*CELL,Z0+fz0*CELL]], U=[[fx0,fz0],[fx0,fz1],[fx1,fz1],[fx1,fz0]];
      for(let q=0;q<4;q++){ tp.push(P[q][0],y,P[q][1]); tn.push(0,1,0); tu.push((cx+U[q][0])/GW,1-(cz+U[q][1])/GH); } ti.push(tv,tv+1,tv+2,tv,tv+2,tv+3); tv+=4; }
    // drops to lower neighbours and the riser between a stair cell's two steps, in half-cell segments
    for(let sgm=0;sgm<2;sgm++){ const f0=sgm/2, f1=(sgm+1)/2, fm=(f0+f1)/2;
      const E=[[1,0,[X0+CELL,Z0+f0*CELL],[X0+CELL,Z0+f1*CELL],Hc(cx,cz,.99,fm),Hc(cx+1,cz,.01,fm)],[-1,0,[X0,Z0+f1*CELL],[X0,Z0+f0*CELL],Hc(cx,cz,.01,fm),Hc(cx-1,cz,.99,fm)],[0,1,[X0+f1*CELL,Z0+CELL],[X0+f0*CELL,Z0+CELL],Hc(cx,cz,fm,.99),Hc(cx,cz+1,fm,.01)],[0,-1,[X0+f0*CELL,Z0],[X0+f1*CELL,Z0],Hc(cx,cz,fm,.01),Hc(cx,cz-1,fm,.99)]];
      for(const [nx,nz,A,B,mine,theirs] of E){ if(theirs<0||mine<=theirs+.01) continue; side(A,B,theirs,mine,nx,nz); }
      if(a){ const lo=Hc(cx,cz,alongZ?fm:(a===3?.49:.51),alongZ?(a===1?.51:.49):fm), hi=Hc(cx,cz,alongZ?fm:(a===3?.51:.49),alongZ?(a===1?.49:.51):fm); if(hi>lo+.01){ const A=alongZ?[X0+f0*CELL,Z0+CELL/2]:[X0+CELL/2,Z0+f0*CELL], B=alongZ?[X0+f1*CELL,Z0+CELL/2]:[X0+CELL/2,Z0+f1*CELL]; const nx=a===3?-1:a===4?1:0, nz=a===1?1:a===2?-1:0; side(nx===-1||nz===-1?B:A,nx===-1||nz===-1?A:B,lo,hi,nx,nz); } } } }
  if(tv){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(tp,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(tn,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(tu,2)); g.setIndex(ti); world.add(new THREE.Mesh(g,new THREE.MeshToonMaterial({map:FLOORTEX,gradientMap:GRAD,color:C(0xffffff),side:THREE.DoubleSide})));
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3)); sg.setAttribute('normal',new THREE.Float32BufferAttribute(sn,3)); sg.setIndex(si); world.add(new THREE.Mesh(sg,mat(0x3e3450,{side:THREE.DoubleSide}))); } }
// pillars, props, torches, banners
const flames=[];
function makeTorch(){ const g=new THREE.Group(); g.add(M(G.box(.14,.14,.34),mat(0x2b2540),0,0,.17)); const h=M(G.cyl(.05,.07,.7,7),mat(0x6b4a2a),0,.2,.34); h.rotation.x=-.35; g.add(h);
  g.add(M(G.cyl(.09,.07,.14,7),mat(0x3a3348),0,.56,.45));
  const f=M(G.cone(.17,.5,7),basic(0xff7a1a),0,.85,.46); f.userData.noOL=true; const f2=M(G.cone(.09,.34,7),basic(0xffd060),0,.82,.46); f2.userData.noOL=true; g.add(f,f2); const gl=glow(0xff8a2a,2.6,.7); gl.position.set(0,.9,.46); g.add(gl); flames.push({f,f2,p:rnd()*9}); return g; }
{ // pillars
  MAP.pillars.forEach(([x,z])=>{ const g=new THREE.Group(); g.position.set(cw(x),0,cwz(z));
    g.add(M(G.box(2,.5,2),mat(0x4a4262),0,.25,0)); g.add(M(G.cyl(.62,.7,6,12),mat(0x5a5276),0,3.5,0)); g.add(M(G.box(2,.5,2),mat(0x4a4262),0,6.75,0)); g.add(M(G.box(1.6,.2,1.6),mat(0xe0b040),0,.6,0)); world.add(g); });
  // props: barrels & crates in the hall corners
  MAP.barrels.forEach(([x,z])=>{ const g=new THREE.Group(); g.position.set(cw(x),0,cwz(z)); const bm=mat(0x7a4f2c), band=mat(0x2b2540);
    [[-.4,0,-.3],[.45,0,.35],[0,1.1,0]].forEach(([bx,by,bz])=>{ const b=new THREE.Group(); b.position.set(bx,by+.55,bz); b.add(M(G.cyl(.42,.42,1.1,10),bm)); b.add(M(G.cyl(.45,.45,.1,10),band,0,.35,0)); b.add(M(G.cyl(.45,.45,.1,10),band,0,-.35,0)); g.add(b); }); world.add(outline(g)); });
  MAP.crates.forEach(([x,z])=>{ const g=new THREE.Group(); g.position.set(cw(x),0,cwz(z)); const cm=mat(0x8a5e34);
    g.add(M(G.box(1.1,1.1,1.1),cm,-.35,.55,.2)); g.add(M(G.box(.9,.9,.9),cm,.5,.45,-.3)); g.add(M(G.box(.8,.8,.8),cm,-.2,1.5,.2)); g.add(M(G.box(1.14,.08,.08),mat(0x3a2a20),-.35,.55,.76)); world.add(outline(g)); });
  // torches + banners along the walls
  const [hx0,hx1,hz0,hz1]=MAP.hall; const WIN=new Set(); let nWin=0;
  if(WINDOWTEX){ let k=0; wallFaces.forEach(f=>{ if(!(f.cx>=hx0&&f.cx<=hx1&&f.cz>=hz0&&f.cz<=hz1)) return; k++; if(k%6!==2) return; WIN.add(f); nWin++; const yaw=Math.atan2(f.nx,f.nz), tx=f.nz, tz=-f.nx;   // tall arched windows with crimson drapes, every sixth hall face
      const w=new THREE.Mesh(new THREE.PlaneGeometry(2.4,6),new THREE.MeshBasicMaterial({map:WINDOWTEX,transparent:true,alphaTest:.5,side:THREE.DoubleSide})); w.position.set(f.x+f.nx*.1,WALLH*.56,f.z+f.nz*.1); w.rotation.y=yaw; w.userData.noOL=true; w.userData.window=true; world.add(w);
      const dh=WALLH*.62; for(const sd of [-1,1]){ const d=new THREE.Mesh(new THREE.PlaneGeometry(1.0,dh),new THREE.MeshToonMaterial({map:DRAPETEX,gradientMap:GRAD,color:C(0xffffff),side:THREE.DoubleSide})); d.position.set(f.x+f.nx*.16+tx*sd*1.75,WALLH*.5,f.z+f.nz*.16+tz*sd*1.75); d.rotation.y=yaw; d.userData.noOL=true; world.add(d); }
      const rod=M(G.cyl(.06,.06,4.9,6),mat(0xe0b040),f.x+f.nx*.2,WALLH*.5+dh/2+.12,f.z+f.nz*.2); rod.rotation.set(0,yaw,PI/2); world.add(rod); for(const sd of [-1,1]) world.add(M(G.sph(.14,7,6),mat(0xe0b040),f.x+f.nx*.2+tx*sd*2.45,WALLH*.5+dh/2+.12,f.z+f.nz*.2+tz*sd*2.45)); }); }
  world.userData.windows=nWin;
  let i=0; wallFaces.forEach(f=>{ const inHall=f.cx>=hx0&&f.cx<=hx1&&f.cz>=hz0&&f.cz<=hz1; i++; if(WIN.has(f)) return;
    const yaw=Math.atan2(f.nx,f.nz);
    if(i%4===1){ const t=makeTorch(); t.position.set(f.x,3.1,f.z); t.rotation.y=yaw; world.add(t); }
    else if(inHall&&i%4===3){ const b=new THREE.Mesh(new THREE.PlaneGeometry(1.3,2.6),new THREE.MeshToonMaterial({map:BANNERTEX,gradientMap:GRAD,color:C(0xffffff),transparent:true,side:THREE.DoubleSide,alphaTest:.5})); b.position.set(f.x+f.nx*.12,4.2,f.z+f.nz*.12); b.rotation.y=yaw; world.add(b); const rod=M(G.cyl(.05,.05,1.7,6),mat(0xe0b040),f.x+f.nx*.12,5.5,f.z+f.nz*.12); rod.rotation.y=yaw; rod.rotation.z=PI/2; world.add(rod); } });
  if(MAP.throne){ const [tx,tz]=MAP.throne; const g=new THREE.Group(); g.position.set(cw(tx),hgt[idx(tx,tz)],cwz(tz)); const st=mat(0x4a4262), gd=mat(0xe0b040), rd=mat(0xa01c28), dk=mat(0x2b2540);   // the throne: a wide stone seat, tall back, gold trim, red cushion, facing the hall
    g.add(M(G.box(4.2,.35,3.2),st,0,.17,.2)); g.add(M(G.box(2.6,1.0,1.9),dk,0,.85,-.1)); g.add(M(G.box(2.4,.28,1.6),rd,0,1.45,0)); g.add(M(G.box(3.0,3.6,.5),dk,0,2.6,-1.15)); g.add(M(G.box(2.6,3.2,.12),rd,0,2.7,-.85)); g.add(M(G.box(3.2,.2,.6),gd,0,4.45,-1.15));
    for(const sx of [-1,1]){ g.add(M(G.box(.4,.7,1.9),dk,sx*1.5,1.55,-.1)); g.add(M(G.box(.5,.12,2.0),gd,sx*1.5,1.95,-.1)); g.add(M(G.sph(.28,8,6),gd,sx*1.4,4.7,-1.15)); g.add(M(G.cyl(.16,.2,.9,7),gd,sx*1.45,.8,.9)); }
    world.add(outline(g)); }
  // chandelier over the north half of the hall
  for(const [chx,chz] of (MAP.chandeliers||[MAP.chandelier])){ const ch=new THREE.Group(); ch.position.set(chx,WALLH-1.8,chz); const ring=M(new THREE.TorusGeometry(1.6,.09,6,18),mat(0x2b2540)); ring.rotation.x=PI/2; ch.add(ring); ch.add(M(G.cyl(.03,.03,1.8,5),mat(0x2b2540),0,.9,0));
  for(let k=0;k<6;k++){ const a=k/6*TAU; ch.add(M(G.cyl(.06,.06,.32,6),mat(0xf4ead0),Math.cos(a)*1.6,.2,Math.sin(a)*1.6)); const f=M(G.cone(.08,.24,6),basic(0xffd060),Math.cos(a)*1.6,.48,Math.sin(a)*1.6); f.userData.noOL=true; ch.add(f); flames.push({f,f2:f,p:k}); } const cg=glow(0xffb05a,3,.5); cg.position.y=.4; ch.add(cg); world.add(ch); }
  // beams
  MAP.beams.zs.forEach(z=>world.add(M(G.box(MAP.beams.w,.5,.5),mat(0x2a1f2c),0,WALLH-.25,z)));
}
// crystal on its pedestal
const crystalG=new THREE.Group(); crystalG.position.y=hgt[GOAL]; world.add(crystalG);
const crystalMesh=(()=>{ const m=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshToonMaterial({color:C(0x2fb8e8),emissive:C(0x0e7aa8),emissiveIntensity:.55,gradientMap:GRAD})); m.scale.set(1,1.9,1); return m; })();
{ crystalG.add(M(G.cyl(1.5,1.7,.3,12),mat(0x4a4262),0,.65,0)); crystalG.add(M(G.cyl(1.1,1.3,.3,12),mat(0x5a5276),0,.95,0)); crystalG.add(M(G.cyl(.7,.9,.35,10),mat(0x4a4262),0,1.27,0)); crystalG.add(M(G.cyl(1.32,1.32,.08,12),mat(0xe0b040),0,.83,0));
  const cg=new THREE.Group(); cg.position.y=3.2; cg.add(outline(crystalMesh)); cg.add(glow(0x4ae6ff,4.2,.45)); crystalG.add(cg); crystalG.userData.cg=cg;
  for(let k=0;k<4;k++){ const s=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),basic(0x9af8ff)); s.userData.noOL=true; s.userData.a=k/4*TAU; cg.add(s); crystalG.userData['s'+k]=s; } }
// spawn portals
const portals=[];
Object.entries(LANES).forEach(([k,l])=>{ const g=new THREE.Group(); g.position.set(cw(l.cx),0,cwz(l.cz)); g.rotation.y=l.face;
  const arch=new THREE.Group(); arch.position.z=-1.1; // stands at the back of the spawn room, facing the corridor
  arch.add(M(G.box(.6,4,.6),mat(0x2a2136),-1.7,2,0)); arch.add(M(G.box(.6,4,.6),mat(0x2a2136),1.7,2,0)); arch.add(M(G.box(4,.7,.7),mat(0x2a2136),0,4.2,0)); arch.add(M(G.box(.5,.5,.5),mat(0xe0b040),0,4.75,0));
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.5,20),new THREE.MeshBasicMaterial({color:C(0x4a1690),transparent:true,opacity:.9,side:THREE.DoubleSide})); disc.position.y=1.9; disc.userData.noOL=true;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.45,20,1),new THREE.MeshBasicMaterial({color:C(0xc040ff),transparent:true,opacity:.8,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})); ring.position.y=1.9; ring.position.z=.02; ring.userData.noOL=true;
  const pg=glow(0xc040ff,4.5,.6); pg.position.y=1.9; arch.add(disc,ring,pg); g.add(outline(arch)); world.add(g); portals.push({g,ring,disc,k}); });

// ================= MODELS =================
function limb(x,y,len,r,m){ const l=new THREE.Group(); l.position.set(x,y,0); l.add(M(G.cyl(r,r*.85,len,7),m,0,-len/2,0)); l.userData.len=len; return l; }
function makeHero(){
  const g=new THREE.Group();
  const skin=mat(0xf2c39a), armor=mat(0x5b6f9e), steel=mat(0xc4ced9), gold=mat(0xe0b040), red=mat(0xc8262b), beard=mat(0xf4f0ea), boot=mat(0x4a3423), dark=mat(0x2b2540), capeM=mat(0x2b4a9e,{side:THREE.DoubleSide});
  function leg(x){ const l=new THREE.Group(); l.position.set(x,.5,0); l.add(M(G.cyl(.13,.15,.42,8),dark,0,-.2,0)); l.add(M(G.box(.28,.16,.4),boot,0,-.44,.05)); return l; }
  const legL=leg(-.19), legR=leg(.19); g.add(legL,legR);
  g.add(M(G.cyl(.4,.36,.7,10),armor,0,.85,0)); g.add(M(G.cyl(.43,.43,.1,10),gold,0,.55,0)); g.add(M(G.box(.5,.42,.12),steel,0,.95,.36));
  const em=M(G.sph(.16,8,6),gold,0,.98,.42); em.scale.set(1,1,.5); g.add(em);
  const head=new THREE.Group(); head.position.y=1.55; g.add(head);
  head.add(M(G.sph(.42,14,11),skin)); head.add(M(G.sph(.11,8,6),skin,0,-.07,.4));
  const eL=M(G.sph(.05,6,5),basic(0x1a1020),-.14,.05,.37), eR=M(G.sph(.05,6,5),basic(0x1a1020),.14,.05,.37); eL.userData.noOL=eR.userData.noOL=true; head.add(eL,eR);
  const bd=M(G.sph(.33,12,9),beard,0,-.23,.22); bd.scale.set(1,1.15,.75); head.add(bd);
  const hat=M(G.cone(.47,.95,12),red,0,.62,0); hat.rotation.x=-.12; head.add(hat); head.add(M(G.cyl(.48,.5,.12,12),steel,0,.2,0));
  function arm(x){ const a=new THREE.Group(); a.position.set(x,1.12,0); a.add(M(G.cyl(.1,.09,.5,8),armor,0,-.25,0)); a.add(M(G.sph(.12,8,6),skin,0,-.52,0)); return a; }
  const armR=arm(-.46), armL=arm(.46); g.add(armR,armL);
  const sw=new THREE.Group(); sw.position.set(0,-.52,0); sw.add(M(G.cyl(.04,.04,.22,6),dark,0,.02,0)); sw.add(M(G.sph(.06,6,5),gold,0,.14,0)); sw.add(M(G.box(.36,.06,.1),gold,0,-.1,0)); sw.add(M(G.box(.12,.95,.03),steel,0,-.6,0)); const tip=M(G.cone(.06,.14,4),steel,0,-1.14,0); tip.rotation.x=PI; sw.add(tip); armR.add(sw);
  const sh=new THREE.Group(); sh.position.set(0,-.4,.16); const disc=M(G.cyl(.45,.45,.06,14),red); disc.rotation.x=PI/2; sh.add(disc); const rim=M(new THREE.TorusGeometry(.45,.04,6,16),gold); sh.add(rim); sh.add(M(G.sph(.1,8,6),gold,0,0,.05)); armL.add(sh);
  const capeG=new THREE.Group(); capeG.position.set(0,1.25,-.36); const cp=M(new THREE.PlaneGeometry(.9,1.0),capeM,0,-.5,0); cp.userData.noOL=true; capeG.add(cp); g.add(capeG);
  outline(g);
  return {g,legL,legR,armR,armL,capeG,head};
}
function makeGoblin(kind){
  const g=new THREE.Group(); let skin,cloth,sc=1,h=1.4,r=.42; const steel=mat(0xc4ced9), wood=mat(0x6b4a2a), eye=basic(0xff3030);
  if(kind==='goblin'){ skin=mat(0x62b03c); cloth=mat(0x5a3a22); }
  else if(kind==='orc'){ skin=mat(0x4f8a35); cloth=mat(0x3a2a1a); sc=1.55; h=2.1; r=.65; }
  else if(kind==='archer'){ skin=mat(0xc8843a); cloth=mat(0x3a2a1a); sc=1.1; h=1.55; r=.42; }
  else { skin=mat(0x9a8a5c); cloth=mat(0x4a2e1a); sc=2.4; h=3.3; r=1.05; }
  const bulky=kind==='orc'||kind==='ogre';
  const legL=limb(-.14,.42,.36,bulky?.11:.08,skin), legR=limb(.14,.42,.36,bulky?.11:.08,skin); g.add(legL,legR);
  g.add(M(G.cyl(bulky?.3:.2,bulky?.36:.24,.44,8),skin,0,.66,0)); g.add(M(G.box(bulky?.62:.44,.22,bulky?.5:.34),cloth,0,.44,0));
  if(bulky){ const belly=M(G.sph(.33,10,8),skin,0,.62,.08); belly.scale.set(1,.85,.9); g.add(belly); }
  const head=new THREE.Group(); head.position.y=bulky?1.08:1.1; g.add(head);
  head.add(M(G.sph(bulky?.32:.3,12,9),skin));
  const eL=M(G.sph(.05,6,5),eye,-.11,.04,.26), eR=M(G.sph(.05,6,5),eye,.11,.04,.26); eL.userData.noOL=eR.userData.noOL=true; head.add(eL,eR);
  const nose=M(G.cone(.06,.18,5),skin,0,-.04,.32); nose.rotation.x=PI/2; head.add(nose);
  if(kind==='goblin'||kind==='archer'){ const earL=M(G.cone(.08,.38,5),skin,-.34,.08,0); earL.rotation.z=PI/2; const earR=M(G.cone(.08,.38,5),skin,.34,.08,0); earR.rotation.z=-PI/2; head.add(earL,earR); }
  if(bulky){ const jaw=M(G.box(.34,.14,.24),skin,0,-.22,.16); head.add(jaw); [-.1,.1].forEach(x=>{ const t=M(G.cone(.035,.16,5),mat(0xf4f0ea),x,-.1,.3); head.add(t); }); }
  if(kind==='archer'){ const hood=M(G.cone(.36,.6,9),cloth,0,.2,-.02); head.add(hood); const cl=M(G.cyl(.3,.4,.5,8),cloth,0,.7,0); g.add(cl); }
  if(kind==='ogre'){ const horn=M(G.cone(.07,.3,5),mat(0xf4f0ea),0,.28,.02); head.add(horn); }
  const armL=limb(.3,.86,.38,bulky?.09:.06,skin), armR=limb(-.3,.86,.38,bulky?.09:.06,skin); g.add(armL,armR);
  if(kind==='goblin'){ const d=new THREE.Group(); d.position.y=-.4; d.add(M(G.box(.05,.34,.02),steel,0,-.15,0)); d.add(M(G.box(.14,.04,.05),wood,0,.02,0)); armR.add(d); }
  else if(kind==='archer'){ const bow=M(new THREE.TorusGeometry(.42,.025,5,12,PI),wood,0,-.36,.1); bow.rotation.y=PI/2; bow.rotation.z=-PI/2; armL.add(bow); const qv=M(G.cyl(.08,.08,.5,6),cloth,-.18,.8,-.22); qv.rotation.x=.4; g.add(qv); }
  else { const c=new THREE.Group(); c.position.y=-.36; c.add(M(G.cyl(.05,.07,.6,6),wood,0,-.25,0)); c.add(M(G.sph(.15,8,6),wood,0,-.58,0)); if(kind==='ogre'){ for(let k=0;k<4;k++){ const a=k/4*TAU; const sp=M(G.cone(.03,.14,4),steel,Math.cos(a)*.16,-.58,Math.sin(a)*.16); sp.rotation.z=-Math.cos(a)*PI/2; sp.rotation.x=Math.sin(a)*PI/2; c.add(sp); } } armR.add(c); }
  g.scale.set(sc,sc,sc); const sh=blob(r*1.1/sc); sh.position.y=.04/sc; g.add(sh);
  outline(g);
  return {g,legs:[legL,legR],arms:[armL,armR],head,h,r};
}
function makeDef(kind,ghost){
  const g=new THREE.Group(); const stone=mat(0x5a5276), wood=mat(0x7a4f2c), dark=mat(0x2b2540), steel=mat(0xc4ced9), rope=mat(0xcbb58a), gold=mat(0xe0b040), red=mat(0xc8262b);
  if(kind==='harpoon'){
    g.add(M(G.cyl(.85,.95,.3,10),stone,0,.15,0)); g.add(M(G.cyl(.16,.2,.8,8),wood,0,.7,0)); g.add(M(G.box(.5,.12,.5),dark,0,1.05,0));
    const yoke=new THREE.Group(); yoke.position.y=1.18; yoke.add(M(G.box(.26,.2,1.7),wood,0,0,.1));
    const lL=M(G.box(.08,.1,.9),wood,-.45,.02,.55); lL.rotation.y=-.55; const lR=M(G.box(.08,.1,.9),wood,.45,.02,.55); lR.rotation.y=.55; yoke.add(lL,lR);
    const s=M(G.cyl(.015,.015,1.7,4),rope,0,.02,.2); s.rotation.z=PI/2; yoke.add(s);
    const hp=new THREE.Group(); hp.position.set(0,.17,.2); const shaft=M(G.cyl(.035,.035,1.5,6),dark); shaft.rotation.x=PI/2; hp.add(shaft); const tip=M(G.cone(.07,.28,6),steel,0,0,.85); tip.rotation.x=PI/2; hp.add(tip); yoke.add(hp);
    const w=M(G.cyl(.08,.08,.4,8),dark,0,.02,-.75); w.rotation.z=PI/2; yoke.add(w); yoke.add(M(G.box(.06,.06,.5),wood,0,.02,-.45));
    g.add(yoke); g.userData.yoke=yoke; g.userData.hp=hp;
  } else if(kind==='acorn'){
    const bark=mat(0x5a3a1e), leaf=mat(0x4f8f3a); g.add(M(G.cyl(.62,.78,.9,9),wood,0,.45,0)); g.add(M(G.cyl(.66,.66,.08,9),bark,0,.3,0)); g.add(M(G.cyl(.7,.7,.08,9),bark,0,.7,0));
    [[.5,.6,.2,.4],[-.45,.7,-.3,-1.2],[.2,.75,-.55,2.1]].forEach(([x,y,z,r])=>{ const l=M(G.box(.34,.03,.2),leaf,x,y,z); l.rotation.y=r; l.rotation.x=.3; g.add(l); });
    const yoke=new THREE.Group(); yoke.position.y=1.05; const barrel=M(G.cyl(.2,.24,1.2,9),bark,0,0,.25); barrel.rotation.x=PI/2; yoke.add(barrel); [-.1,.35,.7].forEach(z=>{ const b=M(G.cyl(.25,.25,.08,9),steel,0,0,z); b.rotation.x=PI/2; yoke.add(b); });
    yoke.add(M(G.box(.5,.14,.4),dark,0,-.14,-.1)); const hp=acornMesh(); hp.position.set(0,0,.9); yoke.add(hp); g.add(yoke); g.userData.yoke=yoke; g.userData.hp=hp;
  } else if(kind==='ball'){
    g.add(M(G.cyl(.85,.95,.3,10),stone,0,.15,0)); const tur=new THREE.Group(); tur.position.y=.3; tur.add(M(G.box(1.2,.16,1.4),wood,0,.08,0));
    [-.42,.42].forEach(x=>{ const a=M(G.box(.12,1.7,.12),wood,x,.9,.35); a.rotation.x=.4; const b=M(G.box(.12,1.7,.12),wood,x,.9,-.35); b.rotation.x=-.4; tur.add(a,b); });
    const axle=M(G.cyl(.06,.06,1.0,6),dark,0,1.62,0); axle.rotation.z=PI/2; tur.add(axle);
    const arm=new THREE.Group(); arm.position.y=1.62; arm.rotation.x=-.9; arm.add(M(G.box(.1,.12,2.6),wood,0,0,-.3)); arm.add(M(G.box(.5,.42,.42),dark,0,-.1,.85)); const sling=M(G.cyl(.02,.02,.5,4),rope,0,-.22,-1.5); arm.add(sling);
    const turnip=turnipMesh(); turnip.position.set(0,-.45,-1.55); arm.add(turnip); tur.add(arm); g.add(tur); g.userData.yoke=tur; g.userData.arm=arm; g.userData.ball=turnip;
  } else if(kind==='slice'){
    const cream=mat(0xf1e6d0), capM=mat(0xb04ad0), spot=basic(0xffffff);
    for(let k=0;k<8;k++){ const a=k/8*TAU+.2, r=2.3, sc=.8+((k*7)%3)*.2; g.add(M(G.cyl(.07,.1,.42*sc,6),cream,Math.cos(a)*r,.21*sc,Math.sin(a)*r)); const cap=M(G.sph(.24*sc,9,7),capM,Math.cos(a)*r,.44*sc,Math.sin(a)*r); cap.scale.y=.6; g.add(cap);
      for(let q=0;q<3;q++){ const b=(q/3)*TAU+k; const sp=M(G.sph(.045,5,4),spot,Math.cos(a)*r+Math.cos(b)*.15*sc,.5*sc,Math.sin(a)*r+Math.sin(b)*.15*sc); sp.userData.noOL=true; g.add(sp); } }
    const disc=new THREE.Mesh(new THREE.CircleGeometry(2.5,24),new THREE.MeshBasicMaterial({color:C(0xb04ad0),transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false})); disc.rotation.x=-PI/2; disc.position.y=.05; disc.userData.noOL=true; g.add(disc);
    const hub=new THREE.Group(); for(let k=0;k<7;k++){ const a=k/7*TAU, r=.4+((k*5)%3)*.55; const pf=glow(0xd08aff,.7+((k*3)%2)*.3,.3); pf.position.set(Math.cos(a)*r,.4,Math.sin(a)*r); pf.userData.ph=k*.31; hub.add(pf); } g.add(hub); g.userData.hub=hub;
  } else {
    const leafD=mat(0x2f5a2a), leafL=mat(0x3f7a36), thorn=mat(0x6b4a2a), berry=basic(0xd8323c);
    for(let k=0;k<7;k++){ const x=-.85+k*.28, h=.7+((k*5)%3)*.18; const b=M(G.box(.42,h,.5),k%2?leafD:leafL,x,h/2+.05,(k%3-1)*.08); b.rotation.y=((k*7)%5-2)*.18; b.rotation.z=((k*3)%3-1)*.08; g.add(b); }
    g.add(M(G.box(1.9,.16,.44),leafD,0,.9,0));
    for(let k=0;k<12;k++){ const x=-.9+k*.16, zf=k%2?.32:-.32; const t=M(G.cone(.045,.28,4),thorn,x,.35+((k*5)%4)*.16,zf); t.rotation.x=zf>0?PI/2-.3:-(PI/2-.3); t.rotation.z=((k*3)%3-1)*.3; g.add(t); }
    for(let k=0;k<6;k++){ const b=M(G.sph(.05,5,4),berry,-.7+k*.28,.55+((k*7)%3)*.14,k%2?.28:-.28); b.userData.noOL=true; g.add(b); }
  }
  if(ghost){ g.traverse(m=>{ if(m.isMesh) m.material=GHOST_OK; }); } else { outline(g); g.add(blob(.95)); }
  return g;
}
const GHOST_OK=new THREE.MeshBasicMaterial({color:C(0x40ff80),transparent:true,opacity:.45,depthWrite:false});
// a defense's sector of fire drawn on the floor: translucent wedge + bright edge
function sectorMesh(range,arcDeg,hex){ const g=new THREE.Group(); if(!range) return g; const arc=Math.min(TAU,arcDeg*PI/180), full=arc>=TAU-.01, n=Math.max(10,Math.round(arc/(PI/18)));
  const pos=[0,0,0]; for(let i=0;i<=n;i++){ const a=-arc/2+arc*i/n; pos.push(Math.sin(a)*range,0,Math.cos(a)*range); } const ind=[]; for(let i=1;i<=n;i++) ind.push(0,i,i+1);
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setIndex(ind);
  const fill=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:C(hex),transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide})); fill.position.y=.06; fill.userData.noOL=true; g.add(fill);
  const lp=[]; if(!full) lp.push(0,0,0); for(let i=0;i<=n;i++){ const a=-arc/2+arc*i/n; lp.push(Math.sin(a)*range,0,Math.cos(a)*range); }
  const lg=new THREE.BufferGeometry(); lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3)); const line=new THREE.LineLoop(lg,new THREE.LineBasicMaterial({color:C(hex),transparent:true,opacity:.9})); line.position.y=.07; line.userData.noOL=true; g.add(line);
  g.userData.fill=fill; g.userData.line=line; return g; }
function tintSector(g,hex){ if(!g.userData.fill) return; g.userData.fill.material.color=C(hex); g.userData.line.material.color=C(hex); }
let ghostSector=null, hoverSector=null, hoverFor=null;
const GHOST_BAD=new THREE.MeshBasicMaterial({color:C(0xff3030),transparent:true,opacity:.45,depthWrite:false});
function harpoonMesh(){ const g=new THREE.Group(); const s=M(G.cyl(.035,.035,1.3,6),mat(0x2b2540)); s.rotation.x=PI/2; g.add(s); const t=M(G.cone(.07,.26,6),mat(0xc4ced9),0,0,.75); t.rotation.x=PI/2; g.add(t); return g; }
function acornMesh(){ const g=new THREE.Group(); g.add(M(G.sph(.28,8,6),mat(0x9a6a3a),0,0,0)); const cap=M(G.cyl(.3,.34,.2,8),mat(0x5a3a1e),0,.17,0); g.add(cap); g.add(M(G.cyl(.03,.03,.14,4),mat(0x5a3a1e),0,.34,0)); outline(g); return g; }
function turnipMesh(){ const g=new THREE.Group(); const body=M(G.sph(.3,10,8),mat(0xece2f2)); body.scale.y=.85; g.add(body); const top=M(G.sph(.24,10,8),mat(0x9a5ab8),0,.14,0); top.scale.y=.6; g.add(top); const leaf=mat(0x4f8f3a); [[.08,.3,0,.4],[-.06,.34,.05,-.3],[0,.32,-.08,1.2]].forEach(([x,y,z,r])=>{ const l=M(G.box(.06,.24,.02),leaf,x,y,z); l.rotation.z=r; g.add(l); }); outline(g); return g; }
function ballMesh(){ const g=new THREE.Group(); const m=M(G.sph(.42,12,10),mat(0x1a1620)); [[.1,.34,.22],[-.12,.34,.22],[0,.4,.1]].forEach(([x,y,z])=>{ const h=M(G.sph(.06,6,5),basic(0x000000),x,y,z); h.userData.noOL=true; m.add(h); }); outline(m); g.add(m); g.userData.m=m; return g; }
function arrowMesh(){ const g=new THREE.Group(); const s=M(G.cyl(.02,.02,.9,4),mat(0x6b4a2a)); s.rotation.x=PI/2; g.add(s); const t=M(G.cone(.04,.14,4),mat(0xc4ced9),0,0,.5); t.rotation.x=PI/2; g.add(t); return g; }
function orbMesh(){ const g=new THREE.Group(); const o=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),basic(0x7af4ff)); o.userData.noOL=true; g.add(o); g.add(glow(0x4ae6ff,1.2,.7)); g.userData.o=o; return g; }

// ================= GAME STATE =================
// the Warden's defenses. Internal keys are historical; the names are what the player sees.
const DEFS={
  harpoon:{name:'Ballista',ic:'🏹',du:4,mana:60,hp:90,top:1.6,range:22,arc:16,arcs:[16,22,28,34,40],cd:1.6,dmg:6},        // single bolt, long range; cone widens with each of its four upgrades
  acorn:{name:'Acorn Cannon',ic:'🌰',du:3,mana:45,hp:80,top:1.4,range:12,rangeUp:1.5,arc:70,cd:1.1,dmg:3,shots:3},          // a hollow oak stump that sprays three bouncing acorns in a cone
  ball:{name:'Turnip Trebuchet',ic:'🥔',du:5,mana:80,hp:90,top:2.2,range:17,arc:100,cd:2.8,dmg:6,splash:1.9},               // lobs a turnip that splats for area damage
  slice:{name:'Mushroom Ring',ic:'🍄',du:6,mana:90,hp:110,top:.05,range:2.6,rangeUp:.6,arc:360,cd:.45,dmg:2,slow:.55},     // a fairy ring: mobs inside are spored (damage over time) and slowed; heavy traffic tramples it
  spike:{name:'Bramble Hedge',ic:'🌿',du:3,mana:40,hp:170,top:1.0,thorns:2,regrow:3}};                                       // a thorn wall that hurts attackers and regrows when left alone
const DEFKEYS=['harpoon','acorn','ball','slice','spike']; const MAXLVL=5, MARK=['','I','II','III','IV','V'];
// a defense's sector of fire at its current mark
function arcOf(d){ const cfg=DEFS[d.kind]; if(cfg.arcs) return cfg.arcs[Math.min(cfg.arcs.length-1,(d.lvl||1)-1)]; return cfg.arc||360; }
function mobSpd(e){ return e.spd*(e.slowT>0?DEFS.slice.slow:1); }   // spored mobs crawl
const MOBS={goblin:{hp:10,spd:3.4,dmg:3,cd:1.0,mana:1,detour:3}, orc:{hp:45,spd:2.1,dmg:8,cd:1.4,mana:3,detour:1}, archer:{hp:18,spd:2.8,dmg:3,cd:1.6,mana:2,ranged:11,detour:4}, ogre:{hp:200,spd:1.7,dmg:20,cd:2.2,mana:8,detour:0}};
const DU_CAP=40, SENS=0.0042;
const S={mana:260,du:0,crystal:100,wave:0,phase:'start',t:0,waveT:0,kills:0};
function effWave(w){ return MAP.wbase+(w===undefined?S.wave:w); }   // map 2 wave 1 is the eighth wave of the campaign: mobs, loot and pay scale with this
const hero={x:0,y:0,z:6,vy:0,yaw:PI,hp:100,max:100,swingT:-1,hitDone:false,dead:0,ph:0,moving:false,hurtT:0,grounded:true};
const H=makeHero(); scene.add(H.g); const heroShadow=blob(.5); scene.add(heroShadow);
const cam={yaw:PI,pitch:.42,dist:8,d:8,x:0,y:5,z:14};
const enemies=[], defs=[], projs=[], orbs=[], floats=[], loot=[];
let gear={weapon:null,armor:null,charm:null,amulet:null,familiar:null};
// ===== META SEAM: the tavern / bag / gold / xp / skills / familiar modules extend this object (see parts/modules) =====
const Meta={
  mult:k=>0,            // multiplicative bonus from skills for a key: 'dmg','hp','spd','move','tow','tcd','aoe','mana' (0.25 = +25%)
  onPickup:it=>false,   // return true when the module took the item (into the bag); false = old behaviour (auto equip / sell)
  onKill:e=>{}, onWaveHeld:w=>{}, onRunEnd:w=>false,   // onRunEnd: true when the module shows its own run-summary/tavern screen
  update:dt=>{}, hud:()=>{}, open:()=>{}, isOpen:()=>false };
let spawnQ=[], placing=null, ghost=null, ghostRot=0, ghostCell=null, ghostPos=[0,0], ghostOk=false, ghostReason='', ghostYaw=0;
let placeStage=0, anchorPos=null, anchorYaw=0;   // 0: ghost follows your aim · 1: set down, rotating in place
let bannerT=0, toastT=0, dmgFlash=0, crystalShake=0, camShake=0, introA=0, locked=false, edgeX=.5, mouseDown=false;
const joy={x:0,y:0,id:null,ox:0,oy:0}; let lookId=null, lookX=0, lookY=0;

function angDiff(a,b){ let d=(b-a)%TAU; if(d>PI) d-=TAU; if(d<-PI) d+=TAU; return d; }
function angLerp(a,b,t){ return a+angDiff(a,b)*t; }
function easeOutBack(t){ const c=1.7; return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2); }
function solidAt(x,z,y,forHero){ const cx=wc(x),cz=wcz(z); const t=gat(cx,cz); if(forHero?heroSolid(t):!walk(t)) return true; if(baseFloor(x,z)>y+.62) return true; /* a ledge taller than a step: no climbing it (a jumping hero clears what it can) */ const d=inb(cx,cz)?defAt[idx(cx,cz)]:null; if(d){ if(d.kind==='slice') return false; return forHero?y<d.top-.25:true; } return false; }
const ARC=[[1,0],[-1,0],[0,1],[0,-1],[.71,.71],[-.71,.71],[.71,-.71],[-.71,-.71]];
function moveCircle(e,dx,dz,r,forHero){ const y=e.y||0; let nx=e.x+dx, ok=true; for(const a of ARC){ if(solidAt(nx+a[0]*r,e.z+a[1]*r,y,forHero)){ ok=false; break; } } if(ok) e.x=nx;
  let nz=e.z+dz; ok=true; for(const a of ARC){ if(solidAt(e.x+a[0]*r,nz+a[1]*r,y,forHero)){ ok=false; break; } } if(ok) e.z=nz; }
function wallAt(x,z){ const t=gat(wc(x),wcz(z)); return t===T.WALL||t===T.PILLAR||t===T.CRYSTAL||t===T.PROP; }
// floor height at a point: raised floors, and stairs as two flat steps per cell (climbing them bobs a little, like stairs do)
function floorH(x,z){ const cx=wc(x),cz=wcz(z); if(!inb(cx,cz)) return 0; const i=idx(cx,cz), a=rampA[i]; if(!a) return hgt[i]; const fx=(x+OX)/CELL-cx, fz=(z+OZ)/CELL-cz; const t=a===1?1-fz:a===2?fz:a===3?fx:1-fx; return rampL[i]+(rampH[i]-rampL[i])*(t<.5?.5:1); }
function baseFloor(x,z){ return floorH(x,z)+(gat(wc(x),wcz(z))===T.DAIS?.5:0); }
function floorAt(x,z,y){ const cx=wc(x),cz=wcz(z); let f=baseFloor(x,z); const d=inb(cx,cz)?defAt[idx(cx,cz)]:null; if(d&&y>=d.top-.25) f=Math.max(f,d.top); return f; }
function floatText(x,y,z,txt,col){ floats.push({x,y,z,txt,col:col||'#fff',t:0}); }
function banner(t,sub){ $('banner').innerHTML=t+'<small>'+(sub||'')+'</small>'; $('banner').style.opacity=1; bannerT=3.4; }
function toast(t){ $('toast').textContent=t; $('toast').style.opacity=1; toastT=2.2; }
function flashDmg(){ dmgFlash=1; }

// ================= HERO =================
function heroUpdate(dt){
  if(hero.dead>0){ hero.dead-=dt; if(hero.dead<=0){ hero.dead=0; hero.hp=hero.max; hero.x=0; hero.z=6; hero.y=0; hero.vy=0; H.g.visible=!useGLB; heroShadow.visible=true; if(GLBH){ GLBH.wrap.visible=useGLB; playHero('idle',{restart:true}); } toast('Back on your feet!'); } heroModelUpdate(dt); return; }
  let mx=0,mz=0; if(K.w) mz+=1; if(K.s) mz-=1; if(K.d) mx+=1; if(K.a) mx-=1; if(TOUCH){ mx+=joy.x; mz+=joy.y; }
  const len=Math.hypot(mx,mz); hero.moving=len>.05; hero.slow=len<.5;
  if(hero.moving){ mx/=Math.max(len,1); mz/=Math.max(len,1); const fx=Math.sin(cam.yaw), fz=Math.cos(cam.yaw), rx=-Math.cos(cam.yaw), rz=Math.sin(cam.yaw);
    const vx=fx*mz+rx*mx, vz=fz*mz+rz*mx; const mul=(K.shift?11:7.5)/7.5*(1+heroStat('move')/100)*heroMult('move'); hero.spdMul=mul; const spd=7.5*mul; moveCircle(hero,vx*spd*dt,vz*spd*dt,.42,true);
    hero.yaw=angLerp(hero.yaw,Math.atan2(vx,vz),1-Math.exp(-12*dt)); hero.ph+=dt*10*mul; }
  const fl=floorAt(hero.x,hero.z,hero.y); hero.vy-=20*dt; hero.y+=hero.vy*dt; if(hero.y<=fl){ if(!hero.grounded&&hero.vy<-3) SFX.land(); hero.y=fl; hero.vy=0; hero.grounded=true; } else hero.grounded=false;
  const stp=Math.floor(hero.ph/PI); if(stp!==hero.lastStep){ hero.lastStep=stp; if(hero.moving&&hero.grounded) SFX.step(); }
  if(hero.swingT>=0){ const sd=swingDur(); hero.swingT+=dt; if(!hero.hitDone&&hero.swingT>sd*hitFrac()){ hero.hitDone=true; hitCone(); } if(hero.swingT>sd) hero.swingT=-1; }
  hero.hurtT-=dt; if(hero.hurtT<0&&hero.hp<hero.max) hero.hp=Math.min(hero.max,hero.hp+(1.5+heroStat('regen'))*dt);
  // animate
  const ph=hero.ph, walk=hero.moving?1:0; H.legL.rotation.x=Math.sin(ph)*.7*walk; H.legR.rotation.x=-Math.sin(ph)*.7*walk;
  if(hero.swingT>=0){ const p=hero.swingT/swingDur(); H.armR.rotation.x=p<.3?lerp(-.4,-2.6,p/.3):lerp(-2.6,.5,(p-.3)/.7); } else H.armR.rotation.x=lerp(-.35,-Math.sin(ph)*.5*walk,.5);
  H.armL.rotation.x=Math.sin(ph)*.4*walk-.25; H.capeG.rotation.x=-.15-walk*.45-Math.sin(ph*.5)*.08*walk-(hero.grounded?0:.5);
  H.g.position.set(hero.x,hero.y+Math.abs(Math.sin(ph))*.05*walk,hero.z); H.g.rotation.y=hero.yaw; H.head.rotation.x=Math.sin(ph*.5)*.04*walk;
  heroShadow.position.set(hero.x,baseFloor(hero.x,hero.z)+.04,hero.z); heroShadow.scale.setScalar(clamp(1-(hero.y-baseFloor(hero.x,hero.z))*.3,.4,1));
  heroModelUpdate(dt);
}
function jump(){ if(hero.grounded&&hero.dead<=0&&S.phase!=='start'){ hero.vy=10.6; hero.grounded=false; SFX.jump(); } }
function swing(){ if(hero.swingT>=0||hero.dead>0||S.phase==='start'||S.phase==='dead'||S.phase==='won') return; hero.swingT=0; hero.hitDone=false; SFX.swing(); if(!hero.moving) hero.yaw=cam.yaw;
  if(useGLB&&GLBH&&GLBH.actions.attack) playHero('attack',{restart:true,fade:.05,speed:GLBH.map.attack.duration/swingDur()}); }
function hitCone(){ const fx=Math.sin(hero.yaw), fz=Math.cos(hero.yaw); let n=0; for(const e of enemies){ if(e.dead) continue; const dx=e.x-hero.x, dz=e.z-hero.z, d=Math.hypot(dx,dz); if(d<2.4+e.r&&(dx*fx+dz*fz)/Math.max(d,.01)>.4){ hurt(e,heroDmg(),fx*1.4,fz*1.4); n++; } } if(n) SFX.hit(); }
function hurtHero(dmg){ if(hero.dead>0) return; dmg=Math.max(1,Math.round(dmg*(1-Math.min(75,heroStat('def'))/100))); hero.hp-=dmg; hero.hurtT=3; flashDmg(); SFX.hurt(); if(hero.hp<=0){ hero.hp=0; hero.dead=4; toast('You fell! Back in 4 seconds…'); H.g.visible=false; heroShadow.visible=false; } }
function hurtCrystal(dmg){ if(S.phase==='dead'||S.phase==='won') return; S.crystal-=dmg; flashDmg(); SFX.crystal(); crystalShake=.4; if(S.crystal<=0){ S.crystal=0; S.phase='dead'; droneOff(); setMusic('none'); sting(); if(document.exitPointerLock) document.exitPointerLock(); document.body.classList.remove('play'); if(!Meta.onRunEnd(S.wave)){ $('deadwave').textContent=S.wave; $('dead').classList.remove('hide'); } } }

// ================= GLB HERO (built-in squire, or drop any .glb on the page) =================
let GLBH=null, useGLB=false, heroYawOff=0, heroLoadError='';
const BUILD=20;
function heroStatus(msg){ const el=$('buildline'); if(el) el.textContent='build '+BUILD+' · '+msg; }
const OLSKIN=new THREE.ShaderMaterial({side:THREE.BackSide,fog:true,skinning:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{t:{value:0.028},col:{value:C(0x160c1e)}}]),
  vertexShader:'uniform float t;\n#include <common>\n#include <skinning_pars_vertex>\n#include <fog_pars_vertex>\nvoid main(){\n#include <beginnormal_vertex>\n#include <skinbase_vertex>\nvec3 transformed=position+normalize(objectNormal)*t;\n#include <skinning_vertex>\nvec4 mvPosition=modelViewMatrix*vec4(transformed,1.0); gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
  fragmentShader:'uniform vec3 col;\n#include <fog_pars_fragment>\nvoid main(){ gl_FragColor=vec4(col,1.0);\n#include <fog_fragment>\n}'});
// any material -> the hall's toon shading + ink outline (skinned meshes get a skinned outline; the outline offset uses the
// raw vertex normal, not the skinned one, because a rig with a unit-scale on its armature scales the skinned normal too)
function toonify(root,scale){ scale=scale||1; const meshes=[]; root.traverse(m=>{ if(m.isMesh&&!m.userData.isOL) meshes.push(m); });
  // ink outline: same on-screen thickness as the rest of the hall regardless of the model's units, and nudged
  // behind the surface so it can't poke through concave spots on a dense mesh
  const mkOL=base=>{ const o=base.clone(); o.uniforms.t.value=.02/scale; o.polygonOffset=true; o.polygonOffsetFactor=1.5; o.polygonOffsetUnits=1.5; return o; };
  const olSkin=mkOL(OLSKIN), olStatic=mkOL(OL);
  for(const m of meshes){ const mats=Array.isArray(m.material)?m.material:[m.material];
    const conv=mats.map(o=>{ const t=new THREE.MeshToonMaterial({color:o.color?o.color.clone():new THREE.Color(1,1,1),map:o.map||null,gradientMap:o.map?GRAD_SOFT:GRAD,vertexColors:!!o.vertexColors,skinning:!!m.isSkinnedMesh,side:o.side!==undefined?o.side:THREE.FrontSide,transparent:!!o.transparent,opacity:o.opacity!==undefined?o.opacity:1,alphaTest:o.alphaTest||0}); if(o.emissive){ t.emissive=o.emissive.clone(); t.emissiveIntensity=o.emissiveIntensity||1; } return t; });
    m.material=Array.isArray(m.material)?conv:conv[0]; m.frustumCulled=false;
    if(m.isSkinnedMesh){ const o=new THREE.SkinnedMesh(m.geometry,olSkin); o.userData.isOL=true; o.frustumCulled=false; o.bind(m.skeleton,m.bindMatrix); m.add(o); }
    else { const o=new THREE.Mesh(m.geometry,olStatic); o.userData.isOL=true; m.add(o); } } }
// scale any model to hero height, feet on the floor, centred on the hips
const HERO_H=2.6;
// bounds of a rigged model in its rest pose, computed the way the skinning shader does (a plain bounding box is wrong when the rig carries a scale)
function skinnedBounds(root){ root.updateMatrixWorld(true); const box=new THREE.Box3(); let any=false; const v=new THREE.Vector3(), acc=new THREE.Vector3(), t=new THREE.Vector3(), m4=new THREE.Matrix4();
  root.traverse(o=>{ if(!o.isMesh||o.userData.isOL) return; if(!o.isSkinnedMesh){ box.union(new THREE.Box3().setFromObject(o)); any=true; return; }
    const g=o.geometry, pos=g.attributes.position, si=g.attributes.skinIndex, sw=g.attributes.skinWeight; if(!si||!sw){ box.union(new THREE.Box3().setFromObject(o)); any=true; return; }
    o.skeleton.update(); const bm=o.skeleton.boneMatrices;
    for(let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i).applyMatrix4(o.bindMatrix); acc.set(0,0,0); const idx=[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)], w=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)];
      for(let k=0;k<4;k++){ if(!w[k]) continue; m4.fromArray(bm,idx[k]*16); t.copy(v).applyMatrix4(m4); acc.addScaledVector(t,w[k]); }
      acc.applyMatrix4(o.bindMatrixInverse).applyMatrix4(o.matrixWorld); box.expandByPoint(acc); any=true; } });
  return any?box:null; }
function fitHero(root){ return fitModel(root,HERO_H); }
function fitModel(root,targetH){ root.updateMatrixWorld(true); const box=skinnedBounds(root)||new THREE.Box3().setFromObject(root); const size=box.getSize(new THREE.Vector3()); const sc=targetH/Math.max(size.y,1e-6);
  const hips=root.getObjectByName('Hips')||root.getObjectByName('mixamorigHips')||root.getObjectByName('hips'); let cx=(box.min.x+box.max.x)/2, cz=(box.min.z+box.max.z)/2; if(hips){ const v=new THREE.Vector3(); hips.getWorldPosition(v); cx=v.x; cz=v.z; }
  const inner=new THREE.Group(); inner.add(root); inner.scale.setScalar(sc); inner.position.set(-cx*sc,-box.min.y*sc,-cz*sc); const wrap=new THREE.Group(); wrap.add(inner); return {wrap,scale:sc,height:size.y}; }
const CLIPMAP={idle:/idle|breath|stand/i,walk:/walk/i,run:/run|sprint|jog/i,attack:/attack|slash|swing|punch|strike|melee|hit/i,jump:/jump|leap/i,death:/death|die|dead|defeat/i,shout:/shout|roar|taunt|skill/i};
function mapClips(clips){ const m={}; for(const k in CLIPMAP){ const c=clips.find(c=>CLIPMAP[k].test(c.name)); if(c) m[k]=c; } if(!m.walk&&m.run) m.walk=m.run; if(!m.run&&m.walk) m.run=m.walk; if(!m.idle&&clips.length) m.idle=clips[0]; return m; }
function setHeroGLB(gltf,label,quiet){ const root=gltf.scene||gltf.scenes[0]; if(!root) throw new Error('no scene'); const fit=fitHero(root); toonify(root,fit.scale);
  const mixer=new THREE.AnimationMixer(root); const map=mapClips(gltf.animations||[]); const actions={};
  for(const k in map){ const a=mixer.clipAction(map[k]); if(k==='attack'||k==='jump'||k==='death'){ a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; } actions[k]=a; }
  let attackDur=0, hitF=0;
  if(map.attack){ const c=map.attack; attackDur=Math.min(.75,Math.max(.38,c.duration*.7)); let best=0, bt=0;
    for(const t of c.tracks){ if(!/(Hand|Arm|arm|hand).*\.quaternion$/.test(t.name)) continue; const v=t.values, tm=t.times;
      for(let i=1;i<tm.length;i++){ const d=Math.abs(v[(i-1)*4]*v[i*4]+v[(i-1)*4+1]*v[i*4+1]+v[(i-1)*4+2]*v[i*4+2]+v[(i-1)*4+3]*v[i*4+3]); const ang=2*Math.acos(Math.min(1,d)); const sp=ang/Math.max(1e-4,tm[i]-tm[i-1]); if(sp>best){ best=sp; bt=tm[i]; } } }
    if(best>0) hitF=Math.min(.65,Math.max(.25,bt/c.duration)); }
  if(GLBH){ scene.remove(GLBH.wrap); GLBH.mixer.stopAllAction(); GLBH.root.traverse(o=>{ if(!o.isMesh) return; if(!o.userData.isOL&&o.geometry) o.geometry.dispose(); const mats=Array.isArray(o.material)?o.material:[o.material]; mats.forEach(m=>{ if(m&&m.map&&!o.userData.isOL) m.map.dispose(); if(m) m.dispose(); }); }); }   // the replaced model (baked squire, or an earlier drop) frees its GPU memory
  GLBH={wrap:fit.wrap,root,mixer,actions,map,cur:null,label,scale:fit.scale,height:fit.height,attackDur,hitFrac:hitF}; scene.add(fit.wrap); useGLB=true; H.g.visible=false; heroYawOff=0;
  if(actions.idle) playHero('idle',{fade:0}); if(!quiet) toast('Hero model: '+label+' · clips: '+(Object.keys(map).join(', ')||'none')); }
function playHero(name,o){ if(!GLBH) return; const a=GLBH.actions[name]; if(!a) return; o=o||{}; if(GLBH.cur===a&&!o.restart) return; const prev=GLBH.cur; GLBH.cur=a; a.reset(); a.timeScale=o.speed||1; a.setEffectiveWeight(1); if(prev&&prev!==a){ if(o.fade) a.crossFadeFrom(prev,o.fade,false); else prev.stop(); } a.play(); }
function heroModelUpdate(dt){ if(!GLBH) return; if(!useGLB){ GLBH.wrap.visible=false; return; } const dead=hero.dead>0;
  let st; if(dead) st='death'; else if(hero.swingT>=0) st='attack'; else if(!hero.grounded) st='jump'; else if(hero.moving) st=(hero.slow||!GLBH.actions.run)?'walk':'run'; else st='idle';
  if(st==='run') GLBH.actions.run.timeScale=1.25*(hero.spdMul||1); else if(st==='walk'&&GLBH.actions.walk) GLBH.actions.walk.timeScale=(hero.spdMul||1);
  if(st==='attack'){ if(!GLBH.actions.attack) playHero(hero.moving?'walk':'idle',{fade:.1}); }
  else if(st==='death'){ if(GLBH.actions.death){ if(GLBH.cur!==GLBH.actions.death) playHero('death',{restart:true,fade:.08}); } else playHero('idle',{fade:.1}); }
  else playHero(st,{fade:.15});
  GLBH.mixer.update(dt); GLBH.wrap.position.set(hero.x,hero.y,hero.z); GLBH.wrap.rotation.y=hero.yaw+heroYawOff; GLBH.wrap.visible=!dead||hero.dead>2.6; }
function loadHeroGLB(buf,label,quiet){ if(!THREE.GLTFLoader){ heroLoadError='model loader missing'; heroStatus('hero model: loader missing — old gnome in use'); toast('Model loader missing'); return; }
  const bad=err=>{ const why=(err&&err.message)?String(err.message).slice(0,80):'unreadable file'; heroLoadError=why; heroStatus('hero model failed ('+why+') — old gnome in use'); toast('Not a valid GLB file ('+why+')'); };
  try{ new THREE.GLTFLoader().parse(buf,'',g=>{ try{ setHeroGLB(g,label,quiet); heroLoadError=''; heroStatus('hero: '+label+' · '+Object.keys(GLBH.map).length+' clips'); }catch(err){ heroLoadError=err.message; heroStatus('hero model failed ('+err.message+') — old gnome in use'); toast('That model could not be used: '+err.message); } },bad); }catch(err){ bad(err); } }
function toggleHero(){ if(!GLBH){ toast('No GLB hero loaded — drop a .glb on the page'); return; } useGLB=!useGLB; H.g.visible=!useGLB; GLBH.wrap.visible=useGLB; toast(useGLB?'Hero: '+GLBH.label:'Hero: original primitives'); }
addEventListener('dragover',e=>{ e.preventDefault(); });
addEventListener('drop',e=>{ e.preventDefault(); const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(!f) return; if(!/\.(glb|gltf)$/i.test(f.name)){ toast('Drop a .glb file to play as that character'); return; } f.arrayBuffer().then(buf=>loadHeroGLB(buf,f.name)).catch(()=>toast('Could not read that file')); });
// assets next to the page: the host serves only a fixed set of file types, so binary models travel as base64 .txt.
// HAS_ASSETS is stamped by the assembler: true for the folder build (index.html + assets/), false for the single file,
// where every asset fetch simply never resolves and the baked-in models / procedural music stay in use.
const HAS_ASSETS=/*ASSETS*/false;
const ASSET=n=>'assets/'+n+(/\.glb$/.test(n)?'.txt':'');
function fetchBytes(url){ if(!HAS_ASSETS) return new Promise(()=>{}); return fetch(url).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status+' '+url); if(!/\.txt$/.test(url)) return r.arrayBuffer(); return r.text().then(t=>{ const b=atob(t.replace(/\s+/g,'')); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u.buffer; }); }); }
// the hero model is either baked into the page (SQUIRE_GLB_B64) or fetched from assets/ next to it
if(typeof SQUIRE_GLB_B64!=='undefined'){ try{ const u=Uint8Array.from(atob(SQUIRE_GLB_B64),c=>c.charCodeAt(0)); loadHeroGLB(u.buffer,'Gnome Warden (Meshy)',true); }catch(e){} }
else fetchBytes(ASSET('gnome.glb')).then(buf=>loadHeroGLB(buf,'Gnome Warden (Meshy)',true)).catch(e=>{ heroLoadError=String(e&&e.message||e); heroStatus('hero model failed: '+heroLoadError); });

// ================= GLB MOBS =================
// three's SkeletonUtils.clone, inlined: a rigged model cloned so each copy animates on its own skeleton
function cloneSkinned(source){ const sl=new Map(), cl=new Map(); const clone=source.clone(); (function walk(a,b){ sl.set(b,a); cl.set(a,b); for(let i=0;i<a.children.length;i++) walk(a.children[i],b.children[i]); })(source,clone);
  clone.traverse(n=>{ if(!n.isSkinnedMesh) return; const src=sl.get(n); n.skeleton=src.skeleton.clone(); n.bindMatrix.copy(src.bindMatrix); n.skeleton.bones=src.skeleton.bones.map(b=>cl.get(b)); n.bind(n.skeleton,n.bindMatrix); }); return clone; }
// per kind: model height to fit to, hit box, and the walk/run speeds (in body heights per second) the clips were made for
const MOBDIM={goblin:{fit:1.55,h:1.4,r:.42,nat:{walk:1.0,run:2.4}}, orc:{fit:2.45,h:2.1,r:.65,nat:{walk:1.0,run:2.2}}, ogre:{fit:3.5,h:3.3,r:1.05,nat:{walk:.9,run:2.0}}};
SFX.roar=()=>{ noise(.5,.12,300); beep(60,1.0,'sawtooth',.1,-25); };
const MOBGLB={};   // kind -> {wrap,map,scale}
function loadMobGLB(kind,b64){ try{ const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); new THREE.GLTFLoader().parse(u.buffer,'',gltf=>{ try{ const root=gltf.scene||gltf.scenes[0]; const fit=fitModel(root,MOBDIM[kind].fit); toonify(root,fit.scale); MOBGLB[kind]={wrap:fit.wrap,map:mapClips(gltf.animations||[]),scale:fit.scale}; }catch(e){ console.warn('mob model '+kind,e); } },e=>console.warn('mob model '+kind,e)); }catch(e){ console.warn('mob model '+kind,e); } }
function makeMobGLB(kind){ const T=MOBGLB[kind], dim=MOBDIM[kind]; const g=cloneSkinned(T.wrap); const mixer=new THREE.AnimationMixer(g); const actions={};
  for(const k in T.map){ const a=mixer.clipAction(T.map[k]); if(k==='attack'||k==='death'||k==='shout'){ a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; } actions[k]=a; }
  g.add(blob(dim.r*1.1)); return {g,glb:true,mixer,actions,cur:null,h:dim.h,r:dim.r,legs:[],arms:[],head:null}; }
function makeMob(kind){ return MOBGLB[kind]?makeMobGLB(kind):makeGoblin(kind); }
function mobPlay(m,name,o){ const a=m.actions[name]; if(!a) return; o=o||{}; if(m.cur===a&&!o.restart) return; const prev=m.cur; m.cur=a; a.reset(); a.timeScale=o.speed||1; a.setEffectiveWeight(1); if(prev&&prev!==a){ if(o.fade) a.crossFadeFrom(prev,o.fade,false); else prev.stop(); } a.play(); }
const SHOUT_SPEED=.6;   // the war cry plays slowed so it reads as a roar, not a twitch
function ogreRoar(e,n){ e.roar=n; e.shoutT=e.mdl.actions.shout.getClip().duration/SHOUT_SPEED; SFX.roar(); camShake=.7;
  if(n===2){ e.spd*=1.3; e.dmg=Math.round(e.dmg*1.25); e.enraged=true; const g=glow(0xff3020,2.6/e.sc,.6); g.position.y=e.h*.55/e.sc; e.mdl.g.add(g); floatText(e.x,e.y+e.h+.6,e.z,'ENRAGED!','#ff5a3a'); }   // half health: faster, harder, burning red
  else floatText(e.x,e.y+e.h+.6,e.z,'RAAAGH!','#ff9a5a'); }
function mobAnim(e,dt){ const m=e.mdl, A=m.actions; let st; if(e.dead) st='death'; else if(e.shoutT>0&&A.shout) st='shout'; else if(e.swing>=0&&A.attack) st='attack'; else if(e.walking) st='walk'; else st='idle';
  if(st==='shout'){ if(m.cur!==A.shout) mobPlay(m,'shout',{restart:true,fade:.1,speed:SHOUT_SPEED}); }
  else if(st==='attack'){ if(m.cur!==A.attack) mobPlay(m,'attack',{restart:true,fade:.06,speed:A.attack.getClip().duration/.45}); }
  else if(st==='death'){ if(A.death){ if(m.cur!==A.death) mobPlay(m,'death',{restart:true,fade:.08}); } else mobPlay(m,'idle',{fade:.1}); }
  else if(st==='walk'){ const nat=MOBDIM[e.kind].nat, hs=mobSpd(e)/e.h; const useRun=A.run&&A.run!==A.walk&&Math.abs(hs-nat.run)<Math.abs(hs-nat.walk); const k=useRun?'run':(A.walk?'walk':'run'); if(A[k]){ A[k].timeScale=Math.max(.7,hs/(useRun?nat.run:nat.walk)); mobPlay(m,k,{fade:.15}); } }
  else mobPlay(m,'idle',{fade:.2});
  m.mixer.update(dt); }
function fetchMobGLB(kind,url){ fetchBytes(url).then(buf=>new THREE.GLTFLoader().parse(buf,'',gltf=>{ try{ const root=gltf.scene||gltf.scenes[0]; const fit=fitModel(root,MOBDIM[kind].fit); toonify(root,fit.scale); MOBGLB[kind]={wrap:fit.wrap,map:mapClips(gltf.animations||[]),scale:fit.scale}; }catch(e){ console.warn('mob model '+kind,e); } },e=>console.warn('mob model '+kind,e))).catch(e=>console.warn('mob model '+kind+' ('+url+')',e)); }
if(typeof GOBLIN_GLB_B64!=='undefined') loadMobGLB('goblin',GOBLIN_GLB_B64); else fetchMobGLB('goblin',ASSET('goblin.glb'));
fetchMobGLB('orc',ASSET('orc.glb')); fetchMobGLB('ogre',ASSET('ogre.glb'));   // mobs with a model in assets/ use it; in the single-file build these never resolve and the block figures stay

// ================= CAMERA =================
function updateCamera(dt){
  if(S.phase==='start'){ introA+=dt*.1; camera.position.set(Math.sin(introA)*15,6.5,Math.cos(introA)*15); camera.lookAt(0,2.6,0); return; }
  const tx=hero.x, ty=hero.y+1.5, tz=hero.z;
  const cp=Math.cos(cam.pitch), fx=Math.sin(cam.yaw)*cp, fz=Math.cos(cam.yaw)*cp, fy=Math.sin(cam.pitch);
  let d=cam.dist; for(let s=.5;s<cam.dist;s+=.25){ const px=tx-fx*s, py=ty+fy*s, pz=tz-fz*s; if(py>WALLH-.35){ d=s-.3; break; } if(py<floorH(px,pz)+.5){ d=s-.4; break; } const g=gat(wc(px),wcz(pz)); if(g===T.WALL||g===T.PILLAR||g===T.PROP){ d=s-.5; break; } }
  d=Math.max(d,1.0); cam.d=dt>0?(d<cam.d?d:lerp(cam.d,d,1-Math.exp(-6*dt))):d;
  const dx=tx-fx*cam.d, dy=ty+fy*cam.d, dz=tz-fz*cam.d; const k=dt>0?1-Math.exp(-16*dt):1;
  cam.x=lerp(cam.x,dx,k); cam.y=lerp(cam.y,dy,k); cam.z=lerp(cam.z,dz,k);
  const sh=camShake>0?camShake*.35:0; camShake=Math.max(0,camShake-dt); camera.position.set(cam.x+(rnd()-.5)*sh,Math.max(cam.y,.4)+(rnd()-.5)*sh,cam.z+(rnd()-.5)*sh); camera.lookAt(tx+(rnd()-.5)*sh,ty+(rnd()-.5)*sh,tz+(rnd()-.5)*sh);
}

// ================= ENEMIES =================
function spawnEnemy(kind,lane){ const L=LANES[lane]||LANES.N; const m=makeMob(kind); const cfg=MOBS[kind]; const w=Math.max(0,effWave()-1); const hpm=(1+.22*w)*(1+.08*gearScore()/100); /* waves get harder by wave, not by what you wear — good gear should feel good */ const dmm=1+.08*w;
  const e={kind,x:cw(L.cx)+R(-.6,.6),y:0,z:cwz(L.cz)+R(-.6,.6),hp:Math.round(cfg.hp*hpm),max:Math.round(cfg.hp*hpm),spd:cfg.spd*R(.9,1.1)*(1+.02*w),dmg:Math.round(cfg.dmg*dmm),cd:cfg.cd,atk:R(0,.5),r:m.r,h:m.h,mdl:m,sc:m.g.scale.x,ph:rnd()*6,yaw:L.face,dead:0,mana:cfg.mana,ranged:cfg.ranged||0,pop:0,squash:0,swing:-1,walking:false,sx:0,sz:0,shoutT:0};
  e.roar=(m.glb&&m.actions.shout)?0:-1;   // a mini-boss roars when it first comes into view (and again, enraged, at half health) — see ogreRoar
  m.g.position.set(e.x,0,e.z); m.g.rotation.y=e.yaw; scene.add(m.g); enemies.push(e); const p=portals.find(p=>p.k===lane); if(p) p.pulse=1; return e; }
function hurt(e,dmg,kx,kz){ if(e.dead) return; e.hp-=dmg; e.squash=1; floatText(e.x,e.y+e.h+.4,e.z,String(dmg),'#ffd060'); if(kx||kz) moveCircle(e,kx*.5,kz*.5,e.r*.8,false); if(e.hp<=0) kill(e); }
function kill(e){ e.dead=.001; S.kills++; spawnOrbs(e.x,e.z,e.mana); rollDrop(e); Meta.onKill(e); if(e.kind==='ogre'||e.kind==='orc') SFX.bigDie(); else SFX.die(); }
function attack(e,tg){ e.swing=0; e.pending=tg; }
function landHit(e,tg){
  if(tg.kind==='hero'){ if(hero.dead<=0) hurtHero(e.dmg); }
  else if(tg.kind==='crystal'){ if(tg.ranged) fireArrow(e,0,2.6,0,{kind:'crystal'}); else hurtCrystal(e.dmg); }
  else if(tg.kind==='def'){ const d=tg.obj; if(!defs.includes(d)) return; if(tg.ranged) fireArrow(e,d.x,1.0,d.z,{kind:'def',obj:d}); else { hurtDef(d,e.dmg); if(d.kind==='spike') hurt(e,Math.round(DEFS.spike.thorns*(1+heroStat('tow')/100)),0,0); } } }
function updateEnemies(dt){
  const alive=enemies.filter(e=>!e.dead);
  for(const a of alive){ a.sx=0; a.sz=0; }
  for(let i=0;i<alive.length;i++) for(let j=i+1;j<alive.length;j++){ const a=alive[i], b=alive[j]; const dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz), min=(a.r+b.r)*.9; if(d<min&&d>.001){ const p=(min-d)/min*3; a.sx-=dx/d*p; a.sz-=dz/d*p; b.sx+=dx/d*p; b.sz+=dz/d*p; } }
  for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; const g=e.mdl.g;
    if(e.dead){ e.dead+=dt;
      if(e.mdl.glb){ mobAnim(e,dt); const t=e.dead-.9; if(t>0){ const s=Math.max(0,1-t/.35)*e.sc; g.scale.setScalar(Math.max(s,.001)); g.position.y=e.y-(1-s)*.4; } if(e.dead>1.25){ scene.remove(g); enemies.splice(i,1); } continue; }
      const s=Math.max(0,1-e.dead/.3)*e.sc; g.scale.set(s*1.3,s*.6,s*1.3); if(e.dead>.3){ scene.remove(g); enemies.splice(i,1); } continue; }
    e.pop=Math.min(1,e.pop+dt*3); e.atk-=dt; e.slowT=Math.max(0,(e.slowT||0)-dt); if(e.swing>=0){ e.swing+=dt; if(e.pending&&e.swing>=.2){ const tg=e.pending; e.pending=null; landHit(e,tg); } if(e.swing>.4) e.swing=-1; }
    let target=null; const hd=Math.hypot(hero.x-e.x,hero.z-e.z);
    if(hero.dead<=0&&hd<e.r+1.1&&hero.y-e.y<1.4) target={kind:'hero',x:hero.x,z:hero.z,reach:e.r+1.3};
    else { const ci=idx(wc(e.x),wcz(e.z)); let n=flowDef.nxt[ci]; const cr={kind:'crystal',x:0,z:0,reach:2.9+e.r};
      // defenses in the way get smashed, not politely walked around: if going round costs more than this mob's patience
      // (in grid squares — ogres have none, goblins a little), follow the straight path and break whatever blocks it
      const dD=flowDef.dist[ci], dF=flowFree.dist[ci]; const patience=MOBS[e.kind].detour!==undefined?MOBS[e.kind].detour:3; const smash=dD<0||(dF>=0&&dD-dF>patience);
      if(ci===GOAL||n===GOAL) target=cr; else if(n>=0&&!smash) target={kind:'move',x:cw(n%GW),z:cwz((n/GW)|0)};
      else { n=flowFree.nxt[ci]; if(n===GOAL) target=cr; else if(n>=0){ const d=defAt[n]; target=(d&&d.kind!=='slice')?{kind:'def',obj:d,x:d.x,z:d.z,reach:1.35+e.r}:{kind:'move',x:cw(n%GW),z:cwz((n/GW)|0)}; } } }
    if(e.ranged&&target&&target.kind!=='hero'){ let best=null, bd=e.ranged; for(const d of defs){ if(d.kind==="spike"||d.kind==="slice") continue; const dd=Math.hypot(d.x-e.x,d.z-e.z); if(dd<bd&&los(e.x,e.z,d.x,d.z)){ bd=dd; best={kind:"def",obj:d,x:d.x,z:d.z}; } } const cd=Math.hypot(e.x,e.z); if(cd<e.ranged&&los(e.x,e.z,0,0)) best={kind:'crystal',x:0,z:0}; if(best){ best.reach=e.ranged-1; best.ranged=true; target=best; } }
    if(e.roar===0&&((hd<14&&los(e.x,e.z,hero.x,hero.z))||Math.hypot(e.x,e.z)<12)) ogreRoar(e,1); else if(e.roar===1&&e.hp<=e.max*.5) ogreRoar(e,2);
    if(e.shoutT>0){ e.shoutT-=dt; target=null; }
    e.walking=false;
    if(target){ const dx=target.x-e.x, dz=target.z-e.z, d=Math.hypot(dx,dz)||.001; const ty=Math.atan2(dx,dz);
      if(target.kind==='move'||d>target.reach){ const sp=mobSpd(e); moveCircle(e,(dx/d*sp+e.sx)*dt,(dz/d*sp+e.sz)*dt,e.r*.8,false); e.ph+=dt*9; e.yaw=angLerp(e.yaw,ty,1-Math.exp(-10*dt)); e.walking=true; }
      else { e.yaw=angLerp(e.yaw,ty,1-Math.exp(-10*dt)); if(e.atk<=0){ e.atk=e.cd; attack(e,target); } } }
    e.y=baseFloor(e.x,e.z); e.squash=Math.max(0,e.squash-dt*7);
    const sc=e.sc*(e.pop<1?easeOutBack(e.pop):1), sq=e.squash; g.scale.set(sc*(1+sq*.25),sc*(1-sq*.35),sc*(1+sq*.25));
    g.position.set(e.x,e.y,e.z); g.rotation.y=e.yaw; const w=e.walking?1:0; const m=e.mdl;
    if(m.glb){ mobAnim(e,dt); continue; }
    m.legs[0].rotation.x=Math.sin(e.ph)*.8*w; m.legs[1].rotation.x=-Math.sin(e.ph)*.8*w; m.arms[0].rotation.x=-Math.sin(e.ph)*.6*w;
    m.arms[1].rotation.x=e.swing>=0?(e.swing<.15?lerp(-.3,-2.4,e.swing/.15):lerp(-2.4,.6,(e.swing-.15)/.25)):Math.sin(e.ph)*.6*w;
    m.head.rotation.z=Math.sin(e.ph*.5)*.06*w; g.position.y+=Math.abs(Math.sin(e.ph))*.06*w*e.sc; }
}

// ================= DEFENSES =================
// the grid squares a defense really covers: its centre, plus both ends of a blockade
function footprintCells(kind,x,z,yaw){ const cells=[idx(wc(x),wcz(z))]; if(kind==='spike'){ const ax=Math.cos(yaw), az=-Math.sin(yaw); for(const s of [-.9,.9]){ const cx=wc(x+ax*s), cz=wcz(z+az*s); if(!inb(cx,cz)) continue; const i=idx(cx,cz); if(!cells.includes(i)) cells.push(i); } } return cells; }
// where the camera is looking on the floor, kept within reach of the hero (look further away to build further away)
function aimPoint(){ const fx=Math.sin(cam.yaw), fz=Math.cos(cam.yaw);
  if(!TOUCH){ const dir=new THREE.Vector3(); camera.getWorldDirection(dir); if(dir.y<-.02){ const t=(camera.position.y-hero.y)/-dir.y; let px=camera.position.x+dir.x*t, pz=camera.position.z+dir.z*t; const dx=px-hero.x, dz=pz-hero.z, d=Math.hypot(dx,dz); const md=Math.min(8,Math.max(1.6,d)); if(d>.01){ px=hero.x+dx/d*md; pz=hero.z+dz/d*md; } return [px,pz]; } }
  return [hero.x+fx*3.2,hero.z+fz*3.2]; }
function placeDefAt(kind,x,z,rot){ const cfg=DEFS[kind]; const cx=wc(x), cz=wcz(z); const base=baseFloor(x,z); const cells=footprintCells(kind,x,z,rot||0).filter(i=>walk(grid[i])&&!defAt[i]&&!rampA[i]);
  const d={kind,cx,cz,cells,x,z,base,rot:rot||0,hp:cfg.hp,max:cfg.hp,top:cfg.top+base,cd:R(.2,cfg.cd),yaw:rot||0,mdl:makeDef(kind,false),pop:0,recoil:0,spin:0,shake:0,lvl:1,spent:cfg.mana};
  d.mdl.position.set(d.x,base,d.z); d.mdl.rotation.y=d.rot; scene.add(d.mdl); defs.push(d); for(const i of cells) defAt[i]=d; S.du+=cfg.du; S.mana-=cfg.mana; reflow(); SFX.place(); return d; }
function placeDef(kind,cx,cz,rot){ return placeDefAt(kind,cw(cx),cwz(cz),rot||0); }
function removeDef(d){ scene.remove(d.mdl); if(hoverFor===d){ if(hoverSector) scene.remove(hoverSector); hoverSector=null; hoverFor=null; } for(const i of (d.cells||[idx(d.cx,d.cz)])) if(defAt[i]===d) defAt[i]=null; const i=defs.indexOf(d); if(i>=0) defs.splice(i,1); S.du-=DEFS[d.kind].du; reflow(); }
function hurtDef(d,dmg){ d.hp-=dmg; d.shake=.25; d.calm=0; floatText(d.x,d.top+.6,d.z,String(dmg),'#ff6a5a'); if(d.hp<=0){ removeDef(d); SFX.destroy(); toast(DEFS[d.kind].name+' destroyed!'); } }
function fire(d,e){ const cfg=DEFS[d.kind]; const fx=Math.sin(d.yaw), fz=Math.cos(d.yaw); d.recoil=1;
  if(d.kind==='harpoon'){ const m=harpoonMesh(); m.rotation.y=d.yaw; scene.add(m); projs.push({kind:'harpoon',x:d.x+fx*.9,y:d.base+1.35,z:d.z+fz*.9,fx,fz,spd:26,life:stat(d,'range')/26,hit:new Set(),dmg:stat(d,'dmg'),mesh:m}); SFX.harpoon(); }
  else if(d.kind==='acorn'){ for(let k=0;k<(cfg.shots||3);k++){ const a=d.yaw+(k-1)*.21+R(-.05,.05); const ax=Math.sin(a), az=Math.cos(a); const m=acornMesh(); scene.add(m); projs.push({kind:'acorn',x:d.x+ax*.9,y:d.base+1.25,z:d.z+az*.9,vx:ax*15,vy:2.2,vz:az*15,life:1.3,bounces:0,dmg:stat(d,'dmg'),mesh:m}); } SFX.acorn(); }
  else { // trebuchet: lob a turnip so it lands where the target is heading
    const m=turnipMesh(); scene.add(m); const x0=d.x+fx*.6, z0=d.z+fz*.6, y0=d.base+2.4; const T=clamp(Math.hypot(e.x-x0,e.z-z0)/11,.5,1.6); const lead=(e.walking?mobSpd(e)*T*.8:0); const tx=e.x+Math.sin(e.yaw)*lead, tz=e.z+Math.cos(e.yaw)*lead; /* lead a walking target by most of the flight time */ const fl=baseFloor(tx,tz)+.35; const vy=((fl-y0)+.5*18*T*T)/T;
    projs.push({kind:'turnip',x:x0,y:y0,z:z0,vx:(tx-x0)/T,vy,vz:(tz-z0)/T,life:T+1,dmg:stat(d,'dmg'),splash:cfg.splash*heroMult('aoe')*(1+heroStat('tarea')/100),mesh:m}); SFX.ball(); } }
function turnipSplat(p){ const fl=baseFloor(p.x,p.z); for(const e of enemies){ if(e.dead) continue; const dx=e.x-p.x, dz=e.z-p.z, dd=Math.hypot(dx,dz); if(dd<p.splash+e.r*.5){ const l=Math.max(dd,.01); hurt(e,Math.max(1,Math.round(p.dmg*(1-.5*dd/p.splash)*10)/10),dx/l*.7,dz/l*.7); } }
  SFX.thud(); const fx=glow(0xd9e59a,2.2,.7); fx.position.set(p.x,fl+.3,p.z); scene.add(fx); projs.push({kind:'splat',t:0,mesh:fx}); }
function stat(d,k){ const cfg=DEFS[d.kind], l=d.lvl||1; if(k==='dmg') return Math.max(1,Math.round(cfg.dmg*(1+.5*(l-1))*(1+heroStat('tow')/100)*heroMult('tow')*10)/10); if(k==='cd') return cfg.cd*Math.pow(.8,l-1)/heroMult('tcd')/(1+heroStat('trate')/100); if(k==='range') return ((cfg.range||0)+(cfg.rangeUp!==undefined?cfg.rangeUp:2)*(l-1))*(cfg.arc===360?heroMult('aoe'):1)*(1+heroStat('tarea')/100); return cfg[k]; }
function upCost(d){ return 100*(d.lvl||1); }
function upgrade(){ const d=nearestDef(3.4); if(!d) return; if(d.hp<d.max){ repair(); return; } if(d.lvl>=MAXLVL){ toast('Already Mark '+MARK[MAXLVL]+' — that is as good as it gets'); return; } const cost=upCost(d); if(S.mana<cost){ toast('Need '+cost+' mana to upgrade'); return; }
  S.mana-=cost; d.spent+=cost; d.lvl++; d.max=Math.round(DEFS[d.kind].hp*(1+.4*(d.lvl-1))); d.hp=d.max; d.pop=0; const ring=M(new THREE.TorusGeometry(d.kind==='spike'?1.1:.98,.045,6,18),mat(d.lvl>=MAXLVL?0xd8322c:0xe0b040),0,.16+.1*(d.lvl-2),0); ring.rotation.x=PI/2; d.mdl.add(ring); SFX.place(); floatText(d.x,d.top+.9,d.z,'MARK '+MARK[d.lvl]+(DEFS[d.kind].arcs?'  ·  '+arcOf(d)+'° cone':''),'#e8b94a'); floatText(d.x,d.top+1.7,d.z,'-'+cost+' ◆ mana','#5ee9ff'); toast(DEFS[d.kind].name+' → Mark '+MARK[d.lvl]+'  ·  '+cost+' mana spent'); if(hoverFor===d){ if(hoverSector) scene.remove(hoverSector); hoverSector=null; hoverFor=null; } }
function fireArrow(e,x,y,z,hit){ const m=arrowMesh(); scene.add(m); const x0=e.x, y0=e.y+1.2*e.sc, z0=e.z; const dur=Math.hypot(x-x0,z-z0)/18; projs.push({kind:'arrow',x0,y0,z0,x1:x,y1:y,z1:z,t:0,dur:Math.max(.2,dur),dmg:e.dmg,hit,mesh:m}); }
function updateDefs(dt){ const trampled=[];
  for(const d of defs){ const cfg=DEFS[d.kind]; d.pop=Math.min(1,d.pop+dt*4); const s=(d.pop<1?easeOutBack(d.pop):1)*(d.kind==='slice'?stat(d,'range')/cfg.range:(1+.07*(d.lvl-1))); d.mdl.scale.set(s,s,s); d.cd-=dt; d.shake=Math.max(0,d.shake-dt); d.recoil=Math.max(0,d.recoil-dt*4);
    d.mdl.position.set(d.x+(d.shake>0?(rnd()-.5)*.12:0),d.base,d.z+(d.shake>0?(rnd()-.5)*.12:0));
    if(d.kind==='harpoon'||d.kind==='ball'||d.kind==='acorn'){ const half=arcOf(d)*PI/360; let best=null, bd=stat(d,'range'); for(const e of enemies){ if(e.dead) continue; const dd=Math.hypot(e.x-d.x,e.z-d.z); if(dd<bd&&Math.abs(angDiff(d.rot,Math.atan2(e.x-d.x,e.z-d.z)))<=half&&los(d.x,d.z,e.x,e.z)){ bd=dd; best=e; } }
      if(best){ const ty=Math.atan2(best.x-d.x,best.z-d.z); d.yaw=angLerp(d.yaw,ty,1-Math.exp(-7*dt)); if(d.cd<=0&&Math.abs(angDiff(d.yaw,ty))<.25){ d.cd=stat(d,'cd'); fire(d,best); } } else d.yaw=angLerp(d.yaw,d.rot,1-Math.exp(-2*dt));
      d.yaw=d.rot+clamp(angDiff(d.rot,d.yaw),-half,half);
      const y=d.mdl.userData.yoke; y.rotation.y=d.yaw-d.rot; if(d.kind==='ball'){ if(d.mdl.userData.arm) d.mdl.userData.arm.rotation.x=-.9+d.recoil*2.0; d.mdl.userData.ball.visible=d.cd<cfg.cd*.5; } else { y.position.z=-d.recoil*.22; d.mdl.userData.hp.visible=d.cd<cfg.cd*.45; } }
    else if(d.kind==='slice'){ const rr=stat(d,'range'); const near=[]; for(const e of enemies){ if(!e.dead&&Math.hypot(e.x-d.x,e.z-d.z)<rr+e.r*.5) near.push(e); }
      d.spin=lerp(d.spin,near.length?1.8:.5,1-Math.exp(-3*dt)); const hub=d.mdl.userData.hub; if(hub){ hub.rotation.y+=d.spin*dt; const lift=near.length?1.7:1.1; for(const pf of hub.children){ const k=((S.t*.45+pf.userData.ph)%1.1)/1.1; pf.position.y=.25+k*lift; pf.material.opacity=(.22+Math.min(near.length,4)*.06)*(1-k); } }
      for(const e of near) e.slowT=.5;
      if(near.length&&d.cd<=0){ d.cd=stat(d,'cd'); for(const e of near) hurt(e,stat(d,'dmg'),0,0); SFX.spore(); d.hp-=near.length*.35; if(d.hp<=0) trampled.push(d); } }
    else if(d.kind==='spike'){ d.calm=(d.calm||0)+dt; if(d.calm>4&&d.hp<d.max) d.hp=Math.min(d.max,d.hp+cfg.regrow*dt); } }
  for(const d of trampled){ removeDef(d); SFX.destroy(); toast(DEFS[d.kind].name+' trampled flat!'); }
}
function updateProj(dt){}
function updateProj(dt){
  for(let i=projs.length-1;i>=0;i--){ const p=projs[i]; let dead=false;
    if(p.kind==='harpoon'){ p.life-=dt; dead=p.life<=0; const nx=p.x+p.fx*p.spd*dt, nz=p.z+p.fz*p.spd*dt; const g=gat(wc(nx),wcz(nz)); if(g===T.WALL||g===T.PILLAR) dead=true; p.x=nx; p.z=nz;
      for(const e of enemies){ if(e.dead||p.hit.has(e)) continue; if(Math.hypot(e.x-p.x,e.z-p.z)<e.r+.5){ p.hit.add(e); hurt(e,p.dmg,p.fx*.9,p.fz*.9); SFX.hit(); } } p.mesh.position.set(p.x,p.y,p.z); }
    else if(p.kind==='acorn'){ p.life-=dt; dead=p.life<=0; const nx=p.x+p.vx*dt; if(wallAt(nx+Math.sign(p.vx)*.3,p.z)){ p.vx=-p.vx*.8; p.bounces++; } else p.x=nx; const nz=p.z+p.vz*dt; if(wallAt(p.x,nz+Math.sign(p.vz)*.3)){ p.vz=-p.vz*.8; p.bounces++; } else p.z=nz;
      const fl=baseFloor(p.x,p.z)+.3; p.vy-=14*dt; p.y+=p.vy*dt; if(p.y<fl){ p.y=fl; p.vy=-p.vy*.45; p.vx*=.8; p.vz*=.8; p.bounces++; } if(p.bounces>2) dead=true;
      for(const e of enemies){ if(e.dead) continue; if(Math.hypot(e.x-p.x,e.z-p.z)<e.r+.45&&Math.abs(e.y+e.h*.5-p.y)<e.h){ hurt(e,p.dmg,p.vx*.05,p.vz*.05); SFX.hit(); dead=true; break; } }
      p.mesh.rotation.x+=dt*9; p.mesh.position.set(p.x,p.y,p.z); }
    else if(p.kind==='turnip'){ p.life-=dt; p.vy-=18*dt; const nx=p.x+p.vx*dt, nz=p.z+p.vz*dt; p.y+=p.vy*dt; let hit=wallAt(nx,nz)||p.life<=0; if(!hit){ p.x=nx; p.z=nz; }
      if(!hit) for(const e of enemies){ if(e.dead) continue; if(Math.hypot(e.x-p.x,e.z-p.z)<e.r+.4&&p.y<e.y+e.h+.4){ hit=true; break; } }
      if(!hit&&p.y<=baseFloor(p.x,p.z)+.3) hit=true;
      if(hit){ turnipSplat(p); dead=true; } else { p.mesh.rotation.x+=dt*5; p.mesh.position.set(p.x,p.y,p.z); } }
    else if(p.kind==='splat'){ p.t+=dt; const k=p.t/.4; p.mesh.scale.set(2.2+k*2.8,2.2+k*2.8,1); p.mesh.material.opacity=.7*(1-k); dead=p.t>=.4; }
    else { p.t+=dt/p.dur; const t=Math.min(1,p.t); const x=lerp(p.x0,p.x1,t), z=lerp(p.z0,p.z1,t), y=lerp(p.y0,p.y1,t)+Math.sin(t*PI)*1.4; p.mesh.position.set(x,y,z); const t2=Math.min(1,t+.05); p.mesh.lookAt(lerp(p.x0,p.x1,t2),lerp(p.y0,p.y1,t2)+Math.sin(t2*PI)*1.4,lerp(p.z0,p.z1,t2));
      if(p.t>=1){ dead=true; if(p.hit.kind==='crystal') hurtCrystal(p.dmg); else if(p.hit.obj&&defs.includes(p.hit.obj)) hurtDef(p.hit.obj,p.dmg); } }
    if(dead){ scene.remove(p.mesh); projs.splice(i,1); } }
}
function spawnOrbs(x,z,n){ for(let k=0;k<n;k++){ const a=rnd()*TAU; const o={x,y:.8,z,vx:Math.cos(a)*2.5,vy:4+rnd()*2.5,vz:Math.sin(a)*2.5,mesh:orbMesh(),t:0}; o.mesh.position.set(x,.8,z); scene.add(o.mesh); orbs.push(o); } }
function updateOrbs(dt){
  for(let i=orbs.length-1;i>=0;i--){ const o=orbs[i]; o.t+=dt; const hd=Math.hypot(hero.x-o.x,hero.z-o.z);
    if(hero.dead<=0&&hd<3.6){ const tx=hero.x, ty=hero.y+1, tz=hero.z; const dx=tx-o.x, dy=ty-o.y, dz=tz-o.z, d=Math.hypot(dx,dy,dz); if(d<.7){ const v=Math.round(5*(1+heroStat('mana')/100)*heroMult('mana')*10)/10; S.mana=Math.round((S.mana+v)*10)/10; SFX.mana(); floatText(o.x,o.y+.4,o.z,'+'+v,'#5ee9ff'); scene.remove(o.mesh); orbs.splice(i,1); continue; } const sp=11*dt/d; o.x+=dx*sp; o.y+=dy*sp; o.z+=dz*sp; }
    else { o.vy-=14*dt; const nx=o.x+o.vx*dt, nz=o.z+o.vz*dt; if(!solidAt(nx,nz,0,true)){ o.x=nx; o.z=nz; } else { o.vx=-o.vx*.5; o.vz=-o.vz*.5; } o.y+=o.vy*dt; const fl=baseFloor(o.x,o.z)+.3; if(o.y<fl){ o.y=fl; o.vy=-o.vy*.4; o.vx*=.7; o.vz*=.7; } }
    o.mesh.position.set(o.x,o.y+Math.sin(o.t*4)*.05,o.z); o.mesh.userData.o.rotation.y+=dt*3; }
}

// ================= LOOT =================
const LR=()=>Math.random();   // loot uses real randomness, not the seeded world rng
const RCOL=[0xcfcfcf,0x5ad05a,0x4a90ff,0xb050ff,0xffb830], RCSS=['#d8d8d8','#5ad05a','#6aa8ff','#c070ff','#ffc040'], RNAME=['Common','Uncommon','Rare','Epic','Legendary'];
const SLOTS=['weapon','armor','charm','amulet','familiar'], SICON={weapon:'⚔',armor:'🛡',charm:'🔮',amulet:'📿',familiar:'🦉'};
const BASES={weapon:['Shortsword','Broadsword','Cleaver','Warhammer','Halberd','Gnome Blade'],armor:['Jerkin','Chainmail','Breastplate','Plate Harness','Tower Plate','Warden Mail'],charm:['Charm','Talisman','Idol','Sigil','Lantern','Relic'],amulet:['Pendant','Amulet','Locket','Torc','Medallion','Heartstone'],familiar:['Wisp','Cave Bat','Moss Sprite','Fire Imp','Crystal Owl','Storm Drake']};
const PREFIX=[['Rusty','Plain','Worn','Sturdy','Old'],['Fine','Hardened','Keen','Polished'],['Gleaming','Runed','Tempered','Silvered'],['Ancient','Stormforged','Dragonbone','Moonlit'],['Mythic','Eternal','Goblinbane','Crystalheart']];
const SUFFIX=['of the Hall','of Goblin Slaying','of Embers','of the Deep','of Fury','of the Crystal','of the Tower','of Stone'];
const DROP={goblin:.05,archer:.10,orc:.22,ogre:1};
const STATL={dmg:v=>'+'+v+' dmg',spd:v=>'+'+v+'% swing',hp:v=>'+'+v+' hp',def:v=>'+'+v+'% armor',regen:v=>'+'+v+' hp/s',tow:v=>'+'+v+'% defenses',mana:v=>'+'+v+'% mana',move:v=>'+'+v+'% speed',fdmg:v=>v+' pet dmg',frate:v=>'+'+v+'% pet rate',trate:v=>'+'+v+'% defense speed',tarea:v=>'+'+v+'% defense range',fproj:v=>'+'+v+' pet projectile'+(v===1?'':'s')};
const STATW={dmg:3,spd:1,hp:.6,def:1.5,regen:4,tow:1.2,mana:.5,move:1.5,fdmg:2.5,frate:.8,trate:1.2,tarea:1.2,fproj:12};
function heroStat(k){ let v=0; for(const s of SLOTS){ const it=gear[s]; if(it&&it.stats[k]) v+=it.stats[k]; } return v; }
function heroMult(k){ return 1+(Meta.mult(k)||0); }
function swingBase(){ return (useGLB&&GLBH&&GLBH.attackDur)?GLBH.attackDur:.38; }
function heroDmg(){ return Math.round((8+heroStat('dmg'))*heroMult('dmg')*(swingBase()/.38)*10)/10; }   // one decimal, like stat(d,'dmg'): a single Blade point (+8%) is visible on an 8-damage swing
function gearScore(){ let v=0; for(const s of SLOTS){ if(gear[s]) v+=gear[s].score; } return v; }
function swingDur(){ return swingBase()/((1+heroStat('spd')/100)*heroMult('spd')); }
function hitFrac(){ return (useGLB&&GLBH&&GLBH.hitFrac)||.32; }
function rollRarity(minR){ const w=Math.max(1,effWave()); const wt=[Math.max(25,64-1.2*w),25,8.5+.7*w,w>=3?2+.35*w:0,w>=6?.5+.12*w:0]; const tot=wt.reduce((a,b)=>a+b,0); let r=LR()*tot, i=0; while(i<4&&r>=wt[i]){ r-=wt[i]; i++; } return Math.max(minR||0,i); }
function rollStat(k,L,r){ const j=.8+LR()*.4; const v={dmg:(1.5+L*.6)*(1+r*.45),spd:5+r*6+L,hp:(8+L*4)*(1+r*.45),def:3+r*3+L*.6,regen:(.5+r*.5+L*.15)*10,tow:4+r*5+L*1.2,mana:10+r*8+L*1.5,move:3+r*2.5+L*.5,fdmg:(2+L*.8)*(1+r*.5),frate:8+r*8+L*1.5}[k]*j;
  return k==='regen'?Math.round(v)/10:Math.round(Math.min(k==='def'?45:k==='move'?40:999,v)); }
// tier: which bracket of waves an item belongs to (shop stock is sold by tier)
function tierOf(L){ return Math.min(5,1+Math.floor((Math.max(1,L)-1)/3)); }
function rollItem(minR,slot,lvl){ slot=slot||SLOTS[(LR()*SLOTS.length)|0]; const r=rollRarity(minR), L=Math.max(1,lvl||effWave());
  const pools={weapon:['dmg','spd'],armor:['hp','def','regen'],charm:['tow','mana','move'],amulet:['hp','regen','def','spd'],familiar:['fdmg','frate']}; const keys=pools[slot].slice(0,1+Math.min(r,pools[slot].length-1));
  if(r===4){ const others=Object.keys(STATW).filter(k=>!keys.includes(k)); keys.push(others[(LR()*others.length)|0]); }
  const stats={}; keys.forEach(k=>{ stats[k]=rollStat(k,L,r); });
  const name=PREFIX[r][(LR()*PREFIX[r].length)|0]+' '+BASES[slot][Math.min(BASES[slot].length-1,(r+((LR()*2)|0)))]+(r>=2?' '+SUFFIX[(LR()*SUFFIX.length)|0]:'');
  let score=0; for(const k in stats) score+=stats[k]*STATW[k];
  const value=Math.round(10*(1+L*.5)*[1,2,4,8,16][r]);
  return {slot,rarity:r,lvl:L,tier:tierOf(L),name,stats,score:Math.round(score*10)/10,value,id:Math.floor(LR()*1e9).toString(36)+L.toString(36)}; }
function statStr(it){ return Object.keys(it.stats).map(k=>STATL[k](it.stats[k])).join(' · '); }
function lootMesh(it){ const g=new THREE.Group(); const col=RCOL[it.rarity]; const m=mat(col), steel=mat(0xc4ced9); const item=new THREE.Group(); item.position.y=.55;
  if(it.slot==='weapon'){ item.add(M(G.box(.1,.8,.04),steel,0,.15,0)); item.add(M(G.box(.34,.06,.08),m,0,-.25,0)); item.add(M(G.cyl(.035,.035,.22,6),mat(0x2b2540),0,-.39,0)); item.add(M(G.sph(.06,6,5),m,0,-.52,0)); }
  else if(it.slot==='armor'){ item.add(M(G.box(.5,.5,.28),m)); item.add(M(G.box(.54,.1,.32),steel,0,.28,0)); item.add(M(G.sph(.08,6,5),steel,0,.02,.16)); }
  else if(it.slot==='amulet'){ const chain=M(new THREE.TorusGeometry(.24,.03,6,16),steel,0,.1,0); chain.rotation.x=.3; item.add(chain); item.add(M(G.sph(.12,8,6),m,0,-.16,0)); item.add(M(G.box(.05,.09,.04),steel,0,-.02,0)); }
  else if(it.slot==='familiar'){ const egg=M(G.sph(.17,10,8),m,0,.02,0); egg.scale.set(.85,1.15,.85); item.add(egg); item.add(M(new THREE.TorusGeometry(.26,.025,5,16),steel,0,-.12,0)); item.add(M(G.sph(.05,6,5),steel,0,.25,0)); }
  else { item.add(M(new THREE.TorusGeometry(.2,.06,6,14),m)); item.add(M(G.sph(.09,8,6),steel,0,-.2,0)); }
  outline(item); g.add(item); g.userData.item=item;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.14,.3,3.2,10,1,true),new THREE.MeshBasicMaterial({color:C(col),transparent:true,opacity:.22+it.rarity*.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); beam.position.y=1.6; beam.userData.noOL=true; g.add(beam);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.55,20),new THREE.MeshBasicMaterial({color:C(col),transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); ring.rotation.x=-PI/2; ring.position.y=.05; ring.userData.noOL=true; g.add(ring); g.userData.ring=ring;
  const gl=glow(col,1.6+it.rarity*.35,.6); gl.position.y=.55; g.add(gl); return g; }
function dropLoot(it,x,z,gentle){ const a=LR()*TAU, sp=gentle?.6:2.2; const l={it,x,y:.6,z,vx:Math.cos(a)*sp,vy:gentle?3:5,vz:Math.sin(a)*sp,mesh:lootMesh(it),t:0}; l.mesh.position.set(x,.6,z); scene.add(l.mesh); loot.push(l); return l; }
function rollDrop(e){ const ch=DROP[e.kind]||0; if(LR()<ch) dropLoot(rollItem(e.kind==='ogre'?(effWave()>=6?2:1):0),e.x,e.z); if(e.kind==='ogre'&&LR()<.5) dropLoot(rollItem(1),e.x,e.z); }
function lootToast(it,verb){ $('toast').innerHTML='<b style="color:'+RCSS[it.rarity]+'">'+it.name+'</b> · '+statStr(it)+' — '+verb; $('toast').style.opacity=1; toastT=3.4; }
function applyGear(){ const oldMax=hero.max; hero.max=Math.round((100+heroStat('hp'))*heroMult('hp')); if(hero.max>oldMax) hero.hp+=hero.max-oldMax; hero.hp=Math.min(hero.hp,hero.max); }
function saveGear(){ try{ localStorage.setItem('ddGear',JSON.stringify(gear)); }catch(e){} }
function loadGear(){ try{ const g=JSON.parse(localStorage.getItem('ddGear')); if(g&&typeof g==='object'){ for(const s of SLOTS){ const it=g[s]; if(it&&it.stats&&SLOTS.includes(it.slot)&&it.rarity>=0&&it.rarity<=4) gear[s]=it; } } }catch(e){} applyGear(); hero.hp=hero.max; }
function resetGear(){ gear={weapon:null,armor:null,charm:null,amulet:null,familiar:null}; saveGear(); applyGear(); }
function pickup(l){ const it=l.it, cur=gear[it.slot];
  if(Meta.onPickup(it,l)) return;
  if(!cur||it.score>cur.score){ if(cur) S.mana+=cur.value; gear[it.slot]=it; applyGear(); saveGear(); SFX.loot(it.rarity); floatText(l.x,l.y+1,l.z,RNAME[it.rarity].toUpperCase()+' '+SICON[it.slot],RCSS[it.rarity]); lootToast(it,cur?'equipped (old one sold for '+cur.value+' mana)':'equipped'); }
  else { S.mana+=it.value; SFX.mana(); floatText(l.x,l.y+.8,l.z,'+'+it.value,'#5ee9ff'); lootToast(it,'sold for '+it.value+' mana'); } }
function updateLoot(dt){
  for(let i=loot.length-1;i>=0;i--){ const l=loot[i]; l.t+=dt;
    l.vy-=14*dt; const nx=l.x+l.vx*dt, nz=l.z+l.vz*dt; if(!solidAt(nx,nz,0,true)){ l.x=nx; l.z=nz; } else { l.vx=-l.vx*.5; l.vz=-l.vz*.5; } l.y+=l.vy*dt; const fl=baseFloor(l.x,l.z); if(l.y<fl){ l.y=fl; l.vy=-l.vy*.3; l.vx*=.6; l.vz*=.6; }
    l.mesh.position.set(l.x,l.y,l.z); l.mesh.userData.item.position.y=.55+Math.sin(l.t*3)*.08; l.mesh.userData.item.rotation.y+=dt*2; l.mesh.userData.ring.scale.setScalar(1+Math.sin(l.t*4)*.08);
    if(hero.dead<=0&&Math.hypot(hero.x-l.x,hero.z-l.z)<1.15&&Math.abs(hero.y-l.y)<1.6){ pickup(l); scene.remove(l.mesh); loot.splice(i,1); } }
}
let gearHTML='';
function updateGearHUD(){ let h=''; for(const s of SLOTS){ const it=gear[s]; h+='<div class="gr"><span class="gi">'+SICON[s]+'</span>'+(it?'<span class="gn" style="color:'+RCSS[it.rarity]+'">'+it.name+'</span><span class="gs">'+statStr(it)+'</span>':'<span class="ge">no '+s+' yet</span>')+'</div>'; } if(h!==gearHTML){ gearHTML=h; $('gear').innerHTML=h; } }
loadGear();

// ================= WAVES =================
function waveComp(w){ const all=Object.keys(LANES); const lanes=w<2?all.slice(0,1):w<4?all.slice(0,2):all; const q=[]; let t=1.5; const n=6+3*w; const gap=Math.max(.35,.8-.03*w); for(let i=0;i<n;i++){ q.push({t,kind:'goblin',lane:lanes[i%lanes.length]}); t+=gap; }
  const orcs=w>=2?w-1:0; for(let i=0;i<orcs;i++) q.push({t:3+i*2.2,kind:'orc',lane:lanes[(i+1)%lanes.length]});
  const arch=w>=3?Math.floor(w/2):0; for(let i=0;i<arch;i++) q.push({t:4+i*1.8,kind:'archer',lane:lanes[i%lanes.length]});
  const ogres=w>=4&&(w-4)%3===0?(w>=10?2:1):0; for(let i=0;i<ogres;i++) q.push({t:t+2+i*4,kind:'ogre',lane:i?all[all.length-1]:all[0]});
  q.sort((a,b)=>a.t-b.t);
  const parts=['Goblins ×'+n]; if(orcs) parts.push('Orcs ×'+orcs); if(arch) parts.push('Hobgoblin Archers ×'+arch); if(ogres) parts.push(ogres>1?'TWO OGRES':'AN OGRE');
  const gates=lanes.map(l=>LANES[l].name||l).join(' + ')+' gate'+(lanes.length>1?'s':'');
  return {q,desc:parts.join(' · ')+'  —  '+gates}; }
function startWave(){ if(S.phase!=='build') return; S.wave++; S.phase='wave'; S.waveT=0; const c=waveComp(effWave()); spawnQ=c.q; banner('WAVE '+S.wave+' OF '+MAP.waves,c.desc); SFX.horn(); setMusic('wave'); cancelPlace(); }
function updateWave(dt){ if(S.phase!=='wave') return; S.waveT+=dt; while(spawnQ.length&&spawnQ[0].t<=S.waveT){ const s=spawnQ.shift(); spawnEnemy(s.kind,s.lane); }
  if(!spawnQ.length&&!enemies.some(e=>!e.dead)){ const bonus=50+10*effWave(); S.mana+=bonus; dropLoot(rollItem(effWave()%5===0?2:1),R(-1.6,1.6),4.6,true); Meta.onWaveHeld(effWave());
    if(S.wave>=MAP.waves) winMap(); else { S.phase='build'; banner('HALL HELD','wave '+S.wave+' of '+MAP.waves+' repelled  ·  +'+bonus+' mana  ·  a reward drops by the crystal'); setMusic('build'); SFX.held(); } } }
// the last wave of a map held: the map is cleared, the next one unlocks, the run ends in glory (the tavern shows the tally with a NEXT MAP button)
function winMap(){ S.phase='won'; cancelPlace(); banner('HALL HELD','the horde broke on wave '+S.wave+'  ·  '+MAP.name+' is yours'); SFX.held(); setTimeout(()=>SFX.horn(),500); setMusic('none'); droneOff();
  try{ localStorage.setItem('ddMapsCleared',String(Math.max(MAPS_CLEARED,MAPI+1))); }catch(e){}
  if(document.pointerLockElement&&document.exitPointerLock) document.exitPointerLock(); document.body.classList.remove('play');
  setTimeout(()=>{ if(S.phase!=='won') return; const shown=Meta.onRunEnd(effWave(),{won:true,map:MAPI,mapName:MAP.name,hasNext:MAPI+1<MAPS.length}); if(!shown){ $('deadwave').textContent=S.wave; $('dead').classList.remove('hide'); } },2400); }

// ================= PLACEMENT / REPAIR / SELL =================
function select(kind){ if(S.phase==='start'||S.phase==='dead'||S.phase==='won') return; if(placing===kind){ cancelPlace(); return; } cancelPlace(); placing=kind; ghost=makeDef(kind,true); scene.add(ghost); const cfg=DEFS[kind]; ghostSector=sectorMesh(cfg.range||0,cfg.arc||360,0x40ff80); scene.add(ghostSector); ghostRot=0; placeStage=0; anchorPos=null; updateGhost(); }
function cancelPlace(){ if(ghost){ scene.remove(ghost); ghost=null; } if(ghostSector){ scene.remove(ghostSector); ghostSector=null; } placing=null; placeStage=0; anchorPos=null; }
function updateHoverSector(){ const d=placing?null:nearestDef(3.4); if(d!==hoverFor){ if(hoverSector){ scene.remove(hoverSector); hoverSector=null; } hoverFor=d; if(d&&DEFS[d.kind].range){ hoverSector=sectorMesh(stat(d,'range'),arcOf(d),0xe8b94a); hoverSector.position.set(d.x,d.base,d.z); hoverSector.rotation.y=d.rot; scene.add(hoverSector); } } }
function unstick(){ if(placeStage===1){ placeStage=0; anchorPos=null; ghostRot=anchorYaw-cam.yaw; } }
function rotateGhost(a){ if(placeStage===1) anchorYaw+=a; else ghostRot+=a; }
function updateGhost(){ if(!placing) return; const [px,pz]=placeStage===1?anchorPos:aimPoint(); const cx=wc(px), cz=wcz(pz); const t=gat(cx,cz), cfg=DEFS[placing]; let reason='';
  const yaw=placeStage===1?anchorYaw:cam.yaw+ghostRot; const cells=footprintCells(placing,px,pz,yaw); const heroCell=idx(wc(hero.x),wcz(hero.z));
  if(!(t===T.FLOOR||t===T.CARPET)||cells.some(i=>!walk(grid[i])||rampA[i])) reason="Can't build there"; else if(cells.some(i=>defAt[i])) reason='Already occupied'; else if(cells.includes(heroCell)||Math.hypot(px-hero.x,pz-hero.z)<1.1) reason="You're standing there"; else if(S.du+cfg.du>DU_CAP) reason='Not enough Defense Units'; else if(S.mana<cfg.mana) reason='Not enough mana'; else if(enemies.some(e=>!e.dead&&Math.hypot(e.x-px,e.z-pz)<2.2)) reason='Enemy too close';
  ghostOk=!reason; ghostReason=reason; ghostCell=[cx,cz]; ghostPos=[px,pz]; ghostYaw=yaw;
  ghost.position.set(px,baseFloor(px,pz),pz); ghost.rotation.y=ghostYaw; const m=ghostOk?GHOST_OK:GHOST_BAD; ghost.traverse(o=>{ if(o.isMesh) o.material=m; });
  if(ghostSector){ ghostSector.position.set(px,baseFloor(px,pz),pz); ghostSector.rotation.y=ghostYaw; tintSector(ghostSector,ghostOk?0x40ff80:0xff3030); } }
function confirmPlace(){ if(!placing) return; if(!ghostOk){ toast(ghostReason); return; }
  if(placeStage===0){ anchorPos=[ghostPos[0],ghostPos[1]]; anchorYaw=ghostYaw; placeStage=1; SFX.hit(); updateGhost(); return; }   // first click: set it down
  placeDefAt(placing,ghostPos[0],ghostPos[1],ghostYaw); floatText(ghostPos[0],2.2,ghostPos[1],DEFS[placing].name,'#e8b94a'); cancelPlace(); }
function nearestDef(rad){ let best=null, bd=rad; for(const d of defs){ const dd=Math.hypot(d.x-hero.x,d.z-hero.z); if(dd<bd){ bd=dd; best=d; } } return best; }
function repair(){ const d=nearestDef(3.4); if(!d) return; if(d.hp>=d.max){ toast('Already at full health'); return; } const cost=Math.ceil((d.max-d.hp)/8); if(S.mana<cost){ toast('Need '+cost+' mana to repair'); return; } S.mana-=cost; d.hp=d.max; SFX.place(); floatText(d.x,d.top+.8,d.z,'REPAIRED','#5ee9ff'); floatText(d.x,d.top+1.6,d.z,'-'+cost+' ◆ mana','#5ee9ff'); }
function sell(){ const d=nearestDef(3.4); if(!d) return; const back=Math.round(d.spent*.7); S.mana+=back; removeDef(d); SFX.sell(); floatText(d.x,2,d.z,'+'+back+' mana','#5ee9ff'); }

// ================= FX / HUD / OVERLAY =================
function updateFx(dt){ S.t+=dt; const t=S.t;
  flames.forEach((f,i)=>{ const s=1+Math.sin(t*13+f.p)*.18+Math.sin(t*7.3+f.p*2)*.1; f.f.scale.set(1,s,1); f.f2.scale.set(1,1.1-(s-1),1); });
  torchLights.forEach((l,i)=>{ l.intensity=l.userData.base*(.92+Math.sin(t*9+i*1.7)*.05+Math.sin(t*23+i)*.04); });
  const cg=crystalG.userData.cg; cg.rotation.y=t*.7; cg.position.y=(crystalG.userData.cgY||3.2)+Math.sin(t*1.6)*.15+(crystalShake>0?(rnd()-.5)*.3:0); crystalShake=Math.max(0,crystalShake-dt);
  for(let k=0;k<4;k++){ const s=crystalG.userData['s'+k]; const a=s.userData.a+t*1.4; s.position.set(Math.cos(a)*1.7,Math.sin(t*2+k)*.5,Math.sin(a)*1.7); s.rotation.y=t*3; }
  crystalMesh.material.emissiveIntensity=S.phase==="dead"?.1:.55+Math.sin(t*3)*.15+(crystalShake>0?.6:0);
  portals.forEach(p=>{ p.ring.rotation.z=t*1.2; p.pulse=Math.max(0,(p.pulse||0)-dt*2); const s=1+p.pulse*.35; p.ring.scale.set(s,s,1); p.disc.material.opacity=.85+Math.sin(t*4)*.08; });
  bannerT-=dt; if(bannerT<0&&bannerT>-1){ $('banner').style.opacity=0; bannerT=-2; } toastT-=dt; if(toastT<0&&toastT>-1){ $('toast').style.opacity=0; toastT=-2; }
  dmgFlash=Math.max(0,dmgFlash-dt*2.5); $('dmg').style.opacity=dmgFlash;
  for(let i=floats.length-1;i>=0;i--){ const f=floats[i]; f.t+=dt; if(f.t>1.1) floats.splice(i,1); }
}
const hud={}; function setT(id,v){ if(hud[id]!==v){ hud[id]=v; $(id).textContent=v; } }
function updateHUD(){ const cw_=Math.max(0,S.crystal)+'%'; if(hud.cbar!==cw_){ hud.cbar=cw_; $('cbar').style.width=cw_; } const hw=(hero.hp/hero.max*100)+'%'; if(hud.hbar!==hw){ hud.hbar=hw; $('hbar').style.width=hw; }
  setT('mana',Math.floor(S.mana)); setT('du',S.du+'/'+DU_CAP); updateGearHUD();
  const alive=enemies.filter(e=>!e.dead).length+spawnQ.length;
  if(S.phase==='wave'){ setT('wavet','WAVE '+S.wave+' / '+MAP.waves); setT('phaset',alive+' enem'+(alive===1?'y':'ies')+' left'); } else if(S.phase==='won'){ setT('wavet','HALL HELD — '+MAP.name+' CLEARED'); setT('phaset',''); } else if(S.phase==='build'){ setT('wavet',S.wave?'HALL HELD — BUILD PHASE':'BUILD PHASE'); setT('phaset',TOUCH?'Place defenses, then tap 📯':'Place defenses (1–5), then press G to sound the horn'); }
  DEFKEYS.forEach(k=>{ const el=$('slot-'+k), cfg=DEFS[k]; const cls='slot'+(placing===k?' sel':'')+((S.mana<cfg.mana||S.du+cfg.du>DU_CAP)?' poor':''); if(el.className!==cls) el.className=cls; });
  let pr=''; if(placing){ pr=placeStage===1?(ghostOk?(TOUCH?'Drag or ↻ to turn it  ·  tap ✔ to build':'Move the mouse, R or wheel to turn it  ·  click to build  ·  right-click to pick it up'):ghostReason):(ghostOk?(TOUCH?'Tap ✔ to set it down · look to aim':'Click to set it down  ·  look to aim  ·  Esc cancel'):ghostReason); } else { const d=nearestDef(3.4); if(d){ const cost=Math.ceil((d.max-d.hp)/8); pr=DEFS[d.kind].name+(d.lvl>1?' Mk '+MARK[d.lvl]:'')+'  '+Math.ceil(d.hp)+'/'+d.max+(cost?'  ·  E repair ('+cost+' mana)':(d.lvl<MAXLVL?'  ·  E upgrade ('+upCost(d)+' mana)':''))+'  ·  X sell (+'+Math.round(d.spent*.7)+')'; } }
  setT('prompt',pr); const wb=S.phase!=='build'; if(hud.wb!==wb){ hud.wb=wb; $('wavebtn').disabled=wb; }
}
const PV=new THREE.Vector3();
function proj(x,y,z){ PV.set(x,y,z).project(camera); if(PV.z>1) return null; return [(PV.x+1)/2*ov.width,(1-PV.y)/2*ov.height]; }
function drawOverlay(){ ovx.clearRect(0,0,ov.width,ov.height); if(S.phase==='start') return;
  const bar=(p,w,frac,col)=>{ ovx.fillStyle='#120c1a'; ovx.fillRect(p[0]-w/2-1,p[1]-4,w+2,7); ovx.fillStyle=col; ovx.fillRect(p[0]-w/2,p[1]-3,w*clamp(frac,0,1),5); };
  for(const e of enemies){ if(e.dead||e.hp>=e.max) continue; const p=proj(e.x,e.y+e.h+.35,e.z); if(p) bar(p,e.kind==='ogre'?80:40,e.hp/e.max,'#e03a3a'); }
  for(const d of defs){ if(d.hp>=d.max) continue; const p=proj(d.x,d.top+.5,d.z); if(p) bar(p,44,d.hp/d.max,'#5ad05a'); }
  ovx.font='bold 17px Georgia,serif'; ovx.textAlign='center'; ovx.lineWidth=3; ovx.strokeStyle='#120c1a';
  for(const f of floats){ const p=proj(f.x,f.y+f.t*1.2,f.z); if(!p) continue; ovx.globalAlpha=clamp(1.4-f.t,0,1); ovx.fillStyle=f.col; ovx.strokeText(f.txt,p[0],p[1]); ovx.fillText(f.txt,p[0],p[1]); } ovx.globalAlpha=1;
}

// ================= INPUT =================
const K={};
addEventListener('keydown',e=>{ const c=e.code; if(Meta.isOpen()) return; if(c==='KeyI'||c==='KeyB'){ if(!e.repeat) Meta.open(); return; } if(S.phase==='start'){ if(c==='Enter'||c==='Space'){ e.preventDefault(); play(); } return; }
  if(c==='KeyW'||c==='ArrowUp') K.w=1; if(c==='KeyS'||c==='ArrowDown') K.s=1; if(c==='KeyA') K.a=1; if(c==='KeyD') K.d=1; if(c==='ShiftLeft'||c==='ShiftRight') K.shift=1; if(c==='ArrowLeft') K.tl=1; if(c==='ArrowRight') K.tr=1;
  if(c==='Space'){ jump(); e.preventDefault(); }
  if(c==='Digit1') select('harpoon'); if(c==='Digit2') select('acorn'); if(c==='Digit3') select('ball'); if(c==='Digit4') select('slice'); if(c==='Digit5') select('spike');
  if(c==='KeyR'){ rotateGhost(PI/12); } if(c==='Escape') cancelPlace(); if(c==='KeyG') startWave(); if(c==='KeyE') upgrade(); if(c==='KeyX') sell(); if(c==='KeyM') setSound(soundOff); if(c==='KeyN') toggleMusic(); if(c==='KeyF'||c==='KeyQ') swing(); if(c==='KeyH') toggleHero(); });
addEventListener('keyup',e=>{ const c=e.code; if(c==='KeyW'||c==='ArrowUp') K.w=0; if(c==='KeyS'||c==='ArrowDown') K.s=0; if(c==='KeyA') K.a=0; if(c==='KeyD') K.d=0; if(c==='ShiftLeft'||c==='ShiftRight') K.shift=0; if(c==='ArrowLeft') K.tl=0; if(c==='ArrowRight') K.tr=0; });
addEventListener('blur',()=>{ for(const k in K) K[k]=0; });
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{ if(TOUCH||S.phase==='start'||S.phase==='dead'||S.phase==='won'||Meta.isOpen()) return; mouseDown=true; if(!locked&&canvas.requestPointerLock) canvas.requestPointerLock();
  if(e.button===0){ if(placing) confirmPlace(); else swing(); } else if(e.button===2){ if(placing){ if(placeStage===1) unstick(); else cancelPlace(); } else swing(); } });
addEventListener('mouseup',()=>{ mouseDown=false; });
addEventListener('mousemove',e=>{ if(TOUCH||S.phase==='start'||Meta.isOpen()) return; edgeX=e.clientX/innerWidth; const dx=e.movementX||0, dy=e.movementY||0; if(placing&&placeStage===1){ anchorYaw-=dx*SENS*1.6; return; } cam.yaw-=dx*SENS; cam.pitch=clamp(cam.pitch+dy*SENS,.1,1.15); });
addEventListener('wheel',e=>{ if(S.phase==='start'||Meta.isOpen()) return; const s=Math.sign(e.deltaY); if(placing) rotateGhost(s*PI/12); else cam.dist=clamp(cam.dist+s*.8,4,12); },{passive:true});
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement===canvas; document.body.classList.toggle('play',locked); });
// touch: left half joystick, right half look
canvas.addEventListener('touchstart',e=>{ for(const t of e.changedTouches){ if(t.clientX<innerWidth/2&&joy.id===null){ joy.id=t.identifier; joy.ox=t.clientX; joy.oy=t.clientY; } else if(lookId===null){ lookId=t.identifier; lookX=t.clientX; lookY=t.clientY; } } e.preventDefault(); },{passive:false});
canvas.addEventListener('touchmove',e=>{ for(const t of e.changedTouches){ if(t.identifier===joy.id){ let dx=t.clientX-joy.ox, dy=t.clientY-joy.oy; const l=Math.hypot(dx,dy); if(l>50){ dx*=50/l; dy*=50/l; } joy.x=dx/50; joy.y=-dy/50; $('joy').firstElementChild.style.transform='translate('+dx+'px,'+dy+'px)'; }
  else if(t.identifier===lookId){ if(placing&&placeStage===1){ anchorYaw-=(t.clientX-lookX)*.01; } else { cam.yaw-=(t.clientX-lookX)*.007; cam.pitch=clamp(cam.pitch+(t.clientY-lookY)*.007,.1,1.15); } lookX=t.clientX; lookY=t.clientY; } } e.preventDefault(); },{passive:false});
const touchEnd=e=>{ for(const t of e.changedTouches){ if(t.identifier===joy.id){ joy.id=null; joy.x=joy.y=0; $('joy').firstElementChild.style.transform=''; } if(t.identifier===lookId) lookId=null; } };
canvas.addEventListener('touchend',touchEnd); canvas.addEventListener('touchcancel',touchEnd);
DEFKEYS.forEach((k,i)=>{ const cfg=DEFS[k]; const s=document.createElement('div'); s.className='slot'; s.id='slot-'+k; s.innerHTML='<div class="k">'+(i+1)+'</div><div class="ic">'+cfg.ic+'</div><div class="n">'+cfg.name+'</div><div class=\"cst\">🌱 '+cfg.du+' · '+cfg.mana+' ◆</div>'; s.addEventListener('click',()=>select(k)); $('hotbar').appendChild(s); });
if(TOUCH){ [['⚔',swing],['⤴',jump],['✔',()=>{ if(placing) confirmPlace(); }],['↻',()=>{ rotateGhost(PI/4); }],['🔧',upgrade],['🎒',()=>Meta.open()]].forEach(([t,f])=>{ const b=document.createElement('div'); b.className='hb'; b.textContent=t; b.addEventListener('touchstart',e=>{ e.preventDefault(); f(); },{passive:false}); $('btns').appendChild(b); }); }
$('wavebtn').addEventListener('click',()=>{ startWave(); if(!TOUCH&&canvas.requestPointerLock) canvas.requestPointerLock(); });
function play(){ if(S.phase!=='start') return; S.phase='build'; $('start').classList.add('hide'); SFX.enter(); setTimeout(()=>setMusic('build'),400); if(heroLoadError) setTimeout(()=>toast('Hero model failed to load ('+heroLoadError+') — using the old gnome'),600); if(!TOUCH&&canvas.requestPointerLock) canvas.requestPointerLock(); cam.x=hero.x; cam.y=hero.y+5; cam.z=hero.z+8; cam.d=cam.dist; toast('Build phase — pick a defense with 1–5, then G to start the wave'); }
$('playbtn').addEventListener('click',play); $('tavbtn').addEventListener('click',()=>Meta.open()); $('bagbtn').addEventListener('click',()=>Meta.open());

// ================= MAIN LOOP =================
function update(dt){ if(S.phase==='start'){ updateFx(dt); updateCamera(dt); return; }
  if(S.phase!=='dead'&&S.phase!=='won'&&!Meta.isOpen()){ /* the tavern pauses the hall: nothing walks, swings or fires behind the overlay */ if(!TOUCH&&!locked&&S.phase!=='start'){ if(edgeX<.1) cam.yaw+=1.6*dt; else if(edgeX>.9) cam.yaw-=1.6*dt; } if(K.tl) cam.yaw+=2.2*dt; if(K.tr) cam.yaw-=2.2*dt;
    heroUpdate(dt); updateDefs(dt); updateEnemies(dt); updateProj(dt); updateOrbs(dt); updateLoot(dt); updateWave(dt); updateGhost(); updateHoverSector(); Meta.update(dt); }
  updateFx(dt); updateCamera(dt); updateHUD(); Meta.hud(); }
let lastT=performance.now();
function frame(now){ requestAnimationFrame(frame); const dt=Math.min(.05,(now-lastT)/1000); lastT=now; update(dt); if(!Meta.isOpen()){ renderer.render(scene,camera); drawOverlay(); } }   // the tavern is opaque: no GPU work behind it
requestAnimationFrame(frame);

// ================= TEST HOOK =================
window.__dd={S,hero,cam,enemies,defs,projs,orbs,loot,grid,DEFS,MOBS,gear:()=>gear,rollItem,dropLoot,resetGear,heroStat,heroMult,heroDmg,kill,Meta,SLOTS,applyGear,saveGear,pickup,tierOf,statStr,RNAME,RCSS,loadHeroGLB,toggleHero,ghost:()=>placing?{x:ghostPos[0],z:ghostPos[1],yaw:ghostYaw,ok:ghostOk,why:ghostReason,stage:placeStage,dist:Math.hypot(ghostPos[0]-hero.x,ghostPos[1]-hero.z),sector:!!ghostSector&&ghostSector.children.length>0}:null,rotateGhost,unstick,music:()=>({on:musicOn,mode:musicMode,step:mStep}),hoverSector:()=>!!hoverSector,heroModel:()=>GLBH?{label:GLBH.label,useGLB,clips:Object.keys(GLBH.map),cur:GLBH.cur?GLBH.cur.getClip().name:null,scale:GLBH.scale,height:GLBH.height,visible:GLBH.wrap.visible}:null,mobTemplate:k=>MOBGLB[k],scene,mobModel:k=>MOBGLB[k]?{clips:Object.keys(MOBGLB[k].map),scale:MOBGLB[k].scale}:null,mobState:e=>e&&e.mdl&&e.mdl.glb?{cur:e.mdl.cur?e.mdl.cur.getClip().name:null,time:e.mdl.cur?e.mdl.cur.time:0}:null,setHeroYaw:d=>{ heroYawOff=d; },
  start:()=>{ if(S.phase==='start'){ S.phase='build'; $('start').classList.add('hide'); cam.x=hero.x; cam.y=hero.y+5; cam.z=hero.z+8; cam.d=cam.dist; } },
  startWave, place:(k,cx,cz,rot)=>placeDef(k,cx,cz,rot||0), spawn:spawnEnemy, select, confirmPlace, swing, repair, upgrade, sell, jump, setKeys:(o)=>Object.assign(K,o), r:renderer,
  step:(dt,n)=>{ for(let i=0;i<(n||1);i++) update(dt||1/60); },
  shot:(w,h)=>{ w=w||960; h=h||540; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); updateCamera(0); renderer.render(scene,camera); const d=renderer.domElement.toDataURL('image/png'); onResize(); return d; },
  setHero:(x,z,yaw)=>{ hero.x=x; hero.z=z; if(yaw!==undefined) hero.yaw=yaw; }, setCam:(yaw,pitch,dist)=>{ cam.yaw=yaw; cam.pitch=pitch; cam.dist=dist; cam.d=dist; },
  status:()=>({phase:S.phase,wave:S.wave,mana:S.mana,du:S.du,crystal:S.crystal,heroHp:Math.round(hero.hp),enemies:enemies.filter(e=>!e.dead).length,defs:defs.length,projs:projs.length,orbs:orbs.length,queue:spawnQ.length,kills:S.kills,loot:loot.length,t:+S.t.toFixed(1)}),
  addMana:n=>{ S.mana+=n; }, mute:()=>setSound(false), reflow, flow:()=>flowDef,
  map:()=>({index:MAPI,id:MAP.id,name:MAP.name,waves:MAP.waves,wbase:MAP.wbase,total:MAPS.length,cleared:MAPS_CLEARED,gw:GW,gh:GH,wallH:WALLH,windows:world.userData.windows|0,style:MAP.style||null}), maps:()=>MAPS.map(m=>({id:m.id,name:m.name,waves:m.waves})), effWave, winMap, lanes:()=>LANES, pathLen:(cx,cz)=>flowFree.dist[idx(cx,cz)], cellAt:(cx,cz)=>gat(cx,cz), cw, cwz, floorH, baseFloor, hgtAt:(cx,cz)=>hgt[idx(cx,cz)] };
})();

