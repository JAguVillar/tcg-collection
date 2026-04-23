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
  searchCards,
  loadMore,
} = useCardSearch();

const addStatus = ref({});

function cardKey(card) {
  return `${card.id}:${card.variant ?? "normal"}`;
}

function reset() {
  searchQuery.value = "";
  cards.value = [];
  addStatus.value = {};
}

watch(
  () => props.open,
  (open) => {
    if (!open) reset();
  },
);

function formatVariant(variant) {
  if (!variant || variant === "normal" || variant === "holofoil") return null;
  return variant.replace(/([A-Z])/g, " $1").trim();
}

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
      <div class="flex flex-col gap-4">
        <form class="flex items-center gap-2" @submit.prevent="submitSearch">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search for a Pokémon card…"
            class="flex-1"
            size="md"
            autofocus
          />
          <UButton
            type="submit"
            icon="i-lucide-search"
            label="Search"
            :loading="loading"
            :disabled="!searchQuery.trim()"
          />
        </form>

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
          <USkeleton v-for="n in 6" :key="n" class="h-56 rounded-lg" />
        </div>

        <div
          v-else-if="cards.length"
          class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[28rem] overflow-y-auto pr-1"
        >
          <UCard
            v-for="(card, index) in cards"
            :key="`${card.id}-${card.variant}-${index}`"
            :ui="{ body: 'p-2 flex flex-col gap-1.5' }"
          >
            <div class="relative">
              <img
                :src="card.thumbImageUrl"
                :alt="card.name"
                loading="lazy"
                class="w-full rounded-md block"
              />
              <UBadge
                v-if="formatVariant(card.variant)"
                color="primary"
                variant="solid"
                size="sm"
                class="absolute bottom-1 left-1/2 -translate-x-1/2 capitalize shadow-md"
              >
                {{ formatVariant(card.variant) }}
              </UBadge>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-default truncate">
                {{ card.name }}
              </span>
              <span class="text-xs text-muted">#{{ card.numberDisplay }}</span>
            </div>
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
          @click="setOpen(false)"
        />
      </div>
    </template>
  </UModal>
</template>
