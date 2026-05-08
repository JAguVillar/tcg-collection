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
  selectedSet,
  selectedCategory,
  sortField,
  isAscending,
  searchMode,
  unsupportedFilters,
  searchCards,
  loadMore,
  setSort,
} = useCardSearch();
const { options: artistOptions } = useArtists();
const { options: setOptions } = useSets();

const user = useSupabaseUser();
const { activeBinder } = useBinders();
const toast = useToast();

const quickAddStatus = ref({});

const advancedSearchOpen = ref(false);

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

watch(
  [separateVariants, selectedArtist, selectedSet, selectedCategory, searchMode],
  () => {
    searchCards();
  },
);

const isCommonMode = computed(() => searchMode.value === "common");

watch(
  searchMode,
  (value) => {
    const shouldOpen = value === "advanced";
    if (advancedSearchOpen.value !== shouldOpen) {
      advancedSearchOpen.value = shouldOpen;
    }
  },
  { immediate: true },
);

watch(advancedSearchOpen, (open) => {
  const nextMode = open ? "advanced" : "common";
  if (searchMode.value !== nextMode) {
    searchMode.value = nextMode;
  }
});

const searchModeLabel = computed(() =>
  isCommonMode.value ? "Common search" : "Advanced search",
);

const selectedArtistOption = computed({
  get() {
    if (!selectedArtist.value) return null;
    return (
      artistOptions.value.find((o) => o.value === selectedArtist.value) ?? null
    );
  },
  set(option) {
    selectedArtist.value = option?.value ?? null;
  },
});

const selectedSetOption = computed({
  get() {
    if (!selectedSet.value) return null;
    return setOptions.value.find((o) => o.value === selectedSet.value) ?? null;
  },
  set(option) {
    selectedSet.value = option?.value ?? null;
  },
});

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value),
);

const activeFilterCount = computed(
  () =>
    (selectedArtist.value ? 1 : 0) +
    (selectedSet.value ? 1 : 0) +
    (separateVariants.value ? 1 : 0) +
    (selectedCategory.value !== "EN" ? 1 : 0),
);

const selectedLanguage = computed(() =>
  languageItems.find((l) => l.value === selectedCategory.value),
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
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #default>
          <div class="flex flex-col w-full py-3 gap-3">
            <form
              class="flex w- items-center gap-2"
              @submit.prevent="searchCards()"
            >
              <UButton
                :variant="advancedSearchOpen ? 'solid' : 'outline'"
                icon="i-lucide-sliders-horizontal"
                size="lg"
                @click="advancedSearchOpen = !advancedSearchOpen"
              />
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Search Pokémon, set, artist…"
                class="flex-1"
                size="lg"
                :loading="loading"
              />

              <UButton
                type="submit"
                icon="i-lucide-search"
                label="Search"
                :loading="loading"
                size="lg"
                :ui="{ label: 'hidden sm:inline' }"
              />
              <template v-if="advancedSearchOpen">
                <UPopover :content="{ align: 'end' }">
                  <UButton
                    icon="i-lucide-funnel"
                    color="neutral"
                    variant="outline"
                    size="lg"
                    square
                    :aria-label="`Filters${activeFilterCount ? ` (${activeFilterCount} active)` : ''}`"
                  >
                  </UButton>
                  <template #content>
                    <div class="p-4 w-80 flex flex-col gap-4">
                      <UFormField label="Language">
                        <USelect
                          v-model="selectedCategory"
                          :items="languageItems"
                          icon="i-lucide-languages"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField label="Set">
                        <UInputMenu
                          v-model="selectedSetOption"
                          :items="setOptions"
                          :virtualize="true"
                          placeholder="Any set"
                          icon="i-lucide-layers"
                          clear
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField label="Artist">
                        <UInputMenu
                          v-model="selectedArtistOption"
                          :items="artistOptions"
                          :virtualize="true"
                          placeholder="Any artist"
                          icon="i-lucide-palette"
                          clear
                          class="w-full"
                        />
                      </UFormField>
                    </div>
                  </template>
                </UPopover>

                <UTooltip
                  :text="
                    separateVariants
                      ? 'Variants shown as separate cards'
                      : 'Show variants as separate cards (holo, reverse, etc.)'
                  "
                >
                  <UButton
                    icon="i-lucide-sparkles"
                    :color="separateVariants ? 'purple' : 'neutral'"
                    :variant="separateVariants ? 'solid' : 'outline'"
                    size="lg"
                    square
                    :aria-label="
                      separateVariants
                        ? 'Hide variants (combine into one card)'
                        : 'Show variants as separate cards'
                    "
                    :aria-pressed="separateVariants"
                    @click="separateVariants = !separateVariants"
                  />
                </UTooltip>

                <UDropdownMenu
                  :items="sortMenuItems"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    :label="activeSort?.label"
                    color="neutral"
                    variant="outline"
                    size="lg"
                    icon="i-lucide-arrow-up-down"
                    trailing-icon="i-lucide-chevron-down"
                    :ui="{ label: 'hidden md:inline' }"
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
                  size="lg"
                  square
                  :aria-label="isAscending ? 'Ascending' : 'Descending'"
                  @click="setSort(sortField)"
                />
              </template>
            </form>
            <div
              v-if="activeFilterCount"
              class="flex flex-wrap items-center gap-1.5"
            >
              <span class="text-xs text-muted">Filters:</span>
              <UBadge
                v-if="selectedCategory !== 'EN'"
                color="neutral"
                variant="soft"
                :ui="{ base: 'pr-0.5 gap-1' }"
              >
                {{ selectedLanguage?.label }}
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  square
                  variant="ghost"
                  color="neutral"
                  aria-label="Clear language"
                  @click="selectedCategory = 'EN'"
                />
              </UBadge>
              <UBadge
                v-if="selectedSet"
                color="neutral"
                variant="soft"
                :ui="{ base: 'pr-0.5 gap-1' }"
              >
                {{ selectedSetOption?.label ?? selectedSet }}
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  square
                  variant="ghost"
                  color="neutral"
                  aria-label="Clear set"
                  @click="selectedSet = null"
                />
              </UBadge>
              <UBadge
                v-if="selectedArtist"
                color="neutral"
                variant="soft"
                :ui="{ base: 'pr-0.5 gap-1' }"
              >
                {{ selectedArtistOption?.label ?? selectedArtist }}
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  square
                  variant="ghost"
                  color="neutral"
                  aria-label="Clear artist"
                  @click="selectedArtist = null"
                />
              </UBadge>
              <UBadge
                v-if="separateVariants"
                color="purple"
                variant="soft"
                :ui="{ base: 'pr-0.5 gap-1' }"
              >
                Variants split
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  square
                  variant="ghost"
                  color="neutral"
                  aria-label="Disable variant split"
                  @click="separateVariants = false"
                />
              </UBadge>
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
        v-if="isCommonMode && unsupportedFilters.length"
        color="amber"
        variant="soft"
        icon="i-lucide-info"
        title="Common search ignores some filters"
        description="Set, artist, variant split, and sorting controls are only applied in advanced mode."
        class="mb-4"
      />

      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-triangle-alert"
        title="Could not load cards"
        :description="error"
        class="mb-4"
        :actions="[
          {
            label: 'Retry',
            color: 'error',
            variant: 'soft',
            icon: 'i-lucide-refresh-cw',
            onClick: () => searchCards(),
          },
        ]"
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
