<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  bulkAdd: { type: Function, required: true },
});

const emit = defineEmits(["update:open", "added"]);

const { options: artistOptions } = useArtists();
const { options: setOptions } = useSets();

const search = useCardSearch();
const {
  searchQuery,
  selectedArtist,
  selectedSet,
  selectedCategory,
  separateVariants,
  searchMode,
} = search;

const SOURCE_MODES = [
  { label: "By search", value: "query" },
  { label: "By artist", value: "artist" },
  { label: "By set", value: "set" },
];

const sourceMode = ref("query");
const preview = ref(null);
const previewLoading = ref(false);
const previewError = ref(null);
const submitting = ref(false);
const submitError = ref(null);

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

const currentSelection = computed(() => {
  if (sourceMode.value === "artist") return selectedArtist.value;
  if (sourceMode.value === "set") return selectedSet.value;
  return searchQuery.value.trim();
});

const sourceLabel = computed(() => {
  if (!currentSelection.value) {
    if (sourceMode.value === "artist") return "this artist";
    if (sourceMode.value === "set") return "this set";
    return "this search";
  }
  if (sourceMode.value === "artist") {
    return selectedArtistOption.value?.label ?? selectedArtist.value;
  }
  if (sourceMode.value === "set") {
    return selectedSetOption.value?.label ?? selectedSet.value;
  }
  return currentSelection.value;
});

function buildPayload() {
  const base = {
    separateVariants: separateVariants.value,
    category: selectedCategory.value,
    searchMode: searchMode.value,
  };
  if (sourceMode.value === "artist") {
    return { ...base, mode: "artist", artist: selectedArtist.value };
  }
  if (sourceMode.value === "set") {
    return { ...base, mode: "set", set: selectedSet.value };
  }
  return { ...base, mode: "query", query: searchQuery.value.trim() };
}

function reset() {
  sourceMode.value = "query";
  searchQuery.value = "";
  selectedArtist.value = null;
  selectedSet.value = null;
  selectedCategory.value = "EN";
  separateVariants.value = false;
  preview.value = null;
  previewError.value = null;
  submitError.value = null;
}

watch(
  () => props.open,
  (open) => {
    if (!open) reset();
  },
);

watch(sourceMode, () => {
  preview.value = null;
  previewError.value = null;
  submitError.value = null;
});

async function refreshPreview() {
  preview.value = null;
  previewError.value = null;
  submitError.value = null;
  if (!currentSelection.value) return;
  if (sourceMode.value === "query" && currentSelection.value.length < 2) return;
  previewLoading.value = true;
  try {
    preview.value = await props.bulkAdd(buildPayload(), { preview: true });
  } catch (err) {
    previewError.value =
      err?.data?.statusMessage ?? err?.message ?? "Could not load preview";
  } finally {
    previewLoading.value = false;
  }
}

watch([currentSelection, separateVariants, selectedCategory, searchMode], () => {
  refreshPreview();
});

async function onConfirm() {
  if (!currentSelection.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const result = await props.bulkAdd(buildPayload(), { preview: false });
    emit("added", {
      ...result,
      source: {
        mode: sourceMode.value,
        label: sourceLabel.value,
        value: currentSelection.value,
        category: selectedCategory.value,
      },
    });
    emit("update:open", false);
  } catch (err) {
    submitError.value =
      err?.data?.statusMessage ?? err?.message ?? "Could not add cards";
  } finally {
    submitting.value = false;
  }
}

function setOpen(value) {
  emit("update:open", value);
}

const sourceFieldLabel = computed(() => {
  if (sourceMode.value === "artist") return "Artist";
  if (sourceMode.value === "set") return "Set";
  return "Search query";
});

const emptyMessageNoun = computed(() => {
  if (sourceMode.value === "artist") return "artist";
  if (sourceMode.value === "set") return "set";
  return "search";
});
</script>

<template>
  <UModal
    :open="open"
    title="Bulk add cards"
    description="Fetches cards by search, artist or set and adds missing ones to this checklist."
    @update:open="setOpen"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UTabs
          :items="SOURCE_MODES"
          v-model="sourceMode"
          variant="pill"
          size="sm"
          :content="false"
        />

        <UFormField :label="sourceFieldLabel" :name="sourceMode" required>
          <CardSearchBar
            :search="search"
            :show-submit="false"
            :show-sort="false"
            :show-set-filter="false"
            :show-artist-filter="false"
            size="md"
            placeholder="Search cards (e.g. pikachu, professor, energy)…"
          >
            <template v-if="sourceMode !== 'query'" #input>
              <UInputMenu
                v-if="sourceMode === 'artist'"
                v-model="selectedArtistOption"
                :items="artistOptions"
                :virtualize="true"
                placeholder="Search an artist…"
                icon="i-lucide-palette"
                clear
                size="md"
                class="flex-1 min-w-0"
              />
              <UInputMenu
                v-else
                v-model="selectedSetOption"
                :items="setOptions"
                :virtualize="true"
                placeholder="Search a set…"
                icon="i-lucide-layers"
                clear
                size="md"
                class="flex-1 min-w-0"
              />
            </template>
          </CardSearchBar>
        </UFormField>

        <div
          v-if="previewLoading"
          class="flex items-center gap-2 text-sm text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          Loading preview…
        </div>

        <UAlert
          v-if="previewError"
          color="error"
          icon="i-lucide-triangle-alert"
          :description="previewError"
        />

        <div
          v-if="preview && !previewLoading"
          class="flex flex-col gap-3 rounded-md border border-muted p-3"
        >
          <p class="text-sm text-default">
            <span class="font-semibold">{{ preview.count }}</span>
            {{ preview.count === 1 ? "card" : "cards" }} found for
            <span class="font-semibold">{{ sourceLabel }}</span>
            <span v-if="preview.truncated" class="text-muted">
              (truncated — showing first batch)
            </span>
          </p>
          <div
            v-if="preview.sample?.length"
            class="grid grid-cols-3 sm:grid-cols-6 gap-2"
          >
            <img
              v-for="c in preview.sample"
              :key="c.id"
              :src="c.thumbImageUrl"
              :alt="c.name"
              loading="lazy"
              class="w-full rounded-sm"
            />
          </div>
          <p v-if="preview.count === 0" class="text-sm text-muted">
            No cards found for this {{ emptyMessageNoun }}.
          </p>
          <p v-else class="text-xs text-muted">
            Cards already in this binder will be skipped.
          </p>
        </div>

        <UAlert
          v-if="submitError"
          color="error"
          icon="i-lucide-triangle-alert"
          :description="submitError"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          label="Cancel"
          :disabled="submitting"
          block
          class="sm:w-auto"
          @click="setOpen(false)"
        />
        <UButton
          :label="preview?.count ? `Add ${preview.count} cards` : 'Add cards'"
          :loading="submitting"
          :disabled="!currentSelection || previewLoading || !preview?.count"
          block
          class="sm:w-auto"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
