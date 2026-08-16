import { dashboardApi } from "../../api/dashboardApi";
import { membershipPlansApi } from "../../api/membershipPlansApi";
import { MembershipPlanForm } from "../../components/forms/MembershipPlanForm";
import { useApi } from "../../hooks/useApi";
import { EntityPage } from "../shared/EntityPage";
import type { MembershipPlan } from "../../types/membership";
import { membershipPlanAccessTypeLabel } from "../../utils/membershipPlanAccessTypes";

export function OwnerMembershipPlansPage() {
  const { data: workspace } = useApi(dashboardApi.getWorkspace, []);
  const gyms = workspace?.gyms ?? [];

  return (
    <EntityPage<MembershipPlan>
      title="Membership Plans"
      loader={membershipPlansApi.getPlans}
      createLabel="Create plan"
      columns={[
        { key: "name", label: "Plan" },
        { key: "price", label: "Price" },
        { key: "durationMonth", label: "Months" },
        { key: "accessType", label: "Access", render: (row) => membershipPlanAccessTypeLabel(row.accessType) },
        { key: "branches", label: "Branches", render: (row) => row.branches?.map((branch) => branch.name).join(", ") || (row.accessType === "full-access" ? "All branches" : "No branches") },
        { key: "isActive", label: "Active", badge: true }
      ]}
      form={(close, reload, notify, notifyError) => (
        <MembershipPlanForm
          gyms={gyms}
          onSubmit={async (values) => {
            try {
              notify("");
              notifyError("");
              console.info("Membership plan create payload", values);
              await membershipPlansApi.createPlan(values);
              close();
              notify("Membership plan created successfully.");
              await reload();
            } catch (err) {
              notifyError(err instanceof Error ? err.message : "Unable to create membership plan.");
            }
          }}
        />
      )}
      editForm={(row, close, reload, notify, notifyError, updateRow, refresh) => (
        <MembershipPlanForm
          gyms={gyms}
          initialValues={{
            gymId: row.gymId ?? undefined,
            name: row.name,
            price: row.price ?? undefined,
            durationMonth: row.durationMonth ?? row.durationMonths ?? undefined,
            accessType: row.accessType ?? undefined,
            includesClasses: row.includesClasses,
            includesPt: row.includesPt,
            isActive: row.isActive,
            branchIds: row.branchIds
          }}
          onSubmit={async (values) => {
            try {
              notify("");
              notifyError("");
              console.info("Membership plan update payload", values);
              const updated = await membershipPlansApi.updatePlan(row.id, values);
              updateRow(updated);
              close();
              notify("Membership plan updated successfully.");
              await refresh();
            } catch (err) {
              notifyError(err instanceof Error ? err.message : "Unable to update membership plan.");
            }
          }}
        />
      )}
      actions={[
        { label: "Activate", onClick: membershipPlansApi.activatePlan, hidden: (row) => row.isActive === true },
        { label: "Deactivate", variant: "danger", onClick: membershipPlansApi.deactivatePlan, hidden: (row) => row.isActive === false }
      ]}
      detailRenderer={(row) => (
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Plan</dt><dd className="mt-1 font-semibold text-slate-900">{row.name}</dd></div>
          <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Access</dt><dd className="mt-1 font-semibold text-slate-900">{membershipPlanAccessTypeLabel(row.accessType)}</dd></div>
          <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Branches</dt><dd className="mt-1 font-semibold text-slate-900">{row.branches?.map((branch) => branch.name).join(", ") || (row.accessType === "full-access" ? "All branches" : "No branches")}</dd></div>
          <div className="rounded-xl border border-forge-border bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-forge-muted">Active</dt><dd className="mt-1 font-semibold text-slate-900">{row.isActive ? "Yes" : "No"}</dd></div>
        </dl>
      )}
    />
  );
}
