const PKMN_API_URL = "https://www.pkmn.gg/api/search/advanced";

const DEFAULT_BODY = {
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

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Merge with defaults to ensure all required fields are present
  const payload = {
    ...DEFAULT_BODY,
    ...body,
  };

  const response = await $fetch(PKMN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  return response;
});
