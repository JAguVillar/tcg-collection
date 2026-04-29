export function createBinderActionItems(binder, { active = false, emit }) {
  const groups = [];
  const primary = [];

  if (!active) {
    primary.push({
      label: "Set as active",
      icon: "i-lucide-bookmark",
      onSelect: () => emit("set-active", binder),
    });
  }
  if (!binder?.isDefault) {
    primary.push({
      label: "Make default",
      icon: "i-lucide-star",
      onSelect: () => emit("make-default", binder),
    });
  }
  if (primary.length) groups.push(primary);

  groups.push([
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("delete", binder),
    },
  ]);
  return groups;
}

export function binderToPickerItem(b) {
  const isCustom = b.mode === "custom";
  const suffix = isCustom ? " (checklist)" : b.isDefault ? " (default)" : "";
  return {
    label: `${b.name}${suffix}`,
    icon: isCustom
      ? "i-lucide-list-checks"
      : b.isDefault
        ? "i-lucide-star"
        : "i-lucide-folder",
  };
}

export function createExportMenuItems({ onCsv, onTxt, onCopy }) {
  return [
    [
      { label: "Download CSV", icon: "i-lucide-file-spreadsheet", onSelect: onCsv },
      { label: "Download TXT", icon: "i-lucide-file-text", onSelect: onTxt },
      { label: "Copy to clipboard", icon: "i-lucide-clipboard-copy", onSelect: onCopy },
    ],
  ];
}
