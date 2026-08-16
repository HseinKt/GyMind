import { useState } from "react";
import { classesApi } from "../../api/classesApi";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import type { GymClass } from "../../types/class";
import { TrainerClassAttendanceModal } from "./TrainerClassAttendanceModal";

function ClassDetails({ gymClass }: { gymClass: GymClass }) {
  return (
    <dl className="grid gap-3 text-sm md:grid-cols-2">
      {Object.entries(gymClass as unknown as Record<string, unknown>).map(([key, value]) => (
        <div key={key} className="rounded-xl border border-forge-border bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase text-forge-muted">{key}</dt>
          <dd className="mt-1 break-words font-semibold text-slate-900">{String(value ?? "Not available")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TrainerClassesPage() {
  const { data, loading, error } = useApi(classesApi.getClasses, []);
  const [details, setDetails] = useState<GymClass | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<GymClass | null>(null);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="My Classes" />
      <DataTable<GymClass>
        title="My Classes"
        rows={data ?? []}
        columns={[
          { key: "name", label: "Class" },
          { key: "time", label: "Time" },
          { key: "capacity", label: "Capacity" },
          { key: "booked", label: "Booked" },
          { key: "status", label: "Status", badge: true }
        ]}
        actions={[
          { label: "View", variant: "secondary", onClick: setDetails },
          { label: "Attendance", variant: "primary", onClick: setAttendanceClass }
        ]}
      />
      <Modal open={Boolean(details)} title="My Classes details" onClose={() => setDetails(null)}>
        {details ? <ClassDetails gymClass={details} /> : null}
      </Modal>
      {attendanceClass ? <TrainerClassAttendanceModal gymClass={attendanceClass} onClose={() => setAttendanceClass(null)} /> : null}
    </>
  );
}
