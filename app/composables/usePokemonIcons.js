import pokemonData from "~/assets/pokemon-compact.json";

const POKEMON_SPRITE_BASE = "https://img.pokemondb.net/sprites/sword-shield/normal";

export function pokemonSpriteUrl(slug) {
  if (!slug) return null;
  return `${POKEMON_SPRITE_BASE}/${slug}.png`;
}

function slugToLabel(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function usePokemonIcons() {
  const options = pokemonData.map((p) => ({
    label: slugToLabel(p.name),
    value: p.name,
  }));

  return { options, pokemonSpriteUrl };
}
