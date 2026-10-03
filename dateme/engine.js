// Date Me idea engine: turns quiz answers + a place + today's weather into a ranked deck.
// No DOM here, so it also runs under Node for tests: node --test dateme/test/*.test.js
//
// Flow: normalizeIdea() every raw idea (from any source) → eligible() drops the ones that
// can't work (age, food, budget, season, place, filters) → scoreIdea() ranks the rest 1–99
// and says why → buildDeck() sorts them.
(function (root) {
  "use strict";

  const INTERESTS = {
    artsy: { label: "Artsy", emoji: "🎨" },
    sporty: { label: "Sporty", emoji: "🏀" },
    nerdy: { label: "Nerdy", emoji: "🤓" },
    musical: { label: "Musical", emoji: "🎵" },
    outdoorsy: { label: "Outdoorsy", emoji: "🌲" },
    gamer: { label: "Gamer", emoji: "🎮" },
  };
  const LOVE = {
    words: { label: "Words of affirmation", short: "kind words", emoji: "💬" },
    quality: { label: "Quality time", short: "quality time", emoji: "⏳" },
    gifts: { label: "Receiving gifts", short: "gifts", emoji: "🎁" },
    acts: { label: "Acts of service", short: "acts of service", emoji: "🤲" },
    touch: { label: "Physical touch", short: "physical touch", emoji: "🤝" },
  };
  const FOODS = {
    seafood: { label: "Seafood", emoji: "🦐" },
    spicy: { label: "Spicy food", emoji: "🌶️" },
    meat: { label: "Meat", emoji: "🥩" },
    dairy: { label: "Dairy", emoji: "🧀" },
    gluten: { label: "Gluten", emoji: "🍞" },
    sweets: { label: "Sweets", emoji: "🍬" },
    coffee: { label: "Coffee", emoji: "☕" },
  };
  // Things an area can have nearby. "near" on an idea needs at least one of these.
  const TRAITS = {
    water: { label: "Lake or river", emoji: "🏞️" },
    beach: { label: "Ocean beach", emoji: "🏖️" },
    trails: { label: "Hiking trails", emoji: "🥾" },
    downtown: { label: "A downtown", emoji: "🏙️" },
    farms: { label: "Farms & orchards", emoji: "🍎" },
    snow: { label: "Snowy winters", emoji: "❄️" },
  };
  const TIMES = {
    morning: { label: "Morning", emoji: "🌅" },
    afternoon: { label: "Afternoon", emoji: "☀️" },
    evening: { label: "Evening", emoji: "🌆" },
    night: { label: "Late night", emoji: "🌙" },
  };
  const COSTS = ["Free", "$", "$$", "$$$"];
  const COST_HINTS = ["Free", "Under $20", "$20–60", "$60+"];
  const TRAVEL = ["Stay in", "Close by", "Short drive", "Day trip"];
  const TRAVEL_HINTS = ["At home", "~15 min", "~45 min", "1 hr+"];
  const SETTINGS = { indoor: "Indoor", outdoor: "Outdoor", either: "Indoor or out" };
  const SEASONS = ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Fall", "Fall", "Fall", "Winter"];

  const DEFAULT_FILTERS = { costs: [0, 1, 2, 3], setting: "any", times: [], maxTravel: 3 };

  // ---------- Ideas ----------

  const words = v => Array.isArray(v) ? v.slice() : String(v || "").split(/\s+/).filter(Boolean);
  const clamp01 = n => Math.max(0, Math.min(1, Number(n)));
  const num = (v, d) => (v === undefined || v === null || v === "" || isNaN(v)) ? d : Number(v);

  // Fill in defaults and turn space-separated lists into arrays. Safe to call twice.
  function normalizeIdea(raw, source) {
    const times = words(raw.times);
    const idea = {
      id: String(raw.id),
      source: raw.source || source || "library",
      emoji: raw.emoji || "💘",
      title: String(raw.title || "Date idea"),
      desc: String(raw.desc || ""),
      cost: Math.max(0, Math.min(3, Math.round(num(raw.cost, 1)))),
      mins: Math.max(10, num(raw.mins, 120)),
      setting: SETTINGS[raw.setting] ? raw.setting : "either",
      times: times.length === 0 || times.includes("any") ? Object.keys(TIMES) : times.filter(t => TIMES[t]),
      travel: Math.max(0, Math.min(3, Math.round(num(raw.travel, 1)))),
      adventure: clamp01(num(raw.adventure, .5)),
      active: clamp01(num(raw.active, .5)),
      crowd: clamp01(num(raw.crowd, .5)),
      food: clamp01(num(raw.food, 0)),
      interests: words(raw.interests).filter(i => INTERESTS[i]),
      love: words(raw.love).filter(l => LOVE[l]),
      near: words(raw.near).filter(t => TRAITS[t]),
      months: words(raw.months).map(Number).filter(m => m >= 1 && m <= 12),
      foods: words(raw.foods).map(f => String(f).toLowerCase()),
      minAge: num(raw.minAge, 0),
      bestWhen: words(raw.bestWhen),
    };
    // A real place from a places API or an AI source: { name, address, url, lat, lon }.
    if (raw.spot && raw.spot.name) idea.spot = Object.assign({}, raw.spot);
    return idea;
  }

  // ---------- Profile ----------

  function ageOn(birthdate, today) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate || "");
    if (!m) return null;
    const now = today || new Date();
    let age = now.getFullYear() - Number(m[1]);
    const mo = now.getMonth() + 1, d = now.getDate();
    if (mo < Number(m[2]) || (mo === Number(m[2]) && d < Number(m[3]))) age--;
    return age;
  }

  // Quiz answers → numbers from 0 to 1 the scorer can compare with an idea.
  // Five-step scales are stored 0–4: social (homebody → out and about), adventure (chill →
  // adventurous), active (low-key → active), crowd (quiet → crowds). Outdoorsy is 1–10.
  function profileVector(a) {
    a = a || {};
    return {
      outdoors: (num(a.outdoorsy, 5.5) - 1) / 9,
      social: num(a.social, 2) / 4,
      adventure: num(a.adventure, 2) / 4,
      active: num(a.active, 2) / 4,
      crowd: num(a.crowd, 2) / 4,
      foodie: num(a.foodie, 1) / 3,
      budget: num(a.budget, 3),
      interests: words(a.interests),
      love: a.love || null,
      dislikes: words(a.dislikes),
      // Typed-in dislikes, singular so "tacos" also catches "taco crawl".
      dislikeText: String(a.dislikesOther || "").toLowerCase().split(/[,;\n]+|\band\b/).map(s => s.trim())
        .map(s => s.endsWith("oes") ? s.slice(0, -2) : s.endsWith("s") && !s.endsWith("ss") ? s.slice(0, -1) : s)
        .filter(s => s.length > 2),
    };
  }

  // ---------- Place, season, weather ----------

  // Month (1–12) as it feels where they are: south of the equator the seasons are flipped.
  function seasonalMonth(date, lat) {
    const m = (date || new Date()).getMonth() + 1;
    return typeof lat === "number" && lat < 0 ? ((m + 5) % 12) + 1 : m;
  }
  function seasonName(date, lat) { return SEASONS[seasonalMonth(date, lat) - 1]; }

  // A first guess at what's around a place, from what a geocoder tells us. The person
  // can change these on the location screen, so the guess only has to be reasonable.
  function guessTraits(place) {
    const t = [];
    if (!place) return t;
    if ((place.population || 0) >= 50000) t.push("downtown");
    if ((place.elevation || 0) >= 900) t.push("trails");
    const lat = Math.abs(place.lat || 0);
    if (lat >= 39 || (place.elevation || 0) >= 1500) t.push("snow");
    if (place.population && place.population < 15000) t.push("farms");
    return t;
  }

  // WMO weather code + temperature (°C) → one word the scorer understands.
  function weatherMood(code, tempC) {
    code = Number(code);
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "rain";
    if (typeof tempC === "number" && tempC <= 3) return "cold";
    if (typeof tempC === "number" && tempC >= 32) return "hot";
    if (code <= 2 && (typeof tempC !== "number" || (tempC >= 12 && tempC <= 30))) return "nice";
    return "meh";
  }
  const MOOD_TEXT = {
    rain: { emoji: "🌧️", line: "Rainy today" },
    snow: { emoji: "🌨️", line: "Snowy today" },
    cold: { emoji: "🥶", line: "Cold today" },
    hot: { emoji: "🥵", line: "Hot today" },
    nice: { emoji: "☀️", line: "Nice out today" },
    meh: { emoji: "⛅", line: "Cloudy today" },
  };

  // ---------- Matching ----------

  function fillText(text, ctx) {
    const city = ctx && ctx.location && ctx.location.city;
    return String(text).replace(/\{city\}/g, city || "town");
  }

  // Can this idea work at all? Returns null if yes, or a short reason if not.
  function whyNot(idea, ctx) {
    const p = ctx.vector || profileVector(ctx.answers);
    const age = ctx.age != null ? ctx.age : ageOn(ctx.answers && ctx.answers.birthdate, ctx.today);
    if (idea.minAge && (age == null || age < idea.minAge)) return "age";
    if (idea.foods.some(f => p.dislikes.includes(f))) return "food";
    if (p.dislikeText.length) {
      const hay = (idea.title + " " + idea.desc + " " + idea.foods.join(" ")).toLowerCase();
      if (p.dislikeText.some(w => hay.includes(w))) return "food";
    }
    if (idea.cost > p.budget) return "budget";
    const loc = ctx.location;
    if (idea.months.length && !idea.months.includes(seasonalMonth(ctx.today, loc && loc.lat))) return "season";
    if (idea.near.length && loc && Array.isArray(loc.traits) && !idea.near.some(t => loc.traits.includes(t))) return "place";
    const f = Object.assign({}, DEFAULT_FILTERS, ctx.filters);
    if (!f.costs.includes(idea.cost)) return "filter";
    if (f.setting !== "any" && idea.setting !== "either" && idea.setting !== f.setting) return "filter";
    if (f.times.length && !idea.times.some(t => f.times.includes(t))) return "filter";
    if (idea.travel > f.maxTravel) return "filter";
    return null;
  }
  const eligible = (idea, ctx) => whyNot(idea, ctx) === null;

  // Small, stable randomness so ties shuffle differently each day but not on every render.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  // 1–99, plus the top reasons it's a match (best first).
  function scoreIdea(idea, ctx) {
    const p = ctx.vector || profileVector(ctx.answers);
    const reasons = [];
    const why = (pts, text) => { if (text) reasons.push({ pts, text }); return pts; };
    let s = 52;

    // Outdoorsy: compare with indoor (0), either (.5), outdoor (1).
    const ideaOut = idea.setting === "outdoor" ? 1 : idea.setting === "indoor" ? 0 : .5;
    const outFit = 1 - 2 * Math.abs(p.outdoors - ideaOut);
    s += why(outFit * 9, outFit > .5 && ideaOut === 1 ? "Gets them outside" : outFit > .5 && ideaOut === 0 ? "Cozy and indoors" : "");

    // Homebody ↔ out and about, from how far the idea goes.
    const ideaSocial = [0, .6, .85, 1][idea.travel];
    const socialFit = 1 - 2 * Math.abs(p.social - ideaSocial);
    s += why(socialFit * 6, socialFit > .6 && idea.travel === 0 ? "Perfect for a homebody" : socialFit > .6 && idea.travel >= 2 ? "Gets you out and about" : "");

    const dims = [
      ["adventure", "Adventurous pick", "Nice and chill"],
      ["active", "Gets you moving", "Low-key"],
      ["crowd", "Lively crowd", "Quiet, just you two"],
    ];
    for (const [k, hi, lo] of dims) {
      const fit = 1 - 2 * Math.abs(p[k] - idea[k]);
      s += why(fit * 6, fit > .6 && p[k] >= .75 && idea[k] >= .7 ? hi : fit > .6 && p[k] <= .25 && idea[k] <= .3 ? lo : "");
    }

    const shared = idea.interests.filter(i => p.interests.includes(i));
    if (shared.length) {
      s += why(Math.min(shared.length, 2) * 9, "Into " + shared.map(i => INTERESTS[i].label.toLowerCase()).join(" + ") + " stuff");
    } else if (idea.interests.length && p.interests.length) s -= 3;

    if (p.love && idea.love.includes(p.love)) s += why(10, "Speaks " + LOVE[p.love].short);

    if (idea.food > 0) {
      const foodFit = (p.foodie - .35) * idea.food * 18;
      s += why(foodFit, foodFit >= 6 ? "Foodie approved" : "");
    }

    const loc = ctx.location;
    if (idea.months.length) s += why(7, "In season: " + seasonName(ctx.today, loc && loc.lat).toLowerCase());
    if (idea.near.length) {
      const have = loc && Array.isArray(loc.traits) ? idea.near.filter(t => loc.traits.includes(t)) : [];
      if (have.length) s += why(5, "Uses your " + TRAITS[have[0]].label.toLowerCase());
      else s -= 6; // no place set yet, so we can't be sure it exists nearby
    }

    const mood = ctx.weather && ctx.weather.mood;
    if (mood) {
      if (idea.bestWhen.includes(mood)) s += why(14, mood === "rain" ? "Made for a rainy day" : mood === "snow" ? "Made for a snow day" : "Made for a hot day");
      else if (["rain", "snow", "cold"].includes(mood)) {
        if (idea.setting === "outdoor") s -= 14;
        else if (idea.setting === "indoor") s += why(5, mood === "cold" ? "Warm inside" : "Stays dry");
      } else if (mood === "hot" && idea.setting === "outdoor" && idea.active > .6) s -= 8;
      else if (mood === "nice" && idea.setting === "outdoor") s += why(6, "Great weather for it");
    }

    const seed = ctx.seed != null ? ctx.seed : (ctx.today || new Date()).toISOString().slice(0, 10);
    s += (hash(idea.id + seed) - .5) * 8;
    reasons.sort((a, b) => b.pts - a.pts);
    // Ease into the top so great matches still spread out instead of piling up at 99.
    if (s > 86) s = 86 + 13 * (1 - Math.exp(-(s - 86) / 14));
    return { score: Math.round(Math.max(1, Math.min(99, s))), reasons: reasons.filter(r => r.pts > 0).map(r => r.text).slice(0, 3) };
  }

  // Everything that fits, best first. Pass `exclude` (a Set of ids) to skip saved/skipped ones.
  function buildDeck(ideas, ctx, exclude) {
    const c = Object.assign({}, ctx);
    c.vector = profileVector(c.answers);
    c.age = ageOn(c.answers && c.answers.birthdate, c.today);
    if (c.seed == null) c.seed = (c.today || new Date()).toISOString().slice(0, 10);
    const seen = new Set();
    const out = [];
    for (const raw of ideas) {
      const idea = raw.times && Array.isArray(raw.times) && Array.isArray(raw.near) ? raw : normalizeIdea(raw);
      if (seen.has(idea.id) || (exclude && exclude.has(idea.id))) continue;
      seen.add(idea.id);
      if (!eligible(idea, c)) continue;
      out.push(Object.assign({ idea }, scoreIdea(idea, c)));
    }
    return out.sort((a, b) => b.score - a.score);
  }

  // How many ideas each hard rule removes. Handy for "why is my deck empty?"
  function tally(ideas, ctx) {
    const c = Object.assign({}, ctx, { vector: profileVector(ctx.answers), age: ageOn(ctx.answers && ctx.answers.birthdate, ctx.today) });
    const t = {};
    for (const raw of ideas) {
      const r = whyNot(normalizeIdea(raw), c) || "ok";
      t[r] = (t[r] || 0) + 1;
    }
    return t;
  }

  // ---------- Labels ----------

  function formatTime(mins) {
    if (mins >= 2000) return "Weekend";
    if (mins >= 1000) return "Overnight";
    if (mins >= 360) return "All day";
    if (mins < 60) return mins + " min";
    const h = Math.round(mins / 30) / 2;
    return h === 1 ? "1 hr" : h + " hrs";
  }
  const formatCost = c => COSTS[c];
  const settingLabel = s => SETTINGS[s] || SETTINGS.either;

  function pickRandom(list, rand) {
    if (!list || !list.length) return null;
    return list[Math.floor((rand || Math.random)() * list.length)];
  }

  const api = {
    INTERESTS, LOVE, FOODS, TRAITS, TIMES, COSTS, COST_HINTS, TRAVEL, TRAVEL_HINTS, SETTINGS, MOOD_TEXT, DEFAULT_FILTERS,
    normalizeIdea, ageOn, profileVector, seasonalMonth, seasonName, guessTraits, weatherMood,
    fillText, whyNot, eligible, scoreIdea, buildDeck, tally, formatTime, formatCost, settingLabel, pickRandom,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DateMeEngine = api;
})(this);
