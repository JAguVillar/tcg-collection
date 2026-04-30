<script setup>
const props = defineProps({
  card: { type: Object, required: true },
  activeBinder: { type: Object, default: null },
  addStatus: { type: String, default: null },
});

const emit = defineEmits(["add"]);

const user = useSupabaseUser();

const isAdding = computed(() => props.addStatus === "pending");
const justAdded = computed(() => props.addStatus === "added");

const isCustomActive = computed(() => props.activeBinder?.mode === "custom");

const formattedVariant = computed(() => {
  const v = props.card?.variant;
  if (!v || v === "normal") return null;
  return v.replace(/([A-Z])/g, " $1").trim();
});

const variantColor = computed(() => {
  switch (props.card?.variant) {
    case "holofoil":
      return "pink";
    case "reverseHolofoil":
      return "cyan";
    default:
      return "neutral";
  }
});

const addLabel = computed(() => {
  if (justAdded.value) return "Added";
  if (!props.activeBinder) return "Pick a binder";
  return isCustomActive.value ? "Mark wanted" : "Add";
});

const addIcon = computed(() => {
  if (justAdded.value) return "i-lucide-check";
  return isCustomActive.value ? "i-lucide-list-plus" : "i-lucide-plus";
});
</script>

<template>
  <article class="flex flex-col gap-2 min-w-0">
    <CardImage :card="card" :show-status-badge="false" />

    <div class="flex flex-col gap-1 min-w-0 px-0.5">
      <div class="flex items-start justify-between gap-2 min-w-0">
        <CardMeta :card="card" />
        <span
          class="text-sm font-semibold shrink-0 tabular-nums"
          :class="
            card.formattedPrice === 'N/A'
              ? 'text-dimmed font-normal'
              : 'text-success'
          "
        >
          {{ card.formattedPrice }}
        </span>
      </div>
      <UBadge
        v-if="formattedVariant"
        :color="variantColor"
        variant="soft"
        size="sm"
        class="self-start capitalize"
      >
        {{ formattedVariant }}
      </UBadge>
    </div>

    <div v-if="user" class="flex items-stretch gap-1 px-0.5">
      <UButton
        :label="addLabel"
        :icon="addIcon"
        :color="justAdded ? 'success' : 'primary'"
        variant="soft"
        size="md"
        block
        :loading="isAdding"
        :disabled="!activeBinder || isAdding"
        :ui="{ label: 'truncate' }"
        class="flex-1 min-w-0"
        @click="emit('add', card)"
      />
      <BinderPicker
        :card="card"
        :variant="card.variant ?? 'normal'"
        :active-binder-id="activeBinder?.id ?? null"
      />
    </div>
    <UButton
      v-else
      to="/login"
      icon="i-lucide-log-in"
      label="Sign in to track"
      color="neutral"
      variant="ghost"
      size="md"
      block
      class="px-0.5"
    />
  </article>
</template>
