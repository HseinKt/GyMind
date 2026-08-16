import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { branchesApi } from "../../api/branchesApi";
import { gymsApi } from "../../api/gymsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable, type RowAction } from "../../components/ui/DataTable";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { Branch } from "../../types/branch";
import type { Gym } from "../../types/gym";

type BranchDraft = {
  name: string;
  address: string;
  phone: string;
  rangeKm: string;
  capacity: string;
  areaSqm: string;
  lat: string;
  lng: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
};

function emptyDraft(): BranchDraft {
  return {
    name: "",
    address: "",
    phone: "",
    rangeKm: "",
    capacity: "",
    areaSqm: "",
    lat: "",
    lng: "",
    openTime: "",
    closeTime: "",
    isActive: true
  };
}

function toNumber(value: string) {
  return value.trim() === "" ? undefined : Number(value);
}

function BranchDraftEditor({
  index,
  value,
  onChange
}: {
  index: number;
  value: BranchDraft;
  onChange: (next: BranchDraft) => void;
}) {
  return (
    <div className="rounded-xl border border-forge-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">Branch {index + 1}</h3>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(event) => onChange({ ...value, isActive: event.target.checked })}
          />
          Active
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          Branch name
          <Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
        </label>
        <label className="md:col-span-2">
          Address
          <Input value={value.address} onChange={(event) => onChange({ ...value, address: event.target.value })} />
        </label>
        <label>
          Phone
          <Input value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} />
        </label>
        <label>
          Range KM
          <Input type="number" step="0.01" value={value.rangeKm} onChange={(event) => onChange({ ...value, rangeKm: event.target.value })} />
        </label>
        <label>
          Capacity
          <Input type="number" value={value.capacity} onChange={(event) => onChange({ ...value, capacity: event.target.value })} />
        </label>
        <label>
          Area sqm
          <Input type="number" value={value.areaSqm} onChange={(event) => onChange({ ...value, areaSqm: event.target.value })} />
        </label>
        <label>
          Latitude
          <Input type="number" step="0.000001" value={value.lat} onChange={(event) => onChange({ ...value, lat: event.target.value })} />
        </label>
        <label>
          Longitude
          <Input type="number" step="0.000001" value={value.lng} onChange={(event) => onChange({ ...value, lng: event.target.value })} />
        </label>
        <label>
          Open time
          <Input type="time" value={value.openTime} onChange={(event) => onChange({ ...value, openTime: event.target.value })} />
        </label>
        <label>
          Close time
          <Input type="time" value={value.closeTime} onChange={(event) => onChange({ ...value, closeTime: event.target.value })} />
        </label>
      </div>
    </div>
  );
}

export function GymBranchesPage() {
  const navigate = useNavigate();
  const gymId = window.location.pathname.match(/\/superadmin\/(?:branch-management|gyms)\/(\d+)(?:\/branches)?/)?.[1];
  const gyms = useApi<Gym[]>(gymsApi.getGyms, []);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [branchCount, setBranchCount] = useState(1);
  const [drafts, setDrafts] = useState<BranchDraft[]>([emptyDraft()]);

  useEffect(() => {
    if (gymId && Number.isFinite(Number(gymId))) {
      setSelectedGymId(gymId);
      return;
    }
    if (!selectedGymId && gyms.data?.[0]?.id) {
      setSelectedGymId(String(gyms.data[0].id));
    }
  }, [gymId, gyms.data, selectedGymId]);

  const selectedGym = useMemo(
    () => gyms.data?.find((gym) => gym.id === Number(selectedGymId)),
    [gyms.data, selectedGymId]
  );

  const branches = useApi<Branch[]>(
    () => (selectedGymId ? branchesApi.getBranches({ gymId: Number(selectedGymId) }) : Promise.resolve([])),
    [selectedGymId]
  );

  useEffect(() => {
    setBatchError("");
  }, [selectedGymId]);

  useEffect(() => {
    setDrafts((current) => {
      if (current.length === branchCount) return current;
      if (current.length > branchCount) return current.slice(0, branchCount);
      const next = [...current];
      while (next.length < branchCount) next.push(emptyDraft());
      return next;
    });
  }, [branchCount]);

  const actions: RowAction<Branch>[] = [
    {
      label: "Activate",
      hidden: (row) => row.isActive === true,
      onClick: async (row) => {
        await branchesApi.activateBranch(row);
        await branches.reload();
      }
    },
    {
      label: "Deactivate",
      variant: "danger",
      hidden: (row) => row.isActive === false,
      onClick: async (row) => {
        await branchesApi.deactivateBranch(row);
        await branches.reload();
      }
    }
  ];

  async function createMultipleBranches(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBatchError("");
    if (!selectedGymId) {
      setBatchError("Select a gym before creating branches.");
      return;
    }

    const nextDraftErrors = drafts.some((draft) => !draft.name.trim());
    if (nextDraftErrors) {
      setBatchError("Each branch needs a name before it can be created.");
      return;
    }

    setBatchSaving(true);
    try {
      for (const draft of drafts) {
        await branchesApi.createBranch({
          gymId: Number(selectedGymId),
          name: draft.name.trim(),
          address: draft.address.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          rangeKm: toNumber(draft.rangeKm),
          capacity: toNumber(draft.capacity),
          areaSqm: toNumber(draft.areaSqm),
          lat: toNumber(draft.lat) ?? 0,
          lng: toNumber(draft.lng) ?? 0,
          openTime: draft.openTime ? draft.openTime : undefined,
          closeTime: draft.closeTime ? draft.closeTime : undefined,
          isActive: draft.isActive
        });
      }
      await branches.reload();
      setBranchCount(1);
      setDrafts([emptyDraft()]);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : "Unable to create branches.");
    } finally {
      setBatchSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Branch Management"
        description="Manage branches separately from gym creation."
        action={<Button variant="secondary" onClick={() => navigate("/superadmin/gyms")}>Back to gyms</Button>}
      />

      <Card className="mb-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label>
            Selected gym
            <Select
              value={selectedGymId}
              onChange={(event) => setSelectedGymId(event.target.value)}
              disabled={gyms.loading}
            >
              <option value="">{gyms.loading ? "Loading gyms..." : "Select a gym"}</option>
              {gyms.data?.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="text-sm text-forge-muted">
            {selectedGym ? `Managing branches for ${selectedGym.name}` : "Choose a gym to load its branches."}
          </div>
        </div>
        {gyms.error ? <p className="text-sm text-red-600">{gyms.error}</p> : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <h2 className="text-lg font-bold text-slate-950">Create Multiple Branches</h2>
          <p className="mt-1 text-sm text-forge-muted">
            Enter a branch count. Use `1` for a single branch, or any higher number to create multiple branches for the selected gym.
          </p>
          <form className="mt-4 grid gap-4" onSubmit={createMultipleBranches}>
            <label className="max-w-xs">
              Branch count
              <Input
                type="number"
                min={1}
                value={branchCount}
                onChange={(event) => setBranchCount(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <div className="grid gap-3">
              {drafts.map((draft, index) => (
                <BranchDraftEditor
                  key={index}
                  index={index}
                  value={draft}
                  onChange={(next) => {
                    setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)));
                  }}
                />
              ))}
            </div>
            {batchError ? <p className="text-sm font-semibold text-red-600">{batchError}</p> : null}
            <Button disabled={batchSaving || branches.loading || gyms.loading}>{batchSaving ? "Saving..." : "Save branches"}</Button>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <DataTable
          title={`Branches${selectedGym ? ` - ${selectedGym.name}` : ""}`}
          rows={branches.data ?? []}
          columns={[
            { key: "name", label: "Branch" },
            { key: "address", label: "Address" },
            { key: "phone", label: "Phone" },
            { key: "capacity", label: "Capacity" },
            { key: "isActive", label: "Active", badge: true }
          ]}
          actions={actions}
        />
      </div>
    </>
  );
}
