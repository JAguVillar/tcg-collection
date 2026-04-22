<script setup>
const props = defineProps({
  card: { type: Object, required: true },
  variant: { type: String, default: "normal" },
});

const { binders, loaded, fetchBinders } = useBinders();
const user = useSupabaseUser();
const toast = useToast();
const busy = ref(false);

async function ensureLoaded(open) {
  if (open && user.value && !loaded.value) {
    try {
      await fetchBinders();
    } catch {
      /* handled via state.error */
    }
  }
}

async function addTo(binder) {
  busy.value = true;
  try {
    await $fetch(`/api/binders/${binder.id}/items`, {
      method: "POST",
      body: {
        cardId: props.card.id,
        variant: props.variant,
        card: props.card,
      },
    });
    toast.add({
      color: "success",
      icon: "i-lucide-check-circle",
      title: "Card added",
      description: `${props.card.name} → ${binder.name}`,
    });
  } catch (err) {
    toast.add({
      color: "error",
      icon: "i-lucide-triangle-alert",
      title: "Failed to add",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  } finally {
    busy.value = false;
  }
}

const items = computed(() => {
  if (!binders.value.length) {
    return [
      [
        {
          label: "No binders yet",
          icon: "i-lucide-plus",
          to: "/binders",
        },
      ],
    ];
  }
  return [
    binders.value.map((b) => ({
      label: b.name,
      icon: b.isDefault ? "i-lucide-star" : "i-lucide-folder",
      onSelect: () => addTo(b),
    })),
  ];
});
</script>

<template>
  <UDropdownMenu
    :items="items"
    :disabled="!user || busy"
    @update:open="ensureLoaded"
  >
    <UTooltip :text="user ? 'Add to binder…' : 'Sign in to add cards'">
      <UButton
        icon="i-lucide-folder-plus"
        color="neutral"
        variant="outline"
        size="xs"
        square
        :disabled="!user || busy"
        aria-label="Add to binder"
      />
    </UTooltip>
  </UDropdownMenu>
</template>
