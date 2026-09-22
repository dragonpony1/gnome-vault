import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const server=await serve(8852); const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage(); const logs=[]; page.on("console",m=>{ if(m.type()!=="log") logs.push(m.type()+": "+m.text().slice(0,300)); }); page.on("pageerror",e=>logs.push("PAGEERROR "+e.message+"\n"+String(e.stack).slice(0,400)));
await page.goto("http://127.0.0.1:8852/?silent"); await page.waitForTimeout(8000);
const r=await page.evaluate(()=>({dd:!!window.__dd,hero:window.__dd&&window.__dd.heroModel&&window.__dd.heroModel(),line:document.getElementById("buildline")&&document.getElementById("buildline").textContent}));
console.log(JSON.stringify(r)); console.log(logs.slice(0,6).join("\n")||"no console noise"); await browser.close(); server.close();
