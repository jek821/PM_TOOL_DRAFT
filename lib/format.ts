export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export const num = (n: number) => new Intl.NumberFormat("en-US").format(n);

export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

export const signedPct = (n: number, digits = 0) =>
  `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
