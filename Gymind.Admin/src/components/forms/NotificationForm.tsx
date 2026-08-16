import { useForm } from "react-hook-form";
import { notificationsApi } from "../../api/notificationsApi";
import { useApi } from "../../hooks/useApi";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import type { CreateNotificationPayload } from "../../types/notification";
import { useState } from "react";

export type NotificationFormValues = CreateNotificationPayload & { selectedId?: number };

export function NotificationForm({ onSubmit, saving = false }: { onSubmit: (values: NotificationFormValues) => Promise<void> | void; saving?: boolean }) {
  const targets = useApi(notificationsApi.getTargets, []);
  const [targetType, setTargetType] = useState("MEMBER");
  const { register, handleSubmit } = useForm<NotificationFormValues>({ defaultValues: { targetType: "MEMBER", priority: "NORMAL" } });
  return (
    <form className="grid gap-4" onSubmit={handleSubmit((values) => {
      const selectedId = Number(values.selectedId);
      const payload = { ...values };
      delete payload.selectedId;
      if (targetType === "GYM") payload.gymId = selectedId;
      if (targetType === "BRANCH") payload.branchId = selectedId;
      if (targetType === "USER") payload.userIds = selectedId ? [selectedId] : [];
      if (targetType === "MEMBER") payload.memberIds = selectedId ? [selectedId] : [];
      return onSubmit(payload);
    })}>
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
        The backend validates this audience against your role and tenant scope before creating recipients.
      </div>
      <label>Target type<Select {...register("targetType", { required: true })} value={targetType} onChange={(event) => setTargetType(event.target.value)}>{targets.data?.targetTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select></label>
      {targetType === "GYM" ? <label>Gym<Select {...register("selectedId", { valueAsNumber: true })}>{targets.data?.gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</Select></label> : null}
      {targetType === "BRANCH" ? <label>Branch<Select {...register("selectedId", { valueAsNumber: true })}>{targets.data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></label> : null}
      {targetType === "ROLE" ? <label>Role<Select {...register("role")}>{targets.data?.roles.map((role) => <option key={role} value={role}>{role}</option>)}</Select></label> : null}
      {targetType === "USER" ? <label>User<Select {...register("selectedId", { valueAsNumber: true })}>{targets.data?.users.map((user) => <option key={user.id} value={user.id}>{user.fullName} - {user.role}</option>)}</Select></label> : null}
      {targetType === "MEMBER" ? <label>Member<Select {...register("selectedId", { valueAsNumber: true })}>{targets.data?.members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</Select></label> : null}
      <label>Priority<Select {...register("priority")}><option>NORMAL</option><option>IMPORTANT</option><option>URGENT</option></Select></label>
      <label>Title<Input {...register("title", { required: true })} /></label>
      <label>Message<Textarea {...register("message", { required: true })} /></label>
      {targets.error ? <p className="text-sm text-red-600">{targets.error}</p> : null}
      <Button disabled={saving || targets.loading}>Send notification</Button>
    </form>
  );
}
