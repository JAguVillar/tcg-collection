<script setup>
const props = defineProps({
  card: { type: Object, required: true },
  activeBinder: { type: Object, default: null },
  addStatus: { type: String, default: null },
});

const emit = defineEmits(["add"]);

const user = useSupabaseUser();

const formattedVariant = computed(() => {
  const v = props.card.variant;
  if (!v || v === "normal" || v === "holofoil") return null;
  return v.replace(/([A-Z])/g, " $1").trim();
});

const isAdding = computed(() => props.addStatus === "pending");
const justAdded = computed(() => props.addStatus === "added");
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
      <UBadge
        v-if="formattedVariant"
        color="primary"
        variant="solid"
        size="sm"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 capitalize shadow-md"
      >
        {{ formattedVariant }}
      </UBadge>
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
      <span
        class="text-sm font-bold shrink-0"
        :class="card.formattedPrice === 'N/A' ? 'text-dimmed font-normal' : 'text-success'"
      >
        {{ card.formattedPrice }}
      </span>
    </div>

    <div v-if="user" class="flex items-center gap-1.5">
      <UButton
        :label="justAdded
          ? 'Added'
          : activeBinder
            ? `+ ${activeBinder.name}`
            : 'No binder'"
        :icon="justAdded ? 'i-lucide-check' : undefined"
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
      <BinderPicker :card="card" :variant="card.variant ?? 'normal'" />
    </div>
  </UCard>
</template>
