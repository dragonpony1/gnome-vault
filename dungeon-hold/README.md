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

## The campaign (maps)

`MAPS` in `parts/game.js` is the list of maps. Each one holds its grid (`build(f,g,h,ramp)`: fill tiles, set a tile, fill a
raised floor height, lay a staircase), the crystal cell, the gates (`lanes`, in the order waves open them), props, lights
(world coords, or `{cx,cz}` cells), the hall rectangle (banners), beams, a throne, and where the tavern room sits
(`tavern:{dx,dz}`, an offset from map 1's room). The map is chosen when the page loads: `?map=N` or the saved `ddMap`, never
past `ddMapsCleared`. Hold `waves` waves and the map is cleared (`winMap`): the tally shows NEXT MAP, which reloads with the
next `?map`. Difficulty carries across maps through `effWave()` (map 2 wave 1 fights like wave 8); the HUD shows the map's own
wave count. Height: `hgt`/`rampA` per cell, `floorH(x,z)` (stairs are two flat steps per cell), no walking or pathing up a
ledge taller than a step, no building on stairs; raised tops and stone drops are generated after the walls.

Maps so far: 1 The Gnome Hall (the original), 2 The Throne Room (a vast marble hall under a 14-high ceiling with arched windows and drapes; the grand stair climbs to a terrace, twin stairs climb on to the
crystal six up, the throne behind it), 3 The Cloister Court (outdoors under a night sky: a sunken court, a covered
colonnade a step and a half up with four flights down, trees, three corner gates), 4 The Great Feast Hall (three long
tables with benches and candles, four hearths, the crystal on the high-table dais, doors east, north and south).
Map styles: `wallH`, `fog`, `style.marble` / `style.moss` (floor and wall painters), `style.windows` (arched windows with
drapes), `style.outdoor` (no ceiling, night sky, stars and a moon), `roofs` (slabs over colonnades), `trees`, `tables` +
`tableGaps`, `hearths`, `throne`, `chandeliers`, `pillarH`.

## Heroes, weapons, sets

- `70-hero2.js` holds `HEROES` (Gnome Warden with a sword, Fae Battle Witch with a whip and reach 3.6); the start screen
  picks one (saved as `ddHero`); a pick swaps the model live. The start screen also has a testing line: unlock all maps,
  auto-mana (orbs fly to you from anywhere), +1000 gold, ↻ fresh reload (a plain reload; the page's URL is left alone since a host may sign it; saves kept) and wipe saves (two clicks: forgets every `dd*` key, then reloads fresh).
- `80-weapons.js` mounts sword models on a `weaponMount_<cm>` node and whip models on a `whipMount_<cm>` node; a whip
  model is cut into a handle and five chained lash segments (`rigWhip`). The lash is a small rope simulation
  (`whipAnim`): five points hang from the handle under gravity, keep their lengths, trail the fist on a swing and snap round
  after it; each segment points at the next point. `window.__weapons.tick(dt)` runs it while the sheet is open.
- The witch's baked vine whip is cut off her mesh by `meshy/witch/merge.mjs` (`merge.html?whip=1&noreskin=1&axis=forearm`):
  vertices are welded by position, the vine is seeded by its green texture colour and grown through connected triangles that
  sit away from the bones, and a `whipMount_100` is added under LeftHand with its axis along the forearm (the vine's own
  direction pointed through her leg — that was "she whips her leg").
- Meshy's rig for the witch is scrambled: her file weights only ten of the 22 bones (the left arm's skin on the right-arm
  bones, legs on the wrong bones — that was the "high kick"), and the right-arm bones sit inside her torso. The merge
  (`merge.html?reskin=auto`) binds every vertex afresh to the nearest bone segments of the bind pose (core first: anything
  within the trunk's radius binds to the spine bones, above the neck to the head bones, limbs to the nearest limb bone; up to
  three bones by inverse square distance). Idle, walk, run, death and jump then play cleanly; her Meshy attack clip's tracks
  don't fit the rig at all (they explode the mesh), so it is never played. `probes/skinhist.mjs <glb…>` prints a file's
  weights per joint — run it on any new Meshy export before trusting the rig. A clean re-rig from Meshy (whip removed
  first) is still the better source.
- `72-witchswing.js`: the witch's Meshy "whip attack" clip is unusable, so her swing is made by hand — the left arm
  winds up over her shoulder and snaps forward (bones aimed in world space and blended into the idle or walk pose); the kick
  clip stays in the file but never plays for her, and the hit lands at the snap (`hitFrac` .5). Heroes opt in by id in
  `PROC` with the arm to use.
- Model files carry their content stamp in the name (`assets/witch.<sha1[0:8]>.glb.txt`, written by `assemble.mjs` for the
  folder build next to the plain copy) so a re-exported model is a new file and no browser or CDN cache can hand out the
  old one; `fetchBytes` falls back to the plain path if the stamped file is missing.
- `68-paperdoll.js` is the Tab character sheet in the ashen style: the live hero (the hall's own model, turning on a stone
  pedestal under an arch, rendered by a second camera that sees only layer 1 and copied into the sheet), the five slot
  plaques with the forge rows, HP / mana / attack / defense, seven medallions, an INVENTORY grid (click a piece to read,
  equip or sell it) and the item card. `window.__doll.select(id,from)` picks an item for the card.
- `92-sets.js` is the set frame: pieces sharing an "of the …" name count together, three give the small bonus, five the
  big one, completing one says so, the sheet's SET BONUSES panel lists every registered set with its count, stat lines say
  "Void set 3/5". The frame holds no sets of its own: ordinary drops carry flavour suffixes only (of Embers, of Fury, of
  Stone, of the Watch, of Thorns…) and never mean a set.
- `93-gearsets.js` is the registry for the great sets (ten planned; the arcane **Void** set is the first). An entry gives
  the suffix, icon and colour, the lowest rarity that can carry it and the chance per drop by wave, the value multiplier,
  the drop sound, the three- and five-piece percentages (on `Meta.mult`) and an optional five-piece `onHit` power, plus
  stand-in weapon models until Meshy art lands. Of the Void: Rare+ only, from wave 4 at 5% of such drops rising a point a
  wave to 15%, worth ×3, drops with a low bell under a rising shimmer and a violet column, glows violet on the floor and in
  the hand; 3 pieces +15% hero damage and +20% familiar damage; 5 pieces VOID RIFT (every hit deals 40% of the blow to all
  within 3 units and slows them 2 s). `window.__void` and `void-test.mjs` cover it.

- `97-pause.js`: Escape in the hall (or the mouse leaving pointer lock) opens PAUSED — RESUME, or RETURN TO TITLE SCREEN
  (a reload; gold, gear, skills and map progress are saved as they happen, the run is forfeited). Escape while placing
  still cancels the placement; the tavern and the sheet keep their own Escape. `window.__freeze=true` stops the live
  loop's update so a test can step the hall itself and still see it drawn.

- The crystal stands on its own carved base, level with the floor: no raised dais (the DAIS cells remain an inlaid floor
  marking with a gold border, and `baseFloor` no longer steps up on them).

- Frost Totem (key 6, `DEFS.totem`, Meshy art `totem-1..4.glb` by mark, procedural fallback): a runed pillar with a ring of
  7 (+1 a mark). Every other defense standing in a ring hits harder and faster by the strongest ring it stands in (+15%,
  +5% a mark, `d.buff` set each frame in `updateDefs` and read by `stat` for dmg and cd; totems never buff totems and never
  stack); mobs in the ring are chilled (`e.chillT`, 70% speed, half a second after they leave). The ring is drawn on the
  floor at its reach with a small spinner and a plume of light at the top (`mdl.userData.aura`, added at runtime so a model
  swap keeps it). `totem-test.mjs` covers it.

## Open items

- Void set models: the concept art (runed blade, chain whip, shard charm, galaxy amulet, starless robe) is waiting on Meshy
  exports; until then Void weapons use the holy sword / crystal whip darkened and burning violet.
- Nine more great sets to design (suffix, drop rule, buffs, sound); each is one `addSet` entry.
- Meshy art still wanted: turnip trebuchet, hobgoblin archer.
- Upgraded gear raises gear score, which nudges mob health up a little (rubber band); revisit if it feels punishing.
