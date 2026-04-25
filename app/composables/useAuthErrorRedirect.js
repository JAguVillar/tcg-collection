function getStatusCode(err) {
  const status = Number(err?.statusCode ?? err?.status ?? err?.response?.status);
  return Number.isFinite(status) ? status : null;
}

function getErrorMessage(err) {
  return String(
    err?.data?.statusMessage ?? err?.statusMessage ?? err?.message ?? "",
  ).toLowerCase();
}

export function isAuthError(err) {
  const status = getStatusCode(err);
  if (status === 401 || status === 403) return true;

  const message = getErrorMessage(err);
  return (
    message.includes("auth session missing") ||
    message.includes("not authenticated") ||
    message.includes("jwt")
  );
}

export function useAuthErrorRedirect() {
  const route = useRoute();

  async function redirectToLogin() {
    if (!import.meta.client) return;
    if (route.path.startsWith("/login")) return;

    const redirect = encodeURIComponent(route.fullPath || "/");
    await navigateTo(`/login?redirect=${redirect}`);
  }

  async function handleAuthError(err) {
    if (!isAuthError(err)) return false;
    await redirectToLogin();
    return true;
  }

  return { handleAuthError };
}
