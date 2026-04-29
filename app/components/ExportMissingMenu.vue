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

const notify = useNotification();

const missingRows = computed(() => buildMissingRows(props.items));
const missingCount = computed(() => missingRows.value.length);

const slug = computed(() =>
  slugifyBinderName(
    props.binder?.name,
    props.binder?.id ? `binder-${props.binder.id}` : "binder",
  ),
);

function rowsLabel(n) {
  return `${n} missing card${n === 1 ? "" : "s"}`;
}

function downloadCsv() {
  const rows = missingRows.value;
  if (!rows.length) return;
  triggerDownload(
    `${slug.value}-missing.csv`,
    toCsv(rows),
    "text/csv;charset=utf-8",
  );
  notify.success({
    title: "CSV downloaded",
    icon: "i-lucide-file-spreadsheet",
    description: rowsLabel(rows.length),
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
  notify.success({
    title: "TXT downloaded",
    icon: "i-lucide-file-text",
    description: rowsLabel(rows.length),
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
    notify.success({
      title: "Copied to clipboard",
      icon: "i-lucide-clipboard-check",
      description: rowsLabel(rows.length),
    });
  } catch (err) {
    notify.error({
      title: "Copy failed",
      icon: "i-lucide-clipboard-x",
      description: err?.message ?? "Unable to access clipboard",
    });
  }
}

const menuItems = computed(() =>
  createExportMenuItems({
    onCsv: downloadCsv,
    onTxt: downloadTxt,
    onCopy: copyToClipboard,
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
      :aria-label="
        missingCount
          ? `Export ${missingCount} missing cards`
          : 'Export missing cards'
      "
      :ui="{ label: 'hidden md:inline' }"
    />
  </UDropdownMenu>
</template>
