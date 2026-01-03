function normalizeNumericString(raw: string): string {
  return (raw ?? "")
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/,/g, ".");
}

export function parseDecimal(raw: string, fallback = 0): number {
  const s = normalizeNumericString(raw);
  if (s === "" || s === "." || s === "-" || s === "-.") return fallback;

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

export function isAllowedDecimalInput(raw: string): boolean {
  const s = normalizeNumericString(raw);
  return /^-?\d*(\.\d*)?$/.test(s);
}
