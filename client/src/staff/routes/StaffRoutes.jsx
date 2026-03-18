import { Routes, Route } from "react-router-dom";
import StaffLayout from "../layout/StaffLayout";
import RequireRole from "../../auth/RequireRole";
import CalendarPage from "../pages/CalendarPage";
import SchedulePage from "../pages/SchedulePage";

function Dashboard() {
  return <div>Dashboard</div>;
}

function Clients() {
  return <div>Clients</div>;
}

function Approvals() {
  return <div>Approvals</div>;
}

function Inspection() {
  return <div>Inspection Mode</div>;
}

export default function StaffRoutes() {
  return (
    <Routes>
      <Route
        path=""
        element={
          <RequireRole roles={["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"]}>
            <StaffLayout />
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="clients" element={<Clients />} />
        <Route
          path="approvals"
          element={
            <RequireRole roles={["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"]}>
              <Approvals />
            </RequireRole>
          }
        />
        <Route path="inspection" element={<Inspection />} />
      </Route>
    </Routes>
  );
}