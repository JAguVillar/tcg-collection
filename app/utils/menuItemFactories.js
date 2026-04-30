export function createBinderMenuItems(binders, onSelectBinder) {
  if (!binders?.length) {
    return [
      [
        {
          label: "No binders yet",
          icon: "i-lucide-plus",
          to: "/binders",
        },
      ],
    ];
  }

  return [
    binders.map((binder) => ({
      label:
        binder.mode === "custom"
          ? `${binder.name} (checklist)`
          : binder.isDefault
            ? `${binder.name} (default)`
            : binder.name,
      icon:
        binder.mode === "custom"
          ? "i-lucide-list-checks"
          : binder.isDefault
            ? "i-lucide-star"
            : "i-lucide-folder",
      onSelect: () => onSelectBinder(binder),
    })),
  ];
}

export function createExportMenuItems({
  onDownloadCsv,
  onDownloadTxt,
  onCopyToClipboard,
}) {
  return [
    [
      {
        label: "Download CSV",
        icon: "i-lucide-file-spreadsheet",
        onSelect: onDownloadCsv,
      },
      {
        label: "Download TXT",
        icon: "i-lucide-file-text",
        onSelect: onDownloadTxt,
      },
      {
        label: "Copy to clipboard",
        icon: "i-lucide-clipboard-copy",
        onSelect: onCopyToClipboard,
      },
    ],
  ];
}
