// Common search: fetches Next.js data endpoint of pkmn.gg/search.
// Returns broader/looser results than the advanced endpoint, query-only.
//
// URL shape: https://www.pkmn.gg/_next/data/<buildId>/search.json?q=<query>
//
// The buildId rotates on every pkmn.gg deploy, so we resolve it lazily by
// scraping the homepage HTML and cache it in-process. On a stale-buildId
// failure we transparently refresh it once and retry.

const PKMN_HOST = "https://www.pkmn.gg";
const BUILD_ID_TTL_MS = 30 * 60 * 1000; // 30min
const PAGE_SIZE = 60;
const USER_AGENT =
  "Mozilla/5.0 (compatible; tcg-collection/1.0; +https://github.com/jaguvillar/tcg-collection)";

let cachedBuildId = null;
let cachedBuildIdAt = 0;
let inflightBuildId = null;

async function fetchBuildId() {
  const html = await $fetch(`${PKMN_HOST}/`, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    responseType: "text",
  });
  const match = typeof html === "string" && html.match(/"buildId":"([^"]+)"/);
  if (!match) {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not resolve pkmn.gg buildId for common search",
    });
  }
  return match[1];
}

async function getBuildId({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedBuildId && now - cachedBuildIdAt < BUILD_ID_TTL_MS) {
    return cachedBuildId;
  }
  if (inflightBuildId) return inflightBuildId;
  inflightBuildId = (async () => {
    try {
      const id = await fetchBuildId();
      cachedBuildId = id;
      cachedBuildIdAt = Date.now();
      return id;
    } finally {
      inflightBuildId = null;
    }
  })();
  return inflightBuildId;
}

async function fetchSearchJson(buildId, query) {
  return $fetch(`${PKMN_HOST}/_next/data/${buildId}/search.json`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    query: { q: query },
  });
}

// Walk the response tree and find the likeliest "cards" array. The pkmn.gg
// payload is a Next.js getServerSideProps blob, so the exact path may shift.
// We pick the largest array of objects that look like cards (have id + name).
function extractCards(data) {
  let best = null;
  let bestScore = 0;

  function looksLikeCard(obj) {
    if (!obj || typeof obj !== "object") return false;
    const hasId = "id" in obj || "cardId" in obj || "_id" in obj;
    const hasName = "name" in obj || "title" in obj;
    return hasId && hasName;
  }

  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) {
      if (node.length && node.every(looksLikeCard)) {
        const score = node.length;
        if (score > bestScore) {
          best = node;
          bestScore = score;
        }
      }
      for (const item of node) walk(item);
      return;
    }
    if (typeof node === "object") {
      for (const key of Object.keys(node)) walk(node[key]);
    }
  }

  walk(data);
  return best ?? [];
}

function normalize(card) {
  if (!card || typeof card !== "object") return card;
  // If pkmn.gg's common endpoint wraps cards (e.g. { card: {...}, variant }),
  // flatten to match the advanced strategy's shape.
  if (card.card && typeof card.card === "object") {
    const { card: inner, ...rest } = card;
    return { ...inner, ...rest };
  }
  return card;
}

export async function search(body = {}) {
  const query = String(body?.query ?? "").trim();
  const page = Math.max(1, Number(body?.page) || 1);

  if (!query) {
    return { value: [], hits: 0 };
  }

  let buildId = await getBuildId();
  let raw;
  try {
    raw = await fetchSearchJson(buildId, query);
  } catch (err) {
    // Stale buildId → Next.js returns 404. Refresh once and retry.
    if (err?.statusCode === 404 || err?.response?.status === 404) {
      buildId = await getBuildId({ force: true });
      raw = await fetchSearchJson(buildId, query);
    } else {
      throw err;
    }
  }

  const all = extractCards(raw).map(normalize);
  const hits = all.length;

  // pkmn.gg returns the full set in a single payload; paginate in-memory
  // so the front-end's loadMore() flow works identically across modes.
  const start = (page - 1) * PAGE_SIZE;
  const value = all.slice(start, start + PAGE_SIZE);

  return { value, hits };
}
