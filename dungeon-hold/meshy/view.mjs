// node view.mjs <dir> <out.png> "glb=..&clip=..&yaw=..&n=.."   — renders a frame strip of one clip
import { chromium } from "playwright"; import http from "http"; import fs from "fs"; import path from "path";
const [dir,out,query]=process.argv.slice(2); const ROOT=path.resolve(dir); const types={".html":"text/html",".js":"text/javascript",".glb":"model/gltf-binary"};
const server=http.createServer((req,res)=>{ const f=path.join(ROOT,new URL(req.url,"http://x").pathname); if(!fs.existsSync(f)){res.statusCode=404;return res.end();} res.setHeader("content-type",types[path.extname(f)]||"application/octet-stream"); res.end(fs.readFileSync(f)); });
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const port=server.address().port;
const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await browser.newPage(); const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/view.html?${query}`); await page.waitForFunction(()=>window.render);
const r=await page.evaluate(()=>window.render());
fs.writeFileSync(out,Buffer.from(r.png.split(",")[1],"base64"));
console.log(out, JSON.stringify(r.info), "errors:", errs.length?errs.join(" | "):"none");
await browser.close(); server.close();
