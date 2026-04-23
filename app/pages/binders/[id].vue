<script setup>
definePageMeta({ middleware: ["auth"] });

const route = useRoute();
const binderId = computed(() => route.params.id);

const {
  binder,
  items,
  loading,
  error,
  addCard,
  removeCard,
  setOwned,
  bulkAdd,
} = useBinder(binderId);
const { setActiveBinder, activeBinderId, fetchBinders } = useBinders();
const toast = useToast();
const overlay = useOverlay();
const deleteDialog = overlay.create(
  defineAsyncComponent(() => import("~/components/ConfirmDialog.vue")),
);

const isActive = computed(() => activeBinderId.value === binderId.value);
const isCustom = computed(() => binder.value?.mode === "custom");

const breadcrumbOverrides = computed(() => ({
  [`/binders/${binderId.value}`]: binder.value?.name ?? "Binder",
}));

const { pokemonSpriteUrl } = usePokemonIcons();
const iconUrl = computed(() => pokemonSpriteUrl(binder.value?.iconPokemon));

// Custom binder progress
const totalItems = computed(() => items.value.length);
const ownedItems = computed(
  () => items.value.filter((i) => i.quantity > 0).length,
);
const progressPct = computed(() => {
  if (!totalItems.value) return 0;
  return Math.round((ownedItems.value / totalItems.value) * 100);
});

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Missing", value: "missing" },
  { label: "Owned", value: "owned" },
];
const filter = ref("all");

const SORT_OPTIONS = [
  { label: "Added", value: "added", hasDirection: true },
  { label: "Name", value: "name", hasDirection: true },
  { label: "Number", value: "number", hasDirection: true },
  { label: "Rarity", value: "rarity", hasDirection: true },
  { label: "Set", value: "set", hasDirection: true },
  { label: "Released", value: "released", hasDirection: true },
  { label: "Quantity", value: "quantity", hasDirection: true },
];
const sortField = ref("added");
const isAscending = ref(true);
const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value),
);

function setSort(field) {
  if (sortField.value === field) {
    isAscending.value = !isAscending.value;
  } else {
    sortField.value = field;
    isAscending.value = true;
  }
}

function parseLeadingInt(s) {
  if (!s) return null;
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function sortKey(item) {
  const c = item.card ?? {};
  switch (sortField.value) {
    case "name":
      return (c.name ?? "").toLowerCase();
    case "number":
      return parseLeadingInt(c.numberDisplay) ?? Number.POSITIVE_INFINITY;
    case "rarity":
      return (c.rarity ?? "").toLowerCase();
    case "set":
      return (c.set ?? c.setName ?? "").toLowerCase();
    case "released":
      return c.releaseDate ?? "";
    case "quantity":
      return item.quantity ?? 0;
    case "added":
    default:
      return item.createdAt ?? "";
  }
}

function compare(a, b) {
  const ka = sortKey(a);
  const kb = sortKey(b);
  const aNull = ka === null || ka === undefined || ka === "";
  const bNull = kb === null || kb === undefined || kb === "";
  // Push missing values to the end regardless of direction.
  if (aNull && !bNull) return 1;
  if (!aNull && bNull) return -1;
  if (aNull && bNull) return 0;
  if (ka < kb) return isAscending.value ? -1 : 1;
  if (ka > kb) return isAscending.value ? 1 : -1;
  return 0;
}

const filteredItems = computed(() => {
  let list = items.value;
  if (isCustom.value) {
    if (filter.value === "missing") list = list.filter((i) => i.quantity === 0);
    else if (filter.value === "owned")
      list = list.filter((i) => i.quantity > 0);
  }
  return [...list].sort(compare);
});

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

async function toggleOwned(item) {
  try {
    await setOwned(item.cardId, item.variant, item.quantity === 0);
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
    title: isCustom.value
      ? `Remove ${name} from this binder?`
      : `Remove all copies of ${name}?`,
    description: isCustom.value
      ? "This card will be removed from the checklist."
      : "All copies of this card will be removed from this binder.",
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

const bulkAddOpen = ref(false);
const addCardOpen = ref(false);

function onBulkAdded(result) {
  const label = result.pokemon?.label ?? "Pokémon";
  const parts = [`Added ${result.inserted}`];
  if (result.skipped) parts.push(`${result.skipped} already in binder`);
  toast.add({
    color: "success",
    icon: "i-lucide-check-circle",
    title: `${label} added`,
    description: parts.join(" · "),
  });
}

function onCardAdded(card) {
  toast.add({
    color: "success",
    icon: "i-lucide-check-circle",
    title: isCustom.value ? "Added to checklist" : "Card added",
    description: `${card.name} → ${binder.value?.name}`,
  });
}

// Keep the binder list progress in sync when items change in a custom binder.
watch([ownedItems, totalItems], () => {
  if (isCustom.value) fetchBinders().catch(() => {});
});
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
            <UBadge
              v-if="isCustom"
              color="info"
              variant="soft"
              icon="i-lucide-list-checks"
              size="sm"
            >
              Custom
            </UBadge>
          </div>
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="Add card"
            color="neutral"
            variant="outline"
            @click="addCardOpen = true"
          />
          <UButton
            v-if="isCustom"
            icon="i-lucide-list-plus"
            label="Add Pokémon"
            color="neutral"
            variant="outline"
            @click="bulkAddOpen = true"
          />
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

      <div class="mb-4 flex justify-between">
        <p class="text-5xl font-bold">{{ binder?.name }}</p>
        <div class="flex flex-col gap-1 items-center">
          <p class="text-sm font-medium text-default">
            {{ ownedItems }} of {{ totalItems }} cards collected
            <span class="text-muted font-normal">({{ progressPct }}%)</span>
          </p>
          <UProgress :model-value="progressPct" :max="100" color="primary" />
        </div>
      </div>
      <div v-if="binder?.description" class="mb-4">
        <p class="text-sm text-muted">{{ binder.description }}</p>
      </div>

      <div v-if="items.length" class="mb-4 flex items-center gap-2 flex-wrap">
        <UTabs
          :items="SORT_OPTIONS"
          :model-value="sortField"
          variant="pill"
          size="xs"
          :content="false"
          @update:model-value="setSort"
        />
        <UButton
          v-if="activeSort?.hasDirection"
          :icon="isAscending ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
          color="neutral"
          variant="outline"
          size="xs"
          square
          :aria-label="isAscending ? 'Ascending' : 'Descending'"
          @click="setSort(sortField)"
        />
      </div>
      <div v-if="isCustom && totalItems" class="mb-4">
        <UTabs
          :items="FILTERS"
          v-model="filter"
          variant="link"
          :content="false"
        />
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
          {{ isCustom ? "This checklist is empty." : "This binder is empty." }}
        </p>
        <div v-if="isCustom" class="flex items-center gap-2">
          <UButton
            icon="i-lucide-list-plus"
            label="Add cards of a Pokémon"
            @click="bulkAddOpen = true"
          />
          <UButton
            to="/"
            icon="i-lucide-search"
            label="Search cards"
            color="neutral"
            variant="outline"
          />
        </div>
        <p v-else class="text-sm text-muted">
          <ULink to="/" class="text-primary">Search cards</ULink>
          to start filling it.
        </p>
      </div>

      <div
        v-else-if="!filteredItems.length"
        class="flex flex-col items-center justify-center py-16 gap-3 text-center"
      >
        <UIcon name="i-lucide-filter" class="size-10 text-muted" />
        <p class="text-sm text-muted">No cards match this filter.</p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <UCard
          v-for="item in filteredItems"
          :key="item.id"
          :ui="{
            root: isCustom && item.quantity === 0 ? 'opacity-60' : '',
            body: 'p-3 flex flex-col gap-2',
          }"
        >
          <div class="relative">
            <img
              v-if="item.card?.thumbImageUrl"
              :src="item.card.thumbImageUrl"
              :alt="item.card?.name"
              loading="lazy"
              class="w-full rounded-md block"
              :class="isCustom && item.quantity === 0 ? 'grayscale' : ''"
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
              v-if="!isCustom"
              color="primary"
              variant="solid"
              class="absolute top-2 right-2"
            >
              x{{ item.quantity }}
            </UBadge>
            <UBadge
              v-else-if="item.quantity > 0"
              color="success"
              variant="solid"
              icon="i-lucide-check"
              class="absolute top-2 right-2"
            >
              Owned
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="solid"
              icon="i-lucide-circle-dashed"
              class="absolute top-2 right-2"
            >
              Missing
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
            <span v-if="item.card?.numberDisplay" class="text-xs text-muted">
              #{{ item.card.numberDisplay }}
            </span>
          </div>

          <div v-if="isCustom" class="flex items-center gap-1.5">
            <UButton
              :label="item.quantity > 0 ? 'Mark as missing' : 'Got it'"
              :icon="
                item.quantity > 0 ? 'i-lucide-circle-dashed' : 'i-lucide-check'
              "
              :color="item.quantity > 0 ? 'neutral' : 'success'"
              :variant="item.quantity > 0 ? 'outline' : 'soft'"
              size="xs"
              block
              class="flex-1 min-w-0"
              :ui="{ label: 'truncate' }"
              @click="toggleOwned(item)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              size="xs"
              square
              aria-label="Remove from checklist"
              @click="removeAll(item)"
            />
          </div>

          <div v-else class="flex items-center gap-1.5">
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

      <BulkAddPokemonDialog
        v-if="isCustom"
        v-model:open="bulkAddOpen"
        :bulk-add="bulkAdd"
        @added="onBulkAdded"
      />

      <AddCardToBinderDialog
        v-model:open="addCardOpen"
        :binder="binder"
        :add-card="addCard"
        @added="onCardAdded"
      />
    </template>
  </UDashboardPanel>
</template>
