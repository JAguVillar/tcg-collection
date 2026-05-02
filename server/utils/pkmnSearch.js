export const PKMN_API_URL = "https://api.tcg.gg/pkmn/v1/search/advanced";

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
};

export function buildSearchPayload(body = {}) {
  const payload = {
    ...DEFAULT_SEARCH_BODY,
    ...body,
  };

  if (payload.artist && (!Array.isArray(payload.artists) || !payload.artists.length)) {
    payload.artists = [payload.artist];
  }
  delete payload.artist;

  return payload;
}

export async function searchCards(body = {}) {
  const payload = buildSearchPayload(body);

  const data = await $fetch(PKMN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  // api.tcg.gg wraps each result as { card: {...}, variant?, ... }.
  // Flatten so consumers keep seeing a plain card object.
  if (Array.isArray(data?.value)) {
    data.value = data.value.map((item) => {
      if (item && typeof item === "object" && item.card && typeof item.card === "object") {
        const { card, ...rest } = item;
        return { ...card, ...rest };
      }
      return item;
    });
  }

  return data;
}

export async function collectAllCards(body = {}) {
  const firstPage = buildSearchPayload(body).page ?? 1;

  let page = Number.isFinite(firstPage) && firstPage > 0 ? firstPage : 1;
  let hits = null;
  const cards = [];

  while (true) {
    const data = await searchCards({ ...body, page });
    const pageCards = Array.isArray(data?.value) ? data.value : [];

    if (hits === null && Number.isFinite(Number(data?.hits))) {
      hits = Number(data.hits);
    }

    if (!pageCards.length) break;

    cards.push(...pageCards);

    if (hits !== null && cards.length >= hits) break;
    page += 1;
  }

  return {
    cards,
    hits: hits ?? cards.length,
  };
}
