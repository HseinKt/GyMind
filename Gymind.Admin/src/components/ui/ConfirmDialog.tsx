import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export function ConfirmDialog({ open, title, message, onConfirm, onClose }: { open: boolean; title: string; message: string; onConfirm: () => Promise<void> | void; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError("");
    }
  }, [open]);

  async function confirm() {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete this action.");
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>
      {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button type="button" variant="danger" onClick={() => void confirm()} disabled={submitting}>{submitting ? "Confirming..." : "Confirm"}</Button>
      </div>
    </Modal>
  );
}
