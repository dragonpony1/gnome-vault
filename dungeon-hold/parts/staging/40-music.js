// ===== REAL MUSIC: two tracks fetched from assets/ next to the page and decoded from bytes (no media URLs, so the
// artifact viewer's CSP has nothing to block). The procedural music in game.js is the fallback while a track is still
// loading or if it fails.
const TRACKS={build:'assets/music-build.mp3',wave:'assets/music-wave.mp3'};
const musBytes={}, musBuf={}, musDecoding={}; let musNode=null, musGainN=null, musTrack=null; const MUS_VOL=.55;
function musFetch(name,cb){ if(!HAS_ASSETS){ musBytes[name]=false; delete TRACKS[name]; return; } if(musBytes[name]) return cb&&cb(musBytes[name]); if(musBytes[name]===false) return; (musFetch.q=musFetch.q||{})[name]=(musFetch.q[name]||[]); if(cb) musFetch.q[name].push(cb); if(musFetch.q[name].length>1) return;
  fetch(TRACKS[name]).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); }).then(buf=>{ musBytes[name]=buf; const q=musFetch.q[name]; musFetch.q[name]=[]; q.forEach(f=>f(buf)); }).catch(e=>{ console.warn('music: could not fetch '+name,e); musBytes[name]=false; musFetch.q[name]=[]; }); }
function musDecode(name,cb){ if(musBuf[name]) return cb(musBuf[name]); const a=A(); if(!a) return; if(musDecoding[name]){ musDecoding[name].push(cb); return; } musDecoding[name]=[cb];
  const fail=e=>{ console.warn('music: could not decode '+name,e); delete musDecoding[name]; delete TRACKS[name]; musicForPhase(); };
  musFetch(name,bytes=>{ try{ const pr=a.decodeAudioData(bytes.slice(0),buf=>{ musBuf[name]=buf; const cbs=musDecoding[name]||[]; delete musDecoding[name]; cbs.forEach(f=>f(buf)); },fail); if(pr&&pr.catch) pr.catch(()=>{}); }catch(e){ fail(e); } }); }   // (the callback form also returns a promise; swallow its rejection so a bad file is a warning, not a page error)
function musStop(){ if(!musNode) return; const n=musNode, g=musGainN, a=ac; musNode=null; musGainN=null; musTrack=null;
  if(a&&g){ g.gain.setTargetAtTime(.0001,a.currentTime,.25); setTimeout(()=>{ try{ n.stop(); n.disconnect(); g.disconnect(); }catch(e){} },1200); } else { try{ n.stop(); }catch(e){} } }
function musPlay(name){ const a=A(); if(!a) return; musDecode(name,buf=>{ if(musicMode!==name||musTrack===name) return; musStop(); const src=a.createBufferSource(); src.buffer=buf; src.loop=true; const g=a.createGain(); g.gain.setValueAtTime(.0001,a.currentTime); g.gain.exponentialRampToValueAtTime(MUS_VOL,a.currentTime+1.2); src.connect(g).connect(a.destination); src.start(); musNode=src; musGainN=g; musTrack=name; }); }
const setMusicProc=setMusic;
setMusic=function(mode){ const want=(musicOn&&!soundOff)?mode:'none';
  if(want!=='none'&&TRACKS[want]){ if(musicMode===want&&(musTrack===want||musDecoding[want])) return; setMusicProc('none'); musicMode=want; musPlay(want); return; }
  if(musNode||musTrack) musStop(); if(TRACKS[musicMode]) musicMode='none';   // leaving a track mode: the procedural player must see a clean slate
  setMusicProc(mode); };
// warm the bytes early (no audio context needed for that), so the first play starts at once
for(const k in TRACKS) musFetch(k);
// ---- sound samples (wav/mp3 in assets/): fetched early, decoded on first use, played through the game's audio context ----
const SAMPLES={roar:'assets/sfx-ogre-laugh.wav'};   // the ogre's arrival
const smpBuf={}, smpBytes={};
function sampleFetch(name){ if(!HAS_ASSETS){ smpBytes[name]=false; return; } if(smpBytes[name]!==undefined) return; smpBytes[name]=null; fetch(SAMPLES[name]).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); }).then(b=>{ smpBytes[name]=b; }).catch(e=>{ console.warn('sfx: could not fetch '+name,e); smpBytes[name]=false; }); }
function playSample(name,vol,rate){ const a=A(); if(!a) return false; const go=buf=>{ const s=a.createBufferSource(); s.buffer=buf; if(rate) s.playbackRate.value=rate; const g=a.createGain(); g.gain.value=vol||.5; s.connect(g).connect(a.destination); s.start(); };
  if(smpBuf[name]){ go(smpBuf[name]); return true; } const bytes=smpBytes[name]; if(!bytes) return false;
  try{ const pr=a.decodeAudioData(bytes.slice(0),buf=>{ smpBuf[name]=buf; go(buf); },e=>{ console.warn('sfx: could not decode '+name,e); smpBytes[name]=false; }); if(pr&&pr.catch) pr.catch(()=>{}); }catch(e){ return false; } return true; }
for(const k in SAMPLES) sampleFetch(k);
{ const synthRoar=SFX.roar; SFX.roar=()=>{ if(!playSample('roar',.6)) { if(synthRoar) synthRoar(); } }; }
window.__mus={state:()=>({mode:musicMode,track:musTrack,playing:!!musNode,decoded:Object.keys(musBuf),fetched:Object.keys(musBytes).filter(k=>musBytes[k]),tracks:Object.keys(TRACKS),samples:Object.keys(smpBuf),sampleBytes:Object.keys(smpBytes).filter(k=>smpBytes[k]),ctx:ac?ac.state:null}),play:playSample};
