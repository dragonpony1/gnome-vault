// Turning "Austin, TX", "90210", or the phone's GPS into a place, plus today's weather.
// All free services that need no key and allow browser calls:
//   Open-Meteo geocoding + forecast (open-meteo.com), Zippopotam.us (US zip codes),
//   BigDataCloud's client-side reverse geocoder (city name from GPS).
// Every call can fail (offline, blocked); the app keeps working without them.
(function (root) {
  "use strict";
  const E = root.DateMeEngine;

  const US_STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
    DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
    VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  };
  const abbrOf = name => Object.keys(US_STATES).find(k => US_STATES[k].toLowerCase() === String(name || "").toLowerCase());

  async function getJSON(url, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || 8000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  function placeLabel(city, region, country) {
    if (country === "US") return city + (region ? ", " + (abbrOf(region) || region) : "");
    return [city, region && region !== city ? region : null].filter(Boolean).join(", ") || city;
  }

  function fromGeocoder(r) {
    return {
      city: r.name, region: r.admin1 || "", country: r.country_code || "",
      lat: r.latitude, lon: r.longitude, elevation: r.elevation, population: r.population || 0,
      label: placeLabel(r.name, r.admin1, r.country_code),
    };
  }

  // Open-Meteo search. "hint" is the part after a comma ("TX", "Texas", "Canada").
  async function geocode(name, hint, near) {
    const data = await getJSON("https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=" + encodeURIComponent(name));
    let list = data.results || [];
    if (!list.length) return null;
    if (hint) {
      const h = hint.trim().toLowerCase();
      const state = (US_STATES[hint.trim().toUpperCase()] || "").toLowerCase();
      const hit = list.filter(r => [r.admin1, r.country, r.country_code].some(v => v && (v.toLowerCase() === h || v.toLowerCase() === state)));
      if (hit.length) list = hit;
    }
    if (near) {
      const d = r => (r.latitude - near.lat) ** 2 + (r.longitude - near.lon) ** 2;
      list = list.slice().sort((a, b) => d(a) - d(b));
    } else {
      list = list.slice().sort((a, b) => (b.population || 0) - (a.population || 0));
    }
    return fromGeocoder(list[0]);
  }

  // "Austin", "Austin, TX", "Paris, France", "90210", "10001-1234"
  async function lookup(query) {
    const q = String(query || "").trim();
    if (!q) throw new Error("Type a city or zip code.");
    const zip = /^(\d{5})(-\d{4})?$/.exec(q);
    if (zip) {
      let data;
      try { data = await getJSON("https://api.zippopotam.us/us/" + zip[1]); } catch (e) { data = null; }
      const p = data && data.places && data.places[0];
      if (p) {
        const place = {
          city: p["place name"], region: p.state, country: "US",
          lat: Number(p.latitude), lon: Number(p.longitude), elevation: null, population: 0,
          label: p["place name"] + ", " + p["state abbreviation"], zip: zip[1],
        };
        // Population and elevation help guess what's around; nice to have, not needed.
        try {
          const g = await geocode(place.city, p["state abbreviation"], place);
          if (g) { place.population = g.population; place.elevation = g.elevation; }
        } catch (e) { /* fine without */ }
        return place;
      }
    }
    const [name, ...rest] = q.split(",");
    const place = await geocode(name.trim(), rest.join(",").trim(), null);
    if (!place) throw new Error("Couldn't find \"" + q + "\". Try a nearby bigger city.");
    return place;
  }

  function devicePosition() {
    return new Promise((yes, no) => {
      if (!navigator.geolocation) { no(new Error("This browser can't share location.")); return; }
      navigator.geolocation.getCurrentPosition(
        pos => yes({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        err => no(new Error(err.code === 1 ? "Location is turned off for this site. Type a city instead." : "Couldn't get your location. Type a city instead.")),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  }

  async function fromDevice() {
    const pos = await devicePosition();
    const place = { city: "", region: "", country: "", lat: pos.lat, lon: pos.lon, elevation: null, population: 0, label: "Near you" };
    try {
      const r = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.lat}&longitude=${pos.lon}&localityLanguage=en`);
      place.city = r.city || r.locality || "";
      place.region = r.principalSubdivision || "";
      place.country = r.countryCode || "";
      if (place.city) place.label = placeLabel(place.city, place.region, place.country);
    } catch (e) { /* keep "Near you" */ }
    if (place.city) {
      try {
        const g = await geocode(place.city, place.region, pos);
        if (g) { place.population = g.population; place.elevation = g.elevation; }
      } catch (e) { /* fine without */ }
    }
    return place;
  }

  async function weather(lat, lon) {
    const d = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`, 6000);
    const c = d.current || {};
    const tempC = typeof c.temperature_2m === "number" ? c.temperature_2m : null;
    return { tempC, code: c.weather_code, mood: E.weatherMood(c.weather_code, tempC), at: Date.now(), elevation: d.elevation };
  }

  // US (and a couple of others) read Fahrenheit.
  function formatTemp(tempC, country) {
    if (typeof tempC !== "number") return "";
    return ["US", "LR", "MM", "BS", "KY", "PW"].includes(country) ? Math.round(tempC * 9 / 5 + 32) + "°F" : Math.round(tempC) + "°C";
  }

  root.DateMeLocation = { lookup, fromDevice, weather, formatTemp, placeLabel };
})(this);
