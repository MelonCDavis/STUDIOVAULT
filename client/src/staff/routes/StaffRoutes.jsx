import { Routes, Route } from "react-router-dom";
import StaffLayout from "../layout/StaffLayout";

function Dashboard() {
    return<div>Dashboard</div>;
}

function Calendar() {
    return<div>Calendar</div>;
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
        <Routes>
            <Route path="/" element={<StaffLayout />} >
                <Route index element={<Dashboard />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="clients" element={<Clients />}  />
                <Route path="approvals" element={<Approvals />}  />
                <Route path="inspection" element={<Inspection />}  />
            </Route>
        </Routes>
    );
}