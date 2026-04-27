<script setup>
import {
  buildMissingRows,
  toCsv,
  toPlainText,
  triggerDownload,
  slugifyBinderName,
} from "~/utils/exportMissing";

const props = defineProps({
  binder: { type: Object, default: null },
  items: { type: Array, default: () => [] },
});

const toast = useToast();

const missingRows = computed(() => buildMissingRows(props.items));
const missingCount = computed(() => missingRows.value.length);

const slug = computed(() =>
  slugifyBinderName(
    props.binder?.name,
    props.binder?.id ? `binder-${props.binder.id}` : "binder",
  ),
);

function downloadCsv() {
  const rows = missingRows.value;
  if (!rows.length) return;
  triggerDownload(
    `${slug.value}-missing.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8",
  );
  toast.add({
    color: "success",
    icon: "i-lucide-file-spreadsheet",
    title: "CSV downloaded",
    description: `${rows.length} missing card${rows.length === 1 ? "" : "s"}`,
  });
}

function downloadTxt() {
  const rows = missingRows.value;
  if (!rows.length) return;
  triggerDownload(
    `${slug.value}-missing.txt`,
    toPlainText(rows),
    "text/plain;charset=utf-8",
  );
  toast.add({
    color: "success",
    icon: "i-lucide-file-text",
    title: "TXT downloaded",
    description: `${rows.length} missing card${rows.length === 1 ? "" : "s"}`,
  });
}

async function copyToClipboard() {
  const rows = missingRows.value;
  if (!rows.length) return;
  const text = toPlainText(rows);
  try {
    if (!navigator?.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(text);
    toast.add({
      color: "success",
      icon: "i-lucide-clipboard-check",
      title: "Copied to clipboard",
      description: `${rows.length} missing card${rows.length === 1 ? "" : "s"}`,
    });
  } catch (err) {
    toast.add({
      color: "error",
      icon: "i-lucide-clipboard-x",
      title: "Copy failed",
      description: err?.message ?? "Unable to access clipboard",
    });
  }
}

const menuItems = computed(() => [
  [
    {
      label: "Download CSV",
      icon: "i-lucide-file-spreadsheet",
      onSelect: downloadCsv,
    },
    {
      label: "Download TXT",
      icon: "i-lucide-file-text",
      onSelect: downloadTxt,
    },
    {
      label: "Copy to clipboard",
      icon: "i-lucide-clipboard-copy",
      onSelect: copyToClipboard,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu :items="menuItems" :disabled="!missingCount">
    <UButton
      icon="i-lucide-download"
      :label="
        missingCount
          ? `Export missing (${missingCount})`
          : 'Export missing'
      "
      color="neutral"
      variant="outline"
      :disabled="!missingCount"
      :ui="{ label: 'hidden md:inline' }"
    />
  </UDropdownMenu>
</template>
