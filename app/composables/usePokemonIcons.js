import pokemonData from "~/assets/pokemon-compact.json";

// official-artwork covers all forms (mega/gmax/regional, ids > 10000)
// in color, unlike the root sprites/pokemon/{id}.png path.
const POKEMON_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

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
