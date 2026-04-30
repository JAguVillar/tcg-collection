export function useNotification() {
  const toast = useToast();

  function success(description, options = {}) {
    toast.add({
      color: "success",
      icon: options.icon ?? "i-lucide-check-circle",
      title: options.title ?? "Success",
      description,
    });
  }

  function error(description, options = {}) {
    toast.add({
      color: "error",
      icon: options.icon ?? "i-lucide-triangle-alert",
      title: options.title ?? "Error",
      description,
    });
  }

  function info(description, options = {}) {
    toast.add({
      color: "info",
      icon: options.icon ?? "i-lucide-info",
      title: options.title ?? "Info",
      description,
    });
  }

  return {
    notify: {
      success,
      error,
      info,
    },
  };
}
