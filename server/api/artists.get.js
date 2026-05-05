import { getArtists } from "~~/server/utils/pkmnCatalog";

export default defineEventHandler(async () => {
  try {
    const artists = await getArtists();
    return { artists };
  } catch (err) {
    throw createError({
      statusCode: 503,
      statusMessage: `Artists catalog unavailable: ${err?.message ?? err}`,
    });
  }
});
