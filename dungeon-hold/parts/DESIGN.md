# Dungeon Hold — meta-game contract (bag · gold · tavern · shop · XP/skills · familiar)

Dungeon Hold is a single-file browser game (three.js r128, UMD global `THREE`). It is assembled by
`node assemble.mjs` in the scratchpad root from:

- `parts/head.html` — page markup + CSS (HUD, start screen, dead screen) and the inlined libs/models.
- `parts/game.js` — the whole game (760 dense lines, one `<script>` scope, NOT a module, no `import`).
- `parts/modules/*.js` — meta-game modules, concatenated in filename order INTO THE SAME SCRIPT SCOPE,
  right before the `window.__dd={` test hook at the end of game.js. Modules therefore see every game
  global (`S`, `hero`, `gear`, `SLOTS`, `rollItem`, `toast`, `SFX`, `scene`, `THREE`, …) and run once at
  load, after all of game.js has executed (renderer up, `loadGear()` already called, `S.phase==='start'`).
- `parts/tail.html` — `</script></body></html>`.

Never edit `dungeon.html` directly: edit the parts, then `node assemble.mjs`. Tests run against the
assembled `dungeon.html` with `SP=<scratchpad> node <test>.mjs` (Playwright, headless Chromium with
SwiftShader; they serve the file over http and drive the game through `window.__dd`).

Style: match game.js — compact code, plain functions, `$('id')` for elements, `toast()` for messages,
`floatText(x,y,z,txt,col)` for world text, `SFX.*` beeps, colours from `RCSS`/`RCOL` (rarity), the HUD
palette `--gold #e8b94a`, `--cyan #5ee9ff`, `--ink #120c1a`, background `#0b0712`, Georgia serif.
Everything must work on a phone (the game has touch controls; `TOUCH` is a global boolean) and under the
claude.ai artifact viewer's CSP (no external URLs, no `blob:` fetches, no `eval`). No frameworks.

## The seam in game.js

game.js declares (near the game state):

```js
let gear={weapon:null,armor:null,charm:null,amulet:null,familiar:null};
const Meta={
  mult:k=>0,            // multiplicative bonus from skills: 'dmg','hp','spd','move','tow','tcd','aoe','mana' (0.25 = +25%)
  onPickup:it=>false,   // return true when the module took the item (into the bag); false = old auto-equip/sell
  onKill:e=>{}, onWaveHeld:w=>{}, onRunEnd:w=>false,   // onRunEnd: true = module shows its own run-summary/tavern screen
  update:dt=>{}, hud:()=>{}, open:()=>{}, isOpen:()=>false };
```

Modules extend it with `Object.assign(Meta,{...})`. Where game.js calls each hook:

| hook | called from | notes |
|---|---|---|
| `Meta.mult(k)` | `heroMult(k)=1+Meta.mult(k)` used by `heroDmg()` (dmg), `applyGear()` (hp → `hero.max`), `swingDur()` (spd), hero move speed (move), `stat(d,'dmg')` (tow), `stat(d,'cd')` (tcd, divides the cooldown), `stat(d,'range')` for the 360° Slice N Dice + the bowling-ball hit radius (aoe), mana-orb value (mana) | return 0 when no skill |
| `Meta.onPickup(it,l)` | `pickup(l)` when the hero walks over loot `l` (`l.it` is the item) | return true if bagged; game removes the floor loot either way |
| `Meta.onKill(e)` | `kill(e)` after orbs + loot drop | `e.kind` ∈ goblin/archer/orc/ogre |
| `Meta.onWaveHeld(w)` | end of `updateWave` when the wave is cleared (phase → 'build') | |
| `Meta.onRunEnd(w)` | `hurtCrystal` when the crystal falls (`S.phase==='dead'`, pointer lock released) | return true to suppress the old `#dead` screen |
| `Meta.update(dt)` | end of the in-play branch of `update(dt)` (not during 'start'/'dead') | familiar lives here |
| `Meta.hud()` | end of `update(dt)` every frame (all phases except 'start') | keep cheap: diff before touching the DOM |
| `Meta.open()` | key `I`/`B`, the 🎒 HUD button (`#bagbtn`), the start screen's `#tavbtn`, the touch 🎒 button | open the tavern overlay |
| `Meta.isOpen()` | keydown / mousedown / mousemove / wheel handlers bail out while true | so the overlay owns input |

Also available from game.js: `SLOTS=['weapon','armor','charm','amulet','familiar']`, `SICON`, `RNAME`, `RCSS`
(rarity CSS colours), `RCOL`, `statStr(it)`, `STATL` (stat label fns), `STATW` (stat weights),
`rollItem(minR,slot,lvl)` (lvl = item level; `tierOf(lvl)` = 1..5, brackets of 3 waves),
`applyGear()` (recompute `hero.max` after gear/skills change), `saveGear()`/`loadGear()`,
`heroStat(k)` (flat gear stat sum), `heroDmg()`, `S` (`S.wave`, `S.phase` ∈ start/build/wave/dead, `S.mana`,
`S.kills`), `hero` (`hero.x/y/z/yaw/hp/max/dead`), `enemies` (each `{x,z,y,hp,dead,r,h,kind}`),
`hurt(e,dmg,kx,kz)` (damage an enemy with knockback), `scene`, `camera`, `mat(hex)` (toon material),
`basic(hex)`, `M(geo,mat,x,y,z)`, `G.box/cyl/sph/cone`, `outline(obj)`, `glow(hex,size,opacity)`,
`floatText`, `toast`, `SFX` (`SFX.loot(rarity)`, `SFX.mana()`, `SFX.place()`, `SFX.hit()`, `beep(freq,dur,type,gain,slide)`),
`$()`, `clamp`, `lerp`, `PI`, `TAU`, `TOUCH`, `BUILD` (number), `localStorage` keys already used: `ddGear`, `ddSound`, `ddMusic`.

`S.phase==='dead'` after the crystal falls; the old flow reloads the page to play again (`location.reload()`),
and everything persistent lives in localStorage, so "play again" = save + reload.

## Item shape (from `rollItem`)

```js
{slot:'weapon'|'armor'|'charm'|'amulet'|'familiar', rarity:0..4 (Common..Legendary), lvl:N (wave it rolled at),
 tier:1..5, name:'Gleaming Cleaver of Embers', stats:{dmg:6,spd:12,...}, score:71.6, value:240, id:'k3f9…'}
```
stat keys: dmg, spd(% swing), hp, def(% armor), regen(hp/s), tow(% defenses), mana(%), move(%), fdmg (familiar bolt
damage), frate (% familiar fire rate). `value` is the SELL price in gold. Buy price in the shop = `value*3`.

## What to build (the loop the player asked for)

"Defend → look through the loot you picked up → sell the rest and watch the gold climb → buy better-tier gear,
charms, amulets, familiars → put run experience into skill categories."

### 10-meta.js — state + rules (`Meta` core)
- Persistent state in localStorage `ddMeta`: `{gold, xp, level, skills:{blade,vigor,fleet,overseer,loader,wideshot,manawell}, bag:[items], best:(best wave), stock:[items], stockTier, runs}`. Load on start; save on every change; tolerate missing/corrupt data (start fresh).
- **Bag**: `Meta.onPickup(it)` puts the item in the bag (cap `BAG_CAP=24`), `SFX.loot(it.rarity)`, floatText with rarity + slot icon, a toast naming the item ("bagged"), returns true. When the bag is full: toast "Bag is full — it sells itself for N gold", add `it.value` gold, return true (the item is consumed).
- **Gold**: `Meta.gold()`, `Meta.addGold(n,why)`. Wave held: `+ (10 + 5*w)` gold. Run end payout: `25*w`.
- **XP / level**: `XP={goblin:2,archer:4,orc:8,ogre:40}` per kill, `+20+10*w` per wave held. `xpToNext(L)=round(100*L^1.5)`. Level up → +1 skill point, banner-ish toast "LEVEL 7 — 1 skill point", `SFX.held()`. `Meta.level()`, `Meta.xp()`, `Meta.points()` (unspent), `Meta.canRespec()`.
- **Skills** (each 0..10 points): blade (+6% hero dmg/pt → mult 'dmg'), vigor (+8% hp/pt → 'hp'), fleet (+3% move & +3% swing/pt → 'move','spd'), overseer (+5% defense dmg/pt → 'tow'), loader (+4% defense attack speed/pt → 'tcd'), wideshot (+6% AoE radius/pt → 'aoe'), manawell (+6% mana/pt → 'mana'). `Meta.mult(k)` sums these. `Meta.spend(skill)`, `Meta.respec()` (refunds all points for `100*level` gold). After any change call `applyGear()`.
- **Shop stock**: 6 items, rolled with `rollItem(minRarity, slot, lvl)` at the shop tier: `stockTier = clamp(tierOf(best)+1, 1, 5)` (one tier above the best wave reached; the unlock line says "Reach wave N to unlock tier T"). Rarity floor 1 (Uncommon), one guaranteed Rare+, slots spread across all five (always at least one familiar and one amulet). Stock rerolls at the start of every run (`runs` counter) or via `Meta.restock()` for `40*stockTier` gold. `Meta.buy(i)` (needs gold, bag space) → bag. `Meta.sell(itemId)` → gold += value, `SFX.mana()`; `Meta.sellJunk()` sells every bag item that is not an upgrade: it scores below the equipped item of its slot, or it is a Common that does not beat it (nothing worn in a slot → nothing in that slot is junk; `Meta.isJunk(it)` is the one rule the bag labels and Sell junk share). `Meta.equip(itemId)` swaps with the equipped item (old one goes to the bag) → `applyGear(); saveGear()`. `Meta.unequip(slot)`.
- **Run end**: `Meta.onRunEnd(w)` records best, pays gold, returns `Meta.summary()` data `{wave, kills, xpGained, goldGained, levelsGained, drops}` and tells the tavern UI to show the summary then the tavern. Return true.
- Test hook: `Object.assign(window.__dd,{meta:Meta})` is not possible from the module (the hook is created after) — instead expose `window.__meta=Meta` and add helpers on Meta: `Meta.state()` (deep copy), `Meta.reset()` (wipe ddMeta + gear), `Meta.addXP(n)`, `Meta.giveGold(n)`, `Meta.giveItem(it)`.

### 20-tavern.js — the tavern overlay (UI only, talks to `Meta`)
- Injects its own `<style>` and a `<div id="tavern" class="screen hide">` at load. Opened by `Meta.open()`, closed by a ✕ / `Escape` / "DEFEND THE HALL" (which, if `S.phase==='start'`, clicks `#playbtn`; if 'dead', `location.reload()`; otherwise just closes). Sets `Meta.isOpen()` true while open. While open the game keeps rendering underneath (fine).
- Header: 🍺 THE TAVERN · gold counter (`● 1,240 gold`) that **counts up/down with a tick animation** and coin beeps when it changes — this is the moment the player loves. Level + XP bar + unspent points badge. Best wave.
- Tabs: **BAG** · **SHOP** · **SKILLS**.
  - BAG: left column = five equipped slot cards (icon, name in rarity colour, tier badge "T3", stats); right = bag grid of item cards. Tap a card → detail panel: full stats with green/red deltas vs the equipped item of that slot, sell price, buttons **Equip** / **Sell (N gold)**; bag header buttons **Sell junk** and item count `12/24`. Empty state text.
  - SHOP: the six stock cards with **Buy (N gold)** (disabled + reason if too poor / bag full), the tier line ("Tier 3 stock · reach wave 9 for tier 4"), **Restock (N gold)**.
  - SKILLS: seven rows: name, one-line what it does, current value ("+18% hero damage"), pips 0..10, **+** button (disabled without points), and **Respec (N gold)**. Points available shown at top.
- Run summary: `Meta.onRunEnd` → `Tavern.summary(data)` shows "THE CRYSTAL FELL ON WAVE N" with kills / xp / gold / levels gained and a **TO THE TAVERN** button that switches to the bag tab (and a **GO AGAIN** that reloads).
- Phone layout: single column, cards ≥ 44px tap targets, scrollable panels, no horizontal scroll, safe-area padding. Desktop: two columns, max width 980px.
- Keep DOM updates cheap (rebuild a tab's list only when its data version changes).

### 30-familiar.js — the pet
- When `gear.familiar` is equipped and the game is in play: a small floating creature (procedural, toon `mat()` + `outline()`, ~0.5 units, colour by rarity `RCOL[rarity]`, bobbing, faces where it shoots) follows 1.2 units behind/above the hero's shoulder (lerp). Hidden while the hero is dead.
- Every `1/(1.2*(1+frate/100))` seconds it fires a glowing bolt (`basic()` sphere + `glow()`) at the nearest living enemy within 9 units with line of sight (`los(x1,z1,x2,z2)` exists in game.js). Bolt flies 18 u/s, hits within `e.r+.4`, `hurt(e,fdmg*heroMult('dmg'),…)`, `SFX.hit()`; misses expire after 1.2 s. Keep its own bolt list; update/remove meshes properly.
- `Meta.update(dt)` drives it (compose with whatever 10-meta.js registered: modules must chain, e.g. `const prev=Meta.update; Meta.update=dt=>{ prev(dt); familiarUpdate(dt); }`).
- Familiar names by rarity already exist in `BASES.familiar`; the model shape may vary by the base name (Wisp = orb, Bat = wings, Sprite, Fire Imp, Crystal Owl, Storm Drake) — a few variants are enough.

### Integration + tests (integration agent)
- Update `loot-test.mjs` for the bag behaviour (pickup → bag, not auto-equip; the "worse item sold" case is now "goes to the bag"), keep the other suites green: `feat-test.mjs`, `glb-test.mjs`, `place-test.mjs`, `mob-test.mjs`, `csp-test.mjs` (`FILE=<path> SP=<path> node csp-test.mjs`).
- Write `meta-test.mjs` (same harness style; use port 8810) covering: pickup → bag; kill → xp; wave held → gold + xp; level up → point; spend → `heroMult` changes `heroDmg()`; equip/sell/buy flows and gold counter values; shop tier line; persistence across a reload; run end → summary → tavern; familiar shoots and damages an enemy; overlay blocks game keys; phone-width screenshot of each tab with no horizontal overflow; no page errors.
- The start-screen build line reads `build 13`.


### 90-forge.js — item upgrades (the anvil)
- Every item carries `up` (points spent) and `ups` ({statKey: points}); `Meta.forge.max(it)` = [50,75,100,150,200] by rarity.
- One point adds `Meta.forge.inc[k]` to `it.stats[k]` (dmg .5, spd .5%, hp 2, def .2%, regen .05, tow .5%, trate .4%, tarea .4%, mana .5%, move .2%, fdmg .5, frate .5%, fproj 1) and costs `Meta.forge.cost(it)` gold = (3+2·rarity)·(1+.06·up)·(1+.1·(tier−1)).
- Keys per slot: weapon dmg/spd/tow/trate · armor hp/def/regen/tow · charm tow/trate/tarea/mana · amulet hp/regen/def/spd/move · familiar fdmg/frate/fproj/tow. Caps: def 60%, move 50%, spd 150%, fproj points by rarity [0,1,1,2,3].
- New stat keys: `trate` (defense attack speed, divides stat(d,'cd')), `tarea` (defense range and splash, multiplies stat(d,'range') and turnip splash), `fproj` (extra familiar projectiles: bolt kinds fire at more mobs, owl chains further, drake forks wider, bat bites more).
- API: `Meta.forge.upgrade(idOrItem, key, n)` → points applied (gold deducted per point, stats/score updated, gear + meta saved); `.can(it,key)` → {ok,why,cost}; `.keys(it)`, `.used/left/max(it)`, `.label(k)`, `.fmt(k,v)`.
- UI: the character sheet (Tab) — tap a worn item → THE FORGE panel with a row per stat and +1/+5/+25; the anvil in the tavern (north-east corner) opens the sheet with a hint. `statStr` appends `⬆ up/max` once an item has points.
