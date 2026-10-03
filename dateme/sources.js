// Where date ideas come from. The deck asks every enabled source for ideas, then the engine
// filters and scores them all the same way, so a new source needs no changes anywhere else.
//
// A source looks like this:
//   {
//     id: "my-source",                     // short and unique; prefixed onto its idea ids
//     label: "Nearby spots",
//     enabled: true,
//     ready(ctx) { return true },          // optional: skip this source unless it can run
//     async getIdeas(ctx) { return [...] } // raw ideas, same fields as ideas.js
//   }
// ctx holds { answers, location, weather, filters, today }. A raw idea from a real place can
// carry  spot: { name, address, url, lat, lon }  and the card will show it.
//
// GitHub Pages can't keep secrets, so never put an API key in these files. Put a tiny proxy
// in front of the paid API (a Cloudflare Worker or similar holds the key) and fetch that.
(function (root) {
  "use strict";
  const E = root.DateMeEngine;
  const sources = [];

  function register(source) {
    const i = sources.findIndex(s => s.id === source.id);
    if (i >= 0) sources[i] = source; else sources.push(source);
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error("timed out")), ms))]);
  }

  // Ask every enabled source at once. A slow or broken source never blocks the deck.
  async function collect(ctx, timeoutMs) {
    const live = sources.filter(s => s.enabled !== false && (!s.ready || s.ready(ctx)));
    const results = await Promise.allSettled(live.map(s =>
      withTimeout(Promise.resolve().then(() => s.getIdeas(ctx)), timeoutMs || 8000)));
    const ideas = [], errors = [];
    results.forEach((r, i) => {
      const s = live[i];
      if (r.status === "rejected") { errors.push({ source: s.id, error: String(r.reason && r.reason.message || r.reason) }); return; }
      for (const raw of r.value || []) {
        if (!raw || !raw.id || !raw.title) continue;
        const idea = E.normalizeIdea(raw, s.id);
        if (s.id !== "library" && !idea.id.startsWith(s.id + ":")) idea.id = s.id + ":" + idea.id;
        ideas.push(idea);
      }
    });
    return { ideas, errors };
  }

  // 1. The built-in library (ideas.js).
  register({ id: "library", label: "Built-in ideas", getIdeas: () => root.DATE_IDEAS || [] });

  // 2. Example: real nearby spots from a places API (off). Turn on by pointing PROXY at your
  //    proxy and setting enabled: true. The mapping below is the important part.
  register({
    id: "places",
    label: "Nearby spots",
    enabled: false,
    PROXY: "https://your-proxy.example.workers.dev/places",
    ready: ctx => !!(ctx.location && typeof ctx.location.lat === "number"),
    async getIdeas(ctx) {
      const { lat, lon } = ctx.location;
      const res = await fetch(`${this.PROXY}?lat=${lat}&lon=${lon}&types=park,museum,bowling_alley,ice_cream`);
      if (!res.ok) throw new Error("places " + res.status);
      const data = await res.json();
      // Map whatever the API returns into ideas. Tag them like ideas.js so they score well.
      return (data.places || []).map(p => ({
        id: p.id,
        emoji: { park: "🌳", museum: "🏛️", bowling_alley: "🎳", ice_cream: "🍦" }[p.type] || "📍",
        title: p.type === "park" ? `Picnic at ${p.name}` : `Go to ${p.name}`,
        desc: p.summary || p.address || "",
        cost: p.priceLevel != null ? p.priceLevel : 1,
        mins: 120,
        setting: p.type === "park" ? "outdoor" : "indoor",
        times: "afternoon evening",
        travel: p.distanceKm < 3 ? 1 : p.distanceKm < 40 ? 2 : 3,
        interests: p.type === "museum" ? "artsy nerdy" : p.type === "park" ? "outdoorsy" : "",
        love: "quality",
        spot: { name: p.name, address: p.address, url: p.url, lat: p.lat, lon: p.lon },
      }));
    },
  });

  // 3. Example: ideas written by an AI model (off). Same idea: your proxy calls the model with
  //    the profile and returns JSON in the ideas.js shape.
  register({
    id: "ai",
    label: "AI suggestions",
    enabled: false,
    PROXY: "https://your-proxy.example.workers.dev/ideas",
    async getIdeas(ctx) {
      const res = await fetch(this.PROXY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Send only what the model needs. The age is enough; don't send the birthdate.
          age: E.ageOn(ctx.answers.birthdate, ctx.today),
          answers: Object.assign({}, ctx.answers, { birthdate: undefined, name: undefined }),
          place: ctx.location ? { city: ctx.location.city, region: ctx.location.region, traits: ctx.location.traits } : null,
          season: E.seasonName(ctx.today, ctx.location && ctx.location.lat),
          weather: ctx.weather && ctx.weather.mood,
          count: 10,
        }),
      });
      if (!res.ok) throw new Error("ai " + res.status);
      return (await res.json()).ideas || [];
    },
  });

  root.DateMeSources = { register, collect, list: () => sources.slice() };
})(this);
