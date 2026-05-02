#!/usr/bin/env node
// Probe pkmn.gg search endpoints to see which are still live and what shape they return.
// Run: node scripts/probe-pkmn.js [query]

const query = process.argv[2] ?? "victini";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36";
const baseHeaders = {
  "User-Agent": UA,
  Accept: "application/json,text/html,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.pkmn.gg/",
};

function summarize(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (depth >= 1) return `{${keys.slice(0, 8).join(", ")}${keys.length > 8 ? ", …" : ""}}`;
    return `{\n${keys.map((k) => `    ${k}: ${summarize(value[k], depth + 1)}`).join(",\n")}\n  }`;
  }
  if (typeof value === "string") return JSON.stringify(value.slice(0, 60));
  return String(value);
}

async function probeOld() {
  console.log("\n=== OLD endpoint: POST /api/search/advanced ===");
  const body = {
    query,
    cardTypes: [],
    subTypes: [],
    sets: [],
    energyTypes: [],
    rarities: [],
    weaknessTypes: [],
    resistanceTypes: [],
    retreatCosts: [],
    hitPoints: [],
    nationalPokedexNumbers: [],
    attackQuery: null,
    numberQuery: null,
    abilityQuery: null,
    evolvesFromQuery: null,
    page: 1,
    isAscending: true,
    sortField: 7,
    artists: [],
    collectionMode: false,
    userId: "27d09d531bb7cd8eac4a6b2bd1fe0701",
    category: "EN",
    separateVariants: true,
  };
  try {
    const res = await fetch("https://www.pkmn.gg/api/search/advanced", {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log("status:", res.status);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log("hits:", json?.hits, "value.length:", json?.value?.length);
      console.log("top-level keys:", Object.keys(json));
      if (json?.value?.[0]) console.log("first card keys:", Object.keys(json.value[0]).slice(0, 20));
    } catch {
      console.log("non-JSON body, first 300 chars:", text.slice(0, 300));
    }
  } catch (err) {
    console.log("error:", err.message);
  }
}

async function fetchBuildId() {
  console.log("\n=== Resolving Next.js buildId from homepage ===");
  const res = await fetch("https://www.pkmn.gg/", { headers: baseHeaders });
  console.log("status:", res.status);
  const html = await res.text();
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) {
    console.log("buildId NOT found. First 300 chars of HTML:", html.slice(0, 300));
    return null;
  }
  console.log("buildId:", m[1]);
  return m[1];
}

async function probeNew(buildId) {
  console.log("\n=== NEW endpoint: GET /_next/data/<buildId>/search.json?q=… ===");
  const url = `https://www.pkmn.gg/_next/data/${buildId}/search.json?q=${encodeURIComponent(query)}`;
  console.log("url:", url);
  try {
    const res = await fetch(url, { headers: baseHeaders });
    console.log("status:", res.status);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log("top shape:", summarize(json));
      const pp = json?.pageProps;
      if (pp) {
        console.log("pageProps keys:", Object.keys(pp));
        for (const k of Object.keys(pp)) {
          const v = pp[k];
          if (Array.isArray(v) && v.length && typeof v[0] === "object") {
            console.log(`  pageProps.${k}[0] keys:`, Object.keys(v[0]).slice(0, 20));
          }
        }
      }
    } catch {
      console.log("non-JSON body, first 300 chars:", text.slice(0, 300));
    }
  } catch (err) {
    console.log("error:", err.message);
  }
}

(async () => {
  console.log(`Query: ${query}`);
  await probeOld();
  const buildId = await fetchBuildId();
  if (buildId) await probeNew(buildId);
})();
