import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function RequireRole({ allowedRoles, children }) {
    const { role } = useAuth();

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/staff" replace />
    }
    return children;
}