import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StaffSidebar from './StaffSidebar';
import StaffHeader from './StaffHeader';

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className='min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row'>
            {/* Sidebar */}
            <StaffSidebar 
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />

            {/* Main Column */}
            <div className='flex-1 flex flex-col min-h-screen'>
                <StaffHeader setSidebarOpen={setSidebarOpen} />

                <main className="flex-1 p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}