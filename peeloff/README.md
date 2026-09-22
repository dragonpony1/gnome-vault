# Peel-Off — the board runner's app

Who stays late tomorrow, on nine phones. The runner reads the OR schedule in (photo or paste), the app
projects when each room finishes, ranks the rooms L1 (latest) to L5 (first home), and publishes the list
to the crew. One page (`peeloff.html`) and one Cloudflare Worker (`worker/peeloff-worker.src.js`) that
serves the page and keeps the board, the calendar photos and what past days taught.

## Files

- `peeloff.html` — the page. Works on its own (manual mode: paste the schedule, copy the list out) and
  in server mode when the worker serves it (`window.PEELOFF_API` set).
- `worker/peeloff-worker.src.js` — the worker, with `__PAGE__` and `__VERSION__` placeholders.
- `build-peeloff-worker.mjs` — bakes the page into the worker: `node build-peeloff-worker.mjs` writes
  `dist/peeloff-worker.js` (paste into Cloudflare) and `dist/index.html` (the page alone). `STAMP="v3 · Sep 22"`
  overrides the version stamp shown under the logo.
- Tests (Playwright + Node, need `node_modules` with playwright next to them):
  `node page-test.mjs` (the page alone), `node worker-test.mjs` (every endpoint, in-memory store,
  stand-in reader), `node e2e-test.mjs` (the page served by the worker, in a browser, two phones).

## Deploying

1. Cloudflare dashboard → the Peel-Off worker → Edit code → replace everything with `dist/peeloff-worker.js`
   → Deploy. The version under the logo changes when the paste took (`/health` shows it too).
2. Settings the worker needs (Settings → Variables and Secrets, Bindings):
   - a **KV namespace** binding, any name — the first KV binding found is the store
   - **PEELOFF_CODE** (secret) — the crew passcode (`CREW_CODE`, `PASSCODE` or `CODE` also work)
   - **ANTHROPIC_API_KEY** — for "Read it for me" (`ANTHROPIC_KEY` or `CLAUDE_API_KEY` also work)
   - `PEELOFF_MODEL` (optional) — the model that reads photos; `claude-opus-5` unless set
   `GET /health` says which of the three it found.

## What the worker answers

All POST with JSON `{code, ...}`; a wrong code is 401.
`/read` {image, roomsH, roomsNP} → {lines} (SITE | ROOM | START | MINUTES | SURGEON | PROCEDURE, one case a line) ·
`/board` → {board} · `/publish` {board} → {ok} · `/calendar` {kind: cal|sched, image | images | remove | meta} ·
`/actual` {room, endedAt, day} → {ok, mins} (the room's last case learns its real length) · `/learned` → {byProc, recent}.

## Changes

- v3 (Sep 22): the runner's own end time per room (the "ends at" box on a room's row) pins that room's
  finish — no more guessing for that room; the crew see "runner says 3:30p", the copy text marks it `*`.
  Guessed case lengths show as dashed Min boxes. Fresh worker (the original's source was lost with its session).
- v2 (Jul 31): the original.
