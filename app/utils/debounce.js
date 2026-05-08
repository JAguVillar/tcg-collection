export function debounce(fn, wait = 300) {
  let timer = null;
  let lastArgs = null;
  let pendingResolvers = [];

  const debounced = (...args) => {
    lastArgs = args;
    return new Promise((resolve) => {
      pendingResolvers.push(resolve);
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        const resolvers = pendingResolvers;
        pendingResolvers = [];
        const result = await fn(...lastArgs);
        resolvers.forEach((r) => r(result));
      }, wait);
    });
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingResolvers = [];
    lastArgs = null;
  };

  debounced.flush = async (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const callArgs = args.length ? args : lastArgs ?? [];
    const resolvers = pendingResolvers;
    pendingResolvers = [];
    lastArgs = null;
    const result = await fn(...callArgs);
    resolvers.forEach((r) => r(result));
    return result;
  };

  return debounced;
}

export function normalizeQuery(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}
