# Date Me

A phone web app that gives young people date ideas. It works like a dating app, but you swipe
on ideas instead of people. Served from GitHub Pages at https://dragonpony1.github.io/gnome-vault/dateme/
(the repo's `main` branch, `/dateme` folder). Separate from Gnome Vault and Mahj Helper.
It has no backend: profiles and saved ideas live in `localStorage` under the key `dateme.v1`.

- `index.html`: every screen (welcome, quiz, location, swipe deck, saved + Spin it, filters,
  profiles), plus styles and UI code.
- `ideas.js`: the built-in library of date ideas. The tags are documented at the top of the file.
- `engine.js`: hard filters (age, food, budget, season, place, the person's filters), scoring
  with "why it's a match" reasons, and deck building. It has no DOM, so it runs under Node.
- `sources.js`: where ideas come from. The library is one source. Places-API and AI examples
  are there too, switched off.
- `location.js`: city/zip lookup, "use my location", and today's weather. It uses free services
  that need no key (Open-Meteo, Zippopotam.us, BigDataCloud) and everything works without them.
- `sw.js`: offline copy, network first.

Tests: `node --test dateme/test/*.test.js`

## Adding ideas

Add an `idea(...)` line in `ideas.js` and tag it honestly. The tests check the tags.
- Anything with alcohol needs `minAge: 21`. Overnights and 18+ venues need `minAge: 18`.
- Ids are permanent, because saved lists remember them. Never rename or reuse one.
- Seasonal ideas get `months`. Ideas that need a lake, beach, snow, etc. get `near`.

## Adding a real-places or AI source

Follow the two examples in `sources.js`: return raw ideas in the `ideas.js` shape (add
`spot: { name, address, url, lat, lon }` for a real place), and the engine scores them like
everything else. GitHub Pages can't keep secrets, so never put an API key in this folder. Put
the key in a small proxy (a Cloudflare Worker or similar) and fetch the proxy instead.

## Before every push

Bump the version in ALL of these, and keep them matching:
1. `const APP_VERSION = "x.y"` in `index.html`
2. the `?v=x.y` on all four `<script src>` tags in `index.html`
3. `const CACHE = "date-me-N"` in `sw.js` (just add 1)

The `?v=` is what gets new code past GitHub Pages' ~10 minute cache on a phone.
