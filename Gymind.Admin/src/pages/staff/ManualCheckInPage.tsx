import { useMemo, useState } from "react";
import { checkInsApi } from "../../api/checkInsApi";
import { dashboardApi } from "../../api/dashboardApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";
import { cleanLabel, dateLabel } from "../../utils/formatters";

function matchesSearch(row: Record<string, unknown>, query: string) {
  if (!query.trim()) return true;
  const haystack = Object.values(row).join(" ").toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function ManualCheckInPage() {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const checkIns = useApi(checkInsApi.getActiveCheckIns, []);
  const [memberId, setMemberId] = useState("");
  const [checkOutId, setCheckOutId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [checkOutSearch, setCheckOutSearch] = useState("");
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [savingCheckOut, setSavingCheckOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const members = workspace.data?.members ?? [];
  const filteredMembers = useMemo(
    () => members.filter((member) => matchesSearch({
      name: member.name ?? member.fullName,
      phone: member.phone,
      email: member.email,
      id: member.id
    }, memberSearch)),
    [members, memberSearch]
  );
  const activeCheckIns = useMemo(
    () => (checkIns.data ?? []).filter((item) => !item.checkOutTime),
    [checkIns.data]
  );
  const filteredActiveCheckIns = useMemo(
    () => activeCheckIns.filter((item) => matchesSearch({
      memberName: item.memberName,
      branchName: item.branchName,
      id: item.memberId,
      checkIn: item.checkInTime
    }, checkOutSearch)),
    [activeCheckIns, checkOutSearch]
  );

  async function submitCheckIn(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingCheckIn(true);
    try {
      await checkInsApi.manualCheckIn(Number(memberId));
      setMessage("Manual check-in saved.");
      setMemberId("");
      await Promise.all([workspace.reload(), checkIns.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual check-in failed.");
    } finally {
      setSavingCheckIn(false);
    }
  }

  async function submitCheckOut(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingCheckOut(true);
    try {
      await checkInsApi.manualCheckOut(Number(checkOutId));
      setMessage("Manual check-out saved.");
      setCheckOutId("");
      await Promise.all([workspace.reload(), checkIns.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual check-out failed.");
    } finally {
      setSavingCheckOut(false);
    }
  }

  if (workspace.loading || checkIns.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <PageHeader title="Check-in / Check-out" description="Manual attendance for your assigned branch." />
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {checkIns.error ? <ErrorState message={checkIns.error} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {message ? <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <form onSubmit={submitCheckIn} className="grid gap-4">
            <h2 className="text-lg font-bold text-slate-950">Manual Check-In</h2>
            <label className="grid gap-1 text-sm font-bold text-slate-800">
              Search members
              <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Name, phone, email, member number" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">
              Member
              <Select required value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                <option value="">Select member</option>
                {filteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {cleanLabel(member.name ?? member.fullName, "Member")} {member.phone ? `- ${member.phone}` : ""} {member.email ? `- ${member.email}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            <Button disabled={savingCheckIn}>{savingCheckIn ? "Checking in..." : "Manual check-in"}</Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={submitCheckOut} className="grid gap-4">
            <h2 className="text-lg font-bold text-slate-950">Manual Check-Out</h2>
            <label className="grid gap-1 text-sm font-bold text-slate-800">
              Search active check-ins
              <Input value={checkOutSearch} onChange={(event) => setCheckOutSearch(event.target.value)} placeholder="Name, branch, member number" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-800">
              Active check-in
              <Select required value={checkOutId} onChange={(event) => setCheckOutId(event.target.value)}>
                <option value="">Select open session</option>
                {filteredActiveCheckIns.map((item) => (
                  <option key={item.id} value={item.id}>
                    {cleanLabel(item.memberName, "Member")} - checked in {dateLabel(item.checkInTime)}
                  </option>
                ))}
              </Select>
            </label>
            <Button disabled={savingCheckOut}>{savingCheckOut ? "Checking out..." : "Manual check-out"}</Button>
          </form>
        </Card>
      </div>

      <DataTable
        title="Currently Checked In"
        rows={activeCheckIns.slice(0, 25)}
        columns={[
          { key: "memberName", label: "Member" },
          { key: "branchName", label: "Branch" },
          { key: "checkInTime", label: "Check-in", render: (row) => dateLabel(row.checkInTime) },
          { key: "source", label: "Source" },
          { key: "status", label: "Status", badge: true }
        ]}
        actions={[
          {
            label: "Check out",
            variant: "secondary",
            onClick: (row) => setCheckOutId(String(row.id))
          }
        ]}
      />
    </div>
  );
}
