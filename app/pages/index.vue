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
  selectedArtist,
  selectedCategory,
  sortField,
  isAscending,
  searchCards,
  loadMore,
  setSort,
} = useCardSearch();

const user = useSupabaseUser();
const { activeBinder, defaultBinder, binders, setActiveBinder } = useBinders();
const notify = useNotification();

const quickAddStatus = ref({});
const defaultAddStatus = ref({});

const advancedFilters = ref(false);

searchCards({ query: "" });

watch([separateVariants, selectedArtist, selectedCategory], () => {
  searchCards();
});

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

const sortItems = computed(() =>
  SORT_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
  })),
);

const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value),
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
  }),
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
    notify.success({
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
    notify.fromError(err, "Failed to add");
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
            class="w-full sm:w-56"
            @update:model-value="setActiveBinder"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #default>
          <div class="flex flex-col w-full py-4 gap-4">
            <form
              class="flex w-full flex-col gap-4 sm:flex-row sm:items-center"
              @submit.prevent="searchCards()"
            >
              <UButton
                icon="i-lucide-sliders-horizontal"
                block
                :variant="advancedFilters ? 'solid' : 'outline'"
                class="sm:w-auto"
                size="xl"
                @click="advancedFilters = !advancedFilters"
              />
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Search for a Pokémon card…"
                class="flex-1"
                size="xl"
              />
              <UButton
                type="submit"
                icon="i-lucide-search"
                label="Search"
                :loading="loading"
                block
                class="sm:w-auto"
                size="xl"
              />
              <USeparator orientation="vertical" class="h-8" />

              <USwitch
                v-model="separateVariants"
                label="Separate variants"
                size="xl"
                checked-icon="i-lucide-sparkles"
                color="purple"
              />
            </form>
            <UCard variant="subtle" v-if="advancedFilters">
              <div
                class="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
              >
                <CategorySelect
                  v-model="selectedCategory"
                  with-flags
                  size="xl"
                  class="w-full sm:w-56"
                />
                <ArtistSelect
                  v-model="selectedArtist"
                  size="xl"
                  class="w-full sm:w-72"
                />
              </div>
            </UCard>
            <div class="flex w-full flex-col gap-2">
              <div class="flex w-full items-center gap-2">
                <span class="text-md font-semibold text-default"
                  >Ordenar por</span
                >
                <div class="flex-1 overflow-x-auto">
                  <UTabs
                    :items="sortItems"
                    :model-value="sortField"
                    variant="pill"
                    size="xl"
                    :content="false"
                    class="min-w-max"
                    @update:model-value="setSort"
                  />
                </div>
                <UButton
                  v-if="activeSort?.hasDirection"
                  :icon="
                    isAscending ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
                  "
                  color="neutral"
                  variant="outline"
                  size="xl"
                  square
                  :aria-label="isAscending ? 'Ascending' : 'Descending'"
                  @click="setSort(sortField)"
                />
              </div>
            </div>
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

      <div v-if="loading" class="cards-grid">
        <USkeleton v-for="n in 10" :key="n" class="aspect-[5/7] rounded-lg" />
      </div>

      <div v-else-if="cards.length" class="cards-grid">
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

      <div
        v-if="cards.length && hasMore"
        class="mt-6 sm:mt-8 flex justify-center"
      >
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
        class="mt-6 sm:mt-8 text-center text-sm text-muted"
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
