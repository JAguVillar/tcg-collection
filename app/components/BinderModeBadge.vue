<script setup>
defineProps({
  mode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  size: { type: String, default: "md" },
});
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <UBadge
      v-if="isDefault"
      trailing-icon="i-lucide-star"
      variant="soft"
      :size="size"
      color="primary"
      aria-label="Default binder"
    >
      Default
    </UBadge>
    <UBadge
      v-if="mode === 'custom'"
      trailing-icon="i-lucide-list-checks"
      variant="soft"
      :size="size"
      color="pink"
      aria-label="Custom checklist"
    >
      Custom
    </UBadge>
  </span>
</template>
