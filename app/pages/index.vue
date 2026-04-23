<script setup>
import { SORT_OPTIONS } from "~/composables/useCardSearch";

definePageMeta({ middleware: ["auth"] });

const {
  searchQuery,
  cards,
  loading,
  loadingMore,
  error,
  hasMore,
  separateVariants,
  sortField,
  isAscending,
  searchCards,
  loadMore,
  setSort,
} = useCardSearch();

const user = useSupabaseUser();
const { activeBinder, defaultBinder, binders, setActiveBinder } = useBinders();
const toast = useToast();

const quickAddStatus = ref({});
const defaultAddStatus = ref({});

searchCards({ query: "rowlet" });

watch(separateVariants, () => {
  searchCards();
});

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

const sortItems = computed(() =>
  SORT_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
  }))
);

const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value)
);

const binderItems = computed(() =>
  binders.value.map((b) => {
    let suffix = "";
    if (b.mode === "custom") suffix = " (checklist)";
    else if (b.isDefault) suffix = " (default)";
    return {
      label: `${b.name}${suffix}`,
      value: b.id,
    };
  })
);

async function addCardToBinder(card, binder, statusRef) {
  if (!binder) return;
  const key = cardKey(card);
  statusRef.value = { ...statusRef.value, [key]: "pending" };
  try {
    await $fetch(`/api/binders/${binder.id}/items`, {
      method: "POST",
      body: {
        cardId: card.id,
        variant: card.variant ?? "normal",
        card,
      },
    });
    statusRef.value = { ...statusRef.value, [key]: "added" };
    const isCustom = binder.mode === "custom";
    toast.add({
      color: "success",
      icon: "i-lucide-check-circle",
      title: isCustom ? "Added to checklist" : "Card added",
      description: `${card.name} → ${binder.name}`,
    });
    setTimeout(() => {
      const next = { ...statusRef.value };
      delete next[key];
      statusRef.value = next;
    }, 1500);
  } catch (err) {
    statusRef.value = { ...statusRef.value, [key]: "error" };
    toast.add({
      color: "error",
      icon: "i-lucide-triangle-alert",
      title: "Failed to add",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}

function quickAdd(card) {
  return addCardToBinder(card, activeBinder.value, quickAddStatus);
}

function quickAddToDefault(card) {
  return addCardToBinder(card, defaultBinder.value, defaultAddStatus);
}
</script>

<template>
  <UDashboardPanel id="search">
    <template #header>
      <UDashboardNavbar title="Search">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <USelect
            v-if="user && binderItems.length"
            :model-value="activeBinder?.id"
            :items="binderItems"
            icon="i-lucide-library"
            placeholder="Active binder"
            class="w-56"
            @update:model-value="setActiveBinder"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #default>
          <form
            class="flex items-center gap-2 w-full"
            @submit.prevent="searchCards()"
          >
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search for a Pokémon card…"
              class="flex-1"
              size="md"
            />
            <UButton
              type="submit"
              icon="i-lucide-search"
              label="Search"
              :loading="loading"
            />
          </form>
        </template>
      </UDashboardToolbar>

      <UDashboardToolbar>
        <template #default>
          <div class="flex items-center gap-2 w-full flex-wrap">
            <UTabs
              :items="sortItems"
              :model-value="sortField"
              variant="pill"
              size="xs"
              :content="false"
              @update:model-value="setSort"
            />
            <UButton
              v-if="activeSort?.hasDirection"
              :icon="isAscending ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
              color="neutral"
              variant="outline"
              size="xs"
              square
              :aria-label="isAscending ? 'Ascending' : 'Descending'"
              @click="setSort(sortField)"
            />
            <USwitch
              v-model="separateVariants"
              label="Separate variants"
              class="ml-auto"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-triangle-alert"
        :description="error"
        class="mb-4"
      />

      <div
        v-if="loading"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <USkeleton v-for="n in 10" :key="n" class="h-80 rounded-lg" />
      </div>

      <div
        v-else-if="cards.length"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <CardTile
          v-for="(card, index) in cards"
          :key="`${card.id}-${card.variant}-${index}`"
          :card="card"
          :active-binder="activeBinder"
          :default-binder="defaultBinder"
          :add-status="quickAddStatus[cardKey(card)]"
          :add-to-default-status="defaultAddStatus[cardKey(card)]"
          @add="quickAdd"
          @add-default="quickAddToDefault"
        />
      </div>

      <div v-if="cards.length && hasMore" class="flex justify-center mt-8">
        <UButton
          size="lg"
          color="neutral"
          variant="outline"
          :loading="loadingMore"
          label="Load more"
          @click="loadMore"
        />
      </div>

      <p
        v-if="cards.length && !hasMore"
        class="mt-8 text-center text-sm text-muted"
      >
        No more cards to show
      </p>

      <div
        v-if="!loading && !cards.length && searchQuery"
        class="flex flex-col items-center justify-center py-16 text-muted gap-2"
      >
        <UIcon name="i-lucide-search-x" class="size-10" />
        <p class="text-sm">No cards found for "{{ searchQuery }}"</p>
      </div>
    </template>
  </UDashboardPanel>
</template>
