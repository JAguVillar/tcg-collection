<script setup>
definePageMeta({ middleware: ["auth"] });

const route = useRoute();
const binderId = computed(() => route.params.id);

const { binder, items, loading, error, addCard, removeCard } = useBinder(binderId);
const { setActiveBinder, activeBinderId } = useBinders();

const isActive = computed(() => activeBinderId.value === binderId.value);

function formatVariant(variant) {
  if (!variant || variant === "normal") return null;
  return variant.replace(/([A-Z])/g, " $1").trim();
}

async function bumpUp(item) {
  if (!item.card) return;
  await addCard(item.card, item.variant, 1);
}

async function bumpDown(item) {
  await removeCard(item.cardId, item.variant, { delta: 1 });
}

async function removeAll(item) {
  const ok = confirm(`Remove all copies of ${item.card?.name ?? item.cardId} from this binder?`);
  if (!ok) return;
  await removeCard(item.cardId, item.variant, { all: true });
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-row">
        <div>
          <NuxtLink to="/binders" class="back-link">← All binders</NuxtLink>
          <h1 v-if="binder" class="page-title">{{ binder.name }}</h1>
          <h1 v-else class="page-title">Binder</h1>
          <p v-if="binder?.description" class="page-subtitle">{{ binder.description }}</p>
        </div>
        <div class="header-actions">
          <AuthButton />
          <NuxtLink to="/" class="header-link">Search</NuxtLink>
          <button
            type="button"
            class="header-link"
            :disabled="isActive"
            @click="setActiveBinder(binderId)"
          >
            {{ isActive ? "Active binder" : "Set as active" }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="loading && !items.length" class="empty-state">Loading…</div>
    <div v-else-if="!items.length" class="empty-state">
      This binder is empty. Go to
      <NuxtLink to="/" class="inline-link">search</NuxtLink>
      and add cards.
    </div>

    <div v-else class="cards-grid">
      <div
        v-for="item in items"
        :key="item.id"
        class="card-item"
      >
        <div class="card-image-wrapper">
          <img
            v-if="item.card?.thumbImageUrl"
            :src="item.card.thumbImageUrl"
            :alt="item.card?.name"
            class="card-image"
            loading="lazy"
          />
          <div
            v-if="formatVariant(item.variant)"
            class="variant-badge"
          >
            {{ formatVariant(item.variant) }}
          </div>
          <div class="quantity-badge">x{{ item.quantity }}</div>
        </div>
        <div class="card-info">
          <div class="card-info-left">
            <div class="card-name-row">
              <img
                v-if="item.card?.setIconUrl"
                :src="item.card.setIconUrl"
                :alt="item.card?.set"
                class="set-icon"
              />
              <span class="card-name">{{ item.card?.name ?? item.cardId }}</span>
            </div>
            <span v-if="item.card?.numberDisplay" class="card-number">
              #{{ item.card.numberDisplay }}
            </span>
          </div>
        </div>
        <div class="card-actions">
          <button
            type="button"
            class="count-btn"
            :disabled="!item.card"
            @click="bumpUp(item)"
          >+</button>
          <button type="button" class="count-btn" @click="bumpDown(item)">−</button>
          <button type="button" class="count-btn danger" @click="removeAll(item)">
            Remove all
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #1a1a2e;
  padding: 2rem;
  color: #e0e0e0;
}
.page-header {
  max-width: 1400px;
  margin: 0 auto 1.5rem;
}
.header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.back-link {
  color: #9da8cf;
  font-size: 0.85rem;
  text-decoration: none;
}
.back-link:hover { color: #f5a623; }
.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin-top: 0.25rem;
  background: linear-gradient(135deg, #f8d847, #f5a623, #e8792f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.page-subtitle {
  color: #9da8cf;
  font-size: 0.9rem;
}
.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
.header-link {
  padding: 0.45rem 0.85rem;
  background: rgba(22, 33, 62, 0.8);
  border: 1px solid #2f365a;
  border-radius: 999px;
  color: #d9e1ff;
  text-decoration: none;
  font-size: 0.85rem;
  cursor: pointer;
}
.header-link:hover:not(:disabled) { border-color: #f5a623; color: #fff; }
.header-link:disabled { opacity: 0.6; cursor: not-allowed; }

.error-banner {
  max-width: 1400px;
  margin: 0 auto 1rem;
  padding: 0.85rem 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #f87171;
}
.empty-state {
  max-width: 1400px;
  margin: 3rem auto;
  text-align: center;
  color: #9da8cf;
}
.inline-link { color: #f5a623; text-decoration: underline; }

.cards-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}
.card-item {
  display: flex;
  flex-direction: column;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 14px;
  overflow: hidden;
}
.card-image-wrapper { position: relative; padding: 0.75rem 0.75rem 0; }
.card-image { width: 100%; border-radius: 10px; display: block; }
.variant-badge {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(22, 33, 62, 0.9);
  border: 1px solid #f5a623;
  color: #f5a623;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: capitalize;
}
.quantity-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.2rem 0.55rem;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #f5a623;
  color: #f5a623;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}
.card-info {
  padding: 0.65rem 0.85rem 0.25rem;
}
.card-info-left { display: flex; flex-direction: column; gap: 0.15rem; }
.card-name-row { display: flex; align-items: center; gap: 0.4rem; }
.set-icon {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
  filter: brightness(0) invert(0.7);
}
.card-name {
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-number { font-size: 0.75rem; color: #888; }

.card-actions {
  display: flex;
  gap: 0.35rem;
  padding: 0.5rem 0.85rem 0.75rem;
}
.count-btn {
  flex: 1;
  padding: 0.35rem 0.5rem;
  background: transparent;
  border: 1px solid #2f365a;
  border-radius: 6px;
  color: #c4c9db;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}
.count-btn:hover:not(:disabled) { border-color: #f5a623; color: #fff; }
.count-btn.danger:hover { border-color: #f87171; color: #f87171; }
.count-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
