<script setup>
import { createBinderMenuItems } from "~/utils/menuItemFactories";

const props = defineProps({
  card: { type: Object, required: true },
  variant: { type: String, default: "normal" },
});

const { binders, loaded, fetchBinders } = useBinders();
const user = useSupabaseUser();
const { notify } = useNotification();
const { loading: busy, execute: executeAdd } = useAsyncState(async (binder) => {
  await $fetch(`/api/binders/${binder.id}/items`, {
    method: "POST",
    body: {
      cardId: props.card.id,
      variant: props.variant,
      card: props.card,
    },
  });
});

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
  try {
    await executeAdd(binder);
    notify.success(`${props.card.name} → ${binder.name}`, {
      title: "Card added",
    });
  } catch (err) {
    notify.error(err?.data?.statusMessage ?? err?.message ?? "Error", {
      title: "Failed to add",
    });
  }
}

const items = computed(() => createBinderMenuItems(binders.value, addTo));
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
