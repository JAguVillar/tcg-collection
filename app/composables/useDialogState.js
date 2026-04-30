export function useDialogState(initialState = {}) {
  const state = ref({ ...initialState });

  function reset() {
    state.value = { ...initialState };
  }

  function onOpenChange(isOpen) {
    if (!isOpen) reset();
  }

  return {
    state,
    reset,
    onOpenChange,
  };
}
