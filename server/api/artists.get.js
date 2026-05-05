export default defineCachedEventHandler(
  async () => {
    return await $fetch("https://api.tcg.gg/pkmn/v1/artists");
  },
  {
    maxAge: 60 * 60,
    name: "tcgg-artists",
    getKey: () => "all",
  },
);
