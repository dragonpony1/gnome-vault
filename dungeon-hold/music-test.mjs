import { chromium } from "playwright"; import http from "http"; import fs from "fs";
import { serve } from "./serve.mjs"; const SP=process.env.SP; const server=await serve(8841);
const results=[]; const check=(n,ok,d)=>{ results.push(ok); console.log((ok?"PASS ":"FAIL ")+n+(d?"  -> "+d:"")); };
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]}); const page=await browser.newPage({viewport:{width:960,height:600}}); const errors=[]; page.on("pageerror",e=>errors.push(String(e))); page.on("console",m=>{ if(m.type()==="error"||m.type()==="warning") errors.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8841/"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__mus,null,{timeout:40000});
const s0=await page.evaluate(()=>window.__mus.state());
check("both tracks are embedded, nothing plays on the start screen",s0.tracks.includes("build")&&s0.tracks.includes("wave")&&!s0.playing&&s0.mode==="none",JSON.stringify(s0));
// enter the hall like a player: click the play button (a real gesture), the build theme should decode and start
await page.click("#playbtn"); await page.waitForFunction(()=>window.__mus.state().playing,null,{timeout:15000}).catch(()=>{});
const s1=await page.evaluate(()=>window.__mus.state());
check("hall theme (the uploaded mp3) plays during the build phase",s1.playing&&s1.track==="build"&&s1.mode==="build"&&s1.decoded.includes("build"),JSON.stringify(s1));
check("audio context is running",s1.ctx==="running","ctx "+s1.ctx);
const dur=await page.evaluate(()=>{ const a=window.__dd; return null; });
// wave: the track stops and the procedural battle loop takes over (its step counter advances)
const s2=await page.evaluate(async()=>{ const d=window.__dd; d.startWave(); d.step(1/60,30); await new Promise(r=>setTimeout(r,1500)); return {mus:window.__mus.state(),m:d.music()}; });
check("battle: the combat track takes over (procedural loop silent)",s2.mus.playing&&s2.mus.track==="wave"&&s2.m.mode==="wave"&&s2.m.step===0,JSON.stringify(s2));
// hall held: back to the mp3
const s3=await page.evaluate(async()=>{ const d=window.__dd; for(const e of d.enemies) d.kill(e); d.S.t+=0; for(let i=0;i<1500&&d.S.phase==="wave";i++){ d.step(1/60,1); for(const e of d.enemies) if(!e.dead) d.kill(e); } await new Promise(r=>setTimeout(r,300)); return {phase:d.S.phase,mus:window.__mus.state(),m:d.music()}; });
check("hall held: the mp3 comes back",s3.phase==="build"&&s3.mus.playing&&s3.mus.track==="build",JSON.stringify(s3));
// N toggles it off and on; M (sound off) silences everything
const s4=await page.evaluate(async()=>{ const d=window.__dd; window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyN"})); await new Promise(r=>setTimeout(r,200)); const off=window.__mus.state(); window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyN"})); await new Promise(r=>setTimeout(r,600)); const on=window.__mus.state(); d.mute(); await new Promise(r=>setTimeout(r,200)); const muted=window.__mus.state(); return {off,on,muted}; });
check("N stops and restarts the track",!s4.off.playing&&s4.on.playing&&s4.on.track==="build",JSON.stringify({off:s4.off.playing,on:s4.on.playing}));
check("sound off silences the track",!s4.muted.playing,JSON.stringify(s4.muted));
// the ogre's laugh: fetched as a wav, decoded and played when he arrives
const s5=await page.evaluate(async()=>{ const d=window.__dd; d.setSound?0:0; window.__dd.mute(); document.getElementById("sndbtn").click(); await new Promise(r=>setTimeout(r,300)); for(let i=0;i<150&&!(window.__mus.state().sampleBytes.includes("roar")&&d.mobModel("ogre"));i++) await new Promise(r=>setTimeout(r,100)); const before=window.__mus.state(); const og=d.spawn("ogre","N"); d.step(1/60,2); await new Promise(r=>setTimeout(r,600)); const after=window.__mus.state(); d.kill(og); return {fetched:before.sampleBytes,decoded:after.samples,shout:og.shoutT>0}; });
check("ogre arrival plays the laugh sample",s5.fetched.includes("roar")&&s5.decoded.includes("roar"),JSON.stringify(s5));
const realErrors=errors.filter(e=>!/Failed to load resource|favicon/i.test(e));
check("no page errors",realErrors.length===0,realErrors.slice(0,3).join(" | "));
await browser.close(); server.close(); console.log(results.filter(Boolean).length+"/"+results.length+" passed");
