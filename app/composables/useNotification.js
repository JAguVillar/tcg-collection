const ICONS = {
  success: "i-lucide-check-circle",
  error: "i-lucide-triangle-alert",
  info: "i-lucide-info",
  warning: "i-lucide-alert-triangle",
};

const COLORS = {
  success: "success",
  error: "error",
  info: "info",
  warning: "warning",
};

function extractMessage(input, fallback) {
  if (typeof input === "string") return input;
  if (input?.data?.statusMessage) return input.data.statusMessage;
  if (input?.message) return input.message;
  return fallback;
}

export function useNotification() {
  const toast = useToast();

  function notify(kind, payload) {
    const opts = typeof payload === "string" ? { description: payload } : (payload ?? {});
    toast.add({
      color: COLORS[kind] ?? "primary",
      icon: opts.icon ?? ICONS[kind],
      title: opts.title,
      description: opts.description,
    });
  }

  return {
    success: (payload) => notify("success", payload),
    error: (payload) => notify("error", payload),
    info: (payload) => notify("info", payload),
    warning: (payload) => notify("warning", payload),
    fromError: (err, title = "Something went wrong", fallback = "Error") =>
      notify("error", {
        title,
        description: extractMessage(err, fallback),
      }),
    raw: toast,
  };
}
