import { Routes, Route } from "react-router-dom";
import StaffLayout from "../layout/StaffLayout";
import { StaffAuthProvider } from "../../context/StaffAuthContext";
import RequireRole from "../components/RequireRole";
import RequireStaffAuth from "../components/RequireStaffAuth";
import CalendarPage from "../pages/CalendarPage";

function Dashboard() {
    return<div>Dashboard</div>;
}

function Clients() {
    return<div>Clients</div>;
}

function Approvals() {
    return<div>Approvals</div>;
}

function Inspection() {
    return<div>Inspection Mode</div>;
}

export default function StaffRoutes() {
    return (
        <StaffAuthProvider>
            <Routes>
                <Route
                  path=""
                  element={
                    <RequireStaffAuth>
                    <StaffLayout />
                    </RequireStaffAuth>
                  }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="clients" element={<Clients />}  />
                    <Route 
                      path="approvals"
                      element={
                        <RequireRole allowedRoles={["MANAGER", "OWNER"]}>
                          <Approvals />
                        </RequireRole>
                      }
                    />
                    <Route path="inspection" element={<Inspection />}  />
                </Route>
            </Routes>
        </StaffAuthProvider>
    );
}