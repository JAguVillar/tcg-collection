<script setup>
import { SEARCH_MODES, useSearchMode } from "~/composables/useCardSearch";

const props = defineProps({
  size: { type: String, default: "lg" },
});

const mode = useSearchMode();

const items = [
  {
    label: "Advanced",
    value: SEARCH_MODES.ADVANCED,
    icon: "i-lucide-sliders-horizontal",
  },
  {
    label: "Common",
    value: SEARCH_MODES.COMMON,
    icon: "i-lucide-search",
  },
];

const tooltip = computed(() =>
  mode.value === SEARCH_MODES.COMMON
    ? "Common search: broader results, query-only (filters ignored)."
    : "Advanced search: full filters, sorting and pagination.",
);

function setMode(value) {
  if (mode.value !== value) mode.value = value;
}
</script>

<template>
  <UTooltip :text="tooltip">
    <div class="inline-flex rounded-md border border-default p-0.5 gap-0.5">
      <UButton
        v-for="item in items"
        :key="item.value"
        :icon="item.icon"
        :label="item.label"
        :color="mode === item.value ? 'primary' : 'neutral'"
        :variant="mode === item.value ? 'solid' : 'ghost'"
        :size="props.size"
        :ui="{ label: 'hidden md:inline' }"
        :aria-pressed="mode === item.value"
        @click="setMode(item.value)"
      />
    </div>
  </UTooltip>
</template>
