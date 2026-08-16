import { useForm } from "react-hook-form";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { Gym } from "../../types/gym";

export interface BranchFormValues { gymId?: number; name: string; address?: string; phone?: string; rangeKm?: number; capacity?: number; areaSqm?: number; lat?: number; lng?: number; openTime?: string; closeTime?: string; isActive?: boolean; }

function normalizeTimeForInput(value?: string | null) {
  if (!value) return "";
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

function normalizeTimeForApi(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

export function BranchForm({
  initialValues,
  onSubmit,
  saving = false,
  gyms = [],
  gymsLoading = false,
  gymLoadError = ""
}: {
  initialValues?: Partial<BranchFormValues>;
  onSubmit: (values: BranchFormValues) => Promise<void> | void;
  saving?: boolean;
  gyms?: Gym[];
  gymsLoading?: boolean;
  gymLoadError?: string;
}) {
  const defaultGymId = initialValues?.gymId ?? (gyms.length === 1 ? gyms[0].id : undefined);
  const { register, handleSubmit } = useForm<BranchFormValues>({
    defaultValues: {
      ...initialValues,
      gymId: defaultGymId,
      openTime: normalizeTimeForInput(initialValues?.openTime),
      closeTime: normalizeTimeForInput(initialValues?.closeTime),
      isActive: initialValues?.isActive ?? true
    }
  });
  const needsGymSelection = gyms.length !== 1 && !defaultGymId;
  const canSave = !saving && !gymsLoading && !gymLoadError && (!needsGymSelection || gyms.length > 0);

  const submit = handleSubmit((values) => onSubmit({
    ...values,
    openTime: normalizeTimeForApi(values.openTime),
    closeTime: normalizeTimeForApi(values.closeTime),
    isActive: Boolean(values.isActive)
  }));

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
      {gymsLoading ? <div className="md:col-span-2 rounded-lg border border-forge-border bg-slate-50 p-3 text-sm font-semibold text-slate-700">Loading gym options...</div> : null}
      {gymLoadError ? <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{gymLoadError}</div> : null}
      {gyms.length > 1 ? <label className="md:col-span-2">Gym<Select {...register("gymId", { valueAsNumber: true, required: true })}><option value="">Select gym</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label> : null}
      {gyms.length === 1 ? <input type="hidden" value={gyms[0].id} {...register("gymId", { valueAsNumber: true })} /> : null}
      {!gymsLoading && !gymLoadError && gyms.length === 0 ? <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">No owned gym is available for this branch.</div> : null}
      <label className="md:col-span-2">Branch name<Input {...register("name", { required: true })} /></label>
      <label className="md:col-span-2">Address<Input {...register("address")} /></label>
      <label>Phone<Input {...register("phone")} /></label>
      <label>Range KM<Input type="number" step="0.01" {...register("rangeKm", { valueAsNumber: true })} /></label>
      <label>Capacity<Input type="number" {...register("capacity", { valueAsNumber: true })} /></label>
      <label>Area sqm<Input type="number" {...register("areaSqm", { valueAsNumber: true })} /></label>
      <label>Latitude<Input type="number" step="0.000001" {...register("lat", { valueAsNumber: true })} /></label>
      <label>Longitude<Input type="number" step="0.000001" {...register("lng", { valueAsNumber: true })} /></label>
      <label>Open time<Input type="time" {...register("openTime")} /></label>
      <label>Close time<Input type="time" {...register("closeTime")} /></label>
      <label className="flex gap-2"><input type="checkbox" {...register("isActive")} /> Active</label>
      <div className="md:col-span-2"><Button disabled={!canSave}>{saving ? "Saving..." : "Save branch"}</Button></div>
    </form>
  );
}
