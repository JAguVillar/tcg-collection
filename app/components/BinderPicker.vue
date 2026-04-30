<script setup>
const props = defineProps({
  card: { type: Object, required: true },
  variant: { type: String, default: "normal" },
  activeBinderId: { type: String, default: null },
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

const otherBinders = computed(() =>
  binders.value.filter((b) => b.id !== props.activeBinderId),
);

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
  if (!otherBinders.value.length) {
    return [
      [
        {
          label: "Manage binders",
          icon: "i-lucide-settings-2",
          to: "/binders",
        },
      ],
    ];
  }
  return [
    otherBinders.value.map((b) => ({
      label: b.mode === "custom" ? `${b.name} (checklist)` : b.name,
      icon: b.mode === "custom" ? "i-lucide-list-checks" : "i-lucide-folder",
      onSelect: () => addTo(b),
    })),
  ];
});
</script>

<template>
  <UDropdownMenu
    :items="items"
    :disabled="!user || busy"
    :content="{ align: 'end' }"
    @update:open="ensureLoaded"
  >
    <UButton
      icon="i-lucide-chevron-down"
      color="primary"
      variant="soft"
      size="md"
      square
      :disabled="!user || busy"
      aria-label="Add to another binder"
    />
  </UDropdownMenu>
</template>
