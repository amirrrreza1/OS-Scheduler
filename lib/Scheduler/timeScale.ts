function countDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const s = value.toString().toLowerCase();

  const eIdx = s.indexOf("e-");
  if (eIdx >= 0) {
    const exp = Number(s.slice(eIdx + 2));
    return Number.isFinite(exp) ? exp : 0;
  }

  const dot = s.indexOf(".");
  return dot >= 0 ? s.length - dot - 1 : 0;
}

export function computeScale(values: number[], capDecimals = 2): number {
  const maxDp = values.reduce((m, v) => Math.max(m, countDecimals(v)), 0);
  const dp = Math.min(maxDp, capDecimals);
  return 10 ** dp;
}

export function scaleToInt(value: number, scale: number): number {
  return Math.round(value * scale);
}

export function unscale(value: number, scale: number): number {
  return value / scale;
}
