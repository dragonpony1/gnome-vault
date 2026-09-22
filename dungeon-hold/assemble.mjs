// dungeon.html = parts/head.html + <script> parts/game.js + parts/modules/*.js (sorted) + </script> tail
import fs from "fs"; import path from "path";
const SP=path.dirname(new URL(import.meta.url).pathname); const P=SP+"/parts";
const head=fs.readFileSync(P+"/head.html","utf8"), tail=fs.readFileSync(P+"/tail.html","utf8"); let game=fs.readFileSync(P+"/game.js","utf8");
const modDir=P+"/modules"; let mods=""; const dirs=process.env.NOMODS?[]:[modDir]; if(process.env.EXTRA) dirs.push(process.env.EXTRA); const names=[];
for(const dir of dirs){ if(!fs.existsSync(dir)) continue; for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js")).sort()){ names.push(f); mods+="\n// ===== module: "+f+" =====\n"+fs.readFileSync(dir+"/"+f,"utf8")+"\n"; } }
// modules go in before the test hook so they can extend it; marker is the __dd hook line
const mark="window.__dd={"; const k=game.lastIndexOf(mark); if(k<0) throw new Error("hook marker not found");
const out=head+game.slice(0,k)+mods+game.slice(k)+tail;
let page=out; if(process.env.DIST) page=page.replace("const HAS_ASSETS=/*ASSETS*/false;","const HAS_ASSETS=/*ASSETS*/true;");
// every asset gets a short content stamp; the page appends it as ?v= so a re-exported model is never served from an old cache
if(process.env.DIST){ const crypto=await import("crypto"); const st={}; for(const f of fs.readdirSync(P+"/assets")) st[f]=crypto.createHash("sha1").update(fs.readFileSync(P+"/assets/"+f)).digest("hex").slice(0,8); page=page.replace("const ASSET_STAMPS=/*STAMPS*/{};","const ASSET_STAMPS=/*STAMPS*/"+JSON.stringify(st)+";"); }
// NOEMBED: the big models are not baked into the page; the game fetches them from assets/ instead (see the typeof guards in game.js)
if(process.env.NOEMBED) page=page.replace(/<script>const (SQUIRE|GOBLIN)_GLB_B64="[^"]*";<\/script>\n?/g,"");
let outPath=process.env.OUT||(SP+"/dungeon.html");
// DIST=<dir>: a deployable folder — index.html + assets/ copied from parts/assets
if(process.env.DIST){ const D=process.env.DIST; fs.mkdirSync(D+"/assets",{recursive:true}); for(const f of fs.readdirSync(P+"/assets")){ if(/\.glb$/.test(f)) fs.writeFileSync(D+"/assets/"+f+".txt",fs.readFileSync(P+"/assets/"+f).toString("base64")); else fs.copyFileSync(P+"/assets/"+f,D+"/assets/"+f); } outPath=D+"/index.html"; }
fs.writeFileSync(outPath,page); const out2=page; console.log("assembled",outPath,out2.length,"bytes, modules:",names.join(", ")||"none");
