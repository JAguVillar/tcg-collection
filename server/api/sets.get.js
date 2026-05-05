export default defineCachedEventHandler(
  async () => {
    return await $fetch("https://api.tcg.gg/pkmn/v1/sets");
  },
  {
    maxAge: 60 * 60,
    name: "tcgg-sets",
    getKey: () => "all",
  },
);
