<script setup>
definePageMeta({ middleware: ["auth"] });

const route = useRoute();
const binderId = computed(() => route.params.id);

const { binder, items, loading, error, addCard, removeCard } =
  useBinder(binderId);
const { setActiveBinder, activeBinderId } = useBinders();
const toast = useToast();
const overlay = useOverlay();
const deleteDialog = overlay.create(
  defineAsyncComponent(() => import("~/components/ConfirmDialog.vue"))
);

const isActive = computed(() => activeBinderId.value === binderId.value);

const breadcrumbOverrides = computed(() => ({
  [`/binders/${binderId.value}`]: binder.value?.name ?? "Binder",
}));

const { pokemonSpriteUrl } = usePokemonIcons();
const iconUrl = computed(() => pokemonSpriteUrl(binder.value?.iconPokemon));

function formatVariant(variant) {
  if (!variant || variant === "normal") return null;
  return variant.replace(/([A-Z])/g, " $1").trim();
}

async function bumpUp(item) {
  if (!item.card) return;
  try {
    await addCard(item.card, item.variant, 1);
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}

async function bumpDown(item) {
  try {
    await removeCard(item.cardId, item.variant, { delta: 1 });
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}

async function removeAll(item) {
  const name = item.card?.name ?? item.cardId;
  const instance = deleteDialog.open({
    title: `Remove all copies of ${name}?`,
    description: "All copies of this card will be removed from this binder.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    color: "error",
  });
  const confirmed = await instance.result;
  if (!confirmed) return;
  try {
    await removeCard(item.cardId, item.variant, { all: true });
    toast.add({
      color: "success",
      icon: "i-lucide-trash-2",
      title: "Removed",
      description: name,
    });
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}

function onSetActive() {
  setActiveBinder(binderId.value);
  toast.add({
    color: "success",
    icon: "i-lucide-bookmark-check",
    title: "Active binder set",
    description: binder.value?.name,
  });
}
</script>

<template>
  <UDashboardPanel id="binder-detail">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #title>
          <div class="flex items-center gap-2">
            <img
              v-if="iconUrl"
              :src="iconUrl"
              :alt="binder?.iconPokemon"
              class="size-8 shrink-0 object-contain"
            />
            <AppBreadcrumb :overrides="breadcrumbOverrides" />
          </div>
        </template>

        <template #right>
          <UButton
            :label="isActive ? 'Active binder' : 'Set as active'"
            :icon="isActive ? 'i-lucide-bookmark-check' : 'i-lucide-bookmark'"
            :color="isActive ? 'primary' : 'neutral'"
            :variant="isActive ? 'soft' : 'outline'"
            :disabled="isActive"
            @click="onSetActive"
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

      <div v-if="binder?.description" class="mb-4">
        <p class="text-sm text-muted">{{ binder.description }}</p>
      </div>

      <div
        v-if="loading && !items.length"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <USkeleton v-for="n in 10" :key="n" class="h-80 rounded-lg" />
      </div>

      <div
        v-else-if="!items.length"
        class="flex flex-col items-center justify-center py-16 gap-3 text-center"
      >
        <UIcon name="i-lucide-folder-open" class="size-10 text-muted" />
        <p class="text-sm text-muted">
          This binder is empty.
          <ULink to="/" class="text-primary">Search cards</ULink>
          to start filling it.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <UCard
          v-for="item in items"
          :key="item.id"
          :ui="{ body: 'p-3 flex flex-col gap-2' }"
        >
          <div class="relative">
            <img
              v-if="item.card?.thumbImageUrl"
              :src="item.card.thumbImageUrl"
              :alt="item.card?.name"
              loading="lazy"
              class="w-full rounded-md block"
            />
            <UBadge
              v-if="formatVariant(item.variant)"
              color="primary"
              variant="solid"
              size="sm"
              class="absolute bottom-2 left-1/2 -translate-x-1/2 capitalize shadow-md"
            >
              {{ formatVariant(item.variant) }}
            </UBadge>
            <UBadge
              color="primary"
              variant="solid"
              class="absolute top-2 right-2"
            >
              x{{ item.quantity }}
            </UBadge>
          </div>

          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <img
                v-if="item.card?.setIconUrl"
                :src="item.card.setIconUrl"
                :alt="item.card?.set"
                class="size-4 shrink-0 object-contain opacity-70"
              />
              <span class="text-sm font-semibold text-default truncate">
                {{ item.card?.name ?? item.cardId }}
              </span>
            </div>
            <span
              v-if="item.card?.numberDisplay"
              class="text-xs text-muted"
            >
              #{{ item.card.numberDisplay }}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <UButtonGroup size="xs" class="flex-1">
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="outline"
                :disabled="!item.card"
                aria-label="Add one"
                class="flex-1"
                @click="bumpUp(item)"
              />
              <UButton
                icon="i-lucide-minus"
                color="neutral"
                variant="outline"
                aria-label="Remove one"
                class="flex-1"
                @click="bumpDown(item)"
              />
            </UButtonGroup>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              size="xs"
              square
              aria-label="Remove all"
              @click="removeAll(item)"
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
