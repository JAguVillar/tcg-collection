import artistsData from "~/assets/artists-compact.json";

const options = Object.freeze(
  artistsData.map((artist) => ({
    label: artist.name,
    value: artist.name,
  })),
);

export function useArtists() {
  return { options };
}
