import { chromium } from "playwright"; import http from "http"; import fs from "fs";
const SP=process.env.SP; const files={"/":SP+"/dungeon.html","/gnome.glb":SP+"/meshy/gnome.glb"};
const server=http.createServer((req,res)=>{ const p=new URL(req.url,"http://x").pathname; const f=files[p]; if(!f){res.statusCode=404;return res.end();} res.setHeader("content-type",p.endsWith(".glb")?"model/gltf-binary":"text/html; charset=utf-8"); res.end(fs.readFileSync(f)); });
await new Promise(r=>server.listen(8793,"127.0.0.1",r));
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:960,height:600}});
await page.goto("http://127.0.0.1:8793/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),null,{timeout:30000});
await page.evaluate(async()=>{ const d=window.__dd; const buf=await (await fetch("/gnome.glb")).arrayBuffer(); d.loadHeroGLB(buf,"gnome.glb"); await new Promise(r=>setTimeout(r,1500)); d.resetGear(); d.start(); });
const shot=async(name,fn)=>{ await page.evaluate(fn); await page.waitForTimeout(150); await page.screenshot({path:SP+"/meshy/"+name+".png"}); };
// hero on the carpet at z=10 facing the camera; camera 5 units in front at z=5 (crystal shards orbit only out to ~1.7)
await shot("mg-idle",()=>{ const d=window.__dd; d.setHero(0,10,Math.PI); d.setKeys({w:0,s:0,shift:0}); d.setCam(0,.15,5.5); d.cam.x=0; d.cam.y=2.2; d.cam.z=4.5; d.step(1/60,70); });
await shot("mg-attack",()=>{ const d=window.__dd; d.swing(); d.step(1/60,12); });
await shot("mg-run",()=>{ const d=window.__dd; d.step(1/60,40); d.setKeys({s:1,shift:1}); d.step(1/60,14); d.setKeys({s:0,shift:0}); d.setHero(0,10,Math.PI); });
await shot("mg-prims",()=>{ const d=window.__dd; d.step(1/60,20); d.setHero(0,10,Math.PI); d.toggleHero(); d.step(1/60,10); });
await shot("mg-death",()=>{ const d=window.__dd; d.toggleHero(); d.step(1/60,20); d.setHero(0,10,Math.PI); d.hero.hp=1; d.hero.hurtT=99; const e=d.spawn("goblin","N"); e.x=d.hero.x+1.2; e.z=d.hero.z-0.5; let g=0; while(d.hero.dead<=0&&g++<300) d.step(1/60,1); d.step(1/60,45); });
await browser.close(); server.close(); console.log("shots done");
