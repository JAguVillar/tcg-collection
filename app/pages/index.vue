<script setup>
import { SORT_OPTIONS } from "~/composables/useCardSearch";

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
const { options: artistOptions } = useArtists();

const user = useSupabaseUser();
const { activeBinder, binders, setActiveBinder } = useBinders();
const toast = useToast();

const quickAddStatus = ref({});

const advancedFilters = ref(false);

const languageItems = [
  {
    label: "English (EN)",
    value: "EN",
    avatar: {
      src: "https://hatscripts.github.io/circle-flags/flags/us.svg",
      alt: "English",
      loading: "lazy",
    },
  },
  {
    label: "Japanese (JP)",
    value: "JP",
    avatar: {
      src: "https://hatscripts.github.io/circle-flags/flags/jp.svg",
      alt: "Japanese",
      loading: "lazy",
    },
  },
];

searchCards({ query: "" });

watch([separateVariants, selectedArtist, selectedCategory], () => {
  searchCards();
});

const selectedArtistOption = computed({
  get() {
    if (!selectedArtist.value) return null;
    return artistOptions.find((o) => o.value === selectedArtist.value) ?? null;
  },
  set(option) {
    selectedArtist.value = option?.value ?? null;
  },
});

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value),
);

const sortMenuItems = computed(() => [
  SORT_OPTIONS.map((o) => {
    const active = sortField.value === o.value;
    return {
      label: o.label,
      icon: active
        ? o.hasDirection
          ? isAscending.value
            ? "i-lucide-arrow-up"
            : "i-lucide-arrow-down"
          : "i-lucide-check"
        : undefined,
      onSelect: () => setSort(o.value),
    };
  }),
]);

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
                <USelect
                  v-model="selectedCategory"
                  :items="languageItems"
                  icon="i-lucide-languages"
                  placeholder="Language"
                  class="w-full sm:w-56"
                  size="xl"
                  :icon="icon"
                />
                <UInputMenu
                  v-model="selectedArtistOption"
                  :items="artistOptions"
                  :virtualize="true"
                  placeholder="Filter by artist"
                  icon="i-lucide-palette"
                  clear
                  class="w-full sm:w-72"
                  size="xl"
                />
              </div>
            </UCard>
            <div class="flex w-full items-center justify-end gap-1.5">
              <UDropdownMenu :items="sortMenuItems" :content="{ align: 'end' }">
                <UButton
                  :label="`Sort: ${activeSort?.label}`"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  trailing-icon="i-lucide-chevron-down"
                />
              </UDropdownMenu>
              <UButton
                v-if="activeSort?.hasDirection"
                :icon="
                  isAscending
                    ? 'i-lucide-arrow-up-narrow-wide'
                    : 'i-lucide-arrow-down-wide-narrow'
                "
                color="neutral"
                variant="outline"
                size="sm"
                square
                :aria-label="isAscending ? 'Ascending' : 'Descending'"
                @click="setSort(sortField)"
              />
            </div>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert
        v-if="!user && cards.length"
        color="primary"
        variant="soft"
        icon="i-lucide-sparkles"
        title="Sign in to track cards"
        description="Save the cards you own and build checklists for the sets you’re chasing."
        :actions="[{ label: 'Sign in', to: '/login', color: 'primary' }]"
        class="mb-4"
        close
      />

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
          :add-status="quickAddStatus[cardKey(card)]"
          @add="quickAdd"
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

      <EmptyState
        v-if="!loading && !cards.length && searchQuery"
        icon="i-lucide-search-x"
        :title="`No cards found for &quot;${searchQuery}&quot;`"
        description="Try a different name, set, or artist."
        :actions="[
          {
            label: 'Clear search',
            color: 'neutral',
            variant: 'outline',
            onClick: () => {
              searchQuery = '';
              searchCards({ query: '' });
            },
          },
        ]"
      />
    </template>
  </UDashboardPanel>
</template>
