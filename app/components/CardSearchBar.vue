<script setup>
import { SORT_OPTIONS } from "~/composables/useCardSearch";

const props = defineProps({
  search: { type: Object, required: true },
  showSubmit: { type: Boolean, default: true },
  showSort: { type: Boolean, default: true },
  showBadges: { type: Boolean, default: true },
  showVariants: { type: Boolean, default: true },
  showSetFilter: { type: Boolean, default: true },
  showArtistFilter: { type: Boolean, default: true },
  placeholder: { type: String, default: "Search Pokémon, set, artist…" },
  size: { type: String, default: "lg" },
});

const emit = defineEmits(["submit"]);

const {
  searchQuery,
  loading,
  separateVariants,
  selectedArtist,
  selectedSet,
  selectedCategory,
  sortField,
  isAscending,
  searchMode,
  setSort,
} = props.search;

const { options: artistOptions } = useArtists();
const { options: setOptions } = useSets();

const advancedSearchOpen = ref(searchMode.value === "advanced");

watch(
  searchMode,
  (value) => {
    const shouldOpen = value === "advanced";
    if (advancedSearchOpen.value !== shouldOpen) {
      advancedSearchOpen.value = shouldOpen;
    }
  },
  { immediate: true },
);

watch(advancedSearchOpen, (open) => {
  const nextMode = open ? "advanced" : "common";
  if (searchMode.value !== nextMode) {
    searchMode.value = nextMode;
  }
});

const languageItems = [
  {
    label: "English (EN)",
    value: "EN",
    avatar: {
      src: "https://hatscripts.github.io/circle-flags/flags/us.svg",
      alt: "English",
      loading: "lazy",
    },
  },
  {
    label: "Japanese (JP)",
    value: "JP",
    avatar: {
      src: "https://hatscripts.github.io/circle-flags/flags/jp.svg",
      alt: "Japanese",
      loading: "lazy",
    },
  },
];

const selectedArtistOption = computed({
  get() {
    if (!selectedArtist.value) return null;
    return (
      artistOptions.value.find((o) => o.value === selectedArtist.value) ?? null
    );
  },
  set(option) {
    selectedArtist.value = option?.value ?? null;
  },
});

const selectedSetOption = computed({
  get() {
    if (!selectedSet.value) return null;
    return setOptions.value.find((o) => o.value === selectedSet.value) ?? null;
  },
  set(option) {
    selectedSet.value = option?.value ?? null;
  },
});

const activeSort = computed(() =>
  SORT_OPTIONS.find((o) => o.value === sortField.value),
);

const activeFilterCount = computed(
  () =>
    (props.showArtistFilter && selectedArtist.value ? 1 : 0) +
    (props.showSetFilter && selectedSet.value ? 1 : 0) +
    (props.showVariants && separateVariants.value ? 1 : 0) +
    (selectedCategory.value !== "EN" ? 1 : 0),
);

const selectedLanguage = computed(() =>
  languageItems.find((l) => l.value === selectedCategory.value),
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

function onSubmit() {
  emit("submit");
}
</script>

<template>
  <div class="flex flex-col w-full gap-3">
    <form
      class="flex w- items-center gap-2"
      @submit.prevent="onSubmit"
    >
      <UButton
        :variant="advancedSearchOpen ? 'solid' : 'outline'"
        icon="i-lucide-sliders-horizontal"
        :size="size"
        :aria-label="advancedSearchOpen ? 'Switch to common search' : 'Switch to advanced search'"
        :aria-pressed="advancedSearchOpen"
        @click="advancedSearchOpen = !advancedSearchOpen"
      />

      <slot name="input" :loading="loading">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="placeholder"
          class="flex-1"
          :size="size"
          :loading="loading"
        />
      </slot>

      <UButton
        v-if="showSubmit"
        type="submit"
        icon="i-lucide-search"
        label="Search"
        :loading="loading"
        :size="size"
        :ui="{ label: 'hidden sm:inline' }"
      />

      <template v-if="advancedSearchOpen">
        <UPopover :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-funnel"
            color="neutral"
            variant="outline"
            :size="size"
            square
            :aria-label="`Filters${activeFilterCount ? ` (${activeFilterCount} active)` : ''}`"
          />
          <template #content>
            <div class="p-4 w-80 flex flex-col gap-4">
              <UFormField label="Language">
                <USelect
                  v-model="selectedCategory"
                  :items="languageItems"
                  icon="i-lucide-languages"
                  class="w-full"
                />
              </UFormField>
              <UFormField v-if="showSetFilter" label="Set">
                <UInputMenu
                  v-model="selectedSetOption"
                  :items="setOptions"
                  :virtualize="true"
                  placeholder="Any set"
                  icon="i-lucide-layers"
                  clear
                  class="w-full"
                />
              </UFormField>
              <UFormField v-if="showArtistFilter" label="Artist">
                <UInputMenu
                  v-model="selectedArtistOption"
                  :items="artistOptions"
                  :virtualize="true"
                  placeholder="Any artist"
                  icon="i-lucide-palette"
                  clear
                  class="w-full"
                />
              </UFormField>
            </div>
          </template>
        </UPopover>

        <UTooltip
          v-if="showVariants"
          :text="
            separateVariants
              ? 'Variants shown as separate cards'
              : 'Show variants as separate cards (holo, reverse, etc.)'
          "
        >
          <UButton
            icon="i-lucide-sparkles"
            :color="separateVariants ? 'purple' : 'neutral'"
            :variant="separateVariants ? 'solid' : 'outline'"
            :size="size"
            square
            :aria-label="
              separateVariants
                ? 'Hide variants (combine into one card)'
                : 'Show variants as separate cards'
            "
            :aria-pressed="separateVariants"
            @click="separateVariants = !separateVariants"
          />
        </UTooltip>

        <template v-if="showSort">
          <UDropdownMenu
            :items="sortMenuItems"
            :content="{ align: 'end' }"
          >
            <UButton
              :label="activeSort?.label"
              color="neutral"
              variant="outline"
              :size="size"
              icon="i-lucide-arrow-up-down"
              trailing-icon="i-lucide-chevron-down"
              :ui="{ label: 'hidden md:inline' }"
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
            :size="size"
            square
            :aria-label="isAscending ? 'Ascending' : 'Descending'"
            @click="setSort(sortField)"
          />
        </template>
      </template>
    </form>

    <div
      v-if="showBadges && activeFilterCount"
      class="flex flex-wrap items-center gap-1.5"
    >
      <span class="text-xs text-muted">Filters:</span>
      <UBadge
        v-if="selectedCategory !== 'EN'"
        color="neutral"
        variant="soft"
        :ui="{ base: 'pr-0.5 gap-1' }"
      >
        {{ selectedLanguage?.label }}
        <UButton
          icon="i-lucide-x"
          size="xs"
          square
          variant="ghost"
          color="neutral"
          aria-label="Clear language"
          @click="selectedCategory = 'EN'"
        />
      </UBadge>
      <UBadge
        v-if="showSetFilter && selectedSet"
        color="neutral"
        variant="soft"
        :ui="{ base: 'pr-0.5 gap-1' }"
      >
        {{ selectedSetOption?.label ?? selectedSet }}
        <UButton
          icon="i-lucide-x"
          size="xs"
          square
          variant="ghost"
          color="neutral"
          aria-label="Clear set"
          @click="selectedSet = null"
        />
      </UBadge>
      <UBadge
        v-if="showArtistFilter && selectedArtist"
        color="neutral"
        variant="soft"
        :ui="{ base: 'pr-0.5 gap-1' }"
      >
        {{ selectedArtistOption?.label ?? selectedArtist }}
        <UButton
          icon="i-lucide-x"
          size="xs"
          square
          variant="ghost"
          color="neutral"
          aria-label="Clear artist"
          @click="selectedArtist = null"
        />
      </UBadge>
      <UBadge
        v-if="showVariants && separateVariants"
        color="purple"
        variant="soft"
        :ui="{ base: 'pr-0.5 gap-1' }"
      >
        Variants split
        <UButton
          icon="i-lucide-x"
          size="xs"
          square
          variant="ghost"
          color="neutral"
          aria-label="Disable variant split"
          @click="separateVariants = false"
        />
      </UBadge>
    </div>
  </div>
</template>
