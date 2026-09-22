// The worker on its own: every endpoint, with an in-memory KV and a stand-in for the reader
import worker from "./dist/peeloff-worker.js";
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
class MemKV{ constructor(){ this.m=new Map(); } async get(k){ return this.m.has(k)?this.m.get(k):null; } async put(k,v){ this.m.set(k,String(v)); } async delete(k){ this.m.delete(k); } }
const kv=new MemKV(); const env={ MY_BOARD_STORE:kv, PEELOFF_CODE:"1234", ANTHROPIC_API_KEY:"sk-test" };
let lastApi=null; globalThis.fetch=async(url,init)=>{ lastApi={url:String(url),init}; const b=JSON.parse(init.body); if(!b.messages[0].content.some(c=>c.type==="image")) return new Response("{}",{status:400});
  return new Response(JSON.stringify({content:[{type:"text",text:"```\nH | OR 1 | 0730 | 0 | Douglas | L TKA\nH | OR 1 | 1000 | 0 | Douglas | R TKA\nNP | NP 1 | 0715 | 0 | Strindberg | Knee scope\n```"}],stop_reason:"end_turn"}),{status:200}); };
const call=async(path,body,method="POST")=>{ const r=await worker.fetch(new Request("https://peel.example.workers.dev"+path,{method,headers:{"Content-Type":"application/json"},body:method==="POST"?JSON.stringify(body):undefined}),env); let j=null; const t=await r.text(); try{ j=JSON.parse(t); }catch(e){ j=t; } return {s:r.status,j,h:r.headers}; };
// the page
const pg=await call("/",null,"GET");
check("GET / serves the page with the API pointed at this worker, uncached",pg.s===200&&/window\.PEELOFF_API="https:\/\/peel\.example\.workers\.dev\/read"/.test(pg.j)&&/<title>Peel-Off/.test(pg.j)&&/APP_VERSION = "v3/.test(pg.j)&&pg.h.get("cache-control")==="no-store",String(pg.j).slice(0,120).replace(/\n/g," "));
const hl=await call("/health",null,"GET"); check("/health reports the bindings it found",hl.s===200&&hl.j.store===true&&hl.j.reader===true&&hl.j.code===true&&/v3/.test(hl.j.version),JSON.stringify(hl.j));
// the passcode
const nc=await call("/board",{}); const wc=await call("/board",{code:"9999"}); const ok=await call("/board",{code:"1234"});
check("no code or a wrong code → 401; the right one → the board (nothing posted yet)",nc.s===401&&wc.s===401&&ok.s===200&&ok.j.board===null,JSON.stringify([nc.s,wc.s,ok.j]));
const nokey=await worker.fetch(new Request("https://x/board",{method:"POST",body:JSON.stringify({code:"1234"})}),{MY:kv}); check("a worker with no passcode secret says so",nokey.status===500&&/PEELOFF_CODE/.test(await nokey.text()));
// publish → board
const board={postedAt:1,forDate:"2026-09-23",crnas:4,turnover:25,padPct:0,note:"OR 2 may run late",slots:[{L:1,room:"OR 1",site:"H",finish:1020,approx:false,byRunner:true,cases:[{room:"OR 1",start:450,end:1020,set:true,approx:false,proc:"R TKA",surgeon:"Douglas"}]},{L:2,room:"NP 1",site:"NP",finish:700,approx:true},{L:3,room:null},{L:4,room:null}],uncovered:[],lastCases:[{room:"OR 1",start:600,surgeon:"Douglas",proc:"R TKA"},{room:"NP 1",start:570,surgeon:"Strindberg",proc:"Hardware removal"}]};
const pub=await call("/publish",{code:"1234",board}); const got=await call("/board",{code:"1234"});
check("/publish stores the board with the server's own timestamp; /board hands it back",pub.s===200&&pub.j.ok&&got.j.board.postedAt>1e12&&got.j.board.forDate==="2026-09-23"&&got.j.board.slots.length===4&&got.j.board.slots[0].byRunner===true&&got.j.board.note==="OR 2 may run late"&&got.j.board.lastCases.length===2,JSON.stringify({postedAt:got.j.board.postedAt,slots:got.j.board.slots.length}));
const badpub=await call("/publish",{code:"1234",board:{slots:[]}}); check("an empty board is refused",badpub.s===400,JSON.stringify(badpub.j));
// actual → learned
const a1=await call("/actual",{code:"1234",room:"OR 1",endedAt:960,day:"2026-09-23"}); const l1=await call("/learned",{code:"1234"});
check("logging an end time turns into minutes for that room's last case, keyed by surgeon|proc and |proc",a1.s===200&&a1.j.mins===360&&l1.j.byProc["douglas|tka"]&&l1.j.byProc["douglas|tka"].n===1&&l1.j.byProc["douglas|tka"].median===360&&l1.j.byProc["|tka"].median===360&&l1.j.recent.length===1&&l1.j.recent[0].room==="OR 1",JSON.stringify({a1:a1.j,keys:Object.keys(l1.j.byProc)}));
const a2=await call("/actual",{code:"1234",room:"OR 1",endedAt:990,day:"2026-09-23"}); const l2=await call("/learned",{code:"1234"});
check("logging the same room again that day corrects the entry instead of doubling it",a2.j.replaced===true&&l2.j.byProc["|tka"].n===1&&l2.j.byProc["|tka"].median===390&&l2.j.recent.length===1,JSON.stringify(l2.j.byProc["|tka"]));
await call("/actual",{code:"1234",room:"OR 1",endedAt:930,day:"2026-09-24"}); const l3=await call("/learned",{code:"1234"});
check("a second day makes n=2 (the page starts using it) with the median of both",l3.j.byProc["|tka"].n===2&&l3.j.byProc["|tka"].median===360,JSON.stringify(l3.j.byProc["|tka"]));
const a4=await call("/actual",{code:"1234",room:"OR 9",endedAt:900}); const a5=await call("/actual",{code:"1234",room:"OR 1",endedAt:500}); check("a room not on the board, or an end before the case began, is refused",a4.s===400&&a5.s===400,JSON.stringify([a4.j,a5.j]));
// calendar and schedule pictures
const png="data:image/png;base64,"+Buffer.from("fakepng").toString("base64"); const jpg="data:image/jpeg;base64,"+Buffer.from("fakejpg").toString("base64");
const c0=await call("/calendar",{code:"1234",kind:"cal",meta:true}); const c1=await call("/calendar",{code:"1234",image:png}); const c2=await call("/calendar",{code:"1234",kind:"cal",meta:true}); const c3=await call("/calendar",{code:"1234"});
check("the calendar: nothing → post one → meta says has+postedAt → fetch returns it (image and images)",c0.j.has===false&&c1.s===200&&c2.j.has===true&&c2.j.postedAt>1e12&&c3.j.image===png&&c3.j.images.length===1,JSON.stringify([c0.j,c2.j.has]));
const s1=await call("/calendar",{code:"1234",kind:"sched",images:[jpg,png]}); const s2=await call("/calendar",{code:"1234",kind:"sched"}); const c4=await call("/calendar",{code:"1234",kind:"cal"});
check("two schedule sheets post under their own key without touching the calendar",s1.s===200&&s2.j.images.length===2&&s2.j.images[1]===png&&c4.j.images.length===1,JSON.stringify([s2.j.images.length,c4.j.images.length]));
const rm=await call("/calendar",{code:"1234",kind:"cal",remove:true}); const c5=await call("/calendar",{code:"1234",kind:"cal",meta:true}); const s3=await call("/calendar",{code:"1234",kind:"sched",meta:true});
check("taking the calendar down leaves the schedule sheets up",rm.s===200&&c5.j.has===false&&s3.j.has===true,JSON.stringify([c5.j,s3.j.has]));
const badpic=await call("/calendar",{code:"1234",image:"data:text/html;base64,AAAA"}); check("a non-image is refused",badpic.s===400,JSON.stringify(badpic.j));
// reading a photo
const rd=await call("/read",{code:"1234",image:jpg,roomsH:"OR 1, OR 2, Endo",roomsNP:"NP 1, NP 2"}); const sent=JSON.parse(lastApi.init.body);
check("/read sends the photo and the room lists to claude-opus-5 with adaptive thinking and default fallbacks, and returns the lines with code fences stripped",rd.s===200&&/^H \| OR 1 \| 0730/.test(rd.j.lines)&&rd.j.lines.split("\n").length===3&&sent.model==="claude-opus-5"&&sent.thinking.type==="adaptive"&&sent.fallbacks==="default"&&lastApi.init.headers["anthropic-beta"]==="server-side-fallback-2026-07-01"&&lastApi.init.headers["x-api-key"]==="sk-test"&&sent.messages[0].content[0].source.media_type==="image/jpeg"&&/OR 1, OR 2, Endo/.test(sent.messages[0].content[1].text)&&/SITE \| ROOM \| START \| MINUTES \| SURGEON \| PROCEDURE/.test(sent.messages[0].content[1].text),JSON.stringify({lines:rd.j.lines.split("\n")[0],model:sent.model}));
const rdbad=await call("/read",{code:"1234",image:"nope"}); check("/read without a proper photo is refused",rdbad.s===400,JSON.stringify(rdbad.j));
globalThis.fetch=async()=>new Response(JSON.stringify({content:[],stop_reason:"refusal",stop_details:{type:"refusal",category:"cyber"}}),{status:200});
const rdref=await call("/read",{code:"1234",image:jpg}); check("a refusal comes back as a plain error, not a crash",rdref.s===502&&/declined/.test(rdref.j.error),JSON.stringify(rdref.j));
globalThis.fetch=async()=>{ throw new Error("net"); }; const rdnet=await call("/read",{code:"1234",image:jpg}); check("a network failure to the reader is a 502 with a human message",rdnet.s===502&&/reach/.test(rdnet.j.error),JSON.stringify(rdnet.j));
const opt=await worker.fetch(new Request("https://x/board",{method:"OPTIONS"}),env); check("OPTIONS answers CORS preflight",opt.status===204&&opt.headers.get("access-control-allow-origin")==="*");
console.log(results.filter(Boolean).length+"/"+results.length+" passed");
