import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ClientDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch(
          "http://localhost:5000/api/client/appointments",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 401) {
          logout();
          navigate("/client/login");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data = await res.json();
        setAppointments(data);
      } catch (err) {
        setError("Could not load appointments");
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [token, logout, navigate]);

  if (loading) {
    return <div className="text-sm text-neutral-400">Loading...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        My Appointments
      </h1>

      {appointments.length === 0 ? (
        <div className="text-sm text-neutral-400">
          No appointments yet.
        </div>
      ) : (
        appointments.map((appt) => (
          <div
            key={appt._id}
            className="border border-neutral-800 bg-neutral-900 p-3 rounded text-sm"
          >
            <div>
              {new Date(appt.startsAt).toLocaleString()}
            </div>
            <div className="text-neutral-400">
              Status: {appt.status}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
