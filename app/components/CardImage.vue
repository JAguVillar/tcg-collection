<script setup>
const props = defineProps({
  card: { type: Object, default: null },
  variant: { type: String, default: null },
  quantity: { type: Number, default: null },
  isCustom: { type: Boolean, default: false },
  showStatusBadge: { type: Boolean, default: true },
});

const isMissing = computed(() => props.isCustom && (props.quantity ?? 0) === 0);
</script>

<template>
  <div
    class="relative aspect-[5/7] w-full"
    :class="isMissing ? 'group opacity-60 hover:opacity-100 transition' : ''"
  >
    <img
      v-if="card?.thumbImageUrl"
      :src="card.thumbImageUrl"
      :alt="card.name"
      loading="lazy"
      class="w-full h-full object-cover rounded-md block transition"
      :class="isMissing ? 'grayscale group-hover:grayscale-0' : ''"
    />
    <div
      v-else
      class="w-full h-full rounded-md bg-elevated/40 flex items-center justify-center"
    >
      <UIcon name="i-lucide-image-off" class="size-6 text-muted" />
    </div>

    <template v-if="showStatusBadge">
      <UBadge
        v-if="!isCustom && quantity != null"
        color="primary"
        variant="solid"
        size="sm"
        class="absolute top-1.5 right-1.5"
      >
        x{{ quantity }}
      </UBadge>
      <UBadge
        v-else-if="isCustom && (quantity ?? 0) > 0"
        color="success"
        variant="solid"
        size="sm"
        icon="i-lucide-check"
        class="absolute top-1.5 right-1.5"
      />
      <UBadge
        v-else-if="isCustom"
        color="neutral"
        variant="solid"
        size="sm"
        icon="i-lucide-circle-dashed"
        class="absolute top-1.5 right-1.5"
      />
    </template>

    <slot />
  </div>
</template>
