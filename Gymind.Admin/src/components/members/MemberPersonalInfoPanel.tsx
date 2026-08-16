import { useEffect, useState } from "react";
import { membersApi } from "../../api/membersApi";
import type { MemberPersonalInfo } from "../../types/member";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";

export function MemberPersonalInfoPanel({ memberId }: { memberId: number }) {
  const [data, setData] = useState<MemberPersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    membersApi
      .getMemberPersonalInfo(memberId)
      .then((info) => {
        if (alive) setData(info);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Unable to load personal info.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [memberId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const hasWarning =
    data.doctorClearanceRequired ||
    Boolean(data.allergies) ||
    Boolean(data.injuries) ||
    Boolean(data.medications) ||
    Boolean(data.medicalConditions);

  return (
    <section className="mt-4 rounded-xl border border-forge-border bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-950">Personal / Emergency Info</h3>
        {hasWarning ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Medical attention</span> : null}
      </div>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-forge-border bg-white p-3">
            <dt className="text-xs font-semibold uppercase text-forge-muted">{key}</dt>
            <dd className="mt-1 break-words font-semibold text-slate-900">{String(value ?? "Not available")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
