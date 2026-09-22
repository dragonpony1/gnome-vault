import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const SP=process.env.SP; const server=await serve(8833,{csp:true,file:SP+"/verify.html"});
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await browser.newPage({viewport:{width:960,height:600}}); const errs=[]; page.on("pageerror",e=>errs.push(String(e).slice(0,200))); page.on("console",m=>{ if(m.type()==="error") errs.push(m.text().slice(0,200)); });
await page.goto("http://127.0.0.1:8833/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const r=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; localStorage.clear(); M.reset(); localStorage.setItem('ddMeta',JSON.stringify(Object.assign(M.state(),{best:3}))); return 1; });
await page.goto("http://127.0.0.1:8833/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel&&window.__dd.heroModel()&&window.__dd.mobModel("goblin"),null,{timeout:40000});
const t=await page.evaluate(()=>{ const d=window.__dd, M=window.__meta; d.start(); d.step(1/60,2); d.S.wave=3; const best0=M.best(); const shown=M.onRunEnd(3); return {best0,shown,best1:M.best(),h2:document.querySelector('#tv-sum h2').textContent}; });
console.log(JSON.stringify({...t,errs})); await browser.close(); server.close();
