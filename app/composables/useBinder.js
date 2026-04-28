export function useBinder(binderId) {
  const id = computed(() => unref(binderId));
  const { handleAuthError } = useAuthErrorRedirect();

  const binder = ref(null);
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchItems() {
    if (!id.value) return;
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch(`/api/binders/${id.value}/items`);
      binder.value = data.binder;
      items.value = data.items;
    } catch (err) {
      if (await handleAuthError(err)) {
        binder.value = null;
        items.value = [];
        error.value = null;
        return;
      }
      error.value = err?.data?.statusMessage ?? err?.message ?? "Error loading binder";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function findItem(cardId, variant = "normal") {
    return items.value.find((i) => i.cardId === cardId && i.variant === variant);
  }

  function getCount(cardId, variant = "normal") {
    return findItem(cardId, variant)?.quantity ?? 0;
  }

  async function addCard(card, variant = "normal", delta = 1, opts = {}) {
    if (!id.value) throw new Error("Binder id is not set");
    const body = { cardId: card.id, variant, card, delta };
    if (opts.owned === true || opts.owned === false) body.owned = opts.owned;
    const result = await $fetch(`/api/binders/${id.value}/items`, {
      method: "POST",
      body,
    });

    const existing = findItem(card.id, variant);
    if (existing) {
      existing.quantity = result.quantity;
    } else {
      items.value = [
        ...items.value,
        {
          id: result.id,
          cardId: result.cardId,
          variant: result.variant,
          quantity: result.quantity,
          notes: null,
          card,
        },
      ];
    }
    return result;
  }

  async function setOwned(cardId, variant = "normal", owned) {
    if (!id.value) throw new Error("Binder id is not set");
    const result = await $fetch(`/api/binders/${id.value}/items`, {
      method: "PATCH",
      body: { cardId, variant, owned },
    });
    const existing = findItem(cardId, variant);
    if (existing) existing.quantity = result.quantity;
    return result;
  }

  async function bulkAdd(source, { preview = false } = {}) {
    if (!id.value) throw new Error("Binder id is not set");

    const body =
      source && typeof source === "object"
        ? { ...source, preview }
        : { mode: "query", query: String(source ?? ""), preview };

    const result = await $fetch(`/api/binders/${id.value}/items/bulk`, {
      method: "POST",
      body,
    });
    if (!preview) {
      await fetchItems();
    }
    return result;
  }

  async function removeCard(cardId, variant = "normal", { all = false, delta = 1 } = {}) {
    if (!id.value) throw new Error("Binder id is not set");
    const result = await $fetch(`/api/binders/${id.value}/items`, {
      method: "DELETE",
      body: { cardId, variant, all, delta },
    });

    if (result.removed) {
      items.value = items.value.filter(
        (i) => !(i.cardId === cardId && i.variant === variant),
      );
    } else {
      const existing = findItem(cardId, variant);
      if (existing) existing.quantity = result.quantity;
    }
    return result;
  }

  watch(id, () => fetchItems().catch(() => {}), { immediate: true });

  return {
    binder,
    items,
    loading,
    error,
    fetchItems,
    findItem,
    getCount,
    addCard,
    removeCard,
    setOwned,
    bulkAdd,
  };
}
