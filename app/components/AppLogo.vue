<script setup>
defineProps({
  collapsed: { type: Boolean, default: false },
});
</script>

<template>
  <NuxtLink
    to="/"
    class="flex items-center gap-2 px-1 text-highlighted hover:text-primary transition-colors"
  >
    <UIcon name="i-lucide-layers" class="size-6 text-primary shrink-0" />
    <span v-if="!collapsed" class="font-semibold text-sm truncate">
      TCG Collection
    </span>
  </NuxtLink>
</template>
