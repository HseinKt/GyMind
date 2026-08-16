import { useMemo, useRef, useState } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation } from "react-router-dom";
import { branchesApi } from "../../api/branchesApi";
import { gymsApi } from "../../api/gymsApi";
import { qrApi } from "../../api/qrApi";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useApi } from "../../hooks/useApi";

export function BranchQrPage() {
  const location = useLocation();
  const { session } = useAuth();
  const printableRef = useRef<HTMLDivElement>(null);
  const routeBranchId = location.pathname.match(/\/branches\/(\d+)\/qr/)?.[1];
  const isSuperAdmin = session?.user.role === "SuperAdmin";
  const canSelectBranch = session?.user.role === "SuperAdmin" || session?.user.role === "GymOwner";
  const [selectedGymId, setSelectedGymId] = useState<number | null>(null);
  const gyms = useApi(() => isSuperAdmin ? gymsApi.getGyms() : Promise.resolve([]), [isSuperAdmin]);
  const branches = useApi(() => {
    if (!canSelectBranch) return Promise.resolve([]);
    if (isSuperAdmin && !selectedGymId) return Promise.resolve([]);
    return branchesApi.getBranches(isSuperAdmin ? { gymId: selectedGymId } : undefined);
  }, [canSelectBranch, isSuperAdmin, selectedGymId]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const firstBranchId = !isSuperAdmin ? branches.data?.[0]?.id : undefined;
  const resolvedBranchId = Number(routeBranchId ?? selectedBranchId ?? session?.user.branchId ?? firstBranchId);
  const canRegenerate = ["SuperAdmin", "GymOwner", "BranchManager"].includes(session?.user.role ?? "");
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [notice, setNotice] = useState("");
  const qr = useApi(() => Number.isFinite(resolvedBranchId) && resolvedBranchId > 0 ? qrApi.getBranchQr(resolvedBranchId) : Promise.resolve(null), [resolvedBranchId]);
  const selectedGymBranches = useMemo(() => branches.data ?? [], [branches.data]);

  async function regenerate() {
    await qrApi.regenerateBranchQr(resolvedBranchId);
    setConfirmRegenerate(false);
    setNotice("Branch QR regenerated. Replace the printed QR inside the branch.");
    await qr.reload();
  }

  function printQr() {
    window.print();
  }

  function downloadPng() {
    const node = printableRef.current;
    if (!node || !qr.data) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    };

    ctx.fillStyle = "#F8F3EC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111111";
    roundedRect(80, 80, 1040, 1440, 44);
    ctx.fill();

    ctx.fillStyle = "#FC6A0A";
    roundedRect(80, 80, 1040, 190, 44);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.fillRect(80, 220, 1040, 50);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 54px Arial";
    ctx.fillText("Gymind", 140, 165);
    ctx.font = "700 24px Arial";
    ctx.fillText("SECURE MEMBER CHECK-IN", 142, 210);

    ctx.fillStyle = "#F8F3EC";
    ctx.font = "900 68px Arial";
    ctx.fillText("Scan to check in", 140, 390);
    ctx.fillStyle = "#C9B8A8";
    ctx.font = "700 32px Arial";
    ctx.fillText(qr.data.branchName, 140, 445);

    ctx.fillStyle = "#FFFFFF";
    roundedRect(240, 530, 720, 720, 34);
    ctx.fill();
    const qrCanvas = node.querySelector("canvas");
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, 300, 590, 600, 600);
    }

    ctx.fillStyle = "#FC6A0A";
    roundedRect(150, 1305, 900, 82, 18);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 30px Arial";
    ctx.fillText("Open Gymind Mobile > Check In > Scan QR", 210, 1357);

    ctx.fillStyle = "#C9B8A8";
    ctx.font = "700 22px Arial";
    ctx.fillText(`Branch #${qr.data.branchId} - ${qr.data.isActive ? "Active" : "Inactive"}`, 140, 1460);
    ctx.fillText("Keep this placard visible at the branch entrance.", 140, 1500);

    const link = document.createElement("a");
    link.download = `gymind-${qr.data.branchName.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (gyms.loading || branches.loading) return <LoadingState />;
  if (gyms.error) return <ErrorState message={gyms.error} />;
  if (branches.error) return <ErrorState message={branches.error} />;

  const filters = canSelectBranch ? (
    <Card className="no-print mb-4 max-w-3xl">
      <div className="grid gap-3 md:grid-cols-2">
        {isSuperAdmin ? (
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Gym
            <Select value={selectedGymId ?? ""} onChange={(event) => {
              setSelectedGymId(event.target.value ? Number(event.target.value) : null);
              setSelectedBranchId(null);
            }}>
              <option value="">Select a gym</option>
              {gyms.data?.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}
            </Select>
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Branch
          <Select
            value={Number.isFinite(resolvedBranchId) && resolvedBranchId > 0 ? resolvedBranchId : ""}
            disabled={isSuperAdmin && !selectedGymId}
            onChange={(event) => setSelectedBranchId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">{isSuperAdmin && !selectedGymId ? "Select a gym first" : "Select a branch"}</option>
            {selectedGymBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name} #{branch.id}</option>
            ))}
          </Select>
        </label>
      </div>
    </Card>
  ) : null;

  if (!Number.isFinite(resolvedBranchId) || resolvedBranchId <= 0) {
    return (
      <>
        <div className="no-print">
          <PageHeader
            title="Branch QR Codes"
            description="Static branch QR for member check-in. Regenerate only if the printed QR is compromised."
          />
        </div>
        {filters}
        <EmptyState title={isSuperAdmin ? "Select a gym and branch" : "No branch selected"} message={isSuperAdmin ? "Choose a gym first, then select one of its branches to view the QR code." : "No branch is assigned to this user."} />
      </>
    );
  }

  if (qr.loading) return <LoadingState />;
  if (qr.error) return <ErrorState message={qr.error} />;
  if (!qr.data) return <ErrorState message="Branch QR is not available." />;

  return (
    <>
      <div className="no-print">
        <PageHeader
        title="Branch QR Codes"
        description="Static branch QR for member check-in. Regenerate only if the printed QR is compromised."
        />
      </div>
      {notice ? <div className="no-print mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{notice}</div> : null}
      {filters}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="no-print qr-web-preview bg-white">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-5 px-4 py-6 text-center">
            <div className="w-full max-w-[380px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
              <QRCodeCanvas value={qr.data.qrPayload} size={340} level="H" includeMargin />
            </div>
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-forge-primary">Branch check-in QR</p>
              <h2 className="mt-2 break-words text-3xl font-black leading-tight tracking-normal text-slate-950">{qr.data.branchName}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Live QR for member check-in. Print or download uses the A4 entrance placard.
              </p>
            </div>
            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-forge-border bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-forge-muted">Branch</p>
                <p className="mt-1 text-xl font-black text-slate-950">#{qr.data.branchId}</p>
              </div>
              <div className="rounded-xl border border-forge-border bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-forge-muted">Status</p>
                <p className={qr.data.isActive ? "mt-1 text-xl font-black text-emerald-600" : "mt-1 text-xl font-black text-red-600"}>
                  {qr.data.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="rounded-xl border border-forge-border bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-forge-muted">Use</p>
                <p className="mt-1 text-xl font-black text-slate-950">Entry</p>
              </div>
            </div>
          </div>
        </Card>

        <div ref={printableRef} className="print-card qr-placard min-h-[860px] max-w-[620px] bg-[#111111] text-[#f8f3ec] shadow-2xl">
            <div className="bg-forge-primary px-9 py-8 text-black">
              <p className="text-sm font-black uppercase tracking-[0.28em]">Gymind</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.22em]">Secure member check-in</p>
            </div>
            <div className="px-9 py-10">
              <div className="mb-8">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-forge-primary">Branch access point</p>
                <h2 className="mt-3 text-5xl font-black leading-tight tracking-normal text-white">{qr.data.branchName}</h2>
                <p className="mt-4 max-w-md text-xl font-bold text-[#c9b8a8]">Scan to check in with the Gymind mobile app.</p>
              </div>
              <div className="mx-auto max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <QRCodeCanvas value={qr.data.qrPayload} size={380} level="H" includeMargin />
              </div>
              <div className="mt-9 rounded-2xl bg-forge-primary px-6 py-5 text-center text-black">
                <p className="text-lg font-black">Open Gymind Mobile</p>
                <p className="mt-1 text-sm font-black uppercase tracking-[0.16em]">Check In &gt; Scan QR</p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c9b8a8]">Branch ID</p>
                  <p className="mt-1 text-2xl font-black text-white">#{qr.data.branchId}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c9b8a8]">Status</p>
                  <p className={qr.data.isActive ? "mt-1 text-2xl font-black text-emerald-300" : "mt-1 text-2xl font-black text-red-300"}>
                    {qr.data.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <p className="mt-7 text-center text-xs font-bold leading-5 text-[#c9b8a8]">
                This QR is branch-specific. Replace this placard immediately after regeneration.
              </p>
            </div>
        </div>
        <Card className="no-print space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-forge-muted">Branch ID</p>
            <p className="mb-3 font-black text-slate-900">#{qr.data.branchId}</p>
            <p className="text-xs font-bold uppercase text-forge-muted">Status</p>
            <p className={qr.data.isActive ? "font-black text-emerald-600" : "font-black text-red-600"}>
              {qr.data.isActive ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mb-2" size={18} />
            Regenerating invalidates the old printed QR immediately.
          </div>
          <Button className="w-full" onClick={printQr}><FileText size={16} />Print QR</Button>
          <Button className="w-full" variant="secondary" onClick={downloadPng}><FileText size={16} />Download QR PNG</Button>
          {canRegenerate ? (
            <Button className="w-full" variant="danger" onClick={() => setConfirmRegenerate(true)}>
              <FileText size={16} />Regenerate QR
            </Button>
          ) : null}
        </Card>
      </div>
      <ConfirmDialog
        open={confirmRegenerate}
        title="Regenerate branch QR?"
        message="Regenerating this QR will invalidate the old printed QR code. You must print and replace the QR inside the branch."
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={() => void regenerate()}
      />
    </>
  );
}
