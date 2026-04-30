<script setup>
defineProps({
  icon: { type: String, default: "i-lucide-inbox" },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  actions: { type: Array, default: () => [] },
});
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 gap-3 text-center">
    <div
      class="size-12 rounded-full bg-elevated flex items-center justify-center"
    >
      <UIcon :name="icon" class="size-6 text-muted" />
    </div>
    <div class="max-w-sm">
      <p v-if="title" class="text-sm font-medium text-default">{{ title }}</p>
      <p v-if="description" class="text-sm text-muted mt-1">
        {{ description }}
      </p>
    </div>
    <div v-if="actions.length" class="flex flex-col sm:flex-row items-center gap-2">
      <UButton v-for="(a, i) in actions" :key="i" v-bind="a" />
    </div>
  </div>
</template>
