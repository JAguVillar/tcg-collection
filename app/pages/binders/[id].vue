<script setup>
import {
  buildMissingRows,
  toCsv,
  toPlainText,
  triggerDownload,
  slugifyBinderName,
} from "~/utils/exportMissing";

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
const isPokedex = computed(() => binder.value?.mode === "pokedex");
const isChecklistLike = computed(() => isCustom.value || isPokedex.value);

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

const filter = ref("all");

const filterCounts = computed(() => {
  let owned = 0;
  for (const i of items.value) if (i.quantity > 0) owned++;
  return {
    all: items.value.length,
    owned,
    missing: items.value.length - owned,
  };
});

const filterTabs = computed(() => [
  { label: `All ${filterCounts.value.all}`, value: "all" },
  { label: `Missing ${filterCounts.value.missing}`, value: "missing" },
  { label: `Owned ${filterCounts.value.owned}`, value: "owned" },
]);

const SORT_OPTIONS = [
  { label: "Added", value: "added", hasDirection: true },
  { label: "Name", value: "name", hasDirection: true },
  { label: "Number", value: "number", hasDirection: true },
  { label: "Rarity", value: "rarity", hasDirection: true },
  { label: "Set", value: "set", hasDirection: true },
  { label: "Released", value: "released", hasDirection: true },
  { label: "Quantity", value: "quantity", hasDirection: true },
  { label: "Artist", value: "artist", hasDirection: true },
  { label: "Price", value: "price", hasDirection: true },
  { label: "Language", value: "language", hasDirection: true },
];
const sortField = ref("added");
const isAscending = ref(true);
const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value),
);

const sortMenuItems = computed(() => [
  SORT_OPTIONS.map((o) => {
    const active = sortField.value === o.value;
    return {
      label: o.label,
      icon: active
        ? o.hasDirection
          ? isAscending.value
            ? "i-lucide-arrow-up"
            : "i-lucide-arrow-down"
          : "i-lucide-check"
        : undefined,
      onSelect: () => setSort(o.value),
    };
  }),
]);

const VIEW_MODES = [
  { label: "Grid", value: "grid", icon: "i-lucide-grid-2x2" },
  { label: "Binder", value: "binder", icon: "i-lucide-book-open" },
];
const viewMode = ref("grid");

const tableColumns = computed(() => {
  const cols = [
    { accessorKey: "thumb", header: "", meta: { class: { td: "w-14" } } },
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "number",
      header: "#",
      meta: { class: { td: "tabular-nums text-muted" } },
    },
    { accessorKey: "set", header: "Set" },
    { accessorKey: "rarity", header: "Rarity" },
    { accessorKey: "variant", header: "Variant" },
  ];
  if (isCustom.value) {
    cols.push({ accessorKey: "owned", header: "Status" });
  } else {
    cols.push({
      accessorKey: "quantity",
      header: "Qty",
      meta: { class: { td: "tabular-nums" } },
    });
  }
  cols.push({
    accessorKey: "price",
    header: "Price",
    meta: { class: { td: "tabular-nums text-right" } },
  });
  cols.push({
    accessorKey: "actions",
    header: "",
    meta: { class: { td: "w-px text-right" } },
  });
  return cols;
});

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

function parseFormattedPrice(str) {
  if (!str || str === "N/A") return null;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
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
    case "artist":
      return (c.artist ?? "").toLowerCase();
    case "price":
      return parseFormattedPrice(c.formattedPrice);
    case "language":
      return (c.category ?? "EN").toLowerCase();
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
  if (isChecklistLike.value) {
    if (filter.value === "missing") list = list.filter((i) => i.quantity === 0);
    else if (filter.value === "owned")
      list = list.filter((i) => i.quantity > 0);
  }
  if (isPokedex.value) {
    return [...list].sort((a, b) => {
      if (a.dexNumber !== b.dexNumber) return (a.dexNumber ?? 0) - (b.dexNumber ?? 0);
      const fa = a.formSlug ?? "";
      const fb = b.formSlug ?? "";
      return fa.localeCompare(fb);
    });
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

async function onSetActive() {
  try {
    await setActiveBinder(binderId.value);
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
    description: binder.value?.name,
  });
}

const bulkAddOpen = ref(false);
const addCardOpen = ref(false);
const pendingSlot = ref(null);
const pendingSlotQuery = ref("");

function openSlotPicker(item) {
  if (!item?.dexNumber) return;
  pendingSlot.value = {
    dexNumber: item.dexNumber,
    formSlug: item.formSlug ?? null,
  };
  // searchQuery comes from the curated template (e.g. "galarian darmanitan",
  // "pikachu vmax"). Fall back to the species name derived from displayName
  // for legacy slots that pre-date the search_query column.
  pendingSlotQuery.value =
    item.searchQuery ??
    item.displayName?.split(" (")[0]?.toLowerCase() ??
    "";
  addCardOpen.value = true;
}

watch(addCardOpen, (open) => {
  if (!open) {
    pendingSlot.value = null;
    pendingSlotQuery.value = "";
  }
});

async function clearSlot(item) {
  try {
    await removeCard(item.cardId, item.variant, {
      all: true,
      targetSlot: { dexNumber: item.dexNumber, formSlug: item.formSlug ?? null },
    });
  } catch (err) {
    toast.add({
      color: "error",
      title: "Failed",
      description: err?.data?.statusMessage ?? err?.message ?? "Error",
    });
  }
}

const missingRows = computed(() => buildMissingRows(items.value));
const missingCount = computed(() => missingRows.value.length);
const exportSlug = computed(() =>
  slugifyBinderName(
    binder.value?.name,
    binder.value?.id ? `binder-${binder.value.id}` : "binder",
  ),
);

function exportMissingCsv() {
  if (!missingRows.value.length) return;
  triggerDownload(
    `${exportSlug.value}-missing.csv`,
    toCsv(missingRows.value),
    "text/csv;charset=utf-8",
  );
  toast.add({
    color: "success",
    icon: "i-lucide-file-spreadsheet",
    title: "CSV downloaded",
    description: `${missingRows.value.length} missing card${
      missingRows.value.length === 1 ? "" : "s"
    }`,
  });
}

function exportMissingTxt() {
  if (!missingRows.value.length) return;
  triggerDownload(
    `${exportSlug.value}-missing.txt`,
    toPlainText(missingRows.value),
    "text/plain;charset=utf-8",
  );
  toast.add({
    color: "success",
    icon: "i-lucide-file-text",
    title: "TXT downloaded",
    description: `${missingRows.value.length} missing card${
      missingRows.value.length === 1 ? "" : "s"
    }`,
  });
}

async function exportMissingCopy() {
  if (!missingRows.value.length) return;
  try {
    if (!navigator?.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(toPlainText(missingRows.value));
    toast.add({
      color: "success",
      icon: "i-lucide-clipboard-check",
      title: "Copied to clipboard",
      description: `${missingRows.value.length} missing card${
        missingRows.value.length === 1 ? "" : "s"
      }`,
    });
  } catch (err) {
    toast.add({
      color: "error",
      icon: "i-lucide-clipboard-x",
      title: "Copy failed",
      description: err?.message ?? "Unable to access clipboard",
    });
  }
}

const moreActions = computed(() => {
  const groups = [];
  const main = [];
  if (isCustom.value && missingCount.value) {
    main.push({
      label: `Export missing (${missingCount.value})`,
      icon: "i-lucide-download",
      children: [
        {
          label: "Download CSV",
          icon: "i-lucide-file-spreadsheet",
          onSelect: exportMissingCsv,
        },
        {
          label: "Download TXT",
          icon: "i-lucide-file-text",
          onSelect: exportMissingTxt,
        },
        {
          label: "Copy to clipboard",
          icon: "i-lucide-clipboard-copy",
          onSelect: exportMissingCopy,
        },
      ],
    });
  }
  if (main.length) groups.push(main);
  return groups;
});

function onBulkAdded(result) {
  const label = result.source?.label ?? "Selection";
  const category = result.source?.category
    ? ` (${result.source.category})`
    : "";
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

// Keep the binder list progress in sync when items change.
watch([ownedItems, totalItems], () => {
  if (isChecklistLike.value) fetchBinders().catch(() => {});
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
            <UBadge
              v-if="isActive"
              color="primary"
              variant="soft"
              icon="i-lucide-bookmark-check"
              size="sm"
            >
              Active
            </UBadge>
          </div>
        </template>

        <template #right>
          <UButton
            v-if="!isActive"
            icon="i-lucide-bookmark"
            label="Set as active"
            color="neutral"
            variant="ghost"
            :ui="{ label: 'hidden lg:inline' }"
            @click="onSetActive"
          />
          <UButton
            v-if="isCustom"
            icon="i-lucide-list-plus"
            label="Bulk add"
            color="neutral"
            variant="outline"
            :ui="{ label: 'hidden md:inline' }"
            @click="bulkAddOpen = true"
          />
          <UButton
            v-if="!isPokedex"
            icon="i-lucide-plus"
            label="Add card"
            :ui="{ label: 'hidden sm:inline' }"
            @click="addCardOpen = true"
          />
          <UDropdownMenu
            v-if="moreActions.length"
            :items="moreActions"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              square
              aria-label="More actions"
            />
          </UDropdownMenu>
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

      <div v-if="isChecklistLike && totalItems" class="flex justify-between">
        <UTabs
          :items="filterTabs"
          v-model="filter"
          variant="link"
          :content="false"
          class="flex-1/2"
          size="lg"
        />
        <UTabs
          v-if="!isPokedex"
          :items="VIEW_MODES"
          v-model="viewMode"
          variant="pill"
          size="md"
          :content="false"
        />
      </div>

      <div
        v-if="items.length && !isPokedex"
        class="mb-4 flex w-full flex-wrap items-center gap-2"
      >
        <UTabs
          v-if="viewMode === 'binder' && filteredItems.length"
          :items="POCKET_SIZES"
          v-model="pocketSize"
          variant="pill"
          size="sm"
          :content="false"
        />
        <div class="ml-auto flex items-center gap-1.5">
          <UDropdownMenu :items="sortMenuItems" :content="{ align: 'end' }">
            <UButton
              :label="`Sort: ${activeSort?.label}`"
              color="neutral"
              variant="outline"
              size="sm"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
          <UButton
            v-if="activeSort?.hasDirection"
            :icon="
              isAscending
                ? 'i-lucide-arrow-up-narrow-wide'
                : 'i-lucide-arrow-down-wide-narrow'
            "
            color="neutral"
            variant="outline"
            size="sm"
            square
            :aria-label="isAscending ? 'Ascending' : 'Descending'"
            @click="setSort(sortField)"
          />
        </div>
      </div>

      <div v-if="loading && !items.length" class="cards-grid">
        <USkeleton v-for="n in 10" :key="n" class="aspect-[5/7] rounded-lg" />
      </div>

      <EmptyState
        v-else-if="!items.length && isCustom"
        icon="i-lucide-folder-open"
        title="This checklist is empty"
        description="Add cards in bulk by search or artist, or pick them one by one."
        :actions="[
          {
            label: 'Bulk add cards',
            icon: 'i-lucide-list-plus',
            onClick: () => (bulkAddOpen = true),
          },
          {
            label: 'Search cards',
            icon: 'i-lucide-search',
            color: 'neutral',
            variant: 'outline',
            to: '/',
          },
        ]"
      />

      <EmptyState
        v-else-if="!items.length"
        icon="i-lucide-folder-open"
        title="This binder is empty"
        description="Find cards on the search page and add them here."
        :actions="[
          {
            label: 'Search cards',
            icon: 'i-lucide-search',
            to: '/',
          },
        ]"
      />

      <EmptyState
        v-else-if="!filteredItems.length"
        icon="i-lucide-filter"
        title="No cards match this filter"
        :actions="[
          {
            label: 'Show all',
            color: 'neutral',
            variant: 'outline',
            onClick: () => (filter = 'all'),
          },
        ]"
      />

      <PokedexVirtualGrid
        v-else-if="isPokedex"
        :items="filteredItems"
        @pick-slot="openSlotPicker"
        @clear-slot="clearSlot"
      />

      <div v-else-if="viewMode === 'grid'" class="cards-grid">
        <article
          v-for="item in filteredItems"
          :key="item.id"
          class="flex flex-col gap-2 min-w-0"
        >
          <CardImage
            :card="item.card"
            :variant="item.variant"
            :quantity="item.quantity"
            :is-custom="isCustom"
          />

          <div class="flex items-start justify-between gap-2 min-w-0 px-0.5">
            <CardMeta :card="item.card" :fallback-name="item.cardId" />
            <UBadge
              v-if="formatVariant(item.variant)"
              :color="variantColor(item.variant)"
              variant="soft"
              size="sm"
              class="capitalize shrink-0"
            >
              {{ formatVariant(item.variant) }}
            </UBadge>
          </div>

          <div v-if="isCustom" class="flex items-center gap-1 px-0.5">
            <UButton
              :label="item.quantity > 0 ? 'Mark missing' : 'Mark owned'"
              :icon="
                item.quantity > 0 ? 'i-lucide-circle-dashed' : 'i-lucide-check'
              "
              :color="item.quantity > 0 ? 'neutral' : 'success'"
              :variant="item.quantity > 0 ? 'outline' : 'soft'"
              size="sm"
              block
              class="flex-1 min-w-0"
              :ui="{ label: 'truncate' }"
              @click="toggleOwned(item)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              size="sm"
              square
              aria-label="Remove from checklist"
              @click="removeAll(item)"
            />
          </div>

          <div v-else class="flex items-center gap-1 px-0.5">
            <UButtonGroup size="sm" class="flex-1">
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
              size="sm"
              square
              aria-label="Remove all"
              @click="removeAll(item)"
            />
          </div>
        </article>
      </div>

      <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
        <UTable
          :data="filteredItems"
          :columns="tableColumns"
          class="rounded-lg border border-default min-w-[640px]"
          :ui="{
            td: 'py-2',
            th: 'py-2 text-xs font-medium text-muted uppercase tracking-wide',
          }"
        >
          <template #thumb-cell="{ row }">
            <div class="w-10 aspect-[5/7]">
              <CardImage
                :card="row.original.card"
                :variant="row.original.variant"
                :quantity="row.original.quantity"
                :is-custom="isCustom"
                :show-status-badge="false"
              />
            </div>
          </template>

          <template #name-cell="{ row }">
            <div class="flex items-center gap-2 min-w-0">
              <img
                v-if="row.original.card?.setIconUrl"
                :src="row.original.card.setIconUrl"
                :alt="row.original.card.set"
                class="size-5 shrink-0 object-contain bg-white rounded"
              />
              <span class="font-medium text-default truncate">
                {{ row.original.card?.name ?? row.original.cardId }}
              </span>
            </div>
          </template>

          <template #number-cell="{ row }">
            <span v-if="row.original.card?.numberDisplay">
              #{{ row.original.card.numberDisplay }}
            </span>
            <span v-else class="text-dimmed">—</span>
          </template>

          <template #set-cell="{ row }">
            <span class="text-sm text-muted truncate">
              {{ row.original.card?.set ?? row.original.card?.setName ?? "—" }}
            </span>
          </template>

          <template #rarity-cell="{ row }">
            <span class="text-sm text-muted">
              {{ row.original.card?.rarity ?? "—" }}
            </span>
          </template>

          <template #variant-cell="{ row }">
            <UBadge
              v-if="formatVariant(row.original.variant)"
              :color="variantColor(row.original.variant)"
              variant="soft"
              size="sm"
              class="capitalize"
            >
              {{ formatVariant(row.original.variant) }}
            </UBadge>
            <span v-else class="text-dimmed text-sm">Normal</span>
          </template>

          <template #owned-cell="{ row }">
            <UBadge
              v-if="row.original.quantity > 0"
              color="success"
              variant="soft"
              size="sm"
              icon="i-lucide-check"
            >
              Owned
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-circle-dashed"
            >
              Missing
            </UBadge>
          </template>

          <template #quantity-cell="{ row }">
            <span class="text-sm">{{ row.original.quantity }}</span>
          </template>

          <template #price-cell="{ row }">
            <span
              class="text-sm font-medium"
              :class="
                row.original.card?.formattedPrice === 'N/A'
                  ? 'text-dimmed font-normal'
                  : 'text-success'
              "
            >
              {{ row.original.card?.formattedPrice ?? "—" }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end gap-1">
              <template v-if="isCustom">
                <UButton
                  :icon="
                    row.original.quantity > 0
                      ? 'i-lucide-circle-dashed'
                      : 'i-lucide-check'
                  "
                  :color="row.original.quantity > 0 ? 'neutral' : 'success'"
                  variant="ghost"
                  size="xs"
                  square
                  :loading="isToggling(row.original)"
                  :aria-label="
                    row.original.quantity > 0 ? 'Mark missing' : 'Mark owned'
                  "
                  @click="toggleOwned(row.original)"
                />
              </template>
              <template v-else>
                <UButton
                  icon="i-lucide-plus"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :disabled="!row.original.card"
                  aria-label="Add one"
                  @click="bumpUp(row.original)"
                />
                <UButton
                  icon="i-lucide-minus"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Remove one"
                  @click="bumpDown(row.original)"
                />
              </template>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                square
                aria-label="Remove all"
                @click="removeAll(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>

      <div
        v-else-if="viewMode === 'binder'"
        class="flex flex-col items-center gap-4"
      >
        <div
          class="w-full max-w-7xl rounded-xl border border-default bg-elevated/30 p-3 sm:p-6"
        >
          <div
            class="grid gap-4 md:gap-6 md:grid-cols-2 md:divide-x md:divide-default items-start"
          >
            <div
              v-if="hasLeftPage"
              class="grid gap-2 sm:gap-3 md:gap-4 md:pr-4 lg:pr-6"
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
                >
                  <UBadge
                    v-if="formatVariant(item.variant)"
                    :color="variantColor(item.variant)"
                    variant="solid"
                    size="sm"
                    class="absolute bottom-1.5 left-1.5 capitalize"
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
                    class="absolute bottom-1.5 right-1.5"
                    :aria-label="
                      item.quantity > 0 ? 'Mark as missing' : 'Mark as obtained'
                    "
                    @click.stop.prevent="toggleOwned(item)"
                  />
                </CardImage>
                <div v-else class="aspect-[5/7] rounded-md bg-muted/10"></div>
              </template>
            </div>
            <div v-else aria-hidden="true"></div>

            <div
              v-if="hasRightPage"
              class="grid gap-2 sm:gap-3 md:gap-4 md:pl-4 lg:pl-6"
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
                >
                  <UBadge
                    v-if="formatVariant(item.variant)"
                    :color="variantColor(item.variant)"
                    variant="solid"
                    size="sm"
                    class="absolute bottom-1.5 left-1.5 capitalize"
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
                    class="absolute bottom-1.5 right-1.5"
                    :aria-label="
                      item.quantity > 0 ? 'Mark as missing' : 'Mark as obtained'
                    "
                    @click.stop.prevent="toggleOwned(item)"
                  />
                </CardImage>
                <div v-else class="aspect-[5/7] rounded-md bg-muted/10"></div>
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
        :initial-query="pendingSlotQuery"
        :target-slot="pendingSlot"
        @added="onCardAdded"
      />
    </template>
  </UDashboardPanel>
</template>

