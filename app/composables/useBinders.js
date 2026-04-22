const ACTIVE_BINDER_STORAGE_KEY = "tcg-active-binder-id";

export function useBinders() {
  const user = useSupabaseUser();
  const binders = useState("binders", () => []);
  const loading = useState("binders-loading", () => false);
  const loaded = useState("binders-loaded", () => false);
  const error = useState("binders-error", () => null);

  const activeBinderId = useState("active-binder-id", () => {
    if (import.meta.client) {
      return localStorage.getItem(ACTIVE_BINDER_STORAGE_KEY) ?? null;
    }
    return null;
  });

  watch(activeBinderId, (id) => {
    if (import.meta.client) {
      if (id) localStorage.setItem(ACTIVE_BINDER_STORAGE_KEY, id);
      else localStorage.removeItem(ACTIVE_BINDER_STORAGE_KEY);
    }
  });

  const activeBinder = computed(() => {
    const id = activeBinderId.value;
    if (id) {
      const match = binders.value.find((b) => b.id === id);
      if (match) return match;
    }
    return binders.value.find((b) => b.isDefault) ?? binders.value[0] ?? null;
  });

  async function fetchBinders() {
    if (!user.value) {
      binders.value = [];
      loaded.value = true;
      return [];
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch("/api/binders");
      binders.value = data;
      loaded.value = true;
      return data;
    } catch (err) {
      error.value = err?.data?.statusMessage ?? err?.message ?? "Error loading binders";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createBinder({
    name,
    description = null,
    isDefault = false,
    iconPokemon = null,
    mode = "collection",
  } = {}) {
    const created = await $fetch("/api/binders", {
      method: "POST",
      body: { name, description, isDefault, iconPokemon, mode },
    });
    // Refresh to keep `is_default` flags consistent across the list.
    await fetchBinders();
    activeBinderId.value = created.id;
    return created;
  }

  async function updateBinder(id, patch) {
    const updated = await $fetch(`/api/binders/${id}`, {
      method: "PATCH",
      body: patch,
    });
    await fetchBinders();
    return updated;
  }

  async function deleteBinder(id) {
    await $fetch(`/api/binders/${id}`, { method: "DELETE" });
    if (activeBinderId.value === id) activeBinderId.value = null;
    await fetchBinders();
  }

  function setActiveBinder(id) {
    activeBinderId.value = id ?? null;
  }

  // Keep the list in sync with auth state automatically.
  watch(
    user,
    (u) => {
      if (u) {
        fetchBinders().catch(() => {});
      } else {
        binders.value = [];
        loaded.value = false;
        activeBinderId.value = null;
      }
    },
    { immediate: true },
  );

  return {
    binders,
    loading,
    loaded,
    error,
    activeBinderId,
    activeBinder,
    fetchBinders,
    createBinder,
    updateBinder,
    deleteBinder,
    setActiveBinder,
  };
}
