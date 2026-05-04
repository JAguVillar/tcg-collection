import { listPresetsSummary } from "~~/server/utils/binderTemplates";

// Public list of available binder templates. Used by the "New binder"
// modal to populate the Start-from-template dropdown without hardcoding.
export default defineEventHandler(() => {
  return listPresetsSummary();
});
