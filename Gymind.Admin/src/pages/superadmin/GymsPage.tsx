import { useMemo, useState } from "react";
import { API_BASE_URL } from "../../api/apiClient";
import { gymsApi } from "../../api/gymsApi";
import { usersApi } from "../../api/usersApi";
import { GymForm } from "../../components/forms/GymForm";
import { UserForm } from "../../components/forms/UserForm";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useApi } from "../../hooks/useApi";
import type { Gym, GymOwnerSummary } from "../../types/gym";
import { roleIds } from "../../utils/constants";
import { dateLabel } from "../../utils/formatters";

const all = "all";

async function withUploadedLogo(values: Partial<Gym>, logoFile?: File) {
  if (!logoFile) return values;
  const upload = await gymsApi.uploadLogo(logoFile);
  return { ...values, logoUrl: upload.logoUrl };
}

function gymLogoUrl(logoUrl?: string | null) {
  if (!logoUrl?.trim()) return "";
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL.replace(/\/api\/?$/, "")}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
}

function resolveStatus(row: Gym) {
  if (row.status?.trim()) return row.status;
  return row.isActive ? "Active" : "Inactive";
}

function isActive(row: Gym) {
  return row.isActive === true || resolveStatus(row).toLowerCase() === "active";
}

function LogoCell({ gym }: { gym: Gym }) {
  const src = gymLogoUrl(gym.logoUrl);
  if (!src) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-forge-border bg-slate-50 text-xs font-black text-forge-muted">
        --
      </div>
    );
  }

  return <img className="h-10 w-10 rounded-lg border border-forge-border object-cover" src={src} alt={`${gym.name} logo`} />;
}

function OwnersCell({ owners = [] }: { owners?: GymOwnerSummary[] }) {
  if (!owners.length) return <span className="text-forge-muted">No owners assigned</span>;
  return (
    <div className="grid gap-1">
      {owners.slice(0, 2).map((owner) => (
        <div key={owner.id}>
          <p className="font-semibold text-slate-900">{owner.name || owner.email}</p>
          <p className="text-xs text-forge-muted">{owner.email}</p>
        </div>
      ))}
      {owners.length > 2 ? <p className="text-xs font-bold text-forge-muted">+{owners.length - 2} more</p> : null}
    </div>
  );
}

function DetailTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-forge-border bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase text-forge-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

export function GymsPage() {
  const { data, loading, error, reload, setData } = useApi(gymsApi.getGyms, []);
  const [statusFilter, setStatusFilter] = useState(all);
  const [paymentFilter, setPaymentFilter] = useState(all);
  const [gymQuery, setGymQuery] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Gym | null>(null);
  const [details, setDetails] = useState<Gym | null>(null);
  const [managingOwners, setManagingOwners] = useState<Gym | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [confirm, setConfirm] = useState<{ gym: Gym; active: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [ownerLinkError, setOwnerLinkError] = useState("");
  const [ownerLinkNotice, setOwnerLinkNotice] = useState("");
  const [linkingOwner, setLinkingOwner] = useState(false);
  const ownerUsers = useApi(() => usersApi.getUsers(), []);

  const paymentOptions = useMemo(() => {
    const values = new Set((data ?? []).map((gym) => gym.subscriptionStatus).filter((value): value is string => Boolean(value?.trim())));
    return [...values].sort();
  }, [data]);

  const rows = useMemo(() => {
    return (data ?? []).filter((gym) => {
      const statusMatches = statusFilter === all || (statusFilter === "active" ? isActive(gym) : !isActive(gym));
      const paymentMatches = paymentFilter === all || gym.subscriptionStatus === paymentFilter;
      const gymMatches = !gymQuery.trim() || gym.name.toLowerCase().includes(gymQuery.trim().toLowerCase());
      const ownerText = [gym.ownerName, ...(gym.ownerEmails ?? []), ...(gym.owners ?? []).flatMap((owner) => [owner.name, owner.email])]
        .join(" ")
        .toLowerCase();
      const ownerMatches = !ownerQuery.trim() || ownerText.includes(ownerQuery.trim().toLowerCase());
      const created = gym.createdAt ? new Date(gym.createdAt) : null;
      const fromMatches = !createdFrom || (created && created >= new Date(`${createdFrom}T00:00:00`));
      const toMatches = !createdTo || (created && created <= new Date(`${createdTo}T23:59:59`));
      return statusMatches && paymentMatches && gymMatches && ownerMatches && fromMatches && toMatches;
    });
  }, [createdFrom, createdTo, data, gymQuery, ownerQuery, paymentFilter, statusFilter]);

  const availableOwners = useMemo(() => {
    if (!managingOwners) return [];
    const linkedOwnerIds = new Set((managingOwners.owners ?? []).map((owner) => owner.id));
    return (ownerUsers.data ?? []).filter((owner) => owner.role === "GymOwner" && !linkedOwnerIds.has(owner.id) && (!owner.gymId || owner.gymId === managingOwners.id));
  }, [managingOwners, ownerUsers.data]);

  function openOwnerManager(gym: Gym) {
    setSelectedOwnerId("");
    setOwnerLinkError("");
    setOwnerLinkNotice("");
    setManagingOwners(gym);
  }

  async function linkExistingOwner() {
    if (!managingOwners || !selectedOwnerId) return;
    setOwnerLinkError("");
    setOwnerLinkNotice("");
    setLinkingOwner(true);
    try {
      const saved = await gymsApi.linkOwner(managingOwners.id, Number(selectedOwnerId));
      setData((current) => current?.map((gym) => gym.id === saved.id ? saved : gym) ?? [saved]);
      setManagingOwners(saved);
      setSelectedOwnerId("");
      setOwnerLinkNotice("Owner linked to this gym.");
      setNotice("Owner linked successfully.");
      await ownerUsers.reload();
    } catch (err) {
      setOwnerLinkError(err instanceof Error ? err.message : "Unable to link owner.");
    } finally {
      setLinkingOwner(false);
    }
  }

  async function setGymActive(gym: Gym, active: boolean) {
    setActionError("");
    try {
      if (active) await gymsApi.activateGym(gym);
      else await gymsApi.deactivateGym(gym);
      setConfirm(null);
      setNotice(active ? "Gym activated." : "Gym deactivated.");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update gym status.");
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Gyms & Owners" description="Manage gym tenants and see linked owner users from the live platform database." />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="grid gap-1 text-sm font-bold text-slate-700">Gym status<Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value={all}>All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></Select></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Gym name<Input value={gymQuery} onChange={(event) => setGymQuery(event.target.value)} placeholder="Search gyms" /></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Owner<Input value={ownerQuery} onChange={(event) => setOwnerQuery(event.target.value)} placeholder="Name or email" /></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Subscription<Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value={all}>All statuses</option>{paymentOptions.map((value) => <option key={value} value={value}>{value}</option>)}</Select></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Created from<Input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} /></label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">Created to<Input type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} /></label>
        </div>
      </Card>
      <DataTable<Gym>
        title="Gyms & Owners"
        rows={rows}
        columns={[
          { key: "logoUrl", label: "Logo", render: (row) => <LogoCell gym={row} /> },
          { key: "name", label: "Gym" },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={resolveStatus(row)} /> },
          { key: "branches", label: "Branches" },
          { key: "ownerCount", label: "Owners", render: (row) => row.ownerCount ?? row.owners?.length ?? 0 },
          { key: "ownerName", label: "Owner contacts", render: (row) => <OwnersCell owners={row.owners} /> },
          { key: "subscriptionStatus", label: "Subscription", render: (row) => row.subscriptionStatus ? <StatusBadge value={row.subscriptionStatus} /> : "Not available" },
          { key: "createdAt", label: "Created", render: (row) => row.createdAt ? dateLabel(row.createdAt) : "Unknown" }
        ]}
        createLabel="Create gym"
        onCreate={() => setCreating(true)}
        actionsClassName="min-w-[24rem]"
        actionButtonClassName="w-24"
        swipeActions
        actions={[
          { label: "View", variant: "secondary", onClick: setDetails },
          { label: "Edit", variant: "secondary", onClick: setEditing },
          { label: "Add Owner", variant: "secondary", onClick: openOwnerManager },
          { label: "Activate", variant: "primary", hidden: isActive, onClick: (row) => setConfirm({ gym: row, active: true }) },
          { label: "Deactivate", variant: "danger", hidden: (row) => !isActive(row), onClick: (row) => setConfirm({ gym: row, active: false }) }
        ]}
      />

      <Modal open={creating} title="Create gym" onClose={() => setCreating(false)}>
        <GymForm onSubmit={async (values, logoFile) => {
          await gymsApi.createGym(await withUploadedLogo({ name: values.name, city: values.city, ownerUserId: values.ownerUserId, isActive: true }, logoFile));
          setCreating(false);
          setNotice("Gym created successfully.");
          await reload();
        }} />
      </Modal>

      {editing ? (
        <Modal open title="Edit gym" onClose={() => setEditing(null)}>
          <GymForm
            initialValues={{ name: editing.name, city: editing.city ?? undefined, logoUrl: editing.logoUrl ?? undefined, ownerUserId: editing.ownerUserId ?? undefined }}
            onSubmit={async (values, logoFile) => {
              await gymsApi.updateGym(editing.id, await withUploadedLogo({ name: values.name, city: values.city, ownerUserId: editing.ownerUserId, logoUrl: editing.logoUrl, isActive: isActive(editing) }, logoFile));
              setEditing(null);
              setNotice("Gym saved successfully.");
              await reload();
            }}
          />
        </Modal>
      ) : null}

      {details ? (
        <Modal open title="Gym details" onClose={() => setDetails(null)}>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <DetailTile label="Gym">{details.name}</DetailTile>
            <DetailTile label="Status"><StatusBadge value={resolveStatus(details)} /></DetailTile>
            <DetailTile label="Branches">{details.branches ?? 0}</DetailTile>
            <DetailTile label="Owners">{details.ownerCount ?? details.owners?.length ?? 0}</DetailTile>
            <DetailTile label="Created">{details.createdAt ? dateLabel(details.createdAt) : "Unknown"}</DetailTile>
            <DetailTile label="Subscription">{details.subscriptionStatus ?? "Not available"}{details.subscriptionPlan ? ` - ${details.subscriptionPlan}` : ""}</DetailTile>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3 md:col-span-2">
              <dt className="text-xs font-semibold uppercase text-forge-muted">Linked owners</dt>
              <dd className="mt-2 grid gap-2">
                {details.owners?.length ? details.owners.map((owner) => (
                  <div key={owner.id} className="rounded-lg border border-forge-border bg-white p-3">
                    <p className="font-black text-slate-950">{owner.name || owner.email}</p>
                    <p className="text-sm text-forge-muted">{owner.email}{owner.phone ? ` - ${owner.phone}` : ""}</p>
                  </div>
                )) : <span className="text-forge-muted">No owners assigned.</span>}
              </dd>
            </div>
          </dl>
        </Modal>
      ) : null}

      {managingOwners ? (
        <Modal open title={`Add owner: ${managingOwners.name}`} onClose={() => setManagingOwners(null)}>
          <div className="grid gap-4">
            {ownerLinkNotice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{ownerLinkNotice}</div> : null}
            {ownerLinkError ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{ownerLinkError}</div> : null}
            <div className="grid gap-2">
              {(managingOwners.owners ?? []).length ? managingOwners.owners?.map((owner) => (
                <div key={owner.id} className="rounded-lg border border-forge-border bg-slate-50 p-3">
                  <p className="font-black text-slate-950">{owner.name || owner.email}</p>
                  <p className="text-sm text-forge-muted">{owner.email}{owner.phone ? ` - ${owner.phone}` : ""}</p>
                </div>
              )) : <p className="text-sm font-semibold text-forge-muted">No owners are currently linked to this gym.</p>}
            </div>
            <div className="rounded-xl border border-forge-border bg-slate-50 p-3">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Link existing owner
                <Select value={selectedOwnerId} disabled={ownerUsers.loading || Boolean(ownerUsers.error)} onChange={(event) => setSelectedOwnerId(event.target.value)}>
                  <option value="">{ownerUsers.loading ? "Loading owners..." : "Select an unassigned owner"}</option>
                  {availableOwners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name ?? owner.fullName ?? owner.email} - {owner.email}</option>)}
                </Select>
              </label>
              {ownerUsers.error ? <p className="mt-2 text-sm font-semibold text-red-600">{ownerUsers.error}</p> : null}
              {!ownerUsers.loading && !ownerUsers.error && availableOwners.length === 0 ? <p className="mt-2 text-sm font-semibold text-forge-muted">No unassigned gym-owner users are available to link.</p> : null}
              <Button
                type="button"
                className="mt-3"
                disabled={!selectedOwnerId || linkingOwner}
                onClick={() => void linkExistingOwner()}
              >
                {linkingOwner ? "Adding..." : "Add owner"}
              </Button>
            </div>
            <div className="border-t border-forge-border pt-4">
              <h3 className="mb-3 text-sm font-black uppercase text-forge-muted">Create linked owner</h3>
              <UserForm
                fixedRoleId={roleIds.GymOwner}
                initialValues={{ gymId: managingOwners.id, roleId: roleIds.GymOwner }}
                lockedGymId={managingOwners.id}
                lockedGymName={managingOwners.name}
                hideBranch
                onSubmit={async (values) => {
                  await usersApi.createUser({ ...values, gymId: managingOwners.id, branchId: undefined });
                  setNotice("Owner linked successfully.");
                  await reload();
                  setManagingOwners(null);
                }}
              />
            </div>
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.active ? "Activate gym" : "Deactivate gym"}
        message={`Confirm ${confirm?.active ? "activation" : "deactivation"} for ${confirm?.gym.name ?? "this gym"}?`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm ? setGymActive(confirm.gym, confirm.active) : undefined}
      />
    </>
  );
}
