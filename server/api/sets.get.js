import { getSets } from "~~/server/utils/pkmnCatalog";

export default defineEventHandler(async () => {
  try {
    const sets = await getSets();
    return { sets };
  } catch (err) {
    throw createError({
      statusCode: 503,
      statusMessage: `Sets catalog unavailable: ${err?.message ?? err}`,
    });
  }
});
