const DEFAULT_SEARCH_BODY = {
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
  separateVariants: false,
};

// Sort field mapping matching pkmn.gg API
export const SORT_OPTIONS = [
  { label: "Best Match", value: 7, hasDirection: false },
  { label: "Number", value: 0, hasDirection: true },
  { label: "Name", value: 1, hasDirection: true },
  { label: "Rarity", value: 2, hasDirection: true },
  { label: "Price", value: 3, hasDirection: true },
  { label: "Artist", value: 4, hasDirection: true },
  { label: "Released", value: 5, hasDirection: true },
];

export function useCardSearch() {
  const searchQuery = ref("");
  const page = ref(1);
  const cards = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref(null);
  const hasMore = ref(true);
  const separateVariants = ref(false);
  const selectedArtist = ref(null);
  const sortField = ref(7);
  const isAscending = ref(true);

  // Monotonic guard so stale responses from rapid toggles/searches don't
  // overwrite the state for the latest query.
  let requestSeq = 0;

  function _buildBody(overrides = {}) {
    return {
      ...DEFAULT_SEARCH_BODY,
      query: searchQuery.value,
      separateVariants: separateVariants.value,
      artists: selectedArtist.value ? [selectedArtist.value] : [],
      sortField: sortField.value,
      isAscending: isAscending.value,
      ...overrides,
    };
  }

  async function searchCards(options = {}) {
    const seq = ++requestSeq;
    loading.value = true;
    error.value = null;
    page.value = 1;
    hasMore.value = true;

    const body = _buildBody({
      ...options,
      query: options.query ?? searchQuery.value,
      page: 1,
    });

    try {
      const data = await $fetch("/api/cards/search", {
        method: "POST",
        body,
      });

      if (seq !== requestSeq) return [];

      const results = data?.value ?? [];
      cards.value = results;

      if (results.length === 0) {
        hasMore.value = false;
      }

      return results;
    } catch (err) {
      if (seq !== requestSeq) return [];
      error.value = err?.message ?? "Error searching cards";
      console.error("Card search error:", err);
      return [];
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return;

    const seq = requestSeq;
    loadingMore.value = true;
    error.value = null;
    page.value++;

    const body = _buildBody({ page: page.value });

    try {
      const data = await $fetch("/api/cards/search", {
        method: "POST",
        body,
      });

      if (seq !== requestSeq) return [];

      const results = data?.value ?? [];

      if (results.length === 0) {
        hasMore.value = false;
      } else {
        cards.value = [...cards.value, ...results];
      }

      return results;
    } catch (err) {
      if (seq !== requestSeq) return [];
      error.value = err?.message ?? "Error loading more cards";
      page.value--;
      console.error("Load more error:", err);
      return [];
    } finally {
      if (seq === requestSeq) loadingMore.value = false;
    }
  }

  function setSort(field) {
    const option = SORT_OPTIONS.find((o) => o.value === field);

    if (sortField.value === field && option?.hasDirection) {
      // Same field clicked: toggle direction
      isAscending.value = !isAscending.value;
    } else {
      // Different field: set it with ascending default
      sortField.value = field;
      isAscending.value = true;
    }

    searchCards();
  }

  return {
    searchQuery,
    page,
    cards,
    loading,
    loadingMore,
    error,
    hasMore,
    separateVariants,
    selectedArtist,
    sortField,
    isAscending,
    searchCards,
    loadMore,
    setSort,
  };
}
