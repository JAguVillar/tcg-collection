<script setup>
const user = useSupabaseUser();
const open = ref(false);

const { activeBinder, binders, loaded, fetchBinders, setActiveBinder } =
  useBinders();
const { pokemonSpriteUrl } = usePokemonIcons();

if (user.value && !loaded.value) {
  fetchBinders().catch(() => {});
}

watch(user, (next) => {
  if (next && !loaded.value) fetchBinders().catch(() => {});
});

const navItems = computed(() => [
  [
    { label: "Search", icon: "i-lucide-search", to: "/" },
    ...(user.value
      ? [{ label: "My binders", icon: "i-lucide-library", to: "/binders" }]
      : []),
  ],
]);

const binderMenuItems = computed(() => {
  if (!binders.value.length) {
    return [
      [
        {
          label: "Create your first binder",
          icon: "i-lucide-plus",
          to: "/binders",
        },
      ],
    ];
  }
  return [
    binders.value.map((b) => ({
      label: b.name,
      icon:
        b.mode === "custom" ? "i-lucide-list-checks" : "i-lucide-folder",
      checked: activeBinder.value?.id === b.id,
      type: "checkbox",
      onSelect: () => setActiveBinder(b.id),
    })),
    [
      {
        label: "Manage binders",
        icon: "i-lucide-settings-2",
        to: "/binders",
      },
    ],
  ];
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <AppLogo :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems"
          orientation="vertical"
          tooltip
          popover
        />

        <div v-if="user" class="mt-6">
          <p
            v-if="!collapsed"
            class="px-2 mb-1.5 text-[10px] uppercase tracking-wide text-muted font-medium"
          >
            Adding to
          </p>
          <UDropdownMenu
            :items="binderMenuItems"
            :content="{ side: 'right', align: 'start' }"
          >
            <UButton
              :block="!collapsed"
              :square="collapsed"
              color="neutral"
              variant="subtle"
              class="justify-start"
              :aria-label="
                activeBinder
                  ? `Active binder: ${activeBinder.name}. Change`
                  : 'Pick an active binder'
              "
            >
              <img
                v-if="activeBinder?.iconPokemon"
                :src="pokemonSpriteUrl(activeBinder.iconPokemon)"
                :alt="activeBinder.iconPokemon"
                class="size-5 shrink-0 object-contain"
              />
              <UIcon
                v-else
                :name="
                  activeBinder?.mode === 'custom'
                    ? 'i-lucide-list-checks'
                    : 'i-lucide-folder'
                "
                class="size-4 shrink-0"
              />
              <span v-if="!collapsed" class="truncate text-sm flex-1 text-left">
                {{ activeBinder?.name ?? "Pick a binder" }}
              </span>
              <UIcon
                v-if="!collapsed"
                name="i-lucide-chevrons-up-down"
                class="size-3.5 text-muted shrink-0"
              />
            </UButton>
          </UDropdownMenu>
        </div>
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
