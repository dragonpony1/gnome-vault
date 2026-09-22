// Builds the Peel-Off worker: stamps the page's version line, bakes the page into the worker,
// and writes dist/peeloff-worker.js (paste into Cloudflare) and dist/index.html (the page alone).
import fs from "fs";
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const d=new Date();
const stamp=process.env.STAMP||("v3 · "+MON[d.getMonth()]+" "+d.getDate());
const html=fs.readFileSync(new URL("./peeloff.html",import.meta.url),"utf8");
if(!/var APP_VERSION = "[^"]*";/.test(html)) throw new Error("no APP_VERSION line in the page");
const page=html.replace(/var APP_VERSION = "[^"]*";/,()=>'var APP_VERSION = '+JSON.stringify(stamp)+';');
const src=fs.readFileSync(new URL("./worker/peeloff-worker.src.js",import.meta.url),"utf8");
const out=src.replace("__PAGE__",()=>JSON.stringify(page)).replace("__VERSION__",()=>JSON.stringify(stamp));
fs.mkdirSync(new URL("./dist/",import.meta.url),{recursive:true});
fs.writeFileSync(new URL("./dist/peeloff-worker.js",import.meta.url),out);
fs.writeFileSync(new URL("./dist/index.html",import.meta.url),page);
console.log("built "+stamp+": dist/peeloff-worker.js "+out.length+" bytes, dist/index.html "+page.length+" bytes");
