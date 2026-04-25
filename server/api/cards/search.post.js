import { searchCards } from "~~/server/utils/pkmnSearch";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return searchCards(body);
});
