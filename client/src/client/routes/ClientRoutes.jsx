import { Routes, Route, Navigate } from "react-router-dom";
import ClientLayout from "../components/ClientLayout";
import ClientLoginPage from "../pages/ClientLoginPage";
import ClientRegisterPage from "../pages/ClientRegisterPage";
import ClientDashboard from "../pages/ClientDashboard";
import ClientProtectedRoute from "../components/ClientProtectedRoute";

export default function ClientRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<ClientLoginPage />} />
      <Route path="/register" element={<ClientRegisterPage />} />

      <Route element={<ClientLayout />}>
        <Route
            path="/dashboard"
            element={
            <ClientProtectedRoute>
                <ClientDashboard />
            </ClientProtectedRoute>
            }
        />
      </Route>

      <Route path="*" element={<Navigate to="/client/login" replace />} />
    </Routes>
  );
}
