<script setup>
const search = useCardSearch();
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
  searchMode,
  unsupportedFilters,
  searchCards,
  loadMore,
} = search;

const user = useSupabaseUser();
const { activeBinder } = useBinders();
const toast = useToast();

const quickAddStatus = ref({});

searchCards({ query: "" });

watch(
  [separateVariants, selectedArtist, selectedSet, selectedCategory, searchMode],
  () => {
    searchCards();
  },
);

const isCommonMode = computed(() => searchMode.value === "common");

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

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
          <div class="w-full py-3">
            <CardSearchBar :search="search" @submit="searchCards()" />
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
