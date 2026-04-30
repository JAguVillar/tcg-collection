<script setup>
defineProps({
  ui: { type: Object, default: () => ({}) },
  style: { type: Object, default: () => ({}) },
});
</script>

<template>
  <UCard :ui="ui" :style="style">
    <slot />
  </UCard>
</template>
