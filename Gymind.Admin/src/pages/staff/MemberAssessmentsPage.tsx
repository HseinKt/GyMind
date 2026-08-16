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
import type { Member } from "../../types/member";
import { dateLabel } from "../../utils/formatters";

const pageSize = 10;

export function MemberAssessmentsPage() {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Member[]; totalCount: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

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
    membersApi.searchStaffMembers({ page, pageSize, status, search: query })
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
  }, [page, query, status]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  async function handleViewAssessment(member: Member) {
    setSelectedMember(member);
    setProfile(null);
    setProfileError("");
    setProfileLoading(true);
    try {
      const profileData = await membersApi.getMemberProfile(Number(member.id));
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
      setProfileError(err instanceof Error ? err.message : "Unable to load assessment details.");
    } finally {
      setProfileLoading(false);
    }
  }

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
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
      await membersApi.updateMemberAssessment(Number(selectedMember.id), payload);
      const updatedProfile = await membersApi.getMemberProfile(Number(selectedMember.id));
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
      <PageHeader title="Member Assessments" description="Manage, record, and track body measurements and fitness assessments." />
      
      <Card>
        <div className="grid gap-3 md:grid-cols-1">
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Membership Status
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
        </div>
      </Card>

      <DataTable
        title="Members Directory"
        rows={rows}
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status", badge: true },
          { key: "membershipEndDate", label: "Membership End", render: (row) => dateLabel(row.membershipEndDate) }
        ]}
        searchValue={query}
        onSearchChange={(value) => updateFilter(setQuery, value)}
        actions={[{ label: "Assessments", variant: "secondary", onClick: handleViewAssessment }]}
      />

      <PaginationControls page={page} totalPages={totalPages} totalCount={data?.totalCount ?? 0} pageSize={pageSize} onPageChange={setPage} />

      {profileLoading ? <LoadingState /> : null}
      {profileError ? <ErrorState message={profileError} /> : null}

      {selectedMember && profile ? (
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Assessment Details</h2>
              <p className="text-xs text-slate-500">Member: {selectedMember.name}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="primary" onClick={() => setAssessmentOpen(true)}>Update Assessment</Button>
              <Button type="button" variant="ghost" onClick={() => setSelectedMember(null)}>Close</Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-semibold">
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Height</dt><dd className="font-black text-slate-900 text-base">{profile.heightCm ? `${profile.heightCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Weight</dt><dd className="font-black text-slate-900 text-base">{profile.weightKg ? `${profile.weightKg} kg` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Body Fat</dt><dd className="font-black text-slate-900 text-base">{profile.bodyFatPercentage ? `${profile.bodyFatPercentage}%` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Blood Type</dt><dd className="font-black text-slate-900 text-base">{profile.bloodType ?? "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Waist</dt><dd className="font-black text-slate-900 text-base">{profile.waistCm ? `${profile.waistCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Chest</dt><dd className="font-black text-slate-900 text-base">{profile.chestCm ? `${profile.chestCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Shoulders</dt><dd className="font-black text-slate-900 text-base">{profile.shoulderCm ? `${profile.shoulderCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Hips</dt><dd className="font-black text-slate-900 text-base">{profile.hipCm ? `${profile.hipCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Neck</dt><dd className="font-black text-slate-900 text-base">{profile.neckCm ? `${profile.neckCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Arms</dt><dd className="font-black text-slate-900 text-base">{profile.armCm ? `${profile.armCm} cm` : "Not set"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4 col-span-2"><dt className="text-slate-500 font-bold text-xs uppercase mb-1">Thighs</dt><dd className="font-black text-slate-900 text-base">{profile.thighCm ? `${profile.thighCm} cm` : "Not set"}</dd></div>
          </dl>
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
