import { MetricCard } from "@/components/ui/MetricCard";
import { formatNumber } from "@/utils/formatNumber";

export function InsightMetricCard({ label, value, suffix, accent }: { label: string; value?: number | null | undefined; suffix?: string | undefined; accent?: boolean | undefined }) {
  return <MetricCard label={label} value={formatNumber(value, suffix)} accent={accent} />;
}
