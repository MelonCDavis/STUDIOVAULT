import { createContext, useContext, useState } from "react";

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
    // Temp mock role
    const [isAuthenticated] = useState(true);

    const [role] = useState("ARTIST");
    const [user] = useState({
        id: "mock-user",
        name: "Test Artist",
    });

    return (
        <StaffAuthContext.Provider value={{ user, role, isAuthenticated }}>
            {children}
        </StaffAuthContext.Provider>    
    );
}

export function useStaffAuth() {
    const context = useContext(StaffAuthContext);
    if (!context) {
        throw new Error("useStaffAuth must be used inside StaffAuthProvider");
    }
    return context;
}