import { Routes, Route } from 'react-router-dom';
import StaffRoutes from "./staff/routes/StaffRoutes";
import MainPage from "./pages/MainPage";
import ClientRoutes from "./client/routes/ClientRoutes";


function App() {
 return (
  <Routes>
    <Route path="/staff/*" element={<StaffRoutes />} />
    <Route path="/client/*" element={<ClientRoutes />} />
    <Route path="/" element={<MainPage />} />
    <Route path="*" element={<MainPage />}/>
  </Routes>
 );
}

export default App
