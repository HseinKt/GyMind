import { useForm } from "react-hook-form";
import { dashboardApi } from "../../api/dashboardApi";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

export interface PaymentFormValues { memberId: number; amount: number; method?: string; notes?: string; }

export function PaymentForm({ onSubmit, saving = false }: { onSubmit: (values: PaymentFormValues) => Promise<void> | void; saving?: boolean }) {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const { register, handleSubmit } = useForm<PaymentFormValues>({ defaultValues: { method: "Card" } });
  return <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}><label>Member<Select {...register("memberId", { required: true, valueAsNumber: true })}><option value="">Search/select member</option>{workspace.data?.members.map((member) => <option key={member.id} value={member.id}>{member.name ?? member.fullName} {member.phone ? `- ${member.phone}` : ""}</option>)}</Select></label><label>Amount<Input type="number" {...register("amount", { required: true, valueAsNumber: true })} /></label><label>Method<Select {...register("method")}><option>Card</option><option>Cash</option><option>Transfer</option></Select></label><label>Notes<Textarea {...register("notes")} /></label>{workspace.error ? <p className="text-sm text-red-600">{workspace.error}</p> : null}<Button disabled={saving || workspace.loading}>Record payment</Button></form>;
}
