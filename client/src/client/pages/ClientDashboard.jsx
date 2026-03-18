import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useLocation } from "react-router-dom";

import HelpDropdown from "../components/HelpDropdown";
import ProfilePanel from "../panels/ProfilePanel";
import ConsultationsPanel from "../panels/ConsultationsPanel";
import CalendarPanel from "../panels/CalendarPanel";
import UpcomingPanel from "../panels/UpcomingPanel";
import MessagesPanel from "../panels/MessagesPanel";
import DocumentsPanel from "../panels/DocumentsPanel";

export default function ClientDashboard() {
  const { token } = useAuth();
  const location = useLocation();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [evaluationAppointmentId, setEvaluationAppointmentId] = useState(null);

  // Fetch profile state
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("http://localhost:5000/api/client/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        setHasCompletedOnboarding(data.hasCompletedOnboarding);

        if (!data.hasCompletedOnboarding) {
          setActivePanel("profile");
        }
      } catch (err) {
        console.error("Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [token]);

  // Intent override (appointment evaluation only)
  useEffect(() => {
    if (location.state?.intent === "evaluate-appointment") {
      setActivePanel("calendar");
      setEvaluationAppointmentId(location.state.appointmentId);
    }
  }, [location.state]);

  if (loadingProfile) {
    return <div className="text-sm text-neutral-400">Loading...</div>;
  }

  const renderPanel = () => {
    switch (activePanel) {
      case "profile":
        return (
          <ProfilePanel
            onComplete={() => {
              setHasCompletedOnboarding(true);
              setActivePanel(null);
            }}
          />
        );

      case "consultations":
        return <ConsultationsPanel />;

      case "calendar":
        return (
          <CalendarPanel
            evaluationAppointmentId={evaluationAppointmentId}
          />
        );

      case "upcoming":
        return <UpcomingPanel />;

      case "messages":
        return <MessagesPanel />;

      case "documents":
        return <DocumentsPanel />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">

      {/* Hero / Dropdown */}
      {activePanel === null && (
        <div className="relative rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">

          {/* Decorative Frame (Phase 1 minimal skin) */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl border border-amber-500/20" />

          <h1 className="text-xl font-serif tracking-wide">
            How may we assist you?
          </h1>

          <div className="mt-6 max-w-sm mx-auto">
            <HelpDropdown
              disabled={!hasCompletedOnboarding}
              onSelect={(value) => setActivePanel(value)}
            />
          </div>
        </div>
      )}

      {/* Active Panel */}
      {activePanel !== null && (
        <div className="space-y-4">

          {hasCompletedOnboarding && (
            <div className="flex justify-end">
              <button
                onClick={() => setActivePanel(null)}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Back
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
            {renderPanel()}
          </div>
        </div>
      )}
    </div>
  );
}