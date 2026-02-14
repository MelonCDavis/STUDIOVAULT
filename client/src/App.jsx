import { Routes, Route } from 'react-router-dom';
import StaffRoutes from "./staff/routes/StaffRoutes";

function App() {
 return (
  <Routes>
    <Route path="/staff/*" element={<StaffRoutes />} />
    <Route path="*" element={<div>Home</div>} />
  </Routes>
 );
}

export default App
