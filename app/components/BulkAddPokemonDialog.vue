<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  bulkAdd: { type: Function, required: true },
});

const emit = defineEmits(["update:open", "added"]);

const { options: pokemonOptions, pokemonSpriteUrl } = usePokemonIcons();

const selected = ref(null);
const preview = ref(null);
const previewLoading = ref(false);
const previewError = ref(null);
const submitting = ref(false);
const submitError = ref(null);

function reset() {
  selected.value = null;
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

watch(selected, async (opt) => {
  preview.value = null;
  previewError.value = null;
  if (!opt) return;
  previewLoading.value = true;
  try {
    preview.value = await props.bulkAdd(opt.value, { preview: true });
  } catch (err) {
    previewError.value =
      err?.data?.statusMessage ?? err?.message ?? "Could not load preview";
  } finally {
    previewLoading.value = false;
  }
});

async function onConfirm() {
  if (!selected.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const result = await props.bulkAdd(selected.value.value, { preview: false });
    emit("added", { ...result, pokemon: selected.value });
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
</script>

<template>
  <UModal
    :open="open"
    title="Add Pokémon to checklist"
    description="Fetches every card for a given Pokémon and adds them as missing."
    @update:open="setOpen"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Pokémon" name="pokemon" required>
          <div class="flex items-center gap-3">
            <UInputMenu
              v-model="selected"
              :items="pokemonOptions"
              placeholder="Search a Pokémon…"
              icon="i-lucide-search"
              class="flex-1 min-w-0"
            />
            <img
              v-if="selected"
              :src="pokemonSpriteUrl(selected.value)"
              :alt="selected.label"
              class="size-10 shrink-0 object-contain"
            />
          </div>
        </UFormField>

        <div v-if="previewLoading" class="flex items-center gap-2 text-sm text-muted">
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
            <span class="font-semibold">{{ selected?.label }}</span>
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
            No cards found for this Pokémon.
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
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          label="Cancel"
          :disabled="submitting"
          @click="setOpen(false)"
        />
        <UButton
          :label="preview?.count ? `Add ${preview.count} cards` : 'Add cards'"
          :loading="submitting"
          :disabled="!selected || previewLoading || !preview?.count"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
