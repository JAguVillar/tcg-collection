import { serverSupabaseUser } from "#supabase/server";

export async function requireUser(event) {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }
  return user;
}
