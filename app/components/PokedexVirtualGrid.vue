<script setup>
const props = defineProps({
  items: { type: Array, required: true },
});

const emit = defineEmits(["pickSlot", "clearSlot"]);
</script>

<template>
  <div
    class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3"
  >
    <article
      v-for="item in props.items"
      :key="item.id"
      :data-dex-anchor="item.dexNumber"
      class="pokedex-slot flex flex-col gap-1 min-w-0 scroll-mt-24"
    >
      <PokedexSlotPlaceholder
        v-if="!item.cardId"
        :item="item"
        @pick="emit('pickSlot', $event)"
      />
      <div v-else class="relative group">
        <CardImage :card="item.card" :variant="item.variant" :quantity="item.quantity" />
        <UButton
          icon="i-lucide-x"
          color="error"
          variant="solid"
          size="xs"
          square
          class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
          aria-label="Clear slot"
          @click.stop.prevent="emit('clearSlot', item)"
        />
        <p class="mt-1 text-[10px] sm:text-xs text-muted truncate text-center">
          #{{ String(item.dexNumber).padStart(4, "0") }} {{ item.displayName }}
        </p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.pokedex-slot {
  content-visibility: auto;
  contain-intrinsic-size: 220px;
}
</style>
