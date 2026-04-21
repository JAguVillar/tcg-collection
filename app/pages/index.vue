<script setup>
import { SORT_OPTIONS } from "~/composables/useCardSearch";

const { searchQuery, cards, loading, loadingMore, error, hasMore, separateVariants, sortField, isAscending, searchCards, loadMore, setSort } = useCardSearch();

// Search on load
searchCards({ query: "rowlet" });

// Re-search when separateVariants changes
watch(separateVariants, () => {
  searchCards();
});
</script>

<template>
  <div class="page-container">
    <header class="search-header">
      <h1 class="page-title">Pokémon Card Collection</h1>
      <form class="search-form" @submit.prevent="searchCards()">
        <div class="search-input-wrapper">
          <UIcon name="i-lucide-search" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search for a Pokémon card..."
            class="search-input"
          />
        </div>
        <button type="submit" class="search-button" :disabled="loading">
          {{ loading ? 'Searching...' : 'Search' }}
        </button>
      </form>

      <div class="search-controls">
        <div class="sort-bar">
          <button
            v-for="option in SORT_OPTIONS"
            :key="option.value"
            type="button"
            class="sort-pill"
            :class="{ active: sortField === option.value }"
            :aria-pressed="sortField === option.value"
            @click="setSort(option.value)"
          >
            <span>{{ option.label }}</span>
            <span
              v-if="option.hasDirection"
              class="sort-arrows"
              :class="{ desc: sortField === option.value && !isAscending }"
            >
              <UIcon
                name="i-lucide-arrow-up"
                class="sort-arrow"
                :class="{ muted: sortField === option.value && !isAscending }"
              />
              <UIcon
                name="i-lucide-arrow-down"
                class="sort-arrow"
                :class="{ muted: sortField === option.value && isAscending }"
              />
            </span>
          </button>
        </div>

        <label class="toggle-label">
          <span class="toggle-text">Separate Variants</span>
          <button
            type="button"
            class="toggle-switch"
            :class="{ active: separateVariants }"
            role="switch"
            :aria-checked="separateVariants"
            @click="separateVariants = !separateVariants"
          >
            <span class="toggle-knob" />
          </button>
        </label>
      </div>
    </header>

    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <p>Searching cards...</p>
    </div>

    <div v-else-if="cards.length" class="cards-grid">
      <div
        v-for="(card, index) in cards"
        :key="`${card.id}-${card.variant}-${index}`"
        class="card-item"
      >
        <div class="card-image-wrapper">
          <img
            :src="card.thumbImageUrl"
            :alt="card.name"
            class="card-image"
            loading="lazy"
          />
          <div v-if="card.variant && card.variant !== 'normal' && card.variant !== 'holofoil'" class="variant-badge">
            {{ card.variant.replace(/([A-Z])/g, ' $1').trim() }}
          </div>
        </div>
        <div class="card-info">
          <div class="card-info-left">
            <div class="card-name-row">
              <img
                v-if="card.setIconUrl"
                :src="card.setIconUrl"
                :alt="card.set"
                class="set-icon"
              />
              <span class="card-name">{{ card.name }}</span>
            </div>
            <span class="card-number">#{{ card.numberDisplay }}</span>
          </div>
          <span class="card-price" :class="{ 'price-na': card.formattedPrice === 'N/A' }">
            {{ card.formattedPrice }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="cards.length && hasMore" class="load-more-container">
      <button class="load-more-button" :disabled="loadingMore" @click="loadMore">
        <span v-if="loadingMore" class="load-more-content">
          <span class="spinner-small" />
          Loading...
        </span>
        <span v-else>Load More</span>
      </button>
    </div>

    <div v-if="cards.length && !hasMore" class="end-message">
      No more cards to show
    </div>

    <div v-if="!loading && !cards.length && searchQuery" class="empty-state">
      <p>No cards found for "{{ searchQuery }}"</p>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #1a1a2e;
  padding: 2rem;
  color: #e0e0e0;
}

.search-header {
  max-width: 1400px;
  margin: 0 auto 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, #f8d847, #f5a623, #e8792f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.search-form {
  display: flex;
  gap: 0.75rem;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #888;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 3rem;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  color: #e0e0e0;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: #f5a623;
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
}

.search-input::placeholder {
  color: #666;
}

.search-button {
  padding: 0.85rem 2rem;
  background: linear-gradient(135deg, #f5a623, #e8792f);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.2s;
  white-space: nowrap;
}

.search-button:hover {
  transform: translateY(-1px);
  opacity: 0.92;
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.search-controls {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sort-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.sort-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  border: 1px solid #2f365a;
  background: rgba(22, 33, 62, 0.8);
  color: #9da8cf;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.sort-pill:hover {
  color: #d9e1ff;
  border-color: #4a5790;
  background: rgba(31, 44, 84, 0.95);
}

.sort-pill.active {
  color: #fff;
  border-color: rgba(245, 166, 35, 0.7);
  background: linear-gradient(135deg, rgba(245, 166, 35, 0.25), rgba(232, 121, 47, 0.25));
}

.sort-pill:focus-visible,
.toggle-switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.2);
}

.sort-arrows {
  display: inline-flex;
  flex-direction: column;
  gap: 0;
  color: currentColor;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.sort-arrow {
  width: 0.72rem;
  height: 0.72rem;
}

.sort-arrow.muted {
  opacity: 0.3;
}

.sort-pill.active .sort-arrows {
  transform: translateY(-0.5px);
}

/* Search Options */
.search-options {
  display: flex;
  align-items: center;
  margin-top: 0.75rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  padding: 0.25rem 0.3rem;
  border-radius: 999px;
  border: 1px solid #2f365a;
  background: rgba(22, 33, 62, 0.75);
}

.toggle-text {
  font-size: 0.85rem;
  color: #c4c9db;
  user-select: none;
  padding-left: 0.2rem;
}

.toggle-switch {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  background: #202a4d;
  border: 1px solid #38457a;
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  transition: background 0.25s, border-color 0.25s, transform 0.15s;
}

.toggle-switch:hover {
  transform: translateY(-1px);
}

.toggle-switch.active {
  background: #f5a623;
  border-color: #f5a623;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.15rem;
  height: 1.15rem;
  background: #e0e0e0;
  border-radius: 50%;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(1.2rem);
}

/* Error */
.error-banner {
  max-width: 1400px;
  margin: 0 auto 1.5rem;
  padding: 1rem 1.25rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #f87171;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  gap: 1rem;
  color: #888;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid #2a2a4a;
  border-top-color: #f5a623;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Cards Grid */
.cards-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

/* Card Item */
.card-item {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  background: #16213e;
  border: 1px solid #2a2a4a;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-item:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 166, 35, 0.08);
}

.card-image-wrapper {
  position: relative;
  padding: 0.75rem 0.75rem 0;
}

.card-image {
  width: 100%;
  height: auto;
  border-radius: 10px;
  display: block;
  transition: transform 0.3s ease;
}

.card-item:hover .card-image {
  transform: scale(1.03);
}

.variant-badge {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(22, 33, 62, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid #f5a623;
  color: #f5a623;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
}

/* Card Info */
.card-info {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.65rem 0.85rem 0.75rem;
  gap: 0.5rem;
}

.card-info-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.set-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  object-fit: contain;
  filter: brightness(0) invert(0.7);
}

.card-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-number {
  font-size: 0.75rem;
  color: #888;
}

.card-price {
  font-size: 0.9rem;
  font-weight: 700;
  color: #4ade80;
  flex-shrink: 0;
}

.card-price.price-na {
  color: #666;
  font-weight: 400;
}

/* Load More */
.load-more-container {
  max-width: 1400px;
  margin: 2rem auto 0;
  display: flex;
  justify-content: center;
}

.load-more-button {
  padding: 0.85rem 3rem;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  color: #e0e0e0;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.load-more-button:hover {
  background: #1e2d50;
  border-color: #f5a623;
  transform: translateY(-1px);
}

.load-more-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.load-more-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner-small {
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid #2a2a4a;
  border-top-color: #f5a623;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.end-message {
  max-width: 1400px;
  margin: 2rem auto 0;
  text-align: center;
  color: #555;
  font-size: 0.9rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 4rem 0;
  color: #666;
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 640px) {
  .page-container {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .search-form {
    flex-direction: column;
  }

  .search-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.85rem;
  }

  .sort-bar {
    justify-content: center;
  }

  .toggle-label {
    justify-content: space-between;
  }

  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}
</style>
