import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { dashboardApi, type AdminWorkspace } from "../../api/dashboardApi";
import { rolesApi, type PlatformRole } from "../../api/rolesApi";
import type { Role } from "../../types/auth";
import { roleIds, roleLabels } from "../../utils/constants";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface UserFormValues { fullName: string; email: string; phone?: string; password?: string; roleId: number; branchId?: number; gymId?: number; isActive?: boolean; }

let cachedWorkspace: AdminWorkspace | null = null;
let pendingWorkspace: Promise<AdminWorkspace> | null = null;
let cachedRoles: PlatformRole[] | null = null;
let pendingRoles: Promise<PlatformRole[]> | null = null;

function loadWorkspaceOptions(force = false) {
  if (!force && cachedWorkspace) return Promise.resolve(cachedWorkspace);
  if (!force && pendingWorkspace) return pendingWorkspace;

  pendingWorkspace = dashboardApi.getWorkspace()
    .then((workspace) => {
      cachedWorkspace = workspace;
      return workspace;
    })
    .finally(() => {
      pendingWorkspace = null;
    });

  return pendingWorkspace;
}

function loadRoleOptions(force = false) {
  if (!force && cachedRoles) return Promise.resolve(cachedRoles);
  if (!force && pendingRoles) return pendingRoles;

  pendingRoles = rolesApi.getRoles()
    .then((roles) => {
      cachedRoles = roles;
      return roles;
    })
    .finally(() => {
      pendingRoles = null;
    });

  return pendingRoles;
}

function roleNameFromStaticId(id?: number) {
  return Object.entries(roleIds).find(([, roleId]) => roleId === id)?.[0] as Role | undefined;
}

export function UserForm({
  onSubmit,
  saving = false,
  fixedRoleId,
  allowedRoleIds,
  initialValues,
  requirePassword = true,
  submitLabel = "Save user",
  lockedGymId,
  lockedGymName,
  hideBranch = false
}: {
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  saving?: boolean;
  fixedRoleId?: number;
  allowedRoleIds?: number[];
  initialValues?: Partial<UserFormValues>;
  requirePassword?: boolean;
  submitLabel?: string;
  lockedGymId?: number;
  lockedGymName?: string;
  hideBranch?: boolean;
}) {
  const [workspace, setWorkspace] = useState<AdminWorkspace | null>(cachedWorkspace);
  const [workspaceLoading, setWorkspaceLoading] = useState(!cachedWorkspace);
  const [workspaceError, setWorkspaceError] = useState("");
  const [roles, setRoles] = useState<PlatformRole[]>(cachedRoles ?? []);
  const [rolesLoading, setRolesLoading] = useState(!cachedRoles);
  const [rolesError, setRolesError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"fullName" | "email" | "password", string>>>({});
  const fixedRoleName = roleNameFromStaticId(fixedRoleId);
  const fixedRole = roles.find((role) => fixedRoleName ? role.name === fixedRoleName : role.id === fixedRoleId);
  const staffRole = roles.find((role) => role.name === "Staff");
  const defaultRoleId = fixedRole?.id ?? fixedRoleId ?? initialValues?.roleId ?? staffRole?.id ?? roleIds.Staff;
  const { register, handleSubmit } = useForm<UserFormValues>({ defaultValues: { ...initialValues, roleId: defaultRoleId } });
  const [selectedGymId, setSelectedGymId] = useState<number | undefined>(lockedGymId ?? initialValues?.gymId);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(hideBranch ? undefined : initialValues?.branchId);
  const branchOptions = selectedGymId
    ? workspace?.branches.filter((branch) => branch.gymId === selectedGymId) ?? []
    : [];
  const allowedRoleNames = allowedRoleIds?.map(roleNameFromStaticId).filter((role): role is Role => Boolean(role));
  const roleOptions = roles.length
    ? roles.filter((role) => !allowedRoleNames?.length || allowedRoleNames.includes(role.name as Role))
    : Object.entries(roleIds)
        .filter(([, id]) => !allowedRoleIds || allowedRoleIds.includes(id))
        .map(([name, id]) => ({ id, name }));
  const fixedRoleLabel = fixedRoleName ?? fixedRole?.name ?? "Staff";

  async function loadOptions(force = false) {
    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      setWorkspace(await loadWorkspaceOptions(force));
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to load gyms and branches.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    setRolesLoading(true);
    setRolesError("");
    loadRoleOptions()
      .then(setRoles)
      .catch((error) => setRolesError(error instanceof Error ? error.message : "Unable to load roles."))
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    if (lockedGymId) {
      setSelectedGymId(lockedGymId);
      if (hideBranch) setSelectedBranchId(undefined);
      return;
    }
    if (!selectedGymId && workspace?.gyms.length === 1) {
      setSelectedGymId(workspace.gyms[0].id);
    }
  }, [hideBranch, lockedGymId, selectedGymId, workspace]);

  async function submit(values: UserFormValues) {
    const nextFieldErrors: Partial<Record<"fullName" | "email" | "password", string>> = {};
    if (!values.fullName?.trim()) nextFieldErrors.fullName = "Full name is required.";
    
    const cleanEmail = values.email ? values.email.replace(/\s+/g, "").toLowerCase() : "";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail) {
      nextFieldErrors.email = "Email is required.";
    } else if (!emailRegex.test(cleanEmail)) {
      nextFieldErrors.email = "Invalid email format.";
    }

    if (requirePassword) {
      if (!values.password?.trim()) {
        nextFieldErrors.password = "Password is required.";
      } else {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(values.password)) {
          nextFieldErrors.password = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
        }
      }
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    if (rolesLoading || rolesError || !roles.length) {
      setSubmitError(rolesError || "Roles are still loading. Please try again.");
      return;
    }

    if (fixedRoleId && !fixedRole) {
      setSubmitError("The selected fixed role is not available from the backend.");
      return;
    }

    const payload: UserFormValues = {
      ...values,
      email: cleanEmail,
      roleId: fixedRole?.id ?? values.roleId,
      gymId: lockedGymId ?? selectedGymId,
      branchId: hideBranch ? undefined : selectedBranchId,
      isActive: values.isActive
    };

    setFieldErrors({});
    setSubmitError("");
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save user.";
      console.error("[UserForm] submit failed", error);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={handleSubmit(submit)}>
      <label>Full name<Input {...register("fullName", { required: true })} /></label>
      {fieldErrors.fullName ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.fullName}</p> : null}
      <label>Email<Input type="email" {...register("email", { required: true })} /></label>
      {fieldErrors.email ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.email}</p> : null}
      <label>Phone<Input {...register("phone")} /></label>
      {requirePassword ? (
        <>
          <label>
            Password
            <span className="relative block">
              <Input className="pr-12" type={showPassword ? "text" : "password"} {...register("password", { required: true })} />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>
          {fieldErrors.password ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{fieldErrors.password}</p> : null}
        </>
      ) : null}
      {fixedRoleId ? (
        <>
          <input type="hidden" {...register("roleId", { valueAsNumber: true })} />
          <div className="rounded-lg border border-forge-border bg-slate-50 px-3 py-2 text-sm md:col-span-2">
            <span className="text-forge-muted">Role fixed to</span> <span className="font-semibold text-slate-900">{roleLabels[fixedRoleLabel as keyof typeof roleLabels]}</span>
          </div>
        </>
      ) : (
        <label>Role<Select disabled={rolesLoading || Boolean(rolesError)} {...register("roleId", { valueAsNumber: true })}>{roleOptions.map((role) => <option key={role.id} value={role.id}>{roleLabels[role.name as keyof typeof roleLabels] ?? role.name}</option>)}</Select></label>
      )}
      {lockedGymId ? (
        <div className="rounded-lg border border-forge-border bg-slate-50 px-3 py-2 text-sm md:col-span-2">
          <span className="text-forge-muted">Gym</span> <span className="font-semibold text-slate-900">{lockedGymName ?? workspace?.gyms.find((gym) => gym.id === lockedGymId)?.name ?? `Gym #${lockedGymId}`}</span>
        </div>
      ) : (
        <label>Gym<Select name="gymId" data-value-as-number="true" value={selectedGymId ?? ""} disabled={workspaceLoading || Boolean(workspaceError)} onChange={(event) => {
          const nextGymId = event.target.value ? Number(event.target.value) : undefined;
          setSelectedGymId(nextGymId);
          setSelectedBranchId(undefined);
        }}><option value="">{workspaceLoading ? "Loading gyms..." : "Scoped automatically"}</option>{workspace?.gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label>
      )}
      {!hideBranch ? (
        <label>Branch<Select name="branchId" data-value-as-number="true" value={selectedBranchId ?? ""} onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : undefined)} disabled={workspaceLoading || Boolean(workspaceError) || !selectedGymId}><option value="">{workspaceLoading ? "Loading branches..." : selectedGymId ? "Scoped automatically" : "Select a gym first"}</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label>
      ) : null}
      {workspaceError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">
          <span>{workspaceError}</span>
          <Button type="button" variant="secondary" onClick={() => void loadOptions(true)} disabled={workspaceLoading}>Retry</Button>
        </div>
      ) : null}
      {rolesError ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{rolesError}</p> : null}
      {submitError ? <p className="text-sm font-semibold text-red-600 md:col-span-2">{submitError}</p> : null}
      <div className="md:col-span-2"><Button disabled={saving || submitting || rolesLoading}>{saving || submitting ? "Saving..." : rolesLoading ? "Loading roles..." : submitLabel}</Button></div>
    </form>
  );
}
