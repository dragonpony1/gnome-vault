// ===== PAUSE (Escape): in the hall, Escape — or the mouse leaving pointer lock — opens a small menu over the frozen scene:
// RESUME, or RETURN TO TITLE (which reloads the page; gold, gear, skills and map progress are saved as they happen, the
// run itself is forfeited). Escape while placing still cancels the placement first, and the tavern or the sheet keep
// their own Escape.
(function(){
const css=`#pause{z-index:12;background:#0b0712c8}#pause .pz{background:linear-gradient(#2a1f33f8,#160f1cf8);border:2px solid #6b5a3c;border-radius:12px;box-shadow:0 6px 0 #000,0 0 30px #000a;padding:22px 30px 24px;text-align:center;color:#f1e6d0;min-width:280px}
#pause h1{font-size:28px;letter-spacing:6px;margin:0 0 6px;color:var(--gold,#ffc040);text-shadow:0 2px 0 #000}#pause p{font-size:13px;color:#bfae90;margin:0 0 14px;letter-spacing:1px}
#pause button{display:block;width:100%;margin:8px 0;background:linear-gradient(#7a2a2e,#3e1416);border:2px solid var(--gold,#ffc040);border-radius:8px;color:#fff;font:bold 15px Georgia,serif;letter-spacing:2px;padding:11px 16px;cursor:pointer;box-shadow:0 3px 0 #000}#pause button.quiet{background:#1c1424;border-color:#6b5a3c;color:#f1e6d0}#pause button:hover{filter:brightness(1.15)}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
const P={open:false,el:null,wantLock:false};
function ensure(){ if(P.el) return; const el=document.createElement('div'); el.id='pause'; el.className='screen hide'; el.innerHTML='<div class="pz"><h1>PAUSED</h1><p>the hall holds its breath</p><button data-act="resume">▶ RESUME</button><button class="quiet" data-act="title">⌂ RETURN TO TITLE SCREEN</button><p style="margin:12px 0 0">Esc resumes · gold, gear and skills are already saved</p></div>'; document.body.appendChild(el);
  el.addEventListener('click',e=>{ const a=e.target.closest('[data-act]'); if(!a) return; if(a.dataset.act==='resume') close(true); else if(a.dataset.act==='title') toTitle(); }); P.el=el; }
function canPause(){ return (S.phase==='build'||S.phase==='wave')&&!Meta.isOpen(); }
function open(){ ensure(); if(P.open||!canPause()) return false; P.open=true; P.el.classList.remove('hide'); if(document.pointerLockElement&&document.exitPointerLock) document.exitPointerLock(); document.body.classList.remove('play'); for(const k in K) K[k]=0; return true; }
function close(relock){ if(!P.open) return false; P.open=false; P.el.classList.add('hide'); if(relock&&!TOUCH&&canvas.requestPointerLock){ try{ canvas.requestPointerLock(); }catch(e){} } return true; }
function toTitle(){ P.open=false; location.reload(); }
{ const prev=Meta.isOpen; Meta.isOpen=()=>P.open||!!prev(); }
// Escape (when the browser lets it through) toggles; leaving pointer lock in the middle of play opens it
addEventListener('keydown',e=>{ if(e.code!=='Escape'||e.repeat) return; if(P.open){ e.preventDefault(); e.stopImmediatePropagation(); close(true); return; } if(typeof placing!=='undefined'&&placing) return; if(canPause()){ e.preventDefault(); e.stopImmediatePropagation(); open(); } },true);
document.addEventListener('pointerlockchange',()=>{ if(document.pointerLockElement!==canvas&&!TOUCH&&canPause()&&!(typeof placing!=='undefined'&&placing)) open(); });
window.__pause={open,close,isOpen:()=>P.open,toTitle};
})();
