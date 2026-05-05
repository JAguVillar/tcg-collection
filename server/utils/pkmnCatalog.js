// In-memory catalog cache for pkmn.gg's `set` and `artists` endpoints.
// Both lists are large but change rarely (a few times a year for sets,
// new artists per release). Caching for 6h keeps the search filters
// snappy without baking thousands of entries into the client bundle.
//
// Strategy:
//   - Module-level Map keyed by catalog kind. Survives across requests
//     within the same Node process.
//   - Stampede protection: an in-flight Promise is shared so concurrent
//     requests don't fan out to pkmn.gg.
//   - Graceful degradation: if a refresh fails but we already have data
//     in cache, serve the stale copy and log. Only error out if there
//     is no cached data at all.

const SOURCES = {
  sets: "https://api.tcg.gg/pkmn/v1/set",
  artists: "https://api.tcg.gg/pkmn/v1/artists",
};

const TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map();
const inflight = new Map();

async function fetchFresh(kind) {
  const url = SOURCES[kind];
  if (!url) throw new Error(`Unknown catalog kind: ${kind}`);
  const data = await $fetch(url, { responseType: "json" });
  if (!Array.isArray(data)) {
    throw new Error(`Expected array from ${url}, got ${typeof data}`);
  }
  return data;
}

async function getCatalog(kind) {
  const entry = cache.get(kind);
  const now = Date.now();
  if (entry && now - entry.fetchedAt < TTL_MS) {
    return entry.data;
  }

  if (inflight.has(kind)) {
    return inflight.get(kind);
  }

  const promise = (async () => {
    try {
      const data = await fetchFresh(kind);
      cache.set(kind, { data, fetchedAt: Date.now() });
      return data;
    } catch (err) {
      if (entry) {
        // Serve stale on transient upstream failure.
        console.warn(
          `[pkmnCatalog] ${kind} refresh failed, serving stale (${err?.message ?? err})`,
        );
        return entry.data;
      }
      throw err;
    } finally {
      inflight.delete(kind);
    }
  })();

  inflight.set(kind, promise);
  return promise;
}

export function getSets() {
  return getCatalog("sets");
}

export function getArtists() {
  return getCatalog("artists");
}
