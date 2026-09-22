// node merge-static.mjs <out.glb> "in=ballista/t1.glb&yaw=90&tex=512"   (run from the meshy dir)
import { chromium } from "playwright"; import http from "http"; import fs from "fs"; import path from "path";
const [out,query]=process.argv.slice(2); const ROOT=process.cwd(); const types={".html":"text/html",".js":"text/javascript",".glb":"model/gltf-binary"};
const server=http.createServer((req,res)=>{ const f=path.join(ROOT,new URL(req.url,"http://x").pathname); if(!fs.existsSync(f)){res.statusCode=404;return res.end();} res.setHeader("content-type",types[path.extname(f)]||"application/octet-stream"); res.end(fs.readFileSync(f)); });
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const port=server.address().port;
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage(); const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/merge-static.html?${query}`); await page.waitForFunction(()=>window.build);
const r=await page.evaluate(()=>window.build()); fs.writeFileSync(out,Buffer.from(r.b64,"base64")); delete r.b64;
console.log(out,(fs.statSync(out).size/1e6).toFixed(2)+" MB",JSON.stringify(r),"errors:",errs.length?errs.join(" | "):"none");
await browser.close(); server.close();
