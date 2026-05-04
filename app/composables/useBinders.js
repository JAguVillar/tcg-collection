const ACTIVE_BINDER_STORAGE_KEY = "tcg-active-binder-id";

export function useBinders() {
  const user = useSupabaseUser();
  const { handleAuthError } = useAuthErrorRedirect();
  const binders = useState("binders", () => []);
  const loading = useState("binders-loading", () => false);
  const loaded = useState("binders-loaded", () => false);
  const error = useState("binders-error", () => null);

  // Hint used during first paint (before binders load) so the sidebar
  // switcher can show the right binder immediately. The server is the
  // source of truth; this just speeds up boot.
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
    const byFlag = binders.value.find((b) => b.isActive);
    if (byFlag) return byFlag;
    if (activeBinderId.value) {
      const match = binders.value.find((b) => b.id === activeBinderId.value);
      if (match) return match;
    }
    return binders.value[0] ?? null;
  });

  // Mirror the server's active binder into the local hint so a reload
  // restores immediately even before the binders request finishes.
  watch(
    activeBinder,
    (b) => {
      if (b?.id && b.id !== activeBinderId.value) {
        activeBinderId.value = b.id;
      }
    },
    { immediate: true },
  );

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
      if (await handleAuthError(err)) {
        binders.value = [];
        loaded.value = false;
        error.value = null;
        return [];
      }
      error.value =
        err?.data?.statusMessage ?? err?.message ?? "Error loading binders";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createBinder({
    name,
    description = null,
    iconPokemon = null,
    color = null,
    mode = "collection",
    isActive = true,
    template = null,
  } = {}) {
    const created = await $fetch("/api/binders", {
      method: "POST",
      body: { name, description, iconPokemon, color, mode, isActive, template },
    });
    await fetchBinders();
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

  async function setActiveBinder(id) {
    if (!id) {
      activeBinderId.value = null;
      return;
    }
    const previous = binders.value.map((b) => ({ ...b }));
    binders.value = binders.value.map((b) => ({
      ...b,
      isActive: b.id === id,
    }));
    activeBinderId.value = id;
    try {
      await $fetch(`/api/binders/${id}`, {
        method: "PATCH",
        body: { isActive: true },
      });
    } catch (err) {
      binders.value = previous;
      throw err;
    }
  }

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
