<script setup>
definePageMeta({ middleware: ["auth"] });

const {
  binders,
  loading,
  error,
  fetchBinders,
  createBinder,
  updateBinder,
  deleteBinder,
  setActiveBinder,
  activeBinder,
} = useBinders();

const toast = useToast();
const overlay = useOverlay();
const deleteDialog = overlay.create(
  defineAsyncComponent(() => import("~/components/ConfirmDialog.vue")),
);

const createOpen = ref(false);
const createLoading = ref(false);
const createState = reactive({
  name: "",
  description: "",
  iconPokemon: null,
  color: null,
  mode: "collection",
});
const createError = ref(null);

const BINDER_COLOR_PALETTE = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const colorOptions = BINDER_COLOR_PALETTE.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
}));

const colorOption = computed({
  get() {
    return colorOptions.find((o) => o.value === createState.color) ?? null;
  },
  set(option) {
    createState.color = option?.value ?? null;
  },
});

const modeOptions = [
  {
    value: "collection",
    label: "Collection",
    description: "Track cards you already own.",
  },
  {
    value: "custom",
    label: "Custom checklist",
    description: "Pick cards you want and mark them as you get them.",
  },
];

const { options: pokemonOptions, pokemonSpriteUrl } = usePokemonIcons();

const iconPokemonOption = computed({
  get() {
    return (
      pokemonOptions.find((o) => o.value === createState.iconPokemon) ?? null
    );
  },
  set(option) {
    createState.iconPokemon = option?.value ?? null;
  },
});

onMounted(() => {
  fetchBinders().catch(() => {});
});

const stats = computed(() => {
  let totalCards = 0;
  let totalChecklist = 0;
  let ownedChecklist = 0;
  let checklistCount = 0;
  for (const b of binders.value) {
    totalCards += b.itemCount ?? b.totalItems ?? 0;
    if (b.mode === "custom") {
      checklistCount++;
      totalChecklist += b.totalItems ?? b.itemCount ?? 0;
      ownedChecklist += b.ownedItems ?? 0;
    }
  }
  const completion =
    totalChecklist > 0
      ? Math.round((ownedChecklist / totalChecklist) * 100)
      : null;
  return {
    binders: binders.value.length,
    totalCards,
    checklistCount,
    completion,
  };
});

function validateCreate(values) {
  const errors = [];
  if (!values.name || !values.name.trim()) {
    errors.push({ name: "name", message: "Name is required" });
  }
  return errors;
}

async function onCreate() {
  createLoading.value = true;
  createError.value = null;
  try {
    await createBinder({
      name: createState.name.trim(),
      description: createState.description?.trim() || null,
      iconPokemon: createState.iconPokemon || null,
      color: createState.color || null,
      mode: createState.mode,
    });
    toast.add({
      color: "success",
      icon: "i-lucide-check-circle",
      title: "Binder created",
      description: createState.name,
    });
    createState.name = "";
    createState.description = "";
    createState.iconPokemon = null;
    createState.color = null;
    createState.mode = "collection";
    createOpen.value = false;
  } catch (err) {
    createError.value =
      err?.data?.statusMessage ?? err?.message ?? "Could not create binder";
  } finally {
    createLoading.value = false;
  }
}

async function onSetActive(binder) {
  try {
    await setActiveBinder(binder.id);
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
    return;
  }
  toast.add({
    color: "success",
    icon: "i-lucide-bookmark-check",
    title: "Active binder set",
    description: binder.name,
  });
}

async function onDelete(binder) {
  const instance = deleteDialog.open({
    title: `Delete "${binder.name}"?`,
    description: `This will remove all ${binder.itemCount} ${
      binder.itemCount === 1 ? "card" : "cards"
    } in it. This action cannot be undone.`,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    color: "error",
  });
  const confirmed = await instance.result;
  if (!confirmed) return;
  try {
    await deleteBinder(binder.id);
    toast.add({
      color: "success",
      icon: "i-lucide-trash-2",
      title: "Binder deleted",
      description: binder.name,
    });
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed to delete",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}
</script>

<template>
  <UDashboardPanel id="binders">
    <template #header>
      <UDashboardNavbar
        title="Binders"
        :description="activeBinder ? `Active: ${activeBinder.name}` : undefined"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="New binder"
            :ui="{ label: 'hidden sm:inline' }"
            @click="createOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-triangle-alert"
        :description="error"
        class="mb-4"
      />

      <div
        v-if="binders.length"
        class="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <UCard variant="outline" :ui="{ body: 'py-3 px-4' }">
          <p class="text-xs text-muted">Binders</p>
          <p class="text-2xl font-semibold tabular-nums">{{ stats.binders }}</p>
        </UCard>
        <UCard variant="outline" :ui="{ body: 'py-3 px-4' }">
          <p class="text-xs text-muted">Cards tracked</p>
          <p class="text-2xl font-semibold tabular-nums">
            {{ stats.totalCards }}
          </p>
        </UCard>
        <UCard variant="outline" :ui="{ body: 'py-3 px-4' }">
          <p class="text-xs text-muted">Checklists</p>
          <p class="text-2xl font-semibold tabular-nums">
            {{ stats.checklistCount }}
          </p>
        </UCard>
        <UCard variant="outline" :ui="{ body: 'py-3 px-4' }">
          <p class="text-xs text-muted">Avg. completion</p>
          <p class="text-2xl font-semibold tabular-nums">
            {{ stats.completion === null ? "—" : `${stats.completion}%` }}
          </p>
        </UCard>
      </div>

      <div
        v-if="loading && !binders.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      >
        <USkeleton v-for="n in 3" :key="n" class="h-40 rounded-lg" />
      </div>

      <EmptyState
        v-else-if="!binders.length"
        icon="i-lucide-library"
        title="No binders yet"
        description="Create your first one to start tracking your collection."
        :actions="[
          {
            label: 'Create binder',
            icon: 'i-lucide-plus',
            onClick: () => (createOpen = true),
          },
        ]"
      />

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      >
        <BinderTile
          v-for="b in binders"
          :key="b.id"
          :binder="b"
          :active="activeBinder?.id === b.id"
          @set-active="onSetActive"
          @delete="onDelete"
        />
      </div>

      <USlideover
        v-model:open="createOpen"
        title="New binder"
        description="Organize your cards into a themed binder."
        :ui="{ content: 'max-w-md' }"
      >
        <template #body>
          <UForm
            id="create-binder-form"
            :state="createState"
            :validate="validateCreate"
            class="flex flex-col gap-4"
            @submit="onCreate"
          >
            <UFormField label="Type" name="mode">
              <URadioGroup
                v-model="createState.mode"
                :items="modeOptions"
                value-key="value"
                variant="table"
              />
            </UFormField>

            <UFormField label="Name" name="name" required>
              <UInput
                v-model="createState.name"
                placeholder="My shiny collection"
                autofocus
                class="w-full"
              />
            </UFormField>

            <UFormField label="Description" name="description">
              <UTextarea
                v-model="createState.description"
                placeholder="What goes in this binder?"
                :rows="3"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Pokémon icon"
              name="iconPokemon"
              help="Optional. Used as the binder's icon."
            >
              <div class="flex items-center gap-3">
                <UInputMenu
                  v-model="iconPokemonOption"
                  :items="pokemonOptions"
                  :virtualize="true"
                  placeholder="Search a Pokémon…"
                  icon="i-lucide-search"
                  class="flex-1 min-w-0"
                />
                <img
                  v-if="createState.iconPokemon"
                  :src="pokemonSpriteUrl(createState.iconPokemon)"
                  :alt="createState.iconPokemon"
                  class="size-10 shrink-0 object-contain"
                />
              </div>
            </UFormField>

            <UFormField
              label="Color"
              name="color"
              help="Optional. Used as the binder's accent. Defaults to primary."
            >
              <USelectMenu
                v-model="colorOption"
                :items="colorOptions"
                placeholder="Default"
                clearable
                class="w-full"
              >
                <template #leading>
                  <span
                    v-if="createState.color"
                    class="size-3 rounded-full"
                    :style="{
                      background: `var(--ui-color-${createState.color}-500)`,
                    }"
                  />
                </template>
                <template #item-leading="{ item }">
                  <span
                    class="size-3 rounded-full"
                    :style="{
                      background: `var(--ui-color-${item.value}-500)`,
                    }"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <UAlert
              v-if="createError"
              color="error"
              icon="i-lucide-triangle-alert"
              :description="createError"
            />
          </UForm>
        </template>

        <template #footer>
          <div class="flex w-full gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Cancel"
              @click="createOpen = false"
            />
            <UButton
              type="submit"
              form="create-binder-form"
              label="Create binder"
              :loading="createLoading"
              class="ml-auto"
            />
          </div>
        </template>
      </USlideover>
    </template>
  </UDashboardPanel>
</template>
