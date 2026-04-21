<script setup>
const props = defineProps({
  card: { type: Object, required: true },
  variant: { type: String, default: "normal" },
});

const { binders, loaded, fetchBinders } = useBinders();
const user = useSupabaseUser();
const open = ref(false);
const busy = ref(false);
const status = ref(null);

async function toggle() {
  open.value = !open.value;
  if (open.value && user.value && !loaded.value) {
    try { await fetchBinders(); } catch {}
  }
}

async function addTo(binderId) {
  busy.value = true;
  status.value = null;
  try {
    await $fetch(`/api/binders/${binderId}/items`, {
      method: "POST",
      body: {
        cardId: props.card.id,
        variant: props.variant,
        card: props.card,
      },
    });
    status.value = "Added";
    open.value = false;
  } catch (err) {
    status.value = err?.data?.statusMessage ?? "Error";
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  const close = (e) => {
    if (!e.target.closest?.(".binder-picker")) open.value = false;
  };
  document.addEventListener("click", close);
  onBeforeUnmount(() => document.removeEventListener("click", close));
});
</script>

<template>
  <div class="binder-picker" @click.stop>
    <button
      type="button"
      class="picker-button"
      :disabled="!user || busy"
      :title="user ? 'Add to binder…' : 'Sign in to add cards'"
      @click.stop="toggle"
    >
      <UIcon name="i-lucide-folder-plus" class="picker-icon" />
    </button>

    <div v-if="open && user" class="picker-menu">
      <div v-if="!binders.length" class="picker-empty">
        No binders yet. <NuxtLink to="/binders" @click="open = false">Create one</NuxtLink>
      </div>
      <button
        v-for="b in binders"
        :key="b.id"
        type="button"
        class="picker-item"
        :disabled="busy"
        @click="addTo(b.id)"
      >
        <span class="picker-item-name">{{ b.name }}</span>
        <span v-if="b.isDefault" class="picker-item-tag">default</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.binder-picker {
  position: relative;
  display: inline-flex;
}
.picker-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  width: 2rem;
  height: 2rem;
  background: rgba(22, 33, 62, 0.9);
  border: 1px solid #2f365a;
  border-radius: 8px;
  color: #d9e1ff;
  cursor: pointer;
}
.picker-button:hover:not(:disabled) {
  border-color: #f5a623;
  color: #fff;
}
.picker-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.picker-icon {
  width: 1.1rem;
  height: 1.1rem;
}
.picker-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.35rem);
  min-width: 14rem;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  z-index: 20;
  padding: 0.25rem;
  max-height: 18rem;
  overflow-y: auto;
}
.picker-empty {
  padding: 0.85rem;
  color: #9da8cf;
  font-size: 0.82rem;
}
.picker-empty a {
  color: #f5a623;
  text-decoration: underline;
}
.picker-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.7rem;
  background: transparent;
  border: none;
  color: #d9e1ff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.88rem;
  text-align: left;
}
.picker-item:hover:not(:disabled) {
  background: rgba(245, 166, 35, 0.12);
  color: #fff;
}
.picker-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-item-tag {
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: rgba(245, 166, 35, 0.2);
  color: #f5a623;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
