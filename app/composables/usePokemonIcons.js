import pokemonData from "~/assets/pokemon-compact.json";

const POKEMON_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

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

const options = Object.freeze(
  pokemonData.map((p) => ({
    label: slugToLabel(p.name),
    value: p.id,
  })),
);

export function usePokemonIcons() {
  return { options, pokemonSpriteUrl };
}
