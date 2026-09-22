import { serve } from "./serve.mjs";
import { chromium } from "playwright";
import http from "http"; import fs from "fs";
const html = fs.readFileSync(process.env.SP + "/dungeon.html");
const server = await serve(8780);
const URL0 = "http://127.0.0.1:8780/?silent";
const results = []; const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  -> " + d : "")); };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 960, height: 600 } });
const page = await context.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(URL0);
await page.waitForFunction(() => window.__dd && window.__dd.S && window.__dd.heroModel && window.__dd.heroModel(), null, { timeout: 30000 });
const gl = await page.evaluate(() => !!window.__dd.r.getContext());
check("WebGL renderer up", gl);
check("no errors on load", errors.length === 0, errors.join(" | "));
// --- start with an empty bag and no gear, drop a legendary weapon on the hero: it goes to the bag (10-meta.js), nothing auto-equips ---
await page.evaluate(() => { window.__dd.Meta.reset(); window.__dd.resetGear(); window.__dd.start(); });
const g0 = await page.evaluate(() => ({ gear: window.__dd.gear(), bag: window.__dd.Meta.bag().length }));
check("fresh run: no gear, empty bag", !g0.gear.weapon && !g0.gear.armor && !g0.gear.charm && g0.bag === 0, JSON.stringify(g0));
const it = await page.evaluate(() => { const d = window.__dd; const base0 = d.heroDmg(); const it = d.rollItem(4, "weapon"); d.dropLoot(it, d.hero.x, d.hero.z); d.step(1/60, 120); return { it, base0, gear: d.gear(), dmg: d.heroDmg(), loot: d.loot.length, mana: d.S.mana, bag: d.Meta.bag().map(b => b.id), toast: document.getElementById("toast").textContent, hud: document.getElementById("gear").textContent }; });
check("legendary weapon rolled with 3 stats", it.it.rarity === 4 && Object.keys(it.it.stats).length === 3, JSON.stringify(it.it));
check("walked over it: bagged, floor loot gone, gear untouched", it.bag.length === 1 && it.bag[0] === it.it.id && it.loot === 0 && !it.gear.weapon, JSON.stringify({ bag: it.bag, weapon: it.gear.weapon }));
check("hero damage unchanged until it is equipped", it.dmg === it.base0, JSON.stringify({ base0: it.base0, dmg: it.dmg }));
check("toast names it as bagged", it.toast.includes(it.it.name) && it.toast.includes("bagged"), it.toast);
// --- equipping it from the bag (Meta.equip) raises hero damage and shows in the gear panel ---
const eq = await page.evaluate(id => { const d = window.__dd; const base0 = d.heroDmg(); const ok = d.Meta.equip(id); d.step(1/60, 2); return { ok, base0, dmg: d.heroDmg(), weapon: d.gear().weapon, bag: d.Meta.bag().length, hud: document.getElementById("gear").textContent }; }, it.it.id);
check("Meta.equip moves it from the bag to the weapon slot", eq.ok && eq.weapon && eq.weapon.id === it.it.id && eq.bag === 0, JSON.stringify(eq.weapon));
check("hero damage went up by the weapon's bonus (scaled to the swing length)", eq.dmg > eq.base0 && Math.abs(eq.dmg - (8 + it.it.stats.dmg) * eq.base0 / 8) <= 1, JSON.stringify({ base0: eq.base0, dmg: eq.dmg, bonus: it.it.stats.dmg }));
check("gear panel shows it", eq.hud.includes(it.it.name), eq.hud);
// --- a worse weapon is bagged too (not sold), the worn one stays ---
const worse = await page.evaluate(() => { const d = window.__dd; const before = d.S.mana, gold0 = d.Meta.gold(); const it = d.rollItem(0, "weapon"); it.score = 0.1; d.dropLoot(it, d.hero.x, d.hero.z); d.step(1/60, 120); return { manaGain: d.S.mana - before, goldGain: d.Meta.gold() - gold0, weapon: d.gear().weapon.name, bag: d.Meta.bag().map(b => b.id), id: it.id, toast: document.getElementById("toast").textContent }; });
check("worse item goes to the bag, gear kept, nothing sold", worse.bag.length === 1 && worse.bag[0] === worse.id && worse.weapon === it.it.name && worse.manaGain === 0 && worse.goldGain === 0 && worse.toast.includes("bagged"), JSON.stringify(worse));
// --- armor raises max hp, charm raises defense damage (once equipped from the bag) ---
const ac = await page.evaluate(() => { const d = window.__dd; const a = d.rollItem(3, "armor"); const c = d.rollItem(3, "charm"); d.dropLoot(a, d.hero.x, d.hero.z); d.step(1/60, 90); d.dropLoot(c, d.hero.x, d.hero.z); d.step(1/60, 90); const bagged = d.Meta.bag().length; d.Meta.equip(a.id); d.Meta.equip(c.id); return { bagged, max: d.hero.max, hp: a.stats.hp, tow: d.heroStat("tow"), towC: c.stats.tow, bag: d.Meta.bag().length }; });
check("armor and charm were bagged, then equipped", ac.bagged === 3 && ac.bag === 1, JSON.stringify(ac));
check("armor raised max hp", ac.max >= 100 + ac.hp && ac.hp > 0, JSON.stringify(ac));
check("charm counted for defenses", ac.tow >= ac.towC && ac.towC > 0, JSON.stringify(ac));
// --- persistence across a reload: worn gear (ddGear) and the bag (ddMeta) ---
const wname = it.it.name;
await page.reload(); await page.waitForFunction(() => window.__dd && window.__dd.S && window.__dd.heroModel && window.__dd.heroModel(), null, { timeout: 30000 });
const persisted = await page.evaluate(() => { const g = window.__dd.gear(); return { w: g.weapon && g.weapon.name, a: !!g.armor, c: !!g.charm, max: window.__dd.hero.max, hp: window.__dd.hero.hp, bag: window.__dd.Meta.bag().length }; });
check("gear survives a reload, hero starts at full new max", persisted.w === wname && persisted.a && persisted.c && persisted.max > 100 && persisted.hp === persisted.max, JSON.stringify(persisted));
check("bag survives a reload", persisted.bag === 1, String(persisted.bag));
// --- drop rates from kills ---
const rate = await page.evaluate(() => { const d = window.__dd; d.start(); let drops = 0; for (let i = 0; i < 300; i++) { const e = d.spawn("goblin", "N"); const before = d.loot.length; d.kill(e); drops += d.loot.length - before; d.step(1/60, 1); } const ogreDrops = (() => { const e = d.spawn("ogre", "N"); const b = d.loot.length; d.kill(e); return d.loot.length - b; })(); const rar = d.loot.map(l => l.it.rarity); return { drops, ogreDrops, n: d.loot.length, maxR: Math.max(...rar), minROgre: d.loot[d.loot.length - 1].it.rarity }; });
check("goblins drop loot around 5% of the time", rate.drops >= 5 && rate.drops <= 32, rate.drops + " of 300");
check("ogre always drops, at least uncommon early on", rate.ogreDrops >= 1 && rate.minROgre >= 1, JSON.stringify(rate));
// --- wave reward by the crystal ---
const wave = await page.evaluate(() => { const d = window.__dd; d.loot.length = 0; d.startWave(); let guard = 0; while (d.S.phase === "wave" && guard++ < 400) { d.step(1/60, 15); for (const e of d.enemies) if (!e.dead) d.kill(e); } const rewards = d.loot.filter(l => Math.abs(l.x) < 4 && l.z > 2.5 && l.z < 7); return { phase: d.S.phase, wave: d.S.wave, rewards: rewards.length, r: rewards[0] && rewards[0].it.rarity, banner: document.getElementById("banner").textContent }; });
check("held wave drops a reward by the crystal (uncommon+)", wave.phase === "build" && wave.rewards >= 1 && wave.r >= 1 && wave.banner.includes("reward"), JSON.stringify(wave));
// --- picture ---
await page.evaluate(() => { const d = window.__dd; d.setHero(0, 8, Math.PI); d.setCam(Math.PI, .5, 8); for (let i = 0; i < 5; i++) d.dropLoot(d.rollItem(i, ["weapon","armor","charm"][i % 3]), -3 + i * 1.5, 4.5, true); d.step(1/60, 60); });
await page.waitForTimeout(300);
await page.screenshot({ path: process.env.SP + "/loot-shot.png" });
check("no errors during play", errors.length === 0, errors.join(" | ").slice(0, 300));
await browser.close(); server.close();
const failed = results.filter(x => !x).length; console.log(`${results.length - failed}/${results.length} loot checks passed`); process.exit(failed ? 1 : 0);
