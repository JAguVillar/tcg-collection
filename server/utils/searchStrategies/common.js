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
// Next.js data routes are picky: they require a real-browser UA + the
// x-nextjs-data hint, otherwise they 404 or return an empty redirect blob.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const BROWSER_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${PKMN_HOST}/`,
};

let cachedBuildId = null;
let cachedBuildIdAt = 0;
let inflightBuildId = null;

async function fetchBuildId() {
  const html = await $fetch(`${PKMN_HOST}/`, {
    headers: { ...BROWSER_HEADERS, Accept: "text/html" },
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
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json",
      // Without this header Next.js may answer with a redirect blob and
      // pageProps.cards comes back missing — see pkmn.gg's network panel.
      "x-nextjs-data": "1",
    },
    query: { q: query },
  });
}

// Walk the response tree and find the likeliest "cards" array. The pkmn.gg
// payload is a Next.js getServerSideProps blob, so the exact path may shift.
// We pick the largest array whose items look like cards — either flat card
// objects ({id, name, ...}) or wrapped ({card: {...}, variant?, ...}).
function looksLikeCard(obj) {
  if (!obj || typeof obj !== "object") return false;
  const inner = obj.card && typeof obj.card === "object" ? obj.card : obj;
  const hasId = "id" in inner || "cardId" in inner || "_id" in inner;
  const hasName =
    "name" in inner ||
    "title" in inner ||
    "supertype" in inner ||
    "images" in inner;
  return hasId && hasName;
}

function extractCards(data) {
  let best = null;
  let bestScore = 0;

  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) {
      if (node.length && node.every(looksLikeCard)) {
        if (node.length > bestScore) {
          best = node;
          bestScore = node.length;
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

// Compact shape summary used to debug payload changes from pkmn.gg.
function describeShape(node, depth = 0) {
  if (depth > 3 || node == null) return typeof node;
  if (Array.isArray(node)) {
    return `Array(${node.length})${
      node.length ? `<${describeShape(node[0], depth + 1)}>` : ""
    }`;
  }
  if (typeof node === "object") {
    const keys = Object.keys(node).slice(0, 12);
    return `{${keys
      .map((k) => `${k}: ${describeShape(node[k], depth + 1)}`)
      .join(", ")}${Object.keys(node).length > 12 ? ", …" : ""}}`;
  }
  return typeof node;
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

  if (!hits) {
    // First time we see a query come back empty — surface the shape so we
    // can adjust extractCards if pkmn.gg renamed keys.
    console.warn(
      `[common-search] no cards extracted for q="${query}" buildId=${buildId} shape=${describeShape(
        raw,
      )}`,
    );
  }

  // pkmn.gg returns the full set in a single payload; paginate in-memory
  // so the front-end's loadMore() flow works identically across modes.
  const start = (page - 1) * PAGE_SIZE;
  const value = all.slice(start, start + PAGE_SIZE);

  return { value, hits };
}
