// test helper: serve a single html file (FILE) or a dist folder (DIST, index.html + assets/) on a port
import http from "http"; import fs from "fs"; import path from "path";
const TYPES={".html":"text/html; charset=utf-8",".js":"text/javascript",".glb":"model/gltf-binary",".mp3":"audio/mpeg",".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};
export async function serve(port,opts){ opts=opts||{}; const dist=opts.dist||process.env.DIST; const file=opts.file||process.env.FILE||(process.env.SP+"/dungeon.html");
  const csp=opts.csp||process.env.CSP; const server=http.createServer((req,res)=>{ let p=decodeURIComponent(new URL(req.url,"http://x").pathname); if(p==="/") p="/index.html";
    if(csp) res.setHeader("Content-Security-Policy",typeof csp==="string"&&csp!=="1"?csp:"default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self'; connect-src 'self'; media-src 'self'");
    if(dist){ const f=path.join(dist,p); if(!f.startsWith(path.resolve(dist))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.statusCode=404; return res.end("not found "+p); } res.setHeader("content-type",TYPES[path.extname(f)]||"application/octet-stream"); return res.end(fs.readFileSync(f)); }
    if(p!=="/index.html"){ res.statusCode=404; return res.end("not found "+p); } res.setHeader("content-type",TYPES[".html"]); res.end(fs.readFileSync(file)); });
  await new Promise(r=>server.listen(port,"127.0.0.1",r)); return server; }
