export function useSets() {
  const { data, pending, error } = useFetch("/api/sets", {
    key: "sets",
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
    return list.map((set) => ({
      label: set.name ?? set.title ?? String(set.id),
      value: set.id ?? set.code ?? set.name,
      avatar:
        set.symbol || set.logo ? { src: set.symbol ?? set.logo } : undefined,
    }));
  });

  return { options, pending, error };
}
