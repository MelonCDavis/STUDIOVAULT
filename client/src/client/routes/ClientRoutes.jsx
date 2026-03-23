import { Routes, Route, Navigate } from "react-router-dom";
import ClientLayout from "../components/ClientLayout";
import ClientDashboard from "../pages/ClientDashboard";
import RequireRole from "../../auth/RequireRole";

export default function ClientRoutes() {
  return (
    <Routes>

      <Route element={<ClientLayout />}>
        <Route
          path="dashboard"
          element={
            <RequireRole roles={["CLIENT"]}>
              <ClientDashboard />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}