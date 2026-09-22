import { chromium } from "playwright"; import { serve } from "./serve.mjs";
const server=await serve(8849); const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage(); const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto("http://127.0.0.1:8849/?silent"); await page.waitForFunction(()=>window.__dd&&window.__dd.heroModel(),null,{timeout:60000}); await page.waitForTimeout(5000);
const r=await page.evaluate(()=>{ const d=window.__dd; d.start(); d.step(1/60,30); return {hero:d.heroModel().label,weapons:window.__weapons.state(),line:document.getElementById("buildline").textContent}; });
console.log(JSON.stringify(r)); console.log("fallback ok:", /Meshy\)$/.test(r.hero)&&!r.weapons.mounted&&errs.length===0, "errors:", errs.join(" | ")||"none"); await browser.close(); server.close();
