<script setup>
const props = defineProps({
  card: { type: Object, required: true },
  activeBinder: { type: Object, default: null },
  defaultBinder: { type: Object, default: null },
  addStatus: { type: String, default: null },
  addToDefaultStatus: { type: String, default: null },
});

const emit = defineEmits(["add", "add-default"]);

const user = useSupabaseUser();

const isAdding = computed(() => props.addStatus === "pending");
const justAdded = computed(() => props.addStatus === "added");

const isCustomActive = computed(() => props.activeBinder?.mode === "custom");

const addLabel = computed(() => {
  if (justAdded.value) return isCustomActive.value ? "Added to list" : "Added";
  if (!props.activeBinder) return "No binder";
  return isCustomActive.value
    ? `+ ${props.activeBinder.name} (want)`
    : `+ ${props.activeBinder.name}`;
});

const showDefaultAdd = computed(
  () =>
    !!props.defaultBinder &&
    !!props.activeBinder &&
    props.defaultBinder.id !== props.activeBinder.id,
);
const isAddingDefault = computed(() => props.addToDefaultStatus === "pending");
const justAddedDefault = computed(() => props.addToDefaultStatus === "added");
</script>

<template>
  <UCard
    :ui="{
      root: 'cursor-pointer overflow-hidden transition hover:ring-primary/60 hover:-translate-y-0.5',
      body: 'p-2.5 sm:p-3 flex flex-col gap-2',
    }"
  >
    <CardImage :card="card" :show-status-badge="false" />

    <div class="flex items-start justify-between gap-2 min-w-0">
      <CardMeta :card="card" />
      <div class="flex flex-col items-end gap-1">
        <span
          class="text-md font-bold shrink-0"
          :class="
            card.formattedPrice === 'N/A'
              ? 'text-dimmed font-normal'
              : 'text-success'
          "
        >
          {{ card.formattedPrice }}
        </span>
        <CardVariantBadge :variant="card?.variant" />
      </div>
    </div>

    <div v-if="user" class="flex items-center gap-1.5">
      <UButton
        :label="addLabel"
        :icon="
          justAdded
            ? 'i-lucide-check'
            : isCustomActive
              ? 'i-lucide-list-plus'
              : undefined
        "
        color="primary"
        variant="soft"
        size="md"
        block
        :loading="isAdding"
        :disabled="!activeBinder || isAdding"
        :ui="{ label: 'truncate' }"
        class="flex-1 min-w-0"
        @click="emit('add', card)"
      />
      <UTooltip v-if="showDefaultAdd" :text="`Add to ${defaultBinder.name}`">
        <UButton
          :icon="justAddedDefault ? 'i-lucide-check' : 'i-lucide-library'"
          color="primary"
          variant="outline"
          size="md"
          square
          :loading="isAddingDefault"
          :disabled="isAddingDefault"
          :aria-label="`Add to ${defaultBinder.name}`"
          @click="emit('add-default', card)"
        />
      </UTooltip>
      <BinderPicker :card="card" :variant="card.variant ?? 'normal'" />
    </div>
  </UCard>
</template>
