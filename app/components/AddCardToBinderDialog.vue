<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  binder: { type: Object, default: null },
  addCard: { type: Function, required: true },
  initialQuery: { type: String, default: "" },
  targetSlot: { type: Object, default: null },
});

const emit = defineEmits(["update:open", "added"]);

const {
  searchQuery,
  cards,
  loading,
  loadingMore,
  error,
  hasMore,
  selectedArtist,
  selectedSet,
  selectedCategory,
  searchMode,
  unsupportedFilters,
  searchCards,
  searchImmediate,
  loadMore,
  abort,
} = useCardSearch({ debounceMs: 350 });
const { options: artistOptions } = useArtists();
const { options: setOptions } = useSets();

const addStatus = ref({});
const addedCount = ref(0);
const isCommonMode = computed(() => searchMode.value === "common");

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

function reset() {
  abort();
  searchQuery.value = "";
  selectedArtist.value = null;
  selectedSet.value = null;
  selectedCategory.value = "EN";
  cards.value = [];
  addStatus.value = {};
  addedCount.value = 0;
}

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

watch(
  () => props.open,
  (open) => {
    if (!open) {
      reset();
      return;
    }
    if (props.initialQuery) {
      searchQuery.value = props.initialQuery;
      nextTick(() => {
        if (searchQuery.value.trim()) searchImmediate();
      });
    }
  },
);

watch(searchQuery, () => {
  if (searchQuery.value.trim()) searchCards();
});

watch([selectedArtist, selectedSet, selectedCategory, searchMode], () => {
  if (searchQuery.value.trim()) searchImmediate();
});

function submitSearch() {
  if (!searchQuery.value.trim()) return;
  searchImmediate();
}

async function addToBinder(card) {
  const key = cardKey(card);
  addStatus.value = { ...addStatus.value, [key]: "pending" };
  try {
    const opts = props.targetSlot ? { targetSlot: props.targetSlot } : {};
    await props.addCard(card, card.variant ?? "normal", 1, opts);
    addStatus.value = { ...addStatus.value, [key]: "added" };
    addedCount.value += 1;
    emit("added", card);
    if (props.targetSlot) emit("update:open", false);
  } catch (err) {
    addStatus.value = { ...addStatus.value, [key]: "error" };
    throw err;
  }
}

const isCustom = computed(() => props.binder?.mode === "custom");

const addLabel = computed(() =>
  isCustom.value ? "Add (want)" : "Add",
);

function setOpen(value) {
  emit("update:open", value);
}
</script>

<template>
  <UModal
    :open="open"
    :title="`Add card to ${binder?.name ?? 'binder'}`"
    description="Search for a card and add it directly to this binder."
    :ui="{ content: 'sm:max-w-3xl' }"
    @update:open="setOpen"
  >
    <template #body>
      <div class="flex flex-col gap-3 sm:gap-4">
        <form
          class="flex flex-col sm:flex-row sm:items-center gap-2"
          @submit.prevent="submitSearch"
        >
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search for a Pokémon card…"
            class="flex-1"
            size="md"
            autofocus
          />
          <LanguageSelect v-model="selectedCategory" class="sm:w-40" />
          <UButton
            type="submit"
            icon="i-lucide-search"
            :loading="loading"
            :disabled="!searchQuery.trim()"
            :ui="{ label: 'hidden sm:inline' }"
            label="Search"
            block
            class="sm:w-auto"
          />
        </form>

        <SearchModeSwitch />

        <UAlert
          v-if="isCommonMode && unsupportedFilters.length"
          color="amber"
          variant="soft"
          icon="i-lucide-info"
          description="In common mode, set and artist filters are informational and may not narrow results."
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <UInputMenu
            v-model="selectedSetOption"
            :items="setOptions"
            :virtualize="true"
            placeholder="Filter by set"
            icon="i-lucide-layers"
            clear
          />
          <UInputMenu
            v-model="selectedArtistOption"
            :items="artistOptions"
            :virtualize="true"
            placeholder="Filter by artist"
            icon="i-lucide-palette"
            clear
          />
        </div>

        <UAlert
          v-if="addedCount"
          color="primary"
          variant="soft"
          icon="i-lucide-check-circle"
          :title="`${addedCount} ${addedCount === 1 ? 'card' : 'cards'} added to ${binder?.name ?? 'binder'}`"
        />

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-triangle-alert"
          :description="error"
        />

        <div
          v-if="loading"
          class="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <USkeleton v-for="n in 6" :key="n" class="aspect-[5/7] rounded-lg" />
        </div>

        <div
          v-else-if="cards.length"
          class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] sm:max-h-[32rem] overflow-y-auto pr-1"
        >
          <UCard
            v-for="(card, index) in cards"
            :key="`${card.id}-${card.variant}-${index}`"
            :ui="{ body: 'p-2 flex flex-col gap-1.5' }"
          >
            <CardImage :card="card" :show-status-badge="false" />
            <CardMeta :card="card" />
            <UButton
              :label="
                addStatus[cardKey(card)] === 'added' ? 'Added' : addLabel
              "
              :icon="
                addStatus[cardKey(card)] === 'added'
                  ? 'i-lucide-check'
                  : 'i-lucide-plus'
              "
              color="primary"
              variant="soft"
              size="xs"
              block
              :loading="addStatus[cardKey(card)] === 'pending'"
              :disabled="addStatus[cardKey(card)] === 'pending'"
              @click="addToBinder(card)"
            />
          </UCard>
        </div>

        <EmptyState
          v-else-if="searchQuery && !loading"
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
              },
            },
          ]"
        />

        <div v-if="cards.length && hasMore" class="flex justify-center">
          <UButton
            color="neutral"
            variant="outline"
            :loading="loadingMore"
            label="Load more"
            @click="loadMore"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="outline"
          label="Done"
          block
          class="sm:w-auto"
          @click="setOpen(false)"
        />
      </div>
    </template>
  </UModal>
</template>
