import { useForm } from "react-hook-form";
import { dashboardApi } from "../../api/dashboardApi";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface ClassFormValues { name: string; trainerUserId?: number; branchId?: number; capacity?: number; startTime?: string; endTime?: string; }

function toUtcIso(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function ClassForm({ onSubmit, saving = false }: { onSubmit: (values: ClassFormValues) => Promise<void> | void; saving?: boolean }) {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const { register, handleSubmit } = useForm<ClassFormValues>();
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => onSubmit({ ...values, startTime: toUtcIso(values.startTime), endTime: toUtcIso(values.endTime) }))}><label className="md:col-span-2">Class name<Input {...register("name", { required: true })} /></label><label>Trainer<Select {...register("trainerUserId", { valueAsNumber: true })}><option value="">Select trainer</option>{workspace.data?.trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</Select></label><label>Branch<Select {...register("branchId", { valueAsNumber: true })}><option value="">Select branch</option>{workspace.data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label><label>Capacity<Input type="number" {...register("capacity", { valueAsNumber: true })} /></label><label>Start<Input type="datetime-local" {...register("startTime")} /></label><label>End<Input type="datetime-local" {...register("endTime")} /></label>{workspace.error ? <p className="text-sm text-red-600 md:col-span-2">{workspace.error}</p> : null}<div className="md:col-span-2"><Button disabled={saving || workspace.loading}>Save class</Button></div></form>;
}
