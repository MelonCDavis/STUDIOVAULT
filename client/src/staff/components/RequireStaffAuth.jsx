import { Navigate } from "react-router-dom";
import { useStaffAuth } from "../../context/StaffAuthContext";

export default function RequireStaffAuth({ children }) {
    const { isAuthenticated } = useStaffAuth();

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    return children;
}