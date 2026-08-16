import { useState } from "react";
import { branchesApi } from "../../api/branchesApi";
import { membersApi } from "../../api/membersApi";
import { MemberForm } from "../../components/forms/MemberForm";
import { MemberPersonalInfoPanel } from "../../components/members/MemberPersonalInfoPanel";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { Branch } from "../../types/branch";
import type { Member } from "../../types/member";

const allStatuses = "all";
const pageSize = 10;
const statusOptions = ["ACTIVE", "INACTIVE", "PENDING", "EXPIRED", "FROZEN", "CANCELLED"];

function loadMembersContext(page: number, status: string) {
  return Promise.all([
    membersApi.getMembersPage({ page, pageSize, status: status === allStatuses ? undefined : status }),
    branchesApi.getBranches()
  ])
    .then(([members, branches]) => ({ members, branches }));
}

function memberStatus(member: Member) {
  if (member.isActive === false) return "INACTIVE";
  return member.status?.trim() || (member.isActive ? "ACTIVE" : "INACTIVE");
}

export function BranchMembersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(allStatuses);
  const { data, loading, error, reload } = useApi(() => loadMembersContext(page, status), [page, status]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [details, setDetails] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<{ member: Member; active: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const branches = data?.branches ?? [];
  const members = data?.members.items ?? [];

  async function setMemberActive(member: Member, active: boolean) {
    setActionError("");
    try {
      if (active) await membersApi.activateMember(member);
      else await membersApi.deactivateMember(member);
      setConfirm(null);
      setNotice(active ? "Member activated." : "Member deactivated.");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update member status.");
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const branchMap = new Map<number, Branch>(branches.map((branch) => [branch.id, branch]));

  return (
    <>
      <PageHeader title="Branch Members" description="Create, view, edit, activate, and deactivate members in your assigned branch." />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <DataTable
        title="Members"
        rows={members}
        createLabel="Create member"
        onCreate={() => setOpen(true)}
        toolbar={(
          <Select className="min-w-36" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value={allStatuses}>All statuses</option>
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        )}
        columns={[
          { key: "name", label: "Name", render: (row) => row.name ?? row.fullName ?? "Not assigned" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "branchName", label: "Branch", render: (row) => row.branchName || branchMap.get(Number(row.branchId ?? row.homeBranchId))?.name || "Assigned branch" },
          { key: "status", label: "Status", badge: true, render: memberStatus },
          { key: "paymentStatus", label: "Payment", badge: true }
        ]}
        actions={[
          { label: "View", variant: "secondary", onClick: setDetails },
          { label: "Edit", variant: "secondary", onClick: setEditing },
          { label: "Reactivate", onClick: (row) => setConfirm({ member: row, active: true }), className: "!bg-emerald-600 !text-white hover:!bg-emerald-700", hidden: (row) => row.isActive !== false },
          { label: "Deactivate", variant: "danger", onClick: (row) => setConfirm({ member: row, active: false }), hidden: (row) => row.isActive === false }
        ]}
        actionButtonClassName="!h-9 !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
      />
      <PaginationControls
        page={data?.members.page ?? page}
        totalPages={data?.members.totalPages ?? 1}
        totalCount={data?.members.totalCount}
        pageSize={data?.members.pageSize ?? pageSize}
        onPageChange={setPage}
      />
      <Modal open={open} title="Create member" onClose={() => setOpen(false)}>
        <MemberForm branches={branches} onSubmit={async (values) => {
          try {
            setActionError("");
            await membersApi.createMember(values);
            setOpen(false);
            setNotice("Member saved successfully.");
            setPage(1);
            await reload();
          } catch (err) {
            setActionError(err instanceof Error ? err.message : "Unable to save member.");
          }
        }} requirePassword />
      </Modal>
      <Modal open={Boolean(editing)} title="Edit member" onClose={() => setEditing(null)}>
        {editing ? (
          <MemberForm
            branches={branches}
            initialValues={{ fullName: editing.name ?? editing.fullName, email: editing.email, phone: editing.phone, gender: editing.gender, dob: editing.dob, homeBranchId: editing.branchId ?? editing.homeBranchId ?? undefined }}
            onSubmit={async (values) => {
              await membersApi.updateMember(editing.id, values);
              setEditing(null);
              setNotice("Member updated successfully.");
              await reload();
            }}
          />
        ) : null}
      </Modal>
      <Modal open={Boolean(details)} title="Member details" onClose={() => setDetails(null)}>
        {details?.id ? <MemberPersonalInfoPanel memberId={Number(details.id)} /> : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.active ? "Reactivate member" : "Deactivate member"}
        message={`Confirm ${confirm?.active ? "reactivation" : "deactivation"} for ${confirm?.member.name ?? confirm?.member.fullName ?? "this member"}?`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm ? setMemberActive(confirm.member, confirm.active) : undefined}
      />
    </>
  );
}
