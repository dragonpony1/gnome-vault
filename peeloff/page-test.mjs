// Peel-Off page, manual mode (no worker): the runner's own end time pins a room's finish, re-ranks, and travels
import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const html=fs.readFileSync(new URL("./peeloff.html",import.meta.url)); const server=http.createServer((q,r)=>{ r.setHeader("content-type","text/html"); r.end(html); }).listen(8921);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1000,height:900}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
await page.goto("http://127.0.0.1:8921/"); await page.waitForFunction(()=>window.PeelOff);
await page.click("#btnCrewToBoard"); await page.waitForSelector("#rooms .roomcard");
const before=await page.evaluate(()=>{ const P=window.PeelOff, S=P.state; const a=P.assign(); const or3=S.rooms.find(r=>r.label==="Endo"); const p=P.project(or3); return {L:Object.fromEntries(Object.entries(a.byL).map(([k,u])=>[k,u.rooms.map(r=>r.label).join("+")])), or3End:p[p.length-1].end, or3Src:p[p.length-1].src, tilde:!!document.querySelector("#rooms .roomcard .slotFinish").textContent.includes("~"), guessInputs:document.querySelectorAll("#rooms input.m.guess").length, ver:document.getElementById("brandVer").textContent}; });
console.log(JSON.stringify(before));
check("sample day loads with guessed last cases (dashed Min boxes), version v3",before.or3Src==="guess"&&before.guessInputs>=4&&/v3/.test(before.ver),JSON.stringify(before));
// type an end time for Endo (its guessed finish is early afternoon): 1700 makes it the latest room → L1
const card=page.locator("#rooms .roomcard").filter({has:page.locator('input[data-f="label"][value="Endo"]')});
await card.locator("input.endAt").fill("17"); const partial=await page.evaluate(()=>{ const P=window.PeelOff; const or3=P.state.rooms.find(r=>r.label==="Endo"); return {endAt:or3.endAt===undefined?null:or3.endAt}; });
check("a half-typed time is ignored",partial.endAt===null,JSON.stringify(partial));
await card.locator("input.endAt").fill("1700");
const after=await page.evaluate(()=>{ const P=window.PeelOff, S=P.state; const a=P.assign(); const or3=S.rooms.find(r=>r.label==="Endo"); const p=P.project(or3); const card=[...document.querySelectorAll("#rooms .roomcard")].find(c=>c.querySelector('input[data-f="label"]').value==="Endo");
  return {endAt:or3.endAt, end:p[p.length-1].end, src:p[p.length-1].src, L1:a.byL[1].rooms.map(r=>r.label).join("+"), line:card.querySelector(".slotFinish").textContent, set:card.querySelector("input.endAt").classList.contains("set"), chip:!!document.querySelector("#peelgrid .chip.call"), laneTilde:[...document.querySelectorAll("#boardinner .lane")].some(l=>l.querySelector(".laneName")&&l.querySelector(".laneName").textContent.startsWith("Endo")&&l.querySelector(".laneFinish").textContent.includes("~")), copy:P.assignmentText(), pub:P.localPublish()}; });
const or3slot=after.pub.slots.find(s=>s.room==="Endo"); const lastCase=or3slot&&or3slot.cases[or3slot.cases.length-1];
check("1700 pins Endo's finish at 5:00p as the runner's call: no ~, 'your call' on the card, a Your call chip, Endo becomes L1",after.endAt===1020&&after.end===1020&&after.src==="runner"&&after.L1==="Endo"&&/5:00p · your call/.test(after.line)&&after.set&&after.chip&&!after.laneTilde,JSON.stringify({endAt:after.endAt,end:after.end,src:after.src,L1:after.L1,line:after.line,chip:after.chip}));
check("the copy text and the published board carry it (* mark, byRunner, last case set, not approx)",/Endo.*out 5:00p\*/.test(after.copy)&&/\* the board runner's own end time/.test(after.copy)&&or3slot&&or3slot.byRunner===true&&or3slot.approx===false&&or3slot.finish===1020&&lastCase&&lastCase.set===true&&lastCase.approx===false&&lastCase.end===1020,(after.copy.split("\n").find(l=>/Endo/.test(l))||"")+" | "+JSON.stringify(or3slot&&{byRunner:or3slot.byRunner,approx:or3slot.approx,finish:or3slot.finish}));
// an end before the last case's start can't end the room before it begins
await card.locator("input.endAt").fill("0600");
const early=await page.evaluate(()=>{ const P=window.PeelOff; const or3=P.state.rooms.find(r=>r.label==="Endo"); const p=P.project(or3); return {start:p[p.length-1].start,end:p[p.length-1].end}; });
check("an end time before the last case's start is held to just after it",early.end===early.start+5,JSON.stringify(early));
// clear it → back to the guess; survives a reload while set
await card.locator("input.endAt").fill(""); const cleared=await page.evaluate(()=>{ const P=window.PeelOff; const or3=P.state.rooms.find(r=>r.label==="Endo"); const p=P.project(or3); return {endAt:or3.endAt,src:p[p.length-1].src}; });
check("clearing the box goes back to the guess",cleared.endAt===null&&cleared.src==="guess",JSON.stringify(cleared));
await card.locator("input.endAt").fill("1530"); await page.waitForTimeout(100); await page.reload(); await page.waitForFunction(()=>window.PeelOff&&document.querySelector("#rooms .roomcard"));
const kept=await page.evaluate(()=>{ const P=window.PeelOff; const or3=P.state.rooms.find(r=>r.label==="Endo"); const card=[...document.querySelectorAll("#rooms .roomcard")].find(c=>c.querySelector('input[data-f="label"]').value==="Endo"); return {endAt:or3.endAt,box:card.querySelector("input.endAt").value,set:card.querySelector("input.endAt").classList.contains("set")}; });
check("the end time is saved with the board and comes back after a reload",kept.endAt===930&&kept.box==="1530"&&kept.set,JSON.stringify(kept));
// the crew side, offline copy: "runner says" and the case-list footer
await page.evaluate(()=>window.PeelOff.setView("crew")); await page.waitForSelector("#crewList .crewRow");
const crew=await page.evaluate(()=>{ const rows=[...document.querySelectorAll("#crewList .crewItem")]; const it=rows.find(r=>/Endo/.test(r.querySelector(".room").textContent)); return {small:it&&it.querySelector(".out small").textContent, out:it&&it.querySelector(".out").textContent, foot:it&&it.querySelector(".caseFoot")&&it.querySelector(".caseFoot").textContent}; });
check("the crew see 'runner says 3:30p' and the case list says it's the runner's call",crew.small==="runner says"&&/3:30p/.test(crew.out)&&!/~/.test(crew.out)&&/runner's own call/.test(crew.foot||""),JSON.stringify(crew));
await page.evaluate(()=>window.PeelOff.setView("board")); await page.waitForSelector("#rooms .roomcard"); await page.screenshot({path:"page-editor.png",fullPage:true});
check("no page errors",errors.length===0,errors.join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
