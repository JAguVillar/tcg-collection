<script setup>
const props = defineProps({
  mode: { type: String, default: "collection" },
});

const isCustom = computed(() => props.mode === "custom");
</script>

<template>
  <UBadge
    :trailing-icon="isCustom ? 'i-lucide-list-checks' : 'i-lucide-folder'"
    variant="soft"
    :aria-label="isCustom ? 'Custom checklist' : 'Collection binder'"
    :color="isCustom ? 'pink' : 'primary'"
  >
    {{ isCustom ? "Custom" : "Collection" }}
  </UBadge>
</template>
