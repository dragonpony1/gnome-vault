// The page served by the worker, end to end in a browser: passcode, paste a schedule, set the runner's end time,
// publish, the crew's Tonight view, logging an end time, what the runner sees learned, and a photo read (stand-in reader)
import { chromium } from "playwright"; import http from "http"; import worker from "./dist/peeloff-worker.js";
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
class MemKV{ constructor(){ this.m=new Map(); } async get(k){ return this.m.has(k)?this.m.get(k):null; } async put(k,v){ this.m.set(k,String(v)); } async delete(k){ this.m.delete(k); } }
const env={ PEELOFF_KV:new MemKV(), PEELOFF_CODE:"7777", ANTHROPIC_API_KEY:"sk-test" };
let reads=0; globalThis.fetch=async(url,init)=>{ if(/api\.anthropic\.com/.test(String(url))){ reads++; return new Response(JSON.stringify({content:[{type:"text",text:"H | OR 4 | 0800 | 0 | Reed | Lap chole\nH | OR 4 | 1000 | 0 | Reed | Hernia"}],stop_reason:"end_turn"}),{status:200}); } throw new Error("unexpected fetch "+url); };
const server=http.createServer(async(req,res)=>{ const chunks=[]; for await (const c of req) chunks.push(c); const body=Buffer.concat(chunks); const r=await worker.fetch(new Request("http://127.0.0.1:8923"+req.url,{method:req.method,headers:{"Content-Type":req.headers["content-type"]||"text/plain"},body:req.method==="POST"?body:undefined}),env); res.statusCode=r.status; r.headers.forEach((v,k)=>res.setHeader(k,v)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8923);
const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1000,height:900}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("dialog",d=>d.dismiss());
await page.goto("http://127.0.0.1:8923/"); await page.waitForFunction(()=>window.PeelOff);
// the crew side asks for the passcode first
await page.waitForSelector("#ovCode.open"); await page.fill("#codeInput","7777"); await page.click("#btnSaveCode"); await page.waitForFunction(()=>/Nothing posted yet/.test(document.getElementById("tonightTitle").textContent));
check("served by the worker: the page is in server mode and asks for the crew passcode, then shows an empty Tonight",await page.evaluate(()=>typeof window.PEELOFF_API==="string"&&localStorage.getItem("peeloff.code")==="7777"));
// the runner pastes a schedule, sets an end time on the room that decides L1, publishes
await page.click("#btnCrewToBoard"); await page.waitForSelector("#rooms .roomcard");
await page.click("#btnPaste"); await page.fill("#pasteBox","H | OR 1 | 0730 | 0 | Douglas | L TKA\nH | OR 1 | 1030 | 0 | Douglas | R TKA\nH | OR 2 | 0730 | 0 | Anselmo | Bunion\nH | OR 2 | 0900 | 0 | Anselmo | Hammertoe\nNP | NP 1 | 0800 | 0 | Strindberg | Knee scope\nNP | NP 1 | 0930 | 0 | Strindberg | Shoulder scope"); await page.click("#btnParseReplace"); await page.waitForFunction(()=>window.PeelOff.state.rooms.length===3&&!window.PeelOff.state.isSample);
const or2=page.locator("#rooms .roomcard").filter({has:page.locator('input[data-f="label"][value="OR 2"]')}); await or2.locator("input.endAt").fill("1615");
const ranked=await page.evaluate(()=>{ const a=window.PeelOff.assign(); return Object.fromEntries(Object.entries(a.byL).map(([k,u])=>[k,u.rooms[0].label+"@"+u.finish])); });
check("OR 2 ends at 4:15p on the runner's say-so and takes L1",ranked[1]==="OR 2@975",JSON.stringify(ranked));
await page.click("#btnPublish"); await page.waitForSelector("#ovPub.open"); await page.fill('#pubNames [data-nm="1"]',"Matt"); await page.fill('#pubNames [data-nm="2"]',"Taylor"); await page.fill("#pubNote","Reed running behind");
const preview=await page.evaluate(()=>document.getElementById("pubPreview").textContent);
check("the send preview marks the runner's own end time with *",/OR 2.*out 4:15p\*/.test(preview)&&/\* your own end time/.test(preview),preview.split("\n").find(l=>/OR 2/.test(l)));
await page.click("#btnPubConfirm"); await page.waitForFunction(()=>/Sent/.test(document.getElementById("pubNoteMsg").textContent)); await page.waitForFunction(()=>!document.getElementById("crewView").hidden&&document.querySelectorAll("#crewList .crewRow").length>0,null,{timeout:8000});
const stored=JSON.parse(await env.PEELOFF_KV.get("board"));
check("the worker holds the board: OR 2 is L1 for Matt, finish 975 by the runner, with the note",stored.slots[0].room==="OR 2"&&stored.slots[0].who==="Matt"&&stored.slots[0].finish===975&&stored.slots[0].byRunner===true&&stored.slots[0].approx===false&&stored.note==="Reed running behind"&&stored.lastCases.some(x=>x.room==="OR 2"&&x.start===540),JSON.stringify(stored.slots[0]));
// the crew's Tonight page, on a second phone
const crew=await browser.newPage({viewport:{width:420,height:900}}); crew.on("pageerror",e=>errors.push("crew: "+e)); await crew.goto("http://127.0.0.1:8923/"); await crew.waitForSelector("#ovCode.open"); await crew.fill("#codeInput","7777"); await crew.click("#btnSaveCode"); await crew.waitForSelector("#crewList .crewRow");
const seen=await crew.evaluate(()=>{ const items=[...document.querySelectorAll("#crewList .crewItem")]; const it=items.find(x=>/OR 2/.test(x.querySelector(".room").textContent)); return {rows:items.length,small:it.querySelector(".out small").textContent,out:it.querySelector(".out").textContent,note:document.getElementById("runnerNote").textContent,stamp:document.getElementById("tonightStamp").textContent,chips:[...document.querySelectorAll("#mineChips button")].map(b=>b.textContent)}; });
check("a crew phone sees the posted board: 'runner says 4:15p' on OR 2, the note, the names as chips",seen.rows===4&&seen.small==="runner says"&&/4:15p/.test(seen.out)&&!/~/.test(seen.out)&&/Reed running behind/.test(seen.note)&&/Posted/.test(seen.stamp)&&seen.chips.includes("Matt")&&seen.chips.includes("Taylor"),JSON.stringify(seen));
// Matt claims his row and logs when he actually got out; the worker learns from it
await crew.click("#mineChips button:has-text('Matt')"); await crew.waitForSelector("#logRow:not([hidden])"); await crew.fill("#logTime","17:05"); await crew.click("#btnLog"); await crew.waitForFunction(()=>/Logged/.test(document.getElementById("logLbl").textContent));
const learn=JSON.parse(await env.PEELOFF_KV.get("learn"));
check("the logged 5:05p becomes 485 minutes for Anselmo's hammertoe (OR 2's last case started at 9:00a)",learn.recent.length===1&&learn.recent[0].mins===485&&learn.recent[0].room==="OR 2"&&!!learn.keys["anselmo|hammertoe"],JSON.stringify(learn.recent[0]));
// back on the runner's side the past run shows under the room
await page.reload(); await page.waitForFunction(()=>window.PeelOff&&document.querySelector("#rooms .roomcard")); await page.evaluate(()=>window.PeelOff.setView("board")); await page.waitForSelector("#btnPhoto:visible"); await page.waitForFunction(()=>window.PeelOff.state.recent&&window.PeelOff.state.recent.length===1,null,{timeout:8000});
const past=await page.evaluate(()=>{ const c=[...document.querySelectorAll("#rooms .roomcard")].find(x=>x.querySelector('input[data-f="label"]').value==="OR 2"); return c.querySelector(".pastRuns")?c.querySelector(".pastRuns").textContent:null; });
check("the runner sees what that case actually ran last time",/Hammertoe has actually run: 485m/.test(past||""),String(past));
// a photo read through the worker (stand-in reader) merges a new room in
const jpg=Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==","base64");
await page.click("#btnPhoto"); await page.setInputFiles("#fileInput",{name:"sheet.jpg",mimeType:"image/jpeg",buffer:jpg}); await page.waitForSelector("#btnReadPhoto:not([hidden])"); await page.click("#btnReadPhoto"); await page.waitForFunction(()=>/Read 2 cases/.test(document.getElementById("readNote").textContent),null,{timeout:15000});
const merged=await page.evaluate(()=>window.PeelOff.state.rooms.map(r=>r.label+":"+r.cases.length).join(","));
check("Read it for me goes through the worker and merges OR 4 (Reed) onto the board without touching the other rooms",reads===1&&/OR 4:2/.test(merged)&&/OR 2:2/.test(merged)&&/NP 1:2/.test(merged),merged);
check("no page errors",errors.length===0,errors.join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
