import { useEffect, useState } from "react";
import { membersApi } from "../../api/membersApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import type { Member, StaffMemberDetails } from "../../types/member";
import { dateLabel, money } from "../../utils/formatters";

const pageSize = 10;

export function MemberSearchPage() {
  const [status, setStatus] = useState("");
  const [attendance, setAttendance] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Member[]; totalCount: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<StaffMemberDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Assessment & stats states
  const [profile, setProfile] = useState<any | null>(null);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    heightCm: "",
    weightKg: "",
    bodyFatPercentage: "",
    waistCm: "",
    chestCm: "",
    shoulderCm: "",
    hipCm: "",
    neckCm: "",
    armCm: "",
    thighCm: "",
    bloodType: ""
  });
  const [assessmentSaving, setAssessmentSaving] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    membersApi.searchStaffMembers({ page, pageSize, status, attendance, search: query })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attendance, page, query, status]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  async function openDetails(member: Member) {
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    setProfile(null);
    try {
      const [detailsData, profileData] = await Promise.all([
        membersApi.getStaffMemberDetails(Number(member.id)),
        membersApi.getMemberProfile(Number(member.id))
      ]);
      setDetails(detailsData);
      setProfile(profileData);
      setAssessmentForm({
        heightCm: String(profileData.heightCm ?? ""),
        weightKg: String(profileData.weightKg ?? ""),
        bodyFatPercentage: String(profileData.bodyFatPercentage ?? ""),
        waistCm: String(profileData.waistCm ?? ""),
        chestCm: String(profileData.chestCm ?? ""),
        shoulderCm: String(profileData.shoulderCm ?? ""),
        hipCm: String(profileData.hipCm ?? ""),
        neckCm: String(profileData.neckCm ?? ""),
        armCm: String(profileData.armCm ?? ""),
        thighCm: String(profileData.thighCm ?? ""),
        bloodType: profileData.bloodType ?? ""
      });
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Unable to load member details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;
    setAssessmentSaving(true);
    setAssessmentError("");
    try {
      const payload = {
        heightCm: assessmentForm.heightCm ? Number(assessmentForm.heightCm) : null,
        weightKg: assessmentForm.weightKg ? Number(assessmentForm.weightKg) : null,
        bodyFatPercentage: assessmentForm.bodyFatPercentage ? Number(assessmentForm.bodyFatPercentage) : null,
        waistCm: assessmentForm.waistCm ? Number(assessmentForm.waistCm) : null,
        chestCm: assessmentForm.chestCm ? Number(assessmentForm.chestCm) : null,
        shoulderCm: assessmentForm.shoulderCm ? Number(assessmentForm.shoulderCm) : null,
        hipCm: assessmentForm.hipCm ? Number(assessmentForm.hipCm) : null,
        neckCm: assessmentForm.neckCm ? Number(assessmentForm.neckCm) : null,
        armCm: assessmentForm.armCm ? Number(assessmentForm.armCm) : null,
        thighCm: assessmentForm.thighCm ? Number(assessmentForm.thighCm) : null,
        bloodType: assessmentForm.bloodType || null
      };
      await membersApi.updateMemberAssessment(Number(details.id), payload);
      const updatedProfile = await membersApi.getMemberProfile(Number(details.id));
      setProfile(updatedProfile);
      setAssessmentOpen(false);
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : "Failed to save assessment.");
    } finally {
      setAssessmentSaving(false);
    }
  };

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <PageHeader title="Member Search" description="Search and filter branch members from the backend." />
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Status
            <Select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="FROZEN">Frozen</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Attendance
            <Select value={attendance} onChange={(event) => updateFilter(setAttendance, event.target.value)}>
              <option value="">All</option>
              <option value="CurrentlyCheckedIn">Currently checked in</option>
              <option value="CheckedInToday">Checked in today</option>
              <option value="NotCheckedInToday">Not checked in today</option>
            </Select>
          </label>
        </div>
      </Card>
      <DataTable
        title="Member Search"
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "planId", label: "Plan" },
          { key: "status", label: "Status", badge: true },
          { key: "membershipEndDate", label: "Expiry", render: (row) => dateLabel(row.membershipEndDate) },
          { key: "paymentStatus", label: "Payment", badge: true },
          { key: "lastCheckIn", label: "Last check-in", render: (row) => dateLabel(row.lastCheckIn) }
        ]}
        searchValue={query}
        onSearchChange={(value) => updateFilter(setQuery, value)}
        actions={[{ label: "View Details", variant: "secondary", onClick: openDetails }]}
      />
      <PaginationControls page={page} totalPages={totalPages} totalCount={data?.totalCount ?? 0} pageSize={pageSize} onPageChange={setPage} />
      {detailsLoading ? <LoadingState /> : null}
      {detailsError ? <ErrorState message={detailsError} /> : null}
      {details ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Member details</h2>
            <Button type="button" variant="ghost" onClick={() => setDetails(null)}>Close</Button>
          </div>
          <div className="grid gap-3 text-sm font-semibold text-slate-700 md:grid-cols-3">
            <span>Name: {details.fullName || details.name || "No data"}</span>
            <span>Phone: {details.phone || "No data"}</span>
            <span>Email: {details.email || "No data"}</span>
            <span>Branch: {details.branchName || "Not assigned"}</span>
            <span>Plan: {details.planId || "Not assigned"}</span>
            <span>Status: {details.status || "No data"}</span>
            <span>Start: {dateLabel(details.membershipStartDate)}</span>
            <span>End: {dateLabel(details.membershipEndDate)}</span>
            <span>Total paid: {money(details.totalPaid ?? 0)}</span>
            <span>Last payment: {money(details.lastPaymentAmount ?? 0)}</span>
            <span>Last payment date: {dateLabel(details.lastPaymentAt)}</span>
            <span>Last check-in: {dateLabel(details.lastCheckIn)}</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
            {/* Fitness Assessment Card */}
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <h3 className="text-base font-black text-slate-900">Fitness Assessment</h3>
                <button 
                  onClick={() => setAssessmentOpen(true)}
                  className="text-xs font-black text-orange-600 hover:underline"
                >
                  Update
                </button>
              </div>
              {profile ? (
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Height</dt><dd className="font-bold text-slate-800">{profile.heightCm ? `${profile.heightCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Weight</dt><dd className="font-bold text-slate-800">{profile.weightKg ? `${profile.weightKg} kg` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Body Fat</dt><dd className="font-bold text-slate-800">{profile.bodyFatPercentage ? `${profile.bodyFatPercentage}%` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Blood Type</dt><dd className="font-bold text-slate-800">{profile.bloodType ?? "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Waist</dt><dd className="font-bold text-slate-800">{profile.waistCm ? `${profile.waistCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Chest</dt><dd className="font-bold text-slate-800">{profile.chestCm ? `${profile.chestCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Shoulders</dt><dd className="font-bold text-slate-800">{profile.shoulderCm ? `${profile.shoulderCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Hips</dt><dd className="font-bold text-slate-800">{profile.hipCm ? `${profile.hipCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Neck</dt><dd className="font-bold text-slate-800">{profile.neckCm ? `${profile.neckCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2"><dt className="text-slate-500 font-semibold">Arms</dt><dd className="font-bold text-slate-800">{profile.armCm ? `${profile.armCm} cm` : "Not set"}</dd></div>
                  <div className="rounded bg-slate-50 p-2 col-span-2"><dt className="text-slate-500 font-semibold">Thighs</dt><dd className="font-bold text-slate-800">{profile.thighCm ? `${profile.thighCm} cm` : "Not set"}</dd></div>
                </dl>
              ) : (
                <p className="text-xs text-slate-500">No assessment data loaded.</p>
              )}
            </Card>

            <div className="space-y-4">
              <DataTable
                title="Recent Payments"
                rows={details.recentPayments ?? []}
                columns={[
                  { key: "amount", label: "Amount", render: (row) => money(row.amountValue ?? row.amount ?? 0) },
                  { key: "method", label: "Method" },
                  { key: "paymentType", label: "Type" },
                  { key: "paidAt", label: "Date", render: (row) => dateLabel(row.paidAt ?? row.at) }
                ]}
              />
              <DataTable
                title="Recent Check-ins"
                rows={details.recentCheckIns ?? []}
                columns={[
                  { key: "status", label: "Status", badge: true },
                  { key: "checkInTime", label: "In", render: (row) => dateLabel(row.checkInTime ?? row.at) },
                  { key: "checkOutTime", label: "Out", render: (row) => dateLabel(row.checkOutTime) },
                  { key: "source", label: "Source" }
                ]}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Assessment Modal */}
      <Modal open={assessmentOpen} title="Record Fitness Assessment & Measurements" onClose={() => setAssessmentOpen(false)}>
        <form onSubmit={handleSaveAssessment} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Height (cm)
            <Input type="number" step="0.1" value={assessmentForm.heightCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, heightCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Weight (kg)
            <Input type="number" step="0.1" value={assessmentForm.weightKg} onChange={(e) => setAssessmentForm({ ...assessmentForm, weightKg: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Body Fat Percentage (%)
            <Input type="number" step="0.1" value={assessmentForm.bodyFatPercentage} onChange={(e) => setAssessmentForm({ ...assessmentForm, bodyFatPercentage: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Blood Type
            <Input placeholder="e.g. O+, A-" value={assessmentForm.bloodType} onChange={(e) => setAssessmentForm({ ...assessmentForm, bloodType: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Waist Circumference (cm)
            <Input type="number" step="0.1" value={assessmentForm.waistCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, waistCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Chest (cm)
            <Input type="number" step="0.1" value={assessmentForm.chestCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, chestCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Shoulders (cm)
            <Input type="number" step="0.1" value={assessmentForm.shoulderCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, shoulderCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Hips (cm)
            <Input type="number" step="0.1" value={assessmentForm.hipCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, hipCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Neck (cm)
            <Input type="number" step="0.1" value={assessmentForm.neckCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, neckCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Arm (cm)
            <Input type="number" step="0.1" value={assessmentForm.armCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, armCm: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800 md:col-span-2">
            Thigh (cm)
            <Input type="number" step="0.1" value={assessmentForm.thighCm} onChange={(e) => setAssessmentForm({ ...assessmentForm, thighCm: e.target.value })} />
          </label>
          {assessmentError ? <div className="md:col-span-2"><ErrorState message={assessmentError} /></div> : null}
          <div className="md:col-span-2 flex justify-end gap-2 mt-3">
            <Button type="button" onClick={() => setAssessmentOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={assessmentSaving}>{assessmentSaving ? "Saving..." : "Save Assessment"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
