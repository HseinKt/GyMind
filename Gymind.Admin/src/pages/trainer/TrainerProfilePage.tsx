import { Settings } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { TrainerHeader, TrainerShell } from "./TrainerComponents";

export function TrainerProfilePage() {
  const { session } = useAuth();
  return (
    <TrainerShell>
      <TrainerHeader title="Profile" subtitle="Your trainer account and assigned operating context." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Settings size={20} /></div>
            <div>
              <p className="text-lg font-black text-slate-950">{session?.user.fullName}</p>
              <p className="text-sm text-forge-muted">{session?.user.email}</p>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-black text-slate-950">Scope</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-forge-muted">Role</dt><dd className="font-bold">{session?.user.role}</dd></div>
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-forge-muted">Branch</dt><dd className="font-bold">{session?.user.branchId ?? "Assigned"}</dd></div>
          </dl>
        </Card>
      </div>
    </TrainerShell>
  );
}
