// Dispatcher for Pokémon card search. Routes by `body.mode`:
//   - "advanced" (default): rich filter set via api.tcg.gg
//   - "common":              query-only fallback via pkmn.gg/_next/data
//
// Both strategies return the same { value, hits } shape so consumers don't
// need to branch.

import * as advanced from "./searchStrategies/advanced";
import * as common from "./searchStrategies/common";

export const PKMN_API_URL = advanced.ADVANCED_API_URL;
export const DEFAULT_SEARCH_BODY = advanced.ADVANCED_DEFAULT_BODY;

export const SEARCH_MODES = ["advanced", "common"];

function pickStrategy(mode) {
  return mode === "common" ? common : advanced;
}

export function buildSearchPayload(body = {}) {
  // Backwards-compatible helper; only meaningful for advanced mode.
  const { mode: _mode, ...rest } = body;
  const payload = { ...advanced.ADVANCED_DEFAULT_BODY, ...rest };
  if (payload.artist && (!Array.isArray(payload.artists) || !payload.artists.length)) {
    payload.artists = [payload.artist];
  }
  delete payload.artist;
  return payload;
}

export async function searchCards(body = {}) {
  const strategy = pickStrategy(body?.mode);
  return strategy.search(body);
}

export async function collectAllCards(body = {}) {
  // Bulk collection only makes sense in advanced mode (full server-side
  // pagination + filters). The common endpoint returns its full result set
  // in one shot, so a single call suffices.
  if (body?.mode === "common") {
    const { value, hits } = await common.search(body);
    return { cards: value, hits: hits ?? value.length };
  }

  const firstPage = Number(body?.page) > 0 ? Number(body.page) : 1;
  let page = firstPage;
  let hits = null;
  const cards = [];

  while (true) {
    const data = await advanced.search({ ...body, page });
    const pageCards = Array.isArray(data?.value) ? data.value : [];

    if (hits === null && Number.isFinite(Number(data?.hits))) {
      hits = Number(data.hits);
    }

    if (!pageCards.length) break;
    cards.push(...pageCards);
    if (hits !== null && cards.length >= hits) break;
    page += 1;
  }

  return { cards, hits: hits ?? cards.length };
}
