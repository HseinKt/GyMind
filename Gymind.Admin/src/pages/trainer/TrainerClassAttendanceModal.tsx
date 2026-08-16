import { useEffect, useState } from "react";
import { trainerClassBookingsApi, type TrainerClassBooking } from "../../api/trainerClassBookingsApi";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { Modal } from "../../components/ui/Modal";
import type { GymClass } from "../../types/class";
import { dateLabel, timeLabel } from "../../utils/formatters";

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return `${dateLabel(value)} ${timeLabel(value)}`;
}

export function TrainerClassAttendanceModal({ gymClass, onClose }: { gymClass: GymClass; onClose: () => void }) {
  const [bookings, setBookings] = useState<TrainerClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    trainerClassBookingsApi.getClassBookings(gymClass.id)
      .then((rows) => {
        if (active) setBookings(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load booked members.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gymClass.id]);

  async function updateAttendance(booking: TrainerClassBooking, attended: boolean) {
    setSavingId(booking.bookingId);
    setError("");
    try {
      const updated = await trainerClassBookingsApi.updateAttendance(booking.bookingId, attended);
      setBookings((current) => current.map((item) => item.bookingId === updated.bookingId ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update attendance.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Modal open title={`Attendance - ${gymClass.name}`} onClose={onClose}>
      {loading ? <LoadingState label="Loading booked members..." /> : null}
      {!loading && error ? <div className="mb-3"><ErrorState message={error} /></div> : null}
      {!loading && bookings.length === 0 ? <EmptyState title="No booked members." message="No members have booked this class yet." /> : null}
      {!loading && bookings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-forge-muted">
              <tr>
                <th className="px-3 py-3">Member</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Attended</th>
                <th className="px-3 py-3">Attended time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-border">
              {bookings.map((booking) => (
                <tr key={booking.bookingId}>
                  <td className="px-3 py-3 font-semibold text-slate-950">{booking.memberName}</td>
                  <td className="px-3 py-3 text-slate-700">
                    <div className="grid gap-1">
                      <span>{booking.memberPhone || "No phone"}</span>
                      <span className="text-xs text-forge-muted">{booking.memberEmail || "No email"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><Badge tone="info">{booking.status ?? "Booked"}</Badge></td>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-forge-border text-forge-primary"
                      checked={booking.attended}
                      disabled={savingId === booking.bookingId}
                      onChange={(event) => updateAttendance(booking, event.target.checked)}
                      aria-label={`Mark ${booking.memberName} attended`}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">{booking.attendedAt ? formatDateTime(booking.attendedAt) : "Not marked"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Modal>
  );
}
