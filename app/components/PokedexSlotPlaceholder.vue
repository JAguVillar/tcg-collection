<script setup>
const props = defineProps({
  item: { type: Object, required: true },
});
defineEmits(["pick"]);

const { pokemonSpriteUrl } = usePokemonIcons();
</script>

<template>
  <button
    type="button"
    class="aspect-[5/7] w-full rounded-md border border-dashed border-default bg-elevated/30 hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-1 px-1 py-2 text-center"
    @click="$emit('pick', props.item)"
  >
    <img
      :src="pokemonSpriteUrl(props.item.spriteId ?? props.item.dexNumber)"
      :alt="props.item.displayName"
      class="size-12 sm:size-14 object-contain opacity-80"
      loading="lazy"
    />
    <span class="text-[10px] sm:text-xs font-medium text-muted truncate w-full">
      #{{ String(props.item.dexNumber).padStart(4, "0") }}
    </span>
    <span class="text-[10px] sm:text-xs text-default truncate w-full">
      {{ props.item.displayName }}
    </span>
  </button>
</template>
