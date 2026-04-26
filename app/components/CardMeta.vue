<script setup>
defineProps({
  card: { type: Object, default: null },
  fallbackName: { type: String, default: "" },
});
</script>

<template>
  <div class="flex flex-col min-w-0">
    <div class="flex items-center gap-1.5 min-w-0">
      <img
        v-if="card?.setIconUrl"
        :src="card.setIconUrl"
        :alt="card.set"
        class="size-4 shrink-0 object-contain opacity-70"
      />
      <span class="text-sm font-semibold text-default truncate">
        {{ card?.name ?? fallbackName }}
      </span>
    </div>
    <span v-if="card?.numberDisplay" class="text-xs text-muted">
      #{{ card.numberDisplay }}
    </span>
  </div>
</template>
