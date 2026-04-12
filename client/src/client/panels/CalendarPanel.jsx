import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../services/apiClient";

function formatDateTime(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("default", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarPanel({ evaluationAppointmentId }) {
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  const inviteToken = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("invite") || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInvite() {
      if (!inviteToken) {
        setInvite(null);
        setInviteError("");
        return;
      }

      try {
        setIsLoadingInvite(true);
        setInviteError("");

        const data = await apiGet(`/api/appointment-invites/${inviteToken}`);

        if (ignore) return;

        setInvite(data || null);
      } catch (err) {
        if (ignore) return;
        console.error("Load appointment invite failed", err);
        setInvite(null);
        setInviteError(err?.response?.error || "Failed to load booking invite");
      } finally {
        if (!ignore) {
          setIsLoadingInvite(false);
        }
      }
    }

    loadInvite();

    return () => {
      ignore = true;
    };
  }, [inviteToken]);

  async function handleBookAppointment() {
    if (!selectedTime) {
      alert("Select a time before booking.");
      return;
    }

    try {
      setIsBooking(true);

      await apiPost(`/api/appointment-invites/${inviteToken}/book`, {
        startsAt: selectedTime,
        serviceId: "REPLACE_WITH_SERVICE_ID", // temp
      });

      alert("Appointment confirmed.");

      setInvite((prev) =>
        prev ? { ...prev, status: "USED" } : prev
      );
    } catch (err) {
      console.error("Booking failed", err);
      alert(err?.response?.error || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Calendar</h2>

        {evaluationAppointmentId ? (
          <p className="text-sm text-amber-400">
            Evaluating appointment block: {evaluationAppointmentId}
          </p>
        ) : (
          <p className="text-sm text-neutral-400">
            Calendar view.
          </p>
        )}
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-medium text-blue-100">
            Appointment Booking Invite
          </div>

          {isLoadingInvite ? (
            <div className="text-sm text-blue-200/80">
              Loading your booking invite...
            </div>
          ) : inviteError ? (
            <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
              {inviteError}
            </div>
          ) : !invite ? (
            <div className="text-sm text-blue-200/80">
              Invite not found.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-blue-100">
                Your artist has invited you to choose an appointment time.
              </div>

              <div className="grid gap-2 text-sm">
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Status:</span>{" "}
                  {invite.status || "ACTIVE"}
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Duration:</span>{" "}
                  {invite.durationMinutes || 0} minutes
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Placement mode:</span>{" "}
                  {invite.placementMode || "OPEN_MAGNETIC"}
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Valid from:</span>{" "}
                  {formatDateTime(invite.validFrom)}
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Valid until:</span>{" "}
                  {formatDateTime(invite.validUntil)}
                </div>
              </div>

              {invite.messageToClient ? (
                <div className="rounded-xl border border-blue-900/60 bg-black/20 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-blue-300/70">
                    Artist message
                  </div>
                  <div className="mt-1 text-sm text-blue-100 whitespace-pre-wrap">
                    {invite.messageToClient}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 space-y-3">
                <div className="text-sm text-neutral-300">
                  Select a time to book your appointment.
                </div>

                <input
                  type="datetime-local"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm"
                />

                <button
                  type="button"
                  onClick={handleBookAppointment}
                  disabled={isBooking || invite.status !== "ACTIVE"}
                  className="w-full rounded bg-emerald-800 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isBooking ? "Booking..." : "Confirm Appointment"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}