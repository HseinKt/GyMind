import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { branchesApi } from "../../api/branchesApi";
import type { Branch } from "../../types/branch";
import type { Gym } from "../../types/gym";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { ACCESS_TYPE_OPTIONS, isMembershipPlanAccessType } from "../../utils/membershipPlanAccessTypes";

export interface MembershipPlanFormValues {
  gymId?: number;
  name: string;
  price?: number;
  durationMonth?: number;
  accessType?: string;
  includesClasses?: boolean;
  includesPt?: boolean;
  isActive?: boolean;
  branchIds?: number[];
}

export function MembershipPlanForm({
  initialValues,
  onSubmit,
  saving = false,
  gyms = []
}: {
  initialValues?: Partial<MembershipPlanFormValues>;
  onSubmit: (values: MembershipPlanFormValues) => Promise<void> | void;
  saving?: boolean;
  gyms?: Gym[];
}) {
  const { register, formState: { errors } } = useForm<MembershipPlanFormValues>({
    defaultValues: {
      ...initialValues,
      gymId: initialValues?.gymId ?? (gyms.length === 1 ? gyms[0].id : undefined),
      accessType: isMembershipPlanAccessType(initialValues?.accessType) ? initialValues.accessType : undefined
    }
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedGymId, setSelectedGymId] = useState(initialValues?.gymId ?? (gyms.length === 1 ? gyms[0].id : undefined));
  const [accessType, setAccessType] = useState(initialValues?.accessType && isMembershipPlanAccessType(initialValues.accessType) ? initialValues.accessType : "");
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(initialValues?.branchIds ?? []);
  const [localError, setLocalError] = useState("");

  const filteredBranches = useMemo(
    () => branches.filter((branch) => !selectedGymId || branch.gymId === selectedGymId),
    [branches, selectedGymId]
  );

  useEffect(() => {
    branchesApi.getBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  const cleanNumber = (value: FormDataEntryValue | null) => {
    if (value === null || value === "") return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };
  function toggleBranch(branchId: number) {
    setSelectedBranchIds((current) =>
      current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId]
    );
  }

  const submitPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const accessSelect = form.elements.namedItem("accessType") as HTMLSelectElement | null;
    const selectedAccessType = accessSelect?.value ?? "";
    if (!isMembershipPlanAccessType(selectedAccessType)) {
      setLocalError("Select a valid access type.");
      return;
    }

    let branchIds: number[] = [];
    if (selectedAccessType === "one_branch") {
      const branchId = Number(formData.get("singleBranchId"));
      branchIds = Number.isFinite(branchId) && branchId > 0 ? [branchId] : [];
      if (branchIds.length !== 1 || !Number.isFinite(branchIds[0])) {
        setLocalError("Select one branch.");
        return;
      }
    }

    if (selectedAccessType === "multi-branch") {
      branchIds = formData.getAll("branchIds").map((value) => Number(value)).filter(Number.isFinite);
      if (branchIds.length < 1) {
        setLocalError("Select at least one branch.");
        return;
      }
    }

    setLocalError("");
    return onSubmit({
      gymId: cleanNumber(formData.get("gymId")),
      name: String(formData.get("name") ?? "").trim(),
      price: cleanNumber(formData.get("price")),
      durationMonth: cleanNumber(formData.get("durationMonth")),
      accessType: selectedAccessType,
      includesClasses: formData.has("includesClasses"),
      includesPt: formData.has("includesPt"),
      isActive: formData.has("isActive"),
      branchIds
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={submitPlan}>
      {gyms.length > 1 ? <label className="md:col-span-2">Gym<Select {...register("gymId", { valueAsNumber: true, required: true })} onChange={(event) => setSelectedGymId(event.target.value ? Number(event.target.value) : undefined)}><option value="">Select gym</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label> : null}
      {gyms.length === 1 ? <input type="hidden" value={gyms[0].id} {...register("gymId", { valueAsNumber: true })} /> : null}
      {errors.gymId ? <p className="text-sm text-red-600 md:col-span-2">Select a gym.</p> : null}
      <label>Name<Input {...register("name", { required: true })} /></label>
      <label>Price<Input type="number" {...register("price", { valueAsNumber: true, required: true })} /></label>
      <label>Duration months<Input type="number" {...register("durationMonth", { valueAsNumber: true, required: true })} /></label>
      <label>Access type<Select name="accessType" value={accessType} required onChange={(event) => { setAccessType(event.target.value); setSelectedBranchIds([]); }}><option value="">Select access</option>{ACCESS_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></label>
      {errors.name ? <p className="text-sm text-red-600 md:col-span-2">Plan name is required.</p> : null}
      {errors.price ? <p className="text-sm text-red-600 md:col-span-2">Price is required.</p> : null}
      {errors.durationMonth ? <p className="text-sm text-red-600 md:col-span-2">Duration in months is required.</p> : null}
      {errors.accessType ? <p className="text-sm text-red-600 md:col-span-2">Select an access type.</p> : null}
      {localError ? <p className="text-sm text-red-600 md:col-span-2">{localError}</p> : null}
      {accessType === "full-access" ? <p className="md:col-span-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">All branches under this gym are included.</p> : null}
      {accessType === "one_branch" ? (
        <label className="md:col-span-2">Branch
          <Select
            name="singleBranchId"
            value={selectedBranchIds[0] ?? ""}
            onChange={(event) => setSelectedBranchIds(event.target.value ? [Number(event.target.value)] : [])}
            required
          >
            <option value="">Select branch</option>
            {filteredBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </Select>
        </label>
      ) : null}
      {accessType === "multi-branch" ? (
        <fieldset className="md:col-span-2 rounded-xl border border-forge-border p-3">
          <legend className="px-1 text-sm font-bold">Branches</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {filteredBranches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
                <input
                  type="checkbox"
                  name="branchIds"
                  value={branch.id}
                  checked={selectedBranchIds.includes(branch.id)}
                  onChange={() => toggleBranch(branch.id)}
                />
                {branch.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="flex gap-2"><input type="checkbox" {...register("includesClasses")} /> Includes classes</label>
      <label className="flex gap-2"><input type="checkbox" {...register("includesPt")} /> Includes PT</label>
      <label className="flex gap-2"><input type="checkbox" {...register("isActive")} defaultChecked={initialValues?.isActive ?? true} /> Active</label>
      <div className="md:col-span-2"><Button disabled={saving}>Save plan</Button></div>
    </form>
  );
}
