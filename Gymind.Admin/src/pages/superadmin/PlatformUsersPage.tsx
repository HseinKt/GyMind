import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useApi } from "../../hooks/useApi";
import type { User } from "../../types/user";
import type { Role } from "../../types/auth";
import { roleLabels } from "../../utils/constants";
import { useMemo, useState } from "react";

function escapeCell(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function userName(user: User) {
  return user.name ?? user.fullName ?? "Unnamed user";
}

function initials(user: User) {
  return userName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function roleTone(role?: string) {
  if (role === "SuperAdmin") return "danger" as const;
  if (role === "GymOwner") return "info" as const;
  if (role === "BranchManager") return "warning" as const;
  if (role === "Trainer") return "success" as const;
  return "neutral" as const;
}

function UserCell({ user }: { user: User }) {
  return (
    <div className="flex min-w-56 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
        {initials(user)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-black text-slate-950">{userName(user)}</p>
        <p className="truncate text-xs font-semibold text-forge-muted">{user.email ?? "No email"}</p>
      </div>
    </div>
  );
}

function ContactCell({ user }: { user: User }) {
  return (
    <div className="grid gap-1">
      <span className="text-sm font-semibold text-slate-900">{user.email ?? "Not assigned"}</span>
      <span className="text-xs font-semibold text-forge-muted">{user.phone ?? "No phone"}</span>
    </div>
  );
}

function exportUsers(rows: User[]) {
  const headers = ["Name", "Email", "Phone", "Role", "Workspace", "Active"];
  const body = rows.map((user) => [
    user.name ?? user.fullName ?? "",
    user.email ?? "",
    user.phone ?? "",
    typeof user.role === "string" ? user.role : "",
    user.workspace ?? "",
    user.isActive ? "Yes" : "No"
  ]);
  const html = `<table><thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "platform-users.xls";
  link.click();
  URL.revokeObjectURL(url);
}

export function PlatformUsersPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ user: User; active: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const { data, loading, error, reload } = useApi(() => usersApi.getUsers(), []);
  const rows = useMemo(() => {
    const users = data ?? [];
    return roleFilter ? users.filter((user) => user.role === roleFilter) : users;
  }, [data, roleFilter]);
  const roleOptions = useMemo(() => {
    const names = new Set((data ?? []).map((user) => String(user.role ?? "")).filter(Boolean));
    return [...names].sort();
  }, [data]);
  const activeUsers = rows.filter((user) => user.isActive).length;
  const inactiveUsers = rows.length - activeUsers;
  const superAdmins = rows.filter((user) => user.role === "SuperAdmin").length;
  const ownerUsers = rows.filter((user) => user.role === "GymOwner").length;
  const columns = useMemo(() => [
    { key: "name", label: "User", render: (row: User) => <UserCell user={row} /> },
    { key: "email", label: "Contact", render: (row: User) => <ContactCell user={row} /> },
    { key: "role", label: "Role", render: (row: User) => <Badge tone={roleTone(String(row.role ?? ""))}>{String(row.role ?? "Not assigned")}</Badge> },
    { key: "workspace", label: "Workspace", render: (row: User) => <span className="font-semibold text-slate-800">{row.workspace ?? "Platform"}</span> },
    { key: "isActive", label: "Status", render: (row: User) => <StatusBadge value={row.isActive ? "Active" : "Inactive"} /> }
  ], []);

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
      <PageHeader title="Platform Users" description="All scoped admin users returned by the backend." />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Total users</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Active</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{activeUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Inactive</p>
          <p className="mt-2 text-3xl font-black text-slate-500">{inactiveUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-forge-muted">Admin owners</p>
          <p className="mt-2 text-3xl font-black text-forge-primary">{superAdmins + ownerUsers}</p>
        </Card>
      </div>
      <DataTable<User>
        title="Platform Users"
        rows={rows}
        columns={columns}
        createLabel="Create user"
        onCreate={() => setOpen(true)}
        actionsClassName="min-w-[18rem]"
        actionButtonClassName="w-24"
        swipeActions
        actions={[
          { label: "View", variant: "secondary", onClick: setViewing },
          { label: "Edit", variant: "secondary", onClick: setEditing },
          { label: "Activate", variant: "primary", hidden: (row) => row.isActive === true, onClick: (row) => setConfirm({ user: row, active: true }) },
          { label: "Deactivate", variant: "danger", hidden: (row) => row.isActive !== true, onClick: (row) => setConfirm({ user: row, active: false }) }
        ]}
        toolbar={(
          <>
            <Select className="min-w-40" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">All roles</option>
              {roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role as Role] ?? role}</option>)}
            </Select>
            <Button type="button" variant="secondary" onClick={() => exportUsers(rows)}>Export Excel</Button>
          </>
        )}
      />
      <Modal open={open} title="Create user" onClose={() => setOpen(false)}>
        <UserForm onSubmit={async (v) => { await usersApi.createUser(v); setOpen(false); setNotice("User created successfully."); await reload(); }} />
      </Modal>
      {viewing ? (
        <Modal open title="User details" onClose={() => setViewing(null)}>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Name</dt><dd className="mt-1 font-semibold text-slate-900">{viewing.name ?? viewing.fullName ?? "Not assigned"}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Email</dt><dd className="mt-1 font-semibold text-slate-900">{viewing.email ?? "Not assigned"}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Phone</dt><dd className="mt-1 font-semibold text-slate-900">{viewing.phone ?? "Not assigned"}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Role</dt><dd className="mt-1 font-semibold text-slate-900">{String(viewing.role ?? "Not assigned")}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Workspace</dt><dd className="mt-1 font-semibold text-slate-900">{viewing.workspace ?? "Not assigned"}</dd></div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Active</dt><dd className="mt-1 font-semibold text-slate-900">{viewing.isActive ? "Yes" : "No"}</dd></div>
          </dl>
        </Modal>
      ) : null}
      {editing ? (
        <Modal open title="Edit user" onClose={() => setEditing(null)}>
          <UserForm
            requirePassword={false}
            submitLabel="Save user"
            initialValues={{
              fullName: editing.fullName ?? editing.name ?? "",
              email: editing.email ?? "",
              phone: editing.phone ?? "",
              roleId: editing.roleId,
              gymId: editing.gymId ?? undefined,
              branchId: editing.branchId ?? undefined,
              isActive: editing.isActive ?? true
            }}
            onSubmit={async (values) => {
              await usersApi.updateUser(editing.id, {
                fullName: values.fullName,
                email: values.email,
                phone: values.phone,
                roleId: values.roleId,
                gymId: values.gymId,
                branchId: values.branchId,
                isActive: values.isActive ?? editing.isActive ?? true
              });
              setEditing(null);
              setNotice("User saved successfully.");
              await reload();
            }}
          />
        </Modal>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.active ? "Activate user" : "Deactivate user"}
        message={`Confirm ${confirm?.active ? "activation" : "deactivation"} for ${confirm?.user.name ?? confirm?.user.email ?? "this user"}?`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm ? setUserActive(confirm.user, confirm.active) : undefined}
      />
    </>
  );
}
