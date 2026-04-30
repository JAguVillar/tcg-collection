<script setup>
const props = defineProps({
  binder: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(["set-active", "make-default", "delete"]);

const { pokemonSpriteUrl } = usePokemonIcons();
const iconUrl = computed(() => pokemonSpriteUrl(props.binder.iconPokemon));

const accent = computed(() => props.binder.color ?? "primary");

const isCustom = computed(() => props.binder.mode === "custom");
const ownedItems = computed(() => props.binder.ownedItems ?? 0);
const totalItems = computed(
  () => props.binder.totalItems ?? props.binder.itemCount ?? 0,
);
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
  <BaseTile
    :ui="{
      root: [
        'binder-tile transition overflow-hidden',
        active && 'binder-tile--active',
      ]
        .filter(Boolean)
        .join(' '),
      body: 'p-0',
    }"
    :style="{
      '--binder-accent': `var(--ui-color-${accent}-500)`,
      '--binder-accent-soft': `var(--ui-color-${accent}-100)`,
    }"
  >
    <div class="relative flex items-stretch min-h-28">
      <NuxtLink
        :to="`/binders/${binder.id}`"
        class="absolute inset-0 z-0"
        :aria-label="binder.name"
      />

      <div
        class="shrink-0 w-24 sm:w-28 flex items-center justify-center rounded-md"
        :style="{ backgroundColor: 'var(--binder-accent-soft)' }"
      >
        <img
          v-if="iconUrl"
          :src="iconUrl"
          :alt="binder.iconPokemon"
          class="size-24 sm:size-24 object-contain"
        />
        <UIcon
          v-else
          name="i-lucide-folder"
          class="size-10 binder-tile__placeholder"
        />
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-1.5 p-4">
        <div class="flex items-start justify-between gap-2 min-w-0">
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold text-default truncate">
              {{ binder.name }}
            </h2>
            <p
              v-if="binder.description"
              class="text-xs text-muted line-clamp-1"
            >
              {{ binder.description }}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0 binder-tile__indicators">
            <UBadge
              v-if="binder.isDefault"
              trailing-icon="i-lucide-star"
              variant="soft"
              :aria-label="'Default'"
              color="primary"
            >
              Default
            </UBadge>
            <BinderModeBadge v-if="isCustom" :mode="binder.mode" />
          </div>
        </div>

        <UProgress
          v-if="isCustom && totalItems"
          :model-value="progressPct"
          :max="100"
          size="xs"
            color="warning"
            class="my-1"
          />

        <div class="mt-auto flex items-center justify-between gap-2">
          <p class="text-xs text-muted truncate">
            <template v-if="isCustom">
              {{ ownedItems }} of {{ totalItems }}
            </template>
            <template v-else>
              {{ binder.itemCount }}
              {{ binder.itemCount === 1 ? "Card" : "Cards" }}
            </template>
          </p>
          <div class="relative z-20">
            <UDropdownMenu :items="menuItems">
              <UButton
                :icon="
                  active
                    ? 'i-lucide-bookmark-check'
                    : 'i-lucide-ellipsis-vertical'
                "
                :color="accent"
                variant="ghost"
                size="xs"
                square
                :aria-label="
                  active ? 'Active binder · actions' : 'Binder actions'
                "
                @click.prevent
              />
            </UDropdownMenu>
          </div>
        </div>
      </div>
    </div>
  </BaseTile>
</template>

<style scoped>
.binder-tile {
  transition: box-shadow 150ms ease;
}
.binder-tile:hover {
  box-shadow: 0 0 0 1px var(--binder-accent);
}
.binder-tile--active {
  box-shadow: 0 0 0 2px var(--binder-accent);
}
.binder-tile__indicators {
  color: var(--binder-accent);
}
.binder-tile__placeholder {
  color: var(--binder-accent);
}
</style>
