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

function formatVariant(variant) {
  if (!variant || variant === "normal") return null;
  return variant.replace(/([A-Z])/g, " $1").trim();
}

function variantColor(variant) {
  switch (variant) {
    case "holofoil":
      return "pink";
    case "reverseHolofoil":
      return "cyan";
    default:
      return "neutral";
  }
}

function ownedButtonColor(variant) {
  switch (variant) {
    case "holofoil":
      return "pink";
    case "reverseHolofoil":
      return "cyan";
    default:
      return "neutral";
  }
}

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

const VIEW_MODES = [
  { label: "Grid", value: "grid", icon: "i-lucide-grid-2x2" },
  { label: "Binder", value: "binder", icon: "i-lucide-book-open" },
];
const viewMode = ref("grid");

const POCKET_SIZES = [
  { label: "4-Pocket", value: 4, cols: 2 },
  { label: "9-Pocket", value: 9, cols: 3 },
  { label: "12-Pocket", value: 12, cols: 4 },
  { label: "16-Pocket", value: 16, cols: 4 },
];
const pocketSize = ref(9);
const currentPage = ref(1);

const activePocket = computed(
  () =>
    POCKET_SIZES.find((p) => p.value === pocketSize.value) ?? POCKET_SIZES[1],
);

const pocketGridClass = computed(() => {
  switch (activePocket.value.cols) {
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-3";
    case 4:
      return "grid-cols-4";
    default:
      return "grid-cols-3";
  }
});

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

function releaseSortKey(card) {
  const direct = Number(
    card?.releaseDateSortKey ?? card?.release_date_sort_key,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;

  const parsed = Date.parse(card?.releaseDate ?? card?.release_date ?? "");
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return null;
}

function tieBreakKey(item) {
  const c = item.card ?? {};
  return [
    (c.name ?? "").toLowerCase(),
    parseLeadingInt(c.numberDisplay) ?? Number.POSITIVE_INFINITY,
    (c.id ?? item.cardId ?? "").toLowerCase(),
  ];
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
      return releaseSortKey(c);
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

  const ta = tieBreakKey(a);
  const tb = tieBreakKey(b);
  for (let i = 0; i < ta.length; i++) {
    if (ta[i] < tb[i]) return -1;
    if (ta[i] > tb[i]) return 1;
  }
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

const physicalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / pocketSize.value)),
);

// Real binders open with the inside cover on the left (empty) and page 1
// on the right. Subsequent spreads then pair (2,3), (4,5), and so on.
const totalPages = computed(() =>
  Math.max(1, Math.ceil((physicalPages.value + 1) / 2)),
);

function pageSlice(pageNum) {
  const empty = Array(pocketSize.value).fill(null);
  if (pageNum < 1 || pageNum > physicalPages.value) return empty;
  const start = (pageNum - 1) * pocketSize.value;
  const slice = filteredItems.value.slice(start, start + pocketSize.value);
  const padded = [...slice];
  while (padded.length < pocketSize.value) padded.push(null);
  return padded;
}

const leftPageNumber = computed(() =>
  currentPage.value === 1 ? 0 : currentPage.value * 2 - 2,
);
const rightPageNumber = computed(() =>
  currentPage.value === 1 ? 1 : currentPage.value * 2 - 1,
);

const hasLeftPage = computed(
  () =>
    leftPageNumber.value >= 1 && leftPageNumber.value <= physicalPages.value,
);
const hasRightPage = computed(
  () =>
    rightPageNumber.value >= 1 && rightPageNumber.value <= physicalPages.value,
);

const leftPageItems = computed(() => pageSlice(leftPageNumber.value));
const rightPageItems = computed(() => pageSlice(rightPageNumber.value));

watch([pocketSize, filter, sortField, isAscending], () => {
  currentPage.value = 1;
});

watch(totalPages, (tp) => {
  if (currentPage.value > tp) currentPage.value = tp;
});

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

const pendingToggles = ref(new Set());

function isToggling(item) {
  return pendingToggles.value.has(`${item.cardId}:${item.variant}`);
}

async function toggleOwned(item) {
  const key = `${item.cardId}:${item.variant}`;
  if (pendingToggles.value.has(key)) return;
  const next = new Set(pendingToggles.value);
  next.add(key);
  pendingToggles.value = next;
  try {
    await setOwned(item.cardId, item.variant, item.quantity === 0);
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  } finally {
    const after = new Set(pendingToggles.value);
    after.delete(key);
    pendingToggles.value = after;
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
  const label = result.source?.label ?? "Selection";
  const category = result.source?.category ? ` (${result.source.category})` : "";
  const parts = [`Added ${result.inserted}`];
  if (result.skipped) parts.push(`${result.skipped} already in binder`);
  toast.add({
    color: "success",
    icon: "i-lucide-check-circle",
    title: `${label}${category} added`,
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
          <div class="flex min-w-0 items-center gap-2">
            <img
              v-if="iconUrl"
              :src="iconUrl"
              :alt="binder?.iconPokemon"
              class="size-8 shrink-0 object-contain"
            />
            <div class="min-w-0">
              <AppBreadcrumb :overrides="breadcrumbOverrides" />
            </div>
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
            :ui="{ label: 'hidden sm:inline' }"
            @click="addCardOpen = true"
          />
          <UButton
            v-if="isCustom"
            icon="i-lucide-list-plus"
            label="Bulk add cards"
            color="neutral"
            variant="outline"
            :ui="{ label: 'hidden md:inline' }"
            @click="bulkAddOpen = true"
          />
          <ExportMissingMenu v-if="isCustom" :binder="binder" :items="items" />
          <UButton
            :label="isActive ? 'Active binder' : 'Set as active'"
            :icon="isActive ? 'i-lucide-bookmark-check' : 'i-lucide-bookmark'"
            :color="isActive ? 'primary' : 'neutral'"
            :variant="isActive ? 'soft' : 'outline'"
            :disabled="isActive"
            :ui="{ label: 'hidden lg:inline' }"
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

      <div
        class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold break-words">
          {{ binder?.name }}
        </h1>
        <div class="flex w-full sm:w-auto flex-col gap-1 sm:items-end">
          <p class="text-sm font-medium text-default">
            {{ ownedItems }} of {{ totalItems }} cards collected
            <span class="text-muted font-normal">({{ progressPct }}%)</span>
          </p>
          <UProgress
            :model-value="progressPct"
            :max="100"
            color="warning"
            class="w-full sm:w-56"
          />
        </div>
      </div>
      <p v-if="binder?.description" class="mb-4 text-sm text-muted">
        {{ binder.description }}
      </p>

      <div v-if="isCustom && totalItems" class="flex justify-between">
        <UTabs
          :items="FILTERS"
          v-model="filter"
          variant="link"
          :content="false"
          class="flex-1/2"
          size="xl"
        />
        <UTabs
          :items="VIEW_MODES"
          v-model="viewMode"
          variant="pill"
          size="md"
          :content="false"
        />
      </div>

      <div v-if="items.length" class="mb-4 flex w-full flex-col gap-2">
        <!-- <div class="flex w-full items-center gap-2">
          <div class="flex-1 overflow-x-auto">
            <UTabs
              :items="SORT_OPTIONS"
              :model-value="sortField"
              variant="pill"
              size="xs"
              :content="false"
              class="min-w-max"
              @update:model-value="setSort"
            />
          </div>
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
        </div> -->
        <div class="flex w-full items-center gap-2">
          <UTabs
            v-if="viewMode === 'binder' && filteredItems.length"
            :items="POCKET_SIZES"
            v-model="pocketSize"
            variant="pill"
            size="xl"
            :content="false"
          />
          <div class="ml-auto"></div>
        </div>
      </div>

      <div v-if="loading && !items.length" class="cards-grid">
        <USkeleton v-for="n in 10" :key="n" class="aspect-[5/7] rounded-lg" />
      </div>

      <div
        v-else-if="!items.length"
        class="flex flex-col items-center justify-center py-16 gap-3 text-center"
      >
        <UIcon name="i-lucide-folder-open" class="size-10 text-muted" />
        <p class="text-sm text-muted">
          {{ isCustom ? "This checklist is empty." : "This binder is empty." }}
        </p>
        <div
          v-if="isCustom"
          class="flex flex-col sm:flex-row items-center gap-2"
        >
          <UButton
            icon="i-lucide-list-plus"
            label="Bulk add cards"
            block
            class="sm:w-auto"
            @click="bulkAddOpen = true"
          />
          <UButton
            to="/"
            icon="i-lucide-search"
            label="Search cards"
            color="neutral"
            variant="outline"
            block
            class="sm:w-auto"
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

      <div v-else-if="viewMode === 'grid'" class="cards-grid">
        <UCard
          v-for="item in filteredItems"
          :key="item.id"
          :ui="{ body: 'p-2.5 sm:p-3 flex flex-col gap-2' }"
        >
          <CardImage
            :card="item.card"
            :variant="item.variant"
            :quantity="item.quantity"
            :is-custom="isCustom"
          />

          <div class="flex items-start justify-between gap-2 min-w-0">
            <CardMeta :card="item.card" :fallback-name="item.cardId" />
            <UBadge
              v-if="formatVariant(item.variant)"
              :color="variantColor(item.variant)"
              variant="solid"
              size="md"
              class="capitalize shrink-0"
            >
              {{ formatVariant(item.variant) }}
            </UBadge>
          </div>

          <div v-if="isCustom" class="flex items-center gap-1.5">
            <UButton
              :label="item.quantity > 0 ? 'Mark as missing' : 'Got it'"
              :icon="
                item.quantity > 0 ? 'i-lucide-circle-dashed' : 'i-lucide-check'
              "
              :color="item.quantity > 0 ? 'neutral' : 'success'"
              :variant="item.quantity > 0 ? 'outline' : 'soft'"
              size="md"
              block
              class="flex-1 min-w-0"
              :ui="{ label: 'truncate' }"
              @click="toggleOwned(item)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              size="md"
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

      <div
        v-else-if="viewMode === 'binder'"
        class="flex flex-col items-center gap-4"
      >
        <div
          class="w-full max-w-7xl rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top,_rgba(30,41,59,0.8),_rgba(2,6,23,0.95))] p-3 sm:p-6 shadow-xl"
        >
          <div
            class="grid gap-4 md:gap-6 md:grid-cols-[1fr_auto_1fr] items-start"
          >
            <div
              v-if="hasLeftPage"
              class="grid gap-2 sm:gap-3 md:gap-4"
              :class="pocketGridClass"
            >
              <template
                v-for="(item, idx) in leftPageItems"
                :key="item?.id ?? `left-empty-${idx}`"
              >
                <CardImage
                  v-if="item"
                  :card="item.card"
                  :variant="item.variant"
                  :quantity="item.quantity"
                  :is-custom="isCustom"
                  shadow
                >
                  <UBadge
                    v-if="formatVariant(item.variant)"
                    :color="variantColor(item.variant)"
                    variant="solid"
                    size="sm"
                    class="absolute bottom-1.5 left-1.5 capitalize shadow-md"
                  >
                    {{ formatVariant(item.variant) }}
                  </UBadge>
                  <UButton
                    v-if="isCustom"
                    :icon="
                      item.quantity > 0 ? 'i-lucide-check' : 'i-lucide-plus'
                    "
                    :color="
                      item.quantity > 0
                        ? ownedButtonColor(item.variant)
                        : 'neutral'
                    "
                    :variant="item.quantity > 0 ? 'solid' : 'soft'"
                    size="xs"
                    square
                    :loading="isToggling(item)"
                    :disabled="isToggling(item)"
                    class="absolute bottom-1.5 right-1.5 shadow-md"
                    :aria-label="
                      item.quantity > 0 ? 'Mark as missing' : 'Mark as obtained'
                    "
                    @click.stop.prevent="toggleOwned(item)"
                  />
                </CardImage>
                <div
                  v-else
                  class="aspect-[5/7] rounded-md border-2 border-dashed border-muted/30 bg-muted/5"
                ></div>
              </template>
            </div>
            <div v-else aria-hidden="true"></div>

            <div
              class="hidden md:block w-3 rounded-full bg-gradient-to-b from-white/20 via-white/10 to-white/20 shadow-[inset_0_0_12px_rgba(255,255,255,0.2)]"
            ></div>

            <div
              v-if="hasRightPage"
              class="grid gap-2 sm:gap-3 md:gap-4"
              :class="pocketGridClass"
            >
              <template
                v-for="(item, idx) in rightPageItems"
                :key="item?.id ?? `right-empty-${idx}`"
              >
                <CardImage
                  v-if="item"
                  :card="item.card"
                  :variant="item.variant"
                  :quantity="item.quantity"
                  :is-custom="isCustom"
                  shadow
                >
                  <UBadge
                    v-if="formatVariant(item.variant)"
                    :color="variantColor(item.variant)"
                    variant="solid"
                    size="sm"
                    class="absolute bottom-1.5 left-1.5 capitalize shadow-md"
                  >
                    {{ formatVariant(item.variant) }}
                  </UBadge>
                  <UButton
                    v-if="isCustom"
                    :icon="
                      item.quantity > 0 ? 'i-lucide-check' : 'i-lucide-plus'
                    "
                    :color="
                      item.quantity > 0
                        ? ownedButtonColor(item.variant)
                        : 'neutral'
                    "
                    :variant="item.quantity > 0 ? 'solid' : 'soft'"
                    size="sm"
                    square
                    :loading="isToggling(item)"
                    :disabled="isToggling(item)"
                    class="absolute bottom-1.5 right-1.5 shadow-md"
                    :aria-label="
                      item.quantity > 0 ? 'Mark as missing' : 'Mark as obtained'
                    "
                    @click.stop.prevent="toggleOwned(item)"
                  />
                </CardImage>
                <div
                  v-else
                  class="aspect-[5/7] rounded-md border-2 border-dashed border-muted/30 bg-muted/5"
                ></div>
              </template>
            </div>
            <div v-else aria-hidden="true"></div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <UButton
            icon="i-lucide-chevron-left"
            label="Prev"
            color="neutral"
            variant="outline"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          />
          <span class="text-sm text-muted">
            Spread {{ currentPage }} of {{ totalPages }}
          </span>
          <UButton
            trailing-icon="i-lucide-chevron-right"
            label="Next"
            color="neutral"
            variant="outline"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          />
        </div>
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
