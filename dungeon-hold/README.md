# Dungeon Hold

A Dungeon Defenders–style 3D tower defense: a gnome warden, a crystal to hold, five original defenses, a loot loop with a
physical tavern (locker, barkeep, trainer, anvil), six familiars, Meshy-made models. Three.js r128, plain JavaScript, one
page plus an `assets/` folder. Desktop first, tablet at most.

Live build: https://claude.ai/artifact/Y8nkfEsKZyvLESKRs7n9Zj (build 19).

## Layout

- `parts/head.html` — page shell, CSS, start/dead screens, the baked gnome/goblin/squire models (base64), Three.js r128 + GLTFLoader (CSP-safe patch).
- `parts/game.js` — the game: grid, hero, mobs, defenses, projectiles, loot, HUD, hero/mob GLB fitting (`fitModel`, `toonify`, `cloneSkinned`).
- `parts/modules/` — meta game written against `parts/DESIGN.md`: `10-meta.js` (bag, gold, xp, skills, shop), `20-tavern.js` (overlay UI), `30-familiar.js` (procedural pet + bolt).
- `parts/staging/` — later modules, same script scope, loaded after `modules/`: music, defense models, castle crystal, loot feel, tavern room, character sheet (Tab), hero v2, swords in hand, familiars v2 (Meshy models + per-kind attacks), casino mana sound, the forge (item upgrades).
- `parts/assets/` — GLB models, music, sfx. The build converts `.glb` to `.glb.txt` (base64) because the artifact host only serves fixed file types; `fetchBytes()` decodes.
- `parts/tail.html` — closes the script; `window.__dd` debug/test API is defined at the end of `game.js`.
- `assemble.mjs` — builds the page. `serve.mjs` — test server.
- `*-test.mjs` — Playwright suites (headless Chromium with SwiftShader). `probes/` — screenshot/diagnostic scripts.
- `meshy/` — pipelines for Meshy exports: `merge.html/.mjs` (rigged characters: idle/walk/run/attack(/shout) → one GLB), `merge-static.html/.mjs` (props: shrink texture, face +Z, floor, centre), `view.html/.mjs` (frame-strip renderer), per-model folders with their merge variants. Model inputs are not committed.
- `parts/DESIGN.md` — the meta-game contract (bag/gold/tavern/skills/familiar/forge). `parts/MAP.md` — the planned bigger seven-door hall.

## Build

```
# folder build (index.html + assets/), what the artifact serves:
DIST=./dist EXTRA=./parts/staging node assemble.mjs
# single-file build (dungeon.html, no assets: procedural fallbacks stay):
EXTRA=./parts/staging node assemble.mjs
```
Env: `DIST=<dir>`, `EXTRA=<dir of extra modules>`, `NOMODS=1` (skip modules), `OUT=<file>`.
Publishing = upload `dist/index.html` plus any changed `dist/assets/*.glb.txt` to the artifact.

## Tests

```
npm i playwright            # Chromium must be available (PLAYWRIGHT_BROWSERS_PATH or executablePath)
export SP=$PWD
DIST=$SP/dist node forge-test.mjs      # any *-test.mjs; run them one at a time (they share timing)
node familiar-test.mjs                  # the single-file fallback suite reads $SP/dungeon.html
```
Suites: feat, loot, glb, place, csp, mob, mobpath, meta, tavern, tavernroom, familiar, familiars2, cone, music, defglb,
ballista-shot, lootfeel, weapons, towers, paperdoll, casino, ogre, forge, fix-r1, fix-r2. All green on build 19.

## Adding Meshy art

- Props (towers, swords, familiars, crystal): `cd meshy && node merge-static.mjs out.glb "in=raw.glb&yaw=90&tex=512"`
  (yaw turns the model so its front faces +Z; cannons need 90, hedge/crystal/familiars 0). Copy to `parts/assets/`, register in
  `parts/staging/50-defmodels.js` (defenses by kind + mark), `80-weapons.js` (swords), `85-familiars.js` (pets).
- Rigged mobs/heroes: `meshy/<name>/merge.html` + `merge.mjs` merges the Meshy rig with its walk/run/attack(/shout) clips,
  fixes facing and hip drift, and (for the hero) cuts the baked sword out and leaves a `weaponMount_<cm>` node under RightHand.

## Open items

- Bigger map per `parts/MAP.md` (seven doors, landings, stairs; needs a height layer).
- Meshy art still wanted: turnip trebuchet, mushroom ring, hobgoblin archer.
- Upgraded gear raises gear score, which nudges mob health up a little (rubber band); revisit if it feels punishing.
