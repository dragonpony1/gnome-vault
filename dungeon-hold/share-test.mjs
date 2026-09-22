import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = "/home/user/gnome-vault";
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".webmanifest":"application/manifest+json", ".png":"image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.statusCode = 404; return res.end("nope"); }
  res.setHeader("content-type", types[path.extname(f)] || "application/octet-stream"); res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(8773, "127.0.0.1", r));
const URL0 = "http://127.0.0.1:8773/";
const results = []; const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  -> " + d : "")); };
const browser = await chromium.launch();
async function fresh(shareStub){
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, permissions: ["clipboard-read","clipboard-write"], acceptDownloads: true });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  if (shareStub) await context.addInitScript(() => {
    window.__shares = []; window.__canFiles = true;
    navigator.share = async d => { window.__shares.push({ title: d.title, text: d.text, files: (d.files||[]).map(f => ({ name: f.name, type: f.type })) }); };
    navigator.canShare = d => !!(d && d.files && d.files.length) && window.__canFiles;
  });
  const page = await context.newPage(); const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await page.goto(URL0); await page.waitForSelector("#setupScreen:not(.hidden)");
  await page.fill("#setupPw1", "1234"); await page.fill("#setupPw2", "1234"); await page.click("#setupBtn");
  await page.waitForSelector("#appScreen:not(.hidden)");
  return { context, page, errors };
}
async function addCard(page, withPhoto, site){
  await page.click("#addBtn"); await page.fill("#fSite", site); await page.fill("#fUser", "u@x.com"); await page.fill("#fPass", "pw1");
  if (withPhoto){
    const b64 = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 80; c.height = 60; c.getContext("2d").fillRect(0,0,80,60); return c.toDataURL("image/png").split(",")[1]; });
    await page.setInputFiles("#fPhotoFile", { name: "p.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") });
    await page.waitForSelector("#fPhotoPreview:not(.hidden)");
  }
  await page.click("#saveBtn"); await page.waitForSelector("#editOverlay", { state: "hidden" });
  await page.waitForFunction(() => !document.getElementById("toast").classList.contains("show"), null, { timeout: 5000 });
}
const shares = p => p.evaluate(() => window.__shares);
const lastToast = p => p.textContent("#toast");
// ---- with a share sheet ----
{
  const { page, context, errors } = await fresh(true);
  await addCard(page, false, "Plain"); await addCard(page, true, "Photo card");
  const card = site => page.locator(".entry", { hasText: site });
  await card("Plain").locator('[data-act="share"]').click(); await page.waitForTimeout(150);
  let s = await shares(page);
  check("card without photo shares straight away, text only", s.length === 1 && s[0].text.startsWith("Plain\n") && s[0].files.length === 0, JSON.stringify(s));
  check("no chooser for a card without a photo", await page.evaluate(() => document.getElementById("shareOverlay").classList.contains("hidden")));
  await card("Photo card").locator('[data-act="share"]').click();
  check("chooser opens for a card with a photo", await page.evaluate(() => !document.getElementById("shareOverlay").classList.contains("hidden")));
  await page.click("#shareBothBtn"); await page.waitForTimeout(150); s = await shares(page);
  check("Details and photo: text + jpg file", s.length === 2 && s[1].text.startsWith("Photo card\n") && s[1].files.length === 1 && s[1].files[0].name === "Photo_card.jpg", JSON.stringify(s[1]));
  check("chooser closed after choosing", await page.evaluate(() => document.getElementById("shareOverlay").classList.contains("hidden")));
  check("toast says photo went", (await lastToast(page)) === "Sent with the photo", await lastToast(page));
  await card("Photo card").locator('[data-act="share"]').click(); await page.click("#shareTextBtn"); await page.waitForTimeout(150); s = await shares(page);
  check("Details only: text, no file", s.length === 3 && s[2].text.startsWith("Photo card\n") && s[2].files.length === 0, JSON.stringify(s[2]));
  await card("Photo card").locator('[data-act="share"]').click(); await page.click("#sharePhotoBtn"); await page.waitForTimeout(150); s = await shares(page);
  check("Photo only: file, no text or title", s.length === 4 && s[3].text === undefined && s[3].title === undefined && s[3].files.length === 1, JSON.stringify(s[3]));
  check("toast says photo sent", (await lastToast(page)) === "Photo sent", await lastToast(page));
  await card("Photo card").locator('[data-act="share"]').click(); await page.click("#shareCancelBtn"); await page.waitForTimeout(100); s = await shares(page);
  check("Cancel shares nothing and closes", s.length === 4 && await page.evaluate(() => document.getElementById("shareOverlay").classList.contains("hidden")));
  // a phone whose share sheet refuses files
  await page.evaluate(() => { window.__canFiles = false; });
  await card("Photo card").locator('[data-act="share"]').click(); await page.click("#shareBothBtn"); await page.waitForTimeout(150); s = await shares(page);
  check("Both, but files unsupported: text goes, honest toast", s.length === 5 && s[4].files.length === 0 && (await lastToast(page)) === "Sent the details — this phone won't attach photos here", await lastToast(page));
  check("no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}
// ---- no share sheet (desktop): photo becomes a download ----
{
  const { page, context, errors } = await fresh(false);
  await addCard(page, true, "Photo card");
  await page.locator(".entry", { hasText: "Photo card" }).locator('[data-act="share"]').click();
  const [dl] = await Promise.all([ page.waitForEvent("download", { timeout: 5000 }), page.click("#sharePhotoBtn") ]);
  check("desktop Photo only: downloads the jpg", dl.suggestedFilename() === "Photo_card.jpg", dl.suggestedFilename());
  await page.waitForSelector("#toast.show");
  check("desktop toast", (await lastToast(page)) === "Photo saved to your downloads", await lastToast(page));
  await page.locator(".entry", { hasText: "Photo card" }).locator('[data-act="share"]').click();
  const [dl2] = await Promise.all([ page.waitForEvent("download", { timeout: 5000 }), page.click("#shareBothBtn") ]);
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("desktop Both: clipboard has details and jpg downloads", clip.startsWith("Photo card\n") && dl2.suggestedFilename() === "Photo_card.jpg", clip.split("\n")[0]);
  check("no page errors (desktop)", errors.length === 0, errors.join(" | "));
  await context.close();
}
await browser.close(); server.close();
const failed = results.filter(x => !x).length; console.log(`${results.length - failed}/${results.length} share checks passed`); process.exit(failed ? 1 : 0);
