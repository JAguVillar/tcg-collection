<script setup>
const props = defineProps({
  binder: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(["set-active", "make-default", "delete"]);

const { pokemonSpriteUrl } = usePokemonIcons();
const iconUrl = computed(() => pokemonSpriteUrl(props.binder.iconPokemon));

const isCustom = computed(() => props.binder.mode === "custom");
const ownedItems = computed(() => props.binder.ownedItems ?? 0);
const totalItems = computed(() => props.binder.totalItems ?? props.binder.itemCount ?? 0);
const progressPct = computed(() => {
  if (!totalItems.value) return 0;
  return Math.round((ownedItems.value / totalItems.value) * 100);
});

const menuItems = computed(() => {
  const groups = [];
  const first = [];
  if (!props.active) {
    first.push({
      label: "Set as active",
      icon: "i-lucide-bookmark",
      onSelect: () => emit("set-active", props.binder),
    });
  }
  if (!props.binder.isDefault) {
    first.push({
      label: "Make default",
      icon: "i-lucide-star",
      onSelect: () => emit("make-default", props.binder),
    });
  }
  if (first.length) groups.push(first);
  groups.push([
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("delete", props.binder),
    },
  ]);
  return groups;
});
</script>

<template>
  <UCard
    :ui="{
      root: active
        ? 'ring-2 ring-primary/70 transition'
        : 'hover:ring-primary/40 transition',
      body: 'p-0',
    }"
  >
    <NuxtLink
      :to="`/binders/${binder.id}`"
      class="flex flex-col gap-2 p-4 min-h-28"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <img
            v-if="iconUrl"
            :src="iconUrl"
            :alt="binder.iconPokemon"
            class="size-12 sm:size-14 shrink-0 object-contain"
          />
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-default truncate">
              {{ binder.name }}
            </h2>
            <p
              v-if="!isCustom"
              class="text-xs text-dimmed"
            >
              {{ binder.itemCount }}
              {{ binder.itemCount === 1 ? "card" : "cards" }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <UBadge
            v-if="isCustom"
            color="info"
            variant="soft"
            size="sm"
            icon="i-lucide-list-checks"
          >
            custom
          </UBadge>
          <UBadge
            v-if="binder.isDefault"
            color="primary"
            variant="soft"
            size="sm"
          >
            default
          </UBadge>
        </div>
      </div>
      <p v-if="binder.description" class="text-sm text-muted line-clamp-2">
        {{ binder.description }}
      </p>
      <div v-if="isCustom" class="mt-auto flex flex-col gap-1">
        <p class="text-xs text-dimmed">
          {{ ownedItems }} / {{ totalItems }} collected
          <span v-if="totalItems">· {{ progressPct }}%</span>
        </p>
        <UProgress
          v-if="totalItems"
          :model-value="progressPct"
          :max="100"
          size="xs"
          color="primary"
        />
      </div>
    </NuxtLink>
    <div
      class="flex items-center justify-between gap-2 px-3 py-2 border-t border-default"
    >
      <UBadge
        v-if="active"
        color="primary"
        variant="subtle"
        size="sm"
        icon="i-lucide-bookmark-check"
      >
        Active
      </UBadge>
      <span v-else class="text-xs text-muted">Inactive</span>
      <UDropdownMenu :items="menuItems">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          aria-label="Binder actions"
        />
      </UDropdownMenu>
    </div>
  </UCard>
</template>
