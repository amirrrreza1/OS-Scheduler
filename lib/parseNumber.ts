// src/lib/parseNumber.ts
// Handles: "1.5", "1,5", "۱٫۵", "١٫٥", "۰.۲۵" ...

function normalizeNumericString(raw: string): string {
  return (
    (raw ?? "")
      .trim()
      // Persian digits
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      // Arabic digits
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      // Persian decimal separator
      .replace(/٫/g, ".")
      // comma as decimal separator
      .replace(/,/g, ".")
  );
}

export function parseDecimal(raw: string, fallback = 0): number {
  const s = normalizeNumericString(raw);

  // Allow intermediate states while typing
  if (s === "" || s === "." || s === "-" || s === "-.") return fallback;

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Allows typing: "", ".", "1.", "0.0", etc.
 * Use this for controlled input value filtering.
 */
export function isAllowedDecimalInput(raw: string): boolean {
  const s = normalizeNumericString(raw);
  return /^-?\d*(\.\d*)?$/.test(s);
}
