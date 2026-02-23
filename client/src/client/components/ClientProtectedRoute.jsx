import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function ClientProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/client/login" replace />;
  }

  return children;
}
