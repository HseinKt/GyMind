import { usersApi } from "../../api/usersApi";
import { UserForm } from "../../components/forms/UserForm";
import { roleIds } from "../../utils/constants";
import { EntityPage } from "../shared/EntityPage";
import type { User } from "../../types/user";
export function GymOwnersPage() {
  return (
    <EntityPage<User>
      title="Gym Owners"
      description="Gym owner users loaded from the users API."
      loader={() => usersApi.getUsersByRole(roleIds.GymOwner)}
      createLabel="Create owner"
      columns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "workspace", label: "Workspace" },
        { key: "isActive", label: "Active", badge: true }
      ]}
      form={(close, reload, notify) => (
        <UserForm
          fixedRoleId={roleIds.GymOwner}
          onSubmit={async (values) => {
            await usersApi.createUser({ ...values, roleId: roleIds.GymOwner });
            close();
            await reload();
            notify("Gym owner created successfully.");
          }}
        />
      )}
      editForm={(row, close, _reload, notify, _notifyError, updateRow, refresh) => (
        <UserForm
          fixedRoleId={roleIds.GymOwner}
          requirePassword={false}
          submitLabel="Save owner"
          initialValues={{
            fullName: row.fullName ?? row.name ?? "",
            email: row.email ?? "",
            phone: row.phone ?? "",
            roleId: roleIds.GymOwner,
            gymId: row.gymId ?? undefined,
            branchId: row.branchId ?? undefined,
            isActive: row.isActive ?? true
          }}
          onSubmit={async (values) => {
            const saved = await usersApi.updateUser(row.id, {
              fullName: values.fullName,
              email: values.email,
              phone: values.phone,
              roleId: roleIds.GymOwner,
              gymId: values.gymId,
              branchId: values.branchId,
              isActive: values.isActive ?? row.isActive ?? true
            });
            updateRow(saved);
            await refresh();
            close();
            notify(`${saved.name ?? saved.fullName ?? "Gym owner"} saved successfully.`);
          }}
        />
      )}
    />
  );
}
