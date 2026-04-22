import pokemonData from "~/assets/pokemon-compact.json";

const POKEMON_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

function slugToLabel(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const nameById = new Map(pokemonData.map((p) => [String(p.id), p.name]));

export function pokemonSpriteUrl(id) {
  if (!id) return null;
  return `${POKEMON_SPRITE_BASE}/${id}.png`;
}

export function pokemonNameFromId(id) {
  if (!id) return null;
  return nameById.get(String(id)) ?? null;
}

export function usePokemonIcons() {
  const options = pokemonData.map((p) => ({
    label: slugToLabel(p.name),
    value: String(p.id),
  }));

  return { options, pokemonSpriteUrl, pokemonNameFromId };
}
