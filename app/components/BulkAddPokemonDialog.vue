<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  bulkAdd: { type: Function, required: true },
});

const emit = defineEmits(["update:open", "added"]);

const { options: artistOptions } = useArtists();
const { options: setOptions } = useSets();

const SOURCE_MODES = [
  { label: "By search", value: "query" },
  { label: "By artist", value: "artist" },
  { label: "By set", value: "set" },
];

const sourceMode = ref("query");
const searchQuery = ref("");
const selectedArtist = ref(null);
const selectedSet = ref(null);
const selectedCategory = ref("EN");
const separateVariants = ref(false);
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

watch([currentSelection, separateVariants, selectedCategory], () => {
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

const masterSetDescription = computed(() => {
  if (sourceMode.value === "query") {
    return "Add all variants of matching cards as separate entries (normal, holofoil, reverse holo, etc.)";
  }
  return "Add every variant as a separate entry (normal, holofoil, reverse holo, etc.)";
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
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-3 sm:gap-4">
          <UFormField
            :label="sourceFieldLabel"
            :name="sourceMode"
            required
            class="flex-1"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-if="sourceMode === 'query'"
                v-model="searchQuery"
                placeholder="Search cards (e.g. pikachu, professor, energy)…"
                icon="i-lucide-search"
                class="flex-1 min-w-0"
              />

              <UInputMenu
                v-else-if="sourceMode === 'artist'"
                v-model="selectedArtistOption"
                :items="artistOptions"
                :virtualize="true"
                placeholder="Search an artist…"
                icon="i-lucide-palette"
                clear
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
                class="flex-1 min-w-0"
              />
            </div>
          </UFormField>
          <UFormField label="Language" name="language" required class="sm:w-40">
            <USelect
              v-model="selectedCategory"
              :items="[
                { label: 'English (EN)', value: 'EN' },
                { label: 'Japanese (JP)', value: 'JP' },
              ]"
              icon="i-lucide-languages"
              placeholder="Select language"
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          color="amber"
          :variant="separateVariants ? 'subtle' : 'soft'"
          icon="i-lucide-gem"
        >
          <template #title> Master set </template>
          <template #description>
            <p>{{ masterSetDescription }}</p>
          </template>
          <template #actions>
            <UFormField>
              <USwitch
                v-model="separateVariants"
                label="Add all variants"
                color="amber"
              />
            </UFormField>
          </template>
        </UAlert>

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
