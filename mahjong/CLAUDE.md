# Mahj Helper

A phone web app for American mahjong beginners: tap in your tiles, see which hands on your card
you're closest to. Served from GitHub Pages at https://dragonpony1.github.io/gnome-vault/mahjong/
(the repo's `main` branch, `/mahjong` folder). Separate from Gnome Vault in the repo root.

- `index.html`: the whole app screen (styles, markup, UI code).
- `engine.js`: hand matching, no DOM. Tested with `node --test mahjong/test/*.test.js`.
- `hands.js`: the 24 made-up practice hands. Never put a real NMJL or other published card
  in the repo; players add their own card on the My card tab (it stays on their device).
- `sw.js`: offline copy, network first.

## Before every push

Bump the version in ALL of these, matching:
1. `const APP_VERSION = "x.y"` in `index.html`
2. the `?v=x.y` on both `<script src="engine.js?v=…">` and `hands.js?v=…` in `index.html`
3. `const CACHE = "mahj-helper-N"` in `sw.js` (just add 1)

The version drives the "A newer version is ready · Tap to refresh" bar; the `?v=` is what
actually gets new code past GitHub Pages' ~10 minute cache on a phone.

Run the tests, then open a PR from the working branch and merge it (the owner has said to
merge Mahj Helper changes without asking each time).

## The update bar always lags one version

The bar is drawn by the code the phone is already running, never by the version it
advertises, so a change to the bar itself only shows up one release later.
