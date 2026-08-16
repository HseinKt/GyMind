import { useMemo, useState } from "react";
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
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import type { Branch } from "../../types/branch";
import type { Member } from "../../types/member";

const allBranches = "all";
const allStatuses = "all";

function loadMembersContext() {
  return Promise.all([membersApi.getMembers(), branchesApi.getBranches()])
    .then(([members, branches]) => ({ members, branches }));
}

function memberStatus(member: Member) {
  return member.status?.trim() || (member.isActive ? "ACTIVE" : "INACTIVE");
}

export function OwnerMembersPage() {
  const { data, loading, error, reload } = useApi(loadMembersContext, []);
  const [branchId, setBranchId] = useState(allBranches);
  const [status, setStatus] = useState(allStatuses);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [details, setDetails] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<{ member: Member; active: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const branches = data?.branches ?? [];
  const members = data?.members ?? [];
  const statuses = useMemo(() => Array.from(new Set(members.map(memberStatus).filter(Boolean))).sort(), [members]);
  const filtered = useMemo(() => members.filter((member) => {
    const memberBranchId = member.branchId ?? member.homeBranchId;
    const branchMatches = branchId === allBranches || String(memberBranchId ?? "") === branchId;
    const statusMatches = status === allStatuses || memberStatus(member) === status;
    return branchMatches && statusMatches;
  }), [branchId, members, status]);

  async function saveMember(values: Partial<Member>, close: () => void) {
    await membersApi.createMember(values);
    close();
    setNotice("Member saved successfully.");
    await reload();
  }

  async function updateMember(member: Member, values: Partial<Member>) {
    await membersApi.updateMember(member.id, values);
    setEditing(null);
    setNotice("Member updated successfully.");
    await reload();
  }

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
      <PageHeader title="Members" />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <DataTable
        title="Members"
        rows={filtered}
        createLabel="Create member"
        onCreate={() => setOpen(true)}
        toolbar={(
          <>
            <Select className="min-w-40" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value={allBranches}>All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
            <Select className="min-w-36" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value={allStatuses}>All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </>
        )}
        columns={[
          { key: "name", label: "Name", render: (row) => row.name ?? row.fullName ?? "Not assigned" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "branchName", label: "Branch", render: (row) => row.branchName || branchMap.get(Number(row.branchId ?? row.homeBranchId))?.name || "Not assigned" },
          { key: "status", label: "Status", badge: true, render: memberStatus }
        ]}
        actions={[
          { label: "View", variant: "secondary", onClick: setDetails },
          { label: "Edit", variant: "secondary", onClick: setEditing },
          { label: "Activate", onClick: (row) => setConfirm({ member: row, active: true }), className: "!bg-emerald-600 !text-white hover:!bg-emerald-700", hidden: (row) => row.isActive === true || memberStatus(row) === "ACTIVE" },
          { label: "Deactivate", variant: "danger", onClick: (row) => setConfirm({ member: row, active: false }), hidden: (row) => row.isActive === false || memberStatus(row) === "INACTIVE" }
        ]}
        actionButtonClassName="!h-9 !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
      />
      <Modal open={open} title="Create member" onClose={() => setOpen(false)}>
        <MemberForm branches={branches} requirePassword onSubmit={(values) => saveMember(values, () => setOpen(false))} />
      </Modal>
      <Modal open={Boolean(editing)} title="Edit member" onClose={() => setEditing(null)}>
        {editing ? (
          <MemberForm
            branches={branches}
            initialValues={{ fullName: editing.name ?? editing.fullName, email: editing.email, phone: editing.phone, gender: editing.gender, dob: editing.dob, homeBranchId: editing.branchId ?? editing.homeBranchId ?? undefined }}
            onSubmit={(values) => updateMember(editing, values)}
          />
        ) : null}
      </Modal>
      <Modal open={Boolean(details)} title="Member details" onClose={() => setDetails(null)}>
        {details?.id ? <MemberPersonalInfoPanel memberId={Number(details.id)} /> : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.active ? "Activate member" : "Deactivate member"}
        message={`Confirm ${confirm?.active ? "activation" : "deactivation"} for ${confirm?.member.name ?? confirm?.member.fullName ?? "this member"}?`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm ? setMemberActive(confirm.member, confirm.active) : undefined}
      />
    </>
  );
}
