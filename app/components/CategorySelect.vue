<script setup>
const props = defineProps({
  modelValue: { type: String, default: "EN" },
  size: { type: String, default: "md" },
  withFlags: { type: Boolean, default: false },
  placeholder: { type: String, default: "Language" },
});

defineEmits(["update:modelValue"]);

const ITEMS_PLAIN = [
  { label: "English (EN)", value: "EN" },
  { label: "Japanese (JP)", value: "JP" },
];

const ITEMS_FLAGS = [
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

const items = computed(() => (props.withFlags ? ITEMS_FLAGS : ITEMS_PLAIN));
</script>

<template>
  <USelect
    :model-value="modelValue"
    :items="items"
    :icon="withFlags ? undefined : 'i-lucide-languages'"
    :size="size"
    :placeholder="placeholder"
    aria-label="Language"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
