// Run with: node --test mahjong/test/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../engine.js");
const PRACTICE = require("../hands.js");

const hand = (pattern, extra = {}) => ({ pattern, groups: M.parsePattern(pattern), ...extra });

test("every practice hand parses to 14 tiles", () => {
  for (const h of PRACTICE) assert.doesNotThrow(() => M.parsePattern(h.pattern), h.name);
});

test("practice hands never need more of a tile than the set has, except with jokers", () => {
  for (const h of PRACTICE) {
    const v = M.variants(hand(h.pattern, h))[0];
    const need = M.tally(v.groups.flatMap(g => g.tiles));
    for (const [t, n] of Object.entries(need)) {
      if (n > M.TILE[t].max) assert.ok(v.groups.some(g => g.jokerable && g.tiles[0] === t && g.tiles.length === n), `${h.name}: ${t}`);
    }
  }
});

test("parse errors are friendly", () => {
  assert.throws(() => M.parsePattern("FF 1111a"), /6 tiles/);
  assert.throws(() => M.parsePattern("FF 11x1a 2222b 3333c 4"), /isn't a group/);
  assert.throws(() => M.parsePattern("FFa 1111a 2222b 3333c 44a"), /suit letter/);
});

test("a complete hand is 0 away", () => {
  const h = hand("FF 1111a 2222b 3333c", { slide: true });
  const rack = ["F", "F", "b4", "b4", "b4", "b4", "c5", "c5", "c5", "c5", "d6", "d6", "d6", "d6"];
  assert.equal(M.bestFor(h, rack).away, 0);
});

test("jokers fill kongs but not pairs", () => {
  const h = hand("FF 1111a 2222b 3333c", { slide: true });
  const rack = ["J", "J", "b1", "b1", "b1", "b1", "c2", "c2", "c2", "c2", "d3", "d3", "d3", "d3"];
  const best = M.bestFor(h, rack);
  assert.equal(best.away, 2);
  assert.equal(best.jokers, 0);
  assert.deepEqual(best.need, { F: 2 });
  const rack2 = ["F", "F", "J", "J", "b1", "b1", "c2", "c2", "c2", "c2", "d3", "d3", "d3", "d3"];
  const best2 = M.bestFor(h, rack2);
  assert.equal(best2.away, 0);
  assert.equal(best2.jokers, 2);
});

test("NEWS and 2026 can't use jokers", () => {
  const h = hand("2026a 2026b NNN SSS");
  const rack = ["J", "J", "J", "J", "J", "J", "J", "J", "N", "N", "N", "S", "S", "S"];
  assert.equal(M.bestFor(h, rack).away, 8);
});

test("natural tiles go to pairs before kongs", () => {
  // The lone 5 must cover the pair of 5s (jokers can't), so jokers go to the kong.
  const h = hand("11a 222a 3333a 444a 55a");
  const rack = ["c1", "c1", "c2", "c2", "c2", "J", "J", "J", "J", "c4", "c4", "c4", "c5"];
  const best = M.bestFor(h, rack);
  assert.equal(best.away, 1);
  assert.deepEqual(best.need, { c5: 1 });
});

test("sliding finds the right numbers and suits", () => {
  const h = hand("11a 222a 3333a 444a 55a", { slide: true });
  const rack = ["d5", "d5", "d6", "d6", "d6", "d7", "d7", "d7", "d7", "d8", "d8", "d8", "d9"];
  const best = M.bestFor(h, rack);
  assert.equal(best.away, 1);
  assert.equal(best.variant.shift, 4);
  assert.equal(best.variant.suits.a, "dot");
});

test("D follows its group's suit, 0 is always Soap", () => {
  const v = M.variants(hand("1111a DDDa 1111b DDDb")).find(v => v.suits.a === "crak" && v.suits.b === "bam");
  assert.deepEqual(v.groups.map(g => g.tiles[0]), ["c1", "RD", "b1", "GD"]);
  const y = M.variants(hand("222a 0000 2222b 666a"))[0];
  assert.equal(y.groups[1].tiles[0], "WD");
});

test("ranking puts the closest hand first, spare tiles skip jokers", () => {
  const hands = PRACTICE.map(h => ({ ...h, groups: M.parsePattern(h.pattern) }));
  const rack = ["N", "N", "N", "N", "E", "E", "E", "W", "W", "S", "S", "S", "J", "b5"];
  const ranked = M.rankHands(hands, rack);
  assert.equal(ranked[0].hand.id, "p-ws1");
  assert.equal(ranked[0].best.away, 1);
  assert.deepEqual(M.spareTiles(rack, ranked.slice(0, 1)), ["b5"]);
});

test("a locked group only fits hands with that exact group", () => {
  const evens = hand("222a 4444a 666a 8888a");
  const like = hand("FF 1111a 1111b 1111c", { slide: true });
  const locked = [["b4", "b4", "b4", "b4"]];
  const rack = ["b2", "b2", "b6", "b6", "b6", "b8", "b8", "b8", "J"];
  const e = M.bestFor(evens, rack, locked);
  assert.equal(e.away, 1); // one joker, but short a 2 and an 8
  assert.deepEqual(e.locked, [false, true, false, false]);
  assert.equal(e.variant.suits.a, "bam");
  // Four 4 Bams can be the "like numbers" kong too, but only with the 4s in bams.
  const l = M.bestFor(like, [], locked);
  assert.ok(l.variant.groups.some((g, gi) => l.locked[gi] && g.tiles[0] === "b4"));
  // A pung of 4s doesn't fit a hand that only has a kong of 4s.
  assert.equal(M.bestFor(evens, rack, [["b4", "b4", "b4"]]), null);
});

test("locking rules out concealed hands and keeps jokers in the group", () => {
  const conc = hand("FF 2468a 2468b 2468c", { concealed: true });
  assert.equal(M.bestFor(conc, [], [["F", "F", "F"]]), null);
  const winds = hand("NNNN EEE WWW SSSS");
  const best = M.bestFor(winds, ["E", "E", "E", "W", "W", "W", "S", "S", "S", "S"], [["N", "N", "J", "J"]]);
  assert.equal(best.away, 0);
  assert.equal(best.jokers, 2);
  assert.equal(best.used.J, undefined);
});

test("exposureTile accepts 3-5 of one tile plus jokers", () => {
  assert.equal(M.exposureTile(["b5", "J", "b5"]), "b5");
  assert.equal(M.exposureTile(["b5", "b5"]), null);
  assert.equal(M.exposureTile(["J", "J", "J"]), null);
  assert.equal(M.exposureTile(["b5", "b6", "b5"]), null);
});

test("ranking drops hands a locked group rules out", () => {
  const hands = PRACTICE.map(h => ({ ...h, groups: M.parsePattern(h.pattern) }));
  const ranked = M.rankHands(hands, [], [["N", "N", "N", "N"]]);
  assert.ok(ranked.length > 0);
  for (const r of ranked) assert.ok(!r.hand.concealed && r.hand.pattern.includes("NNNN"), r.hand.name);
});

test("pasted hand lines turn into hands, with errors per line", () => {
  const { hands, errors } = M.parseHandLines([
    "# my card",
    "2468 | FF 2222a 44b 66b 8888a | X 25 | Evens two suits",
    "Like numbers | FF 1111a 1111b 1111c | x 30 any",
    "",
    "Singles | NN EE WW SS 11a 11b 11c | C 50 any",
    "Quints | 11111a 2222b",
    "no bar here",
  ].join("\n"));
  assert.equal(hands.length, 3);
  assert.deepEqual(hands[0], { category: "2468", pattern: "FF 2222a 44b 66b 8888a", name: "Evens two suits", points: 25, concealed: false, slide: false });
  assert.equal(hands[1].slide, true);
  assert.equal(hands[2].concealed, true);
  assert.deepEqual(errors.map(e => e.line), [6, 7]);
  assert.match(errors[0].message, /9 tiles/);
});

test("a hand written out as a line reads back the same", () => {
  for (const h of PRACTICE) {
    const back = M.parseHandLines(M.formatHandLine(h)).hands[0];
    assert.equal(back.pattern, h.pattern);
    assert.equal(back.category, h.category);
    assert.equal(back.name, h.name);
    assert.equal(back.points, h.points);
    assert.equal(back.concealed, !!h.concealed);
    assert.equal(back.slide, !!h.slide);
  }
});

test("pasting survives the ways phones mangle copied text", () => {
  const text = [
    "2468 | FF 2222a 44b 66b 8888a | X 25",
    "2468 | 222a 444a 666a 888a DDa | C 30",
    "Any like numbers | FFFF 1111b 11c 1111a | X 25 any",
    "Math | 333a + 444a - 555a - 222a = 00 | C 30",
  ].join("\n");
  const ref = M.parseHandLines(text).hands;
  assert.equal(ref.length, 4);
  for (const mangled of [
    text.replace(/\n/g, "\r"),
    text.replace(/\n/g, " "),
    text.replace(/\n/g, " "),
    text.replace(/\n/g, ""),
    text.replace(/\|/g, "│"),
    text.replace(/\n/g, "\n\n"),
  ]) {
    const { hands, errors } = M.parseHandLines(mangled);
    assert.deepEqual(errors, []);
    assert.deepEqual(hands, ref);
  }
});
