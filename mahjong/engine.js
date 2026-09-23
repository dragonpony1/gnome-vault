// Hand matching for American-style mahjong. No DOM here, so it also runs under Node for tests.
//
// A hand pattern is written like the card, one group per word:
//   FF 1111a 2222b 3333c
// Symbols: 1-9 numbers, 0 = White Dragon (Soap), F flower, N E W S winds,
// R Red Dragon, G Green Dragon, D = the dragon that matches the group's suit.
// A trailing a, b or c is the group's suit. Different letters mean different suits.
// A word made of one tile repeated 3+ times (a pung, kong or quint) can use jokers;
// singles, pairs and mixed words like 2026 or NEWS cannot.
(function (root) {
  "use strict";

  const SUITS = ["bam", "crak", "dot"];
  const SUIT_LETTER = { bam: "b", crak: "c", dot: "d" };
  const SUIT_DRAGON = { bam: "GD", crak: "RD", dot: "WD" };
  const WINDS = ["N", "E", "W", "S"];
  const DRAGONS = ["RD", "GD", "WD"];

  // Every tile kind, in rack order, with how many exist in a set.
  const TILES = [];
  for (const s of SUITS) for (let n = 1; n <= 9; n++) TILES.push({ id: SUIT_LETTER[s] + n, kind: "num", suit: s, num: n, max: 4 });
  for (const w of WINDS) TILES.push({ id: w, kind: "wind", max: 4 });
  for (const d of DRAGONS) TILES.push({ id: d, kind: "dragon", max: 4 });
  TILES.push({ id: "F", kind: "flower", max: 8 });
  TILES.push({ id: "J", kind: "joker", max: 8 });
  const TILE = Object.fromEntries(TILES.map(t => [t.id, t]));
  const ORDER = Object.fromEntries(TILES.map((t, i) => [t.id, i]));

  const HAND_SIZE = 14;

  // Parse a pattern string into groups of symbol slots. Throws Error with a friendly message.
  function parsePattern(text) {
    const words = String(text || "").trim().split(/\s+/).filter(w => w && !/^[+=\-x×*&]$/i.test(w));
    if (!words.length) throw new Error("Type a pattern, like FF 1111a 2222b 3333c");
    const groups = [];
    for (const raw of words) {
      const m = /^([0-9fnewsdrgFNEWSDRG]+)([abcABC]?)$/.exec(raw);
      if (!m) throw new Error(`"${raw}" isn't a group I understand. Use numbers, F, N, E, W, S, R, G, D and a suit letter a, b or c.`);
      const syms = m[1].toUpperCase().split("");
      const tag = m[2].toLowerCase() || null;
      const needsSuit = syms.some(c => /[1-9D]/.test(c));
      if (tag && !needsSuit) throw new Error(`"${raw}" has a suit letter but no numbers or D to use it on.`);
      groups.push({ syms, tag: needsSuit ? (tag || "a") : null, text: raw });
    }
    const total = groups.reduce((n, g) => n + g.syms.length, 0);
    if (total !== HAND_SIZE) throw new Error(`That's ${total} tiles. A hand needs exactly ${HAND_SIZE}.`);
    return groups;
  }

  function vars(groups) {
    return [...new Set(groups.map(g => g.tag).filter(Boolean))].sort();
  }

  function permutations(list, k) {
    if (k === 0) return [[]];
    const out = [];
    list.forEach((x, i) => {
      const rest = list.slice(0, i).concat(list.slice(i + 1));
      for (const p of permutations(rest, k - 1)) out.push([x, ...p]);
    });
    return out;
  }

  // All concrete ways to play a hand: every suit assignment, and every shift if numbers can slide.
  function variants(hand) {
    const groups = hand.groups;
    const vs = vars(groups);
    const digits = groups.flatMap(g => g.syms).filter(c => /[1-9]/.test(c)).map(Number);
    const shifts = hand.slide && digits.length
      ? Array.from({ length: 9 - Math.max(...digits) + Math.min(...digits) }, (_, i) => i + 1 - Math.min(...digits))
      : [0];
    const out = [];
    for (const perm of permutations(SUITS, vs.length)) {
      const suitOf = Object.fromEntries(vs.map((v, i) => [v, perm[i]]));
      for (const k of shifts) {
        const vgroups = groups.map(g => {
          const tiles = g.syms.map(c => {
            if (/[1-9]/.test(c)) return SUIT_LETTER[suitOf[g.tag]] + (Number(c) + k);
            if (c === "D") return SUIT_DRAGON[suitOf[g.tag]];
            if (c === "0") return "WD";
            if (c === "R") return "RD";
            if (c === "G") return "GD";
            return c; // F N E W S
          });
          const jokerable = tiles.length >= 3 && tiles.every(t => t === tiles[0]);
          return { tiles, jokerable };
        });
        out.push({ groups: vgroups, suits: suitOf, shift: k });
      }
    }
    return out;
  }

  // Count tiles in a rack (array of ids).
  function tally(rack) {
    const c = {};
    for (const t of rack) c[t] = (c[t] || 0) + 1;
    return c;
  }

  // An exposed (locked) group is 3-5 tiles: one kind of tile plus any jokers, with at least one real tile.
  // Returns the tile it stands for, or null if it isn't a valid group.
  function exposureTile(exp) {
    if (!Array.isArray(exp) || exp.length < 3 || exp.length > 5) return null;
    const real = [...new Set(exp.filter(t => t !== "J"))];
    return real.length === 1 && TILE[real[0]] ? real[0] : null;
  }

  // Match each exposure to its own pung/kong/quint of the same tile and size in this variant.
  // Returns a map of group index -> exposure, or null when the exposures don't all fit.
  function placeExposures(v, exposures) {
    const placed = {};
    const fit = i => {
      if (i === exposures.length) return true;
      const t = exposureTile(exposures[i]);
      for (let gi = 0; gi < v.groups.length; gi++) {
        const g = v.groups[gi];
        if (placed[gi] || !g.jokerable || g.tiles[0] !== t || g.tiles.length !== exposures[i].length) continue;
        placed[gi] = exposures[i];
        if (fit(i + 1)) return true;
        delete placed[gi];
      }
      return false;
    };
    return fit(0) ? placed : null;
  }

  // Score one concrete variant against the tiles on your rack.
  // Locked groups fill their own spots exactly. Of the rest, natural tiles go to
  // singles and pairs first, since jokers can't fill those.
  // Returns each slot marked "have", "joker" or "need", plus totals.
  function scoreVariant(v, counts, placed = {}) {
    const left = { ...counts };
    let jokers = left.J || 0;
    const marks = v.groups.map((g, gi) => placed[gi]
      ? placed[gi].map(t => t === "J" ? "joker" : "have")
      : g.tiles.map(() => "need"));
    const free = v.groups.map((g, gi) => !placed[gi]);
    for (const jok of [false, true]) { // non-jokerable groups first
      v.groups.forEach((g, gi) => {
        if (!free[gi] || g.jokerable !== jok) return;
        g.tiles.forEach((t, ti) => {
          if ((left[t] || 0) > 0) { left[t]--; marks[gi][ti] = "have"; }
        });
      });
    }
    v.groups.forEach((g, gi) => {
      if (!free[gi] || !g.jokerable) return;
      g.tiles.forEach((t, ti) => {
        if (marks[gi][ti] === "need" && jokers > 0) { jokers--; marks[gi][ti] = "joker"; }
      });
    });
    let have = 0, jok = 0;
    const need = {}, used = {};
    v.groups.forEach((g, gi) => g.tiles.forEach((t, ti) => {
      const m = marks[gi][ti];
      if (m === "have") have++;
      else if (m === "joker") jok++;
      else need[t] = (need[t] || 0) + 1;
      // "used" counts only rack tiles, so locked tiles never show up as spare or kept.
      if (free[gi] && m === "have") used[t] = (used[t] || 0) + 1;
      if (free[gi] && m === "joker") used.J = (used.J || 0) + 1;
    }));
    const locked = v.groups.map((g, gi) => !!placed[gi]);
    return { marks, locked, have, jokers: jok, away: HAND_SIZE - have - jok, need, used };
  }

  // Best way to play one hand with this rack and these locked groups.
  // Returns null when the hand can't be made any more: it's concealed and you've exposed,
  // or your locked groups aren't part of it.
  function bestFor(hand, rack, exposures = []) {
    if (exposures.length && hand.concealed) return null;
    const counts = tally(rack);
    let best = null;
    for (const v of variants(hand)) {
      const placed = exposures.length ? placeExposures(v, exposures) : {};
      if (!placed) continue;
      const s = scoreVariant(v, counts, placed);
      if (!best || s.away < best.away || (s.away === best.away && s.jokers < best.jokers)) best = { ...s, variant: v };
    }
    return best;
  }

  // Rank every hand that's still possible, closest first.
  function rankHands(hands, rack, exposures = []) {
    return hands.map(hand => ({ hand, best: bestFor(hand, rack, exposures) }))
      .filter(r => r.best)
      .sort((x, y) => x.best.away - y.best.away || x.best.jokers - y.best.jokers || (x.hand.points || 0) - (y.hand.points || 0));
  }

  // Tiles in the rack that none of the given results use: good ones to pass or discard.
  // Jokers are never suggested.
  function spareTiles(rack, results) {
    const keep = {};
    for (const r of results) for (const [t, n] of Object.entries(r.best.used)) keep[t] = Math.max(keep[t] || 0, n);
    const counts = tally(rack);
    const spare = [];
    for (const t of Object.keys(counts).sort((a, b) => ORDER[a] - ORDER[b])) {
      if (t === "J") continue;
      for (let i = keep[t] || 0; i < counts[t]; i++) spare.push(t);
    }
    return spare;
  }

  // Hands as plain text, one per line, so a whole card can be pasted in at once:
  //   Section | Pattern | options | Name
  // Options: X (exposed) or C (concealed), a number for points, and "any" when the
  // numbers can be any numbers. Name is optional. Blank lines and lines starting with # are skipped.
  // Phones don't always copy text the way it looked: line breaks can turn into other
  // characters or vanish, and bars can come back as look-alikes. Clean all of that up first.
  // Used only when hands ran together. "any" is matched lowercase only, so a section named
  // "Any like numbers" isn't taken for it; points are at most 2 digits, so "X 25" followed
  // by section "2468" with the line break lost ("X 252468") still splits right.
  const OPTS = /^([xcXC](?![a-zA-Z]))?\s*(\d{1,2})?\s*(any(?![a-z]))?\s*/;
  function handFromParts(category, pattern, opts, name) {
    const words = String(opts || "").toLowerCase().split(/[\s,]+/).filter(Boolean);
    const num = words.find(w => /^\d+$/.test(w));
    return {
      category, pattern: pattern.replace(/\s+/g, " "), name: name || "",
      points: num ? Number(num) : null,
      concealed: words.includes("c"),
      slide: words.includes("any"),
    };
  }
  function parseHandLines(text) {
    const hands = [], errors = [];
    const clean = String(text || "").replace(/[\u2502\u2503\uFF5C\u00A6\u2223]/g, "|").replace(/\u00A0/g, " ");
    const add = (lineNo, raw, category, pattern, opts, name) => {
      try { parsePattern(pattern); } catch (e) { errors.push({ line: lineNo, text: raw, message: e.message }); return; }
      hands.push(handFromParts(category, pattern, opts, name));
    };
    clean.split(/\r\n|[\n\r\u2028\u2029\u0085]/).forEach((line, i) => {
      const raw = line.trim();
      if (!raw || (raw.startsWith("#") && !raw.includes("|"))) return;
      const parts = raw.split("|").map(p => p.trim());
      if (parts.length < 2) { errors.push({ line: i + 1, text: raw, message: "Put a | between the section and the hand." }); return; }
      if (parts.length <= 4) { add(i + 1, raw, parts[0], parts[1], parts[2], parts[3]); return; }
      // Several hands ran together on one line: Section | Hand | X 25 Next section | Hand | ...
      // Walk it in steps of two, peeling the options off the front of each third piece.
      let category = parts[0].replace(/^#.*\.\s*/, "");
      for (let k = 1; k < parts.length; k += 2) {
        const pattern = parts[k];
        const tail = parts[k + 1] || "";
        const m = OPTS.exec(tail);
        const opts = m[0];
        const rest = tail.slice(opts.length).trim();
        const last = k + 2 >= parts.length;
        add(i + 1, raw, category, pattern, opts, last ? rest : "");
        category = rest;
      }
    });
    return { hands, errors };
  }

  function formatHandLine(h) {
    const opts = [h.concealed ? "C" : "X", h.points || "", h.slide ? "any" : ""].filter(Boolean).join(" ");
    return [h.category || "", h.pattern, opts, h.name || ""].join(" | ").replace(/( \| )+$/, "");
  }

  function sortRack(rack) {
    return rack.slice().sort((a, b) => ORDER[a] - ORDER[b]);
  }

  const api = { SUITS, TILES, TILE, HAND_SIZE, parsePattern, variants, exposureTile, bestFor, rankHands, spareTiles, sortRack, tally, parseHandLines, formatHandLine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Mahj = api;
})(this);
