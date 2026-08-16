export function asNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatNumber(value?: number | null, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "Not available";
  return `${Math.round(value * 10) / 10}${suffix}`;
}
