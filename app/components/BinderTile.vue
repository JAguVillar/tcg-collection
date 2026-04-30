<script setup>
const props = defineProps({
  binder: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(["set-active", "delete"]);

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

const summary = computed(() => {
  if (isCustom.value) {
    return `${ownedItems.value} of ${totalItems.value} collected`;
  }
  const count = props.binder.itemCount ?? 0;
  return `${count} ${count === 1 ? "card" : "cards"}`;
});

const menuItems = computed(() => {
  const groups = [];
  if (!props.active) {
    groups.push([
      {
        label: "Set as active",
        icon: "i-lucide-bookmark",
        onSelect: () => emit("set-active", props.binder),
      },
    ]);
  }
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
  <NuxtLink
    :to="`/binders/${binder.id}`"
    class="binder-tile group relative flex flex-col gap-3 rounded-lg border border-default p-4 transition focus-visible:outline-2 focus-visible:outline-offset-2"
    :class="{ 'binder-tile--active': active }"
    :style="{
      '--binder-accent': `var(--ui-color-${accent}-500)`,
      '--binder-accent-soft': `var(--ui-color-${accent}-100)`,
    }"
    :aria-label="binder.name"
  >
    <div class="flex items-start gap-3 min-w-0">
      <div
        class="size-12 shrink-0 rounded-md flex items-center justify-center binder-tile__icon"
      >
        <img
          v-if="iconUrl"
          :src="iconUrl"
          :alt="binder.iconPokemon"
          class="size-10 object-contain"
        />
        <UIcon
          v-else
          name="i-lucide-folder"
          class="size-6 binder-tile__placeholder"
        />
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-semibold text-default truncate">
          {{ binder.name }}
        </h3>
        <p
          v-if="binder.description"
          class="text-xs text-muted line-clamp-1"
        >
          {{ binder.description }}
        </p>
        <p v-else class="text-xs text-muted truncate">
          {{ summary }}
        </p>
      </div>

      <div class="relative z-10">
        <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            aria-label="Binder actions"
            @click.stop.prevent
          />
        </UDropdownMenu>
      </div>
    </div>

    <UProgress
      v-if="isCustom && totalItems"
      :model-value="progressPct"
      :max="100"
      size="xs"
    />

    <div class="flex items-center justify-between gap-2 text-xs">
      <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
        <UBadge
          v-if="active"
          color="primary"
          variant="soft"
          icon="i-lucide-bookmark-check"
          size="xs"
        >
          Active
        </UBadge>
        <UBadge
          v-if="isCustom"
          color="pink"
          variant="soft"
          icon="i-lucide-list-checks"
          size="xs"
        >
          Checklist
        </UBadge>
      </div>
      <span
        v-if="binder.description"
        class="text-muted tabular-nums shrink-0"
      >
        {{ summary }}
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.binder-tile {
  background-color: transparent;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}
.binder-tile:hover {
  border-color: var(--binder-accent);
}
.binder-tile:focus-visible {
  outline-color: var(--binder-accent);
}
.binder-tile--active {
  border-color: var(--binder-accent);
  background-color: color-mix(in oklch, var(--binder-accent) 6%, transparent);
}
.binder-tile__icon {
  background-color: color-mix(
    in oklch,
    var(--binder-accent) 12%,
    transparent
  );
}
.binder-tile__placeholder {
  color: var(--binder-accent);
}
</style>
