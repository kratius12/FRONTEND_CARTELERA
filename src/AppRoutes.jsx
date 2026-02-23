import { Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import CurrentProgramRedirect from "./CurrentProgramRedirect";
import AdminPage from "./admin/AdminPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CurrentProgramRedirect />} />
      <Route path="/programs/:id" element={<App />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
