/* Peel-Off — the worker behind the board.
   One file, pasted into a Cloudflare Worker. It serves the page and answers the six
   calls the page makes: /read (a photo of the schedule → case lines), /board, /publish,
   /calendar (the daily calendar and the schedule photos), /actual (a logged end time)
   and /learned (what past days taught). Built by build-peeloff-worker.mjs — the page
   is baked in below, so a change to the page means a rebuild and a fresh paste.

   Bindings it looks for (Settings → Variables and Secrets / Bindings):
     a KV namespace           — any name; the first KV binding it finds is the store
     PEELOFF_CODE  (secret)   — the crew passcode (CREW_CODE, PASSCODE or CODE also work)
     ANTHROPIC_API_KEY        — for reading photos (ANTHROPIC_KEY or CLAUDE_API_KEY also work)
     PEELOFF_MODEL (optional) — the model that reads the photo; claude-opus-5 unless set
*/
"use strict";

var PAGE = __PAGE__;
var VERSION = __VERSION__;

var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/* ---------- bindings ---------- */
function kvOf(env){
  var names = ["PEELOFF", "PEELOFF_KV", "KV", "BOARD", "STORE", "DATA"], i, v;
  for (i = 0; i < names.length; i++){ v = env[names[i]]; if (isKV(v)) return v; }
  var keys = Object.keys(env || {});
  for (i = 0; i < keys.length; i++){ v = env[keys[i]]; if (isKV(v)) return v; }
  return null;
}
function isKV(v){ return !!(v && typeof v === "object" && typeof v.get === "function" && typeof v.put === "function"); }
function codeOf(env){ return String(env.PEELOFF_CODE || env.CREW_CODE || env.PASSCODE || env.CODE || "").trim(); }
function keyOf(env){ return String(env.ANTHROPIC_API_KEY || env.ANTHROPIC_KEY || env.CLAUDE_API_KEY || "").trim(); }
function modelOf(env){ return String(env.PEELOFF_MODEL || "claude-opus-5").trim(); }

/* same length, same bytes — without leaking where they first differ */
function sameCode(a, b){
  a = String(a || ""); b = String(b || "");
  if (!a.length || a.length !== b.length) return false;
  var d = 0, i;
  for (i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ---------- responses ---------- */
function json(status, obj){
  var h = Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, CORS);
  return new Response(JSON.stringify(obj), { status: status, headers: h });
}
function bad(msg){ return json(400, { error: msg }); }

/* ---------- the store ---------- */
async function readJSON(kv, key){
  var raw = await kv.get(key);
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch(e){ return null; }
}
async function writeJSON(kv, key, obj){ await kv.put(key, JSON.stringify(obj)); }

/* ---------- learning: what the last case of each room actually ran ---------- */
/* Must produce the same keys the page looks up, so the page's normProc is copied here. */
function normProc(s){
  return String(s || "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(l|r|lt|rt|left|right|bilat|bilateral|b)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
function learnKeys(surgeon, proc){
  var p = normProc(proc);
  if (!p) return [];
  var s = String(surgeon || "").toLowerCase().trim();
  return s ? [s + "|" + p, "|" + p] : ["|" + p];
}
function median(a){
  if (!a.length) return null;
  var b = a.slice().sort(function(x, y){ return x - y; });
  var m = Math.floor(b.length / 2);
  return (b.length % 2) ? b[m] : Math.round((b[m - 1] + b[m]) / 2);
}
var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function learn(kv, entry){
  var L = (await readJSON(kv, "learn")) || { keys: {}, recent: [] };
  if (!L.keys) L.keys = {}; if (!L.recent) L.recent = [];
  /* logging the same room twice on one day corrects the first entry rather than doubling it */
  var dup = L.recent.filter(function(r){ return r.day === entry.day && r.room === entry.room; });
  L.recent = L.recent.filter(function(r){ return !(r.day === entry.day && r.room === entry.room); });
  Object.keys(L.keys).forEach(function(k){
    L.keys[k].samples = (L.keys[k].samples || []).filter(function(s){ return !(s.day === entry.day && s.room === entry.room); });
  });
  L.recent.unshift(entry);
  L.recent = L.recent.slice(0, 40);
  learnKeys(entry.surgeon, entry.proc).forEach(function(k){
    var e = L.keys[k] || { samples: [] };
    e.samples.push({ day: entry.day, room: entry.room, mins: entry.mins });
    e.samples = e.samples.slice(-12);
    L.keys[k] = e;
  });
  await writeJSON(kv, "learn", L);
  return { replaced: dup.length > 0 };
}
function learnedView(L){
  var byProc = {}, recent = [];
  if (L && L.keys) Object.keys(L.keys).forEach(function(k){
    var ss = (L.keys[k].samples || []).map(function(s){ return s.mins; });
    if (ss.length) byProc[k] = { n: ss.length, median: median(ss) };
  });
  if (L && L.recent) recent = L.recent.map(function(r){
    return { day: r.day, room: r.room, proc: r.proc, surgeon: r.surgeon, mins: r.mins };
  });
  return { byProc: byProc, recent: recent };
}

/* ---------- reading a photo ---------- */
function readPrompt(roomsH, roomsNP){
  return "Read this OR schedule picture. Give me ONE LINE PER CASE and nothing else — no intro, no summary, no notes, no code fences.\n\n" +
  "Use exactly this format, pipes included, six fields:\n\n" +
  "SITE | ROOM | START | MINUTES | SURGEON | PROCEDURE\n\n" +
  "SITE is H for the hospital or NP for North Pointe. If the picture doesn't say, use H.\n\n" +
  "ROOM must be one of our rooms, spelled exactly as listed here. Hospital rooms: " + (roomsH || "OR 1, OR 2, OR 3, OR 4, Endo") +
  ". North Pointe rooms: " + (roomsNP || "NP 1, NP 2, NP 3, NP Endo") + ". A sheet or whiteboard may use a " +
  "different name for a room than we do (a board that says PROC is our Endo room) — use our name. On a printed grid the " +
  "room is usually in a narrow column on the far left, written once at the top of a block of rows, with blank rows " +
  "separating rooms; carry it down onto every case in its block. On a whiteboard the rooms are headers across the top. " +
  "If the photo cuts the room column off, put ?\n\n" +
  "START is the OR start time, 24-hour, four digits, no colon: 0730. These sheets often have TWO time columns — an " +
  "admission time then the OR time. Always take the OR time, which is the later of the two. Read times exactly as " +
  "written: afternoons appear as 13:00 and 14:30, so 6:00 is the morning. On a whiteboard where only the room has a " +
  "start time, give it to that room's first case and leave START empty for the rest.\n\n" +
  "MINUTES is the scheduled length, and only if the sheet actually has a length column or an end time column. Most do " +
  "not have either. When there is no length printed, put 0 — do not estimate it and do not work it out from the next " +
  "case's start time. 0 is the right answer; the app fills it in itself.\n\n" +
  "SURGEON is the surgeon's last name only, as printed, or empty if there isn't one.\n\n" +
  "PROCEDURE is a few words of what the case is.\n\n" +
  "Go room by room and keep the printed top-to-bottom order inside each room. Transcribe only what is printed. Skip " +
  "blank rows and header rows. Leave out patient names and initials, medication and condition notes, insurance notes " +
  "and booking dates — none of that is needed.";
}

async function readPhoto(env, body){
  var key = keyOf(env);
  if (!key) return json(500, { error: "The worker has no reader key. Add a secret named ANTHROPIC_API_KEY." });
  var m = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+\/=\s]+)$/.exec(String(body.image || ""));
  if (!m) return bad("Send the photo as a JPEG or PNG data URL.");
  var mediaType = m[1] === "image/jpg" ? "image/jpeg" : m[1];
  var data = m[2].replace(/\s+/g, "");
  if (data.length > 12 * 1024 * 1024) return bad("That photo is too big — the app shrinks them before sending; try again.");

  var req = {
    model: modelOf(env),
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    /* a schedule photo should never trip a safety classifier, but if one ever does the
       request is re-run on Anthropic's recommended fallback instead of failing */
    fallbacks: "default",
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mediaType, data: data } },
      { type: "text", text: readPrompt(body.roomsH, body.roomsNP) }
    ] }]
  };
  var r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key,
                 "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" },
      body: JSON.stringify(req)
    });
  } catch(e){ return json(502, { error: "Couldn't reach the reader. Try again in a moment." }); }
  var out = null;
  try { out = await r.json(); } catch(e){ out = null; }
  if (r.status === 401 || r.status === 403) return json(502, { error: "The reader refused the worker's key — check ANTHROPIC_API_KEY." });
  if (r.status === 429) return json(502, { error: "The reader is busy right now. Give it a minute and try again." });
  if (r.status !== 200 || !out) return json(502, { error: "The reader had a problem (" + r.status + "). Try again." });
  if (out.stop_reason === "refusal") return json(502, { error: "The reader declined to read that picture. Try a straighter shot." });
  var text = (out.content || []).filter(function(b){ return b.type === "text"; }).map(function(b){ return b.text; }).join("\n");
  text = text.replace(/^```[a-z]*\s*|\s*```$/g, "").trim();
  return json(200, { lines: text, truncated: out.stop_reason === "max_tokens" });
}

/* ---------- pictures: the calendar and the schedule sheets ---------- */
function picKey(kind){ return "pic:" + (kind === "sched" ? "sched" : "cal"); }
function isDataImage(s){ return /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(String(s || "")); }

async function calendar(kv, body){
  var key = picKey(body.kind);
  if (body.remove){ await kv.delete(key); return json(200, { ok: true }); }
  var imgs = Array.isArray(body.images) ? body.images : (body.image ? [body.image] : null);
  if (imgs){
    if (!imgs.length || imgs.length > 6) return bad("Send between one and six pictures.");
    var i;
    for (i = 0; i < imgs.length; i++){
      if (!isDataImage(imgs[i])) return bad("Send pictures as JPEG or PNG data URLs.");
      if (imgs[i].length > 6 * 1024 * 1024) return bad("A picture is too big — the app shrinks them first; try again.");
    }
    await writeJSON(kv, key, { images: imgs, postedAt: Date.now() });
    return json(200, { ok: true, postedAt: Date.now() });
  }
  var cur = await readJSON(kv, key);
  var has = !!(cur && cur.images && cur.images.length);
  if (body.meta) return json(200, { has: has, postedAt: has ? cur.postedAt : null });
  if (!has) return json(200, { has: false, images: [], image: null });
  return json(200, { has: true, images: cur.images, image: cur.images[0], postedAt: cur.postedAt });
}

/* ---------- the board ---------- */
async function publish(kv, body){
  var b = body.board;
  if (!b || typeof b !== "object" || !Array.isArray(b.slots) || !b.slots.length) return bad("That board has no assignments in it.");
  if (b.slots.length > 20) return bad("Too many slots.");
  var clean = {
    postedAt: Date.now(),
    forDate: DAY_RE.test(String(b.forDate || "")) ? b.forDate : null,
    crnas: +b.crnas || b.slots.length,
    turnover: (typeof b.turnover === "number") ? b.turnover : null,
    padPct: (typeof b.padPct === "number") ? b.padPct : 0,
    slots: b.slots.slice(0, 20),
    uncovered: Array.isArray(b.uncovered) ? b.uncovered.slice(0, 20) : [],
    lastCases: Array.isArray(b.lastCases) ? b.lastCases.slice(0, 40) : [],
    note: String(b.note || "").slice(0, 240)
  };
  await writeJSON(kv, "board", clean);
  return json(200, { ok: true, postedAt: clean.postedAt });
}

async function actual(kv, body){
  var room = String(body.room || "").trim();
  var ended = +body.endedAt;
  var day = DAY_RE.test(String(body.day || "")) ? body.day : new Date().toISOString().slice(0, 10);
  if (!room || !(ended >= 0 && ended < 1440 * 2)) return bad("Send the room and the time it finished.");
  var board = await readJSON(kv, "board");
  var lc = null;
  if (board && Array.isArray(board.lastCases)) board.lastCases.forEach(function(x){ if (x.room === room) lc = x; });
  if (!lc || typeof lc.start !== "number") return bad("That room isn't on tonight's board, so there's nothing to learn from.");
  var mins = ended - lc.start;
  if (mins <= 0 || mins > 900) return bad("That end time doesn't fit a case that started at " + lc.start + " minutes past midnight.");
  var res = await learn(kv, { day: day, room: room, proc: lc.proc || "", surgeon: lc.surgeon || "", mins: mins, endedAt: ended });
  return json(200, { ok: true, mins: mins, replaced: res.replaced });
}

/* ---------- the page ---------- */
function page(request){
  var origin = new URL(request.url).origin;
  var html = PAGE.replace("<title>", function(){
    return '<script>window.PEELOFF_API=' + JSON.stringify(origin + "/read") + ';</script><title>';
  });
  return new Response(html, { status: 200, headers: Object.assign({
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Peeloff-Version": VERSION }, CORS) });
}

/* ---------- routing ---------- */
export default {
  async fetch(request, env){
    var url = new URL(request.url), path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method === "GET"){
      if (path === "/" || path === "/index.html") return page(request);
      if (path === "/health") return json(200, { ok: true, version: VERSION, store: !!kvOf(env), reader: !!keyOf(env), code: !!codeOf(env) });
      return json(404, { error: "Not here." });
    }
    if (request.method !== "POST") return json(405, { error: "POST only." });

    var body;
    try { body = await request.json(); } catch(e){ return bad("Send JSON."); }
    if (!body || typeof body !== "object") return bad("Send JSON.");

    var code = codeOf(env);
    if (!code) return json(500, { error: "The worker has no crew passcode set. Add a secret named PEELOFF_CODE." });
    if (!sameCode(body.code, code)) return json(401, { error: "That code didn't work." });

    var kv = kvOf(env);
    if (path !== "/read" && !kv) return json(500, { error: "The worker has no KV namespace bound, so it can't keep the board." });

    switch (path){
      case "/read":     return readPhoto(env, body);
      case "/board":    return json(200, { board: await readJSON(kv, "board") });
      case "/publish":  return publish(kv, body);
      case "/calendar": return calendar(kv, body);
      case "/actual":   return actual(kv, body);
      case "/learned":  return json(200, learnedView(await readJSON(kv, "learn")));
      default:          return json(404, { error: "Not here." });
    }
  }
};
