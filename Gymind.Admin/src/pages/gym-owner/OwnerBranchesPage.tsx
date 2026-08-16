import { useNavigate } from "react-router-dom";
import { branchesApi } from "../../api/branchesApi";
import { dashboardApi } from "../../api/dashboardApi";
import { BranchForm } from "../../components/forms/BranchForm";
import { useApi } from "../../hooks/useApi";
import { EntityPage } from "../shared/EntityPage";
import type { Branch } from "../../types/branch";

export function OwnerBranchesPage() {
  const navigate = useNavigate();
  const { data: workspace, loading: workspaceLoading, error: workspaceError } = useApi(dashboardApi.getWorkspace, []);
  const gyms = workspace?.gyms ?? [];
  return (
    <EntityPage<Branch>
      title="Branches"
      loader={branchesApi.getBranches}
      createLabel="Create branch"
      columns={[
        { key: "name", label: "Branch" },
        { key: "address", label: "Address" },
        { key: "rangeKm", label: "Range KM" },
        { key: "capacity", label: "Capacity" },
        { key: "isActive", label: "Active", badge: true }
      ]}
      form={(close, reload, notify, notifyError) => (
        <BranchForm
          gyms={gyms}
          gymsLoading={workspaceLoading}
          gymLoadError={workspaceError}
          onSubmit={async (v) => {
            try {
              notify("");
              notifyError("");
              await branchesApi.createBranch(v);
              close();
              notify("Branch created successfully.");
              await reload();
            } catch (err) {
              notifyError(err instanceof Error ? err.message : "Unable to create branch.");
            }
          }}
        />
      )}
      editForm={(row, close, reload) => (
        <BranchForm
          gyms={gyms}
          gymsLoading={workspaceLoading}
          gymLoadError={workspaceError}
          initialValues={{
            gymId: row.gymId ?? undefined,
            name: row.name,
            address: row.address ?? undefined,
            phone: row.phone ?? undefined,
            rangeKm: row.rangeKm ?? undefined,
            capacity: row.capacity ?? undefined,
            areaSqm: row.areaSqm ?? undefined,
            lat: row.lat ?? undefined,
            lng: row.lng ?? undefined,
            openTime: row.openTime ?? undefined,
            closeTime: row.closeTime ?? undefined,
            isActive: row.isActive
          }}
          onSubmit={async (v) => {
            await branchesApi.updateBranch(row.id, v);
            close();
            await reload();
          }}
        />
      )}
      actions={[
        { label: "QR", onClick: (row) => navigate(`/branches/${row.id}/qr`) },
        { label: "Activate", onClick: branchesApi.activateBranch, hidden: (row) => row.isActive === true },
        { label: "Deactivate", variant: "danger", onClick: branchesApi.deactivateBranch, hidden: (row) => row.isActive === false }
      ]}
    />
  );
}
