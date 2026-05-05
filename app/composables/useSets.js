// Loads the pkmn.gg set catalog from our server proxy and exposes it as
// dropdown-friendly options. SSR-prefetched via useFetch so the popover
// renders immediately on first open.

export function useSets({ category } = {}) {
  const { data, pending, error, refresh } = useFetch("/api/sets", {
    key: "pkmn-sets",
    default: () => ({ sets: [] }),
  });

  const sets = computed(() => data.value?.sets ?? []);

  // Filter by EN/JP category when caller provides a reactive category ref.
  const filteredSets = computed(() => {
    const cat = unref(category);
    if (!cat) return sets.value;
    return sets.value.filter((s) => s.category === cat);
  });

  // Series-prefixed label, sorted by series then by name. Keeps the
  // dropdown scannable without needing a grouped-menu API.
  const options = computed(() => {
    const list = filteredSets.value.map((s) => ({
      label: s.seriesName ? `${s.seriesName} · ${s.name}` : s.name,
      value: s.id,
      seriesName: s.seriesName ?? "",
      name: s.name ?? "",
    }));
    list.sort((a, b) => {
      const sa = a.seriesName.toLowerCase();
      const sb = b.seriesName.toLowerCase();
      if (sa !== sb) return sa < sb ? -1 : 1;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
    return list;
  });

  return { sets, filteredSets, options, pending, error, refresh };
}
