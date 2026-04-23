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

const formattedVariant = computed(() => {
  const v = props.card.variant;
  if (!v || v === "normal" || v === "holofoil") return null;
  return v.replace(/([A-Z])/g, " $1").trim();
});

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
      root: 'overflow-hidden transition hover:ring-primary/60 hover:-translate-y-0.5',
      body: 'p-3 flex flex-col gap-2',
    }"
  >
    <div class="relative">
      <img
        :src="card.thumbImageUrl"
        :alt="card.name"
        loading="lazy"
        class="w-full rounded-md block"
      />
      <!-- <UBadge
        v-if="formattedVariant"
        color="primary"
        variant="solid"
        size="sm"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 capitalize shadow-md"
      >
        {{ formattedVariant }}
      </UBadge> -->
    </div>

    <div class="flex items-start justify-between gap-2 min-w-0">
      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-1.5 min-w-0">
          <img
            v-if="card.setIconUrl"
            :src="card.setIconUrl"
            :alt="card.set"
            class="size-4 shrink-0 object-contain opacity-70"
          />
          <span class="text-sm font-semibold text-default truncate">
            {{ card.name }}
          </span>
        </div>
        <span class="text-xs text-muted">#{{ card.numberDisplay }}</span>
      </div>

      <div class="flex flex-col items-end justify-end min-w-0">
        <span
          class="text-sm font-bold shrink-0"
          :class="
            card.formattedPrice === 'N/A'
              ? 'text-dimmed font-normal'
              : 'text-success'
          "
        >
          {{ card.formattedPrice }}
        </span>
        <UBadge
          v-if="formattedVariant"
          color="purple"
          variant="solid"
          size="sm"
          class="capitalize shadow-md"
        >
          {{ formattedVariant }}
        </UBadge>

        <!-- <span class="text-xs capitalize">
          {{ formattedVariant }}
        </span> -->
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
        size="xs"
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
          size="xs"
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
