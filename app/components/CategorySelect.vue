<script setup>
const modelValue = defineModel({ type: String, default: "EN" });

defineProps({
  placeholder: { type: String, default: "Select language" },
  ariaLabel: { type: String, default: "Select language" },
  class: { type: String, default: "" },
});

const items = [
  { label: "English (EN)", value: "EN" },
  { label: "Japanese (JP)", value: "JP" },
];
</script>

<template>
  <USelect
    v-model="modelValue"
    :items="items"
    icon="i-lucide-languages"
    :placeholder="placeholder"
    :aria-label="ariaLabel"
    :class="$props.class"
  />
</template>
