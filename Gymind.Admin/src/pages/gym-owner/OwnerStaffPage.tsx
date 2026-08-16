import { useMemo, useState } from "react";
import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { User } from "../../types/user";
import { roleIds, roleLabels } from "../../utils/constants";

const managedRoleIds = [roleIds.BranchManager, roleIds.Staff, roleIds.Trainer];
const managedRoles = ["BranchManager", "Staff", "Trainer"] as const;
const allRoles = "all";

function isManagedUser(user: User) {
  return managedRoleIds.includes(Number(user.roleId)) || managedRoles.includes(user.role as typeof managedRoles[number]);
}

function roleName(user: User) {
  const byId = Object.entries(roleIds).find(([, id]) => id === user.roleId)?.[0];
  return String(user.role ?? byId ?? "Staff");
}

export function OwnerStaffPage() {
  const { data, loading, error, reload } = useApi(usersApi.getUsers, []);
  const [role, setRole] = useState(allRoles);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ user: User; active: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const users = useMemo(() => (data ?? []).filter(isManagedUser), [data]);
  const filtered = useMemo(() => users.filter((user) => role === allRoles || roleName(user) === role), [role, users]);

  async function setUserActive(user: User, active: boolean) {
    setActionError("");
    try {
      if (active) await usersApi.activateUser(user);
      else await usersApi.deactivateUser(user);
      setConfirm(null);
      setNotice(active ? "User activated." : "User deactivated.");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update user status.");
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Team" description="Manage managers, staff, and trainers for your gym." />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <DataTable
        title="Team"
        rows={filtered}
        createLabel="Create user"
        onCreate={() => setOpen(true)}
        toolbar={(
          <Select className="min-w-40" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value={allRoles}>All roles</option>
            {managedRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
          </Select>
        )}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role", badge: true, render: (row) => roleLabels[roleName(row) as keyof typeof roleLabels] ?? roleName(row) },
          { key: "workspace", label: "Workspace" },
          { key: "isActive", label: "Active", badge: true }
        ]}
        actions={[
          { label: "Edit", variant: "secondary", onClick: setEditing },
          { label: "Activate", onClick: (row) => setConfirm({ user: row, active: true }), hidden: (row) => row.isActive === true },
          { label: "Deactivate", variant: "danger", onClick: (row) => setConfirm({ user: row, active: false }), hidden: (row) => row.isActive === false }
        ]}
      />
      <Modal open={open} title="Create user" onClose={() => setOpen(false)}>
        <UserForm
          allowedRoleIds={managedRoleIds}
          onSubmit={async (values) => {
            await usersApi.createUser(values);
            setOpen(false);
            setNotice("User created successfully.");
            await reload();
          }}
        />
      </Modal>
      <Modal open={Boolean(editing)} title="Edit user" onClose={() => setEditing(null)}>
        {editing ? (
          <UserForm
            allowedRoleIds={managedRoleIds}
            requirePassword={false}
            initialValues={{ fullName: editing.name ?? editing.fullName, email: editing.email, phone: editing.phone, roleId: editing.roleId, gymId: editing.gymId ?? undefined, branchId: editing.branchId ?? undefined, isActive: editing.isActive }}
            onSubmit={async (values) => {
              await usersApi.updateUser(editing.id, values);
              setEditing(null);
              setNotice("User updated successfully.");
              await reload();
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.active ? "Activate user" : "Deactivate user"}
        message={`Confirm ${confirm?.active ? "activation" : "deactivation"} for ${confirm?.user.name ?? "this user"}?`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm ? setUserActive(confirm.user, confirm.active) : undefined}
      />
    </>
  );
}
