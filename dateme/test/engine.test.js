// Run with: node --test dateme/test/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const IDEAS = require("../ideas.js");

const OCT = new Date(2026, 9, 3);  // a fall Saturday
const JAN = new Date(2026, 0, 10);
const JUL = new Date(2026, 6, 10);

const answers = (extra = {}) => Object.assign({
  name: "Sam", birthdate: "2000-05-01", outdoorsy: 5, social: 2, adventure: 2, budget: 3,
  foodie: 1, dislikes: [], dislikesOther: "", active: 2, interests: [], crowd: 2, love: "quality",
}, extra);
const deck = (a, extra = {}) => E.buildDeck(IDEAS, Object.assign({ answers: a, today: OCT, location: null, weather: null, filters: null }, extra));
const ids = d => d.map(x => x.idea.id);

test("the library has 150+ ideas with unique ids", () => {
  assert.ok(IDEAS.length >= 150, `only ${IDEAS.length} ideas`);
  assert.equal(new Set(IDEAS.map(i => i.id)).size, IDEAS.length);
});

test("every idea uses only known tags", () => {
  for (const raw of IDEAS) {
    const i = E.normalizeIdea(raw);
    const where = raw.id;
    assert.match(raw.id, /^[a-z0-9-]+$/, where);
    assert.ok(raw.title && raw.desc && raw.emoji, where);
    assert.ok(["indoor", "outdoor", "either"].includes(raw.setting), where + " setting");
    for (const k of ["cost", "mins", "travel", "adventure", "active", "crowd"]) assert.equal(typeof raw[k], "number", where + " " + k);
    assert.ok(raw.times, where + " times");
    const count = (s) => String(s || "").split(/\s+/).filter(Boolean).length;
    assert.equal(i.interests.length, count(raw.interests), where + " interests");
    assert.equal(i.love.length, count(raw.love), where + " love");
    assert.ok(i.love.length > 0, where + " needs a love language");
    assert.equal(i.near.length, count(raw.near), where + " near");
    assert.equal(i.months.length, count(raw.months), where + " months");
    assert.ok(i.foods.every(f => E.FOODS[f]), where + " foods");
    assert.ok(i.times.length > 0 && (raw.times === "any" || i.times.length === count(raw.times)), where + " times");
    assert.ok(i.bestWhen.every(w => ["rain", "snow", "hot"].includes(w)), where + " bestWhen");
  }
});

test("there are ideas for every budget, interest, and love language", () => {
  const all = IDEAS.map(r => E.normalizeIdea(r));
  for (let c = 0; c <= 3; c++) assert.ok(all.filter(i => i.cost === c).length >= 10, "cost " + c);
  for (const k of Object.keys(E.INTERESTS)) assert.ok(all.filter(i => i.interests.includes(k)).length >= 10, k);
  for (const k of Object.keys(E.LOVE)) assert.ok(all.filter(i => i.love.includes(k)).length >= 8, k);
  assert.ok(all.filter(i => i.cost === 0).length >= 40, "plenty of free ideas");
});

test("anything with alcohol is 21+", () => {
  const boozy = /\b(bar|brewery|wine|cocktail|pub|speakeasy|beer|sip)\b/i;
  for (const raw of IDEAS) {
    if (boozy.test(raw.title + " " + raw.desc) && !/all-ages|milkshake|smoothie|toppings/i.test(raw.title + " " + raw.desc)) {
      assert.ok(raw.minAge >= 21, raw.id + " mentions alcohol but isn't 21+");
    }
  }
});

test("age works from a birthdate", () => {
  assert.equal(E.ageOn("2008-10-03", OCT), 18);
  assert.equal(E.ageOn("2008-10-04", OCT), 17);
  assert.equal(E.ageOn("nope", OCT), null);
});

test("under 21 never sees 21+ ideas; under 18 never sees 18+", () => {
  const at = bd => deck(answers({ birthdate: bd })).map(x => x.idea);
  const teen = at("2010-01-01"), nineteen = at("2007-01-01"), adult = at("1999-01-01");
  assert.ok(teen.every(i => i.minAge < 18));
  assert.ok(nineteen.every(i => i.minAge < 21));
  assert.ok(nineteen.some(i => i.minAge === 18));
  assert.ok(adult.some(i => i.minAge === 21));
});

test("a missing birthdate hides age-limited ideas", () => {
  assert.ok(deck(answers({ birthdate: "" })).every(x => !x.idea.minAge));
});

test("disliked foods rule ideas out, including typed-in ones", () => {
  const d = ids(deck(answers({ dislikes: ["seafood", "coffee"] })));
  assert.ok(!d.includes("sushi-making"));
  assert.ok(!d.includes("coffee-crawl"));
  assert.ok(ids(deck(answers())).includes("sushi-making"));
  const typed = ids(deck(answers({ dislikesOther: "tacos, pizza" })));
  assert.ok(!typed.includes("taco-crawl"));
  assert.ok(!typed.includes("homemade-pizza"));
});

test("budget is a ceiling", () => {
  assert.ok(deck(answers({ budget: 0 })).every(x => x.idea.cost === 0));
  assert.ok(deck(answers({ budget: 1 })).every(x => x.idea.cost <= 1));
});

test("seasonal ideas only show in season, and seasons flip south of the equator", () => {
  assert.ok(ids(deck(answers())).includes("pumpkin-patch"));
  assert.ok(!ids(deck(answers(), { today: JAN })).includes("pumpkin-patch"));
  const sydney = { label: "Sydney", city: "Sydney", lat: -33.9, lon: 151.2, traits: ["beach", "downtown"] };
  assert.ok(!ids(deck(answers(), { location: sydney })).includes("pumpkin-patch"));
  assert.ok(ids(deck(answers(), { location: sydney, today: JAN })).includes("beach-day"));
  assert.equal(E.seasonName(JUL, 40), "Summer");
  assert.equal(E.seasonName(JUL, -33), "Winter");
});

test("ideas that need a place only show where the place has it", () => {
  const dry = { label: "Phoenix", city: "Phoenix", lat: 33.4, lon: -112, traits: ["downtown"] };
  const lakes = { label: "Madison", city: "Madison", lat: 43.07, lon: -89.4, traits: ["water", "downtown"] };
  assert.ok(!ids(deck(answers(), { today: JUL, location: dry })).includes("kayak"));
  assert.ok(ids(deck(answers(), { today: JUL, location: lakes })).includes("kayak"));
  // With no place set we can't rule it out, so it stays (lower down).
  assert.ok(ids(deck(answers(), { today: JUL })).includes("kayak"));
});

test("filters: setting, time of day, distance, cost", () => {
  const f = filters => deck(answers(), { filters: Object.assign({}, E.DEFAULT_FILTERS, filters) }).map(x => x.idea);
  assert.ok(f({ setting: "indoor" }).every(i => i.setting !== "outdoor"));
  assert.ok(f({ setting: "outdoor" }).every(i => i.setting !== "indoor"));
  assert.ok(f({ times: ["morning"] }).every(i => i.times.includes("morning")));
  assert.ok(f({ maxTravel: 0 }).every(i => i.travel === 0));
  assert.ok(f({ costs: [0, 2] }).every(i => i.cost === 0 || i.cost === 2));
  assert.ok(f({ maxTravel: 0 }).length >= 30, "lots to do at home");
});

test("scoring follows the profile", () => {
  const rank = (a, id) => ids(deck(a)).indexOf(id);
  const outdoorsy = answers({ outdoorsy: 10, adventure: 4, active: 4, interests: ["outdoorsy", "sporty"], social: 4, crowd: 1 });
  const homebody = answers({ outdoorsy: 1, adventure: 0, active: 0, interests: ["gamer", "nerdy"], social: 0, crowd: 0 });
  assert.ok(rank(outdoorsy, "sunrise-hike") < rank(homebody, "sunrise-hike"));
  assert.ok(rank(homebody, "board-game-night") < rank(outdoorsy, "board-game-night"));
  const top = deck(homebody).slice(0, 15).map(x => x.idea);
  assert.ok(top.filter(i => i.setting !== "outdoor").length >= 12, "homebody top picks are mostly indoors");
});

test("scores are 1–99, sorted, and come with reasons", () => {
  const d = deck(answers({ interests: ["nerdy"], love: "words" }));
  for (let k = 1; k < d.length; k++) assert.ok(d[k - 1].score >= d[k].score);
  assert.ok(d.every(x => x.score >= 1 && x.score <= 99));
  const letters = d.find(x => x.idea.id === "write-letters");
  assert.ok(letters.reasons.some(r => /kind words/.test(r)));
});

test("weather moves outdoor ideas down when it rains and boosts rainy-day ideas", () => {
  const place = { label: "Austin", city: "Austin", lat: 30.3, lon: -97.7, traits: ["downtown", "water"] };
  const rainy = deck(answers(), { location: place, weather: { mood: "rain" } });
  const nice = deck(answers(), { location: place, weather: { mood: "nice" } });
  const pos = (d, id) => ids(d).indexOf(id);
  assert.ok(pos(rainy, "sunset-picnic") > pos(nice, "sunset-picnic"));
  assert.ok(pos(rainy, "blanket-fort-movies") < pos(nice, "blanket-fort-movies"));
  assert.ok(rainy.find(x => x.idea.id === "rain-walk").reasons.includes("Made for a rainy day"));
});

test("weather codes map to moods", () => {
  assert.equal(E.weatherMood(63, 15), "rain");
  assert.equal(E.weatherMood(73, -2), "snow");
  assert.equal(E.weatherMood(0, 22), "nice");
  assert.equal(E.weatherMood(0, 36), "hot");
  assert.equal(E.weatherMood(3, 1), "cold");
});

test("{city} fills in, or falls back to 'town'", () => {
  assert.equal(E.fillText("Explore {city}", { location: { city: "Boise" } }), "Explore Boise");
  assert.equal(E.fillText("Explore {city}", { location: null }), "Explore town");
});

test("ideas from other sources normalize and can carry a real spot", () => {
  const i = E.normalizeIdea({ id: "abc", title: "Picnic at Zilker Park", times: "afternoon", interests: "outdoorsy bogus",
    spot: { name: "Zilker Park", lat: 30.26, lon: -97.77 } }, "places");
  assert.equal(i.source, "places");
  assert.deepEqual(i.interests, ["outdoorsy"]);
  assert.equal(i.spot.name, "Zilker Park");
  assert.ok(E.buildDeck([i], { answers: answers(), today: OCT }).length === 1);
});

test("deck skips excluded ids and dedupes", () => {
  const d = E.buildDeck(IDEAS.concat(IDEAS), { answers: answers(), today: OCT }, new Set(["sunrise-hike"]));
  assert.ok(!ids(d).includes("sunrise-hike"));
  assert.equal(new Set(ids(d)).size, d.length);
});

test("time labels read naturally", () => {
  assert.equal(E.formatTime(45), "45 min");
  assert.equal(E.formatTime(60), "1 hr");
  assert.equal(E.formatTime(90), "1.5 hrs");
  assert.equal(E.formatTime(180), "3 hrs");
  assert.equal(E.formatTime(480), "All day");
  assert.equal(E.formatTime(1440), "Overnight");
});

test("trait guesses from a geocoder result", () => {
  assert.deepEqual(E.guessTraits({ lat: 39.7, elevation: 1609, population: 700000 }).sort(), ["downtown", "snow", "trails"]);
  assert.deepEqual(E.guessTraits({ lat: 25.8, elevation: 2, population: 450000 }), ["downtown"]);
});
