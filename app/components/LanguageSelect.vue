<script setup>
const props = defineProps({
  modelValue: { type: String, default: "EN" },
  variant: { type: String, default: "select" },
  class: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const items = [
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

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>

<template>
  <USelect
    v-model="selected"
    :items="items"
    icon="i-lucide-languages"
    :class="props.class"
  />
</template>
