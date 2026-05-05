export function useArtists() {
  const { data, pending, error } = useFetch("/api/artists", {
    key: "artists",
    default: () => [],
    server: false,
    lazy: true,
  });

  const options = computed(() => {
    const list = Array.isArray(data.value)
      ? data.value
      : Array.isArray(data.value?.value)
        ? data.value.value
        : [];
    return list.map((artist) => {
      const name = typeof artist === "string" ? artist : artist.name;
      return { label: name, value: name };
    });
  });

  return { options, pending, error };
}
