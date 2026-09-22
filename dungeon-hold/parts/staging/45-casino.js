// ===== CASINO MANA: every orb and every coin rings like a slot machine paying out. Pickups in quick succession climb a
// bright bell ladder (each ding a step higher), coins clink under them, and every seventh in a streak is a jackpot run.
(function(){
const LADDER=[0,4,7,12,16,19,24,28,31];       // major arpeggio, semitones above C5
const ST={n:0,last:-9,jackpots:0,dings:0};
function bell(f,vol,dur,at){ const a=A(); if(!a) return; const t=a.currentTime+(at||0); const g=a.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dur); g.connect(a.destination);
  for(const [m,v,ty] of [[1,1,'sine'],[2.76,.28,'sine'],[5.4,.08,'triangle']]){ const fq=f*m*(1+(Math.random()-.5)*.004); if(fq>15000) continue; const o=a.createOscillator(); o.type=ty; o.frequency.setValueAtTime(fq,t); const og=a.createGain(); og.gain.value=v; o.connect(og).connect(g); o.start(t); o.stop(t+dur+.02); } }
function clink(at){ const a=A(); if(!a) return; const t=a.currentTime+(at||0); const n=(a.sampleRate*.05)|0, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2); const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=6500+Math.random()*1500; fl.Q.value=1.6; const g=a.createGain(); g.gain.value=.06; s.connect(fl).connect(g).connect(a.destination); s.start(t);
  const o=a.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(3200+Math.random()*600,t); const og=a.createGain(); og.gain.setValueAtTime(.03,t); og.gain.exponentialRampToValueAtTime(.0001,t+.06); o.connect(og).connect(a.destination); o.start(t); o.stop(t+.07); }
function jackpot(){ const a=A(); if(!a) return; ST.jackpots++; const run=[0,4,7,12,16,19,24,28]; run.forEach((st,i)=>{ bell(523.25*Math.pow(2,st/12),.07,.5,i*.055); clink(i*.055); });
  bell(523.25*4,.06,.9,run.length*.055); bell(659.25*4,.05,.9,run.length*.055+.02);   // the top chord rings on
  const t=a.currentTime+run.length*.055; const o=a.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(70,t+.25); const g=a.createGain(); g.gain.setValueAtTime(.09,t); g.gain.exponentialRampToValueAtTime(.0001,t+.3); o.connect(g).connect(a.destination); o.start(t); o.stop(t+.32);   // ka-chunk under it
  for(let i=0;i<10;i++) clink(run.length*.055+.08+i*.045+Math.random()*.02); }   // coins spilling into the tray
function ding(){ const now=performance.now()/1000; if(now-ST.last>1.4) ST.n=0; else ST.n++; ST.last=now; ST.dings++;
  const step=LADDER[ST.n%LADDER.length]+12*Math.min(1,Math.floor(ST.n/LADDER.length)); bell(523.25*Math.pow(2,step/12),.075,.42); clink(0); if(ST.n>0&&ST.n%7===6) jackpot(); }
SFX.mana=ding;   // orbs, sold loot, gold from the tavern: all pay out the same way
window.__casino={ding,jackpot,state:()=>({streak:ST.n,dings:ST.dings,jackpots:ST.jackpots})};
})();
