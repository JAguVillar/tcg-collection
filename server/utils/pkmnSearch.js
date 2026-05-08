export const PKMN_ADVANCED_API_URL = "https://api.tcg.gg/pkmn/v1/search/advanced";
export const PKMN_SITE_URL = "https://www.pkmn.gg";

const BUILD_ID_CACHE_TTL_MS = 10 * 60 * 1000;
let cachedBuildId = null;
let cachedBuildIdAt = 0;

export const DEFAULT_SEARCH_BODY = {
  query: "",
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
  searchMode: "advanced",
};

function normalizeCards(results) {
  if (!Array.isArray(results)) return [];

  return results.map((item) => {
    if (item && typeof item === "object" && item.card && typeof item.card === "object") {
      const { card, ...rest } = item;
      return { ...card, ...rest };
    }
    return item;
  });
}

function resolveSearchMode(body = {}) {
  return body?.searchMode === "common" ? "common" : "advanced";
}

function parsePositiveInt(value, fallback = 1) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
}

async function resolveBuildId() {
  const now = Date.now();
  if (cachedBuildId && now - cachedBuildIdAt < BUILD_ID_CACHE_TTL_MS) {
    return cachedBuildId;
  }

  const html = await $fetch(PKMN_SITE_URL, { responseType: "text" });
  const match = html.match(/"buildId":"([^"]+)"/);
  if (!match?.[1]) {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not resolve pkmn.gg build id",
    });
  }

  cachedBuildId = match[1];
  cachedBuildIdAt = now;
  return cachedBuildId;
}

export function clearBuildIdCache() {
  cachedBuildId = null;
  cachedBuildIdAt = 0;
}

export function buildSearchPayload(body = {}) {
  const payload = {
    ...DEFAULT_SEARCH_BODY,
    ...body,
  };

  if (payload.artist && (!Array.isArray(payload.artists) || !payload.artists.length)) {
    payload.artists = [payload.artist];
  }
  delete payload.artist;
  delete payload.searchMode;

  return payload;
}

async function searchCardsAdvanced(body = {}) {
  const payload = buildSearchPayload(body);

  const data = await $fetch(PKMN_ADVANCED_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  return {
    ...data,
    value: normalizeCards(data?.value),
    source: "advanced",
  };
}

async function searchCardsCommon(body = {}) {
  const buildId = await resolveBuildId();
  const query = String(body?.query ?? "").trim();
  const page = parsePositiveInt(body?.page, 1);
  const url = `${PKMN_SITE_URL}/_next/data/${buildId}/search.json`;

  const data = await $fetch(url, {
    method: "GET",
    query: {
      q: query,
      page,
    },
  });

  const pageProps = data?.pageProps ?? {};
  const count = Number(pageProps.count ?? 0);
  const totalPages = parsePositiveInt(pageProps.totalPages, 1);

  return {
    message: "success",
    code: 200,
    value: normalizeCards(pageProps.results),
    hits: Number.isFinite(count) ? count : 0,
    page: parsePositiveInt(pageProps.page, page),
    totalPages,
    source: "common",
    unsupportedFilters: [
      "artists",
      "sets",
      "sortField",
      "isAscending",
      "separateVariants",
      "attackQuery",
      "abilityQuery",
      "evolvesFromQuery",
    ],
  };
}

export async function searchCards(body = {}) {
  const mode = resolveSearchMode(body);
  if (mode === "common") {
    try {
      return await searchCardsCommon(body);
    } catch (_err) {
      clearBuildIdCache();
      return searchCardsAdvanced(body);
    }
  }
  return searchCardsAdvanced(body);
}

export async function collectAllCards(body = {}) {
  const firstPage = buildSearchPayload(body).page ?? 1;
  const mode = resolveSearchMode(body);

  let page = Number.isFinite(firstPage) && firstPage > 0 ? firstPage : 1;
  let hits = null;
  const cards = [];
  let totalPages = null;

  while (true) {
    const data = await searchCards({ ...body, page });
    const pageCards = Array.isArray(data?.value) ? data.value : [];

    if (hits === null && Number.isFinite(Number(data?.hits))) {
      hits = Number(data.hits);
    }

    if (!pageCards.length) break;

    cards.push(...pageCards);

    if (mode === "common") {
      if (totalPages === null) {
        totalPages = parsePositiveInt(data?.totalPages, 1);
      }
      if (page >= totalPages) break;
      page += 1;
      continue;
    }

    if (hits !== null && cards.length >= hits) break;
    page += 1;
  }

  return {
    cards,
    hits: hits ?? cards.length,
  };
}
