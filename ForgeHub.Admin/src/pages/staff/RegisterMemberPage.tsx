import { useState } from "react";
import { membersApi } from "../../api/membersApi";
import { membershipsApi } from "../../api/membershipsApi";
import { membershipPlansApi } from "../../api/membershipPlansApi";
import { paymentsApi } from "../../api/paymentsApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useApi } from "../../hooks/useApi";
import type { MembershipPlan } from "../../types/membership";
import type { Member } from "../../types/member";
import { cleanLabel, dateLabel, money } from "../../utils/formatters";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function planPrice(plan?: MembershipPlan) {
  return typeof plan?.price === "number" ? plan.price : 0;
}

export function RegisterMemberPage() {
  const plansApi = useApi(membershipPlansApi.getPlans, []);
  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dob: "",
    phone: "",
    email: "",
    password: "",
    membershipPlanId: "",
    startDate: todayIso(),
    paymentAmount: "",
    paymentMethod: "Card",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createdMember, setCreatedMember] = useState<Member | null>(null);

  const plans = (plansApi.data ?? []).filter((plan) => plan.isActive !== false);
  const selectedPlan = plans.find((plan) => String(plan.id) === form.membershipPlanId);

  if (plansApi.loading) return <LoadingState />;
  if (plansApi.error) return <ErrorState message={plansApi.error} />;

  const update = (key: string, value: string) => {
    setForm((current) => {
      if (key === "membershipPlanId") {
        const nextPlan = plans.find((plan) => String(plan.id) === value);
        const price = planPrice(nextPlan);
        return { ...current, membershipPlanId: value, paymentAmount: price > 0 ? String(price) : "" };
      }
      return { ...current, [key]: value };
    });
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setCreatedMember(null);

    try {
      const cleanEmail = form.email.replace(/\s+/g, "").toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error("Invalid email format.");
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordRegex.test(form.password)) {
        throw new Error("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      }

      if (!form.membershipPlanId || !selectedPlan) throw new Error("Select a membership plan.");

      const amount = form.paymentAmount === "" ? undefined : Number(form.paymentAmount);
      const selectedPrice = planPrice(selectedPlan);
      if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
        throw new Error("Payment amount must be a numeric value that is not negative.");
      }
      if (amount !== undefined && selectedPrice > 0 && amount > selectedPrice) {
        throw new Error(`Payment amount cannot exceed ${money(selectedPrice)} for the selected plan.`);
      }

      const member = await membersApi.createMember({
        fullName: form.fullName,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        phone: form.phone || undefined,
        email: cleanEmail,
        password: form.password,
        joinDate: todayIso(),
        isActive: true
      });

      const membership = await membershipsApi.assignMembership(Number(member.id), {
        planId: Number(form.membershipPlanId),
        startDate: form.startDate,
        status: "ACTIVE"
      });

      if (amount !== undefined && amount > 0) {
        await paymentsApi.createPayment({
          memberId: Number(member.id),
          membershipId: membership.id,
          amount,
          method: form.paymentMethod,
          notes: form.notes || `Initial payment for ${selectedPlan.name}`
        });
      }

      setCreatedMember(member);
      setMessage(`${cleanLabel(member.name ?? member.fullName, "Member")} was registered under your assigned branch.`);
      setForm({
        fullName: "",
        gender: "",
        dob: "",
        phone: "",
        email: "",
        password: "",
        membershipPlanId: "",
        startDate: todayIso(),
        paymentAmount: "",
        paymentMethod: "Card",
        notes: ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Register Member" description="Register a member in your assigned branch." />
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-slate-800 md:col-span-2">
            Full name
            <Input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Email
            <Input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Password
            <Input required type="password" minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Phone
            <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Gender
            <Select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Date of birth
            <Input type="date" value={form.dob} onChange={(event) => update("dob", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Membership plan
            <Select required value={form.membershipPlanId} onChange={(event) => update("membershipPlanId", event.target.value)}>
              <option value="">Select plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}{plan.durationMonths ?? plan.durationMonth ? ` - ${plan.durationMonths ?? plan.durationMonth} mo` : ""}{plan.price ? ` - ${money(plan.price)}` : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Membership start
            <Input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Payment amount
            <Input type="number" min="0" max={selectedPlan?.price ?? undefined} step="0.01" value={form.paymentAmount} onChange={(event) => update("paymentAmount", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800">
            Payment method
            <Select value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
              <option>Card</option>
              <option>Cash</option>
              <option>Transfer</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-800 md:col-span-2">
            Notes
            <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>
          {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
          {message ? <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 md:col-span-2">{message}</div> : null}
          <div className="md:col-span-2">
            <Button disabled={saving}>{saving ? "Registering..." : "Register member"}</Button>
          </div>
        </form>
      </Card>
      {createdMember ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">{cleanLabel(createdMember.name ?? createdMember.fullName, "Member")}</h2>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 md:grid-cols-3">
            <span>Email: {createdMember.email || "No data"}</span>
            <span>Phone: {createdMember.phone || "No data"}</span>
            <span>Joined: {dateLabel(createdMember.joinedAt)}</span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
