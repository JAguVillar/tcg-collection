export function useAsyncState(asyncFn, options = {}) {
  const { immediate = false, resetData = null } = options;

  const loading = ref(false);
  const error = ref(null);
  const data = ref(resetData);

  let seq = 0;

  async function execute(...args) {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const result = await asyncFn(...args);
      if (current !== seq) return null;
      data.value = result;
      return result;
    } catch (err) {
      if (current !== seq) return null;
      error.value = err?.data?.statusMessage ?? err?.message ?? "Error";
      throw err;
    } finally {
      if (current === seq) loading.value = false;
    }
  }

  function reset() {
    seq++;
    loading.value = false;
    error.value = null;
    data.value = resetData;
  }

  if (immediate) execute();

  return { loading, error, data, execute, reset };
}
