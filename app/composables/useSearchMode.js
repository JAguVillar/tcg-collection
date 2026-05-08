const SEARCH_MODE_KEY = "search-mode";

export const SEARCH_MODES = {
  ADVANCED: "advanced",
  COMMON: "common",
};

export function useSearchMode() {
  const mode = useState(SEARCH_MODE_KEY, () => SEARCH_MODES.ADVANCED);
  const ready = useState(`${SEARCH_MODE_KEY}-ready`, () => false);

  function setMode(nextMode) {
    mode.value = nextMode === SEARCH_MODES.COMMON ? SEARCH_MODES.COMMON : SEARCH_MODES.ADVANCED;
  }

  if (import.meta.client && !ready.value) {
    const stored = localStorage.getItem(SEARCH_MODE_KEY);
    if (stored === SEARCH_MODES.ADVANCED || stored === SEARCH_MODES.COMMON) {
      mode.value = stored;
    }

    watch(mode, (value) => {
      localStorage.setItem(SEARCH_MODE_KEY, value);
    });

    ready.value = true;
  }

  const isAdvanced = computed(() => mode.value === SEARCH_MODES.ADVANCED);
  const isCommon = computed(() => mode.value === SEARCH_MODES.COMMON);

  return {
    mode,
    isAdvanced,
    isCommon,
    setMode,
  };
}
