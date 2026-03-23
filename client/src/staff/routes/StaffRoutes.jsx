import { Routes, Route } from "react-router-dom";
import StaffLayout from "../layout/StaffLayout";
import RequireRole from "../../auth/RequireRole";
import CalendarPage from "../pages/CalendarPage";
import SchedulePage from "../pages/SchedulePage";
import DashboardPage from "../pages/DashboardPage";
import ClientsPage from "../pages/ClientsPage";
import ApprovalsPage from "../pages/ApprovalsPage";
import InspectionModePage from "../pages/InspectionModePage";

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
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route
          path="approvals"
          element={
            <RequireRole roles={["FRONT_DESK", "MANAGER", "OWNER"]}>
              <ApprovalsPage />
            </RequireRole>
          }
        />
        <Route path="inspection" element={<InspectionModePage />} />
      </Route>
    </Routes>
  );
}