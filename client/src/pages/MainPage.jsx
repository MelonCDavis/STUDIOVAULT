import { Link } from "react-router-dom";

export default function MainPage() {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
            <div lassName="w-full max-w-md space-y-6 text-center">
                <h1 className="text-3xl font-semibold">
                    STUDIOVAULT
                </h1>
                <p className="text-neutral-400">
                    Booking & Compliance Platform
                </p>
                <div className="space-y-3 pt-6">
                    <Link
                        to="/staff"
                        className="block w-full py-3 rounded bg-neutral-800 hover:bg-neutral-700 transition"
                    >
                        Staff Portal
                    </Link>
                     <Link
                        to="/staff"
                        className="block w-full py-3 rounded bg-neutral-900 hover:bg-neutral-600 cursor-not-allowed"
                    >
                        Client Portal
                    </Link>
                </div>
            </div>
        </div>
    );
}