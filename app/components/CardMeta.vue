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
        class="size-6 shrink-0 object-contain bg-white rounded-md"
      />
      <span class="text-md font-semibold text-default truncate">
        {{ card?.name ?? fallbackName }}
      </span>
    </div>
    <span v-if="card?.numberDisplay" class="text-md text-muted">
      #{{ card.numberDisplay }}
    </span>
  </div>
</template>
