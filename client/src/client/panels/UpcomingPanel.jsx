import { useEffect, useState } from "react";
import { apiGet } from "../../services/apiClient";

function formatDateTime(value) {
  if (!value) return "Date pending";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status) {
  return String(status || "PENDING").replaceAll("_", " ");
}

export default function UpcomingPanel() {
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUpcoming() {
      try {
        setIsLoading(true);
        setError("");

        const [appointmentsResponse, consultationsResponse] =
          await Promise.all([
            apiGet("/api/client/appointments"),
            apiGet("/api/client/consultations"),
          ]);

        if (!isMounted) return;

        setAppointments(
          Array.isArray(appointmentsResponse)
            ? appointmentsResponse
            : appointmentsResponse?.appointments || []
        );

        setConsultations(
          Array.isArray(consultationsResponse)
            ? consultationsResponse
            : consultationsResponse?.consultations || []
        );
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load upcoming client items", err);
        setError("Unable to load upcoming appointments and consultations.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUpcoming();

    return () => {
      isMounted = false;
    };
  }, []);

  const upcomingItems = [
    ...appointments.map((appointment) => ({
      _id: appointment._id,
      type: "Appointment",
      startsAt: appointment.startsAt,
      status: appointment.status,
    })),
    ...consultations.map((consultation) => ({
      _id: consultation._id,
      type: "Consultation",
      startsAt: consultation.startsAt,
      status: consultation.status,
    })),
  ].sort((a, b) => new Date(a.startsAt || 0) - new Date(b.startsAt || 0));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Upcoming</h2>
        <p className="text-sm text-neutral-400">
          Your upcoming appointments and consultations.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-400">Loading upcoming items...</p>
      )}

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && upcomingItems.length === 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-400">
          No upcoming appointments or consultations yet.
        </div>
      )}

      {!isLoading && !error && upcomingItems.length > 0 && (
        <div className="space-y-3">
          {upcomingItems.map((item) => (
            <div
              key={`${item.type}-${item._id}`}
              className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.type}</p>
                  <p className="text-sm text-neutral-400">
                    {formatDateTime(item.startsAt)}
                  </p>
                </div>

                <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase tracking-wide text-neutral-300">
                  {statusLabel(item.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}