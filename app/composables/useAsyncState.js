export function useAsyncState(asyncFn, options = {}) {
  const loading = ref(false);
  const error = ref(null);
  const data = ref(options.initialData ?? null);

  async function execute(...args) {
    loading.value = true;
    error.value = null;
    try {
      data.value = await asyncFn(...args);
      return data.value;
    } catch (err) {
      error.value =
        err?.data?.statusMessage ?? err?.message ?? options.errorMessage ?? "Error";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  function reset(nextData = options.initialData ?? null) {
    loading.value = false;
    error.value = null;
    data.value = nextData;
  }

  return {
    loading,
    error,
    data,
    execute,
    clearError,
    reset,
  };
}
