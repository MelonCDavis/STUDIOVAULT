import { NavLink } from "react-router-dom";

export default function StaffSidebar({ sidebarOpen, setSidebarOpen }) {
    return (
        <>
          {/* Overlay (mobile only) */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`
              fixed z-50 top-0 left-0 h-full w-64
              bg-neutral-900 border-r border-neutral-800
              transform transition-transform duration-200
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
              lg:translate-x-0
              lg:static lg:flex
            `}
          >
            <div className="flex flex-col w-full p-4">
                <div className="text-lg font-semibold mb-6">
                    STUDIOVAULT
                </div>
                <nav className="flex flex-col gap-2">
                    <NavLink
                      to="/staff"
                      end
                      onClick={() => setSidebarOpen(false)}
                      className="px-3 py-2 rounded hover:bg-neutral-800"
                    >
                        DASHBOARD
                    </NavLink>

                    <NavLink
                      to="/staff/calendar"
                      end
                      onClick={() => setSidebarOpen(false)}
                      className="px-3 py-2 rounded hover:bg-neutral-800"
                    >
                        Calendar
                    </NavLink>

                    <NavLink
                      to="/staff/clients"
                      end
                      onClick={() => setSidebarOpen(false)}
                      className="px-3 py-2 rounded hover:bg-neutral-800"
                    >
                        Clients
                    </NavLink>

                    <NavLink
                      to="/staff/approvals"
                      end
                      onClick={() => setSidebarOpen(false)}
                      className="px-3 py-2 rounded hover:bg-neutral-800"
                    >
                        Approvals
                    </NavLink>

                    <NavLink
                      to="/staff/inspection"
                      end
                      onClick={() => setSidebarOpen(false)}
                      className="px-3 py-2 rounded hover:bg-neutral-800"
                    >
                        InspectionMode
                    </NavLink>
                </nav>
            </div>
          </aside>
        </>
    );
}