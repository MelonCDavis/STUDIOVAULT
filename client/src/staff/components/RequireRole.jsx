import { Navigate } from "react-router-dom";
import { useStaffAuth } from "../../context/StaffAuthContext";

export default function RequireRole({ allowedRoles, children }) {
    const { role } = useStaffAuth();

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/staff" replace />
    }
    return children;
}