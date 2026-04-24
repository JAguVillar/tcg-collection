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
  mode: "collection",
});
const createError = ref(null);

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
    createState.mode = "collection";
    createOpen.value = false;
  } catch (err) {
    createError.value =
      err?.data?.statusMessage ?? err?.message ?? "Could not create binder";
  } finally {
    createLoading.value = false;
  }
}

async function onMakeDefault(binder) {
  try {
    await updateBinder(binder.id, { isDefault: true });
    toast.add({
      color: "success",
      icon: "i-lucide-star",
      title: "Default binder updated",
      description: binder.name,
    });
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}

function onSetActive(binder) {
  setActiveBinder(binder.id);
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
        v-if="loading && !binders.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <USkeleton v-for="n in 3" :key="n" class="h-40 rounded-lg" />
      </div>

      <div
        v-else-if="!binders.length"
        class="flex flex-col items-center justify-center py-16 gap-3 text-center"
      >
        <UIcon name="i-lucide-library" class="size-10 text-muted" />
        <p class="text-sm text-muted max-w-xs">
          You don't have any binders yet. Create your first one to start
          tracking your collection.
        </p>
        <UButton
          icon="i-lucide-plus"
          label="Create binder"
          @click="createOpen = true"
        />
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <BinderTile
          v-for="b in binders"
          :key="b.id"
          :binder="b"
          :active="activeBinder?.id === b.id"
          @set-active="onSetActive"
          @make-default="onMakeDefault"
          @delete="onDelete"
        />
      </div>

      <UModal
        v-model:open="createOpen"
        title="New binder"
        description="Organize your cards into a themed binder."
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

            <UAlert
              v-if="createError"
              color="error"
              icon="i-lucide-triangle-alert"
              :description="createError"
            />
          </UForm>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Cancel"
              @click="createOpen = false"
            />
            <UButton
              type="submit"
              form="create-binder-form"
              label="Create"
              :loading="createLoading"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
