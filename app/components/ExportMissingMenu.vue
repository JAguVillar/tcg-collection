<script setup>
import {
  buildMissingRows,
  toCsv,
  toPlainText,
  triggerDownload,
  slugifyBinderName,
} from "~/utils/exportMissing";
import { createExportMenuItems } from "~/utils/menuItemFactories";

const props = defineProps({
  binder: { type: Object, default: null },
  items: { type: Array, default: () => [] },
});

const { notify } = useNotification();

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
  notify.success(`${rows.length} missing card${rows.length === 1 ? "" : "s"}`, {
    title: "CSV downloaded",
    icon: "i-lucide-file-spreadsheet",
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
  notify.success(`${rows.length} missing card${rows.length === 1 ? "" : "s"}`, {
    title: "TXT downloaded",
    icon: "i-lucide-file-text",
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
    notify.success(`${rows.length} missing card${rows.length === 1 ? "" : "s"}`, {
      title: "Copied to clipboard",
      icon: "i-lucide-clipboard-check",
    });
  } catch (err) {
    notify.error(err?.message ?? "Unable to access clipboard", {
      title: "Copy failed",
      icon: "i-lucide-clipboard-x",
    });
  }
}

const menuItems = computed(() =>
  createExportMenuItems({
    onDownloadCsv: downloadCsv,
    onDownloadTxt: downloadTxt,
    onCopyToClipboard: copyToClipboard,
  }),
);
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
      aria-label="Export missing cards"
      :ui="{ label: 'hidden md:inline' }"
    />
  </UDropdownMenu>
</template>
