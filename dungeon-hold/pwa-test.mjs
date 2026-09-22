import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.ROOT || (process.env.SP + "/pages");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".webmanifest":"application/manifest+json", ".png":"image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.statusCode = 404; return res.end("nope"); }
  res.setHeader("content-type", types[path.extname(f)] || "application/octet-stream");
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(8772, "127.0.0.1", r));
const URL0 = "http://127.0.0.1:8772/";
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  -> " + d : "")); };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
const page = await context.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(URL0);
await page.waitForSelector("#setupScreen:not(.hidden)");
const man = await page.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=manifest]').href); return { status: r.status, type: r.headers.get("content-type"), json: await r.json() }; });
check("manifest served and valid", man.status === 200 && man.json.display === "standalone" && man.json.icons.length === 2, JSON.stringify(man));
for (const ic of ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
  const st = await page.evaluate(async (u) => (await fetch(u)).status, ic);
  check("icon " + ic + " served", st === 200, String(st));
}
const head = await page.evaluate(() => ({ title: document.title, capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content, manifestInHead: !!document.head.querySelector('link[rel=manifest]'), touch: !!document.head.querySelector('link[rel=apple-touch-icon]') }));
check("install metadata lives in <head>", head.title === "Gnome Vault" && head.capable === "yes" && head.manifestInHead && head.touch, JSON.stringify(head));
const swState = await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await new Promise(r => setTimeout(r, 500)); return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller }; });
check("service worker registered", swState.scope === URL0, JSON.stringify(swState));
// make a vault so there is state to survive, then go offline and reload
await page.fill("#setupPw1", "1234"); await page.fill("#setupPw2", "1234"); await page.click("#setupBtn");
await page.waitForSelector("#appScreen:not(.hidden)");
await page.reload(); await page.waitForSelector("#lockScreen:not(.hidden)");
await context.setOffline(true);
let offlineOk = false;
try { await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("#lockScreen:not(.hidden)", { timeout: 5000 }); offlineOk = true; } catch (e) { offlineOk = false; }
const foot = offlineOk ? await page.textContent(".foot") : "";
check("opens offline from cache, vault still there", offlineOk && /^Gnome Vault v2\.\d+$/.test(foot), foot);
await context.setOffline(false);
check("no page errors", errors.length === 0, errors.join(" | "));
await browser.close(); server.close();
const failed = results.filter(x => !x).length;
console.log(`${results.length - failed}/${results.length} PWA checks passed`);
process.exit(failed ? 1 : 0);
