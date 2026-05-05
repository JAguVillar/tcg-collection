// Loads the pkmn.gg artist catalog from our server proxy. Replaces the
// previously bundled artists-compact.json so the catalog stays fresh and
// the client bundle stays small.

export function useArtists() {
  const { data, pending, error, refresh } = useFetch("/api/artists", {
    key: "pkmn-artists",
    default: () => ({ artists: [] }),
  });

  const artists = computed(() => data.value?.artists ?? []);

  const options = computed(() =>
    artists.value.map((artist) => ({
      label: artist.name,
      value: artist.name,
    })),
  );

  return { artists, options, pending, error, refresh };
}
