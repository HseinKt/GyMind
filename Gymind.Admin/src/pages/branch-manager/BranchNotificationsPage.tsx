import { useState } from "react";
import { notificationsApi } from "../../api/notificationsApi";
import { NotificationForm } from "../../components/forms/NotificationForm";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { useApi } from "../../hooks/useApi";
import type { Notification } from "../../types/notification";

const pageSize = 10;

function createdLabel(value?: string | null) {
  if (!value) return "No data";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function BranchNotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => notificationsApi.getNotificationsPage({ page, pageSize }), [page]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      <PageHeader title="Branch Notifications" description="Branch-scoped notifications and member messages." />
      {notice ? <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
      {actionError ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div> : null}
      <DataTable<Notification>
        title="Branch Notifications"
        rows={data?.items ?? []}
        createLabel="Send notification"
        onCreate={() => setOpen(true)}
        columns={[
          { key: "title", label: "Title", render: (row) => row.title || "No data" },
          { key: "message", label: "Message", render: (row) => row.message || "No data" },
          { key: "createdAt", label: "Created", render: (row) => createdLabel(row.createdAt) }
        ]}
      />
      <PaginationControls
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 1}
        totalCount={data?.totalCount}
        pageSize={data?.pageSize ?? pageSize}
        onPageChange={setPage}
      />
      <Modal open={open} title="Send notification" onClose={() => setOpen(false)}>
        <NotificationForm
          onSubmit={async (values) => {
            try {
              setActionError("");
              await notificationsApi.createNotification(values);
              setOpen(false);
              setNotice("Notification sent successfully.");
              setPage(1);
              await reload();
            } catch (err) {
              setActionError(err instanceof Error ? err.message : "Unable to send notification.");
            }
          }}
        />
      </Modal>
    </>
  );
}
