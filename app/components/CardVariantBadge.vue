<script setup>
const props = defineProps({
  variant: { type: String, default: "normal" },
});

const normalizedVariant = computed(() => props.variant ?? "normal");

const color = computed(() => {
  switch (normalizedVariant.value) {
    case "holofoil":
      return "pink";
    case "reverseHolofoil":
      return "cyan";
    default:
      return "neutral";
  }
});

const label = computed(() =>
  normalizedVariant.value.replace(/([A-Z])/g, " $1").trim(),
);
</script>

<template>
  <UBadge :color="color" variant="solid" size="md" class="capitalize">
    {{ label }}
  </UBadge>
</template>
