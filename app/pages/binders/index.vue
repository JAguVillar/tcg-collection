<script setup>
definePageMeta({ middleware: ["auth"] });

const {
  binders,
  loading,
  error,
  fetchBinders,
  createBinder,
  updateBinder,
  deleteBinder,
  setActiveBinder,
  activeBinder,
} = useBinders();

const creating = ref(false);
const newName = ref("");
const newDescription = ref("");
const createError = ref(null);

onMounted(() => { fetchBinders().catch(() => {}); });

async function onCreate() {
  createError.value = null;
  try {
    await createBinder({
      name: newName.value,
      description: newDescription.value || null,
    });
    newName.value = "";
    newDescription.value = "";
    creating.value = false;
  } catch (err) {
    createError.value = err?.data?.statusMessage ?? err?.message ?? "Error";
  }
}

async function markDefault(id) {
  await updateBinder(id, { isDefault: true });
}

async function onDelete(binder) {
  const confirmed = confirm(
    `Delete binder "${binder.name}"? This will remove all ${binder.itemCount} items in it.`,
  );
  if (!confirmed) return;
  await deleteBinder(binder.id);
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-row">
        <div>
          <h1 class="page-title">My Binders</h1>
          <p class="page-subtitle" v-if="activeBinder">
            Active: <strong>{{ activeBinder.name }}</strong>
          </p>
        </div>
        <div class="header-actions">
          <AuthButton />
          <NuxtLink to="/" class="header-link">Search</NuxtLink>
        </div>
      </div>
    </header>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <section class="binder-create">
      <button
        v-if="!creating"
        type="button"
        class="create-button"
        @click="creating = true"
      >
        + New binder
      </button>
      <form v-else class="create-form" @submit.prevent="onCreate">
        <input v-model="newName" placeholder="Binder name" required class="create-input" />
        <input
          v-model="newDescription"
          placeholder="Description (optional)"
          class="create-input"
        />
        <div class="create-actions">
          <button type="submit" class="create-button primary">Create</button>
          <button type="button" class="create-button" @click="creating = false">Cancel</button>
        </div>
        <p v-if="createError" class="create-error">{{ createError }}</p>
      </form>
    </section>

    <div v-if="loading && !binders.length" class="empty-state">Loading…</div>
    <div v-else-if="!binders.length" class="empty-state">
      You don't have any binders yet. Create your first one above.
    </div>

    <div v-else class="binders-grid">
      <article
        v-for="b in binders"
        :key="b.id"
        class="binder-card"
        :class="{ active: activeBinder && activeBinder.id === b.id }"
      >
        <NuxtLink :to="`/binders/${b.id}`" class="binder-link">
          <header class="binder-card-header">
            <h2 class="binder-name">{{ b.name }}</h2>
            <span v-if="b.isDefault" class="binder-tag">default</span>
          </header>
          <p v-if="b.description" class="binder-description">{{ b.description }}</p>
          <p class="binder-count">{{ b.itemCount }} {{ b.itemCount === 1 ? "card" : "cards" }}</p>
        </NuxtLink>
        <footer class="binder-card-footer">
          <button
            type="button"
            class="binder-action"
            :disabled="activeBinder && activeBinder.id === b.id"
            @click="setActiveBinder(b.id)"
          >
            {{ activeBinder && activeBinder.id === b.id ? "Active" : "Set active" }}
          </button>
          <button
            v-if="!b.isDefault"
            type="button"
            class="binder-action"
            @click="markDefault(b.id)"
          >
            Make default
          </button>
          <button
            type="button"
            class="binder-action danger"
            @click="onDelete(b)"
          >
            Delete
          </button>
        </footer>
      </article>
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
  max-width: 1200px;
  margin: 0 auto 1.5rem;
}
.header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #f8d847, #f5a623, #e8792f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.page-subtitle {
  color: #9da8cf;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.header-link {
  padding: 0.45rem 0.85rem;
  background: rgba(22, 33, 62, 0.8);
  border: 1px solid #2f365a;
  border-radius: 999px;
  color: #d9e1ff;
  text-decoration: none;
  font-size: 0.85rem;
}
.header-link:hover {
  border-color: #f5a623;
  color: #fff;
}

.error-banner {
  max-width: 1200px;
  margin: 0 auto 1rem;
  padding: 0.85rem 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #f87171;
}

.binder-create {
  max-width: 1200px;
  margin: 0 auto 1.25rem;
}
.create-button {
  padding: 0.65rem 1.25rem;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  color: #d9e1ff;
  font-weight: 600;
  cursor: pointer;
}
.create-button.primary {
  background: linear-gradient(135deg, #f5a623, #e8792f);
  border-color: transparent;
  color: #fff;
}
.create-button:hover { border-color: #f5a623; }
.create-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 0.85rem;
}
.create-input {
  flex: 1 1 180px;
  padding: 0.6rem 0.85rem;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 0.9rem;
}
.create-input:focus {
  outline: none;
  border-color: #f5a623;
}
.create-actions { display: flex; gap: 0.5rem; }
.create-error {
  width: 100%;
  color: #f87171;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.empty-state {
  max-width: 1200px;
  margin: 3rem auto;
  text-align: center;
  color: #9da8cf;
}

.binders-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.binder-card {
  display: flex;
  flex-direction: column;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
.binder-card:hover { transform: translateY(-2px); border-color: #f5a623; }
.binder-card.active { border-color: rgba(245, 166, 35, 0.7); }

.binder-link {
  padding: 1rem;
  color: inherit;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 7rem;
}
.binder-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.binder-name {
  font-size: 1.1rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.binder-tag {
  font-size: 0.65rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(245, 166, 35, 0.2);
  color: #f5a623;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.binder-description {
  font-size: 0.85rem;
  color: #9da8cf;
}
.binder-count {
  margin-top: auto;
  font-size: 0.8rem;
  color: #888;
}
.binder-card-footer {
  display: flex;
  gap: 0.35rem;
  padding: 0.65rem;
  border-top: 1px solid #2a2a4a;
  background: rgba(0, 0, 0, 0.15);
  flex-wrap: wrap;
}
.binder-action {
  flex: 1 1 auto;
  padding: 0.4rem 0.55rem;
  background: transparent;
  border: 1px solid #2f365a;
  border-radius: 6px;
  color: #c4c9db;
  cursor: pointer;
  font-size: 0.75rem;
}
.binder-action:hover:not(:disabled) {
  border-color: #f5a623;
  color: #fff;
}
.binder-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.binder-action.danger:hover {
  border-color: #f87171;
  color: #f87171;
}
</style>
