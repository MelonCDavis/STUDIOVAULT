export default function StaffHeader({ setSidebarOpen }) {
    return (
        <header className="
            h-16 
            border-b 
            border-neutral-800 
            bg-neutral-900
            flex 
            items-center 
            px-4 lg:px-6
        ">
            {/* Hamburger (mobile only) */}
            <button
              className="mr-4 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
                ☰
            </button>

            <div className="text-sm text-neutral-400">
                Staff Portal
            </div>
        </header>
    );
}