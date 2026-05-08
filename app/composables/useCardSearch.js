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

export function useCardSearch(options = {}) {
  const { debounceMs = 0 } = options;

  const { mode: searchMode } = useSearchMode();
  const searchQuery = ref("");
  const page = ref(1);
  const cards = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref(null);
  const hasMore = ref(true);
  const separateVariants = ref(false);
  const selectedArtist = ref(null);
  const selectedSet = ref(null);
  const selectedCategory = ref("EN");
  const sortField = ref(7);
  const isAscending = ref(true);
  const unsupportedFilters = ref([]);

  // Monotonic guard so stale responses from rapid toggles/searches don't
  // overwrite the state for the latest query.
  let requestSeq = 0;
  let activeController = null;

  function getSearchBody(overrides = {}) {
    const mode = searchMode.value;
    const rawQuery = overrides.query !== undefined
      ? overrides.query
      : searchQuery.value;
    const query = normalizeQuery(rawQuery);
    const category = overrides.category ?? selectedCategory.value;
    const page = overrides.page ?? 1;

    if (mode === "common") {
      return { query, category, page, searchMode: mode };
    }

    return {
      ...DEFAULT_SEARCH_BODY,
      ...overrides,
      query,
      category,
      page,
      separateVariants: overrides.separateVariants ?? separateVariants.value,
      artists: overrides.artists ?? (selectedArtist.value ? [selectedArtist.value] : []),
      sets: overrides.sets ?? (selectedSet.value ? [selectedSet.value] : []),
      sortField: overrides.sortField ?? sortField.value,
      isAscending: overrides.isAscending ?? isAscending.value,
      searchMode: mode,
    };
  }

  function abort() {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    requestSeq++;
  }

  async function searchImmediate(opts = {}) {
    if (debouncedSearch) debouncedSearch.cancel();
    return runSearch(opts);
  }

  async function runSearch(searchOptions = {}) {
    if (activeController) activeController.abort();
    activeController = new AbortController();
    const controller = activeController;

    const seq = ++requestSeq;
    loading.value = true;
    error.value = null;
    page.value = 1;
    hasMore.value = true;

    const body = getSearchBody({
      ...searchOptions,
      query: searchOptions.query ?? searchQuery.value,
      page: 1,
    });

    try {
      const data = await $fetch("/api/cards/search", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      if (seq !== requestSeq) return [];

      const results = data?.value ?? [];
      cards.value = results;
      unsupportedFilters.value = Array.isArray(data?.unsupportedFilters)
        ? data.unsupportedFilters
        : [];

      if (results.length === 0) {
        hasMore.value = false;
      }

      return results;
    } catch (err) {
      if (err?.name === "AbortError" || seq !== requestSeq) return [];
      error.value = err?.message ?? "Error searching cards";
      console.error("Card search error:", err);
      return [];
    } finally {
      if (seq === requestSeq) {
        loading.value = false;
        if (activeController === controller) activeController = null;
      }
    }
  }

  const debouncedSearch = debounceMs > 0 ? debounce(runSearch, debounceMs) : null;

  async function searchCards(opts = {}) {
    if (debouncedSearch) return debouncedSearch(opts);
    return runSearch(opts);
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return;

    const seq = requestSeq;
    loadingMore.value = true;
    error.value = null;
    page.value++;

    const body = getSearchBody({ page: page.value });

    try {
      const data = await $fetch("/api/cards/search", {
        method: "POST",
        body,
      });

      if (seq !== requestSeq) return [];

      const results = data?.value ?? [];
      unsupportedFilters.value = Array.isArray(data?.unsupportedFilters)
        ? data.unsupportedFilters
        : [];

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
      isAscending.value = !isAscending.value;
    } else {
      sortField.value = field;
      isAscending.value = true;
    }

    searchImmediate();
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
    selectedSet,
    selectedCategory,
    sortField,
    isAscending,
    searchMode,
    unsupportedFilters,
    searchCards,
    searchImmediate,
    loadMore,
    setSort,
    getSearchBody,
    abort,
  };
}
