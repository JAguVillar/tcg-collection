function pickImageUrl(card) {
  return card?.largeImageUrl ?? card?.thumbImageUrl ?? "";
}

function pickSet(card) {
  return card?.set ?? card?.setName ?? "";
}

export function buildMissingRows(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.quantity === 0 && item.card)
    .map((item) => ({
      cardId: item.cardId ?? item.card?.id ?? "",
      name: item.card?.name ?? "",
      set: pickSet(item.card),
      number: item.card?.numberDisplay ?? "",
      rarity: item.card?.rarity ?? "",
      variant: item.variant ?? "normal",
      imageUrl: pickImageUrl(item.card),
    }));
}

const CSV_HEADER = [
  "Card ID",
  "Name",
  "Set",
  "Number",
  "Rarity",
  "Variant",
  "Image URL",
];

function csvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows) {
  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.cardId,
        row.name,
        row.set,
        row.number,
        row.rarity,
        row.variant,
        row.imageUrl,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

export function toPlainText(rows) {
  return rows
    .map((row) => {
      const head = row.name || row.cardId || "Unknown card";
      const setPart = row.set
        ? row.number
          ? `${row.set} #${row.number}`
          : row.set
        : row.number
          ? `#${row.number}`
          : "";
      const rarityPart = row.rarity ? `(${row.rarity})` : "";
      const variantPart =
        row.variant && row.variant !== "normal" ? `[${row.variant}]` : "";
      return [head, setPart && `— ${setPart}`, rarityPart, variantPart]
        .filter(Boolean)
        .join(" ");
    })
    .join("\n");
}

export function triggerDownload(filename, content, mime) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function slugifyBinderName(name, fallback = "binder") {
  if (!name) return fallback;
  const base = String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}
