import { chromium } from "playwright"; import http from "http"; import fs from "fs"; import path from "path";
const ROOT=process.cwd(); const types={".html":"text/html",".js":"text/javascript",".glb":"model/gltf-binary"};
const server=http.createServer((req,res)=>{ const f=path.join(ROOT,new URL(req.url,"http://x").pathname); if(!fs.existsSync(f)){res.statusCode=404;return res.end();} res.setHeader("content-type",types[path.extname(f)]||"application/octet-stream"); res.end(fs.readFileSync(f)); });
await new Promise(r=>server.listen(8876,"127.0.0.1",r)); const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}); const page=await browser.newPage();
await page.goto("http://127.0.0.1:8876/boneprobe.html"); await page.waitForFunction(()=>window.probe); const r=await page.evaluate(()=>window.probe()); console.log(JSON.stringify(r)); await browser.close(); server.close();
