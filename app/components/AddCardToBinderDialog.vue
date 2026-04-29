<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  binder: { type: Object, default: null },
  addCard: { type: Function, required: true },
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
  selectedCategory,
  searchCards,
  loadMore,
} = useCardSearch();
const { options: artistOptions } = useArtists();

const addStatus = ref({});
const addedCount = ref(0);

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

function reset() {
  searchQuery.value = "";
  selectedArtist.value = null;
  selectedCategory.value = "EN";
  cards.value = [];
  addStatus.value = {};
  addedCount.value = 0;
}

const selectedArtistOption = computed({
  get() {
    if (!selectedArtist.value) return null;
    return artistOptions.find((o) => o.value === selectedArtist.value) ?? null;
  },
  set(option) {
    selectedArtist.value = option?.value ?? null;
  },
});

watch(
  () => props.open,
  (open) => {
    if (!open) reset();
  },
);

watch(selectedArtist, () => {
  if (searchQuery.value.trim()) searchCards();
});

watch(selectedCategory, () => {
  if (searchQuery.value.trim()) searchCards();
});

function submitSearch() {
  if (!searchQuery.value.trim()) return;
  searchCards();
}

async function addToBinder(card) {
  const key = cardKey(card);
  addStatus.value = { ...addStatus.value, [key]: "pending" };
  try {
    await props.addCard(card, card.variant ?? "normal", 1);
    addStatus.value = { ...addStatus.value, [key]: "added" };
    addedCount.value += 1;
    emit("added", card);
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
          <USelect
            v-model="selectedCategory"
            :items="[
              { label: 'English (EN)', value: 'EN' },
              { label: 'Japanese (JP)', value: 'JP' },
            ]"
            icon="i-lucide-languages"
            class="sm:w-40"
          />
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

        <UInputMenu
          v-model="selectedArtistOption"
          :items="artistOptions"
          :virtualize="true"
          placeholder="Filter by artist"
          icon="i-lucide-palette"
          clear
        />

        <div
          v-if="addedCount"
          class="flex items-center justify-between gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2"
        >
          <div class="flex items-center gap-2 text-sm text-primary min-w-0">
            <UIcon
              name="i-lucide-check-circle"
              class="size-4 shrink-0"
            />
            <span class="truncate">
              <span class="font-semibold">{{ addedCount }}</span>
              {{ addedCount === 1 ? "card" : "cards" }} added to
              <span class="font-semibold">{{ binder?.name }}</span>
            </span>
          </div>
        </div>

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

        <div
          v-else-if="searchQuery && !loading"
          class="flex flex-col items-center justify-center py-8 text-muted gap-2"
        >
          <UIcon name="i-lucide-search-x" class="size-8" />
          <p class="text-sm">No cards found for "{{ searchQuery }}"</p>
        </div>

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
