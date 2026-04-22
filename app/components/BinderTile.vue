<script setup>
const props = defineProps({
  binder: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(["set-active", "make-default", "delete"]);

const { pokemonSpriteUrl, pokemonNameFromId } = usePokemonIcons();
const iconUrl = computed(() => pokemonSpriteUrl(props.binder.iconPokemon));
const iconName = computed(() => pokemonNameFromId(props.binder.iconPokemon));

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
      root: active ? 'ring-2 ring-primary/70' : 'hover:ring-primary/40',
      body: 'p-0',
    }"
  >
    <NuxtLink
      :to="`/binders/${binder.id}`"
      class="flex flex-col gap-1 p-4 min-h-28"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <img
            v-if="iconUrl"
            :src="iconUrl"
            :alt="iconName ?? ''"
            class="size-10 shrink-0 object-contain"
          />
          <h2 class="text-base font-semibold text-default truncate">
            {{ binder.name }}
          </h2>
        </div>
        <UBadge v-if="binder.isDefault" color="primary" variant="soft" size="sm">
          default
        </UBadge>
      </div>
      <p v-if="binder.description" class="text-sm text-muted line-clamp-2">
        {{ binder.description }}
      </p>
      <p class="mt-auto text-xs text-dimmed">
        {{ binder.itemCount }}
        {{ binder.itemCount === 1 ? "card" : "cards" }}
      </p>
    </NuxtLink>
    <div class="flex items-center justify-between gap-2 p-2 border-t border-muted">
      <UBadge
        v-if="active"
        color="primary"
        variant="subtle"
        icon="i-lucide-bookmark-check"
      >
        Active
      </UBadge>
      <span v-else class="text-xs text-muted px-2">Inactive</span>
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
