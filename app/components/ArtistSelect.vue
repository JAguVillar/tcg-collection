<script setup>
const modelValue = defineModel({ default: null });

defineProps({
  placeholder: { type: String, default: "Filter by artist" },
  ariaLabel: { type: String, default: "Filter by artist" },
  clear: { type: Boolean, default: true },
  class: { type: String, default: "" },
});

const { options } = useArtists();
</script>

<template>
  <UInputMenu
    v-model="modelValue"
    :items="options"
    :virtualize="true"
    :placeholder="placeholder"
    icon="i-lucide-palette"
    :clear="clear"
    :aria-label="ariaLabel"
    :class="$props.class"
  />
</template>
