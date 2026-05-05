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
    if (opts.targetSlot) body.targetSlot = opts.targetSlot;
    const result = await $fetch(`/api/binders/${id.value}/items`, {
      method: "POST",
      body,
    });

    if (opts.targetSlot) {
      const slotIdx = items.value.findIndex(
        (i) =>
          i.dexNumber === opts.targetSlot.dexNumber &&
          (i.formSlug ?? null) === (opts.targetSlot.formSlug ?? null),
      );
      if (slotIdx >= 0) {
        const next = [...items.value];
        next[slotIdx] = {
          ...next[slotIdx],
          id: result.id,
          cardId: result.cardId,
          variant: result.variant,
          quantity: result.quantity,
          card,
        };
        items.value = next;
      }
      return result;
    }

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

  async function removeCard(cardId, variant = "normal", { all = false, delta = 1, targetSlot = null } = {}) {
    if (!id.value) throw new Error("Binder id is not set");
    const body = { cardId, variant, all, delta };
    if (targetSlot) body.targetSlot = targetSlot;
    const result = await $fetch(`/api/binders/${id.value}/items`, {
      method: "DELETE",
      body,
    });

    if (targetSlot) {
      const slotIdx = items.value.findIndex(
        (i) =>
          i.dexNumber === targetSlot.dexNumber &&
          (i.formSlug ?? null) === (targetSlot.formSlug ?? null),
      );
      if (slotIdx >= 0) {
        const next = [...items.value];
        next[slotIdx] = {
          ...next[slotIdx],
          cardId: null,
          quantity: 0,
          card: null,
        };
        items.value = next;
      }
      return result;
    }

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

  async function reorder(orderedIds) {
    if (!id.value) throw new Error("Binder id is not set");
    if (!Array.isArray(orderedIds) || !orderedIds.length) return;
    const previous = items.value;
    // Optimistic local update so the UI sticks even if the network is slow.
    const byId = new Map(previous.map((i) => [i.id, i]));
    const next = orderedIds.map((rid, idx) => {
      const row = byId.get(rid);
      return row ? { ...row, sortOrder: (idx + 1) * 100 } : null;
    }).filter(Boolean);
    items.value = next;
    try {
      await $fetch(`/api/binders/${id.value}/reorder`, {
        method: "PATCH",
        body: { orderedIds },
      });
    } catch (err) {
      items.value = previous;
      throw err;
    }
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
    reorder,
  };
}
