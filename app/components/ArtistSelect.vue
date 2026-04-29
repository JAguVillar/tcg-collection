<script setup>
const props = defineProps({
  modelValue: { type: [String, Object], default: null },
  size: { type: String, default: "md" },
  placeholder: { type: String, default: "Filter by artist" },
  asObject: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const { options } = useArtists();

const selected = computed({
  get() {
    if (props.asObject) return props.modelValue;
    if (!props.modelValue) return null;
    return options.find((o) => o.value === props.modelValue) ?? null;
  },
  set(option) {
    if (props.asObject) emit("update:modelValue", option);
    else emit("update:modelValue", option?.value ?? null);
  },
});
</script>

<template>
  <UInputMenu
    v-model="selected"
    :items="options"
    :virtualize="true"
    :placeholder="placeholder"
    :size="size"
    icon="i-lucide-palette"
    aria-label="Artist"
    clear
  />
</template>
