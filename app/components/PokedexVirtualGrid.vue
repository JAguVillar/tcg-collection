<script setup>
import { RecycleScroller } from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";

const props = defineProps({
  items: { type: Array, required: true },
  // Minimum slot width (px). Used to derive grid-items from container width.
  minSlotWidth: { type: Number, default: 110 },
  // Slot height (px) — must match the rendered slot to avoid jumps.
  slotHeight: { type: Number, default: 220 },
  gap: { type: Number, default: 12 },
});

const emit = defineEmits(["pickSlot", "clearSlot"]);

const { pokemonSpriteUrl } = usePokemonIcons();

const containerEl = ref(null);
const containerWidth = ref(0);

let ro = null;
onMounted(() => {
  if (!containerEl.value) return;
  ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerWidth.value = entry.contentRect.width;
    }
  });
  ro.observe(containerEl.value);
  containerWidth.value = containerEl.value.clientWidth;
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
});

const gridItems = computed(() => {
  const w = containerWidth.value;
  if (!w) return 3;
  const cols = Math.floor((w + props.gap) / (props.minSlotWidth + props.gap));
  return Math.max(2, Math.min(cols, 12));
});

const itemSecondarySize = computed(() => {
  const w = containerWidth.value;
  if (!w || !gridItems.value) return props.minSlotWidth;
  // Subtract gaps between columns and divide by cols.
  const totalGap = props.gap * (gridItems.value - 1);
  return Math.floor((w - totalGap) / gridItems.value);
});
</script>

<template>
  <div ref="containerEl" class="w-full">
    <ClientOnly>
      <RecycleScroller
        v-slot="{ item }"
        class="pokedex-scroller"
        :items="props.items"
        :item-size="props.slotHeight + props.gap"
        :grid-items="gridItems"
        :item-secondary-size="itemSecondarySize"
        key-field="id"
        page-mode
      >
        <article
          class="flex flex-col gap-1 min-w-0"
          :style="{ paddingRight: props.gap + 'px', paddingBottom: props.gap + 'px' }"
        >
          <button
            v-if="!item.cardId"
            type="button"
            class="aspect-[5/7] rounded-md border border-dashed border-default bg-elevated/30 hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 px-1 py-2 text-center w-full"
            @click="emit('pickSlot', item)"
          >
            <img
              :src="pokemonSpriteUrl(item.spriteId ?? item.dexNumber)"
              :alt="item.displayName"
              class="size-12 sm:size-14 object-contain opacity-60 grayscale"
              loading="lazy"
            />
            <span class="text-[10px] sm:text-xs font-medium text-muted truncate w-full">
              #{{ String(item.dexNumber).padStart(4, "0") }}
            </span>
            <span class="text-[10px] sm:text-xs text-default truncate w-full">
              {{ item.displayName }}
            </span>
          </button>
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
      </RecycleScroller>

      <template #fallback>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
          <div
            v-for="n in 24"
            :key="n"
            class="aspect-[5/7] rounded-md bg-elevated/30"
          />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.pokedex-scroller {
  width: 100%;
}
</style>
