export function money(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
}

export function dateLabel(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function timeLabel(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function percent(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return `${Math.round(Number.isFinite(number) ? number : 0)}%`;
}

export function roleLabel(value?: string | null) {
  const labels: Record<string, string> = {
    SuperAdmin: "Super Admin",
    GymOwner: "Gym Owner",
    BranchManager: "Branch Manager",
    Staff: "Staff",
    Trainer: "Trainer",
    Member: "Member"
  };
  return value ? labels[value] ?? value : "Unknown";
}

export function cleanLabel(value: unknown, fallback = "Unknown") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text && text !== "undefined" && text !== "null" ? text : fallback;
}
