const nf = new Intl.NumberFormat("fa-IR");
export const faNum = (n: number, digits = 2) =>
  nf.format(Number.isFinite(n) ? Number(n.toFixed(digits)) : 0);
