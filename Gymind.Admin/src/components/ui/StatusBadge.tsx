import { Badge } from "./Badge";

export function StatusBadge({ value }: { value: unknown }) {
  const label = String(value ?? "Unknown");
  const lower = label.toLowerCase();
  const tone = (lower.includes("active") && !lower.includes("inactive")) || lower.includes("paid") || lower.includes("booked") || lower.includes("checked in") || lower === "yes"
    ? "success"
    : lower.includes("pending") || lower.includes("expir") || lower.includes("busy") || lower.includes("nearly")
      ? "warning"
      : lower.includes("inactive") || lower.includes("cancel") || lower.includes("failed") || lower.includes("error") || lower.includes("over capacity")
        ? "danger"
        : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}
