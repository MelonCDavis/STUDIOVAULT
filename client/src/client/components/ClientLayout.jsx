import { Outlet } from "react-router-dom";

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4">
      <Outlet />
    </div>
  );
}
