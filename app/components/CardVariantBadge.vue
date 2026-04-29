<script setup>
const props = defineProps({
  variant: { type: String, default: null },
  size: { type: String, default: "md" },
});

const VARIANTS = {
  holofoil: { color: "pink", label: "holofoil" },
  reverseHolofoil: { color: "cyan", label: "reverse Holofoil" },
};

const config = computed(() => VARIANTS[props.variant] ?? null);
</script>

<template>
  <UBadge
    v-if="config"
    :color="config.color"
    variant="solid"
    :size="size"
    class="capitalize"
  >
    {{ config.label }}
  </UBadge>
</template>
