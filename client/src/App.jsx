import { Routes, Route } from "react-router-dom";
import StaffRoutes from "./staff/routes/StaffRoutes";
import ClientRoutes from "./client/routes/ClientRoutes";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Staff */}
      <Route
        path="/staff/*"
        element={
          <ProtectedRoute>
            <StaffRoutes />
          </ProtectedRoute>
        }
      />

      {/* Protected Client (optional — but recommended) */}
      <Route
        path="/client/*"
        element={
          <ProtectedRoute>
            <ClientRoutes />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<MainPage />} />
    </Routes>
  );
}

export default App;