<script setup>
const { mode } = useSearchMode();

defineProps({
  showBadge: { type: Boolean, default: true },
  label: { type: String, default: "Use common search" },
});

const isCommon = computed(() => mode.value === "common");
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <USwitch
      :model-value="isCommon"
      :label="label"
      unchecked-icon="i-lucide-sliders-horizontal"
      checked-icon="i-lucide-scan-search"
      @update:model-value="(value) => (mode = value ? 'common' : 'advanced')"
    />
    <UBadge v-if="showBadge" color="neutral" variant="subtle">
      {{ isCommon ? "Common search" : "Advanced search" }}
    </UBadge>
  </div>
</template>
