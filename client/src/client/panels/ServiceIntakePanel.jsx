import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../services/apiClient";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function IdentityField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100">
        {value || "—"}
      </div>
    </div>
  );
}

function MultipleAppointmentsState({ appointments }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Choose appointment</h2>
        <p className="text-sm text-neutral-400">
          You have more than one appointment today. Select which appointment you want to check in for.
        </p>
      </div>

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment._id}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {formatDateTime(appointment.startsAt)}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Ends {formatDateTime(appointment.endsAt)}
                </p>
              </div>

              <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                {appointment.status}
              </div>
            </div>

            <p className="mt-3 text-sm text-neutral-400">
              Multiple-appointment selection UI is the next step.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoAppointmentState() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Service Intake</h2>
        <p className="text-sm text-neutral-400">
          Complete your day-of-service intake, disclosures, consent, and signature.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
        No appointment was found for today, so there is nothing to check in for yet.
      </div>
    </div>
  );
}

function IntakeSessionView({ appointment, session, mode }) {
  const profile = session?.profileSnapshot || {};
  const emergencyContact = profile?.emergencyContact || {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Service Intake</h2>
        <p className="text-sm text-neutral-400">
          Complete your day-of-service intake, disclosures, consent, and signature.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Intake session
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {mode === "created" ? "New session started" : "Session resumed"}
            </p>
          </div>

          <div className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
            {session?.status || "IN_PROGRESS"}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Today&apos;s appointment
          </p>
          <p className="mt-1 text-sm text-white">
            {formatDateTime(appointment?.startsAt)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Ends {formatDateTime(appointment?.endsAt)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Step 1
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            Identity confirmation
          </h3>
          <p className="mt-1 text-sm text-neutral-400">
            Confirm that your information is correct before continuing.
          </p>
        </div>

        <div className="grid gap-4">
          <IdentityField label="Legal name" value={profile.legalName} />
          <IdentityField label="Preferred name" value={profile.preferredName} />
          <IdentityField label="Pronouns" value={profile.pronouns} />
          <IdentityField
            label="Date of birth"
            value={profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : ""}
          />
          <IdentityField label="Phone" value={profile.phoneE164} />
          <IdentityField label="Email" value={profile.email} />
          <IdentityField label="Address" value={profile.address} />
          <IdentityField label="Emergency contact name" value={emergencyContact.name} />
          <IdentityField label="Emergency contact phone" value={emergencyContact.phoneE164} />
          <IdentityField
            label="Emergency contact relationship"
            value={emergencyContact.relationship}
          />
        </div>

        <div className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-100">
          Step 1 save/edit actions are next. This pass is only for start/resume and display.
        </div>
      </div>
    </div>
  );
}

export default function ServiceIntakePanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [mode, setMode] = useState("");
  const [session, setSession] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadIntake() {
      try {
        setLoading(true);
        setError("");
        setErrorCode("");

        const data = await apiGet("/api/client/intake/today");

        if (cancelled) return;

        setMode(data?.mode || "");
        setSession(data?.session || null);
        setAppointment(data?.appointment || null);
        setAppointments([]);
      } catch (err) {
        if (cancelled) return;

      const message =
        err?.response?.error ||
        err?.message ||
        "Failed to load service intake.";

      const code = err?.response?.code || "";

      setError(message);
      setErrorCode(code);

      if (code === "MULTIPLE_APPOINTMENTS_FOR_TODAY") {
        setAppointments(err?.response?.appointments || []);
      } else {
        setAppointments([]);
      }

        setMode("");
        setSession(null);
        setAppointment(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadIntake();

    return () => {
      cancelled = true;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Service Intake</h2>
            <p className="text-sm text-neutral-400">
              Complete your day-of-service intake, disclosures, consent, and signature.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            Loading today&apos;s intake session...
          </div>
        </div>
      );
    }

    if (errorCode === "NO_APPOINTMENT_FOR_TODAY") {
      return <NoAppointmentState />;
    }

    if (errorCode === "MULTIPLE_APPOINTMENTS_FOR_TODAY") {
      return <MultipleAppointmentsState appointments={appointments} />;
    }

    if (error && !session) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Service Intake</h2>
            <p className="text-sm text-neutral-400">
              Complete your day-of-service intake, disclosures, consent, and signature.
            </p>
          </div>

          <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-100">
            {error}
          </div>
        </div>
      );
    }

    if (!session || !appointment) {
      return (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          No intake session available.
        </div>
      );
    }

    return (
      <IntakeSessionView
        appointment={appointment}
        session={session}
        mode={mode}
      />
    );
  }, [appointments, appointment, error, errorCode, loading, mode, session]);

  return <div className="space-y-4">{content}</div>;
}