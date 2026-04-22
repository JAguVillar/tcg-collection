// Map a pkmn.gg card payload onto our `cards` table row shape.
export function cardToRow(card) {
  if (!card || typeof card !== "object" || !card.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid card payload",
    });
  }

  return {
    id: card.id,
    name: card.name ?? "Unknown",
    number_display: card.numberDisplay ?? null,
    set_id: card.setId ?? null,
    set_name: card.set ?? null,
    series: card.series ?? null,
    rarity: card.rarity ?? null,
    thumb_image_url: card.thumbImageUrl ?? null,
    large_image_url: card.largeImageUrl ?? null,
    set_icon_url: card.setIconUrl ?? null,
    release_date: card.releaseDate ?? null,
    category: card.category ?? "EN",
    raw: card,
  };
}
