// Advanced search: full-featured filters via api.tcg.gg POST endpoint.
// This is the original pkmn.gg search path used across the app.

export const ADVANCED_API_URL = "https://api.tcg.gg/pkmn/v1/search/advanced";

export const ADVANCED_DEFAULT_BODY = {
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

function buildPayload(body = {}) {
  const { mode: _mode, ...rest } = body;
  const payload = { ...ADVANCED_DEFAULT_BODY, ...rest };

  if (payload.artist && (!Array.isArray(payload.artists) || !payload.artists.length)) {
    payload.artists = [payload.artist];
  }
  delete payload.artist;

  return payload;
}

function flattenCards(value) {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (item && typeof item === "object" && item.card && typeof item.card === "object") {
      const { card, ...rest } = item;
      return { ...card, ...rest };
    }
    return item;
  });
}

export async function search(body = {}) {
  const payload = buildPayload(body);

  const data = await $fetch(ADVANCED_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  return {
    value: flattenCards(data?.value) ?? [],
    hits: Number.isFinite(Number(data?.hits)) ? Number(data.hits) : null,
  };
}
